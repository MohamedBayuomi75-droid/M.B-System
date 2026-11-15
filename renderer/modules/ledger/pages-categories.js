/* (الموحّد) مولَّد بالـ codemod من دفتر الموردين — pages-categories.js — الملف ده بقى مصدر الحقيقة، عدّل فيه مباشرة */
/* ---------------- إدارة الاقتراحات ---------------- */

function renderCategoriesPage(){
  if(typeof window.activeSuggestTab === 'undefined' || !window.activeSuggestTab)
    window.activeSuggestTab = 'categories';
  if(typeof window.suggestSupplierId === 'undefined') window.suggestSupplierId = '';
  if(typeof window.suggestManageQ === 'undefined') window.suggestManageQ = '';

  const tab = window.activeSuggestTab || 'categories';
  const canAdd = typeof hasPagePermission!=='function' || hasPagePermission("ledger.categories",'add');
  const canEdit = typeof hasPagePermission!=='function' || hasPagePermission("ledger.categories",'edit');
  const canDel = typeof hasPagePermission!=='function' || hasPagePermission("ledger.categories",'delete');

  const tabsHtml = `
    <div class="btn-row" style="margin-bottom:14px;flex-wrap:wrap;gap:6px;">
      <button type="button" class="btn btn-sm ${tab==='categories'?'btn-gold':'btn-outline'}" data-suggest-tab="categories">التصنيفات</button>
      <button type="button" class="btn btn-sm ${tab==='projects'?'btn-gold':'btn-outline'}" data-suggest-tab="projects">المشاريع</button>
      <button type="button" class="btn btn-sm ${tab==='supplierItems'?'btn-gold':'btn-outline'}" data-suggest-tab="supplierItems">اقتراحات أكواد وأصناف الموردين</button>
    </div>`;

  if(tab === 'supplierItems'){
    return renderSupplierItemsSuggestTab(canAdd, canEdit, canDel, tabsHtml);
  }
  if(tab === 'projects'){
    return renderProjectsSuggestTab(canAdd, canEdit, canDel, tabsHtml);
  }
  return renderCategoriesSuggestTab(canAdd, canEdit, canDel, tabsHtml);
}

function renderCategoriesSuggestTab(canAdd, canEdit, canDel, tabsHtml){
  const cats = allCategories();
  const catData = cats.map(c=>{
    const invs = DATA.ledger.invoices.filter(i=>i.category===c);
    const total = invs.reduce((a,b)=>a+Number(b.netInvoice||0),0);
    return { name:c, count: invs.length, total };
  });
  if(typeof activeCategory!=='undefined' && activeCategory && !cats.includes(activeCategory)) activeCategory = null;

  let detail = '';
  if(typeof activeCategory!=='undefined' && activeCategory){
    const rows = DATA.ledger.invoices.filter(i=>i.category===activeCategory).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    const pg = lgPaginateRows(rows, 'categories');
    detail = `
      <div class="section-title">فواتير تصنيف: ${lgEscapeHtml(activeCategory)}</div>
      <div class="table-wrap"><table>
        <thead>${invoiceTableTheadHtml()}</thead>
        <tbody>
          ${pg.pageRows.length? pg.pageRows.map(r=> invoiceTableRowHtml(r)).join('') : `<tr><td colspan="${invoiceTableColspan()}" class="table-empty">لا فواتير</td></tr>`}
        </tbody>
      </table></div>
      ${lgTablePagerHtml('categories', pg)}
    `;
  }

  return `
    <h2 class="page-title">إدارة الاقتراحات</h2>
    <p class="page-sub">إدارة التصنيفات والمشاريع واقتراحات أصناف وأكواد كل مورد</p>
    ${tabsHtml}
    <div class="btn-row" style="margin-bottom:16px;">
      ${canAdd ? `<input class="search-box" id="newCategoryInput" placeholder="اسم تصنيف جديد..." style="max-width:220px;" />
      <button class="btn btn-gold btn-sm" id="addCategoryBtn">+ إضافة تصنيف</button>` : ''}
      <button class="btn btn-outline btn-sm" id="exportCategoriesExcelBtn">تصدير Excel (الظاهر)</button>
    </div>
    ${cats.length===0?`<div class="table-empty">لا توجد تصنيفات بعد</div>`:
      `<div class="cat-grid">
        ${catData.map(c=>`
          <div class="cat-card" data-cat="${lgEscapeHtml(c.name)}">
            ${canDel ? `<span class="cat-del" data-del-cat="${lgEscapeHtml(c.name)}" title="حذف التصنيف">✕</span>` : ''}
            <div class="cname">${lgEscapeHtml(c.name)}</div>
            <div class="cinfo"><span>${c.count} فاتورة</span><span>${fmt(c.total)}</span></div>
          </div>
        `).join('')}
      </div>`
    }
    ${detail}
  `;
}

