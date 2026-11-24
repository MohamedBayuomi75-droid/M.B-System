import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { legacyUrl } from '../core/page-routes';
import { errorMessage, SessionService } from '../core/session.service';
import { LegacyToast } from './legacy-toast';
import { effectiveLayout, LayoutDocs } from './legacy-table-layout';
import { LeaveForm, leaveForm } from './legacy-leave-form';

/* eslint-disable @typescript-eslint/no-explicit-any */
type P = any;
interface Opt { code: string; label: string }
interface Opts { today: string; types: Opt[]; excludeFridays: boolean; layout?: LayoutDocs; departments: Record<string, { id: string; name: string }[]>; people: Record<string, { id: string; name: string; code: string; departmentId: string }[]> }
const PAGE_SIZE = 20;
const EMPTY = { q: '', personKind: '', type: '', status: '', from: '', to: '' };
const fmtDate = (v: unknown) => { const m = String(v || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); return m ? `${Number(m[3])}/${Number(m[2])}/${m[1]}` : v ? String(v) : '—'; };
const DAY = 24 * 3600 * 1000;
/** calcLeaveDays (pages-leaves.js) — نفس الحساب اللي النافذة القديمة بتعمله لما التاريخ يتغيّر */
function calcLeaveDays(from: string, to: string, excludeFridays: boolean): number {
  if (!from || !to) return 1;
  const a = Date.parse(`${from}T12:00:00Z`), b = Date.parse(`${to}T12:00:00Z`);
  const total = Math.round((b - a) / DAY) + 1;
  if (total <= 0) return 1;
  if (excludeFridays) { let n = 0; for (let i = 0; i < total; i++) if (new Date(a + i * DAY).getUTCDay() !== 5) n++; return n > 0 ? n : 1; }
  return total;
}

/**
 * الإجازات — بنفس شكل الواجهة القديمة (DEC-0093، DEC-0127): renderLeavesPage وopenLeaveModal (pages-leaves.js).
 * القايمة والكروت والأسماء والحفظ والموافقة والرفض والحذف من السيرفر بنفس الدوال القديمة (tests-merge/phase80.js)،
 * والسيرفر بيحدّث حالة الأشخاص («في إجازة») مع كل تغيير (د-2). الطباعة 🧾 والتقارير والتصدير من الشاشة الكاملة (د-5).
 */
