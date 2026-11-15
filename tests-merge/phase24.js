// كشف أيام للمؤقتين + جدول يوميات المعدات + ترقيم 1-20
const { openApp } = require('./harness');
const { baseUser, ok, summary } = require('./lib');
(async () => {
  const t = new Date(); const ym = t.toISOString().slice(0, 8);
  const people = Array.from({ length: 25 }, (_, i) => ({ id: 'w' + i, name: 'عامل ' + (i + 10), code: 'W' + i, workerType: 'temporary', dailyRate: 200 }));
  const equipment = Array.from({ length: 23 }, (_, i) => ({ id: 'q' + i, name: 'معدة ' + (i + 10), code: 'Q' + i }));
  const seed = { users: [baseUser], schemaVersion: 9, departments: [], workers: people, equipment,
    workerAttendance: [{ id: 'a1', workerId: 'w0', date: ym + '02', status: 'present', project: 'مشروع النخيل', dailyRate: 200 }],
    equipmentDaily: [{ id: 'd1', equipmentId: 'q0', date: ym + '03', hours: 8, project: 'مشروع النخيل' }] };
  const { browser, page, errors } = await openApp(seed);
  await page.evaluate(() => { window.__p = ''; window.printHtml = (h) => { window.__p = h; }; });
  await page.evaluate(() => printWorkerStatement('w0'));
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => /مشروع النخيل/.test(window.__p) && /اليوم/.test(window.__p) && /الموقع/.test(window.__p)), 'temp worker days statement');
  await page.evaluate(() => { workerAttFilters.dailiesTab = 'workers'; workerAttFilters.dailiesDept = ''; goToPage('workerAttendance'); rerenderCurrentPage(); });
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.querySelectorAll('.watt-grid tbody tr').length <= 20), 'people rows <= 20');
  ok(await page.evaluate(() => !!document.querySelector('[data-pager="wattPeople"]')), 'people pager');
  await page.evaluate(() => { workerAttFilters.dailiesTab = 'equipment'; workerAttFilters.dailiesDept = ''; rerenderCurrentPage(); });
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const r = document.querySelectorAll('.watt-grid tbody tr'); return r.length === 20; }), 'equipment 20 rows');
  ok(await page.evaluate(() => !!document.querySelector('[data-pager="wattEquip"]') && /النوع/.test(document.querySelector('.watt-grid thead').innerText)), 'equipment pager + type col');
  ok(errors.length === 0, 'no errors ' + errors.join('|'));
  await browser.close(); summary();
})();
