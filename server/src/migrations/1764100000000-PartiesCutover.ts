import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * المرحلة 6.1 — البنية اللازمة لنقل الموردين والعملاء للجداول (الخطوات 6 و7). الـ migration دي **مابتنقلش بيانات**:
 * النقل أمر تشغيل منفصل (`npm run cutover -- parties execute`) مشروط بنسخة احتياطية + اختبار استعادة ناجح.
 *
 * - module_cutover: المجموعات اللي اتنقلت فعلًا. قبل النقل: كل حاجة زي ما هي (records).
 * - legacy_records: view بشكل records — records للمجموعات اللي ماتنقلتش + الجداول بشكل البيانات القديم للي اتنقلت.
 *   كل القراءة (bootstrap، changes، التاريخ، المرفقات، الموديولات) بتمر بيه، فالواجهة الحالية مش بتحس بفرق.
 * - legacy_write_*: تحويل سجل بالشكل القديم لأعمدة (الحقول اللي مالهاش عمود بتتحفظ في legacy jsonb زي ما هي).
 * - records للمجموعة المنقولة بتتجمّد (trigger) — مفيش نسختين قابلتين للكتابة.
 * - قرارات 2026-11-17: كود العميل فريد، وصيغة بريد العميل بيتحقق منها، واسم المورد مش فريد.
 */
export class PartiesCutover1764100000000 implements MigrationInterface {
  name = 'PartiesCutover1764100000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "module_cutover" ("collection" text PRIMARY KEY, "cutover_at" timestamptz NOT NULL DEFAULT now(), "cutover_by" text NOT NULL, "report" jsonb NOT NULL)`);
    for (const t of ['suppliers', 'customers']) {
      await q.query(`ALTER TABLE "${t}" ADD COLUMN "deleted_at" timestamptz, ADD COLUMN "legacy_extra" jsonb NOT NULL DEFAULT '{}'::jsonb`);
    }
    // بريد العميل: قرار 2026-11-17 (على كل كتابة). بريد المورد: الواجهة الحالية بتتحقق منه عند الإضافة بس → في الـ API بنفس السلوك، مش قيد جدول
    await q.query(`ALTER TABLE "customers" ADD CONSTRAINT "CHK_customers_email" CHECK ("email" IS NULL OR "email" = '' OR "email" ~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$')`);
    // الواجهة الحالية بتطبّق «الرقم الضريبي ≥ 5» عند الإضافة بس (modals.js:124) مش عند التعديل، والبيانات الحالية فيها 32 مورد
    // بالقيمة «_» (يعني مفيش رقم). القيد في الجدول كان أشد من النظام الحالي → اتشال، والقاعدة بتفضل في الـ API بنفس سلوك الواجهة.
    await q.query(`ALTER TABLE "suppliers" DROP CONSTRAINT "suppliers_tax_id_check"`);
    await q.query(`ALTER TABLE "customers" DROP COLUMN "legacy"`);
    await q.query(`DROP INDEX "ix_customers_code"`);
    await q.query(`CREATE UNIQUE INDEX "uq_customers_code" ON "customers" (lower(btrim("code"))) WHERE "deleted_at" IS NULL AND btrim(coalesce("code", '')) <> ''`);
    await q.query(`ALTER TABLE "customer_contacts" ADD COLUMN "extra" jsonb NOT NULL DEFAULT '{}'::jsonb`);

    // ---- قراءة: صف الجدول ← سجل بالشكل القديم
    await q.query(`CREATE FUNCTION supplier_to_legacy(s suppliers) RETURNS jsonb LANGUAGE sql STABLE AS $$
      SELECT s.legacy_extra || jsonb_build_object(
        'id', s.id, 'name', s.name, 'taxId', coalesce(s.tax_id, ''), 'commercialReg', coalesce(s.commercial_reg, ''), 'businessNature', coalesce(s.business_nature, ''),
        'openingBalance', trim_scale(s.opening_balance), 'openingBalanceDate', coalesce(to_char(s.opening_balance_date, 'YYYY-MM-DD'), ''),
        'phone', coalesce(s.phone, ''), 'email', coalesce(s.email, ''), 'address', coalesce(s.address, ''), 'bankAccount', coalesce(s.bank_account, ''),
        'iban', coalesce(s.iban, ''), 'notes', coalesce(s.notes, ''), 'extraFields', s.extra_fields) $$`);
    await q.query(`CREATE FUNCTION customer_to_legacy(c customers) RETURNS jsonb LANGUAGE sql STABLE AS $$
      SELECT c.legacy_extra || jsonb_build_object(
        'id', c.id, 'code', coalesce(c.code, ''), 'name', c.name, 'phone', coalesce(c.phone, ''), 'email', coalesce(c.email, ''), 'city', coalesce(c.city, ''),
        'category', coalesce(c.category, ''), 'taxId', coalesce(c.tax_id, ''), 'department', coalesce(c.department, ''), 'status', c.status,
        'openingBalance', trim_scale(c.opening_balance), 'address', coalesce(c.address, ''), 'notes', coalesce(c.notes, ''), 'extraFields', c.extra_fields,
        'contacts', coalesce((SELECT jsonb_agg(k.extra || jsonb_build_object('name', k.name, 'title', coalesce(k.title, ''), 'phone', coalesce(k.phone, ''), 'email', coalesce(k.email, '')) ORDER BY k.sort)
                              FROM customer_contacts k WHERE k.customer_id = c.id), '[]'::jsonb)) $$`);

