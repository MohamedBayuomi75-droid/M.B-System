import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** سجل المراجعة (بديل DATA.auditLog) — إلحاق فقط. */
@Entity({ name: 'audit_log' })
@Index('ix_audit_log_at', ['at'])
@Index('ix_audit_log_user', ['userId', 'at'])
@Index('ix_audit_log_entity', ['entity', 'entityId'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' }) id: string;
  @CreateDateColumn({ type: 'timestamptz' }) at: Date;
  @Column({ name: 'user_id', type: 'uuid', nullable: true }) userId: string | null;
  /** نسخة من الاسم وقت الحدث (لو المستخدم اتمسح بعدين) */
  @Column({ type: 'text', nullable: true }) username: string | null;
  @Column({ type: 'text' }) action: string;
  @Column({ type: 'text', nullable: true }) entity: string | null;
  @Column({ name: 'entity_id', type: 'text', nullable: true }) entityId: string | null;
  @Column({ type: 'jsonb', nullable: true }) details: Record<string, unknown> | null;
  @Column({ type: 'inet', nullable: true }) ip: string | null;
  @Column({ name: 'user_agent', type: 'text', nullable: true }) userAgent: string | null;
}
