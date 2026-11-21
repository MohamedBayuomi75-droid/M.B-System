// المرحلة 7 (الحزمة 7.2 — فواتير ومرتجعات الموردين): اختبارات قبول لعناصر P0 في الواجهة القديمة من غير اختبار (DEC-0086):
// saveInvoiceData (LEG-0269)، وfixInvoiceCalculations (LEG-0243)، وpreviewInvoiceCalculationFixes (LEG-0242)، وrecalcLinkedOriginal،
// وgetInvoiceDueDate (LEG-0247)، وgetOverdueInvoices (LEG-0248)، وroundMoney (LEG-0295)، وapplyReturnLinkEffects (LEG-0351)،
// والعناصر المساعدة في نفس الموديول: addDaysToIsoDate، وmaybeShowOverdueAlert، وsaveCustomLinkedItem/deleteCustomLinkedItem (ربط بنود الفاتورة)، وpfSummaryHtml.
// القيم المتوقعة = السلوك الحالي (LEGACY-PRESERVE) والمعادلة الانتقالية المعتمدة (DEC-0107): الإجمالي = الأساسي + ق.م + الدمغة، والصافي = الإجمالي − المحجوز.
// بيشتغل في وضع الملف والويب (WEB_MODE=1) وفوق الجداول.
const { openApp, WEB } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const inv = (id, o) => Object.assign({ id, supplierId: 's1', invoiceNo: id.toUpperCase(), date: '2020-01-10', category: '', project: '', description: '', baseValue: 1000, vat: 140, stampDuty: 0, withheld: 10, totalInvoice: 1140, netInvoice: 1130, isReturn: false, attachments: [], notes: '' }, o);
  const seed = {
    users: [baseUser],
    ledger: {
      suppliers: [{ id: 's1', name: 'مورد الاختبار', taxId: '', openingBalance: 0, extraFields: [], attachments: [] }],
      invoices: [
        inv('a1'),                                                                   // سليمة، ومستحقة من 2020 ومش مدفوعة ← متأخرة
        inv('a2', { totalInvoice: 999, netInvoice: 999 }),                           // حسابها غلط ← بتطلع في المعاينة وبتتصلّح
        inv('a3', { date: '2020-02-01', dueDate: '2020-03-15' }),                    // مدفوعة بالكامل ← مش متأخرة
        inv('a4', { date: '2099-01-01' }),                                           // استحقاقها بعدين ← مش متأخرة
        inv('a5', { date: '2020-01-05', dueDate: '2020-01-20', withheld: 0, netInvoice: 1140 }),  // متأخرة، واستحقاقها قبل a1
      ],
      payments: [{ id: 'p1', paymentNo: 1, supplierId: 's1', invoiceId: 'a3', amount: 1130, direction: 'pay', date: '2020-02-05' }],
    },
  };
  const { browser, page, errors } = await openApp(seed);
  const saved = (n) => page.waitForFunction((x) => window.__saveCount > x, n, { timeout: 15000 });
  const ready = () => page.waitForFunction(() => typeof DATA !== 'undefined' && window.WebSync && WebSync._state.meta && document.querySelector('#app') && document.querySelector('#app').innerText.length > 100, null, { timeout: 30000 });
  const persisted = async (fn) => {
    if (!WEB) return page.evaluate(fn, 'saved');
    await page.waitForFunction(() => !WebSync._state.saving, null, { timeout: 15000 });
    await page.evaluate(() => WebSync.save(DATA)).catch(() => {});
    await page.waitForFunction(() => !WebSync._state.saving, null, { timeout: 15000 });
    await page.waitForTimeout(300); await page.reload(); await ready(); await page.waitForTimeout(600);
    return page.evaluate(fn, 'live');
  };

  console.log('[1] roundMoney: 6 خانات افتراضي، وبـ Math.round (فرق معروف عن HALF_UP العشري في السيرفر — بيتسجّل)');
  eq(await page.evaluate(() => [roundMoney(1.23456789), roundMoney(1.005, 2), roundMoney(2.675, 2), roundMoney(-1.5, 0), roundMoney('x')]), [1.234568, 1, 2.68, -1, 0],
    'Math.round على ناتج الضرب في الـ float: 1.005→1.00 (HALF_UP العشري بيدّي 1.01)، و2.675→2.68، و−1.5→−1 (HALF_UP بيدّي −2)');

  console.log('[2] previewInvoiceCalculationFixes / fixInvoiceCalculations: الإجمالي = الأساسي + ق.م + الدمغة، والصافي = الإجمالي − المحجوز');
  eq(await page.evaluate(() => previewInvoiceCalculationFixes().map((x) => x.id || (x.invoice && x.invoice.id)).filter(Boolean)), ['a2'], 'المعاينة بتطلّع الفاتورة الغلط بس، من غير ما تعدّل');
  eq(await page.evaluate(() => { const a = DATA.ledger.invoices.find((i) => i.id === 'a2'); return [a.totalInvoice, a.netInvoice]; }), [999, 999], 'المعاينة مابتعدّلش');
  eq(await page.evaluate(() => fixInvoiceCalculations()), 1, 'التصليح بيعدّل واحدة');
  eq(await page.evaluate(() => DATA.ledger.invoices.filter((i) => ['a1', 'a2'].includes(i.id)).map((i) => [i.id, i.totalInvoice, i.netInvoice])), [['a1', 1140, 1130], ['a2', 1140, 1130]], 'بعد التصليح الاتنين متساويين، والسليمة زي ما هي');

  console.log('[3] getInvoiceDueDate / getOverdueInvoices');
  eq(await page.evaluate(() => [getInvoiceDueDate({ date: '2026-01-31' }), getInvoiceDueDate({ date: '2026-01-31', dueDate: '2026-02-05' }), getInvoiceDueDate({})]), ['2026-03-02', '2026-02-05', null], 'الاستحقاق = التاريخ + 30 يوم، أو تاريخ الاستحقاق المكتوب');
  eq(await page.evaluate(() => getOverdueInvoices().map((i) => i.id)), ['a5', 'a1', 'a2'], 'المتأخرة بس (مش المدفوعة ولا اللي بعدين)، مترتبة بتاريخ الاستحقاق');

  console.log('[4] saveInvoiceData: إضافة وتعديل، والمرتجع الكامل بيلغي الأصل، والجزئي مع محجوز بيعلّم postReturnWht، ونقل الربط بيرجّع الأصل القديم');
  let n = await page.evaluate(() => window.__saveCount);
  await page.evaluate(() => saveInvoiceData(null, { supplierId: 's1', invoiceNo: 'N1', date: '2026-11-01', baseValue: 500, vat: 70, stampDuty: 0, withheld: 5, totalInvoice: 570, netInvoice: 565, isReturn: false, attachments: [], notes: '' }));
  await saved(n);
  const newId = await page.evaluate(() => DATA.ledger.invoices.find((i) => i.invoiceNo === 'N1').id);
  ok(/^inv/.test(newId), 'فاتورة جديدة بمعرّف inv…');
  n = await page.evaluate(() => window.__saveCount);
  await page.evaluate((id) => saveInvoiceData(id, { notes: 'تعديل' }), newId);
  await saved(n);
  eq(await page.evaluate((id) => DATA.ledger.invoices.filter((i) => i.id === id).map((i) => [i.notes, i.netInvoice]), newId), [['تعديل', 565]], 'التعديل من غير تكرار وباقي الحقول زي ما هي');
  // مرتجع جزئي على a1 (فيها محجوز 10) ← postReturnWht، والفاتورة مش ملغاة
  n = await page.evaluate(() => window.__saveCount);
  await page.evaluate(() => saveInvoiceData(null, { supplierId: 's1', invoiceNo: 'R1', date: '2026-11-02', baseValue: 100, vat: 14, stampDuty: 0, withheld: 0, totalInvoice: 114, netInvoice: 114, isReturn: true, linkedInvoiceId: 'a1', attachments: [], notes: '' }));
  await saved(n);
  eq(await page.evaluate(() => { const a = DATA.ledger.invoices.find((i) => i.id === 'a1'); return [!!a.cancelled, !!a.postReturnWht, (a.linkedReturnIds || []).length]; }), [false, true, 1], 'مرتجع جزئي: الأصل مش ملغي، وpostReturnWht');
  // مرتجع تاني بيكمّل الصافي (1130 − 114 = 1016) ← الأصل بيتلغي
  n = await page.evaluate(() => window.__saveCount);
  await page.evaluate(() => saveInvoiceData(null, { supplierId: 's1', invoiceNo: 'R2', date: '2026-11-03', baseValue: 900, vat: 116, stampDuty: 0, withheld: 0, totalInvoice: 1016, netInvoice: 1016, isReturn: true, linkedInvoiceId: 'a1', attachments: [], notes: '' }));
  await saved(n);
  eq(await page.evaluate(() => { const a = DATA.ledger.invoices.find((i) => i.id === 'a1'); return [!!a.cancelled, !!a.postReturnWht, (a.linkedReturnIds || []).length]; }), [true, false, 2], 'المرتجعات غطّت الصافي (بسماحية 0.02) ← الأصل ملغي');
  // نقل المرتجع R2 لفاتورة تانية ← الأصل القديم بيرجع (مش ملغي) والجديدة بتتقيّم
  const r2 = await page.evaluate(() => DATA.ledger.invoices.find((i) => i.invoiceNo === 'R2').id);
  n = await page.evaluate(() => window.__saveCount);
  await page.evaluate((id) => saveInvoiceData(id, { isReturn: true, linkedInvoiceId: 'a5', invoiceNo: 'R2' }), r2);
  await saved(n);
  eq(await page.evaluate(() => ['a1', 'a5'].map((x) => { const a = DATA.ledger.invoices.find((i) => i.id === x); return [x, !!a.cancelled, !!a.postReturnWht]; })), [['a1', false, true], ['a5', false, false]],
    'نقل الربط: a1 رجعت مش ملغية (فاضل R1 والمحجوز)، وa5 مش ملغية (1016 < 1140) ومن غير محجوز');
  // applyReturnLinkEffects مباشرة: إعادة تطبيقها على نفس المرتجع مابتغيّرش حاجة (idempotent)
  eq(await page.evaluate(() => { const r1 = DATA.ledger.invoices.find((i) => i.invoiceNo === 'R1'); applyReturnLinkEffects(r1); applyReturnLinkEffects(r1); const a = DATA.ledger.invoices.find((i) => i.id === 'a1'); return [!!a.cancelled, !!a.postReturnWht, (a.linkedReturnIds || []).length]; }), [false, true, 1],
    'applyReturnLinkEffects مرتين على نفس المرتجع ← نفس النتيجة');

  console.log('[5] المساعدات: addDaysToIsoDate، وتنبيه المتأخرات، وبنود الربط، وpfSummaryHtml');
  eq(await page.evaluate(() => [addDaysToIsoDate('2024-02-28', 2), addDaysToIsoDate('2026-12-31', 1), addDaysToIsoDate('x', 1)]), ['2024-03-01', '2027-01-01', null], 'إضافة الأيام بالتوقيت المحلي (سنة كبيسة ونهاية السنة)');
  eq(await page.evaluate(() => { overdueAlertShown = false; maybeShowOverdueAlert(); const o = document.getElementById('overdueAlertOverlay'); const t = o ? o.innerText : ''; const n = getOverdueInvoices().length; if (o) o.remove(); maybeShowOverdueAlert(); const again = !!document.getElementById('overdueAlertOverlay'); return [!!o, t.includes(String(n)), again]; }), [true, true, false],
    'التنبيه بيظهر بعدد المتأخرات، ومرة واحدة بس في الجلسة');
  eq(await page.evaluate(() => { const r = saveCustomLinkedItem({ desc: 'بند', supplierCode: 'SC1', supplierId: 's1' }); const noSup = saveCustomLinkedItem({ desc: 'بند' }); const has = linkedItemsForSupplier('s1').length; deleteCustomLinkedItem(r.id); return [!!r && /^li_/.test(r.id), noSup, has, linkedItemsForSupplier('s1').length]; }), [true, null, 1, 0],
    'بند الربط لازم مورد، وبيتضاف وبيتمسح');
  ok(await page.evaluate(() => /^<p [^>]*>س<\/p>$/.test(pfSummaryHtml('س'))), 'pfSummaryHtml بيلف النص في فقرة');

  ok(await persisted((m) => { const l = (m === 'saved' ? window.__saved.ledger : DATA.ledger).invoices || []; const a1 = l.find((i) => i.id === 'a1'); return l.some((i) => i.invoiceNo === 'N1' && i.notes === 'تعديل') && a1 && !a1.cancelled && a1.postReturnWht === true; }), 'كله اتحفظ' + (WEB ? ' على السيرفر (بعد إعادة التحميل)' : ''));

  eq(errors, [], 'no JS errors');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
