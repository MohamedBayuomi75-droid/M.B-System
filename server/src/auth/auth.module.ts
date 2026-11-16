import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthzModule } from '../authz/authz.module';
import { UsersModule } from '../users/users.module';
import { AuthConfig } from './auth.config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BootstrapAdminService } from './bootstrap-admin.service';
import { LoginBodyGuard } from './login-body.guard';
import { LoginThrottlerGuard } from './login-throttler.guard';
import { JwtStrategy, LocalStrategy } from './strategies';

@Module({
  imports: [
    UsersModule,
    AuthzModule,
    PassportModule,
    ThrottlerModule.forRoot({ throttlers: [{ name: 'default', ttl: 60_000, limit: Number(process.env.LOGIN_RATE_LIMIT_PER_MIN || 5) }] }),
    JwtModule.registerAsync({
      extraProviders: [AuthConfig],
      inject: [AuthConfig],
      useFactory: (cfg: AuthConfig) => ({ secret: cfg.jwtSecret, signOptions: { algorithm: 'HS256', expiresIn: cfg.accessTtlSec } }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthConfig, AuthService, LocalStrategy, JwtStrategy, LoginThrottlerGuard, LoginBodyGuard, BootstrapAdminService],
  exports: [AuthConfig, JwtModule],
})
export class AuthModule {}
