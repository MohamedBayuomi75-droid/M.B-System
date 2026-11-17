import { Module } from '@nestjs/common';
import { IdempotencyInterceptor } from '../common/idempotency';
import { ApprovalsConfigController, ApprovalsController } from './approvals.controller';
import { ApprovalsRepository } from './approvals.repository';
import { ApprovalsService } from './approvals.service';

@Module({ controllers: [ApprovalsConfigController, ApprovalsController], providers: [ApprovalsService, ApprovalsRepository, IdempotencyInterceptor], exports: [ApprovalsService] })
export class ApprovalsModule {}
