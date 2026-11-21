import { DataSource, QueryRunner } from 'typeorm';
import { WRITE_LOCK_KEY } from '../data/data.service';

/**
 * نقل موديول من records للجداول العلائقية (MODULE_MIGRATION_PLAN §2 الخطوة 7) وعكسه (§5) — عام لكل الموديولات.
 * - معاملة واحدة تحت قفل الكتابة العام: يا كله يا ولا حاجة.
 * - rev بيتنقل زي ما هو، وترتيب السجلات محفوظ (created_at).
 * - تحقق تكافؤ لكل سجل: الشكل القديم (بعد التطبيع الموثّق للموديول) = الشكل الناتج من الجدول.
 * - القيود المؤجّلة (مثلًا B-50) بتتفحص في نهاية المعاملة على الحالة النهائية — مفيش تخطّي لأي قيد.
 */
export interface CutoverCollection {
  collection: string; table: string; write: string; read: string; normalized: string; rounding?: { column: string; key: string };
  /** حقول ليها أعمدة بنوع محدد: القيمة اللي نوعها مختلف بتفضل في legacy_extra — التقرير بيعدّها لكل حقل (أعداد بس) */
  typedKeys?: string[];
}
export interface ModuleSpec { label: string; collections: CutoverCollection[]; clearTables: string[] }
export interface CutoverReport {
  mode: 'dry-run' | 'execute'; at: string;
  collections: { collection: string; migrated: number; rounding: { id: string; from: string; to: string }[]; untyped?: Record<string, number> }[];
}

async function migrateAll(qr: QueryRunner, spec: ModuleSpec, by: string, mode: CutoverReport['mode']): Promise<CutoverReport> {
  await qr.query(`SELECT pg_advisory_xact_lock($1)`, [WRITE_LOCK_KEY]);
  await qr.query(`SET CONSTRAINTS ALL DEFERRED`);
  const [{ n }] = await qr.query(`SELECT count(*)::int AS n FROM module_cutover WHERE collection = ANY($1)`, [spec.collections.map((c) => c.collection)]);
  if (n > 0) throw new Error(`ALREADY_CUT_OVER: ${spec.label} متنقل قبل كده`);
  const report: CutoverReport = { mode, at: new Date().toISOString(), collections: [] };
  for (const p of spec.collections) {
    const [{ m }] = await qr.query(`SELECT count(*)::int AS m FROM ${p.table}`);
    if (m > 0) throw new Error(`TABLE_NOT_EMPTY: ${p.table}`);
    const rows: { id: string }[] = await qr.query(
      `SELECT r.id, ${p.write}(r.id, r.data, r.rev, r.created_at) FROM records r WHERE r.collection = $1 AND r.deleted_at IS NULL ORDER BY r.created_at, r.id`, [p.collection]);
    const bad: { id: string }[] = await qr.query(
      `SELECT r.id FROM records r JOIN ${p.table} t ON t.id = r.id WHERE r.collection = $1 AND r.deleted_at IS NULL
         AND (${p.normalized} <> ${p.read}(t) OR t.row_version <> r.rev)`, [p.collection]);
    if (bad.length) {
      // أسماء الحقول المختلفة بس (من غير قيم) لأول سجل — للتشخيص
      const [d] = await qr.query(`SELECT array_agg(k ORDER BY k) AS keys FROM (SELECT r.id, ${p.normalized} AS a, ${p.read}(t) AS b FROM records r JOIN ${p.table} t ON t.id = r.id
        WHERE r.collection = $1 AND r.id = $2) x, LATERAL (SELECT jsonb_object_keys(x.a) UNION SELECT jsonb_object_keys(x.b)) AS kk(k) WHERE x.a->k IS DISTINCT FROM x.b->k`, [p.collection, bad[0].id]);
      throw new Error(`PARITY_FAILED ${p.collection}: ${bad.slice(0, 20).map((b) => b.id).join(', ')}${bad.length > 20 ? ` (+${bad.length - 20})` : ''} — fields: ${(d?.keys ?? ['row_version']).join(', ')}`);
    }
    const rounding = p.rounding ? await qr.query(
      `SELECT r.id, r.data->>'${p.rounding.key}' AS "from", trim_scale(t.${p.rounding.column})::text AS "to" FROM records r JOIN ${p.table} t ON t.id = r.id
       WHERE r.collection = $1 AND r.deleted_at IS NULL AND coalesce(r.data->>'${p.rounding.key}','') <> '' AND (r.data->>'${p.rounding.key}')::numeric <> t.${p.rounding.column}`, [p.collection]) : [];
    const untyped = p.typedKeys ? Object.fromEntries((await qr.query(
      `SELECT k, count(*)::int AS n FROM ${p.table} t, unnest($1::text[]) AS k WHERE t.legacy_extra ? k GROUP BY k ORDER BY k`, [p.typedKeys])).map((x: { k: string; n: number }) => [x.k, x.n])) : undefined;
    report.collections.push({ collection: p.collection, migrated: rows.length, rounding, ...(untyped ? { untyped } : {}) });
  }
  for (const c of report.collections) await qr.query(`INSERT INTO module_cutover (collection, cutover_by, report) VALUES ($1, $2, $3::jsonb)`, [c.collection, by, JSON.stringify(report)]);
  await qr.query(`INSERT INTO audit_log (username, action, entity, details) VALUES ($1, 'module.cutover', $2, $3::jsonb)`, [by, spec.label, JSON.stringify(report)]);
  await qr.query(`SET CONSTRAINTS ALL IMMEDIATE`); // القيود المؤجّلة بتتفحص هنا على الحالة النهائية
  return report;
}

