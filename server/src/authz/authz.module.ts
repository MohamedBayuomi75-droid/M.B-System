import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from '../entities';
import { JwtAuthGuard, PermissionsGuard } from './guards';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [TypeOrmModule.forFeature([RoleEntity])],
  controllers: [RolesController],
  providers: [
    RolesService,
    // الترتيب مهم: التوثيق الأول وبعدين الصلاحيات
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [RolesService],
})
export class AuthzModule {}
