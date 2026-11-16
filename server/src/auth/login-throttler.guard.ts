import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/** حد محاولات الدخول لكل (IP + اسم مستخدم) — الخطة A2: 5/دقيقة. الذاكرة (instance واحد) — Redis لو اتعمل scale. */
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const r = req as Request;
    const user = String((r.body as Record<string, unknown>)?.username ?? '').trim().toLowerCase().slice(0, 64);
    return `${r.ip}|${user}`;
  }
}
