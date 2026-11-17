/* =========================================================
   follow-center.js — «مركز المتابعة»: لوحة تفاعلية واحدة لكل البرنامج
   مؤشرات قابلة للضغط + رسوم (SVG بدون مكتبات) + آخر الحركات + إجراءات سريعة + مركز التنبيهات.
   بيحلّ محل: نظرة عامة / لوحة الموارد البشرية / لوحة الموردين / لوحة العملاء والمشاريع.
   ========================================================= */

const FC_COLORS = ['#1B4332', '#C9A227', '#2D6A4F', '#B3261E', '#6C8EAD', '#8D6E63', '#7A9E7E', '#A0522D', '#5B7DB1', '#C27BA0', '#4F6D7A'];
var fcTaskWho = '';
var fcYear = '';

function fcSvgDonut(parts, size){
  size = size || 150;
  const total = parts.reduce(function(s, p){ return s + Math.max(0, p.value); }, 0);
  if(!total) return '<div class="alert-empty" style="margin:30px 0;">لا بيانات</div>';
  const r = size / 2 - 14, c = size / 2, circ = 2 * Math.PI * r;
  let off = 0;
  const arcs = parts.filter(function(p){ return p.value > 0; }).map(function(p, i){
    const len = p.value / total * circ;
    const s = '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="' + (p.color || FC_COLORS[i % FC_COLORS.length]) + '" stroke-width="22" stroke-dasharray="' + len + ' ' + (circ - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 ' + c + ' ' + c + ')"><title>' + escapeHtml(p.label) + ': ' + fmtMoney(p.value) + '</title></circle>';
    off += len; return s;
  }).join('');
  return '<svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '">' + arcs +
    '<text x="' + c + '" y="' + (c - 2) + '" text-anchor="middle" font-size="11" fill="#666">الإجمالي</text><text x="' + c + '" y="' + (c + 14) + '" text-anchor="middle" font-size="12" font-weight="800" fill="#1B4332">' + fcShort(total) + '</text></svg>';
}
function fcShort(n){
  n = Number(n) || 0; const a = Math.abs(n);
  if(a >= 1e6) return (n / 1e6).toFixed(1) + ' م';
  if(a >= 1e3) return (n / 1e3).toFixed(1) + ' ألف';
  return String(Math.round(n));
}
function fcLegend(parts){
  const total = parts.reduce(function(s, p){ return s + Math.max(0, p.value); }, 0) || 1;
  return '<ul class="fc-legend">' + parts.filter(function(p){ return p.value > 0; }).map(function(p, i){
    return '<li><i style="background:' + (p.color || FC_COLORS[i % FC_COLORS.length]) + '"></i><span>' + escapeHtml(p.label) + '</span><b>' + Math.round(p.value / total * 100) + '%</b></li>';
  }).join('') + '</ul>';
}
function fcBars(rows){      // شريط أفقي قابل للتحريك: كل مشروع عمودين (تكلفة / محصّل) + الأرقام
  if(!rows.length) return '<div class="alert-empty" style="margin:30px 0;">لا مشاريع عليها حركة في هذه الفترة</div>';
  const max = Math.max.apply(null, rows.map(function(r){ return Math.max(r.a, r.b); })) || 1;
  const H = 170;
  return '<div class="fc-scroll"><div class="fc-cols" style="min-width:' + (rows.length * 118) + 'px">' + rows.map(function(r){
    const ha = Math.max(2, r.a / max * H), hb = Math.max(2, r.b / max * H);
    return '<div class="fc-col" title="' + escapeHtml(r.label) + '"><div class="fc-col-bars" style="height:' + (H + 22) + 'px">' +
      '<div class="fc-bar-wrap"><span class="fc-bar-n">' + fcShort(r.a) + '</span><div class="fc-bar fc-bar-cost" style="height:' + ha + 'px"></div></div>' +
      '<div class="fc-bar-wrap"><span class="fc-bar-n">' + fcShort(r.b) + '</span><div class="fc-bar fc-bar-col" style="height:' + hb + 'px"></div></div></div>' +
      '<div class="fc-col-name">' + escapeHtml(r.label) + '</div><div class="fc-col-net ' + (r.b - r.a < 0 ? 'neg' : 'pos') + '">' + (r.b - r.a < 0 ? '−' : '+') + fcShort(Math.abs(r.b - r.a)) + '</div></div>';
  }).join('') + '</div></div><div class="fc-legend-inline"><span><i style="background:#C9A227"></i>التكلفة</span><span><i style="background:#1B4332"></i>المحصّل</span><span class="fc-hint">↔ حرّك الشريط لمشاهدة كل المشاريع</span></div>';
}
function fcHBars(rows){     // [{label,value,color}]
  const max = Math.max.apply(null, rows.map(function(r){ return r.value; }).concat([1]));
  return rows.map(function(r){
    return '<div class="fc-hbar"><span>' + escapeHtml(r.label) + '</span><div><i style="width:' + Math.round(r.value / max * 100) + '%;background:' + (r.color || '#1B4332') + '"></i></div><b>' + r.value + '</b></div>';
  }).join('');
}

