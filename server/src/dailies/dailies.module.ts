import { Module } from '@nestjs/common';
import { DataModule } from '../data/data.module';
import { AttendanceController, DailiesController } from './dailies.controller';
import { DailiesRepository } from './dailies.repository';
import { DailiesService } from './dailies.service';

/** 8.5.4 (DEC-0135): اليوميات وحضور الموظفين — القراية من legacy_records، والكتابة عبر DataService.sync */
@Module({ imports: [DataModule], controllers: [DailiesController, AttendanceController], providers: [DailiesService, DailiesRepository] })
export class DailiesModule {}
