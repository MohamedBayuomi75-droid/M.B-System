/* =========================================================
   حسابات العملاء — كشف حساب · 0.7.2
   ========================================================= */
let accountsFilters = { customerId: '', from: '', to: '' };

function clBuildCustomerLedger(c, from, to){
  const rows = [];
  const opening = Number(c.openingBalance) || 0;
  // invoices as debit (مستحق على العميل)
  (c.invoices || []).forEach(function(inv){
    const net = typeof clInvNet === 'function' ? clInvNet(inv) : (Number(inv.value) || 0);
    if(!net) return;
    const d = inv.date || '';
    if(from && d && d < from) return;
    if(to && d && d > to) return;
    rows.push({
      date: d, type: 'مستخلص', ref: inv.no || '',
      desc: 'مستخلص ' + (inv.no || '') + (inv.project ? ' — ' + inv.project : ''),
      debit: net, credit: 0
    });
  });
  // سداد مباشر مسجّل على المستخلص (التحصيلات المربوطة بتتحسب من التحصيلات نفسها — مفيش عدّ مزدوج)
  (c.invoices || []).forEach(function(inv){
    const m = Number(inv.paidManual) || 0;
    if(!m) return;
    const d = inv.date || '';
    if(from && d && d < from) return;
    if(to && d && d > to) return;
    rows.push({ date: d, type: 'سداد مباشر', ref: inv.no || '', desc: 'سداد مباشر على مستخلص ' + (inv.no || ''), debit: 0, credit: m });
  });
  // collections as credit
  (c.collections || []).forEach(function(r){
    const amt = Number(r.amount) || 0;
    if(!amt) return;
    const d = r.date || '';
    if(from && d && d < from) return;
    if(to && d && d > to) return;
    rows.push({
      date: d, type: 'تحصيل', ref: r.id || '',
      desc: 'تحصيل ' + (r.method || '') + (r.invoiceNo ? ' على ' + r.invoiceNo : ''),
      debit: 0, credit: amt
    });
  });
  // explicit ledger entries if any
  (c.ledger || []).forEach(function(e){
    const d = e.date || '';
    if(from && d && d < from) return;
    if(to && d && d > to) return;
    rows.push({
      date: d, type: e.type || 'حركة', ref: e.ref || '',
      desc: e.desc || e.notes || '',
      debit: Number(e.debit) || 0,
      credit: Number(e.credit) || 0
    });
  });
  rows.sort(function(a, b){ return String(a.date).localeCompare(String(b.date)); });
  let balance = opening;
  rows.forEach(function(r){
    balance = balance + (Number(r.debit) || 0) - (Number(r.credit) || 0);
    r.balance = Math.round(balance * 100) / 100;
  });
  const periodDebit = rows.reduce(function(s, r){ return s + (Number(r.debit) || 0); }, 0);
  const periodCredit = rows.reduce(function(s, r){ return s + (Number(r.credit) || 0); }, 0);
  return {
    opening: opening,
    rows: rows,
    periodDebit: periodDebit,
    periodCredit: periodCredit,
    closing: Math.round((opening + periodDebit - periodCredit) * 100) / 100
  };
}

