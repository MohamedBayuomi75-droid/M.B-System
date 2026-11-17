// المرحلة 3 — اختبار مرجعي للمعادلات المالية: القيم المتوقعة محسوبة يدويًا (الحسابات في tools/formulas/fixture.js)
// وبتثبّت سلوك النظام القديم كما هو — أي تغيير مستقبلي في أي معادلة لازم يفشّل الاختبار ده (ويحتاج موافقة).
// كمان: كل نواتج الدوال = الحساب المرجعي المستقل (tools/formulas/reference.js).
const path = require('path');
const { WEB } = require('./harness');
const { ok, eq, summary } = require('./lib');
const { runLegacy } = require('../tools/formulas/legacy-runner');
const { computeAll } = require('../tools/formulas/reference');
const { diffMaps, RANGES } = require('../tools/formulas/compare');
const { fixture, P } = require('../tools/formulas/fixture');

(async () => {
  const { results: r, data, errors } = await runLegacy(fixture(), RANGES, { web: WEB });
  const v = (k, id) => r[k] && r[k][id];
  const near = (a, b, name) => ok(Math.abs(Number(a) - b) < 1e-9, name, { got: a, want: b });

  console.log('— الموردون');
  eq([v('invoice.expectedTotal', 'I1'), v('invoice.expectedNet', 'I1')], [1140, 1130], 'فاتورة: الإجمالي = أساس + ضريبة + دمغة؛ الصافي = الإجمالي − المخصوم');
  eq([v('invoice.expectedTotal', 'I2'), v('invoice.expectedNet', 'I2')], [0.3, 0.3], 'كسور 0.1 + 0.2 بتتقرّب لـ 6 خانات = 0.3');
  eq(v('invoice.expectedNet', 'I4'), 228, 'الصافي المتوقع 228 (المخزّن 229 — النظام بيكشفه في «إصلاح الحسابات» ومابيصلحوش لوحده)');
  near(v('invoice.remaining', 'I1'), 629.9, 'متبقي الفاتورة = الصافي − كل الدفعات المربوطة (500 + 0.1)');
  eq([v('invoice.remaining', 'R1'), v('invoice.remaining', 'I3')], [0, 0], 'المرتجع والملغاة متبقيهم صفر');
  eq(v('invoice.remaining', 'I4'), 229, 'المتبقي بيتحسب من الصافي المخزّن (229) مش المتوقع');
  eq([v('invoice.noticeWithheld', 'I1'), v('invoice.noticeBase', 'I1')], [9, 900], 'إشعار الخصم بعد المرتجع المرتبط: 10 − 1 و 1000 − 100');
  near(v('supplier.balance', 'S1'), 2146.2, 'رصيد المورد = افتتاحي 1000 + (1130 + 0.3 − 113 + 500 ملغاة + 229) − (500 + 100 تحصيل + 0.1)');
  near(v('supplier.statementClosing', 'S1'), 1646.4, 'ختامي كشف الحساب = 1000.2 + (1130 + 0.3 + 229 − 113 − 500 − 100 − 0.1) — الملغاة مش ظاهرة والحركات قبل تاريخ الافتتاحي اتحسبت مرتين ⇒ ≠ رصيد المورد (ملاحظات F-01، F-02)');
  near(v('supplier.openingAsOfDate', 'S1'), 1000.2, 'الافتتاحي في كشف الحساب = 1000 + فواتير قبل تاريخه (0.3) − دفعات قبله (0.1)');

  console.log('— الحضور واليوميات');
  eq(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9'].map((id) => v('attendance.netPay', id)), [300, 150, 250, 0, 500, 300, 0, 200, 250],
    'يومية: حاضر 300 · نصف 150 · متأخر−50 = 250 · غائب 0 · 333.33×1.5 = 499.995 ← 500 · «leave» = 300 · خصم 400 > 300 ← 0 · سائق 200 · مشرف نصف 250');

  console.log('— مستحقات العامل (كل الفترات / النصف الأول 2026)');
  eq(['due', 'paid', 'penalty', 'extras', 'expenses', 'balance'].map((k) => v(`worker.${k}@all`, 'W1')), [1500, 1000, 100, 115, 15.5, 499.5], 'عامل كل الفترات: المتبقي = 1500 + 115 − 1000 − 100 − 15.5 = 499.5 (المستحق «accrued» 999 مش محسوب مدفوع)');
  eq(['due', 'balance'].map((k) => v(`worker.${k}@2026H1`, 'W1')), [1000, -0.5], 'عامل يناير–يونيو: يومية يوليو خارج الفترة ← المتبقي −0.5');
  eq([v('driver.due@all', 'D1'), v('driver.paid@all', 'D1'), v('driver.balance@all', 'D1')], [200, 150, 50], 'سائق: 200 − 150 = 50');
  eq([v('supervisor.due@all', 'SV1'), v('supervisor.penalty@all', 'SV1')], [250, 20], 'مشرف: يوميته الشخصية 250 وخصم 20');

  console.log('— الموظفون');
  eq([v('employee.due@all', 'EMP1'), v('employee.balance@all', 'EMP1')], [6000, -250], 'من غير فترة: شهر واحد 6000 − مدفوع 6000 − جزاء 250');
  eq([v('employee.due@2026H1', 'EMP1'), v('employee.balance@2026H1', 'EMP1')], [30000, 23750], 'يناير–يونيو مع تعيين 15 فبراير: 5 شهور كاملة × 6000 (من غير تناسب للشهر الأول)');
  eq(v('employee.due@all', 'EMP2'), 3900, 'سجلات الرواتب القديمة (payroll) لها الأولوية على الراتب الثابت');

  console.log('— المعدات والمشروع');
  eq(['ED1', 'ED2', 'ED3', 'ED4'].map((id) => v('equipmentDaily.cost', id)), [2125, 750, 999, 800], 'يومية معدة: 2×1000 + 10 لتر×12.5 · 5 ساعات×150 · تكلفة مسجّلة · يوم × 8 ساعات × 100');
  eq([v('equipment.totalCost@all', 'EQ1'), v('equipment.totalCost@2026H1', 'EQ1')], [3874, 3124], 'إجمالي المعدة كل الفترات / النصف الأول');
  eq(['labor', 'equip', 'costs', 'expenses', 'suppliers', 'warehouse', 'total'].map((k) => v(`project.${k}@all`, P)), [450, 2125, 40, 0, 1026, 54.71, 3695.71],
    'تكلفة المشروع: عمالة 450 · معدات 2125 · تكاليف 40 · مصروفات 0 (المصروف بسطور مش محسوب) · موردين 1140 − 114 (الملغاة والداخلة المخزن مستبعدة) · مخازن 24.69 + 30.02');

  console.log('— العملاء والمخازن');
  eq(v('client.invoiceNet', 'CI1'), 92760, 'صافي المستخلص = (أعمال + إضافات − مستبعد) − خصومات − دفعة مقدمة − محتجز% − ضريبة% (الأعمال السابقة مش داخلة)');
  eq([v('client.boqTotal', 'B1'), v('client.boqTotal', 'B2')], [126.01, 777], 'مقايسة: 125 + (3 × 0.335 = 1.005 ← 1.01) · من غير بنود = الإجمالي المسجّل');
  eq(v('client.surveyTotal', 'WS1'), 280, 'حصر: حجم 180 + مساحة 90 + عنوان 0 + عدد 10');
  eq(v('client.voApproved', 'K1'), 1250.5, 'أوامر التغيير المعتمدة بس (والقيمة النصية بتتقرا رقم)');
  eq([v('warehouse.stockQty', 'IT1'), v('warehouse.stockValue', 'IT1')], [5, 50.03], 'مخزن: 10 − 2 − 3 = 5 × 10.005 = 50.025 ← 50.03');

  console.log('— الحساب المرجعي المستقل');
  const rep = diffMaps(r, computeAll(data, RANGES));
  const bad = Object.entries(rep).filter(([, x]) => x.diff || x.missing).map(([k, x]) => `${k}: ${JSON.stringify(x.samples)}`);
  eq(bad, [], 'كل نواتج دوال النظام = الحساب المرجعي (ما عدا كسور JS أقل من 0.000001)');
  ok(Object.keys(rep).length >= 60, `عدد المعادلات المقارنة: ${Object.keys(rep).length}`);
  summary(errors);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
