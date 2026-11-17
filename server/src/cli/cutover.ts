/* eslint-disable no-console */
import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import ds from '../database/data-source';
import { cutoverModule, rollbackModule } from '../cutover/module-cutover';
import { MODULES } from '../cutover/parties-cutover';

/**
 * أمر تشغيل نقل الموديول (MODULE_MIGRATION_PLAN §2 الخطوة 7 و§5). مش بيشتغل تلقائيًا مع الـ migrations.
 *   npm run cutover -- <parties|warehouses> dry-run
 *   npm run cutover -- parties execute  --by <اسم المنفّذ> --backup-log <BACKUP_DIR/backup-log.jsonl> --confirm-backup <وقت آخر نسخة كاملة>
 *   npm run cutover -- parties rollback --by <اسم المنفّذ> --backup-log ... --confirm-backup ...
 * execute/rollback: لازم آخر نسخة كاملة ناجحة + اختبار استعادة ناجح بعدها في سجل النسخ، والمنفّذ يأكّد وقت النسخة بنفسه.
 */
function arg(name: string): string | undefined { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; }

function backupGate(): void {
  const log = arg('backup-log'); const confirm = arg('confirm-backup');
  if (!log) throw new Error('--backup-log مطلوب (BACKUP_DIR/backup-log.jsonl)');
  const events = readFileSync(log, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as { at: string; kind: string; status: string });
  const full = events.filter((e) => e.kind === 'full' && e.status === 'ok').at(-1);
  if (!full) throw new Error('مفيش نسخة كاملة ناجحة في السجل');
  const restore = events.filter((e) => e.kind === 'restore-test' && e.status === 'ok' && e.at > full.at).at(-1);
  if (!restore) throw new Error(`مفيش اختبار استعادة ناجح بعد آخر نسخة كاملة (${full.at}) — شغّل restore-test.sh الأول`);
  console.log(`آخر نسخة كاملة: ${full.at} · اختبار الاستعادة: ${restore.at}`);
  if (confirm !== full.at) throw new Error(`للتأكيد: أعد التشغيل بـ --confirm-backup ${full.at}`);
}

async function main() {
  const [mod, action] = process.argv.slice(2).filter((a) => !a.startsWith('--') && !process.argv[process.argv.indexOf(a) - 1]?.startsWith('--'));
  const spec = MODULES[mod];
  if (!spec || !['dry-run', 'execute', 'rollback'].includes(action)) throw new Error(`الاستخدام: cutover <${Object.keys(MODULES).join('|')}> dry-run|execute|rollback`);
  const by = arg('by') ?? 'cli';
  if (action !== 'dry-run') backupGate();
  await ds.initialize();
  try {
    const r = action === 'rollback' ? await rollbackModule(ds, spec, by) : await cutoverModule(ds, spec, by, action as 'dry-run' | 'execute');
    console.log(JSON.stringify(r, null, 2));
    console.log(action === 'dry-run' ? '✓ dry-run: كل السجلات اتنقلت واتطابقت — ومفيش أي حاجة اتحفظت (ROLLBACK)' : `✓ ${action} تم`);
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('✗', e instanceof Error ? e.message : e); process.exit(1); });
