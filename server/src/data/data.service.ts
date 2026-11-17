import { createHash } from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { isDeepStrictEqual } from 'node:util';
import { DataSource, QueryRunner } from 'typeorm';
import type { AuthUser } from '../auth/auth.types';
import { hasPagePermission } from '../authz/effective-permissions';
import { SERVER_OWNED_DOCS } from './collection-pages';
import { COLLECTIONS_MAP, LEGACY_SCHEMA_VERSION } from './collections-map.generated';
import {
  AppliedDocDto, AppliedRecordDto, BootstrapDto, ChangeEventDto, ConflictDocDto, ConflictRecordDto,
  DocChangeDto, FIELD_RE, RecordChangeDto, SyncRequestDto, SyncResponseDto, WriteAccessDto,
} from './data.dto';
import { isFinancialField } from './financial-fields';
import { canRead, canWrite, hiddenFields, inProjectScope, isAnyEditor, projectIdsOf, stripHidden, WriteAction } from './policy';

type Json = Record<string, unknown>;
/** كل الكتابات بتتسلسل بقفل واحد → ترتيب seq = ترتيب الـ commit (البث والـ catch-up مايفوّتوش تغيير) — D-019 */
export const WRITE_LOCK_KEY = 727_001;
export const DOC_COLLECTION = '$doc';
const MAX_RECORD_BYTES = 2 * 1024 * 1024;
const AUDIT_BOOTSTRAP_LIMIT = 3000;
/** المجموعات اللي ممكن تتنقل لجداول علائقية (المرحلة 6) ← دالة الكتابة وجدولها */
const RELATIONAL_WRITERS: Record<string, { fn: string; table: string }> = {
  'ledger.suppliers': { fn: 'legacy_write_supplier', table: 'suppliers' },
  'clients.customers': { fn: 'legacy_write_customer', table: 'customers' },
  'warehouses.locations': { fn: 'legacy_write_wh_location', table: 'wh_locations' },
  'warehouses.items': { fn: 'legacy_write_wh_item', table: 'wh_items' },
  'warehouses.movements': { fn: 'legacy_write_wh_movement', table: 'wh_movements' },
};
/** أكواد PostgreSQL لرفض قيد (تفرّد/CHECK/قيمة) ← تعارض صريح بدل 500 */
/** مجموعات عليها قيود قاعدة بيانات بتتفحص بعد الكتابة (B-50: الرصيد السالب) — الرفض بيرجع تعارض صريح ومابيوقفش باقي الدفعة */
const GUARDED_COLLECTIONS = new Set(['warehouses.movements', 'warehouses.items']);
/** رسالة رفض القيد ← بادئة ثابتة للواجهة (web/sync-client.js) + إجراء التدقيق للمخازن */
function constraintTag(collection: string, msg: string, code: string): { tag: string; audit: string | null } {
  if (msg.startsWith('NEGATIVE_STOCK')) return { tag: 'negative_stock', audit: 'stock.issue_rejected' };
  if (msg.startsWith('ITEM_HAS_MOVEMENTS')) return { tag: 'item_has_movements', audit: 'stock.item_delete_rejected' };
  if (collection === 'warehouses.movements') return { tag: 'invalid_movement', audit: 'stock.movement_rejected' };
  return { tag: code === '23505' ? 'duplicate' : 'invalid', audit: null };
}
const CONSTRAINT_CODES = new Set(['23505', '23514', '23502', '22023', '22P02', '22007', '22008', '22003']);

interface RecordRow { collection: string; id: string; data: Json; rev: number; deleted_at: Date | null }
interface DocRow { key: string; data: unknown; rev: number }

type RecordPlan =
  | { kind: 'insert' | 'restore'; c: RecordChangeDto; data: Json; fields: string[] }
  | { kind: 'update'; c: RecordChangeDto; row: RecordRow; data: Json; fields: string[]; set: Json; unset: string[]; overwrote: string[] }
  | { kind: 'delete'; c: RecordChangeDto; row: RecordRow }
  | { kind: 'noop'; c: RecordChangeDto; rev: number }
  | { kind: 'conflict'; c: RecordChangeDto; reason: string; fields?: string[]; row: RecordRow | null };

/** TypeORM/postgres: UPDATE/DELETE ... RETURNING بترجع [rows, count]، و INSERT بترجع rows */
const firstRow = <T>(res: unknown): T => (Array.isArray(res) && Array.isArray(res[0]) ? res[0][0] : (res as T[])[0]) as T;
const isStructured = (v: unknown) => v !== null && typeof v === 'object';
const setPath = (o: Json, path: string, v: unknown) => {
  const [a, b] = path.split('.');
  if (b === undefined) o[a] = v;
  else { if (!o[a] || typeof o[a] !== 'object') o[a] = {}; (o[a] as Json)[b] = v; }
};

