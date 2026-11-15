/* المستحقات — موظفين · مشرفين · عمال · سائقين · معدات */

/** لوحات المستحقات / اليوميات */
const DUES_KIND_BOARDS = [
  { id:'employees', label:'الموظفين', icon:'👔', entityKind:'employee' },
  { id:'supervisors', label:'المشرفون', icon:'👷', entityKind:'supervisor' },
  { id:'workers', label:'العمال', icon:'🧑‍🔧', entityKind:'worker' },
  { id:'drivers', label:'السائقون', icon:'🧑‍🚒', entityKind:'driver' },
  { id:'equipment', label:'المعدات والمركبات', icon:'🛻', entityKind:'equipment' }
];

function duesEntityKind(tabId){
  const b = DUES_KIND_BOARDS.find(x=>x.id===tabId);
  return b ? b.entityKind : (tabId||'worker');
}

function duesListForKind(tabId){
  if(tabId==='employees') return (DATA.employees||[]).slice();
  if(tabId==='supervisors') return (DATA.supervisors||[]).slice();
  if(tabId==='workers') return (DATA.workers||[]).slice();
  if(tabId==='drivers') return (DATA.drivers||[]).slice();
  if(tabId==='equipment') return (DATA.equipment||[]).filter(e=>e.status!=='sold'&&e.status!=='scrapped'&&e.status!=='retired');
  return [];
}

function renderDuesKindBoards(){
  return `<div class="board-grid exp-kind-boards">
    ${DUES_KIND_BOARDS.map(t=>{
      const list = duesListForKind(t.id);
      const deps = typeof departmentsForKind==='function' ? departmentsForKind(t.entityKind) : [];
      return `<button type="button" class="board-card dues-kind-board" data-dues-tab="${t.id}">
        <div class="board-card-icon">${t.icon}</div>
        <div class="board-card-title">${escapeHtml(t.label)}</div>
        <div class="board-card-meta">
          <span>${list.length} سجل</span>
          <span>${deps.length} قسم</span>
        </div>
      </button>`;
    }).join('')}
  </div>`;
}

function renderDuesDeptBoards(tabId){
  const entityKind = duesEntityKind(tabId);
  const label = (DUES_KIND_BOARDS.find(x=>x.id===tabId)||{}).label || tabId;
  const list = duesListForKind(tabId);
  const deps = typeof departmentsForKind==='function' ? departmentsForKind(entityKind) : [];
  const noneCnt = list.filter(p=>!((p.departmentId||p.categoryId)||'').toString().trim()).length;
  const cards = [];
  cards.push(`<button type="button" class="board-card dues-dept-board" data-dues-dept="">
    <div class="board-card-icon">📂</div>
    <div class="board-card-title">الكل</div>
    <div class="board-card-meta"><span>${list.length} سجل</span></div>
  </button>`);
  cards.push(`<button type="button" class="board-card dues-dept-board" data-dues-dept="__none__">
    <div class="board-card-icon">📭</div>
    <div class="board-card-title">بدون قسم</div>
    <div class="board-card-meta"><span>${noneCnt} سجل</span></div>
  </button>`);
  deps.forEach(d=>{
    const cnt = list.filter(p=>String(p.departmentId||p.categoryId||'')===String(d.id)).length;
    cards.push(`<button type="button" class="board-card dues-dept-board" data-dues-dept="${escapeHtml(d.id)}">
      <div class="board-card-icon">📁</div>
      <div class="board-card-title">${escapeHtml(d.name||'')}</div>
      <div class="board-card-meta"><span>${cnt} سجل</span></div>
    </button>`);
  });
  return `
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
      <div>
        <button type="button" class="btn btn-outline btn-sm" id="btnDuesBackKinds">← كل المستحقات</button>
        <h2 class="page-title" style="margin:10px 0 0;">${escapeHtml(label)}</h2>
        <p class="page-sub" style="margin:4px 0 0;">أقسام مرتبطة بصفحة ${escapeHtml(label)} — اضغط لوحة للعرض</p>
      </div>
    </div>
    <div class="board-grid exp-sec-boards">${cards.join('')}</div>`;
}

function renderWorkerDuesPage(){
  try{
    if(typeof setPageExport==='function') setPageExport('dues', ['ملاحظة'], [['صدّر من اللوحة الحالية بعد العرض']]);
  }catch(_e){}

  const from = workerAttFilters.from || '';
  const to = workerAttFilters.to || '';
  const tab = window.__duesTab || '';
  const dept = window.__duesDept; // undefined = لم يُختر بعد، '' = الكل، __none__ = بدون قسم

  // المستوى 1: لوحات الأنواع
  if(!tab){
    return `<div class="page">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div>
          <h2 class="page-title" style="margin:0;">المستحقات</h2>
          <p class="page-sub" style="margin:4px 0 0;">اختر فئة — الأقسام مرتبطة بصفحات الناس والمعدات</p>
        </div>
        <div class="btn-row">
          ${typeof pageExportButtonsHtml==='function'?pageExportButtonsHtml():''}
        </div>
      </div>
      ${renderDuesKindBoards()}
    </div>`;
  }

  // المستوى 2: لوحات الأقسام
  if(dept === undefined || dept === null){
    return `<div class="page">${renderDuesDeptBoards(tab)}</div>`;
  }

  // المستوى 3: الجدول
  const label = (DUES_KIND_BOARDS.find(x=>x.id===tab)||{}).label || tab;
  const deptName = dept==='' ? 'الكل' : (dept==='__none__' ? 'بدون قسم' : (typeof departmentName==='function'?departmentName(dept):dept));

  return `<div class="page">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
      <div>
        <button type="button" class="btn btn-outline btn-sm" id="btnDuesBackDepts">← أقسام ${escapeHtml(label)}</button>
        <h2 class="page-title" style="margin:10px 0 0;">${escapeHtml(label)} — ${escapeHtml(deptName||'')}</h2>
        <p class="page-sub" style="margin:4px 0 0;">حسب الفترة المحددة</p>
      </div>
      <div class="btn-row">
        ${typeof pageExportButtonsHtml==='function'?pageExportButtonsHtml():''}
        <button class="btn btn-primary" id="btnAddWPay" ${readOnlyMode?'disabled':''}>💵 دفع مستحق</button>
        <button class="btn btn-outline" id="btnAddWExtras" ${readOnlyMode?'disabled':''}>بدلات ومكافآت</button>
        <button class="btn btn-outline" id="btnAddWPen" ${readOnlyMode?'disabled':''}>⚠️ خصم / جزاء</button>
      </div>
    </div>
    <div class="filters-bar">
      <label style="font-size:13px;">من <input type="date" id="duesFrom" class="input" value="${escapeHtml(from)}"></label>
      <label style="font-size:13px;">إلى <input type="date" id="duesTo" class="input" value="${escapeHtml(to)}"></label>
      <button class="btn btn-outline btn-sm" id="duesApply">تطبيق</button>
      <input type="search" id="duesWorkerSearch" class="input" placeholder="بحث بالاسم أو الكود..." value="${escapeHtml(window.__duesWorkerQ||'')}" style="min-width:180px;">
    </div>
    ${tab==='employees' ? renderDuesEmployees(from,to) : ''}
    ${tab==='supervisors' ? renderDuesSupervisors(from,to) : ''}
    ${tab==='workers' ? renderDuesWorkers(from,to) : ''}
    ${tab==='drivers' ? renderDuesDrivers(from,to) : ''}
    ${tab==='equipment' ? renderDuesEquipment(from,to) : ''}
    ${renderDuesPaymentsList(tab, from, to)}
  </div>`;
}


function renderDuesPaymentsList(tab, from, to){
  const typeMap = {
    workers:'worker', supervisors:'supervisor', drivers:'driver',
    employees:'employee', equipment:'equipment'
  };
  const personType = typeMap[tab];
  if(!personType) return '';

  let list = [];
  if(personType==='employee'){
    // صرف من workerPayments + خصم من employeePenalties
    (DATA.workerPayments||[]).forEach(p=>{
      if(p.personType==='employee' && p.personId){
        if(from && (p.date||'')<from) return;
        if(to && (p.date||'')>to) return;
        list.push(Object.assign({}, p, {
          _src:'pay',
          _name: typeof employeeName==='function'?employeeName(p.personId):p.personId
        }));
      }
    });
    (DATA.employeePenalties||[]).forEach(p=>{
      if(!p.employeeId) return;
      if(from && (p.date||'')<from) return;
      if(to && (p.date||'')>to) return;
      list.push({
        id: p.id, date: p.date, amount: p.amount, notes: p.notes||'',
        type: 'penalty', payCategory: p.reason||'خصم', reason: p.reason,
        personType:'employee', personId: p.employeeId, _src:'empPen',
        _name: typeof employeeName==='function'?employeeName(p.employeeId):p.employeeId
      });
    });
  } else {
    list = (DATA.workerPayments||[]).filter(p=>{
      if(personType==='worker') return p.personType==='worker' || (!p.personType && p.workerId);
      return p.personType===personType;
    });
    if(from) list = list.filter(p=>(p.date||'')>=from);
    if(to) list = list.filter(p=>(p.date||'')<=to);
    list = list.map(p=>{
      let nm = '';
      if(p.personType==='supervisor') nm = typeof supervisorName==='function'?supervisorName(p.personId):'';
      else if(p.personType==='driver') nm = typeof driverName==='function'?driverName(p.personId):'';
      else if(p.personType==='employee') nm = typeof employeeName==='function'?employeeName(p.personId):'';
      else if(p.personType==='equipment'){
        const eq = typeof getEquipment==='function'?getEquipment(p.personId):(DATA.equipment||[]).find(x=>x.id===p.personId);
        nm = eq ? (eq.typeLabel||eq.name||eq.code||'') : '';
      } else nm = typeof workerName==='function'?workerName(p.workerId||p.personId):'';
      return Object.assign({}, p, { _name: nm, _src:'pay' });
    });
  }
  list = list.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));

  // فلتر بالبحث إن وُجد
  const q = (window.__duesWorkerQ||'').trim().toLowerCase();
  if(q) list = list.filter(p=>smartMatch(p._name, q) || smartMatch(p.payCategory, q) || smartMatch(p.notes, q) || smartMatch(p.reason, q));

  const totalPay = list.filter(p=>p.type!=='penalty'&&p.type!=='deduction'&&p.type!=='bonus'&&p.type!=='allowance').reduce((s,p)=>s+toInt(p.amount),0);
  const totalPen = list.filter(p=>p.type==='penalty'||p.type==='deduction').reduce((s,p)=>s+toInt(p.amount),0);
  const totalBonus = list.filter(p=>p.type==='bonus'||p.type==='allowance').reduce((s,p)=>s+toInt(p.amount),0);

  const pg = paginateRows(list, 'duesPays_'+tab);
  const scopeLbl = (p)=>{
    if(p.scope==='self') return 'للشخص فقط';
    if(p.scope==='workers') return 'توزيع على العمال';
    if(p.scope==='close_account') return 'إقفال حساب كامل';
    return '—';
  };
  const typeLbl = (p)=>{
    if(p.type==='penalty'||p.type==='deduction') return 'خصم / جزاء';
    if(p.type==='bonus'||p.type==='allowance') return 'إضافة / مكافأة';
    const k = p.payKind||'';
    if(k==='salary') return 'راتب';
    if(k==='salary_bonus') return 'راتب مع إضافات';
    if(k==='daily') return 'يومية';
    return 'دفع مستحق';
  };
  const itemLbl = (p)=> p.payCategory || p.reason || (p.type==='penalty'?'خصم':'دفع مستحقات');
  const salaryAmt = (p)=>{
    if(p.type==='penalty'||p.type==='deduction') return 0;
    if(p.salaryAmount!=null && p.salaryAmount!=='') return toInt(p.salaryAmount);
    if(p.payKind==='salary' || (p.payCategory==='راتب' && !p.isExtra)) return toInt(p.amount);
    return 0;
  };
  const extrasAmt = (p)=>{
    if(p.type==='penalty'||p.type==='deduction') return 0;
    if(p.extrasAmount!=null && p.extrasAmount!=='') return toInt(p.extrasAmount);
    if(p.isExtra || (p.payKind==='salary_bonus' && p.payCategory!=='راتب')) return toInt(p.amount);
    return 0;
  };

  try{
    if(typeof setPageExport==='function'){
      // لا نستبدل تصدير الجدول الرئيسي — سجل منفصل عبر اسم مختلف لو لزم
    }
  }catch(_e){}

  return `
    <div class="section-title" style="margin-top:28px;">سجل الصرف والخصومات
      <span style="font-weight:600;font-size:13px;color:var(--ink-soft);"> — حسب الفترة والبحث</span>
    </div>
    <div class="stats-row" style="margin-bottom:10px;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;">
      <div class="stat-card"><div class="num">${list.length}</div><div class="lbl">عدد السجلات</div></div>
      <div class="stat-card"><div class="num">${fmtMoney(totalPay)}</div><div class="lbl">إجمالي الصرف</div></div>
      <div class="stat-card debt"><div class="num">${fmtMoney(totalPen)}</div><div class="lbl">إجمالي الخصم</div></div>
    </div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr>
        <th>التاريخ</th><th>الاسم</th><th>نوع المستحق</th><th>البند</th><th>الراتب</th><th>بدلات ومكافآت</th><th>المستحق</th><th>النطاق</th><th>ملاحظات</th><th></th>
      </tr></thead>
      <tbody>
        ${pg.pageRows.length? pg.pageRows.map(p=>{
          const isPen = p.type==='penalty'||p.type==='deduction';
          const sal = salaryAmt(p);
          const ext = extrasAmt(p);
          return `<tr>
          <td>${fmtDate(p.date)}</td>
          <td><strong>${escapeHtml(p._name||'—')}</strong></td>
          <td><span style="color:${isPen?'var(--debt,#c1121f)':(p.type==='bonus'||p.type==='allowance')?'#0077b6':'#1B4332'};font-weight:700;">${typeLbl(p)}</span></td>
          <td>${escapeHtml(itemLbl(p))}</td>
          <td>${sal?fmtMoney(sal):'—'}</td>
          <td>${ext?fmtMoney(ext):'—'}</td>
          <td><strong>${fmtMoney(p.amount)}</strong></td>
          <td>${escapeHtml(scopeLbl(p))}</td>
          <td>${escapeHtml(p.notes||'')}</td>
          <td><button class="btn btn-outline btn-sm btn-del-pay" data-id="${p.id}" data-src="${p._src||'pay'}" ${readOnlyMode?'disabled':''}>🗑️</button></td>
        </tr>`;
        }).join('') : '<tr><td colspan="10" style="text-align:center;color:var(--ink-soft);padding:20px;">لا صرف أو خصم في الفترة</td></tr>'}
      </tbody>
    </table></div>
    ${tablePagerHtml('duesPays_'+tab, pg)}`;
}

