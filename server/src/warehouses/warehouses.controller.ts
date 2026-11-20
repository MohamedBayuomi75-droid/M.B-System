import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../authz/decorators';
import { CreateItemDto, CreateLocationDto, TransferDto, UpdateItemDto, UpdateLocationDto } from './warehouses.dto';
import { WarehousesService } from './warehouses.service';

/** المخازن (6.2-ب) — من غير أي حساب تكلفة (B-20). التسويات: /api/v1/stock/adjustments (B-51) */
@ApiTags('v1 warehouses')
@ApiBearerAuth()
@Controller('v1/warehouses')
export class WarehousesController {
  constructor(private readonly svc: WarehousesService) {}
  @Get() @ApiOperation({ summary: 'الأصناف بأرصدتها (رصيد/محجوز لكل مخزن) + المخازن' }) overview(@CurrentUser() u: AuthUser) { return this.svc.overview(u); }
  @Get('movements') movements(@CurrentUser() u: AuthUser, @Query('itemId') itemId?: string) { return this.svc.movements(u, itemId); }
  @Post('items') createItem(@CurrentUser() u: AuthUser, @Body() dto: CreateItemDto) { return this.svc.createItem(u, dto); }
  @Patch('items/:id') updateItem(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateItemDto) { return this.svc.updateItem(u, id, dto); }
  @Patch('locations/:id') @ApiOperation({ summary: 'تعديل اسم المخزن وملاحظاته (الكود ثابت، rev إلزامي)' }) updateLocation(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateLocationDto) { return this.svc.updateLocation(u, id, dto); }
  @Post('locations') createLocation(@CurrentUser() u: AuthUser, @Body() dto: CreateLocationDto) { return this.svc.createLocation(u, dto); }
  @Post('transfers') @ApiOperation({ summary: 'تحويل بين مخزنين (B-50 على المصدر)' }) transfer(@CurrentUser() u: AuthUser, @Body() dto: TransferDto) { return this.svc.transfer(u, dto); }
}
