/* eslint-disable no-console */
import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import ds from '../database/data-source';
import { reconcileInvoices } from '../supplier-invoices/invoice-reconcile';

/**
 * 7.2.6 — تقرير مطابقة الفواتير القديمة (P7.2-H). **قراءة بس، ومفيش أي تعديل** (قبل النقل من records، وبعده من الجدول — نفس legacy_records).
 *   npm run invoice-reconcile                      → أعداد بس (ينفع تتحط في المستودع)
 *   npm run invoice-reconcile -- --out <ملف>       → + القايمة التفصيلية في ملف محلي (معرّف، ورقم المورد، ونوع الفرق). **برا المستودع.**
 */
function arg(name: string): string | undefined { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; }

async function main() {
  await ds.initialize();
  try {
    const rows: { id: string; data: Record<string, unknown> }[] = await ds.query(`SELECT id, data FROM legacy_records WHERE collection = 'ledger.invoices' AND deleted_at IS NULL ORDER BY created_at, id`);
    const sups: { id: string }[] = await ds.query(`SELECT id FROM legacy_records WHERE collection = 'ledger.suppliers' AND deleted_at IS NULL`);
    const r = reconcileInvoices(rows.map((x) => ({ ...x.data, id: x.id })), new Set(sups.map((s) => s.id)));
    const { issues, ...counts } = r;
    console.log(JSON.stringify(counts, null, 2));
    const out = arg('out');
    if (out) { writeFileSync(out, JSON.stringify(r, null, 2)); console.log(`✓ القايمة التفصيلية (${issues.length} فرق) اتكتبت في ملف محلي — ماتتحطش في المستودع`); }
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('✗', e instanceof Error ? e.message : e); process.exit(1); });
