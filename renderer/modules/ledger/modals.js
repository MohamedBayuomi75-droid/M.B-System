/* (الموحّد) مولَّد بالـ codemod من دفتر الموردين — modals.js — الملف ده بقى مصدر الحقيقة، عدّل فيه مباشرة */
/* ---------------- Modals ---------------- */
/** اسم ملف المرفق = رقم الفاتورة (آمن للملفات) */
function lgPreferredAttachNameFromInvoice(invoiceNo){
  const n = String(invoiceNo || '').trim().replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
  return n || '';
}

function openAddSupplierModal(){
  if(guardReadOnly('إضافة مورد')) return;
  if(typeof hasPagePermission==='function' && !hasPagePermission("ledger.suppliers",'add')){ lgShowToast('🔒 ماعندكش صلاحية إضافة موردين'); return; }
  const extraFieldsHtml = `
        <div class="field"><label>رقم الهاتف</label><input id="m_phone" /></div>
        <div class="field"><label>البريد الإلكتروني</label><input id="m_email" type="email" /></div>
        <div class="field"><label>العنوان</label><input id="m_address" /></div>
        <div class="field"><label>رقم الحساب البنكي</label><input id="m_bankAccount" /></div>
        <div class="field"><label>IBAN</label><input id="m_iban" placeholder="EG..." /></div>
        <div id="m_customFieldsWrap" style="margin-top:4px;"></div>
        <div class="btn-row no-print" style="margin-top:6px;"><button class="btn btn-outline btn-sm" id="m_addCustomFieldBtn" type="button">+ إضافة خانة مخصصة أخرى</button></div>
  `;
  const overlay = lgEl(`
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal wide">
        <h3>إضافة مورد جديد</h3>
        <div class="field"><label>اسم المورد *</label><input id="m_name" autofocus /></div>
        <div class="field"><label>الرقم الضريبي</label><input id="m_taxid" /></div>
        <div class="field"><label>السجل التجاري</label><input id="m_commreg" /></div>
        <div class="field"><label>طبيعة نشاط المورد</label><div class="ss-cell"><input id="m_businessNature" placeholder="اكتب أو اختر طبيعة النشاط..." autocomplete="off" /></div></div>
        <datalist id="businessNatureListModal">${allBusinessNatures().map(c=>`<option value="${lgEscapeHtml(c)}">`).join('')}</datalist>
        <div class="form-grid">
          <div class="field"><label>الرصيد الافتتاحي</label><input id="m_openingBalance" type="text" inputmode="decimal" data-money="neg" dir="ltr" autocomplete="off" style="text-align:right;" placeholder="٠" /></div>
          <div class="field"><label>تاريخ الرصيد الافتتاحي</label><input id="m_openingBalanceDate" type="date" /></div>
        </div>
        <div id="m_extraFieldsWrap" style="display:none;">${extraFieldsHtml}</div>
        <div class="btn-row no-print" id="m_addFieldRow" style="margin:6px 0 4px;">
          <button class="btn btn-outline btn-sm" id="m_showExtraFields" type="button">+ إضافة خانة (هاتف / إيميل / عنوان / حساب بنكي / IBAN)</button>
        </div>
        <div class="field" style="margin-top:12px;">
          <label>المرفقات (مسح ضوئي / كاميرا)</label>
          <div id="m_sup_attList" style="font-size:12.5px;color:var(--ink-soft);margin-bottom:8px;">لا توجد مرفقات بعد</div>
          <button type="button" class="btn btn-outline btn-sm" id="m_sup_scanAtt">📷 مسح ضوئي / كاميرا</button>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" id="m_cancel">إلغاء</button>
          <button class="btn btn-primary" id="m_save">إضافة</button>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(overlay);
  if(typeof ensureModalInputsEditable==='function') ensureModalInputsEditable(overlay);
  document.getElementById('m_cancel').addEventListener('click', ()=>overlay.remove());
  const bnEl = document.getElementById('m_businessNature');
  if(bnEl && typeof attachSmartCombo==='function'){
    attachSmartCombo(bnEl, {
      getItems: ()=> (typeof allBusinessNatures==='function'?allBusinessNatures():[]).map(c=>({value:c,label:c})),
      allowFreeText: true,
      resolveOnBlur: false
    });
  }

  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });
  document.getElementById('m_showExtraFields').addEventListener('click', ()=>{
    document.getElementById('m_extraFieldsWrap').style.display = 'block';
    document.getElementById('m_addFieldRow').style.display = 'none';
  });
  document.getElementById('m_addCustomFieldBtn').addEventListener('click', ()=>lgPromptAddExtraField('m_customFieldsWrap'));
  let supAttachments = [];
  const supIdTemp = lgUid('sup');
  function renderSupAttList(){
    const box = document.getElementById('m_sup_attList');
    if(!box) return;
    if(!supAttachments.length){ box.innerHTML = 'لا توجد مرفقات بعد'; return; }
    box.innerHTML = supAttachments.map(a=>`
      <div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📎 ${lgEscapeHtml(a.name||'ملف')}</span>
        <button type="button" class="row-btn" data-sup-open-att="${a.path?encodeURIComponent(a.path):''}">👁</button>
        <button type="button" class="row-btn del" data-sup-del-att="${a.id}">✕</button>
      </div>`).join('');
    box.querySelectorAll('[data-sup-open-att]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const p = btn.getAttribute('data-sup-open-att');
        if(p) window.desktopApi.openAttachment(decodeURIComponent(p));
      });
    });
    box.querySelectorAll('[data-sup-del-att]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const id = btn.getAttribute('data-sup-del-att');
        const att = supAttachments.find(x=>x.id===id);
        if(att && att.path) try{ await window.desktopApi.deleteAttachment(att.path); }catch(e){}
        supAttachments = supAttachments.filter(x=>x.id!==id);
        renderSupAttList();
      });
    });
  }
  const supScan = document.getElementById('m_sup_scanAtt');
  if(supScan) supScan.addEventListener('click', ()=>{
    const tax = (document.getElementById('m_taxid')||{}).value || '';
    const nm = (document.getElementById('m_name')||{}).value || '';
    const prefer = String(nm || tax || 'مورد').trim().replace(/[<>:"/\\|?*]/g,'_').replace(/\s+/g,'_') || 'مورد';
    lgOpenScanAttachModal(supIdTemp, (file)=>{
      if(file){ supAttachments.push(file); renderSupAttList(); logAction('مسح وإرفاق مورد', prefer); }
    }, prefer);
  });
  document.getElementById('m_save').addEventListener('click', ()=>{
    const name = document.getElementById('m_name').value.trim();
    const gv = id => { const el2 = document.getElementById(id); return el2 ? el2.value.trim() : ''; };
    const newS = {
      id: supIdTemp, name,
      taxId: gv('m_taxid'),
      commercialReg: gv('m_commreg'),
      businessNature: gv('m_businessNature'),
      openingBalance: parseAmount(gv('m_openingBalance')),
      openingBalanceDate: gv('m_openingBalanceDate'),
      phone: gv('m_phone'),
      email: gv('m_email'),
      address: gv('m_address'),
      bankAccount: gv('m_bankAccount'),
      iban: gv('m_iban'),
      extraFields: collectExtraFields('m_customFieldsWrap'),
      notes:'',
      attachments: supAttachments.slice()
    };
    const valErrors = validateSupplierFields(newS);
    if(valErrors.length){ lgShowToast(valErrors[0]); return; }
    DATA.ledger.suppliers.push(newS);
    logAction('إضافة مورد', (newS.name || '') + (supAttachments.length ? ' — '+supAttachments.length+' مرفق' : ''));
    saveData();
    activeSupplierId = newS.id; activeSupplierTab='info'; lgCurrentPage='suppliers';
    overlay.remove();
    lgShowToast('تم إضافة المورد');
    lgRender();
  });
}

function openDeleteSupplierModal(){
  if(guardReadOnly('حذف مورد')) return;
  if(typeof hasPagePermission==='function' && !hasPagePermission("ledger.suppliers",'delete')){ lgShowToast('🔒 ماعندكش صلاحية حذف الموردين'); return; }
  const s = supplierById(activeSupplierId); if(!s) return;
  const overlay = lgEl(`
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal">
        <h3>حذف المورد</h3>
        <p style="font-size:13.5px;color:var(--ink-soft);">هل أنت متأكد من حذف المورد «${lgEscapeHtml(s.name)}»؟<br>
        سيُنقل المورد ومجلد أرشيفه (فواتير ودفعات ومستندات) إلى <strong>سلة المهملات</strong> ويمكن استرجاعه لاحقاً من صفحة الأرشيف.<br>
        <strong style="color:var(--debt);">فواتير: ${DATA.ledger.invoices.filter(x=>x.supplierId===s.id).length} — دفعات: ${DATA.ledger.payments.filter(x=>x.supplierId===s.id).length}</strong></p>
        <div class="modal-actions">
          <button class="btn btn-outline" id="m_cancel">إلغاء</button>
          <button class="btn btn-primary" id="m_confirm" style="background:var(--debt);">نقل لسلة المهملات</button>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(overlay);
  if(typeof forceUnlockAllInputs==='function') forceUnlockAllInputs(overlay);
  if(typeof ensureModalInputsEditable==='function') ensureModalInputsEditable(overlay);
  document.getElementById('m_cancel').addEventListener('click', ()=>overlay.remove());
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });
  document.getElementById('m_confirm').addEventListener('click', async ()=>{
    const invs = DATA.ledger.invoices.filter(x=>x.supplierId===s.id);
    const pays = DATA.ledger.payments.filter(x=>x.supplierId===s.id);
    const invCount = invs.length;
    const payCount = pays.length;
    if(invCount || payCount){
      if(!(await showAppConfirm('تأكيد:\nسيتم نقل «'+s.name+'» مع '+invCount+' فاتورة و '+payCount+' دفعة إلى سلة المهملات (يمكن الاسترجاع من الأرشيف).', { title:'حذف مورد', okText:'نقل لسلة المهملات', cancelText:'إلغاء', danger:true }))) return;
    }
    if(!Array.isArray(DATA.ledger.archiveTrash)) DATA.ledger.archiveTrash = [];
    DATA.ledger.archiveTrash.push({
      id: typeof lgUid==='function'?lgUid('trash'):('trash_'+Date.now()),
      kind: 'supplier',
      name: s.name || 'مورد',
      deletedAt: new Date().toISOString(),
      supplier: JSON.parse(JSON.stringify(s)),
      invoices: JSON.parse(JSON.stringify(invs)),
      payments: JSON.parse(JSON.stringify(pays))
    });
    DATA.ledger.suppliers = DATA.ledger.suppliers.filter(x=>x.id!==s.id);
    DATA.ledger.invoices = DATA.ledger.invoices.filter(x=>x.supplierId!==s.id);
    DATA.ledger.payments = DATA.ledger.payments.filter(x=>x.supplierId!==s.id);
    activeSupplierId = null;
    logAction('حذف مورد → سلة', (s.name||'')+' — فواتير:'+invCount+' دفعات:'+payCount);
    try{ if(typeof lgRebuildIndexes==='function') lgRebuildIndexes(); }catch(e){}
    saveData(true);
    overlay.remove();
    lgShowToast('تم نقل المورد لسلة المهملات — يمكن الاسترجاع من الأرشيف');
    lgRender();
  });
}

function codeDescription(list, value){ const item=list.find(o=>o.code===String(value)); return item?`${item.code} — ${item.label}`:(value?String(value):'-'); }