function renderProjectsSuggestTab(canAdd, canEdit, canDel, tabsHtml){
  if(!Array.isArray(DATA.ledger.customProjects)) DATA.ledger.customProjects = [];
  if(!Array.isArray(DATA.ledger.hiddenProjects)) DATA.ledger.hiddenProjects = [];
  const hidden = new Set(DATA.ledger.hiddenProjects||[]);
  const set = new Set();
  (DATA.ledger.customProjects||[]).forEach(c=>{ if(c && !hidden.has(c)) set.add(c); });
  (DATA.ledger.invoices||[]).forEach(i=>{ if(i.project && !hidden.has(i.project)) set.add(i.project); });
  const projects = Array.from(set).sort((a,b)=>a.localeCompare(b,'ar'));
  const qTokens = searchTokens(window.suggestManageQ);
  const filtered = qTokens.length ? projects.filter(p=>searchHas(searchNorm(p), qTokens)) : projects;

  return `
    <h2 class="page-title">إدارة الاقتراحات</h2>
    <p class="page-sub">مشاريع الفواتير — إضافة وتعديل وحذف</p>
    ${tabsHtml}
    <div class="btn-row" style="margin-bottom:14px;flex-wrap:wrap;gap:8px;">
      ${canAdd ? `<input class="search-box" id="newProjectInput" placeholder="اسم مشروع جديد..." style="max-width:220px;" />
      <button class="btn btn-gold btn-sm" id="addProjectBtn">+ إضافة مشروع</button>` : ''}
      <input class="search-box" id="suggestSearchBox" placeholder="بحث..." value="${lgEscapeHtml(window.suggestManageQ||'')}" style="max-width:200px;" />
      <span style="font-size:12.5px;color:var(--ink-soft);font-weight:700;">${filtered.length} مشروع</span>
    </div>
    ${filtered.length===0?`<div class="table-empty">لا مشاريع بعد</div>`:`
      <div class="table-wrap"><table>
        <thead><tr><th>المشروع</th><th>عدد الفواتير</th><th>إجراءات</th></tr></thead>
        <tbody>
          ${filtered.map(name=>{
            const cnt = (DATA.ledger.invoices||[]).filter(i=>i.project===name).length;
            return `<tr>
              <td style="font-weight:800;">${lgEscapeHtml(name)}</td>
              <td>${cnt}</td>
              <td>
                ${canEdit?`<button type="button" class="btn btn-outline btn-sm" data-edit-project="${lgEscapeHtml(name)}">تعديل</button>`:''}
                ${canDel?`<button type="button" class="btn btn-outline btn-sm" data-del-project="${lgEscapeHtml(name)}" style="color:var(--debt);">حذف</button>`:''}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>`}
  `;
}

function renderSupplierItemsSuggestTab(canAdd, canEdit, canDel, tabsHtml){
  if(typeof ensureCustomLinkedItems==='function') ensureCustomLinkedItems();
  else if(!Array.isArray(DATA.ledger.customLinkedItems)) DATA.ledger.customLinkedItems = [];

  const sid = window.suggestSupplierId || '';
  const sup = sid && typeof supplierById==='function' ? supplierById(sid) : null;
  const q = searchTokens(window.suggestManageQ);

  let rows = [];
  if(sid){
    const linked = (typeof linkedItemsForSupplier==='function')
      ? linkedItemsForSupplier(sid)
      : (DATA.ledger.customLinkedItems||[]).filter(x=>x && String(x.supplierId||'')===sid);
    linked.forEach(li=>{
      rows.push({
        id: li.id,
        source: 'محفوظ',
        desc: li.desc||'',
        supplierCode: li.supplierCode||'',
        internalCode: li.internalCode||'',
        itemDescription: li.itemDescription||'',
        unitPrice: li.unitPrice||'',
        editable: true
      });
    });
    const maps = typeof buildItemLinkMaps==='function' ? buildItemLinkMaps(sid) : null;
    if(maps && maps.byDesc){
      maps.byDesc.forEach((info, desc)=>{
        const exists = rows.some(r=>
          r.desc===desc &&
          r.supplierCode===(info.supplierCode||'') &&
          r.internalCode===(info.internalCode||'')
        );
        if(!exists && (desc || info.supplierCode || info.internalCode)){
          rows.push({
            id: null,
            source: 'من الفواتير',
            desc: desc||'',
            supplierCode: info.supplierCode||'',
            internalCode: info.internalCode||'',
            itemDescription: info.itemDescription||'',
            unitPrice: info.unitPrice||'',
            editable: false
          });
        }
      });
    }
  }
  if(q.length){
    rows = rows.filter(r=>searchHas(searchNorm([r.desc,r.supplierCode,r.internalCode,r.itemDescription].join(' ')), q));
  }

  return `
    <h2 class="page-title">إدارة الاقتراحات</h2>
    <p class="page-sub">اقتراحات أكواد وأصناف لكل مورد — مربوطة بحقول الفاتورة والمرتجع (الصنف / كود المورد / الكود الداخلي / الوصف)</p>
    ${tabsHtml}

    <div class="card" style="padding:14px 16px;margin-bottom:14px;background:var(--card);border:1px solid var(--line);border-radius:12px;">
      <div class="btn-row" style="flex-wrap:wrap;gap:10px;align-items:end;margin:0;">
        <div class="field" style="min-width:280px;flex:1;margin:0;">
          <label>اختر المورد *</label>
          <div class="ss-cell ss-cell-wide">
            <input type="text" id="suggestSupplierName" class="supplier-select-wide" placeholder="ابحث أو اكتب اسم المورد..." autocomplete="off"
              value="${lgEscapeHtml(sup?sup.name||'':'')}" data-combo-id="${lgEscapeHtml(sid)}" />
            <input type="hidden" id="suggestSupplierId" value="${lgEscapeHtml(sid)}" />
          </div>
        </div>
        ${canAdd && sid ? `<button type="button" class="btn btn-gold btn-sm" id="addLinkedItemBtn">＋ إضافة صنف / أكواد للمورد</button>` : ''}
        <input class="search-box" id="suggestSearchBox" placeholder="بحث في اقتراحات المورد..." value="${lgEscapeHtml(window.suggestManageQ||'')}" style="max-width:200px;${sid?'':'display:none'}" />
      </div>
    </div>

    ${!sid ? `<div class="table-empty">اختر المورد من الأعلى لعرض وإدارة اقتراحات الأصناف والأكواد الخاصة به</div>` : `
      <div class="section-title" style="margin-top:4px;">اقتراحات: ${lgEscapeHtml(sup?sup.name:'المورد')} (${rows.length})</div>
      ${rows.length===0 ? `<div class="table-empty">لا اقتراحات لهذا المورد بعد — أضف صنف مربوط أو سجّل فاتورة له</div>` : `
        <div class="table-wrap"><table>
          <thead><tr>
            <th>الصنف</th>
            <th>كود المورد</th>
            <th>الكود الداخلي</th>
            <th>الوصف</th>
            <th>سعر الوحدة</th>
            <th>المصدر</th>
            <th style="width:140px;">إجراءات</th>
          </tr></thead>
          <tbody>
            ${rows.map(r=>`
              <tr>
                <td style="font-weight:800;">${lgEscapeHtml(r.desc||'—')}</td>
                <td style="direction:ltr;text-align:right;">${lgEscapeHtml(r.supplierCode||'—')}</td>
                <td style="direction:ltr;text-align:right;">${lgEscapeHtml(r.internalCode||'—')}</td>
                <td>${lgEscapeHtml(r.itemDescription||'—')}</td>
                <td>${lgEscapeHtml(fmtText(r.unitPrice)||'—')}</td>
                <td style="font-size:12px;color:var(--ink-soft);">${lgEscapeHtml(r.source)}</td>
                <td>
                  <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    ${r.editable && canEdit ? `<button type="button" class="btn btn-outline btn-sm" data-edit-linked="${lgEscapeHtml(r.id)}">تعديل</button>` : ''}
                    ${r.editable && canDel ? `<button type="button" class="btn btn-outline btn-sm" data-del-linked="${lgEscapeHtml(r.id)}" style="color:var(--debt);">حذف</button>` : ''}
                    ${!r.editable && canAdd ? `<button type="button" class="btn btn-outline btn-sm" data-promote-linked="${lgEscapeHtml(r.desc)}|${lgEscapeHtml(r.supplierCode)}|${lgEscapeHtml(r.internalCode)}|${lgEscapeHtml(r.itemDescription)}|${lgEscapeHtml(r.unitPrice)}">حفظ كاقتراح</button>` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
      `}
    `}
  `;
}

function openLinkedItemModal(editId, prefill){
  if(typeof ensureCustomLinkedItems==='function') ensureCustomLinkedItems();
  const existing = editId ? (DATA.ledger.customLinkedItems||[]).find(x=>x && x.id===editId) : null;
  const sid0 = (existing && existing.supplierId) || window.suggestSupplierId || (prefill && prefill.supplierId) || '';
  const sup0 = sid0 && typeof supplierById==='function' ? supplierById(sid0) : null;
  const pf = existing || prefill || {};

  const overlay = lgEl(`
    <div class="modal-overlay">
      <div class="modal" style="max-width:560px;">
        <h3>${existing ? 'تعديل اقتراح صنف' : 'إضافة اقتراح صنف للمورد'}</h3>
        <p class="page-sub" style="margin-top:0;">الصنف والأكواد والوصف مربوطين مع بعض — هيظهروا في فاتورة/مرتجع هذا المورد فقط</p>
        <div class="form-grid cols2">
          <div class="field" style="grid-column:1/-1;">
            <label>المورد *</label>
            <div class="ss-cell ss-cell-wide">
              <input id="li_supplier_name" type="text" placeholder="اختر المورد..." autocomplete="off"
                value="${lgEscapeHtml(sup0?sup0.name||'':'')}" data-combo-id="${lgEscapeHtml(sid0)}" />
              <input type="hidden" id="li_supplierId" value="${lgEscapeHtml(sid0)}" />
            </div>
          </div>
          <div class="field" style="grid-column:1/-1;">
            <label>اسم الصنف</label>
            <input id="li_desc" type="text" value="${lgEscapeHtml(pf.desc||'')}" placeholder="اسم الصنف" autocomplete="off" />
          </div>
          <div class="field">
            <label>كود المورد</label>
            <input id="li_supplierCode" type="text" value="${lgEscapeHtml(pf.supplierCode||'')}" placeholder="كود عند المورد" autocomplete="off" />
          </div>
          <div class="field">
            <label>الكود الداخلي</label>
            <input id="li_internalCode" type="text" value="${lgEscapeHtml(pf.internalCode||'')}" placeholder="الكود الداخلي" autocomplete="off" />
          </div>
          <div class="field" style="grid-column:1/-1;">
            <label>وصف الصنف</label>
            <input id="li_itemDescription" type="text" value="${lgEscapeHtml(pf.itemDescription||'')}" placeholder="الوصف" autocomplete="off" />
          </div>
          <div class="field">
            <label>سعر الوحدة (اختياري)</label>
            <input id="li_unitPrice" type="text" inputmode="decimal" data-money="pos" dir="ltr" style="text-align:right;" value="${lgEscapeHtml(fmtInputText(pf.unitPrice||''))}" placeholder="٠.٠٠" autocomplete="off" />
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" id="li_cancel">إلغاء</button>
          <button class="btn btn-primary" id="li_save">حفظ</button>
        </div>
      </div>
    </div>`);
  document.body.appendChild(overlay);
  const close = ()=>{ try{ overlay.remove(); }catch(e){} };
  overlay.querySelector('#li_cancel').addEventListener('click', close);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) close(); });

  const nameEl = overlay.querySelector('#li_supplier_name');
  const hidEl = overlay.querySelector('#li_supplierId');
  if(nameEl && typeof attachSmartCombo==='function'){
    attachSmartCombo(nameEl, {
      getItems: ()=> typeof getSupplierComboItems==='function' ? getSupplierComboItems() : (DATA.ledger.suppliers||[]).map(s=>({id:s.id,value:s.name,label:s.name})),
      allowFreeText: false, clearIdOnType: true, resolveOnBlur: true,
      onSelect: (it)=>{
        const id = it.id || '';
        nameEl.dataset.comboId = id;
        if(hidEl) hidEl.value = id;
      }
    });
  }

  overlay.querySelector('#li_save').addEventListener('click', ()=>{
    if(typeof guardReadOnly==='function' && guardReadOnly('حفظ اقتراح صنف')) return;
    const supplierId = (hidEl && hidEl.value) || (nameEl && nameEl.dataset.comboId) || '';
    const desc = overlay.querySelector('#li_desc').value.trim();
    const supplierCode = overlay.querySelector('#li_supplierCode').value.trim();
    const internalCode = overlay.querySelector('#li_internalCode').value.trim();
    const itemDescription = overlay.querySelector('#li_itemDescription').value.trim();
    const unitPrice = plainMoneyText(overlay.querySelector('#li_unitPrice').value);
    if(!supplierId){ lgShowToast('اختار المورد أولاً'); return; }
    if(!desc && !supplierCode && !internalCode){ lgShowToast('اكتب اسم الصنف أو أحد الأكواد'); return; }
    if(typeof saveCustomLinkedItem==='function'){
      saveCustomLinkedItem({ id: existing?existing.id:undefined, desc, supplierCode, internalCode, itemDescription, unitPrice, supplierId });
    }
    window.suggestSupplierId = supplierId;
    if(typeof saveData==='function') saveData();
    close();
    lgShowToast('تم الحفظ');
    if(typeof lgCurrentPage!=='undefined' && lgCurrentPage==='categories'){
      document.getElementById('pageContent').innerHTML = renderCategoriesPage();
      if(typeof lgAttachPageHandlers==='function') lgAttachPageHandlers();
    }
  });
  setTimeout(()=>{ try{ overlay.querySelector('#li_desc').focus(); }catch(e){} }, 40);
}

function renderSupplierStatementTab(s){
  const from = (statementFilters.supplierId===s.id ? (statementFilters.from||'') : '');
  const to = (statementFilters.supplierId===s.id ? (statementFilters.to||'') : '');
  return `
    <div class="btn-row no-print" style="margin-bottom:14px;align-items:end;flex-wrap:wrap;gap:8px;">
      <div class="field"><label>من تاريخ</label><input type="date" id="supplierStatementFrom" value="${lgEscapeHtml(from)}"></div>
      <div class="field"><label>إلى تاريخ</label><input type="date" id="supplierStatementTo" value="${lgEscapeHtml(to)}"></div>
      <button class="btn btn-gold" id="applySupplierStatementBtn">تحديث الكشف</button>
      <button class="btn btn-outline" id="printSupplierStatementTabBtn">حفظ PDF</button>
      <button class="btn btn-outline" id="clearSupplierStatementDatesBtn">كل الفترة</button>
    </div>
    <div id="supplierStatementLive">${buildAccountStatementHtml(s, from, to)}</div>`;
}
