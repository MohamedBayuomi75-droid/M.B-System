/* =========================================================
   extras.js — إضافات الخطة (المرحلة و):
   1) بحث شامل (Ctrl+K أو زر 🔍) عبر العملاء والمشاريع والعقود والمستخلصات والموردين والفواتير والأشخاص والأصناف.
   2) الجدول الزمني للمشروع (مسار + مستخلصات + تحصيلات + ضمانات + أوامر تغيير + توريد) في كشف الحساب.
   3) اعتماد المصروفات الكبيرة: حد قابل للضبط؛ مصروف فوق الحد يظهر في مركز المتابعة لحد ما يتعتمد.
   ========================================================= */

/* ---------- 1) البحث الشامل ---------- */
function gsBuildIndex(){
  const out = [], P = function(type, icon, label, sub, open){ out.push({ type: type, icon: icon, label: String(label || ''), sub: String(sub || ''), open: open }); };
  try{ clCustomers().forEach(function(c){ P('عميل', '👥', c.name, [c.code, c.phone].filter(Boolean).join(' · '), function(){ customerFilters.detailId = c.id; goToPage('clients.customers'); }); }); }catch(e){}
  (DATA.projects || []).forEach(function(p){ P('مشروع', '🏗️', p.name, [p.code, p.customerName].filter(Boolean).join(' · '), function(){ projectFilters.detailId = p.id; goToPage('projects'); }); });
  try{ clAllContracts().forEach(function(k){ P('عقد', '📑', k.title || k.id, [k.id, k.customerName, k.project].filter(Boolean).join(' · '), function(){ contractFilters.detailKey = k._key; goToPage('clients.contracts'); }); }); }catch(e){}
  try{ clAllClientInvoices().forEach(function(i){ P('مستخلص', '🧾', 'مستخلص ' + i.no, [i.customerName, i.project].filter(Boolean).join(' · '), function(){ clientInvFilters.detailKey = i._key; goToPage('clients.invoices'); }); }); }catch(e){}
  ((DATA.ledger && DATA.ledger.suppliers) || []).forEach(function(s){ P('مورد', '🏭', s.name, s.phone || '', function(){ goToPage('ledger.suppliers'); }); });
  ((DATA.ledger && DATA.ledger.invoices) || []).forEach(function(i){ P('فاتورة مورد', '🧾', 'فاتورة ' + (i.invoiceNo || i.id), [__bdSup(i.supplierId), i.project].filter(Boolean).join(' · '), function(){ invoiceFilters.q = String(i.invoiceNo || ''); goToPage('ledger.invoices'); }); });
  [['employee', 'موظف', 'employees'], ['worker', 'عامل', 'workers'], ['supervisor', 'مشرف', 'supervisors'], ['driver', 'سائق', 'drivers']].forEach(function(k){
    (DATA[k[2]] || []).forEach(function(r){ P(k[1], '👤', r.name, [r.code, r.phone].filter(Boolean).join(' · '), function(){ if(typeof openPersonDetailPage === 'function') openPersonDetailPage(k[0], r.id); else goToPage(k[2]); }); });
  });
  try{ whItems().forEach(function(it){ P('صنف', '📦', it.name, [it.code, it.unit].filter(Boolean).join(' · '), function(){ whFilters.tab = 'items'; whFilters.q = it.name; goToPage('warehouses.home'); }); }); }catch(e){}
  return out;
}
let __gsIndex = null;
function gsSearch(q){
  q = String(q || '').trim(); if(!q) return [];
  if(!__gsIndex) __gsIndex = gsBuildIndex();
  const res = [];
  for(let i = 0; i < __gsIndex.length && res.length < 40; i++){
    const e = __gsIndex[i], hay = e.label + ' ' + e.sub + ' ' + e.type;
    if(typeof smartMatch === 'function' ? smartMatch(hay, q) : hay.indexOf(q) >= 0) res.push(e);
  }
  return res;
}
function openGlobalSearch(){
  __gsIndex = null;
  let results = [];
  openModal('<div class="modal-header"><h3>🔍 بحث شامل</h3><button class="modal-close" onclick="closeModal()">×</button></div>' +
    '<div class="modal-body"><input class="input" id="gsInput" type="search" placeholder="ابحث عن عميل، مشروع، عقد، مستخلص، مورد، فاتورة، موظف، صنف…" style="width:100%;margin-bottom:10px;" autofocus>' +
    '<div id="gsResults" class="gs-results" style="display:flex;flex-direction:column;gap:6px;max-height:55vh;overflow:auto;"><div class="alert-empty">اكتب للبحث</div></div></div>');
  const inp = document.getElementById('gsInput'), box = document.getElementById('gsResults');
  const draw = function(){
    results = gsSearch(inp.value);
    box.innerHTML = results.length ? results.map(function(r, i){
      return '<button type="button" class="alert-card alert-med gs-item" data-i="' + i + '"><div class="alert-card-top"><span class="alert-ico">' + r.icon + '</span><span class="alert-name">' + escapeHtml(r.label) + '</span><span class="alert-code">' + escapeHtml(r.type) + '</span></div>' +
        (r.sub ? '<div style="font-size:12px;color:var(--ink-soft);">' + escapeHtml(r.sub) + '</div>' : '') + '</button>';
    }).join('') : '<div class="alert-empty">' + (inp.value.trim() ? 'لا نتائج' : 'اكتب للبحث') + '</div>';
  };
  inp.addEventListener('input', function(){ clearTimeout(window.__gsT); window.__gsT = setTimeout(draw, 120); });
  inp.addEventListener('keydown', function(e){ if(e.key === 'Enter' && results[0]){ closeModal(); results[0].open(); } });
  box.addEventListener('click', function(e){ const b = e.target.closest('.gs-item'); if(!b) return; const r = results[Number(b.getAttribute('data-i'))]; closeModal(); if(r) r.open(); });
  setTimeout(function(){ inp.focus(); }, 50);
}
document.addEventListener('keydown', function(e){
  if((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')){ if(document.getElementById('app')){ e.preventDefault(); openGlobalSearch(); } }
});
document.addEventListener('click', function(e){ if(e.target.closest && e.target.closest('#gsFab')) openGlobalSearch(); });
(function(){
  function add(){
    if(document.getElementById('gsFab') || !document.body) return;
    const b = document.createElement('button');
    b.id = 'gsFab'; b.type = 'button'; b.title = 'بحث شامل (Ctrl+K)'; b.textContent = '🔍';
    b.style.cssText = 'position:fixed;bottom:18px;left:18px;z-index:900;width:44px;height:44px;border-radius:50%;border:none;background:var(--ledger-green,#1B4332);color:#fff;font-size:20px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);';
    document.body.appendChild(b);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();

/* ---------- 2) الجدول الزمني للمشروع ---------- */
function projectTimelineEvents(p){
  const ev = [], E = function(date, icon, text, sub){ if(date) ev.push({ date: String(date).slice(0, 10), icon: icon, text: text, sub: sub || '' }); };
  (p.pathHistory || []).forEach(function(h){ E(h.at, '🧭', (h.action || 'تغيير') + (h.label ? ' — ' + h.label : ''), h.user || ''); });
  try{
    clAllClientInvoices().filter(function(i){ return i.projectId === p.id || String(i.project || '').trim() === String(p.name || '').trim(); })
      .forEach(function(i){ E(i.date, '🧾', 'مستخلص ' + i.no + ' — ' + fmtMoney(clInvNet(i)), i.status || ''); });
    clAllCollections().filter(function(c){ return c.projectId === p.id || String(c.project || '').trim() === String(p.name || '').trim(); })
      .forEach(function(c){ E(c.date, '💰', 'تحصيل ' + fmtMoney(c.amount || 0), c.method || c.notes || ''); });
    clAllGuarantees().filter(function(g){ return g.projectId === p.id; }).forEach(function(g){
      E(g.issueDate, '🛡️', 'ضمان ' + (g.type || '') + ' ' + (g.letterNo || ''), fmtMoney(g.amount || 0));
      if(g.expiryDate) E(g.expiryDate, '⌛', 'انتهاء ضمان ' + (g.letterNo || ''), '');
    });
    clAllChangeOrders().filter(function(v){ return v.projectId === p.id; }).forEach(function(v){ E(v.date, '📝', 'أمر تغيير ' + (v.id || '') + ' — ' + fmtMoney(v.amount || 0), v.status || ''); });
    clAllContracts().filter(function(k){ return k.projectId === p.id || String(k.project || '').trim() === String(p.name || '').trim(); })
      .forEach(function(k){ E(k.start, '📑', 'بداية عقد ' + (k.title || k.id), fmtMoney(k.value || 0)); });
  }catch(e){}
  try{ projectSupplyCostLines(p.name).forEach(function(l){ E(l.date, l.source === 'supplier' ? '🏭' : '📦', l.desc + ' ' + (l.ref || '') + ' — ' + fmtMoney(l.amount), l.party || ''); }); }catch(e){}
  ev.sort(function(a, b){ return b.date.localeCompare(a.date); });
  return ev;
}
function projectTimelineHtml(p){
  const ev = projectTimelineEvents(p);
  return '<details class="ppt2-detail project-timeline"><summary>🕘 الجدول الزمني للمشروع (' + ev.length + ')</summary>' +
    (ev.length ? '<ul class="timeline-list" style="list-style:none;padding:0;margin:8px 0;display:flex;flex-direction:column;gap:6px;">' +
      ev.slice(0, 80).map(function(e){ return '<li style="display:flex;gap:10px;align-items:baseline;padding:6px 10px;background:var(--surface-2,#f6f1e4);border-radius:8px;"><span style="min-width:92px;color:var(--ink-soft);font-size:12px;">' + escapeHtml(e.date) + '</span><span>' + e.icon + ' ' + escapeHtml(e.text) + '</span>' + (e.sub ? '<span style="margin-inline-start:auto;font-size:12px;color:var(--ink-soft);">' + escapeHtml(e.sub) + '</span>' : '') + '</li>'; }).join('') + '</ul>'
      : '<div class="alert-empty">لا أحداث بعد</div>') + '</details>';
}

/* ---------- 3) اعتماد المصروفات الكبيرة ---------- */
function expenseApprovalLimit(){ return Number(DATA.settings && DATA.settings.expenseApprovalLimit) || 0; }
function setExpenseApprovalLimit(v){ DATA.settings = DATA.settings || {}; DATA.settings.expenseApprovalLimit = Number(v) || 0; saveData(true); }
function expenseNeedsApproval(e){ const lim = expenseApprovalLimit(); return !!(lim && e && !e.approved && toInt(e.amount) >= lim); }
function approveExpense(id){
  const e = (DATA.expenses || []).find(function(x){ return x.id === id; }); if(!e) return;
  e.approved = true; e.approvedBy = (typeof pwUserName === 'function') ? pwUserName() : ''; e.approvedAt = new Date().toISOString();
  try{ addAudit('اعتماد مصروف', (e.project || '') + ' — ' + fmtMoney(e.amount)); }catch(_e){}
  saveData(true);
}
registerAlertSource('approvals', 'اعتمادات', function(){
  const out = [], lim = expenseApprovalLimit(); if(!lim) return out;
  (DATA.expenses || []).filter(expenseNeedsApproval).forEach(function(e){
    out.push({ page: 'expenses', icon: '✍️', level: 'warn', severity: 'high', kind: 'exp-approval', kindLabel: 'مصروفات كبيرة بانتظار الاعتماد',
      msg: fmtMoney(toInt(e.amount)) + ' — ' + (e.project || 'بدون مشروع') + (e.date ? ' (' + e.date + ')' : ''),
      issues: ['أكبر من أو يساوي حد الاعتماد ' + fmtMoney(lim), 'اضغط للاعتماد'],
      open: function(){ confirmApp('اعتماد هذا المصروف (' + fmtMoney(toInt(e.amount)) + ')؟', { title: 'اعتماد مصروف', okLabel: 'اعتماد' }).then(function(ok){ if(ok){ approveExpense(e.id); showToast('تم الاعتماد'); rerenderCurrentPage(); } }); } });
  });
  return out;
});
document.addEventListener('click', function(e){
  if(e.target && e.target.id === 'acLimitBtn'){
    const cur = expenseApprovalLimit();
    showAppPrompt('حد اعتماد المصروفات (جنيه) — اكتب 0 لإيقاف الاعتماد:', String(cur), { title: 'اعتماد المصروفات' }).then(function(v){
      if(v != null){ setExpenseApprovalLimit(String(v).replace(/[^\d.]/g, '')); showToast('تم حفظ الحد'); rerenderCurrentPage(); }
    });
  }
});


/* أزرار الرجوع: أي زر نصه يبدأ بـ ◀ / ← أو فيه «رجوع» ياخد شكل زر رجوع واضح (أخضر) */
(function(){
  function mark(root){
    (root || document).querySelectorAll('button').forEach(function(b){
      if(b.classList.contains('btn-back') || b.classList.contains('modal-close') || b.hasAttribute('data-page-prev') || b.hasAttribute('data-page-next')) return;
      const t = (b.textContent || '').trim();
      if(/^(◀|←)/.test(t) || (t.length < 28 && /رجوع/.test(t))) b.classList.add('btn-back');
    });
  }
  let pending = false;
  function schedule(){ if(pending) return; pending = true; try{ mark(); }finally{ pending = false; } }
  if(typeof MutationObserver !== 'undefined'){
    const start = function(){ new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true }); mark(); };
    if(document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  }
})();

/* =========================================================
   قوائم منسدلة موحّدة: كل <select> في البرنامج يفتح قائمة بنفس شكل
   قائمة اختيار الشخص (اقتراحات الكيانات) — مع بحث للقوائم الطويلة.
   القيمة والأحداث (change/input) تبقى على عنصر select الأصلي.
   ========================================================= */
(function(){
  if(typeof document === 'undefined') return;
  let drop = null, curSel = null, items = [], active = -1, stopFollow = null;

  /* تصحيح الإحداثيات مع تكبير الصفحة (zoom): Electron القديم يرجّع getBoundingClientRect بدون zoom */
  function effZoom(el){ let z = 1; for(let n = el; n && n.nodeType === 1; n = n.parentElement){ const v = parseFloat(getComputedStyle(n).zoom); if(v && isFinite(v)) z *= v; } return z; }
  function visualRect(el){
    const r = el.getBoundingClientRect(); const z = effZoom(el);
    if(Math.abs(z - 1) < 0.001) return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height };
    let legacy = false;
    try{
      const probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;width:100px;height:1px;visibility:hidden;pointer-events:none;';
      (el.parentElement || document.body).appendChild(probe);
      const w = probe.getBoundingClientRect().width; probe.remove();
      legacy = Math.abs(w - 100) < Math.abs(w - 100 * z);
    }catch(_e){}
    const k = legacy ? z : 1;
    return { left:r.left*k, right:r.right*k, top:r.top*k, bottom:r.bottom*k, width:r.width*k, height:r.height*k };
  }
  window.visualRect = visualRect;
  /* وضع نافذة منبثقة مربوطة بخانتها: بنفس تكبير الخانة (transform) وبإحداثيات مرئية */
  function popLayout(el, anchor, w, minW, listSel){
    const z = effZoom(anchor), r = visualRect(anchor);
    const vw = w || Math.max(r.width, minW || 190);
    el.style.transformOrigin = 'top left';
    el.style.transform = Math.abs(z-1) < 0.001 ? '' : 'scale(' + z + ')';
    el.style.width = (vw / z) + 'px';
    const h = el.offsetHeight * z;
    const below = window.innerHeight - r.bottom, above = r.top;
    const goDown = (below >= Math.min(h, 260*z) || below >= above);
    if(listSel){
      const lst = el.querySelector(listSel);
      if(lst){ const room = (goDown ? below : above) - 16; lst.style.maxHeight = (Math.max(140, Math.min(264*z, room)) / z) + 'px'; }
    }
    const h2 = el.offsetHeight * z;
    let top = goDown ? r.bottom + 4 : r.top - h2 - 4;
    if(top < 6) top = 6;
    if(top + h2 > window.innerHeight - 6) top = Math.max(6, window.innerHeight - h2 - 6);
    let left = r.right - vw; if(left + vw > window.innerWidth - 6) left = window.innerWidth - vw - 6; if(left < 6) left = 6;
    el.style.top = top + 'px'; el.style.left = left + 'px';
  }
  window.popLayout = popLayout;
  /* يعيد وضع النافذة عند التمرير/تغيير الحجم/التكبير بدل إغلاقها، ويغلقها لو اختفت الخانة */
  window.bindPopupFollow = function(getEl, getAnchor, relayout, close){
    let raf = 0, last = '';
    function tick(){
      const el = getEl(), an = getAnchor();
      if(!el || !an) return;
      if(!document.body.contains(an)){ close(); return; }
      const r = an.getBoundingClientRect(), key = [r.left,r.top,r.width,r.height,window.innerWidth,window.innerHeight,window.devicePixelRatio,getComputedStyle(an).zoom].join(',');
      if(key !== last){ last = key; relayout(); }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return function(){ cancelAnimationFrame(raf); };
  };

  function closeDrop(){
    if(stopFollow){ stopFollow(); stopFollow = null; }
    if(drop){ drop.remove(); drop = null; }
    if(curSel){ curSel.classList.remove('cs-open'); }
    curSel = null; items = []; active = -1;
  }
  function eligible(sel){
    return sel && sel.tagName === 'SELECT' && !sel.multiple && !(sel.size > 1) && !sel.disabled && !sel.dataset.csKind && !sel.classList.contains('no-custom-select');
  }
  function setActive(i){
    if(!items.length) return;
    active = Math.max(0, Math.min(items.length-1, i));
    items.forEach((b,k)=> b.classList.toggle('is-active', k===active));
    const el = items[active]; if(el && el.scrollIntoView) el.scrollIntoView({ block:'nearest' });
  }
  function pick(sel, value){
    if(sel.value !== value){
      sel.value = value;
      sel.dispatchEvent(new Event('input', { bubbles:true }));
      sel.dispatchEvent(new Event('change', { bubbles:true }));
    }
    closeDrop();
    try{ sel.focus({ preventScroll:true }); }catch(_e){}
  }
  function openDrop(sel){
    closeDrop();
    curSel = sel; sel.classList.add('cs-open');
    const opts = Array.from(sel.options);
    const long = opts.length > 8;
    drop = document.createElement('div');
    drop.className = 'cs-drop';
    drop.setAttribute('dir', 'rtl');
    let html = long ? '<div class="cs-search-wrap"><input type="search" class="cs-search" placeholder="بحث..." autocomplete="off"></div>' : '';
    html += '<div class="cs-list">';
    let lastGroup = null;
    opts.forEach((o, i)=>{
      const g = o.parentElement && o.parentElement.tagName === 'OPTGROUP' ? o.parentElement.label : null;
      if(g && g !== lastGroup){ html += '<div class="cs-group">' + escapeHtmlSafe(g) + '</div>'; }
      lastGroup = g;
      const isSel = o.value === sel.value && i === sel.selectedIndex;
      html += '<button type="button" class="cs-item' + (isSel ? ' is-selected' : '') + (o.disabled ? ' is-disabled' : '') + (o.value === '' ? ' is-empty' : '') + '" data-i="' + i + '"' + (o.disabled ? ' disabled' : '') + '><span class="cs-name">' + escapeHtmlSafe(o.textContent) + '</span>' + (isSel ? '<span class="cs-tick">✓</span>' : '') + '</button>';
    });
    html += '<div class="cs-empty" hidden>لا نتائج</div></div>';
    drop.innerHTML = html;
    document.body.appendChild(drop);
    // الموضع (مربوط بالخانة)
    const doLayout = ()=>{ if(drop) popLayout(drop, sel, 0, 190, '.cs-list'); };
    doLayout();
    stopFollow = bindPopupFollow(()=>drop, ()=>curSel, doLayout, closeDrop);
    items = Array.from(drop.querySelectorAll('.cs-item:not(.is-disabled)'));
    const selIdx = items.findIndex(b=>b.classList.contains('is-selected'));
    setActive(selIdx >= 0 ? selIdx : 0);
    const searchEl = drop.querySelector('.cs-search');
    if(searchEl){
      searchEl.focus();
      searchEl.addEventListener('input', ()=>{
        const q = searchEl.value.trim().toLowerCase();
        let n = 0;
        drop.querySelectorAll('.cs-item').forEach(b=>{ const show = !q || b.textContent.toLowerCase().indexOf(q) >= 0; b.hidden = !show; if(show) n++; });
        drop.querySelector('.cs-empty').hidden = n > 0;
        items = Array.from(drop.querySelectorAll('.cs-item:not(.is-disabled)')).filter(b=>!b.hidden);
        setActive(0);
      });
    }
    drop.addEventListener('mousedown', (e)=>{ if(!e.target.classList.contains('cs-search')) e.preventDefault(); });
    drop.addEventListener('click', (e)=>{
      const b = e.target.closest('.cs-item'); if(!b || b.disabled) return;
      const o = opts[Number(b.dataset.i)]; if(o) pick(sel, o.value);
    });
  }
  function escapeHtmlSafe(t){ return String(t==null?'':t).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  document.addEventListener('mousedown', (e)=>{
    const t = e.target;
    if(drop && !drop.contains(t) && t !== curSel){ closeDrop(); }
    if(t && t.tagName === 'SELECT' && eligible(t)){
      e.preventDefault();
      if(curSel === t && drop){ closeDrop(); return; }
      try{ t.focus({ preventScroll:true }); }catch(_e){}
      openDrop(t);
    }
  }, true);
  document.addEventListener('keydown', (e)=>{
    const t = e.target;
    if(drop){
      if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); closeDrop(); return; }
      if(e.key === 'ArrowDown'){ e.preventDefault(); setActive(active+1); return; }
      if(e.key === 'ArrowUp'){ e.preventDefault(); setActive(active-1); return; }
      if(e.key === 'Enter'){ e.preventDefault(); e.stopPropagation(); const b = items[active]; if(b){ const o = Array.from(curSel.options)[Number(b.dataset.i)]; if(o) pick(curSel, o.value); } return; }
      if(e.key === 'Tab'){ closeDrop(); return; }
      return;
    }
    if(t && t.tagName === 'SELECT' && eligible(t) && (e.key === 'Enter' || e.key === ' ' || (e.altKey && e.key === 'ArrowDown'))){
      e.preventDefault(); openDrop(t);
    }
  }, true);
  window.closeCustomSelect = closeDrop;
})();


/* =========================================================
   منتقي التاريخ الموحّد (تقويم بألوان البرنامج) لكل خانات التاريخ،
   ومنتقي السنة/الشهر الشبكي لكل قوائم السنة والشهر — أيقونة 🗓️
   ========================================================= */
(function(){
  if(typeof document === 'undefined') return;
  const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const WD = ['س','ح','ن','ث','ر','خ','ج']; // السبت أولاً
  let pop = null, anchorEl = null;
  const pad = n => String(n).padStart(2,'0');
  const iso = (y,m,d) => y+'-'+pad(m)+'-'+pad(d);
  function closePop(){ if(stopF){ stopF(); stopF = null; } if(pop){ pop.remove(); pop = null; } if(anchorEl){ anchorEl.classList.remove('dp-open'); } anchorEl = null; }
  let curW = 288, stopF = null;
  function place(el, anchor, w){ curW = w; popLayout(el, anchor, w); }
  function mk(anchor, cls){
    closePop();
    anchorEl = anchor; anchor.classList.add('dp-open');
    pop = document.createElement('div'); pop.className = 'dp-pop ' + (cls||''); pop.setAttribute('dir','rtl');
    pop.addEventListener('mousedown', e=> e.preventDefault());
    document.body.appendChild(pop);
    stopF = bindPopupFollow(()=>pop, ()=>anchorEl, ()=>{ if(pop && anchorEl) popLayout(pop, anchorEl, curW); }, closePop);
    return pop;
  }
  function fire(el){ el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); }

  /* ---- تقويم الأيام ---- */
  function openDatePicker(inp){
    const cur = /^\d{4}-\d{2}-\d{2}$/.test(inp.value) ? inp.value : '';
    const now = new Date();
    let vy = cur ? +cur.slice(0,4) : now.getFullYear(), vm = cur ? +cur.slice(5,7) : now.getMonth()+1, mode = 'days', yBase = vy - (vy % 12);
    const min = inp.min || '', max = inp.max || '';
    mk(inp, 'dp-days');
    function draw(){
      if(mode === 'days'){
        const first = new Date(vy, vm-1, 1), dow = (first.getDay() + 1) % 7; // السبت = 0
        const dim = new Date(vy, vm, 0).getDate(), prevDim = new Date(vy, vm-1, 0).getDate();
        let cells = '';
        for(let i = 0; i < 42; i++){
          let d, m = vm, y = vy, out = false;
          if(i < dow){ d = prevDim - dow + i + 1; m = vm-1; if(m<1){ m=12; y--; } out = true; }
          else if(i >= dow + dim){ d = i - dow - dim + 1; m = vm+1; if(m>12){ m=1; y++; } out = true; }
          else d = i - dow + 1;
          const v = iso(y,m,d), dis = (min && v < min) || (max && v > max);
          const isSel = v === cur, isToday = v === iso(now.getFullYear(), now.getMonth()+1, now.getDate());
          cells += `<button type="button" class="dp-day${out?' is-out':''}${isSel?' is-sel':''}${isToday?' is-today':''}" data-v="${v}" ${dis?'disabled':''}>${d}</button>`;
        }
        pop.innerHTML = `<div class="dp-head"><button type="button" class="dp-title" data-act="months">${MONTHS[vm-1]} ${vy} ▾</button><button type="button" class="dp-nav" data-act="prev" title="الشهر السابق">▲</button><button type="button" class="dp-nav" data-act="next" title="الشهر التالي">▼</button></div>
          <div class="dp-wd">${WD.map(x=>`<span>${x}</span>`).join('')}</div><div class="dp-grid7">${cells}</div>
          <div class="dp-foot"><button type="button" class="dp-link" data-act="clear">مسح</button><button type="button" class="dp-link" data-act="today">اليوم</button></div>`;
      } else if(mode === 'months'){
        pop.innerHTML = `<div class="dp-head"><button type="button" class="dp-title" data-act="years">${vy} ▾</button><button type="button" class="dp-nav" data-act="py">▲</button><button type="button" class="dp-nav" data-act="ny">▼</button></div>
          <div class="dp-grid3">${MONTHS.map((n,i)=>`<button type="button" class="dp-cell${i+1===vm?' is-sel':''}" data-m="${i+1}">${n}</button>`).join('')}</div>`;
      } else {
        pop.innerHTML = `<div class="dp-head"><span class="dp-title static">${yBase} – ${yBase+11}</span><button type="button" class="dp-nav" data-act="pyy">▲</button><button type="button" class="dp-nav" data-act="nyy">▼</button></div>
          <div class="dp-grid3">${Array.from({length:12},(_,i)=>yBase+i).map(yy=>`<button type="button" class="dp-cell${yy===vy?' is-sel':''}" data-y="${yy}">${yy}</button>`).join('')}</div>`;
      }
      place(pop, inp, 288);
    }
    pop.addEventListener('click', (e)=>{
      const b = e.target.closest('button'); if(!b || b.disabled) return;
      const a = b.dataset.act;
      if(b.dataset.v){ inp.value = b.dataset.v; fire(inp); closePop(); return; }
      if(a === 'months'){ mode = 'months'; draw(); }
      else if(a === 'years'){ mode = 'years'; yBase = vy - (vy % 12); draw(); }
      else if(a === 'prev'){ vm--; if(vm<1){ vm=12; vy--; } draw(); }
      else if(a === 'next'){ vm++; if(vm>12){ vm=1; vy++; } draw(); }
      else if(a === 'py'){ vy--; draw(); } else if(a === 'ny'){ vy++; draw(); }
      else if(a === 'pyy'){ yBase -= 12; draw(); } else if(a === 'nyy'){ yBase += 12; draw(); }
      else if(a === 'today'){ inp.value = iso(now.getFullYear(), now.getMonth()+1, now.getDate()); fire(inp); closePop(); }
      else if(a === 'clear'){ inp.value = ''; fire(inp); closePop(); }
      else if(b.dataset.m){ vm = +b.dataset.m; mode = 'days'; draw(); }
      else if(b.dataset.y){ vy = +b.dataset.y; mode = 'months'; draw(); }
    });
    draw();
  }

  /* ---- شبكة السنة / الشهر لقوائم select ---- */
  function openGridSelect(sel, kind){
    const opts = Array.from(sel.options);
    mk(sel, 'dp-grid-pop');
    const empty = opts.find(o=>o.value === '');
    const vals = opts.filter(o=>o.value !== '');
    let yBase = 0;
    if(kind === 'year'){
      const nums = vals.map(o=>+o.value).filter(n=>n);
      const curY = +sel.value || new Date().getFullYear();
      yBase = curY - (curY % 12);
    }
    function draw(){
      let body = '', head = '';
      if(kind === 'year'){
        const avail = new Set(vals.map(o=>+o.value));
        head = `<div class="dp-head"><span class="dp-title static">${yBase} – ${yBase+11}</span><button type="button" class="dp-nav" data-yd="-12">▲</button><button type="button" class="dp-nav" data-yd="12">▼</button></div>`;
        body = `<div class="dp-grid3">${Array.from({length:12},(_,i)=>yBase+i).map(yy=>`<button type="button" class="dp-cell${String(yy)===String(sel.value)?' is-sel':''}${yy===new Date().getFullYear()?' is-now':''}" data-val="${yy}" ${avail.has(yy)?'':'disabled'}>${yy}</button>`).join('')}</div>`;
      } else {
        head = `<div class="dp-head"><span class="dp-title static">اختر الشهر</span></div>`;
        body = `<div class="dp-grid3">${vals.map(o=>`<button type="button" class="dp-cell${o.value===sel.value?' is-sel':''}" data-val="${escapeHtmlSafe2(o.value)}">${escapeHtmlSafe2(o.textContent)}</button>`).join('')}</div>`;
      }
      pop.innerHTML = head + (empty ? `<button type="button" class="dp-all${sel.value===''?' is-sel':''}" data-val="">${escapeHtmlSafe2(empty.textContent||'الكل')}</button>` : '') + body;
      place(pop, sel, 272);
    }
    pop.addEventListener('click', (e)=>{
      const b = e.target.closest('button'); if(!b || b.disabled) return;
      if(b.dataset.yd){ yBase += +b.dataset.yd; draw(); return; }
      if(b.dataset.val !== undefined){ sel.value = b.dataset.val; fire(sel); closePop(); try{ sel.focus({preventScroll:true}); }catch(_e){} }
    });
    draw();
  }
  function escapeHtmlSafe2(t){ return String(t==null?'':t).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  /* ---- وسم قوائم السنة والشهر ---- */
  function tagSelects(root){
    (root || document).querySelectorAll('select:not([data-cs-kind]):not([multiple])').forEach(sel=>{
      const vals = Array.from(sel.options).map(o=>o.value).filter(v=>v!=='');
      if(!vals.length) return;
      if(vals.length >= 4 && vals.every(v=>/^\d{4}$/.test(v))){ sel.dataset.csKind = 'year'; }
      else if(vals.length === 12 && vals.every((v,i)=>+v === i+1) && /month|شهر/i.test((sel.id||'') + ' ' + (sel.name||'') + ' ' + (sel.getAttribute('title')||''))){ sel.dataset.csKind = 'month'; }
      if(sel.dataset.csKind) sel.classList.add('sel-cal');
    });
  }
  let tagT = null;
  function scheduleTag(){ if(tagT) return; tagT = true; try{ tagSelects(); }catch(_e){} finally{ tagT = null; } }
  if(typeof MutationObserver !== 'undefined'){
    const start = function(){ new MutationObserver(scheduleTag).observe(document.body, { childList:true, subtree:true }); tagSelects(); };
    if(document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  }

  /* ---- ربط الأحداث ---- */
  function inIconZone(inp, e){
    const rect = inp.getBoundingClientRect(); const z = (inp.offsetWidth && rect.width) ? rect.width / inp.offsetWidth : 1;
    const x = (e.clientX - rect.left) / (z || 1), w = inp.offsetWidth;
    const rtl = getComputedStyle(inp).direction === 'rtl';
    return rtl ? x <= 36 : x >= w - 36;
  }
  document.addEventListener('mousedown', (e)=>{
    const t = e.target;
    if(pop && !pop.contains(t) && t !== anchorEl) closePop();
    if(!t || t.nodeType !== 1) return;
    if(t.tagName === 'INPUT' && t.type === 'date' && !t.disabled && !t.readOnly && !t.classList.contains('no-custom-date') && inIconZone(t, e)){
      e.preventDefault(); try{ t.focus({preventScroll:true}); }catch(_e){}
      if(anchorEl === t && pop){ closePop(); return; }
      if(typeof window.closeCustomSelect === 'function') window.closeCustomSelect();
      openDatePicker(t); return;
    }
    if(t.tagName === 'SELECT' && t.dataset.csKind && !t.disabled){
      e.preventDefault(); try{ t.focus({preventScroll:true}); }catch(_e){}
      if(anchorEl === t && pop){ closePop(); return; }
      if(typeof window.closeCustomSelect === 'function') window.closeCustomSelect();
      openGridSelect(t, t.dataset.csKind);
    }
  }, true);
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && pop){ closePop(); }
    const t = e.target;
    if(t && t.tagName === 'INPUT' && t.type === 'date' && !t.disabled && (e.key === 'F4' || (e.altKey && e.key === 'ArrowDown'))){ e.preventDefault(); openDatePicker(t); }
    if(t && t.tagName === 'SELECT' && t.dataset.csKind && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); openGridSelect(t, t.dataset.csKind); }
  }, true);
  window.addEventListener('resize', closePop);
  document.addEventListener('scroll', (e)=>{ if(pop && !pop.contains(e.target)) closePop(); }, true);
  window.closeDatePopup = closePop;
})();