function openPaymentModal(prefillSupplierId, editId){
  if(guardReadOnly(editId?'تعديل دفعة':'إضافة دفعة')) return;
  if(typeof hasPagePermission==='function' && !hasPagePermission("ledger.payments", editId?'edit':'add')){ lgShowToast(editId?'🔒 ماعندكش صلاحية تعديل الدفعات':'🔒 ماعندكش صلاحية إضافة دفعات'); return; }
  if(DATA.ledger.suppliers.length===0){ lgShowToast('أضِف مورداً أولاً قبل تسجيل دفعة'); return; }
  const editing = editId ? DATA.ledger.payments.find(x=>x.id===editId) : null;
  const supId=(editing&&editing.supplierId)||prefillSupplierId||activeSupplierId||'';
  // أغلق أي مودال سابق عالق
  document.querySelectorAll('.modal-overlay').forEach(o=>o.remove());
  const supplierOptions = DATA.ledger.suppliers.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar'))
    .map(s=>'<option value="'+s.id+'" '+(s.id===supId?'selected':'')+'>'+lgEscapeHtml(s.name)+'</option>').join('');
  const today = editing && editing.date ? editing.date : todayIso();
  const overlay = lgEl(
    '<div class="modal-overlay" id="modalOverlay">'+
    '<div class="modal wide" role="dialog" aria-modal="true">'+
    '<h3>'+(editing?('تعديل الدفعة'+(editing.paymentNo?' #'+editing.paymentNo:'')):'إضافة دفعة جديدة')+'</h3>'+
    '<div class="field"><label for="m_pay_supplier_name">اسم المورد *</label><div class="ss-cell ss-cell-wide"><input type="text" id="m_pay_supplier_name" placeholder="ابحث أو اكتب اسم المورد..." autocomplete="off" value="'+lgEscapeHtml((function(){var s=supplierById(supId);return s&&s.name?s.name:'';})())+'" data-combo-id="'+lgEscapeHtml(supId||'')+'" /><input type="hidden" id="m_pay_supplier" value="'+lgEscapeHtml(supId||'')+'" /></div></div>'+
    '<div class="form-grid" style="grid-template-columns:1fr 1fr;gap:10px;">'+
      '<div class="field"><label>رقم التسجيل الضريبي</label><input id="m_pay_taxid" disabled style="opacity:.7;" value="'+lgEscapeHtml((function(){var s=supplierById(supId);return s&&s.taxId?s.taxId:'';})())+'" /></div>'+
      '<div class="field"><label>السجل التجاري</label><input id="m_pay_commreg" disabled style="opacity:.7;" value="'+lgEscapeHtml((function(){var s=supplierById(supId);return s&&s.commercialReg?s.commercialReg:'';})())+'" /></div>'+
    '</div>'+
    '<div class="field"><label for="m_pay_date">التاريخ</label><input type="date" id="m_pay_date" value="'+today+'" /></div>'+
    '<div class="field"><label for="m_pay_direction">نوع الحركة *</label><select id="m_pay_direction">'+
      '<option value="pay" '+((!editing||editing.direction!=='collect')?'selected':'')+'>دائن — علينا له (سداد للمورد)</option>'+
      '<option value="collect" '+(editing&&editing.direction==='collect'?'selected':'')+'>مدين — عليه لنا (قيد مدين / تحصيل)</option>'+
    '</select>'+
    '<p style="font-size:11.5px;color:var(--ink-soft);margin:6px 0 0;">دائن: فلوس خارجة للمورد تقلل المستحق عليه. مدين: تسجيل أن المورد مدين لنا (يقلل رصيده الدائن عندنا).</p></div>'+
    '<div class="field">'+
      '<label>الفواتير المرتبطة <span style="font-weight:400;color:var(--ink-soft);font-size:12px;">(اختيار متعدد)</span></label>'+
      '<div id="m_pay_invoiceList" class="pay-inv-list"></div>'+
      '<label style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:13px;">'+
        '<input type="checkbox" id="m_pay_general" '+(editing&&!editing.invoiceId?'checked':'')+' /> دفعة عامة (مقدمة / تحت الحساب — بدون ربط بفاتورة)'+
      '</label>'+
    '</div>'+
    '<div class="field"><label for="m_pay_method">طريقة الدفع</label><select id="m_pay_method">'+
    ['نقدي','تحويل بنكي','شيك','أخرى'].map(function(m){return '<option value="'+m+'" '+(editing&&editing.method===m?'selected':'')+'>'+m+'</option>';}).join('')+
    '</select></div>'+
    '<div class="field"><label for="m_pay_amount">المبلغ الإجمالي *</label><input type="text" inputmode="decimal" data-money="pos" dir="ltr" style="text-align:right;" id="m_pay_amount" placeholder="٠.٠٠" autocomplete="off" value="'+(editing?fmtInput(editing.amount||''):'')+'" /></div>'+
    '<p id="m_pay_allocHint" style="font-size:12px;color:var(--ink-soft);margin:0 0 8px;"></p>'+
    '<div class="field"><label for="m_pay_transferRef">رقم التحويل البنكي</label><input type="text" id="m_pay_transferRef" placeholder="اختياري" autocomplete="off" value="'+lgEscapeHtml(editing&&editing.transferRef?editing.transferRef:'')+'" /></div>'+
    '<div id="m_pay_extraFieldsWrap"></div>'+
    '<div class="btn-row no-print" style="margin-top:6px;"><button class="btn btn-outline btn-sm" id="m_pay_addFieldBtn" type="button">+ إضافة خانة أخرى</button></div>'+
    '<div class="field"><label for="m_pay_notes">ملاحظات</label><input type="text" id="m_pay_notes" placeholder="اختياري" autocomplete="off" value="'+lgEscapeHtml(editing&&editing.notes?editing.notes:'')+'" /></div>'+
    '<div class="section-title" style="margin-top:12px;font-size:14px;">المرفقات (مسح ضوئي)</div>'+
    '<div id="m_pay_attList" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;"></div>'+
    '<button type="button" class="btn btn-outline btn-sm" id="m_pay_scanAtt">📷 مسح ضوئي / كاميرا</button>'+
    '<div class="modal-actions"><button type="button" class="btn btn-outline" id="m_pay_cancel">إلغاء</button><button type="button" class="btn btn-primary" id="m_pay_save">'+(editing?'حفظ التعديل':'إضافة الدفعة')+'</button></div>'+
    '</div></div>'
  );
  document.body.appendChild(overlay);
  if(typeof ensureModalInputsEditable==='function') ensureModalInputsEditable(overlay);
  // منع إغلاق المودال بالغلط عند الضغط داخل النموذج
  const modalBox = overlay.querySelector('.modal');
  if(modalBox) modalBox.addEventListener('mousedown', e=> e.stopPropagation());
  // تركيز أول حقل قابل للكتابة
  setTimeout(()=>{
    const amt = document.getElementById('m_pay_amount');
    if(amt){ try{ amt.focus(); amt.select && amt.select(); }catch(err){} }
  }, 50);
  document.getElementById('m_pay_addFieldBtn').addEventListener('click', ()=>lgPromptAddExtraField('m_pay_extraFieldsWrap'));

  const paySupName = document.getElementById('m_pay_supplier_name');
  const paySupHidden = document.getElementById('m_pay_supplier');
  if(paySupName && typeof attachSmartCombo==='function'){
    if(supId) paySupName.dataset.comboId = supId;
    attachSmartCombo(paySupName, {
      getItems: ()=> typeof getSupplierComboItems==='function' ? getSupplierComboItems() : [],
      allowFreeText: false,
      clearIdOnType: true,
      resolveOnBlur: true,
      onSelect: (it)=>{
        const id = it.id || '';
        paySupName.dataset.comboId = id;
        if(paySupHidden){
          paySupHidden.value = id;
          paySupHidden.dispatchEvent(new Event('change', { bubbles:true }));
        }
        const sp = typeof supplierById==='function' ? supplierById(id) : null;
        const t = document.getElementById('m_pay_taxid');
        const c = document.getElementById('m_pay_commreg');
        if(t) t.value = sp ? (sp.taxId||'') : '';
        if(c) c.value = sp ? (sp.commercialReg||'') : '';
      }
    });
    paySupName.addEventListener('change', ()=>{ if(paySupHidden) paySupHidden.value = paySupName.dataset.comboId || ''; });
  }

  const payAttachId = editing ? ('payedit_' + editing.id) : ('pay_' + Date.now().toString(36));
  let payAttachments = (editing && Array.isArray(editing.attachments)) ? editing.attachments.slice() : [];
  function renderPayAttachments(){
    const box = document.getElementById('m_pay_attList');
    if(!box) return;
    box.innerHTML = payAttachments.length ? payAttachments.map(a=>`
      <div class="pill" style="padding:6px 10px;display:flex;align-items:center;gap:6px;">
        <button type="button" class="row-btn" data-pay-open-att="${lgEscapeHtml(a.path)}">${lgEscapeHtml(a.name)}</button>
        <button type="button" class="row-btn del" data-pay-del-att="${lgEscapeHtml(a.id)}" title="حذف">✕</button>
      </div>`).join('') : '<span style="color:var(--ink-soft);font-size:13px;">لا توجد مرفقات بعد</span>';
    box.querySelectorAll('[data-pay-open-att]').forEach(btn=>{
      btn.addEventListener('click', ()=> window.desktopApi.openAttachment(btn.getAttribute('data-pay-open-att')));
    });
    box.querySelectorAll('[data-pay-del-att]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const attId = btn.getAttribute('data-pay-del-att');
        const att = payAttachments.find(x=>x.id===attId);
        if(att && att.path) await window.desktopApi.deleteAttachment(att.path);
        payAttachments = payAttachments.filter(x=>x.id!==attId);
        renderPayAttachments();
      });
    });
  }
  renderPayAttachments();
  const payScanBtn = document.getElementById('m_pay_scanAtt');
  if(payScanBtn) payScanBtn.addEventListener('click', ()=>{
    const prefer = 'دفعة_' + (((document.getElementById('m_pay_date')||{}).value) || Date.now().toString(36));
    lgOpenScanAttachModal(payAttachId, (file)=>{
      payAttachments = payAttachments.concat([file]);
      renderPayAttachments();
    }, prefer);
  });

  function fillInvoices(){
    const sid=document.getElementById('m_pay_supplier').value;
    const box=document.getElementById('m_pay_invoiceList');
    const editAmt = editing ? Number(editing.amount||0) : 0;
    const editInvId = editing ? (editing.invoiceId||'') : '';
    const invs = supplierInvoices(sid).filter(i=>{
      if(i.isReturn || i.cancelled) return false;
      const rem = invoiceRemaining(i) + ((editInvId && i.id===editInvId) ? editAmt : 0);
      return rem > 0.009 || (editInvId && i.id===editInvId);
    }).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    if(!invs.length){
      box.innerHTML = '<div style="color:var(--ink-soft);font-size:13px;padding:6px;">لا توجد فواتير بباقي لهذا المورد</div>';
      return;
    }
    box.innerHTML = invs.map(i=>{
      const rem = invoiceRemaining(i) + ((editInvId && i.id===editInvId) ? editAmt : 0);
      const checked = editInvId && i.id===editInvId;
      const preAmt = checked ? editAmt : '';
      return `
      <label class="pay-inv-row">
        <input type="checkbox" class="m_pay_inv_cb" value="${i.id}" data-remain="${rem}" ${checked?'checked':''} />
        <span class="pay-inv-no">${lgEscapeHtml(i.invoiceNo||'-')}</span>
        <span class="pay-inv-date">${lgEscapeHtml(lgFmtDate(i.date))}</span>
        <span class="pay-inv-remain">متبقي ${fmt(rem)}</span>
        <input type="text" inputmode="decimal" data-money="pos" dir="ltr" autocomplete="off" style="text-align:right;" class="m_pay_inv_amt" data-invid="${i.id}" placeholder="مبلغ" value="${fmtInput(preAmt)}" ${checked?'':'disabled'} />
      </label>`;
    }).join('');
    box.querySelectorAll('.m_pay_inv_cb').forEach(cb=>{
      cb.addEventListener('change', ()=>{
        const amt = box.querySelector(`.m_pay_inv_amt[data-invid="${cb.value}"]`);
        if(amt){
          amt.disabled = !cb.checked;
          if(cb.checked && !amt.value) amt.value = fmtInput(roundMoney(Number(cb.getAttribute('data-remain'))||0, 6));
          if(!cb.checked) amt.value = '';
        }
        updateAllocHint();
      });
    });
    box.querySelectorAll('.m_pay_inv_amt').forEach(inp=>inp.addEventListener('input', updateAllocHint));
    updateAllocHint();
  }
  function updateAllocHint(){
    const hint = document.getElementById('m_pay_allocHint');
    const total = parseAmount(document.getElementById('m_pay_amount').value);
    let allocated = 0;
    document.querySelectorAll('.m_pay_inv_cb:checked').forEach(cb=>{
      const amt = document.querySelector(`.m_pay_inv_amt[data-invid="${cb.value}"]`);
      allocated += parseAmount(amt && amt.value);
    });
    const general = document.getElementById('m_pay_general').checked;
    if(general){
      hint.textContent = 'دفعة عامة — لن تُخصم من فواتير محددة';
      return;
    }
    const diff = total - allocated;
    if(!total){ hint.textContent = 'أدخل المبلغ الإجمالي ثم حدّد توزيعه على الفواتير'; return; }
    if(Math.abs(diff) < 0.02) hint.innerHTML = `<span style="color:var(--ledger-green);font-weight:700;">✓ التوزيع مطابق للمبلغ الإجمالي (${fmt(total)})</span>`;
    else if(diff > 0) hint.innerHTML = `<span style="color:var(--gold);">متبقي للتوزيع: ${fmt(diff)} (يمكن جعله دفعة عامة أو زيادته على فاتورة)</span>`;
    else hint.innerHTML = `<span style="color:var(--debt);">التوزيع أكبر من المبلغ بـ ${fmt(-diff)}</span>`;
  }
  fillInvoices();
  document.getElementById('m_pay_supplier').addEventListener('change',function(){
    const sp = supplierById(this.value);
    const t = document.getElementById('m_pay_taxid');
    const c = document.getElementById('m_pay_commreg');
    if(t) t.value = sp ? (sp.taxId||'') : '';
    if(c) c.value = sp ? (sp.commercialReg||'') : '';
    fillInvoices();
  });
  document.getElementById('m_pay_amount').addEventListener('input', updateAllocHint);
  document.getElementById('m_pay_general').addEventListener('change', ()=>{
    const gen = document.getElementById('m_pay_general').checked;
    document.getElementById('m_pay_invoiceList').style.opacity = gen ? '0.45' : '1';
    document.querySelectorAll('.m_pay_inv_cb').forEach(cb=>{ if(gen){ cb.checked=false; cb.dispatchEvent(new Event('change')); }});
    updateAllocHint();
  });
  document.getElementById('m_pay_cancel').addEventListener('click',()=>overlay.remove());
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
  document.getElementById('m_pay_save').addEventListener('click',()=>{
    const supplierId=document.getElementById('m_pay_supplier').value;
    const date=document.getElementById('m_pay_date').value;
    const method=document.getElementById('m_pay_method').value;
    const totalAmount=parseAmount(document.getElementById('m_pay_amount').value);
    const transferRef=document.getElementById('m_pay_transferRef').value.trim();
    const extraFields=collectExtraFields('m_pay_extraFieldsWrap');
    const notes=document.getElementById('m_pay_notes').value.trim();
    const isGeneral=document.getElementById('m_pay_general').checked;

    if(!supplierId){ lgShowToast('اختر المورد'); return; }
    if(!totalAmount || totalAmount<=0){ lgShowToast('أدخل مبلغاً صحيحاً'); return; }

    const allocations = [];
    if(!isGeneral){
      document.querySelectorAll('.m_pay_inv_cb:checked').forEach(cb=>{
        const amtEl = document.querySelector(`.m_pay_inv_amt[data-invid="${cb.value}"]`);
        const amt = parseAmount(amtEl && amtEl.value);
        if(amt > 0) allocations.push({ invoiceId: cb.value, amount: amt });
      });
    }

    const allocatedSum = allocations.reduce((a,b)=>a+b.amount,0);
    if(!isGeneral && allocations.length===0){
      // دفعة عامة ضمنياً
    } else if(!isGeneral && allocatedSum - totalAmount > 0.02){
      lgShowToast('مجموع التوزيع أكبر من المبلغ الإجمالي');
      return;
    }

    const sName = (supplierById(supplierId)||{}).name || '';
    const attCopy = payAttachments.slice();

    const direction = (document.getElementById('m_pay_direction') && document.getElementById('m_pay_direction').value) || 'pay';
    // وضع التعديل: استبدال السجل في المصفوفة ثم حفظ فوري
    if(editing){
      let invoiceId = '';
      if(!isGeneral && allocations.length>=1) invoiceId = allocations[0].invoiceId;
      else if(isGeneral) invoiceId = '';
      else invoiceId = editing.invoiceId || '';

      const idx = DATA.ledger.payments.findIndex(p=>p.id===editing.id);
      const updated = Object.assign({}, (idx>=0?DATA.ledger.payments[idx]:editing), {
        supplierId, date, method,
        direction: direction === 'collect' ? 'collect' : 'pay',
        amount: totalAmount,
        invoiceId, transferRef, extraFields, notes,
        attachments: attCopy
      });
      if(idx>=0) DATA.ledger.payments[idx] = updated;
      else DATA.ledger.payments.push(updated);

      logAction('تعديل دفعة', `${fmt(totalAmount)} — ${sName} — ${updated.direction==='collect'?'مدين':'دائن'}`);
      try{ if(typeof lgRebuildIndexes==='function') lgRebuildIndexes(); }catch(e){}
      saveData(true);
      overlay.remove();
      activeSupplierId = supplierId;
      lgShowToast(updated.direction==='collect'
        ? 'تم الحفظ: قيد مدين (المورد عليه لنا)'
        : 'تم الحفظ: دفعة دائن (سداد للمورد)');
      try{
        if(typeof lgRender==='function') lgRender();
        else lgRerenderCurrentPage();
      }catch(e){ try{ lgRerenderCurrentPage(); }catch(e2){} }
      try{ if(typeof refreshOpenStatements==='function') refreshOpenStatements(); }catch(e){}
      return;
    }

    const batchId = lgUid('pbatch');
    let created = 0;
    if(isGeneral || allocations.length===0){
      DATA.ledger.payments.push({id:lgUid('pay'),paymentNo:nextPaymentNo(),supplierId,date,invoiceId:'',method,amount:totalAmount,direction,transferRef,extraFields,notes,batchId,attachments:attCopy});
      created = 1;
    } else {
      allocations.forEach(a=>{
        DATA.ledger.payments.push({id:lgUid('pay'),paymentNo:nextPaymentNo(),supplierId,date,invoiceId:a.invoiceId,method,amount:a.amount,direction,transferRef,extraFields,notes,batchId,attachments:attCopy});
        created++;
      });
      const remainder = Math.round((totalAmount - allocatedSum)*100)/100;
      if(remainder > 0.02){
        DATA.ledger.payments.push({id:lgUid('pay'),paymentNo:nextPaymentNo(),supplierId,date,invoiceId:'',method,amount:remainder,direction,transferRef,extraFields,notes: (notes?notes+' — ':'')+'متبقي غير موزع',batchId,attachments:attCopy});
        created++;
      }
    }
    logAction('إضافة دفعة', `${fmt(totalAmount)} — ${sName}${created>1?' ('+created+' توزيع)':''}`);
    try{ if(typeof lgRebuildIndexes==='function') lgRebuildIndexes(); }catch(e){}
    saveData(true);
    overlay.remove(); activeSupplierId=supplierId;
    lgShowToast(created>1 ? `تم تسجيل الدفعة وتوزيعها على ${created} بند` : 'تم إضافة الدفعة');
    try{
      if(typeof lgRender==='function') lgRender();
      else lgRerenderCurrentPage();
    }catch(e){ try{ lgRerenderCurrentPage(); }catch(e2){} }
    try{ if(typeof refreshOpenStatements==='function') refreshOpenStatements(); }catch(e){}
  });
}

