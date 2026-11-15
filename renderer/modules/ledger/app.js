/* (الموحّد) مولَّد بالـ codemod من دفتر الموردين — app.js — الملف ده بقى مصدر الحقيقة، عدّل فيه مباشرة */


/**
 * ربط خانة بحث "حي" (يفلتر أثناء الكتابة) مع الحفاظ على تركيز المؤشر بعد إعادة رسم الصفحة —
 * نفس الأسلوب المستخدم في بحث الموردين والفواتير، معمّم لباقي الصفحات.
 * @param {string} inputId - معرّف عنصر الـ input
 * @param {(value:string)=>void} applyValue - يحدّث فلتر الصفحة بالقيمة الجديدة (وممكن يعمل setTablePage)
 * @param {()=>void} doRender - يعيد رسم الجزء المتأثر من الصفحة (وتُعاد ربط الأحداث بداخله)
 * @param {number} debounceMs - مهلة الانتظار قبل إعادة الرسم (بالميلي ثانية)
 */
function bindLiveSearchInput(inputId, applyValue, doRender, debounceMs){
  debounceMs = debounceMs || 300;
  const lgEl = document.getElementById(inputId);
  if(!lgEl) return;
  const timerKey = '__liveSearchT_' + inputId;
  const composingKey = '__liveSearchComposing_' + inputId;
  const run = ()=>{
    const pos = lgEl.selectionStart;
    applyValue(lgEl.value || '');
    doRender();
    const newEl = document.getElementById(inputId);
    if(newEl){
      newEl.focus();
      try{ if(typeof pos === 'number') newEl.setSelectionRange(pos, pos); }catch(err){}
    }
  };
  lgEl.addEventListener('compositionstart', ()=>{ window[composingKey] = true; });
  lgEl.addEventListener('compositionend', ()=>{
    window[composingKey] = false;
    clearTimeout(window[timerKey]);
    window[timerKey] = setTimeout(run, Math.min(debounceMs, 150));
  });
  lgEl.addEventListener('input', ()=>{
    if(window[composingKey]) return; // أثناء كتابة عربي عبر IME لا نعيد رسم الصفحة
    clearTimeout(window[timerKey]);
    window[timerKey] = setTimeout(run, debounceMs);
  });
  lgEl.addEventListener('keydown', e=>{
    if(e.key === 'Enter'){
      e.preventDefault();
      clearTimeout(window[timerKey]);
      run();
    }
  });
}

