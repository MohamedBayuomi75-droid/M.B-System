/* =========================================================
   صفحة التكاليف
   تكلفة = مبلغ دفعه (أو تحمّله) عامل / مشرف / سائق / موظف للشغل → هو ليه علينا.
   كل تكلفة بتتجمع تلقائياً مع مستحقاته (جنب البدلات والمكافآت) في:
   شاشات المستحقات، كشوف الحساب (ولها جدول خاص فيها)، كشف المشرف، والتقارير.
   ========================================================= */

let costFilters = { q: '', personKind: '', personId: '', item: '', project: '', from: '', to: '' };

/* ===================== بنود التكاليف (نفس فكرة بنود المصروفات) ===================== */
const COST_ITEM_DEFAULTS = ['مواصلات','خامات','أدوات ومعدات صغيرة','إصلاح وصيانة','وقود','إقامة وإعاشة','اتصالات','شحن ونقل','مصاريف نثرية'];
function ensureCostItemPool(){
  DATA.costItemPools = (DATA.costItemPools && typeof DATA.costItemPools === 'object') ? DATA.costItemPools : {};
  DATA.costItemHidden = (DATA.costItemHidden && typeof DATA.costItemHidden === 'object') ? DATA.costItemHidden : {};
  ['worker','supervisor','driver','employee','equipment'].forEach(k=>{
    if(!Array.isArray(DATA.costItemPools[k])) DATA.costItemPools[k] = [];
    if(!Array.isArray(DATA.costItemHidden[k])) DATA.costItemHidden[k] = [];
  });
}
/** سطور التكلفة: السجلات القديمة (item + amount) بتتحول لسطر واحد */
function costLines(c){
  if(c && Array.isArray(c.lines) && c.lines.length) return c.lines.map(l=>({ item: String(l.item||l.label||'').trim(), amount: toInt(l.amount) }));
  return [{ item: String((c && c.item) || '').trim(), amount: toInt(c && c.amount) }];
}
/** نص البند للعرض: بند واحد = اسمه، أكتر من بند = "بند 50 + بند 30" */
function costItemText(c){
  const ls = costLines(c).filter(l=>l.item || l.amount);
  if(ls.length <= 1) return (ls[0] && ls[0].item) || '';
  return ls.map(l=>(l.item||'بدون بند')+' '+fmtNum(l.amount)).join(' + ');
}
function costItemSuggestions(kind){
  ensureCostItemPool();
  const hidden = new Set((DATA.costItemHidden[kind]||[]).map(x=>String(x).trim()));
  const set = new Set();
  COST_ITEM_DEFAULTS.forEach(x=>set.add(x));
  (DATA.costItemPools[kind]||[]).forEach(x=>{ const v=String(x||'').trim(); if(v) set.add(v); });
  (DATA.costs||[]).forEach(c=>{ if(c && c.personKind===kind) costLines(c).forEach(l=>{ if(l.item) set.add(l.item); }); });
  return Array.from(set).filter(x=>!hidden.has(x)).sort((a,b)=>a.localeCompare(b,'ar'));
}
function saveCostItemSuggestion(label, kind){
  const v = String(label||'').trim(); if(!v) return;
  ensureCostItemPool();
  const hidIdx = DATA.costItemHidden[kind].indexOf(v); if(hidIdx>=0) DATA.costItemHidden[kind].splice(hidIdx,1);
  if(COST_ITEM_DEFAULTS.indexOf(v)<0 && DATA.costItemPools[kind].indexOf(v)<0) DATA.costItemPools[kind].push(v);
}
function removeCostItemSuggestion(label, kind){
  const v = String(label||'').trim(); ensureCostItemPool();
  DATA.costItemPools[kind] = DATA.costItemPools[kind].filter(x=>x!==v);
  if(DATA.costItemHidden[kind].indexOf(v)<0) DATA.costItemHidden[kind].push(v);   // يخفي الافتراضي / المستخدم من القائمة (السجلات القديمة ما بتتأثرش)
}
function renameCostItemSuggestion(oldLabel, newLabel, kind){
  const o = String(oldLabel||'').trim(), n = String(newLabel||'').trim();
  if(!o || !n || o===n) return;
  ensureCostItemPool();
  removeCostItemSuggestion(o, kind); saveCostItemSuggestion(n, kind);
  (DATA.costs||[]).forEach(c=>{
    if(!c || c.personKind!==kind) return;
    let touched = false;
    if(Array.isArray(c.lines)) c.lines.forEach(l=>{ if(String(l.item||'').trim()===o){ l.item = n; touched = true; } });
    if(String(c.item||'').trim()===o){ c.item = n; touched = true; }
    if(touched && Array.isArray(c.lines)) c.item = c.lines.length===1 ? c.lines[0].item : c.lines.map(l=>l.item).filter(Boolean).join(' + ');
  });
}

