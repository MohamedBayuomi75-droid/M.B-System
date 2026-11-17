import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { firstValueFrom } from 'rxjs';
import { Project, ProjectList } from '../core/models';
import { formatMoney } from '../core/money';
import { errorMessage } from '../core/session.service';

/** الشاشة التجريبية (المرحلة 4): قراءة بس من GET /api/v1/projects — مش بديل لصفحة المشروعات الحالية */
@Component({
  selector: 'app-projects',
  imports: [FormsModule, MatTableModule, MatFormFieldModule, MatInputModule, MatProgressBarModule],
  template: `
    <h1>المشروعات <small class="muted">(تجريبي — عرض بس)</small></h1>
    <mat-form-field appearance="outline" class="search"><mat-label>بحث بالاسم أو الكود</mat-label>
      <input matInput id="projSearch" [(ngModel)]="q" (ngModelChange)="load()" /></mat-form-field>
    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
    @if (error()) { <div class="err" role="alert">{{ error() }}</div> }
    <table mat-table [dataSource]="items()" id="projectsTable" class="mat-elevation-z0">
      <ng-container matColumnDef="code"><th mat-header-cell *matHeaderCellDef>الكود</th><td mat-cell *matCellDef="let p">{{ p.code || '—' }}</td></ng-container>
      <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>الاسم</th><td mat-cell *matCellDef="let p">{{ p.name }}</td></ng-container>
      <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>الحالة</th><td mat-cell *matCellDef="let p">{{ p.status || '—' }}</td></ng-container>
      <ng-container matColumnDef="budget"><th mat-header-cell *matHeaderCellDef>الميزانية</th><td mat-cell *matCellDef="let p" class="num">{{ money(p.budget) }}</td></ng-container>
      <tr mat-header-row *matHeaderRowDef="cols"></tr>
      <tr mat-row *matRowDef="let row; columns: cols" [attr.data-id]="row.id"></tr>
    </table>
    <p class="muted" id="projTotal">العدد: {{ total() }}</p>`,
})
export class ProjectsPage implements OnInit {
  private readonly http = inject(HttpClient);
  readonly cols = ['code', 'name', 'status', 'budget'];
  readonly items = signal<Project[]>([]); readonly total = signal(0);
  readonly loading = signal(false); readonly error = signal('');
  q = '';
  money = formatMoney;
  ngOnInit() { void this.load(); }
  async load() {
    this.loading.set(true); this.error.set('');
    try {
      const r = await firstValueFrom(this.http.get<ProjectList>('/api/v1/projects', { params: new HttpParams().set('q', this.q.trim()) }));
      this.items.set(r.items); this.total.set(r.total);
    } catch (e) { this.error.set(errorMessage(e, 'تعذر تحميل المشروعات')); }
    finally { this.loading.set(false); }
  }
}
