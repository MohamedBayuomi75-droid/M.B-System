import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min, ValidateNested } from 'class-validator';

/** طبقة الـ API: شكل المدخلات والمخرجات بس (مفيش منطق) — 7.4.4 (DEC-0117) */
export class ListProjectsQuery {
  @ApiPropertyOptional({ description: 'بحث ذكي زي الصفحة القديمة: الاسم، والكود، والعميل، والعقد، والملاحظات، والمرحلة، والمشرف' }) @IsOptional() @IsString() @MaxLength(100) q?: string;
  @ApiPropertyOptional({ description: 'قسم المرحلة (من القايمة الجانبية)' }) @IsOptional() @IsString() @MaxLength(80) status?: string;
  @ApiPropertyOptional({ description: 'فلتر «كل المراحل»' }) @IsOptional() @IsString() @MaxLength(80) stageSel?: string;
  @ApiPropertyOptional({ description: 'فلتر العميل (جوه القسم): معرّف العميل أو اسمه للقديم' }) @IsOptional() @IsString() @MaxLength(200) customerId?: string;
  @ApiPropertyOptional({ enum: ['', 'with', 'empty'] }) @IsOptional() @IsIn(['', 'with', 'empty']) hasRes?: '' | 'with' | 'empty';
  @ApiPropertyOptional({ enum: ['', 'none'], description: 'بدون ميزانية/قيمة. حالة الميزانية (تحت/قريب/تجاوز) من الشاشة الكاملة (F-12، DEC-0117 د-6)' }) @IsOptional() @IsIn(['', 'none']) budget?: '' | 'none';
}

export class ExtraFieldDto {
  @ApiProperty() @IsString() @MaxLength(100) label: string;
  @ApiProperty() @IsString() @MaxLength(2000) value: string;
}
const DATE_OR_EMPTY = /^(\d{4}-\d{2}-\d{2})?$/;
/**
 * نافذة المشروع (openProjectModal) — نفس الخانات الـ 13. الأرقام زي ما المستخدم كتبها (نص)، والسيرفر بيقرّبها زي القديم (toInt = خانتين).
 * العميل: معرّف من قايمة العملاء، أو اسم نصّي لو مفيش عملاء خالص (زي القديم).
 */
export class SaveProjectDto {
  @ApiPropertyOptional({ description: 'فاضي = PRJ- تلقائي' }) @IsOptional() @IsString() @MaxLength(60) code?: string;
  @ApiProperty() @IsString() @MaxLength(200) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) customerId?: string;
  @ApiPropertyOptional({ description: 'اسم العميل النصّي — لما مايكونش فيه عملاء مسجّلين' }) @IsOptional() @IsString() @MaxLength(200) customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) contractNo?: string;
  @ApiPropertyOptional({ example: '1000000' }) @IsOptional() @IsString() @MaxLength(40) value?: string;
  @ApiPropertyOptional({ example: '800000' }) @IsOptional() @IsString() @MaxLength(40) budget?: string;
  @ApiPropertyOptional({ example: '2026-11-22' }) @IsOptional() @Matches(DATE_OR_EMPTY) start?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(DATE_OR_EMPTY) end?: string;
  @ApiPropertyOptional({ description: 'فاضي = من غير نسبة' }) @IsOptional() @IsString() @MaxLength(10) progress?: string;
  @ApiPropertyOptional({ description: 'المرحلة / الحالة (فاضي = أول مرحلة)' }) @IsOptional() @IsString() @MaxLength(80) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) supervisorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) assignedTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) notes?: string;
  @ApiPropertyOptional({ type: [ExtraFieldDto] }) @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ExtraFieldDto) extraFields?: ExtraFieldDto[];
}
export class UpdateProjectDto extends SaveProjectDto {
  @ApiProperty() @IsInt() @Min(1) rev: number;
}
