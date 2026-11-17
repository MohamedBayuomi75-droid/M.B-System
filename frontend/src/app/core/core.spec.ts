import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { authGuard } from './guards';
import { Me } from './models';
import { formatMoney } from './money';
import { legacyUrl, PAGE_ROUTES } from './page-routes';
import { errorCode, errorMessage, SessionService } from './session.service';

const me = (over: Partial<Me> = {}): Me => ({
  id: 'u1', username: 'admin', name: 'المدير', role: 'admin', roleLabel: 'مدير النظام', mustChangePassword: false, twoFactorEnabled: false,
  twoFactorSetupRequired: false, projectScope: null, pages: [], permissions: { editData: true, deleteData: true, manageUsers: true, pages: { projects: { view: true, add: false, edit: false, delete: false } } }, ...over,
});
const tok = (u = me()) => ({ accessToken: 'AT', tokenType: 'Bearer' as const, expiresIn: 900, user: u });

describe('core', () => {
  let http: HttpTestingController;
  let session: SessionService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionService);
  });
  afterEach(() => http.verify());

  it('login keeps the token in memory only and exposes permissions', async () => {
    const p = session.login('admin', 'pw');
    const req = http.expectOne('/api/auth/login');
    expect(req.request.body).toEqual({ username: 'admin', password: 'pw' });
    expect(req.request.withCredentials).toBe(true);
    req.flush(tok());
    await p;
    expect(session.loggedIn()).toBe(true);
    expect(session.can('projects')).toBe(true);
    expect(session.can('projects', 'edit')).toBe(false);
    expect(session.can('ledger.invoices')).toBe(false);
    expect(localStorage.length + sessionStorage.length).toBe(0);
  });

  it('interceptor adds Bearer to /api calls, and on 401 refreshes once then retries', async () => {
    const p = session.login('a', 'b'); http.expectOne('/api/auth/login').flush(tok()); await p;
    const call = firstValueFrom(TestBed.inject(HttpClient).get('/api/v1/projects'));
    const first = http.expectOne('/api/v1/projects');
    expect(first.request.headers.get('Authorization')).toBe('Bearer AT');
    first.flush({ code: 'UNAUTHENTICATED' }, { status: 401, statusText: 'Unauthorized' });
    await Promise.resolve();
    http.expectOne('/api/auth/refresh').flush({ ...tok(), accessToken: 'AT2' });
    await new Promise((r) => setTimeout(r, 0));
    const retry = http.expectOne('/api/v1/projects');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer AT2');
    retry.flush({ items: [], total: 0, source: 'legacy-records' });
    expect(await call).toEqual({ items: [], total: 0, source: 'legacy-records' });
  });

  it('refresh retries on REFRESH_RACE (another tab or /legacy/ refreshed at the same moment)', async () => {
    const p = session.refresh();
    http.expectOne('/api/auth/refresh').flush({ code: 'REFRESH_RACE' }, { status: 401, statusText: 'x' });
    await new Promise((r) => setTimeout(r, 450));
    http.expectOne('/api/auth/refresh').flush(tok());
    expect(await p).toBe(true);
  });

  it('guard: forced password change and required 2FA come before any page', async () => {
    const router = TestBed.inject(Router);
    const run = () => TestBed.runInInjectionContext(() => authGuard({} as never, { url: '/projects' } as never)) as Promise<unknown>;
    let r = run(); http.expectOne('/api/auth/refresh').flush({}, { status: 401, statusText: 'x' });
    expect(router.serializeUrl((await r) as never)).toBe('/login?next=%2Fprojects');
    const lp = session.login('a', 'b'); http.expectOne('/api/auth/login').flush(tok(me({ mustChangePassword: true }))); await lp;
    expect(router.serializeUrl((await run()) as never)).toBe('/change-password');
    const lp2 = session.login('a', 'b'); http.expectOne('/api/auth/login').flush(tok(me({ twoFactorSetupRequired: true }))); await lp2;
    expect(router.serializeUrl((await run()) as never)).toBe('/two-factor');
    const lp3 = session.login('a', 'b'); http.expectOne('/api/auth/login').flush(tok()); await lp3;
    expect(await run()).toBe(true);
  });

  it('server error messages (unified format)', () => {
    const e = { status: 400, error: { code: 'OTP_INVALID', message: 'كود غلط', requestId: 'r1' } };
    expect([errorCode(e), errorMessage(e)]).toEqual(['OTP_INVALID', 'كود غلط']);
    expect(errorMessage({ status: 0 })).toBe('تعذّر الاتصال بالسيرفر');
    expect(errorMessage({ status: 400, error: { message: ['أ', 'ب'] } })).toBe('أ، ب');
  });

  it('money is formatted from the decimal string (no JS number math)', () => {
    expect(formatMoney('1250000.5000')).toBe('١٬٢٥٠٬٠٠٠٫٥٠');
    expect(formatMoney('2000.0001')).toBe('٢٬٠٠٠٫٠٠٠١');
    expect(formatMoney('123456789012345.6789')).toBe('١٢٣٬٤٥٦٬٧٨٩٬٠١٢٬٣٤٥٫٦٧٨٩'); // كل الخانات (Number كانت هتفقدها)
    expect(formatMoney(null)).toBe('—');
  });

  it('page routing table: every page is either legacy or angular, and angular ones have a path', () => {
    for (const p of PAGE_ROUTES) expect(p.target === 'legacy' || !!p.path).toBe(true);
    expect(legacyUrl('ledger.suppliers')).toBe('/legacy/#ledger.suppliers');
  });
});