/* =========================================================
   تطبيق «تعديلات مخصصة» على أعمدة جداول الأشخاص والمعدات:
   إخفاء/إظهار العمود حسب خانة «جدول» + تغيير اسم العمود حسب الاسم المخصص.
   يعمل على كل الجداول (حتى اللي من غير thIf) بمطابقة عنوان العمود، ومع كل إعادة رسم.
   ========================================================= */
(function(){
  if(typeof document === 'undefined') return;
  const PAGE_ENT = { employees:'employees', workers:'workers', supervisors:'supervisors', drivers:'drivers', equipment:'equipment' };
  const norm = t => String(t||'').replace(/[ً-ْ\s]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/^ال/,'');
  /* مفتاح الخانة ← عناوين الأعمدة المرتبطة بها في الجداول */
  const ALIAS = {
    code:['كودالموظف','كودالعامل','كودالمشرف','كودالسائق','كود','الكود'],
    phone:['رقمالتليفون','الهاتف','رقمالهاتف'],
    salary:['الراتبالاساسي','الراتب'],
    hireDate:['تاريخالتعيين'], position:['الوظيفه'], job:['الوظيفه'],
    cardExpiry:['انتهاءالبطاقه'], idCardExpiry:['انتهاءالبطاقه'],
    insuranceNo:['الرقمالتاميني'], insuranceStatus:['حالهالتامين'],
    licenseExpiry:['انتهاءالرخصه'], licenseDegree:['درجهالرخصه'],
    workerType:['نوعالعامل'], projectSince:['تاريخالربطبالمشروع','تاريخالانضمامللمشروع'],
    vehicleLicenseExpiry:['انتهاءرخصهالسياره','تاريخانتهاءرخصهالسياره','حالهرخصهالسياره'], driverLicenseExpiry:['انتهاءرخصهالسائق','حالهرخصهالسائق'],
    licenseIssueDate:['تاريخالاصدار','تاريخاصدارالرخصه'], licenseType:['نوعالترخيص'], carType:['نوعالسياره'],
    vehicleNumber:['رقماللوحه'], motorNumber:['رقمالماتور'], chassisNumber:['رقمالشاسيه'],
    inspectionDate:['تاريخالفحص'], driverName:['اسمالسائق'], notes:['الملاحظات','ملاحظات'],
    hourlyCost:['تكلفهالساعه'], purchaseDate:['تاريخالشراء'], purchasePrice:['سعرالشراء'],
    lastMaintenance:['تاريخاخرصيانه'], nextMaintenance:['موعدالصيانهالقادمه'], ownership:['الملكيه'],
    dailyWage:['اليوميه'], project:['المشروع'], supervisor:['المشرف'], department:['القسم'], address:['العنوان'], status:['الحاله'], name:['الاسم'], nationalId:['الرقمالقومي'], model:['الموديل'], color:['اللون']
  };
  function defaultLabel(ent, key){ try{ const f=((typeof FORM_BUILTIN_FIELDS!=='undefined' && FORM_BUILTIN_FIELDS[ent])||[]).find(x=>x.key===key); return f?f.label:''; }catch(_e){ return ''; } }
  let busy = false, queued = false;
  function mainTable(){
    const root = document.getElementById('pageContent'); if(!root) return null;
    return Array.from(root.querySelectorAll('table.data-table')).find(t=>{ const h=t.querySelector('thead tr'); return h && h.children.length > 5 && t.querySelector('tbody tr'); }) || null;
  }
  function apply(){
    queued = false;
    let ent = null;
    try{ ent = PAGE_ENT[currentPage]; }catch(_e){}
    if(!ent || typeof ensureFormLayout !== 'function') return;
    try{ const _mt = mainTable(); if(_mt && _mt.dataset.layoutEnt) ent = _mt.dataset.layoutEnt; }catch(_e){}
    try{ if(typeof migrateStaleFormLayouts==='function') migrateStaleFormLayouts(); }catch(_e){}
    try{ if(ent==='employees' && typeof employeesInResignedSection==='function' && employeesInResignedSection()) return; }catch(_e){}
    const tbl = mainTable(); if(!tbl) return;
    const headRow = tbl.querySelector('thead tr'); const ths = Array.from(headRow.children);
    try{ window.__cfSynced = window.__cfSynced || {}; if(!window.__cfSynced[ent] && typeof syncAutoFields==='function'){ syncAutoFields(ent); window.__cfSynced[ent] = true; } }catch(_e){}
    const layoutAll = ensureFormLayout(ent).filter(f=>f);
    busy = true;
    try{
      // أعد أي عمود أخفيناه سابقاً ثم طبّق من جديد
      tbl.querySelectorAll('[data-clhide]').forEach(c=>{ c.style.display=''; c.removeAttribute('data-clhide'); });
      const used = new Set(); const units = []; // {order, cols:[...], hide, label}
      const _unm = window.__tblUnmatched = new Set();
      layoutAll.forEach((f, order)=>{
        const isCustom = f.type==='custom';
        if(f.auto && !AUTO_HDR_ALIAS[autoFieldSuffix(f.selector)]) return; // خانة تلقائية بلا عمود أصلي
        const keyN = isCustom ? [norm(f.label)] : (f.auto ? (AUTO_HDR_ALIAS[autoFieldSuffix(f.selector)]||[]) : (ALIAS[f.key]||[])).map(norm);
        const labN = norm(f.label), defN = norm(defaultLabel(ent,f.key));
        const cols = [];
        ths.forEach((th, i)=>{
          if(used.has(i) || th.querySelector('input,button,select')) return;
          if(th.hasAttribute('data-auto-col') && !f.auto && !isCustom) return; /* لا تطابق خانة أصلية مع عمود أضفناه تلقائياً (كان يسبب تذبذباً لا ينتهي) */
          const txt = norm(th.textContent);
          if(!txt) return;
          const byKey = !isCustom && th.dataset && th.dataset.colKey === f.key;
          const hit = byKey || keyN.indexOf(txt) >= 0 || (!isCustom && !keyN.length && (txt===labN || txt===defN));
          if(hit){ cols.push(i); used.add(i); }
        });
        if(!cols.length){ if(!isCustom && !f.auto) _unm.add(f.key); return; }
        // العمود الأساسي أولاً ثم التابع له (حالة…)
        const primary = cols.slice().sort((a,b)=>{ const pa = keyN.indexOf(norm(ths[a].textContent)), pb = keyN.indexOf(norm(ths[b].textContent)); return (pa<0?99:pa)-(pb<0?99:pb) || a-b; });
        const cur = { key: f.key, order, cols: primary, hide: f.showInTable === false, label:'' };
        if(!isCustom && f.label && defN && labN !== defN && keyN[0] === norm(ths[primary[0]].textContent)) cur.label = f.label;
        units.push(cur);
      });
      if(!(tbl.dataset.layoutEnt ? units.some(u=>u.key==='name') : (units.some(u=>u.key==='name') && units.some(u=>u.key==='code')))) _unm.clear();
      // إعادة ترتيب الأعمدة حسب ترتيب الخانات
      const slots = [].concat.apply([], units.map(u=>u.cols)).sort((a,b)=>a-b);
      const seq = [].concat.apply([], units.slice().sort((a,b)=>a.order-b.order).map(u=>u.cols));
      const perm = ths.map((_,i)=>i);
      slots.forEach((slot,k)=>{ perm[slot] = seq[k]; });
      if(perm.some((v,i)=>v!==i)){
        tbl.querySelectorAll('tr').forEach(tr=>{
          if(tr.children.length !== ths.length) return;
          const cells = Array.from(tr.children);
          perm.forEach(src=>{ tr.appendChild(cells[src]); });
        });
      }
      // بعد الترتيب: حدّث فهارس الأعمدة
      const where = new Map(); perm.forEach((src,dst)=>where.set(src,dst));
      const headNow = Array.from(tbl.querySelector('thead tr').children);
      units.forEach(u=>{
        u.cols.forEach((src,ix)=>{
          const dst = where.get(src);
          if(ix===0 && u.label){ const th = headNow[dst]; if(th && th.textContent.trim() !== u.label) th.textContent = u.label; }
          if(u.hide){
            tbl.querySelectorAll('tr').forEach(tr=>{
              if(tr.children.length !== headNow.length) return;
              const c = tr.children[dst]; if(c && c.style.display !== 'none'){ c.style.display = 'none'; c.setAttribute('data-clhide','1'); }
            });
          }
        });
      });
      try{ applyTableOrderWidth(ent, tbl); }catch(e){ console.warn('tbl order/width', e); }
    } finally { busy = false; try{ if(window.__tblObs) window.__tblObs.takeRecords(); }catch(_e){} }
  }
  /* ترتيب وعرض أعمدة الجدول مستقل عن ترتيب خانات النموذج: DATA.tableLayouts[ent] = {order:[عنوان], widths:{عنوان:px}} */
  /* قيمة خانة تلقائية (خانة نموذج بلا عمود أصلي) من سجل الشخص */
  const AUTO_PROP = { ResignDate:'resignedAt', Type:'employmentType', IdCardExp:'idCardExpiry', IdCardStatus:'idCardStatus', LicExp:'licenseExpiry', LicStatus:'licenseStatus', ContractType:'contractType', ContractStatus:'contractStatus', Email:'email', Hire:'hireDate', InsNo:'insuranceNumber', InsStatus:'insuranceStatus', WageTemp:'dailyWage', Pos:'position', ProjSince:'projectSince', Phone:'phone', Nid:'nationalId', Birth:'birthDate' };
  const STAT_AR = { valid:'سارية', expired:'منتهية', active:'نشط', insured:'مؤمن عليه', uninsured:'غير مؤمن عليه', pending:'قيد التسجيل', resigned:'مستقيل' };
  function autoCellValue(ent, rec, f){
    const sel = String(f.selector||'').replace(/^#/,'');
    const suf = sel.replace(/^(emp|wrk|sup|drv|eq)/,'');
    if(suf==='LeaveBal') return (ent==='employees' && typeof employeeLeaveBalance==='function') ? employeeLeaveBalance(rec.id) : '';
    if(!f.auto){ if(f.key==='birthDate' && typeof personBirthDate==='function') return personBirthDate(rec)||'—'; const bv = rec[f.key]; if(bv==null||bv==='') return '—'; if(f.key==='status' && typeof labelOf==='function'){ const _sl = labelOf(typeof EMPLOYEE_STATUS!=='undefined'?EMPLOYEE_STATUS:[], bv); if(_sl) return _sl; } return (/^\d{4}-\d{2}-\d{2}/.test(String(bv)) && typeof fmtDate==='function') ? fmtDate(bv) : (STAT_AR[bv]||bv); }
    const prop = AUTO_PROP[suf] || (suf.charAt(0).toLowerCase()+suf.slice(1));
    let v = rec[prop]; if(v==null || v==='') return '—';
    if(/^\d{4}-\d{2}-\d{2}/.test(String(v)) && typeof fmtDate==='function') return fmtDate(v);
    return STAT_AR[v] || v;
  }
  function addAutoColumns(ent, tbl){
    const layout = (typeof ensureFormLayout==='function' ? ensureFormLayout(ent) : []).filter(f=>f && !/ProjSince$/.test(String(f.selector||'')) && f.key!=='projectSince' && (f.auto || (window.__tblUnmatched && window.__tblUnmatched.has(f.key))) && f.showInTable===true && f.visible!==false);
    const sig = layout.map(f=>f.key+':'+f.label).join('|') + '#' + tbl.querySelectorAll('tbody tr').length;
    if(tbl.dataset.autoSig === sig) return;
    tbl.querySelectorAll('[data-auto-col]').forEach(n=>n.remove());
    tbl.dataset.autoSig = sig;
    if(!layout.length) return;
    const headRow = tbl.querySelector('thead tr'); const list = DATA[ent] || [];
    const existing = new Set(Array.from(headRow.children).map(h=>norm(h.textContent)));
    layout.forEach(f=>{
      if(existing.has(norm(f.label))) return;
      const _mh = AUTO_HDR_ALIAS[autoFieldSuffix(f.selector)]; if(_mh && _mh.some(h=>existing.has(norm(h)))) return;
      const th = document.createElement('th'); th.setAttribute('data-auto-col','1'); th.textContent = f.label;
      const last = headRow.lastElementChild; const endBlank = last && !(last.textContent||'').trim() && !last.querySelector('input');
      endBlank ? headRow.insertBefore(th, last) : headRow.appendChild(th);
      tbl.querySelectorAll('tbody tr').forEach(tr=>{
        const cell = document.createElement('td'); cell.setAttribute('data-auto-col','1');
        const idEl = tr.querySelector('[data-id]'); const id = (idEl && idEl.getAttribute('data-id')) || tr.getAttribute('data-emp-id') || '';
        const rec = list.find(r=>r.id===id);
        cell.textContent = rec ? String(autoCellValue(ent, rec, f)) : '—';
        const lastTd = tr.lastElementChild; (endBlank && lastTd && tr.children.length === headRow.children.length-1) ? tr.insertBefore(cell, lastTd) : tr.appendChild(cell);
      });
    });
  }
  function applyTableOrderWidth(ent, tbl){
    try{ addAutoColumns(ent, tbl); }catch(e){ console.warn('auto cols', e); }
  }
  function schedule(){ if(busy || queued) return; queued = true; apply(); }
  function start(){
    const root = document.getElementById('pageContent') || document.body;
    window.__tblObs = new MutationObserver(schedule); window.__tblObs.observe(root, { childList:true, subtree:true });
    schedule();
  }
  window.applyTableColumnLayout = apply;
  window.__tblAlias = { ALIAS: ALIAS, norm: norm };
  if(document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();


/* =========================================================
   الحالة التلقائية مع الإجازات + سن المعاش (60) وقسم «المعاشات»
   ========================================================= */
(function(){
  if(typeof document === 'undefined') return;
  const LISTS = { employee:'employees', worker:'workers', supervisor:'supervisors', driver:'drivers' };
  const KIND_LABEL = { employee:'موظف', worker:'عامل', supervisor:'مشرف', driver:'سائق' };
  const today = ()=> (typeof todayISO==='function' ? todayISO() : new Date().toISOString().slice(0,10));

  /* --- الحالة ↔ الإجازة: إجازة سارية ⇒ «في إجازة»، وبعد انتهائها ⇒ «نشط» --- */
  window.syncLeaveStatuses = function(){
    if(typeof DATA === 'undefined' || typeof activeLeaveOf !== 'function') return false;
    let changed = false;
    Object.keys(LISTS).forEach(kind=>{
      (DATA[LISTS[kind]]||[]).forEach(p=>{
        if(!p) return;
        const on = !!activeLeaveOf(kind, p.id);
        if(on && (p.status==='active' || !p.status)){ p.status = 'on_leave'; p.leaveAuto = true; changed = true; }
        else if(!on && p.status==='on_leave' && p.leaveAuto){ p.status = 'active'; p.leaveAuto = false; changed = true; }
      });
    });
    if(changed){ try{ saveData(true); }catch(_e){} }
    return changed;
  };

  /* --- العمر وسن المعاش --- */
  function birthFromNid(nid){
    const s = String(nid||'').replace(/\D/g,'');
    if(s.length !== 14) return '';
    const c = s[0]==='2' ? 1900 : s[0]==='3' ? 2000 : 0; if(!c) return '';
    const y = c + Number(s.slice(1,3)), m = s.slice(3,5), d = s.slice(5,7);
    if(Number(m)<1 || Number(m)>12 || Number(d)<1 || Number(d)>31) return '';
    return y+'-'+m+'-'+d;
  }
  window.personBirthDate = function(p){ return (p && p.birthDate) || birthFromNid(p && p.nationalId) || ''; };
  window.personAge = function(p, on){
    const b = personBirthDate(p); if(!b) return null;
    const t = on || today();
    let age = Number(t.slice(0,4)) - Number(b.slice(0,4));
    if(t.slice(5) < b.slice(5)) age--;
    return age;
  };
  window.retirementAge = function(){ const v = Number((DATA.settings||{}).retirementAge); return v>0 ? v : 60; };
  /* مَن بلغ سن المعاش ولم يُؤجَّل قراره */
  window.retirementDue = function(kind, includeDeferred){
    const kinds = kind ? [kind] : Object.keys(LISTS);
    const lim = retirementAge(), t = today(), out = [];
    kinds.forEach(k=>{
      (DATA[LISTS[k]]||[]).forEach(p=>{
        if(!p || (typeof isResignedStatus==='function' && isResignedStatus(p.status))) return;
        const a = personAge(p); if(a==null || a < lim) return;
        if(!includeDeferred && p.retireDeferredUntil && p.retireDeferredUntil > t) return;
        out.push({ kind:k, person:p, age:a, birth:personBirthDate(p) });
      });
    });
    return out;
  };
  /* التنبيه يخص القسم المفتوح فقط: الشخص لازم يكون داخل القسم الحالي */
  function inCurrentSection(kind, p){
    try{
      const pg = ({employee:'employees',worker:'workers',supervisor:'supervisors',driver:'drivers'})[kind];
      const _F = { employees:()=>employeeFilters, workers:()=>workerFilters, supervisors:()=>supervisorFilters, drivers:()=>driverFilters }; const f = _F[pg] ? _F[pg]() : null; const id = String((f && (f.departmentId||f.categoryId))||'');
      if(!id) return true;
      const cur = String(p.departmentId||p.categoryId||'');
      if(id===DEPT_NONE || id==='none') return !cur;
      return cur===id;
    }catch(_e){ return true; }
  }
  window.retirementBannerHtml = function(kind){
    const n = retirementDue(kind).filter(x=>inCurrentSection(x.kind, x.person)).length; if(!n) return '';
    return '<div class="ret-banner">🎂 <b>'+n+'</b> '+(n===1?'شخص بلغ':'أشخاص بلغوا')+' سن المعاش ('+retirementAge()+' سنة) — يحتاج قراراً: تجديد أو إحالة للمعاشات <button type="button" class="btn btn-primary btn-sm" data-ret-open="'+kind+'">مراجعة</button></div>';
  };
  function renew(kind, p){
    const d = new Date(); d.setFullYear(d.getFullYear()+1);
    p.retireDeferredUntil = d.toISOString().slice(0,10);
    (p.retirementLog = p.retirementLog || []).push({ at: today(), action:'renew', until:p.retireDeferredUntil });
    if(typeof addAudit==='function') addAudit('تجديد بعد سن المعاش', p.name||p.code||p.id);
  }
  function retire(kind, p){
    p.status = 'retired'; p.leaveAuto = false; p.retiredAt = today();
    (p.retirementLog = p.retirementLog || []).push({ at: today(), action:'retire' });
    if(typeof syncPersonResignedState==='function') syncPersonResignedState(kind, p);
  }
  window.openRetirementModal = function(kind, opts){
    const list = retirementDue(kind, !!(opts && opts.all)).filter(x=>(opts && opts.all) || inCurrentSection(x.kind, x.person));
    const ro = (typeof readOnlyMode!=='undefined' && readOnlyMode) ? 'disabled' : '';
    const rows = list.length ? list.map((x,i)=>'<tr><td>'+escapeHtml(KIND_LABEL[x.kind])+'</td><td><strong>'+escapeHtml(x.person.name||'')+'</strong> <small style="color:var(--ink-soft)">'+escapeHtml(x.person.code||'')+'</small></td><td>'+escapeHtml(fmtDate(x.birth)||'—')+'</td><td><b>'+x.age+'</b> سنة</td><td style="white-space:nowrap;"><button type="button" class="btn btn-outline btn-sm ret-renew" data-i="'+i+'" '+ro+'>🔄 تجديد سنة</button> <button type="button" class="btn btn-primary btn-sm ret-retire" data-i="'+i+'" '+ro+'>🏖️ إحالة للمعاش</button></td></tr>').join('')
      : '<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);padding:24px;">لا أحد بلغ سن المعاش حالياً</td></tr>';
    openModal('<div class="modal-header"><h3>🎂 بلوغ سن المعاش ('+retirementAge()+' سنة)</h3><button type="button" class="modal-close" onclick="closeModal()">×</button></div>'
      +'<div class="modal-body"><p style="font-size:13px;color:var(--ink-soft);margin:0 0 10px;">«تجديد» يؤجّل التنبيه سنة. «إحالة للمعاش» ينقل الشخص لقسم المعاشات وتبقى كل بياناته.</p>'
      +'<div class="table-wrap"><table class="data-table"><thead><tr><th>النوع</th><th>الاسم</th><th>تاريخ الميلاد</th><th>العمر</th><th>القرار</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>'
      +'<div class="modal-footer"><button type="button" class="btn btn-outline" onclick="closeModal()">إغلاق</button></div>');
    const box = document.getElementById('appModal'); if(!box) return;
    box.querySelectorAll('.ret-renew').forEach(b=>b.addEventListener('click', ()=>{
      const x = list[Number(b.dataset.i)]; if(!x) return; renew(x.kind, x.person); try{ saveData(true); }catch(_e){} showToast('تم التجديد — يُنبَّه مرة أخرى بعد سنة'); closeModal(); rerenderCurrentPage(); setTimeout(()=>{ if(retirementDue(kind, !!(opts && opts.all)).length) openRetirementModal(kind, opts); }, 250);
    }));
    box.querySelectorAll('.ret-retire').forEach(b=>b.addEventListener('click', async ()=>{
      const x = list[Number(b.dataset.i)]; if(!x) return;
      const ok = typeof showAppConfirm==='function' ? await showAppConfirm('إحالة '+(x.person.name||'')+' إلى المعاش ونقله لقسم المعاشات؟') : true;
      if(!ok) return;
      retire(x.kind, x.person); try{ saveData(true); }catch(_e){} showToast('تمت الإحالة للمعاش'); closeModal(); rerenderCurrentPage(); setTimeout(()=>{ if(retirementDue(kind).length) openRetirementModal(kind); }, 250);
    }));
  };
  document.addEventListener('click', e=>{
    const b = e.target.closest && e.target.closest('[data-ret-open]'); if(!b) return;
    e.preventDefault(); openRetirementModal(b.getAttribute('data-ret-open') || undefined);
  });
  /* تنبيه في مركز المتابعة */
  function registerAlert(){
    if(typeof registerAlertSource !== 'function') return;
    const PAGES = { employee:'employees', worker:'workers', supervisor:'supervisors', driver:'drivers' };
    registerAlertSource('retirement', 'سن المعاش', function(){
      return retirementDue().map(x=>({
        page: PAGES[x.kind], icon:'🎂', level:'warn', severity:'high', kind:x.kind, kindLabel:KIND_LABEL[x.kind], personId:x.person.id,
        msg: (x.person.name||'')+' بلغ '+x.age+' سنة — القرار: تجديد أو إحالة للمعاش',
        issues: ['تاريخ الميلاد: '+(fmtDate(x.birth)||'—')],
        open: function(){ openRetirementModal(x.kind); }
      }));
    });
  }
  registerAlert();
})();


/* تطبيق «تعديلات مخصصة» على أي نموذج يُفتح بغلاف مستقل (دفتر الموردين وغيره) */
(function(){
  if(typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  function handle(ov){
    if(!ov || ov.__cfApplied || ov.id==='appModal' || ov.hasAttribute('data-cf-capture') || ov.classList.contains('cf-prev-overlay')) return;
    if(!ov.querySelector('input,select,textarea')) return;
    ov.__cfApplied = true;
    setTimeout(function(){ try{ const ent = typeof detectFormEntity==='function' ? detectFormEntity(ov) : ''; if(ent && !(DATA.formLayouts && !DATA.formLayouts[ent])) applyFormLayout(ent, ov); }catch(_e){} }, 60);
  }
  const start = function(){
    new MutationObserver(function(muts){
      muts.forEach(function(m){ m.addedNodes && m.addedNodes.forEach(function(n){ if(n.nodeType===1 && n.classList && n.classList.contains('modal-overlay')) handle(n); }); });
    }).observe(document.body, { childList:true });
  };
  if(document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();

/* أزرار الرجوع: صف واحد منظم — كل زر رجوع متجاور يُجمَّع في شريط واحد بحجم موحّد */
(function(){
  if(typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  function tidy(){
    const root = document.getElementById('pageContent'); if(!root) return;
    // زر رجوع الصفحة ينتقل لنفس صف «◀ القسم» ليكونا في صف أفقي واحد
    root.querySelectorAll('.hr-backbar').forEach(function(bar){
      const page = bar.closest('.page') || root;
      const stop = page.querySelector('.filters-bar, table, .entity-dept-boards, .board-grid, .stat-grid, .eq-kv');
      const badge = bar.querySelector('.badge');
      Array.from(page.querySelectorAll('button')).forEach(function(b){
        if(b.id==='hrBackHome' || bar.contains(b) || b.closest('table,.modal,.modal-overlay')) return;
        const t = (b.textContent||'').trim();
        if(!(/^(←|◀)/.test(t) || (t.length < 28 && /رجوع/.test(t)))) return;
        if(stop && (b.compareDocumentPosition(stop) & Node.DOCUMENT_POSITION_PRECEDING)) return; // بعد بداية المحتوى
        bar.insertBefore(b, badge || null);
      });
    });
    const seen = new Set();
    root.querySelectorAll('button.btn-back').forEach(function(b){
      const p = b.parentElement; if(!p || seen.has(p) || p.classList.contains('back-row')) return;
      seen.add(p);
      const backs = Array.from(p.children).filter(function(c){ return c.tagName==='BUTTON' && c.classList.contains('btn-back'); });
      if(backs.length < 2) return;
      const row = document.createElement('div'); row.className = 'back-row';
      p.insertBefore(row, backs[0]);
      backs.forEach(function(x){ row.appendChild(x); });
    });
  }
  let t = null;
  const start = function(){ new MutationObserver(function(){ if(t) return; t = true; try{ tidy(); }catch(_e){} finally{ t = null; } }).observe(document.body, { childList:true, subtree:true }); tidy(); };
  if(document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();


/* قسما المعاشات والمستقيلين: أزرار «إحالة للمعاش» / «إضافة مستقيل» وكروت خاصة بالقسم */
(function(){
  if(typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  const KIND_OF_PAGE = { employees:'employee', workers:'worker', supervisors:'supervisor', drivers:'driver' };
  const LIST_OF = { employee:'employees', worker:'workers', supervisor:'supervisors', driver:'drivers' };
  const KL = { employee:'موظف', worker:'عامل', supervisor:'مشرف', driver:'سائق' };
  const FILT = { employees:()=>employeeFilters, workers:()=>workerFilters, supervisors:()=>supervisorFilters, drivers:()=>driverFilters };
  const today = ()=> (typeof todayISO==='function' ? todayISO() : new Date().toISOString().slice(0,10));
  window.__sectionOfKind = function(kind){
    try{
      const pg = ({employee:'employees',worker:'workers',supervisor:'supervisors',driver:'drivers'})[kind] || kind;
      const f = FILT[pg] ? FILT[pg]() : null; const id = f && (f.departmentId||f.categoryId||'');
      if(id && isRetiredDeptId(id)) return 'retired';
      if(id && /^__resigned_/.test(id)) return 'resigned';
    }catch(_e){}
    return '';
  };
  /* كروت القسم */
  window.sectionStatCardsHtml = function(kind, rows, sec){
    const ret = sec === 'retired', yr = String(new Date().getFullYear());
    const rd = p=> String(ret ? (p.retiredAt||'') : (p.resignedAt||p.resignDate||'')).slice(0,10);
    const noDate = rows.filter(p=>!rd(p)).length;
    let val = 0, cnt = 0, lastD = '';
    rows.forEach(p=>{
      const r = rd(p); if(r && r>lastD) lastD = r;
      if(ret){ const a = typeof personAge==='function' ? personAge(p, r||undefined) : null; if(a!=null && a>0){ val += a; cnt++; } }
      else { const h = String(p.hireDate||'').slice(0,10); if(h && r && r>=h){ val += (new Date(r)-new Date(h))/(1000*60*60*24*30.4375); cnt++; } }
    });
    const avg = cnt ? val/cnt : 0;
    const avgTxt = !cnt ? '—' : (ret ? Math.round(avg)+' سنة' : (avg>=12 ? (Math.round(avg/12*10)/10)+' سنة' : Math.round(avg)+' شهر'));
    return statCardsHtml([
      {ico:ret?'🏖️':'🚪',label:ret?'عدد المحالين للمعاش':'عدد المستقيلين',value:fmtNum(rows.length)},
      {ico:'📅',label:ret?'أُحيلوا هذا العام':'استقالوا هذا العام',value:fmtNum(rows.filter(p=>rd(p).slice(0,4)===yr).length),tone:'ok'},
      {ico:ret?'🎂':'⏳',label:ret?'متوسط سن الإحالة':'متوسط مدة الخدمة',value:avgTxt},
      {ico:'🗓️',label:ret?'آخر إحالة':'آخر استقالة',value:lastD?fmtDate(lastD):'—'},
      {ico:'❗',label:ret?'بدون تاريخ إحالة':'بدون تاريخ استقالة',value:fmtNum(noDate),tone:noDate?'warn':''}]);
  };
  /* اختيار شخص للاستقالة */
  window.openResignPicker = function(kind){
    const list = (DATA[LIST_OF[kind]]||[]).filter(p=>p && !(typeof isResignedStatus==='function' && isResignedStatus(p.status)));
    const depts = (DATA.departments||[]).filter(d=>d && d.kind===LIST_OF[kind] && !isResignedDeptId(d.id) && !(typeof isRetiredDeptId==='function' && isRetiredDeptId(d.id)));
    const personOpts = (dep)=> '<option value="">— اختر —</option>' + list.filter(p=>!dep || String(p.departmentId||p.categoryId||'')===dep).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ar')).map(p=>'<option value="'+escapeHtml(p.id)+'">'+escapeHtml((p.name||'')+(p.code?' — '+p.code:''))+'</option>').join('');
    const deptOpts = '<option value="">كل الأقسام</option>' + depts.map(d=>'<option value="'+escapeHtml(d.id)+'">'+escapeHtml(d.name||d.id)+'</option>').join('');
    openModal('<div class="modal-header"><h3>🚪 إضافة مستقيل ('+KL[kind]+')</h3><button type="button" class="modal-close" onclick="closeModal()">×</button></div>'
      +'<div class="modal-body"><div class="form-grid form-grid-2" id="rsgGrid">'
      +'<label>القسم<select class="input" id="rsgDept">'+deptOpts+'</select></label>'
      +'<label>اختر الشخص<select class="input" id="rsgPerson">'+personOpts('')+'</select></label>'
      +'<label>تاريخ الاستقالة<input type="date" class="input" id="rsgDate" value="'+today()+'"></label>'
      +'<label style="grid-column:1/-1;">ملاحظات<textarea class="input" id="rsgNote" rows="4" style="min-height:90px;" placeholder="سبب الاستقالة (اختياري)"></textarea></label>'
      +'</div></div><div class="modal-footer"><button type="button" class="btn btn-outline" onclick="closeModal()">إلغاء</button><button type="button" class="btn btn-primary" id="rsgSave">تسجيل الاستقالة</button></div>');
    document.getElementById('rsgDept').addEventListener('change', e=>{ document.getElementById('rsgPerson').innerHTML = personOpts(e.target.value); });
    document.getElementById('rsgSave').addEventListener('click', ()=>{
      const id = document.getElementById('rsgPerson').value; if(!id){ showToast('اختر الشخص'); return; }
      const p = list.find(x=>x.id===id); if(!p) return;
      p.status = 'resigned'; p.leaveAuto = false; p.resignedAt = document.getElementById('rsgDate').value || today();
      const note = (document.getElementById('rsgNote').value||'').trim(); if(note) p.resignReason = note;
      if(typeof syncPersonResignedState==='function') syncPersonResignedState(kind, p);
      if(typeof addAudit==='function') addAudit('استقالة', p.name||p.code||p.id);
      saveData(); closeModal(); showToast('تم تسجيل الاستقالة'); rerenderCurrentPage();
    });
  };
  function fixButtons(){
    const root = document.getElementById('pageContent'); if(!root) return;
    const kind = KIND_OF_PAGE[currentPage]; if(!kind) return;
    const sec = __sectionOfKind(kind); if(!sec) return;
    const ids = ['btnAddEmployee','btnAddWorker','btnAddTempWorker','btnAddSup','btnAddDriver','btnAddExtDriver'];
    let first = true;
    ids.forEach(id=>{
      const b = root.querySelector('#'+id); if(!b) return;
      if(!first || (id==='btnAddWorker' && false)){ b.remove(); return; }
      first = false;
      const nb = b.cloneNode(false); // بدون مستمعين
      nb.removeAttribute('id'); nb.classList.remove('btn-add-worker','btn-green-strong'); nb.className = 'btn btn-primary';
      nb.id = sec==='retired' ? 'btnRetirePerson' : 'btnAddResigned';
      nb.textContent = sec==='retired' ? '🏖️ إحالة للمعاش' : '🚪 إضافة مستقيل';
      nb.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); if(typeof readOnlyMode!=='undefined' && readOnlyMode){ showToast('🔒 قراءة فقط'); return; } if(sec==='retired') openRetirementModal(kind, {all:true}); else openResignPicker(kind); });
      b.parentNode.replaceChild(nb, b);
    });
  }
  let busy = false;
  const start = function(){ const mo = new MutationObserver(function(){ if(busy) return; busy = true; try{ fixButtons(); }catch(_e){} finally{ busy = false; try{ mo.takeRecords(); }catch(_e){} } }); mo.observe(document.body, { childList:true, subtree:true }); try{ fixButtons(); }catch(_e){} };
  if(document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
