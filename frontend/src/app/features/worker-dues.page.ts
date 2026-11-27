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
type Mode = 'pay' | 'extras' | 'penalty';
interface Line { item: string; amount: string }
const PAGE_SIZE = 20;
/** خانات نافذة الصرف بترتيبها في الـ DOM (applyFormLayout على 'payments') */
const PAY_FIELDS: ModalField[] = [
  { id: 'type', sels: ['#upType'] }, { id: 'dept', sels: ['#upDept'] }, { id: 'person', sels: ['#upPerson', '#upPerson_text', '#upPersonBox', '#upPersonLab'] },
  { id: 'date', sels: ['#upDate'] }, { id: 'payKind', sels: ['#upPayKind'] },
];
const n2 = (v: unknown) => Math.round((Number(v) || 0) * 100) / 100;
/** fmtNum / fmtMoney (helpers.js): toInt ثم خانتين — وللأرقام بالحساب الجديد (DEC-0129) لحد 6 خانات */
const fmtNum = (v: unknown) => n2(v).toLocaleString('ar-EG', { maximumFractionDigits: 2 });
const fmtMoney = (v: unknown) => `${fmtNum(v)} ج.م`;
const fmtNew = (v: unknown) => `${(Number(v) || 0).toLocaleString('ar-EG', { maximumFractionDigits: 6 })} ج.م`;
const fmtDate = (v: unknown) => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${Number(m[3])}/${Number(m[2])}/${m[1]}` : v ? String(v) : '—'; };
function fmtDays(n: unknown): string {
  const x = Number(n) || 0; if (!x) return '0';
  const r = Math.round(x * 100) / 100;
  if (Math.abs(r - Math.round(r)) < 0.005) return String(Math.round(r));
  const whole = Math.floor(r), frac = Math.round((r - whole) * 100) / 100;
  const sym = frac === 0.5 ? '½' : frac === 0.25 ? '¼' : frac === 0.75 ? '¾' : '';
  return sym ? (whole === 0 ? sym : `${whole}${sym}`) : String(r);
}
const TYPE_OF_TAB: Record<string, string> = { workers: 'worker', supervisors: 'supervisor', drivers: 'driver', employees: 'employee', equipment: 'equipment' };
const PERSON_LABEL: Record<string, string> = { employee: 'الموظف', supervisor: 'المشرف', worker: 'العامل', driver: 'السائق', equipment: 'المعدة / المركبة' };
const PAGER: Record<string, string> = { workers: 'duesWorkers', supervisors: 'duesSup', drivers: 'duesDrv', employees: 'duesEmp', equipment: 'duesEq' };

/**
 * المستحقات — بنفس شكل الواجهة القديمة (DEC-0093، DEC-0137): renderWorkerDuesPage وopenUnifiedPayModal (pages-worker-dues.js).
 * لوحات الأنواع ← الأقسام ← الجدول لكل نوع (الكروت، والفترة، والبحث، والصفوف، وسجل الصرف والخصومات) ← نافذة الصرف الموحّدة.
 * الأرقام والحفظ من السيرفر بنفس الدوال القديمة (tests-merge/phase84.js). **المستحق والمتبقي بالحساب الجديد للأيام (DEC-0129)**،
 * و**الصرف فوق المتبقي سلفة بس (DEC-0132)**. وتبويب المعدات بالتكلفة الجديدة (DEC-0140). كشوف الحساب والتصدير من الشاشة الكاملة.
 */
@Component({
  selector: 'app-worker-dues',
  imports: [FormsModule],
  template: `
    @if (!tab()) {
      <div class="page">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <div><h2 class="page-title" style="margin:0;">المستحقات</h2><p class="page-sub" style="margin:4px 0 0;">اختر فئة — الأقسام مرتبطة بصفحات الناس والمعدات</p></div>
          <div class="btn-row"><span class="page-export-bar" style="display:inline-flex;gap:6px;"><a class="btn btn-outline btn-sm" [href]="full">إكسيل</a><a class="btn btn-outline btn-sm" [href]="full">CSV</a></span></div>
        </div>
        <div class="board-grid exp-kind-boards" id="duesKinds">
          @for (b of boards().kinds; track b.id) {
            <button type="button" class="board-card dues-kind-board" [attr.data-dues-tab]="b.id" (click)="tab.set(b.id); dept.set(null)"><div class="board-card-icon">{{ b.icon }}</div><div class="board-card-title">{{ b.label }}</div><div class="board-card-meta"><span>{{ b.count }} سجل</span><span>{{ b.depts }} قسم</span></div></button>
          }
        </div>
      </div>
    } @else if (dept() === null) {
      <div class="page">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <div>
            <button type="button" class="btn btn-outline btn-sm" id="btnDuesBackKinds" (click)="tab.set(''); load()">← كل المستحقات</button>
            <h2 class="page-title" style="margin:10px 0 0;">{{ label() }}</h2>
            <p class="page-sub" style="margin:4px 0 0;">أقسام مرتبطة بصفحة {{ label() }} — اضغط لوحة للعرض</p>
          </div>
        </div>
        <div class="board-grid exp-sec-boards" id="duesDepts">
          @for (d of boards().depts[tab()] || []; track d.id) {
            <button type="button" class="board-card dues-dept-board" [attr.data-dues-dept]="d.id" (click)="enterDept(d.id)"><div class="board-card-icon">{{ d.icon }}</div><div class="board-card-title">{{ d.name }}</div><div class="board-card-meta"><span>{{ d.count }} سجل</span></div></button>
          }
        </div>
      </div>
    } @else {
      <div class="page">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <div>
            <button type="button" class="btn btn-outline btn-sm" id="btnDuesBackDepts" (click)="dept.set(null)">← أقسام {{ label() }}</button>
            <h2 class="page-title" style="margin:10px 0 0;">{{ label() }} — {{ t().deptName }}</h2>
            <p class="page-sub" style="margin:4px 0 0;">حسب الفترة المحددة</p>
          </div>
          <div class="btn-row">
            <span class="page-export-bar" style="display:inline-flex;gap:6px;"><a class="btn btn-outline btn-sm" [href]="full">إكسيل</a><a class="btn btn-outline btn-sm" [href]="full">CSV</a></span>
            <button type="button" class="btn btn-primary" id="btnAddWPay" [disabled]="!canAdd" (click)="openPay('pay', '')">💵 دفع مستحق</button>
            <button type="button" class="btn btn-outline" id="btnAddWExtras" [disabled]="!canAdd" (click)="openPay('extras', '')">بدلات ومكافآت</button>
            <button type="button" class="btn btn-outline" id="btnAddWPen" [disabled]="!canAdd" (click)="openPay('penalty', '')">⚠️ خصم / جزاء</button>
          </div>
        </div>
        <div class="filters-bar">
          <label style="font-size:13px;">من <input type="date" id="duesFrom" class="input" [(ngModel)]="from"></label>
          <label style="font-size:13px;">إلى <input type="date" id="duesTo" class="input" [(ngModel)]="to"></label>
          <button type="button" class="btn btn-outline btn-sm" id="duesApply" (click)="applied.set({ from, to }); reload()">تطبيق</button>
          <input type="search" id="duesWorkerSearch" class="input" placeholder="بحث بالاسم أو الكود..." style="min-width:180px;" [(ngModel)]="q" (ngModelChange)="search()">
        </div>
        @if (error() && !modal()) { <div class="err" role="alert" id="duesError">{{ error() }}</div> }
        @if (t().cards; as c) {
          @if (c.equipment) {
            <div class="stats-row" style="margin-bottom:12px;" id="duesCards"><div class="stat-card"><div class="num">{{ fmtNew(c.due) }}</div><div class="lbl">تكلفة التشغيل</div></div></div>
            @if (c.legacyDue !== +c.due) { <div id="duesDiff" style="margin:-4px 0 12px;font-size:12.5px;color:var(--ink-soft);">التكلفة بالحساب الجديد للمعدات (DEC-0140) — بالحساب القديم: {{ fmtMoney(c.legacyDue) }}</div> }
          } @else {
          <div class="stats-row" style="margin-bottom:12px;" id="duesCards">
            <div class="stat-card"><div class="num">{{ fmtNew(c.due) }}</div><div class="lbl">{{ tab() === 'supervisors' ? 'إجمالي المستحقات' : 'المستحق' }}</div></div>
            <div class="stat-card"><div class="num">{{ fmtMoney(c.paid) }}</div><div class="lbl">المدفوع</div></div>
            <div class="stat-card" [class.debt]="+c.bal > 0"><div class="num">{{ fmtNew(c.bal) }}</div><div class="lbl">المتبقي</div></div>
          </div>
          @if (c.legacyBal !== +c.bal) { <div id="duesDiff" style="margin:-4px 0 12px;font-size:12.5px;color:var(--ink-soft);">المتبقي بالحساب الجديد للأيام (DEC-0129) — بالحساب القديم: {{ fmtMoney(c.legacyBal) }}</div> }
          }
        }
        <div class="table-wrap" [style.overflow]="tab() === 'supervisors' ? 'auto' : null"><table class="data-table" id="duesTable">
          <thead><tr>
            @switch (tab()) {
              @case ('workers') { <th>الكود</th><th>الاسم</th><th>المشرف</th><th>اليومية</th><th>أيام العمل</th><th>غياب</th><th>بدلات ومكافآت</th><th>المستحق</th><th>خصم / جزاء</th><th>المصاريف</th><th>المدفوع</th><th>المتبقي</th><th>حالة</th><th></th> }
              @case ('supervisors') { <th>الكود</th><th>الاسم</th><th>اليومية</th><th>أيام</th><th>بدلات ومكافآت</th><th>مستحق المشرف</th><th>مستحق العمال</th><th>مصاريف</th><th>معدات</th><th>خصم / جزاء</th><th>المدفوع</th><th>المتبقي</th><th>حالة</th><th></th> }
              @case ('drivers') { <th>الكود</th><th>الاسم</th><th>اليومية</th><th>أيام العمل</th><th>غياب</th><th>بدلات ومكافآت</th><th>المستحق</th><th>خصم / جزاء</th><th>المصاريف</th><th>المدفوع</th><th>المتبقي</th><th>حالة</th><th></th> }
              @case ('equipment') { <th>الكود</th><th>الاسم</th><th>المشرف</th><th>تكلفة/س</th><th>أيام التشغيل</th><th>ساعات</th><th>بدلات ومكافآت</th><th>المستحق (تكلفة)</th><th>خصم / جزاء</th><th>المصاريف</th><th>المدفوع</th><th>المتبقي</th><th>حالة</th><th></th> }
              @case ('employees') { <th>الكود</th><th>الاسم</th><th>القسم</th><th>الراتب</th><th>أيام العمل</th><th>غياب</th><th>بدلات ومكافآت</th><th>المستحق</th><th>خصم / جزاء</th><th>المصاريف</th><th>المدفوع</th><th>المتبقي</th><th>حالة</th><th></th> }
            }
          </tr></thead>
          <tbody>
            @for (r of pageRows(); track r.id) {
              <tr [attr.data-id]="r.id">
                <td>{{ r.code }}</td>
                <td><strong>{{ r.name }}</strong> @if (r.paidBadge) { <span class="dues-paid-badge" title="تم سداد المستحقات">✓ تم الدفع</span> }</td>
                @switch (tab()) {
                  @case ('workers') { <td>{{ r.supervisorName }}</td><td>{{ fmtMoney(r.dailyWage) }}</td><td>{{ fmtDays(r.days) }}</td><td>{{ fmtNum(r.absent) }}</td><td>{{ fmtMoney(r.extras) }}</td><td>{{ fmtNew(r.due) }}</td><td>{{ fmtMoney(r.penalty) }}</td><td>{{ fmtMoney(r.expenses) }}</td><td>{{ fmtMoney(r.paid) }}</td> }
                  @case ('supervisors') { <td>{{ fmtMoney(r.dailyWage) }}</td><td>{{ fmtDays(r.days) }}</td><td>{{ fmtMoney(r.extras) }}</td><td>{{ fmtNew(r.due) }}</td><td>{{ fmtNew(r.workersDue) }}</td><td>{{ fmtMoney(r.expenses) }}</td><td>{{ fmtMoney(r.equipCost) }}</td><td>{{ fmtMoney(r.penalty) }}</td><td>{{ fmtMoney(r.paid) }}</td> }
                  @case ('drivers') { <td>{{ fmtMoney(r.dailyWage) }}</td><td>{{ fmtDays(r.days) }}</td><td>0</td><td>{{ fmtMoney(r.extras) }}</td><td>{{ fmtNew(r.due) }}</td><td>{{ fmtMoney(r.penalty) }}</td><td>{{ fmtMoney(r.expenses) }}</td><td>{{ fmtMoney(r.paid) }}</td> }
                  @case ('equipment') { <td>{{ r.supervisorName }}</td><td>{{ fmtMoney(r.hourlyCost) }}</td><td>{{ fmtNum(r.days) }}</td><td>{{ fmtNum(r.hours) }}</td><td>{{ fmtMoney(r.extras) }}</td><td>{{ fmtNew(r.due) }}</td><td>{{ fmtMoney(r.penalty) }}</td><td>{{ fmtMoney(r.expenses) }}</td><td>{{ fmtMoney(r.paid) }}</td> }
                  @case ('employees') { <td>{{ r.departmentName }}</td><td>{{ fmtMoney(r.salary) }}</td><td>{{ fmtDays(r.days) }}</td><td>{{ fmtNum(r.absent) }}</td><td>{{ fmtMoney(r.extras) }}</td><td>{{ fmtNew(r.due) }}</td><td>{{ fmtMoney(r.penalty) }}</td><td>{{ fmtMoney(r.expenses) }}</td><td>{{ fmtMoney(r.paid) }}</td> }
                }
                <td [style.color]="+r.bal > 0 ? 'var(--debt)' : ''"><strong>{{ fmtNew(r.bal) }}</strong></td>
                <td>@if (r.paid > 0 && +r.bal <= 0) { <span class="dues-paid-badge">✓ تم الدفع</span> } @else { — }</td>
                <td style="white-space:nowrap;">
                  <button type="button" class="btn btn-outline btn-sm btn-pay-row" [attr.data-id]="r.id" [disabled]="!canAdd" (click)="openPay('pay', r.id)">💵 دفع مستحق</button>{{ ' ' }}<button type="button" class="btn btn-outline btn-sm btn-pen-row" [attr.data-id]="r.id" [disabled]="!canAdd" (click)="openPay('penalty', r.id)">⚠️ خصم</button>{{ ' ' }}@if (tab() === 'supervisors') {<a class="btn btn-outline btn-sm" [href]="full">🧾 كشف أيام</a>{{ ' ' }}}<a class="btn btn-outline btn-sm" [href]="full">🧾 كشف حساب</a>
                </td>
              </tr>
            } @empty { <tr><td [attr.colspan]="tab() === 'drivers' ? 13 : 14" style="text-align:center;color:var(--ink-soft);padding:24px;">{{ tab() === 'employees' ? 'لا موظفين' : 'لا بيانات' }}</td></tr> }
          </tbody>
        </table></div>
        <div class="btn-row table-pager" [attr.data-pager]="pagerKey()" style="justify-content:space-between;align-items:center;margin-top:10px;flex-wrap:wrap;gap:8px;">
          <span style="font-size:13px;color:var(--ink-soft);">عرض {{ t().rows.length ? (cur() - 1) * 20 + 1 : 0 }}–{{ min(cur() * 20, t().rows.length) }} من {{ t().rows.length }} <span style="opacity:.75;">(20 صف لكل صفحة)</span></span>
          <div style="display:flex;gap:8px;align-items:center;"><button type="button" class="btn btn-outline btn-sm" [disabled]="cur() <= 1" (click)="page.set(cur() - 1)">السابق</button><span style="font-size:13px;font-weight:700;">صفحة {{ cur() }} / {{ pages() }}</span><button type="button" class="btn btn-outline btn-sm" [disabled]="cur() >= pages()" (click)="page.set(cur() + 1)">التالي</button></div>
        </div>

        <div class="section-title" style="margin-top:28px;">سجل الصرف والخصومات <span style="font-weight:600;font-size:13px;color:var(--ink-soft);"> — حسب الفترة والبحث</span></div>
        <div class="stats-row" style="margin-bottom:10px;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;" id="duesLogCards">
          <div class="stat-card"><div class="num">{{ t().log.totals.count }}</div><div class="lbl">عدد السجلات</div></div>
          <div class="stat-card"><div class="num">{{ fmtMoney(t().log.totals.pay) }}</div><div class="lbl">إجمالي الصرف</div></div>
          <div class="stat-card debt"><div class="num">{{ fmtMoney(t().log.totals.penalty) }}</div><div class="lbl">إجمالي الخصم</div></div>
        </div>
        <div class="table-wrap"><table class="data-table" id="duesLog">
          <thead><tr><th>التاريخ</th><th>الاسم</th><th>نوع المستحق</th><th>البند</th><th>الراتب</th><th>بدلات ومكافآت</th><th>المستحق</th><th>النطاق</th><th>ملاحظات</th><th></th></tr></thead>
          <tbody>
            @for (p of logRows(); track p.src + p.id) {
              <tr [attr.data-id]="p.id">
                <td>{{ fmtDate(p.date) }}</td><td><strong>{{ p.name || '—' }}</strong></td>
                <td><span [style.color]="p.tone === 'pen' ? 'var(--debt,#c1121f)' : p.tone === 'bonus' ? '#0077b6' : '#1B4332'" style="font-weight:700;">{{ p.typeLabel }}</span>@if (p.isAdvance) { <span class="badge badge-warn" style="margin-inline-start:6px;">سلفة</span> }</td>
                <td>{{ p.item }}</td><td>{{ p.salary ? fmtMoney(p.salary) : '—' }}</td><td>{{ p.extras ? fmtMoney(p.extras) : '—' }}</td><td><strong>{{ fmtMoney(p.amount) }}</strong></td><td>{{ p.scope }}</td><td>{{ p.notes }}</td>
                <td><button type="button" class="btn btn-outline btn-sm btn-del-pay" [attr.data-id]="p.id" [attr.data-src]="p.src" [disabled]="!canDelete" (click)="del.set(p)">🗑️</button></td>
              </tr>
            } @empty { <tr><td colspan="10" style="text-align:center;color:var(--ink-soft);padding:20px;">لا صرف أو خصم في الفترة</td></tr> }
          </tbody>
        </table></div>
        <div class="btn-row table-pager" [attr.data-pager]="'duesPays_' + tab()" style="justify-content:space-between;align-items:center;margin-top:10px;flex-wrap:wrap;gap:8px;">
          <span style="font-size:13px;color:var(--ink-soft);">عرض {{ t().log.rows.length ? (logCur() - 1) * 20 + 1 : 0 }}–{{ min(logCur() * 20, t().log.rows.length) }} من {{ t().log.rows.length }} <span style="opacity:.75;">(20 صف لكل صفحة)</span></span>
          <div style="display:flex;gap:8px;align-items:center;"><button type="button" class="btn btn-outline btn-sm" [disabled]="logCur() <= 1" (click)="logPage.set(logCur() - 1)">السابق</button><span style="font-size:13px;font-weight:700;">صفحة {{ logCur() }} / {{ logPages() }}</span><button type="button" class="btn btn-outline btn-sm" [disabled]="logCur() >= logPages()" (click)="logPage.set(logCur() + 1)">التالي</button></div>
        </div>
      </div>
    }

    @if (modal() && opts(); as o) {
      <div class="modal-overlay" id="appModal" (click)="$event.target === $event.currentTarget && close()">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header"><h3>{{ mode === 'penalty' ? 'خصم / جزاء' : mode === 'extras' ? 'بدلات ومكافآت' : 'دفع مستحق' }}</h3><button type="button" class="modal-close" (click)="close()">×</button></div>
          <div class="modal-body">
            <div class="form-grid form-grid-2">
              <label [style.order]="fo.order['type']" [style.display]="fo.hide['type'] ? 'none' : null">{{ fo.label['type'] || 'النوع *' }}<select class="input" id="upType" [(ngModel)]="f.type" (ngModelChange)="f.dept = ''; f.person = ''; onPerson()"><option value="employee">موظف</option><option value="supervisor">مشرف</option><option value="worker">عامل</option><option value="driver">سائق</option><option value="equipment">معدة / مركبة</option></select></label>
              <label [style.order]="fo.order['dept']" [style.display]="fo.hide['dept'] ? 'none' : null">{{ fo.label['dept'] || 'القسم' }}<select class="input" id="upDept" [(ngModel)]="f.dept"><option value="">— كل الأقسام —</option>@for (d of o.departments[f.type] || []; track d.id) { <option [value]="d.id">{{ d.name }}</option> }</select></label>
              <label id="upPersonLab" [style.order]="fo.order['person']" [style.display]="fo.hide['person'] ? 'none' : null">{{ fo.label['person'] || personLabel() + ' *' }}
                <select class="input" id="upPerson" [(ngModel)]="f.person" (ngModelChange)="onPerson()"><option value="">اكتب الاسم أو الكود...</option>@for (x of peopleOf(o); track x.id) { <option [value]="x.id">{{ (x.code ? x.code + ' — ' : '') + x.name }}</option> }</select>
              </label>
              <label [style.order]="fo.order['date']" [style.display]="fo.hide['date'] ? 'none' : null">{{ fo.label['date'] || 'التاريخ' }}<input class="input" id="upDate" type="date" [(ngModel)]="f.date"></label>
              @if (person(); as pp) { <label id="upPersonDeptHintLab" style="grid-column:1/-1;" [style.order]="fo.order['date'] ?? 3"><span style="font-size:12.5px;color:var(--ink-soft);">القسم التابع له الشخص: <strong id="upPersonDeptHint">{{ pp.departmentName || 'بدون قسم' }}</strong></span></label> }
              @if (mode === 'pay') {
                <label [style.order]="fo.order['payKind']" [style.display]="fo.hide['payKind'] ? 'none' : null">{{ fo.label['payKind'] || 'نوع المستحق *' }}<select class="input" id="upPayKind" [(ngModel)]="f.payKind" (ngModelChange)="kindTouched = true; onKind()"><option value="salary">الراتب</option><option value="extras">بدلات ومكافآت</option><option value="daily">اليومية</option></select></label>
              }
              @if (mode === 'pay' && f.type === 'supervisor') {
                <div id="upScopeWrap" style="order:99;"><label>نطاق الصرف (للمشرف) *<select class="input" id="upScope" [(ngModel)]="f.scope"><option value="self">للمشرف فقط</option><option value="workers">توزيع على عمال المشرف</option><option value="close_account">إقفال حساب المشرف (كامل)</option></select></label>
                  <p id="upScopeHint" style="font-size:12.5px;color:var(--ink-soft);margin:6px 0 0;">{{ scopeHint() }}</p></div>
              }
            </div>
            @if (mode === 'penalty') {
              <div class="section-title" style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;"><span>بنود الخصم / الجزاء</span>
                <div style="display:flex;gap:6px;"><button type="button" class="btn btn-outline btn-sm" id="btnUpAddLine" (click)="lines.push({ item: '', amount: '' })">+ بند</button><button type="button" class="btn btn-outline btn-sm" id="btnUpManageItems" (click)="openItems('penaltyItemPool')">إدارة البنود</button></div></div>
              <div id="upLines">@for (l of lines; track $index) {
                <div class="form-grid form-grid-2 up-line" style="margin-bottom:8px;align-items:end;"><label>نوع الخصم<input class="input up-item" list="upItemList" [(ngModel)]="l.item" placeholder="اكتب أو اختر..."></label>
                  <label>المبلغ<div style="display:flex;gap:6px;"><input class="input up-amt" type="number" min="0" step="0.01" [(ngModel)]="l.amount"><button type="button" class="btn btn-outline btn-sm up-del-line" title="حذف" (click)="delLine(lines, $index)">🗑️</button></div></label></div> }</div>
            } @else {
              @if (mode === 'pay' && f.payKind === 'salary') {
                <div id="upSalaryBlock" style="margin-top:14px;"><label>مبلغ الصرف (المتبقي) *<input class="input" id="upSalary" type="number" min="0" step="0.01" placeholder="المبلغ المراد دفعه من المتبقي" [(ngModel)]="f.salary" (ngModelChange)="capSalary()"></label>
                  <p id="upSalaryCapHint" style="font-size:12.5px;color:var(--ink-soft);margin:6px 0 0;">{{ salaryHint() }}</p></div>
              }
              @if (mode === 'pay' && f.payKind === 'extras') {
                <div id="upExtrasPayBlock" style="margin-top:14px;"><div class="section-title">بدلات ومكافآت مستحقة غير مدفوعة</div>
                  <p style="font-size:12.5px;color:var(--ink-soft);margin:0 0 8px;">اختر البنود المطابقة لما سُجّل للشخص — الدفع يُحسب في عمود المدفوع فقط</p>
                  <div id="upUnpaidBonuses" style="max-height:240px;overflow:auto;border:1px solid var(--border,#ddd);border-radius:8px;padding:8px;">
                    @if (!f.person) { <p style="margin:0;color:var(--ink-soft);font-size:13px;">اختر الشخص أولاً لعرض الإضافات المستحقة</p> }
                    @else if (!(person()?.unpaidBonuses || []).length) { <p style="margin:0;color:#c1121f;font-size:13px;">لا توجد إضافات/مكافآت مستحقة غير مدفوعة لهذا الشخص — سجّلها أولاً من زر «بدلات ومكافآت»</p> }
                    @else { @for (b of person().unpaidBonuses; track b.id) { <label style="display:flex;align-items:center;gap:10px;padding:8px 6px;border-bottom:1px solid var(--border,#eee);cursor:pointer;"><input type="checkbox" class="up-bonus-chk" [attr.data-bonus-id]="b.id" [checked]="bonus[b.id]" (change)="bonus[b.id] = !bonus[b.id]"><span style="flex:1;"><strong>{{ b.item }}</strong> · {{ fmtMoney(b.amount) }} <span style="color:var(--ink-soft);font-size:12px;">({{ fmtDate(b.date) }})</span></span></label> } }
                  </div></div>
              }
              @if (mode === 'extras' || (mode === 'pay' && f.payKind === 'daily')) {
                <div [id]="mode === 'extras' ? 'upExtrasBlock' : 'upDailyBlock'" style="margin-top:14px;">
                  <div class="section-title" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;"><span>{{ mode === 'extras' ? 'بنود الإضافات والمكافآت (تسجيل مستحق)' : 'بنود اليوميات' }}</span>
                    <div style="display:flex;gap:6px;"><button type="button" class="btn btn-outline btn-sm" [id]="mode === 'extras' ? 'btnUpAddLine' : 'btnUpAddLineDaily'" (click)="lines.push({ item: '', amount: '' })">+ بند</button><button type="button" class="btn btn-outline btn-sm" [id]="mode === 'extras' ? 'btnUpManageItems' : 'btnUpManageItemsDaily'" (click)="openItems(mode === 'extras' ? 'paymentItemPool' : 'dailyPayItemPool')">إدارة البنود</button></div></div>
                  <div [id]="mode === 'extras' ? 'upLines' : 'upDailyLines'">@for (l of lines; track $index) {
                    <div class="form-grid form-grid-2 up-line" style="margin-bottom:8px;align-items:end;"><label>{{ mode === 'extras' ? 'بند الإضافة / المكافأة' : 'بند اليومية' }}<input class="input up-item" list="upItemList" [(ngModel)]="l.item" placeholder="اكتب أو اختر..."></label>
                      <label>المبلغ<div style="display:flex;gap:6px;"><input class="input up-amt" type="number" min="0" step="0.01" [(ngModel)]="l.amount"><button type="button" class="btn btn-outline btn-sm up-del-line" title="حذف" (click)="delLine(lines, $index)">🗑️</button></div></label></div> }</div>
                </div>
              }
            }
            <datalist id="upItemList">@for (x of poolItems(o); track x) { <option [value]="x"></option> }</datalist>
            <div style="text-align:left;margin-top:8px;font-weight:800;">الإجمالي: <span id="upTotal">{{ fmtMoney(total()) }}</span> ج.م</div>
            <label style="display:block;margin-top:12px;">ملاحظات<textarea class="input" id="upNotes" rows="4" placeholder="اختياري" [(ngModel)]="f.notes"></textarea></label>
            @if (error()) { <div class="err" role="alert" id="upError">{{ error() }}</div> }
          </div>
          <div class="modal-footer"><button type="button" class="btn btn-outline" (click)="close()">إلغاء</button><button type="button" class="btn btn-primary" id="btnSaveUp" [disabled]="saving()" (click)="save(false)">حفظ</button></div>
        </div>
      </div>
    }
    @if (advanceAsk(); as a) {
      <!-- DEC-0132: الصرف فوق المتبقي = سلفة -->
      <div class="modal-overlay" id="appConfirmModal" style="z-index:500000;">
        <div class="modal app-confirm-modal">
          <div class="modal-header app-confirm-head"><span class="confirm-icon" aria-hidden="true">💵</span><h3 style="margin:0;flex:1;">صرف فوق المتبقي</h3></div>
          <div class="modal-body" id="advanceMsg">{{ a }}<br>تسجّله «سلفة»؟ هيتسجّل باسمك، والزيادة هتتخصم من المستحقات الجاية.</div>
          <div class="modal-footer"><button type="button" class="btn btn-primary" id="btnConfirmAdvance" (click)="advanceAsk.set(null); save(true)">تسجيل كسلفة</button><button type="button" class="btn btn-outline" (click)="advanceAsk.set(null)">إلغاء</button></div>
        </div>
      </div>
    }
    @if (items(); as it) {
      <div class="modal-overlay" id="appSubModal" style="z-index:400000;" (click)="$event.target === $event.currentTarget && items.set(null)">
        <div class="modal" role="dialog"><div class="modal-header"><h3>إدارة البنود</h3><button type="button" class="modal-close" (click)="items.set(null)">×</button></div>
          <div class="modal-body">
            @for (x of it.list; track x) { <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--line);"><span>{{ x }}</span><button type="button" class="btn btn-outline btn-sm btn-del-pitem" (click)="saveItems(it.pool, [], [x])">🗑️</button></div> }
            <div style="display:flex;gap:6px;margin-top:10px;"><input class="input" id="pitemNew" placeholder="بند جديد" [(ngModel)]="newItem"><button type="button" class="btn btn-primary btn-sm" (click)="saveItems(it.pool, [newItem], [])">إضافة</button></div>
          </div>
          <div class="modal-footer"><button type="button" class="btn btn-outline" (click)="items.set(null)">إغلاق</button></div>
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
export class WorkerDuesPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly toast = new LegacyToast();
  readonly full = legacyUrl('workerDues');
  readonly canAdd = this.session.can('workerDues', 'add');
  readonly canDelete = this.session.can('workerDues', 'delete');
  readonly tab = signal('');
  readonly dept = signal<string | null>(null);
  readonly boards = signal<{ kinds: P[]; depts: Record<string, P[]> }>({ kinds: [], depts: {} });
  readonly t = signal<P>({ rows: [], cards: null, deptName: '', log: { totals: { count: 0, pay: 0, penalty: 0 }, rows: [] } });
  readonly applied = signal({ from: '', to: '' });
  readonly error = signal('');
  readonly page = signal(1);
  readonly logPage = signal(1);
  readonly modal = signal(false);
  readonly saving = signal(false);
  readonly opts = signal<P | null>(null);
  readonly person = signal<P | null>(null);
  readonly sup = signal<P | null>(null);
  readonly advanceAsk = signal<string | null>(null);
  readonly items = signal<{ pool: string; list: string[] } | null>(null);
  readonly del = signal<P | null>(null);
  readonly label = computed(() => (this.boards().kinds.find((b) => b.id === this.tab()) || { label: this.tab() }).label);
  readonly pagerKey = computed(() => PAGER[this.tab()] || 'duesWorkers');
  readonly pages = computed(() => Math.max(1, Math.ceil(this.t().rows.length / PAGE_SIZE)));
  readonly cur = computed(() => Math.min(this.page(), this.pages()));
  readonly pageRows = computed(() => this.t().rows.slice((this.cur() - 1) * PAGE_SIZE, this.cur() * PAGE_SIZE));
  readonly logPages = computed(() => Math.max(1, Math.ceil(this.t().log.rows.length / PAGE_SIZE)));
  readonly logCur = computed(() => Math.min(this.logPage(), this.logPages()));
  readonly logRows = computed(() => this.t().log.rows.slice((this.logCur() - 1) * PAGE_SIZE, this.logCur() * PAGE_SIZE));
  from = ''; to = ''; q = ''; newItem = '';
  mode: Mode = 'pay';
  f: P = {};
  fo: ModalForm = modalForm('payments', PAY_FIELDS, []);
  lines: Line[] = [];
  bonus: Record<string, boolean> = {};
  kindTouched = false;
  private qTimer?: ReturnType<typeof setTimeout>;
  fmtNum = fmtNum; fmtMoney = fmtMoney; fmtNew = fmtNew; fmtDate = fmtDate; fmtDays = fmtDays; min = Math.min;

  ngOnInit() { void this.load(); }
  async load() { try { this.boards.set(await firstValueFrom(this.http.get<P>('/api/v1/dues/boards'))); } catch (err) { this.error.set(errorMessage(err, 'تعذر التحميل')); } }
  enterDept(id: string) { this.dept.set(id); void this.reload(); }
  search() { clearTimeout(this.qTimer); this.qTimer = setTimeout(() => void this.reload(), 350); }
  async reload() {
    this.error.set('');
    try {
      let params = new HttpParams().set('tab', this.tab()).set('dept', this.dept() ?? '');
      const a = this.applied();
      if (a.from) params = params.set('from', a.from); if (a.to) params = params.set('to', a.to); if (this.q.trim()) params = params.set('q', this.q.trim());
      this.t.set(await firstValueFrom(this.http.get<P>('/api/v1/dues/table', { params })));
      this.page.set(1); this.logPage.set(1);
    } catch (err) { this.error.set(errorMessage(err, 'تعذر التحميل')); }
  }

  // ---------------- نافذة الصرف (openUnifiedPayModal)
  personLabel() { return PERSON_LABEL[this.f['type']] || 'الشخص'; }
  peopleOf(o: P) { const list = (o.people[this.f['type']] || []) as P[]; return this.f['dept'] ? list.filter((x) => x.departmentId === this.f['dept'] || x.id === this.f['person']) : list; }
  poolItems(o: P) { return o.pools[this.mode === 'penalty' ? 'penaltyItemPool' : this.f['payKind'] === 'daily' && this.mode === 'pay' ? 'dailyPayItemPool' : 'paymentItemPool'] || []; }
  async openPay(mode: Mode, personId: string) {
    this.error.set(''); this.mode = mode; this.kindTouched = false; this.bonus = {};
    const type = TYPE_OF_TAB[this.tab()] || 'worker';
    this.f = { type, dept: '', person: personId, date: '', payKind: mode === 'pay' ? (type === 'employee' || type === 'equipment' ? 'salary' : 'daily') : '', scope: 'self', salary: '', notes: '' };
    this.lines = mode === 'extras' ? [{ item: 'مكافأة', amount: '' }] : mode === 'penalty' ? [{ item: '', amount: '' }] : [];
    try {
      const o = await firstValueFrom(this.http.get<P>('/api/v1/dues/pay-options', { params: new HttpParams().set('kind', type) }));
      this.opts.set(o); this.f['date'] = o.today;
      this.fo = modalForm('payments', PAY_FIELDS, effectiveLayout('payments', o.layout || null));
      this.modal.set(true); await this.onPerson(); this.onKind();
    } catch (err) { this.error.set(errorMessage(err, 'تعذر فتح النافذة')); }
  }
  /** fillPeople / updatePersonDeptHint / fillSalaryCap / renderUnpaidBonuses / updateScopeHint */
  async onPerson() {
    const type = this.f['type'];
    if (this.mode === 'pay' && !this.kindTouched) this.f['payKind'] = type === 'employee' || type === 'equipment' ? 'salary' : 'daily';
    if (!this.f['person']) { this.person.set(null); this.sup.set(null); return; }
    try {
      const o = await firstValueFrom(this.http.get<P>('/api/v1/dues/pay-options', { params: new HttpParams().set('kind', type).set('id', this.f['person']) }));
      this.person.set(o.person); this.sup.set(o.supervisor || null);
      if (o.person.departmentId && !this.f['dept']) this.f['dept'] = o.person.departmentId;
      this.bonus = Object.fromEntries((o.person.unpaidBonuses || []).map((b: P) => [b.id, true]));
      this.onKind();
    } catch { this.person.set(null); }
  }
  onKind() {
    if (this.mode === 'pay' && this.f['payKind'] === 'daily' && !this.lines.length) this.lines = [{ item: 'دفع يوميات', amount: '' }];
    if (this.mode === 'pay' && this.f['payKind'] === 'salary') { const p = this.person(); if (p && p.salary > 0 && !(Number(this.f['salary']) > 0)) this.f['salary'] = String(p.salaryRemaining); }
  }
  salaryHint() {
    const p = this.person();
    if (p && p.salary > 0) return `الراتب المسجّل: ${fmtMoney(p.salary)} (ثابت) · المتبقي للدفع: ${fmtMoney(p.salaryRemaining)} — الصرف يسجّل كمدفوع فقط ولا يغيّر الراتب`;
    return p ? 'لا يوجد راتب مسجّل — أدخل مبلغ الصرف بحذر (يُحسب مدفوعاً فقط)' : 'الراتب المسجّل لا يتغيّر — تدفع المتبقي بعد الخصومات والمصاريف';
  }
  capSalary() { const p = this.person(); if (p && p.salary > 0 && n2(this.f['salary']) > p.salary) { this.f['salary'] = String(p.salary); this.toast.show(`الحد الأقصى للراتب: ${fmtMoney(p.salary)}`); } }
  scopeHint() {
    const st = this.sup(); if (!st) return '';
    const s = this.f['scope'];
    if (s === 'self') return `مستحق المشرف: ${fmtNew(st.ownDue)} — متبقي: ${fmtNew(st.ownBal)}`;
    if (s === 'workers') return `مستحق العمال: ${fmtNew(st.workersDue)} — متبقي: ${fmtNew(st.workersBal)}`;
    return `إجمالي المستحق ${fmtNew(st.totalDue)} − جزاءات ${fmtMoney(st.totalPenalty)} − مصاريف ${fmtMoney(st.totalExpenses)} − مدفوع ${fmtMoney(st.totalPaid)} = المتبقي ${fmtNew(st.totalBal)}`;
  }
  total() {
    if (this.mode === 'pay' && this.f['payKind'] === 'salary') return n2(this.f['salary']);
    if (this.mode === 'pay' && this.f['payKind'] === 'extras') return (this.person()?.unpaidBonuses || []).filter((b: P) => this.bonus[b.id]).reduce((s: number, b: P) => s + n2(b.amount), 0);
    return this.lines.reduce((s, l) => s + n2(l.amount), 0);
  }
  delLine(list: Line[], i: number) { if (list.length > 1) list.splice(i, 1); else { list[0].item = ''; list[0].amount = ''; } }
  close() { this.modal.set(false); this.error.set(''); this.person.set(null); this.sup.set(null); }
  async save(advance: boolean) {
    if (!this.f['person']) { this.toast.show('اختر الشخص'); return; }
    const body: P = { mode: this.mode, personType: this.f['type'], personId: this.f['person'], date: this.f['date'], notes: this.f['notes'] };
    if (this.mode === 'pay') { body['payKind'] = this.f['payKind']; if (this.f['type'] === 'supervisor') body['scope'] = this.f['scope']; }
    if (this.mode === 'pay' && this.f['payKind'] === 'salary') body['salary'] = String(this.f['salary'] ?? '');
    else if (this.mode === 'pay' && this.f['payKind'] === 'extras') body['bonusIds'] = Object.keys(this.bonus).filter((k) => this.bonus[k]);
    else body['lines'] = this.lines.map((l) => ({ item: l.item, amount: String(l.amount ?? '') }));
    if (advance) body['advance'] = true;
    this.saving.set(true); this.error.set('');
    try {
      const r = await firstValueFrom(this.http.post<P>('/api/v1/dues/pay', body, { headers: new HttpHeaders({ 'Idempotency-Key': `dues-${crypto.randomUUID()}` }) }));
      this.close();
      this.toast.show(this.mode === 'extras' ? `تم تسجيل الإضافة على المستحق — ${fmtMoney(r.total)}` : `تم الحفظ — الإجمالي ${fmtMoney(r.total)}${r.advance ? ' (سلفة)' : ''}`);
      await this.reload();
    } catch (err: P) {
      const code = err?.error?.code;
      const m = errorMessage(err, 'تعذّر الحفظ');
      if (code === 'OVER_BALANCE' && !advance && this.f['scope'] !== 'workers') { this.advanceAsk.set(m); return; }
      this.toast.show(m); this.error.set(m);
    } finally { this.saving.set(false); }
  }
  openItems(pool: string) { const o = this.opts(); if (o) this.items.set({ pool, list: (o.pools[pool] || []).slice() }); this.newItem = ''; }
  async saveItems(pool: string, add: string[], remove: string[]) {
    const a = add.map((x) => String(x || '').trim()).filter(Boolean); if (!a.length && !remove.length) return;
    try {
      await firstValueFrom(this.http.put('/api/v1/dues/items', { pool, add: a, remove }));
      const o = await firstValueFrom(this.http.get<P>('/api/v1/dues/pay-options', { params: new HttpParams().set('kind', this.f['type'] || 'worker') }));
      this.opts.set(o); this.items.set({ pool, list: (o.pools[pool] || []).slice() }); this.newItem = '';
    } catch (err) { this.toast.show(errorMessage(err, 'تعذّر الحفظ')); }
  }
  async remove(p: P) {
    this.del.set(null);
    try { await firstValueFrom(this.http.delete(`/api/v1/dues/${encodeURIComponent(p.src)}/${encodeURIComponent(p.id)}`, { params: new HttpParams().set('rev', String(p.rev)) })); this.toast.show('تم الحذف'); await this.reload(); }
    catch (err) { this.toast.show(errorMessage(err, 'تعذّر الحذف')); }
  }
}