function renderDuesWorkers(from, to){
  // export set later after rows built

  const q = (window.__duesWorkerQ||'').trim().toLowerCase();
  let workers = sortByNameAr((DATA.workers||[]).slice(), w=>w.name);
  if(typeof filterByDeptFilter==='function' && window.__duesDept !== undefined && window.__duesDept !== null)
    workers = filterByDeptFilter(workers, window.__duesDept);
  if(q) workers = workers.filter(w=>smartMatch(w.name, q)||smartMatch(w.code, q));
  const rows = workers.map(w=>{
    const days = workerDaysWorked(w.id, from||undefined, to||undefined);
    const absent = toInt(workerDaysAbsent(w.id, from||undefined, to||undefined));
    const baseDue = workerDueAmount(w.id, from||undefined, to||undefined);
    const paid = workerPaidTotal(w.id, from||undefined, to||undefined);
    const penalty = workerPenaltyTotal(w.id, from||undefined, to||undefined);
    const extras = typeof personExtrasTotal==='function' ? personExtrasTotal('worker', w.id, from||undefined, to||undefined) : 0;
    const expenses = typeof personExpensesTotal==='function' ? personExpensesTotal('worker', w.id, from||undefined, to||undefined) : 0;
    const due = toInt(baseDue + extras); // المستحق = أجر الأيام + إضافات
    const bal = workerBalance(w.id, from||undefined, to||undefined);
    return { w, days, absent, baseDue, due, paid, penalty, extras, expenses, bal };
  }).filter(r => r.days>0 || r.absent>0 || r.paid>0 || r.penalty>0 || r.extras>0 || r.expenses>0 || r.bal!==0 || true);
  if(typeof setPageExport==='function') setPageExport('dues-workers',
    ['الكود','الاسم','المشرف','اليومية','أيام العمل','غياب','بدلات ومكافآت','المستحق','خصم / جزاء','المصاريف','المدفوع','المتبقي','حالة'],
    rows.map(r=>[r.w.code,r.w.name,supervisorName(r.w.supervisorId),toInt(r.w.dailyWage),r.days,r.absent,r.extras,r.due,r.penalty,r.expenses,r.paid,r.bal,(r.paid>0&&r.bal<=0)?'تم الدفع':'']));
  const pg = paginateRows(rows, 'duesWorkers');
  const totalDue = rows.reduce((s,r)=>s+r.due,0);
  const totalPaid = rows.reduce((s,r)=>s+r.paid,0);
  const totalBal = rows.reduce((s,r)=>s+r.bal,0);
  return `
    <div class="stats-row" style="margin-bottom:12px;">
      <div class="stat-card"><div class="num">${fmtMoney(totalDue)}</div><div class="lbl">المستحق</div></div>
      <div class="stat-card"><div class="num">${fmtMoney(totalPaid)}</div><div class="lbl">المدفوع</div></div>
      <div class="stat-card ${totalBal>0?'debt':''}"><div class="num">${fmtMoney(totalBal)}</div><div class="lbl">المتبقي</div></div>
    </div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>الكود</th><th>الاسم</th><th>المشرف</th><th>اليومية</th><th>أيام العمل</th><th>غياب</th><th>بدلات ومكافآت</th><th>المستحق</th><th>خصم / جزاء</th><th>المصاريف</th><th>المدفوع</th><th>المتبقي</th><th>حالة</th><th></th></tr></thead>
      <tbody>
        ${pg.pageRows.length? pg.pageRows.map(r=>`<tr>
          <td>${escapeHtml(r.w.code||'')}</td>
          <td><strong>${escapeHtml(r.w.name||'')}</strong> ${typeof duesPaidBadge==='function'?duesPaidBadge(r.due,r.paid,r.bal):''}</td>
          <td>${escapeHtml(supervisorName(r.w.supervisorId))}</td>
          <td>${fmtMoney(r.w.dailyWage)}</td>
          <td>${fmtDays(r.days)}</td>
          <td>${fmtNum(r.absent)}</td>
          <td>${fmtMoney(r.extras)}</td>
          <td>${fmtMoney(r.due)}</td>
          <td>${fmtMoney(r.penalty)}</td>
          <td>${fmtMoney(r.expenses)}</td>
          <td>${fmtMoney(r.paid)}</td>
          <td style="color:${r.bal>0?'var(--debt)':''}"><strong>${fmtMoney(r.bal)}</strong></td>
          <td>${r.paid>0&&r.bal<=0?'<span class="dues-paid-badge">✓ تم الدفع</span>':'—'}</td>
          <td style="white-space:nowrap;">
            <button class="btn btn-outline btn-sm btn-pay-wrk" data-id="${r.w.id}">💵 دفع مستحق</button>
            <button class="btn btn-outline btn-sm btn-pen-wrk" data-id="${r.w.id}">⚠️ خصم</button>
            <button class="btn btn-outline btn-sm btn-pdf-wrk" data-id="${r.w.id}">🧾 كشف حساب</button>
          </td>
        </tr>`).join('') : '<tr><td colspan="14" style="text-align:center;color:var(--ink-soft);padding:24px;">لا بيانات</td></tr>'}
      </tbody>
    </table></div>
    ${tablePagerHtml('duesWorkers', pg)}`;
}

function renderDuesSupervisors(from, to){
  const q = (window.__duesWorkerQ||'').trim().toLowerCase();
  let list = sortByNameAr((DATA.supervisors||[]).slice(), s=>s.name);
  if(typeof filterByDeptFilter==='function' && window.__duesDept !== undefined && window.__duesDept !== null)
    list = filterByDeptFilter(list, window.__duesDept);
  if(q) list = list.filter(s=>smartMatch(s.name, q)||smartMatch(s.code, q));
  const rows = list.map(s=>{
    const st = typeof supervisorWageStatement==='function'
      ? supervisorWageStatement(s.id, from||undefined, to||undefined)
      : { ownDays:0, ownDue:0, ownPaid:0, workersDue:0, workersPaid:0, expenses:0, equipCost:0, totalDue:0, totalPaid:0, totalBal:0 };
    // كل الأرقام من كشف الحساب نفسه (مصدر واحد) — البدلات كانت بتتحسب مرتين هنا
    const days = st.ownDays||0;
    const extras = st.ownExtras||0;                 // بدلات + تكاليف المشرف
    const baseDue = st.ownBaseDue||0;               // يومية المشرف نفسه
    const due = st.ownDue||0;                       // يومية + بدلات + تكاليف
    const workersDue = st.workersDue||0;
    const equipCost = st.equipCost||0;
    const expenses = st.totalExpenses||0;           // مصاريف المشرف + عماله
    const penalty = st.totalPenalty||0;             // جزاءات المشرف + عماله
    const paid = st.totalPaid||0;                   // مدفوع للمشرف + عماله + معداته
    const bal = st.totalBal||0;                     // المتبقي = المستحق − الجزاءات − المصاريف − المدفوع
    return { s, days, baseDue, due, paid, penalty, bal, expenses, workersDue, equipCost, extras, totalDue: st.totalDue||0 };
  });
  if(typeof setPageExport==='function') setPageExport('dues-supervisors',
    ['الكود','الاسم','اليومية','أيام','بدلات ومكافآت','مستحق المشرف','مستحق العمال','مصاريف','معدات','خصم / جزاء','المدفوع','المتبقي','حالة'],
    rows.map(r=>[r.s.code,r.s.name,toInt(r.s.dailyWage),r.days,r.extras,r.due,r.workersDue,r.expenses,r.equipCost,r.penalty,r.paid,r.bal,(r.paid>0&&r.bal<=0)?'تم الدفع':'']));
  const pg = paginateRows(rows, 'duesSup');
  const totalDue = rows.reduce((s,r)=>s+(r.totalDue||0),0);
  const totalPaid = rows.reduce((s,r)=>s+r.paid,0);
  const totalBal = rows.reduce((s,r)=>s+r.bal,0);
  return `
    <div class="stats-row" style="margin-bottom:12px;">
      <div class="stat-card"><div class="num">${fmtMoney(totalDue)}</div><div class="lbl">إجمالي المستحقات</div></div>
      <div class="stat-card"><div class="num">${fmtMoney(totalPaid)}</div><div class="lbl">المدفوع</div></div>
      <div class="stat-card ${totalBal>0?'debt':''}"><div class="num">${fmtMoney(totalBal)}</div><div class="lbl">المتبقي</div></div>
    </div>
    <div class="table-wrap" style="overflow:auto;"><table class="data-table">
      <thead><tr>
        <th>الكود</th><th>الاسم</th><th>اليومية</th><th>أيام</th>
        <th>بدلات ومكافآت</th><th>مستحق المشرف</th><th>مستحق العمال</th><th>مصاريف</th><th>معدات</th>
        <th>خصم / جزاء</th><th>المدفوع</th><th>المتبقي</th><th>حالة</th><th></th>
      </tr></thead>
      <tbody>
        ${pg.pageRows.length? pg.pageRows.map(r=>`<tr>
          <td>${escapeHtml(r.s.code||'')}</td>
          <td><strong>${escapeHtml(r.s.name||'')}</strong> ${typeof duesPaidBadge==='function'?duesPaidBadge(r.totalDue||r.due,r.paid,r.bal):''}</td>
          <td>${fmtMoney(r.s.dailyWage)}</td>
          <td>${fmtDays(r.days)}</td>
          <td>${fmtMoney(r.extras)}</td>
          <td>${fmtMoney(r.due)}</td>
          <td>${fmtMoney(r.workersDue)}</td>
          <td>${fmtMoney(r.expenses)}</td>
          <td>${fmtMoney(r.equipCost)}</td>
          <td>${fmtMoney(r.penalty)}</td>
          <td>${fmtMoney(r.paid)}</td>
          <td style="color:${r.bal>0?'var(--debt)':''}"><strong>${fmtMoney(r.bal)}</strong></td>
          <td>${r.paid>0&&r.bal<=0?'<span class="dues-paid-badge">✓ تم الدفع</span>':'—'}</td>
          <td style="white-space:nowrap;">
            <button class="btn btn-outline btn-sm btn-pay-sup" data-id="${r.s.id}">💵 دفع مستحق</button>
            <button class="btn btn-outline btn-sm btn-pen-sup" data-id="${r.s.id}">⚠️ خصم</button>
            <button class="btn btn-outline btn-sm btn-days-sup" data-id="${r.s.id}">🧾 كشف أيام</button>
            <button class="btn btn-outline btn-sm btn-stmt-sup-dues" data-id="${r.s.id}">🧾 كشف حساب</button>
          </td>
        </tr>`).join('') : '<tr><td colspan="14" style="text-align:center;color:var(--ink-soft);padding:24px;">لا بيانات</td></tr>'}
      </tbody>
    </table></div>
    ${tablePagerHtml('duesSup', pg)}`;
}

