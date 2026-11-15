const { openApp } = require('./harness'); const { baseUser, ok, summary } = require('./lib');
(async () => {
  const seed = { users:[baseUser], schemaVersion:9,
    drivers:[{id:'d1',name:'سائق قديم',code:'D1',status:'active',birthDate:'1950-01-01',dailyWage:300,salary:9000},{id:'d2',name:'سائق شاب',code:'D2',status:'active',birthDate:'2000-01-01',dailyWage:200},{id:'d3',name:'سائق ثالث',code:'D3',status:'active',birthDate:'1990-01-01'}],
    workers:[{id:'w1',name:'ع1',code:'W1',status:'active',type:'company',birthDate:'1960-01-01'}],
    employees:[{id:'e1',name:'م',code:'E1',status:'active'}] };
  const { browser, page } = await openApp(seed);
  // drivers cards
  await page.evaluate(() => { driverFilters._boardLevel='list'; driverFilters.departmentId=''; goToPage('drivers'); rerenderCurrentPage(); }); await page.waitForTimeout(500);
  const labs = await page.evaluate(() => [...document.querySelectorAll('#pageContent .sc-card .sc-label, #pageContent .sc-card .lbl')].map(x => x.innerText.trim()));
  const txt = await page.evaluate(() => [...document.querySelectorAll('#pageContent .sc-card')].map(c => c.innerText.replace(/\s+/g,' ').trim()));
  ok(!txt.some(t => /متوسط اليومية/.test(t)) && /إجمالي الرواتب/.test(txt[txt.length-1]), 'drivers: last card = إجمالي الرواتب: ' + txt.join(' | '));
  // retired section
  await page.evaluate(() => { ensureAllResignedDepartments(); const d = DATA.departments.find(x => /^__retired_drivers/.test(x.id) || (isRetiredDeptId(x.id) && x.kind==='drivers')); driverFilters.departmentId = d.id; driverFilters._boardLevel='list'; goToPage('drivers'); rerenderCurrentPage(); }); await page.waitForTimeout(500);
  ok(await page.evaluate(() => !!document.getElementById('btnRetirePerson') && !document.getElementById('btnAddDriver') && /إحالة للمعاش/.test(document.getElementById('btnRetirePerson').innerText)), 'retired section: إحالة للمعاش replaces add');
  ok(await page.evaluate(() => /عدد المحالين للمعاش/.test(document.querySelector('#pageContent .sc-row').innerText) && !/رخص منتهية/.test(document.querySelector('#pageContent .sc-row').innerText)), 'retired section cards are section-specific');
  await page.evaluate(() => document.getElementById('btnRetirePerson').click()); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const t = document.getElementById('appModal').innerText; return /سائق قديم/.test(t) && !/سائق شاب/.test(t); }), 'picker lists only over-60 drivers');
  await page.evaluate(() => document.querySelector('#appModal .ret-retire').click()); await page.waitForTimeout(600);
  console.log('confirm present:', await page.evaluate(() => !!document.querySelector('#appConfirmModal'))); await page.evaluate(() => { const ok = document.querySelector('#appDlgOk, #appConfirmModal [data-c="1"]'); if (ok) ok.click(); }); await page.waitForTimeout(900);
  ok(await page.evaluate(() => DATA.drivers.find(x => x.id==='d1').status === 'retired'), 'driver retired via picker: ' + JSON.stringify(await page.evaluate(() => [DATA.drivers.find(x => x.id==='d1').status, !!document.querySelector('#appConfirmModal'), (document.getElementById('appModal')||{}).innerText ? document.getElementById('appModal').innerText.slice(0,80) : ''])));
  await page.evaluate(() => { closeModal(); }); 
  // resigned section
  await page.evaluate(() => { const d = DATA.departments.find(x => /^__resigned_/.test(x.id) && x.kind==='drivers'); driverFilters.departmentId = d.id; goToPage('drivers'); rerenderCurrentPage(); }); await page.waitForTimeout(500);
  ok(await page.evaluate(() => !!document.getElementById('btnAddResigned') && /إضافة مستقيل/.test(document.getElementById('btnAddResigned').innerText)), 'resigned section: إضافة مستقيل button');
  await page.evaluate(() => document.getElementById('btnAddResigned').click()); await page.waitForTimeout(300);
  await page.evaluate(() => { document.getElementById('rsgPerson').value = 'd3'; document.getElementById('rsgSave').click(); }); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const d = DATA.drivers.find(x => x.id==='d3'); return d.status === 'resigned' && isResignedDeptId(d.departmentId); }), 'driver resigned via picker moves to resigned dept');
  // workers + employees
  await page.evaluate(() => { const d = DATA.departments.find(x => /^__resigned_/.test(x.id) && x.kind==='workers'); workerFilters.departmentId = d.id; workerFilters._boardLevel='list'; goToPage('workers'); rerenderCurrentPage(); }); await page.waitForTimeout(500);
  ok(await page.evaluate(() => !!document.getElementById('btnAddResigned') && !document.getElementById('btnAddWorker') && !document.getElementById('btnAddTempWorker')), 'workers resigned section buttons');
  await page.evaluate(() => { const d = DATA.departments.find(x => /^__retired_/.test(x.id) && x.kind==='employees'); employeeFilters.departmentId = d.id; employeeFilters._boardLevel='list'; goToPage('employees'); rerenderCurrentPage(); }); await page.waitForTimeout(500);
  ok(await page.evaluate(() => !!document.getElementById('btnRetirePerson') && !document.getElementById('btnAddEmployee')), 'employees retired section button');
  // HR import
  await page.evaluate(() => { goToPage('backup'); rerenderCurrentPage(); }); await page.waitForTimeout(500);
  const r = await page.evaluate(() => { const before = DATA.employees.length; const res = hrImportLegacyData(JSON.stringify({ employees:[{id:'x1',name:'قديم',code:'OLD1'},{id:'e1',name:'مكرر',code:'E1'}], users:[{id:'u',name:'bad'}] })); return [res.added, res.skipped, DATA.employees.length - before, DATA.users.some(u=>u.id==='u')]; });
  ok(r[0]===1 && r[1]===1 && r[2]===1 && r[3]===false, 'HR legacy import merges w/o duplicates, ignores users: ' + r);
  await browser.close(); summary();
})();
