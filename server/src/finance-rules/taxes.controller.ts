import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../authz/decorators';
import { ComputeTaxesDto, CreateTaxCodeDto, CreateTaxVersionDto, DecisionNoteDto } from './taxes.dto';
import { TaxesService } from './taxes.service';

/** إدارة الضرائب والاستقطاعات والدمغات (B-21) — جزء من محرك القواعد المالية (B-20) */
@ApiTags('v1 finance rules — taxes')
@ApiBearerAuth()
@Controller('v1/finance/taxes')
export class TaxesController {
  constructor(private readonly svc: TaxesService) {}
  @Get() @ApiOperation({ summary: 'الأكواد بإصداراتها' }) list(@CurrentUser() u: AuthUser) { return this.svc.list(u); }
  @Post('codes') @ApiOperation({ summary: 'كود ضريبي/استقطاع جديد (المدير)' }) createCode(@CurrentUser() u: AuthUser, @Body() dto: CreateTaxCodeDto, @Req() req: Request) { return this.svc.createCode(u, dto, req); }
  @Post('codes/:code/versions') @ApiOperation({ summary: 'إصدار جديد (مسودة) — مابيتطبّقش قبل الاعتماد' })
  createVersion(@CurrentUser() u: AuthUser, @Param('code') code: string, @Body() dto: CreateTaxVersionDto, @Req() req: Request) { return this.svc.createVersion(u, code, dto, req); }
  @Delete('versions/:id') deleteDraft(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) { return this.svc.deleteDraft(u, id, req); }
  @Post('versions/:id/submit') @HttpCode(200) submit(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) { return this.svc.submit(u, id, req); }
  @Post('versions/:id/approve') @HttpCode(200) @ApiOperation({ summary: 'اعتماد — من غير اللي أعدّ' })
  approve(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DecisionNoteDto, @Req() req: Request) { return this.svc.approve(u, id, dto.note, req); }
  @Post('versions/:id/reject') @HttpCode(200) reject(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DecisionNoteDto, @Req() req: Request) { return this.svc.reject(u, id, dto.note, req); }
  @Post('versions/:id/suspend') @HttpCode(200) suspend(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DecisionNoteDto, @Req() req: Request) { return this.svc.suspend(u, id, dto.note, req); }
  @Post('compute') @HttpCode(200) @ApiOperation({ summary: 'حساب بالمعتمد الساري بس (معاينة)' }) compute(@Body() dto: ComputeTaxesDto) { return this.svc.compute(dto); }
}
