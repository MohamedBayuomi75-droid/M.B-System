// المرحلة 8 (الحزمة 8.8.4 — تكلفة المشروع والتكاليف): السيرفر (/api/v1/project-cost و/api/v1/costs) = الواجهة القديمة (DEC-0142).
//  [1] تكلفة كل مشروع بالحساب القديم = projectCostSummary (بفترة ومن غيرها)، وبنود الموردين والمخازن = projectSupplyCostLines
//  [2] الشاملة بالحساب القديم = compCostRows (الأعمدة، والمحصّل، والمسجّل، والإجمالي)، وعمود صفحة المشاريع وحالة الميزانية
//  [3] الحساب الجديد (TR-10) قدام القديم: الفرق بس في المصروف بسطور (F-10) والفاتورة بالصافي (F-11)
//  [4] صفحة التكاليف: اللوحات، والأقسام، والجدول بكل فلتر، والبنود = القديمة
//  [5] الحفظ: نافذة التكلفة والأقسام والبنود في A = الـ API في B — نفس السجلات والقوايم
// بيشتغل في WEB_MODE=1 (وفوق الجداول). في وضع الملف بيعدّي.
const { openApp, WEB } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const P = (id, o) => Object.assign({ id, extraFields: [], attachments: [] }, o);
  const A = (id, o) => Object.assign({ id, status: 'present', days: 1, deduction: 0, notes: '', personType: 'worker', personKind: 'worker' }, o);
  const C = (id, o) => Object.assign({ id, notes: '', section: '', extraFields: [] }, o);
  const INV = (id, o) => Object.assign({ id, supplierId: 'sp1', vat: 0, stampDuty: 0, withheld: 0, isReturn: false, attachments: [] }, o);
  const seed = {
    users: [baseUser], schemaVersion: 9,
    projects: [
      { id: 'pA', code: 'PRJ-001', name: 'مشروع الشروق', status: 'active', budget: 10000, value: 10000 },
      { id: 'pB', code: 'PRJ-002', name: 'برج النيل', status: 'active', budget: 2000, value: 2000 },
      { id: 'pC', code: 'PRJ-003', name: 'فيلا الندى', status: 'active', budget: 1000, value: 1000 },
      { id: 'pD', code: 'PRJ-004', name: 'مخزن العبور', status: 'active' },
    ],
    workers: [P('w1', { code: 'WRK-001', name: 'عامل أول', status: 'active', dailyWage: 300 }), P('w2', { code: 'WRK-002', name: 'عامل تاني', status: 'active', dailyWage: 200 })],
    supervisors: [P('s1', { code: 'SUP-001', name: 'سامي المشرف', status: 'active', dailyWage: 400 })],
    drivers: [P('d1', { code: 'DRV-001', name: 'أحمد السواق', status: 'active', dailyWage: 280 })],
    employees: [P('e1', { code: 'EMP-001', name: 'منى المحاسبة', status: 'active', salary: 6000 })],
    equipment: [P('q1', { code: 'EQ-001', name: 'لودر', status: 'working', dailyCost: 1000 })],
    workerAttendance: [
      A('a1', { personId: 'w1', workerId: 'w1', date: '2026-03-01', dayWage: 300, project: 'مشروع الشروق' }),
      A('a2', { personId: 'w1', workerId: 'w1', date: '2026-03-02', dayWage: 300, days: 1.5, project: 'مشروع الشروق' }),
      A('a3', { personId: 'w2', workerId: 'w2', date: '2026-04-05', dayWage: 200, project: 'برج النيل' }),
      A('a4', { personId: 'w2', workerId: 'w2', date: '2026-03-03', dayWage: 200, status: 'absent', project: 'برج النيل' }),
    ],
    equipmentDaily: [{ id: 'ed1', equipmentId: 'q1', date: '2026-03-02', days: 1, hours: 0, fuelLiters: 0, kind: 'work', project: 'برج النيل', notes: '' }],
    fuelLogs: [{ id: 'f1', date: '2026-03-04', project: 'برج النيل', cost: 120.5, liters: 10 }],
    equipmentLogs: [{ id: 'm1', date: '2026-03-05', project: 'مشروع الشروق', cost: 75, type: 'maintenance' }],
    projectDaily: [{ id: 'pd1', date: '2026-03-06', project: 'فيلا الندى', laborCost: 500, equipCost: 300, fuelCost: 50 }],
    expenses: [
      { id: 'x1', date: '2026-03-07', project: 'مشروع الشروق', amount: 250, type: 'نثريات', personKind: 'worker', personId: 'w1', notes: '' },
      { id: 'x2', date: '2026-03-08', project: 'مشروع الشروق', lines: [{ item: 'شاي', amount: 40 }, { item: 'مياه', amount: 60 }], personKind: 'worker', personId: 'w1', notes: '' },
    ],
    costs: [
      C('c1', { personKind: 'worker', personId: 'w1', date: '2026-03-03', amount: 75, item: 'مواصلات', project: 'مشروع الشروق', section: 'مواقع' }),
      C('c2', { personKind: 'worker', personId: 'w2', date: '2026-03-09', amount: 130, lines: [{ item: 'خامات', amount: 100 }, { item: 'مواصلات', amount: 30 }], item: 'خامات + مواصلات', project: 'برج النيل' }),
      C('c3', { personKind: 'supervisor', personId: 's1', date: '2026-04-01', amount: 60, item: 'اتصالات', project: 'مشروع قديم', section: '' }),
      C('c4', { personKind: 'equipment', personId: 'q1', date: '2026-03-10', amount: 90, item: 'شحن ونقل', project: 'فيلا الندى' }),
      C('c5', { personKind: 'driver', personId: 'd1', date: '2026-03-11', amount: 45.5, item: 'وقود', project: '' }),
    ],
    costSections: { workers: ['مواقع', 'ورشة'] },
    ledger: {
      suppliers: [{ id: 'sp1', name: 'مورد الحديد', extraFields: [], attachments: [] }],
      invoices: [
        INV('i1', { invoiceNo: 'F-1', date: '2026-03-12', project: 'مشروع الشروق', baseValue: 1000, vat: 140, totalInvoice: 1140, withheld: 10, netInvoice: 1130 }),
        INV('i2', { invoiceNo: 'R-1', date: '2026-03-13', project: 'مشروع الشروق', baseValue: 100, totalInvoice: 100, netInvoice: 100, isReturn: true }),
        INV('i3', { invoiceNo: 'F-2', date: '2026-03-14', project: 'مشروع الشروق', baseValue: 500, totalInvoice: 500, netInvoice: 500, cancelled: true }),
        INV('i4', { invoiceNo: 'F-3', date: '2026-03-15', project: 'برج النيل', baseValue: 800, totalInvoice: 800, netInvoice: 800 }),
      ],
      payments: [],
    },
    warehouses: { items: [{ id: 'it1', code: 'IT-1', name: 'أسمنت', unit: 'شيكارة', avgCost: 90 }], movements: [
      { id: 'mv1', type: 'in', itemId: 'it1', qty: 10, supplierInvoiceId: 'i4', date: '2026-03-15' },
      { id: 'mv2', type: 'out', itemId: 'it1', qty: 3, unitCost: 80, project: 'مشروع الشروق', date: '2026-03-16' },
      { id: 'mv3', type: 'out', itemId: 'it1', qty: 2, project: 'برج النيل', date: '2026-03-17' },
    ] },
    clients: { customers: [{ id: 'cA', name: 'شركة الأمل', code: 'C1', status: 'active', projects: [], boqs: [], workSurveys: [], collections: [], contracts: [],
      invoices: [{ no: 'INV-1', project: 'مشروع الشروق', total: 5000, paid: 3000, date: '2026-03-20' }, { no: 'INV-2', project: 'برج النيل', total: 1000, paid: 0, date: '2026-03-21' }] }] },
  };
  const { browser, page, errors } = await openApp(seed);
  if (!WEB) { ok(true, 'وضع الملف: مقارنة السيرفر بتتعمل في WEB_MODE=1'); eq(errors, [], 'no JS errors'); await browser.close(); summary(); return; }
  const api = (pg, m, u, body, h) => pg.evaluate(async ([m, u, body, h]) => {
    const res = await fetch(u, { method: m, headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer ' + WebSession.token(), ...h }, body: body ? JSON.stringify(body) : undefined });
    let j = null; try { j = await res.json(); } catch (e) { /* */ } return { status: res.status, body: j };
  }, [m, u, body || null, h || {}]);
  const qs = (f) => Object.entries(f).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const NAMES = ['مشروع الشروق', 'برج النيل', 'فيلا الندى', 'مخزن العبور', 'مشروع قديم'];

  console.log('[1] تكلفة كل مشروع (القديم)');
  for (const [f, t] of [['', ''], ['2026-03-01', '2026-03-31']]) {
    const L = await page.evaluate(([N, f, t]) => N.map((n) => projectCostSummary(n, f, t)), [NAMES, f, t]);
    const S = []; for (const n of NAMES) S.push((await api(page, 'GET', '/api/v1/project-cost/one?' + qs({ name: n, from: f, to: t }))).body.legacy);
    eq(S, L, `projectCostSummary ${f || 'كل الفترات'}`);
  }
  const lines = await page.evaluate(() => ['مشروع الشروق', 'برج النيل'].map((n) => projectSupplyCostLines(n)));
  const sl = []; for (const n of ['مشروع الشروق', 'برج النيل']) sl.push((await api(page, 'GET', '/api/v1/project-cost/one?' + qs({ name: n }))).body.supplyLines.legacy);
  eq(sl, lines, 'بنود الموردين والمخازن');

  console.log('[2] الشاملة وعمود المشاريع (القديم)');
  for (const f of [{}, { q: 'النيل' }, { from: '2026-03-01', to: '2026-03-31' }]) {
    const L = await page.evaluate((f) => { compCostFilters = Object.assign({ q: '', from: '', to: '' }, f); return compCostRows().map((r) => ({ name: r.name, c: r.c, collected: r.collected, net: r.net, registered: r.registered })).sort((a, b) => a.name.localeCompare(b.name)); }, f);
    const S = (await api(page, 'GET', '/api/v1/project-cost?' + qs(f))).body.rows.map((r) => ({ name: r.name, c: r.legacy, collected: r.collected, net: r.legacyNet, registered: r.registered })).sort((a, b) => a.name.localeCompare(b.name));
    eq(S, L, `الشاملة ${JSON.stringify(f)}`);
  }
  const bp = (await api(page, 'GET', '/api/v1/project-cost/by-project')).body;
  const lp = await page.evaluate(() => Object.fromEntries(DATA.projects.map((p) => { const c = projectCostSummary(p.name); return [p.id, [c.total, c.budgetStatus]]; })));
  eq(Object.fromEntries(Object.entries(bp).map(([id, v]) => [id, [v.legacyTotal, v.legacyStatus]])), lp, 'عمود التكلفة وحالة الميزانية');

  console.log('[3] الحساب الجديد قدام القديم');
  const one = (await api(page, 'GET', '/api/v1/project-cost/one?' + qs({ name: 'مشروع الشروق' }))).body;
  const diff = Object.keys(one.legacy).filter((k) => !['budget', 'budgetStatus'].includes(k) && String(one.legacy[k]) !== String(one.new[k])).map((k) => [k, one.legacy[k], one.new[k]]);
  eq(diff, [['expenses', 250, '350'], ['suppliers', 1040, '1030'], ['total', 2430, '2520']], 'الفرق بس في المصروف بسطور (F-10) والفاتورة بالصافي (F-11)');
  const nile = (await api(page, 'GET', '/api/v1/project-cost/one?' + qs({ name: 'برج النيل' }))).body;
  eq([nile.legacy.total, nile.new.total], [1630.5, '1630.5'], 'مشروع من غير فرق: نفس الرقم');

  console.log('[4] صفحة التكاليف = القديمة');
  const B0 = (await api(page, 'GET', '/api/v1/costs/boards')).body;
  eq(B0.kinds.map((k) => [k.id, k.count, k.total]), await page.evaluate(() => ['worker', 'supervisor', 'driver', 'employee', 'equipment'].map((k, i) => { const it = DATA.costs.filter((c) => c && c.personKind === k); return [['workers', 'supervisors', 'drivers', 'employees', 'equipment'][i], it.length, toInt(it.reduce((s, c) => s + toInt(c.amount), 0))]; })), 'لوحات الفئات');
  const VIEWS = [['workers', '', {}], ['workers', 'مواقع', {}], ['workers', '', { q: 'خامات' }], ['workers', '', { item: 'مواصلات' }], ['workers', '', { project: 'النيل' }], ['workers', '', { from: '2026-03-05', to: '2026-03-31' }], ['supervisors', '', {}], ['equipment', '', {}], ['drivers', '', { q: 'وقود' }]];
  for (const [tab, sec, f] of VIEWS) {
    const L = await page.evaluate(([tab, sec, f]) => { costFilters = Object.assign({ q: '', personKind: '', personId: '', item: '', project: '', from: '', to: '' }, f); goToPage('costs'); window.__costTab = tab; window.__costSection = sec; window.__costShowAll = !sec; rerenderCurrentPage();
      const root = document.querySelector('#pageContent .page, #app .page'); const t1 = (el) => (el.innerText || '').replace(/\s+/g, ' ').trim();
      return { rows: [...root.querySelectorAll('table.data-table tbody tr')].map((tr) => [...tr.children].slice(0, 7).map(t1)).filter((r) => r.length === 7), cards: [...root.querySelectorAll('.stats-row .stat-card .num')].map(t1) }; }, [tab, sec, f]);
    const S = (await api(page, 'GET', '/api/v1/costs/table?' + qs({ tab, section: sec, all: sec ? '' : '1', ...f }))).body;
    const fd = (d) => { const m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${Number(m[3])}/${Number(m[2])}/${m[1]}` : d ? String(d) : '—'; };
    const fm = (n) => `${(Number(n) || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م`;
    eq({ rows: S.rows.map((r) => [fd(r.date), r.name, r.itemText, r.section || '—', r.project || '—', r.notes, fm(r.amount)]), cards: [String(S.cards.count), fm(S.cards.total)] },
      { rows: L.rows, cards: L.cards.map((x, i) => (i === 0 ? x.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)) : x)) }, `الجدول ${tab} ${sec} ${JSON.stringify(f)}`);
  }
  const secs = (await api(page, 'GET', '/api/v1/costs/table?tab=workers')).body.sections.map((x) => [x.name, x.count, x.total]);
  eq(secs, await page.evaluate(() => { const all = DATA.costs.filter((c) => c.personKind === 'worker'); return [['الكل', all.length, toInt(all.reduce((s, c) => s + toInt(c.amount), 0))], ...DATA.costSections.workers.map((s) => { const it = all.filter((c) => (c.section || '') === s); return [s, it.length, toInt(it.reduce((a, c) => a + toInt(c.amount), 0))]; })]; }), 'لوحات الأقسام');
  const fo = (await api(page, 'GET', '/api/v1/costs/form-options')).body;
  eq({ worker: fo.suggestions.worker, driver: fo.suggestions.driver, used: (await api(page, 'GET', '/api/v1/costs/table?tab=workers')).body.items }, await page.evaluate(() => ({ worker: costItemSuggestions('worker'), driver: costItemSuggestions('driver'), used: costItemsUsed() })), 'البنود المقترحة والمستخدمة');

  console.log('[5] الحفظ: القديمة (A) = الـ API (B)');
  const B = await openApp(seed);
  const saveCount = () => page.evaluate(() => window.__saveCount);
  const waitSave = async (n) => { await page.waitForFunction((x) => window.__saveCount > x, n, { timeout: 15000 }); await page.waitForTimeout(300); };
  const closeAll = async () => { await page.evaluate(() => { try { closeSubModal(); } catch (e) { /* */ } try { closeModal(); } catch (e) { /* */ } }); await page.waitForTimeout(250); };
  const key = () => ({ 'Idempotency-Key': 'cst-' + Math.random().toString(36).slice(2) });
  const view = async (tab, all) => { await closeAll(); await page.evaluate(([tab, all]) => { costFilters = { q: '', personKind: '', personId: '', item: '', project: '', from: '', to: '' }; goToPage('costs'); window.__costTab = tab; window.__costSection = ''; window.__costShowAll = all; rerenderCurrentPage(); }, [tab, all]); await page.waitForTimeout(250); };
  // إضافة بسطرين وبند جديد
  await view('workers', true); await page.click('#btnAddCost'); await page.waitForSelector('#appModal #btnSaveCost');
  await page.evaluate(() => { if (typeof setEntityComboValue === 'function') setEntityComboValue('cstFPerson', 'w2'); const h = document.getElementById('cstFPerson'); if (h) h.value = 'w2'; });
  await page.fill('#cstFDate', '2026-03-18'); await page.fill('#cstFProject', ' مشروع الشروق '); await page.selectOption('#cstSection', 'ورشة'); await page.fill('#cstFNotes', ' ملاحظة ');
  await page.locator('#cstLines .cst-item').first().fill(' خامات '); await page.locator('#cstLines .cst-amt').first().fill('150.255');
  await page.click('#btnCstAddLine'); await page.locator('#cstLines .cst-item').nth(1).fill('بند جديد'); await page.locator('#cstLines .cst-amt').nth(1).fill('20');
  await page.click('#btnCstAddLine'); // سطر فاضي بيتشال
  let n = await saveCount(); await page.click('#btnSaveCost'); await waitSave(n);
  eq((await api(B.page, 'POST', '/api/v1/costs', { personKind: 'worker', personId: 'w2', date: '2026-03-18', project: ' مشروع الشروق ', section: 'ورشة', notes: ' ملاحظة ', lines: [{ item: ' خامات ', amount: '150.255' }, { item: 'بند جديد', amount: '20' }, { item: '', amount: '' }] }, key())).status, 201, 'POST تكلفة');
  eq((await api(B.page, 'POST', '/api/v1/costs', { personKind: 'worker', personId: 'w2', date: '2026-03-18', lines: [{ item: 'x', amount: '0' }] }, key())).body.message, 'اكتب بند واحد على الأقل بمبلغ أكبر من صفر', 'التحقق برسالة القديمة');
  // تعديل c1
  await view('workers', true); await page.click('.btn-edit-cst[data-id="c1"]'); await page.waitForSelector('#appModal #btnSaveCost');
  await page.locator('#cstLines .cst-amt').first().fill('80'); await page.fill('#cstFNotes', 'تعديل');
  n = await saveCount(); await page.click('#btnSaveCost'); await waitSave(n);
  const c1 = (await api(B.page, 'GET', '/api/v1/costs/c1')).body;
  eq((await api(B.page, 'PATCH', '/api/v1/costs/c1', { rev: c1.rev, personKind: 'worker', personId: 'w1', date: '2026-03-03', project: 'مشروع الشروق', section: 'مواقع', notes: 'تعديل', lines: [{ item: 'مواصلات', amount: '80' }] })).status, 200, 'PATCH تكلفة');
  // حذف c3
  await view('supervisors', true); await page.click('.btn-del-cst[data-id="c3"]'); await page.waitForSelector('#appConfirmModal');
  n = await saveCount(); await page.click('#appConfirmModal .btn-danger'); await waitSave(n);
  const c3 = (await api(B.page, 'GET', '/api/v1/costs/c3')).body;
  eq((await api(B.page, 'DELETE', `/api/v1/costs/c3?rev=${c3.rev}`)).status, 200, 'DELETE تكلفة');
  // الأقسام
  await view('workers', false);
  await page.click('#btnCostAddSec'); await page.waitForSelector('#costSecName'); await page.fill('#costSecName', 'مكتب'); n = await saveCount(); await page.click('#btnDoCostSec'); await waitSave(n);
  await page.click('#btnCostRenSec'); await page.waitForSelector('#costRenOld'); await page.selectOption('#costRenOld', 'مواقع'); await page.fill('#costRenNew', 'المواقع'); n = await saveCount(); await page.click('#btnDoCostRen'); await waitSave(n);
  await page.click('#btnCostDelSec'); await page.waitForSelector('#costDelSec'); await page.selectOption('#costDelSec', 'ورشة'); await page.click('#btnDoCostDel'); await page.waitForSelector('#appConfirmModal');
  n = await saveCount(); await page.click('#appConfirmModal .btn-danger'); await waitSave(n);
  for (const b of [{ tab: 'workers', op: 'add', name: 'مكتب' }, { tab: 'workers', op: 'rename', name: 'مواقع', to: 'المواقع' }, { tab: 'workers', op: 'delete', name: 'ورشة' }]) eq((await api(B.page, 'POST', '/api/v1/costs/sections', b)).status, 201, `القسم: ${b.op}`);
  // تغيير اسم بند (من إدارة البنود في النافذة) وحذف بند
  await view('workers', true); await page.click('#btnAddCost'); await page.waitForSelector('#btnCstManageItems'); await page.click('#btnCstManageItems'); await page.waitForSelector('#appSubModal .pitem-row');
  await page.locator('#appSubModal .pitem-row[data-item="مواصلات"] .pitem-edit').fill('انتقالات'); n = await saveCount(); await page.click('#appSubModal .pitem-row[data-item="مواصلات"] .btn-save-pitem'); await waitSave(n);
  n = await saveCount(); await page.click('#appSubModal .pitem-row[data-item="اتصالات"] .btn-del-pitem'); await waitSave(n);
  await closeAll();
  eq((await api(B.page, 'POST', '/api/v1/costs/items', { kind: 'worker', op: 'rename', label: 'مواصلات', to: 'انتقالات' })).status, 201, 'البند: تغيير اسم');
  eq((await api(B.page, 'POST', '/api/v1/costs/items', { kind: 'worker', op: 'remove', label: 'اتصالات' })).status, 201, 'البند: حذف');
  const snap = (pg) => pg.evaluate(() => {
    const clean = (xs) => (xs || []).map((x) => { const { createdAt, updatedAt, ...o } = JSON.parse(JSON.stringify(x)); void createdAt; void updatedAt; o.id = /^c\d+$/.test(x.id) ? x.id : `NEW:${x.date}`; return Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1))); }).sort((a, b) => a.id.localeCompare(b.id));
    return { costs: clean(DATA.costs), sections: DATA.costSections && DATA.costSections.workers, pools: DATA.costItemPools && DATA.costItemPools.worker, hidden: DATA.costItemHidden && DATA.costItemHidden.worker };
  });
  const reload = async (pg) => { await pg.reload(); await pg.waitForFunction(() => typeof DATA !== 'undefined' && window.WebSync && WebSync._state.meta && (DATA.costs || []).length > 0, null, { timeout: 30000 }); await pg.waitForTimeout(400); };
  await reload(page); await reload(B.page);
  const sa = await snap(page), sb = await snap(B.page);
  eq(sb.costs, sa.costs, 'التكاليف: نفس السجلات في الاتنين');
  eq([sb.sections, sb.pools, sb.hidden], [sa.sections, sa.pools, sa.hidden], 'الأقسام والبنود: نفس القوايم');

  eq(B.errors.filter((e) => !/status of 400/.test(e)), [], 'no JS errors (B) — غير رفض التحقق المقصود');
  await B.browser.close();
  eq(errors, [], 'no JS errors');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
