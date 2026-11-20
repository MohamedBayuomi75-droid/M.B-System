import { Module } from '@nestjs/common';
import { ReferenceController } from './reference.controller';
import { ReferenceRepository } from './reference.repository';
import { ReferenceService } from './reference.service';

/** البيانات المرجعية المشتركة (المرحلة 5، البند 5.3): Controller ← Service ← Repository — قراءة بس */
@Module({ controllers: [ReferenceController], providers: [ReferenceService, ReferenceRepository], exports: [ReferenceService] })
export class ReferenceModule {}
