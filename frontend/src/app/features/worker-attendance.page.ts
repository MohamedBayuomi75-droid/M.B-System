import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { legacyUrl } from '../core/page-routes';
import { errorMessage, SessionService } from '../core/session.service';
import { LegacyToast } from './legacy-toast';
import { ModalField, ModalForm, modalForm } from './legacy-leave-form';
import { effectiveLayout } from './legacy-table-layout';

/* eslint-disable @typescript-eslint/no-explicit-any */
type P = any;
type Kind = 'worker' | 'supervisor' | 'driver';
interface Opt { code: string; label: string }
const PAGE_SIZE = 20;
/** خانات نافذة اليومية بترتيبها في الـ DOM، والـ selectors اللي applyFormLayout بتلاقيها جوّاها (الشخص: entityCombo) */
const WATT_FIELDS: ModalField[] = [
  { id: 'kind', sels: ['#wattType'] }, { id: 'person', sels: ['#wattPerson_text', '#wattPerson', '#wattPersonBox', '#wattPersonLabel'] }, { id: 'status', sels: ['#wattStatus'] },
  { id: 'date', sels: ['#wattDate'] }, { id: 'days', sels: ['#wattDays'] }, { id: 'wage', sels: ['#wattDayWage'] }, { id: 'ded', sels: ['#wattDeduction', '#wattDedWrap'] },
  { id: 'project', sels: ['#wattProject'] }, { id: 'site', sels: ['#wattSite'] }, { id: 'notes', sels: ['#wattNotes'] },
];
const TABS: Record<string, { label: string; kind: Kind; search: string }> = {
  workers: { label: 'العمال', kind: 'worker', search: 'اسم أو كود العامل...' }, supervisors: { label: 'المشرفون', kind: 'supervisor', search: 'اسم أو كود المشرف...' },
  drivers: { label: 'السائقون', kind: 'driver', search: 'اسم أو كود السائق...' },
};
const fmtNum = (n: unknown) => (Number(n) || 0).toLocaleString('ar-EG', { maximumFractionDigits: 6 });
const fmtMoney = (n: unknown) => `${fmtNum(n)} ج.م`;
const fmtDate = (v: unknown) => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${Number(m[3])}/${Number(m[2])}/${m[1]}` : v ? String(v) : '—'; };
/** fmtDays (helpers.js) */
function fmtDays(n: unknown): string {
  const x = Number(n) || 0; if (!x) return '0';
  const r = Math.round(x * 100) / 100;
  if (Math.abs(r - Math.round(r)) < 0.005) return String(Math.round(r));
  const whole = Math.floor(r), frac = Math.round((r - whole) * 100) / 100;
  const sym = frac === 0.5 ? '½' : frac === 0.25 ? '¼' : frac === 0.75 ? '¾' : '';
  return sym ? (whole === 0 ? sym : `${whole}${sym}`) : String(r);
}
const round2 = (n: unknown) => { const x = Number(n); return Number.isFinite(x) ? Math.round((x + (x < 0 ? -Number.EPSILON : Number.EPSILON)) * 100) / 100 : 0; };
/** المستحق بالحساب الجديد للمعاينة (DEC-0129): الأجر × الأيام (6 خانات) − الخصم ≥ 0، وغائب/عطلة = 0 */
function previewNet(status: string, wage: number, days: number, ded: number) {
  if (status === 'absent' || status === 'holiday') return 0;
  const v = Number((wage * days).toFixed(6)) - (status === 'late' ? ded : 0);
  return v > 0 ? Number(v.toFixed(6)) : 0;
}

/**
 * اليوميات — بنفس شكل الواجهة القديمة (DEC-0093، DEC-0135): renderWorkerAttendancePage وopenWorkerAttModal وopenWattDaySitesModal (pages-worker-attendance.js).
 * لوحات الأنواع ← الأقسام ← الجدول الشهري (الفترة، والكروت، والفلاتر، والعلامة لكل يوم، و⚑ لأكتر من موقع) ← النافذة.
 * الأشخاص والسجلات والحفظ من السيرفر بنفس الدوال القديمة (tests-merge/phase82.js). **المستحق بالحساب الجديد (DEC-0129/0130)**، ومعاه تقرير الفرق
 * عن القديم (د-2)، وقايمة المراجعة (DEC-0133). الأجر والمستحق مابيظهروش من غير صلاحيتهم (DEC-0134). يوميات المعدات والتصدير من الشاشة الكاملة.
 */
@Component({
  selector: 'app-worker-attendance',
  imports: [FormsModule],
  template: `
    @if (!tab()) {
      <div class="page">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <div><h2 class="page-title" style="margin:0;">اليوميات</h2><p class="page-sub" style="margin:4px 0 0;">اختر فئة — الأقسام مرتبطة بصفحات الناس والمعدات</p></div>
          <div class="btn-row"><span class="page-export-bar" style="display:inline-flex;gap:6px;"><a class="btn btn-outline btn-sm" [href]="full">إكسيل</a><a class="btn btn-outline btn-sm" [href]="full">CSV</a></span></div>
        </div>
        <div class="board-grid exp-kind-boards" id="dlKinds">
          @for (b of boards().kinds; track b.id) {
            <button type="button" class="board-card dailies-kind-board" [attr.data-dailies-tab]="b.id" (click)="enterTab(b.id)">
              <div class="board-card-icon">{{ b.icon }}</div><div class="board-card-title">{{ b.label }}</div>
              <div class="board-card-meta"><span>{{ b.count }} سجل</span><span>{{ b.depts }} قسم</span></div>
            </button>
          }
          <a class="board-card dailies-kind-board" data-dailies-tab="equipment" [href]="full" title="يوميات المعدات من الشاشة الكاملة (الحزمة 8.7)">
            <div class="board-card-icon">🛻</div><div class="board-card-title">المعدات والمركبات</div><div class="board-card-meta"><span>الشاشة الكاملة</span></div>
          </a>
        </div>
      </div>
    } @else if (dept() === null) {
      <div class="page">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <div>
            <button type="button" class="btn btn-outline btn-sm" id="btnDailiesBackKinds" (click)="tab.set(''); load()">← كل اليوميات</button>
            <h2 class="page-title" style="margin:10px 0 0;">{{ t().label }}</h2>
            <p class="page-sub" style="margin:4px 0 0;">أقسام مرتبطة بصفحة {{ t().label }} — اضغط لوحة للعرض</p>
          </div>
        </div>
        <div class="board-grid exp-sec-boards" id="dlDepts">
          @for (d of boards().depts[tab()] || []; track d.id) {
            <button type="button" class="board-card dailies-dept-board" [attr.data-dailies-dept]="d.id" (click)="enterDept(d.id)">
              <div class="board-card-icon">{{ d.id ? '📁' : '📂' }}</div><div class="board-card-title">{{ d.name }}</div><div class="board-card-meta"><span>{{ d.count }} سجل</span></div>
            </button>
          }
        </div>
      </div>
    } @else {
      <div class="page">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <div>
            <button type="button" class="btn btn-outline btn-sm" id="btnDailiesBackDepts" (click)="dept.set(null)">← الأقسام</button>
            <h2 class="page-title" style="margin:10px 0 0;">اليوميات — {{ t().label }}</h2>
            <p class="page-sub" style="margin:4px 0 0;">جدول شهري — علامة ✓ تحت اليوم · اضغط للتعديل</p>
          </div>
          <div class="btn-row page-header-actions" style="display:flex;flex-wrap:nowrap;gap:8px;align-items:center;">
            <span class="page-export-bar" style="display:inline-flex;gap:6px;"><a class="btn btn-outline btn-sm" [href]="full">إكسيل</a><a class="btn btn-outline btn-sm" [href]="full">CSV</a></span>
            <button type="button" class="btn btn-outline" id="btnDlReview" (click)="openReview()">🔎 مراجعة اليوميات @if (reviewCount()) { ({{ reviewCount() }}) }</button>
            @if (canAdd) { <button type="button" class="btn btn-primary" id="btnAddWatt" (click)="openEdit(null)">+ تسجيل يومية</button> }
          </div>
        </div>
        <div class="sc-row" id="dlCards">
          <div class="sc-card"><span class="sc-ico">👥</span><div class="sc-body"><div class="sc-num">{{ fmtNum(g().cards.people) }}</div><div class="sc-lbl">عدد {{ tab() === 'supervisors' ? 'المشرفين' : tab() === 'drivers' ? 'السائقين' : 'العمال' }}</div></div></div>
          <div class="sc-card ok"><span class="sc-ico">📅</span><div class="sc-body"><div class="sc-num">{{ g().cards.days }}</div><div class="sc-lbl">أيام العمل في الشهر</div></div></div>
          @if (g().wages) { <div class="sc-card"><span class="sc-ico">💰</span><div class="sc-body"><div class="sc-num">{{ fmtMoney(g().cards.pay) }}</div><div class="sc-lbl">مستحق الشهر</div></div></div> }
          <div class="sc-card" [class.warn]="g().cards.multi !== '0'"><span class="sc-ico">⚑</span><div class="sc-body"><div class="sc-num">{{ g().cards.multi }}</div><div class="sc-lbl">أيام في أكثر من مشروع</div></div></div>
        </div>
        @if (g().wages && diff(); as d) {
          <!-- تقرير الفرق (د-2): الحساب الجديد (DEC-0129/0130) قدام القديم لنفس الفترة -->
          <div class="dl-diff" id="dlDiff" style="margin:-4px 0 12px;font-size:12.5px;color:var(--ink-soft);">
            الحساب الجديد (DEC-0129): {{ fmtMoney(d.newTotal) }} — بالحساب القديم: {{ fmtMoney(d.legacyTotal) }} — الفرق {{ fmtMoney(d.difference) }} في {{ d.changed }} يومية
            @if (d.byReason?.review) { · منها {{ d.byReason.review }} مستنية مراجعة }
          </div>
        }
        <div class="dly-filters">
          <label class="dly-f"><span>من</span><input type="date" id="wattFrom" class="input" [(ngModel)]="f.from" (change)="reload()"></label>
          <label class="dly-f"><span>إلى</span><input type="date" id="wattTo" class="input" [(ngModel)]="f.to" (change)="reload()"></label>
          @if (tab() === 'workers') { <label class="dly-f"><span>المشرف</span><select id="wattFilterSup" class="input" [(ngModel)]="f.supervisorId" (change)="reload()"><option value="">كل المشرفين...</option>@for (s of g().options.supervisors; track s.id) { <option [value]="s.id">{{ s.name }}{{ s.code ? ' — ' + s.code : '' }}</option> }</select></label> }
          <label class="dly-f"><span>المشروع</span><select id="wattFilterProject" class="input" [(ngModel)]="f.project" (change)="reload()"><option value="">كل المشاريع</option>@for (p of g().options.projects; track p) { <option [value]="p">{{ p }}</option> }</select></label>
          <label class="dly-f"><span>الموقع</span><select id="wattFilterSite" class="input" [(ngModel)]="f.site" (change)="reload()"><option value="">كل المواقع</option>@for (p of g().options.sites; track p) { <option [value]="p">{{ p }}</option> }</select></label>
          <label class="dly-f"><span>الحالة</span><select id="wattFilterStatus" class="input" [(ngModel)]="f.status" (change)="reload()"><option value="">كل الحالات</option>@for (s of statuses; track s.code) { <option [value]="s.code">{{ s.label }}</option> }</select></label>
          <label class="dly-f"><span>بحث</span><input type="search" id="wattSearch" class="input" [placeholder]="t().search" [(ngModel)]="f.q" (ngModelChange)="reload(true)"></label>
          <div class="dly-f"><span>&nbsp;</span><button type="button" class="btn btn-outline dly-clear" id="wattClearFilters" (click)="clear()">مسح الفلاتر</button></div>
        </div>
        @if (error() && !modal()) { <div class="err" role="alert" id="dlError">{{ error() }}</div> }
        <div class="table-wrap" style="overflow:auto;max-width:100%;">
          <table class="data-table watt-grid" id="dlGrid" [style.min-width.px]="120 + g().dates.length * 36" style="font-size:12px;">
            <thead><tr>
              <th style="position:sticky;right:0;background:var(--paper);z-index:2;min-width:140px;">الاسم</th><th style="min-width:50px;">النوع</th>
              @for (d of g().dates; track d; let i = $index) { <th style="text-align:center;padding:4px;min-width:28px;">{{ +d.slice(8, 10) }}@if (i === 0 || +d.slice(8, 10) === 1) { <div style="font-size:9px;color:var(--ink-soft);font-weight:400;">{{ d.slice(5, 7) }}</div> }</th> }
              <th>أيام</th><th></th>
            </tr></thead>
            <tbody>
              @for (p of pageRows(); track p.id) {
                <tr [attr.data-id]="p.id">
                  <td style="position:sticky;right:0;background:var(--paper);z-index:1;"><strong>{{ p.name }}</strong><div style="font-size:11px;color:var(--ink-soft);">{{ p.code }}</div></td>
                  <td>{{ p.kind === 'supervisor' ? 'مشرف' : p.kind === 'driver' ? 'سائق' : 'عامل' }}</td>
                  @for (d of g().dates; track d) {
                    @let c = cell(p, d);
                    @if (!c) { <td style="text-align:center;padding:2px;"><button type="button" class="watt-cell empty" [attr.data-kind]="p.kind" [attr.data-id]="p.id" [attr.data-date]="d" title="تسجيل حضور" [disabled]="!canAdd" style="border:none;background:transparent;cursor:pointer;width:100%;min-height:28px;color:var(--ink-soft);" (click)="openEdit(null, { kind: p.kind, id: p.id, date: d })">·</button></td> }
                    @else { <td style="text-align:center;padding:2px;" [style.background]="c.multi ? '#fff7e6' : null"><button type="button" class="watt-cell filled" [attr.data-att]="c.id" [attr.data-multi]="c.multi ? 1 : 0" [attr.data-kind]="p.kind" [attr.data-id]="p.id" [attr.data-date]="d" [title]="c.title" [style.color]="c.color" style="border:none;background:transparent;cursor:pointer;font-weight:800;width:100%;min-height:28px;" (click)="c.multi ? openDay(p, d) : openEditById(c.id)">{{ c.mark }}</button></td> }
                  }
                  <td><strong>{{ p.totalDays }}</strong></td>
                  <td style="white-space:nowrap;"><button type="button" class="btn btn-outline btn-sm btn-add-watt-person" [attr.data-kind]="p.kind" [attr.data-id]="p.id" [disabled]="!canAdd" (click)="openEdit(null, { kind: p.kind, id: p.id })">+</button></td>
                </tr>
              } @empty { <tr><td [attr.colspan]="g().dates.length + 4" style="text-align:center;color:var(--ink-soft);padding:28px;">لا أشخاص للعرض — غيّر الفلتر أو أضف عمالاً/سائقين/مشرفين</td></tr> }
            </tbody>
          </table>
        </div>
        <div class="btn-row table-pager" data-pager="wattPeople" style="justify-content:space-between;align-items:center;margin-top:10px;flex-wrap:wrap;gap:8px;">
          <span style="font-size:13px;color:var(--ink-soft);">عرض {{ g().rows.length ? (curPage() - 1) * 20 + 1 : 0 }}–{{ min(curPage() * 20, g().rows.length) }} من {{ g().rows.length }} <span style="opacity:.75;">(20 صف لكل صفحة)</span></span>
          <div style="display:flex;gap:8px;align-items:center;">
            <button type="button" class="btn btn-outline btn-sm" [disabled]="curPage() <= 1" (click)="page.set(curPage() - 1)">السابق</button>
            <span style="font-size:13px;font-weight:700;">صفحة {{ curPage() }} / {{ pages() }}</span>
            <button type="button" class="btn btn-outline btn-sm" [disabled]="curPage() >= pages()" (click)="page.set(curPage() + 1)">التالي</button>
          </div>
        </div>
      </div>
    }

    @if (modal() && opts(); as o) {
      <div class="modal-overlay" id="appModal" (click)="$event.target === $event.currentTarget && close()">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header"><h3>{{ e.id ? 'تعديل يومية' : 'تسجيل يومية' }}</h3><button type="button" class="modal-close" (click)="close()">×</button></div>
          <div class="modal-body">
            <div class="form-grid form-grid-2">
              <label [style.order]="fo.order['kind']" [style.display]="fo.hide['kind'] ? 'none' : null" [style.grid-column]="gc('kind', false)">{{ fo.label['kind'] || 'النوع *' }}<select class="input" id="wattType" [(ngModel)]="e.personType" (ngModelChange)="e.personId = ''; fillWage()"><option value="worker">عامل</option><option value="supervisor">مشرف</option><option value="driver">سائق</option><option value="equipment">معدة</option></select></label>
              <label id="wattPersonLabel" [style.order]="fo.order['person']" [style.display]="fo.hide['person'] ? 'none' : null" [style.grid-column]="gc('person', false)">{{ fo.label['person'] || 'الشخص / المعدة *' }}
                @if (e.personType === 'equipment') { <a class="btn btn-outline btn-sm" [href]="full" style="display:block;margin-top:6px;">يوميات المعدات من الشاشة الكاملة</a> }
                @else { <select class="input" id="wattPerson" [(ngModel)]="e.personId" (ngModelChange)="fillWage(); sameDay()"><option value="">اكتب الاسم أو الكود...</option>@for (p of o.people[e.personType] || []; track p.id) { <option [value]="p.id">{{ (p.code ? p.code + ' — ' : '') + p.name }}</option> }</select> }
              </label>
              <label [style.order]="fo.order['status']" [style.display]="fo.hide['status'] ? 'none' : null" [style.grid-column]="gc('status', false)">{{ fo.label['status'] || 'الحالة' }}<select class="input" id="wattStatus" [(ngModel)]="e.status" (ngModelChange)="onStatus()">@for (s of statusesByLabel; track s.code) { <option [value]="s.code">{{ s.label }}</option> }</select></label>
              <label [style.order]="fo.order['date']" [style.display]="fo.hide['date'] ? 'none' : null" [style.grid-column]="gc('date', false)">{{ fo.label['date'] || 'التاريخ *' }}<input class="input" id="wattDate" type="date" [(ngModel)]="e.date" (change)="sameDay()"></label>
              <label [style.order]="fo.order['days']" [style.display]="fo.hide['days'] ? 'none' : null" [style.grid-column]="gc('days', false)">{{ fo.label['days'] || 'عدد الأيام المحسوبة *' }} <input class="input" id="wattDays" type="number" min="0" step="0.5" [(ngModel)]="e.days" (input)="daysTouched = true" title="مثال: 1 أو 2 أو 3 أو 0.5 لنصف يوم"><small style="display:block;color:var(--ink-soft);margin-top:4px;">اليوم الواحد ممكن يتحسب بيومين أو ثلاثة حسب الشغل</small></label>
              @if (o.wages) {
                <label [style.order]="fo.order['wage']" [style.display]="fo.hide['wage'] ? 'none' : null" [style.grid-column]="gc('wage', false)">{{ fo.label['wage'] || 'اليومية لهذا اليوم (ج.م)' }}<input class="input" id="wattDayWage" type="number" min="0" step="0.01" [(ngModel)]="e.dayWage"></label>
                <label id="wattDedWrap" [style.order]="fo.order['ded']" [style.display]="e.status === 'late' && !fo.hide['ded'] ? null : 'none'" [style.grid-column]="gc('ded', false)">{{ fo.label['ded'] || 'خصم التأخير (ج.م)' }}<input class="input" id="wattDeduction" type="number" min="0" step="0.01" [(ngModel)]="e.deduction"></label>
              }
              <label [style.order]="fo.order['project']" [style.display]="fo.hide['project'] ? 'none' : null" [style.grid-column]="gc('project', false)">{{ fo.label['project'] || 'المشروع *' }}<select class="input" id="wattProject" [(ngModel)]="e.project"><option value="">— اختر المشروع —</option>@for (p of projectOptions(o); track p) { <option [value]="p">{{ p }}</option> }</select></label>
              <label [style.order]="fo.order['site']" [style.display]="fo.hide['site'] ? 'none' : null" [style.grid-column]="gc('site', false)">{{ fo.label['site'] || 'الموقع' }}<input class="input" id="wattSite" [(ngModel)]="e.site" placeholder="اسم الموقع"></label>
              <label [style.order]="fo.order['notes']" [style.display]="fo.hide['notes'] ? 'none' : null" [style.grid-column]="gc('notes', true)">{{ fo.label['notes'] || 'ملاحظات' }}<textarea class="input" id="wattNotes" rows="4" [(ngModel)]="e.notes"></textarea></label>
            </div>
            @if (same(); as sd) {
              <div id="wattSameDay" style="margin-top:12px;padding:10px;border-radius:8px;background:#fff7e6;border:1px solid #f0c36d;font-size:13px;">
                <b>⚑ مسجّل بالفعل في هذا اليوم ({{ sd.count }} سجل — {{ sd.days }} يوم):</b><br>@for (x of sd.rows; track x.id) { • {{ x.project || 'غير محدد' }} — {{ x.daysText }} يوم<br> }<small>تسجيل موقع آخر لنفس اليوم مسموح، وسيظهر في كشف المشرف أنه كان في أكثر من موقع.</small>
              </div>
            }
            @if (o.wages) { <div id="wattPreview" style="margin-top:12px;padding:10px;border-radius:8px;background:var(--paper-2);border:1px solid var(--line);font-weight:700;">المستحق = اليومية × عدد الأيام: <span id="wattPreviewVal">{{ fmtNum(preview()) }}</span> ج.م</div> }
            @if (error()) { <div class="err" role="alert" id="dlModalError">{{ error() }}</div> }
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="close()">إلغاء</button>
            @if (e.id && canDelete) { <button type="button" class="btn btn-outline" id="btnDelWattModal" style="color:var(--debt);" (click)="askDelete()">حذف</button> }
            <button type="button" class="btn btn-outline" id="btnSaveWattMore" title="حفظ هذه اليومية وتسجيل موقع آخر لنفس اليوم" [disabled]="saving()" (click)="save(true)">حفظ + موقع آخر لنفس اليوم</button>
            <button type="button" class="btn btn-primary" id="btnSaveWatt" [disabled]="saving()" (click)="save(false)">{{ e.id ? 'حفظ التعديل' : 'تسجيل' }}</button>
          </div>
        </div>
      </div>
    }
    @if (dayView(); as dv) {
      <div class="modal-overlay" id="appModal" (click)="$event.target === $event.currentTarget && dayView.set(null)">
        <div class="modal" role="dialog"><div class="modal-header"><h3>يوميات {{ dv.name }} — {{ fmtDate(dv.date) }}</h3><button type="button" class="modal-close" (click)="dayView.set(null)">×</button></div>
          <div class="modal-body">
            <p class="wsite-note">يمكن تسجيل أكثر من موقع في نفس اليوم؛ اختر سجلاً للتعديل أو أضف موقعاً جديداً.</p>
            <div class="wsite-chips"><span class="wsite-chip">📍 عدد المواقع <b>{{ dv.rows.length }}</b></span><span class="wsite-chip">📅 إجمالي الأيام <b>{{ dv.totalDays }}</b></span>@if (dv.wages) { <span class="wsite-chip">💰 إجمالي المستحق <b>{{ fmtMoney(dv.totalNet) }}</b></span> }</div>
            <div class="table-wrap"><table class="data-table wsite-table"><thead><tr><th>م</th><th>الموقع / المشروع</th><th>الحالة</th><th>أيام</th>@if (dv.wages) { <th>اليومية</th><th>المستحق</th> }<th></th></tr></thead><tbody>
              @for (a of dv.rows; track a.id; let i = $index) {
                <tr><td>{{ i + 1 }}</td><td><strong>{{ a.project || 'غير محدد' }}</strong>@if (a.notes) { <div class="wsite-sub">{{ a.notes }}</div> }</td>
                  <td><span class="badge badge-{{ a.status === 'absent' ? 'err' : a.status === 'half' || a.status === 'late' ? 'warn' : 'ok' }}">{{ a.statusLabel }}</span></td><td>{{ fmtDays(a.credit) }}</td>
                  @if (dv.wages) { <td>{{ fmtMoney(a.wage) }}</td><td><strong>{{ fmtMoney(a.net) }}</strong></td> }
                  <td style="white-space:nowrap;"><button type="button" class="btn btn-outline btn-sm btn-wsite-edit" [attr.data-id]="a.id" (click)="dayView.set(null); openEditById(a.id)">تعديل</button> <button type="button" class="btn btn-outline btn-sm btn-wsite-del" [attr.data-id]="a.id" [disabled]="!canDelete" (click)="askDelete(a, dv)">حذف</button></td></tr>
              }
            </tbody><tfoot><tr><th colspan="3">الإجمالي</th><th>{{ dv.totalDays }}</th>@if (dv.wages) { <th></th><th>{{ fmtMoney(dv.totalNet) }}</th> }<th></th></tr></tfoot></table></div>
          </div>
          <div class="modal-footer">@if (canAdd) { <button type="button" class="btn btn-primary" id="btnWsiteAdd" (click)="dayView.set(null); openEdit(null, { kind: dv.kind, id: dv.id, date: dv.date })">+ موقع آخر لنفس اليوم</button> }<button type="button" class="btn btn-outline" (click)="dayView.set(null)">إغلاق</button></div>
        </div>
      </div>
    }
    @if (review(); as rv) {
      <!-- قايمة المراجعة (DEC-0133) -->
      <div class="modal-overlay" id="appModal" (click)="$event.target === $event.currentTarget && review.set(null)">
        <div class="modal modal-wide" role="dialog"><div class="modal-header"><h3>🔎 مراجعة اليوميات</h3><button type="button" class="modal-close" (click)="review.set(null)">×</button></div>
          <div class="modal-body">
            <p style="margin:0 0 10px;color:var(--ink-soft);">اليوميات المكررة، واللي صاحبها مش موجود، وبأجر صفر، وبحالة مش معروفة — مستحقها صفر لحد القرار. مفيش حذف.@if (!rv.canDecide) { القرار لصاحب «تعديل» على صفحة المستحقات. }</p>
            <div class="table-wrap"><table class="data-table" id="dlReviewTable"><thead><tr><th>التاريخ</th><th>الاسم</th><th>الحالة</th><th>المشروع</th><th>السبب</th><th>القرار</th><th></th></tr></thead><tbody>
              @for (a of rv.rows; track a.id) {
                <tr [attr.data-id]="a.id"><td>{{ fmtDate(a.date) }}</td><td>{{ a.personName }}</td><td>{{ a.statusLabel }}</td><td>{{ a.project || '—' }}</td><td>{{ a.flagLabels.join('، ') }}</td>
                  <td>{{ a.reviewDecision === 'count' ? 'تتحسب' : a.reviewDecision === 'void' ? 'ملغية: ' + (a.reviewReason || '') : 'مستنية' }}</td>
                  <td style="white-space:nowrap;">@if (rv.canDecide) { <button type="button" class="btn btn-outline btn-sm btn-rv-count" (click)="decide(a, 'count')">تتحسب</button> <button type="button" class="btn btn-outline btn-sm btn-rv-void" (click)="decide(a, 'void')">تتلغي</button> }</td></tr>
              } @empty { <tr><td colspan="7" style="text-align:center;color:var(--ink-soft);padding:20px;">مفيش يوميات محتاجة مراجعة</td></tr> }
            </tbody></table></div>
          </div>
          <div class="modal-footer"><button type="button" class="btn btn-outline" (click)="review.set(null)">إغلاق</button></div>
        </div>
      </div>
    }
    @if (delOpen()) {
      <div class="modal-overlay" id="appConfirmModal" style="z-index:500000;" (click)="$event.target === $event.currentTarget && delOpen.set(null)">
        <div class="modal app-confirm-modal">
          <div class="modal-header app-confirm-head danger"><span class="confirm-icon" aria-hidden="true">🗑️</span><h3 style="margin:0;flex:1;">تأكيد الحذف</h3><button type="button" class="modal-close" aria-label="إغلاق" (click)="delOpen.set(null)">×</button></div>
          <div class="modal-body">هل أنت متأكد من الحذف؟</div>
          <div class="modal-footer"><button type="button" class="btn btn-danger" id="btnConfirmDel" (click)="remove()">حذف</button><button type="button" class="btn btn-outline" (click)="delOpen.set(null)">إلغاء</button></div>
        </div>
      </div>
    }`,
})
export class WorkerAttendancePage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly toast = new LegacyToast();
  readonly full = legacyUrl('workerAttendance');
  readonly canAdd = this.session.can('workerAttendance', 'add');
  readonly canEdit = this.session.can('workerAttendance', 'edit');
  readonly canDelete = this.session.can('workerAttendance', 'delete');
  /** ATTENDANCE_STATUS بترتيب selectOptions (بالاسم) زي النافذة القديمة، وبترتيبه الأصلي في فلتر الحالة */
  readonly statuses: Opt[] = [{ code: 'present', label: 'حاضر' }, { code: 'absent', label: 'غائب' }, { code: 'late', label: 'متأخر' }, { code: 'half', label: 'نصف يوم' }, { code: 'holiday', label: 'عطلة' }];
  readonly statusesByLabel = this.statuses.slice().sort((a, b) => a.label.localeCompare(b.label, 'ar', { sensitivity: 'base' }));
  readonly tab = signal('');
  readonly dept = signal<string | null>(null);
  readonly boards = signal<{ kinds: P[]; depts: Record<string, P[]> }>({ kinds: [], depts: {} });
  readonly g = signal<P>({ rows: [], dates: [], cards: { people: 0, days: '0', pay: null, multi: '0' }, wages: false, options: { projects: [], sites: [], supervisors: [] } });
  readonly diff = signal<P | null>(null);
  readonly reviewCount = signal(0);
  readonly error = signal('');
  readonly page = signal(1);
  readonly modal = signal(false);
  readonly saving = signal(false);
  readonly opts = signal<P | null>(null);
  readonly dayView = signal<P | null>(null);
  readonly review = signal<P | null>(null);
  readonly delOpen = signal<{ id: string; rev: number; dv?: P } | null>(null);
  readonly same = signal<P | null>(null);
  readonly t = computed(() => TABS[this.tab()] || TABS['workers']);
  readonly pages = computed(() => Math.max(1, Math.ceil(this.g().rows.length / PAGE_SIZE)));
  readonly curPage = computed(() => Math.min(this.page(), this.pages()));
  readonly pageRows = computed(() => this.g().rows.slice((this.curPage() - 1) * PAGE_SIZE, this.curPage() * PAGE_SIZE));
  f = { from: '', to: '', supervisorId: '', project: '', site: '', status: '', q: '' };
  e: P = {};
  fo: ModalForm = modalForm('workerAttendance', WATT_FIELDS, []);
  daysTouched = false;
  private qTimer?: ReturnType<typeof setTimeout>;
  fmtNum = fmtNum; fmtMoney = fmtMoney; fmtDate = fmtDate; fmtDays = fmtDays; min = Math.min;

  ngOnInit() { void this.load(); }
  async load() {
    this.error.set('');
    try { this.boards.set(await firstValueFrom(this.http.get<P>('/api/v1/dailies/boards'))); } catch (err) { this.error.set(errorMessage(err, 'تعذر التحميل')); }
  }
  enterTab(id: string) { this.tab.set(id); this.dept.set(null); }
  enterDept(id: string) { this.dept.set(id); this.page.set(1); void this.loadGrid(); }
  clear() { this.f = { from: '', to: '', supervisorId: '', project: '', site: '', status: '', q: '' }; this.reload(); }
  reload(debounce = false) {
    clearTimeout(this.qTimer);
    if (debounce) { this.qTimer = setTimeout(() => { this.page.set(1); void this.loadGrid(); }, 220); return; }
    this.page.set(1); void this.loadGrid();
  }
  async loadGrid() {
    this.error.set('');
    try {
      let params = new HttpParams().set('tab', this.tab()).set('dept', this.dept() ?? '');
      for (const [k, v] of Object.entries(this.f)) if (v) params = params.set(k, v);
      const r = await firstValueFrom(this.http.get<P>('/api/v1/dailies/grid', { params }));
      this.g.set(r); this.f.from = r.from; this.f.to = r.to;
      if (r.wages) this.diff.set(await firstValueFrom(this.http.get<P>('/api/v1/dailies/diff', { params: new HttpParams().set('from', r.from).set('to', r.to) })));
      this.reviewCount.set((await firstValueFrom(this.http.get<P>('/api/v1/dailies/review'))).pending);
    } catch (err) { this.error.set(errorMessage(err, 'تعذر التحميل')); }
  }
  /** العلامة لكل خلية (renderWorkerAttendancePage): ✓ ½ ✗ ع، أو عدد الأيام، أو «مجموع⚑» لأكتر من موقع */
  cell(p: P, date: string): { id: string; mark: string; color: string; title: string; multi: boolean } | null {
    const recs = (p.records as P[]).filter((a) => a.date === date);
    if (!recs.length) return null;
    const rec = recs[0], st = String(rec.status || '').toLowerCase(), credit = rec.days;
    let mark: string = '✓', color = 'var(--ok,#2d6a4f)', title = 'حاضر';
    if (st === 'half') { mark = '½'; color = '#b45309'; title = 'نصف يوم'; } else if (st === 'late') { color = '#b45309'; title = 'متأخر'; }
    else if (st === 'absent') { mark = '✗'; color = 'var(--debt,#c1121f)'; title = 'غائب'; } else if (st === 'holiday') { mark = 'ع'; color = '#6c757d'; title = 'إجازة'; }
    if (credit > 1) mark = String(credit);
    let ttl = `${title} — ${credit} يوم${String(rec.project || '').trim() ? ` — ${rec.project}` : ''} — اضغط للتعديل`;
    const multi = recs.length > 1;
    if (multi) {
      const tot = Math.round(recs.reduce((x, a) => x + a.days, 0) * 100) / 100;
      mark = `${fmtDays(tot)}⚑`; color = '#b45309';
      ttl = `في ${recs.length} مواقع: ${recs.map((a) => `${String(a.project || '').trim() || 'غير محدد'} (${fmtDays(a.days)})`).join(' + ')}`;
    }
    return { id: rec.id, mark, color, title: ttl, multi };
  }
  projectOptions(o: P) { const cur = String(this.e['project'] || ''); return cur && !o.projects.includes(cur) ? [cur, ...o.projects] : o.projects; }
  preview() { return previewNet(this.e['status'], round2(this.e['dayWage']), Number(this.e['status'] === 'absent' || this.e['status'] === 'holiday' ? 0 : this.e['days']) || 0, round2(this.e['deduction'])); }

  async openEditById(id: string) {
    try { const a = await firstValueFrom(this.http.get<P>(`/api/v1/dailies/${encodeURIComponent(id)}`)); await this.openEdit(a); } catch (err) { this.error.set(errorMessage(err, 'تعذر الفتح')); }
  }
  /** openWorkerAttModal: الافتراضي (النوع والشخص والتاريخ من الخلية، ويوم، وحاضر)، والأجر من الشخص، ونصف يوم ← 0.5 */
  async openEdit(a: P | null, preset?: { kind: Kind; id: string; date?: string }) {
    this.error.set('');
    try {
      const o = await firstValueFrom(this.http.get<P>('/api/v1/dailies/form-options'));
      this.opts.set(o); this.daysTouched = false;
      this.fo = modalForm('workerAttendance', WATT_FIELDS, effectiveLayout('workerAttendance', o.layout || null));
      if (a) {
        let days = a.days != null ? Number(a.days) : 1;
        if (String(a.status).toLowerCase() === 'half' && !(a.days > 0)) days = 0.5;
        this.e = { id: a.id, rev: a.rev, personType: a.kind, personId: a.personId || a.workerId || '', date: a.date, status: a.status || 'present', days, dayWage: a.dayWage != null ? round2(a.dayWage) : '', deduction: a.deduction ? round2(a.deduction) : '', project: a.project || '', site: a.site || '', notes: a.notes || '' };
      } else {
        this.e = { id: '', personType: preset?.kind || 'worker', personId: preset?.id || '', date: preset?.date || o.today, status: 'present', days: 1, dayWage: '', deduction: '', project: '', site: '', notes: '' };
        this.fillWage();
      }
      this.onStatus(); // toggleDed() وقت الفتح زي القديمة
      this.modal.set(true); void this.sameDay();
    } catch (err) { this.error.set(errorMessage(err, 'تعذر فتح النافذة')); }
  }
  fillWage() { const o = this.opts(); const p = o?.people?.[this.e['personType']]?.find((x: P) => x.id === this.e['personId']); if (p && o.wages) this.e['dayWage'] = round2(p.dailyWage); }
  gc(id: string, full: boolean) { const w = this.fo.wide[id]; return (w === null || w === undefined ? full : w) ? '1 / -1' : null; }
  onStatus() { if (this.e['status'] === 'half' && Number(this.e['days']) === 1) this.e['days'] = 0.5; }
  /** refreshSameDay: السجلات التانية لنفس الشخص في نفس اليوم، والأيام المقترحة = 1 − المسجّل (للإضافة لو ماتلمستش) */
  async sameDay() {
    const e = this.e; if (!e['personId'] || !e['date'] || e['personType'] === 'equipment') { this.same.set(null); return; }
    try {
      const d = await firstValueFrom(this.http.get<P>('/api/v1/dailies/day', { params: new HttpParams().set('kind', e['personType']).set('id', e['personId']).set('date', e['date']) }));
      const rows = (d.rows as P[]).filter((x) => x.id !== e['id']);
      if (!rows.length) { this.same.set(null); return; }
      const sum = Math.round(rows.reduce((x, r) => x + r.credit, 0) * 100) / 100;
      this.same.set({ count: rows.length, days: fmtDays(sum), rows });
      if (!e['id'] && !this.daysTouched) e['days'] = Math.max(0.5, Math.round((1 - sum) * 100) / 100);
    } catch { this.same.set(null); }
  }
  close() { this.modal.set(false); this.error.set(''); this.same.set(null); }
  async save(addAnother: boolean) {
    const e = this.e;
    if (e['personType'] === 'equipment') { location.href = this.full; return; }
    if (!e['personId']) { this.toast.show('اختر الشخص / المعدة'); return; }
    this.saving.set(true); this.error.set('');
    const body: P = { personType: e['personType'], personId: e['personId'], date: e['date'], status: e['status'], days: String(e['days'] ?? ''), project: e['project'], site: e['site'], notes: e['notes'] };
    if (this.opts()?.wages) { body['dayWage'] = String(e['dayWage'] ?? ''); body['deduction'] = String(e['deduction'] ?? ''); }
    try {
      if (e['id']) await firstValueFrom(this.http.patch(`/api/v1/dailies/${encodeURIComponent(e['id'])}`, { ...body, rev: e['rev'] }));
      else await firstValueFrom(this.http.post('/api/v1/dailies', body, { headers: new HttpHeaders({ 'Idempotency-Key': `dl-${crypto.randomUUID()}` }) }));
      this.close(); this.toast.show('تم الحفظ'); await this.loadGrid();
      if (addAnother) await this.openEdit(null, { kind: body['personType'], id: body['personId'], date: body['date'] });
    } catch (err) { const m = errorMessage(err, 'تعذّر الحفظ'); this.toast.show(m); this.error.set(m); } finally { this.saving.set(false); }
  }
  /** الحذف من النافذة، أو من نافذة مواقع اليوم (btn-wsite-del — وبترجع تفتحها لو لسه فيها سجلات) */
  askDelete(a?: P, dv?: P) { this.delOpen.set(a ? { id: a.id, rev: a.rev, dv } : { id: this.e['id'], rev: this.e['rev'] }); }
  async remove() {
    const t = this.delOpen(); if (!t) return;
    this.delOpen.set(null);
    try {
      await firstValueFrom(this.http.delete(`/api/v1/dailies/${encodeURIComponent(t.id)}`, { params: new HttpParams().set('rev', String(t.rev)) }));
      this.close(); this.dayView.set(null); this.toast.show('تم الحذف'); await this.loadGrid();
      if (t.dv && t.dv.rows.length > 1) await this.openDay({ kind: t.dv.kind, id: t.dv.id, name: t.dv.name }, t.dv.date);
    } catch (err) { const m = errorMessage(err, 'تعذّر الحذف'); this.toast.show(m); this.error.set(m); }
  }
  async openDay(p: P, date: string) {
    try { const d = await firstValueFrom(this.http.get<P>('/api/v1/dailies/day', { params: new HttpParams().set('kind', p.kind).set('id', p.id).set('date', date) })); this.dayView.set({ ...d, name: p.name, kind: p.kind, id: p.id, date }); }
    catch (err) { this.error.set(errorMessage(err, 'تعذر الفتح')); }
  }
  async openReview() { try { this.review.set(await firstValueFrom(this.http.get<P>('/api/v1/dailies/review'))); } catch (err) { this.error.set(errorMessage(err, 'تعذر الفتح')); } }
  async decide(a: P, decision: 'count' | 'void') {
    const reason = decision === 'void' ? prompt('سبب الإلغاء؟') : '';
    if (decision === 'void' && !String(reason || '').trim()) return;
    try {
      await firstValueFrom(this.http.post(`/api/v1/dailies/${encodeURIComponent(a.id)}/review`, { rev: a.rev, decision, reason }, { headers: new HttpHeaders({ 'Idempotency-Key': `dl-rv-${crypto.randomUUID()}` }) }));
      await this.openReview(); await this.loadGrid();
    } catch (err) { this.toast.show(errorMessage(err, 'تعذّر الحفظ')); }
  }
}
