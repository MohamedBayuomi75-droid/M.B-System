import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 7.2.3 — جدول فواتير ومرتجعات الموردين + الـ Adapter (نفس نمط 6.1/6.2). **مابتنقلش بيانات**:
 * النقل أمر تشغيل (`npm run cutover -- supplier-invoices execute`) مشروط بنسخة احتياطية + اختبار استعادة.
 *
 * - **القديم بقيمه زي ما هو (DEC-0107):** كل حقل بيتخزّن في عموده **لو نوعه هو النوع المتوقع بس** (نص، أو رقم، أو منطقي، أو مصفوفة).
 *   أي قيمة نوعها مختلف (مثلًا مبلغ مكتوب كنص، أو null) بتفضل في legacy_extra بالظبط، فالتكافؤ 100% من غير أي تطبيع،
 *   والعدد بيطلع في تقرير النقل (من غير قيم) ويدخل تقرير المطابقة (7.2.6).
 * - المبالغ NUMERIC من غير scale: القديم بكل خاناته. الجديد من الـ API بأربع خانات HALF_UP (B-25) — ده في الـ API.
 * - مفيش إعادة حساب للإجمالي أو الصافي في القاعدة (DEC-0107: القديم بقيمه، والمعادلة الانتقالية في الـ API للجديد).
 * - internal_no: الرقم الداخلي السنوي (PI-/PR-، DEC-0103) للجديد بس — القديم من غير رقم (DEC-0108).
 * - B-31 للجديد: رقم المورد فريد لكل مورد جوه نفس النوع (فاتورة/مرتجع) — بيتفحص لما الصف له رقم داخلي بس،
 *   فالـ 11 مكرر القديمين والكتابة من الواجهة القديمة بيفضلوا زي ما هم.
 * - integration_events: الـ outbox لأحداث المحاسبة (DEC-0104) — append-only، ومفتاح idempotency فريد. مفيش قيود محاسبية هنا (المرحلة 10).
 * - مفيش FK للمورد ولا للفاتورة الأصلية: البيانات القديمة ممكن يكون فيها ربط مقطوع، وده بيطلع في تقرير المطابقة مش بيوقف النقل.
 */
const COLS: [string, string, 'text' | 'number' | 'boolean' | 'array'][] = [
  ['supplier_id', 'supplierId', 'text'], ['invoice_no', 'invoiceNo', 'text'], ['date', 'date', 'text'], ['due_date', 'dueDate', 'text'],
  ['category', 'category', 'text'], ['project', 'project', 'text'], ['description', 'description', 'text'],
  ['internal_code', 'internalCode', 'text'], ['supplier_item_code', 'supplierItemCode', 'text'], ['item_description', 'itemDescription', 'text'],
  ['quantity', 'quantity', 'text'], ['unit_price', 'unitPrice', 'text'],
  ['base_value', 'baseValue', 'number'], ['vat', 'vat', 'number'], ['stamp_duty', 'stampDuty', 'number'], ['discount_rate', 'discountRate', 'text'],
  ['withheld', 'withheld', 'number'], ['withheld_status', 'withheldStatus', 'text'], ['total_invoice', 'totalInvoice', 'number'], ['net_invoice', 'netInvoice', 'number'],
  ['nature', 'nature', 'text'], ['discount_type', 'discountType', 'text'],
  ['is_return', 'isReturn', 'boolean'], ['linked_invoice_id', 'linkedInvoiceId', 'text'], ['cancelled', 'cancelled', 'boolean'], ['post_return_wht', 'postReturnWht', 'boolean'],
  ['linked_return_ids', 'linkedReturnIds', 'array'], ['invoice_link', 'invoiceLink', 'text'], ['notes', 'notes', 'text'], ['attachments', 'attachments', 'array'],
  ['internal_no', 'internalNo', 'text'],
];
export const SUPPLIER_INVOICE_COLUMNS = COLS;
const SQL_TYPE = { text: 'text', number: 'numeric', boolean: 'boolean', array: 'jsonb' } as const;
const JSON_TYPE = { text: 'string', number: 'number', boolean: 'boolean', array: 'array' } as const;
const val = (k: string, t: keyof typeof SQL_TYPE) => `CASE WHEN jsonb_typeof(p->'${k}') = '${JSON_TYPE[t]}' THEN ${t === 'array' ? `p->'${k}'` : `(p->>'${k}')::${SQL_TYPE[t]}`} END`;
/** المفاتيح اللي اتخزّنت في أعمدتها (نوعها مطابق) — الباقي بيفضل في legacy_extra */
const typedKeys = `ARRAY(SELECT v.k FROM (VALUES ${COLS.map(([, k, t]) => `('${k}','${JSON_TYPE[t]}')`).join(', ')}) AS v(k, t) WHERE jsonb_typeof(p->v.k) = v.t)`;

