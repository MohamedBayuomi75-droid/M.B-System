import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export interface PagePerm { view: boolean; add: boolean; edit: boolean; delete: boolean }
export interface RolePermissions {
  editData: boolean;
  deleteData: boolean;
  manageUsers: boolean;
  pages: Record<string, PagePerm>;
}

/** قوالب الأدوار (A2: الـ seed من roles.ts — المصدر الوحيد). */
@Entity({ name: 'roles' })
export class RoleEntity {
  @PrimaryColumn({ type: 'text' }) key: string;
  @Column({ type: 'text' }) label: string;
  @Column({ type: 'jsonb', default: () => "'{}'" }) permissions: RolePermissions;
  /** أدوار النظام (seed) ماتتمسحش */
  @Column({ name: 'is_system', type: 'boolean', default: false }) isSystem: boolean;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
