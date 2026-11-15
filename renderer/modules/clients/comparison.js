/* =========================================================
   clients/comparison.js — المقارنة وربط السلسلة (المرحلة 11)
   حصر ← مقايسة/عقد ← مستخلصات ← تحصيلات · بند بند (بالكود، وإلا بالاسم)
   ========================================================= */
let cmpState = { customerId: '', contractId: '', surveyId: '', boqId: '' };

function clCmpKey(it){
  const code = String(it.code || '').trim().toLowerCase();
  if(code) return 'c:' + code;
  const nm = String(it.name || '').trim().toLowerCase();
  return nm ? 'n:' + nm : '';
}
/** يبني صفوف المقارنة: لكل بند كمية/قيمة الحصر وكمية/قيمة المقايسة والفروق */
function clCompareItems(surveyItems, boqItems){
  const map = {};
  const ensure = function(it){
    const k = clCmpKey(it); if(!k) return null;
    if(!map[k]) map[k] = { key: k, code: it.code || '', label: it.name || it.code || '—', sQty: 0, sVal: 0, bQty: 0, bVal: 0 };
    if(!map[k].code && it.code) map[k].code = it.code;
    return map[k];
  };
  (surveyItems || []).filter(function(it){ return !it.isHeader; }).map(clCalcSurveyItem).forEach(function(it){
    const r = ensure(it); if(!r) return; r.sQty += Number(it.qty) || 0; r.sVal += Number(it.total) || 0;
  });
  (boqItems || []).filter(function(it){ return !it.isHeader; }).map(clCalcBoqItem).forEach(function(it){
    const r = ensure(it); if(!r) return; r.bQty += Number(it.qty) || 0; r.bVal += Number(it.total) || 0;
  });
  const rows = Object.keys(map).map(function(k){
    const r = map[k];
    r.dQty = Math.round((r.sQty - r.bQty) * 1000) / 1000; r.dVal = Math.round((r.sVal - r.bVal) * 100) / 100;
    r.state = r.sQty && !r.bQty ? 'حصر بدون مقايسة' : (!r.sQty && r.bQty ? 'مقايسة بدون حصر' : (r.dQty ? (r.dQty > 0 ? 'حصر أكبر' : 'حصر أقل') : 'مطابق'));
    return r;
  }).sort(function(a, b){ return String(a.code || a.label).localeCompare(String(b.code || b.label), 'ar'); });
  const sum = rows.reduce(function(a, r){ a.sVal += r.sVal; a.bVal += r.bVal; return a; }, { sVal: 0, bVal: 0 });
  sum.dVal = Math.round((sum.sVal - sum.bVal) * 100) / 100;
  return { rows: rows, sum: sum };
}

function clCmpResolve(){
  const custs = clCustomers();
  if(!cmpState.customerId || !custs.some(function(c){ return c.id === cmpState.customerId; })){ cmpState.customerId = custs[0] ? custs[0].id : ''; cmpState.contractId = ''; cmpState.surveyId = ''; cmpState.boqId = ''; }
  const c = clCustomerById(cmpState.customerId) || { contracts: [], workSurveys: [], boqs: [], invoices: [], collections: [] };
  const k = (c.contracts || []).find(function(x){ return x.id === cmpState.contractId; }) || null;
  const survey = (c.workSurveys || []).find(function(x){ return x.id === cmpState.surveyId; }) || null;
  const boq = (c.boqs || []).find(function(x){ return x.id === cmpState.boqId; }) || null;
  return { c: c, k: k, survey: survey, boq: boq };
}
function clCmpChain(r){
  const c = r.c, k = r.k;
  const invs = (c.invoices || []).filter(function(i){
    if(k && i.contractId === k.id) return true;
    return !k && r.survey && r.survey.project && i.project === r.survey.project;
  });
  const nos = {}; invs.forEach(function(i){ if(i.no) nos[i.no] = 1; });
  const colls = (c.collections || []).filter(function(x){ return x.invoiceNo && nos[x.invoiceNo]; });
  const net = invs.reduce(function(s, i){ return s + clInvNet(i); }, 0);
  const paid = invs.reduce(function(s, i){ return s + (Number(i.paid) || 0); }, 0);
  const coll = colls.reduce(function(s, x){ return s + (Number(x.amount) || 0); }, 0);
  return { invs: invs, colls: colls, net: net, paid: paid, coll: coll };
}

