// بيانات اختبار المعادلات المالية — المرحلة 3. كل رقم متوقع محسوب يدويًا في tests-merge/phase59.js
// (والحسابات مكتوبة جنب كل سجل هنا). مصمّمة لتغطية الحالات الحرجة: نصف يوم، خصم أكبر من الأجر، مرتجع جزئي،
// فاتورة ملغاة، صافي مخزّن غلط، حالات تقريب .005، حالة حضور «إجازة»، مصروف بسطور، أكثر من فترة.
'use strict';
const P = 'مشروع أ';

function fixture() {
  return {
    schemaVersion: 9,
    users: [],
    settings: { companyName: 'اختبار', workDaysPerMonth: 26, defaultLeaveDays: 21 },
    projects: [{ id: 'p1', code: 'PRJ-1', name: P, budget: 10000, status: 'active' }],
    ledger: {
      suppliers: [{ id: 'S1', name: 'مورد 1', openingBalance: 1000, openingBalanceDate: '2026-01-01' }],
      invoices: [
        // 1000 + 140 + 0 = 1140 ؛ − 10 = 1130
        { id: 'I1', supplierId: 'S1', invoiceNo: '1', date: '2026-02-01', project: P, baseValue: 1000, vat: 140, stampDuty: 0, withheld: 10, totalInvoice: 1140, netInvoice: 1130 },
        // 0.1 + 0.2 (كسور JS) = 0.3 — قبل تاريخ الرصيد الافتتاحي
        { id: 'I2', supplierId: 'S1', invoiceNo: '2', date: '2025-12-15', baseValue: 0.1, vat: 0.2, stampDuty: 0, withheld: 0, totalInvoice: 0.3, netInvoice: 0.3 },
        // مرتجع جزئي من I1: 100 + 14 = 114 ؛ − 1 = 113
        { id: 'R1', supplierId: 'S1', invoiceNo: 'R-1', date: '2026-03-01', project: P, isReturn: true, linkedInvoiceId: 'I1', baseValue: 100, vat: 14, stampDuty: 0, withheld: 1, totalInvoice: 114, netInvoice: 113 },
        // ملغاة
        { id: 'I3', supplierId: 'S1', invoiceNo: '3', date: '2026-04-01', project: P, cancelled: true, baseValue: 500, vat: 0, stampDuty: 0, withheld: 0, totalInvoice: 500, netInvoice: 500 },
        // صافي مخزّن غلط: المتوقع 200+28+2 = 230 ؛ −2 = 228 لكن المخزّن 229 — ودخلت المخزن (I4 مربوطة بحركة وارد)
        { id: 'I4', supplierId: 'S1', invoiceNo: '4', date: '2026-04-10', project: P, baseValue: 200, vat: 28, stampDuty: 2, withheld: 2, totalInvoice: 230, netInvoice: 229 },
      ],
      payments: [
        { id: 'LP1', supplierId: 'S1', invoiceId: 'I1', amount: 500, date: '2026-02-10', direction: 'pay', paymentNo: 1 },
        { id: 'LP2', supplierId: 'S1', amount: 100, date: '2026-05-01', direction: 'collect', paymentNo: 2 },
        { id: 'LP3', supplierId: 'S1', invoiceId: 'I1', amount: 0.1, date: '2025-12-20', direction: 'pay', paymentNo: 3 },
      ],
    },
    workers: [{ id: 'W1', code: 'W-1', name: 'عامل 1', dailyWage: 300, status: 'active', type: 'daily' }],
    drivers: [{ id: 'D1', code: 'D-1', name: 'سائق 1', dailyWage: 200, status: 'active' }],
    supervisors: [{ id: 'SV1', code: 'SV-1', name: 'مشرف 1', dailyWage: 500, status: 'active' }],
    employees: [
      { id: 'EMP1', code: 'E-1', name: 'موظف 1', salary: 6000, hireDate: '2026-02-15', status: 'active' },
      { id: 'EMP2', code: 'E-2', name: 'موظف 2', salary: 4000, hireDate: '2025-01-01', status: 'active' },
    ],
    equipment: [
      { id: 'EQ1', code: 'EQ-1', name: 'لودر', dailyCost: 1000, hourlyCost: 150, fuelPrice: 12.5, status: 'working' },
      { id: 'EQ2', code: 'EQ-2', name: 'هراس', dailyCost: 0, hourlyCost: 100, status: 'working' },
    ],
    workerAttendance: [
      { id: 'A1', personType: 'worker', personId: 'W1', workerId: 'W1', date: '2026-01-05', status: 'present', days: 1, project: P }, // 300
      { id: 'A2', personType: 'worker', personId: 'W1', workerId: 'W1', date: '2026-01-06', status: 'half', days: 1, project: P }, // نصف يوم ← 150
      { id: 'A3', personType: 'worker', personId: 'W1', workerId: 'W1', date: '2026-01-07', status: 'late', days: 1, deduction: 50 }, // 250
      { id: 'A4', personType: 'worker', personId: 'W1', workerId: 'W1', date: '2026-01-08', status: 'absent', days: 1 }, // 0
      { id: 'A5', personType: 'worker', personId: 'W1', workerId: 'W1', date: '2026-07-01', status: 'present', days: 1.5, dayWage: 333.33 }, // 499.995 ← 500.00
      { id: 'A6', personType: 'worker', personId: 'W1', workerId: 'W1', date: '2026-01-09', status: 'leave', days: 1 }, // «إجازة» مش غياب ← 300 (ملاحظة F)
      { id: 'A7', personType: 'worker', personId: 'W1', workerId: 'W1', date: '2026-01-10', status: 'present', days: 1, deduction: 400 }, // خصم أكبر من الأجر ← 0
      { id: 'A8', personType: 'driver', personId: 'D1', driverId: 'D1', date: '2026-02-01', status: 'present', days: 1 }, // 200
      { id: 'A9', personType: 'supervisor', personId: 'SV1', supervisorId: 'SV1', date: '2026-02-02', status: 'half' }, // 250
    ],
    workerPayments: [
      { id: 'WP1', workerId: 'W1', personType: 'worker', personId: 'W1', type: 'pay', amount: 1000, date: '2026-02-01' },
      { id: 'WP2', personType: 'worker', personId: 'W1', type: 'penalty', amount: 100, date: '2026-03-01' },
      { id: 'WP3', workerId: 'W1', personType: 'worker', personId: 'W1', type: 'bonus', amount: 75, date: '2026-04-01' },
      { id: 'WP4', workerId: 'W1', personType: 'worker', personId: 'W1', type: 'pay', status: 'accrued', amount: 999, date: '2026-05-01' }, // مستحق مش مدفوع
      { id: 'WP5', personType: 'driver', personId: 'D1', type: 'pay', amount: 150, date: '2026-02-03' },
      { id: 'WP6', personType: 'supervisor', personId: 'SV1', type: 'penalty', amount: 20, date: '2026-02-04' },
      { id: 'WP7', personType: 'employee', personId: 'EMP1', type: 'pay', amount: 6000, date: '2026-03-01' },
    ],
    employeePenalties: [{ id: 'EP1', employeeId: 'EMP1', amount: 250, date: '2026-04-01' }],
    payroll: [{ id: 'PR1', employeeId: 'EMP2', year: 2026, month: 1, netSalary: 3900 }],
    costs: [{ id: 'C1', personKind: 'worker', personId: 'W1', amount: 40, date: '2026-02-02', project: P }],
    // مصروف بسطور ومن غير amount: 10 + 5.5 = 15.5 للشخص — وتكلفة المشروع بتقرا amount بس (ملاحظة F)
    expenses: [{ id: 'E1', personKind: 'worker', personId: 'W1', date: '2026-02-03', project: P, lines: [{ item: 'نقل', amount: 10 }, { item: 'أكل', amount: '5.5' }] }],
    equipmentDaily: [
      { id: 'ED1', equipmentId: 'EQ1', date: '2026-02-05', days: 2, fuelLiters: 10, project: P }, // 2×1000 + 10×12.5 = 2125
      { id: 'ED2', equipmentId: 'EQ1', date: '2026-08-01', days: 0, hours: 5 }, // 5×150 = 750
      { id: 'ED3', equipmentId: 'EQ1', date: '2026-03-05', days: 1, cost: 999 }, // تكلفة مسجّلة ← 999
      { id: 'ED4', equipmentId: 'EQ2', date: '2026-03-06', days: 1 }, // يومية صفر ← 1×8×100 = 800
    ],
    clients: {
      customers: [{ id: 'CU1', name: 'عميل 1', code: 'C-1' }],
      // إجمالي = 100000 + 5000 − 1000 = 104000 ؛ محتجز 5% = 5200 ؛ ضريبة 1% = 1040 ؛ الصافي = 104000 − 2000 − 3000 − 5200 − 1040 = 92760
      invoices: [{ id: 'CI1', no: 'INV-1', customerId: 'CU1', contractId: 'K1', project: P, value: 100000, previousWorks: 50000, extras: 5000, excluded: 1000, deductions: 2000, advanceDeduct: 3000, retentionPct: 5, taxPct: 1, paid: 0 }],
      // B1: 10×12.5 = 125 + 3×0.335 = 1.005 ← 1.01 ⇒ 126.01 ؛ B2 من غير بنود ⇒ 777
      boqs: [
        { id: 'B1', customerId: 'CU1', title: 'مقايسة', items: [{ id: 'bi1', name: 'خرسانة', qty: 10, price: 12.5 }, { id: 'bi2', name: 'دهان', contractQty: 3, unitPrice: 0.335 }] },
        { id: 'B2', customerId: 'CU1', title: 'مقايسة إجمالية', items: [], total: 777 },
      ],
      // حجم 2×1.5×0.3×2 = 1.8 ×100 = 180 ؛ مساحة 3×3 = 9 ×10 = 90 ؛ عنوان = 0 ؛ عدد 4 ×2.5 = 10 ⇒ 280
      workSurveys: [{ id: 'WS1', customerId: 'CU1', items: [
        { id: 's1', method: 'حجم', length: 2, width: 1.5, height: 0.3, count: 2, price: 100 },
        { id: 's2', method: 'مساحة', length: 3, width: 3, price: 10 },
        { id: 's3', isHeader: true, qty: 5, price: 5 },
        { id: 's4', method: 'عدد', count: 4, price: 2.5 },
      ] }],
      // معتمد 1000 + معتمد "250.5" = 1250.5 (المسودة مش بتتحسب)
      contracts: [{ id: 'K1', customerId: 'CU1', title: 'عقد', value: 10000, originalValue: 10000, changeOrders: [
        { id: 'v1', status: 'معتمد', amount: 1000 }, { id: 'v2', status: 'مسودة', amount: 500 }, { id: 'v3', status: 'معتمد', amount: '250.5' },
      ] }],
      collections: [], guarantees: [], opportunities: [], activities: [], docs: [],
    },
    warehouses: {
      // IT1: وارد 10 − صرف 2 − صرف 3 = 5 ؛ القيمة 5 × 10.005 = 50.025
      items: [{ id: 'IT1', code: 'IT-1', name: 'أسمنت', unit: 'شيكارة', avgCost: 10.005 }],
      locations: [{ id: 'L1', code: 'L-1', name: 'المخزن' }],
      movements: [
        { id: 'M1', type: 'in', itemId: 'IT1', locationId: 'L1', qty: 10, supplierInvoiceId: 'I4', date: '2026-04-10' },
        { id: 'M2', type: 'out', itemId: 'IT1', locationId: 'L1', qty: 2, unitCost: 12.345, project: P, date: '2026-04-11' }, // 24.69
        { id: 'M3', type: 'out', itemId: 'IT1', locationId: 'L1', qty: 3, project: P, date: '2026-04-12' }, // 3 × 10.005 = 30.015
      ],
      stocktakes: [],
    },
  };
}

module.exports = { fixture, P };
