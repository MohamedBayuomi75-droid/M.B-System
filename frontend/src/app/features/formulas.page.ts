import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { errorMessage, SessionService } from '../core/session.service';

interface Step { name: string; expr: string; kind?: string }
interface TestResult { name: string; inputs: unknown; expected: unknown; actual: unknown; status: 'PASS' | 'FAIL'; reason: string | null }
interface Version {
  id: string; code: string; version: number; status: string; change_kind: string; definition: { variables: Record<string, string>; lists?: Record<string, string[]>; steps: Step[] };
  test_cases: unknown[]; test_results: TestResult[] | null; tests_passed: boolean; conditions: Record<string, unknown>; effective_from: string; effective_to: string | null;
  change_reason: string; created_by: string; created_at: string; submitted_at: string | null; approved_by: string | null; approved_at: string | null; decision_note: string | null;
}
interface Formula { code: string; name: string; module: string; description: string | null; versions: Version[] }
const STATUS: Record<string, string> = { draft: 'مسودة', pending: 'بانتظار الاعتماد', approved: 'معتمد', rejected: 'مرفوض', suspended: 'موقوف', expired: 'منتهي' };
const KIND: Record<string, string> = { new: 'جديد', logic: 'تعديل منطق', parameters: 'تعديل قيم ومعاملات' };

/**
 * Financial Rules Management (B-20 §3، §13): المعادلات بإصداراتها، والصيغة والمتغيرات والشروط والسريان والحالة وسجل التعديلات،
 * وتشغيل الاختبارات ومعاينة النتيجة. المدير بيعدّ ويرسل، وشخص تاني بصلاحية «اعتماد» بيعتمد. الصيغ بلغة التعبيرات المحدودة بس.
 */
