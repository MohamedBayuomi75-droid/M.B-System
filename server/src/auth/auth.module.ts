import { Module } from '@nestjs/common';
import { PasswordService } from './password.service';

/** A1: خدمة كلمات المرور بس. A2 يضيف Passport (local + JWT) والـ refresh tokens. */
@Module({ providers: [PasswordService], exports: [PasswordService] })
export class AuthModule {}
