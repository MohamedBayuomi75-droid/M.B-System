const { openApp } = require('./harness'); const { baseUser, ok, summary } = require('./lib');
(async () => {
  const { browser, page, errors } = await openApp({ users:[baseUser], schemaVersion:9, workers:[{id:'w1',name:'ع',code:'W1',status:'active',type:'company',skill:'نجار',salary:100}], supervisors:[{id:'s1',name:'ش',code:'S1',status:'active',skill:'مهندس',project:'م'}] });
  const order = async (fn) => { await page.evaluate(fn); await page.waitForTimeout(700); const r = await page.evaluate(() => { const g = document.querySelector('#appModal .form-grid'); return [...g.querySelectorAll('label,.form-att-block')].filter(l => (!l.parentElement.closest('label,.form-att-block') && !l.closest('.form-att-block') || l.classList.contains('form-att-block')) && l.offsetParent !== null).map(l => [+(l.style.order||500), (l.innerText||'').trim().split('\n')[0]]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]); }); await page.evaluate(() => closeModal()); await page.waitForTimeout(200); return r; };
  const idx = (a, t) => a.findIndex(x => x.indexOf(t) === 0);
  const seq = ['الكود','الاسم','الحالة','الرقم القومي','الوظيفة','القسم'];
  for (const [n, fn] of [['emp', () => openEmployeeModal()], ['wrk', () => openWorkerModal(null,{defaultType:'company'})], ['sup', () => openSupervisorModal()], ['drv', () => openDriverModal()]]) {
    const a = await order(fn);
    ok(seq.every((t,i) => idx(a,t) === i) && /الملاحظات|ملاحظات/.test(a[a.length-2]) && /حالة التأمين/.test(a.join('|')) && idx(a,'الرقم التأميني') < idx(a,'حالة التأمين') && idx(a,'حالة التأمين') < idx(a,'الهاتف'), n + ' order: ' + a.join('|'));
  }
  let a = await order(() => openWorkerModal(null,{defaultType:'company'}));
  ok(!a.some(x => /تاريخ الانضمام|الاستقالة|اليومية/.test(x)) && a.filter(x => /الراتب/.test(x)).length === 1, 'worker form: salary not daily: ' + a.join('|'));
  a = await order(() => openSupervisorModal());
  ok(!a.some(x => /المشروع|الانضمام/.test(x)), 'supervisor no project fields');
  // قسم من الوظيفة
  await page.evaluate(() => openSupervisorModal('s1')); await page.waitForTimeout(500);
  ok(await page.evaluate(() => { const d = document.getElementById('supDept'); return d.readOnly && d.value === 'مهندس'; }), 'sup dept readonly from job');
  await page.evaluate(() => { document.getElementById('btnSaveSup').click(); }); await page.waitForTimeout(600);
  ok(await page.evaluate(() => { const s = DATA.supervisors.find(x => x.id==='s1'); return s.departmentId === '__core_supervisors__' && s.project === 'م'; }), 'sup save keeps core dept + project');
  // buttons
  await page.evaluate(() => { workerFilters.departmentId='__core_workers_perm__'; workerFilters._boardLevel='list'; goToPage('workers'); rerenderCurrentPage(); }); await page.waitForTimeout(400);
  ok(await page.evaluate(() => !document.getElementById('btnAddTempWorker') && !!document.getElementById('btnAddWorker')), 'perm: no temp button');
  await page.evaluate(() => { workerFilters.departmentId='__core_workers_temp__'; rerenderCurrentPage(); }); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const b = document.getElementById('btnAddTempWorker'); return !!b && getComputedStyle(b).backgroundColor === 'rgb(27, 67, 50)' && !document.getElementById('btnAddWorker'); }), 'temp: temp button only (back-button color)');
  ok(errors.length === 0, 'no errors ' + errors.slice(0,2));
  await browser.close(); summary();
})();