function lgAttachPageHandlers(){
  try{ attachPageFilterControls(); }catch(pfErr){ console.error('attachPageFilterControls error:', pfErr); }
  try{ fitMoneyBlocks(); }catch(fitErr){}
  // ترقيم صفحات موحّد (20 صف لكل صفحة)
  document.querySelectorAll('[data-page-prev]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const k = btn.getAttribute('data-page-prev');
      lgSetTablePage(k, lgGetTablePage(k) - 1);
      if(k==='invoices') invoiceListPage = lgGetTablePage('invoices');
      lgRerenderCurrentPage();
    });
  });
  document.querySelectorAll('[data-page-next]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const k = btn.getAttribute('data-page-next');
      lgSetTablePage(k, lgGetTablePage(k) + 1);
      if(k==='invoices') invoiceListPage = lgGetTablePage('invoices');
      lgRerenderCurrentPage();
    });
  });
  if(lgCurrentPage==='dashboard'){
    const a=document.getElementById('dashAddSupplier'); if(a) a.addEventListener('click', openAddSupplierModal);
    const b=document.getElementById('dashAddInvoice'); if(b) b.addEventListener('click', ()=>openAddEditInvoiceModal());
    const p=document.getElementById('dashAddPayment'); if(p) p.addEventListener('click', ()=>openPaymentModal());
    attachInvoiceRowHandlers();
  }
  if(lgCurrentPage==='suppliers'){
    const sb = document.getElementById('searchBox');
    if(sb){
      const refreshSupList = ()=>{
        searchQuery = sb.value || '';
        const wrap = document.getElementById('supplierListWrap');
        if(wrap){ wrap.innerHTML = renderSupplierList(); attachSupplierListHandlers(); }
        const cnt = document.getElementById('supListCount'); if(cnt) cnt.textContent = supplierListCountText();
      };
      sb.addEventListener('compositionstart', ()=>{ window.__supComposing = true; });
      sb.addEventListener('compositionend', ()=>{ window.__supComposing = false; refreshSupList(); });
      sb.addEventListener('input', ()=>{
        searchQuery = sb.value || '';
        if(window.__supComposing) return;
        clearTimeout(window.__supSearchDebounce);
        window.__supSearchDebounce = setTimeout(refreshSupList, 150);
      });
      sb.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); refreshSupList(); } });
    }
    const supBal = document.getElementById('supBalanceFilter');
    const supSort = document.getElementById('supSortMode');
    const refreshSupFilters = ()=>{
      const wrap = document.getElementById('supplierListWrap');
      if(wrap){ wrap.innerHTML = renderSupplierList(); attachSupplierListHandlers(); }
      const cnt = document.getElementById('supListCount'); if(cnt) cnt.textContent = supplierListCountText();
    };
    if(supBal) supBal.addEventListener('change', ()=>{ supplierBalanceFilter = supBal.value; refreshSupFilters(); });
    if(supSort) supSort.addEventListener('change', ()=>{ supplierSortMode = supSort.value; refreshSupFilters(); });
    const addBtn = document.getElementById('addSupplierBtn'); if(addBtn) addBtn.addEventListener('click', openAddSupplierModal);
    const expAllSup = document.getElementById('exportSuppliersListBtn'); if(expAllSup) expAllSup.addEventListener('click', exportSuppliersCsv);
    attachSupplierListHandlers();
    attachSupplierMainHandlers();
    attachInvoiceRowHandlers();
    attachPaymentRowHandlers();
  }
  if(lgCurrentPage==='invoices' || lgCurrentPage==='returns'){
    const s1 = document.getElementById('invSearchBox');
    if(s1){
      const runInvSearch = ()=>{
        invoiceFilters.q = s1.value || '';
        invoiceListPage = 1; lgSetTablePage('invoices', 1);
        const pos = s1.selectionStart;
        refreshInvoicesPage();
        const newBox = document.getElementById('invSearchBox');
        if(newBox){
          newBox.focus();
          try{ if(typeof pos === 'number') newBox.setSelectionRange(pos, pos); }catch(err){}
        }
      };
      s1.addEventListener('compositionstart', ()=>{ window.__invComposing = true; });
      s1.addEventListener('compositionend', ()=>{
        window.__invComposing = false;
        invoiceFilters.q = s1.value || '';
        clearTimeout(window.__invSearchDebounce);
        window.__invSearchDebounce = setTimeout(runInvSearch, 120);
      });
      s1.addEventListener('input', ()=>{
        invoiceFilters.q = s1.value || '';
        if(window.__invComposing) return; // أثناء كتابة عربي لا نعيد رسم الصفحة
        clearTimeout(window.__invSearchDebounce);
        window.__invSearchDebounce = setTimeout(runInvSearch, 320);
      });
      s1.addEventListener('keydown', e=>{
        if(e.key === 'Enter'){
          e.preventDefault();
          clearTimeout(window.__invSearchDebounce);
          runInvSearch();
        }
      });
    }
    const s2 = document.getElementById('invFilterSupplier');
    const s2n = document.getElementById('invFilterSupplierName');
    if(s2n && typeof attachSmartCombo==='function'){
      attachSmartCombo(s2n, {
        getItems: ()=> [{ id:'', value:'', label:'كل الموردين' }].concat(typeof getSupplierComboItems==='function'?getSupplierComboItems():[]),
        allowFreeText: false, clearIdOnType: true, resolveOnBlur: true, maxItems: 80,
        onSelect: (it)=>{
          const id = it.id || '';
          s2n.dataset.comboId = id;
          if(s2) s2.value = id;
          invoiceFilters.supplierId = id;
          invoiceListPage=1; lgSetTablePage('invoices',1); refreshInvoicesPage();
        }
      });
      s2n.addEventListener('change', ()=>{
        const id = s2n.dataset.comboId||'';
        if(s2) s2.value = id;
        invoiceFilters.supplierId = id;
        invoiceListPage=1; lgSetTablePage('invoices',1); refreshInvoicesPage();
      });
    } else if(s2) s2.addEventListener('change', e=>{ invoiceFilters.supplierId=e.target.value; invoiceListPage=1; lgSetTablePage('invoices',1); refreshInvoicesPage(); });
    const s3 = document.getElementById('invFilterCategory');
    if(s3 && typeof attachSmartCombo==='function'){
      attachSmartCombo(s3, {
        getItems: ()=> [{ value:'', label:'كل التصنيفات' }].concat(typeof getCategoryComboItems==='function'?getCategoryComboItems():[]),
        allowFreeText: true, resolveOnBlur: false,
        onSelect: (it)=>{
          invoiceFilters.category = it.value || '';
          invoiceListPage=1; lgSetTablePage('invoices',1); refreshInvoicesPage();
        }
      });
      s3.addEventListener('change', ()=>{ invoiceFilters.category=s3.value||''; invoiceListPage=1; lgSetTablePage('invoices',1); refreshInvoicesPage(); });
    } else if(s3) s3.addEventListener('change', e=>{ invoiceFilters.category=e.target.value; invoiceListPage=1; lgSetTablePage('invoices',1); refreshInvoicesPage(); });
    const s4 = document.getElementById('invFilterProject');
    if(s4 && typeof attachSmartCombo==='function'){
      attachSmartCombo(s4, {
        getItems: ()=> [{ value:'', label:'كل المشاريع' }].concat(typeof getProjectComboItems==='function'?getProjectComboItems():[]),
        allowFreeText: true, resolveOnBlur: false,
        onSelect: (it)=>{
          invoiceFilters.project = it.value || '';
          invoiceListPage=1; lgSetTablePage('invoices',1); refreshInvoicesPage();
        }
      });
      s4.addEventListener('change', ()=>{ invoiceFilters.project=s4.value||''; invoiceListPage=1; lgSetTablePage('invoices',1); refreshInvoicesPage(); });
    } else if(s4) s4.addEventListener('change', e=>{ invoiceFilters.project=e.target.value; invoiceListPage=1; lgSetTablePage('invoices',1); refreshInvoicesPage(); });
    const yf = document.getElementById('invFilterYear'); if(yf) yf.addEventListener('change', e=>{ invoiceFilters.year=e.target.value; invoiceListPage=1; lgSetTablePage('invoices',1); refreshInvoicesPage(); });
    const s5 = document.getElementById('invFilterFrom'); if(s5) s5.addEventListener('change', e=>{ invoiceFilters.from=e.target.value; invoiceListPage=1; lgSetTablePage('invoices',1); refreshInvoicesPage(); });
    const s6 = document.getElementById('invFilterTo'); if(s6) s6.addEventListener('change', e=>{ invoiceFilters.to=e.target.value; invoiceListPage=1; lgSetTablePage('invoices',1); refreshInvoicesPage(); });
    const s7 = document.getElementById('invClearDates'); if(s7) s7.addEventListener('click', ()=>{ invoiceFilters.from=''; invoiceFilters.to=''; invoiceListPage=1; lgSetTablePage('invoices',1); refreshInvoicesPage(); });
    const ov = document.getElementById('invFilterOverdue'); if(ov) ov.addEventListener('click', ()=>{ invoiceFilters.overdueOnly=!invoiceFilters.overdueOnly; invoiceListPage=1; lgSetTablePage('invoices',1); refreshInvoicesPage(); });
    // ترقيم الصفحات يُدار عامة عبر data-page-prev / data-page-next
    const addI = document.getElementById('openAddInvoiceModalBtnGlobal'); if(addI) addI.addEventListener('click', ()=>openAddEditInvoiceModal());
    const addR = document.getElementById('openAddReturnModalBtn'); if(addR) addR.addEventListener('click', ()=>openAddEditInvoiceModal(null, null, true));
    const exp = document.getElementById('exportAllInvoicesCsv'); if(exp) exp.addEventListener('click', exportAllInvoicesCsv);
    attachInvoiceRowHandlers();
  }
  if(lgCurrentPage==='payments'){
    const b=document.getElementById('openAddPaymentPageBtn'); if(b) b.addEventListener('click',()=>openPaymentModal());
    const e=document.getElementById('exportAllPaymentsPageBtn'); if(e) e.addEventListener('click',exportAllPaymentsCsv);
    const py=document.getElementById('paymentsYearFilter'); if(py) py.addEventListener('change',()=>{ paymentsFilters.year=py.value; lgSetTablePage('payments',1); lgRerenderCurrentPage(); });
    const pSearch=document.getElementById('paymentsSearchBox');
    if(pSearch){
      bindLiveSearchInput('paymentsSearchBox', v=>{ paymentsFilters.q = v; lgSetTablePage('payments',1); }, lgRerenderCurrentPage, 300);
    }
    const fromInp=document.getElementById('paymentsFromInput'); if(fromInp) fromInp.addEventListener('change',()=>{ paymentsFilters.from=fromInp.value; lgRerenderCurrentPage(); });
    const toInp=document.getElementById('paymentsToInput'); if(toInp) toInp.addEventListener('change',()=>{ paymentsFilters.to=toInp.value; lgRerenderCurrentPage(); });
    const clearBtn=document.getElementById('paymentsClearDates'); if(clearBtn) clearBtn.addEventListener('click',()=>{ paymentsFilters.from=''; paymentsFilters.to=''; lgRerenderCurrentPage(); });
    document.querySelectorAll('[data-delpay-global]').forEach(btn=>btn.addEventListener('click',(ev)=>{
      ev.stopPropagation();
      confirmAndSoftDeletePayment(btn.getAttribute('data-delpay-global'));
    }));
    document.querySelectorAll('[data-editpay]').forEach(btn=>btn.addEventListener('click',(ev)=>{
      ev.stopPropagation();
      const id=btn.getAttribute('data-editpay');
      const p=DATA.ledger.payments.find(x=>x.id===id);
      openPaymentModal(p?p.supplierId:null, id);
    }));
    attachPaymentRowHandlers();
  }
  if(lgCurrentPage==='statement'){
    const stSup=document.getElementById('statementSupplier');
    const stSupName=document.getElementById('statementSupplierName');
    if(stSupName && typeof attachSmartCombo==='function'){
      attachSmartCombo(stSupName, {
        getItems: ()=> typeof getSupplierComboItems==='function' ? getSupplierComboItems() : [],
        allowFreeText: false, clearIdOnType: true, resolveOnBlur: true, maxItems: 80,
        onSelect: (it)=>{
          stSupName.dataset.comboId = it.id||'';
          if(stSup) stSup.value = it.id||'';
          statementFilters.supplierId = it.id||'';
        }
      });
    }
    const g=document.getElementById('generateStatementBtn'); if(g) g.addEventListener('click',()=>{
      const hid = document.getElementById('statementSupplier');
      const nm = document.getElementById('statementSupplierName');
      const sid = (nm && nm.dataset.comboId) || (hid && hid.value) || '';
      if(hid) hid.value = sid;
      statementFilters.supplierId=sid;
      statementFilters.from=document.getElementById('statementFrom').value;
      statementFilters.to=document.getElementById('statementTo').value;
      document.getElementById('pageContent').innerHTML=renderStatementPage();
      lgAttachPageHandlers();
    });
    const p=document.getElementById('printStatementPageBtn'); if(p) p.addEventListener('click',printBankStatement);
  }
  if(lgCurrentPage==='categories'){
    document.querySelectorAll('[data-suggest-tab]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        window.activeSuggestTab = btn.getAttribute('data-suggest-tab') || 'categories';
        window.suggestManageQ = '';
        if(window.activeSuggestTab !== 'categories') activeCategory = null;
        document.getElementById('pageContent').innerHTML = renderCategoriesPage();
        lgAttachPageHandlers();
      });
    });
    const addCatBtn = document.getElementById('addCategoryBtn');
    if(addCatBtn) addCatBtn.addEventListener('click', ()=>{
      if(guardReadOnly('إضافة تصنيف')) return;
      const input = document.getElementById('newCategoryInput');
      const name = input.value.trim();
      if(!name){ lgShowToast('اكتب اسم التصنيف'); return; }
      if(!DATA.ledger.customCategories) DATA.ledger.customCategories = [];
      if(!allCategories().includes(name)) DATA.ledger.customCategories.push(name);
      saveData();
      activeCategory = name;
      document.getElementById('pageContent').innerHTML = renderCategoriesPage();
      lgAttachPageHandlers();
      lgShowToast('تم إضافة التصنيف');
    });
    const expCat = document.getElementById('exportCategoriesExcelBtn'); if(expCat) expCat.addEventListener('click', exportCategoriesExcel);
    document.querySelectorAll('.cat-card').forEach(c=>{
      c.addEventListener('click', ()=>{ activeCategory = c.getAttribute('data-cat'); lgResetTablePage('categories'); document.getElementById('pageContent').innerHTML = renderCategoriesPage(); lgAttachPageHandlers(); });
    });
    document.querySelectorAll('[data-del-cat]').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        e.stopPropagation();
        if(guardReadOnly('حذف تصنيف')) return;
        if(typeof hasPagePermission==='function' && !hasPagePermission("ledger.categories",'delete')){ lgShowToast('🔒 ماعندكش صلاحية حذف التصنيفات'); return; }
        const name = btn.getAttribute('data-del-cat');
        const usedCount = DATA.ledger.invoices.filter(i=>i.category===name).length;
        const msg = usedCount>0
          ? `هذا التصنيف مستخدم في ${usedCount} فاتورة. حذفه هيخلي هذه الفواتير بدون تصنيف. هل تريد المتابعة؟`
          : `هل تريد حذف تصنيف "${name}"؟`;
        if(!(await showAppConfirm(msg, { title:'حذف تصنيف', okText:'حذف', cancelText:'إلغاء', danger:true }))) return;
        DATA.ledger.customCategories = (DATA.ledger.customCategories||[]).filter(c=>c!==name);
        if(CATEGORY_SUGGESTIONS.includes(name)){
          DATA.ledger.hiddenSuggestions = DATA.ledger.hiddenSuggestions || [];
          if(!DATA.ledger.hiddenSuggestions.includes(name)) DATA.ledger.hiddenSuggestions.push(name);
        }
        DATA.ledger.invoices.forEach(i=>{ if(i.category===name) i.category=''; });
        if(activeCategory===name) activeCategory = null;
        saveData();
        document.getElementById('pageContent').innerHTML = renderCategoriesPage();
        lgAttachPageHandlers();
        lgShowToast('تم حذف التصنيف');
      });
    });
    // مشاريع
    const addProj = document.getElementById('addProjectBtn');
    if(addProj) addProj.addEventListener('click', ()=>{
      if(guardReadOnly('إضافة مشروع')) return;
      const input = document.getElementById('newProjectInput');
      const name = input && input.value.trim();
      if(!name){ lgShowToast('اكتب اسم المشروع'); return; }
      if(!DATA.ledger.customProjects) DATA.ledger.customProjects = [];
      if(!DATA.ledger.customProjects.includes(name)) DATA.ledger.customProjects.push(name);
      if(Array.isArray(DATA.ledger.hiddenProjects)) DATA.ledger.hiddenProjects = DATA.ledger.hiddenProjects.filter(x=>x!==name);
      saveData();
      document.getElementById('pageContent').innerHTML = renderCategoriesPage();
      lgAttachPageHandlers();
      lgShowToast('تم إضافة المشروع');
    });
    document.querySelectorAll('[data-edit-project]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        if(guardReadOnly('تعديل مشروع')) return;
        const oldName = btn.getAttribute('data-edit-project');
        const neu = await showAppPrompt('الاسم الجديد:', oldName, { title:'تعديل المشروع' });
        if(neu==null) return;
        const n = String(neu).trim();
        if(!n || n===oldName) return;
        if(!DATA.ledger.customProjects) DATA.ledger.customProjects = [];
        const idx = DATA.ledger.customProjects.indexOf(oldName);
        if(idx>=0) DATA.ledger.customProjects[idx]=n; else DATA.ledger.customProjects.push(n);
        DATA.ledger.invoices.forEach(i=>{ if(i.project===oldName) i.project=n; });
        saveData();
        document.getElementById('pageContent').innerHTML = renderCategoriesPage();
        lgAttachPageHandlers();
        lgShowToast('تم التعديل');
      });
    });
    document.querySelectorAll('[data-del-project]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        if(guardReadOnly('حذف مشروع')) return;
        const name = btn.getAttribute('data-del-project');
        if(!(await showAppConfirm('حذف المشروع "'+name+'"؟', { title:'حذف', okText:'حذف', danger:true }))) return;
        DATA.ledger.customProjects = (DATA.ledger.customProjects||[]).filter(x=>x!==name);
        DATA.ledger.hiddenProjects = DATA.ledger.hiddenProjects||[];
        if(!DATA.ledger.hiddenProjects.includes(name)) DATA.ledger.hiddenProjects.push(name);
        DATA.ledger.invoices.forEach(i=>{ if(i.project===name) i.project=''; });
        saveData();
        document.getElementById('pageContent').innerHTML = renderCategoriesPage();
        lgAttachPageHandlers();
        lgShowToast('تم الحذف');
      });
    });
    // اقتراحات أصناف المورد
    const sugName = document.getElementById('suggestSupplierName');
    const sugHid = document.getElementById('suggestSupplierId');
    if(sugName && typeof attachSmartCombo==='function'){
      attachSmartCombo(sugName, {
        getItems: ()=> typeof getSupplierComboItems==='function' ? getSupplierComboItems() : (DATA.ledger.suppliers||[]).map(s=>({id:s.id,value:s.name,label:s.name})),
        allowFreeText: false, clearIdOnType: true, resolveOnBlur: true,
        onSelect: (it)=>{
          const id = it.id||'';
          sugName.dataset.comboId = id;
          if(sugHid) sugHid.value = id;
          window.suggestSupplierId = id;
          window.suggestManageQ = '';
          document.getElementById('pageContent').innerHTML = renderCategoriesPage();
          lgAttachPageHandlers();
        }
      });
    }
    const searchBox = document.getElementById('suggestSearchBox');
    if(searchBox){
      let t=null;
      const apply=()=>{ window.suggestManageQ = searchBox.value||''; document.getElementById('pageContent').innerHTML = renderCategoriesPage(); lgAttachPageHandlers(); const lgEl=document.getElementById('suggestSearchBox'); if(lgEl){ lgEl.focus(); try{ lgEl.setSelectionRange(lgEl.value.length,lgEl.value.length);}catch(e){} } };
      searchBox.addEventListener('input', ()=>{ clearTimeout(t); t=setTimeout(apply, 280); });
      searchBox.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); apply(); } });
    }
    const addLinked = document.getElementById('addLinkedItemBtn');
    if(addLinked) addLinked.addEventListener('click', ()=>{
      if(guardReadOnly('إضافة اقتراح')) return;
      if(typeof openLinkedItemModal==='function') openLinkedItemModal(null);
    });
    document.querySelectorAll('[data-edit-linked]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        if(guardReadOnly('تعديل')) return;
        if(typeof openLinkedItemModal==='function') openLinkedItemModal(btn.getAttribute('data-edit-linked'));
      });
    });
    document.querySelectorAll('[data-del-linked]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        if(guardReadOnly('حذف')) return;
        if(!(await showAppConfirm('حذف هذا الاقتراح؟', { title:'حذف', okText:'حذف', danger:true }))) return;
        if(typeof deleteCustomLinkedItem==='function') deleteCustomLinkedItem(btn.getAttribute('data-del-linked'));
        saveData();
        document.getElementById('pageContent').innerHTML = renderCategoriesPage();
        lgAttachPageHandlers();
        lgShowToast('تم الحذف');
      });
    });
    document.querySelectorAll('[data-promote-linked]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        if(guardReadOnly('حفظ اقتراح')) return;
        const raw = btn.getAttribute('data-promote-linked')||'';
        const parts = raw.split('|');
        const prefill = {
          desc: parts[0]||'', supplierCode: parts[1]||'', internalCode: parts[2]||'',
          itemDescription: parts[3]||'', unitPrice: parts[4]||'',
          supplierId: window.suggestSupplierId||''
        };
        if(typeof openLinkedItemModal==='function') openLinkedItemModal(null, prefill);
      });
    });
    attachInvoiceRowHandlers();
  }
  if(lgCurrentPage==='quarterly'){
    const qSearch=document.getElementById('quarterlySearchBox');
    if(qSearch){ bindLiveSearchInput('quarterlySearchBox', v=>{ quarterlyFilters.q = v; lgSetTablePage('quarterly',1); }, lgRerenderCurrentPage, 300); }
    const ySel = document.getElementById('quarterlyYearSel');
    if(ySel) ySel.addEventListener('change', ()=>{ quarterlyYear = Number(ySel.value); lgResetTablePage('quarterly'); document.getElementById('pageContent').innerHTML = renderQuarterlyPage(); lgAttachPageHandlers(); });
    document.querySelectorAll('[data-qperiod]').forEach(b=>{
      b.addEventListener('click', ()=>{ quarterlyPeriod = b.getAttribute('data-qperiod'); lgResetTablePage('quarterly'); document.getElementById('pageContent').innerHTML = renderQuarterlyPage(); lgAttachPageHandlers(); });
    });
    const qFrom = document.getElementById('quarterlyFromInput'); if(qFrom) qFrom.addEventListener('change', ()=>{ quarterlyFilters.from=qFrom.value; lgResetTablePage('quarterly'); document.getElementById('pageContent').innerHTML = renderQuarterlyPage(); lgAttachPageHandlers(); });
    const qTo = document.getElementById('quarterlyToInput'); if(qTo) qTo.addEventListener('change', ()=>{ quarterlyFilters.to=qTo.value; lgResetTablePage('quarterly'); document.getElementById('pageContent').innerHTML = renderQuarterlyPage(); lgAttachPageHandlers(); });
    const qClear = document.getElementById('quarterlyClearDates'); if(qClear) qClear.addEventListener('click', ()=>{ quarterlyFilters.from=''; quarterlyFilters.to=''; lgResetTablePage('quarterly'); document.getElementById('pageContent').innerHTML = renderQuarterlyPage(); lgAttachPageHandlers(); });
    const expPdf = document.getElementById('exportQuarterNoticesPdf');
    if(expPdf) expPdf.addEventListener('click', ()=>{
      if(typeof exportVisibleQuarterNoticesPdf === 'function') exportVisibleQuarterNoticesPdf();
      else if(typeof exportQuarterNoticesPdf === 'function') exportQuarterNoticesPdf();
    });
    attachInvoiceRowHandlers();
  }
  
  if(lgCurrentPage==='reports'){
    const ySel = document.getElementById('reportsYearSel');
    if(ySel) ySel.addEventListener('change', ()=>{ reportsYear = Number(ySel.value); lgResetTablePage('reports'); document.getElementById('pageContent').innerHTML = lgRenderReportsPage(); lgAttachPageHandlers(); });
    document.querySelectorAll('[data-rkey]').forEach(b=>{
      b.addEventListener('click', ()=>{ reportsPeriod = b.getAttribute('data-rkey'); lgResetTablePage('reports'); document.getElementById('pageContent').innerHTML = lgRenderReportsPage(); lgAttachPageHandlers(); });
    });
    const fromInp = document.getElementById('reportsFromInput'); if(fromInp) fromInp.addEventListener('change', ()=>{ reportsFrom = fromInp.value; document.getElementById('pageContent').innerHTML = lgRenderReportsPage(); lgAttachPageHandlers(); });
    const toInp = document.getElementById('reportsToInput'); if(toInp) toInp.addEventListener('change', ()=>{ reportsTo = toInp.value; document.getElementById('pageContent').innerHTML = lgRenderReportsPage(); lgAttachPageHandlers(); });
    const clearDates = document.getElementById('reportsClearDates'); if(clearDates) clearDates.addEventListener('click', ()=>{ reportsFrom=''; reportsTo=''; document.getElementById('pageContent').innerHTML = lgRenderReportsPage(); lgAttachPageHandlers(); });
    const expRep = document.getElementById('exportPeriodicReportCsvBtn'); if(expRep) expRep.addEventListener('click', exportPeriodicReportCsv);
    attachInvoiceRowHandlers();
  }
  if(lgCurrentPage==='archive'){
    if(typeof attachArchiveHandlers==='function') attachArchiveHandlers();
    if(typeof attachInvoiceRowHandlers==='function') attachInvoiceRowHandlers();
  }
  

  
}

