import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, Length, Matches, Max, Min, ValidateNested } from 'class-validator';
import { MeDto } from '../users/users.dto';

/**
 * معرّف سجل: أي نص بدون مسافات/محارف تحكم (معرّفات الديسكتوب زي «emp_lx2k9a» أو «CON-0001» أو بحروف عربية).
 * S-1 (المرحلة 2): ممنوع كمان محارف HTML/JS الخاصة (< > " ' ` & \) — الواجهة القديمة بتطبع المعرّف جوه
 * data-id="..." وonclick من غير ترميز، فده خط الدفاع على السيرفر. البيانات الحقيقية مافيهاش أي معرّف بالمحارف دي.
 */
export const ID_RE = /^[^\s\u0000-\u001f<>"'`&\\]{1,200}$/;
export const FIELD_RE = /^(?!__proto__$|constructor$|prototype$)[^\u0000-\u001f<>"'`&\\]{1,200}$/;

export class RecordChangeDto {
  @ApiProperty({ example: 'employees', description: 'مسار الـ collection زي ما هو في DATA (employees، ledger.invoices، ...)' })
  @IsString() @Length(1, 100) collection: string;
  @ApiProperty({ example: 'emp_1' }) @IsString() @Matches(ID_RE) id: string;
  @ApiProperty({ enum: ['upsert', 'delete'] }) @IsIn(['upsert', 'delete']) op: 'upsert' | 'delete';
  @ApiProperty({ example: 3, description: 'آخر rev العميل شافه للسجل ده (0 = سجل جديد)' }) @IsInt() @Min(0) @Max(2_147_483_647) baseRev: number;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true, description: 'الحقول المتغيّرة بقيمها الجديدة (للسجل الجديد: السجل كله)' })
  @IsOptional() @IsObject() set?: Record<string, unknown>;
  @ApiPropertyOptional({ type: [String], description: 'حقول اتشالت من السجل' })
  @IsOptional() @IsArray() @ArrayMaxSize(500) @Matches(FIELD_RE, { each: true }) unset?: string[];
}

export class DocChangeDto {
  @ApiProperty({ example: 'settings', description: 'مفتاح doc/lookup (settings، formLayouts، ledger.customItemNames، ...)' })
  @IsString() @Length(1, 100) key: string;
  @ApiProperty({ example: 2 }) @IsInt() @Min(0) @Max(2_147_483_647) baseRev: number;
  @ApiProperty({ enum: ['set', 'patch', 'arrayDelta'], description: 'set = استبدال كامل · patch = حقول في كائن · arrayDelta = إضافة/حذف عناصر من قائمة (بيندمج دايمًا)' })
  @IsIn(['set', 'patch', 'arrayDelta']) op: 'set' | 'patch' | 'arrayDelta';
  @ApiPropertyOptional({ description: 'للـ set: القيمة الكاملة' }) @IsOptional() value?: unknown;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true }) @IsOptional() @IsObject() set?: Record<string, unknown>;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(500) @Matches(FIELD_RE, { each: true }) unset?: string[];
  @ApiPropertyOptional({ type: 'array', items: {} }) @IsOptional() @IsArray() @ArrayMaxSize(10_000) add?: unknown[];
  @ApiPropertyOptional({ type: 'array', items: {} }) @IsOptional() @IsArray() @ArrayMaxSize(10_000) remove?: unknown[];
}

