// مقارنة الشكل: صفحة العمال (لوحات الأقسام والقايمة) ونافذة العامل بشكليها في الواجهة القديمة ↔ /app/workers جنب بعض
// (خطة v1.4.5 — المرحلة 8، الحزمة 8.1، معيار DEC-0093). نفس السيرفر ونفس البيانات المُركّبة ونفس الجلسة.
// الفروق المقصودة: من غير عمود التحديد الجماعي، و👁/✕/التصدير بيفتحوا الشاشة الكاملة (DEC-0121).
// التشغيل: node tools/discovery/compare-workers.js   (محتاج build للسيرفر والواجهة الجديدة + PostgreSQL للاختبار)
// المخرج: docs/reports/v1.4.5/phase8-visual/workers-*.png
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const { openWebApp } = require(path.join(ROOT, 'tests-merge/harness'));
const { baseUser } = require(path.join(ROOT, 'tests-merge/lib'));
const OUT = path.join(ROOT, 'docs/reports/v1.4.5/phase8-visual');
const W = (id, o) => Object.assign({ id, extraFields: [], attachments: [] }, o);
const seed = {
  users: [baseUser], schemaVersion: 9,
  supervisors: [{ id: 'sv1', code: 'SUP-1', name: 'سامي المشرف', status: 'active' }],
  projects: [{ id: 'pA', code: 'PRJ-001', name: 'مشروع الشروق', status: 'active' }],
  workers: [
    W('w1', { code: 'WRK-001', name: 'محمد علي', workerType: 'temporary', type: 'temporary', status: 'active', dailyWage: 300, supervisorId: 'sv1', project: 'مشروع الشروق', nationalId: '29001011234567', phone: '0100' }),
    W('w2', { code: 'WRK-002', name: 'أحمد محمود', workerType: 'company', type: 'company', status: 'active', salary: 6000, basicSalary: 6000, position: 'نجار', skill: 'نجار', nationalId: '28501011234567', phone: '0111', address: 'القاهرة',
      idCardExpiry: '2028-01-01', hireDate: '2024-01-01', contractType: 'permanent', contractStatus: 'active', insuranceStatus: 'insured', insuranceNumber: '123', supervisorId: 'sv1' }),
    W('w3', { code: 'WRK-003', name: 'خالد حسن', workerType: 'company', type: 'company', status: 'active', salary: 5000, position: 'حداد', skill: 'حداد' }),
    W('w4', { code: 'WRK-004', name: 'عامل يومية', workerType: 'daily', status: 'active', dailyWage: 250 }),
  ],
};
const PAIRS = ['boards', 'list', 'temp', 'company'];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { browser, page, base } = await openWebApp(seed);
  await page.setViewportSize({ width: 1366, height: 768 });
  const shot = () => page.screenshot({ animations: 'disabled', caret: 'hide' });
  const settle = async () => { await page.waitForTimeout(400); await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement && document.activeElement.blur(); }); };
  const legacy = {}, app = {};
  for (const name of PAIRS) {
    await page.evaluate(() => { try { closeModal(); } catch (e) { /* */ } }); await page.waitForTimeout(250);
    await page.evaluate((n) => { goToPage('workers'); Object.keys(workerFilters).forEach((k) => { workerFilters[k] = ''; }); workerFilters._boardLevel = n === 'boards' ? 'boards' : 'list'; rerenderCurrentPage(); }, name);
    await page.waitForTimeout(400);
    if (name === 'temp') await page.evaluate(() => openWorkerModal(null, { defaultType: 'temporary' }));
    if (name === 'company') await page.evaluate(() => openWorkerModal('w2'));
    await settle(); legacy[name] = await shot();
  }
  for (const name of PAIRS) {
    await page.goto(base + '/app/workers'); await page.waitForSelector('#wkBoards .entity-dept-board');
    if (name !== 'boards') { await page.click('#wkBoards .entity-dept-board[data-dept=""]'); await page.waitForSelector('#wkTable tr[data-id="w2"]'); }
    if (name === 'temp') { await page.click('#btnAddTempWorker'); await page.waitForSelector('#btnSaveWrk'); }
    if (name === 'company') { await page.click('.btn-edit-wrk[data-id="w2"]'); await page.waitForSelector('#btnSaveWrk'); }
    await settle(); app[name] = await shot();
  }
  const p = await browser.newPage({ viewport: { width: 1400, height: 440 } });
  const d = (b) => 'data:image/png;base64,' + b.toString('base64');
  for (const name of PAIRS) {
    await p.setContent(`<body style="margin:0;font:600 15px sans-serif;background:#fff"><div style="display:flex;gap:8px;padding:8px;direction:rtl">
      <figure style="margin:0;flex:1"><figcaption>القديمة (/legacy/)</figcaption><img src="${d(legacy[name])}" style="width:100%;border:1px solid #999"></figure>
      <figure style="margin:0;flex:1"><figcaption>الجديدة (/app/)</figcaption><img src="${d(app[name])}" style="width:100%;border:1px solid #999"></figure></div></body>`);
    await p.screenshot({ path: path.join(OUT, `workers-${name}.png`), fullPage: true });
  }
  await browser.close();
  console.log(`side-by-side: ${PAIRS.length} → ${path.relative(ROOT, OUT)}`);
})().catch((e) => { console.error(e); process.exit(1); });
