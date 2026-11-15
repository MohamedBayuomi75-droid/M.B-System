const { openApp } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const seed = {
    users: [baseUser], schemaVersion: 6,
    supervisors: [{ id: 's1', name: 'مشرف 1', project: 'مشروع الشروق' }],
    projects: [
      { id: 'hr_p1', code: 'PRJ-0001', name: 'مشروع الشروق', budget: 900000, supervisorId: 's1', notes: 'ملاحظة HR', start: '2026-01-01', status: 'التنفيذ والمتابعة' }
    ],
    clients: { customers: [
      { id: 'cA', name: 'شركة الأمل', code: 'CUS-0001', projects: [
          { code: 'PRJ-0001', name: 'مشروع الشروق', value: 1500000, end: '2026-12-31', progress: 40, status: 'التنفيذ والمتابعة', stageKey: 'execution', stepKey: 'works_exec', completedSteps: ['survey_works'], stepMeta: { survey_works: { date: '2026-01-05' } }, assignedTo: 'أحمد' },
          { code: 'PRJ-0002', name: 'مشروع النيل', value: 700000, status: 'التعاقد', docs: [{ name: 'a.pdf' }] }
        ],
        contracts: [{ id: 'CON-0001', title: 'عقد الشروق', project: 'مشروع الشروق', value: 1500000 }],
        invoices: [{ no: 'INV-1', project: 'مشروع النيل', value: 100 }],
        boqs: [], workSurveys: [], collections: [] },
      { id: 'cB', name: 'شركة النور', code: 'CUS-0002', projects: [ { code: '', name: 'مشروع الشروق', value: 10 } ], contracts: [], invoices: [], boqs: [], workSurveys: [], collections: [] }
    ] }
  };
  const { browser, page, errors } = await openApp(seed);
  const D = () => page.evaluate(() => JSON.parse(JSON.stringify({ projects: DATA.projects, customers: DATA.clients.customers, log: DATA.clients.projectsUnifyLog, v: DATA.schemaVersion })));

  console.log('[1] migration schema 7');
  let d = await D();
  eq(d.v, 9, 'schemaVersion = 9');
  ok(d.customers.every(c => (c.projects || []).length === 0), 'customer.projects[] emptied');
  const shr = d.projects.filter(p => p.name === 'مشروع الشروق');
  eq(shr.length, 1, 'no duplicate for مشروع الشروق (HR + nested merged)');
  const p1 = shr[0];
  eq(p1.id, 'hr_p1', 'kept HR id');
  eq(p1.customerId, 'cA', 'linked to customer A');
  eq(p1.budget, 900000, 'HR budget preserved');
  eq(p1.supervisorId, 's1', 'HR supervisor preserved');
  eq(p1.notes, 'ملاحظة HR', 'HR notes preserved (not overwritten)');
  eq(p1.value, 1500000, 'commercial value filled from nested');
  eq(p1.end, '2026-12-31', 'end date filled');
  eq(p1.progress, 40, 'progress filled');
  eq(p1.assignedTo, 'أحمد', 'assignedTo filled');
  eq(p1.stageKey, 'execution', 'stageKey carried');
  eq(p1.completedSteps, ['survey_works'], 'completedSteps carried');
  eq(p1.stepMeta.survey_works.date, '2026-01-05', 'stepMeta carried');
  const nile = d.projects.find(p => p.name === 'مشروع النيل');
  ok(nile && nile.customerId === 'cA' && nile.docs.length === 1, 'nested-only project created with docs & customerId');
  const conflict = d.projects.find(p => p.customerId === 'cB');
  ok(conflict && conflict.name === 'مشروع الشروق (شركة النور)', 'same name under other customer → separate, renamed', conflict && conflict.name);
  eq(d.projects.length, 3, 'exactly 3 projects');
  const ct = d.customers[0].contracts[0], inv = d.customers[0].invoices[0];
  eq(ct.projectId, 'hr_p1', 'contract linked by projectId');
  eq(inv.projectId, nile.id, 'invoice linked by projectId');
  ok(d.log && d.log.created === 2 && d.log.merged === 1, 'migration log recorded', d.log);

  console.log('[2] BOQ save does NOT wipe project data (old bug)');
  await page.evaluate(() => { goToPage('clients.boqs'); });
  await page.waitForTimeout(200);
  await page.evaluate(() => { openBoqModal(); });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    document.getElementById('bqCust').value = 'cA'; document.getElementById('bqCust').dispatchEvent(new Event('change'));
    document.getElementById('bqTitle').value = 'مقايسة 1'; document.getElementById('bqProject').value = 'مشروع الشروق';
    const first = document.querySelector('#bqItemsBody tr input'); 
    document.querySelectorAll('#bqItemsBody tr')[0].querySelectorAll('input').forEach((i, k) => { if (k === 1) i.value = 'بند'; });
    document.getElementById('btnSaveBoq').click();
  });
  await page.waitForTimeout(300);
  d = await D();
  const p1b = d.projects.find(p => p.id === 'hr_p1');
  eq(p1b.budget, 900000, 'budget intact after BOQ');
  eq(p1b.start, '2026-01-01', 'start intact');
  eq(p1b.notes, 'ملاحظة HR', 'notes intact');
  eq(p1b.supervisorId, 's1', 'supervisor intact');
  eq(p1b.status, 'التنفيذ والمتابعة', 'stage not moved backwards by BOQ');
  const boq = d.customers[0].boqs[0];
  ok(boq && boq.projectId === 'hr_p1', 'BOQ linked to project by id', boq && boq.projectId);
  eq(d.projects.length, 3, 'still 3 projects (no duplicate created)');

  console.log('[3] name owned by another customer is blocked');
  const msg = await page.evaluate(() => { const c = clProjectNameConflict('cB', 'مشروع الشروق'); return c && c.owner; });
  eq(msg, 'شركة الأمل', 'conflict detected for other customer');

  console.log('[4] project created from customer screen appears in unified list');
  await page.evaluate(() => { goToPage('clients.customers'); customerFilters.detailId = 'cA'; rerenderCurrentPage(); });
  await page.waitForTimeout(200);
  await page.click('#custAddProject');
  await page.waitForTimeout(200);
  eq(await page.evaluate(() => document.getElementById('prCustomerId').value), 'cA', 'customer preselected in project modal');
  await page.evaluate(() => { document.getElementById('prName').value = 'مشروع جديد من العميل'; document.getElementById('prValue').value = '250000'; document.getElementById('btnSavePr').click(); });
  await page.waitForTimeout(300);
  d = await D();
  const np = d.projects.find(p => p.name === 'مشروع جديد من العميل');
  ok(np && np.customerId === 'cA' && np.value === 250000 && np.code, 'saved into DATA.projects with customerId + code', np);
  ok(await page.evaluate(() => document.body.innerText.includes('مشروع جديد من العميل')), 'shown in customer detail');
  await page.evaluate(() => { goToPage('projects'); });
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.body.innerText.includes('مشروع جديد من العميل')), 'shown in main projects page');

  console.log('[5] edit from projects page → reflected in customer detail; rename propagates');
  await page.evaluate(() => { openProjectModal('hr_p1'); });
  await page.waitForTimeout(200);
  await page.evaluate(() => { document.getElementById('prName').value = 'مشروع الشروق الجديد'; document.getElementById('btnSavePr').click(); });
  await page.waitForTimeout(300);
  d = await D();
  eq(d.customers[0].contracts[0].project, 'مشروع الشروق الجديد', 'contract project name follows rename');
  eq(d.customers[0].boqs[0].project, 'مشروع الشروق الجديد', 'boq project name follows rename');
  eq(d.supervisors, undefined, 'n/a');
  await page.evaluate(() => { goToPage('clients.customers'); customerFilters.detailId = 'cA'; rerenderCurrentPage(); });
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.body.innerText.includes('مشروع الشروق الجديد')), 'customer detail shows renamed project');

  console.log('[6] duplicate + delete guards');
  await page.evaluate(() => { goToPage('projects'); openProjectModal(); });
  await page.waitForTimeout(200);
  await page.evaluate(() => { document.getElementById('prName').value = 'مشروع النيل'; document.getElementById('btnSavePr').click(); });
  await page.waitForTimeout(200);
  d = await D();
  eq(d.projects.filter(p => p.name === 'مشروع النيل').length, 1, 'duplicate name rejected');
  await page.evaluate(() => closeModal());
  await page.waitForTimeout(100);
  await page.evaluate(() => { document.querySelector('.btn-del-proj[data-id="hr_p1"]').click(); });
  await page.waitForTimeout(300);
  d = await D();
  ok(d.projects.some(p => p.id === 'hr_p1'), 'project with contract/BOQ cannot be deleted');

  console.log('[7] re-import legacy file does not duplicate projects');
  const before = (await D()).projects.length;
  await page.evaluate(() => { clImportLegacyClientsData(JSON.stringify({ customers: [{ id: 'cA', name: 'شركة الأمل', projects: [{ code: 'PRJ-0002', name: 'مشروع النيل', value: 1 }, { code: 'PRJ-0009', name: 'مشروع جديد تماما', value: 5 }] }] })); });
  await page.waitForTimeout(200);
  d = await D();
  eq(d.projects.length, before + 1, 'import adds only the genuinely new project');
  eq(d.projects.find(p => p.name === 'مشروع النيل').value, 700000, 'existing value not overwritten by import');
  ok(d.customers[0].projects.length === 0, 'import keeps customer.projects empty');

  console.log('[8] customer delete detaches (does not delete) projects');
  await page.evaluate(() => { clDeleteCustomer('cB'); });
  d = await D();
  const orphan = d.projects.find(p => p.name === 'مشروع الشروق (شركة النور)');
  ok(orphan && !orphan.customerId, 'project kept, customer link cleared');

  console.log('[9] persistence: saved data reloads identical');
  await page.evaluate(() => saveData(true));
  await page.waitForTimeout(300);
  const saved = await page.evaluate(() => window.__saved);
  const { browser: b2, page: pg2, errors: e2 } = await openApp(saved);
  const d2 = await pg2.evaluate(() => ({ n: DATA.projects.length, v: DATA.schemaVersion, mig: (DATA.clients.customers[0].projects || []).length }));
  eq(d2.v, 9, 'reloaded schema 9');
  eq(d2.n, (await D()).projects.length, 'same project count after reload');
  await b2.close();
  await browser.close();
  summary(errors.concat(e2));
})();
