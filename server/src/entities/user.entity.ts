import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { RoleEntity } from './role.entity';

/** المستخدمين — بديل DATA.users و users.json (D-006). */
@Entity({ name: 'users' })
@Check('ck_users_password_algo', `"password_algo" IN ('argon2id', 'scrypt')`)
@Check('ck_users_scrypt_salt', `"password_algo" <> 'scrypt' OR "password_salt" IS NOT NULL`)
@Check('ck_users_username_not_blank', `length(btrim("username")) > 0`)
@Index('uq_users_username_lower', { synchronize: false }) // فهرس فريد على lower(username) معرّف في الـ migration
export class UserEntity {
  @PrimaryGeneratedColumn('uuid') id: string;

  /** id المستخدم في نسخة الديسكتوب (للترحيل في A7) */
  @Column({ name: 'legacy_id', type: 'text', nullable: true, unique: true }) legacyId: string | null;

  @Column({ type: 'text' }) username: string;
  @Column({ type: 'text', default: '' }) name: string;
  /** مفتاح قالب الدور (admin, hr, viewer, ...) — المرجع roles.key */
  @Column({ type: 'text', default: 'viewer' }) role: string;
  @ManyToOne(() => RoleEntity, { onUpdate: 'CASCADE', onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'role', referencedColumnName: 'key', foreignKeyConstraintName: 'fk_users_role' })
  roleRef?: RoleEntity;
  @Column({ type: 'boolean', default: true }) active: boolean;

  @Column({ name: 'password_algo', type: 'text' }) passwordAlgo: 'argon2id' | 'scrypt';
  @Column({ name: 'password_hash', type: 'text' }) passwordHash: string;
  /** salt لـ scrypt القديم بس (null بعد إعادة التشفير بـ argon2id) */
  @Column({ name: 'password_salt', type: 'text', nullable: true }) passwordSalt: string | null;
  @Column({ name: 'must_change_password', type: 'boolean', default: false }) mustChangePassword: boolean;
  @Column({ name: 'password_changed_at', type: 'timestamptz', nullable: true }) passwordChangedAt: Date | null;

  /** صلاحيات عامة (نفس مفاتيح الديسكتوب) */
  @Column({ name: 'can_edit_data', type: 'boolean', default: false }) canEditData: boolean;
  @Column({ name: 'can_delete_data', type: 'boolean', default: false }) canDeleteData: boolean;
  @Column({ name: 'can_manage_users', type: 'boolean', default: false }) canManageUsers: boolean;

  /** نطاق المشاريع: null = كل المشاريع، مصفوفة = مشاريع محددة بس (row-level) */
  @Column({ name: 'project_scope', type: 'text', array: true, nullable: true }) projectScope: string[] | null;

  /** حماية الدخول */
  @Column({ name: 'failed_attempts', type: 'int', default: 0 }) failedAttempts: number;
  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true }) lockedUntil: Date | null;
  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true }) lastLoginAt: Date | null;
  /** بيزيد مع «خروج من كل الأجهزة» — أي JWT بنسخة أقدم مرفوض */
  @Column({ name: 'token_version', type: 'int', default: 0 }) tokenVersion: number;

  /** 2FA (A8) */
  @Column({ name: 'totp_secret', type: 'text', nullable: true }) totpSecret: string | null;
  @Column({ name: 'totp_enabled', type: 'boolean', default: false }) totpEnabled: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
