/* =========================================================
   أعمال الحصر — قائمة + نموذج (شكل النظام الموحد)
   المرحلة 0.7
   ========================================================= */

let workSurveyFilters = { q: '', status: '', customerId: '', detailKey: '' };

function clEmptySurveyItem(){
  return {
    code: '', name: '', unit: 'م3', method: 'يدوي',
    qty: 0, price: 0, total: 0,
    length: '', width: '', height: '', count: '',
    notes: '', isHeader: false
  };
}

function clCalcSurveyItem(it){
  const x = Object.assign({}, it);
  const method = x.method || 'يدوي';
  let qty = Number(x.qty) || 0;
  if(method === 'حجم'){
    const L = Number(x.length) || 0, W = Number(x.width) || 0, H = Number(x.height) || 0;
    const C = Number(x.count) || 1;
    if(L || W || H) qty = L * W * H * C;
  } else if(method === 'مساحة'){
    const L = Number(x.length) || 0, W = Number(x.width) || 0;
    const C = Number(x.count) || 1;
    if(L || W) qty = L * W * C;
  } else if(method === 'طول'){
    const L = Number(x.length) || 0;
    const C = Number(x.count) || 1;
    if(L) qty = L * C;
  } else if(method === 'عدد'){
    qty = Number(x.count) || Number(x.qty) || 0;
  }
  x.qty = Math.round(qty * 1000) / 1000;
  x.total = Math.round((x.qty * (Number(x.price) || 0)) * 100) / 100;
  return x;
}

function clSurveyTotal(items){
  return (items || []).reduce(function(s, it){
    const c = clCalcSurveyItem(it);
    return s + (c.isHeader ? 0 : (Number(c.total) || 0));
  }, 0);
}

/** كل أعمال الحصر مسطّحة من العملاء */
function clAllWorkSurveys(){
  const rows = [];
  clCustomers().forEach(function(c){
    (c.workSurveys || []).forEach(function(ws, idx){
      rows.push(Object.assign({}, ws, {
        customerId: c.id,
        customerName: c.name,
        _idx: idx,
        _key: c.id + '::' + (ws.id || idx)
      }));
    });
  });
  return rows;
}

function clNextSurveyId(){
  const p = (clSettings().surveyPrefix || 'Q-');
  let max = 0;
  clAllWorkSurveys().forEach(function(w){
    const m = String(w.id || '').match(/(\d+)\s*$/);
    if(m) max = Math.max(max, parseInt(m[1], 10) || 0);
  });
  return p + String(max + 1).padStart(4, '0');
}

