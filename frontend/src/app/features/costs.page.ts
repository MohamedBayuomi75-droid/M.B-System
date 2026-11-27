import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { legacyUrl } from '../core/page-routes';
import { errorMessage, SessionService } from '../core/session.service';
import { LegacyToast } from './legacy-toast';

/* eslint-disable @typescript-eslint/no-explicit-any */
type P = any;
interface Line { item: string; amount: string | number }
const PAGE_SIZE = 20;
const EMPTY = { q: '', item: '', project: '', from: '', to: '' };
const KIND_LAB: Record<string, string> = { worker: 'العامل', supervisor: 'المشرف', driver: 'السائق', employee: 'الموظف', equipment: 'المعدة / المركبة' };
const TAB_OF: Record<string, string> = { worker: 'workers', supervisor: 'supervisors', driver: 'drivers', employee: 'employees', equipment: 'equipment' };
const fmtNum = (n: unknown) => (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('ar-EG', { maximumFractionDigits: 2 });
const fmtMoney = (n: unknown) => `${fmtNum(n)} ج.م`;
const fmtNew = (n: unknown) => `${(Number(n) || 0).toLocaleString('ar-EG', { maximumFractionDigits: 6 })} ج.م`;
const fmtDate = (v: unknown) => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${Number(m[3])}/${Number(m[2])}/${m[1]}` : v ? String(v) : '—'; };
const toInt = (v: unknown) => { const x = Number(String(v ?? '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[^\d.-]/g, '')); return Number.isFinite(x) ? Math.round(x * 100) / 100 : 0; };

/**
 * التكاليف — بنفس شكل الواجهة القديمة (DEC-0093، DEC-0142): renderCostsPage وopenCostModal وopenCostItemsManager (pages-costs.js)،
 * و«تكلفة المشاريع الشاملة» (cost-center.js). لوحات الفئات ← الأقسام ← الجدول ← نافذة التكلفة بالسطور والبنود المقترحة؛ والأقسام والبنود.
 * الأرقام والحفظ من السيرفر بنفس الدوال القديمة (tests-merge/phase90.js). **التكلفة الشاملة بالحساب الجديد (TR-10)** والقديم جنبها.
 * التصدير والحقول الإضافية من الشاشة الكاملة.
 */
@Component({
  selector: 'app-costs',
  imports: [FormsModule],
  template: `
    @if (tab() === '__all') {
      <div class="page comp-costs" data-owner="costs">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <div><h2 class="page-title" style="margin:0;">🏗️ التكاليف الشاملة — كل المشاريع</h2>
          <p class="page-sub" style="margin:4px 0 0;">عمالة + معدات + وقود + صيانة + مصروفات + تكاليف + سلف + فواتير موردين + صرف مخازن (بدون حساب مزدوج)</p></div>
          <button type="button" class="btn btn-outline btn-sm" id="compCostsBack" (click)="tab.set(''); loadBoards()">◀ رجوع</button>
        </div>
        <div class="filters-bar" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
          <input class="input" id="ccQ" type="search" placeholder="بحث باسم المشروع…" [(ngModel)]="cc.q" (ngModelChange)="loadComp(true)">
          <label>من <input class="input" type="date" id="ccFrom" [(ngModel)]="cc.from" (ngModelChange)="loadComp()"></label>
          <label>إلى <input class="input" type="date" id="ccTo" [(ngModel)]="cc.to" (ngModelChange)="loadComp()"></label>
          <button type="button" class="btn btn-outline btn-sm" id="ccClear" (click)="cc = { q: '', from: '', to: '' }; loadComp()">مسح</button>
        </div>
        @if (comp(); as c) {
          <div class="stats-row" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:14px;">
            <div class="stat-card"><div class="num">{{ fmtNew(c.totals.new.total) }}</div><div class="lbl">إجمالي التكلفة</div></div>
            <div class="stat-card"><div class="num">{{ fmtNew(+c.totals.new.suppliers + +c.totals.new.warehouse) }}</div><div class="lbl">موردون + مخازن</div></div>
            <div class="stat-card"><div class="num">{{ fmtNew(+c.totals.new.labor + +c.totals.new.equip + +c.totals.new.fuel + +c.totals.new.maint) }}</div><div class="lbl">عمالة ومعدات</div></div>
            <div class="stat-card"><div class="num">{{ fmtMoney(c.totals.new.collected) }}</div><div class="lbl">المحصّل من العملاء</div></div>
            <div class="stat-card" [class.debt]="+c.totals.new.collected - +c.totals.new.total < 0"><div class="num">{{ fmtNew(+c.totals.new.collected - +c.totals.new.total) }}</div><div class="lbl">المحصّل − التكلفة</div></div>
          </div>
          @if (c.totals.legacy.total !== +c.totals.new.total) { <div id="ccDiff" style="margin:-4px 0 12px;font-size:12.5px;color:var(--ink-soft);">الإجمالي بالحساب الجديد (TR-10: المصروف بكل سطوره، والفاتورة بالصافي، والعمالة والمعدات بالحساب الجديد) — بالحساب القديم: {{ fmtMoney(c.totals.legacy.total) }}</div> }
          @if (c.unregistered.length) { <div id="ccUnreg" style="margin:0 0 12px;font-size:12.5px;color:var(--ink-soft);">أسماء مشاريع مش مسجّلة (للمراجعة): {{ c.unregistered.join('، ') }}</div> }
          <div class="table-wrap"><table class="data-table" id="ccTable"><thead><tr><th>المشروع</th>@for (k of c.cols; track k.key) { <th>{{ k.label }}</th> }<th>الإجمالي</th><th>الميزانية</th><th>المحصّل</th><th>المحصّل − التكلفة</th></tr></thead>
            <tbody>
              @for (r of c.rows; track r.name) {
                <tr [class.cc-row]="r.registered" [attr.data-name]="r.name" [style.cursor]="r.registered ? 'pointer' : null">
                  <td><strong>{{ r.name }}</strong>@if (!r.registered) { <div style="font-size:11px;color:var(--ink-soft);">اسم غير مسجّل كمشروع</div> }</td>
                  @for (k of c.cols; track k.key) { <td [title]="+r.new[k.key] !== r.legacy[k.key] ? 'بالحساب القديم: ' + fmtMoney(r.legacy[k.key]) : ''">{{ +r.new[k.key] ? fmtNew(r.new[k.key]) : '—' }}</td> }
                  <td><strong>{{ fmtNew(r.new.total) }}</strong></td>
                  <td>{{ r.new.budget ? fmtMoney(r.new.budget) : '—' }}<div>@switch (r.new.budgetStatus) { @case ('ok') { <span class="badge badge-ok">ضمن الميزانية</span> } @case ('warn') { <span class="badge badge-warn">قارب الميزانية</span> } @case ('over') { <span class="badge badge-danger">تجاوز</span> } @default { <span class="badge badge-muted">بدون ميزانية</span> } }</div></td>
                  <td>{{ fmtMoney(r.collected) }}</td><td [style.color]="+r.net < 0 ? 'var(--danger,#b3261e)' : 'inherit'">{{ fmtNew(r.net) }}</td>
                </tr>
              } @empty { <tr><td [attr.colspan]="c.cols.length + 5" style="text-align:center;padding:24px;color:var(--ink-soft);">لا تكاليف مربوطة بمشاريع</td></tr> }
            </tbody>
            @if (c.rows.length) { <tfoot><tr><th>الإجمالي</th>@for (k of c.cols; track k.key) { <th>{{ fmtNew(c.totals.new[k.key]) }}</th> }<th>{{ fmtNew(c.totals.new.total) }}</th><th></th><th>{{ fmtMoney(c.totals.new.collected) }}</th><th>{{ fmtNew(+c.totals.new.collected - +c.totals.new.total) }}</th></tr></tfoot> }
          </table></div>
          <p style="font-size:12px;color:var(--ink-soft);margin-top:10px;">قواعد الحساب: فاتورة مورد مربوطة بالمخزن تُحسب وقت الصرف للمشروع بتكلفة الصنف (مش وقت الفاتورة) · فاتورة مورد مباشرة على مشروع تُحسب بصافيها بعد المرتجعات · دفعات الموردين تسوية وليست تكلفة.</p>
        }
      </div>
    } @else if (!tab()) {
      <div class="page">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:18px;">
          <div><h2 class="page-title" style="margin:0;">التكاليف</h2><p class="page-sub" style="margin:4px 0 0;">اختر فئة للدخول وإدارة التكاليف والأقسام</p></div>
          <div class="btn-row page-header-actions"><span class="page-export-bar" style="display:inline-flex;flex-wrap:nowrap;gap:6px;align-items:center;"><a class="btn btn-outline btn-sm" [href]="full" title="تصدير إكسيل">إكسيل</a><a class="btn btn-outline btn-sm" [href]="full" title="تصدير CSV">CSV</a></span></div>
        </div>
        <div class="board-grid exp-kind-boards" id="costKinds">
          @if (boards(); as b) {
            <button type="button" class="board-card cost-kind-board" data-cost-tab="__all" (click)="openComp()"><div class="board-card-icon">🏗️</div><div class="board-card-title">تكلفة المشاريع الشاملة</div>
              <div class="board-card-meta"><span>كل المصادر + الموردين + المخازن</span><span class="board-card-amt">{{ fmtNew(b.comprehensive.total) }}</span></div></button>
            @for (t of b.kinds; track t.id) {
              <button type="button" class="board-card cost-kind-board" [attr.data-cost-tab]="t.id" (click)="enterTab(t.id)"><div class="board-card-icon">{{ t.icon }}</div><div class="board-card-title">{{ t.label }}</div>
                <div class="board-card-meta"><span>{{ t.count }} سجل</span><span class="board-card-amt">{{ fmtMoney(t.total) }}</span></div></button>
            }
          }
        </div>
      </div>
    } @else if (section() === null) {
      <div class="page">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <div>
            <button type="button" class="btn btn-outline btn-sm" id="btnCostBackKinds" (click)="tab.set(''); loadBoards()">← كل التكاليف</button>
            <h2 class="page-title" style="margin:10px 0 0;">{{ t()?.label }}</h2>
            <p class="page-sub" style="margin:4px 0 0;">أقسام التكاليف — اضغط لوحة للدخول أو أضف قسماً جديداً</p>
          </div>
          <div class="btn-row page-header-actions">
            <button type="button" class="btn btn-outline btn-sm" id="btnCostAddSec" [disabled]="!canEdit" (click)="secModal.set('add')">إضافة قسم</button>
            <button type="button" class="btn btn-outline btn-sm" id="btnCostRenSec" [disabled]="!canEdit" (click)="openSec('rename')">تعديل قسم</button>
            <button type="button" class="btn btn-outline btn-sm" id="btnCostDelSec" [disabled]="!canDelete" (click)="openSec('delete')">حذف قسم</button>
            <button class="btn btn-primary" id="btnAddCost" [disabled]="!canAdd" (click)="openEdit(null)">+ إضافة تكلفة</button>
          </div>
        </div>
        <div class="board-grid exp-sec-boards" id="costSecs">
          @for (s of t()?.sections || []; track s.id + s.all) {
            <button type="button" class="board-card cost-sec-board" [attr.data-cost-sec]="s.id" [attr.data-show-all]="s.all ? '1' : null" (click)="enterSection(s.id)">
              <div class="board-card-icon">{{ s.all ? '📂' : '📁' }}</div><div class="board-card-title">{{ s.name }}</div>
              <div class="board-card-meta"><span>{{ s.count }} سجل</span><span class="board-card-amt">{{ fmtMoney(s.total) }}</span></div>
            </button>
          }
        </div>
      </div>
    } @else {
      <div class="page">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <div>
            <button type="button" class="btn btn-outline btn-sm" id="btnCostBackSecs" (click)="section.set(null); f = { ...empty }; loadTable()">← أقسام {{ t()?.label }}</button>
            <h2 class="page-title" style="margin:10px 0 0;">{{ t()?.label }} — {{ section() || 'الكل' }}</h2>
          </div>
          <div class="btn-row page-header-actions" style="display:flex;flex-wrap:nowrap;gap:8px;align-items:center;">
            <span class="page-export-bar" style="display:inline-flex;flex-wrap:nowrap;gap:6px;align-items:center;"><a class="btn btn-outline btn-sm" [href]="full" title="تصدير إكسيل">إكسيل</a><a class="btn btn-outline btn-sm" [href]="full" title="تصدير CSV">CSV</a></span>
            <button class="btn btn-primary" id="btnAddCost" [disabled]="!canAdd" (click)="openEdit(null)">+ إضافة تكلفة</button>
          </div>
        </div>
        <div class="filters-bar">
          <input type="search" id="cstSearch" class="input" placeholder="بحث: اسم، بند..." [(ngModel)]="fq.q" (keydown.enter)="apply()">
          <select id="cstItem" class="input" [(ngModel)]="fq.item" (ngModelChange)="apply()"><option value="">البند: الكل</option>@for (i of t()?.items || []; track i) { <option [value]="i">{{ i }}</option> }</select>
          <input type="search" id="cstProject" class="input" placeholder="المشروع..." [(ngModel)]="fq.project">
          <label>من <input type="date" id="cstFrom" class="input" [(ngModel)]="fq.from"></label>
          <label>إلى <input type="date" id="cstTo" class="input" [(ngModel)]="fq.to"></label>
          <button class="btn btn-outline btn-sm" id="cstApply" (click)="apply()">تطبيق</button>
          <button class="btn btn-outline btn-sm" id="cstClear" (click)="fq = { ...empty }; apply()">مسح</button>
        </div>
        @if (error() && !modal()) { <div class="err" role="alert" id="cstError">{{ error() }}</div> }
        <div class="stats-row" style="margin-bottom:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;">
          <div class="stat-card"><div class="num">{{ t()?.cards?.count ?? 0 }}</div><div class="lbl">عدد التكاليف</div></div>
          <div class="stat-card" [class.debt]="t()?.cards?.total"><div class="num">{{ fmtMoney(t()?.cards?.total) }}</div><div class="lbl">الإجمالي</div></div>
        </div>
        <div class="table-wrap"><table class="data-table" id="cstTable">
          <thead><tr><th>التاريخ</th><th>الاسم</th><th>البند</th><th>القسم</th><th>المشروع</th><th>ملاحظات</th><th>المبلغ</th><th></th></tr></thead>
          <tbody>
            @for (c of pageRows(); track c.id) {
              <tr [attr.data-id]="c.id"><td>{{ fmtDate(c.date) }}</td><td><strong>{{ c.name }}</strong></td><td>{{ c.itemText }}</td><td>{{ c.section || '—' }}</td><td>{{ c.project || '—' }}</td><td>{{ c.notes }}</td><td style="font-weight:700;">{{ fmtMoney(c.amount) }}</td>
                <td style="white-space:nowrap;"><button type="button" class="icon-btn btn-edit-cst" [attr.data-id]="c.id" title="تعديل" (click)="openEditById(c.id)">✏️</button>{{ ' ' }}<button type="button" class="icon-btn icon-del btn-del-cst" [attr.data-id]="c.id" [disabled]="!canDelete" title="حذف" (click)="del.set({ id: c.id, rev: c.rev })">🗑️</button></td></tr>
            } @empty { <tr><td colspan="8" style="text-align:center;color:var(--ink-soft);padding:28px;">لا تكاليف — اضغط «+ إضافة تكلفة»</td></tr> }
          </tbody>
        </table></div>
        <div class="btn-row table-pager" data-pager="costs" style="justify-content:space-between;align-items:center;margin-top:10px;flex-wrap:wrap;gap:8px;">
          <span style="font-size:13px;color:var(--ink-soft);">عرض {{ rows().length ? (curPage() - 1) * 20 + 1 : 0 }}–{{ min(curPage() * 20, rows().length) }} من {{ rows().length }} <span style="opacity:.75;">(20 صف لكل صفحة)</span></span>
          <div style="display:flex;gap:8px;align-items:center;"><button type="button" class="btn btn-outline btn-sm" [disabled]="curPage() <= 1" (click)="page.set(curPage() - 1)">السابق</button><span style="font-size:13px;font-weight:700;">صفحة {{ curPage() }} / {{ pages() }}</span><button type="button" class="btn btn-outline btn-sm" [disabled]="curPage() >= pages()" (click)="page.set(curPage() + 1)">التالي</button></div>
        </div>
      </div>
    }

    @if (modal() && opts(); as o) {
      <div class="modal-overlay" id="appModal" (click)="$event.target === $event.currentTarget && close()">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header"><h3>{{ e.id ? 'تعديل تكلفة' : 'إضافة تكلفة' }}</h3><button type="button" class="modal-close" (click)="close()">×</button></div>
          <div class="modal-body">
            <p style="margin:0 0 12px;font-size:13px;color:var(--ink-soft);">التكلفة بتتضاف لمستحقات الشخص/المعدة وبتظهر في كشف الحساب.</p>
            <div class="form-grid form-grid-2">
              <label>الفئة *<select class="input" id="cstFKind" [(ngModel)]="e.personKind" (ngModelChange)="e.personId = ''; e.section = ''"><option value="worker">عامل</option><option value="supervisor">مشرف</option><option value="driver">سائق</option><option value="employee">موظف</option><option value="equipment">معدة / مركبة</option></select></label>
              <label>نوع التكلفة (القسم)<select class="input" id="cstSection" [(ngModel)]="e.section"><option value="">— بدون —</option>@for (s of o.sections[tabOf(e.personKind)] || []; track s) { <option [value]="s">{{ s }}</option> }</select></label>
              <label>التاريخ *<input class="input" id="cstFDate" type="date" [(ngModel)]="e.date"></label>
              <label id="cstPersonLab">{{ kindLab[e.personKind] || 'الشخص' }} *<select class="input" id="cstFPerson" [(ngModel)]="e.personId"><option value="">اكتب الاسم أو الكود...</option>@for (x of o.people[e.personKind] || []; track x.id) { <option [value]="x.id">{{ (x.code ? x.code + ' — ' : '') + x.name }}</option> }</select></label>
              <label>المشروع<input class="input" id="cstFProject" [(ngModel)]="e.project" list="cstProjList"><datalist id="cstProjList">@for (p of o.projects; track p) { <option [value]="p"></option> }</datalist></label>
            </div>
            <div class="section-title" style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
              <span>بنود التكلفة</span>
              <div style="display:flex;gap:6px;flex-wrap:wrap;"><button type="button" class="btn btn-outline btn-sm" id="btnCstAddLine" (click)="lines.push({ item: '', amount: '' })">+ بند</button><button type="button" class="btn btn-outline btn-sm" id="btnCstManageItems" (click)="itemsModal.set(true)">إدارة البنود</button></div>
            </div>
            <div id="cstLines">
              @for (l of lines; track $index) {
                <div class="ex-line cst-line" style="display:grid;grid-template-columns:1fr minmax(140px,200px) 36px;gap:8px;align-items:start;margin-bottom:8px;">
                  <div class="ex-item-wrap" style="position:relative;min-width:0;"><input class="input cst-item" placeholder="اختر أو اكتب بند التكلفة..." [(ngModel)]="l.item" autocomplete="off" style="width:100%;box-sizing:border-box;" list="cstItemList"></div>
                  <input class="input cst-amt" type="number" min="0" step="0.01" placeholder="المبلغ" [(ngModel)]="l.amount" style="width:100%;box-sizing:border-box;">
                  <button type="button" class="icon-btn icon-del cst-del" title="حذف البند" (click)="delLine($index)">🗑️</button>
                </div>
              }
              <datalist id="cstItemList">@for (x of o.suggestions[e.personKind] || []; track x) { <option [value]="x"></option> }</datalist>
            </div>
            <div style="margin-top:12px;font-weight:800;font-size:16px;">الإجمالي: <span id="cstTotal">{{ fmtNum(total()) }}</span> ج.م</div>
            <label style="display:block;margin-top:12px;">ملاحظات<textarea class="input" id="cstFNotes" rows="4" placeholder="اكتب الملاحظات هنا..." [(ngModel)]="e.notes"></textarea></label>
            @if (error()) { <div class="err" role="alert" id="cstModalError">{{ error() }}</div> }
          </div>
          <div class="modal-footer"><button class="btn btn-outline" (click)="close()">إلغاء</button><button class="btn btn-primary" id="btnSaveCost" [disabled]="saving()" (click)="save()">{{ e.id ? 'حفظ التعديل' : 'حفظ' }}</button></div>
        </div>
      </div>
    }
    @if (itemsModal() && opts(); as o) {
      <div class="modal-overlay" id="appSubModal" style="z-index:400000;" (click)="$event.target === $event.currentTarget && itemsModal.set(false)">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header"><h3>إدارة بنود التكاليف — {{ kindsLab[e.personKind] }}</h3><button class="modal-close" (click)="itemsModal.set(false)">×</button></div>
          <div class="modal-body">
            <div style="display:flex;gap:8px;margin-bottom:12px;"><input class="input" id="cstNewItem" placeholder="اسم البند الجديد" style="flex:1;" [(ngModel)]="newItem" (keydown.enter)="itemOp('add', newItem)"><button type="button" class="btn btn-primary btn-sm" id="btnCstNewItem" (click)="itemOp('add', newItem)">+ إضافة بند</button></div>
            <div class="table-wrap"><table class="data-table"><thead><tr><th>البند</th><th style="width:150px;"></th></tr></thead><tbody>
              @for (x of o.suggestions[e.personKind] || []; track x) {
                <tr class="pitem-row" [attr.data-item]="x"><td><input class="input pitem-edit" [value]="x" #ed></td>
                  <td style="white-space:nowrap;"><button type="button" class="btn btn-outline btn-sm btn-save-pitem" (click)="itemOp(ed.value.trim() !== x ? 'rename' : 'add', x, ed.value)">حفظ</button>{{ ' ' }}<button type="button" class="btn btn-outline btn-sm btn-del-pitem" (click)="itemOp('remove', x)">🗑️ حذف</button></td></tr>
              } @empty { <tr><td colspan="2" style="text-align:center;color:var(--ink-soft);padding:16px;">لا توجد بنود</td></tr> }
            </tbody></table></div>
            <p style="font-size:12.5px;color:var(--ink-soft);margin:8px 0 0;">تعديل اسم بند بيحدّث التكاليف القديمة اللي عليه. الحذف بيشيله من القائمة بس (السجلات القديمة ما بتتأثرش).</p>
          </div>
          <div class="modal-footer"><button class="btn btn-outline" (click)="itemsModal.set(false)">إغلاق</button></div>
        </div>
      </div>
    }
    @if (secModal(); as op) {
      <div class="modal-overlay" id="appModal" (click)="$event.target === $event.currentTarget && secModal.set('')">
        <div class="modal" role="dialog" aria-modal="true">
          @switch (op) {
            @case ('add') {
              <div class="modal-header"><h3>إضافة قسم تكاليف</h3><button class="modal-close" (click)="secModal.set('')">×</button></div>
              <div class="modal-body"><label>اسم القسم *<input class="input" id="costSecName" placeholder="مثال: مواقع، ورشة..." [(ngModel)]="secName"></label></div>
              <div class="modal-footer"><button class="btn btn-outline" (click)="secModal.set('')">إلغاء</button><button class="btn btn-primary" id="btnDoCostSec" (click)="secOp('add')">إضافة</button></div>
            }
            @case ('rename') {
              <div class="modal-header"><h3>تعديل قسم</h3><button class="modal-close" (click)="secModal.set('')">×</button></div>
              <div class="modal-body"><label>القسم<select class="input" id="costRenOld" [(ngModel)]="secOld">@for (s of secList(); track s) { <option [value]="s">{{ s }}</option> }</select></label><label>الاسم الجديد<input class="input" id="costRenNew" [(ngModel)]="secName"></label></div>
              <div class="modal-footer"><button class="btn btn-outline" (click)="secModal.set('')">إلغاء</button><button class="btn btn-primary" id="btnDoCostRen" (click)="secOp('rename')">حفظ</button></div>
            }
            @default {
              <div class="modal-header"><h3>حذف قسم</h3><button class="modal-close" (click)="secModal.set('')">×</button></div>
              <div class="modal-body"><label>القسم<select class="input" id="costDelSec" [(ngModel)]="secOld">@for (s of secList(); track s) { <option [value]="s">{{ s }}</option> }</select></label></div>
              <div class="modal-footer"><button class="btn btn-outline" (click)="secModal.set('')">إلغاء</button><button class="btn btn-primary" id="btnDoCostDel" (click)="del.set({ id: '__sec', rev: 0 })">حذف</button></div>
            }
          }
        </div>
      </div>
    }
    @if (del(); as x) {
      <div class="modal-overlay" id="appConfirmModal" style="z-index:500000;" (click)="$event.target === $event.currentTarget && del.set(null)">
        <div class="modal app-confirm-modal">
          <div class="modal-header app-confirm-head danger"><span class="confirm-icon" aria-hidden="true">🗑️</span><h3 style="margin:0;flex:1;">تأكيد الحذف</h3><button type="button" class="modal-close" aria-label="إغلاق" (click)="del.set(null)">×</button></div>
          <div class="modal-body">{{ x.id === '__sec' ? 'حذف القسم؟' : 'هل أنت متأكد من الحذف؟' }}</div>
          <div class="modal-footer"><button type="button" class="btn btn-danger" id="btnConfirmDel" (click)="x.id === '__sec' ? secOp('delete') : remove(x)">حذف</button><button type="button" class="btn btn-outline" (click)="del.set(null)">إلغاء</button></div>
        </div>
      </div>
    }`,
})
export class CostsPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly toast = new LegacyToast();
  readonly full = legacyUrl('costs');
  readonly canAdd = this.session.can('costs', 'add');
  readonly canEdit = this.session.can('costs', 'edit');
  readonly canDelete = this.session.can('costs', 'delete');
  readonly empty = EMPTY; readonly kindLab = KIND_LAB;
  readonly kindsLab: Record<string, string> = { worker: 'العمال', supervisor: 'المشرفين', driver: 'السائقين', employee: 'الموظفين', equipment: 'المعدات والمركبات' };
  readonly tab = signal('');
  readonly section = signal<string | null>(null);
  readonly boards = signal<P | null>(null);
  readonly t = signal<P | null>(null);
  readonly comp = signal<P | null>(null);
  readonly error = signal('');
  readonly page = signal(1);
  readonly modal = signal(false);
  readonly itemsModal = signal(false);
  readonly secModal = signal<'' | 'add' | 'rename' | 'delete'>('');
  readonly saving = signal(false);
  readonly opts = signal<P | null>(null);
  readonly del = signal<{ id: string; rev: number } | null>(null);
  readonly rows = computed<P[]>(() => this.t()?.rows || []);
  readonly pages = computed(() => Math.max(1, Math.ceil(this.rows().length / PAGE_SIZE)));
  readonly curPage = computed(() => Math.min(this.page(), this.pages()));
  readonly pageRows = computed(() => this.rows().slice((this.curPage() - 1) * PAGE_SIZE, this.curPage() * PAGE_SIZE));
  readonly secList = computed<string[]>(() => (this.t()?.sections || []).filter((s: P) => !s.all).map((s: P) => s.name));
  f: P = { ...EMPTY }; fq: P = { ...EMPTY };
  cc = { q: '', from: '', to: '' };
  e: P = {}; lines: Line[] = [];
  newItem = ''; secName = ''; secOld = '';
  private qTimer?: ReturnType<typeof setTimeout>;
  fmtNum = fmtNum; fmtMoney = fmtMoney; fmtNew = fmtNew; fmtDate = fmtDate; min = Math.min;
  tabOf = (k: string) => TAB_OF[k] || 'workers';
  total() { return this.lines.reduce((s, l) => s + toInt(l.amount), 0); }

  ngOnInit() { void this.loadBoards(); }
  async loadBoards() { try { this.boards.set(await firstValueFrom(this.http.get<P>('/api/v1/costs/boards'))); } catch (err) { this.error.set(errorMessage(err, 'تعذر التحميل')); } }
  enterTab(id: string) { this.tab.set(id); this.section.set(null); this.f = { ...EMPTY }; this.fq = { ...EMPTY }; void this.loadTable(); }
  enterSection(id: string) { this.section.set(id); this.page.set(1); void this.loadTable(); }
  apply() { this.f = { ...this.fq }; this.page.set(1); void this.loadTable(); }
  async loadTable() {
    this.error.set('');
    let params = new HttpParams().set('tab', this.tab());
    const sec = this.section();
    if (sec) params = params.set('section', sec); else params = params.set('all', '1');
    for (const [k, v] of Object.entries(this.f)) if (v) params = params.set(k, String(v));
    try { this.t.set(await firstValueFrom(this.http.get<P>('/api/v1/costs/table', { params }))); } catch (err) { this.error.set(errorMessage(err, 'تعذر التحميل')); }
  }
  openComp() { this.tab.set('__all'); void this.loadComp(); }
  async loadComp(debounce = false) {
    clearTimeout(this.qTimer);
    if (debounce) { this.qTimer = setTimeout(() => void this.loadComp(), 250); return; }
    let params = new HttpParams(); for (const [k, v] of Object.entries(this.cc)) if (v) params = params.set(k, v);
    try { this.comp.set(await firstValueFrom(this.http.get<P>('/api/v1/project-cost', { params }))); } catch (err) { this.error.set(errorMessage(err, 'تعذر التحميل')); }
  }
  private async loadOpts() { this.opts.set(await firstValueFrom(this.http.get<P>('/api/v1/costs/form-options'))); }
  async openEditById(id: string) { try { await this.openEdit(await firstValueFrom(this.http.get<P>(`/api/v1/costs/${encodeURIComponent(id)}`))); } catch (err) { this.error.set(errorMessage(err, 'تعذر الفتح')); } }
  /** openCostModal: الفئة من التبويب، والقسم من اللوحة، والتاريخ النهارده، وسطر واحد فاضي */
  async openEdit(x: P | null) {
    this.error.set('');
    try {
      await this.loadOpts();
      const kind = x ? x.personKind : (this.t()?.kind || 'worker');
      this.e = x ? { id: x.id, rev: x.rev, personKind: kind, personId: x.personId || '', date: x.date || this.opts().today, project: x.project || '', section: x.section || '', notes: x.notes || '' }
        : { id: '', personKind: kind, personId: '', date: this.opts().today, project: '', section: this.section() || '', notes: '' };
      this.lines = x ? (x.lines as P[]).map((l) => ({ item: l.item, amount: l.amount || '' })) : [{ item: '', amount: '' }];
      this.modal.set(true);
    } catch (err) { this.error.set(errorMessage(err, 'تعذر فتح النافذة')); }
  }
  delLine(i: number) { if (this.lines.length <= 1) { this.lines[0].item = ''; this.lines[0].amount = ''; } else this.lines.splice(i, 1); }
  close() { this.modal.set(false); this.error.set(''); }
  async save() {
    const e = this.e;
    const body: P = { personKind: e.personKind, personId: e.personId, date: e.date, project: e.project, section: e.section, notes: e.notes, lines: this.lines.map((l) => ({ item: String(l.item ?? ''), amount: String(l.amount ?? '') })) };
    if (!e.personId) { this.toast.show('اختار الشخص'); return; }
    if (!e.date) { this.toast.show('اكتب التاريخ'); return; }
    this.saving.set(true); this.error.set('');
    try {
      const r: P = e.id ? await firstValueFrom(this.http.patch(`/api/v1/costs/${encodeURIComponent(e.id)}`, { ...body, rev: e.rev }))
        : await firstValueFrom(this.http.post('/api/v1/costs', body, { headers: new HttpHeaders({ 'Idempotency-Key': `cst-${crypto.randomUUID()}` }) }));
      const who = (this.opts()?.people[e.personKind] || []).find((p: P) => p.id === e.personId);
      this.modal.set(false); this.toast.show(`تم الحفظ — المبلغ بقى مستحق لـ ${who ? who.name : ''}`); void r;
      await this.loadTable();
    } catch (err) { const m = errorMessage(err, 'تعذّر الحفظ'); this.toast.show(m); this.error.set(m); } finally { this.saving.set(false); }
  }
  async remove(x: { id: string; rev: number }) {
    this.del.set(null);
    try { await firstValueFrom(this.http.delete(`/api/v1/costs/${encodeURIComponent(x.id)}`, { params: new HttpParams().set('rev', String(x.rev)) })); this.toast.show('تم الحذف'); await this.loadTable(); }
    catch (err) { this.toast.show(errorMessage(err, 'تعذّر الحذف')); }
  }
  openSec(op: 'rename' | 'delete') {
    if (!this.secList().length) { this.toast.show(op === 'rename' ? 'لا أقسام — أضف قسماً أولاً' : 'لا أقسام'); return; }
    this.secOld = this.secList()[0]; this.secName = ''; this.secModal.set(op);
  }
  async secOp(op: 'add' | 'rename' | 'delete') {
    const name = op === 'add' ? this.secName.trim() : this.secOld;
    if ((op === 'add' || op === 'rename') && !(op === 'add' ? name : this.secName.trim())) { this.toast.show('أدخل الاسم'); return; }
    this.del.set(null);
    try {
      await firstValueFrom(this.http.post('/api/v1/costs/sections', { tab: this.tab(), op, name, ...(op === 'rename' ? { to: this.secName.trim() } : {}) }));
      if (op !== 'add' && this.section() === name) this.section.set(op === 'rename' ? this.secName.trim() : '');
      this.secModal.set(''); this.secName = ''; this.toast.show('تم'); await this.loadTable();
    } catch (err) { this.toast.show(errorMessage(err, 'تعذّر الحفظ')); }
  }
  async itemOp(op: 'add' | 'rename' | 'remove', label: string, to = '') {
    if (!String(op === 'rename' ? to : label).trim()) return;
    try {
      await firstValueFrom(this.http.post('/api/v1/costs/items', { kind: this.e.personKind, op, label: label.trim(), ...(op === 'rename' ? { to: to.trim() } : {}) }));
      if (op === 'add') this.newItem = '';
      if (op !== 'add' || to) this.toast.show('تم الحفظ');
      await this.loadOpts();
      if (op === 'rename') { this.lines.forEach((l) => { if (String(l.item).trim() === label.trim()) l.item = to.trim(); }); if (this.tab() && this.tab() !== '__all') void this.loadTable(); }
    } catch (err) { this.toast.show(errorMessage(err, 'تعذّر الحفظ')); }
  }
}
