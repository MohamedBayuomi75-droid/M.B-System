/* =========================================================
   أرشيف العملاء — مستندات مجمّعة · 0.7.2
   ========================================================= */
let clArchFilters = { q: '', type: '' };

function clAllDocsFlat(){
  const rows = [];
  function add(c, entity, entityName, docs, extra){
    (docs || []).forEach(function(d, i){
      rows.push(Object.assign({
        customerId: c.id, customerName: c.name,
        entity: entity, entityName: entityName || '',
        name: d.name || d.fileName || ('مرفق-' + (i + 1)),
        type: d.type || d.stepLabel || entity,
        date: d.date || '',
        path: d.path || '',
        dataUrl: d.dataUrl || '',
        mime: d.mime || '', doc: d
      }, extra || {}));
    });
  }
  clCustomers().forEach(function(c){
    add(c, 'عميل', c.name, c.docs);
    clProjectsOfCustomer(c).forEach(function(p){ add(c, 'مشروع', p.name, p.docs); });
    (c.contracts || []).forEach(function(k){ add(c, 'عقد', k.title || k.id, k.docs); });
    (c.invoices || []).forEach(function(inv){ add(c, 'مستخلص', inv.no, inv.docs); });
    (c.workSurveys || []).forEach(function(w){ add(c, 'حصر', w.id, w.docs); });
    (c.boqs || []).forEach(function(b){ add(c, 'مقايسة', b.title || b.id, b.docs); });
    (c.collections || []).forEach(function(r){ add(c, 'تحصيل', r.id, r.docs); });
    (c.guarantees || []).forEach(function(g){ add(c, 'ضمان', g.id + (g.letterNo ? ' — ' + g.letterNo : ''), g.docs); });
    (c.contracts || []).forEach(function(k){ (k.changeOrders || []).forEach(function(v){ add(c, 'أمر تغيير', v.id + ' — ' + (v.title || ''), v.docs); }); });
  });
  return rows;
}

function renderClientsArchivePage(){
  const q = (clArchFilters.q || '').trim();
  let list = clAllDocsFlat();
  if(clArchFilters.type) list = list.filter(function(d){ return d.entity === clArchFilters.type; });
  if(q){
    list = list.filter(function(d){
      const hay = [d.name, d.customerName, d.entity, d.entityName, d.type].join(' ');
      return typeof smartMatch === 'function' ? smartMatch(hay, q) : hay.toLowerCase().indexOf(q.toLowerCase()) >= 0;
    });
  }
  list = list.slice().sort(function(a, b){ return String(b.date || '').localeCompare(String(a.date || '')); });

  const types = {};
  clAllDocsFlat().forEach(function(d){ types[d.entity] = (types[d.entity] || 0) + 1; });
  const pg = typeof paginateRows === 'function' ? paginateRows(list, 'clients.archive') : { pageRows: list };

  return `
    <div class="page">
      ${typeof unifiedPageHeader==='function' ? unifiedPageHeader('أرشيف العملاء والمشاريع', 'كل المرفقات من العملاء والعقود والمستخلصات والحصر') : '<h2 class="page-title">أرشيف العملاء والمشاريع</h2>'}
      <div class="stats-row" style="margin-bottom:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;">
        <div class="stat-card"><div class="num">${clAllDocsFlat().length}</div><div class="lbl">كل المرفقات</div></div>
        ${Object.keys(types).map(function(k){
          return '<div class="stat-card"><div class="num">' + types[k] + '</div><div class="lbl">' + escapeHtml(k) + '</div></div>';
        }).join('')}
      </div>
      <div class="filters-bar">
        <input type="search" id="arSearch" class="input" placeholder="بحث..." value="${escapeHtml(clArchFilters.q || '')}" style="min-width:200px;flex:1;">
        <select id="arType" class="input" style="min-width:140px;">
          <option value="">كل الأنواع</option>
          ${Object.keys(types).map(function(k){
            return '<option value="' + escapeHtml(k) + '"' + (clArchFilters.type === k ? ' selected' : '') + '>' + escapeHtml(k) + '</option>';
          }).join('')}
        </select>
        <button type="button" class="btn btn-outline btn-sm" id="arClear">مسح</button>
      </div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>الاسم</th><th>النوع</th><th>الكيان</th><th>العميل</th><th>التاريخ</th><th></th></tr></thead>
        <tbody>
          ${pg.pageRows.length ? pg.pageRows.map(function(d){
            return '<tr><td>' + escapeHtml(d.name) + '</td><td>' + escapeHtml(d.entity) + '</td><td>' + escapeHtml(d.entityName || '—') + '</td><td>' + escapeHtml(d.customerName || '—') + '</td><td>' + escapeHtml(d.date || '—') + '</td><td><button type="button" class="btn btn-outline btn-sm ar-open" data-i="' + pg.pageRows.indexOf(d) + '">فتح</button></td></tr>';
          }).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--ink-soft);padding:28px;">لا مرفقات مسجّلة بعد — تُضاف من نماذج العقود والمستخلصات والحصر</td></tr>'}
        </tbody>
      </table></div>
      ${typeof tablePagerHtml === 'function' ? tablePagerHtml('clients.archive', pg) : ''}
    </div>`;
}
function initClientsArchiveEvents(){
  document.querySelectorAll('.ar-open').forEach(function(b){
    b.addEventListener('click', function(){
      const q = (clArchFilters.q || '').trim();
      let list = clAllDocsFlat();
      if(clArchFilters.type) list = list.filter(function(d){ return d.entity === clArchFilters.type; });
      if(q) list = list.filter(function(d){ const hay = [d.name, d.customerName, d.entity, d.entityName, d.type].join(' '); return typeof smartMatch === 'function' ? smartMatch(hay, q) : hay.toLowerCase().indexOf(q.toLowerCase()) >= 0; });
      list = list.slice().sort(function(a, b){ return String(b.date || '').localeCompare(String(a.date || '')); });
      const pg = typeof paginateRows === 'function' ? paginateRows(list, 'clients.archive') : { pageRows: list };
      clOpenDoc((pg.pageRows[Number(b.getAttribute('data-i'))] || {}).doc);
    });
  });
  document.getElementById('arSearch')?.addEventListener('input', function(e){
    clArchFilters.q = e.target.value;
    clearTimeout(window.__arQT);
    window.__arQT = setTimeout(function(){ rerenderCurrentPage(); }, 220);
  });
  document.getElementById('arType')?.addEventListener('change', function(e){
    clArchFilters.type = e.target.value; rerenderCurrentPage();
  });
  document.getElementById('arClear')?.addEventListener('click', function(){
    clArchFilters.q = ''; clArchFilters.type = ''; rerenderCurrentPage();
  });
}
