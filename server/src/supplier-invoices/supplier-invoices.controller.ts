import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../authz/decorators';
import { Idempotent } from '../common/idempotency';
import { ListInvoicesQuery, SaveInvoiceDto, UpdateInvoiceDto } from './supplier-invoices.dto';
import { SupplierInvoicesService } from './supplier-invoices.service';

/** فواتير ومرتجعات الموردين (7.2.4). الحذف والتصدير والإشعارات في الواجهة القديمة (DEC-0108). الدفعات في 7.3 */
@ApiTags('v1 supplier-invoices')
@ApiBearerAuth()
@Controller('v1/supplier-invoices')
export class SupplierInvoicesController {
  constructor(private readonly svc: SupplierInvoicesService) {}
  @Get() @ApiOperation({ summary: 'القايمة بنفس فلاتر وبحث وترتيب صفحة الفواتير القديمة + الكروت (المرتجع بيخصم)' })
  list(@CurrentUser() u: AuthUser, @Query() q: ListInvoicesQuery) { return this.svc.list(u, q); }
  @Get('linkable') @ApiOperation({ summary: 'الفواتير اللي ينفع المرتجع يتربط بيها (نفس المورد، مش مرتجع، مش ملغية)' })
  linkable(@CurrentUser() u: AuthUser, @Query('supplierId') supplierId: string, @Query('keep') keep?: string) { return this.svc.linkable(u, supplierId, keep); }
  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.get(u, id); }
  @Post() @Idempotent() @ApiOperation({ summary: 'إضافة فاتورة أو مرتجع (Idempotency-Key إلزامي): المعادلة الانتقالية، ورقم داخلي PI-/PR-، وB-31، وأثر المرتجع، وحدث' })
  create(@CurrentUser() u: AuthUser, @Body() dto: SaveInvoiceDto) { return this.svc.create(u, dto); }
  @Patch(':id') @ApiOperation({ summary: 'تعديل (rev إلزامي). القديم بيفضل من غير رقم داخلي' })
  update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateInvoiceDto) { return this.svc.update(u, id, dto); }
}
