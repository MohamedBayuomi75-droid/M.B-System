
function deptPersonRowHtml(p){
  const r = p.rec || {};
  const idExp = r.idCardExpiry || '';
  const idSt = idExp && typeof statusFromExpiry==='function' ? statusFromExpiry(idExp) : (r.idCardStatus||'');
  const licExp = r.licenseExpiry || '';
  const licSt = licExp && typeof statusFromExpiry==='function' ? statusFromExpiry(licExp) : (r.licenseStatus||'');
  const ins = (r.insuranceNumber||'').trim() ? 'insured' : (r.insuranceStatus||'none');
  return `<tr>
    <td>${escapeHtml(p.kindLabel||'')}</td>
    <td>${escapeHtml(r.code||'')}</td>
    <td><strong>${escapeHtml(r.name||'')}</strong></td>
    <td>${escapeHtml(r.position||r.skill||'—')}</td>
    <td>${escapeHtml(r.nationalId||'—')}</td>
    <td>${fmtDate(idExp)}</td>
    <td>${typeof statusBadgeSarya==='function'?statusBadgeSarya(idSt,'card'):'—'}</td>
    <td>${fmtDate(licExp)}</td>
    <td>${typeof statusBadgeSarya==='function'?statusBadgeSarya(licSt,'license'):'—'}</td>
    <td>${fmtDate(r.hireDate)}</td>
    <td>${escapeHtml(labelOf(typeof CONTRACT_TYPE_OPTS!=='undefined'?CONTRACT_TYPE_OPTS:[], r.contractType)||r.contractType||'—')}</td>
    <td>${typeof statusBadgeSarya==='function'?statusBadgeSarya(r.contractStatus,'contract'):'—'}</td>
    <td>${r.dailyWage!=null?fmtMoney(r.dailyWage):(r.salary!=null?fmtMoney(r.salary):'—')}</td>
    <td>${typeof statusBadgeSarya==='function'?statusBadgeSarya(ins,'insurance'):'—'}</td>
    <td>${escapeHtml(r.insuranceNumber||'—')}</td>
    <td>${escapeHtml(r.phone||'—')}</td>
    <td>${escapeHtml(r.address||'—')}</td>
    <td><button type="button" class="icon-btn btn-dept-view" data-kind="${p.kind}" data-id="${r.id}" title="عرض">👁️</button></td>
  </tr>`;
}
function peopleInDepartment(deptId){
  const out = [];
  (DATA.employees||[]).forEach(e=>{ if((e.departmentId||e.categoryId)===deptId) out.push({kind:'employee', kindLabel:'موظف', rec:e}); });
  (DATA.workers||[]).forEach(e=>{ if((e.departmentId||e.categoryId)===deptId) out.push({kind:'worker', kindLabel:'عامل', rec:e}); });
  (DATA.supervisors||[]).forEach(e=>{ if((e.departmentId||e.categoryId)===deptId) out.push({kind:'supervisor', kindLabel:'مشرف', rec:e}); });
  (DATA.drivers||[]).forEach(e=>{ if((e.departmentId||e.categoryId)===deptId) out.push({kind:'driver', kindLabel:'سائق', rec:e}); });
  return out;
}

