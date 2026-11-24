import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 8.4.3 — جدول الإجازات بنفس طريقة جداول الأشخاص (DEC-0127). **مابيتنقلش بيانات**: النقل أمر تشغيل
 * (`npm run cutover -- leaves execute`) مشروط بنسخة احتياطية + اختبار استعادة.
 *
 * - **القديم بقيمه زي ما هو** (DEC-0107): كل حقل بيروح عموده **لو نوعه مطابق بس**، والباقي بيفضل في legacy_extra بالظبط،
 *   وعدده بيطلع في تقرير النقل (untyped). مفيش قيود على التواريخ ولا الحالة ولا الشخص (القديمة بتقبل أي قيمة — زي الإجازة بعكس التواريخ).
 * - الحقول من شكل البيانات الحقيقية (DATA_DICTIONARY: 11 حقل) + اللي النافذة بتكتبه. `from` و`to` في أعمدة `from_date` و`to_date`
 *   (كلمات محجوزة في SQL) ونوعها نص زي القديمة.
 * - `days` NUMERIC من غير scale (النافذة بتقبل نص يوم).
 * - مالهاش نطاق مشروع: project_id في فرع legacy_records = NULL.
 */
export type Kind = 'text' | 'number' | 'json' | 'bool';
type Cols = [string, string, Kind][];
export const LEAVE_COLUMNS: Cols = [
  ['person_kind', 'personKind', 'text'], ['person_id', 'personId', 'text'], ['employee_id', 'employeeId', 'text'], ['type', 'type', 'text'],
  ['from_date', 'from', 'text'], ['to_date', 'to', 'text'], ['days', 'days', 'number'], ['reason', 'reason', 'text'], ['status', 'status', 'text'], ['code', 'code', 'text'],
];

const SQL_TYPE = { text: 'text', number: 'numeric', json: 'jsonb', bool: 'boolean' } as const;
const JSON_TYPE = { text: 'string', number: 'number', bool: 'boolean' } as const;
const matches = (k: string, t: Kind) => (t === 'json' ? `jsonb_typeof(p->'${k}') IN ('object','array')` : `jsonb_typeof(p->'${k}') = '${JSON_TYPE[t]}'`);
const val = (k: string, t: Kind) => `CASE WHEN ${matches(k, t)} THEN ${t === 'json' ? `p->'${k}'` : `(p->>'${k}')::${SQL_TYPE[t]}`} END`;
const COLS = LEAVE_COLUMNS;
const typedKeys = `ARRAY(SELECT k FROM unnest(ARRAY[${COLS.map(([, k]) => `'${k}'`).join(',')}]) AS k WHERE ${COLS.map(([, k, t]) => `(k = '${k}' AND ${matches(k, t).replace(`p->'${k}'`, 'p->k')})`).join(' OR ')})`;

export class LeavesCutover1765500000000 implements MigrationInterface {
  name = 'LeavesCutover1765500000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "leaves" ("id" text PRIMARY KEY,
      ${COLS.map(([c, , t]) => `"${c}" ${SQL_TYPE[t]}`).join(', ')},
      "legacy_extra" jsonb NOT NULL DEFAULT '{}'::jsonb, "row_version" int NOT NULL DEFAULT 1,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz)`);
    await q.query(`CREATE INDEX "ix_leaves_person" ON "leaves" ("person_kind", "person_id") WHERE "deleted_at" IS NULL`);
    await q.query(`CREATE FUNCTION leave_to_legacy(t leaves) RETURNS jsonb LANGUAGE sql STABLE AS $$
      SELECT t.legacy_extra || jsonb_drop_null_keys(jsonb_build_object('id', t.id, ${COLS.map(([c, k]) => `'${k}', t.${c}`).join(', ')})) $$`);
    await q.query(`CREATE FUNCTION legacy_write_leave(i text, p jsonb, keep_rev int DEFAULT NULL, created timestamptz DEFAULT NULL) RETURNS int LANGUAGE plpgsql AS $$
      DECLARE v int;
      BEGIN
        INSERT INTO leaves AS t (id, ${COLS.map(([c]) => c).join(', ')}, legacy_extra, row_version, created_at)
        VALUES (i, ${COLS.map(([, k, t]) => val(k, t)).join(', ')}, (p - 'id') - ${typedKeys}, coalesce(keep_rev, 1), coalesce(created, clock_timestamp()))
        ON CONFLICT (id) DO UPDATE SET ${COLS.map(([c]) => `${c} = EXCLUDED.${c}`).join(', ')}, legacy_extra = EXCLUDED.legacy_extra,
          row_version = t.row_version + 1, updated_at = now(), deleted_at = NULL,
          created_at = CASE WHEN t.deleted_at IS NOT NULL THEN clock_timestamp() ELSE t.created_at END
        RETURNING row_version INTO v;
        RETURN v;
      END $$`);
    const [{ def }] = await q.query(`SELECT pg_get_viewdef('legacy_records'::regclass, true) AS def`);
    await q.query(`CREATE OR REPLACE VIEW legacy_records AS ${String(def).replace(/;\s*$/, '')}
      UNION ALL SELECT 'leaves', t.id, leave_to_legacy(t), t.row_version, t.deleted_at, t.created_at, t.updated_at, NULL::text FROM leaves t
        WHERE EXISTS (SELECT 1 FROM module_cutover m WHERE m.collection = 'leaves')`);
  }

  async down(q: QueryRunner): Promise<void> {
    const [{ n }] = await q.query(`SELECT count(*)::int AS n FROM module_cutover WHERE collection = 'leaves'`);
    if (n > 0) throw new Error('leaves are cut over — run "cutover leaves rollback" first');
    const [{ def }] = await q.query(`SELECT pg_get_viewdef('legacy_records'::regclass, true) AS def`);
    const at = String(def).search(/UNION ALL\s+SELECT 'leaves'/);
    if (at < 0) throw new Error('legacy_records: leaves branch not found');
    await q.query(`DROP VIEW legacy_records`);
    await q.query(`CREATE VIEW legacy_records AS ${String(def).slice(0, at)}`);
    await q.query(`DROP FUNCTION legacy_write_leave(text, jsonb, int, timestamptz)`);
    await q.query(`DROP FUNCTION leave_to_legacy(leaves)`);
    await q.query(`DROP TABLE "leaves"`);
  }
}
