import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** طبقة الـ API: شكل المدخلات والمخرجات بس (مفيش منطق) */
export class ListProjectsQuery {
  @ApiPropertyOptional({ description: 'بحث في الاسم أو الكود' }) @IsOptional() @IsString() @MaxLength(100) q?: string;
  @ApiPropertyOptional({ example: 'active' }) @IsOptional() @IsString() @MaxLength(40) status?: string;
  @ApiPropertyOptional({ enum: ['name', 'code'], default: 'name' }) @IsOptional() @IsIn(['name', 'code']) sort?: 'name' | 'code';
  @ApiPropertyOptional({ default: 100, maximum: 500 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) limit?: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset?: number;
}

export class ProjectDto {
  @ApiProperty() id: string;
  @ApiProperty({ nullable: true }) code: string | null;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) status: string | null;
  @ApiProperty({ nullable: true, description: 'مرحلة مسار المشروع' }) stage: string | null;
  @ApiProperty({ nullable: true, example: '10000.0000', description: 'الميزانية: نص عشري بأربع خانات (ADR-023) — أو null' }) budget: string | null;
  @ApiProperty({ nullable: true }) supervisorId: string | null;
  @ApiProperty({ nullable: true }) customerId: string | null;
  @ApiProperty() rev: number;
  @ApiProperty({ nullable: true }) updatedAt: string | null;
}

export class ProjectListDto {
  @ApiProperty({ type: [ProjectDto] }) items: ProjectDto[];
  @ApiProperty() total: number;
  @ApiProperty({ description: 'مصدر البيانات الحالي — الطبقة الانتقالية لحد نقل موديول المشروعات (المرحلة 5)', example: 'legacy-records' }) source: 'legacy-records';
}
