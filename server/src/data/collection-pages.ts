/**
 * ربط كل مفتاح في DATA بالصلاحيات (UNIFIED-WEB-PLAN §2.4 — collection-pages.ts).
 *
 *  read : الصفحات اللي أي واحدة منها تكفي للقراءة، أو 'any' = أي مستخدم مسجّل (قوائم مرجعية وإعدادات).
 *  write: الصفحات اللي فعل (add/edit/delete) على أي واحدة منها يكفي للكتابة، أو 'anyEditor' = أي مستخدم عنده
 *         editData + تعديل على صفحة واحدة على الأقل (إعدادات الواجهة والقوائم المرجعية).
 *         والكتابة كمان محتاجة العلم العام: editData لـ add/edit و deleteData لـ delete (D-019).
 *  project: حقول المعرّف اللي بتربط السجل بمشروع (نطاق الصفوف لمستخدم ليه projectScope). 'id' = السجل نفسه مشروع.
 *
 * اختبار data/policy.spec.ts بيتأكد إن كل مفتاح في collections-map.generated.ts متغطّي هنا وإن كل الصفحات معروفة.
 */
import { COLLECTIONS_MAP } from './collections-map.generated';

export type ReadRule = 'any' | readonly string[];
export type WriteRule = 'anyEditor' | 'none' | readonly string[];
export interface CollectionAccess {
  read: ReadRule;
  write: WriteRule;
  project?: readonly string[];
}

const LEDGER_ALL = ['ledger.dashboard', 'ledger.suppliers', 'ledger.invoices', 'ledger.returns', 'ledger.payments', 'ledger.categories', 'ledger.quarterly', 'ledger.reports', 'ledger.archive'];
const CLIENTS_ALL = ['clients.dashboard', 'clients.customers', 'clients.workSurveys', 'clients.boqs', 'clients.contracts', 'clients.invoices', 'clients.guarantees', 'clients.comparison', 'clients.crm', 'clients.collections', 'clients.accounts', 'clients.reports', 'clients.archive', 'general.overview'];
/** صفحات محتاجة دليل الأشخاص (أسماء/أكواد) — الحقول الحساسة بتتشال بـ field-guards */
const PEOPLE_READERS = ['employees', 'workers', 'supervisors', 'drivers', 'equipment', 'attendance', 'workerAttendance', 'workerDues', 'leaves', 'payroll', 'expenses', 'costs', 'reports', 'transfers', 'performance', 'archive'];
// ملاحظة (D-019): صفحة «المشاريع» مش قارئ لبيانات التشغيل (عمال/يوميات/مصاريف/...) — أدوار الدفتر والعملاء عندها
// view على المشاريع عشان قائمة المشاريع بس. مدير المشروع عنده صفحات التشغيل نفسها صراحةً.
const PROJ = ['projectId'] as const;

