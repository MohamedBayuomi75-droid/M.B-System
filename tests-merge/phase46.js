const { openApp } = require('./harness'); const { baseUser, ok, summary } = require('./lib');
(async () => {
  const mk = (id,n,code,extra)=>Object.assign({id,name:n,code,projects:[],boqs:[],workSurveys:[],collections:[],guarantees:[],invoices:[],contracts:[]},extra||{});
  const seed = { users:[baseUser], schemaVersion:9, projects:[], clients:{ customers:[
    mk('c1','أمل','C1',{department:'الحكومي',city:'القاهرة',workSurveys:[{id:'w1'}],boqs:[{id:'b1'},{id:'b2'}],invoices:[{id:'i1'}],notes:'ملاحظة'}),
    mk('c2','بدر','C2',{city:'الجيزة'}) ] } };
  const { browser, page, errors } = await openApp(seed);
  await page.evaluate(() => { customerFilters.detailId=''; goToPage('clients.customers'); rerenderCurrentPage(); }); await page.waitForTimeout(500);
  const ths = await page.evaluate(() => [...document.querySelectorAll('#pageContent table.data-table thead th')].map(x=>x.innerText.trim()));
  ok(ths[0]==='الكود' && ths.includes('القسم') && ths.includes('أعمال الحصر') && ths.includes('المقايسات') && !ths.includes('الحالة'), 'columns: '+ths.join('|'));
  ok(await page.evaluate(()=>![...document.querySelectorAll('#pageContent .stats-row .lbl')].some(x=>x.innerText.trim()==='نشط')), 'no status card');
  ok(await page.evaluate(()=>!document.getElementById('custStatus') && !!document.getElementById('custDept')), 'filters');
  await page.evaluate(()=>{ const s=document.getElementById('custDept'); s.value='الحكومي'; s.dispatchEvent(new Event('change')); }); await page.waitForTimeout(300);
  ok(await page.evaluate(()=>document.querySelectorAll('#pageContent tbody tr').length===1), 'dept filter');
  await page.evaluate(()=>{ document.getElementById('custClear').click(); }); await page.waitForTimeout(300);
  await page.evaluate(()=>{ const s=document.getElementById('custInvoice'); s.value='has'; s.dispatchEvent(new Event('change')); }); await page.waitForTimeout(300);
  ok(await page.evaluate(()=>document.querySelectorAll('#pageContent tbody tr').length===1 && /أمل/.test(document.querySelector('#pageContent tbody').innerText)), 'invoice filter');
  await page.evaluate(()=>{ document.getElementById('custClear').click(); document.getElementById('btnAddCustomer').click(); }); await page.waitForTimeout(500);
  const order = await page.evaluate(()=>{ const m=document.querySelector('#appModal .modal-body .form-grid'); const k=[...m.children].filter(x=>x.matches('label,.field')); return [k[0].innerText.trim().split('\n')[0], k[k.length-1].innerText.trim().split('\n')[0], !!document.getElementById('cuDept'), document.getElementById('cuNotes').getBoundingClientRect().height]; });
  ok(order[0]==='الكود' && /ملاحظات/.test(order[1]) && order[2] && order[3]>=70, 'form code first/notes last/dept: '+JSON.stringify(order));
  await page.evaluate(()=>{ document.getElementById('cuName').value='جديد'; { const s=document.getElementById('cuDept'); s.value='__new__'; s.dispatchEvent(new Event('change')); document.getElementById('cuDept').value='الخاص'; } document.getElementById('btnSaveCustomer').click(); }); await page.waitForTimeout(400);
  ok(await page.evaluate(()=>clCustomers().some(c=>c.name==='جديد'&&c.department==='الخاص')), 'saved dept');
  await page.evaluate(()=>{ customerFilters.detailId='c1'; rerenderCurrentPage(); }); await page.waitForTimeout(400);
  ok(await page.evaluate(()=>!!document.querySelector('#pageContent .pd-info .pd-info-cols') && !!document.getElementById('custEditFromDetail') && /الحصر/.test(document.querySelector('#pageContent').innerText)), 'detail like people page');
  ok(errors.length===0, 'no page errors: '+errors.slice(0,3));
  await browser.close(); summary();
})();
