import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * DEC-0112 (تعديل B-25، قرار المستخدم 2026-11-22): **المبالغ لحد 6 خانات عشرية بدل 4** في النظام كله، والتقريب HALF_UP زي ما هو.
 * - الأعمدة NUMERIC(18,4) ← NUMERIC(20,6): نفس الـ 14 رقم صحيح، وخانتين زيادة. التوسيع مابيغيّرش ولا قيمة موجودة.
 * - الـ view legacy_records بيستخدم صف الجدول كله (supplier_to_legacy(s))، فبيتشال ويرجع بنفس التعريف حوالين التغيير.
 * - down: بيرفض لو فيه أي قيمة بأكتر من 4 خانات (عشان الرجوع مايقرّبش بيانات بصمت).
 */
const COLS: [string, string][] = [
  ['suppliers', 'opening_balance'], ['customers', 'opening_balance'], ['projects', 'budget'],
  ['approval_workflows', 'amount_from'], ['approval_workflows', 'amount_to'], ['approval_requests', 'amount'],
  ['tax_code_versions', 'fixed_amount'], ['tax_code_versions', 'min_base'],
  ['document_tax_lines', 'base_amount'], ['document_tax_lines', 'taxable_amount'], ['document_tax_lines', 'amount'],
];

async function withViewDropped(q: QueryRunner, fn: () => Promise<void>) {
  const [{ def }] = await q.query(`SELECT pg_get_viewdef('legacy_records'::regclass, true) AS def`);
  await q.query(`DROP VIEW legacy_records`);
  await fn();
  await q.query(`CREATE VIEW legacy_records AS ${def}`);
}

export class MoneySixDecimals1764900000000 implements MigrationInterface {
  name = 'MoneySixDecimals1764900000000';
  async up(q: QueryRunner): Promise<void> {
    await withViewDropped(q, async () => {
      for (const [t, c] of COLS) await q.query(`ALTER TABLE "${t}" ALTER COLUMN "${c}" TYPE numeric(20,6)`);
    });
  }
  async down(q: QueryRunner): Promise<void> {
    for (const [t, c] of COLS) {
      const [{ n }] = await q.query(`SELECT count(*)::int AS n FROM "${t}" WHERE "${c}" IS NOT NULL AND "${c}" <> round("${c}", 4)`);
      if (n > 0) throw new Error(`${t}.${c}: ${n} قيمة بأكتر من 4 خانات — الرجوع هيقرّبها، فاتوقف`);
    }
    await withViewDropped(q, async () => {
      for (const [t, c] of COLS) await q.query(`ALTER TABLE "${t}" ALTER COLUMN "${c}" TYPE numeric(18,4)`);
    });
  }
}
