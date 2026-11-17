import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { firstValueFrom } from 'rxjs';
import { legacyUrl } from '../core/page-routes';
import { errorMessage, SessionService } from '../core/session.service';

interface Bal { locationId: string; balance: string; reserved: string }
interface Item { id: string; code: string; name: string; unit: string; category: string; minQty: string | null; notes: string; avgCost: string | null; rev: number; balances: Bal[]; total: string }
interface Loc { id: string; name: string; notes: string }
interface Move { id: string; type: string; itemId: string; qty: number; locationId?: string; toLocationId?: string; date?: string; adjustmentId?: string }
interface Adj { id: string; kind: string; direction: string; itemId: string; locationId: string; toLocationId: string | null; qty: string; reason: string; status: string; postError: string | null; createdBy: string }

const KINDS: [string, string][] = [['increase', 'تسوية زيادة'], ['deficit', 'تسوية عجز'], ['damage', 'تلف أو إعدام'], ['correction', 'تصحيح خطأ تسجيل'], ['stocktake', 'نتيجة جرد'], ['transfer', 'تحويل مخزني']];
const STATUS: Record<string, string> = { draft: 'مسودة', submitted: 'بانتظار الاعتماد', approved: 'معتمدة (لم تُرحّل)', posted: 'مرحّلة', rejected: 'مرفوضة', returned: 'مرتجعة', cancelled: 'ملغاة', withdrawn: 'مسحوبة' };
const TYPES: Record<string, string> = { in: 'استلام', out: 'صرف', transfer: 'تحويل', adjust_in: 'تسوية+', adjust_out: 'تسوية-' };

/**
 * المخازن (6.2-ب): الأصناف بأرصدتها (والمحجوز)، والمخازن، والتحويل، والحركات، والتسويات المعتمدة (B-51).
 * B-50 بيتفرض من قاعدة البيانات، والشاشة كمان بتمنع الكمية الأكبر من المتاح قبل الإرسال.
 * الاستلام والصرف بتكلفتهم من الشاشة الكاملة لحد اعتماد معادلة المتوسط المتحرك (B-20).
 */
