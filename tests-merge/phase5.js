const { openApp } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  const seed = { users: [baseUser], schemaVersion: 7, projects: [], clients: { customers: [{ id: 'cA', name: 'شركة الأمل', code: 'CUS-0001', projects: [],
    contracts: [{ id: 'CT-0001', title: 'عقد أ', project: 'مشروع س', value: 1000000 }, { id: 'CT-0002', title: 'عقد ب', value: 500000 }],
    invoices: [{ no: 'INV-1', contractId: 'CT-0001', value: 200000, retentionPct: 5 }, { no: 'INV-2', contractId: 'CT-0001', value: 100000, retentionPct: 5 }, { no: 'INV-3', contractId: 'CT-0002', value: 50000, retentionPct: 10 }],
    boqs: [], workSurveys: [], collections: [],
    guarantees: [
      { id: 'GAR-0001', type: 'ضمان حسن تنفيذ', amount: 100000, status: 'ساري', expiryDate: d(200), contractId: 'CT-0001' },
      { id: 'GAR-0002', type: 'ضمان دفعة مقدمة', amount: 50000, status: 'ساري', expiryDate: d(-10), contractId: 'CT-0001' },
      { id: 'GAR-0003', type: 'ضمان نهائي', amount: 30000, status: 'ساري', expiryDate: d(10), contractId: 'CT-0001' },
      { id: 'GAR-0004', type: 'ضمان نهائي', amount: 20000, status: 'محرَّر', expiryDate: d(-5), contractId: 'CT-0001' },
      { id: 'GAR-0005', type: 'ضمان نهائي', amount: 7000, status: 'ساري', expiryDate: d(300), contractId: 'CT-0002' }
    ] }] } };
  const { browser, page, errors } = await openApp(seed);
  const wait = (ms = 300) => page.waitForTimeout(ms);
  const yes = async () => { await page.waitForSelector('#appConfirmModal'); await page.click('#appConfirmModal button[data-c="1"]'); await wait(500); };

  console.log('[1] pure logic');
  const t = await page.evaluate(() => clGuaranteeTotals(clGuaranteesOfContract('cA', 'CT-0001')));
  eq([t.live, t.expired, t.released, t.soon], [130000, 50000, 20000, 1], 'totals: live/expired(auto by date)/released/soon');
  eq(await page.evaluate(() => clRetainedOfContract('cA', 'CT-0001')), 15000, 'retained = 5% of invoices of the contract only');
  eq(await page.evaluate(() => clGuaranteeEffStatus(clCustomerById('cA').guarantees[1])), 'منتهي', 'expired derived without mutating data');
  eq(await page.evaluate(() => clCustomerById('cA').guarantees[1].status), 'ساري', 'stored status untouched');

  console.log('[2] contract detail shows only its guarantees + totals');
  await page.evaluate(() => { contractFilters.detailKey = 'cA::CT-0001'; goToPage('clients.contracts'); }); await wait();
  eq(await page.evaluate(() => document.querySelectorAll('.gar-section tbody tr').length), 4, '4 guarantees of CT-0001 (not CT-0002)');
  ok(await page.evaluate(() => document.querySelector('.gar-section').textContent.includes('محتجز من المستخلصات')), 'retained card shown');

  console.log('[3] add via UI from contract (preset contract) + attachment');
  await page.click('.gar-add'); await wait();
  eq(await page.evaluate(() => document.getElementById('garContract').value), 'CT-0001', 'contract preset');
  await page.evaluate(() => { document.getElementById('garAmount').value = '75000'; document.getElementById('garLetter').value = 'L-77'; document.getElementById('garExpiry').value = '2099-01-01'; });
  await page.click('#btnSaveGuarantee'); await wait();
  eq(await page.evaluate(() => clCustomerById('cA').guarantees.length), 6, 'saved');
  const g6 = await page.evaluate(() => clCustomerById('cA').guarantees[5]);
  eq([g6.id, g6.contractId, g6.project, g6.amount], ['GAR-0006', 'CT-0001', 'مشروع س', 75000], 'new id, contract link, project inherited from contract');
  eq(await page.evaluate(() => document.querySelectorAll('.gar-section tbody tr').length), 5, 'list refreshed');

  console.log('[4] validation');
  await page.click('.gar-add'); await wait();
  await page.click('#btnSaveGuarantee'); await wait(150);
  eq(await page.evaluate(() => clCustomerById('cA').guarantees.length), 6, 'zero amount refused');
  await page.evaluate(() => { document.getElementById('garAmount').value = '5'; document.getElementById('garId').value = 'GAR-0001'; });
  await page.click('#btnSaveGuarantee'); await wait(150);
  eq(await page.evaluate(() => clCustomerById('cA').guarantees.length), 6, 'duplicate code refused');
  await page.evaluate(() => { document.getElementById('garId').value = 'GAR-0009'; document.getElementById('garIssue').value = '2026-05-01'; document.getElementById('garExpiry').value = '2026-04-01'; });
  await page.click('#btnSaveGuarantee'); await wait(150);
  eq(await page.evaluate(() => clCustomerById('cA').guarantees.length), 6, 'expiry before issue refused');
  await page.evaluate(() => closeModal()); await wait(150);

  console.log('[5] renew / release / seize');
  await page.evaluate(() => openGuaranteeActionModal(clAllGuarantees().find(g => g.id === 'GAR-0002'), 'renew')); await wait(150);
  await page.click('#btnGaSave'); await wait(150);
  eq(await page.evaluate(() => clCustomerById('cA').guarantees[1].renewals), undefined, 'renew without date refused');
  await page.evaluate(() => { document.getElementById('gaDate').value = '2099-06-01'; }); await page.click('#btnGaSave'); await wait();
  const g2 = await page.evaluate(() => clCustomerById('cA').guarantees[1]);
  eq([g2.expiryDate, g2.status, g2.renewals.length], ['2099-06-01', 'ساري', 1], 'renewed: new expiry, live again, history kept');
  await page.evaluate(() => openGuaranteeActionModal(clAllGuarantees().find(g => g.id === 'GAR-0003'), 'release')); await wait(150);
  await page.click('#btnGaSave'); await wait();
  eq(await page.evaluate(() => clCustomerById('cA').guarantees[2].status), 'محرَّر', 'released');
  await page.evaluate(() => openGuaranteeActionModal(clAllGuarantees().find(g => g.id === 'GAR-0001'), 'seize')); await wait(150);
  await page.click('#btnGaSave'); await wait(150);
  eq(await page.evaluate(() => clCustomerById('cA').guarantees[0].status), 'ساري', 'seize without reason refused');
  await page.evaluate(() => { document.getElementById('gaNote').value = 'إخلال'; }); await page.click('#btnGaSave'); await wait();
  eq(await page.evaluate(() => clCustomerById('cA').guarantees[0].status), 'مصادَر', 'seized with reason');
  const t2 = await page.evaluate(() => clGuaranteeTotals(clGuaranteesOfContract('cA', 'CT-0001')));
  eq([t2.live, t2.expired, t2.seized, t2.released], [125000, 0, 100000, 50000], 'totals updated after actions');

  console.log('[6] edit keeps hidden fields (renewals), delete');
  await page.evaluate(() => openGuaranteeModal('cA::GAR-0002')); await wait();
  await page.evaluate(() => { document.getElementById('garIssuer').value = 'بنك مصر'; }); await page.click('#btnSaveGuarantee'); await wait();
  const g2b = await page.evaluate(() => clCustomerById('cA').guarantees[1]);
  eq([g2b.issuer, g2b.renewals.length], ['بنك مصر', 1], 'edit preserved renewals');
  await page.evaluate(() => document.querySelector('.gar-del').click()); await yes();
  eq(await page.evaluate(() => clCustomerById('cA').guarantees.length), 5, 'deleted');

  console.log('[7] guarantees page: filters, nav, customer detail');
  await page.evaluate(() => { contractFilters.detailKey = ''; goToPage('clients.guarantees'); }); await wait();
  ok(await page.evaluate(() => document.body.textContent.includes('خطابات الضمان')), 'page renders');
  await page.evaluate(() => { const s = document.getElementById('garStatus'); s.value = 'محرَّر'; s.dispatchEvent(new Event('change')); }); await wait();
  eq(await page.evaluate(() => document.querySelectorAll('.gar-section tbody tr').length), 2, 'status filter');
  await page.evaluate(() => { guaranteeFilters.status = ''; customerFilters.detailId = 'cA'; goToPage('clients.customers'); }); await wait();
  eq(await page.evaluate(() => document.querySelectorAll('.gar-section tbody tr').length), 5, 'customer detail lists all customer guarantees');
  ok(await page.evaluate(() => Object.keys(HR_PAGES ? {} : {}).length === 0 && HR_PAGES.includes('clients.guarantees')), 'permission key registered');
  summary(errors); await browser.close();
})();
