const { openApp } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  // schemaVersion 7 data with the OLD shape: paid already mixes manual + collections
  const seed = { users: [baseUser], schemaVersion: 7, projects: [], clients: { customers: [{ id: 'cA', name: 'أمل', code: 'C1', projects: [], boqs: [], workSurveys: [], guarantees: [], contracts: [],
    invoices: [{ no: 'INV-1', value: 1000, paid: 700, date: '2026-01-10' }, { no: 'INV-2', value: 500, paid: 100, date: '2026-02-01' }, { no: 'INV-3', value: 300, paid: 0, date: '2026-03-01' }],
    collections: [{ id: 'R1', invoiceNo: 'INV-1', amount: 400, date: '2026-01-20' }, { id: 'R2', invoiceNo: 'INV-2', amount: 100, date: '2026-02-10' }, { id: 'R3', amount: 50, date: '2026-02-11' }] }] } };
  const { browser, page, errors } = await openApp(seed);
  const w = (ms = 300) => page.waitForTimeout(ms);
  const inv = () => page.evaluate(() => clCustomerById('cA').invoices.map(i => [i.no, i.paid, i.paidManual]));
  console.log('[1] migration preserves totals and separates manual vs collections');
  eq(await page.evaluate(() => DATA.schemaVersion), 9, 'schema 9');
  eq(await inv(), [['INV-1', 700, 300], ['INV-2', 100, 0], ['INV-3', 0, 0]], 'paid kept; manual = paid − linked collections');
  console.log('[2] ledger = invoices − (collections + manual), no double count');
  const led = await page.evaluate(() => { const l = clBuildCustomerLedger(clCustomerById('cA'), '', ''); return [l.periodDebit, l.periodCredit, l.closing]; });
  eq(led, [1800, 400 + 100 + 50 + 300, 950], 'ledger totals (debit 1800; credits = 3 collections 550 + manual 300)');
  console.log('[3] collection save/edit/delete keep paid consistent');
  await page.evaluate(() => openCollectionModal()); await w(300);
  await page.evaluate(() => { document.getElementById('coAmt').value = '200'; document.getElementById('coInv').value = 'INV-3'; });
  await page.click('#btnSaveColl'); await w(400);
  eq((await inv())[2], ['INV-3', 200, 0], 'new collection raises paid once');
  await page.evaluate(() => { const r = clCustomerById('cA').collections.find(x => x.amount === 200); openCollectionModal('cA::' + r.id); }); await w(300);
  await page.evaluate(() => { document.getElementById('coAmt').value = '250'; });
  await page.click('#btnSaveColl'); await w(400);
  eq((await inv())[2], ['INV-3', 250, 0], 'editing amount replaces (not adds)');
  await page.evaluate(() => { const r = clCustomerById('cA').collections.find(x => x.amount === 250); openCollectionModal('cA::' + r.id); }); await w(300);
  await page.evaluate(() => { document.getElementById('coInv').value = 'INV-2'; });
  await page.click('#btnSaveColl'); await w(400);
  eq(await inv(), [['INV-1', 700, 300], ['INV-2', 350, 0], ['INV-3', 0, 0]], 're-linking to another invoice moves the amount');
  await page.evaluate(() => goToPage('clients.collections')); await w();
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('.btn-del-co')).find(x => x.getAttribute('data-key').endsWith(clCustomerById('cA').collections.find(r => r.amount === 250).id)); b.click(); });
  await page.waitForSelector('#appConfirmModal'); await page.click('#appConfirmModal button[data-c="1"]'); await w(500);
  eq(await inv(), [['INV-1', 700, 300], ['INV-2', 100, 0], ['INV-3', 0, 0]], 'delete reverses exactly that amount');
  console.log('[4] editing the invoice itself does not wipe collections-derived paid');
  await page.evaluate(() => openClientInvoiceModal('cA::INV-1')); await w(300);
  eq(await page.evaluate(() => document.getElementById('ciPaid').value), '300', 'modal shows manual part only (700 − 400 collected)');
  await page.evaluate(() => { document.getElementById('ciNo').value = 'INV-1B'; });
  await page.click('#btnSaveClInv'); await w(400);
  eq((await inv())[0], ['INV-1B', 700, 300], 'rename keeps paid');
  eq(await page.evaluate(() => clCustomerById('cA').collections.find(r => r.id === 'R1').invoiceNo), 'INV-1B', 'linked collection follows the new number');
  await page.evaluate(() => openClientInvoiceModal('cA::INV-1B')); await w(300);
  await page.evaluate(() => { document.getElementById('ciPaid').value = '0'; }); await page.click('#btnSaveClInv'); await w(400);
  eq((await inv())[0], ['INV-1B', 400, 0], 'clearing manual leaves exactly the collections');
  summary(errors); await browser.close();
})();