/** مسح / كاميرا: التقاط → معاينة → تأكيد الإرفاق */
function lgOpenScanAttachModal(invoiceId, onSaved, preferredName){
  const overlay = lgEl(`
    <div class="modal-overlay" id="scanOverlay">
      <div class="modal wide">
        <h3>مسح ضوئي للمستند</h3>
        <p style="font-size:13px;color:var(--ink-soft);margin:0 0 12px;">مناسب لويندوز: امسح من الماسح الضوئي، راجع الصورة، ثم ارفعها كمرفق.</p>
        <div class="btn-row" style="margin-bottom:14px;flex-wrap:wrap;gap:8px;">
          <button type="button" class="btn btn-primary" id="scanWiaBtn">🖨 مسح من الماسح الضوئي (ويندوز)</button>
          <button type="button" class="btn btn-outline" id="scanOpenWinAppBtn">فتح تطبيق مسح ويندوز</button>
          <label class="btn btn-outline" style="cursor:pointer;">
            اختيار ملف ماسح محفوظ
            <input type="file" id="scanFileInput" accept="image/*,application/pdf" style="display:none;" />
          </label>
        </div>
        <div id="scanStatus" style="font-size:13px;color:var(--ink-soft);margin-bottom:10px;"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div>
            <div style="font-weight:700;margin-bottom:6px;">كاميرا الجهاز (اختياري)</div>
            <video id="scanVideo" autoplay playsinline style="width:100%;max-height:240px;background:#111;border-radius:10px;object-fit:contain;"></video>
            <canvas id="scanCanvas" style="display:none;"></canvas>
            <div class="btn-row" style="margin-top:8px;">
              <button type="button" class="btn btn-outline btn-sm" id="scanCaptureBtn">📸 التقاط من الكاميرا</button>
              <button type="button" class="btn btn-outline btn-sm" id="scanFlipBtn">تبديل كاميرا</button>
            </div>
          </div>
          <div>
            <div style="font-weight:700;margin-bottom:6px;">المعاينة قبل الرفع</div>
            <div id="scanPreviewBox" style="min-height:240px;background:var(--paper-2);border:1px dashed var(--line);border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden;">
              <span style="color:var(--ink-soft);font-size:13px;">امسح المستند أو اختر ملفاً لعرض المعاينة هنا</span>
            </div>
            <div class="btn-row" style="margin-top:8px;">
              <button type="button" class="btn btn-outline btn-sm" id="scanRetakeBtn" disabled>مسح المعاينة</button>
            </div>
          </div>
        </div>
        <div class="modal-actions" style="margin-top:16px;">
          <button class="btn btn-outline" id="scanCancel">إلغاء</button>
          <button class="btn btn-primary" id="scanConfirm" disabled>تأكيد ورفع المرفق</button>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(overlay);

  let stream = null;
  let facingMode = 'environment';
  let capturedDataUrl = null;
  let capturedName = null;
  let capturedMime = 'image/jpeg';

  const video = document.getElementById('scanVideo');
  const canvas = document.getElementById('scanCanvas');
  const preview = document.getElementById('scanPreviewBox');
  const confirmBtn = document.getElementById('scanConfirm');
  const retakeBtn = document.getElementById('scanRetakeBtn');

  async function startCamera(){
    try{
      if(stream){ stream.getTracks().forEach(tr=>tr.stop()); }
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      video.srcObject = stream;
    }catch(err){
      preview.innerHTML = `<span style="color:var(--debt);padding:12px;text-align:center;display:block;">تعذر فتح الكاميرا: ${lgEscapeHtml(String(err.message||err))}<br><small>يمكنك اختيار صورة من الجهاز بدلاً من ذلك</small></span>`;
    }
  }

  function setPreview(dataUrl, name, mime){
    capturedDataUrl = dataUrl;
    capturedName = name || ('scan-' + new Date().toISOString().slice(0,19).replace(/[:T]/g,'-') + '.jpg');
    capturedMime = mime || 'image/jpeg';
    if(mime && mime.includes('pdf')){
      preview.innerHTML = `<div style="padding:20px;text-align:center;">📄 ملف PDF جاهز للرفع<br><strong>${lgEscapeHtml(capturedName)}</strong></div>`;
    } else {
      preview.innerHTML = `<img src="${dataUrl}" alt="معاينة" style="max-width:100%;max-height:280px;object-fit:contain;" />`;
    }
    confirmBtn.disabled = false;
    retakeBtn.disabled = false;
  }

  const statusEl = document.getElementById('scanStatus');
  document.getElementById('scanWiaBtn').addEventListener('click', async ()=>{
    statusEl.textContent = 'جاري المسح من الماسح الضوئي... انتظر حتى ينتهي الجهاز.';
    statusEl.style.color = 'var(--ink-soft)';
    const res = await window.desktopApi.scanWindows();
    if(!res || !res.ok){
      statusEl.textContent = (res && res.error) || 'فشل المسح';
      statusEl.style.color = 'var(--debt)';
      lgShowToast((res && res.error) || 'فشل المسح');
      return;
    }
    setPreview(res.base64, res.fileName || ('scan-' + Date.now() + '.jpg'), 'image/jpeg');
    statusEl.textContent = 'تم المسح — راجع المعاينة ثم اضغط تأكيد ورفع المرفق';
    statusEl.style.color = 'var(--ledger-green)';
    lgShowToast('تم المسح — راجع المعاينة');
  });
  document.getElementById('scanOpenWinAppBtn').addEventListener('click', async ()=>{
    await window.desktopApi.openWindowsScanApp();
    statusEl.textContent = 'تم فتح تطبيق مسح ويندوز. بعد المسح احفظ الصورة ثم اختر «اختيار ملف ماسح محفوظ».';
    lgShowToast('افتح الماسح، احفظ الصورة، ثم اخترها من هنا');
  });

  document.getElementById('scanCaptureBtn').addEventListener('click', ()=>{
    if(!video.videoWidth){ lgShowToast('الكاميرا غير جاهزة بعد'); return; }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setPreview(dataUrl, 'scan-' + Date.now() + '.jpg', 'image/jpeg');
    lgShowToast('راجع المعاينة ثم اضغط تأكيد ورفع');
  });

  document.getElementById('scanFlipBtn').addEventListener('click', ()=>{
    facingMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera();
  });

  document.getElementById('scanRetakeBtn').addEventListener('click', ()=>{
    capturedDataUrl = null;
    confirmBtn.disabled = true;
    retakeBtn.disabled = true;
    preview.innerHTML = '<span style="color:var(--ink-soft);font-size:13px;">لم يتم التقاط صورة بعد</span>';
  });

  document.getElementById('scanFileInput').addEventListener('change', (e)=>{
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      setPreview(reader.result, file.name, file.type || 'image/jpeg');
      lgShowToast('راجع الملف ثم اضغط تأكيد ورفع');
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('scanCancel').addEventListener('click', ()=>{
    if(stream) stream.getTracks().forEach(tr=>tr.stop());
    overlay.remove();
  });
  overlay.addEventListener('click', e=>{
    if(e.target===overlay){
      if(stream) stream.getTracks().forEach(tr=>tr.stop());
      overlay.remove();
    }
  });

  document.getElementById('scanConfirm').addEventListener('click', async ()=>{
    if(!capturedDataUrl){ lgShowToast('التقط صورة أو اختر ملفاً أولاً'); return; }
    confirmBtn.disabled = true;
    const prefer = preferredName || lgPreferredAttachNameFromInvoice(
      (document.getElementById('inv_number') && document.getElementById('inv_number').value) || ''
    );
    const nameToSave = prefer
      ? (prefer + (prefer.match(/\.[a-z0-9]+$/i) ? '' : (capturedName && capturedName.includes('.') ? capturedName.slice(capturedName.lastIndexOf('.')) : '.jpg')))
      : capturedName;
    const res = await window.desktopApi.saveAttachmentBuffer(invoiceId, nameToSave, capturedDataUrl, capturedMime, prefer || '');
    if(!res || !res.ok){
      lgShowToast((res && res.error) || 'تعذر حفظ المرفق');
      confirmBtn.disabled = false;
      return;
    }
    if(stream) stream.getTracks().forEach(tr=>tr.stop());
    overlay.remove();
    if(typeof onSaved === 'function') onSaved(res.file);
    lgShowToast('تم رفع المرفق بنجاح');
  });

  startCamera();
}

function openAddEditInvoiceModal(editId, prefillSupplierId, asReturn){
  if(guardReadOnly('تعديل فاتورة')) return;
  if(typeof hasPagePermission==='function' && !hasPagePermission("ledger.invoices", editId?'edit':'add')){ lgShowToast(editId?'🔒 ماعندكش صلاحية تعديل الفواتير':'🔒 ماعندكش صلاحية إضافة فواتير'); return; }
  const editing = editId ? DATA.ledger.invoices.find(i=>i.id===editId) : null;
  const supId = editing ? editing.supplierId : (prefillSupplierId || '');
  if(DATA.ledger.suppliers.length===0){ lgShowToast('أضِف مورداً أولاً قبل إدخال فاتورة'); return; }

  const v = editing || { baseValue:'', vat:'', stampDuty:'', discountRate:'', withheld:'', totalInvoice:'', netInvoice:'' };
  const selectedSupplier = supId ? supplierById(supId) : null;
  const isReturn = editing ? !!editing.isReturn : !!asReturn;

  const overlay = lgEl(`
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal wide">
        <h3>${editing?(editing.isReturn?'تعديل مرتجع':'تعديل الفاتورة'):(isReturn?'إضافة مرتجع جديد':'إضافة فاتورة جديدة')}</h3>
        <label class="field" style="display:flex;flex-direction:row;align-items:center;gap:8px;background:var(--paper);border:1px solid var(--line);border-radius:8px;padding:9px 12px;">
          <input type="checkbox" id="inv_isReturn" ${isReturn?'checked':''} style="width:16px;height:16px;" />
          <span style="font-weight:700;font-size:13px;">هذا مرتجع (يُخصم من رصيد المورد بدل ما يُضاف عليه)</span>
        </label>
        <div id="inv_linkedWrap" class="field" style="display:${isReturn?'block':'none'};margin:10px 0;background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:10px 12px;">
          <label style="font-weight:800;margin-bottom:6px;display:block;">ربط بفاتورة أصلية (اختياري)</label>
          <p style="font-size:12px;color:var(--ink-soft);margin:0 0 8px;">تقدر تربط المرتجع بفاتورة معيّنة (مرتجع كامل → الفاتورة الأصلية تُلغى، مرتجع جزئي مع خصم → يُميَّز إشعار خصم على الفاتورة الأصلية)، أو تسيبه بدون ربط ليكون مرتجع مطلق مش مرتبط بفاتورة بعينها.</p>
          <select id="inv_linkedInvoice" style="width:100%;"><option value="">— مرتجع مطلق (بدون ربط بفاتورة) —</option></select>
          <p id="inv_linkedHint" style="font-size:12px;color:var(--ink-soft);margin:8px 0 0;"></p>
        </div>
        <div class="form-grid" style="margin-bottom:0;">
          <div class="field" style="grid-column:1 / -1;"><label>اسم المورد *</label>
            <div class="ss-cell ss-cell-wide">
              <input id="inv_supplier_name" class="supplier-select-wide" type="text"
                value="${lgEscapeHtml(selectedSupplier?selectedSupplier.name||'':'')}"
                data-combo-id="${lgEscapeHtml(supId||'')}"
                placeholder="ابحث أو اكتب اسم المورد..."
                autocomplete="off" />
              <input type="hidden" id="inv_supplier" value="${lgEscapeHtml(supId||'')}" />
            </div>
          </div>
        </div>
        <div class="form-grid cols5" style="margin-top:10px;">
          <div class="field"><label>رقم التسجيل الضريبي</label><input id="inv_taxid_display" value="${lgEscapeHtml(selectedSupplier?selectedSupplier.taxId||'':'')}" disabled style="opacity:.7;" /></div>
          <div class="field"><label>السجل التجاري</label><input id="inv_commreg_display" value="${lgEscapeHtml(selectedSupplier?selectedSupplier.commercialReg||'':'')}" disabled style="opacity:.7;" /></div>
          <div class="field"><label>رقم الفاتورة *</label><input id="inv_number" value="${lgEscapeHtml(editing?editing.invoiceNo:'')}" /></div>
          <div class="field"><label>تاريخ التعامل</label><input type="date" id="inv_date" value="${escapeHtml(editing?editing.date||'':'')}" /></div>
          <div class="field" id="inv_dueDateWrap" style="${isReturn?'display:none':''}"><label>تاريخ الاستحقاق</label><input type="date" id="inv_dueDate" value="${escapeHtml(editing&&!isReturn?(editing.dueDate||''):'')}" title="لو فاضي هيتحسب تلقائي = تاريخ الفاتورة + 30 يوم" /></div>
        </div>

        <div class="form-grid cols5" style="margin-top:10px;">
          <div class="field" style="grid-column:1/-1;">
            <label>الأصناف (الصنف / كود المورد / الكود الداخلي / وصف الصنف / الكمية / سعر الوحدة)</label>
            <div style="display:grid;grid-template-columns:1.2fr 0.9fr 0.9fr 1fr 0.7fr 0.7fr auto;gap:6px;margin-bottom:4px;font-size:11px;color:var(--ink-soft);font-weight:700;">
              <span>الصنف</span><span>كود المورد</span><span>الكود الداخلي</span><span>وصف الصنف</span><span>الكمية</span><span>سعر الوحدة</span><span></span>
            </div>
            <div id="inv_itemsWrap"></div>
            <button type="button" class="btn btn-outline btn-sm" id="inv_addItemBtn" style="margin-top:4px;">+ إضافة صنف</button>
          </div>
        </div>
        <datalist id="internalCodeListModal">${allInternalCodes().map(c=>`<option value="${lgEscapeHtml(c)}">`).join('')}</datalist>
        <datalist id="supplierItemCodeListModal">${allSupplierItemCodes().map(c=>`<option value="${lgEscapeHtml(c)}">`).join('')}</datalist>
        <datalist id="itemNameListModal">${(typeof allItemNames==='function'?allItemNames():[]).map(c=>`<option value="${lgEscapeHtml(c)}">`).join('')}</datalist>
        <datalist id="itemDescListModal">${(typeof allItemDescriptions==='function'?allItemDescriptions():[]).map(c=>`<option value="${lgEscapeHtml(c)}">`).join('')}</datalist>
        <datalist id="categoryListModal2">${allCategories().map(c=>`<option value="${lgEscapeHtml(c)}">`).join('')}</datalist>
        <datalist id="projectListModal2">${allProjects().map(c=>`<option value="${lgEscapeHtml(c)}">`).join('')}</datalist>

        <div class="form-grid cols5" style="margin-top:10px;">
          <div class="field"><label>القيمة الإجمالية للتعامل *</label><input type="text" inputmode="decimal" data-money="pos" dir="ltr" autocomplete="off" style="text-align:right;" id="inv_baseValue" value="${fmtInput(v.baseValue)}" placeholder="٠.٠٠" /></div>
          <div class="field"><label>ضريبة القيمة المضافة</label><input type="text" inputmode="decimal" data-money="pos" dir="ltr" autocomplete="off" style="text-align:right;" id="inv_vat" value="${fmtInput(v.vat)}" placeholder="٠.٠٠" /></div>
          <div class="field"><label>الدمغات</label><input type="text" inputmode="decimal" data-money="pos" dir="ltr" autocomplete="off" style="text-align:right;" id="inv_stampDuty" value="${fmtInput(v.stampDuty||'')}" placeholder="٠.٠٠" /></div>
          <div class="field"><label>نسبة الخصم %</label><input type="number" step="any" id="inv_discountRate" value="${escapeHtml(editing?editing.discountRate||'':'')}" placeholder="اختياري" /></div>
          <div class="field"><label>المبلغ المخصوم</label><input type="text" inputmode="decimal" data-money="pos" dir="ltr" autocomplete="off" style="text-align:right;" id="inv_withheld" value="${fmtInput(v.withheld)}" placeholder="٠.٠٠" /></div>
        </div>

        <div class="form-grid cols5" style="margin-top:10px;">
          <div class="field"><label>إجمالي الفاتورة</label><input type="text" dir="ltr" id="inv_totalInvoice" value="${fmtInput(v.totalInvoice)}" placeholder="يُحسب تلقائياً" readonly style="background:var(--paper-2);font-weight:800;text-align:right;" /></div>
          <div class="field"><label>صافي الفاتورة</label><input type="text" dir="ltr" id="inv_netInvoice" value="${fmtInput(v.netInvoice)}" placeholder="يُحسب تلقائياً" readonly style="background:var(--paper-2);font-weight:800;text-align:right;" /></div>
          <div class="field"><label>طبيعة التعامل</label>
            <div class="ss-cell">
              <input id="inv_nature_label" type="text" placeholder="اكتب أو اختر طبيعة التعامل..." autocomplete="off"
                value="${(function(){ const c=editing?editing.nature:''; if(!c) return ''; const o=(NATURE_OPTIONS||[]).find(x=>x.code===c); return o?(o.code+' - '+o.label):c; })()}"
                data-combo-id="${lgEscapeHtml(editing?editing.nature||'':'')}" />
              <input type="hidden" id="inv_nature" value="${lgEscapeHtml(editing?editing.nature||'':'')}" />
            </div>
          </div>
          <div class="field"><label>نوع الخصم</label>
            <div class="ss-cell">
              <input id="inv_discountType_label" type="text" placeholder="اكتب أو اختر نوع الخصم..." autocomplete="off"
                value="${(function(){ const c=editing?editing.discountType:''; if(!c) return ''; const o=(DISCOUNT_TYPE_OPTIONS||[]).find(x=>x.code===c); return o?(o.code+' - '+o.label):c; })()}"
                data-combo-id="${lgEscapeHtml(editing?editing.discountType||'':'')}" />
              <input type="hidden" id="inv_discountType" value="${lgEscapeHtml(editing?editing.discountType||'':'')}" />
            </div>
          </div>
          <div class="field"><label>حالة المبلغ المخصوم</label>
            <select id="inv_withheldStatus">
              <option value="unpaid" ${(!editing||editing.withheldStatus!=='paid')?'selected':''}>لم يتم الدفع للضرائب</option>
              <option value="paid" ${(editing&&editing.withheldStatus==='paid')?'selected':''}>تم الدفع للضرائب</option>
            </select>
          </div>
        </div>

        <p style="font-size:11.5px;color:var(--ink-soft);margin:10px 0 0;">منظومة موحّدة للفاتورة والمرتجع: <strong>الإجمالي = قيمة + ضريبة + دمغة</strong>، <strong>المخصوم = قيمة × نسبة الخصم</strong>، <strong>الصافي = الإجمالي − المخصوم</strong>. مثال: 1000+140=1140 ومخصوم 10 → صافي 1130. المرتجع بنفس المعادلة (عملية عكسية). كشف الحساب والرصيد على الصافي.</p>

        <div class="form-grid cols3" style="margin-top:12px;">
          <div class="field"><label>نوع الفاتورة (التصنيف)</label>
            <div class="ss-cell"><input id="inv_category" value="${lgEscapeHtml(editing?editing.category||'':'')}" placeholder="اكتب أو اختر تصنيف..." autocomplete="off" /></div>
          </div>
          <div class="field"><label>المشروع</label>
            <div class="ss-cell"><input id="inv_project" value="${lgEscapeHtml(editing?editing.project||'':'')}" placeholder="اكتب أو اختر مشروع..." autocomplete="off" /></div>
          </div>
          <div class="field"><label>لينك الفاتورة</label>
            <div style="display:flex;gap:6px;">
              <input id="inv_invoiceLink" type="url" value="${lgEscapeHtml(editing?editing.invoiceLink||'':'')}" placeholder="رابط الفاتورة الأصلية على النت (اختياري)" style="flex:1;" />
              <button type="button" class="btn btn-outline btn-sm" id="inv_openLinkBtn" title="فتح الرابط في المتصفح" style="white-space:nowrap;">🔗 فتح</button>
            </div>
          </div>
        </div>

        <div class="field" style="margin-top:12px;">
          <label>الملاحظات</label>
          <textarea id="inv_notes" rows="3" placeholder="ملاحظات على الفاتورة أو المرتجع (اختياري)..." style="width:100%;resize:vertical;min-height:72px;">${lgEscapeHtml(editing?editing.notes||'':'')}</textarea>
        </div>

        <div class="section-title" style="margin-top:14px;font-size:14px;">المرفقات (مسح ضوئي)</div>
        <div id="invFormAttList" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;"></div>
        <button type="button" class="btn btn-outline btn-sm" id="invFormScanAtt">📷 مسح ضوئي / كاميرا</button>

        <div class="modal-actions">
          <button class="btn btn-outline" id="m_cancel">إلغاء</button>
          <button class="btn btn-primary" id="m_save">${editing?'حفظ التعديل':'إضافة الفاتورة'}</button>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(overlay);
  if(typeof ensureModalInputsEditable==='function') ensureModalInputsEditable(overlay);
  document.getElementById('m_cancel').addEventListener('click', ()=>overlay.remove());
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });

  /* ---- صفوف الأصناف (الصنف / كود المورد / الكود الداخلي / وصف الصنف / الكمية / سعر الوحدة) — قابلة للتكرار ---- */
  let itemLinkMaps = null;
  function currentInvoiceSupplierId(){
    const lgEl = document.getElementById('inv_supplier');
    return (lgEl && lgEl.value) ? String(lgEl.value) : '';
  }
  function refreshItemLinkMaps(){
    const sid = currentInvoiceSupplierId();
    itemLinkMaps = (typeof buildItemLinkMaps==='function') ? buildItemLinkMaps(sid || null) : null;
    return itemLinkMaps;
  }
  refreshItemLinkMaps();
  function itemRowHtml(vals){
    vals = vals || { desc:'', supplierCode:'', internalCode:'', itemDescription:'', quantity:'', unitPrice:'' };
    // كل خانة اقتراح جوه .ss-cell عشان القائمة absolute تحتها مباشرة (نفس إحداثيات الـ zoom)
    return `
      <div class="item-row" data-item-row style="display:grid;grid-template-columns:1.2fr 0.9fr 0.9fr 1fr 0.7fr 0.7fr auto;gap:6px;margin-bottom:8px;align-items:start;">
        <div class="ss-cell"><input class="inv-item-desc" value="${lgEscapeHtml(vals.desc)}" placeholder="الصنف" autocomplete="off" /></div>
        <div class="ss-cell"><input class="inv-item-supplierCode" value="${lgEscapeHtml(vals.supplierCode)}" placeholder="كود المورد" autocomplete="off" /></div>
        <div class="ss-cell"><input class="inv-item-internalCode" value="${lgEscapeHtml(vals.internalCode)}" placeholder="الكود الداخلي" autocomplete="off" /></div>
        <div class="ss-cell"><input class="inv-item-itemDescription" value="${lgEscapeHtml(vals.itemDescription)}" placeholder="وصف الصنف" autocomplete="off" /></div>
        <input class="inv-item-quantity" value="${lgEscapeHtml(vals.quantity)}" placeholder="الكمية" />
        <input class="inv-item-unitPrice" type="text" inputmode="decimal" data-money="pos" dir="ltr" autocomplete="off" style="text-align:right;" value="${lgEscapeHtml(fmtInputText(vals.unitPrice))}" placeholder="سعر الوحدة" />
        <button type="button" class="row-btn del" data-remove-item title="حذف الصنف" style="margin-top:6px;">✕</button>
      </div>`;
  }
  function splitLines(s){ return String(s||'').split('\n'); }
  // ربط تلقائي: اختيار/كتابة كود المورد أو الكود الداخلي يملأ اسم الصنف ووصفه تلقائيًا (والعكس)،
  // بناءً على أقرب فاتورة سابقة استخدمت نفس الكود/الاسم — وتفضل الحقول قابلة للتعديل يدويًا.
  // ملاحظة: "الكمية" مش بتتملى تلقائيًا لأنها بتختلف من فاتورة لتانية حتى لو نفس الصنف.
  function wireItemRowAutoLink(row){
    if(row.__autoLinkWired) return;
    row.__autoLinkWired = true;
    const descEl = row.querySelector('.inv-item-desc');
    const scEl = row.querySelector('.inv-item-supplierCode');
    const icEl = row.querySelector('.inv-item-internalCode');
    const idEl = row.querySelector('.inv-item-itemDescription');
    const upEl = row.querySelector('.inv-item-unitPrice');
    if(!descEl || !scEl || !icEl) return;

    const maps = itemLinkMaps || (typeof buildItemLinkMaps==='function' ? buildItemLinkMaps() : null);

    const applyInfo = (info, source)=>{
      if(!info) return;
      // املأ الحقول الفاضية فقط؛ لو المصدر حدد قيمة نثبتها
      const setIfEmpty = (lgEl, val)=>{
        if(!lgEl || val==null || val==='') return;
        if(!(lgEl.value||'').trim()) lgEl.value = val;
      };
      if(source !== 'desc') setIfEmpty(descEl, info.desc);
      if(source !== 'supplierCode') setIfEmpty(scEl, info.supplierCode);
      if(source !== 'internalCode') setIfEmpty(icEl, info.internalCode);
      if(source !== 'itemDescription' && idEl) setIfEmpty(idEl, info.itemDescription);
      if(upEl) setIfEmpty(upEl, fmtInputText(info.unitPrice));
    };

    const lookup = (kind, value)=>{
      const v = String(value||'').trim();
      const sid = typeof currentInvoiceSupplierId==='function' ? currentInvoiceSupplierId() : '';
      const m = (typeof buildItemLinkMaps==='function') ? buildItemLinkMaps(sid || null) : maps;
      if(!v || !m) return null;
      if(kind==='desc') return m.byDesc.get(v) || null;
      if(kind==='supplierCode') return m.bySupplierCode.get(v) || null;
      if(kind==='internalCode') return m.byInternalCode.get(v) || null;
      if(kind==='itemDescription') return (m.byItemDesc && m.byItemDesc.get(v)) || null;
      return null;
    };

    // حفظ اقتراح جديد
    const rememberBlur = (lgEl, listKey)=>{
      if(!lgEl) return;
      lgEl.addEventListener('blur', ()=>{
        const v = (lgEl.value||'').trim();
        if(!v) return;
        if(typeof rememberCodeList==='function') rememberCodeList(listKey, v);
      });
    };
    rememberBlur(descEl, 'customItemNames');
    rememberBlur(scEl, 'customSupplierItemCodes');
    rememberBlur(icEl, 'customInternalCodes');
    rememberBlur(idEl, 'customItemDescriptions');

    // اقتراحات ذكية + ملء مرتبط
    if(typeof attachSmartItemSuggest==='function'){
      const mapsFor = ()=>{
        const sid = typeof currentInvoiceSupplierId==='function' ? currentInvoiceSupplierId() : '';
        return (typeof buildItemLinkMaps==='function') ? buildItemLinkMaps(sid || null) : maps;
      };
      attachSmartItemSuggest(descEl, {
        getItems: ()=>{
          const sid = typeof currentInvoiceSupplierId==='function' ? currentInvoiceSupplierId() : '';
          return typeof buildItemSuggestEntries==='function' ? buildItemSuggestEntries('desc', mapsFor(), sid) : [];
        },
        onSelect: (it)=>{
          descEl.value = it.value || '';
          applyInfo(it.info || lookup('desc', it.value), 'desc');
        }
      });
      attachSmartItemSuggest(scEl, {
        getItems: ()=>{
          const sid = typeof currentInvoiceSupplierId==='function' ? currentInvoiceSupplierId() : '';
          return typeof buildItemSuggestEntries==='function' ? buildItemSuggestEntries('supplierCode', mapsFor(), sid) : [];
        },
        onSelect: (it)=>{
          scEl.value = it.value || '';
          applyInfo(it.info || lookup('supplierCode', it.value), 'supplierCode');
        }
      });
      attachSmartItemSuggest(icEl, {
        getItems: ()=>{
          const sid = typeof currentInvoiceSupplierId==='function' ? currentInvoiceSupplierId() : '';
          return typeof buildItemSuggestEntries==='function' ? buildItemSuggestEntries('internalCode', mapsFor(), sid) : [];
        },
        onSelect: (it)=>{
          icEl.value = it.value || '';
          applyInfo(it.info || lookup('internalCode', it.value), 'internalCode');
        }
      });
      if(idEl){
        attachSmartItemSuggest(idEl, {
          getItems: ()=>{
            const sid = typeof currentInvoiceSupplierId==='function' ? currentInvoiceSupplierId() : '';
            return typeof buildItemSuggestEntries==='function' ? buildItemSuggestEntries('itemDescription', mapsFor(), sid) : [];
          },
          onSelect: (it)=>{
            idEl.value = it.value || '';
            applyInfo(it.info || lookup('itemDescription', it.value), 'itemDescription');
          }
        });
      }
    }

    // لو كتب يدويًا قيمة مطابقة تمامًا لاقتراح — اربط
    const tryLink = (kind, lgEl)=>{
      const info = lookup(kind, lgEl.value);
      if(info) applyInfo(info, kind);
    };
    descEl.addEventListener('change', ()=> tryLink('desc', descEl));
    scEl.addEventListener('change', ()=> tryLink('supplierCode', scEl));
    icEl.addEventListener('change', ()=> tryLink('internalCode', icEl));
    if(idEl) idEl.addEventListener('change', ()=> tryLink('itemDescription', idEl));
  }
  function wireItemRowButtons(){
    const wrap = document.getElementById('inv_itemsWrap');
    if(!wrap) return;
    wrap.querySelectorAll('[data-remove-item]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const rows = wrap.querySelectorAll('[data-item-row]');
        if(rows.length <= 1){ lgShowToast('لازم يفضل صنف واحد على الأقل'); return; }
        btn.closest('[data-item-row]').remove();
      });
    });
    wrap.querySelectorAll('[data-item-row]').forEach(wireItemRowAutoLink);
  }
  // نبني الصفوف الأولى من بيانات الفاتورة (لو تعديل) أو صف فاضي واحد (لو إضافة)
  (function(){
    const wrap = document.getElementById('inv_itemsWrap');
    if(wrap){
      const rows = editing ? (function(){
        const d = splitLines(editing.description), sc = splitLines(editing.supplierItemCode), ic = splitLines(editing.internalCode);
        const idesc = splitLines(editing.itemDescription), qty = splitLines(editing.quantity), up = splitLines(editing.unitPrice);
        const n = Math.max(d.length, sc.length, ic.length, idesc.length, qty.length, 1);
        const out = [];
        for(let i=0;i<n;i++) out.push({ desc: d[i]||'', supplierCode: sc[i]||'', internalCode: ic[i]||'', itemDescription: idesc[i]||'', quantity: qty[i]||'', unitPrice: (typeof up!=='undefined'?up[i]:'')||'' });
        return out;
      })() : [{ desc:'', supplierCode:'', internalCode:'', itemDescription:'', quantity:'' }];
      wrap.innerHTML = rows.map(itemRowHtml).join('');
      wireItemRowButtons();
    }
  })();
  const addItemBtn = document.getElementById('inv_addItemBtn');
  if(addItemBtn) addItemBtn.addEventListener('click', ()=>{
    const wrap = document.getElementById('inv_itemsWrap');
    if(!wrap) return;
    wrap.insertAdjacentHTML('beforeend', itemRowHtml());
    wireItemRowButtons();
  });
  function collectItemRows(){
    const wrap = document.getElementById('inv_itemsWrap');
    if(!wrap) return { desc:'', supplierCode:'', internalCode:'', itemDescription:'', quantity:'' };
    const rows = Array.from(wrap.querySelectorAll('[data-item-row]')).map(r=>({
      desc: r.querySelector('.inv-item-desc').value.trim(),
      supplierCode: r.querySelector('.inv-item-supplierCode').value.trim(),
      internalCode: r.querySelector('.inv-item-internalCode').value.trim(),
      itemDescription: r.querySelector('.inv-item-itemDescription').value.trim(),
      quantity: r.querySelector('.inv-item-quantity').value.trim(),
      unitPrice: plainMoneyText((r.querySelector('.inv-item-unitPrice')||{value:''}).value)
    })).filter(r=> r.desc || r.supplierCode || r.internalCode || r.itemDescription || r.quantity || r.unitPrice);
    return {
      desc: rows.map(r=>r.desc).join('\n'),
      supplierCode: rows.map(r=>r.supplierCode).join('\n'),
      internalCode: rows.map(r=>r.internalCode).join('\n'),
      itemDescription: rows.map(r=>r.itemDescription).join('\n'),
      quantity: rows.map(r=>r.quantity).join('\n'),
      unitPrice: rows.map(r=>r.unitPrice).join('\n')
    };
  }

  // مرفقات أثناء الإضافة/التعديل
  const formAttachId = editId || ('tmp_' + Date.now().toString(36));
  let formAttachments = editing && Array.isArray(editing.attachments) ? editing.attachments.slice() : [];
  function renderFormAttachments(){
    const box = document.getElementById('invFormAttList');
    if(!box) return;
    box.innerHTML = formAttachments.length ? formAttachments.map(a=>`
      <div class="pill" style="padding:6px 10px;display:flex;align-items:center;gap:6px;">
        <button type="button" class="row-btn" data-form-open-att="${lgEscapeHtml(a.path)}">${lgEscapeHtml(a.name)}</button>
        <button type="button" class="row-btn del" data-form-del-att="${lgEscapeHtml(a.id)}" title="حذف">✕</button>
      </div>`).join('') : '<span style="color:var(--ink-soft);font-size:13px;">لا توجد مرفقات بعد</span>';
    box.querySelectorAll('[data-form-open-att]').forEach(btn=>{
      btn.addEventListener('click', ()=> window.desktopApi.openAttachment(btn.getAttribute('data-form-open-att')));
    });
    box.querySelectorAll('[data-form-del-att]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const attId = btn.getAttribute('data-form-del-att');
        const att = formAttachments.find(x=>x.id===attId);
        if(att && att.path) await window.desktopApi.deleteAttachment(att.path);
        formAttachments = formAttachments.filter(x=>x.id!==attId);
        renderFormAttachments();
      });
    });
  }
  renderFormAttachments();
  const scanAttBtn = document.getElementById('invFormScanAtt');
  if(scanAttBtn) scanAttBtn.addEventListener('click', ()=>{
    const invNo = (document.getElementById('inv_number')||{}).value || (editing && editing.invoiceNo) || '';
    lgOpenScanAttachModal(formAttachId, (file)=>{
      formAttachments = formAttachments.concat([file]);
      renderFormAttachments();
    }, lgPreferredAttachNameFromInvoice(invNo));
  });

  const bvEl = document.getElementById('inv_baseValue');
  const vatEl = document.getElementById('inv_vat');
  const stampEl = document.getElementById('inv_stampDuty');
  const drEl = document.getElementById('inv_discountRate');
  const whEl = document.getElementById('inv_withheld');
  const totEl = document.getElementById('inv_totalInvoice');
  const netEl = document.getElementById('inv_netInvoice');
  const supplierEl = document.getElementById('inv_supplier');
  const supplierNameEl = document.getElementById('inv_supplier_name');
  const taxIdDisplay = document.getElementById('inv_taxid_display');
  // قائمة موردين قابلة للكتابة والبحث
  if(supplierNameEl && typeof attachSmartCombo==='function'){
    if(supId) supplierNameEl.dataset.comboId = supId;
    attachSmartCombo(supplierNameEl, {
      getItems: ()=> typeof getSupplierComboItems==='function' ? getSupplierComboItems() : [],
      allowFreeText: false,
      clearIdOnType: true,
      resolveOnBlur: true,
      maxItems: 80,
      onSelect: (it)=>{
        const id = it.id || '';
        supplierNameEl.dataset.comboId = id;
        if(supplierEl){
          supplierEl.value = id;
          supplierEl.dispatchEvent(new Event('change', { bubbles:true }));
        }
        const sp = typeof supplierById==='function' ? supplierById(id) : null;
        if(taxIdDisplay) taxIdDisplay.value = sp ? (sp.taxId||'') : '';
        const cr = document.getElementById('inv_commreg_display');
        if(cr) cr.value = sp ? (sp.commercialReg||'') : '';
        if(typeof fillLinkedInvoices==='function') fillLinkedInvoices();
      }
    });
    supplierNameEl.addEventListener('change', ()=>{
      const id = supplierNameEl.dataset.comboId || '';
      if(supplierEl) supplierEl.value = id;
    });
    supplierNameEl.addEventListener('blur', ()=>{
      setTimeout(()=>{
        const id = supplierNameEl.dataset.comboId || '';
        if(supplierEl) supplierEl.value = id;
        const sp = id && typeof supplierById==='function' ? supplierById(id) : null;
        if(taxIdDisplay) taxIdDisplay.value = sp ? (sp.taxId||'') : '';
        const cr = document.getElementById('inv_commreg_display');
        if(cr) cr.value = sp ? (sp.commercialReg||'') : '';
      }, 200);
    });
  }

  function formatAmtInput(n){
    const x = roundMoney(n, 6);
    return isFinite(x) ? fmtInput(x) : '٠';
  }
  function recalcTotals(){
    if(!bvEl || !vatEl || !stampEl || !whEl || !totEl || !netEl) return;
    const bv = parseAmount(bvEl.value);
    const vat = parseAmount(vatEl.value);
    const stamp = parseAmount(stampEl.value);
    const wh = parseAmount(whEl.value);
    // منظومة موحّدة (فاتورة ومرتجع):
    // Gross = P + VAT + Stamp | Net = Gross − WHT
    const tot = bv + vat + stamp;
    const net = tot - wh;
    totEl.value = formatAmtInput(tot);
    netEl.value = formatAmtInput(net);
  }
  /** نسبة الخصم × القيمة الإجمالية للتعامل = المبلغ المخصوم (ما لم يعدّله المستخدم يدويًا بعد النسبة) */
  function suggestWithheld(force){
    if(!force && whEl.dataset.manual === '1'){ recalcTotals(); return; }
    const bv = parseAmount(bvEl.value);
    const dr = parseAmount(drEl.value);
    if(dr > 0){
      whEl.value = formatAmtInput(bv * dr / 100);
    } else if(force || whEl.dataset.manual !== '1'){
      if(!whEl.value || parseAmount(whEl.value)===0) whEl.value = '٠';
    }
    recalcTotals();
  }
  bvEl.addEventListener('input', ()=> suggestWithheld(false));
  bvEl.addEventListener('change', ()=> suggestWithheld(false));
  vatEl.addEventListener('input', recalcTotals);
  stampEl.addEventListener('input', recalcTotals);
  whEl.addEventListener('input', ()=>{ whEl.dataset.manual = '1'; recalcTotals(); });
  whEl.addEventListener('change', ()=>{ whEl.dataset.manual = '1'; recalcTotals(); });
  // عند فتح النموذج: لو فيه نسبة مخصومة مسبقاً احسب المخصوم
  if(drEl && drEl.value && !whEl.dataset.manual) suggestWithheld(true);
  else recalcTotals();

  
  // ---- ربط المرتجع بالفاتورة الأصلية ----
  const linkedWrap = document.getElementById('inv_linkedWrap');
  const linkedSel = document.getElementById('inv_linkedInvoice');
  const linkedHint = document.getElementById('inv_linkedHint');
  const linkedPrefill = editing && editing.linkedInvoiceId ? editing.linkedInvoiceId : '';
  const commRegDisplay = document.getElementById('inv_commreg_display');

  function fillLinkedInvoices(){
    if(!linkedSel) return;
    const sid = supplierEl.value;
    const invs = DATA.ledger.invoices.filter(i=>i.supplierId===sid && !i.isReturn && !i.cancelled)
      .sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    linkedSel.innerHTML = '<option value="">— مرتجع مطلق (بدون ربط بفاتورة) —</option>' + invs.map(i=>{
      return `<option value="${i.id}" ${i.id===linkedPrefill?'selected':''}>${lgEscapeHtml(i.invoiceNo||'-')} | ${lgEscapeHtml(lgFmtDate(i.date))} | صافي ${fmt(i.netInvoice)}${i.postReturnWht?' (بعد مرتجع)':''}</option>`;
    }).join('');
    if(linkedPrefill){
      const old = DATA.ledger.invoices.find(i=>i.id===linkedPrefill);
      if(old && !invs.find(i=>i.id===linkedPrefill)){
        linkedSel.innerHTML += `<option value="${old.id}" selected>${lgEscapeHtml(old.invoiceNo||old.id)} (مرتبطة)</option>`;
      }
    }
    updateLinkedHint();
  }
  function updateLinkedHint(){
    if(!linkedHint || !linkedSel) return;
    const lid = linkedSel.value;
    if(!lid){ linkedHint.textContent = 'مرتجع مطلق غير مرتبط بفاتورة معيّنة — هيُخصم من رصيد المورد بس مش هيتم إلغاء أو تمييز أي فاتورة تانية.'; return; }
    const inv = DATA.ledger.invoices.find(i=>i.id===lid);
    if(!inv){ linkedHint.textContent=''; return; }
    const rNet = parseAmount(netEl.value);
    const full = rNet > 0 && Math.abs(rNet - Number(inv.netInvoice||0)) < 0.02;
    linkedHint.innerHTML = full
      ? `مرتجع <strong>كامل</strong> لصافي الفاتورة ${fmt(inv.netInvoice)} → سيتم وسم الفاتورة <strong>فاتورة ملغاة</strong>.`
      : `مرتجع جزئي على فاتورة ${lgEscapeHtml(inv.invoiceNo||'')} (صافي ${fmt(inv.netInvoice)}). لو فيها خصم ضريبي سيُميَّز إشعار الخصم بعد المرتجع.`;
  }
  function toggleReturnLinkUI(){
    const isRet = !!(document.getElementById('inv_isReturn') && document.getElementById('inv_isReturn').checked);
    if(linkedWrap) linkedWrap.style.display = isRet ? 'block' : 'none';
    if(isRet) fillLinkedInvoices();
    else if(linkedSel) linkedSel.value = '';
  }
  if(linkedSel){
    linkedSel.addEventListener('change', updateLinkedHint);
  }
  // تحديث التلميح عند تغيير المبالغ
  [bvEl, vatEl, stampEl, whEl, drEl].forEach(lgEl=>{
    if(lgEl) lgEl.addEventListener('input', ()=> setTimeout(updateLinkedHint, 0));
  });
  fillLinkedInvoices();
  toggleReturnLinkUI();

  const isRetEl = document.getElementById('inv_isReturn');
  if(isRetEl) isRetEl.addEventListener('change', ()=>{
    const dueWrap = document.getElementById('inv_dueDateWrap');
    if(dueWrap) dueWrap.style.display = isRetEl.checked ? 'none' : '';
    if(isRetEl.checked){
      const d = document.getElementById('inv_dueDate');
      if(d) d.value = '';
    }
    toggleReturnLinkUI();
    recalcTotals();
  });

  // تصنيف / مشروع — قابلة للكتابة مع اقتراحات
  const catEl = document.getElementById('inv_category');
  const projEl = document.getElementById('inv_project');
  if(catEl && typeof attachSmartCombo==='function'){
    attachSmartCombo(catEl, {
      getItems: ()=> typeof getCategoryComboItems==='function' ? getCategoryComboItems() : (typeof allCategories==='function'?allCategories():[]).map(c=>({ value:c, label:c })),
      allowFreeText: true,
      resolveOnBlur: false
    });
  }
  if(projEl && typeof attachSmartCombo==='function'){
    attachSmartCombo(projEl, {
      getItems: ()=> typeof getProjectComboItems==='function' ? getProjectComboItems() : (typeof allProjects==='function'?allProjects():[]).map(c=>({ value:c, label:c })),
      allowFreeText: true,
      resolveOnBlur: false
    });
  }
  // طبيعة التعامل / نوع الخصم — كتابة + بحث
  const natureLabel = document.getElementById('inv_nature_label');
  const natureHidden = document.getElementById('inv_nature');
  if(natureLabel && typeof attachSmartCombo==='function'){
    attachSmartCombo(natureLabel, {
      getItems: ()=> typeof getNatureComboItems==='function' ? getNatureComboItems() : [],
      allowFreeText: false,
      clearIdOnType: true,
      resolveOnBlur: true,
      onSelect: (it)=>{
        natureLabel.dataset.comboId = it.id || it.value || '';
        if(natureHidden) natureHidden.value = it.id || it.value || '';
      }
    });
    natureLabel.addEventListener('change', ()=>{ if(natureHidden) natureHidden.value = natureLabel.dataset.comboId || ''; });
  }
  const discLabel = document.getElementById('inv_discountType_label');
  const discHidden = document.getElementById('inv_discountType');
  if(discLabel && typeof attachSmartCombo==='function'){
    attachSmartCombo(discLabel, {
      getItems: ()=> typeof getDiscountTypeComboItems==='function' ? getDiscountTypeComboItems() : [],
      allowFreeText: false,
      clearIdOnType: true,
      resolveOnBlur: true,
      onSelect: (it)=>{
        discLabel.dataset.comboId = it.id || it.value || '';
        if(discHidden) discHidden.value = it.id || it.value || '';
      }
    });
    discLabel.addEventListener('change', ()=>{ if(discHidden) discHidden.value = discLabel.dataset.comboId || ''; });
  }

  supplierEl.addEventListener('change', ()=>{
    const sp = supplierById(supplierEl.value);
    taxIdDisplay.value = sp ? (sp.taxId||'') : '';
    if(commRegDisplay) commRegDisplay.value = sp ? (sp.commercialReg||'') : '';
    fillLinkedInvoices();
    try{
      if(typeof refreshItemLinkMaps==='function') refreshItemLinkMaps();
      const wrap = document.getElementById('inv_itemsWrap');
      if(wrap) wrap.querySelectorAll('input').forEach(inp=>{
        if(typeof inp.__comboInvalidate==='function') inp.__comboInvalidate();
      });
    }catch(e){}
  });
  function onDiscountRateChange(){
    delete whEl.dataset.manual;
    suggestWithheld(true);
  }
  drEl.addEventListener('input', onDiscountRateChange);
  drEl.addEventListener('change', onDiscountRateChange);

  const openLinkBtn = document.getElementById('inv_openLinkBtn');
  if(openLinkBtn) openLinkBtn.addEventListener('click', async ()=>{
    const linkInput = document.getElementById('inv_invoiceLink');
    const url = linkInput ? linkInput.value.trim() : '';
    if(!url){ lgShowToast('اكتب رابط الفاتورة الأصلية الأول'); return; }
    if(!/^https?:\/\//i.test(url)){ lgShowToast('الرابط لازم يبدأ بـ http:// أو https://'); return; }
    if(window.desktopApi && window.desktopApi.openExternalLink){
      const r = await window.desktopApi.openExternalLink(url);
      if(!r || !r.ok) lgShowToast((r&&r.error)||'تعذر فتح الرابط');
    }
  });

  document.getElementById('m_save').addEventListener('click', ()=>{
    const supplierId = document.getElementById('inv_supplier').value;
    const invoiceNo = document.getElementById('inv_number').value.trim();
    const date = document.getElementById('inv_date').value;
    const isReturnCheckedEarly = !!(document.getElementById('inv_isReturn') && document.getElementById('inv_isReturn').checked);
    const dueDate = isReturnCheckedEarly ? '' : (document.getElementById('inv_dueDate').value || '');
    const category = document.getElementById('inv_category').value.trim();
    const project = document.getElementById('inv_project').value.trim();
    const invoiceLink = (document.getElementById('inv_invoiceLink')||{}).value ? document.getElementById('inv_invoiceLink').value.trim() : '';
    const notes = (document.getElementById('inv_notes')||{}).value ? document.getElementById('inv_notes').value.trim() : '';
    const itemsCollected = collectItemRows();
    const description = itemsCollected.desc;
    const internalCode = itemsCollected.internalCode;
    const supplierItemCode = itemsCollected.supplierCode;
    const itemDescription = itemsCollected.itemDescription;
    const quantity = itemsCollected.quantity;
    const unitPrice = itemsCollected.unitPrice || '';
    const baseValue = parseAmount(bvEl.value);
    const vat = parseAmount(vatEl.value);
    const stampDuty = parseAmount(stampEl.value);
    const discountRate = drEl.value.trim();
    const withheld = parseAmount(whEl.value);
    const isReturnChecked = !!(document.getElementById('inv_isReturn') && document.getElementById('inv_isReturn').checked);
    // منظومة موحّدة: Gross = P+VAT+Stamp ، Net = Gross − WHT
    const totalInvoice = baseValue + vat + stampDuty;
    const netInvoice = totalInvoice - withheld;
    const nature = document.getElementById('inv_nature').value.trim();
    const discountType = document.getElementById('inv_discountType').value.trim();
    const isReturnVal = document.getElementById('inv_isReturn').checked;

    const linkedInvoiceId = (isReturnVal && document.getElementById('inv_linkedInvoice'))
      ? (document.getElementById('inv_linkedInvoice').value || '')
      : (editing && !isReturnVal ? (editing.linkedInvoiceId||'') : '');
    // الربط بفاتورة أصلية بقى اختياري: تقدر تربطه أو تسيبه "مرتجع مطلق" غير مرتبط بفاتورة معيّنة
    const withheldStatus = (document.getElementById('inv_withheldStatus')||{}).value || 'unpaid';
    const fields = {supplierId,invoiceNo,date,dueDate,category,project,invoiceLink,notes,description,internalCode,supplierItemCode,itemDescription,quantity,unitPrice,baseValue,vat,stampDuty,discountRate,withheld,withheldStatus,totalInvoice,netInvoice,nature,discountType,isReturn:isReturnVal,linkedInvoiceId: isReturnVal?linkedInvoiceId:'', attachments:formAttachments};
    if(typeof rememberManyCodes==='function'){
      rememberManyCodes('customInternalCodes', internalCode);
      rememberManyCodes('customSupplierItemCodes', supplierItemCode);
      rememberManyCodes('customItemNames', description);
      rememberManyCodes('customItemDescriptions', itemDescription);
    } else {
      internalCode.split('\n').forEach(c=>{ if(c.trim()) rememberCodeList('customInternalCodes', c.trim()); });
      supplierItemCode.split('\n').forEach(c=>{ if(c.trim()) rememberCodeList('customSupplierItemCodes', c.trim()); });
    }

    const valErrors = validateInvoiceFields(fields);
    if(valErrors.length){ lgShowToast(valErrors[0]); return; }

    // مطابقة التكرار على كل أعمدة الفاتورة (مش بس المورد + الرقم + التاريخ)
    const dup = DATA.ledger.invoices.find(i => i.id !== editId && isSameInvoice(i, fields));
    if(dup){
      const dupSupplier = supplierById(dup.supplierId);
      overlay.remove();
      openDuplicateConfirm(invoiceNo, dupSupplier, ()=>{ saveInvoiceData(dup.id, fields); });
      return;
    }

    saveInvoiceData(editId, fields);
    overlay.remove();
  });
}

