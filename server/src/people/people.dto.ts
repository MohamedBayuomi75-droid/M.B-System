import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { ExtraFieldDto } from '../workers/workers.dto';

/** 8.2.4 (DEC-0123): فلاتر صفحتي المشرفين والسواقين القديمة (supervisorFilters / driverFilters + الفلاتر الإضافية ومنها الرخصة) */
export class ListPeopleQuery {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) q?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) status?: string;
  @ApiPropertyOptional({ description: 'القسم (لوحة)، و«__none__» = بدون قسم أو وظيفة' }) @IsOptional() @IsString() @MaxLength(80) departmentId?: string;
  @ApiPropertyOptional({ enum: ['', 'valid', 'soon', 'expired', 'none'] }) @IsOptional() @IsIn(['', 'valid', 'soon', 'expired', 'none']) xCard?: string;
  @ApiPropertyOptional({ enum: ['', 'valid', 'soon', 'expired', 'none', 'nolic'] }) @IsOptional() @IsIn(['', 'valid', 'soon', 'expired', 'none', 'nolic']) xLic?: string;
  @ApiPropertyOptional({ enum: ['', 'insured', 'none', 'pending', 'empty'] }) @IsOptional() @IsIn(['', 'insured', 'none', 'pending', 'empty']) xIns?: string;
  @ApiPropertyOptional({ enum: ['', 'missing', 'complete'] }) @IsOptional() @IsIn(['', 'missing', 'complete']) xDocs?: string;
  @ApiPropertyOptional({ enum: ['', 'missing'] }) @IsOptional() @IsIn(['', 'missing']) xData?: string;
}
/** نافذة المشرف ونافذتي السواق (الشركة والخارجي): نفس الخانات كنصوص، والسيرفر بيحسب زي زرار الحفظ القديم */
export class SavePersonDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) code?: string;
  @ApiProperty() @IsString() @MaxLength(200) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) status?: string;
  @ApiPropertyOptional({ description: 'تاريخ الاستقالة (بيتاخد بس لو الحالة استقالة — readResignedDateFromForm)' }) @IsOptional() @IsString() @MaxLength(20) resignedAt?: string;
  @ApiPropertyOptional({ description: 'الوظيفة' }) @IsOptional() @IsString() @MaxLength(200) position?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) nationalId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) birthDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) idCardExpiry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) licenseExpiry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) hireDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) contractType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) contractStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) insuranceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) insuranceStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(400) address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) notes?: string;
  @ApiPropertyOptional({ description: 'اليومية (المشرف والسواق الخارجي) — حقل محمي (B-48)' }) @IsOptional() @IsString() @MaxLength(40) dailyWage?: string;
  @ApiPropertyOptional({ description: 'الراتب (سواق الشركة) — حقل محمي (B-48)' }) @IsOptional() @IsString() @MaxLength(40) salary?: string;
  @ApiPropertyOptional({ description: 'درجة الرخصة (سواق الشركة)' }) @IsOptional() @IsString() @MaxLength(60) licenseGrade?: string;
  @ApiPropertyOptional({ description: 'سواق من خارج الشركة (الإضافة بس؛ التعديل بياخد نوع السجل المخزن)' }) @IsOptional() @IsBoolean() external?: boolean;
  @ApiPropertyOptional({ type: [ExtraFieldDto] }) @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ExtraFieldDto) extraFields?: ExtraFieldDto[];
  @ApiPropertyOptional({ description: '«حفظ على أي حال» بعد تنبيه التشابه (DUPLICATE_SOFT)' }) @IsOptional() @IsBoolean() confirmDuplicates?: boolean;
}
export class UpdatePersonDto extends SavePersonDto {
  @ApiProperty() @IsInt() @Min(1) rev: number;
}
