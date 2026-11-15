const { openApp } = require('./harness'); const { baseUser, ok, summary } = require('./lib');
(async () => {
  const seed = { users:[baseUser], schemaVersion:9,
    employees:[{id:'e1',name:'أ',code:'E1',status:'active'}],
    workers:[{id:'w1',name:'ع1',code:'W1',status:'active',type:'company'}],
    leaves:[{id:'lv1',personKind:'employee',personId:'e1',employeeId:'e1',type:'annual',from:'2026-11-01',to:'2026-11-03',days:3,status:'approved',reason:'سفر'}] };
  const { browser, page } = await openApp(seed);
  await page.evaluate(() => { goToPage('leaves'); rerenderCurrentPage(); }); await page.waitForTimeout(500);
  const r = await page.evaluate(() => { const ids=['lvSearch','lvFilterKind','lvFilterType','lvFilterStatus','lvFilterFrom','lvFilterTo']; const rs=ids.map(i=>document.getElementById(i).getBoundingClientRect()); const f=document.getElementById('lvFilterFrom').getBoundingClientRect(); const all=[...rs,f]; return { sameTop: all.every(x=>Math.abs(x.top-all[0].top)<4), sameH: all.every(x=>Math.abs(x.height-all[0].height)<3) }; });
  ok(r.sameTop, 'leave filters on one row'); ok(r.sameH, 'leave filters same height');
  const html = await page.evaluate(() => { let h=''; window.printHtml = x => { h = x; }; printLeaveForm('lv1'); return h; });
  ok(/lvp-period/.test(html) && /مقدم الطلب/.test(html) && /lvp-signs/.test(html) && /LV-/.test(html), 'leave permit rich layout');
  await page.evaluate(() => { workerAttFilters.dailiesTab='workers'; workerAttFilters.dailiesDept=''; workerAttFilters.dFrom='2026-11-10'; workerAttFilters.dTo='2026-11-25'; goToPage('workerAttendance'); rerenderCurrentPage(); }); await page.waitForTimeout(500);
  ok(await page.evaluate(() => document.querySelectorAll('.watt-cell').length === 16), 'dailies 16 day cells for 1 worker');
  ok(await page.evaluate(() => { const w=document.querySelector('.dly-filters').getBoundingClientRect(); const t=document.querySelector('.watt-grid'); return t.getBoundingClientRect().width>0; }), 'dailies grid renders');
  await page.evaluate(() => document.querySelector('.watt-cell.empty').click()); await page.waitForTimeout(400);
  ok(await page.evaluate(() => /2026-11-10/.test((document.getElementById('wattDate')||{}).value||'')), 'cell click passes the exact date');
  await browser.close(); summary();
})();
