import { DataSource, QueryRunner } from 'typeorm';
import { WRITE_LOCK_KEY } from '../data/data.service';

/**
 * نقل الموردين والعملاء من records للجداول العلائقية (المرحلة 6.1 — الخطوة 7) وعكسه.
 * كل العملية في معاملة واحدة تحت قفل الكتابة العام (نفس قفل /api/sync) — يا كله يا ولا حاجة.
 * - rev بيتنقل زي ما هو (row_version = rev)، فالتعديلات المعلّقة عند المستخدمين بتكمل عادي.
 * - ترتيب السجلات محفوظ (created_at).
 * - تحقق تكافؤ لكل سجل: الشكل القديم قبل = الشكل الناتج من الجدول، بعد التطبيع الموثّق بس
 *   (الحقول النصية الناقصة = ''، والرصيد الافتتاحي مقرّب لـ 4 خانات HALF_UP — B-25).
 */
export const PARTY_COLLECTIONS = [
  { collection: 'ledger.suppliers', table: 'suppliers', write: 'legacy_write_supplier', read: 'supplier_to_legacy',
    defaults: `jsonb_build_object('name','','taxId','','commercialReg','','businessNature','','openingBalance',0,'openingBalanceDate','','phone','','email','','address','','bankAccount','','iban','','notes','','extraFields','[]'::jsonb)` },
  { collection: 'clients.customers', table: 'customers', write: 'legacy_write_customer', read: 'customer_to_legacy',
    defaults: `jsonb_build_object('code','','name','','phone','','email','','city','','category','','taxId','','department','','status','active','openingBalance',0,'address','','notes','','extraFields','[]'::jsonb,'contacts','[]'::jsonb)` },
] as const;

export interface CutoverReport {
  mode: 'dry-run' | 'execute'; at: string;
  collections: { collection: string; migrated: number; rounding: { id: string; from: string; to: string }[] }[];
}

/** التطبيع المسموح بس: defaults للحقول الناقصة + تقريب الرصيد + جهات اتصال بنفس المفاتيح */
const normalized = (defaults: string) => `(${defaults} || r.data || jsonb_build_object('id', r.id,
  'openingBalance', CASE WHEN coalesce(r.data->>'openingBalance','') = '' THEN 0 ELSE trim_scale(round((r.data->>'openingBalance')::numeric, 4)) END)
  || CASE WHEN r.data ? 'contacts' AND jsonb_typeof(r.data->'contacts') = 'array' THEN jsonb_build_object('contacts', (SELECT coalesce(jsonb_agg(jsonb_build_object('title','','phone','','email','') || e ORDER BY o), '[]'::jsonb) FROM jsonb_array_elements(r.data->'contacts') WITH ORDINALITY AS x(e, o))) ELSE '{}'::jsonb END
  || CASE WHEN coalesce(r.data->>'status','') = '' AND r.data ? 'code' THEN jsonb_build_object('status','active') ELSE '{}'::jsonb END)`;

