/* =========================================================
   التقارير — فعّالة وعملية
   ========================================================= */
if(typeof reportsState === 'undefined'){
  var reportsState = {
    year: new Date().getFullYear(),
    month: new Date().getMonth()+1,
    tab: 'overview',
    from: '',
    to: '',
    personKind: 'worker',
    personId: '',
    // فلاتر تقارير الناس/المعدات
    fQ: '',
    fIns: '',
    fLic: '',
    fCard: '',
    fStatus: '',
    fDept: '',
    fContract: '',
    fContractSt: '',
    fJob: '',
    fProject: '',
    fSup: '',
    fGrade: '',
    fOwnership: '',
    fType: '',
    fPlate: '',
    // فلاتر تقارير العمليات
    fOpKind: '',
    fOpQ: '',
    fOpType: '',
    fOpProject: '',
    fOpStatus: '',
    fOpBal: ''  // dues: remaining | paid | due
  };
}

function repRange(){
  const y = reportsState.year || new Date().getFullYear();
  const m = reportsState.month || 0;
  if(reportsState.from && reportsState.to){
    return { from: reportsState.from, to: reportsState.to, label: reportsState.from+' ← '+reportsState.to };
  }
  if(m){
    const from = y+'-'+String(m).padStart(2,'0')+'-01';
    const last = new Date(y, m, 0).getDate();
    const to = y+'-'+String(m).padStart(2,'0')+'-'+String(last).padStart(2,'0');
    return { from, to, label: monthNameAr(m)+' '+y };
  }
  return { from: y+'-01-01', to: y+'-12-31', label: 'سنة '+y };
}



function renderReportsPage(){
  try{
  const r = repRange();
  const tabs = [
    { id:'overview', label:'نظرة عامة' },
    { id:'alerts', label:'تقارير التنبيهات' },
    { id:'alertsSummary', label:'ملخص التنبيهات' },
    { id:'docsmatrix', label:'مصفوفة الأوراق' },
    { id:'person', label:'تقرير فردي' },
    { id:'employees', label:'الموظفين' },
    { id:'supervisors', label:'المشرفون' },
    { id:'workers', label:'العمال' },
    { id:'drivers', label:'السائقون' },
    { id:'departments', label:'الأقسام' },
    { id:'projects', label:'المشاريع' },
    { id:'equipment', label:'معدات ومركبات' },
    { id:'attendance', label:'حضور الموظفين' },
    { id:'daily', label:'اليوميات' },
    { id:'dues', label:'المستحقات' },
    { id:'expenses', label:'المصاريف' },
    { id:'leaves', label:'الإجازات' },
    { id:'performance', label:'تقييم الأداء' },
    { id:'transfers', label:'حركة الموارد' },
    { id:'penalties', label:'خصومات وجزاءات' }
  ];
  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:14px;">
        <div>
          <h2 class="page-title" style="margin:0;">التقارير</h2>
          <p class="page-sub" style="margin:4px 0 0;">تقارير تشغيلية قابلة للطباعة والتصدير — الفترة: <strong>${escapeHtml(r.label)}</strong></p>
        </div>
        <div class="btn-row page-header-actions" style="display:flex;flex-wrap:nowrap;gap:8px;align-items:center;">
          <button class="btn btn-outline btn-sm" id="btnRepXlsx">إكسيل</button>
          <button class="btn btn-outline btn-sm" id="btnRepCsv">CSV</button>
          <button class="btn btn-primary btn-sm" id="btnRepPrint">طباعة</button>
        </div>
      </div>

      <div class="filters-bar">
        <label style="font-size:13px;">السنة
          <input type="number" class="input" id="repYear" value="${reportsState.year}" style="width:90px;">
        </label>
        <label style="font-size:13px;">الشهر
          <select class="input" id="repMonth" style="min-width:120px;">
            <option value="0" ${!reportsState.month?'selected':''}>كل السنة</option>
            ${[1,2,3,4,5,6,7,8,9,10,11,12].map(m=>`<option value="${m}" ${Number(reportsState.month)===m?'selected':''}>${monthNameAr(m)}</option>`).join('')}
          </select>
        </label>
        <label style="font-size:13px;">من <input type="date" class="input" id="repFrom" value="${escapeHtml(reportsState.from||'')}"></label>
        <label style="font-size:13px;">إلى <input type="date" class="input" id="repTo" value="${escapeHtml(reportsState.to||'')}"></label>
        <button class="btn btn-outline btn-sm" id="btnRepApply">تطبيق</button>
        <button class="btn btn-outline btn-sm" id="btnRepClearDates">مسح التواريخ</button>
      </div>

      <div class="btn-row" style="flex-wrap:wrap;gap:6px;margin-bottom:16px;">
        ${tabs.map(t=>`<button type="button" class="btn ${reportsState.tab===t.id?'btn-primary':'btn-outline'} btn-sm rep-tab" data-tab="${t.id}">${t.label}</button>`).join('')}
      </div>

      <div id="repContent">
        ${renderReportTab(reportsState.tab, r)}
      </div>
    </div>`;
  }catch(err){
    console.error('renderReportsPage', err);
    return '<div class="page"><h2 class="page-title">التقارير</h2><div class="alert-empty" style="padding:24px;color:#b91c1c;">حدث خطأ أثناء عرض صفحة التقارير. جرّب تحديث الصفحة.</div></div>';
  }
}


/** تقرير فردي — واجهة محسّنة */
function repPersonDetail(r){
  const kind = reportsState.personKind || 'worker';
  const pid = reportsState.personId || '';
  const kindOpts = [
    {id:'employee', label:'موظف', icon:'👔'},
    {id:'worker', label:'عامل', icon:'🧑‍🔧'},
    {id:'supervisor', label:'مشرف', icon:'👷'},
    {id:'driver', label:'سائق', icon:'🧑‍🚒'},
    {id:'equipment', label:'معدة / مركبة', icon:'🛻'}
  ];
  const listFor = (k)=>{
    if(k==='employee') return sortByNameAr(DATA.employees||[], x=>x.name);
    if(k==='worker') return sortByNameAr(DATA.workers||[], x=>x.name);
    if(k==='supervisor') return sortByNameAr(DATA.supervisors||[], x=>x.name);
    if(k==='driver') return sortByNameAr(DATA.drivers||[], x=>x.name);
    if(k==='equipment') return sortByNameAr(DATA.equipment||[], x=>x.typeLabel||x.name||x.code||'');
    return [];
  };
  const list = listFor(kind);
  const person = list.find(x=>x.id===pid) || null;
  const kindMeta = kindOpts.find(x=>x.id===kind) || kindOpts[1];
  const lab = (c)=> (typeof arabicLabelForCode==='function'?arabicLabelForCode(c):c)||'—';
  const fd = (d)=> d ? (typeof fmtDate==='function'?fmtDate(d):d) : '—';

  const personSelect = typeof entityComboHtml==='function'
    ? entityComboHtml('repPersonId', kind==='equipment'?'equipment':kind, pid, 'ابحث بالاسم أو الكود…')
    : `<select class="input" id="repPersonId"><option value="">— اختر —</option>${list.map(p=>`<option value="${p.id}" ${p.id===pid?'selected':''}>${escapeHtml((p.code?p.code+' — ':'')+(p.name||p.typeLabel||''))}</option>`).join('')}</select>`;

  // شريط اختيار النوع
  const kindBar = `
    <div class="rep-person-kinds" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;">
      ${kindOpts.map(o=>`
        <button type="button" class="btn ${kind===o.id?'btn-primary':'btn-outline'} btn-sm rep-kind-btn" data-kind="${o.id}"
          style="border-radius:20px;padding:6px 14px;font-weight:700;">
          <span style="margin-left:4px;">${o.icon}</span> ${o.label}
        </button>`).join('')}
    </div>`;

  const filters = `
    <div class="rep-person-toolbar" style="background:var(--surface,#fff);border:1px solid var(--line,#e5e0d5);border-radius:14px;padding:14px 16px;margin-bottom:16px;">
      ${kindBar}
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;">
        <label style="flex:1;min-width:240px;font-size:13px;font-weight:700;color:var(--ink-soft);">
          اختيار ${escapeHtml(kindMeta.label)}
          <div style="margin-top:6px;">${personSelect}</div>
        </label>
        <div style="font-size:12.5px;color:var(--ink-soft);padding-bottom:8px;">
          الفترة: <strong style="color:var(--ink);">${escapeHtml(r.label||'')}</strong>
        </div>
      </div>
    </div>`;

  if(!person){
    return filters + `
      <div style="text-align:center;padding:48px 20px;background:var(--surface,#faf8f4);border:1px dashed var(--line,#ddd);border-radius:16px;">
        <div style="font-size:42px;margin-bottom:10px;">${kindMeta.icon}</div>
        <div style="font-size:16px;font-weight:800;color:var(--ink);margin-bottom:6px;">اختر ${escapeHtml(kindMeta.label)} لعرض التقرير</div>
        <div style="font-size:13px;color:var(--ink-soft);">ابحث بالاسم أو الكود من القائمة أعلاه</div>
      </div>`;
  }

  const name = person.name || person.typeLabel || person.code || '—';
  let due=0, paid=0, days=0, expTotal=0, penalty=0;

  if(kind==='worker'){
    due = typeof workerDueAmount==='function'?workerDueAmount(pid,r.from,r.to):0;
    paid = typeof workerPaidTotal==='function'?workerPaidTotal(pid,r.from,r.to):0;
    penalty = typeof workerPenaltyTotal==='function'?workerPenaltyTotal(pid,r.from,r.to):0;
    days = (DATA.workerAttendance||[]).filter(a=>(a.workerId===pid||a.personId===pid) && (!a.personType||a.personType==='worker') && (a.date||'')>=r.from && (a.date||'')<=r.to)
      .reduce((s,a)=>s+(typeof attendanceDaysCredit==='function'?attendanceDaysCredit(a):(Number(a.days)||1)),0);
  } else if(kind==='driver'){
    due = typeof driverDueAmount==='function'?driverDueAmount(pid,r.from,r.to):0;
    paid = typeof driverPaidTotal==='function'?driverPaidTotal(pid,r.from,r.to):0;
    days = (DATA.workerAttendance||[]).filter(a=>(a.personId===pid||a.driverId===pid) && (a.personType==='driver'||a.kind==='driver') && (a.date||'')>=r.from && (a.date||'')<=r.to)
      .reduce((s,a)=>s+(Number(a.days)||1),0);
  } else if(kind==='supervisor'){
    due = typeof supervisorOwnDue==='function'?supervisorOwnDue(pid,r.from,r.to):0;
    paid = typeof supervisorPaidTotal==='function'?supervisorPaidTotal(pid,r.from,r.to):0;
    days = (DATA.workerAttendance||[]).filter(a=>(a.personId===pid||a.supervisorId===pid) && (a.personType==='supervisor'||a.kind==='supervisor') && (a.date||'')>=r.from && (a.date||'')<=r.to)
      .reduce((s,a)=>s+(Number(a.days)||1),0);
  } else if(kind==='employee'){
    due = toInt(person.salary||person.basicSalary);
    paid = (DATA.payroll||[]).filter(p=>p.employeeId===pid && (!r.from||String(p.year)+'-'+String(p.month).padStart(2,'0')>=r.from.slice(0,7)))
      .reduce((s,p)=>s+toInt(p.net||p.paid||0),0);
  } else if(kind==='equipment'){
    const logs = (DATA.equipmentLogs||[]).filter(l=>l.equipmentId===pid && (l.date||'')>=r.from && (l.date||'')<=r.to);
    days = logs.reduce((s,l)=>s+(Number(l.days)||1),0);
    due = logs.reduce((s,l)=>s+toInt(l.cost||l.dayCost||0),0);
  }
  expTotal = (DATA.expenses||[]).filter(e=>{
    if(e.personId!==pid) return false;
    if(r.from && (e.date||'')<r.from) return false;
    if(r.to && (e.date||'')>r.to) return false;
    return true;
  }).reduce((s,e)=>s+toInt(e.amount),0);
  const remain = toInt(due - paid - penalty);

  // بيانات أساسية
  const infoRows = [];
  const addInfo = (k,v)=>{ if(v!=null && String(v).trim()!=='' && v!=='—') infoRows.push([k,v]); };
  addInfo('الكود', person.code);
  if(kind==='equipment'){
    addInfo('نوع السيارة', person.typeLabel||person.name);
    addInfo('رقم اللوحة', person.vehicleNumber||person.plate);
    addInfo('نوع الترخيص', person.licenseCategory);
    addInfo('الموديل', person.model);
    addInfo('اللون', person.color);
    addInfo('الحالة', lab(person.status));
    addInfo('الملكية', lab(person.ownership));
    addInfo('انتهاء رخصة السيارة', fd(person.vehicleLicenseExpiry||person.licenseExpiry));
    addInfo('اسم السائق', person.driverName);
  } else {
    addInfo('الوظيفة', person.position||person.skill);
    addInfo('الرقم القومي', person.nationalId);
    addInfo('الهاتف', person.phone);
    addInfo('العنوان', person.address);
    addInfo('القسم', typeof departmentName==='function'?departmentName(person.departmentId||person.categoryId):'');
    addInfo('المشروع', person.project);
    if(kind==='worker') addInfo('المشرف', typeof supervisorName==='function'?supervisorName(person.supervisorId):'');
    addInfo('تاريخ التعيين', fd(person.hireDate));
    addInfo('اليومية / الراتب', kind==='employee'?fmtMoney(person.salary||person.basicSalary):fmtMoney(person.dailyWage));
    addInfo('حالة التأمين', person.insuranceStatus==='none'?'غير مؤمن عليه':lab(person.insuranceStatus));
    addInfo('الرقم التأميني', person.insuranceNumber);
    addInfo('انتهاء البطاقة', fd(person.idCardExpiry));
    addInfo('انتهاء الرخصة', fd(person.licenseExpiry));
    addInfo('الحالة', lab(person.status));
  }
  addInfo('القسم', typeof departmentName==='function'?departmentName(person.departmentId||person.categoryId):'');

  const attRows = (DATA.workerAttendance||[]).filter(a=>{
    if((a.date||'')<r.from || (a.date||'')>r.to) return false;
    if(kind==='worker') return (a.workerId===pid||a.personId===pid) && (!a.personType||a.personType==='worker');
    if(kind==='supervisor') return (a.personId===pid||a.supervisorId===pid) && (a.personType==='supervisor'||a.kind==='supervisor');
    if(kind==='driver') return (a.personId===pid||a.driverId===pid) && (a.personType==='driver'||a.kind==='driver');
    return false;
  }).sort((a,b)=>String(a.date).localeCompare(String(b.date)));

  const eqLogs = kind==='equipment' ? (DATA.equipmentLogs||[]).filter(l=>l.equipmentId===pid && (l.date||'')>=r.from && (l.date||'')<=r.to).sort((a,b)=>String(a.date).localeCompare(String(b.date))) : [];

  const expRows = (DATA.expenses||[]).filter(e=>e.personId===pid && (!r.from||(e.date||'')>=r.from) && (!r.to||(e.date||'')<=r.to))
    .sort((a,b)=>String(b.date).localeCompare(String(a.date)));

  const payKey = kind==='employee'?'employeeId':kind==='worker'?'workerId':kind==='supervisor'?'supervisorId':kind==='driver'?'driverId':null;
  let payRows = [];
  if(kind==='worker') payRows = (DATA.workerPayments||[]).filter(p=>p.workerId===pid && (!r.from||(p.date||'')>=r.from) && (!r.to||(p.date||'')<=r.to));
  else if(kind==='driver') payRows = (DATA.driverPayments||DATA.workerPayments||[]).filter(p=>(p.driverId===pid||p.workerId===pid) && (!r.from||(p.date||'')>=r.from));
  else if(kind==='supervisor') payRows = (DATA.supervisorPayments||[]).filter(p=>p.supervisorId===pid && (!r.from||(p.date||'')>=r.from));
  else if(kind==='employee') payRows = (DATA.payroll||[]).filter(p=>p.employeeId===pid);

  const headerCard = `
    <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;background:linear-gradient(135deg,#1B4332 0%,#2d6a4f 100%);color:#F6F1E4;border-radius:16px;padding:18px 20px;margin-bottom:16px;">
      <div style="width:64px;height:64px;border-radius:16px;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:32px;">${kindMeta.icon}</div>
      <div style="flex:1;min-width:180px;">
        <div style="font-size:20px;font-weight:900;margin-bottom:4px;">${escapeHtml(name)}</div>
        <div style="opacity:.9;font-size:13px;">
          <span style="background:rgba(255,255,255,.18);padding:2px 10px;border-radius:12px;margin-left:6px;">${escapeHtml(kindMeta.label)}</span>
          ${person.code?`<span style="opacity:.95;">الكود: ${escapeHtml(person.code)}</span>`:''}
        </div>
      </div>
      <div style="text-align:left;font-size:12.5px;opacity:.9;">
        <div>الفترة</div>
        <div style="font-weight:800;font-size:14px;">${escapeHtml(r.label||'')}</div>
      </div>
    </div>`;

  const stats = `
    <div class="stats-row" style="margin-bottom:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;">
      <div class="stat-card" style="border-right:3px solid #1B4332;"><div class="num" style="font-size:18px;">${fmtMoney(due)}</div><div class="lbl">المستحق</div></div>
      <div class="stat-card" style="border-right:3px solid #40916c;"><div class="num" style="font-size:18px;">${fmtMoney(paid)}</div><div class="lbl">المدفوع</div></div>
      <div class="stat-card ${remain>0?'debt':''}" style="border-right:3px solid ${remain>0?'#c1121f':'#1B4332'};"><div class="num" style="font-size:18px;">${fmtMoney(remain)}</div><div class="lbl">المتبقي</div></div>
      <div class="stat-card" style="border-right:3px solid #d4a373;"><div class="num" style="font-size:18px;">${typeof fmtDays==='function'?fmtDays(days):days}</div><div class="lbl">أيام العمل</div></div>
      <div class="stat-card" style="border-right:3px solid #7f5539;"><div class="num" style="font-size:18px;">${fmtMoney(expTotal)}</div><div class="lbl">المصاريف</div></div>
      ${penalty?`<div class="stat-card debt" style="border-right:3px solid #c1121f;"><div class="num" style="font-size:18px;">${fmtMoney(penalty)}</div><div class="lbl">خصومات</div></div>`:''}
    </div>`;

  const infoGrid = `
    <div style="background:var(--surface,#fff);border:1px solid var(--line,#e5e0d5);border-radius:14px;padding:14px 16px;margin-bottom:16px;">
      <div style="font-weight:800;font-size:14px;margin-bottom:10px;color:#1B4332;">📋 البيانات الأساسية</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px 16px;">
        ${infoRows.map(([k,v])=>`
          <div style="padding:8px 10px;background:var(--bg,#f7f4ee);border-radius:10px;">
            <div style="font-size:11px;color:var(--ink-soft);margin-bottom:2px;">${escapeHtml(k)}</div>
            <div style="font-weight:700;font-size:13.5px;">${escapeHtml(String(v))}</div>
          </div>`).join('')}
      </div>
    </div>`;

  const section = (title, inner) => `
    <div style="background:var(--surface,#fff);border:1px solid var(--line,#e5e0d5);border-radius:14px;padding:14px 16px;margin-bottom:14px;">
      <div style="font-weight:800;font-size:14px;margin-bottom:10px;color:#1B4332;">${title}</div>
      ${inner}
    </div>`;

  let attSection = '';
  if(kind==='equipment' && eqLogs.length){
    attSection = section('🚜 يوميات المعدة ('+eqLogs.length+')', `
      <div class="table-wrap"><table class="data-table"><thead><tr><th>التاريخ</th><th>أيام</th><th>ساعات</th><th>مشروع</th><th>تكلفة</th></tr></thead>
      <tbody>${eqLogs.map(l=>`<tr>
        <td>${fd(l.date)}</td><td>${l.days||1}</td><td>${l.hours||'—'}</td>
        <td>${escapeHtml(l.project||'')}</td><td>${fmtMoney(l.cost||l.dayCost)}</td>
      </tr>`).join('')}</tbody></table></div>`);
  } else if(attRows.length){
    attSection = section('📅 اليوميات / الحضور ('+attRows.length+')', `
      <div class="table-wrap"><table class="data-table"><thead><tr><th>التاريخ</th><th>الحالة</th><th>أيام</th><th>المشروع</th><th>خصم</th></tr></thead>
      <tbody>${attRows.map(a=>`<tr>
        <td>${fd(a.date)}</td>
        <td>${escapeHtml(lab(a.status))}</td>
        <td>${typeof fmtAttendanceDays==='function'?fmtAttendanceDays(a):(a.days||1)}</td>
        <td>${escapeHtml(a.project||'')}</td>
        <td>${toInt(a.deduction)?fmtMoney(a.deduction):'—'}</td>
      </tr>`).join('')}</tbody></table></div>`);
  } else if(kind!=='employee'){
    attSection = section('📅 اليوميات / الحضور', '<p style="color:var(--ink-soft);margin:0;font-size:13px;">لا سجلات في هذه الفترة</p>');
  }

  const expSection = section('💳 المصاريف ('+expRows.length+')',
    expRows.length
      ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>التاريخ</th><th>البند</th><th>المبلغ</th><th>القسم</th><th>ملاحظات</th></tr></thead>
         <tbody>${expRows.map(e=>`<tr>
           <td>${fd(e.date)}</td><td>${escapeHtml(e.type||e.item||'')}</td>
           <td>${fmtMoney(e.amount)}</td><td>${escapeHtml(e.section||'')}</td>
           <td>${escapeHtml(e.notes||'')}</td>
         </tr>`).join('')}</tbody></table></div>
         <div style="text-align:left;margin-top:8px;font-weight:800;">الإجمالي: ${fmtMoney(expTotal)}</div>`
      : '<p style="color:var(--ink-soft);margin:0;font-size:13px;">لا مصاريف في هذه الفترة</p>'
  );

  const paySection = payRows.length ? section('💵 الدفعات ('+payRows.length+')', `
    <div class="table-wrap"><table class="data-table"><thead><tr><th>التاريخ</th><th>المبلغ</th><th>ملاحظات</th></tr></thead>
    <tbody>${payRows.slice(0,40).map(p=>`<tr>
      <td>${fd(p.date)||((p.year&&p.month)?(p.month+'/'+p.year):'—')}</td>
      <td>${fmtMoney(p.amount||p.net||p.paid)}</td>
      <td>${escapeHtml(p.notes||p.note||'')}</td>
    </tr>`).join('')}</tbody></table></div>`) : '';

  return filters + headerCard + stats + infoGrid + attSection + paySection + expSection;
}

function repDuesFull(r){
  const rows2=[];
  (DATA.workers||[]).forEach(w=>{
    const due=typeof workerDueAmount==='function'?workerDueAmount(w.id,r.from,r.to):0;
    const paid=typeof workerPaidTotal==='function'?workerPaidTotal(w.id,r.from,r.to):0;
    const bal=typeof workerBalance==='function'?workerBalance(w.id,r.from,r.to):toInt(due-paid);
    if(due||paid||bal) rows2.push({kind:'worker',kindLab:'عامل',name:w.name,due,paid,bal});
  });
  (DATA.drivers||[]).forEach(d=>{
    const due=typeof driverDueAmount==='function'?driverDueAmount(d.id,r.from,r.to):0;
    const paid=typeof driverPaidTotal==='function'?driverPaidTotal(d.id,r.from,r.to):0;
    const bal=typeof driverBalance==='function'?driverBalance(d.id,r.from,r.to):toInt(due-paid);
    if(due||paid||bal) rows2.push({kind:'driver',kindLab:'سائق',name:d.name,due,paid,bal});
  });
  (DATA.supervisors||[]).forEach(s=>{
    const due=typeof supervisorOwnDue==='function'?supervisorOwnDue(s.id,r.from,r.to):0;
    const paid=typeof supervisorPaidTotal==='function'?supervisorPaidTotal(s.id,r.from,r.to):0;
    const bal=toInt(due-paid);
    if(due||paid||bal) rows2.push({kind:'supervisor',kindLab:'مشرف',name:s.name,due,paid,bal});
  });
  (DATA.employees||[]).forEach(e=>{
    const due=toInt(e.salary||e.basicSalary||0);
    const paid=toInt((DATA.workerPayments||[]).filter(p=>p.personType==='employee'&&p.personId===e.id&&typeof isActualPayment==='function'&&isActualPayment(p)).reduce((s,p)=>s+toInt(p.amount),0));
    const bal=typeof employeeBalance==='function'?employeeBalance(e.id,r.from,r.to):toInt(due-paid);
    if(due||paid||bal) rows2.push({kind:'employee',kindLab:'موظف',name:e.name,due,paid,bal});
  });
  let filtered = rows2.filter(x=> repMatchOpQ(x.name) && repMatchOpKind(x.kind));
  const balF = ((reportsState||{}).fOpBal||'');
  if(balF==='remaining') filtered = filtered.filter(x=>toInt(x.bal)>0);
  else if(balF==='paid') filtered = filtered.filter(x=>toInt(x.paid)>0 && toInt(x.bal)<=0);
  else if(balF==='due') filtered = filtered.filter(x=>toInt(x.due)>0);
  const totalDue = filtered.reduce((s,x)=>s+x.due,0);
  const totalPaid = filtered.reduce((s,x)=>s+x.paid,0);
  const totalBal = filtered.reduce((s,x)=>s+x.bal,0);
  return `<div class="stats-row" style="margin-bottom:14px;">
    <div class="stat-card"><div class="num">${fmtMoney(totalDue)}</div><div class="lbl">إجمالي المستحق</div></div>
    <div class="stat-card"><div class="num">${fmtMoney(totalPaid)}</div><div class="lbl">إجمالي المدفوع</div></div>
    <div class="stat-card ${totalBal>0?'debt':''}"><div class="num">${fmtMoney(totalBal)}</div><div class="lbl">إجمالي المتبقي</div></div>
  </div>
  ${repOpsFilterBarHtml({ showKind:true, showBal:true })}
  <div class="table-wrap"><table class="data-table"><thead><tr><th>النوع</th><th>الاسم</th><th>مستحق</th><th>مدفوع</th><th>متبقي</th></tr></thead>
  <tbody>${filtered.length? filtered.map(x=>`<tr><td>${escapeHtml(x.kindLab)}</td><td>${escapeHtml(x.name||'')}</td><td>${fmtMoney(x.due)}</td><td>${fmtMoney(x.paid)}</td><td>${fmtMoney(x.bal)}</td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);">لا نتائج</td></tr>'}</tbody></table></div>`;
}


