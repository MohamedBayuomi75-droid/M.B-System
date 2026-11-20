// المرحلة 6 (DEC-0093 أ): جدول العملاء في /app/ بنفس أعمدة الشاشة القديمة — الأعداد والملاحظات بيحسبها السيرفر
// (GET /api/v1/customers → counts + notes). الاختبار ده بيقارن ناتج السيرفر بالدوال القديمة نفسها على نفس البيانات:
// clProjectsOfCustomer وأطوال المصفوفات وcustomerNotesIssues (بالضمانات اللي قربت تنتهي حسب تاريخ النهارده).
// بيشتغل في وضع الويب بس (WEB_MODE=1)، لأن المقارنة محتاجة السيرفر. في وضع الملف بيتأكد من الدوال القديمة بس.
const { openApp, WEB } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  // تواريخ بتوقيت القاهرة (زي todayISO في الواجهة القديمة)، عشان الاختبار مايتلخبطش قرب نص الليل
  const cairo = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const day = (n) => new Date(Date.parse(cairo + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
  const seed = {
    users: [baseUser],
    projects: [
      { id: 'p1', name: 'مشروع بالمعرّف', customerId: 'cA', status: 'active' },
      { id: 'p2', name: 'مشروع قديم بالاسم', customerName: 'شركة الأمل', status: 'active' }, // من غير customerId: الربط بالاسم بعد التطبيع
      { id: 'p3', name: 'مشروع لعميل تاني', customerId: 'cZ', status: 'active' },
    ],
    clients: {
      settings: { customerPrefix: 'CUS-' },
      customers: [
        { id: 'cA', name: 'أحمد', code: 'CUS-0001', phone: '0100', contracts: [{ id: 'k1' }, { id: 'k2' }], invoices: [{ id: 'i1' }], workSurveys: [{ id: 's1' }], boqs: [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }],
          guarantees: [
            { id: 'g1', letterNo: 'LG-1', status: 'ساري', expiryDate: day(10) },        // ينتهي بعد 10 يوم
            { id: 'g2', letterNo: 'LG-2', status: 'ساري', expiryDate: day(60) },        // بعيد: مالوش ملاحظة
            { id: 'g3', letterNo: 'LG-3', status: 'محرَّر', expiryDate: day(5) },       // محرَّر: مالوش ملاحظة
            { id: 'g4', status: 'قيد التجديد', expiryDate: day(0) },                   // من غير رقم خطاب: بيظهر بالمعرّف
          ] },
        { id: 'cB', name: 'شركة  الأمل', code: 'CUS-0002' },                            // من غير هاتف ولا عقد، ومشروع بالاسم
        { id: 'cC', name: 'عميل فاضي', code: 'CUS-0003', phone: '011', guarantees: [{ id: 'g5', letterNo: 'LG-5', status: 'ساري', expiryDate: day(-3) }] }, // منتهي فعليًا: مالوش ملاحظة
      ],
    },
  };
  const { browser, page, errors } = await openApp(seed);
  const legacy = await page.evaluate(() => clCustomers().map((c) => ({ id: c.id, counts: { projects: clProjectsOfCustomer(c).length, contracts: (c.contracts || []).length, invoices: (c.invoices || []).length, workSurveys: (c.workSurveys || []).length, boqs: (c.boqs || []).length }, notes: customerNotesIssues(c) })).sort((a, b) => (a.id < b.id ? -1 : 1)));

  console.log('[1] الدوال القديمة على البيانات دي (المرجع)');
  eq(legacy.map((x) => [x.id, x.counts.projects]), [['cA', 1], ['cB', 1], ['cC', 0]], 'المشاريع: بالمعرّف، وبالاسم بعد التطبيع');
  eq(legacy.find((x) => x.id === 'cA').notes, ['ضمان LG-1 ينتهي بعد 10 يوم', 'ضمان g4 ينتهي بعد 0 يوم'], 'ملاحظات الضمانات القريبة بس');
  eq(legacy.find((x) => x.id === 'cB').notes, ['ناقص: رقم الهاتف', 'لا يوجد عقد'], 'ملاحظات الناقص');
  eq(legacy.find((x) => x.id === 'cC').notes, ['لا يوجد عقد', 'لا توجد مشاريع'], 'الضمان المنتهي فعليًا مالوش ملاحظة');

  if (WEB) {
    console.log('[2] السيرفر (GET /api/v1/customers) = الدوال القديمة بالظبط');
    const r = await page.evaluate(() => WebSession.api('GET', '/api/v1/customers'));
    eq(r.status, 200, 'API');
    const server = r.body.items.map((c) => ({ id: c.id, counts: c.counts, notes: c.notes })).sort((a, b) => (a.id < b.id ? -1 : 1));
    eq(server, legacy, 'الأعداد والملاحظات لكل عميل');
  } else ok(true, 'وضع الملف: مقارنة السيرفر بتتعمل في WEB_MODE=1');

  eq(errors, [], 'no JS errors');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