/** dry-run: التنفيذ الكامل + التحقق، وبعدين ROLLBACK — مفيش أي أثر */
export async function cutoverModule(ds: DataSource, spec: ModuleSpec, by: string, mode: CutoverReport['mode']): Promise<CutoverReport> {
  const qr = ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction('READ COMMITTED');
  try {
    const r = await migrateAll(qr, spec, by, mode);
    if (mode === 'execute') await qr.commitTransaction(); else await qr.rollbackTransaction();
    return r;
  } catch (e) {
    if (qr.isTransactionActive) await qr.rollbackTransaction();
    throw e;
  } finally { await qr.release(); }
}

/** الرجوع: الجداول ← records بالحالة الحالية (شاملة اللي اتضاف/اتعدّل/اتمسح بعد النقل)، والجداول بتتفضّى */
export async function rollbackModule(ds: DataSource, spec: ModuleSpec, by: string): Promise<{ restored: Record<string, number> }> {
  const qr = ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction('READ COMMITTED');
  try {
    await qr.query(`SELECT pg_advisory_xact_lock($1)`, [WRITE_LOCK_KEY]);
    await qr.query(`SET CONSTRAINTS ALL DEFERRED`);
    const restored: Record<string, number> = {};
    await qr.query(`DELETE FROM module_cutover WHERE collection = ANY($1)`, [spec.collections.map((c) => c.collection)]);
    for (const p of spec.collections) {
      const rows = await qr.query(
        `INSERT INTO records (collection, id, data, rev, deleted_at, created_at, updated_at)
         SELECT $1, t.id, ${p.read}(t), t.row_version, t.deleted_at, t.created_at, now() FROM ${p.table} t ORDER BY t.created_at, t.id
         ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, rev = EXCLUDED.rev, deleted_at = EXCLUDED.deleted_at, updated_at = now()
         RETURNING id`, [p.collection]);
      restored[p.collection] = rows.length;
    }
    for (const t of spec.clearTables) await qr.query(`DELETE FROM ${t}`);
    await qr.query(`INSERT INTO audit_log (username, action, entity, details) VALUES ($1, 'module.cutover.rollback', $2, $3::jsonb)`, [by, spec.label, JSON.stringify({ restored })]);
    await qr.query(`SET CONSTRAINTS ALL IMMEDIATE`);
    await qr.commitTransaction();
    return { restored };
  } catch (e) {
    if (qr.isTransactionActive) await qr.rollbackTransaction();
    throw e;
  } finally { await qr.release(); }
}

/**
 * المطابقة (خطة v1.4.5 المرحلة 6، البند 6.5): لكل مجموعة في الموديول — العدد، وبصمة المحتوى (id + rev + بصمة الشكل القديم لكل سجل)،
 * وبصمة الترتيب. قبل النقل من records (بعد نفس التطبيع الموثّق اللي تحقق التكافؤ بيستخدمه)، وبعده من الجدول (بالشكل اللي الواجهة القديمة بتشوفه).
 * ومعاهم بصمة واحدة لكل المجموعات التانية (من legacy_records) عشان يبان إن مفيش حاجة تانية اتلمست.
 * المخرج أعداد وبصمات بس — مفيش أي قيمة من البيانات. قراءة بس.
 */
export interface ReconcileReport {
  at: string;
  collections: { collection: string; source: 'records' | 'table'; count: number; content: string; order: string }[];
  others: { collections: number; count: number; content: string };
}
export async function reconcileModule(ds: DataSource, spec: ModuleSpec): Promise<ReconcileReport> {
  const names = spec.collections.map((c) => c.collection);
  const cut = new Set((await ds.query(`SELECT collection FROM module_cutover WHERE collection = ANY($1)`, [names])).map((r: { collection: string }) => r.collection));
  const report: ReconcileReport = { at: new Date().toISOString(), collections: [], others: { collections: 0, count: 0, content: '' } };
  for (const p of spec.collections) {
    const src = cut.has(p.collection)
      ? `SELECT t.id, t.row_version AS rev, ${p.read}(t) AS data, t.created_at FROM ${p.table} t WHERE t.deleted_at IS NULL`
      : `SELECT r.id, r.rev, ${p.normalized} AS data, r.created_at FROM records r WHERE r.collection = '${p.collection}' AND r.deleted_at IS NULL`;
    const [row] = await ds.query(`SELECT count(*)::int AS count,
        coalesce(md5(string_agg(x.id || ':' || x.rev || ':' || md5(x.data::text), ',' ORDER BY x.id)), '') AS content,
        coalesce(md5(string_agg(x.id, ',' ORDER BY x.created_at, x.id)), '') AS "order" FROM (${src}) x`);
    report.collections.push({ collection: p.collection, source: cut.has(p.collection) ? 'table' : 'records', ...row });
  }
  const [o] = await ds.query(`SELECT count(DISTINCT collection)::int AS collections, count(*)::int AS count,
      coalesce(md5(string_agg(collection || '/' || id || ':' || rev || ':' || md5(data::text), ',' ORDER BY collection, id)), '') AS content
    FROM legacy_records WHERE deleted_at IS NULL AND NOT (collection = ANY($1))`, [names]);
  report.others = o;
  return report;
}
