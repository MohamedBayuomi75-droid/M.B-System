// مقارنة الشكل: صفحتي المشرفين والسواقين ونوافذهم في الواجهة القديمة ↔ /app/supervisors و/app/drivers جنب بعض
// (خطة v1.4.5 — المرحلة 8، الحزمة 8.2، معيار DEC-0093). نفس السيرفر ونفس البيانات المُركّبة ونفس الجلسة.
// الفروق المقصودة: من غير عمود التحديد الجماعي، وكشف الحساب و👁/✕/التصدير بيفتحوا الشاشة الكاملة (DEC-0123).
// التشغيل: node tools/discovery/compare-people.js   (محتاج build للسيرفر والواجهة الجديدة + PostgreSQL للاختبار)
// المخرج: docs/reports/v1.4.5/phase8-visual/people-*.png
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const { openWebApp } = require(path.join(ROOT, 'tests-merge/harness'));
const { baseUser } = require(path.join(ROOT, 'tests-merge/lib'));
const OUT = path.join(ROOT, 'docs/reports/v1.4.5/phase8-visual');
const P = (id, o) => Object.assign({ id, extraFields: [], attachments: [] }, o);
const seed = {
  users: [baseUser], schemaVersion: 9,
  supervisors: [P('s1', { code: 'SUP-001', name: 'سامي المشرف', status: 'active', nationalId: '28001011234567', phone: '01001112222', dailyWage: 350, position: 'مشرف موقع', skill: 'مشرف موقع', licenseExpiry: '2020-01-01', hireDate: '2024-01-01' }),
    P('s2', { code: 'SUP-002', name: 'كريم عادل', status: 'active' })],
  workers: [P('w1', { code: 'WRK-001', name: 'عامل', workerType: 'temporary', status: 'active', supervisorId: 's1' })],
  drivers: [P('d1', { code: 'DRV-001', name: 'أحمد السواق', status: 'active', salary: 5000, licenseGrade: 'درجة أولى', licenseExpiry: '2099-01-01', nationalId: '29001011234567', phone: '01112223333', position: 'سائق نقل' }),
    P('d2', { code: 'DRV-002', name: 'محمود خارجي', status: 'active', external: true, dailyWage: 200, phone: '01223334444', position: 'سائق' })],
};
// [اسم، صفحة، قسم، نافذة القديمة، زرار الجديدة]
const PAIRS = [['sup-list', 'supervisors', '', null, null], ['sup-modal', 'supervisors', '', ['openSupervisorModal', 's1'], '.btn-edit-sup[data-id="s1"]'],
  ['drv-list', 'drivers', '', null, null], ['drv-modal', 'drivers', '', ['openDriverModal', 'd1'], '.btn-edit-drv[data-id="d1"]'], ['ext-list', 'drivers', '__core_drivers_ext__', null, null]];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { browser, page, base } = await openWebApp(seed);
  await page.setViewportSize({ width: 1366, height: 768 });
  const shot = () => page.screenshot({ animations: 'disabled', caret: 'hide' });
  const settle = async () => { await page.waitForTimeout(400); await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement && document.activeElement.blur(); }); };
  const legacy = {}, app = {};
  for (const [name, pg, d, modal] of PAIRS) {
    await page.evaluate(() => { try { closeModal(); } catch (e) { /* */ } }); await page.waitForTimeout(250);
    await page.evaluate(([pg, d]) => { goToPage(pg); const F = pg === 'supervisors' ? supervisorFilters : driverFilters; Object.keys(F).forEach((k) => { F[k] = ''; }); F._boardLevel = 'list'; F.departmentId = d; rerenderCurrentPage(); }, [pg, d]);
    await page.waitForTimeout(400);
    if (modal) await page.evaluate(([f, i]) => window[f](i), modal);
    await settle(); legacy[name] = await shot();
  }
  for (const [name, pg, d, , btn] of PAIRS) {
    await page.goto(base + '/app/' + pg); await page.waitForSelector('#pplBoards .entity-dept-board');
    await page.click(`#pplBoards .entity-dept-board[data-dept="${d}"]`); await page.waitForSelector('#pplTable tbody tr[data-id]');
    if (btn) { await page.click(btn); await page.waitForSelector('#appModal .modal-footer .btn-primary'); }
    await settle(); app[name] = await shot();
  }
  const p = await browser.newPage({ viewport: { width: 1400, height: 440 } });
  const d64 = (b) => 'data:image/png;base64,' + b.toString('base64');
  for (const [name] of PAIRS) {
    await p.setContent(`<body style="margin:0;font:600 15px sans-serif;background:#fff"><div style="display:flex;gap:8px;padding:8px;direction:rtl">
      <figure style="margin:0;flex:1"><figcaption>القديمة (/legacy/)</figcaption><img src="${d64(legacy[name])}" style="width:100%;border:1px solid #999"></figure>
      <figure style="margin:0;flex:1"><figcaption>الجديدة (/app/)</figcaption><img src="${d64(app[name])}" style="width:100%;border:1px solid #999"></figure></div></body>`);
    await p.screenshot({ path: path.join(OUT, `people-${name}.png`), fullPage: true });
  }
  await browser.close();
  console.log(`side-by-side: ${PAIRS.length} → ${path.relative(ROOT, OUT)}`);
})().catch((e) => { console.error(e); process.exit(1); });
