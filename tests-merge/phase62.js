// القواعد المعتمدة للنظام الجديد (قرارات 2026-11-17) — اختبار المواصفة tools/formulas/target.js بقيم محسوبة يدويًا.
// (Node بس — مش بيفتح المتصفح ولا بيلمس النظام القديم.) المرجع: docs/TARGET_BUSINESS_RULES.md
const { ok, eq, summary } = require('./lib');
const T = require('../tools/formulas/target');
const s = (d) => d.toString();

// TR-01/12: أربع خانات HALF_UP للموجب والسالب
eq([T.q4('2.00005'), T.q4('-2.00005'), T.q4('1.23444'), T.q4('-0.00005'), T.q4('550628.695')].map(s), ['2.0001', '-2.0001', '1.2344', '-0.0001', '550628.695'], 'TR-01/12: 4 خانات HALF_UP (السالب كمان بعيد عن الصفر)');

// الموردين
const D = {
  ledger: {
    suppliers: [{ id: 'S', openingBalance: 1000 }],
    invoices: [
      { id: 'A', supplierId: 'S', date: '2026-01-10', netInvoice: 1130 },
      { id: 'B', supplierId: 'S', date: '2026-01-11', netInvoice: 500, cancelled: true, cancelledByUser: true },        // إلغاء صريح
      { id: 'C', supplierId: 'S', date: '2026-01-12', netInvoice: 2026.9998, cancelled: true },                          // «ملغاة» تلقائيًا بمرتجع كامل
      { id: 'RC', supplierId: 'S', date: '2026-01-13', isReturn: true, linkedInvoiceId: 'C', netInvoice: 2027 },
      { id: 'RA', supplierId: 'S', date: '2026-01-14', isReturn: true, linkedInvoiceId: 'A', netInvoice: 113 },
    ],
    payments: [
      { id: 'P1', supplierId: 'S', date: '2026-02-01', direction: 'pay', amount: 600, allocations: [{ invoiceId: 'A', amount: 400 }] }, // 200 غير مخصّص
      { id: 'P2', supplierId: 'S', date: '2026-02-02', direction: 'collect', amount: 50 },
      { id: 'P3', supplierId: 'S', date: '2026-02-03', amount: 70 },                                                    // من غير اتجاه
      { id: 'P4', supplierId: 'S', date: '2026-02-04', direction: 'pay', amount: 100, invoiceId: 'A' },                  // ربط قديم = تخصيص بالكامل
    ],
  },
};
eq(['A', 'B', 'C', 'RA'].map((id) => T.invoiceState(D.ledger.invoices.find((i) => i.id === id), D.ledger.invoices)), ['active', 'cancelled', 'fullyReturned', 'return'], 'TR-02/03: إلغاء صريح ≠ مرتجع كامل (الإلغاء التلقائي القديم بيتقرا مرتجع كامل)');
const led = T.supplierLedger(D, 'S');
// 1000 + 1130 + 2026.9998 − 2027 − 113 − 600 + 50 − 100 = 1366.9998 ؛ B ملغاة = 0 ؛ P3 غير مصنفة = بره الحساب
eq(s(led.balance), '1366.9998', 'TR-02/04/05: الرصيد = افتتاحي + فواتير قائمة − مرتجعات − سداد + تحصيل (الملغاة صفر)');
eq(s(led.events[led.events.length - 1].balance), s(led.balance), 'TR-04: ختامي الكشف = الرصيد (نفس الحركات)');
ok(led.events.some((e) => e.kind === 'cancelled' && e.id === 'B' && e.debit.isZero() && e.credit.isZero()), 'TR-02: الملغاة ظاهرة في الكشف بقيمة صفر (السجل محفوظ)');
eq([led.unclassified.map((u) => u.id), s(led.unclassifiedTotal)], [['P3'], '70'], 'TR-05: دفعة من غير اتجاه = غير مصنفة ومش محسوبة (لحد المراجعة)');
const al = T.allocationReport(D, 'S');
const A = al.invoiceRows.find((r) => r.id === 'A');
eq([s(A.returned), s(A.allocated), s(A.outstanding)], ['113', '500', '517'], 'TR-06: متبقي الفاتورة = 1130 − مرتجع 113 − تخصيص (400 + 100 القديم) = 517');
eq(al.paymentRows.map((p) => [p.id, s(p.unallocated)]), [['P1', '200'], ['P3', '70'], ['P4', '0']], 'TR-06: المبالغ غير المخصّصة ظاهرة لكل دفعة');
eq(s(al.invoiceRows.find((r) => r.id === 'B').outstanding), '0', 'TR-02: متبقي الملغاة صفر');
const over = T.allocationReport({ ledger: { invoices: [{ id: 'X', supplierId: 'S', netInvoice: 100 }], payments: [{ id: 'Q', supplierId: 'S', direction: 'pay', amount: 100, allocations: [{ invoiceId: 'X', amount: 150 }] }] } }, 'S');
eq(over.errors.map((e) => e.code).sort(), ['OVER_ALLOCATED_INVOICE', 'OVER_ALLOCATED_PAYMENT'], 'TR-06: تخصيص أكبر من الدفعة أو من الفاتورة = خطأ صريح');

