/* =========================================================
   clients/dashboard.js — لوحة متابعة العملاء والمشاريع (المرحلة 6)
   8 مؤشرات + أقسام متابعة (كل بند بيفتح السجل المعني)
   ========================================================= */
let clDashFilters = { customerId: '' };

function clDashData(customerId){
  const today = clTodayISO();
  const custs = clCustomers().filter(function(c){ return !customerId || c.id === customerId; });
  const ids = {}; custs.forEach(function(c){ ids[c.id] = c; });
  const projects = clAllCommercialProjects().filter(function(p){ return !customerId || p.customerId === customerId; });
  const activeProjects = projects.filter(function(p){ return CL_TERMINAL_STATUSES.indexOf(p.status) < 0; });
  let contractVal = 0, invNet = 0, invPaid = 0, coll = 0;
  const unpaid = [];
  custs.forEach(function(c){
    (c.contracts || []).forEach(function(k){ if((k.status || 'ساري') === 'ساري') contractVal += Number(k.value) || 0; });
    (c.invoices || []).forEach(function(i){
      const net = clInvNet(i), paid = Number(i.paid) || 0;
      invNet += net; invPaid += paid;
      if(net - paid > 0.5){
        const age = i.date ? -clDaysUntil(i.date) : null;
        unpaid.push({ c: c, i: i, remain: net - paid, age: age });
      }
    });
    (c.collections || []).forEach(function(r){ coll += Number(r.amount) || 0; });
  });
  const gars = clAllGuarantees().filter(function(g){ return ids[g.customerId]; });
  const gt = clGuaranteeTotals(gars);
  const lateSteps = [];
  activeProjects.forEach(function(p){ pwLateSteps(p).forEach(function(x){ lateSteps.push({ p: p, x: x }); }); });
  const garAlerts = gars.filter(function(g){
    if(g._eff === 'منتهي') return true;
    const d = clDaysUntil(g.expiryDate);
    return clGuaranteeIsLive(g) && d != null && d <= CL_GUARANTEE_ALERT_DAYS;
  }).sort(function(a, b){ return String(a.expiryDate || '').localeCompare(String(b.expiryDate || '')); });
  const followUps = clAllOpportunities().filter(function(o){
    return ids[o.customerId] && o.nextFollowUp && o.nextFollowUp <= today && o.stage !== 'خسارة' && o.stage !== 'فوز';
  });
  const noContract = activeProjects.filter(function(p){
    const c = ids[p.customerId]; if(!c) return false;
    return !(c.contracts || []).some(function(k){ return k.projectId === p.id || (k.project && clNormName(k.project) === clNormName(p.name)); });
  });
  return {
    custs: custs, activeProjects: activeProjects, contractVal: contractVal, invNet: invNet, invPaid: invPaid, coll: coll,
    outstanding: Math.max(0, invNet - invPaid), gt: gt, lateSteps: lateSteps, garAlerts: garAlerts,
    unpaid: unpaid.sort(function(a, b){ return b.remain - a.remain; }), followUps: followUps, noContract: noContract
  };
}

