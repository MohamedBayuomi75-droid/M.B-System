// المرحلة 3 — الإكسيل بعد توحيد المكتبة على النسخة الرسمية المحلية (vendor/xlsx 0.20.3):
// استيراد ملف حقيقي من شاشة «استيراد من إكسيل» في دفتر الموردين ← الموردين اتضافوا صح، ثم تصديرهم تاني لملف حقيقي.
//   وضع الويب: المكتبة في المتصفح (web/web-api.js) + اختيار ملف حقيقي + تنزيل حقيقي، والبيانات بتتحفظ على السيرفر.
//   وضع الملف: نفس الشاشة، والملف بيتقري ويتكتب بكود الديسكتوب نفسه (src/main/excel.js) — نفس مسار برنامج سطح المكتب.
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');
const { openApp, WEB } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');

const ROOT = path.resolve(__dirname, '..');
const XL = require(path.join(ROOT, 'vendor/xlsx.full.min.js'));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'xlsx-ui-'));

// مسار الديسكتوب: src/main/excel.js بمحاكاة electron (حوارات الملفات بنتحكم فيها)
const dlg = { open: { canceled: true }, save: { canceled: true } };
const handlers = {};
function desktopExcel() {
  const noop = () => {};
  const stub = new Proxy({ ipcMain: { handle: (c, f) => { handlers[c] = f; }, on: noop }, dialog: { showOpenDialog: async () => dlg.open, showSaveDialog: async () => dlg.save }, app: new Proxy({}, { get: () => () => TMP }) }, { get: (t, k) => (k in t ? t[k] : new Proxy({}, { get: () => noop })) });
  const orig = Module._load;
  Module._load = function (req) { if (req === 'electron') return stub; return orig.apply(this, arguments); };
  try { return require(path.join(ROOT, 'src/main/excel.js')); } finally { Module._load = orig; }
}

