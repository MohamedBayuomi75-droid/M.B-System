import { Module } from '@nestjs/common';
import { DataModule } from '../data/data.module';
import { LeavesModule } from '../leaves/leaves.module';
import { WorkersController } from './workers.controller';
import { WorkersRepository } from './workers.repository';
import { WorkersService } from './workers.service';

/** 8.1.4 (DEC-0121): العمال — القراية من legacy_records، والكتابة عبر DataService.sync (معاملة واحدة، بنفس الصلاحيات وحماية الأجور) */
@Module({ imports: [DataModule, LeavesModule], controllers: [WorkersController], providers: [WorkersService, WorkersRepository] })
export class WorkersModule {}
