// المرحلة 8 (الحزمة 8.1 — العمال): اختبارات قبول للواجهة القديمة (DEC-0086، DEC-0121).
// القيم المتوقعة = السلوك الحالي (LEGACY-PRESERVE)، وده المرجع اللي السيرفر والشاشة الجديدة بيتقارنوا بيه:
//  [1] القسم الأساسي عند التحميل (assignCoreDepartments / coreDeptIdFor): مؤقت/يومية ← «عمالة مؤقتة»، وغيره ← «عمال الشركة»
//  [2] لوحات الأقسام (entityDeptBoardsPageHtml): الكل، وبدون قسم أو وظيفة، والمستقيلين، والمعاشات، والأقسام الأساسية — بالأعداد
//  [3] القايمة (filteredWorkers): الحالة (ومنها «مؤقت»)، والنوع، والمشرف، والمشروع، والقسم، و«بدون قسم أو وظيفة»، والبحث الذكي
//      (smartSearchList: الاسم والكود والقومي والمشرف)، والفلاتر الإضافية (البطاقة، والتأمين، والأوراق، والبيانات)، والترتيب
//  [4] الملاحظات (personNotesIssues) والأوراق المطلوبة: المؤقت تنبيهات محدودة، والشركة كاملة، والمستقيل أوراق الاستقالة
//  [5] الكروت (entityStatCardsHtml) في القايمة
//  [6] نافذة العامل — مؤقت: الحقول، والكود التلقائي، والقسم، والتقريب لخانتين
//  [7] نافذة العامل — شركة: بيانات الموارد البشرية، والراتب، وحالة البطاقة من تاريخها، والكود المكرر بياخد كود جديد
//  [8] التعديل: الدمج من غير مسح القيم بالفاضي (mergePersonRecord)
//  [9] الاستقالة: قسم المستقيلين + لقطة في أرشيف المستقيلين، وإعادة التفعيل بترجّع القسم القديم
// بيشتغل في وضع الملف والويب (WEB_MODE=1) وفوق الجداول.
const { openApp } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const W = (id, o) => Object.assign({ id, extraFields: [], attachments: [] }, o);
  const seed = {
    users: [baseUser], schemaVersion: 9,
    supervisors: [{ id: 'sv1', code: 'SUP-1', name: 'سامي المشرف', status: 'active' }],
    projects: [{ id: 'pA', code: 'PRJ-001', name: 'مشروع الشروق', status: 'active' }],
    leaves: [{ id: 'l1', personKind: 'worker', personId: 'w2', status: 'approved', from: '2020-01-01', to: '2099-01-01' }],
    workers: [
      W('w1', { code: 'WRK-001', name: 'محمد علي', workerType: 'temporary', type: 'temporary', status: 'active', dailyWage: 300, supervisorId: 'sv1', project: 'مشروع الشروق', nationalId: '29001011234567', phone: '0100' }),
      W('w2', { code: 'WRK-002', name: 'أحمد محمود', workerType: 'company', type: 'company', status: 'active', salary: 6000, basicSalary: 6000, dailyWage: 0, position: 'نجار', skill: 'نجار', nationalId: '28501011234567', phone: '0111', address: 'القاهرة',
        idCardExpiry: '2020-01-01', hireDate: '2024-01-01', contractType: 'permanent', contractStatus: 'active', insuranceStatus: 'insured', insuranceNumber: '123' }),
      W('w3', { code: 'WRK-003', name: 'خالد حسن', workerType: 'company', type: 'company', status: 'active', salary: 5000, position: '', attachments: [{ name: 'بطاقة.pdf', docType: 'صورة البطاقة', path: 'x/b.pdf' }] }),
      W('w4', { code: 'WRK-004', name: 'سيد مستقيل', workerType: 'company', type: 'company', status: 'resigned', resignedAt: '2026-01-01', position: 'حداد' }),
      W('w5', { code: '', name: 'عامل يومية', workerType: 'daily', status: 'active', dailyWage: 250.555 }),
    ],
  };
  const { browser, page, errors } = await openApp(seed);
  const saved = (n) => page.waitForFunction((x) => window.__saveCount > x, n, { timeout: 15000 });
  const today = await page.evaluate(() => todayISO());
  const ids = (f) => page.evaluate((f) => {
    Object.keys(workerFilters).forEach((k) => { if (k !== '_boardLevel') workerFilters[k] = ''; });
    Object.assign(workerFilters, f);
    return filteredWorkers().map((w) => w.id);
  }, f);

  console.log('[1] القسم الأساسي عند التحميل');
  eq(await page.evaluate(() => DATA.workers.map((w) => [w.id, w.departmentId, w.categoryId])),
    [['w1', '__core_workers_temp__', '__core_workers_temp__'], ['w2', '__core_workers_perm__', '__core_workers_perm__'], ['w3', '__core_workers_perm__', '__core_workers_perm__'],
      ['w4', '__core_workers_perm__', '__core_workers_perm__'], ['w5', '__core_workers_temp__', '__core_workers_temp__']],
    'مؤقت/يومية ← «عمالة مؤقتة»، وغيره ← «عمال الشركة» (حتى المستقيل لحد ما يتحفظ)');

  console.log('[2] لوحات الأقسام');
  await page.evaluate(() => { goToPage('workers'); workerFilters._boardLevel = 'boards'; rerenderCurrentPage(); });
  await page.waitForTimeout(200);
  const boards = await page.evaluate(() => [...document.querySelectorAll('#app .entity-dept-board')].map((b) => [b.getAttribute('data-dept'), b.querySelector('.lbl').innerText.trim(), b.querySelector('.num').innerText.trim()]));
  eq(boards, [['', 'الكل', '5'], ['__none__', 'بدون قسم أو وظيفة', '3'], ['__resigned_worker__', 'المستقيلين', '0'], ['__retired_worker__', 'المعاشات', '0'],
    ['__core_workers_perm__', 'عمال الشركة', '3'], ['__core_workers_temp__', 'عمالة مؤقتة', '2']], 'اللوحات بالترتيب والأعداد');

  console.log('[3] القايمة: الفلاتر والبحث والترتيب');
  eq(await ids({}), ['w2', 'w3', 'w4', 'w5', 'w1'], 'الكل بالاسم (sortByNameAr)');
  eq(await ids({ status: 'temporary' }), ['w5', 'w1'], 'الحالة «مؤقت» = النوع المؤقت');
  eq(await page.evaluate(() => DATA.workers.find((w) => w.id === 'w2').status), 'on_leave', 'الإجازة المعتمدة السارية بتحوّل الحالة لـ «في إجازة» تلقائي');
  eq(await ids({ status: 'active' }), ['w3', 'w5', 'w1'], 'الحالة «نشط» (من غير اللي في إجازة)');
  eq(await ids({ type: 'temporary' }), ['w5', 'w1'], 'النوع مؤقت (ويوميه)');
  eq(await ids({ type: 'company' }), ['w2', 'w3', 'w4'], 'النوع شركة');
  eq(await ids({ supervisorId: 'sv1' }), ['w1'], 'المشرف');
  eq(await ids({ project: 'الشروق' }), ['w1'], 'المشروع (جزء من الاسم)');
  eq(await ids({ departmentId: '__core_workers_temp__' }), ['w5', 'w1'], 'القسم');
  eq(await ids({ departmentId: '__none__' }), ['w3', 'w5', 'w1'], '«بدون قسم أو وظيفة» = من غير وظيفة');
  eq(await ids({ q: 'محمد' }), ['w1'], 'البحث: بداية كلمة من الاسم (مش «محمود»)');
  eq(await ids({ q: '2900' }), ['w1'], 'البحث: جزء من الرقم القومي');
  eq(await ids({ q: 'سامي' }), ['w1'], 'البحث: اسم المشرف (الرجوع لنص الشخص كله)');
  eq(await ids({ xCard: 'expired' }), ['w2'], 'البطاقة منتهية');
  eq(await ids({ xIns: 'insured' }), ['w2'], 'مؤمَّن');
  eq(await ids({ xData: 'missing' }), ['w3', 'w4', 'w5'], 'بيانات أساسية ناقصة (المؤقت: القومي بس)');
  eq(await ids({ xDocs: 'missing' }), ['w2', 'w3', 'w4'], 'أوراق ناقصة (المؤقت مالوش أوراق مطلوبة)');

  console.log('[4] الملاحظات والأوراق المطلوبة');
  const req = ['أصل شهادة المؤهل', 'أصل شهادة الجيش', 'أصل شهادة الميلاد', 'عقد العمل', 'فيش وتشبيه', 'صورة البطاقة الشخصية', 'صور شخصية', 'كعب عمل', 'برنت تأميني'];
  eq(await page.evaluate(() => personRequiredDocsList('worker').map((d) => d.label)), req, 'الأوراق المطلوبة للعامل (الافتراضي)');
  const notes = await page.evaluate(() => Object.fromEntries(DATA.workers.map((w) => [w.id, personNotesIssues('worker', w)])));
  eq(notes.w1, [], 'مؤقت مكتمل: مفيش تنبيهات');
  eq(notes.w5, ['الرقم القومي ناقص', 'بدون مشرف'], 'مؤقت: القومي والمشرف بس');
  eq(notes.w2, ['بدون مشرف', 'بدون يومية محددة', 'بطاقة منتهية', ...req.map((x) => 'ناقص: ' + x)], 'شركة: كل التنبيهات');
  eq(notes.w3.filter((x) => x.startsWith('ناقص:')).includes('ناقص: صورة البطاقة الشخصية'), false, 'مرفق «صورة البطاقة» بملف بيغطي الورقة');
  eq(notes.w4.length, 9, 'المستقيل: أوراق ملف الاستقالة بس');

  console.log('[5] الكروت');
  await page.evaluate(() => { goToPage('workers'); workerFilters._boardLevel = 'list'; Object.keys(workerFilters).forEach((k) => { if (k !== '_boardLevel') workerFilters[k] = ''; }); rerenderCurrentPage(); });
  await page.waitForTimeout(200);
  const cards = await page.evaluate(() => [...document.querySelectorAll('#app .sc-row .sc-card')].map((c) => [c.querySelector('.sc-lbl').innerText.trim(),
    c.querySelector('.sc-num') ? c.querySelector('.sc-num').innerText.trim() : [...c.querySelectorAll('.sc-part')].map((p) => p.querySelector('b').innerText.trim() + ' ' + p.querySelector('i').innerText.trim()).join(' · ')]));
  ok(cards.length >= 5 && cards[0][0] === 'عدد العمال' && cards[0][1] === '٥', 'كارت العدد', cards);
  eq(cards.find((c) => c[0] === 'نشطون')[1], '٢ على رأس العمل · ١ في إجازة', 'نشطون: على رأس العمل وفي إجازة (إجازة معتمدة سارية)');
  eq(cards.find((c) => c[0] === 'حالة البطاقة')[1], '٠ سارية · ١ منتهية', 'حالة البطاقة');
  eq(cards.find((c) => c[0] === 'إجمالي الرواتب')[1], '٢٥٬٣١٤٫٤٣ ج.م', 'إجمالي الرواتب: الراتب، أو اليومية × 26 (7,800 + 6,000 + 5,000 + 0 + 6,514.43)');

  console.log('[6] نافذة العامل — مؤقت');
  eq(await page.evaluate(() => DATA.workers.find((w) => w.id === 'w5').code), 'WRK-005', 'العامل من غير كود بياخد كود تلقائي عند التحميل');
  const open = async (id, opts) => { await page.evaluate(() => { try { closeModal(); } catch (e) { /* */ } }); await page.waitForTimeout(250); await page.evaluate(([i, o]) => openWorkerModal(i || null, o || undefined), [id || '', opts || null]); await page.waitForSelector('#appModal:not(.modal-overlay-out) #btnSaveWrk'); await page.waitForTimeout(200); };
  const save = async () => { const n = await page.evaluate(() => window.__saveCount); await page.click('#btnSaveWrk'); await saved(n); };
  await open('', { defaultType: 'temporary' });
  eq(await page.evaluate(() => [document.getElementById('wrkWorkerType').value, document.getElementById('wrkCode').value]), ['temporary', 'WRK-006'], 'النوع مؤقت، والكود التلقائي');
  await page.fill('#wrkName', ' عامل جديد ');
  await page.fill('#wrkWageTemp', '275.555'); await page.fill('#wrkNidTemp', ' 29912 '); await page.fill('#wrkPhoneTemp', '0122'); await page.fill('#wrkPosTemp', 'مساعد');
  await page.evaluate(() => { document.getElementById('wrkSupervisor').value = 'sv1'; });
  await save();
  const t = await page.evaluate(() => JSON.parse(JSON.stringify(DATA.workers.find((w) => w.name === 'عامل جديد'))));
  const { id: tid, ...tv } = t;
  ok(!!tid, 'معرّف جديد');
  eq(tv, { code: 'WRK-006', name: 'عامل جديد', workerType: 'temporary', type: 'temporary', status: 'active', resignedAt: '', supervisorId: 'sv1', nationalId: '29912', phone: '0122', address: '', project: '',
    dailyWage: 275.56, insuranceStatus: 'none', skill: 'مساعد', position: 'مساعد', notes: '', attachments: [], departmentId: '__core_workers_temp__', categoryId: '__core_workers_temp__' },
  'السجل المؤقت: الحقول، واليومية بخانتين، والقسم «عمالة مؤقتة»، والتأمين «none»');

  console.log('[7] نافذة العامل — شركة');
  await open('', { defaultType: 'company' });
  await page.fill('#wrkName', 'عامل شركة'); await page.fill('#wrkCode', 'WRK-002'); // مكرر ← كود جديد
  await page.fill('#wrkNid', '27001011234567'); await page.fill('#wrkPhone', '0155'); await page.fill('#wrkPos', 'سباك');
  await page.fill('#wrkIdCardExp', '2020-05-01'); await page.fill('#wrkSalary', '7000.333');
  await page.fill('#wrkAddress', 'الجيزة');
  await save();
  const c = await page.evaluate(() => JSON.parse(JSON.stringify(DATA.workers.find((w) => w.name === 'عامل شركة'))));
  eq([c.code, c.workerType, c.type, c.skill, c.position, c.salary, c.basicSalary, c.dailyWage, c.idCardExpiry, c.idCardStatus, c.departmentId, c.nationalId, c.phone, c.address],
    ['WRK-007', 'company', 'company', 'سباك', 'سباك', 7000.33, 7000.33, 0, '2020-05-01', 'expired', '__core_workers_perm__', '27001011234567', '0155', 'الجيزة'],
    'الكود المكرر بياخد التالي، والراتب بخانتين = الأساسي، والوظيفة = المهارة، وحالة البطاقة من التاريخ، والقسم «عمال الشركة»');

  console.log('[8] التعديل: الدمج من غير مسح');
  await open('w2');
  await page.fill('#wrkPhone', ''); await page.fill('#wrkAddress', 'الإسكندرية');
  await save();
  const w2 = await page.evaluate(() => JSON.parse(JSON.stringify(DATA.workers.find((w) => w.id === 'w2'))));
  eq([w2.phone, w2.address, w2.salary, w2.code, w2.insuranceNumber], ['0111', 'الإسكندرية', 6000, 'WRK-002', '123'], 'الفاضي مابيمسحش القيمة القديمة، والمتغيّر بيتحفظ');

  console.log('[9] الاستقالة وإعادة التفعيل');
  await open('w3');
  await page.selectOption('#wrkStatus', 'resigned');
  await page.waitForTimeout(150);
  await save();
  const r = await page.evaluate(() => ({ w: JSON.parse(JSON.stringify(DATA.workers.find((x) => x.id === 'w3'))), a: JSON.parse(JSON.stringify((DATA.resignedArchive || []).filter((x) => x.personId === 'w3'))) }));
  eq([r.w.status, r.w.departmentId, r.w.archiveGroup, r.w.resignedAt, r.w.previousDepartmentId], ['resigned', '__resigned_worker__', 'resigned', today, '__core_workers_perm__'], 'المستقيل: قسم المستقيلين، وتاريخ الاستقالة النهارده (النافذة مافيهاش خانة تاريخ)، والقسم السابق');
  ok(r.a.length === 1 && r.a[0].kind === 'worker' && r.a[0].sectionName === 'المستقيلين' && r.a[0].entity.salary === 5000 && r.a[0].entity.status === 'resigned', 'لقطة في أرشيف المستقيلين بكل بيانات الشخص', r.a);
  await open('w3');
  await page.selectOption('#wrkStatus', 'active');
  await save();
  const r2 = await page.evaluate(() => ({ w: JSON.parse(JSON.stringify(DATA.workers.find((x) => x.id === 'w3'))), n: (DATA.resignedArchive || []).filter((x) => x.personId === 'w3').length }));
  eq([r2.w.status, r2.w.departmentId, r2.w.archiveGroup, r2.w.resignedAt, r2.n], ['active', '__core_workers_perm__', '', '', 0], 'إعادة التفعيل: القسم القديم، والأرشيف اتشال');
  ok(!!today, 'today');

  ok(errors.length === 0, 'no errors ' + JSON.stringify(errors.slice(0, 3)));
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
