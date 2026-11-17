import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiError, Me, PageAction, TokenResponse } from './models';

/**
 * نفس جلسة الواجهة الحالية بالظبط (web/web-session.js):
 *  - access token في الذاكرة بس (مش localStorage) ويتجدد قبل انتهائه.
 *  - refresh token في كوكي HttpOnly (rt، Path=/api/auth) — مشتركة مع /legacy/ (دخول واحد للواجهتين).
 *  - تغيير كلمة المرور الإجباري + التحقق بخطوتين (OTP_REQUIRED / TWO_FACTOR_SETUP_REQUIRED) بنفس أكواد السيرفر.
 * القرار النهائي في الصلاحيات دايمًا على السيرفر — هنا للعرض والتوجيه بس.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);
  private readonly tokenSig = signal<string | null>(null);
  private readonly meSig = signal<Me | null>(null);
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshing: Promise<boolean> | null = null;

  readonly me = this.meSig.asReadonly();
  readonly loggedIn = computed(() => !!this.tokenSig() && !!this.meSig());
  token(): string | null { return this.tokenSig(); }

  can(page: string, action: PageAction = 'view'): boolean {
    const p = this.meSig()?.permissions.pages[page];
    return !!p && !!p[action];
  }

  private set(r: TokenResponse) {
    this.tokenSig.set(r.accessToken);
    this.meSig.set(r.user);
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    const ms = Math.max(30, (r.expiresIn || 900) - 60) * 1000;
    this.refreshTimer = setTimeout(() => { void this.refresh(); }, ms);
  }

  clear() {
    this.tokenSig.set(null); this.meSig.set(null);
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
  }

  /** تجديد من الكوكي (مرة واحدة في نفس الوقت حتى لو طلبات كتير طلبته) */
  refresh(): Promise<boolean> {
    if (this.refreshing) return this.refreshing;
    this.refreshing = (async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          this.set(await firstValueFrom(this.http.post<TokenResponse>('/api/auth/refresh', {}, { withCredentials: true })));
          return true;
        } catch (e) {
          const err = (e as HttpErrorResponse).error as ApiError | undefined;
          if (err?.code === 'REFRESH_RACE') { await new Promise((r) => setTimeout(r, 400)); continue; } // تاب تاني (أو /legacy/) جدّد في نفس اللحظة
          this.clear();
          return false;
        }
      }
      this.clear();
      return false;
    })().finally(() => { this.refreshing = null; });
    return this.refreshing;
  }

  async login(username: string, password: string, otp?: string): Promise<void> {
    this.set(await firstValueFrom(this.http.post<TokenResponse>('/api/auth/login', { username, password, ...(otp ? { otp } : {}) }, { withCredentials: true })));
  }

  async changePassword(newPassword: string, currentPassword?: string): Promise<void> {
    this.set(await firstValueFrom(this.http.post<TokenResponse>('/api/auth/change-password', { newPassword, ...(currentPassword ? { currentPassword } : {}) }, { withCredentials: true })));
  }

  async reloadMe(): Promise<void> { this.meSig.set(await firstValueFrom(this.http.get<Me>('/api/me'))); }

  twoFactorSetup(password: string) { return firstValueFrom(this.http.post<{ secret: string; otpauthUrl: string }>('/api/auth/2fa/setup', { password })); }
  twoFactorEnable(otp: string) { return firstValueFrom(this.http.post<{ recoveryCodes: string[] }>('/api/auth/2fa/enable', { otp })); }

  async logout(): Promise<void> {
    try { await firstValueFrom(this.http.post('/api/auth/logout', {}, { withCredentials: true })); } catch { /* حتى لو فشل: نمسح المحلي */ }
    this.clear();
  }
}

/** رسالة خطأ عربية من رد السيرفر الموحّد { code, message, requestId } */
export function errorMessage(e: unknown, fallback = 'حصل خطأ — حاول تاني'): string {
  const err = (e as HttpErrorResponse)?.error as ApiError | undefined;
  if ((e as HttpErrorResponse)?.status === 0) return 'تعذّر الاتصال بالسيرفر';
  if ((e as HttpErrorResponse)?.status === 429) return 'محاولات كتير — استنى دقيقة وحاول تاني';
  const m = err?.message;
  return (Array.isArray(m) ? m.join('، ') : m) || fallback;
}
export const errorCode = (e: unknown): string | undefined => ((e as HttpErrorResponse)?.error as ApiError | undefined)?.code;
