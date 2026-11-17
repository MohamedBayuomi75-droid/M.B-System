/* =========================================================
   المستخلصات — شكل النظام الموحد · المرحلة 0.7
   ========================================================= */
let clientInvFilters = { q: '', customerId: '', status: '', detailKey: '' };

function clInvNet(inv){
  if(!inv) return 0;
  const works = Number(inv.value) || 0;
  const prev = Number(inv.previousWorks) || 0;
  const extras = Number(inv.extras) || 0;
  const excluded = Number(inv.excluded) || 0;
  const deductions = Number(inv.deductions) || 0;
  const advance = Number(inv.advanceDeduct) || 0;
  const retPct = Number(inv.retentionPct) || 0;
  const taxPct = Number(inv.taxPct) || 0;
  const gross = works + extras - excluded;
  const retention = gross * (retPct / 100);
  const tax = gross * (taxPct / 100);
  return Math.round((gross - deductions - advance - retention - tax) * 100) / 100;
}
function clAllClientInvoices(){
  const rows = [];
  clCustomers().forEach(function(c){
    (c.invoices || []).forEach(function(inv, idx){
      rows.push(Object.assign({}, inv, {
        customerId: c.id, customerName: c.name, _idx: idx,
        _key: c.id + '::' + (inv.no || idx)
      }));
    });
  });
  return rows;
}
function clNextInvoiceNo(){
  let max = 0;
  clAllClientInvoices().forEach(function(inv){
    const m = String(inv.no || '').match(/(\d+)\s*$/);
    if(m) max = Math.max(max, parseInt(m[1], 10) || 0);
  });
  return 'INV-' + String(max + 1).padStart(4, '0');
}

