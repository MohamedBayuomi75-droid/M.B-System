/**
 * حقول حساسة (UNIFIED-WEB-PLAN §2.4 — field-guards.ts): بتتشال من أي رد (bootstrap، changes، البث اللحظي)
 * لو المستخدم مالوش view على صفحة من صفحات الحارس، وأي محاولة لكتابتها بتترفض (403 FIELD_FORBIDDEN).
 * لو المستخدم مابعتهاش في التعديل، القيمة المخزنة بتفضل زي ما هي (التعديل بالحقول المتغيّرة بس).
 */
export interface FieldGuard {
  fields: readonly string[];
  /** view على أي صفحة منهم يكفي */
  pages: readonly string[];
}

const SALARY = ['salary', 'basicSalary', 'netSalary', 'allowances', 'bonuses', 'deductions', 'insuranceSalary'];
const WAGES = ['dailyWage', 'salary', 'basicSalary', 'netSalary', 'allowances', 'bonuses'];

export const FIELD_GUARDS: Readonly<Record<string, readonly FieldGuard[]>> = {
  employees: [{ fields: SALARY, pages: ['payroll'] }],
  workers: [{ fields: WAGES, pages: ['payroll', 'workerDues'] }],
  supervisors: [{ fields: WAGES, pages: ['payroll', 'workerDues'] }],
  drivers: [{ fields: WAGES, pages: ['payroll', 'workerDues'] }],
  workerAttendance: [{ fields: ['dayWage', 'deduction'], pages: ['payroll', 'workerDues'] }],
  // لقطة الشخص المحذوف/المستقيل فيها الراتب/الأجر
  archiveTrash: [{ fields: ['entity'], pages: ['payroll', 'workerDues'] }],
  resignedArchive: [{ fields: ['entity'], pages: ['payroll', 'workerDues'] }],
  // أرصدة العملاء (الخطة: «أرصدة»)
  'clients.customers': [{ fields: ['openingBalance', 'ledger'], pages: ['clients.accounts', 'clients.collections', 'clients.invoices'] }],
};
