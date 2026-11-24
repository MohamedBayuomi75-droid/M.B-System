import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 8.3.3 — جدول الموظفين بنفس طريقة العمال والمشرفين والسواقين (DEC-0125). **مابيتنقلش بيانات**: النقل أمر تشغيل
 * (`npm run cutover -- employees execute`) مشروط بنسخة احتياطية + اختبار استعادة.
 *
 * - **القديم بقيمه زي ما هو** (DEC-0107): كل حقل بيروح عموده **لو نوعه مطابق بس**، والباقي بيفضل في legacy_extra بالظبط،
 *   وعدده بيطلع في تقرير النقل (untyped). مفيش قيود على الكود ولا الاسم.
 * - الحقول من شكل البيانات الحقيقية (DATA_DICTIONARY: 34 حقل) + حقول النافذة والأرشيف.
 * - `leave_balance` NUMERIC بيتحفظ زي ما هو (د-4)، وحسابه من الإجازات في الحزمة 8.4.
 * - الراتب NUMERIC من غير scale. **حمايته مابتتغيّرش** (B-48): field-guards بيشيله من الرد.
 * - project_id في فرع legacy_records = projectId (نطاق المشروع).
 */
export type Kind = 'text' | 'number' | 'json' | 'bool';
type Cols = [string, string, Kind][];
export const EMPLOYEE_COLUMNS: Cols = [
  ['code', 'code', 'text'], ['name', 'name', 'text'], ['status', 'status', 'text'], ['position', 'position', 'text'],
  ['employment_type', 'employmentType', 'text'], ['email', 'email', 'text'], ['leave_balance', 'leaveBalance', 'number'], ['leave_auto', 'leaveAuto', 'bool'],
  ['salary', 'salary', 'number'], ['basic_salary', 'basicSalary', 'number'], ['license_grade', 'licenseGrade', 'text'],
  ['project', 'project', 'text'], ['project_id', 'projectId', 'text'], ['project_since', 'projectSince', 'text'],
  ['department_id', 'departmentId', 'text'], ['category_id', 'categoryId', 'text'], ['legacy_department_id', 'legacyDepartmentId', 'text'], ['previous_department_id', 'previousDepartmentId', 'text'],
  ['national_id', 'nationalId', 'text'], ['phone', 'phone', 'text'], ['address', 'address', 'text'], ['birth_date', 'birthDate', 'text'],
  ['id_card_expiry', 'idCardExpiry', 'text'], ['id_card_status', 'idCardStatus', 'text'], ['license_expiry', 'licenseExpiry', 'text'], ['license_status', 'licenseStatus', 'text'],
  ['hire_date', 'hireDate', 'text'], ['contract_type', 'contractType', 'text'], ['contract_status', 'contractStatus', 'text'], ['insurance_status', 'insuranceStatus', 'text'], ['insurance_number', 'insuranceNumber', 'text'],
  ['archive_group', 'archiveGroup', 'text'], ['resigned_at', 'resignedAt', 'text'], ['retired_at', 'retiredAt', 'text'],
  ['notes', 'notes', 'text'], ['dismissed_notes', 'dismissedNotes', 'json'], ['custom', 'custom', 'json'], ['extra_fields', 'extraFields', 'json'], ['attachments', 'attachments', 'json'],
];

const SQL_TYPE = { text: 'text', number: 'numeric', json: 'jsonb', bool: 'boolean' } as const;
const JSON_TYPE = { text: 'string', number: 'number', bool: 'boolean' } as const;
const matches = (k: string, t: Kind) => (t === 'json' ? `jsonb_typeof(p->'${k}') IN ('object','array')` : `jsonb_typeof(p->'${k}') = '${JSON_TYPE[t]}'`);
const val = (k: string, t: Kind) => `CASE WHEN ${matches(k, t)} THEN ${t === 'json' ? `p->'${k}'` : `(p->>'${k}')::${SQL_TYPE[t]}`} END`;
const COLS = EMPLOYEE_COLUMNS;
const typedKeys = `ARRAY(SELECT k FROM unnest(ARRAY[${COLS.map(([, k]) => `'${k}'`).join(',')}]) AS k WHERE ${COLS.map(([, k, t]) => `(k = '${k}' AND ${matches(k, t).replace(`p->'${k}'`, 'p->k')})`).join(' OR ')})`;

