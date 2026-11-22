import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { fmtDate, legacyFmt } from '../core/legacy-format';
import { legacyUrl } from '../core/page-routes';
import { errorMessage } from '../core/session.service';

interface Line { date: string; type: string; id: string; ref: string; description: string; debit: string; credit: string; balance: string }
interface Statement {
  supplier: { id: string; name: string; taxId: string }; from: string; to: string; opening: string; closing: string; lines: Line[];
  unclassified: { id: string; date: string; amount: string; paymentNo: unknown }[];
  legacyBalance: string; difference: string; differs: boolean; reasons: Record<'cancelledInvoices' | 'collect' | 'unclassified', { count: number; amount: string }>;
}

/**
 * كشف حساب المورد — بنفس شكل الواجهة القديمة (renderStatementPage + buildAccountStatementHtml، statement.js)، بكلاسات legacy-skin.css.
 * **الأرقام بقاعدة F-05 المعتمدة** (DEC-0113 د-2): نفس حركات الرصيد (P7.3-H)، والملغاة برا، والتحصيل دائن، والدفعات من غير اتجاه برا الرصيد
 * وفي قايمة تحت الكشف (B-53)، بست خانات من غير تقريب الكشف لخانتين. ولو مختلف عن الطريقة الحالية، علامة بالفرق وأسبابه.
 * الطباعة وحفظ PDF من الشاشة الكاملة (خارج النطاق).
 */
