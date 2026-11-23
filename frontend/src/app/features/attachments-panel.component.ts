import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { firstValueFrom } from 'rxjs';
import { Attachment } from '../core/models';
import { errorMessage } from '../core/session.service';

/** مرفقات سجل بالإصدارات (المرحلة 5 — 5.3): رفع، واستبدال بإصدار جديد (القديم بيفضل محفوظ)، وتنزيل. ومعاها (اختياري) مرفقات الواجهة القديمة للعرض */
@Component({
  selector: 'app-attachments',
  imports: [MatButtonModule],
  template: `
    <h2>المرفقات</h2>
    @if (error()) { <div class="err" role="alert" id="attError">{{ error() }}</div> }
    <ul id="attList">
      @for (a of versions(); track a.id) {
        <li [attr.data-id]="a.id" [attr.data-version]="a.version" [class.muted]="a.supersededAt">
          {{ a.filename }} — إصدار {{ a.version }} @if (a.supersededAt) { (متبدّل) }
          <button mat-button (click)="download(a)">تنزيل</button>
          @if (canEdit() && !a.supersededAt) { <label class="mat-mdc-button">إصدار جديد<input type="file" hidden [attr.data-replace]="a.id" (change)="upload($event, a.id)" /></label> }
        </li>
      } @empty { <li class="muted">مفيش مرفقات</li> }
    </ul>
    @if (canEdit()) { <label class="mat-mdc-button">رفع مرفق<input type="file" hidden id="attUpload" accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx" (change)="upload($event)" /></label> }
    @if (legacyDocs().length) {
      <h3 style="font-size:13px;margin:10px 0 4px;">مرفقات من الواجهة القديمة</h3>
      <ul id="attLegacyList">
        @for (d of legacyDocs(); track $index) { <li [attr.data-legacy-id]="d.id" class="muted">{{ d.name || d.storedName || 'ملف' }}@if (d.date) { — {{ d.date }} }</li> }
      </ul>
      <p class="muted" style="font-size:12px;margin:4px 0 0;">الملفات دي متخزّنة على جهاز سطح المكتب، وبتتفتح من نسخة سطح المكتب.</p>
    }`,
})
export class AttachmentsPanelComponent {
  private readonly http = inject(HttpClient);
  readonly collection = input.required<string>();
  readonly recordId = input.required<string>();
  readonly canEdit = input(false);
  /** مرفقات الواجهة القديمة المتخزّنة جوه السجل نفسه (record.attachments — مسار على جهاز سطح المكتب): عرض بس (UAT 7.4 L11) */
  readonly legacyDocs = input<{ id?: string; name?: string; storedName?: string; date?: string }[]>([]);
  readonly versions = signal<Attachment[]>([]); readonly error = signal('');
  constructor() { effect(() => { this.recordId(); void this.load(); }); }
  private params() { return new HttpParams().set('collection', this.collection()).set('recordId', this.recordId()); }
  async load() {
    try { this.versions.set(await firstValueFrom(this.http.get<Attachment[]>('/api/attachments/versions', { params: this.params() }))); this.error.set(''); }
    catch (e) { this.error.set(errorMessage(e, 'تعذر تحميل المرفقات')); }
  }
  async upload(ev: Event, replaces?: string) {
    const el = ev.target as HTMLInputElement; const file = el.files?.[0]; el.value = '';
    if (!file) return;
    const fd = new FormData(); fd.append('file', file, file.name);
    let params = this.params(); if (replaces) params = params.set('replaces', replaces);
    try { await firstValueFrom(this.http.post('/api/attachments', fd, { params })); await this.load(); }
    catch (e) { this.error.set(errorMessage(e, 'تعذر رفع الملف')); }
  }
  async download(a: Attachment) {
    try {
      const blob = await firstValueFrom(this.http.get(`/api/attachments/${a.id}/content`, { responseType: 'blob' }));
      const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = a.filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { this.error.set(errorMessage(e, 'تعذر التنزيل')); }
  }
}
