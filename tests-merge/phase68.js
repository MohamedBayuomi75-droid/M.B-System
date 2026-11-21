// المرحلة 7 (الحزمة 7.2 — فواتير الموردين): السيرفر بيحسب القايمة والفلاتر والبحث والترتيب والكروت وعمود الحالة والاستحقاق
// والباقي والمتأخرة وشارة «بيانات ناقصة» — بنفس الدوال القديمة (server/src/supplier-invoices/invoice-rules.ts).
// الاختبار بيقارن ناتج السيرفر بالدوال القديمة نفسها (getFilteredInvoices، وinvoiceStatusKey، وinvoiceRemaining، وisInvoiceOverdue،
// وgetInvoiceDueDate، وinvoiceMissingFields، وكروت renderInvoicesPage) على نفس البيانات، لكل مجموعة فلاتر.
// بيشتغل في وضع الويب (WEB_MODE=1، وفوق الجداول). في وضع الملف بيتأكد من الدوال القديمة بس.
const { openApp, WEB } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const inv = (id, o) => Object.assign({ id, supplierId: 's1', invoiceNo: id.toUpperCase(), date: '2025-06-10', category: 'مواد', project: 'مشروع أ', description: 'أسمنت', internalCode: 'C1', supplierItemCode: 'S1',
    nature: '001', discountType: '01', dueDate: '', baseValue: 1000, vat: 140, stampDuty: 0, withheld: 10, totalInvoice: 1140, netInvoice: 1130, isReturn: false, attachments: [], notes: '' }, o);
  const seed = {
    users: [baseUser],
    ledger: {
      suppliers: [
        { id: 's1', name: 'شركة الإنشاءات', taxId: '123-456', openingBalance: 0, extraFields: [{ label: 'فرع', value: 'الجيزة' }], attachments: [] },
        { id: 's2', name: 'مؤسسة النور', taxId: '', openingBalance: 0, extraFields: [], attachments: [] },
      ],
      invoices: [
        inv('a1'),                                                                                       // متأخرة ومش مدفوعة
        inv('a2', { date: '2025-07-01', dueDate: '2099-01-01', notes: 'دفعة مقدمة ١٬١٤٥' }),             // مدفوعة جزئي، مش متأخرة
        inv('a3', { date: '2025-07-15', supplierId: 's2', category: 'كهرباء', withheld: 0, netInvoice: 1140, description: 'كابلات', attachments: [{ id: 'f1', name: 'عقد التوريد.pdf' }] }), // مدفوعة بالكامل
        inv('a4', { date: '2026-01-05', baseValue: 2500.5, vat: 350.07, totalInvoice: 2850.57, netInvoice: 2840.57, project: 'مشروع ب', internalCode: '', nature: '' }), // ناقصة
        inv('a5', { date: '2026-02-01', totalInvoice: 999, netInvoice: 999 }),                           // حسابها غلط
        inv('r1', { date: '2025-08-01', isReturn: true, linkedInvoiceId: 'a1', baseValue: 100, vat: 14, withheld: 0, totalInvoice: 114, netInvoice: 114 }),
        inv('r2', { date: '2026-02-10', isReturn: true, supplierId: 's2', baseValue: 50, vat: 7, withheld: 0, totalInvoice: 57, netInvoice: 57 }),
        inv('c1', { date: '2025-05-01', cancelled: true, invoiceNo: 'ملغاة-1' }),
      ],
      payments: [
        { id: 'p1', paymentNo: 1, supplierId: 's1', invoiceId: 'a2', amount: 500, direction: 'pay', date: '2025-07-05' },
        { id: 'p2', paymentNo: 2, supplierId: 's2', invoiceId: 'a3', amount: 1140, direction: 'pay', date: '2025-07-20' },
      ],
    },
  };
  const { browser, page, errors } = await openApp(seed);
  const FILTERS = [
    { mode: 'invoices' }, { mode: 'returns' }, { mode: '' },
    { mode: 'invoices', q: 'اسمنت' }, { mode: 'invoices', q: 'الجيزه' }, { mode: 'invoices', q: 'عقد التوريد' }, { mode: 'invoices', q: '1,145' }, { mode: 'invoices', q: '10/6/2025' },
    { mode: 'invoices', q: 'مؤسسه كابلات' }, { mode: '', q: 'مرتجع' },
    { mode: 'invoices', supplierId: 's1' }, { mode: 'invoices', category: 'كهرباء' }, { mode: 'invoices', project: 'مشروع ب' },
    { mode: 'invoices', year: '2025' }, { mode: 'invoices', month: '07' }, { mode: 'invoices', from: '2025-07-01', to: '2026-01-31' },
    { mode: 'invoices', overdueOnly: true }, { mode: 'invoices', status: 'paid' }, { mode: 'invoices', status: 'partial' }, { mode: 'invoices', status: 'unpaid' }, { mode: 'invoices', status: 'overdue' },
    { mode: '', kind: 'return' }, { mode: 'invoices', withheld: 'yes' }, { mode: 'invoices', withheld: 'no' }, { mode: 'invoices', min: '1000', max: '1135' },
    { mode: 'invoices', sort: 'old' }, { mode: 'invoices', sort: 'amount_desc' }, { mode: 'invoices', sort: 'amount_asc' }, { mode: '', sort: 'supplier' }, { mode: 'invoices', sort: 'no' },
  ];
  const legacy = await page.evaluate((FILTERS) => FILTERS.map((f) => {
    Object.assign(invoiceFilters, { supplierId: '', category: '', project: '', from: '', to: '', q: '', overdueOnly: false, year: '', month: '', kind: '', status: '', withheld: '', min: '', max: '', sort: 'new' }, f);
    const rows = getFilteredInvoices(f.mode);
    const signed = (b, key) => (b.isReturn ? -1 : 1) * Number(b[key] || 0);
    const sum = (key) => rows.reduce((a, b) => a + signed(b, key), 0);
    return { ids: rows.map((r) => r.id), totals: { count: rows.length, gross: sum('totalInvoice'), vat: sum('vat'), stamp: sum('stampDuty'), withheld: sum('withheld'), net: rows.reduce((a, b) => a + invoiceSignedNet(b), 0) } };
  }), FILTERS);
  const perRow = await page.evaluate(() => DATA.ledger.invoices.map((i) => ({ id: i.id, due: getInvoiceDueDate(i), remaining: invoiceRemaining(i), overdue: isInvoiceOverdue(i), status: invoiceStatusKey(i), missing: invoiceMissingFields(i) })).sort((a, b) => (a.id < b.id ? -1 : 1)));

  console.log('[1] الدوال القديمة (المرجع)');
  eq(legacy[0].ids.length, 6, 'كل الفواتير (من غير المرتجعات) = 6');
  eq(legacy[1].ids, ['r2', 'r1'], 'المرتجعات بالأحدث');
  eq(legacy[4].ids, ['a5', 'a4', 'a2', 'a1', 'c1'], 'البحث في الحقول الإضافية للمورد بعد التطبيع (الجيزه = الجيزة)');
  eq(perRow.find((r) => r.id === 'a2').status, 'partial', 'حالة المدفوعة جزئي');

  if (WEB) {
    console.log('[2] السيرفر = الدوال القديمة لكل مجموعة فلاتر');
    for (let i = 0; i < FILTERS.length; i++) {
      const f = FILTERS[i];
      const qs = Object.entries(f).map(([k, v]) => `${k}=${encodeURIComponent(v === true ? '1' : v)}`).join('&');
      const r = await page.evaluate((qs) => WebSession.api('GET', '/api/v1/supplier-invoices?' + qs), qs);
      const t = r.body.totals || {};
      const close = (a, b) => Math.abs(a - b) < 1e-9;
      ok(r.status === 200 && JSON.stringify(r.body.rows.map((x) => x.id)) === JSON.stringify(legacy[i].ids)
        && Object.keys(legacy[i].totals).every((k) => close(t[k], legacy[i].totals[k])), `${JSON.stringify(f)} ← ${legacy[i].ids.length} صف، نفس الترتيب والكروت`, { server: r.body.rows && r.body.rows.map((x) => x.id), legacy: legacy[i].ids, t, lt: legacy[i].totals });
    }
    console.log('[3] لكل فاتورة: الاستحقاق والباقي والمتأخرة والحالة و«بيانات ناقصة»');
    const all = await page.evaluate(() => WebSession.api('GET', '/api/v1/supplier-invoices?mode='));
    const server = all.body.rows.map((x) => ({ id: x.id, due: x.dueDateEffective, remaining: x.remaining, overdue: x.overdue, status: x.status, missing: x.missing })).sort((a, b) => (a.id < b.id ? -1 : 1));
    eq(server, perRow, 'نفس القيم لكل الفواتير والمرتجعات');
  } else ok(true, 'وضع الملف: مقارنة السيرفر بتتعمل في WEB_MODE=1');

  eq(errors, [], 'no JS errors');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
