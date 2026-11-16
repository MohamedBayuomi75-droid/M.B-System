/**
 * المصدر الوحيد لمفاتيح الصفحات وقوالب الأدوار (UNIFIED-WEB-PLAN §2.4).
 * منقول من renderer/core/permissions.js (HR_PAGES + roleTemplates). اختبار roles.spec.ts بيتأكد
 * إن الصفحات والأدوار المشتركة مطابقة للديسكتوب حرفيًا لحد ما الواجهة القديمة تقرا من GET /api/me.
 * أي صفحة جديدة في الواجهة لازم تتضاف هنا الأول.
 */

export const PAGES = [
  // HR (بدون بادئة)
  'dashboard', 'employees', 'workers', 'supervisors', 'equipment', 'projects', 'drivers', 'transfers', 'performance', 'departments',
  'attendance', 'workerAttendance', 'workerDues', 'expenses', 'costs', 'leaves', 'payroll', 'reports', 'archive', 'backup', 'users',
  // دفتر الموردين
  'ledger.dashboard', 'ledger.suppliers', 'ledger.invoices', 'ledger.returns', 'ledger.payments', 'ledger.categories', 'ledger.quarterly', 'ledger.reports', 'ledger.archive',
  // عام + العملاء والمشاريع
  'general.overview', 'tasks.my', 'clients.dashboard', 'clients.customers', 'clients.workSurveys', 'clients.boqs', 'clients.contracts', 'clients.invoices',
  'clients.guarantees', 'clients.comparison', 'clients.crm', 'clients.collections', 'clients.accounts', 'clients.reports', 'clients.archive',
  // المخازن + الحسابات
  'warehouses.home', 'warehouses.reports', 'accounts.reports',
] as const;

export type PageKey = (typeof PAGES)[number];
export const PAGE_ACTIONS = ['view', 'add', 'edit', 'delete'] as const;
export type PageAction = (typeof PAGE_ACTIONS)[number];
export type PagePerm = Record<PageAction, boolean>;

export interface Permissions {
  editData: boolean;
  deleteData: boolean;
  manageUsers: boolean;
  pages: Record<string, PagePerm>;
}

export const ROLE_KEYS = ['admin', 'hr', 'viewer', 'payroll', 'clientsSales', 'clientsAccounts', 'clientsProjects', 'warehouse', 'ledgerAccountant', 'projectManager', 'custom'] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_LABELS: Record<RoleKey, string> = {
  admin: 'مدير النظام',
  hr: 'موارد بشرية',
  payroll: 'رواتب ومستحقات',
  viewer: 'عرض فقط',
  clientsSales: 'عملاء: مبيعات وعقود',
  clientsAccounts: 'عملاء: محاسب مستخلصات وتحصيل',
  clientsProjects: 'عملاء: مدير مشاريع',
  warehouse: 'أمين مخازن',
  ledgerAccountant: 'محاسب دفتر الموردين',
  projectManager: 'مدير مشروع (مشاريعه بس)',
  custom: 'مخصّص',
};

const perm = (view: boolean, add = false, edit = false, del = false): PagePerm => ({ view, add, edit, delete: del });

function allPages(view: boolean, add: boolean, edit: boolean, del: boolean): Record<string, PagePerm> {
  const o: Record<string, PagePerm> = {};
  for (const p of PAGES) o[p] = perm(view, add, edit, del);
  return o;
}

function clientsRole(full: string[], viewOnly: string[]): Permissions {
  const p = allPages(false, false, false, false);
  for (const k of ['dashboard', 'general.overview', 'tasks.my']) p[k] = perm(true);
  for (const k of PAGES.filter((x) => x.startsWith('clients.'))) {
    const f = full.includes(k);
    p[k] = { view: f || viewOnly.includes(k) || viewOnly.includes('*'), add: f, edit: f, delete: false };
  }
  p.projects = full.includes('projects') ? perm(true, true, true, false) : perm(true);
  return { editData: true, deleteData: false, manageUsers: false, pages: p };
}

