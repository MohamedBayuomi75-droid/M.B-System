// المرحلة 8 (الحزمة 8.2 — المشرفين والسواقين): اختبارات قبول للواجهة القديمة (DEC-0086، DEC-0123).
// القيم المتوقعة = السلوك الحالي (LEGACY-PRESERVE)، وده المرجع اللي السيرفر والشاشة الجديدة بيتقارنوا بيه:
//  [1] القسم الأساسي عند التحميل (coreDeptIdFor): المشرفين ← «المشرفين»، والسواق ← «سائقين الشركة» أو «من خارج الشركة» (external)
//  [2] لوحات الأقسام بالأعداد (المشرفين والسواقين)
//  [3] القايمة: filteredSupervisors، وقايمة السواقين (renderDriversPage: الترتيب ← البحث ← الفلاتر الإضافية ← الحالة «الفاضية = نشط» ← القسم)
//  [4] الملاحظات (personNotesIssues) — ومنها «بدون يومية محددة» لسواق الشركة اللي ليه راتب (سلوك القديمة)
//  [5] الكروت، وعمود «عدد العمال» (workersOfSupervisor: كل العمال المربوطين، والمستقيل كمان)، وجدولي السواقين
//  [6] نافذة المشرف: الكود SUP- التلقائي، واليومية (toInt)، والرخصة وحالتها من التاريخ، وskill من الوظيفة، والقسم
//  [7] نافذة سواق الشركة: الراتب، ودرجة الرخصة، و«سائق» افتراضي للوظيفة
//  [8] نافذة السواق الخارجي: external، واليومية، و**من غير دمج** (الخانة الفاضية بتمسح القيمة) — قدام سواق الشركة بالدمج
//  [9] الاستقالة: تاريخ الاستقالة من النافذة، وقسم المستقيلين، ولقطة في الأرشيف، وإعادة التفعيل
//  [10] منع التكرار (guardEntityDuplicates): مؤكد ← ممنوع، وتشابه عبر الأنواع ← «حفظ على أي حال»
// بيشتغل في وضع الملف والويب (WEB_MODE=1) وفوق الجداول.
const { openApp } = require('./harness');
const lib = require('./lib');
const { ok, summary, baseUser } = lib;
const probed = {};
const eq = (a, b, name) => { if (typeof b === 'string' && b.startsWith('__probe_')) { probed[b.slice(8)] = a; return; } lib.eq(a, b, name); };
(async () => {
  const P = (id, o) => Object.assign({ id, extraFields: [], attachments: [] }, o);
  const seed = {
    users: [baseUser], schemaVersion: 9,
    employees: [P('e1', { code: 'EMP-001', name: 'موظف أول', nationalId: '27001011234567', status: 'active' })],
    supervisors: [
      P('s1', { code: 'SUP-001', name: 'سامي المشرف', status: 'active', nationalId: '28001011234567', phone: '01001112222', dailyWage: 350, position: 'مشرف موقع', skill: 'مشرف موقع', licenseExpiry: '2020-01-01', idCardExpiry: '2099-01-01', hireDate: '2024-01-01' }),
      P('s2', { code: 'SUP-002', name: 'كريم عادل', status: 'active' }),
      P('s3', { code: 'SUP-003', name: 'مشرف مستقيل', status: 'resigned', resignedAt: '2026-01-01' }),
    ],
    workers: [
      P('w1', { code: 'WRK-001', name: 'عامل أ', workerType: 'temporary', status: 'active', supervisorId: 's1' }),
      P('w2', { code: 'WRK-002', name: 'عامل ب', workerType: 'temporary', status: 'resigned', supervisorId: 's1' }),
      P('w3', { code: 'WRK-003', name: 'عامل ج', workerType: 'temporary', status: 'active', supervisorId: 's2' }),
    ],
    drivers: [
      P('d1', { code: 'DRV-001', name: 'أحمد السواق', status: 'active', salary: 5000, licenseGrade: 'درجة أولى', licenseExpiry: '2099-01-01', nationalId: '29001011234567', phone: '01112223333', position: 'سائق نقل' }),
      P('d2', { code: 'DRV-002', name: 'محمود خارجي', status: 'active', external: true, dailyWage: 200, phone: '01223334444', position: 'سائق', address: 'الجيزة' }),
      P('d3', { code: 'DRV-003', name: 'سيد سواق', status: '' }),
    ],
  };
  // القيم المتوقعة = ناتج الواجهة القديمة نفسها (اتراجعت واحدة واحدة مع الكود — PHASE_08_2 8.2.2)
  const EXPECT = process.env.PROBE ? new Proxy({}, { get: (_, k) => '__probe_' + String(k) }) : require('./phase75.expect.json');
  const { browser, page, errors } = await openApp(seed);
  const today = await page.evaluate(() => todayISO());
  const saved = (n) => page.waitForFunction((x) => window.__saveCount > x, n, { timeout: 15000 });
  // الحفظ بيستنى guardEntityDuplicates (Promise) ← نستنى السجل نفسه يوصل، وبعدين الحفظ اللي بعده (مش أي حفظ تاني)
  const savedRec = async (coll, name) => { await page.waitForFunction(([c, nm]) => (DATA[c] || []).some((x) => x.name === nm), [coll, name], { timeout: 15000 }); const k = await page.evaluate(() => window.__saveCount); await page.waitForFunction((x) => window.__saveCount >= x, k); };
  const supIds = (f) => page.evaluate((f) => { Object.keys(supervisorFilters).forEach((k) => { if (k !== '_boardLevel') supervisorFilters[k] = ''; }); Object.assign(supervisorFilters, f); return filteredSupervisors().map((s) => s.id); }, f);
  // السواقين مالهمش دالة فلترة: القايمة جوه renderDriversPage ← نقرا الصفوف المرسومة
  const drvIds = (f) => page.evaluate((f) => {
    goToPage('drivers'); Object.keys(driverFilters).forEach((k) => { driverFilters[k] = ''; }); driverFilters._boardLevel = 'list'; Object.assign(driverFilters, f); rerenderCurrentPage();
    return [...document.querySelectorAll('#app .btn-edit-drv')].map((b) => b.getAttribute('data-id'));
  }, f);
  const boardsOf = async (pg, f) => {
    await page.evaluate((pg) => { goToPage(pg); (pg === 'supervisors' ? supervisorFilters : driverFilters)._boardLevel = 'boards'; rerenderCurrentPage(); }, pg);
    await page.waitForTimeout(200);
    return page.evaluate(() => [...document.querySelectorAll('#app .entity-dept-board')].map((b) => [b.getAttribute('data-dept'), b.querySelector('.lbl').innerText.trim(), b.querySelector('.num').innerText.trim()]));
  };
  const cardsNow = () => page.evaluate(() => [...document.querySelectorAll('#app .sc-row .sc-card, #app .stats-row .stat-card')].map((c) => c.innerText.replace(/\s+/g, ' ').trim()));
  const closeAll = async () => { await page.evaluate(() => { try { closeSubModal(); } catch (e) { /* */ } try { closeModal(); } catch (e) { /* */ } }); await page.waitForTimeout(250); };

  console.log('[1] القسم الأساسي عند التحميل');
  eq(await page.evaluate(() => [DATA.supervisors.map((s) => [s.id, s.departmentId]), DATA.drivers.map((d) => [d.id, d.departmentId])]),
    [[['s1', '__core_supervisors__'], ['s2', '__core_supervisors__'], ['s3', '__core_supervisors__']], [['d1', '__core_drivers__'], ['d2', '__core_drivers_ext__'], ['d3', '__core_drivers__']]],
    'المشرفين كلهم «المشرفين» (حتى المستقيل لحد ما يتحفظ)، والسواق الخارجي «من خارج الشركة»');

  console.log('[2] لوحات الأقسام');
  eq(await boardsOf('supervisors', 'supervisorFilters'), [['', 'الكل', '3'], ['__none__', 'بدون قسم أو وظيفة', '2'], ['__resigned_supervisor__', 'المستقيلين', '0'], ['__retired_supervisor__', 'المعاشات', '0'], ['__core_supervisors__', 'المشرفين', '3']], 'لوحات المشرفين');
  eq(await boardsOf('drivers', 'driverFilters'), [['', 'الكل', '3'], ['__none__', 'بدون قسم أو وظيفة', '1'], ['__resigned_driver__', 'المستقيلين', '0'], ['__retired_driver__', 'المعاشات', '0'], ['__core_drivers__', 'سائقين الشركة', '2'], ['__core_drivers_ext__', 'سائقون من خارج الشركة', '1']], 'لوحات السواقين');

  console.log('[3] القايمة: الفلاتر والبحث والترتيب');
  const SUP_F = [{}, { status: 'active' }, { status: 'resigned' }, { q: 'سامي' }, { q: '2800' }, { q: 'مشرف موقع' }, { departmentId: '__none__' }, { xCard: 'none' }, { xData: 'missing' }];
  const supGot = []; for (const f of SUP_F) supGot.push(await supIds(f));
  eq(supGot, EXPECT.supLists, 'المشرفين: كل حالة بنفس النتيجة والترتيب');
  const DRV_F = [{}, { status: 'active' }, { q: 'سواق' }, { q: 'درجة أولى' }, { departmentId: '__core_drivers_ext__' }, { departmentId: '__none__' }, { xCard: 'none' }, { xData: 'missing' }];
  const drvGot = []; for (const f of DRV_F) drvGot.push(await drvIds(f));
  eq(drvGot, EXPECT.drvLists, 'السواقين: كل حالة بنفس النتيجة والترتيب (الحالة الفاضية = نشط)');

  console.log('[4] الملاحظات');
  const notes = await page.evaluate(() => [Object.fromEntries(DATA.supervisors.map((s) => [s.id, personNotesIssues('supervisor', s)])), Object.fromEntries(DATA.drivers.map((d) => [d.id, personNotesIssues('driver', d)]))]);
  eq(notes, EXPECT.notes, 'personNotesIssues للمشرفين والسواقين');
  ok(notes[1].d1.includes('بدون يومية محددة'), 'سواق الشركة اللي ليه راتب: «بدون يومية محددة» (سلوك القديمة بيتنقل زي ما هو)', notes[1].d1);

  console.log('[5] الكروت والجداول');
  await page.evaluate(() => { goToPage('supervisors'); Object.keys(supervisorFilters).forEach((k) => { supervisorFilters[k] = ''; }); supervisorFilters._boardLevel = 'list'; rerenderCurrentPage(); });
  await page.waitForTimeout(200);
  const supCards = await cardsNow();
  const supTable = await page.evaluate(() => [...document.querySelectorAll('#app table.data-table tbody tr')].map((tr) => { const c = [...tr.children].map((td) => td.innerText.replace(/\s+/g, ' ').trim()); return [tr.querySelector('.btn-edit-sup') && tr.querySelector('.btn-edit-sup').getAttribute('data-id'), c[19]]; }));
  eq(supTable, [['s1', '2'], ['s2', '1'], ['s3', '0']], 'عمود «عدد العمال»: كل العمال المربوطين (والمستقيل كمان)');
  await drvIds({}); const drvCards = await cardsNow();
  await drvIds({ departmentId: '__core_drivers_ext__' });
  const extHead = await page.evaluate(() => [...document.querySelectorAll('#app table.data-table thead th')].map((th) => th.innerText.trim()).filter(Boolean));
  eq(extHead, ['الكود', 'الاسم', 'الحالة', 'الرقم القومي', 'الوظيفة', 'القسم', 'اليومية', 'الهاتف', 'العنوان', 'الملاحظات'], 'جدول السواقين من بره (driversExt)');
  eq([supCards, drvCards], EXPECT.cards, 'الكروت (entityStatCardsHtml)');

  console.log('[6] نافذة المشرف — إضافة');
  await closeAll();
  await page.evaluate(() => { goToPage('supervisors'); openSupervisorModal(); });
  await page.waitForSelector('#btnSaveSup');
  eq(await page.inputValue('#supCode'), 'SUP-004', 'الكود التلقائي SUP-');
  ok(!(await page.$('#supSalary')) && !!(await page.$('#supWage')) && !!(await page.$('#supLicExp')), 'يومية ورخصة، من غير راتب');
  eq(await page.$eval('#supResignDateWrap', (e) => getComputedStyle(e).display), 'none', 'تاريخ الاستقالة مخفي لحد ما الحالة تبقى استقالة');
  await page.fill('#supName', 'مشرف جديد'); await page.fill('#supPos', 'مشرف أمن'); await page.fill('#supWage', '275.555'); await page.fill('#supLicExp', '2020-05-01');
  await page.fill('#supNid', '26001011234567'); await page.fill('#supAddress', ' القاهرة ');
  let n;
  await page.click('#btnSaveSup'); await savedRec('supervisors', 'مشرف جديد');
  const s4 = await page.evaluate(() => { const s = DATA.supervisors.find((x) => x.name === 'مشرف جديد'); return s && { code: s.code, status: s.status, dailyWage: s.dailyWage, position: s.position, skill: s.skill, licenseExpiry: s.licenseExpiry, licenseStatus: s.licenseStatus, departmentId: s.departmentId, address: s.address, resignedAt: s.resignedAt, nationalId: s.nationalId }; });
  eq(s4, EXPECT.s4, 'المشرف الجديد بنفس قيم النافذة');
  eq(await page.evaluate(() => DATA.supervisors.map((s) => s.name)), EXPECT.supOrder, 'DATA.supervisors بيتترتّب بالاسم بعد الحفظ');

  console.log('[7] نافذة سواق الشركة — إضافة');
  await closeAll();
  await page.evaluate(() => { goToPage('drivers'); openDriverModal(); });
  await page.waitForSelector('#btnSaveDriver');
  eq(await page.inputValue('#drvCode'), 'DRV-004', 'الكود التلقائي DRV-');
  eq(await page.inputValue('#drvPos'), 'سائق', 'الوظيفة «سائق» افتراضي');
  ok(!!(await page.$('#drvSalary')) && !(await page.$('#drvWage')) && !!(await page.$('#drvLicGrade')), 'راتب ودرجة رخصة، من غير يومية');
  await page.fill('#drvName', 'سواق جديد'); await page.fill('#drvSalary', '4500.5'); await page.selectOption('#drvLicGrade', 'درجة ثانية'); await page.fill('#drvPhone', '01009998888');
  await page.click('#btnSaveDriver'); await savedRec('drivers', 'سواق جديد');
  const d4 = await page.evaluate(() => { const d = DATA.drivers.find((x) => x.name === 'سواق جديد'); return d && { code: d.code, status: d.status, salary: d.salary, licenseGrade: d.licenseGrade, position: d.position, departmentId: d.departmentId, external: !!d.external, phone: d.phone }; });
  eq(d4, EXPECT.d4, 'سواق الشركة الجديد بنفس قيم النافذة');

  console.log('[8] السواق الخارجي: إضافة، وتعديل من غير دمج (قدام سواق الشركة بالدمج)');
  await closeAll();
  await page.evaluate(() => { goToPage('drivers'); openDriverModal(null, { external: true }); });
  await page.waitForSelector('#btnSaveDriver');
  eq(await page.inputValue('#drvCode'), 'DRV-005', 'الكود بعد سواق الشركة');
  await page.fill('#drvName', 'خارجي جديد'); await page.fill('#drvWage', '180.555'); await page.fill('#drvPhone', '01115556666');
  await page.click('#btnSaveDriver'); await savedRec('drivers', 'خارجي جديد');
  const d5 = await page.evaluate(() => { const d = DATA.drivers.find((x) => x.name === 'خارجي جديد'); return d && { code: d.code, external: d.external, dailyWage: d.dailyWage, position: d.position, departmentId: d.departmentId, status: d.status }; });
  eq(d5, EXPECT.d5, 'السواق الخارجي الجديد');
  await closeAll();
  await page.evaluate(() => openDriverModal('d2')); await page.waitForSelector('#btnSaveDriver');
  eq(await page.$eval('.modal-header h3', (h) => h.textContent.trim()), 'تعديل سائق خارجي', 'تعديل الخارجي بيفتح نافذته');
  await page.fill('#drvAddress', ''); n = await page.evaluate(() => window.__saveCount); await page.click('#btnSaveDriver'); await saved(n);
  eq(await page.evaluate(() => DATA.drivers.find((d) => d.id === 'd2').address), '', 'الخارجي: الخانة الفاضية مسحت العنوان (من غير دمج)');
  await closeAll();
  await page.evaluate(() => openDriverModal('d1')); await page.waitForSelector('#btnSaveDriver');
  await page.fill('#drvPhone', ''); n = await page.evaluate(() => window.__saveCount); await page.click('#btnSaveDriver'); await saved(n);
  eq(await page.evaluate(() => DATA.drivers.find((d) => d.id === 'd1').phone), '01112223333', 'سواق الشركة: الخانة الفاضية ماتمسحش (mergePersonRecord)');

  console.log('[9] الاستقالة بتاريخها من النافذة، وإعادة التفعيل');
  await closeAll();
  await page.evaluate(() => openSupervisorModal('s2')); await page.waitForSelector('#btnSaveSup');
  await page.selectOption('#supStatus', 'resigned');
  eq(await page.$eval('#supResignDateWrap', (e) => getComputedStyle(e).display !== 'none'), true, 'تاريخ الاستقالة بيظهر مع الاستقالة');
  await page.fill('#supResignDate', '2026-03-15');
  n = await page.evaluate(() => window.__saveCount); await page.click('#btnSaveSup'); await saved(n);
  const rs = await page.evaluate(() => { const s = DATA.supervisors.find((x) => x.id === 's2'); const a = (DATA.resignedArchive || []).filter((x) => x.personId === 's2'); return { status: s.status, resignedAt: s.resignedAt, departmentId: s.departmentId, previousDepartmentId: s.previousDepartmentId, archive: a.map((x) => [x.personId, x.archiveGroup, x.resignedAt, x.entity && x.entity.departmentId, x.entity && x.entity.previousDepartmentId]) }; });
  eq(rs, EXPECT.resign, 'الاستقالة: التاريخ من النافذة، وقسم المستقيلين، ولقطة في الأرشيف');
  await closeAll();
  await page.evaluate(() => openSupervisorModal('s2')); await page.waitForSelector('#btnSaveSup');
  await page.selectOption('#supStatus', 'active');
  n = await page.evaluate(() => window.__saveCount); await page.click('#btnSaveSup'); await saved(n);
  eq(await page.evaluate(() => { const s = DATA.supervisors.find((x) => x.id === 's2'); return [s.status, s.departmentId, s.resignedAt, (DATA.resignedArchive || []).filter((x) => x.personId === 's2').length]; }), EXPECT.reactivate, 'إعادة التفعيل');

  console.log('[10] منع التكرار');
  eq(await page.evaluate(() => findEntityDuplicates('supervisor', { name: 'أي اسم', nationalId: '28001011234567' }, null).map((m) => [m.id, m.strength, m.reasons])), [['s1', 'hard', ['الرقم القومي متطابق']]], 'مشرف بنفس الرقم القومي: مؤكد');
  eq(await page.evaluate(() => findEntityDuplicates('driver', { name: 'أي اسم', nationalId: '27001011234567' }, null).map((m) => [m.id, m.kind, m.strength, m.reasons])), [['e1', 'employee', 'soft', ['نفس الرقم القومي مسجّل في موظفين']]], 'سواق برقم موظف: تشابه عبر الأنواع');
  await closeAll();
  await page.evaluate(() => openSupervisorModal()); await page.waitForSelector('#btnSaveSup');
  await page.fill('#supName', 'سامي المشرف');
  await page.click('#btnSaveSup'); await page.waitForSelector('#appSubModal #btnDupForce');
  eq(await page.$eval('#appSubModal h3', (h) => h.textContent.trim()), '⚠️ يوجد سجلات متشابهة', 'نافذة المشرف: نفس الاسم ← تشابه');
  await closeAll();

  eq(errors, [], 'no JS errors');
  await browser.close();
  if (process.env.PROBE) require('fs').writeFileSync(require('path').join(__dirname, 'phase75.expect.json'), JSON.stringify(probed, null, 1) + '\n');
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
