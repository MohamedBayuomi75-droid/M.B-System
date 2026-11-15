/* =========================================================
   boards.js — «لوحات الأقسام» الموحّدة لكل صفحات البرنامج
   كل صفحة تبدأ بلوحات (كروت) زي صفحة الموظفين؛ الضغط على لوحة
   يطبّق فلتر القسم على الصفحة ويعرض جدولها، وزر «◀ الأقسام» يرجّع للوحات.
   التعريفات data-driven: BOARD_PAGES[pageKey] = { title, sub, filters(), field, rows(), valueOf(row),
     options(): [{value,label,icon}] (+ القيم الموجودة فعلاً في البيانات تضاف تلقائياً), addId? }
   ========================================================= */

const __boardsOpen = {};      // pageKey → true لما المستخدم دخل لوحة

function __bdDistinct(rows, valueOf){
  const seen = {}, out = [];
  (rows || []).forEach(function(r){ const v = valueOf(r); if(v != null && v !== '' && !seen[v]){ seen[v] = 1; out.push(v); } });
  return out;
}
function __bdCust(id){ try{ const c = clCustomerById(id); return c ? c.name : id; }catch(e){ return id; } }
function __bdLoc(id){ try{ const l = whLocations().find(function(x){ return x.id === id; }); return l ? l.name : id; }catch(e){ return id; } }
function __bdSup(id){ try{ const s = (DATA.ledger.suppliers || []).find(function(x){ return x.id === id; }); return s ? s.name : id; }catch(e){ return id; } }

