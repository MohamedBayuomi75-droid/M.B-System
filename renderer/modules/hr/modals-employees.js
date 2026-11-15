function openEmployeeModal(editId){
  const e = editId ? getEmployee(editId) : null;
  const isEdit = !!e;
  const formAttId = isEdit ? e.id : uid();
  if(!isEdit && typeof ensureFormDraft==='function') ensureFormDraft('employee', formAttId);
  openModal(`
    <div class="modal-header">
      <h3>${isEdit?'تعديل موظف':'إضافة موظف جديد'}</h3>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-grid form-grid-2">
        <label>الاسم *<input class="input" id="empName" value="${escapeHtml(e&&e.name||'')}" required></label>
        <label>كود الموظف (تلقائي — قابل للتعديل)<input class="input" id="empCode" value="${escapeHtml(e&&e.code||(typeof nextEmployeeCode==='function'?nextEmployeeCode():'EMP-001'))}" placeholder="EMP-001"></label>
        <label>القسم (من الوظيفة)
          <input class="input" id="empDept" readonly tabindex="-1" value="${escapeHtml(e&&(e.position||e.jobTitle||e.skill)||'')}" placeholder="يُقرأ من خانة الوظيفة" style="background:var(--paper-2);cursor:default;">
        </label>
        <label>الحالة<select class="input" id="empStatus">${personStatusOptionsHtml(e&&e.status, { blank: !e })}</select></label>
        <label>نوع التوظيف<select class="input" id="empType">${(e?'':'<option value="" selected>— اختر —</option>')+selectOptions(EMPLOYMENT_TYPES, e?(e.employmentType||'full'):'__none__')}</select></label>
        ${typeof personHrFieldsHtml==='function'?personHrFieldsHtml('emp', e, { showSalary:true, showWage:false, showLicense:true }):''}
        <label>البريد الإلكتروني<input class="input" id="empEmail" type="email" value="${escapeHtml(e&&e.email||'')}"></label>
        <label>رصيد الإجازة السنوية<input class="input" id="empLeaveBal" type="number" min="0" value="${e&&e.leaveBalance!=null?e.leaveBalance:(DATA.settings.defaultLeaveDays||21)}"></label>
        
      ${customFieldsFormHtml('employees', e)}
      <label>العنوان<input class="input" id="empAddress" value="${escapeHtml(e&&e.address||'')}"></label>
        <label style="grid-column:1/-1;">ملاحظات<textarea class="input" id="empNotes" rows="2">${escapeHtml(e&&e.notes||'')}</textarea></label>
        ${typeof formAttachmentsBlockHtml==='function'?formAttachmentsBlockHtml('employee', formAttId, isEdit?(e.attachments||[]):[]):''}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="btnSaveEmp">${isEdit?'حفظ التعديلات':'إضافة'}</button>
    </div>
  `);
  try{ const _pi=document.getElementById('empPos'), _di=document.getElementById('empDept'); if(_pi&&_di){ _pi.addEventListener('input',()=>{ _di.value=_pi.value; }); } }catch(_e){}
  if(typeof bindResignedStatusToggle==='function') bindResignedStatusToggle('empStatus','emp');
  if(typeof bindAttachmentHandlers==='function') bindAttachmentHandlers(document.getElementById('appModal'));
  if(typeof bindAutoStatusDates==='function') bindAutoStatusDates(document.getElementById('appModal'));
  if(typeof bindExtraFieldsButton==='function') bindExtraFieldsButton('extraFields_employees');
  document.getElementById('btnSaveEmp').addEventListener('click', ()=>{
    const name = (document.getElementById('empName').value||'').trim();
    if(!name){ showToast('الاسم مطلوب'); return; }
    const hr = typeof collectPersonHrFields==='function' ? collectPersonHrFields('emp',{showSalary:true}) : {};
    const payload = Object.assign({
      code: (typeof ensureUniqueCode==='function'
        ? ensureUniqueCode(document.getElementById('empCode').value, DATA.employees, 'EMP-', e&&e.id)
        : ((document.getElementById('empCode').value||'').trim() || nextEmployeeCode())),
      name,
      employmentType: document.getElementById('empType').value || 'full',
      status: document.getElementById('empStatus').value || 'active',
      resignedAt: (typeof readResignedDateFromForm==='function'?readResignedDateFromForm('emp', document.getElementById('empStatus').value):'') || (e&&e.resignedAt)||'',
      email: (document.getElementById('empEmail').value||'').trim(),
      leaveBalance: Number(document.getElementById('empLeaveBal').value)||0,
      address: ((document.getElementById('empAddress')&&document.getElementById('empAddress').value)||'').trim(),
      notes: (document.getElementById('empNotes').value||'').trim(),
      extraFields: typeof collectExtraFieldsForSave==='function' ? collectExtraFieldsForSave('extraFields_employees') : [],
      attachments: isEdit ? ((e && e.attachments) || []) : (typeof takeFormDraftAttachments==='function' ? takeFormDraftAttachments('employee', formAttId) : [])
    }, hr);
    if(typeof syncDocStatusesFromDates==='function') syncDocStatusesFromDates(payload);
    const commitEmp = ()=>{
      if(isEdit){
        if(typeof mergePersonRecord==='function') mergePersonRecord(e, payload);
        else Object.keys(payload).forEach(k=>{ if(payload[k]!==undefined) e[k]=payload[k]; });
        addAudit('تعديل موظف', e.name);
      } else {
        payload.id = uid();
        DATA.employees.push(payload);
        addAudit('إضافة موظف', payload.name);
      }
      try{
        const person = isEdit ? e : payload;
        if(person && typeof syncPersonResignedState==='function') syncPersonResignedState('employee', person);
      }catch(_e){}
      saveData();
      closeModal();
      showToast(isEdit?'تم التعديل':'تمت الإضافة');
      if(currentPage==='employees') rerenderCurrentPage();
      else { currentPage='employees'; render(); }
    };
    if(typeof guardEntityDuplicates==='function'){
      guardEntityDuplicates('employee', payload, isEdit && e ? e.id : null).then(ok=>{ if(ok) commitEmp(); });
    } else commitEmp();
  });
}
