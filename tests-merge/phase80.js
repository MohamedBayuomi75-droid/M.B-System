// المرحلة 8 (الحزمة 8.4.4 — الإجازات): السيرفر (/api/v1/leaves) = الواجهة القديمة (DEC-0127).
//  [1] القايمة (filteredLeaves) لكل حالة فلتر، والكروت، واسم الشخص والفئة والنوع والحالة، والرصيد (employeeLeaveBalance) — السيرفر قدام الدوال القديمة نفسها
//  [2] الحفظ: صفحة الإجازات القديمة في نسخة A = الـ API في نسخة B — طلب جديد (والأيام من التاريخين)، وموافقة، ورفض، وتعديل (الحالة بتفضل)،
//      وحذف — ونفس الإجازات ونفس حالة الأشخاص بعد syncLeaveStatuses. وحدث leave.*، والتعارض
//  [3] حالة الشخص بتتغيّر **فورًا** بالموافقة في السيرفر (من غير فتح القديمة — د-2)، وبنفس نتيجة القديمة بعد الفتح
// بيشتغل في WEB_MODE=1 (وفوق الجداول). في وضع الملف بيعدّي.
const { openApp, WEB } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const P = (id, o) => Object.assign({ id, extraFields: [], attachments: [] }, o);
  const L = (id, o) => Object.assign({ id, personKind: 'employee', type: 'annual', status: 'pending', reason: '' }, o);
  const seed = {
    users: [baseUser], schemaVersion: 9,
    settings: { defaultLeaveDays: 21 },
    employees: [P('e1', { code: 'EMP-001', name: 'أحمد المحاسب', status: 'active', leaveBalance: 30, departmentId: '__core_employees__', categoryId: '__core_employees__' }),
      P('e2', { code: 'EMP-002', name: 'منى السكرتيرة', status: 'active', departmentId: '__core_employees__', categoryId: '__core_employees__' })],
    workers: [P('w1', { code: 'WRK-001', name: 'عامل أ', workerType: 'temporary', status: 'active', departmentId: '__core_workers_temp__', categoryId: '__core_workers_temp__' })],
    supervisors: [P('s1', { code: 'SUP-001', name: 'سامي المشرف', status: 'active', departmentId: '__core_supervisors__', categoryId: '__core_supervisors__' })],
    drivers: [P('d1', { code: 'DRV-001', name: 'أحمد السواق', status: 'active', departmentId: '__core_drivers__', categoryId: '__core_drivers__' })],
    leaves: [
      L('l1', { personId: 'e1', employeeId: 'e1', from: '2026-01-05', to: '2026-01-09', days: 5, status: 'approved', reason: 'سفر' }),
      L('l2', { personId: 'e1', employeeId: 'e1', from: '2025-12-29', to: '2026-01-02', days: 5, status: 'approved' }),
      L('l3', { personId: 'e1', employeeId: 'e1', type: 'sick', from: '2026-02-01', to: '2026-02-03', days: 3, status: 'approved' }),
      L('l4', { personId: 'e2', employeeId: 'e2', from: '2020-03-01', to: '2099-03-02', days: 2, status: 'pending', reason: 'ظروف' }),
      L('l5', { personKind: 'worker', personId: 'w1', employeeId: '', from: '2026-04-01', to: '2026-04-03', days: 3, status: 'approved' }),
      L('l6', { personKind: 'supervisor', personId: 's1', employeeId: '', from: '2026-03-01', to: '2026-03-02', days: 2, status: 'approved', type: 'emergency' }),
      L('l7', { personKind: 'driver', personId: 'd1', employeeId: '', from: '2026-03-10', to: '2026-03-01', days: 1, status: 'rejected' }),
      L('l8', { personKind: 'worker', personId: 'w9', employeeId: '', from: '2026-04-01', to: '2026-04-01', days: 1, status: 'approved' }),
    ],
  };
  const { browser, page, errors } = await openApp(seed);
  if (!WEB) { ok(true, 'وضع الملف: مقارنة السيرفر بتتعمل في WEB_MODE=1'); eq(errors, [], 'no JS errors'); await browser.close(); summary(); return; }
  const api = (pg, m, u, body, h) => pg.evaluate(async ([m, u, body, h]) => {
    const res = await fetch(u, { method: m, headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer ' + WebSession.token(), ...h }, body: body ? JSON.stringify(body) : undefined });
    let j = null; try { j = await res.json(); } catch (e) { /* */ } return { status: res.status, body: j };
  }, [m, u, body || null, h || {}]);
  const qs = (f) => Object.entries(f).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const key = () => ({ 'Idempotency-Key': 'lv-' + Math.random().toString(36).slice(2) });

  console.log('[1] السيرفر = الصفحة القديمة');
  const F = [{}, { personKind: 'employee' }, { personKind: 'worker' }, { personKind: 'driver' }, { employeeId: 'e1' }, { type: 'sick' }, { status: 'pending' }, { status: 'approved' },
    { from: '2026-01-01' }, { to: '2026-01-31' }, { from: '2026-01-01', to: '2026-02-28' }, { q: 'أحمد' }, { q: 'سفر' }, { q: 'سامي' }, { q: 'السواق' }, { personKind: 'employee', status: 'approved' }];
  const legacy = await page.evaluate((FS) => FS.map((f) => { Object.keys(leaveFilters).forEach((k) => { leaveFilters[k] = ''; }); Object.assign(leaveFilters, f);
    const rows = filteredLeaves(); const p = rows.filter((l) => l.status === 'pending').length, a = rows.filter((l) => l.status === 'approved').length, r = rows.filter((l) => l.status === 'rejected').length;
    return { ids: rows.map((l) => l.id), cards: { total: rows.length, pending: p, approved: a, rejected: r },
      cells: rows.map((l) => [leavePersonName(l), leaveKindLabel(l.personKind || 'employee'), labelOf(LEAVE_TYPES, l.type) || l.type || '', labelOf(LEAVE_STATUS, l.status || 'pending') || l.status]) }; }), F);
  for (let i = 0; i < F.length; i++) {
    const r = (await api(page, 'GET', '/api/v1/leaves?' + qs(F[i]))).body;
    eq({ ids: r.rows.map((l) => l.id), cards: r.cards, cells: r.rows.map((l) => [l.personName, l.kindLabel, l.typeLabel, l.statusLabel]) }, legacy[i], `القايمة ${JSON.stringify(F[i])}`);
  }
  const lBal = await page.evaluate(() => Object.fromEntries(DATA.employees.map((e) => [e.id, employeeLeaveBalance(e.id)])));
  eq((await api(page, 'GET', '/api/v1/leaves/balances')).body.balances, lBal, 'الرصيد لكل موظف (employeeLeaveBalance)');
  const fo = (await api(page, 'GET', '/api/v1/leaves/form-options')).body;
  eq(fo.types.map((x) => x.label), await page.evaluate(() => { openLeaveModal(); const o = [...document.getElementById('lvType').options].map((x) => x.textContent.trim()); closeModal(); return o; }), 'أنواع الإجازة بترتيب النافذة');
  await page.waitForTimeout(300);

  console.log('[2] الحفظ: صفحة الإجازات القديمة (A) = الـ API (B)');
  const B = await openApp(seed);
  const today = await page.evaluate(() => todayISO());
  const reload = async (pg) => { await pg.reload(); await pg.waitForFunction(() => typeof DATA !== 'undefined' && window.WebSync && WebSync._state.meta && Array.isArray(DATA.leaves) && DATA.leaves.length > 0, null, { timeout: 30000 }); await pg.waitForTimeout(500); };
  const saveCount = () => page.evaluate(() => window.__saveCount);
  const waitSave = async (n) => { await page.waitForFunction((x) => window.__saveCount > x, n, { timeout: 15000 }); await page.waitForTimeout(300); };
  const settle = async () => { await page.waitForSelector('#appModal:not(.modal-overlay-out) #btnSaveLv'); await page.waitForTimeout(250); };
  const closeAll = async () => { await page.evaluate(() => { try { closeModal(); } catch (e) { /* */ } }); await page.waitForTimeout(250); };
  const listPage = async () => { await closeAll(); await page.evaluate(() => { goToPage('leaves'); Object.keys(leaveFilters).forEach((k) => { leaveFilters[k] = ''; }); rerenderCurrentPage(); }); await page.waitForTimeout(250); };
  // A: طلب جديد لمشرف (الأيام من التاريخين — إجازة سارية النهارده)
  await listPage(); await page.evaluate(() => openLeaveModal()); await settle();
  await page.selectOption('#lvKind', 'supervisor'); await page.waitForTimeout(200);
  await page.evaluate(() => { document.getElementById('lvEmp').value = 's1'; });
  await page.fill('#lvFromD', '2020-05-03'); await page.dispatchEvent('#lvFromD', 'change');
  await page.fill('#lvToD', '2099-05-07'); await page.dispatchEvent('#lvToD', 'change');
  await page.selectOption('#lvType', 'sick'); await page.fill('#lvReason', ' عملية ');
  const daysA = await page.inputValue('#lvDays');
  let n = await saveCount(); await page.click('#btnSaveLv'); await waitSave(n);
  const newA = await page.evaluate(() => DATA.leaves.find((x) => x.from === '2020-05-03').id);
  // A: موافقة l4 والطلب الجديد، ورفض… (l4 موافقة، والجديد موافقة) — وتعديل l1، وحذف l7
  await listPage(); n = await saveCount(); await page.click('.btn-ok-lv[data-id="l4"]'); await waitSave(n);
  await listPage(); n = await saveCount(); await page.click(`.btn-ok-lv[data-id="${newA}"]`); await waitSave(n);
  await listPage(); await page.evaluate(() => openLeaveModal('l1')); await settle();
  await page.fill('#lvToD', '2026-01-12'); await page.dispatchEvent('#lvToD', 'change');
  n = await saveCount(); await page.click('#btnSaveLv'); await waitSave(n);
  await listPage(); await page.evaluate(() => { window.confirmDelete = () => Promise.resolve(true); });
  n = await saveCount(); await page.click('.btn-del-lv[data-id="l7"]'); await waitSave(n);
  // A: الطلب الجديد التاني (عامل) ← رفض
  await listPage(); await page.evaluate(() => openLeaveModal()); await settle();
  await page.selectOption('#lvKind', 'worker'); await page.waitForTimeout(200);
  await page.evaluate(() => { document.getElementById('lvEmp').value = 'w1'; });
  await page.fill('#lvFromD', '2026-06-01'); await page.dispatchEvent('#lvFromD', 'change');
  await page.fill('#lvToD', '2026-06-01'); await page.dispatchEvent('#lvToD', 'change');
  n = await saveCount(); await page.click('#btnSaveLv'); await waitSave(n);
  const newA2 = await page.evaluate(() => DATA.leaves.find((x) => x.from === '2026-06-01').id);
  await listPage(); n = await saveCount(); await page.click(`.btn-no-lv[data-id="${newA2}"]`); await waitSave(n);
  await closeAll();

  // B: نفس المدخلات بالـ API
  console.log('[3] الحالة فورًا من السيرفر');
  const p1 = await api(B.page, 'POST', '/api/v1/leaves', { personKind: 'supervisor', personId: 's1', type: 'sick', from: '2020-05-03', to: '2099-05-07', days: daysA, reason: ' عملية ' }, key());
  eq([p1.status, p1.body.status, String(p1.body.days)], [201, 'pending', daysA], 'POST طلب (قيد الانتظار، ونفس الأيام)');
  const get = async (id) => (await api(B.page, 'GET', `/api/v1/leaves/${id}`)).body;
  const act = async (id, what) => { for (let i = 0; ; i++) { const l = await get(id); const r = await api(B.page, 'POST', `/api/v1/leaves/${id}/${what}`, { rev: l.rev }, key()); if (r.status !== 409 || r.body.code === 'NOT_PENDING' || i >= 2) return r; await B.page.waitForTimeout(500); } };
  eq((await act('l4', 'approve')).status, 200, 'موافقة l4');
  eq((await act(p1.body.id, 'approve')).status, 200, 'موافقة الطلب الجديد');
  const sup = (await api(B.page, 'GET', '/api/v1/supervisors/s1')).body;
  eq([sup.status, sup.leaveAuto], ['on_leave', true], 'المشرف «في إجازة» فورًا بعد الموافقة (من غير فتح القديمة)');
  const l1 = await get('l1');
  eq((await api(B.page, 'PATCH', '/api/v1/leaves/l1', { rev: l1.rev, personKind: 'employee', personId: 'e1', type: 'annual', from: '2026-01-05', to: '2026-01-12', days: '', reason: 'سفر' })).status, 200, 'PATCH تعديل l1');
  const l7 = await get('l7');
  eq((await api(B.page, 'DELETE', `/api/v1/leaves/l7?rev=${l7.rev}`)).status, 200, 'DELETE l7');
  const p2 = await api(B.page, 'POST', '/api/v1/leaves', { personKind: 'worker', personId: 'w1', type: 'annual', from: '2026-06-01', to: '2026-06-01', days: '1', reason: '' }, key());
  eq((await act(p2.body.id, 'reject')).status, 200, 'رفض الطلب التاني');
  eq((await act(p2.body.id, 'approve')).body.code, 'NOT_PENDING', 'الموافقة على مرفوض ← مش معلّق');
  eq((await get(p1.body.id)).events.map((e) => e.type), ['leave.requested', 'leave.approved'], 'أحداث leave.*');
  const stale = await api(B.page, 'POST', `/api/v1/leaves/l3/approve`, { rev: 99 }, key());
  eq([stale.status, stale.body.code], [409, 'CONFLICT'], 'rev قديم ← تعارض صريح');

  await reload(page); await reload(B.page);
  const snapshot = (pg) => pg.evaluate(() => {
    const strip = (o) => JSON.parse(JSON.stringify(o, (k, v) => (/^_/.test(k) ? undefined : v)));
    const nid = (id) => (/^l\d$/.test(id) ? id : 'NEW');
    return strip({ leaves: (DATA.leaves || []).map(({ id, ...x }) => ({ ...x, id: nid(id) })).sort((a, b) => (a.from + a.id).localeCompare(b.from + b.id)),
      people: ['employees', 'workers', 'supervisors', 'drivers'].map((c) => (DATA[c] || []).map((p) => [p.id, p.status, p.leaveAuto === undefined ? null : p.leaveAuto])) });
  });
  const a = await snapshot(page), b = await snapshot(B.page);
  const kdiff = (x, y) => [...new Set([...Object.keys(x || {}), ...Object.keys(y || {})])].filter((k) => JSON.stringify((x || {})[k]) !== JSON.stringify((y || {})[k])).map((k) => [k, (x || {})[k], (y || {})[k]]);
  eq(b.leaves.length, a.leaves.length, 'نفس عدد الإجازات');
  a.leaves.forEach((l, i) => { const d = kdiff(b.leaves[i], l); ok(!d.length, `الإجازة ${l.id} (${l.from}): نفس السجل`, d); });
  eq(b.people, a.people, 'حالة الأشخاص (syncLeaveStatuses) في الاتنين');

  eq(B.errors, [], 'no JS errors (B)');
  await B.browser.close();
  eq(errors, [], 'no JS errors');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
