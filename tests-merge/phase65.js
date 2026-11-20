// المرحلة 7 (الحزمة 7.1 — المخازن): الشاشة الجديدة بتعرض عمود «ملاحظات» والرصيد وكود الحركة زي الواجهة القديمة،
// والسيرفر هو اللي بيحسبهم. الاختبار بيقارن ناتج السيرفر بالدوال القديمة نفسها على نفس البيانات:
//   whItemNotesIssues و whStockQty (الإجمالي) و whNextMovementId (كود التحويل الجاي).
// بيشتغل في وضع الويب بس (WEB_MODE=1) للمقارنة بالسيرفر. في وضع الملف بيتأكد من الدوال القديمة بس.
const { openApp, WEB } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const seed = {
    users: [baseUser],
    warehouses: {
      settings: { itemPrefix: 'ITM-', movementPrefix: 'MV-' },
      locations: [{ id: 'LOC-01', name: 'الرئيسي' }, { id: 'LOC-02', name: 'الموقع' }],
      items: [
        { id: 'i1', code: 'ITM-0001', name: 'أسمنت', unit: 'شيكارة', category: 'خامات', minQty: 10 },   // فوق الحد
        { id: 'i2', code: 'ITM-0002', name: 'حديد', unit: 'طن', category: 'خامات', minQty: 5 },          // تحت الحد
        { id: 'i3', code: 'ITM-0003', name: 'رمل', unit: 'م3', category: '', minQty: 2 },                  // من غير تصنيف ونفد
        { id: 'i4', code: 'ITM-0004', name: 'طوب', unit: 'ألف', category: 'خامات' },                     // من غير حد طلب
      ],
      movements: [
        { id: 'MV-0001', type: 'in', itemId: 'i1', qty: 30, locationId: 'LOC-01', date: '2026-11-01' },
        { id: 'MV-0002', type: 'out', itemId: 'i1', qty: 5, locationId: 'LOC-01', date: '2026-11-02' },
        { id: 'MV-0003', type: 'in', itemId: 'i2', qty: 4.5, locationId: 'LOC-01', date: '2026-11-02' },
        { id: 'MV-0004', type: 'transfer', itemId: 'i1', qty: 7, locationId: 'LOC-01', toLocationId: 'LOC-02', date: '2026-11-03' },
        { id: 'MV-0007', type: 'in', itemId: 'i4', qty: 2, locationId: 'LOC-02', date: '2026-11-04' },
      ],
    },
  };
  const { browser, page, errors } = await openApp(seed);
  const legacy = await page.evaluate(() => whItems().map((it) => ({ id: it.id, total: whStockQty(it.id), issues: whItemNotesIssues(it) })).sort((a, b) => (a.id < b.id ? -1 : 1)));
  const nextMv = await page.evaluate(() => whNextMovementId());

  console.log('[1] الدوال القديمة (المرجع)');
  eq(legacy.map((x) => [x.id, x.total]), [['i1', 25], ['i2', 4.5], ['i3', 0], ['i4', 2]], 'الأرصدة: التحويل مابيغيّرش الإجمالي');
  eq(legacy.map((x) => x.issues), [[], ['تحت حد الطلب'], ['ناقص: التصنيف', 'نفد من المخزون'], []], 'الملاحظات');
  eq(nextMv, 'MV-0008', 'كود الحركة الجاي = أكبر رقم + 1');

  if (WEB) {
    console.log('[2] السيرفر = الدوال القديمة');
    const r = await page.evaluate(() => WebSession.api('GET', '/api/v1/warehouses'));
    eq(r.status, 200, 'API');
    const server = r.body.items.map((x) => ({ id: x.id, total: Number(x.total), issues: x.issues })).sort((a, b) => (a.id < b.id ? -1 : 1));
    eq(server, legacy, 'الرصيد الإجمالي والملاحظات لكل صنف');
    const tr = await page.evaluate(() => WebSession.api('POST', '/api/v1/warehouses/transfers', { itemId: 'i1', fromLocationId: 'LOC-02', toLocationId: 'LOC-01', qty: '2' }));
    eq([tr.status, tr.body.id], [201, nextMv], 'التحويل من السيرفر بياخد نفس كود whNextMovementId');
    const after = await page.evaluate(() => WebSession.api('GET', '/api/v1/warehouses'));
    eq(Number(after.body.items.find((x) => x.id === 'i1').total), 25, 'التحويل مابيغيّرش إجمالي الصنف');
  } else ok(true, 'وضع الملف: مقارنة السيرفر بتتعمل في WEB_MODE=1');

  eq(errors, [], 'no JS errors');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
