/* تقارير المخازن */
function renderWarehousesReportsPage(){
  const items = whItems();
  const low = items.filter(function(it){
    if(it.minQty == null || it.minQty === '') return false;
    return whStockQty(it.id) < Number(it.minQty);
  });
  const rows = items.map(function(it){
    const qty = whStockQty(it.id);
    const cost = Number(it.avgCost) || Number(it.lastCost) || 0;
    return { it: it, qty: qty, val: Math.round(qty * cost * 100) / 100, low: it.minQty != null && qty < Number(it.minQty) };
  }).sort(function(a, b){ return b.val - a.val; });
  const totalVal = rows.reduce(function(s, r){ return s + r.val; }, 0);
  const byLoc = whLocations().map(function(L){
    let v = 0, n = 0;
    items.forEach(function(it){
      const q = whStockQty(it.id, L.id);
      if(q){ n++; v += q * (Number(it.avgCost) || Number(it.lastCost) || 0); }
    });
    return { L: L, items: n, val: Math.round(v * 100) / 100 };
  });

  try{
    if(typeof setPageExport === 'function'){
      setPageExport('warehouses.reports',
        ['الكود','الصنف','الوحدة','الرصيد','التكلفة','القيمة','حد الطلب'],
        rows.map(function(r){
          return [r.it.code, r.it.name, r.it.unit, r.qty, r.it.avgCost || r.it.lastCost || 0, r.val, r.it.minQty != null ? r.it.minQty : ''];
        })
      );
    }
  }catch(_e){}

  return `
    <div class="page">
      ${typeof unifiedPageHeader==='function' ? unifiedPageHeader("تقارير المخازن", "أرصدة · قيمة · تحت حد الطلب", `${typeof pageExportButtonsHtml === 'function' ? pageExportButtonsHtml() : ''}`) : ``}
      <div class="stats-row" style="margin-bottom:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;">
        <div class="stat-card"><div class="num">${items.length}</div><div class="lbl">أصناف</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(totalVal)}</div><div class="lbl">قيمة المخزون</div></div>
        <div class="stat-card"><div class="num">${low.length}</div><div class="lbl">تحت حد الطلب</div></div>
        <div class="stat-card"><div class="num">${whMovements().length}</div><div class="lbl">حركات</div></div>
      </div>
      ${low.length ? '<div class="card" style="padding:12px;margin-bottom:14px;border-color:#c0392b;"><strong style="color:#c0392b;">تنبيه حد الطلب:</strong> ' +
        low.map(function(it){ return escapeHtml(it.name) + ' (' + whStockQty(it.id) + '/' + it.minQty + ')'; }).join(' · ') + '</div>' : ''}
      <div class="card" style="padding:14px;margin-bottom:14px;">
        <h3 style="margin:0 0 10px;font-size:15px;">قيمة حسب المخزن</h3>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>المخزن</th><th>أصناف برصيد</th><th>القيمة</th></tr></thead>
          <tbody>${byLoc.map(function(r){
            return '<tr><td>' + escapeHtml(r.L.name) + '</td><td>' + r.items + '</td><td><strong>' + fmtMoney(r.val) + '</strong></td></tr>';
          }).join('')}</tbody>
        </table></div>
      </div>
      <div class="card" style="padding:14px;">
        <h3 style="margin:0 0 10px;font-size:15px;">أرصدة الأصناف</h3>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>الكود</th><th>الصنف</th><th>الرصيد</th><th>التكلفة</th><th>القيمة</th></tr></thead>
          <tbody>
            ${rows.map(function(r){
              return '<tr' + (r.low ? ' style="background:rgba(200,80,60,0.08);"' : '') + '><td>' + escapeHtml(r.it.code || '') + '</td><td>' + escapeHtml(r.it.name) + '</td><td><strong>' + r.qty + '</strong></td><td>' + fmtMoney(r.it.avgCost || r.it.lastCost || 0) + '</td><td>' + fmtMoney(r.val) + '</td></tr>';
            }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);">لا بيانات</td></tr>'}
          </tbody>
        </table></div>
      </div>
    </div>`;
}
function initWarehousesReportsEvents(){}
