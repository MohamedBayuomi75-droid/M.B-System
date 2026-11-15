function renderEmployeeDetailPage(){
  const e = getEmployee(activeEmployeeId);
  if(!e){
    return `<div class="page"><p>الموظف غير موجود</p><button class="btn btn-outline" id="backToEmpList">رجوع</button></div>`;
  }
  const tab = activeEmployeeTab || 'info';
  const att = (DATA.attendance||[]).filter(a=>a.employeeId===e.id).sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,50);
  const leaves = (DATA.leaves||[]).filter(l=>l.employeeId===e.id).sort((a,b)=>(b.from||'').localeCompare(a.from||''));
  const pays = (DATA.payroll||[]).filter(p=>p.employeeId===e.id).sort((a,b)=>(Number(b.year)-Number(a.year))||(Number(b.month)-Number(a.month)));

  let body = '';
  if(tab==='info'){
    body = `
      <div class="form-grid" style="max-width:720px;">
        <div><strong>الكود:</strong> ${escapeHtml(e.code||'—')}</div>
        <div><strong>الاسم:</strong> ${escapeHtml(e.name||'')}</div>
        <div><strong>القسم:</strong> ${escapeHtml(departmentName(e.departmentId))}</div>
        <div><strong>الوظيفة:</strong> ${escapeHtml(e.position||'—')}</div>
        <div><strong>الراتب:</strong> ${fmtMoney(e.salary)}</div>
        <div><strong>الحالة:</strong> ${escapeHtml(labelOf(EMPLOYEE_STATUS,e.status))}</div>
        <div><strong>تاريخ التعيين:</strong> ${fmtDate(e.hireDate)}</div>
        <div><strong>رصيد الإجازة:</strong> ${employeeLeaveBalance(e.id)}</div>
        <div><strong>الهاتف:</strong> ${escapeHtml(e.phone||'—')}</div>
        <div><strong>البريد:</strong> ${escapeHtml(e.email||'—')}</div>
        <div style="grid-column:1/-1;"><strong>ملاحظات:</strong> ${escapeHtml(e.notes||'—')}</div>
      </div>
      <div class="section-title">المرفقات</div>
      ${attachmentsListHtml(e.attachments, 'employee', e.id)}
      ${attachmentsToolbarHtml('employee', e.id)}
      <div class="btn-row" style="margin-top:16px;">
        <button class="btn btn-primary" id="btnEditEmpDetail">تعديل البيانات</button>
      </div>`;
  } else if(tab==='attendance'){
    body = `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>التاريخ</th><th>الحالة</th><th>حضور</th><th>انصراف</th><th>ملاحظات</th></tr></thead>
      <tbody>${att.length?att.map(a=>`<tr><td>${fmtDate(a.date)}</td><td>${escapeHtml(labelOf(ATTENDANCE_STATUS,a.status))}</td><td>${escapeHtml(a.checkIn||'—')}</td><td>${escapeHtml(a.checkOut||'—')}</td><td>${escapeHtml(a.notes||'')}</td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);">لا سجلات</td></tr>'}</tbody>
    </table></div>`;
  } else if(tab==='leaves'){
    body = `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>النوع</th><th>من</th><th>إلى</th><th>أيام</th><th>الحالة</th><th></th></tr></thead>
      <tbody>${leaves.length?leaves.map(l=>`<tr>
        <td>${escapeHtml(labelOf(LEAVE_TYPES,l.type))}</td><td>${fmtDate(l.from)}</td><td>${fmtDate(l.to)}</td>
        <td>${Number(l.days)||0}</td><td>${escapeHtml(labelOf(LEAVE_STATUS,l.status))}</td>
        <td><button class="btn btn-outline btn-sm btn-print-leave" data-id="${l.id}">طباعة</button></td>
      </tr>`).join(''):'<tr><td colspan="6" style="text-align:center;color:var(--ink-soft);">لا إجازات</td></tr>'}</tbody>
    </table></div>`;
  } else if(tab==='payroll'){
    body = `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>الشهر</th><th>السنة</th><th>الأساسي</th><th>بدلات</th><th>خصومات</th><th>الصافي</th><th></th></tr></thead>
      <tbody>${pays.length?pays.map(p=>`<tr>
        <td>${p.month}</td><td>${p.year}</td><td>${fmtMoney(p.basicSalary)}</td><td>${fmtMoney(p.allowances)}</td>
        <td>${fmtMoney(p.deductions)}</td><td><strong>${fmtMoney(p.netSalary)}</strong></td>
        <td><button class="btn btn-outline btn-sm btn-print-pay" data-id="${p.id}">كشف راتب</button></td>
      </tr>`).join(''):'<tr><td colspan="7" style="text-align:center;color:var(--ink-soft);">لا مسيرات</td></tr>'}</tbody>
    </table></div>`;
  }

  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
        <div>
          <button class="btn btn-outline btn-sm" id="backToEmpList">← رجوع للقائمة</button>
          <h2 class="page-title" style="margin:8px 0 0;">${escapeHtml(e.name||'')}</h2>
          <p class="page-sub" style="margin:2px 0 0;">${escapeHtml(e.code||'')} — ${escapeHtml(departmentName(e.departmentId))}</p>
        </div>
      </div>
      <div class="tabs">
        <button class="tab-btn ${tab==='info'?'active':''}" data-etab="info">البيانات والمرفقات</button>
        <button class="tab-btn ${tab==='attendance'?'active':''}" data-etab="attendance">الحضور</button>
        <button class="tab-btn ${tab==='leaves'?'active':''}" data-etab="leaves">الإجازات</button>
        <button class="tab-btn ${tab==='payroll'?'active':''}" data-etab="payroll">الرواتب</button>
      </div>
      ${body}
    </div>`;
}
function initEmployeeDetailEvents(){
  const back=document.getElementById('backToEmpList');
  if(back) back.addEventListener('click',()=>{ activeEmployeeId=null; currentPage='employees'; render(); });
  document.querySelectorAll('[data-etab]').forEach(b=>b.addEventListener('click',()=>{
    activeEmployeeTab=b.getAttribute('data-etab'); rerenderCurrentPage();
  }));
  const edit=document.getElementById('btnEditEmpDetail');
  if(edit) edit.addEventListener('click',()=> openEmployeeModal(activeEmployeeId));
  document.querySelectorAll('.btn-print-leave').forEach(b=>b.addEventListener('click',()=> printLeaveForm(b.getAttribute('data-id'))));
  document.querySelectorAll('.btn-print-pay').forEach(b=>b.addEventListener('click',()=> printPayslip(b.getAttribute('data-id'))));
  bindAttachmentHandlers();
}
