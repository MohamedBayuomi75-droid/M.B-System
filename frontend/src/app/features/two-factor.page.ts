import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { errorMessage, SessionService } from '../core/session.service';

/** تفعيل التحقق بخطوتين الإجباري (REQUIRE_2FA_ROLES): كلمة المرور ← المفتاح ← أول كود ← أكواد الاسترداد (مرة واحدة) */
@Component({
  selector: 'app-two-factor',
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="auth-page"><mat-card class="auth-card" appearance="outlined">
      <mat-card-header><mat-card-title>تفعيل التحقق بخطوتين</mat-card-title>
        <mat-card-subtitle>حسابك يتطلب كود من تطبيق مصادقة (Google أو Microsoft Authenticator)</mat-card-subtitle></mat-card-header>
      <mat-card-content>
        @switch (step()) {
          @case ('password') {
            <form (ngSubmit)="start()"><mat-form-field appearance="outline"><mat-label>كلمة المرور الحالية</mat-label>
              <input matInput id="tfPw" name="pw" type="password" [(ngModel)]="password" dir="ltr" /></mat-form-field>
              <button mat-flat-button id="tfStart" type="submit">متابعة</button></form>
          }
          @case ('code') {
            <p>١) في التطبيق: «إضافة حساب» ← «إدخال مفتاح يدويًا» (حسب الوقت):</p>
            <div class="secret" id="tfSecret" dir="ltr">{{ secret() }}</div>
            <form (ngSubmit)="enable()"><mat-form-field appearance="outline"><mat-label>٢) الكود اللي ظهر في التطبيق</mat-label>
              <input matInput id="tfOtp" name="otp" [(ngModel)]="otp" inputmode="numeric" maxlength="6" dir="ltr" /></mat-form-field>
              <button mat-flat-button id="tfEnable" type="submit">تفعيل</button></form>
          }
          @case ('codes') {
            <p>تم التفعيل. احتفظ بأكواد الاسترداد في مكان آمن — كل كود يستخدم مرة واحدة ومش هتظهر تاني:</p>
            <div class="secret" id="tfCodes" dir="ltr">{{ codes().join('   ') }}</div>
            <button mat-flat-button id="tfDone" (click)="done()">حفظت الأكواد — متابعة</button>
          }
        }
        <div class="err" role="alert">{{ error() }}</div>
      </mat-card-content>
    </mat-card></div>`,
})
export class TwoFactorPage {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  readonly step = signal<'password' | 'code' | 'codes'>('password');
  readonly secret = signal(''); readonly codes = signal<string[]>([]); readonly error = signal('');
  password = ''; otp = '';
  async start() {
    try { const r = await this.session.twoFactorSetup(this.password); this.secret.set(r.secret.replace(/(.{4})/g, '$1 ').trim()); this.step.set('code'); this.error.set(''); }
    catch (e) { this.error.set(errorMessage(e)); }
  }
  async enable() {
    try { const r = await this.session.twoFactorEnable(this.otp.trim()); this.codes.set(r.recoveryCodes); this.step.set('codes'); this.error.set(''); }
    catch (e) { this.error.set(errorMessage(e, 'الكود غلط')); this.otp = ''; }
  }
  async done() { await this.session.reloadMe(); await this.router.navigateByUrl('/'); }
}
