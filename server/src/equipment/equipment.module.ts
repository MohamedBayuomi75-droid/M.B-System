import { Module } from '@nestjs/common';
import { DataModule } from '../data/data.module';
import { EquipmentController } from './equipment.controller';
import { EquipmentRepository } from './equipment.repository';
import { EquipmentService } from './equipment.service';

/** 8.7.3 (DEC-0139): المعدات ويومياتها — القراية من legacy_records، والكتابة عبر DataService.sync */
@Module({ imports: [DataModule], controllers: [EquipmentController], providers: [EquipmentService, EquipmentRepository] })
export class EquipmentModule {}