@Injectable()
export class DataService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  // =============================== bootstrap ===============================

  async bootstrap(user: AuthUser): Promise<Omit<BootstrapDto, 'me'>> {
    const qr = this.ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction('REPEATABLE READ'); // لقطة واحدة متسقة: seq + السجلات + الـ docs
    try {
      const [{ seq }] = await qr.query(`SELECT COALESCE(MAX(seq), 0)::bigint AS seq FROM changes`);
      const records: { collection: string; id: string; data: Json; rev: number }[] = await qr.query(
        `SELECT collection, id, data, rev FROM legacy_records WHERE deleted_at IS NULL ORDER BY collection, created_at, id`,
      );
      const docs: DocRow[] = await qr.query(`SELECT key, data, rev FROM docs`);
      const audit = this.canSeeAudit(user)
        ? await qr.query(`SELECT id, at, user_id, username, action, entity, entity_id, details FROM audit_log ORDER BY id DESC LIMIT ${AUDIT_BOOTSTRAP_LIMIT}`)
        : [];
      await qr.commitTransaction();

      const data: Json = { ledger: {}, clients: {}, warehouses: {} };
      const revs: Record<string, Record<string, number>> = {};
      const hidden: string[] = [];
      const writable: Record<string, WriteAccessDto> = {};
      const hiddenFieldsMap: Record<string, string[]> = {};
      const readable = new Map<string, string[]>(); // path → حقول مخفية

      for (const [path, kind] of Object.entries(COLLECTIONS_MAP)) {
        if (kind !== 'collection') continue;
        setPath(data, path, []);
        if (!canRead(user, path)) { hidden.push(path); continue; }
        const hf = hiddenFields(user, path);
        readable.set(path, hf);
        if (hf.length) hiddenFieldsMap[path] = hf;
        revs[path] = {};
        writable[path] = { add: canWrite(user, path, 'add'), edit: canWrite(user, path, 'edit'), delete: canWrite(user, path, 'delete') };
      }
      for (const r of records) {
        const hf = readable.get(r.collection);
        if (!hf || !inProjectScope(user, r.collection, r.data)) continue;
        const [a, b] = r.collection.split('.');
        const arr = (b === undefined ? data[a] : (data[a] as Json)[b]) as unknown[];
        arr.push(stripHidden(r.data, hf));
        revs[r.collection][r.id] = r.rev;
      }
      const docRevs: Record<string, number> = {};
      for (const d of docs) {
        const kind = COLLECTIONS_MAP[d.key];
        if (kind !== 'doc' && kind !== 'lookup' && kind !== 'meta-flag') continue;
        if (SERVER_OWNED_DOCS.has(d.key)) continue;
        setPath(data, d.key, d.data);
        docRevs[d.key] = d.rev;
      }
      data.schemaVersion = LEGACY_SCHEMA_VERSION;
      data.users = []; // إدارة المستخدمين من /api/users
      data.auditLog = audit.map((a: { id: string; at: Date; username: string | null; action: string; entity: string | null; entity_id: string | null; details: Json | null }) =>
        a.action === 'ui' && a.details
          ? { id: a.entity_id ?? String(a.id), at: (a.details.clientAt as string) || new Date(a.at).toISOString(), action: a.details.action ?? '', details: a.details.details ?? '', user: a.username ?? '' }
          : { id: `srv_${a.id}`, at: new Date(a.at).toISOString(), action: a.action, details: a.details ? JSON.stringify(a.details) : '', user: a.username ?? '' });

      return {
        seq: Number(seq), schemaVersion: LEGACY_SCHEMA_VERSION, data,
        meta: { revs, docRevs, hidden, writable, docsWritable: isAnyEditor(user) && !!user.permissions.editData, hiddenFields: hiddenFieldsMap, catalog: { ...COLLECTIONS_MAP } },
      };
    } catch (e) {
      if (qr.isTransactionActive) await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  private canSeeAudit(user: AuthUser): boolean {
    return user.role === 'admin' || user.permissions.manageUsers || hasPagePermission(user.permissions, 'backup', 'view');
  }

  // =============================== sync ===============================

  /**
   * opts.trusted: للاستدعاء الداخلي بس (مثلًا الترحيل الآلي لتسوية اتعتمدت بالكامل — B-51) — بيتخطّى صلاحية الصفحة
   * لأن التفويض جه من مسار الاعتماد، **لكن كل قيود قاعدة البيانات (B-50) بتفضل سارية**. مش متاح من أي controller.
   */
  async sync(user: AuthUser, body: SyncRequestDto, opts: { trusted?: boolean } = {}): Promise<SyncResponseDto> {
    const changes = body.changes ?? [];
    const docChanges = body.docs ?? [];
    this.validateShape(changes, docChanges);

    const qr = this.ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction('READ COMMITTED');
    try {
      await qr.query(`SELECT pg_advisory_xact_lock($1)`, [WRITE_LOCK_KEY]);
      const recordChanges = changes.filter((c) => c.collection !== 'auditLog');
      const auditChanges = changes.filter((c) => c.collection === 'auditLog');

      // ---- المرحلة 1: تحميل + خطة + صلاحيات (أي رفض = 403 والـ batch كله بيترجع) ----
      const rows = await this.lockRecords(qr, recordChanges);
      const plans: RecordPlan[] = [];
      const forbidden: { collection: string; id: string; reason: string }[] = [];
      for (const c of recordChanges) {
        const row = rows.get(`${c.collection}\u0000${c.id}`) ?? null;
        const live = row && !row.deleted_at ? row : null;
        const action: WriteAction = c.op === 'delete' ? 'delete' : live ? 'edit' : 'add';
        const reason = opts.trusted ? null : this.authorize(user, c, action, live);
        if (reason) { forbidden.push({ collection: c.collection, id: c.id, reason }); continue; }
        const plan = await this.planRecord(qr, user, c, row);
        if (plan.kind === 'insert' || plan.kind === 'restore' || plan.kind === 'update') {
          if (!opts.trusted && !inProjectScope(user, c.collection, plan.data)) { forbidden.push({ collection: c.collection, id: c.id, reason: 'OUT_OF_PROJECT_SCOPE' }); continue; }
          if (Buffer.byteLength(JSON.stringify(plan.data)) > MAX_RECORD_BYTES) throw new BadRequestException(`السجل ${c.collection}/${c.id} أكبر من الحد المسموح`);
        }
        plans.push(plan);
      }
      const docRows = await this.lockDocs(qr, docChanges);
      const docPlans: DocPlan[] = [];
      for (const d of docChanges) {
        if (SERVER_OWNED_DOCS.has(d.key)) { docPlans.push({ kind: 'ignored', d }); continue; }
        if (!canWrite(user, d.key, 'edit')) { forbidden.push({ collection: '$doc', id: d.key, reason: 'FORBIDDEN' }); continue; }
        docPlans.push(await this.planDoc(qr, d, docRows.get(d.key) ?? null));
      }
      if (forbidden.length) {
        throw new ForbiddenException({ statusCode: 403, code: forbidden.some((f) => f.reason === 'FIELD_FORBIDDEN') ? 'FIELD_FORBIDDEN' : 'FORBIDDEN', message: 'مالكش صلاحية لبعض التعديلات — مفيش حاجة اتحفظت', details: forbidden.slice(0, 50) });
      }

      // ---- المرحلة 2: تطبيق ----
      const applied: AppliedRecordDto[] = [];
      const conflicts: ConflictRecordDto[] = [];
      for (const p of plans) {
        const r = await this.applyRecord(qr, user, p);
        if ('reason' in r) conflicts.push(r); else applied.push(r);
      }
      for (const c of auditChanges) applied.push(await this.applyAudit(qr, user, c));
      const docsApplied: AppliedDocDto[] = [];
      const docConflicts: ConflictDocDto[] = [];
      for (const p of docPlans) {
        const r = await this.applyDoc(qr, user, p);
        if ('reason' in r) docConflicts.push(r); else docsApplied.push(r);
      }
      const [{ seq }] = await qr.query(`SELECT COALESCE(MAX(seq), 0)::bigint AS seq FROM changes`);
      await qr.commitTransaction();
      return { seq: Number(seq), applied, conflicts, docsApplied, docConflicts };
    } catch (e) {
      if (qr.isTransactionActive) await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  private validateShape(changes: RecordChangeDto[], docs: DocChangeDto[]) {
    const errors: string[] = [];
    const seen = new Set<string>();
    for (const c of changes) {
      const kind = COLLECTIONS_MAP[c.collection];
      if (c.collection === 'users') errors.push('users: إدارة المستخدمين من /api/users');
      else if (kind !== 'collection' && c.collection !== 'auditLog') errors.push(`${c.collection}: collection غير معروفة (UNKNOWN_COLLECTION)`);
      if (c.op === 'upsert' && !c.set && !c.unset?.length) errors.push(`${c.collection}/${c.id}: upsert من غير set/unset`);
      if (c.set && 'id' in c.set && String(c.set.id) !== c.id) errors.push(`${c.collection}/${c.id}: set.id مختلف عن id`);
      for (const k of Object.keys(c.set ?? {})) if (!FIELD_RE.test(k)) errors.push(`${c.collection}/${c.id}: اسم حقل ممنوع`);
      const key = `${c.collection}\u0000${c.id}`;
      if (seen.has(key)) errors.push(`${c.collection}/${c.id}: مكرر في نفس الطلب`);
      seen.add(key);
    }
    const seenDocs = new Set<string>();
    for (const d of docs) {
      const kind = COLLECTIONS_MAP[d.key];
      if (kind !== 'doc' && kind !== 'lookup' && kind !== 'meta-flag') errors.push(`${d.key}: doc غير معروف (UNKNOWN_DOC)`);
      if (d.op === 'set' && d.value === undefined) errors.push(`${d.key}: set من غير value`);
      if (d.op === 'patch' && !d.set && !d.unset?.length) errors.push(`${d.key}: patch من غير set/unset`);
      if (d.op === 'arrayDelta' && !d.add?.length && !d.remove?.length) errors.push(`${d.key}: arrayDelta فاضي`);
      if (seenDocs.has(d.key)) errors.push(`${d.key}: مكرر في نفس الطلب`);
      seenDocs.add(d.key);
    }
    if (errors.length) throw new BadRequestException({ statusCode: 400, code: 'INVALID_SYNC', message: errors.slice(0, 50) });
  }

  /** صلاحية الصفحة/العلم + الحقول المحمية + نطاق المشروع للنسخة الحالية — يرجّع سبب الرفض أو null */
  private authorize(user: AuthUser, c: RecordChangeDto, action: WriteAction, live: RecordRow | null): string | null {
    if (!canWrite(user, c.collection, action)) return 'FORBIDDEN';
    const hf = hiddenFields(user, c.collection);
    if (hf.length && [...Object.keys(c.set ?? {}), ...(c.unset ?? [])].some((f) => hf.includes(f))) return 'FIELD_FORBIDDEN';
    if (live && !inProjectScope(user, c.collection, live.data)) return 'OUT_OF_PROJECT_SCOPE';
    return null;
  }

  private async lockRecords(qr: QueryRunner, changes: RecordChangeDto[]): Promise<Map<string, RecordRow>> {
    const map = new Map<string, RecordRow>();
    if (!changes.length) return map;
    const moved = await this.cutoverSet(qr);
    const legacy = changes.filter((c) => !moved.has(c.collection));
    const rel = changes.filter((c) => moved.has(c.collection));
    const rows: RecordRow[] = legacy.length ? await qr.query(
      `SELECT r.collection, r.id, r.data, r.rev, r.deleted_at FROM records r
       JOIN unnest($1::text[], $2::text[]) AS k(collection, id) ON r.collection = k.collection AND r.id = k.id
       ORDER BY r.collection, r.id FOR UPDATE OF r`, [legacy.map((c) => c.collection), legacy.map((c) => c.id)],
    ) : [];
    // المجموعات المنقولة: قفل صفوف الجدول نفسه، والقراءة بالشكل القديم من الـ view
    for (const c of rel) await qr.query(`SELECT 1 FROM ${RELATIONAL_WRITERS[c.collection].table} WHERE id = $1 FOR UPDATE`, [c.id]);
    if (rel.length) rows.push(...await qr.query(
      `SELECT r.collection, r.id, r.data, r.rev, r.deleted_at FROM legacy_records r
       JOIN unnest($1::text[], $2::text[]) AS k(collection, id) ON r.collection = k.collection AND r.id = k.id`, [rel.map((c) => c.collection), rel.map((c) => c.id)]));
    for (const r of rows) map.set(`${r.collection}\u0000${r.id}`, r);
    return map;
  }

  /** المجموعات اللي اتنقلت للجداول العلائقية (module_cutover) — بتتقرا جوه نفس المعاملة */
  private async cutoverSet(qr: QueryRunner): Promise<Set<string>> {
    return new Set((await qr.query(`SELECT collection FROM module_cutover`)).map((r: { collection: string }) => r.collection));
  }

  /** الكتابة على الجدول العلائقي للمجموعة المنقولة. رفض قيد ← null (التعارض بيترجع للعميل) والمعاملة بتكمل */
  private async writeRelational(qr: QueryRunner, p: RecordPlan & { kind: 'insert' | 'restore' | 'update' | 'delete' }): Promise<number | { error: string; raw: string }> {
    const w = RELATIONAL_WRITERS[p.c.collection];
    await qr.query(`SAVEPOINT rel_write`);
    try {
      const rev = p.kind === 'delete'
        ? firstRow<{ row_version: number }>(await qr.query(`UPDATE ${w.table} SET deleted_at = now(), row_version = row_version + 1, updated_at = now() WHERE id = $1 RETURNING row_version`, [p.c.id])).row_version
        : (await qr.query(`SELECT ${w.fn}($1, $2::jsonb) AS v`, [p.c.id, JSON.stringify(p.data)]))[0].v;
      await qr.query(`RELEASE SAVEPOINT rel_write`);
      return Number(rev);
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      if (!CONSTRAINT_CODES.has(code)) throw e;
      await qr.query(`ROLLBACK TO SAVEPOINT rel_write`);
      const raw = (e as Error).message;
      const msg = String((e as { constraint?: string }).constraint && !/^(NEGATIVE_STOCK|ITEM_HAS_MOVEMENTS)/.test(raw) ? (e as { constraint?: string }).constraint : raw);
      return { error: `${constraintTag(p.c.collection, raw, code).tag}:${msg}`, raw };
    }
  }

  /** B-50 §6: المحاولة المرفوضة على المخازن بتتسجّل في التدقيق (في نفس المعاملة اللي بتكمل) */
  private async auditRejected(qr: QueryRunner, user: AuthUser, c: RecordChangeDto, p: RecordPlan, msg: string, code: string) {
    const action = constraintTag(c.collection, msg, code).audit;
    if (!action) return;
    await qr.query(`INSERT INTO audit_log (user_id, username, action, entity, entity_id, details) VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [user.id, user.username, action, c.collection, c.id, JSON.stringify({ op: c.op, reason: msg, attempted: c.op === 'delete' ? null : (p as { data?: Json }).data ?? null })]);
  }

  /** الحقول اللي اتغيّرت في السجل بعد baseRev (من changes) */
  private async touchedSince(qr: QueryRunner, collection: string, id: string, baseRev: number): Promise<Set<string>> {
    const rows: { fields: string[] }[] = await qr.query(`SELECT fields FROM changes WHERE collection = $1 AND record_id = $2 AND rev > $3`, [collection, id, baseRev]);
    return new Set(rows.flatMap((r) => r.fields));
  }

  private async planRecord(qr: QueryRunner, user: AuthUser, c: RecordChangeDto, row: RecordRow | null): Promise<RecordPlan> {
    const clean = (o: Json | undefined) => { const x = { ...(o ?? {}) }; delete x._rev; return x; };
    if (c.op === 'delete') {
      if (!row || row.deleted_at) return { kind: 'noop', c, rev: row?.rev ?? 0 };
      if (c.baseRev !== row.rev) return { kind: 'conflict', c, reason: 'changed_since', row };
      return { kind: 'delete', c, row };
    }
    const set = clean(c.set);
    const unset = (c.unset ?? []).filter((f) => f !== 'id');
    if (!row || (row.deleted_at && c.baseRev === 0)) {
      const data: Json = { ...set, id: c.id };
      for (const f of unset) delete data[f];
      await this.fillGuardedDefaults(qr, user, c.collection, data);
      return { kind: row ? 'restore' : 'insert', c, data, fields: Object.keys(data) };
    }
    if (row.deleted_at) return { kind: 'conflict', c, reason: 'deleted', row };
    if (c.baseRev > row.rev) return { kind: 'conflict', c, reason: 'bad_rev', row };

    let touched = new Set<string>();
    if (c.baseRev < row.rev) {
      touched = await this.touchedSince(qr, c.collection, c.id, c.baseRev);
      if (c.baseRev === 0) Object.keys(row.data).forEach((k) => touched.add(k)); // العميل فاكره جديد وهو موجود: كل الحقول تعتبر متغيّرة
    }
    const data: Json = { ...row.data };
    const fields: string[] = [];
    const overwrote: string[] = [];
    const conflicted: string[] = [];
    const appliedSet: Json = {};
    const appliedUnset: string[] = [];
    const consider = (f: string, next: unknown, isUnset: boolean) => {
      const cur = row.data[f];
      if (isUnset ? !(f in row.data) : isDeepStrictEqual(cur, next)) return; // مفيش تغيير فعلي
      if (touched.has(f)) {
        if (isFinancialField(c.collection, f) || isStructured(cur) || isStructured(next)) { conflicted.push(f); return; }
        overwrote.push(f);
      }
      fields.push(f);
      if (isUnset) { delete data[f]; appliedUnset.push(f); } else { data[f] = next; appliedSet[f] = next; }
    };
    for (const [f, v] of Object.entries(set)) if (f !== 'id') consider(f, v, false);
    for (const f of unset) consider(f, undefined, true);
    if (conflicted.length) return { kind: 'conflict', c, reason: 'field_conflict', fields: conflicted, row };
    if (!fields.length) return { kind: 'noop', c, rev: row.rev };
    return { kind: 'update', c, row, data, fields, set: appliedSet, unset: appliedUnset, overwrote };
  }

  /** لو المستخدم مش شايف الحقول المحمية: قيم افتراضية من السيرفر (يومية العامل = أجره المسجّل) */
  private async fillGuardedDefaults(qr: QueryRunner, user: AuthUser, collection: string, data: Json) {
    if (collection !== 'workerAttendance' || data.dayWage !== undefined) return;
    if (!hiddenFields(user, collection).includes('dayWage')) return;
    const personId = (data.personId ?? data.workerId) as string | undefined;
    if (!personId) return;
    const kind = String(data.personKind ?? data.personType ?? 'worker');
    const coll = kind === 'supervisor' ? 'supervisors' : kind === 'driver' ? 'drivers' : 'workers';
    const [p] = await qr.query(`SELECT data->'dailyWage' AS w FROM records WHERE collection = $1 AND id = $2 AND deleted_at IS NULL`, [coll, personId]);
    if (p && typeof p.w === 'number') data.dayWage = p.w;
  }

  private async applyRecord(qr: QueryRunner, user: AuthUser, p: RecordPlan): Promise<AppliedRecordDto | ConflictRecordDto> {
    const { c } = p;
    if (p.kind === 'conflict') {
      const current = p.row && !p.row.deleted_at ? { rev: p.row.rev, data: stripHidden(p.row.data, hiddenFields(user, c.collection)) } : null;
      return { collection: c.collection, id: c.id, reason: p.reason, fields: p.fields, current };
    }
    if (p.kind === 'noop') return { collection: c.collection, id: c.id, rev: p.rev, op: 'noop' };
    const pid = (d: Json) => projectIdsOf(c.collection, d)[0] ?? null;
    let rev: number;
    let op: 'insert' | 'update' | 'delete';
    let diff: Json;
    let fields: string[];
    const moved = RELATIONAL_WRITERS[c.collection] && (await this.cutoverSet(qr)).has(c.collection);
    if (moved) {
      const r = await this.writeRelational(qr, p);
      if (typeof r !== 'number') {
        await this.auditRejected(qr, user, c, p, r.raw, '23514');
        const row = 'row' in p ? p.row : null;
        const current = row && !row.deleted_at ? { rev: row.rev, data: stripHidden(row.data, hiddenFields(user, c.collection)) } : null;
        return { collection: c.collection, id: c.id, reason: 'constraint', fields: [r.error], current };
      }
      rev = r;
      if (p.kind === 'insert' || p.kind === 'restore') { op = 'insert'; diff = p.kind === 'restore' ? { set: p.data, restored: true } : { set: p.data }; fields = p.fields; }
      else if (p.kind === 'update') { op = 'update'; fields = p.fields; diff = { set: p.set, ...(p.unset.length ? { unset: p.unset } : {}), ...(p.overwrote.length ? { overwrote: p.overwrote } : {}), before: pickBefore(p.row.data, p.fields) }; }
      else { op = 'delete'; diff = { before: capBefore((p as { row: RecordRow }).row.data) }; fields = []; }
    } else {
      const guarded = GUARDED_COLLECTIONS.has(c.collection);
      if (guarded) await qr.query(`SAVEPOINT guarded_write`);
      try {
    if (p.kind === 'insert') {
      await qr.query(`INSERT INTO records (collection, id, data, rev, project_id, created_by, updated_by, created_at) VALUES ($1, $2, $3::jsonb, 1, $4, $5, $5, clock_timestamp())`, [c.collection, c.id, JSON.stringify(p.data), pid(p.data), user.id]);
      rev = 1; op = 'insert'; diff = { set: p.data }; fields = p.fields;
    } else if (p.kind === 'restore') {
      const r = firstRow<{ rev: number }>(await qr.query(`UPDATE records SET data = $3::jsonb, rev = rev + 1, deleted_at = NULL, project_id = $4, updated_by = $5, updated_at = now(), created_at = clock_timestamp() WHERE collection = $1 AND id = $2 RETURNING rev`, [c.collection, c.id, JSON.stringify(p.data), pid(p.data), user.id]));
      rev = r.rev; op = 'insert'; diff = { set: p.data, restored: true }; fields = p.fields;
    } else if (p.kind === 'update') {
      const r = firstRow<{ rev: number }>(await qr.query(`UPDATE records SET data = $3::jsonb, rev = rev + 1, project_id = $4, updated_by = $5, updated_at = now() WHERE collection = $1 AND id = $2 RETURNING rev`, [c.collection, c.id, JSON.stringify(p.data), pid(p.data), user.id]));
      rev = r.rev; op = 'update'; fields = p.fields;
      diff = { set: p.set, ...(p.unset.length ? { unset: p.unset } : {}), ...(p.overwrote.length ? { overwrote: p.overwrote } : {}), before: pickBefore(p.row.data, p.fields) };
    } else {
      const r = firstRow<{ rev: number }>(await qr.query(`UPDATE records SET deleted_at = now(), rev = rev + 1, updated_by = $3, updated_at = now() WHERE collection = $1 AND id = $2 RETURNING rev`, [c.collection, c.id, user.id]));
      rev = r.rev; op = 'delete'; diff = { before: capBefore((p as { row: RecordRow }).row.data) }; fields = [];
    }
      if (guarded) await qr.query(`RELEASE SAVEPOINT guarded_write`);
      } catch (e) {
        const code = (e as { code?: string }).code ?? '';
        if (!guarded || code !== '23514') throw e;
        await qr.query(`ROLLBACK TO SAVEPOINT guarded_write`);
        const msg = (e as Error).message;
        await this.auditRejected(qr, user, c, p, msg, code);
        const row = 'row' in p ? (p as { row: RecordRow }).row : null;
        const current = row && !row.deleted_at ? { rev: row.rev, data: stripHidden(row.data, hiddenFields(user, c.collection)) } : null;
        return { collection: c.collection, id: c.id, reason: 'constraint', fields: [`${constraintTag(c.collection, msg, code).tag}:${msg}`], current };
      }
    }
    await qr.query(`INSERT INTO changes (collection, record_id, op, rev, user_id, fields, diff) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`, [c.collection, c.id, op, rev, user.id, fields, JSON.stringify(diff)]);
    const merged = p.kind === 'update' && c.baseRev < p.row.rev; // حد تاني عدّل بعد baseRev → رجّع النسخة المدموجة
    return {
      collection: c.collection, id: c.id, rev, op,
      ...(p.kind === 'update' && p.overwrote.length ? { overwrote: p.overwrote } : {}),
      ...(merged ? { data: stripHidden(p.data, hiddenFields(user, c.collection)) } : {}),
    };
  }

  /** سجل الواجهة القديمة (DATA.auditLog): إلحاق بس — المستخدم من السيرفر، والتعديل/الحذف (القص لـ 3000) بيتجاهل */
  private async applyAudit(qr: QueryRunner, user: AuthUser, c: RecordChangeDto): Promise<AppliedRecordDto> {
    if (c.op !== 'upsert' || c.baseRev !== 0 || !c.set) return { collection: 'auditLog', id: c.id, rev: 0, op: 'ignored' };
    const [exists] = await qr.query(`SELECT 1 FROM audit_log WHERE action = 'ui' AND entity = 'ui' AND entity_id = $1 LIMIT 1`, [c.id]);
    if (exists) return { collection: 'auditLog', id: c.id, rev: 1, op: 'noop' };
    const s = c.set;
    const details = { action: String(s.action ?? '').slice(0, 500), details: String(s.details ?? '').slice(0, 4000), clientAt: typeof s.at === 'string' ? s.at.slice(0, 40) : null };
    await qr.query(`INSERT INTO audit_log (user_id, username, action, entity, entity_id, details) VALUES ($1, $2, 'ui', 'ui', $3, $4::jsonb)`, [user.id, user.username, c.id, JSON.stringify(details)]);
    return { collection: 'auditLog', id: c.id, rev: 1, op: 'insert' };
  }

  // ---------------- docs ----------------

  private async lockDocs(qr: QueryRunner, docs: DocChangeDto[]): Promise<Map<string, DocRow>> {
    const map = new Map<string, DocRow>();
    if (!docs.length) return map;
    const rows: DocRow[] = await qr.query(`SELECT key, data, rev FROM docs WHERE key = ANY($1::text[]) ORDER BY key FOR UPDATE`, [docs.map((d) => d.key)]);
    for (const r of rows) map.set(r.key, r);
    return map;
  }

  private async planDoc(qr: QueryRunner, d: DocChangeDto, row: DocRow | null): Promise<DocPlan> {
    const cur = row?.data;
    const rev = row?.rev ?? 0;
    if (d.baseRev > rev) return { kind: 'conflict', d, reason: 'bad_rev', row };
    const stale = d.baseRev < rev;
    if (d.op === 'arrayDelta') {
      // دمج تبادلي: إضافة/حذف عناصر — مفيش تعارض مهما كان baseRev
      const base = Array.isArray(cur) ? cur : [];
      let next = base.filter((x) => !(d.remove ?? []).some((r) => isDeepStrictEqual(r, x)));
      for (const a of d.add ?? []) if (!next.some((x) => isDeepStrictEqual(x, a))) next = [...next, a];
      if (isDeepStrictEqual(next, cur)) return { kind: 'noop', d, rev };
      return { kind: 'write', d, row, value: next, fields: ['*'], diff: { add: d.add ?? [], remove: d.remove ?? [] }, overwrote: [] };
    }
    if (d.op === 'set') {
      if (isDeepStrictEqual(cur, d.value)) return { kind: 'noop', d, rev };
      if (stale) return { kind: 'conflict', d, reason: 'changed_since', row };
      return { kind: 'write', d, row, value: d.value, fields: ['*'], diff: { set: d.value }, overwrote: [] };
    }
    // patch على كائن
    if (cur !== undefined && (cur === null || typeof cur !== 'object' || Array.isArray(cur))) throw new BadRequestException(`${d.key}: patch على قيمة مش كائن`);
    const base = (cur ?? {}) as Json;
    const touched = stale ? await this.touchedSince(qr, DOC_COLLECTION, d.key, d.baseRev) : new Set<string>();
    const whole = touched.has('*');
    const next: Json = { ...base };
    const fields: string[] = [];
    const overwrote: string[] = [];
    const conflicted: string[] = [];
    const consider = (f: string, v: unknown, isUnset: boolean) => {
      if (isUnset ? !(f in base) : isDeepStrictEqual(base[f], v)) return;
      if (whole || touched.has(f)) {
        if (isFinancialField(d.key, f) || isStructured(base[f]) || isStructured(v)) { conflicted.push(f); return; }
        overwrote.push(f);
      }
      fields.push(f);
      if (isUnset) delete next[f]; else next[f] = v;
    };
    for (const [f, v] of Object.entries(d.set ?? {})) consider(f, v, false);
    for (const f of d.unset ?? []) consider(f, undefined, true);
    if (conflicted.length) return { kind: 'conflict', d, reason: 'field_conflict', fields: conflicted, row };
    if (!fields.length) return { kind: 'noop', d, rev };
    return { kind: 'write', d, row, value: next, fields, diff: { set: d.set ?? {}, ...(d.unset?.length ? { unset: d.unset } : {}) }, overwrote };
  }

  private async applyDoc(qr: QueryRunner, user: AuthUser, p: DocPlan): Promise<AppliedDocDto | ConflictDocDto> {
    const { d } = p;
    if (p.kind === 'ignored') return { key: d.key, rev: 0, op: 'ignored' };
    if (p.kind === 'noop') return { key: d.key, rev: p.rev, op: 'noop' };
    if (p.kind === 'conflict') return { key: d.key, reason: p.reason, fields: p.fields, current: p.row ? { rev: p.row.rev, data: p.row.data } : null };
    // jsonb كنص: node-pg بيحوّل مصفوفات JS لمصفوفات postgres مش JSON
    const r = firstRow<{ rev: number }>(await qr.query(
      `INSERT INTO docs (key, data, rev, updated_by) VALUES ($1, $2::jsonb, 1, $3)
       ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, rev = docs.rev + 1, updated_by = EXCLUDED.updated_by, updated_at = now()
       RETURNING rev`, [d.key, JSON.stringify(p.value), user.id],
    ));
    await qr.query(`INSERT INTO changes (collection, record_id, op, rev, user_id, fields, diff) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [DOC_COLLECTION, d.key, p.row ? 'update' : 'insert', r.rev, user.id, p.fields, JSON.stringify({ ...p.diff, ...(p.overwrote.length ? { overwrote: p.overwrote } : {}), ...docBefore(d, p.row, p.fields) })]);
    const merged = d.op === 'arrayDelta' || (p.row !== null && d.baseRev < p.row.rev);
    return { key: d.key, rev: r.rev, op: d.op, ...(p.overwrote.length ? { overwrote: p.overwrote } : {}), ...(merged ? { data: p.value } : {}) };
  }

  // =============================== catch-up ===============================

  /** التغييرات بعد seq معيّن (بعد إعادة الاتصال) — بالحالة الحالية لكل سجل، مفلترة بصلاحيات المستخدم */
  async changesSince(user: AuthUser, since: number, limit = 1000) {
    const rows = await this.loadChangeRows(`c.seq > $1 ORDER BY c.seq LIMIT ${Math.min(limit, 5000) + 1}`, [since]);
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    return { seq: page.length ? Number(page[page.length - 1].seq) : since, hasMore, changes: this.toEvents(page, user) };
  }

  async loadChangeRows(where: string, params: unknown[]): Promise<ChangeRow[]> {
    return this.ds.query(
      `SELECT c.seq, c.collection, c.record_id, c.op, r.data AS r_data, r.rev AS r_rev, r.deleted_at AS r_deleted, d.data AS d_data, d.rev AS d_rev
       FROM changes c
       LEFT JOIN legacy_records r ON c.collection <> '${DOC_COLLECTION}' AND r.collection = c.collection AND r.id = c.record_id
       LEFT JOIN docs d ON c.collection = '${DOC_COLLECTION}' AND d.key = c.record_id
       WHERE ${where}`, params,
    );
  }

  /** تحويل صفوف changes لأحداث مفلترة لمستخدم (الحالة الحالية، مع إخفاء الحقول المحمية ونطاق المشاريع) */
  toEvents(rows: ChangeRow[], user: AuthUser): ChangeEventDto[] {
    const out: ChangeEventDto[] = [];
    for (const r of rows) {
      if (r.collection === DOC_COLLECTION) {
        if (SERVER_OWNED_DOCS.has(r.record_id) || !canRead(user, r.record_id)) continue;
        out.push({ seq: Number(r.seq), kind: 'doc', collection: r.record_id, id: r.record_id, op: 'upsert', rev: r.d_rev ?? 0, data: r.d_data ?? null });
        continue;
      }
      if (!r.r_data || !canRead(user, r.collection) || !inProjectScope(user, r.collection, r.r_data)) continue;
      const deleted = !!r.r_deleted;
      out.push({
        seq: Number(r.seq), kind: 'record', collection: r.collection, id: r.record_id, op: deleted ? 'delete' : 'upsert', rev: r.r_rev ?? 0,
        data: deleted ? null : stripHidden(r.r_data, hiddenFields(user, r.collection)),
      });
    }
    return out;
  }
}

export interface ChangeRow {
  seq: string; collection: string; record_id: string; op: string;
  r_data: Json | null; r_rev: number | null; r_deleted: Date | null; d_data: unknown; d_rev: number | null;
}

type DocPlan =
  | { kind: 'ignored'; d: DocChangeDto }
  | { kind: 'noop'; d: DocChangeDto; rev: number }
  | { kind: 'conflict'; d: DocChangeDto; reason: string; fields?: string[]; row: DocRow | null }
  | { kind: 'write'; d: DocChangeDto; row: DocRow | null; value: unknown; fields: string[]; diff: Json; overwrote: string[] };

/**
 * سجل التدقيق (المرحلة 2 — S-6): القيمة السابقة لكل تعديل/حذف بتتحفظ في changes.diff.before
 * (الجدول إلحاق فقط على مستوى القاعدة — migration AuditProtection). القيم الكبيرة جدًا بتتسجل كبصمة بس.
 */
const BEFORE_MAX_BYTES = 256 * 1024;
function capBefore(v: unknown): unknown {
  const txt = JSON.stringify(v ?? null);
  if (txt.length <= BEFORE_MAX_BYTES) return v ?? null;
  return { truncated: true, bytes: txt.length, sha256: createHash('sha256').update(txt).digest('hex') };
}
function pickBefore(data: Json, fields: string[]): unknown {
  const out: Json = {};
  for (const f of fields) out[f] = f in data ? data[f] : null;
  return capBefore(out);
}
function docBefore(d: DocChangeDto, row: DocRow | null, fields: string[]): Json {
  if (!row) return {};
  if (d.op === 'patch') return { before: pickBefore((row.data ?? {}) as Json, fields) };
  if (d.op === 'set') return { before: capBefore(row.data) };
  return {}; // arrayDelta: add/remove نفسها قابلة للعكس
}
