import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser, RequirePerms } from '../authz/decorators';
import { Idempotent } from '../common/idempotency';
import { CreateDocumentTypeDto, CreateWorkflowDto, DecisionDto, SubmitDto } from './approvals.dto';
import { ApprovalsService } from './approvals.service';

/** إعداد محرك الاعتمادات — مدير النظام بس. مفيش أي إعداد افتراضي (B-01…B-08). */
@ApiTags('v1 approvals: config')
@ApiBearerAuth()
@RequirePerms({ flag: 'manageUsers' })
@Controller('v1/approvals/config')
export class ApprovalsConfigController {
  constructor(private readonly svc: ApprovalsService) {}
  @Get('document-types') documentTypes() { return this.svc.listDocumentTypes(); }
  @Post('document-types') @ApiOperation({ summary: 'نوع مستند خاضع للاعتماد (B-01)' })
  createDocumentType(@Body() dto: CreateDocumentTypeDto, @CurrentUser() u: AuthUser, @Req() req: Request) { return this.svc.createDocumentType(dto, u, req); }
  @Get('workflows') workflows(@Query('documentType') documentType?: string) { return this.svc.listWorkflows(documentType); }
  @Post('workflows') @ApiOperation({ summary: 'مسار اعتماد (نسخة جديدة) — المستويات والمعتمدين والنطاق وفصل المهام كلها إلزامية من الإعداد' })
  createWorkflow(@Body() dto: CreateWorkflowDto, @CurrentUser() u: AuthUser, @Req() req: Request) { return this.svc.createWorkflow(dto, u, req); }
}

/** التشغيل: إرسال، صندوق «بانتظار اعتمادي»، قرارات — القرارات والإرسال لازم Idempotency-Key */
@ApiTags('v1 approvals')
@ApiBearerAuth()
@Controller('v1/approvals')
export class ApprovalsController {
  constructor(private readonly svc: ApprovalsService) {}
  @Get('inbox') @ApiOperation({ summary: 'الطلبات بانتظار قراري' }) inbox(@CurrentUser() u: AuthUser) { return this.svc.inbox(u); }
  @Post('requests') @Idempotent() @ApiOperation({ summary: 'إرسال مستند للاعتماد' })
  submit(@Body() dto: SubmitDto, @CurrentUser() u: AuthUser, @Req() req: Request) { return this.svc.submit(dto, u, req); }
  @Get('requests/:id') get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthUser) { return this.svc.get(id, u); }
  @Post('requests/:id/approve') @HttpCode(200) @Idempotent()
  approve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DecisionDto, @CurrentUser() u: AuthUser, @Req() req: Request) { return this.svc.decide(id, 'approve', dto.comment, u, req); }
  @Post('requests/:id/reject') @HttpCode(200) @Idempotent()
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DecisionDto, @CurrentUser() u: AuthUser, @Req() req: Request) { return this.svc.decide(id, 'reject', dto.comment, u, req); }
  @Post('requests/:id/return') @HttpCode(200) @Idempotent()
  ret(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DecisionDto, @CurrentUser() u: AuthUser, @Req() req: Request) { return this.svc.decide(id, 'return', dto.comment, u, req); }
  @Post('requests/:id/withdraw') @HttpCode(200) @Idempotent()
  withdraw(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DecisionDto, @CurrentUser() u: AuthUser, @Req() req: Request) { return this.svc.close(id, 'withdraw', dto.comment, u, req); }
  @Post('requests/:id/cancel') @HttpCode(200) @Idempotent()
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DecisionDto, @CurrentUser() u: AuthUser, @Req() req: Request) { return this.svc.close(id, 'cancel', dto.comment, u, req); }
}
