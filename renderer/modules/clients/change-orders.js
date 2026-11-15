/* =========================================================
   clients/change-orders.js — أوامر التغيير على العقود (المرحلة 7)
   السجل داخل العقد: contract.changeOrders[] { id,title,date,amount,reason,status,itemsNote,docs[],createdBy,createdAt }
   قيمة العقد قابلة للعكس: value = originalValue + مجموع المعتمد (الأصلي كان بيجمع للقيمة مباشرة ومفيش رجوع).
   ========================================================= */
const CL_VO_STATUS = ['مسودة', 'معتمد', 'مرفوض'];

function clVoApprovedSum(k){
  return (k.changeOrders || []).reduce(function(s, v){ return s + (v.status === 'معتمد' ? (Number(v.amount) || 0) : 0); }, 0);
}
/** يحدّث value من originalValue + المعتمد. أول مرة: originalValue = القيمة الحالية قبل أي معتمد. */
function clRecalcContractValue(k, valueBefore){
  const approved = clVoApprovedSum(k);
  if(k.originalValue == null || k.originalValue === ''){
    k.originalValue = (Number(valueBefore != null ? valueBefore : k.value) || 0);
  }
  k.value = Math.round(((Number(k.originalValue) || 0) + approved) * 100) / 100;
  return k;
}
function clAllChangeOrders(){
  const rows = [];
  clCustomers().forEach(function(c){
    (c.contracts || []).forEach(function(k){
      (k.changeOrders || []).forEach(function(v){
        rows.push(Object.assign({}, v, { customerId: c.id, customerName: c.name, contractId: k.id, contractTitle: k.title || '', _key: c.id + '::' + k.id + '::' + v.id }));
      });
    });
  });
  return rows;
}
function clNextVoId(){
  let max = 0;
  clAllChangeOrders().forEach(function(v){ const m = String(v.id || '').match(/(\d+)\s*$/); if(m) max = Math.max(max, parseInt(m[1], 10) || 0); });
  return 'VO-' + String(max + 1).padStart(4, '0');
}
function clVoBadge(s){
  const col = s === 'معتمد' ? '#16a34a' : s === 'مرفوض' ? '#dc2626' : '#d97706';
  return '<span style="color:' + col + ';font-weight:700;">' + escapeHtml(s || '') + '</span>';
}

