import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * B-51 (2026-11-17): التسويات المخزنية كمستند — مسودة ← إرسال (محرك الاعتمادات) ← معتمد ← ترحيل آلي لحركة مخزون.
 * - الكمية مابتدخلش الرصيد إلا بعد الترحيل الفعلي (الحركة نفسها) — والترحيل بيمر بقيد B-50.
 * - بيانات التسوية مابتتعدّلش بعد الإرسال (trigger) — التغيير = إلغاء قبل الترحيل أو تسوية تصحيح بعده.
 * - مفيش حذف لتسوية اتبعتت.
 */
export class StockAdjustments1764500000000 implements MigrationInterface {
  name = 'StockAdjustments1764500000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "stock_adjustments" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "kind" text NOT NULL CHECK ("kind" IN ('increase','deficit','damage','correction','stocktake','transfer')),
      "direction" text NOT NULL CHECK ("direction" IN ('in','out','transfer')),
      "item_id" text NOT NULL CHECK (length(btrim("item_id")) > 0),
      "location_id" text NOT NULL DEFAULT '',
      "to_location_id" text,
      "qty" numeric(18,5) NOT NULL CHECK ("qty" > 0),
      "reason" text NOT NULL CHECK (length(btrim("reason")) > 0),
      "status" text NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft','submitted','approved','posted','rejected','returned','cancelled','withdrawn')),
      "approval_request_id" uuid,
      "movement_id" text,
      "post_error" text,
      "created_by" uuid NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(),
      "submitted_at" timestamptz, "approved_at" timestamptz,
      "posted_by" uuid, "posted_at" timestamptz,
      "cancel_reason" text,
      "row_version" int NOT NULL DEFAULT 1,
      CHECK (("kind" = 'increase' AND "direction" = 'in') OR ("kind" IN ('deficit','damage') AND "direction" = 'out')
          OR ("kind" IN ('correction','stocktake') AND "direction" IN ('in','out')) OR ("kind" = 'transfer' AND "direction" = 'transfer')),
      CHECK (("direction" = 'transfer') = ("to_location_id" IS NOT NULL)),
      CHECK ("to_location_id" IS NULL OR "to_location_id" <> "location_id"),
      CHECK (("status" = 'posted') = ("movement_id" IS NOT NULL AND "posted_at" IS NOT NULL)))`);
    await q.query(`CREATE FUNCTION stock_adjustment_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          IF OLD.status <> 'draft' THEN RAISE EXCEPTION 'submitted stock adjustments are kept forever' USING ERRCODE = '55000'; END IF;
          RETURN OLD;
        END IF;
        IF OLD.status NOT IN ('draft','returned') AND (NEW.kind, NEW.direction, NEW.item_id, NEW.location_id, NEW.to_location_id, NEW.qty, NEW.reason, NEW.created_by)
           IS DISTINCT FROM (OLD.kind, OLD.direction, OLD.item_id, OLD.location_id, OLD.to_location_id, OLD.qty, OLD.reason, OLD.created_by) THEN
          RAISE EXCEPTION 'stock adjustment is immutable after submission (cancel before posting, or a correction after)' USING ERRCODE = '55000';
        END IF;
        IF OLD.status = 'posted' THEN RAISE EXCEPTION 'posted stock adjustment is final' USING ERRCODE = '55000'; END IF;
        IF NEW.status <> OLD.status AND NOT (
             (OLD.status IN ('draft','returned') AND NEW.status IN ('submitted','cancelled'))
          OR (OLD.status = 'submitted' AND NEW.status IN ('approved','rejected','returned','cancelled','withdrawn'))
          OR (OLD.status = 'approved' AND NEW.status IN ('posted','cancelled'))) THEN
          RAISE EXCEPTION 'invalid stock adjustment transition % to %', OLD.status, NEW.status USING ERRCODE = '55000';
        END IF;
        RETURN NEW;
      END $$`);
    await q.query(`CREATE TRIGGER stock_adjustment_guard BEFORE UPDATE OR DELETE ON "stock_adjustments" FOR EACH ROW EXECUTE FUNCTION stock_adjustment_guard()`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TRIGGER stock_adjustment_guard ON "stock_adjustments"`);
    await q.query(`DROP FUNCTION stock_adjustment_guard()`);
    await q.query(`DROP TABLE "stock_adjustments"`);
  }
}
