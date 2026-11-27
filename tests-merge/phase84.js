// المرحلة 8 (الحزمة 8.6.4 — المستحقات والصرف): السيرفر (/api/v1/dues) = الواجهة القديمة (DEC-0137).
//  [1] اللوحات، وصفوف كل نوع بكل فلتر (الفترة، والقسم، والبحث) بالأرقام القديمة (legacyDue / legacyBal) = دوال القديمة نفسها، والكروت،
//      وكشف المشرف، وسجل الصرف والخصومات (الترتيب، والنوع، والبند، والراتب، والبدلات، والنطاق، والإجماليات)
//  [2] الحساب الجديد (DEC-0129) قدام القديم: الفرق بس عند اللي يومياته فيها تقريب
//  [3] الحفظ: نافذة الصرف القديمة في A = الـ API في B (يومية، وراتب، وبدلات مستحقة ودفعها، وخصم عامل وموظف، وصرف المشرف للمشرف وموزع
//      على العمال، وصرف فوق المتبقي — في B بسلفة بس، DEC-0132) — نفس السجلات بالظبط ما عدا علامات السلفة، والحذف
// بيشتغل في WEB_MODE=1 (وفوق الجداول). في وضع الملف بيعدّي.
const { openApp, WEB } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const P = (id, o) => Object.assign({ id, extraFields: [], attachments: [] }, o);
  const A = (id, o) => Object.assign({ id, status: 'present', days: 1, deduction: 0, notes: '' }, o);
  const W = (id, pid, o) => A(id, Object.assign({ personType: 'worker', personKind: 'worker', personId: pid, workerId: pid }, o));
  const PAY = (id, o) => Object.assign({ id, type: 'pay', scope: 'self', notes: '' }, o);
  const seed = {
    users: [baseUser], schemaVersion: 9,
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
  if (!WEB) { ok(true, 'وضع الملف: مقارنة السيرفر بتتعمل في WEB_MODE=1'); eq(errors, [], 'no JS errors'); await browser.close(); summary(); return; }
  const api = (pg, m, u, body, h) => pg.evaluate(async ([m, u, body, h]) => {
    const res = await fetch(u, { method: m, headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer ' + WebSession.token(), ...h }, body: body ? JSON.stringify(body) : undefined });
    let j = null; try { j = await res.json(); } catch (e) { /* */ } return { status: res.status, body: j };
  }, [m, u, body || null, h || {}]);
  const qs = (f) => Object.entries(f).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

  console.log('[1] السيرفر = الصفحة القديمة');
  const lBoards = await page.evaluate(() => Object.fromEntries(DUES_KIND_BOARDS.map((b) => [b.id, [duesListForKind(b.id).length, departmentsForKind(b.entityKind).length]])));
  const sB = (await api(page, 'GET', '/api/v1/dues/boards')).body;
  eq(Object.fromEntries(sB.kinds.map((x) => [x.id, [x.count, x.depts]])), lBoards, 'لوحات الأنواع (العدد والأقسام)');
  const VIEWS = [{ tab: 'workers' }, { tab: 'workers', from: '2026-03-01', to: '2026-03-31' }, { tab: 'workers', dept: '__core_workers_temp__' }, { tab: 'workers', q: 'بدر' },
    { tab: 'drivers' }, { tab: 'drivers', from: '2026-03-01', to: '2026-03-31' }, { tab: 'employees' }, { tab: 'employees', from: '2026-03-01', to: '2026-03-31' }, { tab: 'supervisors' }, { tab: 'supervisors', from: '2026-03-01', to: '2026-03-31' }];
  const legacyView = (f) => page.evaluate((f) => {
    const F = f.from || undefined, T = f.to || undefined, q = (f.q || '').toLowerCase();
    let list = f.tab === 'drivers' ? sortByNameAr(DATA.drivers.filter((d) => d.status !== 'inactive'), (d) => d.name) : sortByNameAr(DATA[f.tab].slice(), (x) => x.name);
    if (f.dept) list = filterByDeptFilter(list, f.dept);
    if (q) list = list.filter((p) => smartMatch(p.name, q) || smartMatch(p.code, q));
    const rows = list.map((p) => {
      if (f.tab === 'workers') { const ex = personExtrasTotal('worker', p.id, F, T); return [p.id, supervisorName(p.supervisorId), workerDaysWorked(p.id, F, T), toInt(workerDaysAbsent(p.id, F, T)), ex, toInt(workerDueAmount(p.id, F, T) + ex), workerPenaltyTotal(p.id, F, T), personExpensesTotal('worker', p.id, F, T), workerPaidTotal(p.id, F, T), workerBalance(p.id, F, T)]; }
      if (f.tab === 'drivers') { const ex = personExtrasTotal('driver', p.id, F, T); return [p.id, '', driverDaysWorked(p.id, F, T), 0, ex, toInt(driverDueAmount(p.id, F, T) + ex), driverPenaltyTotal(p.id, F, T), personExpensesTotal('driver', p.id, F, T), driverPaidTotal(p.id, F, T), driverBalance(p.id, F, T)]; }
      if (f.tab === 'employees') { const v = renderDuesEmployees; void v; const ex = personExtrasTotal('employee', p.id, F, T); const base = employeeDueAmount(p.id, F, T); const paid = toInt(DATA.workerPayments.filter((x) => x.personType === 'employee' && x.personId === p.id && isActualPayment(x) && !(F && (x.date || '') < F) && !(T && (x.date || '') > T)).reduce((s, x) => s + toInt(x.amount), 0));
        const pen = toInt(employeePenaltyTotal(p.id, F, T) + toInt(DATA.workerPayments.filter((x) => x.personType === 'employee' && x.personId === p.id && (x.type === 'penalty' || x.type === 'deduction') && !(F && (x.date || '') < F) && !(T && (x.date || '') > T)).reduce((s, x) => s + toInt(x.amount), 0)));
        const exp = personExpensesTotal('employee', p.id, F, T); const due = toInt(base + ex); return [p.id, employeeDaysWorked(p.id, F, T), employeeDaysAbsent(p.id, F, T), ex, due, pen, exp, paid, toInt(due - paid - pen - exp)]; }
      const st = supervisorWageStatement(p.id, F, T); return [p.id, st.ownDays, st.ownExtras, st.ownDue, st.workersDue, st.totalExpenses, st.equipCost, st.totalPenalty, st.totalPaid, st.totalBal, st.totalDue];
    });
    return rows;
  }, f);
  for (const f of VIEWS) {
    const s = (await api(page, 'GET', '/api/v1/dues/table?' + qs(f))).body;
    const sRows = s.rows.map((r) => (f.tab === 'workers' || f.tab === 'drivers' ? [r.id, r.supervisorName, r.days, r.absent, r.extras, r.legacyDue, r.penalty, r.expenses, r.paid, r.legacyBal]
      : f.tab === 'employees' ? [r.id, r.days, r.absent, r.extras, r.legacyDue, r.penalty, r.expenses, r.paid, r.legacyBal]
      : [r.id, r.days, r.extras, r.legacyDue, r.legacyWorkersDue, r.expenses, r.equipCost, r.penalty, r.paid, r.legacyBal, r.legacyTotalDue]));
    eq(sRows, await legacyView(f), `الصفوف ${JSON.stringify(f)}`);
  }
  // سجل الصرف: نفس دالة الصفحة (renderDuesPaymentsList) بالترتيب والأعمدة
  for (const f of [{ tab: 'workers' }, { tab: 'employees' }, { tab: 'workers', q: 'مكافأة' }, { tab: 'supervisors', from: '2026-03-01', to: '2026-03-31' }]) {
    const l = await page.evaluate((f) => { goToPage('workerDues'); window.__duesTab = f.tab; window.__duesDept = ''; window.__duesWorkerQ = f.q || ''; workerAttFilters.from = f.from || ''; workerAttFilters.to = f.to || ''; rerenderCurrentPage();
      const t = [...document.querySelectorAll('#app table.data-table')].pop();
      return [...t.querySelectorAll('tbody tr')].filter((tr) => tr.querySelector('.btn-del-pay')).map((tr) => { const c = [...tr.children].map((td) => td.innerText.trim()); return [tr.querySelector('.btn-del-pay').getAttribute('data-id'), c[2], c[3], c[7]]; }); }, f);
    const s = (await api(page, 'GET', '/api/v1/dues/table?' + qs(f))).body.log.rows.map((r) => [r.id, r.typeLabel, r.item, r.scope]);
    eq(s, l, `سجل الصرف ${JSON.stringify(f)}`);
  }

  console.log('[2] الحساب الجديد قدام القديم');
  const diffs = [];
  for (const tab of ['workers', 'drivers', 'supervisors']) for (const r of (await api(page, 'GET', '/api/v1/dues/table?tab=' + tab)).body.rows) {
    const lb = tab === 'supervisors' ? r.legacyBal : r.legacyBal; if (String(lb) !== String(r.bal)) diffs.push([r.id, lb, r.bal]);
  }
  eq(diffs, [['w1', 685, '684.99'], ['s1', 2675, '2674.99']], 'الفرق بس عند عامل يومياته فيها تقريب (ويوم ونص ونصف يوم) — ومشرفه بالتبعية');

  console.log('[3] الحفظ: نافذة القديمة (A) = الـ API (B)');
  const B = await openApp(seed);
  const saveCount = () => page.evaluate(() => window.__saveCount);
  const waitSave = async (n) => { await page.waitForFunction((x) => window.__saveCount > x, n, { timeout: 15000 }); await page.waitForTimeout(250); };
  const closeAll = async () => { await page.evaluate(() => { try { closeSubModal(); } catch (e) { /* */ } try { closeModal(); } catch (e) { /* */ } }); await page.waitForTimeout(250); };
  const open = async (mode, pid, type, opts) => { await closeAll(); await page.evaluate(([m, p, t, o]) => { goToPage('workerDues'); openUnifiedPayModal(m, p, t, o || undefined); }, [mode, pid, type, opts]); await page.waitForTimeout(400); };
  const save = async () => { const n = await saveCount(); await page.click('#btnSaveUp'); await waitSave(n); };
  const lines = async (wrap, rows) => { for (const [i, [item, amt]] of rows.entries()) { if (i) await page.click(wrap === '#upDailyLines' ? '#btnUpAddLineDaily' : '#btnUpAddLine'); const r = page.locator(`${wrap} .up-line`).nth(i); await r.locator('.up-item').fill(item); await r.locator('.up-amt').fill(String(amt)); await r.locator('.up-amt').dispatchEvent('input'); } };
  const key = () => ({ 'Idempotency-Key': 'dues-' + Math.random().toString(36).slice(2) });
  const P2 = (body) => api(B.page, 'POST', '/api/v1/dues/pay', body, key());
  // يومية لعامل (جوه المتبقي)
  await open('pay', 'w2', 'worker'); await page.selectOption('#upPayKind', 'daily'); await page.waitForTimeout(200); await page.fill('#upDate', '2026-03-20'); await lines('#upDailyLines', [['دفع يوميات', 200], ['حافز يومي', 50]]); await save();
  eq((await P2({ mode: 'pay', personType: 'worker', personId: 'w2', payKind: 'daily', date: '2026-03-20', lines: [{ item: 'دفع يوميات', amount: '200' }, { item: 'حافز يومي', amount: '50' }] })).status, 201, 'يومية');
  // راتب موظف
  await open('pay', 'e1', 'employee'); await page.fill('#upDate', '2026-03-21'); await page.fill('#upSalary', '1000'); await save();
  eq((await P2({ mode: 'pay', personType: 'employee', personId: 'e1', payKind: 'salary', salary: '1000', date: '2026-03-21' })).status, 201, 'راتب');
  // بدلات (مستحق)
  await open('pay', 'w1', 'worker', { extrasOnly: true, defaultPayKind: 'salary_bonus' }); await page.fill('#upDate', '2026-03-22'); await lines('#upLines', [['بدل إعاشة', 120]]); await save();
  eq((await P2({ mode: 'extras', personType: 'worker', personId: 'w1', date: '2026-03-22', lines: [{ item: 'بدل إعاشة', amount: '120' }] })).status, 201, 'بدلات (مستحق)');
  // دفع الإضافات المستحقة (p3)
  await open('pay', 'w2', 'worker'); await page.selectOption('#upPayKind', 'extras'); await page.waitForTimeout(300); await page.check('.up-bonus-chk[data-bonus-id="p3"]'); await page.fill('#upDate', '2026-03-23'); await save();
  eq((await P2({ mode: 'pay', personType: 'worker', personId: 'w2', payKind: 'extras', bonusIds: ['p3'], date: '2026-03-23' })).status, 201, 'دفع الإضافات المستحقة');
  // خصم عامل وموظف
  await open('penalty', 'w2', 'worker'); await page.fill('#upDate', '2026-03-24'); await lines('#upLines', [['غياب', 80], ['مخالفة', 20]]); await save();
  eq((await P2({ mode: 'penalty', personType: 'worker', personId: 'w2', date: '2026-03-24', lines: [{ item: 'غياب', amount: '80' }, { item: 'مخالفة', amount: '20' }] })).status, 201, 'خصم عامل');
  await open('penalty', 'e1', 'employee'); await page.fill('#upDate', '2026-03-24'); await lines('#upLines', [['تأخير', 90]]); await save();
  eq((await P2({ mode: 'penalty', personType: 'employee', personId: 'e1', date: '2026-03-24', lines: [{ item: 'تأخير', amount: '90' }] })).status, 201, 'خصم موظف');
  // المشرف: للمشرف (جوه متبقيه)، وموزع على العمال
  for (const [scope, amt] of [['self', 100], ['workers', 500]]) {
    await open('pay', 's1', 'supervisor'); await page.selectOption('#upPayKind', 'daily'); await page.waitForTimeout(200); await page.selectOption('#upScope', scope); await page.dispatchEvent('#upScope', 'change'); await page.waitForTimeout(200);
    await page.fill('#upDate', '2026-03-25'); await lines('#upDailyLines', [['دفع يوميات', amt]]); await save();
    eq((await P2({ mode: 'pay', personType: 'supervisor', personId: 's1', payKind: 'daily', scope, date: '2026-03-25', lines: [{ item: 'دفع يوميات', amount: String(amt) }] })).status, 201, `صرف المشرف (${scope})`);
  }
  // فوق المتبقي: القديمة بتقبل، والجديدة سلفة بس (DEC-0132)
  await open('pay', 'd1', 'driver'); await page.selectOption('#upPayKind', 'daily'); await page.waitForTimeout(200); await page.fill('#upDate', '2026-03-26'); await lines('#upDailyLines', [['دفع يوميات', 900]]); await save();
  const over = { mode: 'pay', personType: 'driver', personId: 'd1', payKind: 'daily', date: '2026-03-26', lines: [{ item: 'دفع يوميات', amount: '900' }] };
  eq((await P2(over)).body.code, 'OVER_BALANCE', 'فوق المتبقي من غير سلفة: مرفوض في الجديدة');
  const adv = await P2({ ...over, advance: true });
  eq([adv.status, adv.body.advance], [201, true], 'فوق المتبقي بسلفة');
  // الحذف
  await page.evaluate(() => { window.confirmDelete = () => Promise.resolve(true); goToPage('workerDues'); window.__duesTab = 'workers'; window.__duesDept = ''; window.__duesWorkerQ = ''; workerAttFilters.from = ''; workerAttFilters.to = ''; rerenderCurrentPage(); });
  let n = await saveCount(); await page.click('#app .btn-del-pay[data-id="p2"]'); await waitSave(n);
  const p2 = (await api(B.page, 'GET', '/api/v1/dues/table?tab=workers')).body.log.rows.find((r) => r.id === 'p2');
  eq((await api(B.page, 'DELETE', `/api/v1/dues/pay/p2?rev=${p2.rev}`)).status, 200, 'حذف من السجل');
  const snap = (pg) => pg.evaluate(() => {
    const nid = (x) => (/^[pk]\d+$/.test(x.id) ? x.id : `NEW:${x.date}:${x.personId || x.employeeId}:${x.payCategory || x.reason}:${x.amount}`);
    const clean = (xs) => (xs || []).map((x) => { const o = JSON.parse(JSON.stringify(x)); o.id = nid(x); delete o.isAdvance; delete o.advanceApprovedBy; delete o.advanceApprovedAt; return o; }).sort((a, b) => a.id.localeCompare(b.id));
    return { p: clean(DATA.workerPayments), k: clean(DATA.employeePenalties) };
  });
  const reload = async (pg) => { await pg.reload(); await pg.waitForFunction(() => typeof DATA !== 'undefined' && window.WebSync && WebSync._state.meta && (DATA.workerPayments || []).length > 0, null, { timeout: 30000 }); await pg.waitForTimeout(400); };
  await reload(page); await reload(B.page);
  const sa = await snap(page), sbb = await snap(B.page);
  eq(sbb.p, sa.p, 'الصرف والخصومات: نفس السجلات في الاتنين (من غير علامات السلفة)');
  eq(sbb.k, sa.k, 'خصومات الموظفين: نفس السجلات');
  ok(await B.page.evaluate(() => DATA.workerPayments.some((x) => x.isAdvance === true && x.personId === 'd1' && x.advanceApprovedBy)), 'السلفة متعلّمة ومين وافق عليها');

  eq(B.errors, [], 'no JS errors (B)');
  await B.browser.close();
  eq(errors, [], 'no JS errors');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
