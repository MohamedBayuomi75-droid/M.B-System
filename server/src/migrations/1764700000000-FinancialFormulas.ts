import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * B-20 — Financial Rules Engine: المعادلات بإصدارات (§13). **مفيش أي معادلة متسجّلة** — المكتبة بتدخل كمسودات بأمر منفصل.
 * - الإصدار المعتمد مابيتعدّلش ولا بيتمسح (trigger) — أي تعديل منطق أو معاملات = إصدار جديد (§13.6).
 * - الاعتماد: من غير المنشئ، وبعد نجاح كل حالات الاختبار (قيد في القاعدة).
 * - «منتهي» (Expired) حالة مشتقة: معتمد وتاريخ نهاية سريانه عدّى.
 * - document_formula_snapshots: لكل مستند الكود والإصدار والمدخلات (الأساس والمعاملات) والنتيجة ووقت الحساب — إلحاق فقط (§13.5).
 */
export class FinancialFormulas1764700000000 implements MigrationInterface {
  name = 'FinancialFormulas1764700000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "financial_formulas" (
      "code" text PRIMARY KEY CHECK ("code" ~ '^[A-Z][A-Z0-9_-]{1,40}$'),
      "name" text NOT NULL CHECK (length(btrim("name")) > 0),
      "module" text NOT NULL, "description" text,
      "created_by" uuid NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE TABLE "financial_formula_versions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "code" text NOT NULL REFERENCES "financial_formulas"("code"),
      "version" int NOT NULL CHECK ("version" >= 1),
      "status" text NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft','pending','approved','rejected','suspended')),
      "change_kind" text NOT NULL CHECK ("change_kind" IN ('new','logic','parameters')),
      "definition" jsonb NOT NULL,
      "test_cases" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "test_results" jsonb, "tests_passed" boolean NOT NULL DEFAULT false, "tested_at" timestamptz,
      "conditions" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "effective_from" date NOT NULL, "effective_to" date,
      "change_reason" text NOT NULL CHECK (length(btrim("change_reason")) > 0),
      "created_by" uuid NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(),
      "submitted_by" uuid, "submitted_at" timestamptz,
      "approved_by" uuid, "approved_at" timestamptz, "decision_note" text,
      UNIQUE ("code", "version"),
      CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from"),
      CHECK ("status" NOT IN ('pending','approved','suspended') OR ("tests_passed" AND jsonb_array_length("test_cases") > 0)),
      CHECK ("status" NOT IN ('approved','suspended') OR ("approved_by" IS NOT NULL AND "approved_at" IS NOT NULL)),
      CHECK ("approved_by" IS NULL OR "approved_by" <> "created_by"))`);
    await q.query(`CREATE INDEX "ix_formula_versions_lookup" ON "financial_formula_versions" ("code", "effective_from") WHERE "status" = 'approved'`);
    await q.query(`CREATE FUNCTION formula_version_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          IF OLD.status <> 'draft' THEN RAISE EXCEPTION 'formula versions are never deleted once submitted' USING ERRCODE = '55000'; END IF;
          RETURN OLD;
        END IF;
        IF OLD.status IN ('approved','suspended','rejected') THEN
          IF NOT (
               (OLD.status = 'approved' AND NEW.status = 'suspended' AND (to_jsonb(NEW) - 'status' - 'decision_note') = (to_jsonb(OLD) - 'status' - 'decision_note'))
            OR (OLD.status = 'approved' AND NEW.status = 'approved' AND OLD.effective_to IS NULL AND NEW.effective_to IS NOT NULL
                AND (to_jsonb(NEW) - 'effective_to') = (to_jsonb(OLD) - 'effective_to'))) THEN
            RAISE EXCEPTION 'approved formula version is immutable (new version required)' USING ERRCODE = '55000';
          END IF;
        END IF;
        IF OLD.status = 'pending' AND (to_jsonb(NEW) - ARRAY['status','approved_by','approved_at','decision_note']) <> (to_jsonb(OLD) - ARRAY['status','approved_by','approved_at','decision_note']) THEN
          RAISE EXCEPTION 'pending formula version cannot change' USING ERRCODE = '55000';
        END IF;
        RETURN NEW;
      END $$`);
    await q.query(`CREATE TRIGGER formula_version_guard BEFORE UPDATE OR DELETE ON "financial_formula_versions" FOR EACH ROW EXECUTE FUNCTION formula_version_guard()`);
    await q.query(`CREATE TABLE "document_formula_snapshots" (
      "id" bigserial PRIMARY KEY,
      "document_type" text NOT NULL, "document_id" text NOT NULL,
      "formula_code" text NOT NULL REFERENCES "financial_formulas"("code"),
      "version_id" uuid NOT NULL REFERENCES "financial_formula_versions"("id"),
      "inputs" jsonb NOT NULL, "outputs" jsonb NOT NULL,
      "computed_at" timestamptz NOT NULL DEFAULT now(), "computed_by" uuid,
      UNIQUE ("document_type", "document_id", "formula_code"))`);
    await q.query(`CREATE TRIGGER "trg_document_formula_snapshots_no_update_delete" BEFORE UPDATE OR DELETE ON "document_formula_snapshots" FOR EACH ROW EXECUTE FUNCTION "forbid_append_only_mutation"()`);
    await q.query(`CREATE TRIGGER "trg_document_formula_snapshots_no_truncate" BEFORE TRUNCATE ON "document_formula_snapshots" FOR EACH STATEMENT EXECUTE FUNCTION "forbid_append_only_mutation"()`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "document_formula_snapshots"`);
    await q.query(`DROP TRIGGER formula_version_guard ON "financial_formula_versions"`);
    await q.query(`DROP FUNCTION formula_version_guard()`);
    await q.query(`DROP TABLE "financial_formula_versions"`);
    await q.query(`DROP TABLE "financial_formulas"`);
  }
}
