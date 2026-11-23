/**
 * قواعد المشروعات (7.4.4، DEC-0117) — **نقل حرفي من الواجهة القديمة**، والمقارنة بالدوال القديمة نفسها في tests-merge/phase72.js:
 *  - مسار المشروع (project-workflow.js): normalizeWorkflow، وcanonicalStatus، وcurrent، وstepStatus، وonStatusChanged (pwOnStatusChanged)، وlateSteps.
 *  - المرحلة المعروضة (normalizeProjectStatus، pages-projects.js:25) وقايمة المراحل (pwApplyStagesToProjectList).
 *  - البحث (smartMatch، smart-tools.js) والفلاتر والكروت (renderProjectsPage) والموارد (resourcesOnProject، helpers.js:7918).
 *  - نشر تغيير الاسم والربط بالمعرّف (projLinkAll، project-links.js:34؛ clRenameProjectRefs، clients/helpers.js:212).
 *  - الكود التلقائي (nextCode/nextProjectCode) والتقريب (toInt = round2) وتطبيع الاسم (clNormName).
 * **مش منقول (DEC-0117 د-6):** حساب التكلفة (projectCostSummary، F-12) وكل اللي بيعتمد عليه: عمود التكلفة، وفلتر حالة الميزانية، وتنبيه تجاوزها.
 */
export type J = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

// ---------------- أرقام ونصوص (helpers.js)
/** round2 (helpers.js:15) */
export function round2(n: unknown): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round((x + (x < 0 ? -Number.EPSILON : Number.EPSILON)) * 100) / 100;
}
const EAST = '٠١٢٣٤٥٦٧٨٩', PERS = '۰۱۲۳۴۵۶۷۸۹';
/** toInt (helpers.js:21) — اسمه toInt بس بيقرّب لخانتين */
export function toInt(n: unknown): number {
  if (n == null || n === '') return 0;
  if (typeof n === 'number') return Number.isFinite(n) ? round2(n) : 0;
  let s = String(n).trim();
  s = s.replace(/[٠-٩]/g, (d) => String(EAST.indexOf(d))).replace(/[۰-۹]/g, (d) => String(PERS.indexOf(d)));
  s = s.replace(/٫/g, '.').replace(/[٬،]/g, '').replace(/,/g, '').replace(/[^\d.-]/g, '');
  const x = Number(s);
  return Number.isFinite(x) ? round2(x) : 0;
}
/** clNormName (clients/helpers.js:44) */
export const normName = (s: unknown) => String(s == null ? '' : s).replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim().toLowerCase();
/** sortByNameAr (helpers.js:167) */
export const byNameAr = <T>(list: T[], nameFn: (x: T) => unknown) => list.slice().sort((a, b) => String(nameFn(a) || '').localeCompare(String(nameFn(b) || ''), 'ar', { sensitivity: 'base' }));
/** nextCode (helpers.js:7738) */
export function nextCode(prefix: string, list: J[], field = 'code'): string {
  const used = new Set<string>();
  let max = 0;
  const pre = String(prefix).toUpperCase();
  for (const item of list) {
    const c = String(item[field] || '').trim().toUpperCase();
    if (!c) continue;
    used.add(c);
    if (c.startsWith(pre)) { const num = parseInt(c.slice(pre.length).replace(/^[-_\s]+/, ''), 10); if (Number.isFinite(num) && num > max) max = num; }
    else { const num = parseInt(c.replace(/\D/g, ''), 10); if (Number.isFinite(num) && num > max) max = num; }
  }
  let n = max + 1, code: string;
  do { code = pre + String(n).padStart(3, '0'); n++; } while (used.has(code));
  return code;
}

