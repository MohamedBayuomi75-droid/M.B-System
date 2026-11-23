// المرحلة 7 (الحزمة 7.4 — المشروعات): السيرفر (/api/v1/projects) قصاد الواجهة القديمة نفسها على نفس البيانات (DEC-0117):
//  [1] القراءة: لكل مجموعة فلاتر — نفس المشاريع بنفس الترتيب، ونفس الكروت، والمرحلة المعروضة، والقيمة، والموارد (مشرفين/عمال/معدات)
//  [2] الإضافة: نافذة المشروع القديمة (نسخة A) = POST في نسخة تانية (B) بنفس المدخلات — نفس السجل بالظبط (ما عدا المعرّف)
//  [3] التعديل: تغيير الاسم + المشرف (P7.4-H) وتغيير المرحلة (P7.4-I) — كل المجموعات المربوطة في A = B بعد إعادة التحميل
// بيشتغل في وضع الويب (WEB_MODE=1، وفوق الجداول). في وضع الملف بيتأكد من الدوال القديمة بس.
const { openApp, WEB } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const seed = {
    users: [baseUser], schemaVersion: 9,
    projects: [
      { id: 'pA', code: 'PRJ-001', name: 'مشروع الشروق', status: 'active', budget: 50000, supervisorId: 'sv1', notes: 'شروق', customerId: 'cA', customerName: 'شركة الأمل', customer: 'شركة الأمل', extraFields: [] },
      { id: 'pB', code: 'PRJ-002', name: 'مشروع النور', status: 'المستخلصات', value: 20000.555, budget: 15000, stageKey: 'invoices', stepKey: 'prep_invoice', completedSteps: ['tech_inspect'], contractNo: 'ع-7', extraFields: [] },
      { id: 'pC', code: 'PRJ-005', name: 'برج مكتمل', status: 'completed', extraFields: [] },
      { id: 'pD', code: '', name: 'أبراج متوقفة', status: 'paused', customerName: 'عميل قديم', extraFields: [] },
      { id: 'pE', code: 'X-9', name: 'فيلا التجمع', status: 'جاري التنفيذ', value: 0, budget: '', progress: 30, tenderStance: 'rejected', stepMeta: { boq: { dueDate: '2020-01-01' } }, extraFields: [] },
      { id: 'pF', code: 'PRJ-010', name: 'مشروع بلا حالة', status: '', customerId: 'cB', customerName: 'مؤسسة النور', extraFields: [] },
    ],
    supervisors: [{ id: 'sv1', code: 'SUP-1', name: 'سامي المشرف', status: 'active', project: '' }, { id: 'sv2', code: 'SUP-2', name: 'كريم', status: 'active', project: 'فيلا التجمع' }],
    workers: [
      { id: 'w1', code: 'W1', name: 'عامل أول', status: 'active', project: 'مشروع الشروق', projectId: 'pA', supervisorId: 'sv1' },
      { id: 'w2', code: 'W2', name: 'عامل موقوف', status: 'inactive', project: 'مشروع الشروق', projectId: 'pA' },
      { id: 'w3', code: 'W3', name: 'عامل تالت', status: 'active', project: 'فيلا التجمع' },
    ],
    equipment: [{ id: 'eq1', code: 'EQ1', name: 'لودر', status: 'active', project: 'مشروع النور', projectId: 'pB' }, { id: 'eq2', code: 'EQ2', name: 'قديم', status: 'retired', project: 'مشروع الشروق' }],
    drivers: [{ id: 'd1', code: 'D1', name: 'سواق', status: 'active', project: 'برج مكتمل' }],
    expenses: [
      { id: 'e1', project: 'مشروع الشروق', projectId: 'pA', amount: 10, date: '2026-01-01' },
      { id: 'e2', project: 'مشروع  الشروق', amount: 5, date: '2026-01-02' },
      { id: 'e3', project: 'مشروع مجهول', amount: 1, date: '2026-01-03' },
    ],
    resourceTransfers: [{ id: 't1', fromProject: 'مشروع الشروق', toProject: 'مشروع النور', date: '2026-01-01' }],
    ledger: {
      suppliers: [{ id: 's1', name: 'مورد', extraFields: [], attachments: [] }],
      invoices: [{ id: 'i1', supplierId: 's1', invoiceNo: 'F-1', date: '2026-01-10', project: 'مشروع الشروق', projectId: 'pA', baseValue: 100, vat: 0, stampDuty: 0, withheld: 0, totalInvoice: 100, netInvoice: 100, isReturn: false, attachments: [] }],
      payments: [],
    },
    clients: { customers: [
      { id: 'cA', name: 'شركة الأمل', code: 'C1', status: 'active', projects: [], boqs: [{ id: 'B-1', code: 'B-1', name: 'مقايسة', project: 'مشروع الشروق', items: [] }], workSurveys: [], collections: [], invoices: [],
        contracts: [{ id: 'CON-001', title: 'عقد الشروق', project: 'مشروع الشروق', projectId: 'pA', value: 1000, notes: '' }] },
      { id: 'cB', name: 'مؤسسة النور', code: 'C2', status: 'active', projects: [], boqs: [], workSurveys: [], collections: [], invoices: [], contracts: [] },
    ] },
  };
  const { browser, page, errors } = await openApp(seed);
  const FILTERS = [{}, { q: 'الشروق' }, { q: 'سامي' }, { q: 'كريم' }, { q: 'التنفيذ' }, { q: 'ع-7' }, { q: 'شركه الامل' }, { stageSel: 'التنفيذ والمتابعة' }, { stageSel: 'مكتمل' },
    { stageSel: 'الدراسة والتخطيط' }, { status: 'التنفيذ والمتابعة' }, { status: 'التنفيذ والمتابعة', customerId: 'cA' }, { status: 'متوقف', customerId: 'عميل قديم' },
    { hasRes: 'with' }, { hasRes: 'empty' }, { budget: 'none' }, { q: 'مشروع', hasRes: 'empty' }];
  const legacy = [];
  for (const f of FILTERS) {
    await page.evaluate((x) => { goToPage('projects'); Object.assign(projectFilters, { q: '', status: '', stageSel: '', customerId: '', detailId: '', hasRes: '', budget: '' }, x); rerenderCurrentPage(); }, f);
    await page.waitForTimeout(80);
    legacy.push(await page.evaluate(() => {
      const ids = [...document.querySelectorAll('#app .btn-edit-proj')].map((b) => b.getAttribute('data-id'));
      const res = [...document.querySelectorAll('#app .data-table tbody tr')].filter((tr) => tr.querySelector('.btn-edit-proj')).map((tr) => tr.children[6].innerText.trim());
      const cards = [...document.querySelectorAll('#app .stats-row .stat-card')].map((c) => c.querySelector('.num').innerText.trim());
      return { ids, res, cards, stages: ids.map((id) => normalizeProjectStatus(DATA.projects.find((p) => p.id === id))), vals: ids.map((id) => { const p = DATA.projects.find((x) => x.id === id); return toInt(p.value || p.budget); }) };
    }));
  }

  console.log('[1] الدوال القديمة (المرجع)');
  eq(legacy[0].ids, ['pD', 'pC', 'pE', 'pA', 'pB', 'pF'], 'الكل بالاسم (localeCompare عربي)');
  eq(legacy[0].stages, ['متوقف', 'مكتمل', 'التنفيذ والمتابعة', 'التنفيذ والمتابعة', 'المستخلصات', 'الدراسة والتخطيط'], 'المرحلة المعروضة: paused/completed/مرادف/active/زي ما هي/فاضية ← أول مرحلة');

  if (WEB) {
    console.log('[1] السيرفر = الصفحة القديمة لكل مجموعة فلاتر');
    const fmt = (n) => n.toLocaleString('ar-EG', { maximumFractionDigits: 2 });
    for (let i = 0; i < FILTERS.length; i++) {
      const qs = Object.entries(FILTERS[i]).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
      const r = await page.evaluate((qs) => WebSession.api('GET', '/api/v1/projects?' + qs), qs);
      const b = r.body, L = legacy[i];
      const res = (b.rows || []).map((x) => `${x.resources.supervisors}/${x.resources.workers}/${x.resources.equipment}`);
      const cards = b.cards ? (b.cards.inSection ? [String(b.cards.count), String(b.cards.customers), null, fmt(b.cards.totalValue) + ' ج.م'] : [String(b.cards.count), String(b.cards.active), String(b.cards.done), fmt(b.cards.totalValue) + ' ج.م', String(b.cards.shown)]) : [];
      const lc = L.cards.map((x, k) => (b.cards && b.cards.inSection && k === 2 ? null : x)); // «التكلفة اللحظية» (F-12) مش في السيرفر — د-6
      ok(r.status === 200 && JSON.stringify(b.rows.map((x) => x.id)) === JSON.stringify(L.ids) && JSON.stringify(b.rows.map((x) => x.stage)) === JSON.stringify(L.stages)
        && JSON.stringify(b.rows.map((x) => x.shownValue)) === JSON.stringify(L.vals) && JSON.stringify(res) === JSON.stringify(L.res) && JSON.stringify(cards) === JSON.stringify(lc),
      `${JSON.stringify(FILTERS[i])} ← ${L.ids.length} مشروع، نفس الترتيب والمرحلة والقيمة والموارد والكروت`, { server: { ids: b.rows && b.rows.map((x) => x.id), res, cards }, legacy: { ids: L.ids, res: L.res, cards: lc } });
    }
    const pe = (await page.evaluate(() => WebSession.api('GET', '/api/v1/projects'))).body.rows.find((x) => x.id === 'pE');
    const legacyIssues = await page.evaluate(() => projectNotesIssues(DATA.projects.find((p) => p.id === 'pE')));
    eq(pe.issues, legacyIssues.filter((x) => !/ميزانية$/.test(x) || x === 'ناقص: قيمة/ميزانية'), 'الملاحظات = projectNotesIssues (من غير تنبيه الميزانية — F-12)');

    console.log('[2] الإضافة: النافذة القديمة (A) = POST (B)');
    const B = await openApp(seed);
    const api = (pg, m, u, body, h) => pg.evaluate(async ([m, u, body, h]) => {
      const res = await fetch(u, { method: m, headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer ' + WebSession.token(), ...h }, body: body ? JSON.stringify(body) : undefined });
      let j = null; try { j = await res.json(); } catch (e) { /* */ }
      return { status: res.status, body: j };
    }, [m, u, body || null, h || {}]);
    const snapshot = (pg, colls) => pg.evaluate((colls) => {
      const strip = (o) => JSON.parse(JSON.stringify(o, (k, v) => (/^_/.test(k) || k === 'updatedAt' || k === 'at' ? undefined : v)));
      const get = (path) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), DATA);
      return Object.fromEntries(colls.map((c) => [c, strip((get(c) || []).map((x) => (x && x.pathHistory ? { ...x, pathHistory: x.pathHistory.map(({ id, ...h }) => h) } : x)).slice().sort((a, b) => String(a.id).localeCompare(String(b.id))))]));
    }, colls);
    const reload = async (pg) => { await pg.reload(); await pg.waitForFunction(() => typeof DATA !== 'undefined' && window.WebSync && WebSync._state.meta && Array.isArray(DATA.projects) && DATA.projects.length > 0, null, { timeout: 30000 }); await pg.waitForTimeout(300); };
    const open = async (id) => { await page.evaluate(() => { try { closeModal(); } catch (e) { /* */ } }); await page.waitForTimeout(250); await page.evaluate((i) => { goToPage('projects'); openProjectModal(i || undefined); }, id || ''); await page.waitForSelector('#appModal:not(.modal-overlay-out) #btnSavePr');
      // على CI البطيء: نستنى النافذة تستقر بقيم السجل قبل الكتابة (وإلا الكتابة بتقع في خانة الكود)
      if (id) await page.waitForFunction((i) => { const p = DATA.projects.find((x) => x.id === i), n = document.getElementById('prName'); return p && n && n.value === p.name; }, id, { timeout: 15000 });
      await page.waitForTimeout(150); };
    const setName = async (v) => { await page.fill('#prName', v); await page.waitForFunction((x) => document.getElementById('prName').value === x, v); };
    const save = async () => { const n = await page.evaluate(() => window.__saveCount); await page.click('#btnSavePr'); await page.waitForFunction((x) => window.__saveCount > x, n, { timeout: 15000 }); };
    await open();
    const today = await page.evaluate(() => document.getElementById('prStart').value);
    await page.fill('#prName', 'مشروع جديد'); await page.selectOption('#prCustomerId', 'cB'); await page.fill('#prValue', '1000.555'); await page.fill('#prProgress', '-5');
    await page.fill('#prContractNo', ' ع-1 '); await page.fill('#prAssigned', ' أحمد '); await page.selectOption('#prStatus', 'التعاقد');
    await page.evaluate(() => { document.getElementById('prSup').value = 'sv2'; });
    await save();
    const r2 = await api(B.page, 'POST', '/api/v1/projects', { name: 'مشروع جديد', customerId: 'cB', value: '1000.555', budget: '', progress: '-5', contractNo: ' ع-1 ', assignedTo: ' أحمد ', status: 'التعاقد', supervisorId: 'sv2', start: today, end: '', code: '', notes: '', extraFields: [] }, { 'Idempotency-Key': 'pj-create-1' });
    if (r2.status !== 201) console.log(JSON.stringify(r2.body));
    eq(r2.status, 201, 'POST 201');
    await reload(page); await reload(B.page);
    const COLLS = ['projects', 'supervisors', 'workers', 'equipment', 'drivers', 'expenses', 'resourceTransfers', 'ledger.invoices', 'clients.customers'];
    // معرّف المشروع الجديد عشوائي في كل نسخة ← «NEW» في كل مكان بيظهر فيه (المشروع نفسه، وprojectId في السجلات المربوطة)
    const norm = (snap) => { const nid = (snap.projects.find((p) => p.name === 'مشروع جديد') || {}).id; return nid ? JSON.parse(JSON.stringify(snap).split(JSON.stringify(nid)).join('"NEW"')) : snap; };
    let a = norm(await snapshot(page, COLLS)), b = norm(await snapshot(B.page, COLLS));
    eq(b.projects.find((p) => p.id === 'NEW'), a.projects.find((p) => p.id === 'NEW'), 'نفس السجل الجديد (الكود التلقائي، والتقريب، والتقدم محصور، والعميل، والمرحلة)');
    eq(b.supervisors, a.supervisors, 'المشرف المختار اتكتب عليه اسم المشروع في الاتنين');
    eq(r2.body.events.map((e) => e.type), ['project.saved'], 'حدث project.saved');

    console.log('[3] التعديل: تغيير الاسم والمرحلة (A = B)');
    // A: النافذة القديمة
    await open('pA'); const codeBefore = await page.evaluate(() => document.getElementById('prCode') && document.getElementById('prCode').value); await setName('الشروق الجديد');
    if (codeBefore != null) await page.waitForFunction((c) => document.getElementById('prCode').value === c, codeBefore);
    await save();
    await open('pB'); await page.selectOption('#prStatus', 'التسليم الابتدائي'); await save();
    await open('pE'); await page.selectOption('#prStatus', 'المستخلصات'); await save();
    // B: الـ API بنفس الخانات اللي النافذة بتبعتها
    const form = async (id, over) => {
      const p = (await api(B.page, 'GET', '/api/v1/projects/' + id)).body;
      const o = (await api(B.page, 'GET', '/api/v1/projects/form-options?id=' + id)).body;
      const st = over.status || o.current;
      return { rev: p.rev, code: p.code || '', name: p.name, customerId: p.customerId || (o.customers.find((c) => c.name === p.customerName) || {}).id || '', contractNo: p.contractNo || '', value: String(p.value != null && p.value !== '' ? p.value : (p.budget || '')),
        budget: String(p.budget != null ? p.budget : 0), start: p.start || today, end: p.end || '', progress: p.progress != null ? String(p.progress) : '', status: st, supervisorId: p.supervisorId || '', assignedTo: p.assignedTo || '', notes: p.notes || '', extraFields: p.extraFields || [], ...over };
    };
    let u = await api(B.page, 'PATCH', '/api/v1/projects/pA', await form('pA', { name: 'الشروق الجديد' }));
    ok(u.status === 200 && u.body.propagated > 0, `تغيير الاسم: 200، واتنشر على ${u.body.propagated} سجل`, u.body);
    u = await api(B.page, 'PATCH', '/api/v1/projects/pB', await form('pB', { status: 'التسليم الابتدائي' }));
    ok(u.status === 200 && u.body.stageMoved === true, 'تغيير المرحلة حرّك المسار', u.body);
    u = await api(B.page, 'PATCH', '/api/v1/projects/pE', await form('pE', { status: 'المستخلصات' }));
    eq([u.status, u.body.stageMoved], [200, false], 'مشروع مالوش stageKey: الحالة بس، والمسار مابيتحرّكش (زي القديم)');
    await reload(page); await reload(B.page);
    a = norm(await snapshot(page, COLLS)); b = norm(await snapshot(B.page, COLLS));
    for (const c of COLLS) eq(b[c], a[c], `${c}: نفس النتيجة في الاتنين`);
    eq(a.workers.find((w) => w.id === 'w2').project, 'الشروق الجديد', 'تأكيد: الاسم الجديد وصل للسجلات المربوطة');
    const stale = await api(B.page, 'PATCH', '/api/v1/projects/pA', await form('pA', { rev: 1, notes: 'x' }));
    eq([stale.status, stale.body.code], [409, 'CONFLICT'], 'rev قديم ← تعارض صريح');
    const dup = await api(B.page, 'POST', '/api/v1/projects', { name: 'مشروع   النور', customerId: 'cA' }, { 'Idempotency-Key': 'pj-dup-1' });
    eq([dup.status, dup.body.code], [409, 'DUPLICATE_NAME'], 'الاسم المكرر (بعد التطبيع) مرفوض');
    eq(B.errors, [], 'no JS errors (B)');
    await B.browser.close();
  } else ok(true, 'وضع الملف: مقارنة السيرفر بتتعمل في WEB_MODE=1');

  eq(errors, [], 'no JS errors');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
