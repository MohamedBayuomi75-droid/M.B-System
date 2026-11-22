// المرحلة 7 (الحزمة 7.3 — دفعات الموردين): السيرفر بيحسب قايمة الدفعات وفلاترها وبحثها وترتيبها والكارتين، والرصيد بالطريقة الحالية (للعلامة)،
// بنفس الدوال القديمة (server/src/supplier-payments/payment-rules.ts). الاختبار بيقارن ناتج السيرفر بالدوال القديمة نفسها
// (getFilteredPayments، وsupplierBalance) على نفس البيانات، لكل مجموعة فلاتر. والرصيد بـ F-05 بيتقارن بالحساب اليدوي للقاعدة المعتمدة.
// بيشتغل في وضع الويب (WEB_MODE=1، وفوق الجداول). في وضع الملف بيتأكد من الدوال القديمة بس.
const { openApp, WEB } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const pay = (id, o) => Object.assign({ id, paymentNo: 0, supplierId: 's1', invoiceId: '', amount: 100, method: 'نقدي', date: '2025-06-10', transferRef: '', notes: '', extraFields: [], attachments: [] }, o);
  const seed = {
    users: [baseUser],
    ledger: {
      suppliers: [
        { id: 's1', name: 'شركة الإنشاءات', taxId: '123-456', openingBalance: 1000, extraFields: [], attachments: [] },
        { id: 's2', name: 'مؤسسة النور', taxId: '', openingBalance: -50.5, extraFields: [], attachments: [] },
      ],
      invoices: [
        { id: 'i1', supplierId: 's1', invoiceNo: 'F-1', date: '2025-06-01', netInvoice: 1130, totalInvoice: 1140, baseValue: 1000, vat: 140, withheld: 10, isReturn: false },
        { id: 'i2', supplierId: 's1', invoiceNo: 'F-2', date: '2025-07-01', netInvoice: 500, totalInvoice: 500, baseValue: 500, vat: 0, withheld: 0, isReturn: false, cancelled: true },
        { id: 'r1', supplierId: 's2', invoiceNo: 'R-1', date: '2025-07-05', netInvoice: 57, totalInvoice: 57, baseValue: 50, vat: 7, withheld: 0, isReturn: true },
      ],
      payments: [
        pay('p1', { paymentNo: 1, amount: 500, direction: 'pay', invoiceId: 'i1', transferRef: 'TR-99' }),
        pay('p2', { paymentNo: 2, amount: 1200.5, direction: 'collect', date: '2025-07-02', method: 'تحويل بنكي', notes: 'تسوية ١٬٢٠٠' }),
        pay('p3', { paymentNo: 3, amount: 0.105, date: '2025-08-01', supplierId: 's2', method: 'شيك', extraFields: [{ label: 'بنك', value: 'الأهلي' }] }),
        pay('p4', { paymentNo: 4, amount: 75, direction: 'pay', date: '2026-01-15', batchId: 'pb1', notes: 'متبقي غير موزع' }),
      ],
    },
  };
  const { browser, page, errors } = await openApp(seed);
  const FILTERS = [
    {}, { q: 'الانشاءات' }, { q: 'TR-99' }, { q: 'F-1' }, { q: 'عامه' }, { q: 'مدين' }, { q: '1,200' }, { q: 'الاهلي' }, { q: '15/1/2026' },
    { year: '2025' }, { month: '07' }, { from: '2025-07-01', to: '2025-12-31' }, { supplierId: 's2' }, { method: 'شيك' },
    { direction: 'pay' }, { direction: 'collect' }, { link: 'linked' }, { link: 'general' }, { min: '100', max: '1000' },
    { sort: 'old' }, { sort: 'amount_desc' }, { sort: 'amount_asc' },
  ];
  const legacy = await page.evaluate((FILTERS) => FILTERS.map((f) => {
    Object.assign(paymentsFilters, { from: '', to: '', year: '', q: '', month: '', supplierId: '', method: '', direction: '', link: '', min: '', max: '', sort: 'new' }, f);
    const rows = getFilteredPayments();
    return { ids: rows.map((p) => p.id), total: rows.reduce((a, b) => a + Number(b.amount || 0), 0) };
  }), FILTERS);
  const legacyBal = await page.evaluate(() => ['s1', 's2'].map((s) => Math.round(supplierBalance(s) * 1e6) / 1e6));

  console.log('[1] الدوال القديمة (المرجع)');
  eq(legacy[0].ids, ['p4', 'p3', 'p2', 'p1'], 'الكل بالأحدث');
  eq(legacy[15].ids, ['p2'], 'فلتر «مدين»');
  eq(legacyBal, [1000 + 1130 + 500 - 500 - 1200.5 - 75, -50.5 - 57 - 0.105], 'الرصيد الحالي: الملغاة داخلة، والتحصيل والغير مصنّف بيتطرحوا');

  if (WEB) {
    console.log('[2] السيرفر = الدوال القديمة لكل مجموعة فلاتر');
    for (let i = 0; i < FILTERS.length; i++) {
      const qs = Object.entries(FILTERS[i]).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
      const r = await page.evaluate((qs) => WebSession.api('GET', '/api/v1/supplier-payments?' + qs), qs);
      ok(r.status === 200 && JSON.stringify(r.body.rows.map((x) => x.id)) === JSON.stringify(legacy[i].ids) && Math.abs(r.body.totals.total - legacy[i].total) < 1e-9 && r.body.totals.count === legacy[i].ids.length,
        `${JSON.stringify(FILTERS[i])} ← ${legacy[i].ids.length} صف، نفس الترتيب والكارتين`, { server: r.body.rows && r.body.rows.map((x) => x.id), legacy: legacy[i].ids });
    }
    console.log('[3] الرصيد: الطريقة الحالية = supplierBalance، وF-05 = القاعدة المعتمدة');
    const b = await page.evaluate(() => WebSession.api('GET', '/api/v1/supplier-payments/balances'));
    const by = Object.fromEntries(b.body.map((x) => [x.supplierId, x]));
    eq(['s1', 's2'].map((s) => Number(by[s].legacyBalance)), legacyBal, 'الرصيد بالطريقة الحالية من السيرفر = supplierBalance');
    // F-05: s1 = 1000 + 1130 (الملغاة برا) − 500 + 1200.5 (التحصيل بيتجمع) − 75 = 2755.5 · s2 = −50.5 − 57 = −107.5 (والـ 0.105 للمراجعة)
    eq(['s1', 's2'].map((s) => by[s].balance), ['2755.500000', '-107.500000'], 'F-05: الملغاة برا، والتحصيل بيتجمع، وغير المصنّف برا');
    eq(['s1', 's2'].map((s) => by[s].differs), [true, true], 'علامة الفرق');
  } else ok(true, 'وضع الملف: مقارنة السيرفر بتتعمل في WEB_MODE=1');

  eq(errors, [], 'no JS errors');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
