import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { legacyUrl } from '../core/page-routes';
import { errorMessage, SessionService } from '../core/session.service';
import { LegacyToast } from './legacy-toast';

export interface ExtraField { label: string; value: string }
export interface Supplier { extraFields: ExtraField[]; id: string; name: string; taxId: string; commercialReg: string; businessNature: string; openingBalance: string; openingBalanceDate: string; phone: string; email: string; address: string; bankAccount: string; iban: string; notes: string; invoicesCount: number; paymentsCount: number; attachmentsCount: number; rev: number }
type Form = Partial<Supplier>;
const TEXT: (keyof Supplier)[] = ['name', 'taxId', 'commercialReg', 'businessNature', 'openingBalanceDate', 'phone', 'email', 'address', 'bankAccount', 'iban', 'notes'];

/** الخانات المخصصة زي الواجهة القديمة (ledger/helpers.js collectExtraFields): الخانة الفاضية القيمة مابتتحفظش، والاسم الفاضي = «خانة» */
export const extraForSave = (xs: ExtraField[]) => xs.map((x) => ({ label: x.label.trim() || 'خانة', value: x.value.trim() })).filter((x) => x.value);
/** المبلغ من السيرفر (نص 4 خانات) ← خانة الإدخال: الصفر فاضي زي الواجهة القديمة، ومن غير أصفار زيادة */
export const moneyInput = (v: string | null | undefined) => { const s = String(v ?? '').trim(); if (!s || /^-?0+(\.0+)?$/.test(s)) return ''; return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s; };
const copy = (s: Supplier): Form => ({ ...s, openingBalance: moneyInput(s.openingBalance), extraFields: (s.extraFields ?? []).map((x) => ({ ...x })) });

/**
 * الموردين — بنفس شكل الواجهة القديمة بالظبط (DEC-0093 أ): renderer/modules/ledger/pages-suppliers.js (renderSuppliersPage،
 * renderSupplierMain، renderInfoTab) ونافذة «إضافة مورد جديد» (modals.js:9)، بنفس الكلاسات من legacy-skin.css.
 * الرصيد وفلتره وترتيبه، والفواتير والدفعات وكشف الحساب، والتصدير والحذف والمرفقات: متأجلين لموديولاتهم (S3، S6، S7، S8)
 * ومكانهم ظاهر وبيفتح الشاشة الكاملة القديمة.
 */
