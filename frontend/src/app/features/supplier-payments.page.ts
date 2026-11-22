import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { legacyFmt, fmtDate, plain } from '../core/legacy-format';
import { legacyUrl } from '../core/page-routes';
import { errorMessage, SessionService } from '../core/session.service';
import { LegacyToast } from './legacy-toast';

interface Pay {
  id: string; rev: number; paymentNo?: number; internalNo?: string; supplierId: string; supplierName: string; date: string; amount: number; method?: string; direction?: string;
  invoiceId?: string; invoiceNo: string; batchId?: string; transferRef?: string; notes?: string; extraFields?: { label: string; value: string }[] | Record<string, unknown>; attachments?: { name?: string }[];
  unclassified: boolean; batch?: Pay[];
}
interface Sup { id: string; name: string; taxId: string; commercialReg: string }
interface OpenInv { id: string; invoiceNo: string; date: string; remaining: string; checked?: boolean; amount?: string }
const PAGE_SIZE = 20;
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const METHODS = ['نقدي', 'تحويل بنكي', 'شيك', 'أخرى'];
const EMPTY = { q: '', year: '', month: '', from: '', to: '', supplierId: '', method: '', direction: '', link: '', min: '', max: '', sort: 'new' };

/**
 * الدفعات — بنفس شكل الواجهة القديمة (DEC-0093): renderer/modules/ledger/pages-payments.js (renderPaymentsPage) ونافذة الدفعة (openPaymentModal)
 * ونافذة العرض (openViewPaymentModal)، بكلاسات legacy-skin.css. القايمة والفلاتر من السيرفر بنفس الدوال القديمة (tests-merge/phase70.js).
 * التوزيع زي القديم (DEC-0113 د-1)، والتحقق والترقيم والحدث في السيرفر. زيادة معتمدة: مراجعة الدفعات من غير اتجاه دفعة بدفعة (B-53، د-3).
 * الحذف والتصدير والمرفقات من الشاشة الكاملة (د-5، وخارج النطاق).
 */
