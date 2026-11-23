/**
 * البحث الذكي العربي — نقل حرفي من الواجهة القديمة (renderer/core/smart-tools.js): normAr، وsearchWords، وxWordHit، وsmartMatch،
 * وxScoreRecord، وsmartSearchList، وsmartPersonBlob. مشترك بين المشروعات (7.4) والعمال (8.1).
 */
type J = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const EAST = '٠١٢٣٤٥٦٧٨٩', PERS = '۰۱۲۳۴۵۶۷۸۹';

/** normAr: همزات، وى/ة، والتشكيل، والأرقام الهندية */
export function normAr(s: unknown): string {
  if (s == null) return '';
  return String(s).toLowerCase().replace(/[ً-ٰٟـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (d) => String(EAST.indexOf(d))).replace(/[۰-۹]/g, (d) => String(PERS.indexOf(d)));
}
export const searchWords = (s: unknown) => { const t = normAr(s); return t ? t.split(/[^\p{L}\p{N}]+/u).filter(Boolean) : []; };

/** xWordHit: الكلمة المكتوبة بداية كلمة في words (أو جزء من رقم بـ 3 أرقام فأكتر، أو اسم مركّب متصل) */
export function xWordHit(qt: string, words: string[], skip?: Record<number, boolean>): number {
  for (let i = 0; i < words.length; i++) { if (skip && skip[i]) continue; if (words[i].indexOf(qt) === 0) return i; }
  if (/^[0-9]{3,}$/.test(qt)) for (let i = 0; i < words.length; i++) { if (skip && skip[i]) continue; if (/[0-9]/.test(words[i]) && words[i].indexOf(qt) >= 0) return i; }
  for (let i = 0; i < words.length - 1; i++) { if (skip && (skip[i] || skip[i + 1])) continue; if (qt.length > words[i].length && (words[i] + words[i + 1]).indexOf(qt) === 0) return i; }
  return -1;
}
/** smartMatch: كل كلمات البحث لازم تكون بداية كلمات في النص */
export function smartMatch(blob: unknown, q: unknown): boolean {
  const toks = searchWords(q);
  if (!toks.length) return true;
  const words = searchWords(blob);
  return toks.every((t) => xWordHit(t, words) >= 0);
}
/** xScoreRecord: 0 = بداية الاسم الأول، 10 = التاني… والكود/التليفون/القومي = 200+ — null = مش مطابق */
export function xScoreRecord(p: J, toks: string[]): number | null {
  const nameWords = searchWords([p.name, p.typeLabel, p.model, p.brand].filter(Boolean).join(' '));
  const idWords = searchWords([p.code, p.phone, p.mobile, p.nationalId, p.idNumber, p.vehicleNumber, p.plate, p.serial].filter(Boolean).join(' '));
  const usedN: Record<number, boolean> = {}, usedI: Record<number, boolean> = {};
  let score = 0, last = -1;
  for (const t of toks) {
    const i = xWordHit(t, nameWords, usedN);
    if (i >= 0) { usedN[i] = true; score += i * 10 + (i <= last ? 5 : 0); last = i; continue; }
    const j = xWordHit(t, idWords, usedI);
    if (j < 0) return null;
    usedI[j] = true; score += 200;
  }
  return score;
}
/** smartPersonBlob: كل النصوص القابلة للبحث في سجل شخص (ومعاها اسم القسم والمشرف) */
export function smartPersonBlob(p: J, deptName: (id: string) => string, supName: (id: string) => string): string {
  if (!p) return '';
  const parts: unknown[] = [p.name, p.code, p.phone, p.mobile, p.nationalId, p.idNumber, p.position, p.skill, p.jobTitle,
    p.project, p.address, p.insuranceNumber, p.licenseGrade, p.licenseCategory, p.vehicleNumber, p.plate,
    p.serial, p.chassisNumber, p.motorNumber, p.typeLabel, p.model, p.brand, p.location, p.driverName, p.color, p.notes];
  if (p.departmentId || p.categoryId) { const d = deptName(p.departmentId || p.categoryId); if (d && d !== '—') parts.push(d); }
  if (p.supervisorId) { const s = supName(p.supervisorId); if (s && s !== '—') parts.push(s); }
  return parts.filter((x) => x != null && x !== '').join(' ');
}
/** smartSearchList: ترتيب بالدرجة ثم الاسم، وإلا الرجوع لنص الشخص كله (درجة 1000) */
export function smartSearchList<T extends J>(list: T[], q: unknown, blob: (r: T) => string): T[] {
  const toks = searchWords(String(q || '').trim());
  if (!toks.length) return list;
  const byName = (a: { r: T }, b: { r: T }) => String(a.r.name || a.r.typeLabel || '').localeCompare(String(b.r.name || b.r.typeLabel || ''), 'ar');
  const cmp = (a: { r: T; s: number }, b: { r: T; s: number }) => (a.s - b.s) || byName(a, b);
  const primary: { r: T; s: number }[] = [];
  for (const r of list) { const sc = xScoreRecord(r, toks); if (sc != null) primary.push({ r, s: sc }); }
  if (primary.length) return primary.sort(cmp).map((x) => x.r);
  const fallback: { r: T; s: number }[] = [];
  for (const r of list) { const words = searchWords(blob(r)); if (toks.every((t) => xWordHit(t, words) >= 0)) fallback.push({ r, s: 1000 }); }
  return fallback.sort(cmp).map((x) => x.r);
}