function filteredCosts(){
  let list = (DATA.costs || []).filter(Boolean).slice();
  const f = costFilters || {};
  if(f.personKind) list = list.filter(c => c.personKind === f.personKind);
  if(f.personId) list = list.filter(c => c.personId === f.personId);
  if(f.item) list = list.filter(c => costLines(c).some(l => l.item === f.item));
  if(f.project) list = list.filter(c => String(c.project || '').toLowerCase().indexOf(String(f.project).toLowerCase()) >= 0);
  if(f.from) list = list.filter(c => (c.date || '') >= f.from);
  if(f.to) list = list.filter(c => (c.date || '') <= f.to);
  if(f.q && String(f.q).trim()){
    list = list.filter(c => smartMatch([costPersonName(c), costItemText(c), c.notes, c.project].join(' '), f.q));
  }
  list.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(costPersonName(a)).localeCompare(String(costPersonName(b)), 'ar'));
  return list;
}

/** الرصيد الحالي (كل الفترات) للشخص — موجب = مستحق له علينا */
function costPersonBalance(kind, id){
  try{
    if(kind === 'worker') return workerBalance(id);
    if(kind === 'driver') return driverBalance(id);
    if(kind === 'employee') return employeeBalance(id);
    if(kind === 'supervisor') return supervisorWageStatement(id).totalBal;
  }catch(_e){}
  return 0;
}

function costItemsUsed(){
  const set = new Set();
  (DATA.costs || []).forEach(c => { if(c) costLines(c).forEach(l => { if(l.item) set.add(l.item); }); });
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
}