function renderClientsInvoicesPage(){
  if(clientInvFilters.detailKey) return renderClientInvoiceDetail(clientInvFilters.detailKey);
  const q = (clientInvFilters.q || '').trim();
  let list = clAllClientInvoices();
  if(clientInvFilters.customerId) list = list.filter(function(i){ return i.customerId === clientInvFilters.customerId; });
  if(clientInvFilters.status) list = list.filter(function(i){ return (i.status || '') === clientInvFilters.status; });
  if(q){
    list = list.filter(function(i){
      const hay = [i.no, i.project, i.customerName, i.category, i.notes, i.status, i.contractId].join(' ');
      return typeof smartMatch === 'function' ? smartMatch(hay, q) : hay.toLowerCase().indexOf(q.toLowerCase()) >= 0;
    });
  }
  list = list.slice().sort(function(a, b){ return String(b.date || b.no || '').localeCompare(String(a.date || a.no || '')); });

  const all = clAllClientInvoices();
  const totalNet = all.reduce(function(s, i){ return s + clInvNet(i); }, 0);
  const totalPaid = all.reduce(function(s, i){ return s + (Number(i.paid) || 0); }, 0);
  try{
    if(typeof setPageExport === 'function'){
      setPageExport('clients.invoices',
        ['الرقم','العميل','المشروع','التاريخ','الصافي','المدفوع','الحالة','عقد'],
        list.map(function(i){
          return [i.no || '', i.customerName || '', i.project || '', i.date || '', clInvNet(i), Number(i.paid) || 0, i.status || '', i.contractId || ''];
        })
      );
    }
  }catch(_e){}

  const pg = typeof paginateRows === 'function' ? paginateRows(list, 'clients.invoices') : { pageRows: list };
  const custOpts = clCustomers().map(function(c){
    return '<option value="' + escapeHtml(c.id) + '"' + (clientInvFilters.customerId === c.id ? ' selected' : '') + '>' +
      escapeHtml((c.code ? c.code + ' — ' : '') + c.name) + '</option>';
  }).join('');
  const statuses = ['مسودة','معتمد','مُسلَّم','مدفوع جزئياً','مدفوع','مرفوض'];
  const statusOpts = statuses.map(function(s){
    return '<option value="' + s + '"' + (clientInvFilters.status === s ? ' selected' : '') + '>' + s + '</option>';
  }).join('');

  return `
    <div class="page">
      ${typeof unifiedPageHeader==='function' ? unifiedPageHeader("المستخلصات", "مستخلصات العقود · تتبع الصرف والتحصيل", `
${typeof pageExportButtonsHtml === 'function' ? pageExportButtonsHtml() : ''}
          <button class="btn btn-primary" id="btnAddClInv" ${readOnlyMode ? 'disabled' : ''}>+ مستخلص</button>
          `) : ``}
      <div class="stats-row" style="margin-bottom:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;">
        <div class="stat-card"><div class="num">${all.length}</div><div class="lbl">كل المستخلصات</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(totalNet)}</div><div class="lbl">إجمالي الصافي</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(totalPaid)}</div><div class="lbl">المدفوع</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(Math.max(0, totalNet - totalPaid))}</div><div class="lbl">المتبقي</div></div>
        <div class="stat-card"><div class="num">${list.length}</div><div class="lbl">نتيجة البحث</div></div>
      </div>
      <div class="filters-bar">
        <input type="search" id="ciSearch" class="input" placeholder="بحث: رقم، مشروع، عميل، عقد..." value="${escapeHtml(clientInvFilters.q || '')}" style="min-width:200px;flex:1;">
        <select id="ciCustomer" class="input" style="min-width:180px;"><option value="">كل العملاء</option>${custOpts}</select>
        <select id="ciStatus" class="input" style="min-width:140px;"><option value="">كل الحالات</option>${statusOpts}</select>
        <button type="button" class="btn btn-outline btn-sm" id="ciClear">مسح الفلاتر</button>
      </div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>الرقم</th><th>العميل</th><th>المشروع</th><th>التاريخ</th><th>الصافي</th><th>المدفوع</th><th>الحالة</th><th>ملاحظات</th><th></th></tr></thead>
        <tbody>
          ${pg.pageRows.length ? pg.pageRows.map(function(i){
            const net = clInvNet(i);
            const paid = Number(i.paid) || 0;
            return '<tr>' +
              '<td style="white-space:nowrap;">' + escapeHtml(i.no || '—') + '</td>' +
              '<td>' + escapeHtml(i.customerName || '—') + '</td>' +
              '<td><strong>' + escapeHtml(i.project || '—') + '</strong>' +
                (i.contractId ? '<div style="font-size:11px;color:var(--ink-soft);">عقد: ' + escapeHtml(i.contractId) + '</div>' : '') +
              '</td>' +
              '<td>' + escapeHtml(i.date || '—') + '</td>' +
              '<td style="white-space:nowrap;"><strong>' + fmtMoney(net) + '</strong></td>' +
              '<td style="white-space:nowrap;">' + fmtMoney(paid) + '</td>' +
              '<td>' + escapeHtml(i.status || 'مسودة') + '</td>' +
              '<td class="notes-cell">' + recordNotesCellHtml(clInvoiceNotesIssues(i)) + '</td>' +
              '<td style="white-space:nowrap;">' +
                '<button type="button" class="icon-btn btn-view-ci" data-key="' + escapeHtml(i._key) + '">👁️</button> ' +
                '<button type="button" class="icon-btn btn-edit-ci" data-key="' + escapeHtml(i._key) + '">✏️</button> ' +
                '<button type="button" class="icon-btn icon-del btn-del-ci" data-key="' + escapeHtml(i._key) + '"' + (readOnlyMode ? ' disabled' : '') + '>🗑️</button>' +
              '</td></tr>';
          }).join('') : '<tr><td colspan="9" style="text-align:center;color:var(--ink-soft);padding:28px;">لا مستخلصات</td></tr>'}
        </tbody>
      </table></div>
      ${typeof tablePagerHtml === 'function' ? tablePagerHtml('clients.invoices', pg) : ''}
    </div>`;
}