/** فلاتر تقارير كاملة للناس والمعدات */
function repPeopleFilterBarHtml(kind){
  const st = reportsState || {};
  const isEq = kind==='equipment';
  // خيارات ديناميكية من البيانات
  const list = isEq ? (DATA.equipment||[]) : (
    kind==='employee' ? (DATA.employees||[]) :
    kind==='worker' ? (DATA.workers||[]) :
    kind==='supervisor' ? (DATA.supervisors||[]) :
    (DATA.drivers||[])
  );
  const uniq = (arr)=> Array.from(new Set(arr.filter(Boolean))).sort((a,b)=>String(a).localeCompare(String(b),'ar'));
  const jobs = uniq(list.map(p=>p.position||p.skill||p.typeLabel||''));
  const projects = uniq(list.map(p=>p.project||''));
  const kindKey = isEq ? 'equipment' : (
    kind==='employee'||kind==='employees' ? 'employees' :
    kind==='worker'||kind==='workers' ? 'workers' :
    kind==='supervisor'||kind==='supervisors' ? 'supervisors' :
    kind==='driver'||kind==='drivers' ? 'drivers' : kind
  );
  const depts = (typeof departmentsForKind==='function'
    ? departmentsForKind(kindKey)
    : (DATA.departments||[])).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ar'));
  const grades = uniq(list.map(p=>p.licenseGrade||''));
  const ownerships = uniq(list.map(p=>p.ownership||''));
  const types = uniq(list.map(p=>p.licenseCategory||p.typeLabel||p.type||''));
  const sups = (DATA.supervisors||[]).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ar'));
  const opt = (val, cur, lab)=> `<option value="${escapeHtml(val)}" ${cur===val?'selected':''}>${escapeHtml(lab||val)}</option>`;

  return `<div class="filters-bar">
    <input type="search" id="repFQ" class="input" placeholder="بحث عام: اسم، كود، هاتف، قومي، لوحة..." value="${escapeHtml(st.fQ||'')}" style="min-width:200px;">
    <select id="repFIns" class="input" title="حالة التأمين">
      <option value="">حالة التأمين: الكل</option>
      ${opt('insured',st.fIns,'مؤمَّن')}
      ${opt('none',st.fIns,'غير مؤمن عليه')}
      ${opt('pending',st.fIns,'قيد التسجيل')}
      ${opt('empty',st.fIns,'بدون تحديد')}
    </select>
    <select id="repFLic" class="input" title="حالة الرخصة">
      <option value="">الرخصة: الكل</option>
      ${opt('valid',st.fLic,'سارية')}
      ${opt('expired',st.fLic,'منتهية')}
      ${opt('soon',st.fLic,'قاربت على الانتهاء')}
      ${opt('none',st.fLic,'بدون تاريخ رخصة')}
    </select>
    ${!isEq?`<select id="repFCard" class="input" title="حالة البطاقة">
      <option value="">البطاقة: الكل</option>
      ${opt('valid',st.fCard,'سارية')}
      ${opt('expired',st.fCard,'منتهية')}
      ${opt('soon',st.fCard,'قاربت على الانتهاء')}
      ${opt('none',st.fCard,'بدون تاريخ بطاقة')}
    </select>`:''}
    <select id="repFStatus" class="input">
      <option value="">الحالة: الكل</option>
      ${opt('active',st.fStatus,'نشط')}
      ${opt('inactive',st.fStatus,'غير نشط')}
      ${opt('resigned',st.fStatus,'مستقيل / غادر')}
    </select>
    <select id="repFDept" class="input">
      <option value="">القسم: الكل</option>
      ${depts.map(d=>opt(d.id, st.fDept, d.name)).join('')}
      ${opt('__none__', st.fDept, 'بدون قسم')}
    </select>
    ${!isEq?`<select id="repFJob" class="input">
      <option value="">الوظيفة: الكل</option>
      ${jobs.map(j=>opt(j, st.fJob, j)).join('')}
    </select>`:''}
    ${!isEq?`<select id="repFContract" class="input">
      <option value="">نوع العقد: الكل</option>
      ${(typeof CONTRACT_TYPE_OPTS!=='undefined'?CONTRACT_TYPE_OPTS:[]).map(o=>opt(o.code||o.id||o.value, st.fContract, o.label||o.name||o.code)).join('')}
    </select>
    <select id="repFContractSt" class="input">
      <option value="">حالة العقد: الكل</option>
      ${(typeof CONTRACT_STATUS_OPTS!=='undefined'?CONTRACT_STATUS_OPTS:[{code:'active',label:'ساري'},{code:'expired',label:'منتهي'}]).map(o=>opt(o.code||o.id, st.fContractSt, o.label||o.name||o.code)).join('')}
    </select>`:''}
    ${(kind==='worker'||kind==='driver'||kind==='supervisor')?`<select id="repFProject" class="input">
      <option value="">المشروع: الكل</option>
      ${projects.map(pr=>opt(pr, st.fProject, pr)).join('')}
      ${opt('__none__', st.fProject, 'بدون مشروع')}
    </select>`:''}
    ${kind==='worker'?`<select id="repFSup" class="input">
      <option value="">المشرف: الكل</option>
      ${sups.map(s=>opt(s.id, st.fSup, s.name)).join('')}
      ${opt('__none__', st.fSup, 'بدون مشرف')}
    </select>`:''}
    ${kind==='driver'?`<select id="repFGrade" class="input">
      <option value="">درجة الرخصة: الكل</option>
      ${grades.map(g=>opt(g, st.fGrade, g)).join('')}
      ${opt('__none__', st.fGrade, 'بدون درجة')}
    </select>`:''}
    ${isEq?`<select id="repFOwnership" class="input">
      <option value="">الملكية: الكل</option>
      ${ownerships.map(o=>opt(o, st.fOwnership, (typeof arabicLabelForCode==='function'?arabicLabelForCode(o):o)||o)).join('')}
    </select>
    <select id="repFType" class="input">
      <option value="">النوع / الترخيص: الكل</option>
      ${types.map(tp=>opt(tp, st.fType, tp)).join('')}
    </select>
    <input type="search" id="repFPlate" class="input" placeholder="رقم اللوحة..." value="${escapeHtml(st.fPlate||'')}" style="min-width:120px;">
    `:''}
    <button type="button" class="btn btn-outline btn-sm" id="repFClear">مسح الفلاتر</button>
  </div>`;
}


