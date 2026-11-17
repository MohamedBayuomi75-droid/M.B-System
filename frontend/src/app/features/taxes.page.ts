import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { errorMessage, SessionService } from '../core/session.service';

interface TaxVersion { id: string; code: string; version: number; status: string; method: string; rate: string | null; fixed_amount: string | null; base: string; base_ratio: string; effective_from: string; effective_to: string | null; legal_ref: string | null; change_reason: string; created_by: string; decision_note: string | null; applies_to: string[] }
interface TaxCode { code: string; name: string; category: string; is_tax: boolean; status: string; versions: TaxVersion[] }
const STATUS: Record<string, string> = { draft: 'مسودة', pending: 'بانتظار الاعتماد', approved: 'معتمد', suspended: 'موقوف', rejected: 'مرفوض' };

/**
 * إدارة الضرائب والاستقطاعات والدمغات (B-21) — جزء من محرك القواعد المالية (B-20).
 * المدير بيعدّ (مسودة ← إرسال)، وصاحب «اعتماد» (شخص تاني) بيعتمد/يرفض/يوقف. الحساب بالمعتمد الساري بس.
 */
@Component({
  selector: 'app-taxes',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h1>الضرائب والاستقطاعات والدمغات</h1>
    <p class="muted">مفيش نسبة بتتطبّق قبل اعتمادها من شخص غير اللي أعدّها. الإصدار المعتمد مابيتعدّلش — التغيير = إصدار جديد بتاريخ سريان.</p>
    @if (error()) { <div class="err" role="alert" id="taxError">{{ error() }}</div> }
    @if (canPrepare) {
      <form id="taxCodeForm" (ngSubmit)="createCode()" class="row">
        <mat-form-field appearance="outline"><mat-label>الكود</mat-label><input matInput name="code" [(ngModel)]="newCode.code" dir="ltr" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>الاسم</mat-label><input matInput name="name" [(ngModel)]="newCode.name" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>النوع</mat-label>
          <mat-select name="category" [(ngModel)]="newCode.category">@for (c of categories; track c[0]) { <mat-option [value]="c[0]">{{ c[1] }}</mat-option> }</mat-select></mat-form-field>
        <button mat-flat-button type="submit" id="taxCodeAdd">+ كود</button>
      </form>
    }
    <table class="tbl" id="taxTable">
      <thead><tr><th>الكود</th><th>الاسم</th><th>النوع</th><th>إصدار</th><th>الحالة</th><th>النسبة/القيمة</th><th>السريان</th><th>المرجع</th><th></th></tr></thead>
      <tbody>
        @for (c of codes(); track c.code) {
          @for (v of c.versions; track v.id) {
            <tr [attr.data-version]="v.id" [attr.data-status]="v.status">
              <td dir="ltr">{{ c.code }}</td><td>{{ c.name }}</td><td>{{ catLabel(c.category) }}</td><td>{{ v.version }}</td><td>{{ statusLabel(v.status) }}</td>
              <td dir="ltr">{{ v.method === 'PERCENT' ? v.rate + '%' : v.method === 'FIXED' ? v.fixed_amount : 'شرائح' }}{{ v.base_ratio !== '100.000000' ? ' × ' + (+v.base_ratio) + '% من الأساس' : '' }}</td>
              <td dir="ltr">{{ v.effective_from }} → {{ v.effective_to || '…' }}</td><td>{{ v.legal_ref || '—' }}</td>
              <td>
                @if (canPrepare && v.status === 'draft') { <button mat-button (click)="act(v, 'submit')" data-act="submit">إرسال</button><button mat-button (click)="del(v)">مسح</button> }
                @if (canApprove && v.status === 'pending' && v.created_by !== me()?.id) { <button mat-button (click)="act(v, 'approve')" data-act="approve">اعتماد</button><button mat-button color="warn" (click)="act(v, 'reject')" data-act="reject">رفض</button> }
                @if (canApprove && v.status === 'approved') { <button mat-button color="warn" (click)="act(v, 'suspend')" data-act="suspend">إيقاف</button> }
              </td>
            </tr>
          } @empty { <tr [attr.data-code]="c.code"><td dir="ltr">{{ c.code }}</td><td>{{ c.name }}</td><td>{{ catLabel(c.category) }}</td><td colspan="6" class="muted">مفيش إصدارات</td></tr> }
        } @empty { <tr><td colspan="9" class="muted" id="taxEmpty">مفيش أكواد — النسب بتتضاف بعد المراجعة الضريبية واعتماد المدير المالي</td></tr> }
      </tbody>
    </table>
    <mat-form-field appearance="outline" class="wide"><mat-label>ملاحظة القرار (إلزامية للرفض والإيقاف)</mat-label><input matInput id="taxNote" [(ngModel)]="note" /></mat-form-field>

    @if (canPrepare && codes().length) {
      <h2>إصدار جديد (مسودة)</h2>
      <form id="taxVersionForm" (ngSubmit)="createVersion()" class="grid">
        <mat-form-field appearance="outline"><mat-label>الكود</mat-label><mat-select name="vcode" [(ngModel)]="v.code">@for (c of codes(); track c.code) { <mat-option [value]="c.code">{{ c.code }}</mat-option> }</mat-select></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>طريقة الحساب</mat-label><mat-select name="method" [(ngModel)]="v.method"><mat-option value="PERCENT">نسبة</mat-option><mat-option value="FIXED">قيمة ثابتة</mat-option><mat-option value="BRACKETS">شرائح</mat-option></mat-select></mat-form-field>
        @if (v.method === 'PERCENT') { <mat-form-field appearance="outline"><mat-label>النسبة %</mat-label><input matInput name="rate" [(ngModel)]="v.rate" dir="ltr" /></mat-form-field> }
        @if (v.method === 'FIXED') { <mat-form-field appearance="outline"><mat-label>القيمة</mat-label><input matInput name="fixed" [(ngModel)]="v.fixedAmount" dir="ltr" /></mat-form-field> }
        @if (v.method === 'BRACKETS') { <mat-form-field appearance="outline" class="wide"><mat-label>الشرائح (JSON: [&#123;"upTo":"1000","rate":"0"&#125;,…])</mat-label><input matInput name="brackets" [(ngModel)]="v.bracketsJson" dir="ltr" /></mat-form-field> }
        <mat-form-field appearance="outline"><mat-label>الأساس</mat-label><mat-select name="base" [(ngModel)]="v.base">@for (b of bases; track b[0]) { <mat-option [value]="b[0]">{{ b[1] }}</mat-option> }</mat-select></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>% الخاضع من الأساس</mat-label><input matInput name="baseRatio" [(ngModel)]="v.baseRatio" dir="ltr" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>حد أدنى للأساس</mat-label><input matInput name="minBase" [(ngModel)]="v.minBase" dir="ltr" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>المستندات (مفصولة بفاصلة)</mat-label><input matInput name="appliesTo" [(ngModel)]="v.appliesTo" dir="ltr" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>يتحملها</mat-label><mat-select name="bearer" [(ngModel)]="v.bearer"><mat-option value="COUNTERPARTY">الطرف الآخر</mat-option><mat-option value="COMPANY">الشركة</mat-option><mat-option value="EMPLOYEE">العامل/الموظف</mat-option><mat-option value="EMPLOYER">صاحب العمل</mat-option></mat-select></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>التحصيل/التوريد</mat-label><mat-select name="collector" [(ngModel)]="v.collector"><mat-option value="COUNTERPARTY_CHARGES">يضيفها الطرف الآخر</mat-option><mat-option value="COMPANY_WITHHOLDS">تخصمها الشركة وتورّدها</mat-option><mat-option value="COMPANY_CHARGES">تضيفها الشركة</mat-option><mat-option value="PAID_DIRECTLY">تُسدّد مباشرة</mat-option></mat-select></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>بداية السريان</mat-label><input matInput type="date" name="from" [(ngModel)]="v.effectiveFrom" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>نهاية السريان</mat-label><input matInput type="date" name="to" [(ngModel)]="v.effectiveTo" /></mat-form-field>
        <mat-form-field appearance="outline" class="wide"><mat-label>الشروط (JSON: contractDateFrom/To, activities, counterpartyTypes)</mat-label><input matInput name="conditions" [(ngModel)]="v.conditionsJson" dir="ltr" /></mat-form-field>
        <mat-form-field appearance="outline" class="wide"><mat-label>الإعفاءات (JSON: [&#123;"reason":"…","activities":["…"]&#125;])</mat-label><input matInput name="exemptions" [(ngModel)]="v.exemptionsJson" dir="ltr" /></mat-form-field>
        <mat-form-field appearance="outline" class="wide"><mat-label>المرجع القانوني (رقم القانون/القرار)</mat-label><input matInput name="legalRef" [(ngModel)]="v.legalRef" /></mat-form-field>
        <mat-form-field appearance="outline" class="wide"><mat-label>ملاحظات المدير المالي</mat-label><input matInput name="notesCfo" [(ngModel)]="v.notesCfo" /></mat-form-field>
        <mat-form-field appearance="outline" class="wide"><mat-label>ملاحظات المستشار الضريبي</mat-label><input matInput name="notesAdvisor" [(ngModel)]="v.notesAdvisor" /></mat-form-field>
        <mat-form-field appearance="outline" class="wide"><mat-label>سبب الإصدار *</mat-label><input matInput name="reason" [(ngModel)]="v.changeReason" /></mat-form-field>
        <button mat-flat-button type="submit" id="taxVersionAdd">حفظ كمسودة</button>
      </form>
    }

    <h2>معاينة الحساب (بالمعتمد الساري بس)</h2>
    <form id="taxPreview" (ngSubmit)="preview()" class="row">
      <mat-form-field appearance="outline"><mat-label>المستند</mat-label><input matInput name="pdoc" [(ngModel)]="p.documentType" dir="ltr" /></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>التاريخ</mat-label><input matInput type="date" name="pdate" [(ngModel)]="p.date" /></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>الأكواد</mat-label><input matInput name="pcodes" [(ngModel)]="p.codes" dir="ltr" /></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>الأساس</mat-label><input matInput name="pbase" [(ngModel)]="p.amount" dir="ltr" /></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>تاريخ العقد</mat-label><input matInput type="date" name="pcontract" [(ngModel)]="p.contractDate" /></mat-form-field>
      <button mat-flat-button type="submit" id="taxPreviewBtn">احسب</button>
    </form>
    <ul id="taxPreviewOut">@for (l of lines(); track l.code) { <li dir="ltr">{{ l.code }} v{{ l.version }}: {{ l.amount }} {{ l.exemptReason ? '(' + l.exemptReason + ')' : '' }}</li> }</ul>`,
})
export class TaxesPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  readonly me = this.session.me;
  readonly canPrepare = !!this.me()?.permissions.manageUsers;
  readonly canApprove = !!this.me()?.docActions?.approve;
  readonly codes = signal<TaxCode[]>([]); readonly error = signal('');
  readonly lines = signal<{ code: string; version: number; amount: string; exemptReason: string | null }[]>([]);
  readonly categories: [string, string][] = [['VAT', 'قيمة مضافة'], ['SCHEDULE', 'ضريبة جدول'], ['WHT', 'خصم وتحصيل تحت حساب الضريبة'], ['STAMP', 'دمغة'], ['PAYROLL_TAX', 'ضريبة مرتبات'], ['SOCIAL_INSURANCE', 'تأمينات اجتماعية'], ['CONTRACTUAL', 'استقطاع تعاقدي (مش ضريبة)']];
  readonly bases: [string, string][] = [['NET_OF_DISCOUNT', 'الصافي بعد الخصم التجاري'], ['GROSS', 'الإجمالي'], ['NET_PLUS_VAT', 'الصافي + القيمة المضافة'], ['TAXABLE_WAGE', 'الأجر الخاضع'], ['CONTRACT_VALUE', 'قيمة العقد']];
  newCode = { code: '', name: '', category: 'VAT' };
  note = '';
  v = { code: '', method: 'PERCENT', rate: '', fixedAmount: '', bracketsJson: '', base: 'NET_OF_DISCOUNT', baseRatio: '100', minBase: '', appliesTo: '', bearer: 'COUNTERPARTY', collector: 'COUNTERPARTY_CHARGES', effectiveFrom: '', effectiveTo: '', conditionsJson: '', exemptionsJson: '', legalRef: '', notesCfo: '', notesAdvisor: '', changeReason: '' };
  p = { documentType: '', date: '', codes: '', amount: '', contractDate: '' };
  readonly total = computed(() => this.codes().length);
  catLabel = (c: string) => this.categories.find((x) => x[0] === c)?.[1] ?? c;
  statusLabel = (s: string) => STATUS[s] ?? s;
  ngOnInit() { void this.load(); }
  private async run(f: () => Promise<unknown>, msg: string) { this.error.set(''); try { await f(); await this.load(); } catch (e) { this.error.set(errorMessage(e, msg)); } }
  async load() { try { this.codes.set(await firstValueFrom(this.http.get<TaxCode[]>('/api/v1/finance/taxes'))); } catch (e) { this.error.set(errorMessage(e, 'تعذر التحميل')); } }
  createCode() { return this.run(() => firstValueFrom(this.http.post('/api/v1/finance/taxes/codes', this.newCode)), 'تعذر إضافة الكود'); }
  createVersion() {
    const v = this.v; const opt = (s: string) => (s.trim() ? s.trim() : undefined);
    let parsed: Record<string, unknown>;
    try {
      parsed = { brackets: v['bracketsJson'] ? JSON.parse(v['bracketsJson']) : undefined, conditions: v['conditionsJson'] ? JSON.parse(v['conditionsJson']) : undefined, exemptions: v['exemptionsJson'] ? JSON.parse(v['exemptionsJson']) : undefined };
    } catch { this.error.set('صيغة JSON غير صحيحة في الشرائح/الشروط/الإعفاءات'); return; }
    const body = { method: v['method'], rate: v['method'] === 'PERCENT' ? opt(v['rate']) : undefined, fixedAmount: v['method'] === 'FIXED' ? opt(v['fixedAmount']) : undefined, ...parsed,
      base: v['base'], baseRatio: opt(v['baseRatio']), minBase: opt(v['minBase']), appliesTo: v['appliesTo'].split(',').map((s) => s.trim()).filter(Boolean),
      bearer: v['bearer'], collector: v['collector'], effectiveFrom: v['effectiveFrom'], effectiveTo: opt(v['effectiveTo']), legalRef: opt(v['legalRef']),
      notesCfo: opt(v['notesCfo']), notesAdvisor: opt(v['notesAdvisor']), changeReason: v['changeReason'] };
    return this.run(() => firstValueFrom(this.http.post(`/api/v1/finance/taxes/codes/${encodeURIComponent(v['code'])}/versions`, body)), 'تعذر حفظ المسودة');
  }
  act(ver: TaxVersion, cmd: 'submit' | 'approve' | 'reject' | 'suspend') {
    return this.run(() => firstValueFrom(this.http.post(`/api/v1/finance/taxes/versions/${ver.id}/${cmd}`, cmd === 'submit' ? {} : { note: this.note.trim() || undefined })), 'تعذر تنفيذ العملية');
  }
  del(ver: TaxVersion) { return this.run(() => firstValueFrom(this.http.delete(`/api/v1/finance/taxes/versions/${ver.id}`)), 'تعذر المسح'); }
  async preview() {
    this.error.set(''); this.lines.set([]);
    const body = { documentType: this.p.documentType.trim(), date: this.p.date, codes: this.p.codes.split(',').map((s) => s.trim()).filter(Boolean),
      bases: { NET_OF_DISCOUNT: this.p.amount, GROSS: this.p.amount, NET_PLUS_VAT: this.p.amount, TAXABLE_WAGE: this.p.amount, CONTRACT_VALUE: this.p.amount }, context: this.p.contractDate ? { contractDate: this.p.contractDate } : {} };
    try { this.lines.set(await firstValueFrom(this.http.post<{ code: string; version: number; amount: string; exemptReason: string | null }[]>('/api/v1/finance/taxes/compute', body))); }
    catch (e) { this.error.set(errorMessage(e, 'تعذر الحساب')); }
  }
}
