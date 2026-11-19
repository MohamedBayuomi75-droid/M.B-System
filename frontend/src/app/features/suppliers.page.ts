import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { firstValueFrom } from 'rxjs';
import { formatMoney } from '../core/money';
import { legacyUrl } from '../core/page-routes';
import { errorMessage, SessionService } from '../core/session.service';

export interface Supplier { id: string; name: string; taxId: string; commercialReg: string; businessNature: string; openingBalance: string; openingBalanceDate: string; phone: string; email: string; address: string; bankAccount: string; iban: string; notes: string; invoicesCount: number; paymentsCount: number; attachmentsCount: number; rev: number }
const FIELDS: [keyof Supplier, string][] = [['name', 'اسم المورد *'], ['taxId', 'الرقم الضريبي'], ['commercialReg', 'السجل التجاري'], ['businessNature', 'طبيعة النشاط'], ['openingBalance', 'الرصيد الافتتاحي'], ['openingBalanceDate', 'تاريخ الرصيد الافتتاحي'], ['phone', 'الهاتف'], ['email', 'البريد'], ['address', 'العنوان'], ['bankAccount', 'الحساب البنكي'], ['iban', 'IBAN'], ['notes', 'ملاحظات']];

/** المرحلة 6.1 (تجريبي): بيانات الموردين الأساسية — الأرصدة والفواتير وكشف الحساب والحذف في الشاشة الكاملة */
@Component({
  selector: 'app-suppliers',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressBarModule],
  template: `
    <h1>الموردين <small class="muted"></small></h1>
    <mat-form-field appearance="outline" class="search"><mat-label>بحث: اسم، رقم ضريبي، سجل، هاتف، بريد</mat-label>
      <input matInput id="supSearch" [(ngModel)]="q" (ngModelChange)="load()" /></mat-form-field>
    @if (canAdd) { <button mat-flat-button id="supNew" (click)="startNew()">+ مورد جديد</button> }
    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
    @if (error()) { <div class="err" role="alert" id="supError">{{ error() }}</div> }
    <div class="split">
      <ul id="supList" class="list">
        @for (s of items(); track s.id) {
          <li [attr.data-id]="s.id" (click)="open(s)" [class.selected]="form()?.id === s.id">{{ s.name }} <small class="muted">· {{ s.invoicesCount }} فاتورة</small></li>
        } @empty { <li class="muted">لا يوجد موردون</li> }
      </ul>
      @if (form(); as f) {
        <form id="supForm" (ngSubmit)="save()">
          @for (fd of fields; track fd[0]) {
            <mat-form-field appearance="outline"><mat-label>{{ fd[1] }}</mat-label>
              <input matInput [name]="fd[0]" [attr.data-field]="fd[0]" [(ngModel)]="$any(f)[fd[0]]" [readonly]="!canSave()" [type]="fd[0] === 'openingBalanceDate' ? 'date' : 'text'" [attr.dir]="fd[0] === 'openingBalance' ? 'ltr' : null" /></mat-form-field>
          }
          @if (f.id) { <p class="muted">الرصيد الافتتاحي: <span class="num" id="supOpening">{{ money(f.openingBalance) }}</span> · <a [href]="legacy('ledger.suppliers')">الأرصدة والفواتير وكشف الحساب والحذف في الشاشة الكاملة</a></p> }
          @if (canSave()) { <button mat-flat-button type="submit" id="supSave" [disabled]="busy()">حفظ</button> }
        </form>
      }
    </div>`,
})
export class SuppliersPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  readonly items = signal<Supplier[]>([]); readonly form = signal<Partial<Supplier> | null>(null);
  readonly loading = signal(false); readonly busy = signal(false); readonly error = signal('');
  readonly fields = FIELDS; readonly canAdd = this.session.can('ledger.suppliers', 'add'); readonly canEdit = this.session.can('ledger.suppliers', 'edit');
  q = ''; money = formatMoney; legacy = legacyUrl;
  ngOnInit() { void this.load(); }
  canSave() { return this.form()?.id ? this.canEdit : this.canAdd; }
  async load() {
    this.loading.set(true); this.error.set('');
    try { this.items.set((await firstValueFrom(this.http.get<{ items: Supplier[] }>('/api/v1/suppliers', { params: new HttpParams().set('q', this.q.trim()) }))).items); }
    catch (e) { this.error.set(errorMessage(e, 'تعذر تحميل الموردين')); } finally { this.loading.set(false); }
  }
  open(s: Supplier) { this.error.set(''); this.form.set({ ...s }); }
  startNew() { this.error.set(''); this.form.set({ name: '' }); }
  async save() {
    const f = this.form(); if (!f) return;
    const body: Record<string, unknown> = {};
    for (const [k] of FIELDS) if (f[k] !== undefined && (k !== 'openingBalance' || String(f[k]).trim() !== '')) body[k] = String(f[k]);
    this.busy.set(true); this.error.set('');
    try {
      const r = f.id ? await firstValueFrom(this.http.patch<Supplier>(`/api/v1/suppliers/${f.id}`, { ...body, rev: f.rev }))
        : await firstValueFrom(this.http.post<Supplier>('/api/v1/suppliers', body));
      this.form.set({ ...r }); await this.load();
    } catch (e) { this.error.set(errorMessage(e, 'تعذر الحفظ')); } finally { this.busy.set(false); }
  }
}
