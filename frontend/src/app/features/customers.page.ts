import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { firstValueFrom } from 'rxjs';
import { legacyUrl } from '../core/page-routes';
import { errorMessage, SessionService } from '../core/session.service';
import { ExtraField, extraForSave } from './suppliers.page';

export interface Contact { name: string; title: string; phone: string; email: string }
export interface Customer { contacts: Contact[]; extraFields: ExtraField[]; id: string; code: string; name: string; phone: string; email: string; city: string; category: string; taxId: string; department: string; status: string; address: string; notes: string; openingBalance: string | null; rev: number }
const FIELDS: [keyof Customer, string][] = [['name', 'اسم العميل *'], ['code', 'الكود (فاضي = تلقائي)'], ['phone', 'الهاتف'], ['email', 'البريد'], ['city', 'المدينة'], ['category', 'التصنيف'], ['taxId', 'الرقم الضريبي'], ['department', 'القسم'], ['address', 'العنوان'], ['notes', 'ملاحظات']];

const copy = (c: Customer): Partial<Customer> => ({ ...c, contacts: (c.contacts ?? []).map((k) => ({ ...k })), extraFields: (c.extraFields ?? []).map((x) => ({ ...x })) });
/** المرحلة 6.1 (تجريبي): بيانات العملاء الأساسية. الرصيد الافتتاحي بيظهر لأصحاب صفحات الحسابات بس (حارس الحقول) */
@Component({
  selector: 'app-customers',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressBarModule],
  template: `
    <h1>العملاء <small class="muted"></small></h1>
    <mat-form-field appearance="outline" class="search"><mat-label>بحث: اسم، كود، هاتف، مدينة</mat-label>
      <input matInput id="cusSearch" [(ngModel)]="q" (ngModelChange)="load()" /></mat-form-field>
    @if (canAdd) { <button mat-flat-button id="cusNew" (click)="startNew()">+ عميل جديد</button> }
    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
    @if (error()) { <div class="err" role="alert" id="cusError">{{ error() }}</div> }
    <div class="split">
      <ul id="cusList" class="list">
        @for (c of items(); track c.id) { <li [attr.data-id]="c.id" (click)="open(c)" [class.selected]="form()?.id === c.id">{{ c.code }} · {{ c.name }}</li> } @empty { <li class="muted">لا يوجد عملاء</li> }
      </ul>
      @if (form(); as f) {
        <form id="cusForm" (ngSubmit)="save()">
          @for (fd of fields; track fd[0]) {
            <mat-form-field appearance="outline"><mat-label>{{ fd[1] }}</mat-label>
              <input matInput [name]="fd[0]" [attr.data-field]="fd[0]" [(ngModel)]="$any(f)[fd[0]]" [readonly]="!canSave()" /></mat-form-field>
          }
          @if (f.openingBalance !== null) {
            <mat-form-field appearance="outline"><mat-label>الرصيد الافتتاحي (حتى خانتين)</mat-label>
              <input matInput name="openingBalance" data-field="openingBalance" dir="ltr" [(ngModel)]="f.openingBalance" [readonly]="!canSave()" /></mat-form-field>
          }
          @if (f.id) { <p class="muted" id="cusStatus">الحالة: {{ statusLabel(f.status) }} <small>(زي الشاشة الكاملة: بتتحفظ زي ما هي ومالهاش خانة تعديل)</small></p> }
          <h3>خانات مخصصة</h3>
          <div id="cusExtra">
            @for (x of f.extraFields ?? []; track $index; let i = $index) {
              <div class="kv-row" [attr.data-extra]="i">
                <mat-form-field appearance="outline"><mat-label>اسم الخانة</mat-label><input matInput [name]="'xl' + i" [(ngModel)]="x.label" [readonly]="!canSave()" /></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>القيمة</mat-label><input matInput [name]="'xv' + i" [(ngModel)]="x.value" [readonly]="!canSave()" /></mat-form-field>
                @if (canSave()) { <button mat-button type="button" (click)="f.extraFields!.splice(i, 1)" aria-label="حذف الخانة">✕</button> }
              </div>
            }
            @if (canSave()) { <button mat-button type="button" id="cusAddExtra" (click)="(f.extraFields = f.extraFields ?? []).push({ label: '', value: '' })">+ خانة مخصصة</button> }
          </div>
          <h3>جهات الاتصال</h3>
          <div id="cusContacts">
            @for (k of f.contacts ?? []; track $index; let i = $index) {
              <div class="kv-row" [attr.data-contact]="i">
                <mat-form-field appearance="outline"><mat-label>الاسم</mat-label><input matInput [name]="'cn' + i" [(ngModel)]="k.name" [readonly]="!canSave()" /></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>المسمى</mat-label><input matInput [name]="'ct' + i" [(ngModel)]="k.title" [readonly]="!canSave()" /></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>الهاتف</mat-label><input matInput [name]="'cp' + i" [(ngModel)]="k.phone" [readonly]="!canSave()" /></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>البريد</mat-label><input matInput [name]="'ce' + i" [(ngModel)]="k.email" [readonly]="!canSave()" /></mat-form-field>
                @if (canSave()) { <button mat-button type="button" (click)="f.contacts!.splice(i, 1)">✕</button> }
              </div>
            }
            @if (canSave()) { <button mat-button type="button" id="cusAddContact" (click)="(f.contacts = f.contacts ?? []).push({ name: '', title: '', phone: '', email: '' })">+ جهة اتصال</button> }
          </div>
          <p class="muted"><a [href]="legacy('clients.customers')">العقود والمستخلصات والحذف في الشاشة الكاملة</a></p>
          @if (canSave()) { <button mat-flat-button type="submit" id="cusSave" [disabled]="busy()">حفظ</button> }
        </form>
      }
    </div>`,
})
export class CustomersPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  readonly items = signal<Customer[]>([]); readonly form = signal<Partial<Customer> | null>(null);
  readonly loading = signal(false); readonly busy = signal(false); readonly error = signal('');
  readonly fields = FIELDS; readonly canAdd = this.session.can('clients.customers', 'add'); readonly canEdit = this.session.can('clients.customers', 'edit');
  q = ''; legacy = legacyUrl;
  ngOnInit() { void this.load(); }
  canSave() { return this.form()?.id ? this.canEdit : this.canAdd; }
  open(c: Customer) { this.error.set(''); this.form.set(copy(c)); }
  startNew() { this.error.set(''); this.form.set({ name: '', contacts: [], extraFields: [] }); }
  /** حالة العميل: الواجهة القديمة بتحفظها بس (افتراضي active) ومالهاش خانة — LEGACY-PRESERVE */
  statusLabel(s: string | undefined) { return !s || s === 'active' ? 'نشط' : s; }
  async load() {
    this.loading.set(true); this.error.set('');
    try { this.items.set((await firstValueFrom(this.http.get<{ items: Customer[] }>('/api/v1/customers', { params: new HttpParams().set('q', this.q.trim()) }))).items); }
    catch (e) { this.error.set(errorMessage(e, 'تعذر تحميل العملاء')); } finally { this.loading.set(false); }
  }
  async save() {
    const f = this.form(); if (!f) return;
    const body: Record<string, unknown> = {};
    for (const [k] of FIELDS) if (f[k] !== undefined) body[k] = String(f[k]);
    if (f.openingBalance != null && String(f.openingBalance).trim() !== '') body['openingBalance'] = String(f.openingBalance).trim();
    if (f.contacts) body['contacts'] = f.contacts.filter((k) => k.name.trim());
    if (f.extraFields) body['extraFields'] = extraForSave(f.extraFields);
    this.busy.set(true); this.error.set('');
    try {
      const r = f.id ? await firstValueFrom(this.http.patch<Customer>(`/api/v1/customers/${f.id}`, { ...body, rev: f.rev }))
        : await firstValueFrom(this.http.post<Customer>('/api/v1/customers', body));
      this.form.set(copy(r)); await this.load();
    } catch (e) { this.error.set(errorMessage(e, 'تعذر الحفظ')); } finally { this.busy.set(false); }
  }
}
