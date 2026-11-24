import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 8.5.3 — جدولي اليوميات (`workerAttendance` ← `worker_attendance`) وحضور الموظفين (`attendance`) بنفس طريقة الجداول اللي فاتت (DEC-0135).
 * **مابيتنقلش بيانات**: النقل أمر تشغيل (`npm run cutover -- attendance execute`) مشروط بنسخة احتياطية + اختبار استعادة.
 *
 * - **القديم بقيمه زي ما هو** (DEC-0107): كل حقل بيروح عموده **لو نوعه مطابق بس**، والباقي في legacy_extra بالظبط، وعدده في تقرير النقل.
 * - الحقول من شكل البيانات الحقيقية (DATA_DICTIONARY: 15 حقل لليوميات) + اللي النافذة بتكتبه، و`driverId` (normalizeAttendanceRecord).
 * - **تثبيت الأجر (DEC-0130، د-3):** في أمر النقل (cutover-modules: ATTENDANCE)، مش هنا.
 * - **قرار المراجعة (DEC-0133):** reviewDecision (count / void) وreviewReason وreviewedBy وreviewedAt — بيتكتبوا من الشاشة الجديدة بس.
 * - المبالغ NUMERIC من غير scale. نطاق المشروع: project_id = projectId (اليوميات)، وNULL لحضور الموظفين.
 */
export type Kind = 'text' | 'number' | 'json' | 'bool';
type Cols = [string, string, Kind][];
export const WORKER_ATTENDANCE_COLUMNS: Cols = [
  ['person_type', 'personType', 'text'], ['person_kind', 'personKind', 'text'], ['person_id', 'personId', 'text'], ['worker_id', 'workerId', 'text'], ['supervisor_id', 'supervisorId', 'text'],
  ['driver_id', 'driverId', 'text'], ['date', 'date', 'text'], ['status', 'status', 'text'], ['days', 'days', 'number'], ['day_wage', 'dayWage', 'number'], ['deduction', 'deduction', 'number'],
  ['project', 'project', 'text'], ['project_id', 'projectId', 'text'], ['site', 'site', 'text'], ['notes', 'notes', 'text'],
  ['day_wage_source', 'dayWageSource', 'text'], ['review_decision', 'reviewDecision', 'text'], ['review_reason', 'reviewReason', 'text'], ['reviewed_by', 'reviewedBy', 'text'], ['reviewed_at', 'reviewedAt', 'text'],
];
export const ATTENDANCE_COLUMNS: Cols = [
  ['employee_id', 'employeeId', 'text'], ['date', 'date', 'text'], ['status', 'status', 'text'], ['check_in', 'checkIn', 'text'], ['check_out', 'checkOut', 'text'], ['notes', 'notes', 'text'],
];

const SQL_TYPE = { text: 'text', number: 'numeric', json: 'jsonb', bool: 'boolean' } as const;
const JSON_TYPE = { text: 'string', number: 'number', bool: 'boolean' } as const;
const matches = (k: string, t: Kind) => (t === 'json' ? `jsonb_typeof(p->'${k}') IN ('object','array')` : `jsonb_typeof(p->'${k}') = '${JSON_TYPE[t]}'`);
const val = (k: string, t: Kind) => `CASE WHEN ${matches(k, t)} THEN ${t === 'json' ? `p->'${k}'` : `(p->>'${k}')::${SQL_TYPE[t]}`} END`;
const typedKeys = (cols: Cols) => `ARRAY(SELECT k FROM unnest(ARRAY[${cols.map(([, k]) => `'${k}'`).join(',')}]) AS k WHERE ${cols.map(([, k, t]) => `(k = '${k}' AND ${matches(k, t).replace(`p->'${k}'`, 'p->k')})`).join(' OR ')})`;

interface Spec { table: string; collection: string; toLegacy: string; write: string; cols: Cols; project: string }
const SPECS: Spec[] = [
  { table: 'worker_attendance', collection: 'workerAttendance', toLegacy: 'worker_attendance_to_legacy', write: 'legacy_write_worker_attendance', cols: WORKER_ATTENDANCE_COLUMNS, project: 't.project_id' },
  { table: 'attendance', collection: 'attendance', toLegacy: 'attendance_to_legacy', write: 'legacy_write_attendance', cols: ATTENDANCE_COLUMNS, project: 'NULL::text' },
];
const branch = (s: Spec) => `
      UNION ALL SELECT '${s.collection}', t.id, ${s.toLegacy}(t), t.row_version, t.deleted_at, t.created_at, t.updated_at, ${s.project} FROM ${s.table} t
        WHERE EXISTS (SELECT 1 FROM module_cutover m WHERE m.collection = '${s.collection}')`;

export class AttendanceCutover1765600000000 implements MigrationInterface {
  name = 'AttendanceCutover1765600000000';
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
    await q.query(`CREATE INDEX "ix_worker_attendance_person" ON "worker_attendance" ("person_id", "date") WHERE "deleted_at" IS NULL`);
    await q.query(`CREATE INDEX "ix_worker_attendance_project" ON "worker_attendance" ("project_id") WHERE "deleted_at" IS NULL AND "project_id" IS NOT NULL`);
    const [{ def }] = await q.query(`SELECT pg_get_viewdef('legacy_records'::regclass, true) AS def`);
    await q.query(`CREATE OR REPLACE VIEW legacy_records AS ${String(def).replace(/;\s*$/, '')} ${SPECS.map(branch).join('')}`);
  }

  async down(q: QueryRunner): Promise<void> {
    const [{ n }] = await q.query(`SELECT count(*)::int AS n FROM module_cutover WHERE collection IN ('workerAttendance', 'attendance')`);
    if (n > 0) throw new Error('attendance is cut over — run "cutover attendance rollback" first');
    const [{ def }] = await q.query(`SELECT pg_get_viewdef('legacy_records'::regclass, true) AS def`);
    const at = String(def).search(/UNION ALL\s+SELECT 'workerAttendance'/);
    if (at < 0) throw new Error('legacy_records: workerAttendance branch not found');
    await q.query(`DROP VIEW legacy_records`);
    await q.query(`CREATE VIEW legacy_records AS ${String(def).slice(0, at)}`);
    for (const s of SPECS.slice().reverse()) {
      await q.query(`DROP FUNCTION ${s.write}(text, jsonb, int, timestamptz)`);
      await q.query(`DROP FUNCTION ${s.toLegacy}(${s.table})`);
      await q.query(`DROP TABLE "${s.table}"`);
    }
  }
}
