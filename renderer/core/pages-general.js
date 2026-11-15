/* =====================================================================
   pages-general.js — «لوحة المتابعة العامة ← نظرة عامة»
   ملخص سريع لأقسام الشركة؛ كل قسم بيفتح لوحته الكاملة. (العملاء والمشاريع مدموجة)
   ===================================================================== */
function renderGeneralOverviewPage(){
  const stat = (num, lbl) => `<div class="stat-card"><div class="num">${num}</div><div class="lbl">${escapeHtml(lbl)}</div></div>`;
  const cnt = (k) => (Array.isArray(DATA[k]) ? DATA[k].length : 0);

  const hr = [
    stat(cnt('employees'), 'الموظفين'), stat(cnt('workers'), 'العمال'), stat(cnt('supervisors'), 'المشرفين'),
    stat(cnt('equipment'), 'المعدات'), stat(cnt('projects'), 'المشاريع'), stat(cnt('departments'), 'الأقسام')
  ].join('');

  let lg = '<p class="page-sub">بيانات الموردين غير متاحة.</p>';
  try{
    const L = DATA.ledger || {};
    const sup = L.suppliers || [], inv = L.invoices || [], pay = L.payments || [];
    const net = inv.reduce((a, b) => a + (typeof invoiceSignedNet==='function' ? invoiceSignedNet(b) : (Number(b.net)||Number(b.total)||0)), 0);
    const paid = pay.reduce((a, b) => a + Number(b.amount || 0), 0);
    const debt = typeof supplierBalance === 'function'
      ? sup.reduce((s, x) => { const b = supplierBalance(x.id); return s + (b > 0 ? b : 0); }, 0) : 0;
    const overdue = (typeof getOverdueInvoices === 'function') ? getOverdueInvoices().length : 0;
    lg = '<div class="stats-row" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr));">' + [
      stat(sup.length, 'الموردين'),
      stat(inv.filter(i => !i.isReturn).length, 'الفواتير'),
      stat(fmt(net), 'صافي الفواتير'),
      stat(fmt(paid), 'الدفعات'),
      stat(fmt(debt), 'مستحق للموردين'),
      stat(overdue, 'فواتير متأخرة')
    ].join('') + '</div>';
  }catch(_e){}

  let cl = '<p class="page-sub">لا بيانات عملاء.</p>';
  try{
    const customers = (typeof clCustomers === 'function') ? clCustomers() : ((DATA.clients && DATA.clients.customers) || []);
    const contracts = typeof clAllContracts === 'function' ? clAllContracts() : [];
    const invoices = typeof clAllClientInvoices === 'function' ? clAllClientInvoices() : [];
    const collections = typeof clAllCollections === 'function' ? clAllCollections() : [];
    const invNet = invoices.reduce((s,i)=> s + (typeof clInvNet==='function' ? clInvNet(i) : Number(i.value)||0), 0);
    const coll = collections.reduce((s,r)=> s + (Number(r.amount)||0), 0);
    const cVal = contracts.reduce((s,k)=> s + (Number(k.value)||0), 0);
    cl = '<div class="stats-row" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr));">' + [
      stat(customers.length, 'عملاء'),
      stat(contracts.length, 'عقود'),
      stat(fmt(cVal), 'قيمة العقود'),
      stat(invoices.length, 'مستخلصات'),
      stat(fmt(invNet), 'صافي مستخلصات'),
      stat(fmt(coll), 'تحصيلات'),
      stat(fmt(Math.max(0, invNet - coll)), 'متبقي عملاء')
    ].join('') + '</div>';
  }catch(_e){}

  let wh = '';
  try{
    if(typeof whItems === 'function'){
      const items = whItems();
      let val = 0;
      items.forEach(it => { val += (typeof whStockValue==='function' ? whStockValue(it.id) : 0); });
      wh = '<div class="section-title">📦 المخازن</div>' +
        '<div class="stats-row" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr));">' +
        [stat(items.length,'أصناف'), stat((typeof whLocations==='function'?whLocations():[]).length,'مخازن'),
         stat((typeof whMovements==='function'?whMovements():[]).length,'حركات'),
         stat(fmt(val),'قيمة المخزون')].join('') + '</div>' +
        '<div class="btn-row" style="margin:10px 0 18px;"><button type="button" class="btn btn-outline btn-sm" onclick="goToPage(\'warehouses.home\')">فتح المخازن</button></div>';
    }
  }catch(_e){}

  return `<div class="card">
    <h2 class="page-title">نظرة عامة</h2>
    <p class="page-sub">ملخص النظام الواحد — كل الأقسام في نظرة واحدة</p>

    <div class="section-title">👥 الموارد البشرية</div>
    <div class="stats-row" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));">${hr}</div>
    <div class="btn-row" style="margin:10px 0 18px;"><button type="button" class="btn btn-outline btn-sm" onclick="goToPage('dashboard')">فتح لوحة الموارد البشرية</button></div>

    <div class="section-title">🧾 الموردون والفواتير</div>
    ${lg}
    <div class="btn-row" style="margin:10px 0 18px;"><button type="button" class="btn btn-outline btn-sm" onclick="goToPage('ledger.dashboard')">فتح لوحة الموردين</button></div>

    <div class="section-title">🏗️ العملاء والمشاريع</div>
    ${cl}
    <div class="btn-row" style="margin:10px 0 18px;"><button type="button" class="btn btn-outline btn-sm" onclick="goToPage('clients.dashboard')">فتح لوحة العملاء</button></div>

    ${wh}
  </div>`;
}
