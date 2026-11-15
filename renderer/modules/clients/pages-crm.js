/* =========================================================
   CRM — فرص + أنشطة تواصل · شكل الموحد · 0.7
   ========================================================= */
let crmFilters = { q: '', stage: '', tab: 'opps' };
const CRM_STAGES = ['عميل محتمل','تواصل','عرض سعر','تفاوض','ترسية','خسارة','فوز'];

function clAllOpportunities(){
  const rows = [];
  clCustomers().forEach(function(c){
    (c.opportunities || []).forEach(function(o, idx){
      rows.push(Object.assign({}, o, {
        customerId: c.id, customerName: c.name, _idx: idx,
        _key: c.id + '::opp::' + (o.id || idx)
      }));
    });
  });
  return rows;
}
function clAllComms(){
  const rows = [];
  clCustomers().forEach(function(c){
    (c.comms || []).forEach(function(m, idx){
      rows.push(Object.assign({}, m, {
        customerId: c.id, customerName: c.name, _idx: idx,
        _key: c.id + '::comm::' + idx
      }));
    });
  });
  return rows;
}
function clNextOppId(){
  let max = 0;
  clAllOpportunities().forEach(function(o){
    const m = String(o.id || '').match(/(\d+)\s*$/);
    if(m) max = Math.max(max, parseInt(m[1], 10) || 0);
  });
  return 'OPP-' + String(max + 1).padStart(4, '0');
}

function renderClientsCrmPage(){
  const tab = crmFilters.tab || 'opps';
  const q = (crmFilters.q || '').trim();

  if(tab === 'comms') return renderCrmCommsTab(q);

  let list = clAllOpportunities();
  if(crmFilters.stage) list = list.filter(function(o){ return (o.stage || '') === crmFilters.stage; });
  if(q){
    list = list.filter(function(o){
      const hay = [o.id, o.title, o.customerName, o.stage, o.notes, o.source].join(' ');
      return typeof smartMatch === 'function' ? smartMatch(hay, q) : hay.toLowerCase().indexOf(q.toLowerCase()) >= 0;
    });
  }
  list = list.slice().sort(function(a, b){ return String(b.updatedAt || b.id || '').localeCompare(String(a.updatedAt || a.id || '')); });

  const all = clAllOpportunities();
  const pipelineVal = all.filter(function(o){
    return o.stage !== 'خسارة' && o.stage !== 'فوز';
  }).reduce(function(s, o){ return s + (Number(o.expectedValue) || 0); }, 0);
  const wins = all.filter(function(o){ return o.stage === 'فوز'; }).length;

  // pipeline summary by stage
  const byStage = {};
  CRM_STAGES.forEach(function(s){ byStage[s] = []; });
  all.forEach(function(o){
    const s = o.stage || 'عميل محتمل';
    if(!byStage[s]) byStage[s] = [];
    byStage[s].push(o);
  });

  const pg = typeof paginateRows === 'function' ? paginateRows(list, 'clients.crm') : { pageRows: list };
  const stageOpts = CRM_STAGES.map(function(s){
    return '<option value="' + s + '"' + (crmFilters.stage === s ? ' selected' : '') + '>' + s + ' (' + (byStage[s] || []).length + ')</option>';
  }).join('');

  return `
    <div class="page">
      ${typeof unifiedPageHeader==='function' ? unifiedPageHeader("CRM", "فرص المبيعات · أنشطة التواصل والمتابعة", `
<button class="btn btn-outline" id="crmTabOpps">الفرص</button>
          <button class="btn btn-outline" id="crmTabComms">الأنشطة</button>
          <button class="btn btn-primary" id="btnAddOpp" ${readOnlyMode ? 'disabled' : ''}>+ فرصة</button>
          `) : ``}
      <div class="stats-row" style="margin-bottom:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;">
        <div class="stat-card"><div class="num">${all.length}</div><div class="lbl">كل الفرص</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(pipelineVal)}</div><div class="lbl">قيمة المسار</div></div>
        <div class="stat-card"><div class="num">${wins}</div><div class="lbl">فوز</div></div>
        <div class="stat-card"><div class="num">${clAllComms().length}</div><div class="lbl">أنشطة</div></div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
        ${CRM_STAGES.map(function(s){
          const n = (byStage[s] || []).length;
          const val = (byStage[s] || []).reduce(function(a, o){ return a + (Number(o.expectedValue) || 0); }, 0);
          return '<div class="stat-card" style="min-width:100px;padding:8px;cursor:pointer;" data-stage-filter="' + escapeHtml(s) + '">' +
            '<div style="font-size:12px;font-weight:700;">' + escapeHtml(s) + '</div>' +
            '<div class="num" style="font-size:16px;">' + n + '</div>' +
            '<div class="lbl">' + fmtMoney(val) + '</div></div>';
        }).join('')}
      </div>
      <div class="filters-bar">
        <input type="search" id="crmSearch" class="input" placeholder="بحث في الفرص..." value="${escapeHtml(crmFilters.q || '')}" style="min-width:200px;flex:1;">
        <select id="crmStage" class="input" style="min-width:160px;"><option value="">كل المراحل</option>${stageOpts}</select>
        <button type="button" class="btn btn-outline btn-sm" id="crmClear">مسح</button>
      </div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>الكود</th><th>الفرصة</th><th>العميل</th><th>المرحلة</th><th>القيمة المتوقعة</th><th>التالي</th><th></th></tr></thead>
        <tbody>
          ${pg.pageRows.length ? pg.pageRows.map(function(o){
            return '<tr>' +
              '<td>' + escapeHtml(o.id || '—') + '</td>' +
              '<td><strong>' + escapeHtml(o.title || '—') + '</strong></td>' +
              '<td>' + escapeHtml(o.customerName || '—') + '</td>' +
              '<td>' + escapeHtml(o.stage || '—') + '</td>' +
              '<td>' + fmtMoney(o.expectedValue || 0) + '</td>' +
              '<td>' + escapeHtml(o.nextFollowUp || '—') + '</td>' +
              '<td style="white-space:nowrap;">' +
                '<button type="button" class="icon-btn btn-edit-opp" data-key="' + escapeHtml(o._key) + '">✏️</button> ' +
                '<button type="button" class="icon-btn btn-add-comm" data-cid="' + escapeHtml(o.customerId) + '" title="نشاط">💬</button> ' +
                '<button type="button" class="icon-btn icon-del btn-del-opp" data-key="' + escapeHtml(o._key) + '"' + (readOnlyMode ? ' disabled' : '') + '>🗑️</button>' +
              '</td></tr>';
          }).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--ink-soft);padding:28px;">لا فرص — أضف فرصة مرتبطة بعميل</td></tr>'}
        </tbody>
      </table></div>
      ${typeof tablePagerHtml === 'function' ? tablePagerHtml('clients.crm', pg) : ''}
    </div>`;
}

