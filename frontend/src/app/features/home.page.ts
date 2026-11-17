import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { SessionService } from '../core/session.service';

@Component({
  selector: 'app-home',
  imports: [MatCardModule],
  template: `
    <h1>أهلًا {{ me()?.name }}</h1>
    <mat-card appearance="outlined" class="note">
      <mat-card-content>
        <p>دي <strong>الواجهة الجديدة</strong> (Angular) — في مرحلة التجهيز. كل الشغل اليومي لسه على <a href="/legacy/">الواجهة الحالية</a> بنفس الجلسة.</p>
        <p>الصفحات بتتنقل هنا واحدة واحدة بعد اعتماد كل موديول. «المشروعات (تجريبي)» عرض بس من الخادم الجديد.</p>
      </mat-card-content>
    </mat-card>`,
})
export class HomePage { readonly me = inject(SessionService).me; }

@Component({ selector: 'app-forbidden', template: `<h1>ليس لديك صلاحية على هذه الصفحة</h1>` })
export class ForbiddenPage {}

@Component({ selector: 'app-not-found', template: `<h1>الصفحة غير موجودة</h1>` })
export class NotFoundPage {}
