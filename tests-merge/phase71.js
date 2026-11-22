// المرحلة 7 (الحزمة 7.4 — المشروعات): اختبارات قبول للواجهة القديمة (DEC-0086، DEC-0117).
// القيم المتوقعة = السلوك الحالي (LEGACY-PRESERVE)، وده المرجع اللي السيرفر والشاشة الجديدة بيتقارنوا بيه:
//  [1] normalizeProjectStatus / pwCanonicalStatus: active ← «التنفيذ والمتابعة»، والمرادفات القديمة، والفاضي ← أول مرحلة
//  [2] صفحة المشروعات (renderProjectsPage): البحث (والمشرف)، وفلتر المرحلة، والقسم والعميل، و«الموارد»، و«بدون ميزانية»،
//      والكروت، وعمود الموارد (resourcesOnProject)، والترتيب بالاسم
//  [3] نافذة المشروع (openProjectModal) — إضافة: الكود التلقائي (nextProjectCode)، والاسم والعميل مطلوبين، ومنع تكرار الاسم
//      (بعد التطبيع) والكود، والتقريب لخانتين (toInt)، والميزانية = القيمة لو فاضية، والمرحلة الافتراضية
//  [4] التعديل — تغيير الاسم: projLinkAll + clRenameProjectRefs + مجموعات الموارد + المشرف (sup.project)
//  [5] التعديل — تغيير المرحلة: pwOnStatusChanged بيحرّك موضع المسار ويسجّل، والمراحل النهائية مابتحرّكش، والمشروع اللي
//      مالوش stageKey مابيتحرّكش (الحالة الجديدة بتتكتب قبل الاستدعاء)
//  [6] الحذف: ممنوع وهو مربوط بعقد (clProjectLinks)، ومسموح غير كده بعد التأكيد
// بيشتغل في وضع الملف والويب (WEB_MODE=1) وفوق الجداول.
const { openApp } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const seed = {
    users: [baseUser], schemaVersion: 9,
    projects: [
      { id: 'pA', code: 'PRJ-001', name: 'مشروع الشروق', status: 'active', budget: 50000, supervisorId: 'sv1', notes: 'ملاحظة شروق', customerId: 'cA', customerName: 'شركة الأمل', extraFields: [] },
      { id: 'pB', code: 'PRJ-002', name: 'مشروع النور', status: 'المستخلصات', value: 20000, budget: 15000, stageKey: 'invoices', stepKey: 'prep_invoice', extraFields: [] },
      { id: 'pC', code: 'PRJ-005', name: 'مشروع مكتمل', status: 'completed', extraFields: [] },
      { id: 'pD', code: '', name: 'أبراج متوقفة', status: 'paused', extraFields: [] },
    ],
    supervisors: [{ id: 'sv1', code: 'SUP-1', name: 'سامي المشرف', status: 'active', project: '' }],
    workers: [
      { id: 'w1', code: 'W1', name: 'عامل أول', status: 'active', project: 'مشروع الشروق', projectId: 'pA', supervisorId: 'sv1' },
      { id: 'w2', code: 'W2', name: 'عامل موقوف', status: 'inactive', project: 'مشروع الشروق', projectId: 'pA' },
    ],
    equipment: [{ id: 'eq1', code: 'EQ1', name: 'لودر', status: 'active', project: 'مشروع النور', projectId: 'pB' }],
    expenses: [
      { id: 'e1', project: 'مشروع الشروق', projectId: 'pA', amount: 10, date: '2026-01-01' },
      { id: 'e2', project: 'مشروع  الشروق', amount: 5, date: '2026-01-02' }, // اسم بمسافتين ومن غير معرّف: بيتربط بالتطبيع
      { id: 'e3', project: 'مشروع مجهول', amount: 1, date: '2026-01-03' },
    ],
    ledger: {
      suppliers: [{ id: 's1', name: 'مورد', extraFields: [], attachments: [] }],
      invoices: [{ id: 'i1', supplierId: 's1', invoiceNo: 'F-1', date: '2026-01-10', project: 'مشروع الشروق', projectId: 'pA', baseValue: 100, vat: 0, stampDuty: 0, withheld: 0, totalInvoice: 100, netInvoice: 100, isReturn: false, attachments: [] }],
      payments: [],
    },
    clients: { customers: [{ id: 'cA', name: 'شركة الأمل', code: 'C1', status: 'active', projects: [], boqs: [], workSurveys: [], collections: [], invoices: [],
      contracts: [{ id: 'CON-001', title: 'عقد الشروق', project: 'مشروع الشروق', projectId: 'pA', value: 1000, notes: '' }] }] },
  };
  const { browser, page, errors } = await openApp(seed);
  const saved = (n) => page.waitForFunction((x) => window.__saveCount > x, n, { timeout: 15000 });
  const P = (id) => page.evaluate((i) => JSON.parse(JSON.stringify(DATA.projects.find((p) => p.id === i) || null)), id);
  const rows = () => page.evaluate(() => [...document.querySelectorAll('#app .data-table tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.trim())).filter((r) => r.length > 2));
  const view = async (f) => {
    await page.evaluate((x) => { goToPage('projects'); Object.assign(projectFilters, { q: '', status: '', stageSel: '', customerId: '', detailId: '', hasRes: '', budget: '' }, x); rerenderCurrentPage(); }, f || {});
    await page.waitForTimeout(150);
    return rows();
  };
  const open = async (id) => { await page.evaluate(() => closeModal()); await page.waitForTimeout(250); await page.evaluate((i) => openProjectModal(i || undefined), id || ''); await page.waitForSelector('#appModal:not(.modal-overlay-out) #btnSavePr'); };
  const toast = () => page.evaluate(() => (document.getElementById('appToast') || {}).textContent || '');

  console.log('[1] normalizeProjectStatus / pwCanonicalStatus');
  await view(); // الصفحة بتزامن قايمة المراحل مع المسار المعتمد (pwApplyStagesToProjectList) قبل أي تطبيع — زي الاستخدام الفعلي
  eq(await page.evaluate(() => ['active', 'completed', 'paused', '', 'جاري التنفيذ', 'التسليم النهائي', 'المستخلصات', 'حالة غريبة'].map((s) => normalizeProjectStatus({ status: s }))),
    ['التنفيذ والمتابعة', 'مكتمل', 'متوقف', 'الدراسة والتخطيط', 'التنفيذ والمتابعة', 'الإغلاق والتسليم النهائي', 'المستخلصات', 'حالة غريبة'],
    'القديم (HR) بيتحوّل لمرحلة، والمرادفات بتتحوّل لاسم المرحلة المعتمد، والمجهول بيفضل زي ما هو');

  console.log('[2] صفحة المشروعات: الفلاتر والكروت والأعمدة');
  let r = await view();
  eq(r.map((x) => x[1].split('\n')[0]), ['أبراج متوقفة', 'مشروع الشروق', 'مشروع النور', 'مشروع مكتمل'], 'الترتيب بالاسم (sortByNameAr)');
  const sh = r.find((x) => x[1].startsWith('مشروع الشروق'));
  eq([sh[0], sh[2], sh[3], sh[4], sh[5], sh[6]], ['PRJ-001', 'شركة الأمل', 'التنفيذ والمتابعة', '٥٠٬٠٠٠ ج.م', '—', '1/1/0'],
    'الكود، والعميل، والمرحلة، والقيمة (الميزانية لو مفيش قيمة)، والتقدم، والموارد مشرفين/عمال/معدات (العامل الموقوف مش محسوب، والمشرف من العامل)');
  eq(r.find((x) => x[1].startsWith('أبراج'))[0], '—', 'الكود الفاضي «—»');
  const stats = await page.evaluate(() => [...document.querySelectorAll('#app .stats-row .stat-card')].map((c) => [c.querySelector('.lbl').innerText.trim(), c.querySelector('.num').innerText.trim()]));
  eq(stats, [['كل المشاريع', '4'], ['جارٍ العمل', '2'], ['مكتمل', '1'], ['إجمالي القيم', '٧٠٬٠٠٠ ج.م'], ['نتيجة البحث', '4']], 'الكروت: الكل، وجارٍ العمل (مش مكتمل/متوقف/ملغي)، والمكتمل، وإجمالي القيمة أو الميزانية');
  eq((await view({ q: 'الشروق' })).map((x) => x[0]), ['PRJ-001'], 'البحث بالاسم');
  eq((await view({ q: 'سامي' })).map((x) => x[0]), ['PRJ-001'], 'البحث باسم المشرف');
  eq((await view({ q: 'التنفيذ' })).map((x) => x[0]), ['PRJ-001'], 'البحث بالمرحلة المعروضة');
  eq((await view({ stageSel: 'المستخلصات' })).map((x) => x[0]), ['PRJ-002'], 'فلتر المرحلة');
  eq((await view({ hasRes: 'with' })).map((x) => x[0]), ['PRJ-001', 'PRJ-002'], 'عليه موارد');
  eq((await view({ hasRes: 'empty' })).map((x) => x[0]), ['—', 'PRJ-005'], 'من غير موارد');
  eq((await view({ budget: 'none' })).map((x) => x[0]), ['—', 'PRJ-005'], 'من غير ميزانية ولا قيمة');
  eq((await view({ status: 'التنفيذ والمتابعة' })).map((x) => x[0]), ['PRJ-001'], 'قسم المرحلة في القايمة الجانبية');
  eq((await view({ status: 'التنفيذ والمتابعة', customerId: 'cX' })).length, 0, 'فلتر العميل جوه القسم');

  console.log('[3] نافذة المشروع: الإضافة والتحقق');
  eq(await page.evaluate(() => nextProjectCode()), 'PRJ-006', 'الكود التلقائي = أكبر رقم + 1 بتلات خانات');
  const trySave = async () => { const n = await page.evaluate(() => window.__saveCount); await page.click('#btnSavePr'); await page.waitForTimeout(250); return (await page.evaluate(() => window.__saveCount)) > n; };
  await open();
  eq(await page.evaluate(() => [document.getElementById('prCode').value, document.getElementById('prStatus').value, document.getElementById('prStart').value]), ['PRJ-006', 'الدراسة والتخطيط', today], 'القيم الافتراضية: الكود، وأول مرحلة، وتاريخ النهاردة');
  ok(!(await trySave()) && (await toast()).includes('اسم المشروع مطلوب'), 'الاسم مطلوب');
  await page.fill('#prName', 'مشروع جديد');
  ok(!(await trySave()) && (await toast()).includes('حدد العميل'), 'العميل مطلوب للمشروع الجديد');
  await page.selectOption('#prCustomerId', 'cA');
  await page.fill('#prName', 'مشروع   الشروق');
  ok(!(await trySave()) && (await toast()).includes('يوجد مشروع بنفس الاسم'), 'الاسم مايتكرّرش (بعد التطبيع)');
  await page.fill('#prName', 'مشروع جديد'); await page.fill('#prCode', 'PRJ-002');
  ok(!(await trySave()) && (await toast()).includes('كود المشروع مستخدم'), 'الكود مايتكرّرش');
  await page.fill('#prCode', ''); await page.fill('#prValue', '1000.555'); await page.fill('#prBudget', ''); await page.fill('#prProgress', '140');
  await page.fill('#prContractNo', ' ع-9 '); await page.fill('#prNotes', ' ملاحظة ');
  let n = await page.evaluate(() => window.__saveCount);
  await page.click('#btnSavePr'); await saved(n);
  const nw = await page.evaluate(() => JSON.parse(JSON.stringify(DATA.projects.find((p) => p.name === 'مشروع جديد'))));
  const { id: nid, ...nwv } = nw;
  ok(typeof nid === 'string' && nid.length > 4, 'معرّف جديد');
  eq(nwv, { attachments: [], code: 'PRJ-006', name: 'مشروع جديد', customerId: 'cA', customerName: 'شركة الأمل', customer: 'شركة الأمل', contractNo: 'ع-9', value: 1000.56, budget: 1000.56,
    start: today, end: '', progress: 100, status: 'الدراسة والتخطيط', supervisorId: '', assignedTo: '', notes: 'ملاحظة', extraFields: [] },
  'الحقول المحفوظة: الكود التلقائي لما الخانة فاضية، والقيمة بخانتين، والميزانية = القيمة، والتقدم محصور 0–100');

  console.log('[4] التعديل: نشر تغيير الاسم');
  await open('pA');
  eq(await page.evaluate(() => document.getElementById('prSup').value), 'sv1', 'المشرف متعبّي');
  await page.fill('#prName', 'الشروق الجديد');
  n = await page.evaluate(() => window.__saveCount);
  await page.click('#btnSavePr'); await saved(n);
  const rn = await page.evaluate(() => ({
    w1: DATA.workers[0].project, w2: DATA.workers[1].project, e1: DATA.expenses[0].project, e2: [DATA.expenses[1].project, DATA.expenses[1].projectId], e3: DATA.expenses[2].project,
    inv: DATA.ledger.invoices[0].project, k: [DATA.clients.customers[0].contracts[0].project, DATA.clients.customers[0].contracts[0].projectId], sv: DATA.supervisors[0].project,
    eq: DATA.equipment[0].project,
  }));
  eq(rn, { w1: 'الشروق الجديد', w2: 'الشروق الجديد', e1: 'الشروق الجديد', e2: ['الشروق الجديد', 'pA'], e3: 'مشروع مجهول', inv: 'الشروق الجديد', k: ['الشروق الجديد', 'pA'], sv: 'الشروق الجديد', eq: 'مشروع النور' },
    'الاسم الجديد في كل السجلات المربوطة (والموقوف كمان)، والاسم المطابق بعد التطبيع اتربط بالمعرّف واتغيّر، والعقد، والمشرف المختار. والمجهول والمشروع التاني زي ما هم');

  console.log('[5] التعديل: تغيير المرحلة يحرّك موضع المسار');
  const editStatus = async (id, st) => {
    await open(id);
    await page.selectOption('#prStatus', st);
    const k = await page.evaluate(() => window.__saveCount);
    await page.click('#btnSavePr'); await saved(k);
  };
  await editStatus('pB', 'التسليم الابتدائي');
  let pb = await P('pB');
  const h = pb.pathHistory[pb.pathHistory.length - 1];
  eq([pb.status, pb.stageKey, pb.stepKey, pb.stepMeta.tech_inspect.status, pb.stepMeta.tech_inspect.startDate, pb.pathHistory.length], ['التسليم الابتدائي', 'prelim_delivery', 'tech_inspect', 'in_progress', today, 1],
    'المرحلة الجديدة: أول خطوة مش مكتملة، «قيد التنفيذ» من النهاردة');
  const me = await page.evaluate(() => pwUserName());
  eq([h.action, h.stageKey, h.stepKey, h.label, h.from, h.to, h.user], ['تغيير المرحلة', 'prelim_delivery', 'tech_inspect', 'التسليم الابتدائي · المعاينة الفنية', 'invoices', 'prelim_delivery', me], 'سطر في تاريخ المسار (باسم المستخدم الحالي)');
  ok(!!me && typeof h.id === 'string' && /^\d{4}-\d\d-\d\dT/.test(h.at), 'المستخدم والمعرّف والوقت');
  await editStatus('pB', 'متوقف');
  pb = await P('pB');
  eq([pb.status, pb.stageKey, pb.pathHistory.length], ['متوقف', 'prelim_delivery', 1], 'المرحلة النهائية (متوقف) مابتحرّكش المسار');
  await editStatus('pC', 'التعاقد');
  const pc = await P('pC');
  eq([pc.status, pc.stageKey, pc.pathHistory], ['التعاقد', undefined, undefined], 'مشروع مالوش stageKey: الحالة بتتغيّر بس، والمسار مابيتحرّكش (الحالة الجديدة بتتكتب الأول)');

  console.log('[6] الحذف');
  await page.evaluate(() => closeModal()); await page.waitForTimeout(250);
  await view();
  await page.click('.btn-del-proj[data-id="pA"]'); await page.waitForTimeout(200);
  ok((await toast()).includes('لا يمكن حذف المشروع: مرتبط بـ 1 عقد') && !!(await P('pA')), 'مربوط بعقد ← الحذف ممنوع');
  await page.click('.btn-del-proj[data-id="pD"]'); await page.waitForSelector('.app-confirm-modal [data-c="1"]');
  n = await page.evaluate(() => window.__saveCount);
  await page.click('.app-confirm-modal [data-c="1"]'); await saved(n);
  eq(await P('pD'), null, 'غير مربوط ← حذف فعلي بعد التأكيد');

  ok(errors.length === 0, 'no errors ' + JSON.stringify(errors.slice(0, 3)));
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
