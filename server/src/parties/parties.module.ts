import { Module } from '@nestjs/common';
import { DataModule } from '../data/data.module';
import { CustomersController, SuppliersController } from './parties.controller';
import { PartiesRepository } from './parties.repository';
import { PartiesService } from './parties.service';

/** المرحلة 6.1: الموردين والعملاء (بيانات أساسية) — Controller ← Service ← Repository، والكتابة عبر DataService.sync */
@Module({ imports: [DataModule], controllers: [SuppliersController, CustomersController], providers: [PartiesService, PartiesRepository] })
export class PartiesModule {}