/** بعد حفظ مرتجع مربوط: إلغاء الفاتورة الأصلية لو مرتجع كامل، أو تمييز إشعار بعد مرتجع */
function applyReturnLinkEffects(returnInv){
  if(!returnInv || !returnInv.isReturn || !returnInv.linkedInvoiceId) return;
  if(typeof recalcLinkedOriginal==='function') recalcLinkedOriginal(returnInv.linkedInvoiceId);
}

function saveInvoiceData(id, fields){
  if(guardReadOnly('حفظ فاتورة')) return;
  let savedId = id;
  let previousLinkedId = null;
  if(id){
    const inv = DATA.ledger.invoices.find(i=>i.id===id);
    if(inv){
      previousLinkedId = inv.isReturn ? (inv.linkedInvoiceId || null) : null;
      Object.assign(inv, fields);
    }
    logAction(fields.isReturn?'تحديث مرتجع':'تحديث فاتورة', `رقم ${fields.invoiceNo || id}`);
    lgShowToast(fields.isReturn?'تم تحديث المرتجع':'تم تحديث الفاتورة');
  } else {
    savedId = lgUid('inv');
    DATA.ledger.invoices.push({ id: savedId, ...fields });
    logAction(fields.isReturn?'إضافة مرتجع':'إضافة فاتورة', `رقم ${fields.invoiceNo || ''}`);
    lgShowToast(fields.isReturn?'تم إضافة المرتجع':'تم إضافة الفاتورة');
  }
  const saved = DATA.ledger.invoices.find(i=>i.id===savedId);
  if(saved && saved.isReturn) applyReturnLinkEffects(saved);
  // مهم: لو تعديل مرتجع غيّر ربطه (نقله لفاتورة تانية أو شاله خالص وخلاه مطلق)،
  // لازم نعيد تقييم حالة الفاتورة القديمة اللي كان مرتبط بيها كمان — وإلا
  // تفضل موسومة "ملغاة" غلط من غير أي مرتجع فعلي يغطّيها
  if(saved && saved.isReturn && previousLinkedId && previousLinkedId !== saved.linkedInvoiceId){
    if(typeof recalcLinkedOriginal==='function') recalcLinkedOriginal(previousLinkedId);
  }
  // لو تعديل فاتورة أصلية بعد حذف/تغيير مرتجعات — أعد تقييم الإلغاء
  if(saved && !saved.isReturn){
    const rets = DATA.ledger.invoices.filter(i=>i.isReturn && i.linkedInvoiceId===saved.id);
    const allRetNet = rets.reduce((a,b)=>a+Number(b.netInvoice||0),0);
    const oNet = Number(saved.netInvoice||0);
    if(rets.length && oNet>0 && allRetNet >= oNet - 0.02){
      saved.cancelled = true; saved.postReturnWht = false;
    } else if(rets.length && Number(saved.withheld||0)>0){
      saved.cancelled = false; saved.postReturnWht = true;
    } else if(!rets.length){
      saved.cancelled = false; saved.postReturnWht = false;
      saved.linkedReturnIds = [];
    }
  }
  try{ if(typeof lgRebuildIndexes==='function') lgRebuildIndexes(); }catch(e){}
  // حفظ فوري عشان المرتجع يظهر فورًا ومش يستنى الـ debounce
  try{ if(typeof saveData==='function') saveData(true); }catch(e){ try{ saveData(); }catch(e2){} }
  try{
    if(typeof lgRerenderCurrentPage==='function') lgRerenderCurrentPage();
    else if(typeof lgRender==='function') lgRender();
  }catch(e){
    try{ if(typeof lgRender==='function') lgRender(); }catch(e2){}
  }
  // بعد إضافة مرتجع: تأكيد إضافي لتحديث الصفحة (قائمة الفواتير / صفحة المورد)
  if(saved && saved.isReturn){
    setTimeout(()=>{
      try{
        if(typeof lgRebuildIndexes==='function') lgRebuildIndexes();
        if(typeof lgRerenderCurrentPage==='function') lgRerenderCurrentPage();
      }catch(e){}
    }, 50);
  }
}

