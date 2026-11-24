import { Module } from '@nestjs/common';
import { DataModule } from '../data/data.module';
import { LeavesController } from './leaves.controller';
import { LeavesRepository } from './leaves.repository';
import { LeavesService } from './leaves.service';

/** 8.4.4 (DEC-0127): الإجازات — القراية من legacy_records، والكتابة عبر DataService.sync (معاملة واحدة، ومعاها مزامنة حالة الأشخاص). LeavesService متصدّر علشان صفحات الأشخاص تنادي ensureToday */
@Module({ imports: [DataModule], controllers: [LeavesController], providers: [LeavesService, LeavesRepository], exports: [LeavesService] })
export class LeavesModule {}
