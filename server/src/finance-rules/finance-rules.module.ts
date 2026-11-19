import { Module } from '@nestjs/common';
import { FormulasController } from './formulas.controller';
import { FormulasRepository } from './formulas.repository';
import { FormulasService } from './formulas.service';
import { TaxesController } from './taxes.controller';
import { TaxesRepository } from './taxes.repository';
import { TaxesService } from './taxes.service';

/** محرك القواعد المالية (B-20): المعادلات بإصدارات (formulas) + الضرائب والاستقطاعات والدمغات (B-21). */
@Module({ controllers: [TaxesController, FormulasController], providers: [TaxesService, TaxesRepository, FormulasService, FormulasRepository], exports: [TaxesService, FormulasService] })
export class FinanceRulesModule {}
