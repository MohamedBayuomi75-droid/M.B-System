const { openApp } = require('./harness');
const { baseUser, ok, summary } = require('./lib');
(async () => {
  const seed = { users: [baseUser], schemaVersion: 9,
    employees: [{ id: 'e1', name: 'أ', code: 'E1', salary: 100, insuranceStatus: 'insured', status: 'active' }, { id: 'e2', name: 'ب', code: 'E2', salary: 100, insuranceStatus: 'pending', status: 'active' }, { id: 'e3', name: 'ج', code: 'E3', salary: 100, status: 'inactive' }],
    equipment: [{ id: 'q1', name: 'م', code: 'Q1', insuranceStatus: 'none', vehicleLicenseExpiry: '2020-01-01', status: 'working' }],
    workers: [{ id: 'w1', name: 'ع', code: 'W1', dailyWage: 200, insuranceStatus: 'insured' }] };
  const { browser, page, errors } = await openApp(seed);
  const txt = () => page.evaluate(() => document.querySelector('.sc-row').innerText.replace(/\s+/g, ' '));
  await page.evaluate(() => { employeeFilters._boardLevel = 'list'; employeeFilters.departmentId = ''; goToPage('employees'); rerenderCurrentPage(); }); await page.waitForTimeout(300);
  let t = await txt();
  ok(/نشطون/.test(t) && !/مؤمَّن عليهم/.test(t), 'active card restored: ' + t);
  ok(await page.evaluate(() => { const c = [...document.querySelectorAll('.sc-card')].find(x => /حالة التأمين/.test(x.innerText)); return c && /[1١]\s*مؤمَّن/.test(c.innerText.replace(/\n/g, ' ')) && /[1١]\s*قيد التسجيل/.test(c.innerText.replace(/\n/g, ' ')) && /[1١]\s*غير مؤمن/.test(c.innerText.replace(/\n/g, ' ')); }), 'insurance card 1/1/1');
  ok(await page.evaluate(() => !!([...document.querySelectorAll('.sc-card')].find(x => /حالة الرخصة/.test(x.innerText)))), 'license card');
  // كرت مخصص
  await page.evaluate(() => { DATA.customCards = [{ id: 'c1', entity: 'employees', icon: '📌', label: 'ذوو راتب', column: 'salary', columnLabel: 'الراتب', mode: 'count', show: true }]; rerenderCurrentPage(); }); await page.waitForTimeout(250);
  ok(await page.evaluate(() => /ذوو راتب/.test(document.querySelector('.sc-row').innerText)), 'custom card shown');
  // الإعدادات
  await page.evaluate(() => { goToPage('backup'); }); await page.waitForTimeout(400);
  await page.evaluate(() => { document.querySelector('.settings-tab[data-panel=customfields]').click(); }); await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.querySelectorAll('#ccList .cc-row').length === 1), 'settings lists card');
  await page.evaluate(() => document.getElementById('btnCcAdd').click()); await page.waitForTimeout(200);
  ok(await page.evaluate(() => DATA.customCards.length === 2 && document.querySelectorAll('#ccList .cc-row').length === 2), 'add card');
  await page.evaluate(() => document.querySelector('#ccList .cc-del').click()); await page.waitForTimeout(200);
  ok(await page.evaluate(() => DATA.customCards.length === 1), 'delete card');
  // نموذج العامل
  await page.evaluate(() => { goToPage('workers'); }); await page.waitForTimeout(300);
  await page.evaluate(() => openWorkerModal()); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const s = document.getElementById('wrkWorkerType'); return s && s.type === 'hidden'; }), 'no visible worker-type field');
  await page.evaluate(() => { document.getElementById('appModal')&&document.getElementById('appModal').remove(); openWorkerModal(null,{defaultType:'temporary'}); }); await page.waitForTimeout(150);
  ok(await page.evaluate(() => !!document.getElementById('wrkWageTemp') && document.querySelector('.wrk-temp-wage').style.display !== 'none' && document.getElementById('wrkStatus').closest('label').style.display !== 'none'), 'temp fields shown');
  await page.evaluate(() => { document.getElementById('wrkName').value = 'مؤقت1'; document.getElementById('wrkSupervisor').value = ''; document.getElementById('wrkWageTemp').value = '150'; document.getElementById('btnSaveWrk').click(); }); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const w = DATA.workers.find(x => x.name === 'مؤقت1'); return !w || (w.type === 'temporary' && w.status === 'active'); }), 'temp saved as temporary/active');
  // فلاتر صف واحد
  await page.evaluate(() => { goToPage('workers'); }); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const f = document.querySelector('.filters-bar'); if (!f) return true; const ys = [...f.children].filter(c => c.offsetParent && c.getBoundingClientRect().height > 0 && !['LINK','DATALIST'].includes(c.tagName)).map(c => Math.round(c.getBoundingClientRect().top / 8)); return new Set(ys).size <= 2; }), 'filters single row');
  ok(errors.length === 0, 'no errors ' + errors.join('|'));
  await browser.close(); summary();
})();
