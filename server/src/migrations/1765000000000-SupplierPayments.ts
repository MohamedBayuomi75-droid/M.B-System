import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 7.3.3 — جدول دفعات الموردين + الـ Adapter (نفس نمط فواتير الموردين 7.2.3). **مابتنقلش بيانات**:
 * النقل أمر تشغيل (`npm run cutover -- supplier-payments execute`) مشروط بنسخة احتياطية + اختبار استعادة.
 *
 * - **القديم بقيمه زي ما هو:** كل حقل بيروح عموده **لو نوعه مطابق بس**، والباقي (أو null) بيفضل في legacy_extra بالظبط،
 *   فالتكافؤ 100% من غير تطبيع، والعدد بيطلع في تقرير النقل (untyped).
 * - المبلغ NUMERIC من غير scale (القديم بكل خاناته). الجديد من الـ API بست خانات HALF_UP (B-25 بعد DEC-0112).
 * - التوزيع زي القديم (DEC-0113 د-1): الدفعة الموزّعة = سجلات مربوطة بـ batch_id.
 * - internal_no: الرقم الداخلي السنوي `PV-` للجديد بس (DEC-0113 د-4)، **واحد للدفعة كلها** (سجلات التوزيع بتشاركه)، و payment_no القديم
 *   بيكمّل من نفس العدّاد العام (رقم لكل سجل زي القديم).
 * - direction: pay / collect، و**الفاضي = غير مصنّف** (B-53) — مفيش قيد على القيمة عشان القديم يتنقل زي ما هو.
 * - مفيش FK للمورد ولا للفاتورة: الربط المقطوع بيطلع في التقارير مش بيوقف النقل.
 */
type Kind = 'text' | 'number' | 'json';
const COLS: [string, string, Kind][] = [
  ['payment_no', 'paymentNo', 'number'], ['supplier_id', 'supplierId', 'text'], ['date', 'date', 'text'], ['amount', 'amount', 'number'],
  ['method', 'method', 'text'], ['direction', 'direction', 'text'], ['invoice_id', 'invoiceId', 'text'], ['batch_id', 'batchId', 'text'],
  ['transfer_ref', 'transferRef', 'text'], ['notes', 'notes', 'text'], ['extra_fields', 'extraFields', 'json'], ['attachments', 'attachments', 'json'],
  ['internal_no', 'internalNo', 'text'],
];
export const SUPPLIER_PAYMENT_COLUMNS = COLS;
const SQL_TYPE = { text: 'text', number: 'numeric', json: 'jsonb' } as const;
/** النوع المطابق في JSON: نص، أو رقم، أو (للـ json) كائن أو مصفوفة */
const matches = (k: string, t: Kind) => (t === 'json' ? `jsonb_typeof(p->'${k}') IN ('object','array')` : `jsonb_typeof(p->'${k}') = '${t === 'text' ? 'string' : 'number'}'`);
const val = (k: string, t: Kind) => `CASE WHEN ${matches(k, t)} THEN ${t === 'json' ? `p->'${k}'` : `(p->>'${k}')::${SQL_TYPE[t]}`} END`;
const typedKeys = `ARRAY(SELECT k FROM unnest(ARRAY[${COLS.map(([, k]) => `'${k}'`).join(',')}]) AS k WHERE ${COLS.map(([, k, t]) => `(k = '${k}' AND ${matches(k, t).replace(`p->'${k}'`, 'p->k')})`).join(' OR ')})`;
const BRANCH = `
      UNION ALL SELECT 'ledger.payments', t.id, supplier_payment_to_legacy(t), t.row_version, t.deleted_at, t.created_at, t.updated_at, NULL FROM supplier_payments t
        WHERE EXISTS (SELECT 1 FROM module_cutover m WHERE m.collection = 'ledger.payments')`;

