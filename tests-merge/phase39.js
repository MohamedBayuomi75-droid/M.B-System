const { openApp } = require('./harness'); const { baseUser, ok, summary } = require('./lib');
(async () => {
  const seed = { users:[baseUser], schemaVersion:9,
    departments:[{id:'d1',name:'قسم قديم',kind:'employees'},{id:'d2',name:'ملاكي',kind:'equipment'},{id:'d3',name:'نقل ثقيل',kind:'equipment'}],
    employees:[{id:'e1',name:'أ',code:'E1',status:'active',departmentId:'d1'}],
    workers:[{id:'w1',name:'دائم',code:'W1',status:'active',type:'company',salary:100},{id:'w2',name:'مؤقت',code:'W2',status:'active',type:'temporary',dailyWage:150,nationalId:'123',phone:'010',address:'ع'}],
    supervisors:[{id:'s1',name:'م',code:'S1'}], drivers:[{id:'dr1',name:'س',code:'D1'}],
    equipment:[{id:'q1',name:'سيارة1',code:'Q1',departmentId:'d2'},{id:'q2',name:'سيارة2',code:'Q2',departmentId:'d3'},{id:'q3',name:'سيارة3',code:'Q3',ownership:'rented'}] };
  const { browser, page } = await openApp(seed);
  await page.evaluate(() => { ensureAllResignedDepartments(); });
  const r = await page.evaluate(() => ({
    emp: DATA.employees[0].departmentId, w1: DATA.workers[0].departmentId, w2: DATA.workers[1].departmentId, s: DATA.supervisors[0].departmentId, d: DATA.drivers[0].departmentId,
    q: DATA.equipment.map(e => e.departmentId), legacy: DATA.employees[0].legacyDepartmentId,
    names: departmentsForKind('workers').map(d => d.name), eqNames: departmentsForKind('equipment').map(d => d.name), empNames: departmentsForKind('employees').map(d => d.name) }));
  ok(r.emp === '__core_employees__' && r.legacy === 'd1', 'employee moved to core dept');
  ok(r.w1 === '__core_workers_perm__' && r.w2 === '__core_workers_temp__', 'workers split perm/temp');
  ok(r.s === '__core_supervisors__' && r.d === '__core_drivers__', 'sup/driver core');
  ok(r.q.join() === '__core_eq_private__,__core_eq_trucks__,__core_eq_external__', 'equipment mapped ' + r.q.join());
  ok(!r.empNames.includes('قسم قديم') && r.empNames[0] === 'الموظفين', 'legacy dept hidden: ' + r.empNames);
  ok(r.eqNames.slice(0, 4).join('|') === 'المعدات|السيارات الملاكى|سيارات النقل|سيارات خارجية', 'equipment order ' + r.eqNames);
  // boards without add/rename/delete
  await page.evaluate(() => { workerFilters._boardLevel = 'boards'; goToPage('workers'); rerenderCurrentPage(); }); await page.waitForTimeout(400);
  ok(await page.evaluate(() => !document.querySelector('.btn-add-cat,.btn-rename-cat,.btn-del-cat') && /عمال الشركة/.test(document.getElementById('pageContent').innerText) && /عمالة مؤقتة/.test(document.getElementById('pageContent').innerText)), 'boards: core cards, no manage buttons');
  await page.evaluate(() => { goToPage('departments'); rerenderCurrentPage(); }); await page.waitForTimeout(300);
  ok(await page.evaluate(() => !document.getElementById('btnAddDept') && !document.getElementById('btnDelDeptPage') && !document.getElementById('btnEditDeptName')), 'departments page: no manage buttons');
  // temp section table
  await page.evaluate(() => { workerFilters.type = ''; enterEntityDeptBoard(workerFilters, '__core_workers_temp__'); goToPage('workers'); rerenderCurrentPage(); }); await page.waitForTimeout(700);
  const th = await page.evaluate(() => { const t = document.querySelector('table[data-layout-ent="workersTemp"]'); return t ? [...t.querySelectorAll('thead th')].filter(x => getComputedStyle(x).display !== 'none').map(x => x.innerText.trim()) : null; });
  ok(th && ['الاسم', 'الرقم القومي', 'رقم التليفون', 'العنوان', 'اليومية', 'المشرف', 'القسم'].every(h => th.includes(h)) && !th.includes('الراتب'), 'temp table columns ' + JSON.stringify(th));
  ok(await page.evaluate(() => { const b = document.getElementById('btnAddTempWorker'); return b && /green-strong/.test(b.className); }), 'temp button prominent');
  // untick a field -> hidden column in temp table
  await page.evaluate(() => { const l = ensureFormLayout('workersTemp'); const f = l.find(x => x.key === 'address'); f.showInTable = false; f._userHidTable = true; DATA.formLayouts.workersTemp = l; rerenderCurrentPage(); }); await page.waitForTimeout(600);
  ok(await page.evaluate(() => ![...document.querySelectorAll('table[data-layout-ent="workersTemp"] thead th')].some(x => x.innerText.trim() === 'العنوان' && getComputedStyle(x).display !== 'none')), 'unticked temp column hidden');
  // temp modal detected as workersTemp
  await page.evaluate(() => { openWorkerModal(null, { defaultType: 'temporary' }); }); await page.waitForTimeout(300);
  ok(await page.evaluate(() => detectFormEntity(document.getElementById('appModal')) === 'workersTemp'), 'temp modal -> workersTemp');
  await page.evaluate(() => closeModal()); await page.waitForTimeout(300);
  // dailies names
  await page.evaluate(() => { workerAttFilters.dailiesTab = 'workers'; workerAttFilters.dailiesDept = undefined; goToPage('workerAttendance'); rerenderCurrentPage(); }); await page.waitForTimeout(400);
  ok(await page.evaluate(() => /يوميات عمالة مؤقتة/.test(document.getElementById('pageContent').innerText) && /يوميات عمالة الشركة/.test(document.getElementById('pageContent').innerText)), 'dailies sections');
  // back buttons one row
  const tops = await page.evaluate(() => [...document.querySelectorAll('#pageContent button')].filter(b => /^(←|◀)/.test(b.textContent.trim())).map(b => Math.round(b.getBoundingClientRect().top)));
  ok(tops.length >= 2 && new Set(tops).size === 1, 'back buttons same row ' + tops);
  await browser.close(); summary();
})();
