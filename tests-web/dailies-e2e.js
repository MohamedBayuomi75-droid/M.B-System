// شاشات اليوميات وحضور الموظفين (8.5.5، DEC-0135): /app/worker-attendance و/app/attendance بيعرضوا نفس الصفحات القديمة —
// لوحات الأنواع والأقسام، والجدول الشهري (العناوين، والعلامة واللون والعنوان لكل خلية، و⚑ لأكتر من موقع، وإجمالي الأيام)، والكروت
// (ما عدا «مستحق الشهر» — بالحساب الجديد DEC-0129، وبيتقارن بالـ API)، والفلاتر، ونافذة اليومية (الخانات والخيارات والقيم والمسجّل في
// نفس اليوم والأيام المقترحة)، ونافذة مواقع اليوم، وحضور الموظفين (الكروت والفلاتر والجدول والنافذة). والحفظ والحذف وقرار المراجعة من الجديدة.
// التشغيل: node tests-web/dailies-e2e.js   (محتاج build للسيرفر والواجهة الجديدة + PostgreSQL للاختبار)
'use strict';
const path = require('path');
const { openWebApp } = require(path.join(__dirname, '../tests-merge/harness'));
const { baseUser, eq, ok, summary } = require(path.join(__dirname, '../tests-merge/lib'));

const P = (id, o) => Object.assign({ id, extraFields: [], attachments: [] }, o);
const A = (id, o) => Object.assign({ id, status: 'present', days: 1, deduction: 0, notes: '' }, o);
const W = (id, pid, o) => A(id, Object.assign({ personType: 'worker', personKind: 'worker', personId: pid, workerId: pid }, o));
const seed = {
  users: [baseUser], schemaVersion: 9,
  projects: [{ id: 'pA', code: 'PRJ-001', name: 'مشروع الشروق', status: 'active' }, { id: 'pB', code: 'PRJ-002', name: 'برج النيل', status: 'active' }],
  supervisors: [P('s1', { code: 'SUP-001', name: 'سامي المشرف', status: 'active', dailyWage: 400, departmentId: '__core_supervisors__', categoryId: '__core_supervisors__' })],
  workers: [
    P('w1', { code: 'WRK-001', name: 'عامل أول', status: 'active', workerType: 'temporary', dailyWage: 333.33, supervisorId: 's1', project: 'مشروع الشروق', departmentId: '__core_workers_temp__', categoryId: '__core_workers_temp__' }),
    P('w2', { code: 'WRK-002', name: 'بدر الشركة', status: 'active', workerType: 'company', dailyWage: 250, departmentId: '__core_workers_perm__', categoryId: '__core_workers_perm__' }),
  ],
  drivers: [P('d1', { code: 'DRV-001', name: 'أحمد السواق', status: 'active', dailyWage: 280, departmentId: '__core_drivers__', categoryId: '__core_drivers__' })],
  employees: [P('e1', { code: 'EMP-001', name: 'أحمد المحاسب', status: 'active', departmentId: 'dX', categoryId: 'dX' }), P('e2', { code: 'EMP-002', name: 'منى السكرتيرة', status: 'active', departmentId: '__core_employees__', categoryId: '__core_employees__' })],
  departments: [{ id: 'dX', name: 'الحسابات', kind: 'employees' }],
  workerAttendance: [
    W('a1', 'w1', { date: '2026-03-01', dayWage: 333.33, days: 1.5, project: 'مشروع الشروق', site: 'الموقع أ' }),
    W('a2', 'w1', { date: '2026-03-02', status: 'half', days: 1, dayWage: 333.33, project: 'مشروع الشروق' }),
    W('a3', 'w1', { date: '2026-03-03', status: 'late', dayWage: 333.33, deduction: 50, project: 'مشروع الشروق', notes: 'اتأخر' }),
    W('a4', 'w1', { date: '2026-03-04', status: 'absent', dayWage: 333.33, project: 'مشروع الشروق' }),
    W('a5', 'w1', { date: '2026-03-05', dayWage: 333.33, project: 'مشروع الشروق', site: 'الموقع أ' }),
    W('a6', 'w1', { date: '2026-03-05', dayWage: 333.33, days: 0.5, project: 'برج النيل', site: 'الموقع ب' }),
    W('a7', 'w2', { date: '2026-03-01', project: 'برج النيل', days: 2, dayWage: 250 }),
    W('a8', 'w2', { date: '2026-03-02', status: 'overtime', dayWage: 250, project: 'برج النيل' }),
    W('a9', 'w2', { date: '2026-03-03', dayWage: 300, deduction: 400, status: 'late', project: 'برج النيل' }),
    A('b1', { personType: 'supervisor', personKind: 'supervisor', personId: 's1', supervisorId: 's1', workerId: '', date: '2026-03-01', dayWage: 400, project: 'مشروع الشروق' }),
    A('c1', { personType: 'driver', personKind: 'driver', personId: 'd1', driverId: 'd1', workerId: '', supervisorId: '', date: '2026-03-02', dayWage: 280, project: 'برج النيل' }),
  ],
  attendance: [{ id: 't1', employeeId: 'e1', date: '2026-03-01', status: 'present', checkIn: '08:00', checkOut: '16:00', notes: 'تمام' }, { id: 't2', employeeId: 'e1', date: '2026-03-02', status: 'late', checkIn: '09:30', checkOut: '', notes: '' },
    { id: 't3', employeeId: 'e2', date: '2026-03-02', status: 'half', checkIn: '', checkOut: '', notes: 'نص يوم' }],
};
const FROM = '2026-03-01', TO = '2026-03-07';

