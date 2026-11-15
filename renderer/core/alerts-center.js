/* =========================================================
   alerts-center.js — «مركز المتابعة»: محرك تنبيهات موحّد لكل أجزاء البرنامج
   registerAlertSource(source, label, fn) → fn() ترجّع مصفوفة تنبيهات بنفس شكل تنبيهات الموارد البشرية:
     { page, icon, level, severity, kind, kindLabel, msg, issues, personId?, project?, open? }
   collectAllAlerts() بتجمع المصادر كلها وتوسمها بـ source/key وتطبّق حالة (تأجيل/تم) المحفوظة في DATA.alertState.
   تنبيهات الموارد البشرية (collectSystemAlerts) بتفضل زي ما هي.
   ========================================================= */

const ALERT_SOURCES = [];
const __alertOpeners = [];
let alertCenterFilters = { source: '', severity: '', q: '', showHidden: false };

function registerAlertSource(source, label, fn){
  const i = ALERT_SOURCES.findIndex(function(s){ return s.source === source; });
  if(i >= 0) ALERT_SOURCES[i] = { source: source, label: label, fn: fn };
  else ALERT_SOURCES.push({ source: source, label: label, fn: fn });
}

function alertKey(a){ return [a.source || '', a.kind || '', a.page || '', a.personId || '', a.msg || ''].join('|'); }
function alertStateMap(){ if(!DATA.alertState) DATA.alertState = {}; return DATA.alertState; }

function collectAllAlerts(opts){
  opts = opts || {};
  const out = [];
  const today = (typeof todayISO === 'function') ? todayISO() : new Date().toISOString().slice(0, 10);
  const st = alertStateMap();
  ALERT_SOURCES.forEach(function(s){
    let list = [];
    try{ list = s.fn() || []; }catch(e){ console.warn('alert source', s.source, e); }
    list.forEach(function(a){
      const x = Object.assign({ level: 'warn', icon: '⚠️' }, a, { source: s.source, sourceLabel: s.label });
      x.severity = (typeof alertSeverity === 'function') ? alertSeverity(x) : (x.severity || 'med');
      x.key = alertKey(x);
      const state = st[x.key];
      x.hidden = !!(state && (state.done || (state.snoozeUntil && state.snoozeUntil > today)));
      if(x.hidden && !opts.includeHidden) return;
      out.push(x);
    });
  });
  return out;
}

function alertsApplyFilters(list){
  const f = alertCenterFilters;
  const q = (f.q || '').trim();
  return list.filter(function(a){
    if(f.source && a.source !== f.source) return false;
    if(f.severity && a.severity !== f.severity) return false;
    if(q){
      const hay = [a.msg, a.kindLabel, a.project, (a.issues || []).join(' ')].join(' ');
      if(!(typeof smartMatch === 'function' ? smartMatch(hay, q) : hay.indexOf(q) >= 0)) return false;
    }
    return true;
  });
}

/** عدد التنبيهات (للشارة على زر المتابعة) — بيتخزّن مؤقتاً لحد الرسم الجاي */
let __acCache = { t: 0, n: 0 };
function alertsCount(){
  const now = Date.now();
  if(now - __acCache.t < 1500) return __acCache.n;
  let n = 0; try{ n = collectAllAlerts().length; }catch(e){}
  __acCache = { t: now, n: n }; return n;
}

function alertOpenAttr(a){
  if(typeof a.open !== 'function') return '';
  __alertOpeners.push(a.open);
  return ' data-alert-open="' + (__alertOpeners.length - 1) + '"';
}

function __acInvalidate(){ __acCache.t = 0; }
function alertSnooze(key, days){ __acInvalidate();
  const st = alertStateMap();
  const d = new Date(); d.setDate(d.getDate() + days);
  st[key] = { snoozeUntil: d.toISOString().slice(0, 10) };
  saveData(true);
}
function alertDone(key){ __acInvalidate(); alertStateMap()[key] = { done: true }; saveData(true); }
function alertRestore(key){ __acInvalidate(); delete alertStateMap()[key]; saveData(true); }

