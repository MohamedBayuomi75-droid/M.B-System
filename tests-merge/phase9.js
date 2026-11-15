const { openApp } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const seed = { users: [baseUser], schemaVersion: 7, projects: [], clients: { customers: [{ id: 'cA', name: 'شركة الأمل', code: 'C1', projects: [], collections: [], guarantees: [], contracts: [],
    boqs: [{ id: 'B1', title: 'مقايسة أ', project: 'مشروع س', items: [{ code: '1', name: 'خرسانة', unit: 'م3', qty: 10, price: 100 }, { code: '2', name: 'حديد', unit: 'طن', qty: 2, price: 500 }] }],
    workSurveys: [{ id: 'WS-1', project: 'مشروع س', workType: 'خرسانة', items: [{ isHeader: true, name: 'قسم 1' }, { code: '1', name: 'بند', unit: 'م', qty: 3, price: 10 }] }],
    invoices: [{ no: 'INV-1', project: 'مشروع س', value: 1000, extras: 100, retentionPct: 5, paid: 200, notes: 'ملاحظة' }] }] } };
  const { browser, page, errors } = await openApp(seed);
  const w = (ms = 300) => page.waitForTimeout(ms);
  await page.evaluate(() => { window.__print = null; window.printHtml = (h, t) => { window.__print = { h, t }; }; });
  const run = async (fn) => { await page.evaluate(() => { window.__print = null; }); await page.evaluate(fn); await w(100); return page.evaluate(() => window.__print); };
  let p = await run(() => clPrintBoq('cA::B1'));
  ok(p && p.h.includes('خرسانة') && p.h.includes('حديد') && p.h.includes('شركة الأمل'), 'BOQ print has items + customer');
  ok(p.h.includes(await page.evaluate(() => fmtMoney(2000))), 'BOQ total correct (10*100+2*500=2000)');
  p = await run(() => clPrintWorkSurvey('cA::WS-1'));
  ok(p && p.h.includes('قسم 1') && p.h.includes('محضر حصر'), 'survey print has header row + title');
  p = await run(() => clPrintInvoice('cA::INV-1'));
  ok(p && p.h.includes('صافي المستخلص') && p.h.includes(await page.evaluate(() => fmtMoney(clInvNet(clCustomerById('cA').invoices[0])))), 'invoice print shows net');
  console.log('[buttons on detail pages]');
  await page.evaluate(() => { boqFilters.detailKey = 'cA::B1'; goToPage('clients.boqs'); }); await w();
  await page.evaluate(() => { window.__print = null; }); await page.click('#boqPrint'); await w(100);
  ok(await page.evaluate(() => !!window.__print), 'BOQ detail button prints');
  await page.evaluate(() => { boqFilters.detailKey = ''; workSurveyFilters.detailKey = 'cA::WS-1'; goToPage('clients.workSurveys'); }); await w();
  await page.evaluate(() => { window.__print = null; }); await page.click('#wsPrint'); await w(100);
  ok(await page.evaluate(() => !!window.__print), 'survey detail button prints');
  await page.evaluate(() => { workSurveyFilters.detailKey = ''; clientInvFilters.detailKey = 'cA::INV-1'; goToPage('clients.invoices'); }); await w();
  await page.evaluate(() => { window.__print = null; }); await page.click('#ciPrint'); await w(100);
  ok(await page.evaluate(() => !!window.__print), 'invoice detail button prints');
  summary(errors); await browser.close();
})();
