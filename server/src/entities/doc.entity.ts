import { Check, Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** الطبقة 1: مفاتيح DATA من نوع doc/lookup/meta-flag (settings, customFieldDefs, formLayouts, ...) = صف واحد لكل مفتاح. */
@Entity({ name: 'docs', comment: 'الطبقة 1: مفاتيح DATA من نوع doc/lookup/meta-flag' })
@Check('ck_docs_rev_positive', `"rev" > 0`)
export class DocEntity {
  @PrimaryColumn({ type: 'text' }) key: string;
  @Column({ type: 'jsonb' }) data: unknown;
  @Column({ type: 'int', default: 1 }) rev: number;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
  @Column({ name: 'updated_by', type: 'uuid', nullable: true }) updatedBy: string | null;
}
