const { openApp } = require('./harness');
const { baseUser, ok, summary } = require('./lib');
(async () => {
  const seed = { users: [baseUser], schemaVersion: 9,
    employees: [{ id: 'e1', name: 'أحمد', code: 'E1', salary: 100, status: 'active', email: 'a@b.c', contractType: 'دائم', idCardExpiry: '2030-01-01' }] };
  const { browser, page, errors } = await openApp(seed);
  const cols = () => page.evaluate(() => { const t = document.querySelector('#pageContent table.data-table'); const vis = [...t.querySelectorAll('thead th')].filter(x => getComputedStyle(x).display !== 'none'); const lastBtns = t.querySelectorAll('tbody tr:first-child td:last-child button').length; return { n: vis.length, btns: lastBtns, heads: vis.map(x => x.innerText.trim()) }; });
  const openList = async () => { await page.evaluate(() => { employeeFilters._boardLevel = 'list'; employeeFilters.departmentId = ''; goToPage('employees'); rerenderCurrentPage(); }); await page.waitForTimeout(600); };
  await openList(); const base = await cols();
  ok(base.btns >= 2, 'action buttons present: ' + base.btns);
  // فتح الإعدادات لاكتشاف الخانات التلقائية (كلها showInTable=false) — يجب ألا تُخفي أي عمود
  await page.evaluate(() => { goToPage('backup'); }); await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector('.settings-tab[data-panel=customfields]').click()); await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('.cf-ent-tab[data-val=employees]').click()); await page.waitForTimeout(900);
  ok(await page.evaluate(() => !document.getElementById('cfTablePreview') && !document.querySelector('.cf-tp-wrap')), 'table preview removed');
  ok(await page.evaluate(() => [...document.querySelectorAll('#cfFieldsList .cf-show')].every(c => !c.disabled)), 'no locked table checkboxes');
  ok(await page.evaluate(() => { const b = document.getElementById('btnCfAdd'), l = document.getElementById('cfFieldsList'); return b && (l.compareDocumentPosition(b) & 4) > 0; }), 'add button below list');
  ok(await page.evaluate(() => { const ths = [...document.querySelectorAll('#cfFieldsList .cf-table thead th')].map(t => Math.round(t.getBoundingClientRect().width)); const mid = ths.slice(2, 10); return Math.max(...mid) - Math.min(...mid) <= 3; }), 'settings columns equal width');
  await openList(); const after = await cols();
  ok(after.n >= base.n && after.btns >= 2, 'no columns/buttons lost after discovery: ' + base.n + ' -> ' + after.n + ' btns ' + after.btns);
  ok(base.heads.every(h => after.heads.includes(h)), 'same headers kept'); console.log('new:', after.heads.filter(h => !base.heads.includes(h)).join(','));
  // إظهار خانة تلقائية كعمود
  await page.evaluate(() => { const f = ensureFormLayout('employees').find(y => y.key === 'f_empEmail'); f.showInTable = true; rerenderCurrentPage(); }); await page.waitForTimeout(600);
  ok(await page.evaluate(() => { const t = document.querySelector('#pageContent table.data-table'); const i = [...t.querySelectorAll('thead th')].findIndex(x => /البريد/.test(x.textContent)); return i >= 0 && /a@b\.c/.test(t.querySelector('tbody tr').children[i].textContent); }), 'auto field shows as table column');
  ok((await cols()).btns >= 2, 'buttons still present with auto column');
  // عرض الخانة بالبكسل داخل النموذج الفعلي
  const w = await page.evaluate(async () => { const f = ensureFormLayout('employees').find(y => y.key === 'name'); f.width = 260; openEmployeeModal(); await new Promise(r => setTimeout(r, 350)); const el = document.querySelector('#appModal #empName'); const lab = el.closest('label'); const r = Math.round(lab.getBoundingClientRect().width / (parseFloat(getComputedStyle(document.querySelector('#appModal .modal')).zoom) || 1)); closeModal(); return r; });
  ok(Math.abs(w - 260) <= 3, 'field width px applied: ' + w);
  // حفظ العرض من الإعدادات
  await page.evaluate(() => { goToPage('backup'); }); await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector('.settings-tab[data-panel=customfields]').click()); await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector('.cf-ent-tab[data-val=employees]').click()); await page.waitForTimeout(900);
  ok(await page.evaluate(() => { const i = document.querySelector('#cfFieldsList tr[data-cf-key="code"] .cf-w'); return !!i; }), 'width input exists');
  await page.evaluate(() => { const i = document.querySelector('#cfFieldsList tr[data-cf-key="code"] .cf-w'); i.value = '400'; i.dispatchEvent(new Event('change', { bubbles: true })); }); await page.waitForTimeout(300);
  ok(await page.evaluate(() => (DATA.formLayouts.employees.find(x => x.key === 'code') || {}).width === 400), 'width 400 stored');
  // المعاينة بحجم النموذج الأصلي
  ok(await page.evaluate(() => { const p = document.getElementById('cfFormPreview'); const mw = window.__cfModalW; return mw > 200 && p.style.width === mw + 'px'; }), 'preview uses real modal width');
  ok(errors.length === 0, 'no errors ' + errors.join('|'));
  await browser.close(); summary();
})();
