import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { legacyUrl } from '../core/page-routes';
import { errorMessage, SessionService } from '../core/session.service';
import { AttachmentsPanelComponent } from './attachments-panel.component';
import { LegacyToast } from './legacy-toast';

interface Proj {
  id: string; rev: number; code?: string; name: string; status?: string; stage: string; badge: string; shownValue: number; contractNo?: string; customerId?: string; customerName?: string; customer?: string;
  value?: number; budget?: number | string; start?: string; end?: string; progress?: number | null; supervisorId?: string; assignedTo?: string; notes?: string;
  extraFields?: { label: string; value: string }[]; attachments?: { id?: string; name?: string; storedName?: string; date?: string }[]; resources: { supervisors: number; workers: number; equipment: number }; issues: string[];
}
interface Stage { value: string; short: string }
interface Cards { inSection: boolean; count: number; active?: number; done?: number; customers?: number; totalValue: number; shown?: number }
interface Opts { stages: Stage[]; current: string; nextCode: string; customers: { id: string; code: string; name: string }[]; supervisors: { id: string; code: string; name: string }[] }
const PAGE_SIZE = 20;
const EMPTY = { q: '', stageSel: '', customerId: '', hasRes: '', budget: '' };
const cairoToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
/** fmtNum / fmtMoney القديمة (helpers.js): ar-EG وخانتين بالكتير — للعرض بس */
const fmtMoney = (n: unknown) => `${(Number(n) || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م`;

/**
 * المشاريع — بنفس شكل الواجهة القديمة (DEC-0093): renderer/modules/hr/pages-projects.js (renderProjectsPage) ونافذة المشروع (openProjectModal)،
 * بكلاسات legacy-skin.css. القايمة والفلاتر والكروت والموارد والملاحظات من السيرفر بنفس الدوال القديمة (tests-merge/phase72.js).
 * الحفظ والتحقق ونشر تغيير الاسم وتحريك مسار المشروع في السيرفر (DEC-0117 د-1، د-2).
 * المرفقات بالإصدارات (المرحلة 5) في نافذة التعديل. من الشاشة الكاملة: كشف المشروع والتكلفة (F-12: عمود التكلفة وفلتر حالة الميزانية — د-6)، ومسار المشروع التفاعلي (د-1)، والحذف (د-3)، والتصدير.
 */
