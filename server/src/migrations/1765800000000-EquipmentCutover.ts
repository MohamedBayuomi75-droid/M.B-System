import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 8.7.2 — جدولي المعدات (`equipment`) ويومياتها (`equipmentDaily` ← `equipment_daily`) بنفس طريقة الجداول اللي فاتت (DEC-0139).
 * **مابيتنقلش بيانات**: النقل أمر تشغيل (`npm run cutover -- equipment execute`) مشروط بنسخة احتياطية + اختبار استعادة.
 *
 * - **القديم بقيمه زي ما هو** (DEC-0107): كل حقل بيروح عموده **لو نوعه مطابق بس**، والباقي في legacy_extra بالظبط، وعدده في تقرير النقل.
 * - الحقول من شكل البيانات الحقيقية (DATA_DICTIONARY: 47 حقل للمعدة و14 لليومية) + اللي النوافذ بتكتبه (driverId، brand، serial…).
 * - **تكلفة النقل (DEC-0140):** `moveCost` في اليومية — بتتكتب من الشاشة الجديدة بس.
 * - المبالغ NUMERIC من غير scale. نطاق المشروع: مالهمش (project بالاسم زي القديمة) — project_id في فرع legacy_records = NULL.
 */
export type Kind = 'text' | 'number' | 'json' | 'bool';
type Cols = [string, string, Kind][];
export const EQUIPMENT_COLUMNS: Cols = [
  ['name', 'name', 'text'], ['code', 'code', 'text'], ['type_label', 'typeLabel', 'text'], ['type', 'type', 'text'], ['status', 'status', 'text'], ['ownership', 'ownership', 'text'],
  ['vehicle_number', 'vehicleNumber', 'text'], ['plate', 'plate', 'text'], ['color', 'color', 'text'], ['motor_number', 'motorNumber', 'text'], ['serial', 'serial', 'text'],
  ['chassis_number', 'chassisNumber', 'text'], ['insurance_number', 'insuranceNumber', 'text'], ['insurance_status', 'insuranceStatus', 'text'], ['model', 'model', 'text'], ['brand', 'brand', 'text'],
  ['inspection_date', 'inspectionDate', 'text'], ['license_issue_date', 'licenseIssueDate', 'text'], ['vehicle_license_expiry', 'vehicleLicenseExpiry', 'text'], ['vehicle_license_status', 'vehicleLicenseStatus', 'text'],
  ['license_expiry', 'licenseExpiry', 'text'], ['license_status', 'licenseStatus', 'text'], ['license_category', 'licenseCategory', 'text'],
  ['driver_id', 'driverId', 'text'], ['driver_name', 'driverName', 'text'], ['driver_license_expiry', 'driverLicenseExpiry', 'text'], ['driver_license_status', 'driverLicenseStatus', 'text'],
  ['project', 'project', 'text'], ['project_since', 'projectSince', 'text'], ['notes', 'notes', 'text'], ['category_id', 'categoryId', 'text'], ['department_id', 'departmentId', 'text'],
  ['legacy_department_id', 'legacyDepartmentId', 'text'], ['supervisor_id', 'supervisorId', 'text'], ['location', 'location', 'text'],
  ['daily_cost', 'dailyCost', 'number'], ['hourly_cost', 'hourlyCost', 'number'], ['fuel_price', 'fuelPrice', 'number'], ['total_hours', 'totalHours', 'number'], ['rental_daily', 'rentalDaily', 'number'],
  ['purchase_date', 'purchaseDate', 'text'], ['purchase_price', 'purchasePrice', 'number'], ['last_maintenance', 'lastMaintenance', 'text'], ['next_maintenance', 'nextMaintenance', 'text'],
  ['attachments', 'attachments', 'json'], ['extra_fields', 'extraFields', 'json'], ['custom', 'custom', 'json'],
];
export const EQUIPMENT_DAILY_COLUMNS: Cols = [
  ['equipment_id', 'equipmentId', 'text'], ['date', 'date', 'text'], ['project', 'project', 'text'], ['kind', 'kind', 'text'], ['days', 'days', 'number'], ['daily_cost', 'dailyCost', 'number'],
  ['hours', 'hours', 'number'], ['fuel_liters', 'fuelLiters', 'number'], ['hourly_cost', 'hourlyCost', 'number'], ['fuel_price', 'fuelPrice', 'number'], ['extra_cost', 'extraCost', 'number'],
  ['move_cost', 'moveCost', 'number'], ['cost', 'cost', 'number'], ['productivity', 'productivity', 'text'], ['notes', 'notes', 'text'],
];

