// المرحلة 8 (الحزمة 8.3.4 — الموظفين): السيرفر (/api/v1/employees) = الواجهة القديمة (DEC-0125).
//  [1] القايمة (filteredEmployees، ومنها قسم المستقيلين بفلاتره الخاصة)، واللوحات، والملاحظات، وعلامة النقص، والكروت (العادية،
//      وكروت قسم المستقيلين والمعاشات الخاصة)، وخيارات فلتر الوظيفة وسنين الاستقالة — السيرفر قدام الدوال القديمة نفسها
//  [2] الحفظ: نافذة الموظف في نسخة A (القديمة) = الـ API في نسخة B — الإضافة (**من غير قسم**)، والدمج، والاستقالة (النهارده: مفيش خانة)،
//      وإعادة التفعيل — ونفس الأرشيف والأقسام. وحدث employee.saved، والتعارض
//  [3] الراتب (B-48) لمستخدم من غير صفحة الرواتب
//  [4] منع التكرار: السيرفر = findEntityDuplicates القديمة
// بيشتغل في WEB_MODE=1 (وفوق الجداول). في وضع الملف بيعدّي.
const { openApp, WEB } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const P = (id, o) => Object.assign({ id, extraFields: [], attachments: [] }, o);
  const seed = {
    users: [baseUser], schemaVersion: 9,
    settings: { defaultLeaveDays: 21 },
    projects: [{ id: 'pA', code: 'PRJ-001', name: 'مشروع الشروق', status: 'active' }],
    leaves: [{ id: 'l1', personKind: 'employee', personId: 'e2', status: 'approved', from: '2020-01-01', to: '2099-01-01' }],
    workers: [P('w1', { code: 'WRK-001', name: 'عامل أ', nationalId: '27001011234567', status: 'active' })],
    employees: [
      P('e1', { code: 'EMP-001', name: 'أحمد المحاسب', status: 'active', employmentType: 'full', position: 'محاسب', nationalId: '28501011234567', phone: '01001234567', address: 'القاهرة', email: 'a@x.com',
        salary: 8000, hireDate: '2022-01-01', idCardExpiry: '2099-01-01', insuranceStatus: 'insured', insuranceNumber: '111', contractType: 'permanent', contractStatus: 'active', leaveBalance: 21 }),
      P('e2', { code: 'EMP-002', name: 'منى السكرتيرة', status: 'active', employmentType: 'part', position: 'سكرتارية', salary: 4000, licenseExpiry: '2020-01-01' }),
      P('e3', { code: 'EMP-003', name: 'حسن مستقيل', status: 'resigned', resignedAt: '2025-06-01', hireDate: '2020-06-01', position: 'مهندس', insuranceStatus: 'insured',
        departmentId: '__resigned_employee__', categoryId: '__resigned_employee__', archiveGroup: 'resigned', previousDepartmentId: '__core_employees__' }),
      P('e5', { code: 'EMP-005', name: 'رامي مستقيل قديم', status: 'resigned', resignedAt: '2024-02-10', hireDate: '2023-01-01', position: 'فني', insuranceStatus: 'none', phone: '0122',
        departmentId: '__resigned_employee__', categoryId: '__resigned_employee__', archiveGroup: 'resigned', previousDepartmentId: '__core_employees__' }),
      P('e6', { code: 'EMP-006', name: 'سعاد معاش', status: 'retired', retiredAt: '2023-05-01', hireDate: '1990-01-01', departmentId: '__retired_employee__', categoryId: '__retired_employee__' }),
      P('e4', { code: 'EMP-004', name: 'سيد بلا وظيفة', status: 'active', employmentType: 'full' }),
    ],
  };
  const { browser, page, errors } = await openApp(seed);
  if (!WEB) { ok(true, 'وضع الملف: مقارنة السيرفر بتتعمل في WEB_MODE=1'); eq(errors, [], 'no JS errors'); await browser.close(); summary(); return; }
  const api = (pg, m, u, body, h) => pg.evaluate(async ([m, u, body, h]) => {
    const res = await fetch(u, { method: m, headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer ' + WebSession.token(), ...h }, body: body ? JSON.stringify(body) : undefined });
    let j = null; try { j = await res.json(); } catch (e) { /* */ } return { status: res.status, body: j };
  }, [m, u, body || null, h || {}]);
  const fmt = (n) => Number(n).toLocaleString('ar-EG', { maximumFractionDigits: 2 });
  const qs = (f) => Object.entries(f).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

  // ---- المرجع من القديمة
  await page.evaluate(() => { goToPage('employees'); rerenderCurrentPage(); }); await page.waitForTimeout(300);
  const RES = '__resigned_employee__', RET = '__retired_employee__';
  const F = [{}, { status: 'active' }, { status: 'on_leave' }, { status: 'resigned' }, { employmentType: 'part' }, { employmentType: 'full', status: 'active' }, { position: 'محاسب' }, { q: 'أحمد' }, { q: '2850' }, { q: 'سكرتارية' },
    { departmentId: '__none__' }, { departmentId: '__core_employees__' }, { xCard: 'none' }, { xCard: 'valid' }, { xLic: 'expired' }, { xLic: 'nolic' }, { xIns: 'insured' }, { xDocs: 'missing' }, { xData: 'missing' },
    { departmentId: RES }, { departmentId: RES, insuranceStatus: 'insured' }, { departmentId: RES, resignYear: '2024' }, { departmentId: RES, q: 'رامي' }, { departmentId: RES, status: 'active' },
    { departmentId: RET }, { departmentId: RET, resignYear: '2023' }];
  const lists = await page.evaluate((FS) => FS.map((f) => { Object.keys(employeeFilters).forEach((k) => { if (k !== '_boardLevel') employeeFilters[k] = ''; }); Object.assign(employeeFilters, f); return filteredEmployees().map((e) => e.id); }), F);
  await page.evaluate(() => { goToPage('employees'); Object.keys(employeeFilters).forEach((k) => { employeeFilters[k] = ''; }); employeeFilters._boardLevel = 'boards'; rerenderCurrentPage(); }); await page.waitForTimeout(200);
  const lBoards = await page.evaluate(() => [...document.querySelectorAll('#app .entity-dept-board')].map((b) => [b.getAttribute('data-dept'), b.querySelector('.lbl').innerText.trim(), Number(b.querySelector('.num').innerText.trim())]));
  const lNotes = await page.evaluate(() => Object.fromEntries(DATA.employees.map((e) => [e.id, personNotesIssues('employee', e)])));
  const lWarn = await page.evaluate(() => Object.fromEntries(DATA.employees.map((e) => { const h = personWarningBadge('employee', e); const m = h.match(/title="([^"]*)"/); return [e.id, m ? m[1].replace(/&amp;/g, '&') : '']; })));
  const lView = async (dept) => {
    await page.evaluate((d) => { goToPage('employees'); Object.keys(employeeFilters).forEach((k) => { employeeFilters[k] = ''; }); employeeFilters._boardLevel = 'list'; employeeFilters.departmentId = d; employeeFilters.categoryId = d; rerenderCurrentPage(); }, dept);
    await page.waitForTimeout(150);
    return page.evaluate(() => ({
      cards: [...document.querySelectorAll('#app .sc-row .sc-card')].map((c) => [c.querySelector('.sc-lbl').innerText.trim(),
        c.querySelector('.sc-num') ? c.querySelector('.sc-num').innerText.trim() : [...c.querySelectorAll('.sc-part')].map((p) => p.querySelector('b').innerText.trim()).join('/')]),
      pos: [...document.querySelectorAll('#empFilterPos option')].map((o) => o.value).filter(Boolean),
      years: [...document.querySelectorAll('#empFilterResYear option')].map((o) => o.value).filter(Boolean),
      prevDept: [...document.querySelectorAll('#app table.data-table tbody tr[data-emp-id]')].map((tr) => [tr.getAttribute('data-emp-id'), tr.children[11] ? tr.children[11].innerText.trim() : '']),
    }));
  };
  const lv = { all: await lView(''), res: await lView(RES), ret: await lView(RET) };
  const sc = (cards) => cards.map((c) => [c.label, c.parts ? c.parts.map((p) => fmt(p.n)).join('/') : (typeof c.value === 'number' ? (/إجمالي/.test(c.label) ? fmt(c.value) + ' ج.م' : fmt(c.value)) : c.value)]);

  console.log('[1] السيرفر = الصفحة القديمة');
  for (let i = 0; i < F.length; i++) {
    const r = await api(page, 'GET', '/api/v1/employees?' + qs(F[i]));
    eq(r.status === 200 && r.body.rows.map((x) => x.id), lists[i], `الموظفين ${JSON.stringify(F[i])}`);
  }
  ok(lists[2].includes('e2'), 'الإجازة المعتمدة السارية ← «في إجازة»', lists[2]);
  const all = (await api(page, 'GET', '/api/v1/employees')).body;
  eq(all.boards.map((b) => [b.id, b.name, b.count]), lBoards, 'اللوحات');
  for (const p of all.rows) { eq(p.issues, lNotes[p.id], `الملاحظات ${p.id}`); eq(p.warning, lWarn[p.id], `علامة النقص ${p.id}`); }
  eq(sc(all.cards), lv.all.cards, 'الكروت العادية (👔، وإجمالي الرواتب)');
  eq(all.options.positions, lv.all.pos, 'خيارات فلتر الوظيفة');
  const res = (await api(page, 'GET', `/api/v1/employees?departmentId=${RES}`)).body;
  eq(sc(res.cards), lv.res.cards, 'كروت قسم المستقيلين الخاصة (4)');
  eq([res.mode, res.options.resignYears], ['resigned', lv.res.years], 'قسم المستقيلين: سنين الاستقالة');
  eq(res.rows.map((e) => [e.id, e.previousDepartmentName]), lv.res.prevDept, 'جدول المستقيلين: القسم السابق');
  const ret = (await api(page, 'GET', `/api/v1/employees?departmentId=${RET}`)).body;
  eq(sc(ret.cards), lv.ret.cards, 'كروت قسم المعاشات');
  eq([ret.mode, ret.options.resignYears], ['retired', lv.ret.years], 'قسم المعاشات: سنين الإحالة');

  console.log('[2] الحفظ: نافذة الموظف القديمة (A) = الـ API (B)');
  const B = await openApp(seed);
  const today = await page.evaluate(() => todayISO());
  const snapshot = (pg) => pg.evaluate(() => {
    const strip = (o) => JSON.parse(JSON.stringify(o, (k, v) => (/^_/.test(k) || k === 'movedAt' ? undefined : v)));
    const sortN = (xs) => (xs || []).slice().sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
    const nid = (id) => (/^e\d$/.test(id) ? id : 'NEW');
    return strip({ employees: sortN(DATA.employees).map(({ id, ...x }) => ({ ...x, id: nid(id) })),
      archive: sortN(DATA.resignedArchive).map(({ id, entity, ...a }) => ({ ...a, personId: nid(a.personId), entity: entity && { ...entity, id: nid(entity.id) } })),
      depts: sortN((DATA.departments || []).filter((d) => /resigned|retired/.test(d.id))) });
  });
  const reload = async (pg) => { await pg.reload(); await pg.waitForFunction(() => typeof DATA !== 'undefined' && window.WebSync && WebSync._state.meta && Array.isArray(DATA.employees) && DATA.employees.length > 0, null, { timeout: 30000 }); await pg.waitForTimeout(300); };
  const closeAll = async () => { await page.evaluate(() => { try { closeSubModal(); } catch (e) { /* */ } try { closeModal(); } catch (e) { /* */ } }); await page.waitForTimeout(250); };
  const settle = async () => { await page.waitForSelector('#appModal:not(.modal-overlay-out) #btnSaveEmp'); await page.waitForTimeout(250); };
  const savedRec = async (name) => { await page.waitForFunction((nm) => (DATA.employees || []).some((x) => x.name === nm), name, { timeout: 15000 }); await page.waitForTimeout(300); };
  const saveClick = async () => { const n = await page.evaluate(() => window.__saveCount); await page.click('#btnSaveEmp'); await page.waitForFunction((x) => window.__saveCount > x, n, { timeout: 15000 }); await page.waitForTimeout(200); };
  // A: إضافة
  await closeAll(); await page.evaluate(() => { goToPage('employees'); openEmployeeModal(); }); await settle();
  const code = await page.inputValue('#empCode'), hire = await page.inputValue('#empHire');
  await page.fill('#empName', ' موظف جديد '); await page.fill('#empPos', 'مشتريات'); await page.fill('#empSalary', '6500.555'); await page.fill('#empEmail', ' n@x.com '); await page.fill('#empLeaveBal', '15');
  await page.fill('#empLicExp', '2020-05-01'); await page.fill('#empNid', '26001011234567'); await page.fill('#empAddress', ' القاهرة ');
  await page.waitForFunction((c) => document.getElementById('empCode').value === c && document.getElementById('empLeaveBal').value === '15', code);
  await page.click('#btnSaveEmp'); await savedRec('موظف جديد');
  // A: تعديلات
  const openEdit = async (id) => { await closeAll(); await page.evaluate((i) => openEmployeeModal(i), id); await settle(); };
  await openEdit('e1'); await page.fill('#empPhone', ''); await page.fill('#empAddress', 'الجيزة'); await page.selectOption('#empType', 'contract'); await saveClick();
  await openEdit('e4'); await page.selectOption('#empStatus', 'resigned'); await saveClick();
  await openEdit('e4'); await page.selectOption('#empStatus', 'active'); await saveClick();
  await openEdit('e2'); await page.fill('#empEmail', 'm@x.com'); await page.fill('#empLeaveBal', '0'); await page.selectOption('#empStatus', 'resigned'); await saveClick();
  await closeAll();

  // B: نفس المدخلات بالـ API (بنفس قيم خانات النافذة)
  const key = () => ({ 'Idempotency-Key': 'emp-' + Math.random().toString(36).slice(2) });
  const HR0 = { birthDate: '', idCardExpiry: '', contractType: '', contractStatus: '', insuranceNumber: '', insuranceStatus: '', phone: '', notes: '', extraFields: [] };
  eq((await api(B.page, 'POST', '/api/v1/employees', { ...HR0, code, name: ' موظف جديد ', status: '', employmentType: '', position: 'مشتريات', salary: '6500.555', email: ' n@x.com ', leaveBalance: '15',
    licenseExpiry: '2020-05-01', nationalId: '26001011234567', address: ' القاهرة ', hireDate: hire }, key())).status, 201, 'POST موظف');
  /** خانات النافذة كما بتتفتح على السجل (openEmployeeModal + personHrFieldsHtml) */
  const formOf = (p) => ({
    code: p.code || '', name: p.name || '', status: p.status || '', employmentType: p.employmentType || 'full', email: p.email || '', leaveBalance: String(p.leaveBalance != null ? p.leaveBalance : 21),
    position: p.position || p.jobTitle || p.skill || '', nationalId: p.nationalId || '', birthDate: p.birthDate || '', idCardExpiry: p.idCardExpiry || '', licenseExpiry: p.licenseExpiry || '', hireDate: p.hireDate || today,
    contractType: p.contractType || '', contractStatus: p.contractStatus || '', insuranceNumber: p.insuranceNumber || '', insuranceStatus: p.insuranceStatus || '', phone: p.phone || '', address: p.address || '', notes: p.notes || '',
    salary: p.salary || p.basicSalary ? String(Math.round((p.salary || p.basicSalary) * 100) / 100) : '', extraFields: Array.isArray(p.extraFields) ? p.extraFields : [],
  });
  // صفحة القديمة في B بتحفظ مزامنة الإجازات (syncLeaveStatuses) بعد التحميل ← نسخة السجل بتتغيّر بين القراية والحفظ. نعيد على 409
  const edit = async (id, over) => {
    for (let i = 0; ; i++) {
      const p = (await api(B.page, 'GET', `/api/v1/employees/${id}`)).body;
      const r = await api(B.page, 'PATCH', `/api/v1/employees/${id}`, { ...formOf(p), rev: p.rev, ...over });
      if (r.status !== 409 || over.rev != null || i >= 2) return r;
      await B.page.waitForTimeout(500);
    }
  };
  eq((await edit('e1', { phone: '', address: 'الجيزة', employmentType: 'contract' })).status, 200, 'PATCH موظف (دمج)');
  eq((await edit('e4', { status: 'resigned' })).status, 200, 'PATCH استقالة (النهارده)');
  eq((await edit('e4', { status: 'active' })).status, 200, 'PATCH إعادة تفعيل');
  eq((await edit('e2', { email: 'm@x.com', leaveBalance: '0', status: 'resigned' })).status, 200, 'PATCH موظف في إجازة ← استقالة');
  await reload(page); await reload(B.page);
  const a = await snapshot(page), b = await snapshot(B.page);
  const kdiff = (x, y) => [...new Set([...Object.keys(x || {}), ...Object.keys(y || {})])].filter((k) => JSON.stringify((x || {})[k]) !== JSON.stringify((y || {})[k])).map((k) => [k, (x || {})[k], (y || {})[k]]);
  for (const p of a.employees) { const d = kdiff(b.employees.find((x) => x.name === p.name), p); ok(!d.length, `«${p.name}»: نفس السجل في الاتنين`, d); }
  ok(!('departmentId' in a.employees.find((x) => x.name === 'موظف جديد')) || a.employees.find((x) => x.name === 'موظف جديد').departmentId === '__core_employees__', 'الموظف الجديد: القسم من التحميل بس (assignCoreDepartments)');
  ok(a.archive.length === b.archive.length && a.archive.every((x, i) => !kdiff(b.archive[i], x).filter(([k]) => k !== 'entity').length && !kdiff((b.archive[i] || {}).entity, x.entity).length), 'أرشيف المستقيلين: نفس اللقطات',
    a.archive.map((x, i) => [kdiff(b.archive[i], x).filter(([k]) => k !== 'entity'), kdiff((b.archive[i] || {}).entity, x.entity)]));
  eq(b.depts, a.depts, 'أقسام المستقيلين');
  eq((await api(B.page, 'GET', '/api/v1/employees/e4')).body.events.map((e) => e.type), ['employee.saved', 'employee.saved'], 'حدث employee.saved مع كل حفظ');
  const stale = await edit('e1', { rev: 99, notes: 'x' });
  eq([stale.status, stale.body.code], [409, 'CONFLICT'], 'rev قديم ← تعارض صريح');

  console.log('[3] الراتب (B-48)');
  // مستخدم بصفحة الموظفين بس (من غير صفحة الرواتب)
  const mk = await B.page.evaluate(async () => (await WebSession.api('POST', '/api/users', { username: 'emp_hr', password: 'Emp#Hr#User#2026', role: 'custom',
    editData: true, pages: [{ page: 'employees', view: true, add: true, edit: true, delete: false }] })).status);
  ok(mk === 201 || mk === 200, 'مستخدم بصفحة الموظفين بس');
  const login = await B.page.evaluate(async () => (await (await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'emp_hr', password: 'Emp#Hr#User#2026' }) })).json()));
  const as = (m, u, body, h) => B.page.evaluate(async ([m, u, body, h, t]) => { const res = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t, ...h }, body: body ? JSON.stringify(body) : undefined }); let j = null; try { j = await res.json(); } catch (e) { /* */ } return { status: res.status, body: j }; }, [m, u, body || null, h || {}, login.accessToken]);
  const lr = await as('GET', '/api/v1/employees');
  ok(lr.status === 200 && lr.body.rows.every((p) => !('salary' in p)) && lr.body.hiddenFields.includes('salary') && !lr.body.cards.some((c) => /إجمالي/.test(c.label)), 'القايمة من غير راتب ولا كارت إجمالي', lr.body && lr.body.hiddenFields);
  const w = await as('POST', '/api/v1/employees', { name: 'براتب', salary: '100' }, { 'Idempotency-Key': 'emp-salary-forbidden' });
  eq([w.status, w.body && w.body.code], [403, 'FIELD_FORBIDDEN'], 'الراتب مايتكتبش من غير صلاحيته');

  console.log('[4] منع التكرار: السيرفر = findEntityDuplicates القديمة');
  const CASES = [
    ['موظف برقم قومي موجود (مؤكد)', { name: 'شخص', nationalId: '28501011234567' }],
    ['موظف بنفس الاسم (تشابه)', { name: 'أحمد  المحاسب' }],
    ['موظف برقم عامل (تشابه عبر الأنواع)', { name: 'موظف آخر', nationalId: '27001011234567' }],
  ];
  for (const [ci, [label, form]] of CASES.entries()) {
    const want = await page.evaluate((f) => findEntityDuplicates('employee', f, null).map((m) => [m.code, m.name, m.kind, m.strength, m.reasons]), form);
    const r = await api(B.page, 'POST', '/api/v1/employees', { status: 'active', ...form }, { 'Idempotency-Key': 'emp-dup-case-' + ci });
    const got = r.status === 409 && /^DUPLICATE/.test(r.body.code) ? r.body.matches.map((m) => [m.code, m.name, m.kind, m.strength, m.reasons]) : [];
    eq(got, want, `${label}: نفس المطابقات`);
  }

  eq(B.errors, [], 'no JS errors (B)');
  await B.browser.close();
  eq(errors, [], 'no JS errors');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
