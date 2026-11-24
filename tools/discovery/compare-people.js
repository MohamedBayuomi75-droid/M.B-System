// مقارنة الشكل: صفحات المشرفين والسواقين والموظفين ونوافذهم في الواجهة القديمة ↔ /app/supervisors و/app/drivers و/app/employees جنب بعض
// (خطة v1.4.5 — المرحلة 8، الحزمتين 8.2 و8.3، معيار DEC-0093). نفس السيرفر ونفس البيانات المُركّبة ونفس الجلسة.
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
  employees: [P('e1', { code: 'EMP-001', name: 'أحمد المحاسب', status: 'active', employmentType: 'full', position: 'محاسب', nationalId: '28501011234567', phone: '01001234567', salary: 8000, hireDate: '2022-01-01', email: 'a@x.com', leaveBalance: 21 }),
    P('e2', { code: 'EMP-002', name: 'حسن مستقيل', status: 'resigned', resignedAt: '2025-06-01', hireDate: '2020-06-01', position: 'مهندس', departmentId: '__resigned_employee__', categoryId: '__resigned_employee__', previousDepartmentId: '__core_employees__' })],
};
// [اسم، صفحة، قسم، نافذة القديمة، زرار الجديدة]
const PAIRS = [['sup-list', 'supervisors', '', null, null], ['sup-modal', 'supervisors', '', ['openSupervisorModal', 's1'], '.btn-edit-sup[data-id="s1"]'],
  ['drv-list', 'drivers', '', null, null], ['drv-modal', 'drivers', '', ['openDriverModal', 'd1'], '.btn-edit-drv[data-id="d1"]'], ['ext-list', 'drivers', '__core_drivers_ext__', null, null],
  ['emp-list', 'employees', '', null, null], ['emp-modal', 'employees', '', ['openEmployeeModal', 'e1'], '.btn-edit-emp[data-id="e1"]'], ['emp-resigned', 'employees', '__resigned_employee__', null, null]];
const FILTERS = { supervisors: 'supervisorFilters', drivers: 'driverFilters', employees: 'employeeFilters' };

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { browser, page, base } = await openWebApp(seed);
  await page.setViewportSize({ width: 1366, height: 768 });
  const shot = () => page.screenshot({ animations: 'disabled', caret: 'hide' });
  const settle = async () => { await page.waitForTimeout(400); await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement && document.activeElement.blur(); }); };
  const legacy = {}, app = {};
  for (const [name, pg, d, modal] of PAIRS) {
    await page.evaluate(() => { try { closeModal(); } catch (e) { /* */ } }); await page.waitForTimeout(250);
    await page.evaluate(([pg, d, fv]) => { goToPage(pg); const F = window.eval(fv); Object.keys(F).forEach((k) => { F[k] = ''; }); F._boardLevel = 'list'; F.departmentId = d; rerenderCurrentPage(); }, [pg, d, FILTERS[pg]]);
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
