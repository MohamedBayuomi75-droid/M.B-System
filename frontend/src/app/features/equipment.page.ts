import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { legacyUrl } from '../core/page-routes';
import { errorCode, errorMessage, SessionService } from '../core/session.service';
import { LegacyToast } from './legacy-toast';
import { ModalField, ModalForm, modalForm } from './legacy-leave-form';
import { Cell, customCols, customValue, effectiveLayout, Head, LayoutDocs, layoutTable, Row } from './legacy-table-layout';

/* eslint-disable @typescript-eslint/no-explicit-any */
type P = any;
interface Board { id: string; name: string; icon: string; count: number }
interface Card { label: string; value?: string | number; newValue?: string; parts?: { n: number; l: string; tone?: string }[]; tone?: string; ico: string }
const PAGE_SIZE = 20;
const EMPTY = { q: '', status: '', ownership: '', project: '', xLic: '', xIns: '', xDocs: '' };
const EXT = '__core_eq_external__';
const byAr = <T extends { label: string }>(xs: readonly T[]) => xs.slice().sort((a, b) => String(a.label).localeCompare(String(b.label), 'ar', { sensitivity: 'base' }));
const STATUS = byAr([{ code: 'working', label: 'تعمل' }, { code: 'stopped', label: 'متوقفة' }, { code: 'maintenance', label: 'صيانة' }, { code: 'rented', label: 'مستأجرة' }, { code: 'rented_out', label: 'مؤجرة للغير' }]);
const OWNERSHIP = byAr([{ code: 'owned', label: 'ملك الشركة' }, { code: 'rented', label: 'إيجار خارجي' }]);
const INS = [{ code: 'insured', label: 'مؤمَّن' }, { code: 'none', label: 'غير مؤمن عليه' }, { code: 'pending', label: 'قيد التسجيل' }];
const fmtNum = (n: unknown) => (Number(n) || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 });
const fmtMoney = (n: unknown) => `${fmtNum(n)} ج.م`;
const fmtDate = (v: unknown) => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${Number(m[3])}/${Number(m[2])}/${m[1]}` : v ? String(v) : '—'; };
/** خانات نافذة المعدة بترتيبها في الـ DOM (applyFormLayout على 'equipment') */
const EQ_FIELDS: ModalField[] = ['Code', 'Type', 'CarType', 'Status', 'Ownership', 'VehicleNumber', 'Color', 'Motor', 'Chassis', 'InsNo', 'InsStatus', 'Model', 'Driver', 'PurchasePrice', 'Inspection', 'LicIssue', 'VehLicExp', 'PurchaseDate', 'LastMaint', 'NextMaint', 'Notes']
  .map((k) => ({ id: k, sels: k === 'Driver' ? ['#eqDriver_text', '#eqDriver'] : [`#eq${k}`] }));
const EQ_LABEL: Record<string, string> = {
  Code: 'الكود (تلقائي — قابل للتعديل)', Type: 'نوع الترخيص', CarType: 'نوع السيارة', Status: 'الحالة', Ownership: 'الملكية', VehicleNumber: 'رقم اللوحة', Color: 'اللون', Motor: 'رقم الماتور', Chassis: 'رقم الشاسيه',
  InsNo: 'الرقم التأميني', InsStatus: 'حالة التأمين', Model: 'الموديل', Driver: 'اسم السائق', PurchasePrice: 'سعر الشراء', Inspection: 'تاريخ الفحص', LicIssue: 'تاريخ إصدار الرخصة', VehLicExp: 'تاريخ انتهاء رخصة السيارة',
  PurchaseDate: 'تاريخ الشراء', LastMaint: 'تاريخ آخر صيانة', NextMaint: 'موعد الصيانة القادمة', Notes: 'ملاحظات',
};
const DATE_FIELDS = new Set(['Inspection', 'LicIssue', 'VehLicExp', 'PurchaseDate', 'LastMaint', 'NextMaint']);

/**
 * المعدات والمركبات — بنفس شكل الواجهة القديمة (DEC-0093، DEC-0139): renderEquipmentPage وopenEquipmentModal وrenderEquipmentDailyGrid
 * وopenEquipmentDailyModal (pages-equipment.js). لوحات الأقسام ← القايمة (الكروت، والفلاتر، والجدول بتخطيط الأعمدة المحفوظ) ← النافذة؛
 * و«📅» ← الجدول الشهري ونافذة اليومية. القايمة والحفظ والتكلفة من السيرفر بنفس الدوال القديمة (tests-merge/phase87.js).
 * **التكلفة بالحساب الجديد (DEC-0140)** والقديم جنبها. صفحة المعدة وكشف الأيام والوقود والصيانة والإجراءات الجماعية والتصدير والحذف من الشاشة الكاملة.
 */
