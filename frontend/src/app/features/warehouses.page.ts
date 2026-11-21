import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { legacyUrl } from '../core/page-routes';
import { errorMessage, SessionService } from '../core/session.service';
import { LegacyToast } from './legacy-toast';

interface Bal { locationId: string; balance: string; reserved: string }
interface Item { id: string; code: string; name: string; unit: string; category: string; minQty: string | null; notes: string; avgCost: string | null; lastCost: string | null; rev: number; balances: Bal[]; total: string; issues: string[] }
interface Loc { id: string; name: string; notes: string; rev: number }
interface Move { id: string; type: string; itemId: string; qty: number; locationId?: string; toLocationId?: string; date?: string; adjustmentId?: string; supplierInvoiceId?: string; supplierName?: string; project?: string; notes?: string }
interface Adj { id: string; kind: string; direction: string; itemId: string; locationId: string; toLocationId: string | null; qty: string; reason: string; status: string; postError: string | null; createdBy: string }
type Tab = 'stock' | 'items' | 'moves' | 'locations' | 'adjustments';

const KINDS: [string, string][] = [['increase', 'تسوية زيادة'], ['deficit', 'تسوية عجز'], ['damage', 'تلف أو إعدام'], ['correction', 'تصحيح خطأ تسجيل'], ['stocktake', 'نتيجة جرد'], ['transfer', 'تحويل مخزني']];
const STATUS: Record<string, string> = { draft: 'مسودة', submitted: 'بانتظار الاعتماد', approved: 'معتمدة (لم تُرحّل)', posted: 'مرحّلة', rejected: 'مرفوضة', returned: 'مرتجعة', cancelled: 'ملغاة', withdrawn: 'مسحوبة' };
const TYPES: Record<string, string> = { in: 'استلام', out: 'صرف', transfer: 'تحويل', adjust_in: 'تسوية+', adjust_out: 'تسوية-' };
const TITLES: Record<Tab, [string, string]> = {
  stock: ['المخازن', 'أصناف · أرصدة · استلام من الموردين · صرف على المشاريع'], items: ['الأصناف', 'كتالوج أصناف المخزن'],
  moves: ['حركات المخزن', 'استلام · صرف · تحويل · تسوية'], locations: ['المخازن / المواقع', 'مواقع التخزين'], adjustments: ['التسويات المخزنية', 'طلب ← اعتماد ← ترحيل آلي (B-51)'],
};
const PAGE_SIZE = 20;
/** تطبيع البحث (زي smartMatch): همزات/ى/ة/تشكيل وحالة الحروف — كل كلمة لازم تتلاقي */
const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').trim();
const matches = (q: string, fields: unknown[]) => { const t = norm(q).split(/\s+/).filter(Boolean); const hay = norm(fields.join(' ')); return t.every((x) => hay.includes(x)); };

/**
 * المخازن — بنفس شكل الواجهة القديمة (DEC-0093/DEC-0097): renderer/modules/warehouses/pages-home.js (التبويبات الأربعة والكروت
 * والفلاتر والجداول والصفحات) ونوافذ الصنف والمخزن والتحويل، بكلاسات legacy-skin.css. تبويب «التسويات» إضافة (B-51) بنفس الشكل.
 * الأرصدة والملاحظات وكود الحركة من السيرفر بنفس قواعد الدوال القديمة (tests-merge/phase65.js). B-50 بيتفرض من قاعدة البيانات.
 * الاستلام والصرف بتكلفتهم، والتكلفة والقيمة، وحذف الصنف: من الشاشة الكاملة لحد اعتماد معادلة التكلفة (B-20) — DEC-0097.
 */
