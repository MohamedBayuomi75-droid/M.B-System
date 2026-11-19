import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * المرحلة 6.1 — تصميم جداول الموردين والعملاء (الخطوة 4). الجداول **فاضية**: مفيش ترحيل هنا.
 * الترحيل الفعلي migration منفصلة بموافقة صريحة + نسخة احتياطية مستعادة (MODULE_MIGRATION_PLAN §2 خطوة 7، §5).
 * القيود = قواعد الواجهة الحالية بس (الاسم إلزامي). التفرّد (الاسم/الكود) مش مفروض لأن الواجهة الحالية مابتفرضوش — بند مفتوح.
 */
export class Parties1764000000000 implements MigrationInterface {
  name = 'Parties1764000000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "suppliers" (
      "id" text PRIMARY KEY,
      "name" text NOT NULL CHECK (length(btrim("name")) > 0),
      "tax_id" text, "commercial_reg" text, "business_nature" text,
      "opening_balance" numeric(18,4) NOT NULL DEFAULT 0,
      "opening_balance_date" date,
      "phone" text, "email" text, "address" text, "bank_account" text, "iban" text, "notes" text,
      "extra_fields" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "legacy_rev" int, "row_version" int NOT NULL DEFAULT 1,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      CHECK ("tax_id" IS NULL OR length(btrim("tax_id")) = 0 OR length(btrim("tax_id")) >= 5))`);
    await q.query(`CREATE INDEX "ix_suppliers_name" ON "suppliers" (lower(btrim("name")))`);
    await q.query(`CREATE TABLE "customers" (
      "id" text PRIMARY KEY,
      "code" text,
      "name" text NOT NULL CHECK (length(btrim("name")) > 0),
      "phone" text, "email" text, "city" text, "category" text, "tax_id" text, "department" text,
      "status" text NOT NULL DEFAULT 'active',
      "opening_balance" numeric(18,4) NOT NULL DEFAULT 0,
      "address" text, "notes" text,
      "extra_fields" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "legacy" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "legacy_rev" int, "row_version" int NOT NULL DEFAULT 1,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE INDEX "ix_customers_code" ON "customers" (lower(btrim("code")))`);
    await q.query(`CREATE TABLE "customer_contacts" (
      "id" bigserial PRIMARY KEY,
      "customer_id" text NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
      "sort" int NOT NULL,
      "name" text NOT NULL CHECK (length(btrim("name")) > 0),
      "title" text, "phone" text, "email" text,
      UNIQUE ("customer_id", "sort"))`);
    await q.query(`COMMENT ON COLUMN "customers"."legacy" IS 'مصفوفات قديمة متكررة داخل سجل العميل (contracts/invoices/...) — بتتحفظ زي ما هي لحد نقل موديولاتها'`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "customer_contacts"`);
    await q.query(`DROP TABLE "customers"`);
    await q.query(`DROP TABLE "suppliers"`);
  }
}