function renderCostsPage(){
  DATA.costs = DATA.costs || [];
  DATA.costSections = DATA.costSections || {};
  const COST_KIND_TABS = [
    { id:'workers', label:'العمال', kind:'worker', icon:'🧑‍🔧' },
    { id:'supervisors', label:'المشرفون', kind:'supervisor', icon:'👷' },
    { id:'drivers', label:'السائقون', kind:'driver', icon:'🧑‍🚒' },
    { id:'employees', label:'الموظفين', kind:'employee', icon:'👔' },
    { id:'equipment', label:'المعدات والمركبات', kind:'equipment', icon:'🛻' }
  ];
  const tab = window.__costTab || '';
  if(tab === '__all' && typeof comprehensiveCostsPageHtml === 'function') return comprehensiveCostsPageHtml('costs');
  // المستوى 1: لوحات الفئات
  if(!tab){
    const counts = {}, totals = {};
    COST_KIND_TABS.forEach(t=>{
      const items = (DATA.costs||[]).filter(c=>c && c.personKind===t.kind);
      counts[t.id] = items.length;
      totals[t.id] = toInt(items.reduce((s,c)=>s+toInt(c.amount),0));
    });
    return `<div class="page">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:18px;">
        <div>
          <h2 class="page-title" style="margin:0;">التكاليف</h2>
          <p class="page-sub" style="margin:4px 0 0;">اختر فئة للدخول وإدارة التكاليف والأقسام</p>
        </div>
        <div class="btn-row page-header-actions">
          ${typeof pageExportButtonsHtml==='function'?pageExportButtonsHtml():''}
        </div>
      </div>
      <div class="board-grid exp-kind-boards">
        ${typeof comprehensiveCostsBoardCard==='function' ? comprehensiveCostsBoardCard('data-cost-tab') : ''}
        ${COST_KIND_TABS.map(t=>`
          <button type="button" class="board-card cost-kind-board" data-cost-tab="${t.id}">
            <div class="board-card-icon">${t.icon||'📁'}</div>
            <div class="board-card-title">${escapeHtml(t.label)}</div>
            <div class="board-card-meta">
              <span>${counts[t.id]||0} سجل</span>
              <span class="board-card-amt">${fmtMoney(totals[t.id]||0)}</span>
            </div>
          </button>`).join('')}
      </div>
    </div>`;
  }

  const tabDef = COST_KIND_TABS.find(t=>t.id===tab) || COST_KIND_TABS[0];
  const kind = tabDef.kind;
  const secFilter = window.__costSection || '';
  if(!Array.isArray(DATA.costSections[tab])) DATA.costSections[tab] = [];
  const sections = DATA.costSections[tab];

  // المستوى 2: لوحات الأقسام داخل الفئة
  if(!secFilter && !window.__costShowAll){
    const allItems = (DATA.costs||[]).filter(c=>c && c.personKind===kind);
    const allCnt = allItems.length;
    const allTot = toInt(allItems.reduce((s,c)=>s+toInt(c.amount),0));
    return `<div class="page">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div>
          <button type="button" class="btn btn-outline btn-sm" id="btnCostBackKinds">← كل التكاليف</button>
          <h2 class="page-title" style="margin:10px 0 0;">${escapeHtml(tabDef.label)}</h2>
          <p class="page-sub" style="margin:4px 0 0;">أقسام التكاليف — اضغط لوحة للدخول أو أضف قسماً جديداً</p>
        </div>
        <div class="btn-row page-header-actions">
          <button type="button" class="btn btn-outline btn-sm" id="btnCostAddSec" ${readOnlyMode?'disabled':''}>إضافة قسم</button>
          <button type="button" class="btn btn-outline btn-sm" id="btnCostRenSec" ${readOnlyMode?'disabled':''}>تعديل قسم</button>
          <button type="button" class="btn btn-outline btn-sm" id="btnCostDelSec" ${readOnlyMode?'disabled':''}>حذف قسم</button>
          <button class="btn btn-primary" id="btnAddCost" ${readOnlyMode?'disabled':''}>+ إضافة تكلفة</button>
        </div>
      </div>
      <div class="board-grid exp-sec-boards">
        <button type="button" class="board-card cost-sec-board" data-cost-sec="" data-show-all="1">
          <div class="board-card-icon">📂</div>
          <div class="board-card-title">الكل</div>
          <div class="board-card-meta"><span>${allCnt} سجل</span><span class="board-card-amt">${fmtMoney(allTot)}</span></div>
        </button>
        ${sections.map(s=>{
          const items = allItems.filter(c=>(c.section||'')===s);
          const cnt = items.length;
          const tot = toInt(items.reduce((a,c)=>a+toInt(c.amount),0));
          return `<button type="button" class="board-card cost-sec-board" data-cost-sec="${escapeHtml(s)}">
            <div class="board-card-icon">📁</div>
            <div class="board-card-title">${escapeHtml(s)}</div>
            <div class="board-card-meta"><span>${cnt} سجل</span><span class="board-card-amt">${fmtMoney(tot)}</span></div>
          </button>`;
        }).join('')}
      </div>
    </div>`;
  }

  // المستوى 3: جدول التكاليف
  let rows = (DATA.costs||[]).filter(c=>c && c.personKind===kind);
  if(secFilter) rows = rows.filter(c=>(c.section||'')===secFilter);
  const f = costFilters || {};
  if(f.q){
    const q = f.q.trim();
    rows = rows.filter(c => smartMatch(costPersonName(c), q) || smartMatch(costItemText(c), q) || smartMatch(c.notes, q) || smartMatch(c.project, q));
  }
  if(f.item) rows = rows.filter(c => costLines(c).some(l => l.item === f.item));
  if(f.project) rows = rows.filter(c => (c.project||'').includes(f.project));
  if(f.from) rows = rows.filter(c => (c.date||'') >= f.from);
  if(f.to) rows = rows.filter(c => (c.date||'') <= f.to);
  rows.sort((a,b)=>(b.date||'').localeCompare(a.date||''));

  const total = toInt(rows.reduce((s,c)=>s+toInt(c.amount),0));
  try{
    if(typeof setPageExport==='function'){
      const per = (f.from||f.to) ? (' من '+(f.from?fmtDate(f.from):'…')+' إلى '+(f.to?fmtDate(f.to):'…')) : '';
      const sec = secFilter ? (' — '+secFilter) : '';
      setPageExport('تكاليف-'+(tabDef.label||'')+sec+per,
        ['التاريخ','الفئة','الاسم','البند','القسم','المشروع','ملاحظات','المبلغ'],
        rows.map(c=>[c.date, costKindLabel(c.personKind), costPersonName(c), costItemText(c), c.section||'', c.project||'', c.notes||'', toInt(c.amount)]));
    }
  }catch(_e){}
  const pg = paginateRows(rows, 'costs');
  const items = costItemsUsed();
  const secTitle = secFilter || 'الكل';
  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div>
          <button type="button" class="btn btn-outline btn-sm" id="btnCostBackSecs">← أقسام ${escapeHtml(tabDef.label)}</button>
          <h2 class="page-title" style="margin:10px 0 0;">${escapeHtml(tabDef.label)} — ${escapeHtml(secTitle)}</h2>
        </div>
        <div class="btn-row page-header-actions" style="display:flex;flex-wrap:nowrap;gap:8px;align-items:center;">
          ${typeof pageExportButtonsHtml==='function'?pageExportButtonsHtml():''}
          <button class="btn btn-primary" id="btnAddCost" ${readOnlyMode?'disabled':''}>+ إضافة تكلفة</button>
        </div>
      </div>
      <div class="filters-bar">
        <input type="search" id="cstSearch" class="input" placeholder="بحث: اسم، بند..." value="${escapeHtml(f.q||'')}">
        <select id="cstItem" class="input"><option value="">البند: الكل</option>
          ${items.map(i=>`<option value="${escapeHtml(i)}" ${f.item===i?'selected':''}>${escapeHtml(i)}</option>`).join('')}
        </select>
        <input type="search" id="cstProject" class="input" placeholder="المشروع..." value="${escapeHtml(f.project||'')}">
        <label>من <input type="date" id="cstFrom" class="input" value="${escapeHtml(f.from||'')}"></label>
        <label>إلى <input type="date" id="cstTo" class="input" value="${escapeHtml(f.to||'')}"></label>
        <button class="btn btn-outline btn-sm" id="cstApply">تطبيق</button>
        <button class="btn btn-outline btn-sm" id="cstClear">مسح</button>
      </div>
      <div class="stats-row" style="margin-bottom:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;">
        <div class="stat-card"><div class="num">${rows.length}</div><div class="lbl">عدد التكاليف</div></div>
        <div class="stat-card ${total?'debt':''}"><div class="num">${fmtMoney(total)}</div><div class="lbl">الإجمالي</div></div>
      </div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>التاريخ</th><th>الاسم</th><th>البند</th><th>القسم</th><th>المشروع</th><th>ملاحظات</th><th>المبلغ</th><th></th></tr></thead>
        <tbody>
          ${pg.pageRows.length ? pg.pageRows.map(c=>`<tr>
            <td>${fmtDate(c.date)}</td>
            <td><strong>${escapeHtml(costPersonName(c))}</strong></td>
            <td>${escapeHtml(costItemText(c))}</td>
            <td>${escapeHtml(c.section||'—')}</td>
            <td>${escapeHtml(c.project||'—')}</td>
            <td>${escapeHtml(c.notes||'')}</td>
            <td style="font-weight:700;">${fmtMoney(c.amount)}</td>
            <td style="white-space:nowrap;">
              <button type="button" class="icon-btn btn-edit-cst" data-id="${c.id}" title="تعديل">✏️</button>
              <button type="button" class="icon-btn icon-del btn-del-cst" data-id="${c.id}" ${readOnlyMode?'disabled':''} title="حذف">🗑️</button>
            </td>
          </tr>`).join('') : '<tr><td colspan="8" style="text-align:center;color:var(--ink-soft);padding:28px;">لا تكاليف — اضغط «+ إضافة تكلفة»</td></tr>'}
        </tbody>
      </table></div>
      ${tablePagerHtml('costs', pg)}
    </div>`;
}

function initCostsEvents(){
  const COST_KIND_TABS = [
    { id:'workers', label:'العمال', kind:'worker' },
    { id:'supervisors', label:'المشرفون', kind:'supervisor' },
    { id:'drivers', label:'السائقون', kind:'driver' },
    { id:'employees', label:'الموظفين', kind:'employee' },
    { id:'equipment', label:'المعدات والمركبات', kind:'equipment' }
  ];
  document.querySelectorAll('.cost-kind-board').forEach(b=>{
    b.addEventListener('click', ()=>{
      window.__costTab = b.getAttribute('data-cost-tab') || '';
      window.__costSection = '';
      window.__costShowAll = false;
      rerenderCurrentPage();
    });
  });
  document.querySelectorAll('.cost-sec-board').forEach(b=>{
    b.addEventListener('click', ()=>{
      const all = b.getAttribute('data-show-all') === '1';
      window.__costShowAll = all;
      window.__costSection = all ? '' : (b.getAttribute('data-cost-sec') || '');
      if(typeof resetTablePage==='function') resetTablePage('costs');
      rerenderCurrentPage();
    });
  });
  document.getElementById('btnCostBackKinds')?.addEventListener('click', ()=>{
    window.__costTab = ''; window.__costSection = ''; window.__costShowAll = false;
    rerenderCurrentPage();
  });
  document.getElementById('btnCostBackSecs')?.addEventListener('click', ()=>{
    window.__costSection = ''; window.__costShowAll = false;
    rerenderCurrentPage();
  });
  document.getElementById('btnCostAddSec')?.addEventListener('click', ()=>{
    const tab = window.__costTab || '';
    openModal(`
      <div class="modal-header"><h3>إضافة قسم تكاليف</h3><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="modal-body"><label>اسم القسم *<input class="input" id="costSecName" placeholder="مثال: مواقع، ورشة..."></label></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-primary" id="btnDoCostSec">إضافة</button>
      </div>`);
    document.getElementById('btnDoCostSec')?.addEventListener('click', ()=>{
      const name = (document.getElementById('costSecName')?.value||'').trim();
      if(!name){ showToast('أدخل الاسم'); return; }
      DATA.costSections = DATA.costSections || {};
      if(!Array.isArray(DATA.costSections[tab])) DATA.costSections[tab] = [];
      if(DATA.costSections[tab].includes(name)){ showToast('موجود'); return; }
      DATA.costSections[tab].push(name);
      saveData(true); closeModal(); showToast('تم'); rerenderCurrentPage();
    });
  });
  document.getElementById('btnCostRenSec')?.addEventListener('click', ()=>{
    const tab = window.__costTab || '';
    DATA.costSections = DATA.costSections || {};
    const all = Array.isArray(DATA.costSections[tab]) ? DATA.costSections[tab] : [];
    if(!all.length){ showToast('لا أقسام — أضف قسماً أولاً'); return; }
    openModal(`
      <div class="modal-header"><h3>تعديل قسم</h3><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="modal-body">
        <label>القسم<select class="input" id="costRenOld">${all.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}</select></label>
        <label>الاسم الجديد<input class="input" id="costRenNew"></label>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-primary" id="btnDoCostRen">حفظ</button>
      </div>`);
    document.getElementById('btnDoCostRen')?.addEventListener('click', ()=>{
      const old = document.getElementById('costRenOld')?.value;
      const neu = (document.getElementById('costRenNew')?.value||'').trim();
      if(!old||!neu){ showToast('أدخل الاسم'); return; }
      DATA.costSections[tab] = all.map(s=>s===old?neu:s);
      (DATA.costs||[]).forEach(c=>{ if(c.section===old) c.section=neu; });
      if(window.__costSection===old) window.__costSection=neu;
      saveData(true); closeModal(); showToast('تم'); rerenderCurrentPage();
    });
  });
  document.getElementById('btnCostDelSec')?.addEventListener('click', ()=>{
    const tab = window.__costTab || '';
    const list = (DATA.costSections && DATA.costSections[tab]) || [];
    if(!list.length){ showToast('لا أقسام'); return; }
    openModal(`
      <div class="modal-header"><h3>حذف قسم</h3><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="modal-body"><label>القسم<select class="input" id="costDelSec">${list.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}</select></label></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-primary" id="btnDoCostDel">حذف</button>
      </div>`);
    document.getElementById('btnDoCostDel')?.addEventListener('click', ()=>{
      const name = document.getElementById('costDelSec')?.value;
      if(!name) return;
      confirmDelete('حذف القسم؟').then(ok=>{ if(!ok) return;
        DATA.costSections[tab] = list.filter(s=>s!==name);
        (DATA.costs||[]).forEach(c=>{ if(c.section===name) c.section=''; });
        if(window.__costSection===name) window.__costSection='';
        saveData(true); closeModal(); showToast('تم'); rerenderCurrentPage();
      });
    });
  });

  const apply = () => {
    costFilters.q = document.getElementById('cstSearch')?.value || '';
    costFilters.item = document.getElementById('cstItem')?.value || '';
    costFilters.project = document.getElementById('cstProject')?.value || '';
    costFilters.from = document.getElementById('cstFrom')?.value || '';
    costFilters.to = document.getElementById('cstTo')?.value || '';
    if(typeof resetTablePage === 'function') resetTablePage('costs');
    rerenderCurrentPage();
  };
  document.getElementById('cstApply')?.addEventListener('click', apply);
  document.getElementById('cstClear')?.addEventListener('click', () => {
    costFilters = { q: '', personKind: '', personId: '', item: '', project: '', from: '', to: '' };
    if(typeof resetTablePage === 'function') resetTablePage('costs');
    rerenderCurrentPage();
  });
  document.getElementById('cstSearch')?.addEventListener('keydown', e => { if(e.key === 'Enter') apply(); });
  document.getElementById('cstItem')?.addEventListener('change', apply);

  document.getElementById('btnAddCost')?.addEventListener('click', () => {
    const tab = window.__costTab || '';
    const tabDef = COST_KIND_TABS.find(t=>t.id===tab);
    const preset = {};
    if(tabDef) preset.personKind = tabDef.kind;
    if(window.__costSection) preset.section = window.__costSection;
    openCostModal(null, preset);
  });
  document.querySelectorAll('.btn-edit-cst').forEach(b => b.addEventListener('click', () => openCostModal(b.getAttribute('data-id'))));
  document.querySelectorAll('.btn-del-cst').forEach(b => b.addEventListener('click', () => {
    const id = b.getAttribute('data-id');
    confirmDelete().then(ok => {
      if(!ok) return;
      const c = (DATA.costs || []).find(x => x.id === id);
      DATA.costs = (DATA.costs || []).filter(x => x.id !== id);
      if(c) addAudit('حذف تكلفة', costPersonName(c) + ' — ' + toInt(c.amount));
      saveData(true); showToast('تم الحذف'); rerenderCurrentPage();
    });
  }));
}

function costSectionsFor(tabId){
  DATA.costSections = DATA.costSections || {};
  if(!Array.isArray(DATA.costSections[tabId])) DATA.costSections[tabId] = [];
  return DATA.costSections[tabId];
}
function costTabIdForKind(kind){
  return ({worker:'workers',supervisor:'supervisors',driver:'drivers',employee:'employees',equipment:'equipment'})[kind] || 'workers';
}
function openCostModal(editId, preset){
  ensureCostItemPool();
  const existing = editId ? (DATA.costs || []).find(x => x.id === editId) : null;
  const kind0 = existing ? existing.personKind : ((preset && preset.personKind) || (window.__costTab && ({workers:'worker',supervisors:'supervisor',drivers:'driver',employees:'employee',equipment:'equipment'}[window.__costTab])) || 'worker');
  const section0 = existing ? (existing.section||'') : ((preset && preset.section) || window.__costSection || '');
  const pid0 = existing ? existing.personId : ((preset && preset.personId) || '');
  const lines = existing ? costLines(existing).map(l=>({ item:l.item, amount:l.amount||'' })) : [{ item:'', amount:'' }];
  const lineHtml = (ln)=>`<div class="ex-line cst-line" style="display:grid;grid-template-columns:1fr minmax(140px,200px) 36px;gap:8px;align-items:start;margin-bottom:8px;">
      <div class="ex-item-wrap" style="position:relative;min-width:0;">
        <input class="input cst-item" placeholder="اختر أو اكتب بند التكلفة..." value="${escapeHtml(ln.item||'')}" autocomplete="off" style="width:100%;box-sizing:border-box;">
        <div class="ex-suggest cst-suggest" style="display:none;"></div>
      </div>
      <input class="input cst-amt" type="number" min="0" step="0.01" placeholder="المبلغ" value="${ln.amount===''||ln.amount==null?'':toInt(ln.amount)}" style="width:100%;box-sizing:border-box;">
      <button type="button" class="icon-btn icon-del cst-del" title="حذف البند">🗑️</button>
    </div>`;
  const kindLabs = { worker:'العامل', supervisor:'المشرف', driver:'السائق', employee:'الموظف', equipment:'المعدة / المركبة' };
  const tabId0 = costTabIdForKind(kind0);
  const costSecs0 = costSectionsFor(tabId0);
  openModal(`
    <div class="modal-header"><h3>${existing ? 'تعديل تكلفة' : 'إضافة تكلفة'}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <p style="margin:0 0 12px;font-size:13px;color:var(--ink-soft);">التكلفة بتتضاف لمستحقات الشخص/المعدة وبتظهر في كشف الحساب.</p>
      <div class="form-grid form-grid-2">
        <label>الفئة *
          <select class="input" id="cstFKind">
            <option value="worker" ${kind0==='worker'?'selected':''}>عامل</option>
            <option value="supervisor" ${kind0==='supervisor'?'selected':''}>مشرف</option>
            <option value="driver" ${kind0==='driver'?'selected':''}>سائق</option>
            <option value="employee" ${kind0==='employee'?'selected':''}>موظف</option>
            <option value="equipment" ${kind0==='equipment'?'selected':''}>معدة / مركبة</option>
          </select>
        </label>
        <label>نوع التكلفة (القسم)
          <select class="input" id="cstSection">
            <option value="">— بدون —</option>
            ${costSecs0.map(s=>`<option value="${escapeHtml(s)}" ${s===section0?'selected':''}>${escapeHtml(s)}</option>`).join('')}
          </select>
        </label>
        <label>التاريخ *
          <input class="input" id="cstFDate" type="date" value="${escapeHtml((existing && existing.date) || (typeof todayISO==='function'?todayISO():''))}">
        </label>
        <label id="cstPersonLab">${kindLabs[kind0]||'الشخص'} *
          <div id="cstFPersonBox"></div>
        </label>
        <label>المشروع
          ${typeof projectInputHtml==='function' ? projectInputHtml('cstFProject', (existing && existing.project) || '', 'cstProjList') : `<input class="input" id="cstFProject" value="${escapeHtml((existing && existing.project) || '')}">`}
        </label>
      </div>
      <div class="section-title" style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <span>بنود التكلفة</span>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button type="button" class="btn btn-outline btn-sm" id="btnCstAddLine">+ بند</button>
          <button type="button" class="btn btn-outline btn-sm" id="btnCstManageItems">إدارة البنود</button>
        </div>
      </div>
      <div id="cstLines"></div>
      <div style="margin-top:12px;font-weight:800;font-size:16px;">الإجمالي: <span id="cstTotal">0</span> ج.م</div>
      ${typeof customFieldsFormHtml==='function'?customFieldsFormHtml('costs', existing):''}
      <label style="display:block;margin-top:12px;">ملاحظات
        <textarea class="input" id="cstFNotes" rows="4" placeholder="اكتب الملاحظات هنا...">${escapeHtml((existing && existing.notes) || '')}</textarea>
      </label>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="btnSaveCost">${existing ? 'حفظ التعديل' : 'حفظ'}</button>
    </div>
  `);
  const linesBox = document.getElementById('cstLines');
  const curKind = ()=> document.getElementById('cstFKind').value;
  const recalc = ()=>{
    let t = 0; linesBox.querySelectorAll('.cst-amt').forEach(i=>{ t += toInt(i.value); });
    document.getElementById('cstTotal').textContent = fmtNum(t);
  };
  const bindLine = (row)=>{
    const inp = row.querySelector('.cst-item'), box = row.querySelector('.cst-suggest');
    const showSuggest = ()=>{
      const q = (inp.value||'').trim();
      const all = costItemSuggestions(curKind());
      const list = (q ? all.filter(x=>smartMatch(x, q)) : all).slice(0, 14);
      if(!list.length){ box.style.display='none'; return; }
      box.innerHTML = list.map(x=>`<div class="ex-suggest-item" data-v="${escapeHtml(x)}">${escapeHtml(x)}</div>`).join('');
      box.style.display = 'block';
      box.querySelectorAll('.ex-suggest-item').forEach(it=>it.addEventListener('mousedown', ev=>{ ev.preventDefault(); inp.value = it.getAttribute('data-v'); box.style.display='none'; row.querySelector('.cst-amt').focus(); }));
    };
    inp.addEventListener('focus', showSuggest);
    inp.addEventListener('input', showSuggest);
    inp.addEventListener('blur', ()=>setTimeout(()=>{ box.style.display='none'; }, 150));
    row.querySelector('.cst-amt').addEventListener('input', recalc);
    row.querySelector('.cst-del').addEventListener('click', ()=>{
      if(linesBox.querySelectorAll('.cst-line').length<=1){ inp.value=''; row.querySelector('.cst-amt').value=''; }
      else row.remove();
      recalc();
    });
  };
  const addLine = (ln)=>{ const d = document.createElement('div'); d.innerHTML = lineHtml(ln||{item:'',amount:''}); const row = d.firstElementChild; linesBox.appendChild(row); bindLine(row); return row; };
  lines.forEach(l=>addLine(l)); recalc();
  document.getElementById('btnCstAddLine').addEventListener('click', ()=>{ const r = addLine(); r.querySelector('.cst-item').focus(); });
  
  document.getElementById('btnCstManageItems').addEventListener('click', ()=> openCostItemsManager(curKind(), ()=>{}));

  function refreshCostSections(keep){
    const kind = curKind();
    const tabId = costTabIdForKind(kind);
    const secs = costSectionsFor(tabId);
    const sel = document.getElementById('cstSection');
    if(!sel) return;
    const cur = keep != null ? keep : (sel.value || section0 || window.__costSection || '');
    sel.innerHTML = '<option value="">— بدون —</option>' + secs.map(s=>`<option value="${escapeHtml(s)}" ${s===cur?'selected':''}>${escapeHtml(s)}</option>`).join('');
  }
  const fillPerson = (keepId)=>{
    const kind = curKind();
    const lab = document.getElementById('cstPersonLab');
    const labs = { worker:'العامل *', supervisor:'المشرف *', driver:'السائق *', employee:'الموظف *', equipment:'المعدة / المركبة *' };
    if(lab){
      for(const n of lab.childNodes){ if(n.nodeType===3){ n.textContent = (labs[kind]||'الشخص *')+' '; break; } }
    }
    window.__entityDeptFilter = ''; // كل الأسماء بدون فلتر قسم موارد
    const box = document.getElementById('cstFPersonBox');
    if(box){
      document.querySelectorAll('.entity-combo-drop-fixed').forEach(d=>d.remove());
      box.innerHTML = '';
      box.innerHTML = entityComboHtml('cstFPerson', kind, keepId || '', 'اكتب الاسم أو الكود...');
      const txt = box.querySelector('.entity-combo-text');
      if(txt) delete txt.dataset.boundCombo;
      if(typeof bindEntityCombos === 'function') bindEntityCombos(document.getElementById('appModal') || document);
    }
  };
  refreshCostSections(section0 || window.__costSection || '');
  fillPerson(pid0);
  document.getElementById('cstFKind').addEventListener('change', ()=>{
    refreshCostSections('');
    fillPerson('');
  });

document.getElementById('btnSaveCost').addEventListener('click', ()=>{
    const personKind = curKind();
    let personId = (typeof getEntityComboValue==='function' ? getEntityComboValue('cstFPerson') : '') || document.getElementById('cstFPerson')?.value || '';
    const date = document.getElementById('cstFDate').value;
    const ls = [];
    linesBox.querySelectorAll('.cst-line').forEach(row=>{
      const item = (row.querySelector('.cst-item').value||'').trim();
      const amount = toInt(row.querySelector('.cst-amt').value);
      if(item || amount) ls.push({ item, amount });
    });
    const amount = toInt(ls.reduce((s,l)=>s+toInt(l.amount),0));
    if(!personId){ showToast('اختار الشخص'); return; }
    if(!date){ showToast('اكتب التاريخ'); return; }
    if(!ls.length || !(amount > 0)){ showToast('اكتب بند واحد على الأقل بمبلغ أكبر من صفر'); return; }
    ls.forEach(l=>{ if(l.item) saveCostItemSuggestion(l.item, personKind); });
    const project = (document.getElementById('cstFProject')?.value || '').trim();
    if(project && typeof ensureProjectSaved === 'function') ensureProjectSaved(project);
    window.__entityDeptFilter = '';
    const sectionVal = (document.getElementById('cstSection')?.value || section0 || window.__costSection || '').trim();
    const rec = {
      id: existing ? existing.id : uid(),
      personKind, personId, date, amount, lines: ls,
      item: ls.length === 1 ? ls[0].item : ls.map(l=>l.item).filter(Boolean).join(' + '),
      project,
      section: sectionVal,
      notes: (document.getElementById('cstFNotes').value||'').trim(),
      extraFields: typeof collectExtraFieldsForSave==='function' ? collectExtraFieldsForSave('extraFields_costs') : (existing&&existing.extraFields)||[],
      createdAt: existing ? (existing.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    DATA.costs = DATA.costs || [];
    if(existing){
      const i = DATA.costs.findIndex(x => x.id === existing.id);
      if(i >= 0) DATA.costs[i] = Object.assign({}, existing, rec);
      addAudit('تعديل تكلفة', costPersonName(rec) + ' — ' + amount + (toInt(existing.amount) !== amount ? ' (كان ' + toInt(existing.amount) + ')' : ''));
    } else {
      DATA.costs.push(rec);
      addAudit('إضافة تكلفة', costPersonName(rec) + ' — ' + amount);
    }
    saveData(true);
    closeModal();
    showToast('تم الحفظ — المبلغ بقى مستحق لـ ' + costPersonName(rec));
    rerenderCurrentPage();
  });
}

/** إدارة بنود التكاليف: إضافة / تعديل (مباشر في الصف) / حذف — نفس شكل إدارة بنود المصروفات */
function openCostItemsManager(kind, onChange){
  const kindLab = { worker:'العمال', supervisor:'المشرفين', driver:'السائقين', employee:'الموظفين', equipment:'المعدات والمركبات' }[kind] || '';
  const render = ()=>{
    const list = costItemSuggestions(kind);
    openSubModal(`
      <div class="modal-header"><h3>إدارة بنود التكاليف — ${escapeHtml(kindLab)}</h3><button class="modal-close" onclick="closeSubModal()">×</button></div>
      <div class="modal-body">
        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <input class="input" id="cstNewItem" placeholder="اسم البند الجديد" style="flex:1;">
          <button type="button" class="btn btn-primary btn-sm" id="btnCstNewItem">+ إضافة بند</button>
        </div>
        <div class="table-wrap"><table class="data-table"><thead><tr><th>البند</th><th style="width:150px;"></th></tr></thead><tbody>
          ${list.length ? list.map(x=>`<tr class="pitem-row" data-item="${escapeHtml(x)}">
              <td><input class="input pitem-edit" value="${escapeHtml(x)}"></td>
              <td style="white-space:nowrap;"><button type="button" class="btn btn-outline btn-sm btn-save-pitem">حفظ</button>
              <button type="button" class="btn btn-outline btn-sm btn-del-pitem">🗑️ حذف</button></td></tr>`).join('') : '<tr><td colspan="2" style="text-align:center;color:var(--ink-soft);padding:16px;">لا توجد بنود</td></tr>'}
        </tbody></table></div>
        <p style="font-size:12.5px;color:var(--ink-soft);margin:8px 0 0;">تعديل اسم بند بيحدّث التكاليف القديمة اللي عليه. الحذف بيشيله من القائمة بس (السجلات القديمة ما بتتأثرش).</p>
      </div>
      <div class="modal-footer"><button class="btn btn-outline" onclick="closeSubModal()">إغلاق</button></div>`);
    const root = document.getElementById('appSubModal') || document;
    const addNew = ()=>{
      const v = (root.querySelector('#cstNewItem').value||'').trim(); if(!v) return;
      saveCostItemSuggestion(v, kind); saveData(true); if(onChange) onChange(); render();
    };
    root.querySelector('#btnCstNewItem').addEventListener('click', addNew);
    root.querySelector('#cstNewItem').addEventListener('keydown', e=>{ if(e.key==='Enter') addNew(); });
    root.querySelectorAll('.btn-save-pitem').forEach(btn=>btn.addEventListener('click', ()=>{
      const row = btn.closest('.pitem-row');
      const old = row.getAttribute('data-item') || '';
      const neu = (row.querySelector('.pitem-edit').value||'').trim();
      if(!neu) return;
      if(old && old !== neu) renameCostItemSuggestion(old, neu, kind); else saveCostItemSuggestion(neu, kind);
      saveData(true); showToast('تم الحفظ'); if(onChange) onChange(); render();
    }));
    root.querySelectorAll('.btn-del-pitem').forEach(btn=>btn.addEventListener('click', ()=>{
      const row = btn.closest('.pitem-row'); const v = row.getAttribute('data-item') || '';
      if(!v) return;
      removeCostItemSuggestion(v, kind); saveData(true); if(onChange) onChange(); render();
    }));
  };
  render();
}
