import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChangesListenerService } from '../realtime/changes-listener.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { UsersModule } from '../users/users.module';
import { DataController } from './data.controller';
import { DataService } from './data.service';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [DataController],
  providers: [DataService, RealtimeGateway, ChangesListenerService],
  exports: [DataService],
})
export class DataModule {}
