/* =========================================================
   الإيرادات / التحصيلات · 0.8 مبكر
   ========================================================= */
let collFilters = { q: '', customerId: '', detailKey: '' };

function clAllCollections(){
  const rows = [];
  clCustomers().forEach(function(c){
    (c.collections || []).forEach(function(r, idx){
      rows.push(Object.assign({}, r, {
        customerId: c.id, customerName: c.name, _idx: idx,
        _key: c.id + '::' + (r.id || idx)
      }));
    });
  });
  return rows;
}
function clNextCollectionId(){
  const p = (clSettings().collectionPrefix || 'REC-');
  let max = 0;
  clAllCollections().forEach(function(r){
    const m = String(r.id || '').match(/(\d+)\s*$/);
    if(m) max = Math.max(max, parseInt(m[1], 10) || 0);
  });
  return p + String(max + 1).padStart(4, '0');
}

function renderClientsCollectionsPage(){
  const q = (collFilters.q || '').trim();
  let list = clAllCollections();
  if(collFilters.customerId) list = list.filter(function(r){ return r.customerId === collFilters.customerId; });
  if(q){
    list = list.filter(function(r){
      const hay = [r.id, r.customerName, r.project, r.invoiceNo, r.method, r.refNo, r.notes].join(' ');
      return typeof smartMatch === 'function' ? smartMatch(hay, q) : hay.toLowerCase().indexOf(q.toLowerCase()) >= 0;
    });
  }
  list = list.slice().sort(function(a, b){ return String(b.date || '').localeCompare(String(a.date || '')); });

  const all = clAllCollections();
  const total = all.reduce(function(s, r){ return s + (Number(r.amount) || 0); }, 0);
  try{
    if(typeof setPageExport === 'function'){
      setPageExport('clients.collections',
        ['الكود','التاريخ','العميل','المشروع','المبلغ','الطريقة','مستخلص','مرجع'],
        list.map(function(r){
          return [r.id || '', r.date || '', r.customerName || '', r.project || '', Number(r.amount) || 0, r.method || '', r.invoiceNo || '', r.refNo || ''];
        })
      );
    }
  }catch(_e){}

  const pg = typeof paginateRows === 'function' ? paginateRows(list, 'clients.collections') : { pageRows: list };
  const custOpts = clCustomers().map(function(c){
    return '<option value="' + escapeHtml(c.id) + '"' + (collFilters.customerId === c.id ? ' selected' : '') + '>' + escapeHtml(c.name) + '</option>';
  }).join('');

  return `
    <div class="page">
      ${typeof unifiedPageHeader==='function' ? unifiedPageHeader("الإيرادات / التحصيلات", "تسجيل التحصيل وربطه بالمستخلص وتحديث المدفوع", `
${typeof pageExportButtonsHtml === 'function' ? pageExportButtonsHtml() : ''}
          <button class="btn btn-primary" id="btnAddColl" ${readOnlyMode ? 'disabled' : ''}>+ تحصيل</button>
          `) : ``}
      <div class="stats-row" style="margin-bottom:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;">
        <div class="stat-card"><div class="num">${all.length}</div><div class="lbl">عمليات</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(total)}</div><div class="lbl">إجمالي المحصّل</div></div>
        <div class="stat-card"><div class="num">${list.length}</div><div class="lbl">نتيجة البحث</div></div>
      </div>
      <div class="filters-bar">
        <input type="search" id="coSearch" class="input" placeholder="بحث..." value="${escapeHtml(collFilters.q || '')}" style="min-width:200px;flex:1;">
        <select id="coCustomer" class="input" style="min-width:180px;"><option value="">كل العملاء</option>${custOpts}</select>
        <button type="button" class="btn btn-outline btn-sm" id="coClear">مسح</button>
      </div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>الكود</th><th>التاريخ</th><th>العميل</th><th>المبلغ</th><th>الطريقة</th><th>مستخلص</th><th></th></tr></thead>
        <tbody>
          ${pg.pageRows.length ? pg.pageRows.map(function(r){
            return '<tr>' +
              '<td>' + escapeHtml(r.id || '—') + '</td>' +
              '<td>' + escapeHtml(r.date || '—') + '</td>' +
              '<td>' + escapeHtml(r.customerName || '—') +
                (r.project ? '<div style="font-size:11px;color:var(--ink-soft);">' + escapeHtml(r.project) + '</div>' : '') +
              '</td>' +
              '<td style="white-space:nowrap;"><strong>' + fmtMoney(r.amount || 0) + '</strong></td>' +
              '<td>' + escapeHtml(r.method || '—') + '</td>' +
              '<td>' + escapeHtml(r.invoiceNo || '—') + '</td>' +
              '<td style="white-space:nowrap;">' +
                '<button type="button" class="icon-btn btn-edit-co" data-key="' + escapeHtml(r._key) + '">✏️</button> ' +
                '<button type="button" class="icon-btn icon-del btn-del-co" data-key="' + escapeHtml(r._key) + '"' + (readOnlyMode ? ' disabled' : '') + '>🗑️</button>' +
              '</td></tr>';
          }).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--ink-soft);padding:28px;">لا تحصيلات</td></tr>'}
        </tbody>
      </table></div>
      ${typeof tablePagerHtml === 'function' ? tablePagerHtml('clients.collections', pg) : ''}
    </div>`;
}

