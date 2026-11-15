// المرحلة و: بحث شامل + جدول زمني + اعتماد المصروفات الكبيرة
const { openApp } = require('./harness');
const { baseUser, ok, eq, summary } = require('./lib');
(async () => {
  const seed = { users: [baseUser], schemaVersion: 9, projects: [{ id: 'pA', code: 'P1', name: 'مشروع الشروق', status: 'التنفيذ', customerId: 'cA', customerName: 'شركة الأمل' }],
    expenses: [{ id: 'e1', project: 'مشروع الشروق', amount: 50000, date: '2026-02-01', personKind: 'worker', personId: 'x' }, { id: 'e2', project: 'مشروع الشروق', amount: 100, date: '2026-02-02', personKind: 'worker', personId: 'x' }],
    employees: [{ id: 'em1', name: 'سامي الموظف', code: 'E1' }],
    clients: { customers: [{ id: 'cA', name: 'شركة الأمل', code: 'C1', phone: '0100', projects: [], boqs: [], workSurveys: [],
      contracts: [{ id: 'k1', title: 'عقد الشروق', status: 'ساري', value: 1000, project: 'مشروع الشروق', projectId: 'pA', start: '2026-01-01' }],
      invoices: [{ no: 'INV-9', status: 'معتمد', date: '2026-01-20', value: 500, project: 'مشروع الشروق', projectId: 'pA', paid: 0 }],
      collections: [{ id: 'col1', date: '2026-01-25', amount: 200, project: 'مشروع الشروق', projectId: 'pA' }] }] } };
  const { browser, page, errors } = await openApp(seed);
  // بحث شامل
  await page.keyboard.press('Control+k'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => !!document.getElementById('gsInput')), 'Ctrl+K opens search');
  await page.fill('#gsInput', 'الشروق'); await page.waitForTimeout(400);
  const types = await page.evaluate(() => [...document.querySelectorAll('.gs-item .alert-code')].map(x => x.textContent));
  ok(types.includes('مشروع') && types.includes('عقد'), 'finds project + contract: ' + types);
  await page.fill('#gsInput', 'سامي'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.querySelectorAll('.gs-item').length >= 1), 'finds employee');
  await page.fill('#gsInput', 'الأمل'); await page.waitForTimeout(400);
  await page.click('.gs-item'); await page.waitForTimeout(400);
  eq(await page.evaluate(() => [currentPage, customerFilters.detailId]), ['clients.customers', 'cA'], 'result opens customer detail');
  // جدول زمني
  await page.evaluate(() => { goToPage('projects'); projectFilters.detailId = 'pA'; rerenderCurrentPage(); }); await page.waitForTimeout(300);
  const tl = await page.evaluate(() => document.querySelector('.project-timeline')?.textContent || '');
  ok(tl.includes('مستخلص INV-9') && tl.includes('تحصيل') && tl.includes('بداية عقد'), 'timeline has invoice + collection + contract');
  // اعتماد
  eq(await page.evaluate(() => collectAllAlerts().filter(a => a.kind === 'exp-approval').length), 0, 'no approval alerts when limit off');
  await page.evaluate(() => setExpenseApprovalLimit(10000));
  eq(await page.evaluate(() => collectAllAlerts().filter(a => a.kind === 'exp-approval').length), 1, 'only the big expense needs approval');
  await page.evaluate(() => approveExpense('e1'));
  eq(await page.evaluate(() => collectAllAlerts().filter(a => a.kind === 'exp-approval').length), 0, 'approved → alert gone');
  ok(await page.evaluate(() => DATA.expenses[0].approved === true && !!DATA.expenses[0].approvedAt), 'approval recorded');
  ok(errors.length === 0, 'no errors ' + JSON.stringify(errors.slice(0, 3)));
  await browser.close(); summary();
})();