@Component({
  selector: 'app-warehouses',
  imports: [FormsModule, NgTemplateOutlet],
  template: `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div><h2 class="page-title" style="margin:0;">{{ title()[0] }}</h2><p class="page-sub" style="margin:4px 0 0;">{{ title()[1] }}</p></div>
      </div>
      <div class="btn-row" style="margin-bottom:12px;flex-wrap:wrap;gap:6px;" id="whTabs">
        @for (t of tabs; track t[0]) { <button type="button" class="btn btn-sm wh-tab" [class.btn-primary]="tab() === t[0]" [class.btn-outline]="tab() !== t[0]" [attr.data-tab]="t[0]" (click)="setTab(t[0])">{{ t[1] }}</button> }
        @if (canAdd && (tab() === 'stock' || tab() === 'moves')) {
          <a class="btn btn-primary btn-sm" [href]="full" id="btnWhIn" style="margin-right:auto;" title="الاستلام بتكلفته من الشاشة الكاملة (B-20)">+ استلام</a>
          <a class="btn btn-outline btn-sm" [href]="full" id="btnWhOut" title="الصرف من الشاشة الكاملة (B-20)">+ صرف</a>
          <button type="button" class="btn btn-outline btn-sm" id="btnWhTransfer" (click)="openTransfer()">+ تحويل</button>
        }
        @if (canAdd && tab() === 'items') { <button type="button" class="btn btn-primary btn-sm" id="btnWhAddItem" style="margin-right:auto;" (click)="openItem()">+ صنف</button> }
        @if (canAdd && tab() === 'locations') { <button type="button" class="btn btn-primary btn-sm" id="btnWhAddLoc" style="margin-right:auto;" (click)="openLoc()">+ مخزن</button> }
        @if (canAdd && tab() === 'adjustments') { <button type="button" class="btn btn-primary btn-sm" id="btnWhAddAdj" style="margin-right:auto;" (click)="openAdj()">+ تسوية</button> }
      </div>
      @if (error() && !modal()) { <div class="err" role="alert" id="whError">{{ error() }}</div> }

      @switch (tab()) {
        @case ('stock') {
          <div class="stats-row" style="margin-bottom:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;" id="whStats">
            <div class="stat-card"><div class="num">{{ items().length }}</div><div class="lbl">أصناف</div></div>
            <div class="stat-card"><div class="num">{{ locations().length }}</div><div class="lbl">مخازن</div></div>
            <div class="stat-card"><div class="num">{{ movementsCount() }}</div><div class="lbl">حركات</div></div>
            <div class="stat-card" title="القيمة في الشاشة الكاملة لحد اعتماد معادلة التكلفة (B-20)"><div class="num">—</div><div class="lbl">قيمة المخزون</div></div>
          </div>
          <div class="filters-bar">
            <input type="search" id="whSearch" class="input" placeholder="بحث أصناف..." style="min-width:200px;flex:1;" [(ngModel)]="q" (ngModelChange)="page.set(1)" />
            <select id="whLoc" class="input" style="min-width:160px;" [(ngModel)]="loc" (ngModelChange)="page.set(1)"><option value="">كل المخازن</option>@for (l of locations(); track l.id) { <option [value]="l.id">{{ l.name }}</option> }</select>
          </div>
          <div class="table-wrap"><table class="data-table" id="whItems">
            <thead><tr><th>الكود</th><th>الصنف</th><th>الوحدة</th><th>الرصيد</th><th>تكلفة متوسطة</th><th>القيمة</th><th>ملاحظات</th></tr></thead>
            <tbody>
              @for (i of pageOf(stockRows()); track i.id) {
                <tr [attr.data-id]="i.id"><td>{{ i.code }}</td><td><strong>{{ i.name }}</strong></td><td>{{ i.unit }}</td><td [attr.data-total]="i.total"><strong>{{ qtyAt(i) }}</strong></td>
                  <td>{{ cost(i) }}</td><td title="في الشاشة الكاملة (B-20)">—</td>
                  <td class="notes-cell">@if (i.issues.length) { <ul class="notes-list" [title]="i.issues.join('\\n')">@for (x of i.issues.slice(0, 3); track $index) { <li>{{ x }}</li> }</ul> } @else { <span class="notes-ok">✓ مكتمل</span> }</td></tr>
              } @empty { <tr><td colspan="7" style="text-align:center;color:var(--ink-soft);padding:24px;">لا أصناف — أضف أصنافاً من تبويب الأصناف</td></tr> }
            </tbody>
          </table></div>
          <ng-container *ngTemplateOutlet="pager; context: { $implicit: stockRows().length }" />
        }
        @case ('items') {
          <div class="filters-bar"><input type="search" id="whSearch" class="input" placeholder="بحث..." style="min-width:220px;" [(ngModel)]="q" (ngModelChange)="page.set(1)" /></div>
          <div class="table-wrap"><table class="data-table" id="whItemsList">
            <thead><tr><th>الكود</th><th>الاسم</th><th>الوحدة</th><th>التصنيف</th><th>حد الطلب</th><th>تكلفة</th><th></th></tr></thead>
            <tbody>
              @for (i of pageOf(itemRows()); track i.id) {
                <tr [attr.data-id]="i.id"><td>{{ i.code }}</td><td><strong>{{ i.name }}</strong></td><td>{{ i.unit }}</td><td>{{ i.category || '—' }}</td><td>{{ i.minQty ?? '—' }}</td><td>{{ cost(i) }}</td>
                  <td style="white-space:nowrap;">@if (canEdit) { <button type="button" class="icon-btn btn-edit-item" [attr.data-id]="i.id" (click)="openItem(i)">✏️</button> } <a class="icon-btn icon-del btn-del-item" [href]="full" title="الحذف من الشاشة الكاملة">🗑️</a></td></tr>
              } @empty { <tr><td colspan="7" style="text-align:center;color:var(--ink-soft);padding:24px;">لا أصناف</td></tr> }
            </tbody>
          </table></div>
          <ng-container *ngTemplateOutlet="pager; context: { $implicit: itemRows().length }" />
        }
        @case ('moves') {
          <div class="filters-bar">
            <input type="search" id="whSearch" class="input" placeholder="بحث..." style="min-width:200px;flex:1;" [(ngModel)]="q" (ngModelChange)="page.set(1)" />
            <select id="whLoc" class="input" style="min-width:160px;" [(ngModel)]="loc" (ngModelChange)="page.set(1)"><option value="">كل المخازن</option>@for (l of locations(); track l.id) { <option [value]="l.id">{{ l.name }}</option> }</select>
          </div>
          <div class="table-wrap"><table class="data-table" id="whMoves">
            <thead><tr><th>الكود</th><th>التاريخ</th><th>النوع</th><th>الصنف</th><th>الكمية</th><th>المخزن</th><th>مرجع</th></tr></thead>
            <tbody>
              @for (m of pageOf(moveRows()); track m.id) {
                <tr [attr.data-id]="m.id"><td>{{ m.id }}</td><td>{{ m.date }}</td><td>{{ typeLabel(m.type) }}</td><td>{{ itemName(m.itemId) }}</td><td><strong>{{ m.qty }}</strong></td><td>{{ locName(m.locationId) }}</td><td>{{ ref(m) }}</td></tr>
              } @empty { <tr><td colspan="7" style="text-align:center;color:var(--ink-soft);padding:24px;">لا حركات</td></tr> }
            </tbody>
          </table></div>
          <ng-container *ngTemplateOutlet="pager; context: { $implicit: moveRows().length }" />
        }
        @case ('locations') {
          <div class="table-wrap"><table class="data-table" id="whLocations">
            <thead><tr><th>الكود</th><th>الاسم</th><th>ملاحظات</th><th></th></tr></thead>
            <tbody>
              @for (l of locations(); track l.id) {
                <tr [attr.data-id]="l.id"><td>{{ l.id }}</td><td><strong>{{ l.name }}</strong></td><td>{{ l.notes }}</td><td>@if (canEdit) { <button type="button" class="icon-btn btn-edit-loc" [attr.data-id]="l.id" (click)="openLoc(l)">✏️</button> }</td></tr>
              } @empty { <tr><td colspan="4" style="text-align:center;color:var(--ink-soft);">لا مخازن</td></tr> }
            </tbody>
          </table></div>
        }
        @case ('adjustments') {
          <div class="table-wrap"><table class="data-table" id="whAdjs">
            <thead><tr><th>النوع</th><th>الصنف</th><th>المخزن</th><th>الكمية</th><th>السبب</th><th>الحالة</th><th></th></tr></thead>
            <tbody>
              @for (a of adjs(); track a.id) {
                <tr [attr.data-id]="a.id" [attr.data-status]="a.status"><td>{{ kindLabel(a.kind) }}</td><td>{{ itemName(a.itemId) }}</td><td>{{ locName(a.locationId) }}@if (a.toLocationId) { → {{ locName(a.toLocationId) }} }</td><td><strong>{{ +a.qty }}</strong></td><td>{{ a.reason }}</td>
                  <td>{{ statusLabel(a.status) }}@if (a.postError) { <div style="color:var(--debt);font-size:12px;">تعذّر الترحيل: الرصيد غير كافٍ</div> }</td>
                  <td style="white-space:nowrap;">
                    @if ((a.status === 'draft' || a.status === 'returned') && a.createdBy === me()?.id) { <button type="button" class="btn btn-primary btn-sm" (click)="adjAct(a, 'submit')" data-act="submit">إرسال للاعتماد</button> }
                    @if (['draft','returned','submitted','approved'].includes(a.status) && (a.createdBy === me()?.id || me()?.permissions?.manageUsers)) { <button type="button" class="btn btn-outline btn-sm" (click)="adjAct(a, 'cancel')" data-act="cancel">إلغاء</button> }
                    @if (a.status === 'approved' && me()?.docActions?.post) { <button type="button" class="btn btn-outline btn-sm" (click)="adjAct(a, 'post')" data-act="post">إعادة الترحيل</button> }
                  </td></tr>
              } @empty { <tr><td colspan="7" style="text-align:center;color:var(--ink-soft);padding:24px;">لا توجد تسويات</td></tr> }
            </tbody>
          </table></div>
          <p class="page-sub">الاعتماد من «بانتظار اعتمادي». المنشئ مايعتمدش طلبه، والكمية مابتدخلش الرصيد إلا بعد الترحيل.</p>
        }
      }
    </div>

    <ng-template #pager let-total>
      <div class="btn-row table-pager" style="justify-content:space-between;align-items:center;margin-top:10px;flex-wrap:wrap;gap:8px;">
        <span style="font-size:13px;color:var(--ink-soft);">عرض {{ total ? (curPage(total) - 1) * pageSize + 1 : 0 }}–{{ min(curPage(total) * pageSize, total) }} من {{ total }} <span style="opacity:.75;">({{ pageSize }} صف لكل صفحة)</span></span>
        <div style="display:flex;gap:8px;align-items:center;">
          <button type="button" class="btn btn-outline btn-sm" [disabled]="curPage(total) <= 1" (click)="page.set(curPage(total) - 1)">السابق</button>
          <span style="font-size:13px;font-weight:700;">صفحة {{ curPage(total) }} / {{ pages(total) }}</span>
          <button type="button" class="btn btn-outline btn-sm" [disabled]="curPage(total) >= pages(total)" (click)="page.set(curPage(total) + 1)">التالي</button>
        </div>
      </div>
    </ng-template>

    @if (modal(); as m) {
      <div class="modal-overlay" id="appModal" (click)="onOverlay($event)">
        <div class="modal modal-wide">
          <form id="whModalForm" (ngSubmit)="saveModal()">
            <div class="modal-header"><h3>{{ m.title }}</h3><button type="button" class="modal-close" (click)="close()">×</button></div>
            <div class="modal-body"><div class="form-grid form-grid-2">
              @switch (m.kind) {
                @case ('item') {
                  <label>الكود<input class="input" name="whICode" data-field="code" placeholder="تلقائي" [(ngModel)]="f['code']" /></label>
                  <label>الاسم *<input class="input" name="whIName" data-field="name" [(ngModel)]="f['name']" /></label>
                  <label>الوحدة<input class="input" name="whIUnit" data-field="unit" [(ngModel)]="f['unit']" /></label>
                  <label>التصنيف<input class="input" name="whICat" data-field="category" [(ngModel)]="f['category']" /></label>
                  <label>حد الطلب<input class="input" name="whIMin" data-field="minQty" inputmode="decimal" dir="ltr" [(ngModel)]="f['minQty']" /></label>
                  <label title="التكلفة بتتحسب من الاستلام في الشاشة الكاملة لحد اعتماد معادلتها (B-20)">تكلفة<input class="input" name="whICost" [value]="f['cost']" disabled /></label>
                  <label style="grid-column:1/-1;">ملاحظات<textarea class="input" name="whINotes" data-field="notes" rows="2" [(ngModel)]="f['notes']"></textarea></label>
                }
                @case ('loc') {
                  <label>الكود<input class="input" name="whLId" data-field="code" [(ngModel)]="f['code']" [readonly]="!!m.id" /></label>
                  <label>الاسم *<input class="input" name="whLName" data-field="name" [(ngModel)]="f['name']" /></label>
                  <label style="grid-column:1/-1;">ملاحظات<textarea class="input" name="whLNotes" data-field="notes" rows="2" [(ngModel)]="f['notes']"></textarea></label>
                }
                @case ('transfer') {
                  <label>الصنف *<select class="input" name="whMItem" data-field="itemId" [(ngModel)]="f['itemId']">@for (i of items(); track i.id) { <option [value]="i.id">{{ itemName(i.id) }}</option> }</select></label>
                  <label>الكمية *<input class="input" name="whMQty" data-field="qty" inputmode="decimal" dir="ltr" [(ngModel)]="f['qty']" /></label>
                  <label>المخزن (من)*<select class="input" name="whMLoc" data-field="fromLocationId" [(ngModel)]="f['fromLocationId']">@for (l of locations(); track l.id) { <option [value]="l.id">{{ l.name }}</option> }</select></label>
                  <label>إلى مخزن *<select class="input" name="whMTo" data-field="toLocationId" [(ngModel)]="f['toLocationId']">@for (l of locations(); track l.id) { <option [value]="l.id">{{ l.name }}</option> }</select></label>
                  <label>التاريخ<input class="input" name="whMDate" data-field="date" type="date" [(ngModel)]="f['date']" /></label>
                  <label style="grid-column:1/-1;">ملاحظات<textarea class="input" name="whMNotes" data-field="notes" rows="2" [(ngModel)]="f['notes']"></textarea></label>
                }
                @case ('adj') {
                  <label>النوع<select class="input" name="akind" data-field="kind" [(ngModel)]="f['kind']">@for (k of kinds; track k[0]) { <option [value]="k[0]">{{ k[1] }}</option> }</select></label>
                  @if (f['kind'] === 'correction' || f['kind'] === 'stocktake') { <label>الاتجاه<select class="input" name="adir" data-field="direction" [(ngModel)]="f['direction']"><option value="in">زيادة</option><option value="out">نقص</option></select></label> }
                  <label>الصنف *<select class="input" name="aitem" data-field="itemId" [(ngModel)]="f['itemId']">@for (i of items(); track i.id) { <option [value]="i.id">{{ itemName(i.id) }}</option> }</select></label>
                  <label>المخزن *<select class="input" name="aloc" data-field="locationId" [(ngModel)]="f['locationId']">@for (l of locations(); track l.id) { <option [value]="l.id">{{ l.name }}</option> }</select></label>
                  @if (f['kind'] === 'transfer') { <label>إلى مخزن *<select class="input" name="ato" data-field="toLocationId" [(ngModel)]="f['toLocationId']">@for (l of locations(); track l.id) { <option [value]="l.id">{{ l.name }}</option> }</select></label> }
                  <label>الكمية *<input class="input" name="aqty" data-field="qty" inputmode="decimal" dir="ltr" [(ngModel)]="f['qty']" /></label>
                  <label style="grid-column:1/-1;">السبب *<input class="input" name="areason" data-field="reason" [(ngModel)]="f['reason']" /></label>
                }
              }
            </div>
            @if (error()) { <div class="err" role="alert" id="whError">{{ error() }}</div> }</div>
            <div class="modal-footer"><button class="btn btn-outline" type="button" (click)="close()">إلغاء</button><button class="btn btn-primary" type="submit" id="whModalSave" [disabled]="busy()">{{ m.kind === 'adj' ? 'حفظ كمسودة' : 'حفظ' }}</button></div>
          </form>
        </div>
      </div>
    }`,
})
export class WarehousesPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly toast = new LegacyToast();
  readonly me = this.session.me;
  readonly canAdd = this.session.can('warehouses.home', 'add'); readonly canEdit = this.session.can('warehouses.home', 'edit');
  readonly full = legacyUrl('warehouses.home');
  readonly tabs: [Tab, string][] = [['stock', 'الأرصدة'], ['items', 'الأصناف'], ['moves', 'الحركات'], ['locations', 'المخازن'], ['adjustments', 'التسويات']];
  readonly kinds = KINDS; readonly pageSize = PAGE_SIZE; readonly min = Math.min;
  readonly items = signal<Item[]>([]); readonly locations = signal<Loc[]>([]); readonly moves = signal<Move[]>([]); readonly adjs = signal<Adj[]>([]);
  readonly movementsCount = signal(0);
  readonly tab = signal<Tab>('stock'); readonly page = signal(1); readonly error = signal(''); readonly busy = signal(false);
  readonly modal = signal<{ kind: 'item' | 'loc' | 'transfer' | 'adj'; title: string; id?: string; rev?: number } | null>(null);
  private readonly tick = signal(0);
  q = ''; loc = ''; f: Record<string, string> = {};
  readonly title = computed(() => TITLES[this.tab()]);

  readonly stockRows = computed(() => { this.tick(); this.page(); return this.items().filter((i) => matches(this.q, [i.code, i.name, i.unit, i.category])); });
  readonly itemRows = this.stockRows;
  readonly moveRows = computed(() => {
    this.tick(); this.page();
    // نفس ترتيب الواجهة القديمة (pages-home.js): التاريخ تنازلي، واللي في نفس اليوم بترتيب الإنشاء (الأقدم الأول).
    // الـ API بيرجّع الأحدث إنشاءً الأول، فبنقلب القايمة لترتيب الإنشاء قبل الترتيب الثابت (UAT 7.1 H1).
    return this.moves().slice().reverse().filter((m) => (!this.loc || m.locationId === this.loc || m.toLocationId === this.loc) && matches(this.q, [m.id, m.type, m.itemId, this.itemName(m.itemId), m.project, m.supplierInvoiceId, m.notes]))
      .sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
  });
  pages(total: number) { return Math.max(1, Math.ceil(total / PAGE_SIZE)); }
  curPage(total: number) { return Math.min(this.page(), this.pages(total)); }
  pageOf<T>(rows: T[]) { const p = this.curPage(rows.length); return rows.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE); }

  private readonly locMap = computed(() => new Map(this.locations().map((l) => [l.id, l.name])));
  locName = (id?: string) => (id ? this.locMap().get(id) ?? id : '—');
  /** whItemName: «الكود — الاسم» */
  itemName = (id: string) => { const i = this.items().find((x) => x.id === id); return i ? (i.code ? `${i.code} — ` : '') + i.name : id || '—'; };
  typeLabel = (t: string) => TYPES[t] ?? t;
  kindLabel = (k: string) => KINDS.find((x) => x[0] === k)?.[1] ?? k;
  statusLabel = (s: string) => STATUS[s] ?? s;
  /** التكلفة المخزّنة على الصنف (عرض بس — الحساب نفسه في الشاشة الكاملة لحد B-20) */
  cost = (i: Item) => { const v = Number(i.avgCost) || Number(i.lastCost) || 0; return v ? String(i.avgCost && Number(i.avgCost) ? i.avgCost : i.lastCost) : '—'; };
  /** الرصيد في المخزن المختار (من السيرفر)، أو الإجمالي */
  qtyAt = (i: Item) => (this.loc ? Number(i.balances.find((b) => b.locationId === this.loc)?.balance ?? 0) : Number(i.total));
  /** المتاح = الرصيد − المحجوز (للعرض والمنع المسبق — المنع الفعلي من قاعدة البيانات، B-50) */
  available = (item: string, loc: string) => { const b = this.items().find((i) => i.id === item)?.balances.find((x) => x.locationId === loc); return b ? +b.balance - +b.reserved : 0; };
  /** عمود «مرجع» زي القديمة: فاتورة المورد للاستلام، والمشروع للصرف، و«من → إلى» للتحويل، والملاحظات للتسويات */
  ref = (m: Move) => (m.type === 'in' ? m.supplierInvoiceId || m.supplierName || '' : m.type === 'out' ? m.project || '' : m.type === 'transfer' ? `${this.locName(m.locationId)} → ${this.locName(m.toLocationId)}` : m.notes || '');

  ngOnInit() { void this.load(); }
  setTab(t: Tab) { this.tab.set(t); this.page.set(1); this.error.set(''); }
  async load() {
    try {
      const [o, m, a] = await Promise.all([
        firstValueFrom(this.http.get<{ items: Item[]; locations: Loc[]; movementsCount: number }>('/api/v1/warehouses')),
        firstValueFrom(this.http.get<Move[]>('/api/v1/warehouses/movements')),
        firstValueFrom(this.http.get<Adj[]>('/api/v1/stock/adjustments')),
      ]);
      this.items.set(o.items.map((i) => ({ ...i, issues: i.issues ?? [] }))); this.locations.set(o.locations); this.movementsCount.set(o.movementsCount ?? m.length); this.moves.set(m); this.adjs.set(a);
      this.tick.update((n) => n + 1);
    } catch (e) { this.error.set(errorMessage(e, 'تعذر تحميل المخازن')); }
  }

  // ---------------- النوافذ (زي openWhItemModal / openWhLocationModal / openWhMovementModal)
  private open(kind: 'item' | 'loc' | 'transfer' | 'adj', title: string, f: Record<string, string>, id?: string, rev?: number) { this.error.set(''); this.f = f; this.modal.set({ kind, title, id, rev }); }
  openItem(i?: Item) { this.open('item', i ? 'تعديل صنف' : 'صنف جديد', { code: i?.code ?? '', name: i?.name ?? '', unit: i?.unit ?? 'قطعة', category: i?.category ?? '', minQty: i?.minQty ?? '', notes: i?.notes ?? '', cost: i ? this.cost(i) : '' }, i?.id, i?.rev); }
  openLoc(l?: Loc) {
    // الكود الافتراضي زي القديمة: LOC- + (عدد المخازن + 1) بخانتين (والسيرفر بيتأكد إنه مش مستخدم)
    this.open('loc', l ? 'تعديل مخزن' : 'مخزن جديد', { code: l?.id ?? `LOC-${String(this.locations().length + 1).padStart(2, '0')}`, name: l?.name ?? '', notes: l?.notes ?? '' }, l?.id, l?.rev);
  }
  openTransfer() {
    if (!this.items().length) { this.toast.show('أضف صنفاً أولاً'); return; }
    if (!this.locations().length) { this.toast.show('أضف مخزناً أولاً'); return; }
    const ls = this.locations();
    // زي openWhMovementModal: المصدر = المخزن الافتراضي (أو الأول)، والوجهة = أول مخزن، والتحقق من الاختلاف والمتاح عند الحفظ
    this.open('transfer', 'تحويل بين مخازن', { itemId: this.items()[0].id, qty: '1', fromLocationId: ls[0].id, toLocationId: ls[0].id, date: new Date().toISOString().slice(0, 10), notes: '' });
  }
  openAdj() {
    if (!this.items().length || !this.locations().length) { this.toast.show('أضف صنفاً ومخزناً أولاً'); return; }
    this.open('adj', 'طلب تسوية مخزنية', { kind: 'increase', direction: 'in', itemId: this.items()[0].id, locationId: this.locations()[0].id, toLocationId: '', qty: '', reason: '' });
  }
  close() { this.modal.set(null); this.error.set(''); }
  /** إغلاق بالضغط على الخلفية بس. مابيرجّعش قيمة: Angular بيلغي الحدث (preventDefault) لو المعالج رجّع false */
  onOverlay(e: MouseEvent) { if (e.target === e.currentTarget) this.close(); }

  async saveModal() {
    const m = this.modal(); if (!m) return;
    const f = this.f; const opt = (v?: string) => (v != null && String(v).trim() !== '' ? String(v).trim() : undefined);
    let req: Promise<unknown>; let done = 'تم الحفظ';
    if (m.kind === 'item') {
      if (!f['name']?.trim()) { this.toast.show('الاسم مطلوب'); return; }
      const body = { name: f['name'].trim(), code: opt(f['code']), unit: opt(f['unit']), category: f['category']?.trim() ?? '', minQty: opt(f['minQty']), notes: f['notes']?.trim() ?? '' };
      req = firstValueFrom(m.id ? this.http.patch(`/api/v1/warehouses/items/${m.id}`, { ...body, rev: m.rev }) : this.http.post('/api/v1/warehouses/items', body));
    } else if (m.kind === 'loc') {
      if (!f['name']?.trim()) { this.toast.show('الاسم مطلوب'); return; }
      req = firstValueFrom(m.id ? this.http.patch(`/api/v1/warehouses/locations/${m.id}`, { rev: m.rev, name: f['name'].trim(), notes: f['notes']?.trim() ?? '' })
        : this.http.post('/api/v1/warehouses/locations', { name: f['name'].trim(), code: opt(f['code']), notes: f['notes']?.trim() ?? '' }));
    } else if (m.kind === 'transfer') {
      if (!f['itemId'] || !(+f['qty'] > 0)) { this.toast.show('الصنف والكمية مطلوبان'); return; }
      if (!f['toLocationId'] || f['toLocationId'] === f['fromLocationId']) { this.toast.show('اختر مخزناً مختلفاً للتحويل'); return; }
      const avail = this.available(f['itemId'], f['fromLocationId']);
      if (+f['qty'] > avail + 0.00001) { this.toast.show(`الرصيد غير كافٍ (المتاح: ${avail})`); return; }
      req = firstValueFrom(this.http.post('/api/v1/warehouses/transfers', { itemId: f['itemId'], fromLocationId: f['fromLocationId'], toLocationId: f['toLocationId'], qty: f['qty'].trim(), date: opt(f['date']), notes: opt(f['notes']) }));
      done = 'تم تسجيل الحركة';
    } else {
      req = firstValueFrom(this.http.post('/api/v1/stock/adjustments', { kind: f['kind'], direction: (f['kind'] === 'correction' || f['kind'] === 'stocktake') ? f['direction'] : undefined, itemId: f['itemId'], locationId: f['locationId'], toLocationId: f['kind'] === 'transfer' ? f['toLocationId'] : undefined, qty: f['qty']?.trim(), reason: f['reason']?.trim() }));
      done = 'اتحفظت كمسودة';
    }
    this.busy.set(true); this.error.set('');
    try {
      await req; this.modal.set(null); await this.load(); this.toast.show(done);
      if (m.kind === 'transfer') this.setTab('moves');
    } catch (e) { this.error.set(errorMessage(e, 'تعذر الحفظ')); } finally { this.busy.set(false); }
  }

  async adjAct(a: Adj, cmd: 'submit' | 'cancel' | 'post') {
    const reason = cmd === 'cancel' ? prompt('سبب الإلغاء') : null;
    if (cmd === 'cancel' && !reason) return;
    const headers = new HttpHeaders({ 'Idempotency-Key': `adj-${cmd}-${a.id}-${crypto.randomUUID()}` });
    this.error.set('');
    try { await firstValueFrom(this.http.post(`/api/v1/stock/adjustments/${a.id}/${cmd}`, cmd === 'cancel' ? { reason } : {}, { headers })); await this.load(); }
    catch (e) { this.error.set(errorMessage(e, 'تعذر تنفيذ العملية')); }
  }
}
