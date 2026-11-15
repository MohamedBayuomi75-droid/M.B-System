/* =========================================================
   مهامي — تجميع كل ما عليه تعيين (assignedTo)
   ========================================================= */
let tasksFilters = { q: '', kind: '', onlyMine: false };

function clCollectAssignedTasks(){
  const rows = [];
  function push(kind, id, title, status, assignedTo, customerId, customerName, extra){
    if(!assignedTo) return;
    rows.push(Object.assign({
      kind: kind, id: id, title: title || id, status: status || '',
      assignedTo: assignedTo, customerId: customerId, customerName: customerName || ''
    }, extra || {}));
  }
  clCustomers().forEach(function(c){
    (c.contracts || []).forEach(function(k){
      push('عقد', k.id, k.title, k.status, k.assignedTo, c.id, c.name);
    });
    (c.invoices || []).forEach(function(inv){
      push('مستخلص', inv.no, inv.project || inv.no, inv.status, inv.assignedTo, c.id, c.name);
    });
    (c.workSurveys || []).forEach(function(w){
      push('حصر', w.id, w.workType || w.project || w.id, w.status, w.assignedTo, c.id, c.name);
    });
    (c.opportunities || []).forEach(function(o){
      if(o.assignedTo) push('فرصة CRM', o.id, o.title, o.stage, o.assignedTo, c.id, c.name);
    });
  });
  // مشاريع الموحد
  (DATA.projects || []).forEach(function(p){
    if(p.assignedTo){
      push('مشروع', p.code || p.name, p.name, p.status, p.assignedTo, p.customerId || '', p.customerName || p.customer || '');
    }
  });
  return rows;
}

function renderClientsTasksPage(){
  const q = (tasksFilters.q || '').trim();
  let list = clCollectAssignedTasks();
  // onlyMine: try current user name/id if available
  let uid = '';
  try{
    if(typeof currentUser !== 'undefined' && currentUser){
      uid = currentUser.id || currentUser.name || '';
    }
  }catch(_e){}
  if(tasksFilters.onlyMine && uid){
    list = list.filter(function(t){ return t.assignedTo === uid || t.assignedTo === (currentUser && currentUser.name); });
  }
  if(tasksFilters.kind) list = list.filter(function(t){ return t.kind === tasksFilters.kind; });
  if(q){
    list = list.filter(function(t){
      const hay = [t.id, t.title, t.customerName, t.kind, t.status, t.assignedTo].join(' ');
      return typeof smartMatch === 'function' ? smartMatch(hay, q) : hay.toLowerCase().indexOf(q.toLowerCase()) >= 0;
    });
  }

  const kinds = {};
  clCollectAssignedTasks().forEach(function(t){ kinds[t.kind] = (kinds[t.kind] || 0) + 1; });
  const pg = typeof paginateRows === 'function' ? paginateRows(list, 'tasks.my') : { pageRows: list };

  return `
    <div class="page">
      ${typeof unifiedPageHeader==='function' ? unifiedPageHeader("مهامي", "كل العناصر المعيّنة لمسؤول (مشاريع، عقود، مستخلصات، حصر، فرص)", ``) : ``}
      <div class="stats-row" style="margin-bottom:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;">
        <div class="stat-card"><div class="num">${clCollectAssignedTasks().length}</div><div class="lbl">كل المهام</div></div>
        ${Object.keys(kinds).map(function(k){
          return '<div class="stat-card"><div class="num">' + kinds[k] + '</div><div class="lbl">' + escapeHtml(k) + '</div></div>';
        }).join('')}
      </div>
      <div class="filters-bar">
        <input type="search" id="tkSearch" class="input" placeholder="بحث..." value="${escapeHtml(tasksFilters.q || '')}" style="min-width:200px;flex:1;">
        <select id="tkKind" class="input" style="min-width:140px;">
          <option value="">كل الأنواع</option>
          ${Object.keys(kinds).map(function(k){
            return '<option value="' + escapeHtml(k) + '"' + (tasksFilters.kind === k ? ' selected' : '') + '>' + escapeHtml(k) + '</option>';
          }).join('')}
        </select>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;">
          <input type="checkbox" id="tkMine" ${tasksFilters.onlyMine ? 'checked' : ''}> مهامي فقط
        </label>
        <button type="button" class="btn btn-outline btn-sm" id="tkClear">مسح</button>
      </div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>النوع</th><th>المعرف</th><th>العنوان</th><th>العميل</th><th>الحالة</th><th>المسؤول</th></tr></thead>
        <tbody>
          ${pg.pageRows.length ? pg.pageRows.map(function(t){
            return '<tr><td>' + escapeHtml(t.kind) + '</td><td>' + escapeHtml(t.id || '') + '</td><td><strong>' + escapeHtml(t.title || '') + '</strong></td><td>' + escapeHtml(t.customerName || '—') + '</td><td>' + escapeHtml(t.status || '—') + '</td><td>' + escapeHtml(t.assignedTo || '—') + '</td></tr>';
          }).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--ink-soft);padding:28px;">لا مهام معيّنة — عيّن مسؤولاً من نماذج المشاريع/العقود/المستخلصات</td></tr>'}
        </tbody>
      </table></div>
      ${typeof tablePagerHtml === 'function' ? tablePagerHtml('tasks.my', pg) : ''}
    </div>`;
}

function initClientsTasksEvents(){
  document.getElementById('tkSearch')?.addEventListener('input', function(e){
    tasksFilters.q = e.target.value;
    clearTimeout(window.__tkQT);
    window.__tkQT = setTimeout(function(){ if(typeof resetTablePage === 'function') resetTablePage('tasks.my'); rerenderCurrentPage(); }, 220);
  });
  document.getElementById('tkKind')?.addEventListener('change', function(e){
    tasksFilters.kind = e.target.value;
    if(typeof resetTablePage === 'function') resetTablePage('tasks.my');
    rerenderCurrentPage();
  });
  document.getElementById('tkMine')?.addEventListener('change', function(e){
    tasksFilters.onlyMine = !!e.target.checked;
    rerenderCurrentPage();
  });
  document.getElementById('tkClear')?.addEventListener('click', function(){
    tasksFilters.q = ''; tasksFilters.kind = ''; tasksFilters.onlyMine = false;
    rerenderCurrentPage();
  });
}
