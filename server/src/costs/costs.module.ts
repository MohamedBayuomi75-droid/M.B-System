import { Module } from '@nestjs/common';
import { DataModule } from '../data/data.module';
import { CostsController, ProjectCostController } from './costs.controller';
import { CostsRepository } from './costs.repository';
import { CostsService } from './costs.service';

/** 8.8.3 (DEC-0142): التكاليف وتكلفة المشروع — القراية من legacy_records، والكتابة عبر DataService.sync */
@Module({ imports: [DataModule], controllers: [CostsController, ProjectCostController], providers: [CostsService, CostsRepository], exports: [CostsService] })
export class CostsModule {}
