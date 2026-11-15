const { openApp } = require('./harness'); const { baseUser, ok, summary } = require('./lib');
(async () => {
  const d = new Date().toISOString().slice(0,8);
  const { browser, page, errors } = await openApp({ users:[baseUser], schemaVersion:9,
    workers:[{id:'w1',name:'ع1',code:'W1',status:'active',type:'temporary',workerType:'temporary',dailyWage:200,supervisorId:'s1'},{id:'w2',name:'ع2',code:'W2',status:'active',type:'temporary',workerType:'temporary',dailyWage:300,supervisorId:'s1'}],
    supervisors:[{id:'s1',name:'ش',code:'S1',status:'active',dailyWage:200}],
    drivers:[{id:'d1',name:'سائق',code:'D1',status:'active',salary:6000}],
    equipment:[{id:'q1',code:'EQ-1',typeLabel:'حفار',model:'M1',driverName:'سائق',purchasePrice:5000,status:'working'}],
    workerAttendance:[{id:'a1',personType:'worker',workerId:'w1',personId:'w1',date:d+'05',status:'present',days:1,dayWage:200},{id:'a2',personType:'worker',workerId:'w2',personId:'w2',date:d+'05',status:'present',days:1,dayWage:300}] });
  const open = async fn => { await page.evaluate(fn); await page.waitForTimeout(700); };
  // hover on even and odd rows of dailies grid
  await open(() => { workerAttFilters.dailiesTab='workers'; workerAttFilters.dailiesDept=''; goToPage('workerAttendance'); rerenderCurrentPage(); });
  const colors = [];
  for(const n of [0,1]){
    const row = page.locator('.watt-grid tbody tr').nth(n); await row.hover(); await page.waitForTimeout(150);
    colors.push(await row.locator('td').first().evaluate(e => getComputedStyle(e).backgroundColor));
  }
  ok(colors[0] === colors[1] && colors[0] !== 'rgba(0, 0, 0, 0)', 'hover color same on odd/even rows ' + colors);
  // equipment table
  await open(() => { equipmentFilters._boardLevel='list'; equipmentFilters.departmentId=''; goToPage('equipment'); rerenderCurrentPage(); });
  const th = await page.evaluate(() => [...document.querySelectorAll('#pageContent table thead th')].map(x => x.innerText.trim()));
  ok(th.indexOf('اسم السائق') === th.indexOf('الموديل') + 1 && th.indexOf('سعر الشراء') === th.indexOf('اسم السائق') + 1, 'eq cols ' + th.join('|'));
  ok(th.indexOf('تاريخ انتهاء رخصة السيارة') > -1, 'vehicle license header');
  ok(await page.evaluate(() => !/آخر يوميات التشغيل/.test(document.getElementById('pageContent').innerText)), 'recent dailies table removed');
  // supervisor statement cards react to filters
  await open(() => { window.__supStmtShow=''; window.__supDetailId='s1'; goToPage('supervisors'); rerenderCurrentPage(); });
  const cards = () => page.evaluate(() => [...document.querySelectorAll('#supStmtCards .stat-card')].map(c => c.innerText.replace(/\s+/g,' ').trim()));
  const all = await cards();
  await page.selectOption('#supStmtShow', 'workers'); await page.waitForTimeout(700);
  const wk = await cards();
  ok(JSON.stringify(all) !== JSON.stringify(wk) && /مستحق العمال/.test(wk.join('|')), 'cards change with show filter ' + wk.join('|'));
  ok(await page.evaluate(() => /حساب العمال/.test(document.getElementById('pageContent').innerText) && !/ملخص الحساب/.test(document.getElementById('pageContent').innerText)), 'only workers section');
  await page.selectOption('#supStmtShow', 'expenses'); await page.waitForTimeout(700);
  ok(/إجمالي المصاريف/.test((await cards()).join('|')) && await page.evaluate(() => !/حساب العمال/.test(document.getElementById('pageContent').innerText)), 'expenses view');
  await page.fill('#supStmtFrom', d+'20'); await page.dispatchEvent('#supStmtFrom', 'change'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => window.__supStmtFrom === new Date().toISOString().slice(0,8)+'20'), 'date applies on change');
  await page.selectOption('#supStmtShow', ''); await page.waitForTimeout(700);
  ok((await cards()).length === 7, 'all => 7 cards');
  ok(errors.length === 0, 'no page errors ' + errors.slice(0,2));
  await browser.close(); summary();
})();
