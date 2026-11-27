// المرحلة 8 (الحزمة 8.6 — المستحقات والصرف): اختبارات قبول للواجهة القديمة (DEC-0086، DEC-0137).
// القيم المتوقعة = السلوك الحالي (LEGACY-PRESERVE) — ناتج الواجهة القديمة نفسها (phase83.expect.json، اتراجع؛ يتولّد تاني بـ PROBE=1):
//  [1] اللوحات: الأنواع (العدد والأقسام) والأقسام للعمال (والكل، و«بدون قسم»)
//  [2] الجداول لكل نوع (العمال، والمشرفين، والسواقين، والموظفين): الكروت، والعناوين، والصفوف — من غير فترة وبفترة، وبالقسم، وبالبحث
//  [3] دوال الأرصدة (المرجع): workerBalance، وdriverBalance، وemployeeBalance، وsupervisorWageStatement (بالمشروع ومن غيره)، وpersonExtrasTotal
//  [4] سجل الصرف والخصومات تحت الجدول: الصفوف (النوع، والبند، والراتب، والبدلات، والمبلغ، والنطاق) والإجماليات، والبحث
//  [5] نافذة الصرف الموحّدة: دفع يومية (من غير سقف)، وراتب موظف (بسقف الراتب المسجّل)، وبدلات ومكافآت (مستحق)، ودفع الإضافات المستحقة،
//      وخصم (العامل في workerPayments والموظف في employeePenalties)، وصرف المشرف بالنطاقات التلاتة (للمشرف، وتوزيع على العمال بالنسبة، وإقفال)
//  [6] الحذف من السجل
// بيشتغل في وضع الملف والويب (WEB_MODE=1) وفوق الجداول.
const { openApp } = require('./harness');
const lib = require('./lib');
const { ok, summary, baseUser } = lib;
const probed = {};
const eq = (a, b, name) => { if (typeof b === 'string' && b.startsWith('__probe_')) { probed[b.slice(8)] = a; return; } lib.eq(a, b, name); };
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
  const EXPECT = process.env.PROBE ? new Proxy({}, { get: (_, k) => '__probe_' + String(k) }) : require('./phase83.expect.json');
  const { browser, page, errors } = await openApp(seed);
  const closeAll = async () => { await page.evaluate(() => { try { closeSubModal(); } catch (e) { /* */ } try { closeModal(); } catch (e) { /* */ } }); await page.waitForTimeout(250); };
  const saveCount = () => page.evaluate(() => window.__saveCount);
  const waitSave = async (n) => { await page.waitForFunction((x) => window.__saveCount > x, n, { timeout: 15000 }); await page.waitForTimeout(250); };
  const view = (tab, dept, from, to, q) => page.evaluate(([tab, dept, from, to, q]) => {
    goToPage('workerDues'); window.__duesTab = tab; window.__duesDept = dept; window.__duesWorkerQ = q || ''; workerAttFilters.from = from || ''; workerAttFilters.to = to || ''; rerenderCurrentPage();
    const txt = (el) => (el.innerText || '').replace(/\s+/g, ' ').trim();
    const tables = [...document.querySelectorAll('#app table.data-table')];
    return {
      title: txt(document.querySelector('#app .page-title')),
      cards: [...document.querySelectorAll('#app .stats-row .stat-card')].map((c) => [txt(c), c.classList.contains('debt')]),
      tables: tables.map((t) => ({ head: [...t.querySelectorAll('thead th')].map(txt), rows: [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map(txt)) })),
      section: txt(document.querySelector('#app .section-title') || document.body).slice(0, 60),
    };
  }, [tab, dept, from, to, q]);

  console.log('[1] اللوحات');
  const boards = await page.evaluate(() => { goToPage('workerDues'); window.__duesTab = ''; window.__duesDept = undefined; rerenderCurrentPage();
    const k = [...document.querySelectorAll('#app .dues-kind-board')].map((b) => [b.getAttribute('data-dues-tab'), b.innerText.replace(/\s+/g, ' ').trim()]);
    window.__duesTab = 'workers'; rerenderCurrentPage();
    const d = [...document.querySelectorAll('#app .dues-dept-board')].map((b) => [b.getAttribute('data-dues-dept'), b.innerText.replace(/\s+/g, ' ').trim()]);
    return { kinds: k, depts: d }; });
  eq(boards, EXPECT.boards, 'لوحات الأنواع والأقسام');

  console.log('[2] الجداول لكل نوع');
  const VIEWS = [['workers', ''], ['workers', '', '2026-03-01', '2026-03-31'], ['workers', '__core_workers_temp__'], ['workers', '__none__'], ['workers', '', '', '', 'بدر'],
    ['supervisors', ''], ['supervisors', '', '2026-03-01', '2026-03-31'], ['drivers', ''], ['drivers', '', '2026-03-01', '2026-03-31'], ['employees', ''], ['employees', '', '2026-03-01', '2026-03-31']];
  const views = {}; for (const v of VIEWS) views[v.join('|')] = await view(...v);
  eq(views, EXPECT.views, 'الكروت والعناوين والصفوف وسجل الصرف لكل نوع وفلتر');

  console.log('[3] دوال الأرصدة');
  const bal = await page.evaluate(() => {
    const R = (f, t) => ({ w1: workerBalance('w1', f, t), w2: workerBalance('w2', f, t), w3: workerBalance('w3', f, t), d1: driverBalance('d1', f, t), e1: employeeBalance('e1', f, t), e2: employeeBalance('e2', f, t),
      e1due: employeeDueAmount('e1', f, t), x: [personExtrasTotal('worker', 'w1', f, t), personExtrasTotal('worker', 'w2', f, t), personExpensesTotal('driver', 'd1', f, t)] });
    const st = (f, t, p) => { const s = supervisorWageStatement('s1', f, t, p); return Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v === 'number')); };
    return { all: R(), march: R('2026-03-01', '2026-03-31'), sAll: st(), sMarch: st('2026-03-01', '2026-03-31'), sProj: st('2026-03-01', '2026-03-31', 'برج النيل') };
  });
  eq(bal, EXPECT.balances, 'workerBalance وdriverBalance وemployeeBalance وsupervisorWageStatement');

  console.log('[5] نافذة الصرف');
  const open = async (mode, pid, type, opts) => { await closeAll(); await page.evaluate(([m, p, t, o]) => { goToPage('workerDues'); openUnifiedPayModal(m, p, t, o || undefined); }, [mode, pid, type, opts]); await page.waitForTimeout(400); };
  const modal = () => page.evaluate(() => ({
    title: document.querySelector('#appModal .modal-header h3').textContent.trim(),
    labels: [...document.querySelectorAll('#appModal .modal-body label')].filter((l) => l.offsetParent !== null).map((l) => { const c = l.cloneNode(true); c.querySelectorAll('input,select,textarea,div,button').forEach((n) => n.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); }),
    options: Object.fromEntries(['upType', 'upPayKind', 'upScope', 'upDept'].filter((id) => document.getElementById(id) && document.getElementById(id).tagName === 'SELECT').map((id) => [id, [...document.getElementById(id).options].map((o) => o.textContent.trim())])),
    hint: (document.getElementById('upSalaryCapHint') || {}).textContent || '', total: (document.getElementById('upTotal') || {}).textContent || '' }));
  const lastPays = (n) => page.evaluate((n) => DATA.workerPayments.slice(-n).map(({ id, ...r }) => ({ ...r, hasId: !!id })), n);
  const save = async () => { const n = await saveCount(); await page.click('#btnSaveUp'); await waitSave(n); };
  const lines = async (wrap, rows) => { for (const [i, [item, amt]] of rows.entries()) { if (i) await page.click(wrap === '#upDailyLines' ? '#btnUpAddLineDaily' : '#btnUpAddLine'); const r = page.locator(`${wrap} .up-line`).nth(i); await r.locator('.up-item').fill(item); await r.locator('.up-amt').fill(String(amt)); await r.locator('.up-amt').dispatchEvent('input'); } };
  const M = {};
  // دفع يومية لعامل (مفيش سقف — أكبر من المتبقي مسموح في القديمة)
  await open('pay', 'w1', 'worker'); M.payOpen = await modal();
  await page.selectOption('#upPayKind', 'daily'); await page.waitForTimeout(200);
  await page.fill('#upDate', '2026-03-20'); await lines('#upDailyLines', [['دفع يوميات', 5000], ['حافز يومي', 50]]); M.dailyTotal = (await modal()).total;
  await save(); M.daily = await lastPays(2);
  // راتب موظف: السقف
  await open('pay', 'e1', 'employee'); M.salaryOpen = await modal();
  await page.fill('#upDate', '2026-03-21'); await page.fill('#upSalary', '9000'); await page.dispatchEvent('#upSalary', 'input'); await page.waitForTimeout(200);
  M.salaryCapped = await page.inputValue('#upSalary');
  let n = await saveCount(); await page.fill('#upSalary', '1000'); await save(); M.salary = await lastPays(1);
  // موظف من غير راتب ← رسالة ومفيش حفظ
  await open('pay', 'e2', 'employee'); await page.fill('#upSalary', '100'); n = await saveCount(); await page.click('#btnSaveUp'); await page.waitForTimeout(400);
  ok(await page.evaluate((n) => window.__saveCount === n, n), 'موظف من غير راتب مسجّل: مفيش حفظ');
  // بدلات ومكافآت (مستحق)
  await open('pay', 'w1', 'worker', { extrasOnly: true, defaultPayKind: 'salary_bonus' }); M.extrasOpen = await modal();
  await page.fill('#upDate', '2026-03-22'); await lines('#upLines', [['بدل إعاشة', 120]]); await save(); M.extras = await lastPays(1);
  // دفع الإضافات المستحقة (p3 لـ w2)
  await open('pay', 'w2', 'worker'); await page.selectOption('#upPayKind', 'extras'); await page.waitForTimeout(300);
  M.unpaid = await page.evaluate(() => [...document.querySelectorAll('.up-bonus-chk')].map((c) => [c.getAttribute('data-bonus-id'), c.getAttribute('data-amount'), c.getAttribute('data-item')]));
  await page.check('.up-bonus-chk[data-bonus-id="p3"]'); await page.fill('#upDate', '2026-03-23'); await save();
  M.extrasPaid = { pay: await lastPays(1), bonus: await page.evaluate(() => { const b = DATA.workerPayments.find((x) => x.id === 'p3'); return [b.status, b.paidDate]; }) };
  // خصم: عامل وموظف
  await open('penalty', 'w2', 'worker'); M.penOpen = await modal(); await page.fill('#upDate', '2026-03-24'); await lines('#upLines', [['غياب', 80], ['مخالفة', 20]]); await save(); M.penW = await lastPays(2);
  await open('penalty', 'e1', 'employee'); await page.fill('#upDate', '2026-03-24'); await lines('#upLines', [['تأخير', 90]]); await save();
  M.penE = await page.evaluate(() => DATA.employeePenalties.slice(-1).map(({ id, ...r }) => ({ ...r, hasId: !!id })));
  // المشرف: النطاقات التلاتة
  for (const scope of ['self', 'workers', 'close_account']) {
    await open('pay', 's1', 'supervisor'); await page.selectOption('#upPayKind', 'daily'); await page.waitForTimeout(200);
    await page.selectOption('#upScope', scope); await page.dispatchEvent('#upScope', 'change'); await page.waitForTimeout(200);
    M[`scopeHint_${scope}`] = await page.evaluate(() => document.getElementById('upScopeHint').textContent.trim());
    const before = await page.evaluate(() => DATA.workerPayments.length);
    await page.fill('#upDate', '2026-03-25'); await lines('#upDailyLines', [['دفع يوميات', 500]]); await save();
    M[`scope_${scope}`] = await page.evaluate((b) => DATA.workerPayments.slice(b).map(({ id, ...r }) => ({ ...r, hasId: !!id })), before);
  }
  eq(M, EXPECT.modal, 'النافذة: الخانات والسقف والسجلات المخزّنة لكل نوع صرف');

  console.log('[4] سجل الصرف بعد الحفظ');
  eq({ workers: await view('workers', '', '2026-03-01', '2026-03-31'), sup: await view('supervisors', ''), emp: await view('employees', ''), q: await view('workers', '', '', '', 'مكافأة') }, EXPECT.after, 'السجل والكروت والأرصدة بعد الحفظ');

  console.log('[6] الحذف');
  await closeAll(); await view('workers', '');
  await page.click('#app .btn-del-pay[data-id="p2"]'); await page.waitForSelector('#appConfirmModal'); n = await saveCount(); await page.click('#appConfirmModal .btn-danger'); await waitSave(n);
  await view('employees', ''); await page.click('#app .btn-del-pay[data-id="k1"]'); await page.waitForSelector('#appConfirmModal'); n = await saveCount(); await page.click('#appConfirmModal .btn-danger'); await waitSave(n);
  eq(await page.evaluate(() => [DATA.workerPayments.some((p) => p.id === 'p2'), DATA.employeePenalties.some((p) => p.id === 'k1'), workerBalance('w1'), employeeBalance('e1')]), EXPECT.deleted, 'الحذف من السجل (الصرف وخصم الموظف)');

  eq(errors, [], 'no JS errors');
  await browser.close();
  if (process.env.PROBE) require('fs').writeFileSync(require('path').join(__dirname, 'phase83.expect.json'), JSON.stringify(probed, null, 1) + '\n');
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
