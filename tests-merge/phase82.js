// المرحلة 8 (الحزمة 8.5.4 — اليوميات والحضور): السيرفر (/api/v1/dailies و/api/v1/attendance) = الواجهة القديمة (DEC-0135).
//  [1] اللوحات، والأشخاص في الجدول بكل فلتر (wattPeopleList)، وسجلات كل شخص في الفترة، والكروت (العدد والأيام والأيام في أكتر من مشروع،
//      و«مستحق الشهر» بالحساب **القديم** = legacyPay)، وقايمة سجلات الفترة (الاسم والنوع والحالة والأيام والمستحق القديم)، ومواقع اليوم
//  [2] الحساب الجديد (DEC-0129/0130) قدام القديم لكل يومية: نفس القيمة ما عدا التقريب والمراجعة (ودي بس اللي بتختلف — د-2)
//  [3] الحفظ: نافذة اليومية القديمة في A = الـ API في B (تسجيل، وتعديل، وحذف) — نفس السجلات بالظبط. وحضور الموظفين
//  [4] حضور الموظفين: القايمة والكروت = filteredAttendance
// بيشتغل في WEB_MODE=1 (وفوق الجداول). في وضع الملف بيعدّي.
const { openApp, WEB } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
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
    employees: [P('e1', { code: 'EMP-001', name: 'أحمد المحاسب', status: 'active', departmentId: 'dX', categoryId: 'dX' })],
    departments: [{ id: 'dX', name: 'الحسابات', kind: 'employees' }],
    workerAttendance: [
      W('a1', 'w1', { date: '2026-03-01', dayWage: 333.33, days: 1.5, project: 'مشروع الشروق', site: 'الموقع أ' }),
      W('a2', 'w1', { date: '2026-03-02', status: 'half', days: 1, dayWage: 333.33, project: 'مشروع الشروق' }),
      W('a3', 'w1', { date: '2026-03-03', status: 'late', dayWage: 333.33, deduction: 50, project: 'مشروع الشروق' }),
      W('a4', 'w1', { date: '2026-03-04', status: 'absent', dayWage: 333.33, project: 'مشروع الشروق' }),
      W('a5', 'w1', { date: '2026-03-05', dayWage: 333.33, project: 'مشروع الشروق', site: 'الموقع أ' }),
      W('a6', 'w1', { date: '2026-03-05', dayWage: 333.33, days: 0.5, project: 'برج النيل', site: 'الموقع ب' }),
      W('a7', 'w2', { date: '2026-03-01', project: 'برج النيل', days: 2, dayWage: 250 }),
      W('a8', 'w2', { date: '2026-03-02', status: 'overtime', dayWage: 250, project: 'برج النيل' }),
      W('a9', 'w2', { date: '2026-03-03', dayWage: 300, deduction: 400, status: 'late', project: 'برج النيل' }),
      A('b1', { personType: 'supervisor', personKind: 'supervisor', personId: 's1', supervisorId: 's1', workerId: '', date: '2026-03-01', dayWage: 400, project: 'مشروع الشروق' }),
      A('c1', { personType: 'driver', personKind: 'driver', personId: 'd1', driverId: 'd1', workerId: '', supervisorId: '', date: '2026-03-02', dayWage: 280, project: 'برج النيل' }),
    ],
    attendance: [{ id: 't1', employeeId: 'e1', date: '2026-03-01', status: 'present', checkIn: '08:00', checkOut: '16:00', notes: 'تمام' }, { id: 't2', employeeId: 'e1', date: '2026-03-02', status: 'late', checkIn: '09:30', checkOut: '', notes: '' }],
  };
  const { browser, page, errors } = await openApp(seed);
  if (!WEB) { ok(true, 'وضع الملف: مقارنة السيرفر بتتعمل في WEB_MODE=1'); eq(errors, [], 'no JS errors'); await browser.close(); summary(); return; }
  const api = (pg, m, u, body, h) => pg.evaluate(async ([m, u, body, h]) => {
    const res = await fetch(u, { method: m, headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer ' + WebSession.token(), ...h }, body: body ? JSON.stringify(body) : undefined });
    let j = null; try { j = await res.json(); } catch (e) { /* */ } return { status: res.status, body: j };
  }, [m, u, body || null, h || {}]);
  const qs = (f) => Object.entries(f).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

  console.log('[1] السيرفر = الصفحة القديمة');
  const F = [{ tab: 'workers' }, { tab: 'workers', supervisorId: 's1' }, { tab: 'workers', q: 'بدر' }, { tab: 'workers', project: 'برج النيل' }, { tab: 'workers', site: 'الموقع ب' }, { tab: 'workers', status: 'late' },
    { tab: 'workers', dept: '__core_workers_temp__' }, { tab: 'supervisors' }, { tab: 'drivers' }];
  for (const f of F) {
    const legacy = await page.evaluate((f) => {
      goToPage('workerAttendance'); Object.assign(workerAttFilters, { dailiesTab: f.tab, dailiesDept: f.dept || '', dFrom: '2026-03-01', dTo: '2026-03-07', q: f.q || '', project: f.project || '', site: f.site || '', status: f.status || '', supervisorId: f.supervisorId || '' });
      workerAttFilters.personType = f.tab === 'workers' ? 'worker' : f.tab === 'supervisors' ? 'supervisor' : 'driver';
      const kind = workerAttFilters.personType;
      let people = wattPeopleList().filter((p) => p.kind === kind);
      if (f.dept) { const ids = new Set(filterByDeptFilter(DATA.workers, f.dept).map((x) => x.id)); people = people.filter((p) => ids.has(p.id)); }
      let d = 0, pay = 0, multi = 0;
      const rows = people.map((p) => { const recs = wattRecordsForPerson(p.kind, p.id, '2026-03-01', '2026-03-07'); const per = p.kind === 'supervisor' ? getSupervisor(p.id) : p.kind === 'driver' ? getDriver(p.id) : getWorker(p.id);
        recs.forEach((a) => { d += attendanceDaysCredit(a); pay += attendanceNetPay(a, per); }); const by = {}; recs.forEach((a) => { (by[a.date] = by[a.date] || []).push(a); }); Object.values(by).forEach((g) => { if (g.length > 1) g.slice(1).forEach((a) => { multi += attendanceDaysCredit(a); }); });
        return [p.kind, p.id, p.name, p.code, p.extra, recs.map((a) => [a.id, a.date, attendanceDaysCredit(a)]), fmtDays(Math.round(recs.reduce((s, a) => s + attendanceDaysCredit(a), 0) * 100) / 100)]; });
      return { rows, cards: [people.length, fmtDays(Math.round(d * 100) / 100), toInt(pay), fmtDays(Math.round(multi * 100) / 100)] };
    }, f);
    const r = (await api(page, 'GET', '/api/v1/dailies/grid?' + qs({ ...f, from: '2026-03-01', to: '2026-03-07', dept: f.dept || '' }))).body;
    eq({ rows: r.rows.map((p) => [p.kind, p.id, p.name, p.code, p.extra, p.records.map((a) => [a.id, a.date, a.days]), p.totalDays]), cards: [r.cards.people, r.cards.days, r.cards.legacyPay, r.cards.multi] }, legacy, `الجدول ${JSON.stringify(f)}`);
  }
  const lBoards = await page.evaluate(() => { const k = {}; DAILIES_KIND_BOARDS.filter((b) => b.id !== 'equipment').forEach((b) => { k[b.id] = [dailiesListForKind(b.id).length, departmentsForKind(b.entityKind).length]; }); return k; });
  const sb = (await api(page, 'GET', '/api/v1/dailies/boards')).body;
  eq(Object.fromEntries(sb.kinds.map((x) => [x.id, [x.count, x.depts]])), lBoards, 'لوحات الأنواع (العدد والأقسام)');
  const lList = await page.evaluate(() => (DATA.workerAttendance || []).filter((a) => a.date >= '2026-03-01' && a.date <= '2026-03-31' && !(a.personType && a.personType !== 'worker')).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .map((a) => [a.id, workerName(a.workerId || a.personId), labelOf(ATTENDANCE_STATUS, a.status), fmtAttendanceDays(a), toInt(a.dayWage), attendanceNetPay(a, getWorker(a.workerId || a.personId))]));
  const sList = (await api(page, 'GET', '/api/v1/dailies/list?tab=workers&from=2026-03-01&to=2026-03-31')).body.rows;
  eq(sList.map((a) => [a.id, a.personName, a.statusLabel, a.daysText, a.wage, a.legacyNet]), lList, 'قايمة سجلات الفترة (والمستحق القديم)');
  const sDay = (await api(page, 'GET', '/api/v1/dailies/day?kind=worker&id=w1&date=2026-03-05')).body;
  eq([sDay.rows.map((a) => a.id), sDay.totalDays], ['a5', 'a6'].length ? [['a5', 'a6'], '1½'] : null, 'مواقع اليوم');

  console.log('[2] الحساب الجديد قدام القديم');
  const all = (await api(page, 'GET', '/api/v1/dailies/list?from=2000-01-01&to=2099-12-31')).body.rows;
  const changed = all.filter((a) => String(a.legacyNet) !== a.net).map((a) => [a.id, a.legacyNet, a.net, a.pending]);
  eq(changed.sort(), [['a1', 500, '499.995', false], ['a2', 166.67, '166.665', false], ['a6', 166.67, '166.665', false], ['a8', 250, '0', true]].sort(), 'الفرق بس في التقريب (a1، a2، a6) والحالة المش معروفة (a8 مستنية مراجعة)');

  console.log('[3] الحفظ: نافذة اليومية القديمة (A) = الـ API (B)');
  const B = await openApp(seed);
  const saveCount = () => page.evaluate(() => window.__saveCount);
  const waitSave = async (n) => { await page.waitForFunction((x) => window.__saveCount > x, n, { timeout: 15000 }); await page.waitForTimeout(300); };
  const closeAll = async () => { await page.evaluate(() => { try { closeModal(); } catch (e) { /* */ } }); await page.waitForTimeout(250); };
  // A: تسجيل (متأخر بخصم، وموقع وملاحظات)، وتعديل a7 (نصف يوم)، وحذف a9، وتسجيل مشرف
  await closeAll(); await page.evaluate(() => { goToPage('workerAttendance'); openWorkerAttModal(null, null, { kind: 'worker', id: 'w1', date: '2026-03-10' }); }); await page.waitForTimeout(500);
  await page.selectOption('#wattStatus', 'late'); await page.fill('#wattDeduction', '30'); await page.selectOption('#wattProject', 'برج النيل'); await page.fill('#wattSite', ' س '); await page.fill('#wattNotes', ' ن ');
  let n = await saveCount(); await page.click('#btnSaveWatt'); await waitSave(n);
  await closeAll(); await page.evaluate(() => openWorkerAttModal(null, 'a7')); await page.waitForTimeout(500);
  await page.selectOption('#wattStatus', 'half'); await page.waitForTimeout(150);
  const a7days = await page.inputValue('#wattDays');
  n = await saveCount(); await page.click('#btnSaveWatt'); await waitSave(n);
  await closeAll(); await page.evaluate(() => openWorkerAttModal(null, null, { kind: 'supervisor', id: 's1', date: '2026-03-11' })); await page.waitForTimeout(500);
  await page.selectOption('#wattProject', 'مشروع الشروق'); n = await saveCount(); await page.click('#btnSaveWatt'); await waitSave(n);
  await page.evaluate(() => { window.confirmDelete = () => Promise.resolve(true); goToPage('workerAttendance'); Object.assign(workerAttFilters, { dailiesTab: 'workers', dailiesDept: '', dFrom: '2026-03-01', dTo: '2026-03-31', listView: true, project: '', site: '', status: '', q: '', supervisorId: '', personType: 'worker' }); rerenderCurrentPage(); });
  n = await saveCount(); await page.click('.btn-del-watt[data-id="a9"]'); await waitSave(n);
  // A: حضور موظف
  await closeAll(); await page.evaluate(() => { goToPage('attendance'); openAttendanceModal(); }); await page.waitForTimeout(400);
  await page.evaluate(() => { document.getElementById('attEmp').value = 'e1'; }); await page.fill('#attDate', '2026-03-09'); await page.selectOption('#attStatus', 'half'); await page.fill('#attIn', '10:00'); await page.fill('#attNotes', ' نص ');
  n = await saveCount(); await page.click('#btnSaveAtt'); await waitSave(n);
  await closeAll();

  // B: نفس المدخلات بالـ API
  const key = () => ({ 'Idempotency-Key': 'dl-' + Math.random().toString(36).slice(2) });
  eq((await api(B.page, 'POST', '/api/v1/dailies', { personType: 'worker', personId: 'w1', date: '2026-03-10', status: 'late', days: '1', dayWage: '333.33', deduction: '30', project: 'برج النيل', site: ' س ', notes: ' ن ' }, key())).status, 201, 'POST يومية');
  const a7 = (await api(B.page, 'GET', '/api/v1/dailies/a7')).body;
  eq((await api(B.page, 'PATCH', '/api/v1/dailies/a7', { rev: a7.rev, personType: 'worker', personId: 'w2', date: '2026-03-01', status: 'half', days: a7days, dayWage: '250', deduction: '', project: 'برج النيل', site: '', notes: '' })).status, 200, 'PATCH يومية (نصف يوم)');
  eq((await api(B.page, 'POST', '/api/v1/dailies', { personType: 'supervisor', personId: 's1', date: '2026-03-11', status: 'present', days: '1', dayWage: '400', project: 'مشروع الشروق', site: '', notes: '' }, key())).status, 201, 'POST يومية مشرف');
  const a9 = (await api(B.page, 'GET', '/api/v1/dailies/a9')).body;
  eq((await api(B.page, 'DELETE', `/api/v1/dailies/a9?rev=${a9.rev}`)).status, 200, 'DELETE يومية');
  eq((await api(B.page, 'POST', '/api/v1/attendance', { employeeId: 'e1', date: '2026-03-09', status: 'half', checkIn: '10:00', checkOut: '', notes: ' نص ' }, key())).status, 201, 'POST حضور موظف');
  const snap = (pg) => pg.evaluate(() => {
    const nid = (x) => (/^[abct]\d+$/.test(x.id) ? x.id : `NEW:${x.date}`);
    const clean = (xs) => (xs || []).map((x) => { const o = JSON.parse(JSON.stringify(x)); o.id = nid(x); delete o.projectId; return o; }).sort((a, b) => a.id.localeCompare(b.id));
    return { w: clean(DATA.workerAttendance), a: clean(DATA.attendance) };
  });
  const reload = async (pg) => { await pg.reload(); await pg.waitForFunction(() => typeof DATA !== 'undefined' && window.WebSync && WebSync._state.meta && (DATA.workerAttendance || []).length > 0, null, { timeout: 30000 }); await pg.waitForTimeout(400); };
  await reload(page); await reload(B.page);
  const sa = await snap(page), sbb = await snap(B.page);
  eq(sbb.w, sa.w, 'اليوميات: نفس السجلات في الاتنين (من غير projectId اللي الجديدة بتضيفه — DAILIES_ACCEPTANCE §3-2)');
  eq(sbb.a, sa.a, 'حضور الموظفين: نفس السجلات');
  ok((await api(B.page, 'GET', '/api/v1/dailies/list?from=2026-03-10&to=2026-03-10')).body.rows[0].projectId === 'pB', 'الجديدة بتحفظ معرّف المشروع كمان');

  console.log('[4] حضور الموظفين');
  const AF = [{}, { departmentId: 'dX' }, { status: 'late' }, { from: '2026-03-02' }, { q: 'تمام' }];
  for (const f of AF) {
    const l = await page.evaluate((f) => { Object.keys(attendanceFilters).forEach((k) => { attendanceFilters[k] = ''; }); Object.assign(attendanceFilters, f); return filteredAttendance().map((a) => a.id); }, f);
    eq((await api(page, 'GET', '/api/v1/attendance?' + qs(f))).body.rows.map((a) => a.id), l, `حضور الموظفين ${JSON.stringify(f)}`);
  }

  eq(B.errors, [], 'no JS errors (B)');
  await B.browser.close();
  eq(errors, [], 'no JS errors');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
