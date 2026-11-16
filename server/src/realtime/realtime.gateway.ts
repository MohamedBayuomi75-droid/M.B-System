import { Logger, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AccessTokenPayload, AuthUser } from '../auth/auth.types';
import { ChangeRow, DataService } from '../data/data.service';
import { permissionSignature } from '../data/policy';
import { DomainEvents } from '../events/domain-events';
import { SessionsService } from '../users/sessions.service';
import { UsersService } from '../users/users.service';

interface SocketState { user: AuthUser; sig: string; reauthPending: boolean }
const REVALIDATE_MS = Number(process.env.REALTIME_REVALIDATE_MS || 30_000);

/**
 * WS /api/stream (Socket.IO) — UNIFIED-WEB-PLAN A3.
 *  - التوثيق بالـ JWT عند الاتصال (handshake.auth.token) + إعادة توثيق بـ 'reauth' بعد تجديد التوكن.
 *  - كل تغيير بيتبعت كـ 'change' {seq, kind, collection, id, op, rev, data} بعد فلترة الصلاحيات ونطاق المشاريع والحقول المحمية
 *    لكل مجموعة مستخدمين بنفس توقيع الصلاحيات (بيتحسب مرة واحدة للمجموعة).
 *  - 'resync' لما صلاحيات المستخدم تتغيّر (العميل يعمل bootstrap من جديد).
 */
// serveClient: الواجهة بتحمّل /api/stream/socket.io.js من نفس السيرفر (نفس الأصل، من غير CDN)
@WebSocketGateway({ path: '/api/stream', cors: { origin: false }, serveClient: true })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  private readonly log = new Logger(RealtimeGateway.name);
  @WebSocketServer() server: Server;
  private timer?: NodeJS.Timeout;
  private offUserChanged?: () => void;

  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly sessions: SessionsService,
    private readonly data: DataService,
    private readonly events: DomainEvents,
  ) {}

  afterInit() {
    this.timer = setInterval(() => void this.revalidateAll(), REVALIDATE_MS);
    this.timer.unref();
    this.offUserChanged = this.events.on('user.changed', (id) => void this.revalidateUser(id));
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.offUserChanged?.();
  }

  private state(s: Socket): SocketState | undefined {
    return s.data as SocketState | undefined;
  }

  private async authenticate(token: unknown): Promise<AuthUser | null> {
    if (typeof token !== 'string' || !token) return null;
    try {
      const p = await this.jwt.verifyAsync<AccessTokenPayload>(token, { algorithms: ['HS256'] });
      const user = await this.users.loadAuthUser(p.sub);
      if (!user || user.tokenVersion !== p.tv || !(await this.sessions.isActive(p.sid))) return null;
      return { ...user, sessionId: p.sid };
    } catch {
      return null;
    }
  }

  async handleConnection(socket: Socket) {
    const raw = socket.handshake.auth?.token ?? String(socket.handshake.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    const user = await this.authenticate(raw);
    if (!user || user.mustChangePassword) {
      socket.emit('auth_error', { code: user ? 'PASSWORD_CHANGE_REQUIRED' : 'UNAUTHENTICATED' });
      socket.disconnect(true);
      return;
    }
    Object.assign(socket.data, { user, sig: permissionSignature(user), reauthPending: false } satisfies SocketState);
    socket.join(`user:${user.id}`);
    socket.emit('ready', { userId: user.id });
  }

  handleDisconnect() { /* لا شيء */ }

  /** بعد تجديد الـ access token العميل يبعت التوكن الجديد (الجلسة القديمة اتدوّرت) */
  @SubscribeMessage('reauth')
  async reauth(socket: Socket, payload: { token?: string }) {
    const user = await this.authenticate(payload?.token);
    const st = this.state(socket);
    if (!user || !st || user.id !== st.user.id) {
      socket.emit('auth_error', { code: 'UNAUTHENTICATED' });
      socket.disconnect(true);
      return { ok: false };
    }
    const sig = permissionSignature(user);
    if (sig !== st.sig) socket.emit('resync', { reason: 'permissions_changed' });
    Object.assign(socket.data, { user, sig, reauthPending: false });
    return { ok: true };
  }

  /** بث صفوف changes (من الـ listener) — فلترة مرة واحدة لكل توقيع صلاحيات */
  broadcast(rows: ChangeRow[]) {
    if (!rows.length || !this.server) return;
    const groups = new Map<string, { user: AuthUser; sockets: Socket[] }>();
    for (const s of this.server.sockets.sockets.values()) {
      const st = this.state(s);
      if (!st?.user) continue;
      const g = groups.get(st.sig) ?? { user: st.user, sockets: [] };
      g.sockets.push(s);
      groups.set(st.sig, g);
    }
    for (const g of groups.values()) {
      const events = this.data.toEvents(rows, g.user);
      for (const s of g.sockets) for (const e of events) s.emit('change', e);
    }
  }

  private async revalidateSocket(s: Socket) {
    const st = this.state(s);
    if (!st?.user) return;
    const user = await this.users.loadAuthUser(st.user.id);
    if (!user || user.tokenVersion !== st.user.tokenVersion || user.mustChangePassword) {
      s.emit('auth_error', { code: 'UNAUTHENTICATED' });
      s.disconnect(true);
      return;
    }
    if (st.user.sessionId && !(await this.sessions.isActive(st.user.sessionId))) {
      // الجلسة اتدوّرت (refresh) أو اتلغت: فرصة واحدة لـ reauth قبل الفصل
      if (st.reauthPending) { s.emit('auth_error', { code: 'SESSION_ENDED' }); s.disconnect(true); return; }
      st.reauthPending = true;
      s.emit('reauth_required', {});
    }
    const sig = permissionSignature(user);
    if (sig !== st.sig) s.emit('resync', { reason: 'permissions_changed' });
    Object.assign(s.data, { user: { ...user, sessionId: st.user.sessionId }, sig });
  }

  async revalidateAll() {
    if (!this.server) return;
    for (const s of this.server.sockets.sockets.values()) await this.revalidateSocket(s).catch((e) => this.log.warn(`revalidate failed: ${e.message}`));
  }

  async revalidateUser(userId: string) {
    if (!this.server) return;
    const sockets = await this.server.in(`user:${userId}`).fetchSockets();
    for (const rs of sockets) {
      const s = this.server.sockets.sockets.get(rs.id);
      if (s) await this.revalidateSocket(s).catch(() => undefined);
    }
  }

  connectedCount(): number {
    return this.server?.sockets.sockets.size ?? 0;
  }
}
