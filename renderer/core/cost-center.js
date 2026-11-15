/* =========================================================
   cost-center.js — التكلفة الشاملة للمشاريع (عمالة + معدات + وقود + صيانة + مصروفات + تكاليف
   + سلف + فواتير موردين + صرف مخازن) في شاشة واحدة، متاحة من «المصاريف» و«التكاليف».
   المصدر الوحيد للأرقام: projectCostSummary (helpers.js) + projectSupplyCostLines.
   ========================================================= */

let compCostFilters = { q: '', from: '', to: '' };

const COMP_COST_COLS = [
  ['labor', 'عمالة'], ['equip', 'معدات'], ['fuel', 'وقود'], ['maint', 'صيانة'], ['expenses', 'مصروفات'],
  ['costs', 'تكاليف'], ['advances', 'سلف'], ['suppliers', 'موردون'], ['warehouse', 'مخازن']
];

/** كل أسماء المشاريع اللي ليها أي حركة تكلفة (المسجّلة + أسماء مكتوبة نصاً في السجلات) */
function compCostProjectNames(){
  const set = {};
  (DATA.projects || []).forEach(p => { if(p && p.name) set[String(p.name).trim()] = true; });
  const add = v => { v = String(v || '').trim(); if(v) set[v] = set[v] || 'free'; };
  (DATA.expenses || []).forEach(e => e && add(e.project));
  (DATA.costs || []).forEach(c => c && add(c.project));
  ((DATA.ledger && DATA.ledger.invoices) || []).forEach(i => i && add(i.project));
  ((DATA.warehouses && DATA.warehouses.movements) || []).forEach(m => m && m.type === 'out' && add(m.project));
  return Object.keys(set);
}

function compCostCollected(name){
  let s = 0;
  try{ clAllClientInvoices().forEach(i => { if(String(i.project || '').trim() === name) s += Number(i.paid) || 0; }); }catch(e){}
  return toInt(s);
}

function compCostRows(){
  const f = compCostFilters, q = (f.q || '').trim();
  return compCostProjectNames().filter(n => !q || (typeof smartMatch === 'function' ? smartMatch(n, q) : n.indexOf(q) >= 0)).map(name => {
    const c = projectCostSummary(name, f.from || '', f.to || '');
    const collected = compCostCollected(name);
    return { name: name, c: c, collected: collected, net: collected - c.total, registered: !!getProjectByName(name) };
  }).filter(r => r.c.total || r.collected).sort((a, b) => b.c.total - a.c.total);
}

