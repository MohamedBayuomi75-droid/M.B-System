/* =========================================================
   السائقون · النقل · التقييم · المستندات · مصاريف
   ========================================================= */

/* ---- سائقون ---- */
function renderDriversPage(){
  if(typeof isEntityBoardsView==='function' && isEntityBoardsView(driverFilters)){
    return entityDeptBoardsPageHtml('drivers', 'السائقون', '');
  }
  const q=(driverFilters.q||'').trim().toLowerCase();
  let list=sortByNameAr(DATA.drivers||[],d=>d.name);
  if(q && typeof smartSearchList==='function') list=smartSearchList(list, q);
  else if(q) list=list.filter(d=>smartMatch(d.name, q)||smartMatch(d.code, q)||smartMatch(d.licenseGrade, q));
  if(typeof applyExtraPersonFilters==='function') list=applyExtraPersonFilters('driver', list, driverFilters);
  if(driverFilters.status) list=list.filter(d=>(d.status||'active')===driverFilters.status);
  if(typeof driverFilters!=='undefined'){
    const df = driverFilters.departmentId || driverFilters.categoryId || '';
    list = typeof filterByDeptFilter==='function' ? filterByDeptFilter(list, df) : (df ? list.filter(d=>(d.departmentId||d.categoryId)===df) : list);
  }
  try{
    if(typeof setPageExport==='function'){ const _x = personListExport('driver', list); setPageExport('drivers', _x.headers, _x.rows); }
  }catch(_e){}
  const pg=paginateRows(list,'drivers');
  const _isExtSec = String((driverFilters&&(driverFilters.departmentId||driverFilters.categoryId))||'')==='__core_drivers_ext__';
  const drvCatId = (typeof driverFilters!=='undefined'&&driverFilters.categoryId)||'';
  return `<div class="page">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
      <div>${typeof entityListBackBarHtml==='function'?entityListBackBarHtml('drivers', driverFilters, ''):''}
          <h2 class="page-title" style="margin:0;">السائقون</h2></div>
      <div class="btn-row page-header-actions">
        ${typeof pageExportButtonsHtml==='function'?pageExportButtonsHtml():''}
        ${(function(){ const _df=String((driverFilters&&(driverFilters.departmentId||driverFilters.categoryId))||''); return (_df==='__core_drivers_ext__' ? '' : `<button class="btn btn-primary" id="btnAddDriver" ${readOnlyMode?'disabled':''}>+ سائق</button>`) + (_df==='__core_drivers__' ? '' : `<button class="btn btn-primary" id="btnAddExtDriver" ${readOnlyMode?'disabled':''}>+ إضافة سائق خارجي</button>`); })()}
      </div>
    </div>
    ${entityStatCardsHtml('drivers', list)}
    <div class="filters-bar" style="margin-bottom:12px;display:flex;flex-wrap:wrap;gap:8px;">
      <input type="search" id="drvSearch" class="input" placeholder="بحث: اسم، كود، درجة الرخصة، هاتف، قومي، مشروع..." value="${escapeHtml(driverFilters.q||'')}" style="min-width:220px;">
      <select id="drvFilterStatus" class="input">
        <option value="">كل الحالات</option>
        ${personStatusOptionsHtml(driverFilters.status||'__all__')}
      </select>
      ${typeof extraPersonFiltersHtml==='function'?extraPersonFiltersHtml('driver', driverFilters, 'drv'):''}
    </div>
    ${typeof bulkBarHtml==='function'?bulkBarHtml('drivers'):''}<div class="table-wrap"><table class="data-table"${_isExtSec?' data-layout-ent="driversExt"':''}>
      <thead>${_isExtSec ? `<tr>
      <th style="width:36px;"><input type="checkbox" id="checkAll_drivers" title="تحديد الكل"></th><th>الكود</th><th>الاسم</th><th>الحالة</th><th>الرقم القومي</th><th>الوظيفة</th><th>القسم</th><th>اليومية</th><th>الهاتف</th><th>العنوان</th><th>الملاحظات</th><th></th></tr>` : `<tr>
      <th style="width:36px;"><input type="checkbox" id="checkAll_drivers" title="تحديد الكل"></th><th>كود السائق</th><th>الاسم</th><th>الوظيفة</th><th>الرقم القومي</th>
      <th>انتهاء البطاقة</th><th>حالة البطاقة</th><th>انتهاء الرخصة</th><th>حالة الرخصة</th><th>درجة الرخصة</th>
      <th>تاريخ التعيين</th><th>نوع العقد</th><th>حالة العقد</th><th>الراتب</th>
      <th>حالة التأمين</th><th>الرقم التأميني</th><th>رقم التليفون</th>
      ${thIf('drivers','birthDate','تاريخ الميلاد')}<th>العنوان</th><th>القسم</th><th>الحالة</th><th>الملاحظات</th><th></th></tr>`}</thead>
      <tbody>${pg.pageRows.length?pg.pageRows.map(d=>{
        if(_isExtSec) return `<tr>
          <td><input type="checkbox" class="row-check" data-kind="drivers" data-id="${d.id}"></td>
          <td>${escapeHtml(d.code||'')}</td>
          <td><strong>${escapeHtml(d.name||'')}</strong></td>
          ${personStatusCellHtml('driver',d)}
          <td>${escapeHtml(d.nationalId||'—')}</td>
          <td>${escapeHtml(d.position||'سائق')}</td>
          <td>${escapeHtml(typeof departmentName==='function'?departmentName(d.departmentId||d.categoryId):'')}</td>
          <td>${fmtMoney(d.dailyWage)}</td>
          <td>${escapeHtml(d.phone||'—')}</td>
          <td>${escapeHtml(d.address||'—')}</td>
          <td>${typeof personNotesCellHtml==='function'?personNotesCellHtml('driver',d):'—'}</td>
          <td>${typeof rowActionBtnsHtml==='function'?rowActionBtnsHtml({id:d.id, viewClass:'btn-view-drv', editClass:'btn-edit-drv', delClass:'btn-del-drv'}):''}</td>
        </tr>`;
        return `<tr>
          <td><input type="checkbox" class="row-check" data-kind="drivers" data-id="${d.id}"></td>
          <td>${escapeHtml(d.code||'')}</td>
          <td>${typeof personWarningBadge==='function'?personWarningBadge('driver',d):''}<strong>${escapeHtml(d.name||'')}</strong></td>
          <td>${escapeHtml(d.position||'سائق')}</td>
          <td>${escapeHtml(d.nationalId||'—')}</td>
          <td>${fmtDate(d.idCardExpiry)}</td>
          <td>${typeof statusBadgeSarya==='function'?statusBadgeSarya(d.idCardExpiry?statusFromExpiry(d.idCardExpiry):d.idCardStatus,'card'):'—'}</td>
          <td>${fmtDate(d.licenseExpiry)}</td>
          <td>${typeof statusBadgeSarya==='function'?statusBadgeSarya(d.licenseExpiry?statusFromExpiry(d.licenseExpiry):d.licenseStatus,'license'):'—'}</td>
          <td>${escapeHtml(d.licenseGrade||'—')}</td>
          <td>${fmtDate(d.hireDate)}</td>
          <td>${escapeHtml(labelOf(typeof CONTRACT_TYPE_OPTS!=='undefined'?CONTRACT_TYPE_OPTS:[], d.contractType)||'—')}</td>
          <td>${typeof statusBadgeSarya==='function'?statusBadgeSarya(d.contractStatus,'contract'):'—'}</td>
          <td>${fmtMoney(d.external?d.dailyWage:(d.salary||d.basicSalary||0))}</td>
          <td>${typeof statusBadgeSarya==='function'?statusBadgeSarya(d.insuranceStatus||'','insurance'):'—'}</td>
          <td>${escapeHtml(d.insuranceNumber||'—')}</td>
          <td>${escapeHtml(d.phone||'—')}</td>
          ${tdIf('drivers','birthDate',`<td>${fmtDate(d.birthDate)||'—'}</td>`)}<td>${escapeHtml(d.address||'—')}</td>
          <td>${escapeHtml(typeof departmentName==='function'?departmentName(d.departmentId||d.categoryId):'')}</td>
          ${personStatusCellHtml('driver',d)}
          <td>${typeof personNotesCellHtml==='function'?personNotesCellHtml('driver',d):'—'}</td>
          <td>${typeof rowActionBtnsHtml==='function'?rowActionBtnsHtml({id:d.id, viewClass:'btn-view-drv', editClass:'btn-edit-drv', delClass:'btn-del-drv'}):''}</td>
        </tr>`;
      }).join(''):'<tr><td colspan="19" style="text-align:center;color:var(--ink-soft);padding:24px;">لا سائقين</td></tr>'}
      </tbody></table></div>${tablePagerHtml('drivers',pg)}</div>`;
}
function initDriversEvents(){
  if(typeof isEntityBoardsView==='function' && isEntityBoardsView(driverFilters)){
    if(typeof bindEntityDeptBoards==='function') bindEntityDeptBoards('drivers', driverFilters);
    return;
  }
  if(typeof bindEntityListBack==='function') bindEntityListBack('drivers', driverFilters);

  if(typeof bindBulkUI==='function') bindBulkUI('drivers','drivers');

  if(typeof bindCategoryUI==='function') bindCategoryUI('drivers', typeof driverFilters!=='undefined'?driverFilters:{categoryId:''}, ()=>{ resetTablePage('drivers'); rerenderCurrentPage(); });

  document.getElementById('drvSearch')?.addEventListener('input',e=>{driverFilters.q=e.target.value;resetTablePage('drivers');if(typeof debounceRerender==='function') debounceRerender('driversSearch',250); else rerenderCurrentPage();});
  if(typeof bindExtraPersonFilters==='function') bindExtraPersonFilters('drv', driverFilters, 'drivers');
  document.getElementById('drvFilterStatus')?.addEventListener('change', e=>{
    driverFilters.status = e.target.value||'';
    resetTablePage('drivers'); rerenderCurrentPage();
  });
  document.getElementById('btnAddDriver')?.addEventListener('click',()=>openDriverModal());
  document.getElementById('btnAddExtDriver')?.addEventListener('click',()=>openDriverModal(null,{external:true}));
  document.querySelectorAll('.btn-view-drv').forEach(b=>b.addEventListener('click',()=>{
    const id = b.getAttribute('data-id');
    if(typeof openPersonDetailPage==='function') openPersonDetailPage('driver', id);
    else if(typeof openPersonDetailModal==='function') openPersonDetailModal('driver', id);
  }));
  document.querySelectorAll('.btn-edit-drv').forEach(b=>b.addEventListener('click',()=>openDriverModal(b.getAttribute('data-id'))));
  document.querySelectorAll('.btn-del-drv').forEach(b=>b.addEventListener('click',()=>{
    confirmDelete('حذف السائق؟').then(ok=>{ if(!ok) return;
      const id = b.getAttribute('data-id');
      const d = typeof getDriver==='function'?getDriver(id):(DATA.drivers||[]).find(x=>x.id===id);
      if(typeof softDelete==='function') softDelete('drivers', id, d?d.name:id);
      else {
      DATA.drivers=(DATA.drivers||[]).filter(x=>x.id!==id);
      saveData(true); showToast('تم');
      }
      addAudit('حذف سائق', d?d.name:id);
      rerenderCurrentPage();
    });
  }));
}
function openExternalDriverModal(editId){
  const d = editId ? getDriver(editId) : null;
  const isEdit = !!d;
  const formAttId = isEdit ? d.id : uid();
  if(!isEdit && typeof ensureFormDraft==='function') ensureFormDraft('driver', formAttId);
  openModal(`
    <div class="modal-header">
      <h3>${isEdit?'تعديل سائق خارجي':'إضافة سائق خارجي'}</h3>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-grid form-grid-2">
        <label>الاسم *<input class="input" id="drvName" value="${escapeHtml(d&&d.name||'')}" required></label>
        <label>كود السائق (تلقائي — قابل للتعديل)<input class="input" id="drvCode" value="${escapeHtml(d&&d.code||(typeof nextDriverCode==='function'?nextDriverCode():'DRV-001'))}"></label>
        <label>الحالة<select class="input" id="drvStatus">${personStatusOptionsHtml(d&&d.status, { blank: !d })}</select></label>
        <label>الرقم القومي<input class="input" id="drvNid" value="${escapeHtml(d&&d.nationalId||'')}" placeholder="14 رقم"></label>
        <label>الوظيفة<input class="input" id="drvPos" value="${escapeHtml(d&&d.position||'سائق')}" placeholder="سائق ..."></label>
        <label>القسم (من الوظيفة)<input class="input" id="drvDept" readonly tabindex="-1" value="${escapeHtml(d&&d.position||'سائق')}" style="background:var(--paper-2);cursor:default;"></label>
        <label>اليومية (ج.م)<input class="input" id="drvWage" type="number" min="0" step="0.01" value="${d&&d.dailyWage?toInt(d.dailyWage):''}"></label>
        <label>الهاتف<input class="input" id="drvPhone" value="${escapeHtml(d&&d.phone||'')}" placeholder="01xxxxxxxxx"></label>
        <label>العنوان<input class="input" id="drvAddress" value="${escapeHtml(d&&d.address||'')}"></label>
        <label style="grid-column:1/-1;">ملاحظات<textarea class="input" id="drvNotes" rows="4">${escapeHtml(d&&d.notes||'')}</textarea></label>
        ${typeof formAttachmentsBlockHtml==='function'?formAttachmentsBlockHtml('driver', formAttId, isEdit?(d.attachments||[]):[]):''}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="btnSaveDriver">${isEdit?'حفظ التعديل':'إضافة'}</button>
    </div>
  `);
  try{ const _pi=document.getElementById('drvPos'), _di=document.getElementById('drvDept'); if(_pi&&_di) _pi.addEventListener('input',()=>{ _di.value=_pi.value; }); }catch(_e){}
  if(typeof bindAttachmentHandlers==='function') bindAttachmentHandlers(document.getElementById('appModal'));
  document.getElementById('btnSaveDriver').addEventListener('click', ()=>{
    const g = id=>((document.getElementById(id)||{}).value||'').trim();
    const name = g('drvName');
    if(!name){ showToast('الاسم مطلوب'); return; }
    const payload = {
      name, external:true,
      code: (typeof ensureUniqueCode==='function' ? ensureUniqueCode(document.getElementById('drvCode').value, DATA.drivers, 'DRV-', d&&d.id) : (g('drvCode') || nextDriverCode())),
      status: g('drvStatus') || 'active',
      nationalId: g('drvNid'), position: g('drvPos') || 'سائق', phone: g('drvPhone'), address: g('drvAddress'),
      dailyWage: toInt(g('drvWage')), notes: g('drvNotes'),
      attachments: isEdit ? ((d && d.attachments) || []) : (typeof takeFormDraftAttachments==='function' ? takeFormDraftAttachments('driver', formAttId) : [])
    };
    try{ personDeptOnSave('drivers', d, payload); }catch(_e){}
    const commit = ()=>{
      DATA.drivers = DATA.drivers || [];
      if(isEdit){ Object.keys(payload).forEach(k=>{ if(payload[k]!==undefined) d[k]=payload[k]; }); addAudit('تعديل سائق خارجي', name); }
      else { payload.id = formAttId; DATA.drivers.push(payload); addAudit('إضافة سائق خارجي', name); }
      try{ const person = isEdit ? d : payload; if(typeof syncPersonResignedState==='function') syncPersonResignedState('driver', person); }catch(_e){}
      saveData(true); closeModal(); showToast('تم الحفظ'); rerenderCurrentPage();
    };
    if(typeof guardEntityDuplicates==='function') guardEntityDuplicates('driver', payload, isEdit && d ? d.id : null).then(ok=>{ if(ok) commit(); });
    else commit();
  });
}
function openDriverModal(editId, opts){
  { const _d0 = (editId && typeof getDriver==='function') ? getDriver(editId) : null;
    if((opts && opts.external) || (_d0 && _d0.external)) return openExternalDriverModal(_d0 ? _d0.id : null); }
  const d = editId ? getDriver(editId) : null;
  const isEdit = !!d;
  const formAttId = isEdit ? d.id : uid();
  if(!isEdit && typeof ensureFormDraft==='function') ensureFormDraft('driver', formAttId);
  openModal(`
    <div class="modal-header">
      <h3>${isEdit?'تعديل سائق':'إضافة سائق جديد'}</h3>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-grid form-grid-2">
        <label>الاسم *<input class="input" id="drvName" value="${escapeHtml(d&&d.name||'')}" required></label>
        <label>كود السائق (تلقائي — قابل للتعديل)<input class="input" id="drvCode" value="${escapeHtml(d&&d.code||(typeof nextDriverCode==='function'?nextDriverCode():'DRV-001'))}"></label>
        <label>الحالة
          <select class="input" id="drvStatus">${personStatusOptionsHtml(d&&d.status, { blank: !d })}</select>
        </label>
        ${typeof resignedDateFieldHtml==='function'?resignedDateFieldHtml('drv', d):''}
        <label>القسم (من الوظيفة)
          <input class="input" id="drvDept" readonly tabindex="-1" value="${escapeHtml(d&&(d.position||'سائق')||'سائق')}" placeholder="يُقرأ من خانة الوظيفة" style="background:var(--paper-2);cursor:default;">
        </label>
        ${typeof personHrFieldsHtml==='function'?personHrFieldsHtml('drv', Object.assign({},d,{position:d&&d.position||'سائق',dailyWage:d?d.dailyWage:''}), { showSalary:true, showWage:false, showLicense:true }):''}
        <label>درجة الرخصة
          <select class="input" id="drvLicGrade">${(function(){ const cur=(d&&d.licenseGrade)||''; const base=['درجة أولى','درجة ثانية','درجة ثالثة','رخصة شخصية']; if(cur && base.indexOf(cur)<0) base.unshift(cur); return '<option value="">— اختر —</option>'+base.map(g=>'<option value="'+escapeHtml(g)+'"'+(g===cur?' selected':'')+'>'+escapeHtml(g)+'</option>').join(''); })()}</select>
        </label>
        <label>العنوان<input class="input" id="drvAddress" value="${escapeHtml(d&&d.address||'')}"></label>
        ${typeof customFieldsFormHtml==='function'?customFieldsFormHtml('drivers', d):''}
        <label style="grid-column:1/-1;">ملاحظات<textarea class="input" id="drvNotes" rows="2">${escapeHtml(d&&d.notes||'')}</textarea></label>
        ${typeof formAttachmentsBlockHtml==='function'?formAttachmentsBlockHtml('driver', formAttId, isEdit?(d.attachments||[]):[]):''}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="btnSaveDriver">${isEdit?'حفظ التعديل':'إضافة'}</button>
    </div>
  `);
  if(typeof bindResignedStatusToggle==='function') bindResignedStatusToggle('drvStatus','drv');
  try{ const _pi=document.getElementById('drvPos'), _di=document.getElementById('drvDept'); if(_pi&&_di) _pi.addEventListener('input',()=>{ _di.value=_pi.value; }); }catch(_e){}
  if(typeof bindEntityCombos==='function') bindEntityCombos(document.getElementById('appModal'));
  if(typeof applyFormLayout==='function') applyFormLayout('expenses', document.getElementById('appModal'));
  if(typeof bindAutoStatusDates==='function') bindAutoStatusDates(document.getElementById('appModal'));
  if(typeof bindAttachmentHandlers==='function') bindAttachmentHandlers(document.getElementById('appModal'));
  if(typeof bindExtraFieldsButton==='function') bindExtraFieldsButton('extraFields_drivers');
  document.getElementById('btnSaveDriver')?.addEventListener('click', ()=>{
    const name = (document.getElementById('drvName').value||'').trim();
    if(!name){ showToast('الاسم مطلوب'); return; }
    const hr = typeof collectPersonHrFields==='function' ? collectPersonHrFields('drv', { showSalary:true, showWage:false }) : {};
    const payload = Object.assign({
      name,
      code: (typeof ensureUniqueCode==='function'
        ? ensureUniqueCode(document.getElementById('drvCode').value, DATA.drivers, 'DRV-', d&&d.id)
        : ((document.getElementById('drvCode').value||'').trim() || nextDriverCode())),
      status: document.getElementById('drvStatus').value || 'active',
      resignedAt: (typeof readResignedDateFromForm==='function'?readResignedDateFromForm('drv', document.getElementById('drvStatus').value):'')||(d&&d.resignedAt)||'',
      licenseGrade: (document.getElementById('drvLicGrade')?.value||'').trim(),
      address: (document.getElementById('drvAddress')?.value||'').trim(),
      notes: (document.getElementById('drvNotes')?.value||'').trim(),
      extraFields: typeof collectExtraFieldsForSave==='function' ? collectExtraFieldsForSave('extraFields_drivers') : [],
      attachments: isEdit ? ((d && d.attachments) || []) : (typeof takeFormDraftAttachments==='function' ? takeFormDraftAttachments('driver', formAttId) : [])
    }, hr);
    try{ personDeptOnSave('drivers', d, payload); }catch(_e){}
    if(payload.project && typeof ensureProjectSaved==='function') ensureProjectSaved(payload.project);
    const commitDrv = ()=>{
      if(isEdit){
        if(typeof mergePersonRecord==='function') mergePersonRecord(d, payload); else Object.keys(payload).forEach(k=>{ if(payload[k]!==undefined) d[k]=payload[k]; });
        addAudit('تعديل سائق', name);
      } else {
        payload.id = formAttId;
        DATA.drivers = DATA.drivers || [];
        DATA.drivers.push(payload);
        addAudit('إضافة سائق', name);
      }
      try{
        const person = isEdit ? d : payload;
        if(person && typeof syncPersonResignedState==='function') syncPersonResignedState('driver', person);
      }catch(_e){}
      saveData(true); closeModal(); showToast('تم الحفظ'); rerenderCurrentPage();
    };
    if(typeof guardEntityDuplicates==='function'){
      guardEntityDuplicates('driver', payload, isEdit && d ? d.id : null).then(ok=>{ if(ok) commitDrv(); });
    } else commitDrv();
  });
}
function openFuelModal(){
  openModal(`<div class="modal-header"><h3>صرف وقود</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body"><div class="form-grid form-grid-2">
      <label>المعدة *<div>${typeof entityComboHtml==='function'?entityComboHtml('flEq','equipment','','اكتب اسم المعدة...'):`<select class="input" id="flEq">${equipmentOptions('')}</select>`}</div></label>
      <label>التاريخ<input class="input" id="flDate" type="date" value="${todayISO()}"></label>
      <label>المشروع${projectInputHtml('flProject','','flProjList')}</label>
      <label>السائق<div>${typeof entityComboHtml==='function'?entityComboHtml('flDrv','driver','','اكتب اسم السائق...'):`<select class="input" id="flDrv">${driverOptions('')}</select>`}</div></label>
      <label>الكمية (لتر)*<input class="input" id="flLiters" type="number" min="0" step="0.01" value="" placeholder="0"></label>
      <label>ساعات التشغيل<input class="input" id="flHours" type="number" min="0" step="0.5" value="" placeholder="0"></label>
      <label>سعر اللتر<input class="input" id="flPrice" type="number" min="0" step="0.01" value="" placeholder="0"></label>
      <label>التكلفة<input class="input" id="flCost" type="number" min="0" step="0.01" value="" placeholder="0"></label>
      <label style="grid-column:1/-1;">ملاحظات<textarea class="input" id="flNotes" rows="4"></textarea></label>
    </div></div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" id="btnSaveFl">حفظ</button></div>`);
  const recalc=()=>{
    const l=toInt(document.getElementById('flLiters').value);
    const p=toInt(document.getElementById('flPrice').value);
    if(p) document.getElementById('flCost').value=toInt(l*p);
  };
  document.getElementById('flLiters').oninput=recalc;
  document.getElementById('flPrice').oninput=recalc;
  document.getElementById('flEq').onchange=()=>{
    const eq=getEquipment(document.getElementById('flEq').value);
    if(eq){
      if(eq.fuelPrice) document.getElementById('flPrice').value=toInt(eq.fuelPrice);
      if(eq.project) document.getElementById('flProject').value=eq.project;
      recalc();
    }
  };
  document.getElementById('btnSaveFl').onclick=()=>{
    const eid=document.getElementById('flEq').value;
    const liters=Number(document.getElementById('flLiters').value)||0;
    if(!eid){showToast('اختر المعدة');return;}
    if(liters<=0){showToast('أدخل الكمية');return;}
    const project=(document.getElementById('flProject').value||'').trim();
    const payload={id:uid(),equipmentId:eid,date:document.getElementById('flDate').value,
      project,driverId:document.getElementById('flDrv').value||'',
      liters,hours:Number(document.getElementById('flHours').value)||0,
      pricePerLiter:toInt(document.getElementById('flPrice').value),
      cost:toInt(document.getElementById('flCost').value),
      notes:(document.getElementById('flNotes').value||'').trim()};
    if(project)ensureProjectSaved(project);
    DATA.fuelLogs=DATA.fuelLogs||[]; DATA.fuelLogs.push(payload);
    saveData(true);closeModal();showToast('تم تسجيل الوقود');rerenderCurrentPage();
  };
}

