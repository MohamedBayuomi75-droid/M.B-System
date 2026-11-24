// المرحلة 8 (الحزمة 8.2.4 — المشرفين والسواقين): السيرفر (/api/v1/supervisors و/api/v1/drivers) = الواجهة القديمة.
//  [1] القايمة (filteredSupervisors، وقايمة renderDriversPage)، واللوحات، والملاحظات، وعلامة النقص، والكروت — السيرفر قدام الدوال القديمة نفسها
//  [2] الحفظ: النوافذ التلاتة في نسخة A (القديمة) = الـ API في نسخة B — إضافة مشرف وسواق شركة وسواق خارجي، والدمج، والخارجي من غير دمج،
//      والاستقالة بتاريخها، وإعادة التفعيل — ونفس الأرشيف والأقسام. وحدث *.saved، والتعارض
//  [3] الأجور (B-48) لمدير مشروع
//  [4] منع التكرار: السيرفر = findEntityDuplicates القديمة
// بيشتغل في WEB_MODE=1 (وفوق الجداول). في وضع الملف بيعدّي.
const { openApp, WEB } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const P = (id, o) => Object.assign({ id, extraFields: [], attachments: [] }, o);
  const seed = {
    users: [baseUser], schemaVersion: 9,
    projects: [{ id: 'pA', code: 'PRJ-001', name: 'مشروع الشروق', status: 'active' }],
    employees: [P('e1', { code: 'EMP-001', name: 'موظف أول', nationalId: '27001011234567', status: 'active' })],
    leaves: [{ id: 'l1', personKind: 'supervisor', personId: 's1', status: 'approved', from: '2020-01-01', to: '2099-01-01' }],
    personDocuments: [{ id: 'pd1', personId: 'd1', docType: 'صورة الرخصة الشخصية', attachments: [{ name: 'r.pdf', path: 'x/r.pdf' }] }],
    supervisors: [
      P('s1', { code: 'SUP-001', name: 'سامي المشرف', status: 'active', nationalId: '28001011234567', phone: '01001112222', dailyWage: 350, position: 'مشرف موقع', skill: 'مشرف موقع', licenseExpiry: '2020-01-01', idCardExpiry: '2099-01-01', hireDate: '2024-01-01', address: 'القاهرة' }),
      P('s2', { code: 'SUP-002', name: 'كريم عادل', status: 'active', insuranceStatus: 'insured', contractStatus: 'active' }),
      P('s3', { code: 'SUP-003', name: 'مشرف مستقيل', status: 'resigned', resignedAt: '2026-01-01' }),
    ],
    workers: [
      P('w1', { code: 'WRK-001', name: 'عامل أ', workerType: 'temporary', status: 'active', supervisorId: 's1' }),
      P('w2', { code: 'WRK-002', name: 'عامل ب', workerType: 'temporary', status: 'resigned', supervisorId: 's1' }),
      P('w3', { code: 'WRK-003', name: 'عامل ج', workerType: 'temporary', status: 'active', supervisorId: 's2' }),
    ],
    drivers: [
      P('d1', { code: 'DRV-001', name: 'أحمد السواق', status: 'active', salary: 5000, licenseGrade: 'درجة أولى', licenseExpiry: '2099-01-01', nationalId: '29001011234567', phone: '01112223333', position: 'سائق نقل', idCardExpiry: '2020-01-01' }),
      P('d2', { code: 'DRV-002', name: 'محمود خارجي', status: 'active', external: true, dailyWage: 200, phone: '01223334444', position: 'سائق', address: 'الجيزة' }),
      P('d3', { code: 'DRV-003', name: 'سيد سواق', status: '' }),
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
  const filters = (kind) => (kind === 'supervisors' ? 'supervisorFilters' : 'driverFilters');

  // ---- المرجع من القديمة
  await page.evaluate(() => { goToPage('supervisors'); rerenderCurrentPage(); }); await page.waitForTimeout(300);
  const SUP_F = [{}, { status: 'active' }, { status: 'resigned' }, { q: 'سامي' }, { q: '2800' }, { q: 'مشرف موقع' }, { departmentId: '__none__' }, { departmentId: '__core_supervisors__' },
    { xCard: 'none' }, { xCard: 'valid' }, { xLic: 'expired' }, { xLic: 'nolic' }, { xIns: 'insured' }, { xData: 'missing' }, { xDocs: 'missing' }, { status: 'active', q: 'م' }];
  const DRV_F = [{}, { status: 'active' }, { status: 'inactive' }, { q: 'سواق' }, { q: 'درجة أولى' }, { q: '0122' }, { departmentId: '__core_drivers_ext__' }, { departmentId: '__core_drivers__' },
    { departmentId: '__none__' }, { xCard: 'expired' }, { xLic: 'valid' }, { xLic: 'nolic' }, { xIns: 'none' }, { xData: 'missing' }, { xDocs: 'complete' }];
  const supL = await page.evaluate((FS) => FS.map((f) => { Object.keys(supervisorFilters).forEach((k) => { if (k !== '_boardLevel') supervisorFilters[k] = ''; }); Object.assign(supervisorFilters, f); return filteredSupervisors().map((s) => s.id); }), SUP_F);
  const drvL = [];
  for (const f of DRV_F) {
    drvL.push(await page.evaluate((f) => { goToPage('drivers'); Object.keys(driverFilters).forEach((k) => { driverFilters[k] = ''; }); driverFilters._boardLevel = 'list'; Object.assign(driverFilters, f); rerenderCurrentPage();
      return [...document.querySelectorAll('#app .btn-edit-drv')].map((b) => b.getAttribute('data-id')); }, f));
  }
  const boardsOf = async (pg) => {
    await page.evaluate((pg) => { goToPage(pg); const f = pg === 'supervisors' ? supervisorFilters : driverFilters; Object.keys(f).forEach((k) => { f[k] = ''; }); f._boardLevel = 'boards'; rerenderCurrentPage(); }, pg);
    await page.waitForTimeout(200);
    return page.evaluate(() => [...document.querySelectorAll('#app .entity-dept-board')].map((b) => [b.getAttribute('data-dept'), b.querySelector('.lbl').innerText.trim(), Number(b.querySelector('.num').innerText.trim())]));
  };
  const lBoards = { supervisors: await boardsOf('supervisors'), drivers: await boardsOf('drivers') };
  const lNotes = await page.evaluate(() => ({ supervisors: Object.fromEntries(DATA.supervisors.map((s) => [s.id, personNotesIssues('supervisor', s)])), drivers: Object.fromEntries(DATA.drivers.map((d) => [d.id, personNotesIssues('driver', d)])) }));
  const lWarn = await page.evaluate(() => { const w = (k, p) => { const h = personWarningBadge(k, p); const m = h.match(/title="([^"]*)"/); return m ? m[1].replace(/&amp;/g, '&') : ''; };
    return { supervisors: Object.fromEntries(DATA.supervisors.map((s) => [s.id, w('supervisor', s)])), drivers: Object.fromEntries(DATA.drivers.map((d) => [d.id, w('driver', d)])) }; });
  const lCards = async (pg, dept) => {
    await page.evaluate(([pg, d]) => { goToPage(pg); const f = pg === 'supervisors' ? supervisorFilters : driverFilters; Object.keys(f).forEach((k) => { f[k] = ''; }); f._boardLevel = 'list'; f.departmentId = d; f.categoryId = d; rerenderCurrentPage(); }, [pg, dept]);
    await page.waitForTimeout(150);
    return page.evaluate(() => [...document.querySelectorAll('#app .sc-row .sc-card')].map((c) => [c.querySelector('.sc-lbl').innerText.trim(),
      c.querySelector('.sc-num') ? c.querySelector('.sc-num').innerText.trim() : [...c.querySelectorAll('.sc-part')].map((p) => p.querySelector('b').innerText.trim()).join('/')]));
  };
  const lc = { sup: await lCards('supervisors', ''), drv: await lCards('drivers', ''), ext: await lCards('drivers', '__core_drivers_ext__'), res: await lCards('supervisors', '__resigned_supervisor__') };
  const sc = (cards) => cards.map((c) => [c.label, c.parts ? c.parts.map((p) => fmt(p.n)).join('/') : (typeof c.value === 'number' ? (/إجمالي/.test(c.label) ? fmt(c.value) + ' ج.م' : fmt(c.value)) : c.value)]);

  console.log('[1] السيرفر = الصفحة القديمة');
  for (let i = 0; i < SUP_F.length; i++) {
    const r = await api(page, 'GET', '/api/v1/supervisors?' + qs(SUP_F[i]));
    eq(r.status === 200 && r.body.rows.map((x) => x.id), supL[i], `المشرفين ${JSON.stringify(SUP_F[i])}`);
  }
  for (let i = 0; i < DRV_F.length; i++) {
    const r = await api(page, 'GET', '/api/v1/drivers?' + qs(DRV_F[i]));
    eq(r.status === 200 && r.body.rows.map((x) => x.id), drvL[i], `السواقين ${JSON.stringify(DRV_F[i])}`);
  }
  for (const k of ['supervisors', 'drivers']) {
    const all = (await api(page, 'GET', `/api/v1/${k}`)).body;
    eq(all.boards.map((b) => [b.id, b.name, b.count]), lBoards[k], `${k}: اللوحات`);
    for (const p of all.rows) { eq(p.issues, lNotes[k][p.id], `${k}: الملاحظات ${p.id}`); eq(p.warning, lWarn[k][p.id], `${k}: علامة النقص ${p.id}`); }
  }
  eq(sc((await api(page, 'GET', '/api/v1/supervisors')).body.cards), lc.sup, 'كروت المشرفين («عمال تابعون»)');
  eq(sc((await api(page, 'GET', '/api/v1/drivers')).body.cards), lc.drv, 'كروت السواقين («رخص منتهية»، وإجمالي الرواتب)');
  eq(sc((await api(page, 'GET', '/api/v1/drivers?departmentId=__core_drivers_ext__')).body.cards), lc.ext, 'كروت السواقين من بره (إجمالي اليوميات)');
  eq(sc((await api(page, 'GET', '/api/v1/supervisors?departmentId=__resigned_supervisor__')).body.cards), lc.res, 'كروت قسم المستقيلين');
  eq((await api(page, 'GET', '/api/v1/supervisors')).body.rows.map((s) => [s.id, s.workersCount]), [['s1', 2], ['s2', 1], ['s3', 0]], 'عدد العمال لكل مشرف');

  console.log('[2] الحفظ: النوافذ القديمة (A) = الـ API (B)');
  const B = await openApp(seed);
  const today = await page.evaluate(() => todayISO());
  const snapshot = (pg) => pg.evaluate(() => {
    const strip = (o) => JSON.parse(JSON.stringify(o, (k, v) => (/^_/.test(k) || k === 'movedAt' ? undefined : v)));
    const sortN = (xs) => (xs || []).slice().sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
    const nid = (id) => (/^[sd]\d$/.test(id) ? id : 'NEW');
    return strip({ supervisors: sortN(DATA.supervisors).map(({ id, ...x }) => ({ ...x, id: nid(id) })), drivers: sortN(DATA.drivers).map(({ id, ...x }) => ({ ...x, id: nid(id) })),
      archive: sortN(DATA.resignedArchive).map(({ id, entity, ...a }) => ({ ...a, personId: nid(a.personId), entity: entity && { ...entity, id: nid(entity.id) } })),
      depts: sortN((DATA.departments || []).filter((d) => /resigned|retired/.test(d.id))) });
  });
  const reload = async (pg) => { await pg.reload(); await pg.waitForFunction(() => typeof DATA !== 'undefined' && window.WebSync && WebSync._state.meta && Array.isArray(DATA.drivers) && DATA.drivers.length > 0, null, { timeout: 30000 }); await pg.waitForTimeout(300); };
  const closeAll = async () => { await page.evaluate(() => { try { closeSubModal(); } catch (e) { /* */ } try { closeModal(); } catch (e) { /* */ } }); await page.waitForTimeout(250); };
  const savedRec = async (coll, name) => { await page.waitForFunction(([c, nm]) => (DATA[c] || []).some((x) => x.name === nm), [coll, name], { timeout: 15000 }); await page.waitForTimeout(300); };
  const saveClick = async (btn) => { const n = await page.evaluate(() => window.__saveCount); await page.click(btn); await page.waitForFunction((x) => window.__saveCount > x, n, { timeout: 15000 }); await page.waitForTimeout(200); };
  // A: إضافة مشرف
  await closeAll(); await page.evaluate(() => { goToPage('supervisors'); openSupervisorModal(); }); await page.waitForSelector('#appModal:not(.modal-overlay-out) #btnSaveSup'); await page.waitForTimeout(250);
  const supCode = await page.inputValue('#supCode'), supHire = await page.inputValue('#supHire');
  await page.fill('#supName', ' مشرف جديد '); await page.fill('#supPos', 'مشرف أمن'); await page.fill('#supWage', '275.555'); await page.fill('#supLicExp', '2020-05-01'); await page.fill('#supNid', '26001011234567'); await page.fill('#supAddress', ' القاهرة ');
  await page.click('#btnSaveSup'); await savedRec('supervisors', 'مشرف جديد');
  // A: سواق شركة
  await closeAll(); await page.evaluate(() => { goToPage('drivers'); openDriverModal(); }); await page.waitForSelector('#appModal:not(.modal-overlay-out) #btnSaveDriver'); await page.waitForTimeout(250);
  const drvCode = await page.inputValue('#drvCode'), drvHire = await page.inputValue('#drvHire');
  await page.fill('#drvName', 'سواق جديد'); await page.fill('#drvSalary', '4500.5'); await page.selectOption('#drvLicGrade', 'درجة ثانية'); await page.fill('#drvPhone', '01009998888');
  await page.click('#btnSaveDriver'); await savedRec('drivers', 'سواق جديد');
  // A: سواق خارجي
  await closeAll(); await page.evaluate(() => { goToPage('drivers'); openDriverModal(null, { external: true }); });
  // النافذة لازم تستقر قبل الكتابة (زي phase72): وإلا الكتابة بتقع في خانة الكود
  await page.waitForSelector('#appModal:not(.modal-overlay-out) #drvWage'); await page.waitForTimeout(250);
  const extCode = await page.inputValue('#drvCode');
  await page.fill('#drvName', 'خارجي جديد'); await page.fill('#drvWage', '180.555'); await page.fill('#drvPhone', '01115556666');
  await page.waitForFunction((c) => document.getElementById('drvCode').value === c && document.getElementById('drvWage').value === '180.555', extCode);
  await page.click('#btnSaveDriver'); await savedRec('drivers', 'خارجي جديد');
  // A: تعديلات
  const openEdit = async (fn, id, btn) => { await closeAll(); await page.evaluate(([f, i]) => window[f](i), [fn, id]); await page.waitForSelector('#appModal:not(.modal-overlay-out) ' + btn); await page.waitForTimeout(250); };
  await openEdit('openSupervisorModal', 's1', '#btnSaveSup'); await page.fill('#supPhone', ''); await page.fill('#supAddress', 'الإسكندرية'); await saveClick('#btnSaveSup');
  await openEdit('openSupervisorModal', 's2', '#btnSaveSup'); await page.selectOption('#supStatus', 'resigned'); await page.fill('#supResignDate', '2026-03-15'); await saveClick('#btnSaveSup');
  await openEdit('openSupervisorModal', 's2', '#btnSaveSup'); await page.selectOption('#supStatus', 'active'); await saveClick('#btnSaveSup');
  await openEdit('openDriverModal', 'd2', '#btnSaveDriver'); await page.fill('#drvAddress', ''); await saveClick('#btnSaveDriver');
  await openEdit('openDriverModal', 'd1', '#btnSaveDriver'); await page.fill('#drvPhone', ''); await page.selectOption('#drvStatus', 'resigned'); await page.fill('#drvResignDate', '2026-04-01'); await saveClick('#btnSaveDriver');
  await closeAll();

  // B: نفس المدخلات بالـ API (بنفس قيم خانات النوافذ)
  const key = () => ({ 'Idempotency-Key': 'sd-' + Math.random().toString(36).slice(2) });
  const HR0 = { birthDate: '', idCardExpiry: '', licenseExpiry: '', contractType: '', contractStatus: '', insuranceNumber: '', insuranceStatus: '', notes: '', extraFields: [] };
  eq((await api(B.page, 'POST', '/api/v1/supervisors', { ...HR0, code: supCode, name: ' مشرف جديد ', status: '', position: 'مشرف أمن', dailyWage: '275.555', licenseExpiry: '2020-05-01', nationalId: '26001011234567', phone: '', address: ' القاهرة ', hireDate: supHire }, key())).status, 201, 'POST مشرف');
  eq((await api(B.page, 'POST', '/api/v1/drivers', { ...HR0, code: drvCode, name: 'سواق جديد', status: '', position: 'سائق', salary: '4500.5', licenseGrade: 'درجة ثانية', phone: '01009998888', nationalId: '', address: '', hireDate: drvHire }, key())).status, 201, 'POST سواق شركة');
  eq((await api(B.page, 'POST', '/api/v1/drivers', { external: true, code: extCode, name: 'خارجي جديد', status: '', nationalId: '', position: 'سائق', dailyWage: '180.555', phone: '01115556666', address: '', notes: '' }, key())).status, 201, 'POST سواق خارجي');
  /** خانات النافذة كما بتتفتح على السجل (personHrFieldsHtml + خانات النافذة) */
  const formOf = (k, p) => {
    if (k === 'drivers' && p.external) return { code: p.code || '', name: p.name || '', status: p.status || '', nationalId: p.nationalId || '', position: p.position || 'سائق', dailyWage: p.dailyWage ? String(Math.round(p.dailyWage * 100) / 100) : '', phone: p.phone || '', address: p.address || '', notes: p.notes || '' };
    const base = { code: p.code || '', name: p.name || '', status: p.status || '', resignedAt: p.resignedAt || '', position: (k === 'supervisors' ? p.skill : p.position) || p.position || p.jobTitle || p.skill || (k === 'drivers' ? 'سائق' : ''), nationalId: p.nationalId || '', birthDate: p.birthDate || '',
      idCardExpiry: p.idCardExpiry || '', licenseExpiry: p.licenseExpiry || '', hireDate: p.hireDate || today, contractType: p.contractType || '', contractStatus: p.contractStatus || '', insuranceNumber: p.insuranceNumber || '',
      insuranceStatus: p.insuranceStatus || '', phone: p.phone || '', address: p.address || '', notes: p.notes || '', extraFields: Array.isArray(p.extraFields) ? p.extraFields : [] };
    return k === 'supervisors' ? { ...base, dailyWage: p.dailyWage ? String(Math.round(p.dailyWage * 100) / 100) : '' } : { ...base, salary: p.salary || p.basicSalary ? String(Math.round((p.salary || p.basicSalary) * 100) / 100) : '', licenseGrade: p.licenseGrade || '' };
  };
  // صفحة القديمة في B ممكن تحفظ مزامنة الإجازات (syncLeaveStatuses) بعد التحميل ← نسخة السجل بتتغيّر بين القراية والحفظ. نعيد مرة على 409
  const edit = async (k, id, over) => {
    for (let i = 0; ; i++) {
      const p = (await api(B.page, 'GET', `/api/v1/${k}/${id}`)).body;
      const r = await api(B.page, 'PATCH', `/api/v1/${k}/${id}`, { ...formOf(k, p), rev: p.rev, ...over });
      if (r.status !== 409 || over.rev != null || i >= 2) return r;
      await B.page.waitForTimeout(500);
    }
  };
  eq((await edit('supervisors', 's1', { phone: '', address: 'الإسكندرية' })).status, 200, 'PATCH مشرف (دمج)');
  eq((await edit('supervisors', 's2', { status: 'resigned', resignedAt: '2026-03-15' })).status, 200, 'PATCH استقالة بتاريخها');
  eq((await edit('supervisors', 's2', { status: 'active' })).status, 200, 'PATCH إعادة تفعيل');
  eq((await edit('drivers', 'd2', { address: '' })).status, 200, 'PATCH خارجي (من غير دمج)');
  eq((await edit('drivers', 'd1', { phone: '', status: 'resigned', resignedAt: '2026-04-01' })).status, 200, 'PATCH سواق شركة (دمج + استقالة)');
  await reload(page); await reload(B.page);
  const a = await snapshot(page), b = await snapshot(B.page);
  const kdiff = (x, y) => [...new Set([...Object.keys(x || {}), ...Object.keys(y || {})])].filter((k) => JSON.stringify((x || {})[k]) !== JSON.stringify((y || {})[k])).map((k) => [k, (x || {})[k], (y || {})[k]]);
  for (const k of ['supervisors', 'drivers']) for (const p of a[k]) { const d = kdiff(b[k].find((x) => x.name === p.name), p); ok(!d.length, `${k} «${p.name}»: نفس السجل في الاتنين`, d); }
  ok(a.archive.length === b.archive.length && a.archive.every((x, i) => !kdiff(b.archive[i], x).filter(([k]) => k !== 'entity').length && !kdiff((b.archive[i] || {}).entity, x.entity).length), 'أرشيف المستقيلين: نفس اللقطات',
    a.archive.map((x, i) => [kdiff(b.archive[i], x).filter(([k]) => k !== 'entity'), kdiff((b.archive[i] || {}).entity, x.entity)]));
  eq(b.depts, a.depts, 'أقسام المستقيلين');
  eq((await api(B.page, 'GET', '/api/v1/supervisors/s2')).body.events.map((e) => e.type), ['supervisor.saved', 'supervisor.saved'], 'حدث supervisor.saved مع كل حفظ');
  const stale = await edit('drivers', 'd3', { rev: 7, notes: 'x' });
  eq([stale.status, stale.body.code], [409, 'CONFLICT'], 'rev قديم ← تعارض صريح');

  console.log('[3] الأجور (B-48)');
  const pmTok = await B.page.evaluate(async () => (await WebSession.api('POST', '/api/users', { username: 'sd_pm', password: 'Sd#Pm#User#2026', role: 'projectManager', projectScope: ['pA'] })).status);
  ok(pmTok === 201 || pmTok === 200, 'مستخدم مدير مشروع');
  const login = await B.page.evaluate(async () => (await (await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'sd_pm', password: 'Sd#Pm#User#2026' }) })).json()));
  const as = (m, u, body, h) => B.page.evaluate(async ([m, u, body, h, t]) => { const res = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t, ...h }, body: body ? JSON.stringify(body) : undefined }); let j = null; try { j = await res.json(); } catch (e) { /* */ } return { status: res.status, body: j }; }, [m, u, body || null, h || {}, login.accessToken]);
  for (const k of ['supervisors', 'drivers']) {
    const lr = await as('GET', `/api/v1/${k}`);
    ok(lr.status === 200 && lr.body.rows.every((p) => !('dailyWage' in p) && !('salary' in p)) && lr.body.hiddenFields.includes('dailyWage') && !lr.body.cards.some((c) => /إجمالي/.test(c.label)), `${k}: القايمة من غير أجور ولا كارت إجمالي`, lr.body && lr.body.hiddenFields);
  }

  console.log('[4] منع التكرار: السيرفر = findEntityDuplicates القديمة');
  const CASES = [
    ['supervisors', 'supervisor', 'مشرف برقم قومي موجود (مؤكد)', { name: 'شخص', nationalId: '28001011234567' }],
    ['supervisors', 'supervisor', 'مشرف بنفس الاسم (تشابه)', { name: 'كريم  عادل' }],
    ['drivers', 'driver', 'سواق برقم موظف (تشابه عبر الأنواع)', { name: 'سواق آخر', nationalId: '27001011234567' }],
    ['drivers', 'driver', 'سواق بنفس الاسم والهاتف (مؤكد)', { name: 'سيد سواق', phone: '' }],
  ];
  for (const [ci, [k, kind, label, form]] of CASES.entries()) {
    const want = await page.evaluate(([kd, f]) => findEntityDuplicates(kd, f, null).map((m) => [m.code, m.name, m.kind, m.strength, m.reasons]), [kind, form]);
    const r = await api(B.page, 'POST', `/api/v1/${k}`, { status: 'active', ...form }, { 'Idempotency-Key': 'sd-dup-case-' + ci });
    const got = r.status === 409 && /^DUPLICATE/.test(r.body.code) ? r.body.matches.map((m) => [m.code, m.name, m.kind, m.strength, m.reasons]) : [];
    eq(got, want, `${label}: نفس المطابقات`);
  }

  eq(B.errors, [], 'no JS errors (B)');
  await B.browser.close();
  eq(errors, [], 'no JS errors');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
