import { Module } from '@nestjs/common';
import { DataModule } from '../data/data.module';
import { WarehousesController } from './warehouses.controller';
import { WarehousesRepository } from './warehouses.repository';
import { WarehousesService } from './warehouses.service';

/** 6.2-ب: المخازن — Controller ← Service ← Repository، والكتابة عبر DataService.sync */
@Module({ imports: [DataModule], controllers: [WarehousesController], providers: [WarehousesService, WarehousesRepository] })
export class WarehousesModule {}
