import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { Request } from 'express';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../auth/auth.types';
import { COLLECTIONS_MAP } from '../data/collections-map.generated';
import { canRead, canWrite, inProjectScope } from '../data/policy';
import { AttachmentDto } from './attachments.dto';
import { DEFAULT_MAX_BYTES, inspectFile } from './file-inspector';

export const maxUploadBytes = () => Math.round(Number(process.env.ATTACH_MAX_MB || 25) * 1024 * 1024) || DEFAULT_MAX_BYTES;

interface Row { id: string; owner_collection: string; owner_id: string; filename: string; kind: string; mime: string; size_bytes: string; sha256: string; created_at: Date; version: number; version_of: string | null; superseded_at: Date | null }
const toDto = (r: Row): AttachmentDto => ({ id: r.id, collection: r.owner_collection, recordId: r.owner_id, filename: r.filename, kind: r.kind, mime: r.mime, size: Number(r.size_bytes), sha256: r.sha256, createdAt: new Date(r.created_at).toISOString(), version: r.version ?? 1, versionOf: r.version_of ?? null, supersededAt: r.superseded_at ? new Date(r.superseded_at).toISOString() : null });
const COLS = 'id, owner_collection, owner_id, filename, kind, mime, size_bytes, sha256, created_at, version, version_of, superseded_at';

/**
 * المرفقات (الهيكل الأمني — المرحلة 2، S-5). الموديول الكامل وربطه بالواجهة في المرحلة 5.
 * الصلاحية دايمًا من السجل المالك: القراءة = قراءة المجموعة + نطاق المشروع؛ الرفع = تعديل المجموعة + نفس النطاق.
 */
@Injectable()
export class AttachmentsService {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly audit: AuditService) {}

  /** السجل المالك لازم يكون موجود ومش محذوف وفي نطاق المستخدم — وإلا 404 (مانكشفش وجوده) */
  private async ownerOrThrow(user: AuthUser, collection: string, recordId: string, mode: 'read' | 'write') {
    if (COLLECTIONS_MAP[collection] !== 'collection') throw new BadRequestException({ statusCode: 400, code: 'BAD_OWNER', message: 'مجموعة غير صالحة للمرفقات' });
    if (!canRead(user, collection)) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: 'ليس لديك صلاحية على هذه البيانات' });
    if (mode === 'write' && !canWrite(user, collection, 'edit')) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: 'ليس لديك صلاحية تعديل هذه البيانات' });
    const [rec] = await this.ds.query(`SELECT data FROM records WHERE collection = $1 AND id = $2 AND deleted_at IS NULL`, [collection, recordId]);
    if (!rec) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'السجل غير موجود' });
    if (!inProjectScope(user, collection, rec.data)) throw new ForbiddenException({ statusCode: 403, code: 'OUT_OF_PROJECT_SCOPE', message: 'السجل خارج نطاق مشروعاتك' });
  }

  async upload(user: AuthUser, collection: string, recordId: string, file: { buffer: Buffer; originalname: string } | undefined, req: Request, replaces?: string): Promise<AttachmentDto> {
    if (!file?.buffer) throw new BadRequestException({ statusCode: 400, code: 'NO_FILE', message: 'لم يتم إرسال ملف (الحقل file)' });
    await this.ownerOrThrow(user, collection, recordId, 'write');
    // multer بيفك اسم الملف كـ latin1 — نرجّعه UTF-8 (أسماء عربية)
    const name = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const r = inspectFile(file.buffer, name, maxUploadBytes());
    if (!r.ok) {
      await this.audit.record({ action: 'attachment.rejected', userId: user.id, username: user.username, entity: collection, entityId: recordId, details: { code: r.code, size: file.buffer.length }, req });
      throw new BadRequestException({ statusCode: 400, code: r.code, message: r.message });
    }
    // إصدار جديد (المرحلة 5): نفس السجل المالك، والقديم بيتعلّم «متبدّل» ومابيتمسحش
    const row = await this.ds.transaction(async (em) => {
      let versionOf: string | null = null, version = 1;
      if (replaces) {
        const [old] = await em.query(`SELECT id, owner_collection, owner_id, version_of, superseded_at FROM attachments WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, [replaces]);
        if (!old || old.owner_collection !== collection || old.owner_id !== recordId) throw new BadRequestException({ statusCode: 400, code: 'BAD_REPLACES', message: 'المرفق المطلوب استبداله مش تابع لنفس السجل' });
        if (old.superseded_at) throw new BadRequestException({ statusCode: 400, code: 'NOT_LATEST', message: 'ده مش آخر إصدار' });
        versionOf = old.version_of ?? old.id;
        const [{ v }] = await em.query(`SELECT max(version) + 1 AS v FROM attachments WHERE coalesce(version_of, id) = $1`, [versionOf]);
        version = Number(v);
        await em.query(`UPDATE attachments SET superseded_at = now() WHERE id = $1`, [replaces]);
      }
      const [x] = await em.query(
        `INSERT INTO attachments (owner_collection, owner_id, filename, mime, size_bytes, sha256, kind, content, created_by, version_of, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING ${COLS}`,
        [collection, recordId, r.filename, r.mime, r.size, r.sha256, r.kind, file.buffer, user.id, versionOf, version]);
      return x;
    });
    await this.audit.record({ action: 'attachment.upload', userId: user.id, username: user.username, entity: collection, entityId: recordId, details: { attachmentId: row.id, filename: r.filename, kind: r.kind, size: r.size, sha256: r.sha256, version: row.version, replaces: replaces ?? null }, req });
    return toDto(row);
  }

  async list(user: AuthUser, collection: string, recordId: string, allVersions = false): Promise<AttachmentDto[]> {
    await this.ownerOrThrow(user, collection, recordId, 'read');
    const rows: Row[] = await this.ds.query(
      `SELECT ${COLS} FROM attachments
       WHERE owner_collection = $1 AND owner_id = $2 AND deleted_at IS NULL AND content IS NOT NULL AND (superseded_at IS NULL OR $3) ORDER BY created_at`, [collection, recordId, !!allVersions]);
    return rows.map(toDto);
  }

  async content(user: AuthUser, id: string, req: Request): Promise<{ meta: AttachmentDto; content: Buffer }> {
    const [row] = await this.ds.query(
      `SELECT ${COLS}, content FROM attachments
       WHERE id = $1 AND deleted_at IS NULL AND content IS NOT NULL`, [id]);
    if (!row) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'المرفق غير موجود' });
    await this.ownerOrThrow(user, row.owner_collection, row.owner_id, 'read');
    await this.audit.record({ action: 'attachment.download', userId: user.id, username: user.username, entity: row.owner_collection, entityId: row.owner_id, details: { attachmentId: row.id }, req });
    return { meta: toDto(row), content: row.content as Buffer };
  }
}
