import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ChangeOp = 'insert' | 'update' | 'delete';

/** سجل التغييرات المتسلسل (seq) — مصدر البث اللحظي والمزامنة التراكمية (A3). */
@Entity({ name: 'changes', comment: 'سجل تغييرات متسلسل (seq) للمزامنة والبث اللحظي' })
@Check('ck_changes_op', `"op" IN ('insert', 'update', 'delete')`)
@Index('ix_changes_record_rev', ['collection', 'recordId', 'rev'])
export class ChangeEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' }) seq: string;
  @Column({ type: 'text' }) collection: string;
  @Column({ name: 'record_id', type: 'text' }) recordId: string;
  @Column({ type: 'text' }) op: ChangeOp;
  @Column({ type: 'int' }) rev: number;
  @Column({ name: 'user_id', type: 'uuid', nullable: true }) userId: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) at: Date;
  /** أسماء الحقول (المستوى الأول) اللي التغيير لمسها — لاكتشاف التعارض على مستوى الحقل */
  @Column({ type: 'text', array: true, default: () => "'{}'" }) fields: string[];
  @Column({ type: 'jsonb', nullable: true }) diff: Record<string, unknown> | null;
}
