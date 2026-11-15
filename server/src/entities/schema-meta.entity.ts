import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** معلومات عامة عن البيانات: legacy_schema_version (9)، legacy_import (تقرير A7)، ... */
@Entity({ name: 'schema_meta' })
export class SchemaMetaEntity {
  @PrimaryColumn({ type: 'text' }) key: string;
  @Column({ type: 'jsonb' }) value: unknown;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