export class SupplierPayments1765000000000 implements MigrationInterface {
  name = 'SupplierPayments1765000000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "supplier_payments" ("id" text PRIMARY KEY,
      ${COLS.map(([c, , t]) => `"${c}" ${SQL_TYPE[t]}`).join(', ')},
      "legacy_extra" jsonb NOT NULL DEFAULT '{}'::jsonb, "row_version" int NOT NULL DEFAULT 1,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz)`);
    await q.query(`CREATE INDEX "ix_supplier_payments_supplier" ON "supplier_payments" ("supplier_id") WHERE "deleted_at" IS NULL`);
    await q.query(`CREATE INDEX "ix_supplier_payments_invoice" ON "supplier_payments" ("invoice_id") WHERE "deleted_at" IS NULL AND "invoice_id" IS NOT NULL`);
    await q.query(`CREATE INDEX "ix_supplier_payments_batch" ON "supplier_payments" ("batch_id") WHERE "batch_id" IS NOT NULL`);
    // الرقم الداخلي للدفعة كلها (مستند واحد)، فسجلات التوزيع بتشاركه — التفرّد بيتضمن من خدمة الترقيم NO_GAPS مش من الفهرس
    await q.query(`CREATE INDEX "ix_supplier_payments_internal_no" ON "supplier_payments" ("internal_no") WHERE "internal_no" IS NOT NULL`);

    // قراءة: صف ← الشكل القديم (المستوى الأول بس — من غير ما نلمس null جوه الخانات الإضافية والمرفقات)
    await q.query(`CREATE FUNCTION supplier_payment_to_legacy(t supplier_payments) RETURNS jsonb LANGUAGE sql STABLE AS $$
      SELECT t.legacy_extra || jsonb_drop_null_keys(jsonb_build_object('id', t.id, ${COLS.map(([c, k]) => `'${k}', t.${c}`).join(', ')})) $$`);
    await q.query(`CREATE FUNCTION legacy_write_supplier_payment(i text, p jsonb, keep_rev int DEFAULT NULL, created timestamptz DEFAULT NULL) RETURNS int LANGUAGE plpgsql AS $$
      DECLARE v int;
      BEGIN
        INSERT INTO supplier_payments AS t (id, ${COLS.map(([c]) => c).join(', ')}, legacy_extra, row_version, created_at)
        VALUES (i, ${COLS.map(([, k, t]) => val(k, t)).join(', ')}, (p - 'id') - ${typedKeys}, coalesce(keep_rev, 1), coalesce(created, clock_timestamp()))
        ON CONFLICT (id) DO UPDATE SET ${COLS.map(([c]) => `${c} = EXCLUDED.${c}`).join(', ')}, legacy_extra = EXCLUDED.legacy_extra,
          row_version = t.row_version + 1, updated_at = now(), deleted_at = NULL,
          created_at = CASE WHEN t.deleted_at IS NOT NULL THEN clock_timestamp() ELSE t.created_at END
        RETURNING row_version INTO v;
        RETURN v;
      END $$`);

    const [{ def }] = await q.query(`SELECT pg_get_viewdef('legacy_records'::regclass, true) AS def`);
    await q.query(`CREATE OR REPLACE VIEW legacy_records AS ${String(def).replace(/;\s*$/, '')} ${BRANCH}`);
  }

  async down(q: QueryRunner): Promise<void> {
    const [{ n }] = await q.query(`SELECT count(*)::int AS n FROM module_cutover WHERE collection = 'ledger.payments'`);
    if (n > 0) throw new Error('supplier payments are cut over — run "cutover supplier-payments rollback" first');
    const [{ def }] = await q.query(`SELECT pg_get_viewdef('legacy_records'::regclass, true) AS def`);
    const at = String(def).search(/UNION ALL\s+SELECT 'ledger\.payments'/);
    if (at < 0) throw new Error('legacy_records: payments branch not found');
    await q.query(`DROP VIEW legacy_records`);
    await q.query(`CREATE VIEW legacy_records AS ${String(def).slice(0, at)}`);
    await q.query(`DROP FUNCTION legacy_write_supplier_payment(text, jsonb, int, timestamptz)`);
    await q.query(`DROP FUNCTION supplier_payment_to_legacy(supplier_payments)`);
    await q.query(`DROP TABLE "supplier_payments"`);
  }
}
