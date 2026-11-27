import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 8.8.2 — جدول التكاليف (`costs`) بنفس طريقة الجداول اللي فاتت (DEC-0142).
 * **مابيتنقلش بيانات**: النقل أمر تشغيل (`npm run cutover -- costs execute`) مشروط بنسخة احتياطية + اختبار استعادة.
 *
 * - **القديم بقيمه زي ما هو** (DEC-0107): كل حقل بيروح عموده **لو نوعه مطابق بس**، والباقي في legacy_extra بالظبط (ومنه createdAt وupdatedAt).
 * - الحقول من شكل البيانات الحقيقية (DATA_DICTIONARY: 16 حقل، 41 سجل) + اللي النافذة بتكتبه. السطور (`lines`) jsonb زي ما هي.
 * - المبالغ NUMERIC من غير scale. المشروع بالاسم زي القديمة (DEC-0142 د-4)، و`projectId` لو موجود.
 */
export type Kind = 'text' | 'number' | 'json' | 'bool';
type Cols = [string, string, Kind][];
export const COST_COLUMNS: Cols = [
  ['person_kind', 'personKind', 'text'], ['person_id', 'personId', 'text'], ['date', 'date', 'text'], ['amount', 'amount', 'number'], ['lines', 'lines', 'json'],
  ['item', 'item', 'text'], ['project', 'project', 'text'], ['project_id', 'projectId', 'text'], ['department_id', 'departmentId', 'text'], ['section', 'section', 'text'],
  ['notes', 'notes', 'text'], ['extra_fields', 'extraFields', 'json'],
];

const SQL_TYPE = { text: 'text', number: 'numeric', json: 'jsonb', bool: 'boolean' } as const;
const JSON_TYPE = { text: 'string', number: 'number', bool: 'boolean' } as const;
const matches = (k: string, t: Kind) => (t === 'json' ? `jsonb_typeof(p->'${k}') IN ('object','array')` : `jsonb_typeof(p->'${k}') = '${JSON_TYPE[t]}'`);
const val = (k: string, t: Kind) => `CASE WHEN ${matches(k, t)} THEN ${t === 'json' ? `p->'${k}'` : `(p->>'${k}')::${SQL_TYPE[t]}`} END`;
const typedKeys = (cols: Cols) => `ARRAY(SELECT k FROM unnest(ARRAY[${cols.map(([, k]) => `'${k}'`).join(',')}]) AS k WHERE ${cols.map(([, k, t]) => `(k = '${k}' AND ${matches(k, t).replace(`p->'${k}'`, 'p->k')})`).join(' OR ')})`;

interface Spec { table: string; collection: string; toLegacy: string; write: string; cols: Cols; project: string }
const SPECS: Spec[] = [
  { table: 'costs', collection: 'costs', toLegacy: 'cost_to_legacy', write: 'legacy_write_cost', cols: COST_COLUMNS, project: 'NULL::text' },
];
const branch = (s: Spec) => `
      UNION ALL SELECT '${s.collection}', t.id, ${s.toLegacy}(t), t.row_version, t.deleted_at, t.created_at, t.updated_at, ${s.project} FROM ${s.table} t
        WHERE EXISTS (SELECT 1 FROM module_cutover m WHERE m.collection = '${s.collection}')`;

export class CostsCutover1765900000000 implements MigrationInterface {
  name = 'CostsCutover1765900000000';
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
    await q.query(`CREATE INDEX "ix_costs_person" ON "costs" ("person_kind", "person_id", "date") WHERE "deleted_at" IS NULL`);
    await q.query(`CREATE INDEX "ix_costs_project" ON "costs" ("project", "date") WHERE "deleted_at" IS NULL`);
    const [{ def }] = await q.query(`SELECT pg_get_viewdef('legacy_records'::regclass, true) AS def`);
    await q.query(`CREATE OR REPLACE VIEW legacy_records AS ${String(def).replace(/;\s*$/, '')} ${SPECS.map(branch).join('')}`);
  }

  async down(q: QueryRunner): Promise<void> {
    const [{ n }] = await q.query(`SELECT count(*)::int AS n FROM module_cutover WHERE collection = 'costs'`);
    if (n > 0) throw new Error('costs is cut over — run "cutover costs rollback" first');
    const [{ def }] = await q.query(`SELECT pg_get_viewdef('legacy_records'::regclass, true) AS def`);
    const at = String(def).search(/UNION ALL\s+SELECT 'costs'/);
    if (at < 0) throw new Error('legacy_records: costs branch not found');
    await q.query(`DROP VIEW legacy_records`);
    await q.query(`CREATE VIEW legacy_records AS ${String(def).slice(0, at)}`);
    for (const s of SPECS.slice().reverse()) {
      await q.query(`DROP FUNCTION ${s.write}(text, jsonb, int, timestamptz)`);
      await q.query(`DROP FUNCTION ${s.toLegacy}(${s.table})`);
      await q.query(`DROP TABLE "${s.table}"`);
    }
  }
}
