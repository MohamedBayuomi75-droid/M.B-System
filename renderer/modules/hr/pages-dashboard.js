function dashGo(page, extra){
  if(!page) return;
  // تحويلات قديمة → الصفحات الحالية
  const map = {
    documents: 'archive',
    assistant: 'dashboard',
    fuel: 'equipment',
    payroll: 'workerDues',
    settings: 'backup',
    data: 'backup'
  };
  page = map[page] || page;
  try{ if(typeof closeModal==='function') closeModal(); }catch(e){}
  if(extra && typeof extra==='object'){
    if(extra.duesTab) window.__duesKindFilter = extra.duesTab;
    if(extra.expenseKind) window.__expenseKindFilter = extra.expenseKind;
    if(extra.deptId) window.__openDeptId = extra.deptId;
    if(extra.personId) window.__focusPersonId = extra.personId;
    if(extra.equipmentId) window.__focusEquipmentId = extra.equipmentId;
  }
  if(typeof goToPage==='function') goToPage(page);
  else {
    currentPage = page;
    if(typeof render==='function') render();
  }
}

function renderDashboardPage(){
  if(typeof renderFollowCenterPage === 'function') return renderFollowCenterPage();
  const today = typeof todayISO==='function' ? todayISO() : new Date().toISOString().slice(0,10);
  const thisYear = new Date().getFullYear();
  const thisMonth = new Date().getMonth()+1;
  const from = thisYear+'-'+String(thisMonth).padStart(2,'0')+'-01';
  const lastDay = new Date(thisYear, thisMonth, 0).getDate();
  const to = thisYear+'-'+String(thisMonth).padStart(2,'0')+'-'+String(lastDay).padStart(2,'0');
  const monthLabel = thisMonth+'/'+thisYear;

  // ——— أعداد الأشخاص ———
  const totalEmp = (DATA.employees||[]).length;
  const activeEmp = typeof countActiveEmployees==='function' ? countActiveEmployees() : (DATA.employees||[]).filter(e=>e.status==='active'||e.status==='temporary'||!e.status).length;
  const totalWorkers = (DATA.workers||[]).length;
  const activeWorkers = typeof countActiveWorkers==='function' ? countActiveWorkers() : (DATA.workers||[]).filter(w=>w.status==='active'||!w.status).length;
  const supervisors = (DATA.supervisors||[]).filter(s=>s.status!=='inactive' && s.status!=='left').length;
  const driversN = (DATA.drivers||[]).filter(d=>d.status!=='inactive').length;
  const depts = (DATA.departments||[]).length;
  const projectsN = (DATA.projects||[]).length;

  // ——— معدات ———
  const equipTotal = (DATA.equipment||[]).length;
  const equipAvail = typeof countAvailableEquipment==='function' ? countAvailableEquipment()
    : (DATA.equipment||[]).filter(e=>!e.status||e.status==='active'||e.status==='in_use'||e.status==='rented').length;
  const equipMaint = (DATA.equipment||[]).filter(e=>{
    const s = String(e.status||'');
    return s==='maintenance'||s==='broken'||s==='repair'||s.includes('صيانة')||s.includes('عطل');
  }).length;

  // ——— حضور / يوميات اليوم ———
  const attToday = (DATA.attendance||[]).filter(a=>a.date===today).length;
  const wattToday = (DATA.workerAttendance||[]).filter(a=>a.date===today).length;
  const eqDailyToday = (DATA.equipmentDaily||[]).filter(d=>d.date===today).length
    + (DATA.equipmentLogs||[]).filter(d=>d.date===today).length;

  // ——— مستحقات الشهر ———
  let workerDue=0, workerPaid=0, workerPen=0, supDue=0, supPaid=0;
  (DATA.workers||[]).forEach(w=>{
    if(typeof workerDueAmount==='function') workerDue += workerDueAmount(w.id, from, to);
    if(typeof workerPaidTotal==='function') workerPaid += workerPaidTotal(w.id, from, to);
    if(typeof workerPenaltyTotal==='function') workerPen += workerPenaltyTotal(w.id, from, to);
  });
  (DATA.drivers||[]).forEach(d=>{
    if(typeof driverDueAmount==='function') workerDue += driverDueAmount(d.id, from, to);
    else if(typeof workerDueAmount==='function') workerDue += workerDueAmount(d.id, from, to);
    if(typeof driverPaidTotal==='function') workerPaid += driverPaidTotal(d.id, from, to);
    if(typeof driverPenaltyTotal==='function') workerPen += driverPenaltyTotal(d.id, from, to);
  });
  (DATA.supervisors||[]).forEach(s=>{
    try{
      if(typeof supervisorOwnDue==='function') supDue += supervisorOwnDue(s.id, from, to);
      if(typeof supervisorPaidTotal==='function') supPaid += supervisorPaidTotal(s.id, from, to);
    }catch(_e){}
  });
  workerDue=toInt(workerDue); workerPaid=toInt(workerPaid); workerPen=toInt(workerPen);
  const workerBal = toInt(workerDue - workerPaid - workerPen);
  supDue=toInt(supDue); supPaid=toInt(supPaid);
  const supBal = toInt(supDue - supPaid);

    // ——— مصاريف الشهر ———
  let expMonth = 0, expCount = 0;
  (DATA.expenses||[]).forEach(e=>{
    if((e.date||'')>=from && (e.date||'')<=to){ expMonth += toInt(e.amount); expCount++; }
  });
  (DATA.supervisorExpenses||[]).forEach(e=>{
    if((e.date||'')>=from && (e.date||'')<=to){ expMonth += toInt(e.amount); expCount++; }
  });
  expMonth = toInt(expMonth);

  // ——— تكاليف الشهر ———
  let costMonth = 0, costCount = 0;
  (DATA.costs||[]).forEach(c=>{
    if(!c) return;
    if((c.date||'')>=from && (c.date||'')<=to){
      costMonth += toInt(c.amount);
      costCount++;
    }
  });
  costMonth = toInt(costMonth);

  // ——— يوميات معدات الشهر ———
  let eqDailyMonth = 0;
  try{
    if(typeof equipmentDailyCost==='function'){
      (DATA.equipmentDaily||[]).forEach(d=>{
        if((d.date||'')>=from && (d.date||'')<=to)
          eqDailyMonth += equipmentDailyCost(d, typeof getEquipment==='function'?getEquipment(d.equipmentId):null);
      });
    } else {
      (DATA.equipmentDaily||[]).forEach(d=>{
        if((d.date||'')>=from && (d.date||'')<=to) eqDailyMonth += toInt(d.cost||d.dayCost);
      });
    }
    (DATA.equipmentLogs||[]).forEach(d=>{
      if((d.date||'')>=from && (d.date||'')<=to) eqDailyMonth += toInt(d.cost||d.dayCost);
    });
  }catch(_e){}
  eqDailyMonth = toInt(eqDailyMonth);

  // ——— إجازات / أرشيف / تقييم ———
  const pending = typeof countPendingLeaves==='function' ? countPendingLeaves() : (DATA.leaves||[]).filter(l=>l.status==='pending').length;

  // ——— أكثر الناس أخذاً للإجازات (السنة الحالية) ———
  const leaveTopYear = String(thisYear);
  const leaveDaysMap = new Map(); // key: kind|id -> {kind,id,name,days,count}
  (DATA.leaves||[]).forEach(l=>{
    if(l.status==='rejected' || l.status==='cancelled') return;
    const from = l.from || '';
    if(from && from.slice(0,4)!==leaveTopYear) return;
    const kind = l.personKind || l.kind || (l.employeeId?'employee':'employee');
    const id = l.personId || l.employeeId || '';
    if(!id) return;
    let days = toInt(l.days);
    if(!days && typeof calcLeaveDays==='function') days = calcLeaveDays(l.from, l.to);
    if(!days) days = 1;
    const key = kind+'|'+id;
    let rec = leaveDaysMap.get(key);
    if(!rec){
      let name = '';
      try{
        if(kind==='worker' && typeof workerName==='function') name = workerName(id);
        else if(kind==='supervisor' && typeof supervisorName==='function') name = supervisorName(id);
        else if(kind==='driver' && typeof driverName==='function') name = driverName(id);
        else if(typeof employeeName==='function') name = employeeName(id);
      }catch(_e){}
      rec = { kind, id, name: name||id, days:0, count:0 };
      leaveDaysMap.set(key, rec);
    }
    rec.days += days;
    rec.count += 1;
  });
  const topLeaveTakers = Array.from(leaveDaysMap.values())
    .sort((a,b)=> b.days - a.days || b.count - a.count)
    .slice(0, 8);
  const kindLabel = (k)=>({employee:'موظف',worker:'عامل',supervisor:'مشرف',driver:'سائق'})[k]||k;

  const archiveCount = typeof collectAllAttachments==='function' ? collectAllAttachments().length : ((DATA.personDocuments||[]).length + (DATA.attachments||[]).length);
  const missDocs = typeof countPeopleWithMissingDocs==='function' ? countPeopleWithMissingDocs() : 0;
  const usersCount = (DATA.users||[]).length;
  const transfersN = (DATA.resourceTransfers||[]).length;
  const perfN = (DATA.performanceReviews||[]).length;

  // ——— تنبيهات ———
  let systemAlerts = [];
  try{ systemAlerts = typeof collectAllAlerts==='function' ? collectAllAlerts() : (typeof collectSystemAlerts==='function' ? collectSystemAlerts() : []); }catch(_e){}

  const linkCard = (page, num, lbl, warn, extraAttr)=>`
    <button type="button" class="stat-card dash-link ${warn?'debt':''}" data-goto="${page}" ${extraAttr||''}
      style="cursor:pointer;text-align:right;border:none;font:inherit;width:100%;">
      <div class="num">${num}</div><div class="lbl">${lbl}</div>
    </button>`;

  return `
    <div class="page">
      <h2 class="page-title">🧭 مركز المتابعة</h2>
      <p class="page-sub">مركز التحكم — اضغط أي بطاقة للانتقال · التنبيهات مربوطة بكل أجزاء البرنامج · ${escapeHtml(monthLabel)}</p>

      <div class="section-title">🔔 التنبيهات</div>
      ${typeof alertCenterHtml==='function' ? alertCenterHtml()
        : typeof dashboardAlertsHtml==='function'
        ? dashboardAlertsHtml(systemAlerts)
        : (systemAlerts.length
          ? systemAlerts.slice(0,12).map(a=>`<div class="alert-card">${escapeHtml(a.msg||'')}</div>`).join('')
          : '<div class="alert-empty">✓ لا تنبيهات حالياً</div>')}

      <div class="section-title">👔 الموظفين والحضور</div>
      <div class="stats-row dashboard-stats">
        ${linkCard('employees', activeEmp+' / '+totalEmp, 'الموظفين (نشط / الكل)')}
        ${linkCard('departments', depts, 'الأقسام')}
        ${linkCard('attendance', attToday, 'حضور موظفين اليوم')}
        ${linkCard('leaves', pending, 'إجازات قيد الانتظار', pending>0)}
      </div>

      <div class="section-title">🏖️ أكثر الحاصلين على إجازات <span style="font-weight:600;font-size:13px;color:var(--ink-soft);">— سنة ${thisYear}</span>
        <button type="button" class="btn btn-outline btn-sm dash-goto" data-goto="leaves" style="margin-inline-start:auto;">كل الإجازات</button>
      </div>
      ${topLeaveTakers.length ? `
      <div class="table-wrap" style="margin-bottom:18px;">
        <table class="data-table">
          <thead><tr><th>#</th><th>الاسم</th><th>الفئة</th><th>عدد الإجازات</th><th>إجمالي الأيام</th></tr></thead>
          <tbody>
            ${topLeaveTakers.map((r,i)=>`<tr class="dash-goto" data-goto="leaves" style="cursor:pointer;">
              <td>${i+1}</td>
              <td><strong>${escapeHtml(r.name)}</strong></td>
              <td>${kindLabel(r.kind)}</td>
              <td>${fmtNum(r.count)}</td>
              <td><strong>${fmtNum(r.days)}</strong> يوم</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : `<div class="alert-empty" style="margin-bottom:18px;">لا إجازات مسجّلة هذه السنة</div>`}

      <div class="section-title">👷 العمال · المشرفون · السائقون · اليوميات</div>
      <div class="stats-row dashboard-stats">
        ${linkCard('workers', activeWorkers+' / '+totalWorkers, 'العمال (نشط / الكل)')}
        ${linkCard('supervisors', supervisors, 'المشرفون')}
        ${linkCard('drivers', driversN, 'السائقون')}
        ${linkCard('workerAttendance', wattToday, 'يوميات مسجّلة اليوم')}
      </div>

      <div class="section-title">💵 المستحقات</div>
      <div class="stats-row dashboard-stats">
        ${linkCard('workerDues', fmtMoney(workerBal), 'متبقي عمال وسائقين', workerBal>0)}
        ${linkCard('workerDues', fmtMoney(supBal), 'متبقي مشرفين', supBal>0)}
        ${linkCard('workerDues', fmtMoney(workerDue), 'إجمالي مستحقات العمال (الشهر)')}
        ${linkCard('workerDues', fmtMoney(supDue), 'إجمالي مستحقات المشرفين (الشهر)')}
      </div>

      <div class="section-title">🧾 المصاريف والتكاليف</div>
      <div class="stats-row dashboard-stats">
        ${linkCard('expenses', fmtMoney(expMonth), 'مصاريف الشهر', expMonth>0)}
        ${linkCard('expenses', expCount, 'عدد المصاريف (الشهر)')}
        ${linkCard('costs', fmtMoney(costMonth), 'تكاليف الشهر', costMonth>0)}
        ${linkCard('costs', costCount, 'عدد التكاليف (الشهر)')}
        ${linkCard('expenses', fmtMoney(toInt(expMonth+costMonth)), 'إجمالي مصاريف+تكاليف', (expMonth+costMonth)>0)}
      </div>

      <div class="section-title">🛻 معدات ومركبات · تشغيل</div>
      <div class="stats-row dashboard-stats">
        ${linkCard('equipment', equipAvail+' / '+equipTotal, 'معدات ومركبات (متاحة / الكل)')}
        ${linkCard('equipment', equipMaint, 'صيانة / عاطلة', equipMaint>0)}
        ${linkCard('workerAttendance', eqDailyToday, 'يوميات معدات اليوم')}
        ${linkCard('equipment', fmtMoney(eqDailyMonth), 'تكلفة يوميات المعدات (الشهر)')}
        ${linkCard('transfers', transfersN, 'أوامر نقل الموارد')}
        ${linkCard('projects', projectsN, 'المشاريع')}
      </div>

      <div class="section-title">📁 أرشيف · تقارير · نظام</div>
      <div class="stats-row dashboard-stats">
        ${linkCard('archive', archiveCount, 'أرشيف المرفقات')}
        ${linkCard('archive', missDocs, 'ناقص أوراق / بيانات', missDocs>0)}
        ${linkCard('reports', monthLabel, 'التقارير')}
        ${linkCard('performance', perfN, 'تقييمات الأداء')}
        ${linkCard('users', usersCount||1, 'المستخدمون')}
        ${linkCard('backup', '⚙️', 'البيانات والتحديثات')}
      </div>
    </div>`;
}

function initDashboardEvents(){
  if(typeof initFollowCenterEvents === 'function'){ initFollowCenterEvents(); return; }
  try{ if(typeof initAlertCenterEvents==='function') initAlertCenterEvents(); }catch(e){ console.warn(e); }
  document.querySelectorAll('.dash-link, .dash-goto').forEach(el=>{
    el.addEventListener('click', (e)=>{
      const pid = (el.getAttribute('data-person-id')||'').trim();
      const pk = (el.getAttribute('data-person-kind')||'').trim();
      // كرت شخص/معدة → قائمة التنبيهات فقط
      if(pid && pk){
        e.preventDefault();
        e.stopPropagation();
        if(typeof openPersonAlertsModal==='function'){
          openPersonAlertsModal(pk, pid);
        } else {
          let person = null, issues = [];
          try{
            if(pk==='employee') person = typeof getEmployee==='function'?getEmployee(pid):(DATA.employees||[]).find(x=>x.id===pid);
            else if(pk==='worker') person = typeof getWorker==='function'?getWorker(pid):(DATA.workers||[]).find(x=>x.id===pid);
            else if(pk==='supervisor') person = typeof getSupervisor==='function'?getSupervisor(pid):(DATA.supervisors||[]).find(x=>x.id===pid);
            else if(pk==='driver') person = typeof getDriver==='function'?getDriver(pid):(DATA.drivers||[]).find(x=>x.id===pid);
            else if(pk==='equipment') person = (DATA.equipment||[]).find(x=>x.id===pid);
            if(pk==='equipment') issues = typeof equipmentNotesIssues==='function'?equipmentNotesIssues(person||{}):[];
            else issues = typeof personNotesIssues==='function'?personNotesIssues(pk, person||{}):[];
          }catch(_e){}
          if(typeof openModal==='function'){
            openModal(`<div class="modal-header"><h3>تنبيهات وملاحظات</h3><button class="modal-close" onclick="closeModal()">×</button></div>
              <div class="modal-body"><strong>${escapeHtml((person&&(person.name||person.typeLabel||person.code))||pid)}</strong>
              <ul style="margin-top:10px;">${(issues.length?issues.map(i=>'<li>'+String(i).replace(/</g,'&lt;')+'</li>').join(''):'<li>✓ لا تنبيهات</li>')}</ul></div>
              <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">إغلاق</button></div>`);
          }
        }
        return;
      }
      const page = el.getAttribute('data-goto');
      if(page) dashGo(page);
    });
  });
  document.querySelectorAll('.btn-alerts-more').forEach(b=>{
    b.addEventListener('click', (e)=>{
      e.stopPropagation();
      const kind = b.getAttribute('data-kind');
      const label = b.getAttribute('data-label');
      const page = b.getAttribute('data-page');
      if(typeof openAlertsMoreModal==='function') openAlertsMoreModal(kind, label, page);
      else if(page) dashGo(page);
    });
  });
  // كروت التنبيهات النظامية → الصفحة المرتبطة
  document.querySelectorAll('.alert-card[data-goto], .dash-alert[data-goto]').forEach(el=>{
    el.addEventListener('click', ()=>{
      const page = el.getAttribute('data-goto');
      if(page) dashGo(page);
    });
  });
}
