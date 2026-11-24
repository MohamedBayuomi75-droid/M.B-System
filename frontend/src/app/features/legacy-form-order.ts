/**
 * ترتيب خانات نوافذ الأشخاص الظاهر — نقل حرفي لـ applyPeopleFormOrder (renderer/core/helpers.js): كل خانة بتاخد CSS `order` من جدول
 * PEOPLE_FORM_RANK حسب معرّفها (بعد البادئة wrk/sup/drv)، والباقي 500 (بترتيب ظهوره)، والخانات الإضافية 800، والعنوان 8900،
 * والملاحظات 9000، والمرفقات 9500. ده الترتيب اللي المستخدم بيشوفه في القديمة (مش ترتيب الـ DOM).
 */
const PEOPLE_FORM_RANK = [
  /^Code$/, /^Name$/, /^Status$/, /^ResignDateWrap$/, /^Nid(Temp)?$/, /^Pos(Temp)?$/, /^Dept$/, /^Hire$/, /^Type$/,
  /^IdCardExp$/, /^IdCardStatus$/, /^LicExp$/, /^LicStatus$/, /^LicGrade$/, /^ContractType$/, /^ContractStatus$/,
  /^InsNo$/, /^InsStatus$/, /^Supervisor(_text)?$/, /^(Wage(Temp)?|Salary)$/, /^Phone(Temp)?$/, /^Email$/, /^LeaveBal$/,
];
/** key = المعرّف من غير البادئة (Code، NidTemp، ResignDateWrap…) */
export function formOrder(key: string): number {
  if (key === 'extra') return 800;
  if (key === 'attachments') return 9500;
  if (/Address$/.test(key)) return 8900;
  if (/Notes$/.test(key)) return 9000;
  const i = PEOPLE_FORM_RANK.findIndex((r) => r.test(key));
  return i >= 0 ? (i + 1) * 10 : 500;
}

/**
 * applyFormLayout (نقل حرفي للجزء اللي بيأثر على اللي المستخدم بيشوفه): لكل خانة ليها عنصر في تخطيط النموذج (بالـ selector):
 *  - الاسم الظاهر = اسم التخطيط (بعد شيل «(تحدد يدوي)») — وده بيغلب أسماء applyPeopleFormOrder الثابتة.
 *  - الإخفاء لو visible === false.
 *  - الخانات اللي برّه جدول الترتيب (500) بتمشي بترتيب التخطيط (applyFormLayout بيرتّبها في الـ DOM قبل CSS order).
 * entity = detectFormEntity: workers / workersTemp / supervisors / drivers (السواق الخارجي كمان drivers).
 */
export interface FormMeta { ord: (key: string) => number; hid: (key: string) => boolean; lb: (key: string, def: string) => string }
/** stored = فيه تخطيط محفوظ للكيان. من غيره القديمة بترتّب حسب النموذج الطبيعي (syncAutoFields) = ترتيب النافذة نفسها */
export function formMeta(layout: any[], pfx: string, stored = true): FormMeta { // eslint-disable-line @typescript-eslint/no-explicit-any
  const find = (key: string) => { const sel = `#${pfx}${key}`; const i = layout.findIndex((x) => x && x.type !== 'custom' && x.selector === sel); return i >= 0 ? { i, x: layout[i] } : null; };
  // applyFormLayout بيلف على التخطيط كله ويكتب على نفس الخانة كل مرة ← لو أكتر من عنصر على نفس الـ selector (خانة تلقائية + أساسية)، الأخير هو اللي بيبان (UAT 8.2 S16)
  const last = (key: string) => { const sel = `#${pfx}${key}`; for (let i = layout.length - 1; i >= 0; i--) { const x = layout[i]; if (x && x.type !== 'custom' && x.selector === sel) return { i, x }; } return null; };
  return {
    ord: (key) => { const r = formOrder(key); if (r !== 500 || !stored) return r; const f = find(key); return f ? 500 + f.i : 500; },
    hid: (key) => { const f = last(key); return !!f && f.x.visible === false; },
    lb: (key, def) => { const f = last(key); if (!f) return def; const l = String(f.x.label || '').replace(/\s*[([]?\s*(تحدد|تحديد|تُحدد|يحدد)\s*يدو[يى]?[اًا]?\s*[)\]]?/g, '').trim(); return l || def; },
  };
}
