const { openApp } = require('./harness');
const { baseUser, ok, eq, summary } = require('./lib');
(async () => {
  const seed = { users: [baseUser], schemaVersion: 9, projects: [{ id: 'pA', name: 'م', status: 'التنفيذ', value: 1000 }], employees: [{ id: 'e1', name: 'س', departmentId: 'd1' }], departments: [{ id: 'd1', name: 'الإدارة' }], expenses: [{ id: 'x', project: 'م', amount: 40, date: '2026-01-01' }],
    clients: { customers: [{ id: 'cA', name: 'ع', code: 'C', projects: [], boqs: [{ id: 'b' }], workSurveys: [{ id: 'w' }], collections: [{ id: 'c1', amount: 70, date: '2026-01-01' }], contracts: [{ id: 'k', value: 500, status: 'ساري' }], invoices: [] }] } };
  const { browser, page, errors } = await openApp(seed);
  await page.evaluate(() => { DATA.ledger.suppliers.push({ id: 's', name: 'م' });
    DATA.ledger.invoices.push({ id: 'i1', supplierId: 's', invoiceNo: 'A', date: '2026-01-01', totalInvoice: 100, withheld: 5 }, { id: 'i2', supplierId: 's', invoiceNo: 'R', date: '2026-01-02', totalInvoice: 30, isReturn: true });
    DATA.ledger.payments.push({ id: 'p1', supplierId: 's', date: '2026-01-03', amount: 60 }); rerenderCurrentPage(); });
  const t = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.fc-tile')].map(e => [e.querySelector('.fc-tile-lbl').textContent, e.innerText.replace(/\s+/g, ' ')])));
  ok(t['فواتير الموردين'].includes('1'), 'invoices tile ' + t['فواتير الموردين']);
  ok(t['المرتجعات'].startsWith('↩') || t['المرتجعات'].includes('1'), 'returns count');
  ok(t['إشعارات الخصم'].includes('1'), 'discount notices');
  ok(t['الدفعات'].includes('1'), 'payments');
  ok(t['العقود'].includes('1') && t['المقايسات'].includes('1') && t['أعمال الحصر'].includes('1'), 'client tiles');
  ok(await page.evaluate(() => !document.querySelector('.fc-chips') && !!document.querySelector('.fc-tile[data-fc-dept]')), 'no chips, dept tiles');
  await page.evaluate(() => document.querySelector('.fc-tile[data-fc-dept="employees"]').click());
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => document.querySelectorAll('.fc-dept-sq').length >= 2 && document.querySelector('.fc-dept-sq').innerText.includes('الكل')), 'dept popup squares');
  await page.evaluate(() => closeModal());
  ok(await page.evaluate(() => ['مستحق للموردين','مشاريع نشطة'].every(l => [...document.querySelectorAll('.fc-tile-lbl')].some(e => e.textContent === l))), 'moved KPI tiles');
  // عرض المزيد
  await page.evaluate(() => { for (let i = 0; i < 9; i++) DATA.expenses.push({ id: 'z' + i, project: 'م', amount: 99999, date: '2026-01-01' }); DATA.alertState = {}; setExpenseApprovalLimit(1000); rerenderCurrentPage(); });
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => !!document.querySelector('.btn-alerts-more')), 'more button exists');
  await page.click('.btn-alerts-more'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.querySelectorAll('.modal .alert-card, .modal-overlay .alert-card').length > 6), 'more modal lists all');
  ok(errors.length === 0, 'no errors ' + JSON.stringify(errors.slice(0, 3)));
  await browser.close(); summary();
})();