@Component({
  selector: 'app-projects',
  imports: [FormsModule, AttachmentsPanelComponent],
  template: `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div>
          <h2 class="page-title" style="margin:0;">المشاريع</h2>
          <p class="page-sub" style="margin:4px 0 0;">إدارة المشاريع التجارية · المراحل · الموارد · التكلفة اللحظية</p>
        </div>
        <div class="btn-row page-header-actions">
          <span class="page-export-bar" style="display:inline-flex;flex-wrap:nowrap;gap:6px;align-items:center;">
            <a class="btn btn-outline btn-sm" [href]="full" title="التصدير من الشاشة الكاملة">إكسيل</a><a class="btn btn-outline btn-sm" [href]="full" title="التصدير من الشاشة الكاملة">CSV</a>
          </span>
          @if (canAdd) { <button class="btn btn-primary" id="btnAddProject" (click)="openEdit(null)">+ مشروع</button> }
        </div>
      </div>

      <div class="stats-row" id="projStats" style="margin-bottom:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;">
        @if (cards(); as c) {
          @if (c.inSection) {
            <div class="stat-card"><div class="num">{{ c.count }}</div><div class="lbl">مشاريع «{{ section }}»</div></div>
            <div class="stat-card"><div class="num">{{ c.customers }}</div><div class="lbl">عدد العملاء</div></div>
            <div class="stat-card" title="التكلفة اللحظية من الشاشة الكاملة (F-12)"><div class="num"><a [href]="full">—</a></div><div class="lbl">التكلفة اللحظية</div></div>
            <div class="stat-card"><div class="num">{{ money(c.totalValue) }}</div><div class="lbl">إجمالي قيم المرحلة</div></div>
          } @else {
            <div class="stat-card"><div class="num">{{ c.count }}</div><div class="lbl">كل المشاريع</div></div>
            <div class="stat-card"><div class="num">{{ c.active }}</div><div class="lbl">جارٍ العمل</div></div>
            <div class="stat-card"><div class="num">{{ c.done }}</div><div class="lbl">مكتمل</div></div>
            <div class="stat-card"><div class="num">{{ money(c.totalValue) }}</div><div class="lbl">إجمالي القيم</div></div>
            <div class="stat-card"><div class="num">{{ c.shown }}</div><div class="lbl">نتيجة البحث</div></div>
          }
        }
      </div>

      <div class="filters-bar">
        <input type="search" id="projSearch" class="input" placeholder="بحث: اسم، كود، عميل، عقد، ملاحظات..." [(ngModel)]="f.q" (ngModelChange)="reload(true)" style="min-width:220px;flex:1;">
        @if (section) {
          <select id="projCustomer" class="input" style="min-width:180px;" [(ngModel)]="f.customerId" (ngModelChange)="reload()"><option value="">كل العملاء</option>@for (c of customers(); track c.value) { <option [value]="c.value">{{ c.label }}</option> }</select>
        } @else {
          <select id="projStatus" class="input" style="min-width:180px;" [(ngModel)]="f.stageSel" (ngModelChange)="reload()"><option value="">كل المراحل</option>@for (s of stages(); track s.value) { <option [value]="s.value">{{ s.value }}</option> }</select>
        }
        <select id="projHasRes" class="input" style="min-width:150px;" [(ngModel)]="f.hasRes" (ngModelChange)="reload()"><option value="">الموارد: الكل</option><option value="with">بها موارد</option><option value="empty">بدون موارد</option></select>
        <select id="projBudget" class="input" style="min-width:160px;" [(ngModel)]="f.budget" (ngModelChange)="reload()" title="حالة الميزانية (تحت/قريب/تجاوز) من الشاشة الكاملة — بتعتمد على التكلفة (F-12)">
          <option value="">الميزانية: الكل</option><option value="ok" disabled>تحت الميزانية</option><option value="warn" disabled>قريب من الميزانية</option><option value="over" disabled>تجاوز الميزانية</option><option value="none">بدون ميزانية/قيمة</option>
        </select>
        <button type="button" class="btn btn-outline btn-sm" id="projClear" (click)="f = { ...empty }; reload()">مسح الفلاتر</button>
      </div>
      @if (error() && !modal()) { <div class="err" role="alert" id="projError">{{ error() }}</div> }

      <div class="table-wrap"><table class="data-table" id="projTable">
        <thead><tr><th>الكود</th><th>المشروع</th><th>العميل</th><th>المرحلة</th><th>القيمة</th><th>التقدم</th><th>موارد</th><th>التكلفة</th><th>ملاحظات</th><th></th></tr></thead>
        <tbody>
          @for (p of pageRows(); track p.id) {
            <tr [attr.data-id]="p.id">
              <td style="white-space:nowrap;">{{ p.code || '—' }}</td>
              <td><strong>{{ p.name }}</strong>@if (p.contractNo) { <div style="font-size:11px;color:var(--ink-soft);">عقد: {{ p.contractNo }}</div> }</td>
              <td>{{ p.customerName || p.customer || '—' }}</td>
              <td><span class="badge {{ p.badge }}" style="white-space:nowrap;">{{ p.stage }}</span></td>
              <td style="white-space:nowrap;">{{ p.shownValue ? money(p.shownValue) : '—' }}</td>
              <td>{{ p.progress != null && $any(p.progress) !== '' ? p.progress + '%' : '—' }}</td>
              <td title="مشرفين / عمال / معدات">{{ p.resources.supervisors }}/{{ p.resources.workers }}/{{ p.resources.equipment }}</td>
              <td style="white-space:nowrap;" title="التكلفة اللحظية من الشاشة الكاملة (F-12)"><a [href]="full">—</a></td>
              <td class="notes-cell">
                @if (p.issues.length) {
                  <ul class="notes-list" [title]="p.issues.join('\\n')">@for (i of p.issues.slice(0, 3); track $index) { <li>{{ i }}</li> }@if (p.issues.length > 3) { <li class="notes-more">+{{ p.issues.length - 3 }} أخرى</li> }</ul>
                } @else { <span class="notes-ok">✓ مكتمل</span> }
              </td>
              <td style="white-space:nowrap;">
                <a class="icon-btn btn-view-proj" [href]="full" [attr.data-id]="p.id" title="تفاصيل وكشف حساب (الشاشة الكاملة — F-12)">👁️</a>
                @if (canEdit) { <button type="button" class="icon-btn btn-edit-proj" [attr.data-id]="p.id" title="تعديل" (click)="openEdit(p)">✏️</button> }
                @if (canDelete) { <a class="icon-btn icon-del btn-del-proj" [href]="full" [attr.data-id]="p.id" title="الحذف من الشاشة الكاملة (DEC-0117)">🗑️</a> }
              </td>
            </tr>
          } @empty { <tr><td colspan="9" style="text-align:center;color:var(--ink-soft);padding:28px;">{{ loaded() ? 'لا مشاريع بعد — اضغط «+ مشروع» لإضافة مشروع جديد بنفس حقول برنامج العملاء' : '' }}</td></tr> }
        </tbody>
      </table></div>
      <div class="btn-row table-pager" data-pager="projects" style="justify-content:space-between;align-items:center;margin-top:10px;flex-wrap:wrap;gap:8px;">
        <span style="font-size:13px;color:var(--ink-soft);">عرض {{ rows().length ? (curPage() - 1) * pageSize + 1 : 0 }}–{{ min(curPage() * pageSize, rows().length) }} من {{ rows().length }} <span style="opacity:.75;">(20 لكل صفحة)</span></span>
        <div style="display:flex;gap:8px;align-items:center;">
          <button type="button" class="btn btn-outline btn-sm" [disabled]="curPage() <= 1" (click)="page.set(curPage() - 1)">السابق</button>
          <span style="font-size:13px;font-weight:700;">صفحة {{ curPage() }} / {{ pages() }}</span>
          <button type="button" class="btn btn-outline btn-sm" [disabled]="curPage() >= pages()" (click)="page.set(curPage() + 1)">التالي</button>
        </div>
      </div>
    </div>

    @if (modal() === 'edit' && opts(); as o) {
      <div class="modal-overlay" id="appModal" (click)="onOverlay($event)">
        <div class="modal modal-wide" role="dialog" aria-modal="true">
          <div class="modal-header"><h3>{{ e.id ? 'تعديل مشروع' : 'مشروع جديد' }}</h3><button class="modal-close" (click)="close()">×</button></div>
          <div class="modal-body">
            <!-- العناوين زي ما النافذة القديمة بتظهر بعد applyFormLayout (الكود، الاسم، الميزانية، الحالة، الملاحظات) -->
            <div class="form-grid form-grid-2">
              <label>الكود<input class="input" id="prCode" [(ngModel)]="e.code" placeholder="يُولَّد تلقائياً إن تُرك فارغاً"></label>
              <label>الاسم<input class="input" id="prName" [(ngModel)]="e.name" placeholder="اسم المشروع"></label>
              <label>العميل
                @if (o.customers.length) {
                  <select class="input" id="prCustomerId" [(ngModel)]="e.customerId"><option value="">— اختر العميل —</option>@for (c of o.customers; track c.id) { <option [value]="c.id">{{ (c.code ? c.code + ' — ' : '') + c.name }}</option> }</select>
                } @else { <input class="input" id="prCustomer" [(ngModel)]="e.customerName" placeholder="اسم العميل"> }
              </label>
              <label>رقم العقد<input class="input" id="prContractNo" [(ngModel)]="e.contractNo" placeholder="اختياري"></label>
              <label>قيمة المشروع (ج.م)<input class="input" id="prValue" type="number" min="0" step="0.01" [(ngModel)]="e.value"></label>
              <label>الميزانية<input class="input" id="prBudget" type="number" min="0" step="0.01" [(ngModel)]="e.budget"></label>
              <label>تاريخ البداية<input class="input" id="prStart" type="date" [(ngModel)]="e.start"></label>
              <label>تاريخ النهاية المتوقع<input class="input" id="prEnd" type="date" [(ngModel)]="e.end"></label>
              <label>نسبة الإنجاز %<input class="input" id="prProgress" type="number" min="0" max="100" step="1" [(ngModel)]="e.progress"></label>
              <label>الحالة<select class="input" id="prStatus" [(ngModel)]="e.status">@for (s of o.stages; track s.value) { <option [value]="s.value">{{ s.value }}</option> }</select></label>
              <label>مشرف المشروع<select class="input" id="prSup" [(ngModel)]="e.supervisorId"><option value="">اختر مشرف...</option>@for (s of o.supervisors; track s.id) { <option [value]="s.id">{{ (s.name || s.code || s.id) + (s.code ? ' — ' + s.code : '') }}</option> }</select></label>
              <label>المسؤول (تعيين)<input class="input" id="prAssigned" [(ngModel)]="e.assignedTo" placeholder="اسم أو كود المسؤول"></label>
              <label style="grid-column:1/-1;">الملاحظات<textarea class="input" id="prNotes" rows="2" [(ngModel)]="e.notes"></textarea></label>
              @for (x of e.extraFields; track $index) { <label>{{ x.label }}<input class="input" [(ngModel)]="x.value" [name]="'ef' + $index"></label> }
            </div>
            @if (e.id) {
              <div class="section-title" style="margin-top:12px;font-size:14px;border-top:1px solid var(--line, #ddd);padding-top:10px;">المرفقات والمستندات</div>
              <app-attachments collection="projects" [recordId]="e.id" [canEdit]="canEdit" [legacyDocs]="e.legacyAttachments" />
              <p style="font-size:12px;color:var(--ink-soft);margin:8px 0 0;">مسار المشروع (الخطوات والمناقصة) من <a [href]="full">الشاشة الكاملة</a>.</p>
            }
            @if (error()) { <div class="err" role="alert" id="prError">{{ error() }}</div> }
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" (click)="close()">إلغاء</button>
            <button class="btn btn-primary" id="btnSavePr" [disabled]="saving()" (click)="save()">حفظ</button>
          </div>
        </div>
      </div>
    }`,
})
export class ProjectsPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly toast = new LegacyToast();
  readonly canAdd = this.session.can('projects', 'add');
  readonly canEdit = this.session.can('projects', 'edit');
  readonly canDelete = this.session.can('projects', 'delete');
  readonly full = legacyUrl('projects');
  readonly empty = EMPTY;
  readonly pageSize = PAGE_SIZE;
  /** قسم المرحلة (زي أقسام القايمة الجانبية القديمة): ?status=... */
  readonly section = inject(ActivatedRoute).snapshot.queryParamMap.get('status') ?? '';
  f = { ...EMPTY };
  readonly rows = signal<Proj[]>([]);
  readonly cards = signal<Cards | null>(null);
  readonly stages = signal<Stage[]>([]);
  readonly customers = signal<{ value: string; label: string }[]>([]);
  readonly loaded = signal(false);
  readonly error = signal('');
  readonly page = signal(1);
  readonly modal = signal<'' | 'edit'>('');
  readonly saving = signal(false);
  readonly opts = signal<Opts | null>(null);
  e = this.blank();
  readonly pages = computed(() => Math.max(1, Math.ceil(this.rows().length / PAGE_SIZE)));
  readonly curPage = computed(() => Math.min(this.page(), this.pages()));
  readonly pageRows = computed(() => this.rows().slice((this.curPage() - 1) * PAGE_SIZE, this.curPage() * PAGE_SIZE));
  private qTimer?: ReturnType<typeof setTimeout>;
  money = fmtMoney;
  min = Math.min;

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
      for (const [k, v] of Object.entries({ ...this.f, status: this.section })) if (v) params = params.set(k, v);
      const r = await firstValueFrom(this.http.get<{ rows: Proj[]; cards: Cards; stages: Stage[]; customers: { value: string; label: string }[] }>('/api/v1/projects', { params }));
      this.rows.set(r.rows); this.cards.set(r.cards); this.stages.set(r.stages); this.customers.set(r.customers);
    } catch (e) { this.error.set(errorMessage(e, 'تعذر تحميل المشروعات')); }
    finally { this.loaded.set(true); }
  }

  private blank() {
    return { id: '', rev: 0, code: '', name: '', customerId: '', customerName: '', contractNo: '', value: '' as string | number, budget: '' as string | number, start: cairoToday(), end: '',
      progress: '' as string | number, status: '', supervisorId: '', assignedTo: '', notes: '', extraFields: [] as { label: string; value: string }[],
      /** record.attachments القديمة (عرض بس في لوحة المرفقات — UAT 7.4 L11) */
      legacyAttachments: [] as { id?: string; name?: string; storedName?: string; date?: string }[] };
  }

  async openEdit(p: Proj | null) {
    this.error.set('');
    try {
      const o = await firstValueFrom(this.http.get<Opts>('/api/v1/projects/form-options', { params: p ? new HttpParams().set('id', p.id) : new HttpParams() }));
      const e = this.blank();
      if (p) {
        const cur = await firstValueFrom(this.http.get<Proj>(`/api/v1/projects/${encodeURIComponent(p.id)}`));
        // نفس تعبئة النافذة القديمة: القيمة = value || budget، والميزانية toInt(budget)، والعميل بالمعرّف أو بالاسم
        const cid = cur.customerId || o.customers.find((c) => c.name === cur.customerName)?.id || '';
        Object.assign(e, { id: cur.id, rev: cur.rev, code: cur.code ?? '', name: cur.name ?? '', customerId: cid, customerName: cur.customerName || cur.customer || '', contractNo: cur.contractNo ?? '',
          value: Number(cur.value || cur.budget) || 0, budget: Number(cur.budget) || 0, start: cur.start || cairoToday(), end: cur.end ?? '', progress: cur.progress != null ? cur.progress : '',
          supervisorId: cur.supervisorId ?? '', assignedTo: cur.assignedTo ?? '', notes: cur.notes ?? '', extraFields: (Array.isArray(cur.extraFields) ? cur.extraFields : []).map((x) => ({ ...x })),
          legacyAttachments: Array.isArray(cur.attachments) ? cur.attachments : [] });
      } else { e.code = o.nextCode; e.budget = 0; }
      e.status = o.current;
      this.e = e; this.opts.set(o); this.modal.set('edit');
    } catch (err) { this.error.set(errorMessage(err, 'تعذر فتح المشروع')); }
  }

  close() { this.modal.set(''); this.error.set(''); }
  onOverlay(ev: MouseEvent) { if (ev.target === ev.currentTarget) this.close(); }

  async save() {
    const e = this.e;
    if (!e.name.trim()) { this.toast.show('اسم المشروع مطلوب'); return; }
    this.saving.set(true); this.error.set('');
    const body = { code: e.code, name: e.name, customerId: e.customerId, customerName: e.customerName, contractNo: e.contractNo, value: String(e.value ?? ''), budget: String(e.budget ?? ''),
      start: e.start, end: e.end, progress: String(e.progress ?? ''), status: e.status, supervisorId: e.supervisorId, assignedTo: e.assignedTo, notes: e.notes, extraFields: e.extraFields };
    try {
      if (e.id) await firstValueFrom(this.http.patch(`/api/v1/projects/${encodeURIComponent(e.id)}`, { ...body, rev: e.rev }));
      else await firstValueFrom(this.http.post('/api/v1/projects', body, { headers: new HttpHeaders({ 'Idempotency-Key': `prj-${crypto.randomUUID()}` }) }));
      this.modal.set('');
      this.toast.show('تم حفظ المشروع');
      await this.load();
    } catch (err) {
      const m = errorMessage(err, 'تعذّر الحفظ');
      this.toast.show(m); this.error.set(m);
    } finally { this.saving.set(false); }
  }
}