@Component({
  selector: 'app-supplier-statement',
  imports: [FormsModule],
  template: `
    <h2 class="page-title">كشف حساب المورد</h2>
    <p class="page-sub">كشف حركات المورد: فواتير (دائن) · مرتجعات ودفعات (مدين) · رصيد متحرك — بالقاعدة المعتمدة (F-05)</p>
    <div class="filters-row">
      <div class="field" style="min-width:260px;"><label>المورد</label><div class="ss-cell ss-cell-wide"><select id="statementSupplier" [(ngModel)]="supplierId"><option value="">ابحث أو اكتب اسم المورد...</option>@for (s of suppliers(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }</select></div></div>
      <div class="field"><label>من تاريخ</label><input type="date" id="statementFrom" [(ngModel)]="from"></div>
      <div class="field"><label>إلى تاريخ</label><input type="date" id="statementTo" [(ngModel)]="to"></div>
      <button class="btn btn-gold" id="generateStatementBtn" (click)="load()">عرض الكشف</button>
      @if (st()) { <a class="btn btn-outline" id="printStatementPageBtn" [href]="full" title="الطباعة وحفظ PDF من الشاشة الكاملة">حفظ PDF (يفتح تلقائياً)</a> }
    </div>
    @if (error()) { <div class="err" role="alert" id="stError">{{ error() }}</div> }
    @if (st(); as s) {
      @if (s.differs) {
        <div class="err" role="note" id="stDiffers" style="background:var(--paper);color:var(--ink);border-color:var(--gold);">
          ⚠️ الرصيد بالقاعدة المعتمدة (F-05) <strong>{{ fmt(s.closing) }}</strong> مختلف عن الطريقة الحالية <strong>{{ fmt(s.legacyBalance) }}</strong> (الفرق {{ fmt(s.difference) }}).
          الأسباب: {{ s.reasons.cancelledInvoices.count }} فاتورة ملغاة · {{ s.reasons.collect.count }} تحصيل · {{ s.reasons.unclassified.count }} دفعة غير مصنّفة.
          الأرصدة الافتتاحية بيعتمدها المدير المالي قبل التشغيل الفعلي (DEC-0105).
        </div>
      }
      <div class="notice-doc" id="bankStatementDoc"><div class="acc-statement">
        <div class="ast-title-wrap"><span class="ast-title">كشف حساب مورد</span></div>
        <div class="ast-info">
          <div><div class="ast-info-row"><span class="k">اسم المورد</span><span class="v">{{ s.supplier.name }}</span></div>
            <div class="ast-info-row"><span class="k">فترة الكشف</span><span class="v">{{ s.from ? fmtDate(s.from) : 'بداية التعامل' }} إلى {{ s.to ? fmtDate(s.to) : 'تاريخ اليوم' }}</span></div></div>
          <div><div class="ast-info-row"><span class="k">الرقم الضريبي</span><span class="v">{{ s.supplier.taxId || '-' }}</span></div>
            <div class="ast-info-row"><span class="k">تاريخ الإصدار</span><span class="v">{{ today }}</span></div></div>
        </div>
        <table class="ast-table" id="stTable">
          <thead><tr><th>تاريخ القيد</th><th>البيان</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead>
          <tbody>
            <tr class="ast-opening"><td colspan="2">الرصيد الافتتاحي</td><td>-</td><td>-</td><td class="ast-bal">{{ fmt(s.opening) }}</td></tr>
            @for (l of s.lines; track l.id) {
              <tr [attr.data-type]="l.type"><td>{{ fmtDate(l.date) || '-' }}</td>
                <td style="white-space:pre-line;">{{ l.description || '-' }}@if (l.ref && l.ref !== '-') { <span class="pill">{{ l.ref }}</span> }</td>
                <td class="ast-debit">{{ +l.debit ? fmt(l.debit) : '-' }}</td><td class="ast-credit">{{ +l.credit ? fmt(l.credit) : '-' }}</td>
                <td class="ast-bal">{{ fmt(l.balance) }}@if (+l.balance < 0) { <span style="color:var(--ledger-green);font-size:11px;">(لصالحنا)</span> }</td></tr>
            } @empty { <tr><td colspan="5" style="text-align:center;color:var(--ink-soft);padding:16px;">لا توجد حركات في هذه الفترة</td></tr> }
          </tbody>
        </table>
        <div class="ast-summary">
          <div class="box"><div class="v">{{ fmt(s.opening) }}</div><div class="l">الرصيد الافتتاحي</div></div>
          <div class="box"><div class="v">{{ fmt(sum(s, 'credit')) }}</div><div class="l">إجمالي دائن (فترة الكشف)</div></div>
          <div class="box"><div class="v">{{ fmt(sum(s, 'debit')) }}</div><div class="l">إجمالي مدين (فترة الكشف)</div></div>
        </div>
        <div class="ast-final" id="stClosing"><div class="amt">{{ fmt(s.closing) }}</div><div class="lbl">الرصيد الختامي {{ +s.closing > 0 ? '(مستحق للمورد)' : +s.closing < 0 ? '(رصيد زائد لصالحنا)' : '(متسوّى)' }}</div></div>
        @if (s.unclassified.length) {
          <div id="stUnclassified" style="margin-top:12px;font-size:13px;"><strong>دفعات غير مصنّفة (مش داخلة في الرصيد — B-53):</strong>
            @for (u of s.unclassified; track u.id) { <div>#{{ u.paymentNo ?? '-' }} — {{ fmtDate(u.date) }} — {{ fmt(u.amount) }}</div> }
            <a href="/app/supplier-payments">مراجعتها من صفحة الدفعات</a></div>
        }
      </div></div>
    } @else { <div class="table-empty" style="padding:28px;text-align:center;color:var(--ink-soft);">اختر مورداً ثم اضغط «عرض الكشف»</div> }`,
})
export class SupplierStatementPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  readonly full = legacyUrl('ledger.suppliers');
  readonly suppliers = signal<{ id: string; name: string }[]>([]);
  readonly st = signal<Statement | null>(null); readonly error = signal('');
  readonly today = fmtDate(new Date().toISOString().slice(0, 10));
  supplierId = this.route.snapshot.queryParamMap.get('supplierId') ?? ''; from = ''; to = '';
  fmt = (n: unknown) => legacyFmt(n);
  fmtDate = (v: string) => fmtDate(v);
  sum = (s: Statement, k: 'debit' | 'credit') => s.lines.reduce((a, l) => a + Number(l[k] || 0), 0);

  async ngOnInit() {
    try { this.suppliers.set((await firstValueFrom(this.http.get<{ suppliers: { id: string; name: string }[] }>('/api/v1/supplier-invoices/options'))).suppliers); } catch { /* القايمة فاضية */ }
    if (this.supplierId) await this.load();
  }
  async load() {
    if (!this.supplierId) { this.st.set(null); return; }
    let p = new HttpParams(); if (this.from) p = p.set('from', this.from); if (this.to) p = p.set('to', this.to);
    try { this.st.set(await firstValueFrom(this.http.get<Statement>(`/api/v1/supplier-payments/statement/${this.supplierId}`, { params: p }))); this.error.set(''); }
    catch (e) { this.error.set(errorMessage(e, 'تعذر تحميل الكشف')); }
  }
}