function renderClientsComparisonPage(){
  const r = clCmpResolve();
  const c = r.c;
  const cmp = clCompareItems(r.survey ? r.survey.items : [], r.boq ? r.boq.items : []);
  const ch = clCmpChain(r);
  const opt = function(list, cur, lab){ return '<option value="">— بدون —</option>' + list.map(function(x){ return '<option value="' + escapeHtml(x.id) + '"' + (x.id === cur ? ' selected' : '') + '>' + escapeHtml(lab(x)) + '</option>'; }).join(''); };
  const node = function(l, v, on){ return '<div style="flex:1;min-width:90px;padding:8px;border-radius:8px;text-align:center;border:1px solid var(--line);' + (on ? 'background:rgba(22,163,74,.1);' : '') + '"><div style="font-size:11px;color:var(--ink-soft);">' + l + '</div><b>' + escapeHtml(String(v)) + '</b></div>'; };
  try{
    if(typeof setPageExport === 'function'){
      setPageExport('clients.comparison', ['الكود', 'البند', 'كمية الحصر', 'قيمة الحصر', 'كمية المقايسة', 'قيمة المقايسة', 'فرق الكمية', 'فرق القيمة', 'الحالة'],
        cmp.rows.map(function(x){ return [x.code, x.label, x.sQty, x.sVal, x.bQty, x.bVal, x.dQty, x.dVal, x.state]; }));
    }
  }catch(_e){}
  return `
    <div class="page">
      ${typeof unifiedPageHeader === 'function' ? unifiedPageHeader('المقارنة وربط السلسلة', 'حصر ← مقايسة / عقد ← مستخلصات ← تحصيلات', (typeof pageExportButtonsHtml === 'function' ? pageExportButtonsHtml() : '')) : ''}
      <div class="card" style="padding:12px;margin-bottom:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px;">
        <label>العميل<select class="input" id="cmpCust">${clCustomers().map(function(x){ return '<option value="' + escapeHtml(x.id) + '"' + (x.id === cmpState.customerId ? ' selected' : '') + '>' + escapeHtml(x.name) + '</option>'; }).join('')}</select></label>
        <label>العقد<select class="input" id="cmpContract">${opt(c.contracts || [], cmpState.contractId, function(k){ return k.id + ' — ' + (k.title || ''); })}</select></label>
        <label>الحصر<select class="input" id="cmpSurvey">${opt(c.workSurveys || [], cmpState.surveyId, function(w){ return w.id + (w.project ? ' — ' + w.project : ''); })}</select></label>
        <label>المقايسة<select class="input" id="cmpBoq">${opt(c.boqs || [], cmpState.boqId, function(b){ return b.id + (b.title ? ' — ' + b.title : ''); })}</select></label>
      </div>
      <div style="display:flex;gap:6px;align-items:stretch;flex-wrap:wrap;margin-bottom:12px;">
        ${node('حصر', r.survey ? r.survey.id : '—', !!r.survey)}<span style="align-self:center;">←</span>
        ${node('مقايسة', r.boq ? r.boq.id : '—', !!r.boq)}<span style="align-self:center;">←</span>
        ${node('عقد', r.k ? r.k.id : '—', !!r.k)}<span style="align-self:center;">←</span>
        ${node('مستخلصات', ch.invs.length, ch.invs.length > 0)}<span style="align-self:center;">←</span>
        ${node('تحصيلات', ch.colls.length, ch.colls.length > 0)}
      </div>
      <div class="stats-row" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:12px;">
        <div class="stat-card"><div class="num">${fmtMoney(cmp.sum.sVal)}</div><div class="lbl">قيمة الحصر</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(cmp.sum.bVal)}</div><div class="lbl">قيمة المقايسة</div></div>
        <div class="stat-card"><div class="num" style="color:${cmp.sum.dVal ? '#d97706' : '#16a34a'};">${fmtMoney(cmp.sum.dVal)}</div><div class="lbl">فرق (حصر − مقايسة)</div></div>
        ${r.k ? '<div class="stat-card"><div class="num">' + fmtMoney(Number(r.k.value) || 0) + '</div><div class="lbl">قيمة العقد</div></div>' : ''}
        <div class="stat-card"><div class="num">${fmtMoney(ch.net)}</div><div class="lbl">صافي المستخلصات</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(ch.paid)}</div><div class="lbl">المسدد</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(ch.coll)}</div><div class="lbl">تحصيلات مرتبطة</div></div>
      </div>
      <div class="card" style="padding:10px;"><div class="table-wrap"><table class="data-table">
        <thead><tr><th>كود</th><th>البند</th><th>كمية حصر</th><th>قيمة حصر</th><th>كمية مقايسة</th><th>قيمة مقايسة</th><th>فرق كمية</th><th>فرق قيمة</th><th>الحالة</th></tr></thead>
        <tbody>${cmp.rows.length ? cmp.rows.map(function(x){
          const bad = x.state !== 'مطابق';
          return '<tr' + (bad ? ' style="background:rgba(217,119,6,.07);"' : '') + '><td>' + escapeHtml(x.code) + '</td><td>' + escapeHtml(x.label) + '</td><td>' + x.sQty + '</td><td>' + fmtMoney(x.sVal) + '</td><td>' + x.bQty + '</td><td>' + fmtMoney(x.bVal) + '</td><td>' + x.dQty + '</td><td>' + fmtMoney(x.dVal) + '</td><td>' + escapeHtml(x.state) + '</td></tr>';
        }).join('') : '<tr><td colspan="9" style="text-align:center;color:var(--ink-soft);padding:24px;">اختر حصر و/أو مقايسة للمقارنة</td></tr>'}</tbody>
      </table></div></div>
    </div>`;
}
function initClientsComparisonEvents(){
  const re = function(){ rerenderCurrentPage(); };
  document.getElementById('cmpCust')?.addEventListener('change', function(e){ cmpState = { customerId: e.target.value, contractId: '', surveyId: '', boqId: '' }; re(); });
  document.getElementById('cmpSurvey')?.addEventListener('change', function(e){ cmpState.surveyId = e.target.value; re(); });
  document.getElementById('cmpBoq')?.addEventListener('change', function(e){ cmpState.boqId = e.target.value; re(); });
  document.getElementById('cmpContract')?.addEventListener('change', function(e){
    cmpState.contractId = e.target.value;
    const c = clCustomerById(cmpState.customerId); const k = c && (c.contracts || []).find(function(x){ return x.id === cmpState.contractId; });
    if(k){ if(k.boqId) cmpState.boqId = k.boqId; if(k.workSurveyIds && k.workSurveyIds.length) cmpState.surveyId = k.workSurveyIds[0]; }
    re();
  });
}
