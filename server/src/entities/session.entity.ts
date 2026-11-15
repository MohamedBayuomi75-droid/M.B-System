import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from './user.entity';

/** refresh tokens (A2) — بنخزن hash التوكن بس، مش التوكن نفسه. */
@Entity({ name: 'sessions' })
@Index('ix_sessions_user', ['userId'])
export class SessionEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId: string;
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'fk_sessions_user' }) user?: UserEntity;
  @Column({ name: 'token_hash', type: 'text', unique: true }) tokenHash: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt: Date;
  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true }) revokedAt: Date | null;
  /** تدوير التوكن: الجلسة الجديدة اللي حلّت محل دي (اكتشاف إعادة الاستخدام) */
  @Column({ name: 'replaced_by', type: 'uuid', nullable: true }) replacedBy: string | null;
  @Column({ name: 'user_agent', type: 'text', nullable: true }) userAgent: string | null;
  @Column({ type: 'inet', nullable: true }) ip: string | null;
}
