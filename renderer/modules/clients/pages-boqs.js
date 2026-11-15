/* =========================================================
   المقايسات (BOQ) — شكل النظام الموحد · المرحلة 0.7
   ========================================================= */

let boqFilters = { q: '', customerId: '', detailKey: '' };

function clEmptyBoqItem(){
  return { code: '', name: '', unit: 'م3', qty: 0, price: 0, total: 0 };
}
function clCalcBoqItem(it){
  const x = Object.assign({}, it);
  x.qty = Number(x.qty != null ? x.qty : x.contractQty) || 0;
  x.price = Number(x.price != null ? x.price : x.unitPrice) || 0;
  x.total = Math.round(x.qty * x.price * 100) / 100;
  return x;
}
function clBoqTotal(b){
  if(!b) return 0;
  const items = b.items || [];
  if(!items.length) return Number(b.total) || 0;
  return items.reduce(function(s, it){ return s + (clCalcBoqItem(it).total || 0); }, 0);
}
function clAllBoqs(){
  const rows = [];
  clCustomers().forEach(function(c){
    (c.boqs || []).forEach(function(b, idx){
      rows.push(Object.assign({}, b, {
        customerId: c.id, customerName: c.name, _idx: idx,
        _key: c.id + '::' + (b.id || idx)
      }));
    });
  });
  return rows;
}
function clNextBoqId(){
  const p = (clSettings().boqPrefix || 'BOQ-');
  let max = 0;
  clAllBoqs().forEach(function(b){
    const m = String(b.id || '').match(/(\d+)\s*$/);
    if(m) max = Math.max(max, parseInt(m[1], 10) || 0);
  });
  return p + String(max + 1).padStart(4, '0');
}

function renderClientsBoqsPage(){
  if(boqFilters.detailKey) return renderBoqDetail(boqFilters.detailKey);
  const q = (boqFilters.q || '').trim();
  let list = clAllBoqs();
  if(boqFilters.customerId) list = list.filter(function(b){ return b.customerId === boqFilters.customerId; });
  if(q){
    list = list.filter(function(b){
      const hay = [b.id, b.title, b.project, b.customerName, b.notes].join(' ');
      return typeof smartMatch === 'function' ? smartMatch(hay, q) : hay.toLowerCase().indexOf(q.toLowerCase()) >= 0;
    });
  }
  list = list.slice().sort(function(a, b){ return String(b.id || '').localeCompare(String(a.id || '')); });

  const all = clAllBoqs();
  const totalVal = all.reduce(function(s, b){ return s + clBoqTotal(b); }, 0);
  try{
    if(typeof setPageExport === 'function'){
      setPageExport('clients.boqs',
        ['الكود','العنوان','العميل','المشروع','بنود','الإجمالي','ملاحظات'],
        list.map(function(b){
          return [b.id || '', b.title || '', b.customerName || '', b.project || '', (b.items || []).length, clBoqTotal(b), b.notes || ''];
        })
      );
    }
  }catch(_e){}

  const pg = typeof paginateRows === 'function' ? paginateRows(list, 'clients.boqs') : { pageRows: list };
  const custOpts = clCustomers().map(function(c){
    return '<option value="' + escapeHtml(c.id) + '"' + (boqFilters.customerId === c.id ? ' selected' : '') + '>' +
      escapeHtml((c.code ? c.code + ' — ' : '') + c.name) + '</option>';
  }).join('');

  return `
    <div class="page">
      ${typeof unifiedPageHeader==='function' ? unifiedPageHeader("المقايسات", "مقايسات الأعمال · مرتبطة بالحصر والعقود", `
${typeof pageExportButtonsHtml === 'function' ? pageExportButtonsHtml() : ''}
          <button class="btn btn-primary" id="btnAddBoq" ${readOnlyMode ? 'disabled' : ''}>+ مقايسة</button>
          `) : ``}
      <div class="stats-row" style="margin-bottom:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;">
        <div class="stat-card"><div class="num">${all.length}</div><div class="lbl">كل المقايسات</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(totalVal)}</div><div class="lbl">إجمالي القيم</div></div>
        <div class="stat-card"><div class="num">${list.length}</div><div class="lbl">نتيجة البحث</div></div>
      </div>
      <div class="filters-bar">
        <input type="search" id="boqSearch" class="input" placeholder="بحث: كود، عنوان، مشروع، عميل..." value="${escapeHtml(boqFilters.q || '')}" style="min-width:200px;flex:1;">
        <select id="boqCustomer" class="input" style="min-width:180px;">
          <option value="">كل العملاء</option>${custOpts}
        </select>
        <button type="button" class="btn btn-outline btn-sm" id="boqClear">مسح الفلاتر</button>
      </div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>الكود</th><th>العنوان</th><th>العميل</th><th>المشروع</th><th>بنود</th><th>الإجمالي</th><th></th></tr></thead>
        <tbody>
          ${pg.pageRows.length ? pg.pageRows.map(function(b){
            return '<tr>' +
              '<td style="white-space:nowrap;">' + escapeHtml(b.id || '—') + '</td>' +
              '<td><strong>' + escapeHtml(b.title || '—') + '</strong></td>' +
              '<td>' + escapeHtml(b.customerName || '—') + '</td>' +
              '<td>' + escapeHtml(b.project || '—') + '</td>' +
              '<td>' + (b.items || []).length + '</td>' +
              '<td style="white-space:nowrap;"><strong>' + fmtMoney(clBoqTotal(b)) + '</strong></td>' +
              '<td style="white-space:nowrap;">' +
                '<button type="button" class="icon-btn btn-view-boq" data-key="' + escapeHtml(b._key) + '" title="تفاصيل">👁️</button> ' +
                '<button type="button" class="icon-btn btn-edit-boq" data-key="' + escapeHtml(b._key) + '" title="تعديل">✏️</button> ' +
                '<button type="button" class="icon-btn icon-del btn-del-boq" data-key="' + escapeHtml(b._key) + '"' + (readOnlyMode ? ' disabled' : '') + ' title="حذف">🗑️</button>' +
              '</td></tr>';
          }).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--ink-soft);padding:28px;">لا مقايسات — أضف عميلاً ثم مقايسة</td></tr>'}
        </tbody>
      </table></div>
      ${typeof tablePagerHtml === 'function' ? tablePagerHtml('clients.boqs', pg) : ''}
    </div>`;
}