const txt = (el) => (el ? (el.innerText || '').replace(/\s+/g, ' ').trim() : '');
const grabBoards = () => [...document.querySelectorAll('.board-grid .board-card')].map((b) => [b.className.replace(/\s+/g, ' ').trim(), (b.innerText || '').replace(/\s+/g, ' ').trim()]);
const grabGrid = () => {
  const t1 = (el) => (el ? (el.innerText || '').replace(/\s+/g, ' ').trim() : '');
  const root = document.querySelector('#pageContent .page, app-worker-attendance .page');
  const t = root.querySelector('table.watt-grid');
  return {
    title: t1(root.querySelector('.page-title')), sub: t1(root.querySelector('.page-sub')),
    cards: [...root.querySelectorAll('.sc-row .sc-card')].map((c) => [t1(c.querySelector('.sc-lbl')), /مستحق/.test(c.innerText) ? '*' : t1(c.querySelector('.sc-num')), c.className.replace(/\s+/g, ' ').trim()]),
    filters: [...root.querySelectorAll('.dly-filters select, .dly-filters input')].filter((x) => x.type !== 'hidden' && !/wattFilterSup/.test(x.id))
      .map((x) => [x.id, x.tagName === 'SELECT' ? [...x.options].map((o) => o.textContent.trim()) : `${x.type}:${x.value}:${x.placeholder || ''}`]),
    head: [...t.querySelectorAll('thead th')].map(t1),
    rows: [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((td) => { const b = td.querySelector('.watt-cell'); return b ? [t1(b), b.title, b.dataset.multi || '', b.style.color, td.style.background] : t1(td); })),
    pager: t1(root.querySelector('.table-pager span')),
  };
};
const modalOf = () => {
  const t1 = (el) => (el ? (el.innerText || '').replace(/\s+/g, ' ').trim() : '');
  const m = document.getElementById('appModal');
  const opts = (id) => [...document.getElementById(id).options].map((o) => o.textContent.trim());
  const box = document.getElementById('wattSameDay');
  return {
    title: t1(m.querySelector('.modal-header h3')),
    labels: [...m.querySelectorAll('.modal-body label')].filter((l) => getComputedStyle(l).display !== 'none').map((l, i) => [l, Number(getComputedStyle(l).order) || 0, i]).sort((x, y) => x[1] - y[1] || x[2] - y[2]).map((x) => x[0]).map((l) => { const c = l.cloneNode(true); c.querySelectorAll('input,select,textarea,div,a').forEach((n) => n.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); }),
    options: { wattType: opts('wattType'), wattStatus: opts('wattStatus'), wattProject: opts('wattProject') },
    values: Object.fromEntries(['wattType', 'wattPerson', 'wattStatus', 'wattDate', 'wattDays', 'wattDayWage', 'wattDeduction', 'wattProject', 'wattSite', 'wattNotes'].map((id) => [id, String(document.getElementById(id) ? document.getElementById(id).value : '')])),
    same: box && getComputedStyle(box).display !== 'none' ? t1(box) : '',
    footer: [...m.querySelectorAll('.modal-footer button')].map(t1),
  };
};
const dayOf = () => {
  const t1 = (el) => (el ? (el.innerText || '').replace(/\s+/g, ' ').trim() : '');
  const m = document.getElementById('appModal');
  return { title: t1(m.querySelector('.modal-header h3')), chips: [...m.querySelectorAll('.wsite-chip')].map(t1).filter((x) => !/المستحق/.test(x)),
    rows: [...m.querySelectorAll('.wsite-table tbody tr')].map((tr) => [...tr.children].slice(0, 4).map(t1).concat([[...tr.querySelectorAll('button')].map((b) => b.className.match(/btn-wsite-(edit|del)/)[1]).join(',')])),
    foot: [...m.querySelectorAll('.wsite-table tfoot th')].map(t1).filter((x, i) => i < 2), footer: [...m.querySelectorAll('.modal-footer button')].map(t1) };
};
const grabAtt = () => {
  const t1 = (el) => (el ? (el.innerText || '').replace(/\s+/g, ' ').trim() : '');
  const root = document.querySelector('#pageContent .page, app-attendance .page');
  const t = root.querySelector('table.data-table');
  return {
    title: t1(root.querySelector('.page-title')), cards: [...root.querySelectorAll('.sc-row .sc-card')].map((c) => [t1(c), c.className.replace(/\s+/g, ' ').trim()]),
    filters: [...root.querySelectorAll('.filters-bar select, .filters-bar input')].filter((x) => x.type !== 'hidden' && !/attFilterEmp/.test(x.id)).map((x) => [x.id, x.tagName === 'SELECT' ? [...x.options].map((o) => o.textContent.trim()) : `${x.type}:${x.placeholder || ''}`]),
    head: [...t.querySelectorAll('thead th')].map(t1),
    rows: [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((td, i, all) => (i === all.length - 1 && all.length > 1 ? [...td.querySelectorAll('button')].map((b) => b.className.match(/btn-(edit|del)-att/)[1]).join(',') : t1(td)))),
  };
};
const attModalOf = () => {
  const t1 = (el) => (el ? (el.innerText || '').replace(/\s+/g, ' ').trim() : '');
  const m = document.getElementById('appModal');
  return {
    title: t1(m.querySelector('.modal-header h3')),
    labels: [...m.querySelectorAll('.modal-body label')].map((l, i) => [l, Number(getComputedStyle(l).order) || 0, i]).sort((x, y) => x[1] - y[1] || x[2] - y[2]).map((x) => x[0]).map((l) => { const c = l.cloneNode(true); c.querySelectorAll('input,select,textarea,div').forEach((n) => n.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); }),
    options: Object.fromEntries(['attDept', 'attStatus'].map((id) => [id, [...document.getElementById(id).options].map((o) => o.textContent.trim())])),
    values: Object.fromEntries(['attDept', 'attEmp', 'attDate', 'attStatus', 'attIn', 'attOut', 'attNotes'].map((id) => [id, document.getElementById(id).value])),
  };
};

