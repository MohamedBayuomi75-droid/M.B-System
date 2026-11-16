// زحف فعلي على كل الصفحات في المتصفح (قراءة فقط): هل بتترسم؟ كام زرار/جدول/خانة؟ أي أخطاء JS؟
// التشغيل: node tools/audit/crawl-pages.js            (بيانات فاضية)
//          DATA_JSON=/path/data.json node tools/audit/crawl-pages.js   (بيانات حقيقية — النتايج أعداد بس)
//          WEB_MODE=1 ... (فوق السيرفر الحقيقي بدل وضع الملف)
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const { openApp, WEB } = require(path.join(ROOT, 'tests-merge/harness'));
const { baseUser } = require(path.join(ROOT, 'tests-merge/lib'));
(async () => {
  const real = !!process.env.DATA_JSON;
  const seed = real ? JSON.parse(fs.readFileSync(process.env.DATA_JSON, 'utf8')) : { users: [baseUser] };
  if (!WEB) seed.users = [baseUser]; // وضع الملف: جلسة الاختبار
  const { browser, page, errors } = await openApp(seed);
  const inv = require(path.join(ROOT, 'docs/audit/feature-inventory.json'));
  const keys = inv.pages.map((p) => p.key);
  const out = [];
  for (const key of keys) {
    const before = errors.length;
    const r = await page.evaluate(async (key) => {
      let threw = null;
      try { goToPage(key); } catch (e) { threw = e.message; }
      await new Promise((res) => setTimeout(res, 200));
      const root = document.querySelector('#app');
      const main = document.querySelector('.page') || root;
      return { threw, landedOn: typeof currentPage !== 'undefined' ? currentPage : null, textLen: main.innerText.length,
        buttons: main.querySelectorAll('button').length, inputs: main.querySelectorAll('input,select,textarea').length, tables: main.querySelectorAll('table').length, rows: main.querySelectorAll('tbody tr').length,
        modalOpen: !!document.querySelector('.modal-overlay') };
    }, key);
    await page.evaluate(() => { try { closeModal(); } catch (e) {} });
    out.push({ key, ...r, jsErrors: errors.slice(before).length });
  }
  const counts = await page.evaluate(() => { const o = {}; Object.keys(DATA).forEach((k) => { const v = DATA[k]; if (Array.isArray(v)) o[k] = v.length; else if (['ledger', 'clients', 'warehouses'].includes(k)) Object.keys(v || {}).forEach((k2) => { if (Array.isArray(v[k2])) o[k + '.' + k2] = v[k2].length; }); }); return o; });
  await browser.close();
  const res = { mode: WEB ? 'web (real server)' : 'file (desktop renderer, mocked desktopApi)', data: real ? 'real data.json (counts only)' : 'empty', pages: out, jsErrors: errors, recordCounts: real ? counts : undefined };
  fs.writeFileSync(path.join(ROOT, `docs/audit/page-crawl-${WEB ? 'web' : 'file'}-${real ? 'real' : 'empty'}.json`), JSON.stringify(res, null, 1));
  const bad = out.filter((p) => p.threw || p.jsErrors || p.textLen < 50);
  console.log(`${out.length} pages, ${bad.length} with problems, ${errors.length} js errors`);
  if (bad.length) console.log(JSON.stringify(bad));
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
