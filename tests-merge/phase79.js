// المرحلة 8 (الحزمة 8.4 — الإجازات): اختبارات قبول للواجهة القديمة (DEC-0086، DEC-0127).
// القيم المتوقعة = السلوك الحالي (LEGACY-PRESERVE) — ناتج الواجهة القديمة نفسها (phase79.expect.json، اتراجع؛ يتولّد تاني بـ PROBE=1):
//  [1] القايمة (filteredLeaves): الفئة، والشخص، والنوع، والحالة، ومن / إلى، والبحث، والترتيب بتاريخ البداية الأحدث
//  [2] الكروت والجدول (الاسم، والفئة، والنوع، والتواريخ، والأيام، والحالة، والسبب، والأزرار — ✓/✗ للمعلّق بس)
//  [3] حساب الأيام (calcLeaveDays): نفس اليوم، والمدى، والعكس، ومن غير الجمعة لو الإعداد مفعّل
//  [4] النافذة — طلب جديد: الافتراضي (موظف، وسنوية، والنهارده، ويوم واحد)، والأيام من التاريخين، والحفظ «قيد الانتظار»
//  [5] الموافقة والرفض، والتعديل (الحالة بتفضل)، والحذف
//  [6] syncLeaveStatuses لكل الأنواع: بداية الإجازة ← «في إجازة» (leaveAuto)، ونهايتها ← «نشط»، و«في إجازة» يدوي مابيتغيّرش
//  [7] الرصيد (employeeLeaveUsed / employeeLeaveBalance): السنوية المعتمدة بس، والإجازة اللي بتعدّي رأس السنة، والافتراضي من الإعدادات
//  [8] «فحص البيانات» (cleanupOrphanDataRecords) — بعد تصليح DEC-0127 د-4: إجازات العمال والمشرفين والسواقين بتفضل، واليتيمة بتتمسح
// بيشتغل في وضع الملف والويب (WEB_MODE=1) وفوق الجداول.
const { openApp } = require('./harness');
const lib = require('./lib');
const { ok, summary, baseUser } = lib;
const probed = {};
const eq = (a, b, name) => { if (typeof b === 'string' && b.startsWith('__probe_')) { probed[b.slice(8)] = a; return; } lib.eq(a, b, name); };
(async () => {
  const P = (id, o) => Object.assign({ id, extraFields: [], attachments: [] }, o);
  const L = (id, o) => Object.assign({ id, personKind: 'employee', type: 'annual', status: 'pending', reason: '' }, o);
  const seed = {
    users: [baseUser], schemaVersion: 9,
    settings: { defaultLeaveDays: 21 },
    employees: [P('e1', { code: 'EMP-001', name: 'أحمد المحاسب', status: 'active', leaveBalance: 30, departmentId: '__core_employees__' }),
      P('e2', { code: 'EMP-002', name: 'منى السكرتيرة', status: 'active', departmentId: '__core_employees__' }),
      P('e3', { code: 'EMP-003', name: 'سامح إجازة يدوي', status: 'on_leave', departmentId: '__core_employees__' })],
    workers: [P('w1', { code: 'WRK-001', name: 'عامل أ', workerType: 'temporary', status: 'active' }), P('w2', { code: 'WRK-002', name: 'عامل رجع', workerType: 'temporary', status: 'on_leave', leaveAuto: true })],
    supervisors: [P('s1', { code: 'SUP-001', name: 'سامي المشرف', status: 'active' })],
    drivers: [P('d1', { code: 'DRV-001', name: 'أحمد السواق', status: 'active' })],
    leaves: [
      L('l1', { personId: 'e1', employeeId: 'e1', from: '2026-01-05', to: '2026-01-09', days: 5, status: 'approved', reason: 'سفر' }),
      L('l2', { personId: 'e1', employeeId: 'e1', from: '2025-12-29', to: '2026-01-02', days: 5, status: 'approved' }),
      L('l3', { personId: 'e1', employeeId: 'e1', type: 'sick', from: '2026-02-01', to: '2026-02-03', days: 3, status: 'approved' }),
      L('l4', { personId: 'e2', employeeId: 'e2', from: '2026-03-01', to: '2026-03-02', days: 2, status: 'pending', reason: 'ظروف' }),
      L('l5', { personKind: 'worker', personId: 'w1', employeeId: '', from: '2020-01-01', to: '2099-01-01', days: 3, status: 'approved' }),
      L('l6', { personKind: 'supervisor', personId: 's1', employeeId: '', from: '2020-01-01', to: '2099-01-01', days: 2, status: 'approved', type: 'emergency' }),
      L('l7', { personKind: 'driver', personId: 'd1', employeeId: '', from: '2020-01-01', to: '2099-01-01', days: 1, status: 'rejected' }),
      L('l8', { personKind: 'worker', personId: 'w9', employeeId: '', from: '2026-04-01', to: '2026-04-01', days: 1, status: 'approved' }),
    ],
  };
  const EXPECT = process.env.PROBE ? new Proxy({}, { get: (_, k) => '__probe_' + String(k) }) : require('./phase79.expect.json');
  const { browser, page, errors } = await openApp(seed);
  const closeAll = async () => { await page.evaluate(() => { try { closeSubModal(); } catch (e) { /* */ } try { closeModal(); } catch (e) { /* */ } }); await page.waitForTimeout(250); };
  const settle = async () => { await page.waitForSelector('#appModal:not(.modal-overlay-out) #btnSaveLv'); await page.waitForTimeout(250); };
  const saveCount = () => page.evaluate(() => window.__saveCount);
  const waitSave = async (n) => { await page.waitForFunction((x) => window.__saveCount > x, n, { timeout: 15000 }); await page.waitForTimeout(250); };

  console.log('[1] القايمة');
  const F = [{}, { personKind: 'employee' }, { personKind: 'worker' }, { personKind: 'driver' }, { employeeId: 'e1' }, { type: 'sick' }, { status: 'pending' }, { status: 'approved' },
    { from: '2026-01-01' }, { to: '2026-01-31' }, { from: '2026-01-01', to: '2026-02-28' }, { q: 'أحمد' }, { q: 'سفر' }, { q: 'سامي' }];
  const lists = await page.evaluate((FS) => FS.map((f) => { Object.keys(leaveFilters).forEach((k) => { leaveFilters[k] = ''; }); Object.assign(leaveFilters, f); return filteredLeaves().map((l) => l.id); }), F);
  eq(lists, EXPECT.lists, 'filteredLeaves لكل حالة');

  console.log('[2] الكروت والجدول');
  const view = await page.evaluate(() => { goToPage('leaves'); Object.keys(leaveFilters).forEach((k) => { leaveFilters[k] = ''; }); rerenderCurrentPage();
    return { cards: [...document.querySelectorAll('#app .stats-row .stat-card')].map((c) => c.innerText.replace(/\s+/g, ' ').trim()),
      head: [...document.querySelectorAll('#app table.data-table thead th')].map((th) => th.innerText.trim()),
      rows: [...document.querySelectorAll('#app table.data-table tbody tr')].map((tr) => [...tr.children].map((td, i, all) => (i === all.length - 1 ? [...td.querySelectorAll('button')].map((b) => b.className.match(/btn-(ok|no|print|edit|del)-lv/)[1]).join(',') : td.innerText.replace(/\s+/g, ' ').trim()))),
      filters: [...document.querySelectorAll('#app .filters-bar select, #app .filters-bar input')].map((x) => [x.id, x.tagName === 'SELECT' ? [...x.options].map((o) => o.textContent.trim()) : x.type]) }; });
  eq(view, EXPECT.view, 'الكروت والفلاتر والجدول');

  console.log('[3] حساب الأيام');
  const D = [['2026-01-05', '2026-01-05'], ['2026-01-05', '2026-01-09'], ['2026-01-09', '2026-01-05'], ['', '2026-01-05'], ['2025-12-29', '2026-01-02'], ['2026-01-01', '2026-01-31']];
  const days = await page.evaluate((D) => { const a = D.map(([f, t]) => calcLeaveDays(f, t)); DATA.settings.leaveExcludeFridays = true; const b = D.map(([f, t]) => calcLeaveDays(f, t)); DATA.settings.leaveExcludeFridays = false; return [a, b]; }, D);
  eq(days, EXPECT.days, 'calcLeaveDays (عادي، ومن غير الجمعة)');

  console.log('[4] النافذة — طلب جديد');
  await closeAll(); await page.evaluate(() => { goToPage('leaves'); openLeaveModal(); }); await settle();
  const today = await page.evaluate(() => todayISO());
  eq([await page.inputValue('#lvKind'), await page.inputValue('#lvType'), await page.inputValue('#lvFromD') === today, await page.inputValue('#lvToD') === today, await page.inputValue('#lvDays')],
    ['employee', 'annual', true, true, '1'], 'الافتراضي: موظف، وسنوية، والنهارده، ويوم واحد');
  eq(await page.evaluate(() => [...document.querySelectorAll('#appModal .modal-body label')].map((l) => { const c = l.cloneNode(true); c.querySelectorAll('input,select,textarea,div').forEach((n) => n.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); })), EXPECT.labels, 'خانات النافذة');
  eq(await page.evaluate(() => Object.fromEntries(['lvKind', 'lvType', 'lvDept'].map((id) => [id, [...document.getElementById(id).options].map((o) => o.textContent.trim())]))), EXPECT.options, 'خيارات القوايم');
  await page.selectOption('#lvKind', 'supervisor'); await page.waitForTimeout(200);
  await page.evaluate(() => { document.getElementById('lvEmp').value = 's1'; });
  await page.fill('#lvFromD', '2026-05-03'); await page.dispatchEvent('#lvFromD', 'change');
  await page.fill('#lvToD', '2026-05-07'); await page.dispatchEvent('#lvToD', 'change');
  eq(await page.inputValue('#lvDays'), '5', 'الأيام من التاريخين');
  await page.selectOption('#lvType', 'sick'); await page.fill('#lvReason', ' عملية ');
  let n = await saveCount(); await page.click('#btnSaveLv'); await waitSave(n);
  const added = await page.evaluate(() => { const l = DATA.leaves.find((x) => x.from === '2026-05-03'); const { id, ...r } = l; return { ...r, hasId: !!id }; });
  eq(added, EXPECT.added, 'الطلب الجديد (قيد الانتظار، والسبب من غير مسافات، وemployeeId فاضي لغير الموظف)');

  console.log('[5] الموافقة والرفض والتعديل والحذف');
  await closeAll(); await page.evaluate(() => { goToPage('leaves'); Object.keys(leaveFilters).forEach((k) => { leaveFilters[k] = ''; }); rerenderCurrentPage(); }); await page.waitForTimeout(200);
  n = await saveCount(); await page.click('.btn-ok-lv[data-id="l4"]'); await waitSave(n);
  const newId = await page.evaluate(() => DATA.leaves.find((x) => x.from === '2026-05-03').id);
  n = await saveCount(); await page.click(`.btn-no-lv[data-id="${newId}"]`); await waitSave(n);
  eq(await page.evaluate((id) => [DATA.leaves.find((x) => x.id === 'l4').status, DATA.leaves.find((x) => x.id === id).status], newId), ['approved', 'rejected'], 'الموافقة والرفض');
  await page.evaluate(() => openLeaveModal('l1')); await settle();
  eq([await page.inputValue('#lvKind'), await page.evaluate(() => document.getElementById('lvEmp').value), await page.inputValue('#lvDays')], ['employee', 'e1', '5'], 'التعديل بيفتح بقيم السجل');
  await page.fill('#lvToD', '2026-01-12'); await page.dispatchEvent('#lvToD', 'change');
  n = await saveCount(); await page.click('#btnSaveLv'); await waitSave(n);
  eq(await page.evaluate(() => { const l = DATA.leaves.find((x) => x.id === 'l1'); return [l.status, l.to, l.days, l.employeeId]; }), EXPECT.edited, 'التعديل: الحالة بتفضل معتمدة، والأيام اتحسبت');
  await page.evaluate(() => { window.confirmDelete = () => Promise.resolve(true); });
  n = await saveCount(); await page.click('.btn-del-lv[data-id="l7"]'); await waitSave(n);
  ok(await page.evaluate(() => !DATA.leaves.some((x) => x.id === 'l7')), 'الحذف');

  console.log('[6] syncLeaveStatuses');
  const st = await page.evaluate(() => { syncLeaveStatuses(); const g = (c, id) => { const p = DATA[c].find((x) => x.id === id); return [p.status, p.leaveAuto === undefined ? 'undefined' : p.leaveAuto]; };
    return { e1: g('employees', 'e1'), e2: g('employees', 'e2'), e3: g('employees', 'e3'), w1: g('workers', 'w1'), w2: g('workers', 'w2'), s1: g('supervisors', 's1'), d1: g('drivers', 'd1') }; });
  eq(st, EXPECT.statuses, 'الحالة لكل الأنواع');

  console.log('[7] الرصيد');
  // بسنة محددة (2025 و2026) علشان الاختبار مايتغيّرش بتغيّر السنة، والرصيد = (leaveBalance أو الافتراضي) − المستخدم في السنة الحالية
  const bal = await page.evaluate(() => ({ e1: [employeeLeaveUsed('e1', 2026), employeeLeaveUsed('e1', 2025)], e2: [employeeLeaveUsed('e2', 2026), employeeLeaveUsed('e2', 2025)], e3: employeeLeaveUsed('e3', 2026),
    formula: ['e1', 'e2', 'e3'].every((id) => { const e = DATA.employees.find((x) => x.id === id); return employeeLeaveBalance(id) === Math.round(((e.leaveBalance != null ? e.leaveBalance : 21) - employeeLeaveUsed(id)) * 100) / 100; }) }));
  eq(bal, EXPECT.balance, 'employeeLeaveUsed (السنوية المعتمدة، والمقسومة على السنتين) والرصيد');

  console.log('[8] «فحص البيانات» (د-4)');
  const removed = await page.evaluate(() => { const before = DATA.leaves.map((l) => l.id); cleanupOrphanDataRecords(); const after = DATA.leaves.map((l) => l.id); return before.filter((x) => !after.includes(x)); });
  eq(removed, ['l8'], 'بيمسح الإجازة اليتيمة بس (عامل مش موجود)، وإجازات العمال والمشرفين والسواقين بتفضل');

  eq(errors, [], 'no JS errors');
  await browser.close();
  if (process.env.PROBE) require('fs').writeFileSync(require('path').join(__dirname, 'phase79.expect.json'), JSON.stringify(probed, null, 1) + '\n');
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
