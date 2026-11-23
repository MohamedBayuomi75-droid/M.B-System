import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

/** 8.1.4 (DEC-0121): فلاتر صفحة العمال القديمة (workerFilters + الفلاتر الإضافية) */
export class ListWorkersQuery {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) q?: string;
  @ApiPropertyOptional({ description: 'الحالة، و«temporary» = النوع المؤقت' }) @IsOptional() @IsString() @MaxLength(40) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) supervisorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) project?: string;
  @ApiPropertyOptional({ description: 'القسم (لوحة)، و«__none__» = بدون قسم أو وظيفة' }) @IsOptional() @IsString() @MaxLength(80) departmentId?: string;
  @ApiPropertyOptional({ enum: ['', 'valid', 'soon', 'expired', 'none'] }) @IsOptional() @IsIn(['', 'valid', 'soon', 'expired', 'none']) xCard?: string;
  @ApiPropertyOptional({ enum: ['', 'insured', 'none', 'pending', 'empty'] }) @IsOptional() @IsIn(['', 'insured', 'none', 'pending', 'empty']) xIns?: string;
  @ApiPropertyOptional({ enum: ['', 'missing', 'complete'] }) @IsOptional() @IsIn(['', 'missing', 'complete']) xDocs?: string;
  @ApiPropertyOptional({ enum: ['', 'missing'] }) @IsOptional() @IsIn(['', 'missing']) xData?: string;
}
export class ExtraFieldDto {
  @ApiProperty() @IsString() @MaxLength(100) label: string;
  @ApiProperty() @IsString() @MaxLength(2000) value: string;
}
/** نافذة العامل (openWorkerModal) بشكليها: نفس الخانات كنصوص، والسيرفر بيحسب زي زرار الحفظ القديم */
export class SaveWorkerDto {
  @ApiProperty({ enum: ['temporary', 'company'] }) @IsIn(['temporary', 'company']) workerType: 'temporary' | 'company';
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) code?: string;
  @ApiProperty() @IsString() @MaxLength(200) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) supervisorId?: string;
  @ApiPropertyOptional({ description: 'الوظيفة (= المهارة)' }) @IsOptional() @IsString() @MaxLength(200) position?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) nationalId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(400) address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) project?: string;
  @ApiPropertyOptional({ description: 'اليومية (المؤقت بس) — حقل محمي (B-48)' }) @IsOptional() @IsString() @MaxLength(40) dailyWage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) birthDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) idCardExpiry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) hireDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) contractType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) contractStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) insuranceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) insuranceStatus?: string;
  @ApiPropertyOptional({ description: 'الراتب (الشركة بس) — حقل محمي (B-48)' }) @IsOptional() @IsString() @MaxLength(40) salary?: string;
  @ApiPropertyOptional({ type: [ExtraFieldDto] }) @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ExtraFieldDto) extraFields?: ExtraFieldDto[];
}
export class UpdateWorkerDto extends SaveWorkerDto {
  @ApiProperty() @IsInt() @Min(1) rev: number;
}
