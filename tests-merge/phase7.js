const { openApp } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const seed = { users: [baseUser], schemaVersion: 7, projects: [], clients: { customers: [{ id: 'cA', name: 'أمل', code: 'C1', projects: [], boqs: [], workSurveys: [], collections: [], invoices: [], guarantees: [],
    contracts: [{ id: 'CT-1', title: 'عقد', value: 1000, status: 'ساري' }, { id: 'CT-2', title: 'عقد 2', value: 500, status: 'ساري' }] }] } };
  const { browser, page, errors } = await openApp(seed);
  const w = (ms = 300) => page.waitForTimeout(ms);
  const val = (id) => page.evaluate((id) => { const k = clCustomerById('cA').contracts.find(x => x.id === id); return [k.value, k.originalValue, (k.changeOrders || []).length]; }, id);
  const yes = async () => { await page.waitForSelector('#appConfirmModal'); await page.click('#appConfirmModal button[data-c="1"]'); await w(500); };
  await page.evaluate(() => { contractFilters.detailKey = 'cA::CT-1'; goToPage('clients.contracts'); }); await w();
  const add = async (title, amount, status) => {
    await page.click('.vo-section .vo-add'); await w(200);
    await page.evaluate(([t, a, s]) => { document.getElementById('voTitle').value = t; document.getElementById('voAmount').value = a; document.getElementById('voStatus').value = s; }, [title, amount, status]);
    await page.click('#btnSaveVo'); await w();
  };
  console.log('[1] draft does not change value; approved does');
  await add('زيادة خرسانة', '200', 'مسودة');
  eq(await val('CT-1'), [1000, 1000, 1], 'draft: value unchanged');
  await add('خصم بند', '-50', 'معتمد');
  eq(await val('CT-1'), [950, 1000, 2], 'approved negative lowers value');
  eq((await page.evaluate(() => clCustomerById('cA').contracts[0].changeOrders.map(v => v.id))), ['VO-0001', 'VO-0002'], 'sequential ids');

  console.log('[2] approve draft / revert (reversible, no double counting)');
  await page.evaluate(() => openChangeOrderModal('cA::CT-1::VO-0001')); await w(200);
  await page.evaluate(() => { document.getElementById('voStatus').value = 'معتمد'; }); await page.click('#btnSaveVo'); await w();
  eq(await val('CT-1'), [1150, 1000, 2], 'draft→approved adds once');
  await page.evaluate(() => openChangeOrderModal('cA::CT-1::VO-0001')); await w(200);
  await page.evaluate(() => { document.getElementById('voStatus').value = 'مرفوض'; }); await page.click('#btnSaveVo'); await w();
  eq(await val('CT-1'), [950, 1000, 2], 'approved→rejected reverts');
  await page.evaluate(() => openChangeOrderModal('cA::CT-1::VO-0002')); await w(200);
  await page.evaluate(() => { document.getElementById('voAmount').value = '-100'; }); await page.click('#btnSaveVo'); await w();
  eq(await val('CT-1'), [900, 1000, 2], 'editing approved amount recalculates');

  console.log('[3] validation + other contract untouched');
  await page.click('.vo-section .vo-add'); await w(200);
  await page.click('#btnSaveVo'); await w(150);
  eq((await val('CT-1'))[2], 2, 'empty title refused');
  await page.evaluate(() => { document.getElementById('voTitle').value = 'x'; }); await page.click('#btnSaveVo'); await w(150);
  eq((await val('CT-1'))[2], 2, 'zero amount refused');
  await page.evaluate(() => closeModal()); await w(150);
  eq(await val('CT-2'), [500, undefined, 0], 'CT-2 untouched');

  console.log('[4] contract edit keeps change orders and re-bases original');
  await page.evaluate(() => openContractModal('cA::CT-1')); await w(200);
  await page.evaluate(() => { document.getElementById('ctValue').value = '1900'; }); await page.click('#btnSaveContract'); await w();
  eq(await val('CT-1'), [1900, 2000, 2], 'kept 2 VOs; manual current value 1900 → original 2000');
  await page.evaluate(() => { contractFilters.detailKey = 'cA::CT-1'; goToPage('clients.contracts'); }); await w();

  console.log('[5] delete approved VO reverts value; customer detail shows all');
  await page.evaluate(() => document.querySelectorAll('.vo-section .vo-del')[1].click()); await yes();
  eq(await val('CT-1'), [2000, 2000, 1], 'deleted approved VO → value restored');
  await page.evaluate(() => { contractFilters.detailKey = ''; customerFilters.detailId = 'cA'; goToPage('clients.customers'); }); await w();
  eq(await page.evaluate(() => document.querySelectorAll('.vo-section tbody tr').length), 1, 'customer detail lists VOs');
  summary(errors); await browser.close();
})();
