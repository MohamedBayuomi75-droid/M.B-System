// المرحلة 8 (الحزمة 8.6.6 — د-2، DEC-0137): مفتاح الحساب الجديد للأيام في الواجهة القديمة (settings.newDayPay) = السيرفر.
//  [1] attendanceNetPay بالمفتاح = newNet في السيرفر لكل يومية (التقريب بـ 6 خانات، والمكررة، والحالة المش معروفة، وقرار «تتحسب» و«تتلغي»)
//  [2] الأرصدة في القديمة بالمفتاح (workerBalance، وdriverBalance، وsupervisorWageStatement) = المتبقي الجديد في /api/v1/dues (بعد toInt القديمة)
//  [3] من غير المفتاح: نفس الحساب القديم بالظبط (phase81–84)
// بيشتغل في WEB_MODE=1 (وفوق الجداول). في وضع الملف: [1] و[3] على القديمة بس.
const { openApp, WEB } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const P = (id, o) => Object.assign({ id, extraFields: [], attachments: [] }, o);
  const A = (id, o) => Object.assign({ id, status: 'present', days: 1, deduction: 0, notes: '' }, o);
  const W = (id, pid, o) => A(id, Object.assign({ personType: 'worker', personKind: 'worker', personId: pid, workerId: pid }, o));
  const PAY = (id, o) => Object.assign({ id, type: 'pay', scope: 'self', notes: '' }, o);
  const seed = {
    users: [baseUser], schemaVersion: 9, settings: { newDayPay: true },
    projects: [{ id: 'pA', code: 'PRJ-001', name: 'مشروع الشروق', status: 'active' }, { id: 'pB', code: 'PRJ-002', name: 'برج النيل', status: 'active' }],
    supervisors: [P('s1', { code: 'SUP-001', name: 'سامي المشرف', status: 'active', dailyWage: 400, departmentId: '__core_supervisors__', categoryId: '__core_supervisors__' })],
    workers: [
      P('w1', { code: 'WRK-001', name: 'عامل أول', status: 'active', workerType: 'temporary', dailyWage: 333.33, supervisorId: 's1', departmentId: '__core_workers_temp__', categoryId: '__core_workers_temp__' }),
      P('w2', { code: 'WRK-002', name: 'بدر الشركة', status: 'active', workerType: 'company', dailyWage: 250, supervisorId: 's1', departmentId: '__core_workers_perm__', categoryId: '__core_workers_perm__' }),
      P('w3', { code: 'WRK-003', name: 'من غير قسم', status: 'active', dailyWage: 200 }),
    ],
    drivers: [P('d1', { code: 'DRV-001', name: 'أحمد السواق', status: 'active', dailyWage: 280, departmentId: '__core_drivers__', categoryId: '__core_drivers__' })],
    employees: [P('e1', { code: 'EMP-001', name: 'أحمد المحاسب', status: 'active', salary: 6000, hireDate: '2025-01-01', departmentId: '__core_employees__', categoryId: '__core_employees__' }),
      P('e2', { code: 'EMP-002', name: 'منى', status: 'active', salary: 0, departmentId: 'dX', categoryId: 'dX' })],
    departments: [{ id: 'dX', name: 'الحسابات', kind: 'employees' }],
    equipment: [P('q1', { code: 'EQ-001', name: 'لودر', status: 'active', supervisorId: 's1', dailyCost: 1000 })],
    equipmentDaily: [{ id: 'ed1', equipmentId: 'q1', date: '2026-03-02', days: 1, project: 'برج النيل' }],
    workerAttendance: [
      W('a1', 'w1', { date: '2026-03-01', dayWage: 333.33, days: 1.5, project: 'مشروع الشروق' }),
      W('a2', 'w1', { date: '2026-03-02', status: 'half', dayWage: 333.33, project: 'مشروع الشروق' }),
      W('a3', 'w1', { date: '2026-03-03', status: 'late', dayWage: 333.33, deduction: 50, project: 'برج النيل' }),
      W('a4', 'w1', { date: '2026-03-04', status: 'absent', dayWage: 333.33, project: 'مشروع الشروق' }),
      W('a5', 'w2', { date: '2026-03-01', dayWage: 250, days: 2, project: 'برج النيل' }),
      W('a6', 'w2', { date: '2026-04-02', dayWage: 250, project: 'برج النيل' }),
      A('b1', { personType: 'supervisor', personKind: 'supervisor', personId: 's1', supervisorId: 's1', workerId: '', date: '2026-03-01', dayWage: 400, project: 'مشروع الشروق' }),
      W('a7', 'w2', { date: '2026-03-03', status: 'overtime', dayWage: 250, project: 'برج النيل' }),
      W('a8', 'w2', { date: '2026-03-01', dayWage: 250, project: 'برج النيل' }),
      W('a9', 'w2', { date: '2026-03-05', status: 'overtime', dayWage: 250, project: 'برج النيل', reviewDecision: 'count' }),
      W('a10', 'w1', { date: '2026-03-06', dayWage: 333.33, project: 'برج النيل', reviewDecision: 'void', reviewReason: 'غلط' }),
      A('c1', { personType: 'driver', personKind: 'driver', personId: 'd1', driverId: 'd1', workerId: '', date: '2026-03-02', dayWage: 280, project: 'برج النيل' }),
    ],
    workerPayments: [
      PAY('p1', { personType: 'worker', personId: 'w1', workerId: 'w1', date: '2026-03-05', amount: 300, payCategory: 'دفع يوميات', payKind: 'daily' }),
      PAY('p2', { personType: 'worker', personId: 'w1', workerId: 'w1', type: 'penalty', date: '2026-03-06', amount: 40, payCategory: 'تأخير', payKind: 'penalty' }),
      PAY('p3', { personType: 'worker', personId: 'w2', workerId: 'w2', type: 'bonus', date: '2026-03-06', amount: 100, payCategory: 'مكافأة', payKind: 'bonus', isExtra: true, extrasAmount: 100, salaryAmount: 0, status: 'accrued' }),
      PAY('p4', { personType: 'supervisor', personId: 's1', workerId: '', date: '2026-03-07', amount: 200, payCategory: 'دفع يوميات', payKind: 'daily' }),
      PAY('p5', { personType: 'employee', personId: 'e1', workerId: '', date: '2026-03-10', amount: 2500, payCategory: 'راتب', payKind: 'salary', salaryAmount: 2500, extrasAmount: 0 }),
      PAY('p6', { personType: 'driver', personId: 'd1', workerId: '', date: '2026-04-01', amount: 50, payCategory: 'دفع يوميات', payKind: 'daily' }),
      { id: 'p7', workerId: 'w2', date: '2026-03-08', amount: 60, notes: 'سجل قديم من غير نوع' },
    ],
    employeePenalties: [{ id: 'k1', employeeId: 'e1', date: '2026-03-11', amount: 150, reason: 'غياب', notes: '', type: 'penalty' }],
    costs: [{ id: 'cs1', personKind: 'worker', personId: 'w1', date: '2026-03-03', amount: 75, item: 'مواصلات', project: 'برج النيل', notes: '' }],
    expenses: [{ id: 'ex1', personKind: 'driver', personId: 'd1', date: '2026-03-02', amount: 30, type: 'وقود', notes: '' }],
  };
  const { browser, page, errors } = await openApp(seed);
  const legacyNets = () => page.evaluate(() => DATA.workerAttendance.map((a) => { const t = attType(a), pid = attPersonId(a); const per = t === 'supervisor' ? getSupervisor(pid) : t === 'driver' ? getDriver(pid) : getWorker(pid); return [a.id, attendanceNetPay(a, per)]; }));
  console.log('[1] attendanceNetPay بالمفتاح');
  const on = await legacyNets();
  eq(on.filter(([id]) => ['a1', 'a2', 'a7', 'a8', 'a9', 'a10'].includes(id)), [['a1', 499.995], ['a2', 166.665], ['a7', 0], ['a8', 0], ['a9', 250], ['a10', 0]], 'التقريب، والحالة المش معروفة، والمكررة، وقرار «تتحسب»، و«تتلغي»');
  console.log('[3] من غير المفتاح');
  const off = await page.evaluate(() => { DATA.settings.newDayPay = false; const r = DATA.workerAttendance.map((a) => [a.id, attendanceNetPay(a, getWorker(a.workerId || a.personId) || getSupervisor(a.personId) || getDriver(a.personId))]); DATA.settings.newDayPay = true; return r; });
  eq(off.filter(([id]) => ['a1', 'a2', 'a7', 'a8'].includes(id)), [['a1', 500], ['a2', 166.67], ['a7', 250], ['a8', 250]], 'الحساب القديم زي ما هو');
  if (WEB) {
    const api = (u) => page.evaluate(async (u) => (await fetch(u, { headers: { Authorization: 'Bearer ' + WebSession.token() } })).json(), u);
    const srv = (await api('/api/v1/dailies/list?from=2000-01-01&to=2099-12-31')).rows.map((a) => [a.id, Number(a.net)]);
    const byId = Object.fromEntries(on);
    eq(srv.map(([id, n]) => [id, n]).sort(), srv.map(([id]) => [id, byId[id]]).sort(), 'كل يومية: القديمة بالمفتاح = السيرفر');
    console.log('[2] الأرصدة');
    const lb = await page.evaluate(() => ({ w1: workerBalance('w1'), w2: workerBalance('w2'), w3: workerBalance('w3'), d1: driverBalance('d1'), s1: supervisorWageStatement('s1').totalBal }));
    const w = (await api('/api/v1/dues/table?tab=workers')).rows, d = (await api('/api/v1/dues/table?tab=drivers')).rows, s = (await api('/api/v1/dues/table?tab=supervisors')).rows;
    const r2 = (x) => Math.round(Number(x) * 100) / 100;
    eq({ w1: r2(w.find((x) => x.id === 'w1').bal), w2: r2(w.find((x) => x.id === 'w2').bal), w3: r2(w.find((x) => x.id === 'w3').bal), d1: r2(d[0].bal), s1: r2(s[0].bal) }, lb, 'المتبقي في القديمة بالمفتاح = الجديد في السيرفر');
  } else ok(true, 'وضع الملف: مقارنة السيرفر بتتعمل في WEB_MODE=1');
  eq(errors, [], 'no JS errors');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
