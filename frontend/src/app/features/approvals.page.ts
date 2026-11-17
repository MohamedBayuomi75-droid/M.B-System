import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { firstValueFrom } from 'rxjs';
import { InboxItem } from '../core/models';
import { formatMoney } from '../core/money';
import { errorMessage } from '../core/session.service';

/** «بانتظار اعتمادي» (المرحلة 5): كل قرار بمفتاح Idempotency-Key عشان الضغط المكرر مايتنفذش مرتين */
@Component({
  selector: 'app-approvals',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressBarModule],
  template: `
    <h1>بانتظار اعتمادي</h1>
    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
    @if (error()) { <div class="err" role="alert" id="apprError">{{ error() }}</div> }
    @if (!loading() && !items().length) { <p class="muted" id="inboxEmpty">مفيش طلبات بانتظار قرارك</p> }
    <div id="inbox">
      @for (r of items(); track r.id) {
        <section class="card" [attr.data-id]="r.id">
          <div><b>{{ r.documentName }}</b> · {{ r.documentId }} · المستوى {{ r.currentLevel }} @if (r.amount) { · <span class="num">{{ money(r.amount) }}</span> }</div>
          <mat-form-field appearance="outline" class="comment"><mat-label>ملاحظة (إلزامية للرفض والإرجاع)</mat-label>
            <input matInput [(ngModel)]="comments[r.id]" [attr.data-comment]="r.id" /></mat-form-field>
          <button mat-flat-button (click)="decide(r, 'approve')" [disabled]="busy()" data-act="approve">اعتماد</button>
          <button mat-button (click)="decide(r, 'return')" [disabled]="busy()" data-act="return">إرجاع</button>
          <button mat-button color="warn" (click)="decide(r, 'reject')" [disabled]="busy()" data-act="reject">رفض</button>
        </section>
      }
    </div>`,
})
export class ApprovalsPage implements OnInit {
  private readonly http = inject(HttpClient);
  readonly items = signal<InboxItem[]>([]);
  readonly loading = signal(false); readonly busy = signal(false); readonly error = signal('');
  comments: Record<string, string> = {};
  money = formatMoney;
  ngOnInit() { void this.load(); }
  async load() {
    this.loading.set(true); this.error.set('');
    try { this.items.set(await firstValueFrom(this.http.get<InboxItem[]>('/api/v1/approvals/inbox'))); }
    catch (e) { this.error.set(errorMessage(e, 'تعذر تحميل الطلبات')); }
    finally { this.loading.set(false); }
  }
  async decide(r: InboxItem, cmd: 'approve' | 'reject' | 'return') {
    const comment = (this.comments[r.id] ?? '').trim();
    if (cmd !== 'approve' && !comment) { this.error.set('اكتب السبب الأول'); return; }
    this.busy.set(true); this.error.set('');
    try {
      const headers = new HttpHeaders({ 'Idempotency-Key': `${cmd}-${r.id}-${crypto.randomUUID()}` });
      await firstValueFrom(this.http.post(`/api/v1/approvals/requests/${r.id}/${cmd}`, comment ? { comment } : {}, { headers }));
      await this.load();
    } catch (e) { this.error.set(errorMessage(e, 'تعذر تسجيل القرار')); }
    finally { this.busy.set(false); }
  }
}
