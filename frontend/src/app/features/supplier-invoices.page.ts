import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { legacyUrl } from '../core/page-routes';
import { errorMessage, SessionService } from '../core/session.service';
import { LegacyToast } from './legacy-toast';
import { fmtDate as legacyFmtDate, legacyFmt, plain, roundMoney, toLatin } from '../core/legacy-format';

type Mode = 'invoices' | 'returns';
interface Opt { code: string; label: string }
interface Options { moneyDecimals: number | 'auto'; suppliers: { id: string; name: string; taxId: string; commercialReg: string }[]; categories: string[]; projects: string[]; internalCodes: string[]; supplierItemCodes: string[]; itemNames: string[]; itemDescriptions: string[]; natures: Opt[]; discountTypes: Opt[] }
interface Inv {
  id: string; rev: number; supplierId: string; supplierName: string; supplierTaxId: string; invoiceNo: string; internalNo?: string; date: string; dueDate?: string; dueDateEffective: string | null;
  category?: string; project?: string; description?: string; internalCode?: string; supplierItemCode?: string; itemDescription?: string; quantity?: string; unitPrice?: string;
  baseValue: number; vat: number; stampDuty: number; discountRate?: string; withheld: number; withheldStatus?: string; totalInvoice: number; netInvoice: number; nature?: string; discountType?: string;
  isReturn: boolean; linkedInvoiceId?: string; cancelled?: boolean; postReturnWht?: boolean; invoiceLink?: string; notes?: string; attachments?: { id?: string; name?: string }[];
  remaining: number; paid: number; overdue: boolean; status: string; missing: string[];
  linkedReturns?: { id: string; invoiceNo: string; date: string; netInvoice: number }[];
}
interface Totals { count: number; gross: number; vat: number; stamp: number; withheld: number; net: number }
interface Linkable { id: string; invoiceNo: string; date: string; netInvoice: number; postReturnWht: boolean }
interface ItemRow { desc: string; supplierCode: string; internalCode: string; itemDescription: string; quantity: string; unitPrice: string }

const PAGE_SIZE = 20;
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const STATUS: [string, string][] = [['', 'كل الحالات'], ['paid', 'مسددة'], ['partial', 'مسددة جزئياً'], ['unpaid', 'غير مسددة'], ['overdue', 'متأخرة'], ['return', 'مرتجعات']];
const SORTS: [string, string][] = [['new', 'الأحدث أولاً'], ['old', 'الأقدم أولاً'], ['amount_desc', 'الأعلى قيمة'], ['amount_asc', 'الأقل قيمة'], ['supplier', 'المورد'], ['no', 'رقم الفاتورة']];
const EMPTY_FILTERS = { q: '', supplierId: '', category: '', project: '', year: '', month: '', from: '', to: '', overdueOnly: false, status: '', withheld: '', min: '', max: '', sort: 'new' };

/**
 * فواتير ومرتجعات الموردين — بنفس شكل الواجهة القديمة (DEC-0093): renderer/modules/ledger/pages-invoices.js (renderInvoicesPage)
 * والجدول (invoiceTableRowHtml) ونافذة الإضافة والتعديل (openAddEditInvoiceModal) ونافذة العرض (openViewInvoiceModal)، بكلاسات legacy-skin.css.
 * القايمة والفلاتر والبحث والترتيب والكروت والحالة من السيرفر بنفس الدوال القديمة (tests-merge/phase68.js). الإجمالي والصافي من السيرفر (DEC-0107).
 * الحذف والتصدير وإشعارات الخصم والمرفقات (إضافة) من الشاشة الكاملة (DEC-0108، وخارج النطاق).
 */
