const { openApp } = require('./harness'); const { baseUser, ok, summary } = require('./lib');
(async () => {
  const { browser, page, errors } = await openApp({ users:[baseUser], schemaVersion:9,
    projects:[{id:'p1',code:'P1',name:'مشروع',customerId:'c1',status:'التنفيذ والمتابعة'}],
    clients:{customers:[{id:'c1',name:'ع',code:'C1',department:'قسم أ',category:'حكومي',projects:[],boqs:[],workSurveys:[],collections:[],guarantees:[],invoices:[{id:'i1'}],contracts:[]},{id:'c2',name:'غ',code:'C2',department:'',projects:[],boqs:[],workSurveys:[],collections:[],guarantees:[],invoices:[],contracts:[]}]} });
  await page.evaluate(() => { customerFilters.detailId = null; goToPage('clients.customers'); rerenderCurrentPage(); }).catch(()=>{});
  await page.waitForTimeout(700);
  const lbls = await page.evaluate(() => [...document.querySelectorAll('#pageContent .stat-card .lbl')].map(x => x.innerText.trim()));
  ok(lbls.length && !lbls.some(l => /عملاء نشطون|غير نشطين|نتيجة البحث|^الأقسام$|لهم مشاريع/.test(l)) && lbls.indexOf('عدد المشاريع') > -1, 'cards ' + lbls.join('|'));
  const nums = () => page.evaluate(() => [...document.querySelectorAll('#pageContent .stat-card')].map(x => x.innerText.replace(/\s+/g,' ').trim()));
  const allCards = (await nums()).join('|');
  await page.evaluate(() => { customerFilters.seg = 'inactive'; rerenderCurrentPage(); }); await page.waitForTimeout(500);
  const inactiveCards = (await nums()).join('|');
  ok(allCards !== inactiveCards && /^2 العملاء/.test(allCards) && /^1 العملاء/.test(inactiveCards), 'cards follow section ' + allCards + ' // ' + inactiveCards);
  await page.evaluate(() => { customerFilters.seg = ''; rerenderCurrentPage(); }); await page.waitForTimeout(400);
  ok(await page.evaluate(() => !document.getElementById('custCity') && !document.getElementById('custBoq') && !!document.getElementById('custProject') && !!document.getElementById('custInvoice')), 'filters');
  await page.evaluate(() => { document.getElementById('custInvoice').value = 'has'; document.getElementById('custInvoice').dispatchEvent(new Event('change')); }); await page.waitForTimeout(500);
  ok(await page.evaluate(() => document.querySelectorAll('#pageContent tbody tr').length === 1), 'invoice filter works');
  await page.evaluate(() => { customerFilters.invoice = ''; customerFilters.project=''; });
  await page.evaluate(() => openCustomerModal()); await page.waitForTimeout(800);
  const f = await page.evaluate(() => ({ dept: document.getElementById('cuDept').tagName, cat: [...document.getElementById('cuCategory').options].map(o => o.value).filter(Boolean).join(), order: [...document.querySelectorAll('#appModal .form-grid > *')].filter(x => x.offsetParent !== null).map(x => ((x.id==='cuContactsWrap')?'CONTACTS':(x.innerText||'').trim().split('\n')[0])).slice(-3), bg: getComputedStyle(document.getElementById('cuAddContact')).backgroundColor }));
  ok(f.dept === 'SELECT' && f.cat === 'حكومى,خاص', 'dept select + categories ' + JSON.stringify(f));
  ok(f.order[0] === 'CONTACTS' && /^ملاحظات/.test(f.order[1]), 'contacts above notes ' + f.order.join('|'));
  ok(await page.evaluate(() => { const b = document.querySelector('#appModal .form-att-block'); return !!b && /المرفقات والمستندات/.test(b.innerText) && !!b.querySelector('.btn-att-add, button'); }), 'attachments block like employee');
  ok(f.bg === 'rgb(27, 67, 50)', 'button color ' + f.bg);
  await page.selectOption('#cuDept', '__new__'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.getElementById('cuDept').tagName === 'INPUT'), 'new dept input');
  ok(errors.length === 0, 'no page errors ' + errors.slice(0,2));
  await browser.close(); summary();
})();
