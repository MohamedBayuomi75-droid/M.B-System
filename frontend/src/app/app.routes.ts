import { Routes } from '@angular/router';
import { authGuard, financeRulesGuard, pageGuard } from './core/guards';
import { ChangePasswordPage } from './features/change-password.page';
import { ForbiddenPage, HomePage, NotFoundPage } from './features/home.page';
import { LoginPage } from './features/login.page';
import { ShellComponent } from './features/shell.component';
import { TwoFactorPage } from './features/two-factor.page';

export const routes: Routes = [
  { path: 'login', component: LoginPage, title: 'تسجيل الدخول — النظام الموحد' },
  { path: 'change-password', component: ChangePasswordPage, title: 'تغيير كلمة المرور' },
  { path: 'two-factor', component: TwoFactorPage, title: 'التحقق بخطوتين' },
  {
    path: '', component: ShellComponent, canActivate: [authGuard], children: [
      { path: '', component: HomePage, title: 'النظام الموحد' },
      { path: 'workers', canActivate: [pageGuard], data: { page: 'workers', skin: 'legacy' }, loadComponent: () => import('./features/workers.page').then((m) => m.WorkersPage), title: 'العمال' },
      { path: 'supervisors', canActivate: [pageGuard], data: { page: 'supervisors', skin: 'legacy', kind: 'supervisor' }, loadComponent: () => import('./features/people.page').then((m) => m.PeoplePage), title: 'المشرفون' },
      { path: 'drivers', canActivate: [pageGuard], data: { page: 'drivers', skin: 'legacy', kind: 'driver' }, loadComponent: () => import('./features/people.page').then((m) => m.PeoplePage), title: 'السائقون' },
      { path: 'employees', canActivate: [pageGuard], data: { page: 'employees', skin: 'legacy', kind: 'employee' }, loadComponent: () => import('./features/people.page').then((m) => m.PeoplePage), title: 'الموظفين' },
      { path: 'leaves', canActivate: [pageGuard], data: { page: 'leaves', skin: 'legacy' }, loadComponent: () => import('./features/leaves.page').then((m) => m.LeavesPage), title: 'الإجازات' },
      { path: 'worker-attendance', canActivate: [pageGuard], data: { page: 'workerAttendance', skin: 'legacy' }, loadComponent: () => import('./features/worker-attendance.page').then((m) => m.WorkerAttendancePage), title: 'اليوميات' },
      { path: 'attendance', canActivate: [pageGuard], data: { page: 'attendance', skin: 'legacy' }, loadComponent: () => import('./features/attendance.page').then((m) => m.AttendancePage), title: 'حضور الموظفين' },
      { path: 'worker-dues', canActivate: [pageGuard], data: { page: 'workerDues', skin: 'legacy' }, loadComponent: () => import('./features/worker-dues.page').then((m) => m.WorkerDuesPage), title: 'المستحقات' },
      { path: 'projects', canActivate: [pageGuard], data: { page: 'projects', skin: 'legacy' }, loadComponent: () => import('./features/projects.page').then((m) => m.ProjectsPage), title: 'المشاريع' },
      { path: 'suppliers', canActivate: [pageGuard], data: { page: 'ledger.suppliers', skin: 'legacy', bodyClass: 'module-ledger' }, loadComponent: () => import('./features/suppliers.page').then((m) => m.SuppliersPage), title: 'الموردين' },
      { path: 'customers', canActivate: [pageGuard], data: { page: 'clients.customers', skin: 'legacy' }, loadComponent: () => import('./features/customers.page').then((m) => m.CustomersPage), title: 'العملاء' },
      // 7.2: فواتير ومرتجعات الموردين — التوجيه من القايمة اتقلب بموافقة البوابة (2026-11-22، page-routes)
      { path: 'supplier-invoices', canActivate: [pageGuard], data: { page: 'ledger.invoices', skin: 'legacy', bodyClass: 'module-ledger', mode: 'invoices' }, loadComponent: () => import('./features/supplier-invoices.page').then((m) => m.SupplierInvoicesPage), title: 'كل الفواتير' },
      { path: 'supplier-returns', canActivate: [pageGuard], data: { page: 'ledger.returns', skin: 'legacy', bodyClass: 'module-ledger', mode: 'returns' }, loadComponent: () => import('./features/supplier-invoices.page').then((m) => m.SupplierInvoicesPage), title: 'المرتجعات' },
      // 7.3: الدفعات وكشف الحساب — التوجيه من القايمة اتقلب بموافقة البوابة (2026-11-22، page-routes)
      { path: 'supplier-payments', canActivate: [pageGuard], data: { page: 'ledger.payments', skin: 'legacy', bodyClass: 'module-ledger' }, loadComponent: () => import('./features/supplier-payments.page').then((m) => m.SupplierPaymentsPage), title: 'الدفعات' },
      { path: 'supplier-statement', canActivate: [pageGuard], data: { page: 'ledger.suppliers', skin: 'legacy', bodyClass: 'module-ledger' }, loadComponent: () => import('./features/supplier-statement.page').then((m) => m.SupplierStatementPage), title: 'كشف حساب المورد' },
      { path: 'warehouses', canActivate: [pageGuard], data: { page: 'warehouses.home', skin: 'legacy' }, loadComponent: () => import('./features/warehouses.page').then((m) => m.WarehousesPage), title: 'المخازن' },
      { path: 'formulas', canActivate: [financeRulesGuard], loadComponent: () => import('./features/formulas.page').then((m) => m.FormulasPage), title: 'إدارة القواعد المالية' },
      { path: 'taxes', canActivate: [financeRulesGuard], loadComponent: () => import('./features/taxes.page').then((m) => m.TaxesPage), title: 'الضرائب والاستقطاعات' },
      { path: 'approvals', loadComponent: () => import('./features/approvals.page').then((m) => m.ApprovalsPage), title: 'بانتظار اعتمادي' },
      { path: 'forbidden', component: ForbiddenPage },
      { path: '**', component: NotFoundPage },
    ],
  },
];
