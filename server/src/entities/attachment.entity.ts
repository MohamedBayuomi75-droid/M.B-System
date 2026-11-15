import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** المرفقات (A5) — الملف نفسه في S3/MinIO، هنا الـ metadata وربطه بالسجل المالك للتحقق من الصلاحية. */
@Entity({ name: 'attachments' })
@Check('ck_attachments_size', `"size_bytes" >= 0`)
@Index('ix_attachments_owner', ['ownerCollection', 'ownerId'])
export class AttachmentEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'owner_collection', type: 'text', nullable: true }) ownerCollection: string | null;
  @Column({ name: 'owner_id', type: 'text', nullable: true }) ownerId: string | null;
  @Column({ name: 'storage_key', type: 'text', unique: true }) storageKey: string;
  @Column({ type: 'text' }) filename: string;
  @Column({ type: 'text' }) mime: string;
  @Column({ name: 'size_bytes', type: 'bigint' }) sizeBytes: string;
  @Column({ type: 'text', nullable: true }) sha256: string | null;
  /** filePath القديم في الديسكتوب (للترحيل A7) */
  @Column({ name: 'legacy_path', type: 'text', nullable: true }) legacyPath: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'created_by', type: 'uuid', nullable: true }) createdBy: string | null;
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt: Date | null;
}