function renderValidationResults(box, issues, page){
  if(!box) return;
  if(!issues.length){
    box.innerHTML = `<div style="background:#E8F0EA;border:1px solid #cfe0d4;border-radius:10px;padding:12px 14px;color:var(--ledger-green);font-weight:700;">✓ البيانات سليمة — لم يتم العثور على مشاكل</div>`;
    return;
  }
  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(issues.length / PAGE_SIZE));
  let p = Number(page) || Number(box.getAttribute('data-val-page')) || 1;
  if(p < 1) p = 1;
  if(p > totalPages) p = totalPages;
  box.setAttribute('data-val-page', String(p));
  box.__valIssues = issues;
  const start = (p - 1) * PAGE_SIZE;
  const slice = issues.slice(start, start + PAGE_SIZE);
  const pagesBtns = Array.from({length: totalPages}, (_,i)=>i+1).map(n=>
    `<button type="button" class="btn btn-sm ${n===p?'btn-primary':'btn-outline'}" data-val-page-btn="${n}" style="min-width:36px;">${n}</button>`
  ).join(' ');
  box.innerHTML = `
    <div style="background:#FDF3F0;border:1px solid #e8b4b4;border-radius:10px;padding:12px 14px;margin-bottom:8px;color:var(--debt);font-weight:800;">
      تم العثور على ${issues.length} مشكلة — الصفحة ${p} من ${totalPages} (20 لكل صفحة) — اضغط لتعديل الفاتورة
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>النوع</th><th>المرجع</th><th>المورد</th><th>المشكلة</th><th></th></tr></thead>
      <tbody>
        ${slice.map(i=>`<tr ${i.invId?`data-fix-invid="${i.invId}" style="cursor:pointer;" title="اضغط لفتح الفاتورة وتعديلها"`:''}>
          <td><span class="pill">${lgEscapeHtml(i.type)}</span></td>
          <td>${lgEscapeHtml(String(i.ref||''))}</td>
          <td>${lgEscapeHtml(String(i.supplier||'—'))}</td>
          <td>${lgEscapeHtml(i.msg||'')}</td>
          <td>${i.invId?`<button class="row-btn" data-fix-edit="${i.invId}" title="تعديل">✎</button>`:''}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:10px;">
      <button type="button" class="btn btn-outline btn-sm" data-val-prev ${p<=1?'disabled':''}>السابق</button>
      ${pagesBtns}
      <button type="button" class="btn btn-outline btn-sm" data-val-next ${p>=totalPages?'disabled':''}>التالي</button>
      <span style="font-size:12px;color:var(--ink-soft);margin-right:8px;">عرض ${start+1}–${Math.min(start+PAGE_SIZE, issues.length)} من ${issues.length}</span>
    </div>
  `;
  box.querySelectorAll('[data-val-page-btn]').forEach(btn=>{
    btn.addEventListener('click', ()=> renderValidationResults(box, issues, Number(btn.getAttribute('data-val-page-btn'))));
  });
  const prev = box.querySelector('[data-val-prev]'); if(prev) prev.addEventListener('click', ()=> renderValidationResults(box, issues, p-1));
  const next = box.querySelector('[data-val-next]'); if(next) next.addEventListener('click', ()=> renderValidationResults(box, issues, p+1));
  box.querySelectorAll('[data-fix-edit]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      window.__revalidateAfterEdit = true;
      openAddEditInvoiceModal(btn.getAttribute('data-fix-edit'));
    });
  });
  box.querySelectorAll('tr[data-fix-invid]').forEach(row=>{
    row.addEventListener('click', (e)=>{
      if(e.target.closest('button')) return;
      window.__revalidateAfterEdit = true;
      openAddEditInvoiceModal(row.getAttribute('data-fix-invid'));
    });
  });
}

/** تأكيد إصلاح الحسابات مع عرض ما سيُصلح */
function openFixCalculationsConfirm(){
  const list = previewInvoiceCalculationFixes();
  if(!list.length){
    lgShowToast('كل الحسابات متطابقة — لا يوجد ما يُصلح تلقائياً');
    return;
  }
  const overlay = lgEl(`
    <div class="modal-overlay" id="fixCalcOverlay" style="z-index:15000;">
      <div class="modal wide">
        <h3>تأكيد إصلاح حسابات الفواتير</h3>
        <p style="font-size:13.5px;color:var(--ink-soft);margin:0 0 12px;">
          سيتم إعادة حساب <strong>إجمالي الفاتورة</strong> و<strong>الصافي</strong> لـ <strong>${list.length}</strong> فاتورة حسب (القيمة + الضريبة + الدمغة − المخصوم).
          هل توافق؟
        </p>
        <div class="table-wrap" style="max-height:280px;overflow:auto;">
          <table>
            <thead><tr><th>رقم الفاتورة</th><th>المورد</th><th>الإجمالي (قديم → جديد)</th><th>الصافي (قديم → جديد)</th></tr></thead>
            <tbody>
              ${list.slice(0,50).map(x=>`<tr>
                <td>${lgEscapeHtml(x.invoiceNo)}</td>
                <td>${lgEscapeHtml(x.supplier)}</td>
                <td>${fmt(x.oldTotal)} → <strong>${fmt(x.newTotal)}</strong></td>
                <td>${fmt(x.oldNet)} → <strong>${fmt(x.newNet)}</strong></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        ${list.length>50?`<p style="font-size:12px;color:var(--ink-soft);">... و ${list.length-50} فاتورة أخرى</p>`:''}
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" id="fix_cancel">إلغاء</button>
          <button type="button" class="btn btn-primary" id="fix_ok">موافق — إصلاح ${list.length} فاتورة</button>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(overlay);
  document.getElementById('fix_cancel').addEventListener('click', ()=>overlay.remove());
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });
  document.getElementById('fix_ok').addEventListener('click', ()=>{
    const n = fixInvoiceCalculations();
    saveData(true);
    logAction('إصلاح حسابات', n+' فاتورة بعد موافقة المستخدم');
    overlay.remove();
    lgShowToast(`تم إصلاح ${n} فاتورة`);
    const box = document.getElementById('validationResults');
    if(box) renderValidationResults(box, validateAllData(), 1);
    const gbox = document.getElementById('globalValBox');
    if(gbox) renderValidationResults(gbox, validateAllData(), 1);
  });
}

/** فحص سريع من أي صفحة — نافذة منبثقة */
function openGlobalValidationModal(){
  const issues = validateAllData();
  const overlay = lgEl(`
    <div class="modal-overlay" id="globalValOverlay">
      <div class="modal wide">
        <h3>فحص صحة البيانات</h3>
        <div id="globalValBox"></div>
        <div class="modal-actions">
          <button class="btn btn-outline" id="gval_close">إغلاق</button>
          <button class="btn btn-primary" id="gval_fix">إصلاح حسابات الفواتير</button>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(overlay);
  const box = document.getElementById('globalValBox');
  renderValidationResults(box, issues);
  document.getElementById('gval_close').addEventListener('click', ()=>overlay.remove());
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });
  document.getElementById('gval_fix').addEventListener('click', ()=>{
    if(guardReadOnly('إصلاح حسابات الفواتير')) return;
    openFixCalculationsConfirm();
  });
}