function fcYears(){
  const ys = {}; const add = function(d){ const y = String(d || '').slice(0, 4); if(/^20\d\d$/.test(y)) ys[y] = 1; };
  try{ clAllClientInvoices().forEach(function(i){ add(i.date); }); }catch(e){}
  (DATA.expenses || []).forEach(function(e){ add(e.date); });
  ((DATA.ledger && DATA.ledger.invoices) || []).forEach(function(i){ add(i.date); });
  ((DATA.ledger && DATA.ledger.payments) || []).forEach(function(i){ add(i.date); });
  (DATA.costs || []).forEach(function(e){ add(e.date); });
  ys[String(new Date().getFullYear())] = 1;
  return Object.keys(ys).sort().reverse().slice(0, 8);
}
function fcData(year){
  const rows = (typeof compCostRows === 'function') ? (function(){
    const f = compCostFilters; compCostFilters = { q: '', from: year ? year + '-01-01' : '', to: year ? year + '-12-31' : '' };
    let r = []; try{ r = compCostRows(); }finally{ compCostFilters = f; }
    if(year){
      r.forEach(function(x){
        let c = 0; try{ clAllClientInvoices().forEach(function(i){ if(String(i.project || '').trim() === x.name && String(i.date || '').slice(0, 4) === year) c += Number(i.paid) || 0; }); }catch(e){}
        x.collected = Math.round(c); x.net = x.collected - x.c.total;
      });
      r = r.filter(function(x){ return x.c.total || x.collected; });
    }
    return r;
  })() : [];
  const sum = function(k){ return rows.reduce(function(s, r){ return s + (r.c[k] || 0); }, 0); };
  const cost = rows.reduce(function(s, r){ return s + r.c.total; }, 0), collected = rows.reduce(function(s, r){ return s + r.collected; }, 0);
  let stockVal = 0, low = 0, cats = {};
  try{ whItems().forEach(function(it){ const v = whStockValue(it.id); stockVal += v; const k = it.category || 'بدون تصنيف'; cats[k] = (cats[k] || 0) + v; const mn = Number(it.minQty) || 0; if(mn && whStockQty(it.id) <= mn) low++; }); }catch(e){}
  let supDebt = 0; try{ (DATA.ledger.suppliers || []).forEach(function(s){ const b = supplierBalance(s.id); if(b > 0) supDebt += b; }); }catch(e){}
  const activeProjects = (DATA.projects || []).filter(function(p){ return p.tenderStance !== 'rejected' && ['مكتمل', 'متوقف', 'ملغي'].indexOf(p.status) < 0; }).length;
  const people = (DATA.employees || []).length + (DATA.workers || []).length + (DATA.supervisors || []).length;
  return { rows: rows, sum: sum, cost: cost, collected: collected, stockVal: stockVal, low: low, cats: cats, supDebt: supDebt, activeProjects: activeProjects, people: people };
}

function fcRecent(){
  const ev = [], add = function(type, icon, ref, date, party, amt, page){ if(date) ev.push({ type: type, icon: icon, ref: ref, date: String(date).slice(0, 10), party: party || '', amt: amt, page: page }); };
  try{ clAllClientInvoices().forEach(function(i){ add('مستخلص', '🧾', i.no, i.date, i.customerName, clInvNet(i), 'clients.invoices'); }); }catch(e){}
  try{ clAllCollections().forEach(function(c){ add('تحصيل', '💰', c.id || '', c.date, c.customerName, Number(c.amount) || 0, 'clients.collections'); }); }catch(e){}
  ((DATA.ledger && DATA.ledger.invoices) || []).forEach(function(i){ add(i.isReturn ? 'مرتجع مورد' : 'فاتورة مورد', '🏭', i.invoiceNo || i.id, i.date, __bdSup(i.supplierId), Number(i.totalInvoice) || 0, 'ledger.invoices'); });
  ((DATA.ledger && DATA.ledger.payments) || []).forEach(function(p){ add('دفعة مورد', '💳', p.id || '', p.date, __bdSup(p.supplierId), Number(p.amount) || 0, 'ledger.payments'); });
  try{ whMovements().forEach(function(m){ add('حركة مخزن', '📦', m.id, m.date, whItemName(m.itemId), null, 'warehouses.home'); }); }catch(e){}
  (DATA.expenses || []).forEach(function(e){ add('مصروف', '🧮', e.project || '', e.date, '', toInt(e.amount), 'expenses'); });
  ev.sort(function(a, b){ return b.date.localeCompare(a.date); });
  return ev.slice(0, 8);
}