@Component({
  selector: 'app-suppliers',
  imports: [FormsModule],
  template: `
    <div class="layout">
      <div class="sidebar">
        <div class="sidebar-head">
          <h3>الموردون</h3>
          <input class="search-box" id="supSearch" placeholder="اسم، رقم ضريبي، سجل، هاتف، بريد..." autocomplete="off" [(ngModel)]="q" (ngModelChange)="load()" />
          <div style="display:flex;gap:6px;margin-top:8px;">
            <select style="flex:1;min-width:0;font-size:12px;padding:5px 6px;" disabled title="فلتر الرصيد في الشاشة الكاملة (مع موديول الفواتير)"><option>كل الأرصدة</option></select>
            <select style="flex:1;min-width:0;font-size:12px;padding:5px 6px;" disabled title="الترتيب بالرصيد وآخر نشاط في الشاشة الكاملة"><option>بالاسم</option></select>
          </div>
          <div id="supListCount" style="font-size:11.5px;color:var(--ink-soft);margin-top:6px;">{{ countText() }}</div>
        </div>
        @if (canAdd) { <button class="add-supplier-btn" id="supNew" (click)="startNew()">+ إضافة مورد جديد</button> }
        <a class="btn btn-outline btn-sm" [href]="legacyFull" style="width:100%;margin-top:6px;justify-content:center;" title="التصدير من الشاشة الكاملة">تصدير الموردين (الظاهرين) Excel</a>
        <div id="supplierListWrap">
          @if (items().length) {
            <ul class="supplier-list" id="supList">
              @for (s of items(); track s.id) {
                <li class="supplier-item" [class.active]="s.id === activeId()" [attr.data-id]="s.id" (click)="open(s)">
                  <span class="s-name">{{ s.name }}</span>
                  <span class="s-balance zero" title="عدد الفواتير — الرصيد في الشاشة الكاملة">{{ s.invoicesCount }} فاتورة</span>
                </li>
              }
            </ul>
          } @else { <div class="empty-side" id="supList">{{ all() === 0 ? 'لا يوجد موردون بعد' : 'لا توجد نتائج — عدّل البحث أو الفلتر' }}</div> }
        </div>
      </div>
      <div class="main-panel" id="mainPanel">
        @if (error() && !adding()) { <div class="err" role="alert" id="supError">{{ error() }}</div> }
        @if (form(); as f) {
          <div class="supplier-header">
            <div>
              <h2>{{ f.name }}</h2>
              <div class="meta">
                @if (f.taxId) { <span>🧾 ر.ض: {{ f.taxId }}</span> }
                @if (f.phone) { <span>📞 {{ f.phone }}</span> }
                @if (f.email) { <span>✉️ {{ f.email }}</span> }
                @if (f.businessNature) { <span class="pill">{{ f.businessNature }}</span> }
              </div>
            </div>
            <div class="balance-box"><div class="lbl">الرصيد</div><div class="val zero"><a [href]="legacyFull" style="font-size:13px;">في الشاشة الكاملة</a></div></div>
            <div class="btn-row no-print">
              <a class="btn btn-outline btn-sm" [href]="legacyFull">حفظ PDF لكشف الحساب</a>
              <a class="btn btn-outline btn-sm" [href]="legacyFull">تصدير Excel</a>
              <a class="btn btn-primary btn-sm" [href]="legacyFull">تصدير إشعارات الخصم PDF</a>
            </div>
          </div>
          <div class="tabs">
            <button class="tab-btn active" type="button">البيانات</button>
            <a class="tab-btn" [href]="legacyFull">الفواتير</a>
            <a class="tab-btn" [href]="legacyFull">الدفعات</a>
            <a class="tab-btn" [href]="legacyFull">كشف الحساب</a>
          </div>
          <form id="supForm" (ngSubmit)="save()">
            <div class="info-grid">
              <div class="info-field"><label>اسم المورد *</label><input name="name" data-field="name" [(ngModel)]="f.name" [readonly]="!canEdit" /></div>
              <div class="info-field"><label>الرقم الضريبي</label><input name="taxId" data-field="taxId" [(ngModel)]="f.taxId" [readonly]="!canEdit" /></div>
              <div class="info-field"><label>السجل التجاري</label><input name="commercialReg" data-field="commercialReg" [(ngModel)]="f.commercialReg" [readonly]="!canEdit" /></div>
              <div class="info-field"><label>طبيعة نشاط المورد</label><input name="businessNature" data-field="businessNature" [(ngModel)]="f.businessNature" placeholder="مثال: حديد، دهانات..." [readonly]="!canEdit" /></div>
              <div class="info-field"><label>الرصيد الافتتاحي</label><input name="openingBalance" data-field="openingBalance" inputmode="decimal" dir="ltr" autocomplete="off" style="text-align:right;" placeholder="٠" [(ngModel)]="f.openingBalance" [readonly]="!canEdit" /></div>
              <div class="info-field"><label>تاريخ الرصيد الافتتاحي</label><input name="openingBalanceDate" data-field="openingBalanceDate" type="date" [(ngModel)]="f.openingBalanceDate" [readonly]="!canEdit" /></div>
              <div class="info-field"><label>رقم الهاتف</label><input name="phone" data-field="phone" [(ngModel)]="f.phone" [readonly]="!canEdit" /></div>
              <div class="info-field"><label>البريد الإلكتروني</label><input name="email" data-field="email" type="email" [(ngModel)]="f.email" [readonly]="!canEdit" /></div>
              <div class="info-field"><label>العنوان</label><input name="address" data-field="address" [(ngModel)]="f.address" [readonly]="!canEdit" /></div>
              <div class="info-field"><label>رقم الحساب البنكي</label><input name="bankAccount" data-field="bankAccount" [(ngModel)]="f.bankAccount" [readonly]="!canEdit" /></div>
              <div class="info-field"><label>IBAN</label><input name="iban" data-field="iban" placeholder="EG..." [(ngModel)]="f.iban" [readonly]="!canEdit" /></div>
              <div class="info-field" style="grid-column:1/-1;"><label>ملاحظات</label><textarea name="notes" data-field="notes" [(ngModel)]="f.notes" [readonly]="!canEdit"></textarea></div>
              <div class="info-field" style="grid-column:1/-1;">
                <label>مستندات المورد ({{ f.attachmentsCount ?? 0 }})</label>
                <p style="font-size:11.5px;color:var(--ink-soft);margin:6px 0 0;">المستندات بتترفع وتتعرض من <a [href]="legacyFull">الشاشة الكاملة</a> (لوحة المرفقات).</p>
              </div>
            </div>
            <div style="margin-top:14px;">
              <div id="supExtra">
                @for (x of f.extraFields ?? []; track $index; let i = $index) {
                  <div class="field extra-field-row" style="position:relative;" [attr.data-extra]="i">
                    <label>{{ x.label || 'خانة' }} @if (canEdit) { <span class="ef-remove" title="حذف الخانة" style="cursor:pointer;color:var(--debt);font-weight:900;" (click)="f.extraFields!.splice(i, 1)">✕</span> }</label>
                    <input class="ef-value" [name]="'xv' + i" [(ngModel)]="x.value" [readonly]="!canEdit" />
                  </div>
                }
              </div>
              @if (canEdit) { <div class="btn-row no-print" style="margin-top:8px;"><button class="btn btn-outline btn-sm" id="supAddExtra" type="button" (click)="promptField(f)">+ إضافة خانة مخصصة أخرى</button></div> }
            </div>
            @if (canEdit) { <div style="margin-top:16px;"><button class="btn btn-gold" type="submit" id="supSave" [disabled]="busy()">حفظ البيانات</button></div> }
          </form>
        } @else {
          <div class="welcome">
            <div class="big-mark">دفتر</div>
            <h3>اختر مورداً من القائمة أو أضِف مورداً جديداً</h3>
            <div>سجّل بيانات كل مورد، فواتيره، ودفعاته من هنا</div>
          </div>
        }
      </div>
    </div>

    @if (adding(); as m) {
      <div class="modal-overlay" id="modalOverlay" (click)="onOverlay($event)">
        <div class="modal wide">
          <h3>إضافة مورد جديد</h3>
          <form id="supNewForm" (ngSubmit)="create()">
            <div class="field"><label>اسم المورد *</label><input name="m_name" id="m_name" data-field="name" [(ngModel)]="m.name" /></div>
            <div class="field"><label>الرقم الضريبي</label><input name="m_taxid" data-field="taxId" [(ngModel)]="m.taxId" /></div>
            <div class="field"><label>السجل التجاري</label><input name="m_commreg" data-field="commercialReg" [(ngModel)]="m.commercialReg" /></div>
            <div class="field"><label>طبيعة نشاط المورد</label><div class="ss-cell"><input name="m_businessNature" data-field="businessNature" placeholder="اكتب أو اختر طبيعة النشاط..." autocomplete="off" [(ngModel)]="m.businessNature" /></div></div>
            <div class="form-grid">
              <div class="field"><label>الرصيد الافتتاحي</label><input name="m_openingBalance" data-field="openingBalance" inputmode="decimal" dir="ltr" autocomplete="off" style="text-align:right;" placeholder="٠" [(ngModel)]="m.openingBalance" /></div>
              <div class="field"><label>تاريخ الرصيد الافتتاحي</label><input name="m_openingBalanceDate" data-field="openingBalanceDate" type="date" [(ngModel)]="m.openingBalanceDate" /></div>
            </div>
            @if (showExtra()) {
              <div id="m_extraFieldsWrap">
                <div class="field"><label>رقم الهاتف</label><input name="m_phone" data-field="phone" [(ngModel)]="m.phone" /></div>
                <div class="field"><label>البريد الإلكتروني</label><input name="m_email" data-field="email" type="email" [(ngModel)]="m.email" /></div>
                <div class="field"><label>العنوان</label><input name="m_address" data-field="address" [(ngModel)]="m.address" /></div>
                <div class="field"><label>رقم الحساب البنكي</label><input name="m_bankAccount" data-field="bankAccount" [(ngModel)]="m.bankAccount" /></div>
                <div class="field"><label>IBAN</label><input name="m_iban" data-field="iban" placeholder="EG..." [(ngModel)]="m.iban" /></div>
                <div id="m_customFieldsWrap" style="margin-top:4px;">
                  @for (x of m.extraFields ?? []; track $index; let i = $index) {
                    <div class="field extra-field-row" style="position:relative;" [attr.data-extra]="i">
                      <label>{{ x.label || 'خانة' }} <span class="ef-remove" title="حذف الخانة" style="cursor:pointer;color:var(--debt);font-weight:900;" (click)="m.extraFields!.splice(i, 1)">✕</span></label>
                      <input class="ef-value" [name]="'mxv' + i" [(ngModel)]="x.value" />
                    </div>
                  }
                </div>
                <div class="btn-row no-print" style="margin-top:6px;"><button class="btn btn-outline btn-sm" id="m_addCustomFieldBtn" type="button" (click)="promptField(m)">+ إضافة خانة مخصصة أخرى</button></div>
              </div>
            } @else {
              <div class="btn-row no-print" id="m_addFieldRow" style="margin:6px 0 4px;">
                <button class="btn btn-outline btn-sm" id="m_showExtraFields" type="button" (click)="showExtra.set(true)">+ إضافة خانة (هاتف / إيميل / عنوان / حساب بنكي / IBAN)</button>
              </div>
            }
            <div class="field" style="margin-top:12px;">
              <label>المرفقات (مسح ضوئي / كاميرا)</label>
              <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:8px;">بعد الإضافة، المرفقات بتترفع من الشاشة الكاملة</div>
            </div>
            @if (error()) { <div class="err" role="alert" id="supError">{{ error() }}</div> }
            <div class="modal-actions">
              <button class="btn btn-outline" type="button" id="m_cancel" (click)="adding.set(null)">إلغاء</button>
              <button class="btn btn-primary" type="submit" id="m_save" [disabled]="busy()">إضافة</button>
            </div>
          </form>
        </div>
      </div>
    }

    @if (prompt(); as p) {
      <div class="modal-overlay" id="efPromptOverlay">
        <div class="modal" style="max-width:360px;">
          <h3>اسم الخانة الجديدة</h3>
          <div class="field"><label>اسم الخانة</label><input id="efPromptInput" placeholder="مثال: رقم الشيك" [(ngModel)]="p.label" (keydown.enter)="addField()" /></div>
          <div class="modal-actions">
            <button class="btn btn-outline" type="button" id="efPromptCancel" (click)="prompt.set(null)">إلغاء</button>
            <button class="btn btn-primary" type="button" id="efPromptOk" (click)="addField()">إضافة</button>
          </div>
        </div>
      </div>
    }`,
})
export class SuppliersPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly toast = new LegacyToast();
  readonly items = signal<Supplier[]>([]); readonly all = signal(0);
  readonly form = signal<Form | null>(null); readonly adding = signal<Form | null>(null);
  readonly showExtra = signal(false); readonly prompt = signal<{ target: Form; label: string } | null>(null);
  readonly busy = signal(false); readonly error = signal('');
  readonly activeId = computed(() => this.form()?.id ?? null);
  readonly countText = computed(() => (this.items().length === this.all() ? `${this.all()} مورد` : `${this.items().length} من ${this.all()} مورد`));
  readonly canAdd = this.session.can('ledger.suppliers', 'add'); readonly canEdit = this.session.can('ledger.suppliers', 'edit');
  readonly legacyFull = legacyUrl('ledger.suppliers');
  q = '';
  ngOnInit() { void this.load(); }
  async load() {
    try {
      const r = await firstValueFrom(this.http.get<{ items: Supplier[]; all: number }>('/api/v1/suppliers', { params: new HttpParams().set('q', this.q.trim()) }));
      this.items.set(r.items); this.all.set(r.all);
    } catch (e) { this.error.set(errorMessage(e, 'تعذر تحميل الموردين')); }
  }
  /** إغلاق النافذة بالضغط على الخلفية بس (زي القديمة). مابيرجّعش قيمة: Angular بيلغي الحدث (preventDefault) لو المعالج رجّع false */
  onOverlay(e: MouseEvent) { if (e.target === e.currentTarget) this.adding.set(null); }
  open(s: Supplier) { this.error.set(''); this.form.set(copy(s)); }
  startNew() { this.error.set(''); this.showExtra.set(false); this.adding.set({ name: '', extraFields: [] }); }
  promptField(target: Form) { this.prompt.set({ target, label: '' }); }
  addField() {
    const p = this.prompt(); if (!p) return;
    const label = p.label.trim(); if (!label) { this.toast.show('اكتب اسم الخانة'); return; }
    (p.target.extraFields = p.target.extraFields ?? []).push({ label, value: '' }); this.prompt.set(null);
  }
  private body(f: Form, editing: boolean) {
    const b: Record<string, unknown> = {};
    for (const k of TEXT) if (f[k] !== undefined) b[k] = String(f[k] ?? '').trim();
    const ob = String(f.openingBalance ?? '').trim().replace(/[,،٬]/g, '');
    if (ob) b['openingBalance'] = ob; else if (editing) b['openingBalance'] = '0';
    if (f.extraFields) b['extraFields'] = extraForSave(f.extraFields);
    return b;
  }
  async create() {
    const m = this.adding(); if (!m) return;
    this.busy.set(true); this.error.set('');
    try {
      const r = await firstValueFrom(this.http.post<Supplier>('/api/v1/suppliers', this.body(m, false)));
      this.adding.set(null); this.form.set(copy(r)); await this.load(); this.toast.show('تمت إضافة المورد');
    } catch (e) { this.error.set(errorMessage(e, 'تعذر الحفظ')); } finally { this.busy.set(false); }
  }
  async save() {
    const f = this.form(); if (!f?.id) return;
    this.busy.set(true); this.error.set('');
    try {
      const r = await firstValueFrom(this.http.patch<Supplier>(`/api/v1/suppliers/${f.id}`, { ...this.body(f, true), rev: f.rev }));
      this.form.set(copy(r)); await this.load(); this.toast.show('تم حفظ البيانات');
    } catch (e) { this.error.set(errorMessage(e, 'تعذر الحفظ')); } finally { this.busy.set(false); }
  }
}
