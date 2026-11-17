import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsArray, IsIn, IsObject, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import type { Request } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../authz/decorators';
import { FormulasService } from './formulas.service';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
export class CreateFormulaDto {
  @ApiProperty({ example: 'SUP-INVOICE' }) @Matches(/^[A-Z][A-Z0-9_-]{1,40}$/) code: string;
  @ApiProperty() @IsString() @Length(1, 200) name: string;
  @ApiProperty({ example: 'suppliers' }) @IsString() @Length(1, 60) module: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) description?: string;
}
export class CreateFormulaVersionDto {
  @ApiProperty({ enum: ['new', 'logic', 'parameters'], description: 'نوع التعديل (§13.6): منطق المعادلة ولا القيم والمعاملات — الاتنين إصدار جديد واعتماد' }) @IsIn(['new', 'logic', 'parameters']) changeKind: 'new' | 'logic' | 'parameters';
  @ApiProperty({ description: '{ variables: {اسم: money|qty|rate|list}, lists: {قائمة: [حقول]}, steps: [{name, expr, kind}] } — expr بلغة التعبيرات المحدودة بس' }) @IsObject() definition: { variables: Record<string, string>; lists?: Record<string, string[]>; steps: { name: string; expr: string; kind?: 'money' | 'qty' | 'rate' | 'raw' | 'check' }[] };
  @ApiProperty({ description: '[{name, inputs, expected | expectError}] — إلزامية قبل الإرسال للاعتماد' }) @IsArray() testCases: { name: string; inputs: Record<string, unknown>; expected?: Record<string, unknown>; expectError?: string }[];
  @ApiPropertyOptional({ description: 'شروط التطبيق: { documentType: [...], activity: ... }' }) @IsOptional() @IsObject() conditions?: Record<string, unknown>;
  @ApiProperty() @Matches(DATE) effectiveFrom: string;
  @ApiPropertyOptional() @IsOptional() @Matches(DATE) effectiveTo?: string;
  @ApiProperty() @IsString() @Length(3, 2000) changeReason: string;
}
export class NoteDto { @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) note?: string }
export class PreviewDto { @ApiProperty() @IsObject() inputs: Record<string, unknown> }
export class EvaluateDto {
  @ApiProperty() @Matches(DATE) date: string;
  @ApiProperty() @IsObject() inputs: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsObject() context?: Record<string, unknown>;
}

/** Financial Rules Management (B-20 §13) */
@ApiTags('v1 finance rules — formulas')
@ApiBearerAuth()
@Controller('v1/finance/formulas')
export class FormulasController {
  constructor(private readonly svc: FormulasService) {}
  @Get() list(@CurrentUser() u: AuthUser) { return this.svc.list(u); }
  @Post() createFormula(@CurrentUser() u: AuthUser, @Body() dto: CreateFormulaDto, @Req() req: Request) { return this.svc.createFormula(u, dto, req); }
  @Post(':code/versions') @ApiOperation({ summary: 'إصدار جديد (مسودة) — بيتحقق ويشغّل الاختبارات فورًا' })
  createVersion(@CurrentUser() u: AuthUser, @Param('code') code: string, @Body() dto: CreateFormulaVersionDto, @Req() req: Request) { return this.svc.createVersion(u, code, dto, req); }
  @Delete('versions/:id') deleteDraft(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) { return this.svc.deleteDraft(u, id, req); }
  @Post('versions/:id/preview') @HttpCode(200) @ApiOperation({ summary: 'معاينة نتيجة أي إصدار بمدخلات يدوية (اختبار بس)' })
  preview(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: PreviewDto) { return this.svc.preview(u, id, dto.inputs); }
  @Post('versions/:id/submit') @HttpCode(200) submit(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) { return this.svc.submit(u, id, req); }
  @Post('versions/:id/approve') @HttpCode(200) approve(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: NoteDto, @Req() req: Request) { return this.svc.approve(u, id, dto.note, req); }
  @Post('versions/:id/reject') @HttpCode(200) reject(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: NoteDto, @Req() req: Request) { return this.svc.decide(u, id, 'reject', dto.note, req); }
  @Post('versions/:id/suspend') @HttpCode(200) suspend(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: NoteDto, @Req() req: Request) { return this.svc.decide(u, id, 'suspend', dto.note, req); }
  @Post(':code/evaluate') @HttpCode(200) @ApiOperation({ summary: 'حساب بالإصدار المعتمد الساري بس' })
  evaluate(@Param('code') code: string, @Body() dto: EvaluateDto) { return this.svc.evaluate(code, dto.date, dto.inputs, dto.context); }
}
