import { Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../authz/decorators';
import { NotificationsService } from './notifications.service';

@ApiTags('v1 notifications')
@ApiBearerAuth()
@Controller('v1/notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}
  @Get()
  @ApiOperation({ summary: 'إشعاراتي (كل مستخدم بيشوف إشعاراته بس)' })
  mine(@CurrentUser() u: AuthUser, @Query('unread') unread?: string) { return this.svc.mine(u.id, unread === 'true'); }
  @Post(':id/read')
  @HttpCode(200)
  @HttpCode(200)
  async read(@CurrentUser() u: AuthUser, @Param('id') id: string) { return { updated: await this.svc.markRead(u.id, id === 'all' ? 'all' : String(Number(id) || 0)) }; }
}