/* ---------- لوحة الفلاتر + قائمة التنبيهات المجمّعة ---------- */
function alertCenterHtml(){
  const all = collectAllAlerts({ includeHidden: alertCenterFilters.showHidden });
  const list = alertsApplyFilters(all).filter(function(a){ return alertCenterFilters.showHidden ? a.hidden : true; });
  const bySource = {};
  all.forEach(function(a){ bySource[a.source] = (bySource[a.source] || 0) + 1; });
  let hiddenCount = 0; try{ hiddenCount = collectAllAlerts({ includeHidden: true }).filter(function(a){ return a.hidden; }).length; }catch(e){}
  const srcTabs = ['<button type="button" class="ac-pill ac-src' + (alertCenterFilters.source ? '' : ' is-on') + '" data-src="">الكل (' + all.length + ')</button>']
    .concat(ALERT_SOURCES.filter(function(s){ return s.source !== 'approvals'; }).map(function(s){
      return '<button type="button" class="ac-pill ac-src' + (alertCenterFilters.source === s.source ? ' is-on' : '') + '" data-src="' + s.source + '">' + escapeHtml(s.label) + ' (' + (bySource[s.source] || 0) + ')</button>';
    })).join('');
  window.__alertsMax = 6;
  const html = (typeof dashboardAlertsHtml === 'function') ? dashboardAlertsHtml(list) : '';
  window.__alertsMax = 0;
  // أزرار تأجيل/تم لكل كارت بعد الرسم (بنضيفها من الـ DOM في initAlertCenterEvents)
  return '<div class="alert-center">' +
    '<div class="ac-bar"><input class="input ac-search" id="acQ" type="search" placeholder="🔍 بحث في التنبيهات…" value="' + escapeHtml(alertCenterFilters.q) + '">' +
      '<div class="ac-tabs">' + srcTabs + '</div>' +
      '<div class="ac-tools"><button type="button" class="ac-pill ac-snoozed' + (alertCenterFilters.showHidden ? ' is-on' : '') + '" id="acHiddenBtn">⏰ المؤجَّلة والمنجزة (' + hiddenCount + ')</button>' +
      '</div></div>' +
    html + '</div>';
}

function initAlertCenterEvents(){
  document.querySelectorAll('.ac-src').forEach(function(b){
    b.addEventListener('click', function(){ alertCenterFilters.source = b.getAttribute('data-src'); rerenderCurrentPage(); });
  });
  document.getElementById('acHiddenBtn')?.addEventListener('click', function(){ alertCenterFilters.showHidden = !alertCenterFilters.showHidden; rerenderCurrentPage(); });
  document.getElementById('acQ')?.addEventListener('input', function(e){
    alertCenterFilters.q = e.target.value;
    clearTimeout(window.__acQT);
    window.__acQT = setTimeout(rerenderCurrentPage, 250);
  });
  // أزرار تأجيل / تم على كل كارت (بنربطها بالـ key عن طريق ترتيب الكروت)
  const cards = Array.prototype.slice.call(document.querySelectorAll('.alert-center .alert-card'));
  if(!cards.length) return;
  const keyOf = {};
  collectAllAlerts({ includeHidden: true }).forEach(function(a){ keyOf[a.msg + '|' + (a.personId || '')] = a; });
  cards.forEach(function(card){
    const msg = (card.querySelector('.alert-name') || {}).textContent || '';
    const pid = card.getAttribute('data-person-id') || '';
    const a = keyOf[msg + '|' + pid];
    if(!a) return;
    const bar = document.createElement('div');
    bar.className = 'alert-actions';
    bar.style.cssText = 'display:flex;gap:6px;margin-top:6px;';
    bar.innerHTML = a.hidden
      ? '<span class="btn btn-outline btn-sm" data-ac="restore">↩ إرجاع</span>'
      : '<span class="btn btn-outline btn-sm" data-ac="snooze">⏰ تأجيل أسبوع</span><span class="btn btn-outline btn-sm" data-ac="done">✓ تم</span>';
    bar.addEventListener('click', function(e){
      const act = e.target.getAttribute && e.target.getAttribute('data-ac'); if(!act) return;
      e.stopPropagation(); e.preventDefault();
      if(act === 'snooze') alertSnooze(a.key, 7);
      else if(act === 'done') alertDone(a.key);
      else alertRestore(a.key);
      rerenderCurrentPage();
    });
    card.appendChild(bar);
  });
}

document.addEventListener('click', function(e){
  if(e.target.closest && e.target.closest('.alert-actions')) return;
  const el = e.target.closest && e.target.closest('[data-alert-open]');
  if(!el) return;
  const fn = __alertOpeners[Number(el.getAttribute('data-alert-open'))];
  if(typeof fn === 'function'){ e.preventDefault(); e.stopPropagation(); try{ fn(); }catch(err){ console.warn(err); } }
}, true);