function openDuplicateConfirm(invoiceNo, dupSupplier, onConfirmUpdate){
  const overlay = lgEl(`
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal">
        <h3>فاتورة مكررة</h3>
        <p style="font-size:13.5px;color:var(--ink-soft);">تم العثور على فاتورة مطابقة تماماً (كل الأعمدة)${dupSupplier?' لدى المورد "'+lgEscapeHtml(dupSupplier.name)+'"':''} برقم "${lgEscapeHtml(invoiceNo)}". هل تريد تحديث البيانات القديمة بالبيانات الجديدة؟</p>
        <div class="modal-actions">
          <button class="btn btn-outline" id="m_cancel">إلغاء</button>
          <button class="btn btn-primary" id="m_confirm">تحديث الفاتورة الموجودة</button>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(overlay);
  if(typeof forceUnlockAllInputs==='function') forceUnlockAllInputs(overlay);
  if(typeof ensureModalInputsEditable==='function') ensureModalInputsEditable(overlay);
  document.getElementById('m_cancel').addEventListener('click', ()=>overlay.remove());
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });
  document.getElementById('m_confirm').addEventListener('click', ()=>{ onConfirmUpdate(); overlay.remove(); });
}

function openDiscountNoticeModal(invoiceId){
  const inv = DATA.ledger.invoices.find(i=>i.id===invoiceId);
  if(!inv) return;
  if(inv.isReturn){ lgShowToast('لا يُصدر إشعار خصم للمرتجع'); return; }
  if(!(Number(inv.withheld)>0)){ lgShowToast('لا يوجد مبلغ مخصوم على هذه الفاتورة'); return; }
  const s = supplierById(inv.supplierId);
  const html = buildDiscountNoticeHtml(inv, false);
  const overlay = lgEl(`
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal wide">
        <h3>إشعار الخصم</h3>
        ${html}
        <div class="modal-actions">
          <button class="btn btn-outline" id="m_close">إغلاق</button>
          <button class="btn btn-primary" id="m_print">حفظ PDF (يفتح تلقائياً)</button>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(overlay);
  document.getElementById('m_close').addEventListener('click', ()=>overlay.remove());
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });
  document.getElementById('m_print').addEventListener('click', ()=>{
    const supName = (s && s.name) ? s.name : 'مورد';
    const invNo = inv.invoiceNo || 'فاتورة';
    printHtmlContent(html, `إشعار-خصم-${sanitizeFilename(supName)}-${sanitizeFilename(invNo)}.pdf`);
  });
}