function refreshInvoicesPage(){
  document.getElementById('pageContent').innerHTML = renderInvoicesPage();
  lgAttachPageHandlers();
}

function attachSupplierListHandlers(){
  document.querySelectorAll('.supplier-item').forEach(item=>{
    item.addEventListener('click', ()=>{
      activeSupplierId = item.getAttribute('data-id');
      activeSupplierTab = 'info';
      pfReset('supTab');
      document.getElementById('mainPanel').innerHTML = renderSupplierMain();
      document.getElementById('supplierListWrap').innerHTML = renderSupplierList();
      attachSupplierListHandlers();
      attachSupplierMainHandlers();
    });
  });
}

function attachSupplierMainHandlers(){
  try{ attachPageFilterControls(); }catch(pfErr){ console.error('attachPageFilterControls error:', pfErr); }
  try{ fitMoneyBlocks(); }catch(fitErr){}
  function refreshSupplierAttPanel(){
    try{
      document.getElementById('mainPanel').innerHTML = renderSupplierMain();
      attachSupplierMainHandlers();
    }catch(e){}
  }
  document.querySelectorAll('[data-sup-info-att]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const p = btn.getAttribute('data-sup-info-att');
      if(p && window.desktopApi) window.desktopApi.openAttachment(decodeURIComponent(p));
    });
  });
  document.querySelectorAll('[data-sup-del-att]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      if(typeof guardReadOnly==='function' && guardReadOnly('حذف مستند مورد')) return;
      const s = supplierById(activeSupplierId); if(!s) return;
      const attId = btn.getAttribute('data-sup-del-att');
      const att = (s.attachments||[]).find(a=>a.id===attId);
      if(att && att.path && window.desktopApi){
        try{ await window.desktopApi.deleteAttachment(att.path); }catch(e){}
      }
      s.attachments = (s.attachments||[]).filter(a=>a.id!==attId);
      logAction('حذف مستند مورد', (s.name||'')+' — '+(att&&att.name||''));
      saveData();
      lgShowToast('تم حذف المستند');
      refreshSupplierAttPanel();
    });
  });
  const scanBtn = document.getElementById('f_sup_scanAtt');
  if(scanBtn) scanBtn.addEventListener('click', ()=>{
    if(typeof guardReadOnly==='function' && guardReadOnly('إرفاق مستند مورد')) return;
    const s = supplierById(activeSupplierId); if(!s) return;
    const prefer = String(s.name || s.taxId || 'مورد').trim().replace(/[<>:"/\\|?*]/g,'_').replace(/\s+/g,'_') || 'مورد';
    if(typeof lgOpenScanAttachModal!=='function'){ lgShowToast('ميزة المسح غير متاحة'); return; }
    lgOpenScanAttachModal(s.id, (file)=>{
      if(!file) return;
      s.attachments = s.attachments || [];
      s.attachments.push(file);
      logAction('مسح وإرفاق مورد', (s.name||'')+' — '+(file.name||''));
      saveData(true);
      lgShowToast('تم إرفاق المستند');
      refreshSupplierAttPanel();
      try{
        if(document.getElementById('supplierListWrap')){
          document.getElementById('supplierListWrap').innerHTML = renderSupplierList();
          if(typeof attachSupplierListHandlers==='function') attachSupplierListHandlers();
        }
      }catch(e){}
    }, prefer);
  });
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(activeSupplierTab !== btn.getAttribute('data-tab')) pfReset('supTab');
      activeSupplierTab = btn.getAttribute('data-tab');
      if(activeSupplierTab==='statement'){ statementFilters.supplierId = activeSupplierId; statementFilters.from = ''; statementFilters.to = ''; }
      document.getElementById('mainPanel').innerHTML = renderSupplierMain();
      attachSupplierMainHandlers();
    });
  });
  const delBtn = document.getElementById('deleteSupplierBtn'); if(delBtn) delBtn.addEventListener('click', openDeleteSupplierModal);
  const printBtn = document.getElementById('printStatementBtn'); if(printBtn) printBtn.addEventListener('click', printSupplierStatement);
  const expBtn = document.getElementById('exportSupplierCsvBtn'); if(expBtn) expBtn.addEventListener('click', exportSupplierCsv);
  const expNoticesBtn = document.getElementById('exportSupplierNoticesPdfBtn');
  if(expNoticesBtn) expNoticesBtn.addEventListener('click', ()=>{
    if(typeof exportSupplierDiscountNoticesPdf === 'function' && activeSupplierId)
      exportSupplierDiscountNoticesPdf(activeSupplierId);
  });
  lgInitExtraFieldsWrap('f_customFieldsWrap');
  const addCustomBtn = document.getElementById('f_addCustomFieldBtn'); if(addCustomBtn) addCustomBtn.addEventListener('click', ()=>lgPromptAddExtraField('f_customFieldsWrap'));

  const saveInfoBtn = document.getElementById('saveInfoBtn');
  if(saveInfoBtn) saveInfoBtn.addEventListener('click', ()=>{
    if(typeof hasPagePermission==='function' && !hasPagePermission("ledger.suppliers",'edit')){ lgShowToast('🔒 ماعندكش صلاحية تعديل بيانات الموردين'); return; }
    const s = supplierById(activeSupplierId); if(!s) return;
    const name = document.getElementById('f_name').value.trim();
    if(!name){ lgShowToast('اسم المورد مطلوب'); return; }
    s.name = name;
    s.taxId = document.getElementById('f_taxid').value.trim();
    s.commercialReg = document.getElementById('f_commreg').value.trim();
    s.businessNature = document.getElementById('f_businessNature').value.trim();
    s.openingBalance = parseAmount(document.getElementById('f_openingBalance').value);
    s.openingBalanceDate = document.getElementById('f_openingBalanceDate').value;
    s.phone = document.getElementById('f_phone').value.trim();
    s.email = document.getElementById('f_email').value.trim();
    s.address = document.getElementById('f_address').value.trim();
    s.bankAccount = document.getElementById('f_bankAccount').value.trim();
    s.iban = document.getElementById('f_iban').value.trim();
    s.extraFields = collectExtraFields('f_customFieldsWrap');
    s.notes = document.getElementById('f_notes').value.trim();
    logAction('تعديل مورد', name || s.name || '');
    saveData(); lgShowToast('تم حفظ بيانات المورد');
    document.getElementById('mainPanel').innerHTML = renderSupplierMain();
    attachSupplierMainHandlers();
    document.getElementById('supplierListWrap').innerHTML = renderSupplierList();
    attachSupplierListHandlers();
  });

  const openInvModal = document.getElementById('openAddInvoiceModalBtn');
  if(openInvModal) openInvModal.addEventListener('click', ()=> openAddEditInvoiceModal(null, activeSupplierId));
  const openRetModal = document.getElementById('openAddReturnModalBtnSupplier');
  if(openRetModal) openRetModal.addEventListener('click', ()=> openAddEditInvoiceModal(null, activeSupplierId, true));

  const addPayBtn = document.getElementById('addPaymentBtn');
  if(addPayBtn) addPayBtn.addEventListener('click', ()=>{
    const date = document.getElementById('pay_date').value;
    const invoiceId = document.getElementById('pay_invoice').value;
    const method = document.getElementById('pay_method').value;
    const amount = parseAmount(document.getElementById('pay_amount').value);
    const transferRef = document.getElementById('pay_transferRef').value.trim();
    const extraFields = collectExtraFields('pay_extraFieldsWrap');
    const notes = document.getElementById('pay_notes').value.trim();
    if(!amount || amount<=0){ lgShowToast('من فضلك أدخل مبلغ الدفعة'); return; }
    DATA.ledger.payments.push({ id: lgUid('pay'), paymentNo: nextPaymentNo(), supplierId: activeSupplierId, date, invoiceId, method, amount, transferRef, extraFields, notes });
    saveData(); lgShowToast('تم إضافة الدفعة');
    document.getElementById('mainPanel').innerHTML = renderSupplierMain();
    attachSupplierMainHandlers();
    document.getElementById('supplierListWrap').innerHTML = renderSupplierList();
    attachSupplierListHandlers();
  });
  const payAddFieldBtn = document.getElementById('pay_addFieldBtn');
  if(payAddFieldBtn) payAddFieldBtn.addEventListener('click', ()=>lgPromptAddExtraField('pay_extraFieldsWrap'));

  const supplierAddPaymentModalBtn = document.getElementById('openAddPaymentModalSupplierBtn');
  if(supplierAddPaymentModalBtn) supplierAddPaymentModalBtn.addEventListener('click', ()=>openPaymentModal(activeSupplierId));

  const applySupplierStatementBtn = document.getElementById('applySupplierStatementBtn');
  if(applySupplierStatementBtn) applySupplierStatementBtn.addEventListener('click', ()=>{
    const from = (document.getElementById('supplierStatementFrom')||{}).value || '';
    const to = (document.getElementById('supplierStatementTo')||{}).value || '';
    if(from && to && from > to){ lgShowToast('تاريخ البداية يجب أن يكون قبل تاريخ النهاية'); return; }
    statementFilters.supplierId = activeSupplierId;
    statementFilters.from = from;
    statementFilters.to = to;
    document.getElementById('mainPanel').innerHTML = renderSupplierMain();
    attachSupplierMainHandlers();
  });
  const clearStmtDates = document.getElementById('clearSupplierStatementDatesBtn');
  if(clearStmtDates) clearStmtDates.addEventListener('click', ()=>{
    statementFilters.supplierId = activeSupplierId;
    statementFilters.from = '';
    statementFilters.to = '';
    document.getElementById('mainPanel').innerHTML = renderSupplierMain();
    attachSupplierMainHandlers();
  });
  const printSupplierStatementTabBtn = document.getElementById('printSupplierStatementTabBtn');
  if(printSupplierStatementTabBtn) printSupplierStatementTabBtn.addEventListener('click', ()=>printSupplierStatementTab());

  document.querySelectorAll('[data-delpay]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      confirmAndSoftDeletePayment(btn.getAttribute('data-delpay'));
    });
  });

  attachInvoiceRowHandlers();
  attachPaymentRowHandlers();
}

