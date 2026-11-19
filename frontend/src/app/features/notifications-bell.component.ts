import { HttpClient } from '@angular/common/http';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { firstValueFrom } from 'rxjs';
import { AppNotification, NotificationList } from '../core/models';

/** جرس الإشعارات المخزّنة (المرحلة 5) — تحديث كل دقيقة، والإرسال بالبريد مؤجل للمرحلة 12 */
@Component({
  selector: 'app-notifications-bell',
  imports: [MatBadgeModule, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <button mat-icon-button id="bellBtn" [matMenuTriggerFor]="menu" (menuOpened)="load()" aria-label="الإشعارات">
      <mat-icon [matBadge]="unread() || null" matBadgeColor="warn" matBadgeSize="small" id="bellBadge" [attr.data-unread]="unread()">notifications</mat-icon>
    </button>
    <mat-menu #menu="matMenu" class="bell-menu">
      @for (n of items(); track n.id) {
        <div class="note" [class.unread]="!n.readAt" [attr.data-kind]="n.kind"><b>{{ n.title }}</b><br /><small>{{ n.body }}</small></div>
      } @empty { <div class="note muted">مفيش إشعارات</div> }
      @if (unread()) { <button mat-menu-item id="markAllRead" (click)="readAll()">تعليم الكل كمقروء</button> }
    </mat-menu>`,
})
export class NotificationsBellComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  readonly items = signal<AppNotification[]>([]); readonly unread = signal(0);
  private timer?: ReturnType<typeof setInterval>;
  ngOnInit() { void this.load(); this.timer = setInterval(() => void this.load(), 60_000); }
  ngOnDestroy() { clearInterval(this.timer); }
  async load() {
    try { const r = await firstValueFrom(this.http.get<NotificationList>('/api/v1/notifications')); this.items.set(r.items); this.unread.set(r.unread); } catch { /* الجرس مش حرج */ }
  }
  async readAll() { await firstValueFrom(this.http.post('/api/v1/notifications/all/read', {})); await this.load(); }
}
