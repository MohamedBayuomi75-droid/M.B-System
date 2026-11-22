import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 7.4.3 — جدول المشروعات بنفس طريقة 7.1–7.3 (DEC-0117) بدل جدول المرحلة 5 (Foundation، فاضي ومابيتكتبش فيه).
 * **مابتنقلش بيانات**: النقل أمر تشغيل (`npm run cutover -- projects execute`) مشروط بنسخة احتياطية + اختبار استعادة.
 *
 * - **القديم بقيمه زي ما هو** (DEC-0107): كل حقل بيروح عموده **لو نوعه مطابق بس**، والباقي بيفضل في legacy_extra بالظبط،
 *   وعدده بيطلع في تقرير النقل (untyped). مفيش قيود على الاسم ولا الكود ولا الميزانية: الواجهة القديمة بتمنع التكرار في النافذة بس،
 *   والبيانات القديمة ممكن يكون فيها اللي يخالف — والسيرفر بيتحقق للجديد (7.4.4).
 * - حقول مسار المشروع (stageKey وstepMeta وpathHistory و workflowSnapshot ...) أعمدة jsonb/text بقيمها بالظبط (DEC-0117 د-1).
 * - القيمة والميزانية NUMERIC من غير scale: القديم بكل خاناته.
 * - project_id في فرع legacy_records = معرّف المشروع نفسه (نطاق المشروع على المشروعات بالمعرّف — collection-pages).
 */
type Kind = 'text' | 'number' | 'json';
const COLS: [string, string, Kind][] = [
  ['code', 'code', 'text'], ['name', 'name', 'text'], ['status', 'status', 'text'], ['budget', 'budget', 'number'], ['value', 'value', 'number'],
  ['customer_id', 'customerId', 'text'], ['customer_name', 'customerName', 'text'], ['customer', 'customer', 'text'], ['contract_no', 'contractNo', 'text'],
  ['start_date', 'start', 'text'], ['end_date', 'end', 'text'], ['progress', 'progress', 'number'], ['supervisor_id', 'supervisorId', 'text'],
  ['assigned_to', 'assignedTo', 'text'], ['notes', 'notes', 'text'], ['extra_fields', 'extraFields', 'json'], ['attachments', 'attachments', 'json'],
  ['stage_key', 'stageKey', 'text'], ['step_key', 'stepKey', 'text'], ['step_meta', 'stepMeta', 'json'], ['completed_steps', 'completedSteps', 'json'],
  ['step_files', 'stepFiles', 'json'], ['path_history', 'pathHistory', 'json'], ['workflow_snapshot', 'workflowSnapshot', 'json'],
  ['tender_stance', 'tenderStance', 'text'], ['reject_reason', 'rejectReason', 'text'], ['status_before_reject', 'statusBeforeReject', 'text'],
];
export const PROJECT_COLUMNS = COLS;
const SQL_TYPE = { text: 'text', number: 'numeric', json: 'jsonb' } as const;
const matches = (k: string, t: Kind) => (t === 'json' ? `jsonb_typeof(p->'${k}') IN ('object','array')` : `jsonb_typeof(p->'${k}') = '${t === 'text' ? 'string' : 'number'}'`);
const val = (k: string, t: Kind) => `CASE WHEN ${matches(k, t)} THEN ${t === 'json' ? `p->'${k}'` : `(p->>'${k}')::${SQL_TYPE[t]}`} END`;
const typedKeys = `ARRAY(SELECT k FROM unnest(ARRAY[${COLS.map(([, k]) => `'${k}'`).join(',')}]) AS k WHERE ${COLS.map(([, k, t]) => `(k = '${k}' AND ${matches(k, t).replace(`p->'${k}'`, 'p->k')})`).join(' OR ')})`;
const BRANCH = `
      UNION ALL SELECT 'projects', t.id, project_to_legacy(t), t.row_version, t.deleted_at, t.created_at, t.updated_at, t.id FROM projects t
        WHERE EXISTS (SELECT 1 FROM module_cutover m WHERE m.collection = 'projects')`;

export class ProjectsCutover1765100000000 implements MigrationInterface {
  name = 'ProjectsCutover1765100000000';
  async up(q: QueryRunner): Promise<void> {
    const [{ n }] = await q.query(`SELECT count(*)::int AS n FROM projects`);
    if (n > 0) throw new Error(`projects (phase-5 table) has ${n} rows — it was never written by the app; inspect before replacing it`);
    await q.query(`DROP TABLE "projects"`);
    await q.query(`CREATE TABLE "projects" ("id" text PRIMARY KEY,
      ${COLS.map(([c, , t]) => `"${c}" ${SQL_TYPE[t]}`).join(', ')},
      "legacy_extra" jsonb NOT NULL DEFAULT '{}'::jsonb, "row_version" int NOT NULL DEFAULT 1,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz)`);
    await q.query(`CREATE INDEX "ix_projects_customer" ON "projects" ("customer_id") WHERE "deleted_at" IS NULL AND "customer_id" IS NOT NULL`);
    await q.query(`CREATE INDEX "ix_projects_name" ON "projects" (btrim("name")) WHERE "deleted_at" IS NULL`);

    await q.query(`CREATE FUNCTION project_to_legacy(t projects) RETURNS jsonb LANGUAGE sql STABLE AS $$
      SELECT t.legacy_extra || jsonb_drop_null_keys(jsonb_build_object('id', t.id, ${COLS.map(([c, k]) => `'${k}', t.${c}`).join(', ')})) $$`);
    await q.query(`CREATE FUNCTION legacy_write_project(i text, p jsonb, keep_rev int DEFAULT NULL, created timestamptz DEFAULT NULL) RETURNS int LANGUAGE plpgsql AS $$
      DECLARE v int;
      BEGIN
        INSERT INTO projects AS t (id, ${COLS.map(([c]) => c).join(', ')}, legacy_extra, row_version, created_at)
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
    const [{ n }] = await q.query(`SELECT count(*)::int AS n FROM module_cutover WHERE collection = 'projects'`);
    if (n > 0) throw new Error('projects are cut over — run "cutover projects rollback" first');
    const [{ def }] = await q.query(`SELECT pg_get_viewdef('legacy_records'::regclass, true) AS def`);
    const at = String(def).search(/UNION ALL\s+SELECT 'projects'/);
    if (at < 0) throw new Error('legacy_records: projects branch not found');
    await q.query(`DROP VIEW legacy_records`);
    await q.query(`CREATE VIEW legacy_records AS ${String(def).slice(0, at)}`);
    await q.query(`DROP FUNCTION legacy_write_project(text, jsonb, int, timestamptz)`);
    await q.query(`DROP FUNCTION project_to_legacy(projects)`);
    await q.query(`DROP TABLE "projects"`);
    // جدول المرحلة 5 زي ما كان بعد MoneySixDecimals
    await q.query(`CREATE TABLE "projects" (
      "id" text PRIMARY KEY,
      "code" text, "name" text NOT NULL CHECK (length(btrim("name")) > 0),
      "status" text, "stage" text,
      "budget" numeric(20,6) CHECK ("budget" IS NULL OR "budget" >= 0),
      "customer_id" text, "supervisor_id" text,
      "legacy_name" text, "legacy_rev" int,
      "extra" jsonb NOT NULL DEFAULT '{}',
      "row_version" int NOT NULL DEFAULT 1,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE UNIQUE INDEX "uq_projects_code" ON "projects" (lower("code")) WHERE "code" IS NOT NULL AND "code" <> ''`);
    await q.query(`CREATE UNIQUE INDEX "uq_projects_name" ON "projects" (btrim("name"))`);
  }
}