(async () => {
  const { browser, page, base: url, errors } = await openWebApp(seed);
  const settle = (ms = 400) => page.waitForTimeout(ms);
  const legacy = async (f, fn) => { await page.evaluate((f) => { try { closeModal(); } catch (e) { /* */ } goToPage('workerAttendance'); Object.assign(workerAttFilters, { q: '', project: '', site: '', status: '', supervisorId: '', dFrom: '', dTo: '' }, f); rerenderCurrentPage(); }, f); await settle(); return page.evaluate(fn); };

  // ---------- القديمة
  const L = {};
  L.kinds = await legacy({ dailiesTab: '', dailiesDept: undefined }, grabBoards);
  L.depts = await legacy({ dailiesTab: 'workers', dailiesDept: undefined }, grabBoards);
  const VIEWS = [{ dailiesTab: 'workers', dailiesDept: '' }, { dailiesTab: 'workers', dailiesDept: '__core_workers_temp__' }, { dailiesTab: 'workers', dailiesDept: '', status: 'late' },
    { dailiesTab: 'workers', dailiesDept: '', project: 'برج النيل' }, { dailiesTab: 'workers', dailiesDept: '', q: 'بدر' }, { dailiesTab: 'supervisors', dailiesDept: '' }, { dailiesTab: 'drivers', dailiesDept: '' }];
  L.grids = []; for (const v of VIEWS) L.grids.push(await legacy({ ...v, dFrom: FROM, dTo: TO }, grabGrid));
  const MODALS = ['.watt-cell.empty[data-id="w1"][data-date="2026-03-06"]', '.watt-cell.filled[data-att="a3"]', '.watt-cell.filled[data-att="a2"]', '.watt-cell.empty[data-id="w2"][data-date="2026-03-05"]'];
  L.modals = [];
  for (const sel of MODALS) {
    await legacy({ dailiesTab: 'workers', dailiesDept: '', dFrom: FROM, dTo: TO }, () => 0);
    await page.click(`#pageContent ${sel}`); await page.waitForSelector('#appModal #btnSaveWatt'); await settle(500);
    L.modals.push(await page.evaluate(modalOf));
  }
  // نفس اليوم: «حفظ + موقع آخر» من خلية فيها سجل (الأيام المقترحة = 1 − المسجّل)
  await legacy({ dailiesTab: 'workers', dailiesDept: '', dFrom: FROM, dTo: TO }, () => 0);
  await page.click('#pageContent .watt-cell.filled[data-multi="1"]'); await page.waitForSelector('#appModal .wsite-table'); await settle(300);
  L.day = await page.evaluate(dayOf);
  await page.click('#appModal #btnWsiteAdd'); await page.waitForSelector('#appModal #btnSaveWatt'); await settle(500);
  L.dayAdd = await page.evaluate(modalOf);
  await page.evaluate(() => { try { closeModal(); } catch (e) { /* */ } });
  const attLegacy = async (f) => { await page.evaluate((f) => { try { closeModal(); } catch (e) { /* */ } goToPage('attendance'); Object.keys(attendanceFilters).forEach((k) => { attendanceFilters[k] = ''; }); Object.assign(attendanceFilters, f); rerenderCurrentPage(); }, f); await settle(); return page.evaluate(grabAtt); };
  const ATT_VIEWS = [{}, { departmentId: 'dX' }, { status: 'late' }, { from: '2026-03-02', to: '2026-03-02' }];
  L.att = []; for (const f of ATT_VIEWS) L.att.push(await attLegacy(f));
  L.attModals = [];
  for (const id of [null, 't2']) {
    await attLegacy({});
    await page.evaluate((id) => openAttendanceModal(id || undefined), id); await settle(400);
    L.attModals.push(await page.evaluate(attModalOf));
  }
  await page.evaluate(() => { try { closeModal(); } catch (e) { /* */ } });

  // ---------- الجديدة
  await page.goto(url + '/app/worker-attendance'); await page.waitForSelector('#dlKinds .board-card'); await settle(300);
  console.log('[اللوحات] الأنواع والأقسام');
  eq((await page.evaluate(grabBoards)).slice(0, 3), L.kinds.slice(0, 3), 'لوحات الأنواع (العمال والمشرفين والسواقين)');
  ok((await page.evaluate(grabBoards))[3][1].includes('المعدات والمركبات'), 'لوحة المعدات ← الشاشة الكاملة (8.7)');
  await page.click('[data-dailies-tab="workers"]'); await page.waitForSelector('#dlDepts .board-card'); await settle(200);
  eq(await page.evaluate(grabBoards), L.depts, 'لوحات أقسام العمال');

  console.log('[الجدول] نفس العناوين والخلايا والكروت والفلاتر');
  // نفس توكن الشاشة الجديدة (من طلباتها) — للمقارنة بالـ API مباشرة
  let auth = '';
  page.on('request', (q) => { const a = q.headers().authorization; if (a && /\/api\/v1\//.test(q.url())) auth = a; });
  const gridResp = () => page.waitForResponse((r) => /\/api\/v1\/dailies\/grid/.test(r.url()));
  const openView = async (v) => {
    await page.goto(url + '/app/worker-attendance'); await page.waitForSelector('#dlKinds .board-card');
    await page.click(`[data-dailies-tab="${v.dailiesTab}"]`); await page.waitForSelector('#dlDepts .board-card');
    let r = gridResp(); await page.click(`[data-dailies-dept="${v.dailiesDept}"]`); await r;
    r = gridResp(); await page.fill('#wattFrom', FROM); await r;
    r = gridResp(); await page.fill('#wattTo', TO); await r;
    if (v.status) { r = gridResp(); await page.selectOption('#wattFilterStatus', v.status); await r; }
    if (v.project) { r = gridResp(); await page.selectOption('#wattFilterProject', v.project); await r; }
    if (v.q) { r = gridResp(); await page.fill('#wattSearch', v.q); await r; }
    await settle(500);
    // نفس الفلاتر من الـ API مباشرة (للمقارنة بـ «مستحق الشهر»)
    const qs = new URLSearchParams({ tab: v.dailiesTab, dept: v.dailiesDept, from: FROM, to: TO, ...(v.status ? { status: v.status } : {}), ...(v.project ? { project: v.project } : {}), ...(v.q ? { q: v.q } : {}) });
    const res = await page.context().request.get(`${url}/api/v1/dailies/grid?${qs}`, { headers: { authorization: auth } }); return res.json();
  };
  for (const [i, v] of VIEWS.entries()) {
    const g = await openView(v);
    eq(await page.evaluate(grabGrid), L.grids[i], `${JSON.stringify(v)}: نفس الجدول والكروت والفلاتر`);
    const pay = await page.evaluate(() => [...document.querySelectorAll('#dlCards .sc-card')].find((c) => /مستحق/.test(c.innerText)).querySelector('.sc-num').innerText.trim());
    eq(pay, `${(Number(g.cards.pay) || 0).toLocaleString('ar-EG', { maximumFractionDigits: 6 })} ج.م`, `${v.dailiesTab}: «مستحق الشهر» = الحساب الجديد (DEC-0129)`);
  }
  await openView(VIEWS[0]);
  ok(/الحساب الجديد/.test(await page.innerText('#dlDiff')) && /الفرق/.test(await page.innerText('#dlDiff')), 'تقرير الفرق (د-2) ظاهر', await page.innerText('#dlDiff'));

  console.log('[النافذة] نفس الخانات والخيارات والقيم');
  for (const [i, sel] of MODALS.entries()) {
    await openView(VIEWS[0]);
    await page.click(sel); await page.waitForSelector('#appModal #btnSaveWatt'); await settle(500);
    eq(await page.evaluate(modalOf), L.modals[i], `${['خلية فاضية', 'تعديل متأخر', 'تعديل نصف يوم', 'خلية فاضية لعامل تاني'][i]}: نفس النافذة`);
  }
  // DEC-0130: الأجر المحفوظ بيفضل في التعديل (القديمة بتكتب فوقه أجر الشخص الحالي — DAILIES_ACCEPTANCE §4)
  await openView(VIEWS[0]);
  await page.click('.watt-cell.filled[data-att="a9"]'); await page.waitForSelector('#appModal #btnSaveWatt'); await settle(300);
  eq(await page.inputValue('#wattDayWage'), '300', 'تعديل يومية بأجر مختلف عن أجر العامل: الأجر المحفوظ (300) مش أجره الحالي (250)');
  await page.selectOption('#wattStatus', 'present');
  eq(await page.innerText('#wattPreviewVal'), (300).toLocaleString('ar-EG'), 'المعاينة بالحساب الجديد');

  console.log('[مواقع اليوم] نفس النافذة');
  await openView(VIEWS[0]);
  await page.click('.watt-cell.filled[data-multi="1"]'); await page.waitForSelector('#appModal .wsite-table'); await settle(300);
  eq(await page.evaluate(dayOf), L.day, 'نافذة مواقع اليوم');
  await page.click('#appModal #btnWsiteAdd'); await page.waitForSelector('#appModal #btnSaveWatt'); await settle(600);
  eq(await page.evaluate(modalOf), L.dayAdd, '«+ موقع آخر لنفس اليوم»: نفس النافذة والأيام المقترحة');

  console.log('[الحفظ من الشاشة الجديدة]');
  const after = async (re, method, fn) => { const [r] = await Promise.all([page.waitForResponse((x) => re.test(x.url()) && x.request().method() === method), fn()]); return r.status(); };
  await openView(VIEWS[0]);
  await page.click('.watt-cell.empty[data-id="w2"][data-date="2026-03-06"]'); await page.waitForSelector('#appModal #btnSaveWatt'); await settle(300);
  await page.selectOption('#wattProject', 'برج النيل'); await page.fill('#wattSite', 'الموقع ج');
  eq(await after(/\/api\/v1\/dailies$/, 'POST', () => page.click('#btnSaveWatt')), 201, 'تسجيل يومية');
  await settle(500);
  eq(await page.evaluate(() => { const b = document.querySelector('.watt-cell.filled[data-id="w2"][data-date="2026-03-06"]'); return b && b.innerText.trim(); }), '✓', 'الخلية اتحدّثت');
  await page.click('.watt-cell.filled[data-att="a3"]'); await page.waitForSelector('#appModal #btnSaveWatt'); await settle(300);
  await page.fill('#wattDeduction', '20');
  eq(await after(/\/api\/v1\/dailies\/a3$/, 'PATCH', () => page.click('#btnSaveWatt')), 200, 'تعديل يومية');
  await settle(400);
  await page.click('.watt-cell.filled[data-att="a4"]'); await page.waitForSelector('#appModal #btnDelWattModal'); await page.click('#btnDelWattModal');
  await page.waitForSelector('#appConfirmModal #btnConfirmDel');
  eq(await after(/\/api\/v1\/dailies\/a4/, 'DELETE', () => page.click('#btnConfirmDel')), 200, 'حذف بعد التأكيد');
  await settle(400);
  ok(await page.evaluate(() => !!document.querySelector('.watt-cell.empty[data-id="w1"][data-date="2026-03-04"]')), 'الخلية فضيت');

  console.log('[المراجعة] DEC-0133');
  await page.click('#btnDlReview'); await page.waitForSelector('#dlReviewTable'); await settle(300);
  eq(await page.evaluate(() => [...document.querySelectorAll('#dlReviewTable tbody tr')].map((tr) => tr.getAttribute('data-id'))), ['a8'], 'قايمة المراجعة: الحالة المش معروفة');
  page.once('dialog', (d) => d.accept());
  eq(await after(/\/a8\/review$/, 'POST', () => page.click('#dlReviewTable .btn-rv-count')), 200, 'قرار «تتحسب»');
  await settle(400);
  ok(/تتحسب/.test(await page.innerText('#dlReviewTable')), 'القرار ظاهر في القايمة');

  console.log('[حضور الموظفين] نفس الصفحة والنافذة');
  const attResp = () => page.waitForResponse((r) => /\/api\/v1\/attendance(\?|$)/.test(r.url()) && r.request().method() === 'GET');
  for (const [i, f] of ATT_VIEWS.entries()) {
    let r = attResp(); await page.goto(url + '/app/attendance'); await r;
    if (f.departmentId) { r = attResp(); await page.selectOption('#attFilterDept', f.departmentId); await r; }
    if (f.status) { r = attResp(); await page.selectOption('#attFilterStatus', f.status); await r; }
    if (f.from) { r = attResp(); await page.fill('#attFrom', f.from); await r; r = attResp(); await page.fill('#attTo', f.to); await r; }
    await settle(200);
    eq(await page.evaluate(grabAtt), L.att[i], `${JSON.stringify(f)}: نفس الكروت والفلاتر والجدول`);
  }
  { const r = attResp(); await page.goto(url + '/app/attendance'); await r; await settle(200); }
  for (const [i, sel] of ['#btnAddAtt', '#attTable tr[data-id="t2"] .btn-edit-att'].entries()) {
    await page.click(sel); await page.waitForSelector('#appModal #btnSaveAtt'); await settle(200);
    eq(await page.evaluate(attModalOf), L.attModals[i], `${['تسجيل', 'تعديل'][i]}: نفس النافذة`);
    await page.click('#appModal .modal-close'); await settle(150);
  }
  await page.click('#btnAddAtt'); await page.waitForSelector('#appModal #btnSaveAtt');
  await page.selectOption('#attEmp', 'e2'); await page.fill('#attDate', '2026-03-03'); await page.fill('#attIn', '08:15');
  eq(await after(/\/api\/v1\/attendance$/, 'POST', () => page.click('#btnSaveAtt')), 201, 'تسجيل حضور');
  await settle(300);
  await page.click('#attTable tr[data-id="t2"] .btn-del-att'); await page.waitForSelector('#appConfirmModal #btnConfirmDel');
  eq(await after(/\/api\/v1\/attendance\/t2/, 'DELETE', () => page.click('#btnConfirmDel')), 200, 'حذف بعد التأكيد');
  await settle(300);
  eq(await page.evaluate(() => [...document.querySelectorAll('#attTable tbody tr')].length), 3, 'الجدول اتحدّث');
  eq(errors, [], 'من غير أخطاء');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
