/**
 * شرط النسخة الاحتياطية قبل execute/rollback (MODULE_MIGRATION_PLAN §2 الخطوة 7): آخر نسخة كاملة ناجحة،
 * واختبار استعادة ناجح **بعدها**، والمنفّذ بيأكّد وقت النسخة بنفسه.
 * بيقرا السجل اللي بتكتبه سكربتات docker/backup (lib.sh → log_event). backup-full.sh بيسجّل النسخة الكاملة بالنوع "base"
 * (و"full" مقبول للتوافق) — الفرق ده اتكشف في بروفة المرحلة 6، والاختبار backup-gate.spec.ts بيكتب السجل بالسكربت الحقيقي.
 */
export interface BackupEvent { at: string; kind: string; status: string }
export interface BackupGateResult { full: string; restore: string }

export function checkBackupGate(logText: string, confirm: string | undefined): BackupGateResult {
  const events = logText.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as BackupEvent);
  const full = events.filter((e) => (e.kind === 'base' || e.kind === 'full') && e.status === 'ok').at(-1);
  if (!full) throw new Error('مفيش نسخة كاملة ناجحة في السجل');
  const restore = events.filter((e) => e.kind === 'restore-test' && e.status === 'ok' && e.at > full.at).at(-1);
  if (!restore) throw new Error(`مفيش اختبار استعادة ناجح بعد آخر نسخة كاملة (${full.at}) — شغّل restore-test.sh الأول`);
  if (confirm !== full.at) throw new Error(`للتأكيد: أعد التشغيل بـ --confirm-backup ${full.at}`);
  return { full: full.at, restore: restore.at };
}