// الحضور
const H = {
  workers: [{ id: 'W', dailyWage: 300 }],
  workerAttendance: [
    { id: 'a1', personId: 'W', date: '2026-03-01', status: 'present', project: 'م1' },
    { id: 'a2', personId: 'W', date: '2026-03-01', status: 'present', project: 'م2' },      // مشروع تاني = مشروع
    { id: 'a3', personId: 'W', date: '2026-03-01', status: 'present', project: 'م1' },      // مكرر
    { id: 'a4', personId: 'W', date: '2026-03-02', status: 'sick' },                       // محتاج سياسة
    { id: 'a5', personId: 'W', date: '2026-03-03', status: 'half', dayWage: 333.33 },      // 166.665
    { id: 'a6', personId: 'GHOST', date: '2026-03-03', status: 'present' },                // شخص مش موجود
    { id: 'a7', personId: 'W', date: '2026-03-04', status: 'late', deduction: 50 },        // 250
  ],
};
const ar = T.attendanceReview(H);
eq([ar.duplicates.map((x) => x.id + '→' + x.duplicateOf), ar.orphans, ar.needsPolicy.map((x) => x.status)], [['a3→a1'], ['a6'], ['sick']], 'TR-07/08: المكرر (نفس المشروع) والمجهول والحالة من غير سياسة معزولين للمراجعة');
eq(ar.counted.map((c) => [c.id, s(c.pay)]), [['a1', '300'], ['a2', '300'], ['a5', '166.665'], ['a7', '250']], 'TR-07/08: اليوميات المحسوبة (نصف يوم بأربع خانات: 166.665)');
eq(s(ar.total), '1016.665', 'TR-07: إجمالي المستحق من غير المعزول');

// الرواتب الجزئية
let threw = null; try { T.proratedSalary(6000, 15, 31, null); } catch (e) { threw = e.code; }
eq(threw, 'POLICY_REQUIRED', 'TR-09: الراتب الجزئي بيرفض الحساب من غير سياسة معتمدة (مفيش افتراض)');
eq([s(T.proratedSalary(6000, 15, 31, { method: 'calendar' })), s(T.proratedSalary(6000, 15, 31, { method: 'fixed30' })), s(T.proratedSalary(6000, 13, 31, { method: 'workdays', workDaysInMonth: 26 }))], ['2903.2258', '3000', '3000'], 'TR-09: التناسب بالطريقة اللي هتتعتمد (تقويمي / 30 / أيام عمل)');

// تكلفة المشروع
const Pj = { ledger: { invoices: [
  { id: 'i1', project: 'م1', totalInvoice: 1140, netInvoice: 1130 }, { id: 'r1', project: 'م1', isReturn: true, linkedInvoiceId: 'i1', totalInvoice: 114, netInvoice: 113 },
  { id: 'i2', project: 'م1', netInvoice: 500, cancelled: true, cancelledByUser: true }, { id: 'i3', project: 'م1', netInvoice: 999 }] },
  warehouses: { movements: [{ id: 'm', type: 'in', itemId: 'X', qty: 1, supplierInvoiceId: 'i3' }] } };