function fcTilesData(){
  const n = function(a){ return (a || []).length; };
  const sumBy = function(a, f){ return (a || []).reduce(function(s, x){ return s + (Number(f(x)) || 0); }, 0); };
  const L = DATA.ledger || {};
  const invs = (L.invoices || []).filter(function(i){ return !i.isReturn && !i.cancelled; });
  const rets = (L.invoices || []).filter(function(i){ return i.isReturn && !i.cancelled; });
  const disc = (L.invoices || []).filter(function(i){ return !i.isReturn && !i.cancelled && Number(i.withheld || 0) > 0; });
  const pays = L.payments || [];
  let cInv = [], cCon = [], cBoq = [], cWs = [], cCol = [];
  try{ cInv = clAllClientInvoices(); cCon = clAllContracts(); cBoq = clAllBoqs(); cWs = clAllWorkSurveys(); cCol = clAllCollections(); }catch(e){}
  let stock = 0, items = 0; try{ items = n(whItems()); whItems().forEach(function(it){ stock += whStockValue(it.id); }); }catch(e){}
  const act = function(a){ return (a || []).filter(function(x){ return x.status !== 'inactive'; }).length; };
  const exps = sumBy(DATA.expenses, function(e){ return toInt(e.amount); });
  const d = fcData();
  const money = function(v){ return { n: Number(v) || 0 }; };
  return [
    { title: 'العملاء والمشاريع', icon: '🏗️', tiles: [
      { icon: '👥', label: 'العملاء', count: n(clCustomers()), go: 'clients.customers' },
      { icon: '🏗️', label: 'المشاريع', count: n(DATA.projects), value: money(sumBy(DATA.projects, function(p){ return p.value || p.budget; })), go: 'projects' },
      { icon: '📐', label: 'أعمال الحصر', count: n(cWs), go: 'clients.workSurveys' },
      { icon: '📋', label: 'المقايسات', count: n(cBoq), go: 'clients.boqs' },
      { icon: '📑', label: 'العقود', count: n(cCon), value: money(sumBy(cCon, function(k){ return k.value; })), go: 'clients.contracts' },
      { icon: '🧾', label: 'المستخلصات', count: n(cInv), value: money(sumBy(cInv, clInvNet)), go: 'clients.invoices' },
      { icon: '🟢', label: 'مشاريع نشطة', count: d.activeProjects, go: 'projects' },
      { icon: '🛡️', label: 'الضمانات', count: n(typeof clAllGuarantees === 'function' ? clAllGuarantees() : []), go: 'clients.guarantees' } ] },
    { title: 'الموردون', icon: '🏭', tiles: [
      { icon: '🏭', label: 'الموردون', count: n(L.suppliers), go: 'ledger.suppliers' },
      { icon: '🧾', label: 'فواتير الموردين', count: n(invs), value: money(sumBy(invs, function(i){ return i.totalInvoice; })), go: 'ledger.invoices' },
      { icon: '💳', label: 'الدفعات', count: n(pays), value: money(sumBy(pays, function(p){ return p.amount; })), go: 'ledger.payments' },
      { icon: '↩️', label: 'المرتجعات', count: n(rets), value: money(sumBy(rets, function(i){ return i.totalInvoice; })), go: 'ledger.returns' },
      { icon: '💸', label: 'مستحق للموردين', count: '', value: money(d.supDebt), go: 'ledger.suppliers' },
      { icon: '🔔', label: 'إشعارات الخصم', count: n(disc), value: money(sumBy(disc, function(i){ return i.withheld; })), go: 'ledger.quarterly' } ] },
    { title: 'المخازن', icon: '📦', tiles: [
      { icon: '🏬', label: 'المخازن', count: n(whLocations()), go: 'warehouses.home' },
      { icon: '📦', label: 'الأصناف', count: items, go: 'warehouses.home' },
      { icon: '💎', label: 'قيمة المخزون', count: '', value: money(stock), go: 'warehouses.home' },
      { icon: '⚠️', label: 'تحت الحد الأدنى', count: d.low, go: 'warehouses.home', warn: d.low > 0 } ] },
    { title: 'القوى العاملة', icon: '👷', tiles: [
      { icon: '👔', label: 'الموظفون', count: n(DATA.employees), sub: act(DATA.employees) + ' نشط', go: 'employees', dept: 'employees' },
      { icon: '🧑‍🔧', label: 'العمال', count: n(DATA.workers), sub: act(DATA.workers) + ' نشط', go: 'workers', dept: 'workers' },
      { icon: '👷', label: 'المشرفون', count: n(DATA.supervisors), sub: act(DATA.supervisors) + ' نشط', go: 'supervisors', dept: 'supervisors' },
      { icon: '🧑‍🚒', label: 'السائقون', count: n(DATA.drivers), sub: act(DATA.drivers) + ' نشط', go: 'drivers', dept: 'drivers' },
      { icon: '🛻', label: 'معدات ومركبات', count: n(DATA.equipment), sub: (DATA.equipment || []).filter(function(e){ return e.status !== 'retired'; }).length + ' عاملة', go: 'equipment', dept: 'equipment' } ] },
    { title: 'المالية', icon: '💰', tiles: [
      { icon: '🧮', label: 'المصاريف الشاملة', count: n(DATA.expenses), value: money(exps), go: 'expenses' },
      { icon: '📊', label: 'التكاليف الشاملة', count: n(d.rows), sub: 'مشروع عليه تكلفة', value: money(d.cost), go: 'costs' },
      { icon: '💰', label: 'الإيرادات', count: n(cCol), sub: 'تحصيل', value: money(sumBy(cCol, function(c){ return c.amount; })), go: 'clients.collections' } ] }
  ];
}
var FC_DEPT_KINDS = {
  employees: { label: 'الموظفون', icon: '👔', arr: 'employees', page: 'employees', f: 'employeeFilters' },
  workers: { label: 'العمال', icon: '🧑‍🔧', arr: 'workers', page: 'workers', f: 'workerFilters' },
  supervisors: { label: 'المشرفون', icon: '👷', arr: 'supervisors', page: 'supervisors', f: 'supervisorFilters' },
  drivers: { label: 'السائقون', icon: '🧑‍🚒', arr: 'drivers', page: 'drivers', f: 'driverFilters' },
  equipment: { label: 'المعدات والمركبات', icon: '🛻', arr: 'equipment', page: 'equipment', f: 'equipmentFilters' }
};
function fcOpenDeptModal(kind){
  const k = FC_DEPT_KINDS[kind]; if(!k) return;
  const list = DATA[k.arr] || [];
  const deps = (typeof departmentsForKind === 'function' ? departmentsForKind(kind) : []) || [];
  const cards = [{ id: '', name: 'الكل', icon: '🗂️', c: list.length }];
  deps.forEach(function(dep){
    cards.push({ id: dep.id, name: dep.name, icon: dep.icon || k.icon, c: list.filter(function(x){ return entityDepartmentId(x) === String(dep.id); }).length });
  });
  const none = list.filter(function(x){ return !entityDepartmentId(x); }).length;
  if(none) cards.push({ id: '__none__', name: 'بدون قسم', icon: '❔', c: none });
  openModal('<div class="modal-header"><h3>' + k.icon + ' ' + k.label + ' — حسب القسم</h3><button class="modal-close" onclick="closeModal()">×</button></div>' +
    '<div class="modal-body"><div class="fc-dept-grid">' + cards.map(function(c){
      return '<button type="button" class="fc-dept-sq" data-dept-id="' + escapeHtml(String(c.id)) + '"><span class="fc-dept-ico">' + c.icon + '</span><b class="fc-dept-num">' + c.c + '</b><span class="fc-dept-name">' + escapeHtml(c.name) + '</span></button>';
    }).join('') + '</div></div>');
  document.querySelectorAll('.fc-dept-sq').forEach(function(b){
    b.addEventListener('click', function(){
      const id = b.getAttribute('data-dept-id');
      const fr = (typeof window !== 'undefined' && window[k.f]) || (typeof __hrFilters === 'function' ? __hrFilters(k.f) : null);
      if(fr){ enterEntityDeptBoard(fr, id); }
      closeModal();
      goToPage(k.page);
    });
  });
}
function fcMoneyHtml(v){
  const a = Math.abs(v); let num, unit;
  if(a >= 1e6){ num = (v / 1e6).toFixed(2); unit = 'مليون ج.م'; }
  else if(a >= 1e4){ num = (v / 1e3).toFixed(1); unit = 'ألف ج.م'; }
  else{ num = Math.round(v).toLocaleString('en'); unit = 'ج.م'; }
  return '<span class="fc-tile-val" title="' + escapeHtml(fmtMoney(v)) + '"><b>' + num + '</b><small>' + unit + '</small></span>';
}
function fcTilesHtml(){
  return '<div class="fc-groups">' + fcTilesData().map(function(g){
    return '<section class="fc-group"><h4>' + g.icon + ' ' + g.title + '</h4><div class="fc-tiles">' + g.tiles.map(function(t){
      return '<button type="button" class="fc-tile' + (t.warn ? ' is-warn' : '') + '" data-fc-go="' + t.go + '"' + (t.dept ? ' data-fc-dept="' + t.dept + '"' : '') + '><span class="fc-tile-ico">' + t.icon + '</span><span class="fc-tile-body"><span class="fc-tile-lbl">' + t.label + '</span>' +
        (t.count !== '' ? '<b class="fc-tile-num">' + t.count + '</b>' : '') + (t.value ? fcMoneyHtml(t.value.n) : '') + (t.sub ? '<span class="fc-tile-sub">' + t.sub + '</span>' : '') + '</span></button>';
    }).join('') + '</div></section>';
  }).join('') + '</div>';
}


