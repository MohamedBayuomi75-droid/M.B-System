import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 8.6.2 — جدولي الصرف والخصومات (`workerPayments` ← `worker_payments`) وخصومات الموظفين (`employeePenalties` ← `employee_penalties`)
 * بنفس طريقة الجداول اللي فاتت (DEC-0137). **مابيتنقلش بيانات**: النقل أمر تشغيل (`npm run cutover -- worker-payments execute`)
 * مشروط بنسخة احتياطية + اختبار استعادة. **البيانات الحقيقية فيها 0 سجل في الاتنين** — البروفة المجمّعة بتتأكد (DEC-0136).
 *
 * - **القديم بقيمه زي ما هو** (DEC-0107): كل حقل بيروح عموده **لو نوعه مطابق بس**، والباقي في legacy_extra بالظبط، وعدده في تقرير النقل.
 * - الحقول من اللي نافذة الصرف القديمة بتكتبه (DUES_ACCEPTANCE §2) — مفيش شكل حقيقي (0 سجل).
 * - **السلفة (DEC-0132):** isAdvance وadvanceApprovedBy وadvanceApprovedAt — بيتكتبوا من الشاشة الجديدة بس.
 * - المبالغ NUMERIC من غير scale. مالهمش نطاق مشروع: project_id في فرع legacy_records = NULL (زي القديمة، الصرف للشخص).
 */
export type Kind = 'text' | 'number' | 'json' | 'bool';
type Cols = [string, string, Kind][];
export const WORKER_PAYMENT_COLUMNS: Cols = [
  ['person_type', 'personType', 'text'], ['person_id', 'personId', 'text'], ['worker_id', 'workerId', 'text'], ['type', 'type', 'text'], ['date', 'date', 'text'],
  ['amount', 'amount', 'number'], ['notes', 'notes', 'text'], ['pay_category', 'payCategory', 'text'], ['pay_kind', 'payKind', 'text'], ['is_extra', 'isExtra', 'bool'],
  ['salary_amount', 'salaryAmount', 'number'], ['extras_amount', 'extrasAmount', 'number'], ['linked_bonus_id', 'linkedBonusId', 'text'], ['scope', 'scope', 'text'],
  ['status', 'status', 'text'], ['paid_date', 'paidDate', 'text'], ['from_supervisor_id', 'fromSupervisorId', 'text'], ['project', 'project', 'text'],
  ['is_advance', 'isAdvance', 'bool'], ['advance_approved_by', 'advanceApprovedBy', 'text'], ['advance_approved_at', 'advanceApprovedAt', 'text'],
];
export const EMPLOYEE_PENALTY_COLUMNS: Cols = [
  ['employee_id', 'employeeId', 'text'], ['date', 'date', 'text'], ['amount', 'amount', 'number'], ['reason', 'reason', 'text'], ['notes', 'notes', 'text'], ['type', 'type', 'text'],
];

const SQL_TYPE = { text: 'text', number: 'numeric', json: 'jsonb', bool: 'boolean' } as const;
const JSON_TYPE = { text: 'string', number: 'number', bool: 'boolean' } as const;
const matches = (k: string, t: Kind) => (t === 'json' ? `jsonb_typeof(p->'${k}') IN ('object','array')` : `jsonb_typeof(p->'${k}') = '${JSON_TYPE[t]}'`);
const val = (k: string, t: Kind) => `CASE WHEN ${matches(k, t)} THEN ${t === 'json' ? `p->'${k}'` : `(p->>'${k}')::${SQL_TYPE[t]}`} END`;
const typedKeys = (cols: Cols) => `ARRAY(SELECT k FROM unnest(ARRAY[${cols.map(([, k]) => `'${k}'`).join(',')}]) AS k WHERE ${cols.map(([, k, t]) => `(k = '${k}' AND ${matches(k, t).replace(`p->'${k}'`, 'p->k')})`).join(' OR ')})`;

