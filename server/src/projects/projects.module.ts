import { Module } from '@nestjs/common';
import { DataModule } from '../data/data.module';
import { ProjectsController } from './projects.controller';
import { ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';

/** 7.4.4 (DEC-0117): المشروعات — القراءة من legacy_records، والكتابة عبر DataService.sync (معاملة واحدة مع نشر الاسم) */
@Module({ imports: [DataModule], controllers: [ProjectsController], providers: [ProjectsService, ProjectsRepository], exports: [ProjectsService] })
export class ProjectsModule {}
