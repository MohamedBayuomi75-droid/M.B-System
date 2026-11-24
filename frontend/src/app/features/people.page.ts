import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { legacyUrl } from '../core/page-routes';
import { errorCode, errorMessage, SessionService } from '../core/session.service';
import { AttachmentsPanelComponent } from './attachments-panel.component';
import { LegacyToast } from './legacy-toast';
import { formMeta } from './legacy-form-order';
import { Cell, customCols, customValue, effectiveLayout, Head, LayoutDocs, layoutTable, Row } from './legacy-table-layout';

/* eslint-disable @typescript-eslint/no-explicit-any */
type P = any;
type Kind = 'supervisor' | 'driver';
interface Board { id: string; name: string; icon: string; count: number }
interface Card { label: string; value?: string | number; parts?: { n: number; l: string; tone?: string }[]; tone?: string; ico: string }
interface Opts { nextCode: string; today: string; statuses: { code: string; label: string }[]; contractTypes: { code: string; label: string }[]; licenseGrades: string[]; hiddenFields: string[] }
const PAGE_SIZE = 20;
const EMPTY = { q: '', status: '', xCard: '', xLic: '', xIns: '', xDocs: '', xData: '' };
const EXT = '__core_drivers_ext__';
const CONTRACT_STATUS = [{ code: 'active', label: 'ساري' }, { code: 'expired', label: 'منتهي' }, { code: 'suspended', label: 'موقوف' }];
const INS_STATUS = [{ code: 'insured', label: 'مؤمَّن' }, { code: 'none', label: 'غير مؤمن عليه' }, { code: 'pending', label: 'قيد التسجيل' }];
const DOC_STATUS: Record<string, string> = { valid: 'سارية', expired: 'منتهية', none: 'لا يوجد' };
const fmtNum = (n: unknown) => (Number(n) || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 });
const fmtMoney = (n: unknown) => `${fmtNum(n)} ج.م`;
const fmtDate = (v: unknown) => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${Number(m[3])}/${Number(m[2])}/${m[1]}` : v ? String(v) : '—'; };
const toInt2 = (v: unknown) => (v ? String(Math.round(Number(v) * 100) / 100) : '');
const T = {
  supervisor: { page: 'supervisors', title: 'المشرفون', pfx: 'sup', api: '/api/v1/supervisors', search: 'بحث: اسم، كود، هاتف، قومي، وظيفة، عنوان...', empty: 'لا يوجد مشرفون — أضف مشرفاً أولاً', emptySpan: 11 },
  driver: { page: 'drivers', title: 'السائقون', pfx: 'drv', api: '/api/v1/drivers', search: 'بحث: اسم، كود، درجة الرخصة، هاتف، قومي، مشروع...', empty: 'لا سائقين', emptySpan: 19 },
} as const;

/**
 * المشرفين والسواقين — بنفس شكل الواجهة القديمة (DEC-0093، DEC-0123): renderSupervisorsPage (pages-supervisors.js) وrenderDriversPage (pages-ops.js):
 * لوحات الأقسام ← القايمة (الكروت، والفلاتر ومنها الرخصة، والجدول بتخطيط الأعمدة المحفوظ — legacy-table-layout.ts)، والنوافذ التلاتة
 * (openSupervisorModal، وopenDriverModal، وopenExternalDriverModal) بترتيب خاناتها الفعلي بعد applyFormLayout.
 * القايمة واللوحات والكروت والملاحظات والحفظ من السيرفر بنفس الدوال القديمة (tests-merge/phase76.js).
 * **الأجور (B-48):** اليومية والراتب مابيظهروش ولا بيتبعتوا لو السيرفر قال إنها مخفية.
 * من الشاشة الكاملة: كشف حساب المشرف وصفحة الشخص (د-2)، والحذف والإجراءات الجماعية والتصدير وتعديل التخطيط (د-3).
 */
@Component({
  selector: 'app-people',
  imports: [FormsModule, AttachmentsPanelComponent],
  template: `
    @if (dept() === null) {
      <div class="page">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;"><div><h2 class="page-title" style="margin:0;">{{ t.title }}</h2></div></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;" class="entity-dept-boards" id="pplBoards">
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
              <button type="button" class="btn btn-outline btn-sm btn-entity-back-boards" id="pplBack" (click)="back()">← رجوع للأقسام</button>
              <span style="font-weight:700;font-size:14px;color:var(--ink-soft);">{{ deptLabel() }}</span>
            </div>
            <h2 class="page-title" style="margin:0;">{{ t.title }}</h2>
          </div>
          <div class="btn-row page-header-actions">
            <span class="page-export-bar" style="display:inline-flex;gap:6px;"><a class="btn btn-outline btn-sm" [href]="full" title="التصدير من الشاشة الكاملة">إكسيل</a><a class="btn btn-outline btn-sm" [href]="full" title="التصدير من الشاشة الكاملة">CSV</a></span>
            @if (section()) {
              <a class="btn btn-primary" [href]="full" id="btnSectionAction" title="من الشاشة الكاملة">{{ section() === 'retired' ? '🏖️ إحالة للمعاش' : '🚪 إضافة مستقيل' }}</a>
            } @else if (canAdd) {
              @if (kind === 'supervisor') { <button type="button" class="btn btn-primary" id="btnAddSup" (click)="openEdit(null)">+ إضافة مشرف</button> }
              @else {
                @if (dept() !== ext) { <button type="button" class="btn btn-primary" id="btnAddDriver" (click)="openEdit(null)">+ سائق</button> }
                @if (dept() !== '__core_drivers__') { <button type="button" class="btn btn-primary" id="btnAddExtDriver" (click)="openEdit(null, true)">+ إضافة سائق خارجي</button> }
              }
            }
          </div>
        </div>
        <div class="sc-row" id="pplCards">
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
        <div class="filters-bar" style="align-items:center;">
          <input type="search" [id]="t.pfx + 'Search'" class="input" [placeholder]="t.search" [(ngModel)]="f.q" (ngModelChange)="reload(true)" style="min-width:200px;">
          <select [id]="t.pfx + 'FilterStatus'" class="input" [(ngModel)]="f.status" (ngModelChange)="reload()"><option value="">كل الحالات</option>@for (s of statuses; track s.code) { <option [value]="s.code">{{ s.label }}</option> }</select>
          <select [id]="t.pfx + 'XCard'" class="input" title="البطاقة" [(ngModel)]="f.xCard" (ngModelChange)="reload()"><option value="">البطاقة: الكل</option><option value="valid">سارية</option><option value="soon">قاربت على الانتهاء</option><option value="expired">منتهية</option><option value="none">بدون تاريخ</option></select>
          <select [id]="t.pfx + 'XLic'" class="input" title="الرخصة" [(ngModel)]="f.xLic" (ngModelChange)="reload()"><option value="">الرخصة: الكل</option><option value="valid">سارية</option><option value="soon">قاربت على الانتهاء</option><option value="expired">منتهية</option><option value="none">بدون تاريخ</option><option value="nolic">بدون رخصة (لا تاريخ ولا صورة)</option></select>
          <select [id]="t.pfx + 'XIns'" class="input" title="حالة التأمين" [(ngModel)]="f.xIns" (ngModelChange)="reload()"><option value="">حالة التأمين: الكل</option><option value="insured">مؤمَّن</option><option value="none">غير مؤمن عليه</option><option value="pending">قيد التسجيل</option><option value="empty">بدون تحديد</option></select>
          <select [id]="t.pfx + 'XDocs'" class="input" title="الأوراق" [(ngModel)]="f.xDocs" (ngModelChange)="reload()"><option value="">الأوراق: الكل</option><option value="missing">أوراق ناقصة</option><option value="complete">أوراق مكتملة</option></select>
          <select [id]="t.pfx + 'XData'" class="input" title="البيانات الأساسية" [(ngModel)]="f.xData" (ngModelChange)="reload()"><option value="">البيانات: الكل</option><option value="missing">بيانات أساسية ناقصة</option></select>
          @if (f.xCard || f.xLic || f.xIns || f.xDocs || f.xData) { <button type="button" class="btn btn-outline btn-sm" [id]="t.pfx + 'XClear'" (click)="f = { ...empty, q: f.q, status: f.status }; reload()">مسح الفلاتر</button> }
        </div>
        @if (error() && !modal()) { <div class="err" role="alert" id="pplError">{{ error() }}</div> }
        <div class="table-wrap"><table class="data-table" id="pplTable" [attr.data-layout-ent]="mode() === 'external' ? 'driversExt' : null">
          <!-- الأعمدة بتخطيط الأعمدة المحفوظ زي القديمة (DEC-0122، د-5): legacy-table-layout.ts -->
          <thead><tr>@for (h of tbl().head; track $index) { <th [style.display]="h.hide ? 'none' : null" [attr.data-col-key]="h.key || null" [attr.data-auto-col]="h.auto ? '1' : null">{{ h.text }}</th> }</tr></thead>
          <tbody>
            @for (r of tbl().rows; track $index) {
              <tr [attr.data-id]="r.id || null">
                @for (c of r.cells; track $index) {
                  @switch (c.t) {
                    @case ('empty') { <td [attr.colspan]="t.emptySpan" style="text-align:center;color:var(--ink-soft);padding:28px;">{{ c.v }}</td> }
                    @case ('name') { <td [style.display]="c.hide ? 'none' : null">@if (c.v !== 'plain' && rec(r.id).warning) { <span class="doc-warn" [title]="rec(r.id).warning" style="cursor:help;font-size:14px;margin-inline-end:4px;">⚠️</span> }<strong>{{ rec(r.id).name }}</strong></td> }
                    @case ('status') { <td [style.display]="c.hide ? 'none' : null"><span class="badge badge-{{ rec(r.id).statusTone }}">{{ rec(r.id).statusLabel }}</span>@if (rec(r.id).leaveUntil) { <div class="leave-until">🏖️ حتى {{ rec(r.id).leaveUntil }}</div> }</td> }
                    @case ('card') { <td [style.display]="c.hide ? 'none' : null">@if (rec(r.id).cardStatus) { <span class="badge {{ rec(r.id).cardStatus === 'expired' ? 'badge-err' : 'badge-ok' }}">{{ docLabel(rec(r.id).cardStatus) }}</span> } @else { — }</td> }
                    @case ('lic') { <td [style.display]="c.hide ? 'none' : null">@if (rec(r.id).licenseStatusNow) { <span class="badge {{ rec(r.id).licenseStatusNow === 'expired' ? 'badge-err' : 'badge-ok' }}">{{ docLabel(rec(r.id).licenseStatusNow) }}</span> } @else { — }</td> }
                    @case ('contract') { <td [style.display]="c.hide ? 'none' : null">@if (rec(r.id).contractStatus) { <span class="badge {{ rec(r.id).contractStatus === 'active' ? 'badge-ok' : 'badge-err' }}">{{ label(contractStatus, rec(r.id).contractStatus) }}</span> } @else { — }</td> }
                    @case ('ins') { <td [style.display]="c.hide ? 'none' : null">@if (rec(r.id).insuranceStatus) { <span class="badge {{ rec(r.id).insuranceStatus === 'insured' ? 'badge-ok' : rec(r.id).insuranceStatus === 'pending' ? 'badge-warn' : 'badge-err' }}">{{ label(insStatus, rec(r.id).insuranceStatus) }}</span> } @else { — }</td> }
                    @case ('notes') { <td class="notes-cell" [style.display]="c.hide ? 'none' : null">@if (rec(r.id).issues.length) { <ul class="notes-list" [title]="rec(r.id).issues.join('\\n')">@for (i of rec(r.id).issues.slice(0, 3); track $index) { <li>{{ i }}</li> }@if (rec(r.id).issues.length > 3) { <li class="notes-more">+{{ rec(r.id).issues.length - 3 }} أخرى</li> }</ul> } @else { <span class="notes-ok">✓ مكتمل</span> }</td> }
                    @case ('actions') { <td style="white-space:nowrap;">@if (kind === 'supervisor') { <a class="btn btn-outline btn-sm btn-stmt-sup" [href]="full" title="كشف الحساب من الشاشة الكاملة (د-2)">كشف حساب</a> }<div class="row-actions" style="display:inline-flex;"><a class="row-btn btn-view-{{ t.pfx }}" [href]="full" title="صفحة الشخص (الشاشة الكاملة)">👁</a>@if (canEdit) { <button type="button" class="row-btn btn-edit-{{ t.pfx }}" [attr.data-id]="r.id" title="تعديل" (click)="openEditById(r.id)">✎</button> }@if (canDelete) { <a class="row-btn del btn-del-{{ t.pfx }}" [href]="full" title="الحذف من الشاشة الكاملة (د-3)">✕</a> }</div></td> }
                    @case ('cust') { <td style="font-size:12.5px;max-width:140px;overflow:hidden;text-overflow:ellipsis;" [title]="c.v" [style.display]="c.hide ? 'none' : null">{{ c.v || '—' }}</td> }
                    @default { <td [style.display]="c.hide ? 'none' : null" [attr.data-auto-col]="c.auto ? '1' : null">{{ c.v }}</td> }
                  }
                }
              </tr>
            }
          </tbody>
        </table></div>
        <div class="btn-row table-pager" [attr.data-pager]="t.page" style="justify-content:space-between;align-items:center;margin-top:10px;flex-wrap:wrap;gap:8px;">
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
          <div class="modal-header"><h3>{{ modalTitle() }}</h3><button type="button" class="modal-close" (click)="close()">×</button></div>
          <div class="modal-body">
            <div class="form-grid form-grid-2" [id]="t.pfx + 'FormGrid'">
              <!-- ترتيب الخانات زي ما النوافذ القديمة بتظهر بعد applyFormLayout -->
              <label [style.order]="ord('Code')" [style.display]="hid('Code') ? 'none' : null">{{ lb('Code', 'الكود') }}<input class="input" [id]="t.pfx + 'Code'" [(ngModel)]="e.code" [placeholder]="kind === 'supervisor' ? 'SUP-001' : 'DRV-001'"></label>
              <label [style.order]="ord('Name')" [style.display]="hid('Name') ? 'none' : null">{{ lb('Name', 'الاسم') }}<input class="input" [id]="t.pfx + 'Name'" [(ngModel)]="e.name"></label>
              @if (e.external) {
                <label [style.order]="ord('Nid')" [style.display]="hid('Nid') ? 'none' : null">{{ lb('Nid', 'الرقم القومي') }}<input class="input" id="drvNid" [(ngModel)]="e.nationalId" placeholder="14 رقم"></label>
                <label [style.order]="ord('Phone')" [style.display]="hid('Phone') ? 'none' : null">{{ lb('Phone', 'الهاتف') }}<input class="input" id="drvPhone" [(ngModel)]="e.phone" placeholder="01xxxxxxxxx"></label>
                <label [style.order]="ord('Pos')" [style.display]="hid('Pos') ? 'none' : null">{{ lb('Pos', 'الوظيفة') }}<input class="input" id="drvPos" [(ngModel)]="e.position" placeholder="سائق ..."></label>
                <label [style.order]="ord('Dept')" [style.display]="hid('Dept') ? 'none' : null">{{ lb('Dept', 'القسم') }}<input class="input" id="drvDept" readonly tabindex="-1" [value]="e.position" style="background:var(--paper-2);cursor:default;"></label>
                @if (wages()) { <label [style.order]="ord('Wage')" [style.display]="hid('Wage') ? 'none' : null">{{ lb('Wage', 'اليومية (ج.م)') }}<input class="input" id="drvWage" type="number" min="0" step="0.01" [(ngModel)]="e.dailyWage"></label> }
                <label [style.order]="ord('Address')" [style.display]="hid('Address') ? 'none' : null">{{ lb('Address', 'العنوان') }}<input class="input" id="drvAddress" [(ngModel)]="e.address"></label>
                <label [style.order]="ord('Status')" [style.display]="hid('Status') ? 'none' : null">{{ lb('Status', 'الحالة') }}<select class="input" id="drvStatus" [(ngModel)]="e.status">@if (!e.id) { <option value="">— اختر —</option> }@for (s of statuses; track s.code) { <option [value]="s.code">{{ s.label }}</option> }</select></label>
              } @else {
                <label [style.order]="ord('Nid')" [style.display]="hid('Nid') ? 'none' : null">{{ lb('Nid', 'الرقم القومي') }}<input class="input" [id]="t.pfx + 'Nid'" [(ngModel)]="e.nationalId" placeholder="14 رقم"></label>
                <label [style.order]="ord('Birth')" [style.display]="hid('Birth') ? 'none' : null">{{ lb('Birth', 'تاريخ الميلاد') }}<input class="input" [id]="t.pfx + 'Birth'" type="date" [(ngModel)]="e.birthDate"></label>
                <label [style.order]="ord('Pos')" [style.display]="hid('Pos') ? 'none' : null">{{ lb('Pos', 'الوظيفة') }}<input class="input" [id]="t.pfx + 'Pos'" [(ngModel)]="e.position" placeholder="مهندس، محاسب، نجار..."></label>
                <label [style.order]="ord('Phone')" [style.display]="hid('Phone') ? 'none' : null">{{ lb('Phone', 'الهاتف') }}<input class="input" [id]="t.pfx + 'Phone'" [(ngModel)]="e.phone" placeholder="01xxxxxxxxx"></label>
                @if (kind === 'supervisor') { <label [style.order]="ord('Dept')" [style.display]="hid('Dept') ? 'none' : null">{{ lb('Dept', 'القسم') }}<input class="input" id="supDept" readonly tabindex="-1" [value]="e.position" placeholder="يُقرأ من خانة الوظيفة" style="background:var(--paper-2);cursor:default;"></label> }
                @else { <label [style.order]="ord('LicGrade')" [style.display]="hid('LicGrade') ? 'none' : null">{{ lb('LicGrade', 'درجة الرخصة') }}<select class="input" id="drvLicGrade" [(ngModel)]="e.licenseGrade"><option value="">—</option>@for (g of gradeOptions(o); track g) { <option [value]="g">{{ g }}</option> }</select></label> }
                <label [style.order]="ord('IdCardExp')" [style.display]="hid('IdCardExp') ? 'none' : null">{{ lb('IdCardExp', 'تاريخ انتهاء البطاقة الشخصية') }}<input class="input" [id]="t.pfx + 'IdCardExp'" type="date" [(ngModel)]="e.idCardExpiry"></label>
                <label [style.order]="ord('IdCardStatus')" [style.display]="hid('IdCardStatus') ? 'none' : null">{{ lb('IdCardStatus', 'حالة البطاقة') }}<select class="input" [id]="t.pfx + 'IdCardStatus'" disabled><option value="">—</option><option value="valid" [selected]="fromDate(e.idCardExpiry) === 'valid'">سارية</option><option value="expired" [selected]="fromDate(e.idCardExpiry) === 'expired'">منتهية</option><option value="none">لا يوجد</option></select></label>
                <label [style.order]="ord('LicExp')" [style.display]="hid('LicExp') ? 'none' : null">{{ lb('LicExp', kind === 'supervisor' ? 'تاريخ انتهاء الرخصة الشخصية' : 'تاريخ انتهاء الرخصة') }}<input class="input" [id]="t.pfx + 'LicExp'" type="date" [(ngModel)]="e.licenseExpiry"></label>
                <label [style.order]="ord('LicStatus')" [style.display]="hid('LicStatus') ? 'none' : null">{{ lb('LicStatus', 'حالة الرخصة') }}<select class="input" [id]="t.pfx + 'LicStatus'" disabled><option value="">—</option><option value="valid" [selected]="fromDate(e.licenseExpiry) === 'valid'">سارية</option><option value="expired" [selected]="fromDate(e.licenseExpiry) === 'expired'">منتهية</option><option value="none">لا يوجد</option></select></label>
                <label [style.order]="ord('Hire')" [style.display]="hid('Hire') ? 'none' : null">{{ lb('Hire', 'تاريخ التعيين') }}<input class="input" [id]="t.pfx + 'Hire'" type="date" [(ngModel)]="e.hireDate"></label>
                <label [style.order]="ord('ContractType')" [style.display]="hid('ContractType') ? 'none' : null">{{ lb('ContractType', 'نوع العقد') }}<select class="input" [id]="t.pfx + 'ContractType'" [(ngModel)]="e.contractType"><option value="">—</option>@for (c of o.contractTypes; track c.code) { <option [value]="c.code">{{ c.label }}</option> }</select></label>
                <label [style.order]="ord('ContractStatus')" [style.display]="hid('ContractStatus') ? 'none' : null">{{ lb('ContractStatus', 'حالة العقد') }}<select class="input" [id]="t.pfx + 'ContractStatus'" [(ngModel)]="e.contractStatus"><option value="">—</option>@for (c of contractStatus; track c.code) { <option [value]="c.code">{{ c.label }}</option> }</select></label>
                @if (wages()) {
                  @if (kind === 'supervisor') { <label [style.order]="ord('Wage')" [style.display]="hid('Wage') ? 'none' : null">{{ lb('Wage', 'اليومية') }}<input class="input" id="supWage" type="number" min="0" step="0.01" [(ngModel)]="e.dailyWage"></label> }
                  @else { <label [style.order]="ord('Salary')" [style.display]="hid('Salary') ? 'none' : null">{{ lb('Salary', 'الراتب') }}<input class="input" id="drvSalary" type="number" min="0" step="0.01" [(ngModel)]="e.salary"></label> }
                }
                <label [style.order]="ord('InsNo')" [style.display]="hid('InsNo') ? 'none' : null">{{ lb('InsNo', 'الرقم التأميني') }}<input class="input" [id]="t.pfx + 'InsNo'" [(ngModel)]="e.insuranceNumber" placeholder="رقم التأمين"></label>
                <label [style.order]="ord('InsStatus')" [style.display]="hid('InsStatus') ? 'none' : null">{{ lb('InsStatus', 'حالة التأمين') }}<select class="input" [id]="t.pfx + 'InsStatus'" [(ngModel)]="e.insuranceStatus"><option value="">—</option>@for (c of insStatus; track c.code) { <option [value]="c.code">{{ c.label }}</option> }</select></label>
                @if (kind === 'driver') { <label [style.order]="ord('Dept')" [style.display]="hid('Dept') ? 'none' : null">{{ lb('Dept', 'القسم') }}<input class="input" id="drvDept" readonly tabindex="-1" [value]="e.position" placeholder="يُقرأ من خانة الوظيفة" style="background:var(--paper-2);cursor:default;"></label> }
                @if (kind === 'supervisor') {
                  <label [style.order]="ord('Status')" [style.display]="hid('Status') ? 'none' : null">{{ lb('Status', 'الحالة') }}<select class="input" id="supStatus" [(ngModel)]="e.status">@if (!e.id) { <option value="">— اختر —</option> }@for (s of statuses; track s.code) { <option [value]="s.code">{{ s.label }}</option> }</select></label>
                  @if (resigned()) { <label [style.order]="ord('ResignDateWrap')" [style.display]="hid('ResignDateWrap') ? 'none' : null" id="supResignDateWrap">{{ lb('ResignDateWrap', 'تاريخ الاستقالة *') }}<input class="input" id="supResignDate" type="date" [(ngModel)]="e.resignedAt"></label> }
                  <label [style.order]="ord('Address')" [style.display]="hid('Address') ? 'none' : null">{{ lb('Address', 'العنوان') }}<input class="input" id="supAddress" [(ngModel)]="e.address"></label>
                } @else {
                  <label [style.order]="ord('Address')" [style.display]="hid('Address') ? 'none' : null">{{ lb('Address', 'العنوان') }}<input class="input" id="drvAddress" [(ngModel)]="e.address"></label>
                  <label [style.order]="ord('Status')" [style.display]="hid('Status') ? 'none' : null">{{ lb('Status', 'الحالة') }}<select class="input" id="drvStatus" [(ngModel)]="e.status">@if (!e.id) { <option value="">— اختر —</option> }@for (s of statuses; track s.code) { <option [value]="s.code">{{ s.label }}</option> }</select></label>
                  @if (resigned()) { <label [style.order]="ord('ResignDateWrap')" [style.display]="hid('ResignDateWrap') ? 'none' : null" id="drvResignDateWrap">{{ lb('ResignDateWrap', 'تاريخ الاستقالة *') }}<input class="input" id="drvResignDate" type="date" [(ngModel)]="e.resignedAt"></label> }
                }
              }
              <!-- customFieldsFormHtml: الخانات الإضافية قبل الملاحظات -->
              @if (!e.external) { @for (x of e.extraFields; track $index) { <label [style.order]="ord('extra')">{{ x.label }}<input class="input" [(ngModel)]="x.value" [name]="'ef' + $index"></label> } }
              <label [style.order]="ord('Notes')" [style.display]="hid('Notes') ? 'none' : null" style="grid-column:1/-1;">{{ lb('Notes', 'الملاحظات') }}<textarea class="input" [id]="t.pfx + 'Notes'" rows="4" [(ngModel)]="e.notes"></textarea></label>
            </div>
            @if (e.id) { <div class="section-title" style="margin-top:12px;font-size:14px;">المرفقات والمستندات</div><app-attachments [collection]="t.page" [recordId]="e.id" [canEdit]="canEdit" [legacyDocs]="e.legacyAttachments" /> }
            @if (error()) { <div class="err" role="alert" id="pplModalError">{{ error() }}</div> }
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="close()">إلغاء</button>
            <button type="button" class="btn btn-primary" [id]="kind === 'supervisor' ? 'btnSaveSup' : 'btnSaveDriver'" [disabled]="saving()" (click)="save()">{{ e.id ? (kind === 'supervisor' ? 'حفظ التعديلات' : 'حفظ التعديل') : 'إضافة' }}</button>
          </div>
        </div>
      </div>
    }
    @if (dup(); as d) {
      <!-- guardEntityDuplicates (openSubModal): فوق النافذة من غير ما تتقفل -->
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
export class PeoplePage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly toast = new LegacyToast();
  readonly kind: Kind = inject(ActivatedRoute).snapshot.data['kind'] === 'driver' ? 'driver' : 'supervisor';
  readonly t = T[this.kind];
  readonly ext = EXT;
  readonly canAdd = this.session.can(this.t.page, 'add');
  readonly canEdit = this.session.can(this.t.page, 'edit');
  readonly canDelete = this.session.can(this.t.page, 'delete');
  readonly full = legacyUrl(this.t.page);
  readonly empty = EMPTY; readonly contractStatus = CONTRACT_STATUS; readonly insStatus = INS_STATUS;
  readonly statuses = [{ code: 'active', label: 'نشط' }, { code: 'on_leave', label: 'في إجازة' }, { code: 'resigned', label: 'مستقيل' }, { code: 'retired', label: 'على المعاش' }];
  readonly pageSize = PAGE_SIZE;
  f = { ...EMPTY };
  readonly dept = signal<string | null>(null);
  readonly boards = signal<Board[]>([]);
  readonly cards = signal<Card[]>([]);
  readonly rows = signal<P[]>([]);
  readonly mode = signal<'company' | 'external'>('company');
  readonly hidden = signal<string[]>([]);
  readonly layoutDocs = signal<LayoutDocs | null>(null);
  readonly error = signal('');
  readonly page = signal(1);
  readonly modal = signal(false);
  readonly saving = signal(false);
  readonly opts = signal<Opts | null>(null);
  readonly dup = signal<{ hard: boolean; title: string; message: string; matches: { code: string; name: string; kind: string; reasons: string[]; strength: string }[] } | null>(null);
  readonly kindLab: Record<string, string> = { employee: 'موظف', worker: 'عامل', supervisor: 'مشرف', driver: 'سائق', equipment: 'معدة/مركبة' };
  kindUrl = (k: string) => legacyUrl(k === 'equipment' ? 'equipment' : k + 's');
  readonly wages = computed(() => !this.hidden().includes('dailyWage'));
  readonly section = computed(() => { const d = this.dept() || ''; return /^__retired_/.test(d) ? 'retired' : /^__resigned_/.test(d) ? 'resigned' : ''; });
  readonly deptLabel = computed(() => { const d = this.dept(); if (d === null || d === '') return 'الكل'; return this.boards().find((b) => b.id === d)?.name ?? d; });
  readonly pages = computed(() => Math.max(1, Math.ceil(this.rows().length / PAGE_SIZE)));
  readonly curPage = computed(() => Math.min(this.page(), this.pages()));
  readonly pageRows = computed(() => this.rows().slice((this.curPage() - 1) * PAGE_SIZE, this.curPage() * PAGE_SIZE));
  private readonly byId = computed(() => new Map(this.pageRows().map((p) => [String(p['id']), p])));
  rec = (id: string): P => this.byId().get(id) ?? {};
  e: P = {};
  readonly status = signal('');
  private qTimer?: ReturnType<typeof setTimeout>;
  /** applyFormLayout + applyPeopleFormOrder على النافذة المفتوحة (legacy-form-order.ts) */
  private readonly fm = computed(() => { const ent = this.t.page; const d = this.layoutDocs(), fl = d?.formLayouts?.[ent]; return formMeta(effectiveLayout(ent, d), this.t.pfx, Array.isArray(fl) && fl.length > 0 && !!d?.aligned?.[ent]); });
  ord = (k: string) => this.fm().ord(k); hid = (k: string) => this.fm().hid(k); lb = (k: string, d: string) => this.fm().lb(k, d);
  fmtNum = fmtNum; min = Math.min;
  docLabel = (s: string) => DOC_STATUS[s] || s;
  label = (list: { code: string; label: string }[], v: string) => list.find((x) => x.code === v)?.label ?? v;
  cardValue = (c: Card) => (typeof c.value === 'number' ? (/إجمالي/.test(c.label) ? fmtMoney(c.value) : fmtNum(c.value)) : c.value);
  fromDate = (d: unknown) => { const v = String(d || ''); if (!v || !this.opts()) return ''; return v < this.opts()!.today ? 'expired' : 'valid'; };
  resigned = () => ['resigned', 'left', 'terminated', 'retired'].includes(String(this.e['status'] || '').toLowerCase());
  modalTitle = () => (this.e['external'] ? (this.e['id'] ? 'تعديل سائق خارجي' : 'إضافة سائق خارجي') : this.kind === 'supervisor' ? (this.e['id'] ? 'تعديل مشرف' : 'إضافة مشرف جديد') : this.e['id'] ? 'تعديل سائق' : 'إضافة سائق جديد');
  /** درجة الرخصة: القايمة الثابتة، والقيمة القديمة لو مش فيها بتتضاف أولها (زي openDriverModal) */
  gradeOptions = (o: Opts) => { const cur = String(this.e['licenseGrade'] || ''); return cur && !o.licenseGrades.includes(cur) ? [cur, ...o.licenseGrades] : o.licenseGrades; };

  /** نفس جداول renderSupervisorsPage / renderDriversPage بالموضع (thIf/tdIf بنفس المفاتيح)، وبعدين تخطيط الأعمدة المحفوظ زي القديمة */
  readonly tbl = computed(() => {
    const rows = this.pageRows(), wages = this.wages(), extMode = this.mode() === 'external';
    const ent = this.kind === 'supervisor' ? 'supervisors' : extMode ? 'driversExt' : 'drivers';
    const layout = effectiveLayout(ent, this.layoutDocs());
    const H = (text: string, key?: string): Head => ({ text, key });
    const C = (t: string, key?: string, v?: string): Cell => ({ t, key, v });
    const X = (v: unknown, key?: string): Cell => ({ t: 'txt', key, v: v == null || v === '' ? '—' : String(v) });
    let head: Head[]; let body: Row[];
    if (this.kind === 'supervisor') {
      const customs = customCols(layout);
      head = [H('كود المشرف', 'code'), H('الاسم', 'name'), H('الوظيفة'), H('الرقم القومي', 'nationalId'), H('انتهاء البطاقة'), H('حالة البطاقة'), H('انتهاء الرخصة'), H('حالة الرخصة'),
        H('تاريخ التعيين'), H('نوع العقد'), H('حالة العقد'), ...(wages ? [H('اليومية')] : []), H('حالة التأمين'), H('الرقم التأميني'), H('رقم التليفون'), H('تاريخ الميلاد', 'birthDate'),
        H('العنوان', 'address'), H('القسم', 'department'), H('عدد العمال'), H('الحالة', 'status'), H('الملاحظات', 'notes'), ...customs.map((d) => H(d.label)), H('')];
      body = rows.map((p) => ({ id: String(p['id']), cells: [C('txt', 'code', p['code'] || ''), C('name'), X(p['position'] || p['skill']), X(p['nationalId'], 'nationalId'), C('txt', undefined, fmtDate(p['idCardExpiry'])),
        C('card'), C('txt', undefined, fmtDate(p['licenseExpiry'])), C('lic'), C('txt', undefined, fmtDate(p['hireDate'])), X(p['contractTypeLabel']), C('contract'), ...(wages ? [C('txt', undefined, fmtMoney(p['dailyWage']))] : []),
        C('ins'), X(p['insuranceNumber']), X(p['phone'], 'phone'), C('txt', 'birthDate', p['birthDate'] ? fmtDate(p['birthDate']) : '—'), X(p['address'], 'address'), C('txt', undefined, p['departmentName'] === '—' ? '' : p['departmentName']),
        C('txt', undefined, String(p['workersCount'] ?? 0)), C('status'), C('notes'), ...customs.map((d) => C('cust', undefined, customValue(p, d.label))), C('actions')] }));
    } else if (extMode) {
      head = [H('الكود'), H('الاسم'), H('الحالة'), H('الرقم القومي'), H('الوظيفة'), H('القسم'), ...(wages ? [H('اليومية')] : []), H('الهاتف'), H('العنوان'), H('الملاحظات'), H('')];
      body = rows.map((p) => ({ id: String(p['id']), cells: [C('txt', undefined, p['code'] || ''), C('name', undefined, 'plain'), C('status'), X(p['nationalId']), C('txt', undefined, p['position'] || 'سائق'),
        C('txt', undefined, p['departmentName'] === '—' ? '' : p['departmentName']), ...(wages ? [C('txt', undefined, fmtMoney(p['dailyWage']))] : []), X(p['phone']), X(p['address']), C('notes'), C('actions')] }));
    } else {
      head = [H('كود السائق'), H('الاسم'), H('الوظيفة'), H('الرقم القومي'), H('انتهاء البطاقة'), H('حالة البطاقة'), H('انتهاء الرخصة'), H('حالة الرخصة'), H('درجة الرخصة'), H('تاريخ التعيين'),
        H('نوع العقد'), H('حالة العقد'), ...(wages ? [H('الراتب')] : []), H('حالة التأمين'), H('الرقم التأميني'), H('رقم التليفون'), H('تاريخ الميلاد', 'birthDate'), H('العنوان'), H('القسم'), H('الحالة'), H('الملاحظات'), H('')];
      body = rows.map((p) => ({ id: String(p['id']), cells: [C('txt', undefined, p['code'] || ''), C('name'), C('txt', undefined, p['position'] || 'سائق'), X(p['nationalId']), C('txt', undefined, fmtDate(p['idCardExpiry'])),
        C('card'), C('txt', undefined, fmtDate(p['licenseExpiry'])), C('lic'), X(p['licenseGrade']), C('txt', undefined, fmtDate(p['hireDate'])), X(p['contractTypeLabel']), C('contract'),
        ...(wages ? [C('txt', undefined, fmtMoney(p['external'] ? p['dailyWage'] : p['salary'] || p['basicSalary'] || 0))] : []), C('ins'), X(p['insuranceNumber']), X(p['phone']),
        C('txt', 'birthDate', p['birthDate'] ? fmtDate(p['birthDate']) : '—'), X(p['address']), C('txt', undefined, p['departmentName'] === '—' ? '' : p['departmentName']), C('status'), C('notes'), C('actions')] }));
    }
    if (!body.length) body = [{ id: '', cells: [{ t: 'empty', v: this.t.empty }] }];
    const noWage = (f: { key: string; selector?: string }) => !wages && (['dailyWage', 'salary', 'basicSalary'].includes(f.key) || /Wage|Salary/.test(String(f.selector || '')));
    return layoutTable(ent, extMode, head, body, layout, this.byId(), { date: fmtDate }, noWage);
  });

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
      for (const [k, v] of Object.entries({ ...this.f, departmentId: this.dept() ?? '' })) if (v) params = params.set(k, v);
      const r = await firstValueFrom(this.http.get<{ boards: Board[]; cards: Card[]; rows: P[]; mode: 'company' | 'external'; hiddenFields: string[]; layout?: LayoutDocs }>(this.t.api, { params }));
      this.boards.set(r.boards); this.cards.set(r.cards); this.rows.set(r.rows); this.mode.set(r.mode); this.hidden.set(r.hiddenFields); this.layoutDocs.set(r.layout ?? null);
    } catch (err) { this.error.set(errorMessage(err, 'تعذر التحميل')); }
  }
  async openEditById(id: string) {
    try { const p = await firstValueFrom(this.http.get<P>(`${this.t.api}/${encodeURIComponent(id)}`)); await this.openEdit(p); }
    catch (err) { this.error.set(errorMessage(err, 'تعذر الفتح')); }
  }
  /** القيم الافتراضية زي النوافذ القديمة: الكود الجاي، و«سائق» للوظيفة، وتاريخ التعيين بالنهارده لو فاضي، واليومية/الراتب بخانتين */
  async openEdit(p: P | null, external = false) {
    this.error.set('');
    try {
      const o = await firstValueFrom(this.http.get<Opts>(`${this.t.api}/form-options`));
      const s = (v: unknown) => (v == null ? '' : String(v));
      const isExt = this.kind === 'driver' && (p ? !!p['external'] : external);
      this.e = {
        id: p ? p['id'] : '', rev: p ? p['rev'] : 0, external: isExt, code: (p && p['code']) || o.nextCode, name: s(p?.['name']), status: s(p?.['status']), resignedAt: s(p?.['resignedAt'] || p?.['resignDate']),
        position: isExt ? s(p?.['position']) || 'سائق' : this.kind === 'supervisor' ? s(p && (p['skill'] || p['position'])) : s(p && (p['position'] || p['jobTitle'] || p['skill'])) || 'سائق',
        nationalId: s(p?.['nationalId']), phone: s(p?.['phone']), address: s(p?.['address']), notes: s(p?.['notes']), birthDate: s(p?.['birthDate']), idCardExpiry: s(p?.['idCardExpiry']),
        licenseExpiry: s(p?.['licenseExpiry']), hireDate: s(p?.['hireDate']) || o.today, contractType: s(p?.['contractType']), contractStatus: s(p?.['contractStatus']),
        insuranceNumber: s(p?.['insuranceNumber']), insuranceStatus: s(p?.['insuranceStatus']), licenseGrade: s(p?.['licenseGrade']),
        dailyWage: toInt2(p?.['dailyWage']), salary: toInt2(p && (p['salary'] || p['basicSalary'])),
        extraFields: this.extraFieldsFor(p), legacyAttachments: Array.isArray(p?.['attachments']) ? p!['attachments'] : [],
      };
      this.opts.set(o); this.modal.set(true);
    } catch (err) { this.error.set(errorMessage(err, 'تعذر فتح النافذة')); }
  }
  /** customFieldsFormHtml: خانات «تعديلات مخصصة» الظاهرة في التخطيط (حتى في الإضافة)، بقيمها من السجل (extraFields ثم custom)، وبعدها أي خانة قديمة تانية في السجل */
  private extraFieldsFor(p: P | null): { label: string; value: string }[] {
    const defs = effectiveLayout(this.t.page, this.layoutDocs()).filter((x) => x && x.type === 'custom' && x.visible !== false && x.label);
    const own: { label: string; value: unknown }[] = Array.isArray(p?.['extraFields']) ? p!['extraFields'] : [];
    const out = defs.map((d) => ({ label: String(d.label), value: customValue(p, d.label) }));
    for (const x of own) if (x && x.label && !out.some((o) => o.label === x.label)) out.push({ label: String(x.label), value: String(x.value ?? '') });
    return out;
  }
  close() { this.modal.set(false); this.error.set(''); }
  onOverlay(ev: MouseEvent) { if (ev.target === ev.currentTarget) this.close(); }

  async save(confirmDuplicates = false) {
    const e = this.e;
    if (!String(e['name'] || '').trim()) { this.toast.show('الاسم مطلوب'); return; }
    this.saving.set(true); this.error.set('');
    const body: P = e['external']
      ? { external: true, code: e['code'], name: e['name'], status: e['status'], nationalId: e['nationalId'], position: e['position'], phone: e['phone'], address: e['address'], notes: e['notes'] }
      : { code: e['code'], name: e['name'], status: e['status'], resignedAt: this.resigned() ? e['resignedAt'] : '', position: e['position'], nationalId: e['nationalId'], birthDate: e['birthDate'],
        idCardExpiry: e['idCardExpiry'], licenseExpiry: e['licenseExpiry'], hireDate: e['hireDate'], contractType: e['contractType'], contractStatus: e['contractStatus'], insuranceNumber: e['insuranceNumber'],
        insuranceStatus: e['insuranceStatus'], phone: e['phone'], address: e['address'], notes: e['notes'], extraFields: e['extraFields'], ...(this.kind === 'driver' ? { licenseGrade: e['licenseGrade'] } : {}) };
    if (this.wages()) { if (e['external'] || this.kind === 'supervisor') body['dailyWage'] = String(e['dailyWage'] ?? ''); else body['salary'] = String(e['salary'] ?? ''); }
    if (confirmDuplicates) body['confirmDuplicates'] = true;
    try {
      if (e['id']) await firstValueFrom(this.http.patch(`${this.t.api}/${encodeURIComponent(e['id'])}`, { ...body, rev: e['rev'] }));
      else await firstValueFrom(this.http.post(this.t.api, body, { headers: new HttpHeaders({ 'Idempotency-Key': `${this.t.pfx}-${crypto.randomUUID()}` }) }));
      this.modal.set(false);
      this.toast.show(e['id'] ? 'تم التعديل' : 'تمت الإضافة');
      await this.load();
    } catch (err) {
      const code = errorCode(err);
      if (code === 'DUPLICATE' || code === 'DUPLICATE_SOFT') {
        const b = (err as { error: { title: string; message: string; matches: [] } }).error;
        this.dup.set({ hard: code === 'DUPLICATE', title: b.title, message: b.message, matches: b.matches || [] });
      } else { const m = errorMessage(err, 'تعذّر الحفظ'); this.toast.show(m); this.error.set(m); }
    } finally { this.saving.set(false); }
  }
}