function renderDepartmentsPage(){
  // لوحة قسم واحد
  if(window.__deptBoardId){
    const d = (DATA.departments||[]).find(x=>x.id===window.__deptBoardId);
    if(!d){ window.__deptBoardId=''; }
    else {
      const people = peopleInDepartment(d.id);
      const kindLabel = {employees:'موظفين',workers:'عمال',supervisors:'مشرفين',drivers:'سائقين',equipment:'معدات'}[d.kind]|| (d.kind||'مشترك');
      try{
        if(typeof setPageExport==='function') setPageExport('قسم_'+(d.name||''),
          ['النوع','الكود','الاسم','الوظيفة','الرقم القومي','انتهاء البطاقة','حالة البطاقة','انتهاء الرخصة','حالة الرخصة','تاريخ التعيين','نوع العقد','حالة العقد','الراتب/اليومية','حالة التأمين','الرقم التأميني','التليفون','العنوان'],
          people.map(p=>{
            const r = p.rec||{};
            const idExp = r.idCardExpiry||'';
            const idSt = idExp && typeof statusFromExpiry==='function' ? statusFromExpiry(idExp) : (r.idCardStatus||'');
            const licExp = r.licenseExpiry||'';
            const licSt = licExp && typeof statusFromExpiry==='function' ? statusFromExpiry(licExp) : (r.licenseStatus||'');
            const ins = (r.insuranceNumber||'').trim() ? 'insured' : (r.insuranceStatus||'none');
            return [
              p.kindLabel||'', r.code||'', r.name||'', r.position||r.skill||'', r.nationalId||'',
              idExp||'', idSt||'', licExp||'', licSt||'', r.hireDate||'',
              (labelOf(typeof CONTRACT_TYPE_OPTS!=='undefined'?CONTRACT_TYPE_OPTS:[], r.contractType)||r.contractType||''),
              r.contractStatus||'', (r.dailyWage!=null?r.dailyWage:(r.salary!=null?r.salary:'')),
              ins, r.insuranceNumber||'', r.phone||'', r.address||''
            ];
          }));
      }catch(_e){}
      return `<div class="page">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <div>
            <button type="button" class="btn btn-outline btn-sm" id="btnDeptBack">← كل الأقسام</button>
            <h2 class="page-title" style="margin:10px 0 0;">📁 ${escapeHtml(d.name)}</h2>
            <p class="page-sub" style="margin:4px 0 0;">نوع القسم: ${escapeHtml(kindLabel)} · ${people.length} فرد</p>
          </div>
          <div class="btn-row">${typeof pageExportButtonsHtml==='function'?pageExportButtonsHtml():''}</div>
        </div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr>
              <th>النوع</th><th>الكود</th><th>الاسم</th><th>الوظيفة</th><th>الرقم القومي</th>
              <th>انتهاء البطاقة</th><th>حالة البطاقة</th><th>انتهاء الرخصة</th><th>حالة الرخصة</th>
              <th>تاريخ التعيين</th><th>نوع العقد</th><th>حالة العقد</th><th>الراتب/اليومية</th>
              <th>حالة التأمين</th><th>الرقم التأميني</th><th>التليفون</th><th>العنوان</th><th></th>
            </tr></thead>
          <tbody>
            ${people.length? people.map(p=> deptPersonRowHtml(p)).join('') : '<tr><td colspan="18" style="text-align:center;padding:28px;color:var(--ink-soft);">لا أفراد في هذا القسم</td></tr>'}
          </tbody>
        </table></div>
      </div>`;
    }
  }

  let rows = (DATA.departments||[]).filter(d=>d && d.system && !/^__(resigned|retired)_/.test(d.id||'') ).slice();
  const q = (window.__deptSearch||'').trim().toLowerCase();
  if(q) rows = rows.filter(d => smartMatch(d.name, q) || smartMatch(d.manager, q) || smartMatch(d.kind, q));
  const pg = paginateRows(rows, 'departments');
  const kindLab = {employees:'موظفين',workers:'عمال',supervisors:'مشرفين',drivers:'سائقين',equipment:'معدات'};
  try{
    if(typeof setPageExport==='function') setPageExport('departments', ['الاسم','النوع','عدد الأفراد','الوصف'],
      rows.map(d=>[d.name, kindLab[d.kind]||d.kind||'عام', peopleInDepartment(d.id).length, d.notes||d.description||'']));
  }catch(_e){}
  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
        <div>
          <h2 class="page-title" style="margin:0;">الأقسام</h2>
          <p class="page-sub" style="margin:4px 0 0;">لوحات — كل قسم مستقل حسب نوعه (عمال / موظفين / …)</p>
        </div>
        <div class="btn-row page-header-actions">
          ${typeof pageExportButtonsHtml==='function'?pageExportButtonsHtml():''}
        </div>
      </div>
      <div class="filters-bar">
        <input type="search" id="deptSearch" class="input" placeholder="بحث في الأقسام..." value="${escapeHtml(window.__deptSearch||'')}" style="min-width:220px;">
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">
        ${pg.pageRows.length ? pg.pageRows.map(d=>{
          const cnt = peopleInDepartment(d.id).length;
          const icon = ({employee:'👔',worker:'🔧',supervisor:'👷',driver:'🚗',equipment:'🚜'}[d.kind])||'📁';
          return `<button type="button" class="stat-card btn-dept-board board-card" data-id="${d.id}" style="cursor:pointer;text-align:right;">
            <div class="board-card-icon" style="font-size:28px;margin-bottom:6px;">${icon}</div>
            <div class="num" style="font-size:22px;">${cnt}</div>
            <div class="lbl" style="font-size:15px;font-weight:800;color:var(--ink);">${escapeHtml(d.name)}</div>
            <div style="font-size:12px;color:var(--ink-soft);margin-top:6px;">${escapeHtml(kindLab[d.kind]||d.kind||'قسم')} · اضغط للدخول</div>
          </button>`;
        }).join('') : '<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--ink-soft);">لا أقسام</div>'}
      </div>
      ${tablePagerHtml('departments', pg)}
    </div>`;
}

function initDepartmentsEvents(){
  document.getElementById('btnEditDeptName')?.addEventListener('click', ()=>{
    if(typeof openRenameCategoryModal==='function'){
      // list all kinds - open generic rename
      const list = (DATA.departments||[]).filter(d=>!(typeof isFixedDept==='function' && isFixedDept(d)));
      if(!list.length){ showToast('لا أقسام'); return; }
      openModal(`
        <div class="modal-header"><h3>تعديل اسم قسم</h3><button class="modal-close" onclick="closeModal()">×</button></div>
        <div class="modal-body">
          <label>القسم *
            <select class="input" id="deptRenId">${list.map(d=>`<option value="${d.id}">${escapeHtml(d.name)} ${d.kind?'('+(d.kind)+')':''}</option>`).join('')}</select>
          </label>
          <label>الاسم الجديد *<input class="input" id="deptRenName"></label>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
          <button class="btn btn-primary" id="btnDoRenDept">حفظ</button>
        </div>
      `);
      const fill = ()=>{
        const d = list.find(x=>x.id===document.getElementById('deptRenId').value);
        if(d) document.getElementById('deptRenName').value = d.name||'';
      };
      document.getElementById('deptRenId')?.addEventListener('change', fill); fill();
      document.getElementById('btnDoRenDept')?.addEventListener('click', ()=>{
        const id = document.getElementById('deptRenId')?.value;
        const name = (document.getElementById('deptRenName')?.value||'').trim();
        if(!id||!name){ showToast('أدخل الاسم'); return; }
        const dep = (DATA.departments||[]).find(d=>d.id===id);
        if(dep && typeof isFixedDept==='function' && isFixedDept(dep)){ showToast('قسم أساسي ثابت'); return; }
        if(dep){ dep.name = name; saveData(true); closeModal(); showToast('تم'); rerenderCurrentPage(); }
      });
    }
  });
  document.getElementById('btnDelDeptPage')?.addEventListener('click', ()=>{
    const list = (DATA.departments||[]).filter(d=>!(typeof isFixedDept==='function' && isFixedDept(d)));
    if(!list.length){ showToast('لا أقسام'); return; }
    openModal(`
      <div class="modal-header"><h3>حذف قسم</h3><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="modal-body">
        <p style="font-size:13px;color:var(--ink-soft);">الأفراد المرتبطون يصبحون بدون قسم.</p>
        <label>القسم *<select class="input" id="deptDelId">${list.map(d=>`<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('')}</select></label>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-primary" id="btnDoDelDept">حذف</button>
      </div>
    `);
    document.getElementById('btnDoDelDept')?.addEventListener('click', ()=>{
      const id = document.getElementById('deptDelId')?.value;
      if(!id) return;
      const _dep = (DATA.departments||[]).find(x=>x.id===id);
    if(_dep && (_dep.system || _dep.locked || (typeof isResignedDeptId==='function'&&isResignedDeptId(_dep.id)))){
      showToast('لا يمكن حذف قسم المستقيلين (قسم نظام)'); return;
    }
    confirmDelete('حذف القسم؟').then(ok=>{ if(!ok) return;
        DATA.departments = (DATA.departments||[]).filter(d=>d.id!==id);
        ['employees','workers','supervisors','drivers','equipment'].forEach(k=>{
          (DATA[k]||[]).forEach(r=>{ if(r.departmentId===id) r.departmentId=''; if(r.categoryId===id) r.categoryId=''; });
        });
        saveData(true); closeModal(); showToast('تم الحذف'); rerenderCurrentPage();
      });
    });
  });

  document.getElementById('btnDeptBack')?.addEventListener('click', ()=>{ window.__deptBoardId=''; rerenderCurrentPage(); });
  document.querySelectorAll('.btn-dept-board').forEach(b=> b.addEventListener('click', ()=>{
    window.__deptBoardId = b.getAttribute('data-id');
    rerenderCurrentPage();
  }));
  document.querySelectorAll('.btn-dept-view').forEach(b=> b.addEventListener('click', ()=>{
    const k = b.getAttribute('data-kind'), id = b.getAttribute('data-id');
    if(typeof openPersonDetailModal==='function') openPersonDetailModal(k, id);
  }));
  const search = document.getElementById('deptSearch');
  if(search) search.addEventListener('input', ()=>{ window.__deptSearch = search.value; if(typeof debounceRerender==='function') debounceRerender('deptSearch'); else rerenderCurrentPage(); });
  const add = document.getElementById('btnAddDept');
  if(add) add.addEventListener('click', ()=>{
    openModal(`
      <div class="modal-header"><h3>إضافة قسم</h3><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="modal-body">
        <label>اسم القسم *<input class="input" id="deptName"></label>
        <label>يظهر في
          <select class="input" id="deptKind">
            <option value="employees">الموظفين فقط</option>
            <option value="workers">العمال فقط</option>
            <option value="supervisors">المشرفين فقط</option>
            <option value="drivers">السائقين فقط</option>
            <option value="equipment">المعدات فقط</option>
          </select>
        </label>
        <label>ملاحظات<textarea class="input" id="deptNotes" rows="2"></textarea></label>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-primary" id="btnSaveDept">حفظ</button>
      </div>
    `);
    document.getElementById('btnSaveDept')?.addEventListener('click', ()=>{
      const name = (document.getElementById('deptName')?.value||'').trim();
      if(!name){ showToast('أدخل الاسم'); return; }
      const kind = document.getElementById('deptKind')?.value||'employees';
      DATA.departments = DATA.departments||[];
      if(DATA.departments.some(d=>String(d.name).trim()===name && d.kind===kind)){ showToast('القسم موجود لهذا النوع'); return; }
      DATA.departments.push({ id:uid(), name, kind, manager:'', notes:(document.getElementById('deptNotes')?.value||'').trim() });
      DATA.departments = sortByNameAr(DATA.departments, x=>x.name);
      saveData(true); closeModal(); showToast('تم'); rerenderCurrentPage();
    });
  });
}