const SQL_TYPE = { text: 'text', number: 'numeric', json: 'jsonb', bool: 'boolean' } as const;
const JSON_TYPE = { text: 'string', number: 'number', bool: 'boolean' } as const;
const matches = (k: string, t: Kind) => (t === 'json' ? `jsonb_typeof(p->'${k}') IN ('object','array')` : `jsonb_typeof(p->'${k}') = '${JSON_TYPE[t]}'`);
const val = (k: string, t: Kind) => `CASE WHEN ${matches(k, t)} THEN ${t === 'json' ? `p->'${k}'` : `(p->>'${k}')::${SQL_TYPE[t]}`} END`;
const typedKeys = (cols: Cols) => `ARRAY(SELECT k FROM unnest(ARRAY[${cols.map(([, k]) => `'${k}'`).join(',')}]) AS k WHERE ${cols.map(([, k, t]) => `(k = '${k}' AND ${matches(k, t).replace(`p->'${k}'`, 'p->k')})`).join(' OR ')})`;

interface Spec { table: string; collection: string; toLegacy: string; write: string; cols: Cols; project: string }
const SPECS: Spec[] = [
  { table: 'equipment', collection: 'equipment', toLegacy: 'equipment_to_legacy', write: 'legacy_write_equipment', cols: EQUIPMENT_COLUMNS, project: 'NULL::text' },
  { table: 'equipment_daily', collection: 'equipmentDaily', toLegacy: 'equipment_daily_to_legacy', write: 'legacy_write_equipment_daily', cols: EQUIPMENT_DAILY_COLUMNS, project: 'NULL::text' },
];
const branch = (s: Spec) => `
      UNION ALL SELECT '${s.collection}', t.id, ${s.toLegacy}(t), t.row_version, t.deleted_at, t.created_at, t.updated_at, ${s.project} FROM ${s.table} t
        WHERE EXISTS (SELECT 1 FROM module_cutover m WHERE m.collection = '${s.collection}')`;

export class EquipmentCutover1765800000000 implements MigrationInterface {
  name = 'EquipmentCutover1765800000000';
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
    await q.query(`CREATE INDEX "ix_equipment_daily_equipment" ON "equipment_daily" ("equipment_id", "date") WHERE "deleted_at" IS NULL`);
    const [{ def }] = await q.query(`SELECT pg_get_viewdef('legacy_records'::regclass, true) AS def`);
    await q.query(`CREATE OR REPLACE VIEW legacy_records AS ${String(def).replace(/;\s*$/, '')} ${SPECS.map(branch).join('')}`);
  }

  async down(q: QueryRunner): Promise<void> {
    const [{ n }] = await q.query(`SELECT count(*)::int AS n FROM module_cutover WHERE collection IN ('equipment', 'equipmentDaily')`);
    if (n > 0) throw new Error('equipment is cut over — run "cutover equipment rollback" first');
    const [{ def }] = await q.query(`SELECT pg_get_viewdef('legacy_records'::regclass, true) AS def`);
    const at = String(def).search(/UNION ALL\s+SELECT 'equipment'/);
    if (at < 0) throw new Error('legacy_records: equipment branch not found');
    await q.query(`DROP VIEW legacy_records`);
    await q.query(`CREATE VIEW legacy_records AS ${String(def).slice(0, at)}`);
    for (const s of SPECS.slice().reverse()) {
      await q.query(`DROP FUNCTION ${s.write}(text, jsonb, int, timestamptz)`);
      await q.query(`DROP FUNCTION ${s.toLegacy}(${s.table})`);
      await q.query(`DROP TABLE "${s.table}"`);
    }
  }
}