const VIEW_BASE = `SELECT r.collection, r.id, r.data, r.rev, r.deleted_at, r.created_at, r.updated_at, r.project_id FROM records r
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
        WHERE EXISTS (SELECT 1 FROM module_cutover m WHERE m.collection = 'warehouses.movements')`;

export class SupplierInvoices1764800000000 implements MigrationInterface {
  name = 'SupplierInvoices1764800000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "supplier_invoices" ("id" text PRIMARY KEY,
      ${COLS.map(([c, , t]) => `"${c}" ${SQL_TYPE[t]}`).join(', ')},
      "legacy_extra" jsonb NOT NULL DEFAULT '{}'::jsonb, "row_version" int NOT NULL DEFAULT 1,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz)`);
    await q.query(`CREATE INDEX "ix_supplier_invoices_supplier" ON "supplier_invoices" ("supplier_id") WHERE "deleted_at" IS NULL`);
    await q.query(`CREATE INDEX "ix_supplier_invoices_linked" ON "supplier_invoices" ("linked_invoice_id") WHERE "deleted_at" IS NULL AND "linked_invoice_id" IS NOT NULL`);
    await q.query(`CREATE UNIQUE INDEX "uq_supplier_invoices_internal_no" ON "supplier_invoices" ("internal_no") WHERE "internal_no" IS NOT NULL`);

    // ---- قراءة: صف ← الشكل القديم (المستوى الأول بس — jsonb_strip_nulls كانت هتمسح null جوه المرفقات؛ عمود null = الحقل كان مش موجود أو نوعه مختلف وموجود في legacy_extra)
    await q.query(`CREATE FUNCTION supplier_invoice_to_legacy(t supplier_invoices) RETURNS jsonb LANGUAGE sql STABLE AS $$
      SELECT t.legacy_extra || jsonb_drop_null_keys(jsonb_build_object('id', t.id, ${COLS.map(([c, k]) => `'${k}', t.${c}`).join(', ')})) $$`);

    // ---- كتابة: الشكل القديم ← أعمدة (upsert) — بيرجّع row_version
    await q.query(`CREATE FUNCTION legacy_write_supplier_invoice(i text, p jsonb, keep_rev int DEFAULT NULL, created timestamptz DEFAULT NULL) RETURNS int LANGUAGE plpgsql AS $$
      DECLARE v int;
      BEGIN
        INSERT INTO supplier_invoices AS t (id, ${COLS.map(([c]) => c).join(', ')}, legacy_extra, row_version, created_at)
        VALUES (i, ${COLS.map(([, k, t]) => val(k, t)).join(', ')}, (p - 'id') - ${typedKeys}, coalesce(keep_rev, 1), coalesce(created, clock_timestamp()))
        ON CONFLICT (id) DO UPDATE SET ${COLS.map(([c]) => `${c} = EXCLUDED.${c}`).join(', ')}, legacy_extra = EXCLUDED.legacy_extra,
          row_version = t.row_version + 1, updated_at = now(), deleted_at = NULL,
          created_at = CASE WHEN t.deleted_at IS NOT NULL THEN clock_timestamp() ELSE t.created_at END
        RETURNING row_version INTO v;
        RETURN v;
      END $$`);

    // ---- B-31 للجديد (اللي ليه رقم داخلي): رقم المورد فريد لكل مورد جوه نفس النوع، مقارنةً بكل الفواتير الحية (القديمة كمان)
    await q.query(`CREATE FUNCTION supplier_invoice_unique_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.internal_no IS NOT NULL AND NEW.deleted_at IS NULL AND EXISTS (
          SELECT 1 FROM supplier_invoices o WHERE o.id <> NEW.id AND o.deleted_at IS NULL
            AND o.supplier_id IS NOT DISTINCT FROM NEW.supplier_id AND coalesce(o.is_return, false) = coalesce(NEW.is_return, false)
            AND lower(btrim(coalesce(o.invoice_no, ''))) = lower(btrim(coalesce(NEW.invoice_no, '')))) THEN
          RAISE EXCEPTION 'DUPLICATE_SUPPLIER_INVOICE_NO supplier=% no=%', NEW.supplier_id, NEW.invoice_no USING ERRCODE = '23505', CONSTRAINT = 'uq_supplier_invoice_no';
        END IF;
        RETURN NEW;
      END $$`);
    await q.query(`CREATE TRIGGER supplier_invoice_unique_guard BEFORE INSERT OR UPDATE ON supplier_invoices FOR EACH ROW EXECUTE FUNCTION supplier_invoice_unique_guard()`);

    // ---- أحداث التكامل مع المحاسبة (DEC-0104، outbox): append-only، ومفتاح idempotency فريد (الحدث مايتسجّلش مرتين — P7.2-I)
    await q.query(`CREATE TABLE "integration_events" ("seq" bigserial PRIMARY KEY,
      "event_type" text NOT NULL CHECK ("event_type" ~ '^[a-z][a-z-]*\\.[a-z][a-z-]*$'),
      "aggregate_type" text NOT NULL, "aggregate_id" text NOT NULL,
      "idempotency_key" text NOT NULL UNIQUE, "payload" jsonb NOT NULL,
      "occurred_at" timestamptz NOT NULL DEFAULT now(), "created_by" uuid)`);
    await q.query(`CREATE INDEX "ix_integration_events_aggregate" ON "integration_events" ("aggregate_type", "aggregate_id")`);
    await q.query(`CREATE FUNCTION integration_events_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'integration events are append-only' USING ERRCODE = '55000'; END $$`);
    await q.query(`CREATE TRIGGER integration_events_append_only BEFORE UPDATE OR DELETE ON integration_events FOR EACH ROW EXECUTE FUNCTION integration_events_append_only()`);

    await q.query(`CREATE OR REPLACE VIEW legacy_records AS ${VIEW_BASE}
      UNION ALL SELECT 'ledger.invoices', t.id, supplier_invoice_to_legacy(t), t.row_version, t.deleted_at, t.created_at, t.updated_at, NULL FROM supplier_invoices t
        WHERE EXISTS (SELECT 1 FROM module_cutover m WHERE m.collection = 'ledger.invoices')`);
  }

  async down(q: QueryRunner): Promise<void> {
    const [{ n }] = await q.query(`SELECT count(*)::int AS n FROM module_cutover WHERE collection = 'ledger.invoices'`);
    if (n > 0) throw new Error('supplier invoices are cut over — run "cutover supplier-invoices rollback" first');
    await q.query(`CREATE OR REPLACE VIEW legacy_records AS ${VIEW_BASE}`);
    await q.query(`DROP TRIGGER integration_events_append_only ON integration_events`);
    await q.query(`DROP FUNCTION integration_events_append_only()`);
    await q.query(`DROP TABLE "integration_events"`);
    await q.query(`DROP TRIGGER supplier_invoice_unique_guard ON supplier_invoices`);
    await q.query(`DROP FUNCTION supplier_invoice_unique_guard()`);
    await q.query(`DROP FUNCTION legacy_write_supplier_invoice(text, jsonb, int, timestamptz)`);
    await q.query(`DROP FUNCTION supplier_invoice_to_legacy(supplier_invoices)`);
    await q.query(`DROP TABLE "supplier_invoices"`);
  }
}
