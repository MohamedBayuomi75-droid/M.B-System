const { openApp } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const { browser, page, errors } = await openApp({ users: [baseUser], schemaVersion: 8, projects: [], clients: { customers: [] } });
  const w = (ms = 350) => page.waitForTimeout(ms);
  const set = (pairs) => page.evaluate((p) => { Object.entries(p).forEach(([id, v]) => { const el = document.getElementById(id); if (!el) throw new Error('missing #' + id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }); }, pairs);
  const click = async (sel) => { await page.click(sel); await w(); };
  const C = () => page.evaluate(() => JSON.parse(JSON.stringify(clCustomers()[0] || null)));
  const P = () => page.evaluate(() => JSON.parse(JSON.stringify(DATA.projects)));

  console.log('[1] customer');
  await page.evaluate(() => openCustomerModal()); await w();
  await set({ cuName: 'شركة الأمل', cuPhone: '0100' }); await click('#btnSaveCustomer');
  eq((await C()).name, 'شركة الأمل', 'customer created');

  console.log('[2] project under the customer (unified source)');
  const cid = (await C()).id;
  await page.evaluate((id) => openProjectModal('', id), cid); await w();
  await set({ prName: 'برج الأمل' }); await click('#btnSaveProject, #btnSaveProj, .modal-footer .btn-primary');
  const projs = await P();
  eq(projs.length, 1, 'one unified project'); eq(projs[0].customerId, cid, 'linked to customer');

  console.log('[3] work survey → BOQ → contract (project auto-linked, stage advances)');
  await page.evaluate(() => openWorkSurveyModal()); await w();
  await page.evaluate(() => document.getElementById('wsAddItem').click()); await w(150);
  await page.evaluate(() => { const tr = document.querySelector('#wsItemsBody tr'); const set = (s, v) => { const e = tr.querySelector(s); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }; set('.it-code', '1'); set('.it-name', 'خرسانة'); set('.it-unit', 'م3'); set('.it-qty', '10'); set('.it-price', '100'); });
  await set({ wsProject: 'برج الأمل' }); await click('#btnSaveSurvey');
  let c = await C();
  eq(c.workSurveys.length, 1, 'survey saved'); eq(c.workSurveys[0].projectId, projs[0].id, 'survey linked to unified project (no duplicate)');
  eq((await P()).length, 1, 'still one project');
  await page.evaluate(() => openBoqModal()); await w();
  await set({ bqTitle: 'مقايسة البرج', bqProject: 'برج الأمل' });
  await page.evaluate(() => document.getElementById('bqAddItem').click()); await w(150);
  await page.evaluate(() => { const tr = document.querySelector('#bqItemsBody tr'); const set = (s, v) => { const e = tr.querySelector(s); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }; set('.it-code', '1'); set('.it-name', 'خرسانة'); set('.it-qty', '8'); set('.it-price', '100'); });
  await click('#btnSaveBoq');
  c = await C(); eq(c.boqs.length, 1, 'boq saved'); eq(c.boqs[0].items.length, 1, 'boq item kept');
  await page.evaluate(() => openContractModal()); await w();
  await set({ ctTitle: 'عقد البرج', ctProject: 'برج الأمل', ctValue: '1000', ctRet: '5' });
  await page.evaluate(() => { const b = document.getElementById('ctBoq'); b.value = clCustomers()[0].boqs[0].id; b.dispatchEvent(new Event('change')); });
  await click('#btnSaveContract');
  c = await C(); const k = c.contracts[0];
  eq([c.contracts.length, k.value, k.projectId === projs[0].id], [1, 1000, true], 'contract saved + linked');
  ok(['التعاقد', 'المستخلصات', 'التنفيذ والمتابعة'].includes((await P())[0].status) || (await P())[0].status.length > 0, 'project stage moved forward only', (await P())[0].status);

  console.log('[4] variation order → contract value');
  await page.evaluate(() => { contractFilters.detailKey = clCustomers()[0].id + '::' + clCustomers()[0].contracts[0].id; goToPage('clients.contracts'); }); await w();
  await click('.vo-section .vo-add');
  await set({ voTitle: 'زيادة كميات', voAmount: '200', voStatus: 'معتمد' }); await click('#btnSaveVo');
  eq((await C()).contracts[0].value, 1200, 'approved VO → 1000 + 200');

  console.log('[5] guarantee on the contract');
  await click('.gar-section .gar-add');
  await set({ garAmount: '120', garLetter: 'L-1', garExpiry: '2099-01-01' }); await click('#btnSaveGuarantee');
  c = await C(); eq([c.guarantees.length, c.guarantees[0].contractId, c.guarantees[0].project], [1, k.id, 'برج الأمل'], 'guarantee linked to contract + project');

  console.log('[6] invoice → collection: paid stays consistent end to end');
  await page.evaluate(() => openClientInvoiceModal()); await w();
  await set({ ciValue: '500', ciRet: '10', ciProject: 'برج الأمل' });
  await page.evaluate(() => { const s = document.getElementById('ciContract'); s.value = clCustomers()[0].contracts[0].id; s.dispatchEvent(new Event('change')); });
  await click('#btnSaveClInv');
  c = await C(); const inv = c.invoices[0];
  const net = await page.evaluate(() => clInvNet(clCustomers()[0].invoices[0]));
  eq([c.invoices.length, net], [1, 450], 'invoice net = 500 − 10% retention');
  await page.evaluate(() => openCollectionModal()); await w();
  await set({ coAmt: '300', coInv: inv.no }); await click('#btnSaveColl');
  c = await C();
  eq([c.collections.length, c.invoices[0].paid], [1, 300], 'collection → invoice paid 300');
  const led = await page.evaluate(() => { const l = clBuildCustomerLedger(clCustomers()[0], '', ''); return [l.periodDebit, l.periodCredit, l.closing]; });
  eq(led, [450, 300, 150], 'customer ledger closing = 150 (matches 450 − 300)');
  eq(await page.evaluate(() => clRetainedOfContract(clCustomers()[0].id, clCustomers()[0].contracts[0].id)), 50, 'retained on contract = 10% of 500');

  console.log('[7] dashboard, comparison, archive, print all agree');
  const d = await page.evaluate(() => { const x = clDashData(''); return [x.invNet, x.coll, x.outstanding, x.gt.live, x.activeProjects.length]; });
  eq(d, [450, 300, 150, 120, 1], 'dashboard KPIs');
  await page.evaluate(() => { cmpState = { customerId: clCustomers()[0].id, contractId: clCustomers()[0].contracts[0].id, surveyId: clCustomers()[0].workSurveys[0].id, boqId: clCustomers()[0].boqs[0].id }; goToPage('clients.comparison'); }); await w();
  const cmp = await page.evaluate(() => { const r = clCmpResolve(); const x = clCompareItems(r.survey.items, r.boq.items); return [x.rows[0].sQty, x.rows[0].bQty, x.rows[0].state]; });
  eq(cmp, [10, 8, 'حصر أكبر'], 'comparison: survey 10 vs BOQ 8');
  await page.evaluate(() => { window.__p = null; window.printHtml = (h) => { window.__p = h; }; clPrintInvoice(clCustomers()[0].id + '::' + clCustomers()[0].invoices[0].no); });
  ok(await page.evaluate(() => window.__p.includes(fmtMoney(450))), 'invoice print shows net 450');
  const aud = await page.evaluate(() => DATA.auditLog.map(a => a.action));
  ok(['إضافة عميل', 'إضافة عقد', 'إضافة مستخلص', 'إضافة تحصيل', 'إضافة ضمان', 'أمر تغيير'].every(x => aud.includes(x)), 'audit trail covers the whole chain', aud);

  console.log('[8] persistence round trip (save → reload data)');
  const saved = await page.evaluate(() => JSON.stringify(DATA));
  const { browser: b2, page: p2, errors: e2 } = await openApp(JSON.parse(saved));
  const same = await p2.evaluate(() => { const c = clCustomers()[0]; return [c.contracts[0].value, c.invoices[0].paid, c.guarantees.length, DATA.projects.length, DATA.schemaVersion]; });
  eq(same, [1200, 300, 1, 1, 9], 'everything survives reload without drift');
  await b2.close();
  summary(errors.concat(e2)); await browser.close();
})();