@Component({
  selector: 'app-leaves',
  imports: [FormsModule],
  template: `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
        <div>
          <h2 class="page-title" style="margin:0;">الإجازات</h2>
          <p class="page-sub" style="margin:4px 0 0;">طلبات الإجازات والموافقات — موظفين وعمال ومشرفين وسائقين</p>
        </div>
        <div class="btn-row page-header-actions" style="display:flex;flex-wrap:nowrap;gap:8px;align-items:center;">
          <span class="page-export-bar" style="display:inline-flex;gap:6px;"><a class="btn btn-outline btn-sm" [href]="full" title="التصدير من الشاشة الكاملة">إكسيل</a><a class="btn btn-outline btn-sm" [href]="full" title="التصدير من الشاشة الكاملة">CSV</a></span>
          @if (canAdd) { <button type="button" class="btn btn-primary" id="btnAddLeave" (click)="openEdit(null)">+ طلب إجازة</button> }
        </div>
      </div>

      <div class="stats-row" id="lvCards" style="margin-bottom:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;">
        <div class="stat-card"><div class="num">{{ cards().total }}</div><div class="lbl">إجمالي الطلبات</div></div>
        <div class="stat-card" [class.debt]="cards().pending"><div class="num">{{ cards().pending }}</div><div class="lbl">قيد الانتظار</div></div>
        <div class="stat-card"><div class="num">{{ cards().approved }}</div><div class="lbl">مقبولة</div></div>
        <div class="stat-card"><div class="num">{{ cards().rejected }}</div><div class="lbl">مرفوضة</div></div>
      </div>

      <!-- الفلاتر بتتطبّق بزرار «تطبيق» (أو Enter في البحث) زي القديمة -->
      <div class="filters-bar filters-bar-one-row lv-filters">
        <input type="search" id="lvSearch" class="input" placeholder="بحث بالاسم / السبب..." [(ngModel)]="d.q" (keydown.enter)="apply()">
        <select id="lvFilterKind" class="input" [(ngModel)]="d.personKind"><option value="">كل الفئات</option><option value="employee">موظفين</option><option value="worker">عمال</option><option value="supervisor">مشرفين</option><option value="driver">سائقين</option></select>
        <select id="lvFilterType" class="input" [(ngModel)]="d.type"><option value="">كل الأنواع</option>@for (o of types(); track o.code) { <option [value]="o.code">{{ o.label }}</option> }</select>
        <select id="lvFilterStatus" class="input" [(ngModel)]="d.status"><option value="">كل الحالات</option>@for (o of statuses(); track o.code) { <option [value]="o.code">{{ o.label }}</option> }</select>
        <label class="lv-lab">من <input type="date" id="lvFilterFrom" class="input" [(ngModel)]="d.from"></label>
        <label class="lv-lab">إلى <input type="date" id="lvFilterTo" class="input" [(ngModel)]="d.to"></label>
        <button type="button" class="btn btn-outline btn-sm" id="lvApply" (click)="apply()">تطبيق</button>
      </div>
      @if (error() && !modal()) { <div class="err" role="alert" id="lvError">{{ error() }}</div> }

      <div class="table-wrap"><table class="data-table" id="lvTable">
        <thead><tr><th>الاسم</th><th>الفئة</th><th>النوع</th><th>من</th><th>إلى</th><th>أيام</th><th>الحالة</th><th>السبب</th><th></th></tr></thead>
        <tbody>
          @for (l of pageRows(); track l.id) {
            <tr [attr.data-id]="l.id">
              <td><strong>{{ l.personName }}</strong></td>
              <td>{{ l.kindLabel }}</td>
              <td>{{ l.typeLabel }}</td>
              <td>{{ fmtDate(l.from) }}</td>
              <td>{{ fmtDate(l.to) }}</td>
              <td>{{ l.days || '—' }}</td>
              <td><span [style.color]="statusColor(l.status || 'pending')" style="font-weight:700;">{{ l.statusLabel }}</span></td>
              <td>{{ l.reason || '' }}</td>
              <td style="white-space:nowrap;">
                @if ((l.status || 'pending') === 'pending' && canEdit) {
                  <button type="button" class="btn btn-outline btn-sm btn-ok-lv" [attr.data-id]="l.id" title="موافقة" (click)="decide(l, 'approve')">✓</button>
                  <button type="button" class="btn btn-outline btn-sm btn-no-lv" [attr.data-id]="l.id" title="رفض" (click)="decide(l, 'reject')">✗</button>
                }
                <a class="btn btn-outline btn-sm btn-print-lv" [attr.data-id]="l.id" [href]="full" title="الطباعة من الشاشة الكاملة (د-5)">🧾</a>
                <button type="button" class="btn btn-outline btn-sm btn-edit-lv" [attr.data-id]="l.id" [disabled]="!canEdit" (click)="openEdit(l)">✏️</button>
                <button type="button" class="btn btn-outline btn-sm btn-del-lv" [attr.data-id]="l.id" [disabled]="!canDelete" (click)="askDelete(l)">🗑️</button>
              </td>
            </tr>
          } @empty { <tr><td colspan="9" style="text-align:center;color:var(--ink-soft);padding:24px;">لا طلبات إجازة</td></tr> }
        </tbody>
      </table></div>
      <div class="btn-row table-pager" data-pager="leaves" style="justify-content:space-between;align-items:center;margin-top:10px;flex-wrap:wrap;gap:8px;">
        <span style="font-size:13px;color:var(--ink-soft);">عرض {{ rows().length ? (curPage() - 1) * pageSize + 1 : 0 }}–{{ min(curPage() * pageSize, rows().length) }} من {{ rows().length }} <span style="opacity:.75;">(20 صف لكل صفحة)</span></span>
        <div style="display:flex;gap:8px;align-items:center;">
          <button type="button" class="btn btn-outline btn-sm" [disabled]="curPage() <= 1" (click)="page.set(curPage() - 1)">السابق</button>
          <span style="font-size:13px;font-weight:700;">صفحة {{ curPage() }} / {{ pages() }}</span>
          <button type="button" class="btn btn-outline btn-sm" [disabled]="curPage() >= pages()" (click)="page.set(curPage() + 1)">التالي</button>
        </div>
      </div>
    </div>

    @if (modal() && opts(); as o) {
      <div class="modal-overlay" id="appModal" (click)="$event.target === $event.currentTarget && close()">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header"><h3>{{ e.id ? 'تعديل إجازة' : 'طلب إجازة' }}</h3><button type="button" class="modal-close" (click)="close()">×</button></div>
          <div class="modal-body">
            <div class="form-grid form-grid-2">
              <label [style.order]="fo.order['kind']" [style.display]="fo.hide['kind'] ? 'none' : null" [style.grid-column]="gc('kind', false)">{{ fo.label['kind'] || 'الفئة *' }}
                <select class="input" id="lvKind" [(ngModel)]="e.personKind" (ngModelChange)="e.dept = ''; e.personId = ''"><option value="employee">موظف</option><option value="worker">عامل</option><option value="supervisor">مشرف</option><option value="driver">سائق</option></select>
              </label>
              <label [style.order]="fo.order['dept']" [style.display]="fo.hide['dept'] ? 'none' : null" [style.grid-column]="gc('dept', false)">{{ fo.label['dept'] || 'القسم' }}
                <select class="input" id="lvDept" [(ngModel)]="e.dept" (ngModelChange)="onDept()"><option value="">— كل الأقسام —</option>@for (d of o.departments[e.personKind] || []; track d.id) { <option [value]="d.id">{{ d.name }}</option> }</select>
              </label>
              <label id="lvPersonLab" [style.order]="fo.order['person']" [style.display]="fo.hide['person'] ? 'none' : null" [style.grid-column]="gc('person', true)">{{ fo.label['person'] || 'الشخص *' }}
                <!-- entityComboHtml: الأشخاص بالفئة (ومصفّيين بالقسم)، والاسم «الاسم — الكود» -->
                <select class="input" id="lvEmp" [(ngModel)]="e.personId"><option value="">{{ e.dept ? 'اختر من القسم...' : 'اكتب الاسم أو الكود...' }}</option>@for (p of personOptions(o); track p.id) { <option [value]="p.id">{{ (p.name || p.code || p.id) + (p.code ? ' — ' + p.code : '') }}</option> }</select>
              </label>
              <label [style.order]="fo.order['type']" [style.display]="fo.hide['type'] ? 'none' : null" [style.grid-column]="gc('type', false)">{{ fo.label['type'] || 'نوع الإجازة' }}
                <select class="input" id="lvType" [(ngModel)]="e.type">@for (t of o.types; track t.code) { <option [value]="t.code">{{ t.label }}</option> }</select>
              </label>
              <label [style.order]="fo.order['days']" [style.display]="fo.hide['days'] ? 'none' : null" [style.grid-column]="gc('days', false)">{{ fo.label['days'] || 'عدد الأيام' }}
                <input class="input" id="lvDays" type="number" min="0.5" step="0.5" [(ngModel)]="e.days">
              </label>
              <label [style.order]="fo.order['from']" [style.display]="fo.hide['from'] ? 'none' : null" [style.grid-column]="gc('from', false)">{{ fo.label['from'] || 'من تاريخ' }}
                <input class="input" id="lvFromD" type="date" [(ngModel)]="e.from" (change)="syncDays()">
              </label>
              <label [style.order]="fo.order['to']" [style.display]="fo.hide['to'] ? 'none' : null" [style.grid-column]="gc('to', false)">{{ fo.label['to'] || 'إلى تاريخ' }}
                <input class="input" id="lvToD" type="date" [(ngModel)]="e.to" (change)="syncDays()">
              </label>
              <label [style.order]="fo.order['reason']" [style.display]="fo.hide['reason'] ? 'none' : null" [style.grid-column]="gc('reason', true)">{{ fo.label['reason'] || 'السبب' }}
                <textarea class="input" id="lvReason" rows="2" [(ngModel)]="e.reason"></textarea>
              </label>
            </div>
            @if (error()) { <div class="err" role="alert" id="lvModalError">{{ error() }}</div> }
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="close()">إلغاء</button>
            <button type="button" class="btn btn-primary" id="btnSaveLv" [disabled]="saving()" (click)="save()">{{ e.id ? 'حفظ التعديل' : 'إرسال الطلب' }}</button>
          </div>
        </div>
      </div>
    }
    @if (delTarget(); as t) {
      <!-- confirmDelete → confirmApp (helpers.js): نفس الشكل -->
      <div class="modal-overlay" id="appConfirmModal" style="z-index:500000;" (click)="$event.target === $event.currentTarget && delTarget.set(null)">
        <div class="modal app-confirm-modal">
          <div class="modal-header app-confirm-head danger"><span class="confirm-icon" aria-hidden="true">🗑️</span><h3 style="margin:0;flex:1;">تأكيد الحذف</h3><button type="button" class="modal-close" aria-label="إغلاق" (click)="delTarget.set(null)">×</button></div>
          <div class="modal-body">هل أنت متأكد من الحذف؟</div>
          <div class="modal-footer"><button type="button" class="btn btn-danger" id="btnConfirmDel" (click)="remove(t)">حذف</button><button type="button" class="btn btn-outline" (click)="delTarget.set(null)">إلغاء</button></div>
        </div>
      </div>
    }`,
})
export class LeavesPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly toast = new LegacyToast();
  readonly full = legacyUrl('leaves');
  readonly canAdd = this.session.can('leaves', 'add');
  readonly canEdit = this.session.can('leaves', 'edit');
  readonly canDelete = this.session.can('leaves', 'delete');
  readonly pageSize = PAGE_SIZE;
  /** المكتوب في الفلاتر (draft) — بيتطبّق بزرار «تطبيق» بس */
  d = { ...EMPTY };
  private applied = { ...EMPTY };
  readonly rows = signal<P[]>([]);
  readonly cards = signal({ total: 0, pending: 0, approved: 0, rejected: 0 });
  readonly types = signal<Opt[]>([]);
  readonly statuses = signal<Opt[]>([]);
  readonly error = signal('');
  readonly page = signal(1);
  readonly modal = signal(false);
  readonly saving = signal(false);
  readonly opts = signal<Opts | null>(null);
  readonly delTarget = signal<P | null>(null);
  readonly pages = computed(() => Math.max(1, Math.ceil(this.rows().length / PAGE_SIZE)));
  readonly curPage = computed(() => Math.min(this.page(), this.pages()));
  readonly pageRows = computed(() => this.rows().slice((this.curPage() - 1) * PAGE_SIZE, this.curPage() * PAGE_SIZE));
  e: P = {};
  /** النافذة بعد applyFormLayout في القديمة (الترتيب والأسماء والإخفاء من التخطيط المحفوظ — UAT 8.4 V3) */
  fo: LeaveForm = leaveForm([]);
  /** grid-column: لو الخانة في التخطيط ← «كبير» بس بعرض الصف (applyFormLayout بيشيل الأصلي)، وإلا الأصلي */
  gc(id: string, full: boolean) { const w = this.fo.wide[id]; return (w === null || w === undefined ? full : w) ? '1 / -1' : null; }
  fmtDate = fmtDate; min = Math.min;
  statusColor = (st: string) => (st === 'pending' ? '#e6a700' : st === 'approved' ? '#1B4332' : st === 'rejected' ? '#c1121f' : 'inherit');

  ngOnInit() { void this.load(); }
  apply() { this.applied = { ...this.d }; this.page.set(1); void this.load(); }
  async load() {
    this.error.set('');
    try {
      let params = new HttpParams();
      for (const [k, v] of Object.entries(this.applied)) if (v) params = params.set(k, v);
      const r = await firstValueFrom(this.http.get<{ rows: P[]; cards: { total: number; pending: number; approved: number; rejected: number }; types: Opt[]; statuses: Opt[] }>('/api/v1/leaves', { params }));
      this.rows.set(r.rows); this.cards.set(r.cards); this.types.set(r.types); this.statuses.set(r.statuses);
    } catch (err) { this.error.set(errorMessage(err, 'تعذر التحميل')); }
  }

  /** الأشخاص بالفئة، ومصفّيين بالقسم لو اتحدد (listEntitiesForKind + __leaveDeptFilter) */
  personOptions(o: Opts) { const all = o.people[this.e['personKind']] || []; return this.e['dept'] ? all.filter((p) => String(p.departmentId) === String(this.e['dept'])) : all; }
  /** تغيير القسم: لو الشخص المختار مش من القسم بيتفرّغ */
  onDept() { const o = this.opts(); if (!o || !this.e['dept'] || !this.e['personId']) return; const p = (o.people[this.e['personKind']] || []).find((x) => x.id === this.e['personId']); if (p && p.departmentId && p.departmentId !== this.e['dept']) this.e['personId'] = ''; }
  syncDays() { const o = this.opts(); if (o && this.e['from'] && this.e['to']) this.e['days'] = calcLeaveDays(this.e['from'], this.e['to'], o.excludeFridays); }
  async openEdit(l: P | null) {
    this.error.set('');
    try {
      const o = await firstValueFrom(this.http.get<Opts>('/api/v1/leaves/form-options'));
      const kind = l ? l.personKind || l.kind || 'employee' : 'employee';
      const pid = l ? l.personId || l.employeeId || '' : '';
      const p = (o.people[kind] || []).find((x) => x.id === pid);
      this.e = { id: l ? l.id : '', rev: l ? l.rev : 0, personKind: kind, personId: pid, dept: p ? p.departmentId : '', type: (l && l.type) || 'annual', days: (l && l.days) || 1,
        from: (l && l.from) || o.today, to: (l && l.to) || o.today, reason: (l && l.reason) || '' };
      this.fo = leaveForm(effectiveLayout('leaves', o.layout || null));
      this.opts.set(o); this.modal.set(true);
    } catch (err) { this.error.set(errorMessage(err, 'تعذر فتح النافذة')); }
  }
  close() { this.modal.set(false); this.error.set(''); }
  async save() {
    const e = this.e;
    if (!e['personId']) { this.toast.show('اختر الشخص'); return; }
    this.saving.set(true); this.error.set('');
    const body = { personKind: e['personKind'], personId: e['personId'], type: e['type'], from: e['from'], to: e['to'], days: String(e['days'] ?? ''), reason: e['reason'] };
    try {
      if (e['id']) await firstValueFrom(this.http.patch(`/api/v1/leaves/${encodeURIComponent(e['id'])}`, { ...body, rev: e['rev'] }));
      else await firstValueFrom(this.http.post('/api/v1/leaves', body, { headers: new HttpHeaders({ 'Idempotency-Key': `lv-${crypto.randomUUID()}` }) }));
      this.modal.set(false); this.toast.show('تم الحفظ'); await this.load();
    } catch (err) { const m = errorMessage(err, 'تعذّر الحفظ'); this.toast.show(m); this.error.set(m); } finally { this.saving.set(false); }
  }
  async decide(l: P, what: 'approve' | 'reject') {
    try {
      await firstValueFrom(this.http.post(`/api/v1/leaves/${encodeURIComponent(l.id)}/${what}`, { rev: l.rev }, { headers: new HttpHeaders({ 'Idempotency-Key': `lv-${what}-${crypto.randomUUID()}` }) }));
      this.toast.show(what === 'approve' ? 'تمت الموافقة' : 'تم الرفض'); await this.load();
    } catch (err) { const m = errorMessage(err, 'تعذّر الحفظ'); this.toast.show(m); this.error.set(m); }
  }
  askDelete(l: P) { this.delTarget.set(l); }
  async remove(l: P) {
    this.delTarget.set(null);
    try { await firstValueFrom(this.http.delete(`/api/v1/leaves/${encodeURIComponent(l.id)}`, { params: new HttpParams().set('rev', String(l.rev)) })); this.toast.show('تم الحذف'); await this.load(); }
    catch (err) { const m = errorMessage(err, 'تعذّر الحذف'); this.toast.show(m); this.error.set(m); }
  }
}