@Component({
  selector: 'app-supplier-payments',
  imports: [FormsModule],
  template: `
    <h2 class="page-title">كل الدفعات</h2>
    <p class="page-sub">سجل شامل لكل الدفعات مع إمكانية ربط الدفعة بفاتورة أو تسجيلها كدفعة عامة</p>
    <div class="filters-row" id="payFilters">
      <div class="field field-search"><label>بحث</label>
        <input class="search-box" id="paymentsSearchBox" [(ngModel)]="f.q" (ngModelChange)="reload(true)" placeholder="رقم الدفعة، مورد، فاتورة، تحويل، مبلغ، ملاحظات... (كلمات متعددة = كلها مطلوبة)" autocomplete="off" /></div>
      <div class="field"><label>السنة</label><select id="paymentsYearFilter" [(ngModel)]="f.year" (ngModelChange)="reload()"><option value="">كل السنوات</option>@for (y of years(); track y) { <option [value]="y">{{ y }}</option> }</select></div>
      <div class="field"><label>من تاريخ</label><input type="date" id="paymentsFromInput" [(ngModel)]="f.from" (ngModelChange)="reload()"></div>
      <div class="field"><label>إلى تاريخ</label><input type="date" id="paymentsToInput" [(ngModel)]="f.to" (ngModelChange)="reload()"></div>
      @if (f.from || f.to) { <button class="btn btn-outline btn-sm" id="paymentsClearDates" style="align-self:flex-end;" (click)="f.from = ''; f.to = ''; reload()">مسح فلتر التاريخ</button> }
      <div class="field" style="min-width:180px;"><label>المورد</label><div class="ss-cell"><select id="pf_payments_supplier" [(ngModel)]="f.supplierId" (ngModelChange)="reload()"><option value="">كل الموردين</option>@for (s of suppliers(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }</select></div></div>
      <div class="field"><label>الشهر</label><select id="pf_payments_month" [(ngModel)]="f.month" (ngModelChange)="reload()"><option value="">كل الشهور</option>@for (m of months; track $index) { <option [value]="pad($index + 1)">{{ m }}</option> }</select></div>
      <div class="field"><label>طريقة الدفع</label><select id="pf_payments_method" [(ngModel)]="f.method" (ngModelChange)="reload()"><option value="">كل الطرق</option>@for (m of methodsSeen(); track m) { <option [value]="m">{{ m }}</option> }</select></div>
      <div class="field"><label>نوع الحركة</label><select id="pf_payments_direction" [(ngModel)]="f.direction" (ngModelChange)="reload()"><option value="">الكل</option><option value="pay">دائن — علينا له</option><option value="collect">مدين — عليه لنا</option></select></div>
      <div class="field"><label>الربط</label><select id="pf_payments_link" [(ngModel)]="f.link" (ngModelChange)="reload()"><option value="">الكل</option><option value="linked">مرتبطة بفاتورة</option><option value="general">دفعة عامة</option></select></div>
      <div class="field" style="min-width:110px;"><label>المبلغ من</label><input type="text" inputmode="decimal" dir="ltr" id="pf_payments_min" [(ngModel)]="f.min" (change)="reload()" placeholder="٠" /></div>
      <div class="field" style="min-width:110px;"><label>إلى</label><input type="text" inputmode="decimal" dir="ltr" id="pf_payments_max" [(ngModel)]="f.max" (change)="reload()" placeholder="∞" /></div>
      <div class="field"><label>الترتيب</label><select id="pf_payments_sort" [(ngModel)]="f.sort" (ngModelChange)="reload()"><option value="new">الأحدث أولاً</option><option value="old">الأقدم أولاً</option><option value="amount_desc">الأعلى مبلغاً</option><option value="amount_asc">الأقل مبلغاً</option></select></div>
      <button class="btn btn-outline btn-sm" id="pf_payments_reset" style="align-self:flex-end;" (click)="f = { ...empty }; reload()">مسح الفلاتر</button>
    </div>
    <div class="btn-row" style="margin-bottom:16px;">
      @if (canAdd) { <button class="btn btn-primary" id="openAddPaymentPageBtn" (click)="openEdit(null)">+ إضافة دفعة</button> }
      <a class="btn btn-outline" id="exportAllPaymentsPageBtn" [href]="full" title="التصدير من الشاشة الكاملة (خارج نطاق الحزمة)">تصدير Excel (النتائج الظاهرة)</a>
      @if (unclassifiedCount()) {
        <button class="btn btn-sm" [class.btn-gold]="review()" [class.btn-outline]="!review()" id="payReviewBtn" style="margin-right:auto;" (click)="review.set(!review()); page.set(1)" title="الدفعات من غير اتجاه — مابتدخلش الرصيد لحد مراجعتها (B-53)">
          {{ review() ? 'إلغاء مراجعة غير المصنّفة' : 'دفعات غير مصنّفة (' + unclassifiedCount() + ')' }}</button>
      }
    </div>
    @if (error() && !modal()) { <div class="err" role="alert" id="payError">{{ error() }}</div> }
    <div class="stats-row" style="grid-template-columns:repeat(2,1fr);" id="payStats">
      <div class="stat-card"><div class="num">{{ shown().length }}</div><div class="lbl">عدد الدفعات</div></div>
      <div class="stat-card"><div class="num">{{ fmt(shownTotal()) }}</div><div class="lbl">إجمالي الدفعات</div></div>
    </div>
    @if (review()) { <p class="page-sub" id="payReviewHint">مراجعة الدفعات من غير اتجاه (B-53): حدّد اتجاه كل دفعة لوحدها بعد مراجعة المستند. التغيير بيتسجّل في التدقيق، ومفيش تصنيف جماعي.</p> }
    <div class="table-wrap"><table id="payTable">
      <thead><tr><th>رقم الدفعة</th><th>التاريخ</th><th>المورد</th><th>النوع</th><th>طريقة الدفع</th><th>الفاتورة المرتبطة</th><th>رقم التحويل / تفاصيل</th><th>ملاحظات</th><th>المبلغ</th><th></th></tr></thead>
      <tbody>
        @for (p of pageRows(); track p.id) {
          <tr [attr.data-viewpay]="p.id" style="cursor:pointer;" title="اضغط لعرض التفاصيل" (click)="openView(p.id)">
            <td style="font-weight:800;color:var(--ledger-green);">#{{ p.paymentNo || '-' }}@if (p.internalNo) { <div style="font-size:11px;color:var(--ink-soft);font-weight:600;">{{ p.internalNo }}</div> }</td>
            <td>{{ fmtDate(p.date) || '-' }}</td>
            <td>{{ p.supplierName || '—' }}</td>
            <td>{{ dirLabel(p) }}@if (p.unclassified) { <span class="pill" style="background:#b45309;color:#fff;font-size:10px;" title="من غير اتجاه — مابتدخلش الرصيد (B-53)">غير مصنّفة</span> }</td>
            <td>{{ p.method || '-' }}</td>
            <td>{{ p.invoiceId ? p.invoiceNo : 'دفعة عامة' }}</td>
            <td>{{ refBits(p) || '-' }}</td>
            <td>{{ p.notes || '-' }}</td>
            <td class="amount-cell payment">{{ fmt(p.amount) }}</td>
            <td (click)="$event.stopPropagation()"><div class="row-actions">
              @if (review() && p.unclassified && canEdit) {
                <button class="btn btn-outline btn-sm" [attr.data-classify-pay]="p.id" (click)="classify(p, 'pay')">سداد (دائن)</button>
                <button class="btn btn-outline btn-sm" [attr.data-classify-collect]="p.id" (click)="classify(p, 'collect')">تحصيل (مدين)</button>
              } @else {
                <button class="row-btn" [attr.data-viewpay-btn]="p.id" title="عرض" (click)="openView(p.id)">👁</button>
                @if (canEdit) { <button class="row-btn" [attr.data-editpay]="p.id" title="تعديل" (click)="openEditById(p.id)">✎</button> }
                @if (canDelete) { <a class="row-btn del" [href]="full" [attr.data-delpay-global]="p.id" title="الحذف من الشاشة الكاملة (DEC-0113)">✕</a> }
              }
            </div></td>
          </tr>
        } @empty { <tr><td colspan="10" class="table-empty">{{ loaded() && !anyRows() ? 'لا توجد دفعات مسجلة بعد' : 'لا توجد دفعات مطابقة — جرّب تعديل البحث أو اضغط «مسح الفلاتر»' }}</td></tr> }
      </tbody>
    </table></div>
    <div class="btn-row table-pager" data-pager="payments" style="justify-content:space-between;align-items:center;margin-top:10px;flex-wrap:wrap;gap:8px;">
      <span style="font-size:13px;color:var(--ink-soft);">عرض {{ shown().length ? (curPage() - 1) * pageSize + 1 : 0 }}–{{ min(curPage() * pageSize, shown().length) }} من {{ shown().length }} <span style="opacity:.75;">(20 لكل صفحة)</span></span>
      <div style="display:flex;gap:8px;align-items:center;">
        <button type="button" class="btn btn-outline btn-sm" [disabled]="curPage() <= 1" (click)="page.set(curPage() - 1)">السابق</button>
        <span style="font-size:13px;font-weight:700;">صفحة {{ curPage() }} / {{ pages() }}</span>
        <button type="button" class="btn btn-outline btn-sm" [disabled]="curPage() >= pages()" (click)="page.set(curPage() + 1)">التالي</button>
      </div>
    </div>

    @if (modal() === 'edit') {
      <div class="modal-overlay" id="modalOverlay" (click)="onOverlay($event)">
        <div class="modal wide" role="dialog" aria-modal="true">
          <h3>{{ e.id ? 'تعديل الدفعة' + (e.paymentNo ? ' #' + e.paymentNo : '') : 'إضافة دفعة جديدة' }}</h3>
          <div class="field"><label for="m_pay_supplier">اسم المورد *</label><div class="ss-cell ss-cell-wide"><select id="m_pay_supplier" [(ngModel)]="e.supplierId" (ngModelChange)="loadOpen()"><option value="">ابحث أو اكتب اسم المورد...</option>@for (s of suppliers(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }</select></div></div>
          <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:10px;">
            <div class="field"><label>رقم التسجيل الضريبي</label><input id="m_pay_taxid" disabled style="opacity:.7;" [value]="sup()?.taxId ?? ''" /></div>
            <div class="field"><label>السجل التجاري</label><input id="m_pay_commreg" disabled style="opacity:.7;" [value]="sup()?.commercialReg ?? ''" /></div>
          </div>
          <div class="field"><label for="m_pay_date">التاريخ</label><input type="date" id="m_pay_date" [(ngModel)]="e.date" /></div>
          <div class="field"><label for="m_pay_direction">نوع الحركة *</label><select id="m_pay_direction" [(ngModel)]="e.direction">
            <option value="pay">دائن — علينا له (سداد للمورد)</option><option value="collect">مدين — عليه لنا (قيد مدين / تحصيل)</option></select>
            <p style="font-size:11.5px;color:var(--ink-soft);margin:6px 0 0;">دائن: فلوس خارجة للمورد تقلل المستحق عليه. مدين: تسجيل أن المورد مدين لنا (يقلل رصيده الدائن عندنا أو يجعله مديناً).</p></div>
          <div class="field">
            <label>الفواتير المرتبطة <span style="font-weight:400;color:var(--ink-soft);font-size:12px;">({{ e.id ? 'فاتورة واحدة — زي القديم' : 'اختيار متعدد' }})</span></label>
            <div id="m_pay_invoiceList" class="pay-inv-list" [style.opacity]="e.general ? '0.45' : '1'">
              @for (i of open(); track i.id) {
                <label class="pay-inv-row">
                  <input type="checkbox" class="m_pay_inv_cb" [value]="i.id" [(ngModel)]="i.checked" (ngModelChange)="onCheck(i)" [disabled]="e.general" />
                  <span class="pay-inv-no">{{ i.invoiceNo || '-' }}</span><span class="pay-inv-date">{{ fmtDate(i.date) }}</span><span class="pay-inv-remain">متبقي {{ fmt(i.remaining) }}</span>
                  <input type="text" inputmode="decimal" dir="ltr" autocomplete="off" style="text-align:right;" class="m_pay_inv_amt" [attr.data-invid]="i.id" placeholder="مبلغ" [(ngModel)]="i.amount" [disabled]="!i.checked || e.general" />
                </label>
              } @empty { <div style="color:var(--ink-soft);font-size:13px;padding:6px;">لا توجد فواتير بباقي لهذا المورد</div> }
            </div>
            <label style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:13px;"><input type="checkbox" id="m_pay_general" [(ngModel)]="e.general" (ngModelChange)="onGeneral()" /> دفعة عامة (مقدمة / تحت الحساب — بدون ربط بفاتورة)</label>
          </div>
          <div class="field"><label for="m_pay_method">طريقة الدفع</label><select id="m_pay_method" [(ngModel)]="e.method">@for (m of methods; track m) { <option [value]="m">{{ m }}</option> }</select></div>
          <div class="field"><label for="m_pay_amount">المبلغ الإجمالي *</label><input type="text" inputmode="decimal" dir="ltr" style="text-align:right;" id="m_pay_amount" placeholder="٠.٠٠" autocomplete="off" [(ngModel)]="e.amount" /></div>
          <p id="m_pay_allocHint" style="font-size:12px;margin:0 0 8px;" [style.color]="hint()[1]">{{ hint()[0] }}</p>
          <div class="field"><label for="m_pay_transferRef">رقم التحويل البنكي</label><input type="text" id="m_pay_transferRef" placeholder="اختياري" autocomplete="off" [(ngModel)]="e.transferRef" /></div>
          <div id="m_pay_extraFieldsWrap">
            @for (x of e.extraFields; track $index) {
              <div class="field" style="display:flex;gap:6px;align-items:flex-end;"><input [(ngModel)]="x.label" placeholder="اسم الخانة" style="flex:1;" [name]="'xl' + $index" /><input [(ngModel)]="x.value" placeholder="القيمة" style="flex:2;" [name]="'xv' + $index" /><button type="button" class="btn btn-outline btn-sm" (click)="e.extraFields.splice($index, 1)">✕</button></div>
            }
          </div>
          <div class="btn-row no-print" style="margin-top:6px;"><button class="btn btn-outline btn-sm" id="m_pay_addFieldBtn" type="button" (click)="e.extraFields.push({ label: '', value: '' })">+ إضافة خانة أخرى</button></div>
          <div class="field"><label for="m_pay_notes">ملاحظات</label><input type="text" id="m_pay_notes" placeholder="اختياري" autocomplete="off" [(ngModel)]="e.notes" /></div>
          <div class="section-title" style="margin-top:12px;font-size:14px;">المرفقات (مسح ضوئي)</div>
          <div id="m_pay_attList" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;">@for (a of e.attachments; track $index) { <div class="pill" style="padding:6px 10px;">📎 {{ a.name || 'مرفق' }}</div> } @empty { <span style="color:var(--ink-soft);font-size:13px;">لا توجد مرفقات بعد</span> }</div>
          <a class="btn btn-outline btn-sm" id="m_pay_scanAtt" [href]="full" title="المرفقات من الشاشة الكاملة">📷 مسح ضوئي / كاميرا</a>
          @if (error()) { <div class="err" role="alert" id="payError" style="margin-top:10px;">{{ error() }}</div> }
          <div class="modal-actions"><button type="button" class="btn btn-outline" id="m_pay_cancel" (click)="close()">إلغاء</button><button type="button" class="btn btn-primary" id="m_pay_save" [disabled]="busy()" (click)="save()">{{ e.id ? 'حفظ التعديل' : 'إضافة الدفعة' }}</button></div>
        </div>
      </div>
    }

    @if (modal() === 'view' && view(); as p) {
      <div class="modal-overlay" id="modalOverlay" (click)="onOverlay($event)">
        <div class="modal wide" id="payViewModal">
          <h3>تفاصيل الدفعة @if (p.paymentNo) { <span style="color:var(--ledger-green);">#{{ p.paymentNo }}</span> }@if (p.internalNo) { <span class="pill">{{ p.internalNo }}</span> }</h3>
          <div class="form-grid" style="gap:10px 16px;">
            <div class="info-field"><label>التاريخ</label><div style="font-weight:800;">{{ fmtDate(p.date) || '-' }}</div></div>
            <div class="info-field"><label>المورد</label><div>{{ p.supplierName || '—' }}</div></div>
            <div class="info-field"><label>نوع الحركة</label><div style="font-weight:800;">{{ dirLabel(p) }}@if (p.unclassified) { <span class="pill" style="background:#b45309;color:#fff;font-size:10px;">غير مصنّفة</span> }</div></div>
            <div class="info-field"><label>طريقة الدفع</label><div>{{ p.method || '-' }}</div></div>
            <div class="info-field"><label>المبلغ</label><div class="amount-cell payment" style="font-size:18px;font-weight:900;">{{ fmt(p.amount) }}</div></div>
            <div class="info-field"><label>الفاتورة المرتبطة</label><div>{{ p.invoiceId ? p.invoiceNo : 'دفعة عامة (غير مرتبطة بفاتورة)' }}</div></div>
            <div class="info-field"><label>رقم التحويل</label><div>{{ p.transferRef || '-' }}</div></div>
            <div class="info-field" style="grid-column:1/-1;"><label>تفاصيل إضافية</label><div>{{ extraText(p) || '-' }}</div></div>
            <div class="info-field" style="grid-column:1/-1;"><label>ملاحظات</label><div>{{ p.notes || '-' }}</div></div>
            @if ((p.batch?.length ?? 0) > 1) {
              <div class="info-field" style="grid-column:1/-1;background:var(--paper);padding:10px;border-radius:8px;" id="payViewBatch"><label>الدفعة الموزّعة ({{ p.batch!.length }} بند)</label>
                @for (b of p.batch!; track b.id) { <div>#{{ b.paymentNo }} — {{ b.invoiceId ? b.invoiceNo : 'غير موزع' }} — {{ fmt(b.amount) }}</div> }</div>
            }
            <div class="info-field" style="grid-column:1/-1;"><label>المرفقات</label><div>@for (a of p.attachments ?? []; track $index) { <a class="row-btn" [href]="full">{{ a.name }}</a> } @empty { - }</div></div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-outline" id="m_close_pay_view" (click)="close()">إغلاق</button>
            @if (canEdit) { <button class="btn btn-gold" id="m_pay_edit" (click)="openEditById(p.id)">تعديل الدفعة</button> }
            @if (p.invoiceId) { <a class="btn btn-primary" id="m_pay_view_inv" href="/app/supplier-invoices">عرض الفاتورة المرتبطة</a> }
          </div>
        </div>
      </div>
    }`,
})
export class SupplierPaymentsPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly toast = new LegacyToast();
  readonly canAdd = this.session.can('ledger.payments', 'add'); readonly canEdit = this.session.can('ledger.payments', 'edit'); readonly canDelete = this.session.can('ledger.payments', 'delete');
  readonly full = legacyUrl('ledger.payments');
  readonly months = MONTHS; readonly methods = METHODS; readonly empty = EMPTY; readonly pageSize = PAGE_SIZE; readonly min = Math.min;
  readonly rows = signal<Pay[]>([]); readonly years = signal<string[]>([]); readonly methodsSeen = signal<string[]>([]); readonly suppliers = signal<Sup[]>([]);
  readonly unclassifiedCount = signal(0); readonly review = signal(false); readonly loaded = signal(false); readonly anyRows = signal(false);
  readonly page = signal(1); readonly error = signal(''); readonly busy = signal(false);
  readonly modal = signal<'edit' | 'view' | null>(null); readonly view = signal<Pay | null>(null);
  f = { ...EMPTY };
  e: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any -- نموذج النافذة بنفس خانات القديمة (نصوص)
  readonly open = signal<OpenInv[]>([]);
  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly shown = computed(() => (this.review() ? this.rows().filter((p) => p.unclassified) : this.rows()));
  readonly shownTotal = computed(() => this.shown().reduce((a, b) => a + Number(b.amount || 0), 0));
  readonly pages = computed(() => Math.max(1, Math.ceil(this.shown().length / PAGE_SIZE)));
  readonly curPage = computed(() => Math.min(this.page(), this.pages()));
  readonly pageRows = computed(() => this.shown().slice((this.curPage() - 1) * PAGE_SIZE, this.curPage() * PAGE_SIZE));
  sup = () => this.suppliers().find((s) => s.id === this.e['supplierId']);
  pad = (n: number) => String(n).padStart(2, '0');
  fmt = (n: unknown) => legacyFmt(n);
  fmtDate = (v: string) => fmtDate(v);
  /** paymentDirectionLabel: الفاضي بيتعرض «دائن» زي القديم، ومعاه شارة «غير مصنّفة» */
  dirLabel = (p: Pay) => (p.direction === 'collect' ? 'مدين — عليه لنا' : 'دائن — علينا له');
  extraText = (p: Pay) => (Array.isArray(p.extraFields) ? p.extraFields.filter((x) => x && x.value).map((x) => `${x.label}: ${x.value}`).join(' | ') : '');
  refBits = (p: Pay) => [p.transferRef ? `رقم التحويل: ${p.transferRef}` : '', this.extraText(p)].filter(Boolean).join(' | ');

  ngOnInit() { void this.load(); void this.loadSuppliers(); }
  private async loadSuppliers() {
    try { this.suppliers.set((await firstValueFrom(this.http.get<{ suppliers: Sup[] }>('/api/v1/supplier-invoices/options'))).suppliers); } catch { /* القايمة بتفضل فاضية */ }
  }
  reload(debounce = false) { this.page.set(1); if (this.timer) clearTimeout(this.timer); if (debounce) this.timer = setTimeout(() => void this.load(), 250); else void this.load(); }
  async load() {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(this.f)) if (v !== '' && !(k === 'sort' && v === 'new')) p = p.set(k, String(v));
    try {
      const r = await firstValueFrom(this.http.get<{ rows: Pay[]; years: string[]; methods: string[]; unclassifiedCount: number }>('/api/v1/supplier-payments', { params: p }));
      this.rows.set(r.rows); this.years.set(r.years); this.methodsSeen.set(r.methods); this.unclassifiedCount.set(r.unclassifiedCount); this.loaded.set(true); this.anyRows.set(r.years.length > 0 || r.rows.length > 0);
      if (!r.unclassifiedCount) this.review.set(false);
    } catch (e) { this.error.set(errorMessage(e, 'تعذر تحميل الدفعات')); }
  }

  // ---------------- النافذة (زي openPaymentModal)
  openEdit(p: Pay | null) {
    if (!this.suppliers().length && !p) { this.toast.show('أضِف مورداً أولاً قبل تسجيل دفعة'); return; }
    this.e = p ? { id: p.id, rev: p.rev, paymentNo: p.paymentNo, supplierId: p.supplierId, date: p.date, direction: p.direction === 'collect' ? 'collect' : 'pay', method: p.method || 'نقدي', amount: String(p.amount ?? ''),
      general: !p.invoiceId, invoiceId: p.invoiceId || '', transferRef: p.transferRef || '', notes: p.notes || '', extraFields: Array.isArray(p.extraFields) ? p.extraFields.map((x) => ({ ...x })) : [], attachments: p.attachments ?? [] }
      : { supplierId: this.f.supplierId || '', date: new Date().toISOString().slice(0, 10), direction: 'pay', method: 'نقدي', amount: '', general: false, transferRef: '', notes: '', extraFields: [], attachments: [] };
    this.error.set(''); this.open.set([]); this.modal.set('edit');
    void this.loadOpen();
  }
  async openEditById(id: string) { try { this.openEdit(await firstValueFrom(this.http.get<Pay>(`/api/v1/supplier-payments/${id}`))); } catch (e) { this.error.set(errorMessage(e, 'تعذر فتح الدفعة')); } }
  async loadOpen() {
    if (!this.e['supplierId']) { this.open.set([]); return; }
    let p = new HttpParams().set('supplierId', this.e['supplierId']); if (this.e['id']) p = p.set('keep', this.e['id']);
    try {
      const list = await firstValueFrom(this.http.get<OpenInv[]>('/api/v1/supplier-payments/open-invoices', { params: p }));
      this.open.set(list.map((i) => (this.e['id'] && i.id === this.e['invoiceId'] ? { ...i, checked: true, amount: this.e['amount'] } : { ...i, checked: false, amount: '' })));
    } catch { this.open.set([]); }
  }
  onCheck(i: OpenInv) { if (i.checked && !i.amount) i.amount = String(Number(i.remaining)); if (!i.checked) i.amount = ''; }
  onGeneral() { if (this.e['general']) this.open().forEach((i) => { i.checked = false; i.amount = ''; }); }
  /** updateAllocHint */
  hint(): [string, string | null] {
    if (this.e['general']) return ['دفعة عامة — لن تُخصم من فواتير محددة', 'var(--ink-soft)'];
    const total = Number(plain(this.e['amount'])) || 0;
    if (!total) return ['أدخل المبلغ الإجمالي ثم حدّد توزيعه على الفواتير', 'var(--ink-soft)'];
    const allocated = this.open().filter((i) => i.checked).reduce((a, i) => a + (Number(plain(i.amount)) || 0), 0);
    const diff = total - allocated;
    if (Math.abs(diff) < 0.02) return [`✓ التوزيع مطابق للمبلغ الإجمالي (${this.fmt(total)})`, 'var(--ledger-green)'];
    if (diff > 0) return [`متبقي للتوزيع: ${this.fmt(diff)} (يمكن جعله دفعة عامة أو زيادته على فاتورة)`, 'var(--gold)'];
    return [`التوزيع أكبر من المبلغ بـ ${this.fmt(-diff)}`, 'var(--debt)'];
  }
  async save() {
    const e = this.e;
    if (!e['supplierId']) { this.toast.show('اختر المورد'); return; }
    const amount = plain(e['amount']);
    if (!/^\d{1,14}(\.\d{1,6})?$/.test(amount) || !(Number(amount) > 0)) { this.toast.show('أدخل مبلغاً صحيحاً'); return; }
    const checked = e['general'] ? [] : this.open().filter((i) => i.checked && Number(plain(i.amount)) > 0);
    const extraFields = (e['extraFields'] as { label: string; value: string }[]).map((x) => ({ label: x.label.trim() || 'خانة', value: x.value.trim() })).filter((x) => x.value);
    const common = { supplierId: e['supplierId'], date: e['date'], direction: e['direction'], method: e['method'], amount, transferRef: String(e['transferRef'] ?? '').trim(), notes: String(e['notes'] ?? '').trim(), extraFields };
    this.busy.set(true); this.error.set('');
    try {
      if (e['id']) {
        // التعديل سجل واحد زي القديم (س2): أول فاتورة متعلّمة، أو من غير
        await firstValueFrom(this.http.patch(`/api/v1/supplier-payments/${e['id']}`, { ...common, rev: e['rev'], invoiceId: checked[0]?.id ?? '' }));
        this.toast.show(e['direction'] === 'collect' ? 'تم الحفظ: قيد مدين (المورد عليه لنا)' : 'تم الحفظ: دفعة دائن (سداد للمورد)');
      } else {
        const r = await firstValueFrom(this.http.post<Pay>('/api/v1/supplier-payments', { ...common, general: !!e['general'], allocations: checked.map((i) => ({ invoiceId: i.id, amount: plain(i.amount) })) },
          { headers: new HttpHeaders({ 'Idempotency-Key': `pay-${crypto.randomUUID()}` }) }));
        const n = r.batch?.length ?? 1;
        this.toast.show(n > 1 ? `تم تسجيل الدفعة وتوزيعها على ${n} بند` : 'تم إضافة الدفعة');
      }
      this.modal.set(null); await this.load();
    } catch (err) { this.error.set(errorMessage(err, 'تعذر الحفظ')); } finally { this.busy.set(false); }
  }
  async classify(p: Pay, direction: 'pay' | 'collect') {
    if (!confirm(`تحديد اتجاه الدفعة #${p.paymentNo ?? ''} (${this.fmt(p.amount)}) كـ «${direction === 'pay' ? 'سداد (دائن)' : 'تحصيل (مدين)'}»؟ القرار بيتسجّل في التدقيق.`)) return;
    try { await firstValueFrom(this.http.patch(`/api/v1/supplier-payments/${p.id}/direction`, { rev: p.rev, direction })); this.toast.show('تم تحديد الاتجاه'); await this.load(); }
    catch (e) { this.error.set(errorMessage(e, 'تعذر الحفظ')); }
  }

  async openView(id: string) {
    try { this.view.set(await firstValueFrom(this.http.get<Pay>(`/api/v1/supplier-payments/${id}`))); this.error.set(''); this.modal.set('view'); }
    catch (e) { this.error.set(errorMessage(e, 'تعذر فتح الدفعة')); }
  }
  close() { this.modal.set(null); this.error.set(''); }
  /** إغلاق بالضغط على الخلفية بس. مابيرجّعش قيمة: Angular بيلغي الحدث (preventDefault) لو المعالج رجّع false */
  onOverlay(ev: MouseEvent) { if (ev.target === ev.currentTarget) this.close(); }
}