const BOARD_PAGES = {
  'clients.customers': { title: 'العملاء', icon: '👥', field: 'seg', filters: function(){ return customerFilters; },
    rows: function(){ return clCustomers(); }, valueOf: function(c){ return clCustomerSegment(c); },
    options: function(){ return [{ value: 'active', label: 'العملاء النشطون', icon: '✅' }, { value: 'inactive', label: 'العملاء غير النشطين', icon: '⏸️' }]; },
    add: 'custAdd' },
  'projects': { title: 'المشاريع', icon: '🏗️', field: 'status', filters: function(){ return projectFilters; },
    rows: function(){ return DATA.projects || []; }, valueOf: function(p){ return normalizeProjectStatus(p); },
    options: function(){ return (typeof PROJECT_STAGES !== 'undefined' ? PROJECT_STAGES : []).map(function(s){ return { value: s.value, label: s.value, icon: '📌' }; }); },
    add: 'btnAddProject' },
  'clients.workSurveys': { title: 'أعمال الحصر', icon: '📐', field: 'status', filters: function(){ return workSurveyFilters; },
    rows: function(){ return clAllWorkSurveys(); }, valueOf: function(w){ return w.status || 'مسودة'; },
    options: function(){ return [{ value: 'مسودة', label: 'مسودة', icon: '📝' }, { value: 'معتمد', label: 'معتمد', icon: '✅' }]; } },
  'clients.boqs': { title: 'المقايسات', icon: '📋', field: 'customerId', filters: function(){ return boqFilters; },
    rows: function(){ return clAllBoqs(); }, valueOf: function(b){ return b.customerId || ''; }, labelOf: __bdCust, icon: '👤' },
  'clients.contracts': { title: 'العقود', icon: '📑', field: 'status', filters: function(){ return contractFilters; },
    rows: function(){ return clAllContracts(); }, valueOf: function(k){ return k.status || 'ساري'; },
    options: function(){ return [{ value: 'ساري', label: 'ساري', icon: '🟢' }, { value: 'منتهي', label: 'منتهي', icon: '⌛' }, { value: 'موقوف', label: 'موقوف', icon: '⏸️' }, { value: 'ملغي', label: 'ملغي', icon: '⛔' }]; } },
  'clients.invoices': { title: 'المستخلصات', icon: '🧾', field: 'status', filters: function(){ return clientInvFilters; },
    rows: function(){ return clAllClientInvoices(); }, valueOf: function(i){ return i.status || 'مسودة'; },
    options: function(){ return [{ value: 'مسودة', label: 'مسودة', icon: '📝' }, { value: 'معتمد', label: 'معتمد', icon: '✅' }]; } },
  'clients.guarantees': { title: 'الضمانات', icon: '🛡️', field: 'status', filters: function(){ return guaranteeFilters; },
    rows: function(){ return clAllGuarantees(); }, valueOf: function(g){ return clGuaranteeEffStatus(g); },
    options: function(){ return (typeof CL_GUARANTEE_STATUS !== 'undefined' ? CL_GUARANTEE_STATUS : []).map(function(s){ return { value: s, label: s, icon: '🛡️' }; }); } },
  'clients.crm': { title: 'CRM', icon: '🤝', field: 'stage', filters: function(){ return crmFilters; },
    rows: function(){ return clAllOpportunities(); }, valueOf: function(o){ return o.stage || ''; }, icon: '🎯' },
  'clients.collections': { title: 'الإيرادات', icon: '💰', field: 'customerId', filters: function(){ return collFilters; },
    rows: function(){ return clAllCollections(); }, valueOf: function(c){ return c.customerId || ''; }, labelOf: __bdCust, icon: '👤' },
  'clients.accounts': { title: 'حسابات العملاء', icon: '📒', field: 'customerId', filters: function(){ return accountsFilters; },
    rows: function(){ return clAllClientInvoices(); }, valueOf: function(i){ return i.customerId || ''; }, labelOf: __bdCust, icon: '👤' },
  'tasks.my': { title: 'مهامي', icon: '✅', field: 'kind', filters: function(){ return tasksFilters; },
    rows: function(){ return clCollectAssignedTasks(); }, valueOf: function(t){ return t.kind || ''; }, icon: '📌' },
  'warehouses.home': { title: 'المخازن', icon: '🏬', field: 'locationId', filters: function(){ return whFilters; },
    rows: function(){ return whLocations(); }, valueOf: function(l){ return l.id; }, labelOf: __bdLoc, icon: '🏬',
    countOf: function(v){ return whMovements().filter(function(m){ return m.locationId === v || m.toLocationId === v; }).length; }, unit: 'حركة' },
  'ledger.invoices': { title: 'فواتير الموردين', icon: '🧾', field: 'category', filters: function(){ return invoiceFilters; },
    rows: function(){ return (DATA.ledger.invoices || []).filter(function(i){ return !i.isReturn; }); }, valueOf: function(i){ return i.category || ''; }, icon: '🗂️' },
  'ledger.returns': { title: 'مرتجعات الموردين', icon: '↩️', field: 'category', filters: function(){ return invoiceFilters; },
    rows: function(){ return (DATA.ledger.invoices || []).filter(function(i){ return !!i.isReturn; }); }, valueOf: function(i){ return i.category || ''; }, icon: '🗂️' },
  'ledger.payments': { title: 'دفعات الموردين', icon: '💳', field: 'method', filters: function(){ return paymentsFilters; },
    rows: function(){ return DATA.ledger.payments || []; }, valueOf: function(p){ return p.method || ''; }, icon: '💳' },
  'ledger.quarterly': { title: 'إشعارات الخصم', icon: '🔔', field: 'supplierId', filters: function(){ return quarterlyFilters; },
    rows: function(){ return DATA.ledger.invoices || []; }, valueOf: function(i){ return i.supplierId || ''; }, labelOf: __bdSup, icon: '🏭' }
};

function boardsHas(pageKey){ return !!BOARD_PAGES[pageKey]; }
function boardsReset(pageKey){
  if(pageKey){ delete __boardsOpen[pageKey]; return; }
  Object.keys(__boardsOpen).forEach(function(k){ delete __boardsOpen[k]; });
}

