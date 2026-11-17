import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { errorCode, errorMessage, SessionService } from '../core/session.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressBarModule],
  template: `
    <div class="auth-page">
      <mat-card class="auth-card" appearance="outlined">
        @if (busy()) { <mat-progress-bar mode="indeterminate" /> }
        <mat-card-header><mat-card-title>النظام الموحد</mat-card-title><mat-card-subtitle>تسجيل الدخول</mat-card-subtitle></mat-card-header>
        <mat-card-content>
          <form (ngSubmit)="submit()" id="loginForm">
            <mat-form-field appearance="outline"><mat-label>اسم المستخدم</mat-label>
              <input matInput name="username" id="username" [(ngModel)]="username" autocomplete="username" dir="ltr" required /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>كلمة المرور</mat-label>
              <input matInput name="password" id="password" type="password" [(ngModel)]="password" autocomplete="current-password" dir="ltr" required /></mat-form-field>
            @if (needOtp()) {
              <mat-form-field appearance="outline"><mat-label>كود التحقق (6 أرقام) أو كود استرداد</mat-label>
                <input matInput name="otp" id="otp" [(ngModel)]="otp" autocomplete="one-time-code" inputmode="numeric" dir="ltr" maxlength="16" /></mat-form-field>
            }
            <div class="err" id="loginError" role="alert">{{ error() }}</div>
            <button mat-flat-button type="submit" id="loginBtn" [disabled]="busy()">دخول</button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>`,
})
export class LoginPage {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  username = ''; password = ''; otp = '';
  readonly needOtp = signal(false);
  readonly busy = signal(false);
  readonly error = signal(this.route.snapshot.queryParamMap.get('expired') ? 'انتهت الجلسة — سجّل الدخول مرة أخرى' : '');

  async submit() {
    if (!this.username.trim() || !this.password) { this.error.set('اكتب اسم المستخدم وكلمة المرور'); return; }
    this.busy.set(true); this.error.set('');
    try {
      await this.session.login(this.username.trim(), this.password, this.needOtp() ? this.otp.trim() : undefined);
      await this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('next') || '/');
    } catch (e) {
      const code = errorCode(e);
      if (code === 'OTP_REQUIRED' || code === 'OTP_INVALID') {
        this.needOtp.set(true); this.otp = '';
        this.error.set(code === 'OTP_REQUIRED' ? 'أدخل كود التحقق من تطبيق المصادقة على موبايلك' : errorMessage(e));
      } else { this.error.set(errorMessage(e, 'تعذر تسجيل الدخول')); this.password = ''; }
    } finally { this.busy.set(false); }
  }
}
