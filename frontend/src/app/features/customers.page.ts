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

export interface Contact { name: string; title: string; phone: string; email: string }
export interface Customer { contacts: Contact[]; id: string; code: string; name: string; phone: string; email: string; city: string; category: string; taxId: string; department: string; status: string; address: string; notes: string; openingBalance: string | null; rev: number }
const FIELDS: [keyof Customer, string][] = [['name', 'اسم العميل *'], ['code', 'الكود (فاضي = تلقائي)'], ['phone', 'الهاتف'], ['email', 'البريد'], ['city', 'المدينة'], ['category', 'التصنيف'], ['taxId', 'الرقم الضريبي'], ['department', 'القسم'], ['address', 'العنوان'], ['notes', 'ملاحظات']];

/** المرحلة 6.1 (تجريبي): بيانات العملاء الأساسية. الرصيد الافتتاحي بيظهر لأصحاب صفحات الحسابات بس (حارس الحقول) */
@Component({
  selector: 'app-customers',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressBarModule],
  template: `
    <h1>العملاء <small class="muted"></small></h1>
    <mat-form-field appearance="outline" class="search"><mat-label>بحث: اسم، كود، هاتف، مدينة</mat-label>
      <input matInput id="cusSearch" [(ngModel)]="q" (ngModelChange)="load()" /></mat-form-field>
    @if (canAdd) { <button mat-flat-button id="cusNew" (click)="form.set({ name: '', contacts: [] })">+ عميل جديد</button> }
    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
    @if (error()) { <div class="err" role="alert" id="cusError">{{ error() }}</div> }
    <div class="split">
      <ul id="cusList" class="list">
        @for (c of items(); track c.id) { <li [attr.data-id]="c.id" (click)="form.set({ ...c, contacts: c.contacts.map((k) => ({ ...k })) })">{{ c.code }} · {{ c.name }}</li> } @empty { <li class="muted">لا يوجد عملاء</li> }
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
          <h3>جهات الاتصال</h3>
          <div id="cusContacts">
            @for (k of f.contacts ?? []; track $index; let i = $index) {
              <div class="row" [attr.data-contact]="i">
                <input matInput placeholder="الاسم" [name]="'cn' + i" [(ngModel)]="k.name" [readonly]="!canSave()" />
                <input matInput placeholder="المسمى" [name]="'ct' + i" [(ngModel)]="k.title" [readonly]="!canSave()" />
                <input matInput placeholder="الهاتف" [name]="'cp' + i" [(ngModel)]="k.phone" [readonly]="!canSave()" />
                <input matInput placeholder="البريد" [name]="'ce' + i" [(ngModel)]="k.email" [readonly]="!canSave()" />
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
    this.busy.set(true); this.error.set('');
    try {
      const r = f.id ? await firstValueFrom(this.http.patch<Customer>(`/api/v1/customers/${f.id}`, { ...body, rev: f.rev }))
        : await firstValueFrom(this.http.post<Customer>('/api/v1/customers', body));
      this.form.set({ ...r, contacts: r.contacts.map((k) => ({ ...k })) }); await this.load();
    } catch (e) { this.error.set(errorMessage(e, 'تعذر الحفظ')); } finally { this.busy.set(false); }
  }
}