/* ---- نقل موارد ---- */
function transferRefName(t){
  if(t.kind==='worker') return typeof workerName==='function'?workerName(t.refId):'';
  if(t.kind==='supervisor') return typeof supervisorName==='function'?supervisorName(t.refId):'';
  if(t.kind==='driver') return typeof driverName==='function'?driverName(t.refId):'';
  if(t.kind==='employee') return typeof employeeName==='function'?employeeName(t.refId):'';
  if(t.kind==='equipment'){
    const eq = typeof getEquipment==='function'?getEquipment(t.refId):(DATA.equipment||[]).find(x=>x.id===t.refId);
    return eq ? (eq.typeLabel||eq.name||eq.code||'') : '';
  }
  return '';
}
function transferKindLabel(k){
  return ({worker:'عامل',supervisor:'مشرف',driver:'سائق',employee:'موظف',equipment:'معدة / مركبة'})[k]||k||'';
}
function renderTransfersPage(){
  const q = (window.__trQ||'').trim().toLowerCase();
  const kindF = window.__trKind||'';
  let list=(DATA.resourceTransfers||[]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  if(kindF) list = list.filter(t=>t.kind===kindF);
  if(q) list = list.filter(t=>{
    const nm = (transferRefName(t)||'').toLowerCase();
    return smartMatch(nm, q) || smartMatch(t.fromProject, q) || smartMatch(t.toProject, q) || smartMatch(t.reason, q);
  });
  try{
    if(typeof setPageExport==='function') setPageExport('transfers',
      ['التاريخ','النوع','الاسم','من مشروع','إلى مشروع','السائق','الحالة قبل','الحالة بعد','السبب'],
      list.map(tr=>[
        tr.date, transferKindLabel(tr.kind), transferRefName(tr),
        tr.fromProject, tr.toProject,
        typeof driverName==='function'?driverName(tr.driverId):'',
        tr.statusBefore||'', tr.statusAfter||'', tr.reason||''
      ]));
  }catch(_e){}

  const pg = typeof paginateRows==='function' ? paginateRows(list, 'transfers') : { pageRows: list, total: list.length };
  return `<div class="page">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
      <div>
        <h2 class="page-title" style="margin:0;">حركة ونقل الموارد</h2>
        <p class="page-sub" style="margin:4px 0 0;">نقل عامل أو مشرف أو سائق أو موظف أو معدة بين المشاريع</p>
      </div>
      <div class="btn-row">
        ${typeof pageExportButtonsHtml==='function'?pageExportButtonsHtml():''}
        <button class="btn btn-primary" id="btnAddTransfer" ${readOnlyMode?'disabled':''}>+ أمر نقل</button>
      </div>
    </div>
    <div class="filters-bar">
      <input type="search" id="trSearch" class="input" placeholder="بحث بالاسم / المشروع / السبب..." value="${escapeHtml(window.__trQ||'')}" style="min-width:180px;">
      <select id="trFilterKind" class="input">
        <option value="">كل الأنواع</option>
        <option value="worker" ${kindF==='worker'?'selected':''}>عامل</option>
        <option value="supervisor" ${kindF==='supervisor'?'selected':''}>مشرف</option>
        <option value="driver" ${kindF==='driver'?'selected':''}>سائق</option>
        <option value="employee" ${kindF==='employee'?'selected':''}>موظف</option>
        <option value="equipment" ${kindF==='equipment'?'selected':''}>معدة / مركبة</option>
      </select>
      <button class="btn btn-outline btn-sm" id="trApply">تطبيق</button>
    </div>
    <div class="stats-row" style="margin-bottom:12px;">
      <div class="stat-card"><div class="num">${list.length}</div><div class="lbl">أوامر النقل</div></div>
    </div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>التاريخ</th><th>النوع</th><th>الاسم</th><th>من</th><th>إلى</th><th>السائق</th><th>السبب</th><th></th></tr></thead>
      <tbody>${(pg.pageRows||list).length?(pg.pageRows||list).map(t=>`<tr>
          <td>${fmtDate(t.date)}</td>
          <td>${escapeHtml(transferKindLabel(t.kind))}</td>
          <td><strong>${escapeHtml(transferRefName(t))}</strong></td>
          <td>${escapeHtml(t.fromProject||'—')}</td>
          <td>${escapeHtml(t.toProject||'—')}</td>
          <td>${escapeHtml((typeof driverName==='function'?driverName(t.driverId):'')||'—')}</td>
          <td>${escapeHtml(t.reason||'')}</td>
          <td style="white-space:nowrap;">
            <button class="btn btn-outline btn-sm btn-del-tr" data-id="${t.id}" ${readOnlyMode?'disabled':''}>🗑️</button>
          </td>
        </tr>`).join(''):'<tr><td colspan="8" style="text-align:center;color:var(--ink-soft);padding:24px;">لا أوامر نقل</td></tr>'}
      </tbody></table></div>
      ${typeof tablePagerHtml==='function'?tablePagerHtml('transfers', pg):''}
    </div>`;
}
function initTransfersEvents(){
  document.getElementById('btnAddTransfer')?.addEventListener('click',()=>openTransferModal());
  document.getElementById('trApply')?.addEventListener('click',()=>{
    window.__trQ = document.getElementById('trSearch')?.value||'';
    window.__trKind = document.getElementById('trFilterKind')?.value||'';
    if(typeof resetTablePage==='function') resetTablePage('transfers');
    rerenderCurrentPage();
  });
  document.getElementById('trSearch')?.addEventListener('keydown',(e)=>{
    if(e.key==='Enter') document.getElementById('trApply')?.click();
  });
  document.querySelectorAll('.btn-del-tr').forEach(b=>b.addEventListener('click',()=>{
    confirmDelete().then(ok=>{ if(!ok) return;
      DATA.resourceTransfers=(DATA.resourceTransfers||[]).filter(t=>t.id!==b.getAttribute('data-id'));
      saveData(true);showToast('تم الحذف');rerenderCurrentPage();
    });
  }));
}
function openTransferModal(){
  openModal(`
    <div class="modal-header"><h3>أمر نقل مورد</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-grid form-grid-2">
        <label>نوع المورد *
          <select class="input" id="trKind">
            <option value="worker">عامل</option>
            <option value="supervisor">مشرف</option>
            <option value="driver">سائق</option>
            <option value="employee">موظف</option>
            <option value="equipment">معدة / مركبة</option>
          </select>
        </label>
        <label>التاريخ
          <input class="input" id="trDate" type="date" value="${todayISO()}">
        </label>
        <label id="trRefLabel" style="grid-column:1/-1;">المورد *
          <div id="trRefBox"></div>
        </label>
        <label>من مشروع
          ${typeof projectInputHtml==='function'?projectInputHtml('trFrom','','trFromList'):`<input class="input" id="trFrom" list="trFromList"><datalist id="trFromList"></datalist>`}
        </label>
        <label>إلى مشروع *
          ${typeof projectInputHtml==='function'?projectInputHtml('trTo','','trToList'):`<input class="input" id="trTo" list="trToList"><datalist id="trToList"></datalist>`}
        </label>
        <label>سائق النقل (اختياري)
          <div id="trDrvBox">${typeof entityComboHtml==='function'?entityComboHtml('trDrv','driver','','اختياري...'):`<select class="input" id="trDrv"><option value="">—</option></select>`}</div>
        </label>
        <label>حالة قبل النقل
          <input class="input" id="trBefore" placeholder="مثال: تعمل / متوقفة">
        </label>
        <label>حالة بعد الوصول
          <input class="input" id="trAfter" placeholder="مثال: تعمل">
        </label>
        <label style="grid-column:1/-1;">سبب النقل
          <input class="input" id="trReason" placeholder="نقل لمشروع جديد، صيانة...">
        </label>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="btnSaveTr">تنفيذ النقل</button>
    </div>
  `);
  function fillRef(){
    const k = document.getElementById('trKind').value;
    const box = document.getElementById('trRefBox');
    if(box && typeof entityComboHtml==='function'){
      box.innerHTML = entityComboHtml('trRef', k, '', 'اكتب الاسم أو الكود...');
      if(typeof bindEntityCombos==='function') bindEntityCombos(document.getElementById('appModal')||document);
    }
  }
  function fillFromProject(){
    const k = document.getElementById('trKind')?.value;
    const id = typeof getEntityComboValue==='function' ? getEntityComboValue('trRef') : document.getElementById('trRef')?.value;
    if(!id) return;
    let from = '';
    try{
      if(k==='worker'){ const w=typeof getWorker==='function'?getWorker(id):null; from=w&&w.project||''; }
      else if(k==='supervisor'){ const s=typeof getSupervisor==='function'?getSupervisor(id):null; from=s&&s.project||''; }
      else if(k==='driver'){ const d=typeof getDriver==='function'?getDriver(id):(DATA.drivers||[]).find(x=>x.id===id); from=d&&d.project||''; }
      else if(k==='employee'){ const e=typeof getEmployee==='function'?getEmployee(id):null; from=e&&e.project||''; }
      else { const eq=typeof getEquipment==='function'?getEquipment(id):(DATA.equipment||[]).find(x=>x.id===id); from=eq&&eq.project||''; }
    }catch(_e){}
    const fromEl = document.getElementById('trFrom');
    if(fromEl && from) fromEl.value = from;
  }
  document.getElementById('trKind')?.addEventListener('change', fillRef);
  fillRef();
  setTimeout(()=>{
    document.getElementById('trRef')?.addEventListener('change', fillFromProject);
  }, 80);
  if(typeof bindEntityCombos==='function') bindEntityCombos(document.getElementById('appModal')||document);

  document.getElementById('btnSaveTr').addEventListener('click', ()=>{
    const kind = document.getElementById('trKind').value;
    const refId = (typeof getEntityComboValue==='function'?getEntityComboValue('trRef'):'') || document.getElementById('trRef')?.value || '';
    const toProject = (document.getElementById('trTo').value||'').trim();
    if(!refId){ showToast('اختر المورد'); return; }
    if(!toProject){ showToast('حدد المشروع الوجهة'); return; }
    let fromProject = (document.getElementById('trFrom').value||'').trim();
    const drvId = (typeof getEntityComboValue==='function'?getEntityComboValue('trDrv'):'') || document.getElementById('trDrv')?.value || '';
    const rec = {
      id: uid(), kind, refId,
      date: document.getElementById('trDate').value||todayISO(),
      fromProject, toProject,
      driverId: drvId,
      statusBefore: (document.getElementById('trBefore').value||'').trim(),
      statusAfter: (document.getElementById('trAfter').value||'').trim(),
      reason: (document.getElementById('trReason').value||'').trim()
    };
    // تحديث المشروع الحالي للمورد
    if(kind==='worker'){
      const w=typeof getWorker==='function'?getWorker(refId):null;
      if(w){ if(!fromProject) rec.fromProject=w.project||''; w.project=toProject; w.projectSince=rec.date; }
    } else if(kind==='supervisor'){
      const s=typeof getSupervisor==='function'?getSupervisor(refId):null;
      if(s){ if(!fromProject) rec.fromProject=s.project||''; s.project=toProject; s.projectSince=rec.date; }
    } else if(kind==='driver'){
      const d=typeof getDriver==='function'?getDriver(refId):(DATA.drivers||[]).find(x=>x.id===refId);
      if(d){ if(!fromProject) rec.fromProject=d.project||''; d.project=toProject; d.projectSince=rec.date; }
    } else if(kind==='employee'){
      const e=typeof getEmployee==='function'?getEmployee(refId):null;
      if(e){ if(!fromProject) rec.fromProject=e.project||''; e.project=toProject; }
    } else if(kind==='equipment'){
      const eq=typeof getEquipment==='function'?getEquipment(refId):(DATA.equipment||[]).find(x=>x.id===refId);
      if(eq){ if(!fromProject) rec.fromProject=eq.project||''; eq.project=toProject; eq.projectSince=rec.date; }
    }
    if(typeof ensureProjectSaved==='function') ensureProjectSaved(toProject);
    if(fromProject && typeof ensureProjectSaved==='function') ensureProjectSaved(fromProject);
    DATA.resourceTransfers = DATA.resourceTransfers||[];
    DATA.resourceTransfers.push(rec);
    addAudit('نقل مورد', transferKindLabel(kind)+' → '+toProject);
    saveData(true);
    closeModal();
    showToast('تم تنفيذ أمر النقل');
    rerenderCurrentPage();
  });
}

function renderPerformancePage(){
  const list = (DATA.performanceReviews||[]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const by = { employee:[], worker:[], supervisor:[], driver:[] };
  list.forEach(r=>{
    const k = r.kind||'worker';
    if(by[k]) by[k].push(r); else by.worker.push(r);
  });
  function personLabel(r){
    if(r.kind==='employee') return employeeName(r.personId);
    if(r.kind==='supervisor') return supervisorName(r.personId);
    if(r.kind==='driver') return driverName(r.personId);
    return workerName(r.personId);
  }
  function score(r){
    return toInt(r.commitment)+toInt(r.attendanceScore)+toInt(r.productivity)+toInt(r.quality)+toInt(r.managerScore)-toInt(r.violations);
  }
  function section(title, rows, kind){
    return `
      <div class="section-title" style="margin-top:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <span>${title} (${rows.length})</span>
        <button type="button" class="btn btn-outline btn-sm btn-add-perf-kind" data-kind="${kind}" ${readOnlyMode?'disabled':''}>+ تقييم ${title.replace(/^[^ ]+ /,'')}</button>
      </div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>التاريخ</th><th>الاسم</th><th>الالتزام</th><th>الحضور</th><th>الإنتاجية</th><th>الجودة</th><th>تقييم المدير</th><th>المخالفات</th><th>المجموع</th><th></th></tr></thead>
        <tbody>
          ${rows.length? rows.map(r=>`<tr>
            <td>${fmtDate(r.date)}</td>
            <td><strong>${escapeHtml(personLabel(r))}</strong></td>
            <td>${escapeHtml(r.commitment||0)}</td>
            <td>${escapeHtml(r.attendanceScore||0)}</td>
            <td>${escapeHtml(r.productivity||0)}</td>
            <td>${escapeHtml(r.quality||0)}</td>
            <td>${escapeHtml(r.managerScore||0)}</td>
            <td style="color:var(--debt)">${escapeHtml(r.violations||0)}</td>
            <td><strong>${score(r)}</strong></td>
            <td><button class="btn btn-outline btn-sm btn-del-perf" data-id="${r.id}" ${readOnlyMode?'disabled':''}>حذف</button></td>
          </tr>`).join('') : '<tr><td colspan="10" style="text-align:center;color:var(--ink-soft);padding:16px;">لا تقييمات في هذا القسم</td></tr>'}
        </tbody>
      </table></div>`;
  }
  return `<div class="page">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
      <div>
        <h2 class="page-title" style="margin:0;">تقييم الأداء</h2>
        <p class="page-sub" style="margin:4px 0 0;">موظفين · عمال · مشرفين · سائقين — التزام · حضور · إنتاجية · جودة</p>
      </div>
      <button class="btn btn-primary" id="btnAddPerf" ${readOnlyMode?'disabled':''}>+ تقييم جديد</button>
    </div>
    <div class="stats-row">
      <div class="stat-card"><div class="num">${by.employee.length}</div><div class="lbl">تقييمات موظفين</div></div>
      <div class="stat-card"><div class="num">${by.worker.length}</div><div class="lbl">تقييمات عمال</div></div>
      <div class="stat-card"><div class="num">${by.supervisor.length}</div><div class="lbl">تقييمات مشرفين</div></div>
      <div class="stat-card"><div class="num">${by.driver.length}</div><div class="lbl">تقييمات سائقين</div></div>
    </div>
    ${section('👔 الموظفين', by.employee, 'employee')}
    ${section('🧑‍🔧 العمال', by.worker, 'worker')}
    ${section('🧑‍💼 المشرفون', by.supervisor, 'supervisor')}
    ${section('🧑‍🚒 السائقون', by.driver, 'driver')}
  </div>`;
}
function initPerformanceEvents(){
  document.getElementById('btnAddPerf')?.addEventListener('click',()=>openPerfModal('worker'));
  document.querySelectorAll('.btn-add-perf-kind').forEach(b=>b.addEventListener('click',()=>openPerfModal(b.getAttribute('data-kind'))));
  document.querySelectorAll('.btn-del-perf').forEach(b=>b.addEventListener('click',()=>{
    confirmDelete().then(ok=>{ if(!ok) return;
      DATA.performanceReviews=(DATA.performanceReviews||[]).filter(r=>r.id!==b.getAttribute('data-id'));
      saveData(true);showToast('تم');rerenderCurrentPage();
    });
  }));
}
function openPerfModal(forceKind){
  const kind0 = forceKind || 'worker';
  openModal(`
    <div class="modal-header"><h3>تقييم أداء</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body"><div class="form-grid form-grid-2">
      <label>الفئة *
        <select class="input" id="pfKind">
          <option value="employee" ${kind0==='employee'?'selected':''}>موظف</option>
          <option value="worker" ${kind0==='worker'?'selected':''}>عامل</option>
          <option value="supervisor" ${kind0==='supervisor'?'selected':''}>مشرف</option>
          <option value="driver" ${kind0==='driver'?'selected':''}>سائق</option>
        </select>
      </label>
      <label>التاريخ<input class="input" id="pfDate" type="date" value="${todayISO()}"></label>
      <label style="grid-column:1/-1;" id="pfPersonWrap">الشخص *<select class="input" id="pfPerson"></select></label>
      <label>الالتزام (1-10)<input class="input" id="pfCommit" type="number" min="0" max="10" value="8"></label>
      <label>الحضور (1-10)<input class="input" id="pfAtt" type="number" min="0" max="10" value="8"></label>
      <label>الإنتاجية (1-10)<input class="input" id="pfProd" type="number" min="0" max="10" value="7"></label>
      <label>جودة العمل (1-10)<input class="input" id="pfQual" type="number" min="0" max="10" value="7"></label>
      <label>عدد المخالفات<input class="input" id="pfViol" type="number" min="0" value="0"></label>
      <label>تقييم المدير (1-10)<input class="input" id="pfMgr" type="number" min="0" max="10" value="7"></label>
      <label style="grid-column:1/-1;">ملاحظات<textarea class="input" id="pfNotes" rows="2"></textarea></label>
    </div></div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="btnSavePf">حفظ</button>
    </div>
  `);
  function fillPerson(){
    const k = document.getElementById('pfKind').value;
    let opts = '';
    if(k==='employee') opts = empOptions('');
    else if(k==='supervisor') opts = supervisorOptions('', '— اختر المشرف —');
    else if(k==='driver') opts = driverOptions('');
    else opts = workerOptions('');
    document.getElementById('pfPersonWrap').innerHTML = 'الشخص *<select class="input" id="pfPerson">'+opts+'</select>';
  }
  document.getElementById('pfKind').onchange = fillPerson;
  fillPerson();
  document.getElementById('btnSavePf').onclick = ()=>{
    const personId = document.getElementById('pfPerson').value;
    if(!personId){ showToast('اختر الشخص'); return; }
    DATA.performanceReviews = DATA.performanceReviews||[];
    DATA.performanceReviews.push({
      id: uid(),
      kind: document.getElementById('pfKind').value,
      personId,
      date: document.getElementById('pfDate').value,
      commitment: toInt(document.getElementById('pfCommit').value),
      attendanceScore: toInt(document.getElementById('pfAtt').value),
      productivity: toInt(document.getElementById('pfProd').value),
      quality: toInt(document.getElementById('pfQual').value),
      violations: toInt(document.getElementById('pfViol').value),
      managerScore: toInt(document.getElementById('pfMgr').value),
      notes: (document.getElementById('pfNotes').value||'').trim()
    });
    saveData(true);
    closeModal();
    showToast('تم التقييم');
    rerenderCurrentPage();
  };
}
/* ensureDocumentTypeSaved — في helpers.js */
/** قائمة موحّدة: إرفاق مستند — opts: { kind, personId } */

function openManageDocTypesModal(){
  // كل الاقتراحات الحالية (بعد إخفاء المحذوفة)
  const labels = typeof getAllDocumentTypeLabels==='function' ? getAllDocumentTypeLabels() : [];
  const rows = labels.map(l=>`<div class="pitem-row" style="display:flex;gap:8px;align-items:center;padding:6px 4px;border-bottom:1px solid var(--line);">
      <span style="flex:1;">${escapeHtml(l)}</span>
      <button type="button" class="btn btn-outline btn-sm btn-del-dtype" data-name="${escapeHtml(l)}">حذف</button>
    </div>`).join('');
  openSubModal(`
    <div class="modal-header"><h3>إدارة أنواع المستندات</h3><button class="modal-close" onclick="closeSubModal()">×</button></div>
    <div class="modal-body">
      <label>إضافة نوع جديد
        <div style="display:flex;gap:8px;margin-top:4px;">
          <input class="input" id="newDocTypeName" placeholder="اسم النوع...">
          <button type="button" class="btn btn-primary btn-sm" id="btnAddDocType">إضافة</button>
        </div>
      </label>
      <div style="max-height:320px;overflow:auto;margin-top:12px;">${rows||'<p style="color:var(--ink-soft)">لا أنواع</p>'}</div>
      <p style="font-size:12px;color:var(--ink-soft);margin-top:10px;">احذف أي اقتراح لا تحتاجه. يمكنك إضافة أنواع جديدة في أي وقت.</p>
    </div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeSubModal()">إغلاق</button></div>
  `);
  document.getElementById('btnAddDocType')?.addEventListener('click', ()=>{
    const v = (document.getElementById('newDocTypeName')?.value||'').trim();
    if(!v) return;
    // إزالة من المخفي إن وُجد
    if(DATA.documentTypeHidden) DATA.documentTypeHidden = (DATA.documentTypeHidden||[]).filter(x=>x!==v);
    if(typeof ensureDocumentTypeSaved==='function') ensureDocumentTypeSaved(v);
    saveData(true);
    showToast('تمت الإضافة');
    closeSubModal();
    openManageDocTypesModal();
  });
  document.querySelectorAll('.btn-del-dtype').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const name = btn.getAttribute('data-name')||'';
      DATA.documentTypes = (DATA.documentTypes||[]).filter(t=>String(t.name||t.label||'').trim()!==name);
      if(!Array.isArray(DATA.documentTypeHidden)) DATA.documentTypeHidden = [];
      if(name && !DATA.documentTypeHidden.includes(name)) DATA.documentTypeHidden.push(name);
      saveData(true);
      showToast('تم الحذف من الاقتراحات');
      closeSubModal();
      openManageDocTypesModal();
    });
  });
}

