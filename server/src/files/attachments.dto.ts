import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';
import { ID_RE } from '../data/data.dto';

export class AttachmentOwnerQueryDto {
  @ApiProperty({ example: 'ledger.invoices', description: 'مجموعة السجل المالك' })
  @IsString() @Length(1, 100) collection: string;
  @ApiProperty({ example: 'inv_123' })
  @IsString() @Matches(ID_RE) recordId: string;
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
}
