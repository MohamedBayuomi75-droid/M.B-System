/* =========================================================
   تقارير العملاء والمشاريع — ملخص
   ========================================================= */
function renderClientsReportsPage(){
  const customers = clCustomers();
  const surveys = typeof clAllWorkSurveys === 'function' ? clAllWorkSurveys() : [];
  const boqs = typeof clAllBoqs === 'function' ? clAllBoqs() : [];
  const contracts = typeof clAllContracts === 'function' ? clAllContracts() : [];
  const invoices = typeof clAllClientInvoices === 'function' ? clAllClientInvoices() : [];
  const collections = typeof clAllCollections === 'function' ? clAllCollections() : [];
  const opps = typeof clAllOpportunities === 'function' ? clAllOpportunities() : [];

  const invNet = invoices.reduce(function(s, i){ return s + (typeof clInvNet === 'function' ? clInvNet(i) : (Number(i.value) || 0)); }, 0);
  const invPaid = invoices.reduce(function(s, i){ return s + (Number(i.paid) || 0); }, 0);
  const collTotal = collections.reduce(function(s, r){ return s + (Number(r.amount) || 0); }, 0);
  const contractVal = contracts.reduce(function(s, k){ return s + (Number(k.value) || 0); }, 0);
  const pipeline = opps.filter(function(o){ return o.stage !== 'خسارة' && o.stage !== 'فوز'; })
    .reduce(function(s, o){ return s + (Number(o.expectedValue) || 0); }, 0);

  // per customer summary
  const rows = customers.map(function(c){
    const cInv = (c.invoices || []);
    const net = cInv.reduce(function(s, i){ return s + (typeof clInvNet === 'function' ? clInvNet(i) : (Number(i.value) || 0)); }, 0);
    const paid = cInv.reduce(function(s, i){ return s + (Number(i.paid) || 0); }, 0);
    const coll = (c.collections || []).reduce(function(s, r){ return s + (Number(r.amount) || 0); }, 0);
    return {
      name: c.name, code: c.code,
      projects: clProjectsOfCustomer(c).length,
      contracts: (c.contracts || []).length,
      invoices: cInv.length,
      net: net, paid: paid, coll: coll, remain: Math.max(0, net - paid)
    };
  }).sort(function(a, b){ return b.remain - a.remain; });

  try{
    if(typeof setPageExport === 'function'){
      setPageExport('clients.reports',
        ['العميل','مشاريع','عقود','مستخلصات','صافي مستخلصات','مدفوع','محصّل','متبقي'],
        rows.map(function(r){ return [r.name, r.projects, r.contracts, r.invoices, r.net, r.paid, r.coll, r.remain]; })
      );
    }
  }catch(_e){}

  return `
    <div class="page">
      ${typeof unifiedPageHeader==='function' ? unifiedPageHeader("تقارير العملاء والمشاريع", "ملخص الدورة التجارية والأرصدة", `${typeof pageExportButtonsHtml === 'function' ? pageExportButtonsHtml() : ''}`) : ``}
      <div class="stats-row" style="margin-bottom:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;">
        <div class="stat-card"><div class="num">${customers.length}</div><div class="lbl">عملاء</div></div>
        <div class="stat-card"><div class="num">${surveys.length}</div><div class="lbl">حصر</div></div>
        <div class="stat-card"><div class="num">${boqs.length}</div><div class="lbl">مقايسات</div></div>
        <div class="stat-card"><div class="num">${contracts.length}</div><div class="lbl">عقود</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(contractVal)}</div><div class="lbl">قيمة العقود</div></div>
        <div class="stat-card"><div class="num">${invoices.length}</div><div class="lbl">مستخلصات</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(invNet)}</div><div class="lbl">صافي مستخلصات</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(invPaid)}</div><div class="lbl">مدفوع على مستخلصات</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(collTotal)}</div><div class="lbl">تحصيلات</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(Math.max(0, invNet - invPaid))}</div><div class="lbl">متبقي على العملاء</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(pipeline)}</div><div class="lbl">مسار CRM</div></div>
      </div>
      <div class="card" style="padding:14px;">
        <h3 style="margin:0 0 10px;font-size:15px;">ملخص حسب العميل</h3>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>العميل</th><th>مشاريع</th><th>عقود</th><th>مستخلصات</th><th>صافي</th><th>مدفوع</th><th>محصّل</th><th>متبقي</th></tr></thead>
          <tbody>
            ${rows.length ? rows.map(function(r){
              return '<tr><td><strong>' + escapeHtml(r.name) + '</strong></td><td>' + r.projects + '</td><td>' + r.contracts + '</td><td>' + r.invoices + '</td><td>' + fmtMoney(r.net) + '</td><td>' + fmtMoney(r.paid) + '</td><td>' + fmtMoney(r.coll) + '</td><td><strong>' + fmtMoney(r.remain) + '</strong></td></tr>';
            }).join('') : '<tr><td colspan="8" style="text-align:center;color:var(--ink-soft);padding:20px;">لا بيانات</td></tr>'}
          </tbody>
        </table></div>
      </div>
    </div>`;
}
function initClientsReportsEvents(){}