    // ---- كتابة: سجل بالشكل القديم ← أعمدة (upsert). بيرجّع row_version الجديد
    const num = (k: string) => `CASE WHEN p->>'${k}' IS NULL OR p->>'${k}' = '' THEN 0 ELSE round((p->>'${k}')::numeric, 4) END`;
    const arr = (k: string) => `CASE WHEN p ? '${k}' AND jsonb_typeof(p->'${k}') <> 'array' THEN legacy_bad_value('${k}') ELSE coalesce(p->'${k}', '[]'::jsonb) END`;
    await q.query(`CREATE FUNCTION legacy_bad_value(f text) RETURNS jsonb LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'invalid value for %', f USING ERRCODE = '22023'; END $$`);
    await q.query(`CREATE FUNCTION legacy_write_supplier(i text, p jsonb, keep_rev int DEFAULT NULL, created timestamptz DEFAULT NULL) RETURNS int LANGUAGE plpgsql AS $$
      DECLARE v int;
      BEGIN
        INSERT INTO suppliers AS s (id, name, tax_id, commercial_reg, business_nature, opening_balance, opening_balance_date, phone, email, address, bank_account, iban, notes, extra_fields, legacy_extra, row_version, created_at)
        VALUES (i, coalesce(p->>'name', ''), p->>'taxId', p->>'commercialReg', p->>'businessNature', ${num('openingBalance')}, nullif(p->>'openingBalanceDate', '')::date,
          p->>'phone', p->>'email', p->>'address', p->>'bankAccount', p->>'iban', p->>'notes', ${arr('extraFields')},
          p - ARRAY['id','name','taxId','commercialReg','businessNature','openingBalance','openingBalanceDate','phone','email','address','bankAccount','iban','notes','extraFields'],
          coalesce(keep_rev, 1), coalesce(created, clock_timestamp()))
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, tax_id = EXCLUDED.tax_id, commercial_reg = EXCLUDED.commercial_reg, business_nature = EXCLUDED.business_nature,
          opening_balance = EXCLUDED.opening_balance, opening_balance_date = EXCLUDED.opening_balance_date, phone = EXCLUDED.phone, email = EXCLUDED.email, address = EXCLUDED.address,
          bank_account = EXCLUDED.bank_account, iban = EXCLUDED.iban, notes = EXCLUDED.notes, extra_fields = EXCLUDED.extra_fields, legacy_extra = EXCLUDED.legacy_extra,
          row_version = s.row_version + 1, updated_at = now(), deleted_at = NULL,
          created_at = CASE WHEN s.deleted_at IS NOT NULL THEN clock_timestamp() ELSE s.created_at END
        RETURNING row_version INTO v;
        RETURN v;
      END $$`);
    await q.query(`CREATE FUNCTION legacy_write_customer(i text, p jsonb, keep_rev int DEFAULT NULL, created timestamptz DEFAULT NULL) RETURNS int LANGUAGE plpgsql AS $$
      DECLARE v int; k jsonb; n int := 0;
      BEGIN
        INSERT INTO customers AS c (id, code, name, phone, email, city, category, tax_id, department, status, opening_balance, address, notes, extra_fields, legacy_extra, row_version, created_at)
        VALUES (i, p->>'code', coalesce(p->>'name', ''), p->>'phone', p->>'email', p->>'city', p->>'category', p->>'taxId', p->>'department', coalesce(nullif(p->>'status', ''), 'active'),
          ${num('openingBalance')}, p->>'address', p->>'notes', ${arr('extraFields')},
          p - ARRAY['id','code','name','phone','email','city','category','taxId','department','status','openingBalance','address','notes','extraFields','contacts'],
          coalesce(keep_rev, 1), coalesce(created, clock_timestamp()))
        ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name, phone = EXCLUDED.phone, email = EXCLUDED.email, city = EXCLUDED.city, category = EXCLUDED.category,
          tax_id = EXCLUDED.tax_id, department = EXCLUDED.department, status = EXCLUDED.status, opening_balance = EXCLUDED.opening_balance, address = EXCLUDED.address, notes = EXCLUDED.notes,
          extra_fields = EXCLUDED.extra_fields, legacy_extra = EXCLUDED.legacy_extra, row_version = c.row_version + 1, updated_at = now(), deleted_at = NULL,
          created_at = CASE WHEN c.deleted_at IS NOT NULL THEN clock_timestamp() ELSE c.created_at END
        RETURNING row_version INTO v;
        DELETE FROM customer_contacts WHERE customer_id = i;
        FOR k IN SELECT * FROM jsonb_array_elements(${arr('contacts')}) LOOP
          n := n + 1;
          INSERT INTO customer_contacts (customer_id, sort, name, title, phone, email, extra)
          VALUES (i, n, coalesce(k->>'name', ''), k->>'title', k->>'phone', k->>'email', k - ARRAY['name','title','phone','email']);
        END LOOP;
        RETURN v;
      END $$`);