function renderCrmCommsTab(q){
  let list = clAllComms();
  if(q){
    list = list.filter(function(m){
      const hay = [m.note, m.channel, m.customerName, m.next].join(' ');
      return typeof smartMatch === 'function' ? smartMatch(hay, q) : hay.toLowerCase().indexOf(q.toLowerCase()) >= 0;
    });
  }
  list = list.slice().sort(function(a, b){ return String(b.date || '').localeCompare(String(a.date || '')); });
  const pg = typeof paginateRows === 'function' ? paginateRows(list, 'clients.crm.comms') : { pageRows: list };
  const today = (typeof todayISO === 'function') ? todayISO() : new Date().toISOString().slice(0, 10);
  const due = list.filter(function(m){ return m.next && m.next <= today; }).length;

  return `
    <div class="page">
      ${typeof unifiedPageHeader==='function' ? unifiedPageHeader('أنشطة CRM', 'سجل التواصل والمتابعات', `<button class="btn btn-outline" id="crmTabOpps">الفرص</button>
          <button class="btn btn-outline" id="crmTabComms">الأنشطة</button>
          <button class="btn btn-primary" id="btnAddComm" ${readOnlyMode ? 'disabled' : ''}>+ نشاط</button>`) : ``}
      <div class="stats-row" style="margin-bottom:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;">
        <div class="stat-card"><div class="num">${list.length}</div><div class="lbl">الأنشطة</div></div>
        <div class="stat-card"><div class="num">${due}</div><div class="lbl">متابعات مستحقة</div></div>
      </div>
      <div class="filters-bar">
        <input type="search" id="crmSearch" class="input" placeholder="بحث في الأنشطة..." value="${escapeHtml(crmFilters.q || '')}" style="min-width:220px;width:100%;max-width:400px;">
      </div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>التاريخ</th><th>العميل</th><th>القناة</th><th>الملاحظة</th><th>متابعة</th><th></th></tr></thead>
        <tbody>
          ${pg.pageRows.length ? pg.pageRows.map(function(m){
            const overdue = m.next && m.next <= today;
            return '<tr' + (overdue ? ' style="background:rgba(200,80,60,0.08);"' : '') + '>' +
              '<td>' + escapeHtml(m.date || '—') + '</td>' +
              '<td>' + escapeHtml(m.customerName || '—') + '</td>' +
              '<td>' + escapeHtml(m.channel || '—') + '</td>' +
              '<td>' + escapeHtml(m.note || '—') + '</td>' +
              '<td>' + escapeHtml(m.next || '—') + (overdue ? ' ⚠' : '') + '</td>' +
              '<td><button type="button" class="icon-btn icon-del btn-del-comm" data-key="' + escapeHtml(m._key) + '"' + (readOnlyMode ? ' disabled' : '') + '>🗑️</button></td></tr>';
          }).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--ink-soft);padding:28px;">لا أنشطة</td></tr>'}
        </tbody>
      </table></div>
      ${typeof tablePagerHtml === 'function' ? tablePagerHtml('clients.crm.comms', pg) : ''}
    </div>`;
}