function comprehensiveCostsPageHtml(owner){
  const rows = compCostRows();
  const tot = { total: 0, collected: 0 }; COMP_COST_COLS.forEach(c => tot[c[0]] = 0);
  rows.forEach(r => { COMP_COST_COLS.forEach(c => tot[c[0]] += r.c[c[0]] || 0); tot.total += r.c.total; tot.collected += r.collected; });
  const f = compCostFilters;
  const statusBadge = r => ({ ok: '<span class="badge badge-ok">ضمن الميزانية</span>', warn: '<span class="badge badge-warn">قارب الميزانية</span>', over: '<span class="badge badge-danger">تجاوز</span>' })[r.c.budgetStatus] || '<span class="badge badge-muted">بدون ميزانية</span>';
  return '<div class="page comp-costs" data-owner="' + owner + '">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">' +
      '<div><h2 class="page-title" style="margin:0;">🏗️ ' + (owner === 'costs' ? 'التكاليف الشاملة' : 'المصاريف الشاملة') + ' — كل المشاريع</h2>' +
      '<p class="page-sub" style="margin:4px 0 0;">عمالة + معدات + وقود + صيانة + مصروفات + تكاليف + سلف + فواتير موردين + صرف مخازن (بدون حساب مزدوج)</p></div>' +
      '<button type="button" class="btn btn-outline btn-sm" id="compCostsBack">◀ رجوع</button></div>' +
    '<div class="filters-bar" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">' +
      '<input class="input" id="ccQ" type="search" placeholder="بحث باسم المشروع…" value="' + escapeHtml(f.q) + '">' +
      '<label>من <input class="input" type="date" id="ccFrom" value="' + escapeHtml(f.from) + '"></label>' +
      '<label>إلى <input class="input" type="date" id="ccTo" value="' + escapeHtml(f.to) + '"></label>' +
      '<button type="button" class="btn btn-outline btn-sm" id="ccClear">مسح</button></div>' +
    '<div class="stats-row" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:14px;">' +
      '<div class="stat-card"><div class="num">' + fmtMoney(tot.total) + '</div><div class="lbl">إجمالي التكلفة</div></div>' +
      '<div class="stat-card"><div class="num">' + fmtMoney(tot.suppliers + tot.warehouse) + '</div><div class="lbl">موردون + مخازن</div></div>' +
      '<div class="stat-card"><div class="num">' + fmtMoney(tot.labor + tot.equip + tot.fuel + tot.maint) + '</div><div class="lbl">عمالة ومعدات</div></div>' +
      '<div class="stat-card"><div class="num">' + fmtMoney(tot.collected) + '</div><div class="lbl">المحصّل من العملاء</div></div>' +
      '<div class="stat-card ' + (tot.collected - tot.total < 0 ? 'debt' : '') + '"><div class="num">' + fmtMoney(tot.collected - tot.total) + '</div><div class="lbl">المحصّل − التكلفة</div></div></div>' +
    '<div class="table-wrap"><table class="data-table"><thead><tr><th>المشروع</th>' + COMP_COST_COLS.map(c => '<th>' + c[1] + '</th>').join('') +
      '<th>الإجمالي</th><th>الميزانية</th><th>المحصّل</th><th>المحصّل − التكلفة</th></tr></thead><tbody>' +
      (rows.length ? rows.map(r =>
        '<tr' + (r.registered ? ' class="cc-row" data-name="' + escapeHtml(r.name) + '" style="cursor:pointer;"' : '') + '>' +
        '<td><strong>' + escapeHtml(r.name) + '</strong>' + (r.registered ? '' : '<div style="font-size:11px;color:var(--ink-soft);">اسم غير مسجّل كمشروع</div>') + '</td>' +
        COMP_COST_COLS.map(c => '<td>' + (r.c[c[0]] ? fmtMoney(r.c[c[0]]) : '—') + '</td>').join('') +
        '<td><strong>' + fmtMoney(r.c.total) + '</strong></td><td>' + (r.c.budget ? fmtMoney(r.c.budget) : '—') + '<div>' + statusBadge(r) + '</div></td>' +
        '<td>' + fmtMoney(r.collected) + '</td><td style="color:' + (r.net < 0 ? 'var(--danger,#b3261e)' : 'inherit') + ';">' + fmtMoney(r.net) + '</td></tr>').join('')
        : '<tr><td colspan="' + (COMP_COST_COLS.length + 5) + '" style="text-align:center;padding:24px;color:var(--ink-soft);">لا تكاليف مربوطة بمشاريع</td></tr>') +
      '</tbody>' + (rows.length ? '<tfoot><tr><th>الإجمالي</th>' + COMP_COST_COLS.map(c => '<th>' + fmtMoney(tot[c[0]]) + '</th>').join('') + '<th>' + fmtMoney(tot.total) + '</th><th></th><th>' + fmtMoney(tot.collected) + '</th><th>' + fmtMoney(tot.collected - tot.total) + '</th></tr></tfoot>' : '') +
    '</table></div>' +
    '<p style="font-size:12px;color:var(--ink-soft);margin-top:10px;">قواعد الحساب: فاتورة مورد مربوطة بالمخزن تُحسب وقت الصرف للمشروع بتكلفة الصنف (مش وقت الفاتورة) · فاتورة مورد مباشرة على مشروع تُحسب بإجماليها بعد المرتجعات · دفعات الموردين تسوية وليست تكلفة.</p></div>';
}

/** كارت اللوحة اللي بيتضاف في صفحتي المصاريف والتكاليف */
function comprehensiveCostsBoardCard(attr){
  let tot = 0; try{ compCostRows().forEach(r => tot += r.c.total); }catch(e){}
  const cls = attr === 'data-cost-tab' ? 'cost-kind-board' : 'exp-kind-board';
  return '<button type="button" class="board-card ' + cls + '" ' + attr + '="__all"><div class="board-card-icon">🏗️</div><div class="board-card-title">تكلفة المشاريع الشاملة</div>' +
    '<div class="board-card-meta"><span>كل المصادر + الموردين + المخازن</span><span class="board-card-amt">' + fmtMoney(tot) + '</span></div></button>';
}

document.addEventListener('click', function(e){
  if(!e.target.closest) return;
  const back = e.target.closest('#compCostsBack');
  if(back){ const o = (document.querySelector('.comp-costs') || {}).getAttribute('data-owner'); if(o === 'costs') window.__costTab = ''; else window.__expTab = ''; rerenderCurrentPage(); return; }
  const row = e.target.closest('.cc-row');
  if(row){
    const p = getProjectByName(row.getAttribute('data-name'));
    if(p){ projectFilters.detailId = p.id; goToPage('projects'); }
    return;
  }
  if(e.target.id === 'ccClear'){ compCostFilters = { q: '', from: '', to: '' }; rerenderCurrentPage(); }
});
document.addEventListener('change', function(e){
  if(e.target.id === 'ccFrom'){ compCostFilters.from = e.target.value; rerenderCurrentPage(); }
  if(e.target.id === 'ccTo'){ compCostFilters.to = e.target.value; rerenderCurrentPage(); }
});
document.addEventListener('input', function(e){
  if(e.target.id === 'ccQ'){ compCostFilters.q = e.target.value; clearTimeout(window.__ccQT); window.__ccQT = setTimeout(rerenderCurrentPage, 250); }
});
