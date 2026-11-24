import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/** 8.5.4 (DEC-0135): فلاتر صفحة اليوميات القديمة (workerAttFilters) */
export class GridQuery {
  @ApiPropertyOptional({ enum: ['workers', 'supervisors', 'drivers'] }) @IsOptional() @IsIn(['workers', 'supervisors', 'drivers']) tab?: string;
  @ApiPropertyOptional({ description: 'القسم («» = الكل)' }) @IsOptional() @IsString() @MaxLength(80) dept?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) supervisorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) project?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) site?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) q?: string;
}
/** نافذة اليومية: نفس الخانات كنصوص، والسيرفر بيحسب زي زرار الحفظ القديم (doSaveWatt) */
export class SaveDailyDto {
  @ApiProperty({ enum: ['worker', 'supervisor', 'driver'] }) @IsIn(['worker', 'supervisor', 'driver']) personType: string;
  @ApiProperty() @IsString() @MaxLength(80) personId: string;
  @ApiProperty() @IsString() @MaxLength(10) date: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) days?: string;
  @ApiPropertyOptional({ description: 'أجر اليوم — حقل محمي (DEC-0134)' }) @IsOptional() @IsString() @MaxLength(40) dayWage?: string;
  @ApiPropertyOptional({ description: 'خصم التأخير — حقل محمي (DEC-0134)' }) @IsOptional() @IsString() @MaxLength(40) deduction?: string;
  @ApiProperty() @IsString() @MaxLength(200) project: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) site?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
export class UpdateDailyDto extends SaveDailyDto {
  @ApiProperty() @IsInt() @Min(1) rev: number;
}
/** قرار المراجعة (DEC-0133): تتحسب أو تتلغي بسبب */
export class ReviewDto {
  @ApiProperty() @IsInt() @Min(1) rev: number;
  @ApiProperty({ enum: ['count', 'void'] }) @IsIn(['count', 'void']) decision: string;
  @ApiPropertyOptional({ description: 'السبب (إلزامي للإلغاء)' }) @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
export class AttQuery {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) employeeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) q?: string;
}
export class SaveAttDto {
  @ApiProperty() @IsString() @MaxLength(80) employeeId: string;
  @ApiProperty() @IsString() @MaxLength(10) date: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) checkIn?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) checkOut?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
export class UpdateAttDto extends SaveAttDto {
  @ApiProperty() @IsInt() @Min(1) rev: number;
}