function boardsCards(pageKey){
  const cfg = BOARD_PAGES[pageKey];
  let rows = []; try{ rows = cfg.rows() || []; }catch(e){}
  const counts = {};
  rows.forEach(function(r){ const v = cfg.valueOf(r); counts[v] = (counts[v] || 0) + 1; });
  const cards = [], seen = {};
  const base = cfg.options ? cfg.options() : [];
  base.forEach(function(o){ seen[o.value] = 1; cards.push(o); });
  Object.keys(counts).forEach(function(v){
    if(v === '' || seen[v]) return;
    seen[v] = 1; cards.push({ value: v, label: cfg.labelOf ? cfg.labelOf(v) : v, icon: cfg.icon || '📁' });
  });
  return { rows: rows, cards: cards.map(function(o){
    return { value: o.value, label: o.label, icon: o.icon, count: cfg.countOf ? cfg.countOf(o.value) : (counts[o.value] || 0) };
  }) };
}

function boardsLandingHtml(pageKey){
  const cfg = BOARD_PAGES[pageKey];
  const b = boardsCards(pageKey);
  const card = function(value, label, icon, count, hint){
    return '<button type="button" class="board-card board-gate-card" data-board-page="' + escapeHtml(pageKey) + '" data-board-value="' + escapeHtml(value) + '" style="cursor:pointer;text-align:right;">' +
      '<div class="board-card-icon" style="font-size:28px;margin-bottom:6px;">' + icon + '</div>' +
      '<div class="num" style="font-size:22px;">' + count + (cfg.unit ? ' <small style="font-size:12px;">' + cfg.unit + '</small>' : '') + '</div>' +
      '<div class="lbl" style="font-size:15px;font-weight:800;color:var(--ink);">' + escapeHtml(label) + '</div>' +
      '<div style="font-size:12px;color:var(--ink-soft);margin-top:6px;">' + (hint || 'اضغط للدخول') + '</div></button>';
  };
  return '<div class="page boards-landing" data-board-page="' + escapeHtml(pageKey) + '">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;">' +
      '<div><h2 class="page-title" style="margin:0;">' + cfg.icon + ' ' + escapeHtml(cfg.title) + '</h2>' +
      '<p class="page-sub" style="margin:4px 0 0;">اختر القسم لعرض سجلاته</p></div></div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;" class="entity-dept-boards">' +
      card('', 'الكل', '📋', b.rows.length) +
      b.cards.map(function(c){ return card(c.value, c.label, c.icon || '📁', c.count); }).join('') +
    '</div></div>';
}

/** غلاف رسم الصفحة: لوحات أول مرة، وبعد اختيار لوحة الصفحة الأصلية + شريط «◀ الأقسام» */
function boardsRender(pageKey, innerFn){
  if(!boardsHas(pageKey)) return innerFn();
  const cfg = BOARD_PAGES[pageKey];
  const f = cfg.filters() || {};
  if(f.detailId || f.detailKey) return innerFn();        // صفحة تفاصيل: بدون لوحات
  if(!__boardsOpen[pageKey]) return boardsLandingHtml(pageKey);
  const cur = f[cfg.field];
  const label = cur ? (cfg.labelOf ? cfg.labelOf(cur) : cur) : 'الكل';
  const html = innerFn();
  const bar = '<div class="boards-bar" style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">' +
    '<button type="button" class="btn btn-outline btn-sm" id="boardsBack">◀ الأقسام</button>' +
    '<span class="badge badge-info">' + cfg.icon + ' ' + escapeHtml(cfg.title) + ' · ' + escapeHtml(String(label)) + '</span></div>';
  const m = html.match(/^\s*<div class="page[^"]*"[^>]*>/);
  return m ? html.replace(m[0], m[0] + bar) : bar + html;
}

