const { openApp } = require('./harness');
const { baseUser, ok, summary } = require('./lib');
(async () => {
  const today = new Date().toISOString().slice(0, 10);
  const past = '2020-01-01';
  const seed = { users: [baseUser], schemaVersion: 9,
    employees: [{ id: 'e1', name: 'أ', code: 'E1', salary: 100, status: 'active', insuranceStatus: 'insured', idCardExpiry: '2020-01-01' }, { id: 'e2', name: 'ب', code: 'E2', salary: 100, status: 'active', insuranceStatus: 'pending', idCardExpiry: '2099-01-01' }],
    workers: [{ id: 'w1', name: 'ع1', code: 'W1', salary: 500, status: 'active', insuranceStatus: 'none' }, { id: 'w2', name: 'ع2', code: 'W2', salary: 500, status: 'active', insuranceStatus: 'insured' }],
    leaves: [{ id: 'l1', employeeId: 'e1', personId: 'e1', personKind: 'employee', type: 'annual', from: past, to: '2099-12-31', status: 'approved', days: 5 },
             { id: 'l2', employeeId: 'w2', personId: 'w2', personKind: 'worker', type: 'annual', from: past, to: '2020-02-01', status: 'approved', days: 5 }] };
  const { browser, page, errors } = await openApp(seed);
  const cards = () => page.evaluate(() => [...document.querySelectorAll('.sc-card')].map(c => c.innerText.replace(/\s+/g, ' ')));
  await page.evaluate(() => { employeeFilters._boardLevel = 'list'; employeeFilters.departmentId = ''; goToPage('employees'); rerenderCurrentPage(); }); await page.waitForTimeout(300);
  let c = await cards();
  ok(c.some(x => /نشطون/.test(x) && /[1١]\s*في إجازة/.test(x)), 'employees active card shows leave: ' + c.join(' | '));
  ok(await page.evaluate(() => !!document.querySelector('.leave-until')), 'leave-until under employee status');
  await page.evaluate(() => { workerFilters.departmentId = ''; workerFilters._boardLevel = 'list'; goToPage('workers'); rerenderCurrentPage(); }); await page.waitForTimeout(300);
  c = await cards();
  ok(c.some(x => /عدد العمال/.test(x)) && c.some(x => /إجمالي الرواتب/.test(x)) && c.some(x => /حالة البطاقة/.test(x)) && c.some(x => /نشطون/.test(x)), 'workers cards same as employees: ' + c.join(' | '));
  ok(!(await page.evaluate(() => !!document.querySelector('.leave-until'))), 'expired leave => no badge');
  // كروت مخصصة تحلل
  await page.evaluate(() => { DATA.customCards = [
    { id: 'a', entity: 'employees', icon: '🪪', label: 'البطاقات', column: 'idCardStatus', columnLabel: 'حالة البطاقة', mode: 'breakdown', show: true },
    { id: 'b', entity: 'employees', icon: '🛡️', label: 'التأمين', column: 'insuranceStatus', columnLabel: 'حالة التأمين', mode: 'breakdown', show: true }]; employeeFilters._boardLevel = 'list'; goToPage('employees'); rerenderCurrentPage(); }); await page.waitForTimeout(300);
  c = await cards();
  ok(c.some(x => /البطاقات/.test(x) && /[1١]\s*سارية/.test(x) && /[1١]\s*منتهية/.test(x)), 'card breakdown idCardStatus: ' + c.join(' | '));
  ok(c.some(x => /التأمين/.test(x) && /[1١]\s*مؤمَّن/.test(x) && /[1١]\s*قيد التسجيل/.test(x)), 'card breakdown insurance');
  ok(errors.length === 0, 'no errors ' + errors.join('|'));
  await browser.close(); summary();
})();
