/* =========================================================
   العملاء — قائمة + إضافة/تعديل (شكل النظام الموحد)
   المرحلة 0.7
   ========================================================= */

let customerFilters = { q: '', seg: '', dept: '', city: '', survey: '', boq: '', detailId: '' };

function _custDepts(){
  const set = {};
  clCustomers().forEach(function(c){ const d = (c.department || '').trim(); if(d) set[d] = 1; });
  return Object.keys(set).sort(function(a, b){ return a.localeCompare(b, 'ar'); });
}

function renderClientsCustomersPage(){
  if(customerFilters.detailId) return renderClientCustomerDetail(customerFilters.detailId);

  const q = (customerFilters.q || '').trim();
  let list = (typeof sortByNameAr === 'function')
    ? sortByNameAr(clCustomers(), function(c){ return c.name; })
    : clCustomers().slice();

  if(q){
    list = list.filter(function(c){
      const hay = [c.name, c.code, c.phone, c.email, c.address, c.city, c.taxId, c.category, c.department, c.notes].join(' ');
      return typeof smartMatch === 'function' ? smartMatch(hay, q) : hay.toLowerCase().indexOf(q.toLowerCase()) >= 0;
    });
  }
  if(customerFilters.seg){
    list = list.filter(function(c){ return clCustomerSegment(c) === customerFilters.seg; });
  }
  if(customerFilters.dept){
    list = list.filter(function(c){ return customerFilters.dept === '__none__' ? !(c.department || '').trim() : (c.department || '').trim() === customerFilters.dept; });
  }
  if(customerFilters.survey){
    list = list.filter(function(c){ const n = (c.workSurveys || []).length; return customerFilters.survey === 'has' ? n > 0 : n === 0; });
  }
  if(customerFilters.project){
    list = list.filter(function(c){ const n = clProjectsOfCustomer(c).length; return customerFilters.project === 'has' ? n > 0 : n === 0; });
  }
  if(customerFilters.invoice){
    list = list.filter(function(c){ const n = (c.invoices || []).length; return customerFilters.invoice === 'has' ? n > 0 : n === 0; });
  }

  const all = clCustomers();
  const depts = _custDepts();
  const cities = Array.from(new Set(all.map(function(c){ return (c.city || '').trim(); }).filter(Boolean))).sort(function(a, b){ return a.localeCompare(b, 'ar'); });
  const withProjects = all.filter(function(c){ return clProjectsOfCustomer(c).length > 0; }).length;
  /* الكروت بتحسب من عملاء القسم المفتوح (مع الفلاتر) بس */
  const sumLen = function(k){ return list.reduce(function(s, c){ return s + (k === 'projects' ? clProjectsOfCustomer(c).length : (c[k] || []).length); }, 0); };

  try{
    if(typeof setPageExport === 'function'){
      setPageExport('clients.customers',
        ['الكود','العميل','الهاتف','المدينة','القسم','مشاريع','عقود','مستخلصات','أعمال الحصر','المقايسات','ملاحظات'],
        list.map(function(c){
          return [
            c.code || '', c.name || '', c.phone || '', c.city || '', c.department || '',
            clProjectsOfCustomer(c).length,
            (c.contracts || []).length,
            (c.invoices || []).length,
            (c.workSurveys || []).length,
            (c.boqs || []).length,
            c.notes || ''
          ];
        })
      );
    }
  }catch(_e){}

  const pg = typeof paginateRows === 'function' ? paginateRows(list, 'clients.customers') : { pageRows: list, page: 1, pages: 1 };
  const sel = function(id, label, opts, cur){
    return '<select id="' + id + '" class="input"><option value="">' + label + '</option>' +
      opts.map(function(o){ return '<option value="' + escapeHtml(o[0]) + '"' + (cur === o[0] ? ' selected' : '') + '>' + escapeHtml(o[1]) + '</option>'; }).join('') + '</select>';
  };
  const hasOpts = [['has', 'لديه'], ['none', 'ليس لديه']];

  return `
    <div class="page">
      ${typeof unifiedPageHeader==='function' ? unifiedPageHeader('العملاء', 'بيانات العملاء · الأقسام · المشاريع وأعمال الحصر والمقايسات',
        (typeof pageExportButtonsHtml==='function' ? pageExportButtonsHtml() : '') +
        '<button class="btn btn-primary" id="btnAddCustomer" '+(readOnlyMode?'disabled':'')+'>+ عميل</button>'
      ) : ''}

      <div class="stats-row" style="margin-bottom:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;">
        <div class="stat-card"><div class="num">${list.length}</div><div class="lbl">العملاء</div></div>
        <div class="stat-card"><div class="num">${sumLen('projects')}</div><div class="lbl">عدد المشاريع</div></div>
        <div class="stat-card"><div class="num">${sumLen('contracts')}</div><div class="lbl">عقود</div></div>
        <div class="stat-card"><div class="num">${sumLen('invoices')}</div><div class="lbl">مستخلصات</div></div>
        <div class="stat-card"><div class="num">${sumLen('workSurveys')}</div><div class="lbl">أعمال الحصر</div></div>
        <div class="stat-card"><div class="num">${sumLen('boqs')}</div><div class="lbl">المقايسات</div></div>
      </div>

      <div class="filters-bar">
        <input type="search" id="custSearch" class="input" placeholder="بحث: اسم، كود، هاتف، قسم..." value="${escapeHtml(customerFilters.q || '')}">
        ${sel('custDept', 'كل الأقسام', [['__none__', 'بدون قسم']].concat(depts.map(function(d){ return [d, d]; })), customerFilters.dept)}
        ${sel('custProject', 'المشاريع', hasOpts, customerFilters.project)}
        ${sel('custInvoice', 'المستخلصات', hasOpts, customerFilters.invoice)}
        ${sel('custSurvey', 'أعمال الحصر', hasOpts, customerFilters.survey)}
        <button type="button" class="btn btn-outline btn-sm" id="custClear">مسح الفلاتر</button>
      </div>

      <div class="table-wrap"><table class="data-table">
        <thead><tr>
          <th>الكود</th>
          <th>العميل</th>
          <th>الهاتف</th>
          <th>المدينة</th>
          <th>القسم</th>
          <th>مشاريع</th>
          <th>عقود</th>
          <th>مستخلصات</th>
          <th>أعمال الحصر</th>
          <th>المقايسات</th>
          <th>ملاحظات</th>
          <th></th>
        </tr></thead>
        <tbody>
          ${pg.pageRows.length ? pg.pageRows.map(function(c){
            return '<tr>' +
              '<td style="white-space:nowrap;">' + escapeHtml(c.code || '—') + '</td>' +
              '<td><strong>' + escapeHtml(c.name || '') + '</strong>' +
                (c.category ? '<div style="font-size:11px;color:var(--ink-soft);">' + escapeHtml(c.category) + '</div>' : '') +
              '</td>' +
              '<td>' + escapeHtml(c.phone || '—') + '</td>' +
              '<td>' + escapeHtml(c.city || '—') + '</td>' +
              '<td>' + escapeHtml(c.department || '—') + '</td>' +
              '<td>' + clProjectsOfCustomer(c).length + '</td>' +
              '<td>' + (c.contracts || []).length + '</td>' +
              '<td>' + (c.invoices || []).length + '</td>' +
              '<td>' + (c.workSurveys || []).length + '</td>' +
              '<td>' + (c.boqs || []).length + '</td>' +
              '<td class="notes-cell">' + recordNotesCellHtml(customerNotesIssues(c)) + '</td>' +
              '<td style="white-space:nowrap;">' +
                '<button type="button" class="icon-btn btn-view-cust" data-id="' + c.id + '" title="تفاصيل">👁️</button> ' +
                '<button type="button" class="icon-btn btn-edit-cust" data-id="' + c.id + '" title="تعديل">✏️</button> ' +
                '<button type="button" class="icon-btn icon-del btn-del-cust" data-id="' + c.id + '"' + (readOnlyMode ? ' disabled' : '') + ' title="حذف">🗑️</button>' +
              '</td></tr>';
          }).join('') : '<tr><td colspan="12" style="text-align:center;color:var(--ink-soft);padding:28px;">لا عملاء — اضغط «+ عميل» للبدء</td></tr>'}
        </tbody>
      </table></div>
      ${typeof tablePagerHtml === 'function' ? tablePagerHtml('clients.customers', pg) : ''}
    </div>`;
}

