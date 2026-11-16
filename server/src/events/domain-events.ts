import { Global, Injectable, Module } from '@nestjs/common';
import { EventEmitter } from 'node:events';

export interface DomainEventMap {
  /** صلاحيات/حالة/جلسات مستخدم اتغيّرت (بعد الـ commit) */
  'user.changed': string;
}

/** أحداث داخلية بين الموديولات (in-process). */
@Injectable()
export class DomainEvents {
  private readonly ee = new EventEmitter();
  emit<K extends keyof DomainEventMap>(k: K, payload: DomainEventMap[K]) { this.ee.emit(k, payload); }
  on<K extends keyof DomainEventMap>(k: K, fn: (p: DomainEventMap[K]) => void) { this.ee.on(k, fn); return () => this.ee.off(k, fn); }
}

@Global()
@Module({ providers: [DomainEvents], exports: [DomainEvents] })
export class EventsModule {}