/** تحديث أي كشف حساب مفتوح بعد تعديل دفعة/فاتورة */
function refreshOpenStatements(){
  try{
    if(typeof statementFilters==='undefined') return;
    if(lgCurrentPage==='statement'){
      const pc=document.getElementById('pageContent');
      if(pc){ pc.innerHTML=renderStatementPage(); if(typeof lgAttachPageHandlers==='function') lgAttachPageHandlers(); }
      return;
    }
    if(lgCurrentPage==='suppliers' && activeSupplierTab==='statement' && activeSupplierId){
      statementFilters.supplierId = activeSupplierId;
      const mp=document.getElementById('mainPanel');
      if(mp){ mp.innerHTML=renderSupplierMain(); if(typeof attachSupplierMainHandlers==='function') attachSupplierMainHandlers(); }
    }
  }catch(e){ console.error('refreshOpenStatements', e); }
}
function attachPaymentRowHandlers(){
  document.querySelectorAll('[data-viewpay-btn]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      openViewPaymentModal(btn.getAttribute('data-viewpay-btn'));
    });
  });
  document.querySelectorAll('tr[data-viewpay]').forEach(row=>{
    row.addEventListener('click', (e)=>{
      if(e.target.closest('button') || e.target.closest('.row-actions')) return;
      const sel = window.getSelection && String(window.getSelection()).trim();
      if(sel) return;
      openViewPaymentModal(row.getAttribute('data-viewpay'));
    });
  });
}