function renderDuesDrivers(from, to){
  const q = (window.__duesWorkerQ||'').trim().toLowerCase();
  let list = sortByNameAr((DATA.drivers||[]).filter(d=>d.status!=='inactive'), d=>d.name);
  if(typeof filterByDeptFilter==='function' && window.__duesDept !== undefined && window.__duesDept !== null)
    list = filterByDeptFilter(list, window.__duesDept);
  if(q) list = list.filter(d=>smartMatch(d.name, q)||smartMatch(d.code, q));
  const rows = list.map(d=>{
    const days = typeof driverDaysWorked==='function' ? driverDaysWorked(d.id, from||undefined, to||undefined) : 0;
    const baseDue = typeof driverDueAmount==='function' ? driverDueAmount(d.id, from||undefined, to||undefined) : 0;
    const paid = typeof driverPaidTotal==='function' ? driverPaidTotal(d.id, from||undefined, to||undefined) : 0;
    const penalty = typeof driverPenaltyTotal==='function' ? driverPenaltyTotal(d.id, from||undefined, to||undefined) : 0;
    const extras = typeof personExtrasTotal==='function' ? personExtrasTotal('driver', d.id, from||undefined, to||undefined) : 0;
    const expenses = typeof personExpensesTotal==='function' ? personExpensesTotal('driver', d.id, from||undefined, to||undefined) : 0;
    const due = toInt(baseDue + extras);
    const bal = typeof driverBalance==='function' ? driverBalance(d.id, from||undefined, to||undefined) : toInt(due-paid-penalty-expenses);
    return { d, days, absent:0, baseDue, due, paid, penalty, extras, expenses, bal };
  });
  try{
    if(typeof setPageExport==='function') setPageExport('dues-drivers',
      ['الكود','الاسم','اليومية','أيام العمل','غياب','بدلات ومكافآت','المستحق','خصم / جزاء','المصاريف','المدفوع','المتبقي','حالة'],
      rows.map(r=>[r.d.code,r.d.name,toInt(r.d.dailyWage),r.days,0,r.extras,r.due,r.penalty,r.expenses,r.paid,r.bal,(r.paid>0&&r.bal<=0)?'تم الدفع':'']));
  }catch(_e){}
  const pg = paginateRows(rows, 'duesDrv');
  const totalDue = rows.reduce((s,r)=>s+r.due,0);
  const totalPaid = rows.reduce((s,r)=>s+r.paid,0);
  const totalBal = rows.reduce((s,r)=>s+r.bal,0);
  return `
    <div class="stats-row" style="margin-bottom:12px;">
      <div class="stat-card"><div class="num">${fmtMoney(totalDue)}</div><div class="lbl">المستحق</div></div>
      <div class="stat-card"><div class="num">${fmtMoney(totalPaid)}</div><div class="lbl">المدفوع</div></div>
      <div class="stat-card ${totalBal>0?'debt':''}"><div class="num">${fmtMoney(totalBal)}</div><div class="lbl">المتبقي</div></div>
    </div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>الكود</th><th>الاسم</th><th>اليومية</th><th>أيام العمل</th><th>غياب</th><th>بدلات ومكافآت</th><th>المستحق</th><th>خصم / جزاء</th><th>المصاريف</th><th>المدفوع</th><th>المتبقي</th><th>حالة</th><th></th></tr></thead>
      <tbody>
        ${pg.pageRows.length? pg.pageRows.map(r=>`<tr>
          <td>${escapeHtml(r.d.code||'')}</td>
          <td><strong>${escapeHtml(r.d.name||'')}</strong> ${typeof duesPaidBadge==='function'?duesPaidBadge(r.due,r.paid,r.bal):''}</td>
          <td>${fmtMoney(r.d.dailyWage)}</td>
          <td>${fmtDays(r.days)}</td>
          <td>0</td>
          <td>${fmtMoney(r.extras)}</td>
          <td>${fmtMoney(r.due)}</td>
          <td>${fmtMoney(r.penalty)}</td>
          <td>${fmtMoney(r.expenses)}</td>
          <td>${fmtMoney(r.paid)}</td>
          <td style="color:${r.bal>0?'var(--debt)':''}"><strong>${fmtMoney(r.bal)}</strong></td>
          <td>${r.paid>0&&r.bal<=0?'<span class="dues-paid-badge">✓ تم الدفع</span>':'—'}</td>
          <td style="white-space:nowrap;">
            <button class="btn btn-outline btn-sm btn-pay-drv" data-id="${r.d.id}">💵 دفع مستحق</button>
            <button class="btn btn-outline btn-sm btn-pen-drv" data-id="${r.d.id}">⚠️ خصم</button>
            <button class="btn btn-outline btn-sm btn-acc-drv" data-id="${r.d.id}">🧾 كشف حساب</button>
          </td>
        </tr>`).join('') : '<tr><td colspan="13" style="text-align:center;color:var(--ink-soft);padding:24px;">لا بيانات</td></tr>'}
      </tbody>
    </table></div>
    ${tablePagerHtml('duesDrv', pg)}`;
}

function renderDuesEquipment(from, to){
  const q = (window.__duesWorkerQ||'').trim().toLowerCase();
  let list = sortByNameAr((DATA.equipment||[]).slice(), eq=>eq.name);
  if(typeof filterByDeptFilter==='function' && window.__duesDept !== undefined && window.__duesDept !== null)
    list = filterByDeptFilter(list, window.__duesDept);
  if(q) list = list.filter(eq=>smartMatch(eq.name, q)||smartMatch(eq.code, q));
  const rows = list.map(eq=>{
    const logs = (DATA.equipmentDaily||[]).filter(d=>{
      if(d.equipmentId!==eq.id) return false;
      if(from && (d.date||'')<from) return false;
      if(to && (d.date||'')>to) return false;
      return true;
    });
    const days = logs.length;
    const hours = logs.reduce((s,d)=>s+(Number(d.hours)||0),0);
    const due = toInt(logs.reduce((s,d)=>s+equipmentDailyCost(d,eq),0));
    const paid = toInt((DATA.workerPayments||[]).filter(p=>{
      if(p.personType!=='equipment'||p.personId!==eq.id) return false;
      if(typeof isActualPayment==='function' ? !isActualPayment(p) : (p.type==='penalty'||p.type==='deduction'||p.type==='bonus'||p.type==='allowance')) return false;
      if(from && (p.date||'')<from) return false;
      if(to && (p.date||'')>to) return false;
      return true;
    }).reduce((s,p)=>s+toInt(p.amount),0));
    const penalty = toInt((DATA.workerPayments||[]).filter(p=>{
      if(p.personType!=='equipment'||p.personId!==eq.id) return false;
      if(p.type!=='penalty'&&p.type!=='deduction') return false;
      if(from && (p.date||'')<from) return false;
      if(to && (p.date||'')>to) return false;
      return true;
    }).reduce((s,p)=>s+toInt(p.amount),0));
    const expenses = typeof personExpensesTotal==='function' ? personExpensesTotal('equipment', eq.id, from||undefined, to||undefined) : 0;
    const extras = typeof personExtrasTotal==='function' ? personExtrasTotal('equipment', eq.id, from||undefined, to||undefined) : 0;
    const baseDue = due;
    const dueTotal = toInt(baseDue + extras);
    const bal = toInt(dueTotal - paid - penalty - expenses); // المصاريف تُخصم
    return { eq, days, hours, baseDue, due: dueTotal, paid, penalty, extras, expenses, bal };
  }).filter(r=>r.days>0 || r.due>0 || r.paid>0 || r.extras>0 || r.expenses>0 || true);
  try{
    if(typeof setPageExport==='function') setPageExport('dues-equipment',
      ['الكود','الاسم','المشرف','تكلفة/س','أيام التشغيل','ساعات','بدلات ومكافآت','المستحق (تكلفة)','خصم / جزاء','المصاريف','المدفوع','المتبقي','حالة'],
      rows.map(r=>[r.eq.code,r.eq.name,supervisorName(r.eq.supervisorId),toInt(r.eq.hourlyCost),r.days,Math.round(r.hours*10)/10,r.extras,r.due,r.penalty,r.expenses,r.paid,r.bal,(r.paid>0&&r.bal<=0)?'تم الدفع':'']));
  }catch(_e){}
  const pg = paginateRows(rows, 'duesEq');
  const totalDue = rows.reduce((s,r)=>s+r.due,0);
  return `
    <div class="stats-row" style="margin-bottom:12px;">
      <div class="stat-card"><div class="num">${fmtMoney(totalDue)}</div><div class="lbl">تكلفة التشغيل</div></div>
    </div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>الكود</th><th>الاسم</th><th>المشرف</th><th>تكلفة/س</th><th>أيام التشغيل</th><th>ساعات</th><th>بدلات ومكافآت</th><th>المستحق (تكلفة)</th><th>خصم / جزاء</th><th>المصاريف</th><th>المدفوع</th><th>المتبقي</th><th>حالة</th><th></th></tr></thead>
      <tbody>
        ${pg.pageRows.length? pg.pageRows.map(r=>`<tr>
          <td>${escapeHtml(r.eq.code||'')}</td>
          <td><strong>${escapeHtml(r.eq.name||'')}</strong> ${typeof duesPaidBadge==='function'?duesPaidBadge(r.due,r.paid,r.bal):''}</td>
          <td>${escapeHtml(supervisorName(r.eq.supervisorId))}</td>
          <td>${fmtMoney(r.eq.hourlyCost)}</td>
          <td>${fmtNum(r.days)}</td>
          <td>${fmtNum(Math.round(r.hours*10)/10)}</td>
          <td>${fmtMoney(r.extras)}</td>
          <td>${fmtMoney(r.due)}</td>
          <td>${fmtMoney(r.penalty)}</td>
          <td>${fmtMoney(r.expenses)}</td>
          <td>${fmtMoney(r.paid)}</td>
          <td style="color:${r.bal>0?'var(--debt)':''}"><strong>${fmtMoney(r.bal)}</strong></td>
          <td>${r.paid>0&&r.bal<=0?'<span class="dues-paid-badge">✓ تم الدفع</span>':'—'}</td>
          <td style="white-space:nowrap;">
            <button class="btn btn-outline btn-sm btn-pay-eq" data-id="${r.eq.id}">💵 دفع مستحق</button>
            <button class="btn btn-outline btn-sm btn-pen-eq" data-id="${r.eq.id}">⚠️ خصم</button>
            <button class="btn btn-outline btn-sm btn-pdf-eq" data-id="${r.eq.id}">🧾 كشف حساب</button>
          </td>
        </tr>`).join('') : '<tr><td colspan="14" style="text-align:center;color:var(--ink-soft);padding:24px;">لا بيانات</td></tr>'}
      </tbody>
    </table></div>
    ${tablePagerHtml('duesEq', pg)}`;
}