function renderClientsWorkSurveysPage(){
  if(workSurveyFilters.detailKey){
    return renderWorkSurveyDetail(workSurveyFilters.detailKey);
  }

  const q = (workSurveyFilters.q || '').trim();
  let list = clAllWorkSurveys();

  if(workSurveyFilters.customerId){
    list = list.filter(function(w){ return w.customerId === workSurveyFilters.customerId; });
  }
  if(workSurveyFilters.status){
    list = list.filter(function(w){ return (w.status || '') === workSurveyFilters.status; });
  }
  if(q){
    list = list.filter(function(w){
      const hay = [w.id, w.workType, w.project, w.location, w.officer, w.supervisor, w.customerName, w.notes, w.status].join(' ');
      return typeof smartMatch === 'function' ? smartMatch(hay, q) : hay.toLowerCase().indexOf(q.toLowerCase()) >= 0;
    });
  }

  // ترتيب أحدث أولاً تقريباً
  list = list.slice().sort(function(a, b){
    return String(b.execDate || b.id || '').localeCompare(String(a.execDate || a.id || ''));
  });

  const all = clAllWorkSurveys();
  const approved = all.filter(function(w){ return w.status === 'معتمد'; }).length;
  const draft = all.filter(function(w){ return (w.status || 'مسودة') === 'مسودة'; }).length;
  const totalVal = all.reduce(function(s, w){ return s + clSurveyTotal(w.items); }, 0);

  try{
    if(typeof setPageExport === 'function'){
      setPageExport('clients.workSurveys',
        ['الكود','العميل','المشروع','نوع العمل','الموقع','التاريخ','الحالة','الإجمالي','ملاحظات'],
        list.map(function(w){
          return [
            w.id || '', w.customerName || '', w.project || '', w.workType || '',
            w.location || '', w.execDate || '', w.status || '',
            clSurveyTotal(w.items), w.notes || ''
          ];
        })
      );
    }
  }catch(_e){}

  const pg = typeof paginateRows === 'function' ? paginateRows(list, 'clients.workSurveys') : { pageRows: list };

  const custOpts = clCustomers().map(function(c){
    return '<option value="' + escapeHtml(c.id) + '"' +
      (workSurveyFilters.customerId === c.id ? ' selected' : '') + '>' +
      escapeHtml((c.code ? c.code + ' — ' : '') + c.name) + '</option>';
  }).join('');

  const statusList = ['مسودة','معتمد','تم التفاوض','تم التعاقد','مرفوض'];
  const statusOpts = statusList.map(function(s){
    return '<option value="' + s + '"' + (workSurveyFilters.status === s ? ' selected' : '') + '>' + s + '</option>';
  }).join('');

  return `
    <div class="page">
      ${typeof unifiedPageHeader==='function' ? unifiedPageHeader("أعمال الحصر", "حصر الأعمال · بنود وكميات · أساس المقايسة والعقد والمستخلص", `
${typeof pageExportButtonsHtml === 'function' ? pageExportButtonsHtml() : ''}
          <button class="btn btn-primary" id="btnAddSurvey" ${readOnlyMode ? 'disabled' : ''}>+ حصر</button>
          `) : ``}

      <div class="stats-row" style="margin-bottom:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;">
        <div class="stat-card"><div class="num">${all.length}</div><div class="lbl">كل الحصر</div></div>
        <div class="stat-card"><div class="num">${draft}</div><div class="lbl">مسودة</div></div>
        <div class="stat-card"><div class="num">${approved}</div><div class="lbl">معتمد</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(totalVal)}</div><div class="lbl">إجمالي القيم</div></div>
        <div class="stat-card"><div class="num">${list.length}</div><div class="lbl">نتيجة البحث</div></div>
      </div>

      <div class="filters-bar">
        <input type="search" id="wsSearch" class="input" placeholder="بحث: كود، مشروع، موقع، عميل..." value="${escapeHtml(workSurveyFilters.q || '')}" style="min-width:200px;flex:1;">
        <select id="wsCustomer" class="input" style="min-width:180px;">
          <option value="">كل العملاء</option>
          ${custOpts}
        </select>
        <select id="wsStatus" class="input" style="min-width:140px;">
          <option value="">كل الحالات</option>
          ${statusOpts}
        </select>
        <button type="button" class="btn btn-outline btn-sm" id="wsClear">مسح الفلاتر</button>
      </div>

      <div class="table-wrap"><table class="data-table">
        <thead><tr>
          <th>الكود</th>
          <th>العميل</th>
          <th>المشروع</th>
          <th>نوع العمل</th>
          <th>التاريخ</th>
          <th>الحالة</th>
          <th>الإجمالي</th>
          <th></th>
        </tr></thead>
        <tbody>
          ${pg.pageRows.length ? pg.pageRows.map(function(w){
            const tot = clSurveyTotal(w.items);
            const st = escapeHtml(w.status || 'مسودة');
            return '<tr>' +
              '<td style="white-space:nowrap;">' + escapeHtml(w.id || '—') + '</td>' +
              '<td>' + escapeHtml(w.customerName || '—') + '</td>' +
              '<td><strong>' + escapeHtml(w.project || '—') + '</strong>' +
                (w.location ? '<div style="font-size:11px;color:var(--ink-soft);">' + escapeHtml(w.location) + '</div>' : '') +
              '</td>' +
              '<td>' + escapeHtml(w.workType || '—') + '</td>' +
              '<td>' + escapeHtml(w.execDate || '—') + '</td>' +
              '<td>' + st + '</td>' +
              '<td style="white-space:nowrap;"><strong>' + fmtMoney(tot) + '</strong></td>' +
              '<td style="white-space:nowrap;">' +
                '<button type="button" class="icon-btn btn-view-ws" data-key="' + escapeHtml(w._key) + '" title="تفاصيل">👁️</button> ' +
                '<button type="button" class="icon-btn btn-edit-ws" data-key="' + escapeHtml(w._key) + '" title="تعديل">✏️</button> ' +
                '<button type="button" class="icon-btn icon-del btn-del-ws" data-key="' + escapeHtml(w._key) + '"' + (readOnlyMode ? ' disabled' : '') + ' title="حذف">🗑️</button>' +
              '</td></tr>';
          }).join('') : '<tr><td colspan="8" style="text-align:center;color:var(--ink-soft);padding:28px;">لا أعمال حصر — اضغط «+ حصر» (يلزم وجود عميل أولاً)</td></tr>'}
        </tbody>
      </table></div>
      ${typeof tablePagerHtml === 'function' ? tablePagerHtml('clients.workSurveys', pg) : ''}
    </div>`;
}

