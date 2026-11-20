import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { legacyUrl } from '../core/page-routes';
import { errorMessage, SessionService } from '../core/session.service';
import { LegacyToast } from './legacy-toast';
import { ExtraField, extraForSave, moneyInput } from './suppliers.page';

export interface Contact { name: string; title: string; phone: string; email: string }
export interface CustomerCounts { projects: number; contracts: number; invoices: number; workSurveys: number; boqs: number }
export interface Customer { contacts: Contact[]; extraFields: ExtraField[]; id: string; code: string; name: string; phone: string; email: string; city: string; category: string; taxId: string; department: string; status: string; address: string; notes: string; openingBalance: string | null; rev: number; counts: CustomerCounts; issues: string[] }
type Row = Customer;
type Form = Partial<Customer>;
const PAGE_SIZE = 20; // TABLE_PAGE_SIZE في الواجهة القديمة
const CATEGORIES = ['حكومى', 'خاص'];
/** تطبيع البحث (نفس فكرة smartMatch/searchNorm): همزات/ى/ة/تشكيل وحالة الحروف — كل كلمة لازم تتلاقي */
const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').trim();
const copy = (c: Customer): Form => ({ ...c, openingBalance: c.openingBalance === null ? null : moneyInput(c.openingBalance) || '0', contacts: (c.contacts ?? []).map((k) => ({ ...k })), extraFields: (c.extraFields ?? []).map((x) => ({ ...x })) });

/**
 * العملاء — بنفس شكل الواجهة القديمة بالظبط (DEC-0093 أ): renderer/modules/clients/pages-customers.js
 * (renderClientsCustomersPage: العنوان، والكروت، والفلاتر، والجدول، والصفحات) ونافذة العميل (openCustomerModal)، بكلاسات legacy-skin.css.
 * الأعداد والملاحظات من السيرفر (counts/notes بنفس قواعد clProjectsOfCustomer وcustomerNotesIssues — tests-merge/phase64.js).
 * التفاصيل والحذف والتصدير والمرفقات: من الشاشة الكاملة القديمة لحد نقل موديولاتها.
 */
