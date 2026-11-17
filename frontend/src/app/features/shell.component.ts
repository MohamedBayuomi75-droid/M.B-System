import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { legacyUrl, PAGE_ROUTES } from '../core/page-routes';
import { SessionService } from '../core/session.service';
import { NotificationsBellComponent } from './notifications-bell.component';

/** الهيكل: شريط علوي + قائمة جانبية (يمين — RTL) من جدول توجيه الصفحات، متفلترة بصلاحيات العرض */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatSidenavModule, MatListModule, MatIconModule, MatButtonModule, NotificationsBellComponent],
  template: `
    <mat-toolbar class="topbar">
      <span class="brand">النظام الموحد</span>
      <span class="spacer"></span>
      <span class="who" id="whoami">{{ me()?.name }} · {{ me()?.roleLabel }}</span>
      <app-notifications-bell />
      <a mat-button href="/legacy/" id="toLegacy">الواجهة الحالية</a>
      <button mat-button id="logoutBtn" (click)="logout()">خروج</button>
    </mat-toolbar>
    <mat-sidenav-container class="body">
      <mat-sidenav mode="side" opened position="start" class="nav">
        <mat-nav-list id="nav">
          <a mat-list-item routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"><mat-icon matListItemIcon>home</mat-icon><span matListItemTitle>الرئيسية</span></a>
          <a mat-list-item routerLink="/approvals" routerLinkActive="active" id="navApprovals"><mat-icon matListItemIcon>fact_check</mat-icon><span matListItemTitle>بانتظار اعتمادي</span></a>
          @if (me()?.permissions?.manageUsers || me()?.docActions?.approve) { <a mat-list-item routerLink="/taxes" routerLinkActive="active" id="navTaxes"><mat-icon matListItemIcon>percent</mat-icon><span matListItemTitle>الضرائب والاستقطاعات</span></a> }
          @for (p of pages(); track p.label) {
            @if (p.target === 'angular') {
              <a mat-list-item [routerLink]="p.path" routerLinkActive="active" [attr.data-page]="p.key"><mat-icon matListItemIcon>{{ p.icon }}</mat-icon><span matListItemTitle>{{ p.label }}</span></a>
            } @else {
              <a mat-list-item [href]="legacy(p.key)" [attr.data-legacy]="p.key"><mat-icon matListItemIcon>{{ p.icon }}</mat-icon><span matListItemTitle>{{ p.label }}</span><mat-icon matListItemMeta>open_in_new</mat-icon></a>
            }
          }
        </mat-nav-list>
      </mat-sidenav>
      <mat-sidenav-content class="content"><router-outlet /></mat-sidenav-content>
    </mat-sidenav-container>`,
})
export class ShellComponent {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  readonly me = this.session.me;
  readonly pages = computed(() => (this.me() ? PAGE_ROUTES.filter((p) => this.session.can(p.key, 'view')) : []));
  legacy = legacyUrl;
  async logout() { await this.session.logout(); await this.router.navigateByUrl('/login'); }
}
