import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity } from '../entities';
import { ROLE_KEYS, ROLE_LABELS, roleTemplates, RoleKey, Permissions } from './roles';

/** بيزامن جدول roles مع roles.ts عند كل إقلاع (roles.ts هو المصدر الوحيد). */
@Injectable()
export class RolesService implements OnApplicationBootstrap {
  private readonly log = new Logger(RolesService.name);
  constructor(@InjectRepository(RoleEntity) private readonly repo: Repository<RoleEntity>) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.sync();
  }

  async sync(): Promise<void> {
    const T = roleTemplates();
    await this.repo.upsert(
      ROLE_KEYS.map((key) => ({ key, label: ROLE_LABELS[key], permissions: T[key], isSystem: true })),
      ['key'],
    );
    this.log.log(`roles synced (${ROLE_KEYS.length})`);
  }

  list(): { key: RoleKey; label: string; permissions: Permissions }[] {
    const T = roleTemplates();
    return ROLE_KEYS.map((key) => ({ key, label: ROLE_LABELS[key], permissions: T[key] }));
  }
}
