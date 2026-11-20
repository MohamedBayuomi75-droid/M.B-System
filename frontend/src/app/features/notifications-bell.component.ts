import { HttpClient } from '@angular/common/http';
import { Component, HostListener, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppNotification, NotificationList } from '../core/models';

/**
 * جرس الإشعارات المخزّنة (المرحلة 5) — تحديث كل دقيقة، والإرسال بالبريد مؤجل للمرحلة 12.
 * بكلاسات الواجهة القديمة (DEC-0093: الترويسة بشكل القديمة): زرار vc-btn، والعدد nav-badge، والقايمة لوحة بسيطة.
 */
@Component({
  selector: 'app-notifications-bell',
  template: `
    <span style="position:relative;display:inline-flex;">
      <button type="button" class="vc-btn" id="bellBtn" aria-label="الإشعارات" [attr.aria-expanded]="open()" (click)="toggle($event)">
        🔔<span id="bellBadge" [attr.data-unread]="unread()">@if (unread()) { <span class="nav-badge">{{ unread() > 99 ? '99+' : unread() }}</span> }</span>
      </button>
      @if (open()) {
        <div class="bell-panel" role="menu" (click)="$event.stopPropagation()">
          @for (n of items(); track n.id) {
            <div class="bell-note" [class.unread]="!n.readAt" [attr.data-kind]="n.kind"><b>{{ n.title }}</b><br /><small>{{ n.body }}</small></div>
          } @empty { <div class="bell-note" style="color:var(--ink-soft);">مفيش إشعارات</div> }
          @if (unread()) { <button type="button" class="btn btn-outline btn-sm" id="markAllRead" style="width:100%;margin-top:6px;" (click)="readAll()">تعليم الكل كمقروء</button> }
        </div>
      }
    </span>`,
  styles: [`
    .bell-panel { position: absolute; top: calc(100% + 6px); inset-inline-end: 0; z-index: 900; width: 300px; max-height: 360px; overflow: auto;
      background: var(--card, #fff); border: 1px solid var(--line, #e3dfd3); border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.12); padding: 8px; }
    .bell-note { padding: 8px 10px; border-bottom: 1px solid var(--line, #e3dfd3); font-size: 13px; text-align: start; }
    .bell-note.unread { background: var(--paper-2, #efe7d3); }
  `],
})
export class NotificationsBellComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  readonly items = signal<AppNotification[]>([]); readonly unread = signal(0); readonly open = signal(false);
  private timer?: ReturnType<typeof setInterval>;
  ngOnInit() { void this.load(); this.timer = setInterval(() => void this.load(), 60_000); }
  ngOnDestroy() { clearInterval(this.timer); }
  toggle(e: Event) { e.stopPropagation(); this.open.update((v) => !v); if (this.open()) void this.load(); }
  @HostListener('document:click') close() { this.open.set(false); }
  async load() {
    try { const r = await firstValueFrom(this.http.get<NotificationList>('/api/v1/notifications')); this.items.set(r.items); this.unread.set(r.unread); } catch { /* الجرس مش حرج */ }
  }
  async readAll() { await firstValueFrom(this.http.post('/api/v1/notifications/all/read', {})); await this.load(); }
}
