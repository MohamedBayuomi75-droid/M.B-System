const { openApp } = require('./harness'); const { baseUser, ok, summary } = require('./lib');
(async () => {
  const { browser, page, errors } = await openApp({ users:[baseUser], schemaVersion:9,
    projects:[{id:'p1',code:'P1',name:'مشروع أ',customerId:'c1',status:'التنفيذ والمتابعة'}], clients:{customers:[{id:'c1',name:'ع',code:'C1',projects:[],boqs:[],workSurveys:[],collections:[],guarantees:[],invoices:[],contracts:[]}]},
    workers:[{id:'w1',name:'ع1',code:'W1',status:'active',type:'temporary',workerType:'temporary',dailyWage:200},{id:'w2',name:'ع2',code:'W2',status:'active',type:'temporary',workerType:'temporary',dailyWage:300}],
    supervisors:[{id:'s1',name:'ش',code:'S1',status:'active',dailyWage:200},{id:'s2',name:'ش2',code:'S2',status:'active',dailyWage:300}],
    employees:[{id:'e1',name:'م',code:'E1',status:'active',salary:5000}], drivers:[{id:'d1',name:'س',code:'D1',status:'active',dailyWage:150}],
    workerAttendance:[{id:'a1',personType:'worker',workerId:'w1',personId:'w1',date:new Date().toISOString().slice(0,8)+'05',status:'present',days:1,dayWage:200,project:'مشروع أ',site:'موقع 1'},{id:'a2',personType:'worker',workerId:'w2',personId:'w2',date:new Date().toISOString().slice(0,8)+'05',status:'present',days:1,dayWage:300,project:'مشروع أ',site:'موقع 2'}] });
  const open = async fn => { await page.evaluate(fn); await page.waitForTimeout(700); };
  const close = () => page.evaluate(() => closeModal());
  const geo = () => page.evaluate(() => { const r = id => { const e = document.getElementById(id); return e ? Math.round(e.getBoundingClientRect().height) : null; }; const g = document.querySelector('#appModal .form-grid'); return { notes: r('empNotes')||r('drvNotes')||r('supNotes'), name: r('empName')||r('drvName')||r('supName'), date: r('empBirth')||r('drvBirth')||r('supBirth'), notesW: (()=>{ const e = document.querySelector('#appModal textarea'); return e ? Math.round(e.getBoundingClientRect().width) : 0; })(), gw: Math.round(g.getBoundingClientRect().width) }; });
  await open(() => openEmployeeModal()); let g1 = await geo(); await close();
  await open(() => openDriverModal()); let g2 = await geo();
  ok(g1.notes === g2.notes && g1.notes >= 90 && g1.notesW >= g1.gw - 4, 'notes same in employee/driver ' + JSON.stringify([g1, g2]));
  ok(g1.name === g1.date, 'inputs same height as date field ' + JSON.stringify(g1));
  ok(await page.evaluate(() => { const e = document.getElementById('drvLicGrade'); return e.tagName === 'SELECT'; }), 'license grade is select');
  ok(await page.evaluate(() => { const a = document.getElementById('drvAddress').closest('label'); return a.style.gridColumn === ''; }), 'address small'); await close();
  // order hire after dept, wage after insurance status
  await open(() => openSupervisorModal());
  const sup = await page.evaluate(() => [...document.querySelectorAll('#appModal label')].filter(l => !l.parentElement.closest('label') && l.offsetParent!==null).map(l => [+(l.style.order||500), (l.innerText||'').trim().split('\n')[0]]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]));
  const ix = t => sup.findIndex(x => x.indexOf(t) === 0);
  ok(ix('تاريخ التعيين') === ix('القسم') + 1 && ix('اليومية') === ix('حالة التأمين') + 1, 'sup hire after dept, wage after insurance: ' + sup.join('|')); await close();
  // dailies form
  await open(() => { goToPage('workerAttendance'); rerenderCurrentPage(); });
  await open(() => openWorkerAttModal());
  const dl = await page.evaluate(() => [...document.querySelectorAll('#appModal .form-grid > label')].map(l => (l.innerText||'').trim().split('\n')[0]).slice(0,5));
  ok(/^النوع/.test(dl[0]) && /^الشخص/.test(dl[1]) && /^الحالة/.test(dl[2]) && /^التاريخ/.test(dl[3]), 'dailies order ' + dl.join('|')); await close();
  // dailies filters
  await open(() => { workerAttFilters.dailiesTab='workers'; workerAttFilters.dailiesDept=''; rerenderCurrentPage(); });
  ok(await page.evaluate(() => !!document.getElementById('wattFilterProject') && !!document.getElementById('wattFilterSite') && [...document.getElementById('wattFilterSite').options].map(o => o.value).join() === ',موقع 1,موقع 2'), 'separate site filter');
  // resign picker
  await open(() => openResignPicker('worker'));
  ok(await page.evaluate(() => { const o = [...document.querySelectorAll('#rsgGrid > label')].map(l => (l.innerText||'').trim().split('\n')[0]); return /^القسم/.test(o[0]) && /^اختر الشخص/.test(o[1]) && /^تاريخ/.test(o[2]); }), 'resign picker dept first');
  await page.evaluate(() => { const d = document.getElementById('rsgDept'); d.value = '__core_workers_perm__'; d.dispatchEvent(new Event('change')); });
  ok(await page.evaluate(() => document.getElementById('rsgPerson').options.length === 1), 'resign person filtered by dept'); await close();
  // cards
  await open(() => { supervisorFilters._boardLevel='list'; supervisorFilters.departmentId=''; goToPage('supervisors'); rerenderCurrentPage(); });
  let c = await page.evaluate(() => [...document.querySelectorAll('#pageContent .sc-card')].map(x => x.innerText.replace(/\s+/g,' ').trim()));
  ok(/إجمالي اليوميات/.test(c[c.length-1]) && /500|٥٠٠/.test(c[c.length-1]), 'sup daily total: ' + c[c.length-1]);
  await open(() => { workerFilters._boardLevel='list'; workerFilters.departmentId='__core_workers_temp__'; goToPage('workers'); rerenderCurrentPage(); });
  c = await page.evaluate(() => [...document.querySelectorAll('#pageContent .sc-card')].map(x => x.innerText.replace(/\s+/g,' ').trim()));
  ok(/إجمالي اليوميات/.test(c[c.length-1]) && /500|٥٠٠/.test(c[c.length-1]), 'temp workers daily total: ' + c[c.length-1]);
  // temp worker form
  await open(() => openWorkerModal(null, { defaultType:'temporary' }));
  const tw = await page.evaluate(() => [...document.querySelectorAll('#appModal label')].filter(l => !l.parentElement.closest('label') && l.offsetParent!==null).map(l => [+(l.style.order||500), (l.innerText||'').trim().split('\n')[0]]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]));
  ok(!tw.some(x => /^المشروع/.test(x)) && tw.findIndex(x => /^الوظيفة/.test(x)) === tw.findIndex(x => /^القسم/.test(x)) - 1 && tw.some(x => /ملاحظات/.test(x)), 'temp worker form: ' + tw.join('|')); await close();
  // external drivers
  await open(() => { driverFilters._boardLevel='list'; driverFilters.departmentId='__core_drivers_ext__'; goToPage('drivers'); rerenderCurrentPage(); });
  ok(await page.evaluate(() => !!document.getElementById('btnAddExtDriver') && !document.getElementById('btnAddDriver')), 'ext section buttons');
  await page.evaluate(() => document.getElementById('btnAddExtDriver').click()); await page.waitForTimeout(500);
  const ed = await page.evaluate(() => [...document.querySelectorAll('#appModal label')].filter(l => !l.parentElement.closest('label')).map(l => (l.innerText||'').trim().split('\n')[0]));
  ok(!ed.some(x => /المشروع|المشرف/.test(x)) && ed.some(x => /^الوظيفة/.test(x)) && ed.some(x => /ملاحظات/.test(x)), 'ext driver form: ' + ed.join('|'));
  await page.evaluate(() => { document.getElementById('drvName').value = 'خارجي'; document.getElementById('drvWage').value = '250'; document.getElementById('btnSaveDriver').click(); }); await page.waitForTimeout(600);
  ok(await page.evaluate(() => { const d = DATA.drivers.find(x => x.name==='خارجي'); return d && d.external && d.departmentId === '__core_drivers_ext__' && d.dailyWage === 250; }), 'ext driver saved in ext dept');
  await open(() => { driverFilters.departmentId='__core_drivers__'; rerenderCurrentPage(); });
  ok(await page.evaluate(() => !!document.getElementById('btnAddDriver') && !document.getElementById('btnAddExtDriver') && !/خارجي/.test(document.querySelector('#pageContent tbody').innerText)), 'drivers section excludes external');
  await open(() => { driverFilters._boardLevel='boards'; driverFilters.departmentId=''; goToPage('drivers'); rerenderCurrentPage(); });
  ok(await page.evaluate(() => /سائقون من خارج الشركة/.test(document.getElementById('pageContent').innerText)), 'ext dept board exists');
  ok(errors.length === 0, 'no errors ' + errors.slice(0,2));
  await browser.close(); summary();
})();