/** وحدة كاملة (بدون حذف) + صفحات عامة للعرض — للأدوار الجديدة في الويب */
function unitRole(prefix: string): Permissions {
  const p = allPages(false, false, false, false);
  for (const k of ['dashboard', 'general.overview', 'tasks.my', 'projects']) p[k] = perm(true);
  for (const k of PAGES.filter((x) => x.startsWith(prefix))) p[k] = perm(true, true, true, false);
  return { editData: true, deleteData: false, manageUsers: false, pages: p };
}

/**
 * مدير مشروع (قرار §8): بيشوف ويشغّل مشاريعه بس — النطاق الفعلي من users.project_scope (إجباري للدور ده،
 * والفلترة على مستوى الصفوف في A3). مفيش رواتب ولا بيانات موظفين ولا دفتر موردين ولا مستخدمين ولا حذف.
 */
function projectManagerRole(): Permissions {
  const p = allPages(false, false, false, false);
  const view = ['dashboard', 'general.overview', 'tasks.my', 'projects', 'workers', 'supervisors', 'equipment', 'drivers', 'attendance', 'costs', 'reports',
    'clients.dashboard', 'clients.contracts', 'clients.invoices', 'clients.reports', 'warehouses.home'];
  const work = ['workerAttendance', 'transfers', 'expenses', 'clients.workSurveys', 'clients.boqs'];
  for (const k of view) p[k] = perm(true);
  for (const k of work) p[k] = perm(true, true, true, false);
  p.projects = perm(true, false, true, false);
  return { editData: true, deleteData: false, manageUsers: false, pages: p };
}

/** الأدوار اللي لازم يكون لها نطاق مشاريع (project_scope) مش فاضي */
export const ROLES_REQUIRING_PROJECT_SCOPE: readonly RoleKey[] = ['projectManager'];

function build(): Record<RoleKey, Permissions> {
  const hrPages = allPages(true, true, true, true);
  hrPages.backup = perm(true);
  hrPages.users = perm(false);

  const payrollPages = allPages(false, false, false, false);
  for (const k of ['dashboard', 'employees', 'payroll', 'supervisors', 'reports', 'leaves', 'projects', 'workers', 'workerDues', 'expenses', 'costs']) {
    const w = k === 'payroll' || k === 'leaves';
    payrollPages[k] = perm(true, w, w, false);
  }
  const viewer: Permissions = { editData: false, deleteData: false, manageUsers: false, pages: allPages(true, false, false, false) };
  return {
    admin: { editData: true, deleteData: true, manageUsers: true, pages: allPages(true, true, true, true) },
    hr: { editData: true, deleteData: true, manageUsers: false, pages: hrPages },
    viewer,
    payroll: { editData: true, deleteData: false, manageUsers: false, pages: payrollPages },
    clientsSales: clientsRole(['clients.customers', 'clients.crm', 'clients.workSurveys', 'clients.boqs', 'clients.contracts', 'clients.comparison'], ['*']),
    clientsAccounts: clientsRole(['clients.invoices', 'clients.collections', 'clients.accounts', 'clients.guarantees'], ['*']),
    clientsProjects: clientsRole(['projects', 'clients.workSurveys', 'clients.boqs', 'clients.comparison', 'clients.guarantees'], ['*']),
    warehouse: unitRole('warehouses.'),
    ledgerAccountant: unitRole('ledger.'),
    projectManager: projectManagerRole(),
    // «مخصّص»: الأساس عرض فقط، والصلاحيات الفعلية من user_permissions
    custom: { ...viewer, pages: allPages(false, false, false, false) },
  };
}

/** نسخة جديدة في كل نداء (عشان محدش يعدّل القالب المشترك بالغلط) */
export function roleTemplates(): Record<RoleKey, Permissions> {
  return build();
}

export function isRoleKey(x: unknown): x is RoleKey {
  return typeof x === 'string' && (ROLE_KEYS as readonly string[]).includes(x);
}
export function isPageKey(x: unknown): x is PageKey {
  return typeof x === 'string' && (PAGES as readonly string[]).includes(x);
}
