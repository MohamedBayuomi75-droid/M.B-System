import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { LEGACY_NAV, LegacyNavSection } from '../core/legacy-nav';
import { legacyUrl, PAGE_ROUTES } from '../core/page-routes';
import { SessionService } from '../core/session.service';
import { NotificationsBellComponent } from './notifications-bell.component';

/** رابط صفحة من أقسام الواجهة القديمة: الصفحة اللي اتنقلت لـ Angular بتفتح هنا، والباقي في الواجهة القديمة بنفس الجلسة */
interface NavLink { key: string; label: string; path?: string; href?: string }
/** صفحات Angular الجديدة اللي مالهاش مقابل في الواجهة القديمة ← القسم اللي بتظهر فيه */
const EXTRA_PAGES: { id: string; section: string; label: string; path: string; key: string; show: 'all' | 'finance' }[] = [
  { id: 'navProjects', section: 'clients', label: 'المشروعات (تجريبي)', path: '/projects', key: 'projects', show: 'all' },
  { id: 'navTaxes', section: 'settings', label: 'الضرائب والاستقطاعات', path: '/taxes', key: '', show: 'finance' },
  { id: 'navFormulas', section: 'settings', label: 'إدارة القواعد المالية', path: '/formulas', key: '', show: 'finance' },
];
const ROLE_LABEL: Record<string, string> = { admin: 'مدير', hr: 'موارد بشرية', payroll: 'رواتب' };

