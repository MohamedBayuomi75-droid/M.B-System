import { Module } from '@nestjs/common';
import { PasswordService } from '../auth/password.service';
import { MeController } from './me.controller';
import { SessionsService } from './sessions.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController, MeController],
  providers: [UsersService, SessionsService, PasswordService],
  exports: [UsersService, SessionsService, PasswordService],
})
export class UsersModule {}
