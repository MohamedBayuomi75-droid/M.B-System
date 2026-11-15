function filteredEmployees(){
  let list = (DATA.employees||[]).slice();
  const f = employeeFilters || {};
  const deptF = f.departmentId || f.categoryId || '';
  list = typeof filterByDeptFilter==='function' ? filterByDeptFilter(list, deptF) : list;
  const inRes = typeof isResignedDeptId==='function' && isResignedDeptId(deptF);
  if(inRes){
    if(f.insuranceStatus) list = list.filter(e => String(e.insuranceStatus||'') === f.insuranceStatus);
    if(f.resignYear) list = list.filter(e => String((isRetiredDeptId(deptF)?e.retiredAt:(e.resignedAt||e.resignDate))||'').slice(0,4) === String(f.resignYear));
  }
  if(f.status && !inRes) list = list.filter(e => e.status === f.status);
  if(f.employmentType && !inRes) list = list.filter(e => e.employmentType === f.employmentType);
  if(f.position) list = list.filter(e => String(e.position||e.job||'').trim() === f.position);
  if(f.q && typeof smartSearchList==='function') list = smartSearchList(list, f.q);
  if(typeof applyExtraPersonFilters==='function') list = applyExtraPersonFilters('employee', list, f);
  return (f.q && String(f.q).trim()) ? list : sortByNameAr(list, e=>e.name);
}

function employeesInRetiredSection(){
  const f = employeeFilters || {};
  return typeof isRetiredDeptId==='function' && isRetiredDeptId(f.departmentId || f.categoryId || '');
}
function employeesInResignedSection(){
  const f = employeeFilters || {};
  return typeof isResignedDeptId==='function' && isResignedDeptId(f.departmentId || f.categoryId || '');
}
function resignedEmployeesCardsHtml(rows){
  const yr = String(new Date().getFullYear());
  const ret = employeesInRetiredSection();
  const rd = e=> String(ret ? (e.retiredAt||'') : (e.resignedAt||e.resignDate||'')).slice(0,10);
  let months = 0, cnt = 0;
  rows.forEach(e=>{ const h = String(e.hireDate||'').slice(0,10), r = rd(e); if(h && r && r>=h){ months += (new Date(r)-new Date(h))/(1000*60*60*24*30.4375); cnt++; } });
  const avg = cnt ? months/cnt : 0;
  const avgTxt = !cnt ? '—' : (avg>=12 ? (Math.round(avg/12*10)/10)+' سنة' : Math.round(avg)+' شهر');
  const noDate = rows.filter(e=>!rd(e)).length;
  return statCardsHtml([
    {ico:ret?'🏖️':'🚪',label:ret?'عدد المتقاعدين':'عدد المستقيلين',value:fmtNum(rows.length)},
    {ico:'📅',label:ret?'أُحيلوا للمعاش هذا العام':'استقالوا هذا العام',value:fmtNum(rows.filter(e=>rd(e).slice(0,4)===yr).length),tone:'ok'},
    {ico:'⏳',label:'متوسط مدة الخدمة',value:avgTxt},
    {ico:'❗',label:ret?'بدون تاريخ إحالة':'بدون تاريخ استقالة',value:fmtNum(noDate),tone:noDate?'warn':''}]);
}
function resignedEmployeesFiltersHtml(){
  const f = employeeFilters || {};
  const ret = employeesInRetiredSection();
  const years = Array.from(new Set((DATA.employees||[]).map(e=>String(ret?(e.retiredAt||''):(e.resignedAt||e.resignDate||'')).slice(0,4)).filter(y=>/^\d{4}$/.test(y)))).sort().reverse();
  return `<div class="filters-bar">
    <input type="search" id="empSearch" class="input" placeholder="بحث: اسم، كود، هاتف، قومي، وظيفة، عنوان..." value="${escapeHtml(f.q||'')}" style="min-width:200px;">
    <select id="empFilterIns" class="input"><option value="">حالة التأمين: الكل</option>${selectOptions(typeof INSURANCE_STATUS_OPTS!=='undefined'?INSURANCE_STATUS_OPTS:[], f.insuranceStatus||'')}</select>
    <select id="empFilterResYear" class="input"><option value="">${ret?'سنة الإحالة للمعاش':'سنة الاستقالة'}: الكل</option>${years.map(y=>`<option value="${y}" ${String(f.resignYear||'')===y?'selected':''}>${y}</option>`).join('')}</select>
  </div>`;
}
function resignedEmployeesTableHtml(pg){
  const ret = employeesInRetiredSection();
  return `<div class="table-wrap"><table class="data-table">
    <thead><tr><th style="width:36px;"><input type="checkbox" id="checkAll_employees" title="تحديد الكل"></th>
      <th>كود الموظف</th><th>الاسم</th><th>الوظيفة</th><th>الرقم القومي</th><th>تاريخ التعيين</th><th>${ret?'تاريخ الإحالة للمعاش':'تاريخ الاستقالة'}</th><th>حالة التأمين</th><th>الرقم التأميني</th><th>رقم التليفون</th><th>العنوان</th><th>القسم</th><th>الحالة</th><th>الملاحظات</th><th></th></tr></thead>
    <tbody>${pg.pageRows.length ? pg.pageRows.map(e=>`<tr data-emp-id="${e.id}">
      <td><input type="checkbox" class="row-check" data-kind="employees" data-id="${e.id}"></td>
      <td>${escapeHtml(e.code||'')}</td>
      <td><strong style="cursor:pointer;color:var(--ledger-green);" class="emp-open-detail" data-id="${e.id}">${escapeHtml(e.name||'')}</strong></td>
      <td>${escapeHtml(e.position||'')}</td>
      <td>${escapeHtml(e.nationalId||'—')}</td>
      <td>${fmtDate(e.hireDate)}</td>
      <td>${fmtDate(ret?e.retiredAt:(e.resignedAt||e.resignDate))||'—'}</td>
      <td>${typeof statusBadgeSarya==='function'?statusBadgeSarya(e.insuranceStatus||'','insurance'):'—'}</td>
      <td>${escapeHtml(e.insuranceNumber||'—')}</td>
      <td>${escapeHtml(e.phone||'—')}</td>
      <td>${escapeHtml(e.address||'—')}</td>
      <td>${escapeHtml(departmentName(e.previousDepartmentId||e.departmentId)||'—')}</td>
      <td><span class="badge badge-err">${escapeHtml(labelOf(EMPLOYEE_STATUS,e.status)||(ret?'على المعاش':'مستقيل'))}</span></td>
      <td>${typeof personNotesCellHtml==='function'?personNotesCellHtml('employee',e):'—'}</td>
      <td>${typeof rowActionBtnsHtml==='function'?rowActionBtnsHtml({id:e.id, viewClass:'emp-open-detail', editClass:'btn-edit-emp', delClass:'btn-del-emp'}):''}</td>
    </tr>`).join('') : `<tr><td colspan="15" style="text-align:center;color:var(--ink-soft);padding:30px;">${ret?'لا يوجد متقاعدون':'لا يوجد مستقيلون'}</td></tr>`}</tbody>
  </table></div>`;
}

