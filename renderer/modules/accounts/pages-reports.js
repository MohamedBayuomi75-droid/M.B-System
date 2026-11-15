/* تقارير الحسابات الموحّدة */
function renderAccountsReportsPage(){
  const costs = Array.isArray(DATA.costs) ? DATA.costs : [];
  const costTotal = costs.reduce(function(s, c){
    if(c && Array.isArray(c.lines) && c.lines.length){
      return s + c.lines.reduce(function(a, l){ return a + (Number(l.amount) || 0); }, 0);
    }
    return s + (Number(c && c.amount) || 0);
  }, 0);
  const expenses = Array.isArray(DATA.expenses) ? DATA.expenses : [];
  const expTotal = expenses.reduce(function(s, e){ return s + (Number(e && e.amount) || 0); }, 0);

  let collTotal = 0, invNet = 0, invPaid = 0, contractVal = 0;
  try{
    const collections = typeof clAllCollections === 'function' ? clAllCollections() : [];
    collTotal = collections.reduce(function(s, r){ return s + (Number(r.amount) || 0); }, 0);
    const invoices = typeof clAllClientInvoices === 'function' ? clAllClientInvoices() : [];
    invNet = invoices.reduce(function(s, i){ return s + (typeof clInvNet === 'function' ? clInvNet(i) : Number(i.value) || 0); }, 0);
    invPaid = invoices.reduce(function(s, i){ return s + (Number(i.paid) || 0); }, 0);
    const contracts = typeof clAllContracts === 'function' ? clAllContracts() : [];
    contractVal = contracts.reduce(function(s, k){ return s + (Number(k.value) || 0); }, 0);
  }catch(_e){}

  let supplierNet = 0, supplierPaid = 0;
  try{
    const inv = (DATA.ledger && DATA.ledger.invoices) || [];
    const pay = (DATA.ledger && DATA.ledger.payments) || [];
    supplierNet = inv.reduce(function(a, b){
      return a + (typeof invoiceSignedNet === 'function' ? invoiceSignedNet(b) : (Number(b.net) || Number(b.total) || 0));
    }, 0);
    supplierPaid = pay.reduce(function(a, b){ return a + (Number(b.amount) || 0); }, 0);
  }catch(_e){}

  let stockVal = 0;
  try{
    if(typeof whItems === 'function'){
      whItems().forEach(function(it){ stockVal += (typeof whStockValue === 'function' ? whStockValue(it.id) : 0); });
    }
  }catch(_e){}

  const revenue = collTotal;
  const opex = expTotal + costTotal;
  const netApprox = revenue - opex;

  const byProject = {};
  try{
    (typeof clAllClientInvoices === 'function' ? clAllClientInvoices() : []).forEach(function(inv){
      const name = inv.project || '— بدون مشروع —';
      if(!byProject[name]) byProject[name] = { revenue: 0, cost: 0, collected: 0 };
      byProject[name].revenue += typeof clInvNet === 'function' ? clInvNet(inv) : (Number(inv.value) || 0);
      byProject[name].collected += Number(inv.paid) || 0;
    });
    costs.forEach(function(c){
      const name = (c && c.project) || '— بدون مشروع —';
      if(!byProject[name]) byProject[name] = { revenue: 0, cost: 0, collected: 0 };
      const amt = (c.lines && c.lines.length)
        ? c.lines.reduce(function(a, l){ return a + (Number(l.amount) || 0); }, 0)
        : (Number(c.amount) || 0);
      byProject[name].cost += amt;
    });
  }catch(_e){}
  const projRows = Object.keys(byProject).map(function(name){
    const r = byProject[name];
    return { name: name, revenue: r.revenue, cost: r.cost, collected: r.collected, margin: r.revenue - r.cost };
  }).sort(function(a, b){ return b.margin - a.margin; });

  try{
    if(typeof setPageExport === 'function'){
      setPageExport('accounts.reports',
        ['المشروع','إيراد مستخلصات','تكاليف','محصّل','هامش'],
        projRows.map(function(r){ return [r.name, r.revenue, r.cost, r.collected, r.margin]; })
      );
    }
  }catch(_e){}

  return `
    <div class="page">
      ${typeof unifiedPageHeader==='function' ? unifiedPageHeader("تقارير الحسابات", "إيرادات · مصاريف · تكاليف · ربحية مشاريع · موردون · مخزون", `${typeof pageExportButtonsHtml === 'function' ? pageExportButtonsHtml() : ''}`) : ``}
      <div class="section-title">ملخص مالي</div>
      <div class="stats-row" style="margin-bottom:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;">
        <div class="stat-card"><div class="num">${fmtMoney(contractVal)}</div><div class="lbl">قيمة العقود</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(invNet)}</div><div class="lbl">صافي المستخلصات</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(revenue)}</div><div class="lbl">التحصيلات</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(Math.max(0, invNet - invPaid))}</div><div class="lbl">متبقي على العملاء</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(costTotal)}</div><div class="lbl">التكاليف</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(expTotal)}</div><div class="lbl">المصاريف</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(opex)}</div><div class="lbl">إجمالي التشغيل</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(netApprox)}</div><div class="lbl">صافي (تحصيل − تشغيل)</div></div>
      </div>
      <div class="section-title">الموردون والمخزون</div>
      <div class="stats-row" style="margin-bottom:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;">
        <div class="stat-card"><div class="num">${fmtMoney(supplierNet)}</div><div class="lbl">صافي فواتير الموردين</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(supplierPaid)}</div><div class="lbl">مدفوع للموردين</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(Math.max(0, supplierNet - supplierPaid))}</div><div class="lbl">مستحق للموردين</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(stockVal)}</div><div class="lbl">قيمة المخزون</div></div>
      </div>
      <div class="card" style="padding:14px;">
        <h3 style="margin:0 0 10px;font-size:15px;">ربحية حسب المشروع</h3>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>المشروع</th><th>إيراد مستخلصات</th><th>تكاليف</th><th>محصّل</th><th>الهامش</th></tr></thead>
          <tbody>
            ${projRows.length ? projRows.map(function(r){
              return '<tr><td><strong>' + escapeHtml(r.name) + '</strong></td><td>' + fmtMoney(r.revenue) + '</td><td>' + fmtMoney(r.cost) + '</td><td>' + fmtMoney(r.collected) + '</td><td><strong>' + fmtMoney(r.margin) + '</strong></td></tr>';
            }).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);padding:20px;">لا بيانات كافية</td></tr>'}
          </tbody>
        </table></div>
      </div>
    </div>`;
}
function initAccountsReportsEvents(){}
