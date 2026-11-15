/* =========================================================
   كشف حساب المشروع
   - الأشخاص على المشروع بتاريخ انضمام كل واحد (من حركة الموارد، أو "تاريخ الانضمام للمشروع"، أو أول يوم حضور)
   - يوميات العمالة والمعدات والوقود والصيانة + المصاريف والتكاليف المربوطة بالمشروع
   - فلاتر: بحث، نوع الحركة، الفترة (من/إلى أو اختصارات)
   ========================================================= */

let projectStmtFilters = { q: '', type: '', preset: 'all', from: '', to: '' };

const PST_TYPES = {
  labor:   'يوميات عمالة',
  equip:   'يوميات معدات',
  fuel:    'وقود',
  maint:   'صيانة',
  expense: 'مصروفات',
  cost:    'تكاليف',
  daily:   'يومية مشروع',
  supplier:  'فواتير موردين',
  warehouse: 'صرف مخازن'
};

function pstPersonName(kind, id){
  try{
    if(kind === 'worker') return workerName(id);
    if(kind === 'supervisor') return supervisorName(id);
    if(kind === 'driver') return driverName(id);
    if(kind === 'employee') return employeeName(id);
    if(kind === 'equipment'){ const q = getEquipment(id); return q ? (q.name || q.code || id) : id; }
  }catch(_e){}
  return id || '';
}
function pstKindLabel(k){ return ({ worker:'عامل', supervisor:'مشرف', driver:'سائق', employee:'موظف', equipment:'معدة' })[k] || k || ''; }

/** تحويل اختصار الفترة لتواريخ */
function pstResolvePeriod(f){
  const preset = f.preset || 'all';
  const now = (typeof cairoNow === 'function') ? cairoNow() : new Date();
  const iso = (d)=> d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  if(preset === 'month'){ return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(new Date(now.getFullYear(), now.getMonth()+1, 0)) }; }
  if(preset === 'prevMonth'){ return { from: iso(new Date(now.getFullYear(), now.getMonth()-1, 1)), to: iso(new Date(now.getFullYear(), now.getMonth(), 0)) }; }
  if(preset === '30'){ return { from: iso(new Date(now.getFullYear(), now.getMonth(), now.getDate()-29)), to: iso(now) }; }
  if(preset === 'year'){ return { from: now.getFullYear()+'-01-01', to: now.getFullYear()+'-12-31' }; }
  if(preset === 'custom') return { from: f.from || '', to: f.to || '' };
  return { from: '', to: '' };
}

