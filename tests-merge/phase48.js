const { openApp } = require('./harness'); const { baseUser, ok, summary } = require('./lib');
(async () => {
  const mk=(id,n,c)=>({id,name:n,code:c,projects:[],boqs:[],workSurveys:[],collections:[],guarantees:[],invoices:[],contracts:[]});
  const { browser, page, errors } = await openApp({ users:[baseUser], schemaVersion:9,
    projects:[{id:'p1',code:'P1',name:'جاري',customerId:'c1',status:'التنفيذ والمتابعة'},{id:'p2',code:'P2',name:'منتهي',customerId:'c2',status:'مكتمل'}],
    clients:{customers:[mk('c1','نشط','C1'),mk('c2','منتهي','C2'),mk('c3','بدون','C3')]} });
  const seg = await page.evaluate(() => clCustomers().map(c => c.id + ':' + clCustomerSegment(c)).join(','));
  ok(seg === 'c1:active,c2:inactive,c3:inactive', 'segments ' + seg);
  await page.evaluate(() => { customerFilters.seg='inactive'; customerFilters.detailId=''; goToPage('clients.customers'); rerenderCurrentPage(); }); await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.querySelectorAll('#pageContent tbody tr').length) === 2, 'inactive list = 2');
  // no project without customer
  await page.evaluate(() => { openProjectModal(); }); await page.waitForTimeout(500);
  await page.evaluate(() => { document.getElementById('prName').value='جديد'; document.getElementById('btnSavePr').click(); }); await page.waitForTimeout(400);
  ok(await page.evaluate(() => !DATA.projects.some(p => p.name==='جديد')), 'blocked without customer');
  await page.evaluate(() => { document.getElementById('prCustomerId').value='c3'; document.getElementById('btnSavePr').click(); }); await page.waitForTimeout(500);
  ok(await page.evaluate(() => DATA.projects.some(p => p.name==='جديد' && p.customerId==='c3')), 'saved with customer');
  ok(await page.evaluate(() => clCustomerSegment(clCustomerById('c3')) === 'active'), 'c3 becomes active');
  await page.evaluate(() => { ensureProjectSaved('خارجي'); }); 
  ok(await page.evaluate(() => !DATA.projects.some(p => p.name==='خارجي')), 'HR forms do not auto-create customerless projects');
  ok(errors.length===0,'no errors '+errors.slice(0,2));
  await browser.close(); summary();
})();