// ---------------- البحث الذكي (smart-tools.js)
function normAr(s: unknown): string {
  if (s == null) return '';
  return String(s).toLowerCase().replace(/[ً-ٰٟـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (d) => String(EAST.indexOf(d))).replace(/[۰-۹]/g, (d) => String(PERS.indexOf(d)));
}
const searchWords = (s: unknown) => { const t = normAr(s); return t ? t.split(/[^\p{L}\p{N}]+/u).filter(Boolean) : []; };
function xWordHit(qt: string, words: string[]): number {
  for (let i = 0; i < words.length; i++) if (words[i].indexOf(qt) === 0) return i;
  if (/^[0-9]{3,}$/.test(qt)) for (let i = 0; i < words.length; i++) if (/[0-9]/.test(words[i]) && words[i].indexOf(qt) >= 0) return i;
  for (let i = 0; i < words.length - 1; i++) if (qt.length > words[i].length && (words[i] + words[i + 1]).indexOf(qt) === 0) return i;
  return -1;
}
/** smartMatch: كل كلمة بحث لازم تكون بداية كلمة في النص */
export function smartMatch(blob: unknown, q: unknown): boolean {
  const toks = searchWords(q);
  if (!toks.length) return true;
  const words = searchWords(blob);
  return toks.every((t) => xWordHit(t, words) >= 0);
}

// ---------------- مسار المشروع (project-workflow.js)
interface Step { key: string; label: string; optional: boolean; stance: boolean; needsDate: boolean; needsAttach: boolean; needsReason: boolean; dueDays: number }
export interface Stage { id: unknown; key: string; label: string; short: string; exclusive: boolean; gate: 'none' | 'required'; steps: Step[] }
const W = (id: number, key: string, label: string, short: string, steps: [string, string, J?][], extra: J = {}) => ({ id, key, label, short, ...extra, steps: steps.map(([k, l, o]) => ({ key: k, label: l, ...(o || {}) })) });
export const DEFAULT_WORKFLOW = [
  W(1, 'study', 'الدراسة والتخطيط', 'دراسة', [['survey_works', 'حصر الأعمال'], ['boq', 'المقايسة'], ['buy_tender_book', 'شراء كراسة الشروط']]),
  W(2, 'docs', 'تجهيز المستندات', 'مستندات', [['initial_insurance', 'التأمين الابتدائي'], ['tech_envelopes', 'تجهيز المظاريف الفنية'], ['fin_envelopes', 'تجهيز المظاريف المالية']]),
  W(3, 'tender', 'المناقصة وترسية المشروع', 'مناقصة', [['tech_committee', 'تقديم اللجنة الفنية'], ['fin_committee', 'تقديم اللجنة المالية'], ['project_stance', 'موقف المشروع (قبول / رفض)', { stance: true }]], { exclusive: true }),
  W(4, 'contracting', 'التعاقد', 'تعاقد', [['guarantee_letter', 'إصدار خطاب ضمان'], ['insurance_policy', 'إصدار بلايص التأمين'], ['refund_initial', 'رد التأمين الابتدائي'], ['site_handover', 'استلام موقع'], ['car_check', 'إصدار شيك السيارات'], ['attach_a_contract', 'مرفق أ والعقد']]),
  W(5, 'execution', 'التنفيذ والمتابعة', 'تنفيذ', [['works_exec', 'تنفيذ الأعمال'], ['inspect_match', 'فحص ومطابقة الأعمال']]),
  W(6, 'invoices', 'المستخلصات', 'مستخلصات', [['prep_survey_book', 'تجهيز دفتر الحصر'], ['prep_invoice', 'تجهيز المستخلص'], ['lab_results', 'نتائج الاختبارات المعملية'], ['deliver_invoice', 'تسليم المستخلص']]),
  W(7, 'fin_review', 'المراجعة المالية', 'مراجعة', [['labor_cert', 'استخراج شهادة القوى العاملة'], ['insurance_cert', 'استخراج شهادة التأمينات'], ['form41', 'تجهيز نموذج 41 والإقرارات']]),
  W(8, 'prelim_delivery', 'التسليم الابتدائي', 'تسليم ابتدائي', [['tech_inspect', 'المعاينة الفنية'], ['prelim_hand', 'تسليم المشروع الابتدائي']]),
  W(9, 'central', 'الإدارة المركزية للحسابات', 'حسابات مركزية', [['e_invoice', 'إصدار الفاتورة الإلكترونية'], ['review_invoice', 'مراجعة المستخلص'], ['pay_inv', 'تم صرف المستخلص'], ['deductions', 'الاستقطاعات']]),
  W(10, 'closure', 'الإغلاق والتسليم النهائي', 'إغلاق', [['maintenance', 'فترة الصيانة (إن وُجدت)', { optional: true }], ['final_hand', 'التسليم النهائي'], ['release_guarantees', 'صرف خطابات الضمان والاحتجازات']]),
];
const STATUS_ALIASES: Record<string, { stage: string; step: string }> = {
  'التسليم النهائي': { stage: 'closure', step: 'final_hand' },
  'معاينة': { stage: 'study', step: 'survey_works' }, 'تخطيط': { stage: 'study', step: 'survey_works' },
  'جديدة': { stage: 'study', step: 'survey_works' }, 'حصر': { stage: 'study', step: 'survey_works' },
  'عرض سعر': { stage: 'tender', step: 'project_stance' }, 'تفاوض': { stage: 'tender', step: 'project_stance' },
  'تعاقد': { stage: 'contracting', step: 'guarantee_letter' }, 'ساري': { stage: 'contracting', step: 'guarantee_letter' },
  'شهادة قوى عاملة': { stage: 'fin_review', step: 'labor_cert' },
  'جاري التنفيذ': { stage: 'execution', step: 'works_exec' }, 'تنفيذ': { stage: 'execution', step: 'works_exec' },
  'مستخلصات': { stage: 'invoices', step: 'prep_invoice' },
  'تسليم جزئي': { stage: 'central', step: 'pay_inv' },
  'استلام ابتدائي': { stage: 'prelim_delivery', step: 'prelim_hand' },
  'استلام نهائي': { stage: 'closure', step: 'final_hand' },
  'مغلق': { stage: 'closure', step: 'release_guarantees' }, 'منتهي': { stage: 'closure', step: 'release_guarantees' },
  running_inv: { stage: 'invoices', step: 'prep_survey_book' },
};
export const TERMINAL = ['مكتمل', 'متوقف', 'ملغي'];

/** pwNormalizeWorkflow */
export function normalizeWorkflow(raw: unknown): Stage[] {
  if (!Array.isArray(raw) || !raw.length) return normalizeWorkflow(DEFAULT_WORKFLOW);
  const usedStage: Record<string, boolean> = {};
  const out: Stage[] = [];
  raw.forEach((s: J, i: number) => {
    if (!s || !s.key || usedStage[s.key]) return;
    usedStage[s.key] = true;
    const usedStep: Record<string, boolean> = {};
    const steps = (Array.isArray(s.steps) ? s.steps : []).filter((st: J) => {
      if (!st || !st.key || !String(st.label || '').trim() || usedStep[st.key]) return false;
      usedStep[st.key] = true; return true;
    }).map((st: J) => ({ key: String(st.key), label: String(st.label).trim(), optional: !!st.optional, stance: !!st.stance,
      needsDate: st.needsDate !== false, needsAttach: !!st.needsAttach, needsReason: !!st.needsReason, dueDays: st.dueDays > 0 ? Number(st.dueDays) : 0 }));
    if (!steps.length) return;
    out.push({ id: s.id != null ? s.id : i + 1, key: String(s.key), label: String(s.label || s.key).trim() || String(s.key), short: String(s.short || '').trim(),
      exclusive: !!s.exclusive, gate: s.gate === 'none' ? 'none' : 'required', steps });
  });
  return out.length ? out : normalizeWorkflow(DEFAULT_WORKFLOW);
}

/** السياق اللي القواعد محتاجاه من برّه: مسار الإعدادات (clients.settings.projectWorkflow)، والنهارده، والوقت، واسم المستخدم، ومولّد المعرّفات */
export interface WfCtx { settingsWorkflow: unknown; today: string; nowIso: string; userName: string; uid: () => string }
const settingsWf = (c: Pick<WfCtx, 'settingsWorkflow'>) => normalizeWorkflow(c.settingsWorkflow);
/** pwWorkflowOf: النسخة المثبّتة على المشروع لو موجودة، وإلا مسار الإعدادات */
export function workflowOf(p: J, c: Pick<WfCtx, 'settingsWorkflow'>): Stage[] {
  if (p && p.workflowSnapshot && Array.isArray(p.workflowSnapshot.stages) && p.workflowSnapshot.stages.length) return normalizeWorkflow(p.workflowSnapshot.stages);
  return settingsWf(c);
}
/** PROJECT_STAGES بعد pwApplyStagesToProjectList */
export const projectStages = (c: Pick<WfCtx, 'settingsWorkflow'>) => [...settingsWf(c).map((s) => ({ value: s.label, short: s.short || s.label })), ...TERMINAL.map((t) => ({ value: t, short: t }))];
export const firstStageLabel = (c: Pick<WfCtx, 'settingsWorkflow'>) => settingsWf(c)[0].label;
/** pwCanonicalStatus */
export function canonicalStatus(s0: unknown, c: Pick<WfCtx, 'settingsWorkflow'>): string {
  const s = String(s0 || '').trim();
  if (!s) return s;
  const wf = settingsWf(c);
  if (wf.some((x) => x.label === s) || TERMINAL.includes(s)) return s;
  const byKey = wf.find((x) => x.key === s);
  if (byKey) return byKey.label;
  const al = STATUS_ALIASES[s];
  if (al) { const st = wf.find((x) => x.key === al.stage); if (st) return st.label; }
  return s;
}
/** normalizeProjectStatus (pages-projects.js:25) — بعد مزامنة قايمة المراحل (زي الاستخدام الفعلي في الصفحة) */
export function normalizeProjectStatus(p: J, c: Pick<WfCtx, 'settingsWorkflow'>): string {
  const s = String((p && p.status) || '').trim();
  if (!s) return firstStageLabel(c);
  if (s === 'active') return 'التنفيذ والمتابعة';
  if (s === 'completed') return 'مكتمل';
  if (s === 'paused') return 'متوقف';
  if (projectStages(c).some((x) => x.value === s)) return s;
  return canonicalStatus(s, c);
}
/** projectStageBadge: لون الشارة */
const BADGE: Record<string, string> = { 'الدراسة والتخطيط': 'badge-info', 'تجهيز المستندات': 'badge-info', 'المناقصة وترسية المشروع': 'badge-warn', 'التعاقد': 'badge-warn',
  'التنفيذ والمتابعة': 'badge-ok', 'المستخلصات': 'badge-ok', 'المراجعة المالية': 'badge-ok', 'التسليم الابتدائي': 'badge-ok', 'الإدارة المركزية للحسابات': 'badge-ok',
  'التسليم النهائي': 'badge-ok', 'مكتمل': 'badge-ok', 'متوقف': 'badge-muted', 'ملغي': 'badge-danger' };
export const stageBadge = (label: string) => BADGE[label] || 'badge-muted';

function findStep(wf: Stage[], stepKey: string) {
  for (let si = 0; si < wf.length; si++) { const ti = wf[si].steps.findIndex((x) => x.key === stepKey); if (ti >= 0) return { si, ti, stage: wf[si], step: wf[si].steps[ti] }; }
  return null;
}
/** pwCurrent */
export function current(p: J, c: Pick<WfCtx, 'settingsWorkflow'>) {
  const wf = workflowOf(p, c);
  let stageKey = (p && p.stageKey) || '', stepKey = (p && p.stepKey) || '';
  if (!stageKey && p && p.status) {
    const s = String(p.status).trim();
    const byLabel = wf.find((x) => x.label === s || x.key === s);
    if (byLabel) stageKey = byLabel.key;
    else if (STATUS_ALIASES[s]) { stageKey = STATUS_ALIASES[s].stage; stepKey = stepKey || STATUS_ALIASES[s].step; }
    else if (s === 'active') stageKey = 'execution';
    else if (s === 'completed' || s === 'مكتمل') stageKey = wf[wf.length - 1].key;
  }
  const stage = wf.find((x) => x.key === stageKey) || wf[0];
  if (!stepKey || !stage.steps.some((x) => x.key === stepKey)) stepKey = stage.steps[0].key;
  return { wf, stage, stageKey: stage.key, stepKey };
}
const meta = (p: J, k: string): J => (p && p.stepMeta && p.stepMeta[k]) || {};
/** pwStepStatus */
export function stepStatus(p: J, stepKey: string, c: Pick<WfCtx, 'settingsWorkflow' | 'today'>): string {
  const m = meta(p, stepKey);
  if (m.status === 'rejected') return 'rejected';
  if (m.status === 'skipped' || (m.skipped && !m.status)) return 'skipped';
  if (m.status === 'done' || (!m.status && Array.isArray(p.completedSteps) && p.completedSteps.indexOf(stepKey) >= 0)) return 'done';
  const isCur = current(p, c).stepKey === stepKey;
  const started = m.status === 'in_progress' || isCur;
  const due = m.dueDate || '';
  if (due && due < c.today) return 'late';
  return started ? 'in_progress' : 'pending';
}
/** pwLateSteps (عددها بس، للملاحظات) */
export const lateSteps = (p: J, c: Pick<WfCtx, 'settingsWorkflow' | 'today'>) => workflowOf(p, c).flatMap((st) => st.steps.filter((sp) => stepStatus(p, sp.key, c) === 'late'));

/** pwOnStatusChanged: بيعدّل p في مكانه (زي القديم) ويرجّع true لو المسار اتحرّك */
export function onStatusChanged(p: J, label0: string, c: WfCtx): boolean {
  const label = canonicalStatus(label0, c);
  if (TERMINAL.includes(label)) return false;
  const wf = workflowOf(p, c);
  const stage = wf.find((x) => x.label === label);
  if (!stage) return false;
  const cur = current(p, c);
  if (cur.stage.key === stage.key) return false;
  const step = stage.steps.find((sp) => { const x = stepStatus(p, sp.key, c); return x !== 'done' && x !== 'skipped'; }) || stage.steps[0];
  if (!p.stepMeta) p.stepMeta = {};
  // pwSetPosition
  p.stageKey = stage.key; p.stepKey = step.key;
  if (!p.stepMeta[step.key]) p.stepMeta[step.key] = {};
  const m = p.stepMeta[step.key];
  if (!m.status || m.status === 'pending') m.status = 'in_progress';
  if (!m.startDate) m.startDate = c.today;
  m.updatedAt = c.nowIso;
  // pwLog
  if (!Array.isArray(p.pathHistory)) p.pathHistory = [];
  const f = findStep(workflowOf(p, c), step.key);
  p.pathHistory.push({ id: c.uid(), at: c.nowIso, user: c.userName, action: 'تغيير المرحلة', stageKey: f ? f.stage.key : '', stepKey: step.key, label: f ? `${f.stage.label} · ${f.step.label}` : '', from: cur.stageKey, to: stage.key });
  if (p.pathHistory.length > 500) p.pathHistory = p.pathHistory.slice(-500);
  return true;
}

// ---------------- الموارد والقايمة (pages-projects.js، helpers.js)
export interface Hr { workers: J[]; equipment: J[]; drivers: J[]; employees: J[]; supervisors: J[] }
/** resourcesOnProject (helpers.js:7918) — الربط هنا بالاسم زي القديم */
export function resourcesOnProject(projectName: unknown, d: Hr) {
  const name = String(projectName || '').trim();
  if (!name) return { workers: [] as J[], equipment: [] as J[], drivers: [] as J[], employees: [] as J[], supervisors: [] as J[] };
  const match = (p: unknown) => String(p || '').trim() === name;
  const workers = d.workers.filter((w) => w.status !== 'inactive' && match(w.project));
  const equipment = d.equipment.filter((eq) => (eq.status || '') !== 'retired' && match(eq.project));
  const drivers = d.drivers.filter((x) => x.status !== 'inactive' && match(x.project));
  const employees = d.employees.filter((e) => e.status !== 'inactive' && match(e.project));
  const supervisors = d.supervisors.filter((s) => s.status !== 'inactive' && match(s.project));
  const supIds = new Set(workers.map((w) => w.supervisorId).filter(Boolean));
  for (const s of d.supervisors) { if (s.status === 'inactive') continue; if (supIds.has(s.id) && !supervisors.some((x) => x.id === s.id)) supervisors.push(s); }
  return { workers, equipment, drivers, employees, supervisors };
}
export const supervisorName = (id: unknown, d: Hr) => { const s = d.supervisors.find((x) => x.id === id); return s ? s.name || s.code || id : '—'; };

export interface ProjectFilters { q?: string; status?: string; stageSel?: string; customerId?: string; hasRes?: '' | 'with' | 'empty'; budget?: '' | 'none' }
/** القايمة بفلاترها (renderProjectsPage) — من غير فلتر حالة الميزانية (F-12، DEC-0117 د-6) */
export function filterProjects(all: J[], f: ProjectFilters, d: Hr, c: Pick<WfCtx, 'settingsWorkflow'>): J[] {
  const q = (f.q || '').trim();
  let list = byNameAr(all, (p) => p.name);
  if (q) {
    list = list.filter((p) => {
      const hay = [p.name, p.code, p.notes, p.customerName, p.customer, p.contractNo, p.status, normalizeProjectStatus(p, c)].join(' ');
      if (smartMatch(hay, q)) return true;
      if (p.supervisorId && smartMatch(supervisorName(p.supervisorId, d), q)) return true;
      return resourcesOnProject(p.name, d).supervisors.some((s) => smartMatch(s.name, q));
    });
  }
  const stageNow = f.status || f.stageSel || '';
  if (stageNow) list = list.filter((p) => normalizeProjectStatus(p, c) === stageNow);
  if (f.customerId) list = list.filter((p) => (p.customerId || '') === f.customerId || (!p.customerId && (p.customerName || p.customer || '') === f.customerId));
  if (f.hasRes) {
    list = list.filter((p) => {
      const r = resourcesOnProject(p.name, d);
      const n = r.workers.length + r.equipment.length + r.supervisors.length + r.drivers.length;
      return f.hasRes === 'with' ? n > 0 : n === 0;
    });
  }
  if (f.budget === 'none') list = list.filter((p) => !toInt(p.budget) && !toInt(p.value));
  return list;
}
/** الكروت (من غير «التكلفة اللحظية» — F-12) */
export function projectCards(all: J[], f: ProjectFilters, shown: number, c: Pick<WfCtx, 'settingsWorkflow'>) {
  const inSection = !!f.status;
  const list = inSection ? all.filter((p) => normalizeProjectStatus(p, c) === f.status) : all;
  const totalValue = list.reduce((s, p) => s + toInt(p.value || p.budget), 0);
  if (inSection) return { inSection, count: list.length, customers: new Set(list.map((p) => p.customerId || p.customerName || p.customer || '').filter(Boolean)).size, totalValue };
  const st = list.map((p) => normalizeProjectStatus(p, c));
  return { inSection, count: list.length, active: st.filter((s) => !TERMINAL.includes(s)).length, done: st.filter((s) => s === 'مكتمل').length, totalValue, shown };
}
/** projectNotesIssues (alerts-center.js:275) — من غير تنبيه الميزانية (F-12) */
export function projectNotesIssues(p: J, c: Pick<WfCtx, 'settingsWorkflow' | 'today'>): string[] {
  const out: string[] = [];
  if (!p.customerId && !p.customerName && !p.customer) out.push('ناقص: العميل');
  if (!(Number(p.value) || Number(p.budget))) out.push('ناقص: قيمة/ميزانية');
  const l = lateSteps(p, c);
  if (l.length) out.push(`${l.length} خطوة متأخرة في المسار`);
  if (p.tenderStance === 'rejected') out.push('مشروع مرفوض');
  return out;
}

// ---------------- نشر تغيير الاسم والربط (project-links.js، clients/helpers.js)
/** PROJECT_LINK_SOURCES: [المجموعة، حقل الاسم، حقل المعرّف] */
export const LINK_SOURCES: [string, string, string][] = [
  ['workers', 'project', 'projectId'], ['equipment', 'project', 'projectId'], ['drivers', 'project', 'projectId'], ['employees', 'project', 'projectId'],
  ['supervisors', 'project', 'projectId'], ['expenses', 'project', 'projectId'], ['costs', 'project', 'projectId'], ['workerAttendance', 'project', 'projectId'],
  ['equipmentDaily', 'project', 'projectId'], ['fuelLogs', 'project', 'projectId'], ['equipmentLogs', 'project', 'projectId'], ['projectDaily', 'project', 'projectId'],
  ['ledger.invoices', 'project', 'projectId'], ['warehouses.movements', 'project', 'projectId'], ['resourceTransfers', 'fromProject', 'fromProjectId'], ['resourceTransfers', 'toProject', 'toProjectId'],
];
export const CLIENT_LISTS = ['contracts', 'invoices', 'boqs', 'workSurveys', 'collections'];
export const HR_RENAME = ['workers', 'equipment', 'drivers', 'employees', 'supervisors'];

function linkIndex(projects: J[]) {
  const byId: Record<string, J> = {}, byName: Record<string, J | 'dup'> = {}, byNorm: Record<string, J | 'dup'> = {};
  for (const p of projects) {
    if (!p || !p.id) continue;
    byId[p.id] = p;
    const n = String(p.name || '').trim(); if (n) byName[n] = byName[n] ? 'dup' : p;
    const k = normName(p.name); if (k) byNorm[k] = byNorm[k] ? 'dup' : p;
  }
  return { byId, byName, byNorm };
}
/** projLinkAll: بيعدّل السجلات في مكانها (زي القديم) — اللي ليه معرّف بياخد اسم المشروع الحالي، واللي ليه اسم مطابق بياخد المعرّف */
export function linkAll(projects: J[], sources: Record<string, J[]>) {
  const idx = linkIndex(projects);
  const rep = { linked: 0, renamed: 0, unmatched: {} as Record<string, number>, total: 0 };
  for (const [coll, f, fid] of LINK_SOURCES) {
    for (const r of sources[coll] || []) {
      if (!r) continue;
      const name = String(r[f] || '').trim();
      if (r[fid] && idx.byId[r[fid]]) { const p = idx.byId[r[fid]]; if (String(p.name || '').trim() !== name) { r[f] = p.name; rep.renamed++; } continue; }
      if (!name) continue;
      rep.total++;
      let p = idx.byName[name];
      if (!p || p === 'dup') p = idx.byNorm[normName(name)];
      if (p && p !== 'dup') { r[fid] = p.id; rep.linked++; } else rep.unmatched[name] = (rep.unmatched[name] || 0) + 1;
    }
  }
  return rep;
}
/** projUnmatchedReport: أسماء مكتوبة في سجلات ومالهاش مشروع مسجّل (بالاسم الحرفي) */
export function unmatchedReport(projects: J[], sources: Record<string, J[]>) {
  const idx = linkIndex(projects), out: Record<string, number> = {}, byCollection: Record<string, number> = {};
  for (const [coll, f, fid] of LINK_SOURCES) {
    for (const r of sources[coll] || []) {
      if (!r) continue;
      const name = String(r[f] || '').trim();
      if (!name || (r[fid] && idx.byId[r[fid]])) continue;
      if (idx.byName[name] && idx.byName[name] !== 'dup') continue;
      out[name] = (out[name] || 0) + 1; byCollection[coll] = (byCollection[coll] || 0) + 1;
    }
  }
  return { names: out, byCollection };
}
/** clProjectBelongsTo */
export function belongsTo(p: J, cust: J | undefined): boolean {
  if (!p || !cust) return false;
  if (p.customerId) return p.customerId === cust.id;
  const nm = p.customerName || p.customer || '';
  return !!nm && normName(nm) === normName(cust.name);
}
/** clRenameProjectRefs — على سجلات العميل التجارية (كل سجل فيه customerId)؛ بيعدّل في مكانه ويرجّع العدد */
export function renameClientRefs(p: J, oldName: string, newName: string, lists: Record<string, J[]>, customers: Map<string, J>): number {
  if (!p || !oldName || oldName === newName) return 0;
  const old = normName(oldName);
  let n = 0;
  for (const k of CLIENT_LISTS) {
    for (const r of lists[k] || []) {
      const cust = r ? customers.get(r.customerId) : undefined;
      if (!cust) continue; // القديم بيمشي على سجلات كل عميل موجود (clCustomers) — السجل اللي عميله مش موجود مابيتلمسش
      if ((r.projectId && r.projectId === p.id) || (!r.projectId && r.project && normName(r.project) === old && belongsTo(p, cust))) { r.project = newName; r.projectId = p.id; n++; }
    }
  }
  return n;
}

/** stampProjectMembership (data-store.js:263) — بيشتغل مع كل حفظ في القديم: الشخص/المعدة اللي مشروعه اتغيّر من غير تاريخ ياخد تاريخ انضمام = النهارده، واللي اتشال مشروعه يتمسح تاريخه */
export const MEMBER_STORES = ['workers', 'supervisors', 'drivers', 'equipment'];
export function stampMembership(prev: J, r: J, today: string): void {
  const cur = String(r.project || '').trim();
  if (!cur) { if (r.projectSince) r.projectSince = ''; return; }
  const p = String(prev.project || '').trim(), ps = prev.projectSince || '';
  if (p !== cur && (!r.projectSince || r.projectSince === ps)) r.projectSince = today;
}

/** clRenameProjectRefs بالظبط: سجلات العميل التجارية **جوه سجل العميل** (customer.contracts[]، invoices[]، ...) — ده مكان تخزينها الفعلي */
export function renameCustomerRefs(p: J, oldName: string, newName: string, customers: J[]): number {
  if (!p || !oldName || oldName === newName) return 0;
  const old = normName(oldName);
  let n = 0;
  for (const c of customers) {
    for (const k of CLIENT_LISTS) {
      for (const r of Array.isArray(c[k]) ? c[k] : []) {
        if (!r) continue;
        if ((r.projectId && r.projectId === p.id) || (!r.projectId && r.project && normName(r.project) === old && belongsTo(p, c))) { r.project = newName; r.projectId = p.id; n++; }
      }
    }
  }
  return n;
}
