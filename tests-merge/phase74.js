// المرحلة 8 (الحزمة 8.1 — العمال): السيرفر (/api/v1/workers) قصاد الواجهة القديمة نفسها على نفس البيانات (DEC-0121):
//  [1] القراية: لكل مجموعة فلاتر — نفس العمال بنفس الترتيب (filteredWorkers)، ونفس لوحات الأقسام بالأعداد، ونفس الكروت، والملاحظات وعلامة النقص
//  [2] الحفظ (P8.1-H): نافذة العامل القديمة في نسخة (A) = POST/PATCH في نسخة تانية (B) بنفس المدخلات — مؤقت، وشركة، وتعديل بدمج،
//      واستقالة (أرشيف المستقيلين، P8.1-J)، وإعادة تفعيل: العمال وأرشيف المستقيلين والأقسام متطابقين بعد إعادة التحميل
//  [3] الأجور (P8.1-I): مستخدم مالوش صفحة الرواتب أو المستحقات مابيشوفهاش في الـ API، ومايقدرش يبعتها
// بيشتغل في وضع الويب (WEB_MODE=1، وفوق الجداول). في وضع الملف بيتأكد من الدوال القديمة بس.
const { openApp, WEB } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const W = (id, o) => Object.assign({ id, extraFields: [], attachments: [] }, o);
  const seed = {
    users: [baseUser], schemaVersion: 9,
    supervisors: [{ id: 'sv1', code: 'SUP-1', name: 'سامي المشرف', status: 'active' }, { id: 'sv2', code: 'SUP-2', name: 'كريم', status: 'active' }],
    projects: [{ id: 'pA', code: 'PRJ-001', name: 'مشروع الشروق', status: 'active' }],
    leaves: [{ id: 'l1', personKind: 'worker', personId: 'w2', status: 'approved', from: '2020-01-01', to: '2099-01-01' }],
    personDocuments: [{ id: 'pd1', personId: 'w6', docType: 'عقد عمل', attachments: [{ name: 'c.pdf', path: 'x/c.pdf' }] }],
    workers: [
      W('w1', { code: 'WRK-001', name: 'محمد علي', workerType: 'temporary', type: 'temporary', status: 'active', dailyWage: 300, supervisorId: 'sv1', project: 'مشروع الشروق', nationalId: '29001011234567', phone: '0100' }),
      W('w2', { code: 'WRK-002', name: 'أحمد محمود', workerType: 'company', type: 'company', status: 'active', salary: 6000, basicSalary: 6000, dailyWage: 0, position: 'نجار', skill: 'نجار', nationalId: '28501011234567', phone: '0111', address: 'القاهرة',
        idCardExpiry: '2020-01-01', hireDate: '2024-01-01', contractType: 'permanent', contractStatus: 'active', insuranceStatus: 'insured', insuranceNumber: '123' }),
      W('w3', { code: 'WRK-003', name: 'خالد حسن', workerType: 'company', type: 'company', status: 'active', salary: 5000, position: '', attachments: [{ name: 'بطاقة.pdf', docType: 'صورة البطاقة', path: 'x/b.pdf' }] }),
      W('w4', { code: 'WRK-004', name: 'سيد مستقيل', workerType: 'company', type: 'company', status: 'resigned', resignedAt: '2026-01-01', position: 'حداد' }),
      W('w5', { code: '', name: 'عامل يومية', workerType: 'daily', status: 'active', dailyWage: 250.555 }),
      W('w6', { code: 'WRK-010', name: 'محمود سعيد', workerType: 'company', type: 'company', status: 'active', salary: 4000, position: 'سباك', supervisorId: 'sv2', insuranceStatus: 'none', contractStatus: 'expired', idCardExpiry: '2099-01-01', dismissedNotes: ['بدون يومية محددة'] }),
    ],
  };
  const { browser, page, errors } = await openApp(seed);
  const FILTERS = [{}, { status: 'temporary' }, { status: 'active' }, { type: 'company' }, { supervisorId: 'sv1' }, { project: 'الشروق' }, { departmentId: '__core_workers_temp__' },
    { departmentId: '__core_workers_perm__' }, { departmentId: '__none__' }, { q: 'محمد' }, { q: 'محمود' }, { q: '2900' }, { q: 'كريم' }, { xCard: 'expired' }, { xCard: 'none' },
    { xIns: 'insured' }, { xIns: 'none' }, { xData: 'missing' }, { xDocs: 'missing' }, { xDocs: 'complete' }, { status: 'active', q: 'م' }];
  const legacy = await page.evaluate((FILTERS) => FILTERS.map((f) => {
    Object.keys(workerFilters).forEach((k) => { if (k !== '_boardLevel') workerFilters[k] = ''; });
    Object.assign(workerFilters, f);
    return filteredWorkers().map((w) => w.id);
  }), FILTERS);
  await page.evaluate(() => { goToPage('workers'); workerFilters._boardLevel = 'boards'; Object.keys(workerFilters).forEach((k) => { if (k !== '_boardLevel') workerFilters[k] = ''; }); rerenderCurrentPage(); });
  await page.waitForTimeout(200);
  const lBoards = await page.evaluate(() => [...document.querySelectorAll('#app .entity-dept-board')].map((b) => [b.getAttribute('data-dept'), b.querySelector('.lbl').innerText.trim(), Number(b.querySelector('.num').innerText.trim())]));
  const lNotes = await page.evaluate(() => Object.fromEntries(DATA.workers.map((w) => [w.id, personNotesIssues('worker', w)])));
  const lWarn = await page.evaluate(() => Object.fromEntries(DATA.workers.map((w) => { const h = personWarningBadge('worker', w); const m = h.match(/title="([^"]*)"/); return [w.id, m ? m[1].replace(/&amp;/g, '&') : '']; })));
  const lCards = async (dept) => {
    await page.evaluate((d) => { goToPage('workers'); workerFilters._boardLevel = 'list'; Object.keys(workerFilters).forEach((k) => { if (k !== '_boardLevel') workerFilters[k] = ''; }); workerFilters.departmentId = d; workerFilters.categoryId = d; rerenderCurrentPage(); }, dept);
    await page.waitForTimeout(150);
    return page.evaluate(() => [...document.querySelectorAll('#app .sc-row .sc-card')].map((c) => [c.querySelector('.sc-lbl').innerText.trim(),
      c.querySelector('.sc-num') ? c.querySelector('.sc-num').innerText.trim() : [...c.querySelectorAll('.sc-part')].map((p) => p.querySelector('b').innerText.trim()).join('/')]));
  };
  const lc = { all: await lCards(''), temp: await lCards('__core_workers_temp__') };

  console.log('[1] الدوال القديمة (المرجع)');
  eq(legacy[0], ['w2', 'w3', 'w4', 'w5', 'w1', 'w6'], 'الكل بالاسم (localeCompare عربي: «محمد» قبل «محمود»)');
  ok(lBoards.length === 6 && lBoards[0][2] === 6, 'اللوحات', lBoards);

  if (WEB) {
    const api = (pg, m, u, body, h) => pg.evaluate(async ([m, u, body, h]) => {
      const res = await fetch(u, { method: m, headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer ' + WebSession.token(), ...h }, body: body ? JSON.stringify(body) : undefined });
      let j = null; try { j = await res.json(); } catch (e) { /* */ } return { status: res.status, body: j };
    }, [m, u, body || null, h || {}]);
    const fmt = (n) => Number(n).toLocaleString('ar-EG', { maximumFractionDigits: 2 });

    console.log('[1] السيرفر = الصفحة القديمة');
    for (let i = 0; i < FILTERS.length; i++) {
      const qs = Object.entries(FILTERS[i]).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
      const r = await api(page, 'GET', '/api/v1/workers?' + qs);
      ok(r.status === 200 && JSON.stringify(r.body.rows.map((x) => x.id)) === JSON.stringify(legacy[i]), `${JSON.stringify(FILTERS[i])} ← ${legacy[i].length} عامل، نفس الترتيب`, { server: r.body.rows && r.body.rows.map((x) => x.id), legacy: legacy[i] });
    }
    const all = (await api(page, 'GET', '/api/v1/workers')).body;
    eq(all.boards.map((b) => [b.id, b.name, b.count]), lBoards, 'لوحات الأقسام بالترتيب والأعداد');
    eq(Object.fromEntries(all.rows.map((w) => [w.id, w.issues])), lNotes, 'الملاحظات (personNotesIssues) لكل عامل');
    eq(Object.fromEntries(all.rows.map((w) => [w.id, w.warning])), lWarn, 'علامة النقص ⚠️ (البيانات والأوراق)');
    const sc = (cards) => cards.map((c) => [c.label, c.parts ? c.parts.map((p) => fmt(p.n)).join('/') : (typeof c.value === 'number' ? (/إجمالي/.test(c.label) ? fmt(c.value) + ' ج.م' : fmt(c.value)) : c.value)]);
    eq(sc(all.cards), lc.all, 'الكروت (الكل)');
    eq(sc((await api(page, 'GET', '/api/v1/workers?departmentId=__core_workers_temp__')).body.cards), lc.temp, 'الكروت (عمالة مؤقتة: إجمالي اليوميات)');

    console.log('[2] الحفظ: النافذة القديمة (A) = الـ API (B)');
    const B = await openApp(seed);
    const today = await page.evaluate(() => todayISO());
    const snapshot = (pg) => pg.evaluate(() => {
      const strip = (o) => JSON.parse(JSON.stringify(o, (k, v) => (/^_/.test(k) || k === 'movedAt' ? undefined : v)));
      const sortId = (xs) => (xs || []).slice().sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
      return strip({ workers: sortId(DATA.workers).map(({ id, ...w }) => ({ ...w, id: /^w\d$/.test(id) ? id : 'NEW' })), archive: sortId(DATA.resignedArchive).map(({ id, entity, ...a }) => ({ ...a, personId: /^w\d$/.test(a.personId) ? a.personId : 'NEW', entity: entity && { ...entity, id: undefined } })),
        depts: sortId((DATA.departments || []).filter((d) => /resigned|retired/.test(d.id))) });
    });
    const reload = async (pg) => { await pg.reload(); await pg.waitForFunction(() => typeof DATA !== 'undefined' && window.WebSync && WebSync._state.meta && Array.isArray(DATA.workers) && DATA.workers.length > 0, null, { timeout: 30000 }); await pg.waitForTimeout(300); };
    const open = async (id, opts) => { await page.evaluate(() => { try { closeModal(); } catch (e) { /* */ } }); await page.waitForTimeout(250); await page.evaluate(([i, o]) => openWorkerModal(i || null, o || undefined), [id || '', opts || null]); await page.waitForSelector('#appModal:not(.modal-overlay-out) #btnSaveWrk'); await page.waitForTimeout(200); };
    const save = async () => { const n = await page.evaluate(() => window.__saveCount); await page.click('#btnSaveWrk'); await page.waitForFunction((x) => window.__saveCount > x, n, { timeout: 15000 }); };
    // A: مؤقت
    await open('', { defaultType: 'temporary' });
    await page.fill('#wrkName', ' عامل جديد '); await page.fill('#wrkWageTemp', '275.555'); await page.fill('#wrkNidTemp', ' 29912 '); await page.fill('#wrkPhoneTemp', '0122'); await page.fill('#wrkPosTemp', 'مساعد');
    await page.evaluate(() => { document.getElementById('wrkSupervisor').value = 'sv1'; });
    await save();
    // A: شركة (كود مكرر)
    await open('', { defaultType: 'company' });
    await page.fill('#wrkName', 'عامل شركة'); await page.fill('#wrkCode', 'WRK-002'); await page.fill('#wrkNid', '27001011234567'); await page.fill('#wrkPhone', '0155'); await page.fill('#wrkPos', 'سباك');
    await page.fill('#wrkIdCardExp', '2020-05-01'); await page.fill('#wrkSalary', '7000.333'); await page.fill('#wrkAddress', 'الجيزة');
    const hire = await page.evaluate(() => (document.getElementById('wrkHire') || {}).value || '');
    await save();
    // A: تعديل بدمج، واستقالة، وإعادة تفعيل
    await open('w2'); await page.fill('#wrkPhone', ''); await page.fill('#wrkAddress', 'الإسكندرية'); await save();
    await open('w3'); await page.selectOption('#wrkStatus', 'resigned'); await save();
    await open('w6'); await page.selectOption('#wrkStatus', 'resigned'); await save();
    await open('w6'); await page.selectOption('#wrkStatus', 'active'); await save();
    // B: نفس المدخلات بالـ API
    const key = () => ({ 'Idempotency-Key': 'wk-' + Math.random().toString(36).slice(2) });
    eq((await api(B.page, 'POST', '/api/v1/workers', { workerType: 'temporary', name: ' عامل جديد ', code: 'WRK-006', status: '', supervisorId: 'sv1', position: 'مساعد', nationalId: ' 29912 ', phone: '0122', address: '', project: '', dailyWage: '275.555', notes: '' }, key())).status, 201, 'POST مؤقت');
    eq((await api(B.page, 'POST', '/api/v1/workers', { workerType: 'company', name: 'عامل شركة', code: 'WRK-002', status: '', supervisorId: '', position: 'سباك', nationalId: '27001011234567', phone: '0155', address: 'الجيزة', project: '',
      birthDate: '', idCardExpiry: '2020-05-01', hireDate: hire, contractType: '', contractStatus: '', insuranceNumber: '', insuranceStatus: '', salary: '7000.333', notes: '', extraFields: [] }, key())).status, 201, 'POST شركة');
    const edit = async (id, over) => {
      const w = (await api(B.page, 'GET', '/api/v1/workers/' + id)).body;
      const temp = /temporary|temp|daily|مؤقت|يومية|يوميه/.test(String(w.workerType || w.type || '').toLowerCase()) || (!w.salary && !w.basicSalary && w.dailyWage && !/company/.test(w.workerType || ''));
      return api(B.page, 'PATCH', '/api/v1/workers/' + id, { rev: w.rev, workerType: temp ? 'temporary' : 'company', code: w.code || '', name: w.name || '', status: w.status || '', supervisorId: w.supervisorId || '', position: w.skill || w.position || w.jobTitle || '',
        nationalId: w.nationalId || '', phone: w.phone || '', address: w.address || '', project: w.project || '', dailyWage: temp ? String(w.dailyWage ?? '') : '', notes: w.notes || '', birthDate: w.birthDate || '',
        idCardExpiry: w.idCardExpiry || '', hireDate: w.hireDate || '', contractType: w.contractType || '', contractStatus: w.contractStatus || '', insuranceNumber: w.insuranceNumber || '', insuranceStatus: w.insuranceStatus || '',
        salary: temp ? '' : String(w.salary || w.basicSalary || ''), extraFields: Array.isArray(w.extraFields) ? w.extraFields : [], ...over });
    };
    eq((await edit('w2', { phone: '', address: 'الإسكندرية' })).status, 200, 'PATCH دمج');
    eq((await edit('w3', { status: 'resigned' })).status, 200, 'PATCH استقالة');
    eq((await edit('w6', { status: 'resigned' })).status, 200, 'PATCH استقالة 2');
    eq((await edit('w6', { status: 'active' })).status, 200, 'PATCH إعادة تفعيل');
    await reload(page); await reload(B.page);
    const a = await snapshot(page), b = await snapshot(B.page);
    for (const w of a.workers) eq(b.workers.find((x) => x.name === w.name), w, `العامل «${w.name}»: نفس السجل في الاتنين`);
    eq(b.archive, a.archive, 'أرشيف المستقيلين: نفس اللقطات');
    eq(b.depts, a.depts, 'أقسام المستقيلين والمعاشات');
    ok(a.workers.find((w) => w.name === 'خالد حسن').departmentId === '__resigned_worker__' && a.archive.some((x) => x.personId === 'w3'), 'تأكيد: المستقيل في قسمه وفي الأرشيف');
    const ev = (await api(B.page, 'GET', '/api/v1/workers/w6')).body.events.map((e) => e.type);
    eq(ev, ['worker.saved', 'worker.saved'], 'حدث worker.saved مع كل حفظ');
    const stale = await edit('w2', { rev: 1, notes: 'x' });
    eq([stale.status, stale.body.code], [409, 'CONFLICT'], 'rev قديم ← تعارض صريح');

    console.log('[3] الأجور (B-48)');
    const pmTok = await B.page.evaluate(async () => {
      const r = await WebSession.api('POST', '/api/users', { username: 'wk_pm', password: 'Wk#Pm#User#2026', role: 'projectManager', projectScope: ['pA'] });
      return r.status;
    });
    ok(pmTok === 201 || pmTok === 200, 'مستخدم مدير مشروع');
    const login = await B.page.evaluate(async () => (await (await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'wk_pm', password: 'Wk#Pm#User#2026' }) })).json()));
    const as = (m, u, body, h) => B.page.evaluate(async ([m, u, body, h, t]) => { const res = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t, ...h }, body: body ? JSON.stringify(body) : undefined }); let j = null; try { j = await res.json(); } catch (e) { /* */ } return { status: res.status, body: j }; }, [m, u, body || null, h || {}, login.accessToken]);
    const lr = await as('GET', '/api/v1/workers');
    ok(lr.status === 200 && lr.body.rows.length >= 0 && lr.body.rows.every((w) => !('dailyWage' in w) && !('salary' in w)) && lr.body.hiddenFields.includes('dailyWage') && !lr.body.cards.some((c) => /إجمالي/.test(c.label)), 'القايمة من غير الأجور ولا كارت الإجمالي', lr.body.rows && lr.body.rows.map((w) => Object.keys(w).filter((k) => /Wage|alary/.test(k))));
    eq((await as('POST', '/api/v1/workers', { workerType: 'temporary', name: 'x', dailyWage: '100' }, key())).body.code, lr.status === 200 && login.user && login.user.permissions.pages.workers && login.user.permissions.pages.workers.add ? 'FIELD_FORBIDDEN' : 'FORBIDDEN', 'إرسال أجر من غير صلاحيته ← مرفوض');

    eq(B.errors, [], 'no JS errors (B)');
    await B.browser.close();
  } else ok(true, 'وضع الملف: مقارنة السيرفر بتتعمل في WEB_MODE=1');

  eq(errors, [], 'no JS errors');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
