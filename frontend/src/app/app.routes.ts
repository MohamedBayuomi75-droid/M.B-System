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
      { path: 'projects', canActivate: [pageGuard], data: { page: 'projects' }, loadComponent: () => import('./features/projects.page').then((m) => m.ProjectsPage), title: 'المشروعات (تجريبي)' },
      { path: 'suppliers', canActivate: [pageGuard], data: { page: 'ledger.suppliers', skin: 'legacy', bodyClass: 'module-ledger' }, loadComponent: () => import('./features/suppliers.page').then((m) => m.SuppliersPage), title: 'الموردين' },
      { path: 'customers', canActivate: [pageGuard], data: { page: 'clients.customers', skin: 'legacy' }, loadComponent: () => import('./features/customers.page').then((m) => m.CustomersPage), title: 'العملاء' },
      // 7.2: فواتير ومرتجعات الموردين — التوجيه من القايمة اتقلب بموافقة البوابة (2026-11-22، page-routes)
      { path: 'supplier-invoices', canActivate: [pageGuard], data: { page: 'ledger.invoices', skin: 'legacy', bodyClass: 'module-ledger', mode: 'invoices' }, loadComponent: () => import('./features/supplier-invoices.page').then((m) => m.SupplierInvoicesPage), title: 'كل الفواتير' },
      { path: 'supplier-returns', canActivate: [pageGuard], data: { page: 'ledger.returns', skin: 'legacy', bodyClass: 'module-ledger', mode: 'returns' }, loadComponent: () => import('./features/supplier-invoices.page').then((m) => m.SupplierInvoicesPage), title: 'المرتجعات' },
      { path: 'warehouses', canActivate: [pageGuard], data: { page: 'warehouses.home', skin: 'legacy' }, loadComponent: () => import('./features/warehouses.page').then((m) => m.WarehousesPage), title: 'المخازن' },
      { path: 'formulas', canActivate: [financeRulesGuard], loadComponent: () => import('./features/formulas.page').then((m) => m.FormulasPage), title: 'إدارة القواعد المالية' },
      { path: 'taxes', canActivate: [financeRulesGuard], loadComponent: () => import('./features/taxes.page').then((m) => m.TaxesPage), title: 'الضرائب والاستقطاعات' },
      { path: 'approvals', loadComponent: () => import('./features/approvals.page').then((m) => m.ApprovalsPage), title: 'بانتظار اعتمادي' },
      { path: 'forbidden', component: ForbiddenPage },
      { path: '**', component: NotFoundPage },
    ],
  },
];