/* ---------- المصادر ---------- */
function __acToday(){ return (typeof todayISO === 'function') ? todayISO() : new Date().toISOString().slice(0, 10); }
function __acGo(page, setup){ return function(){ try{ if(setup) setup(); }catch(e){} goToPage(page); }; }

registerAlertSource('hr', 'الموارد البشرية', function(){
  return (typeof collectSystemAlerts === 'function') ? collectSystemAlerts() : [];
});

registerAlertSource('ledger', 'الموردون', function(){
  const out = [];
  if(!(DATA.ledger && DATA.ledger.invoices) || typeof isInvoiceOverdue !== 'function') return out;
  DATA.ledger.invoices.filter(isInvoiceOverdue).forEach(function(inv){
    const sup = (typeof __bdSup === 'function') ? __bdSup(inv.supplierId) : inv.supplierId;
    out.push({ page: 'ledger.invoices', icon: '🔴', level: 'danger', severity: 'high', kind: 'ledger-overdue', kindLabel: 'فواتير موردين متأخرة السداد',
      msg: 'فاتورة ' + (inv.invoiceNo || inv.id) + ' — ' + sup,
      issues: ['المتبقي: ' + fmtMoney(invoiceRemaining(inv)), 'الاستحقاق: ' + getInvoiceDueDate(inv)], project: inv.project || '',
      open: __acGo('ledger.invoices', function(){ invoiceFilters.overdueOnly = true; invoiceFilters.supplierId = inv.supplierId; }) });
  });
  return out;
});

registerAlertSource('warehouses', 'المخازن', function(){
  const out = [];
  if(typeof whItems !== 'function') return out;
  whItems().forEach(function(it){
    const min = Number(it.minQty) || 0; if(!min) return;
    const q = whStockQty(it.id);
    if(q <= min) out.push({ page: 'warehouses.home', icon: q <= 0 ? '🔴' : '🟠', level: q <= 0 ? 'danger' : 'warn', kind: 'wh-min', kindLabel: 'أصناف تحت الحد الأدنى',
      msg: (it.name || it.code) + (q <= 0 ? ' — نفد من المخزون' : ' — رصيد منخفض'), issues: ['الرصيد: ' + q + ' ' + (it.unit || ''), 'الحد الأدنى: ' + min],
      open: __acGo('warehouses.home', function(){ whFilters.tab = 'stock'; whFilters.q = it.name || ''; }) });
  });
  return out;
});

