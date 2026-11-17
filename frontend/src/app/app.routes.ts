import { Routes } from '@angular/router';
import { authGuard, pageGuard } from './core/guards';
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
      { path: 'forbidden', component: ForbiddenPage },
      { path: '**', component: NotFoundPage },
    ],
  },
];