@Component({
  selector: 'app-customers',
  imports: [FormsModule],
  template: `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div><h2 class="page-title" style="margin:0;">العملاء</h2><p class="page-sub" style="margin:4px 0 0;">بيانات العملاء · الأقسام · المشاريع وأعمال الحصر والمقايسات</p></div>
        <div class="btn-row page-header-actions">
          <span class="page-export-bar" style="display:inline-flex;flex-wrap:nowrap;gap:6px;align-items:center;">
            <a class="btn btn-outline btn-sm" [href]="legacyFull" title="تصدير إكسيل (من الشاشة الكاملة)">إكسيل</a>
            <a class="btn btn-outline btn-sm" [href]="legacyFull" title="تصدير CSV (من الشاشة الكاملة)">CSV</a>
          </span>
          @if (canAdd) { <button class="btn btn-primary" id="cusNew" type="button" (click)="startNew()">+ عميل</button> }
        </div>
      </div>

      <div class="stats-row" style="margin-bottom:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;" id="cusStats">
        <div class="stat-card"><div class="num">{{ filtered().length }}</div><div class="lbl">العملاء</div></div>
        <div class="stat-card"><div class="num">{{ sum('projects') }}</div><div class="lbl">عدد المشاريع</div></div>
        <div class="stat-card"><div class="num">{{ sum('contracts') }}</div><div class="lbl">عقود</div></div>
        <div class="stat-card"><div class="num">{{ sum('invoices') }}</div><div class="lbl">مستخلصات</div></div>
        <div class="stat-card"><div class="num">{{ sum('workSurveys') }}</div><div class="lbl">أعمال الحصر</div></div>
        <div class="stat-card"><div class="num">{{ sum('boqs') }}</div><div class="lbl">المقايسات</div></div>
      </div>

      <div class="filters-bar">
        <input type="search" id="cusSearch" class="input" placeholder="بحث: اسم، كود، هاتف، قسم..." [(ngModel)]="q" (ngModelChange)="page.set(1)" />
        <select id="custDept" class="input" [(ngModel)]="dept" (ngModelChange)="page.set(1)"><option value="">كل الأقسام</option><option value="__none__">بدون قسم</option>@for (d of depts(); track d) { <option [value]="d">{{ d }}</option> }</select>
        <select id="custProject" class="input" [(ngModel)]="hasProject" (ngModelChange)="page.set(1)"><option value="">المشاريع</option><option value="has">لديه</option><option value="none">ليس لديه</option></select>
        <select id="custInvoice" class="input" [(ngModel)]="hasInvoice" (ngModelChange)="page.set(1)"><option value="">المستخلصات</option><option value="has">لديه</option><option value="none">ليس لديه</option></select>
        <select id="custSurvey" class="input" [(ngModel)]="hasSurvey" (ngModelChange)="page.set(1)"><option value="">أعمال الحصر</option><option value="has">لديه</option><option value="none">ليس لديه</option></select>
        <button type="button" class="btn btn-outline btn-sm" id="custClear" (click)="clear()">مسح الفلاتر</button>
      </div>
      @if (error() && !form()) { <div class="err" role="alert" id="cusError">{{ error() }}</div> }

      <div class="table-wrap"><table class="data-table" id="cusTable">
        <thead><tr><th>الكود</th><th>العميل</th><th>الهاتف</th><th>المدينة</th><th>القسم</th><th>مشاريع</th><th>عقود</th><th>مستخلصات</th><th>أعمال الحصر</th><th>المقايسات</th><th>ملاحظات</th><th></th></tr></thead>
        <tbody id="cusList">
          @for (c of pageRows(); track c.id) {
            <tr [attr.data-id]="c.id">
              <td style="white-space:nowrap;">{{ c.code || '—' }}</td>
              <td><strong>{{ c.name }}</strong>@if (c.category) { <div style="font-size:11px;color:var(--ink-soft);">{{ c.category }}</div> }</td>
              <td>{{ c.phone || '—' }}</td><td>{{ c.city || '—' }}</td><td>{{ c.department || '—' }}</td>
              <td>{{ c.counts.projects }}</td><td>{{ c.counts.contracts }}</td><td>{{ c.counts.invoices }}</td><td>{{ c.counts.workSurveys }}</td><td>{{ c.counts.boqs }}</td>
              <td class="notes-cell">
                @if (c.issues.length) {
                  <ul class="notes-list" [title]="c.issues.join('\\n')">@for (i of c.issues.slice(0, 3); track $index) { <li>{{ i }}</li> }@if (c.issues.length > 3) { <li class="notes-more">+{{ c.issues.length - 3 }} أخرى</li> }</ul>
                } @else { <span class="notes-ok">✓ مكتمل</span> }
              </td>
              <td style="white-space:nowrap;">
                <a class="icon-btn btn-view-cust" [href]="legacyFull" title="تفاصيل (الشاشة الكاملة)">👁️</a>
                <button type="button" class="icon-btn btn-edit-cust" [attr.data-id]="c.id" title="تعديل" (click)="open(c)">✏️</button>
                <a class="icon-btn icon-del btn-del-cust" [href]="legacyFull" title="حذف (الشاشة الكاملة)">🗑️</a>
              </td>
            </tr>
          } @empty { <tr><td colspan="12" style="text-align:center;color:var(--ink-soft);padding:28px;">لا عملاء — اضغط «+ عميل» للبدء</td></tr> }
        </tbody>
      </table></div>
      <div class="btn-row table-pager" style="justify-content:space-between;align-items:center;margin-top:10px;flex-wrap:wrap;gap:8px;">
        <span style="font-size:13px;color:var(--ink-soft);">عرض {{ filtered().length ? start() + 1 : 0 }}–{{ end() }} من {{ filtered().length }} <span style="opacity:.75;">({{ pageSize }} صف لكل صفحة)</span></span>
        <div style="display:flex;gap:8px;align-items:center;">
          <button type="button" class="btn btn-outline btn-sm" [disabled]="page() <= 1" (click)="page.set(page() - 1)">السابق</button>
          <span style="font-size:13px;font-weight:700;">صفحة {{ page() }} / {{ pages() }}</span>
          <button type="button" class="btn btn-outline btn-sm" [disabled]="page() >= pages()" (click)="page.set(page() + 1)">التالي</button>
        </div>
      </div>
    </div>

    @if (form(); as f) {
      <div class="modal-overlay" id="appModal" (click)="$event.target === $event.currentTarget && close()">
        <div class="modal modal-wide">
          <form id="cusForm" (ngSubmit)="save()">
            <div class="modal-header">
              <h3>{{ f.id ? 'تعديل عميل' : 'عميل جديد' }}</h3>
              <button type="button" class="modal-close" (click)="close()">×</button>
            </div>
            <div class="modal-body">
              <div class="form-grid form-grid-2">
                <label>الكود<input class="input" name="code" data-field="code" placeholder="تلقائي" [(ngModel)]="f.code" [readonly]="!canSave()" /></label>
                <label>الاسم *<input class="input" name="name" data-field="name" [(ngModel)]="f.name" [readonly]="!canSave()" /></label>
                <label>الهاتف<input class="input" name="phone" data-field="phone" [(ngModel)]="f.phone" [readonly]="!canSave()" /></label>
                <label>البريد<input class="input" name="email" data-field="email" [(ngModel)]="f.email" [readonly]="!canSave()" /></label>
                <label>المدينة<input class="input" name="city" data-field="city" [(ngModel)]="f.city" [readonly]="!canSave()" /></label>
                <label>التصنيف<select class="input" name="category" data-field="category" [(ngModel)]="f.category" [disabled]="!canSave()"><option value="">— اختر —</option>@for (o of categoryOpts(f); track o) { <option [value]="o">{{ o }}</option> }</select></label>
                <label>الرقم الضريبي<input class="input" name="taxId" data-field="taxId" [(ngModel)]="f.taxId" [readonly]="!canSave()" /></label>
                <label>القسم
                  @if (newDept()) { <input class="input" name="department" data-field="department" placeholder="اكتب اسم القسم الجديد" [(ngModel)]="f.department" /> }
                  @else { <select class="input" name="department" data-field="department" [ngModel]="f.department" (ngModelChange)="pickDept(f, $event)" [disabled]="!canSave()"><option value="">— اختر القسم —</option>@for (d of deptOpts(f); track d) { <option [value]="d">{{ d }}</option> }<option value="__new__">➕ قسم جديد…</option></select> }
                </label>
                @if (f.openingBalance !== null) { <label>رصيد افتتاحي (ج.م)<input class="input" name="openingBalance" data-field="openingBalance" dir="ltr" inputmode="decimal" [(ngModel)]="f.openingBalance" [readonly]="!canSave()" /></label> }
                <label style="grid-column:1/-1;">العنوان<input class="input" name="address" data-field="address" [(ngModel)]="f.address" [readonly]="!canSave()" /></label>
                <div id="cuContactsWrap" style="grid-column:1/-1;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <strong>جهات الاتصال</strong>
                    @if (canSave()) { <button type="button" class="btn btn-sm" id="cusAddContact" style="background:#1B4332;color:#fff;border-color:#1B4332;" (click)="(f.contacts = f.contacts ?? []).push({ name: '', title: '', phone: '', email: '' })">+ جهة اتصال</button> }
                  </div>
                  <div id="cusContacts">
                    @for (k of f.contacts ?? []; track $index; let i = $index) {
                      <div class="form-grid form-grid-2" style="border:1px solid var(--line);border-radius:8px;padding:8px;margin-bottom:8px;" [attr.data-contact]="i">
                        <label>الاسم<input class="input ct-name" [name]="'cn' + i" [(ngModel)]="k.name" [readonly]="!canSave()" /></label>
                        <label>المسمى<input class="input ct-title" [name]="'ct' + i" [(ngModel)]="k.title" [readonly]="!canSave()" /></label>
                        <label>الهاتف<input class="input ct-phone" [name]="'cp' + i" [(ngModel)]="k.phone" [readonly]="!canSave()" /></label>
                        <label>البريد<input class="input ct-email" [name]="'ce' + i" [(ngModel)]="k.email" [readonly]="!canSave()" /></label>
                        @if (canSave()) { <div style="grid-column:1/-1;text-align:left;"><button type="button" class="btn btn-outline btn-sm ct-remove" (click)="f.contacts!.splice(i, 1)">حذف جهة الاتصال</button></div> }
                      </div>
                    } @empty { <div style="color:var(--ink-soft);font-size:13px;">لا جهات اتصال — أضف من الزر بالأسفل</div> }
                  </div>
                </div>
                <label style="grid-column:1/-1;">ملاحظات<textarea class="input" name="notes" data-field="notes" rows="2" [(ngModel)]="f.notes" [readonly]="!canSave()"></textarea></label>
                <div id="cusExtra" style="display:contents;">
                  @for (x of f.extraFields ?? []; track $index; let i = $index) {
                    <label [attr.data-extra]="i">{{ x.label || 'خانة' }}<input class="input ef-value" [name]="'xv' + i" [(ngModel)]="x.value" [readonly]="!canSave()" /></label>
                  }
                </div>
                @if (f.id) { <p class="page-sub" id="cusStatus" style="grid-column:1/-1;margin:0;">الحالة: {{ statusLabel(f.status) }} · المرفقات من <a [href]="legacyFull">الشاشة الكاملة</a></p> }
              </div>
              @if (error()) { <div class="err" role="alert" id="cusError">{{ error() }}</div> }
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" type="button" (click)="close()">إلغاء</button>
              @if (canSave()) { <button class="btn btn-primary" type="submit" id="cusSave" [disabled]="busy()">حفظ</button> }
            </div>
          </form>
        </div>
      </div>
    }`,
})
export class CustomersPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly toast = new LegacyToast();
  readonly items = signal<Row[]>([]); readonly form = signal<Form | null>(null);
  readonly busy = signal(false); readonly error = signal(''); readonly newDept = signal(false);
  readonly page = signal(1); readonly pageSize = PAGE_SIZE;
  readonly canAdd = this.session.can('clients.customers', 'add'); readonly canEdit = this.session.can('clients.customers', 'edit');
  readonly legacyFull = legacyUrl('clients.customers');
  q = ''; dept = ''; hasProject = ''; hasInvoice = ''; hasSurvey = '';
  private readonly tick = signal(0); // الفلاتر بـ ngModel (مش signals) — بنحدّث الحساب مع أي تغيير صفحة/فلتر

  readonly depts = computed(() => [...new Set(this.items().map((c) => (c.department || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar')));
  /** نفس فلاتر renderClientsCustomersPage: البحث في الاسم والكود والهاتف والبريد والعنوان والمدينة والرقم الضريبي والتصنيف والقسم والملاحظات */
  readonly filtered = computed(() => {
    this.page(); this.tick();
    const tokens = norm(this.q).split(/\s+/).filter(Boolean);
    const has = (f: string, n: number) => !f || (f === 'has' ? n > 0 : n === 0);
    return this.items().filter((c) => {
      if (tokens.length) { const hay = norm([c.name, c.code, c.phone, c.email, c.address, c.city, c.taxId, c.category, c.department, c.notes].join(' ')); if (!tokens.every((t) => hay.includes(t))) return false; }
      if (this.dept && (this.dept === '__none__' ? !!(c.department || '').trim() : (c.department || '').trim() !== this.dept)) return false;
      return has(this.hasSurvey, c.counts.workSurveys) && has(this.hasProject, c.counts.projects) && has(this.hasInvoice, c.counts.invoices);
    });
  });
  readonly pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));
  readonly start = computed(() => (Math.min(this.page(), this.pages()) - 1) * PAGE_SIZE);
  readonly end = computed(() => Math.min(this.start() + PAGE_SIZE, this.filtered().length));
  readonly pageRows = computed(() => this.filtered().slice(this.start(), this.end()));
  sum(k: keyof CustomerCounts) { return this.filtered().reduce((s, c) => s + c.counts[k], 0); }

  ngOnInit() { void this.load(); }
  canSave() { return this.form()?.id ? this.canEdit : this.canAdd; }
  async load() {
    try {
      const r = await firstValueFrom(this.http.get<{ items: Customer[] }>('/api/v1/customers'));
      this.items.set(r.items.map((c) => ({ ...c, issues: c.issues ?? [], counts: c.counts ?? { projects: 0, contracts: 0, invoices: 0, workSurveys: 0, boqs: 0 } })));
      this.tick.update((n) => n + 1);
    } catch (e) { this.error.set(errorMessage(e, 'تعذر تحميل العملاء')); }
  }
  clear() { this.q = ''; this.dept = ''; this.hasProject = ''; this.hasInvoice = ''; this.hasSurvey = ''; this.page.set(1); this.tick.update((n) => n + 1); }
  open(c: Row) { this.error.set(''); this.newDept.set(false); this.form.set(copy(c)); }
  startNew() { this.error.set(''); this.newDept.set(false); this.form.set({ name: '', code: '', category: '', department: '', contacts: [], extraFields: [], openingBalance: '0' }); }
  close() { this.form.set(null); this.error.set(''); }
  categoryOpts(f: Form) { const cur = f.category || ''; return cur && !CATEGORIES.includes(cur) ? [...CATEGORIES, cur] : CATEGORIES; }
  deptOpts(f: Form) { const cur = (f.department || '').trim(); const ds = this.depts(); return cur && !ds.includes(cur) ? [...ds, cur] : ds; }
  pickDept(f: Form, v: string) { if (v === '__new__') { f.department = ''; this.newDept.set(true); } else f.department = v; }
  /** حالة العميل: الواجهة القديمة بتحفظها بس (افتراضي active) ومالهاش خانة — LEGACY-PRESERVE */
  statusLabel(s: string | undefined) { return !s || s === 'active' ? 'نشط' : s; }
  async save() {
    const f = this.form(); if (!f) return;
    const b: Record<string, unknown> = {};
    for (const k of ['code', 'name', 'phone', 'email', 'city', 'category', 'taxId', 'department', 'address', 'notes'] as const) if (f[k] !== undefined) b[k] = String(f[k] ?? '').trim();
    if (f.openingBalance != null) b['openingBalance'] = String(f.openingBalance).trim().replace(/[,،٬]/g, '') || '0';
    if (f.contacts) b['contacts'] = f.contacts.filter((k) => k.name.trim());
    if (f.extraFields) b['extraFields'] = extraForSave(f.extraFields);
    this.busy.set(true); this.error.set('');
    try {
      if (f.id) await firstValueFrom(this.http.patch(`/api/v1/customers/${f.id}`, { ...b, rev: f.rev }));
      else await firstValueFrom(this.http.post('/api/v1/customers', b));
      this.form.set(null); await this.load(); this.toast.show(f.id ? 'تم حفظ العميل' : 'تمت إضافة العميل');
    } catch (e) { this.error.set(errorMessage(e, 'تعذر الحفظ')); } finally { this.busy.set(false); }
  }
}
