// المرحلة 8 (الحزمة 8.7.4 — المعدات): السيرفر (/api/v1/equipment و/api/v1/dues?tab=equipment) = الواجهة القديمة (DEC-0139).
//  [1] اللوحات، وقايمة المعدات بكل فلتر (الترتيب والملاحظات)، والكروت، والتكلفة القديمة لكل يومية = equipmentDailyCost، والجدول الشهري
//      (الساعات والتكلفة)، ومستحقات المعدات بالأرقام القديمة
//  [2] الحساب الجديد (DEC-0140) قدام القديم: الفرق بس في التوقف والتكلفة الإضافية
//  [3] الحفظ: نافذة المعدة واليومية القديمة في A = الـ API في B (إضافة معدة بنوع ترخيص، وتعديل، ويومية تشغيل، وتعديلها، وحذف يومية) — نفس السجلات
// بيشتغل في WEB_MODE=1 (وفوق الجداول). في وضع الملف بيعدّي.
const { openApp, WEB } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const P = (id, o) => Object.assign({ id, extraFields: [], attachments: [] }, o);
  const E = (id, o) => P(id, Object.assign({ type: 'other', status: 'working', ownership: 'owned' }, o));
  const D = (id, o) => Object.assign({ id, kind: 'work', days: 1, hours: 0, fuelLiters: 0, notes: '' }, o);
  const seed = {
    users: [baseUser], schemaVersion: 9, settings: { defaultFuelPrice: 12 },
    projects: [{ id: 'pA', code: 'PRJ-001', name: 'مشروع الشروق', status: 'active' }],
    supervisors: [P('s1', { code: 'SUP-001', name: 'سامي المشرف', status: 'active', dailyWage: 400 })],
    drivers: [P('d1', { code: 'DRV-001', name: 'أحمد السواق', status: 'active', licenseExpiry: '2099-01-01' })],
    equipment: [
      E('q1', { code: 'EQ-001', name: 'المعدات — لودر', typeLabel: 'لودر', licenseCategory: 'المعدات', departmentId: '__core_eq_machinery__', categoryId: '__core_eq_machinery__', vehicleNumber: 'أ ب 1', dailyCost: 1000, hourlyCost: 150, fuelPrice: 10, supervisorId: 's1', project: 'مشروع الشروق', vehicleLicenseExpiry: '2020-01-01', insuranceStatus: 'insured' }),
      E('q2', { code: 'EQ-002', name: 'سيارات النقل — قلاب', typeLabel: 'قلاب', licenseCategory: 'سيارات النقل', departmentId: '__core_eq_trucks__', categoryId: '__core_eq_trucks__', ownership: 'rented', status: 'maintenance', hourlyCost: 200, driverName: 'أحمد السواق', driverId: 'd1' }),
      E('q3', { code: 'EQ-003', name: 'ملاكي', typeLabel: 'تويوتا', status: 'stopped', dailyCost: 300 }),
    ],
    equipmentDaily: [
      D('ed1', { equipmentId: 'q1', date: '2026-03-02', project: 'مشروع الشروق', hours: 8, fuelLiters: 20 }),
      D('ed2', { equipmentId: 'q1', date: '2026-03-03', project: 'مشروع الشروق', kind: 'idle', days: 2 }),
      D('ed3', { equipmentId: 'q2', date: '2026-03-02', project: 'مشروع الشروق', days: 0, hours: 5 }),
      D('ed4', { equipmentId: 'q2', date: '2026-03-04', project: 'مشروع الشروق', kind: 'move', cost: 777 }),
      D('ed5', { equipmentId: 'q3', date: '2026-03-05', project: 'مشروع الشروق', extraCost: 50, dailyCost: 250 }),
    ],
    workerPayments: [{ id: 'p1', personType: 'equipment', personId: 'q1', workerId: '', type: 'pay', date: '2026-03-10', amount: 500, scope: 'self', notes: '' }],
  };
  const { browser, page, errors } = await openApp(seed);
  if (!WEB) { ok(true, 'وضع الملف: مقارنة السيرفر بتتعمل في WEB_MODE=1'); eq(errors, [], 'no JS errors'); await browser.close(); summary(); return; }
  const api = (pg, m, u, body, h) => pg.evaluate(async ([m, u, body, h]) => {
    const res = await fetch(u, { method: m, headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer ' + WebSession.token(), ...h }, body: body ? JSON.stringify(body) : undefined });
    let j = null; try { j = await res.json(); } catch (e) { /* */ } return { status: res.status, body: j };
  }, [m, u, body || null, h || {}]);
  const qs = (f) => Object.entries(f).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

  console.log('[1] السيرفر = الصفحة القديمة');
  for (const f of [{}, { status: 'working' }, { ownership: 'rented' }, { project: 'الشروق' }, { q: 'قلاب' }, { departmentId: '__core_eq_machinery__' }, { departmentId: '__none__' }]) {
    const l = await page.evaluate((f) => { Object.keys(equipmentFilters).forEach((k) => { equipmentFilters[k] = ''; }); Object.assign(equipmentFilters, f); return filteredEquipment().map((e) => [e.id, equipmentNotesIssues(e)]); }, f);
    eq((await api(page, 'GET', '/api/v1/equipment?' + qs(f))).body.rows.map((r) => [r.id, r.issues]), l, `القايمة ${JSON.stringify(f)}`);
  }
  const s0 = (await api(page, 'GET', '/api/v1/equipment')).body;
  const lb = await page.evaluate(() => { const deps = departmentsForKind('equipment'); return [['الكل', DATA.equipment.length], ['بدون قسم أو نوع ترخيص', DATA.equipment.filter((e) => entityNoDeptOrJob(e)).length], ...deps.map((d) => [d.name, DATA.equipment.filter((e) => String(e.departmentId || e.categoryId || '') === d.id).length])]; });
  eq(s0.boards.map((b) => [b.name, b.count]), lb, 'اللوحات');
  eq(s0.cards.map((c) => c.parts ? [c.label, c.parts.map((p) => p.n)] : [c.label, c.value]), await page.evaluate(() => { Object.keys(equipmentFilters).forEach((k) => { equipmentFilters[k] = ''; }); const rows = filteredEquipment();
    const ins = { i: 0, n: 0, p: 0 }; rows.forEach((x) => { const v = String(x.insuranceStatus || '').trim(); if (v === 'insured' || v === 'مؤمَّن' || v === 'مؤمن') ins.i++; else if (v === 'pending' || v === 'قيد التسجيل') ins.p++; else ins.n++; });
    let lv = 0, le = 0; rows.forEach((x) => { const k = ['vehicleLicenseExpiry', 'licenseExpiry', 'driverLicenseExpiry'].find((kk) => x[kk]); if (!k) return; if (statusFromExpiry(x[k]) === 'expired') le++; else lv++; });
    const ms = todayISO().slice(0, 8) + '01';
    return [['إجمالي القسم', rows.length], ['صيانة / عاطلة', rows.filter((e) => e.status === 'maintenance' || e.status === 'stopped').length], ['حالة التأمين', [ins.i, ins.n, ins.p]], ['حالة الرخصة', [lv, le]],
      ['تكلفة تشغيل الشهر', toInt(DATA.equipmentDaily.filter((d) => (d.date || '') >= ms).reduce((s, d) => s + equipmentDailyCost(d, getEquipment(d.equipmentId)), 0))]]; }), 'الكروت');
  const g = (await api(page, 'GET', '/api/v1/equipment/daily?from=2026-03-01&to=2026-03-31')).body;
  eq(g.list.map((d) => [d.id, d.legacyCost]).sort(), (await page.evaluate(() => DATA.equipmentDaily.filter((d) => d.date >= '2026-03-01' && d.date <= '2026-03-31').map((d) => [d.id, equipmentDailyCost(d, getEquipment(d.equipmentId))]))).sort(), 'التكلفة القديمة لكل يومية');
  eq(g.rows.map((r) => [r.id, r.hours, r.legacyCost, r.dates]), await page.evaluate(() => sortByNameAr(DATA.equipment.slice(), (e) => e.name).map((e) => { const logs = DATA.equipmentDaily.filter((d) => d.equipmentId === e.id && d.date >= '2026-03-01' && d.date <= '2026-03-31');
    return [e.id, Math.round(logs.reduce((s, d) => s + (Number(d.hours) || 0), 0) * 10) / 10, toInt(logs.reduce((s, d) => s + equipmentDailyCost(d, e), 0)), new Set(logs.map((d) => d.date)).size]; })), 'الجدول الشهري (الساعات، والتكلفة، والأيام في لوحة اليوميات)');
  const dues = (await api(page, 'GET', '/api/v1/dues/table?tab=equipment')).body.rows.map((r) => [r.id, r.legacyDays, r.hours, r.legacyDue, r.paid, r.legacyBal]);
  eq(dues, await page.evaluate(() => sortByNameAr(DATA.equipment.slice(), (e) => e.name).map((e) => { const logs = DATA.equipmentDaily.filter((d) => d.equipmentId === e.id);
    const due = toInt(logs.reduce((s, d) => s + equipmentDailyCost(d, e), 0)); const paid = toInt(DATA.workerPayments.filter((p) => p.personType === 'equipment' && p.personId === e.id && isActualPayment(p)).reduce((s, p) => s + toInt(p.amount), 0));
    const ex = personExtrasTotal('equipment', e.id); const exp = personExpensesTotal('equipment', e.id);
    return [e.id, logs.length, Math.round(logs.reduce((s, d) => s + (Number(d.hours) || 0), 0) * 10) / 10, toInt(due + ex), paid, toInt(toInt(due + ex) - paid - 0 - exp)]; })), 'مستحقات المعدات (الأرقام القديمة)');

  console.log('[2] الحساب الجديد قدام القديم');
  eq(g.list.filter((d) => String(d.legacyCost) !== d.cost).map((d) => [d.id, d.legacyCost, d.cost]).sort(), [['ed2', 2000, '1000'], ['ed5', 250, '300']], 'الفرق بس في التوقف (50%) والتكلفة الإضافية');

  console.log('[3] الحفظ: النوافذ القديمة (A) = الـ API (B)');
  const B = await openApp(seed);
  const saveCount = () => page.evaluate(() => window.__saveCount);
  const waitSave = async (n) => { await page.waitForFunction((x) => window.__saveCount > x, n, { timeout: 15000 }); await page.waitForTimeout(300); };
  const closeAll = async () => { await page.evaluate(() => { try { closeModal(); } catch (e) { /* */ } }); await page.waitForTimeout(250); };
  const key = () => ({ 'Idempotency-Key': 'eq-' + Math.random().toString(36).slice(2) });
  // معدة جديدة بنوع ترخيص
  await closeAll(); await page.evaluate(() => { goToPage('equipment'); openEquipmentModal(); }); await page.waitForTimeout(500);
  await page.evaluate(() => { const v = (id, x) => { document.getElementById(id).value = x; }; v('eqType', '__core_eq_trucks__'); v('eqCarType', ' مرسيدس '); v('eqStatus', 'working'); v('eqOwnership', 'rented'); v('eqVehicleNumber', ' ن ق 9 ');
    v('eqColor', 'أبيض'); v('eqChassis', 'CH1'); v('eqInsStatus', 'insured'); v('eqModel', '2020'); v('eqDriver', 'd1'); v('eqPurchasePrice', '150000.555'); v('eqVehLicExp', '2099-05-05'); v('eqLastMaint', '2026-01-01'); v('eqNextMaint', '2026-06-01'); v('eqNotes', ' ملاحظة '); v('eqCode', 'EQ-001'); });
  let n = await saveCount(); await page.click('#btnSaveEq'); await waitSave(n);
  eq((await api(B.page, 'POST', '/api/v1/equipment', { code: 'EQ-001', type: '__core_eq_trucks__', carType: ' مرسيدس ', status: 'working', ownership: 'rented', vehicleNumber: ' ن ق 9 ', color: 'أبيض', chassisNumber: 'CH1', insuranceStatus: 'insured', model: '2020',
    driverId: 'd1', purchasePrice: '150000.555', vehicleLicenseExpiry: '2099-05-05', lastMaintenance: '2026-01-01', nextMaintenance: '2026-06-01', notes: ' ملاحظة ', extraFields: [] }, key())).status, 201, 'POST معدة');
  // تعديل q2 بنوع ترخيص مختار (نفس القسم)
  await closeAll(); await page.evaluate(() => openEquipmentModal('q2')); await page.waitForTimeout(400);
  const formQ2 = await page.evaluate(() => Object.fromEntries([['type', 'eqType'], ['carType', 'eqCarType'], ['status', 'eqStatus'], ['ownership', 'eqOwnership'], ['vehicleNumber', 'eqVehicleNumber'], ['color', 'eqColor'], ['motorNumber', 'eqMotor'], ['chassisNumber', 'eqChassis'],
    ['insuranceNumber', 'eqInsNo'], ['insuranceStatus', 'eqInsStatus'], ['model', 'eqModel'], ['driverId', 'eqDriver'], ['purchasePrice', 'eqPurchasePrice'], ['inspectionDate', 'eqInspection'], ['licenseIssueDate', 'eqLicIssue'], ['vehicleLicenseExpiry', 'eqVehLicExp'],
    ['purchaseDate', 'eqPurchaseDate'], ['lastMaintenance', 'eqLastMaint'], ['nextMaintenance', 'eqNextMaint'], ['notes', 'eqNotes'], ['code', 'eqCode']].map(([k, id]) => [k, document.getElementById(id).value])));
  await page.evaluate(() => { document.getElementById('eqNotes').value = 'اتعدّلت'; document.getElementById('eqVehLicExp').value = '2020-02-02'; });
  n = await saveCount(); await page.click('#btnSaveEq'); await waitSave(n);
  const q2 = (await api(B.page, 'GET', '/api/v1/equipment/q2')).body;
  eq((await api(B.page, 'PATCH', '/api/v1/equipment/q2', { ...formQ2, notes: 'اتعدّلت', vehicleLicenseExpiry: '2020-02-02', extraFields: [], rev: q2.rev })).status, 200, 'PATCH معدة');
  // يومية تشغيل جديدة، وتعديل ed1، وحذف ed3
  await closeAll(); await page.evaluate(() => openEquipmentDailyModal('q1', null, '2026-03-20')); await page.waitForTimeout(500);
  await page.evaluate(() => { document.getElementById('edProject').value = 'مشروع الشروق'; }); await page.fill('#edHours', '6'); await page.fill('#edFuel', '10');
  n = await saveCount(); await page.click('#btnSaveEd'); await waitSave(n);
  eq((await api(B.page, 'POST', '/api/v1/equipment/daily', { equipmentId: 'q1', date: '2026-03-20', project: 'مشروع الشروق', kind: 'work', days: '1', dailyCost: '1000', hours: '6', hourlyCost: '150', fuelLiters: '10', fuelPrice: '12', extraCost: '0', productivity: '', notes: '' }, key())).status, 201, 'POST يومية');
  await closeAll(); await page.evaluate(() => openEquipmentDailyModal(null, 'ed1')); await page.waitForTimeout(400);
  await page.fill('#edNotes', 'اتعدّلت'); n = await saveCount(); await page.click('#btnSaveEd'); await waitSave(n);
  const ed1 = (await api(B.page, 'GET', '/api/v1/equipment/daily/ed1')).body;
  eq((await api(B.page, 'PATCH', '/api/v1/equipment/daily/ed1', { rev: ed1.rev, equipmentId: 'q1', date: '2026-03-02', project: 'مشروع الشروق', kind: 'work', days: '1', dailyCost: '1000', hours: '8', hourlyCost: '150', fuelLiters: '20', fuelPrice: '0', extraCost: '0', productivity: '', notes: 'اتعدّلت' })).status, 200, 'PATCH يومية');
  await closeAll(); await page.evaluate(() => { window.confirmDelete = () => Promise.resolve(true); openEquipmentDailyModal(null, 'ed3'); }); await page.waitForTimeout(400);
  n = await saveCount(); await page.click('#btnDelEd'); await waitSave(n);
  const ed3 = (await api(B.page, 'GET', '/api/v1/equipment/daily/ed3')).body;
  eq((await api(B.page, 'DELETE', `/api/v1/equipment/daily/ed3?rev=${ed3.rev}`)).status, 200, 'DELETE يومية');
  const snap = (pg) => pg.evaluate(() => {
    const nid = (x, k) => (/^(q|ed)\d+$/.test(x.id) ? x.id : `NEW:${k}:${x.code || x.date}`);
    const clean = (xs, k) => (xs || []).map((x) => { const o = JSON.parse(JSON.stringify(x)); o.id = nid(x, k); return o; }).sort((a, b) => a.id.localeCompare(b.id));
    return { e: clean(DATA.equipment, 'e'), d: clean(DATA.equipmentDaily, 'd'), types: (DATA.equipmentTypes || []).map((t) => t.name).sort() };
  });
  const reload = async (pg) => { await pg.reload(); await pg.waitForFunction(() => typeof DATA !== 'undefined' && window.WebSync && WebSync._state.meta && (DATA.equipment || []).length > 0, null, { timeout: 30000 }); await pg.waitForTimeout(400); };
  await reload(page); await reload(B.page);
  const sa = await snap(page), sb = await snap(B.page);
  eq(sb.e, sa.e, 'المعدات: نفس السجلات في الاتنين');
  eq(sb.d, sa.d, 'يوميات المعدات: نفس السجلات');
  eq(sb.types, sa.types, 'أنواع المعدات: نفس القايمة');

  eq(B.errors, [], 'no JS errors (B)');
  await B.browser.close();
  eq(errors, [], 'no JS errors');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
