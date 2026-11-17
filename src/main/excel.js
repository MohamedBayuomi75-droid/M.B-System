// تحميل مكتبة xlsx من النسخة المحلية المرفقة مع البرنامج (vendor/xlsx.full.min.js) فقط، واستيراد/تصدير ملفات إكسيل.
// المرحلة 3: نسخة npm (0.18.5) فيها ثغرات معروفة (CVE-2023-30533 / CVE-2024-22363) ومش متاح غيرها على npm —
// فاتشالت من package.json ومابقيناش نجرّب node_modules خالص (عشان نسخة قديمة متبقية على جهاز ماتتحمّلش بالغلط).
// المصدر الرسمي والإصدار والبصمة: docs/VENDOR_LIBRARIES.md
const path = require('path');
const fs = require('fs');
const { ipcMain, dialog } = require('electron');
const { APP_ROOT, getMainWindow } = require('./window-state');

let XLSX = null;
(function loadXlsx() {
  const vendorPath = path.join(APP_ROOT, 'vendor', 'xlsx.full.min.js');
  try {
    if (fs.existsSync(vendorPath)) {
      // المكتبة تضع XLSX على global أو module.exports حسب البيئة
      const g = global;
      const prev = g.XLSX;
      const mod = require(vendorPath);
      XLSX = (mod && mod.utils) ? mod : (g.XLSX || prev || null);
    }
  } catch (e) {
    console.error('xlsx vendor load failed', e);
  }
})();

// نسخة vendor (0.20+) محتاجة تعريف fs صراحة وإلا readFile/writeFile بيفشلوا — بنقرأ/نكتب بأنفسنا عبر buffer لضمان الشغل في أي نسخة
try { if (XLSX && typeof XLSX.set_fs === 'function') XLSX.set_fs(fs); } catch (e) { /* ignore */ }

// استيراد بيانات من ملف إكسيل (xlsx/xls/csv) - يرجع كل الشيتات كمصفوفات صفوف
ipcMain.handle('excel:import', async () => {
  if (!XLSX) return { ok: false, error: 'مكتبة الإكسيل غير متاحة. تأكد من وجود مجلد vendor داخل البرنامج.' };
  const result = await dialog.showOpenDialog(getMainWindow(), {
    properties: ['openFile'],
    filters: [{ name: 'Excel / CSV', extensions: ['xlsx', 'xls', 'csv'] }]
  });
  if (result.canceled || !result.filePaths.length) return { ok: false, canceled: true };
  try {
    const wb = XLSX.read(fs.readFileSync(result.filePaths[0]), { type: 'buffer' });
    const sheets = {};
    wb.SheetNames.forEach(name => {
      // raw:true يحافظ على أرقام التواريخ التسلسلية لنحوّلها بدقة في الواجهة
      const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: '' });
      // أيضاً نسخة منسقة للنصوص
      const textRows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: '' });
      sheets[name] = rawRows.map((row, ri) => {
        const trow = textRows[ri] || [];
        return (row || []).map((cell, ci) => {
          // أرقام تسلسلية لتاريخ إكسيل نمررها كما هي
          if(typeof cell === 'number' && cell > 20000 && cell < 80000) return cell;
          // غير ذلك فضّل النص المقروء
          if(trow[ci] !== undefined && trow[ci] !== '') return trow[ci];
          return cell == null ? '' : cell;
        });
      });
    });
    return { ok: true, sheetNames: wb.SheetNames, sheets, fileName: path.basename(result.filePaths[0]) };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

// تصدير جدول بيانات كملف إكسيل حقيقي (.xlsx) منسق بعرض أعمدة مناسب - بديل عن CSV
ipcMain.handle('excel:export', async (event, { filename, sheetName, headers, rows }) => {
  if (!XLSX) return { ok: false, error: 'مكتبة الإكسيل غير متاحة. تأكد من وجود مجلد vendor داخل البرنامج.' };
  const result = await dialog.showSaveDialog(getMainWindow(), {
    defaultPath: filename,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }]
  });
  if (result.canceled || !result.filePath) return { ok: false, canceled: true };
  try {
    headers = Array.isArray(headers) ? headers : [];
    rows = Array.isArray(rows) ? rows : [];
    const aoa = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const colWidths = headers.map((h, idx) => {
      let max = String(h || '').length;
      rows.forEach(r => {
        const v = r[idx];
        const len = (v === undefined || v === null) ? 0 : String(v).length;
        if (len > max) max = len;
      });
      return { wch: Math.min(Math.max(max + 2, 10), 45) };
    });
    ws['!cols'] = colWidths;
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }) };
    const wb = XLSX.utils.book_new();
    // اسم الشيت: إكسيل بيرفض  [ ] : * ? / \  ويحدّه 31 حرف
    const safeSheet = String(sheetName || 'بيانات').replace(/[\[\]:*?\/\\]/g, '-').slice(0, 31) || 'بيانات';
    XLSX.utils.book_append_sheet(wb, ws, safeSheet);
    let filePath = result.filePath;
    if (!/\.xlsx$/i.test(filePath)) filePath += '.xlsx';
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    fs.writeFileSync(filePath, buf);
    return { ok: true, filePath };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

// للاختبارات: إصدار المكتبة المحمّلة فعلًا
module.exports = { xlsxVersion: () => (XLSX && XLSX.version) || null };
