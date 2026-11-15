function leavePersonName(l){
  const kind = l.personKind || l.kind || 'employee';
  const id = l.personId || l.employeeId || '';
  if(kind==='worker' && typeof workerName==='function') return workerName(id);
  if(kind==='supervisor' && typeof supervisorName==='function') return supervisorName(id);
  if(kind==='driver' && typeof driverName==='function') return driverName(id);
  if(typeof employeeName==='function') return employeeName(id||l.employeeId);
  return id;
}
function leaveKindLabel(k){
  return ({employee:'موظف',worker:'عامل',supervisor:'مشرف',driver:'سائق'})[k] || 'موظف';
}
function filteredLeaves(){
  let list = (DATA.leaves||[]).slice();
  const f = leaveFilters||{};
  if(f.personKind) list = list.filter(l=>(l.personKind||l.kind||'employee')===f.personKind);
  if(f.employeeId) list = list.filter(l=>(l.personId||l.employeeId)===f.employeeId);
  if(f.type) list = list.filter(l=>l.type===f.type);
  if(f.status) list = list.filter(l=>l.status===f.status);
  if(f.from) list = list.filter(l=>(l.from||'')>=f.from);
  if(f.to) list = list.filter(l=>(l.to||'')<=f.to);
  if(f.q){
    const q=String(f.q).trim().toLowerCase();
    list=list.filter(l=>{
      const nm = (leavePersonName(l)||'').toLowerCase();
      return smartMatch(nm, q) || smartMatch(l.reason, q) || smartMatch(l.code, q);
    });
  }
  list.sort((a,b)=>(b.from||'').localeCompare(a.from||''));
  return list;
}
function calcLeaveDays(from, to){
  if(!from || !to) return 1;
  try{
    const a = new Date(from+'T12:00:00');
    const b = new Date(to+'T12:00:00');
    const total = Math.round((b-a)/(24*3600*1000)) + 1;
    if(total <= 0) return 1;
    // لو الإعدادات "استبعاد الجمعة": الجمعة مش بتتحسب من أيام الإجازة
    if((DATA.settings||{}).leaveExcludeFridays){
      let n = 0;
      for(let i = 0; i < total; i++){ const d = new Date(a.getTime() + i*24*3600*1000); if(d.getDay() !== 5) n++; }
      return n > 0 ? n : 1;
    }
    return total;
  }catch(e){ return 1; }
}
function renderLeavesPage(){
  const rows = filteredLeaves();
  const pending = rows.filter(l=>l.status==='pending').length;
  const approved = rows.filter(l=>l.status==='approved').length;
  const rejected = rows.filter(l=>l.status==='rejected').length;
  try{
    if(typeof setPageExport==='function') setPageExport('leaves',
      ['الاسم','النوع','الفئة','من','إلى','أيام','الحالة','السبب'],
      rows.map(l=>[
        leavePersonName(l),
        (typeof labelOf==='function'?labelOf(LEAVE_TYPES,l.type):l.type)||l.type,
        leaveKindLabel(l.personKind||'employee'),
        l.from, l.to, l.days,
        (typeof labelOf==='function'?labelOf(LEAVE_STATUS,l.status):l.status)||l.status,
        l.reason||''
      ]));
  }catch(_e){}

  const pg = paginateRows(rows, 'leaves');
  const f = leaveFilters||{};
  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
        <div>
          <h2 class="page-title" style="margin:0;">الإجازات</h2>
          <p class="page-sub" style="margin:4px 0 0;">طلبات الإجازات والموافقات — موظفين وعمال ومشرفين وسائقين</p>
        </div>
        <div class="btn-row page-header-actions" style="display:flex;flex-wrap:nowrap;gap:8px;align-items:center;">
          ${typeof pageExportButtonsHtml==='function'?pageExportButtonsHtml():''}
          <button class="btn btn-primary" id="btnAddLeave" ${readOnlyMode?'disabled':''}>+ طلب إجازة</button>
        </div>
      </div>

      <div class="stats-row" style="margin-bottom:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;">
        <div class="stat-card"><div class="num">${rows.length}</div><div class="lbl">إجمالي الطلبات</div></div>
        <div class="stat-card ${pending?'debt':''}"><div class="num">${pending}</div><div class="lbl">قيد الانتظار</div></div>
        <div class="stat-card"><div class="num">${approved}</div><div class="lbl">مقبولة</div></div>
        <div class="stat-card"><div class="num">${rejected}</div><div class="lbl">مرفوضة</div></div>
      </div>

      <div class="filters-bar filters-bar-one-row lv-filters">
        <input type="search" id="lvSearch" class="input" placeholder="بحث بالاسم / السبب..." value="${escapeHtml(f.q||'')}">
        <select id="lvFilterKind" class="input">
          <option value="">كل الفئات</option>
          <option value="employee" ${f.personKind==='employee'?'selected':''}>موظفين</option>
          <option value="worker" ${f.personKind==='worker'?'selected':''}>عمال</option>
          <option value="supervisor" ${f.personKind==='supervisor'?'selected':''}>مشرفين</option>
          <option value="driver" ${f.personKind==='driver'?'selected':''}>سائقين</option>
        </select>
        <select id="lvFilterType" class="input"><option value="">كل الأنواع</option>${selectOptions(LEAVE_TYPES, f.type)}</select>
        <select id="lvFilterStatus" class="input"><option value="">كل الحالات</option>${selectOptions(LEAVE_STATUS, f.status)}</select>
        <label class="lv-lab">من <input type="date" id="lvFilterFrom" class="input" value="${escapeHtml(f.from||'')}"></label>
        <label class="lv-lab">إلى <input type="date" id="lvFilterTo" class="input" value="${escapeHtml(f.to||'')}"></label>
        <button class="btn btn-outline btn-sm" id="lvApply">تطبيق</button>
      </div>

      <div class="table-wrap"><table class="data-table">
        <thead><tr>
          <th>الاسم</th><th>الفئة</th><th>النوع</th><th>من</th><th>إلى</th><th>أيام</th><th>الحالة</th><th>السبب</th><th></th>
        </tr></thead>
        <tbody>
          ${pg.pageRows.length? pg.pageRows.map(l=>{
            const st = l.status||'pending';
            const stLab = (typeof labelOf==='function'?labelOf(LEAVE_STATUS,st):st)||st;
            const stColor = st==='pending'?'#e6a700':st==='approved'?'#1B4332':st==='rejected'?'#c1121f':'inherit';
            return `<tr>
              <td><strong>${escapeHtml(leavePersonName(l))}</strong></td>
              <td>${escapeHtml(leaveKindLabel(l.personKind||'employee'))}</td>
              <td>${escapeHtml((typeof labelOf==='function'?labelOf(LEAVE_TYPES,l.type):l.type)||l.type||'')}</td>
              <td>${fmtDate(l.from)}</td>
              <td>${fmtDate(l.to)}</td>
              <td>${l.days||'—'}</td>
              <td><span style="color:${stColor};font-weight:700;">${escapeHtml(stLab)}</span></td>
              <td>${escapeHtml(l.reason||'')}</td>
              <td style="white-space:nowrap;">
                ${st==='pending'&&!readOnlyMode?`
                  <button class="btn btn-outline btn-sm btn-ok-lv" data-id="${l.id}" title="موافقة">✓</button>
                  <button class="btn btn-outline btn-sm btn-no-lv" data-id="${l.id}" title="رفض">✗</button>
                `:''}
                <button class="btn btn-outline btn-sm btn-print-lv" data-id="${l.id}">🧾</button>
                <button class="btn btn-outline btn-sm btn-edit-lv" data-id="${l.id}" ${readOnlyMode?'disabled':''}>✏️</button>
                <button class="btn btn-outline btn-sm btn-del-lv" data-id="${l.id}" ${readOnlyMode?'disabled':''}>🗑️</button>
              </td>
            </tr>`;
          }).join('') : '<tr><td colspan="9" style="text-align:center;color:var(--ink-soft);padding:24px;">لا طلبات إجازة</td></tr>'}
        </tbody>
      </table></div>
      ${tablePagerHtml('leaves', pg)}
    </div>`;
}
function initLeavesEvents(){
  document.getElementById('btnAddLeave')?.addEventListener('click', ()=> openLeaveModal());
  document.getElementById('lvApply')?.addEventListener('click', ()=>{
    leaveFilters.q = document.getElementById('lvSearch')?.value||'';
    leaveFilters.personKind = document.getElementById('lvFilterKind')?.value||'';
    leaveFilters.type = document.getElementById('lvFilterType')?.value||'';
    leaveFilters.status = document.getElementById('lvFilterStatus')?.value||'';
    leaveFilters.from = document.getElementById('lvFilterFrom')?.value||'';
    leaveFilters.to = document.getElementById('lvFilterTo')?.value||'';
    if(typeof resetTablePage==='function') resetTablePage('leaves');
    rerenderCurrentPage();
  });
  document.getElementById('lvSearch')?.addEventListener('keydown', (e)=>{
    if(e.key==='Enter') document.getElementById('lvApply')?.click();
  });
  document.querySelectorAll('.btn-ok-lv').forEach(b=>b.addEventListener('click',()=>{
    const l=(DATA.leaves||[]).find(x=>x.id===b.getAttribute('data-id'));
    if(l){ l.status='approved'; addAudit('موافقة إجازة', leavePersonName(l)); saveData(true); showToast('تمت الموافقة'); rerenderCurrentPage(); }
  }));
  document.querySelectorAll('.btn-no-lv').forEach(b=>b.addEventListener('click',()=>{
    const l=(DATA.leaves||[]).find(x=>x.id===b.getAttribute('data-id'));
    if(l){ l.status='rejected'; addAudit('رفض إجازة', leavePersonName(l)); saveData(true); showToast('تم الرفض'); rerenderCurrentPage(); }
  }));
  document.querySelectorAll('.btn-print-lv').forEach(b=>b.addEventListener('click',()=>{
    if(typeof printLeaveForm==='function') printLeaveForm(b.getAttribute('data-id'));
  }));
  document.querySelectorAll('.btn-edit-lv').forEach(b=>b.addEventListener('click',()=> openLeaveModal(b.getAttribute('data-id'))));
  document.querySelectorAll('.btn-del-lv').forEach(b=>b.addEventListener('click',()=>{
    confirmDelete().then(ok=>{ if(!ok) return;
      DATA.leaves=(DATA.leaves||[]).filter(l=>l.id!==b.getAttribute('data-id'));
      saveData(true); showToast('تم الحذف'); rerenderCurrentPage();
    });
  }));
}
function openLeaveModal(editId){
  const existing = editId ? (DATA.leaves||[]).find(x=>x.id===editId) : null;
  const kind0 = existing ? (existing.personKind||'employee') : 'employee';
  let pid0 = existing ? (existing.personId||existing.employeeId||'') : '';
  openModal(`
    <div class="modal-header"><h3>${existing?'تعديل إجازة':'طلب إجازة'}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-grid form-grid-2">
        <label>الفئة *
          <select class="input" id="lvKind">
            <option value="employee" ${kind0==='employee'?'selected':''}>موظف</option>
            <option value="worker" ${kind0==='worker'?'selected':''}>عامل</option>
            <option value="supervisor" ${kind0==='supervisor'?'selected':''}>مشرف</option>
            <option value="driver" ${kind0==='driver'?'selected':''}>سائق</option>
          </select>
        </label>
        <label>القسم
          <select class="input" id="lvDept"></select>
        </label>
        <label id="lvPersonLab" style="grid-column:1/-1;">الشخص *
          <div id="lvPersonBox"></div>
        </label>
        <label>نوع الإجازة
          <select class="input" id="lvType">${selectOptions(LEAVE_TYPES, existing&&existing.type||'annual')}</select>
        </label>
        <label>عدد الأيام
          <input class="input" id="lvDays" type="number" min="0.5" step="0.5" value="${existing&&existing.days||1}">
        </label>
        <label>من تاريخ
          <input class="input" id="lvFromD" type="date" value="${escapeHtml(existing&&existing.from||todayISO())}">
        </label>
        <label>إلى تاريخ
          <input class="input" id="lvToD" type="date" value="${escapeHtml(existing&&existing.to||todayISO())}">
        </label>
        <label style="grid-column:1/-1;">السبب
          <textarea class="input" id="lvReason" rows="2">${escapeHtml(existing&&existing.reason||'')}</textarea>
        </label>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="btnSaveLv">${existing?'حفظ التعديل':'إرسال الطلب'}</button>
    </div>
  `);
  function kindToDeptKey(kind){
    return ({employee:'employees',worker:'workers',supervisor:'supervisors',driver:'drivers'})[kind] || 'employees';
  }
  function resolvePersonDept(kind, pid){
    if(!pid) return '';
    let rec = null;
    if(kind==='employee') rec = (DATA.employees||[]).find(x=>x.id===pid);
    else if(kind==='worker') rec = (DATA.workers||[]).find(x=>x.id===pid);
    else if(kind==='supervisor') rec = (DATA.supervisors||[]).find(x=>x.id===pid);
    else if(kind==='driver') rec = (DATA.drivers||[]).find(x=>x.id===pid);
    return rec ? (rec.departmentId||rec.categoryId||'') : '';
  }
  function fillDepts(keepId){
    const kind = document.getElementById('lvKind')?.value || 'employee';
    const sel = document.getElementById('lvDept');
    if(!sel) return;
    const key = kindToDeptKey(kind);
    const cur = keepId != null ? keepId : (sel.value||'');
    if(typeof deptOptionsForKind==='function'){
      sel.innerHTML = deptOptionsForKind(key, cur);
    } else {
      sel.innerHTML = '<option value="">— كل الأقسام —</option>' +
        (DATA.departments||[]).map(d=>`<option value="${d.id}" ${d.id===cur?'selected':''}>${escapeHtml(d.name||'')}</option>`).join('');
    }
  }
  function fillPerson(keepPersonId){
    const kind = document.getElementById('lvKind').value;
    const deptId = document.getElementById('lvDept')?.value || '';
    window.__leaveDeptFilter = deptId || '';
    const box = document.getElementById('lvPersonBox');
    const keep = keepPersonId != null ? keepPersonId : '';
    // إذا القسم محدد والشخص الحالي مش منه نفرّغ الاختيار
    let selected = keep || pid0;
    if(deptId && selected){
      const pd = resolvePersonDept(kind, selected);
      if(pd && pd !== deptId) selected = '';
    }
    if(box && typeof entityComboHtml==='function'){
      box.innerHTML = entityComboHtml('lvEmp', kind, selected, deptId ? 'اختر من القسم...' : 'اكتب الاسم أو الكود...');
      if(typeof bindEntityCombos==='function') bindEntityCombos(document.getElementById('appModal')||document);
    }
  }
  function syncDays(){
    const from = document.getElementById('lvFromD')?.value;
    const to = document.getElementById('lvToD')?.value;
    const d = calcLeaveDays(from, to);
    const el = document.getElementById('lvDays');
    if(el && from && to) el.value = d;
  }
  document.getElementById('lvKind')?.addEventListener('change', ()=>{
    pid0 = '';
    fillDepts('');
    fillPerson('');
  });
  document.getElementById('lvDept')?.addEventListener('change', ()=>{
    fillPerson('');
  });
  document.getElementById('lvFromD')?.addEventListener('change', syncDays);
  document.getElementById('lvToD')?.addEventListener('change', syncDays);
  // تهيئة: قسم الشخص الحالي إن وُجد
  const initDept = resolvePersonDept(kind0, pid0);
  fillDepts(initDept);
  fillPerson(pid0);
  document.getElementById('btnSaveLv').addEventListener('click',()=>{
    const kind = document.getElementById('lvKind').value;
    const empId = (typeof getEntityComboValue==='function'?getEntityComboValue('lvEmp'):'') || document.getElementById('lvEmp')?.value || '';
    if(!empId){ showToast('اختر الشخص'); return; }
    const from = document.getElementById('lvFromD').value;
    const to = document.getElementById('lvToD').value;
    const days = Number(document.getElementById('lvDays').value)||calcLeaveDays(from,to);
    const rec = {
      id: existing ? existing.id : uid(),
      personKind: kind,
      personId: empId,
      employeeId: kind==='employee' ? empId : (existing&&existing.employeeId)||'',
      type: document.getElementById('lvType').value,
      from, to, days,
      reason:(document.getElementById('lvReason').value||'').trim(),
      status: existing ? (existing.status||'pending') : 'pending'
    };
    if(existing){
      Object.assign(existing, rec);
      addAudit('تعديل إجازة', leavePersonName(rec));
    } else {
      DATA.leaves = DATA.leaves||[];
      DATA.leaves.push(rec);
      addAudit('طلب إجازة', leavePersonName(rec));
    }
    window.__leaveDeptFilter = '';
    saveData(true); closeModal(); showToast('تم الحفظ'); rerenderCurrentPage();
  });
}
