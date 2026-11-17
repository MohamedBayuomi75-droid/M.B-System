import { Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../authz/decorators';
import { AttachmentDto, AttachmentOwnerQueryDto } from './attachments.dto';
import { AttachmentsService, maxUploadBytes } from './attachments.service';

@ApiTags('attachments')
@ApiBearerAuth()
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly svc: AttachmentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { /* من غير dest = الذاكرة (multer MemoryStorage) */ limits: { fileSize: maxUploadBytes() + 1, files: 1, fields: 0, parts: 2, headerPairs: 50 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] } })
  @ApiOperation({ summary: 'رفع مرفق لسجل', description: 'PDF/JPG/PNG/DOCX/XLSX حتى 25MB. النوع من محتوى الملف، والمحتوى بيتفحص. الصلاحية = تعديل السجل المالك.' })
  @ApiOkResponse({ type: AttachmentDto })
  upload(@CurrentUser() user: AuthUser, @Query() q: AttachmentOwnerQueryDto, @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined, @Req() req: Request): Promise<AttachmentDto> {
    return this.svc.upload(user, q.collection, q.recordId, file, req, q.replaces);
  }

  @Get()
  @ApiOperation({ summary: 'مرفقات سجل (آخر إصدار من كل مستند)' })
  @ApiOkResponse({ type: [AttachmentDto] })
  list(@CurrentUser() user: AuthUser, @Query() q: AttachmentOwnerQueryDto): Promise<AttachmentDto[]> {
    return this.svc.list(user, q.collection, q.recordId);
  }

  @Get('versions')
  @ApiOperation({ summary: 'كل إصدارات مرفقات سجل (المرحلة 5)' })
  @ApiOkResponse({ type: [AttachmentDto] })
  versions(@CurrentUser() user: AuthUser, @Query() q: AttachmentOwnerQueryDto): Promise<AttachmentDto[]> {
    return this.svc.list(user, q.collection, q.recordId, true);
  }

  @Get(':id/content')
  @ApiOperation({ summary: 'تنزيل مرفق', description: 'دايمًا كتنزيل (attachment) بنوعه الفعلي ومن غير تنفيذ في المتصفح.' })
  async download(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request, @Res() res: Response): Promise<void> {
    const { meta, content } = await this.svc.content(user, id, req);
    res.setHeader('Content-Type', meta.mime);
    res.setHeader('Content-Length', String(content.length));
    res.setHeader('Content-Disposition', `attachment; filename="${meta.filename.replace(/[^\x20-\x7e]|"/g, '_')}"; filename*=UTF-8''${encodeURIComponent(meta.filename)}`);
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('X-Content-SHA256', meta.sha256);
    res.end(content);
  }
}