eq(s(T.projectSupplyCost(Pj, 'م1')), '1017', 'TR-10: تكلفة الموردين = صافي بعد الخصم (1130 − 113)؛ الملغاة والداخلة المخزن مستبعدة');
eq(s(T.expenseActual({ lines: [{ amount: 10 }, { amount: '5.5' }] })), '15.5', 'TR-10: المصروف الفعلي من سطوره');

// المخزون
const W = { warehouses: { movements: [
  { id: 'i1', type: 'in', itemId: 'X', qty: 10, unitCost: 10, date: '2026-01-01' }, { id: 'o1', type: 'out', itemId: 'X', qty: 4, date: '2026-01-02' },
  { id: 'i2', type: 'in', itemId: 'X', qty: 6, unitCost: 15, date: '2026-01-03' }, { id: 'o2', type: 'out', itemId: 'X', qty: 2, unitCost: 11, date: '2026-01-04' },
  { id: 'o3', type: 'out', itemId: 'X', qty: 1, date: '2026-01-05' }] } };
// بعد i1: 10×10 = 100 ؛ o1 بمتوسط 10 ⇒ 60/6 ؛ i2: +90 ⇒ 150/12 = 12.5 ؛ o2 مثبّت 11 ⇒ 150−22 = 128/10 ؛ o3 بمتوسط 12.8
eq(T.movingAverageIssueCosts(W, 'X').map((r) => [r.id, s(r.unitCost), r.fixed]), [['o1', '10', false], ['o2', '11', true], ['o3', '12.8', false]], 'TR-13: تكلفة الصرف = المتوسط المتحرك وقت الصرف، والمثبّت مابيتغيرش');

// المستخلص التراكمي
const c1 = T.clientCertificate({ previousWorks: 0, value: 100000, retentionPct: 5, taxPct: 1, deductions: 0, advanceDeduct: 0 }, 0);
const c2 = T.clientCertificate({ previousWorks: 100000, value: 50000, retentionPct: 5, taxPct: 1, deductions: 0, advanceDeduct: 0 }, c1.periodDue);
eq([s(c1.periodDue), s(c2.cumulative), s(c2.cumulativeNet), s(c2.periodDue), c2.taxApplied], ['95000', '150000', '142500', '47500', false], 'TR-11: تراكمي 150000 − محتجز 5% = 142500 − السابق 95000 = 47500 (الضريبة مش متطبقة لحد السياسة)');
eq([T.clientCertificateStatus({ approval: 'draft' }), T.clientCertificateStatus({ approval: 'approved', due: 100, collected: 0 }), T.clientCertificateStatus({ approval: 'approved', due: 100, collected: 40 }), T.clientCertificateStatus({ approval: 'approved', due: 100, collected: 100 }), T.clientCertificateStatus({ approval: 'rejected' })],
  ['مسودة', 'معتمد', 'محصّل جزئيًا', 'محصّل', 'مرفوض'], 'TR-11: حالة المستخلص من الاعتماد والتحصيل');

// الإجازات
const Lv = { leaves: [{ id: 'l1', personKind: 'employee', personId: 'E', status: 'approved', type: 'annual', from: '2026-02-01', days: 3 }, { id: 'l2', employeeId: 'E', status: 'approved', type: 'annual', from: '2026-05-01', days: 2 }, { id: 'l3', employeeId: 'E', status: 'pending', type: 'annual', from: '2026-06-01', days: 9 }, { id: 'l4', employeeId: 'E', status: 'approved', type: 'annual', from: '2025-12-01', days: 4 }] };
eq(s(T.leaveUsed(Lv, 'E', 2026)), '5', 'TR-14: المستخدم من السجلات المعتمدة للموظف (employeeId أو personId)، والسنين التانية محفوظة مش ممسوحة');

summary([]);
