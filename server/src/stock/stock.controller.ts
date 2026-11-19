import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../authz/decorators';
import { CreateAdjustmentDto, ReasonDto, UpdateAdjustmentDto } from './stock.dto';
import { StockService } from './stock.service';

/** التسويات المخزنية (B-51) — الاعتماد نفسه من /api/v1/approvals (بانتظار اعتمادي) */
@ApiTags('v1 stock adjustments')
@ApiBearerAuth()
@Controller('v1/stock/adjustments')
export class StockController {
  constructor(private readonly svc: StockService) {}
  @Get() list(@CurrentUser() u: AuthUser) { return this.svc.list(u); }
  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.get(u, id); }
  @Post() @ApiOperation({ summary: 'طلب تسوية (مسودة) — أمين المخزن' }) create(@CurrentUser() u: AuthUser, @Body() dto: CreateAdjustmentDto, @Req() req: Request) { return this.svc.create(u, dto, req); }
  @Patch(':id') @ApiOperation({ summary: 'تعديل المسودة/المرتجعة بس' }) update(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAdjustmentDto, @Req() req: Request) { return this.svc.update(u, id, dto, req); }
  @Post(':id/submit') @HttpCode(200) submit(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) { return this.svc.submit(u, id, req); }
  @Post(':id/cancel') @HttpCode(200) cancel(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReasonDto, @Req() req: Request) { return this.svc.cancel(u, id, dto.reason, req); }
  @Post(':id/post') @HttpCode(200) @ApiOperation({ summary: 'إعادة محاولة الترحيل — صلاحية «ترحيل» مستقلة بس (الترحيل العادي آلي بعد الاعتماد)' })
  post(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.post(id, u); }
}
