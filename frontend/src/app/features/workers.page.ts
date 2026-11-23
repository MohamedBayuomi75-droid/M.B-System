import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { legacyUrl } from '../core/page-routes';
import { errorCode, errorMessage, SessionService } from '../core/session.service';
import { AttachmentsPanelComponent } from './attachments-panel.component';
import { LegacyToast } from './legacy-toast';
import { Cell, customCols, customValue, effectiveLayout, Head, LayoutDocs, layoutTable, Row } from './legacy-table-layout';

/* eslint-disable @typescript-eslint/no-explicit-any */
type W = any;
interface Board { id: string; name: string; icon: string; count: number }
interface Card { label: string; value?: string | number; parts?: { n: number; l: string; tone?: string }[]; tone?: string; ico: string }
interface Opts { nextCode: string; today: string; statuses: { code: string; label: string }[]; contractTypes: { code: string; label: string }[]; supervisors: { id: string; code: string; name: string }[]; projects: string[]; hiddenFields: string[] }
const PAGE_SIZE = 20;
const EMPTY = { q: '', status: '', supervisorId: '', type: '', project: '', xCard: '', xIns: '', xDocs: '', xData: '' };
const TYPES = [{ code: 'temporary', label: 'عامل مؤقت' }, { code: 'company', label: 'عامل شركة' }, { code: 'daily', label: 'عامل يومية' }];
const CONTRACT_STATUS = [{ code: 'active', label: 'ساري' }, { code: 'expired', label: 'منتهي' }, { code: 'suspended', label: 'موقوف' }];
const INS_STATUS = [{ code: 'insured', label: 'مؤمَّن' }, { code: 'none', label: 'غير مؤمن عليه' }, { code: 'pending', label: 'قيد التسجيل' }];
const CARD_STATUS: Record<string, string> = { valid: 'سارية', expired: 'منتهية', none: 'لا يوجد' };
/** fmtNum / fmtMoney / fmtDate القديمة — للعرض بس */
const fmtNum = (n: unknown) => (Number(n) || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 });
const fmtMoney = (n: unknown) => `${fmtNum(n)} ج.م`;
const fmtDate = (v: unknown) => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${Number(m[3])}/${Number(m[2])}/${m[1]}` : v ? String(v) : '—'; };

/**
 * العمال — بنفس شكل الواجهة القديمة (DEC-0093): renderer/modules/hr/pages-workers.js (لوحات الأقسام ← القايمة بأشكال الجدول التلاتة)
 * ونافذة العامل (openWorkerModal) بشكليها (مؤقت / شركة)، بكلاسات legacy-skin.css. القايمة واللوحات والكروت والملاحظات من السيرفر
 * بنفس الدوال القديمة (tests-merge/phase74.js)، والحفظ والقسم وأرشيف المستقيلين في السيرفر (DEC-0121).
 * **الأجور (B-48):** اليومية والراتب مابيظهروش ولا بيتبعتوا لو السيرفر قال إنها مخفية عن المستخدم.
 * من الشاشة الكاملة: صفحة العامل وكشف مستحقاته (د-2)، والحذف (د-3)، والإحالة للمعاش وتسجيل استقالة من القسم، والإجراءات الجماعية، وتخصيص الأعمدة، والتصدير (د-6).
 */
@Component({
  selector: 'app-workers',
  imports: [FormsModule, AttachmentsPanelComponent],
  template: `
    @if (dept() === null) {
      <div class="page">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;"><div><h2 class="page-title" style="margin:0;">العمال</h2></div></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;" class="entity-dept-boards" id="wkBoards">
          @for (b of boards(); track b.id) {
            <button type="button" class="board-card entity-dept-board" [attr.data-dept]="b.id" style="cursor:pointer;text-align:right;" (click)="enter(b.id)">
              <div class="board-card-icon" style="font-size:28px;margin-bottom:6px;">{{ b.icon }}</div>
              <div class="num" style="font-size:22px;">{{ b.count }}</div>
              <div class="lbl" style="font-size:15px;font-weight:800;color:var(--ink);">{{ b.name }}</div>
              <div style="font-size:12px;color:var(--ink-soft);margin-top:6px;">اضغط للدخول</div>
            </button>
          }
        </div>
      </div>
    } @else {
      <div class="page">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
          <div>
            <div style="margin-bottom:10px;display:flex;align-items:center;flex-wrap:wrap;gap:8px;">
              <button type="button" class="btn btn-outline btn-sm btn-entity-back-boards" id="wkBack" (click)="back()">← رجوع للأقسام</button>
              <span style="font-weight:700;font-size:14px;color:var(--ink-soft);">{{ deptLabel() }}</span>
            </div>
            <h2 class="page-title" style="margin:0;">العمال</h2>
          </div>
          <div class="btn-row">
            <span class="page-export-bar" style="display:inline-flex;gap:6px;"><a class="btn btn-outline btn-sm" [href]="full" title="التصدير من الشاشة الكاملة">إكسيل</a><a class="btn btn-outline btn-sm" [href]="full" title="التصدير من الشاشة الكاملة">CSV</a></span>
            @if (section()) {
              <a class="btn btn-primary" [href]="full" id="btnSectionAction" title="من الشاشة الكاملة">{{ section() === 'retired' ? '🏖️ إحالة للمعاش' : '🚪 إضافة مستقيل' }}</a>
            } @else if (canAdd) {
              @if (dept() !== '__core_workers_perm__') { <button type="button" class="btn btn-green-strong" id="btnAddTempWorker" (click)="openEdit(null, 'temporary')">+ إضافة عامل مؤقت</button> }
              @if (dept() !== '__core_workers_temp__') { <button type="button" class="btn btn-primary" id="btnAddWorker" (click)="openEdit(null, 'company')">+ إضافة عامل</button> }
            }
          </div>
        </div>
        <div class="sc-row" id="wkCards">
          @for (c of cards(); track c.label) {
            <div class="sc-card {{ c.tone || '' }}"><span class="sc-ico">{{ c.ico }}</span>
              <div class="sc-body">
                @if (c.parts) { <div class="sc-parts">@for (p of c.parts; track p.l) { <span class="sc-part {{ p.tone || '' }}"><b>{{ fmtNum(p.n) }}</b><i>{{ p.l }}</i></span> }</div> }
                @else { <div class="sc-num">{{ cardValue(c) }}</div> }
                <div class="sc-lbl">{{ c.label }}</div>
              </div>
            </div>
          }
        </div>
        <div class="filters-bar filters-bar-inline" style="align-items:center;">
          <input type="search" id="wrkSearch" class="input" placeholder="بحث: اسم، كود، مهارة، مشروع، هاتف، قومي..." [(ngModel)]="f.q" (ngModelChange)="reload(true)">
          <select id="wrkFilterStatus" class="input" [(ngModel)]="f.status" (ngModelChange)="reload()"><option value="">كل الحالات</option>@for (s of statuses; track s.code) { <option [value]="s.code">{{ s.label }}</option> }</select>
          <div class="filter-combo"><select id="wrkFilterSup" class="input" [(ngModel)]="f.supervisorId" (ngModelChange)="reload()"><option value="">بحث مشرف...</option>@for (s of supervisors(); track s.id) { <option [value]="s.id">{{ s.name || s.code }}</option> }</select></div>
          <select id="wrkFilterType" class="input" [(ngModel)]="f.type" (ngModelChange)="reload()"><option value="">كل الأنواع</option>@for (t of types; track t.code) { <option [value]="t.code">{{ t.label }}</option> }</select>
          <input type="text" id="wrkFilterProject" class="input" placeholder="المشروع" list="wrkProjectsList" [(ngModel)]="f.project" (ngModelChange)="reload(true)">
          <datalist id="wrkProjectsList">@for (p of projects(); track p) { <option [value]="p"></option> }</datalist>
          <select id="wrkXCard" class="input" title="البطاقة" [(ngModel)]="f.xCard" (ngModelChange)="reload()"><option value="">البطاقة: الكل</option><option value="valid">سارية</option><option value="soon">قاربت على الانتهاء</option><option value="expired">منتهية</option><option value="none">بدون تاريخ</option></select>
          <select id="wrkXIns" class="input" title="حالة التأمين" [(ngModel)]="f.xIns" (ngModelChange)="reload()"><option value="">حالة التأمين: الكل</option><option value="insured">مؤمَّن</option><option value="none">غير مؤمن عليه</option><option value="pending">قيد التسجيل</option><option value="empty">بدون تحديد</option></select>
          <select id="wrkXDocs" class="input" title="الأوراق" [(ngModel)]="f.xDocs" (ngModelChange)="reload()"><option value="">الأوراق: الكل</option><option value="missing">أوراق ناقصة</option><option value="complete">أوراق مكتملة</option></select>
          <select id="wrkXData" class="input" title="البيانات الأساسية" [(ngModel)]="f.xData" (ngModelChange)="reload()"><option value="">البيانات: الكل</option><option value="missing">بيانات أساسية ناقصة</option></select>
          @if (f.xCard || f.xIns || f.xDocs || f.xData || f.q.trim()) { <button type="button" class="btn btn-outline btn-sm" id="wrkXClear" (click)="f = { ...empty }; reload()">مسح الفلاتر</button> }
        </div>
        @if (error() && !modal()) { <div class="err" role="alert" id="wkError">{{ error() }}</div> }
        <div class="table-wrap"><table class="data-table" id="wkTable" [attr.data-layout-ent]="mode() === 'temp' ? 'workersTemp' : null">
          <!-- الأعمدة بتخطيط الأعمدة المحفوظ زي القديمة (DEC-0122): legacy-table-layout.ts -->
          <thead><tr>@for (h of tbl().head; track $index) { <th [style.display]="h.hide ? 'none' : null" [attr.data-col-key]="h.key || null" [attr.data-auto-col]="h.auto ? '1' : null">{{ h.text }}</th> }</tr></thead>
          <tbody>
            @for (r of tbl().rows; track $index) {
              <tr [attr.data-id]="r.id || null">
                @for (c of r.cells; track $index) {
                  @switch (c.t) {
                    @case ('empty') { <td colspan="12" style="text-align:center;color:var(--ink-soft);padding:30px;">{{ c.v }}</td> }
                    @case ('name') { <td [style.display]="c.hide ? 'none' : null">@if (rec(r.id).warning) { <span class="doc-warn" [title]="rec(r.id).warning" style="cursor:help;font-size:14px;margin-inline-end:4px;">⚠️</span> }<strong>{{ rec(r.id).name }}</strong></td> }
                    @case ('status') { <td [style.display]="c.hide ? 'none' : null"><span class="badge badge-{{ rec(r.id).statusTone }}">{{ rec(r.id).statusLabel }}</span>@if (rec(r.id).leaveUntil) { <div class="leave-until">🏖️ حتى {{ rec(r.id).leaveUntil }}</div> }</td> }
                    @case ('tempBadge') { <td [style.display]="c.hide ? 'none' : null"><span class="badge badge-ok">مؤقت</span></td> }
                    @case ('card') { <td [style.display]="c.hide ? 'none' : null">@if (rec(r.id).cardStatus) { <span class="badge {{ rec(r.id).cardStatus === 'expired' ? 'badge-err' : 'badge-ok' }}">{{ cardLabel(rec(r.id).cardStatus) }}</span> } @else { — }</td> }
                    @case ('contract') { <td [style.display]="c.hide ? 'none' : null">@if (rec(r.id).contractStatus) { <span class="badge {{ rec(r.id).contractStatus === 'active' ? 'badge-ok' : 'badge-err' }}">{{ label(contractStatus, rec(r.id).contractStatus) }}</span> } @else { — }</td> }
                    @case ('ins') { <td [style.display]="c.hide ? 'none' : null">@if (rec(r.id).insuranceStatus) { <span class="badge {{ rec(r.id).insuranceStatus === 'insured' ? 'badge-ok' : rec(r.id).insuranceStatus === 'pending' ? 'badge-warn' : 'badge-err' }}">{{ label(insStatus, rec(r.id).insuranceStatus) }}</span> } @else { — }</td> }
                    @case ('notes') { <td class="notes-cell" [style.display]="c.hide ? 'none' : null">@if (rec(r.id).issues.length) { <ul class="notes-list" [title]="rec(r.id).issues.join('\\n')">@for (i of rec(r.id).issues.slice(0, 3); track $index) { <li>{{ i }}</li> }@if (rec(r.id).issues.length > 3) { <li class="notes-more">+{{ rec(r.id).issues.length - 3 }} أخرى</li> }</ul> } @else { <span class="notes-ok">✓ مكتمل</span> }</td> }
                    @case ('actions') { <td><div class="row-actions"><a class="row-btn btn-view-wrk" [href]="full" title="صفحة العامل وكشف المستحقات (الشاشة الكاملة)">👁</a>@if (canEdit) { <button type="button" class="row-btn btn-edit-wrk" [attr.data-id]="r.id" title="تعديل" (click)="openEditById(r.id)">✎</button> }@if (canDelete) { <a class="row-btn del btn-del-wrk" [href]="full" title="الحذف من الشاشة الكاملة (DEC-0121)">✕</a> }</div></td> }
                    @case ('cust') { <td style="font-size:12.5px;max-width:140px;overflow:hidden;text-overflow:ellipsis;" [title]="c.v" [style.display]="c.hide ? 'none' : null">{{ c.v || '—' }}</td> }
                    @default { <td [style.display]="c.hide ? 'none' : null" [attr.data-auto-col]="c.auto ? '1' : null">{{ c.v }}</td> }
                  }
                }
              </tr>
            }
          </tbody>
        </table></div>
        <div class="btn-row table-pager" data-pager="workers" style="justify-content:space-between;align-items:center;margin-top:10px;flex-wrap:wrap;gap:8px;">
          <span style="font-size:13px;color:var(--ink-soft);">عرض {{ rows().length ? (curPage() - 1) * pageSize + 1 : 0 }}–{{ min(curPage() * pageSize, rows().length) }} من {{ rows().length }} <span style="opacity:.75;">(20 صف لكل صفحة)</span></span>
          <div style="display:flex;gap:8px;align-items:center;">
            <button type="button" class="btn btn-outline btn-sm" [disabled]="curPage() <= 1" (click)="page.set(curPage() - 1)">السابق</button>
            <span style="font-size:13px;font-weight:700;">صفحة {{ curPage() }} / {{ pages() }}</span>
            <button type="button" class="btn btn-outline btn-sm" [disabled]="curPage() >= pages()" (click)="page.set(curPage() + 1)">التالي</button>
          </div>
        </div>
      </div>
    }

    @if (modal() && opts(); as o) {
      <div class="modal-overlay" id="appModal" (click)="onOverlay($event)">
        <div class="modal modal-wide" role="dialog" aria-modal="true">
          <div class="modal-header"><h3>{{ e.id ? 'تعديل عامل' : (e.workerType === 'temporary' ? 'إضافة عامل مؤقت' : 'إضافة عامل جديد') }}</h3><button type="button" class="modal-close" (click)="close()">×</button></div>
          <div class="modal-body">
            <div class="form-grid form-grid-2" id="wrkFormGrid">
              <!-- ترتيب الخانات زي ما النافذة القديمة بتظهر بعد applyFormLayout (المؤقت والشركة) -->
              <label>الكود<input class="input" id="wrkCode" [(ngModel)]="e.code" placeholder="WRK-001"></label>
              <label>الاسم<input class="input" id="wrkName" [(ngModel)]="e.name"></label>
              @if (e.workerType === 'temporary') {
                <label>المشرف<select class="input" id="wrkSupervisor" [(ngModel)]="e.supervisorId"><option value="">اكتب اسم المشرف...</option>@for (s of o.supervisors; track s.id) { <option [value]="s.id">{{ (s.name || s.code) + (s.code ? ' — ' + s.code : '') }}</option> }</select></label>
                <label>الرقم القومي<input class="input" id="wrkNidTemp" [(ngModel)]="e.nationalId"></label>
                <label>الوظيفة<input class="input" id="wrkPosTemp" [(ngModel)]="e.position" placeholder="مثال: نجار، سباك..."></label>
                <label>القسم<input class="input" id="wrkDept" readonly tabindex="-1" [value]="e.position" placeholder="يُقرأ من خانة الوظيفة" style="background:var(--paper-2);cursor:default;"></label>
                @if (wages()) { <label>اليومية<input class="input" id="wrkWageTemp" type="number" min="0" step="0.01" [(ngModel)]="e.dailyWage" placeholder="اليومية"></label> }
                <label>الهاتف<input class="input" id="wrkPhoneTemp" [(ngModel)]="e.phone"></label>
                <label>العنوان<input class="input" id="wrkAddress" [(ngModel)]="e.address"></label>
                <label>الحالة<select class="input" id="wrkStatus" [(ngModel)]="e.status">@if (!e.id) { <option value="">— اختر —</option> }@for (s of statuses; track s.code) { <option [value]="s.code">{{ s.label }}</option> }</select></label>
              } @else {
                <label>الحالة<select class="input" id="wrkStatus" [(ngModel)]="e.status">@if (!e.id) { <option value="">— اختر —</option> }@for (s of statuses; track s.code) { <option [value]="s.code">{{ s.label }}</option> }</select></label>
                <label>الرقم القومي<input class="input" id="wrkNid" [(ngModel)]="e.nationalId" placeholder="14 رقم"></label>
                <label>الوظيفة<input class="input" id="wrkPos" [(ngModel)]="e.position" placeholder="مهندس، محاسب، نجار..."></label>
                <label>القسم<input class="input" id="wrkDept" readonly tabindex="-1" [value]="e.position" placeholder="يُقرأ من خانة الوظيفة" style="background:var(--paper-2);cursor:default;"></label>
                <label>تاريخ التعيين<input class="input" id="wrkHire" type="date" [(ngModel)]="e.hireDate"></label>
                <label>تاريخ انتهاء البطاقة الشخصية<input class="input" id="wrkIdCardExp" type="date" [(ngModel)]="e.idCardExpiry"></label>
                <label>حالة البطاقة<select class="input" id="wrkIdCardStatus" disabled><option value="">—</option><option value="valid" [selected]="cardFromDate() === 'valid'">سارية</option><option value="expired" [selected]="cardFromDate() === 'expired'">منتهية</option><option value="none">لا يوجد</option></select></label>
                <label>نوع العقد<select class="input" id="wrkContractType" [(ngModel)]="e.contractType"><option value="">—</option>@for (c of o.contractTypes; track c.code) { <option [value]="c.code">{{ c.label }}</option> }</select></label>
                <label>حالة العقد<select class="input" id="wrkContractStatus" [(ngModel)]="e.contractStatus"><option value="">—</option>@for (c of contractStatus; track c.code) { <option [value]="c.code">{{ c.label }}</option> }</select></label>
                <label>الرقم التأميني<input class="input" id="wrkInsNo" [(ngModel)]="e.insuranceNumber" placeholder="رقم التأمين"></label>
                <label>حالة التأمين<select class="input" id="wrkInsStatus" [(ngModel)]="e.insuranceStatus"><option value="">—</option>@for (c of insStatus; track c.code) { <option [value]="c.code">{{ c.label }}</option> }</select></label>
                <label>المشرف<select class="input" id="wrkSupervisor" [(ngModel)]="e.supervisorId"><option value="">اكتب اسم المشرف...</option>@for (s of o.supervisors; track s.id) { <option [value]="s.id">{{ (s.name || s.code) + (s.code ? ' — ' + s.code : '') }}</option> }</select></label>
                @if (wages()) { <label>الراتب<input class="input" id="wrkSalary" type="number" min="0" step="0.01" [(ngModel)]="e.salary"></label> }
                <label>الهاتف<input class="input" id="wrkPhone" [(ngModel)]="e.phone" placeholder="01xxxxxxxxx"></label>
                <label>المشروع<input class="input" id="wrkProject" [(ngModel)]="e.project" list="wrkProjList" placeholder="اكتب أو اختر مشروعاً..."><datalist id="wrkProjList">@for (p of o.projects; track p) { <option [value]="p"></option> }</datalist></label>
                <label>تاريخ الميلاد<input class="input" id="wrkBirth" type="date" [(ngModel)]="e.birthDate"></label>
                <label>العنوان<input class="input" id="wrkAddress" [(ngModel)]="e.address"></label>
              }
              <label style="grid-column:1/-1;">الملاحظات<textarea class="input" id="wrkNotes" rows="4" [(ngModel)]="e.notes"></textarea></label>
              @if (e.workerType !== 'temporary') { @for (x of e.extraFields; track $index) { <label>{{ x.label }}<input class="input" [(ngModel)]="x.value" [name]="'ef' + $index"></label> } }
            </div>
            <p id="wrkTypeHint" style="font-size:12px;color:var(--ink-soft);margin:8px 0 0;">{{ e.workerType === 'temporary' ? 'عامل مؤقت: الاسم · القومي · المشرف · الوظيفة · العنوان · الهاتف · اليومية' : 'عامل شركة: كل البيانات + راتب أساسي + يومية اختيارية' }}</p>
            @if (e.id) { <div class="section-title" style="margin-top:12px;font-size:14px;">المرفقات والمستندات</div><app-attachments collection="workers" [recordId]="e.id" [canEdit]="canEdit" [legacyDocs]="e.legacyAttachments" /> }
            @if (error()) { <div class="err" role="alert" id="wrkError">{{ error() }}</div> }
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="close()">إلغاء</button>
            <button type="button" class="btn btn-primary" id="btnSaveWrk" [disabled]="saving()" (click)="save()">{{ e.id ? 'حفظ التعديلات' : 'إضافة' }}</button>
          </div>
        </div>
      </div>
    }
    @if (dup(); as d) {
      <!-- guardEntityDuplicates (openSubModal): فوق نافذة العامل من غير ما تتقفل -->
      <div class="modal-overlay modal-overlay-sub" id="appSubModal" style="z-index:400000;" (click)="$event.target === $event.currentTarget && dup.set(null)">
        <div class="modal modal-wide">
          <div class="modal-header"><h3>{{ d.title }}</h3><button type="button" class="modal-close" id="btnDupX" (click)="dup.set(null)">×</button></div>
          <div class="modal-body">
            <p style="margin:0 0 12px;color:var(--ink-soft);">{{ d.message }}</p>
            <div class="table-wrap"><table class="data-table">
              <thead><tr><th>الكود</th><th>الاسم</th><th>النوع</th><th>سبب التطابق</th><th>القوة</th><th></th></tr></thead>
              <tbody>@for (m of d.matches; track $index) {
                <tr><td>{{ m.code || '—' }}</td><td><strong>{{ m.name }}</strong></td><td>{{ kindLab[m.kind] || m.kind }}</td><td>{{ m.reasons.join(' · ') }}</td>
                  <td><span class="badge badge-{{ m.strength === 'hard' ? 'err' : 'warn' }}">{{ m.strength === 'hard' ? 'تكرار مؤكد' : 'تشابه' }}</span></td>
                  <td><a class="btn btn-outline btn-sm btn-dup-open" [href]="kindUrl(m.kind)" target="_blank" rel="noopener">عرض</a></td></tr>
              }</tbody>
            </table></div>
          </div>
          <div class="modal-footer">
            @if (d.hard) { <button type="button" class="btn btn-outline" id="btnDupCancel" (click)="dup.set(null)">إغلاق</button> }
            @else { <button type="button" class="btn btn-outline" id="btnDupCancel" (click)="dup.set(null)">إلغاء</button><button type="button" class="btn btn-primary" id="btnDupForce" (click)="dup.set(null); save(true)">حفظ على أي حال</button> }
          </div>
        </div>
      </div>
    }`,
})
export class WorkersPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly toast = new LegacyToast();
  readonly canAdd = this.session.can('workers', 'add');
  readonly canEdit = this.session.can('workers', 'edit');
  readonly canDelete = this.session.can('workers', 'delete');
  readonly full = legacyUrl('workers');
  readonly empty = EMPTY; readonly types = TYPES; readonly contractStatus = CONTRACT_STATUS; readonly insStatus = INS_STATUS;
  readonly statuses = [{ code: 'active', label: 'نشط' }, { code: 'on_leave', label: 'في إجازة' }, { code: 'resigned', label: 'مستقيل' }, { code: 'retired', label: 'على المعاش' }];
  readonly pageSize = PAGE_SIZE;
  f = { ...EMPTY };
  /** null = لوحات الأقسام، '' = الكل، وإلا معرّف القسم */
  readonly dept = signal<string | null>(null);
  readonly boards = signal<Board[]>([]);
  readonly cards = signal<Card[]>([]);
  readonly rows = signal<W[]>([]);
  readonly mode = signal<'temp' | 'company' | 'mixed'>('mixed');
  readonly hidden = signal<string[]>([]);
  readonly supervisors = signal<{ id: string; code: string; name: string }[]>([]);
  readonly projects = signal<string[]>([]);
  readonly error = signal('');
  readonly page = signal(1);
  readonly modal = signal(false);
  readonly saving = signal(false);
  readonly opts = signal<Opts | null>(null);
  readonly wages = computed(() => !this.hidden().includes('dailyWage'));
  readonly section = computed(() => (this.dept() === '__retired_worker__' ? 'retired' : this.dept() === '__resigned_worker__' ? 'resigned' : ''));
  readonly deptLabel = computed(() => { const d = this.dept(); if (d === null || d === '') return 'الكل'; return this.boards().find((b) => b.id === d)?.name ?? d; });
  readonly pages = computed(() => Math.max(1, Math.ceil(this.rows().length / PAGE_SIZE)));
  readonly curPage = computed(() => Math.min(this.page(), this.pages()));
  readonly pageRows = computed(() => this.rows().slice((this.curPage() - 1) * PAGE_SIZE, this.curPage() * PAGE_SIZE));
  readonly layoutDocs = signal<LayoutDocs | null>(null);
  private readonly byId = computed(() => new Map(this.pageRows().map((w) => [String(w['id']), w])));
  rec = (id: string): W => this.byId().get(id) ?? {};
  /** نفس جدول renderWorkersPage بالموضع (thIf/tdIf بنفس المفاتيح)، وبعدين تخطيط الأعمدة المحفوظ زي القديمة (DEC-0122) */
  readonly tbl = computed(() => {
    const mode = this.mode(), wages = this.wages(), rows = this.pageRows();
    const temp = mode === 'temp', ent = temp ? 'workersTemp' : 'workers';
    const layout = effectiveLayout(ent, this.layoutDocs());
    const H = (text: string, key?: string): Head => ({ text, key });
    const C = (t: string, key?: string, v?: string): Cell => ({ t, key, v });
    const X = (v: unknown, key?: string): Cell => ({ t: 'txt', key, v: v == null || v === '' ? '—' : String(v) });
    let head: Head[]; let body: Row[];
    if (temp) {
      head = [H('الكود', 'code'), H('الاسم', 'name'), H('الحالة', 'status'), H('الرقم القومي', 'nationalId'), H('الوظيفة', 'job'), H('القسم', 'department'), H('المشرف', 'supervisor'),
        ...(wages ? [H('اليومية', 'dailyWage')] : []), H('رقم التليفون', 'phone'), H('العنوان', 'address'), H('الملاحظات', 'notes'), H('')];
      body = rows.map((w) => ({ id: String(w['id']), cells: [C('txt', 'code', w['code'] || ''), C('name', 'name'), C('status', 'status'), X(w['nationalId'], 'nationalId'), X(w['position'] || w['skill'], 'job'),
        C('txt', 'department', w['departmentName']), C('txt', 'supervisor', w['supervisorName']), ...(wages ? [C('txt', 'dailyWage', fmtMoney(w['dailyWage']))] : []),
        X(w['phone'], 'phone'), X(w['address'], 'address'), C('notes', 'notes'), C('actions')] }));
    } else {
      const customs = customCols(layout);
      head = [H('كود العامل', 'code'), H('الاسم', 'name'), ...(mode === 'mixed' ? [H('النوع')] : []), H('الوظيفة', 'job'), H('الرقم القومي', 'nationalId'), H('انتهاء البطاقة', 'idCardExpiry'),
        H('حالة البطاقة', 'idCardStatus'), H('تاريخ التعيين', 'hireDate'), H('نوع العقد', 'contractType'), H('حالة العقد', 'contractStatus'), ...(mode !== 'company' && wages ? [H('اليومية', 'dailyWage')] : []),
        ...(wages ? [H('الراتب', 'salary')] : []), H('حالة التأمين', 'insuranceStatus'), H('الرقم التأميني', 'insuranceNumber'), H('رقم التليفون', 'phone'), H('تاريخ الميلاد', 'birthDate'),
        H('العنوان', 'address'), H('المشروع', 'project'), H('المشرف', 'supervisor'), H('القسم', 'department'), H('الحالة', 'status'), H('الملاحظات', 'notes'), ...customs.map((d) => H(d.label)), H('')];
      const cust = (w: W) => customs.map((d) => C('cust', undefined, customValue(w, d.label)));
      body = rows.map((w) => {
        const id = String(w['id']);
        if (w['temporary']) {
          return { id, cells: [X(''), C('name', 'name'), ...(mode === 'mixed' ? [C('txt', undefined, 'مؤقت')] : []), X(''), X(w['nationalId'], 'nationalId'), X(''), X(''), X(''), X(''), X(''),
            ...(wages ? [C('txt', 'dailyWage', fmtMoney(w['dailyWage'])), X('')] : []), X(''), X(''), X(w['phone'], 'phone'), X(w['address'], 'address'), X(w['project'], 'project'),
            C('txt', 'supervisor', w['supervisorName']), C('txt', 'department', w['departmentName']), C('tempBadge'), C('notes', 'notes'), ...cust(w), C('actions')] };
        }
        return { id, cells: [C('txt', 'code', w['code'] || ''), C('name', 'name'), ...(mode === 'mixed' ? [C('txt', undefined, 'شركة')] : []), C('txt', 'job', w['position'] || w['skill'] || ''),
          X(w['nationalId'], 'nationalId'), C('txt', 'idCardExpiry', fmtDate(w['idCardExpiry'])), C('card', 'idCardStatus'), C('txt', 'hireDate', fmtDate(w['hireDate'])), X(w['contractTypeLabel'], 'contractType'),
          C('contract', 'contractStatus'), ...(mode !== 'company' && wages ? [C('txt', 'dailyWage', fmtMoney(w['dailyWage']))] : []), ...(wages ? [C('txt', 'salary', fmtMoney(w['salary'] || w['basicSalary']))] : []),
          C('ins', 'insuranceStatus'), X(w['insuranceNumber'], 'insuranceNumber'), X(w['phone'], 'phone'), C('txt', 'birthDate', w['birthDate'] ? fmtDate(w['birthDate']) : '—'), X(w['address'], 'address'),
          X(w['project'], 'project'), C('txt', 'supervisor', w['supervisorName']), C('txt', 'department', w['departmentName']), C('status', 'status'), C('notes', 'notes'), ...cust(w), C('actions')] };
      });
    }
    if (!body.length) body = [{ id: '', cells: [{ t: 'empty', v: temp ? 'لا يوجد عمال مؤقتون' : 'لا يوجد عمال — اضغط "إضافة عامل"' }] }];
    // أعمدة الأجور ماتتعرضش كأعمدة تلقائية لمستخدم مالوش صلاحيتها (B-48)
    const noWage = (f: { key: string; selector?: string }) => !wages && (['dailyWage', 'salary', 'basicSalary'].includes(f.key) || /Wage|Salary/.test(String(f.selector || '')));
    return layoutTable(ent, temp, head, body, layout, this.byId(), { date: fmtDate }, noWage);
  });
  e: W = {};
  private qTimer?: ReturnType<typeof setTimeout>;
  fmtNum = fmtNum; money = fmtMoney; date = fmtDate; min = Math.min;
  cardLabel = (s: string) => CARD_STATUS[s] || s;
  label = (list: { code: string; label: string }[], v: string) => list.find((x) => x.code === v)?.label ?? v;
  cardValue = (c: Card) => (typeof c.value === 'number' ? (/إجمالي/.test(c.label) ? fmtMoney(c.value) : fmtNum(c.value)) : c.value);
  cardFromDate = () => { const d = String(this.e['idCardExpiry'] || ''); if (!d || !this.opts()) return ''; return d < this.opts()!.today ? 'expired' : 'valid'; };

  ngOnInit() { void this.load(); }
  enter(id: string) { this.dept.set(id); this.f = { ...EMPTY }; this.page.set(1); void this.load(); }
  back() { this.dept.set(null); this.f = { ...EMPTY }; void this.load(); }
  reload(debounce = false) {
    clearTimeout(this.qTimer);
    if (debounce) { this.qTimer = setTimeout(() => { this.page.set(1); void this.load(); }, 220); return; }
    this.page.set(1); void this.load();
  }
  async load() {
    this.error.set('');
    try {
      let params = new HttpParams();
      const d = this.dept();
      for (const [k, v] of Object.entries({ ...this.f, departmentId: d ?? '' })) if (v) params = params.set(k, v);
      const r = await firstValueFrom(this.http.get<{ boards: Board[]; cards: Card[]; rows: W[]; mode: 'temp' | 'company' | 'mixed'; hiddenFields: string[]; supervisors: { id: string; code: string; name: string }[]; projects: string[]; layout?: LayoutDocs }>('/api/v1/workers', { params }));
      this.boards.set(r.boards); this.cards.set(r.cards); this.rows.set(r.rows); this.mode.set(r.mode); this.hidden.set(r.hiddenFields); this.supervisors.set(r.supervisors); this.projects.set(r.projects); this.layoutDocs.set(r.layout ?? null);
    } catch (err) { this.error.set(errorMessage(err, 'تعذر تحميل العمال')); }
  }

  async openEditById(id: string) {
    try { const w = await firstValueFrom(this.http.get<W>(`/api/v1/workers/${encodeURIComponent(id)}`)); await this.openEdit(w); }
    catch (err) { this.error.set(errorMessage(err, 'تعذر فتح العامل')); }
  }
  /** نفس اختيار الشكل في openWorkerModal: النوع المسجّل، أو (راتب ← شركة / يومية من غير راتب ← مؤقت)، أو المطلوب من الزرار */
  async openEdit(w: W | null, want?: 'temporary' | 'company') {
    this.error.set('');
    try {
      const o = await firstValueFrom(this.http.get<Opts>('/api/v1/workers/form-options'));
      const wt = String((w && (w['workerType'] || w['type'])) || '').toLowerCase();
      let type: 'temporary' | 'company' = want ?? 'company';
      if (/temporary|temp|daily|مؤقت|يومية|يوميه/.test(wt)) type = 'temporary';
      else if (/company|permanent|شركة/.test(wt)) type = 'company';
      else if (w && (w['salary'] || w['basicSalary'])) type = 'company';
      else if (w && w['dailyWage'] && !w['salary']) type = 'temporary';
      const s = (v: unknown) => (v == null ? '' : String(v));
      this.e = {
        id: w ? w['id'] : '', rev: w ? w['rev'] : 0, workerType: type, code: (w && w['code']) || o.nextCode, name: s(w?.['name']), status: s(w?.['status']), supervisorId: s(w?.['supervisorId']),
        position: s(w && (w['skill'] || w['position'] || w['jobTitle'])), nationalId: s(w?.['nationalId']), phone: s(w?.['phone']), address: s(w?.['address']), project: s(w?.['project']),
        dailyWage: w && w['dailyWage'] != null && w['dailyWage'] !== '' ? String(w['dailyWage']) : '', notes: s(w?.['notes']), birthDate: s(w?.['birthDate']), idCardExpiry: s(w?.['idCardExpiry']),
        hireDate: s(w?.['hireDate']) || o.today, // زي personHrFieldsHtml: تاريخ التعيين بيتملى بالنهارده لو فاضي
        contractType: s(w?.['contractType']), contractStatus: s(w?.['contractStatus']), insuranceNumber: s(w?.['insuranceNumber']), insuranceStatus: s(w?.['insuranceStatus']),
        salary: w && (w['salary'] || w['basicSalary']) ? String(w['salary'] || w['basicSalary']) : '', extraFields: Array.isArray(w?.['extraFields']) ? w!['extraFields'].map((x: W) => ({ ...x })) : [],
        legacyAttachments: Array.isArray(w?.['attachments']) ? w!['attachments'] : [],
      };
      this.opts.set(o); this.modal.set(true);
    } catch (err) { this.error.set(errorMessage(err, 'تعذر فتح النافذة')); }
  }
  close() { this.modal.set(false); this.error.set(''); }
  onOverlay(ev: MouseEvent) { if (ev.target === ev.currentTarget) this.close(); }

  readonly dup = signal<{ hard: boolean; title: string; message: string; matches: { code: string; name: string; kind: string; reasons: string[]; strength: string }[] } | null>(null);
  readonly kindLab: Record<string, string> = { employee: 'موظف', worker: 'عامل', supervisor: 'مشرف', driver: 'سائق', equipment: 'معدة/مركبة' };
  kindUrl = (k: string) => legacyUrl(k === 'equipment' ? 'equipment' : k + 's');
  async save(confirmDuplicates = false) {
    const e = this.e;
    if (!String(e['name'] || '').trim()) { this.toast.show('الاسم مطلوب'); return; }
    this.saving.set(true); this.error.set('');
    const temp = e['workerType'] === 'temporary';
    const body: W = { workerType: e['workerType'], code: e['code'], name: e['name'], status: e['status'], supervisorId: e['supervisorId'], position: e['position'], nationalId: e['nationalId'], phone: e['phone'],
      address: e['address'], project: e['project'], notes: e['notes'], ...(confirmDuplicates ? { confirmDuplicates: true } : {}) };
    if (this.wages()) { if (temp) body['dailyWage'] = String(e['dailyWage'] ?? ''); else body['salary'] = String(e['salary'] ?? ''); }
    if (!temp) Object.assign(body, { birthDate: e['birthDate'], idCardExpiry: e['idCardExpiry'], hireDate: e['hireDate'], contractType: e['contractType'], contractStatus: e['contractStatus'],
      insuranceNumber: e['insuranceNumber'], insuranceStatus: e['insuranceStatus'], extraFields: e['extraFields'] });
    try {
      if (e['id']) await firstValueFrom(this.http.patch(`/api/v1/workers/${encodeURIComponent(e['id'])}`, { ...body, rev: e['rev'] }));
      else await firstValueFrom(this.http.post('/api/v1/workers', body, { headers: new HttpHeaders({ 'Idempotency-Key': `wrk-${crypto.randomUUID()}` }) }));
      this.modal.set(false);
      this.toast.show(e['id'] ? 'تم التعديل' : 'تمت الإضافة');
      await this.load();
    } catch (err) {
      // منع التكرار زي النافذة القديمة (guardEntityDuplicates): مؤكد ← «إغلاق» بس، وتشابه ← «حفظ على أي حال»
      const code = errorCode(err);
      if (code === 'DUPLICATE' || code === 'DUPLICATE_SOFT') {
        const b = (err as { error: { title: string; message: string; matches: [] } }).error;
        this.dup.set({ hard: code === 'DUPLICATE', title: b.title, message: b.message, matches: b.matches || [] });
      } else { const m = errorMessage(err, 'تعذّر الحفظ'); this.toast.show(m); this.error.set(m); }
    }
    finally { this.saving.set(false); }
  }
}
