import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

/** لازم دخول (أو تجديد صامت من الكوكي) + تغيير كلمة المرور الإجباري + تفعيل 2FA الإجباري قبل أي صفحة */
export const authGuard: CanActivateFn = async (_route, state) => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (!session.loggedIn() && !(await session.refresh())) return router.createUrlTree(['/login'], { queryParams: { next: state.url } });
  const me = session.me()!;
  if (me.mustChangePassword) return router.createUrlTree(['/change-password']);
  if (me.twoFactorSetupRequired) return router.createUrlTree(['/two-factor']);
  return true;
};

/** صلاحية عرض الصفحة (data.page) — للعرض بس؛ السيرفر بيرفض لوحده لو مفيش صلاحية */
export const pageGuard: CanActivateFn = (route) => {
  const session = inject(SessionService);
  const page = route.data?.['page'] as string | undefined;
  return !page || session.can(page, 'view') ? true : inject(Router).createUrlTree(['/forbidden']);
};