function printSupplierStatementTab(){
  const s = supplierById(activeSupplierId);
  if(!s) return;
  const html = buildAccountStatementHtml(s, statementFilters.from||'', statementFilters.to||'');
  printHtmlContent(html, `كشف-حساب-${sanitizeFilename(s.name)}.pdf`);
}

function printSupplierStatement(){
  const s = supplierById(activeSupplierId); if(!s) return;
  const html = buildAccountStatementHtml(s, '', '');
  printHtmlContent(html, `كشف-حساب-${sanitizeFilename(s.name)}.pdf`);
}

function openViewInvoiceModal(invoiceId){
  const inv = DATA.ledger.invoices.find(i=>i.id===invoiceId); if(!inv) return;
  const s = supplierById(inv.supplierId);
  const due = getInvoiceDueDate(inv);
  const paid = DATA.ledger.payments.filter(p=>p.invoiceId===inv.id).reduce((a,b)=>a+Number(b.amount||0),0);
  if(!Array.isArray(inv.attachments)) inv.attachments = [];
  const atts = inv.attachments;
  const overlay = lgEl(`
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal wide">
        <h3>تفاصيل ${inv.isReturn?'المرتجع':'الفاتورة'} ${inv.isReturn?'<span class="pill" style="background:var(--debt);color:#fff;">مرتجع</span>':''}${inv.cancelled?' <span class="pill" style="background:#6b7280;color:#fff;">فاتورة ملغاة</span>':''}${inv.postReturnWht?' <span class="pill" style="background:#b45309;color:#fff;">إشعار بعد مرتجع</span>':''}</h3>
        <div class="form-grid" style="gap:10px 16px;">
          <div class="info-field"><label>رقم الفاتورة</label><div style="font-weight:800;font-size:15px;">${lgEscapeHtml(inv.invoiceNo||'-')}</div></div>
          <div class="info-field"><label>المورد</label><div>${lgEscapeHtml(s?s.name:'—')}</div></div>
          <div class="info-field"><label>رقم التسجيل الضريبي</label><div>${lgEscapeHtml(s?s.taxId||'-':'-')}</div></div>
          <div class="info-field"><label>السجل التجاري</label><div>${lgEscapeHtml(s?s.commercialReg||'-':'-')}</div></div>
          <div class="info-field"><label>تاريخ التعامل</label><div>${lgEscapeHtml(lgFmtDate(inv.date)||'-')}</div></div>
          ${inv.isReturn?'':`<div class="info-field"><label>تاريخ الاستحقاق</label><div style="${isInvoiceOverdue(inv)?'color:var(--debt);font-weight:700;':''}">${lgEscapeHtml(due||'-')}${isInvoiceOverdue(inv)?' (متأخرة)':''}</div></div>`}
          <div class="info-field"><label>نوع الفاتورة</label><div>${inv.category?`<span class="pill">${lgEscapeHtml(inv.category)}</span>`:'-'}</div></div>
          <div class="info-field"><label>المشروع</label><div>${inv.project?`<span class="pill">${lgEscapeHtml(inv.project)}</span>`:'-'}</div></div>
          ${inv.invoiceLink ? `<div class="info-field"><label>لينك الفاتورة</label><div><button type="button" class="btn btn-outline btn-sm" id="m_open_inv_link" data-url="${lgEscapeHtml(inv.invoiceLink)}">🔗 فتح الفاتورة الأصلية</button></div></div>` : ''}
          <div class="info-field"><label>طبيعة التعامل</label><div>${lgEscapeHtml(codeDescription(NATURE_OPTIONS, inv.nature))}</div></div>
          <div class="info-field"><label>نوع الخصم</label><div>${lgEscapeHtml(codeDescription(DISCOUNT_TYPE_OPTIONS, inv.discountType))}</div></div>
          <div class="info-field"><label>نسبة الخصم</label><div>${inv.discountRate?lgEscapeHtml(String(inv.discountRate))+'%':'-'}</div></div>
          <div class="info-field"><label>حالة المبلغ المخصوم</label><div>${inv.withheldStatus==='paid'?'تم الدفع للضرائب':'لم يتم الدفع للضرائب'}</div></div>
          ${inv.notes ? `<div class="info-field" style="grid-column:1/-1;"><label>الملاحظات</label><div style="white-space:pre-line;">${lgEscapeHtml(inv.notes)}</div></div>` : ''}
          ${inv.isReturn && inv.linkedInvoiceId ? (()=>{ const li=DATA.ledger.invoices.find(x=>x.id===inv.linkedInvoiceId); return `<div class="info-field" style="grid-column:1/-1;background:var(--paper);padding:10px;border-radius:8px;"><label>مربوط بفاتورة أصلية</label><div style="font-weight:800;">${li?lgEscapeHtml(li.invoiceNo||'')+' — '+lgEscapeHtml(lgFmtDate(li.date))+' — صافي '+fmt(li.netInvoice)+(li.cancelled?' (ملغاة)':''):lgEscapeHtml(inv.linkedInvoiceId)}</div>${li?`<button type="button" class="btn btn-outline btn-sm" id="m_open_linked_orig" data-id="${li.id}" style="margin-top:6px;">فتح الفاتورة الأصلية</button>`:''}</div>`; })() : ''}
          ${!inv.isReturn ? (()=>{ const rets=DATA.ledger.invoices.filter(x=>x.isReturn && x.linkedInvoiceId===inv.id); if(!rets.length) return ''; return `<div class="info-field" style="grid-column:1/-1;background:var(--paper);padding:10px;border-radius:8px;"><label>المرتجعات المرتبطة (${rets.length})</label><div>${rets.map(r=>lgEscapeHtml(r.invoiceNo||'')+' — '+lgEscapeHtml(lgFmtDate(r.date))+' — صافي '+fmt(r.netInvoice)).join('<br>')}</div>${rets.map(r=>`<button type="button" class="btn btn-outline btn-sm m_open_linked_ret" data-id="${r.id}" style="margin:4px 4px 0 0;">فتح مرتجع ${lgEscapeHtml(r.invoiceNo||'')}</button>`).join('')}</div>`; })() : ''}
        </div>
        <div style="margin:14px 0 6px;">
          <div style="font-weight:800;font-size:13.5px;margin-bottom:8px;">الأصناف (الصنف / كود المورد / الكود الداخلي / وصف الصنف / الكمية / سعر الوحدة)</div>
          ${(()=>{
            const d = String(inv.description||'').split('\n');
            const sc = String(inv.supplierItemCode||'').split('\n');
            const ic = String(inv.internalCode||'').split('\n');
            const idesc = String(inv.itemDescription||'').split('\n');
            const qty = String(inv.quantity||'').split('\n');
            const up = String(inv.unitPrice||'').split('\n');
            const n = Math.max(d.length, sc.length, ic.length, idesc.length, qty.length, up.length, 1);
            const rows = [];
            for(let i=0;i<n;i++){
              const desc = (d[i]||'').trim();
              const sCode = (sc[i]||'').trim();
              const iCode = (ic[i]||'').trim();
              const iDesc = (idesc[i]||'').trim();
              const q = (qty[i]||'').trim();
              const price = (up[i]||'').trim();
              if(!desc && !sCode && !iCode && !iDesc && !q && !price) continue;
              rows.push(`<tr>
                <td style="padding:8px 10px;border-bottom:1px solid var(--line);">${lgEscapeHtml(desc||'—')}</td>
                <td style="padding:8px 10px;border-bottom:1px solid var(--line);direction:ltr;text-align:right;font-size:13px;">${lgEscapeHtml(sCode||'—')}</td>
                <td style="padding:8px 10px;border-bottom:1px solid var(--line);direction:ltr;text-align:right;font-size:13px;">${lgEscapeHtml(iCode||'—')}</td>
                <td style="padding:8px 10px;border-bottom:1px solid var(--line);">${lgEscapeHtml(iDesc||'—')}</td>
                <td style="padding:8px 10px;border-bottom:1px solid var(--line);">${lgEscapeHtml(q||'—')}</td>
                <td style="padding:8px 10px;border-bottom:1px solid var(--line);">${lgEscapeHtml(fmtText(price)||'—')}</td>
              </tr>`);
            }
            if(!rows.length) return '<p style="color:var(--ink-soft);font-size:13px;margin:0;">لا توجد أصناف مسجّلة</p>';
            return `<div class="table-wrap" style="border:1px solid var(--line);border-radius:10px;overflow:hidden;">
              <table style="width:100%;border-collapse:collapse;">
                <thead><tr style="background:var(--paper);">
                  <th style="padding:8px 10px;text-align:right;font-size:12.5px;">الصنف</th>
                  <th style="padding:8px 10px;text-align:right;font-size:12.5px;">كود المورد</th>
                  <th style="padding:8px 10px;text-align:right;font-size:12.5px;">الكود الداخلي</th>
                  <th style="padding:8px 10px;text-align:right;font-size:12.5px;">وصف الصنف</th>
                  <th style="padding:8px 10px;text-align:right;font-size:12.5px;">الكمية</th>
                  <th style="padding:8px 10px;text-align:right;font-size:12.5px;">سعر الوحدة</th>
                </tr></thead>
                <tbody>${rows.join('')}</tbody>
              </table>
            </div>`;
          })()}
        </div>

        <div class="stats-row" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr));margin:16px 0 8px;">
          <div class="stat-card"><div class="num" style="font-size:16px;">${fmt(inv.baseValue)}</div><div class="lbl">القيمة</div></div>
          <div class="stat-card"><div class="num" style="font-size:16px;">${fmt(inv.vat)}</div><div class="lbl">الضريبة</div></div>
          <div class="stat-card"><div class="num" style="font-size:16px;">${fmt(inv.stampDuty)}</div><div class="lbl">الدمغات</div></div>
          <div class="stat-card"><div class="num" style="font-size:16px;">${fmt(inv.totalInvoice)}</div><div class="lbl">إجمالي الفاتورة</div></div>
          <div class="stat-card"><div class="num" style="font-size:16px;">${fmt(inv.withheld)}</div><div class="lbl">المخصوم</div></div>
          <div class="stat-card"><div class="num" style="font-size:16px;">${fmt(inv.netInvoice)}</div><div class="lbl">الصافي</div></div>
          <div class="stat-card"><div class="num" style="font-size:16px;">${fmt(paid)}</div><div class="lbl">المدفوع</div></div>
          </div>
        <div class="section-title" style="margin-top:8px;">المرفقات (${atts.length})</div>
        <div id="invAttList" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          ${atts.length?atts.map(a=>`
            <div class="pill" style="padding:6px 10px;display:flex;align-items:center;gap:6px;">
              <button class="row-btn" data-open-att="${lgEscapeHtml(a.path)}" title="فتح">${lgEscapeHtml(a.name)}</button>
              ${readOnlyMode?'':`<button class="row-btn del" data-del-att="${lgEscapeHtml(a.id)}" title="حذف">✕</button>`}
            </div>`).join(''):'<span style="color:var(--ink-soft);font-size:13px;">لا توجد مرفقات</span>'}
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" id="m_close_view">إغلاق</button>
          ${readOnlyMode?'':`<button class="btn btn-outline" id="m_scan_att">📷 مسح / كاميرا</button>`}
          ${readOnlyMode?'':`<button class="btn btn-outline" id="m_copy_inv">نسخ كفاتورة جديدة</button>`}
          ${(inv.withheld>0 && !inv.isReturn && !inv.cancelled)?`<button class="btn btn-outline" id="m_view_notice">${inv.postReturnWht?'إشعار خصم بعد مرتجع':'إشعار خصم'}</button>`:''}
          ${(readOnlyMode || (typeof hasPagePermission==='function' && !hasPagePermission("ledger.invoices",'edit')))?'':`<button class="btn btn-primary" id="m_view_edit">تعديل</button>`}
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(overlay);
  document.getElementById('m_close_view').addEventListener('click', ()=>overlay.remove());
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });
  const openLinkBtn2 = document.getElementById('m_open_inv_link');
  if(openLinkBtn2) openLinkBtn2.addEventListener('click', async ()=>{
    const url = openLinkBtn2.getAttribute('data-url');
    if(window.desktopApi && window.desktopApi.openExternalLink){
      const r = await window.desktopApi.openExternalLink(url);
      if(!r || !r.ok) lgShowToast((r&&r.error)||'تعذر فتح الرابط');
    }
  });
  const editBtn = document.getElementById('m_view_edit');
  if(editBtn) editBtn.addEventListener('click', ()=>{ overlay.remove(); openAddEditInvoiceModal(invoiceId); });
  const noticeBtn = document.getElementById('m_view_notice');
  if(noticeBtn) noticeBtn.addEventListener('click', ()=>{ overlay.remove(); openDiscountNoticeModal(invoiceId); });
  const openOrig = document.getElementById('m_open_linked_orig');
  if(openOrig) openOrig.addEventListener('click', ()=>{ const id=openOrig.getAttribute('data-id'); overlay.remove(); openViewInvoiceModal(id); });
  document.querySelectorAll('.m_open_linked_ret').forEach(btn=>{
    btn.addEventListener('click', ()=>{ const id=btn.getAttribute('data-id'); overlay.remove(); openViewInvoiceModal(id); });
  });
  const copyBtn = document.getElementById('m_copy_inv');
  if(copyBtn) copyBtn.addEventListener('click', ()=>{
    if(guardReadOnly('نسخ فاتورة')) return;
    const newInv = {
      id: lgUid('inv'),
      supplierId: inv.supplierId,
      invoiceNo: (inv.invoiceNo||'') + '-نسخة',
      date: inv.date || '',
      dueDate: inv.dueDate || '',
      category: inv.category || '',
      project: inv.project || '',
      description: inv.description || '',
      internalCode: inv.internalCode || '',
      supplierItemCode: inv.supplierItemCode || '',
      itemDescription: inv.itemDescription || '',
      quantity: inv.quantity || '',
      unitPrice: inv.unitPrice || '',
      baseValue: inv.baseValue, vat: inv.vat, stampDuty: inv.stampDuty,
      discountRate: inv.discountRate || '', withheld: inv.withheld,
      totalInvoice: inv.totalInvoice, netInvoice: inv.netInvoice,
      nature: inv.nature || '', discountType: inv.discountType || '',
      isReturn: !!inv.isReturn, attachments: []
    };
    DATA.ledger.invoices.push(newInv);
    logAction('نسخ فاتورة', inv.invoiceNo||'');
    saveData();
    overlay.remove();
    openAddEditInvoiceModal(newInv.id);
    lgShowToast('تم نسخ الفاتورة — راجع البيانات واحفظ');
  });
  document.querySelectorAll('[data-open-att]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ window.desktopApi.openAttachment(btn.getAttribute('data-open-att')); });
  });
  document.querySelectorAll('[data-del-att]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      if(guardReadOnly('حذف مرفق')) return;
      const attId = btn.getAttribute('data-del-att');
      const att = (inv.attachments||[]).find(a=>a.id===attId);
      if(att && att.path) await window.desktopApi.deleteAttachment(att.path);
      inv.attachments = (inv.attachments||[]).filter(a=>a.id!==attId);
      saveData();
      overlay.remove();
      openViewInvoiceModal(invoiceId);
      lgShowToast('تم حذف المرفق');
    });
  });
  const scanAtt = document.getElementById('m_scan_att');
  if(scanAtt) scanAtt.addEventListener('click', ()=>{
    if(guardReadOnly('إرفاق ملف')) return;
    lgOpenScanAttachModal(inv.id, (file)=>{
      inv.attachments = inv.attachments || [];
      inv.attachments.push(file);
      saveData();
      logAction('مسح وإرفاق', inv.invoiceNo||'');
      overlay.remove();
      openViewInvoiceModal(invoiceId);
    }, lgPreferredAttachNameFromInvoice(inv.invoiceNo));
  });
}

function openViewPaymentModal(paymentId){
  const p = DATA.ledger.payments.find(x=>x.id===paymentId); if(!p) return;
  const s = supplierById(p.supplierId);
  const inv = p.invoiceId ? DATA.ledger.invoices.find(i=>i.id===p.invoiceId) : null;
  const extra = lgExtraFieldsSummary(p.extraFields);
  const overlay = lgEl(`
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal wide">
        <h3>تفاصيل الدفعة ${p.paymentNo?`<span style="color:var(--ledger-green);">#${lgEscapeHtml(String(p.paymentNo))}</span>`:''}</h3>
        <div class="form-grid" style="gap:10px 16px;">
          <div class="info-field"><label>التاريخ</label><div style="font-weight:800;">${lgEscapeHtml(lgFmtDate(p.date)||'-')}</div></div>
          <div class="info-field"><label>المورد</label><div>${lgEscapeHtml(s?s.name:'—')}</div></div>
          <div class="info-field"><label>نوع الحركة</label><div style="font-weight:800;">${typeof paymentDirectionLabel==='function'?paymentDirectionLabel(p):(p.direction==='collect'?'مدين — عليه لنا':'دائن — علينا له')}</div></div>
          <div class="info-field"><label>طريقة الدفع</label><div>${lgEscapeHtml(p.method||'-')}</div></div>
          <div class="info-field"><label>المبلغ</label><div class="amount-cell payment" style="font-size:18px;font-weight:900;">${fmt(p.amount)}</div></div>
          <div class="info-field"><label>الفاتورة المرتبطة</label><div>${inv?lgEscapeHtml(inv.invoiceNo)+' — '+lgEscapeHtml(lgFmtDate(inv.date)):'دفعة عامة (غير مرتبطة بفاتورة)'}</div></div>
          <div class="info-field"><label>رقم التحويل</label><div>${lgEscapeHtml(p.transferRef||'-')}</div></div>
          <div class="info-field" style="grid-column:1/-1;"><label>تفاصيل إضافية</label><div>${lgEscapeHtml(extra||'-')}</div></div>
          <div class="info-field" style="grid-column:1/-1;"><label>ملاحظات</label><div>${lgEscapeHtml(p.notes||'-')}</div></div>
          <div class="info-field" style="grid-column:1/-1;"><label>المرفقات</label><div>${(p.attachments&&p.attachments.length)?p.attachments.map(a=>`<button class="row-btn" data-open-pay-att="${lgEscapeHtml(a.path)}">${lgEscapeHtml(a.name)}</button>`).join(' '):'-'}</div></div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" id="m_close_pay_view">إغلاق</button>
          ${(readOnlyMode || (typeof hasPagePermission==='function' && !hasPagePermission("ledger.payments",'edit')))?'':`<button class="btn btn-gold" id="m_pay_edit">تعديل الدفعة</button>`}
          ${inv?`<button class="btn btn-primary" id="m_pay_view_inv">عرض الفاتورة المرتبطة</button>`:''}
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(overlay);
  overlay.querySelectorAll('[data-open-pay-att]').forEach(btn=>{
    btn.addEventListener('click', ()=> window.desktopApi.openAttachment(btn.getAttribute('data-open-pay-att')));
  });

  document.getElementById('m_close_pay_view').addEventListener('click', ()=>overlay.remove());
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });
  const editBtn = document.getElementById('m_pay_edit');
  if(editBtn) editBtn.addEventListener('click', ()=>{ overlay.remove(); openPaymentModal(p.supplierId, p.id); });
  const invBtn = document.getElementById('m_pay_view_inv');
  if(invBtn && inv) invBtn.addEventListener('click', ()=>{ overlay.remove(); openViewInvoiceModal(inv.id); });
}