function renderClientsDashboardPage(){
  const d = clDashData(clDashFilters.customerId);
  const kpi = function(n, l, c, goto){ return '<div class="stat-card dash-kpi"' + (goto ? ' data-goto="' + goto + '" style="cursor:pointer;"' : '') + '><div class="num"' + (c ? ' style="color:' + c + ';"' : '') + '>' + n + '</div><div class="lbl">' + l + '</div></div>'; };
  const sec = function(title, count, body, color){
    return '<div class="card dash-sec" style="padding:14px;margin-top:12px;"><h3 style="margin:0 0 8px;font-size:15px;">' + title +
      ' <span style="background:' + (count ? (color || '#dc2626') : '#16a34a') + ';color:#fff;border-radius:10px;padding:1px 8px;font-size:12px;">' + count + '</span></h3>' +
      (count ? body : '<div style="color:var(--ink-soft);">لا شيء يحتاج متابعة ✓</div>') + '</div>';
  };
  const row = function(a, b, attrs){ return '<div class="dash-row" ' + attrs + ' style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--border,#e5e7eb);cursor:pointer;"><span>' + a + '</span><span style="color:var(--ink-soft);white-space:nowrap;">' + b + '</span></div>'; };
  const custOpts = clCustomers().map(function(c){ return '<option value="' + escapeHtml(c.id) + '"' + (clDashFilters.customerId === c.id ? ' selected' : '') + '>' + escapeHtml(c.name) + '</option>'; }).join('');
  return `
    <div class="page">
      ${typeof unifiedPageHeader === 'function' ? unifiedPageHeader('لوحة متابعة العملاء', 'مؤشرات الدورة التجارية وما يحتاج متابعة اليوم', `<select class="input" id="dashCust" style="width:auto;"><option value="">كل العملاء</option>${custOpts}</select>`) : ''}
      <div class="stats-row" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;">
        ${kpi(d.custs.filter(function(c){ return (c.status || 'active') === 'active'; }).length, 'عملاء نشطون', '', 'clients.customers')}
        ${kpi(d.activeProjects.length, 'مشاريع جارية', '', 'projects')}
        ${kpi(fmtMoney(d.contractVal), 'قيمة العقود السارية', '', 'clients.contracts')}
        ${kpi(fmtMoney(d.invNet), 'صافي المستخلصات', '', 'clients.invoices')}
        ${kpi(fmtMoney(d.coll), 'التحصيلات', '#16a34a', 'clients.collections')}
        ${kpi(fmtMoney(d.outstanding), 'متبقي على العملاء', d.outstanding ? '#dc2626' : '', 'clients.invoices')}
        ${kpi(fmtMoney(d.gt.live), 'ضمانات سارية', '', 'clients.guarantees')}
        ${kpi(d.lateSteps.length, 'خطوات متأخرة', d.lateSteps.length ? '#dc2626' : '', 'projects')}
      </div>
      ${sec('خطوات مشاريع متأخرة', d.lateSteps.length, d.lateSteps.slice(0, 10).map(function(r){
        return row(escapeHtml(r.p.name) + ' — ' + escapeHtml(r.x.step.label), 'استحقاق ' + escapeHtml(r.x.meta.dueDate || ''), 'data-proj="' + escapeHtml(r.p.id) + '"');
      }).join(''))}
      ${sec('ضمانات منتهية أو قاربت على الانتهاء', d.garAlerts.length, d.garAlerts.slice(0, 10).map(function(g){
        return row(escapeHtml(g.id + ' — ' + (g.customerName || '') + ' · ' + (g.type || '')) + ' (' + fmtMoney(Number(g.amount) || 0) + ')', escapeHtml(g._eff === 'منتهي' ? 'منتهي ' + (g.expiryDate || '') : g.expiryDate || ''), 'data-goto="clients.guarantees"');
      }).join(''), '#d97706')}
      ${sec('مستخلصات غير مسددة', d.unpaid.length, d.unpaid.slice(0, 10).map(function(u){
        return row(escapeHtml((u.i.no || '') + ' — ' + u.c.name), fmtMoney(u.remain) + (u.age != null && u.age > 30 ? ' · ' + u.age + ' يوم' : ''), 'data-goto="clients.invoices"');
      }).join(''), '#d97706')}
      ${sec('متابعات CRM مستحقة', d.followUps.length, d.followUps.slice(0, 10).map(function(o){
        return row(escapeHtml((o.title || o.id || '') + ' — ' + (o.customerName || '')), escapeHtml(o.nextFollowUp), 'data-goto="clients.crm"');
      }).join(''), '#d97706')}
      ${sec('مشاريع جارية بدون عقد', d.noContract.length, d.noContract.slice(0, 10).map(function(p){
        return row(escapeHtml(p.name), escapeHtml(p.status || ''), 'data-proj="' + escapeHtml(p.id) + '"');
      }).join(''), '#64748b')}
    </div>`;
}
function initClientsDashboardEvents(){
  document.getElementById('dashCust')?.addEventListener('change', function(e){ clDashFilters.customerId = e.target.value; rerenderCurrentPage(); });
  document.querySelectorAll('[data-goto]').forEach(function(el){ el.addEventListener('click', function(){ goToPage(el.getAttribute('data-goto')); }); });
  document.querySelectorAll('[data-proj]').forEach(function(el){
    el.addEventListener('click', function(){
      if(typeof projectFilters !== 'undefined') projectFilters.detailId = el.getAttribute('data-proj');
      goToPage('projects');
    });
  });
}
