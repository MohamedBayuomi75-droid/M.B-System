/**
 * عرض المبالغ بس (مفيش أي حساب في الواجهة — ADR-023): المبلغ جاي من السيرفر نص عشري بأربع خانات
 * وبيتنسّق من غير تحويله لـ JS number (Intl.NumberFormat بيقبل نص عشري ويحافظ على كل الخانات).
 */
const fmt = new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
export function formatMoney(v: string | null | undefined): string {
  if (v == null || v === '') return '—';
  if (!/^-?\d+(\.\d+)?$/.test(v)) return v;
  return (fmt as unknown as { format(x: string): string }).format(v);
}
