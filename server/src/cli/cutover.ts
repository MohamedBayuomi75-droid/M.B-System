/* eslint-disable no-console */
import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import ds from '../database/data-source';
import { cutoverModule, reconcileModule, rollbackModule } from '../cutover/module-cutover';
import { MODULES } from '../cutover/parties-cutover';
import { checkBackupGate } from '../cutover/backup-gate';

/**
 * أمر تشغيل نقل الموديول (MODULE_MIGRATION_PLAN §2 الخطوة 7 و§5). مش بيشتغل تلقائيًا مع الـ migrations.
 *   npm run cutover -- <parties|warehouses|supplier-invoices> dry-run
 *   npm run cutover -- parties execute  --by <اسم المنفّذ> --backup-log <BACKUP_DIR/backup-log.jsonl> --confirm-backup <وقت آخر نسخة كاملة>
 *   npm run cutover -- parties rollback --by <اسم المنفّذ> --backup-log ... --confirm-backup ...
 *   npm run cutover -- parties reconcile   (قراءة بس: أعداد وبصمات للمطابقة قبل النقل وبعده وبعد الرجوع — مفيش قيم)
 * execute/rollback: لازم آخر نسخة كاملة ناجحة + اختبار استعادة ناجح بعدها في سجل النسخ، والمنفّذ يأكّد وقت النسخة بنفسه.
 */
function arg(name: string): string | undefined { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; }

function backupGate(): void {
  const log = arg('backup-log');
  if (!log) throw new Error('--backup-log مطلوب (BACKUP_DIR/backup-log.jsonl)');
  const g = checkBackupGate(readFileSync(log, 'utf8'), arg('confirm-backup'));
  console.log(`آخر نسخة كاملة: ${g.full} · اختبار الاستعادة: ${g.restore}`);
}

async function main() {
  const [mod, action] = process.argv.slice(2).filter((a) => !a.startsWith('--') && !process.argv[process.argv.indexOf(a) - 1]?.startsWith('--'));
  const spec = MODULES[mod];
  if (!spec || !['dry-run', 'execute', 'rollback', 'reconcile'].includes(action)) throw new Error(`الاستخدام: cutover <${Object.keys(MODULES).join('|')}> dry-run|execute|rollback|reconcile`);
  const by = arg('by') ?? 'cli';
  if (action === 'execute' || action === 'rollback') backupGate();
  await ds.initialize();
  try {
    if (action === 'reconcile') { console.log(JSON.stringify(await reconcileModule(ds, spec), null, 2)); return; }
    const r = action === 'rollback' ? await rollbackModule(ds, spec, by) : await cutoverModule(ds, spec, by, action as 'dry-run' | 'execute');
    console.log(JSON.stringify(r, null, 2));
    console.log(action === 'dry-run' ? '✓ dry-run: كل السجلات اتنقلت واتطابقت — ومفيش أي حاجة اتحفظت (ROLLBACK)' : `✓ ${action} تم`);
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('✗', e instanceof Error ? e.message : e); process.exit(1); });