function repNormalizeIns(v){
  v = String(v||'').toLowerCase().trim();
  if(!v) return 'empty';
  if(v==='none'||v==='uninsured'||v.indexOf('غير')>=0) return 'none';
  if(v==='pending'||v.indexOf('قيد')>=0) return 'pending';
  if(v==='insured'||v.indexOf('مؤم')>=0) return 'insured';
  return v;
}
function repLicStatus(p, isEq){
  if(isEq){
    const exp = p.vehicleLicenseExpiry || p.licenseExpiry || '';
    if(!exp) return 'none';
    return typeof expiryState==='function' ? expiryState(exp) : (typeof statusFromExpiry==='function' ? statusFromExpiry(exp) : 'valid');
  }
  if(!p.licenseExpiry) return 'none';
  return typeof expiryState==='function' ? expiryState(p.licenseExpiry) : (typeof statusFromExpiry==='function' ? statusFromExpiry(p.licenseExpiry) : 'valid');
}
function repCardStatus(p){
  if(!p.idCardExpiry) return 'none';
  return typeof expiryState==='function' ? expiryState(p.idCardExpiry) : (typeof statusFromExpiry==='function' ? statusFromExpiry(p.idCardExpiry) : 'valid');
}
function repFilterPeopleList(kind, list){
  const st = reportsState || {};
  const isEq = kind==='equipment';
  let out = (list||[]).slice();
  const q = (st.fQ||'').trim().toLowerCase();
  if(q){
    out = typeof smartSearchList==='function' ? smartSearchList(out, q) : out.filter(p=>{
      const blob = [p.name,p.code,p.phone,p.nationalId,p.vehicleNumber,p.plate,p.insuranceNumber,
        p.licenseGrade,p.position,p.skill,p.typeLabel,p.model,p.chassisNumber,p.motorNumber,p.address,p.project]
        .map(x=>String(x||'').toLowerCase()).join(' ');
      return blob.indexOf(q)>=0;
    });
  }
  if(st.fIns){
    out = out.filter(p=> repNormalizeIns(p.insuranceStatus) === st.fIns);
  }
  if(st.fLic){
    out = out.filter(p=> repLicStatus(p, isEq) === st.fLic);
  }
  if(st.fCard && !isEq){
    out = out.filter(p=> repCardStatus(p) === st.fCard);
  }
  if(st.fStatus){
    if(st.fStatus==='resigned'){
      out = out.filter(p=>{
        const s = String(p.status||'');
        return s==='resigned'||s==='left'||s==='terminated'||(typeof isResignedStatus==='function'&&isResignedStatus(s));
      });
    } else {
      out = out.filter(p=> String(p.status||'active') === st.fStatus);
    }
  }
  if(st.fDept){
    if(st.fDept==='__none__'){
      out = out.filter(p=> !(p.departmentId||p.categoryId));
    } else {
      out = out.filter(p=> String(p.departmentId||p.categoryId||'') === String(st.fDept));
    }
  }
  if(st.fJob && !isEq){
    out = out.filter(p=> String(p.position||p.skill||'') === String(st.fJob));
  }
  if(st.fContract && !isEq){
    out = out.filter(p=> String(p.contractType||'') === String(st.fContract));
  }
  if(st.fContractSt && !isEq){
    out = out.filter(p=> String(p.contractStatus||'') === String(st.fContractSt));
  }
  if(st.fProject){
    if(st.fProject==='__none__') out = out.filter(p=> !(p.project||'').toString().trim());
    else out = out.filter(p=> String(p.project||'') === String(st.fProject));
  }
  if(st.fSup && kind==='worker'){
    if(st.fSup==='__none__') out = out.filter(p=> !p.supervisorId);
    else out = out.filter(p=> String(p.supervisorId||'') === String(st.fSup));
  }
  if(st.fGrade && kind==='driver'){
    if(st.fGrade==='__none__') out = out.filter(p=> !(p.licenseGrade||'').toString().trim());
    else out = out.filter(p=> String(p.licenseGrade||'') === String(st.fGrade));
  }
  if(isEq && st.fOwnership){
    out = out.filter(p=> String(p.ownership||'') === String(st.fOwnership));
  }
  if(isEq && st.fType){
    out = out.filter(p=> String(p.licenseCategory||p.typeLabel||p.type||'') === String(st.fType));
  }
  if(isEq && st.fPlate){
    const pl = String(st.fPlate).toLowerCase().trim();
    out = out.filter(p=> String(p.vehicleNumber||p.plate||'').toLowerCase().indexOf(pl)>=0);
  }
  if(!q && typeof sortByNameAr==='function') out = sortByNameAr(out, x=>x.name||x.typeLabel||'');
  return out;
}


function repStatusLabel(p){
  const s = p.status||'';
  if(typeof arabicLabelForCode==='function') return arabicLabelForCode(s) || s || '—';
  if(s==='active') return 'نشط';
  if(s==='inactive') return 'غير نشط';
  if(s==='resigned') return 'مستقيل';
  if(s==='left') return 'غادر';
  return s||'—';
}
function repInsLabel(p){
  const n = repNormalizeIns(p.insuranceStatus);
  if(n==='insured') return 'مؤمَّن';
  if(n==='none') return 'غير مؤمن عليه';
  if(n==='pending') return 'قيد التسجيل';
  return '—';
}
function repLicLabel(p, isEq){
  const st = repLicStatus(p, isEq);
  if(st==='none') return 'بدون';
  if(st==='expired') return 'منتهية';
  if(st==='soon') return 'قاربت';
  if(st==='valid'||st==='sarya') return 'سارية';
  return st||'—';
}
function repCardLabel(p){
  const st = repCardStatus(p);
  if(st==='none') return 'بدون';
  if(st==='expired') return 'منتهية';
  if(st==='soon') return 'قاربت';
  if(st==='valid'||st==='sarya') return 'سارية';
  return st||'—';
}