function fcYearBar(){
  return '<div class="fc-years"><span>📅 السنة:</span><button type="button" class="ac-pill fc-year' + (fcYear ? '' : ' is-on') + '" data-year="">كل السنوات</button>' + fcYears().map(function(y){ return '<button type="button" class="ac-pill fc-year' + (fcYear === y ? ' is-on' : '') + '" data-year="' + y + '">' + y + '</button>'; }).join('') + '</div>';
}
function fcCostDetailHtml(d){
  const cols = (typeof COMP_COST_COLS !== 'undefined') ? COMP_COST_COLS : [['labor', 'عمالة'], ['equip', 'معدات'], ['fuel', 'وقود'], ['maint', 'صيانة'], ['expenses', 'مصروفات'], ['costs', 'تكاليف'], ['advances', 'سلف'], ['suppliers', 'موردون'], ['warehouse', 'مخازن']];
  const parts = cols.map(function(c, i){ return { label: c[1], value: d.sum(c[0]), color: FC_COLORS[i % FC_COLORS.length] }; });
  const total = parts.reduce(function(a, p){ return a + p.value; }, 0);
  if(!total) return '<div class="alert-empty">لا تكاليف مسجّلة بعد</div>';
  const sorted = parts.slice().sort(function(a, b){ return b.value - a.value; });
  const top = sorted[0].value || 1;
  const body = sorted.map(function(p){
    const pct = p.value / total * 100;
    return '<tr><td><i class="fc-dot" style="background:' + p.color + '"></i> ' + escapeHtml(p.label) + '</td><td>' + fmtMoney(p.value) + '</td><td>' + pct.toFixed(1) + '%</td>' +
      '<td style="width:34%"><div class="fc-meter"><span style="width:' + (p.value / top * 100) + '%;background:' + p.color + '"></span></div></td></tr>';
  }).join('');
  const topProj = d.rows.slice(0, 5).map(function(r){ return '<li><span>' + escapeHtml(r.name) + '</span><b>' + fmtMoney(r.c.total) + '</b></li>'; }).join('');
  return '<div class="fc-cost-wrap"><div class="fc-cost-donut">' + fcSvgDonut(parts, 190) + '<div class="fc-cost-total">إجمالي التكاليف<b>' + fmtMoney(total) + '</b></div></div>' +
    '<div class="fc-cost-table"><table class="data-table fc-table"><thead><tr><th>البند</th><th>القيمة</th><th>النسبة</th><th></th></tr></thead><tbody>' + body + '</tbody>' +
    '<tfoot><tr><td><b>الإجمالي</b></td><td><b>' + fmtMoney(total) + '</b></td><td>100%</td><td></td></tr></tfoot></table></div>' +
    (topProj ? '<div class="fc-cost-top"><h5>أعلى المشاريع تكلفة</h5><ul class="fc-toplist">' + topProj + '</ul></div>' : '') + '</div>';
}

