import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

export class DuesQuery {
  @ApiPropertyOptional({ enum: ['workers', 'supervisors', 'drivers', 'employees', 'equipment'] }) @IsOptional() @IsIn(['workers', 'supervisors', 'drivers', 'employees', 'equipment']) tab?: string;
  @ApiPropertyOptional({ description: 'القسم («» = الكل، و__none__ = بدون قسم)' }) @IsOptional() @IsString() @MaxLength(80) dept?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) q?: string;
}
export class PayLineDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) item?: string;
  @ApiProperty({ description: 'المبلغ (نص أو رقم زي خانة النافذة)' }) @IsString() @MaxLength(30) amount: string;
}
export class PayDto {
  @ApiProperty({ enum: ['pay', 'extras', 'penalty'], description: 'pay = دفع مستحق · extras = بدلات ومكافآت (مستحق) · penalty = خصم / جزاء' })
  @IsIn(['pay', 'extras', 'penalty']) mode: 'pay' | 'extras' | 'penalty';
  @ApiProperty({ enum: ['worker', 'supervisor', 'driver', 'employee', 'equipment'] }) @IsIn(['worker', 'supervisor', 'driver', 'employee', 'equipment']) personType: 'worker' | 'supervisor' | 'driver' | 'employee' | 'equipment';
  @ApiProperty() @IsString() @MaxLength(80) personId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @ApiPropertyOptional({ enum: ['salary', 'extras', 'daily'], description: 'نوع المستحق للدفع' }) @IsOptional() @IsIn(['salary', 'extras', 'daily']) payKind?: 'salary' | 'extras' | 'daily';
  @ApiPropertyOptional({ description: 'مبلغ الراتب (payKind = salary)' }) @IsOptional() @IsString() @MaxLength(30) salary?: string;
  @ApiPropertyOptional({ type: [PayLineDto] }) @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => PayLineDto) lines?: PayLineDto[];
  @ApiPropertyOptional({ type: [String], description: 'الإضافات المستحقة اللي بتتدفع (payKind = extras)' }) @IsOptional() @IsArray() @ArrayMaxSize(200) @IsString({ each: true }) bonusIds?: string[];
  @ApiPropertyOptional({ enum: ['self', 'workers', 'close_account'], description: 'نطاق صرف المشرف' }) @IsOptional() @IsIn(['self', 'workers', 'close_account']) scope?: 'self' | 'workers' | 'close_account';
  @ApiPropertyOptional({ description: 'سلفة (DEC-0132): مطلوبة لو المبلغ أكبر من المتبقي' }) @IsOptional() @IsBoolean() advance?: boolean;
}
export class ItemsDto {
  @ApiProperty({ enum: ['paymentItemPool', 'dailyPayItemPool', 'penaltyItemPool'] }) @IsIn(['paymentItemPool', 'dailyPayItemPool', 'penaltyItemPool']) pool: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(200) @IsString({ each: true }) @MaxLength(120, { each: true }) add?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(200) @IsString({ each: true }) @MaxLength(120, { each: true }) remove?: string[];
}
export class RevQuery { @ApiProperty() @Type(() => Number) @IsInt() @Min(0) rev: number }