async function migrateAll(qr: QueryRunner, by: string, mode: CutoverReport['mode']): Promise<CutoverReport> {
  await qr.query(`SELECT pg_advisory_xact_lock($1)`, [WRITE_LOCK_KEY]);
  const [{ n }] = await qr.query(`SELECT count(*)::int AS n FROM module_cutover WHERE collection = ANY($1)`, [PARTY_COLLECTIONS.map((c) => c.collection)]);
  if (n > 0) throw new Error('ALREADY_CUT_OVER: الموردين/العملاء متنقلين قبل كده');
  const report: CutoverReport = { mode, at: new Date().toISOString(), collections: [] };
  for (const p of PARTY_COLLECTIONS) {
    const [{ m }] = await qr.query(`SELECT count(*)::int AS m FROM ${p.table}`);
    if (m > 0) throw new Error(`TABLE_NOT_EMPTY: ${p.table}`);
    const rows: { id: string }[] = await qr.query(
      `SELECT r.id, ${p.write}(r.id, r.data, r.rev, r.created_at) FROM records r WHERE r.collection = $1 AND r.deleted_at IS NULL ORDER BY r.created_at, r.id`, [p.collection]);
    const bad: { id: string }[] = await qr.query(
      `SELECT r.id FROM records r JOIN ${p.table} t ON t.id = r.id WHERE r.collection = $1 AND r.deleted_at IS NULL
         AND (${normalized(p.defaults)} <> ${p.read}(t) OR t.row_version <> r.rev)`, [p.collection]);
    if (bad.length) throw new Error(`PARITY_FAILED ${p.collection}: ${bad.slice(0, 20).map((b) => b.id).join(', ')}${bad.length > 20 ? ` (+${bad.length - 20})` : ''}`);
    const rounding = await qr.query(
      `SELECT r.id, r.data->>'openingBalance' AS "from", trim_scale(t.opening_balance)::text AS "to" FROM records r JOIN ${p.table} t ON t.id = r.id
       WHERE r.collection = $1 AND r.deleted_at IS NULL AND coalesce(r.data->>'openingBalance','') <> '' AND (r.data->>'openingBalance')::numeric <> t.opening_balance`, [p.collection]);
    report.collections.push({ collection: p.collection, migrated: rows.length, rounding });
  }
  for (const c of report.collections) await qr.query(`INSERT INTO module_cutover (collection, cutover_by, report) VALUES ($1, $2, $3::jsonb)`, [c.collection, by, JSON.stringify(report)]);
  await qr.query(`INSERT INTO audit_log (username, action, entity, details) VALUES ($1, 'module.cutover', 'parties', $2::jsonb)`, [by, JSON.stringify(report)]);
  return report;
}

/** dry-run: التنفيذ الكامل + التحقق، وبعدين ROLLBACK — مفيش أي أثر */
export async function partiesCutover(ds: DataSource, by: string, mode: CutoverReport['mode']): Promise<CutoverReport> {
  const qr = ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction('READ COMMITTED');
  try {
    const r = await migrateAll(qr, by, mode);
    if (mode === 'execute') await qr.commitTransaction(); else await qr.rollbackTransaction();
    return r;
  } catch (e) {
    if (qr.isTransactionActive) await qr.rollbackTransaction();
    throw e;
  } finally { await qr.release(); }
}

/** الرجوع (MODULE_MIGRATION_PLAN §5): الجداول ← records بالحالة الحالية (شاملة اللي اتضاف/اتعدّل/اتمسح بعد النقل)، والجداول بتتفضّى */
export async function partiesRollback(ds: DataSource, by: string): Promise<{ restored: Record<string, number> }> {
  const qr = ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction('READ COMMITTED');
  try {
    await qr.query(`SELECT pg_advisory_xact_lock($1)`, [WRITE_LOCK_KEY]);
    const restored: Record<string, number> = {};
    await qr.query(`DELETE FROM module_cutover WHERE collection = ANY($1)`, [PARTY_COLLECTIONS.map((c) => c.collection)]);
    for (const p of PARTY_COLLECTIONS) {
      const rows = await qr.query(
        `INSERT INTO records (collection, id, data, rev, deleted_at, created_at, updated_at)
         SELECT $1, t.id, ${p.read}(t), t.row_version, t.deleted_at, t.created_at, now() FROM ${p.table} t
         ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, rev = EXCLUDED.rev, deleted_at = EXCLUDED.deleted_at, updated_at = now()
         RETURNING id`, [p.collection]);
      restored[p.collection] = rows.length;
    }
    await qr.query(`DELETE FROM customer_contacts`);
    await qr.query(`DELETE FROM customers`);
    await qr.query(`DELETE FROM suppliers`);
    await qr.query(`INSERT INTO audit_log (username, action, entity, details) VALUES ($1, 'module.cutover.rollback', 'parties', $2::jsonb)`, [by, JSON.stringify({ restored })]);
    await qr.commitTransaction();
    return { restored };
  } catch (e) {
    if (qr.isTransactionActive) await qr.rollbackTransaction();
    throw e;
  } finally { await qr.release(); }
}