function renderDuesEmployees(from, to){
  const q = (window.__duesWorkerQ||'').trim().toLowerCase();
  let list = sortByNameAr((DATA.employees||[]).slice(), e=>e.name);
  if(typeof filterByDeptFilter==='function' && window.__duesDept !== undefined && window.__duesDept !== null)
    list = filterByDeptFilter(list, window.__duesDept);
  if(q) list = list.filter(e=>smartMatch(e.name, q)||smartMatch(e.code, q));
  // رواتب من payroll في الفترة تقريباً بالشهر
  const rows = list.map(e=>{
    const payrolls = (DATA.payroll||[]).filter(p=>{
      if(p.employeeId!==e.id) return false;
      // فلترة بالفترة إن أمكن من year/month
      if(from || to){
        const ym = (p.year!=null && p.month!=null) ? (String(p.year)+'-'+String(p.month).padStart(2,'0')) : '';
        if(ym){
          if(from && ym < String(from).slice(0,7)) return false;
          if(to && ym > String(to).slice(0,7)) return false;
        }
      }
      return true;
    });
    const due = employeeDueAmount(e.id, from||undefined, to||undefined);
    const paid = toInt((DATA.workerPayments||[]).filter(p=>{
      if(p.personType!=='employee' || p.personId!==e.id) return false;
      if(typeof isActualPayment==='function' ? !isActualPayment(p) : (p.type==='penalty'||p.type==='deduction'||p.type==='bonus'||p.type==='allowance')) return false;
      if(from && (p.date||'')<from) return false;
      if(to && (p.date||'')>to) return false;
      return true;
    }).reduce((s,p)=>s+toInt(p.amount),0));
    const penalty = toInt((DATA.employeePenalties||[]).filter(p=>{
      if(p.employeeId!==e.id) return false;
      if(from && (p.date||'')<from) return false;
      if(to && (p.date||'')>to) return false;
      return true;
    }).reduce((s,p)=>s+toInt(p.amount),0))
    + toInt((DATA.workerPayments||[]).filter(p=>{
      if(p.personType!=='employee' || p.personId!==e.id) return false;
      if(p.type!=='penalty'&&p.type!=='deduction') return false;
      if(from && (p.date||'')<from) return false;
      if(to && (p.date||'')>to) return false;
      return true;
    }).reduce((s,p)=>s+toInt(p.amount),0));
    const extras = typeof personExtrasTotal==='function' ? personExtrasTotal('employee', e.id, from||undefined, to||undefined) : 0;
    const expenses = typeof personExpensesTotal==='function' ? personExpensesTotal('employee', e.id, from||undefined, to||undefined) : 0;
    // مربوط بحضور الموظفين
    const days = typeof employeeDaysWorked==='function' ? employeeDaysWorked(e.id, from||undefined, to||undefined) : 0;
    const absent = typeof employeeDaysAbsent==='function' ? employeeDaysAbsent(e.id, from||undefined, to||undefined) : 0;
    const baseDue = due;
    const dueTotal = toInt(baseDue + extras); // المستحق = الراتب + الإضافات
    const bal = toInt(dueTotal - paid - penalty - expenses); // المصاريف تُخصم
    return { e, days, absent, baseDue, due: dueTotal, paid, penalty, extras, expenses, bal };
  });
  try{
    if(typeof setPageExport==='function') setPageExport('dues-employees',
      ['الكود','الاسم','القسم','الراتب','أيام العمل','غياب','بدلات ومكافآت','المستحق','خصم / جزاء','المصاريف','المدفوع','المتبقي','حالة'],
      rows.map(r=>[r.e.code,r.e.name,departmentName(r.e.departmentId),toInt(r.e.salary),r.days,r.absent,r.extras,r.due,r.penalty,r.expenses,r.paid,r.bal,(r.paid>0&&r.bal<=0)?'تم الدفع':'']));
  }catch(_e){}
  const pg = paginateRows(rows, 'duesEmp');
  return `
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>الكود</th><th>الاسم</th><th>القسم</th><th>الراتب</th><th>أيام العمل</th><th>غياب</th><th>بدلات ومكافآت</th><th>المستحق</th><th>خصم / جزاء</th><th>المصاريف</th><th>المدفوع</th><th>المتبقي</th><th>حالة</th><th></th></tr></thead>
      <tbody>
        ${pg.pageRows.length? pg.pageRows.map(r=>`<tr>
          <td>${escapeHtml(r.e.code||'')}</td>
          <td><strong>${escapeHtml(r.e.name||'')}</strong> ${typeof duesPaidBadge==='function'?duesPaidBadge(r.due,r.paid,r.bal):''}</td>
          <td>${escapeHtml(departmentName(r.e.departmentId))}</td>
          <td>${fmtMoney(r.e.salary)}</td>
          <td>${typeof fmtDays==='function'?fmtDays(r.days):fmtNum(r.days)}</td>
          <td>${fmtNum(r.absent)}</td>
          <td>${fmtMoney(r.extras)}</td>
          <td>${fmtMoney(r.due)}</td>
          <td>${fmtMoney(r.penalty)}</td>
          <td>${fmtMoney(r.expenses)}</td>
          <td>${fmtMoney(r.paid)}</td>
          <td style="color:${r.bal>0?'var(--debt)':''}"><strong>${fmtMoney(r.bal)}</strong></td>
          <td>${r.paid>0&&r.bal<=0?'<span class="dues-paid-badge">✓ تم الدفع</span>':'—'}</td>
          <td style="white-space:nowrap;">
            <button class="btn btn-outline btn-sm btn-pay-emp" data-id="${r.e.id}">💵 دفع مستحق</button>
            <button class="btn btn-outline btn-sm btn-pen-emp" data-id="${r.e.id}">⚠️ خصم</button>
            <button class="btn btn-outline btn-sm btn-acc-emp" data-id="${r.e.id}">🧾 كشف حساب</button>
          </td>
        </tr>`).join('') : '<tr><td colspan="14" style="text-align:center;color:var(--ink-soft);padding:24px;">لا موظفين</td></tr>'}
      </tbody>
    </table></div>
    ${tablePagerHtml('duesEmp', pg)}`;
}

