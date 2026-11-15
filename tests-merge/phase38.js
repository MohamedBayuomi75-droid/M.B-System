const { openApp } = require('./harness'); const { baseUser, ok, summary } = require('./lib');
(async () => {
  const seed = { users:[baseUser], schemaVersion:9, employees:[{id:'e1',name:'أ',code:'E1',status:'active',nationalId:'29001011234567'}] };
  const { browser, page } = await openApp(seed);
  const n = await page.evaluate(() => FORM_REGISTRY.length);
  ok(n >= 38, 'registry size ' + n);
  const empties = await page.evaluate(() => FORM_REGISTRY.filter(r => !captureRealFormPreview(r.key)).map(r => r.key));
  ok(empties.length === 0, 'all registered forms capturable ' + empties.join(','));
  // settings tabs cover registry
  await page.evaluate(() => { goToPage('backup'); }); await page.waitForTimeout(500);
  const tabs = await page.evaluate(() => { document.querySelector('.settings-tab[data-panel=customfields]').click(); return document.querySelectorAll('#cfEntityTabs .cf-ent-tab').length; });
  ok(tabs === n, 'settings tabs = registry ' + tabs);
  // register a new form -> appears
  const t2 = await page.evaluate(() => { registerFormEntity({ group:'wh', key:'zzNew', label:'قائمة جديدة', open:()=>openWhItemModal() }); return cfEntityTabsHtml().indexOf('zzNew') > 0; });
  ok(t2, 'new registered form appears in tabs');
  // ledger supplier layout applied to real modal
  await page.evaluate(() => { syncAutoFields('lgSuppliers'); const l = ensureFormLayout('lgSuppliers'); l.find(x=>x.selector==='#m_name').label = 'اسم المورد الجديد'; DATA.formLayouts.lgSuppliers = l; window.__cfNoLayout=false; goToPage('dashboard'); openAddSupplierModal(); }); await page.waitForTimeout(400);
  ok(await page.evaluate(() => /اسم المورد الجديد/.test(document.querySelector('#m_name').closest('.field').innerText)), 'ledger form respects layout');
  // unmatched builtin column
  await page.evaluate(() => { document.querySelectorAll('.modal-overlay').forEach(o=>o.remove()); employeeFilters._boardLevel='list'; employeeFilters.departmentId=''; DATA._cfAllHiddenFixed=DATA._cfAutoFlagsReset=DATA._cfShowInTableMigrated=true; syncAutoFields('employees'); const l = ensureFormLayout('employees'); const b = l.find(x=>x.key==='birthDate'); b.showInTable = true; b._userHidTable=false; DATA.formLayouts.employees = l; goToPage('employees'); rerenderCurrentPage(); }); await page.waitForTimeout(700);
  ok(await page.evaluate(() => [...document.querySelectorAll('#pageContent thead th')].some(t => /تاريخ الميلاد/.test(t.textContent) && getComputedStyle(t).display !== 'none')), 'ticked birthDate gets a column');
  // back row
  await page.evaluate(() => { const p = document.createElement('div'); p.innerHTML = '<button class="btn btn-outline btn-sm btn-back">← أ</button><button class="btn btn-outline btn-sm btn-back">← ب</button>'; document.getElementById('pageContent').prepend(p); }); await page.waitForTimeout(300);
  ok(await page.evaluate(() => !!document.querySelector('#pageContent .back-row .btn-back + .btn-back')), 'back buttons grouped in a row');
  await browser.close(); summary();
})();
