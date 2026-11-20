// المرحلة 7 (الحزمة 7.1 — المخازن): اختبارات قبول لدوال الكتابة والترقيم في الواجهة القديمة (DEC-0086: عناصر P0 من غير اختبار)
// LEG-0345…0350: whUpsertItem وwhDeleteItem وwhUpsertLocation وwhAddMovement وwhNextItemCode وwhNextMovementId.
// القيم المتوقعة = السلوك الحالي (LEGACY-PRESERVE)، ومنه تحديث التكلفة المتوسطة وقت الاستلام وتثبيت تكلفة الصرف
// (المعادلة نفسها مستنية اعتماد B-20 قبل ما تتنقل للسيرفر). بيشتغل في وضع الملف والويب (WEB_MODE=1) وفوق الجداول.
const { openApp, WEB } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const seed = {
    users: [baseUser],
    warehouses: {
      settings: { itemPrefix: 'ITM-', movementPrefix: 'MV-' },
      locations: [{ id: 'LOC-01', name: 'الرئيسي', notes: '' }],
      items: [{ id: 'i1', code: 'ITM-0004', name: 'حديد', unit: 'طن', category: 'خامات', minQty: null, avgCost: 0, lastCost: 0, notes: '' },
        { id: 'i9', code: 'خاص', name: 'صنف بكود من غير رقم', unit: 'قطعة', category: '', minQty: null, avgCost: 0, lastCost: 0, notes: '' }],
      movements: [{ id: 'MV-0009', type: 'in', itemId: 'i9', qty: 1, locationId: 'LOC-01', date: '2026-11-01', notes: '' }],
    },
  };
  const { browser, page, errors } = await openApp(seed);
  const saved = (n) => page.waitForFunction((x) => window.__saveCount > x, n, { timeout: 15000 });
  const ready = () => page.waitForFunction(() => typeof DATA !== 'undefined' && window.WebSync && WebSync._state.meta && document.querySelector('#app') && document.querySelector('#app').innerText.length > 100, null, { timeout: 30000 });
  // «اتحفظ فعلًا»: في الملف = آخر نسخة اتبعتت للتخزين، وفي الويب = بعد إعادة تحميل الصفحة من السيرفر
  const persisted = async (fn) => {
    if (!WEB) return page.evaluate(fn, 'saved');
    await page.waitForFunction(() => !WebSync._state.saving, null, { timeout: 15000 });
    await page.evaluate(() => WebSync.save(DATA)).catch(() => {});
    await page.waitForFunction(() => !WebSync._state.saving, null, { timeout: 15000 });
    await page.waitForTimeout(300); await page.reload(); await ready(); await page.waitForTimeout(600);
    return page.evaluate(fn, 'live');
  };
  const W = (m) => (m === 'saved' ? window.__saved.warehouses : warehousesData());

  console.log('[1] الترقيم: أكبر رقم في آخر الكود + 1 بأربع خانات (الأكواد من غير رقم مابتتحسبش)');
  eq(await page.evaluate(() => [whNextItemCode(), whNextMovementId()]), ['ITM-0005', 'MV-0010'], 'الكود الجاي للصنف والحركة');

  console.log('[2] whUpsertItem: إضافة بترتيب الاسم، وتعديل من غير تكرار');
  let n = await page.evaluate(() => window.__saveCount);
  await page.evaluate(() => whUpsertItem({ id: 'i2', code: whNextItemCode(), name: 'أسمنت', unit: 'شيكارة', category: 'خامات', minQty: 10, avgCost: 0, lastCost: 0, notes: '' }));
  await saved(n);
  eq(await page.evaluate(() => whItems().map((x) => x.id)), ['i2', 'i1', 'i9'], 'ترتيب أبجدي عربي');
  n = await page.evaluate(() => window.__saveCount);
  await page.evaluate(() => whUpsertItem(Object.assign({}, whItemById('i1'), { name: 'حديد تسليح', minQty: 5 })));
  await saved(n);
  eq(await page.evaluate(() => [whItems().length, whItemById('i1').name, whItemById('i1').minQty]), [3, 'حديد تسليح', 5], 'التعديل مكانه');
  ok(await persisted((m) => ((m === 'saved' ? window.__saved.warehouses : warehousesData()).items || []).some((x) => x.id === 'i2' && x.code === 'ITM-0005')), 'الصنف اتحفظ' + (WEB ? ' على السيرفر' : ''));

  console.log('[3] whUpsertLocation: إضافة وتعديل');
  n = await page.evaluate(() => window.__saveCount);
  await page.evaluate(() => { whUpsertLocation({ id: 'LOC-02', name: 'الموقع', notes: '' }); });
  await saved(n);
  n = await page.evaluate(() => window.__saveCount);
  await page.evaluate(() => { whUpsertLocation({ id: 'LOC-02', name: 'مخزن الموقع', notes: 'ملاحظة' }); });
  await saved(n);
  eq(await page.evaluate(() => whLocations().map((l) => [l.id, l.name])), [['LOC-01', 'الرئيسي'], ['LOC-02', 'مخزن الموقع']], 'المخازن');
  eq(await persisted((m) => ((m === 'saved' ? window.__saved.warehouses : warehousesData()).locations || []).find((l) => l.id === 'LOC-02')?.notes), 'ملاحظة', 'التعديل اتحفظ' + (WEB ? ' على السيرفر' : ''));

  console.log('[4] whAddMovement: الاستلام بيحدّث المتوسط (تقريب خانتين) وآخر تكلفة، والصرف بيثبّت تكلفته من المتوسط');
  for (const m of [
    { id: 'MV-0010', type: 'in', itemId: 'i1', qty: 10, unitCost: 100, locationId: 'LOC-01', date: '2026-11-02', notes: '' },
    { id: 'MV-0011', type: 'in', itemId: 'i1', qty: 5, unitCost: 130, locationId: 'LOC-01', date: '2026-11-03', notes: '' },
    { id: 'MV-0012', type: 'out', itemId: 'i1', qty: 4, locationId: 'LOC-01', date: '2026-11-04', project: 'مشروع', notes: '' },
  ]) { n = await page.evaluate(() => window.__saveCount); await page.evaluate((x) => whAddMovement(x), m); await saved(n); }
  eq(await page.evaluate(() => [whItemById('i1').avgCost, whItemById('i1').lastCost]), [110, 130], 'المتوسط = (10×100 + 5×130) ÷ 15 = 110، وآخر تكلفة 130');
  eq(await page.evaluate(() => whMovements().find((m) => m.id === 'MV-0012').unitCost), 110, 'تكلفة الصرف اتثبتت من المتوسط وقتها');
  eq(await page.evaluate(() => whStockQty('i1')), 11, 'الرصيد 10 + 5 − 4');
  ok(await persisted((m) => ((m === 'saved' ? window.__saved.warehouses : warehousesData()).movements || []).some((x) => x.id === 'MV-0012' && x.unitCost === 110)), 'الحركات اتحفظت' + (WEB ? ' على السيرفر' : ''));

  console.log('[5] whDeleteItem: الصنف من غير حركات بيتشال');
  n = await page.evaluate(() => window.__saveCount);
  await page.evaluate(() => whDeleteItem('i2'));
  await saved(n);
  eq(await page.evaluate(() => whItems().map((x) => x.id).sort()), ['i1', 'i9'], 'اتشال');
  ok(await persisted((m) => !((m === 'saved' ? window.__saved.warehouses : warehousesData()).items || []).some((x) => x.id === 'i2')), 'الحذف اتحفظ' + (WEB ? ' على السيرفر' : ''));

  eq(errors, [], 'no JS errors');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