function clChangeOrdersSectionHtml(customerId, contractId){
  const c = clCustomerById(customerId); if(!c) return '';
  const ks = (c.contracts || []).filter(function(k){ return !contractId || k.id === contractId; });
  const list = clAllChangeOrders().filter(function(v){ return v.customerId === customerId && (!contractId || v.contractId === contractId); });
  const ro = (typeof readOnlyMode !== 'undefined' && readOnlyMode) ? ' disabled' : '';
  const approved = list.filter(function(v){ return v.status === 'معتمد'; }).reduce(function(s, v){ return s + (Number(v.amount) || 0); }, 0);
  let head = '';
  if(contractId && ks[0]){
    const k = ks[0];
    head = '<div class="stats-row" style="margin:10px 0;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;">' +
      '<div class="stat-card"><div class="num">' + fmtMoney(k.originalValue != null && k.originalValue !== '' ? k.originalValue : (Number(k.value) || 0)) + '</div><div class="lbl">قيمة العقد الأصلية</div></div>' +
      '<div class="stat-card"><div class="num">' + fmtMoney(approved) + '</div><div class="lbl">أوامر معتمدة</div></div>' +
      '<div class="stat-card"><div class="num">' + fmtMoney(Number(k.value) || 0) + '</div><div class="lbl">القيمة الحالية</div></div></div>';
  }
  return '<div class="card vo-section" data-cid="' + escapeHtml(customerId) + '" data-ctr="' + escapeHtml(contractId || '') + '" style="padding:14px;margin-top:14px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;"><h3 style="margin:0;">📝 أوامر التغيير</h3>' +
    '<button type="button" class="btn btn-primary btn-sm vo-add"' + ro + '>+ أمر تغيير</button></div>' + head +
    (list.length ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>الكود</th>' + (contractId ? '' : '<th>العقد</th>') + '<th>العنوان</th><th>التاريخ</th><th>القيمة</th><th>الحالة</th><th></th></tr></thead><tbody>' +
      list.map(function(v){
        const k = escapeHtml(v._key);
        return '<tr><td>' + escapeHtml(v.id) + '</td>' + (contractId ? '' : '<td>' + escapeHtml(v.contractId) + '</td>') +
          '<td>' + escapeHtml(v.title || '') + (v.reason ? '<div style="font-size:11px;color:var(--ink-soft);">' + escapeHtml(v.reason) + '</div>' : '') + '</td>' +
          '<td>' + escapeHtml(v.date || '') + '</td><td style="color:' + ((Number(v.amount) || 0) < 0 ? '#dc2626' : 'inherit') + ';">' + fmtMoney(Number(v.amount) || 0) + '</td><td>' + clVoBadge(v.status) + '</td>' +
          '<td style="white-space:nowrap;"><button type="button" class="icon-btn vo-edit" data-key="' + k + '"' + ro + '>✏️</button> <button type="button" class="icon-btn icon-del vo-del" data-key="' + k + '"' + ro + '>🗑️</button></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div style="text-align:center;color:var(--ink-soft);padding:18px;">لا أوامر تغيير</div>') + '</div>';
}
function initChangeOrderSections(){
  document.querySelectorAll('.vo-section').forEach(function(root){
    root.querySelectorAll('.vo-add').forEach(function(b){ b.addEventListener('click', function(){ openChangeOrderModal('', { customerId: root.getAttribute('data-cid'), contractId: root.getAttribute('data-ctr') }); }); });
    root.querySelectorAll('.vo-edit').forEach(function(b){ b.addEventListener('click', function(){ openChangeOrderModal(b.getAttribute('data-key')); }); });
    root.querySelectorAll('.vo-del').forEach(function(b){
      b.addEventListener('click', function(){
        const v = clAllChangeOrders().find(function(x){ return x._key === b.getAttribute('data-key'); }); if(!v) return;
        confirmDelete('حذف أمر التغيير «' + v.id + '»؟' + (v.status === 'معتمد' ? ' (هتتخصم قيمته من العقد)' : '')).then(function(ok){
          if(!ok) return;
          const c = clCustomerById(v.customerId); const k = c && (c.contracts || []).find(function(x){ return x.id === v.contractId }); if(!k) return;
          k.changeOrders = (k.changeOrders || []).filter(function(x){ return x.id !== v.id; });
          if(k.originalValue != null && k.originalValue !== '') clRecalcContractValue(k);
          try{ addAudit('حذف أمر تغيير', v.id + ' — ' + v.contractId); }catch(_e){}
          clUpsertCustomer(c); showToast('تم الحذف'); rerenderCurrentPage();
        });
      });
    });
  });
}

function openChangeOrderModal(editKey, preset){
  const existing = editKey ? clAllChangeOrders().find(function(v){ return v._key === editKey; }) : null;
  const cid = existing ? existing.customerId : (preset && preset.customerId);
  const cust = clCustomerById(cid); if(!cust){ showToast('اختر عميلاً'); return; }
  const contracts = cust.contracts || [];
  if(!contracts.length){ showToast('لا عقود لهذا العميل'); return; }
  const ctr0 = existing ? existing.contractId : ((preset && preset.contractId) || contracts[0].id);
  let docs = existing ? (existing.docs || []).slice() : [];
  openModal(`
    <div class="modal-header"><h3>${existing ? 'تعديل أمر تغيير' : 'أمر تغيير (Variation Order)'}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body" style="max-height:70vh;overflow:auto;"><div class="form-grid form-grid-2">
      <label>العقد *<select class="input" id="voContract">${contracts.map(function(k){ return '<option value="' + escapeHtml(k.id) + '"' + (k.id === ctr0 ? ' selected' : '') + '>' + escapeHtml(k.id + ' · ' + (k.title || '') + ' · ' + fmtMoney(Number(k.value) || 0)) + '</option>'; }).join('')}</select></label>
      <label>الكود<input class="input" id="voId" value="${escapeHtml(existing ? existing.id : clNextVoId())}"></label>
      <label>العنوان *<input class="input" id="voTitle" value="${escapeHtml(existing && existing.title || '')}"></label>
      <label>التاريخ<input class="input" id="voDate" type="date" value="${escapeHtml(existing && existing.date || clTodayISO())}"></label>
      <label>قيمة التغيير (+ زيادة / − خصم) *<input class="input" id="voAmount" type="number" step="0.01" value="${existing ? Number(existing.amount) || 0 : ''}"></label>
      <label>الحالة<select class="input" id="voStatus">${CL_VO_STATUS.map(function(s){ return '<option' + ((existing ? existing.status : 'مسودة') === s ? ' selected' : '') + '>' + s + '</option>'; }).join('')}</select></label>
      <label style="grid-column:1/-1;">السبب<input class="input" id="voReason" value="${escapeHtml(existing && existing.reason || '')}"></label>
      <label style="grid-column:1/-1;">تفاصيل البنود / ملاحظات<textarea class="input" id="voNote" rows="3">${escapeHtml(existing && existing.itemsNote || '')}</textarea></label>
      <div style="grid-column:1/-1;"><div class="section-title" style="margin-top:8px;">المرفقات والمستندات</div><div id="voDocs"></div><div class="att-toolbar" style="display:flex;gap:8px;margin-top:6px;"><button type="button" class="btn btn-primary btn-sm" id="voAttach">📎 إرفاق مستند</button></div></div>
    </div></div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" id="btnSaveVo">حفظ</button></div>`);
  const paint = function(){ const b = document.getElementById('voDocs'); if(!b) return; b.innerHTML = clAttachmentListHtml(docs, {}); clBindAttachmentList(b, function(){ return docs; }, function(d){ docs = docs.filter(function(x){ return x.id !== d.id; }); paint(); }); };
  paint();
  document.getElementById('voAttach').addEventListener('click', async function(){ const f = await clPickFiles(document.getElementById('voId').value || 'VO', 'أمر تغيير'); if(f.length){ docs = docs.concat(f); paint(); } });
  document.getElementById('btnSaveVo').onclick = function(){
    const title = (document.getElementById('voTitle').value || '').trim();
    if(!title){ showToast('عنوان أمر التغيير مطلوب'); return; }
    const amount = Number(document.getElementById('voAmount').value);
    if(!amount){ showToast('قيمة التغيير مطلوبة'); return; }
    const id = (document.getElementById('voId').value || '').trim() || clNextVoId();
    if(clAllChangeOrders().some(function(v){ return v.id === id && !(existing && v._key === existing._key); })){ showToast('الكود «' + id + '» مستخدم'); return; }
    const kid = document.getElementById('voContract').value;
    const k = contracts.find(function(x){ return x.id === kid; });
    const status = document.getElementById('voStatus').value;
    const rec = Object.assign({}, existing ? { createdBy: existing.createdBy, createdAt: existing.createdAt } : { createdBy: (typeof currentUser !== 'undefined' && currentUser && (currentUser.name || currentUser.username)) || '', createdAt: clTodayISO() }, {
      id: id, title: title, date: document.getElementById('voDate').value || '', amount: amount, status: status,
      reason: (document.getElementById('voReason').value || '').trim(), itemsNote: (document.getElementById('voNote').value || '').trim(), docs: docs
    });
    const valueBefore = Number(k.value) || 0;
    if(existing && existing.contractId !== kid){
      const old = contracts.find(function(x){ return x.id === existing.contractId; });
      if(old){ old.changeOrders = (old.changeOrders || []).filter(function(x){ return x.id !== existing.id; }); if(old.originalValue != null && old.originalValue !== '') clRecalcContractValue(old); }
    }
    k.changeOrders = k.changeOrders || [];
    const i = k.changeOrders.findIndex(function(x){ return x.id === (existing ? existing.id : id); });
    if(i >= 0) k.changeOrders[i] = rec; else k.changeOrders.push(rec);
    clRecalcContractValue(k, valueBefore);
    try{ addAudit(existing ? 'تعديل أمر تغيير' : 'أمر تغيير', id + ' على ' + kid + ' — ' + status); }catch(_e){}
    clUpsertCustomer(cust); closeModal(); showToast('تم حفظ أمر التغيير ' + id); rerenderCurrentPage();
  };
}
