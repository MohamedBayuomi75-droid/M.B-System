function filteredAttendance(){
  let list = (DATA.attendance||[]).slice();
  const f = attendanceFilters||{};
  if(f.departmentId){
    const ids = new Set((DATA.employees||[]).filter(e=>e.departmentId===f.departmentId).map(e=>e.id));
    list = list.filter(a=>ids.has(a.employeeId));
  }
  if(f.employeeId) list = list.filter(a=>a.employeeId===f.employeeId);
  if(f.status) list = list.filter(a=>a.status===f.status);
  if(f.from) list = list.filter(a=>(a.date||'')>=f.from);
  if(f.to) list = list.filter(a=>(a.date||'')<=f.to);
  if(f.q){
    const q = f.q.trim().toLowerCase();
    list = list.filter(a => smartMatch(employeeName(a.employeeId), q) || smartMatch(a.notes, q));
  }
  list.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  return list;
}
function renderAttendancePage(){
  const rows = filteredAttendance();
  try{
    if(typeof setPageExport==='function') setPageExport('attendance',
      ['التاريخ','الموظف','الحالة','وقت الحضور','وقت الانصراف','ملاحظات'],
      rows.map(a=>[a.date, employeeName(a.employeeId), labelOf(ATTENDANCE_STATUS,a.status)||a.status, a.checkIn||'', a.checkOut||'', a.notes||'']));
  }catch(_e){}

  const pg = paginateRows(rows, 'attendance');
  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
        <div>
          <h2 class="page-title" style="margin:0;">حضور الموظفين</h2>
          <p class="page-sub" style="margin:4px 0 0;">حضور الموظفين فقط — حسب القسم</p>
        </div>
        <div class="btn-row page-header-actions" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
          ${typeof pageExportButtonsHtml==='function'?pageExportButtonsHtml():''}
          <button class="btn btn-primary" id="btnAddAtt" ${readOnlyMode?'disabled':''}>+ تسجيل حضور</button>
        </div>
      </div>
      ${statCardsHtml([
        {ico:'🗂️',label:'عدد السجلات',value:fmtNum(rows.length)},
        {ico:'✅',label:'حاضر',value:fmtNum(rows.filter(a=>a.status==='present').length),tone:'ok'},
        {ico:'❌',label:'غائب',value:fmtNum(rows.filter(a=>a.status==='absent').length),tone:rows.some(a=>a.status==='absent')?'warn':''},
        {ico:'⏰',label:'متأخر',value:fmtNum(rows.filter(a=>a.status==='late').length)},
        {ico:'🌓',label:'نصف يوم',value:fmtNum(rows.filter(a=>a.status==='half').length)}])}
      <div class="filters-bar filters-bar-one-row" style="display:flex;flex-wrap:nowrap;gap:10px;margin-bottom:14px;align-items:flex-end;overflow-x:auto;">
        <label style="font-size:12px;">بحث
          <input type="search" id="attSearch" class="input" placeholder="بالاسم..." value="${escapeHtml(attendanceFilters.q||'')}" style="min-width:140px;">
        </label>
        <label style="font-size:12px;">القسم
          <select id="attFilterDept" class="input">${typeof deptOptionsForKind==='function'?deptOptionsForKind('employees', attendanceFilters.departmentId||''):deptOptions(attendanceFilters.departmentId||'')}</select>
        </label>
        <label style="font-size:12px;min-width:180px;">الموظف
          ${typeof entityComboHtml==='function'?entityComboHtml('attFilterEmp','employee',attendanceFilters.employeeId||'','بحث موظف...'):`<select id="attFilterEmp" class="input">${empOptionsForDepartment(attendanceFilters.departmentId||'', attendanceFilters.employeeId, '— كل الموظفين —')}</select>`}
        </label>
        <label style="font-size:12px;">الحالة
          <select id="attFilterStatus" class="input"><option value="">كل الحالات</option>${selectOptions(ATTENDANCE_STATUS, attendanceFilters.status)}</select>
        </label>
        <label style="font-size:12px;">من
          <input type="date" id="attFrom" class="input" value="${escapeHtml(attendanceFilters.from||'')}">
        </label>
        <label style="font-size:12px;">إلى
          <input type="date" id="attTo" class="input" value="${escapeHtml(attendanceFilters.to||'')}">
        </label>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>التاريخ</th><th>الموظف</th><th>الحالة</th><th>وقت الحضور</th><th>وقت الانصراف</th><th>ملاحظات</th><th></th></tr></thead>
          <tbody>
            ${pg.pageRows.length? pg.pageRows.map(a=>`
              <tr>
                <td>${fmtDate(a.date)}</td>
                <td>${escapeHtml(employeeName(a.employeeId))}</td>
                <td><span class="badge badge-${a.status==='present'?'ok':a.status==='late'?'warn':'err'}">${escapeHtml(labelOf(ATTENDANCE_STATUS,a.status))}</span></td>
                <td>${escapeHtml(a.checkIn||'—')}</td>
                <td>${escapeHtml(a.checkOut||'—')}</td>
                <td>${escapeHtml(a.notes||'')}</td>
                <td style="white-space:nowrap;">
                  <div class="row-actions">
                    <button type="button" class="icon-btn btn-edit-att" data-id="${a.id}" title="تعديل">✏️</button>
                    <button type="button" class="icon-btn icon-del btn-del-att" data-id="${a.id}" ${readOnlyMode?'disabled':''} title="حذف">🗑️</button>
                  </div>
                </td>
              </tr>`).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--ink-soft);padding:30px;">لا توجد سجلات</td></tr>'}
          </tbody>
        </table>
      </div>
      ${tablePagerHtml('attendance', pg)}
    </div>`;
}
function initAttendanceEvents(){
  if(typeof bindEntityCombos==='function') bindEntityCombos(document);

  const attDept = document.getElementById('attFilterDept');
  if(attDept) attDept.addEventListener('change', ()=>{
    attendanceFilters.departmentId = attDept.value||'';
    attendanceFilters.employeeId = '';
    resetTablePage('attendance'); rerenderCurrentPage();
  });
  ['attFilterEmp','attFilterStatus','attFrom','attTo'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.addEventListener('change', ()=>{
      attendanceFilters.employeeId = document.getElementById('attFilterEmp')?.value||'';
      attendanceFilters.status = document.getElementById('attFilterStatus')?.value||'';
      attendanceFilters.from = document.getElementById('attFrom')?.value||'';
      attendanceFilters.to = document.getElementById('attTo')?.value||'';
      resetTablePage('attendance'); rerenderCurrentPage();
    });
  });
  const add=document.getElementById('btnAddAtt');
  if(add) add.addEventListener('click', ()=> openAttendanceModal());
  document.querySelectorAll('.btn-edit-att').forEach(b=>b.addEventListener('click',()=> openAttendanceModal(b.getAttribute('data-id'))));
  document.querySelectorAll('.btn-del-att').forEach(b=>b.addEventListener('click',()=>{
    confirmDelete().then(ok=>{ if(!ok) return;
      DATA.attendance = DATA.attendance.filter(a=>a.id!==b.getAttribute('data-id'));
      saveData(); showToast('تم الحذف'); rerenderCurrentPage();
    });
  }));
}
function openAttendanceModal(editId){
  const existing = editId ? (DATA.attendance||[]).find(a=>a.id===editId) : null;
  let emp0 = existing ? existing.employeeId : '';
  let dept0 = '';
  if(emp0){
    const e = getEmployee(emp0);
    if(e) dept0 = e.departmentId||'';
  } else if(attendanceFilters && attendanceFilters.departmentId){
    dept0 = attendanceFilters.departmentId;
  }
  openModal(`
    <div class="modal-header"><h3>${existing?'تعديل حضور موظف':'تسجيل حضور موظف'}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-grid form-grid-2">
        <label>القسم
          <select class="input" id="attDept">${typeof deptOptionsForKind==='function'?deptOptionsForKind('employees', dept0):deptOptions(dept0)}</select>
        </label>
        <label>الموظف *
          <div id="attEmpBox"></div>
        </label>
        <label>التاريخ *<input class="input" id="attDate" type="date" value="${escapeHtml(existing&&existing.date||todayISO())}"></label>
        <label>الحالة<select class="input" id="attStatus">${selectOptions(ATTENDANCE_STATUS, existing&&existing.status||'present')}</select></label>
        <label>وقت الحضور<input class="input" id="attIn" type="time" value="${escapeHtml(existing&&existing.checkIn||'')}"></label>
        <label>وقت الانصراف<input class="input" id="attOut" type="time" value="${escapeHtml(existing&&existing.checkOut||'')}"></label>
        <label style="grid-column:1/-1;">ملاحظات<textarea class="input" id="attNotes" rows="4">${escapeHtml(existing&&existing.notes||'')}</textarea></label>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="btnSaveAtt">حفظ</button>
    </div>
  `);
  function fillAttEmp(keepId){
    const box = document.getElementById('attEmpBox');
    if(!box) return;
    document.querySelectorAll('.entity-combo-drop-fixed').forEach(d=>d.remove());
    // فلترة الموظفين حسب القسم إن وُجد
    if(typeof entityComboHtml==='function'){
      box.innerHTML = entityComboHtml('attEmp','employee', keepId||'','اكتب اسم الموظف أو الكود...');
      if(typeof bindEntityCombos==='function') bindEntityCombos(document.getElementById('appModal'));
      // تقييد الاقتراحات بالقسم عبر فلتر مخصص
      const deptId = document.getElementById('attDept')?.value || '';
      if(deptId){
        const text = document.getElementById('attEmp_text');
        // إعادة bind مع فلتر — نحدّث listEntities temporarily
        const orig = window.__filterEmployeesByDept;
        window.__attEmpDeptFilter = deptId;
      } else {
        window.__attEmpDeptFilter = '';
      }
    } else {
      const d = document.getElementById('attDept')?.value || '';
      box.innerHTML = `<select class="input" id="attEmp">${empOptionsForDepartment(d, keepId||'', '— اختر الموظف —')}</select>`;
    }
  }
  document.getElementById('attDept')?.addEventListener('change', ()=>{
    fillAttEmp('');
  });
  fillAttEmp(emp0||'');
  document.getElementById('btnSaveAtt').addEventListener('click', ()=>{
    const empId = (typeof getEntityComboValue==='function'?getEntityComboValue('attEmp'):(document.getElementById('attEmp')?.value||''));
    const date = document.getElementById('attDate').value;
    if(!empId){ showToast('اختر الموظف'); return; }
    if(!date){ showToast('حدد التاريخ'); return; }
    const payload = {
      employeeId: empId,
      date,
      status: document.getElementById('attStatus').value||'present',
      checkIn: document.getElementById('attIn').value||'',
      checkOut: document.getElementById('attOut').value||'',
      notes: (document.getElementById('attNotes').value||'').trim()
    };
    if(existing){ Object.assign(existing, payload); addAudit('تعديل حضور موظف', employeeName(empId)); }
    else {
      payload.id = uid();
      DATA.attendance = DATA.attendance||[];
      DATA.attendance.push(payload);
      addAudit('تسجيل حضور موظف', employeeName(empId));
    }
    saveData(); closeModal(); showToast('تم الحفظ');
    if(currentPage==='attendance') rerenderCurrentPage();
  });
}
