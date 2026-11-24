import { Module } from '@nestjs/common';
import { DataModule } from '../data/data.module';
import { DriversController, EmployeesController, SupervisorsController } from './people.controller';
import { PeopleRepository } from './people.repository';
import { PeopleService } from './people.service';

/** 8.2.4 (DEC-0123) و8.3.4 (DEC-0125): المشرفين والسواقين والموظفين — القراية من legacy_records، والكتابة عبر DataService.sync (معاملة واحدة، بنفس الصلاحيات وحماية الأجور) */
@Module({ imports: [DataModule], controllers: [SupervisorsController, DriversController, EmployeesController], providers: [PeopleService, PeopleRepository] })
export class PeopleModule {}
