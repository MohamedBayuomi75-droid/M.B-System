/* eslint-disable no-console */
import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import ds from '../database/data-source';
import { balanceDiff } from '../supplier-payments/payment-rules';

/**
 * 7.3.6 — تقرير الأرصدة (DEC-0105، P7.3-I): لكل مورد الرصيد بالطريقة الحالية، والرصيد بقاعدة F-05، والفرق وسببه. **قراءة بس.**
 *   npm run supplier-balances                    → أعداد ومجاميع بس (ينفع تتحط في المستودع)
 *   npm run supplier-balances -- --out <ملف>     → + القايمة التفصيلية لكل مورد في ملف محلي. **برا المستودع** (فيها أسماء ومبالغ)
 * المدير المالي بيعتمد الأرصدة دي كأرصدة افتتاحية قبل التشغيل الفعلي.
 */
function arg(name: string): string | undefined { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; }

async function main() {
  await ds.initialize();
  try {
    const q = (c: string) => ds.query(`SELECT id, data FROM legacy_records WHERE collection = $1 AND deleted_at IS NULL ORDER BY created_at, id`, [c]);
    const [sups, invs, pays] = await Promise.all([q('ledger.suppliers'), q('ledger.invoices'), q('ledger.payments')]);
    const by = (xs: { id: string; data: Record<string, unknown> }[], sid: string) => xs.filter((x) => x.data.supplierId === sid).map((x) => ({ ...x.data, id: x.id }));
    const rows = sups.map((s: { id: string; data: Record<string, unknown> }) => ({ supplierId: s.id, name: String(s.data.name ?? ''), ...balanceDiff({ ...s.data, id: s.id }, by(invs, s.id), by(pays, s.id)) }));
    const differ = rows.filter((r: { differs: boolean }) => r.differs);
    const count = (k: 'cancelledInvoices' | 'collect' | 'unclassified') => differ.filter((r: { reasons: Record<string, { count: number }> }) => r.reasons[k].count > 0).length;
    console.log(JSON.stringify({
      at: new Date().toISOString(), suppliers: rows.length, differing: differ.length,
      differingBecause: { cancelledInvoices: count('cancelledInvoices'), collect: count('collect'), unclassified: count('unclassified') },
      orphanPayments: pays.filter((p: { data: Record<string, unknown> }) => !sups.some((s: { id: string }) => s.id === p.data.supplierId)).length,
    }, null, 2));
    const out = arg('out');
    if (out) { writeFileSync(out, JSON.stringify(rows, null, 2)); console.log(`✓ القايمة التفصيلية (${rows.length} مورد) اتكتبت في ملف محلي — ماتتحطش في المستودع`); }
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('✗', e instanceof Error ? e.message : e); process.exit(1); });
