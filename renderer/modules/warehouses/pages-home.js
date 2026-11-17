/* =========================================================
   المخازن — أصناف + أرصدة + حركات
   ========================================================= */
let whFilters = { q: '', locationId: '', tab: 'stock' }; // stock | items | moves | locations

function renderWarehousesHomePage(){
  const tab = whFilters.tab || 'stock';
  if(tab === 'items') return renderWhItemsTab();
  if(tab === 'moves') return renderWhMovesTab();
  if(tab === 'locations') return renderWhLocationsTab();
  return renderWhStockTab();
}

function whTabsHtml(active){
  const tabs = [
    ['stock', 'الأرصدة'],
    ['items', 'الأصناف'],
    ['moves', 'الحركات'],
    ['locations', 'المخازن']
  ];
  return '<div class="btn-row" style="margin-bottom:12px;flex-wrap:wrap;gap:6px;">' +
    tabs.map(function(t){
      return '<button type="button" class="btn ' + (active === t[0] ? 'btn-primary' : 'btn-outline') + ' btn-sm wh-tab" data-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join('') +
    (active === 'moves' || active === 'stock' ? '<button type="button" class="btn btn-primary btn-sm" id="btnWhIn" ' + (readOnlyMode ? 'disabled' : '') + ' style="margin-right:auto;">+ استلام</button><button type="button" class="btn btn-outline btn-sm" id="btnWhOut" ' + (readOnlyMode ? 'disabled' : '') + '>+ صرف</button><button type="button" class="btn btn-outline btn-sm" id="btnWhTransfer" ' + (readOnlyMode ? 'disabled' : '') + '>+ تحويل</button>' : '') +
    (active === 'items' ? '<button type="button" class="btn btn-primary btn-sm" id="btnWhAddItem" ' + (readOnlyMode ? 'disabled' : '') + ' style="margin-right:auto;">+ صنف</button>' : '') +
    (active === 'locations' ? '<button type="button" class="btn btn-primary btn-sm" id="btnWhAddLoc" ' + (readOnlyMode ? 'disabled' : '') + ' style="margin-right:auto;">+ مخزن</button>' : '') +
  '</div>';
}

function renderWhStockTab(){
  const q = (whFilters.q || '').trim();
  const loc = whFilters.locationId || '';
  let items = whItems().slice();
  if(q){
    items = items.filter(function(it){
      const hay = [it.code, it.name, it.unit, it.category].join(' ');
      return typeof smartMatch === 'function' ? smartMatch(hay, q) : hay.toLowerCase().indexOf(q.toLowerCase()) >= 0;
    });
  }
  const rows = items.map(function(it){
    const qty = whStockQty(it.id, loc || null);
    const val = Math.round(qty * (Number(it.avgCost) || Number(it.lastCost) || 0) * 100) / 100;
    return { it: it, qty: qty, val: val };
  }).filter(function(r){ return true; }); // show zero stock too

  const totalVal = rows.reduce(function(s, r){ return s + r.val; }, 0);
  const totalQty = rows.reduce(function(s, r){ return s + r.qty; }, 0);
  const locOpts = whLocations().map(function(L){
    return '<option value="' + escapeHtml(L.id) + '"' + (loc === L.id ? ' selected' : '') + '>' + escapeHtml(L.name) + '</option>';
  }).join('');
  const pg = typeof paginateRows === 'function' ? paginateRows(rows, 'warehouses.stock') : { pageRows: rows };

  return `
    <div class="page">
      ${typeof unifiedPageHeader==='function' ? unifiedPageHeader('المخازن', 'أصناف · أرصدة · استلام من الموردين · صرف على المشاريع') : '<h2 class="page-title">المخازن</h2>'}
      ${whTabsHtml('stock')}
      <div class="stats-row" style="margin-bottom:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;">
        <div class="stat-card"><div class="num">${whItems().length}</div><div class="lbl">أصناف</div></div>
        <div class="stat-card"><div class="num">${whLocations().length}</div><div class="lbl">مخازن</div></div>
        <div class="stat-card"><div class="num">${whMovements().length}</div><div class="lbl">حركات</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(totalVal)}</div><div class="lbl">قيمة المخزون</div></div>
      </div>
      <div class="filters-bar">
        <input type="search" id="whSearch" class="input" placeholder="بحث أصناف..." value="${escapeHtml(whFilters.q || '')}" style="min-width:200px;flex:1;">
        <select id="whLoc" class="input" style="min-width:160px;"><option value="">كل المخازن</option>${locOpts}</select>
      </div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>الكود</th><th>الصنف</th><th>الوحدة</th><th>الرصيد</th><th>تكلفة متوسطة</th><th>القيمة</th><th>ملاحظات</th></tr></thead>
        <tbody>
          ${pg.pageRows.length ? pg.pageRows.map(function(r){
            return '<tr><td>' + escapeHtml(r.it.code || '') + '</td><td><strong>' + escapeHtml(r.it.name || '') + '</strong></td><td>' + escapeHtml(r.it.unit || '') + '</td><td><strong>' + r.qty + '</strong></td><td>' + fmtMoney(r.it.avgCost || r.it.lastCost || 0) + '</td><td>' + fmtMoney(r.val) + '</td><td class="notes-cell">' + recordNotesCellHtml(whItemNotesIssues(r.it)) + '</td></tr>';
          }).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--ink-soft);padding:24px;">لا أصناف — أضف أصنافاً من تبويب الأصناف</td></tr>'}
        </tbody>
      </table></div>
      ${typeof tablePagerHtml === 'function' ? tablePagerHtml('warehouses.stock', pg) : ''}
    </div>`;
}

function renderWhItemsTab(){
  const q = (whFilters.q || '').trim();
  let list = whItems().slice();
  if(q){
    list = list.filter(function(it){
      const hay = [it.code, it.name, it.unit, it.category].join(' ');
      return typeof smartMatch === 'function' ? smartMatch(hay, q) : hay.toLowerCase().indexOf(q.toLowerCase()) >= 0;
    });
  }
  const pg = typeof paginateRows === 'function' ? paginateRows(list, 'warehouses.items') : { pageRows: list };
  return `
    <div class="page">
      ${typeof unifiedPageHeader==='function' ? unifiedPageHeader('الأصناف', 'كتالوج أصناف المخزن') : '<h2 class="page-title">الأصناف</h2>'}
      ${whTabsHtml('items')}
      <div class="filters-bar">
        <input type="search" id="whSearch" class="input" placeholder="بحث..." value="${escapeHtml(whFilters.q || '')}" style="min-width:220px;">
      </div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>الكود</th><th>الاسم</th><th>الوحدة</th><th>التصنيف</th><th>حد الطلب</th><th>تكلفة</th><th></th></tr></thead>
        <tbody>
          ${pg.pageRows.length ? pg.pageRows.map(function(it){
            return '<tr><td>' + escapeHtml(it.code || '') + '</td><td><strong>' + escapeHtml(it.name || '') + '</strong></td><td>' + escapeHtml(it.unit || '') + '</td><td>' + escapeHtml(it.category || '—') + '</td><td>' + (it.minQty != null ? it.minQty : '—') + '</td><td>' + fmtMoney(it.avgCost || it.lastCost || 0) + '</td>' +
              '<td style="white-space:nowrap;"><button type="button" class="icon-btn btn-edit-item" data-id="' + it.id + '">✏️</button> <button type="button" class="icon-btn icon-del btn-del-item" data-id="' + it.id + '"' + (readOnlyMode ? ' disabled' : '') + '>🗑️</button></td></tr>';
          }).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--ink-soft);padding:24px;">لا أصناف</td></tr>'}
        </tbody>
      </table></div>
      ${typeof tablePagerHtml === 'function' ? tablePagerHtml('warehouses.items', pg) : ''}
    </div>`;
}

function renderWhMovesTab(){
  const q = (whFilters.q || '').trim();
  let list = whMovements().slice().sort(function(a, b){ return String(b.date || '').localeCompare(String(a.date || '')); });
  if(whFilters.locationId){
    list = list.filter(function(m){ return m.locationId === whFilters.locationId || m.toLocationId === whFilters.locationId; });
  }
  if(q){
    list = list.filter(function(m){
      const hay = [m.id, m.type, m.itemId, whItemName(m.itemId), m.project, m.supplierInvoiceId, m.notes].join(' ');
      return typeof smartMatch === 'function' ? smartMatch(hay, q) : hay.toLowerCase().indexOf(q.toLowerCase()) >= 0;
    });
  }
  const typeLabel = { in: 'استلام', out: 'صرف', transfer: 'تحويل', adjust_in: 'تسوية+', adjust_out: 'تسوية-' };
  const pg = typeof paginateRows === 'function' ? paginateRows(list, 'warehouses.moves') : { pageRows: list };
  const locOpts = whLocations().map(function(L){
    return '<option value="' + escapeHtml(L.id) + '"' + (whFilters.locationId === L.id ? ' selected' : '') + '>' + escapeHtml(L.name) + '</option>';
  }).join('');

  return `
    <div class="page">
      ${typeof unifiedPageHeader==='function' ? unifiedPageHeader('حركات المخزن', 'استلام · صرف · تحويل · تسوية') : '<h2 class="page-title">حركات المخزن</h2>'}
      ${whTabsHtml('moves')}
      <div class="filters-bar">
        <input type="search" id="whSearch" class="input" placeholder="بحث..." value="${escapeHtml(whFilters.q || '')}" style="min-width:200px;flex:1;">
        <select id="whLoc" class="input" style="min-width:160px;"><option value="">كل المخازن</option>${locOpts}</select>
      </div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>الكود</th><th>التاريخ</th><th>النوع</th><th>الصنف</th><th>الكمية</th><th>المخزن</th><th>مرجع</th></tr></thead>
        <tbody>
          ${pg.pageRows.length ? pg.pageRows.map(function(m){
            const ref = m.type === 'in' ? (m.supplierInvoiceId || m.supplierName || '') :
              m.type === 'out' ? (m.project || '') :
              m.type === 'transfer' ? (whLocationName(m.locationId) + ' → ' + whLocationName(m.toLocationId)) : (m.notes || '');
            return '<tr><td>' + escapeHtml(m.id || '') + '</td><td>' + escapeHtml(m.date || '') + '</td><td>' + escapeHtml(typeLabel[m.type] || m.type) + '</td><td>' + escapeHtml(whItemName(m.itemId)) + '</td><td><strong>' + (m.qty || 0) + '</strong></td><td>' + escapeHtml(whLocationName(m.locationId)) + '</td><td>' + escapeHtml(ref) + '</td></tr>';
          }).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--ink-soft);padding:24px;">لا حركات</td></tr>'}
        </tbody>
      </table></div>
      ${typeof tablePagerHtml === 'function' ? tablePagerHtml('warehouses.moves', pg) : ''}
    </div>`;
}

function renderWhLocationsTab(){
  const list = whLocations();
  return `
    <div class="page">
      ${typeof unifiedPageHeader==='function' ? unifiedPageHeader('المخازن / المواقع', 'مواقع التخزين') : '<h2 class="page-title">المخازن / المواقع</h2>'}
      ${whTabsHtml('locations')}
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>الكود</th><th>الاسم</th><th>ملاحظات</th><th></th></tr></thead>
        <tbody>
          ${list.length ? list.map(function(L){
            return '<tr><td>' + escapeHtml(L.id) + '</td><td><strong>' + escapeHtml(L.name) + '</strong></td><td>' + escapeHtml(L.notes || '') + '</td>' +
              '<td><button type="button" class="icon-btn btn-edit-loc" data-id="' + L.id + '">✏️</button></td></tr>';
          }).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--ink-soft);">لا مخازن</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
}

function initWarehousesHomeEvents(){
  document.querySelectorAll('.wh-tab').forEach(function(b){
    b.addEventListener('click', function(){ whFilters.tab = b.getAttribute('data-tab'); rerenderCurrentPage(); });
  });
  document.getElementById('whSearch')?.addEventListener('input', function(e){
    whFilters.q = e.target.value;
    clearTimeout(window.__whQT);
    window.__whQT = setTimeout(function(){ rerenderCurrentPage(); }, 220);
  });
  document.getElementById('whLoc')?.addEventListener('change', function(e){
    whFilters.locationId = e.target.value; rerenderCurrentPage();
  });
  document.getElementById('btnWhAddItem')?.addEventListener('click', function(){ openWhItemModal(); });
  document.getElementById('btnWhAddLoc')?.addEventListener('click', function(){ openWhLocationModal(); });
  document.getElementById('btnWhIn')?.addEventListener('click', function(){ openWhMovementModal('in'); });
  document.getElementById('btnWhOut')?.addEventListener('click', function(){ openWhMovementModal('out'); });
  document.getElementById('btnWhTransfer')?.addEventListener('click', function(){ openWhMovementModal('transfer'); });
  document.querySelectorAll('.btn-edit-item').forEach(function(b){
    b.addEventListener('click', function(){ openWhItemModal(b.getAttribute('data-id')); });
  });
  document.querySelectorAll('.btn-del-item').forEach(function(b){
    b.addEventListener('click', function(){
      const id = b.getAttribute('data-id');
      (typeof confirmDelete === 'function' ? confirmDelete('حذف الصنف؟') : Promise.resolve(confirm('حذف؟'))).then(function(ok){
        if(!ok) return;
        whDeleteItem(id); showToast('تم الحذف'); rerenderCurrentPage();
      });
    });
  });
  document.querySelectorAll('.btn-edit-loc').forEach(function(b){
    b.addEventListener('click', function(){ openWhLocationModal(b.getAttribute('data-id')); });
  });
}

function openWhItemModal(editId){
  const it = editId ? whItemById(editId) : null;
  openModal(`
    <div class="modal-header"><h3>${it ? 'تعديل صنف' : 'صنف جديد'}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body"><div class="form-grid form-grid-2">
      <label>الكود<input class="input" id="whICode" value="${escapeHtml(it && it.code || whNextItemCode())}"></label>
      <label>الاسم *<input class="input" id="whIName" value="${escapeHtml(it && it.name || '')}"></label>
      <label>الوحدة<input class="input" id="whIUnit" value="${escapeHtml(it && it.unit || 'قطعة')}"></label>
      <label>التصنيف<input class="input" id="whICat" value="${escapeHtml(it && it.category || '')}"></label>
      <label>حد الطلب<input class="input" id="whIMin" type="number" step="0.001" value="${escapeHtml(it && it.minQty != null ? it.minQty : '')}"></label>
      <label>تكلفة<input class="input" id="whICost" type="number" step="0.01" value="${escapeHtml(it ? (it.avgCost || it.lastCost || '') : '')}"></label>
      <label style="grid-column:1/-1;">ملاحظات<textarea class="input" id="whINotes" rows="2">${escapeHtml(it && it.notes || '')}</textarea></label>
    </div></div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" id="btnSaveWhItem">حفظ</button></div>
  `);
  document.getElementById('btnSaveWhItem').onclick = function(){
    const name = (document.getElementById('whIName').value || '').trim();
    if(!name){ showToast('الاسم مطلوب'); return; }
    const cost = toInt(document.getElementById('whICost').value);
    const rec = {
      id: it ? it.id : (typeof uid === 'function' ? uid() : ('itm_' + Date.now().toString(36))),
      code: (document.getElementById('whICode').value || '').trim() || whNextItemCode(),
      name: name,
      unit: (document.getElementById('whIUnit').value || '').trim() || 'قطعة',
      category: (document.getElementById('whICat').value || '').trim(),
      minQty: document.getElementById('whIMin').value === '' ? null : toInt(document.getElementById('whIMin').value),
      avgCost: cost || (it && it.avgCost) || 0,
      lastCost: cost || (it && it.lastCost) || 0,
      notes: (document.getElementById('whINotes').value || '').trim()
    };
    whUpsertItem(rec); closeModal(); showToast('تم الحفظ'); rerenderCurrentPage();
  };
}

function openWhLocationModal(editId){
  const L = editId ? whLocationById(editId) : null;
  openModal(`
    <div class="modal-header"><h3>${L ? 'تعديل مخزن' : 'مخزن جديد'}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body"><div class="form-grid form-grid-2">
      <label>الكود<input class="input" id="whLId" value="${escapeHtml(L && L.id || ('LOC-' + String(whLocations().length + 1).padStart(2, '0')))}" ${L ? 'readonly' : ''}></label>
      <label>الاسم *<input class="input" id="whLName" value="${escapeHtml(L && L.name || '')}"></label>
      <label style="grid-column:1/-1;">ملاحظات<textarea class="input" id="whLNotes" rows="2">${escapeHtml(L && L.notes || '')}</textarea></label>
    </div></div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" id="btnSaveWhLoc">حفظ</button></div>
  `);
  document.getElementById('btnSaveWhLoc').onclick = function(){
    const name = (document.getElementById('whLName').value || '').trim();
    if(!name){ showToast('الاسم مطلوب'); return; }
    whUpsertLocation({
      id: (document.getElementById('whLId').value || '').trim(),
      name: name,
      notes: (document.getElementById('whLNotes').value || '').trim()
    });
    closeModal(); showToast('تم الحفظ'); rerenderCurrentPage();
  };
}

function openWhMovementModal(type){
  if(!whItems().length){ showToast('أضف صنفاً أولاً'); return; }
  if(!whLocations().length){ showToast('أضف مخزناً أولاً'); return; }
  const today = (typeof todayISO === 'function') ? todayISO() : new Date().toISOString().slice(0, 10);
  const titles = { in: 'استلام للمخزن', out: 'صرف من المخزن', transfer: 'تحويل بين مخازن' };
  const defLoc = whSettings().defaultLocationId || (whLocations()[0] && whLocations()[0].id) || '';

  // supplier invoices for linking
  let invOpts = '';
  try{
    const invs = (DATA.ledger && DATA.ledger.invoices) || [];
    invOpts = invs.filter(function(inv){ return inv && !inv.isReturn; }).slice(-80).reverse().map(function(inv){
      const sup = (typeof getSupplier === 'function' ? getSupplier(inv.supplierId) : null) ||
        ((DATA.ledger.suppliers || []).find(function(s){ return s.id === inv.supplierId; }));
      const label = (inv.number || inv.id || '') + (sup ? ' — ' + (sup.name || '') : '') + (inv.date ? ' — ' + inv.date : '');
      return '<option value="' + escapeHtml(inv.id) + '">' + escapeHtml(label) + '</option>';
    }).join('');
  }catch(_e){}

  const projectOpts = (DATA.projects || []).map(function(p){
    return '<option value="' + escapeHtml(p.name) + '">' + escapeHtml((p.code ? p.code + ' — ' : '') + p.name) + '</option>';
  }).join('');

  openModal(`
    <div class="modal-header"><h3>${titles[type] || type}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body"><div class="form-grid form-grid-2">
      <label>الصنف *<select class="input" id="whMItem">${whItems().map(function(it){
        return '<option value="' + escapeHtml(it.id) + '">' + escapeHtml((it.code ? it.code + ' — ' : '') + it.name) + '</option>';
      }).join('')}</select></label>
      <label>الكمية *<input class="input" id="whMQty" type="number" min="0.001" step="0.001" value="1"></label>
      <label>المخزن ${type === 'transfer' ? '(من)' : ''}*<select class="input" id="whMLoc">${whLocations().map(function(L){
        return '<option value="' + escapeHtml(L.id) + '"' + (L.id === defLoc ? ' selected' : '') + '>' + escapeHtml(L.name) + '</option>';
      }).join('')}</select></label>
      ${type === 'transfer' ? '<label>إلى مخزن *<select class="input" id="whMTo">' + whLocations().map(function(L){
        return '<option value="' + escapeHtml(L.id) + '">' + escapeHtml(L.name) + '</option>';
      }).join('') + '</select></label>' : ''}
      <label>التاريخ<input class="input" id="whMDate" type="date" value="${today}"></label>
      ${type === 'in' ? '<label>تكلفة الوحدة<input class="input" id="whMCost" type="number" step="0.01" value=""></label><label>فاتورة مورد<select class="input" id="whMInv"><option value="">— اختياري —</option>' + invOpts + '</select></label>' : ''}
      ${type === 'out' ? '<label>المشروع<select class="input" id="whMProj"><option value="">— اختياري —</option>' + projectOpts + '</select></label>' : ''}
      <label style="grid-column:1/-1;">ملاحظات<textarea class="input" id="whMNotes" rows="2"></textarea></label>
    </div></div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" id="btnSaveWhMove">حفظ</button></div>
  `);

  // autofill cost from item
  document.getElementById('whMItem')?.addEventListener('change', function(){
    const it = whItemById(document.getElementById('whMItem').value);
    if(it && document.getElementById('whMCost') && !document.getElementById('whMCost').value){
      document.getElementById('whMCost').value = it.lastCost || it.avgCost || '';
    }
  });

  document.getElementById('btnSaveWhMove').onclick = function(){
    const itemId = document.getElementById('whMItem').value;
    const qty = toInt(document.getElementById('whMQty').value);
    if(!itemId || qty <= 0){ showToast('الصنف والكمية مطلوبان'); return; }
    const locationId = document.getElementById('whMLoc').value;
    const toLocationId = type === 'transfer' ? (document.getElementById('whMTo')?.value || '') : '';
    if(type === 'transfer' && (!toLocationId || toLocationId === locationId)){ showToast('اختر مخزناً مختلفاً للتحويل'); return; }
    if(type === 'out' || type === 'transfer'){
      const avail = whStockQty(itemId, locationId);
      if(qty > avail + 0.0001){ showToast('الرصيد غير كافٍ (المتاح: ' + avail + ')'); return; }
    }
    let supplierInvoiceId = '', supplierName = '';
    if(type === 'in'){
      supplierInvoiceId = document.getElementById('whMInv')?.value || '';
      if(supplierInvoiceId && DATA.ledger){
        const inv = (DATA.ledger.invoices || []).find(function(i){ return i.id === supplierInvoiceId; });
        if(inv){
          const sup = (DATA.ledger.suppliers || []).find(function(s){ return s.id === inv.supplierId; });
          supplierName = sup ? sup.name : '';
        }
      }
    }
    const m = {
      id: whNextMovementId(),
      type: type,
      itemId: itemId,
      qty: qty,
      locationId: locationId,
      toLocationId: toLocationId || undefined,
      date: document.getElementById('whMDate').value || today,
      unitCost: type === 'in' ? toInt(document.getElementById('whMCost')?.value) : undefined,
      supplierInvoiceId: supplierInvoiceId || undefined,
      supplierName: supplierName || undefined,
      project: type === 'out' ? (document.getElementById('whMProj')?.value || '') : undefined,
      notes: (document.getElementById('whMNotes').value || '').trim()
    };
    whAddMovement(m);
    closeModal(); showToast('تم تسجيل الحركة');
    whFilters.tab = 'moves';
    rerenderCurrentPage();
  };
}
