// المرحلة ج: مركز المتابعة (محرك تنبيهات موحّد)
const { openApp } = require('./harness');
const { baseUser, ok, eq, summary } = require('./lib');
(async () => {
  const seed = { users: [baseUser], schemaVersion: 8, projects: [
      { id: 'pA', code: 'P1', name: 'مشروع أ', customerId: 'cA', customerName: 'شركة الأمل', status: 'التعاقد', budget: 1000 }],
    clients: { customers: [{ id: 'cA', name: 'شركة الأمل', code: 'C1', status: 'active', projects: [], contracts: [], boqs: [], workSurveys: [], collections: [],
      invoices: [{ no: 'INV-1', status: 'معتمد', date: '2020-01-01', value: 1000, project: 'مشروع أ', paid: 0 }],
      opportunities: [{ id: 'o1', title: 'فرصة', stage: 'تفاوض', nextFollowUp: '2020-01-01' }] }] } };
  const { browser, page, errors } = await openApp(seed);
  await page.evaluate(() => {
    DATA.ledger.suppliers.push({ id: 'sA', name: 'مورد الاختبار' });
    DATA.ledger.invoices.push({ id: 'iA', supplierId: 'sA', invoiceNo: 'F-77', date: '2020-01-01', totalInvoice: 500, netInvoice: 500, withheld: 0 });
    const w = DATA.warehouses; w.locations.push({ id: 'L1', name: 'مخزن 1' });
    w.items.push({ id: 'it1', name: 'أسمنت', unit: 'شيكارة', minQty: 10 });
    DATA.alertState = {};
    goToPage('dashboard', true);
  });
  await page.waitForTimeout(300);
  const info = await page.evaluate(() => { const l = collectAllAlerts(); return { srcs: [...new Set(l.map(a => a.source))], kinds: [...new Set(l.map(a => a.kind))] }; });
  ok(info.srcs.includes('ledger') && info.srcs.includes('warehouses') && info.srcs.includes('clients'), 'sources merged: ' + info.srcs);
  ok(info.kinds.includes('ledger-overdue') && info.kinds.includes('wh-min') && info.kinds.includes('cl-unpaid') && info.kinds.includes('crm-follow'), 'kinds ' + info.kinds);
  ok(await page.evaluate(() => document.body.innerText.includes('مركز المتابعة') && !!document.querySelector('.alert-center .alert-card')), 'center renders alert-card look');
  ok(await page.evaluate(() => document.body.innerText.includes('F-77') && document.body.innerText.includes('أسمنت')), 'ledger + warehouse alerts shown');
  ok(await page.evaluate(() => !!document.querySelector('.nav-badge')), 'nav badge');
  // فلتر المصدر
  await page.click('.ac-src[data-src="warehouses"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !document.querySelector('.alert-center').innerText.includes('F-77') && document.querySelector('.alert-center').innerText.includes('أسمنت')), 'source filter');
  await page.click('.ac-src[data-src=""]'); await page.waitForTimeout(200);
  // فتح تنبيه → الصفحة المرتبطة
  await page.evaluate(() => { [...document.querySelectorAll('.alert-card')].find(c => c.innerText.includes('F-77')).click(); }); await page.waitForTimeout(300);
  eq(await page.evaluate(() => currentPage), 'ledger.invoices', 'alert opens linked page');
  ok(await page.evaluate(() => invoiceFilters.overdueOnly === true), 'with filter applied');
  // تأجيل
  await page.evaluate(() => goToPage('dashboard', true)); await page.waitForTimeout(300);
  const before = await page.evaluate(() => collectAllAlerts().length);
  await page.evaluate(() => { [...document.querySelectorAll('.alert-card')].find(c => c.innerText.includes('أسمنت')).querySelector('[data-ac="done"]').click(); });
  await page.waitForTimeout(300);
  eq(await page.evaluate(() => collectAllAlerts().length), before - 1, 'done hides alert');
  ok(await page.evaluate(() => Object.keys(DATA.alertState).length === 1), 'state persisted in DATA');
  ok(errors.length === 0, 'no errors ' + JSON.stringify(errors.slice(0, 3)));
  await browser.close(); summary();
})();
