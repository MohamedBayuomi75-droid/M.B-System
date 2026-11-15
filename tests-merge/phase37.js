const { openApp } = require('./harness'); const { baseUser, ok, summary } = require('./lib');
(async () => {
  const seed = { users:[baseUser], schemaVersion:9, workers:[{id:'w1',name:'ع',code:'W1',status:'active',type:'company',salary:100}] };
  const { browser, page } = await openApp(seed);
  await page.evaluate(() => { workerFilters._boardLevel='list'; workerFilters.departmentId=''; goToPage('workers'); rerenderCurrentPage(); }); await page.waitForTimeout(500);
  ok(await page.evaluate(() => !!document.getElementById('btnAddTempWorker')), 'temp worker button');
  ok(await page.evaluate(() => !(EMPLOYEE_STATUS.concat(WORKER_STATUS)).some(s => s.value === 'temporary' || s.key === 'temporary')), 'no temporary in status list');
  // height + per-row
  await page.evaluate(() => { DATA.formLayouts = DATA.formLayouts||{}; const l = ensureFormLayout('workers'); l.find(x=>x.key==='name').height = 80; l.find(x=>x.key==='name').width = 300; DATA.formLayouts.workers = l; DATA.formCols = { workers: 3 }; openWorkerModal(); }); await page.waitForTimeout(400);
  const r = await page.evaluate(() => { const el = document.getElementById('wrkName'); const lab = el.closest('label'); return { h: el.style.height, w: lab.style.width, g: lab.parentElement.style.gridTemplateColumns }; });
  ok(r.h === '80px' && r.w === '300px' && /repeat\(3/.test(r.g), 'height/width/per-row applied ' + JSON.stringify(r));
  await browser.close(); summary();
})();