function renderBoqDetail(key){
  const row = clAllBoqs().find(function(b){ return b._key === key; });
  if(!row){ boqFilters.detailKey = ''; return renderClientsBoqsPage(); }
  const items = (row.items || []).map(clCalcBoqItem);
  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div>
          <button type="button" class="btn btn-outline btn-sm" id="boqBack">← رجوع</button>
          <h2 class="page-title" style="margin:8px 0 0;">${escapeHtml(row.title || row.id || 'مقايسة')}</h2>
          <p class="page-sub" style="margin:4px 0 0;">${escapeHtml(row.customerName || '')} · ${escapeHtml(row.project || '')} · ${escapeHtml(row.id || '')}</p>
        </div>
        <div class="btn-row"><button class="btn btn-outline" id="boqPrint">🖨️ طباعة / PDF</button> <button class="btn btn-outline" id="boqEditFromDetail">تعديل</button></div>
      </div>
      <div class="stats-row" style="margin-bottom:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;">
        <div class="stat-card"><div class="num">${items.length}</div><div class="lbl">بنود</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(clBoqTotal(row))}</div><div class="lbl">الإجمالي</div></div>
      </div>
      ${row.notes ? '<p style="color:var(--ink-soft);margin-bottom:12px;">' + escapeHtml(row.notes) + '</p>' : ''}
      <div class="card" style="padding:14px;">
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>كود</th><th>البند</th><th>وحدة</th><th>كمية</th><th>سعر</th><th>إجمالي</th></tr></thead>
          <tbody>
            ${items.length ? items.map(function(it){
              return '<tr><td>' + escapeHtml(it.code || '') + '</td><td>' + escapeHtml(it.name || '') + '</td><td>' + escapeHtml(it.unit || '') + '</td><td>' + (it.qty || 0) + '</td><td>' + fmtMoney(it.price || 0) + '</td><td><strong>' + fmtMoney(it.total || 0) + '</strong></td></tr>';
            }).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--ink-soft);">لا بنود</td></tr>'}
          </tbody>
        </table></div>
      </div>
    </div>`;
}

function initClientsBoqsEvents(){
  if(boqFilters.detailKey){
    document.getElementById('boqBack')?.addEventListener('click', function(){ boqFilters.detailKey = ''; rerenderCurrentPage(); });
    document.getElementById('boqPrint')?.addEventListener('click', function(){ clPrintBoq(boqFilters.detailKey); });
    document.getElementById('boqEditFromDetail')?.addEventListener('click', function(){ openBoqModal(boqFilters.detailKey); });
    return;
  }
  document.getElementById('boqSearch')?.addEventListener('input', function(e){
    boqFilters.q = e.target.value;
    clearTimeout(window.__boqQT);
    window.__boqQT = setTimeout(function(){ if(typeof resetTablePage === 'function') resetTablePage('clients.boqs'); rerenderCurrentPage(); }, 220);
  });
  document.getElementById('boqCustomer')?.addEventListener('change', function(e){
    boqFilters.customerId = e.target.value;
    if(typeof resetTablePage === 'function') resetTablePage('clients.boqs');
    rerenderCurrentPage();
  });
  document.getElementById('boqClear')?.addEventListener('click', function(){
    boqFilters.q = ''; boqFilters.customerId = '';
    if(typeof resetTablePage === 'function') resetTablePage('clients.boqs');
    rerenderCurrentPage();
  });
  document.getElementById('btnAddBoq')?.addEventListener('click', function(){
    if(!clCustomers().length){ showToast('أضف عميلاً أولاً'); return; }
    openBoqModal();
  });
  document.querySelectorAll('.btn-view-boq').forEach(function(b){
    b.addEventListener('click', function(){ boqFilters.detailKey = b.getAttribute('data-key'); rerenderCurrentPage(); });
  });
  document.querySelectorAll('.btn-edit-boq').forEach(function(b){
    b.addEventListener('click', function(){ openBoqModal(b.getAttribute('data-key')); });
  });
  document.querySelectorAll('.btn-del-boq').forEach(function(b){
    b.addEventListener('click', function(){
      const key = b.getAttribute('data-key');
      const row = clAllBoqs().find(function(x){ return x._key === key; });
      if(!row) return;
      (typeof confirmDelete === 'function' ? confirmDelete('حذف المقايسة «' + (row.id || '') + '»؟') : Promise.resolve(confirm('حذف؟'))).then(function(ok){
        if(!ok) return;
        const cust = clCustomerById(row.customerId);
        if(!cust) return;
        cust.boqs = (cust.boqs || []).filter(function(x){ return x.id !== row.id; });
        clUpsertCustomer(cust);
        showToast('تم الحذف');
        rerenderCurrentPage();
      });
    });
  });
}

function openBoqModal(editKey){
  const existing = editKey ? clAllBoqs().find(function(b){ return b._key === editKey; }) : null;
  const customers = clCustomers();
  if(!customers.length){ showToast('أضف عميلاً أولاً'); return; }

  let items = (existing && existing.items && existing.items.length)
    ? existing.items.map(function(it){ return clCalcBoqItem(Object.assign({}, clEmptyBoqItem(), it)); })
    : [clEmptyBoqItem(), clEmptyBoqItem()];

  const initialCid = existing ? existing.customerId : customers[0].id;

  // surveys of customer for optional link
  function surveyOpts(cid){
    const c = clCustomerById(cid);
    return ((c && c.workSurveys) || []).map(function(w){
      const sel = existing && (existing.surveyIds || []).indexOf(w.id) >= 0 ? ' selected' : '';
      return '<option value="' + escapeHtml(w.id) + '"' + sel + '>' + escapeHtml(w.id + (w.project ? ' — ' + w.project : '') + (w.workType ? ' — ' + w.workType : '')) + '</option>';
    }).join('');
  }

  function itemsHtml(){
    return items.map(function(it, idx){
      const c = clCalcBoqItem(it); items[idx] = c;
      return '<tr data-ii="' + idx + '">' +
        '<td><input class="input it-code" value="' + escapeHtml(c.code || '') + '" style="min-width:70px;"></td>' +
        '<td><input class="input it-name" value="' + escapeHtml(c.name || '') + '" style="min-width:120px;"></td>' +
        '<td><input class="input it-unit" value="' + escapeHtml(c.unit || '') + '" style="width:70px;"></td>' +
        '<td><input class="input it-qty" type="number" step="0.001" value="' + (c.qty || 0) + '" style="width:90px;"></td>' +
        '<td><input class="input it-price" type="number" step="0.01" value="' + (c.price || 0) + '" style="width:90px;"></td>' +
        '<td class="it-total" style="font-weight:700;white-space:nowrap;">' + fmtMoney(c.total || 0) + '</td>' +
        '<td><button type="button" class="icon-btn it-del" data-i="' + idx + '">🗑️</button></td></tr>';
    }).join('');
  }

  openModal(`
    <div class="modal-header"><h3>${existing ? 'تعديل مقايسة' : 'مقايسة جديدة'}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body" style="max-height:70vh;overflow:auto;">
      <div class="form-grid form-grid-2">
        <label>العميل *<select class="input" id="bqCust">${customers.map(function(c){
          return '<option value="' + escapeHtml(c.id) + '"' + (initialCid === c.id ? ' selected' : '') + '>' + escapeHtml((c.code ? c.code + ' — ' : '') + c.name) + '</option>';
        }).join('')}</select></label>
        <label>كود المقايسة<input class="input" id="bqId" value="${escapeHtml(existing && existing.id || clNextBoqId())}"></label>
        <label>العنوان *<input class="input" id="bqTitle" value="${escapeHtml(existing && existing.title || '')}"></label>
        <label>المشروع<input class="input" id="bqProject" list="clProjList" value="${escapeHtml(existing && existing.project || '')}">${clProjectDatalistHtml('clProjList')}</label>
        <label style="grid-column:1/-1;">أعمال حصر مرتبطة
          <select class="input" id="bqSurveys" multiple size="3">${surveyOpts(initialCid)}</select>
          <span style="font-size:11px;color:var(--ink-soft);">Ctrl لاختيار أكثر من حصر</span>
        </label>
        <label style="grid-column:1/-1;">ملاحظات<textarea class="input" id="bqNotes" rows="2">${escapeHtml(existing && existing.notes || '')}</textarea></label>
      </div>
      <div style="margin-top:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong>بنود المقايسة</strong>
          <button type="button" class="btn btn-outline btn-sm" id="bqAddItem">+ بند</button>
        </div>
        <div class="table-wrap"><table class="data-table"><thead><tr>
          <th>كود</th><th>البند</th><th>وحدة</th><th>كمية</th><th>سعر</th><th>إجمالي</th><th></th>
        </tr></thead><tbody id="bqItemsBody">${itemsHtml()}</tbody></table></div>
        <div id="bqGrand" style="margin-top:8px;font-weight:800;">الإجمالي: ${fmtMoney(clBoqTotal({ items: items }))}</div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="btnSaveBoq">حفظ</button>
    </div>
  `);

  function readItems(){
    const out = [];
    document.querySelectorAll('#bqItemsBody tr[data-ii]').forEach(function(tr){
      out.push(clCalcBoqItem({
        code: tr.querySelector('.it-code')?.value || '',
        name: tr.querySelector('.it-name')?.value || '',
        unit: tr.querySelector('.it-unit')?.value || '',
        qty: toInt(tr.querySelector('.it-qty')?.value),
        price: toInt(tr.querySelector('.it-price')?.value)
      }));
    });
    return out;
  }
  function refresh(){
    items = readItems();
    document.getElementById('bqItemsBody').innerHTML = itemsHtml();
    document.getElementById('bqGrand').textContent = 'الإجمالي: ' + fmtMoney(clBoqTotal({ items: items }));
    bind();
  }
  function bind(){
    document.querySelectorAll('#bqItemsBody .it-qty, #bqItemsBody .it-price').forEach(function(el){
      el.addEventListener('input', function(){
        const tr = el.closest('tr');
        const it = clCalcBoqItem({ qty: toInt(tr.querySelector('.it-qty')?.value), price: toInt(tr.querySelector('.it-price')?.value) });
        const tot = tr.querySelector('.it-total');
        if(tot) tot.textContent = fmtMoney(it.total || 0);
        document.getElementById('bqGrand').textContent = 'الإجمالي: ' + fmtMoney(clBoqTotal({ items: readItems() }));
      });
    });
    document.querySelectorAll('#bqItemsBody .it-del').forEach(function(btn){
      btn.onclick = function(){
        items = readItems();
        const i = parseInt(btn.getAttribute('data-i'), 10);
        if(items.length <= 1) items[0] = clEmptyBoqItem(); else items.splice(i, 1);
        document.getElementById('bqItemsBody').innerHTML = itemsHtml();
        document.getElementById('bqGrand').textContent = 'الإجمالي: ' + fmtMoney(clBoqTotal({ items: items }));
        bind();
      };
    });
  }
  bind();
  document.getElementById('bqAddItem').onclick = function(){ items = readItems(); items.push(clEmptyBoqItem()); refresh(); };
  document.getElementById('bqCust').addEventListener('change', function(){
    document.getElementById('bqSurveys').innerHTML = surveyOpts(document.getElementById('bqCust').value);
  });
  clMountCustomFields('clBoqs', existing);
  clMountCatalog('bqItemsBody');
  const attEd = clAttachMount('مقايسة', 'مقايسة', existing ? existing.docs : []);
  document.getElementById('btnSaveBoq').onclick = function(){
    const cid = document.getElementById('bqCust').value;
    const cust = clCustomerById(cid);
    if(!cust){ showToast('اختر عميلاً'); return; }
    const title = (document.getElementById('bqTitle').value || '').trim();
    if(!title){ showToast('العنوان مطلوب'); return; }
    const finalItems = readItems().filter(function(it){ return (it.name && it.name.trim()) || (it.code && it.code.trim()) || it.qty > 0; }).map(clCalcBoqItem);
    const surveySel = document.getElementById('bqSurveys');
    const surveyIds = surveySel ? Array.from(surveySel.selectedOptions).map(function(o){ return o.value; }) : [];
    const rec = {
      id: (document.getElementById('bqId').value || '').trim() || clNextBoqId(),
      title: title,
      project: (document.getElementById('bqProject').value || '').trim(),
      notes: (document.getElementById('bqNotes').value || '').trim(),
      surveyIds: surveyIds,
      items: finalItems,
      total: clBoqTotal({ items: finalItems }),
      projectId: existing ? (existing.projectId || '') : '',
      extraFields: clCollectCustomFields('clBoqs', existing),
      docs: attEd.get()
    };
    const conf = rec.project && clProjectNameConflict(cid, rec.project);
    if(conf){ showToast('المشروع «' + rec.project + '» تابع للعميل «' + conf.owner + '» — اختر مشروعًا آخر'); return; }
    cust.boqs = cust.boqs || [];
    if(existing && existing.customerId === cid){
      const i = cust.boqs.findIndex(function(x){ return x.id === existing.id; });
      if(i >= 0) cust.boqs[i] = rec; else cust.boqs.push(rec);
    } else {
      if(existing && existing.customerId !== cid){
        const oldC = clCustomerById(existing.customerId);
        if(oldC){ oldC.boqs = (oldC.boqs || []).filter(function(x){ return x.id !== existing.id; }); clUpsertCustomer(oldC); }
      }
      const i = cust.boqs.findIndex(function(x){ return x.id === rec.id; });
      if(i >= 0) cust.boqs[i] = rec; else cust.boqs.push(rec);
    }
    clCatalogLearn(rec.items);
    clLinkRecordToProject(cust, rec, { advanceTo: 'الدراسة والتخطيط' });
    clUpsertCustomer(cust);
    closeModal(); showToast(existing ? 'تم التحديث' : 'تم الإضافة');
    boqFilters.detailKey = '';
    rerenderCurrentPage();
  };
}
