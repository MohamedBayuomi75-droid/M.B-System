/**
 * منع التكرار — أشخاص ومعدات: نقل حرفي من الواجهة القديمة (renderer/core/helpers.js: normalizeNid، normalizePhoneNum،
 * normalizePlateNo، findEntityDuplicates؛ وexcel-import.js: normalizePersonName). نافذة كل نوع بتنادي guardEntityDuplicates
 * على الـ payload قبل الحفظ: «hard» = يمنع الحفظ، و«soft» = يسأل («حفظ على أي حال»).
 * القوايم: نفس DATA اللي القديمة بتشوفه = المجموعات اللي المستخدم يقدر يقراها وفي نطاقه (الخدمة بتفلترها).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type DupKind = 'employee' | 'worker' | 'supervisor' | 'driver' | 'equipment';
export interface DupMatch { id: string; name: string; code: string; strength: 'hard' | 'soft'; reasons: string[]; kind: string }
export type DupLists = Partial<Record<DupKind, any[]>>;

export const normalizeNid = (v: unknown) => String(v || '').replace(/\D/g, '');
export function normalizePhoneNum(v: unknown) {
  let s = String(v || '').replace(/\D/g, '');
  if (s.startsWith('002')) s = s.slice(3);
  if (s.startsWith('20') && s.length >= 11) s = s.slice(2);
  if (s.startsWith('0') && s.length === 11) return s;
  if (s.length === 10) return '0' + s;
  return s;
}
export const normalizePlateNo = (v: unknown) => String(v || '').replace(/[\s\-_.]/g, '').toUpperCase();
export const normalizePersonName = (n: unknown) => String(n || '').trim().replace(/\s+/g, ' ').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();

export function findEntityDuplicates(kind: DupKind, data: any, excludeId: string | null | undefined, lists: DupLists): DupMatch[] {
  data = data || {};
  const list = lists[kind] || [];
  const out: DupMatch[] = [];
  const nid = normalizeNid(data.nationalId || data.idNumber || data.nid);
  const phone = normalizePhoneNum(data.phone || data.mobile);
  const name = normalizePersonName(data.name);
  const plate = normalizePlateNo(data.vehicleNumber || data.plate || data.plateNumber);
  const chassis = normalizePlateNo(data.chassisNumber || data.chassis || data.serialNumber);
  const code = String(data.code || '').trim().toUpperCase();
  list.forEach((rec) => {
    if (!rec || (excludeId && rec.id === excludeId)) return;
    const reasons: string[] = [];
    let strength: 'hard' | 'soft' | null = null;
    if (kind === 'equipment') {
      const rPlate = normalizePlateNo(rec.vehicleNumber || rec.plate || rec.plateNumber);
      const rChassis = normalizePlateNo(rec.chassisNumber || rec.chassis || rec.serialNumber);
      const rName = normalizePersonName(rec.name || rec.typeLabel || '');
      const rCode = String(rec.code || '').trim().toUpperCase();
      if (plate && rPlate && plate === rPlate) { reasons.push('رقم اللوحة متطابق'); strength = 'hard'; }
      if (chassis && rChassis && chassis === rChassis) { reasons.push('رقم الشاسيه متطابق'); strength = 'hard'; }
      if (code && rCode && code === rCode) { reasons.push('الكود متطابق'); strength = 'hard'; }
      if (name && rName && name === rName) { reasons.push('الاسم/الوصف متطابق'); if (!strength) strength = 'soft'; }
    } else {
      const rNid = normalizeNid(rec.nationalId || rec.idNumber || rec.nid);
      const rPhone = normalizePhoneNum(rec.phone || rec.mobile);
      const rName = normalizePersonName(rec.name);
      const rCode = String(rec.code || '').trim().toUpperCase();
      if (nid && rNid && nid === rNid) { reasons.push('الرقم القومي متطابق'); strength = 'hard'; }
      if (code && rCode && code === rCode) { reasons.push('الكود متطابق'); strength = 'hard'; }
      if (name && rName && name === rName && phone && rPhone && phone === rPhone) { reasons.push('الاسم ورقم الهاتف متطابقان'); strength = 'hard'; }
      else if (name && rName && name === rName) { reasons.push('الاسم متطابق'); if (!strength) strength = 'soft'; }
      else if (phone && rPhone && phone === rPhone && phone.length >= 10) { reasons.push('رقم الهاتف متطابق'); if (!strength) strength = 'soft'; }
    }
    if (strength && reasons.length) out.push({ id: rec.id, name: rec.name || rec.code || rec.vehicleNumber || rec.plate || '—', code: rec.code || '', strength, reasons, kind });
  });
  // فحص الرقم القومي عبر الأنواع الأخرى (تحذير ناعم فقط)
  if (kind !== 'equipment' && nid && nid.length >= 10) {
    const map: Record<string, string> = { employee: 'موظفين', worker: 'عمال', supervisor: 'مشرفين', driver: 'سائقين' };
    (['employee', 'worker', 'supervisor', 'driver'] as const).filter((k) => k !== kind).forEach((k) => {
      (lists[k] || []).forEach((rec) => {
        if (!rec || (excludeId && rec.id === excludeId)) return;
        if (normalizeNid(rec.nationalId || rec.idNumber) === nid) out.push({ id: rec.id, name: rec.name || rec.code || '—', code: rec.code || '', strength: 'soft', reasons: ['نفس الرقم القومي مسجّل في ' + (map[k] || k)], kind: k });
      });
    });
  }
  // ترتيب: hard أولاً (sort ثابت زي Array.prototype.sort في V8)
  out.sort((a, b) => (a.strength === b.strength ? 0 : a.strength === 'hard' ? -1 : 1));
  return out;
}

/** رسايل guardEntityDuplicates */
export const DUP_TEXT = {
  hardTitle: '⚠️ لا يمكن الإضافة — يوجد سجل مطابق',
  hardMsg: 'تم العثور على سجل بنفس البيانات الأساسية. عدّل السجل الحالي بدل إضافة مكرر.',
  softTitle: '⚠️ يوجد سجلات متشابهة',
  softMsg: 'يوجد تشابه مع سجلات موجودة. راجعها قبل الحفظ أو أكّد الحفظ إذا كنت متأكداً أنها مختلفة.',
};