function repPeopleFullTable(kind, list){
  const isEq = kind==='equipment';
  const filtered = repFilterPeopleList(kind, list);
  const insuredN = filtered.filter(p=>repNormalizeIns(p.insuranceStatus)==='insured').length;
  const uninsN = filtered.filter(p=>repNormalizeIns(p.insuranceStatus)==='none').length;
  const licOk = filtered.filter(p=>['valid','sarya','soon'].includes(repLicStatus(p,isEq))).length;
  const licExp = filtered.filter(p=>repLicStatus(p,isEq)==='expired').length;
  const licNone = filtered.filter(p=>repLicStatus(p,isEq)==='none').length;

  const stats = `<div class="stats-row" style="margin-bottom:12px;">
    <div class="stat-card"><div class="num">${filtered.length}</div><div class="lbl">المعروض</div></div>
    <div class="stat-card"><div class="num">${insuredN}</div><div class="lbl">مؤمَّن</div></div>
    <div class="stat-card ${uninsN?'debt':''}"><div class="num">${uninsN}</div><div class="lbl">غير مؤمن</div></div>
    <div class="stat-card"><div class="num">${licOk}</div><div class="lbl">رخصة سارية</div></div>
    <div class="stat-card ${licExp?'debt':''}"><div class="num">${licExp}</div><div class="lbl">رخصة منتهية</div></div>
    <div class="stat-card"><div class="num">${licNone}</div><div class="lbl">بدون رخصة</div></div>
  </div>`;

  let thead, body;
  if(isEq){
    thead = `<tr>
      <th>الكود</th><th>نوع السيارة</th><th>رقم اللوحة</th><th>اللون</th><th>رقم الماتور</th><th>رقم الشاسيه</th>
      <th>الرقم التأميني</th><th>حالة التأمين</th><th>الموديل</th>
      <th>انتهاء رخصة المركبة</th><th>حالة الرخصة</th><th>نوع الترخيص</th>
      <th>اسم السائق</th><th>انتهاء رخصة السائق</th>
      <th>القسم</th><th>الحالة</th><th>الملكية</th><th>المشروع</th>
    </tr>`;
    body = filtered.map(eq=>{
      const vExp = eq.vehicleLicenseExpiry || eq.licenseExpiry || '';
      return `<tr>
        <td>${escapeHtml(eq.code||'')}</td>
        <td><strong>${escapeHtml(eq.typeLabel||eq.name||'')}</strong></td>
        <td>${escapeHtml(eq.vehicleNumber||eq.plate||'—')}</td>
        <td>${escapeHtml(eq.color||'—')}</td>
        <td>${escapeHtml(eq.motorNumber||eq.serial||'—')}</td>
        <td>${escapeHtml(eq.chassisNumber||'—')}</td>
        <td>${escapeHtml(eq.insuranceNumber||'—')}</td>
        <td>${escapeHtml(repInsLabel(eq))}</td>
        <td>${escapeHtml(eq.model||'—')}</td>
        <td>${fmtDate(vExp)}</td>
        <td>${escapeHtml(repLicLabel(eq, true))}</td>
        <td>${escapeHtml(eq.licenseCategory||'—')}</td>
        <td>${escapeHtml(eq.driverName||'—')}</td>
        <td>${fmtDate(eq.driverLicenseExpiry)}</td>
        <td>${escapeHtml(typeof departmentName==='function'?departmentName(eq.departmentId||eq.categoryId):'')}</td>
        <td>${escapeHtml(repStatusLabel(eq))}</td>
        <td>${escapeHtml((typeof arabicLabelForCode==='function'?arabicLabelForCode(eq.ownership):eq.ownership)||'—')}</td>
        <td>${escapeHtml(eq.project||'—')}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="18" style="text-align:center;padding:20px;color:var(--ink-soft);">لا نتائج</td></tr>';
  } else {
    const showWage = kind!=='employee';
    const showGrade = kind==='driver';
    const showProject = kind==='worker' || kind==='driver';
    const showSup = kind==='worker';
    thead = `<tr>
      <th>الكود</th><th>الاسم</th><th>الوظيفة</th><th>الرقم القومي</th>
      <th>انتهاء البطاقة</th><th>حالة البطاقة</th>
      <th>انتهاء الرخصة</th><th>حالة الرخصة</th>
      ${showGrade?'<th>درجة الرخصة</th>':''}
      <th>تاريخ التعيين</th><th>نوع العقد</th><th>حالة العقد</th>
      <th>${showWage?'اليومية':'الراتب'}</th>
      <th>حالة التأمين</th><th>الرقم التأميني</th>
      <th>رقم التليفون</th><th>العنوان</th>
      ${showProject?'<th>المشروع</th>':''}
      ${showSup?'<th>المشرف</th>':''}
      <th>القسم</th><th>الحالة</th>
    </tr>`;
    body = filtered.map(p=>{
      const wage = kind==='employee' ? toInt(p.salary||p.basicSalary) : toInt(p.dailyWage);
      return `<tr>
        <td>${escapeHtml(p.code||'')}</td>
        <td><strong>${escapeHtml(p.name||'')}</strong></td>
        <td>${escapeHtml(p.position||p.skill||(kind==='driver'?'سائق':''))}</td>
        <td>${escapeHtml(p.nationalId||'—')}</td>
        <td>${fmtDate(p.idCardExpiry)}</td>
        <td>${escapeHtml(repCardLabel(p))}</td>
        <td>${fmtDate(p.licenseExpiry)}</td>
        <td>${escapeHtml(repLicLabel(p, false))}</td>
        ${showGrade?`<td>${escapeHtml(p.licenseGrade||'—')}</td>`:''}
        <td>${fmtDate(p.hireDate)}</td>
        <td>${escapeHtml((typeof labelOf==='function'?labelOf(typeof CONTRACT_TYPE_OPTS!=='undefined'?CONTRACT_TYPE_OPTS:[], p.contractType):p.contractType)||'—')}</td>
        <td>${escapeHtml((typeof arabicLabelForCode==='function'?arabicLabelForCode(p.contractStatus):p.contractStatus)||'—')}</td>
        <td>${fmtMoney(wage)}</td>
        <td>${escapeHtml(repInsLabel(p))}</td>
        <td>${escapeHtml(p.insuranceNumber||'—')}</td>
        <td>${escapeHtml(p.phone||'—')}</td>
        <td>${escapeHtml(p.address||'—')}</td>
        ${showProject?`<td>${escapeHtml(p.project||'—')}</td>`:''}
        ${showSup?`<td>${escapeHtml(typeof supervisorName==='function'?supervisorName(p.supervisorId):'—')}</td>`:''}
        <td>${escapeHtml(typeof departmentName==='function'?departmentName(p.departmentId||p.categoryId):'')}</td>
        <td>${escapeHtml(repStatusLabel(p))}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="20" style="text-align:center;padding:20px;color:var(--ink-soft);">لا نتائج</td></tr>';
  }

  return stats + repPeopleFilterBarHtml(kind)
    + `<div class="table-wrap"><table class="data-table"><thead>${thead}</thead><tbody>${body}</tbody></table></div>`;
}



/** شريط فلاتر لتقارير العمليات (مستحقات / مصاريف / إجازات / تقييم / حركة / خصومات) */
function repOpsFilterBarHtml(opts){
  opts = opts || {};
  const st = reportsState || {};
  const showKind = opts.showKind !== false;
  const showType = !!opts.showType;
  const showProject = !!opts.showProject;
  const showStatus = !!opts.showStatus;
  const showBal = !!opts.showBal;
  const typeOpts = opts.typeOpts || [];
  const statusOpts = opts.statusOpts || [];
  const projects = Array.from(new Set((opts.projects||[]).filter(Boolean))).sort((a,b)=>String(a).localeCompare(String(b),'ar'));
  const opt = (val, cur, lab)=> `<option value="${escapeHtml(val)}" ${cur===val?'selected':''}>${escapeHtml(lab||val)}</option>`;
  const kinds = [
    ['employee','موظفين'],['supervisor','مشرفين'],['worker','عمال'],
    ['driver','سائقين'],['equipment','معدات ومركبات']
  ];
  return `<div class="filters-bar">
    <input type="search" id="repFOpQ" class="input" placeholder="بحث بالاسم..." value="${escapeHtml(st.fOpQ||'')}" style="min-width:160px;">
    ${showKind?`<select id="repFOpKind" class="input">
      <option value="">النوع: الكل</option>
      ${kinds.map(([k,l])=>opt(k, st.fOpKind, l)).join('')}
    </select>`:''}
    ${showType?`<select id="repFOpType" class="input">
      <option value="">البند / النوع: الكل</option>
      ${typeOpts.map(x=>opt(x, st.fOpType, x)).join('')}
    </select>`:''}
    ${showProject?`<select id="repFOpProject" class="input">
      <option value="">المشروع: الكل</option>
      ${projects.map(pr=>opt(pr, st.fOpProject, pr)).join('')}
    </select>`:''}
    ${showStatus?`<select id="repFOpStatus" class="input">
      <option value="">الحالة: الكل</option>
      ${statusOpts.map(x=>{
        const v = typeof x==='object' ? (x.code||x.value||'') : x;
        const l = typeof x==='object' ? (x.label||x.name||v) : x;
        return opt(v, st.fOpStatus, l);
      }).join('')}
    </select>`:''}
    ${showBal?`<select id="repFOpBal" class="input">
      <option value="">الرصيد: الكل</option>
      ${opt('remaining', st.fOpBal, 'عليه متبقي')}
      ${opt('paid', st.fOpBal, 'تم الدفع')}
      ${opt('due', st.fOpBal, 'له مستحق')}
    </select>`:''}
    <button type="button" class="btn btn-outline btn-sm" id="repFOpClear">مسح الفلاتر</button>
  </div>`;
}
function repMatchOpQ(name){
  const q = ((reportsState||{}).fOpQ||'').trim().toLowerCase();
  if(!q) return true;
  return String(name||'').toLowerCase().indexOf(q)>=0;
}
function repMatchOpKind(kind){
  const f = ((reportsState||{}).fOpKind||'').trim();
  if(!f) return true;
  return String(kind||'') === f;
}




/** نظرة عامة + تقرير شهري — دقة عالية واحترافية */
function buildMonthlyOverviewStats(r){
  try{
  const isR = (p)=> p && (typeof isResignedStatus==='function' ? isResignedStatus(p.status) : (p.status==='resigned'||p.status==='left'||p.status==='terminated'));
  const activeOf = (arr)=> (arr||[]).filter(p=>!isR(p)).length;
  const inRange = (d)=>{
    if(!d) return false;
    if(r.from && d < r.from) return false;
    if(r.to && d > r.to) return false;
    return true;
  };
  const from = r.from || '', to = r.to || '';

  // —— مصاريف (كل المصادر بدون تكرار id) ——
  const expSeen = new Set();
  const expByKind = { employee:0, supervisor:0, worker:0, driver:0, equipment:0, other:0 };
  let expTotal = 0, expN = 0;
  const addExp = (e)=>{
    if(!e) return;
    const id = e.id || (e.date+'|'+e.amount+'|'+(e.personId||'')+'|'+(e.type||e.item||''));
    if(expSeen.has(id)) return;
    if(!inRange(e.date)) return;
    expSeen.add(id);
    const a = toInt(e.amount);
    if(a <= 0) return;
    expTotal += a; expN++;
    let k = e.personKind || e.kind || '';
    if(!k && e.equipmentId) k = 'equipment';
    if(!k) k = 'other';
    if(expByKind[k] === undefined) k = 'other';
    expByKind[k] += a;
  };
  (DATA.expenses||[]).forEach(addExp);
  (DATA.supervisorExpenses||[]).forEach(addExp);
  (DATA.licenseExpenses||[]).forEach(addExp);

  // —— إجازات ——
  let leavesN = 0, leavesDays = 0, leavesPending = 0, leavesApproved = 0, leavesRejected = 0;
  (DATA.leaves||[]).forEach(l=>{
    if(from && (l.to||l.from||'') < from) return;
    if(to && (l.from||'') > to) return;
    leavesN++;
    leavesDays += toInt(l.days) || 0;
    if(l.status==='pending') leavesPending++;
    else if(l.status==='approved') leavesApproved++;
    else if(l.status==='rejected') leavesRejected++;
  });

  // —— مستحقات دقيقة بنفس منطق صفحة المستحقات ——
  const dueBy = { worker:0, driver:0, supervisor:0, employee:0, equipment:0 };
  const paidBy = { worker:0, driver:0, supervisor:0, employee:0, equipment:0 };
  const penBy = { worker:0, driver:0, supervisor:0, employee:0, equipment:0 };
  const expPersonBy = { worker:0, driver:0, supervisor:0, employee:0, equipment:0 };
  const extrasBy = { worker:0, driver:0, supervisor:0, employee:0, equipment:0 };
  let workDaysW = 0, workDaysD = 0, workDaysS = 0;

  
  // حماية من دوال قد تكون غير معرّفة
  const _fn = (name)=>{
    try{
      if(typeof window!=='undefined' && typeof window[name]==='function') return window[name];
      if(typeof globalThis!=='undefined' && typeof globalThis[name]==='function') return globalThis[name];
    }catch(_e){}
    return null;
  };
  const safeCall = (name, ...args)=>{
    const fn = _fn(name);
    if(!fn) return 0;
    try{ return fn(...args); }catch(_e){ return 0; }
  };

  (DATA.workers||[]).forEach(w=>{
    if(!w || !w.id) return;
    const base = toInt(safeCall('workerDueAmount', w.id, from, to));
    const extras = toInt(safeCall('personExtrasTotal', 'worker', w.id, from, to));
    const paid = toInt(safeCall('workerPaidTotal', w.id, from, to));
    const pen = toInt(safeCall('workerPenaltyTotal', w.id, from, to));
    const exp = toInt(safeCall('personExpensesTotal', 'worker', w.id, from, to));
    dueBy.worker += base + extras;
    extrasBy.worker += extras;
    paidBy.worker += paid;
    penBy.worker += pen;
    expPersonBy.worker += exp;
    try{
      const sum = typeof workerWageSummary==='function' ? workerWageSummary(w.id, from, to) : null;
      if(sum) workDaysW += Number(sum.workDays)||0;
    }catch(_e){}
  });

  (DATA.drivers||[]).forEach(d0=>{
    if(!d0 || !d0.id) return;
    const base = toInt(
      safeCall('driverDueAmount', d0.id, from, to) ||
      safeCall('workerDueAmount', d0.id, from, to)
    );
    const extras = toInt(safeCall('personExtrasTotal', 'driver', d0.id, from, to));
    const paid = toInt(safeCall('driverPaidTotal', d0.id, from, to) || safeCall('workerPaidTotal', d0.id, from, to));
    const pen = toInt(safeCall('driverPenaltyTotal', d0.id, from, to) || safeCall('workerPenaltyTotal', d0.id, from, to));
    const exp = toInt(safeCall('personExpensesTotal', 'driver', d0.id, from, to));
    dueBy.driver += base + extras;
    extrasBy.driver += extras;
    paidBy.driver += paid;
    penBy.driver += pen;
    expPersonBy.driver += exp;
  });

  (DATA.supervisors||[]).forEach(s=>{
    if(!s || !s.id) return;
    const base = toInt(safeCall('supervisorOwnDue', s.id, from, to));
    const extras = toInt(safeCall('personExtrasTotal', 'supervisor', s.id, from, to));
    const paid = toInt(safeCall('supervisorPaidTotal', s.id, from, to));
    const pen = toInt(safeCall('workerPenaltyTotal', s.id, from, to)); // إن وُجدت بنفس القائمة
    const exp = toInt(safeCall('personExpensesTotal', 'supervisor', s.id, from, to));
    dueBy.supervisor += base + extras;
    extrasBy.supervisor += extras;
    paidBy.supervisor += paid;
    penBy.supervisor += pen;
    expPersonBy.supervisor += exp;
  });

  (DATA.employees||[]).forEach(e=>{
    if(!e || !e.id) return;
    // نفس منطق renderDuesEmployees تقريباً
    let base = 0;
    try{
      const payrolls = (DATA.payroll||[]).filter(p=>{
        if(p.employeeId !== e.id) return false;
        if(from || to){
          if(p.year!=null && p.month!=null){
            const ym = String(p.year)+'-'+String(p.month).padStart(2,'0');
            const fym = from ? from.slice(0,7) : '';
            const tym = to ? to.slice(0,7) : '';
            if(fym && ym < fym) return false;
            if(tym && ym > tym) return false;
          } else if(p.date){
            if(from && p.date < from) return false;
            if(to && p.date > to) return false;
          }
        }
        return true;
      });
      if(payrolls.length){
        base = toInt(payrolls.reduce((s,p)=>s+toInt(p.netSalary||p.net||p.gross||p.paid||0),0));
      } else {
        base = toInt(e.salary || e.basicSalary || 0);
      }
    }catch(_e){ base = toInt(e.salary||0); }
    const extras = toInt(safeCall('personExtrasTotal', 'employee', e.id, from, to));
    const paid = toInt(safeCall('employeePaidTotal', e.id, from, to) || safeCall('workerPaidTotal', e.id, from, to));
    const pen = toInt(safeCall('employeePenaltyTotal', e.id, from, to));
    const exp = toInt(safeCall('personExpensesTotal', 'employee', e.id, from, to));
    dueBy.employee += base + extras;
    extrasBy.employee += extras;
    paidBy.employee += paid;
    penBy.employee += pen;
    expPersonBy.employee += exp;
  });

  // معدات — تكلفة يوميات
  let eqDailyN = 0, eqDailyCost = 0, eqHours = 0;
  (DATA.equipmentDaily||[]).forEach(d=>{
    if(!inRange(d.date)) return;
    eqDailyN++;
    eqDailyCost += toInt(d.cost||d.dayCost||d.totalCost||0);
    eqHours += Number(d.hours)||0;
    // لو التكلفة صفر نحسب من hourlyCost
    if(!toInt(d.cost||d.dayCost||d.totalCost) && d.equipmentId){
      const eq = (DATA.equipment||[]).find(x=>x.id===d.equipmentId);
      if(eq){
        const hc = toInt(eq.hourlyCost||eq.hourCost||0);
        const dayC = toInt(eq.dailyCost||eq.dayRate||0);
        const days = Number(d.days)||1;
        if(hc && d.hours) eqDailyCost += toInt(hc * Number(d.hours));
        else if(dayC) eqDailyCost += toInt(dayC * days);
      }
    }
  });
  dueBy.equipment = toInt(eqDailyCost);
  // مدفوعات معدات إن وُجدت
  (DATA.workerPayments||[]).forEach(p=>{
    if((p.personType||p.personKind)!=='equipment') return;
    if(from && (p.date||'')<from) return;
    if(to && (p.date||'')>to) return;
    if(typeof isActualPayment==='function' ? isActualPayment(p) : (p.type==='pay'||!p.type))
      paidBy.equipment += toInt(p.amount);
    if(p.type==='penalty'||p.type==='deduction') penBy.equipment += toInt(p.amount);
  });

  const duesDue = toInt(dueBy.worker+dueBy.driver+dueBy.supervisor+dueBy.employee+dueBy.equipment);
  const duesPaid = toInt(paidBy.worker+paidBy.driver+paidBy.supervisor+paidBy.employee+paidBy.equipment);
  const duesPen = toInt(penBy.worker+penBy.driver+penBy.supervisor+penBy.employee+penBy.equipment);
  const duesExp = toInt(expPersonBy.worker+expPersonBy.driver+expPersonBy.supervisor+expPersonBy.employee);
  const duesRemain = toInt(duesDue - duesPaid - duesPen - duesExp);
  const extrasTotal = toInt(extrasBy.worker+extrasBy.driver+extrasBy.supervisor+extrasBy.employee);

  // حضور ويوميات
  let attN = 0, attPresent = 0, attAbsent = 0;
  (DATA.attendance||[]).forEach(a=>{
    if(!inRange(a.date)) return;
    attN++;
    const st = String(a.status||'').toLowerCase();
    if(st==='absent'||st==='غائب') attAbsent++;
    else attPresent++;
  });
  let dailyN = 0;
  const dailyByKind = { worker:0, driver:0, supervisor:0 };
  let dailyDays = 0;
  (DATA.workerAttendance||[]).forEach(a=>{
    if(!inRange(a.date)) return;
    dailyN++;
    const k = a.personType || a.kind || 'worker';
    if(dailyByKind[k]!==undefined) dailyByKind[k]++; else dailyByKind.worker++;
    dailyDays += Number(a.days)||1;
  });

  const adv = typeof getOutstandingAdvances==='function' ? getOutstandingAdvances() : [];
  const advRem = toInt(adv.reduce((s,x)=>s+toInt(x.remaining),0));

  const projectsActive = (DATA.projects||[]).filter(p=>{
    const st = String(p.status||'').toLowerCase();
    return !st || st==='active' || st.includes('جاري') || st.includes('نشط');
  }).length;

  let eqWorking = 0, eqMaint = 0, eqRented = 0;
  (DATA.equipment||[]).forEach(eq=>{
    const st = String(eq.status||'');
    if(/صيانة|عطل|stopped|repair|broken|متوقف/i.test(st)) eqMaint++;
    else if(/مستأجر|rent|مؤجر/i.test(st) || eq.ownership==='rent') eqRented++;
    else eqWorking++;
  });

  // صافي التدفق التقريبي للفترة: مدفوعات + مصاريف عامة
  const cashOut = toInt(duesPaid + expTotal);

  return {
    employees: (DATA.employees||[]).length,
    employeesActive: activeOf(DATA.employees),
    supervisors: (DATA.supervisors||[]).length,
    supervisorsActive: activeOf(DATA.supervisors),
    workers: (DATA.workers||[]).length,
    workersActive: activeOf(DATA.workers),
    drivers: (DATA.drivers||[]).length,
    driversActive: activeOf(DATA.drivers),
    equipment: (DATA.equipment||[]).length,
    eqWorking, eqMaint, eqRented,
    projects: (DATA.projects||[]).length,
    projectsActive,
    departments: (DATA.departments||[]).length,
    resigned: (DATA.employees||[]).filter(isR).length + (DATA.workers||[]).filter(isR).length
      + (DATA.supervisors||[]).filter(isR).length + (DATA.drivers||[]).filter(isR).length,
    expTotal: toInt(expTotal), expN, expByKind,
    leavesN, leavesDays, leavesPending, leavesApproved, leavesRejected,
    duesDue, duesPaid, duesPen, duesExp, duesRemain, extrasTotal,
    dueBy, paidBy, penBy, expPersonBy, extrasBy,
    attN, attPresent, attAbsent,
    dailyN, dailyByKind, dailyDays,
    eqDailyN, eqDailyCost: toInt(eqDailyCost), eqHours: Math.round(eqHours*10)/10,
    workDaysW: Math.round(workDaysW*10)/10,
    advCount: adv.length, advRem, advList: adv,
    workforceTotal: activeOf(DATA.employees)+activeOf(DATA.supervisors)+activeOf(DATA.workers)+activeOf(DATA.drivers),
    cashOut,
    generatedAt: new Date().toISOString()
  };
  }catch(err){
    console.error('buildMonthlyOverviewStats', err);
    return {
      employees:0,employeesActive:0,supervisors:0,supervisorsActive:0,workers:0,workersActive:0,drivers:0,driversActive:0,
      equipment:0,eqWorking:0,eqMaint:0,eqRented:0,projects:0,projectsActive:0,departments:0,resigned:0,
      expTotal:0,expN:0,expByKind:{employee:0,supervisor:0,worker:0,driver:0,equipment:0,other:0},
      leavesN:0,leavesDays:0,leavesPending:0,leavesApproved:0,leavesRejected:0,
      duesDue:0,duesPaid:0,duesPen:0,duesExp:0,duesRemain:0,extrasTotal:0,
      dueBy:{worker:0,driver:0,supervisor:0,employee:0,equipment:0},
      paidBy:{worker:0,driver:0,supervisor:0,employee:0,equipment:0},
      penBy:{worker:0,driver:0,supervisor:0,employee:0,equipment:0},
      expPersonBy:{worker:0,driver:0,supervisor:0,employee:0,equipment:0},
      extrasBy:{worker:0,driver:0,supervisor:0,employee:0,equipment:0},
      attN:0,attPresent:0,attAbsent:0,dailyN:0,dailyByKind:{worker:0,driver:0,supervisor:0},dailyDays:0,
      eqDailyN:0,eqDailyCost:0,eqHours:0,workDaysW:0,advCount:0,advRem:0,advList:[],workforceTotal:0,cashOut:0,
      generatedAt:new Date().toISOString()
    };
  }

}

function renderReportsOverview(r){
  const s = buildMonthlyOverviewStats(r);
  const printId = 'monthlyOverviewPrint';
  const head = typeof statementHeaderHtml==='function'
    ? statementHeaderHtml('التقرير الشهري الشامل', 'الفترة: '+(r.label||''))
    : '';
  const foot = typeof statementFooterHtml==='function' ? statementFooterHtml() : '';
  const pct = (a,b)=> (b && b!==0) ? Math.round((Number(a)/Number(b))*100) : 0;
  const paidPct = pct(s.duesPaid, s.duesDue);
  const kindLab = {employee:'الموظفين',supervisor:'المشرفون',worker:'العمال',driver:'السائقون',equipment:'معدات ومركبات',other:'أخرى'};
  const genTime = (()=>{
    try{
      const d = new Date(s.generatedAt||Date.now());
      return (typeof fmtDate==='function'?fmtDate(d.toISOString().slice(0,10)):d.toLocaleDateString('ar-EG'))
        + ' — ' + d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});
    }catch(_e){ return ''; }
  })();

  const rowKind = (k)=>{
    const due = toInt(s.dueBy[k]), paid = toInt(s.paidBy[k]), pen = toInt(s.penBy[k]||0);
    const exp = toInt(s.expPersonBy[k]||0), extras = toInt(s.extrasBy[k]||0);
    const rem = toInt(due - paid - pen - exp);
    return { due, paid, pen, exp, extras, rem };
  };

  return `
  <div class="monthly-report-screen">
    <div class="btn-row" style="margin-bottom:14px;flex-wrap:wrap;gap:8px;align-items:center;">
      <button type="button" class="btn btn-primary" id="btnPrintMonthlyOverview">🖨️ طباعة التقرير الشهري</button>
      <span style="background:#1B4332;color:#F6F1E4;padding:6px 14px;border-radius:8px;font-weight:800;font-size:13px;">${escapeHtml(r.label||'')}</span>
      <span style="font-size:12px;color:var(--ink-soft);">توليد: ${escapeHtml(genTime)}</span>
    </div>

    <!-- شريط مؤشرات رئيسية -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:18px;">
      <div style="background:linear-gradient(135deg,#1B4332,#2d6a4f);color:#F6F1E4;border-radius:12px;padding:14px 12px;text-align:center;">
        <div style="font-size:11px;opacity:.85;">القوى العاملة</div>
        <div style="font-size:22px;font-weight:900;margin-top:4px;">${s.workforceTotal}</div>
      </div>
      <div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px 12px;text-align:center;">
        <div style="font-size:11px;color:var(--ink-soft);">المستحق</div>
        <div style="font-size:18px;font-weight:900;color:#1B4332;margin-top:4px;">${fmtMoney(s.duesDue)}</div>
      </div>
      <div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px 12px;text-align:center;">
        <div style="font-size:11px;color:var(--ink-soft);">المدفوع (${paidPct}%)</div>
        <div style="font-size:18px;font-weight:900;color:#166534;margin-top:4px;">${fmtMoney(s.duesPaid)}</div>
      </div>
      <div style="background:#fff;border:1px solid #fecaca;border-radius:12px;padding:14px 12px;text-align:center;">
        <div style="font-size:11px;color:#991b1b;">المتبقي</div>
        <div style="font-size:18px;font-weight:900;color:#b91c1c;margin-top:4px;">${fmtMoney(s.duesRemain)}</div>
      </div>
      <div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px 12px;text-align:center;">
        <div style="font-size:11px;color:var(--ink-soft);">المصاريف</div>
        <div style="font-size:18px;font-weight:900;margin-top:4px;">${fmtMoney(s.expTotal)}</div>
      </div>
      <div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px 12px;text-align:center;">
        <div style="font-size:11px;color:var(--ink-soft);">إجمالي الصرف</div>
        <div style="font-size:18px;font-weight:900;color:#1B4332;margin-top:4px;">${fmtMoney(s.cashOut)}</div>
      </div>
    </div>

    <div class="section-title" style="margin-top:0;">① الموارد</div>
    <div class="stats-row" style="margin-bottom:16px;">
      <div class="stat-card"><div class="num">${s.employeesActive}<span style="font-size:13px;opacity:.55">/${s.employees}</span></div><div class="lbl">موظفين</div></div>
      <div class="stat-card"><div class="num">${s.supervisorsActive}<span style="font-size:13px;opacity:.55">/${s.supervisors}</span></div><div class="lbl">مشرفون</div></div>
      <div class="stat-card"><div class="num">${s.workersActive}<span style="font-size:13px;opacity:.55">/${s.workers}</span></div><div class="lbl">عمال</div></div>
      <div class="stat-card"><div class="num">${s.driversActive}<span style="font-size:13px;opacity:.55">/${s.drivers}</span></div><div class="lbl">سائقون</div></div>
      <div class="stat-card"><div class="num">${s.eqWorking}<span style="font-size:13px;opacity:.55">/${s.equipment}</span></div><div class="lbl">معدات تعمل</div></div>
      <div class="stat-card ${s.eqMaint?'debt':''}"><div class="num">${s.eqMaint}</div><div class="lbl">صيانة</div></div>
      <div class="stat-card"><div class="num">${s.projectsActive}<span style="font-size:13px;opacity:.55">/${s.projects}</span></div><div class="lbl">مشاريع</div></div>
      <div class="stat-card ${s.resigned?'debt':''}"><div class="num">${s.resigned}</div><div class="lbl">مستقيلين</div></div>
    </div>

    <div class="section-title">② المستحقات التفصيلية</div>
    <div class="table-wrap" style="margin-bottom:16px;">
      <table class="data-table">
        <thead><tr>
          <th>الفئة</th><th>المستحق</th><th>منها بدلات</th><th>المدفوع</th><th>خصم/جزاء</th><th>مصاريف على الحساب</th><th>المتبقي</th>
        </tr></thead>
        <tbody>
          ${['worker','driver','supervisor','employee','equipment'].map(k=>{
            const x = rowKind(k);
            if(!x.due && !x.paid && !x.pen && !x.exp) return '';
            return `<tr>
              <td style="font-weight:800;">${kindLab[k]}</td>
              <td>${fmtMoney(x.due)}</td>
              <td>${fmtMoney(x.extras)}</td>
              <td>${fmtMoney(x.paid)}</td>
              <td>${fmtMoney(x.pen)}</td>
              <td>${fmtMoney(x.exp)}</td>
              <td style="font-weight:900;${x.rem>0?'color:#b91c1c':(x.rem<0?'color:#166534':'')}">${fmtMoney(x.rem)}</td>
            </tr>`;
          }).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--ink-soft);">لا مستحقات في هذه الفترة</td></tr>'}
          <tr style="background:#E8F0EA;font-weight:900;">
            <td>الإجمالي</td>
            <td>${fmtMoney(s.duesDue)}</td>
            <td>${fmtMoney(s.extrasTotal)}</td>
            <td>${fmtMoney(s.duesPaid)}</td>
            <td>${fmtMoney(s.duesPen)}</td>
            <td>${fmtMoney(s.duesExp)}</td>
            <td>${fmtMoney(s.duesRemain)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section-title">③ التشغيل والحضور</div>
    <div class="stats-row" style="margin-bottom:16px;">
      <div class="stat-card"><div class="num">${s.attPresent}<span style="font-size:13px;opacity:.55">/${s.attN}</span></div><div class="lbl">حضور موظفين (حاضر/سجلات)</div></div>
      <div class="stat-card ${s.attAbsent?'debt':''}"><div class="num">${s.attAbsent}</div><div class="lbl">غياب موظفين</div></div>
      <div class="stat-card"><div class="num">${s.dailyN}</div><div class="lbl">سجلات يوميات</div></div>
      <div class="stat-card"><div class="num">${fmtNum(s.dailyDays)}</div><div class="lbl">أيام يوميات مسجّلة</div></div>
      <div class="stat-card"><div class="num">${fmtNum(s.workDaysW)}</div><div class="lbl">أيام عمل عمال (محسوبة)</div></div>
      <div class="stat-card"><div class="num">${s.eqDailyN}</div><div class="lbl">يوميات معدات</div></div>
      <div class="stat-card"><div class="num">${fmtNum(s.eqHours)}</div><div class="lbl">ساعات تشغيل معدات</div></div>
      <div class="stat-card"><div class="num">${fmtMoney(s.eqDailyCost)}</div><div class="lbl">تكلفة تشغيل معدات</div></div>
    </div>

    <div class="section-title">④ الإجازات والمصاريف</div>
    <div class="stats-row" style="margin-bottom:10px;">
      <div class="stat-card"><div class="num">${s.leavesApproved}<span style="font-size:13px;opacity:.55">/${s.leavesN}</span></div><div class="lbl">إجازات معتمدة</div></div>
      <div class="stat-card ${s.leavesPending?'debt':''}"><div class="num">${s.leavesPending}</div><div class="lbl">معلّقة</div></div>
      <div class="stat-card"><div class="num">${s.leavesDays}</div><div class="lbl">أيام إجازة</div></div>
      <div class="stat-card debt"><div class="num">${fmtMoney(s.expTotal)}</div><div class="lbl">مصاريف (${s.expN})</div></div>
      <div class="stat-card ${s.advCount?'debt':''}"><div class="num">${fmtMoney(s.advRem)}</div><div class="lbl">سلف معلّقة (${s.advCount})</div></div>
    </div>
    <div class="table-wrap" style="margin-bottom:16px;">
      <table class="data-table">
        <thead><tr><th>فئة المصروف</th><th>المبلغ</th><th>النسبة من الإجمالي</th></tr></thead>
        <tbody>
          ${Object.keys(s.expByKind).map(k=>{
            const v = toInt(s.expByKind[k]); if(!v) return '';
            return `<tr><td>${kindLab[k]||k}</td><td>${fmtMoney(v)}</td><td>${pct(v,s.expTotal)}%</td></tr>`;
          }).join('')||'<tr><td colspan="3" style="text-align:center;color:var(--ink-soft);">لا مصاريف</td></tr>'}
        </tbody>
      </table>
    </div>

    ${s.advCount ? `
    <div class="section-title">⑤ سلف معلّقة (لم تُخصم بالكامل)</div>
    <div class="table-wrap" style="margin-bottom:16px;">
      <table class="data-table">
        <thead><tr><th>الاسم</th><th>الفئة</th><th>ممنوح</th><th>مخصوم</th><th>متبقي</th></tr></thead>
        <tbody>${s.advList.slice(0,80).map(a=>`<tr>
          <td>${escapeHtml(a.name||'')}</td>
          <td>${kindLab[a.personKind]||a.personKind||''}</td>
          <td>${fmtMoney(a.given)}</td>
          <td>${fmtMoney(a.deducted)}</td>
          <td style="font-weight:900;color:#b91c1c;">${fmtMoney(a.remaining)}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>` : ''}
  </div>

  <!-- قالب طباعة -->
  <div id="${printId}" style="display:none;">
    <div class="mo-print" style="direction:rtl;font-family:Tahoma,'Segoe UI',Arial,sans-serif;color:#1a1a1a;max-width:920px;margin:0 auto;">
      ${head}
      <div style="font-size:11px;color:#666;margin:-8px 0 14px;text-align:left;direction:ltr;">Generated: ${escapeHtml(genTime)}</div>

      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px;">
        <div style="flex:1;min-width:110px;background:#1B4332;color:#F6F1E4;border-radius:8px;padding:10px;text-align:center;">
          <div style="font-size:10px;opacity:.8;">قوة عاملة</div>
          <div style="font-size:18px;font-weight:900;">${s.workforceTotal}</div>
        </div>
        <div style="flex:1;min-width:110px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px;text-align:center;">
          <div style="font-size:10px;color:#166534;">مدفوع</div>
          <div style="font-size:15px;font-weight:900;color:#166534;">${fmtMoney(s.duesPaid)}</div>
        </div>
        <div style="flex:1;min-width:110px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;text-align:center;">
          <div style="font-size:10px;color:#991b1b;">متبقي</div>
          <div style="font-size:15px;font-weight:900;color:#b91c1c;">${fmtMoney(s.duesRemain)}</div>
        </div>
        <div style="flex:1;min-width:110px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px;text-align:center;">
          <div style="font-size:10px;color:#92400e;">مصاريف</div>
          <div style="font-size:15px;font-weight:900;">${fmtMoney(s.expTotal)}</div>
        </div>
        <div style="flex:1;min-width:110px;background:#E8F0EA;border:1px solid #c5d9cc;border-radius:8px;padding:10px;text-align:center;">
          <div style="font-size:10px;color:#1B4332;">إجمالي الصرف</div>
          <div style="font-size:15px;font-weight:900;color:#1B4332;">${fmtMoney(s.cashOut)}</div>
        </div>
      </div>

      <div style="font-size:13px;font-weight:900;color:#1B4332;margin:0 0 6px;border-right:3px solid #c9a227;padding-right:8px;">أولاً — الموارد</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:14px;">
        <thead><tr style="background:#1B4332;color:#F6F1E4;">
          <th style="padding:7px;text-align:right;">البند</th><th style="padding:7px;text-align:center;">نشط</th><th style="padding:7px;text-align:center;">الإجمالي</th>
        </tr></thead>
        <tbody>
          <tr><td style="padding:6px;border:1px solid #ddd;">الموظفين</td><td style="padding:6px;border:1px solid #ddd;text-align:center;">${s.employeesActive}</td><td style="padding:6px;border:1px solid #ddd;text-align:center;">${s.employees}</td></tr>
          <tr style="background:#faf8f3;"><td style="padding:6px;border:1px solid #ddd;">المشرفون</td><td style="padding:6px;border:1px solid #ddd;text-align:center;">${s.supervisorsActive}</td><td style="padding:6px;border:1px solid #ddd;text-align:center;">${s.supervisors}</td></tr>
          <tr><td style="padding:6px;border:1px solid #ddd;">العمال</td><td style="padding:6px;border:1px solid #ddd;text-align:center;">${s.workersActive}</td><td style="padding:6px;border:1px solid #ddd;text-align:center;">${s.workers}</td></tr>
          <tr style="background:#faf8f3;"><td style="padding:6px;border:1px solid #ddd;">السائقون</td><td style="padding:6px;border:1px solid #ddd;text-align:center;">${s.driversActive}</td><td style="padding:6px;border:1px solid #ddd;text-align:center;">${s.drivers}</td></tr>
          <tr><td style="padding:6px;border:1px solid #ddd;">معدات (تعمل / صيانة / الكل)</td><td style="padding:6px;border:1px solid #ddd;text-align:center;">${s.eqWorking} / ${s.eqMaint}</td><td style="padding:6px;border:1px solid #ddd;text-align:center;">${s.equipment}</td></tr>
          <tr style="background:#faf8f3;"><td style="padding:6px;border:1px solid #ddd;">مشاريع نشطة / الكل</td><td style="padding:6px;border:1px solid #ddd;text-align:center;">${s.projectsActive}</td><td style="padding:6px;border:1px solid #ddd;text-align:center;">${s.projects}</td></tr>
          <tr><td style="padding:6px;border:1px solid #ddd;">مستقيلين</td><td style="padding:6px;border:1px solid #ddd;text-align:center;" colspan="2">${s.resigned}</td></tr>
        </tbody>
      </table>

      <div style="font-size:13px;font-weight:900;color:#1B4332;margin:0 0 6px;border-right:3px solid #c9a227;padding-right:8px;">ثانياً — المستحقات (بنفس منطق صفحة المستحقات)</div>
      <table style="width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:14px;">
        <thead><tr style="background:#1B4332;color:#F6F1E4;">
          <th style="padding:6px;text-align:right;">الفئة</th>
          <th style="padding:6px;text-align:center;">مستحق</th>
          <th style="padding:6px;text-align:center;">بدلات</th>
          <th style="padding:6px;text-align:center;">مدفوع</th>
          <th style="padding:6px;text-align:center;">خصم</th>
          <th style="padding:6px;text-align:center;">مصاريف</th>
          <th style="padding:6px;text-align:center;">متبقي</th>
        </tr></thead>
        <tbody>
          ${['worker','driver','supervisor','employee','equipment'].map((k,i)=>{
            const x = rowKind(k);
            if(!x.due && !x.paid && !x.pen && !x.exp) return '';
            return `<tr style="${i%2?'background:#faf8f3;':''}">
              <td style="padding:6px;border:1px solid #ddd;font-weight:700;">${kindLab[k]}</td>
              <td style="padding:6px;border:1px solid #ddd;text-align:center;">${fmtMoney(x.due)}</td>
              <td style="padding:6px;border:1px solid #ddd;text-align:center;">${fmtMoney(x.extras)}</td>
              <td style="padding:6px;border:1px solid #ddd;text-align:center;">${fmtMoney(x.paid)}</td>
              <td style="padding:6px;border:1px solid #ddd;text-align:center;">${fmtMoney(x.pen)}</td>
              <td style="padding:6px;border:1px solid #ddd;text-align:center;">${fmtMoney(x.exp)}</td>
              <td style="padding:6px;border:1px solid #ddd;text-align:center;font-weight:800;">${fmtMoney(x.rem)}</td>
            </tr>`;
          }).join('')}
          <tr style="background:#E8F0EA;font-weight:900;">
            <td style="padding:7px;border:1px solid #ccc;">الإجمالي</td>
            <td style="padding:7px;border:1px solid #ccc;text-align:center;">${fmtMoney(s.duesDue)}</td>
            <td style="padding:7px;border:1px solid #ccc;text-align:center;">${fmtMoney(s.extrasTotal)}</td>
            <td style="padding:7px;border:1px solid #ccc;text-align:center;">${fmtMoney(s.duesPaid)}</td>
            <td style="padding:7px;border:1px solid #ccc;text-align:center;">${fmtMoney(s.duesPen)}</td>
            <td style="padding:7px;border:1px solid #ccc;text-align:center;">${fmtMoney(s.duesExp)}</td>
            <td style="padding:7px;border:1px solid #ccc;text-align:center;">${fmtMoney(s.duesRemain)}</td>
          </tr>
        </tbody>
      </table>

      <div style="font-size:13px;font-weight:900;color:#1B4332;margin:0 0 6px;border-right:3px solid #c9a227;padding-right:8px;">ثالثاً — التشغيل · الإجازات · المصاريف</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:14px;">
        <thead><tr style="background:#1B4332;color:#F6F1E4;">
          <th style="padding:7px;text-align:right;">البند</th><th style="padding:7px;text-align:center;">القيمة</th>
        </tr></thead>
        <tbody>
          <tr><td style="padding:6px;border:1px solid #ddd;">حضور موظفين (حاضر / سجلات / غياب)</td><td style="padding:6px;border:1px solid #ddd;text-align:center;">${s.attPresent} / ${s.attN} / ${s.attAbsent}</td></tr>
          <tr style="background:#faf8f3;"><td style="padding:6px;border:1px solid #ddd;">يوميات أفراد / أيام مسجّلة</td><td style="padding:6px;border:1px solid #ddd;text-align:center;">${s.dailyN} / ${fmtNum(s.dailyDays)} (عمال ${s.dailyByKind.worker||0} · سائقين ${s.dailyByKind.driver||0} · مشرفين ${s.dailyByKind.supervisor||0})</td></tr>
          <tr><td style="padding:6px;border:1px solid #ddd;">أيام عمل عمال محسوبة من اليوميات</td><td style="padding:6px;border:1px solid #ddd;text-align:center;">${fmtNum(s.workDaysW)}</td></tr>
          <tr style="background:#faf8f3;"><td style="padding:6px;border:1px solid #ddd;">يوميات معدات · ساعات · تكلفة</td><td style="padding:6px;border:1px solid #ddd;text-align:center;">${s.eqDailyN} · ${fmtNum(s.eqHours)} س · ${fmtMoney(s.eqDailyCost)}</td></tr>
          <tr><td style="padding:6px;border:1px solid #ddd;">إجازات (معتمدة / معلّقة / مرفوضة / الكل)</td><td style="padding:6px;border:1px solid #ddd;text-align:center;">${s.leavesApproved} / ${s.leavesPending} / ${s.leavesRejected} / ${s.leavesN} — ${s.leavesDays} يوم</td></tr>
          <tr style="background:#faf8f3;"><td style="padding:6px;border:1px solid #ddd;font-weight:800;">إجمالي المصاريف</td><td style="padding:6px;border:1px solid #ddd;text-align:center;font-weight:800;">${fmtMoney(s.expTotal)} (${s.expN} بند)</td></tr>
          ${Object.keys(s.expByKind).map(k=>{
            const v=toInt(s.expByKind[k]); if(!v) return '';
            return `<tr><td style="padding:6px;border:1px solid #ddd;padding-right:18px;">— ${kindLab[k]||k}</td><td style="padding:6px;border:1px solid #ddd;text-align:center;">${fmtMoney(v)} (${pct(v,s.expTotal)}%)</td></tr>`;
          }).join('')}
          <tr style="background:#fef2f2;"><td style="padding:6px;border:1px solid #ddd;font-weight:800;">سلف معلّقة</td><td style="padding:6px;border:1px solid #ddd;text-align:center;font-weight:800;color:#b91c1c;">${fmtMoney(s.advRem)} (${s.advCount})</td></tr>
          <tr style="background:#E8F0EA;"><td style="padding:7px;border:1px solid #ccc;font-weight:900;">إجمالي الصرف (مدفوع + مصاريف)</td><td style="padding:7px;border:1px solid #ccc;text-align:center;font-weight:900;">${fmtMoney(s.cashOut)}</td></tr>
        </tbody>
      </table>

      ${s.advCount?`
      <div style="font-size:13px;font-weight:900;color:#1B4332;margin:0 0 6px;border-right:3px solid #c9a227;padding-right:8px;">رابعاً — السلف المعلّقة</div>
      <table style="width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:14px;">
        <thead><tr style="background:#1B4332;color:#F6F1E4;">
          <th style="padding:6px;text-align:right;">الاسم</th><th style="padding:6px;text-align:center;">فئة</th>
          <th style="padding:6px;text-align:center;">ممنوح</th><th style="padding:6px;text-align:center;">مخصوم</th><th style="padding:6px;text-align:center;">متبقي</th>
        </tr></thead>
        <tbody>${s.advList.map((a,i)=>`<tr style="${i%2?'background:#faf8f3;':''}">
          <td style="padding:5px;border:1px solid #ddd;">${escapeHtml(a.name||'')}</td>
          <td style="padding:5px;border:1px solid #ddd;text-align:center;">${kindLab[a.personKind]||''}</td>
          <td style="padding:5px;border:1px solid #ddd;text-align:center;">${fmtMoney(a.given)}</td>
          <td style="padding:5px;border:1px solid #ddd;text-align:center;">${fmtMoney(a.deducted)}</td>
          <td style="padding:5px;border:1px solid #ddd;text-align:center;font-weight:800;">${fmtMoney(a.remaining)}</td>
        </tr>`).join('')}</tbody>
      </table>`:''}

      <div style="font-size:11px;color:#888;margin-top:8px;border-top:1px solid #eee;padding-top:8px;">
        يُحسب المستحق من اليوميات والرواتب والبدلات · المدفوع من سجلات الصرف الفعلية · المصاريف على الحساب تُخصم من المتبقي · التقرير مطابق لمنطق صفحة المستحقات.
      </div>
      ${foot}
    </div>
  </div>`;
}


function renderReportTab(tab, r){
  if(tab==='alerts' && typeof repAlertsTab==='function') return repAlertsTab();
  if(tab==='alertsSummary' && typeof repAlertsSummaryTab==='function') return repAlertsSummaryTab();
  if(tab==='docsmatrix' && typeof repDocsMatrixTab==='function') return repDocsMatrixTab();
  if(tab==='drivers'){
    return typeof repPeopleFullTable==='function' ? repPeopleFullTable('driver', DATA.drivers||[]) : '';
  }
  if(tab==='expenses'){
    let list = (DATA.expenses||[]).filter(e=>{
      if(r.from && (e.date||'')<r.from) return false;
      if(r.to && (e.date||'')>r.to) return false;
      return true;
    });
    const kindLab = {employee:'موظفين',supervisor:'مشرفين',worker:'عمال',driver:'سائقين',equipment:'معدات ومركبات'};
    const types = Array.from(new Set(list.map(e=>e.type||e.item||e.section||'').filter(Boolean)));
    const projects = list.map(e=>e.project||'').filter(Boolean);
    list = list.filter(e=>{
      if(!repMatchOpKind(e.personKind)) return false;
      const nm = typeof expensePersonName==='function' ? expensePersonName(e.personKind,e.personId) : (e.personName||'');
      if(!repMatchOpQ(nm)) return false;
      const tf = ((reportsState||{}).fOpType||'');
      if(tf && String(e.type||e.item||e.section||'')!==tf) return false;
      const pf = ((reportsState||{}).fOpProject||'');
      if(pf && String(e.project||'')!==pf) return false;
      return true;
    });
    const total = toInt(list.reduce((s,e)=>s+toInt(e.amount),0));
    const byKind = {};
    list.forEach(e=>{ byKind[e.personKind||'أخرى'] = (byKind[e.personKind||'أخرى']||0)+toInt(e.amount); });
    return `<div class="stats-row" style="margin-bottom:14px;">
      <div class="stat-card"><div class="num">${list.length}</div><div class="lbl">عدد المصروفات</div></div>
      <div class="stat-card debt"><div class="num">${fmtMoney(total)}</div><div class="lbl">إجمالي المصاريف</div></div>
      ${Object.keys(byKind).map(k=>`<div class="stat-card"><div class="num">${fmtMoney(byKind[k])}</div><div class="lbl">${escapeHtml(kindLab[k]||k)}</div></div>`).join('')}
    </div>
    ${repOpsFilterBarHtml({ showKind:true, showType:true, showProject:true, typeOpts:types, projects })}
    <div class="table-wrap"><table class="data-table"><thead><tr><th>التاريخ</th><th>الفئة</th><th>الاسم</th><th>النوع</th><th>المبلغ</th><th>القسم</th><th>المشروع</th></tr></thead>
    <tbody>${list.slice(0,300).map(e=>`<tr>
      <td>${fmtDate(e.date)}</td><td>${escapeHtml(kindLab[e.personKind]||e.personKind||'')}</td>
      <td>${escapeHtml(typeof expensePersonName==='function'?expensePersonName(e.personKind,e.personId):'')}</td>
      <td>${escapeHtml(e.type||'')}</td><td>${fmtMoney(e.amount)}</td>
      <td>${escapeHtml(e.section||'')}</td><td>${escapeHtml(e.project||'')}</td>
    </tr>`).join('')||'<tr><td colspan="7">لا نتائج</td></tr>'}</tbody></table></div>`;
  }
  if(tab==='projects'){
    const list = DATA.projects||[];
    return `<div class="stats-row" style="margin-bottom:14px;">
      <div class="stat-card"><div class="num">${list.length}</div><div class="lbl">مشاريع</div></div>
    </div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>الاسم</th><th>الكود</th><th>الموقع</th><th>الحالة</th><th>الميزانية</th></tr></thead>
    <tbody>${list.map(p=>`<tr><td>${escapeHtml(p.name||'')}</td><td>${escapeHtml(p.code||'')}</td><td>${escapeHtml(p.location||'')}</td><td>${escapeHtml(p.status||'')}</td><td>${fmtMoney(p.budget)}</td></tr>`).join('')||'<tr><td colspan="5">لا مشاريع</td></tr>'}</tbody></table></div>`;
  }
  if(tab==='dues'){
    return typeof repDuesFull==='function' ? repDuesFull(r) : '<div class="alert-empty">—</div>';
  }
  if(tab==='person'){
    return typeof repPersonDetail==='function' ? repPersonDetail(r) : '<div class="alert-empty">تقرير فردي غير متاح</div>';
  }
  if(tab==='employees'){
    return typeof repPeopleFullTable==='function' ? repPeopleFullTable('employee', DATA.employees||[]) : '';
  }
  if(tab==='workers'){
    return typeof repPeopleFullTable==='function' ? repPeopleFullTable('worker', DATA.workers||[]) : '';
  }
  if(tab==='supervisors'){
    return typeof repPeopleFullTable==='function' ? repPeopleFullTable('supervisor', DATA.supervisors||[]) : '';
  }
  if(tab==='departments'){
    const list = DATA.departments||[];
    const cnt=(kind,id)=>{
      const arr=kind==='employee'?DATA.employees:kind==='worker'?DATA.workers:kind==='supervisor'?DATA.supervisors:kind==='driver'?DATA.drivers:DATA.equipment;
      return (arr||[]).filter(x=>(x.departmentId||x.categoryId)===id).length;
    };
    return `<div class="table-wrap"><table class="data-table"><thead><tr>
      <th>الاسم</th><th>النوع</th><th>موظفين</th><th>عمال</th><th>مشرفين</th><th>سائقين</th><th>معدات</th>
    </tr></thead><tbody>${list.map(d=>`<tr>
      <td>${escapeHtml(d.name||'')}</td><td>${escapeHtml((typeof arabicLabelForCode==='function'?arabicLabelForCode(d.kind):d.kind)||'')}</td>
      <td>${cnt('employee',d.id)}</td><td>${cnt('worker',d.id)}</td><td>${cnt('supervisor',d.id)}</td><td>${cnt('driver',d.id)}</td><td>${cnt('equipment',d.id)}</td>
    </tr>`).join('')||'<tr><td colspan="7">لا أقسام</td></tr>'}</tbody></table></div>`;
  }
  if(tab==='equipment'){
    return typeof repPeopleFullTable==='function' ? repPeopleFullTable('equipment', DATA.equipment||[]) : '';
  }
  if(tab==='attendance'){
    const list = (DATA.attendance||[]).filter(a=>a.date>=r.from&&a.date<=r.to);
    return `<div class="table-wrap"><table class="data-table"><thead><tr><th>الموظف</th><th>التاريخ</th><th>الحالة</th></tr></thead>
    <tbody>${list.map(a=>`<tr><td>${escapeHtml(typeof employeeName==='function'?employeeName(a.employeeId):a.employeeId)}</td>
      <td>${fmtDate(a.date)}</td><td>${escapeHtml((typeof arabicLabelForCode==='function'?arabicLabelForCode(a.status):a.status)||'')}</td></tr>`).join('')||'<tr><td colspan="3">لا حضور في الفترة</td></tr>'}</tbody></table></div>`;
  }
  if(tab==='daily'){
    const list = (DATA.workerAttendance||[]).filter(a=>(a.date||'')>=r.from&&(a.date||'')<=r.to);
    const eqLogs = (DATA.equipmentLogs||[]).filter(a=>(a.date||'')>=r.from&&(a.date||'')<=r.to);
    return `<div class="stats-row" style="margin-bottom:14px;">
      <div class="stat-card"><div class="num">${list.length}</div><div class="lbl">يوميات أشخاص</div></div>
      <div class="stat-card"><div class="num">${eqLogs.length}</div><div class="lbl">يوميات معدات</div></div>
    </div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>التاريخ</th><th>النوع</th><th>الاسم</th><th>الحالة</th><th>أيام</th><th>المشروع</th></tr></thead>
    <tbody>${list.map(a=>{
      const kind = a.personType||a.kind||'worker';
      let name = '';
      if(kind==='supervisor') name = typeof supervisorName==='function'?supervisorName(a.personId||a.supervisorId):'';
      else if(kind==='driver') name = typeof driverName==='function'?driverName(a.personId||a.driverId):(DATA.drivers||[]).find(x=>x.id===(a.personId||a.driverId))?.name||'';
      else name = typeof workerName==='function'?workerName(a.workerId||a.personId):'';
      return `<tr><td>${fmtDate(a.date)}</td><td>${escapeHtml((typeof arabicLabelForCode==='function'?arabicLabelForCode(kind):kind)||'')}</td>
        <td>${escapeHtml(name)}</td><td>${escapeHtml((typeof arabicLabelForCode==='function'?arabicLabelForCode(a.status):a.status)||'')}</td>
        <td>${typeof fmtAttendanceDays==='function'?fmtAttendanceDays(a):(a.days||1)}</td><td>${escapeHtml(a.project||'')}</td></tr>`;
    }).join('')}${eqLogs.map(l=>{
      const eq = (DATA.equipment||[]).find(x=>x.id===l.equipmentId);
      return `<tr><td>${fmtDate(l.date)}</td><td>معدة</td><td>${escapeHtml(eq?(eq.code||'')+' '+(eq.typeLabel||eq.name||''):'')}</td>
        <td>—</td><td>${l.days||1}</td><td>${escapeHtml(l.project||'')}</td></tr>`;
    }).join('')||(list.length?'':'<tr><td colspan="6">لا يوميات في الفترة</td></tr>')}</tbody></table></div>`;
  }
  if(tab==='performance'){
    let list = (DATA.performanceReviews||[]).filter(p=>{
      if(r.from&&(p.date||'')<r.from) return false;
      if(r.to&&(p.date||'')>r.to) return false;
      return true;
    });
    list = list.filter(p=>{
      if(!repMatchOpKind(p.personKind||p.kind)) return false;
      if(!repMatchOpQ(p.personName||p.name)) return false;
      return true;
    });
    return `${repOpsFilterBarHtml({ showKind:true })}
    <div class="table-wrap"><table class="data-table"><thead><tr><th>التاريخ</th><th>النوع</th><th>الاسم</th><th>الدرجة</th><th>ملاحظات</th></tr></thead>
    <tbody>${list.map(p=>`<tr><td>${fmtDate(p.date)}</td><td>${escapeHtml((typeof arabicLabelForCode==='function'?arabicLabelForCode(p.personKind):p.personKind)||'')}</td>
      <td>${escapeHtml(p.personName||p.name||'')}</td><td>${escapeHtml(String(p.score||p.rating||''))}</td><td>${escapeHtml(p.notes||'')}</td></tr>`).join('')||'<tr><td colspan="5">لا نتائج</td></tr>'}</tbody></table></div>`;
  }
  if(tab==='transfers'){
    let list = (DATA.resourceTransfers||DATA.transfers||[]).filter(tr=>{
      if(r.from&&(tr.date||'')<r.from) return false;
      if(r.to&&(tr.date||'')>r.to) return false;
      return true;
    });
    const projects = list.flatMap(tr=>[tr.fromProject||tr.from||'', tr.toProject||tr.to||'']);
    list = list.filter(tr=>{
      if(!repMatchOpKind(tr.entityKind||tr.kind||tr.personKind)) return false;
      if(!repMatchOpQ(tr.entityName||tr.name)) return false;
      const pf = ((reportsState||{}).fOpProject||'');
      if(pf && String(tr.fromProject||tr.from||'')!==pf && String(tr.toProject||tr.to||'')!==pf) return false;
      return true;
    });
    return `${repOpsFilterBarHtml({ showKind:true, showProject:true, projects })}
    <div class="table-wrap"><table class="data-table"><thead><tr><th>التاريخ</th><th>النوع</th><th>الاسم</th><th>من</th><th>إلى</th><th>السبب</th></tr></thead>
    <tbody>${list.map(tr=>`<tr><td>${fmtDate(tr.date)}</td><td>${escapeHtml((typeof arabicLabelForCode==='function'?arabicLabelForCode(tr.entityKind||tr.kind):tr.entityKind||tr.kind)||'')}</td>
      <td>${escapeHtml(tr.entityName||tr.name||'')}</td><td>${escapeHtml(tr.fromProject||tr.from||'')}</td>
      <td>${escapeHtml(tr.toProject||tr.to||'')}</td><td>${escapeHtml(tr.reason||'')}</td></tr>`).join('')||'<tr><td colspan="6">لا نتائج</td></tr>'}</tbody></table></div>`;
  }
  if(tab==='penalties'){
    const rows = [];
    (DATA.workerPenalties||[]).forEach(p=>{
      if(r.from&&(p.date||'')<r.from) return; if(r.to&&(p.date||'')>r.to) return;
      const name = typeof workerName==='function'?workerName(p.workerId):p.workerId;
      rows.push({kind:'worker',kindLab:'عامل',name,date:p.date,amount:p.amount,reason:p.reason||''});
    });
    (DATA.employeePenalties||[]).forEach(p=>{
      if(r.from&&(p.date||'')<r.from) return; if(r.to&&(p.date||'')>r.to) return;
      const name = typeof employeeName==='function'?employeeName(p.employeeId):p.employeeId;
      rows.push({kind:'employee',kindLab:'موظف',name,date:p.date,amount:p.amount,reason:p.reason||''});
    });
    (DATA.workerPayments||[]).forEach(p=>{
      if(p.type!=='penalty'&&p.type!=='deduction') return;
      if(r.from&&(p.date||'')<r.from) return; if(r.to&&(p.date||'')>r.to) return;
      const kind = p.personType||'worker';
      let name = p.personName||'';
      if(kind==='worker') name = typeof workerName==='function'?workerName(p.personId||p.workerId):name;
      else if(kind==='employee') name = typeof employeeName==='function'?employeeName(p.personId):name;
      else if(kind==='driver') name = typeof driverName==='function'?driverName(p.personId):name;
      else if(kind==='supervisor') name = typeof supervisorName==='function'?supervisorName(p.personId):name;
      rows.push({kind, kindLab:({worker:'عامل',employee:'موظف',driver:'سائق',supervisor:'مشرف'}[kind]||kind), name, date:p.date, amount:p.amount, reason:p.payCategory||p.reason||''});
    });
    let filtered = rows.filter(x=> repMatchOpKind(x.kind) && repMatchOpQ(x.name));
    const tf = ((reportsState||{}).fOpType||'');
    if(tf) filtered = filtered.filter(x=> String(x.reason||'')===tf);
    const reasons = Array.from(new Set(rows.map(x=>x.reason).filter(Boolean)));
    return `${repOpsFilterBarHtml({ showKind:true, showType:true, typeOpts:reasons })}
    <div class="table-wrap"><table class="data-table"><thead><tr><th>النوع</th><th>الاسم</th><th>التاريخ</th><th>المبلغ</th><th>السبب</th></tr></thead>
    <tbody>${filtered.map(x=>`<tr><td>${escapeHtml(x.kindLab)}</td><td>${escapeHtml(x.name||'')}</td><td>${fmtDate(x.date)}</td><td>${fmtMoney(x.amount)}</td><td>${escapeHtml(x.reason||'')}</td></tr>`).join('')||'<tr><td colspan="5">لا نتائج</td></tr>'}</tbody></table></div>`;
  }
  if(tab==='leaves'){
    let list = (DATA.leaves||[]).filter(l=>{
      if(r.from && (l.to||l.from||'') < r.from) return false;
      if(r.to && (l.from||'') > r.to) return false;
      return true;
    });
    const types = Array.from(new Set(list.map(l=>l.type||'').filter(Boolean)));
    const statuses = Array.from(new Set(list.map(l=>l.status||'').filter(Boolean)));
    list = list.filter(l=>{
      const name = typeof employeeName==='function'?employeeName(l.employeeId||l.personId): (l.personName||'');
      if(!repMatchOpQ(name)) return false;
      const tf = ((reportsState||{}).fOpType||'');
      if(tf && String(l.type||'')!==tf) return false;
      const sf = ((reportsState||{}).fOpStatus||'');
      if(sf && String(l.status||'')!==sf) return false;
      return true;
    });
    return `${repOpsFilterBarHtml({ showKind:false, showType:true, showStatus:true, typeOpts:types, statusOpts:statuses })}
    <div class="table-wrap"><table class="data-table"><thead><tr><th>الموظف</th><th>النوع</th><th>من</th><th>إلى</th><th>أيام</th><th>الحالة</th></tr></thead>
    <tbody>${list.map(l=>{
      const name = typeof employeeName==='function'?employeeName(l.employeeId||l.personId):(l.personName||'');
      return `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml((typeof arabicLabelForCode==='function'?arabicLabelForCode(l.type):l.type)||'')}</td>
        <td>${fmtDate(l.from)}</td><td>${fmtDate(l.to)}</td><td>${toInt(l.days)}</td>
        <td>${escapeHtml((typeof arabicLabelForCode==='function'?arabicLabelForCode(l.status):l.status)||'')}</td></tr>`;
    }).join('')||'<tr><td colspan="6">لا نتائج</td></tr>'}</tbody></table></div>`;
  }
  if(tab==='overview'){
    try{ return renderReportsOverview(r); }
    catch(err){
      console.error('overview report', err);
      return '<div class="alert-empty" style="padding:24px;color:#b91c1c;">تعذر تحميل النظرة العامة — أعد فتح الصفحة</div>';
    }
  }
  return '<div class="alert-empty">اختر تقريراً</div>';
}

/** بناء بيانات التصدير للتبويب الحالي — مطابق لجداول البرنامج بالعربي */
function buildReportExportData(){
  const r = repRange();
  const tab = reportsState.tab;

  // التقارير الذكية الجديدة
  if(tab==='alerts' && typeof alertReportExportData==='function'){ const x = alertReportExportData(); x.range = r; return x; }
  if(tab==='alertsSummary' && typeof alertsSummaryExportData==='function'){ const x = alertsSummaryExportData(); x.range = r; return x; }
  if(tab==='docsmatrix' && typeof docsMatrixExportData==='function'){ const x = docsMatrixExportData(); x.range = r; return x; }

  // تقارير شاملة — كل الأعمدة مع الفلاتر
  if(['employees','workers','supervisors','drivers','equipment'].includes(tab)){
    const kindMap = {employees:'employee',workers:'worker',supervisors:'supervisor',drivers:'driver',equipment:'equipment'};
    const listMap = {
      employees: DATA.employees||[], workers: DATA.workers||[], supervisors: DATA.supervisors||[],
      drivers: DATA.drivers||[], equipment: DATA.equipment||[]
    };
    const kind = kindMap[tab];
    const filtered = typeof repFilterPeopleList==='function' ? repFilterPeopleList(kind, listMap[tab]) : listMap[tab];
    if(kind==='equipment'){
      const headers = ['الكود','نوع السيارة','رقم اللوحة','اللون','رقم الماتور','رقم الشاسيه','الرقم التأميني','حالة التأمين','الموديل','انتهاء رخصة المركبة','حالة الرخصة','نوع الترخيص','اسم السائق','انتهاء رخصة السائق','القسم','الحالة','الملكية','المشروع'];
      const rows = filtered.map(eq=>{
        const vExp = eq.vehicleLicenseExpiry||eq.licenseExpiry||'';
        return [
          eq.code||'', eq.typeLabel||eq.name||'', eq.vehicleNumber||eq.plate||'', eq.color||'',
          eq.motorNumber||eq.serial||'', eq.chassisNumber||'', eq.insuranceNumber||'',
          typeof repInsLabel==='function'?repInsLabel(eq):(eq.insuranceStatus||''),
          eq.model||'', typeof fmtDate==='function'?fmtDate(vExp):vExp,
          typeof repLicLabel==='function'?repLicLabel(eq,true):'',
          eq.licenseCategory||'', eq.driverName||'',
          typeof fmtDate==='function'?fmtDate(eq.driverLicenseExpiry):eq.driverLicenseExpiry||'',
          typeof departmentName==='function'?departmentName(eq.departmentId||eq.categoryId):'',
          typeof repStatusLabel==='function'?repStatusLabel(eq):(eq.status||''),
          eq.ownership||'', eq.project||''
        ];
      });
      return { headers, rows, name: 'تقرير-معدات', sheetName: 'معدات ومركبات', range:r };
    }
    if(typeof personListExport==='function'){
      const x = personListExport(kind, filtered);
      return { headers: x.headers, rows: x.rows, name: 'تقرير-'+tab, sheetName: tab, range:r };
    }
  }
  let headers=[], rows=[], name='report', sheetName='تقرير';
  const push = (h, rowList, n, sn)=>{ headers=h; rows=rowList; name=n; sheetName=sn||n; };
  const lab = (c)=> (typeof arabicLabelForCode==='function'?arabicLabelForCode(c):c)||'';
  const fd = (d)=> d?(typeof fmtDate==='function'?fmtDate(d):d):'';

  if(tab==='employees'){
    const h=['الكود','الاسم','الوظيفة','الرقم القومي','انتهاء البطاقة','حالة البطاقة','انتهاء الرخصة','حالة الرخصة','تاريخ التعيين','نوع العقد','حالة العقد','الراتب الأساسي','حالة التأمين','الرقم التأميني','رقم التليفون','القسم','الحالة'];
    const rows2=[];
    (DATA.employees||[]).forEach(e=>{
      const cardSt = e.idCardExpiry && typeof statusFromExpiry==='function' ? statusFromExpiry(e.idCardExpiry) : e.idCardStatus;
      const licSt = e.licenseExpiry && typeof statusFromExpiry==='function' ? statusFromExpiry(e.licenseExpiry) : e.licenseStatus;
      rows2.push([
        e.code||'', e.name||'', e.position||'', e.nationalId||'',
        fd(e.idCardExpiry), lab(cardSt), fd(e.licenseExpiry), lab(licSt),
        fd(e.hireDate),
        (typeof labelOf==='function'?labelOf(typeof CONTRACT_TYPE_OPTS!=='undefined'?CONTRACT_TYPE_OPTS:[], e.contractType):'')||lab(e.contractType),
        lab(e.contractStatus), toInt(e.salary||e.basicSalary),
        e.insuranceStatus==='none'?'غير مؤمن عليه':lab(e.insuranceStatus),
        e.insuranceNumber||'', e.phone||'',
        typeof departmentName==='function'?departmentName(e.departmentId||e.categoryId):'',
        lab(e.status)
      ]);
    });
    push(h, rows2, 'employees', 'الموظفين');
  } else if(tab==='workers'){
    const h=['الكود','الاسم','الوظيفة','الرقم القومي','انتهاء البطاقة','حالة البطاقة','اليومية','المشروع','المشرف','القسم','الحالة'];
    const rows2=[];
    (DATA.workers||[]).forEach(w=>{
      const cardSt = w.idCardExpiry && typeof statusFromExpiry==='function' ? statusFromExpiry(w.idCardExpiry) : w.idCardStatus;
      rows2.push([
        w.code||'', w.name||'', w.position||w.skill||'', w.nationalId||'',
        fd(w.idCardExpiry), lab(cardSt), toInt(w.dailyWage), w.project||'',
        typeof supervisorName==='function'?supervisorName(w.supervisorId):'',
        typeof departmentName==='function'?departmentName(w.departmentId||w.categoryId):'',
        lab(w.status)
      ]);
    });
    push(h, rows2, 'workers', 'العمال');
  } else if(tab==='supervisors'){
    const h=['الكود','الاسم','اليومية','الهاتف','القسم','الحالة','عدد العمال'];
    const rows2=[];
    (DATA.supervisors||[]).forEach(s=>{
      const n=(DATA.workers||[]).filter(w=>w.supervisorId===s.id).length;
      rows2.push([s.code||'',s.name||'',toInt(s.dailyWage),s.phone||'',typeof departmentName==='function'?departmentName(s.departmentId||s.categoryId):'',lab(s.status),n]);
    });
    push(h, rows2, 'supervisors', 'المشرفون');
  } else if(tab==='drivers'){
    const h=['الكود','الاسم','اليومية','الهاتف','القسم','الحالة'];
    const rows2=(DATA.drivers||[]).map(d=>[d.code||'',d.name||'',toInt(d.dailyWage),d.phone||'',typeof departmentName==='function'?departmentName(d.departmentId||d.categoryId):'',lab(d.status)]);
    push(h, rows2, 'drivers', 'السائقون');
  } else if(tab==='equipment'){
    const h=['الكود','نوع السيارة','رقم اللوحة','اللون','الموديل','انتهاء رخصة السيارة','حالة رخصة السيارة','نوع الترخيص','اسم السائق','القسم','الحالة','الملكية'];
    const rows2=[];
    (DATA.equipment||[]).forEach(eq=>{
      const vExp = eq.vehicleLicenseExpiry || eq.licenseExpiry || '';
      const vSt = vExp && typeof statusFromExpiry==='function' ? statusFromExpiry(vExp) : (eq.vehicleLicenseStatus||'');
      rows2.push([
        eq.code||'', eq.typeLabel||eq.name||'', eq.vehicleNumber||eq.plate||'', eq.color||'', eq.model||'',
        fd(vExp), lab(vSt), eq.licenseCategory||lab(eq.ownership)||'',
        eq.driverName||'',
        typeof departmentName==='function'?departmentName(eq.departmentId||eq.categoryId):'',
        lab(eq.status), lab(eq.ownership)
      ]);
    });
    push(h, rows2, 'equipment', 'معدات ومركبات');
  } else if(tab==='expenses'){
    const h=['التاريخ','الفئة','الاسم','بند المصروف','المبلغ','القسم','ملاحظات'];
    const rows2=[];
    (DATA.expenses||[]).filter(e=>{
      if(r.from && (e.date||'')<r.from) return false;
      if(r.to && (e.date||'')>r.to) return false;
      return true;
    }).forEach(e=>{
      rows2.push([
        fd(e.date), lab(e.personKind),
        typeof expensePersonName==='function'?expensePersonName(e.personKind,e.personId):(e.personName||''),
        e.type||e.item||'', toInt(e.amount), e.section||'', e.notes||''
      ]);
    });
    push(h, rows2, 'expenses', 'المصاريف');
  } else if(tab==='daily'){
    const h=['التاريخ','النوع','الاسم','الحالة','أيام','المشروع'];
    const rows2=[];
    (DATA.workerAttendance||[]).filter(a=>(a.date||'')>=r.from&&(a.date||'')<=r.to).forEach(a=>{
      const kind = a.personType||a.kind||'worker';
      let name='';
      if(kind==='supervisor') name=typeof supervisorName==='function'?supervisorName(a.personId||a.supervisorId):'';
      else if(kind==='driver') name=(DATA.drivers||[]).find(x=>x.id===(a.personId||a.driverId))?.name||'';
      else name=typeof workerName==='function'?workerName(a.workerId||a.personId):'';
      rows2.push([fd(a.date), lab(kind), name, lab(a.status), a.days||1, a.project||'']);
    });
    (DATA.equipmentLogs||[]).filter(a=>(a.date||'')>=r.from&&(a.date||'')<=r.to).forEach(l=>{
      const eq=(DATA.equipment||[]).find(x=>x.id===l.equipmentId);
      rows2.push([fd(l.date),'معدة',eq?((eq.code||'')+' '+(eq.typeLabel||eq.name||'')):'', '—', l.days||1, l.project||'']);
    });
    push(h, rows2, 'daily', 'اليوميات');
  } else if(tab==='dues'){
    const h=['النوع','الاسم','مستحق','مدفوع','متبقي'];
    const rows2=[];
    (DATA.workers||[]).forEach(w=>{
      const due=typeof workerDueAmount==='function'?workerDueAmount(w.id,r.from,r.to):0;
      const paid=typeof workerPaidTotal==='function'?workerPaidTotal(w.id,r.from,r.to):0;
      if(due||paid) rows2.push(['عامل',w.name,due,paid,toInt(due-paid)]);
    });
    (DATA.drivers||[]).forEach(d=>{
      const due=typeof driverDueAmount==='function'?driverDueAmount(d.id,r.from,r.to):0;
      const paid=typeof driverPaidTotal==='function'?driverPaidTotal(d.id,r.from,r.to):0;
      if(due||paid) rows2.push(['سائق',d.name,due,paid,toInt(due-paid)]);
    });
    (DATA.supervisors||[]).forEach(s=>{
      const due=typeof supervisorOwnDue==='function'?supervisorOwnDue(s.id,r.from,r.to):0;
      const paid=typeof supervisorPaidTotal==='function'?supervisorPaidTotal(s.id,r.from,r.to):0;
      if(due||paid) rows2.push(['مشرف',s.name,due,paid,toInt(due-paid)]);
    });
    push(h, rows2, 'dues', 'المستحقات');
  } else if(tab==='overview'){
    const s = typeof buildMonthlyOverviewStats==='function' ? buildMonthlyOverviewStats(r) : null;
    if(s){
      push(['البند','القيمة'], [
        ['الفترة', r.label],
        ['القوى العاملة النشطة', s.workforceTotal],
        ['موظفين (نشط/الكل)', s.employeesActive+' / '+s.employees],
        ['مشرفون', s.supervisorsActive+' / '+s.supervisors],
        ['عمال', s.workersActive+' / '+s.workers],
        ['سائقون', s.driversActive+' / '+s.drivers],
        ['معدات تعمل / صيانة / الكل', s.eqWorking+' / '+s.eqMaint+' / '+s.equipment],
        ['مشاريع نشطة / الكل', s.projectsActive+' / '+s.projects],
        ['مستقيلين', s.resigned],
        ['المستحق الإجمالي', s.duesDue],
        ['منها بدلات ومكافآت', s.extrasTotal],
        ['المدفوع', s.duesPaid],
        ['خصومات وجزاءات', s.duesPen],
        ['مصاريف على الحسابات', s.duesExp],
        ['المتبقي', s.duesRemain],
        ['مستحق عمال', s.dueBy.worker],
        ['مستحق سائقين', s.dueBy.driver],
        ['مستحق مشرفين', s.dueBy.supervisor],
        ['مستحق موظفين', s.dueBy.employee],
        ['تكلفة معدات', s.dueBy.equipment],
        ['المصاريف العامة', s.expTotal],
        ['عدد بنود المصاريف', s.expN],
        ['سلف معلّقة — عدد', s.advCount],
        ['سلف معلّقة — مبلغ', s.advRem],
        ['إجازات معتمدة', s.leavesApproved],
        ['إجازات معلّقة', s.leavesPending],
        ['أيام إجازة', s.leavesDays],
        ['حضور موظفين', s.attN],
        ['يوميات أفراد', s.dailyN],
        ['أيام يوميات', s.dailyDays],
        ['يوميات معدات', s.eqDailyN],
        ['ساعات تشغيل معدات', s.eqHours],
        ['تكلفة تشغيل معدات', s.eqDailyCost],
        ['إجمالي الصرف', s.cashOut]
      ], 'overview', 'نظرة عامة');
    } else {
      push(['البند','العدد'], [['الفترة',r.label]], 'overview', 'نظرة عامة');
    }
  } else if(tab==='projects'){
    push(['الاسم','الكود','الموقع','الحالة','الميزانية'],
      (DATA.projects||[]).map(p=>[p.name||'',p.code||'',p.location||'',lab(p.status),toInt(p.budget)]),
      'projects', 'المشاريع');
  } else if(tab==='departments'){
    const cnt=(kind,id)=>{
      const arr=kind==='employee'?DATA.employees:kind==='worker'?DATA.workers:kind==='supervisor'?DATA.supervisors:kind==='driver'?DATA.drivers:DATA.equipment;
      return (arr||[]).filter(x=>(x.departmentId||x.categoryId)===id).length;
    };
    push(['الاسم','النوع','موظفين','عمال','مشرفين','سائقين','معدات'],
      (DATA.departments||[]).map(d=>[d.name||'',lab(d.kind),cnt('employee',d.id),cnt('worker',d.id),cnt('supervisor',d.id),cnt('driver',d.id),cnt('equipment',d.id)]),
      'departments', 'الأقسام');
  } else if(tab==='leaves'){
    const rows2=[];
    (DATA.leaves||[]).forEach(l=>{
      if(r.from && (l.to||l.from)<r.from) return;
      if(r.to && l.from>r.to) return;
      rows2.push([typeof employeeName==='function'?employeeName(l.employeeId):l.employeeId, lab(l.type), fd(l.from), fd(l.to), toInt(l.days), lab(l.status)]);
    });
    push(['الموظف','النوع','من','إلى','أيام','الحالة'], rows2, 'leaves', 'الإجازات');
  } else {
    push(['ملاحظة'], [['لا بيانات لهذا التبويب']], tab||'report', 'تقرير');
  }
  return { headers, rows, name, sheetName, range:r };
}

function exportCurrentReportCsv(){
  const data = buildReportExportData();
  if(typeof downloadCsv==='function'){
    downloadCsv(data.name+'-'+data.range.from+'-'+data.range.to+'.csv', data.headers, data.rows||[]);
    showToast('تم تصدير CSV');
  } else showToast('التصدير غير متاح');
}

async function exportCurrentReportXlsx(){
  const data = buildReportExportData();
  const fname = data.name+'-'+data.range.from+'-'+data.range.to+'.xlsx';
  if(typeof downloadXlsx==='function'){
    const ok = await downloadXlsx(fname, data.headers, data.rows||[], data.sheetName||'تقرير');
    if(ok) return;
    // لو فشل الإكسيل بدون رسالة واضحة
    if(typeof showToast==='function') showToast('تعذر تصدير إكسيل — جرّب مرة أخرى أو CSV');
    return;
  }
  // احتياطي
  exportCurrentReportCsv();
}


function printCurrentReport(){
  const r = repRange();
  const titleMap = {
    overview:'نظرة عامة', alerts:'تقارير التنبيهات', alertsSummary:'ملخص التنبيهات', docsmatrix:'مصفوفة الأوراق', person:'تقرير فردي', employees:'الموظفين', supervisors:'المشرفون',
    workers:'العمال', drivers:'السائقون', departments:'الأقسام', projects:'المشاريع',
    equipment:'معدات ومركبات', attendance:'حضور الموظفين', daily:'اليوميات', dues:'المستحقات',
    expenses:'المصاريف', leaves:'الإجازات', performance:'تقييم الأداء', transfers:'حركة الموارد',
    penalties:'خصومات'
  };
  const title = 'تقرير — '+(titleMap[reportsState.tab]||'تقرير')+' — '+r.label;
  const company = (DATA.settings&&DATA.settings.companyName)||brandName();
  const body = document.getElementById('repContent');
  const html = `
    <div style="font-family:Tahoma,Arial,sans-serif;direction:rtl;padding:12px;">
      <h2 style="margin:0 0 4px;color:#1B4332;">${escapeHtml(company)}</h2>
      <h3 style="margin:0 0 12px;">${escapeHtml(title)}</h3>
      <p style="color:#666;font-size:13px;">تاريخ الطباعة: ${fmtDate(todayISO())}</p>
      <hr>
      ${body ? body.innerHTML : ''}
    </div>`;
  if(typeof printHtml==='function') printHtml(html, title);
  else window.print();
}


function bindReportsPage(){
  try{ if(typeof bindSmartReportFilters==='function') bindSmartReportFilters(); }catch(e){ console.error(e); }
  const btnPr = document.getElementById('btnPrintMonthlyOverview');
  if(btnPr){
    btnPr.onclick = ()=>{
      try{
        const el = document.getElementById('monthlyOverviewPrint');
        let body = el ? el.innerHTML : '';
        if(!body || !String(body).trim()){
          // إعادة بناء التقرير إن لم يكن القالب في الصفحة
          const r = typeof repRange==='function' ? repRange() : { label:'' };
          if(typeof renderReportsOverview==='function'){
            const wrap = document.createElement('div');
            wrap.innerHTML = renderReportsOverview(r);
            const again = wrap.querySelector('#monthlyOverviewPrint');
            body = again ? again.innerHTML : '';
          }
        }
        if(!body || !String(body).trim()){
          if(typeof showToast==='function') showToast('لا يوجد تقرير للطباعة');
          return;
        }
        const r = typeof repRange==='function' ? repRange() : {};
        const title = 'التقرير الشهري' + (r.label ? ' — ' + r.label : '');
        // نفس مسار كشوف الحساب: printArea + printHtml
        if(typeof printHtml==='function'){
          printHtml(
            '<div class="print-sheet mo-print" style="direction:rtl;">'+body+'</div>',
            title,
            { statement:true, brand:false, headerTitle:title, periodLine: r.label ? ('الفترة: '+r.label) : '' }
          );
        } else {
          window.print();
        }
      }catch(err){
        console.error('print monthly overview', err);
        if(typeof showToast==='function') showToast('تعذر طباعة التقرير الشهري');
      }
    };
  }
  document.getElementById('btnRepApply')?.addEventListener('click', ()=>{
    reportsState.year = Number(document.getElementById('repYear')?.value)||new Date().getFullYear();
    reportsState.month = Number(document.getElementById('repMonth')?.value)||0;
    reportsState.from = document.getElementById('repFrom')?.value||'';
    reportsState.to = document.getElementById('repTo')?.value||'';
    if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
  });
  document.getElementById('btnRepClearDates')?.addEventListener('click', ()=>{
    reportsState.from = '';
    reportsState.to = '';
    if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
  });
  document.querySelectorAll('.rep-tab').forEach(b=>{
    b.addEventListener('click', ()=>{
      reportsState.tab = b.getAttribute('data-tab')||'overview';
      if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
    });
  });
  document.getElementById('btnRepCsv')?.addEventListener('click', ()=>{
    if(typeof exportCurrentReportCsv==='function') exportCurrentReportCsv();
  });
  document.getElementById('btnRepXlsx')?.addEventListener('click', ()=>{
    if(typeof exportCurrentReportXlsx==='function') exportCurrentReportXlsx();
  });
  document.getElementById('btnRepPrint')?.addEventListener('click', ()=>{
    if(typeof printCurrentReport==='function') printCurrentReport();
  });
  // تقرير فردي — أزرار النوع
  document.querySelectorAll('.rep-kind-btn').forEach(b=>{
    b.addEventListener('click', ()=>{
      reportsState.personKind = b.getAttribute('data-kind')||'worker';
      reportsState.personId = '';
      if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
    });
  });
  const pk = document.getElementById('repPersonKind');
  if(pk) pk.addEventListener('change', ()=>{
    reportsState.personKind = pk.value||'worker';
    reportsState.personId = '';
    if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
  });
  const pi = document.getElementById('repPersonId');
  if(pi){
    pi.addEventListener('change', ()=>{
      reportsState.personId = pi.value||'';
      if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
    });
  }
  // entity combo يحدّث hidden#repPersonId
  const hid = document.getElementById('repPersonId');
  if(hid && hid.type==='hidden'){
    hid.addEventListener('change', ()=>{
      reportsState.personId = hid.value||'';
      if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
    });
  }

  // فلاتر تقارير الناس/المعدات
  (function bindRepFilters(){
    const map = {
      repFQ:'fQ', repFIns:'fIns', repFLic:'fLic', repFCard:'fCard', repFStatus:'fStatus',
      repFDept:'fDept', repFContract:'fContract', repFContractSt:'fContractSt',
      repFJob:'fJob', repFProject:'fProject', repFSup:'fSup', repFGrade:'fGrade',
      repFOwnership:'fOwnership', repFType:'fType', repFPlate:'fPlate',
      repFOpQ:'fOpQ', repFOpKind:'fOpKind', repFOpType:'fOpType',
      repFOpProject:'fOpProject', repFOpStatus:'fOpStatus', repFOpBal:'fOpBal'
    };
    Object.keys(map).forEach(id=>{
      const el = document.getElementById(id);
      if(!el || el.dataset.boundRepFilter==='1') return;
      el.dataset.boundRepFilter = '1';
      const key = map[id];
      const evt = (el.tagName==='INPUT' && (el.type==='search'||el.type==='text')) ? 'input' : 'change';
      el.addEventListener(evt, ()=>{
        if(typeof reportsState==='undefined' || !reportsState) return;
        reportsState[key] = el.value||'';
        if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
      });
    });
    const clearAll = ()=>{
      if(typeof reportsState==='undefined' || !reportsState) return;
      ['fQ','fIns','fLic','fCard','fStatus','fDept','fContract','fContractSt','fJob','fProject','fSup','fGrade','fOwnership','fType','fPlate',
       'fOpQ','fOpKind','fOpType','fOpProject','fOpStatus','fOpBal'].forEach(k=>{ reportsState[k]=''; });
      if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
    };
    ['repFClear','repFOpClear'].forEach(id=>{
      const clr = document.getElementById(id);
      if(clr && clr.dataset.boundRepFilter!=='1'){
        clr.dataset.boundRepFilter = '1';
        clr.addEventListener('click', clearAll);
      }
    });
  })();
}

function initReportsEvents(){ if(typeof bindReportsPage==="function") bindReportsPage(); }