export class EmployeesCutover1765400000000 implements MigrationInterface {
  name = 'EmployeesCutover1765400000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "employees" ("id" text PRIMARY KEY,
      ${COLS.map(([c, , t]) => `"${c}" ${SQL_TYPE[t]}`).join(', ')},
      "legacy_extra" jsonb NOT NULL DEFAULT '{}'::jsonb, "row_version" int NOT NULL DEFAULT 1,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz)`);
    await q.query(`CREATE INDEX "ix_employees_project" ON "employees" ("project_id") WHERE "deleted_at" IS NULL AND "project_id" IS NOT NULL`);
    await q.query(`CREATE FUNCTION employee_to_legacy(t employees) RETURNS jsonb LANGUAGE sql STABLE AS $$
      SELECT t.legacy_extra || jsonb_drop_null_keys(jsonb_build_object('id', t.id, ${COLS.map(([c, k]) => `'${k}', t.${c}`).join(', ')})) $$`);
    await q.query(`CREATE FUNCTION legacy_write_employee(i text, p jsonb, keep_rev int DEFAULT NULL, created timestamptz DEFAULT NULL) RETURNS int LANGUAGE plpgsql AS $$
      DECLARE v int;
      BEGIN
        INSERT INTO employees AS t (id, ${COLS.map(([c]) => c).join(', ')}, legacy_extra, row_version, created_at)
        VALUES (i, ${COLS.map(([, k, t]) => val(k, t)).join(', ')}, (p - 'id') - ${typedKeys}, coalesce(keep_rev, 1), coalesce(created, clock_timestamp()))
        ON CONFLICT (id) DO UPDATE SET ${COLS.map(([c]) => `${c} = EXCLUDED.${c}`).join(', ')}, legacy_extra = EXCLUDED.legacy_extra,
          row_version = t.row_version + 1, updated_at = now(), deleted_at = NULL,
          created_at = CASE WHEN t.deleted_at IS NOT NULL THEN clock_timestamp() ELSE t.created_at END
        RETURNING row_version INTO v;
        RETURN v;
      END $$`);
    const [{ def }] = await q.query(`SELECT pg_get_viewdef('legacy_records'::regclass, true) AS def`);
    await q.query(`CREATE OR REPLACE VIEW legacy_records AS ${String(def).replace(/;\s*$/, '')}
      UNION ALL SELECT 'employees', t.id, employee_to_legacy(t), t.row_version, t.deleted_at, t.created_at, t.updated_at, t.project_id FROM employees t
        WHERE EXISTS (SELECT 1 FROM module_cutover m WHERE m.collection = 'employees')`);
  }

  async down(q: QueryRunner): Promise<void> {
    const [{ n }] = await q.query(`SELECT count(*)::int AS n FROM module_cutover WHERE collection = 'employees'`);
    if (n > 0) throw new Error('employees are cut over — run "cutover employees rollback" first');
    const [{ def }] = await q.query(`SELECT pg_get_viewdef('legacy_records'::regclass, true) AS def`);
    const at = String(def).search(/UNION ALL\s+SELECT 'employees'/);
    if (at < 0) throw new Error('legacy_records: employees branch not found');
    await q.query(`DROP VIEW legacy_records`);
    await q.query(`CREATE VIEW legacy_records AS ${String(def).slice(0, at)}`);
    await q.query(`DROP FUNCTION legacy_write_employee(text, jsonb, int, timestamptz)`);
    await q.query(`DROP FUNCTION employee_to_legacy(employees)`);
    await q.query(`DROP TABLE "employees"`);
  }
}