registerAlertSource('clients', 'العملاء والمشاريع', function(){
  const out = [], today = __acToday();
  const projOpen = function(p){ return __acGo('projects', function(){ projectFilters.detailId = p.id; }); };
  (DATA.projects || []).forEach(function(p){
    if(typeof pwLateSteps !== 'function') return;
    const late = pwLateSteps(p);
    if(late.length) out.push({ page: 'projects', icon: '⏰', level: 'danger', severity: 'high', kind: 'proj-late', kindLabel: 'خطوات مشاريع متأخرة',
      msg: (p.name || p.code) + ' — ' + late.length + ' خطوة متأخرة', issues: late.slice(0, 5).map(function(l){ return l.step.label + (l.meta.dueDate ? ' (استحقاق ' + l.meta.dueDate + ')' : ''); }),
      project: p.name || '', open: projOpen(p) });
  });
  if(typeof clAllGuarantees === 'function') clAllGuarantees().forEach(function(g){
    if(typeof clGuaranteeIsLive === 'function' && !clGuaranteeIsLive(g) && clGuaranteeEffStatus(g) !== 'منتهي') return;
    const d = clDaysUntil(g.expiryDate); if(d == null || d > 30) return;
    if(clGuaranteeEffStatus(g) === 'منتهي' && g.status !== 'ساري' && g.status !== 'قيد التجديد') return;
    out.push({ page: 'clients.guarantees', icon: d < 0 ? '🔴' : '🟠', level: d < 0 ? 'danger' : 'warn', kind: 'guarantee', kindLabel: 'ضمانات قاربت/انتهت',
      msg: 'ضمان ' + (g.type || '') + ' ' + (g.letterNo || g.id) + ' — ' + (typeof __bdCust === 'function' ? __bdCust(g.customerId) : ''),
      issues: [d < 0 ? 'انتهى من ' + (-d) + ' يوم' : 'ينتهي بعد ' + d + ' يوم', 'القيمة: ' + fmtMoney(g.amount || 0)],
      open: __acGo('clients.guarantees') });
  });
  if(typeof clAllClientInvoices === 'function') clAllClientInvoices().forEach(function(inv){
    if((inv.status || '') !== 'معتمد' || !inv.date) return;
    const rest = clInvNet(inv) - (Number(inv.paid) || 0);
    const age = Math.round((new Date(today) - new Date(inv.date)) / 86400000);
    if(rest > 0 && age > 30) out.push({ page: 'clients.invoices', icon: '💰', level: 'warn', kind: 'cl-unpaid', kindLabel: 'مستخلصات عملاء غير محصّلة',
      msg: 'مستخلص ' + inv.no + ' — ' + inv.customerName, issues: ['المتبقي: ' + fmtMoney(rest), 'مرّ ' + age + ' يوم على تاريخه'], project: inv.project || '',
      open: __acGo('clients.invoices', function(){ clientInvFilters.q = String(inv.no); }) });
  });
  if(typeof clAllOpportunities === 'function') clAllOpportunities().forEach(function(o){
    if(!o.nextFollowUp || o.nextFollowUp > today || o.stage === 'خسارة' || o.stage === 'فوز') return;
    out.push({ page: 'clients.crm', icon: '📞', level: 'warn', kind: 'crm-follow', kindLabel: 'متابعات CRM مستحقة',
      msg: (o.title || 'فرصة') + ' — ' + (o.customerName || ''), issues: ['موعد المتابعة: ' + o.nextFollowUp, 'المرحلة: ' + (o.stage || '')], open: __acGo('clients.crm') });
  });
  if(typeof clAllChangeOrders === 'function') clAllChangeOrders().forEach(function(v){
    if((v.status || 'مسودة') !== 'مسودة') return;
    out.push({ page: 'clients.contracts', icon: '📝', level: 'warn', kind: 'vo-draft', kindLabel: 'أوامر تغيير بانتظار الاعتماد',
      msg: 'أمر تغيير ' + (v.id || '') + ' — ' + (v.contractTitle || v.contractId), issues: [v.customerName || ''], open: __acGo('clients.contracts') });
  });
  // مشاريع بعميل ولا يوجد لها عقد
  (DATA.projects || []).forEach(function(p){
    if(!p.customerId || p.stageKey === 'study') return;
    const cur = (typeof pwCurrent === 'function') ? pwCurrent(p) : null;
    if(!cur || cur.si < 5) return;      // قبل مرحلة التعاقد بكتير
    const c = (typeof clCustomerById === 'function') ? clCustomerById(p.customerId) : null;
    const has = c && (c.contracts || []).some(function(k){ return k.project === p.name || k.projectId === p.id; });
    if(c && !has) out.push({ page: 'projects', icon: '📑', level: 'warn', kind: 'proj-nocontract', kindLabel: 'مشاريع بدون عقد',
      msg: (p.name || p.code) + ' — لا يوجد عقد مرتبط', issues: ['المرحلة: ' + cur.stage.label], project: p.name || '', open: projOpen(p) });
  });
  return out;
});

registerAlertSource('accounts', 'الحسابات والتكاليف', function(){
  const out = [];
  if(typeof projUnmatchedReport === 'function'){
    const um = projUnmatchedReport(), names = Object.keys(um);
    if(names.length) out.push({ page: 'projects', icon: '🔗', level: 'warn', kind: 'proj-unlinked', kindLabel: 'سجلات بمشروع غير مسجّل',
      msg: names.length + ' اسم مشروع مكتوب في سجلات ومالوش مشروع مسجّل', issues: names.slice(0, 6).map(function(n){ return n + ' (' + um[n] + ' سجل)'; }), open: __acGo('projects') });
  }
  if(typeof projectCostSummary !== 'function') return out;
  (DATA.projects || []).forEach(function(p){
    const c = projectCostSummary(p.name);
    if(c.budgetStatus !== 'over' && c.budgetStatus !== 'warn') return;
    out.push({ page: 'projects', icon: c.budgetStatus === 'over' ? '🔴' : '🟠', level: c.budgetStatus === 'over' ? 'danger' : 'warn', kind: 'budget', kindLabel: 'مشاريع قاربت/تجاوزت الميزانية',
      msg: (p.name || p.code) + (c.budgetStatus === 'over' ? ' — تجاوز الميزانية' : ' — قارب الميزانية'),
      issues: ['التكلفة: ' + fmtMoney(c.total), 'الميزانية: ' + fmtMoney(c.budget)], project: p.name || '',
      open: __acGo('projects', function(){ projectFilters.detailId = p.id; }) });
  });
  return out;
});