@Component({
  selector: 'app-supplier-invoices',
  imports: [FormsModule],
  template: `
    <h2 class="page-title">{{ isRet ? 'المرتجعات' : 'كل الفواتير' }}</h2>
    <p class="page-sub">{{ isRet ? 'سجل المرتجعات عبر جميع الموردين — المرتجع بيخصم من حساب المورد' : 'سجل شامل لكل الفواتير عبر جميع الموردين — يتم التحقق تلقائياً من تكرار الفاتورة بمطابقة كل الأعمدة' }}</p>

    <div class="filters-row" id="invFilters">
      <div class="field field-search"><label>بحث</label>
        <input class="search-box" id="invSearchBox" [(ngModel)]="f.q" (ngModelChange)="reload(true)" placeholder="رقم فاتورة، مورد، رقم ضريبي، بيان، كود، مبلغ، ملاحظات... (كلمات متعددة = كلها مطلوبة)" autocomplete="off" /></div>
      <div class="field" style="min-width:180px;"><label>المورد</label>
        <div class="ss-cell"><select id="invFilterSupplier" [(ngModel)]="f.supplierId" (ngModelChange)="reload()"><option value="">كل الموردين</option>@for (s of opts().suppliers; track s.id) { <option [value]="s.id">{{ s.name }}</option> }</select></div></div>
      <div class="field" style="min-width:150px;"><label>التصنيف</label>
        <div class="ss-cell"><input type="text" id="invFilterCategory" list="invCatList" placeholder="كل التصنيفات — ابحث..." autocomplete="off" [(ngModel)]="f.category" (change)="reload()" /></div></div>
      <div class="field" style="min-width:150px;"><label>المشروع</label>
        <div class="ss-cell"><input type="text" id="invFilterProject" list="invProjList" placeholder="كل المشاريع — ابحث..." autocomplete="off" [(ngModel)]="f.project" (change)="reload()" /></div></div>
      <div class="field"><label>السنة</label><select id="invFilterYear" [(ngModel)]="f.year" (ngModelChange)="reload()"><option value="">كل السنوات</option>@for (y of years(); track y) { <option [value]="y">{{ y }}</option> }</select></div>
      <div class="field"><label>من تاريخ</label><input type="date" id="invFilterFrom" [(ngModel)]="f.from" (ngModelChange)="reload()"></div>
      <div class="field"><label>إلى تاريخ</label><input type="date" id="invFilterTo" [(ngModel)]="f.to" (ngModelChange)="reload()"></div>
      @if (f.from || f.to) { <button class="btn btn-outline btn-sm" id="invClearDates" style="align-self:flex-end;" (click)="f.from = ''; f.to = ''; reload()">مسح فلتر التاريخ</button> }
      @if (!isRet) { <button class="btn btn-sm" [class.btn-primary]="f.overdueOnly" [class.btn-outline]="!f.overdueOnly" id="invFilterOverdue" style="align-self:flex-end;" (click)="f.overdueOnly = !f.overdueOnly; reload()">{{ f.overdueOnly ? 'إلغاء فلتر المتأخرة' : 'فواتير متأخرة فقط' }}</button> }
      <div class="field"><label>الشهر</label><select id="pf_invoices_month" [(ngModel)]="f.month" (ngModelChange)="reload()"><option value="">كل الشهور</option>@for (m of months; track $index) { <option [value]="pad($index + 1)">{{ m }}</option> }</select></div>
      <div class="field"><label>الحالة</label><select id="pf_invoices_status" [(ngModel)]="f.status" (ngModelChange)="reload()">@for (s of statuses; track s[0]) { <option [value]="s[0]">{{ s[1] }}</option> }</select></div>
      <div class="field"><label>الخصم</label><select id="pf_invoices_withheld" [(ngModel)]="f.withheld" (ngModelChange)="reload()"><option value="">الكل</option><option value="yes">عليها خصم</option><option value="no">بدون خصم</option></select></div>
      <div class="field" style="min-width:110px;"><label>صافي الفاتورة من</label><input type="text" inputmode="decimal" dir="ltr" id="pf_invoices_min" [(ngModel)]="f.min" (change)="reload()" placeholder="٠" /></div>
      <div class="field" style="min-width:110px;"><label>إلى</label><input type="text" inputmode="decimal" dir="ltr" id="pf_invoices_max" [(ngModel)]="f.max" (change)="reload()" placeholder="∞" /></div>
      <div class="field"><label>الترتيب</label><select id="pf_invoices_sort" [(ngModel)]="f.sort" (ngModelChange)="reload()">@for (s of sorts; track s[0]) { <option [value]="s[0]">{{ s[1] }}</option> }</select></div>
      <button class="btn btn-outline btn-sm" id="pf_invoices_reset" style="align-self:flex-end;" (click)="resetFilters()">مسح الفلاتر</button>
    </div>
    <datalist id="invCatList">@for (c of opts().categories; track c) { <option [value]="c"></option> }</datalist>
    <datalist id="invProjList">@for (c of opts().projects; track c) { <option [value]="c"></option> }</datalist>

    <div class="btn-row" style="margin-bottom:14px;">
      @if (!isRet && canAdd) { <button class="btn btn-gold" id="openAddInvoiceModalBtnGlobal" (click)="openEdit(null, false)">+ إضافة فاتورة</button> }
      @if (isRet && canAddReturn) { <button class="btn btn-gold" id="openAddReturnModalBtn" (click)="openEdit(null, true)">+ إضافة مرتجع</button> }
      <a class="btn btn-outline" id="exportAllInvoicesCsv" [href]="full" title="التصدير من الشاشة الكاملة (خارج نطاق الحزمة)">تصدير Excel (النتائج الظاهرة)</a>
    </div>
    @if (error() && !modal()) { <div class="err" role="alert" id="invError">{{ error() }}</div> }

    <div class="stats-row" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));" id="invStats">
      <div class="stat-card"><div class="num">{{ totals().count }}</div><div class="lbl">{{ isRet ? 'عدد المرتجعات (بعد الفلترة)' : 'عدد الفواتير (بعد الفلترة)' }}</div></div>
      <div class="stat-card"><div class="num">{{ fmt(totals().gross) }}</div><div class="lbl">إجمالي قيمة الفواتير</div></div>
      <div class="stat-card"><div class="num">{{ fmt(totals().vat) }}</div><div class="lbl">إجمالي ضريبة القيمة المضافة</div></div>
      <div class="stat-card"><div class="num">{{ fmt(totals().stamp) }}</div><div class="lbl">إجمالي قيمة الدمغات</div></div>
      <div class="stat-card"><div class="num">{{ fmt(totals().withheld) }}</div><div class="lbl">إجمالي المخصوم</div></div>
      <div class="stat-card"><div class="num">{{ fmt(totals().net) }}</div><div class="lbl">إجمالي الصافي</div></div>
    </div>

    <div class="table-wrap"><table id="invTable">
      <thead><tr>
        <th>رقم الفاتورة</th><th>التاريخ</th><th>المورد</th><th>البيان</th>
        <th>كود داخلي</th><th>كود المورد</th><th>نوع الفاتورة</th><th>المشروع</th>
        <th>طبيعة التعامل</th><th>نوع الخصم</th>
        <th>القيمة الإجمالية</th><th>الضريبة</th><th>الدمغات</th><th>إجمالي الفاتورة</th>
        <th>المخصوم</th><th>الصافي</th><th></th>
      </tr></thead>
      <tbody>
        @for (r of pageRows(); track r.id) {
          <tr [class]="rowClass(r)" [attr.data-viewinv]="r.id" style="cursor:pointer;" title="اضغط لعرض التفاصيل" (click)="openView(r)">
            <td>@if (r.missing.length) { <span class="warn-badge" [title]="'بيانات ناقصة: ' + r.missing.join('، ')">⚠️</span> }{{ r.invoiceNo || '-' }}@if (r.isReturn) { <span class="pill" style="background:var(--debt);color:#fff;">مرتجع</span> }@if (r.cancelled) { <span class="pill" style="background:#6b7280;color:#fff;">فاتورة ملغاة</span> }@if (!r.isReturn && r.postReturnWht) { <span class="pill" style="background:#b45309;color:#fff;">إشعار بعد مرتجع</span> }@if (r.internalNo) { <div style="font-size:11px;color:var(--ink-soft);" class="internal-no">{{ r.internalNo }}</div> }</td>
            <td>{{ fmtDate(r.date) || '-' }}</td>
            <td>{{ r.supplierName || '—' }}</td>
            <td style="white-space:pre-line;max-width:220px;vertical-align:top;">{{ trunc(r.description)[0] }}@if (trunc(r.description)[1]) { <span class="table-more-lines" style="color:var(--ink-soft);font-size:11px;font-weight:600;">… +{{ trunc(r.description)[1] }} أصناف</span> }</td>
            <td style="white-space:pre-line;max-width:120px;vertical-align:top;">{{ trunc(r.internalCode)[0] }}@if (trunc(r.internalCode)[1]) { <span class="table-more-lines" style="color:var(--ink-soft);font-size:11px;font-weight:600;">… +{{ trunc(r.internalCode)[1] }} أصناف</span> }</td>
            <td style="white-space:pre-line;max-width:120px;vertical-align:top;">{{ trunc(r.supplierItemCode)[0] }}@if (trunc(r.supplierItemCode)[1]) { <span class="table-more-lines" style="color:var(--ink-soft);font-size:11px;font-weight:600;">… +{{ trunc(r.supplierItemCode)[1] }} أصناف</span> }</td>
            <td>@if (r.category) { <span class="pill">{{ r.category }}</span> } @else { - }</td>
            <td>@if (r.project) { <span class="pill">{{ r.project }}</span> } @else { - }</td>
            <td [title]="optLabel(opts().natures, r.nature)">{{ optLabel(opts().natures, r.nature) }}</td><td [title]="optLabel(opts().discountTypes, r.discountType)">{{ optLabel(opts().discountTypes, r.discountType) }}</td>
            <td>{{ fmt(r.baseValue) }}</td><td>{{ r.vat ? fmt(r.vat) : '-' }}</td><td>{{ r.stampDuty ? fmt(r.stampDuty) : '-' }}</td>
            <td class="amount-cell invoice">{{ fmt(r.totalInvoice) }}</td>
            <td>{{ r.withheld ? fmt(r.withheld) : '-' }}@if (r.withheld && r.withheldStatus === 'paid') { <span class="pill" style="font-size:10px;background:#059669;color:#fff;">ضرائب✓</span> } @else if (r.withheld && !r.isReturn) { <span class="pill" style="font-size:10px;background:#b45309;color:#fff;">ضرائب…</span> }</td>
            <td class="amount-cell" [class.payment]="r.isReturn" [class.invoice]="!r.isReturn">{{ r.isReturn ? '-' : '' }}{{ fmt(r.netInvoice) }}</td>
            <td (click)="$event.stopPropagation()"><div class="row-actions">
              <button class="row-btn" [attr.data-viewinv-btn]="r.id" title="عرض" (click)="openView(r)">👁</button>
              @if (r.withheld > 0 && !r.isReturn && !r.cancelled) { <a class="row-btn" [href]="full" [attr.data-notice]="r.id" [title]="r.postReturnWht ? 'إشعار خصم بعد مرتجع' : 'إشعار خصم'">🧾</a> }
              @if (canEditRow(r)) { <button class="row-btn" [attr.data-editinv]="r.id" title="تعديل" (click)="openEdit(r, r.isReturn)">✎</button> }
              @if (canDelete) { <a class="row-btn del" [href]="full" [attr.data-delinv]="r.id" title="الحذف من الشاشة الكاملة (DEC-0108)">✕</a> }
            </div></td>
          </tr>
        } @empty {
          <tr><td colspan="17" class="table-empty">{{ loaded() && !anyRows() ? 'لا توجد فواتير بعد' : 'لا توجد فواتير مطابقة — جرّب تعديل البحث أو اضغط «مسح الفلاتر»' }}</td></tr>
        }
      </tbody>
    </table></div>
    <div class="btn-row table-pager" data-pager="invoices" style="justify-content:space-between;align-items:center;margin-top:10px;flex-wrap:wrap;gap:8px;">
      <span style="font-size:13px;color:var(--ink-soft);">عرض {{ rows().length ? (curPage() - 1) * pageSize + 1 : 0 }}–{{ min(curPage() * pageSize, rows().length) }} من {{ rows().length }} <span style="opacity:.75;">(20 لكل صفحة)</span></span>
      <div style="display:flex;gap:8px;align-items:center;">
        <button type="button" class="btn btn-outline btn-sm" [disabled]="curPage() <= 1" (click)="page.set(curPage() - 1)">السابق</button>
        <span style="font-size:13px;font-weight:700;">صفحة {{ curPage() }} / {{ pages() }}</span>
        <button type="button" class="btn btn-outline btn-sm" [disabled]="curPage() >= pages()" (click)="page.set(curPage() + 1)">التالي</button>
      </div>
    </div>

    @if (modal() === 'edit') {
      <div class="modal-overlay" id="modalOverlay" (click)="onOverlay($event)">
        <div class="modal wide">
          <h3>{{ e.id ? (e.isReturn ? 'تعديل مرتجع' : 'تعديل الفاتورة') : (e.isReturn ? 'إضافة مرتجع جديد' : 'إضافة فاتورة جديدة') }}</h3>
          <label class="field" style="display:flex;flex-direction:row;align-items:center;gap:8px;background:var(--paper);border:1px solid var(--line);border-radius:8px;padding:9px 12px;">
            <input type="checkbox" id="inv_isReturn" [(ngModel)]="e.isReturn" (ngModelChange)="onReturnToggle()" [disabled]="!!e.internalNo" style="width:16px;height:16px;" />
            <span style="font-weight:700;font-size:13px;">هذا مرتجع (يُخصم من رصيد المورد بدل ما يُضاف عليه)</span>
          </label>
          @if (e.isReturn) {
            <div id="inv_linkedWrap" class="field" style="margin:10px 0;background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:10px 12px;">
              <label style="font-weight:800;margin-bottom:6px;display:block;">ربط بفاتورة أصلية (اختياري)</label>
              <p style="font-size:12px;color:var(--ink-soft);margin:0 0 8px;">تقدر تربط المرتجع بفاتورة معيّنة (مرتجع كامل → الفاتورة الأصلية تُلغى، مرتجع جزئي مع خصم → يُميَّز إشعار خصم على الفاتورة الأصلية)، أو تسيبه بدون ربط ليكون مرتجع مطلق مش مرتبط بفاتورة بعينها.</p>
              <select id="inv_linkedInvoice" style="width:100%;" [(ngModel)]="e.linkedInvoiceId">
                <option value="">— مرتجع مطلق (بدون ربط بفاتورة) —</option>
                @for (l of linkable(); track l.id) { <option [value]="l.id">{{ l.invoiceNo || '-' }} | {{ fmtDate(l.date) }} | صافي {{ fmt(l.netInvoice) }}{{ l.postReturnWht ? ' (بعد مرتجع)' : '' }}</option> }
              </select>
              <p id="inv_linkedHint" style="font-size:12px;color:var(--ink-soft);margin:8px 0 0;">{{ linkedHint() }}</p>
            </div>
          }
          <div class="form-grid" style="margin-bottom:0;">
            <div class="field" style="grid-column:1 / -1;"><label>اسم المورد *</label>
              <div class="ss-cell ss-cell-wide"><select id="inv_supplier" class="supplier-select-wide" [(ngModel)]="e.supplierId" (ngModelChange)="onSupplier()"><option value="">ابحث أو اكتب اسم المورد...</option>@for (s of opts().suppliers; track s.id) { <option [value]="s.id">{{ s.name }}</option> }</select></div></div>
          </div>
          <div class="form-grid cols5" style="margin-top:10px;">
            <div class="field"><label>رقم التسجيل الضريبي</label><input id="inv_taxid_display" [value]="sup()?.taxId ?? ''" disabled style="opacity:.7;" /></div>
            <div class="field"><label>السجل التجاري</label><input id="inv_commreg_display" [value]="sup()?.commercialReg ?? ''" disabled style="opacity:.7;" /></div>
            <div class="field"><label>رقم الفاتورة *</label><input id="inv_number" [(ngModel)]="e.invoiceNo" /></div>
            <div class="field"><label>تاريخ التعامل</label><input type="date" id="inv_date" [(ngModel)]="e.date" /></div>
            @if (!e.isReturn) { <div class="field" id="inv_dueDateWrap"><label>تاريخ الاستحقاق</label><input type="date" id="inv_dueDate" [(ngModel)]="e.dueDate" title="لو فاضي هيتحسب تلقائي = تاريخ الفاتورة + 30 يوم" /></div> }
          </div>
          <div class="form-grid cols5" style="margin-top:10px;">
            <div class="field" style="grid-column:1/-1;">
              <label>الأصناف (الصنف / كود المورد / الكود الداخلي / وصف الصنف / الكمية / سعر الوحدة)</label>
              <div style="display:grid;grid-template-columns:1.2fr 0.9fr 0.9fr 1fr 0.7fr 0.7fr auto;gap:6px;margin-bottom:4px;font-size:11px;color:var(--ink-soft);font-weight:700;">
                <span>الصنف</span><span>كود المورد</span><span>الكود الداخلي</span><span>وصف الصنف</span><span>الكمية</span><span>سعر الوحدة</span><span></span>
              </div>
              <div id="inv_itemsWrap">
                @for (it of items; track $index) {
                  <div class="item-row" data-item-row style="display:grid;grid-template-columns:1.2fr 0.9fr 0.9fr 1fr 0.7fr 0.7fr auto;gap:6px;margin-bottom:8px;align-items:start;">
                    <input class="inv-item-desc" [name]="'d' + $index" list="itemNameListModal" [(ngModel)]="it.desc" placeholder="الصنف" />
                    <input class="inv-item-supplierCode" [name]="'s' + $index" list="supplierItemCodeListModal" [(ngModel)]="it.supplierCode" placeholder="كود المورد" />
                    <input class="inv-item-internalCode" [name]="'i' + $index" list="internalCodeListModal" [(ngModel)]="it.internalCode" placeholder="الكود الداخلي" />
                    <input class="inv-item-itemDescription" [name]="'x' + $index" list="itemDescListModal" [(ngModel)]="it.itemDescription" placeholder="وصف الصنف" />
                    <input class="inv-item-quantity" [name]="'q' + $index" [(ngModel)]="it.quantity" placeholder="الكمية" />
                    <input class="inv-item-unitPrice" [name]="'u' + $index" inputmode="decimal" dir="ltr" [(ngModel)]="it.unitPrice" placeholder="سعر الوحدة" />
                    <button type="button" class="btn btn-outline btn-sm inv-item-del" title="حذف الصنف" (click)="delItem($index)">✕</button>
                  </div>
                }
              </div>
              <button type="button" class="btn btn-outline btn-sm" id="inv_addItemBtn" style="margin-top:4px;" (click)="items.push(emptyItem())">+ إضافة صنف</button>
            </div>
          </div>
          <datalist id="internalCodeListModal">@for (c of opts().internalCodes; track c) { <option [value]="c"></option> }</datalist>
          <datalist id="supplierItemCodeListModal">@for (c of opts().supplierItemCodes; track c) { <option [value]="c"></option> }</datalist>
          <datalist id="itemNameListModal">@for (c of opts().itemNames; track c) { <option [value]="c"></option> }</datalist>
          <datalist id="itemDescListModal">@for (c of opts().itemDescriptions; track c) { <option [value]="c"></option> }</datalist>

          <div class="form-grid cols5" style="margin-top:10px;">
            <div class="field"><label>القيمة الإجمالية للتعامل *</label><input type="text" inputmode="decimal" dir="ltr" autocomplete="off" style="text-align:right;" id="inv_baseValue" [(ngModel)]="e.baseValue" (ngModelChange)="suggestWithheld(false)" placeholder="٠.٠٠" /></div>
            <div class="field"><label>ضريبة القيمة المضافة</label><input type="text" inputmode="decimal" dir="ltr" autocomplete="off" style="text-align:right;" id="inv_vat" [(ngModel)]="e.vat" placeholder="٠.٠٠" /></div>
            <div class="field"><label>الدمغات</label><input type="text" inputmode="decimal" dir="ltr" autocomplete="off" style="text-align:right;" id="inv_stampDuty" [(ngModel)]="e.stampDuty" placeholder="٠.٠٠" /></div>
            <div class="field"><label>نسبة الخصم %</label><input type="number" step="any" id="inv_discountRate" [(ngModel)]="e.discountRate" (ngModelChange)="whManual = false; suggestWithheld(true)" placeholder="اختياري" /></div>
            <div class="field"><label>المبلغ المخصوم</label><input type="text" inputmode="decimal" dir="ltr" autocomplete="off" style="text-align:right;" id="inv_withheld" [(ngModel)]="e.withheld" (ngModelChange)="whManual = true" placeholder="٠.٠٠" /></div>
          </div>
          <div class="form-grid cols5" style="margin-top:10px;">
            <div class="field"><label>إجمالي الفاتورة</label><input type="text" dir="ltr" id="inv_totalInvoice" [value]="calcTotal()" placeholder="يُحسب تلقائياً" readonly style="background:var(--paper-2);font-weight:800;text-align:right;" /></div>
            <div class="field"><label>صافي الفاتورة</label><input type="text" dir="ltr" id="inv_netInvoice" [value]="calcNet()" placeholder="يُحسب تلقائياً" readonly style="background:var(--paper-2);font-weight:800;text-align:right;" /></div>
            <div class="field"><label>طبيعة التعامل</label><div class="ss-cell"><select id="inv_nature" [(ngModel)]="e.nature"><option value="">اكتب أو اختر طبيعة التعامل...</option>@for (o of opts().natures; track o.code) { <option [value]="o.code">{{ o.code }} - {{ o.label }}</option> }</select></div></div>
            <div class="field"><label>نوع الخصم</label><div class="ss-cell"><select id="inv_discountType" [(ngModel)]="e.discountType"><option value="">اكتب أو اختر نوع الخصم...</option>@for (o of opts().discountTypes; track o.code) { <option [value]="o.code">{{ o.code }} - {{ o.label }}</option> }</select></div></div>
            <div class="field"><label>حالة المبلغ المخصوم</label>
              <select id="inv_withheldStatus" [(ngModel)]="e.withheldStatus"><option value="unpaid">لم يتم الدفع للضرائب</option><option value="paid">تم الدفع للضرائب</option></select></div>
          </div>
          <p style="font-size:11.5px;color:var(--ink-soft);margin:10px 0 0;">منظومة موحّدة للفاتورة والمرتجع: <strong>الإجمالي = قيمة + ضريبة + دمغة</strong>، <strong>المخصوم = قيمة × نسبة الخصم</strong>، <strong>الصافي = الإجمالي − المخصوم</strong>. مثال: 1000+140=1140 ومخصوم 10 → صافي 1130. المرتجع بنفس المعادلة (عملية عكسية). كشف الحساب والرصيد على الصافي.</p>
          <div class="form-grid cols3" style="margin-top:12px;">
            <div class="field"><label>نوع الفاتورة (التصنيف)</label><div class="ss-cell"><input id="inv_category" list="invCatList" [(ngModel)]="e.category" placeholder="اكتب أو اختر تصنيف..." autocomplete="off" /></div></div>
            <div class="field"><label>المشروع</label><div class="ss-cell"><input id="inv_project" list="invProjList" [(ngModel)]="e.project" placeholder="اكتب أو اختر مشروع..." autocomplete="off" /></div></div>
            <div class="field"><label>لينك الفاتورة</label>
              <div style="display:flex;gap:6px;">
                <input id="inv_invoiceLink" type="url" [(ngModel)]="e.invoiceLink" placeholder="رابط الفاتورة الأصلية على النت (اختياري)" style="flex:1;" />
                <button type="button" class="btn btn-outline btn-sm" id="inv_openLinkBtn" title="فتح الرابط في المتصفح" style="white-space:nowrap;" (click)="openLink(e.invoiceLink)">🔗 فتح</button>
              </div></div>
          </div>
          <div class="field" style="margin-top:12px;"><label>الملاحظات</label>
            <textarea id="inv_notes" rows="3" [(ngModel)]="e.notes" placeholder="ملاحظات على الفاتورة أو المرتجع (اختياري)..." style="width:100%;resize:vertical;min-height:72px;"></textarea></div>
          <div class="section-title" style="margin-top:14px;font-size:14px;">المرفقات (مسح ضوئي)</div>
          <div id="invFormAttList" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;">@for (a of e.attachments; track $index) { <div class="pill" style="padding:6px 10px;">📎 {{ a.name || 'مرفق' }}</div> }</div>
          <a class="btn btn-outline btn-sm" id="invFormScanAtt" [href]="full" title="إضافة المرفقات من الشاشة الكاملة">📷 مسح ضوئي / كاميرا</a>
          @if (error()) { <div class="err" role="alert" id="invError" style="margin-top:10px;">{{ error() }}</div> }
          <div class="modal-actions">
            <button class="btn btn-outline" id="m_cancel" (click)="close()">إلغاء</button>
            <button class="btn btn-primary" id="m_save" [disabled]="busy()" (click)="save()">{{ e.id ? 'حفظ التعديل' : 'إضافة الفاتورة' }}</button>
          </div>
        </div>
      </div>
    }

    @if (modal() === 'view' && view(); as v) {
      <div class="modal-overlay" id="modalOverlay" (click)="onOverlay($event)">
        <div class="modal wide" id="invViewModal">
          <h3>تفاصيل {{ v.isReturn ? 'المرتجع' : 'الفاتورة' }} @if (v.isReturn) { <span class="pill" style="background:var(--debt);color:#fff;">مرتجع</span> }@if (v.cancelled) { <span class="pill" style="background:#6b7280;color:#fff;">فاتورة ملغاة</span> }@if (v.postReturnWht) { <span class="pill" style="background:#b45309;color:#fff;">إشعار بعد مرتجع</span> }</h3>
          <div class="form-grid" style="gap:10px 16px;">
            <div class="info-field"><label>رقم الفاتورة</label><div style="font-weight:800;font-size:15px;">{{ v.invoiceNo || '-' }}</div></div>
            @if (v.internalNo) { <div class="info-field"><label>الرقم الداخلي</label><div id="invViewInternalNo" style="font-weight:800;">{{ v.internalNo }}</div></div> }
            <div class="info-field"><label>المورد</label><div>{{ v.supplierName || '—' }}</div></div>
            <div class="info-field"><label>رقم التسجيل الضريبي</label><div>{{ v.supplierTaxId || '-' }}</div></div>
            <div class="info-field"><label>السجل التجاري</label><div>{{ supOf(v.supplierId)?.commercialReg || '-' }}</div></div>
            <div class="info-field"><label>تاريخ التعامل</label><div>{{ fmtDate(v.date) || '-' }}</div></div>
            @if (!v.isReturn) { <div class="info-field"><label>تاريخ الاستحقاق</label><div [style.color]="v.overdue ? 'var(--debt)' : null" [style.font-weight]="v.overdue ? 700 : null">{{ v.dueDateEffective || '-' }}{{ v.overdue ? ' (متأخرة)' : '' }}</div></div> }
            <div class="info-field"><label>نوع الفاتورة</label><div>@if (v.category) { <span class="pill">{{ v.category }}</span> } @else { - }</div></div>
            <div class="info-field"><label>المشروع</label><div>@if (v.project) { <span class="pill">{{ v.project }}</span> } @else { - }</div></div>
            @if (v.invoiceLink) { <div class="info-field"><label>لينك الفاتورة</label><div><button type="button" class="btn btn-outline btn-sm" id="m_open_inv_link" (click)="openLink(v.invoiceLink)">🔗 فتح الفاتورة الأصلية</button></div></div> }
            <div class="info-field"><label>طبيعة التعامل</label><div>{{ optLabel(opts().natures, v.nature) }}</div></div>
            <div class="info-field"><label>نوع الخصم</label><div>{{ optLabel(opts().discountTypes, v.discountType) }}</div></div>
            <div class="info-field"><label>نسبة الخصم</label><div>{{ v.discountRate ? v.discountRate + '%' : '-' }}</div></div>
            <div class="info-field"><label>حالة المبلغ المخصوم</label><div>{{ v.withheldStatus === 'paid' ? 'تم الدفع للضرائب' : 'لم يتم الدفع للضرائب' }}</div></div>
            @if (v.notes) { <div class="info-field" style="grid-column:1/-1;"><label>الملاحظات</label><div style="white-space:pre-line;">{{ v.notes }}</div></div> }
            @if (v.isReturn && v.linkedInvoiceId) {
              <div class="info-field" style="grid-column:1/-1;background:var(--paper);padding:10px;border-radius:8px;"><label>مربوط بفاتورة أصلية</label>
                <div style="font-weight:800;">{{ linkedLabel(v) }}</div>
                <button type="button" class="btn btn-outline btn-sm" id="m_open_linked_orig" style="margin-top:6px;" (click)="openViewById(v.linkedInvoiceId)">فتح الفاتورة الأصلية</button></div>
            }
            @if (!v.isReturn && v.linkedReturns?.length) {
              <div class="info-field" style="grid-column:1/-1;background:var(--paper);padding:10px;border-radius:8px;"><label>المرتجعات المرتبطة ({{ v.linkedReturns!.length }})</label>
                <div>@for (x of v.linkedReturns!; track x.id) { <div>{{ x.invoiceNo }} — {{ fmtDate(x.date) }} — صافي {{ fmt(x.netInvoice) }}</div> }</div>
                @for (x of v.linkedReturns!; track x.id) { <button type="button" class="btn btn-outline btn-sm m_open_linked_ret" style="margin:4px 4px 0 0;" (click)="openViewById(x.id)">فتح مرتجع {{ x.invoiceNo }}</button> }</div>
            }
          </div>
          <div style="margin:14px 0 6px;">
            <div style="font-weight:800;font-size:13.5px;margin-bottom:8px;">الأصناف (الصنف / كود المورد / الكود الداخلي / وصف الصنف / الكمية / سعر الوحدة)</div>
            @if (viewItems(v).length) {
              <div class="table-wrap" style="border:1px solid var(--line);border-radius:10px;overflow:hidden;"><table style="width:100%;border-collapse:collapse;">
                <thead><tr style="background:var(--paper);">@for (h of itemHeads; track h) { <th style="padding:8px 10px;text-align:right;font-size:12.5px;">{{ h }}</th> }</tr></thead>
                <tbody>@for (it of viewItems(v); track $index) {
                  <tr><td style="padding:8px 10px;border-bottom:1px solid var(--line);">{{ it.desc || '—' }}</td>
                    <td style="padding:8px 10px;border-bottom:1px solid var(--line);direction:ltr;text-align:right;font-size:13px;">{{ it.supplierCode || '—' }}</td>
                    <td style="padding:8px 10px;border-bottom:1px solid var(--line);direction:ltr;text-align:right;font-size:13px;">{{ it.internalCode || '—' }}</td>
                    <td style="padding:8px 10px;border-bottom:1px solid var(--line);">{{ it.itemDescription || '—' }}</td>
                    <td style="padding:8px 10px;border-bottom:1px solid var(--line);">{{ it.quantity || '—' }}</td>
                    <td style="padding:8px 10px;border-bottom:1px solid var(--line);">{{ fmtText(it.unitPrice) || '—' }}</td></tr>
                }</tbody></table></div>
            } @else { <p style="color:var(--ink-soft);font-size:13px;margin:0;">لا توجد أصناف مسجّلة</p> }
          </div>
          <div class="stats-row" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr));margin:16px 0 8px;">
            <div class="stat-card"><div class="num" style="font-size:16px;">{{ fmt(v.baseValue) }}</div><div class="lbl">القيمة</div></div>
            <div class="stat-card"><div class="num" style="font-size:16px;">{{ fmt(v.vat) }}</div><div class="lbl">الضريبة</div></div>
            <div class="stat-card"><div class="num" style="font-size:16px;">{{ fmt(v.stampDuty) }}</div><div class="lbl">الدمغات</div></div>
            <div class="stat-card"><div class="num" style="font-size:16px;">{{ fmt(v.totalInvoice) }}</div><div class="lbl">إجمالي الفاتورة</div></div>
            <div class="stat-card"><div class="num" style="font-size:16px;">{{ fmt(v.withheld) }}</div><div class="lbl">المخصوم</div></div>
            <div class="stat-card"><div class="num" style="font-size:16px;">{{ fmt(v.netInvoice) }}</div><div class="lbl">الصافي</div></div>
            <div class="stat-card"><div class="num" style="font-size:16px;" id="invViewPaid">{{ fmt(v.paid) }}</div><div class="lbl">المدفوع</div></div>
          </div>
          <div class="section-title" style="margin-top:8px;">المرفقات ({{ (v.attachments ?? []).length }})</div>
          <div id="invAttList" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">@for (a of v.attachments ?? []; track $index) { <div class="pill" style="padding:6px 10px;display:flex;align-items:center;gap:6px;"><a class="row-btn" [href]="full" title="فتح المرفق من الشاشة الكاملة">{{ a.name }}</a></div> } @empty { <span style="color:var(--ink-soft);font-size:13px;">لا توجد مرفقات</span> }</div>
          <div class="modal-actions">
            <button class="btn btn-outline" id="m_close_view" (click)="close()">إغلاق</button>
            <a class="btn btn-outline" id="m_scan_att" [href]="full" title="المرفقات من الشاشة الكاملة">📷 مسح / كاميرا</a>
            @if (canAdd) { <button class="btn btn-outline" id="m_copy_inv" (click)="copyAsNew(v)">نسخ كفاتورة جديدة</button> }
            @if (v.withheld > 0 && !v.isReturn && !v.cancelled) { <a class="btn btn-outline" id="m_view_notice" [href]="full">{{ v.postReturnWht ? 'إشعار خصم بعد مرتجع' : 'إشعار خصم' }}</a> }
            @if (canEditRow(v)) { <button class="btn btn-primary" id="m_view_edit" (click)="openEdit(v, v.isReturn)">تعديل</button> }
          </div>
        </div>
      </div>
    }`,
})
export class SupplierInvoicesPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = new LegacyToast();
  readonly mode: Mode = this.route.snapshot.data['mode'] === 'returns' ? 'returns' : 'invoices';
  readonly isRet = this.mode === 'returns';
  readonly canAdd = this.session.can('ledger.invoices', 'add');
  readonly canAddReturn = this.session.can('ledger.returns', 'add') || this.canAdd;
  readonly canDelete = this.session.can(this.isRet ? 'ledger.returns' : 'ledger.invoices', 'delete');
  readonly full = legacyUrl(this.isRet ? 'ledger.returns' : 'ledger.invoices');
  readonly months = MONTHS; readonly statuses = STATUS; /* زي القديم: نفس قايمة الحالات في الصفحتين (PF_STATUS_INVOICES) */ readonly sorts = SORTS; readonly pageSize = PAGE_SIZE; readonly min = Math.min;

  readonly opts = signal<Options>({ moneyDecimals: 6, suppliers: [], categories: [], projects: [], internalCodes: [], supplierItemCodes: [], itemNames: [], itemDescriptions: [], natures: [], discountTypes: [] });
  readonly rows = signal<Inv[]>([]); readonly totals = signal<Totals>({ count: 0, gross: 0, vat: 0, stamp: 0, withheld: 0, net: 0 }); readonly years = signal<string[]>([]);
  readonly loaded = signal(false); readonly anyRows = signal(false);
  readonly page = signal(1); readonly error = signal(''); readonly busy = signal(false);
  readonly modal = signal<'edit' | 'view' | null>(null); readonly view = signal<Inv | null>(null); readonly linkable = signal<Linkable[]>([]);
  f = { ...EMPTY_FILTERS };
  e: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any -- نموذج النافذة بنفس خانات القديمة (نصوص)
  items: ItemRow[] = [];
  whManual = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly pages = computed(() => Math.max(1, Math.ceil(this.rows().length / PAGE_SIZE)));
  readonly curPage = computed(() => Math.min(this.page(), this.pages()));
  readonly pageRows = computed(() => this.rows().slice((this.curPage() - 1) * PAGE_SIZE, this.curPage() * PAGE_SIZE));
  sup = () => this.opts().suppliers.find((s) => s.id === this.e['supplierId']);
  supOf = (id: string) => this.opts().suppliers.find((s) => s.id === id);
  readonly itemHeads = ['الصنف', 'كود المورد', 'الكود الداخلي', 'وصف الصنف', 'الكمية', 'سعر الوحدة'];
  viewItems = (v: Inv) => this.splitItems(v).map((r) => ({ desc: r.desc.trim(), supplierCode: r.supplierCode.trim(), internalCode: r.internalCode.trim(), itemDescription: r.itemDescription.trim(), quantity: r.quantity.trim(), unitPrice: r.unitPrice.trim() }))
    .filter((r) => r.desc || r.supplierCode || r.internalCode || r.itemDescription || r.quantity || r.unitPrice);
  /** fmtText: سعر الوحدة المحفوظ كنص */
  fmtText = (v: string) => { const t = String(v ?? '').trim(); if (!t) return ''; const p = toLatin(t).replace(/[,\u066C\s]/g, '').replace(/\u066B/g, '.'); return /^-?\d+(\.\d+)?$/.test(p) ? this.fmt(parseFloat(p)) : t; };
  linkedLabel = (v: Inv) => { const li = this.rows().find((x) => x.id === v.linkedInvoiceId) ?? this.linkable().find((x) => x.id === v.linkedInvoiceId); return li ? `${li.invoiceNo || ''} — ${this.fmtDate(li.date)} — صافي ${this.fmt(li.netInvoice)}${(li as Inv).cancelled ? ' (ملغاة)' : ''}` : String(v.linkedInvoiceId); };
  pad = (n: number) => String(n).padStart(2, '0');
  /** truncateMultilineForTable (helpers.js:1831): أول سطرين + «… +N أصناف» */
  trunc = (v?: string): [string, number] => { const lines = String(v ?? '').replace(/\r\n?/g, '\n').trim().split('\n').map((l) => l.trim()).filter(Boolean); return lines.length ? [lines.slice(0, 2).join('\n'), Math.max(0, lines.length - 2)] : ['-', 0]; };
  /** codeDescription (modals.js:190) */
  optLabel = (list: Opt[], code?: string) => { const o = list.find((x) => x.code === String(code)); return o ? `${o.code} — ${o.label}` : code ? String(code) : '-'; };
  /** lgFmtDate: يوم/شهر/سنة */
  fmtDate = (v: string) => legacyFmtDate(v);
  /** fmt (helpers.js:279) — مشترك في core/legacy-format.ts */
  fmt(n: unknown): string { return legacyFmt(n, this.opts().moneyDecimals); }

  /** invoiceRowClass (helpers.js:2022) */
  rowClass(r: Inv) { return [r.isReturn ? 'row-return' : '', r.overdue ? 'row-overdue' : '', r.missing.length ? 'row-incomplete' : ''].filter(Boolean).join(' '); }
  /** زي القديم: زرار التعديل بصلاحية «تعديل» على صفحة الفواتير */
  canEditRow = (_r: Inv) => this.session.can('ledger.invoices', 'edit');

  ngOnInit() { void this.loadOptions(); void this.load(); }
  private async loadOptions() {
    try { this.opts.set(await firstValueFrom(this.http.get<Options>('/api/v1/supplier-invoices/options'))); } catch (e) { this.error.set(errorMessage(e, 'تعذر تحميل الاختيارات')); }
  }
  reload(debounce = false) {
    this.page.set(1);
    if (this.timer) clearTimeout(this.timer);
    if (debounce) this.timer = setTimeout(() => void this.load(), 250); else void this.load();
  }
  resetFilters() { this.f = { ...EMPTY_FILTERS }; this.reload(); }
  async load() {
    let p = new HttpParams().set('mode', this.mode);
    for (const [k, v] of Object.entries(this.f)) { if (k === 'overdueOnly') { if (v && !this.isRet) p = p.set(k, '1'); } else if (v !== '' && v != null && !(k === 'sort' && v === 'new')) p = p.set(k, String(v)); }
    try {
      const r = await firstValueFrom(this.http.get<{ rows: Inv[]; totals: Totals; years: string[] }>('/api/v1/supplier-invoices', { params: p }));
      this.rows.set(r.rows); this.totals.set(r.totals); this.years.set(r.years); this.loaded.set(true); this.anyRows.set(r.years.length > 0 || r.rows.length > 0);
    } catch (e) { this.error.set(errorMessage(e, 'تعذر تحميل الفواتير')); }
  }

  // ---------------- النافذة (زي openAddEditInvoiceModal)
  emptyItem(): ItemRow { return { desc: '', supplierCode: '', internalCode: '', itemDescription: '', quantity: '', unitPrice: '' }; }
  private splitItems(r?: Partial<Inv>): ItemRow[] {
    const L = (v?: string) => String(v ?? '').split('\n');
    const d = L(r?.description), s = L(r?.supplierItemCode), i = L(r?.internalCode), x = L(r?.itemDescription), q = L(r?.quantity), u = L(r?.unitPrice);
    const n = Math.max(d.length, s.length, i.length, x.length, q.length, u.length);
    const rows = Array.from({ length: n }, (_, k) => ({ desc: d[k] ?? '', supplierCode: s[k] ?? '', internalCode: i[k] ?? '', itemDescription: x[k] ?? '', quantity: q[k] ?? '', unitPrice: u[k] ?? '' }));
    return rows.length ? rows : [this.emptyItem()];
  }
  delItem(i: number) { if (this.items.length <= 1) { this.toast.show('لازم يفضل صنف واحد على الأقل'); return; } this.items.splice(i, 1); }
  openEdit(r: Inv | null, asReturn: boolean) {
    if (!this.opts().suppliers.length) { this.toast.show('أضِف مورداً أولاً قبل إدخال فاتورة'); return; }
    const num = (v: unknown) => (v === undefined || v === null || v === '' || Number(v) === 0 ? '' : String(v));
    this.e = r ? { ...r, baseValue: num(r.baseValue), vat: num(r.vat), stampDuty: num(r.stampDuty), withheld: num(r.withheld), discountRate: r.discountRate ?? '', withheldStatus: r.withheldStatus || 'unpaid', linkedInvoiceId: r.linkedInvoiceId ?? '', attachments: r.attachments ?? [] }
      : { supplierId: this.f.supplierId || '', invoiceNo: '', date: '', dueDate: '', isReturn: asReturn, linkedInvoiceId: '', baseValue: '', vat: '', stampDuty: '', discountRate: '', withheld: '', withheldStatus: 'unpaid', nature: '', discountType: '', category: '', project: '', invoiceLink: '', notes: '', attachments: [] };
    this.items = this.splitItems(r ?? undefined);
    this.whManual = !!r; this.error.set(''); this.modal.set('edit');
    void this.loadLinkable();
  }
  copyAsNew(v: Inv) { this.openEdit({ ...v, id: '', rev: 0, invoiceNo: '', internalNo: undefined, attachments: [] } as Inv, v.isReturn); this.e['id'] = undefined; this.e['internalNo'] = undefined; this.e['linkedInvoiceId'] = ''; }
  onReturnToggle() { if (!this.e['isReturn']) this.e['linkedInvoiceId'] = ''; void this.loadLinkable(); }
  onSupplier() { this.e['linkedInvoiceId'] = ''; void this.loadLinkable(); }
  private async loadLinkable() {
    if (!this.e['isReturn'] || !this.e['supplierId']) { this.linkable.set([]); return; }
    const keep = this.e['id'] ? (this.rows().find((x) => x.id === this.e['id'])?.linkedInvoiceId ?? this.e['linkedInvoiceId']) : '';
    let p = new HttpParams().set('supplierId', this.e['supplierId']); if (keep) p = p.set('keep', keep);
    try { this.linkable.set(await firstValueFrom(this.http.get<Linkable[]>('/api/v1/supplier-invoices/linkable', { params: p }))); } catch { this.linkable.set([]); }
  }
  linkedHint() {
    const lid = this.e['linkedInvoiceId'];
    if (!lid) return 'مرتجع مطلق غير مرتبط بفاتورة معيّنة — هيُخصم من رصيد المورد بس مش هيتم إلغاء أو تمييز أي فاتورة تانية.';
    const inv = this.linkable().find((x) => x.id === lid); if (!inv) return '';
    const full = (Number(plain(this.e['baseValue'])) || 0) + (Number(plain(this.e['vat'])) || 0) + (Number(plain(this.e['stampDuty'])) || 0) - (Number(plain(this.e['withheld'])) || 0) >= Number(inv.netInvoice || 0) - 0.02;
    return full ? 'مرتجع كامل: الفاتورة الأصلية هتتلغي (أثرها المالي صفر).' : 'مرتجع جزئي: الفاتورة الأصلية هتفضل، ولو عليها خصم هيتميّز «إشعار بعد مرتجع».';
  }
  /** suggestWithheld: النسبة × القيمة ÷ 100 بتتحط في المخصوم، إلا لو المستخدم عدّله يدويًا بعد النسبة */
  suggestWithheld(force: boolean) {
    if (!force && this.whManual) return;
    const dr = Number(plain(this.e['discountRate'])) || 0;
    if (dr > 0) this.e['withheld'] = String(roundMoney((Number(plain(this.e['baseValue'])) || 0) * dr / 100, 6)); // خانات المبالغ 6 (DEC-0112)
  }
  /** عرض بس (recalcTotals) — الحساب المعتمد من السيرفر بست خانات (DEC-0107، DEC-0112) */
  calcTotal() { const t = (Number(plain(this.e['baseValue'])) || 0) + (Number(plain(this.e['vat'])) || 0) + (Number(plain(this.e['stampDuty'])) || 0); return this.fmt(roundMoney(t, 6)).replace(/[⁦⁩]/g, ''); }
  calcNet() { const t = (Number(plain(this.e['baseValue'])) || 0) + (Number(plain(this.e['vat'])) || 0) + (Number(plain(this.e['stampDuty'])) || 0) - (Number(plain(this.e['withheld'])) || 0); return this.fmt(roundMoney(t, 6)).replace(/[⁦⁩]/g, ''); }
  openLink(url?: string) {
    const u = String(url ?? '').trim();
    if (!u) { this.toast.show('اكتب رابط الفاتورة الأصلية الأول'); return; }
    if (!/^https?:\/\//i.test(u)) { this.toast.show('الرابط لازم يبدأ بـ http:// أو https://'); return; }
    window.open(u, '_blank', 'noopener');
  }

  async save() {
    const e = this.e;
    const rows = this.items.map((r) => ({ desc: r.desc.trim(), supplierCode: r.supplierCode.trim(), internalCode: r.internalCode.trim(), itemDescription: r.itemDescription.trim(), quantity: r.quantity.trim(), unitPrice: plain(r.unitPrice) }))
      .filter((r) => r.desc || r.supplierCode || r.internalCode || r.itemDescription || r.quantity || r.unitPrice);
    const join = (k: keyof ItemRow) => rows.map((r) => r[k]).join('\n');
    const money = (v: unknown) => { const s = plain(v); return s === '' ? '0' : s; };
    const body: Record<string, unknown> = {
      supplierId: e['supplierId'] ?? '', invoiceNo: String(e['invoiceNo'] ?? '').trim(), date: e['date'] ?? '', dueDate: e['isReturn'] ? '' : e['dueDate'] ?? '', isReturn: !!e['isReturn'],
      linkedInvoiceId: e['isReturn'] ? e['linkedInvoiceId'] ?? '' : '', baseValue: money(e['baseValue']), vat: money(e['vat']), stampDuty: money(e['stampDuty']), withheld: money(e['withheld']),
      discountRate: String(e['discountRate'] ?? '').trim(), withheldStatus: e['withheldStatus'] || 'unpaid', nature: e['nature'] ?? '', discountType: e['discountType'] ?? '',
      category: String(e['category'] ?? '').trim(), project: String(e['project'] ?? '').trim(), invoiceLink: String(e['invoiceLink'] ?? '').trim(), notes: String(e['notes'] ?? '').trim(),
      description: join('desc'), supplierItemCode: join('supplierCode'), internalCode: join('internalCode'), itemDescription: join('itemDescription'), quantity: join('quantity'), unitPrice: join('unitPrice'),
    };
    // نفس رسايل validateInvoiceFields للخانات الإلزامية قبل الإرسال (والسيرفر بيتحقق من الكل)
    if (!body['supplierId']) { this.error.set('المورد مطلوب'); return; }
    if (!body['invoiceNo']) { this.error.set('رقم الفاتورة مطلوب'); return; }
    if (!body['date']) { this.error.set('تاريخ التعامل مطلوب'); return; }
    if (!/^\d{1,14}(\.\d{1,6})?$/.test(String(body['baseValue']))) { this.error.set('القيمة الإجمالية لازم تكون رقم بحد أقصى 6 خانات عشرية'); return; }
    this.busy.set(true); this.error.set('');
    try {
      const saved = e['id']
        ? await firstValueFrom(this.http.patch<Inv>(`/api/v1/supplier-invoices/${e['id']}`, { ...body, rev: e['rev'] }))
        : await firstValueFrom(this.http.post<Inv>('/api/v1/supplier-invoices', body, { headers: new HttpHeaders({ 'Idempotency-Key': `si-${crypto.randomUUID()}` }) }));
      this.modal.set(null);
      this.toast.show(e['id'] ? (saved.isReturn ? 'تم تحديث المرتجع' : 'تم تحديث الفاتورة') : (saved.isReturn ? 'تم إضافة المرتجع' : 'تم إضافة الفاتورة'));
      await Promise.all([this.load(), this.loadOptions()]);
    } catch (err) { this.error.set(errorMessage(err, 'تعذر الحفظ')); } finally { this.busy.set(false); }
  }

  // ---------------- نافذة العرض (زي openViewInvoiceModal)
  async openView(r: Inv) { await this.openViewById(r.id); }
  async openViewById(id: string) {
    try { this.view.set(await firstValueFrom(this.http.get<Inv>(`/api/v1/supplier-invoices/${id}`))); this.error.set(''); this.modal.set('view'); }
    catch (e) { this.error.set(errorMessage(e, 'تعذر فتح الفاتورة')); }
  }
  close() { this.modal.set(null); this.error.set(''); }
  /** إغلاق بالضغط على الخلفية بس. مابيرجّعش قيمة: Angular بيلغي الحدث (preventDefault) لو المعالج رجّع false */
  onOverlay(ev: MouseEvent) { if (ev.target === ev.currentTarget) this.close(); }
}
