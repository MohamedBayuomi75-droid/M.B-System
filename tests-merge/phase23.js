// صفحات عرض الأشخاص والمعدات: قسم مالي + مستندات + أزرار رجوع
const { openApp } = require('./harness');
const { baseUser, ok, eq, summary } = require('./lib');
(async () => {
  const seed = { users: [baseUser], schemaVersion: 9, departments: [{ id: 'd1', name: 'الإدارة' }],
    employees: [{ id: 'e1', name: 'أحمد', code: 'E1', departmentId: 'd1', salary: 5000, hireDate: '2020-01-01', idCardExpiry: '2020-01-01' }],
    equipment: [{ id: 'q1', name: 'حفار', code: 'Q1' }],
    expenses: [{ id: 'x1', personId: 'e1', personKind: 'employee', amount: 300, date: new Date().toISOString().slice(0, 10) }],
    workerPayments: [{ id: 'p1', personType: 'employee', personId: 'e1', type: 'pay', amount: 2000, date: new Date().toISOString().slice(0, 10) }] };
  const { browser, page, errors } = await openApp(seed);
  await page.evaluate(() => openPersonDetailPage('employee', 'e1')); await page.waitForTimeout(400);
  ok(await page.evaluate(() => !!document.querySelector('.pd-info') && !!document.querySelector('.pd-grid2 .person-notes-card') && !!document.querySelector('.pd-grid2 .pd-docs')), 'info + notes/docs side by side');
  ok(await page.evaluate(() => { const t = document.querySelector('#personFin').innerText; return t.includes('حالة استلام القبض') && t.includes('استلم جزءاً') && t.includes('المصاريف') && t.includes('التكاليف'); }), 'finance + receipt status partial');
  await page.evaluate(() => { document.querySelector('.pf-per[data-per="all"]').click(); }); await page.waitForTimeout(250);
  ok(await page.evaluate(() => document.querySelectorAll('.pf-tile').length === 7), 'finance tiles');
  await page.waitForTimeout(150);
  const bg = await page.evaluate(() => getComputedStyle(document.getElementById('btnPersonDetBack')).backgroundColor);
  ok(bg !== 'rgb(255, 255, 255)', 'back button not white ' + bg);
  const w = await page.evaluate(() => { openEmployeeModal(); return new Promise(r => setTimeout(() => r({ w: document.querySelector('.modal').getBoundingClientRect().width, cols: getComputedStyle(document.querySelector('.modal .form-grid')).gridTemplateColumns.split(' ').length }), 200)); });
  ok(w.w > 900 && w.cols === 3, 'modal wide + 3 cols ' + JSON.stringify(w));
  await page.evaluate(() => { closeModal(); equipmentFilters.detailId = 'q1'; goToPage('equipment'); rerenderCurrentPage(); }); await page.waitForTimeout(400);
  ok(await page.evaluate(() => !!document.querySelector('#personFin') && !!document.querySelector('.pd-docs')), 'equipment finance + docs');
  await page.evaluate(() => { window.__printed = ''; window.print = () => { window.__printed = document.getElementById('printArea').innerText; }; equipmentFilters.detailId = ''; openPersonDetailPage('employee', 'e1'); }); await page.waitForTimeout(300);
  await page.fill('#pfFrom', '2020-01-01'); await page.fill('#pfTo', '2099-12-31'); await page.click('#btnPfApply'); await page.waitForTimeout(250);
  ok(await page.evaluate(() => document.querySelector('.pf-range').classList.contains('is-on') && document.querySelector('.pf-head').innerText.includes('من')), 'custom range applied');
  await page.click('#btnPfPrint'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => { const t = (document.getElementById('printArea') || {}).innerText || ''; return t.includes('أحمد') && t.includes('الملخص المالي') && t.includes('المتبقي'); }), 'statement printed for person');
  await page.evaluate(() => { equipmentFilters.detailId = 'q1'; goToPage('equipment'); rerenderCurrentPage(); }); await page.waitForTimeout(400);
  ok(await page.evaluate(() => !!document.querySelector('.pd-info .pd-avatar') && document.querySelectorAll('.pd-info .pd-col').length === 3), 'equipment info card styled');
  await page.click('#btnPfPrint'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => ((document.getElementById('printArea') || {}).innerText || '').includes('حفار')), 'statement printed for equipment');
  ok(errors.length === 0, 'no errors ' + JSON.stringify(errors.slice(0, 3)));
  await browser.close(); summary();
})();
