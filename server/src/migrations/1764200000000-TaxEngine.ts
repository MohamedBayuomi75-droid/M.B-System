import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * B-21 (2026-11-17) + B-20: أول عائلة في محرك القواعد المالية — الضرائب والاستقطاعات والدمغات.
 * - **مفيش أي نسبة متسجّلة**: الجداول فاضية، والنسب بتدخل كمسودات وبتتعتمد من شخص غير اللي أعدّها (B-04).
 * - الإصدار المعتمد مابيتعدّلش (trigger) — التغيير = إصدار جديد بتاريخ سريان.
 * - document_tax_lines: لقطة الإصدار والنسبة والأساس لكل مستند (المرحّل مابيتعادش احتسابه — B-20 §4).
 */
export class TaxEngine1764200000000 implements MigrationInterface {
  name = 'TaxEngine1764200000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "tax_codes" (
      "code" text PRIMARY KEY CHECK ("code" ~ '^[A-Z][A-Z0-9_-]{1,40}$'),
      "name" text NOT NULL CHECK (length(btrim("name")) > 0),
      "category" text NOT NULL CHECK ("category" IN ('VAT','SCHEDULE','WHT','STAMP','PAYROLL_TAX','SOCIAL_INSURANCE','CONTRACTUAL')),
      "is_tax" boolean NOT NULL,
      "status" text NOT NULL DEFAULT 'active' CHECK ("status" IN ('active','suspended')),
      "created_by" uuid NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(),
      CHECK (("category" = 'CONTRACTUAL') = (NOT "is_tax")))`);
    await q.query(`COMMENT ON COLUMN "tax_codes"."is_tax" IS 'الاستقطاعات التعاقدية (ضمان أعمال/محتجزات/غرامات) مش ضرايب ومنفصلة محاسبيًا — B-21 §2.7'`);
    await q.query(`CREATE TABLE "tax_code_versions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "code" text NOT NULL REFERENCES "tax_codes"("code"),
      "version" int NOT NULL CHECK ("version" >= 1),
      "status" text NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft','pending','approved','suspended','rejected')),
      "method" text NOT NULL CHECK ("method" IN ('PERCENT','FIXED','BRACKETS')),
      "rate" numeric(9,6) CHECK ("rate" IS NULL OR ("rate" >= 0 AND "rate" <= 100)),
      "fixed_amount" numeric(18,4) CHECK ("fixed_amount" IS NULL OR "fixed_amount" >= 0),
      "brackets" jsonb,
      "base" text NOT NULL CHECK ("base" IN ('NET_OF_DISCOUNT','GROSS','NET_PLUS_VAT','TAXABLE_WAGE','CONTRACT_VALUE')),
      "base_ratio" numeric(9,6) NOT NULL DEFAULT 100 CHECK ("base_ratio" > 0 AND "base_ratio" <= 100),
      "min_base" numeric(18,4) CHECK ("min_base" IS NULL OR "min_base" >= 0),
      "applies_to" text[] NOT NULL CHECK (cardinality("applies_to") > 0),
      "bearer" text NOT NULL CHECK ("bearer" IN ('COMPANY','COUNTERPARTY','EMPLOYEE','EMPLOYER')),
      "collector" text NOT NULL CHECK ("collector" IN ('COMPANY_WITHHOLDS','COUNTERPARTY_CHARGES','COMPANY_CHARGES','PAID_DIRECTLY')),
      "conditions" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "exemptions" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "allow_stacking" boolean NOT NULL DEFAULT false,
      "effective_from" date NOT NULL,
      "effective_to" date,
      "legal_ref" text,
      "notes_cfo" text, "notes_advisor" text,
      "change_reason" text NOT NULL CHECK (length(btrim("change_reason")) > 0),
      "created_by" uuid NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(),
      "submitted_by" uuid, "submitted_at" timestamptz,
      "approved_by" uuid, "approved_at" timestamptz,
      "decision_note" text,
      UNIQUE ("code", "version"),
      CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from"),
      CHECK (("method" = 'PERCENT') = ("rate" IS NOT NULL)),
      CHECK (("method" = 'FIXED') = ("fixed_amount" IS NOT NULL)),
      CHECK (("method" = 'BRACKETS') = ("brackets" IS NOT NULL)),
      CHECK ("status" NOT IN ('approved','suspended') OR ("approved_by" IS NOT NULL AND "approved_at" IS NOT NULL AND length(btrim(coalesce("legal_ref", ''))) > 0)),
      CHECK ("approved_by" IS NULL OR "approved_by" <> "created_by"))`);
    await q.query(`CREATE INDEX "ix_tax_versions_lookup" ON "tax_code_versions" ("code", "effective_from") WHERE "status" = 'approved'`);
    // الإصدار المعتمد/الموقوف/المرفوض مابيتعدّلش، والانتقالات المسموحة بس — ومفيش حذف لأي إصدار
    await q.query(`CREATE FUNCTION tax_version_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          IF OLD.status <> 'draft' THEN RAISE EXCEPTION 'tax code versions are never deleted once submitted' USING ERRCODE = '55000'; END IF;
          RETURN OLD;
        END IF;
        IF OLD.status IN ('approved','suspended','rejected') THEN
          IF NOT (
               (OLD.status = 'approved' AND NEW.status = 'suspended' AND (to_jsonb(NEW) - 'status' - 'decision_note') = (to_jsonb(OLD) - 'status' - 'decision_note'))
               -- الإحلال: إصدار جديد معتمد بيقفل سريان القديم المفتوح (مرة واحدة، ومن غير تغيير أي قيمة تانية)
            OR (OLD.status = 'approved' AND NEW.status = 'approved' AND OLD.effective_to IS NULL AND NEW.effective_to IS NOT NULL
                AND (to_jsonb(NEW) - 'effective_to') = (to_jsonb(OLD) - 'effective_to'))) THEN
            RAISE EXCEPTION 'approved tax version is immutable (only approved → suspended)' USING ERRCODE = '55000';
          END IF;
        END IF;
        IF OLD.status = 'pending' AND NEW.status NOT IN ('approved','rejected','pending') THEN
          RAISE EXCEPTION 'pending tax version can only be approved or rejected' USING ERRCODE = '55000';
        END IF;
        IF OLD.status = 'pending' AND (to_jsonb(NEW) - ARRAY['status','approved_by','approved_at','decision_note']) <> (to_jsonb(OLD) - ARRAY['status','approved_by','approved_at','decision_note']) THEN
          RAISE EXCEPTION 'pending tax version values cannot change' USING ERRCODE = '55000';
        END IF;
        RETURN NEW;
      END $$`);
    await q.query(`CREATE TRIGGER tax_version_guard BEFORE UPDATE OR DELETE ON "tax_code_versions" FOR EACH ROW EXECUTE FUNCTION tax_version_guard()`);
    await q.query(`CREATE TABLE "document_tax_lines" (
      "id" bigserial PRIMARY KEY,
      "document_type" text NOT NULL, "document_id" text NOT NULL, "line_no" int NOT NULL CHECK ("line_no" >= 1),
      "code" text NOT NULL REFERENCES "tax_codes"("code"),
      "version_id" uuid NOT NULL REFERENCES "tax_code_versions"("id"),
      "base_amount" numeric(18,4) NOT NULL, "taxable_amount" numeric(18,4) NOT NULL,
      "rate" numeric(9,6), "amount" numeric(18,4) NOT NULL,
      "exempt_reason" text,
      "computed_at" timestamptz NOT NULL DEFAULT now(), "computed_by" uuid,
      UNIQUE ("document_type", "document_id", "line_no"))`);
    await q.query(`COMMENT ON TABLE "document_tax_lines" IS 'لقطة الضريبة لكل مستند بالإصدار المستخدم — مابتتعادش تلقائيًا لو النسبة اتغيّرت (B-21 §6)'`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "document_tax_lines"`);
    await q.query(`DROP TRIGGER tax_version_guard ON "tax_code_versions"`);
    await q.query(`DROP FUNCTION tax_version_guard()`);
    await q.query(`DROP TABLE "tax_code_versions"`);
    await q.query(`DROP TABLE "tax_codes"`);
  }
}
