import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { UserEntity } from './user.entity';

/** تخصيص صلاحيات صفحة لمستخدم معيّن فوق قالب دوره (نفس شكل pages[page] في الديسكتوب). */
@Entity({ name: 'user_permissions' })
export class UserPermissionEntity {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' }) userId: string;
  @PrimaryColumn({ type: 'text' }) page: string;
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'fk_user_permissions_user' }) user?: UserEntity;
  @Column({ name: 'can_view', type: 'boolean', default: false }) canView: boolean;
  @Column({ name: 'can_add', type: 'boolean', default: false }) canAdd: boolean;
  @Column({ name: 'can_edit', type: 'boolean', default: false }) canEdit: boolean;
  @Column({ name: 'can_delete', type: 'boolean', default: false }) canDelete: boolean;
}