export const COLLECTION_ACCESS: Readonly<Record<string, CollectionAccess>> = {
  // ---- HR: الأشخاص والمعدات ----
  employees: { read: PEOPLE_READERS, write: ['employees'], project: PROJ },
  workers: { read: PEOPLE_READERS, write: ['workers', 'transfers'], project: PROJ },
  supervisors: { read: PEOPLE_READERS, write: ['supervisors', 'transfers'], project: PROJ },
  drivers: { read: PEOPLE_READERS, write: ['drivers'], project: PROJ },
  equipment: { read: PEOPLE_READERS, write: ['equipment', 'transfers'], project: PROJ },
  departments: { read: 'any', write: ['departments'] },
  projects: { read: 'any', write: ['projects'], project: ['id'] },
  // ---- الحضور والرواتب ----
  attendance: { read: ['attendance', 'payroll', 'reports', 'employees'], write: ['attendance'] },
  workerAttendance: { read: ['workerAttendance', 'workerDues', 'payroll', 'reports', 'workers'], write: ['workerAttendance'], project: PROJ },
  leaves: { read: ['leaves', 'payroll', 'employees', 'attendance', 'reports'], write: ['leaves'] },
  payroll: { read: ['payroll'], write: ['payroll'] },
  workerPayments: { read: ['workerDues', 'payroll'], write: ['workerDues', 'payroll'] },
  employeePenalties: { read: ['payroll', 'employees'], write: ['payroll', 'employees'] },
  // مراجع قديمة في التقارير (fallback) — نفس حماية المستحقات
  workerPenalties: { read: ['workerDues', 'payroll', 'reports'], write: ['workerDues', 'payroll'] },
  supervisorPayments: { read: ['workerDues', 'payroll', 'reports'], write: ['workerDues', 'payroll'] },
  payments: { read: ['workerDues', 'payroll', 'reports'], write: ['workerDues', 'payroll'] },
  // ---- المعدات والتشغيل ----
  equipmentLogs: { read: ['equipment', 'costs', 'reports'], write: ['equipment'], project: PROJ },
  equipmentDaily: { read: ['equipment', 'costs', 'reports'], write: ['equipment'], project: PROJ },
  fuelLogs: { read: ['equipment', 'drivers', 'costs', 'reports'], write: ['equipment', 'drivers'], project: PROJ },
  licenseExpenses: { read: ['equipment', 'costs', 'reports'], write: ['equipment'] },
  resourceTransfers: { read: ['transfers', 'workers', 'equipment', 'reports'], write: ['transfers'], project: ['fromProjectId', 'toProjectId'] },
  transfers: { read: ['transfers', 'reports'], write: ['transfers'], project: ['fromProjectId', 'toProjectId'] },
  projectPlans: { read: ['projects', 'reports'], write: ['projects'], project: PROJ },
  projectDaily: { read: ['projects', 'reports'], write: ['projects'], project: PROJ },
  performanceReviews: { read: ['performance'], write: ['performance'] },
  // مستندات الأشخاص (بطايق، رخص) مش مربوطة بمشروع → صفحات الموارد البشرية بس
  personDocuments: { read: ['archive', 'employees'], write: ['archive', 'employees', 'workers', 'supervisors', 'drivers', 'equipment'] },
  // ---- المصاريف والتكاليف ----
  expenses: { read: ['expenses', 'costs', 'reports'], write: ['expenses'], project: PROJ },
  supervisorExpenses: { read: ['expenses', 'costs', 'reports'], write: ['expenses'], project: PROJ },
  costs: { read: ['costs', 'expenses', 'reports'], write: ['costs'], project: PROJ },
  // ---- عام ----
  dailyTasks: { read: 'any', write: 'anyEditor' },
  customCards: { read: 'any', write: 'anyEditor' },
  // الأرشيف/المهملات فيها لقطة كاملة من الشخص (entity) → صفحة الأرشيف بس، واللقطة محمية في field-guards
  archiveTrash: { read: ['archive'], write: ['archive', 'employees', 'workers', 'supervisors', 'drivers', 'equipment'] },
  resignedArchive: { read: ['archive'], write: ['archive', 'employees', 'workers', 'supervisors', 'drivers'] },
  attachments: { read: ['archive'], write: ['archive'] },
  // ---- دفتر الموردين ----
  'ledger.suppliers': { read: LEDGER_ALL, write: ['ledger.suppliers', 'ledger.invoices', 'ledger.payments'] },
  'ledger.invoices': { read: LEDGER_ALL, write: ['ledger.invoices', 'ledger.returns'], project: PROJ },
  'ledger.payments': { read: LEDGER_ALL, write: ['ledger.payments'] },
  'ledger.archiveFolders': { read: ['ledger.archive'], write: ['ledger.archive'] },
  'ledger.archiveTrash': { read: ['ledger.archive'], write: ['ledger.archive'] },
  // ---- العملاء والمشاريع ----
  'clients.customers': { read: [...CLIENTS_ALL, 'projects'], write: ['clients.customers', 'clients.crm'] },
  'clients.workSurveys': { read: [...CLIENTS_ALL, 'projects'], write: ['clients.workSurveys'], project: PROJ },
  'clients.boqs': { read: [...CLIENTS_ALL, 'projects'], write: ['clients.boqs'], project: PROJ },
  'clients.contracts': { read: [...CLIENTS_ALL, 'projects'], write: ['clients.contracts'], project: PROJ },
  'clients.invoices': { read: CLIENTS_ALL, write: ['clients.invoices'], project: PROJ },
  'clients.collections': { read: CLIENTS_ALL, write: ['clients.collections'], project: PROJ },
  'clients.guarantees': { read: CLIENTS_ALL, write: ['clients.guarantees'], project: PROJ },
  'clients.opportunities': { read: CLIENTS_ALL, write: ['clients.crm'] },
  'clients.activities': { read: CLIENTS_ALL, write: ['clients.crm'] },
  'clients.docs': { read: CLIENTS_ALL, write: ['clients.archive'] },
  // ---- المخازن ----
  'warehouses.items': { read: ['warehouses.home', 'warehouses.reports'], write: ['warehouses.home'] },
  'warehouses.locations': { read: ['warehouses.home', 'warehouses.reports'], write: ['warehouses.home'] },
  'warehouses.movements': { read: ['warehouses.home', 'warehouses.reports'], write: ['warehouses.home'], project: PROJ },
  'warehouses.stocktakes': { read: ['warehouses.home', 'warehouses.reports'], write: ['warehouses.home'] },
};

/** القوائم المرجعية والإعدادات وأعلام الترحيل: قراءة للكل، كتابة لأي محرّر (D-019) */
export const DOC_ACCESS: CollectionAccess = { read: 'any', write: 'anyEditor' };
/** مفاتيح بيملكها السيرفر — أي كتابة من العميل عليها بتتجاهل */
export const SERVER_OWNED_DOCS: ReadonlySet<string> = new Set(['schemaVersion']);

export function accessFor(path: string): CollectionAccess | null {
  const kind = COLLECTIONS_MAP[path];
  if (!kind) return null;
  if (kind === 'collection') return COLLECTION_ACCESS[path] ?? null;
  if (kind === 'lookup' || kind === 'doc' || kind === 'meta-flag') return DOC_ACCESS;
  return null; // system-table / legacy-ref: معالجة خاصة
}
