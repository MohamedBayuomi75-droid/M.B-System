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
const PAGE_SIZE = 20;
const ATT_FIELDS: ModalField[] = [
  { id: 'dept', sels: ['#attDept'] }, { id: 'emp', sels: ['#attEmp_text', '#attEmp', '#attEmpBox'] }, { id: 'date', sels: ['#attDate'] }, { id: 'status', sels: ['#attStatus'] },
  { id: 'in', sels: ['#attIn'] }, { id: 'out', sels: ['#attOut'] }, { id: 'notes', sels: ['#attNotes'] },
];
const fmtNum = (n: unknown) => (Number(n) || 0).toLocaleString('ar-EG');
const fmtDate = (v: unknown) => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${Number(m[3])}/${Number(m[2])}/${m[1]}` : v ? String(v) : '—'; };
const byLabel = (xs: { code: string; label: string }[]) => xs.slice().sort((a, b) => a.label.localeCompare(b.label, 'ar', { sensitivity: 'base' }));

/**
 * حضور الموظفين — بنفس شكل الواجهة القديمة (DEC-0093، DEC-0135): renderAttendancePage وopenAttendanceModal (pages-attendance.js).
 * القايمة والفلاتر والكروت والحفظ والحذف من السيرفر بنفس الدوال القديمة (tests-merge/phase82.js). التصدير من الشاشة الكاملة.
 * **ملاحظة:** خانة البحث في القديمة مالهاش مستمع (attendanceFilters.q مابيتكتبش أبداً) — هنا شغّالة بنفس دالة الفلترة القديمة (DAILIES_ACCEPTANCE §4).
 */
@Component({
  selector: 'app-attendance',
  imports: [FormsModule],
  template: `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
        <div><h2 class="page-title" style="margin:0;">حضور الموظفين</h2><p class="page-sub" style="margin:4px 0 0;">حضور الموظفين فقط — حسب القسم</p></div>
        <div class="btn-row page-header-actions" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
          <span class="page-export-bar" style="display:inline-flex;gap:6px;"><a class="btn btn-outline btn-sm" [href]="full">إكسيل</a><a class="btn btn-outline btn-sm" [href]="full">CSV</a></span>
          <button type="button" class="btn btn-primary" id="btnAddAtt" [disabled]="!canAdd" (click)="openEdit(null)">+ تسجيل حضور</button>
        </div>
      </div>
      <div class="sc-row" id="attCards">
        <div class="sc-card"><span class="sc-ico">🗂️</span><div class="sc-body"><div class="sc-num">{{ fmtNum(r().cards.total) }}</div><div class="sc-lbl">عدد السجلات</div></div></div>
        <div class="sc-card ok"><span class="sc-ico">✅</span><div class="sc-body"><div class="sc-num">{{ fmtNum(r().cards.present) }}</div><div class="sc-lbl">حاضر</div></div></div>
        <div class="sc-card" [class.warn]="r().cards.absent"><span class="sc-ico">❌</span><div class="sc-body"><div class="sc-num">{{ fmtNum(r().cards.absent) }}</div><div class="sc-lbl">غائب</div></div></div>
        <div class="sc-card"><span class="sc-ico">⏰</span><div class="sc-body"><div class="sc-num">{{ fmtNum(r().cards.late) }}</div><div class="sc-lbl">متأخر</div></div></div>
        <div class="sc-card"><span class="sc-ico">🌓</span><div class="sc-body"><div class="sc-num">{{ fmtNum(r().cards.half) }}</div><div class="sc-lbl">نصف يوم</div></div></div>
      </div>
      <div class="filters-bar filters-bar-one-row" style="display:flex;flex-wrap:nowrap;gap:10px;margin-bottom:14px;align-items:flex-end;overflow-x:auto;">
        <label style="font-size:12px;">بحث<input type="search" id="attSearch" class="input" placeholder="بالاسم..." style="min-width:140px;" [(ngModel)]="f.q" (ngModelChange)="reload(true)"></label>
        <label style="font-size:12px;">القسم<select id="attFilterDept" class="input" [(ngModel)]="f.departmentId" (change)="f.employeeId = ''; reload()"><option value="">— كل الأقسام —</option>@for (d of r().options.departments; track d.id) { <option [value]="d.id">{{ d.name }}</option> }</select></label>
        <label style="font-size:12px;min-width:180px;">الموظف<select id="attFilterEmp" class="input" [(ngModel)]="f.employeeId" (change)="reload()"><option value="">— كل الموظفين —</option>@for (e of empsOf(f.departmentId); track e.id) { <option [value]="e.id">{{ (e.code ? e.code + ' — ' : '') + e.name }}</option> }</select></label>
        <label style="font-size:12px;">الحالة<select id="attFilterStatus" class="input" [(ngModel)]="f.status" (change)="reload()"><option value="">كل الحالات</option>@for (s of statusesByLabel; track s.code) { <option [value]="s.code">{{ s.label }}</option> }</select></label>
        <label style="font-size:12px;">من<input type="date" id="attFrom" class="input" [(ngModel)]="f.from" (change)="reload()"></label>
        <label style="font-size:12px;">إلى<input type="date" id="attTo" class="input" [(ngModel)]="f.to" (change)="reload()"></label>
      </div>
      @if (error() && !modal()) { <div class="err" role="alert" id="attError">{{ error() }}</div> }
      <div class="table-wrap">
        <table class="data-table" id="attTable">
          <thead><tr><th>التاريخ</th><th>الموظف</th><th>الحالة</th><th>وقت الحضور</th><th>وقت الانصراف</th><th>ملاحظات</th><th></th></tr></thead>
          <tbody>
            @for (a of pageRows(); track a.id) {
              <tr [attr.data-id]="a.id">
                <td>{{ fmtDate(a.date) }}</td><td>{{ a.employeeName }}</td>
                <td><span class="badge badge-{{ a.status === 'present' ? 'ok' : a.status === 'late' ? 'warn' : 'err' }}">{{ a.statusLabel }}</span></td>
                <td>{{ a.checkIn || '—' }}</td><td>{{ a.checkOut || '—' }}</td><td>{{ a.notes || '' }}</td>
                <td style="white-space:nowrap;"><div class="row-actions">
                  <button type="button" class="icon-btn btn-edit-att" title="تعديل" (click)="openEdit(a)">✏️</button>
                  <button type="button" class="icon-btn icon-del btn-del-att" title="حذف" [disabled]="!canDelete" (click)="askDelete(a)">🗑️</button>
                </div></td>
              </tr>
            } @empty { <tr><td colspan="7" style="text-align:center;color:var(--ink-soft);padding:30px;">لا توجد سجلات</td></tr> }
          </tbody>
        </table>
      </div>
      <div class="btn-row table-pager" data-pager="attendance" style="justify-content:space-between;align-items:center;margin-top:10px;flex-wrap:wrap;gap:8px;">
        <span style="font-size:13px;color:var(--ink-soft);">عرض {{ r().rows.length ? (curPage() - 1) * 20 + 1 : 0 }}–{{ min(curPage() * 20, r().rows.length) }} من {{ r().rows.length }} <span style="opacity:.75;">(20 صف لكل صفحة)</span></span>
        <div style="display:flex;gap:8px;align-items:center;">
          <button type="button" class="btn btn-outline btn-sm" [disabled]="curPage() <= 1" (click)="page.set(curPage() - 1)">السابق</button>
          <span style="font-size:13px;font-weight:700;">صفحة {{ curPage() }} / {{ pages() }}</span>
          <button type="button" class="btn btn-outline btn-sm" [disabled]="curPage() >= pages()" (click)="page.set(curPage() + 1)">التالي</button>
        </div>
      </div>
    </div>
    @if (modal()) {
      <div class="modal-overlay" id="appModal" (click)="$event.target === $event.currentTarget && close()">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header"><h3>{{ e.id ? 'تعديل حضور موظف' : 'تسجيل حضور موظف' }}</h3><button type="button" class="modal-close" (click)="close()">×</button></div>
          <div class="modal-body">
            <div class="form-grid form-grid-2">
              <label [style.order]="fo.order['dept']" [style.display]="fo.hide['dept'] ? 'none' : null" [style.grid-column]="gc('dept', false)">{{ fo.label['dept'] || 'القسم' }}<select class="input" id="attDept" [(ngModel)]="e.dept" (ngModelChange)="e.employeeId = ''"><option value="">— كل الأقسام —</option>@for (d of r().options.departments; track d.id) { <option [value]="d.id">{{ d.name }}</option> }</select></label>
              <label [style.order]="fo.order['emp']" [style.display]="fo.hide['emp'] ? 'none' : null" [style.grid-column]="gc('emp', false)">{{ fo.label['emp'] || 'الموظف *' }}<div id="attEmpBox"><select class="input" id="attEmp" [(ngModel)]="e.employeeId"><option value="">اكتب اسم الموظف أو الكود...</option>@for (x of empsOf(e.dept, e.employeeId); track x.id) { <option [value]="x.id">{{ (x.code ? x.code + ' — ' : '') + x.name }}</option> }</select></div></label>
              <label [style.order]="fo.order['date']" [style.display]="fo.hide['date'] ? 'none' : null" [style.grid-column]="gc('date', false)">{{ fo.label['date'] || 'التاريخ *' }}<input class="input" id="attDate" type="date" [(ngModel)]="e.date"></label>
              <label [style.order]="fo.order['status']" [style.display]="fo.hide['status'] ? 'none' : null" [style.grid-column]="gc('status', false)">{{ fo.label['status'] || 'الحالة' }}<select class="input" id="attStatus" [(ngModel)]="e.status">@for (s of statusesByLabel; track s.code) { <option [value]="s.code">{{ s.label }}</option> }</select></label>
              <label [style.order]="fo.order['in']" [style.display]="fo.hide['in'] ? 'none' : null" [style.grid-column]="gc('in', false)">{{ fo.label['in'] || 'وقت الحضور' }}<input class="input" id="attIn" type="time" [(ngModel)]="e.checkIn"></label>
              <label [style.order]="fo.order['out']" [style.display]="fo.hide['out'] ? 'none' : null" [style.grid-column]="gc('out', false)">{{ fo.label['out'] || 'وقت الانصراف' }}<input class="input" id="attOut" type="time" [(ngModel)]="e.checkOut"></label>
              <label [style.order]="fo.order['notes']" [style.display]="fo.hide['notes'] ? 'none' : null" [style.grid-column]="gc('notes', true)">{{ fo.label['notes'] || 'ملاحظات' }}<textarea class="input" id="attNotes" rows="4" [(ngModel)]="e.notes"></textarea></label>
            </div>
            @if (error()) { <div class="err" role="alert" id="attModalError">{{ error() }}</div> }
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="close()">إلغاء</button>
            <button type="button" class="btn btn-primary" id="btnSaveAtt" [disabled]="saving()" (click)="save()">حفظ</button>
          </div>
        </div>
      </div>
    }
    @if (del(); as d) {
      <div class="modal-overlay" id="appConfirmModal" style="z-index:500000;" (click)="$event.target === $event.currentTarget && del.set(null)">
        <div class="modal app-confirm-modal">
          <div class="modal-header app-confirm-head danger"><span class="confirm-icon" aria-hidden="true">🗑️</span><h3 style="margin:0;flex:1;">تأكيد الحذف</h3><button type="button" class="modal-close" aria-label="إغلاق" (click)="del.set(null)">×</button></div>
          <div class="modal-body">هل أنت متأكد من الحذف؟</div>
          <div class="modal-footer"><button type="button" class="btn btn-danger" id="btnConfirmDel" (click)="remove(d)">حذف</button><button type="button" class="btn btn-outline" (click)="del.set(null)">إلغاء</button></div>
        </div>
      </div>
    }`,
})
export class AttendancePage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly toast = new LegacyToast();
  readonly full = legacyUrl('attendance');
  readonly canAdd = this.session.can('attendance', 'add');
  readonly canDelete = this.session.can('attendance', 'delete');
  private readonly statuses = [{ code: 'present', label: 'حاضر' }, { code: 'absent', label: 'غائب' }, { code: 'late', label: 'متأخر' }, { code: 'half', label: 'نصف يوم' }, { code: 'holiday', label: 'عطلة' }];
  /** فلتر الحالة والنافذة بـ selectOptions (مترتبين بالاسم) زي القديمة */
  readonly statusesByLabel = byLabel(this.statuses);
  readonly r = signal<P>({ rows: [], cards: { total: 0, present: 0, absent: 0, late: 0, half: 0 }, options: { departments: [], employees: [] } });
  readonly error = signal('');
  readonly page = signal(1);
  readonly modal = signal(false);
  readonly saving = signal(false);
  readonly del = signal<P | null>(null);
  readonly pages = computed(() => Math.max(1, Math.ceil(this.r().rows.length / PAGE_SIZE)));
  readonly curPage = computed(() => Math.min(this.page(), this.pages()));
  readonly pageRows = computed(() => this.r().rows.slice((this.curPage() - 1) * PAGE_SIZE, this.curPage() * PAGE_SIZE));
  f = { q: '', departmentId: '', employeeId: '', status: '', from: '', to: '' };
  e: P = {};
  fo: ModalForm = modalForm('attendance', ATT_FIELDS, []);
  private qTimer?: ReturnType<typeof setTimeout>;
  fmtNum = fmtNum; fmtDate = fmtDate; min = Math.min;

  ngOnInit() { void this.load(); }
  reload(debounce = false) {
    clearTimeout(this.qTimer);
    if (debounce) { this.qTimer = setTimeout(() => { this.page.set(1); void this.load(); }, 220); return; }
    this.page.set(1); void this.load();
  }
  async load() {
    this.error.set('');
    try {
      let params = new HttpParams();
      for (const [k, v] of Object.entries(this.f)) if (v) params = params.set(k, v);
      this.r.set(await firstValueFrom(this.http.get<P>('/api/v1/attendance', { params })));
    } catch (err) { this.error.set(errorMessage(err, 'تعذر التحميل')); }
  }
  empsOf(dept: string, keep = '') { return (this.r().options.employees as P[]).filter((x) => !dept || x.departmentId === dept || x.id === keep); }
  /** openAttendanceModal: القسم من الموظف أو من الفلتر، والتاريخ النهارده، وحاضر */
  openEdit(a: P | null) {
    this.error.set('');
    const emp = a ? (this.r().options.employees as P[]).find((x) => x.id === a.employeeId) : null;
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date()); // todayISO (توقيت القاهرة)
    this.e = a ? { id: a.id, rev: a.rev, dept: emp?.departmentId || '', employeeId: a.employeeId, date: a.date || today, status: a.status || 'present', checkIn: a.checkIn || '', checkOut: a.checkOut || '', notes: a.notes || '' }
      : { id: '', dept: this.f.departmentId || '', employeeId: '', date: today, status: 'present', checkIn: '', checkOut: '', notes: '' };
    this.fo = modalForm('attendance', ATT_FIELDS, effectiveLayout('attendance', this.r().layout || null));
    this.modal.set(true);
  }
  gc(id: string, full: boolean) { const w = this.fo.wide[id]; return (w === null || w === undefined ? full : w) ? '1 / -1' : null; }
  close() { this.modal.set(false); this.error.set(''); }
  async save() {
    const e = this.e;
    if (!e['employeeId']) { this.toast.show('اختر الموظف'); return; }
    if (!e['date']) { this.toast.show('حدد التاريخ'); return; }
    const body = { employeeId: e['employeeId'], date: e['date'], status: e['status'] || 'present', checkIn: e['checkIn'] || '', checkOut: e['checkOut'] || '', notes: e['notes'] || '' };
    this.saving.set(true); this.error.set('');
    try {
      if (e['id']) await firstValueFrom(this.http.patch(`/api/v1/attendance/${encodeURIComponent(e['id'])}`, { ...body, rev: e['rev'] }));
      else await firstValueFrom(this.http.post('/api/v1/attendance', body, { headers: new HttpHeaders({ 'Idempotency-Key': `att-${crypto.randomUUID()}` }) }));
      this.close(); this.toast.show('تم الحفظ'); await this.load();
    } catch (err) { const m = errorMessage(err, 'تعذّر الحفظ'); this.toast.show(m); this.error.set(m); } finally { this.saving.set(false); }
  }
  askDelete(a: P) { this.del.set(a); }
  async remove(a: P) {
    this.del.set(null);
    try { await firstValueFrom(this.http.delete(`/api/v1/attendance/${encodeURIComponent(a.id)}`, { params: new HttpParams().set('rev', String(a.rev)) })); this.toast.show('تم الحذف'); await this.load(); }
    catch (err) { this.toast.show(errorMessage(err, 'تعذّر الحذف')); }
  }
}
