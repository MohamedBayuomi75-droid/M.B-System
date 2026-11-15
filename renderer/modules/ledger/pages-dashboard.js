/* (الموحّد) مولَّد بالـ codemod من دفتر الموردين — pages-dashboard.js — الملف ده بقى مصدر الحقيقة، عدّل فيه مباشرة */
/* ---------------- Dashboard ---------------- */
function buildMonthlyChartData(){
  const months = [];
  const now = new Date();
  for(let i=5; i>=0; i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    const label = d.toLocaleDateString('ar-EG-u-nu-latn', { month: 'short', year: 'numeric' });
    months.push({ key, label, invoices: 0, payments: 0 });
  }
  DATA.ledger.invoices.forEach(inv=>{
    if(!inv.date || inv.isReturn) return;
    const key = inv.date.slice(0,7);
    const m = months.find(x=>x.key===key);
    if(m) m.invoices += Number(inv.totalInvoice||0);
  });
  DATA.ledger.payments.forEach(p=>{
    if(!p.date) return;
    const key = p.date.slice(0,7);
    const m = months.find(x=>x.key===key);
    if(m) m.payments += Number(p.amount||0);
  });
  return months;
}

function buildTopStats(){
  // أعلى 10 موردين: حسب عدد مرات التعامل + إجمالي الفاتورة
  const bySup = {};
  DATA.ledger.invoices.forEach(inv=>{
    if(inv.isReturn) return;
    const id = inv.supplierId || '_';
    if(!bySup[id]) bySup[id] = { count:0, total:0 };
    bySup[id].count += 1;
    bySup[id].total += Number(inv.totalInvoice||0);
  });
  const topSuppliers = Object.entries(bySup)
    .map(([id, v])=>({ id, name: (supplierById(id)||{}).name || '—', count:v.count, total:v.total }))
    .sort((a,b)=> b.count - a.count || b.total - a.total)
    .slice(0,10);
  // أكثر المواد استهلاكاً من بيان الفاتورة
  const byMat = {};
  DATA.ledger.invoices.forEach(inv=>{
    if(inv.isReturn) return;
    const desc = (inv.description||'').trim();
    if(!desc) return;
    if(!byMat[desc]) byMat[desc] = { count:0, total:0 };
    byMat[desc].count += 1;
    byMat[desc].total += Number(inv.totalInvoice||0);
  });
  const topMaterials = Object.entries(byMat)
    .map(([name, v])=>({ name, count:v.count, total:v.total }))
    .sort((a,b)=> b.total - a.total || b.count - a.count)
    .slice(0,10);
  return { topSuppliers, topMaterials };
}

