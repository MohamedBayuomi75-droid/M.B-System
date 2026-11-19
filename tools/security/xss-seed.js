// بيانات مُركّبة لفحص XSS: سجلات بنفس شكل البيانات الحقيقية (xss-shape.json — أسماء حقول فقط)
// + سجلات يدوية للمجموعات اللي مالهاش بيانات حقيقية (العملاء والعقود والمخازن...).
// كل قيمة نصية = نص عادي؛ xss-probe.js هو اللي بيحوّلها لنص خبيث.
const shape = require('./xss-shape.json');

const REF = { supplierId: 'ledger.suppliers', projectId: 'projects', personId: 'workers', workerId: 'workers', employeeId: 'employees', customerId: 'clients.customers', contractId: 'clients.contracts', equipmentId: 'equipment', itemId: 'warehouses.items', locationId: 'warehouses.locations', toLocationId: 'warehouses.locations', driverId: 'drivers', departmentId: 'departments', invoiceId: 'ledger.invoices', boqId: 'clients.boqs', supervisorId: 'supervisors' };
const idOf = (coll, n) => coll.replace(/\W/g, '_') + '_' + n;

function valueFor(coll, k, spec, n) {
  if (k === 'id') return idOf(coll, n);
  if (REF[k]) return idOf(REF[k], 1);
  if (spec.enums) return spec.enums[n % spec.enums.length];
  if (/date$|Date$|^date/.test(k)) return '2026-0' + (1 + (n % 9)) + '-1' + n;
  // حقول البريد بصيغة بريد (قرار 2026-11-17: صيغة بريد العميل بيتحقق منها في قاعدة البيانات بعد نقل الموديول)
  if (k === 'email') return `نص_${k}_${n}@example.com`;
  switch (spec.type) {
    case 'number': return 10 * (n + 1);
    case 'boolean': return false;
    case 'array': return [];
    case 'object': return {};
    case 'null': return null;
    default: return `نص ${k} ${n}`;
  }
}

const MANUAL = {
  'clients.contracts': [{ code: 'CT', title: 'عقد', name: 'اسم', project: 'مشروع', contractDate: '2026-01-05', originalValue: 1000, value: 1000, customerId: 1, boqs: [], workSurveys: [], changeOrders: [], notes: 'ملاحظة' }],
  'clients.invoices': [{ no: 'INV', invoiceNo: 'INV', code: 'C', project: 'مشروع', date: '2026-01-06', deductions: [], advanceDeduct: 0, retentionPct: 5, taxPct: 14, notes: 'ملاحظة', previousWorks: 0, extras: [], excluded: [], paid: 0, value: 100, customerName: 'عميل', status: 'draft', contractId: 1, category: 'فئة', customerId: 1 }],
  'clients.boqs': [{ code: 'B', name: 'مقايسة', title: 'مقايسة', project: 'مشروع', customerName: 'عميل', notes: 'ملاحظة', customerId: 1, items: [{ id: 'bi1', code: 'I', name: 'بند', unit: 'م', qty: 2, price: 5, unitPrice: 5, total: 10, contractQty: 2, notes: 'ن' }] }],
  'clients.collections': [{ no: 'CO', date: '2026-01-07', project: 'مشروع', customerName: 'عميل', invoiceNo: 'INV', method: 'cash', amount: 50, refNo: 'ر', notes: 'ملاحظة', customerId: 1 }],
  'clients.workSurveys': [{ code: 'WS', name: 'حصر', project: 'مشروع', execDate: '2026-01-08', status: 'open', workType: 'نوع', location: 'مكان', officer: 'مسؤول', supervisor: 'مشرف', customerName: 'عميل', notes: 'ملاحظة', customerId: 1, items: [{ id: 'wi1', name: 'بند', unit: 'م', qty: 1, count: 1, width: 1, height: 1, price: 3, total: 3, notes: 'ن' }] }],
  'clients.guarantees': [{ letterNo: 'LG', status: 'active', type: 'performance', customerName: 'عميل', issuer: 'بنك', name: 'خطاب', amount: 70, issueDate: '2026-01-01', expiryDate: '2027-01-01', projectId: 1, contractId: 1, customerId: 1, project: 'مشروع', renewals: [], releaseNote: 'ن', notes: 'ملاحظة' }],
  'clients.opportunities': [{ name: 'فرصة', title: 'فرصة', stage: 'lead', comms: [], expectedValue: 10, customerId: 1, customerName: 'عميل', date: '2026-01-02', notes: 'ملاحظة', source: 'مصدر', nextFollowUp: '2026-02-01' }],
  'clients.activities': [{ name: 'نشاط', title: 'نشاط', customerId: 1, customerName: 'عميل', date: '2026-01-03', notes: 'ملاحظة', type: 'call' }],
  'clients.docs': [{ entity: 'customer', name: 'مستند', entityName: 'عميل', date: '2026-01-04', type: 'contract', customerName: 'عميل', letterNo: 'ل', fileName: 'f.pdf', stepLabel: 'خطوة', title: 'عنوان', no: 'ر' }],
  'warehouses.items': [{ code: 'IT', name: 'صنف', type: 'material', unit: 'كجم', category: 'فئة', minQty: 1, avgCost: 2, lastCost: 2, notes: 'ملاحظة' }],
  'warehouses.locations': [{ code: 'L', name: 'مخزن', type: 'store', notes: 'ملاحظة' }],
  'warehouses.movements': [{ type: 'in', itemId: 1, locationId: 1, toLocationId: 1, qty: 3, val: 6, project: 'مشروع', supplierInvoiceId: 'ledger_invoices_1', supplierName: 'مورد', date: '2026-01-09', notes: 'ملاحظة' }],
  'warehouses.stocktakes': [{ code: 'ST', locationId: 1, date: '2026-01-10', notes: 'ملاحظة', lines: [] }],
};

function buildSeed() {
  const data = { schemaVersion: undefined, ledger: {}, clients: {}, warehouses: {} };
  delete data.schemaVersion; // الواجهة بتطبق الترحيلات وتعرف الإصدار بنفسها
  const put = (coll, arr) => {
    const [a, b] = coll.split('.');
    if (b) data[a][b] = arr; else data[a] = arr;
  };
  for (const [coll, fields] of Object.entries(shape)) {
    const rows = [];
    for (let n = 1; n <= 2; n++) { const r = {}; for (const [k, spec] of Object.entries(fields)) r[k] = valueFor(coll, k, spec, n); r.id = idOf(coll, n); rows.push(r); }
    put(coll, rows);
  }
  for (const [coll, recs] of Object.entries(MANUAL)) {
    const rows = recs.map((r, i) => {
      const o = { ...r, id: idOf(coll, i + 1) };
      for (const k of Object.keys(o)) if (REF[k] && o[k] === 1) o[k] = idOf(REF[k], 1);
      return o;
    });
    put(coll, rows);
  }
  return data;
}

module.exports = { buildSeed };
