// المرحلة 8 (الحزمة 8.8.6 — DEC-0142): مفتاح الحساب الجديد في الواجهة القديمة (settings.newDayPay) لتكلفة المشروع = السيرفر.
//  [1] projectCostSummary بالمفتاح: المصروف بكل سطوره (F-10)، والفاتورة بالصافي (F-11)، والعمالة والمعدات بالحساب الجديد (المفتاح نفسه)
//  [2] كل مشروع: القديمة بالمفتاح = الحساب الجديد في /api/v1/project-cost/one (بعد التقريب لخانتين)، والشاملة كمان
//  [3] من غير المفتاح: نفس الحساب القديم بالظبط (phase89)
// بيشتغل في WEB_MODE=1 (وفوق الجداول). في وضع الملف: [1] و[3] على القديمة بس.
const { openApp, WEB } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const P = (id, o) => Object.assign({ id, extraFields: [], attachments: [] }, o);
  const A = (id, o) => Object.assign({ id, status: 'present', days: 1, deduction: 0, notes: '', personType: 'worker', personKind: 'worker' }, o);
  const C = (id, o) => Object.assign({ id, notes: '', section: '', extraFields: [] }, o);
  const INV = (id, o) => Object.assign({ id, supplierId: 'sp1', vat: 0, stampDuty: 0, withheld: 0, isReturn: false, attachments: [] }, o);
  const seed = {
    users: [baseUser], schemaVersion: 9, settings: { newDayPay: true },
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
  const NAMES = ['مشروع الشروق', 'برج النيل', 'فيلا الندى', 'مخزن العبور', 'مشروع قديم'];
  const K = ['labor', 'equip', 'fuel', 'maint', 'advances', 'expenses', 'costs', 'suppliers', 'warehouse', 'total'];
  const r2 = (x) => Math.round(Number(x) * 100) / 100;
  const pick = (c) => Object.fromEntries(K.map((k) => [k, r2(c[k])]).concat([['budgetStatus', c.budgetStatus]]));
  console.log('[1] projectCostSummary بالمفتاح');
  const on = await page.evaluate((N) => N.map((n) => projectCostSummary(n)), NAMES);
  eq([on[0].expenses, on[0].suppliers, on[0].total], [350, 1030, 2520], 'الشروق: المصروف بسطوره (250 + 100) والفاتورة بالصافي (1130 − 100)');
  console.log('[3] من غير المفتاح');
  const off = await page.evaluate((N) => { DATA.settings.newDayPay = false; const r = N.map((n) => projectCostSummary(n)); DATA.settings.newDayPay = true; return r; }, NAMES);
  eq([off[0].expenses, off[0].suppliers, off[0].total], [250, 1040, 2430], 'الحساب القديم زي ما هو (phase89)');
  if (WEB) {
    const api = (u) => page.evaluate(async (u) => (await fetch(u, { headers: { Authorization: 'Bearer ' + WebSession.token() } })).json(), u);
    console.log('[2] السيرفر');
    const srv = []; for (const n of NAMES) srv.push(pick((await api('/api/v1/project-cost/one?name=' + encodeURIComponent(n))).new));
    eq(srv, on.map(pick), 'كل مشروع: القديمة بالمفتاح = الحساب الجديد في السيرفر');
    const comp = (await api('/api/v1/project-cost')).rows.map((r) => [r.name, r2(r.new.total)]).sort();
    const lc = await page.evaluate(() => { compCostFilters = { q: '', from: '', to: '' }; return compCostRows().map((r) => [r.name, Math.round(r.c.total * 100) / 100]); });
    eq(comp, lc.sort(), 'الشاملة: القديمة بالمفتاح = الجديد في السيرفر');
  } else ok(true, 'وضع الملف: مقارنة السيرفر بتتعمل في WEB_MODE=1');
  eq(errors, [], 'no JS errors');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
