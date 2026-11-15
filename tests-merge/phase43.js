const { openApp } = require('./harness'); const { baseUser, ok, summary } = require('./lib');
(async () => {
  const seed = { users:[baseUser], schemaVersion:9,
    supervisors:[{id:'s1',name:'مشرف',code:'S1',status:'active'}],
    workers:[{id:'w1',name:'ع1',code:'W1',status:'active',type:'company',supervisorId:'s1',dailyWage:200}],
    workerAttendance:[{id:'a1',personType:'worker',personId:'w1',date:'2026-11-05',status:'present',days:1,dayWage:200,project:'أ'},{id:'a2',personType:'worker',personId:'w1',date:'2026-11-05',status:'present',days:0.5,dayWage:200,project:'ب'},{id:'a3',personType:'worker',personId:'w1',date:'2026-11-06',status:'present',days:1,dayWage:200,project:'أ'}],
    employees:[{id:'e1',name:'م',code:'E1',status:'active',position:'مهندس'},{id:'e2',name:'ن',code:'E2',status:'active',position:'محاسب'},{id:'e3',name:'ص',code:'E3',status:'active',position:'مهندس'}],
    leaves:[{id:'lv1',personKind:'employee',personId:'e1',employeeId:'e1',type:'annual',from:'2026-11-01',to:'2026-11-03',days:3,status:'approved',reason:'ت'.repeat(200)}] };
  const { browser, page } = await openApp(seed);
  await page.evaluate(() => { workerAttFilters.dailiesTab='workers'; workerAttFilters.dailiesDept=''; workerAttFilters.dFrom='2026-11-01'; workerAttFilters.dTo='2026-11-30'; goToPage('workerAttendance'); rerenderCurrentPage(); }); await page.waitForTimeout(500);
  const cards = await page.evaluate(() => [...document.querySelectorAll('#pageContent .sc-card')].map(c => c.innerText.replace(/\s+/g, ' ')).join(' | '));
  ok(/أيام في أكثر من مشروع/.test(cards) && /(٠\.٥|0\.5|½)/.test(cards.split('أيام في أكثر')[0].slice(-12) + cards.split('أيام في أكثر')[1]), 'multi-project card = extra-site days (0.5): ' + cards);
  const ov = await page.evaluate(() => { let h = ''; window.printHtml = x => { h = x; }; printLeaveForm('lv1'); const d = document.createElement('div'); d.style.cssText = 'position:absolute;left:0;top:0;width:560px'; d.innerHTML = h; document.body.appendChild(d); const f = d.querySelector('.lvp'); const v = d.querySelector('.lvp-wide .lvp-v'); const r = f.getBoundingClientRect(), rv = v.getBoundingClientRect(); const res = rv.right <= r.right + 1 && rv.left >= r.left - 1; d.remove(); return res; });
  ok(ov, 'long leave reason stays inside permit frame');
  await page.evaluate(() => { window.__supDetailId = 's1'; goToPage('supervisors'); rerenderCurrentPage(); }); await page.waitForTimeout(500);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'supervisor statement does not overflow page horizontally');
  await browser.close(); summary();
})();
