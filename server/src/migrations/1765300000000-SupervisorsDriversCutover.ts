import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 8.2.3 — جدولي المشرفين والسواقين بنفس طريقة العمال (8.1.3، DEC-0123). **مابتنقلش بيانات**: النقل أمر تشغيل
 * (`npm run cutover -- supervisors-drivers execute`) مشروط بنسخة احتياطية + اختبار استعادة.
 *
 * - **القديم بقيمه زي ما هو** (DEC-0107): كل حقل بيروح عموده **لو نوعه مطابق بس**، والباقي بيفضل في legacy_extra بالظبط،
 *   وعدده بيطلع في تقرير النقل (untyped). مفيش قيود على الكود ولا الاسم.
 * - الحقول من شكل البيانات الحقيقية (DATA_DICTIONARY: 28 للمشرفين و30 للسواقين) + حقول النوافذ والأرشيف.
 * - `external` (السواق من خارج الشركة) boolean: مش موجود في البيانات الحقيقية لسه، بس نافذة السواق الخارجي بتكتبه.
 * - الأجر والراتب NUMERIC من غير scale. **حمايتهم مابتتغيّرش** (B-48): field-guards بيشيلهم من الرد.
 * - project_id في فرع legacy_records = projectId (نطاق المشروع — collection-pages: PROJ).
 */
export type Kind = 'text' | 'number' | 'json' | 'bool';
type Cols = [string, string, Kind][];
const PERSON: Cols = [
  ['code', 'code', 'text'], ['name', 'name', 'text'], ['status', 'status', 'text'], ['skill', 'skill', 'text'], ['position', 'position', 'text'],
  ['daily_wage', 'dailyWage', 'number'],
  ['project', 'project', 'text'], ['project_id', 'projectId', 'text'], ['project_since', 'projectSince', 'text'],
  ['department_id', 'departmentId', 'text'], ['category_id', 'categoryId', 'text'], ['legacy_department_id', 'legacyDepartmentId', 'text'], ['previous_department_id', 'previousDepartmentId', 'text'],
  ['national_id', 'nationalId', 'text'], ['phone', 'phone', 'text'], ['address', 'address', 'text'], ['birth_date', 'birthDate', 'text'],
  ['id_card_expiry', 'idCardExpiry', 'text'], ['id_card_status', 'idCardStatus', 'text'], ['license_expiry', 'licenseExpiry', 'text'], ['license_status', 'licenseStatus', 'text'],
  ['hire_date', 'hireDate', 'text'], ['contract_type', 'contractType', 'text'], ['contract_status', 'contractStatus', 'text'], ['insurance_status', 'insuranceStatus', 'text'], ['insurance_number', 'insuranceNumber', 'text'],
  ['archive_group', 'archiveGroup', 'text'], ['resigned_at', 'resignedAt', 'text'], ['retired_at', 'retiredAt', 'text'],
  ['notes', 'notes', 'text'], ['dismissed_notes', 'dismissedNotes', 'json'], ['custom', 'custom', 'json'], ['extra_fields', 'extraFields', 'json'], ['attachments', 'attachments', 'json'],
];
export const SUPERVISOR_COLUMNS: Cols = PERSON;
export const DRIVER_COLUMNS: Cols = [...PERSON.slice(0, 6), ['salary', 'salary', 'number'], ['basic_salary', 'basicSalary', 'number'], ['external', 'external', 'bool'], ['license_grade', 'licenseGrade', 'text'], ...PERSON.slice(6)];

const SQL_TYPE = { text: 'text', number: 'numeric', json: 'jsonb', bool: 'boolean' } as const;
const JSON_TYPE = { text: 'string', number: 'number', bool: 'boolean' } as const;
const matches = (k: string, t: Kind) => (t === 'json' ? `jsonb_typeof(p->'${k}') IN ('object','array')` : `jsonb_typeof(p->'${k}') = '${JSON_TYPE[t]}'`);
const val = (k: string, t: Kind) => `CASE WHEN ${matches(k, t)} THEN ${t === 'json' ? `p->'${k}'` : `(p->>'${k}')::${SQL_TYPE[t]}`} END`;

interface Spec { table: string; collection: string; toLegacy: string; write: string; cols: Cols }
const SPECS: Spec[] = [
  { table: 'supervisors', collection: 'supervisors', toLegacy: 'supervisor_to_legacy', write: 'legacy_write_supervisor', cols: SUPERVISOR_COLUMNS },
  { table: 'drivers', collection: 'drivers', toLegacy: 'driver_to_legacy', write: 'legacy_write_driver', cols: DRIVER_COLUMNS },
];
const typedKeys = (cols: Cols) => `ARRAY(SELECT k FROM unnest(ARRAY[${cols.map(([, k]) => `'${k}'`).join(',')}]) AS k WHERE ${cols.map(([, k, t]) => `(k = '${k}' AND ${matches(k, t).replace(`p->'${k}'`, 'p->k')})`).join(' OR ')})`;
const branch = (s: Spec) => `
      UNION ALL SELECT '${s.collection}', t.id, ${s.toLegacy}(t), t.row_version, t.deleted_at, t.created_at, t.updated_at, t.project_id FROM ${s.table} t
        WHERE EXISTS (SELECT 1 FROM module_cutover m WHERE m.collection = '${s.collection}')`;

export class SupervisorsDriversCutover1765300000000 implements MigrationInterface {
  name = 'SupervisorsDriversCutover1765300000000';
  async up(q: QueryRunner): Promise<void> {
    for (const s of SPECS) {
      await q.query(`CREATE TABLE "${s.table}" ("id" text PRIMARY KEY,
        ${s.cols.map(([c, , t]) => `"${c}" ${SQL_TYPE[t]}`).join(', ')},
        "legacy_extra" jsonb NOT NULL DEFAULT '{}'::jsonb, "row_version" int NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz)`);
      await q.query(`CREATE INDEX "ix_${s.table}_project" ON "${s.table}" ("project_id") WHERE "deleted_at" IS NULL AND "project_id" IS NOT NULL`);
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
    const [{ def }] = await q.query(`SELECT pg_get_viewdef('legacy_records'::regclass, true) AS def`);
    await q.query(`CREATE OR REPLACE VIEW legacy_records AS ${String(def).replace(/;\s*$/, '')} ${SPECS.map(branch).join('')}`);
  }

  async down(q: QueryRunner): Promise<void> {
    const [{ n }] = await q.query(`SELECT count(*)::int AS n FROM module_cutover WHERE collection IN ('supervisors', 'drivers')`);
    if (n > 0) throw new Error('supervisors/drivers are cut over — run "cutover supervisors-drivers rollback" first');
    const [{ def }] = await q.query(`SELECT pg_get_viewdef('legacy_records'::regclass, true) AS def`);
    const at = String(def).search(/UNION ALL\s+SELECT 'supervisors'/);
    if (at < 0) throw new Error('legacy_records: supervisors branch not found');
    await q.query(`DROP VIEW legacy_records`);
    await q.query(`CREATE VIEW legacy_records AS ${String(def).slice(0, at)}`);
    for (const s of SPECS.slice().reverse()) {
      await q.query(`DROP FUNCTION ${s.write}(text, jsonb, int, timestamptz)`);
      await q.query(`DROP FUNCTION ${s.toLegacy}(${s.table})`);
      await q.query(`DROP TABLE "${s.table}"`);
    }
  }
}
