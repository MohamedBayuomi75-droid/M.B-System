/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * نافذة الإجازة بعد applyFormLayout (renderer/core/helpers.js) — نقل حرفي للجزء اللي بيأثر على اللي المستخدم بيشوفه (UAT 8.4 V3):
 * القديمة بتطبّق التخطيط الفعلي (ensureFormLayout: المحفوظ + الخانات التلقائية) على نافذة الإجازة كل مرة بتتفتح، فلكل عنصر في التخطيط
 * ليه خانة في النافذة (بالـ selector):
 *  - الإخفاء لو visible === false.
 *  - الاسم الظاهر = اسم التخطيط (بعد شيل «(تحدد يدوي)»)، والعنصر الأخير على نفس الخانة هو اللي بيبان.
 *  - العرض: الحجم «كبير» = عرض الصف كله، وإلا بيشيل grid-column الأصلي.
 *  - الترتيب: الخانات اللي في التخطيط بتتحط بترتيب التخطيط في نفس أماكنها في الـ DOM، والباقي مكانه.
 * اللي مش منقول (مش ظاهر في النافذة دي): الطول والعرض بالبكسل، و«عدد الخانات في الصف» (formCols)، وتثبيت الكود والملاحظات (مالهمش خانة هنا).
 */
import { builtinFields } from './legacy-table-layout';

/** خانات النافذة بترتيبها في الـ DOM، والـ selectors اللي القديمة بتلاقيها جوّاها (الشخص: خانة الاختيار entityCombo) */
export const LEAVE_FIELDS: { id: string; sels: string[] }[] = [
  { id: 'kind', sels: ['#lvKind'] }, { id: 'dept', sels: ['#lvDept'] }, { id: 'person', sels: ['#lvEmp_text', '#lvEmp', '#lvPersonBox', '#lvPersonLab'] }, { id: 'type', sels: ['#lvType'] },
  { id: 'days', sels: ['#lvDays'] }, { id: 'from', sels: ['#lvFromD'] }, { id: 'to', sels: ['#lvToD'] }, { id: 'reason', sels: ['#lvReason'] },
];
export interface LeaveForm { order: Record<string, number>; hide: Record<string, boolean>; label: Record<string, string>; wide: Record<string, boolean | null> }

const STRIP = /\s*[([]?\s*(تحدد|تحديد|تُحدد|يحدد)\s*يدو[يى]?[اًا]?\s*[)\]]?/g;
export function leaveForm(layout: any[]): LeaveForm {
  const builtins = builtinFields('leaves');
  const field = (sel: string) => LEAVE_FIELDS.find((f) => f.sels.includes(sel));
  const out: LeaveForm = { order: {}, hide: {}, label: {}, wide: {} };
  LEAVE_FIELDS.forEach((f, i) => { out.order[f.id] = i; out.wide[f.id] = null; });
  const want: string[] = [];
  for (const x of layout || []) {
    if (!x || x.type === 'custom') continue;
    const def = builtins.find((b) => b.key === x.key) || { selector: x.selector, label: x.label, key: x.key };
    const sel = def.selector || x.selector; if (!sel) continue;
    const f = field(sel); if (!f) continue;
    if (!want.includes(f.id)) want.push(f.id);
    if (x.visible === false) { out.hide[f.id] = true; continue; }
    out.hide[f.id] = false;
    out.wide[f.id] = x.size === 'lg';
    const l = String(x.label || def.label || '').replace(STRIP, '').trim();
    if (l) out.label[f.id] = l;
  }
  if (want.length >= 2) {
    const slots = want.map((id) => LEAVE_FIELDS.findIndex((f) => f.id === id)).sort((a, b) => a - b);
    want.forEach((id, k) => { out.order[id] = slots[k]; });
  }
  return out;
}
