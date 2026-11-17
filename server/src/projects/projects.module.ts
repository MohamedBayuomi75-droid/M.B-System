import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';

/** موديول تجريبي للبنية الجديدة (المرحلة 4.2): Controller ← Service ← Repository ← PostgreSQL — قراءة بس */
@Module({ controllers: [ProjectsController], providers: [ProjectsService, ProjectsRepository], exports: [ProjectsService] })
export class ProjectsModule {}
