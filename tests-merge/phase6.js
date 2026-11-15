const { openApp } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  const seed = { users: [baseUser], schemaVersion: 7, projects: [
      { id: 'p1', code: 'PRJ-1', name: 'مشروع 1', customerId: 'cA', status: 'التنفيذ والمتابعة', stageKey: 'execution', stepKey: 'works_exec', stepMeta: { works_exec: { status: 'in_progress', dueDate: d(-3) } } },
      { id: 'p2', code: 'PRJ-2', name: 'مشروع 2', customerId: 'cA', status: 'مكتمل' },
      { id: 'p3', code: 'PRJ-3', name: 'مشروع 3', customerId: 'cB', status: 'الدراسة والتخطيط' } ],
    clients: { customers: [
      { id: 'cA', name: 'أمل', code: 'C1', status: 'active', projects: [], contracts: [{ id: 'CT-1', title: 'ع', projectId: 'p1', project: 'مشروع 1', value: 1000, status: 'ساري' }],
        invoices: [{ no: 'INV-1', value: 1000, paid: 400, date: d(-60) }], collections: [{ id: 'R1', amount: 400 }], boqs: [], workSurveys: [],
        guarantees: [{ id: 'GAR-1', type: 'ضمان نهائي', amount: 100, status: 'ساري', expiryDate: d(10) }],
        opportunities: [{ id: 'O1', title: 'فرصة', stage: 'تفاوض', nextFollowUp: d(-1) }] },
      { id: 'cB', name: 'بيتا', code: 'C2', status: 'active', projects: [], contracts: [], invoices: [], collections: [], boqs: [], workSurveys: [], guarantees: [], opportunities: [] } ] } };
  const { browser, page, errors } = await openApp(seed);
  const w = (ms = 250) => page.waitForTimeout(ms);
  await page.evaluate(() => { document.getElementById('pageContent').innerHTML = renderClientsDashboardPage(); initClientsDashboardEvents(); }); await w();
  eq(await page.evaluate(() => document.querySelectorAll('.dash-kpi').length), 8, '8 KPIs');
  const dd = await page.evaluate(() => { const x = clDashData(''); return [x.activeProjects.length, x.contractVal, x.invNet, x.outstanding, x.lateSteps.length, x.garAlerts.length, x.unpaid.length, x.followUps.length, x.noContract.map(p => p.id)]; });
  eq(dd, [2, 1000, 1000, 600, 1, 1, 1, 1, ['p3']], 'numbers: active projects, contracts, invoiced, outstanding, late, guarantees, unpaid, follow-ups, no-contract');
  eq(await page.evaluate(() => document.querySelectorAll('.dash-sec').length), 5, '5 follow-up sections');
  eq(await page.evaluate(() => { const x = clDashData('cB'); return [x.activeProjects.length, x.invNet]; }), [1, 0], 'customer filter scopes data');
  await page.evaluate(() => { clDashFilters.customerId = ''; document.getElementById('pageContent').innerHTML = renderClientsDashboardPage(); initClientsDashboardEvents(); }); await w();
  await page.evaluate(() => document.querySelector('.dash-kpi[data-goto="clients.guarantees"]').click()); await w();
  ok(await page.evaluate(() => currentPage === 'clients.guarantees'), 'KPI navigates to its page');
  summary(errors); await browser.close();
})();
