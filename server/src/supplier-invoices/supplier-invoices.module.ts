import { Module } from '@nestjs/common';
import { DataModule } from '../data/data.module';
import { SupplierInvoicesController } from './supplier-invoices.controller';
import { SupplierInvoicesRepository } from './supplier-invoices.repository';
import { SupplierInvoicesService } from './supplier-invoices.service';

/** 7.2.4: فواتير ومرتجعات الموردين — Controller ← Service ← Repository، والكتابة عبر DataService.sync (معاملة واحدة) */
@Module({ imports: [DataModule], controllers: [SupplierInvoicesController], providers: [SupplierInvoicesService, SupplierInvoicesRepository] })
export class SupplierInvoicesModule {}
