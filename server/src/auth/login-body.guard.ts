import { BadRequestException, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { LoginDto } from './auth.dto';

/** الـ guards بتشتغل قبل الـ pipes، فـ passport-local كان هيشوف الـ body من غير تحقق → نتحقق هنا بنفس قواعد ValidationPipe. */
@Injectable()
export class LoginBodyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const dto = plainToInstance(LoginDto, req.body ?? {});
    const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length) throw new BadRequestException(errors.flatMap((e) => Object.values(e.constraints ?? {})));
    req.body = { username: dto.username, password: dto.password };
    return true;
  }
}