function initClientsCollectionsEvents(){
  document.getElementById('coSearch')?.addEventListener('input', function(e){
    collFilters.q = e.target.value;
    clearTimeout(window.__coQT);
    window.__coQT = setTimeout(function(){ if(typeof resetTablePage === 'function') resetTablePage('clients.collections'); rerenderCurrentPage(); }, 220);
  });
  document.getElementById('coCustomer')?.addEventListener('change', function(e){
    collFilters.customerId = e.target.value;
    if(typeof resetTablePage === 'function') resetTablePage('clients.collections');
    rerenderCurrentPage();
  });
  document.getElementById('coClear')?.addEventListener('click', function(){
    collFilters.q = ''; collFilters.customerId = '';
    rerenderCurrentPage();
  });
  document.getElementById('btnAddColl')?.addEventListener('click', function(){
    if(!clCustomers().length){ showToast('أضف عميلاً أولاً'); return; }
    openCollectionModal();
  });
  document.querySelectorAll('.btn-edit-co').forEach(function(b){
    b.addEventListener('click', function(){ openCollectionModal(b.getAttribute('data-key')); });
  });
  document.querySelectorAll('.btn-del-co').forEach(function(b){
    b.addEventListener('click', function(){
      const row = clAllCollections().find(function(r){ return r._key === b.getAttribute('data-key'); });
      if(!row) return;
      (typeof confirmDelete === 'function' ? confirmDelete('حذف التحصيل؟') : Promise.resolve(confirm('حذف؟'))).then(function(ok){
        if(!ok) return;
        const c = clCustomerById(row.customerId);
        if(!c) return;
        c.collections = (c.collections || []).filter(function(x){ return x.id !== row.id; });
        clReconcilePaid(c);
        clUpsertCustomer(c); showToast('تم الحذف'); rerenderCurrentPage();
      });
    });
  });
}