interface Spec { table: string; collection: string; toLegacy: string; write: string; cols: Cols; project: string }
const SPECS: Spec[] = [
  { table: 'worker_payments', collection: 'workerPayments', toLegacy: 'worker_payment_to_legacy', write: 'legacy_write_worker_payment', cols: WORKER_PAYMENT_COLUMNS, project: 'NULL::text' },
  { table: 'employee_penalties', collection: 'employeePenalties', toLegacy: 'employee_penalty_to_legacy', write: 'legacy_write_employee_penalty', cols: EMPLOYEE_PENALTY_COLUMNS, project: 'NULL::text' },
];
const branch = (s: Spec) => `
      UNION ALL SELECT '${s.collection}', t.id, ${s.toLegacy}(t), t.row_version, t.deleted_at, t.created_at, t.updated_at, ${s.project} FROM ${s.table} t
        WHERE EXISTS (SELECT 1 FROM module_cutover m WHERE m.collection = '${s.collection}')`;

export class WorkerPaymentsCutover1765700000000 implements MigrationInterface {
  name = 'WorkerPaymentsCutover1765700000000';
  async up(q: QueryRunner): Promise<void> {
    for (const s of SPECS) {
      await q.query(`CREATE TABLE "${s.table}" ("id" text PRIMARY KEY,
        ${s.cols.map(([c, , t]) => `"${c}" ${SQL_TYPE[t]}`).join(', ')},
        "legacy_extra" jsonb NOT NULL DEFAULT '{}'::jsonb, "row_version" int NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz)`);
      await q.query(`CREATE FUNCTION ${s.toLegacy}(t ${s.table}) RETURNS jsonb LANGUAGE sql STABLE AS $$
        SELECT t.legacy_extra || jsonb_drop_null_keys(jsonb_build_object('id', t.id, ${s.cols.map(([c, k]) => `'${k}', t.${c}`).join(', ')})) $$`);
      await q.query(`CREATE FUNCTION ${s.write}(i text, p jsonb, keep_rev int DEFAULT NULL, created timestamptz DEFAULT NULL) RETURNS int LANGUAGE plpgsql AS $$
        DECLARE v int;
        BEGIN
          INSERT INTO ${s.table} AS t (id, ${s.cols.map(([c]) => c).join(', ')}, legacy_extra, row_version, created_at)
          VALUES (i, ${s.cols.map(([, k, t]) => val(k, t)).join(', ')}, (p - 'id') - ${typedKeys(s.cols)}, coalesce(keep_rev, 1), coalesce(created, clock_timestamp()))
          ON CONFLICT (id) DO UPDATE SET ${s.cols.map(([c]) => `${c} = EXCLUDED.${c}`).join(', ')}, legacy_extra = EXCLUDED.legacy_extra,
            row_version = t.row_version + 1, updated_at = now(), deleted_at = NULL,
            created_at = CASE WHEN t.deleted_at IS NOT NULL THEN clock_timestamp() ELSE t.created_at END
          RETURNING row_version INTO v;
          RETURN v;
        END $$`);
    }
    await q.query(`CREATE INDEX "ix_worker_payments_person" ON "worker_payments" ("person_type", "person_id", "date") WHERE "deleted_at" IS NULL`);
    await q.query(`CREATE INDEX "ix_employee_penalties_employee" ON "employee_penalties" ("employee_id", "date") WHERE "deleted_at" IS NULL`);
    const [{ def }] = await q.query(`SELECT pg_get_viewdef('legacy_records'::regclass, true) AS def`);
    await q.query(`CREATE OR REPLACE VIEW legacy_records AS ${String(def).replace(/;\s*$/, '')} ${SPECS.map(branch).join('')}`);
  }

  async down(q: QueryRunner): Promise<void> {
    const [{ n }] = await q.query(`SELECT count(*)::int AS n FROM module_cutover WHERE collection IN ('workerPayments', 'employeePenalties')`);
    if (n > 0) throw new Error('worker payments are cut over — run "cutover worker-payments rollback" first');
    const [{ def }] = await q.query(`SELECT pg_get_viewdef('legacy_records'::regclass, true) AS def`);
    const at = String(def).search(/UNION ALL\s+SELECT 'workerPayments'/);
    if (at < 0) throw new Error('legacy_records: workerPayments branch not found');
    await q.query(`DROP VIEW legacy_records`);
    await q.query(`CREATE VIEW legacy_records AS ${String(def).slice(0, at)}`);
    for (const s of SPECS.slice().reverse()) {
      await q.query(`DROP FUNCTION ${s.write}(text, jsonb, int, timestamptz)`);
      await q.query(`DROP FUNCTION ${s.toLegacy}(${s.table})`);
      await q.query(`DROP TABLE "${s.table}"`);
    }
  }
}