/**
 * الهيكل بنفس شكل الواجهة القديمة (DEC-0093 أ — renderer/core/app.js render() وmodules.js renderNav()):
 * الترويسة (اللوجو والاسم والمستخدم وأدوات العرض)، وصف الأقسام، وصف صفحات القسم، والكلاسات نفسها من legacy-skin.css.
 * - القسم اللي فيه صفحة اتنقلت لـ Angular بيعرض صف صفحاته هنا. وباقي الأقسام بتفتح لوحتها في الواجهة القديمة
 *   (اللوحات ماتنقلتش) — فرق متسجّل في docs/modules/PARTIES_VISUAL_PARITY.md.
 * - صفحات Angular اللي مالهاش مقابل في القديمة (الاعتمادات، والضرائب، والقواعد المالية، والمشروعات التجريبية) في أقسامها.
 * - الشاشات المطابقة (route data: skin = 'legacy') بتلبس كلاسات الواجهة القديمة (.lx)، وباقي صفحات Angular زي ما هي.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, NotificationsBellComponent],
  template: `
    <div class="lx-root" [class]="'lx-root ' + bodyClass()" [class.density-compact]="density() === 0" [class.density-wide]="density() === 2">
      <div class="lx"><div class="app shell-head">
        <div class="top">
          <div class="brand">
            <img class="mark-logo" src="/legacy/assets/logo.png" alt="" style="width:52px;height:52px" />
            <div><h1>النظام الموحد</h1><p>نظام واحد — موارد بشرية · موردون · عملاء · مخازن · حسابات</p></div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="offline-badge" id="whoami">👤 {{ me()?.name }} — {{ roleLabel() }}</span>
            <button type="button" class="btn btn-outline btn-sm" id="logoutBtn" (click)="logout()">خروج</button>
            <a class="btn btn-outline btn-sm" href="/legacy/" id="toLegacy">الواجهة الحالية</a>
            <a class="btn btn-outline btn-sm" routerLink="/approvals" id="navApprovals">بانتظار اعتمادي</a>
            <app-notifications-bell />
            <div class="view-controls" title="أدوات العرض">
              <div class="vc-group" title="كثافة العرض">
                <button type="button" class="vc-btn" [class.active]="density() === 0" (click)="setDensity(0)">مضغوط</button>
                <button type="button" class="vc-btn" [class.active]="density() === 1" (click)="setDensity(1)">عادي</button>
                <button type="button" class="vc-btn" [class.active]="density() === 2" (click)="setDensity(2)">واسع</button>
              </div>
              <span class="vc-sep" aria-hidden="true"></span>
              <div class="vc-group vc-zoom" title="التكبير">
                <button type="button" class="vc-btn vc-zoom-btn" id="zoomOutBtn" (click)="setZoom(zoom() - 0.1)" title="تصغير">−</button>
                <span class="vc-zoom-val" id="zoomLevelLabel">{{ zoomPct() }}%</span>
                <button type="button" class="vc-btn vc-zoom-btn" id="zoomInBtn" (click)="setZoom(zoom() + 0.1)" title="تكبير">+</button>
              </div>
            </div>
          </div>
        </div>
        <div id="nav">
          <nav class="nav nav-sections">
            @for (s of sections(); track s.id) {
              @let l = sectionLink(s);
              @if (l.path) { <a class="nav-btn" [class.active]="s.id === current()?.id" [routerLink]="l.path" [attr.data-page]="l.key" [attr.data-section]="s.id">{{ s.label }}</a> }
              @else { <a class="nav-btn" [class.active]="s.id === current()?.id" [href]="l.href" [attr.data-legacy]="l.key" [attr.data-section]="s.id">{{ s.label }}</a> }
            }
          </nav>
          @if (pagesRow().length > 1) {
            <nav class="nav nav-pages">
              @for (p of pagesRow(); track p.label) {
                @if (p.path) { <a class="nav-btn" [class.active]="p.path === url()" [routerLink]="p.path" [attr.data-page]="p.key" [attr.id]="extraId(p)">{{ p.label }}</a> }
                @else { <a class="nav-btn" [href]="p.href" [attr.data-legacy]="p.key">{{ p.label }}</a> }
              }
            </nav>
          }
        </div>
      </div></div>
      <div [class.lx]="skin()"><div class="app shell-body" [style.zoom]="zoom()"><router-outlet /></div></div>
    </div>`,
  styles: [`
    .shell-head { padding-bottom: 0; }
    .shell-body { padding-top: 6px; }
    :host ::ng-deep .lx-root { min-height: 100vh; }
  `],
})
export class ShellComponent {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly me = this.session.me;
  readonly roleLabel = computed(() => ROLE_LABEL[this.me()?.role ?? ''] ?? 'مستخدم');

  // الصفحة الحالية (route data: page / skin) — بتتحدّث مع كل تنقّل
  private readonly leaf = toSignal(this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.deepest())), { initialValue: this.deepest() });
  readonly url = computed(() => this.leaf().url);
  readonly skin = computed(() => this.leaf().skin === 'legacy');
  /** كلاس الـ body اللي الواجهة القديمة بتحطه للقسم (مثلًا module-ledger لصفحات دفتر الموردين — app.js:231) */
  readonly bodyClass = computed(() => this.leaf().bodyClass ?? '');

  private deepest() {
    let r = this.route.snapshot; while (r.firstChild) r = r.firstChild;
    return { url: '/' + r.pathFromRoot.flatMap((x) => x.url.map((u) => u.path)).filter(Boolean).join('/'), page: r.data['page'] as string | undefined, skin: r.data['skin'] as string | undefined, bodyClass: r.data['bodyClass'] as string | undefined };
  }
  private visible(key: string) { return !!this.me() && this.session.can(key, 'view'); }
  private finance() { const m = this.me(); return !!(m?.permissions?.manageUsers || m?.docActions?.approve); }

  /** رابط صفحة: Angular لو اتنقلت (جدول التوجيه)، وإلا الواجهة القديمة */
  private link(key: string, label: string): NavLink {
    const a = PAGE_ROUTES.find((p) => p.key === key && p.target === 'angular' && !p.pilot);
    return a ? { key, label, path: a.path } : { key, label, href: legacyUrl(key) };
  }
  private pagesOf(s: LegacyNavSection): NavLink[] {
    const pages = s.pages.filter(([k]) => k !== 'hrHome' && this.visible(k)).map(([k, l]) => this.link(k, l));
    const extra = EXTRA_PAGES.filter((x) => x.section === s.id && (x.show === 'finance' ? this.finance() : this.visible(x.key))).map((x) => ({ key: x.key, label: x.label, path: x.path }));
    return [...pages, ...extra];
  }
  readonly sections = computed(() => (this.me() ? LEGACY_NAV.filter((s) => s.pages.some(([k]) => this.visible(k)) || (s.id === 'settings' && this.finance())) : []));
  /** القسم الحالي: القسم اللي فيه الصفحة المفتوحة */
  readonly current = computed(() => {
    const url = this.url(); const page = this.leaf().page;
    return this.sections().find((s) => this.pagesOf(s).some((p) => (p.path && p.path === url) || (!!page && p.key === page && !!p.path)));
  });
  readonly pagesRow = computed(() => { const s = this.current(); return s ? this.pagesOf(s) : []; });
  /** زر القسم: لو فيه صفحة Angular يفتح أول صفحة Angular فيه، وإلا لوحة القسم (أو صفحته الوحيدة) في الواجهة القديمة */
  sectionLink(s: LegacyNavSection): NavLink {
    const pages = this.pagesOf(s);
    const ng = pages.find((p) => p.path);
    if (ng) return ng;
    const hasHome = !['settings', 'general', 'tasks'].includes(s.id) && pages.length > 1;
    if (hasHome) { const key = s.id === 'hr' ? 'hrHome' : `home_${s.id}`; return { key, label: s.label, href: legacyUrl(key) }; }
    return pages[0] ?? { key: '', label: s.label, href: '/legacy/' };
  }
  extraId(p: NavLink) { return EXTRA_PAGES.find((x) => x.path === p.path)?.id ?? null; }

  // أدوات العرض: نفس مفاتيح التخزين بتاعة الواجهة القديمة (uiDensity / uiZoom)، فالإعداد واحد في الواجهتين
  readonly density = signal(this.readNum('uiDensity', 1, (n) => n === 0 || n === 1 || n === 2));
  readonly zoom = signal(this.readNum('uiZoom', 1, (n) => n >= 0.5 && n <= 1.4));
  readonly zoomPct = computed(() => Math.round(this.zoom() * 100));
  setDensity(n: number) { this.density.set(n); this.store('uiDensity', n); }
  setZoom(z: number) { const v = Math.min(1.4, Math.max(0.5, Math.round(z * 10) / 10)); this.zoom.set(v); this.store('uiZoom', v); }
  private readNum(k: string, d: number, okFn: (n: number) => boolean) { try { const n = parseFloat(localStorage.getItem(k) ?? ''); return Number.isFinite(n) && okFn(n) ? n : d; } catch { return d; } }
  private store(k: string, v: number) { try { localStorage.setItem(k, String(v)); } catch { /* تخزين المتصفح مقفول: الإعداد للجلسة دي بس */ } }

  async logout() { await this.session.logout(); await this.router.navigateByUrl('/login'); }
}
