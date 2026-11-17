import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser, RequirePerms } from '../authz/decorators';
import { CreateCustomerDto, CreateSupplierDto, ListPartiesQuery, UpdateCustomerDto, UpdateSupplierDto } from './parties.dto';
import { PartiesService } from './parties.service';

/** Resource API للموردين (المرحلة 6.1) — بيانات أساسية بس. الأرصدة وكشف الحساب في 6.3/6.4. الحذف من الواجهة الحالية (سلة المهملات). */
@ApiTags('v1 suppliers')
@ApiBearerAuth()
@Controller('v1/suppliers')
export class SuppliersController {
  constructor(private readonly svc: PartiesService) {}
  @Get() @ApiOperation({ summary: 'الموردين (بحث بالاسم/الرقم الضريبي/السجل/الهاتف/البريد)' })
  list(@CurrentUser() u: AuthUser, @Query() q: ListPartiesQuery) { return this.svc.listSuppliers(u, q.q); }
  @Get('migration-plan') @RequirePerms({ flag: 'manageUsers' }) @ApiOperation({ summary: 'خطة ترحيل الموردين والعملاء — قراءة بس (dry-run)' })
  plan() { return this.svc.migrationPlan(); }
  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.getSupplier(u, id); }
  @Post() @ApiOperation({ summary: 'إضافة مورد' }) create(@CurrentUser() u: AuthUser, @Body() dto: CreateSupplierDto) { return this.svc.createSupplier(u, dto); }
  @Patch(':id') @ApiOperation({ summary: 'تعديل بيانات مورد (rev إلزامي)' })
  update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateSupplierDto) { return this.svc.updateSupplier(u, id, dto); }
}

@ApiTags('v1 customers')
@ApiBearerAuth()
@Controller('v1/customers')
export class CustomersController {
  constructor(private readonly svc: PartiesService) {}
  @Get() list(@CurrentUser() u: AuthUser, @Query() q: ListPartiesQuery) { return this.svc.listCustomers(u, q.q); }
  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.getCustomer(u, id); }
  @Post() @ApiOperation({ summary: 'إضافة عميل (الكود بيتولّد لو فاضي)' }) create(@CurrentUser() u: AuthUser, @Body() dto: CreateCustomerDto) { return this.svc.createCustomer(u, dto); }
  @Patch(':id') update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateCustomerDto) { return this.svc.updateCustomer(u, id, dto); }
}
