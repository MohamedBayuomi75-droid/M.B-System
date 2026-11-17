/**
 * جدول توجيه الصفحات (TARGET_ARCHITECTURE §7): لكل صفحة «legacy» (الواجهة الحالية /legacy/) أو «angular» (/app/).
 * نقل صفحة = تغيير سطر هنا بعد اعتماد المستخدم، والرجوع فوري بنفس الطريقة.
 * المرحلة 6.1: «الموردين/العملاء (تجريبي)» شاشات جديدة جنب القديمة — مش بديل ليها لحد قلب التوجيه بموافقة.
 * المرحلة 4: مفيش صفحة اتنقلت — «المشروعات (تجريبي)» شاشة عرض جديدة جنب الصفحة القديمة، مش بديل ليها.
 */
export interface PageRoute { key: string; label: string; icon: string; target: 'legacy' | 'angular'; path?: string; pilot?: boolean }

export const PAGE_ROUTES: readonly PageRoute[] = [
  { key: 'dashboard', label: 'مركز المتابعة', icon: 'dashboard', target: 'legacy' },
  { key: 'projects', label: 'المشروعات (تجريبي)', icon: 'apartment', target: 'angular', path: '/projects', pilot: true },
  { key: 'projects', label: 'المشروعات', icon: 'domain', target: 'legacy' },
  { key: 'ledger.suppliers', label: 'الموردين (تجريبي)', icon: 'local_shipping', target: 'angular', path: '/suppliers', pilot: true },
  { key: 'ledger.suppliers', label: 'الموردين', icon: 'local_shipping', target: 'legacy' },
  { key: 'ledger.invoices', label: 'فواتير الموردين', icon: 'receipt_long', target: 'legacy' },
  { key: 'workers', label: 'العمال', icon: 'engineering', target: 'legacy' },
  { key: 'workerDues', label: 'المستحقات', icon: 'payments', target: 'legacy' },
  { key: 'clients.customers', label: 'العملاء (تجريبي)', icon: 'groups', target: 'angular', path: '/customers', pilot: true },
  { key: 'clients.customers', label: 'العملاء', icon: 'groups', target: 'legacy' },
  { key: 'warehouses.home', label: 'المخازن', icon: 'inventory_2', target: 'legacy' },
];

/** رابط الصفحة القديمة: نفس الجلسة، والواجهة القديمة بتفتح الصفحة من hash */
export const legacyUrl = (key: string) => `/legacy/#${encodeURIComponent(key)}`;
