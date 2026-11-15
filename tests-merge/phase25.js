// يوميات المعدة المطورة + كشف أيام المعدة
const { openApp } = require('./harness');
const { baseUser, ok, summary } = require('./lib');
(async () => {
  const ym = new Date().toISOString().slice(0, 8);
  const seed = { users: [baseUser], schemaVersion: 9, departments: [],
    equipment: [{ id: 'q1', name: 'حفار', code: 'Q1', hourlyCost: 100, fuelPrice: 10 }],
    equipmentDaily: Array.from({ length: 22 }, (_, i) => ({ id: 'd' + i, equipmentId: 'q1', date: ym + String(i + 1).padStart(2, '0'), hours: 8, fuelLiters: 5, project: i < 3 ? 'مشروع النخيل' : 'مشروع الورد' })),
    fuelLogs: [{ id: 'f1', equipmentId: 'q1', date: ym + '02', liters: 50, cost: 500 }],
    expenses: [{ id: 'x1', personId: 'q1', personKind: 'equipment', amount: 300, date: ym + '05' }] };
  const { browser, page, errors } = await openApp(seed);
  await page.evaluate(() => { window.__p = ''; window.printHtml = (h) => { window.__p = h; }; equipmentFilters.detailId = 'q1'; goToPage('equipment'); rerenderCurrentPage(); });
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => !!document.querySelector('.eq-dailies') && document.querySelectorAll('.eq-dailies .pf-tile').length === 5), 'dailies tiles');
  ok(await page.evaluate(() => document.querySelectorAll('.eq-dailies-table tbody tr').length === 20 && !!document.querySelector('[data-pager="eqDetDailies"]')), 'dailies paginated 20');
  ok(await page.evaluate(() => /النخيل/.test(document.querySelector('.eq-dailies').innerText) && /اليوم/.test(document.querySelector('.eq-dailies-table thead').innerText)), 'weekday + project');
  await page.evaluate(() => { document.querySelector('.pf-per[data-per="all"]').click(); }); await page.waitForTimeout(250);
  await page.click('#btnPfPrint'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const t = window.__p; return /كشف أيام/.test(t) && /مشروع النخيل/.test(t) && /صرف الوقود/.test(t) && /مصاريف المعدة/.test(t) && /المتبقي/.test(t) && /عدد أيام التشغيل/.test(t); }), 'equipment days statement');
  ok(errors.length === 0, 'no errors ' + errors.join('|'));
  await browser.close(); summary();
})();