(async () => {
  // ملف الاستيراد: أسماء عربية، رقم ضريبي بصفر في الأول، رصيد بفواصل، تاريخ إكسيل تسلسلي
  const wb = XL.utils.book_new();
  const ws = XL.utils.aoa_to_sheet([
    ['اسم المورد', 'الرقم الضريبي', 'الرصيد الافتتاحي', 'تاريخ الرصيد'],
    ['شركة النور للتوريدات', '012345678', '1,250.50', 46022],
    ['مؤسسة «الأمل» & شركاه', '987654321', 0, ''],
  ]);
  ws.B2.t = 's'; ws.B2.v = '012345678'; // نص (مش رقم) عشان الصفر الأول
  XL.utils.book_append_sheet(wb, ws, 'موردين');
  const inFile = path.join(TMP, 'suppliers.xlsx');
  fs.writeFileSync(inFile, XL.write(wb, { type: 'buffer', bookType: 'xlsx' }));

  const { browser, page, errors } = await openApp(WEB ? null : { users: [baseUser], schemaVersion: 9, ledger: { suppliers: [], invoices: [], payments: [] } });
  if (WEB) {
    page.on('filechooser', (fc) => fc.setFiles(inFile).catch((e) => errors.push('setFiles: ' + e.message)));
  } else {
    desktopExcel();
    dlg.open = { canceled: false, filePaths: [inFile] };
    const res = await handlers['excel:import']({});
    await page.evaluate((res) => { window.desktopApi.importExcel = async () => res; }, res);
  }
  const ver = await page.evaluate(() => (window.XLSX && XLSX.version) || null);
  if (WEB) ok(ver === '0.20.3', 'المتصفح شغّال بالنسخة المحلية 0.20.3', ver);
  else ok(require(path.join(ROOT, 'src/main/excel.js')).xlsxVersion() === '0.20.3', 'الديسكتوب شغّال بالنسخة المحلية 0.20.3');

  // 1) شاشة الاستيراد
  await page.evaluate(() => { goToPage('ledger.suppliers'); lgOpenExcelImportModal(); });
  await page.waitForFunction(() => typeof excelImportState !== 'undefined' && excelImportState && excelImportState.sheets, null, { timeout: 15000 });
  const st = await page.evaluate(() => ({ names: excelImportState.sheetNames, file: excelImportState.fileName, rows: excelImportState.sheets[excelImportState.activeSheet] }));
  eq(st.names, ['موردين'], 'اسم الشيت العربي');
  eq(st.rows[1].slice(0, 3), ['شركة النور للتوريدات', '012345678', '1,250.50'], 'الصف الأول: الاسم والرقم الضريبي (بالصفر) والرصيد زي ما هو');
  eq(st.rows[1][3], 46022, 'التاريخ التسلسلي بيعدّي رقم (الواجهة بتحوّله)');
  const msg = await page.evaluate(() => { const rows = excelImportState.sheets[excelImportState.activeSheet].slice(1); const m = runSuppliersImport(rows, { name: 0, taxId: 1, openingBalance: 2, openingBalanceDate: 3 }); try { closeModal(); } catch (e) {} return m; });
  ok(/2 جديد/.test(msg), 'الاستيراد: موردين جداد', msg);
  const sup = await page.evaluate(() => DATA.ledger.suppliers.map((s) => ({ name: s.name, taxId: s.taxId, ob: s.openingBalance, obd: s.openingBalanceDate })));
  eq(sup.find((s) => s.taxId === '012345678'), { name: 'شركة النور للتوريدات', taxId: '012345678', ob: 1250.5, obd: '2025-12-31' }, 'المورد الأول: الرصيد 1,250.50 ← 1250.5 والتاريخ ← 2025-12-31');
  eq((sup.find((s) => s.taxId === '987654321') || {}).name, 'مؤسسة «الأمل» & شركاه', 'المورد التاني بالرموز الخاصة');
  if (WEB) {
    await page.evaluate(async () => { await saveData(true); await WebSync.save(DATA); });
    const onServer = await page.evaluate(async () => { const r = await fetch('/api/bootstrap', { headers: { authorization: 'Bearer ' + WebSession.token() } }); return (await r.json()).data.ledger.suppliers.length; });
    eq(onServer, 2, 'الموردين المستوردين اتحفظوا على السيرفر');
  }

  // 2) التصدير من الواجهة (نفس الدالة اللي أزرار التصدير بتستخدمها)
  const exportCall = () => page.evaluate(() => exportExcelFile('موردين-تصدير.xlsx', 'موردين', ['الاسم', 'الرقم الضريبي', 'الرصيد'], DATA.ledger.suppliers.map((s) => [s.name, s.taxId, s.openingBalance])));
  let outBuf;
  if (WEB) {
    const [dl] = await Promise.all([page.waitForEvent('download'), exportCall()]);
    // Chromium من غير واجهة بيسمّي أي تنزيل باسم عربي «download» (حتى رابط عادي من غير المكتبة) — بنتحقق من الامتداد هنا،
    // ومن الاسم كامل بتنزيل باسم لاتيني تحت. الاسم العربي على متصفح حقيقي: يتأكد يدويًا.
    ok(['موردين-تصدير.xlsx', 'download'].includes(dl.suggestedFilename()), 'التنزيل حصل', dl.suggestedFilename());
    const [dl2] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => exportExcelFile('suppliers-export.xlsx', 's', ['a'], [[1]]))]);
    eq(dl2.suggestedFilename(), 'suppliers-export.xlsx', 'اسم الملف المنزّل (لاتيني) زي ما الواجهة طلبته');
    outBuf = fs.readFileSync(await dl.path());
  } else {
    await page.evaluate(() => { window.__exp = null; window.desktopApi.exportExcel = async (p) => { window.__exp = p; return { ok: true }; }; });
    await exportCall();
    await page.waitForFunction(() => window.__exp, null, { timeout: 5000 });
    const payload = await page.evaluate(() => window.__exp);
    const outFile = path.join(TMP, 'out.xlsx');
    dlg.save = { canceled: false, filePath: outFile };
    const r = await handlers['excel:export']({}, payload);
    ok(r && r.ok, 'الديسكتوب كتب ملف التصدير', r);
    outBuf = fs.readFileSync(outFile);
  }
  const back = XL.read(outBuf, { type: 'buffer' });
  const aoa = XL.utils.sheet_to_json(back.Sheets[back.SheetNames[0]], { header: 1, defval: '' });
  eq(back.SheetNames, ['موردين'], 'ملف التصدير: اسم الشيت');
  eq(aoa[0], ['الاسم', 'الرقم الضريبي', 'الرصيد'], 'ملف التصدير: العناوين');
  ok(aoa.length === 3 && aoa.some((r) => r[0] === 'شركة النور للتوريدات' && String(r[1]) === '012345678'), 'ملف التصدير: الصفوف والرقم الضريبي بالصفر', aoa);
  await browser.close();
  summary(errors);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
