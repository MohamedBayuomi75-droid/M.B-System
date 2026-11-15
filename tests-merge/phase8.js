const { openApp } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const seed = { users: [baseUser], schemaVersion: 7, projects: [{ id: 'p1', code: 'P1', name: 'مشروع 1', customerId: 'cA', status: 'الدراسة والتخطيط', docs: [{ id: 'dp', name: 'pd.pdf', path: '/x/pd.pdf' }] }],
    clients: { customers: [{ id: 'cA', name: 'أمل', code: 'C1', projects: [], boqs: [{ id: 'B1', title: 'ب', items: [] }], workSurveys: [], collections: [], invoices: [{ no: 'INV-1', value: 10 }],
      guarantees: [{ id: 'GAR-1', amount: 5, docs: [{ id: 'dg', name: 'g.pdf', path: '/x/g.pdf' }] }],
      contracts: [{ id: 'CT-1', title: 'ع', value: 100, docs: [{ id: 'd1', name: 'c.pdf', path: '/x/c.pdf' }], changeOrders: [{ id: 'VO-1', title: 'v', amount: 1, status: 'مسودة', docs: [{ id: 'dv', name: 'v.pdf', path: '/x/v.pdf' }] }] }] }] } };
  const { browser, page, errors } = await openApp(seed);
  const w = (ms = 300) => page.waitForTimeout(ms);
  await page.evaluate(() => { window.__picked = 0; window.desktopApi.pickAttachments = async (o, l) => ({ files: [{ name: 'new' + (++window.__picked) + '.pdf', path: '/tmp/n.pdf', storedName: 'n.pdf', mime: 'application/pdf' }] }); window.__opened = null; window.desktopApi.openAttachment = async (p) => { window.__opened = p; }; });
  console.log('[1] contract modal: existing docs shown, add + remove persisted');
  await page.evaluate(() => openContractModal('cA::CT-1')); await w(200);
  eq(await page.evaluate(() => document.querySelectorAll('.cl-att-item').length), 1, 'existing doc listed');
  await page.click('.cl-att-add'); await w(200);
  eq(await page.evaluate(() => document.querySelectorAll('.cl-att-item').length), 2, 'added');
  await page.click('#btnSaveContract'); await w();
  const docs = await page.evaluate(() => clCustomerById('cA').contracts[0].docs.map(d => d.name));
  eq(docs, ['c.pdf', 'new1.pdf'], 'saved with attachments');
  eq(await page.evaluate(() => clCustomerById('cA').contracts[0].changeOrders.length), 1, 'VOs preserved');
  console.log('[2] other entity modals mount attachments & keep them');
  for (const [fn, btn, get] of [["openClientInvoiceModal('cA::INV-1')", 'btnSaveClInv', "clCustomerById('cA').invoices[0].docs"], ["openBoqModal('cA::B1')", 'btnSaveBoq', "clCustomerById('cA').boqs[0].docs"]]) {
    const has = await page.evaluate((f) => { try { eval(f); return true; } catch (e) { return String(e); } }, fn); await w(250);
    if (has !== true) { ok(false, fn + ' opens', has); continue; }
    ok(await page.evaluate(() => !!document.querySelector('.cl-att-block')), btn + ' has attachments block');
    await page.click('.cl-att-add'); await w(150); await page.click('#' + btn); await w(300);
    ok((await page.evaluate((g) => eval(g).length, get)) >= 1, btn + ' saved doc');
    await page.evaluate(() => closeModal());
  }
  console.log('[3] archive aggregates all entity docs and opens them');
  await page.evaluate(() => goToPage('clients.archive')); await w();
  const ents = await page.evaluate(() => Array.from(new Set(clAllDocsFlat().map(d => d.entity))).sort());
  ok(['ضمان', 'أمر تغيير', 'عقد', 'مشروع'].every(e => ents.includes(e)), 'archive has guarantee/VO/contract/project docs', ents);
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('.ar-open')); b[0].click(); }); await w(200);
  ok(await page.evaluate(() => !!window.__opened), 'open button calls openAttachment');
  summary(errors); await browser.close();
})();