function renderClientInvoiceDetail(key){
  const inv = clAllClientInvoices().find(function(x){ return x._key === key; });
  if(!inv){ clientInvFilters.detailKey = ''; return renderClientsInvoicesPage(); }
  const net = clInvNet(inv);
  const paid = Number(inv.paid) || 0;
  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div>
          <button type="button" class="btn btn-outline btn-sm" id="ciBack">← رجوع</button>
          <h2 class="page-title" style="margin:8px 0 0;">مستخلص ${escapeHtml(inv.no || '')}</h2>
          <p class="page-sub" style="margin:4px 0 0;">${escapeHtml(inv.customerName || '')} · ${escapeHtml(inv.project || '')}</p>
        </div>
        <div class="btn-row"><button class="btn btn-outline" id="ciPrint">🖨️ طباعة / PDF</button> <button class="btn btn-outline" id="ciEditFromDetail">تعديل</button></div>
      </div>
      <div class="stats-row" style="margin-bottom:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;">
        <div class="stat-card"><div class="num">${fmtMoney(inv.value || 0)}</div><div class="lbl">قيمة الأعمال</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(net)}</div><div class="lbl">الصافي</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(paid)}</div><div class="lbl">المدفوع</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(Math.max(0, net - paid))}</div><div class="lbl">المتبقي</div></div>
      </div>
      <div class="card" style="padding:14px;">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;font-size:13px;">
          <div><span style="color:var(--ink-soft);">التاريخ:</span> ${escapeHtml(inv.date || '—')}</div>
          <div><span style="color:var(--ink-soft);">الحالة:</span> ${escapeHtml(inv.status || 'مسودة')}</div>
          <div><span style="color:var(--ink-soft);">العقد:</span> ${escapeHtml(inv.contractId || '—')}</div>
          <div><span style="color:var(--ink-soft);">التصنيف:</span> ${escapeHtml(inv.category || '—')}</div>
          <div><span style="color:var(--ink-soft);">احتجاز:</span> ${Number(inv.retentionPct) || 0}%</div>
          <div><span style="color:var(--ink-soft);">ضريبة:</span> ${Number(inv.taxPct) || 0}%</div>
          <div><span style="color:var(--ink-soft);">استقطاعات:</span> ${fmtMoney(inv.deductions || 0)}</div>
          <div><span style="color:var(--ink-soft);">خصم دفعة مقدمة:</span> ${fmtMoney(inv.advanceDeduct || 0)}</div>
        </div>
        ${inv.notes ? '<p style="margin-top:10px;color:var(--ink-soft);">' + escapeHtml(inv.notes) + '</p>' : ''}
      </div>
    </div>`;
}

function initClientsInvoicesEvents(){
  if(clientInvFilters.detailKey){
    document.getElementById('ciBack')?.addEventListener('click', function(){ clientInvFilters.detailKey = ''; rerenderCurrentPage(); });
    document.getElementById('ciPrint')?.addEventListener('click', function(){ clPrintInvoice(clientInvFilters.detailKey); });
    document.getElementById('ciEditFromDetail')?.addEventListener('click', function(){ openClientInvoiceModal(clientInvFilters.detailKey); });
    return;
  }
  document.getElementById('ciSearch')?.addEventListener('input', function(e){
    clientInvFilters.q = e.target.value;
    clearTimeout(window.__ciQT);
    window.__ciQT = setTimeout(function(){ if(typeof resetTablePage === 'function') resetTablePage('clients.invoices'); rerenderCurrentPage(); }, 220);
  });
  document.getElementById('ciCustomer')?.addEventListener('change', function(e){
    clientInvFilters.customerId = e.target.value;
    if(typeof resetTablePage === 'function') resetTablePage('clients.invoices');
    rerenderCurrentPage();
  });
  document.getElementById('ciStatus')?.addEventListener('change', function(e){
    clientInvFilters.status = e.target.value;
    if(typeof resetTablePage === 'function') resetTablePage('clients.invoices');
    rerenderCurrentPage();
  });
  document.getElementById('ciClear')?.addEventListener('click', function(){
    clientInvFilters.q = ''; clientInvFilters.customerId = ''; clientInvFilters.status = '';
    if(typeof resetTablePage === 'function') resetTablePage('clients.invoices');
    rerenderCurrentPage();
  });
  document.getElementById('btnAddClInv')?.addEventListener('click', function(){
    if(!clCustomers().length){ showToast('أضف عميلاً أولاً'); return; }
    openClientInvoiceModal();
  });
  document.querySelectorAll('.btn-view-ci').forEach(function(b){
    b.addEventListener('click', function(){ clientInvFilters.detailKey = b.getAttribute('data-key'); rerenderCurrentPage(); });
  });
  document.querySelectorAll('.btn-edit-ci').forEach(function(b){
    b.addEventListener('click', function(){ openClientInvoiceModal(b.getAttribute('data-key')); });
  });
  document.querySelectorAll('.btn-del-ci').forEach(function(b){
    b.addEventListener('click', function(){
      const key = b.getAttribute('data-key');
      const row = clAllClientInvoices().find(function(x){ return x._key === key; });
      if(!row) return;
      (typeof confirmDelete === 'function' ? confirmDelete('حذف المستخلص «' + (row.no || '') + '»؟') : Promise.resolve(confirm('حذف؟'))).then(function(ok){
        if(!ok) return;
        const cust = clCustomerById(row.customerId);
        if(!cust) return;
        cust.invoices = (cust.invoices || []).filter(function(x){ return x.no !== row.no; });
        clUpsertCustomer(cust);
        showToast('تم الحذف');
        rerenderCurrentPage();
      });
    });
  });
}

function openClientInvoiceModal(editKey){
  const existing = editKey ? clAllClientInvoices().find(function(i){ return i._key === editKey; }) : null;
  const customers = clCustomers();
  if(!customers.length){ showToast('أضف عميلاً أولاً'); return; }
  const today = (typeof todayISO === 'function') ? todayISO() : new Date().toISOString().slice(0, 10);
  const initialCid = existing ? existing.customerId : customers[0].id;
  const statuses = ['مسودة','معتمد','مُسلَّم','مدفوع جزئياً','مدفوع','مرفوض'];
  const cats = (clSettings().invoiceCategories || ['مستخلص جاري','مستخلص ختامي','مستخلص جزئي','دفعة مقدمة']);

  function contractOpts(cid){
    const c = clCustomerById(cid);
    return ((c && c.contracts) || []).map(function(k){
      const sel = existing && existing.contractId === k.id ? ' selected' : '';
      return '<option value="' + escapeHtml(k.id) + '"' + sel + '>' + escapeHtml(k.id + (k.title ? ' — ' + k.title : '') + ' (' + fmtMoney(k.value || 0) + ')') + '</option>';
    }).join('');
  }

  openModal(`
    <div class="modal-header"><h3>${existing ? 'تعديل مستخلص' : 'مستخلص جديد'}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body" style="max-height:70vh;overflow:auto;">
      <div class="form-grid form-grid-2">
        <label>العميل *<select class="input" id="ciCust">${customers.map(function(c){
          return '<option value="' + escapeHtml(c.id) + '"' + (initialCid === c.id ? ' selected' : '') + '>' + escapeHtml((c.code ? c.code + ' — ' : '') + c.name) + '</option>';
        }).join('')}</select></label>
        <label>رقم المستخلص<input class="input" id="ciNo" value="${escapeHtml(existing && existing.no || clNextInvoiceNo())}"></label>
        <label>المشروع<input class="input" id="ciProject" list="clProjList" value="${escapeHtml(existing && existing.project || '')}">${clProjectDatalistHtml('clProjList')}</label>
        <label>التاريخ<input class="input" id="ciDate" type="date" value="${escapeHtml(existing && existing.date || today)}"></label>
        <label>العقد<select class="input" id="ciContract"><option value="">—</option>${contractOpts(initialCid)}</select></label>
        <label>التصنيف<select class="input" id="ciCat">${cats.map(function(c){
          const cur = existing ? (existing.category || cats[0]) : cats[0];
          return '<option value="' + escapeHtml(c) + '"' + (cur === c ? ' selected' : '') + '>' + escapeHtml(c) + '</option>';
        }).join('')}</select></label>
        <label>قيمة الأعمال (ج.م)<input class="input" id="ciValue" type="number" step="0.01" value="${existing ? toInt(existing.value) : ''}"></label>
        <label>أعمال سابقة<input class="input" id="ciPrev" type="number" step="0.01" value="${existing ? toInt(existing.previousWorks) : 0}"></label>
        <label>إضافات<input class="input" id="ciExtra" type="number" step="0.01" value="${existing ? toInt(existing.extras) : 0}"></label>
        <label>مستبعد<input class="input" id="ciExcl" type="number" step="0.01" value="${existing ? toInt(existing.excluded) : 0}"></label>
        <label>استقطاعات<input class="input" id="ciDed" type="number" step="0.01" value="${existing ? toInt(existing.deductions) : 0}"></label>
        <label>خصم دفعة مقدمة<input class="input" id="ciAdv" type="number" step="0.01" value="${existing ? toInt(existing.advanceDeduct) : 0}"></label>
        <label>احتجاز %<input class="input" id="ciRet" type="number" step="0.1" value="${escapeHtml(existing && existing.retentionPct != null ? existing.retentionPct : 5)}"></label>
        <label>ضريبة %<input class="input" id="ciTax" type="number" step="0.1" value="${existing ? toInt(existing.taxPct) : 0}"></label>
        <label>سداد مباشر (بدون تحصيل مسجّل)<input class="input" id="ciPaid" type="number" step="0.01" value="${existing ? (existing.paidManual != null && existing.paidManual !== '' ? existing.paidManual : Math.max(0, (Number(existing.paid) || 0) - clInvLinkedCollected(clCustomerById(existing.customerId) || {}, existing))) : 0}"><small style="color:var(--ink-soft);">${existing ? 'تحصيلات مربوطة: ' + fmtMoney(clInvLinkedCollected(clCustomerById(existing.customerId) || {}, existing)) + ' (تتحسب تلقائيًا)' : 'التحصيلات من صفحة الإيرادات بتتضاف تلقائيًا'}</small></label>
        <label>الحالة<select class="input" id="ciSt">${statuses.map(function(s){
          const cur = existing ? (existing.status || 'مسودة') : 'مسودة';
          return '<option value="' + s + '"' + (cur === s ? ' selected' : '') + '>' + s + '</option>';
        }).join('')}</select></label>
        <label style="grid-column:1/-1;">ملاحظات<textarea class="input" id="ciNotes" rows="2">${escapeHtml(existing && existing.notes || '')}</textarea></label>
      </div>
      <div id="ciNetPreview" style="margin-top:10px;font-weight:800;">الصافي: —</div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="btnSaveClInv">حفظ</button>
    </div>
  `);

  function updateNet(){
    const inv = {
      value: toInt(document.getElementById('ciValue').value),
      previousWorks: toInt(document.getElementById('ciPrev').value),
      extras: toInt(document.getElementById('ciExtra').value),
      excluded: toInt(document.getElementById('ciExcl').value),
      deductions: toInt(document.getElementById('ciDed').value),
      advanceDeduct: toInt(document.getElementById('ciAdv').value),
      retentionPct: toInt(document.getElementById('ciRet').value),
      taxPct: toInt(document.getElementById('ciTax').value)
    };
    document.getElementById('ciNetPreview').textContent = 'الصافي: ' + fmtMoney(clInvNet(inv));
  }
  ['ciValue','ciPrev','ciExtra','ciExcl','ciDed','ciAdv','ciRet','ciTax'].forEach(function(id){
    document.getElementById(id)?.addEventListener('input', updateNet);
  });
  updateNet();

  document.getElementById('ciCust').addEventListener('change', function(){
    document.getElementById('ciContract').innerHTML = '<option value="">—</option>' + contractOpts(document.getElementById('ciCust').value);
  });
  document.getElementById('ciContract').addEventListener('change', function(){
    const cid = document.getElementById('ciCust').value;
    const c = clCustomerById(cid);
    const kid = document.getElementById('ciContract').value;
    if(!c || !kid) return;
    const k = (c.contracts || []).find(function(x){ return x.id === kid; });
    if(!k) return;
    if(!document.getElementById('ciProject').value && k.project) document.getElementById('ciProject').value = k.project;
  });

  clMountCustomFields('clInvoices', existing);
  const attEd = clAttachMount('مستخلص', 'مستخلص', existing ? existing.docs : []);
  document.getElementById('btnSaveClInv').onclick = function(){
    const cid = document.getElementById('ciCust').value;
    const cust = clCustomerById(cid);
    if(!cust){ showToast('اختر عميلاً'); return; }
    const no = (document.getElementById('ciNo').value || '').trim() || clNextInvoiceNo();
    const rec = {
      no: no,
      project: (document.getElementById('ciProject').value || '').trim(),
      date: document.getElementById('ciDate').value || '',
      value: toInt(document.getElementById('ciValue').value),
      previousWorks: toInt(document.getElementById('ciPrev').value),
      extras: toInt(document.getElementById('ciExtra').value),
      excluded: toInt(document.getElementById('ciExcl').value),
      deductions: toInt(document.getElementById('ciDed').value),
      advanceDeduct: toInt(document.getElementById('ciAdv').value),
      retentionPct: toInt(document.getElementById('ciRet').value),
      taxPct: toInt(document.getElementById('ciTax').value),
      paidManual: Math.max(0, Number(document.getElementById('ciPaid').value) || 0),
      paid: existing ? existing.paid : 0,
      status: document.getElementById('ciSt').value || 'مسودة',
      category: document.getElementById('ciCat').value || '',
      contractId: document.getElementById('ciContract').value || '',
      workSurveyId: existing ? (existing.workSurveyId || '') : '',
      notes: (document.getElementById('ciNotes').value || '').trim(),
      assignedTo: existing ? (existing.assignedTo || '') : '',
      projectId: existing ? (existing.projectId || '') : '',
      docs: attEd.get(),
      extraFields: clCollectCustomFields('clInvoices', existing)
    };
    const conf = rec.project && clProjectNameConflict(cid, rec.project);
    if(conf){ showToast('المشروع «' + rec.project + '» تابع للعميل «' + conf.owner + '» — اختر مشروعًا آخر'); return; }
    // تغيير رقم المستخلص: التحصيلات المربوطة بيه تتبعه (وإلا هتتفك وتتعد غلط)
    if(existing && existing.customerId === cid && existing.no !== rec.no){
      if((cust.invoices || []).some(function(x){ return x.no === rec.no; })){ showToast('رقم المستخلص «' + rec.no + '» مستخدم'); return; }
      (cust.collections || []).forEach(function(r){ if(r.invoiceNo === existing.no) r.invoiceNo = rec.no; });
    }
    cust.invoices = cust.invoices || [];
    if(existing && existing.customerId === cid){
      const i = cust.invoices.findIndex(function(x){ return x.no === existing.no; });
      if(i >= 0) cust.invoices[i] = rec; else cust.invoices.push(rec);
    } else {
      if(existing && existing.customerId !== cid){
        const oldC = clCustomerById(existing.customerId);
        if(oldC){ oldC.invoices = (oldC.invoices || []).filter(function(x){ return x.no !== existing.no; }); clUpsertCustomer(oldC); }
      }
      const i = cust.invoices.findIndex(function(x){ return x.no === rec.no; });
      if(i >= 0) cust.invoices[i] = rec; else cust.invoices.push(rec);
    }
    clLinkRecordToProject(cust, rec, { advanceTo: 'المستخلصات' });
    clReconcilePaid(cust);
    clUpsertCustomer(cust);
    closeModal(); showToast(existing ? 'تم التحديث' : 'تم الإضافة');
    clientInvFilters.detailKey = '';
    rerenderCurrentPage();
  };
}
