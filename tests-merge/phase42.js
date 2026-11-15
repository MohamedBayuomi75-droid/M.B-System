const { openApp } = require('./harness'); const { baseUser, ok, summary } = require('./lib');
(async () => {
  const mk = (p, n, x) => [1, 2].map(i => Object.assign({ id: p + i, name: n + i, code: p.toUpperCase() + i, status: 'active' }, x));
  const { browser, page } = await openApp({ users:[baseUser], schemaVersion:9, drivers: mk('d','سائق'), employees: mk('e','موظف'), workers: mk('w','عامل',{type:'company'}), supervisors: mk('s','مشرف'), equipment: mk('q','معدة') });
  for (const [pg, flt] of [['drivers','driverFilters'],['employees','employeeFilters'],['workers','workerFilters'],['supervisors','supervisorFilters'],['equipment','equipmentFilters']]) {
    await page.evaluate(([pg, flt]) => { eval(flt)._boardLevel = 'list'; eval(flt).departmentId = ''; goToPage(pg); rerenderCurrentPage(); }, [pg, flt]); await page.waitForTimeout(600);
    const n = await page.evaluate(() => new Promise(res => { let n = 0; const mo = new MutationObserver(m => { n += m.length; }); mo.observe(document.body, { subtree:true, childList:true, attributes:true }); setTimeout(() => { mo.disconnect(); res(n); }, 1500); }));
    ok(n === 0, pg + ' table is DOM-stable at rest (mutations=' + n + ')');
  }
  await browser.close(); summary();
})();
