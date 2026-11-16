import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy as JwtStrategyBase } from 'passport-jwt';
import { Strategy as LocalStrategyBase } from 'passport-local';
import { SessionsService } from '../users/sessions.service';
import { UsersService } from '../users/users.service';
import { AuthConfig } from './auth.config';
import { AuthService } from './auth.service';
import { AccessTokenPayload, AuthUser } from './auth.types';

/** POST /api/auth/login — اسم مستخدم + كلمة مرور */
@Injectable()
export class LocalStrategy extends PassportStrategy(LocalStrategyBase, 'local') {
  constructor(private readonly auth: AuthService) {
    super({ usernameField: 'username', passwordField: 'password', passReqToCallback: true });
  }
  validate(req: Request, username: string, password: string) {
    return this.auth.validateCredentials(username, password, req);
  }
}

/** Authorization: Bearer <jwt> — المستخدم بيتحمّل من الداتابيز في كل طلب (تعطيل/تغيير صلاحيات بيسري فورًا) */
@Injectable()
export class JwtStrategy extends PassportStrategy(JwtStrategyBase, 'jwt') {
  constructor(cfg: AuthConfig, private readonly users: UsersService, private readonly sessions: SessionsService) {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: cfg.jwtSecret, algorithms: ['HS256'], ignoreExpiration: false });
  }
  async validate(payload: AccessTokenPayload): Promise<AuthUser | false> {
    if (!payload?.sub || typeof payload.tv !== 'number' || !payload.sid) return false;
    const user = await this.users.loadAuthUser(payload.sub);
    if (!user || user.tokenVersion !== payload.tv) return false;
    if (!(await this.sessions.isActive(payload.sid))) return false; // logout من الجهاز ده بيسري فورًا
    return { ...user, sessionId: payload.sid };
  }
}
