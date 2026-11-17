import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * B-50 (معتمد ونهائي): منع الرصيد المخزني السالب في كل الحالات من غير استثناء — على مستوى قاعدة البيانات.
 * - بيتطبّق على أي كتابة لحركات المخزون (warehouses.movements) أيًا كان مصدرها: الواجهة الحالية أو الـ API أو SQL مباشر.
 * - المتاح = الرصيد − المحجوز (stock_reservations، فاضي لحد ما دورة الشراء/الحجز تتنفّذ).
 * - قفل لكل صنف (pg_advisory_xact_lock) + الفحص بعد الكتابة جوه نفس المعاملة → التزامن آمن.
 * - مفيش أي استثناء بالدور أو المستخدم (مفيش صلاحية تجاوز).
 * - الكميات بدقة 5 خانات (B-26) — الفحص بـ numeric من غير تقريب.
 */
export class StockGuard1764400000000 implements MigrationInterface {
  name = 'StockGuard1764400000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "stock_reservations" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "item_id" text NOT NULL, "location_id" text NOT NULL DEFAULT '',
      "qty" numeric(18,5) NOT NULL CHECK ("qty" > 0),
      "source_type" text NOT NULL, "source_id" text NOT NULL,
      "status" text NOT NULL DEFAULT 'active' CHECK ("status" IN ('active','released','consumed')),
      "created_by" uuid, "created_at" timestamptz NOT NULL DEFAULT now(), "closed_at" timestamptz)`);
    await q.query(`CREATE INDEX "ix_stock_res_active" ON "stock_reservations" ("item_id", "location_id") WHERE "status" = 'active'`);

    await q.query(`CREATE FUNCTION wh_balance(item text, loc text) RETURNS numeric LANGUAGE sql STABLE AS $$
      SELECT coalesce(sum(CASE
        WHEN r.data->>'type' IN ('in','adjust_in')   AND coalesce(r.data->>'locationId','') = loc THEN (r.data->>'qty')::numeric
        WHEN r.data->>'type' IN ('out','adjust_out') AND coalesce(r.data->>'locationId','') = loc THEN -(r.data->>'qty')::numeric
        WHEN r.data->>'type' = 'transfer' AND coalesce(r.data->>'locationId','') = loc THEN -(r.data->>'qty')::numeric
        WHEN r.data->>'type' = 'transfer' AND coalesce(r.data->>'toLocationId','') = loc THEN (r.data->>'qty')::numeric
        ELSE 0 END), 0)
      FROM records r WHERE r.collection = 'warehouses.movements' AND r.deleted_at IS NULL AND r.data->>'itemId' = item $$`);
    await q.query(`CREATE FUNCTION wh_reserved(item text, loc text) RETURNS numeric LANGUAGE sql STABLE AS $$
      SELECT coalesce(sum(qty), 0) FROM stock_reservations WHERE item_id = item AND location_id = loc AND status = 'active' $$`);
    /** يفحص (صنف، مخزن) بعد الكتابة — VOLATILE عشان كل استعلام يشوف آخر commit بعد القفل */
    await q.query(`CREATE FUNCTION wh_assert_available(item text, loc text) RETURNS void LANGUAGE plpgsql VOLATILE AS $$
      DECLARE bal numeric; res numeric;
      BEGIN
        PERFORM pg_advisory_xact_lock(hashtext('wh-stock:' || item));
        bal := wh_balance(item, loc); res := wh_reserved(item, loc);
        IF bal - res < 0 THEN
          RAISE EXCEPTION 'NEGATIVE_STOCK item=% location=% balance=% reserved=% available=%', item, loc, bal, res, bal - res
            USING ERRCODE = '23514', CONSTRAINT = 'stock_non_negative',
                  HINT = 'B-50: الرصيد المتاح مايكفيش — كمّل الاستلام أو اعمل تسوية مخزنية معتمدة الأول';
        END IF;
      END $$`);
    await q.query(`CREATE FUNCTION wh_movement_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE d jsonb; t text; qn numeric;
      BEGIN
        -- تحقق من شكل الحركة الحية الجديدة
        IF NEW.deleted_at IS NULL THEN
          d := NEW.data; t := d->>'type';
          IF t IS NULL OR t NOT IN ('in','out','transfer','adjust_in','adjust_out') THEN
            RAISE EXCEPTION 'INVALID_MOVEMENT type=%', t USING ERRCODE = '23514', CONSTRAINT = 'stock_movement_valid';
          END IF;
          IF coalesce(d->>'itemId','') = '' THEN RAISE EXCEPTION 'INVALID_MOVEMENT itemId required' USING ERRCODE = '23514', CONSTRAINT = 'stock_movement_valid'; END IF;
          BEGIN qn := (d->>'qty')::numeric; EXCEPTION WHEN others THEN qn := NULL; END;
          IF qn IS NULL OR qn <= 0 THEN RAISE EXCEPTION 'INVALID_MOVEMENT qty must be > 0' USING ERRCODE = '23514', CONSTRAINT = 'stock_movement_valid'; END IF;
          IF t = 'transfer' AND (coalesce(d->>'toLocationId','') = '' OR d->>'toLocationId' = coalesce(d->>'locationId','')) THEN
            RAISE EXCEPTION 'INVALID_MOVEMENT transfer needs a different destination' USING ERRCODE = '23514', CONSTRAINT = 'stock_movement_valid';
          END IF;
          PERFORM wh_assert_available(d->>'itemId', coalesce(d->>'locationId',''));
          IF t = 'transfer' THEN PERFORM wh_assert_available(d->>'itemId', d->>'toLocationId'); END IF;
        END IF;
        -- النسخة القديمة (تعديل/حذف): الرصيد في مكانها القديم مايبقاش سالب
        IF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND coalesce(OLD.data->>'itemId','') <> '' THEN
          PERFORM wh_assert_available(OLD.data->>'itemId', coalesce(OLD.data->>'locationId',''));
          IF OLD.data->>'type' = 'transfer' AND coalesce(OLD.data->>'toLocationId','') <> '' THEN
            PERFORM wh_assert_available(OLD.data->>'itemId', OLD.data->>'toLocationId');
          END IF;
        END IF;
        RETURN NULL;
      END $$`);
    await q.query(`CREATE TRIGGER wh_movement_guard AFTER INSERT OR UPDATE ON records FOR EACH ROW
      WHEN (NEW.collection = 'warehouses.movements') EXECUTE FUNCTION wh_movement_guard()`);
    // الحذف الفعلي لحركة (مش soft delete) ممنوع — الحركات بتتمسح منطقيًا بس عشان الأثر يفضل
    await q.query(`CREATE FUNCTION wh_movement_no_hard_delete() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'stock movements are never hard-deleted' USING ERRCODE = '55000'; END $$`);
    await q.query(`CREATE TRIGGER wh_movement_no_hard_delete BEFORE DELETE ON records FOR EACH ROW
      WHEN (OLD.collection = 'warehouses.movements') EXECUTE FUNCTION wh_movement_no_hard_delete()`);
    // الحجز نفسه مايتعداش المتاح
    await q.query(`CREATE FUNCTION wh_reservation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.status = 'active' THEN PERFORM wh_assert_available(NEW.item_id, NEW.location_id); END IF;
        RETURN NULL;
      END $$`);
    await q.query(`CREATE TRIGGER wh_reservation_guard AFTER INSERT OR UPDATE ON stock_reservations FOR EACH ROW EXECUTE FUNCTION wh_reservation_guard()`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TRIGGER wh_reservation_guard ON stock_reservations`);
    await q.query(`DROP FUNCTION wh_reservation_guard()`);
    await q.query(`DROP TRIGGER wh_movement_no_hard_delete ON records`);
    await q.query(`DROP FUNCTION wh_movement_no_hard_delete()`);
    await q.query(`DROP TRIGGER wh_movement_guard ON records`);
    await q.query(`DROP FUNCTION wh_movement_guard()`);
    await q.query(`DROP FUNCTION wh_assert_available(text, text)`);
    await q.query(`DROP FUNCTION wh_reserved(text, text)`);
    await q.query(`DROP FUNCTION wh_balance(text, text)`);
    await q.query(`DROP TABLE "stock_reservations"`);
  }
}
