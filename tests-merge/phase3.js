const { openApp } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const seed = { users: [baseUser], schemaVersion: 7, projects: [
      { id: 'pA', code: 'PRJ-0001', name: 'مشروع أ', customerId: 'cA', customerName: 'شركة الأمل', status: 'الدراسة والتخطيط' },
      { id: 'pL', code: 'PRJ-0002', name: 'مشروع قديم', customerId: 'cA', status: 'التنفيذ والمتابعة', stageKey: 'execution', stepKey: 'works_exec', completedSteps: ['survey_works'], stepMeta: { survey_works: { date: '2026-01-05' } }, stepFiles: {} }
    ], clients: { customers: [{ id: 'cA', name: 'شركة الأمل', code: 'CUS-0001', projects: [], contracts: [], invoices: [], boqs: [], workSurveys: [], collections: [] }] } };
  const { browser, page, errors } = await openApp(seed);
  const P = (id) => page.evaluate((id) => JSON.parse(JSON.stringify(DATA.projects.find(p => p.id === id))), id);
  const call = (fn, ...a) => page.evaluate(([fn, a]) => { const p = DATA.projects.find(x => x.id === a[0]); const r = window[fn](p, ...a.slice(1)); return r; }, [fn, a]);
  // stub file picker
  await page.evaluate(() => { let n = 0; window.desktopApi.pickAttachments = async (owner, label) => ({ files: [{ path: '/tmp/f' + (++n) + '.pdf', storedName: 'f' + n + '.pdf', name: 'ملف' + n + '.pdf', mime: 'application/pdf' }] }); window.desktopApi.openAttachment = async (p) => { window.__opened = p; return { ok: true }; }; });

  console.log('[1] render interactive track in project detail');
  await page.evaluate(() => { goToPage('projects'); projectFilters.detailId = 'pA'; rerenderCurrentPage(); });
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => !!document.querySelector('.ppt2[data-pid="pA"]')), 'ppt2 panel rendered');
  eq(await page.evaluate(() => document.querySelectorAll('.ppt-node-stage').length), 10, '10 stage nodes');
  eq(await page.evaluate(() => document.querySelectorAll('.ppt2-step').length), 3, '3 steps shown for current stage');
  ok(await page.evaluate(() => document.querySelector('.ppt-head-main').innerText.includes('حصر الأعمال')), 'current step shown');

  console.log('[2] advance via UI button: step completed with dates, moves to next');
  await page.click('#pwAdvance'); await page.waitForTimeout(300);
  let p = await P('pA');
  eq(p.stepMeta.survey_works.status, 'done', 'survey_works done');
  ok(p.stepMeta.survey_works.startDate && p.stepMeta.survey_works.endDate, 'start/end dates recorded');
  eq(p.stepKey, 'boq', 'moved to next step (boq)');
  eq(p.completedSteps, ['survey_works'], 'completedSteps updated');
  eq(p.status, 'الدراسة والتخطيط', 'status label = stage');
  ok(p.workflowSnapshot && p.workflowSnapshot.stages.length === 10, 'workflow snapshot frozen on project');
  ok(p.pathHistory.length >= 1 && p.pathHistory[p.pathHistory.length - 1].action === 'إتمام خطوة', 'history entry written');

  console.log('[3] skip requires reason; gate between stages');
  let r = await call('pwSkip', 'pA', 'boq', '');
  eq(r.ok, false, 'skip without reason refused');
  r = await call('pwStart', 'pA', 'initial_insurance');
  eq(r.ok, false, 'cannot enter next stage with pending required steps'); ok(/كراسة|المقايسة/.test(r.msg), 'message names pending steps', r.msg);
  r = await call('pwSkip', 'pA', 'boq', 'مقايسة جاهزة من العميل');
  eq(r.ok, true, 'skip with reason ok');
  r = await call('pwComplete', 'pA', 'buy_tender_book', {});
  eq(r.ok, true, 'complete 3rd step');
  p = await P('pA');
  eq(p.stepMeta.boq.status, 'skipped', 'boq skipped'); eq(p.stepMeta.boq.skipReason, 'مقايسة جاهزة من العميل', 'skip reason saved');
  eq(p.stageKey, 'docs', 'auto-moved into next stage after finishing stage 1'); eq(p.status, 'تجهيز المستندات', 'status label follows stage');
  eq(await page.evaluate(() => pwStepStatus(DATA.projects[0], 'boq')), 'skipped', 'derived status skipped');

  console.log('[4] attachments per step (existing storage API)');
  await page.evaluate(() => { openStepModal(DATA.projects[0], 'tech_envelopes'); }); await page.waitForTimeout(200);
  await page.click('#pwAttach'); await page.waitForTimeout(250);
  p = await P('pA');
  eq((p.stepFiles.tech_envelopes || []).length, 1, 'file stored on step'); eq(p.stepFiles.tech_envelopes[0].path, '/tmp/f1.pdf', 'stored path from desktopApi');
  ok(p.docs.some(d => d.stepKey === 'tech_envelopes'), 'also in project docs (archive)');
  ok(await page.evaluate(() => document.getElementById('pwAttList').innerText.includes('ملف1.pdf')), 'listed in modal');
  await page.click('.cl-att-open'); await page.waitForTimeout(100);
  eq(await page.evaluate(() => window.__opened), '/tmp/f1.pdf', 'open uses desktopApi.openAttachment');
  await page.evaluate(() => closeModal()); await page.waitForTimeout(250);

  console.log('[5] people, dates, due date → late');
  await page.evaluate(() => { openStepModal(DATA.projects[0], 'initial_insurance'); }); await page.waitForTimeout(200);
  await page.evaluate(() => { (DATA.supervisors = DATA.supervisors || []).push({ id: 'sx', name: 'م. أحمد' }); document.getElementById('pwRespId').value = 'sx'; pwSetStepData(DATA.projects[0], 'initial_insurance', { dueDate: '2020-01-01' }); document.getElementById('pwCmText').value = 'بانتظار البنك'; document.getElementById('pwSave').click(); });
  await page.waitForTimeout(300);
  p = await P('pA');
  eq(p.stepMeta.initial_insurance.responsible, 'م. أحمد', 'responsible saved'); eq(p.stepMeta.initial_insurance.comments[0].text, 'بانتظار البنك', 'comment saved');
  eq(await page.evaluate(() => pwStepStatus(DATA.projects[0], 'initial_insurance')), 'late', 'overdue step → late');
  r = await call('pwSetStepData', 'pA', 'initial_insurance', { startDate: '2026-05-10', endDate: '2026-05-01' });
  eq(r.ok, false, 'end before start rejected');

  console.log('[6] tender stance: reject needs reason, cancels project status, blocks later stages; reopen restores');
  await call('pwComplete', 'pA', 'initial_insurance', {}); await call('pwComplete', 'pA', 'tech_envelopes', {}); await call('pwComplete', 'pA', 'fin_envelopes', {});
  await call('pwComplete', 'pA', 'tech_committee', {}); await call('pwComplete', 'pA', 'fin_committee', {});
  p = await P('pA'); eq(p.stepKey, 'project_stance', 'at stance step');
  r = await call('pwReject', 'pA', 'project_stance', ''); eq(r.ok, false, 'reject w/o reason refused');
  r = await call('pwComplete', 'pA', 'project_stance', {}); eq(r.ok, false, 'cannot complete stance without acceptance');
  r = await call('pwReject', 'pA', 'project_stance', 'السعر أعلى من المنافسين'); eq(r.ok, true, 'reject with reason');
  p = await P('pA');
  eq(p.tenderStance, 'rejected', 'stance rejected'); eq(p.rejectReason, 'السعر أعلى من المنافسين', 'reason stored'); eq(p.status, 'ملغي', 'project status → ملغي');
  eq(await page.evaluate(() => pwStepStatus(DATA.projects[0], 'project_stance')), 'rejected', 'step status rejected');
  r = await call('pwStart', 'pA', 'guarantee_letter'); eq(r.ok, false, 'later stages blocked after rejection');
  r = await call('pwReopen', 'pA', 'project_stance', 'العميل أعاد العرض'); eq(r.ok, true, 'reopen stance');
  p = await P('pA'); eq(p.tenderStance, '', 'stance cleared'); eq(p.status, 'المناقصة وترسية المشروع', 'status restored to stage');
  eq(p.stepMeta.project_stance.rejectReason, '', 'reject reason cleared on step');
  ok(p.pathHistory.some(h => h.action === 'رفض العرض' && h.note === 'السعر أعلى من المنافسين'), 'rejection kept in history');
  r = await call('pwAccept', 'pA', 'project_stance', 'تمت الترسية'); eq(r.ok, true, 'accept');
  p = await P('pA'); eq(p.tenderStance, 'accepted', 'accepted'); eq(p.stageKey, 'contracting', 'moved to contracting'); eq(p.status, 'التعاقد', 'status التعاقد');

  console.log('[7] reopen earlier step rolls later steps back but keeps their data');
  const filesBefore = (await P('pA')).stepFiles.tech_envelopes.length;
  r = await call('pwReopen', 'pA', 'tech_envelopes', 'نقص مستند');
  p = await P('pA');
  eq(p.stepKey, 'tech_envelopes', 'position moved back'); eq(p.stepMeta.tech_envelopes.status, 'in_progress', 'reopened step in progress');
  eq(p.stepMeta.fin_envelopes.status, 'pending', 'later step reset'); eq(p.stepFiles.tech_envelopes.length, filesBefore, 'files kept');
  eq(p.tenderStance, '', 'stance cleared when rolling back before it');
  eq(p.status, 'تجهيز المستندات', 'status follows rollback');

  console.log('[8] mandatory attachment (per-step flag) blocks completion until attached');
  await page.evaluate(() => { const p = DATA.projects.find(x => x.id === 'pA'); p.workflowSnapshot.stages.find(s => s.key === 'docs').steps.find(s => s.key === 'fin_envelopes').needsAttach = true; });
  r = await call('pwComplete', 'pA', 'fin_envelopes', {}); eq(r.ok, false, 'blocked without attachment'); ok(/مرفق/.test(r.msg), 'message mentions attachment');
  await call('pwAddFiles', 'pA', 'fin_envelopes', [{ id: 'd1', name: 'x.pdf', path: '/tmp/x.pdf' }]);
  r = await call('pwComplete', 'pA', 'fin_envelopes', {}); eq(r.ok, true, 'allowed after attachment');
  await call('pwComplete', 'pA', 'tech_envelopes', {});

  console.log('[9] legacy project data (from original app) displays correctly');
  eq(await page.evaluate(() => pwStepStatus(DATA.projects.find(x => x.id === 'pL'), 'survey_works')), 'done', 'legacy completedSteps → done');
  const pl = await page.evaluate(() => { const p = DATA.projects.find(x => x.id === 'pL'); pwEnsure(p); return { end: p.stepMeta.survey_works.endDate, cur: pwCurrent(p).stepKey }; });
  eq(pl.end, '2026-01-05', 'legacy date → endDate'); eq(pl.cur, 'works_exec', 'legacy position kept');

  console.log('[10] other modules move the path forward only');
  await page.evaluate(() => { const c = clCustomerById('cA'); clEnsureProject(c, { name: 'مشروع أ', advanceTo: 'المستخلصات' }); });
  p = await P('pA'); eq(p.stageKey, 'invoices', 'contract/invoice event moved path stage'); eq(p.status, 'المستخلصات', 'status label');
  await page.evaluate(() => { clEnsureProject(clCustomerById('cA'), { name: 'مشروع أ', advanceTo: 'التعاقد' }); });
  p = await P('pA'); eq(p.stageKey, 'invoices', 'never moves backwards');

  console.log('[11] HR project modal stage change moves path position');
  await page.evaluate(() => { openProjectModal('pA'); }); await page.waitForTimeout(200);
  await page.evaluate(() => { document.getElementById('prStatus').value = 'المراجعة المالية'; document.getElementById('btnSavePr').click(); });
  await page.waitForTimeout(300);
  p = await P('pA'); eq(p.stageKey, 'fin_review', 'path moved by modal status'); eq(p.status, 'المراجعة المالية', 'status ok');
  eq(await page.evaluate(() => Array.from(document.querySelectorAll('#prStatus option')).length === 0 ? 'n/a' : 'ok'), 'n/a', 'modal closed');

  console.log('[12] persistence');
  await page.evaluate(() => saveData(true)); await page.waitForTimeout(300);
  const saved = await page.evaluate(() => window.__saved);
  const { browser: b2, page: pg2, errors: e2 } = await openApp(saved);
  const d2 = await pg2.evaluate(() => { const p = DATA.projects.find(x => x.id === 'pA'); return { stage: p.stageKey, hist: p.pathHistory.length, files: Object.keys(p.stepFiles).length, snap: !!p.workflowSnapshot, rej: p.stepMeta.project_stance.rejectReason, due: p.stepMeta.initial_insurance.dueDate, resp: p.stepMeta.initial_insurance.responsible }; });
  eq(d2.stage, 'fin_review', 'stage after reload'); ok(d2.hist > 10, 'history after reload', d2.hist); ok(d2.files >= 2, 'step files after reload'); ok(d2.snap, 'snapshot after reload');
  eq(d2.resp, 'م. أحمد', 'responsible after reload'); eq(d2.due, '2020-01-01', 'due date after reload');
  await b2.close(); await browser.close();
  summary(errors.concat(e2));
})();