function renderWorkSurveyDetail(key){
  const row = clAllWorkSurveys().find(function(w){ return w._key === key; });
  if(!row){ workSurveyFilters.detailKey = ''; return renderClientsWorkSurveysPage(); }
  const items = (row.items || []).map(clCalcSurveyItem);
  const tot = clSurveyTotal(items);

  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div>
          <button type="button" class="btn btn-outline btn-sm" id="wsBack">← رجوع</button>
          <h2 class="page-title" style="margin:8px 0 0;">حصر ${escapeHtml(row.id || '')}</h2>
          <p class="page-sub" style="margin:4px 0 0;">${escapeHtml(row.customerName || '')} · ${escapeHtml(row.project || '')}</p>
        </div>
        <div class="btn-row">
          <button class="btn btn-outline" id="wsPrint">🖨️ طباعة / PDF</button>
          <button class="btn btn-outline" id="wsEditFromDetail">تعديل</button>
        </div>
      </div>

      <div class="stats-row" style="margin-bottom:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;">
        <div class="stat-card"><div class="num">${items.length}</div><div class="lbl">بنود</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(tot)}</div><div class="lbl">الإجمالي</div></div>
        <div class="stat-card"><div class="num">${escapeHtml(row.status || 'مسودة')}</div><div class="lbl">الحالة</div></div>
      </div>

      <div class="card" style="padding:14px;margin-bottom:14px;">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;font-size:13px;">
          <div><span style="color:var(--ink-soft);">نوع العمل:</span> ${escapeHtml(row.workType || '—')}</div>
          <div><span style="color:var(--ink-soft);">الموقع:</span> ${escapeHtml(row.location || '—')}</div>
          <div><span style="color:var(--ink-soft);">المهندس:</span> ${escapeHtml(row.officer || '—')}</div>
          <div><span style="color:var(--ink-soft);">المشرف:</span> ${escapeHtml(row.supervisor || '—')}</div>
          <div><span style="color:var(--ink-soft);">تاريخ التنفيذ:</span> ${escapeHtml(row.execDate || '—')}</div>
        </div>
        ${row.notes ? '<p style="margin:10px 0 0;color:var(--ink-soft);">' + escapeHtml(row.notes) + '</p>' : ''}
      </div>

      <div class="card" style="padding:14px;">
        <h3 style="margin:0 0 10px;font-size:15px;">بنود الحصر</h3>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>كود</th><th>البند</th><th>الوحدة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
          <tbody>
            ${items.length ? items.map(function(it){
              if(it.isHeader) return '<tr><td colspan="6"><strong>' + escapeHtml(it.name || it.code || '') + '</strong></td></tr>';
              return '<tr><td>' + escapeHtml(it.code || '') + '</td><td>' + escapeHtml(it.name || '') + '</td><td>' + escapeHtml(it.unit || '') + '</td><td>' + (it.qty || 0) + '</td><td>' + fmtMoney(it.price || 0) + '</td><td><strong>' + fmtMoney(it.total || 0) + '</strong></td></tr>';
            }).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--ink-soft);">لا بنود</td></tr>'}
          </tbody>
        </table></div>
      </div>
    </div>`;
}

function initClientsWorkSurveysEvents(){
  if(workSurveyFilters.detailKey){
    document.getElementById('wsBack')?.addEventListener('click', function(){
      workSurveyFilters.detailKey = '';
      rerenderCurrentPage();
    });
    document.getElementById('wsPrint')?.addEventListener('click', function(){ clPrintWorkSurvey(workSurveyFilters.detailKey); });
    document.getElementById('wsEditFromDetail')?.addEventListener('click', function(){
      openWorkSurveyModal(workSurveyFilters.detailKey);
    });
    return;
  }

  document.getElementById('wsSearch')?.addEventListener('input', function(e){
    workSurveyFilters.q = e.target.value;
    clearTimeout(window.__wsQT);
    window.__wsQT = setTimeout(function(){
      if(typeof resetTablePage === 'function') resetTablePage('clients.workSurveys');
      rerenderCurrentPage();
    }, 220);
  });
  document.getElementById('wsCustomer')?.addEventListener('change', function(e){
    workSurveyFilters.customerId = e.target.value;
    if(typeof resetTablePage === 'function') resetTablePage('clients.workSurveys');
    rerenderCurrentPage();
  });
  document.getElementById('wsStatus')?.addEventListener('change', function(e){
    workSurveyFilters.status = e.target.value;
    if(typeof resetTablePage === 'function') resetTablePage('clients.workSurveys');
    rerenderCurrentPage();
  });
  document.getElementById('wsClear')?.addEventListener('click', function(){
    workSurveyFilters.q = '';
    workSurveyFilters.status = '';
    workSurveyFilters.customerId = '';
    if(typeof resetTablePage === 'function') resetTablePage('clients.workSurveys');
    rerenderCurrentPage();
  });
  document.getElementById('btnAddSurvey')?.addEventListener('click', function(){
    if(!clCustomers().length){ showToast('أضف عميلاً أولاً من صفحة العملاء'); return; }
    openWorkSurveyModal();
  });
  document.querySelectorAll('.btn-view-ws').forEach(function(b){
    b.addEventListener('click', function(){
      workSurveyFilters.detailKey = b.getAttribute('data-key');
      rerenderCurrentPage();
    });
  });
  document.querySelectorAll('.btn-edit-ws').forEach(function(b){
    b.addEventListener('click', function(){ openWorkSurveyModal(b.getAttribute('data-key')); });
  });
  document.querySelectorAll('.btn-del-ws').forEach(function(b){
    b.addEventListener('click', function(){
      const key = b.getAttribute('data-key');
      const row = clAllWorkSurveys().find(function(w){ return w._key === key; });
      if(!row) return;
      const msg = 'حذف عمل الحصر «' + (row.id || '') + '»؟';
      (typeof confirmDelete === 'function' ? confirmDelete(msg) : Promise.resolve(confirm(msg))).then(function(ok){
        if(!ok) return;
        const cust = clCustomerById(row.customerId);
        if(!cust) return;
        cust.workSurveys = (cust.workSurveys || []).filter(function(_, i){ return i !== row._idx; });
        // re-filter by id safer
        if(row.id){
          cust.workSurveys = (cust.workSurveys || []).filter(function(w){ return w.id !== row.id; });
        }
        clUpsertCustomer(cust);
        showToast('تم الحذف');
        rerenderCurrentPage();
      });
    });
  });
}

function openWorkSurveyModal(editKey){
  const existing = editKey ? clAllWorkSurveys().find(function(w){ return w._key === editKey; }) : null;
  const customers = clCustomers();
  if(!customers.length){ showToast('أضف عميلاً أولاً'); return; }

  let items = (existing && existing.items && existing.items.length)
    ? existing.items.map(function(it){ return clCalcSurveyItem(Object.assign({}, clEmptySurveyItem(), it)); })
    : [clEmptySurveyItem(), clEmptySurveyItem()];

  const today = (typeof todayISO === 'function') ? todayISO() : new Date().toISOString().slice(0, 10);
  const statusList = ['مسودة','معتمد','تم التفاوض','تم التعاقد','مرفوض'];

  // مشاريع من العملاء + DATA.projects
  function projectOptions(cid){
    const names = {};
    const c = clCustomerById(cid);
    clProjects().forEach(function(p){
      if(!p || !p.name) return;
      if(!cid || (c && clProjectBelongsTo(p, c)) || !p.customerId) names[p.name] = true;   // مشاريع العميل + المشاريع غير المربوطة بعميل
    });
    return Object.keys(names).sort(function(a, b){ return a.localeCompare(b, 'ar'); });
  }

  const initialCid = existing ? existing.customerId : customers[0].id;
  let projectNames = projectOptions(initialCid);

  function itemsTableHtml(){
    return items.map(function(it, idx){
      const c = clCalcSurveyItem(it);
      items[idx] = c;
      return '<tr data-ii="' + idx + '">' +
        '<td><input class="input it-code" value="' + escapeHtml(c.code || '') + '" style="min-width:70px;"></td>' +
        '<td><input class="input it-name" value="' + escapeHtml(c.name || '') + '" style="min-width:120px;"></td>' +
        '<td><select class="input it-method" style="min-width:80px;">' +
          ['يدوي','حجم','مساحة','طول','عدد'].map(function(m){
            return '<option value="' + m + '"' + (c.method === m ? ' selected' : '') + '>' + m + '</option>';
          }).join('') +
        '</select></td>' +
        '<td><input class="input it-unit" value="' + escapeHtml(c.unit || '') + '" style="width:70px;"></td>' +
        '<td><input class="input it-qty" type="number" step="0.001" value="' + (c.qty || 0) + '" style="width:90px;"></td>' +
        '<td><input class="input it-price" type="number" step="0.01" value="' + (c.price || 0) + '" style="width:90px;"></td>' +
        '<td class="it-total" style="white-space:nowrap;font-weight:700;">' + fmtMoney(c.total || 0) + '</td>' +
        '<td><button type="button" class="icon-btn it-del" data-i="' + idx + '">🗑️</button></td>' +
      '</tr>';
    }).join('');
  }

  openModal(`
    <div class="modal-header">
      <h3>${existing ? 'تعديل حصر' : 'عمل حصر جديد'}</h3>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body" style="max-height:70vh;overflow:auto;">
      <div class="form-grid form-grid-2">
        <label>العميل *
          <select class="input" id="wsCust">
            ${customers.map(function(c){
              return '<option value="' + escapeHtml(c.id) + '"' + (initialCid === c.id ? ' selected' : '') + '>' +
                escapeHtml((c.code ? c.code + ' — ' : '') + c.name) + '</option>';
            }).join('')}
          </select>
        </label>
        <label>كود الحصر
          <input class="input" id="wsId" value="${escapeHtml(existing && existing.id || clNextSurveyId())}">
        </label>
        <label>المشروع
          <input class="input" id="wsProject" list="wsProjList" value="${escapeHtml(existing && existing.project || '')}" placeholder="اسم المشروع">
          <datalist id="wsProjList">
            ${projectNames.map(function(n){ return '<option value="' + escapeHtml(n) + '">'; }).join('')}
          </datalist>
        </label>
        <label>نوع العمل
          <input class="input" id="wsType" value="${escapeHtml(existing && existing.workType || '')}">
        </label>
        <label>الموقع
          <input class="input" id="wsLoc" value="${escapeHtml(existing && existing.location || '')}">
        </label>
        <label>تاريخ التنفيذ
          <input class="input" id="wsDate" type="date" value="${escapeHtml(existing && existing.execDate || today)}">
        </label>
        <label>المهندس / المسؤول
          <input class="input" id="wsOfficer" value="${escapeHtml(existing && existing.officer || '')}">
        </label>
        <label>المشرف
          <input class="input" id="wsSupervisor" value="${escapeHtml(existing && existing.supervisor || '')}">
        </label>
        <label>الحالة
          <select class="input" id="wsSt">
            ${statusList.map(function(s){
              const cur = existing ? (existing.status || 'مسودة') : 'مسودة';
              return '<option value="' + s + '"' + (cur === s ? ' selected' : '') + '>' + s + '</option>';
            }).join('')}
          </select>
        </label>
        <label style="grid-column:1/-1;">ملاحظات
          <textarea class="input" id="wsNotes" rows="2">${escapeHtml(existing && existing.notes || '')}</textarea>
        </label>
      </div>

      <div style="margin-top:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong>بنود الحصر</strong>
          <button type="button" class="btn btn-outline btn-sm" id="wsAddItem">+ بند</button>
        </div>
        <div class="table-wrap"><table class="data-table" id="wsItemsTable">
          <thead><tr>
            <th>كود</th><th>البند</th><th>طريقة</th><th>وحدة</th><th>كمية</th><th>سعر</th><th>إجمالي</th><th></th>
          </tr></thead>
          <tbody id="wsItemsBody">${itemsTableHtml()}</tbody>
        </table></div>
        <div id="wsGrandTotal" style="margin-top:8px;font-weight:800;">الإجمالي: ${fmtMoney(clSurveyTotal(items))}</div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="btnSaveSurvey">حفظ</button>
    </div>
  `);

  function readItemsFromDom(){
    const rows = document.querySelectorAll('#wsItemsBody tr[data-ii]');
    const out = [];
    rows.forEach(function(tr){
      const it = clCalcSurveyItem({
        code: tr.querySelector('.it-code')?.value || '',
        name: tr.querySelector('.it-name')?.value || '',
        method: tr.querySelector('.it-method')?.value || 'يدوي',
        unit: tr.querySelector('.it-unit')?.value || '',
        qty: toInt(tr.querySelector('.it-qty')?.value),
        price: toInt(tr.querySelector('.it-price')?.value)
      });
      out.push(it);
    });
    return out;
  }

  function refreshItemsUi(){
    items = readItemsFromDom();
    document.getElementById('wsItemsBody').innerHTML = itemsTableHtml();
    document.getElementById('wsGrandTotal').textContent = 'الإجمالي: ' + fmtMoney(clSurveyTotal(items));
    bindItemEvents();
  }

  function bindItemEvents(){
    document.querySelectorAll('#wsItemsBody .it-qty, #wsItemsBody .it-price, #wsItemsBody .it-method').forEach(function(el){
      el.addEventListener('change', refreshItemsUi);
      el.addEventListener('input', function(){
        const tr = el.closest('tr');
        if(!tr) return;
        const it = clCalcSurveyItem({
          qty: toInt(tr.querySelector('.it-qty')?.value),
          price: toInt(tr.querySelector('.it-price')?.value),
          method: tr.querySelector('.it-method')?.value || 'يدوي',
          code: tr.querySelector('.it-code')?.value || '',
          name: tr.querySelector('.it-name')?.value || '',
          unit: tr.querySelector('.it-unit')?.value || ''
        });
        const totEl = tr.querySelector('.it-total');
        if(totEl) totEl.textContent = fmtMoney(it.total || 0);
        document.getElementById('wsGrandTotal').textContent = 'الإجمالي: ' + fmtMoney(clSurveyTotal(readItemsFromDom()));
      });
    });
    document.querySelectorAll('#wsItemsBody .it-del').forEach(function(btn){
      btn.onclick = function(){
        items = readItemsFromDom();
        const i = parseInt(btn.getAttribute('data-i'), 10);
        if(items.length <= 1){ items[0] = clEmptySurveyItem(); }
        else items.splice(i, 1);
        document.getElementById('wsItemsBody').innerHTML = itemsTableHtml();
        document.getElementById('wsGrandTotal').textContent = 'الإجمالي: ' + fmtMoney(clSurveyTotal(items));
        bindItemEvents();
      };
    });
  }
  bindItemEvents();

  document.getElementById('wsAddItem').onclick = function(){
    items = readItemsFromDom();
    items.push(clEmptySurveyItem());
    document.getElementById('wsItemsBody').innerHTML = itemsTableHtml();
    document.getElementById('wsGrandTotal').textContent = 'الإجمالي: ' + fmtMoney(clSurveyTotal(items));
    bindItemEvents();
  };

  document.getElementById('wsCust').addEventListener('change', function(){
    const cid = document.getElementById('wsCust').value;
    projectNames = projectOptions(cid);
    const dl = document.getElementById('wsProjList');
    if(dl) dl.innerHTML = projectNames.map(function(n){ return '<option value="' + escapeHtml(n) + '">'; }).join('');
  });

  clMountCustomFields('clSurveys', existing);
  clMountCatalog('wsItemsBody');
  const attEd = clAttachMount('حصر', 'حصر', existing ? existing.docs : []);
  document.getElementById('btnSaveSurvey').onclick = function(){
    const cid = document.getElementById('wsCust').value;
    const cust = clCustomerById(cid);
    if(!cust){ showToast('اختر عميلاً'); return; }

    const finalItems = readItemsFromDom().filter(function(it){
      return (it.name && it.name.trim()) || (it.code && it.code.trim()) || (Number(it.qty) > 0);
    }).map(clCalcSurveyItem);

    if(!finalItems.length){ showToast('أضف بنداً واحداً على الأقل'); return; }

    const rec = {
      id: (document.getElementById('wsId').value || '').trim() || clNextSurveyId(),
      workType: (document.getElementById('wsType').value || '').trim(),
      project: (document.getElementById('wsProject').value || '').trim(),
      location: (document.getElementById('wsLoc').value || '').trim(),
      officer: (document.getElementById('wsOfficer').value || '').trim(),
      supervisor: (document.getElementById('wsSupervisor').value || '').trim(),
      execDate: document.getElementById('wsDate').value || '',
      status: document.getElementById('wsSt').value || 'مسودة',
      notes: (document.getElementById('wsNotes').value || '').trim(),
      items: finalItems,
      assignedTo: existing ? (existing.assignedTo || '') : '',
      projectId: existing ? (existing.projectId || '') : '',
      docs: attEd.get(),
      extraFields: clCollectCustomFields('clSurveys', existing)
    };
    const conf = rec.project && clProjectNameConflict(cid, rec.project);
    if(conf){ showToast('المشروع «' + rec.project + '» تابع للعميل «' + conf.owner + '» — اختر مشروعًا آخر'); return; }

    cust.workSurveys = cust.workSurveys || [];
    if(existing && existing.customerId === cid){
      // تعديل في نفس العميل
      const i = cust.workSurveys.findIndex(function(w){ return w.id === existing.id; });
      if(i >= 0) cust.workSurveys[i] = rec;
      else cust.workSurveys.push(rec);
    } else {
      // نقل من عميل لآخر أو جديد
      if(existing && existing.customerId && existing.customerId !== cid){
        const oldC = clCustomerById(existing.customerId);
        if(oldC){
          oldC.workSurveys = (oldC.workSurveys || []).filter(function(w){ return w.id !== existing.id; });
          clUpsertCustomer(oldC);
        }
      }
      const i = cust.workSurveys.findIndex(function(w){ return w.id === rec.id; });
      if(i >= 0) cust.workSurveys[i] = rec;
      else cust.workSurveys.push(rec);
    }

    // مزامنة اسم المشروع للموحّد إن وُجد
    clCatalogLearn(rec.items);
    clLinkRecordToProject(cust, rec, { advanceTo: 'الدراسة والتخطيط' });

    clUpsertCustomer(cust);
    closeModal();
    showToast(existing ? 'تم تحديث الحصر' : 'تم إضافة الحصر');
    workSurveyFilters.detailKey = '';
    rerenderCurrentPage();
  };
}
