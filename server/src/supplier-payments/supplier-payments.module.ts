import { Module } from '@nestjs/common';
import { DataModule } from '../data/data.module';
import { SupplierPaymentsController } from './supplier-payments.controller';
import { SupplierPaymentsService } from './supplier-payments.service';

/** 7.3.4: دفعات الموردين والتخصيص والرصيد — الكتابة عبر DataService.sync (معاملة واحدة) */
@Module({ imports: [DataModule], controllers: [SupplierPaymentsController], providers: [SupplierPaymentsService] })
export class SupplierPaymentsModule {}