function attachInvoiceRowHandlers(){
  document.querySelectorAll('[data-delinv]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      confirmAndSoftDeleteInvoice(btn.getAttribute('data-delinv'));
    });
  });
  document.querySelectorAll('[data-editinv]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      if(guardReadOnly('تعديل فاتورة')) return;
      const id = btn.getAttribute('data-editinv');
      openAddEditInvoiceModal(id);
    });
  });
  document.querySelectorAll('[data-notice]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const id = btn.getAttribute('data-notice');
      const inv = DATA.ledger.invoices.find(i=>i.id===id);
      if(inv && inv.isReturn){ lgShowToast('لا يُصدر إشعار خصم للمرتجع'); return; }
      openDiscountNoticeModal(id);
    });
  });
  document.querySelectorAll('[data-viewinv-btn]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      openViewInvoiceModal(btn.getAttribute('data-viewinv-btn'));
    });
  });
  document.querySelectorAll('tr[data-viewinv]').forEach(row=>{
    row.addEventListener('click', (e)=>{
      if(e.target.closest('button') || e.target.closest('.row-actions')) return;
      // لو المستخدم بيحدد نص للنسخ — متفتحش نافذة العرض
      const sel = window.getSelection && String(window.getSelection()).trim();
      if(sel) return;
      openViewInvoiceModal(row.getAttribute('data-viewinv'));
    });
  });
}

