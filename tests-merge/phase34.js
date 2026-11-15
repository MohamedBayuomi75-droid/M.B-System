const { openApp } = require('./harness');
const { baseUser, ok, summary } = require('./lib');
(async () => {
  const seed = { users: [baseUser], schemaVersion: 9,
    employees: [{ id: 'e1', name: 'أحمد', code: 'E1', salary: 100, status: 'active', phone: '010', nationalId: '123' }],
    equipment: [{ id: 'q1', name: 'مع', code: 'Q1', status: 'working' }] };
  const { browser, page, errors } = await openApp(seed);
  // لوحات الأقسام
  await page.evaluate(() => { employeeFilters._boardLevel = 'boards'; goToPage('employees'); rerenderCurrentPage(); }); await page.waitForTimeout(300);
  const labels = await page.evaluate(() => [...document.querySelectorAll('.entity-dept-board .lbl')].map(x => x.innerText.trim()));
  ok(labels.slice(0, 4).join('|') === 'الكل|بدون قسم أو وظيفة|المستقيلين|المعاشات', 'board order: ' + labels.join('|'));
  await page.evaluate(() => openRenameCategoryModal('employee')); await page.waitForTimeout(150);
  ok(await page.evaluate(() => ![...document.querySelectorAll('#catRenId option')].some(o => /المستقيلين|المعاشات/.test(o.textContent))), 'fixed depts not renamable');
  await page.evaluate(() => closeModal());
  // الجدول: تنبيه الأوراق الناقصة قبل الاسم + فواصل
  await page.evaluate(() => { employeeFilters._boardLevel = 'list'; employeeFilters.departmentId = ''; goToPage('employees'); rerenderCurrentPage(); }); await page.waitForTimeout(500);
  const heads = () => page.evaluate(() => [...document.querySelector('#pageContent table.data-table').querySelectorAll('thead th')].filter(x => getComputedStyle(x).display !== 'none').map(x => x.innerText.trim()));
  let h = await heads();
  ok(h.indexOf('الاسم') >= 0 && h.indexOf('الاسم') < h.indexOf('الملاحظات'), 'default column order');
  ok(await page.evaluate(() => { const td = document.querySelector('#pageContent table.data-table tbody td:nth-child(3)'); return parseFloat(getComputedStyle(td).borderInlineStartWidth) === 0; }), 'no column separator lines');
  // الإعدادات: معاينة الجدول
  await page.evaluate(() => { goToPage('backup'); }); await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector('.settings-tab[data-panel=customfields]').click()); await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('.cf-ent-tab[data-val=employees]').click()); await page.waitForTimeout(900);
  // مطابقة عدد خانات القائمة لخانات النموذج
  const m = await page.evaluate(() => { const real = document.querySelectorAll('#cfFormPreview label input:not([type=hidden]), #cfFormPreview label select, #cfFormPreview label textarea').length; const list = document.querySelectorAll('#cfFieldsList tr[data-cf-key]').length; return { real, list }; });
  ok(m.list >= 20 && Math.abs(m.list - m.real) <= 6, 'list vs real form counts ' + JSON.stringify(m));
  ok(errors.length === 0, 'no errors ' + errors.join('|'));
  await browser.close(); summary();
})();
