import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';
import { ID_RE } from '../data/data.dto';

export class AttachmentOwnerQueryDto {
  @ApiProperty({ example: 'ledger.invoices', description: 'مجموعة السجل المالك' })
  @IsString() @Length(1, 100) collection: string;
  @ApiProperty({ example: 'inv_123' })
  @IsString() @Matches(ID_RE) recordId: string;
  @ApiProperty({ required: false, description: 'المرحلة 5: رفع إصدار جديد بدل مرفق موجود (القديم بيفضل محفوظ)' })
  @IsOptional() @IsUUID() replaces?: string;
}

export class AttachmentDto {
  @ApiProperty() id: string;
  @ApiProperty() collection: string;
  @ApiProperty() recordId: string;
  @ApiProperty() filename: string;
  @ApiProperty({ enum: ['pdf', 'jpg', 'png', 'docx', 'xlsx'] }) kind: string;
  @ApiProperty() mime: string;
  @ApiProperty() size: number;
  @ApiProperty() sha256: string;
  @ApiProperty() createdAt: string;
  @ApiProperty({ description: 'رقم الإصدار' }) version: number;
  @ApiProperty({ nullable: true, description: 'معرّف الإصدار الأول' }) versionOf: string | null;
  @ApiProperty({ nullable: true }) supersededAt: string | null;
}