function lgRerenderCurrentPage(){
  if(typeof captureScrollState === 'function') captureScrollState();
  try{
    if(lgCurrentPage==='suppliers'){
      const main = document.getElementById('mainPanel');
      const list = document.getElementById('supplierListWrap');
      if(main){ main.innerHTML = renderSupplierMain(); attachSupplierMainHandlers(); }
      if(list){ list.innerHTML = renderSupplierList(); attachSupplierListHandlers(); }
      attachInvoiceRowHandlers();
      attachPaymentRowHandlers();
      if(typeof restoreScrollState === 'function') restoreScrollState();
      return;
    }
    const pc = document.getElementById('pageContent');
    if(!pc){ lgRender(); return; }
    if(lgCurrentPage==='dashboard'){
      const totalSuppliers = DATA.ledger.suppliers.length;
      const signedAmt = (b,k)=>(b.isReturn?-1:1)*Number(b[k]||0);
      const totalInvoicesVal = DATA.ledger.invoices.reduce((a,b)=>a+signedAmt(b,'totalInvoice'),0);
      const totalWithheld = DATA.ledger.invoices.reduce((a,b)=>a+signedAmt(b,'withheld'),0);
      const totalVatAll = DATA.ledger.invoices.reduce((a,b)=>a+signedAmt(b,'vat'),0);
      const totalStampAll = DATA.ledger.invoices.reduce((a,b)=>a+signedAmt(b,'stampDuty'),0);
      const totalNetAll = DATA.ledger.invoices.reduce((a,b)=>a+invoiceSignedNet(b),0);
      const totalPayments = DATA.ledger.payments.reduce((a,b)=>a+Number(b.amount||0),0);
      const totalDebt = DATA.ledger.suppliers.reduce((s,x)=>{const b=supplierBalance(x.id);return s+(b>0?b:0);},0);
      pc.innerHTML = renderDashboard(totalSuppliers,totalInvoicesVal,totalWithheld,totalDebt,totalVatAll,totalStampAll,totalNetAll,totalPayments);
    } else if(lgCurrentPage==='invoices' || lgCurrentPage==='returns') pc.innerHTML = renderLedgerPage(lgCurrentPage);
    else if(lgCurrentPage==='payments') pc.innerHTML = renderPaymentsPage();
    else if(lgCurrentPage==='categories') pc.innerHTML = renderCategoriesPage();
    else if(lgCurrentPage==='quarterly') pc.innerHTML = renderQuarterlyPage();
    else if(lgCurrentPage==='reports') pc.innerHTML = lgRenderReportsPage();
    else if(lgCurrentPage==='archive') pc.innerHTML = lgRenderArchivePage();
    else if(lgCurrentPage==='statement') pc.innerHTML = renderStatementPage();
    else pc.innerHTML = renderDashboard(DATA.ledger.suppliers.length,0,0,0);
  }catch(err){
    // مهم جدًا: لو أي حاجة فشلت هنا، منسيبش الصفحة معلّقة من غير أزرار تستجيب —
    // نرجع لأداة الرسم الكاملة (render) اللي فيها حماية من الأخطاء وبترجع الواجهة تشتغل
    console.error('rerenderCurrentPage error:', err);
    try{ lgRender(); }catch(e2){}
    return;
  }
  try{ lgAttachPageHandlers(); }catch(handlerErr){ console.error('attachPageHandlers error:', handlerErr); }
  if(typeof restoreScrollState === 'function') restoreScrollState();
  // فك أي قفل عالق على الخانات بعد إعادة الرسم (سبب شائع لتعليق الإدخال)
  try{ if(typeof forceUnlockAllInputs==='function') forceUnlockAllInputs(document, true); }catch(e){}
  // لو كنا جايين من فحص البيانات — أعد تشغيل النتائج تلقائياً
  if(window.__revalidateAfterEdit){
    window.__revalidateAfterEdit = false;
    setTimeout(()=>{ try{ openGlobalValidationModal(); }catch(e){} }, 50);
  }
}

