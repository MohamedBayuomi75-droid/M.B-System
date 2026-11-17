import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { SessionService } from './session.service';

/** Bearer لكل طلبات /api (ماعدا مسارات الدخول/التجديد)، ولو 401: تجديد مرة واحدة وإعادة الطلب، وإلا صفحة الدخول */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const router = inject(Router);
  const isAuthCall = /\/api\/auth\/(login|refresh|logout)$/.test(req.url);
  const withToken = (t: string | null) => (t && req.url.startsWith('/api/') && !isAuthCall ? req.clone({ setHeaders: { Authorization: `Bearer ${t}` } }) : req);
  return next(withToken(session.token())).pipe(
    catchError((e: HttpErrorResponse) => {
      if (e.status !== 401 || isAuthCall || req.headers.has('x-retried')) return throwError(() => e);
      return from(session.refresh()).pipe(switchMap((ok) => {
        if (!ok) { void router.navigate(['/login'], { queryParams: { expired: 1 } }); return throwError(() => e); }
        return next(withToken(session.token()).clone({ setHeaders: { 'x-retried': '1' } }));
      }));
    }),
  );
};