/** بيجمع كل حاجة عن مشروع في فترة */
function projectStatement(projectName, from, to){
  const name = String(projectName || '').trim();
  const F = from || '', T = to || '';
  const inRange = (d)=> (!F || (d||'') >= F) && (!T || (d||'') <= T);
  const same = (p)=> String(p || '').trim() === name;
  const ledger = [];
  const push = (r)=> ledger.push(r);

  /* ---------- 1) الأشخاص والمعدات (مع تواريخ الانضمام) ---------- */
  const kinds = [
    { kind:'worker', list: DATA.workers || [] },
    { kind:'supervisor', list: DATA.supervisors || [] },
    { kind:'driver', list: DATA.drivers || [] }
  ];
  const transfers = (DATA.resourceTransfers || []).filter(t => t && (same(t.toProject) || same(t.fromProject)));
  const members = [];
  kinds.forEach(({kind, list})=>{
    const byId = {};
    const get = (id)=> byId[id] || (byId[id] = { kind, id, in:[], out:[], att:[] });
    list.forEach(p=>{ if(p && same(p.project)){ const m = get(p.id); m.current = true; m.since = p.projectSince || ''; } });
    transfers.filter(t=>t.kind === kind).forEach(t=>{
      const m = get(t.refId || t.personId);
      if(same(t.toProject)) m.in.push(t.date || '');
      if(same(t.fromProject)) m.out.push(t.date || '');
    });
    (DATA.workerAttendance || []).forEach(a=>{
      if(!a || !same(a.project) || attType(a) !== kind) return;
      get(attPersonId(a)).att.push(a);
    });
    Object.keys(byId).forEach(id=>{
      const m = byId[id];
      const rec = list.find(p=>p && p.id === id);
      if(!rec) return;
      const attAll = m.att.slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
      const joins = [].concat(m.in.filter(Boolean), (m.current && m.since) ? [m.since] : [], attAll.length ? [attAll[0].date] : []).filter(Boolean).sort();
      const join = joins[0] || '';
      let leave = '';
      if(!m.current){
        const outs = m.out.filter(Boolean).sort();
        const lastAtt = attAll.length ? attAll[attAll.length - 1].date : '';
        leave = outs.length ? outs[outs.length - 1] : lastAtt;
      }
      const rows = attAll.filter(a=>inRange(a.date));
      let days = 0, labor = 0, absent = new Set();
      rows.forEach(a=>{
        const st = String(a.status||'').toLowerCase();
        if(st === 'absent'){ absent.add(a.date||''); return; }
        days += attendanceDaysCredit(a);
        const net = attendanceNetPay(a, rec);
        labor += net;
        push({ date:a.date, type:'labor', who:rec.name || '', kind, whoId:id, detail:(typeof labelOf==='function' && typeof ATTENDANCE_STATUS!=='undefined' ? labelOf(ATTENDANCE_STATUS, a.status) : (a.status||'')) + ' — ' + fmtDays(attendanceDaysCredit(a)) + ' يوم' + (a.notes ? ' — ' + a.notes : ''), amount:toInt(net) });
      });
      // يظهر لو عليه نشاط في الفترة أو كان منضم في الفترة (حتى لو من غير حضور)
      const overlap = (!T || !join || join <= T) && (!F || m.current || !leave || leave >= F);
      if(!rows.length && !overlap) return;
      members.push({ kind, id, name: rec.name || '', code: rec.code || '', join, leave, current: !!m.current,
        days: Math.round(days*100)/100, absent: absent.size, labor: toInt(labor), costs:0, expenses:0 });
    });
  });
  members.sort((a,b)=>(a.join||'9999').localeCompare(b.join||'9999') || a.name.localeCompare(b.name,'ar'));

  // معدات
  const eqIds = {};
  (DATA.equipment || []).forEach(q=>{ if(q && same(q.project)) eqIds[q.id] = { current:true, since:q.projectSince||'' }; });
  transfers.filter(t=>t.kind==='equipment').forEach(t=>{ const id=t.refId||t.personId; eqIds[id] = eqIds[id] || {}; (eqIds[id].in = eqIds[id].in||[]); (eqIds[id].out = eqIds[id].out||[]); if(same(t.toProject)) eqIds[id].in.push(t.date||''); if(same(t.fromProject)) eqIds[id].out.push(t.date||''); });
  const dailyOn = (DATA.equipmentDaily || []).filter(d=>d && same(d.project));
  dailyOn.forEach(d=>{ eqIds[d.equipmentId] = eqIds[d.equipmentId] || {}; });
  const equipment = Object.keys(eqIds).map(id=>{
    const q = getEquipment(id); if(!q) return null;
    const info = eqIds[id];
    const logs = dailyOn.filter(d=>d.equipmentId === id).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
    const joins = [].concat((info.in||[]).filter(Boolean), (info.current && info.since) ? [info.since] : [], logs.length ? [logs[0].date] : []).filter(Boolean).sort();
    let days = 0, cost = 0;
    logs.filter(d=>inRange(d.date)).forEach(d=>{
      const c = equipmentDailyCost(d, q); cost += c; days += Number(d.days) || (Number(d.hours) ? Number(d.hours)/8 : 0);
      push({ date:d.date, type:'equip', who:q.name || q.code || '', kind:'equipment', whoId:id, detail:(Number(d.days)?fmtDays(d.days)+' يوم':'') + (Number(d.hours)?' '+fmtNum(d.hours)+' ساعة':'') + (Number(d.fuelLiters)?' — وقود '+fmtNum(d.fuelLiters)+' ل':''), amount:toInt(c) });
    });
    return { id, name:q.name || q.code || '', code:q.code || '', join: joins[0] || '', current: !!info.current, days: Math.round(days*100)/100, cost: toInt(cost), used: logs.some(d=>inRange(d.date)) };
  }).filter(Boolean).filter(e=>e.used || e.current).sort((a,b)=>a.name.localeCompare(b.name,'ar'));

  /* ---------- 2) وقود / صيانة / يومية مشروع ---------- */
  (DATA.fuelLogs || []).forEach(f=>{ if(!f || !same(f.project) || !inRange(f.date)) return;
    const q = getEquipment(f.equipmentId);
    push({ date:f.date, type:'fuel', who:q ? (q.name||q.code||'') : '', kind:'equipment', whoId:f.equipmentId, detail:(Number(f.liters)?fmtNum(f.liters)+' لتر':'') + (f.notes?' — '+f.notes:''), amount:toInt(f.cost) }); });
  (DATA.equipmentLogs || []).forEach(l=>{ if(!l || !same(l.project) || !inRange(l.date)) return;
    const q = getEquipment(l.equipmentId);
    push({ date:l.date, type:'maint', who:q ? (q.name||q.code||'') : '', kind:'equipment', whoId:l.equipmentId, detail:(l.type||'صيانة') + (l.notes?' — '+l.notes:''), amount:toInt(l.cost) }); });
  (DATA.projectDaily || []).forEach(pd=>{ if(!pd || !same(pd.project) || !inRange(pd.date)) return;
    const amt = toInt(pd.laborCost) + toInt(pd.equipCost) + toInt(pd.fuelCost);
    push({ date:pd.date, type:'daily', who:'', kind:'', whoId:'', detail:'عمالة '+fmtMoney(pd.laborCost)+' · معدات '+fmtMoney(pd.equipCost)+' · وقود '+fmtMoney(pd.fuelCost)+(pd.notes?' — '+pd.notes:''), amount:amt }); });

  /* ---------- 3) مصروفات وتكاليف مربوطة بالمشروع ---------- */
  const personAdd = (kind, id, field, amt)=>{ const m = members.find(x=>x.kind === kind && x.id === id); if(m) m[field] = toInt(m[field] + amt); };
  (DATA.expenses || []).forEach(e=>{ if(!e || !same(e.project) || !inRange(e.date)) return;
    const kind = e.personKind || (e.equipmentId ? 'equipment' : '');
    const id = e.personId || e.equipmentId || '';
    const lines = (typeof expenseLinesOf === 'function') ? expenseLinesOf(e) : [];
    const txt = (lines||[]).length > 1 ? lines.map(l=>(l.item||'')+' '+fmtNum(l.amount)).join(' + ') : ((lines[0] && lines[0].item) || (typeof expenseTypeLabel==='function' ? expenseTypeLabel(e.type) : e.type) || '');
    push({ date:e.date, type:'expense', who:pstPersonName(kind, id), kind, whoId:id, detail:[e.section, txt, e.notes].filter(Boolean).join(' — '), amount:toInt(e.amount) });
    personAdd(kind, id, 'expenses', toInt(e.amount)); });
  (DATA.costs || []).forEach(c=>{ if(!c || !same(c.project) || !inRange(c.date)) return;
    push({ date:c.date, type:'cost', who:pstPersonName(c.personKind, c.personId), kind:c.personKind, whoId:c.personId, detail:[costItemText(c), c.notes].filter(Boolean).join(' — '), amount:toInt(c.amount) });
    personAdd(c.personKind, c.personId, 'costs', toInt(c.amount)); });

  /* موردين + صرف مخازن (نفس محرك projectSupplyCostLines اللي بيغذّي تكلفة المشروع) */
  if(typeof projectSupplyCostLines === 'function') projectSupplyCostLines(name, F, T).forEach(l=>{
    push({ date:l.date, type:l.source, who:l.party||'', kind:'', whoId:'', detail: l.source==='supplier' ? (l.desc+' '+(l.ref||'')) : ('صرف '+(l.qty||0)+' × '+fmtMoney(l.unit||0)+' ('+(l.ref||'')+')'), amount:toInt(l.amount) }); });

  ledger.sort((a,b)=>(a.date||'').localeCompare(b.date||'') || String(a.type).localeCompare(String(b.type)));

  /* ---------- 4) الإجماليات ---------- */
  const sumType = (t)=> toInt(ledger.filter(r=>r.type === t).reduce((s,r)=>s+toInt(r.amount),0));
  const totals = { labor:sumType('labor'), equip:sumType('equip'), fuel:sumType('fuel'), maint:sumType('maint'), daily:sumType('daily'), expense:sumType('expense'), cost:sumType('cost'), supplier:sumType('supplier'), warehouse:sumType('warehouse') };
  totals.total = toInt(totals.labor + totals.equip + totals.fuel + totals.maint + totals.daily + totals.expense + totals.cost + totals.supplier + totals.warehouse);
  const proj = (typeof getProjectByName === 'function') ? getProjectByName(name) : null;
  const budget = toInt(proj && proj.budget);
  return { name, from:F, to:T, members, equipment, ledger, totals, budget, remaining: budget ? toInt(budget - totals.total) : null,
    people: members.length, days: Math.round(members.reduce((s,m)=>s+m.days,0)*100)/100 };
}

