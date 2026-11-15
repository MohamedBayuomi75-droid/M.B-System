// إزالة أزرار + تعدد المواقع في اليوم + فلاتر اليوميات
const { openApp } = require('./harness');
const { baseUser, ok, summary } = require('./lib');
(async () => {
  const ym = new Date().toISOString().slice(0, 8);
  const seed = { users: [baseUser], schemaVersion: 9, departments: [],
    supervisors: [{ id: 's1', name: 'مشرف', code: 'S1', dailyWage: 300 }],
    workers: [{ id: 'w1', name: 'عامل', code: 'W1', dailyWage: 200, supervisorId: 's1', workerType: 'permanent' }],
    equipment: [{ id: 'q1', name: 'حفار', code: 'Q1' }],
    employees: [{ id: 'e1', name: 'أحمد', code: 'E1', salary: 5000 }],
    workerAttendance: [
      { id: 'a1', personType: 'worker', personId: 'w1', workerId: 'w1', supervisorId: 's1', date: ym + '04', status: 'present', days: 0.5, dayWage: 200, project: 'مشروع أ' },
      { id: 'a2', personType: 'worker', personId: 'w1', workerId: 'w1', supervisorId: 's1', date: ym + '04', status: 'present', days: 0.5, dayWage: 200, project: 'مشروع ب' }] };
  const { browser, page, errors } = await openApp(seed);
  const has = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);
  await page.evaluate(() => { equipmentFilters.detailId = 'q1'; goToPage('equipment'); rerenderCurrentPage(); }); await page.waitForTimeout(400);
  ok(!(await has('#btnEqDetailDaily, #btnEqDetailExp, #btnEqDetailStmt')) && await has('#btnEqDetailEdit'), 'equipment card buttons removed');
  ok(await page.evaluate(() => { const t = document.querySelector('#personFin').innerText; return !t.includes('بدلات ومكافآت') && !t.includes('الخصومات والجزاءات') && !document.getElementById('btnPfPen'); }), 'equipment finance trimmed');
  await page.evaluate(() => { equipmentFilters.detailId = ''; equipmentFilters._boardLevel = 'list'; rerenderCurrentPage(); }); await page.waitForTimeout(300);
  ok(!(await has('#btnEqFuel, #btnEqFuel2')), 'no fuel button on equipment page');
  await page.evaluate(() => { window.__expTab = 'equipment'; window.__expSection = ''; goToPage('expenses'); rerenderCurrentPage(); }); await page.waitForTimeout(400);
  ok(await has('#btnExpFuel'), 'fuel button in equipment expenses');
  await page.evaluate(() => { employeeFilters._boardLevel = 'boards'; goToPage('employees'); rerenderCurrentPage(); }); await page.waitForTimeout(300);
  ok(!(await has('#btnAddEmployee')) && !(await has('.btn-add-cat')) && !(await has('.btn-rename-cat')) && !(await has('.btn-del-cat')), 'dept boards: no add/rename/delete dept buttons');
  await page.evaluate(() => openPersonDetailPage('employee', 'e1')); await page.waitForTimeout(300);
  ok(!(await has('#btnPersonDetDoc')), 'no attach button in person header');
  await page.evaluate(() => { workerAttFilters.dailiesTab = 'workers'; workerAttFilters.dailiesDept = ''; workerAttFilters.year = new Date().getFullYear(); workerAttFilters.month = new Date().getMonth() + 1; goToPage('workerAttendance'); rerenderCurrentPage(); }); await page.waitForTimeout(400);
  ok(!(await has('#btnWattListView')), 'no list-view button');
  ok(await has('#wattFrom') && await has('#wattTo') && !(await has('#wattMP')), 'from/to date filters replace month picker');
  ok(await has('#wattFilterStatus') && await has('#wattClearFilters'), 'advanced filters present');
  ok(await page.evaluate(() => { const c = document.querySelector('.watt-cell.filled[data-multi="1"]'); return !!c && /مواقع/.test(c.title); }), 'multi-site cell marked');
  await page.evaluate(() => { openWorkerAttModal(null, null, { kind: 'worker', id: 'w1', date: new Date().toISOString().slice(0, 8) + '04' }); }); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const b = document.getElementById('wattSameDay'); return b && b.style.display !== 'none' && /مشروع أ/.test(b.innerText); }), 'same-day info in modal');
  ok(await has('#btnSaveWattMore'), 'save + another site button');
  await page.evaluate(() => closeModal());
  await page.evaluate(() => { window.__supStmtFrom = ''; window.__supStmtTo = ''; });
  ok(await page.evaluate(() => { const h = supervisorMultiSiteNoticeHtml('s1', '', '', true); return /أكثر من موقع/.test(h) && /مشروع أ/.test(h) && /مشروع ب/.test(h); }), 'supervisor statement multi-site notice');
  await page.evaluate(() => { window.__p = ''; window.printHtml = (h) => { window.__p = h; }; printDaysStatement('worker', 'w1'); });
  ok(await page.evaluate(() => /أكثر من موقع/.test(window.__p)), 'days statement flags multi-site');
  ok(errors.length === 0, 'no errors ' + errors.join('|'));
  await browser.close(); summary();
})();
