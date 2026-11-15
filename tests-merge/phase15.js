// المرحلة أ: لوحات الأقسام الموحّدة
const { openApp } = require('./harness');
const { baseUser, ok, eq, summary } = require('./lib');
(async () => {
  const seed = { users: [baseUser], schemaVersion: 8, projects: [
      { id: 'pA', code: 'P1', name: 'مشروع أ', customerId: 'cA', customerName: 'شركة الأمل', status: 'التعاقد' },
      { id: 'pB', code: 'P2', name: 'مشروع ب', customerId: 'cA', customerName: 'شركة الأمل', status: 'التنفيذ' }],
    clients: { customers: [{ id: 'cA', name: 'شركة الأمل', code: 'C1', department: 'أ', status: 'active', projects: [], contracts: [{ id: 'k1', title: 'عقد', status: 'ساري', value: 100 }], invoices: [], boqs: [], workSurveys: [], collections: [] },
                           { id: 'cB', name: 'شركة النور', code: 'C2', department: 'ب', status: 'inactive', projects: [], contracts: [], invoices: [], boqs: [], workSurveys: [], collections: [] }] } };
  const { browser, page, errors } = await openApp(seed);
  // دخول من القائمة → لوحات
  await page.evaluate(() => goToPage('clients.customers', true)); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !!document.querySelector('.boards-landing')), 'customers page opens on boards');
  eq(await page.evaluate(() => document.querySelectorAll('.board-gate-card').length), 3, 'الكل + نشط + غير نشط');
  await page.click('.board-gate-card[data-board-value="inactive"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !document.querySelector('.boards-landing') && !!document.getElementById('boardsBack')), 'board opens list with back bar');
  ok(await page.evaluate(() => document.body.innerText.includes('شركة النور') && !document.querySelector('#pageContent table')?.innerText.includes('شركة الأمل')), 'filter applied');
  await page.click('#boardsBack'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !!document.querySelector('.boards-landing') && customerFilters.seg === ''), 'back resets');
  // مشاريع بالمراحل
  await page.evaluate(() => goToPage('projects', true)); await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.querySelectorAll('.board-gate-card').length >= 10), 'projects boards per stage');
  // drill-down برمجي يتخطى اللوحات
  await page.evaluate(() => { contractFilters.status = 'ساري'; goToPage('clients.contracts'); }); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !document.querySelector('.boards-landing')), 'programmatic goToPage skips boards');
  // كل الصفحات المعرّفة بتترسم بدون أخطاء
  const keys = await page.evaluate(() => Object.keys(BOARD_PAGES));
  for (const k of keys) {
    const r = await page.evaluate((k) => { try { goToPage(k, true); return !!document.querySelector('.boards-landing'); } catch (e) { return String(e); } }, k);
    ok(r === true, 'boards render for ' + k + (r === true ? '' : ' → ' + r));
  }
  ok(errors.length === 0, 'no page errors ' + JSON.stringify(errors.slice(0, 3)));
  await browser.close(); summary();
})();