function initWorkerDuesEvents(){
  document.querySelectorAll('.btn-acc-emp').forEach(b=> b.addEventListener('click', ()=>{
    const from = document.getElementById('duesFrom')?.value||'';
    const to = document.getElementById('duesTo')?.value||'';
    if(typeof printEmployeeStatement==='function') printEmployeeStatement(b.getAttribute('data-id'), from||undefined, to||undefined);
    else showToast('ميزة الكشف غير متاحة');
  }));
  document.querySelectorAll('.dues-kind-board').forEach(b=> b.addEventListener('click', ()=>{
    window.__duesTab = b.getAttribute('data-dues-tab')||'';
    window.__duesDept = undefined; // عرض لوحات الأقسام
    rerenderCurrentPage();
  }));
  document.querySelectorAll('.dues-dept-board').forEach(b=> b.addEventListener('click', ()=>{
    window.__duesDept = b.getAttribute('data-dues-dept')||'';
    rerenderCurrentPage();
  }));
  document.getElementById('btnDuesBackKinds')?.addEventListener('click', ()=>{
    window.__duesTab = '';
    window.__duesDept = undefined;
    rerenderCurrentPage();
  });
  document.getElementById('btnDuesBackDepts')?.addEventListener('click', ()=>{
    window.__duesDept = undefined;
    rerenderCurrentPage();
  });
  const apply = document.getElementById('duesApply');
  if(apply) apply.addEventListener('click',()=>{
    workerAttFilters.from=document.getElementById('duesFrom')?.value||'';
    workerAttFilters.to=document.getElementById('duesTo')?.value||'';
    rerenderCurrentPage();
  });
  const ws = document.getElementById('duesWorkerSearch');
  if(ws){
    ws.addEventListener('input', ()=>{
      window.__duesWorkerQ = ws.value;
      if(window.__duesSearchTimer) clearTimeout(window.__duesSearchTimer);
      window.__duesSearchTimer = setTimeout(()=>{ rerenderCurrentPage(); }, 350);
    });
  }
  document.getElementById('btnAddWPay')?.addEventListener('click', ()=>{
    const tab = window.__duesTab || 'workers';
    const typeMap = { workers:'worker', supervisors:'supervisor', drivers:'driver', employees:'employee', equipment:'equipment' };
    const t = typeMap[tab] || 'worker';
    openUnifiedPayModal('pay', null, t);
  });
  document.getElementById('btnAddWExtras')?.addEventListener('click', ()=>{
    const tab = window.__duesTab || 'workers';
    const typeMap = { workers:'worker', supervisors:'supervisor', drivers:'driver', employees:'employee', equipment:'equipment' };
    const pt = typeMap[tab] || 'worker';
    // قائمة بدلات ومكافآت فقط (بدون راتب)
    openUnifiedPayModal('pay', null, pt, { extrasOnly: true, defaultPayKind: 'salary_bonus' });
  });
  document.getElementById('btnAddWPen')?.addEventListener('click', ()=>{
    const t = window.__duesTab || 'workers';
    openUnifiedPayModal('penalty', null, t==='workers'?'worker':t==='supervisors'?'supervisor':t==='drivers'?'driver':t==='employees'?'employee':t==='equipment'?'equipment':'worker');
  });
  document.querySelectorAll('.btn-pen-wrk').forEach(b=> b.addEventListener('click', ()=> openUnifiedPayModal('penalty', b.getAttribute('data-id'), 'worker')));
  document.querySelectorAll('.btn-pen-emp').forEach(b=> b.addEventListener('click', ()=> openUnifiedPayModal('penalty', b.getAttribute('data-id'), 'employee')));
  document.querySelectorAll('.btn-pen-eq').forEach(b=> b.addEventListener('click', ()=> openUnifiedPayModal('penalty', b.getAttribute('data-id'), 'equipment')));
  document.querySelectorAll('.btn-pen-sup').forEach(b=> b.addEventListener('click', ()=> openUnifiedPayModal('penalty', b.getAttribute('data-id'), 'supervisor')));
  document.querySelectorAll('.btn-pen-drv').forEach(b=> b.addEventListener('click', ()=> openUnifiedPayModal('penalty', b.getAttribute('data-id'), 'driver')));
  document.querySelectorAll('.btn-del-pay').forEach(b=> b.addEventListener('click', ()=>{
    confirmDelete().then(ok=>{ if(!ok) return;
      const id = b.getAttribute('data-id');
      const src = b.getAttribute('data-src')||'pay';
      if(src==='empPen'){
      DATA.employeePenalties = (DATA.employeePenalties||[]).filter(p=>p.id!==id);
      } else {
      DATA.workerPayments = (DATA.workerPayments||[]).filter(p=>p.id!==id);
      }
      saveData(true); showToast('تم الحذف'); rerenderCurrentPage();
    });
  }));
  document.querySelectorAll('.btn-pay-wrk').forEach(b=> b.addEventListener('click', ()=> openUnifiedPayModal('pay', b.getAttribute('data-id'), 'worker')));
  document.querySelectorAll('.btn-pay-emp').forEach(b=> b.addEventListener('click', ()=> openUnifiedPayModal('pay', b.getAttribute('data-id'), 'employee')));
  document.querySelectorAll('.btn-pay-eq').forEach(b=> b.addEventListener('click', ()=> openUnifiedPayModal('pay', b.getAttribute('data-id'), 'equipment')));
  document.querySelectorAll('.btn-pdf-wrk').forEach(b=> b.addEventListener('click', ()=>{
    const from = document.getElementById('duesFrom')?.value||'';
    const to = document.getElementById('duesTo')?.value||'';
    try{
      if(typeof printWorkerStatement==='function') printWorkerStatement(b.getAttribute('data-id'), from||undefined, to||undefined);
      else showToast('ميزة الكشف غير متاحة');
    }catch(e){ console.error(e); showToast('تعذر إنشاء الكشف'); }
  }));
  document.querySelectorAll('.btn-acc-drv').forEach(b=> b.addEventListener('click', ()=>{
    const from = document.getElementById('duesFrom')?.value||'';
    const to = document.getElementById('duesTo')?.value||'';
    if(typeof printDriverStatement==='function') printDriverStatement(b.getAttribute('data-id'), from||undefined, to||undefined);
  }));
  document.querySelectorAll('.btn-day-sup').forEach(b=> b.addEventListener('click', ()=> openWorkerAttModal(null,null,{kind:'supervisor',id:b.getAttribute('data-id')})));
  document.querySelectorAll('.btn-pay-sup').forEach(b=> b.addEventListener('click', ()=> openUnifiedPayModal('pay', b.getAttribute('data-id'), 'supervisor')));
  document.querySelectorAll('.btn-days-sup').forEach(b=> b.addEventListener('click', ()=>{
    const from = document.getElementById('duesFrom')?.value||'';
    const to = document.getElementById('duesTo')?.value||'';
    if(typeof printDaysStatement==='function') printDaysStatement('supervisor', b.getAttribute('data-id'), from||undefined, to||undefined);
  }));

  document.querySelectorAll('.btn-stmt-sup-dues').forEach(b=> b.addEventListener('click', ()=>{
    window.__supDetailId = b.getAttribute('data-id');
    if(typeof goToPage==='function') goToPage('supervisors');
  }));
  document.querySelectorAll('.btn-day-drv').forEach(b=> b.addEventListener('click', ()=> openWorkerAttModal(null,null,{kind:'driver',id:b.getAttribute('data-id')})));
  document.querySelectorAll('.btn-pay-drv').forEach(b=> b.addEventListener('click', ()=> openUnifiedPayModal('pay', b.getAttribute('data-id'), 'driver')));
  document.querySelectorAll('.btn-day-eq').forEach(b=> b.addEventListener('click', ()=>{
    if(typeof openEquipmentDailyModal==='function') openEquipmentDailyModal(b.getAttribute('data-id'));
  }));
  document.querySelectorAll('.btn-pdf-eq').forEach(b=> b.addEventListener('click', ()=>{
    const from = document.getElementById('duesFrom')?.value||'';
    const to = document.getElementById('duesTo')?.value||'';
    if(typeof printEquipmentAccountStatement==='function') printEquipmentAccountStatement(b.getAttribute('data-id'), from||undefined, to||undefined);
  }));
}
/** دفع مستحق (راتب / راتب+إضافات / يومية) أو خصم / جزاء */
function openUnifiedPayModal(mode, personId, forceType, opts){
  opts = opts || {};
  const extrasOnly = !!opts.extrasOnly;
  const defaultPayKind = extrasOnly ? 'salary_bonus' : (opts.defaultPayKind || 'salary');
  const isPen = mode==='penalty';
  const type0 = forceType || (window.__duesTab==='employees'?'employee':window.__duesTab==='supervisors'?'supervisor':window.__duesTab==='drivers'?'driver':window.__duesTab==='equipment'?'equipment':'worker');
  const id0 = personId || '';

  const defaultPayItems = ['مكافأة','بدل مواصلات','بدل إعاشة','حافز إنتاج','سلفة','بدل انتقال','بدل طبيعة عمل','بدل انتقالات','تصفية حساب','أخرى'];
  const defaultDailyItems = ['دفع يوميات','ساعات إضافية','حافز يومي','بدل انتقال','أخرى'];
  const defaultPenItems = ['تأخير','غياب','مخالفة','إهمال','جزاء إداري','خصم سلفة','أخرى'];

  function ensurePool(key, seedKey, defaults){
    if(!Array.isArray(DATA[key])) DATA[key] = [];
    if(!DATA[seedKey]){
      defaults.forEach(d=>{ if(d && !DATA[key].includes(d)) DATA[key].push(d); });
      DATA[seedKey] = true;
    }
    return DATA[key].slice();
  }
  function payItemPool(){
    return ensurePool('paymentItemPool', 'paymentItemPoolSeeded', defaultPayItems);
  }
  function dailyItemPool(){
    return ensurePool('dailyPayItemPool', 'dailyPayItemPoolSeeded', defaultDailyItems);
  }
  function penItemPool(){
    return ensurePool('penaltyItemPool', 'penaltyItemPoolSeeded', defaultPenItems);
  }
  function savePoolItem(poolKey, name){
    name = String(name||'').trim();
    if(!name) return;
    DATA[poolKey] = DATA[poolKey] || [];
    if(!DATA[poolKey].includes(name)) DATA[poolKey].push(name);
  }

  const title = isPen ? 'خصم / جزاء' : (extrasOnly ? 'بدلات ومكافآت' : 'دفع مستحق');
  openModal(`
    <div class="modal-header"><h3>${title}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <style>
        #appModal .entity-combo-wrap, #appModal .entity-combo-text { width:100%; box-sizing:border-box; }
        #appModal .form-grid-2 > label { min-width:0; }
      </style>
      <div class="form-grid form-grid-2">
        <label>النوع *
          <select class="input" id="upType">
            <option value="employee" ${type0==='employee'?'selected':''}>موظف</option>
            <option value="supervisor" ${type0==='supervisor'?'selected':''}>مشرف</option>
            <option value="worker" ${type0==='worker'?'selected':''}>عامل</option>
            <option value="driver" ${type0==='driver'?'selected':''}>سائق</option>
            <option value="equipment" ${type0==='equipment'?'selected':''}>معدة / مركبة</option>
          </select>
        </label>
        <label>القسم
          <select class="input" id="upDept"><option value="">— كل الأقسام —</option></select>
        </label>
        <label id="upPersonLab">الشخص *
          <div id="upPersonBox"></div>
        </label>
        <label>التاريخ
          <input class="input" id="upDate" type="date" value="${todayISO()}">
        </label>
        <label id="upPersonDeptHintLab" style="grid-column:1/-1;display:none;">
          <span style="font-size:12.5px;color:var(--ink-soft);">القسم التابع له الشخص: <strong id="upPersonDeptHint">—</strong></span>
        </label>
        ${isPen || extrasOnly ? '' : `
        <label>نوع المستحق *
          <select class="input" id="upPayKind">
            <option value="salary" ${defaultPayKind==='salary'?'selected':''}>الراتب</option>
            <option value="extras" ${defaultPayKind==='extras'?'selected':''}>بدلات ومكافآت</option>
            <option value="daily" ${defaultPayKind==='daily'?'selected':''}>اليومية</option>
          </select>
        </label>
        `}
        ${extrasOnly ? '<input type="hidden" id="upPayKind" value="salary_bonus">' : ''}
        <div id="upScopeWrap" style="display:none;">
          <label>نطاق الصرف (للمشرف) *
            <select class="input" id="upScope">
              <option value="self">للمشرف فقط</option>
              <option value="workers">توزيع على عمال المشرف</option>
              <option value="close_account">إقفال حساب المشرف (كامل)</option>
            </select>
          </label>
          <p id="upScopeHint" style="font-size:12.5px;color:var(--ink-soft);margin:6px 0 0;"></p>
        </div>
      </div>

      ${isPen ? `
      <div class="section-title" style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <span>بنود الخصم / الجزاء</span>
        <div style="display:flex;gap:6px;">
          <button type="button" class="btn btn-outline btn-sm" id="btnUpAddLine">+ بند</button>
          <button type="button" class="btn btn-outline btn-sm" id="btnUpManageItems">إدارة البنود</button>
        </div>
      </div>
      <div id="upLines"></div>
      <div style="text-align:left;margin-top:8px;font-weight:800;">الإجمالي: <span id="upTotal">0</span> ج.م</div>
      ` : `
      <div id="upSalaryBlock" style="margin-top:14px;${extrasOnly?'display:none;':''}">
        <label>مبلغ الصرف (المتبقي) *
          <input class="input" id="upSalary" type="number" min="0" step="0.01" placeholder="المبلغ المراد دفعه من المتبقي">
        </label>
        <p id="upSalaryCapHint" style="font-size:12.5px;color:var(--ink-soft);margin:6px 0 0;">الراتب المسجّل لا يتغيّر — تدفع المتبقي بعد الخصومات والمصاريف</p>
      </div>
      <div id="upExtrasPayBlock" style="display:none;margin-top:14px;">
        <div class="section-title">بدلات ومكافآت مستحقة غير مدفوعة</div>
        <p style="font-size:12.5px;color:var(--ink-soft);margin:0 0 8px;">اختر البنود المطابقة لما سُجّل للشخص — الدفع يُحسب في عمود المدفوع فقط</p>
        <div id="upUnpaidBonuses" style="max-height:240px;overflow:auto;border:1px solid var(--border,#ddd);border-radius:8px;padding:8px;"></div>
      </div>
      <div id="upExtrasBlock" style="margin-top:14px;${extrasOnly?'':'display:none;'}">
        <div class="section-title" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <span>بنود الإضافات والمكافآت (تسجيل مستحق)</span>
          <div style="display:flex;gap:6px;">
            <button type="button" class="btn btn-outline btn-sm" id="btnUpAddLine">+ بند</button>
            <button type="button" class="btn btn-outline btn-sm" id="btnUpManageItems">إدارة البنود</button>
          </div>
        </div>
        <div id="upLines"></div>
      </div>
      <div id="upDailyBlock" style="display:none;margin-top:14px;">
        <div class="section-title" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <span>بنود اليوميات</span>
          <div style="display:flex;gap:6px;">
            <button type="button" class="btn btn-outline btn-sm" id="btnUpAddLineDaily">+ بند</button>
            <button type="button" class="btn btn-outline btn-sm" id="btnUpManageItemsDaily">إدارة البنود</button>
          </div>
        </div>
        <div id="upDailyLines"></div>
      </div>
      <div style="text-align:left;margin-top:8px;font-weight:800;">الإجمالي: <span id="upTotal">0</span> ج.م</div>
      `}

      <label style="display:block;margin-top:12px;">ملاحظات
        <textarea class="input" id="upNotes" rows="4" placeholder="اختياري"></textarea>
      </label>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="btnSaveUp">حفظ</button>
    </div>
  `);

  const linesWrap = document.getElementById('upLines');
  const dailyWrap = document.getElementById('upDailyLines');

  function currentPayKind(){
    if(isPen) return 'penalty';
    return (document.getElementById('upPayKind')&&document.getElementById('upPayKind').value) || 'salary';
  }
  function itemsPoolFor(){
    if(isPen) return penItemPool();
    const k = currentPayKind();
    if(k==='daily') return dailyItemPool();
    return payItemPool(); // extras
  }
  function lineRowHtml(row){
    const pool = itemsPoolFor();
    const opts = pool.map(x=>`<option value="${escapeHtml(x)}"></option>`).join('');
    const ph = isPen ? 'نوع الخصم' : (currentPayKind()==='daily'?'بند اليومية':'بند الإضافة / المكافأة');
    return `<div class="form-grid form-grid-2 up-line" style="margin-bottom:8px;align-items:end;">
      <label>${ph}
        <input class="input up-item" list="upItemList" value="${escapeHtml(row.item||'')}" placeholder="اكتب أو اختر...">
      </label>
      <label>المبلغ
        <div style="display:flex;gap:6px;">
          <input class="input up-amt" type="number" min="0" step="0.01" value="${row.amount!=null&&row.amount!==''?escapeHtml(String(row.amount)):''}">
          <button type="button" class="btn btn-outline btn-sm up-del-line" title="حذف">🗑️</button>
        </div>
      </label>
    </div>`;
  }
  function ensureDatalist(){
    let dl = document.getElementById('upItemList');
    if(!dl){
      dl = document.createElement('datalist');
      dl.id = 'upItemList';
      (document.getElementById('appModal')||document.body).appendChild(dl);
    }
    dl.innerHTML = itemsPoolFor().map(x=>`<option value="${escapeHtml(x)}"></option>`).join('');
  }
  function calcTotal(){
    let tot = 0;
    if(!isPen){
      const k = currentPayKind();
      if(k==='salary'){
        tot += toInt(document.getElementById('upSalary')?.value);
      }
      if(k==='extras'){
        document.querySelectorAll('.up-bonus-chk:checked').forEach(chk=>{
          tot += toInt(chk.getAttribute('data-amount'));
        });
      }
      if(k==='salary_bonus' && linesWrap){
        linesWrap.querySelectorAll('.up-amt').forEach(inp=>{ tot += toInt(inp.value); });
      }
      if(k==='daily' && dailyWrap){
        dailyWrap.querySelectorAll('.up-amt').forEach(inp=>{ tot += toInt(inp.value); });
      }
    } else if(linesWrap){
      linesWrap.querySelectorAll('.up-amt').forEach(inp=>{ tot += toInt(inp.value); });
    }
    // extrasOnly accrual uses lines
    if(extrasOnly && linesWrap){
      tot = 0;
      linesWrap.querySelectorAll('.up-amt').forEach(inp=>{ tot += toInt(inp.value); });
    }
    const el = document.getElementById('upTotal');
    if(el) el.textContent = fmtMoney(tot);
    return tot;
  }
  function bindLines(root){
    const r = root || linesWrap;
    if(!r) return;
    r.querySelectorAll('.up-amt').forEach(inp=>{
      inp.oninput = calcTotal;
    });
    r.querySelectorAll('.up-del-line').forEach(btn=>{
      btn.onclick = ()=>{
        const row = btn.closest('.up-line');
        if(row && r.querySelectorAll('.up-line').length>1) row.remove();
        else if(row){ row.querySelector('.up-item').value=''; row.querySelector('.up-amt').value=''; }
        calcTotal();
      };
    });
    calcTotal();
  }
  function syncPayKindUI(){
    if(isPen) return;
    const sal = document.getElementById('upSalaryBlock');
    const ext = document.getElementById('upExtrasBlock');
    const day = document.getElementById('upDailyBlock');
    const ep = document.getElementById('upExtrasPayBlock');
    if(extrasOnly){
      if(sal) sal.style.display = 'none';
      if(ext) ext.style.display = '';
      if(day) day.style.display = 'none';
      if(ep) ep.style.display = 'none';
      ensureDatalist();
      if(linesWrap && !linesWrap.querySelector('.up-line')){
        linesWrap.innerHTML = lineRowHtml({ item:'مكافأة', amount:'' });
        bindLines(linesWrap);
      }
      calcTotal();
      return;
    }
    const k = currentPayKind();
    if(sal) sal.style.display = (k==='salary') ? '' : 'none';
    if(ext) ext.style.display = 'none';
    if(ep) ep.style.display = (k==='extras') ? '' : 'none';
    if(day) day.style.display = (k==='daily') ? '' : 'none';
    ensureDatalist();
    if(k==='salary') fillSalaryCap();
    if(k==='extras') renderUnpaidBonuses();
    if(k==='daily' && dailyWrap && !dailyWrap.querySelector('.up-line')){
      dailyWrap.innerHTML = lineRowHtml({ item:'دفع يوميات', amount:'' });
      bindLines(dailyWrap);
    }
    calcTotal();
  }
  function renderUnpaidBonuses(){
    const box = document.getElementById('upUnpaidBonuses');
    if(!box) return;
    const type = document.getElementById('upType')?.value || type0;
    const pid = typeof getEntityComboValue==='function' ? getEntityComboValue('upPerson') : (document.getElementById('upPerson')?.value||'');
    if(!pid){
      box.innerHTML = '<p style="margin:0;color:var(--ink-soft);font-size:13px;">اختر الشخص أولاً لعرض الإضافات المستحقة</p>';
      return;
    }
    const list = typeof personUnpaidBonuses==='function' ? personUnpaidBonuses(type, pid) : [];
    if(!list.length){
      box.innerHTML = '<p style="margin:0;color:#c1121f;font-size:13px;">لا توجد إضافات/مكافآت مستحقة غير مدفوعة لهذا الشخص — سجّلها أولاً من زر «بدلات ومكافآت»</p>';
      return;
    }
    box.innerHTML = list.map(p=>{
      const amt = toInt(p.amount||p.extrasAmount);
      const item = escapeHtml(p.payCategory||p.item||'مكافأة');
      const dt = escapeHtml(typeof fmtDate==='function'?fmtDate(p.date):(p.date||''));
      return `<label style="display:flex;align-items:center;gap:10px;padding:8px 6px;border-bottom:1px solid var(--border,#eee);cursor:pointer;">
        <input type="checkbox" class="up-bonus-chk" data-bonus-id="${escapeHtml(p.id)}" data-amount="${amt}" data-item="${item}" checked>
        <span style="flex:1;"><strong>${item}</strong> · ${fmtMoney(amt)} <span style="color:var(--ink-soft);font-size:12px;">(${dt})</span></span>
      </label>`;
    }).join('');
    box.querySelectorAll('.up-bonus-chk').forEach(chk=>{
      chk.addEventListener('change', calcTotal);
    });
  }

  if(isPen){
    ensureDatalist();
    if(linesWrap){
      linesWrap.innerHTML = lineRowHtml({ item:'', amount:'' });
      bindLines(linesWrap);
    }
    document.getElementById('btnUpAddLine')?.addEventListener('click', ()=>{
      linesWrap.insertAdjacentHTML('beforeend', lineRowHtml({ item:'', amount:'' }));
      bindLines(linesWrap);
    });
    document.getElementById('btnUpManageItems')?.addEventListener('click', ()=>{
      openPayItemsManageModal('penalty');
    });
  } else {
    document.getElementById('upSalary')?.addEventListener('input', ()=>{
      const salInp = document.getElementById('upSalary');
      const type = document.getElementById('upType')?.value || type0;
      const pid = typeof getEntityComboValue==='function' ? getEntityComboValue('upPerson') : (document.getElementById('upPerson')?.value||'');
      const cap = (pid && typeof getPersonConfiguredSalary==='function') ? getPersonConfiguredSalary(type, pid) : 0;
      if(cap>0 && salInp && toInt(salInp.value)>cap){
        salInp.value = String(cap);
        showToast('الحد الأقصى للراتب: '+fmtMoney(cap));
      }
      calcTotal();
    });
    document.getElementById('upPayKind')?.addEventListener('change', syncPayKindUI);
    document.getElementById('btnUpAddLine')?.addEventListener('click', ()=>{
      if(!linesWrap) return;
      linesWrap.insertAdjacentHTML('beforeend', lineRowHtml({ item:'', amount:'' }));
      bindLines(linesWrap);
    });
    document.getElementById('btnUpAddLineDaily')?.addEventListener('click', ()=>{
      if(!dailyWrap) return;
      dailyWrap.insertAdjacentHTML('beforeend', lineRowHtml({ item:'', amount:'' }));
      bindLines(dailyWrap);
    });
    document.getElementById('btnUpManageItems')?.addEventListener('click', ()=>{
      openPayItemsManageModal(currentPayKind()==='salary_bonus'?'extras':'pay');
    });
    document.getElementById('btnUpManageItemsDaily')?.addEventListener('click', ()=>{
      openPayItemsManageModal('daily');
    });
    syncPayKindUI();
  }


  function updatePersonDeptHint(){
    const hintLab = document.getElementById('upPersonDeptHintLab');
    const hintEl = document.getElementById('upPersonDeptHint');
    const type = document.getElementById('upType')?.value || type0;
    const pid = typeof getEntityComboValue==='function' ? getEntityComboValue('upPerson') : (document.getElementById('upPerson')?.value||'');
    if(!hintEl) return;
    if(!pid){
      if(hintLab) hintLab.style.display = 'none';
      hintEl.textContent = '—';
      return;
    }
    let ent = null;
    if(type==='employee') ent = (DATA.employees||[]).find(e=>e.id===pid);
    else if(type==='worker') ent = (DATA.workers||[]).find(e=>e.id===pid);
    else if(type==='supervisor') ent = (DATA.supervisors||[]).find(e=>e.id===pid);
    else if(type==='driver') ent = (DATA.drivers||[]).find(e=>e.id===pid);
    else if(type==='equipment') ent = (DATA.equipment||[]).find(e=>e.id===pid);
    const did = ent && (ent.departmentId||ent.categoryId||'');
    const dname = did && typeof departmentName==='function' ? departmentName(did) : (did||'');
    if(dname){
      hintEl.textContent = dname;
      if(hintLab) hintLab.style.display = '';
      // ضبط قائمة القسم على قسم الشخص
      const deptSel = document.getElementById('upDept');
      if(deptSel && did && deptSel.value !== did){
        // لا نعيد ملء الأشخاص إلا لو القسم فاضي
        const opt = Array.from(deptSel.options).find(o=>o.value===did);
        if(opt) deptSel.value = did;
        else {
          // أضف الخيار لو مش موجود في الفلتر الحالي
          const o = document.createElement('option');
          o.value = did; o.textContent = dname; o.selected = true;
          deptSel.appendChild(o);
        }
      }
    } else {
      hintEl.textContent = 'بدون قسم';
      if(hintLab) hintLab.style.display = '';
    }
  }


  function fillSalaryCap(){
    const salInp = document.getElementById('upSalary');
    const hint = document.getElementById('upSalaryCapHint');
    if(!salInp) return;
    const type = document.getElementById('upType')?.value || type0;
    const pid = typeof getEntityComboValue==='function' ? getEntityComboValue('upPerson') : (document.getElementById('upPerson')?.value||'');
    const cap = (pid && typeof getPersonConfiguredSalary==='function') ? getPersonConfiguredSalary(type, pid) : 0;
    // المتبقي من الراتب = الراتب المسجّل − ما دُفع منه − خصومات − مصاريف (لا نغيّر الراتب المسجّل)
    let alreadyPaid = 0, pen = 0, exp = 0;
    if(pid){
      (DATA.workerPayments||[]).forEach(p=>{
        if(!p) return;
        const match = (p.personType===type && p.personId===pid) || (type==='worker' && (p.workerId===pid||(p.personType==='worker'&&p.personId===pid)));
        if(!match) return;
        if(typeof isActualPayment==='function' && isActualPayment(p)) alreadyPaid += toInt(p.amount);
        if(p.type==='penalty'||p.type==='deduction') pen += toInt(p.amount);
      });
      if(type==='employee' && typeof employeePenaltyTotal==='function') pen = Math.max(pen, employeePenaltyTotal(pid));
      if(typeof personExpensesTotal==='function') exp = personExpensesTotal(type, pid);
    }
    let remaining = cap>0 ? toInt(cap - alreadyPaid - pen - exp) : 0;
    if(remaining<0) remaining = 0;
    // سقف الدفع = المتبقي فقط (مش كامل الراتب لو اتخصم منه)
    const maxPay = remaining>0 ? remaining : (cap>0?0:999999999);
    if(cap>0){
      salInp.setAttribute('max', String(maxPay));
      const cur = toInt(salInp.value);
      if(!salInp.value || cur<=0) salInp.value = String(remaining);
      else if(cur>maxPay) salInp.value = String(maxPay);
      if(hint) hint.innerHTML = 'الراتب المسجّل: <strong>'+fmtMoney(cap)+'</strong> (ثابت) · المتبقي للدفع: <strong>'+fmtMoney(remaining)+'</strong> — الصرف يسجّل كمدفوع فقط ولا يغيّر الراتب';
    } else {
      salInp.removeAttribute('max');
      if(hint) hint.textContent = 'لا يوجد راتب مسجّل — أدخل مبلغ الصرف بحذر (يُحسب مدفوعاً فقط)';
    }
    calcTotal();
  }

  function fillDepts(){
    const type = document.getElementById('upType')?.value || type0;
    const kindMap = { employee:'employees', worker:'workers', supervisor:'supervisors', driver:'drivers', equipment:'equipment' };
    const deptSel = document.getElementById('upDept');
    if(!deptSel) return;
    const cur = deptSel.value || '';
    const opts = typeof deptOptionsForKind==='function'
      ? deptOptionsForKind(kindMap[type]||'workers', cur)
      : '<option value="">— كل الأقسام —</option>';
    deptSel.innerHTML = opts;
  }
  function fillPeople(){
    const type = document.getElementById('upType').value;
    const labs = {employee:'الموظف',supervisor:'المشرف',worker:'العامل',driver:'السائق',equipment:'المعدة / المركبة'};
    const lab = document.getElementById('upPersonLab');
    if(lab){
      // childNodes[0] may be text node
      if(lab.firstChild && lab.firstChild.nodeType===3) lab.firstChild.textContent = (labs[type]||'الشخص')+' *';
      else lab.insertAdjacentText('afterbegin', (labs[type]||'الشخص')+' *');
    }
    const deptId = document.getElementById('upDept')?.value || '';
    window.__upDeptFilter = deptId || '';
    const box = document.getElementById('upPersonBox');
    if(box){
      if(typeof entityComboHtml==='function'){
        box.innerHTML = entityComboHtml('upPerson', type, id0, 'اكتب الاسم أو الكود...');
        if(typeof bindEntityCombos==='function') bindEntityCombos(document.getElementById('appModal')||document);
      } else {
        box.innerHTML = `<select class="input" id="upPerson"></select>`;
      }
    }
    // الإبقاء على __upDeptFilter عشان اقتراحات الاسم تفلتر بالقسم
    try{ updatePersonDeptHint(); }catch(_e){}
    try{ if(!isPen && !extrasOnly && currentPayKind()==='salary') fillSalaryCap(); }catch(_e){}
    const sw = document.getElementById('upScopeWrap');
    if(sw) sw.style.display = (!isPen && type==='supervisor') ? '' : 'none';
    // اقتراح نوع المستحق حسب النوع (لا تغيّر في وضع الإضافات فقط)
    if(!isPen){
      const pk = document.getElementById('upPayKind');
      if(pk && !pk.dataset.userTouched && !extrasOnly){
        if(type==='employee') pk.value = 'salary';
        else if(type==='worker'||type==='driver'||type==='supervisor') pk.value = 'daily';
        else pk.value = 'salary';
      }
      if(extrasOnly && pk) pk.value = 'salary_bonus';
      syncPayKindUI();
    }
    updateScopeHint();
  }
  function updateScopeHint(){
    const hint = document.getElementById('upScopeHint');
    const type = document.getElementById('upType')?.value;
    const sid = typeof getEntityComboValue==='function' ? getEntityComboValue('upPerson') : (document.getElementById('upPerson')?.value||'');
    const scope = document.getElementById('upScope')?.value;
    if(!hint || type!=='supervisor' || !sid || isPen){ if(hint) hint.textContent=''; return; }
    try{
      const st = supervisorWageStatement(sid);
      if(scope==='self') hint.textContent = 'مستحق المشرف: '+fmtMoney(st.ownDue)+' — متبقي: '+fmtMoney(st.ownBal);
      else if(scope==='workers') hint.textContent = 'مستحق العمال: '+fmtMoney(st.workersDue)+' — متبقي: '+fmtMoney(st.workersBal);
      else if(scope==='close_account') hint.textContent = 'إجمالي المستحق '+fmtMoney(st.totalDue)+' − جزاءات '+fmtMoney(st.totalPenalty)+' − مصاريف '+fmtMoney(st.totalExpenses)+' − مدفوع '+fmtMoney(st.totalPaid)+' = المتبقي '+fmtMoney(st.totalBal);
    }catch(e){ hint.textContent=''; }
  }
  document.getElementById('upType')?.addEventListener('change', ()=>{ fillDepts(); fillPeople(); if(!isPen && !extrasOnly && currentPayKind()==='extras') renderUnpaidBonuses(); });
  document.getElementById('upDept')?.addEventListener('change', fillPeople);
  document.getElementById('upScope')?.addEventListener('change', updateScopeHint);
  document.getElementById('upPayKind')?.addEventListener('change', function(){ this.dataset.userTouched='1'; syncPayKindUI(); });
  fillDepts();
  fillPeople();
  if(extrasOnly){
    try{ syncPayKindUI(); }catch(_e){}
  }
  setTimeout(()=>{
    document.getElementById('upPerson')?.addEventListener('change', ()=>{
      updateScopeHint();
      try{ updatePersonDeptHint(); }catch(_e){}
      try{ if(!isPen && !extrasOnly && currentPayKind()==='salary') fillSalaryCap(); }catch(_e){}
      if(!isPen && !extrasOnly && currentPayKind()==='extras') renderUnpaidBonuses();
    });
    // عند اختيار شخص من الكومبو
    const modal = document.getElementById('appModal');
    modal?.addEventListener('change', (ev)=>{
      if(ev.target && (ev.target.id==='upPerson' || ev.target.id==='upPerson_text')){
        try{ updatePersonDeptHint(); }catch(_e){}
        try{ if(!isPen && !extrasOnly && currentPayKind()==='salary') fillSalaryCap(); }catch(_e){}
        if(!isPen && !extrasOnly && currentPayKind()==='extras') renderUnpaidBonuses();
      }
    });
    modal?.addEventListener('input', (ev)=>{
      if(ev.target && ev.target.id==='upPerson_text'){
        // تأخير بسيط بعد اختيار اقتراح
        setTimeout(()=>{ try{ updatePersonDeptHint(); }catch(_e){} try{ if(!isPen && !extrasOnly && currentPayKind()==='salary') fillSalaryCap(); }catch(_e){} if(!isPen && !extrasOnly && currentPayKind()==='extras') renderUnpaidBonuses(); }, 100);
      }
    });
  }, 50);

  document.getElementById('btnSaveUp')?.addEventListener('click', ()=>{
    try{
      const personType = document.getElementById('upType').value;
      let pid = typeof getEntityComboValue==='function' ? getEntityComboValue('upPerson') : (document.getElementById('upPerson')?.value||'');
      if(!pid){ showToast('اختر الشخص'); return; }
      const date = document.getElementById('upDate').value || todayISO();
      const notes = (document.getElementById('upNotes')?.value||'').trim();
      const payKind = isPen ? 'penalty' : currentPayKind();

      // جمع البنود
      const outLines = [];
      if(isPen){
        (linesWrap||document).querySelectorAll('.up-line').forEach(row=>{
          const item = (row.querySelector('.up-item')?.value||'').trim();
          const amount = toInt(row.querySelector('.up-amt')?.value);
          if(amount<=0) return;
          if(item) savePoolItem('penaltyItemPool', item);
          outLines.push({ item: item||'خصم', amount, isExtra:false });
        });
      } else if(payKind==='salary'){
        const salary = toInt(document.getElementById('upSalary')?.value);
        if(salary<=0){ showToast('أدخل مبلغ الراتب'); return; }
        const cap = typeof getPersonConfiguredSalary==='function' ? getPersonConfiguredSalary(personType, pid) : 0;
        if(cap>0 && salary>cap){
          showToast('لا يمكن دفع أكثر من الراتب المسجّل ('+fmtMoney(cap)+')');
          return;
        }
        if(cap<=0){
          showToast('لا يوجد راتب مسجّل لهذا الشخص — حدّث بياناته أولاً');
          return;
        }
        outLines.push({ item:'راتب', amount:salary, isExtra:false, salaryPart:true });
      } else if(payKind==='extras'){
        // دفع إضافات مستحقة فقط — مربوطة بما سُجّل مسبقاً
        document.querySelectorAll('.up-bonus-chk:checked').forEach(chk=>{
          const amount = toInt(chk.getAttribute('data-amount'));
          const item = (chk.getAttribute('data-item')||'مكافأة').trim();
          const bonusId = chk.getAttribute('data-bonus-id')||'';
          if(amount<=0) return;
          outLines.push({ item, amount, isExtra:true, bonusId, payExtra:true });
        });
        if(!outLines.length){ showToast('اختر إضافة/مكافأة واحدة على الأقل من المسجّلة للشخص'); return; }
      } else if(payKind==='salary_bonus'){
        // وضع تسجيل إضافات فقط (extrasOnly)
        if(!extrasOnly){
          const salary = toInt(document.getElementById('upSalary')?.value);
          if(salary<=0){ showToast('أدخل مبلغ الراتب'); return; }
          outLines.push({ item:'راتب', amount:salary, isExtra:false, salaryPart:true });
        }
        (linesWrap||document).querySelectorAll('.up-line').forEach(row=>{
          const item = (row.querySelector('.up-item')?.value||'').trim();
          const amount = toInt(row.querySelector('.up-amt')?.value);
          if(amount<=0) return;
          if(item) savePoolItem('paymentItemPool', item);
          outLines.push({ item: item||'إضافة', amount, isExtra:true });
        });
        if(extrasOnly && !outLines.length){ showToast('أضف بند إضافة/مكافأة واحد على الأقل'); return; }
        if(!extrasOnly && outLines.length<=1){ showToast('أضف بند إضافة واحد على الأقل مع الراتب'); return; }
      } else if(payKind==='daily'){
        (dailyWrap||document).querySelectorAll('.up-line').forEach(row=>{
          const item = (row.querySelector('.up-item')?.value||'').trim();
          const amount = toInt(row.querySelector('.up-amt')?.value);
          if(amount<=0) return;
          if(item) savePoolItem('dailyPayItemPool', item);
          outLines.push({ item: item||'دفع يوميات', amount, isExtra:false });
        });
      }

      if(!outLines.length){ showToast('أدخل مبلغاً واحداً على الأقل'); return; }
      const total = outLines.reduce((s,l)=>s+toInt(l.amount),0);
      const salaryTotal = outLines.filter(l=>l.salaryPart).reduce((s,l)=>s+toInt(l.amount),0);
      const extrasTotal = outLines.filter(l=>l.isExtra).reduce((s,l)=>s+toInt(l.amount),0);

      DATA.workerPayments = DATA.workerPayments || [];
      DATA.employeePenalties = DATA.employeePenalties || [];

      if(isPen){
        if(personType==='employee'){
          outLines.forEach(l=>{
            DATA.employeePenalties.push({
              id: uid(), employeeId: pid, date, amount: l.amount,
              reason: l.item, notes, type:'penalty'
            });
          });
        } else {
          outLines.forEach(l=>{
            DATA.workerPayments.push({
              id: uid(), personType, personId: pid,
              workerId: personType==='worker'?pid:'',
              type:'penalty', date, amount:l.amount, notes,
              payCategory: l.item, payKind:'penalty', scope:'self'
            });
          });
        }
        addAudit('خصم / جزاء', personType+' '+fmtMoney(total));
      } else if(extrasOnly){
        // مكافأة/إضافة مستحقة — تظهر في عمود الإضافات وتتجمع على المرتب، مش مدفوع
        DATA.workerPayments = DATA.workerPayments || [];
        outLines.forEach(l=>{
          DATA.workerPayments.push({
            id: uid(), personType, personId: pid,
            workerId: personType==='worker'?pid:'',
            type: 'bonus', date, amount: l.amount, notes,
            payCategory: l.item, payKind: 'bonus',
            isExtra: true, salaryAmount: 0, extrasAmount: l.amount, scope:'self',
            status: 'accrued' // مستحق غير مدفوع
          });
        });
        addAudit('إضافة مكافأة (مستحق)', personType+' '+fmtMoney(total));
        saveData(true); closeModal();
        showToast('تم تسجيل الإضافة في عمود بدلات ومكافآت — لم تُحتسب كمدفوع');
        if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
        return;
      } else if(payKind==='extras'){
        // دفع إضافات لأي نوع شخص — عمود المدفوع فقط
        outLines.forEach(l=>{
          DATA.workerPayments.push({
            id: uid(), personType, personId: pid,
            workerId: personType==='worker'?pid:'',
            type: 'pay', date, amount: l.amount, notes,
            payCategory: l.item, payKind: 'extras',
            isExtra: true, salaryAmount: 0, extrasAmount: l.amount,
            linkedBonusId: l.bonusId||'', scope:'self'
          });
          if(l.bonusId){
            const b = (DATA.workerPayments||[]).find(x=>x.id===l.bonusId);
            if(b){ b.status = 'paid'; b.paidDate = date; }
          }
        });
        addAudit('دفع بدلات ومكافآت', personType+' '+fmtMoney(total));
        saveData(true); closeModal();
        showToast('تم دفع الإضافات — '+fmtMoney(total)+' (عمود المدفوع)');
        if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
        return;
      } else if(personType==='supervisor'){
        const scope = (document.getElementById('upScope')&&document.getElementById('upScope').value)||'self';
        if(scope==='workers'){
          const workers = (typeof workersOfSupervisor==='function'?workersOfSupervisor(pid):[]).map(w=>({
            w, bal: Math.max(0, typeof workerBalance==='function'?workerBalance(w.id):0)
          })).filter(x=>x.bal>0);
          const sumBal = workers.reduce((s,x)=>s+x.bal,0);
          if(!workers.length || sumBal<=0){ showToast('لا متبقي على عمال هذا المشرف للتوزيع'); return; }
          let left = total;
          workers.forEach((x,i)=>{
            let share = (i===workers.length-1) ? left : toInt(Math.round(total * (x.bal/sumBal)));
            if(share>left) share = left;
            if(share<=0) return;
            left -= share;
            DATA.workerPayments.push({
              id: uid(), personType:'worker', personId:x.w.id, workerId:x.w.id,
              type:'pay', date, amount:share,
              notes: notes||('توزيع صرف مشرف'),
              payCategory: outLines.map(l=>l.item).join(' + '),
              payKind, salaryAmount:0, extrasAmount:share,
              fromSupervisorId: pid, scope:'workers'
            });
          });
          addAudit('صرف موزع على عمال', (typeof supervisorName==='function'?supervisorName(pid):'')+' '+fmtMoney(total));
        } else {
          outLines.forEach(l=>{
            DATA.workerPayments.push({
              id: uid(), personType:'supervisor', personId:pid, workerId:'',
              type:'pay', date, amount:l.amount, notes,
              payCategory:l.item, payKind, isExtra:!!l.isExtra,
              salaryAmount: l.salaryPart?l.amount:0,
              extrasAmount: l.isExtra?l.amount:0,
              scope
            });
          });
          addAudit(scope==='close_account'?'إقفال حساب مشرف':'دفع مستحق مشرف', (typeof supervisorName==='function'?supervisorName(pid):'')+' '+fmtMoney(total));
        }
      } else {
        outLines.forEach(l=>{
          DATA.workerPayments.push({
            id: uid(), personType, personId: pid,
            workerId: personType==='worker'?pid:'',
            type: 'pay', date, amount: l.amount, notes,
            payCategory: l.item, payKind: payKind==='extras'?'extras':payKind,
            isExtra: !!l.isExtra,
            salaryAmount: l.salaryPart?l.amount:0,
            extrasAmount: (l.isExtra||l.payExtra)?l.amount:0,
            linkedBonusId: l.bonusId||'',
            scope:'self'
          });
          // تعليم المكافأة المستحقة بأنها مدفوعة
          if(l.bonusId){
            const b = (DATA.workerPayments||[]).find(x=>x.id===l.bonusId);
            if(b){ b.status = 'paid'; b.paidDate = date; }
          }
        });
        addAudit('دفع مستحق', personType+' '+fmtMoney(total)+(payKind==='extras'?' (إضافات)':payKind==='salary'?' (راتب)':''));
      }
      saveData(true);
      closeModal();
      showToast(extrasOnly ? ('تم تسجيل الإضافة على المستحق — '+fmtMoney(total)) : ('تم الحفظ — الإجمالي '+fmtMoney(total)));
      rerenderCurrentPage();
    }catch(err){
      console.error(err);
      showToast('تعذر الحفظ: '+(err.message||err));
    }
  });
}