@Component({
  selector: 'app-warehouses',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTabsModule],
  template: `
    <h1>المخازن</h1>
    <p class="muted">الاستلام والصرف بتكلفتهم من <a [href]="legacy('warehouses.home')" id="whFull">الشاشة الكاملة</a> لحد اعتماد معادلة التكلفة. ممنوع الرصيد السالب في كل الحالات.</p>
    @if (error()) { <div class="err" role="alert" id="whError">{{ error() }}</div> }
    <mat-tab-group>
      <mat-tab label="الأصناف">
        <table class="tbl" id="whItems">
          <thead><tr><th>الكود</th><th>الصنف</th><th>الوحدة</th><th>الإجمالي</th><th>حسب المخزن (رصيد / محجوز)</th><th>حد الطلب</th></tr></thead>
          <tbody>
            @for (i of items(); track i.id) {
              <tr [attr.data-id]="i.id" (click)="edit.set({ ...i })">
                <td dir="ltr">{{ i.code }}</td><td>{{ i.name }}</td><td>{{ i.unit }}</td><td class="num" [attr.data-total]="i.total">{{ i.total }}</td>
                <td>@for (b of i.balances; track b.locationId) { <span class="chip">{{ locName(b.locationId) }}: {{ +b.balance }}@if (+b.reserved) { / {{ +b.reserved }} }</span> }</td>
                <td [class.warn]="i.minQty !== null && +i.total <= +i.minQty">{{ i.minQty ?? '—' }}</td>
              </tr>
            } @empty { <tr><td colspan="6" class="muted">لا توجد أصناف</td></tr> }
          </tbody>
        </table>
        @if (canAdd) {
          <form id="whItemForm" class="row" (ngSubmit)="saveItem()">
            <mat-form-field appearance="outline"><mat-label>اسم الصنف *</mat-label><input matInput name="iname" [(ngModel)]="edit().name" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>الكود (فاضي = تلقائي)</mat-label><input matInput name="icode" [(ngModel)]="edit().code" dir="ltr" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>الوحدة</mat-label><input matInput name="iunit" [(ngModel)]="edit().unit" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>التصنيف</mat-label><input matInput name="icat" [(ngModel)]="edit().category" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>حد الطلب</mat-label><input matInput name="imin" [(ngModel)]="edit().minQty" dir="ltr" /></mat-form-field>
            <button mat-flat-button type="submit" id="whItemSave">{{ edit().id ? 'حفظ التعديل' : '+ صنف' }}</button>
            @if (edit().id) { <button mat-button type="button" (click)="edit.set(blankItem())">جديد</button> }
          </form>
        }
      </mat-tab>
      <mat-tab label="المخازن">
        <ul id="whLocations">@for (l of locations(); track l.id) { <li [attr.data-id]="l.id">{{ l.name }}</li> } @empty { <li class="muted">لا توجد مخازن</li> }</ul>
        @if (canAdd) {
          <form class="row" (ngSubmit)="addLocation()"><mat-form-field appearance="outline"><mat-label>اسم المخزن</mat-label><input matInput name="lname" id="whLocName" [(ngModel)]="locName_" /></mat-form-field>
            <button mat-flat-button type="submit" id="whLocAdd">+ مخزن</button></form>
        }
      </mat-tab>
      <mat-tab label="الحركات والتحويل">
        @if (canAdd) {
          <form id="whTransfer" class="row" (ngSubmit)="transfer()">
            <mat-form-field appearance="outline"><mat-label>الصنف</mat-label><mat-select name="titem" [(ngModel)]="tr.itemId">@for (i of items(); track i.id) { <mat-option [value]="i.id">{{ i.name }}</mat-option> }</mat-select></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>من</mat-label><mat-select name="tfrom" [(ngModel)]="tr.fromLocationId">@for (l of locations(); track l.id) { <mat-option [value]="l.id">{{ l.name }}</mat-option> }</mat-select></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>إلى</mat-label><mat-select name="tto" [(ngModel)]="tr.toLocationId">@for (l of locations(); track l.id) { <mat-option [value]="l.id">{{ l.name }}</mat-option> }</mat-select></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>الكمية (المتاح: {{ available(tr.itemId, tr.fromLocationId) }})</mat-label><input matInput name="tqty" [(ngModel)]="tr.qty" dir="ltr" /></mat-form-field>
            <button mat-flat-button type="submit" id="whTransferBtn">تحويل</button>
          </form>
        }
        <table class="tbl" id="whMoves"><thead><tr><th>التاريخ</th><th>النوع</th><th>الصنف</th><th>الكمية</th><th>المخزن</th></tr></thead>
          <tbody>@for (m of moves(); track m.id) { <tr [attr.data-id]="m.id"><td dir="ltr">{{ m.date }}</td><td>{{ typeLabel(m.type) }}@if (m.adjustmentId) { (تسوية) }</td><td>{{ itemName(m.itemId) }}</td><td class="num">{{ m.qty }}</td>
            <td>{{ locName(m.locationId || '') }}@if (m.toLocationId) { ← {{ locName(m.toLocationId) }} }</td></tr> }</tbody></table>
      </mat-tab>
      <mat-tab label="التسويات">
        @if (canAdd) {
          <form id="whAdjForm" class="row" (ngSubmit)="createAdj()">
            <mat-form-field appearance="outline"><mat-label>النوع</mat-label><mat-select name="akind" [(ngModel)]="adj.kind">@for (k of kinds; track k[0]) { <mat-option [value]="k[0]">{{ k[1] }}</mat-option> }</mat-select></mat-form-field>
            @if (adj.kind === 'correction' || adj.kind === 'stocktake') { <mat-form-field appearance="outline"><mat-label>الاتجاه</mat-label><mat-select name="adir" [(ngModel)]="adj.direction"><mat-option value="in">زيادة</mat-option><mat-option value="out">نقص</mat-option></mat-select></mat-form-field> }
            <mat-form-field appearance="outline"><mat-label>الصنف</mat-label><mat-select name="aitem" [(ngModel)]="adj.itemId">@for (i of items(); track i.id) { <mat-option [value]="i.id">{{ i.name }}</mat-option> }</mat-select></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>المخزن</mat-label><mat-select name="aloc" [(ngModel)]="adj.locationId">@for (l of locations(); track l.id) { <mat-option [value]="l.id">{{ l.name }}</mat-option> }</mat-select></mat-form-field>
            @if (adj.kind === 'transfer') { <mat-form-field appearance="outline"><mat-label>إلى</mat-label><mat-select name="ato" [(ngModel)]="adj.toLocationId">@for (l of locations(); track l.id) { <mat-option [value]="l.id">{{ l.name }}</mat-option> }</mat-select></mat-form-field> }
            <mat-form-field appearance="outline"><mat-label>الكمية</mat-label><input matInput name="aqty" [(ngModel)]="adj.qty" dir="ltr" /></mat-form-field>
            <mat-form-field appearance="outline" class="wide"><mat-label>السبب *</mat-label><input matInput name="areason" [(ngModel)]="adj.reason" /></mat-form-field>
            <button mat-flat-button type="submit" id="whAdjAdd">حفظ كمسودة</button>
          </form>
        }
        <table class="tbl" id="whAdjs"><thead><tr><th>النوع</th><th>الصنف</th><th>الكمية</th><th>الحالة</th><th></th></tr></thead>
          <tbody>@for (a of adjs(); track a.id) {
            <tr [attr.data-id]="a.id" [attr.data-status]="a.status"><td>{{ kindLabel(a.kind) }}</td><td>{{ itemName(a.itemId) }}</td><td class="num">{{ +a.qty }}</td>
              <td>{{ statusLabel(a.status) }}@if (a.postError) { <div class="err small">تعذّر الترحيل: الرصيد غير كافٍ</div> }</td>
              <td>
                @if ((a.status === 'draft' || a.status === 'returned') && a.createdBy === me()?.id) { <button mat-button (click)="adjAct(a, 'submit')" data-act="submit">إرسال للاعتماد</button> }
                @if (['draft','returned','submitted','approved'].includes(a.status) && (a.createdBy === me()?.id || me()?.permissions?.manageUsers)) { <button mat-button color="warn" (click)="adjAct(a, 'cancel')" data-act="cancel">إلغاء</button> }
                @if (a.status === 'approved' && me()?.docActions?.post) { <button mat-button (click)="adjAct(a, 'post')" data-act="post">إعادة الترحيل</button> }
              </td></tr>
          } @empty { <tr><td colspan="5" class="muted">لا توجد تسويات</td></tr> }</tbody></table>
        <p class="muted">الاعتماد من «بانتظار اعتمادي». المنشئ مايعتمدش طلبه، والكمية مابتدخلش الرصيد إلا بعد الترحيل.</p>
      </mat-tab>
    </mat-tab-group>`,
})
export class WarehousesPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  readonly me = this.session.me;
  readonly canAdd = this.session.can('warehouses.home', 'add');
  readonly items = signal<Item[]>([]); readonly locations = signal<Loc[]>([]); readonly moves = signal<Move[]>([]); readonly adjs = signal<Adj[]>([]);
  readonly error = signal('');
  readonly blankItem = (): Partial<Item> => ({ name: '', code: '', unit: '', category: '', minQty: '' });
  readonly edit = signal<Partial<Item>>(this.blankItem());
  readonly kinds = KINDS;
  locName_ = '';
  tr = { itemId: '', fromLocationId: '', toLocationId: '', qty: '' };
  adj = { kind: 'increase', direction: '', itemId: '', locationId: '', toLocationId: '', qty: '', reason: '' };
  readonly locMap = computed(() => new Map(this.locations().map((l) => [l.id, l.name])));
  legacy = legacyUrl;
  locName = (id: string) => this.locMap().get(id) ?? (id || '—');
  itemName = (id: string) => this.items().find((i) => i.id === id)?.name ?? id;
  typeLabel = (t: string) => TYPES[t] ?? t;
  kindLabel = (k: string) => KINDS.find((x) => x[0] === k)?.[1] ?? k;
  statusLabel = (s: string) => STATUS[s] ?? s;
  /** المتاح = الرصيد − المحجوز (للعرض والمنع المسبق — المنع الفعلي من قاعدة البيانات) */
  available = (item: string, loc: string) => { const b = this.items().find((i) => i.id === item)?.balances.find((x) => x.locationId === loc); return b ? +b.balance - +b.reserved : 0; };
  ngOnInit() { void this.load(); }
  async load() {
    try {
      const [o, m, a] = await Promise.all([
        firstValueFrom(this.http.get<{ items: Item[]; locations: Loc[] }>('/api/v1/warehouses')),
        firstValueFrom(this.http.get<Move[]>('/api/v1/warehouses/movements')),
        firstValueFrom(this.http.get<Adj[]>('/api/v1/stock/adjustments')),
      ]);
      this.items.set(o.items); this.locations.set(o.locations); this.moves.set(m); this.adjs.set(a);
    } catch (e) { this.error.set(errorMessage(e, 'تعذر تحميل المخازن')); }
  }
  private async run(f: () => Promise<unknown>, msg: string) { this.error.set(''); try { await f(); await this.load(); } catch (e) { this.error.set(errorMessage(e, msg)); } }
  saveItem() {
    const e = this.edit(); const opt = (v?: string | null) => (v != null && String(v).trim() !== '' ? String(v).trim() : undefined);
    const body = { name: e.name ?? '', code: opt(e.code), unit: opt(e.unit), category: opt(e.category), minQty: opt(e.minQty) };
    return this.run(async () => {
      await firstValueFrom(e.id ? this.http.patch(`/api/v1/warehouses/items/${e.id}`, { ...body, rev: e.rev }) : this.http.post('/api/v1/warehouses/items', body));
      this.edit.set(this.blankItem());
    }, 'تعذر حفظ الصنف');
  }
  addLocation() { return this.run(async () => { await firstValueFrom(this.http.post('/api/v1/warehouses/locations', { name: this.locName_ })); this.locName_ = ''; }, 'تعذر إضافة المخزن'); }
  transfer() {
    if (+this.tr.qty > this.available(this.tr.itemId, this.tr.fromLocationId)) { this.error.set(`الرصيد المتاح غير كافٍ (المتاح: ${this.available(this.tr.itemId, this.tr.fromLocationId)})`); return; }
    return this.run(() => firstValueFrom(this.http.post('/api/v1/warehouses/transfers', this.tr)), 'تعذر التحويل');
  }
  createAdj() {
    const a = this.adj;
    const body = { kind: a['kind'], direction: a['direction'] || undefined, itemId: a['itemId'], locationId: a['locationId'], toLocationId: a['kind'] === 'transfer' ? a['toLocationId'] : undefined, qty: a['qty'], reason: a['reason'] };
    return this.run(() => firstValueFrom(this.http.post('/api/v1/stock/adjustments', body)), 'تعذر حفظ التسوية');
  }
  adjAct(a: Adj, cmd: 'submit' | 'cancel' | 'post') {
    const reason = cmd === 'cancel' ? prompt('سبب الإلغاء') : null;
    if (cmd === 'cancel' && !reason) return;
    const headers = new HttpHeaders({ 'Idempotency-Key': `adj-${cmd}-${a.id}-${crypto.randomUUID()}` });
    return this.run(() => firstValueFrom(this.http.post(`/api/v1/stock/adjustments/${a.id}/${cmd}`, cmd === 'cancel' ? { reason } : {}, { headers })), 'تعذر تنفيذ العملية');
  }
}