var fcTaskDate = '';
function fcToday(){ return (typeof todayISO === 'function') ? todayISO() : new Date().toISOString().slice(0, 10); }
function fcPeople(){
  const out = {}; const add = function(n){ n = String(n || '').trim(); if(n) out[n] = 1; };
  (DATA.employees || []).forEach(function(x){ add(x.name); }); (DATA.supervisors || []).forEach(function(x){ add(x.name); });
  (DATA.users || []).forEach(function(x){ add(x.name || x.username); });
  return Object.keys(out);
}
function fcTasksHtml(){
  const date = fcTaskDate || fcToday();
  let assigned = []; try{ assigned = clCollectAssignedTasks(); }catch(e){}
  const daily = (DATA.dailyTasks || []).filter(function(t){ return t.date === date; });
  const doneSet = ['مكتمل', 'معتمد', 'مدفوع', 'مغلق', 'ملغي', 'مرفوض', 'مسدد', 'منتهي', 'Won', 'Lost'];
  const by = {};
  const slot = function(n){ n = String(n || '').trim() || 'بدون اسم'; return by[n] = by[n] || { daily: [], items: [] }; };
  daily.forEach(function(t){ slot(t.who).daily.push(t); });
  assigned.forEach(function(t){ slot(t.assignedTo).items.push(t); });
  const names = Object.keys(by).sort(function(a, b){ return (by[b].daily.length + by[b].items.length) - (by[a].daily.length + by[a].items.length); });
  const shown = fcTaskWho ? names.filter(function(n){ return n === fcTaskWho; }) : names;
  const openDaily = daily.filter(function(t){ return !t.done; }).length;
  const stat = function(ico, lbl, n){ return '<div class="fc-mini"><span>' + ico + '</span><b>' + n + '</b><em>' + lbl + '</em></div>'; };
  const head = '<div class="fc-mini-row">' + stat('📝', 'مهام اليوم المكتوبة', daily.length) + stat('⏳', 'لسه مفتوحة', openDaily) + stat('✅', 'مهام معيّنة (مشاريع/عقود…)', assigned.length) + stat('🧑‍💼', 'مسؤولون', names.length) + '</div>';
  const bar = '<div class="fc-task-bar"><button type="button" class="btn btn-primary btn-sm" id="fcTaskAdd">＋ مهمة جديدة</button>' +
    '<label class="fc-task-date">📅 <input type="date" class="input" id="fcTaskDate" value="' + date + '"></label>' +
    '<select id="fcTaskWho" class="input" style="max-width:220px;"><option value="">كل المسؤولين (' + names.length + ')</option>' +
    names.map(function(n){ return '<option value="' + escapeHtml(n) + '"' + (n === fcTaskWho ? ' selected' : '') + '>' + escapeHtml(n) + '</option>'; }).join('') + '</select>' +
    '<button type="button" class="btn btn-outline btn-sm" data-fc-go="tasks.my">فتح كل المهام ←</button></div>';
  if(!names.length) return head + bar + '<div class="alert-empty">لا مهام لهذا اليوم — اضغط «مهمة جديدة» لكتابة مهمة لموظف</div>';
  return head + bar + '<div class="fc-task-grid">' + shown.map(function(n){
    const x = by[n];
    const items = x.items.slice().sort(function(a, b){ return (doneSet.indexOf(a.status) >= 0 ? 1 : 0) - (doneSet.indexOf(b.status) >= 0 ? 1 : 0); });
    const open = x.daily.filter(function(t){ return !t.done; }).length + items.filter(function(t){ return doneSet.indexOf(t.status) < 0; }).length;
    return '<div class="fc-task-card"><div class="fc-task-head"><span class="fc-task-av">' + escapeHtml(String(n).trim().charAt(0) || '؟') + '</span><b>' + escapeHtml(n) + '</b><span class="fc-task-n">' + open + ' مفتوحة</span></div><ul>' +
      x.daily.map(function(t){ return '<li class="fc-daily' + (t.done ? ' is-done' : '') + '"><input type="checkbox" data-fc-tdone="' + t.id + '"' + (t.done ? ' checked' : '') + '><span class="fc-task-title">' + escapeHtml(t.text) + '<small>كتبها: ' + escapeHtml(t.by || '—') + '</small></span><button type="button" class="fc-x" data-fc-tdel="' + t.id + '" title="حذف">×</button></li>'; }).join('') +
      items.slice(0, 4).map(function(t){ const dn = doneSet.indexOf(t.status) >= 0; return '<li class="' + (dn ? 'is-done' : '') + '"><span class="fc-task-kind">' + escapeHtml(t.kind) + '</span><span class="fc-task-title">' + escapeHtml(String(t.title || t.id)) + (t.customerName ? ' — ' + escapeHtml(t.customerName) : '') + '</span><em>' + escapeHtml(t.status || '—') + '</em></li>'; }).join('') +
      (items.length > 4 ? '<li class="fc-task-more">+ ' + (items.length - 4) + ' عناصر معيّنة أخرى</li>' : '') + '</ul></div>';
  }).join('') + '</div>';
}
function fcTaskAddModal(){
  const who = fcTaskWho || '';
  openModal('<div class="modal-header"><h3>＋ مهمة جديدة</h3><button class="modal-close" onclick="closeModal()">×</button></div><div class="modal-body">' +
    '<label class="form-label">الموظف / المسؤول</label><input class="input" id="fctWho" list="fctPeople" value="' + escapeHtml(who) + '" placeholder="اختر أو اكتب الاسم"><datalist id="fctPeople">' + fcPeople().map(function(n){ return '<option value="' + escapeHtml(n) + '">'; }).join('') + '</datalist>' +
    '<label class="form-label" style="margin-top:10px;">المهمة (هيعمل إيه)</label><textarea class="input" id="fctText" rows="3" placeholder="مثال: متابعة توريد الحديد لمشروع الشروق"></textarea>' +
    '<label class="form-label" style="margin-top:10px;">التاريخ</label><input class="input" type="date" id="fctDate" value="' + (fcTaskDate || fcToday()) + '">' +
    '<div class="btn-row" style="margin-top:14px;"><button type="button" class="btn btn-primary" id="fctSave">حفظ</button><button type="button" class="btn btn-outline" onclick="closeModal()">إلغاء</button></div></div>');
  document.getElementById('fctSave')?.addEventListener('click', function(){
    const w = document.getElementById('fctWho').value.trim(), t = document.getElementById('fctText').value.trim(), dt = document.getElementById('fctDate').value || fcToday();
    if(!w || !t){ if(typeof toast === 'function') toast('اكتب اسم الموظف والمهمة'); return; }
    if(!Array.isArray(DATA.dailyTasks)) DATA.dailyTasks = [];
    let by = 'محلي'; try{ if(typeof currentUser !== 'undefined' && currentUser) by = currentUser.name || currentUser.username || by; }catch(e){}
    DATA.dailyTasks.unshift({ id: 'dt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), who: w, text: t, date: dt, done: false, by: by, at: new Date().toISOString() });
    try{ addAudit('إضافة مهمة', w + ': ' + t); }catch(e){}
    fcTaskDate = dt; fcTaskWho = '';
    saveData(true); closeModal(); rerenderCurrentPage();
  });
}

function fcLogHtml(){
  const log = (DATA.auditLog || []).slice(0, 14);
  if(!log.length) return '<div class="alert-empty">لا عمليات مسجّلة بعد</div>';
  const ico = function(a){ a = String(a || ''); return /حذف/.test(a) ? '🗑️' : /إضافة|اضافة|جديد|إنشاء/.test(a) ? '➕' : /تعديل|تحديث/.test(a) ? '✏️' : /دخول/.test(a) ? '🔑' : /دفع|سداد|تحصيل/.test(a) ? '💳' : /نسخ|استعادة/.test(a) ? '💾' : '📌'; };
  const fmt = function(iso){ try{ const d = new Date(iso); return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }); }catch(e){ return String(iso || '').slice(0, 16); } };
  return '<ul class="fc-log">' + log.map(function(a){
    return '<li><span class="fc-log-ico">' + ico(a.action) + '</span><div class="fc-log-body"><b>' + escapeHtml(a.action || '') + '</b><span>' + escapeHtml(String(a.details || '').slice(0, 140)) + '</span></div>' +
      '<div class="fc-log-meta"><span>' + escapeHtml(a.byName || a.user || 'محلي') + '</span><em>' + fmt(a.at) + '</em></div></li>';
  }).join('') + '</ul><div style="margin-top:8px;"><button type="button" class="btn btn-outline btn-sm" data-fc-go="backup">عرض السجل الكامل ←</button></div>';
}

