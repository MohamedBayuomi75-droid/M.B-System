// لوحات الموارد البشرية + إلغاء صفحة الأقسام
const { openApp } = require('./harness');
const { baseUser, ok, eq, summary } = require('./lib');
(async () => {
  const seed = { users: [baseUser], schemaVersion: 9, departments: [{ id: 'd1', name: 'الإدارة' }, { id: 'd2', name: 'الموقع' }],
    employees: [{ id: 'e1', name: 'أحمد', code: 'E1', departmentId: 'd1' }, { id: 'e2', name: 'منى', code: 'E2', departmentId: 'd1' }, { id: 'e3', name: 'سعيد', code: 'E3' }],
    workers: [{ id: 'w1', name: 'ع', code: 'W1', departmentId: 'd2' }] };
  const { browser, page, errors } = await openApp(seed);
  await page.evaluate(() => goToSection('hr')); await page.waitForTimeout(300);
  eq(await page.evaluate(() => currentPage), 'hrHome', 'HR section opens boards home');
  ok(await page.evaluate(() => document.querySelectorAll('.hrh-card').length === 9), '9 boards');
  eq(await page.evaluate(() => document.querySelectorAll('.nav-pages').length), 0, 'no top pages row in HR');
  ok(await page.evaluate(() => document.querySelector('.hrh-card[data-hrh-page="employees"]').innerText.includes('الموظفين')), 'dept chips on board');
  await page.click('.hrh-card[data-hrh-page="employees"] .hrh-top'); await page.waitForTimeout(300);
  eq(await page.evaluate(() => currentPage), 'employees', 'opens employees');
  ok(await page.evaluate(() => document.querySelectorAll('.entity-dept-board').length >= 3), 'dept boards inside employees');
  ok(await page.evaluate(() => !!document.querySelector('#hrBackHome')), 'back bar in page');
  await page.click('#hrBackHome'); await page.waitForTimeout(250);
  eq(await page.evaluate(() => currentPage), 'hrHome', 'back to boards');
  await page.click('.hrh-card[data-hrh-page="employees"] [data-hrh-dept="__core_employees__"]'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => employeeFilters.departmentId === '__core_employees__' && document.body.innerText.includes('أحمد') && document.body.innerText.includes('سعيد')), 'chip enters dept list');
  await page.evaluate(() => { currentPage = 'departments'; rerenderCurrentPage(); });
  ok(await page.evaluate(() => !!document.querySelector('.hr-home')), 'legacy departments redirects');
  for (const sec of ['clients', 'suppliers', 'warehouses', 'accounts', 'reports', 'archive']) {
    await page.evaluate((id) => goToSection(id), sec); await page.waitForTimeout(250);
    ok(await page.evaluate((id) => currentPage === 'home_' + id && document.querySelectorAll('.hrh-card').length >= 2 && !document.querySelector('.nav-pages'), sec), 'home boards ' + sec);
  }
  await page.evaluate(() => goToSection('clients')); await page.waitForTimeout(200);
  await page.click('.hrh-card[data-hrh-page="projects"] .hrh-top'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => currentPage === 'projects' && !!document.querySelector('#hrBackHome')), 'page opens with back bar');
  await page.click('#hrBackHome'); await page.waitForTimeout(200);
  eq(await page.evaluate(() => currentPage), 'home_clients', 'back to section boards');
  await page.evaluate(() => goToSection('settings')); await page.waitForTimeout(250);
  ok(await page.evaluate(() => currentPage !== 'home_settings' && !!document.querySelector('.nav-pages')), 'settings keeps pages row');
  ok(errors.length === 0, 'no errors ' + JSON.stringify(errors.slice(0, 3)));
  await browser.close(); summary();
})();
