// المرحلة هـ: ربط السجلات بالمشروع بالمعرّف (schema 9)
const { openApp } = require('./harness');
const { baseUser, ok, eq, summary } = require('./lib');
(async () => {
  const seed = { users: [baseUser], schemaVersion: 8,
    projects: [{ id: 'pA', code: 'P1', name: 'مشروع الشروق', status: 'التنفيذ' }, { id: 'pB', code: 'P2', name: 'مشروع النور', status: 'التنفيذ' }],
    workers: [{ id: 'w1', name: 'عامل', project: 'مشروع الشروق' }],
    expenses: [{ id: 'e1', project: 'مشروع  الشروق', amount: 10, date: '2026-01-01' }, { id: 'e2', project: 'مشروع مجهول', amount: 5, date: '2026-01-01' }],
    costs: [{ id: 'c1', project: 'مشروع النور', amount: 7, date: '2026-01-01' }],
    fuelLogs: [{ id: 'f1', project: 'مشروع الشروق', cost: 3, date: '2026-01-01' }],
    resourceTransfers: [{ id: 't1', fromProject: 'مشروع الشروق', toProject: 'مشروع النور', date: '2026-01-01' }],
    clients: { customers: [] } };
  const { browser, page, errors } = await openApp(seed);
  const d = await page.evaluate(() => ({ v: DATA.schemaVersion, w: DATA.workers[0].projectId, e1: DATA.expenses[0].projectId, e2: DATA.expenses[1].projectId, c: DATA.costs[0].projectId,
    f: DATA.fuelLogs[0].projectId, tf: DATA.resourceTransfers[0].fromProjectId, tt: DATA.resourceTransfers[0].toProjectId, log: DATA.projectLinksLog }));
  eq(d.v, 9, 'schema 9');
  eq(d.w, 'pA', 'worker linked'); eq(d.e1, 'pA', 'normalized-name expense linked'); eq(d.e2, undefined, 'unknown name not linked');
  eq(d.c, 'pB', 'cost linked'); eq(d.f, 'pA', 'fuel linked'); eq(d.tf, 'pA', 'transfer from'); eq(d.tt, 'pB', 'transfer to');
  ok(d.log && d.log.unmatched['مشروع مجهول'] === 1 && d.log.linked >= 6, 'report lists unmatched ' + JSON.stringify(d.log));
  // نشر تغيير الاسم من نموذج المشروع
  await page.evaluate(() => { goToPage('projects'); openProjectModal('pA'); }); await page.waitForTimeout(300);
  await page.fill('#prName', 'الشروق الجديد');
  await page.evaluate(() => { [...document.querySelectorAll('.modal-footer .btn-primary, #btnSaveProject, #prSave')].pop().click(); }); await page.waitForTimeout(400);
  const r = await page.evaluate(() => ({ w: DATA.workers[0].project, e: DATA.expenses[0].project, f: DATA.fuelLogs[0].project, t: DATA.resourceTransfers[0].fromProject, other: DATA.costs[0].project, p: DATA.projects.find(x => x.id === 'pA').name }));
  eq(r.p, 'الشروق الجديد', 'project renamed');
  ok(r.w === r.p && r.e === r.p && r.f === r.p && r.t === r.p, 'rename propagated everywhere: ' + JSON.stringify(r));
  eq(r.other, 'مشروع النور', 'other project untouched');
  // تنبيه الأسماء غير المسجلة
  ok(await page.evaluate(() => collectAllAlerts().some(a => a.kind === 'proj-unlinked')), 'unlinked-name alert');
  ok(errors.length === 0, 'no errors ' + JSON.stringify(errors.slice(0, 3)));
  await browser.close(); summary();
})();