    await q.query(`CREATE VIEW legacy_records AS
      SELECT r.collection, r.id, r.data, r.rev, r.deleted_at, r.created_at, r.updated_at, r.project_id FROM records r
        WHERE NOT EXISTS (SELECT 1 FROM module_cutover m WHERE m.collection = r.collection)
      UNION ALL SELECT 'ledger.suppliers', s.id, supplier_to_legacy(s), s.row_version, s.deleted_at, s.created_at, s.updated_at, NULL FROM suppliers s
        WHERE EXISTS (SELECT 1 FROM module_cutover m WHERE m.collection = 'ledger.suppliers')
      UNION ALL SELECT 'clients.customers', c.id, customer_to_legacy(c), c.row_version, c.deleted_at, c.created_at, c.updated_at, NULL FROM customers c
        WHERE EXISTS (SELECT 1 FROM module_cutover m WHERE m.collection = 'clients.customers')`);

    // سجلات المجموعة المنقولة في records بتتجمّد (قراءة بس) — الحذف النهائي بعد فترة الاستقرار بموافقة
    await q.query(`CREATE FUNCTION records_frozen_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF EXISTS (SELECT 1 FROM module_cutover m WHERE m.collection = coalesce(NEW.collection, OLD.collection)) THEN
          RAISE EXCEPTION 'records of % are frozen (moved to relational tables)', coalesce(NEW.collection, OLD.collection) USING ERRCODE = '55000';
        END IF;
        RETURN coalesce(NEW, OLD);
      END $$`);
    await q.query(`CREATE TRIGGER records_frozen BEFORE INSERT OR UPDATE OR DELETE ON records FOR EACH ROW EXECUTE FUNCTION records_frozen_guard()`);
  }

  async down(q: QueryRunner): Promise<void> {
    const [{ n }] = await q.query(`SELECT count(*)::int AS n FROM module_cutover`);
    if (n > 0) throw new Error('module_cutover not empty — run "cutover parties rollback" first');
    await q.query(`DROP TRIGGER records_frozen ON records`);
    await q.query(`DROP FUNCTION records_frozen_guard()`);
    await q.query(`DROP VIEW legacy_records`);
    await q.query(`DROP FUNCTION legacy_write_customer(text, jsonb, int, timestamptz)`);
    await q.query(`DROP FUNCTION legacy_write_supplier(text, jsonb, int, timestamptz)`);
    await q.query(`DROP FUNCTION legacy_bad_value(text)`);
    await q.query(`DROP FUNCTION customer_to_legacy(customers)`);
    await q.query(`DROP FUNCTION supplier_to_legacy(suppliers)`);
    await q.query(`ALTER TABLE "customer_contacts" DROP COLUMN "extra"`);
    await q.query(`DROP INDEX "uq_customers_code"`);
    await q.query(`CREATE INDEX "ix_customers_code" ON "customers" (lower(btrim("code")))`);
    await q.query(`ALTER TABLE "customers" ADD COLUMN "legacy" jsonb NOT NULL DEFAULT '{}'::jsonb`);
    await q.query(`ALTER TABLE "customers" DROP CONSTRAINT "CHK_customers_email"`);
    for (const t of ['suppliers', 'customers']) await q.query(`ALTER TABLE "${t}" DROP COLUMN "legacy_extra", DROP COLUMN "deleted_at"`);
    await q.query(`ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tax_id_check" CHECK ("tax_id" IS NULL OR length(btrim("tax_id")) = 0 OR length(btrim("tax_id")) >= 5)`);
    await q.query(`DROP TABLE "module_cutover"`);
  }
}
