// المرحلة د: التكلفة الشاملة (موردين + مخازن) بدون حساب مزدوج
const { openApp } = require('./harness');
const { baseUser, ok, eq, summary } = require('./lib');
(async () => {
  const seed = { users: [baseUser], schemaVersion: 8, projects: [{ id: 'pA', code: 'P1', name: 'مشروع أ', status: 'التنفيذ', budget: 5000, customerId: 'cA' }],
    expenses: [{ id: 'e1', project: 'مشروع أ', amount: 300, date: '2026-01-05', personKind: 'worker', personId: 'x' }],
    clients: { customers: [{ id: 'cA', name: 'شركة الأمل', code: 'C1', projects: [], contracts: [], boqs: [], workSurveys: [], collections: [], invoices: [{ no: 'INV-1', status: 'معتمد', date: '2026-01-01', value: 1000, project: 'مشروع أ', paid: 700 }] }] } };
  const { browser, page, errors } = await openApp(seed);
  const r = await page.evaluate(() => {
    DATA.ledger.suppliers.push({ id: 's1', name: 'مورد' });
    // فاتورة مباشرة على المشروع (تُحسب وقت الفاتورة): 1000
    DATA.ledger.invoices.push({ id: 'i1', supplierId: 's1', invoiceNo: 'A1', date: '2026-01-10', totalInvoice: 1000, netInvoice: 950, withheld: 50, project: 'مشروع أ' });
    // مرتجع 200
    DATA.ledger.invoices.push({ id: 'i2', supplierId: 's1', invoiceNo: 'R1', date: '2026-01-12', totalInvoice: 200, netInvoice: 200, withheld: 0, project: 'مشروع أ', isReturn: true });
    // فاتورة داخلة المخزن (لا تُحسب عند الفاتورة) 2000
    DATA.ledger.invoices.push({ id: 'i3', supplierId: 's1', invoiceNo: 'A2', date: '2026-01-11', totalInvoice: 2000, netInvoice: 2000, withheld: 0, project: 'مشروع أ' });
    const w = DATA.warehouses; w.locations.push({ id: 'L1', name: 'م1' }); w.items.push({ id: 'it1', name: 'حديد', unit: 'طن', avgCost: 0 });
    whAddMovement({ id: 'M1', type: 'in', itemId: 'it1', qty: 10, locationId: 'L1', date: '2026-01-11', unitCost: 200, supplierInvoiceId: 'i3' });
    whAddMovement({ id: 'M2', type: 'out', itemId: 'it1', qty: 4, locationId: 'L1', date: '2026-01-15', project: 'مشروع أ' });
    const c = projectCostSummary('مشروع أ');
    const lines = projectSupplyCostLines('مشروع أ');
    // تغيّر المتوسط بعد الصرف ما يغيّرش التكلفة المثبّتة
    whAddMovement({ id: 'M3', type: 'in', itemId: 'it1', qty: 10, locationId: 'L1', date: '2026-01-20', unitCost: 400 });
    const c2 = projectCostSummary('مشروع أ');
    const period = projectCostSummary('مشروع أ', '2026-01-14', '2026-01-31');
    return { c, c2, lines, period, out: whMovements().find(m => m.id === 'M2').unitCost };
  });
  eq(r.c.suppliers, 800, 'suppliers = 1000 − 200 مرتجع (فاتورة المخزن مستبعدة)');
  eq(r.out, 200, 'unitCost snapshot at issue');
  eq(r.c.warehouse, 800, 'warehouse = 4 × 200');
  eq(r.c.expenses, 300, 'expenses still counted');
  eq(r.c.total, 800 + 800 + 300, 'total includes both');
  eq(r.c2.warehouse, 800, 'later avg change does not alter issued cost');
  eq(r.period.suppliers, 0, 'period filter on suppliers');
  eq(r.period.warehouse, 800, 'period filter on warehouse');
  // الصفحات
  await page.evaluate(() => { window.__costTab = '__all'; goToPage('costs', true); window.__costTab = '__all'; rerenderCurrentPage(); });
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => !!document.querySelector('.comp-costs') && document.body.innerText.includes('مشروع أ')), 'comprehensive costs page (costs) renders');
  ok(await page.evaluate(() => document.querySelector('.comp-costs tfoot').innerText.includes(fmtMoney(1900))), 'footer total');
  await page.evaluate(() => { window.__expTab = '__all'; goToPage('expenses', true); window.__expTab = '__all'; rerenderCurrentPage(); });
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => !!document.querySelector('.comp-costs[data-owner="expenses"]')), 'comprehensive page (expenses) renders');
  await page.evaluate(() => { window.__expTab = ''; rerenderCurrentPage(); }); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !!document.querySelector('.exp-kind-board[data-exp-tab="__all"]')), 'board card present');
  // كشف حساب المشروع
  await page.evaluate(() => { const p = DATA.projects[0]; goToPage('projects'); projectFilters.detailId = p.id; rerenderCurrentPage(); }); await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.body.innerText.includes('جدول الموردين') && document.body.innerText.includes('جدول المخازن')), 'statement shows supplier + warehouse');
  eq(await page.evaluate(() => projectStatement('مشروع أ').totals.total), 800 + 800 + 300, 'statement total equals summary');
  ok(errors.length === 0, 'no errors ' + JSON.stringify(errors.slice(0, 3)));
  await browser.close(); summary();
})();
