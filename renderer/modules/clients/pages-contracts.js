/* =========================================================
   العقود — شكل النظام الموحد · المرحلة 0.7
   ========================================================= */
let contractFilters = { q: '', customerId: '', status: '', detailKey: '' };

function clAllContracts(){
  const rows = [];
  clCustomers().forEach(function(c){
    (c.contracts || []).forEach(function(k, idx){
      rows.push(Object.assign({}, k, {
        customerId: c.id, customerName: c.name, _idx: idx,
        _key: c.id + '::' + (k.id || idx)
      }));
    });
  });
  return rows;
}
function clNextContractId(){
  const p = (clSettings().contractPrefix || 'CON-');
  let max = 0;
  clAllContracts().forEach(function(k){
    const m = String(k.id || '').match(/(\d+)\s*$/);
    if(m) max = Math.max(max, parseInt(m[1], 10) || 0);
  });
  return p + String(max + 1).padStart(4, '0');
}

function renderClientsContractsPage(){
  if(contractFilters.detailKey) return renderContractDetail(contractFilters.detailKey);
  const q = (contractFilters.q || '').trim();
  let list = clAllContracts();
  if(contractFilters.customerId) list = list.filter(function(k){ return k.customerId === contractFilters.customerId; });
  if(contractFilters.status) list = list.filter(function(k){ return (k.status || '') === contractFilters.status; });
  if(q){
    list = list.filter(function(k){
      const hay = [k.id, k.title, k.project, k.customerName, k.notes, k.status].join(' ');
      return typeof smartMatch === 'function' ? smartMatch(hay, q) : hay.toLowerCase().indexOf(q.toLowerCase()) >= 0;
    });
  }
  list = list.slice().sort(function(a, b){ return String(b.contractDate || b.id || '').localeCompare(String(a.contractDate || a.id || '')); });

  const all = clAllContracts();
  const active = all.filter(function(k){ return (k.status || 'ساري') === 'ساري'; }).length;
  const totalVal = all.reduce(function(s, k){ return s + (Number(k.value) || 0); }, 0);
  try{
    if(typeof setPageExport === 'function'){
      setPageExport('clients.contracts',
        ['الكود','العنوان','العميل','المشروع','القيمة','من','إلى','الحالة'],
        list.map(function(k){
          return [k.id || '', k.title || '', k.customerName || '', k.project || '', Number(k.value) || 0, k.start || '', k.end || '', k.status || ''];
        })
      );
    }
  }catch(_e){}

  const pg = typeof paginateRows === 'function' ? paginateRows(list, 'clients.contracts') : { pageRows: list };
  const custOpts = clCustomers().map(function(c){
    return '<option value="' + escapeHtml(c.id) + '"' + (contractFilters.customerId === c.id ? ' selected' : '') + '>' +
      escapeHtml((c.code ? c.code + ' — ' : '') + c.name) + '</option>';
  }).join('');
  const statuses = ['ساري','منتهي','موقوف','ملغي'];
  const statusOpts = statuses.map(function(s){
    return '<option value="' + s + '"' + (contractFilters.status === s ? ' selected' : '') + '>' + s + '</option>';
  }).join('');

  return `
    <div class="page">
      ${typeof unifiedPageHeader==='function' ? unifiedPageHeader("العقود", "عقود العملاء · مرتبطة بالمقايسات والحصر والمستخلصات", `
${typeof pageExportButtonsHtml === 'function' ? pageExportButtonsHtml() : ''}
          <button class="btn btn-primary" id="btnAddContract" ${readOnlyMode ? 'disabled' : ''}>+ عقد</button>
          `) : ``}
      <div class="stats-row" style="margin-bottom:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;">
        <div class="stat-card"><div class="num">${all.length}</div><div class="lbl">كل العقود</div></div>
        <div class="stat-card"><div class="num">${active}</div><div class="lbl">ساري</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(totalVal)}</div><div class="lbl">إجمالي القيم</div></div>
        <div class="stat-card"><div class="num">${list.length}</div><div class="lbl">نتيجة البحث</div></div>
      </div>
      <div class="filters-bar">
        <input type="search" id="ctSearch" class="input" placeholder="بحث: كود، عنوان، مشروع، عميل..." value="${escapeHtml(contractFilters.q || '')}" style="min-width:200px;flex:1;">
        <select id="ctCustomer" class="input" style="min-width:180px;"><option value="">كل العملاء</option>${custOpts}</select>
        <select id="ctStatus" class="input" style="min-width:130px;"><option value="">كل الحالات</option>${statusOpts}</select>
        <button type="button" class="btn btn-outline btn-sm" id="ctClear">مسح الفلاتر</button>
      </div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>الكود</th><th>العنوان</th><th>العميل</th><th>المشروع</th><th>القيمة</th><th>الفترة</th><th>الحالة</th><th>ملاحظات</th><th></th></tr></thead>
        <tbody>
          ${pg.pageRows.length ? pg.pageRows.map(function(k){
            const period = (k.start || k.end) ? (escapeHtml(k.start || '…') + ' ← ' + escapeHtml(k.end || '…')) : '—';
            return '<tr>' +
              '<td style="white-space:nowrap;">' + escapeHtml(k.id || '—') + '</td>' +
              '<td><strong>' + escapeHtml(k.title || '—') + '</strong></td>' +
              '<td>' + escapeHtml(k.customerName || '—') + '</td>' +
              '<td>' + escapeHtml(k.project || '—') + '</td>' +
              '<td style="white-space:nowrap;"><strong>' + fmtMoney(k.value || 0) + '</strong></td>' +
              '<td style="font-size:12px;">' + period + '</td>' +
              '<td>' + escapeHtml(k.status || 'ساري') + '</td>' +
              '<td class="notes-cell">' + recordNotesCellHtml(contractNotesIssues(k)) + '</td>' +
              '<td style="white-space:nowrap;">' +
                '<button type="button" class="icon-btn btn-view-ct" data-key="' + escapeHtml(k._key) + '">👁️</button> ' +
                '<button type="button" class="icon-btn btn-edit-ct" data-key="' + escapeHtml(k._key) + '">✏️</button> ' +
                '<button type="button" class="icon-btn icon-del btn-del-ct" data-key="' + escapeHtml(k._key) + '"' + (readOnlyMode ? ' disabled' : '') + '>🗑️</button>' +
              '</td></tr>';
          }).join('') : '<tr><td colspan="9" style="text-align:center;color:var(--ink-soft);padding:28px;">لا عقود</td></tr>'}
        </tbody>
      </table></div>
      ${typeof tablePagerHtml === 'function' ? tablePagerHtml('clients.contracts', pg) : ''}
    </div>`;
}