/** تطبيق البحث ونوع الحركة على الحركات */
function pstFilterLedger(st, f){
  let rows = st.ledger;
  if(f.type) rows = rows.filter(r=>r.type === f.type);
  if(f.q && String(f.q).trim()) rows = rows.filter(r=>smartMatch([r.who, r.detail, PST_TYPES[r.type], pstKindLabel(r.kind)].join(' '), f.q));
  return rows;
}

/** أقسام الكشف للشاشة والطباعة */
function projectStatementSectionsHtml(st, rows, mode){
  const print = mode === 'print';
  const T = print ? '<table>' : '<table class="data-table">';
  const WRAP = (inner)=> print ? inner : '<div class="table-wrap">'+inner+'</div>';
  const H = (t)=> print ? '<h4>'+t+'</h4>' : '<div class="section-title" style="margin-top:18px;">'+t+'</div>';
  const m = fmtMoney, t = st.totals;
  const pct = (v)=> st.totals.total ? Math.round(v / st.totals.total * 1000) / 10 + '%' : '—';
  const cats = [['labor','يوميات العمالة'],['equip','يوميات المعدات'],['fuel','الوقود'],['maint','الصيانة'],['daily','يومية المشروع'],['expense','المصروفات'],['supplier','فواتير الموردين'],['warehouse','صرف المخازن'],['cost','التكاليف']];
  let html = '';
  // جداول الأشخاص: العمالة / المشرفين / المهندسين
  const peopleTable = (title, list, emptyMsg)=> H(title)+WRAP(T+`<thead><tr><th>الاسم</th><th>الفئة</th><th>الكود</th><th>تاريخ الانضمام</th><th>آخر يوم</th><th>أيام العمل</th><th>غياب</th><th>أجور الفترة</th><th>تكاليف</th><th>مصروفات</th></tr></thead><tbody>
    ${list.length ? list.map(p=>`<tr><td><strong>${escapeHtml(p.name)}</strong></td><td>${pstKindLabel(p.kind)}</td><td>${escapeHtml(p.code)}</td><td>${p.join?fmtDate(p.join):'—'}</td><td>${p.current?'<span class="badge badge-ok">على المشروع</span>':(p.leave?fmtDate(p.leave):'—')}</td><td>${fmtDays(p.days)}</td><td>${fmtNum(p.absent)}</td><td>${m(p.labor)}</td><td>${m(p.costs)}</td><td>${m(p.expenses)}</td></tr>`).join('') : `<tr><td colspan="10" style="text-align:center;color:var(--ink-soft);padding:14px;">${emptyMsg}</td></tr>`}</tbody>
    <tfoot><tr><th colspan="5">الإجمالي (${list.length})</th><th>${fmtDays(toInt(list.reduce((s,p)=>s+p.days,0)*100)/100)}</th><th></th><th>${m(toInt(list.reduce((s,p)=>s+p.labor,0)))}</th><th>${m(toInt(list.reduce((s,p)=>s+p.costs,0)))}</th><th>${m(toInt(list.reduce((s,p)=>s+p.expenses,0)))}</th></tr></tfoot></table>`);
  const engs = (DATA.employees || []).filter(e=>e && String(e.project||'').trim() === st.name && /مهندس/.test([e.position, e.jobTitle, e.skill, e.section].join(' ')));
  html += H('جدول مهندسي المشروع')+WRAP(T+`<thead><tr><th>الاسم</th><th>الوظيفة</th><th>الكود</th><th>تاريخ الانضمام للمشروع</th></tr></thead><tbody>
    ${engs.length ? engs.map(e=>`<tr><td><strong>${escapeHtml(e.name||'')}</strong></td><td>${escapeHtml(e.position||e.jobTitle||e.skill||'')}</td><td>${escapeHtml(e.code||'')}</td><td>${e.projectSince?fmtDate(e.projectSince):'—'}</td></tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--ink-soft);padding:14px;">لا مهندسين على المشروع</td></tr>'}</tbody></table>`);
  html += peopleTable('جدول مشرفي المشروع', st.members.filter(p=>p.kind === 'supervisor'), 'لا مشرفين في الفترة');
  html += peopleTable('جدول العمالة', st.members.filter(p=>p.kind !== 'supervisor'), 'لا عمالة في الفترة');
  if(st.equipment.length){
    html += H('المعدات على المشروع')+WRAP(T+`<thead><tr><th>المعدة</th><th>الكود</th><th>تاريخ الانضمام</th><th>أيام</th><th>التكلفة</th></tr></thead><tbody>
      ${st.equipment.map(e=>`<tr><td><strong>${escapeHtml(e.name)}</strong></td><td>${escapeHtml(e.code)}</td><td>${e.join?fmtDate(e.join):'—'}</td><td>${fmtDays(e.days)}</td><td>${m(e.cost)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><th colspan="4">إجمالي المعدات</th><th>${m(toInt(st.equipment.reduce((s,e)=>s+e.cost,0)))}</th></tr></tfoot></table>`);
  }
  // جداول: التكاليف / المصروفات / الموردين / المخازن (من حركات الفترة)
  [['cost','جدول التكاليف'],['expense','جدول المصاريف'],['supplier','جدول الموردين'],['warehouse','جدول المخازن']].forEach(([ty, ttl])=>{
    const L = st.ledger.filter(r=>r.type === ty);
    html += H(ttl)+WRAP(T+`<thead><tr><th>التاريخ</th><th>الاسم</th><th>التفاصيل</th><th>المبلغ</th></tr></thead><tbody>
      ${L.length ? L.map(r=>`<tr><td>${fmtDate(r.date)}</td><td>${escapeHtml(r.who||'—')}</td><td style="white-space:normal;">${escapeHtml(r.detail||'')}</td><td>${m(r.amount)}</td></tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--ink-soft);padding:14px;">لا حركات في الفترة</td></tr>'}</tbody>
      <tfoot><tr><th colspan="3">الإجمالي (${L.length})</th><th>${m(toInt(L.reduce((s,r)=>s+toInt(r.amount),0)))}</th></tr></tfoot></table>`);
  });
  // دفتر الحركات
  const total = toInt(rows.reduce((s,r)=>s+toInt(r.amount),0));
  const body = (list)=> list.map(r=>`<tr><td>${fmtDate(r.date)}</td><td>${escapeHtml(PST_TYPES[r.type]||r.type)}</td><td>${escapeHtml(r.who||'—')}</td><td style="white-space:normal;">${escapeHtml(r.detail||'')}</td><td>${m(r.amount)}</td></tr>`).join('');
  const collected = (typeof compCostCollected === 'function') ? compCostCollected(st.name) : 0;
  const proj_ = (typeof getProjectByName === 'function') ? getProjectByName(st.name) : null;
  const contractVal = toInt(proj_ && (proj_.value || 0));
  const costTotal = toInt(t.total);
  const actualProfit = toInt(collected - costTotal);
  const expectedProfit = contractVal ? toInt(contractVal - costTotal) : null;
  const verdictOf = (v)=> v > 0 ? '<span class="badge badge-ok">✅ رابح</span>' : (v < 0 ? '<span class="badge badge-danger" style="background:#fdeceb;color:#a02a20;">❌ خسارة</span>' : '<span class="badge badge-muted">➖ متعادل</span>');
  const profitHtml = H('جدول ربحية المشروع')+WRAP(T+`<thead><tr><th>البند</th><th>المبلغ</th><th>النتيجة</th></tr></thead><tbody>
    <tr><td>قيمة المشروع / العقد</td><td>${contractVal?m(contractVal):'—'}</td><td></td></tr>
    <tr><td>المحصّل فعلياً من العميل</td><td>${m(collected)}</td><td></td></tr>
    <tr><td>إجمالي تكلفة المشروع</td><td>${m(costTotal)}</td><td></td></tr>
    <tr><td><strong>الربح الفعلي (المحصّل − التكلفة)</strong></td><td style="color:${actualProfit<0?'var(--debt)':'inherit'};"><strong>${m(actualProfit)}</strong></td><td>${verdictOf(actualProfit)}</td></tr>
    <tr><td><strong>الربح المتوقع (قيمة المشروع − التكلفة)</strong></td><td style="color:${expectedProfit!=null&&expectedProfit<0?'var(--debt)':'inherit'};"><strong>${expectedProfit==null?'—':m(expectedProfit)}</strong></td><td>${expectedProfit==null?'<span class="badge badge-muted">حدد قيمة المشروع</span>':verdictOf(expectedProfit)}</td></tr>
    ${contractVal?`<tr><td>هامش الربح المتوقع</td><td>${Math.round(expectedProfit/contractVal*1000)/10}%</td><td></td></tr>`:''}
    </tbody></table>`);
  return { bottom: profitHtml, top: html, ledgerHead: H('دفتر حركات المشروع'), ledgerTable: (list)=> (print ? '' : '<div id="pstLedgerBox">') + WRAP(T+`<thead><tr><th>التاريخ</th><th>النوع</th><th>الاسم / المعدة</th><th>التفاصيل</th><th>المبلغ</th></tr></thead><tbody>${list.length?body(list):'<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);padding:16px;">لا حركات</td></tr>'}</tbody><tfoot><tr><th colspan="4">إجمالي الحركات المعروضة (${rows.length})</th><th>${m(total)}</th></tr></tfoot></table>`) + (print ? '' : '</div>') };
}

/** تخطيط الموارد (من الصفحة القديمة) */
function pstPlansHtml(proj){
  const plans = (DATA.projectPlans||[]).filter(pl=>pl && (pl.projectId===proj.id || pl.project===proj.name));
  const res = resourcesOnProject(proj.name);
  return `<div class="section-title" style="margin-top:18px;">تخطيط الموارد</div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>من</th><th>إلى</th><th>عمال مطلوبين</th><th>معدات</th><th>الوضع</th></tr></thead>
      <tbody>${plans.length ? plans.map(pl=>{
        const needW = toInt(pl.workersNeeded), haveW = res.workers.length;
        const status = needW<=haveW ? '✅ متوفر' : (haveW>0 ? '🟡 جزئي' : '🔴 عجز');
        return `<tr><td>${fmtDate(pl.from)}</td><td>${fmtDate(pl.to)}</td><td>${needW} (متاح ${haveW})</td><td>${escapeHtml(pl.equipmentNeeded||'—')}</td><td>${status}</td></tr>`;
      }).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);">لا خطط — من زر «تخطيط موارد»</td></tr>'}</tbody></table></div>`;
}

function renderProjectStatementPage(proj){
  const f = projectStmtFilters;
  const per = pstResolvePeriod(f);
  const st = projectStatement(proj.name, per.from, per.to);
  const rows = pstFilterLedger(st, f);
  const sec = projectStatementSectionsHtml(st, rows, 'screen');
  const pg = (typeof paginateRows === 'function') ? paginateRows(rows, 'projStmt') : { pageRows: rows };
  try{
    if(typeof setPageExport === 'function') setPageExport('project-' + proj.name,
      ['التاريخ','النوع','الاسم / المعدة','التفاصيل','المبلغ'],
      rows.map(r=>[r.date, PST_TYPES[r.type]||r.type, r.who||'', r.detail||'', toInt(r.amount)]));
  }catch(_e){}
  const presets = [['all','كل الفترات'],['month','هذا الشهر'],['prevMonth','الشهر السابق'],['year','هذه السنة'],['custom','فترة مخصصة']];
  return `
    <div class="page">
      ${(()=>{
        const c = projectCostSummary(proj.name);
        const cust = (typeof clCustomers==='function' ? clCustomers() : []).find(x=>x && (x.id===proj.customerId || (!proj.customerId && x.name===proj.customerName)));
        const custName = (cust && cust.name) || proj.customerName || proj.customer || '';
        const budget = toInt(proj.budget), cost = toInt(st.totals.total);
        const pctB = budget ? Math.min(100, Math.round(cost/budget*100)) : 0;
        const bs = c.budgetStatus==='ok'?'🟢 تحت الميزانية':c.budgetStatus==='warn'?'🟡 قريب من الميزانية':c.budgetStatus==='over'?'🔴 تجاوز الميزانية':'';
        const stg = (typeof normalizeProjectStatus==='function') ? normalizeProjectStatus(proj) : (proj.status||'');
        return `<div class="pv-hero">
          <div>
            <button class="btn btn-outline btn-sm" id="btnBackProj">← رجوع للمشاريع</button>
            <h2>${escapeHtml(proj.code?proj.code+' — ':'')}${escapeHtml(proj.name)}</h2>
            <div class="pv-sub">${custName?`<span>👤 ${escapeHtml(custName)}</span>`:''}${proj.location?`<span>📍 ${escapeHtml(proj.location)}</span>`:''}${proj.startDate?`<span>📅 بداية: ${fmtDate(proj.startDate)}</span>`:''}${proj.endDate?`<span>🏁 نهاية: ${fmtDate(proj.endDate)}</span>`:''}</div>
            <div class="pv-badges" style="margin-top:8px;"><span class="pv-badge">📌 ${escapeHtml(stg||'—')}</span>${bs?`<span class="pv-badge">${bs}</span>`:''}</div>
          </div>
          ${budget?`<div class="pv-budget ${cost>budget?'over':''}"><div style="font-size:12.5px;">التكلفة مقابل الميزانية</div><div class="pv-bar"><i style="width:${pctB}%"></i></div><div style="font-size:13px;font-weight:800;">${fmtMoney(cost)} / ${fmtMoney(budget)} (${budget?Math.round(cost/budget*100):0}%)</div></div>`:''}
          <div class="btn-row" style="display:flex;gap:8px;flex-wrap:wrap;">
            ${typeof pageExportButtonsHtml === 'function' ? pageExportButtonsHtml() : ''}
            <button class="btn btn-outline" id="btnPrintProjStmt">🖨️ طباعة الكشف</button>
            <button class="btn btn-outline" id="btnEditProjDetail">✏️ تعديل المشروع</button>
          </div>
        </div>`;
      })()}
      <div class="pv-section-title">🛣️ مسار المشروع</div>
      ${typeof renderProjectPathTrack==='function' ? renderProjectPathTrack(proj) : ''}
      <div class="pv-section-title">📊 كشف حساب المشروع</div>
      <div class="filters-bar">
        <input type="search" id="pstQ" class="input" placeholder="بحث: اسم، تفاصيل..." value="${escapeHtml(f.q||'')}">
        <select id="pstType" class="input" title="نوع الحركة"><option value="">النوع: الكل</option>${Object.keys(PST_TYPES).map(k=>`<option value="${k}" ${f.type===k?'selected':''}>${PST_TYPES[k]}</option>`).join('')}</select>
        <select id="pstPreset" class="input" title="الفترة">${presets.map(([k,l])=>`<option value="${k}" ${f.preset===k?'selected':''}>${l}</option>`).join('')}</select>
        <label>من <input type="date" id="pstFrom" class="input" value="${escapeHtml(f.preset==='custom'?(f.from||''):per.from)}" ${f.preset==='custom'?'':'disabled'}></label>
        <label>إلى <input type="date" id="pstTo" class="input" value="${escapeHtml(f.preset==='custom'?(f.to||''):per.to)}" ${f.preset==='custom'?'':'disabled'}></label>
        <button class="btn btn-outline btn-sm" id="pstApply">تطبيق</button>
        <button class="btn btn-outline btn-sm" id="pstClear">مسح الفلاتر</button>
      </div>
      <div class="stats-row" style="margin-bottom:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;">
        <div class="stat-card"><div class="num">${st.people}</div><div class="lbl">أشخاص</div></div>
        <div class="stat-card"><div class="num">${fmtDays(st.days)}</div><div class="lbl">أيام العمل</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(st.totals.labor)}</div><div class="lbl">أجور العمالة</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(st.totals.equip + st.totals.fuel + st.totals.maint)}</div><div class="lbl">معدات + وقود + صيانة</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(st.totals.expense + st.totals.cost)}</div><div class="lbl">مصروفات + تكاليف</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(st.totals.supplier + st.totals.warehouse)}</div><div class="lbl">موردين + مخازن</div></div>
        ${(()=>{ const col = (typeof compCostCollected==='function') ? compCostCollected(st.name) : 0; const net = col - st.totals.total; return `<div class="stat-card ${net<0?'debt':''}" title="المحصّل من العميل − إجمالي التكلفة"><div class="num">${fmtMoney(net)}</div><div class="lbl">الربحية (المحصّل ${fmtMoney(col)} − التكلفة)</div></div>`; })()}
        <div class="stat-card ${st.remaining!=null && st.remaining<0?'debt':''}"><div class="num">${fmtMoney(st.totals.total)}</div><div class="lbl">إجمالي تكلفة المشروع${st.budget?' (الميزانية '+fmtMoney(st.budget)+')':''}</div></div>
      </div>
      ${typeof projectTimelineHtml==='function' ? projectTimelineHtml(proj) : ''}
      ${sec.top}
      ${sec.ledgerHead}
      ${sec.ledgerTable(pg.pageRows)}
      ${typeof tablePagerHtml === 'function' ? tablePagerHtml('projStmt', pg) : ''}
      ${sec.bottom}
      ${proj.notes ? `<p style="margin-top:12px;font-size:13px;color:var(--ink-soft);">ملاحظات: ${escapeHtml(proj.notes)}</p>` : ''}
    </div>`;
}

function initProjectStatementEvents(proj){
  if(typeof initProjectPathEvents === 'function') initProjectPathEvents(proj);
  const apply = ()=>{
    projectStmtFilters.q = document.getElementById('pstQ')?.value || '';
    projectStmtFilters.type = document.getElementById('pstType')?.value || '';
    projectStmtFilters.preset = document.getElementById('pstPreset')?.value || 'all';
    if(projectStmtFilters.preset === 'custom'){
      projectStmtFilters.from = document.getElementById('pstFrom')?.value || '';
      projectStmtFilters.to = document.getElementById('pstTo')?.value || '';
    }
    if(typeof resetTablePage === 'function') resetTablePage('projStmt');
    rerenderCurrentPage();
  };
  document.getElementById('pstApply')?.addEventListener('click', apply);
  document.getElementById('pstPreset')?.addEventListener('change', ()=>{
    // أول ما تختار "مخصصة" نبدأ من الفترة الحالية عشان تعدّل عليها
    if(document.getElementById('pstPreset').value === 'custom'){
      const cur = pstResolvePeriod(projectStmtFilters);
      projectStmtFilters.from = projectStmtFilters.from || cur.from; projectStmtFilters.to = projectStmtFilters.to || cur.to;
    }
    apply();
  });
  document.getElementById('pstType')?.addEventListener('change', apply);
  document.getElementById('pstQ')?.addEventListener('keydown', e=>{ if(e.key === 'Enter') apply(); });
  document.getElementById('pstClear')?.addEventListener('click', ()=>{
    projectStmtFilters = { q:'', type:'', preset:'all', from:'', to:'' };
    if(typeof resetTablePage === 'function') resetTablePage('projStmt');
    rerenderCurrentPage();
  });
  document.getElementById('btnBackProj')?.addEventListener('click', ()=>{ projectFilters.detailId = ''; rerenderCurrentPage(); });
  document.getElementById('btnEditProjDetail')?.addEventListener('click', ()=> openProjectModal(proj.id));
  document.getElementById('btnPrintProjStmt')?.addEventListener('click', ()=>{
    const per = pstResolvePeriod(projectStmtFilters);
    const st = projectStatement(proj.name, per.from, per.to);
    const rows = pstFilterLedger(st, projectStmtFilters);
    const sec = projectStatementSectionsHtml(st, rows, 'print');
    const periodLine = 'الفترة: ' + (per.from ? fmtDate(per.from) : 'كل الفترات') + (per.to ? ' → ' + fmtDate(per.to) : '');
    printHtml(`
      <div class="print-sheet">
        ${typeof statementHeaderHtml==='function' ? statementHeaderHtml('كشف حساب مشروع — '+proj.name, periodLine) : `<h2 style="text-align:center;">كشف حساب مشروع ${escapeHtml(proj.name)}</h2>`}
        ${sec.top}
        ${sec.ledgerHead}
        ${sec.ledgerTable(rows)}
        ${sec.bottom}
        ${typeof statementFooterHtml==='function' ? statementFooterHtml() : ''}
      </div>`, 'كشف حساب مشروع');
  });
}
