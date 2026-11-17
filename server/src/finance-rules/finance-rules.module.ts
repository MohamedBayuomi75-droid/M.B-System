import { Module } from '@nestjs/common';
import { TaxesController } from './taxes.controller';
import { TaxesRepository } from './taxes.repository';
import { TaxesService } from './taxes.service';

/** محرك القواعد المالية (B-20). العائلة الأولى: الضرائب والاستقطاعات والدمغات (B-21). */
@Module({ controllers: [TaxesController], providers: [TaxesService, TaxesRepository], exports: [TaxesService] })
export class FinanceRulesModule {}
