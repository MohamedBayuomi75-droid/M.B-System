const { openApp } = require('./harness');
const { baseUser, summary, ok } = require('./lib');
(async () => {
  const { browser, page, errors } = await openApp({ users: [baseUser], schemaVersion: 8, projects: [{ id: 'p1', code: 'P1', name: 'م', customerId: 'cA', status: 'التنفيذ والمتابعة' }], clients: { customers: [{ id: 'cA', name: 'أمل', code: 'C1', projects: [], boqs: [], workSurveys: [], collections: [], guarantees: [], invoices: [], contracts: [] }] } });
  const pages = await page.evaluate(() => HR_PAGES.filter(p => /^(clients|tasks|general|projects)/.test(p)));
  for (const p of pages) { await page.evaluate((p) => goToPage(p), p); await page.waitForTimeout(150); const len = await page.evaluate(() => (document.querySelector('.page') || document.body).innerHTML.length); ok(len > 200, 'renders ' + p, len); }
  await page.evaluate(() => { customerFilters.detailId = 'cA'; goToPage('clients.customers'); }); await page.waitForTimeout(200);
  for (const [fn, sel] of [['openCustomerModal()', '#btnSaveCustomer'], ['openCollectionModal()', '#btnSaveColl'], ['openWorkSurveyModal()', '#btnSaveSurvey']]) { await page.evaluate((f) => { eval(f); }, fn); await page.waitForTimeout(250); ok(await page.evaluate((s) => !!document.querySelector(s), sel), fn + ' opens'); await page.evaluate(() => closeModal()); }
  summary(errors); await browser.close();
})();