function renderClientCustomerDetail(id){
  const c = clCustomerById(id);
  if(!c){ customerFilters.detailId = ''; return renderClientsCustomersPage(); }

  const contacts = c.contacts || [];
  const projects = clProjectsOfCustomer(c);
  const f = function(ico, k, v){ return '<div class="pd-f"><span class="pd-f-ico">' + ico + '</span><div><em>' + k + '</em><b>' + (v || '—') + '</b></div></div>'; };
  const e = escapeHtml;
  const issues = typeof customerNotesIssues === 'function' ? customerNotesIssues(c) : [];

  const tile = function(n, l){ return '<div class="stat-card"><div class="num">' + n + '</div><div class="lbl">' + l + '</div></div>'; };

  return `
    <div class="page eq-detail-page person-detail-page">
      <div class="eq-detail-head">
        <div>
          <button type="button" class="btn btn-outline btn-sm" id="custBack">← رجوع للقائمة</button>
          <h2 class="page-title" style="margin:8px 0 0;">${e(c.name)} <span style="font-size:14px;color:var(--ink-soft);">${e(c.code || '')}</span></h2>
          <p class="page-sub" style="margin:4px 0 0;">عميل${c.department ? ' · ' + e(c.department) : ''}</p>
        </div>
        <div class="eq-detail-actions btn-row">
          <button class="btn btn-primary" id="custEditFromDetail">تعديل البيانات</button>
        </div>
      </div>

      <section class="settings-card pd-info">
        <div class="pd-info-head"><span class="pd-avatar">${e(String(c.name || '؟').trim().charAt(0))}</span>
          <div><div class="pd-name">${e(c.name || '')}</div>
            <div class="pd-meta"><span class="pd-chip">عميل</span><span class="pd-chip">${e(c.code || '—')}</span>${c.department ? '<span class="pd-chip">' + e(c.department) + '</span>' : ''}${c.city ? '<span class="pd-chip">' + e(c.city) + '</span>' : ''}</div></div></div>
        <div class="pd-info-cols">
          <div class="pd-col"><h5>👤 بيانات العميل</h5>${f('📞', 'الهاتف', e(c.phone || ''))}${f('✉️', 'البريد', e(c.email || ''))}${f('📍', 'العنوان', e(c.address || ''))}${f('🏙️', 'المدينة', e(c.city || ''))}</div>
          <div class="pd-col"><h5>🏢 بيانات إدارية</h5>${f('🗂️', 'القسم', e(c.department || ''))}${f('🏷️', 'التصنيف', e(c.category || ''))}${f('🧾', 'الرقم الضريبي', e(c.taxId || ''))}${f('💰', 'رصيد افتتاحي', fmtMoney(c.openingBalance || 0))}</div>
          <div class="pd-col"><h5>📊 ملخص</h5>${f('🏗️', 'المشاريع', String(projects.length))}${f('📄', 'العقود / المستخلصات', (c.contracts || []).length + ' / ' + (c.invoices || []).length)}${f('📐', 'أعمال الحصر', String((c.workSurveys || []).length))}${f('📋', 'المقايسات', String((c.boqs || []).length))}</div>
        </div>
      </section>

      <div class="stats-row" style="margin-bottom:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;">
        ${tile(projects.length, 'مشاريع')}${tile((c.contracts || []).length, 'عقود')}${tile((c.invoices || []).length, 'مستخلصات')}${tile((c.collections || []).length, 'تحصيلات')}${tile((c.workSurveys || []).length, 'أعمال الحصر')}${tile((c.boqs || []).length, 'المقايسات')}${tile(contacts.length, 'جهات اتصال')}
      </div>

      <div class="pd-grid2">
        <div class="settings-card">
          <div class="pd-card-h">📝 الملاحظات</div>
          ${c.notes ? '<div style="white-space:pre-wrap;">' + e(c.notes) + '</div>' : '<div class="pn-empty">لا ملاحظات</div>'}
          ${issues.length ? '<div class="pn-list" style="margin-top:8px;">' + issues.map(function(i){ return '<div class="pn-item"><span class="pn-dot">•</span><span class="pn-txt">' + e(i) + '</span></div>'; }).join('') + '</div>' : ''}
        </div>
        <div class="settings-card">
          <div class="pd-card-h">👥 جهات الاتصال</div>
          ${contacts.length ? '<table class="data-table"><thead><tr><th>الاسم</th><th>المسمى</th><th>الهاتف</th><th>البريد</th></tr></thead><tbody>' +
            contacts.map(function(ct){
              return '<tr><td>' + e(ct.name || '') + '</td><td>' + e(ct.title || '') + '</td><td>' + e(ct.phone || '') + '</td><td>' + e(ct.email || '') + '</td></tr>';
            }).join('') + '</tbody></table>'
            : '<div class="pn-empty">لا جهات اتصال</div>'}
        </div>
      </div>

      <div class="settings-card" style="margin-bottom:14px;">
        <div class="pd-card-h">🏗️ المشاريع <button type="button" class="btn btn-primary btn-sm" id="custAddProject" ${readOnlyMode ? 'disabled' : ''}>+ مشروع</button></div>
        ${projects.length ? '<table class="data-table"><thead><tr><th>الكود</th><th>الاسم</th><th>المرحلة</th><th>التقدم</th><th>القيمة</th><th></th></tr></thead><tbody>' +
          projects.map(function(p){
            const stage = (typeof projectStageBadge === 'function') ? projectStageBadge(p.status) : e(p.status || '');
            return '<tr><td>' + e(p.code || '') + '</td><td><strong>' + e(p.name || '') + '</strong></td><td>' + stage + '</td><td>' +
              (p.progress != null && p.progress !== '' ? e(String(p.progress)) + '%' : '—') + '</td><td>' + fmtMoney(p.value || 0) + '</td>' +
              '<td style="white-space:nowrap;"><button type="button" class="icon-btn cust-open-proj" data-id="' + e(p.id) + '" title="فتح المشروع">👁️</button> ' +
              '<button type="button" class="icon-btn cust-edit-proj" data-id="' + e(p.id) + '" title="تعديل">✏️</button></td></tr>';
          }).join('') + '</tbody></table>'
          : '<div class="pn-empty">لا مشاريع مرتبطة بهذا العميل — اضغط «+ مشروع»</div>'}
      </div>
      ${typeof clChangeOrdersSectionHtml === 'function' ? clChangeOrdersSectionHtml(c.id, '') : ''}
      ${typeof clGuaranteesSectionHtml === 'function' ? clGuaranteesSectionHtml(c.id, '') : ''}
    </div>`;
}