function boardsOpen(pageKey, value){
  const cfg = BOARD_PAGES[pageKey]; if(!cfg) return;
  const f = cfg.filters(); if(f) f[cfg.field] = value || '';
  if(pageKey === 'projects' && f){ f.stageSel = ''; f.customerId = ''; }
  __boardsOpen[pageKey] = true;
  try{ if(typeof resetTablePage === 'function') resetTablePage(pageKey); }catch(e){}
  rerenderCurrentPage();
}
function boardsBack(pageKey){
  const cfg = BOARD_PAGES[pageKey]; if(!cfg) return;
  const f = cfg.filters(); if(f) f[cfg.field] = '';
  if(pageKey === 'projects' && f){ f.stageSel = ''; f.customerId = ''; }
  delete __boardsOpen[pageKey];
  rerenderCurrentPage();
}

document.addEventListener('click', function(e){
  const card = e.target.closest && e.target.closest('.board-gate-card');
  if(card){ boardsOpen(card.getAttribute('data-board-page'), card.getAttribute('data-board-value')); return; }
  if(e.target && e.target.id === 'boardsBack' && typeof currentPage !== 'undefined') boardsBack(currentPage);
});


/* ---------- لوحات الموارد البشرية: صفحة رئيسية لقسم الموارد البشرية ---------- */
const HR_HOME_BOARDS = [
  { page: 'employees', icon: '👔', label: 'الموظفون', arr: 'employees', f: 'employeeFilters', dept: true },
  { page: 'supervisors', icon: '👷', label: 'المشرفون', arr: 'supervisors', f: 'supervisorFilters', dept: true },
  { page: 'workers', icon: '🧑‍🔧', label: 'العمال', arr: 'workers', f: 'workerFilters', dept: true },
  { page: 'drivers', icon: '🧑‍🚒', label: 'السائقون', arr: 'drivers', f: 'driverFilters', dept: true },
  { page: 'equipment', icon: '🛻', label: 'معدات ومركبات', arr: 'equipment', f: 'equipmentFilters', dept: true },
  { page: 'attendance', icon: '🕒', label: 'حضور الموظفين', arr: 'attendance', unit: 'سجل' },
  { page: 'workerAttendance', icon: '📅', label: 'اليوميات', arr: 'workerAttendance', unit: 'سجل' },
  { page: 'leaves', icon: '🏖️', label: 'الإجازات', arr: 'leaves', unit: 'إجازة' },
  { page: 'performance', icon: '⭐', label: 'تقييم الأداء', arr: 'performanceReviews', unit: 'تقييم' }
];
function __hrFilters(name){ try{ return eval(name); }catch(e){ return null; } }
function renderHrHomePage(){
  const cards = HR_HOME_BOARDS.map(function(b){
    const list = DATA[b.arr] || [];
    let sub = '', chips = '';
    if(b.dept){
      const act = list.filter(function(x){ return x.status !== 'inactive' && x.status !== 'retired'; }).length;
      sub = act + ' نشط';
      const kind = b.arr;
      const deps = (typeof departmentsForKind === 'function' ? departmentsForKind(kind) : []).map(function(d){
        return { id: d.id, name: d.name, c: list.filter(function(x){ return entityDepartmentId(x) === String(d.id); }).length };
      }).filter(function(d){ return d.c > 0; }).sort(function(a, c){ return c.c - a.c; });
      const none = list.filter(function(x){ return !entityDepartmentId(x); }).length;
      chips = deps.slice(0, 4).map(function(d){ return '<span class="hrh-chip" data-hrh-dept="' + escapeHtml(String(d.id)) + '"><b>' + d.c + '</b> ' + escapeHtml(d.name) + '</span>'; }).join('') +
        (deps.length > 4 ? '<span class="hrh-chip hrh-more">+' + (deps.length - 4) + ' أقسام</span>' : '') +
        (none ? '<span class="hrh-chip" data-hrh-dept="__none__"><b>' + none + '</b> بدون قسم</span>' : '');
      if(!chips) chips = '<span class="hrh-empty">لا أقسام بعد</span>';
    } else {
      sub = b.unit || '';
    }
    return '<div class="hrh-card" role="button" tabindex="0" data-hrh-page="' + b.page + '" data-hrh-kind="' + (b.dept ? b.arr : '') + '"><div class="hrh-top"><span class="hrh-ico">' + b.icon + '</span><div><div class="hrh-lbl">' + b.label + '</div><div class="hrh-sub">' + escapeHtml(sub) + '</div></div><b class="hrh-num">' + list.length + '</b></div>' +
      (b.dept ? '<div class="hrh-chips">' + chips + '</div>' : '') + '<div class="hrh-go">اضغط للدخول ←</div></div>';
  }).join('');
  return '<div class="page hr-home"><div class="fc-head"><div><h2 class="page-title" style="margin:0;">👥 لوحات الموارد البشرية</h2><p class="page-sub" style="margin:4px 0 0;">اضغط أي لوحة للدخول — ولوحات الأقسام جواها</p></div></div><div class="hrh-grid">' + cards + '</div></div>';
}
function initHrHomeEvents(){
  const open = function(card, deptId){
    const page = card.getAttribute('data-hrh-page'), kind = card.getAttribute('data-hrh-kind');
    if(kind){
      const fr = __hrFilters((HR_HOME_BOARDS.find(function(b){ return b.page === page; }) || {}).f);
      if(fr){ if(deptId != null) enterEntityDeptBoard(fr, deptId); else backToEntityDeptBoards(fr); }
    }
    goToPage(page, true);
  };
  document.querySelectorAll('.hrh-card').forEach(function(card){
    card.addEventListener('click', function(e){
      const chip = e.target.closest('[data-hrh-dept]');
      if(chip){ open(card, chip.getAttribute('data-hrh-dept')); return; }
      open(card, null);
    });
    card.addEventListener('keydown', function(e){ if(e.key === 'Enter') open(card, null); });
  });
}