export class SyncRequestDto {
  @ApiPropertyOptional({ type: [RecordChangeDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(5000) @ValidateNested({ each: true }) @Type(() => RecordChangeDto)
  changes?: RecordChangeDto[];
  @ApiPropertyOptional({ type: [DocChangeDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => DocChangeDto)
  docs?: DocChangeDto[];
}

export class CurrentVersionDto {
  @ApiProperty() rev: number;
  @ApiProperty({ type: 'object', additionalProperties: true, nullable: true }) data: unknown;
}

export class AppliedRecordDto {
  @ApiProperty() collection: string;
  @ApiProperty() id: string;
  @ApiProperty({ description: 'الـ rev الجديد (يتحفظ عند العميل كـ baseRev للمرة الجاية)' }) rev: number;
  @ApiProperty({ enum: ['insert', 'update', 'delete', 'noop', 'ignored'] }) op: string;
  @ApiPropertyOptional({ type: [String], description: 'حقول نصية اتعدّلت من حد تاني بعد baseRev واتكتب فوقها (آخر واحد يكسب)' }) overwrote?: string[];
  @ApiPropertyOptional({ type: 'object', additionalProperties: true, description: 'السجل بعد الدمج — بيرجع لما حد تاني كان عدّل نفس السجل بعد baseRev (العميل يستبدل نسخته بيه)' }) data?: unknown;
}

export class ConflictRecordDto {
  @ApiProperty() collection: string;
  @ApiProperty() id: string;
  @ApiProperty({ enum: ['field_conflict', 'deleted', 'changed_since', 'bad_rev', 'constraint'], description: 'field_conflict = حقل مالي/مركّب اتعدّل من حد تاني · deleted = السجل اتمسح · changed_since = حذف سجل اتعدّل بعد ما شفته · constraint = قيد في قاعدة البيانات رفض القيمة (مثلًا كود عميل مكرر) — fields فيها السبب' })
  reason: string;
  @ApiPropertyOptional({ type: [String] }) fields?: string[];
  @ApiProperty({ type: CurrentVersionDto, nullable: true, description: 'النسخة الحالية على السيرفر (بعد إخفاء الحقول المحمية)' }) current: CurrentVersionDto | null;
}

export class AppliedDocDto {
  @ApiProperty() key: string;
  @ApiProperty() rev: number;
  @ApiProperty({ enum: ['set', 'patch', 'arrayDelta', 'noop', 'ignored'] }) op: string;
  @ApiPropertyOptional({ type: [String] }) overwrote?: string[];
  @ApiPropertyOptional({ description: 'القيمة بعد الدمج (arrayDelta أو لما حد تاني عدّل بعد baseRev)' }) data?: unknown;
}

export class ConflictDocDto {
  @ApiProperty() key: string;
  @ApiProperty({ enum: ['field_conflict', 'changed_since', 'bad_rev'] }) reason: string;
  @ApiPropertyOptional({ type: [String] }) fields?: string[];
  @ApiProperty({ type: CurrentVersionDto, nullable: true }) current: CurrentVersionDto | null;
}

export class SyncResponseDto {
  @ApiProperty({ description: 'آخر seq بعد التطبيق' }) seq: number;
  @ApiProperty({ type: [AppliedRecordDto] }) applied: AppliedRecordDto[];
  @ApiProperty({ type: [ConflictRecordDto] }) conflicts: ConflictRecordDto[];
  @ApiProperty({ type: [AppliedDocDto] }) docsApplied: AppliedDocDto[];
  @ApiProperty({ type: [ConflictDocDto] }) docConflicts: ConflictDocDto[];
}

export class WriteAccessDto {
  @ApiProperty() add: boolean;
  @ApiProperty() edit: boolean;
  @ApiProperty() delete: boolean;
}

export class BootstrapMetaDto {
  @ApiProperty({ type: 'object', additionalProperties: { type: 'object', additionalProperties: { type: 'integer' } }, description: 'collection → (id → rev)' })
  revs: Record<string, Record<string, number>>;
  @ApiProperty({ type: 'object', additionalProperties: { type: 'integer' }, description: 'doc key → rev' }) docRevs: Record<string, number>;
  @ApiProperty({ type: [String], description: 'collections مش مسموح للمستخدم يقراها (راجعة فاضية — العميل ماينفعش يبعت لها تغييرات)' }) hidden: string[];
  @ApiProperty({ type: 'object', additionalProperties: { $ref: '#/components/schemas/WriteAccessDto' }, description: 'صلاحيات الكتابة لكل collection مقروءة' })
  writable: Record<string, WriteAccessDto>;
  @ApiProperty({ description: 'يقدر يعدّل القوائم المرجعية والإعدادات' }) docsWritable: boolean;
  @ApiProperty({ type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } }, description: 'collection → حقول اتشالت (صلاحية)' })
  hiddenFields: Record<string, string[]>;
  @ApiProperty({ type: 'object', additionalProperties: { type: 'string', enum: ['collection', 'lookup', 'doc', 'meta-flag', 'system-table', 'legacy-ref'] }, description: 'نوع كل مفتاح في DATA (العميل بيبني الـ diff على أساسه)' })
  catalog: Record<string, string>;
}

export class BootstrapDto {
  @ApiProperty({ description: 'آخر seq وقت اللقطة — يستخدم في /api/changes?since= بعد إعادة الاتصال' }) seq: number;
  @ApiProperty({ example: 9 }) schemaVersion: number;
  @ApiProperty({ type: 'object', additionalProperties: true, description: 'نفس شكل DATA في الديسكتوب (مفلتر بالصلاحية والمشروع)' }) data: Record<string, unknown>;
  @ApiProperty({ type: BootstrapMetaDto }) meta: BootstrapMetaDto;
  @ApiProperty({ type: MeDto }) me: MeDto;
}

export class ChangeEventDto {
  @ApiProperty() seq: number;
  @ApiProperty({ enum: ['record', 'doc'] }) kind: 'record' | 'doc';
  @ApiProperty({ description: 'collection (للسجل) أو key (للـ doc)' }) collection: string;
  @ApiProperty() id: string;
  @ApiProperty({ enum: ['upsert', 'delete'] }) op: 'upsert' | 'delete';
  @ApiProperty() rev: number;
  @ApiProperty({ type: 'object', additionalProperties: true, nullable: true }) data: unknown;
}

export class ChangesQueryDto {
  @ApiProperty({ example: 0 }) @Type(() => Number) @IsInt() @Min(0) since: number;
  @ApiPropertyOptional({ default: 1000, maximum: 5000 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5000) limit?: number;
}

export class ChangesResponseDto {
  @ApiProperty({ description: 'آخر seq اتقرا (استخدمه في الطلب الجاي)' }) seq: number;
  @ApiProperty({ description: 'فيه تغييرات تانية لسه' }) hasMore: boolean;
  @ApiProperty({ type: [ChangeEventDto] }) changes: ChangeEventDto[];
}
