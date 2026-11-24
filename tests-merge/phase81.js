// المرحلة 8 (الحزمة 8.5 — اليوميات والحضور): اختبارات قبول للواجهة القديمة (DEC-0086، DEC-0135).
// القيم المتوقعة = السلوك الحالي (LEGACY-PRESERVE) — ناتج الواجهة القديمة نفسها (phase81.expect.json، اتراجع؛ يتولّد تاني بـ PROBE=1):
//  [1] التعديل وقت التحميل (normalizeAttendanceRecord): يومية ناقصها personType/personId
//  [2] اللوحات: الأنواع (العدد والأقسام) والأقسام للعمال
//  [3] قايمة الأشخاص في الجدول (wattPeopleList) بالفلاتر: المشرف، والبحث، والمشروع، والموقع
//  [4] الجدول الشهري لفترة ثابتة: الكروت الأربعة، والعناوين، وكل خلية (العلامة واللون والعنوان)، وإجمالي الأيام — للعمال والمشرفين
//  [5] دوال الحساب القديمة (المرجع اللي تقرير الفرق بيتقاس منه): isPayableAttendance، وattendanceDaysCredit، وattendanceDayWage، وattendanceNetPay
//  [6] نافذة اليومية: الافتراضي (الأجر من الشخص، ويوم، وحاضر)، والمعاينة، ونصف يوم ← 0.5، والمتأخر ← خانة الخصم، والموقع التاني في نفس اليوم
//      (الأيام المقترحة)، والحفظ (السجل المخزّن بالظبط)، والتعديل، والتحقق (المشروع إلزامي)
//  [7] نافذة مواقع اليوم الواحد، وقايمة السجلات، والحذف
//  [8] حضور الموظفين: القايمة بالفلاتر، والكروت، والجدول، والنافذة (الحفظ)
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
  const seed = {
    users: [baseUser], schemaVersion: 9,
    projects: [{ id: 'pA', code: 'PRJ-001', name: 'مشروع الشروق', status: 'active' }, { id: 'pB', code: 'PRJ-002', name: 'برج النيل', status: 'active' }],
    supervisors: [P('s1', { code: 'SUP-001', name: 'سامي المشرف', status: 'active', dailyWage: 400, departmentId: '__core_supervisors__', categoryId: '__core_supervisors__' }),
      P('s2', { code: 'SUP-002', name: 'كريم موقوف', status: 'inactive', dailyWage: 300 })],
    workers: [
      P('w1', { code: 'WRK-001', name: 'عامل أول', status: 'active', workerType: 'temporary', dailyWage: 333.33, supervisorId: 's1', project: 'مشروع الشروق', departmentId: '__core_workers_temp__', categoryId: '__core_workers_temp__' }),
      P('w2', { code: 'WRK-002', name: 'بدر الشركة', status: 'active', workerType: 'company', dailyWage: 250, departmentId: '__core_workers_perm__', categoryId: '__core_workers_perm__' }),
      P('w3', { code: 'WRK-003', name: 'مستقيل', status: 'resigned', workerType: 'temporary', dailyWage: 200 }),
    ],
    drivers: [P('d1', { code: 'DRV-001', name: 'أحمد السواق', status: 'active', dailyWage: 280, departmentId: '__core_drivers__', categoryId: '__core_drivers__' })],
    employees: [P('e1', { code: 'EMP-001', name: 'أحمد المحاسب', status: 'active', departmentId: '__core_employees__', categoryId: '__core_employees__' }),
      P('e2', { code: 'EMP-002', name: 'منى', status: 'active', departmentId: 'dX', categoryId: 'dX' })],
    departments: [{ id: 'dX', name: 'الحسابات', kind: 'employees' }],
    workerAttendance: [
      W('a1', 'w1', { date: '2026-03-01', dayWage: 333.33, days: 1.5, project: 'مشروع الشروق', site: 'الموقع أ' }),
      W('a2', 'w1', { date: '2026-03-02', status: 'half', days: 1, dayWage: 333.33, project: 'مشروع الشروق' }),
      W('a3', 'w1', { date: '2026-03-03', status: 'late', dayWage: 333.33, deduction: 50, project: 'مشروع الشروق' }),
      W('a4', 'w1', { date: '2026-03-04', status: 'absent', dayWage: 333.33, project: 'مشروع الشروق' }),
      W('a5', 'w1', { date: '2026-03-05', dayWage: 333.33, project: 'مشروع الشروق', site: 'الموقع أ' }),
      W('a6', 'w1', { date: '2026-03-05', dayWage: 333.33, days: 0.5, project: 'برج النيل', site: 'الموقع ب' }),
      W('a7', 'w2', { date: '2026-03-01', project: 'برج النيل', days: 2 }), // من غير أجر محفوظ ← أجر الشخص الحالي
      W('a8', 'w2', { date: '2026-03-02', status: 'overtime', dayWage: 250, project: 'برج النيل' }), // حالة مش معروفة
      W('a9', 'w2', { date: '2026-03-03', dayWage: 300, deduction: 400, status: 'late', project: 'برج النيل' }),
      W('a10', 'w2', { date: '2026-03-06', status: 'holiday', dayWage: 250, project: 'برج النيل' }),
      A('b1', { personType: 'supervisor', personKind: 'supervisor', personId: 's1', supervisorId: 's1', workerId: '', date: '2026-03-01', dayWage: 400, project: 'مشروع الشروق' }),
      A('c1', { personType: 'driver', personKind: 'driver', personId: 'd1', driverId: 'd1', workerId: '', supervisorId: '', date: '2026-03-02', dayWage: 280, project: 'برج النيل' }),
      A('x1', { workerId: 'w2', date: '2026-03-07', dayWage: 250, project: 'برج النيل' }), // قديم ناقصه personType/personId (normalizeAttendanceRecord)
    ],
    attendance: [
      { id: 't1', employeeId: 'e1', date: '2026-03-01', status: 'present', checkIn: '08:00', checkOut: '16:00', notes: 'تمام' },
      { id: 't2', employeeId: 'e2', date: '2026-03-02', status: 'late', checkIn: '09:30', checkOut: '', notes: '' },
      { id: 't3', employeeId: 'e1', date: '2026-02-20', status: 'absent', notes: 'مرض' },
    ],
  };
  const EXPECT = process.env.PROBE ? new Proxy({}, { get: (_, k) => '__probe_' + String(k) }) : require('./phase81.expect.json');
  const { browser, page, errors } = await openApp(seed);
  const closeAll = async () => { await page.evaluate(() => { try { closeSubModal(); } catch (e) { /* */ } try { closeModal(); } catch (e) { /* */ } }); await page.waitForTimeout(250); };
  const saveCount = () => page.evaluate(() => window.__saveCount);
  const waitSave = async (n) => { await page.waitForFunction((x) => window.__saveCount > x, n, { timeout: 15000 }); await page.waitForTimeout(250); };
  const grid = (tab) => page.evaluate((tab) => {
    goToPage('workerAttendance'); Object.assign(workerAttFilters, { dailiesTab: tab, dailiesDept: '', dFrom: '2026-03-01', dTo: '2026-03-07', q: '', project: '', site: '', status: '', supervisorId: '', listView: false });
    workerAttFilters.personType = tab === 'workers' ? 'worker' : tab === 'supervisors' ? 'supervisor' : 'driver'; rerenderCurrentPage();
    const t = document.querySelector('#app table.watt-grid');
    return { cards: [...document.querySelectorAll('#app .sc-row .sc-card')].map((c) => c.innerText.replace(/\s+/g, ' ').trim()),
      head: [...t.querySelectorAll('thead th')].map((th) => th.innerText.replace(/\s+/g, ' ').trim()),
      rows: [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((td) => { const b = td.querySelector('button.watt-cell'); return b ? [b.textContent.trim(), b.getAttribute('title') || '', b.style.color || '', td.style.background ? 'multi' : ''] : td.innerText.replace(/\s+/g, ' ').trim(); })),
      filters: [...document.querySelectorAll('#app .dly-filters select, #app .dly-filters input')].map((x) => [x.id, x.tagName === 'SELECT' ? [...x.options].map((o) => o.textContent.trim()) : x.type]) };
  }, tab);

  console.log('[1] التعديل وقت التحميل');
  eq(await page.evaluate(() => { const a = DATA.workerAttendance.find((x) => x.id === 'x1'); return [a.personType, a.personKind, a.personId, a.workerId]; }), ['worker', 'worker', 'w2', 'w2'], 'normalizeAttendanceRecord بيكمّل النوع والشخص');

  console.log('[2] اللوحات');
  const boards = await page.evaluate(() => { goToPage('workerAttendance'); workerAttFilters.dailiesTab = ''; workerAttFilters.dailiesDept = undefined; rerenderCurrentPage();
    const k = [...document.querySelectorAll('#app .dailies-kind-board')].map((b) => [b.getAttribute('data-dailies-tab'), b.innerText.replace(/\s+/g, ' ').trim()]);
    workerAttFilters.dailiesTab = 'workers'; rerenderCurrentPage();
    const d = [...document.querySelectorAll('#app .dailies-dept-board')].map((b) => [b.getAttribute('data-dailies-dept'), b.innerText.replace(/\s+/g, ' ').trim()]);
    return { kinds: k, depts: d }; });
  eq(boards, EXPECT.boards, 'لوحات الأنواع والأقسام');

  console.log('[3] قايمة الأشخاص');
  const PF = [{}, { supervisorId: 's1' }, { q: 'بدر' }, { project: 'برج النيل' }, { site: 'الموقع ب' }, { personType: 'supervisor' }, { personType: 'driver' }];
  const people = await page.evaluate((PF) => PF.map((f) => { Object.assign(workerAttFilters, { dailiesTab: '', personType: '', supervisorId: '', q: '', project: '', site: '', dFrom: '2026-03-01', dTo: '2026-03-31' }, f);
    return wattPeopleList().map((p) => [p.kind, p.id, p.extra]); }), PF);
  eq(people, EXPECT.people, 'wattPeopleList بالفلاتر (والمستقيل والموقوف برّه)');

  console.log('[4] الجدول الشهري');
  const g = { workers: await grid('workers'), supervisors: await grid('supervisors'), drivers: await grid('drivers') };
  eq(g, EXPECT.grid, 'الكروت والفلاتر والعناوين وكل خلية');

  console.log('[5] دوال الحساب القديمة');
  const calc = await page.evaluate(() => Object.fromEntries(DATA.workerAttendance.map((a) => { const per = a.personType === 'supervisor' ? getSupervisor(a.personId) : a.personType === 'driver' ? getDriver(a.personId) : getWorker(a.workerId || a.personId);
    return [a.id, [isPayableAttendance(a.status), attendanceDaysCredit(a), attendanceDayWage(a, per), attendanceNetPay(a, per), fmtAttendanceDays(a)]]; })));
  eq(calc, EXPECT.calc, 'isPayableAttendance / attendanceDaysCredit / attendanceDayWage / attendanceNetPay / fmtAttendanceDays');

  console.log('[6] نافذة اليومية');
  const modalState = () => page.evaluate(() => ({ type: document.getElementById('wattType').value, person: document.getElementById('wattPerson').value, status: document.getElementById('wattStatus').value,
    date: document.getElementById('wattDate').value, days: document.getElementById('wattDays').value, wage: document.getElementById('wattDayWage').value, dedShown: document.getElementById('wattDedWrap').style.display !== 'none',
    preview: document.getElementById('wattPreviewVal').textContent.trim(), sameDay: document.getElementById('wattSameDay').style.display === 'none' ? '' : document.getElementById('wattSameDay').innerText.replace(/\s+/g, ' ').trim(),
    labels: [...document.querySelectorAll('#appModal .modal-body label')].map((l) => { const c = l.cloneNode(true); c.querySelectorAll('input,select,textarea,div,small').forEach((n) => n.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); }),
    options: Object.fromEntries(['wattType', 'wattStatus', 'wattProject'].map((id) => [id, [...document.getElementById(id).options].map((o) => o.textContent.trim())])),
    buttons: [...document.querySelectorAll('#appModal .modal-footer button')].map((b) => b.textContent.trim()) }));
  await closeAll(); await page.evaluate(() => { goToPage('workerAttendance'); openWorkerAttModal(null, null, { kind: 'worker', id: 'w2', date: '2026-03-10' }); }); await page.waitForTimeout(500);
  const m0 = await modalState();
  await page.selectOption('#wattStatus', 'half'); await page.waitForTimeout(150);
  const mHalf = await modalState();
  await page.selectOption('#wattStatus', 'late'); await page.fill('#wattDays', '1'); await page.fill('#wattDeduction', '30'); await page.dispatchEvent('#wattDeduction', 'input'); await page.waitForTimeout(150);
  const mLate = await modalState();
  eq({ m0, mHalf, mLate }, EXPECT.modal, 'الافتراضي والمعاينة ونصف يوم والمتأخر');
  // الحفظ من غير مشروع ← رسالة، وبالمشروع ← السجل المخزّن
  let n = await saveCount(); await page.click('#btnSaveWatt'); await page.waitForTimeout(400);
  ok(await page.evaluate((n) => window.__saveCount === n && !!document.getElementById('btnSaveWatt'), n), 'من غير مشروع: مفيش حفظ (المشروع إلزامي)');
  await page.selectOption('#wattProject', 'مشروع الشروق'); await page.fill('#wattSite', ' الموقع ج '); await page.fill('#wattNotes', ' ملاحظة ');
  n = await saveCount(); await page.click('#btnSaveWatt'); await waitSave(n);
  const saved = await page.evaluate(() => { const a = DATA.workerAttendance.find((x) => x.date === '2026-03-10'); const { id, ...r } = a; return { ...r, hasId: !!id }; });
  eq(saved, EXPECT.saved, 'السجل المخزّن (workerId والمشرف من العامل، والخصم للمتأخر بس)');
  // موقع تاني لنفس اليوم: الأيام المقترحة = 1 − المسجّل
  await closeAll(); await page.evaluate(() => openWorkerAttModal(null, null, { kind: 'worker', id: 'w1', date: '2026-03-01' })); await page.waitForTimeout(500);
  const mSame = await modalState();
  eq([mSame.days, mSame.sameDay], EXPECT.sameDay, 'موقع تاني لنفس اليوم: التنبيه والأيام المقترحة');
  // التعديل: نفس القيم، وحفظ بيحافظ على المفاتيح التانية (Object.assign)
  await closeAll(); await page.evaluate(() => openWorkerAttModal(null, 'a7')); await page.waitForTimeout(500);
  const mEdit = await modalState();
  await page.fill('#wattNotes', 'اتعدّلت'); n = await saveCount(); await page.click('#btnSaveWatt'); await waitSave(n);
  eq({ mEdit: [mEdit.type, mEdit.person, mEdit.days, mEdit.wage, mEdit.status], after: await page.evaluate(() => { const a = DATA.workerAttendance.find((x) => x.id === 'a7'); return [a.dayWage, a.days, a.notes, a.supervisorId, a.personKind]; }) }, EXPECT.edit, 'التعديل');

  console.log('[7] مواقع اليوم، والقايمة، والحذف');
  await closeAll(); await page.evaluate(() => openWattDaySitesModal('worker', 'w1', '2026-03-05')); await page.waitForTimeout(400);
  const sites = await page.evaluate(() => ({ title: document.querySelector('#appModal h3').textContent.trim(), chips: [...document.querySelectorAll('#appModal .wsite-chip')].map((c) => c.innerText.replace(/\s+/g, ' ').trim()),
    rows: [...document.querySelectorAll('#appModal .wsite-table tbody tr')].map((tr) => [...tr.children].slice(0, 6).map((td) => td.innerText.replace(/\s+/g, ' ').trim())), foot: document.querySelector('#appModal .wsite-table tfoot').innerText.replace(/\s+/g, ' ').trim() }));
  eq(sites, EXPECT.sites, 'نافذة مواقع اليوم');
  await closeAll();
  const list = await page.evaluate(() => { goToPage('workerAttendance'); Object.assign(workerAttFilters, { dailiesTab: 'workers', dailiesDept: '', dFrom: '2026-03-01', dTo: '2026-03-31', listView: true, project: '', site: '', status: '', q: '', supervisorId: '', personType: 'worker' }); rerenderCurrentPage();
    const tables = [...document.querySelectorAll('#app table.data-table')]; const t = tables[tables.length - 1];
    return { head: [...t.querySelectorAll('thead th')].map((th) => th.innerText.trim()), rows: [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.children].slice(0, 9).map((td) => td.innerText.replace(/\s+/g, ' ').trim())) }; });
  eq(list, EXPECT.list, 'قايمة السجلات (المستحق بالحساب القديم)');
  await page.evaluate(() => { window.confirmDelete = () => Promise.resolve(true); });
  n = await saveCount(); await page.click('.btn-del-watt[data-id="a10"]'); await waitSave(n);
  ok(await page.evaluate(() => !DATA.workerAttendance.some((x) => x.id === 'a10')), 'الحذف');

  console.log('[8] حضور الموظفين');
  const AF = [{}, { departmentId: 'dX' }, { employeeId: 'e1' }, { status: 'late' }, { from: '2026-03-01' }, { to: '2026-02-28' }, { q: 'منى' }, { q: 'مرض' }];
  const att = await page.evaluate((AF) => AF.map((f) => { Object.keys(attendanceFilters).forEach((k) => { attendanceFilters[k] = ''; }); Object.assign(attendanceFilters, f); return filteredAttendance().map((a) => a.id); }), AF);
  const attView = await page.evaluate(() => { goToPage('attendance'); Object.keys(attendanceFilters).forEach((k) => { attendanceFilters[k] = ''; }); rerenderCurrentPage();
    return { cards: [...document.querySelectorAll('#app .sc-row .sc-card')].map((c) => c.innerText.replace(/\s+/g, ' ').trim()), head: [...document.querySelectorAll('#app table.data-table thead th')].map((th) => th.innerText.trim()),
      rows: [...document.querySelectorAll('#app table.data-table tbody tr')].map((tr) => [...tr.children].slice(0, 6).map((td) => td.innerText.trim())) }; });
  eq({ att, attView }, EXPECT.attendance, 'filteredAttendance والكروت والجدول');
  await closeAll(); await page.evaluate(() => { goToPage('attendance'); openAttendanceModal(); }); await page.waitForTimeout(400);
  await page.evaluate(() => { document.getElementById('attEmp').value = 'e2'; });
  await page.fill('#attDate', '2026-03-09'); await page.selectOption('#attStatus', 'half'); await page.fill('#attIn', '10:00'); await page.fill('#attNotes', ' نص يوم ');
  n = await saveCount(); await page.click('#btnSaveAtt'); await waitSave(n);
  eq(await page.evaluate(() => { const a = DATA.attendance.find((x) => x.date === '2026-03-09'); const { id, ...r } = a; return { ...r, hasId: !!id }; }), EXPECT.attSaved, 'حضور موظف: السجل المخزّن');

  eq(errors, [], 'no JS errors');
  await browser.close();
  if (process.env.PROBE) require('fs').writeFileSync(require('path').join(__dirname, 'phase81.expect.json'), JSON.stringify(probed, null, 1) + '\n');
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
