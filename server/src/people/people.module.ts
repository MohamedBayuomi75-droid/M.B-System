import { Module } from '@nestjs/common';
import { DataModule } from '../data/data.module';
import { DriversController, SupervisorsController } from './people.controller';
import { PeopleRepository } from './people.repository';
import { PeopleService } from './people.service';

/** 8.2.4 (DEC-0123): المشرفين والسواقين — القراية من legacy_records، والكتابة عبر DataService.sync (معاملة واحدة، بنفس الصلاحيات وحماية الأجور) */
@Module({ imports: [DataModule], controllers: [SupervisorsController, DriversController], providers: [PeopleService, PeopleRepository] })
export class PeopleModule {}
