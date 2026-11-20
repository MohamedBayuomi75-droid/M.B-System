import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReferenceService } from './reference.service';

@ApiTags('v1 reference data')
@ApiBearerAuth()
@Controller('v1/reference')
export class ReferenceController {
  constructor(private readonly svc: ReferenceService) {}

  @Get()
  @ApiOperation({ summary: 'القوايم المرجعية المشتركة (المفاتيح والأعداد)', description: 'قراءة بس، لأي مستخدم مسجّل (نفس صلاحية القوايم في الواجهة القديمة). الكتابة من الواجهة القديمة.' })
  list() { return this.svc.list(); }

  @Get(':key')
  @ApiOperation({ summary: 'محتوى قايمة مرجعية', description: 'نفس شكل القايمة في الواجهة القديمة (DATA.<key>). المفتاح لازم يكون من النوع lookup في كتالوج البيانات، وغير كده 404.' })
  get(@Param('key') key: string) { return this.svc.get(key); }
}