function lgOpenShortcutsHelp(){
  const overlay = lgEl(`
    <div class="modal-overlay" id="shortcutsOverlay">
      <div class="modal">
        <h3>اختصارات لوحة المفاتيح</h3>
        <div class="table-wrap"><table>
          <thead><tr><th>الاختصار</th><th>الإجراء</th></tr></thead>
          <tbody>
            <tr><td><kbd>Ctrl</kbd> + <kbd>N</kbd></td><td>فاتورة جديدة</td></tr>
            <tr><td><kbd>Ctrl</kbd> + <kbd>S</kbd></td><td>مورد جديد</td></tr>
            <tr><td><kbd>Ctrl</kbd> + <kbd>P</kbd></td><td>دفعة جديدة</td></tr>
            <tr><td><kbd>Ctrl</kbd> + <kbd>D</kbd></td><td>لوحة المتابعة</td></tr>
            <tr><td><kbd>Ctrl</kbd> + <kbd>I</kbd></td><td>كل الفواتير</td></tr>
            <tr><td><kbd>Esc</kbd></td><td>إغلاق النافذة المفتوحة</td></tr>
          </tbody>
        </table></div>
        <p style="font-size:12px;color:var(--ink-soft);margin-top:10px;">الاختصارات لا تعمل وأنت تكتب داخل حقل إدخال.</p>
        <div class="modal-actions"><button class="btn btn-primary" id="sc_close">حسناً</button></div>
      </div>
    </div>
  `);
  document.body.appendChild(overlay);
  document.getElementById('sc_close').addEventListener('click', ()=>overlay.remove());
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });
}

/* ---------------- Keyboard Shortcuts (e.code يعمل مع لوحات عربية) ---------------- */
document.addEventListener('keydown', (e)=>{
  if(!lgIsActive()) return;   // (الموحّد) الاختصارات دي لصفحات الدفتر بس
  if(e.key === 'Escape' || e.code === 'Escape'){
    const ov = document.querySelector('.modal-overlay');
    if(ov){ ov.remove(); e.preventDefault(); }
    return;
  }
  const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
  if(tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target && e.target.isContentEditable)) return;
  if(document.querySelector('.modal-overlay')) return;

  const ctrl = e.ctrlKey || e.metaKey;
  if(!ctrl) return;
  const code = e.code || '';
  const k = (e.key || '').toLowerCase();

  if(code === 'KeyN' || k === 'n'){
    e.preventDefault();
    if(typeof openAddEditInvoiceModal==='function') openAddEditInvoiceModal();
    return;
  }
  if(code === 'KeyS' || k === 's'){
    e.preventDefault();
    if(typeof openAddSupplierModal==='function') openAddSupplierModal();
    return;
  }
  if(code === 'KeyP' || k === 'p'){
    e.preventDefault();
    if(typeof openPaymentModal==='function') openPaymentModal();
    return;
  }
  if(code === 'KeyD' || k === 'd'){
    e.preventDefault();
    lgCurrentPage = 'dashboard';
    lgRender();
    return;
  }
  if(code === 'KeyI' || k === 'i'){
    e.preventDefault();
    lgCurrentPage = 'invoices';
    lgRender();
    return;
  }
}, true); // capture phase عشان الاختصارات تشتغل بثبات

/* ---------------- init ---------------- */