/* ---------- صفحات رئيسية (لوحات) لكل قسم ما عدا الإعدادات ---------- */
const SECTION_PAGE_META = {
  'clients.customers': { icon: '👥', unit: 'عميل', n: function(){ return clCustomers().length; } },
  'projects': { icon: '🏗️', unit: 'مشروع', n: function(){ return (DATA.projects || []).length; } },
  'clients.workSurveys': { icon: '📐', unit: 'حصر', n: function(){ return clAllWorkSurveys().length; } },
  'clients.boqs': { icon: '📋', unit: 'مقايسة', n: function(){ return clAllBoqs().length; } },
  'clients.contracts': { icon: '📑', unit: 'عقد', n: function(){ return clAllContracts().length; } },
  'clients.invoices': { icon: '🧾', unit: 'مستخلص', n: function(){ return clAllClientInvoices().length; } },
  'clients.guarantees': { icon: '🛡️', unit: 'ضمان', n: function(){ return clAllGuarantees().length; } },
  'clients.comparison': { icon: '⚖️' },
  'clients.crm': { icon: '🤝', unit: 'فرصة', n: function(){ return clAllOpportunities().length; } },
  'ledger.suppliers': { icon: '🏭', unit: 'مورد', n: function(){ return (DATA.ledger.suppliers || []).length; } },
  'ledger.invoices': { icon: '🧾', unit: 'فاتورة', n: function(){ return (DATA.ledger.invoices || []).filter(function(i){ return !i.isReturn; }).length; } },
  'ledger.quarterly': { icon: '🔔', unit: 'إشعار', n: function(){ return (DATA.ledger.invoices || []).filter(function(i){ return !i.isReturn && Number(i.withheld || 0) > 0; }).length; } },
  'ledger.returns': { icon: '↩️', unit: 'مرتجع', n: function(){ return (DATA.ledger.invoices || []).filter(function(i){ return i.isReturn; }).length; } },
  'warehouses.home': { icon: '🏬', unit: 'مخزن', n: function(){ return whLocations().length; } },
  'warehouses.reports': { icon: '📊' },
  'transfers': { icon: '🔄', unit: 'حركة', n: function(){ return (DATA.resourceTransfers || []).length; } },
  'workerDues': { icon: '💵', unit: 'عامل', n: function(){ return (DATA.workers || []).length; } },
  'ledger.payments': { icon: '💳', unit: 'دفعة', n: function(){ return (DATA.ledger.payments || []).length; } },
  'expenses': { icon: '🧮', unit: 'مصروف', n: function(){ return (DATA.expenses || []).length; } },
  'costs': { icon: '📊' },
  'clients.collections': { icon: '💰', unit: 'تحصيل', n: function(){ return clAllCollections().length; } },
  'clients.accounts': { icon: '📒', unit: 'عميل', n: function(){ return clCustomers().length; } },
  'reports': { icon: '📈' }, 'clients.reports': { icon: '📈' }, 'ledger.reports': { icon: '📈' }, 'accounts.reports': { icon: '📈' },
  'archive': { icon: '🗄️' }, 'ledger.archive': { icon: '🗄️' }, 'clients.archive': { icon: '🗄️' }
};
function sectionHomeKey(sec){ return sec.id === 'hr' ? 'hrHome' : 'home_' + sec.id; }
function sectionHasHome(sec){
  if(!sec || ['settings', 'general', 'tasks'].indexOf(sec.id) >= 0) return false;
  return sec.pages.filter(function(p){ return p[0] !== 'hrHome' && pageVisible(p[0]); }).length > 1;
}
function renderSectionHome(secId){
  if(secId === 'hr') return renderHrHomePage();
  const sec = NAV_SECTIONS.find(function(x){ return x.id === secId; });
  if(!sec) return '';
  const cards = sec.pages.filter(function(p){ return pageVisible(p[0]); }).map(function(p){
    const m = SECTION_PAGE_META[p[0]] || { icon: '📄' };
    let n = null; try{ if(m.n) n = m.n(); }catch(e){}
    return '<div class="hrh-card" role="button" tabindex="0" data-hrh-page="' + p[0] + '" data-hrh-kind=""><div class="hrh-top"><span class="hrh-ico">' + m.icon + '</span><div><div class="hrh-lbl">' + escapeHtml(p[1]) + '</div><div class="hrh-sub">' + escapeHtml(m.unit || '') + '</div></div>' +
      (n == null ? '' : '<b class="hrh-num">' + n + '</b>') + '</div><div class="hrh-go">اضغط للدخول ←</div></div>';
  }).join('');
  return '<div class="page hr-home"><div class="fc-head"><div><h2 class="page-title" style="margin:0;">' + escapeHtml(sec.label) + '</h2><p class="page-sub" style="margin:4px 0 0;">اضغط أي لوحة للدخول</p></div></div><div class="hrh-grid">' + cards + '</div></div>';
}
/** شريط «◀ لوحات القسم» فوق صفحات كل قسم (بدل صف الصفحات العلوي) */
function hrBackBarWrap(page, html){
  if(!html || String(page).indexOf('home_') === 0 || page === 'hrHome') return html;
  const sec = sectionOfPage(page);
  if(!sectionHasHome(sec) || !sec.pages.some(function(p){ return p[0] === page; })) return html;
  const label = (sec.pages.find(function(p){ return p[0] === page; }) || [])[1] || '';
  const bar = '<div class="hr-backbar"><button type="button" class="btn btn-outline btn-sm" id="hrBackHome" data-home="' + sectionHomeKey(sec) + '">◀ ' + escapeHtml(sec.label) + '</button><span class="badge badge-info">' + escapeHtml(label) + '</span></div>';
  const m = String(html).match(/^\s*<div class="page[^"]*"[^>]*>/);
  return m ? html.replace(m[0], m[0] + bar) : bar + html;
}
document.addEventListener('click', function(e){
  const b = e.target && e.target.closest && e.target.closest('#hrBackHome');
  if(b) goToPage(b.getAttribute('data-home') || 'hrHome', true);
});
