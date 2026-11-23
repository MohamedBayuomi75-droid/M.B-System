import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { legacyUrl } from '../core/page-routes';
import { errorMessage, SessionService } from '../core/session.service';
import { AttachmentsPanelComponent } from './attachments-panel.component';
import { LegacyToast } from './legacy-toast';

/* eslint-disable @typescript-eslint/no-explicit-any */
type W = any;
interface Board { id: string; name: string; icon: string; count: number }
interface Card { label: string; value?: string | number; parts?: { n: number; l: string; tone?: string }[]; tone?: string; ico: string }
interface Opts { nextCode: string; today: string; statuses: { code: string; label: string }[]; contractTypes: { code: string; label: string }[]; supervisors: { id: string; code: string; name: string }[]; projects: string[]; hiddenFields: string[] }
const PAGE_SIZE = 20;
const EMPTY = { q: '', status: '', supervisorId: '', type: '', project: '', xCard: '', xIns: '', xDocs: '', xData: '' };
const TYPES = [{ code: 'temporary', label: 'عامل مؤقت' }, { code: 'company', label: 'عامل شركة' }, { code: 'daily', label: 'عامل يومية' }];
const CONTRACT_STATUS = [{ code: 'active', label: 'ساري' }, { code: 'expired', label: 'منتهي' }, { code: 'suspended', label: 'موقوف' }];
const INS_STATUS = [{ code: 'insured', label: 'مؤمَّن' }, { code: 'none', label: 'غير مؤمن عليه' }, { code: 'pending', label: 'قيد التسجيل' }];
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
        <div class="table-wrap"><table class="data-table" id="wkTable">
          @if (mode() === 'temp') {
            <thead><tr><th>الكود</th><th>الاسم</th><th>الحالة</th><th>الرقم القومي</th><th>الوظيفة</th><th>القسم</th><th>المشرف</th>@if (wages()) { <th>اليومية</th> }<th>رقم التليفون</th><th>العنوان</th><th>الملاحظات</th><th></th></tr></thead>
            <tbody>
              @for (w of pageRows(); track w.id) {
                <tr [attr.data-id]="w.id">
                  <td>{{ w.code || '' }}</td>
                  <td>@if (w.warning) { <span class="doc-warn" [title]="w.warning" style="cursor:help;font-size:14px;margin-inline-end:4px;">⚠️</span> }<strong>{{ w.name }}</strong></td>
                  <td><span class="badge badge-{{ w.statusTone }}">{{ w.statusLabel }}</span>@if (w.leaveUntil) { <div class="leave-until">🏖️ حتى {{ w.leaveUntil }}</div> }</td>
                  <td>{{ w.nationalId || '—' }}</td><td>{{ w.position || w.skill || '—' }}</td><td>{{ w.departmentName }}</td><td>{{ w.supervisorName }}</td>
                  @if (wages()) { <td>{{ money(w.dailyWage) }}</td> }
                  <td>{{ w.phone || '—' }}</td><td>{{ w.address || '—' }}</td>
                  <td class="notes-cell">@if (w.issues.length) { <ul class="notes-list" [title]="w.issues.join('\\n')">@for (i of w.issues.slice(0, 3); track $index) { <li>{{ i }}</li> }@if (w.issues.length > 3) { <li class="notes-more">+{{ w.issues.length - 3 }} أخرى</li> }</ul> } @else { <span class="notes-ok">✓ مكتمل</span> }</td>
                  <td><div class="row-actions"><a class="row-btn btn-view-wrk" [href]="full" title="صفحة العامل وكشف المستحقات (الشاشة الكاملة)">👁</a>@if (canEdit) { <button type="button" class="row-btn btn-edit-wrk" [attr.data-id]="w.id" title="تعديل" (click)="openEditById(w.id)">✎</button> }@if (canDelete) { <a class="row-btn del btn-del-wrk" [href]="full" title="الحذف من الشاشة الكاملة (DEC-0121)">✕</a> }</div></td>
                </tr>
              } @empty { <tr><td colspan="12" style="text-align:center;color:var(--ink-soft);padding:30px;">لا يوجد عمال مؤقتون</td></tr> }
            </tbody>
          } @else {
            <thead><tr><th>كود العامل</th><th>الاسم</th>@if (mode() === 'mixed') { <th>النوع</th> }<th>الوظيفة</th><th>الرقم القومي</th><th>انتهاء البطاقة</th><th>حالة البطاقة</th><th>تاريخ التعيين</th><th>نوع العقد</th><th>حالة العقد</th>@if (mode() !== 'company' && wages()) { <th>اليومية</th> }@if (wages()) { <th>الراتب</th> }<th>حالة التأمين</th><th>الرقم التأميني</th><th>رقم التليفون</th><th>تاريخ الميلاد</th><th>العنوان</th><th>المشروع</th><th>المشرف</th><th>القسم</th><th>الحالة</th><th>الملاحظات</th><th></th></tr></thead>
            <tbody>
              @for (w of pageRows(); track w.id) {
                <tr [attr.data-id]="w.id">
                  @if (w.temporary) {
                    <td>—</td><td>@if (w.warning) { <span class="doc-warn" [title]="w.warning" style="cursor:help;font-size:14px;margin-inline-end:4px;">⚠️</span> }<strong>{{ w.name }}</strong></td>@if (mode() === 'mixed') { <td>مؤقت</td> }
                    <td>—</td><td>{{ w.nationalId || '—' }}</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td>@if (wages()) { <td>{{ money(w.dailyWage) }}</td><td>—</td> }<td>—</td><td>—</td>
                    <td>{{ w.phone || '—' }}</td><td>{{ w.address || '—' }}</td><td>{{ w.project || '—' }}</td><td>{{ w.supervisorName }}</td><td>{{ w.departmentName }}</td>
                    <td><span class="badge badge-ok">مؤقت</span></td>
                  } @else {
                    <td>{{ w.code || '' }}</td><td>@if (w.warning) { <span class="doc-warn" [title]="w.warning" style="cursor:help;font-size:14px;margin-inline-end:4px;">⚠️</span> }<strong>{{ w.name }}</strong></td>@if (mode() === 'mixed') { <td>شركة</td> }
                    <td>{{ w.position || w.skill || '' }}</td><td>{{ w.nationalId || '—' }}</td><td>{{ date(w.idCardExpiry) }}</td>
                    <td>@if (w.cardStatus) { <span class="badge {{ w.cardStatus === 'expired' ? 'badge-err' : 'badge-ok' }}">{{ cardLabel(w.cardStatus) }}</span> } @else { — }</td>
                    <td>{{ date(w.hireDate) }}</td><td>{{ w.contractTypeLabel || '—' }}</td>
                    <td>@if (w.contractStatus) { <span class="badge {{ w.contractStatus === 'active' ? 'badge-ok' : 'badge-err' }}">{{ label(contractStatus, w.contractStatus) }}</span> } @else { — }</td>
                    @if (mode() !== 'company' && wages()) { <td>{{ money(w.dailyWage) }}</td> }@if (wages()) { <td>{{ money(w.salary || w.basicSalary) }}</td> }
                    <td>@if (w.insuranceStatus) { <span class="badge {{ w.insuranceStatus === 'insured' ? 'badge-ok' : w.insuranceStatus === 'pending' ? 'badge-warn' : 'badge-err' }}">{{ label(insStatus, w.insuranceStatus) }}</span> } @else { — }</td>
                    <td>{{ w.insuranceNumber || '—' }}</td><td>{{ w.phone || '—' }}</td><td>{{ w.birthDate ? date(w.birthDate) : '—' }}</td><td>{{ w.address || '—' }}</td><td>{{ w.project || '—' }}</td>
                    <td>{{ w.supervisorName }}</td><td>{{ w.departmentName }}</td>
                    <td><span class="badge badge-{{ w.statusTone }}">{{ w.statusLabel }}</span>@if (w.leaveUntil) { <div class="leave-until">🏖️ حتى {{ w.leaveUntil }}</div> }</td>
                  }
                  <td class="notes-cell">@if (w.issues.length) { <ul class="notes-list" [title]="w.issues.join('\\n')">@for (i of w.issues.slice(0, 3); track $index) { <li>{{ i }}</li> }@if (w.issues.length > 3) { <li class="notes-more">+{{ w.issues.length - 3 }} أخرى</li> }</ul> } @else { <span class="notes-ok">✓ مكتمل</span> }</td>
                  <td><div class="row-actions"><a class="row-btn btn-view-wrk" [href]="full" title="صفحة العامل وكشف المستحقات (الشاشة الكاملة)">👁</a>@if (canEdit) { <button type="button" class="row-btn btn-edit-wrk" [attr.data-id]="w.id" title="تعديل" (click)="openEditById(w.id)">✎</button> }@if (canDelete) { <a class="row-btn del btn-del-wrk" [href]="full" title="الحذف من الشاشة الكاملة (DEC-0121)">✕</a> }</div></td>
                </tr>
              } @empty { <tr><td colspan="12" style="text-align:center;color:var(--ink-soft);padding:30px;">لا يوجد عمال — اضغط "إضافة عامل"</td></tr> }
            </tbody>
          }
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
      const r = await firstValueFrom(this.http.get<{ boards: Board[]; cards: Card[]; rows: W[]; mode: 'temp' | 'company' | 'mixed'; hiddenFields: string[]; supervisors: { id: string; code: string; name: string }[]; projects: string[] }>('/api/v1/workers', { params }));
      this.boards.set(r.boards); this.cards.set(r.cards); this.rows.set(r.rows); this.mode.set(r.mode); this.hidden.set(r.hiddenFields); this.supervisors.set(r.supervisors); this.projects.set(r.projects);
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

  async save() {
    const e = this.e;
    if (!String(e['name'] || '').trim()) { this.toast.show('الاسم مطلوب'); return; }
    this.saving.set(true); this.error.set('');
    const temp = e['workerType'] === 'temporary';
    const body: W = { workerType: e['workerType'], code: e['code'], name: e['name'], status: e['status'], supervisorId: e['supervisorId'], position: e['position'], nationalId: e['nationalId'], phone: e['phone'],
      address: e['address'], project: e['project'], notes: e['notes'] };
    if (this.wages()) { if (temp) body['dailyWage'] = String(e['dailyWage'] ?? ''); else body['salary'] = String(e['salary'] ?? ''); }
    if (!temp) Object.assign(body, { birthDate: e['birthDate'], idCardExpiry: e['idCardExpiry'], hireDate: e['hireDate'], contractType: e['contractType'], contractStatus: e['contractStatus'],
      insuranceNumber: e['insuranceNumber'], insuranceStatus: e['insuranceStatus'], extraFields: e['extraFields'] });
    try {
      if (e['id']) await firstValueFrom(this.http.patch(`/api/v1/workers/${encodeURIComponent(e['id'])}`, { ...body, rev: e['rev'] }));
      else await firstValueFrom(this.http.post('/api/v1/workers', body, { headers: new HttpHeaders({ 'Idempotency-Key': `wrk-${crypto.randomUUID()}` }) }));
      this.modal.set(false);
      this.toast.show(e['id'] ? 'تم التعديل' : 'تمت الإضافة');
      await this.load();
    } catch (err) { const m = errorMessage(err, 'تعذّر الحفظ'); this.toast.show(m); this.error.set(m); }
    finally { this.saving.set(false); }
  }
}
