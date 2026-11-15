const { openApp } = require('./harness');
const { baseUser, ok, summary } = require('./lib');
(async () => {
  const seed = { users: [baseUser], schemaVersion: 9,
    employees: [{ id: 'e1', name: 'أحمد', code: 'E1', salary: 100, status: 'active', phone: '010', nationalId: '123' }],
    equipment: [{ id: 'q1', name: 'مع', code: 'Q1', status: 'working' }] };
  const { browser, page, errors } = await openApp(seed);
  await page.evaluate(() => { employeeFilters._boardLevel = 'list'; employeeFilters.departmentId = ''; goToPage('employees'); rerenderCurrentPage(); }); await page.waitForTimeout(300);
  const heads = () => page.evaluate(() => { const t = document.querySelector('table.data-table'); return [...t.querySelectorAll('thead th')].filter(x => getComputedStyle(x).display !== 'none').map(x => x.innerText.trim()); });
  const cellsOK = () => page.evaluate(() => { const t = document.querySelector('table.data-table'); const vis = [...t.querySelectorAll('thead th')].filter(x => getComputedStyle(x).display !== 'none').length; const row = [...t.querySelector('tbody tr').children].filter(x => getComputedStyle(x).display !== 'none').length; return vis === row; });
  // نقل «الاسم» قبل «الكود»
  await page.evaluate(async () => { const l = ensureFormLayout('employees'); const a = l.findIndex(f => f.key === 'name'), b = l.findIndex(f => f.key === 'nationalId'); const t = l[a]; l[a] = l[b]; l[b] = t; rerenderCurrentPage(); await new Promise(r => setTimeout(r, 150)); });
  let h = await heads();
  ok(h.indexOf('الاسم') >= 0 && h.indexOf('الرقم القومي') < h.indexOf('الاسم') && h.indexOf('كود الموظف') < h.indexOf('الرقم القومي') && h.indexOf('كود الموظف') >= 0, 'table columns follow layout order: ' + h.slice(0, 4).join('|'));
  ok(await cellsOK(), 'cells aligned after reorder');
  const firstRow = await page.evaluate(() => { const t = document.querySelector('table.data-table'); const hs = [...t.querySelectorAll('thead th')]; const i = hs.findIndex(x => x.innerText.trim() === 'الاسم'); return t.querySelector('tbody tr').children[i].innerText.includes('أحمد'); });
  ok(firstRow, 'name cell moved together with its header');
  // تكلفة التشغيل آخر كرت في المعدات
  await page.evaluate(() => { equipmentFilters._boardLevel = 'list'; equipmentFilters.departmentId = ''; goToPage('equipment'); rerenderCurrentPage(); }); await page.waitForTimeout(300);
  const eq = await page.evaluate(() => [...document.querySelectorAll('.sc-card .sc-lbl')].map(x => x.innerText.trim()));
  ok(/تكلفة تشغيل/.test(eq[eq.length - 1]), 'equipment operating-cost card last: ' + eq.join('|'));
  // معاينة قوائم العملاء
  await page.evaluate(() => { goToPage('backup'); }); await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector('.settings-tab[data-panel=customfields]').click()); await page.waitForTimeout(400);
  for (const t of ['clContracts', 'clInvoices', 'clBoqs', 'clSurveys', 'clCollections', 'clGuarantees', 'clCustomers']) {
    await page.evaluate((t) => document.querySelector('.cf-ent-tab[data-val=' + t + ']').click(), t); await page.waitForTimeout(600);
    ok(await page.evaluate(() => !/تعذر/.test(document.getElementById('cfFormPreview').innerText) && document.querySelectorAll('#cfFormPreview input,#cfFormPreview select,#cfFormPreview textarea').length > 3), 'preview works: ' + t);
  }
  // مقاسات موحدة
  await page.evaluate(() => document.querySelector('.cf-ent-tab[data-val=employees]').click()); await page.waitForTimeout(600);
  ok(await page.evaluate(() => { const hs = [...document.querySelectorAll('#cfFieldsList .cf-table input.input, #cfFieldsList .cf-table select.input')].map(e => Math.round(e.getBoundingClientRect().height)); return new Set(hs).size === 1; }), 'settings controls same height');
  ok(await page.evaluate(() => [...document.querySelectorAll('#cfFieldsList tr:not([data-cf-key^=f_]):not([data-cf-key=birthDate]) .cf-show')].every(c => c.checked)), 'fresh settings: all builtin columns shown by default');
  ok(errors.length === 0, 'no errors ' + errors.join('|'));
  await browser.close(); summary();
})();