/** إدارة بنود الدفع / الخصم / اليوميات — قائمة فرعية فوق المودال */
function openPayItemsManageModal(kind){
  // kind: 'extras' | 'daily' | 'penalty' | 'pay'
  const meta = {
    extras: { title:'إدارة بنود الإضافات والمكافآت', pool:'paymentItemPool', seed:'paymentItemPoolSeeded',
      defaults:['مكافأة','بدل مواصلات','بدل إعاشة','حافز إنتاج','سلفة','بدل انتقال','بدل طبيعة عمل','بدل انتقالات','تصفية حساب','أخرى'] },
    pay:    { title:'إدارة بنود الدفع', pool:'paymentItemPool', seed:'paymentItemPoolSeeded',
      defaults:['مكافأة','بدل مواصلات','بدل إعاشة','حافز إنتاج','سلفة','بدل انتقال','بدل طبيعة عمل','بدل انتقالات','تصفية حساب','أخرى'] },
    daily:  { title:'إدارة بنود اليوميات', pool:'dailyPayItemPool', seed:'dailyPayItemPoolSeeded',
      defaults:['دفع يوميات','ساعات إضافية','حافز يومي','بدل انتقال','أخرى'] },
    penalty:{ title:'إدارة بنود الخصم / الجزاء', pool:'penaltyItemPool', seed:'penaltyItemPoolSeeded',
      defaults:['تأخير','غياب','مخالفة','إهمال','جزاء إداري','خصم سلفة','أخرى'] }
  };
  const m = meta[kind] || meta.pay;

  // المصدر الوحيد: المصفوفة المحفوظة — تُبذر مرة واحدة فقط من الافتراضي
  if(!Array.isArray(DATA[m.pool])) DATA[m.pool] = [];
  if(!DATA[m.seed]){
    m.defaults.forEach(d=>{
      if(d && !DATA[m.pool].includes(d)) DATA[m.pool].push(d);
    });
    DATA[m.seed] = true;
  }
  const saved = DATA[m.pool].slice();

  function renderRow(name){
    return `<div class="pitem-row" style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
      <input class="input pitem-edit" value="${escapeHtml(name)}" style="flex:1;" placeholder="اسم البند">
      <button type="button" class="btn btn-outline btn-sm btn-del-pitem" title="حذف">🗑️</button>
    </div>`;
  }

  if(typeof openSubModal!=='function'){
    showToast('تعذر فتح إدارة البنود');
    return;
  }
  const ov = openSubModal(`
    <div class="modal-header"><h3>${escapeHtml(m.title)}</h3><button type="button" class="modal-close" id="btnXClosePItems">×</button></div>
    <div class="modal-body">
      <style>
        #appModal .entity-combo-wrap, #appModal .entity-combo-text { width:100%; box-sizing:border-box; }
        #appModal .form-grid-2 > label { min-width:0; }
      </style>
      <label>بند جديد
        <div style="display:flex;gap:8px;">
          <input class="input" id="pItemNew" placeholder="اسم البند...">
          <button type="button" class="btn btn-outline btn-sm" id="btnAddPItem">إضافة</button>
        </div>
      </label>
      <div id="pItemList" style="max-height:320px;overflow:auto;margin-top:12px;">
        ${saved.length? saved.map(renderRow).join('') : '<p class="pitem-empty" style="color:var(--ink-soft)">لا بنود بعد — أضف بنداً جديداً</p>'}
      </div>
    </div>
    <div class="modal-footer" style="display:flex;gap:8px;justify-content:flex-end;">
      <button type="button" class="btn btn-outline" id="btnClosePItems">إغلاق</button>
      <button type="button" class="btn btn-primary" id="btnSavePItems">حفظ</button>
    </div>
  `);
  const root = ov || document.getElementById('appSubModal') || document;

  function refreshMainDl(list){
    const dl = document.getElementById('upItemList');
    if(!dl) return;
    const pool = (list && list.length) ? list : (DATA[m.pool]||[]);
    dl.innerHTML = pool.map(x=>`<option value="${escapeHtml(x)}"></option>`).join('');
  }
  function collectNames(){
    const names = [];
    const seen = new Set();
    root.querySelectorAll('#pItemList .pitem-edit').forEach(inp=>{
      const v = String(inp.value||'').trim();
      if(!v || seen.has(v)) return;
      seen.add(v);
      names.push(v);
    });
    return names;
  }
  function bindPItemRows(scope){
    (scope||root).querySelectorAll('.btn-del-pitem').forEach(btn=>{
      btn.onclick = function(e){
        e.preventDefault();
        e.stopPropagation();
        const row = this.closest('.pitem-row');
        if(row) row.remove();
        const list = root.querySelector('#pItemList');
        if(list && !list.querySelector('.pitem-row')){
          list.innerHTML = '<p class="pitem-empty" style="color:var(--ink-soft)">لا بنود بعد — أضف بنداً جديداً</p>';
        }
      };
    });
  }
  bindPItemRows(root);

  root.querySelector('#btnAddPItem')?.addEventListener('click', (e)=>{
    e.preventDefault();
    const inp = root.querySelector('#pItemNew');
    const name = String(inp?.value||'').trim();
    if(!name){ showToast('اكتب اسم البند'); return; }
    const list = root.querySelector('#pItemList');
    if(!list) return;
    let exists = false;
    list.querySelectorAll('.pitem-edit').forEach(i=>{ if(String(i.value||'').trim()===name) exists = true; });
    if(exists){ showToast('البند موجود بالفعل'); return; }
    const empty = list.querySelector('.pitem-empty');
    if(empty) empty.remove();
    list.insertAdjacentHTML('beforeend', renderRow(name));
    bindPItemRows(list);
    if(inp) inp.value = '';
  });

  root.querySelector('#btnSavePItems')?.addEventListener('click', (e)=>{
    e.preventDefault();
    e.stopPropagation();
    const names = collectNames();
    DATA[m.pool] = names.slice();
    DATA[m.seed] = true;
    try{
      if(typeof saveData==='function') saveData(true);
    }catch(err){ console.error(err); showToast('تعذر الحفظ'); return; }
    refreshMainDl(names);
    showToast('تم حفظ البنود ('+names.length+')');
    if(typeof closeSubModal==='function') closeSubModal();
  });

  const closeFn = (e)=>{ if(e){ e.preventDefault(); e.stopPropagation(); } if(typeof closeSubModal==='function') closeSubModal(); };
  root.querySelector('#btnClosePItems')?.addEventListener('click', closeFn);
  root.querySelector('#btnXClosePItems')?.addEventListener('click', closeFn);
}

