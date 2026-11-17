import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { errorMessage, SessionService } from '../core/session.service';

@Component({
  selector: 'app-change-password',
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="auth-page"><mat-card class="auth-card" appearance="outlined">
      <mat-card-header><mat-card-title>لازم تغيّر كلمة المرور</mat-card-title><mat-card-subtitle>10 أحرف على الأقل</mat-card-subtitle></mat-card-header>
      <mat-card-content><form (ngSubmit)="submit()">
        <mat-form-field appearance="outline"><mat-label>كلمة المرور الجديدة</mat-label><input matInput id="newPw" name="p1" type="password" [(ngModel)]="p1" autocomplete="new-password" dir="ltr" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>تأكيد كلمة المرور</mat-label><input matInput id="newPw2" name="p2" type="password" [(ngModel)]="p2" autocomplete="new-password" dir="ltr" /></mat-form-field>
        <div class="err" id="pwError" role="alert">{{ error() }}</div>
        <button mat-flat-button type="submit" id="pwBtn">حفظ والمتابعة</button>
        <button mat-button type="button" (click)="logout()">تسجيل الخروج</button>
      </form></mat-card-content>
    </mat-card></div>`,
})
export class ChangePasswordPage {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  p1 = ''; p2 = '';
  readonly error = signal('');
  async submit() {
    if (this.p1.length < 10) { this.error.set('كلمة المرور لازم 10 أحرف على الأقل'); return; }
    if (this.p1 !== this.p2) { this.error.set('كلمتا المرور غير متطابقتين'); return; }
    try { await this.session.changePassword(this.p1); await this.router.navigateByUrl('/'); }
    catch (e) { this.error.set(errorMessage(e, 'تعذر حفظ كلمة المرور')); }
  }
  async logout() { await this.session.logout(); await this.router.navigateByUrl('/login'); }
}