function openCollectionModal(editKey){
  const existing = editKey ? clAllCollections().find(function(r){ return r._key === editKey; }) : null;
  const customers = clCustomers();
  if(!customers.length) return;
  const today = (typeof todayISO === 'function') ? todayISO() : new Date().toISOString().slice(0, 10);
  const initialCid = existing ? existing.customerId : customers[0].id;
  const methods = ['تحويل بنكي','شيك','نقدي','دفعة مقدمة','أخرى'];

  function invOpts(cid){
    const c = clCustomerById(cid);
    return ((c && c.invoices) || []).map(function(inv){
      const net = typeof clInvNet === 'function' ? clInvNet(inv) : (Number(inv.value) || 0);
      const remain = Math.max(0, net - (Number(inv.paid) || 0));
      const sel = existing && existing.invoiceNo === inv.no ? ' selected' : '';
      return '<option value="' + escapeHtml(inv.no) + '"' + sel + '>' + escapeHtml(inv.no + ' — متبقي ' + (typeof fmtMoney === 'function' ? fmtMoney(remain) : remain)) + '</option>';
    }).join('');
  }

  openModal(`
    <div class="modal-header"><h3>${existing ? 'تعديل تحصيل' : 'تحصيل جديد'}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body"><div class="form-grid form-grid-2">
      <label>العميل *<select class="input" id="coCust">${customers.map(function(c){
        return '<option value="' + escapeHtml(c.id) + '"' + (initialCid === c.id ? ' selected' : '') + '>' + escapeHtml(c.name) + '</option>';
      }).join('')}</select></label>
      <label>الكود<input class="input" id="coId" value="${escapeHtml(existing && existing.id || clNextCollectionId())}"></label>
      <label>التاريخ<input class="input" id="coDate" type="date" value="${escapeHtml(existing && existing.date || today)}"></label>
      <label>المبلغ *<input class="input" id="coAmt" type="number" step="0.01" value="${existing ? toInt(existing.amount) : ''}"></label>
      <label>طريقة الدفع<select class="input" id="coMethod">${methods.map(function(m){
        const cur = existing ? (existing.method || methods[0]) : methods[0];
        return '<option value="' + m + '"' + (cur === m ? ' selected' : '') + '>' + m + '</option>';
      }).join('')}</select></label>
      <label>المستخلص<select class="input" id="coInv"><option value="">— بدون —</option>${invOpts(initialCid)}</select></label>
      <label>المشروع<input class="input" id="coProject" list="clProjList" value="${escapeHtml(existing && existing.project || '')}">${clProjectDatalistHtml('clProjList')}</label>
      <label>رقم المرجع / الشيك<input class="input" id="coRef" value="${escapeHtml(existing && existing.refNo || '')}"></label>
      <label style="grid-column:1/-1;">ملاحظات<textarea class="input" id="coNotes" rows="2">${escapeHtml(existing && existing.notes || '')}</textarea></label>
    </div></div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" id="btnSaveColl">حفظ</button></div>
  `);

  document.getElementById('coCust').addEventListener('change', function(){
    document.getElementById('coInv').innerHTML = '<option value="">— بدون —</option>' + invOpts(document.getElementById('coCust').value);
  });
  document.getElementById('coInv').addEventListener('change', function(){
    const cid = document.getElementById('coCust').value;
    const c = clCustomerById(cid);
    const no = document.getElementById('coInv').value;
    if(!c || !no) return;
    const inv = (c.invoices || []).find(function(i){ return i.no === no; });
    if(!inv) return;
    if(!document.getElementById('coProject').value && inv.project) document.getElementById('coProject').value = inv.project;
    if(!document.getElementById('coAmt').value){
      const net = typeof clInvNet === 'function' ? clInvNet(inv) : (Number(inv.value) || 0);
      const remain = Math.max(0, net - (Number(inv.paid) || 0));
      if(remain > 0) document.getElementById('coAmt').value = remain;
    }
  });

  clMountCustomFields('clCollections', existing);
  const attEd = clAttachMount('تحصيل', 'تحصيل', existing ? existing.docs : []);
  document.getElementById('btnSaveColl').onclick = function(){
    const cid = document.getElementById('coCust').value;
    const c = clCustomerById(cid);
    if(!c) return;
    const amount = toInt(document.getElementById('coAmt').value);
    if(amount <= 0){ showToast('أدخل مبلغاً صحيحاً'); return; }
    const invNo = document.getElementById('coInv').value || '';
    const rec = {
      id: (document.getElementById('coId').value || '').trim() || clNextCollectionId(),
      date: document.getElementById('coDate').value || today,
      amount: amount,
      method: document.getElementById('coMethod').value || 'تحويل بنكي',
      invoiceNo: invNo,
      project: (document.getElementById('coProject').value || '').trim(),
      refNo: (document.getElementById('coRef').value || '').trim(),
      notes: (document.getElementById('coNotes').value || '').trim(),
      projectId: existing ? (existing.projectId || '') : '',
      docs: attEd.get(),
      extraFields: clCollectCustomFields('clCollections', existing)
    };
    const conf = rec.project && clProjectNameConflict(cid, rec.project);
    if(conf){ showToast('المشروع «' + rec.project + '» تابع للعميل «' + conf.owner + '» — اختر مشروعًا آخر'); return; }

    c.collections = c.collections || [];
    if(existing && existing.customerId === cid){
      const i = c.collections.findIndex(function(x){ return x.id === existing.id; });
      if(i >= 0) c.collections[i] = rec; else c.collections.push(rec);
    } else {
      if(existing && existing.customerId !== cid){
        const oldC = clCustomerById(existing.customerId);
        if(oldC){
          oldC.collections = (oldC.collections || []).filter(function(x){ return x.id !== existing.id; });
          clReconcilePaid(oldC);
          clUpsertCustomer(oldC);
        }
      }
      c.collections.push(rec);
    }
    clLinkRecordToProject(c, rec, {});
    clReconcilePaid(c);
    clUpsertCustomer(c); closeModal(); showToast('تم حفظ التحصيل'); rerenderCurrentPage();
  };
}
