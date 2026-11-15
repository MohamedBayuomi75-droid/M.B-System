import { Check, Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * الطبقة 1: كل سجل من مصفوفة في DATA (collection في docs/web/collections-map.json) = صف هنا.
 * المفتاح (collection, id). rev بيزيد مع كل تعديل (تحكم التعارض بـ baseRev في A3).
 */
@Entity({ name: 'records', comment: 'الطبقة 1: سجل لكل عنصر في مصفوفات DATA (docs/web/collections-map.json)' })
@Check('ck_records_rev_positive', `"rev" > 0`)
@Index('ix_records_collection_project', ['collection', 'projectId'])
@Index('ix_records_collection_live', { synchronize: false }) // جزئي: WHERE deleted_at IS NULL — في الـ migration
export class RecordEntity {
  @PrimaryColumn({ type: 'text' }) collection: string;
  @PrimaryColumn({ type: 'text' }) id: string;
  @Column({ type: 'jsonb' }) data: Record<string, unknown>;
  @Column({ type: 'int', default: 1 }) rev: number;
  /** مستخرج من data (projectId) — لفلترة نطاق المشروع على السيرفر */
  @Column({ name: 'project_id', type: 'text', nullable: true }) projectId: string | null;
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'created_by', type: 'uuid', nullable: true }) createdBy: string | null;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
  @Column({ name: 'updated_by', type: 'uuid', nullable: true }) updatedBy: string | null;
}