function initClientsCrmEvents(){
  document.getElementById('crmTabOpps')?.addEventListener('click', function(){ crmFilters.tab = 'opps'; rerenderCurrentPage(); });
  document.getElementById('crmTabComms')?.addEventListener('click', function(){ crmFilters.tab = 'comms'; rerenderCurrentPage(); });
  document.getElementById('crmSearch')?.addEventListener('input', function(e){
    crmFilters.q = e.target.value;
    clearTimeout(window.__crmQT);
    window.__crmQT = setTimeout(function(){ rerenderCurrentPage(); }, 220);
  });
  document.getElementById('crmStage')?.addEventListener('change', function(e){ crmFilters.stage = e.target.value; rerenderCurrentPage(); });
  document.getElementById('crmClear')?.addEventListener('click', function(){ crmFilters.q = ''; crmFilters.stage = ''; rerenderCurrentPage(); });
  document.querySelectorAll('[data-stage-filter]').forEach(function(el){
    el.addEventListener('click', function(){
      crmFilters.stage = el.getAttribute('data-stage-filter');
      crmFilters.tab = 'opps';
      rerenderCurrentPage();
    });
  });
  document.getElementById('btnAddOpp')?.addEventListener('click', function(){
    if(!clCustomers().length){ showToast('أضف عميلاً أولاً'); return; }
    openOppModal();
  });
  document.getElementById('btnAddComm')?.addEventListener('click', function(){
    if(!clCustomers().length){ showToast('أضف عميلاً أولاً'); return; }
    openCommModal();
  });
  document.querySelectorAll('.btn-edit-opp').forEach(function(b){
    b.addEventListener('click', function(){ openOppModal(b.getAttribute('data-key')); });
  });
  document.querySelectorAll('.btn-add-comm').forEach(function(b){
    b.addEventListener('click', function(){ openCommModal(null, b.getAttribute('data-cid')); });
  });
  document.querySelectorAll('.btn-del-opp').forEach(function(b){
    b.addEventListener('click', function(){
      const row = clAllOpportunities().find(function(o){ return o._key === b.getAttribute('data-key'); });
      if(!row) return;
      (typeof confirmDelete === 'function' ? confirmDelete('حذف الفرصة؟') : Promise.resolve(confirm('حذف؟'))).then(function(ok){
        if(!ok) return;
        const c = clCustomerById(row.customerId);
        if(!c) return;
        c.opportunities = (c.opportunities || []).filter(function(o){ return o.id !== row.id; });
        clUpsertCustomer(c); showToast('تم الحذف'); rerenderCurrentPage();
      });
    });
  });
  document.querySelectorAll('.btn-del-comm').forEach(function(b){
    b.addEventListener('click', function(){
      const row = clAllComms().find(function(m){ return m._key === b.getAttribute('data-key'); });
      if(!row) return;
      (typeof confirmDelete === 'function' ? confirmDelete('حذف النشاط؟') : Promise.resolve(confirm('حذف؟'))).then(function(ok){
        if(!ok) return;
        const c = clCustomerById(row.customerId);
        if(!c) return;
        c.comms = (c.comms || []).filter(function(_, i){ return i !== row._idx; });
        clUpsertCustomer(c); showToast('تم الحذف'); rerenderCurrentPage();
      });
    });
  });
}