function initClientsCustomersEvents(){
  if(customerFilters.detailId){
    document.getElementById('custBack')?.addEventListener('click', function(){
      customerFilters.detailId = '';
      rerenderCurrentPage();
    });
    document.getElementById('custEditFromDetail')?.addEventListener('click', function(){
      openCustomerModal(customerFilters.detailId);
    });
    if(typeof initGuaranteeSections === 'function') initGuaranteeSections();
    if(typeof initChangeOrderSections === 'function') initChangeOrderSections();
    document.getElementById('custAddProject')?.addEventListener('click', function(){
      openProjectModal('', customerFilters.detailId);
    });
    document.querySelectorAll('.cust-edit-proj').forEach(function(b){
      b.addEventListener('click', function(){ openProjectModal(b.getAttribute('data-id')); });
    });
    document.querySelectorAll('.cust-open-proj').forEach(function(b){
      b.addEventListener('click', function(){
        if(typeof projectFilters !== 'undefined') projectFilters.detailId = b.getAttribute('data-id');
        if(typeof goToPage === 'function') goToPage('projects');
      });
    });
    return;
  }

  document.getElementById('custSearch')?.addEventListener('input', function(e){
    customerFilters.q = e.target.value;
    clearTimeout(window.__custQT);
    window.__custQT = setTimeout(function(){
      if(typeof resetTablePage === 'function') resetTablePage('clients.customers');
      rerenderCurrentPage();
    }, 220);
  });
  [['custDept','dept'],['custProject','project'],['custInvoice','invoice'],['custSurvey','survey']].forEach(function(p){
    document.getElementById(p[0])?.addEventListener('change', function(e){
      customerFilters[p[1]] = e.target.value;
      if(typeof resetTablePage === 'function') resetTablePage('clients.customers');
      rerenderCurrentPage();
    });
  });
  document.getElementById('custClear')?.addEventListener('click', function(){
    customerFilters.q = '';
    customerFilters.seg = ''; customerFilters.dept = ''; customerFilters.project = ''; customerFilters.invoice = ''; customerFilters.survey = '';
    if(typeof resetTablePage === 'function') resetTablePage('clients.customers');
    rerenderCurrentPage();
  });
  document.getElementById('btnAddCustomer')?.addEventListener('click', function(){ openCustomerModal(); });
  document.querySelectorAll('.btn-view-cust').forEach(function(b){
    b.addEventListener('click', function(){
      customerFilters.detailId = b.getAttribute('data-id');
      rerenderCurrentPage();
    });
  });
  document.querySelectorAll('.btn-edit-cust').forEach(function(b){
    b.addEventListener('click', function(){ openCustomerModal(b.getAttribute('data-id')); });
  });
  document.querySelectorAll('.btn-del-cust').forEach(function(b){
    b.addEventListener('click', function(){
      const id = b.getAttribute('data-id');
      const c = clCustomerById(id);
      const msg = c ? ('حذف العميل «' + c.name + '» وكل بياناته المرتبطة؟') : 'حذف العميل؟';
      (typeof confirmDelete === 'function' ? confirmDelete(msg) : Promise.resolve(confirm(msg))).then(function(ok){
        if(!ok) return;
        clDeleteCustomer(id);
        showToast('تم حذف العميل');
        rerenderCurrentPage();
      });
    });
  });
}