function openDocModal(opts){
  opts = opts || {};
  const preKind = opts.kind || 'worker';
  const prePerson = opts.personId || '';
  const tempId = uid();
  if(!window.__docDrafts) window.__docDrafts = {};
  window.__docDrafts[tempId] = { id: tempId, attachments: [] };

  function personOpts(kind, selected){
    if(kind==='employee') return typeof empOptions==='function'?empOptions(selected):'';
    if(kind==='driver') return typeof driverOptions==='function'?driverOptions(selected):'';
    if(kind==='supervisor') return typeof supervisorOptions==='function'?supervisorOptions(selected,'— اختر المشرف —'):'';
    if(kind==='equipment') return typeof equipmentOptions==='function'?equipmentOptions(selected):'';
    if(kind==='project') return (DATA.projects||[]).map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${escapeHtml((p.code?p.code+' — ':'')+(p.name||''))}</option>`).join('');
    return typeof workerOptions==='function'?workerOptions(selected):'';
  }

  openModal(`
    <div class="modal-header"><h3>إرفاق مستند</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-grid form-grid-2">
        <label>نوع السجل *
          <select class="input" id="docKind">
            <option value="worker" ${preKind==='worker'?'selected':''}>عامل</option>
            <option value="employee" ${preKind==='employee'?'selected':''}>موظف</option>
            <option value="supervisor" ${preKind==='supervisor'?'selected':''}>مشرف</option>
            <option value="driver" ${preKind==='driver'?'selected':''}>سائق</option>
            <option value="equipment" ${preKind==='equipment'?'selected':''}>معدة / مركبة</option>
            <option value="project" ${preKind==='project'?'selected':''}>مشروع</option>
          </select>
        </label>
        <label>تاريخ الانتهاء (اختياري)
          <input class="input" id="docExp" type="date">
        </label>
        <label style="grid-column:1/-1;" id="docPersonWrap">الشخص / المعدة * (اكتب للبحث)
          <div id="docPersonCombo">${typeof entityComboHtml==='function'?entityComboHtml('docPerson', preKind, prePerson, 'اكتب الاسم أو الكود...'):`<select class="input" id="docPerson">${personOpts(preKind, prePerson)}</select>`}</div>
        </label>
        <label style="grid-column:1/-1;">نوع المستند * (اكتب أو اختر من الاقتراحات)
          <div id="docTypeComboBox"></div>
          <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
            <button type="button" class="btn btn-outline btn-sm" id="btnManageDocTypes">إدارة الاقتراحات</button>
          </div>
        </label>
        <label style="grid-column:1/-1;">ملاحظات
          <textarea class="input" id="docNotes" rows="4" placeholder="اختياري"></textarea>
        </label>
        <div style="grid-column:1/-1;">
          <div class="section-title" style="margin-top:4px;">المرفقات</div>
          <p style="font-size:12.5px;color:var(--ink-soft);margin:0 0 8px;">استخدم «رفع ملف من الجهاز» لاختيار صورة أو PDF، أو «مسح / كاميرا» للماسح.</p>
          <div id="docAttList" class="form-att-list" data-kind="document" data-eid="${tempId}"></div>
          <div class="att-toolbar" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px;">
            <button type="button" class="btn btn-primary btn-sm" id="btnDocPickFile">📁 رفع ملف من الجهاز</button>
            <button type="button" class="btn btn-outline btn-sm" id="btnDocScan">📷 مسح / كاميرا</button>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="btnSaveDoc">حفظ في الأرشيف</button>
    </div>
  `);
  if(typeof bindAttachmentHandlers==='function') bindAttachmentHandlers(document.getElementById('appModal'));

  async function attachFilesToDocDraft(scan){
    const draft = window.__docDrafts[tempId];
    if(!draft){ showToast('تعذر بدء المسودة'); return; }
    let title = (document.getElementById('docType')?.value||'').trim()
      || (document.getElementById('docType_text')?.value||'').trim()
      || 'مرفق';
    if(!window.desktopApi || !window.desktopApi.pickAttachments){
      showToast('الإرفاق متاح في نسخة سطح المكتب فقط'); return;
    }
    try{
      if(scan){
        try{ if(window.desktopApi.scanWindows) await window.desktopApi.scanWindows(); }catch(_e){}
      }
      const res = await window.desktopApi.pickAttachments('document_'+tempId, title);
      if(!res || res.canceled) return;
      const files = res.files || [];
      if(!files.length){ showToast('لم يتم اختيار ملفات'); return; }
      if(!draft.attachments) draft.attachments = [];
      files.forEach(f=>{
        draft.attachments.push({
          id: uid(),
          name: title || f.name || 'ملف',
          path: f.path || '',
          storedName: f.storedName || f.name || '',
          mime: f.mime || '',
          addedAt: new Date().toISOString()
        });
      });
      const listEl = document.getElementById('docAttList');
      if(listEl){
        listEl.innerHTML = typeof attachmentsListHtml==='function'
          ? attachmentsListHtml(draft.attachments, 'document', tempId) : '';
      }
      if(typeof bindAttachmentHandlers==='function') bindAttachmentHandlers(document.getElementById('appModal'));
      showToast('تم إضافة '+files.length+' ملف — اضغط حفظ في الأرشيف');
    }catch(e){
      console.error(e);
      showToast('فشل رفع الملف: '+(e.message||e));
    }
  }
  const pickBtn = document.getElementById('btnDocPickFile');
  if(pickBtn) pickBtn.addEventListener('click', (e)=>{ e.preventDefault(); attachFilesToDocDraft(false); });
  const scanBtn = document.getElementById('btnDocScan');
  if(scanBtn) scanBtn.addEventListener('click', (e)=>{ e.preventDefault(); attachFilesToDocDraft(true); });
  document.querySelectorAll('#appModal .btn-pick-file-att').forEach(btn=>{
    btn.addEventListener('click', (e)=>{ e.preventDefault(); attachFilesToDocDraft(false); });
  });

  document.querySelectorAll('.btn-del-doc-type').forEach(b=> b.addEventListener('click', ()=>{
    const id = b.getAttribute('data-id');
    DATA.documentTypes = (DATA.documentTypes||[]).filter(t=>t.id!==id);
    saveData(true);
    showToast('تم حذف النوع');
    b.closest('span')?.remove();
  }));

  // نوع المستند — خانة كتابة مع اقتراحات
  const typeBox = document.getElementById('docTypeComboBox');
  if(typeBox && typeof docTypeComboHtml==='function'){
    typeBox.innerHTML = docTypeComboHtml('docType', '');
    if(typeof bindDocTypeCombos==='function') bindDocTypeCombos(document.getElementById('appModal'));
  } else if(typeBox){
    typeBox.innerHTML = `<input class="input" id="docType" list="docTypeSuggestList" placeholder="مثال: بطاقة شخصية، شهادة ميلاد، عقد عمل..." autocomplete="off">
      <datalist id="docTypeSuggestList">${(typeof getAllDocumentTypeLabels==='function'?getAllDocumentTypeLabels():[]).map(l=>`<option value="${escapeHtml(l)}"></option>`).join('')}</datalist>`;
  }
  document.getElementById('btnManageDocTypes')?.addEventListener('click', ()=>{
    if(typeof openManageDocTypesModal==='function') openManageDocTypesModal();
    else showToast('إدارة الأنواع غير متاحة');
  });

  document.getElementById('docKind').onchange = ()=>{
    const k = document.getElementById('docKind').value;
    const box = document.getElementById('docPersonCombo');
    if(box && typeof entityComboHtml==='function'){
      box.innerHTML = entityComboHtml('docPerson', k, '', 'اكتب الاسم أو الكود...');
      bindEntityCombos(document.getElementById('appModal'));
    } else {
      const wrap = document.getElementById('docPersonWrap');
      const label = k==='equipment' ? 'المعدة *' : (k==='project' ? 'المشروع *' : 'الشخص *');
      if(wrap) wrap.innerHTML = label+'<select class="input" id="docPerson">'+personOpts(k, '')+'</select>';
    }
    if(typeof fillDocTypeSuggestions==='function') fillDocTypeSuggestions(k);
  };
  
  function fillDocTypeSuggestions(kind){
    const typeBox = document.getElementById('docTypeComboBox');
    if(!typeBox) return;
    const labels = typeof getDocumentTypeLabelsForKind==='function'
      ? getDocumentTypeLabelsForKind(kind)
      : (typeof getAllDocumentTypeLabels==='function'?getAllDocumentTypeLabels():[]);
    typeBox.innerHTML = `<input class="input" id="docType" list="docTypeSuggestList" placeholder="اكتب نوع المستند..." autocomplete="off" value="">
      <datalist id="docTypeSuggestList">${labels.map(l=>`<option value="${escapeHtml(l)}"></option>`).join('')}</datalist>`;
  }
  fillDocTypeSuggestions(preKind);
  document.getElementById('btnManageDocTypes')?.addEventListener('click', ()=>{
    if(typeof openManageDocTypesModal==='function') openManageDocTypesModal();
  });

  if(typeof bindEntityCombos==='function') bindEntityCombos(document.getElementById('appModal'));

  document.getElementById('btnSaveDoc').onclick = ()=>{
    const personId = document.getElementById('docPerson')?.value;
    let title = (document.getElementById('docType')?.value||'').trim()
      || (document.getElementById('docType_text')?.value||'').trim();
    if(!personId){ showToast('اختر الشخص أو المعدة أو المشروع'); return; }
    if(!title){ showToast('اكتب أو اختر نوع المستند'); return; }
    const kind = document.getElementById('docKind').value;
    if(typeof ensureDocumentTypeSaved==='function') ensureDocumentTypeSaved(title, kind);
    const docType = title;
    const draftAtt = (window.__docDrafts && window.__docDrafts[tempId] && window.__docDrafts[tempId].attachments) || [];
    if(!draftAtt.length){ showToast('أرفق ملفاً أو امسح مستنداً على الأقل'); return; }
    const rec = {
      id: tempId,
      kind, personId, title, docType: docType||title,
      expiryDate: document.getElementById('docExp').value||'',
      notes: (document.getElementById('docNotes').value||'').trim(),
      attachments: draftAtt.slice()
    };
    DATA.personDocuments = DATA.personDocuments||[];
    DATA.personDocuments.push(rec);
    let person = null;
    if(kind==='worker') person = getWorker(personId);
    else if(kind==='employee') person = getEmployee(personId);
    else if(kind==='driver') person = typeof getDriver==='function'?getDriver(personId):(DATA.drivers||[]).find(d=>d.id===personId);
    else if(kind==='supervisor') person = getSupervisor(personId);
    else if(kind==='equipment') person = getEquipment(personId);
    else if(kind==='project') person = (DATA.projects||[]).find(x=>x.id===personId);
    if(person){
      if(!Array.isArray(person.attachments)) person.attachments = [];
      const existingPaths = new Set(person.attachments.map(x=>x && x.path).filter(Boolean));
      draftAtt.forEach(a=>{
        if(a && a.path && existingPaths.has(a.path)) return;
        if(a && a.path) existingPaths.add(a.path);
        person.attachments.push(Object.assign({}, a, { note: title, fromDoc: title, docType: title }));
      });
    }
    if(window.__docDrafts) delete window.__docDrafts[tempId];
    addAudit('إرفاق مستند', title+' — '+(person&&person.name||personId));
    saveData(true);
    closeModal();
    showToast('تم حفظ المستند في أرشيف '+(person&&person.name||''));
    // افتح مجلد الشخص إن كنا في الأرشيف
    try{
      if(typeof archiveFilters!=='undefined' && typeof archiveFolderKey==='function'){
        archiveFilters.folderKey = archiveFolderKey(kind, personId);
        archiveFilters.kind = kind;
      }
    }catch(e){}
    rerenderCurrentPage();
  };
}





/* ---- مصاريف (مشرفين + تراخيص) ---- */


/* ---- كتالوج مصاريف معدات ومركبات ---- */
const VEHICLE_EXPENSE_CATALOG = {
  'تراخيص وتجديد': [
    'رسوم تجديد الترخيص',
    'الضريبة السنوية',
    'التأمين الإجباري (مع الترخيص)',
    'رسوم الفحص الفني',
    'رسوم شهادة البيانات',
    'رسوم شهادة المخالفات',
    'رسوم استخراج/تجديد رخصة السيارة',
    'رسوم اللوحات المعدنية',
    'رسوم بدل فاقد/تالف للرخصة',
    'رسوم نقل الملكية',
    'رسوم تغيير بيانات السيارة',
    'رسوم تغيير محل الإقامة/العنوان',
    'رسوم تغيير لون السيارة أو البيانات الفنية',
    'رسوم المطابقة/الفحص عند تغيير البيانات',
    'رسوم وضرائب ترخيص سيارة النقل',
    'رسوم تصاريح أو مستندات النشاط'
  ],
  'مستندات وشهادات': [
    'بيان تشكيل السيارة',
    'شهادة بيانات',
    'شهادة مخالفات',
    'شهادة فحص',
    'شهادة صلاحية',
    'استخراج صورة من ملف السيارة',
    'استخراج بدل فاقد للمستندات',
    'تصديق أو اعتماد المستندات',
    'رسوم استخراج المستندات من المرور',
    'رسوم الاستعلام عن السيارة'
  ],
  'مخالفات وغرامات': [
    'مخالفات مرورية',
    'غرامات تأخير التجديد',
    'غرامات رخصة القيادة',
    'مخالفات انتظار',
    'مخالفات حمولة',
    'مخالفات سرعة',
    'مخالفات إشارات',
    'مخالفات مرور إلكترونية',
    'رسوم التصالح في المخالفات',
    'رسوم رفع الحظر / إجراءات المخالفة'
  ],
  'تأمين': [
    'التأمين الإجباري',
    'التأمين التكميلي',
    'تأمين ضد الحوادث',
    'تأمين ضد السرقة',
    'تأمين المسؤولية المدنية',
    'تجديد وثيقة التأمين',
    'رسوم إصدار الوثيقة',
    'مصروفات المطالبات التأمينية'
  ],
  'تشغيل': [
    'بنزين',
    'سولار',
    'زيوت',
    'فلاتر',
    'إطارات',
    'بطاريات',
    'قطع غيار',
    'صيانة دورية',
    'صيانة أعطال',
    'كهرباء سيارات',
    'ميكانيكا',
    'سمكرة ودهان',
    'غسيل وتشحيم',
    'زوايا وترصيص',
    'إصلاح تكييف',
    'إصلاح فرامل',
    'سحب / ونش',
    'إصلاحات طارئة'
  ],
  'استخدام وطريق': [
    'رسوم طرق',
    'رسوم بوابات',
    'مواقف',
    'جراج',
    'انتظار',
    'كارت / اشتراكات الطرق',
    'رسوم عبور',
    'رسوم ميزان',
    'رسوم تحميل / تفريغ',
    'مصاريف مرور داخل مواقع المشروعات'
  ]
};


const LICENSE_EXPENSE_FIELDS = [
  { key:'renewal', label:'رسوم تجديد الترخيص' },
  { key:'annualTax', label:'الضريبة السنوية' },
  { key:'inspection', label:'رسوم الفحص الفني' },
  { key:'mandatoryIns', label:'التأمين الإجباري' },
  { key:'violations', label:'مخالفات مرورية' },
  { key:'lateFine', label:'غرامات تأخير التجديد' },
  { key:'plates', label:'رسوم اللوحات المعدنية' },
  { key:'transfer', label:'رسوم نقل الملكية' },
  { key:'replaceLost', label:'رسوم بدل فاقد/تالف' },
  { key:'adminFees', label:'رسوم إدارية' },
  { key:'envFees', label:'رسوم بيئة' },
  { key:'other', label:'أخرى' }
];


/** بنود مقترحة أثناء الكتابة فقط — بدون ربط بأقسام ثابتة */
function allCatalogItemLabels(){
  const out = [];
  if(typeof VEHICLE_EXPENSE_CATALOG==='object'){
    Object.keys(VEHICLE_EXPENSE_CATALOG).forEach(k=>{
      (VEHICLE_EXPENSE_CATALOG[k]||[]).forEach(it=>{ if(it && !out.includes(it)) out.push(it); });
    });
  }
  ['أكل / إعاشة','سكن','انتقالات','أدوات','سلفة','جزاء / خصم','حوافز','أخرى',
   'وجبات','مياه','مواصلات','علاج','حافز','مكافأة'].forEach(it=>{ if(!out.includes(it)) out.push(it); });
  return out;
}
/** بنود اقتراحات منفصلة لكل فئة مصروف */
const EXPENSE_ITEM_KINDS = ['employee','supervisor','worker','driver','equipment'];
function ensureExpenseItemPool(){
  if(!DATA.expenseItemPools || typeof DATA.expenseItemPools!=='object') DATA.expenseItemPools = {};
  EXPENSE_ITEM_KINDS.forEach(k=>{
    if(!Array.isArray(DATA.expenseItemPools[k])) DATA.expenseItemPools[k] = [];
  });
  // ترحيل القائمة القديمة المشتركة مرة واحدة
  if(Array.isArray(DATA.expenseItemPool) && DATA.expenseItemPool.length){
    DATA.expenseItemPool.forEach(it=>{
      const s = String(it||'').trim();
      if(!s) return;
      EXPENSE_ITEM_KINDS.forEach(k=>{
        if(!DATA.expenseItemPools[k].includes(s)) DATA.expenseItemPools[k].push(s);
      });
    });
    DATA.expenseItemPool = [];
    try{ saveData(true); }catch(_e){}
  }
}
function expenseKindLabelAr(kind){
  return ({employee:'الموظفين',supervisor:'المشرفون',worker:'العمال',driver:'السائقون',equipment:'المعدات والمركبات'})[kind] || kind || '';
}
/** اقتراحات حسب فئة المصروف فقط */
function defaultExpenseItemsForKind(kind){
  if(kind==='equipment') return allCatalogItemLabels();
  return ['أكل / إعاشة','سكن','انتقالات','أدوات','سلفة','جزاء / خصم','حوافز','أخرى',
    'وجبات','مياه','مواصلات','علاج','حافز','مكافأة'];
}
/** يضمن وجود البنود الافتراضية في القائمة القابلة للإدارة لكل فئة */
function seedExpenseItemPool(kind){
  ensureExpenseItemPool();
  kind = kind || 'supervisor';
  if(!EXPENSE_ITEM_KINDS.includes(kind)) kind = 'supervisor';
  const list = DATA.expenseItemPools[kind];
  const defaults = defaultExpenseItemsForKind(kind);
  let changed = false;
  defaults.forEach(it=>{
    if(it && !list.includes(it)){ list.push(it); changed = true; }
  });
  (DATA.expenses||[]).forEach(e=>{
    if(!e || e.personKind!==kind) return;
    if(e.type && !list.includes(e.type)){ list.push(e.type); changed = true; }
    (e.lines||[]).forEach(l=>{
      const it = (l && (l.item||l.label)) || '';
      if(it && !list.includes(it)){ list.push(it); changed = true; }
    });
  });
  if(changed){ try{ saveData(true); }catch(_e){} }
  return list;
}
function expenseItemSuggestions(kind){
  kind = kind || window.__expItemKind || 'supervisor';
  if(!EXPENSE_ITEM_KINDS.includes(kind)) kind = 'supervisor';
  const pool = seedExpenseItemPool(kind).slice();
  // احترام قائمة الحذف (بنود أخفاها المستخدم)
  const hidden = (DATA.expenseItemHidden && DATA.expenseItemHidden[kind]) || [];
  return pool.filter(it=>!hidden.includes(it)).sort((a,b)=> String(a).localeCompare(String(b),'ar'));
}
function saveExpenseItemSuggestion(label, kind){
  label = String(label||'').trim();
  if(!label) return;
  ensureExpenseItemPool();
  kind = kind || window.__expItemKind || 'supervisor';
  if(!EXPENSE_ITEM_KINDS.includes(kind)) kind = 'supervisor';
  if(!DATA.expenseItemPools[kind].includes(label)){
    DATA.expenseItemPools[kind].push(label);
  }
  if(DATA.expenseItemHidden && Array.isArray(DATA.expenseItemHidden[kind])){
    DATA.expenseItemHidden[kind] = DATA.expenseItemHidden[kind].filter(x=>x!==label);
  }
  try{ saveData(true); }catch(_e){}
}
function removeExpenseItemSuggestion(label, kind){
  ensureExpenseItemPool();
  kind = kind || window.__expItemKind || 'supervisor';
  if(!EXPENSE_ITEM_KINDS.includes(kind)) kind = 'supervisor';
  label = String(label||'').trim();
  DATA.expenseItemPools[kind] = (DATA.expenseItemPools[kind]||[]).filter(x=>x!==label);
  // حتى لا يعود من الكتالوج الافتراضي بعد الحذف
  if(!DATA.expenseItemHidden) DATA.expenseItemHidden = {};
  if(!Array.isArray(DATA.expenseItemHidden[kind])) DATA.expenseItemHidden[kind] = [];
  if(label && !DATA.expenseItemHidden[kind].includes(label)) DATA.expenseItemHidden[kind].push(label);
  try{ saveData(true); }catch(_e){}
}
function renameExpenseItemSuggestion(oldLabel, newLabel, kind){
  oldLabel = String(oldLabel||'').trim();
  newLabel = String(newLabel||'').trim();
  if(!oldLabel || !newLabel) return;
  ensureExpenseItemPool();
  kind = kind || window.__expItemKind || 'supervisor';
  const list = DATA.expenseItemPools[kind]||[];
  const i = list.indexOf(oldLabel);
  if(i>=0) list[i] = newLabel;
  else if(!list.includes(newLabel)) list.push(newLabel);
  // تحديث المصاريف الحالية من نفس الفئة
  (DATA.expenses||[]).forEach(e=>{
    if(e.personKind!==kind) return;
    if(e.type===oldLabel) e.type = newLabel;
    (e.lines||[]).forEach(l=>{
      if(l && (l.item===oldLabel || l.label===oldLabel)){ l.item = newLabel; l.label = newLabel; }
    });
  });
  try{ saveData(true); }catch(_e){}
}
// توافق قديم
function ensureVehicleExpenseItems(){ ensureExpenseItemPool(); }
function vehicleItemsForSection(){ return expenseItemSuggestions('equipment'); }
function saveVehicleExpenseItem(sec, label){ saveExpenseItemSuggestion(label, 'equipment'); }
const EXPENSE_KIND_TABS = [
  { id:'employees', label:'الموظفين', kind:'employee', icon:'👔' },
  { id:'supervisors', label:'المشرفون', kind:'supervisor', icon:'👷' },
  { id:'workers', label:'العمال', kind:'worker', icon:'🧑‍🔧' },
  { id:'drivers', label:'السائقون', kind:'driver', icon:'🧑‍🚒' },
  { id:'equipment', label:'المعدات والمركبات', kind:'equipment', icon:'🛻' }
];

function ensureExpensesUnified(){
  DATA.expenses = DATA.expenses || [];
  DATA.expenseSections = DATA.expenseSections || {};
  // إزالة إجبار الأقسام الافتراضية القديمة إن وُجدت فارغة الاستخدام فقط — لا نحذف أقسام المستخدم
  // ترحيل مصاريف المشرفين القديمة
  (DATA.supervisorExpenses||[]).forEach(e=>{
    if(!e || !e.id) return;
    if(DATA.expenses.some(x=>x.id===e.id)) return;
    DATA.expenses.push({
      id: e.id,
      personKind: 'supervisor',
      personId: e.supervisorId || '',
      date: e.date || '',
      type: (typeof expenseTypeLabel==='function'?expenseTypeLabel(e.type):e.type) || '',
      amount: toInt(e.amount),
      project: e.project || '',
      section: e.section || '',
      notes: e.notes || ''
    });
  });
  // ترحيل مصاريف التراخيص → معدات
  (DATA.licenseExpenses||[]).forEach(e=>{
    if(!e || !e.id) return;
    if(DATA.expenses.some(x=>x.id===e.id)) return;
    const amounts = e.amounts || {};
    const customSum = (e.customFields||[]).reduce((s,c)=>s+toInt(c.value),0);
    const tot = toInt(e.total != null ? e.total : (
      toInt(amounts.renewal||e.renewal)+toInt(amounts.annualTax)+toInt(amounts.inspection||e.inspection)+
      toInt(amounts.mandatoryIns||e.insurance)+toInt(amounts.violations||e.violations)+
      toInt(amounts.lateFine)+toInt(amounts.plates)+toInt(amounts.transfer)+toInt(amounts.replaceLost)+
      toInt(amounts.adminFees)+toInt(amounts.envFees)+toInt(amounts.other||e.other)+customSum
    ));
    DATA.expenses.push({
      id: e.id,
      personKind: 'equipment',
      personId: e.equipmentId || '',
      date: e.date || '',
      type: e.type || 'ترخيص / مصروف معدة',
      amount: tot,
      project: e.project || '',
      section: e.section || '',
      notes: e.notes || '',
      amounts: amounts,
      customFields: e.customFields || [],
      isLicense: true
    });
  });
}

function expensePersonName(kind, id){
  if(!id) return '—';
  if(kind==='employee'){ const e=typeof getEmployee==='function'?getEmployee(id):null; return e?(e.name||e.code):id; }
  if(kind==='supervisor'){ return typeof supervisorName==='function'?supervisorName(id):(id); }
  if(kind==='worker'){ const w=typeof getWorker==='function'?getWorker(id):null; return w?(w.name||w.code):id; }
  if(kind==='driver'){ const d=typeof getDriver==='function'?getDriver(id):(DATA.drivers||[]).find(x=>x.id===id); return d?(d.name||d.code):id; }
  if(kind==='equipment'){ const eq=typeof getEquipment==='function'?getEquipment(id):null; return eq?(eq.name||eq.code):id; }
  return id;
}

function expenseSectionsFor(tabId){
  DATA.expenseSections = DATA.expenseSections || {};
  if(!Array.isArray(DATA.expenseSections[tabId])) DATA.expenseSections[tabId] = [];
  // الأقسام من إضافة المستخدم فقط — لا أقسام تلقائية
  return DATA.expenseSections[tabId];
}

function renderExpensesPage(){
  ensureExpensesUnified();
  const tab = window.__expTab || '';
  if(tab === '__all' && typeof comprehensiveCostsPageHtml === 'function') return comprehensiveCostsPageHtml('expenses');
  // المستوى الأول: لوحات كبيرة للفئات
  if(!tab){
    const counts = {};
    EXPENSE_KIND_TABS.forEach(t=>{
      counts[t.id] = (DATA.expenses||[]).filter(e=>e && e.personKind===t.kind).length;
    });
    const totals = {};
    EXPENSE_KIND_TABS.forEach(t=>{
      totals[t.id] = toInt((DATA.expenses||[]).filter(e=>e && e.personKind===t.kind).reduce((s,e)=>s+toInt(e.amount),0));
    });
    return `<div class="page">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:18px;">
        <div>
          <h2 class="page-title" style="margin:0;">المصاريف</h2>
          <p class="page-sub" style="margin:4px 0 0;">اختر فئة للدخول وإدارة المصاريف والأقسام</p>
        </div>
        <div class="btn-row page-header-actions">
          ${typeof pageExportButtonsHtml==='function'?pageExportButtonsHtml():''}
        </div>
      </div>
      <div class="board-grid exp-kind-boards">
        ${typeof comprehensiveCostsBoardCard==='function' ? comprehensiveCostsBoardCard('data-exp-tab') : ''}
        ${EXPENSE_KIND_TABS.map(t=>`
          <button type="button" class="board-card exp-kind-board" data-exp-tab="${t.id}">
            <div class="board-card-icon">${t.icon||({employees:'👔',supervisors:'👷',workers:'🧑‍🔧',drivers:'🧑‍🚒',equipment:'🛻'}[t.id])||'📁'}</div>
            <div class="board-card-title">${escapeHtml(t.label)}</div>
            <div class="board-card-meta">
              <span>${counts[t.id]||0} سجل</span>
              <span class="board-card-amt">${fmtMoney(totals[t.id]||0)}</span>
            </div>
          </button>
        `).join('')}
      </div>
    </div>`;
  }

  const tabDef = EXPENSE_KIND_TABS.find(t=>t.id===tab) || EXPENSE_KIND_TABS[0];
  const kind = tabDef.kind;
  const secFilter = window.__expSection || '';
  const qName = (window.__expQName||'').trim().toLowerCase();
  const qType = (window.__expQType||'').trim().toLowerCase();
  const from = window.__expFrom || '';
  const to = window.__expTo || '';
  const sections = expenseSectionsFor(tab);
  const personLabel = {employee:'الموظف',supervisor:'المشرف',worker:'العامل',driver:'السائق',equipment:'المعدة / المركبة'}[kind]||'الشخص';

  // داخل الفئة بدون قسم محدد: لوحات الأقسام
  if(!secFilter && !window.__expShowAll){
    const allCnt = (DATA.expenses||[]).filter(e=>e.personKind===kind).length;
    const allTot = toInt((DATA.expenses||[]).filter(e=>e.personKind===kind).reduce((s,e)=>s+toInt(e.amount),0));
    return `<div class="page">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div>
          <button type="button" class="btn btn-outline btn-sm" id="btnExpBackKinds">← كل المصاريف</button>
          <h2 class="page-title" style="margin:10px 0 0;">${escapeHtml(tabDef.label)}</h2>
          <p class="page-sub" style="margin:4px 0 0;">أقسام المصاريف — اضغط لوحة للدخول أو أضف قسماً جديداً</p>
        </div>
        <div class="btn-row page-header-actions">
          <button type="button" class="btn btn-outline btn-sm" id="btnExpAddSec" ${readOnlyMode?'disabled':''}>إضافة قسم</button>
          <button type="button" class="btn btn-outline btn-sm" id="btnExpRenSec" ${readOnlyMode?'disabled':''}>تعديل قسم</button>
          <button type="button" class="btn btn-outline btn-sm" id="btnExpDelSec" ${readOnlyMode?'disabled':''}>حذف قسم</button>
          ${tabDef.kind==='equipment'?`<button class="btn btn-outline" id="btnExpFuel" ${readOnlyMode?'disabled':''}>⛽ صرف وقود</button>`:''}
          <button class="btn btn-primary" id="btnAddExp" ${readOnlyMode?'disabled':''}>+ مصروف</button>
        </div>
      </div>
      <div class="board-grid exp-sec-boards">
        <button type="button" class="board-card exp-sec-board" data-exp-sec="" data-show-all="1">
          <div class="board-card-icon">📂</div>
          <div class="board-card-title">الكل</div>
          <div class="board-card-meta">
            <span>${allCnt} سجل</span>
            <span class="board-card-amt">${fmtMoney(allTot)}</span>
          </div>
        </button>
        ${sections.map(s=>{
          const items = (DATA.expenses||[]).filter(e=>e.personKind===kind && (e.section||'')===s);
          const cnt = items.length;
          const tot = toInt(items.reduce((a,e)=>a+toInt(e.amount),0));
          const iconMap = {'تراخيص وتجديد':'📋','مستندات وشهادات':'📄','مخالفات وغرامات':'⚠️','تأمين':'🛡️','تشغيل':'🔧','استخدام وطريق':'🅿️'};
          const icon = iconMap[s] || '📁';
          return `<button type="button" class="board-card exp-sec-board" data-exp-sec="${escapeHtml(s)}">
            <div class="board-card-icon">${icon}</div>
            <div class="board-card-title">${escapeHtml(s)}</div>
            <div class="board-card-meta">
              <span>${cnt} سجل</span>
              <span class="board-card-amt">${fmtMoney(tot)}</span>
            </div>
          </button>`;
        }).join('')}
      </div>
    </div>`;
  }

  // جدول المصاريف داخل قسم أو «الكل»
  let list = (DATA.expenses||[]).filter(e=>e && e.personKind===kind);
  if(secFilter) list = list.filter(e=>(e.section||'')===secFilter);
  if(from) list = list.filter(e=>(e.date||'')>=from);
  if(to) list = list.filter(e=>(e.date||'')<=to);
  if(qName) list = list.filter(e=> smartMatch(expensePersonName(e.personKind, e.personId), qName) || smartMatch(e.personId, qName));
  if(qType) list = list.filter(e=> smartMatch(e.type, qType) || smartMatch(e.notes, qType));
  list.sort((a,b)=>(b.date||'').localeCompare(a.date||''));

  try{
    if(typeof setPageExport==='function') setPageExport('مصاريف',
      ['التاريخ','الشخص','النوع','المبلغ','القسم','المشروع','البيان'],
      list.map(e=>[e.date, expensePersonName(e.personKind,e.personId), (typeof expenseTypeLabel==='function'?expenseTypeLabel(e.type):e.type)||'', toInt(e.amount), e.section||'', e.project||'', e.notes||'']));
  }catch(_e){}

  const pg = paginateRows(list, 'expenses');
  const total = toInt(list.reduce((s,e)=>s+toInt(e.amount),0));
  return `<div class="page">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
      <div>
        <button type="button" class="btn btn-outline btn-sm" id="btnExpSecBack">← أقسام ${escapeHtml(tabDef.label)}</button>
        <h2 class="page-title" style="margin:10px 0 0;">${secFilter?('📁 '+escapeHtml(secFilter)):('📂 كل '+escapeHtml(tabDef.label))}</h2>
        <p class="page-sub" style="margin:4px 0 0;">${escapeHtml(tabDef.label)} — الأقسام من إضافتك</p>
      </div>
      <div class="btn-row page-header-actions">
        ${typeof pageExportButtonsHtml==='function'?pageExportButtonsHtml():''}
        ${tabDef.kind==='equipment'?`<button class="btn btn-outline" id="btnExpFuel" ${readOnlyMode?'disabled':''}>⛽ صرف وقود</button>`:''}
        <button class="btn btn-primary" id="btnAddExp" ${readOnlyMode?'disabled':''}>+ مصروف</button>
      </div>
    </div>

    <div class="filters-bar filters-bar-inline" style="margin-bottom:12px;">
      <input type="search" id="expQName" class="input" placeholder="بحث باسم ${personLabel}..." value="${escapeHtml(window.__expQName||'')}">
      <input type="search" id="expQType" class="input" placeholder="بحث ببند المصروف..." value="${escapeHtml(window.__expQType||'')}">
      <label style="font-size:13px;">من <input type="date" id="expFrom" class="input" value="${escapeHtml(from)}"></label>
      <label style="font-size:13px;">إلى <input type="date" id="expTo" class="input" value="${escapeHtml(to)}"></label>
      <button class="btn btn-outline btn-sm" id="expApply">تطبيق</button>
    </div>

    <div class="stats-row">
      <div class="stat-card debt"><div class="num">${fmtMoney(total)}</div><div class="lbl">الإجمالي</div></div>
      <div class="stat-card"><div class="num">${list.length}</div><div class="lbl">عدد السجلات</div></div>
    </div>

    <div class="table-wrap"><table class="data-table">
      <thead><tr>
        <th>التاريخ</th><th>${escapeHtml(personLabel)}</th><th>بند المصروف</th><th>المبلغ</th>
        <th>القسم</th><th>المشروع</th><th>البيان</th><th></th>
      </tr></thead>
      <tbody>
        ${pg.pageRows.length? pg.pageRows.map(e=>`<tr>
          <td>${fmtDate(e.date)}</td>
          <td><strong>${escapeHtml(expensePersonName(e.personKind, e.personId))}</strong></td>
          <td>${escapeHtml(typeof expenseTypeLabel==='function'?expenseTypeLabel(e.type):e.type||'—')}</td>
          <td><strong>${fmtMoney(e.amount)}</strong></td>
          <td>${escapeHtml(e.section||'—')}</td>
          <td>${escapeHtml(e.project||'—')}</td>
          <td>${escapeHtml(e.notes||'')}</td>
          <td>
            <div class="row-actions">
              <button type="button" class="icon-btn btn-view-exp" data-id="${e.id}" title="عرض">👁️</button>
              <button type="button" class="btn btn-outline btn-sm btn-pdf-exp" data-id="${e.id}" title="تصدير PDF">PDF</button>
              <button type="button" class="btn btn-outline btn-sm btn-xls-exp" data-id="${e.id}" title="تصدير إكسيل">إكسيل</button>
              <button type="button" class="icon-btn btn-edit-exp" data-id="${e.id}" title="تعديل">✏️</button>
              <button type="button" class="icon-btn icon-del btn-del-exp" data-id="${e.id}" ${readOnlyMode?'disabled':''} title="حذف">🗑️</button>
            </div>
          </td>
        </tr>`).join('') : `<tr><td colspan="8" style="text-align:center;color:var(--ink-soft);padding:28px;">لا مصاريف — اضغط «+ مصروف»</td></tr>`}
      </tbody>
    </table></div>
    ${tablePagerHtml('expenses', pg)}
    ${tabDef.kind==='equipment' ? `<div class="section-title" style="margin-top:22px;">⛽ سجلات صرف الوقود</div>${typeof renderEquipmentFuelTable==='function'?renderEquipmentFuelTable():''}` : ''}
  </div>`;
}


function openExpenseDetailModal(id){
  const e = (DATA.expenses||[]).find(x=>x.id===id);
  if(!e){ showToast('المصروف غير موجود'); return; }
  const kindLab = {employee:'موظف',supervisor:'مشرف',worker:'عامل',driver:'سائق',equipment:'معدة / مركبة'}[e.personKind]||'';
  let amountsHtml = '';
  if(Array.isArray(e.lines) && e.lines.length){
    amountsHtml = `<div class="section-title">تفصيل البنود</div>
      <table class="data-table"><thead><tr><th>البند</th><th>المبلغ</th></tr></thead>
      <tbody>${e.lines.map(l=>`<tr><td>${escapeHtml(l.item||l.label||'')}</td><td>${fmtMoney(l.amount)}</td></tr>`).join('')}</tbody></table>`;
  } else if(e.amounts && typeof e.amounts==='object'){
    const rows = (typeof LICENSE_EXPENSE_FIELDS!=='undefined'?LICENSE_EXPENSE_FIELDS:[])
      .map(f=>{
        const v = toInt(e.amounts[f.key]);
        if(!v) return '';
        return `<tr><td>${escapeHtml(f.label)}</td><td>${fmtMoney(v)}</td></tr>`;
      }).filter(Boolean).join('');
    const custom = (e.customFields||[]).map(c=>`<tr><td>${escapeHtml(c.label||'')}</td><td>${fmtMoney(c.value)}</td></tr>`).join('');
    if(rows || custom) amountsHtml = `<div class="section-title">تفصيل البنود</div>
      <table class="data-table"><thead><tr><th>البند</th><th>المبلغ</th></tr></thead>
      <tbody>${rows}${custom}</tbody></table>`;
  }
  openModal(`
    <div class="modal-header"><h3>تفاصيل المصروف</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:14px;">
        <div><strong>النوع:</strong> ${escapeHtml(kindLab)}</div>
        <div><strong>الاسم:</strong> ${escapeHtml(expensePersonName(e.personKind,e.personId))}</div>
        <div><strong>التاريخ:</strong> ${fmtDate(e.date)}</div>
        <div><strong>المبلغ:</strong> <span style="font-weight:700;color:var(--debt);">${fmtMoney(e.amount)}</span></div>
        <div><strong>بند المصروف:</strong> ${escapeHtml(typeof expenseTypeLabel==='function'?expenseTypeLabel(e.type):e.type||'—')}</div>
        <div><strong>القسم:</strong> ${escapeHtml(e.section||'—')}</div>
        <div><strong>المشروع:</strong> ${escapeHtml(e.project||'—')}</div>
        <div style="grid-column:1/-1;"><strong>البيان:</strong> ${escapeHtml(e.notes||'—')}</div>
      </div>
      ${amountsHtml}
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إغلاق</button>
      <button class="btn btn-primary" id="btnExpDetailEdit">تعديل</button>
    </div>
  `);
  document.getElementById('btnExpDetailEdit')?.addEventListener('click', ()=>{
    closeModal();
    openExpenseModal(id);
  });
}

function openExpenseModal(editId){
  ensureExpensesUnified();
  const tab = window.__expTab || 'supervisors';
  const tabDef = EXPENSE_KIND_TABS.find(t=>t.id===tab) || EXPENSE_KIND_TABS[1];
  // معدات ومركبات → نفس نموذج البنود الخاص
  if(tabDef.kind==='equipment' && !editId){
    openVehicleExpenseModal(null, window.__expSection||'');
    return;
  }
  const existing = editId ? (DATA.expenses||[]).find(x=>x.id===editId) : null;
  if(existing && existing.personKind==='equipment'){
    openVehicleExpenseModal(editId, existing.section||'');
    return;
  }
  let kind = existing ? existing.personKind : tabDef.kind;
  const sections = expenseSectionsFor(EXPENSE_KIND_TABS.find(t=>t.kind===kind)?.id || tab);
  const initSec = (existing && existing.section) || window.__expSection || sections[0] || '';
  const lines = (existing && Array.isArray(existing.lines) && existing.lines.length)
    ? existing.lines.map(l=>({ item: l.item||l.label||existing.type||'', amount: toInt(l.amount) }))
    : (existing ? [{ item: existing.type||'', amount: toInt(existing.amount)||'' }] : [{ item:'', amount:'' }]);

  const kindLabs = {employee:'الموظف',supervisor:'المشرف',worker:'العامل',driver:'السائق',equipment:'المعدة / المركبة'};
  const kindOptions = EXPENSE_KIND_TABS.filter(t=>t.kind!=='equipment').map(t=>
    `<option value="${t.kind}" ${kind===t.kind?'selected':''}>${t.label}</option>`
  ).join('');

  openModal(`
    <div class="modal-header"><h3>${existing?'تعديل مصروف':'إضافة مصروف'}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <input type="hidden" id="exKind" value="${escapeHtml(kind)}">
      <div class="form-grid form-grid-2">
        <label>التاريخ *
          <input class="input" id="exDate" type="date" value="${escapeHtml(existing&&existing.date||(typeof todayISO==='function'?todayISO():''))}">
        </label>
        <label>نوع المصاريف
          <select class="input" id="exSection">
            <option value="">— بدون —</option>
            ${sections.map(s=>`<option value="${escapeHtml(s)}" ${s===initSec?'selected':''}>${escapeHtml(s)}</option>`).join('')}
          </select>
        </label>
        <label id="exPersonLab">${kindLabs[kind]||'الشخص'} *
          <div id="exPersonBox"></div>
        </label>
        <label>المشروع
          ${typeof projectInputHtml==='function'?projectInputHtml('exProj', existing&&existing.project||'','exProjList'):`<input class="input" id="exProj" value="${escapeHtml(existing&&existing.project||'')}">`}
        </label>
      </div>
      <div class="section-title" style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <span>بنود المصروف</span>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button type="button" class="btn btn-outline btn-sm" id="btnExAddLine">+ بند</button>
          <button type="button" class="btn btn-outline btn-sm" id="btnExManageItems">إدارة البنود</button>
        </div>
      </div>
      <div id="exLines"></div>
      <div style="margin-top:12px;font-weight:800;font-size:16px;">الإجمالي: <span id="exTotal">0</span> ج.م</div>
      ${typeof customFieldsFormHtml==='function'?customFieldsFormHtml('expenses', existing):''}
      <label style="display:block;margin-top:12px;">ملاحظات
        <textarea class="input" id="exNotes" rows="4" placeholder="اكتب الملاحظات هنا...">${escapeHtml(existing&&existing.notes||'')}</textarea>
      </label>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="btnSaveEx">حفظ</button>
    </div>
  `);

  function refreshExDept(){ /* قسم الموارد أُزيل من نموذج المصروف — نوع المصاريف يغطي الأقسام */ }
  function fillPerson(keepId){
    const k = document.getElementById('exKind')?.value || kind;
    const labs = {employee:'الموظف *',supervisor:'المشرف *',worker:'العامل *',driver:'السائق *'};
    const lab = document.getElementById('exPersonLab');
    if(lab){
      for(const n of lab.childNodes){ if(n.nodeType===3){ n.textContent = (labs[k]||'الشخص *')+' '; break; } }
    }
    window.__entityDeptFilter = '';
    const keep = keepId != null ? keepId
      : ((existing && existing.personKind===k ? existing.personId : '') || (window.__expPrePerson || ''));
    const box = document.getElementById('exPersonBox');
    if(box && typeof entityComboHtml==='function'){
      document.querySelectorAll('.entity-combo-drop-fixed').forEach(d=>d.remove());
      box.innerHTML = '';
      box.innerHTML = entityComboHtml('exPerson', k, keep || '', 'اكتب الاسم أو الكود...');
      const txt = box.querySelector('.entity-combo-text');
      if(txt) delete txt.dataset.boundCombo;
      if(typeof bindEntityCombos==='function') bindEntityCombos(document.getElementById('appModal'));
    }
    if(window.__expPrePerson) window.__expPrePerson = '';
    // تحديث أقسام نوع المصاريف حسب الفئة
    try{
      const tabId = (EXPENSE_KIND_TABS.find(t=>t.kind===k)||{}).id || '';
      const secs = expenseSectionsFor(tabId);
      const sel = document.getElementById('exSection');
      if(sel){
        const cur = sel.value;
        sel.innerHTML = '<option value="">— بدون —</option>' + secs.map(s=>`<option value="${escapeHtml(s)}" ${s===cur?'selected':''}>${escapeHtml(s)}</option>`).join('');
      }
    }catch(_e){}
    if(typeof refreshExDatalist==='function') refreshExDatalist();
  }
  // ربط تغيير القسم بإعادة تعبئة الأشخاص
  /* no dept filter */
  // عند تحديث قائمة الأقسام
  const _refreshExDept = refreshExDept;
  refreshExDept = function(){
    _refreshExDept();
    /* no dept filter */
  };
  document.getElementById('exKind')?.addEventListener('change', ()=>{
    if(typeof refreshExDept==='function') refreshExDept();
    window.__entityDeptFilter = document.getElementById('exDept')?.value || '';
    fillPerson('');
    window.__expItemKind = document.getElementById('exKind')?.value || kind;
    if(typeof refreshExDatalist==='function') refreshExDatalist();
  });
  // قسم ابتدائي من الشخص الموجود
  try{
    if(existing && existing.personId && !(existing.departmentId||existing.categoryId||existing.deptId)){
      const mapArr = {employee:DATA.employees,worker:DATA.workers,supervisor:DATA.supervisors,driver:DATA.drivers};
      const p = ((mapArr[kind]||[])).find(x=>x && x.id===existing.personId);
      if(p && document.getElementById('exDept')){
        const did = p.departmentId||p.categoryId||'';
        if(did) document.getElementById('exDept').value = did;
      }
    }
  }catch(_e){}
  fillPerson();

  // بنود عامة حسب القسم + بنود محفوظة
  function ensurePersonExpenseItems(){
    DATA.personExpenseItems = DATA.personExpenseItems || {};
  }
  function currentExpKind(){
    return document.getElementById('exKind')?.value || kind || 'supervisor';
  }
  function personItemsFor(){
    return expenseItemSuggestions(currentExpKind());
  }
  function savePersonItem(sec, label){
    saveExpenseItemSuggestion(label, currentExpKind());
  }

  const linesWrap = document.getElementById('exLines');
  function calcTotal(){
    let t = 0;
    linesWrap.querySelectorAll('.ex-amt').forEach(inp=>{ t += toInt(inp.value); });
    const el = document.getElementById('exTotal');
    if(el) el.textContent = typeof fmtNum==='function'?fmtNum(t):String(t);
    return t;
  }
  function lineRow(line){
    return `<div class="ex-line" style="display:grid;grid-template-columns:1fr minmax(140px,200px) 36px;gap:8px;align-items:start;margin-bottom:8px;position:relative;">
      <div class="ex-item-wrap" style="position:relative;min-width:0;">
        <input class="input ex-item" autocomplete="off" value="${escapeHtml(line.item||'')}" placeholder="اختر أو اكتب بند المصروف..." style="width:100%;box-sizing:border-box;">
        <div class="ex-suggest" style="display:none;"></div>
      </div>
      <input class="input ex-amt" type="number" min="0" step="0.01" value="${line.amount!==''&&line.amount!=null?toInt(line.amount):''}" placeholder="المبلغ" style="width:100%;box-sizing:border-box;">
      <button type="button" class="icon-btn icon-del ex-del-line" title="حذف">🗑️</button>
    </div>`;
  }
  function refreshExDatalist(){
    let dl = document.getElementById('exItemList');
    if(!dl){
      dl = document.createElement('datalist');
      dl.id = 'exItemList';
      document.getElementById('appModal')?.appendChild(dl);
    }
    const sec = document.getElementById('exSection')?.value || '';
    dl.innerHTML = personItemsFor().map(it=>`<option value="${escapeHtml(it)}"></option>`).join('');
  }
  
  function hideAllSuggest(){
    document.querySelectorAll('.ex-suggest').forEach(s=>{ s.style.display='none'; s.innerHTML=''; });
  }
  function bindItemSuggest(inp){
    if(!inp || inp._suggestBound) return;
    inp._suggestBound = true;
    const box = inp.parentElement && inp.parentElement.querySelector('.ex-suggest');
    if(!box) return;
    const show = ()=>{
      const q = (inp.value||'').trim().toLowerCase();
      const all = personItemsFor();
      const list = q ? all.filter(it=>smartMatch(String(it), q)) : all;
      if(!list.length){ box.style.display='none'; return; }
      box.innerHTML = list.slice(0,12).map(it=>`<button type="button" class="ex-suggest-item">${escapeHtml(it)}</button>`).join('');
      box.style.display = 'block';
      box.querySelectorAll('.ex-suggest-item').forEach(b=>{
        b.addEventListener('mousedown', (e)=>{
          e.preventDefault();
          inp.value = b.textContent;
          box.style.display='none';
        });
      });
    };
    inp.addEventListener('focus', show);
    inp.addEventListener('input', show);
    inp.addEventListener('blur', ()=> setTimeout(()=>{ box.style.display='none'; }, 180));
  }

  function bindLineEvents(){
    linesWrap.querySelectorAll('.ex-item').forEach(bindItemSuggest);
    linesWrap.querySelectorAll('.ex-amt').forEach(inp=> inp.addEventListener('input', calcTotal));
    linesWrap.querySelectorAll('.ex-del-line').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        btn.closest('.ex-line')?.remove();
        if(!linesWrap.querySelector('.ex-line')){
          linesWrap.insertAdjacentHTML('beforeend', lineRow({item:'',amount:''}));
          bindLineEvents();
        }
        calcTotal();
      });
    });
  }
  linesWrap.innerHTML = lines.map(l=>lineRow(l)).join('');
  refreshExDatalist();
  bindLineEvents();
  calcTotal();

  document.getElementById('exSection')?.addEventListener('change', refreshExDatalist);
  document.getElementById('btnExAddLine')?.addEventListener('click', ()=>{
    linesWrap.insertAdjacentHTML('beforeend', lineRow({item:'',amount:''}));
    refreshExDatalist();
    bindLineEvents();
  });
  document.getElementById('btnExManageItems')?.addEventListener('click', ()=>{
    const k = (typeof currentExpKind==='function'?currentExpKind():null) || document.getElementById('exKind')?.value || kind || 'supervisor';
    window.__expItemKind = k;
    const items = (typeof expenseItemSuggestions==='function'?expenseItemSuggestions(k):[]).slice();
    // المحفوظة فقط (بدون الكتالوج الافتراضي إن أمكن)
    ensureExpenseItemPool();
    const saved = (typeof expenseItemSuggestions==='function' ? expenseItemSuggestions(k) : items).slice();
    const renderRow = (it)=>`<div class="pitem-row" data-item="${escapeHtml(it)}" style="display:flex;gap:6px;align-items:center;padding:6px 4px;border-bottom:1px solid var(--line);">
      <input class="input pitem-edit" value="${escapeHtml(it)}" style="flex:1;min-width:0;">
      <button type="button" class="btn btn-outline btn-sm btn-save-pitem" title="حفظ التعديل">حفظ</button>
      <button type="button" class="btn btn-outline btn-sm btn-del-pitem" title="حذف">حذف</button>
    </div>`;
    openSubModal(`
      <div class="modal-header"><h3>إدارة بنود مصاريف ${escapeHtml(typeof expenseKindLabelAr==='function'?expenseKindLabelAr(k):k)}</h3><button class="modal-close" onclick="closeSubModal()">×</button></div>
      <div class="modal-body">
        <p style="font-size:13px;color:var(--ink-soft);margin:0 0 10px;">هذه الاقتراحات خاصة بـ <strong>${escapeHtml(typeof expenseKindLabelAr==='function'?expenseKindLabelAr(k):k)}</strong> فقط — منفصلة عن باقي الفئات. عدّل أو احذف أو أضف.</p>
        <label>إضافة بند
          <div style="display:flex;gap:8px;">
            <input class="input" id="pItemNew" placeholder="اسم البند...">
            <button type="button" class="btn btn-primary btn-sm" id="btnAddPItem">إضافة</button>
          </div>
        </label>
        <div id="pItemList" style="max-height:320px;overflow:auto;margin-top:12px;">
          ${saved.length? saved.map(renderRow).join('') : '<p style="color:var(--ink-soft)">لا بنود محفوظة بعد — اكتب بنداً جديداً</p>'}
        </div>
      </div>
      <div class="modal-footer"><button class="btn btn-outline" onclick="closeSubModal()">إغلاق</button></div>
    `);
    function refreshMainDl(){
      const dl = document.getElementById('exItemList');
      if(dl) dl.innerHTML = expenseItemSuggestions(k).map(it=>`<option value="${escapeHtml(it)}"></option>`).join('');
    }
    function bindPItemRows(root){
      (root||document).querySelectorAll('.btn-del-pitem').forEach(btn=>{
        btn.onclick = function(){
          const row = this.closest('.pitem-row');
          const old = row?.getAttribute('data-item') || row?.querySelector('.pitem-edit')?.value;
          if(old) removeExpenseItemSuggestion(old, k);
          row?.remove();
          refreshMainDl();
        };
      });
      (root||document).querySelectorAll('.btn-save-pitem').forEach(btn=>{
        btn.onclick = function(){
          const row = this.closest('.pitem-row');
          const old = row?.getAttribute('data-item')||'';
          const neu = (row?.querySelector('.pitem-edit')?.value||'').trim();
          if(!neu){ showToast('اكتب اسم البند'); return; }
          if(old && old!==neu && typeof renameExpenseItemSuggestion==='function') renameExpenseItemSuggestion(old, neu, k);
          else saveExpenseItemSuggestion(neu, k);
          row?.setAttribute('data-item', neu);
          showToast('تم الحفظ');
          refreshMainDl();
        };
      });
    }
    bindPItemRows();
    document.getElementById('btnAddPItem')?.addEventListener('click', ()=>{
      const name = (document.getElementById('pItemNew')?.value||'').trim();
      if(!name) return;
      saveExpenseItemSuggestion(name, k);
      showToast('تمت الإضافة');
      const list = document.getElementById('pItemList');
      if(list){
        if(list.querySelector('p')) list.innerHTML = '';
        list.insertAdjacentHTML('beforeend', renderRow(name));
        bindPItemRows(list);
      }
      document.getElementById('pItemNew').value = '';
      refreshMainDl();
    });
  });

  const doSaveExpense = ()=>{
    try{
      if(typeof readOnlyMode!=='undefined' && readOnlyMode){ showToast('وضع القراءة فقط — لا يمكن الحفظ'); return; }
      const personKind = document.getElementById('exKind')?.value || kind || 'supervisor';
      let personId = '';
      if(typeof getEntityComboValue==='function') personId = getEntityComboValue('exPerson');
      else personId = document.getElementById('exPerson')?.value || '';
      if(!personId){
        // محاولة أخيرة من النص
        const t = (document.getElementById('exPerson_text')?.value||'').trim();
        if(t){
          const list = typeof listEntitiesForKind==='function' ? listEntitiesForKind(personKind) : [];
          const f = list.find(e=> (e.name||'')===t || (e.code||'')===t || ((e.name||'')+' — '+(e.code||''))===t);
          if(f) personId = f.id;
        }
      }
      if(!personId){ showToast('اختر الشخص من القائمة'); return; }
      const wrap = document.getElementById('exLines') || linesWrap;
      if(!wrap){ showToast('خطأ في النموذج'); return; }
      const outLines = [];
      wrap.querySelectorAll('.ex-line').forEach(row=>{
        const item = (row.querySelector('.ex-item')?.value||'').trim();
        const amount = toInt(row.querySelector('.ex-amt')?.value);
        if(item && amount>0){
          outLines.push({ item, amount });
          try{ savePersonItem(document.getElementById('exSection')?.value || '_عام', item); }catch(_e){}
        }
      });
      if(!outLines.length){ showToast('أضف بنداً واكتب المبلغ (أكبر من صفر)'); return; }
      const total = outLines.reduce((s,l)=>s+toInt(l.amount),0);
      const typeLabel = outLines.length===1 ? outLines[0].item : (outLines.length+' بنود');
      const project = (document.getElementById('exProj')?.value||'').trim();
      if(project && typeof ensureProjectSaved==='function') ensureProjectSaved(project);
      const deptId = document.getElementById('exDept')?.value || document.getElementById('exSection')?.value || '';
      const payload = {
        personKind, personId,
        date: document.getElementById('exDate')?.value || (typeof todayISO==='function'?todayISO():''),
        type: typeLabel,
        amount: total,
        section: document.getElementById('exSection')?.value || '',
        departmentId: deptId,
        categoryId: deptId,
        project,
        notes: (document.getElementById('exNotes')?.value||'').trim(),
        lines: outLines
      };
      DATA.expenses = DATA.expenses || [];
      if(existing){
        Object.assign(existing, payload);
        if(personKind==='supervisor'){
          DATA.supervisorExpenses = DATA.supervisorExpenses || [];
          let old = DATA.supervisorExpenses.find(x=>x.id===existing.id);
          if(old) Object.assign(old, { supervisorId:personId, date:payload.date, type:typeLabel, amount:total, project, notes:payload.notes, section:payload.section });
          else DATA.supervisorExpenses.push({ id:existing.id, supervisorId:personId, date:payload.date, type:typeLabel, amount:total, project, notes:payload.notes, section:payload.section });
        }
        if(typeof addAudit==='function') addAudit('تعديل مصروف', typeLabel);
      } else {
        payload.id = typeof uid==='function'?uid():('exp_'+Date.now());
        DATA.expenses.push(payload);
        if(personKind==='supervisor'){
          DATA.supervisorExpenses = DATA.supervisorExpenses || [];
          DATA.supervisorExpenses.push({
            id: payload.id, supervisorId: personId, date: payload.date,
            type: typeLabel, amount: total, project, notes: payload.notes, section: payload.section
          });
        }
        if(typeof addAudit==='function') addAudit('مصروف', (typeof expensePersonName==='function'?expensePersonName(personKind,personId):'')+' '+total);
      }
      if(typeof saveData==='function') saveData(true);
      window.__entityDeptFilter = '';
      if(typeof closeModal==='function') closeModal();
      showToast('تم الحفظ — الإجمالي '+fmtMoney(total));
      if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
    }catch(err){
      console.error(err);
      showToast('تعذر الحفظ: '+(err && err.message ? err.message : 'خطأ'));
    }
  };
  const btnSaveEx = document.getElementById('btnSaveEx');
  if(btnSaveEx) btnSaveEx.onclick = doSaveExpense;
}
function openVehicleExpenseModal(editId, presetSection, preEquipId){
  ensureExpensesUnified();
  ensureVehicleExpenseItems();
  const existing = editId ? (DATA.expenses||[]).find(x=>x.id===editId) : null;
  const sections = expenseSectionsFor('equipment');
  const initSec = (existing && existing.section) || presetSection || sections[0] || '';
  const lines = (existing && Array.isArray(existing.lines) && existing.lines.length)
    ? existing.lines.map(l=>({ item: l.item||l.label||'', amount: toInt(l.amount) }))
    : (existing && existing.amounts ? Object.keys(existing.amounts).map(k=>{
        const lab = (LICENSE_EXPENSE_FIELDS.find(f=>f.key===k)||{}).label || k;
        return { item: lab, amount: toInt(existing.amounts[k]) };
      }).filter(l=>l.amount>0)
      : [{ item:'', amount:'' }]);

  openModal(`
    <div class="modal-header"><h3>${existing?'تعديل مصروف معدة/مركبة':'مصروف معدة / مركبة'}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-grid form-grid-2">
        <label>المعدة / المركبة *
          <div id="veqBox"></div>
        </label>
        <label>التاريخ *
          <input class="input" id="vexpDate" type="date" value="${escapeHtml(existing&&existing.date||(typeof todayISO==='function'?todayISO():''))}">
        </label>
        <label>نوع المصاريف
          <select class="input" id="vexpSection">
            <option value="">— بدون —</option>
            ${sections.map(s=>`<option value="${escapeHtml(s)}" ${s===initSec?'selected':''}>${escapeHtml(s)}</option>`).join('')}
          </select>
        </label>
        <label>القسم
          ${typeof categorySelectHtml==='function'
            ? categorySelectHtml('equipment','vexpDept',(existing&&(existing.departmentId||existing.categoryId))||'')
            : `<select class="input" id="vexpDept"><option value="">— بدون قسم —</option></select>`}
        </label>
      </div>
      <div class="section-title" style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <span>بنود المصروف</span>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button type="button" class="btn btn-outline btn-sm" id="btnVexpAddLine">+ بند</button>
          <button type="button" class="btn btn-outline btn-sm" id="btnVexpManageItems">إدارة البنود</button>
        </div>
      </div>
      <div id="vexpLines"></div>
      <div style="margin-top:12px;font-weight:800;font-size:16px;">الإجمالي: <span id="vexpTotal">0</span> ج.م</div>
      <label style="display:block;margin-top:10px;max-width:280px;">المشروع
        ${typeof projectInputHtml==='function'?projectInputHtml('vexpProj', existing&&existing.project||'','vexpProjList'):`<input class="input" id="vexpProj" value="${escapeHtml(existing&&existing.project||'')}" style="max-width:280px;">`}
      </label>
      <label style="display:block;margin-top:12px;">ملاحظات
        <textarea class="input" id="vexpNotes" rows="4">${escapeHtml(existing&&existing.notes||'')}</textarea>
      </label>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="btnSaveVexp">حفظ</button>
    </div>
  `);

  const box = document.getElementById('veqBox');
  if(box && typeof entityComboHtml==='function'){
    box.innerHTML = entityComboHtml('vexpEq','equipment', (existing&&existing.personId)||preEquipId||window.__expPrePerson||'','اكتب اسم المعدة أو اللوحة...');
    if(typeof bindEntityCombos==='function') bindEntityCombos(document.getElementById('appModal'));
  }

  const linesWrap = document.getElementById('vexpLines');
  function currentItems(){
    const sec = document.getElementById('vexpSection')?.value || '';
    return vehicleItemsForSection(sec);
  }
  function calcTotal(){
    let t = 0;
    linesWrap.querySelectorAll('.vexp-amt').forEach(inp=>{ t += toInt(inp.value); });
    const el = document.getElementById('vexpTotal');
    if(el) el.textContent = typeof fmtNum==='function'?fmtNum(t):String(t);
    return t;
  }
  function lineRowHtml(line){
    const val = line.item || '';
    return `<div class="vexp-line" style="display:grid;grid-template-columns:1fr minmax(140px,200px) 36px;gap:8px;align-items:start;margin-bottom:8px;">
      <div class="ex-item-wrap" style="position:relative;">
        <input class="input vexp-item" autocomplete="off" value="${escapeHtml(val)}" placeholder="اختر أو اكتب بند المصروف...">
        <div class="ex-suggest" style="display:none;"></div>
      </div>
      <input class="input vexp-amt" type="number" min="0" step="0.01" value="${line.amount!==''&&line.amount!=null?toInt(line.amount):''}" placeholder="المبلغ">
      <button type="button" class="icon-btn icon-del vexp-del-line" title="حذف البند">🗑️</button>
    </div>`;
  }
  function bindVexpSuggest(inp){
    if(!inp || inp._suggestBound) return;
    inp._suggestBound = true;
    const box = inp.parentElement && inp.parentElement.querySelector('.ex-suggest');
    if(!box) return;
    const show = ()=>{
      const q = (inp.value||'').trim().toLowerCase();
      const all = currentItems();
      const list = q ? all.filter(it=>smartMatch(String(it), q)) : all;
      if(!list.length){ box.style.display='none'; return; }
      box.innerHTML = list.slice(0,14).map(it=>`<button type="button" class="ex-suggest-item">${escapeHtml(it)}</button>`).join('');
      box.style.display = 'block';
      box.querySelectorAll('.ex-suggest-item').forEach(b=>{
        b.addEventListener('mousedown', (e)=>{
          e.preventDefault();
          inp.value = b.textContent;
          box.style.display='none';
        });
      });
    };
    inp.addEventListener('focus', show);
    inp.addEventListener('input', show);
    inp.addEventListener('blur', ()=> setTimeout(()=>{ box.style.display='none'; }, 180));
  }
  function renderLines(){
    linesWrap.innerHTML = lines.map(l=>lineRowHtml(l)).join('');
    linesWrap.querySelectorAll('.vexp-item').forEach(bindVexpSuggest);
    linesWrap.querySelectorAll('.vexp-amt').forEach(inp=> inp.addEventListener('input', calcTotal));
    linesWrap.querySelectorAll('.vexp-del-line').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const row = btn.closest('.vexp-line');
        if(row) row.remove();
        if(!linesWrap.querySelector('.vexp-line')){
          linesWrap.insertAdjacentHTML('beforeend', lineRowHtml({item:'',amount:''}));
          linesWrap.querySelector('.vexp-item') && bindVexpSuggest(linesWrap.querySelector('.vexp-item'));
          linesWrap.querySelector('.vexp-amt')?.addEventListener('input', calcTotal);
        }
        calcTotal();
      });
    });
    calcTotal();
  }
  renderLines();

  document.getElementById('vexpSection')?.addEventListener('change', ()=>{
    // البنود حسب الفئة تُحدَّث عند الكتابة
  });
  document.getElementById('btnVexpAddLine')?.addEventListener('click', ()=>{
    linesWrap.insertAdjacentHTML('beforeend', lineRowHtml({item:'',amount:''}));
    const lastLine = linesWrap.querySelector('.vexp-line:last-child');
    lastLine?.querySelector('.vexp-item') && bindVexpSuggest(lastLine.querySelector('.vexp-item'));
    lastLine?.querySelector('.vexp-amt')?.addEventListener('input', calcTotal);
    lastLine?.querySelector('.vexp-del-line')?.addEventListener('click', function(){
      this.closest('.vexp-line')?.remove();
      calcTotal();
    });
  });

  document.getElementById('btnVexpManageItems')?.addEventListener('click', ()=>{
    const k = 'equipment';
    window.__expItemKind = k;
    ensureExpenseItemPool();
    const saved = (typeof expenseItemSuggestions==='function' ? expenseItemSuggestions('equipment') : []).slice();
    const renderRow = (it)=>`<div class="pitem-row" data-item="${escapeHtml(it)}" style="display:flex;gap:6px;align-items:center;padding:6px 4px;border-bottom:1px solid var(--line);">
      <input class="input pitem-edit" value="${escapeHtml(it)}" style="flex:1;min-width:0;">
      <button type="button" class="btn btn-outline btn-sm btn-save-pitem">حفظ</button>
      <button type="button" class="btn btn-outline btn-sm btn-del-pitem">حذف</button>
    </div>`;
    openSubModal(`
      <div class="modal-header"><h3>إدارة بنود مصاريف معدات ومركبات</h3><button class="modal-close" onclick="closeSubModal()">×</button></div>
      <div class="modal-body">
        <p style="font-size:13px;color:var(--ink-soft);margin:0 0 10px;">اقتراحات خاصة بمعدات ومركبات فقط — منفصلة عن الموظفين والعمال.</p>
        <label>إضافة بند
          <div style="display:flex;gap:8px;">
            <input class="input" id="pItemNew" placeholder="اسم البند...">
            <button type="button" class="btn btn-primary btn-sm" id="btnAddPItem">إضافة</button>
          </div>
        </label>
        <div id="pItemList" style="max-height:320px;overflow:auto;margin-top:12px;">
          ${saved.length? saved.map(renderRow).join('') : '<p style="color:var(--ink-soft)">لا بنود محفوظة — أضف من الكتالوج أو اكتب جديداً</p>'}
        </div>
      </div>
      <div class="modal-footer"><button class="btn btn-outline" onclick="closeSubModal()">إغلاق</button></div>
    `);
    function refreshVDl(){
      const dl = document.getElementById('vexpItemList') || document.getElementById('exItemList');
      if(dl) dl.innerHTML = expenseItemSuggestions('equipment').map(it=>`<option value="${escapeHtml(it)}"></option>`).join('');
    }
    function bindRows(root){
      (root||document).querySelectorAll('.btn-del-pitem').forEach(btn=>{
        btn.onclick = function(){
          const row = this.closest('.pitem-row');
          const old = row?.getAttribute('data-item') || row?.querySelector('.pitem-edit')?.value;
          if(old) removeExpenseItemSuggestion(old, 'equipment');
          row?.remove(); refreshVDl();
        };
      });
      (root||document).querySelectorAll('.btn-save-pitem').forEach(btn=>{
        btn.onclick = function(){
          const row = this.closest('.pitem-row');
          const old = row?.getAttribute('data-item')||'';
          const neu = (row?.querySelector('.pitem-edit')?.value||'').trim();
          if(!neu) return;
          if(old && old!==neu) renameExpenseItemSuggestion(old, neu, 'equipment');
          else saveExpenseItemSuggestion(neu, 'equipment');
          row?.setAttribute('data-item', neu);
          showToast('تم الحفظ'); refreshVDl();
        };
      });
    }
    bindRows();
    document.getElementById('btnAddPItem')?.addEventListener('click', ()=>{
      const name = (document.getElementById('pItemNew')?.value||'').trim();
      if(!name) return;
      saveExpenseItemSuggestion(name, 'equipment');
      const list = document.getElementById('pItemList');
      if(list){ if(list.querySelector('p')) list.innerHTML=''; list.insertAdjacentHTML('beforeend', renderRow(name)); bindRows(list); }
      document.getElementById('pItemNew').value = '';
      refreshVDl(); showToast('تمت الإضافة');
    });
  });

  const doSaveVexp = ()=>{
    try{
      if(typeof readOnlyMode!=='undefined' && readOnlyMode){ showToast('وضع القراءة فقط — لا يمكن الحفظ'); return; }
      let personId = typeof getEntityComboValue==='function' ? getEntityComboValue('vexpEq') : (document.getElementById('vexpEq')?.value || '');
      if(!personId){ showToast('اختر المعدة / المركبة من القائمة'); return; }
    const section = document.getElementById('vexpSection')?.value || '';
    const date = document.getElementById('vexpDate')?.value || todayISO();
    const project = (document.getElementById('vexpProj')?.value||'').trim();
    if(project && typeof ensureProjectSaved==='function') ensureProjectSaved(project);
    const outLines = [];
    linesWrap.querySelectorAll('.vexp-line').forEach(row=>{
      const item = (row.querySelector('.vexp-item')?.value||'').trim();
      const amount = toInt(row.querySelector('.vexp-amt')?.value);
      if(item && amount>0){
        outLines.push({ item, amount });
        saveVehicleExpenseItem(section, item);
      }
    });
    if(!outLines.length){ showToast('أضف بنداً واحداً على الأقل بمبلغ'); return; }
    const total = outLines.reduce((s,l)=>s+toInt(l.amount),0);
    const typeLabel = outLines.length===1 ? outLines[0].item : (section+' ('+outLines.length+' بنود)');
    const deptId = document.getElementById('vexpDept')?.value || '';
    const payload = {
      personKind: 'equipment',
      personId,
      date,
      type: typeLabel,
      amount: total,
      section,
      departmentId: deptId,
      categoryId: deptId,
      project,
      notes: (document.getElementById('vexpNotes')?.value||'').trim(),
      lines: outLines,
      isVehicleExpense: true,
      isLicense: section.indexOf('تراخيص')>=0
    };
    DATA.expenses = DATA.expenses || [];
    if(existing){
      Object.assign(existing, payload);
      addAudit('تعديل مصروف معدة', typeLabel);
    } else {
      payload.id = uid();
      DATA.expenses.push(payload);
      addAudit('مصروف معدة', expensePersonName('equipment', personId)+' '+total);
    }
    // مزامنة licenseExpenses للتوافق
    if(payload.isLicense){
      DATA.licenseExpenses = DATA.licenseExpenses || [];
      let lic = DATA.licenseExpenses.find(x=>x.id===payload.id || (existing&&x.id===existing.id));
      const licPayload = {
        equipmentId: personId, date, section, total, notes: payload.notes,
        amounts: {}, customFields: outLines.map(l=>({label:l.item, value:l.amount}))
      };
      if(lic) Object.assign(lic, licPayload);
      else { licPayload.id = payload.id; DATA.licenseExpenses.push(licPayload); }
    }
    if(typeof saveData==='function') saveData(true);
    if(typeof closeModal==='function') closeModal();
    showToast('تم الحفظ — الإجمالي '+fmtMoney(total));
    window.__expTab = 'equipment';
    window.__expSection = section;
    window.__expShowAll = true;
    if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
    }catch(err){ console.error(err); showToast('تعذر الحفظ: '+(err&&err.message||'خطأ')); }
  };
  const btnSaveVexp = document.getElementById('btnSaveVexp');
  if(btnSaveVexp) btnSaveVexp.onclick = doSaveVexp;
}




function initExpensesEvents(){
  // لوحات الفئات الرئيسية
  document.querySelectorAll('.exp-kind-board').forEach(b=>{
    b.addEventListener('click', ()=>{
      window.__expTab = b.getAttribute('data-exp-tab')||'';
      window.__expSection = '';
      window.__expShowAll = false;
      if(typeof resetTablePage==='function') resetTablePage('expenses');
      rerenderCurrentPage();
    });
  });
  document.getElementById('btnExpBackKinds')?.addEventListener('click', ()=>{
    window.__expTab = '';
    window.__expSection = '';
    window.__expShowAll = false;
    rerenderCurrentPage();
  });
  // لوحات الأقسام داخل الفئة
  document.querySelectorAll('.exp-sec-board').forEach(b=>{
    b.addEventListener('click', ()=>{
      const sec = b.getAttribute('data-exp-sec');
      const showAll = b.getAttribute('data-show-all')==='1';
      window.__expSection = showAll ? '' : (sec||'');
      window.__expShowAll = showAll || !!sec;
      if(typeof resetTablePage==='function') resetTablePage('expenses');
      rerenderCurrentPage();
    });
  });
  document.getElementById('btnExpSecBack')?.addEventListener('click', ()=>{
    window.__expSection = '';
    window.__expShowAll = false;
    if(typeof resetTablePage==='function') resetTablePage('expenses');
    rerenderCurrentPage();
  });
  document.getElementById('expApply')?.addEventListener('click', ()=>{
    window.__expQName = document.getElementById('expQName')?.value||'';
    window.__expQType = document.getElementById('expQType')?.value||'';
    window.__expFrom = document.getElementById('expFrom')?.value||'';
    window.__expTo = document.getElementById('expTo')?.value||'';
    if(typeof resetTablePage==='function') resetTablePage('expenses');
    rerenderCurrentPage();
  });
  document.getElementById('expQName')?.addEventListener('keydown', e=>{ if(e.key==='Enter') document.getElementById('expApply')?.click(); });
  document.getElementById('expQType')?.addEventListener('keydown', e=>{ if(e.key==='Enter') document.getElementById('expApply')?.click(); });

  document.getElementById('btnAddExp')?.addEventListener('click', ()=>{
    if(window.__expTab==='equipment') openVehicleExpenseModal(null, window.__expSection||'');
    else openExpenseModal();
  });
  document.getElementById('btnExpFuel')?.addEventListener('click', ()=>{ if(typeof openFuelModal==='function') openFuelModal(); });
  document.querySelectorAll('.btn-del-fuel').forEach(b=> b.addEventListener('click', ()=>{
    confirmDelete().then(ok=>{ if(!ok) return;
      DATA.fuelLogs=(DATA.fuelLogs||[]).filter(x=>x.id!==b.getAttribute('data-id'));
      saveData(true); showToast('تم'); rerenderCurrentPage();
    });
  }));
  document.getElementById('btnAddLicExp')?.addEventListener('click', ()=>{
    openVehicleExpenseModal(null, window.__expSection || '');
  });
  document.querySelectorAll('.btn-pdf-exp').forEach(b=> b.addEventListener('click', ()=>{
    if(typeof printExpenseRecord==='function') printExpenseRecord(b.getAttribute('data-id'));
  }));
  document.querySelectorAll('.btn-xls-exp').forEach(b=> b.addEventListener('click', ()=>{
    if(typeof exportExpenseExcel==='function') exportExpenseExcel(b.getAttribute('data-id'));
  }));
  document.querySelectorAll('.btn-view-exp').forEach(b=> b.addEventListener('click', ()=> openExpenseDetailModal(b.getAttribute('data-id'))));
  document.querySelectorAll('.btn-edit-exp').forEach(b=> b.addEventListener('click', ()=>{
    const id = b.getAttribute('data-id');
    const e = (DATA.expenses||[]).find(x=>x.id===id);
    if(e && e.personKind==='equipment') openVehicleExpenseModal(id, e.section||'');
    else openExpenseModal(id);
  }));
  document.querySelectorAll('.btn-del-exp').forEach(b=>{
    b.addEventListener('click', ()=>{
      confirmDelete('حذف المصروف؟').then(ok=>{ if(!ok) return;
        const id = b.getAttribute('data-id');
        DATA.expenses = (DATA.expenses||[]).filter(e=>e.id!==id);
        DATA.supervisorExpenses = (DATA.supervisorExpenses||[]).filter(e=>e.id!==id);
        DATA.licenseExpenses = (DATA.licenseExpenses||[]).filter(e=>e.id!==id);
        saveData(true); showToast('تم الحذف'); rerenderCurrentPage();
      });
    });
  });

  const tab = window.__expTab || '';
  document.getElementById('btnExpAddSec')?.addEventListener('click', ()=>{
    openModal(`
      <div class="modal-header"><h3>إضافة قسم مصاريف</h3><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="modal-body">
        <label>اسم القسم *<input class="input" id="expSecName" placeholder="مثال: أكل، سكن، تراخيص..."></label>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-primary" id="btnDoExpSec">إضافة</button>
      </div>
    `);
    document.getElementById('btnDoExpSec')?.addEventListener('click', ()=>{
      const name = (document.getElementById('expSecName')?.value||'').trim();
      if(!name){ showToast('أدخل الاسم'); return; }
      const list = expenseSectionsFor(tab);
      if(list.includes(name)){ showToast('موجود'); return; }
      list.push(name);
      saveData(true); closeModal(); showToast('تم'); rerenderCurrentPage();
    });
  });
  document.getElementById('btnExpRenSec')?.addEventListener('click', ()=>{
    const list = expenseSectionsFor(tab);
    const all = expenseSectionsFor(tab);
    if(!all.length){ showToast('لا أقسام — أضف قسماً أولاً'); return; }
    openModal(`
      <div class="modal-header"><h3>تعديل قسم</h3><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="modal-body">
        <label>القسم<select class="input" id="expRenOld">${all.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}</select></label>
        <label>الاسم الجديد<input class="input" id="expRenNew"></label>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-primary" id="btnDoExpRen">حفظ</button>
      </div>
    `);
    document.getElementById('btnDoExpRen')?.addEventListener('click', ()=>{
      const old = document.getElementById('expRenOld')?.value;
      const neu = (document.getElementById('expRenNew')?.value||'').trim();
      if(!old||!neu){ showToast('أدخل الاسم'); return; }
      DATA.expenseSections[tab] = expenseSectionsFor(tab).map(s=>s===old?neu:s);
      (DATA.expenses||[]).forEach(e=>{ if(e.section===old) e.section=neu; });
      if(window.__expSection===old) window.__expSection=neu;
      saveData(true); closeModal(); showToast('تم'); rerenderCurrentPage();
    });
  });
  document.getElementById('btnExpDelSec')?.addEventListener('click', ()=>{
    const list = expenseSectionsFor(tab);
    if(!list.length){ showToast('لا أقسام'); return; }
    openModal(`
      <div class="modal-header"><h3>حذف قسم</h3><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="modal-body">
        <label>القسم<select class="input" id="expDelSec">${list.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}</select></label>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-primary" id="btnDoExpDel">حذف</button>
      </div>
    `);
    document.getElementById('btnDoExpDel')?.addEventListener('click', ()=>{
      const name = document.getElementById('expDelSec')?.value;
      if(!name) return;
      confirmDelete('حذف القسم؟').then(ok=>{ if(!ok) return;
        DATA.expenseSections[tab] = list.filter(s=>s!==name);
        (DATA.expenses||[]).forEach(e=>{ if(e.section===name) e.section=''; });
        if(window.__expSection===name) window.__expSection='';
        saveData(true); closeModal(); showToast('تم'); rerenderCurrentPage();
      });
    });
  });
}







