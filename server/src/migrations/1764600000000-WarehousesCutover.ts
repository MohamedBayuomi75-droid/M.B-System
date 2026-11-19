import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 6.2-ب — جداول المخازن (الأصناف والمخازن والحركات) + الـ Adapter (نفس نمط 6.1). **مابتنقلش بيانات**:
 * النقل أمر تشغيل (`npm run cutover -- warehouses execute`) مشروط بنسخة احتياطية + اختبار استعادة.
 * - B-50 بيتنقل مع البيانات: نفس الفحص على wh_movements، و wh_balance بيقرا من المصدر الفعلي (records قبل النقل، الجدول بعده).
 * - قيود B-50 بقت DEFERRABLE INITIALLY IMMEDIATE: الكتابة العادية بتتفحص فورًا زي ما هي، وعمليات النقل/الرجوع بس
 *   بتأجّل الفحص لنهاية المعاملة على الحالة النهائية (مفيش تخطّي).
 * - مفيش حذف لصنف عليه حركات حية (إيقاف بدل حذف — فجوة 6.2 §3).
 * - تكلفة المتوسط (avg_cost/last_cost/unit_cost) بتتخزّن زي ما الواجهة بتبعتها — **الحساب على الخادم بعد اعتماد B-20**.
 */
export class WarehousesCutover1764600000000 implements MigrationInterface {
  name = 'WarehousesCutover1764600000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE FUNCTION jsonb_drop_null_keys(j jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
      SELECT coalesce(jsonb_object_agg(k, v), '{}'::jsonb) FROM jsonb_each(j) AS e(k, v) WHERE jsonb_typeof(v) <> 'null' $$`);
    const common = `"legacy_extra" jsonb NOT NULL DEFAULT '{}'::jsonb, "row_version" int NOT NULL DEFAULT 1,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz`;
    await q.query(`CREATE TABLE "wh_locations" ("id" text PRIMARY KEY, "name" text NOT NULL CHECK (length(btrim("name")) > 0), "notes" text, ${common})`);
    await q.query(`CREATE TABLE "wh_items" ("id" text PRIMARY KEY, "code" text, "name" text NOT NULL CHECK (length(btrim("name")) > 0), "unit" text, "category" text,
      "min_qty" numeric(18,5), "avg_cost" numeric(18,5), "last_cost" numeric(18,5), "notes" text, ${common})`);
    await q.query(`CREATE TABLE "wh_movements" ("id" text PRIMARY KEY,
      "type" text NOT NULL CHECK ("type" IN ('in','out','transfer','adjust_in','adjust_out')),
      "item_id" text NOT NULL CHECK (length(btrim("item_id")) > 0),
      "qty" numeric(18,5) NOT NULL CHECK ("qty" > 0),
      "location_id" text, "to_location_id" text, "date" text, "unit_cost" numeric(18,5),
      "project" text, "supplier_invoice_id" text, "supplier_name" text, "notes" text, "adjustment_id" text, "adjustment_kind" text, ${common},
      CHECK ("type" <> 'transfer' OR (coalesce("to_location_id", '') <> '' AND "to_location_id" <> coalesce("location_id", ''))))`);
    await q.query(`CREATE INDEX "ix_wh_movements_item" ON "wh_movements" ("item_id") WHERE "deleted_at" IS NULL`);

    // ---- قراءة: صف ← الشكل القديم (الأعمدة الفاضية (null) = الحقل مش موجود)
    await q.query(`CREATE FUNCTION wh_location_to_legacy(t wh_locations) RETURNS jsonb LANGUAGE sql STABLE AS $$
      SELECT t.legacy_extra || jsonb_strip_nulls(jsonb_build_object('id', t.id, 'name', t.name, 'notes', t.notes)) $$`);
    await q.query(`CREATE FUNCTION wh_item_to_legacy(t wh_items) RETURNS jsonb LANGUAGE sql STABLE AS $$
      SELECT t.legacy_extra || jsonb_strip_nulls(jsonb_build_object('id', t.id, 'code', t.code, 'name', t.name, 'unit', t.unit, 'category', t.category,
        'minQty', trim_scale(t.min_qty), 'avgCost', trim_scale(t.avg_cost), 'lastCost', trim_scale(t.last_cost), 'notes', t.notes)) $$`);
    await q.query(`CREATE FUNCTION wh_movement_to_legacy(t wh_movements) RETURNS jsonb LANGUAGE sql STABLE AS $$
      SELECT t.legacy_extra || jsonb_strip_nulls(jsonb_build_object('id', t.id, 'type', t.type, 'itemId', t.item_id, 'qty', trim_scale(t.qty),
        'locationId', t.location_id, 'toLocationId', t.to_location_id, 'date', t.date, 'unitCost', trim_scale(t.unit_cost), 'project', t.project,
        'supplierInvoiceId', t.supplier_invoice_id, 'supplierName', t.supplier_name, 'notes', t.notes, 'adjustmentId', t.adjustment_id, 'adjustmentKind', t.adjustment_kind)) $$`);

    // ---- كتابة: الشكل القديم ← أعمدة (upsert) — بيرجّع row_version
    const num = (k: string) => `CASE WHEN p->>'${k}' IS NULL OR p->>'${k}' = '' THEN NULL ELSE (p->>'${k}')::numeric END`;
    const upsert = (table: string, cols: [string, string][], mapped: string[]) => `
      DECLARE v int;
      BEGIN
        INSERT INTO ${table} AS t (id, ${cols.map((c) => c[0]).join(', ')}, legacy_extra, row_version, created_at)
        VALUES (i, ${cols.map((c) => c[1]).join(', ')}, jsonb_drop_null_keys(p - ARRAY[${mapped.map((m) => `'${m}'`).join(',')}]), coalesce(keep_rev, 1), coalesce(created, clock_timestamp()))
        ON CONFLICT (id) DO UPDATE SET ${cols.map((c) => `${c[0]} = EXCLUDED.${c[0]}`).join(', ')}, legacy_extra = EXCLUDED.legacy_extra,
          row_version = t.row_version + 1, updated_at = now(), deleted_at = NULL,
          created_at = CASE WHEN t.deleted_at IS NOT NULL THEN clock_timestamp() ELSE t.created_at END
        RETURNING row_version INTO v;
        RETURN v;
      END`;
    await q.query(`CREATE FUNCTION legacy_write_wh_location(i text, p jsonb, keep_rev int DEFAULT NULL, created timestamptz DEFAULT NULL) RETURNS int LANGUAGE plpgsql AS $$
      ${upsert('wh_locations', [['name', `coalesce(p->>'name', '')`], ['notes', `p->>'notes'`]], ['id', 'name', 'notes'])} $$`);
    await q.query(`CREATE FUNCTION legacy_write_wh_item(i text, p jsonb, keep_rev int DEFAULT NULL, created timestamptz DEFAULT NULL) RETURNS int LANGUAGE plpgsql AS $$
      ${upsert('wh_items', [['code', `p->>'code'`], ['name', `coalesce(p->>'name', '')`], ['unit', `p->>'unit'`], ['category', `p->>'category'`],
        ['min_qty', num('minQty')], ['avg_cost', num('avgCost')], ['last_cost', num('lastCost')], ['notes', `p->>'notes'`]],
        ['id', 'code', 'name', 'unit', 'category', 'minQty', 'avgCost', 'lastCost', 'notes'])} $$`);
    await q.query(`CREATE FUNCTION legacy_write_wh_movement(i text, p jsonb, keep_rev int DEFAULT NULL, created timestamptz DEFAULT NULL) RETURNS int LANGUAGE plpgsql AS $$
      ${upsert('wh_movements', [['type', `p->>'type'`], ['item_id', `coalesce(p->>'itemId', '')`], ['qty', num('qty')], ['location_id', `p->>'locationId'`],
        ['to_location_id', `p->>'toLocationId'`], ['date', `p->>'date'`], ['unit_cost', num('unitCost')], ['project', `p->>'project'`],
        ['supplier_invoice_id', `p->>'supplierInvoiceId'`], ['supplier_name', `p->>'supplierName'`], ['notes', `p->>'notes'`],
        ['adjustment_id', `p->>'adjustmentId'`], ['adjustment_kind', `p->>'adjustmentKind'`]],
        ['id', 'type', 'itemId', 'qty', 'locationId', 'toLocationId', 'date', 'unitCost', 'project', 'supplierInvoiceId', 'supplierName', 'notes', 'adjustmentId', 'adjustmentKind'])} $$`);

    await q.query(`CREATE OR REPLACE VIEW legacy_records AS
      SELECT r.collection, r.id, r.data, r.rev, r.deleted_at, r.created_at, r.updated_at, r.project_id FROM records r
        WHERE NOT EXISTS (SELECT 1 FROM module_cutover m WHERE m.collection = r.collection)
      UNION ALL SELECT 'ledger.suppliers', s.id, supplier_to_legacy(s), s.row_version, s.deleted_at, s.created_at, s.updated_at, NULL FROM suppliers s
        WHERE EXISTS (SELECT 1 FROM module_cutover m WHERE m.collection = 'ledger.suppliers')
      UNION ALL SELECT 'clients.customers', c.id, customer_to_legacy(c), c.row_version, c.deleted_at, c.created_at, c.updated_at, NULL FROM customers c
        WHERE EXISTS (SELECT 1 FROM module_cutover m WHERE m.collection = 'clients.customers')
      UNION ALL SELECT 'warehouses.locations', t.id, wh_location_to_legacy(t), t.row_version, t.deleted_at, t.created_at, t.updated_at, NULL FROM wh_locations t
        WHERE EXISTS (SELECT 1 FROM module_cutover m WHERE m.collection = 'warehouses.locations')
      UNION ALL SELECT 'warehouses.items', t.id, wh_item_to_legacy(t), t.row_version, t.deleted_at, t.created_at, t.updated_at, NULL FROM wh_items t
        WHERE EXISTS (SELECT 1 FROM module_cutover m WHERE m.collection = 'warehouses.items')
      UNION ALL SELECT 'warehouses.movements', t.id, wh_movement_to_legacy(t), t.row_version, t.deleted_at, t.created_at, t.updated_at, NULL FROM wh_movements t
        WHERE EXISTS (SELECT 1 FROM module_cutover m WHERE m.collection = 'warehouses.movements')`);

    // ---- B-50 بيتنقل مع البيانات: الرصيد من المصدر الفعلي
    await q.query(`CREATE OR REPLACE FUNCTION wh_balance(item text, loc text) RETURNS numeric LANGUAGE plpgsql STABLE AS $$
      BEGIN
        IF EXISTS (SELECT 1 FROM module_cutover WHERE collection = 'warehouses.movements') THEN
          RETURN (SELECT coalesce(sum(CASE
            WHEN m.type IN ('in','adjust_in') AND coalesce(m.location_id,'') = loc THEN m.qty
            WHEN m.type IN ('out','adjust_out') AND coalesce(m.location_id,'') = loc THEN -m.qty
            WHEN m.type = 'transfer' AND coalesce(m.location_id,'') = loc THEN -m.qty
            WHEN m.type = 'transfer' AND m.to_location_id = loc THEN m.qty ELSE 0 END), 0)
            FROM wh_movements m WHERE m.deleted_at IS NULL AND m.item_id = item);
        END IF;
        RETURN (SELECT coalesce(sum(CASE
          WHEN r.data->>'type' IN ('in','adjust_in')   AND coalesce(r.data->>'locationId','') = loc THEN (r.data->>'qty')::numeric
          WHEN r.data->>'type' IN ('out','adjust_out') AND coalesce(r.data->>'locationId','') = loc THEN -(r.data->>'qty')::numeric
          WHEN r.data->>'type' = 'transfer' AND coalesce(r.data->>'locationId','') = loc THEN -(r.data->>'qty')::numeric
          WHEN r.data->>'type' = 'transfer' AND coalesce(r.data->>'toLocationId','') = loc THEN (r.data->>'qty')::numeric ELSE 0 END), 0)
          FROM records r WHERE r.collection = 'warehouses.movements' AND r.deleted_at IS NULL AND r.data->>'itemId' = item);
      END $$`);
    // قيد records: نفس الدالة، لكن constraint trigger قابل للتأجيل (فوري افتراضيًا)
    await q.query(`DROP TRIGGER wh_movement_guard ON records`);
    await q.query(`CREATE CONSTRAINT TRIGGER wh_movement_guard AFTER INSERT OR UPDATE ON records DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW
      WHEN (NEW.collection = 'warehouses.movements') EXECUTE FUNCTION wh_movement_guard()`);
    await q.query(`CREATE FUNCTION wh_table_movement_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.deleted_at IS NULL THEN
          PERFORM wh_assert_available(NEW.item_id, coalesce(NEW.location_id,''));
          IF NEW.type = 'transfer' THEN PERFORM wh_assert_available(NEW.item_id, NEW.to_location_id); END IF;
        END IF;
        IF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL THEN
          PERFORM wh_assert_available(OLD.item_id, coalesce(OLD.location_id,''));
          IF OLD.type = 'transfer' THEN PERFORM wh_assert_available(OLD.item_id, OLD.to_location_id); END IF;
        END IF;
        RETURN NULL;
      END $$`);
    await q.query(`CREATE CONSTRAINT TRIGGER wh_table_movement_guard AFTER INSERT OR UPDATE ON wh_movements DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION wh_table_movement_guard()`);
    await q.query(`CREATE FUNCTION wh_table_no_hard_delete() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF EXISTS (SELECT 1 FROM module_cutover WHERE collection = 'warehouses.movements') THEN
          RAISE EXCEPTION 'stock movements are never hard-deleted' USING ERRCODE = '55000';
        END IF;
        RETURN OLD;
      END $$`);
    await q.query(`CREATE TRIGGER wh_table_no_hard_delete BEFORE DELETE ON wh_movements FOR EACH ROW EXECUTE FUNCTION wh_table_no_hard_delete()`);

    // ---- مفيش حذف لصنف عليه حركات حية (المصدرين)
    await q.query(`CREATE FUNCTION wh_item_has_movements(item text) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT EXISTS (SELECT 1 FROM legacy_records r WHERE r.collection = 'warehouses.movements' AND r.deleted_at IS NULL AND r.data->>'itemId' = item) $$`);
    await q.query(`CREATE FUNCTION wh_item_delete_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL AND wh_item_has_movements(OLD.id) THEN
          RAISE EXCEPTION 'ITEM_HAS_MOVEMENTS item=%', OLD.id USING ERRCODE = '23514', CONSTRAINT = 'wh_item_in_use',
            HINT = 'الصنف عليه حركات — ماينفعش يتمسح (الأثر بيفضل)';
        END IF;
        RETURN NEW;
      END $$`);
    await q.query(`CREATE TRIGGER wh_item_delete_guard BEFORE UPDATE ON records FOR EACH ROW WHEN (NEW.collection = 'warehouses.items') EXECUTE FUNCTION wh_item_delete_guard()`);
    await q.query(`CREATE TRIGGER wh_item_delete_guard BEFORE UPDATE ON wh_items FOR EACH ROW EXECUTE FUNCTION wh_item_delete_guard()`);
  }

  async down(q: QueryRunner): Promise<void> {
    const [{ n }] = await q.query(`SELECT count(*)::int AS n FROM module_cutover WHERE collection LIKE 'warehouses.%'`);
    if (n > 0) throw new Error('warehouses are cut over — run "cutover warehouses rollback" first');
    await q.query(`DROP TRIGGER wh_item_delete_guard ON wh_items`);
    await q.query(`DROP TRIGGER wh_item_delete_guard ON records`);
    await q.query(`DROP FUNCTION wh_item_delete_guard()`);
    await q.query(`DROP FUNCTION wh_item_has_movements(text)`);
    await q.query(`DROP TRIGGER wh_movement_guard ON records`);
    await q.query(`CREATE TRIGGER wh_movement_guard AFTER INSERT OR UPDATE ON records FOR EACH ROW WHEN (NEW.collection = 'warehouses.movements') EXECUTE FUNCTION wh_movement_guard()`);
    await q.query(`CREATE OR REPLACE FUNCTION wh_balance(item text, loc text) RETURNS numeric LANGUAGE sql STABLE AS $$
      SELECT coalesce(sum(CASE
        WHEN r.data->>'type' IN ('in','adjust_in')   AND coalesce(r.data->>'locationId','') = loc THEN (r.data->>'qty')::numeric
        WHEN r.data->>'type' IN ('out','adjust_out') AND coalesce(r.data->>'locationId','') = loc THEN -(r.data->>'qty')::numeric
        WHEN r.data->>'type' = 'transfer' AND coalesce(r.data->>'locationId','') = loc THEN -(r.data->>'qty')::numeric
        WHEN r.data->>'type' = 'transfer' AND coalesce(r.data->>'toLocationId','') = loc THEN (r.data->>'qty')::numeric
        ELSE 0 END), 0)
      FROM records r WHERE r.collection = 'warehouses.movements' AND r.deleted_at IS NULL AND r.data->>'itemId' = item $$`);
    await q.query(`CREATE OR REPLACE VIEW legacy_records AS
      SELECT r.collection, r.id, r.data, r.rev, r.deleted_at, r.created_at, r.updated_at, r.project_id FROM records r
        WHERE NOT EXISTS (SELECT 1 FROM module_cutover m WHERE m.collection = r.collection)
      UNION ALL SELECT 'ledger.suppliers', s.id, supplier_to_legacy(s), s.row_version, s.deleted_at, s.created_at, s.updated_at, NULL FROM suppliers s
        WHERE EXISTS (SELECT 1 FROM module_cutover m WHERE m.collection = 'ledger.suppliers')
      UNION ALL SELECT 'clients.customers', c.id, customer_to_legacy(c), c.row_version, c.deleted_at, c.created_at, c.updated_at, NULL FROM customers c
        WHERE EXISTS (SELECT 1 FROM module_cutover m WHERE m.collection = 'clients.customers')`);
    await q.query(`DROP TRIGGER wh_table_no_hard_delete ON wh_movements`);
    await q.query(`DROP FUNCTION wh_table_no_hard_delete()`);
    await q.query(`DROP TRIGGER wh_table_movement_guard ON wh_movements`);
    await q.query(`DROP FUNCTION wh_table_movement_guard()`);
    for (const f of ['legacy_write_wh_movement', 'legacy_write_wh_item', 'legacy_write_wh_location']) await q.query(`DROP FUNCTION ${f}(text, jsonb, int, timestamptz)`);
    await q.query(`DROP FUNCTION wh_movement_to_legacy(wh_movements)`);
    await q.query(`DROP FUNCTION wh_item_to_legacy(wh_items)`);
    await q.query(`DROP FUNCTION wh_location_to_legacy(wh_locations)`);
    await q.query(`DROP TABLE "wh_movements"`);
    await q.query(`DROP TABLE "wh_items"`);
    await q.query(`DROP TABLE "wh_locations"`);
    await q.query(`DROP FUNCTION jsonb_drop_null_keys(jsonb)`);
  }
}