function renderEmployeesPage(){
  if(typeof isEntityBoardsView==='function' && isEntityBoardsView(employeeFilters)){
    return typeof entityDeptBoardsPageHtml==='function'
      ? entityDeptBoardsPageHtml('employees', 'الموظفين', '')
      : '<div class="page"><h2>الموظفين</h2></div>';
  }
  try{
    const _er = typeof filteredEmployees==='function'?filteredEmployees():(DATA.employees||[]);
    if(typeof setPageExport==='function'){ const _x = personListExport('employee', _er); setPageExport('employees', _x.headers, _x.rows); }
  }catch(_e){}

  const rows = filteredEmployees();
  const pg = paginateRows(rows, 'employees');
  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
        <div>
          ${typeof entityListBackBarHtml==='function'?entityListBackBarHtml('employees', employeeFilters, ''):''}
          <h2 class="page-title" style="margin:0;">الموظفين</h2>
        </div>
        <div class="btn-row">
          ${typeof pageExportButtonsHtml==='function'?pageExportButtonsHtml():''}
        <button class="btn btn-primary" id="btnAddEmployee" ${readOnlyMode?'disabled':''}>+ إضافة موظف</button>
        </div>
      </div>
      ${employeesInResignedSection() ? resignedEmployeesCardsHtml(rows) : entityStatCardsHtml('employees', rows)}
      ${employeesInResignedSection() ? resignedEmployeesFiltersHtml() : ''}
      ${employeesInResignedSection() ? '' : `
      <div class="filters-bar">
        <input type="search" id="empSearch" class="input" placeholder="بحث: اسم، كود، هاتف، قومي، وظيفة، عنوان..." value="${escapeHtml(employeeFilters.q||'')}" style="min-width:200px;">
        <select id="empFilterStatus" class="input">
          <option value="">كل الحالات</option>
          ${personStatusOptionsHtml(employeeFilters.status||'__all__')}
        </select>
        <select id="empFilterType" class="input">
          <option value="">كل أنواع التوظيف</option>
          ${selectOptions(EMPLOYMENT_TYPES, employeeFilters.employmentType)}
        </select>
        <select id="empFilterPos" class="input">
          <option value="">كل الوظائف</option>
          ${Array.from(new Set((DATA.employees||[]).map(e=>String(e.position||e.job||'').trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'ar')).map(v=>`<option value="${escapeHtml(v)}" ${employeeFilters.position===v?'selected':''}>${escapeHtml(v)}</option>`).join('')}
        </select>
        ${typeof extraPersonFiltersHtml==='function'?extraPersonFiltersHtml('employee', employeeFilters, 'emp'):''}
      </div>
      `}
      ${typeof bulkBarHtml==='function'?bulkBarHtml('employees'):''}
      ${employeesInResignedSection() ? resignedEmployeesTableHtml(pg) : `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:36px;"><input type="checkbox" id="checkAll_employees" title="تحديد الكل"></th>${thIf('employees','code','كود الموظف')}${thIf('employees','name','الاسم')}${thIf('employees','position','الوظيفة')}${thIf('employees','nationalId','الرقم القومي')}
              <th>انتهاء البطاقة</th><th>حالة البطاقة</th><th>انتهاء الرخصة</th><th>حالة الرخصة</th>
              <th>تاريخ التعيين</th><th>نوع العقد</th><th>حالة العقد</th><th>الراتب الأساسي</th>
              <th>حالة التأمين</th><th>الرقم التأميني</th>${thIf('employees','phone','رقم التليفون')}
              ${thIf('employees','birthDate','تاريخ الميلاد')}${thIf('employees','address','العنوان')}${thIf('employees','department','القسم')}${thIf('employees','status','الحالة')}${thIf('employees','notes','الملاحظات')}${customFieldsTableHeaders('employees')}<th></th>
            </tr>
          </thead>
          <tbody>
            ${pg.pageRows.length ? pg.pageRows.map(e => `
              <tr data-emp-id="${e.id}">
                <td><input type="checkbox" class="row-check" data-kind="employees" data-id="${e.id}"></td>
                ${tdIf('employees','code',`<td>${escapeHtml(e.code||'')}</td>`)}
                ${tdIf('employees','name',`<td>${typeof personWarningBadge==='function'?personWarningBadge('employee',e):''}<strong style="cursor:pointer;color:var(--ledger-green);" class="emp-open-detail" data-id="${e.id}">${escapeHtml(e.name||'')}</strong></td>`)}
                <td>${escapeHtml(e.position||'')}</td>
                ${tdIf('employees','nationalId',`<td>${escapeHtml(e.nationalId||'—')}</td>`)}
                <td>${fmtDate(e.idCardExpiry)}</td>
                <td>${typeof statusBadgeSarya==='function'?statusBadgeSarya(e.idCardExpiry?statusFromExpiry(e.idCardExpiry):e.idCardStatus,'card'):'—'}</td>
                <td>${fmtDate(e.licenseExpiry)}</td>
                <td>${typeof statusBadgeSarya==='function'?statusBadgeSarya(e.licenseExpiry?statusFromExpiry(e.licenseExpiry):e.licenseStatus,'license'):'—'}</td>
                <td>${fmtDate(e.hireDate)}</td>
                <td>${escapeHtml(labelOf(typeof CONTRACT_TYPE_OPTS!=='undefined'?CONTRACT_TYPE_OPTS:[], e.contractType)||e.contractType||'—')}</td>
                <td>${typeof statusBadgeSarya==='function'?statusBadgeSarya(e.contractStatus,'contract'):'—'}</td>
                <td>${fmtMoney(e.salary)}</td>
                <td>${typeof statusBadgeSarya==='function'?statusBadgeSarya(e.insuranceStatus||'','insurance'):'—'}</td>
                <td>${escapeHtml(e.insuranceNumber||'—')}</td>
                ${tdIf('employees','phone',`<td>${escapeHtml(e.phone||'—')}</td>`)}
                ${tdIf('employees','birthDate',`<td>${fmtDate(e.birthDate)||'—'}</td>`)}${tdIf('employees','address',`<td>${escapeHtml(e.address||'—')}</td>`)}
                ${tdIf('employees','department',`<td>${escapeHtml(e.position||e.job||e.jobTitle||departmentName(e.departmentId)||'—')}</td>`)}
                ${tdIf('employees','status',`${personStatusCellHtml('employee',e)}`)}
                ${tdIf('employees','notes',`<td>${typeof personNotesCellHtml==='function'?personNotesCellHtml('employee',e):'—'}</td>`)}
                <td>${typeof rowActionBtnsHtml==='function'?rowActionBtnsHtml({id:e.id, viewClass:'emp-open-detail', editClass:'btn-edit-emp', delClass:'btn-del-emp'}):''}</td>
              </tr>`).join('') : '<tr><td colspan="9" style="text-align:center;color:var(--ink-soft);padding:30px;">لا يوجد موظفون — اضغط "إضافة موظف"</td></tr>'}
          </tbody>
        </table>
      </div>
      `}
      ${tablePagerHtml('employees', pg)}
      ${customFieldsManageHtml('employees')}
      
    </div>`;
}

function initEmployeesEvents(){
  if(typeof isEntityBoardsView==='function' && isEntityBoardsView(employeeFilters)){
    if(typeof bindEntityDeptBoards==='function') bindEntityDeptBoards('employees', employeeFilters);
    return;
  }
  if(typeof bindEntityListBack==='function') bindEntityListBack('employees', employeeFilters);

  if(typeof bindBulkUI==='function') bindBulkUI('employees','employees');

  if(typeof bindCategoryUI==='function') bindCategoryUI('employees', employeeFilters, ()=>{ resetTablePage('employees'); rerenderCurrentPage(); });

  if(typeof bindCustomFieldsManage==='function') bindCustomFieldsManage('employees');
  
  const search = document.getElementById('empSearch');
  if(search) search.addEventListener('input', ()=>{ employeeFilters.q = search.value; resetTablePage('employees'); if(typeof debounceRerender==='function') debounceRerender('employeesSearch'); else rerenderCurrentPage(); });
  const fd = document.getElementById('empFilterDept');
  if(fd) fd.addEventListener('change', ()=>{ employeeFilters.departmentId = fd.value; resetTablePage('employees'); rerenderCurrentPage(); });
  const fIns = document.getElementById('empFilterIns');
  if(fIns) fIns.addEventListener('change', ()=>{ employeeFilters.insuranceStatus = fIns.value; resetTablePage('employees'); rerenderCurrentPage(); });
  const fRy = document.getElementById('empFilterResYear');
  if(fRy) fRy.addEventListener('change', ()=>{ employeeFilters.resignYear = fRy.value; resetTablePage('employees'); rerenderCurrentPage(); });
  const fpos = document.getElementById('empFilterPos');
  if(fpos) fpos.addEventListener('change', ()=>{ employeeFilters.position = fpos.value; resetTablePage('employees'); rerenderCurrentPage(); });
  const fs = document.getElementById('empFilterStatus');
  if(fs) fs.addEventListener('change', ()=>{ employeeFilters.status = fs.value; resetTablePage('employees'); rerenderCurrentPage(); });
  const ft = document.getElementById('empFilterType');
  if(ft) ft.addEventListener('change', ()=>{ employeeFilters.employmentType = ft.value; resetTablePage('employees'); rerenderCurrentPage(); });
  if(typeof bindExtraPersonFilters==='function') bindExtraPersonFilters('emp', employeeFilters, 'employees');
  const addBtn = document.getElementById('btnAddEmployee');
  if(addBtn) addBtn.addEventListener('click', ()=> openEmployeeModal());
  document.querySelectorAll('.btn-edit-emp').forEach(b => b.addEventListener('click', ()=> openEmployeeModal(b.getAttribute('data-id'))));
  document.querySelectorAll('.emp-open-detail').forEach(b=> b.addEventListener('click', ()=>{
    const id = b.getAttribute('data-id');
    if(typeof openPersonDetailPage==='function') openPersonDetailPage('employee', id);
    else if(typeof openPersonDetailModal==='function') openPersonDetailModal('employee', id);
  }));
  document.querySelectorAll('.btn-del-emp').forEach(b => b.addEventListener('click', ()=>{
    const id = b.getAttribute('data-id');
    const emp = getEmployee(id);
    confirmDelete('حذف الموظف؟ يمكن الاستعادة خلال 5 ثوانٍ').then(ok=>{ if(!ok) return;
      softDelete('employees', id, emp?emp.name:id);
      addAudit('حذف موظف', emp?emp.name:id);
      rerenderCurrentPage();
    });
  }));
}
