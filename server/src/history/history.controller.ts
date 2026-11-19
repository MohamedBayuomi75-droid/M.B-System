import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../authz/decorators';
import { HistoryService } from './history.service';

@ApiTags('v1 history')
@ApiBearerAuth()
@Controller('v1/history')
export class HistoryController {
  constructor(private readonly svc: HistoryService) {}
  @Get(':collection/:id')
  @ApiOperation({ summary: 'تاريخ سجل: كل تعديل بقيمته قبل وبعد والمستخدم والوقت' })
  get(@CurrentUser() u: AuthUser, @Param('collection') collection: string, @Param('id') id: string, @Query('limit') limit?: string) {
    return this.svc.recordHistory(u, collection, id, Number(limit) || 200);
  }
}