@Component({
  selector: 'app-equipment',
  imports: [FormsModule],
  template: `
    @if (view() === 'daily') {
      <div class="page">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <div>
            <button type="button" class="btn btn-outline btn-sm" id="btnEqDailyBack" (click)="view.set('list')">← رجوع للمعدات</button>
            <h2 class="page-title" style="margin:10px 0 0;">جدول كشف أيام معدة</h2>
            <p class="page-sub" style="margin:4px 0 0;">علامة تحت اليوم = تشغيل · اضغط للتعديل · كشف يومية لكل معدة</p>
          </div>
          <div class="btn-row">@if (canAddDaily) { <button type="button" class="btn btn-primary" id="btnEqDailyAdd" (click)="openDaily(null)">+ يومية معدة</button> }</div>
        </div>
        <div class="filters-bar">
          <select id="eqdYear" class="input" style="width:100px;" [(ngModel)]="year" (ngModelChange)="loadGrid()">@for (y of years(); track y) { <option [ngValue]="y">{{ y }}</option> }</select>
          <select id="eqdMonth" class="input" style="min-width:120px;" [(ngModel)]="month" (ngModelChange)="loadGrid()">@for (m of months; track m.n) { <option [ngValue]="m.n">{{ m.l }}</option> }</select>
          <input type="search" id="eqdSearch" class="input" placeholder="بحث معدة..." style="min-width:160px;" [(ngModel)]="gq" (ngModelChange)="loadGrid(true)">
          <select id="eqdStatus" class="input" [(ngModel)]="gstatus" (ngModelChange)="loadGrid()"><option value="">كل الحالات</option>@for (s of statuses; track s.code) { <option [value]="s.code">{{ s.label }}</option> }</select>
        </div>
        @if (grid(); as g) {
          @if (g.cards.legacyCost !== +g.cards.cost) { <div id="eqdDiff" style="margin:0 0 10px;font-size:12.5px;color:var(--ink-soft);">التكلفة بالحساب الجديد (DEC-0140: التوقف {{ g.idlePercent }}%، والنقل بتكلفته، والتكلفة الإضافية): {{ fmtNew(g.cards.cost) }} — بالحساب القديم: {{ fmtMoney(g.cards.legacyCost) }}</div> }
          <div class="table-wrap" style="overflow:auto;">
            <table class="data-table" id="eqdGrid" [style.min-width.px]="160 + days().length * 34" style="font-size:12px;">
              <thead><tr><th style="position:sticky;right:0;background:var(--paper);z-index:2;min-width:150px;">المعدة</th>@for (d of days(); track d) { <th style="text-align:center;padding:4px;min-width:28px;">{{ d }}</th> }<th>ساعات</th><th>تكلفة</th><th></th></tr></thead>
              <tbody>
                @for (r of g.rows; track r.id) {
                  <tr [attr.data-id]="r.id">
                    <td style="position:sticky;right:0;background:var(--paper);z-index:1;"><strong>{{ r.name }}</strong><div style="font-size:11px;color:var(--ink-soft);">{{ r.code }}</div></td>
                    @for (d of days(); track d) {
                      @let log = logOf(r, d);
                      @if (!log) { <td style="text-align:center;padding:2px;"><button type="button" class="eqd-cell empty" [attr.data-eq]="r.id" [attr.data-day]="d" title="تسجيل يومية" [disabled]="!canAddDaily" style="border:none;background:transparent;cursor:pointer;width:100%;min-height:28px;color:var(--ink-soft);" (click)="openDaily(null, r.id, d)">·</button></td> }
                      @else { <td style="text-align:center;padding:2px;"><button type="button" class="eqd-cell filled" [attr.data-id]="log.id" [attr.data-eq]="r.id" [attr.data-day]="d" [title]="log.hours + 'س · وقود ' + (log.fuelLiters || 0) + 'ل · ' + fmtNew(log.cost)" style="border:none;background:transparent;cursor:pointer;font-weight:800;color:var(--ok,#2d6a4f);width:100%;min-height:28px;" (click)="openDailyById(log.id)">{{ log.hours ? (log.hours >= 8 ? '✓' : round(log.hours)) : '✓' }}</button></td> }
                    }
                    <td><strong>{{ fmtNum(r.hours) }}</strong></td><td><strong>{{ fmtNew(r.cost) }}</strong></td>
                    <td style="white-space:nowrap;">@if (canAddDaily) { <button type="button" class="btn btn-outline btn-sm btn-eqd-add" [attr.data-eq]="r.id" (click)="openDaily(null, r.id)">+</button> }{{ ' ' }}<a class="btn btn-outline btn-sm btn-eqd-stmt" [href]="full">كشف</a></td>
                  </tr>
                } @empty { <tr><td [attr.colspan]="days().length + 4" style="text-align:center;color:var(--ink-soft);padding:28px;">لا معدات</td></tr> }
              </tbody>
            </table>
          </div>
          <div class="section-title" style="margin-top:20px;">سجلات الشهر (تعديل / حذف)</div>
          <div class="table-wrap"><table class="data-table" id="eqdList">
            <thead><tr><th>التاريخ</th><th>المعدة</th><th>المشروع</th><th>ساعات</th><th>وقود</th><th>تكلفة</th><th>إنتاجية</th><th></th></tr></thead>
            <tbody>
              @for (d of g.list; track d.id) {
                <tr [attr.data-id]="d.id"><td>{{ fmtDate(d.date) }}</td><td>{{ d.equipmentName }}</td><td>{{ d.project }}</td><td>{{ fmtNum(d.hours) }}</td><td>{{ fmtNum(d.fuelLiters) }} ل</td><td><strong>{{ fmtNew(d.cost) }}</strong></td><td>{{ d.productivity || '—' }}</td>
                  <td style="white-space:nowrap;"><button type="button" class="btn btn-outline btn-sm btn-edit-eqd" (click)="openDailyById(d.id)">تعديل</button>{{ ' ' }}<button type="button" class="btn btn-outline btn-sm btn-del-eqd" [disabled]="!canDelDaily" (click)="del.set({ id: d.id, rev: d.rev })">حذف</button></td></tr>
              } @empty { <tr><td colspan="8" style="text-align:center;color:var(--ink-soft);">لا يوميات في الشهر</td></tr> }
            </tbody>
          </table></div>
        }
      </div>
    } @else if (dept() === null) {
      <div class="page">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;"><div><h2 class="page-title" style="margin:0;">المعدات والمركبات</h2></div></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;" class="entity-dept-boards" id="eqBoards">
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
              <button type="button" class="btn btn-outline btn-sm btn-entity-back-boards" id="eqBack" (click)="back()">← رجوع للأقسام</button>
              <span style="font-weight:700;font-size:14px;color:var(--ink-soft);">{{ deptLabel() }}</span>
            </div>
            <h2 class="page-title" style="margin:0;">المعدات والمركبات</h2>
          </div>
          <div class="btn-row">
            <span class="page-export-bar" style="display:inline-flex;gap:6px;"><a class="btn btn-outline btn-sm" [href]="full" title="التصدير من الشاشة الكاملة">إكسيل</a><a class="btn btn-outline btn-sm" [href]="full" title="التصدير من الشاشة الكاملة">CSV</a></span>
            @if (dept() === ext) { <button type="button" class="btn btn-green-strong" id="btnAddExtCar" [disabled]="!canAdd" (click)="openEdit(null)">+ إضافة سيارة خارجية</button> }
            @else { <button type="button" class="btn btn-primary" id="btnAddEquip" [disabled]="!canAdd" (click)="openEdit(null)">+ إضافة معدة</button> }
          </div>
        </div>
        <div class="sc-row" id="eqCards">
          @for (c of cards(); track c.label) {
            <div class="sc-card {{ c.tone || '' }}"><span class="sc-ico">{{ c.ico }}</span>
              <div class="sc-body">
                @if (c.parts) { <div class="sc-parts">@for (p of c.parts; track p.l) { <span class="sc-part {{ p.tone || '' }}"><b>{{ fmtNum(p.n) }}</b><i>{{ p.l }}</i></span> }</div> }
                @else { <div class="sc-num">{{ c.newValue !== undefined ? fmtNew(c.newValue) : c.label.indexOf('تكلفة') >= 0 ? fmtMoney(c.value) : fmtNum(c.value) }}</div> }
                <div class="sc-lbl">{{ c.label }}</div>
              </div>
            </div>
          }
        </div>
        <div class="filters-bar">
          <input type="search" id="eqSearch" class="input" placeholder="بحث: كود، اسم، لوحة، شاسيه، مشروع..." style="min-width:200px;" [(ngModel)]="f.q" (ngModelChange)="reload(true)">
          <select id="eqFilterStatus" class="input" [(ngModel)]="f.status" (ngModelChange)="reload()"><option value="">كل الحالات</option>@for (s of statuses; track s.code) { <option [value]="s.code">{{ s.label }}</option> }</select>
          <select id="eqFilterOwn" class="input" [(ngModel)]="f.ownership" (ngModelChange)="reload()"><option value="">الملكية</option>@for (s of ownership; track s.code) { <option [value]="s.code">{{ s.label }}</option> }</select>
          <input type="search" id="eqFilterProject" class="input" placeholder="مشروع..." style="min-width:120px;" [(ngModel)]="f.project" (ngModelChange)="reload(true)">
          <select id="eqXLic" class="input" title="رخصة المركبة" [(ngModel)]="f.xLic" (ngModelChange)="reload()"><option value="">رخصة المركبة: الكل</option><option value="valid">سارية</option><option value="soon">قاربت على الانتهاء</option><option value="expired">منتهية</option><option value="none">بدون تاريخ</option></select>
          <select id="eqXIns" class="input" title="حالة التأمين" [(ngModel)]="f.xIns" (ngModelChange)="reload()"><option value="">حالة التأمين: الكل</option><option value="insured">مؤمَّن</option><option value="none">غير مؤمن عليه</option><option value="pending">قيد التسجيل</option><option value="empty">بدون تحديد</option></select>
          <select id="eqXDocs" class="input" title="الأوراق" [(ngModel)]="f.xDocs" (ngModelChange)="reload()"><option value="">الأوراق: الكل</option><option value="missing">أوراق ناقصة</option><option value="complete">أوراق مكتملة</option></select>
          @if (f.xLic || f.xIns || f.xDocs) { <button type="button" class="btn btn-outline btn-sm" id="eqXClear" (click)="f = { ...empty, q: f.q, status: f.status, ownership: f.ownership, project: f.project }; reload()">مسح الفلاتر</button> }
        </div>
        @if (error() && !modal()) { <div class="err" role="alert" id="eqError">{{ error() }}</div> }
        <div class="table-wrap"><table class="data-table" id="eqTable">
          <thead><tr>@for (h of tbl().head; track $index) { <th [style.display]="h.hide ? 'none' : null" [style.width]="h.input ? '36px' : null">@if (h.input) { <input type="checkbox" id="checkAll_equipment" title="تحديد الكل" disabled> } @else { {{ h.text }} }</th> }</tr></thead>
          <tbody>
            @for (r of tbl().rows; track $index) {
              <tr [attr.data-id]="r.id || null">
                @for (c of r.cells; track $index) {
                  @switch (c.t) {
                    @case ('empty') { <td colspan="18" style="text-align:center;color:var(--ink-soft);padding:30px;">{{ c.v }}</td> }
                    @case ('check') { <td><input type="checkbox" class="row-check" data-kind="equipment" [attr.data-id]="r.id" disabled title="الإجراءات الجماعية من الشاشة الكاملة"></td> }
                    @case ('name') { <td [style.display]="c.hide ? 'none' : null"><strong>{{ c.v }}</strong></td> }
                    @case ('ins') { <td [style.display]="c.hide ? 'none' : null">@switch (insTone(c.v)) { @case ('') { <span style="color:var(--ink-soft);">—</span> } @default { <span class="badge badge-{{ insTone(c.v) }}">{{ insLabel(c.v) }}</span> } }</td> }
                    @case ('doc') { <td [style.display]="c.hide ? 'none' : null">@if (c.v === 'valid') { <span class="badge badge-ok">سارية</span> } @else if (c.v === 'expired') { <span class="badge badge-err">منتهية</span> } @else { <span style="color:var(--ink-soft);">—</span> }</td> }
                    @case ('notes') { <td class="notes-cell" [style.display]="c.hide ? 'none' : null">@if (rec(r.id).issues.length) { <ul class="notes-list" [title]="rec(r.id).issues.join('\\n')">@for (i of rec(r.id).issues.slice(0, 3); track $index) { <li>{{ i }}</li> }@if (rec(r.id).issues.length > 3) { <li class="notes-more">+{{ rec(r.id).issues.length - 3 }} أخرى</li> }</ul> } @else { <span class="notes-ok">✓ مكتمل</span> }</td> }
                    @case ('actions') { <td><div class="row-actions"><a class="icon-btn btn-view-eq" [href]="full" title="عرض (الشاشة الكاملة)">👁️</a>{{ ' ' }}<button type="button" class="icon-btn btn-daily-eq" [attr.data-id]="r.id" title="يومية" [disabled]="!canAddDaily" (click)="openDaily(null, r.id)">📅</button>{{ ' ' }}<button type="button" class="icon-btn btn-edit-eq" [attr.data-id]="r.id" title="تعديل" (click)="openEditById(r.id)">✏️</button>{{ ' ' }}<a class="icon-btn icon-del btn-del-eq" [href]="full" title="الحذف من الشاشة الكاملة">🗑️</a></div></td> }
                    @case ('cust') { <td style="font-size:12.5px;max-width:140px;overflow:hidden;text-overflow:ellipsis;" [title]="c.v" [style.display]="c.hide ? 'none' : null">{{ c.v || '—' }}</td> }
                    @default { <td [style.display]="c.hide ? 'none' : null" [attr.data-auto-col]="c.auto ? '1' : null">{{ c.v }}</td> }
                  }
                }
              </tr>
            }
          </tbody>
        </table></div>
        <div class="btn-row table-pager" data-pager="equipment" style="justify-content:space-between;align-items:center;margin-top:10px;flex-wrap:wrap;gap:8px;">
          <span style="font-size:13px;color:var(--ink-soft);">عرض {{ rows().length ? (curPage() - 1) * 20 + 1 : 0 }}–{{ min(curPage() * 20, rows().length) }} من {{ rows().length }} <span style="opacity:.75;">(20 صف لكل صفحة)</span></span>
          <div style="display:flex;gap:8px;align-items:center;"><button type="button" class="btn btn-outline btn-sm" [disabled]="curPage() <= 1" (click)="page.set(curPage() - 1)">السابق</button><span style="font-size:13px;font-weight:700;">صفحة {{ curPage() }} / {{ pages() }}</span><button type="button" class="btn btn-outline btn-sm" [disabled]="curPage() >= pages()" (click)="page.set(curPage() + 1)">التالي</button></div>
        </div>
        <div style="margin-top:14px;"><button type="button" class="btn btn-outline" id="btnEqDailyView" (click)="openGrid()">📅 جدول كشف أيام المعدات</button></div>
      </div>
    }

    @if (modal() && opts(); as o) {
      <div class="modal-overlay" id="appModal" (click)="$event.target === $event.currentTarget && close()">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header"><h3>{{ e.id ? 'تعديل مركبة' : 'إضافة مركبة' }}</h3><button type="button" class="modal-close" (click)="close()">×</button></div>
          <div class="modal-body">
            <div class="form-grid form-grid-2">
              @for (k of eqKeys; track k) {
                <label [style.order]="fo.order[k]" [style.display]="fo.hide[k] ? 'none' : null" [style.grid-column]="k === 'Notes' ? '1 / -1' : null">{{ fo.label[k] || eqLabel[k] }}
                  @switch (k) {
                    @case ('Type') { <select class="input" id="eqType" [(ngModel)]="e.type"><option value="">— بدون —</option>@for (d of o.departments; track d.id) { <option [value]="d.id">{{ d.name }}</option> }</select> }
                    @case ('CarType') { <input class="input" id="eqCarType" [(ngModel)]="e.carType" placeholder="مثال: تويوتا / حفار / لودر..." autocomplete="off" list="eqTypeList"><datalist id="eqTypeList">@for (t of o.equipmentTypes; track t) { <option [value]="t"></option> }</datalist> }
                    @case ('Status') { <select class="input" id="eqStatus" [(ngModel)]="e.status">@if (!e.id) { <option value="">— اختر —</option> }@for (s of statuses; track s.code) { <option [value]="s.code">{{ s.label }}</option> }</select> }
                    @case ('Ownership') { <select class="input" id="eqOwnership" [(ngModel)]="e.ownership">@if (!e.id) { <option value="">— اختر —</option> }@for (s of ownership; track s.code) { <option [value]="s.code">{{ s.label }}</option> }</select> }
                    @case ('InsStatus') { <select class="input" id="eqInsStatus" [(ngModel)]="e.insuranceStatus"><option value="">—</option>@for (s of insSorted; track s.code) { <option [value]="s.code">{{ s.label }}</option> }</select> }
                    @case ('Driver') { <select class="input" id="eqDriver" [(ngModel)]="e.driverId"><option value="">اختر السائق من صفحة السائقين...</option>@for (d of o.drivers; track d.id) { <option [value]="d.id">{{ (d.code ? d.code + ' — ' : '') + d.name }}</option> }</select> }
                    @case ('PurchasePrice') { <input class="input" id="eqPurchasePrice" type="number" min="0" step="0.01" [(ngModel)]="e.purchasePrice"> }
                    @case ('Notes') { <textarea class="input" id="eqNotes" rows="2" [(ngModel)]="e.notes"></textarea> }
                    @default { <input class="input" [id]="'eq' + k" [type]="isDate(k) ? 'date' : 'text'" [(ngModel)]="e[k]"> }
                  }
                </label>
              }
            </div>
            @if (error()) { <div class="err" role="alert" id="eqModalError">{{ error() }}</div> }
          </div>
          <div class="modal-footer"><button type="button" class="btn btn-outline" (click)="close()">إلغاء</button><button type="button" class="btn btn-primary" id="btnSaveEq" [disabled]="saving()" (click)="save()">{{ e.id ? 'حفظ التعديلات' : 'إضافة' }}</button></div>
        </div>
      </div>
    }
    @if (dup(); as d) {
      <div class="modal-overlay" id="appConfirmModal" style="z-index:500000;">
        <div class="modal app-confirm-modal"><div class="modal-header app-confirm-head"><h3 style="margin:0;flex:1;">{{ d.title }}</h3></div>
          <div class="modal-body">{{ d.message }}</div>
          <div class="modal-footer">@if (!d.hard) { <button type="button" class="btn btn-primary" id="btnDupSave" (click)="dup.set(null); save(true)">حفظ على أي حال</button> }<button type="button" class="btn btn-outline" (click)="dup.set(null)">رجوع</button></div>
        </div>
      </div>
    }
    @if (dmodal() && opts(); as o) {
      <div class="modal-overlay" id="appModal" (click)="$event.target === $event.currentTarget && dmodal.set(false)">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header"><h3>{{ d.id ? 'تعديل يومية معدة' : 'يومية تشغيل معدة' }}</h3><button type="button" class="modal-close" (click)="dmodal.set(false)">×</button></div>
          <div class="modal-body">
            <div class="form-grid form-grid-2">
              <label>المعدة *<select class="input" id="edEq" [(ngModel)]="d.equipmentId" (ngModelChange)="fillFromEq()"><option value="">اكتب اسم المعدة أو الكود...</option>@for (x of o.equipment; track x.id) { <option [value]="x.id">{{ (x.code ? x.code + ' — ' : '') + x.name }}</option> }</select></label>
              <label>التاريخ *<input class="input" id="edDate" type="date" [(ngModel)]="d.date"></label>
              <label>المشروع / الموقع *<input class="input" id="edProject" [(ngModel)]="d.project"></label>
              <label>نوع اليوم<select class="input" id="edKind" [(ngModel)]="d.kind">@for (k of o.dayKinds; track k.code) { <option [value]="k.code">{{ k.label }}</option> }</select></label>
              @if (d.kind === 'move') { <label id="edMoveWrap">تكلفة النقل (ج.م) *<input class="input" id="edMoveCost" type="number" min="0" step="0.01" [(ngModel)]="d.moveCost"><small style="display:block;color:var(--ink-soft);margin-top:4px;">حسب اللي بينقل (DEC-0140)</small></label> }
              <label>عدد الأيام المحسوبة *<input class="input" id="edDays" type="number" min="0" step="0.5" [(ngModel)]="d.days"><small style="display:block;color:var(--ink-soft);margin-top:4px;">مثل العمال: 1 أو 0.5 أو 2</small></label>
              <label>سعر اليومية (ج.م)<input class="input" id="edDaily" type="number" min="0" step="0.01" [(ngModel)]="d.dailyCost"></label>
              <label>ساعات التشغيل<input class="input" id="edHours" type="number" min="0" step="0.5" [(ngModel)]="d.hours"></label>
              <label>تكلفة الساعة (ج.م)<input class="input" id="edHourly" type="number" min="0" step="0.01" [(ngModel)]="d.hourlyCost"></label>
              <label>وقود (لتر)<input class="input" id="edFuel" type="number" min="0" step="0.1" [(ngModel)]="d.fuelLiters"></label>
              <label>سعر اللتر (ج.م)<input class="input" id="edFuelPrice" type="number" min="0" step="0.01" [(ngModel)]="d.fuelPrice"></label>
              <label>تكلفة إضافية<input class="input" id="edExtra" type="number" min="0" step="0.01" [(ngModel)]="d.extraCost"></label>
              <label>الإنتاجية<input class="input" id="edProd" [(ngModel)]="d.productivity"></label>
              <label style="grid-column:1/-1;">ملاحظات<textarea class="input" id="edNotes" rows="4" [(ngModel)]="d.notes"></textarea></label>
            </div>
            <div style="margin-top:12px;padding:10px;border-radius:8px;background:var(--paper-2);border:1px solid var(--line);font-weight:700;">تكلفة اليوم (الحساب الجديد): <span id="edCostVal">{{ fmtNum(previewCost()) }}</span> ج.م</div>
            @if (error()) { <div class="err" role="alert" id="edError">{{ error() }}</div> }
          </div>
          <div class="modal-footer"><button type="button" class="btn btn-outline" (click)="dmodal.set(false)">إلغاء</button>@if (d.id && canDelDaily) { <button type="button" class="btn btn-outline" id="btnDelEd" style="color:var(--debt);" (click)="del.set({ id: d.id, rev: d.rev })">حذف</button> }<button type="button" class="btn btn-primary" id="btnSaveEd" [disabled]="saving()" (click)="saveDaily()">{{ d.id ? 'حفظ التعديل' : 'حفظ اليومية' }}</button></div>
        </div>
      </div>
    }
    @if (del(); as x) {
      <div class="modal-overlay" id="appConfirmModal" style="z-index:500000;" (click)="$event.target === $event.currentTarget && del.set(null)">
        <div class="modal app-confirm-modal">
          <div class="modal-header app-confirm-head danger"><span class="confirm-icon" aria-hidden="true">🗑️</span><h3 style="margin:0;flex:1;">تأكيد الحذف</h3><button type="button" class="modal-close" aria-label="إغلاق" (click)="del.set(null)">×</button></div>
          <div class="modal-body">هل أنت متأكد من الحذف؟</div>
          <div class="modal-footer"><button type="button" class="btn btn-danger" id="btnConfirmDel" (click)="removeDaily(x)">حذف</button><button type="button" class="btn btn-outline" (click)="del.set(null)">إلغاء</button></div>
        </div>
      </div>
    }`,
})
export class EquipmentPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(SessionService);
  private readonly toast = new LegacyToast();
  readonly full = legacyUrl('equipment');
  readonly canAdd = this.session.can('equipment', 'add');
  readonly canAddDaily = this.session.can('workerAttendance', 'add') || this.canAdd;
  readonly canDelDaily = this.session.can('workerAttendance', 'delete') || this.session.can('equipment', 'delete');
  readonly statuses = STATUS; readonly ownership = OWNERSHIP; readonly insSorted = byAr(INS); readonly ext = EXT; readonly empty = EMPTY;
  readonly eqKeys = EQ_FIELDS.map((x) => x.id); readonly eqLabel = EQ_LABEL;
  readonly months = Array.from({ length: 12 }, (_, i) => ({ n: i + 1, l: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'][i] }));
  readonly view = signal<'list' | 'daily'>('list');
  readonly dept = signal<string | null>(null);
  readonly boards = signal<Board[]>([]);
  readonly cards = signal<Card[]>([]);
  readonly rows = signal<P[]>([]);
  readonly layoutDocs = signal<LayoutDocs | null>(null);
  readonly grid = signal<P | null>(null);
  readonly error = signal('');
  readonly page = signal(1);
  readonly modal = signal(false);
  readonly dmodal = signal(false);
  readonly saving = signal(false);
  readonly opts = signal<P | null>(null);
  readonly dup = signal<{ hard: boolean; title: string; message: string } | null>(null);
  readonly del = signal<{ id: string; rev: number } | null>(null);
  readonly deptLabel = computed(() => { const d = this.dept(); if (d === null || d === '') return 'الكل'; return this.boards().find((b) => b.id === d)?.name ?? d; });
  readonly pages = computed(() => Math.max(1, Math.ceil(this.rows().length / PAGE_SIZE)));
  readonly curPage = computed(() => Math.min(this.page(), this.pages()));
  readonly pageRows = computed(() => this.rows().slice((this.curPage() - 1) * PAGE_SIZE, this.curPage() * PAGE_SIZE));
  readonly byId = computed(() => new Map(this.rows().map((r) => [String(r.id), r])));
  year = 0; month = 0; gq = ''; gstatus = '';
  readonly years = computed(() => { const y = this.year || new Date().getFullYear(); return [y - 1, y, y + 1]; });
  readonly days = computed(() => { this.grid(); const n = new Date(this.year, this.month, 0).getDate() || 30; return Array.from({ length: n }, (_, i) => i + 1); });
  f: P = { ...EMPTY };
  e: P = {};
  d: P = {};
  fo: ModalForm = modalForm('equipment', EQ_FIELDS, []);
  private qTimer?: ReturnType<typeof setTimeout>;
  fmtNum = fmtNum; fmtMoney = fmtMoney; fmtDate = fmtDate; min = Math.min; round = Math.round;
  fmtNew = (v: unknown) => `${(Number(v) || 0).toLocaleString('ar-EG', { maximumFractionDigits: 6 })} ج.م`;
  rec = (id: string) => this.byId().get(String(id)) || { issues: [] };
  isDate = (k: string) => DATE_FIELDS.has(k);
  insTone(v: unknown) { const s = String(v || '').trim(); if (!s || s === '—') return ''; if (s === 'insured' || s === 'مؤمَّن' || s === 'مؤمن') return 'ok'; if (s === 'pending' || s === 'قيد التسجيل') return 'warn'; if (s === 'none' || s === 'uninsured' || s === 'غير مؤمن عليه' || s === 'لا يوجد') return 'err'; return 'warn'; }
  insLabel(v: unknown) { const s = String(v || '').trim(); return s === 'مؤمن' ? 'مؤمَّن' : s === 'uninsured' || s === 'لا يوجد' ? 'غير مؤمن عليه' : (INS.find((o) => o.code === s) || { label: s }).label; }

  /** نفس جدول renderEquipmentPage بالموضع (thIf/tdIf بنفس المفاتيح)، وبعدين تخطيط الأعمدة المحفوظ زي القديمة */
  readonly tbl = computed(() => {
    const layout = effectiveLayout('equipment', this.layoutDocs());
    const customs = customCols(layout);
    const H = (text: string, key?: string): Head => ({ text, key });
    const X = (v: unknown, key?: string): Cell => ({ t: 'txt', key, v: v == null || v === '' ? '—' : String(v) });
    const head: Head[] = [{ text: '', input: true }, H('الكود'), H('نوع السيارة'), H('رقم اللوحة'), H('اللون'), H('رقم الماتور'), H('رقم الشاسيه'), H('الرقم التأميني'), H('حالة التأمين'), H('الموديل'), H('اسم السائق'), H('سعر الشراء', 'purchasePrice'),
      H('تاريخ الفحص'), H('تاريخ الإصدار'), H('تاريخ انتهاء رخصة السيارة'), H('حالة رخصة السيارة'), H('نوع الترخيص'), H('انتهاء رخصة السائق'), H('حالة رخصة السائق'),
      H('الحالة', 'status'), H('الملكية', 'ownership'), H('تاريخ الشراء', 'purchaseDate'), H('آخر صيانة', 'lastMaintenance'), H('الصيانة القادمة', 'nextMaintenance'), H('ملاحظات'), ...customs.map((c) => H(c.label)), H('')];
    let body: Row[] = this.pageRows().map((p) => ({ id: String(p.id), cells: [{ t: 'check' }, { t: 'txt', v: p.code || '' }, { t: 'name', v: p.typeLabel || p.name || '' }, X(p.vehicleNumber || p.plate), X(p.color), X(p.motorNumber || p.serial), X(p.chassisNumber),
      X(p.insuranceNumber), { t: 'ins', v: p.insuranceStatus || '' }, X(p.model), X(p.driverDisplay), { t: 'txt', key: 'purchasePrice', v: p.purchasePrice ? fmtMoney(p.purchasePrice) : '—' },
      { t: 'txt', v: fmtDate(p.inspectionDate) }, { t: 'txt', v: fmtDate(p.licenseIssueDate) }, { t: 'txt', v: fmtDate(p.vehicleExpiry) }, { t: 'doc', v: p.vehicleLicenseNow }, X(p.licenseCategory || p.ownership),
      { t: 'txt', v: fmtDate(p.driverLicenseExpiry) }, { t: 'doc', v: p.driverLicenseNow }, X(p.statusLabel, 'status'), X(p.ownershipLabel, 'ownership'),
      { t: 'txt', key: 'purchaseDate', v: fmtDate(p.purchaseDate) }, { t: 'txt', key: 'lastMaintenance', v: fmtDate(p.lastMaintenance) }, { t: 'txt', key: 'nextMaintenance', v: fmtDate(p.nextMaintenance) },
      { t: 'notes' }, ...customs.map((c) => ({ t: 'cust', v: customValue(p, c.label) })), { t: 'actions' }] as Cell[] }));
    if (!body.length) body = [{ id: '', cells: [{ t: 'empty', v: 'لا توجد معدات — اضغط «إضافة معدة»' }] }];
    return layoutTable('equipment', false, head, body, layout, this.byId(), { date: fmtDate });
  });

  ngOnInit() { void this.load(); if (this.route.snapshot.queryParamMap.get('view') === 'daily') this.openGrid(); }
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
      for (const [k, v] of Object.entries({ ...this.f, departmentId: this.dept() ?? '' })) if (v) params = params.set(k, String(v));
      const r = await firstValueFrom(this.http.get<P>('/api/v1/equipment', { params }));
      this.boards.set(r.boards); this.cards.set(r.cards); this.rows.set(r.rows); this.layoutDocs.set(r.layout ?? null);
    } catch (err) { this.error.set(errorMessage(err, 'تعذر التحميل')); }
  }
  async openEditById(id: string) { try { await this.openEdit(await firstValueFrom(this.http.get<P>(`/api/v1/equipment/${encodeURIComponent(id)}`))); } catch (err) { this.error.set(errorMessage(err, 'تعذر الفتح')); } }
  async openEdit(p: P | null) {
    this.error.set('');
    try {
      const o = await firstValueFrom(this.http.get<P>('/api/v1/equipment/form-options'));
      const s = (v: unknown) => (v == null ? '' : String(v));
      const typeId = p ? (o.departments.find((d: P) => d.id === (p.departmentId || p.categoryId)) || o.departments.find((d: P) => d.name === p.licenseCategory) || { id: '' }).id : this.dept() && this.dept() !== '__none__' ? this.dept() : '';
      this.e = { id: p ? p.id : '', rev: p ? p.rev : 0, Code: (p && p.code) || o.nextCode, type: typeId, carType: s(p && (p.typeLabel || p.brand || p.typeName)), status: p ? p.status || 'working' : '', ownership: p ? p.ownership || 'owned' : '',
        VehicleNumber: s(p?.vehicleNumber), Color: s(p?.color), Motor: s(p?.motorNumber), Chassis: s(p?.chassisNumber), InsNo: s(p?.insuranceNumber), insuranceStatus: s(p?.insuranceStatus), Model: s(p?.model),
        driverId: p ? p.driverId || (o.drivers.find((x: P) => p.driverName && String(x.name).trim() === String(p.driverName).trim()) || { id: '' }).id : '', purchasePrice: p ? String(Math.round((Number(p.purchasePrice) || 0) * 100) / 100) : '0',
        Inspection: s(p?.inspectionDate), LicIssue: s(p?.licenseIssueDate), VehLicExp: s(p && (p.vehicleLicenseExpiry || p.licenseExpiry)), PurchaseDate: s(p?.purchaseDate), LastMaint: s(p?.lastMaintenance), NextMaint: s(p?.nextMaintenance),
        notes: s(p?.notes), extraFields: Array.isArray(p?.extraFields) ? p.extraFields : [] };
      this.fo = modalForm('equipment', EQ_FIELDS, effectiveLayout('equipment', this.layoutDocs()));
      this.opts.set(o); this.modal.set(true);
    } catch (err) { this.error.set(errorMessage(err, 'تعذر فتح النافذة')); }
  }
  close() { this.modal.set(false); this.error.set(''); }
  async save(confirmDuplicates = false) {
    const e = this.e;
    if (e.LastMaint && e.NextMaint && e.NextMaint < e.LastMaint) { this.toast.show('موعد الصيانة القادمة لا يمكن أن يكون قبل تاريخ آخر صيانة'); return; }
    const body: P = { code: e.Code, type: e.type, carType: e.carType, status: e.status, ownership: e.ownership, vehicleNumber: e.VehicleNumber, color: e.Color, motorNumber: e.Motor, chassisNumber: e.Chassis, insuranceNumber: e.InsNo,
      insuranceStatus: e.insuranceStatus, model: e.Model, driverId: e.driverId, purchasePrice: String(e.purchasePrice ?? ''), inspectionDate: e.Inspection, licenseIssueDate: e.LicIssue, vehicleLicenseExpiry: e.VehLicExp,
      purchaseDate: e.PurchaseDate, lastMaintenance: e.LastMaint, nextMaintenance: e.NextMaint, notes: e.notes, extraFields: e.extraFields };
    if (confirmDuplicates) body.confirmDuplicates = true;
    this.saving.set(true); this.error.set('');
    try {
      if (e.id) await firstValueFrom(this.http.patch(`/api/v1/equipment/${encodeURIComponent(e.id)}`, { ...body, rev: e.rev }));
      else await firstValueFrom(this.http.post('/api/v1/equipment', body, { headers: new HttpHeaders({ 'Idempotency-Key': `eq-${crypto.randomUUID()}` }) }));
      this.modal.set(false); this.toast.show(e.id ? 'تم التعديل' : 'تمت الإضافة'); await this.load();
    } catch (err) {
      const code = errorCode(err);
      if (code === 'DUPLICATE' || code === 'DUPLICATE_SOFT') { const b = (err as { error: P }).error; this.dup.set({ hard: code === 'DUPLICATE', title: b.title, message: b.message }); }
      else { const m = errorMessage(err, 'تعذّر الحفظ'); this.toast.show(m); this.error.set(m); }
    } finally { this.saving.set(false); }
  }

  // ---------------- اليوميات
  openGrid() { const now = new Date(); if (!this.year) { this.year = now.getFullYear(); this.month = now.getMonth() + 1; } this.view.set('daily'); void this.loadGrid(); }
  async loadGrid(debounce = false) {
    clearTimeout(this.qTimer);
    if (debounce) { this.qTimer = setTimeout(() => void this.loadGrid(), 220); return; }
    const mm = String(this.month).padStart(2, '0'), last = new Date(this.year, this.month, 0).getDate();
    let params = new HttpParams().set('from', `${this.year}-${mm}-01`).set('to', `${this.year}-${mm}-${String(last).padStart(2, '0')}`);
    if (this.gq) params = params.set('q', this.gq); if (this.gstatus) params = params.set('status', this.gstatus);
    try { this.grid.set(await firstValueFrom(this.http.get<P>('/api/v1/equipment/daily', { params }))); } catch (err) { this.error.set(errorMessage(err, 'تعذر التحميل')); }
  }
  logOf(r: P, day: number) { const date = `${this.year}-${String(this.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`; return (r.logs as P[]).find((l) => l.date === date) || null; }
  async openDailyById(id: string) { try { await this.openDaily(await firstValueFrom(this.http.get<P>(`/api/v1/equipment/daily/${encodeURIComponent(id)}`))); } catch (err) { this.error.set(errorMessage(err, 'تعذر الفتح')); } }
  /** openEquipmentDailyModal: المعدة والتاريخ من الخلية، ويوم واحد، وتشغيل، ويومية المعدة وتكلفة الساعة (fillFromEq)، وسعر اللتر الافتراضي */
  async openDaily(x: P | null, eqId = '', day = 0) {
    this.error.set('');
    try {
      const o = await firstValueFrom(this.http.get<P>('/api/v1/equipment/form-options'));
      const s = (v: unknown) => (v == null ? '' : String(v));
      const date = x ? x.date : day ? `${this.year}-${String(this.month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : o.today;
      this.d = x ? { id: x.id, rev: x.rev, equipmentId: x.equipmentId, date, project: s(x.project), kind: x.kind || 'work', days: x.days != null ? Number(x.days) : 1, dailyCost: Math.round((Number(x.dailyCost) || 0) * 100) / 100,
        hours: Number(x.hours) || 0, hourlyCost: Math.round((Number(x.hourlyCost) || 0) * 100) / 100, fuelLiters: Number(x.fuelLiters) || 0, fuelPrice: Math.round((Number(x.fuelPrice) || 0) * 100) / 100,
        extraCost: Math.round((Number(x.extraCost) || 0) * 100) / 100, moveCost: x.moveCost ?? '', productivity: s(x.productivity), notes: s(x.notes) }
        : { id: '', equipmentId: eqId, date, project: '', kind: 'work', days: 1, dailyCost: 0, hours: 0, hourlyCost: 0, fuelLiters: 0, fuelPrice: o.defaultFuelPrice || 0, extraCost: 0, moveCost: '', productivity: '', notes: '' };
      this.opts.set(o);
      if (!x) this.fillFromEq();
      this.dmodal.set(true);
    } catch (err) { this.error.set(errorMessage(err, 'تعذر فتح النافذة')); }
  }
  fillFromEq() { const eq = (this.opts()?.equipment || []).find((x: P) => x.id === this.d.equipmentId); if (!eq) return; if (!this.d.id || !Number(this.d.hourlyCost)) this.d.hourlyCost = eq.hourlyCost; if (!this.d.id || !Number(this.d.dailyCost)) this.d.dailyCost = eq.dailyCost; }
  /** المعاينة بالحساب الجديد (DEC-0140) — نفس اختيار السيرفر: الأيام × اليومية، أو الساعات × الساعة، أو التقديرات؛ التوقف بنسبته؛ النقل بتكلفته؛ + الوقود + التكلفة الإضافية */
  previewCost() {
    const d = this.d, n = (v: unknown) => Number(v) || 0, r2 = (v: number) => Math.round(v * 100) / 100;
    const days = Math.max(0, n(d.days)), hours = Math.max(0, n(d.hours)), daily = r2(n(d.dailyCost)), hourly = r2(n(d.hourlyCost));
    let base = 0;
    if (d.kind === 'move') base = n(d.moveCost);
    else { base = days > 0 && daily > 0 ? days * daily : hours > 0 && hourly > 0 ? hours * hourly : days > 0 && hourly > 0 ? days * 8 * hourly : hours > 0 && daily > 0 ? (hours / 8) * daily : 0; if (d.kind === 'idle') base = (base * (this.opts()?.idlePercent ?? 50)) / 100; }
    const fuel = n(d.fuelLiters) > 0 && r2(n(d.fuelPrice)) > 0 ? n(d.fuelLiters) * r2(n(d.fuelPrice)) : 0;
    return Number((base + fuel + r2(n(d.extraCost))).toFixed(6));
  }
  async saveDaily() {
    const d = this.d;
    if (!d.equipmentId) { this.toast.show('اختر المعدة'); return; }
    if (!d.date) { this.toast.show('حدد التاريخ'); return; }
    if (!String(d.project || '').trim()) { this.toast.show('اختر المشروع'); return; }
    const body: P = { equipmentId: d.equipmentId, date: d.date, project: d.project, kind: d.kind, days: String(d.days ?? ''), dailyCost: String(d.dailyCost ?? ''), hours: String(d.hours ?? ''), hourlyCost: String(d.hourlyCost ?? ''),
      fuelLiters: String(d.fuelLiters ?? ''), fuelPrice: String(d.fuelPrice ?? ''), extraCost: String(d.extraCost ?? ''), productivity: d.productivity, notes: d.notes, ...(d.kind === 'move' ? { moveCost: String(d.moveCost ?? '') } : {}) };
    this.saving.set(true); this.error.set('');
    try {
      const r: P = d.id ? await firstValueFrom(this.http.patch(`/api/v1/equipment/daily/${encodeURIComponent(d.id)}`, { ...body, rev: d.rev }))
        : await firstValueFrom(this.http.post('/api/v1/equipment/daily', body, { headers: new HttpHeaders({ 'Idempotency-Key': `eqd-${crypto.randomUUID()}` }) }));
      this.dmodal.set(false); this.toast.show(`تم الحفظ — التكلفة ${this.fmtNew(r.cost)}`);
      if (this.view() === 'daily') await this.loadGrid(); else await this.load();
    } catch (err) { const m = errorMessage(err, 'تعذر حفظ اليومية'); this.toast.show(m); this.error.set(m); } finally { this.saving.set(false); }
  }
  async removeDaily(x: { id: string; rev: number }) {
    this.del.set(null);
    try { await firstValueFrom(this.http.delete(`/api/v1/equipment/daily/${encodeURIComponent(x.id)}`, { params: new HttpParams().set('rev', String(x.rev)) })); this.dmodal.set(false); this.toast.show('تم الحذف'); await this.loadGrid(); }
    catch (err) { this.toast.show(errorMessage(err, 'تعذّر الحذف')); }
  }
}
