const { openApp } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const seed = { users: [baseUser], schemaVersion: 7, projects: [], clients: { customers: [{ id: 'cA', name: 'أمل', code: 'C1', projects: [], guarantees: [],
    workSurveys: [{ id: 'WS-1', project: 'م', items: [{ isHeader: true, name: 'قسم' }, { code: '1', name: 'خرسانة', qty: 12, price: 100 }, { code: '2', name: 'حديد', qty: 5, price: 50 }, { code: '9', name: 'بند حصر فقط', qty: 1, price: 10 }] }],
    boqs: [{ id: 'B1', title: 'ب', items: [{ code: '1', name: 'خرسانة', qty: 10, price: 100 }, { code: '2', name: 'حديد', qty: 5, price: 50 }, { code: '7', name: 'نجارة', qty: 3, price: 20 }] }],
    contracts: [{ id: 'CT-1', title: 'ع', value: 1310, boqId: 'B1', workSurveyIds: ['WS-1'] }],
    invoices: [{ no: 'INV-1', contractId: 'CT-1', value: 500, paid: 300 }, { no: 'INV-X', contractId: 'CT-9', value: 99 }],
    collections: [{ id: 'R1', invoiceNo: 'INV-1', amount: 300 }, { id: 'R2', invoiceNo: 'INV-X', amount: 99 }] }] } };
  const { browser, page, errors } = await openApp(seed);
  const w = (ms = 300) => page.waitForTimeout(ms);
  await page.evaluate(() => goToPage('clients.comparison')); await w();
  eq(await page.evaluate(() => document.querySelectorAll('#cmpCust').length), 1, 'page renders');
  await page.evaluate(() => { const s = document.getElementById('cmpContract'); s.value = 'CT-1'; s.dispatchEvent(new Event('change')); }); await w();
  eq(await page.evaluate(() => [cmpState.boqId, cmpState.surveyId]), ['B1', 'WS-1'], 'choosing contract auto-links its BOQ and survey');
  const rows = await page.evaluate(() => { const r = clCmpResolve(); const x = clCompareItems(r.survey.items, r.boq.items); return x.rows.map(a => [a.code, a.state, a.dQty, a.dVal]); });
  eq(rows, [['1', 'حصر أكبر', 2, 200], ['2', 'مطابق', 0, 0], ['7', 'مقايسة بدون حصر', -3, -60], ['9', 'حصر بدون مقايسة', 1, 10]], 'item-by-item states and deltas (header ignored)');
  eq(await page.evaluate(() => { const r = clCmpResolve(); const x = clCompareItems(r.survey.items, r.boq.items); return [x.sum.sVal, x.sum.bVal, x.sum.dVal]; }), [1460, 1310, 150], 'totals');
  const ch = await page.evaluate(() => { const c = clCmpChain(clCmpResolve()); return [c.invs.length, c.colls.length, c.net, c.paid, c.coll]; });
  eq(ch, [1, 1, 500, 300, 300], 'chain: only this contract\'s invoices & their collections');
  ok(await page.evaluate(() => document.body.textContent.includes('حصر بدون مقايسة')), 'rendered states visible');
  await page.evaluate(() => { const s = document.getElementById('cmpSurvey'); s.value = ''; s.dispatchEvent(new Event('change')); }); await w();
  eq(await page.evaluate(() => document.querySelectorAll('.data-table tbody tr').length), 3, 'without survey: BOQ-only rows');
  summary(errors); await browser.close();
})();