@Component({
  selector: 'app-formulas',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h1>إدارة القواعد المالية (Financial Rules Management)</h1>
    <p class="muted">المعادلات المقترحة مش معتمدة لحد قرار المدير المالي. المستند المرحّل بيحتفظ بإصدار المعادلة اللي اتحسب بيه، ومفيش إعادة احتساب.</p>
    @if (error()) { <div class="err" role="alert" id="frmError">{{ error() }}</div> }
    <table class="tbl" id="frmTable">
      <thead><tr><th>الكود</th><th>المعادلة</th><th>الموديول</th><th>الإصدار</th><th>الحالة</th><th>نوع التعديل</th><th>السريان</th></tr></thead>
      <tbody>
        @for (f of formulas(); track f.code) {
          @for (v of f.versions; track v.id) {
            <tr [attr.data-version]="v.id" [attr.data-status]="v.status" (click)="select(f, v)" [class.selected]="sel()?.id === v.id">
              <td dir="ltr">{{ f.code }}</td><td>{{ f.name }}</td><td>{{ f.module }}</td><td>{{ v.version }}</td><td>{{ st(v.status) }}</td><td>{{ kind(v.change_kind) }}</td>
              <td dir="ltr">{{ v.effective_from }} → {{ v.effective_to || '…' }}</td>
            </tr>
          } @empty { <tr [attr.data-code]="f.code"><td dir="ltr">{{ f.code }}</td><td>{{ f.name }}</td><td>{{ f.module }}</td><td colspan="4" class="muted">مفيش إصدارات</td></tr> }
        } @empty { <tr><td colspan="7" class="muted" id="frmEmpty">مفيش معادلات — المكتبة الأولية بتدخل كمسودات بأمر formulas:drafts</td></tr> }
      </tbody>
    </table>

    @if (sel(); as v) {
      <section id="frmDetail" class="card">
        <h2>{{ v.code }} — الإصدار {{ v.version }} ({{ st(v.status) }})</h2>
        <p><b>سبب الإصدار:</b> {{ v.change_reason }} · <b>الشروط:</b> <code dir="ltr">{{ json(v.conditions) }}</code></p>
        <h3>الصيغة</h3>
        <ol id="frmSteps" dir="ltr">@for (s of v.definition.steps; track s.name) { <li><b>{{ s.name }}</b> = <code>{{ s.expr }}</code> <small>({{ s.kind || 'money' }})</small></li> }</ol>
        <h3>المتغيرات</h3>
        <p dir="ltr">@for (e of vars(v); track e[0]) { <span class="chip">{{ e[0] }}: {{ e[1] }}</span> }</p>
        <h3>نتائج الاختبار @if (v.tests_passed) { <span class="ok">✓ ناجحة</span> } @else { <span class="err">✗</span> }</h3>
        <table class="tbl" id="frmTests"><thead><tr><th>الحالة</th><th>المتوقع</th><th>الفعلي</th><th>النتيجة</th><th>السبب</th></tr></thead>
          <tbody>@for (r of v.test_results ?? []; track r.name) { <tr [attr.data-test-status]="r.status"><td>{{ r.name }}</td><td dir="ltr"><code>{{ json(r.expected) }}</code></td><td dir="ltr"><code>{{ json(r.actual) }}</code></td><td>{{ r.status === 'PASS' ? '✅' : '❌' }}</td><td>{{ r.reason || '—' }}</td></tr> }</tbody></table>
        <h3>سجل الإصدارات</h3>
        <ul id="frmHistory">@for (h of history(); track h.id) { <li>v{{ h.version }} — {{ st(h.status) }} — {{ kind(h.change_kind) }} — {{ h.change_reason }} @if (h.decision_note) { — ملاحظة: {{ h.decision_note }} }</li> }</ul>
        <h3>معاينة النتيجة</h3>
        <mat-form-field appearance="outline" class="wide"><mat-label>المدخلات (JSON)</mat-label><textarea matInput id="frmPreviewIn" rows="4" dir="ltr" [(ngModel)]="previewIn"></textarea></mat-form-field>
        <button mat-flat-button id="frmPreviewBtn" (click)="preview(v)">احسب</button>
        @if (previewOut()) { <pre id="frmPreviewOut" dir="ltr">{{ previewOut() }}</pre> }
        <div class="row">
          <mat-form-field appearance="outline" class="wide"><mat-label>ملاحظة القرار (إلزامية للرفض والإيقاف)</mat-label><input matInput id="frmNote" [(ngModel)]="note" /></mat-form-field>
          @if (canPrepare && v.status === 'draft') { <button mat-button (click)="act(v, 'submit')" data-act="submit">إرسال للاعتماد</button><button mat-button (click)="del(v)">مسح المسودة</button> }
          @if (canApprove && v.status === 'pending' && v.created_by !== me()?.id) { <button mat-button (click)="act(v, 'approve')" data-act="approve">اعتماد</button><button mat-button color="warn" (click)="act(v, 'reject')" data-act="reject">رفض</button> }
          @if (canApprove && v.status === 'approved') { <button mat-button color="warn" (click)="act(v, 'suspend')" data-act="suspend">إيقاف</button> }
          @if (canPrepare) { <button mat-button (click)="startNew(v)" id="frmNewFrom">إصدار جديد من ده</button> }
        </div>
      </section>
    }

    @if (canPrepare && draft()) {
      <section id="frmNew" class="card">
        <h2>إصدار جديد — {{ draft()!.code }}</h2>
        <mat-form-field appearance="outline"><mat-label>نوع التعديل</mat-label><mat-select [(ngModel)]="nv.changeKind"><mat-option value="logic">تعديل منطق</mat-option><mat-option value="parameters">تعديل قيم ومعاملات</mat-option><mat-option value="new">جديد</mat-option></mat-select></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>بداية السريان</mat-label><input matInput type="date" [(ngModel)]="nv.effectiveFrom" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>نهاية السريان</mat-label><input matInput type="date" [(ngModel)]="nv.effectiveTo" /></mat-form-field>
        <mat-form-field appearance="outline" class="wide"><mat-label>التعريف: المتغيرات والخطوات (JSON)</mat-label><textarea matInput id="frmDef" rows="8" dir="ltr" [(ngModel)]="nv.definition"></textarea></mat-form-field>
        <mat-form-field appearance="outline" class="wide"><mat-label>حالات الاختبار (JSON) — إلزامية قبل الإرسال</mat-label><textarea matInput id="frmCases" rows="6" dir="ltr" [(ngModel)]="nv.testCases"></textarea></mat-form-field>
        <mat-form-field appearance="outline" class="wide"><mat-label>الشروط (JSON)</mat-label><input matInput dir="ltr" [(ngModel)]="nv.conditions" /></mat-form-field>
        <mat-form-field appearance="outline" class="wide"><mat-label>سبب التعديل *</mat-label><input matInput id="frmReason" [(ngModel)]="nv.changeReason" /></mat-form-field>
        <button mat-flat-button id="frmSave" (click)="saveVersion()">حفظ كمسودة وتشغيل الاختبارات</button>
        <button mat-button (click)="draft.set(null)">إلغاء</button>
      </section>
    }`,
})
export class FormulasPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  readonly me = this.session.me;
  readonly canPrepare = !!this.me()?.permissions.manageUsers;
  readonly canApprove = !!this.me()?.docActions?.approve;
  readonly formulas = signal<Formula[]>([]); readonly sel = signal<Version | null>(null); readonly error = signal('');
  readonly previewOut = signal(''); readonly draft = signal<Version | null>(null);
  readonly history = computed(() => this.formulas().find((f) => f.code === this.sel()?.code)?.versions ?? []);
  previewIn = '{}'; note = '';
  nv = { changeKind: 'logic', effectiveFrom: '', effectiveTo: '', definition: '', testCases: '', conditions: '{}', changeReason: '' };
  st = (s: string) => STATUS[s] ?? s; kind = (k: string) => KIND[k] ?? k; json = (v: unknown) => JSON.stringify(v);
  vars = (v: Version) => Object.entries(v.definition.variables).map(([k, t]) => [k, t === 'list' ? `قائمة (${(v.definition.lists?.[k] ?? []).join(', ')})` : t]);
  ngOnInit() { void this.load(); }
  async load() {
    try { this.formulas.set(await firstValueFrom(this.http.get<Formula[]>('/api/v1/finance/formulas'))); const s = this.sel(); if (s) this.sel.set(this.history().find((x) => x.id === s.id) ?? null); }
    catch (e) { this.error.set(errorMessage(e, 'تعذر التحميل')); }
  }
  select(_f: Formula, v: Version) { this.sel.set(v); this.previewOut.set(''); const tc = (v.test_cases[0] as { inputs?: unknown } | undefined)?.inputs; this.previewIn = JSON.stringify(tc ?? {}, null, 1); }
  private async run(f: () => Promise<unknown>, msg: string) { this.error.set(''); try { await f(); await this.load(); } catch (e) { this.error.set(errorMessage(e, msg)); } }
  async preview(v: Version) {
    let inputs: unknown; try { inputs = JSON.parse(this.previewIn); } catch { this.error.set('صيغة JSON غير صحيحة'); return; }
    try { const r = await firstValueFrom(this.http.post(`/api/v1/finance/formulas/versions/${v.id}/preview`, { inputs })); this.previewOut.set(JSON.stringify(r, null, 1)); }
    catch (e) { this.error.set(errorMessage(e, 'تعذر الحساب')); }
  }
  act(v: Version, cmd: 'submit' | 'approve' | 'reject' | 'suspend') { return this.run(() => firstValueFrom(this.http.post(`/api/v1/finance/formulas/versions/${v.id}/${cmd}`, cmd === 'submit' ? {} : { note: this.note.trim() || undefined })), 'تعذر تنفيذ العملية'); }
  del(v: Version) { return this.run(async () => { await firstValueFrom(this.http.delete(`/api/v1/finance/formulas/versions/${v.id}`)); this.sel.set(null); }, 'تعذر المسح'); }
  startNew(v: Version) {
    this.draft.set(v);
    this.nv = { changeKind: 'logic', effectiveFrom: '', effectiveTo: '', definition: JSON.stringify(v.definition, null, 1), testCases: JSON.stringify(v.test_cases, null, 1), conditions: JSON.stringify(v.conditions), changeReason: '' };
  }
  saveVersion() {
    const d = this.draft(); if (!d) return;
    let body: Record<string, unknown>;
    try { body = { changeKind: this.nv.changeKind, effectiveFrom: this.nv.effectiveFrom, effectiveTo: this.nv.effectiveTo || undefined, changeReason: this.nv.changeReason, definition: JSON.parse(this.nv.definition), testCases: JSON.parse(this.nv.testCases), conditions: JSON.parse(this.nv.conditions || '{}') }; }
    catch { this.error.set('صيغة JSON غير صحيحة في التعريف أو الاختبارات أو الشروط'); return; }
    return this.run(async () => { await firstValueFrom(this.http.post(`/api/v1/finance/formulas/${d.code}/versions`, body)); this.draft.set(null); }, 'تعذر حفظ الإصدار');
  }
}
