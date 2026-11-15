const { openApp } = require('./harness'); const { baseUser, ok, summary } = require('./lib');
(async () => {
  const { browser, page, errors } = await openApp({ users:[baseUser], schemaVersion:9,
    workers:[{id:'w1',name:'ع1',code:'W1',status:'active',type:'temporary',workerType:'temporary',dailyWage:200},{id:'w2',name:'ع2',code:'W2',status:'active',type:'company',workerType:'company',salary:4000}],
    supervisors:[{id:'s1',name:'ش',code:'S1',status:'active',dailyWage:200},{id:'s2',name:'ش2',code:'S2',status:'active',dailyWage:300}],
    employees:[{id:'e1',name:'م',code:'E1',status:'active',salary:5000}], drivers:[{id:'d1',name:'س',code:'D1',status:'active',salary:6000},{id:'d2',name:'خ',code:'D2',status:'active',external:true,dailyWage:150}],
    workerAttendance:[{id:'a1',personType:'worker',workerId:'w1',personId:'w1',date:new Date().toISOString().slice(0,8)+'05',status:'present',days:1,dayWage:200},{id:'a2',personType:'supervisor',supervisorId:'s1',personId:'s1',date:new Date().toISOString().slice(0,8)+'05',status:'present',days:1,dayWage:200}] });
  const open = async fn => { await page.evaluate(fn); await page.waitForTimeout(700); };
  const close = () => page.evaluate(() => closeModal());
  const names = await page.evaluate(() => [CORE_DEPTS.drivers[0].name, CORE_DEPTS.workers[0].name]);
  ok(names[0] === 'سائقين الشركة' && names[1] === 'عمال الشركة', 'renames ' + names);
  // temp worker form order: supervisor before wage
  await open(() => openWorkerModal(null, { defaultType:'temporary' }));
  const ord = await page.evaluate(() => [...document.querySelectorAll('#appModal label')].filter(l => !l.parentElement.closest('label') && l.offsetParent!==null).map(l => [+(l.style.order||500), (l.innerText||'').trim().split('\n')[0]]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]));
  const ix = t => ord.findIndex(x => x.indexOf(t) === 0);
  ok(ix('المشرف') > -1 && ix('المشرف') < ix('اليومية'), 'supervisor before daily: ' + ord.join('|')); await close();
  // company worker form: salary, no daily
  await open(() => openWorkerModal(null, { defaultType:'company' }));
  ok(await page.evaluate(() => !!document.getElementById('wrkSalary') && !document.getElementById('wrkWage')), 'company worker has salary only'); await close();
  await open(() => openDriverModal());
  ok(await page.evaluate(() => !!document.getElementById('drvSalary') && !document.getElementById('drvWage')), 'company driver has salary only'); await close();
  // notes textarea full width
  await open(() => openEmployeeModal());
  ok(await page.evaluate(() => { const t = document.getElementById('empNotes'); const g = document.querySelector('#appModal .form-grid'); return t.getBoundingClientRect().width >= g.getBoundingClientRect().width - 4; }), 'employee notes full width'); await close();
  // tables
  await open(() => { workerFilters._boardLevel='list'; workerFilters.departmentId='__core_workers_temp__'; goToPage('workers'); rerenderCurrentPage(); });
  let th = await page.evaluate(() => [...document.querySelectorAll('#pageContent table thead th')].map(x => x.innerText.trim()));
  ok(th.indexOf('الكود') > -1 && th.indexOf('الحالة') > -1 && th.indexOf('الوظيفة') > -1 && th.indexOf('المشروع') < 0 && th.indexOf('المشرف') < th.indexOf('اليومية'), 'temp cols ' + th.join('|'));
  await open(() => { workerFilters.departmentId='__core_workers_perm__'; rerenderCurrentPage(); });
  th = await page.evaluate(() => [...document.querySelectorAll('#pageContent table thead th')].map(x => x.innerText.trim()));
  ok(th.indexOf('الراتب') > -1 && th.indexOf('اليومية') < 0, 'perm cols ' + th.join('|'));
  await open(() => { driverFilters._boardLevel='list'; driverFilters.departmentId='__core_drivers_ext__'; goToPage('drivers'); rerenderCurrentPage(); });
  th = await page.evaluate(() => [...document.querySelectorAll('#pageContent table thead th')].map(x => x.innerText.trim()));
  ok(th.indexOf('اليومية') > -1 && th.indexOf('انتهاء الرخصة') < 0 && th.indexOf('حالة الرخصة') < 0 && th.length <= 12 && th.indexOf('الوظيفة') > -1, 'ext cols ' + th.join('|'));
  let c = await page.evaluate(() => [...document.querySelectorAll('#pageContent .sc-card')].map(x => x.innerText.replace(/\s+/g,' ').trim()));
  ok(/إجمالي اليوميات/.test(c[c.length-1]), 'ext card ' + c[c.length-1]);
  await open(() => { driverFilters.departmentId='__core_drivers__'; rerenderCurrentPage(); });
  th = await page.evaluate(() => [...document.querySelectorAll('#pageContent table thead th')].map(x => x.innerText.trim()));
  ok(th.indexOf('الراتب') > -1 && th.indexOf('اليومية') < 0, 'company drivers cols');
  c = await page.evaluate(() => [...document.querySelectorAll('#pageContent .sc-card')].map(x => x.innerText.replace(/\s+/g,' ').trim()));
  ok(/إجمالي الرواتب/.test(c[c.length-1]), 'company drivers card ' + c[c.length-1]);
  // dailies supervisor combo closes
  await open(() => { workerAttFilters.dailiesTab='workers'; workerAttFilters.dailiesDept=''; goToPage('workerAttendance'); rerenderCurrentPage(); });
  ok(await page.evaluate(() => !!document.getElementById('wattFilterSup_text')), 'sup combo exists');
  await page.click('#wattFilterSup_text'); await page.waitForTimeout(300);
  await page.click('.entity-combo-drop .entity-combo-item >> nth=0'); await page.waitForTimeout(1800);
  ok(await page.evaluate(() => [...document.querySelectorAll('.entity-combo-drop')].every(d => d.offsetParent === null || getComputedStyle(d).display === 'none')), 'combo closed after pick');
  // retirement alerts only in the person's section
  await page.evaluate(() => { DATA.employees.push({id:'e9',name:'كبير',code:'E9',status:'active',salary:1,birthDate:'1950-01-01',departmentId:'__core_employees__'}); });
  const r = await page.evaluate(() => { const all = retirementDue('employee').length; return all; });
  ok(r >= 1, 'retirement due exists ' + r);
  await open(() => { employeeFilters._boardLevel='list'; employeeFilters.departmentId='__no_such_dept__'; goToPage('employees'); rerenderCurrentPage(); });
  ok(await page.evaluate(() => !document.querySelector('.ret-banner')), 'no banner in other section');
  await open(() => { employeeFilters.departmentId='__core_employees__'; rerenderCurrentPage(); });
  ok(await page.evaluate(() => !!document.querySelector('.ret-banner')), 'banner in own section');
  ok(errors.length === 0, 'no page errors ' + errors.slice(0,2));
  await browser.close(); summary();
})();
