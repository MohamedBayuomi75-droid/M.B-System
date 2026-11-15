import { AttachmentEntity } from './attachment.entity';
import { AuditLogEntity } from './audit-log.entity';
import { ChangeEntity } from './change.entity';
import { DocEntity } from './doc.entity';
import { RecordEntity } from './record.entity';
import { RoleEntity } from './role.entity';
import { SchemaMetaEntity } from './schema-meta.entity';
import { SessionEntity } from './session.entity';
import { UserPermissionEntity } from './user-permission.entity';
import { UserEntity } from './user.entity';

export * from './attachment.entity';
export * from './audit-log.entity';
export * from './change.entity';
export * from './doc.entity';
export * from './record.entity';
export * from './role.entity';
export * from './schema-meta.entity';
export * from './session.entity';
export * from './user-permission.entity';
export * from './user.entity';

export const ENTITIES = [
  UserEntity, SessionEntity, RoleEntity, UserPermissionEntity,
  RecordEntity, DocEntity, ChangeEntity, AuditLogEntity, AttachmentEntity, SchemaMetaEntity,
];