/* ---------- ملاحظات السجلات: نفس شكل notes-list بتاع الموارد البشرية على كل الكيانات ---------- */
function recordNotesCellHtml(issues){
  issues = issues || [];
  if(!issues.length) return '<span class="notes-ok">✓ مكتمل</span>';
  const show = issues.slice(0, 3), more = issues.length - show.length;
  return '<ul class="notes-list" title="' + escapeHtml(issues.join('\n')) + '">' +
    show.map(function(i){ return '<li>' + escapeHtml(i) + '</li>'; }).join('') +
    (more > 0 ? '<li class="notes-more">+' + more + ' أخرى</li>' : '') + '</ul>';
}
function customerNotesIssues(c){
  const out = [];
  if(!c.phone) out.push('ناقص: رقم الهاتف');
  if(!(c.contracts || []).length) out.push('لا يوجد عقد');
  const ids = clProjectsOfCustomer(c).length;
  if(!ids) out.push('لا توجد مشاريع');
  if(typeof clAllGuarantees === 'function') clAllGuarantees().filter(function(g){ return g.customerId === c.id; }).forEach(function(g){
    const d = clDaysUntil(g.expiryDate);
    if(clGuaranteeIsLive(g) && d != null && d <= 30) out.push('ضمان ' + (g.letterNo || g.id) + (d < 0 ? ' منتهي' : ' ينتهي بعد ' + d + ' يوم'));
  });
  return out;
}
function projectNotesIssues(p){
  const out = [];
  if(!p.customerId && !p.customerName && !p.customer) out.push('ناقص: العميل');
  if(!(Number(p.value) || Number(p.budget))) out.push('ناقص: قيمة/ميزانية');
  if(typeof pwLateSteps === 'function'){ const l = pwLateSteps(p); if(l.length) out.push(l.length + ' خطوة متأخرة في المسار'); }
  if(p.tenderStance === 'rejected') out.push('مشروع مرفوض');
  if(typeof projectCostSummary === 'function'){ const c = projectCostSummary(p.name); if(c.budgetStatus === 'over') out.push('تجاوز الميزانية'); else if(c.budgetStatus === 'warn') out.push('قارب الميزانية'); }
  return out;
}
function contractNotesIssues(k){
  const out = [], today = __acToday();
  if(k.end && k.end < today && (k.status || 'ساري') === 'ساري') out.push('انتهت مدته والحالة ما زالت «ساري»');
  else if(k.end){ const d = clDaysUntil(k.end); if(d != null && d >= 0 && d <= 30) out.push('ينتهي بعد ' + d + ' يوم'); }
  if(!k.project) out.push('ناقص: المشروع');
  if(!(Number(k.value) > 0)) out.push('ناقص: قيمة العقد');
  const dr = (k.changeOrders || []).filter(function(v){ return (v.status || 'مسودة') === 'مسودة'; }).length;
  if(dr) out.push(dr + ' أمر تغيير بانتظار الاعتماد');
  return out;
}
function clInvoiceNotesIssues(i){
  const out = [];
  if(!i.project) out.push('ناقص: المشروع');
  if(!i.contractId) out.push('غير مرتبط بعقد');
  const rest = clInvNet(i) - (Number(i.paid) || 0);
  if((i.status || '') === 'معتمد' && rest > 0 && i.date){
    const age = Math.round((new Date(__acToday()) - new Date(i.date)) / 86400000);
    if(age > 30) out.push('غير محصّل: ' + fmtMoney(rest) + ' (' + age + ' يوم)');
  }
  return out;
}
function whItemNotesIssues(it){
  const out = [], min = Number(it.minQty) || 0;
  if(!it.category) out.push('ناقص: التصنيف');
  if(min){ const q = whStockQty(it.id); if(q <= 0) out.push('نفد من المخزون'); else if(q <= min) out.push('تحت حد الطلب'); }
  return out;
}
