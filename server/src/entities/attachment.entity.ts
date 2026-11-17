import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** المرفقات — الملف نفسه داخل PostgreSQL (ADR-007، content) + الـ metadata وربطه بالسجل المالك للتحقق من الصلاحية. */
@Entity({ name: 'attachments' })
@Check('ck_attachments_size', `"size_bytes" >= 0`)
@Check('ck_attachments_kind', `"kind" IS NULL OR "kind" IN ('pdf','jpg','png','docx','xlsx')`)
@Check('ck_attachments_stored', `"content" IS NOT NULL OR "storage_key" IS NOT NULL OR "legacy_path" IS NOT NULL`)
@Check('ck_attachments_hash', `"content" IS NULL OR "sha256" ~ '^[0-9a-f]{64}$'`)
@Index('ix_attachments_owner', ['ownerCollection', 'ownerId'])
@Check('CHK_attachments_version_min', `"version" >= 1`)
@Index('uq_attachments_version', { synchronize: false }) // فهرس فريد على (coalesce(version_of,id), version) معرّف في migration 0007
export class AttachmentEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'owner_collection', type: 'text', nullable: true }) ownerCollection: string | null;
  @Column({ name: 'owner_id', type: 'text', nullable: true }) ownerId: string | null;
  @Column({ name: 'storage_key', type: 'text', unique: true, nullable: true }) storageKey: string | null;
  /** محتوى الملف بعد الفحص — مابيتقريش إلا صراحةً (select: false) */
  @Column({ type: 'bytea', nullable: true, select: false }) content: Buffer | null;
  /** النوع الفعلي من محتوى الملف (مش الامتداد) */
  @Column({ type: 'text', nullable: true }) kind: string | null;
  @Column({ type: 'text' }) filename: string;
  @Column({ type: 'text' }) mime: string;
  @Column({ name: 'size_bytes', type: 'bigint' }) sizeBytes: string;
  @Column({ type: 'text', nullable: true }) sha256: string | null;
  /** filePath القديم في الديسكتوب (للترحيل A7) */
  @Column({ name: 'legacy_path', type: 'text', nullable: true }) legacyPath: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'created_by', type: 'uuid', nullable: true }) createdBy: string | null;
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt: Date | null;
  /** إصدارات المستند (المرحلة 5): الأصل version_of = null، والإصدارات بتشاور عليه */
  @Column({ name: 'version_of', type: 'uuid', nullable: true }) versionOf: string | null;
  @Column({ type: 'int', default: 1 }) version: number;
  @Column({ name: 'superseded_at', type: 'timestamptz', nullable: true }) supersededAt: Date | null;
}