function renderFollowCenterPage(){
  const d = fcData(fcYear);
  const alerts = (typeof collectAllAlerts === 'function') ? collectAllAlerts() : [];
  const catParts = Object.keys(d.cats).map(function(k){ return { label: k, value: d.cats[k] }; }).sort(function(a, b){ return b.value - a.value; }).slice(0, 6);
  const barRows = d.rows.map(function(r){ return { label: r.name, a: r.c.total, b: r.collected }; });
  const net = d.collected - d.cost;
  const sumChip = function(cls, lbl, v){ return '<div class="fc-sum ' + cls + '"><em>' + lbl + '</em>' + fcMoneyHtml(v) + '</div>'; };
  return '<div class="page follow-center">' +
    '<div class="fc-head"><div><h2 class="page-title" style="margin:0;">🧭 مركز المتابعة</h2><p class="page-sub" style="margin:4px 0 0;">كل البرنامج في مكان واحد — اضغط أي مؤشر أو كارت للانتقال</p></div>' +
      '<div class="btn-row"><button type="button" class="btn btn-outline btn-sm" id="fcSearch">🔍 بحث شامل</button><button type="button" class="btn btn-outline btn-sm" id="fcRefresh">↻ تحديث</button></div></div>' +
    '<section class="fc-card fc-top"><div class="fc-top-head"><h4>📊 توزيع التكلفة التفصيلي</h4>' + fcYearBar() + '</div>' + fcCostDetailHtml(d) + '</section>' +
    fcTilesHtml() +
    '<div class="fc-grid fc-grid2">' +
      '<section class="fc-card"><h4>التكلفة مقابل المحصّل — كل المشاريع' + (fcYear ? ' · ' + fcYear : '') + '</h4>' +
        '<div class="fc-sums">' + sumChip('cost', 'التكلفة', d.cost) + sumChip('col', 'المحصّل', d.collected) + sumChip(net < 0 ? 'neg' : 'pos', net < 0 ? 'عجز (المحصّل − التكلفة)' : 'فائض (المحصّل − التكلفة)', net) + '</div>' +
        fcBars(barRows) + '</section>' +
      '<section class="fc-card"><h4>المخزون حسب التصنيف</h4><div class="fc-donut fc-donut-lg">' + fcSvgDonut(catParts, 190) + fcLegend(catParts) + '</div></section>' +
    '</div>' +
    '<section class="fc-card fc-tasks" id="fctasks"><h4>✅ مهامي — مهام كل موظف</h4>' + fcTasksHtml() + '</section>' +
    '<div class="section-title" id="alerts">🔔 التنبيهات</div>' + (typeof alertCenterHtml === 'function' ? alertCenterHtml() : '') +
    '<section class="fc-card fc-logcard" id="fclog" style="margin-top:18px;"><h4>🕘 سجل عمليات النظام</h4>' + fcLogHtml() + '</section>' +
  '</div>';
}

