import { PAGES, Permissions } from './roles';

/**
 * الصلاحيات بالمستويات الأربعة (المرحلة 5، الخطة §5):
 *  1) الموديول — مشتق: الموديول ظاهر لو المستخدم شايف أي صفحة فيه (مفيش إعداد منفصل يتخمّن).
 *  2) الصفحة — قوالب الأدوار + تخصيص المستخدم (roles.ts — مطابقة للديسكتوب حرفيًا، ماتتغيّرش).
 *  3) الفعل — عرض/إضافة/تعديل/حذف (الصفحة) + **أفعال المستندات** هنا: اعتماد، رفض، طباعة، تصدير، صرف، إلغاء، ترحيل.
 *     مقفولة افتراضيًا لكل الأدوار (مفيش افتراض لأي دور) ما عدا مدير النظام؛ المنح لكل مستخدم بقرار المدير (user_action_permissions).
 *     ملاحظة: مين يعتمد مستند معيّن بيتحدد من **مسار الاعتماد** (approval_*)، مش من الفعل ده.
 *  4) نطاق البيانات — projectScope (موجود). نطاقا «إدارته» و«ما أنشأه» محتاجين تعريف (B-35) — مش متفعّلين.
 */
export const DOC_ACTIONS = ['approve', 'reject', 'print', 'export', 'pay', 'cancel', 'post'] as const;
export type DocAction = (typeof DOC_ACTIONS)[number];
export type DocActions = Record<DocAction, boolean>;
export interface DocActionOverride { action: string; scope: string; allowed: boolean }

export function effectiveDocActions(role: string, overrides: DocActionOverride[] = []): DocActions {
  const out = Object.fromEntries(DOC_ACTIONS.map((a) => [a, role === 'admin'])) as DocActions;
  if (role === 'admin') return out;
  for (const o of overrides) if (o.scope === '*' && (DOC_ACTIONS as readonly string[]).includes(o.action)) out[o.action as DocAction] = o.allowed;
  return out;
}

/** الموديولات (TARGET_ARCHITECTURE §5) ← صفحاتها في النظام الحالي */
export const MODULE_PAGES: Readonly<Record<string, readonly string[]>> = {
  dashboard: ['dashboard', 'general.overview', 'tasks.my'],
  labor: ['employees', 'workers', 'supervisors', 'drivers', 'departments', 'attendance', 'workerAttendance', 'workerDues', 'leaves', 'payroll', 'performance', 'transfers'],
  equipment: ['equipment'],
  projects: ['projects'],
  expenses: ['expenses', 'costs'],
  suppliers: ['ledger.dashboard', 'ledger.suppliers', 'ledger.categories', 'ledger.archive'],
  invoices: ['ledger.invoices', 'ledger.returns', 'ledger.quarterly'],
  treasury: ['ledger.payments', 'clients.collections'],
  clients: ['clients.dashboard', 'clients.customers', 'clients.crm', 'clients.accounts', 'clients.archive'],
  contracts: ['clients.workSurveys', 'clients.boqs', 'clients.contracts', 'clients.invoices', 'clients.guarantees', 'clients.comparison'],
  warehouses: ['warehouses.home', 'warehouses.reports'],
  reports: ['reports', 'ledger.reports', 'clients.reports', 'accounts.reports'],
  documents: ['archive'],
  system: ['users', 'backup'],
};

export function visibleModules(perms: Permissions): string[] {
  return Object.entries(MODULE_PAGES).filter(([, pages]) => pages.some((p) => perms.pages[p]?.view)).map(([m]) => m);
}

/** كل صفحة في PAGES لازم تبقى في موديول واحد بالظبط (بيتحقق في الاختبار) */
export const ALL_MODULE_PAGES = Object.values(MODULE_PAGES).flat();
export const PAGES_WITHOUT_MODULE = PAGES.filter((p) => !ALL_MODULE_PAGES.includes(p));
