// شاشة المستحقات (8.6.5، DEC-0137): /app/worker-dues بتعرض نفس صفحة المستحقات القديمة — اللوحات، والأقسام، والجدول لكل نوع (الكروت والعناوين
// والصفوف)، وسجل الصرف والخصومات، ونافذة الصرف (الخانات والخيارات والقيم). والحفظ (يومية، وخصم، وبدلات) والسلفة (DEC-0132) والحذف من الجديدة.
// البيانات من غير تقريب في الأيام، فالحساب الجديد (DEC-0129) = القديم هنا (الفرق متغطّي في dues.e2e وphase84).
// التشغيل: node tests-web/dues-e2e.js   (محتاج build للسيرفر والواجهة الجديدة + PostgreSQL للاختبار)
'use strict';
const path = require('path');
const { openWebApp } = require(path.join(__dirname, '../tests-merge/harness'));
const { baseUser, eq, ok, summary } = require(path.join(__dirname, '../tests-merge/lib'));
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
      P('w1', { code: 'WRK-001', name: 'عامل أول', status: 'active', workerType: 'temporary', dailyWage: 300, supervisorId: 's1', departmentId: '__core_workers_temp__', categoryId: '__core_workers_temp__' }),
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
      W('a1', 'w1', { date: '2026-03-01', dayWage: 300, days: 1.5, project: 'مشروع الشروق' }),
      W('a2', 'w1', { date: '2026-03-02', status: 'half', dayWage: 300, project: 'مشروع الشروق' }),
      W('a3', 'w1', { date: '2026-03-03', status: 'late', dayWage: 300, deduction: 50, project: 'برج النيل' }),
      W('a4', 'w1', { date: '2026-03-04', status: 'absent', dayWage: 300, project: 'مشروع الشروق' }),
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
  const grabBoards = () => [...document.querySelectorAll('.board-grid .board-card')].map((b) => [b.getAttribute('data-dues-tab') || b.getAttribute('data-dues-dept'), (b.innerText || '').replace(/\s+/g, ' ').trim()]);
  const grabPage = () => {
    const t1 = (el) => (el ? (el.innerText || '').replace(/\s+/g, ' ').trim() : '');
    const root = document.querySelector('#pageContent .page, app-worker-dues .page');
    const tables = [...root.querySelectorAll('table.data-table')];
    return {
      title: t1(root.querySelector('.page-title')), sub: t1(root.querySelector('.page-sub')), back: t1(root.querySelector('#btnDuesBackDepts')),
      buttons: [...root.querySelectorAll('.btn-row > button')].map(t1),
      filters: [...root.querySelectorAll('.filters-bar input')].map((x) => [x.id, x.type, x.placeholder || '']),
      cards: [...root.querySelectorAll('.stats-row .stat-card')].map((c) => [t1(c), c.classList.contains('debt')]),
      tables: tables.map((t) => ({ head: [...t.querySelectorAll('thead th')].map(t1), rows: [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map(t1)) })),
      section: t1(root.querySelector('.section-title')),
      pagers: [...root.querySelectorAll('.table-pager')].map((p) => [p.getAttribute('data-pager'), t1(p.querySelector('span'))]),
    };
  };
  const modalOf = () => {
    const m = document.getElementById('appModal');
    const vis = (el) => el && el.offsetParent !== null && getComputedStyle(el).display !== 'none';
    const opts = (id) => (document.getElementById(id) && document.getElementById(id).tagName === 'SELECT' && vis(document.getElementById(id)) ? [...document.getElementById(id).options].map((o) => o.textContent.trim()) : null);
    const v = (id) => { const el = document.getElementById(id); return el && (vis(el) || el.type === 'hidden') ? String(el.value) : null; };
    return {
      title: m.querySelector('.modal-header h3').textContent.trim(),
      labels: (() => { const all = [...m.querySelectorAll('.modal-body label')].filter(vis); const parents = [...new Set(all.map((l) => l.parentElement))]; return all.map((l, i) => [l, parents.indexOf(l.parentElement), Number(getComputedStyle(l).order) || 0, i]).sort((x, y) => x[1] - y[1] || x[2] - y[2] || x[3] - y[3]).map((x) => x[0]); })().map((l) => { const c = l.cloneNode(true); c.querySelectorAll('input,select,textarea,div,button,a').forEach((n) => n.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); }),
      options: { upType: opts('upType'), upPayKind: opts('upPayKind'), upScope: opts('upScope') },
      values: { upType: v('upType'), upPerson: document.getElementById('upPerson') ? document.getElementById('upPerson').value : null, upPayKind: v('upPayKind'), upSalary: v('upSalary'), upScope: v('upScope') },
      lines: [...m.querySelectorAll('.up-line')].filter(vis).map((r) => [r.querySelector('.up-item').value, r.querySelector('.up-amt').value]),
      hint: vis(document.getElementById('upSalaryCapHint')) ? document.getElementById('upSalaryCapHint').textContent.replace(/\s+/g, ' ').trim() : '',
      scopeHint: vis(document.getElementById('upScopeHint')) ? document.getElementById('upScopeHint').textContent.trim() : '',
      bonuses: [...m.querySelectorAll('.up-bonus-chk')].map((c) => [c.getAttribute('data-bonus-id'), c.checked]),
      sections: [...m.querySelectorAll('.section-title')].filter(vis).map((s) => (s.querySelector('span') || s).textContent.trim()),
      footer: [...m.querySelectorAll('.modal-footer button')].map((b) => b.textContent.trim()),
    };
  };
  const { browser, page, base: url, errors } = await openWebApp(seed);
  const settle = (ms = 400) => page.waitForTimeout(ms);
  const legacy = async (tab, dept, fn) => { await page.evaluate(([tab, dept]) => { try { closeModal(); } catch (e) { /* */ } goToPage('workerDues'); window.__duesTab = tab; window.__duesDept = dept === null ? undefined : dept; window.__duesWorkerQ = ''; workerAttFilters.from = ''; workerAttFilters.to = ''; rerenderCurrentPage(); }, [tab, dept]); await settle(); return page.evaluate(fn); };

  // ---------- القديمة
  /** غلطتين في applyFormLayout القديمة مش منقولين (DUES_ACCEPTANCE §3): (1) بند «items» (#upLines) مالوش label، فاسمه بيتكتب على أول
   *  عنوان في النافذة — «النوع» بيبقى «بنود اليوميات / الإضافات» في الخصم، و«نوع المستحق» (#upPayKind المخفي) في البدلات؛ (2) بيرجّع إظهار
   *  صندوق «بنود الإضافات والمكافآت» الفاضي في نافذة اليومية. */
  const fixLegacy = (m) => ({ ...m, labels: m.labels.map((l, i) => (i === 0 && (l === 'بنود اليوميات / الإضافات' || l === 'نوع المستحق') ? 'النوع' : l)),
    sections: m.sections.filter((x) => !(x === 'بنود الإضافات والمكافآت (تسجيل مستحق)' && m.title !== 'بدلات ومكافآت')), values: { ...m.values, upPayKind: m.title === 'بدلات ومكافآت' ? null : m.values.upPayKind } });
  const L = { kinds: await legacy('', null, grabBoards), depts: await legacy('workers', null, grabBoards), pages: {}, modals: [] };
  const TABS = ['workers', 'supervisors', 'drivers', 'employees'];
  for (const tab of TABS) L.pages[tab] = await legacy(tab, '', grabPage);
  L.pages.temp = await legacy('workers', '__core_workers_temp__', grabPage);
  const MODALS = [['workers', '#btnAddWPay'], ['workers', '.btn-pay-wrk[data-id="w1"]'], ['employees', '.btn-pay-emp[data-id="e1"]'], ['workers', '#btnAddWExtras'], ['workers', '.btn-pen-wrk[data-id="w2"]'], ['supervisors', '.btn-pay-sup[data-id="s1"]']];
  for (const [tab, sel] of MODALS) { await legacy(tab, '', () => 0); await page.click(`#pageContent ${sel}`); await page.waitForSelector('#appModal #btnSaveUp'); await settle(500); L.modals.push(fixLegacy(await page.evaluate(modalOf))); }
  // دفع إضافات مستحقة لـ w2
  await legacy('workers', '', () => 0); await page.click('#pageContent .btn-pay-wrk[data-id="w2"]'); await page.waitForSelector('#appModal #btnSaveUp'); await page.selectOption('#upPayKind', 'extras'); await settle(400);
  L.extrasPay = fixLegacy(await page.evaluate(modalOf));
  await page.evaluate(() => { try { closeModal(); } catch (e) { /* */ } });

  // ---------- الجديدة
  const tableResp = () => page.waitForResponse((r) => /\/api\/v1\/dues\/table/.test(r.url()));
  const openTab = async (tab, dept) => {
    await page.goto(url + '/app/worker-dues'); await page.waitForSelector('#duesKinds .board-card');
    await page.click(`[data-dues-tab="${tab}"]`); await page.waitForSelector('#duesDepts .board-card');
    const r = tableResp(); await page.click(`[data-dues-dept="${dept}"]`); await r; await settle(300);
  };
  console.log('[اللوحات]');
  await page.goto(url + '/app/worker-dues'); await page.waitForSelector('#duesKinds .board-card'); await settle(200);
  eq(await page.evaluate(grabBoards), L.kinds, 'لوحات الأنواع (والمعدات ← الشاشة الكاملة)');
  await page.click('[data-dues-tab="workers"]'); await page.waitForSelector('#duesDepts .board-card'); await settle(200);
  eq(await page.evaluate(grabBoards), L.depts, 'لوحات أقسام العمال');
  console.log('[الجداول] نفس الكروت والعناوين والصفوف والسجل');
  for (const tab of TABS) { await openTab(tab, ''); eq(await page.evaluate(grabPage), L.pages[tab], `${tab}: نفس الصفحة`); }
  await openTab('workers', '__core_workers_temp__'); eq(await page.evaluate(grabPage), L.pages.temp, 'العمال — قسم: نفس الصفحة');

  console.log('[النافذة] نفس الخانات والخيارات والقيم');
  const NEWSEL = { '#btnAddWPay': '#btnAddWPay', '#btnAddWExtras': '#btnAddWExtras' };
  for (const [i, [tab, sel]] of MODALS.entries()) {
    await openTab(tab, '');
    const s = NEWSEL[sel] || (sel.includes('btn-pen') ? `.btn-pen-row[data-id="${sel.match(/data-id="(\w+)"/)[1]}"]` : `.btn-pay-row[data-id="${sel.match(/data-id="(\w+)"/)[1]}"]`);
    await page.click(s); await page.waitForSelector('#appModal #btnSaveUp'); await settle(700);
    eq(await page.evaluate(modalOf), L.modals[i], `${tab} ${sel}: نفس النافذة`);
  }
  await openTab('workers', ''); await page.click('.btn-pay-row[data-id="w2"]'); await page.waitForSelector('#appModal #btnSaveUp'); await settle(500); await page.selectOption('#upPayKind', 'extras'); await settle(400);
  eq(await page.evaluate(modalOf), L.extrasPay, 'دفع الإضافات المستحقة: نفس النافذة');

  console.log('[الحفظ من الشاشة الجديدة]');
  const after = async (re, method, fn) => { const [r] = await Promise.all([page.waitForResponse((x) => re.test(x.url()) && x.request().method() === method), fn()]); return r.status(); };
  await page.click('.up-bonus-chk'); await page.click('.up-bonus-chk'); // اختيار وإلغاء وإعادة: متعلّم
  eq(await after(/\/api\/v1\/dues\/pay$/, 'POST', () => page.click('#btnSaveUp')), 201, 'دفع الإضافات المستحقة');
  await settle(400);
  await page.click('.btn-pen-row[data-id="w2"]'); await page.waitForSelector('#appModal #btnSaveUp'); await settle(400);
  await page.locator('#upLines .up-line .up-item').first().fill('غياب'); await page.locator('#upLines .up-line .up-amt').first().fill('80');
  eq(await after(/\/api\/v1\/dues\/pay$/, 'POST', () => page.click('#btnSaveUp')), 201, 'خصم');
  await settle(400);
  await page.click('#btnAddWExtras'); await page.waitForSelector('#appModal #btnSaveUp'); await settle(300);
  await page.selectOption('#upPerson', 'w1'); await settle(400);
  await page.locator('.up-line .up-amt').first().fill('120');
  eq(await after(/\/api\/v1\/dues\/pay$/, 'POST', () => page.click('#btnSaveUp')), 201, 'بدلات ومكافآت (مستحق)');
  await settle(400);
  // فوق المتبقي ← سؤال السلفة ← تسجيل كسلفة
  await page.click('.btn-pay-row[data-id="w1"]'); await page.waitForSelector('#appModal #btnSaveUp'); await settle(500);
  await page.locator('#upDailyLines .up-line .up-amt').first().fill('9000');
  eq(await after(/\/api\/v1\/dues\/pay$/, 'POST', () => page.click('#btnSaveUp')), 409, 'فوق المتبقي: مرفوض من غير سلفة');
  await page.waitForSelector('#btnConfirmAdvance');
  ok(/سلفة/.test(await page.innerText('#advanceMsg')), 'سؤال السلفة ظاهر');
  eq(await after(/\/api\/v1\/dues\/pay$/, 'POST', () => page.click('#btnConfirmAdvance')), 201, 'تسجيل كسلفة');
  await settle(500);
  ok(await page.evaluate(() => [...document.querySelectorAll('#duesLog tbody tr')].some((tr) => /سلفة/.test(tr.innerText) && /٩٬٠٠٠/.test(tr.innerText))), 'السلفة متعلّمة في السجل');
  await page.click('#duesLog .btn-del-pay[data-id="p2"]'); await page.waitForSelector('#appConfirmModal #btnConfirmDel');
  eq(await after(/\/api\/v1\/dues\/pay\/p2/, 'DELETE', () => page.click('#btnConfirmDel')), 200, 'حذف من السجل');
  await settle(400);
  ok(await page.evaluate(() => !document.querySelector('#duesLog .btn-del-pay[data-id="p2"]')), 'السجل اتحدّث');
  eq(errors, [], 'من غير أخطاء');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
