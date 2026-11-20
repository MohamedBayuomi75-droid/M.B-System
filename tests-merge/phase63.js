// المرحلة 6 (خطة v1.4.5) — قبول الموديول التجريبي (الموردين والعملاء): اختبارات قبول لدوال كتابة بيانات العملاء
// اللي كانت من غير اختبار مباشر (DEC-0086): clNextCustomerCode، وclSaveCustomers، وclUpsertCustomer، وclDeleteCustomer.
// القيم المتوقعة من السلوك الحالي للواجهة القديمة (LEGACY-PRESERVE)، والاختبار بيشتغل في وضع الملف ووضع الويب (WEB_MODE=1).
const { openApp, WEB } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const seed = {
    users: [baseUser],
    projects: [
      { id: 'pr1', name: 'مشروع الشروق', customerId: 'cB', customerName: 'باسم', customer: 'باسم', status: 'active' },
      { id: 'pr2', name: 'مشروع النيل', customerId: 'cC', customerName: 'تامر', customer: 'تامر', status: 'active' },
    ],
    clients: {
      settings: { customerPrefix: 'CUS-' },
      customers: [
        { id: 'cB', name: 'باسم', code: 'CUS-0007', email: 'b@example.com' },
        { id: 'cC', name: 'تامر', code: 'CUS-0012' },
        { id: 'cX', name: 'ثروت', code: 'خاص' },
      ],
    },
  };
  const { browser, page, errors } = await openApp(seed);
  const saved = () => page.waitForFunction((n) => window.__saveCount > n, null, { timeout: 15000 });
  // «اتحفظ فعلًا»: في وضع الملف = آخر نسخة اتبعتت للتخزين. في الويب = إعادة تحميل الصفحة من السيرفر (مش نسخة المتصفح)
  const ready = () => page.waitForFunction(() => typeof DATA !== 'undefined' && window.WebSync && WebSync._state.meta && document.querySelector('#app') && document.querySelector('#app').innerText.length > 100, null, { timeout: 30000 });
  const persisted = async (fn) => {
    if (!WEB) return page.evaluate(fn, 'saved');
    // استنى لحد ما مايبقاش فيه أي تغيير مستني في العملاء أو المشاريع (العدّاد ممكن يزيد بحفظ تاني زي سجل التدقيق)
    // استنى لحد ما مايبقاش فيه طلب مزامنة شغال (WebSync._state.saving) ولا تغيير مستني في العملاء.
    // (بعد إعادة التحميل، الواجهة بتكمّل حقول السجلات بقيم افتراضية فبيفضل تغيير «مستني» لحد الحفظ الجاي — ده طبيعي ومش بيضيّع بيانات.)
    await page.waitForFunction(() => !WebSync._state.saving, null, { timeout: 15000 });
    await page.evaluate(() => WebSync.save(DATA)).catch(() => {});
    await page.waitForFunction(() => !WebSync._state.saving, null, { timeout: 15000 });
    await page.waitForTimeout(300); await page.reload(); await ready(); await page.waitForTimeout(600);
    return page.evaluate(fn, 'live');
  };

  console.log('[1] clNextCustomerCode: أكبر رقم في آخر الكود + 1، بأربع خانات، والأكواد من غير رقم مابتتحسبش');
  eq(await page.evaluate(() => clNextCustomerCode()), 'CUS-0013', 'الكود الجاي بعد CUS-0012');
  eq(await page.evaluate(() => { const s = clientsData().settings; const old = s.customerPrefix; s.customerPrefix = 'CL-'; const c = clNextCustomerCode(); s.customerPrefix = old; return c; }), 'CL-0013', 'بادئة الإعدادات بتتطبّق (الرقم من كل الأكواد)');

  console.log('[2] clUpsertCustomer — إضافة: العميل الجديد بيتحفظ، والقائمة مترتبة بالاسم');
  let n = await page.evaluate(() => window.__saveCount);
  await page.evaluate(() => clUpsertCustomer({ id: 'cA', name: 'أحمد', code: clNextCustomerCode() }));
  await saved(n);
  eq(await page.evaluate(() => clCustomers().map((c) => c.id)), ['cA', 'cB', 'cC', 'cX'], 'ترتيب أبجدي عربي بعد الإضافة');
  eq(await page.evaluate(() => clCustomerById('cA').code), 'CUS-0013', 'الكود اتسجّل');
  ok(await persisted((m) => ((m === 'saved' ? window.__saved.clients.customers : clCustomers()) || []).some((c) => c.id === 'cA')), 'اتحفظ فعلًا' + (WEB ? ' على السيرفر (بعد إعادة التحميل)' : ''));

  console.log('[3] clUpsertCustomer — تعديل الاسم: اسم العميل المنسوخ في مشاريعه بيتحدّث (عرض بس)، والمعرّف مابيتغيّرش');
  n = await page.evaluate(() => window.__saveCount);
  await page.evaluate(() => { const c = Object.assign({}, clCustomerById('cB'), { name: 'باسم محمود' }); clUpsertCustomer(c); });
  await saved(n);
  eq(await page.evaluate(() => { const p = (DATA.projects || []).find((x) => x.id === 'pr1'); return [p.customerId, p.customerName, p.customer]; }), ['cB', 'باسم محمود', 'باسم محمود'], 'المشروع: نفس المعرّف، والاسم المنسوخ اتحدّث');
  eq(await page.evaluate(() => clCustomerById('cB').email), 'b@example.com', 'باقي الحقول زي ما هي');
  eq(await page.evaluate(() => clCustomers().length), 4, 'مفيش تكرار بعد التعديل');

  console.log('[4] clDeleteCustomer: المشاريع بتنفصل عن العميل (مابتتمسحش)، والعميل بيتشال');
  n = await page.evaluate(() => window.__saveCount);
  await page.evaluate(() => clDeleteCustomer('cC'));
  await saved(n);
  eq(await page.evaluate(() => { const p = (DATA.projects || []).find((x) => x.id === 'pr2'); return p ? [p.customerId, p.customerName, p.customer] : null; }), ['', '', ''], 'المشروع موجود ومنفصل عن العميل');
  eq(await page.evaluate(() => clCustomers().map((c) => c.id)), ['cA', 'cB', 'cX'], 'العميل اتشال');
  ok(await persisted((m) => !((m === 'saved' ? window.__saved.clients.customers : clCustomers()) || []).some((c) => c.id === 'cC')), 'الحذف اتحفظ' + (WEB ? ' على السيرفر (بعد إعادة التحميل)' : ''));

  console.log('[5] clSaveCustomers: القائمة بتتحفظ');
  n = await page.evaluate(() => window.__saveCount);
  await page.evaluate(() => { const l = clCustomers().slice().sort((a, b) => (a.id < b.id ? 1 : -1)); const i = l.findIndex((c) => c.id === 'cX'); l[i] = Object.assign({}, l[i], { notes: 'تعديل' }); clSaveCustomers(l); }); // [cX, cB, cA]
  await saved(n);
  eq(await persisted((m) => { const l = (m === 'saved' ? window.__saved.clients.customers : clCustomers()) || []; return (l.find((c) => c.id === 'cX') || {}).notes; }), 'تعديل', 'تعديل الحقل اتحفظ');
  // فرق معروف (مسجّل في PARTIES_ACCEPTANCE.md): ترتيب القايمة لوحده من غير تغيير بيانات بيتحفظ في وضع الملف بس؛
  // الويب بيزامن سجل بسجل. مالوش أثر عملي: كل حفظ للعملاء بيرتّب بالاسم (clUpsertCustomer).
  if (WEB) eq(await persisted(() => clCustomers().map((c) => c.id).sort()), ['cA', 'cB', 'cX'], 'الويب: نفس العملاء بعد إعادة التحميل (الترتيب لوحده مابيتزامنش — فرق معروف)');
  else eq(await persisted(() => window.__saved.clients.customers.map((c) => c.id)), ['cX', 'cB', 'cA'], 'الملف: الترتيب المبعوت هو اللي اتحفظ');

  console.log('[6] بيانات المورد الأساسية: تطبيع الرقم الضريبي والاسم (مطابقة الاستيراد)، وملخص الخانات المخصصة');
  eq(await page.evaluate(() => [normalizeTaxId(' 123-456/789 '), normalizeTaxId('AB_12\\3'), normalizeTaxId(null), normalizeTaxId('_')]), ['123456789', 'ab123', '', ''], 'normalizeTaxId: بيشيل المسافات والشرطات والفواصل، وبيصغّر الحروف ("_" = فاضي)');
  eq(await page.evaluate(() => [normalizeSupplierName('  شركة  النور  '), normalizeSupplierName('مـحـمـد'), normalizeSupplierName('ACME Co')]), ['شركة النور', 'محمد', 'acme co'], 'normalizeSupplierName: مسافات زيادة، والكشيدة، وحالة الحروف');
  eq(await page.evaluate(() => [lgExtraFieldsSummary([{ label: 'المندوب', value: 'سعيد' }, { label: 'المنطقة', value: 'الجيزة' }]), lgExtraFieldsSummary([]), lgExtraFieldsSummary(null)]), ['المندوب: سعيد | المنطقة: الجيزة', '', ''], 'lgExtraFieldsSummary: «العنوان: القيمة» مفصولين بـ |');

  eq(errors, [], 'no JS errors');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
