/**
 * الحقول المالية (UNIFIED-WEB-PLAN A3): لو اتعدّلت من اتنين في نفس الوقت (نفس الحقل بعد baseRev)
 * التعديل بيترفض صراحةً (conflict) بدل ما آخر واحد يكسب بصمت.
 * = قائمة صريحة لكل collection + نمط عام على اسم الحقل (أي حاجة شكلها فلوس/كميات).
 */
const EXPLICIT: Readonly<Record<string, readonly string[]>> = {
  'ledger.invoices': ['supplierId', 'date', 'isReturn', 'cancelled', 'linkedInvoiceId', 'linkedReturnIds', 'postReturnWht', 'withheldStatus', 'nature', 'category'],
  'ledger.payments': ['paymentNo', 'supplierId', 'invoiceId', 'direction', 'date', 'method', 'batchId'],
  'ledger.suppliers': ['openingBalanceDate'],
  workerAttendance: ['days', 'status', 'date', 'personId', 'workerId'],
  attendance: ['status', 'date'],
  leaves: ['days', 'from', 'to', 'type', 'status'],
  payroll: ['*'],
  workerPayments: ['*'],
  employeePenalties: ['*'],
  settings: ['nextPaymentNo', 'workDaysPerMonth', 'moneyDecimals', 'expenseApprovalLimit'],
};

export const FINANCIAL_NAME_RE = /(amount|total|net|gross|price|value|salary|wage|paid|balance|cost|vat|tax|discount|budget|qty|quantit|deduct|allowance|bonus|penalt|withheld|stamp|rate|lines|items|allocation|due|fee|fuel)/i;

export function isFinancialField(path: string, field: string): boolean {
  const list = EXPLICIT[path];
  if (list && (list.includes('*') || list.includes(field))) return true;
  return FINANCIAL_NAME_RE.test(field);
}
