const { openApp } = require('./harness'); const { baseUser, ok, summary } = require('./lib');
(async () => {
  const seed = { users:[baseUser], schemaVersion:9,
    employees:[{id:'e1',name:'أ',code:'E1',status:'active',position:'محاسب'},{id:'e2',name:'ب',code:'E2',status:'active',position:'مهندس'}],
    supervisors:[{id:'s1',name:'مشرف أ',code:'S1'}],
    workers:[{id:'w1',name:'ع1',code:'W1',status:'active',type:'company',supervisorId:'s1'}],
    equipment:[{id:'q1',name:'خارجية1',code:'Q1',ownership:'rented',status:'working'},{id:'q2',name:'خارجية2',code:'Q2',ownership:'rented',status:'maintenance'}] };
  const { browser, page } = await openApp(seed);
  // job filter
  await page.evaluate(() => { employeeFilters._boardLevel='list'; employeeFilters.departmentId=''; goToPage('employees'); rerenderCurrentPage(); }); await page.waitForTimeout(500);
  ok(await page.evaluate(() => !!document.getElementById('empFilterPos') && document.getElementById('empFilterPos').options.length === 3), 'job filter present with distinct jobs');
  await page.evaluate(() => { employeeFilters.position = 'مهندس'; rerenderCurrentPage(); }); await page.waitForTimeout(400);
  ok(await page.evaluate(() => filteredEmployees().length === 1 && filteredEmployees()[0].id === 'e2'), 'job filter filters');
  // people boards order
  await page.evaluate(() => { employeeFilters.position=''; employeeFilters._boardLevel='boards'; goToPage('employees'); rerenderCurrentPage(); }); await page.waitForTimeout(400);
  const order = await page.evaluate(() => [...document.querySelectorAll('.entity-dept-board .lbl')].map(x => x.textContent.trim()));
  ok(order[0] === 'الكل' && order[1] === 'بدون قسم أو وظيفة' && order[2] === 'المستقيلين', 'بدون قسم right after الكل: ' + order);
  // external cars cards + button
  await page.evaluate(() => { enterEntityDeptBoard(equipmentFilters, '__core_eq_external__'); goToPage('equipment'); rerenderCurrentPage(); }); await page.waitForTimeout(500);
  const txt = await page.evaluate(() => [...document.querySelectorAll('#pageContent .sc-card')].map(c => c.innerText).join(' '));
  ok(/متاحة/.test(txt) && /غير متاحة/.test(txt) && !/حالة التأمين/.test(txt) , 'external cars: availability card instead of insurance');
  ok(await page.evaluate(() => !!document.getElementById('btnAddExtCar')), 'external car button');
  await page.evaluate(() => document.getElementById('btnAddExtCar').click()); await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.getElementById('eqOwnership').value === 'rented'), 'external car modal presets rented');
  await page.evaluate(() => closeModal()); await page.waitForTimeout(300);
  // dailies boards
  await page.evaluate(() => { workerAttFilters.dailiesTab='workers'; workerAttFilters.dailiesDept=undefined; goToPage('workerAttendance'); rerenderCurrentPage(); }); await page.waitForTimeout(400);
  const dt = await page.evaluate(() => [...document.querySelectorAll('.dailies-dept-board .board-card-title')].map(x => x.textContent.trim()));
  ok(!dt.includes('بدون قسم') && dt[0] === 'الكل' && !dt.includes('المستقيلين') && !dt.includes('المعاشات'), 'dailies boards: no بدون قسم, no resigned/retired: ' + dt);
  // dailies supervisor combo not clipped
  await page.evaluate(() => { workerAttFilters.dailiesDept='__core_workers_perm__'; rerenderCurrentPage(); }); await page.waitForTimeout(500);
  await page.click('#wattFilterSup_text'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('.dly-filters')).overflow === 'visible' && !!document.querySelector('.entity-combo-item')), 'dailies supervisor filter list not clipped');
  await browser.close(); summary();
})();