function initFollowCenterEvents(){
  if(typeof initAlertCenterEvents === 'function') initAlertCenterEvents();
  document.getElementById('fcSearch')?.addEventListener('click', function(){ openGlobalSearch(); });
  document.getElementById('fcRefresh')?.addEventListener('click', function(){ rerenderCurrentPage(); });
  document.querySelectorAll('.btn-alerts-more').forEach(function(b){
    b.addEventListener('click', function(e){ e.stopPropagation(); openAlertsMoreModal(b.getAttribute('data-kind'), b.getAttribute('data-label'), b.getAttribute('data-page')); });
  });
  document.querySelectorAll('.fc-year').forEach(function(b){ b.addEventListener('click', function(){ fcYear = b.getAttribute('data-year'); rerenderCurrentPage(); }); });
  document.getElementById('fcTaskAdd')?.addEventListener('click', fcTaskAddModal);
  document.getElementById('fcTaskDate')?.addEventListener('change', function(e){ fcTaskDate = e.target.value; rerenderCurrentPage(); });
  document.querySelectorAll('[data-fc-tdone]').forEach(function(c){ c.addEventListener('change', function(){ const t = (DATA.dailyTasks || []).find(function(x){ return x.id === c.getAttribute('data-fc-tdone'); }); if(t){ t.done = c.checked; saveData(true); rerenderCurrentPage(); } }); });
  document.querySelectorAll('[data-fc-tdel]').forEach(function(c){ c.addEventListener('click', function(){ DATA.dailyTasks = (DATA.dailyTasks || []).filter(function(x){ return x.id !== c.getAttribute('data-fc-tdel'); }); saveData(true); rerenderCurrentPage(); }); });
  document.getElementById('fcTaskWho')?.addEventListener('change', function(e){ fcTaskWho = e.target.value; rerenderCurrentPage(); });
  document.querySelectorAll('[data-fc-go]').forEach(function(el){
    el.addEventListener('click', function(){
      const go = el.getAttribute('data-fc-go');
      const dk = el.getAttribute('data-fc-dept');
      if(dk){ fcOpenDeptModal(dk); return; }
      if(go === '#fclog'){ document.getElementById('fclog')?.scrollIntoView({ behavior: 'smooth' }); return; }
      if(go === '#alerts'){ document.getElementById('alerts')?.scrollIntoView({ behavior: 'smooth' }); return; }
      if(go === 'costs'){ window.__costTab = '__all'; }
      goToPage(go);
      const btn = el.getAttribute('data-fc-click');
      if(btn) setTimeout(function(){ const b = document.getElementById(btn); if(b && !b.disabled) b.click(); }, 120);
    });
  });
}