function openOppModal(editKey){
  const existing = editKey ? clAllOpportunities().find(function(o){ return o._key === editKey; }) : null;
  const customers = clCustomers();
  if(!customers.length) return;
  const initialCid = existing ? existing.customerId : customers[0].id;
  const today = (typeof todayISO === 'function') ? todayISO() : new Date().toISOString().slice(0, 10);

  openModal(`
    <div class="modal-header"><h3>${existing ? 'تعديل فرصة' : 'فرصة جديدة'}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body"><div class="form-grid form-grid-2">
      <label>العميل *<select class="input" id="oppCust">${customers.map(function(c){
        return '<option value="' + escapeHtml(c.id) + '"' + (initialCid === c.id ? ' selected' : '') + '>' + escapeHtml(c.name) + '</option>';
      }).join('')}</select></label>
      <label>الكود<input class="input" id="oppId" value="${escapeHtml(existing && existing.id || clNextOppId())}"></label>
      <label>عنوان الفرصة *<input class="input" id="oppTitle" value="${escapeHtml(existing && existing.title || '')}"></label>
      <label>المرحلة<select class="input" id="oppStage">${CRM_STAGES.map(function(s){
        const cur = existing ? (existing.stage || CRM_STAGES[0]) : CRM_STAGES[0];
        return '<option value="' + s + '"' + (cur === s ? ' selected' : '') + '>' + s + '</option>';
      }).join('')}</select></label>
      <label>القيمة المتوقعة<input class="input" id="oppVal" type="number" step="0.01" value="${existing ? toInt(existing.expectedValue) : ''}"></label>
      <label>المصدر<input class="input" id="oppSrc" value="${escapeHtml(existing && existing.source || '')}"></label>
      <label>متابعة بتاريخ<input class="input" id="oppNext" type="date" value="${escapeHtml(existing && existing.nextFollowUp || '')}"></label>
      <label>تاريخ<input class="input" id="oppDate" type="date" value="${escapeHtml(existing && existing.date || today)}"></label>
      <label style="grid-column:1/-1;">ملاحظات<textarea class="input" id="oppNotes" rows="2">${escapeHtml(existing && existing.notes || '')}</textarea></label>
    </div></div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" id="btnSaveOpp">حفظ</button></div>
  `);
  document.getElementById('btnSaveOpp').onclick = function(){
    const cid = document.getElementById('oppCust').value;
    const c = clCustomerById(cid);
    if(!c) return;
    const title = (document.getElementById('oppTitle').value || '').trim();
    if(!title){ showToast('العنوان مطلوب'); return; }
    const rec = {
      id: (document.getElementById('oppId').value || '').trim() || clNextOppId(),
      title: title,
      stage: document.getElementById('oppStage').value || CRM_STAGES[0],
      expectedValue: toInt(document.getElementById('oppVal').value),
      source: (document.getElementById('oppSrc').value || '').trim(),
      nextFollowUp: document.getElementById('oppNext').value || '',
      date: document.getElementById('oppDate').value || '',
      notes: (document.getElementById('oppNotes').value || '').trim(),
      updatedAt: new Date().toISOString()
    };
    c.opportunities = c.opportunities || [];
    if(existing && existing.customerId === cid){
      const i = c.opportunities.findIndex(function(o){ return o.id === existing.id; });
      if(i >= 0) c.opportunities[i] = rec; else c.opportunities.push(rec);
    } else {
      if(existing && existing.customerId !== cid){
        const old = clCustomerById(existing.customerId);
        if(old){ old.opportunities = (old.opportunities || []).filter(function(o){ return o.id !== existing.id; }); clUpsertCustomer(old); }
      }
      c.opportunities.push(rec);
    }
    clUpsertCustomer(c); closeModal(); showToast('تم الحفظ'); rerenderCurrentPage();
  };
}

function openCommModal(editKey, presetCid){
  const customers = clCustomers();
  if(!customers.length) return;
  const today = (typeof todayISO === 'function') ? todayISO() : new Date().toISOString().slice(0, 10);
  const channels = ['اتصال','واتساب','بريد','اجتماع','زيارة','أخرى'];
  openModal(`
    <div class="modal-header"><h3>نشاط تواصل</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body"><div class="form-grid form-grid-2">
      <label>العميل *<select class="input" id="cmCust">${customers.map(function(c){
        return '<option value="' + escapeHtml(c.id) + '"' + (presetCid === c.id ? ' selected' : '') + '>' + escapeHtml(c.name) + '</option>';
      }).join('')}</select></label>
      <label>القناة<select class="input" id="cmCh">${channels.map(function(ch){ return '<option value="' + ch + '">' + ch + '</option>'; }).join('')}</select></label>
      <label>التاريخ<input class="input" id="cmDate" type="date" value="${today}"></label>
      <label>متابعة بتاريخ<input class="input" id="cmNext" type="date" value=""></label>
      <label style="grid-column:1/-1;">الملاحظة *<textarea class="input" id="cmNote" rows="3"></textarea></label>
    </div></div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" id="btnSaveComm">حفظ</button></div>
  `);
  document.getElementById('btnSaveComm').onclick = function(){
    const cid = document.getElementById('cmCust').value;
    const c = clCustomerById(cid);
    if(!c) return;
    const note = (document.getElementById('cmNote').value || '').trim();
    if(!note){ showToast('الملاحظة مطلوبة'); return; }
    c.comms = c.comms || [];
    c.comms.unshift({
      date: document.getElementById('cmDate').value || today,
      channel: document.getElementById('cmCh').value || 'اتصال',
      note: note,
      next: document.getElementById('cmNext').value || ''
    });
    clUpsertCustomer(c); closeModal(); showToast('تم تسجيل النشاط');
    crmFilters.tab = 'comms';
    rerenderCurrentPage();
  };
}