function renderClientsAccountsPage(){
  const customers = clCustomers();
  const cid = accountsFilters.customerId || (customers[0] && customers[0].id) || '';
  const c = cid ? clCustomerById(cid) : null;
  const ledger = c ? clBuildCustomerLedger(c, accountsFilters.from, accountsFilters.to) : null;

  const custOpts = customers.map(function(x){
    return '<option value="' + escapeHtml(x.id) + '"' + (cid === x.id ? ' selected' : '') + '>' +
      escapeHtml((x.code ? x.code + ' — ' : '') + x.name) + '</option>';
  }).join('');

  // summary all customers
  const summary = customers.map(function(cu){
    const L = clBuildCustomerLedger(cu, '', '');
    return { id: cu.id, name: cu.name, opening: L.opening, closing: L.closing, debit: L.periodDebit, credit: L.periodCredit };
  }).sort(function(a, b){ return Math.abs(b.closing) - Math.abs(a.closing); });

  try{
    if(typeof setPageExport === 'function' && ledger){
      setPageExport('clients.accounts',
        ['التاريخ','النوع','المرجع','البيان','مدين','دائن','الرصيد'],
        [['', 'افتتاحي', '', 'الرصيد الافتتاحي', '', '', ledger.opening]].concat(
          ledger.rows.map(function(r){
            return [r.date, r.type, r.ref, r.desc, r.debit, r.credit, r.balance];
          })
        )
      );
    }
  }catch(_e){}

  return `
    <div class="page">
      ${typeof unifiedPageHeader==='function' ? unifiedPageHeader("حسابات العملاء", "كشف حساب · مدين/دائن · رصيد", `${typeof pageExportButtonsHtml === 'function' ? pageExportButtonsHtml() : ''}`) : ``}

      <div class="filters-bar">
        <select id="acCustomer" class="input" style="min-width:220px;">
          <option value="">— اختر عميلاً —</option>${custOpts}
        </select>
        <label style="font-size:13px;">من <input type="date" class="input" id="acFrom" value="${escapeHtml(accountsFilters.from || '')}"></label>
        <label style="font-size:13px;">إلى <input type="date" class="input" id="acTo" value="${escapeHtml(accountsFilters.to || '')}"></label>
        <button type="button" class="btn btn-outline btn-sm" id="acApply">عرض</button>
      </div>

      ${!c ? `
        <div class="card" style="padding:14px;margin-bottom:14px;">
          <h3 style="margin:0 0 10px;font-size:15px;">ملخص أرصدة العملاء</h3>
          <div class="table-wrap"><table class="data-table">
            <thead><tr><th>العميل</th><th>افتتاحي</th><th>مدين</th><th>دائن</th><th>رصيد</th></tr></thead>
            <tbody>
              ${summary.length ? summary.map(function(s){
                return '<tr style="cursor:pointer;" class="ac-pick" data-id="' + escapeHtml(s.id) + '">' +
                  '<td><strong>' + escapeHtml(s.name) + '</strong></td>' +
                  '<td>' + fmtMoney(s.opening) + '</td>' +
                  '<td>' + fmtMoney(s.debit) + '</td>' +
                  '<td>' + fmtMoney(s.credit) + '</td>' +
                  '<td><strong>' + fmtMoney(s.closing) + '</strong></td></tr>';
              }).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);">لا عملاء</td></tr>'}
            </tbody>
          </table></div>
        </div>
      ` : `
        <div class="stats-row" style="margin-bottom:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;">
          <div class="stat-card"><div class="num">${fmtMoney(ledger.opening)}</div><div class="lbl">رصيد افتتاحي</div></div>
          <div class="stat-card"><div class="num">${fmtMoney(ledger.periodDebit)}</div><div class="lbl">مدين الفترة</div></div>
          <div class="stat-card"><div class="num">${fmtMoney(ledger.periodCredit)}</div><div class="lbl">دائن الفترة</div></div>
          <div class="stat-card"><div class="num">${fmtMoney(ledger.closing)}</div><div class="lbl">الرصيد الختامي</div></div>
        </div>
        <div class="card" style="padding:14px;">
          <h3 style="margin:0 0 10px;font-size:15px;">كشف حساب — ${escapeHtml(c.name)}</h3>
          <div class="table-wrap"><table class="data-table">
            <thead><tr><th>التاريخ</th><th>النوع</th><th>المرجع</th><th>البيان</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead>
            <tbody>
              <tr style="background:rgba(0,0,0,0.03);">
                <td colspan="4"><strong>الرصيد الافتتاحي</strong></td>
                <td></td><td></td>
                <td><strong>${fmtMoney(ledger.opening)}</strong></td>
              </tr>
              ${ledger.rows.length ? ledger.rows.map(function(r){
                return '<tr>' +
                  '<td>' + escapeHtml(r.date || '—') + '</td>' +
                  '<td>' + escapeHtml(r.type) + '</td>' +
                  '<td>' + escapeHtml(r.ref) + '</td>' +
                  '<td>' + escapeHtml(r.desc) + '</td>' +
                  '<td>' + (r.debit ? fmtMoney(r.debit) : '') + '</td>' +
                  '<td>' + (r.credit ? fmtMoney(r.credit) : '') + '</td>' +
                  '<td><strong>' + fmtMoney(r.balance) + '</strong></td></tr>';
              }).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--ink-soft);padding:16px;">لا حركات في الفترة</td></tr>'}
            </tbody>
          </table></div>
        </div>
      `}
    </div>`;
}

function initClientsAccountsEvents(){
  document.getElementById('acCustomer')?.addEventListener('change', function(e){
    accountsFilters.customerId = e.target.value;
    rerenderCurrentPage();
  });
  document.getElementById('acApply')?.addEventListener('click', function(){
    accountsFilters.from = document.getElementById('acFrom')?.value || '';
    accountsFilters.to = document.getElementById('acTo')?.value || '';
    accountsFilters.customerId = document.getElementById('acCustomer')?.value || accountsFilters.customerId;
    rerenderCurrentPage();
  });
  document.querySelectorAll('.ac-pick').forEach(function(tr){
    tr.addEventListener('click', function(){
      accountsFilters.customerId = tr.getAttribute('data-id');
      rerenderCurrentPage();
    });
  });
}
