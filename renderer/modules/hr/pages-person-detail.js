/** صفحة عرض شخص (موظف/عامل/مشرف/سائق) — مثل عرض المعدة */
let personDetailState = { kind: '', id: '' };

function openPersonDetailPage(kind, id){
  personDetailState = { kind: kind||'employee', id: id||'' };
  if(kind==='employee'){
    try{ activeEmployeeId = id; }catch(e){}
  }
  currentPage = 'personDetail';
  if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
  else if(typeof render==='function') render();
}

function getPersonDetailEntity(kind, id){
  if(kind==='employee') return getEmployee(id);
  if(kind==='worker') return getWorker(id);
  if(kind==='supervisor') return getSupervisor(id);
  if(kind==='driver') return typeof getDriver==='function'?getDriver(id):(DATA.drivers||[]).find(x=>x.id===id);
  return null;
}

function personDetailKindLabel(kind){
  return ({employee:'موظف',worker:'عامل',supervisor:'مشرف',driver:'سائق'}[kind])||kind;
}

function personDetailBackPage(kind){
  return ({employee:'employees',worker:'workers',supervisor:'supervisors',driver:'drivers'}[kind])||'employees';
}


/* ===================== أقسام مشتركة لصفحات عرض الأشخاص والمعدات ===================== */
let personFinPeriod = 'month';
let personFinFrom = '', personFinTo = '';
function personFinRange(){
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  const iso = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  if(personFinPeriod==='month') return { from: iso(new Date(y,m,1)), to: iso(new Date(y,m+1,0)), label:'الشهر الحالي' };
  if(personFinPeriod==='prev') return { from: iso(new Date(y,m-1,1)), to: iso(new Date(y,m,0)), label:'الشهر السابق' };
  if(personFinPeriod==='year') return { from: y+'-01-01', to: y+'-12-31', label:'السنة الحالية' };
  if(personFinPeriod==='custom') return { from: personFinFrom, to: personFinTo, label: 'من '+(personFinFrom?fmtDate(personFinFrom):'البداية')+' إلى '+(personFinTo?fmtDate(personFinTo):'اليوم') };
  return { from:'', to:'', label:'كل الفترات' };
}
function personFinData(kind, id){
  const r = personFinRange(), from = r.from, to = r.to;
  let due = 0, paid = 0, pen = 0;
  try{
    if(kind==='worker'){ due = workerDueAmount(id,from,to); paid = workerPaidTotal(id,from,to); pen = workerPenaltyTotal(id,from,to); }
    else if(kind==='employee'){ due = employeeDueAmount(id,from,to); pen = employeePenaltyTotal(id,from,to);
      paid = toInt((DATA.workerPayments||[]).filter(p=>p.personType==='employee'&&p.personId===id&&isActualPayment(p)&&(!from||(p.date||'')>=from)&&(!to||(p.date||'')<=to)).reduce((s,p)=>s+toInt(p.amount),0)); }
    else if(kind==='supervisor'){ due = supervisorOwnDue(id,from,to); paid = supervisorPaidTotal(id,from,to); pen = supervisorPenaltyTotal(id,from,to); }
    else if(kind==='driver'){ due = driverDueAmount(id,from,to); paid = driverPaidTotal(id,from,to); pen = driverPenaltyTotal(id,from,to); }
    else if(kind==='equipment'){
      paid = toInt((DATA.workerPayments||[]).filter(p=>p.personType==='equipment'&&p.personId===id&&isActualPayment(p)&&(!from||(p.date||'')>=from)&&(!to||(p.date||'')<=to)).reduce((s,p)=>s+toInt(p.amount),0));
      due = typeof equipmentTotalCost==='function' ? toInt(equipmentTotalCost(id, from||undefined, to||undefined)) : 0;
    }
  }catch(e){ console.warn('personFinData', e); }
  const extras = typeof personExtrasTotal==='function' ? personExtrasTotal(kind,id,from,to) : 0;
  const exp = typeof personExpensesTotal==='function' ? personExpensesTotal(kind,id,from,to) : 0;
  const costs = typeof personCostsTotal==='function' ? personCostsTotal(kind,id,from,to) : 0;
  const bonus = Math.max(0, extras - costs);
  const gross = due + extras;
  const remaining = toInt(gross - paid - pen - exp);
  const pays = (DATA.workerPayments||[]).filter(p=>{
    const pt = p.personType || (p.workerId ? 'worker' : '');
    const pid = p.personId || p.workerId || '';
    return pt===kind && pid===id && isActualPayment(p) && (!from||(p.date||'')>=from) && (!to||(p.date||'')<=to);
  }).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  return { range:r, due, extras, costs, bonus, exp, pen, paid, gross, remaining, pays };
}
function personFinStatus(f){
  const net = f.gross - f.pen - f.exp;
  if(f.paid>0 && f.remaining<=0) return { cls:'ok', ico:'✅', txt:'استلم القبض كاملاً' };
  if(f.paid>0) return { cls:'part', ico:'◐', txt:'استلم جزءاً من القبض' };
  if(net>0) return { cls:'no', ico:'⏳', txt:'لم يستلم القبض بعد' };
  return { cls:'none', ico:'—', txt:'لا مستحقات في الفترة' };
}
function personFinanceHtml(kind, p){
  const f = personFinData(kind, p.id), st = personFinStatus(f), r = f.range;
  const net = f.gross - f.pen - f.exp;
  const pct = net>0 ? Math.min(100, Math.round(f.paid/net*100)) : (f.paid>0?100:0);
  const last = f.pays[0];
  const isEq = kind==='equipment';
  const tile = (ico, lbl, val, cls)=>`<div class="pf-tile ${cls||''}"><span class="pf-ico">${ico}</span><div><em>${lbl}</em><b>${fmtMoney(val)}</b></div></div>`;
  const expList = typeof personExpensesList==='function' ? personExpensesList(kind, p.id, r.from, r.to) : [];
  const costList = typeof costsInRange==='function' ? costsInRange(kind, p.id, r.from, r.to) : [];
  const per = (v,l)=>`<button type="button" class="ac-pill pf-per${personFinPeriod===v?' is-on':''}" data-per="${v}">${l}</button>`;
  const ro = (typeof readOnlyMode!=='undefined' && readOnlyMode) ? 'disabled' : '';
  return `
    <section class="settings-card pf-card" id="personFin">
      <div class="pf-head">
        <div class="section-title" style="margin:0;">💰 الحساب المالي — ${escapeHtml(r.label)}</div>
        <div class="pf-pers">${per('month','الشهر الحالي')}${per('prev','الشهر السابق')}${per('year','السنة')}${per('all','الكل')}</div>
      </div>
      <div class="pf-range${personFinPeriod==='custom'?' is-on':''}">
        <span>📆 فترة مخصّصة:</span>
        <label>من <input type="date" class="input" id="pfFrom" value="${escapeHtml(personFinPeriod==='custom'?personFinFrom:r.from)}"></label>
        <label>إلى <input type="date" class="input" id="pfTo" value="${escapeHtml(personFinPeriod==='custom'?personFinTo:r.to)}"></label>
        <button type="button" class="btn btn-outline btn-sm" id="btnPfApply">تطبيق</button>
        <button type="button" class="btn btn-primary btn-sm pf-print" id="btnPfPrint">${(kind==='worker' && typeof isTempWorkerRec==='function' && isTempWorkerRec(p)) ? '🖨️ طباعة كشف أيام' : (kind==='equipment' ? '🖨️ طباعة كشف أيام المعدة' : '🖨️ طباعة كشف حساب')}</button>
      </div>
      <div class="pf-receipt ${st.cls}">
        <div class="pf-rc-main"><span class="pf-rc-ico">${st.ico}</span><div><div class="pf-rc-t">حالة استلام القبض</div><div class="pf-rc-s">${st.txt}</div>
          <div class="pf-rc-d">${last ? 'آخر استلام: '+fmtDate(last.date)+' — '+fmtMoney(last.amount) : 'لا يوجد صرف مسجّل في هذه الفترة'}</div></div></div>
        <div class="pf-rc-bar"><div class="pf-bar"><span style="width:${pct}%"></span></div><div class="pf-bar-l"><span>مستلم ${fmtMoney(f.paid)}</span><b>${pct}%</b><span>متبقي ${fmtMoney(Math.max(0,f.remaining))}</span></div></div>
        <div class="pf-actions">
          <button type="button" class="btn btn-primary btn-sm" id="btnPfPay" ${ro}>＋ تسجيل صرف / استلام</button>
          ${isEq?'':`<button type="button" class="btn btn-outline btn-sm" id="btnPfPen" ${ro}>＋ خصم / جزاء</button>`}
        </div>
      </div>
      <div class="pf-tiles">
        ${tile('📅', isEq?'تكلفة التشغيل':'المستحق الأساسي', f.due)}
        ${isEq?'':tile('➕', 'بدلات ومكافآت', f.bonus, 'plus')}
        ${tile('🧾', 'التكاليف (مستحقة له)', f.costs, 'plus')}
        ${tile('🧮', 'المصاريف (تُخصم)', f.exp, 'minus')}
        ${isEq?'':tile('⚠️', 'الخصومات والجزاءات', f.pen, 'minus')}
        ${tile('💵', 'المدفوع / المستلم', f.paid, 'ok')}
        ${tile('📌', 'المتبقي', f.remaining, f.remaining>0?'warn':'ok')}
      </div>
      <div class="pf-tables">
        <div class="pf-box"><h5>🧮 المصاريف (${expList.length})</h5><div class="table-wrap">${typeof expensesTableHtml==='function' ? expensesTableHtml(expList) : ''}</div></div>
        <div class="pf-box"><h5>🧾 التكاليف (${costList.length})</h5>${costList.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>التاريخ</th><th>البند</th><th>المشروع</th><th>المبلغ</th></tr></thead><tbody>${costList.map(c=>`<tr><td>${fmtDate(c.date)}</td><td>${escapeHtml(typeof costItemText==='function'?costItemText(c):(c.item||'تكلفة'))}</td><td>${escapeHtml(c.project||'—')}</td><td>${fmtMoney(c.amount)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="pn-empty">لا تكاليف في هذه الفترة</div>'}</div>
        <div class="pf-box"><h5>💵 سجل الصرف والاستلام (${f.pays.length})</h5>${f.pays.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>التاريخ</th><th>البند</th><th>المبلغ</th><th>ملاحظات</th></tr></thead><tbody>${f.pays.slice(0,15).map(x=>`<tr><td>${fmtDate(x.date)}</td><td>${escapeHtml(x.payCategory||x.reason||'صرف')}</td><td>${fmtMoney(x.amount)}</td><td>${escapeHtml(x.notes||'')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="pn-empty">لا صرف مسجّل</div>'}</div>
      </div>
    </section>`;
}
function printPersonFinanceStatement(kind, p){
  const f = personFinData(kind, p.id), r = f.range;
  const kl = kind==='equipment' ? 'معدة / مركبة' : personDetailKindLabel(kind);
  const title = (typeof buildExportFileTitle==='function') ? buildExportFileTitle('كشف حساب '+kl, p.name||p.code||'', r.from, r.to) : 'كشف حساب '+kl;
  const periodLine = 'الفترة: '+(r.from?fmtDate(r.from):'الكل')+' → '+(r.to?fmtDate(r.to):'الكل');
  const st = personFinStatus(f);
  const expList = typeof personExpensesList==='function' ? personExpensesList(kind, p.id, r.from, r.to) : [];
  const costList = typeof costsInRange==='function' ? costsInRange(kind, p.id, r.from, r.to) : [];
  const row = (l,v,b)=>`<tr><th>${l}</th><td${b?' style="font-weight:800;"':''}>${v}</td></tr>`;
  const expRows = expList.map(e=>`<tr><td>${fmtDate(e.date)}</td><td>${escapeHtml(e.item||e.category||e.type||'مصروف')}</td><td>${escapeHtml(e.project||'—')}</td><td>${fmtMoney((Array.isArray(e.lines)&&e.lines.length)?e.lines.reduce((a,l)=>a+toInt(l.amount),0):toInt(e.amount||e.total||0))}</td></tr>`).join('');
  const costRows = costList.map(c=>`<tr><td>${fmtDate(c.date)}</td><td>${escapeHtml(typeof costItemText==='function'?costItemText(c):(c.item||'تكلفة'))}</td><td>${escapeHtml(c.project||'—')}</td><td>${fmtMoney(c.amount)}</td></tr>`).join('');
  const payRows = f.pays.map(x=>`<tr><td>${fmtDate(x.date)}</td><td>${escapeHtml(x.payCategory||x.reason||'صرف')}</td><td>${escapeHtml(x.notes||'')}</td><td>${fmtMoney(x.amount)}</td></tr>`).join('');
  const tbl = (head, rows, total, cols)=> rows ? `<h4 style="margin-top:16px;">${head}</h4><table><thead><tr>${cols.map(c=>'<th>'+c+'</th>').join('')}</tr></thead><tbody>${rows}</tbody><tfoot><tr><th colspan="${cols.length-1}">الإجمالي</th><th>${fmtMoney(total)}</th></tr></tfoot></table>` : '';
  const stTitle = 'كشف حساب '+kl;
  printHtml(`
    <div class="print-sheet">
      ${statementHeaderHtml(title || stTitle, periodLine)}
      <table>
        <tr><th>الاسم</th><td>${escapeHtml(p.name||'')}</td><th>الكود</th><td>${escapeHtml(p.code||'')}</td></tr>
        <tr><th>النوع</th><td>${escapeHtml(kl)}</td><th>حالة استلام القبض</th><td>${st.ico} ${st.txt}</td></tr>
      </table>
      <h4 style="margin-top:16px;">الملخص المالي</h4>
      <table>
        ${row(kind==='equipment'?'تكلفة التشغيل':'المستحق الأساسي', fmtMoney(f.due))}
        ${kind==='equipment'?'':row('بدلات ومكافآت', fmtMoney(f.bonus))}${row('التكاليف (مستحقة)', fmtMoney(f.costs))}
        ${row('المصاريف (تُخصم)', fmtMoney(f.exp))}${kind==='equipment'?'':row('الخصومات والجزاءات', fmtMoney(f.pen))}
        ${row('المدفوع / المستلم', fmtMoney(f.paid))}${row('المتبقي', fmtMoney(f.remaining), true)}
      </table>
      ${tbl('المصاريف', expRows, f.exp, ['التاريخ','البند','المشروع','المبلغ'])}
      ${tbl('التكاليف', costRows, f.costs, ['التاريخ','البند','المشروع','المبلغ'])}
      ${tbl('سجل الصرف والاستلام', payRows, f.paid, ['التاريخ','البند','ملاحظات','المبلغ'])}
      ${typeof statementFooterHtml==='function'?statementFooterHtml():''}
    </div>`, title || stTitle, { statement:true, brand:false, periodLine: periodLine, headerTitle: title || stTitle });
}
function bindPersonFinance(kind, id, afterFn){
  document.getElementById('btnPfApply')?.addEventListener('click', ()=>{
    personFinFrom = document.getElementById('pfFrom')?.value||''; personFinTo = document.getElementById('pfTo')?.value||'';
    if(personFinFrom && personFinTo && personFinFrom > personFinTo){ showToast('تاريخ البداية بعد النهاية'); return; }
    personFinPeriod = 'custom'; rerenderCurrentPage();
  });
  document.getElementById('btnPfPrint')?.addEventListener('click', ()=>{
    const ent = kind==='equipment' ? (typeof getEquipment==='function' ? getEquipment(id) : null) : getPersonDetailEntity(kind, id);
    if(ent && kind==='worker' && typeof isTempWorkerRec==='function' && isTempWorkerRec(ent)){ const r = personFinRange(); printDaysStatement('worker', id, r.from||undefined, r.to||undefined); return; }
    if(ent && kind==='equipment' && typeof printEquipmentDaysStatement==='function'){ const r = personFinRange(); printEquipmentDaysStatement(id, r.from||undefined, r.to||undefined); return; }
    if(ent) printPersonFinanceStatement(kind, ent);
  });
  document.querySelectorAll('.pf-per').forEach(b=>b.addEventListener('click', ()=>{ personFinPeriod = b.getAttribute('data-per'); rerenderCurrentPage(); }));
  document.getElementById('btnPfPay')?.addEventListener('click', ()=>{ if(typeof openUnifiedPayModal==='function') openUnifiedPayModal('pay', id, kind); });
  document.getElementById('btnPfPen')?.addEventListener('click', ()=>{ if(typeof openUnifiedPayModal==='function') openUnifiedPayModal('penalty', id, kind); });
}
/** المستندات والمرفقات بشكل بطاقات */
function personDocsCardHtml(kind, p){
  const docs = (DATA.personDocuments||[]).filter(d=>d.personId===p.id);
  const items = []; const seen = new Set();
  const add = (name, src, date, expiry)=>{
    const key = String(name||'').trim()+'|'+String(src||'').trim();
    if(!String(name||'').trim() || seen.has(key)) return;
    seen.add(key); items.push({ name, src, date, expiry });
  };
  docs.forEach(d=>{
    const atts = d.attachments||[];
    if(atts.length) atts.forEach(a=>add(a.name||d.title||d.docType||'ملف', d.title||d.docType||'مستند', a.addedAt||d.date||'', d.expiryDate||''));
    else add(d.title||d.docType||'مستند', 'سجل مستند', d.date||'', d.expiryDate||'');
  });
  (p.attachments||[]).forEach(a=>{
    const nm = a.name||a.storedName||'ملف';
    if([...seen].some(k=>k.startsWith(String(nm).trim()+'|'))) return;
    add(nm, a.fromDoc||'مرفق مباشر', a.addedAt||'', '');
  });
  const icon = n => /pdf/i.test(n)?'📕':/\.(png|jpe?g|gif|webp)$/i.test(n)?'🖼️':/\.(docx?|rtf)$/i.test(n)?'📘':/\.(xlsx?|csv)$/i.test(n)?'📗':'📄';
  const exp = e=>{ if(!e) return ''; const st = typeof statusFromExpiry==='function'?statusFromExpiry(e):''; return st==='expired'?`<span class="pd-chip bad">منتهي ${fmtDate(e)}</span>`:`<span class="pd-chip ok">ساري حتى ${fmtDate(e)}</span>`; };
  const ro = (typeof readOnlyMode!=='undefined' && readOnlyMode) ? 'disabled' : '';
  return `
    <section class="settings-card pd-docs">
      <div class="pd-card-h"><span>📎 المستندات والمرفقات</span><span class="pn-badge">${items.length}</span><button type="button" class="btn btn-primary btn-sm" id="btnPersonDetDoc2" ${ro}>＋ إرفاق</button></div>
      <div class="pd-doc-list">
        ${items.length ? items.map(i=>`<div class="pd-doc"><span class="pd-doc-ico">${icon(i.name)}</span><div class="pd-doc-b"><b title="${escapeHtml(i.name)}">${escapeHtml(i.name)}</b><span>${escapeHtml(i.src||'—')}${i.date?' · '+fmtDate(i.date):''}</span></div>${exp(i.expiry)}</div>`).join('') : '<div class="pn-empty">لا مرفقات — اضغط «إرفاق» لإضافة مستند</div>'}
      </div>
    </section>`;
}
function personInfoCardHtml(kind, p, kindLabel){
  const dep = typeof departmentName==='function' ? departmentName(p.departmentId||p.categoryId) : '—';
  const f = (ico, k, v)=>`<div class="pd-f"><span class="pd-f-ico">${ico}</span><div><em>${k}</em><b>${v||'—'}</b></div></div>`;
  const expPill = (d)=>{ if(!d) return '—'; const st = typeof statusFromExpiry==='function'?statusFromExpiry(d):''; return fmtDate(d)+' '+(st==='expired'?'<span class="pd-chip bad">منتهية</span>':'<span class="pd-chip ok">سارية</span>'); };
  const _age = typeof personAge==='function' ? personAge(p) : null;
  const _bd = typeof personBirthDate==='function' ? personBirthDate(p) : (p.birthDate||'');
  const personal = [f('🎂','تاريخ الميلاد',_bd?(fmtDate(_bd)+(_age!=null?' <span class="pd-chip">'+_age+' سنة</span>':'')):''), f('🪪','الرقم القومي',escapeHtml(p.nationalId||p.nid||'')), f('📞','الهاتف',escapeHtml(p.phone||'')), f('✉️','البريد',escapeHtml(p.email||'')), f('📍','العنوان',escapeHtml(p.address||''))];
  let work = [f('🏢','القسم',escapeHtml(dep))];
  if(kind==='employee') work.push(f('💼','الوظيفة',escapeHtml(p.position||'')), f('💵','الراتب',fmtMoney(p.salary)), f('📅','تاريخ التعيين',fmtDate(p.hireDate)), f('🏖️','رصيد الإجازة',typeof employeeLeaveBalance==='function'?employeeLeaveBalance(p.id):''));
  else if(kind==='supervisor') work.push(f('💵','اليومية / الراتب',fmtMoney(p.dailyWage||p.salary)), f('🏗️','المشروع',escapeHtml(p.project||'')), f('📅','تاريخ التعيين',fmtDate(p.hireDate)));
  else work.push(f('🛠️','المهنة',escapeHtml(p.job||p.profession||p.position||'')), f('💵','اليومية',fmtMoney(p.dailyWage||p.wage)), f('👷','المشرف',escapeHtml(typeof supervisorName==='function'?supervisorName(p.supervisorId):'')), f('🏗️','المشروع',escapeHtml(p.project||'')), f('📅','تاريخ التعيين',fmtDate(p.hireDate)));
  const _insL = {insured:'مؤمن عليه',uninsured:'غير مؤمن عليه',pending:'قيد التسجيل'};
  const _stL = {valid:'سارية',active:'سارية',expired:'منتهية'};
  if(p.hireDate===undefined && false){}
  work.push(f('📝','نوع العقد',escapeHtml(p.contractType||'')), f('📑','حالة العقد',escapeHtml(p.contractStatus||'')));
  if(p.resignedAt) work.push(f('🚪','تاريخ الاستقالة',fmtDate(p.resignedAt)));
  if(p.retiredAt) work.push(f('🏖️','تاريخ الإحالة للمعاش',fmtDate(p.retiredAt)));
  if(p.retireDeferredUntil) work.push(f('🔄','تجديد بعد سن المعاش حتى',fmtDate(p.retireDeferredUntil)));
  const docsF = [f('🛡️','حالة التأمين',escapeHtml(_insL[p.insuranceStatus]||p.insuranceStatus||'')), f('🪪','حالة البطاقة',escapeHtml(_stL[p.idCardStatus]||p.idCardStatus||'')), f('🚗','حالة الرخصة',escapeHtml(_stL[p.licenseStatus]||p.licenseStatus||'')), f('🪪','انتهاء البطاقة',expPill(p.idCardExpiry)), f('🚗','انتهاء الرخصة',expPill(p.licenseExpiry)), f('🛡️','الرقم التأميني',escapeHtml(p.insuranceNumber||''))];
  const st = escapeHtml(labelOf(typeof EMPLOYEE_STATUS!=='undefined'?EMPLOYEE_STATUS:[], p.status)||p.status||'نشط');
  return `
    <section class="settings-card pd-info">
      <div class="pd-info-head"><span class="pd-avatar">${escapeHtml(String(p.name||'؟').trim().charAt(0))}</span>
        <div><div class="pd-name">${escapeHtml(p.name||'')}</div><div class="pd-meta"><span class="pd-chip">${escapeHtml(kindLabel)}</span><span class="pd-chip">${escapeHtml(p.code||'—')}</span><span class="pd-chip ok">${st}</span></div></div></div>
      <div class="pd-info-cols">
        <div class="pd-col"><h5>👤 بيانات شخصية</h5>${personal.join('')}</div>
        <div class="pd-col"><h5>💼 بيانات وظيفية</h5>${work.join('')}</div>
        <div class="pd-col"><h5>🛡️ الوثائق والتأمين</h5>${docsF.join('')}</div>
      </div>
    </section>`;
}

function renderPersonDetailPage(){
  const kind = personDetailState.kind || 'employee';
  const id = personDetailState.id || '';
  const p = getPersonDetailEntity(kind, id);
  if(!p){
    return `<div class="page"><p>السجل غير موجود</p>
      <button class="btn btn-outline" id="btnPersonDetBack">رجوع</button></div>`;
  }
  const kindLabel = personDetailKindLabel(kind);
  const issues = typeof personNotesIssues==='function' ? personNotesIssues(kind, p) : [];
  const notesLog = Array.isArray(p.notesLog) ? p.notesLog : (p.notes ? [{id:'legacy', text:p.notes, at:''}] : []);
  const dep = typeof departmentName==='function' ? departmentName(p.departmentId||p.categoryId) : '—';
  const docs = (DATA.personDocuments||[]).filter(d=>d.personId===p.id);
  const expList = typeof personExpensesList==='function' ? personExpensesList(kind, p.id) : (DATA.expenses||[]).filter(e=>e.personId===p.id);
  const expTotal = expList.reduce((s,e)=>s+(Number(e.amount)||0),0);

  const kv = (label, val)=>`<div class="eq-kv"><span class="eq-k">${label}</span><span class="eq-v">${val}</span></div>`;

  // حقول حسب النوع
  let extraKv = '';
  if(kind==='employee'){
    extraKv = `
      ${kv('القسم', escapeHtml(dep))}
      ${kv('الوظيفة', escapeHtml(p.position||'—'))}
      ${kv('الراتب', fmtMoney(p.salary))}
      ${kv('تاريخ التعيين', fmtDate(p.hireDate)||'—')}
      ${kv('رصيد الإجازة', typeof employeeLeaveBalance==='function'?employeeLeaveBalance(p.id):'—')}
      ${kv('البريد', escapeHtml(p.email||'—'))}`;
  } else if(kind==='worker' || kind==='driver'){
    extraKv = `
      ${kv('القسم', escapeHtml(dep))}
      ${kv('المهنة', escapeHtml(p.job||p.profession||p.position||'—'))}
      ${kv('اليومية', fmtMoney(p.dailyWage||p.wage))}
      ${kv('المشرف', escapeHtml(typeof supervisorName==='function'?supervisorName(p.supervisorId):'—'))}
      ${kv('المشروع', escapeHtml(p.project||'—'))}
      ${kv('تاريخ التعيين', fmtDate(p.hireDate)||'—')}`;
  } else if(kind==='supervisor'){
    extraKv = `
      ${kv('القسم', escapeHtml(dep))}
      ${kv('اليومية / الراتب', fmtMoney(p.dailyWage||p.salary))}
      ${kv('المشروع', escapeHtml(p.project||'—'))}
      ${kv('تاريخ التعيين', fmtDate(p.hireDate)||'—')}`;
  }

  return `
    <div class="page eq-detail-page person-detail-page">
      <div class="eq-detail-head">
        <div>
          <button class="btn btn-outline btn-sm" id="btnPersonDetBack">← رجوع للقائمة</button>
          <h2 class="page-title" style="margin:8px 0 0;">${escapeHtml(p.name||'')} <span style="font-size:14px;color:var(--ink-soft);">${escapeHtml(p.code||'')}</span></h2>
          <p class="page-sub" style="margin:4px 0 0;">${escapeHtml(kindLabel)} · ${escapeHtml(labelOf(typeof EMPLOYEE_STATUS!=='undefined'?EMPLOYEE_STATUS:[], p.status)||p.status||'نشط')}</p>
        </div>
        <div class="eq-detail-actions btn-row">
          <button class="btn btn-primary" id="btnPersonDetEdit">تعديل البيانات</button>
        </div>
      </div>

      ${personInfoCardHtml(kind, p, kindLabel)}

      <div class="pd-grid2">
      <div class="settings-card person-notes-card pn-compact">
        <div class="pn-title">الملاحظات والتنبيهات</div>
        <div class="pn-split">
          <div class="pn-col">
            <div class="pn-block pn-active">
              <div class="pn-block-h">
                <span>تنبيهات البرنامج</span>
                <span class="pn-badge">${issues.length}</span>
              </div>
              ${issues.length
                ? `<div class="pn-list">${issues.map((i,ii)=>`
                    <div class="pn-item">
                      <span class="pn-dot">•</span>
                      <span class="pn-txt">${escapeHtml(i)}</span>
                      <button type="button" class="pn-btn btn-dismiss-issue" data-idx="${ii}" ${readOnlyMode?'disabled':''}>إخفاء</button>
                    </div>`).join('')}</div>`
                : `<div class="pn-empty ok">✓ لا تنبيهات</div>`}
            </div>
            <div class="pn-block pn-hidden">
              <div class="pn-block-h">
                <span>تنبيهات مخفاة</span>
                <span class="pn-badge muted">${(p.dismissedNotes&&p.dismissedNotes.length)||0}</span>
              </div>
              ${(p.dismissedNotes&&p.dismissedNotes.length)
                ? `<div class="pn-list">${p.dismissedNotes.map((t,ti)=>`
                    <div class="pn-item">
                      <span class="pn-dot">•</span>
                      <span class="pn-txt muted">${escapeHtml(t)}</span>
                      <button type="button" class="pn-btn restore btn-restore-issue" data-idx="${ti}">إظهار</button>
                    </div>`).join('')}</div>`
                : `<div class="pn-empty">لا تنبيهات مخفاة</div>`}
            </div>
          </div>
          <div class="pn-col">
            <div class="pn-block pn-manual">
              <div class="pn-block-h">
                <span>ملاحظات يدوية</span>
                <span class="pn-badge muted">${notesLog.length}</span>
              </div>
              <div id="personDetNotesLog" class="pn-list">
                ${notesLog.length
                  ? notesLog.map((n,ni)=>`
                    <div class="pn-item">
                      <span class="pn-dot">•</span>
                      <span class="pn-txt">${escapeHtml(n.text||'')}</span>
                      <button type="button" class="pn-btn del btn-person-del-note" data-idx="${ni}" data-nid="${escapeHtml(n.id||'')}" ${readOnlyMode?'disabled':''}>حذف</button>
                    </div>`).join('')
                  : `<div class="pn-empty">لا ملاحظات</div>`}
              </div>
              <div class="pn-add">
                <input class="input" id="personDetNewNote" placeholder="أضف ملاحظة..." ${readOnlyMode?'disabled':''}>
                <button type="button" class="btn btn-primary btn-sm" id="btnPersonDetSaveNote" ${readOnlyMode?'disabled':''}>حفظ</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      ${personDocsCardHtml(kind, p)}
      </div>

      ${personFinanceHtml(kind, p)}
    </div>`;
}

function initPersonDetailEvents(){
  document.getElementById('btnPersonDetBack')?.addEventListener('click', ()=>{
    const back = personDetailBackPage(personDetailState.kind);
    personDetailState = { kind:'', id:'' };
    currentPage = back;
    if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
  });
  document.getElementById('btnPersonDetEdit')?.addEventListener('click', ()=>{
    const { kind, id } = personDetailState;
    if(kind==='employee' && typeof openEmployeeModal==='function') openEmployeeModal(id);
    else if(kind==='worker' && typeof openWorkerModal==='function') openWorkerModal(id);
    else if(kind==='supervisor' && typeof openSupervisorModal==='function') openSupervisorModal(id);
    else if(kind==='driver' && typeof openDriverModal==='function') openDriverModal(id);
  });
  bindPersonFinance(personDetailState.kind, personDetailState.id);
  document.querySelectorAll('#btnPersonDetDoc, #btnPersonDetDoc2').forEach(b=>b.addEventListener('click', ()=>{
    if(typeof openDocModal==='function') openDocModal({ kind: personDetailState.kind, personId: personDetailState.id });
  }));
    document.getElementById('btnPersonDetSaveNote')?.addEventListener('click', ()=>{
    const text = (document.getElementById('personDetNewNote')?.value||'').trim();
    if(!text){ showToast('اكتب ملاحظة'); return; }
    const p = getPersonDetailEntity(personDetailState.kind, personDetailState.id);
    if(!p) return;
    if(!Array.isArray(p.notesLog)) p.notesLog = [];
    p.notesLog.push({ id: uid(), text, at: new Date().toISOString() });
    p.notes = p.notesLog.map(n=>n.text).join('\n');
    saveData(true); showToast('تم حفظ الملاحظة');
    rerenderCurrentPage();
  });
  document.querySelectorAll('.btn-person-del-note').forEach(b=> b.addEventListener('click', (ev)=>{
    ev.preventDefault();
    const p = getPersonDetailEntity(personDetailState.kind, personDetailState.id);
    if(!p) return;
    if(!Array.isArray(p.notesLog)) p.notesLog = [];
    const idx = parseInt(b.getAttribute('data-idx'), 10);
    const nid = b.getAttribute('data-nid')||'';
    if(!isNaN(idx) && idx>=0 && idx < p.notesLog.length){
      p.notesLog.splice(idx, 1);
    } else if(nid){
      p.notesLog = p.notesLog.filter(n=>n && n.id!==nid);
    }
    p.notes = p.notesLog.map(n=>n.text).join('\n');
    saveData(true); showToast('تم حذف الملاحظة');
    rerenderCurrentPage();
  }));
  document.querySelectorAll('.btn-dismiss-issue').forEach(b=> b.addEventListener('click', (ev)=>{
    ev.preventDefault();
    const p = getPersonDetailEntity(personDetailState.kind, personDetailState.id);
    if(!p) return;
    const issues = typeof personNotesIssues==='function' ? personNotesIssues(personDetailState.kind, p) : [];
    const idx = parseInt(b.getAttribute('data-idx'), 10);
    const text = (!isNaN(idx) && issues[idx]) ? issues[idx] : '';
    if(!text){ showToast('تعذر إخفاء التنبيه'); return; }
    if(!Array.isArray(p.dismissedNotes)) p.dismissedNotes = [];
    if(!p.dismissedNotes.includes(text)) p.dismissedNotes.push(text);
    saveData(true); showToast('تم إخفاء التنبيه');
    rerenderCurrentPage();
  }));
  document.querySelectorAll('.btn-restore-issue').forEach(b=> b.addEventListener('click', (ev)=>{
    ev.preventDefault();
    const p = getPersonDetailEntity(personDetailState.kind, personDetailState.id);
    if(!p || !Array.isArray(p.dismissedNotes)) return;
    const idx = parseInt(b.getAttribute('data-idx'), 10);
    if(!isNaN(idx) && idx>=0 && idx < p.dismissedNotes.length){
      p.dismissedNotes.splice(idx, 1);
    }
    saveData(true); showToast('تم إظهار التنبيه');
    rerenderCurrentPage();
  }));
}