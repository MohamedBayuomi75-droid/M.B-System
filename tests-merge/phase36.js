const { openApp } = require('./harness');
const { baseUser, ok, summary } = require('./lib');
(async () => {
  const t = new Date(); const plus = n => { const d = new Date(t); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const seed = { users: [baseUser], schemaVersion: 9,
    employees: [{ id: 'e1', name: 'أحمد', code: 'E1', status: 'active', idCardExpiry: '2030-01-01', licenseExpiry: '2030-01-01' }],
    supervisors: [{ id: 's1', name: 'مشرف', code: 'S1', status: 'active' }], drivers: [{ id: 'd1', name: 'سائق', code: 'D1', status: 'inactive' }],
    workers: [{ id: 'w1', name: 'عامل', code: 'W1', status: 'active' }],
    leaves: [{ id: 'l1', employeeId: 'e1', personId: 'e1', personKind: 'employee', status: 'approved', type: 'annual', from: plus(-1), to: plus(5) }] };
  const { browser, page, errors } = await openApp(seed);
  const expect = '— اختر —|نشط|في إجازة|مستقيل|على المعاش';
  const optsOf = async (fn, sel) => page.evaluate(async ([fn, sel]) => { eval(fn + '()'); await new Promise(r => setTimeout(r, 300)); const o = [...document.querySelectorAll('#appModal ' + sel + ' option')].map(x => x.textContent.trim()).join('|'); closeModal(); await new Promise(r => setTimeout(r, 250)); return o; }, [fn, sel]);
  await page.waitForTimeout(500); ok(await optsOf('openEmployeeModal', '#empStatus') === expect, 'employee status order');
  ok(await optsOf('openWorkerModal', '#wrkStatus') === expect, 'worker status order');
  ok(await optsOf('openSupervisorModal', '#supStatus') === expect, 'supervisor status order');
  ok(await optsOf('openDriverModal', '#drvStatus') === expect, 'driver status order');
  // في إجازة حتى — أسفل الحالة، و ⚠️ قبل الاسم
  await page.evaluate(() => { employeeFilters._boardLevel = 'list'; employeeFilters.departmentId = ''; goToPage('employees'); rerenderCurrentPage(); }); await page.waitForTimeout(600);
  const r = await page.evaluate(() => { const t = document.querySelector('#pageContent table.data-table'); const tr = t.querySelector('tbody tr'); const name = tr.querySelector('td[data-col-key=name]'); const st = tr.querySelector('td[data-col-key=status]') || [...tr.children].find(td => /في إجازة/.test(td.textContent) && td.querySelector('.leave-until')); const w = name.querySelector('.doc-warn'), s = name.querySelector('strong'); return { warnFirst: !!(w && s && (w.compareDocumentPosition(s) & 4)), until: !!(st && st.querySelector('.leave-until')), nameNoLeave: !name.querySelector('.leave-badge') }; });
  ok(r.warnFirst, '⚠️ before name'); ok(r.until, 'leave-until under status'); ok(r.nameNoLeave, 'no leave badge by name');
  // إخفاء انتهاء البطاقة/الرخصة من الإعدادات
  await page.evaluate(() => { goToPage('backup'); }); await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector('.settings-tab[data-panel=customfields]').click()); await page.waitForTimeout(500);
  ok(await page.evaluate(() => document.querySelectorAll('#cfEntityTabs .cf-grp').length >= 5 && !!document.querySelector('.cf-layout .cf-main #cfFormPreview')), 'sidebar groups + preview beside');
  await page.evaluate(() => document.querySelector('.cf-ent-tab[data-val=employees]').click()); await page.waitForTimeout(900);
  await page.evaluate(() => { for (const sel of ['tr[data-cf-key=cardExpiry] .cf-show', 'tr[data-cf-key$=empLicExp] .cf-show', 'tr[data-cf-key=f_empLicExp] .cf-show', 'tr[data-cf-key=f_empLicStatus] .cf-show', 'tr[data-cf-key=f_empIdCardStatus] .cf-show']) { const c = document.querySelector('#cfFieldsList ' + sel); if (c) { c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })); } } }); await page.waitForTimeout(400);
  await page.evaluate(() => { employeeFilters._boardLevel = 'list'; goToPage('employees'); rerenderCurrentPage(); }); await page.waitForTimeout(700);
  const heads = await page.evaluate(() => [...document.querySelector('#pageContent table.data-table').querySelectorAll('thead th')].filter(x => getComputedStyle(x).display !== 'none').map(x => x.innerText.trim()));
  ok(!heads.some(h => /انتهاء البطاقة|حالة البطاقة|انتهاء الرخصة|حالة الرخصة/.test(h)), 'card/license columns hidden: ' + heads.join(','));
  // لا وميض: تبديل القائمة لا يترك حالة اختفاء
  await page.evaluate(() => { goToPage('backup'); }); await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('.settings-tab[data-panel=customfields]').click()); await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector('.cf-ent-tab[data-val=workers]').click());
  ok(await page.evaluate(() => { const st = document.getElementById('cfStage'); return !st.classList.contains('cf-stage-out') && getComputedStyle(st).opacity === '1'; }), 'stage stays visible on switch');
  await page.waitForTimeout(800);
  ok(await page.evaluate(() => document.querySelectorAll('#cfFormPreview label').length > 10), 'preview rendered');
  ok(errors.length === 0, 'no errors ' + errors.join('|'));
  await browser.close(); summary();
})();