function renderContractDetail(key){
  const k = clAllContracts().find(function(x){ return x._key === key; });
  if(!k){ contractFilters.detailKey = ''; return renderClientsContractsPage(); }
  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div>
          <button type="button" class="btn btn-outline btn-sm" id="ctBack">← رجوع</button>
          <h2 class="page-title" style="margin:8px 0 0;">${escapeHtml(k.title || k.id)}</h2>
          <p class="page-sub" style="margin:4px 0 0;">${escapeHtml(k.customerName || '')} · ${escapeHtml(k.id || '')}</p>
        </div>
        <button class="btn btn-outline" id="ctEditFromDetail">تعديل</button>
      </div>
      <div class="stats-row" style="margin-bottom:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;">
        <div class="stat-card"><div class="num">${fmtMoney(k.value || 0)}</div><div class="lbl">قيمة العقد</div></div>
        <div class="stat-card"><div class="num">${escapeHtml(k.status || 'ساري')}</div><div class="lbl">الحالة</div></div>
        <div class="stat-card"><div class="num">${Number(k.retentionPct) || 0}%</div><div class="lbl">احتجاز</div></div>
      </div>
      <div class="card" style="padding:14px;">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;font-size:13px;">
          <div><span style="color:var(--ink-soft);">المشروع:</span> ${escapeHtml(k.project || '—')}</div>
          <div><span style="color:var(--ink-soft);">من:</span> ${escapeHtml(k.start || '—')}</div>
          <div><span style="color:var(--ink-soft);">إلى:</span> ${escapeHtml(k.end || '—')}</div>
          <div><span style="color:var(--ink-soft);">تاريخ العقد:</span> ${escapeHtml(k.contractDate || '—')}</div>
          <div><span style="color:var(--ink-soft);">شروط الدفع:</span> ${escapeHtml(k.paymentTerms || '—')}</div>
          <div><span style="color:var(--ink-soft);">مقايسة:</span> ${escapeHtml(k.boqId || '—')}</div>
        </div>
        ${k.notes ? '<p style="margin-top:10px;color:var(--ink-soft);">' + escapeHtml(k.notes) + '</p>' : ''}
      </div>
      ${typeof clChangeOrdersSectionHtml === 'function' ? clChangeOrdersSectionHtml(k.customerId, k.id) : ''}
      ${typeof clGuaranteesSectionHtml === 'function' ? clGuaranteesSectionHtml(k.customerId, k.id) : ''}
    </div>`;
}

function initClientsContractsEvents(){
  if(contractFilters.detailKey){
    document.getElementById('ctBack')?.addEventListener('click', function(){ contractFilters.detailKey = ''; rerenderCurrentPage(); });
    document.getElementById('ctEditFromDetail')?.addEventListener('click', function(){ openContractModal(contractFilters.detailKey); });
    if(typeof initGuaranteeSections === 'function') initGuaranteeSections();
    if(typeof initChangeOrderSections === 'function') initChangeOrderSections();
    return;
  }
  document.getElementById('ctSearch')?.addEventListener('input', function(e){
    contractFilters.q = e.target.value;
    clearTimeout(window.__ctQT);
    window.__ctQT = setTimeout(function(){ if(typeof resetTablePage === 'function') resetTablePage('clients.contracts'); rerenderCurrentPage(); }, 220);
  });
  document.getElementById('ctCustomer')?.addEventListener('change', function(e){
    contractFilters.customerId = e.target.value;
    if(typeof resetTablePage === 'function') resetTablePage('clients.contracts');
    rerenderCurrentPage();
  });
  document.getElementById('ctStatus')?.addEventListener('change', function(e){
    contractFilters.status = e.target.value;
    if(typeof resetTablePage === 'function') resetTablePage('clients.contracts');
    rerenderCurrentPage();
  });
  document.getElementById('ctClear')?.addEventListener('click', function(){
    contractFilters.q = ''; contractFilters.customerId = ''; contractFilters.status = '';
    if(typeof resetTablePage === 'function') resetTablePage('clients.contracts');
    rerenderCurrentPage();
  });
  document.getElementById('btnAddContract')?.addEventListener('click', function(){
    if(!clCustomers().length){ showToast('أضف عميلاً أولاً'); return; }
    openContractModal();
  });
  document.querySelectorAll('.btn-view-ct').forEach(function(b){
    b.addEventListener('click', function(){ contractFilters.detailKey = b.getAttribute('data-key'); rerenderCurrentPage(); });
  });
  document.querySelectorAll('.btn-edit-ct').forEach(function(b){
    b.addEventListener('click', function(){ openContractModal(b.getAttribute('data-key')); });
  });
  document.querySelectorAll('.btn-del-ct').forEach(function(b){
    b.addEventListener('click', function(){
      const key = b.getAttribute('data-key');
      const row = clAllContracts().find(function(x){ return x._key === key; });
      if(!row) return;
      (typeof confirmDelete === 'function' ? confirmDelete('حذف العقد «' + (row.id || '') + '»؟') : Promise.resolve(confirm('حذف؟'))).then(function(ok){
        if(!ok) return;
        const cust = clCustomerById(row.customerId);
        if(!cust) return;
        cust.contracts = (cust.contracts || []).filter(function(x){ return x.id !== row.id; });
        clUpsertCustomer(cust);
        showToast('تم الحذف');
        rerenderCurrentPage();
      });
    });
  });
}

function openContractModal(editKey){
  const existing = editKey ? clAllContracts().find(function(k){ return k._key === editKey; }) : null;
  const customers = clCustomers();
  if(!customers.length){ showToast('أضف عميلاً أولاً'); return; }
  const today = (typeof todayISO === 'function') ? todayISO() : new Date().toISOString().slice(0, 10);
  const initialCid = existing ? existing.customerId : customers[0].id;
  const statuses = ['ساري','منتهي','موقوف','ملغي'];

  function boqOpts(cid){
    const c = clCustomerById(cid);
    return ((c && c.boqs) || []).map(function(b){
      const sel = existing && existing.boqId === b.id ? ' selected' : '';
      return '<option value="' + escapeHtml(b.id) + '"' + sel + '>' + escapeHtml(b.id + (b.title ? ' — ' + b.title : '') + ' (' + (typeof fmtMoney === 'function' ? fmtMoney(clBoqTotal(b)) : '') + ')') + '</option>';
    }).join('');
  }
  function surveyOpts(cid){
    const c = clCustomerById(cid);
    return ((c && c.workSurveys) || []).map(function(w){
      const sel = existing && (existing.workSurveyIds || []).indexOf(w.id) >= 0 ? ' selected' : '';
      return '<option value="' + escapeHtml(w.id) + '"' + sel + '>' + escapeHtml(w.id + (w.project ? ' — ' + w.project : '')) + '</option>';
    }).join('');
  }

  openModal(`
    <div class="modal-header"><h3>${existing ? 'تعديل عقد' : 'عقد جديد'}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body" style="max-height:70vh;overflow:auto;">
      <div class="form-grid form-grid-2">
        <label>العميل *<select class="input" id="ctCust">${customers.map(function(c){
          return '<option value="' + escapeHtml(c.id) + '"' + (initialCid === c.id ? ' selected' : '') + '>' + escapeHtml((c.code ? c.code + ' — ' : '') + c.name) + '</option>';
        }).join('')}</select></label>
        <label>كود العقد<input class="input" id="ctId" value="${escapeHtml(existing && existing.id || clNextContractId())}"></label>
        <label>عنوان العقد *<input class="input" id="ctTitle" value="${escapeHtml(existing && existing.title || '')}"></label>
        <label>المشروع<input class="input" id="ctProject" list="clProjList" value="${escapeHtml(existing && existing.project || '')}">${clProjectDatalistHtml('clProjList')}</label>
        <label>القيمة (ج.م)<input class="input" id="ctValue" type="number" step="0.01" value="${existing ? toInt(existing.value) : ''}"></label>
        <label>الحالة<select class="input" id="ctSt">${statuses.map(function(s){
          const cur = existing ? (existing.status || 'ساري') : 'ساري';
          return '<option value="' + s + '"' + (cur === s ? ' selected' : '') + '>' + s + '</option>';
        }).join('')}</select></label>
        <label>تاريخ البداية<input class="input" id="ctStart" type="date" value="${escapeHtml(existing && existing.start || today)}"></label>
        <label>تاريخ النهاية<input class="input" id="ctEnd" type="date" value="${escapeHtml(existing && existing.end || '')}"></label>
        <label>تاريخ العقد<input class="input" id="ctDate" type="date" value="${escapeHtml(existing && existing.contractDate || today)}"></label>
        <label>نسبة الاحتجاز %<input class="input" id="ctRet" type="number" step="0.1" value="${existing && existing.retentionPct != null ? existing.retentionPct : 5}"></label>
        <label>المقايسة المرتبطة<select class="input" id="ctBoq"><option value="">—</option>${boqOpts(initialCid)}</select></label>
        <label>شروط الدفع<input class="input" id="ctPay" value="${escapeHtml(existing && existing.paymentTerms || 'حسب المستخلصات المعتمدة')}"></label>
        <label style="grid-column:1/-1;">أعمال حصر
          <select class="input" id="ctSurveys" multiple size="3">${surveyOpts(initialCid)}</select>
        </label>
        <label style="grid-column:1/-1;">ملاحظات<textarea class="input" id="ctNotes" rows="2">${escapeHtml(existing && existing.notes || '')}</textarea></label>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="btnSaveContract">حفظ</button>
    </div>
  `);

  document.getElementById('ctCust').addEventListener('change', function(){
    const cid = document.getElementById('ctCust').value;
    document.getElementById('ctBoq').innerHTML = '<option value="">—</option>' + boqOpts(cid);
    document.getElementById('ctSurveys').innerHTML = surveyOpts(cid);
  });
  document.getElementById('ctBoq').addEventListener('change', function(){
    const cid = document.getElementById('ctCust').value;
    const c = clCustomerById(cid);
    const bid = document.getElementById('ctBoq').value;
    if(!c || !bid) return;
    const b = (c.boqs || []).find(function(x){ return x.id === bid; });
    if(!b) return;
    if(!document.getElementById('ctValue').value) document.getElementById('ctValue').value = clBoqTotal(b);
    if(!document.getElementById('ctProject').value && b.project) document.getElementById('ctProject').value = b.project;
    if(!document.getElementById('ctTitle').value) document.getElementById('ctTitle').value = 'عقد على مقايسة ' + b.id + (b.title ? ' — ' + b.title : '');
  });

  clMountCustomFields('clContracts', existing);
  const attEd = clAttachMount(function(){ return document.getElementById('ctId').value; }, 'عقد', existing ? existing.docs : []);
  document.getElementById('btnSaveContract').onclick = function(){
    const cid = document.getElementById('ctCust').value;
    const cust = clCustomerById(cid);
    if(!cust){ showToast('اختر عميلاً'); return; }
    const title = (document.getElementById('ctTitle').value || '').trim();
    if(!title){ showToast('عنوان العقد مطلوب'); return; }
    const surveySel = document.getElementById('ctSurveys');
    const workSurveyIds = surveySel ? Array.from(surveySel.selectedOptions).map(function(o){ return o.value; }) : [];
    const rec = {
      id: (document.getElementById('ctId').value || '').trim() || clNextContractId(),
      title: title,
      project: (document.getElementById('ctProject').value || '').trim(),
      value: toInt(document.getElementById('ctValue').value),
      start: document.getElementById('ctStart').value || '',
      end: document.getElementById('ctEnd').value || '',
      contractDate: document.getElementById('ctDate').value || '',
      status: document.getElementById('ctSt').value || 'ساري',
      retentionPct: toInt(document.getElementById('ctRet').value),
      taxPct: existing ? (existing.taxPct || 0) : 0,
      advancePct: existing ? (existing.advancePct || 0) : 0,
      paymentTerms: (document.getElementById('ctPay').value || '').trim(),
      boqId: document.getElementById('ctBoq').value || '',
      workSurveyIds: workSurveyIds,
      notes: (document.getElementById('ctNotes').value || '').trim(),
      assignedTo: existing ? (existing.assignedTo || '') : '',
      projectId: existing ? (existing.projectId || '') : '',
      docs: attEd.get(),
      extraFields: clCollectCustomFields('clContracts', existing),
      changeOrders: existing ? (existing.changeOrders || []) : [],
      originalValue: existing && existing.originalValue != null ? existing.originalValue : ''
    };
    if(rec.changeOrders.length && rec.originalValue !== ''){ rec.originalValue = Math.round((rec.value - clVoApprovedSum(rec)) * 100) / 100; }
    const conf = rec.project && clProjectNameConflict(cid, rec.project);
    if(conf){ showToast('المشروع «' + rec.project + '» تابع للعميل «' + conf.owner + '» — اختر مشروعًا آخر'); return; }
    cust.contracts = cust.contracts || [];
    if(existing && existing.customerId === cid){
      const i = cust.contracts.findIndex(function(x){ return x.id === existing.id; });
      if(i >= 0) cust.contracts[i] = rec; else cust.contracts.push(rec);
    } else {
      if(existing && existing.customerId !== cid){
        const oldC = clCustomerById(existing.customerId);
        if(oldC){ oldC.contracts = (oldC.contracts || []).filter(function(x){ return x.id !== existing.id; }); clUpsertCustomer(oldC); }
      }
      const i = cust.contracts.findIndex(function(x){ return x.id === rec.id; });
      if(i >= 0) cust.contracts[i] = rec; else cust.contracts.push(rec);
    }
    clLinkRecordToProject(cust, rec, { value: rec.value, contractNo: rec.id, advanceTo: 'التعاقد' });
    clUpsertCustomer(cust);
    closeModal(); showToast(existing ? 'تم التحديث' : 'تم الإضافة');
    contractFilters.detailKey = '';
    rerenderCurrentPage();
  };
}
