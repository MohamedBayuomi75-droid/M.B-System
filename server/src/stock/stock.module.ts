import { Module } from '@nestjs/common';
import { ApprovalsModule } from '../approvals/approvals.module';
import { DataModule } from '../data/data.module';
import { StockController } from './stock.controller';
import { StockRepository } from './stock.repository';
import { StockService } from './stock.service';

/** المخازن — التسويات المخزنية المعتمدة (B-51) */
@Module({ imports: [ApprovalsModule, DataModule], controllers: [StockController], providers: [StockService, StockRepository] })
export class StockModule {}