function openCustomerModal(editId){
  const c = editId ? clCustomerById(editId) : null;
  const contacts = (c && c.contacts) ? c.contacts.slice() : [];
  const formAttId = c ? c.id : (typeof uid==='function' ? uid() : ('cus_' + Date.now().toString(36)));
  if(!c && typeof ensureFormDraft==='function') ensureFormDraft('customer', formAttId);

  function contactsHtml(){
    if(!contacts.length) return '<div style="color:var(--ink-soft);font-size:13px;">لا جهات اتصال — أضف من الزر بالأسفل</div>';
    return contacts.map(function(ct, i){
      return '<div class="form-grid form-grid-2" style="border:1px solid var(--line);border-radius:8px;padding:8px;margin-bottom:8px;" data-ci="' + i + '">' +
        '<label>الاسم<input class="input ct-name" value="' + escapeHtml(ct.name || '') + '"></label>' +
        '<label>المسمى<input class="input ct-title" value="' + escapeHtml(ct.title || '') + '"></label>' +
        '<label>الهاتف<input class="input ct-phone" value="' + escapeHtml(ct.phone || '') + '"></label>' +
        '<label>البريد<input class="input ct-email" value="' + escapeHtml(ct.email || '') + '"></label>' +
        '<div style="grid-column:1/-1;text-align:left;"><button type="button" class="btn btn-outline btn-sm ct-remove" data-i="' + i + '">حذف جهة الاتصال</button></div>' +
      '</div>';
    }).join('');
  }

  openModal(`
    <div class="modal-header">
      <h3>${c ? 'تعديل عميل' : 'عميل جديد'}</h3>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-grid form-grid-2">
        <label>الكود
          <input class="input" id="cuCode" value="${escapeHtml(c && c.code || clNextCustomerCode())}" placeholder="تلقائي">
        </label>
        <label>الاسم *
          <input class="input" id="cuName" value="${escapeHtml(c && c.name || '')}">
        </label>
        <label>الهاتف
          <input class="input" id="cuPhone" value="${escapeHtml(c && c.phone || '')}">
        </label>
        <label>البريد
          <input class="input" id="cuEmail" value="${escapeHtml(c && c.email || '')}">
        </label>
        <label>المدينة
          <input class="input" id="cuCity" value="${escapeHtml(c && c.city || '')}">
        </label>
        <label>التصنيف
          <select class="input" id="cuCategory">${(function(){ const cur = (c && c.category) || ''; const base = ['حكومى','خاص']; const norm = function(x){ return String(x||'').replace(/[يى]/g,'ي'); }; let curOpt = base.find(function(b){ return norm(b) === norm(cur) || (norm(cur)==='حكومي' && b==='حكومى'); }) || cur; const opts = base.slice(); if(curOpt && opts.indexOf(curOpt) < 0) opts.push(curOpt); return '<option value="">— اختر —</option>' + opts.map(function(o){ return '<option value="' + escapeHtml(o) + '"' + (o === curOpt ? ' selected' : '') + '>' + escapeHtml(o) + '</option>'; }).join(''); })()}</select>
        </label>
        <label>الرقم الضريبي
          <input class="input" id="cuTaxId" value="${escapeHtml(c && c.taxId || '')}">
        </label>
        <label>القسم
          <select class="input" id="cuDept">${(function(){ const cur = (c && c.department) || ''; const ds = _custDepts(); if(cur && ds.indexOf(cur) < 0) ds.push(cur); return '<option value="">— اختر القسم —</option>' + ds.map(function(d){ return '<option value="' + escapeHtml(d) + '"' + (d === cur ? ' selected' : '') + '>' + escapeHtml(d) + '</option>'; }).join('') + '<option value="__new__">➕ قسم جديد…</option>'; })()}</select>
        </label>
        <label>رصيد افتتاحي (ج.م)
          <input class="input" id="cuOpening" type="number" step="0.01" value="${c ? toInt(c.openingBalance) : 0}">
        </label>
        <label style="grid-column:1/-1;">العنوان
          <input class="input" id="cuAddress" value="${escapeHtml(c && c.address || '')}">
        </label>
        <div id="cuContactsWrap" style="grid-column:1/-1;order:8800;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong>جهات الاتصال</strong>
          <button type="button" class="btn btn-sm" id="cuAddContact" style="background:#1B4332;color:#fff;border-color:#1B4332;">+ جهة اتصال</button>
        </div>
        <div id="cuContactsBox">${contactsHtml()}</div>
      </div>
        <label style="grid-column:1/-1;">ملاحظات
          <textarea class="input" id="cuNotes" rows="2">${escapeHtml(c && c.notes || '')}</textarea>
        </label>
        ${typeof formAttachmentsBlockHtml==='function'?formAttachmentsBlockHtml('customer', formAttId, c?(c.attachments||c.docs||[]):[]):''}
      </div>

    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="btnSaveCustomer">حفظ</button>
    </div>
  `);

  function rebindContactRemove(){
    document.querySelectorAll('.ct-remove').forEach(function(btn){
      btn.onclick = function(){
        const i = parseInt(btn.getAttribute('data-i'), 10);
        contacts.splice(i, 1);
        document.getElementById('cuContactsBox').innerHTML = contactsHtml();
        rebindContactRemove();
      };
    });
  }
  rebindContactRemove();

  (function(){
    const ds = document.getElementById('cuDept'); if(!ds) return;
    ds.addEventListener('change', function(){
      if(ds.value !== '__new__') return;
      const inp = document.createElement('input'); inp.className = 'input'; inp.id = 'cuDept'; inp.placeholder = 'اكتب اسم القسم الجديد'; inp.value = '';
      ds.replaceWith(inp); inp.focus();
    });
  })();
  document.getElementById('cuAddContact').onclick = function(){
    contacts.push({ name: '', title: '', phone: '', email: '' });
    document.getElementById('cuContactsBox').innerHTML = contactsHtml();
    rebindContactRemove();
  };

  clMountCustomFields('clCustomers', c);
  if(typeof bindAttachmentHandlers==='function') bindAttachmentHandlers(document.getElementById('appModal'));
  document.getElementById('btnSaveCustomer').onclick = function(){
    const name = (document.getElementById('cuName').value || '').trim();
    if(!name){ showToast('اسم العميل مطلوب'); return; }

    // جمع جهات الاتصال من الحقول
    const contactNodes = document.querySelectorAll('#cuContactsBox [data-ci]');
    const finalContacts = [];
    contactNodes.forEach(function(box){
      const n = (box.querySelector('.ct-name')?.value || '').trim();
      if(!n) return;
      finalContacts.push({
        name: n,
        title: (box.querySelector('.ct-title')?.value || '').trim(),
        phone: (box.querySelector('.ct-phone')?.value || '').trim(),
        email: (box.querySelector('.ct-email')?.value || '').trim()
      });
    });

    const now = new Date().toISOString();
    const rec = {
      id: formAttId,
      code: (document.getElementById('cuCode').value || '').trim() || clNextCustomerCode(),
      name: name,
      phone: (document.getElementById('cuPhone').value || '').trim(),
      email: (document.getElementById('cuEmail').value || '').trim(),
      city: (document.getElementById('cuCity').value || '').trim(),
      category: (document.getElementById('cuCategory').value || '').trim(),
      taxId: (document.getElementById('cuTaxId').value || '').trim(),
      department: (document.getElementById('cuDept').value || '').trim(),
      status: (c && c.status) || 'active',
      openingBalance: toInt(document.getElementById('cuOpening').value),
      address: (document.getElementById('cuAddress').value || '').trim(),
      notes: (document.getElementById('cuNotes').value || '').trim(),
      contacts: finalContacts,
      projects: [],   // المشاريع في DATA.projects (المصدر الموحّد)
      contracts: c ? (c.contracts || []) : [],
      invoices: c ? (c.invoices || []) : [],
      collections: c ? (c.collections || []) : [],
      workSurveys: c ? (c.workSurveys || []) : [],
      boqs: c ? (c.boqs || []) : [],
      guarantees: c ? (c.guarantees || []) : [],
      ledger: c ? (c.ledger || []) : [],
      comms: c ? (c.comms || []) : [],
      opportunities: c ? (c.opportunities || []) : [],
      attachments: c ? (c.attachments || c.docs || []) : (typeof takeFormDraftAttachments==='function' ? takeFormDraftAttachments('customer', formAttId) : []),
      docs: c ? (c.attachments || c.docs || []) : [],
      extraFields: clCollectCustomFields('clCustomers', c),
      createdAt: c && c.createdAt ? c.createdAt : now,
      updatedAt: now
    };

    clUpsertCustomer(rec);
    closeModal();
    showToast(c ? 'تم تحديث العميل' : 'تم إضافة العميل');
    rerenderCurrentPage();
  };
}