function renderDashboard(totalSuppliers,totalInvoicesVal,totalWithheld,totalDebt,totalVat,totalStamp,totalNet,totalPayments){
  const signedAmt = (b,k)=>(b.isReturn?-1:1)*Number(b[k]||0);
  totalVat = totalVat != null ? totalVat : DATA.ledger.invoices.reduce((a,b)=>a+signedAmt(b,'vat'),0);
  totalStamp = totalStamp != null ? totalStamp : DATA.ledger.invoices.reduce((a,b)=>a+signedAmt(b,'stampDuty'),0);
  totalNet = totalNet != null ? totalNet : DATA.ledger.invoices.reduce((a,b)=>a+invoiceSignedNet(b),0);
  totalPayments = totalPayments != null ? totalPayments : DATA.ledger.payments.reduce((a,b)=>a+Number(b.amount||0),0);
  // إجمالي الفاتورة (مش الصافي)
  const totalInvoiceSum = DATA.ledger.invoices.reduce((a,b)=>a+(b.isReturn?-1:1)*Number(b.totalInvoice||0),0);
  // أحدث 20 حسب آخر تحديث (id زمني) ثم التاريخ
  const recentAll = DATA.ledger.invoices.slice().sort((a,b)=>{
    const ta = (a.id||'').localeCompare(b.id||'');
    if(ta) return -ta;
    return (b.date||'').localeCompare(a.date||'');
  }).slice(0,20);
  const recentPayAll = DATA.ledger.payments.slice().sort((a,b)=>{
    const ta = (a.id||'').localeCompare(b.id||'');
    if(ta) return -ta;
    return (b.date||'').localeCompare(a.date||'');
  }).slice(0,20);
  const pgRecent = lgPaginateRows(recentAll, 'dashRecentInv');
  const pgRecentPay = lgPaginateRows(recentPayAll, 'dashRecentPay');
  const recent = pgRecent.pageRows;
  const recentPayments = pgRecentPay.pageRows;
  const overdueList = getOverdueInvoices();
  const overdueTotal = overdueList.reduce((a,b)=>a + invoiceRemaining(b), 0);
  const pgOverdue = lgPaginateRows(overdueList, 'dashOverdue');
  const chartData = buildMonthlyChartData();
  const maxChart = Math.max(1, ...chartData.map(m=>Math.max(m.invoices, m.payments)));

  return `
    <h2 class="page-title">لوحة المتابعة</h2>
    <p class="page-sub">نظرة سريعة على وضع الموردين والفواتير</p>
    <div class="stats-row dashboard-stats" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;">
      <div class="stat-card"><div class="num">${totalSuppliers}</div><div class="lbl">عدد الموردين</div></div>
      <div class="stat-card"><div class="num">${fmt(totalInvoiceSum)}</div><div class="lbl">إجمالي قيمة الفواتير</div></div>
      <div class="stat-card"><div class="num">${fmt(totalPayments)}</div><div class="lbl">إجمالي الدفعات</div></div>
      <div class="stat-card"><div class="num">${fmt((DATA.ledger.payments||[]).reduce((a,p)=>a+((p.direction==='collect'?0:Number(p.amount||0))),0))}</div><div class="lbl">سداد دائن (للموردين)</div></div>
      <div class="stat-card"><div class="num">${fmt((DATA.ledger.payments||[]).reduce((a,p)=>a+((p.direction==='collect'?Number(p.amount||0):0)),0))}</div><div class="lbl">قيود مدينة (عليه لنا)</div></div>
      <div class="stat-card"><div class="num">${fmt(totalVat)}</div><div class="lbl">إجمالي ضريبة القيمة المضافة</div></div>
      <div class="stat-card"><div class="num">${fmt(totalStamp)}</div><div class="lbl">إجمالي قيمة الدمغات</div></div>
      <div class="stat-card"><div class="num">${fmt(totalWithheld)}</div><div class="lbl">إجمالي المبالغ المخصومة</div></div>
      <div class="stat-card"><div class="num">${fmt(totalNet)}</div><div class="lbl">صافي الفواتير (بعد المرتجعات)</div></div>
      <div class="stat-card debt"><div class="num">${fmt(totalDebt)}</div><div class="lbl">إجمالي المستحق للموردين</div></div>
      ${overdueList.length > 0 ? `<div class="stat-card" style="border-color:var(--debt);background:#FDF3F0;"><div class="num" style="color:var(--debt);">${overdueList.length}</div><div class="lbl" style="color:var(--debt);">فواتير متأخرة</div></div>` : ''}
    </div>

    <div class="section-title">الفواتير والدفعات — آخر 6 أشهر</div>
    <div style="background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px 12px;margin-bottom:20px;">
      <div style="display:flex;align-items:flex-end;justify-content:space-around;gap:8px;height:160px;direction:ltr;">
        ${chartData.map(m=>{
          const hInv = Math.round((m.invoices / maxChart) * 130);
          const hPay = Math.round((m.payments / maxChart) * 130);
          return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0;">
            <div style="display:flex;align-items:flex-end;gap:3px;height:130px;">
              <div title="فواتير: ${fmt(m.invoices)}" style="width:14px;height:${hInv}px;background:var(--ledger-green);border-radius:4px 4px 0 0;min-height:${m.invoices>0?4:0}px;"></div>
              <div title="دفعات: ${fmt(m.payments)}" style="width:14px;height:${hPay}px;background:var(--gold);border-radius:4px 4px 0 0;min-height:${m.payments>0?4:0}px;"></div>
            </div>
            <div style="font-size:11px;color:var(--ink-soft);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">${lgEscapeHtml(m.label)}</div>
          </div>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:16px;justify-content:center;margin-top:10px;font-size:12px;color:var(--ink-soft);">
        <span><span style="display:inline-block;width:12px;height:12px;background:var(--ledger-green);border-radius:2px;vertical-align:middle;margin-left:4px;"></span> الفواتير</span>
        <span><span style="display:inline-block;width:12px;height:12px;background:var(--gold);border-radius:2px;vertical-align:middle;margin-left:4px;"></span> الدفعات</span>
      </div>
    </div>

    ${overdueList.length > 0 ? `
    <div class="overdue-alert" style="background:#FDF3F0;border:1px solid #e8b4b4;border-radius:10px;padding:14px 16px;margin-bottom:20px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px;">
        <div style="font-weight:800;color:var(--debt);font-size:15px;">⚠️ تنبيه: ${overdueList.length} فاتورة متأخرة — إجمالي الباقي ${fmt(overdueTotal)}</div>
        <div style="font-size:12px;color:var(--ink-soft);">الفواتير اللي عدّى تاريخ استحقاقها ولسه عليها باقي (الاستحقاق = تاريخ الفاتورة + 30 يوم أو التاريخ المحدد)</div>
      </div>
      <div class="table-wrap" style="margin:0;">
        <table>
          <thead><tr>
            <th>رقم الفاتورة</th><th>المورد</th><th>تاريخ الفاتورة</th><th>تاريخ الاستحقاق</th><th>الصافي</th><th>الباقي</th><th>أيام التأخير</th>
          </tr></thead>
          <tbody>
            ${pgOverdue.pageRows.map(i=>{
              const s = supplierById(i.supplierId);
              const remaining = invoiceRemaining(i);
              const due = getInvoiceDueDate(i);
              const daysLate = Math.floor((new Date() - new Date(due)) / 86400000);
              return `<tr class="${invoiceRowClass(i)}" style="cursor:pointer;" data-viewinv="${i.id}" title="عرض تفاصيل الفاتورة">
                <td>${isInvoiceIncomplete(i)?'<span class="warn-badge" title="بيانات ناقصة">⚠️</span> ':''}${lgEscapeHtml(i.invoiceNo||'-')}</td>
                <td>${lgEscapeHtml(s?s.name:'—')}</td>
                <td>${lgEscapeHtml(lgFmtDate(i.date)||'-')}</td>
                <td style="color:var(--debt);font-weight:700;">${lgEscapeHtml(due||'-')}</td>
                <td class="amount-cell invoice">${fmt(i.netInvoice)}</td>
                <td class="amount-cell invoice">${fmt(remaining)}</td>
                <td style="color:var(--debt);font-weight:700;">${daysLate} يوم</td>
              </tr>`;
            }).join('') || '<tr><td colspan="7" class="table-empty">لا فواتير متأخرة</td></tr>'}
          </tbody>
        </table>
      </div>
      ${lgTablePagerHtml('dashOverdue', pgOverdue)}
    </div>
    ` : ''}

    <div class="btn-row" style="margin-bottom:20px;">
      <button class="btn btn-primary" id="dashAddSupplier">+ مورد جديد</button>
      ${(typeof hasPagePermission!=='function' || hasPagePermission("ledger.invoices",'add')) ? `<button class="btn btn-gold" id="dashAddInvoice">+ فاتورة جديدة</button>` : ''}
      ${(typeof hasPagePermission!=='function' || hasPagePermission("ledger.payments",'add')) ? `<button class="btn btn-primary" id="dashAddPayment">+ إضافة دفعة</button>` : ''}
    </div>

    ${(() => {
      const { topSuppliers, topMaterials } = buildTopStats();
      const maxS = Math.max(1, ...topSuppliers.map(x=>x.total));
      const maxM = Math.max(1, ...topMaterials.map(x=>x.total));
      return `
      <div class="section-title">إحصائيات أعمق</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
        <div style="background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;">
          <div style="font-weight:800;margin-bottom:10px;color:var(--ledger-green);">أعلى 10 موردين (عدد التعاملات + إجمالي الفواتير)</div>
          ${topSuppliers.length?topSuppliers.map((s,i)=>`
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:12.5px;">
              <span style="width:18px;color:var(--ink-soft);">${i+1}</span>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${lgEscapeHtml(s.name)}</span>
              <span style="color:var(--ink-soft);font-size:11px;min-width:52px;">${s.count} مرة</span>
              <span style="font-weight:700;min-width:80px;text-align:left;">${fmt(s.total)}</span>
            </div>
            <div style="height:4px;background:var(--paper-2);border-radius:4px;margin-bottom:8px;">
              <div style="height:100%;width:${Math.round(s.total/maxS*100)}%;background:var(--ledger-green);border-radius:4px;"></div>
            </div>
          `).join(''):'<div class="table-empty">لا بيانات</div>'}
        </div>
        <div style="background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;">
          <div style="font-weight:800;margin-bottom:10px;color:var(--ledger-green);">أكثر المواد استهلاكاً (من بيان الفاتورة)</div>
          ${topMaterials.length?topMaterials.map((c,i)=>`
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:12.5px;">
              <span style="width:18px;color:var(--ink-soft);">${i+1}</span>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${lgEscapeHtml(c.name)}">${lgEscapeHtml(c.name)}</span>
              <span style="color:var(--ink-soft);font-size:11px;min-width:52px;">${c.count} مرة</span>
              <span style="font-weight:700;min-width:80px;text-align:left;">${fmt(c.total)}</span>
            </div>
            <div style="height:4px;background:var(--paper-2);border-radius:4px;margin-bottom:8px;">
              <div style="height:100%;width:${Math.round(c.total/maxM*100)}%;background:var(--gold);border-radius:4px;"></div>
            </div>
          `).join(''):'<div class="table-empty">لا بيانات</div>'}
        </div>
      </div>`;
    })()}

    <div class="section-title">أحدث الفواتير (آخر 20 تحديث)</div>
    <div class="table-wrap">
    <table>
      <thead>${invoiceTableTheadHtml()}</thead>
      <tbody>
        ${recent.length===0 ? `<tr><td colspan="${invoiceTableColspan()}" class="table-empty">لا توجد فواتير مسجلة بعد</td></tr>` :
          recent.map(i=> invoiceTableRowHtml(i)).join('')
        }
      </tbody>
    </table>
    </div>
    ${lgTablePagerHtml('dashRecentInv', pgRecent)}

    <div class="section-title">أحدث الدفعات (آخر 20 تحديث)</div>
    <div class="table-wrap">
    <table>
      <thead><tr><th>التاريخ</th><th>المورد</th><th>طريقة الدفع</th><th>الفاتورة المرتبطة</th><th>المبلغ</th></tr></thead>
      <tbody>
        ${recentPayments.length===0 ? `<tr><td colspan="5" class="table-empty">لا توجد دفعات مسجلة بعد</td></tr>` :
          recentPayments.map(p=>{
            const s = supplierById(p.supplierId);
            const inv = p.invoiceId ? DATA.ledger.invoices.find(i=>i.id===p.invoiceId) : null;
            return `<tr data-viewpay="${p.id}" style="cursor:pointer;">
              <td>${lgEscapeHtml(lgFmtDate(p.date)||'-')}</td>
              <td>${lgEscapeHtml(s?s.name:'—')}</td>
              <td>${lgEscapeHtml(p.method||'-')}</td>
              <td>${inv?lgEscapeHtml(inv.invoiceNo):'دفعة عامة'}</td>
              <td class="amount-cell payment">${fmt(p.amount)}</td>
            </tr>`;
          }).join('')}
      </tbody>
    </table>
    </div>
    ${lgTablePagerHtml('dashRecentPay', pgRecentPay)}
  `;
}

