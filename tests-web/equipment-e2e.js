// شاشة المعدات (8.7.5، DEC-0139): /app/equipment بتعرض نفس صفحة المعدات القديمة — اللوحات، والقايمة (الكروت، والفلاتر، والعناوين، والصفوف) بالفلاتر،
// ونافذة المعدة (الخانات والخيارات والقيم)، والجدول الشهري ونافذة اليومية. والحفظ (معدة، ويومية تشغيل، ويومية نقل بتكلفتها) والحذف من الجديدة.
// البيانات من غير أيام توقف أو نقل أو تكلفة إضافية، فالحساب الجديد (DEC-0140) = القديم هنا (الفرق متغطّي في equipment.e2e وphase87).
// التشغيل: node tests-web/equipment-e2e.js   (محتاج build للسيرفر والواجهة الجديدة + PostgreSQL للاختبار)
'use strict';
const path = require('path');
const { openWebApp } = require(path.join(__dirname, '../tests-merge/harness'));
const lib = require(path.join(__dirname, '../tests-merge/lib'));
const { baseUser, ok, summary } = lib;
const eq = (a, b, name) => { const A = JSON.stringify(a), B = JSON.stringify(b); if (A !== B) { let i = 0; while (A[i] === B[i]) i += 1; console.log('    ↯', JSON.stringify(A.slice(Math.max(0, i - 60), i + 40)), '≠', JSON.stringify(B.slice(Math.max(0, i - 60), i + 40))); } lib.eq(a, b, name); };
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
      E('q1', { code: 'EQ-001', name: 'المعدات — لودر', typeLabel: 'لودر', licenseCategory: 'المعدات', departmentId: '__core_eq_machinery__', categoryId: '__core_eq_machinery__', vehicleNumber: 'أ ب 1', dailyCost: 1000, hourlyCost: 150, supervisorId: 's1', project: 'مشروع الشروق', vehicleLicenseExpiry: '2020-01-01', insuranceStatus: 'insured', color: 'أصفر' }),
      E('q2', { code: 'EQ-002', name: 'سيارات النقل — قلاب', typeLabel: 'قلاب', licenseCategory: 'سيارات النقل', departmentId: '__core_eq_trucks__', categoryId: '__core_eq_trucks__', ownership: 'rented', status: 'maintenance', hourlyCost: 200, driverName: 'أحمد السواق', driverId: 'd1', purchasePrice: 250000 }),
      E('q3', { code: 'EQ-003', name: 'ملاكي', typeLabel: 'تويوتا', status: 'stopped', dailyCost: 300 }),
    ],
    equipmentDaily: [
      D('ed1', { equipmentId: 'q1', date: '2026-03-02', project: 'مشروع الشروق', hours: 8, fuelLiters: 20, fuelPrice: 10 }),
      D('ed3', { equipmentId: 'q2', date: '2026-03-02', project: 'مشروع الشروق', days: 0, hours: 5 }),
      D('ed5', { equipmentId: 'q3', date: '2026-03-05', project: 'مشروع الشروق', dailyCost: 250 }),
    ],
  };
  const t1 = 'const t1 = (el) => (el ? (el.innerText || "").replace(/\\s+/g, " ").trim() : "");';
  const grabBoards = () => [...document.querySelectorAll('.board-card')].map((b) => (b.innerText || '').replace(/\s+/g, ' ').trim());
  const grabList = () => {
    const t1 = (el) => (el ? (el.innerText || '').replace(/\s+/g, ' ').trim() : '');
    const root = document.querySelector('#pageContent .page, app-equipment .page'); const t = root.querySelector('table.data-table');
    const vis = (el) => el.offsetParent !== null && getComputedStyle(el).display !== 'none';
    return { title: t1(root.querySelector('.page-title')), cards: [...root.querySelectorAll('.sc-row .sc-card')].map(t1),
      filters: [...root.querySelectorAll('.filters-bar select, .filters-bar input')].map((x) => [x.id, x.tagName === 'SELECT' ? [...x.options].map((o) => o.textContent.trim()) : x.placeholder]),
      head: [...t.querySelectorAll('thead th')].filter(vis).map(t1), rows: [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.children].filter(vis).map(t1)) };
  };
  const modalOf = () => {
    const m = document.getElementById('appModal');
    const vis = (el) => el && el.offsetParent !== null && getComputedStyle(el).display !== 'none';
    const opts = (id) => { const el = document.getElementById(id); return el && el.tagName === 'SELECT' ? [...el.options].map((o) => o.textContent.trim()) : null; };
    const val = (id) => { const el = document.getElementById(id); return el ? String(el.value) : null; };
    const labels = (() => { const all = [...m.querySelectorAll('.modal-body label')].filter(vis); const parents = [...new Set(all.map((l) => l.parentElement))]; return all.map((l, i) => [l, parents.indexOf(l.parentElement), Number(getComputedStyle(l).order) || 0, i]).sort((x, y) => x[1] - y[1] || x[2] - y[2] || x[3] - y[3]).map((x) => x[0]); })()
      .map((l) => { const c = l.cloneNode(true); c.querySelectorAll('input,select,textarea,div,button,a,small,datalist').forEach((n) => n.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); });
    return { title: m.querySelector('.modal-header h3').textContent.trim(), labels,
      options: Object.fromEntries(['eqStatus', 'eqOwnership', 'eqInsStatus', 'edKind'].map((k) => [k, opts(k)])),
      values: Object.fromEntries(['eqCode', 'eqCarType', 'eqStatus', 'eqOwnership', 'eqVehicleNumber', 'eqColor', 'eqInsStatus', 'eqPurchasePrice', 'edDate', 'edDays', 'edDaily', 'edHourly', 'edFuelPrice', 'edKind'].map((k) => [k, val(k)])) };
  };
  const { browser, page, base: url, errors } = await openWebApp(seed);
  const settle = (ms = 400) => page.waitForTimeout(ms);
  const legacy = async (f, fn) => { await page.evaluate((f) => { try { closeModal(); } catch (e) { /* */ } goToPage('equipment'); Object.keys(equipmentFilters).forEach((k) => { equipmentFilters[k] = ''; }); equipmentFilters.detailId = ''; equipmentFilters.dailyView = false; Object.assign(equipmentFilters, f); rerenderCurrentPage(); }, f); await settle(); return page.evaluate(fn); };
  void t1;

  // ---------- القديمة
  const VIEWS = [{}, { status: 'working' }, { ownership: 'rented' }, { project: 'الشروق' }, { q: 'قلاب' }];
  const L = { boards: await legacy({ _boardLevel: '' }, grabBoards), views: [], machinery: null, modals: {} };
  for (const f of VIEWS) L.views.push(await legacy(Object.assign({ _boardLevel: 'list', departmentId: '' }, f), grabList));
  L.machinery = await legacy({ _boardLevel: 'list', departmentId: '__core_eq_machinery__' }, grabList);
  for (const [k, id] of [['add', null], ['q1', 'q1'], ['q2', 'q2']]) { await legacy({ _boardLevel: 'list', departmentId: '' }, () => 0); await page.evaluate((id) => openEquipmentModal(id || undefined), id); await page.waitForSelector('#appModal #eqCode'); await settle(300); L.modals[k] = await page.evaluate(modalOf); }
  await legacy({ _boardLevel: 'list', departmentId: '' }, () => 0); await page.evaluate(() => openEquipmentDailyModal('q1', null, '2026-03-09')); await page.waitForSelector('#appModal #edDays'); await settle(300); L.daily = await page.evaluate(modalOf);
  await page.evaluate(() => { try { closeModal(); } catch (e) { /* */ } });
  // الكود الجديد في القديمة بيتحسب بعد أي كود اتحجز — نقارن من غيره
  const noCode = (m) => ({ ...m, values: { ...m.values, eqCode: m.values.eqCode && m.values.eqCode.replace(/\d+$/, '#') } });

  // ---------- الجديدة
  const listResp = () => page.waitForResponse((r) => /\/api\/v1\/equipment(\?|$)/.test(r.url()) && r.request().method() === 'GET');
  const openList = async (dept, f = {}) => {
    await page.goto(url + '/app/equipment'); await page.waitForSelector('#eqBoards .board-card');
    let r = listResp(); await page.click(`[data-dept="${dept}"]`); await r; await settle(250);
    for (const [k, v] of Object.entries(f)) {
      const sel = { status: '#eqFilterStatus', ownership: '#eqFilterOwn', project: '#eqFilterProject', q: '#eqSearch' }[k];
      r = listResp(); if (k === 'status' || k === 'ownership') await page.selectOption(sel, v); else await page.fill(sel, v); await r; await settle(250);
    }
  };
  console.log('[اللوحات والقايمة]');
  await page.goto(url + '/app/equipment'); await page.waitForSelector('#eqBoards .board-card'); await settle(200);
  eq(await page.evaluate(grabBoards), L.boards, 'لوحات أقسام المعدات');
  for (const [i, f] of VIEWS.entries()) { await openList('', f); eq(await page.evaluate(grabList), L.views[i], `القايمة ${JSON.stringify(f)}: نفس الصفحة`); }
  await openList('__core_eq_machinery__'); eq(await page.evaluate(grabList), L.machinery, 'قسم المعدات: نفس الصفحة');

  console.log('[النوافذ] نفس الخانات والخيارات والقيم');
  await openList('');
  await page.click('#btnAddEquip'); await page.waitForSelector('#appModal #eqCode'); await settle(300);
  eq(noCode(await page.evaluate(modalOf)), noCode(L.modals.add), 'إضافة معدة: نفس النافذة');
  await page.click('#appModal .modal-close'); await settle(200);
  for (const id of ['q1', 'q2']) {
    await page.click(`.btn-edit-eq[data-id="${id}"]`); await page.waitForSelector('#appModal #eqCode'); await settle(300);
    eq(await page.evaluate(modalOf), L.modals[id], `تعديل ${id}: نفس النافذة`);
    await page.click('#appModal .modal-close'); await settle(200);
  }

  console.log('[الحفظ من الشاشة الجديدة]');
  const after = async (re, method, fn) => { const [r] = await Promise.all([page.waitForResponse((x) => re.test(x.url()) && x.request().method() === method), fn()]); return r.status(); };
  await page.click('#btnAddEquip'); await page.waitForSelector('#appModal #eqCode'); await settle(300);
  await page.selectOption('#eqType', '__core_eq_machinery__'); await page.fill('#eqCarType', 'حفار'); await page.selectOption('#eqStatus', 'working'); await page.selectOption('#eqOwnership', 'owned');
  eq(await after(/\/api\/v1\/equipment$/, 'POST', () => page.click('#btnSaveEq')), 201, 'إضافة معدة');
  await settle(500);
  ok(await page.evaluate(() => [...document.querySelectorAll('#eqTable tbody tr')].some((tr) => /حفار/.test(tr.innerText))), 'المعدة الجديدة في الجدول');
  await page.click('.btn-edit-eq[data-id="q3"]'); await page.waitForSelector('#appModal #eqCode'); await settle(300); await page.fill('#eqColor', 'أبيض');
  eq(await after(/\/api\/v1\/equipment\/q3$/, 'PATCH', () => page.click('#btnSaveEq')), 200, 'تعديل معدة');
  await settle(500);

  console.log('[اليوميات]');
  await page.click('.btn-daily-eq[data-id="q1"]'); await page.waitForSelector('#appModal #edDays'); await settle(300);
  await page.fill('#edDate', '2026-03-09');
  eq(await page.evaluate(modalOf), L.daily, 'نافذة يومية المعدة: نفس الخانات والقيم');
  await page.fill('#edProject', 'مشروع الشروق');
  ok(/١٬٠٠٠/.test(await page.innerText('#edCostVal')), 'المعاينة = يوم × يومية المعدة');
  eq(await after(/\/api\/v1\/equipment\/daily$/, 'POST', () => page.click('#btnSaveEd')), 201, 'يومية تشغيل');
  await settle(400);
  await page.click('#btnEqDailyView'); await page.waitForSelector('#eqdGrid'); await settle(200);
  await page.selectOption('#eqdYear', { label: '2026' }); await settle(300); await page.selectOption('#eqdMonth', { label: 'مارس' }); await settle(600);
  ok(await page.evaluate(() => !!document.querySelector('#eqdGrid .eqd-cell.filled[data-eq="q1"][data-day="9"]')), 'اليومية في الجدول الشهري');
  eq(await page.evaluate(() => [...document.querySelectorAll('#eqdGrid tbody tr')].map((tr) => tr.getAttribute('data-id'))).then((x) => x.slice().sort()), ['q1', 'q2', 'q3', ...[]].concat([]).sort().concat(await page.evaluate(() => [...document.querySelectorAll('#eqdGrid tbody tr')].map((tr) => tr.getAttribute('data-id')).filter((x) => !/^q\d$/.test(x)))).sort(), 'صفوف المعدات');
  ok(await page.evaluate(() => !document.querySelector('#eqdDiff')), 'من غير توقف أو نقل: الحسابين واحد');
  // نقل بتكلفته (DEC-0140)
  await page.click('.eqd-cell.empty[data-eq="q2"][data-day="10"]'); await page.waitForSelector('#appModal #edDays'); await settle(300);
  await page.fill('#edProject', 'مشروع الشروق'); await page.selectOption('#edKind', 'move'); await settle(200);
  ok(await page.isVisible('#edMoveCost'), 'خانة تكلفة النقل ظاهرة في «نقل»');
  eq(await after(/\/api\/v1\/equipment\/daily$/, 'POST', () => page.click('#btnSaveEd')), 400, 'نقل من غير تكلفة: مرفوض');
  await page.fill('#edMoveCost', '600'); await settle(100);
  ok(/٦٠٠/.test(await page.innerText('#edCostVal')), 'المعاينة = تكلفة النقل');
  eq(await after(/\/api\/v1\/equipment\/daily$/, 'POST', () => page.click('#btnSaveEd')), 201, 'يومية نقل');
  await settle(600);
  ok(await page.evaluate(() => !!document.querySelector('#eqdDiff')), 'سطر الفرق بين الحسابين ظاهر');
  await page.click('#eqdList .btn-del-eqd'); await page.waitForSelector('#appConfirmModal #btnConfirmDel');
  eq(await after(/\/api\/v1\/equipment\/daily\//, 'DELETE', () => page.click('#btnConfirmDel')), 200, 'حذف يومية');
  eq(errors.filter((e) => !/status of 400/.test(e)), [], 'من غير أخطاء');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
