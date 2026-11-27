import { Module } from '@nestjs/common';
import { DataModule } from '../data/data.module';
import { DuesController } from './dues.controller';
import { DuesRepository } from './dues.repository';
import { DuesService } from './dues.service';

/** 8.6.3 (DEC-0137): المستحقات والصرف — القراية من legacy_records، والكتابة عبر DataService.sync */
@Module({ imports: [DataModule], controllers: [DuesController], providers: [DuesService, DuesRepository] })
export class DuesModule {}
