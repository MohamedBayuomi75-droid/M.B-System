/**
 * جدول توجيه الصفحات (TARGET_ARCHITECTURE §7): لكل صفحة «legacy» (الواجهة الحالية /legacy/) أو «angular» (/app/).
 * نقل صفحة = تغيير سطر هنا بعد اعتماد المستخدم، والرجوع فوري بنفس الطريقة.
 * المرحلة 6.1 (قلب التوجيه بموافقة 2026-11-17): «الموردين» و«العملاء» → Angular. الشاشة الكاملة القديمة متاحة
 *   للأرصدة والفواتير وكشف الحساب والحذف (موديولاتها 6.3/6.4). الرجوع: تغيير السطرين دول.
 * المرحلة 6.2-ب: «المخازن» → Angular (الأصناف والأرصدة والتحويل والتسويات). الشاشة الكاملة للاستلام/الصرف بتكلفتهم والجرد والتقارير لحد B-20.
 * المرحلة 7.2 (قلب التوجيه بموافقة 2026-11-22): «الفواتير» و«المرتجعات» → Angular. الشاشة الكاملة القديمة متاحة للحذف والتصدير
 *   وإشعارات الخصم والمرفقات (DEC-0108). الرجوع: تغيير السطرين دول.
 * المرحلة 7.3 (قلب التوجيه بموافقة 2026-11-22): «الدفعات» → Angular. الشاشة الكاملة للحذف والتصدير وطباعة الكشف والمرفقات. الرجوع: السطرين دول.
 * المرحلة 7.4 (قلب التوجيه بموافقة 2026-11-23، DEC-0119): «المشاريع» → Angular. الشاشة الكاملة لعرض المشروع والتكلفة والمسار والحذف
 *   والتصدير (DEC-0117). الرجوع: السطرين دول.
 */
export interface PageRoute { key: string; label: string; icon: string; target: 'legacy' | 'angular'; path?: string; pilot?: boolean }

export const PAGE_ROUTES: readonly PageRoute[] = [
  { key: 'dashboard', label: 'مركز المتابعة', icon: 'dashboard', target: 'legacy' },
  { key: 'projects', label: 'المشاريع', icon: 'apartment', target: 'angular', path: '/projects' },
  { key: 'projects', label: 'المشاريع — الشاشة الكاملة', icon: 'domain', target: 'legacy' },
  { key: 'ledger.suppliers', label: 'الموردين', icon: 'local_shipping', target: 'angular', path: '/suppliers' },
  { key: 'ledger.suppliers', label: 'الموردين — الشاشة الكاملة', icon: 'account_balance_wallet', target: 'legacy' },
  { key: 'ledger.invoices', label: 'فواتير الموردين', icon: 'receipt_long', target: 'angular', path: '/supplier-invoices' },
  { key: 'ledger.invoices', label: 'فواتير الموردين — الشاشة الكاملة', icon: 'receipt_long', target: 'legacy' },
  { key: 'ledger.returns', label: 'المرتجعات', icon: 'assignment_return', target: 'angular', path: '/supplier-returns' },
  { key: 'ledger.returns', label: 'المرتجعات — الشاشة الكاملة', icon: 'assignment_return', target: 'legacy' },
  { key: 'ledger.payments', label: 'الدفعات', icon: 'payments', target: 'angular', path: '/supplier-payments' },
  { key: 'ledger.payments', label: 'الدفعات — الشاشة الكاملة', icon: 'payments', target: 'legacy' },
  { key: 'workers', label: 'العمال', icon: 'engineering', target: 'legacy' },
  { key: 'workerDues', label: 'المستحقات', icon: 'payments', target: 'legacy' },
  { key: 'clients.customers', label: 'العملاء', icon: 'groups', target: 'angular', path: '/customers' },
  { key: 'clients.customers', label: 'العملاء — الشاشة الكاملة', icon: 'contact_page', target: 'legacy' },
  { key: 'warehouses.home', label: 'المخازن', icon: 'inventory_2', target: 'angular', path: '/warehouses' },
  { key: 'warehouses.home', label: 'المخازن — الشاشة الكاملة', icon: 'warehouse', target: 'legacy' },
];

/** رابط الصفحة القديمة: نفس الجلسة، والواجهة القديمة بتفتح الصفحة من hash */
export const legacyUrl = (key: string) => `/legacy/#${encodeURIComponent(key)}`;
