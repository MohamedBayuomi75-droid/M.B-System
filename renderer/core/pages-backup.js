/* =========================================================
   إعدادات النظام الموحد — منظمة وفعّالة
   ========================================================= */

function renderBackupPage(){
  const s = DATA.settings || {};
  const verLine = `<span id="appVersionLine">…</span>`;
  return `
    <div class="page settings-page">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
        <div>
          <h2 class="page-title" style="margin:0;">إعدادات النظام الموحد</h2>
          <p class="page-sub" style="margin:4px 0 0;">شركة · أمان · نسخ احتياطي · استيراد · موردون · عملاء · مخازن — في مكان واحد</p>
          <p class="page-sub" style="margin:4px 0 0;">بيانات الشركة · الأمان · النسخ · التحديث · الشبكة — الإصدار: ${verLine}</p>
        </div>
      </div>

      <!-- تبويبات داخلية -->
      <div class="settings-tabs" id="settingsTabs" role="tablist">
        <button type="button" class="settings-tab set-tab active" data-panel="company" role="tab"><span class="st-ico">🏢</span>الشركة</button>
        <button type="button" class="settings-tab set-tab" data-panel="security" role="tab"><span class="st-ico">🔒</span>الأمان</button>
        <button type="button" class="settings-tab set-tab" data-panel="backup" role="tab"><span class="st-ico">💾</span>النسخ الاحتياطي</button>
        <button type="button" class="settings-tab set-tab" data-panel="io" role="tab"><span class="st-ico">📤</span>الاستيراد والتصدير</button>
<button type="button" class="settings-tab set-tab" data-panel="ledger" role="tab"><span class="st-ico">🧾</span>الموردون</button>
        <button type="button" class="settings-tab set-tab" data-panel="clients" role="tab"><span class="st-ico">🏗️</span>العملاء</button>
        <button type="button" class="settings-tab set-tab" data-panel="warehouses" role="tab"><span class="st-ico">📦</span>المخازن</button>
        <button type="button" class="settings-tab set-tab" data-panel="system" role="tab"><span class="st-ico">⚙️</span>التخزين والتحديث</button>
        <button type="button" class="settings-tab set-tab" data-panel="customfields" role="tab"><span class="st-ico">🧩</span>تعديلات مخصصة</button>
        <button type="button" class="settings-tab set-tab" data-panel="reqdocs" role="tab"><span class="st-ico">📋</span>أوراق العمل</button>
        <button type="button" class="settings-tab set-tab" data-panel="network" role="tab"><span class="st-ico">🌐</span>الشبكة</button>
        <button type="button" class="settings-tab set-tab" data-panel="audit" role="tab"><span class="st-ico">🧾</span>سجل التدقيق</button>
        <button type="button" class="settings-tab set-tab st-danger" data-panel="danger" role="tab"><span class="st-ico">⚠️</span>منطقة الخطر</button>
      </div>

      <!-- الشركة -->
      <div class="settings-panel" data-panel="company">
        <div class="settings-card">
          <div class="section-title" style="margin-top:0;">بيانات الشركة</div>
          <div class="form-grid form-grid-2">
            <label>اسم الشركة<input class="input" id="setCompany" value="${escapeHtml(s.companyName||'')}"></label>
            <label>رئيس مجلس الإدارة<input class="input" id="setChairman" value="${escapeHtml(s.companyChairman||'')}" placeholder="رئيس مجلس إدارة الشركة"></label>
            <label>مدير الشركة<input class="input" id="setManager" value="${escapeHtml(s.companyManager||'')}" placeholder="يظهر في التوقيع على الكشوف"></label>
            <label>إيميل الشركة<input class="input" id="setEmail" type="email" value="${escapeHtml(s.companyEmail||'')}" placeholder="info@company.com" dir="ltr"></label>
            <label>الهاتف<input class="input" id="setPhone" value="${escapeHtml(s.companyPhone||'')}"></label>
            <label>الرقم الضريبي<input class="input" id="setTaxId" value="${escapeHtml(s.companyTaxId||'')}"></label>
            <label>أيام العمل شهرياً<input class="input" id="setWorkDays" type="number" min="1" max="31" step="1" value="${toInt(s.workDaysPerMonth)||26}"></label>
            <label style="grid-column:1/-1;">العنوان<input class="input" id="setAddress" value="${escapeHtml(s.companyAddress||'')}" placeholder="عنوان الشركة بالكامل"></label>
          </div>
          <div class="btn-row" style="margin-top:14px;">
            <button class="btn btn-primary" id="btnSaveSettings" ${readOnlyMode?'disabled':''}>💾 حفظ الإعدادات</button>
          </div>
        </div>
      </div>

      <!-- الأمان -->
      <div class="settings-panel" data-panel="security" style="display:none;">
        <div class="settings-card">
          <div class="section-title" style="margin-top:0;">الأمان ووضع القراءة فقط</div>
          <div class="stats-row" style="margin-bottom:12px;">
            <div class="stat-card"><div class="num" style="font-size:15px;">${readOnlyMode?'🔒 مفعّل':'✏️ غير مفعّل'}</div><div class="lbl">وضع القراءة فقط</div></div>
            <div class="stat-card"><div class="num" style="font-size:15px;">${typeof hasRoPin==='function'&&hasRoPin()?'✓ مضبوط':'— غير مضبوط'}</div><div class="lbl">الرقم السري</div></div>
          </div>
          <p style="font-size:13px;color:var(--ink-soft);margin-bottom:12px;">
            وضع القراءة فقط يمنع الإضافة والتعديل والحذف. يُفضَّل ضبط رقم سري قبل تفعيله حتى لا يُلغى بسهولة.
          </p>
          <div class="btn-row" style="flex-wrap:wrap;gap:8px;">
            <button class="btn btn-primary" id="secChangePinBtn">تغيير / ضبط الرقم السري</button>
            <button class="btn btn-outline" id="secClearPinBtn">مسح الرقم السري</button>
            <button class="btn btn-outline" id="secToggleRoBtn">${readOnlyMode?'إلغاء وضع القراءة فقط':'تفعيل وضع القراءة فقط'}</button>
          </div>
        </div>
      </div>

      <!-- نسخ -->
      <div class="settings-panel" data-panel="backup" style="display:none;">
        <div class="settings-card">
          <div class="section-title" style="margin-top:0;">💾 نسخة احتياطية (JSON)</div>
          <p style="font-size:13px;color:var(--ink-soft);">البيانات تُحفظ تلقائياً أثناء العمل. النسخة الاحتياطية لحفظها خارج الجهاز أو نقلها لجهاز آخر.</p>
          <div class="btn-row" style="flex-wrap:wrap;gap:8px;margin-top:10px;">
            <button class="btn btn-primary" id="btnExportBackup">⬇️ تنزيل نسخة احتياطية</button>
            <p style="font-size:12.5px;color:var(--ink-soft);margin:8px 0 0;">النسخة ملف JSON واحد يضم الموارد البشرية + الموردين + العملاء + المخازن (كل DATA).</p>
            <button class="btn btn-outline" id="btnImportBackup" ${readOnlyMode?'disabled':''}>⬆️ استيراد نسخة احتياطية</button>
          </div>
        </div>
        <div class="settings-card">
          <div class="section-title" style="margin-top:0;">📁 نسخة احتياطية إضافية خارج الجهاز</div>
          <p style="font-size:13px;color:var(--ink-soft);">اختار فلاشة أو مجلد شبكة أو OneDrive، والبرنامج هينسخ نسخة يومية تلقائياً هناك (آخر 30 نسخة) — عشان لو الجهاز اتعطل البيانات تفضل موجودة.</p>
          <div style="font-size:13.5px;margin:8px 0;"><strong>المكان الحالي:</strong> <span id="extraBackupDirText" style="direction:ltr;unicode-bidi:plaintext;">—</span></div>
          <div class="btn-row" style="flex-wrap:wrap;gap:8px;">
            <button class="btn btn-primary" id="btnPickExtraBackup">اختيار مكان النسخة الإضافية</button>
            <button class="btn btn-outline" id="btnExtraBackupNow">نسخ دلوقتي</button>
            <button class="btn btn-outline" id="btnClearExtraBackup">إلغاء النسخة الإضافية</button>
          </div>
        </div>
      </div>

      <!-- استيراد وتصدير -->
            <div class="settings-panel" data-panel="io" style="display:none;">
        <div class="settings-card" style="margin-bottom:14px;">
          <div class="section-title" style="margin-top:0;">📥 استيراد من إكسيل</div>
          <p style="font-size:13px;color:var(--ink-soft);margin:0 0 10px;">استيراد موظفين أو عمال أو مشرفين أو سائقين أو معدات من ملف Excel مع مطابقة الأعمدة.</p>
          <button class="btn btn-primary" id="btnExcelImport" ${readOnlyMode?'disabled':''}>📥 استيراد من إكسيل</button>
        </div>

        <div class="settings-card" style="margin-bottom:14px;">
          <div class="section-title" style="margin-top:0;">🏗️ استيراد بيانات العملاء</div>
          <p style="font-size:13px;color:var(--ink-soft);margin:0 0 10px;">استيراد ملف <b>data.json</b> من برنامج «إدارة العملاء والمشاريع» القديم. يتم الدمج مع العملاء الحاليين ومزامنة المشاريع.</p>
          <button class="btn btn-primary" id="clImportOldBtn" ${readOnlyMode?'disabled':''}>📥 استيراد بيانات العملاء القديمة (data.json)</button>
          <input type="file" id="clImportOldFile" accept=".json,application/json" hidden>
        </div>

        <div class="settings-card" style="margin-bottom:14px;">
          <div class="section-title" style="margin-top:0;">👥 استيراد بيانات الموارد البشرية</div>
          <p style="font-size:13px;color:var(--ink-soft);margin:0 0 10px;">استيراد ملف <b>data.json</b> من برنامج الموارد البشرية القديم (موظفين، عمال، مشرفين، سائقين، معدات، حضور، إجازات، مصاريف…). يتم الدمج مع البيانات الحالية بدون تكرار السجلات الموجودة ولا يُستورد المستخدمون.</p>
          <button class="btn btn-primary" id="hrImportOldBtn" ${readOnlyMode?'disabled':''}>📥 استيراد بيانات الموارد البشرية القديمة (data.json)</button>
          <input type="file" id="hrImportOldFile" accept=".json,application/json" hidden>
        </div>

        <div class="settings-card" style="margin-bottom:14px;">
          <div class="section-title" style="margin-top:0;">👥 تصدير الأشخاص</div>
          <p style="font-size:13px;color:var(--ink-soft);margin:0 0 10px;">كل زر يصدّر CSV، والزر المجاور يصدّر إكسيل لنفس الجدول.</p>
          <div class="io-export-grid">
            <div class="io-export-group"><span class="io-g-title">الموظفين</span>
              <button class="btn btn-outline btn-sm" id="expEmpCsv">CSV</button>
              <button class="btn btn-outline btn-sm" id="expEmpXlsx">إكسيل</button>
            </div>
            <div class="io-export-group"><span class="io-g-title">العمال</span>
              <button class="btn btn-outline btn-sm" id="expWrkCsv">CSV</button>
              <button class="btn btn-outline btn-sm" id="expWrkXlsx">إكسيل</button>
            </div>
            <div class="io-export-group"><span class="io-g-title">المشرفين</span>
              <button class="btn btn-outline btn-sm" id="expSupCsv">CSV</button>
              <button class="btn btn-outline btn-sm" id="expSupXlsx">إكسيل</button>
            </div>
            <div class="io-export-group"><span class="io-g-title">السائقين</span>
              <button class="btn btn-outline btn-sm" id="expDrvCsv">CSV</button>
              <button class="btn btn-outline btn-sm" id="expDrvXlsx">إكسيل</button>
            </div>
          </div>
        </div>

        <div class="settings-card" style="margin-bottom:14px;">
          <div class="section-title" style="margin-top:0;">🛻 تصدير المعدات والمشاريع</div>
          <div class="io-export-grid">
            <div class="io-export-group"><span class="io-g-title">المعدات والمركبات</span>
              <button class="btn btn-outline btn-sm" id="expEqCsv">CSV</button>
              <button class="btn btn-outline btn-sm" id="expEqXlsx">إكسيل</button>
            </div>
          </div>
        </div>

        <div class="settings-card" style="margin-bottom:14px;">
          <div class="section-title" style="margin-top:0;">📅 العمليات والحضور</div>
          <div class="io-export-grid">
            <div class="io-export-group"><span class="io-g-title">الرواتب</span>
              <button class="btn btn-outline btn-sm" id="expPayCsv">CSV</button>
              <button class="btn btn-outline btn-sm" id="expPayXlsx">إكسيل</button>
            </div>
            <div class="io-export-group"><span class="io-g-title">الإجازات</span>
              <button class="btn btn-outline btn-sm" id="expLeaveCsv">CSV</button>
              <button class="btn btn-outline btn-sm" id="expLeaveXlsx">إكسيل</button>
            </div>
            <div class="io-export-group"><span class="io-g-title">حضور / يوميات</span>
              <button class="btn btn-outline btn-sm" id="expWattCsv">CSV</button>
              <button class="btn btn-outline btn-sm" id="expWattXlsx">إكسيل</button>
            </div>
          </div>
        </div>

        <div class="settings-card" style="margin-bottom:14px;">
          <div class="section-title" style="margin-top:0;">💰 التكاليف والمصاريف</div>
          <div class="io-export-grid">
            <div class="io-export-group"><span class="io-g-title">التكاليف</span>
              <button class="btn btn-outline btn-sm" id="expCostCsv">CSV</button>
              <button class="btn btn-outline btn-sm" id="expCostXlsx">إكسيل</button>
            </div>
            <div class="io-export-group"><span class="io-g-title">المصاريف</span>
              <button class="btn btn-outline btn-sm" id="expExpenseCsv">CSV</button>
              <button class="btn btn-outline btn-sm" id="expExpenseXlsx">إكسيل</button>
            </div>
          </div>
        </div>

        <div class="settings-card">
          <div class="section-title" style="margin-top:0;">🗂️ الأرشيف</div>
          <div class="io-export-grid">
            <div class="io-export-group"><span class="io-g-title">الأرشيف PDF</span>
              <button class="btn btn-outline btn-sm" id="expArchPdf">PDF</button>
            </div>
          </div>
        </div>
      </div>

${typeof lgRenderSettingsPanel==='function' ? lgRenderSettingsPanel() : ''}
${typeof clRenderSettingsPanel==='function' ? clRenderSettingsPanel() : ''}
${typeof whRenderSettingsPanel==='function' ? whRenderSettingsPanel() : ''}
<div class="settings-panel" data-panel="system" style="display:none;">
        <div class="settings-card">
          <div class="section-title" style="margin-top:0;">مسار حفظ البيانات</div>
          <p id="dataPathLine" style="font-size:13px;color:var(--ink-soft);word-break:break-all;">جاري التحميل…</p>
          <div class="btn-row" style="flex-wrap:wrap;gap:8px;margin-top:10px;">
            <button class="btn btn-outline" id="pickDataDirBtn">📂 اختيار مجلد حفظ البيانات</button>
            <button class="btn btn-outline" id="resetDataDirBtn">إعادة المسار الافتراضي</button>
          </div>
        </div>
        <div class="settings-card" style="margin-top:14px;">
          <div class="section-title" style="margin-top:0;">تحديث البرنامج</div>
          <p style="font-size:13px;color:var(--ink-soft);margin-bottom:8px;">
            اختر ملف تثبيت <strong>.exe</strong> أو أرشيف <strong>.zip</strong> للنسخة الجديدة.
            البيانات لن تُمس — التحديث يستبدل ملفات البرنامج فقط.
          </p>
          <div id="updateStatusBox" style="font-size:13px;padding:10px;border-radius:8px;background:var(--paper-2);border:1px solid var(--line);margin-bottom:10px;display:none;"></div>
          <div class="btn-row" style="flex-wrap:wrap;gap:8px;">
            <button class="btn btn-primary" id="safeUpdateBtn">🔄 اختيار ملف تحديث وتثبيته</button>
          </div>
          <p style="font-size:12px;color:var(--ink-soft);margin-top:10px;">
            يعمل فقط من نسخة سطح المكتب (Electron). بعد اختيار الملف ستظهر تفاصيل الإصدار قبل التثبيت.
          </p>
        </div>
      </div>

      
      <!-- شبكة -->
      <div class="settings-panel" data-panel="network" style="display:none;">
        <div class="settings-card">
          <div class="section-title" style="margin-top:0;">تعدد المستخدمين والأجهزة</div>
          <div id="netStatusBox" style="padding:12px 14px;border-radius:10px;background:var(--paper-2,#f6f5f1);border:1px solid var(--line);margin-bottom:14px;">
            <div id="netStatusLine" style="font-weight:700;margin-bottom:6px;">جاري التحقق…</div>
            <div id="netStatusDetail" style="font-size:13px;color:var(--ink-soft);line-height:1.7;"></div>
          </div>
          <div class="form-grid form-grid-2" style="margin-bottom:12px;">
            <label>منفذ المضيف
              <input class="input" id="netPortInput" type="number" min="1024" max="65535" value="4173" placeholder="4173">
            </label>
            <label>عنوان المضيف (للعميل)
              <input class="input" id="netHostUrlInput" type="text" placeholder="مثال: http://192.168.1.10:4173" dir="ltr" style="text-align:left;">
            </label>
          </div>
          <div class="btn-row" style="flex-wrap:wrap;gap:8px;">
            <button type="button" class="btn btn-primary" id="netStartHostBtn">▶ تشغيل كمضيف</button>
            <button type="button" class="btn btn-outline" id="netJoinBtn">🔗 الاتصال كعميل</button>
            <button type="button" class="btn btn-outline" id="netTestBtn">اختبار الاتصال</button>
            <button type="button" class="btn btn-outline" id="netStopBtn">⏹ إيقاف الشبكة</button>
          </div>
          <p style="font-size:12.5px;color:var(--ink-soft);margin-top:12px;line-height:1.7;">
            وضع المضيف يشغّل خادماً محلياً على الشبكة. الأجهزة الأخرى تتصل بعنوان المضيف بعد تشغيله.
          </p>
        </div>
      </div>

      <!-- تعديلات مخصصة -->
      <div class="settings-panel" data-panel="customfields" style="display:none;">
        <div class="settings-card">
          <div class="section-title" style="margin-top:0;">🧩 تعديلات مخصصة — قوائم الإضافة والتعديل</div>
          <p style="font-size:13px;color:var(--ink-soft);margin-bottom:12px;line-height:1.7;">
            اختر القائمة، أعد ترتيب الخانات، عدّل الأسماء، أضف/احذف المخصص. إضافة وحذف الخانات من هنا فقط.
          </p>
          <input type="hidden" id="cfEntity" value="employees">
          <div class="cf-layout">
          <aside class="cf-side cf-entity-tabs" id="cfEntityTabs" role="tablist">
            ${cfEntityTabsHtml()}
          </aside>
          <div class="cf-main">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:10px 0 12px;">
            <span style="font-size:12.5px;color:var(--ink-soft);" id="cfEntityHint">قائمة: إضافة / تعديل موظف</span>
          </div>
          <div id="cfStage" class="cf-stage">
          <div class="cf-preview-wrap">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
              <div class="section-title" style="margin:0;font-size:14px;">👁️ معاينة النموذج — اسحب الخانات لإعادة الترتيب</div>
              <span style="font-size:12px;color:var(--ink-soft);">مثل شاشة الإضافة / التعديل</span>
            </div>
            <div class="cf-preview-modal">
              <div class="cf-preview-modal-head">
                <strong id="cfPreviewTitle">نموذج</strong>
                <span class="cf-preview-x">×</span>
              </div>
              <div id="cfFormPreview" class="cf-form-preview form-grid form-grid-2"></div>
              <div class="cf-preview-modal-foot" id="cfPreviewFoot">
                <button type="button" class="btn btn-outline" disabled>إلغاء</button>
                <button type="button" class="btn btn-primary" id="cfPreviewSaveBtn" disabled>حفظ</button>
              </div>
            </div>
          </div>
          <div class="section-title" style="margin:18px 0 8px;font-size:14px;">⚙️ تفاصيل الخانات</div>
          <div id="cfFieldsList" class="cf-fields-list"></div>
          <div class="cf-add-row"><label style="display:inline-flex;align-items:center;gap:6px;margin-inline-end:12px;font-size:13px;">عدد الخانات في الصف <input type="number" min="0" max="6" id="cfPerRow" class="input" style="width:70px" placeholder="تلقائي" value=""></label><button type="button" class="btn btn-primary" id="btnCfAdd" ${readOnlyMode?'disabled':''}>+ إضافة خانة</button></div>
          </div>
          </div></div>
          <div class="section-title" style="margin:22px 0 8px;font-size:14px;">📊 كروت مخصصة — اربط كرت بأي عمود</div>
          <p style="font-size:12.5px;color:var(--ink-soft);margin:0 0 8px;">تظهر الكروت أعلى صفحة القسم المختار (موظفون، عمال، مشرفون، سائقون، معدات).</p>
          <div id="ccList"></div>
          <button type="button" class="btn btn-outline" id="btnCcAdd" ${readOnlyMode?'disabled':''}>+ إضافة كرت</button>
          <div class="btn-row" style="margin-top:14px;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn btn-primary" id="btnCfSave" ${readOnlyMode?'disabled':''}>💾 حفظ التعديلات</button>
            <button type="button" class="btn btn-outline" id="btnCfReset" ${readOnlyMode?'disabled':''} title="إرجاع هذه القائمة للترتيب والأسماء الافتراضية">↺ استعادة الافتراضي</button>
            <span style="font-size:12.5px;color:var(--ink-soft);align-self:center;">بعد الحفظ تُطبَّق على نماذج البرنامج</span>
          </div>
        </div>
      </div>

<div class="settings-panel" data-panel="reqdocs" style="display:none;">
        <div class="settings-card">
          <div class="section-title" style="margin-top:0;">أوراق العمل المطلوبة</div>
          <p style="font-size:13px;color:var(--ink-soft);margin-bottom:12px;">
            حدّد الأوراق المطلوبة لكل نوع (وملف المستقيلين). البرنامج يكتب ملاحظات «ناقص: …» تلقائياً حسب القائمة المناسبة.
          </p>
          <div class="btn-row" style="margin-bottom:12px;flex-wrap:wrap;gap:6px;" id="reqDocsKindTabs">
            <button type="button" class="btn btn-primary btn-sm req-kind-tab" data-kind="employee">موظفين</button>
            <button type="button" class="btn btn-outline btn-sm req-kind-tab" data-kind="worker">عمال</button>
            <button type="button" class="btn btn-outline btn-sm req-kind-tab" data-kind="supervisor">مشرفين</button>
            <button type="button" class="btn btn-outline btn-sm req-kind-tab" data-kind="driver">سائقين</button>
            <button type="button" class="btn btn-outline btn-sm req-kind-tab" data-kind="equipment">معدات ومركبات</button>
            <button type="button" class="btn btn-outline btn-sm req-kind-tab" data-kind="resigned">المستقيلين</button>
          </div>
          <div id="reqDocsListBox"><p style="color:var(--ink-soft);">جاري التحميل…</p></div>
          <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
            <input class="input" id="reqDocNewName" placeholder="اسم ورقة جديدة..." style="flex:1;min-width:180px;">
            <button type="button" class="btn btn-primary btn-sm" id="btnReqDocAdd">+ إضافة</button>
            <button type="button" class="btn btn-outline btn-sm" id="btnReqDocReset">استعادة الافتراضي</button>
          </div>
        </div>
      </div>

      <div class="settings-panel" data-panel="danger" style="display:none;">
        <div class="settings-card" style="border-color:#c0392b;margin-top:14px;">
          <div class="section-title" style="margin-top:0;color:#c0392b;">منطقة خطر</div>
          <p style="font-size:13px;color:var(--ink-soft);">مسح كل البيانات لا يمكن التراجع عنه. خذ نسخة احتياطية أولاً.</p>
          <button class="btn btn-outline" id="btnWipeData" style="color:#c0392b;border-color:#c0392b;" ${readOnlyMode?'disabled':''}>🗑️ مسح كل البيانات</button>
        </div>
      </div>
    </div>`;
}

const SETTINGS_PANEL_IDS = ['company','security','backup','io','ledger','system','customfields','reqdocs','network','audit','danger'];
function showSettingsPanel(id){
  // توافق مع أسماء قديمة محفوظة
  if(id === 'datahub') id = 'backup';
  if(id === 'data') id = 'system';
  if(SETTINGS_PANEL_IDS.indexOf(id) < 0) id = 'company';
  document.querySelectorAll('.settings-panel').forEach(p=>{
    p.style.display = p.getAttribute('data-panel') === id ? '' : 'none';
  });
  document.querySelectorAll('.set-tab').forEach(b=>{
    const on = b.getAttribute('data-panel') === id;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  if(id === 'reqdocs' && typeof window.refreshReqDocsList === 'function') window.refreshReqDocsList();
  if(id === 'customfields' && typeof window.refreshCustomFieldsList === 'function') window.refreshCustomFieldsList();
  try{ sessionStorage.setItem('hr-settings-panel', id); }catch(e){}
}

/** أوراق العمل المطلوبة — تُربط مرة واحدة فقط (كانت تتكرر مع كل تبديل تبويب) */
function initReqDocsPanel(){
  window.__reqDocsKind = window.__reqDocsKind || 'employee';
  window.refreshReqDocsList = function refreshReqDocsList(){
    if(typeof ensureRequiredDocsDefaults==='function') ensureRequiredDocsDefaults();
    const kind = window.__reqDocsKind || 'employee';
    const list = (DATA.requiredDocsByKind && DATA.requiredDocsByKind[kind]) || [];
    const box = document.getElementById('reqDocsListBox');
    if(!box) return;
    box.innerHTML = list.length
      ? `<div style="display:flex;flex-direction:column;gap:6px;">${list.map((d,i)=>`
          <div style="display:flex;gap:8px;align-items:center;padding:8px 10px;background:var(--paper-2,#f6f5f1);border-radius:8px;border:1px solid var(--line);">
            <span style="flex:1;font-weight:600;">${escapeHtml(d.label||d.name||'')}</span>
            <button type="button" class="btn btn-outline btn-sm btn-req-edit" data-idx="${i}" style="padding:0 8px;">تعديل</button>
            <button type="button" class="btn btn-outline btn-sm btn-req-del" data-idx="${i}" style="padding:0 8px;color:#b91c1c;">حذف</button>
          </div>`).join('')}</div>`
      : '<p style="color:var(--ink-soft);">لا أوراق — أضف ورقة أو استعد الافتراضي</p>';
    box.querySelectorAll('.btn-req-del').forEach(b=> b.addEventListener('click', ()=>{
      const idx = parseInt(b.getAttribute('data-idx'),10);
      const k = window.__reqDocsKind||'employee';
      if(!DATA.requiredDocsByKind[k]) return;
      DATA.requiredDocsByKind[k].splice(idx,1);
      if(!DATA.requiredDocsByKind[k].length){ DATA.requiredDocsEmpty = DATA.requiredDocsEmpty||{}; DATA.requiredDocsEmpty[k] = true; }
      saveData(true); showToast('تم الحذف'); refreshReqDocsList();
    }));
    box.querySelectorAll('.btn-req-edit').forEach(b=> b.addEventListener('click', ()=>{
      const idx = parseInt(b.getAttribute('data-idx'),10);
      const k = window.__reqDocsKind||'employee';
      const cur = (DATA.requiredDocsByKind[k]||[])[idx];
      if(!cur) return;
      const nn = prompt('اسم الورقة:', cur.label||'');
      if(!nn || !nn.trim()) return;
      cur.label = nn.trim();
      saveData(true); showToast('تم التعديل'); refreshReqDocsList();
    }));
  }
  document.querySelectorAll('.req-kind-tab').forEach(b=> b.addEventListener('click', ()=>{
    window.__reqDocsKind = b.getAttribute('data-kind')||'employee';
    document.querySelectorAll('.req-kind-tab').forEach(x=>{
      x.classList.toggle('btn-primary', x===b);
      x.classList.toggle('btn-outline', x!==b);
    });
    refreshReqDocsList();
  }));
  document.getElementById('btnReqDocAdd')?.addEventListener('click', ()=>{
    const name = (document.getElementById('reqDocNewName')?.value||'').trim();
    if(!name){ showToast('اكتب اسم الورقة'); return; }
    if(typeof ensureRequiredDocsDefaults==='function') ensureRequiredDocsDefaults();
    const k = window.__reqDocsKind||'employee';
    DATA.requiredDocsByKind[k] = DATA.requiredDocsByKind[k]||[];
    if(DATA.requiredDocsByKind[k].some(d=>(d.label||'')===name)){ showToast('موجودة مسبقاً'); return; }
    DATA.requiredDocsByKind[k].push({ code: 'c_'+Date.now().toString(36), label: name });
    if(DATA.requiredDocsEmpty) delete DATA.requiredDocsEmpty[k];
    document.getElementById('reqDocNewName').value = '';
    saveData(true); showToast('تمت الإضافة'); refreshReqDocsList();
  });
  document.getElementById('btnReqDocReset')?.addEventListener('click', ()=>{
    confirmApp('استعادة القائمة الافتراضية لهذا النوع؟', { title: 'تأكيد', okLabel: 'متابعة' }).then(ok=>{ if(!ok) return;
      const k = window.__reqDocsKind||'employee';
      if(typeof defaultRequiredDocsForKind==='function'){
      DATA.requiredDocsByKind = DATA.requiredDocsByKind||{};
      DATA.requiredDocsByKind[k] = defaultRequiredDocsForKind(k).map(d=>({code:d.code,label:d.label}));
      if(DATA.requiredDocsEmpty) delete DATA.requiredDocsEmpty[k];
      saveData(true); showToast('تمت الاستعادة'); refreshReqDocsList();
      }
    });
  });
}


function renderAuditTablePage(){
  const q = String(window.__auditSearch||'').trim().toLowerCase();
  let rows = (DATA.auditLog||[]).slice();
  if(q){
    rows = rows.filter(a=>{
      const blob = [a.action, a.details, a.user, a.at].join(' ').toLowerCase();
      return blob.includes(q);
    });
  }
  const per = 30;
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / per));
  let page = Math.max(1, Number(window.__auditPage)||1);
  if(page > pages) page = pages;
  window.__auditPage = page;
  const start = (page-1)*per;
  const slice = rows.slice(start, start+per);
  const body = document.getElementById('auditTableBody');
  const info = document.getElementById('auditPageInfo');
  const pager = document.getElementById('auditPager');
  if(body){
    body.innerHTML = slice.length ? slice.map(a=>{
      let time = '';
      try{
        if(a.at){
          const d = new Date(a.at);
          time = (typeof fmtDate==='function'?fmtDate(a.at):a.at.slice(0,10))+' '+d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});
        }
      }catch(_e){ time = a.at||''; }
      return `<tr>
        <td style="white-space:nowrap;font-size:12.5px;">${escapeHtml(time)}</td>
        <td style="font-weight:700;">${escapeHtml(a.action||'')}</td>
        <td>${escapeHtml(a.details||'')}</td>
        <td>${escapeHtml(a.user||'محلي')}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--ink-soft);padding:20px;">لا سجلات</td></tr>';
  }
  if(info) info.textContent = total ? `عرض ${start+1}–${Math.min(start+per,total)} من ${total}` : 'لا سجلات';
  if(pager){
    let html = '';
    if(pages > 1){
      html += `<button type="button" class="btn btn-outline btn-sm audit-page-btn" data-page="${page-1}" ${page<=1?'disabled':''}>السابق</button>`;
      const maxBtns = 7;
      let from = Math.max(1, page - Math.floor(maxBtns/2));
      let to = Math.min(pages, from + maxBtns - 1);
      from = Math.max(1, to - maxBtns + 1);
      for(let i=from;i<=to;i++){
        html += `<button type="button" class="btn btn-sm audit-page-btn ${i===page?'btn-primary':'btn-outline'}" data-page="${i}">${i}</button>`;
      }
      html += `<button type="button" class="btn btn-outline btn-sm audit-page-btn" data-page="${page+1}" ${page>=pages?'disabled':''}>التالي</button>`;
    }
    pager.innerHTML = html;
    pager.querySelectorAll('.audit-page-btn').forEach(b=>{
      b.addEventListener('click', ()=>{
        const p = Number(b.getAttribute('data-page'));
        if(!p || p<1) return;
        window.__auditPage = p;
        renderAuditTablePage();
      });
    });
  }
}

function initBackupEvents(){
  try{ if(typeof lgInitSettingsPanel==='function') lgInitSettingsPanel(); }catch(e){ console.error('ledger settings panel', e); }
  try{ if(typeof clInitSettingsPanel==='function') clInitSettingsPanel(); }catch(e){ console.error('clients settings panel', e); }
  try{ if(typeof whInitSettingsPanel==='function') whInitSettingsPanel(); }catch(e){ console.error('warehouses settings panel', e); }
  // سجل النشاط
  try{
    window.__auditPage = window.__auditPage || 1;
    const au = document.getElementById('auditSearchInput');
    if(au){
      au.addEventListener('input', ()=>{
        window.__auditSearch = au.value||'';
        window.__auditPage = 1;
        if(typeof renderAuditTablePage==='function') renderAuditTablePage();
      });
    }
    if(typeof renderAuditTablePage==='function') renderAuditTablePage();
  }catch(_e){}

  // tabs
  const savedPanel = (()=>{ try{ return sessionStorage.getItem('hr-settings-panel')||'company'; }catch(e){ return 'company'; }})();
  initReqDocsPanel();
  showSettingsPanel(savedPanel);
  document.querySelectorAll('.set-tab').forEach(b=>{
    b.addEventListener('click', ()=> showSettingsPanel(b.getAttribute('data-panel')));
  });

  // version
  const verEl = document.getElementById('appVersionLine');
  if(verEl && window.desktopApi && window.desktopApi.getAppVersion){
    window.desktopApi.getAppVersion().then(r=>{
      if(r && r.ok) verEl.textContent = r.version + (r.packaged?'':' (تطوير)');
      else if(typeof r === 'string') verEl.textContent = r;
      else verEl.textContent = '—';
    }).catch(()=>{ verEl.textContent = '—'; });
  } else if(verEl) verEl.textContent = 'واجهة ويب';

  // حفظ الإعدادات
  const save = document.getElementById('btnSaveSettings');
  if(save) save.addEventListener('click', ()=>{
    if(readOnlyMode){ showToast('وضع القراءة فقط'); return; }
    if(!DATA.settings) DATA.settings = {};
    DATA.settings.companyName = (document.getElementById('setCompany')?.value||'').trim();
    DATA.settings.companyChairman = (document.getElementById('setChairman')?.value||'').trim();
    DATA.settings.companyManager = (document.getElementById('setManager')?.value||'').trim();
    DATA.settings.companyEmail = (document.getElementById('setEmail')?.value||'').trim();
    DATA.settings.companyPhone = (document.getElementById('setPhone')?.value||'').trim();
    DATA.settings.companyAddress = (document.getElementById('setAddress')?.value||'').trim();
    DATA.settings.companyTaxId = (document.getElementById('setTaxId')?.value||'').trim();
    DATA.settings.workDaysPerMonth = toInt(document.getElementById('setWorkDays')?.value) || 26;
    addAudit('تحديث إعدادات', DATA.settings.companyName||'');
    saveData(true);
    showToast('تم حفظ الإعدادات');
  });

  // أمان
  const secChange = document.getElementById('secChangePinBtn');
  if(secChange) secChange.addEventListener('click', ()=>{
    if(typeof hasRoPin==='function' && hasRoPin()){
      promptPinDialog('تغيير الرقم السري', 'أدخل الرقم السري الحالي', (oldPin)=>{
        if(!verifyRoPin(oldPin)){ showToast('الرقم السري الحالي غير صحيح'); return; }
        promptPinDialog('الرقم السري الجديد', 'أدخل رقماً سرياً جديداً (4 خانات على الأقل)', (newPin)=>{
          const r = changeRoPin(oldPin, newPin);
          if(!r.ok){ showToast(r.error||'فشل'); return; }
          showToast('تم تغيير الرقم السري'); rerenderCurrentPage();
        }, true);
      });
    } else {
      promptPinDialog('ضبط رقم سري', 'أدخل رقماً سرياً (4 خانات على الأقل) مع التأكيد', (newPin)=>{
        const r = changeRoPin('', newPin);
        if(!r.ok){ showToast(r.error||'فشل'); return; }
        showToast('تم ضبط الرقم السري'); rerenderCurrentPage();
      }, true);
    }
  });
  const secClear = document.getElementById('secClearPinBtn');
  if(secClear) secClear.addEventListener('click', ()=>{
    if(!(typeof hasRoPin==='function' && hasRoPin())){ showToast('لا يوجد رقم سري'); return; }
    promptPinDialog('مسح الرقم السري', 'أدخل الرقم السري الحالي للتأكيد', (pin)=>{
      if(!verifyRoPin(pin)){ showToast('الرقم السري غير صحيح'); return; }
      clearStoredRoPin(); showToast('تم مسح الرقم السري'); rerenderCurrentPage();
    });
  });
  const secToggle = document.getElementById('secToggleRoBtn');
  if(secToggle) secToggle.addEventListener('click', ()=>{
    if(typeof toggleReadOnlyMode==='function') toggleReadOnlyMode();
  });





  // —— كروت مخصصة ——
  try { (function initCustomCardsUI(){
    const ENTS = (typeof CUSTOM_CARD_ENTITIES!=='undefined') ? CUSTOM_CARD_ENTITIES : {};
    const MODES = (typeof CUSTOM_CARD_MODES!=='undefined') ? CUSTOM_CARD_MODES : [];
    const opt = (v,l,sel)=>'<option value="'+escapeHtml(v)+'"'+(sel?' selected':'')+'>'+escapeHtml(l)+'</option>';
    function colsOf(ent){ return (typeof ensureFormLayout==='function' ? ensureFormLayout(ent) : []).filter(f=>f && f.key && f.label); }
    function render(){
      const box = document.getElementById('ccList'); if(!box) return;
      const list = DATA.customCards = DATA.customCards || [];
      box.innerHTML = list.length ? list.map((c,i)=>{
        const cols = colsOf(c.entity);
        return '<div class="cc-row" data-i="'+i+'">'
          +'<input class="input cc-icon" value="'+escapeHtml(c.icon||'📌')+'" title="رمز" style="text-align:center;">'
          +'<input class="input cc-label" value="'+escapeHtml(c.label||'')+'" placeholder="اسم الكرت">'
          +'<select class="input cc-ent">'+Object.keys(ENTS).map(k=>opt(k,ENTS[k],k===c.entity)).join('')+'</select>'
          +'<select class="input cc-col">'+cols.map(f=>opt(f.key,f.label,f.key===c.column)).join('')+'</select>'
          +'<select class="input cc-mode">'+MODES.map(m=>opt(m.code,m.label,m.code===(c.mode||'breakdown'))).join('')+'</select>'
          +'<input class="input cc-val" value="'+escapeHtml(c.value||'')+'" placeholder="القيمة" style="'+(c.mode==='equals'?'':'visibility:hidden;')+'">'
          +'<button type="button" class="btn btn-outline btn-sm cc-del" title="حذف">🗑</button></div>';
      }).join('') : '<div style="color:var(--ink-soft);font-size:13px;padding:6px 0;">لا كروت مخصصة بعد</div>';
    }
    function commit(){ saveData(true); }
    document.getElementById('btnCcAdd')?.addEventListener('click', ()=>{
      if(readOnlyMode) return;
      const ent = 'employees', cols = colsOf(ent);
      DATA.customCards = DATA.customCards || [];
      DATA.customCards.push({ id:'cc_'+Date.now().toString(36), entity:ent, icon:'📌', label:'كرت جديد', column:(cols[0]||{}).key||'', columnLabel:(cols[0]||{}).label||'', mode:'breakdown', value:'', show:true });
      commit(); render();
    });
    const box = document.getElementById('ccList');
    if(box){
      box.addEventListener('change', e=>{
        const row = e.target.closest('.cc-row'); if(!row) return;
        const c = DATA.customCards[Number(row.dataset.i)]; if(!c) return;
        if(e.target.classList.contains('cc-ent')){ c.entity = e.target.value; const cols = colsOf(c.entity); c.column = (cols[0]||{}).key||''; c.columnLabel = (cols[0]||{}).label||''; }
        else if(e.target.classList.contains('cc-col')){ c.column = e.target.value; const f = colsOf(c.entity).find(x=>x.key===c.column); c.columnLabel = f?f.label:''; }
        else if(e.target.classList.contains('cc-mode')){ c.mode = e.target.value; }
        commit(); render();
      });
      box.addEventListener('input', e=>{
        const row = e.target.closest('.cc-row'); if(!row) return;
        const c = DATA.customCards[Number(row.dataset.i)]; if(!c) return;
        if(e.target.classList.contains('cc-label')) c.label = e.target.value;
        else if(e.target.classList.contains('cc-icon')) c.icon = e.target.value;
        else if(e.target.classList.contains('cc-val')) c.value = e.target.value;
        else return;
        commit();
      });
      box.addEventListener('click', e=>{
        const b = e.target.closest('.cc-del'); if(!b) return;
        const row = b.closest('.cc-row'); DATA.customCards.splice(Number(row.dataset.i),1); commit(); render();
      });
    }
    render();
  })(); } catch(e){ console.error('custom cards ui', e); }
  // —— تعديلات مخصصة ——
  try { (function initCustomFieldsUI(){
    const ENTITY_KEYS = ['employees','workers','supervisors','drivers','equipment','expenses','costs','projects','attendance','workerAttendance','leaves','transfers','payments','equipmentDaily','fuel','documents','vehicleExpenses','performance','departments','users','clCustomers','clContracts','clInvoices','clBoqs','clSurveys','clCollections','clGuarantees'];
    function uidCf(){ return 'cf_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
    function renderList(){
      const ent = document.getElementById('cfEntity')?.value || 'employees';
      if(typeof migrateStaleFormLayouts==='function') migrateStaleFormLayouts();
      if(typeof normalizeDocumentsLayout==='function') normalizeDocumentsLayout();
      try{ window.__cfSynced = window.__cfSynced || {}; if(!window.__cfSynced[ent] && typeof syncAutoFields==='function'){ syncAutoFields(ent); } }catch(_e){}
      const list = typeof ensureFormLayout==='function' ? ensureFormLayout(ent) : [];
      const box = document.getElementById('cfFieldsList');
      if(!box) return;
      window.refreshCustomFieldsList = renderList;
      if(!list.length){
        box.innerHTML = '<div style="text-align:center;padding:28px;color:var(--ink-soft);">لا خانات</div>';
        return;
      }
      box.innerHTML = `
      <div class="table-wrap"><table class="data-table cf-table" style="table-layout:fixed;width:100%;">
        <colgroup><col style="width:34px"><col style="width:42px"><col><col><col><col><col><col><col><col><col style="width:46px"></colgroup>
        <thead><tr>
          <th title="اسحب">⠿</th>
          <th>#</th>
          <th>اسم الخانة</th>
          <th>التصنيف</th>
          <th title="طول الخانة بالبكسل داخل النموذج — فارغ = تلقائي">الطول (px)</th>
          <th title="عرض الخانة بالبكسل داخل النموذج (مثلاً 200 أو 400) — فارغ = تلقائي">العرض (px)</th>
          <th>نوع الإدخال</th>
          <th title="تظهر في نموذج الإضافة والتعديل">في النموذج</th>
          <th title="تظهر كعمود في جدول الصفحة">في الجدول</th>
          <th>ترتيب</th>
          <th></th>
        </tr></thead>
        <tbody>${list.map((f,i)=>{
          const isCustom = f.type==='custom'; const showTbl = f.showInTable!==false;
          return `<tr data-cf-key="${escapeHtml(f.key||'')}" data-cf-idx="${i}" data-cf-type="${escapeHtml(f.type||'builtin')}" data-cf-id="${escapeHtml(f.id||'')}">
            <td class="cf-row-handle" title="اسحب للتحريك" style="cursor:grab;text-align:center;color:#7a8f80;">⠿</td>
            <td>${i+1}</td>
            <td><input class="input cf-label" value="${escapeHtml(f.label||'')}" placeholder="اسم الخانة" title="${isCustom?'خانة مخصصة':'خانة أساسية — يمكن تعديل الاسم الظاهر'}"></td>
            <td><select class="input cf-class" title="تصنيف الخانة">
              <option value="builtin" ${!isCustom?'selected':''}>أساسية</option>
              <option value="custom" ${isCustom?'selected':''}>إضافية</option>
            </select></td>
            <td><input type="number" min="30" max="800" step="10" class="input cf-h" placeholder="تلقائي" value="${f.height?escapeHtml(String(f.height)):''}" title="طول الخانة بالبكسل" data-size="${escapeHtml(f.size||'md')}"></td>
            <td><input type="number" min="60" max="1200" step="10" class="input cf-w" placeholder="تلقائي" value="${f.width?escapeHtml(String(f.width)):''}" title="عرض الخانة بالبكسل"></td>
            <td><select class="input cf-ftype" title="نوع الإدخال">
              <option value="text" ${(f.fieldType||'text')==='text'?'selected':''}>نص</option>
              <option value="number" ${f.fieldType==='number'?'selected':''}>رقم</option>
              <option value="date" ${f.fieldType==='date'?'selected':''}>تاريخ</option>
              <option value="textarea" ${f.fieldType==='textarea'?'selected':''}>نص طويل</option>
            </select></td>
            <td style="text-align:center;"><input type="checkbox" class="cf-vis" ${f.visible!==false?'checked':''} title="إظهار في النموذج"></td>
            <td style="text-align:center;"><input type="checkbox" class="cf-show" ${showTbl?'checked':''} title="إظهار كعمود في الجدول"></td>
            <td style="white-space:nowrap;">
              <button type="button" class="btn btn-outline btn-sm cf-up" ${i===0?'disabled':''}>▲</button>
              <button type="button" class="btn btn-outline btn-sm cf-down" ${i===list.length-1?'disabled':''}>▼</button>
            </td>
            <td>${isCustom?`<button type="button" class="icon-btn icon-del cf-del" title="حذف الخانة">🗑️</button>`:'<span style="color:var(--ink-soft);font-size:11px;" title="حوّل لإضافية ثم احذف">—</span>'}</td>
          </tr>`;
        }).join('')}</tbody></table></div>
        <p style="font-size:12px;color:var(--ink-soft);margin-top:10px;line-height:1.6;">• غيّر <strong>التصنيف</strong> إلى «إضافية» لتفعيل الحذف، أو «أساسية» للإبقاء الدائم.<br>• أعد الترتيب والظهور والحجم ونوع الإدخال بحرية ثم احفظ.</p>`;
      const bindMove = (sel, dir)=>{
        box.querySelectorAll(sel).forEach(btn=>{
          btn.addEventListener('click', ()=>{
            if(readOnlyMode) return;
            collectFromUI();
            const i = parseInt(btn.closest('tr')?.getAttribute('data-cf-idx'),10);
            const arr = DATA.formLayouts[ent]||[];
            const j = i + dir;
            if(isNaN(i)||j<0||j>=arr.length) return;
            const t = arr[i]; arr[i]=arr[j]; arr[j]=t;
            renderList();
          });
        });
      };
      bindMove('.cf-up', -1);
      bindMove('.cf-down', 1);
      box.querySelectorAll('.cf-del').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          if(readOnlyMode) return;
          collectFromUI();
          const key = btn.closest('tr')?.getAttribute('data-cf-key');
          DATA.formLayouts[ent] = (DATA.formLayouts[ent]||[]).filter(x=>x.key!==key);
          if(typeof syncCustomDefsFromLayout==='function') syncCustomDefsFromLayout(ent);
          renderList();
        });
      });
      // سحب الصفوف في الجدول — أي خانة
      box.querySelectorAll('tbody tr[data-cf-key]').forEach(tr=>{
        tr.setAttribute('draggable','true');
        tr.addEventListener('dragstart', (e)=>{
          if(e.target.closest('input,select,button,textarea')){ e.preventDefault(); return; }
          tr.classList.add('cf-dragging');
          e.dataTransfer.setData('text/plain', tr.getAttribute('data-cf-idx'));
          e.dataTransfer.effectAllowed = 'move';
        });
        tr.addEventListener('dragend', ()=> tr.classList.remove('cf-dragging'));
        tr.addEventListener('dragover', (e)=>{ e.preventDefault(); tr.classList.add('cf-drag-over'); });
        tr.addEventListener('dragleave', ()=> tr.classList.remove('cf-drag-over'));
        tr.addEventListener('drop', (e)=>{
          e.preventDefault();
          tr.classList.remove('cf-drag-over');
          const from = parseInt(e.dataTransfer.getData('text/plain'),10);
          const to = parseInt(tr.getAttribute('data-cf-idx'),10);
          if(isNaN(from)||isNaN(to)||from===to) return;
          collectFromUI();
          const arr = DATA.formLayouts[ent]||[];
          if(from<0||from>=arr.length||to<0||to>=arr.length) return;
          const item = arr.splice(from,1)[0];
          arr.splice(to,0,item);
          renderList();
        });
      });
      box.querySelectorAll('input,select').forEach(inp=>{
        inp.addEventListener('change', ()=>{
          try{
            collectFromUI();
            if(inp.classList.contains('cf-class')) renderList();
            else if(inp.classList.contains('cf-show')){
              collectFromUI();
              if(typeof showToast==='function') showToast('اضغط «حفظ التعديلات» لتطبيق ظهور الأعمدة في الجداول');
              renderPreview();
            } else renderPreview();
          }catch(_e){}
        });
      });
      renderPreview();
    }
    function renderPreview(){
      const ent = document.getElementById('cfEntity')?.value || 'employees';
      const prev = document.getElementById('cfFormPreview');
      if(!prev) return;
      const head = document.querySelector('.cf-preview-modal-head');
      const foot = document.getElementById('cfPreviewFoot');
      if(head) head.style.display = 'none';
      if(foot) foot.style.display = 'none';
      document.querySelector('.cf-preview-modal')?.classList.add('cf-preview-live');
      prev.className = 'cf-form-preview cf-form-preview-live';
      if(!prev.firstElementChild) prev.innerHTML = '<div class="cf-skel"><div class="cf-skel-line" style="width:40%"></div><div class="cf-skel-line" style="width:70%"></div></div>';
      const token = (window.__cfPrevToken = (window.__cfPrevToken||0)+1);
      setTimeout(()=>{
        if(token !== window.__cfPrevToken) return;
        let html = '';
        try{
          if(typeof captureRealFormPreview==='function') html = captureRealFormPreview(ent) || '';
        }catch(e){ console.warn(e); }
        if(token !== window.__cfPrevToken) return;
        if(!html){
          prev.innerHTML = '<div style="text-align:center;padding:24px;color:var(--ink-soft);">تعذر تحميل معاينة هذه القائمة</div>';
          return;
        }
        prev.innerHTML = '<div class="modal-overlay cf-prev-overlay"><div class="'+(window.__cfModalCls||'modal')+'">'+html+'</div></div>';
        try{
          const wrapW = (prev.parentElement && prev.parentElement.parentElement ? prev.parentElement.parentElement.clientWidth : 0) || 900;
          const MW = window.__cfModalW || 1120; prev.style.maxWidth = 'none'; prev.style.width = MW+'px'; prev.style.zoom = String(Math.min(1, (wrapW - 34)/MW));
        }catch(_e){}
        // طبّق الأسماء والإخفاء حسب المخطط المحفوظ
        try{
          if(typeof applyFormLayout==='function') applyFormLayout(ent, prev);
        }catch(_e){}
        prev.querySelectorAll('input, select, textarea, button').forEach(el=>{
          el.disabled = true;
          el.tabIndex = -1;
          if(el.tagName==='BUTTON'){ el.onclick = null; el.removeAttribute('onclick'); }
        });
        prev.querySelectorAll('.modal-close').forEach(b=>{
          b.onclick = (e)=>{ e.preventDefault(); e.stopPropagation(); };
          b.removeAttribute('onclick');
        });
        // سحب أي خانة في المعاينة عبر المخطط + selector
        try{
          const layout = (DATA.formLayouts && DATA.formLayouts[ent]) || [];
          const builtins = (typeof FORM_BUILTIN_FIELDS!=='undefined' && FORM_BUILTIN_FIELDS[ent]) || [];
          layout.forEach((item, idx)=>{
            if(!item || item.visible===false) return;
            let el = null;
            const sel = item.selector || (builtins.find(b=>b.key===item.key)||{}).selector;
            if(sel){ try{ el = prev.querySelector(sel); }catch(_e){} }
            let lab = el ? (el.closest('label') || el.parentElement) : null;
            // fallback: مطابقة النص
            if(!lab && item.label){
              prev.querySelectorAll('label').forEach(L=>{
                if(lab) return;
                const t = (L.querySelector('.cf-field-title')||L).textContent||'';
                if(t.trim().indexOf(String(item.label).trim())===0) lab = L;
              });
            }
            if(!lab) return;
            lab.setAttribute('draggable','true');
            lab.dataset.layoutIdx = String(idx);
            lab.classList.add('cf-preview-field');
            if(!lab.querySelector('.cf-drag-handle')){
              const h = document.createElement('span');
              h.className = 'cf-drag-handle';
              h.textContent = '⠿ ' + (idx+1);
              h.title = 'اسحب للتحريك';
              lab.style.position = lab.style.position || 'relative';
              lab.insertBefore(h, lab.firstChild);
            }
            if(!lab.querySelector('.cf-pf-tools') && !(typeof readOnlyMode!=='undefined' && readOnlyMode)){
              const tools = document.createElement('span'); tools.className = 'cf-pf-tools';
              const inTbl = item.showInTable!==false;
              const rowOf = ()=> document.querySelector('#cfFieldsList tr[data-cf-key="'+String(item.key).replace(/"/g,'\\"')+'"]');
              const mk = (txt, title, fn, on)=>{ const b = document.createElement('button'); b.type='button'; b.className='cf-pf-btn'+(on?' on':''); b.textContent=txt; b.title=title; b.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); fn(); }); tools.appendChild(b); };
              const poke = (sel, val)=>{ const tr = rowOf(); if(!tr) return; const c = tr.querySelector(sel); if(!c) return; if(c.type==='checkbox') c.checked = val; else c.value = val; c.dispatchEvent(new Event('change',{bubbles:true})); };
              mk('▦', inTbl?'يظهر في الجدول — اضغط للإخفاء':'مخفي من الجدول — اضغط للإظهار', ()=>poke('.cf-show', !inTbl), inTbl);
              mk('👁', 'إخفاء من النموذج', ()=>{ poke('.cf-vis', false); renderList(); }, true);
              mk('↔', 'ضبط الطول/العرض من الجدول', ()=>{ const tr = rowOf(); const inp = tr && tr.querySelector('.cf-w'); if(inp){ inp.scrollIntoView({block:'center'}); inp.focus(); } }, false);
              mk('✎', 'تعديل الاسم', ()=>{
                const nv = window.prompt ? null : null;
                const tr = rowOf(); const inp = tr && tr.querySelector('.cf-label'); if(!inp) return;
                inp.scrollIntoView({block:'center'}); inp.focus(); inp.select();
              }, false);
              lab.insertBefore(tools, lab.firstChild);
            }
            lab.addEventListener('dragstart', (e)=>{
              lab.classList.add('cf-dragging');
              e.dataTransfer.setData('text/plain', String(idx));
              e.dataTransfer.effectAllowed = 'move';
            });
            lab.addEventListener('dragend', ()=> lab.classList.remove('cf-dragging'));
            lab.addEventListener('dragover', (e)=>{ e.preventDefault(); lab.classList.add('cf-drag-over'); });
            lab.addEventListener('dragleave', ()=> lab.classList.remove('cf-drag-over'));
            lab.addEventListener('drop', (e)=>{
              e.preventDefault();
              lab.classList.remove('cf-drag-over');
              const from = parseInt(e.dataTransfer.getData('text/plain'),10);
              const to = parseInt(lab.dataset.layoutIdx,10);
              if(isNaN(from)||isNaN(to)||from===to) return;
              collectFromUI();
              const arr = DATA.formLayouts[ent]||[];
              if(from<0||from>=arr.length||to<0||to>=arr.length) return;
              const moved = arr.splice(from,1)[0];
              arr.splice(to,0,moved);
              renderList();
            });
          });
        }catch(_e){}
        try{
          const hid = ((DATA.formLayouts && DATA.formLayouts[ent]) || []).filter(x=>x && x.visible===false);
          prev.querySelectorAll('.cf-ghost-strip').forEach(n=>n.remove());
          if(hid.length){
            const g = document.createElement('div'); g.className = 'cf-ghost-strip';
            g.innerHTML = '<span>خانات مخفية — اضغط لإظهارها:</span>' + hid.map(x=>'<button type="button" class="cf-ghost" data-k="'+escapeHtml(x.key||'')+'">＋ '+escapeHtml(x.label||x.key||'')+'</button>').join('');
            g.querySelectorAll('.cf-ghost').forEach(b=>b.addEventListener('click', ()=>{
              const tr = document.querySelector('#cfFieldsList tr[data-cf-key="'+b.dataset.k+'"]'); const c = tr && tr.querySelector('.cf-vis'); if(!c) return;
              c.checked = true; collectFromUI(); renderList();
            }));
            prev.appendChild(g);
          }
        }catch(_e){}
      }, 40);
    }
    function collectFromUI(){
      const ent = document.getElementById('cfEntity')?.value || 'employees';
      DATA.formLayouts = DATA.formLayouts || {};
      const rows = [];
      document.querySelectorAll('#cfFieldsList tr[data-cf-key]').forEach(tr=>{
        const key = tr.getAttribute('data-cf-key');
        const id = tr.getAttribute('data-cf-id')||'';
        const label = (tr.querySelector('.cf-label')?.value||'').trim();
        const classVal = tr.querySelector('.cf-class')?.value || tr.getAttribute('data-cf-type') || 'builtin';
        const type = classVal === 'custom' ? 'custom' : 'builtin';
        if(!label && type==='custom') return;
        const builtinDef = (typeof FORM_BUILTIN_FIELDS!=='undefined' && FORM_BUILTIN_FIELDS[ent]||[]).find(t=>t.key===key);
        const finalLabel = label || (builtinDef && builtinDef.label) || key;
        const prevItem = ((DATA.formLayouts||{})[ent]||[]).find(x=>x && x.key===key) || {};
        const builtinDef2 = (typeof FORM_BUILTIN_FIELDS!=='undefined' && (FORM_BUILTIN_FIELDS[ent]||[])).find(t=>t.key===key);
        rows.push({
          key: key || id || uidCf(),
          id: id || (type==='custom' ? (id||key||uidCf()) : ''),
          label: finalLabel,
          type,
          selector: prevItem.selector || (builtinDef2 && builtinDef2.selector) || '',
          visible: !!(tr.querySelector('.cf-vis')?.checked),
          size: tr.querySelector('.cf-h')?.dataset.size || 'md',
          height: (function(){ const v = parseInt(tr.querySelector('.cf-h')?.value,10); return v>0 ? Math.max(30, Math.min(800, v)) : 0; })(),
          width: (function(){ const v = parseInt(tr.querySelector('.cf-w')?.value,10); return v>0 ? Math.max(60, Math.min(1200, v)) : 0; })(),
          fieldType: tr.querySelector('.cf-ftype')?.value || 'text',
          showInTable: !!(tr.querySelector('.cf-show')?.checked),
          _userHidTable: !(tr.querySelector('.cf-show')?.checked),
          _defLabel: builtinDef ? builtinDef.label : undefined,
          _defTable: builtinDef ? (builtinDef.table!==false) : undefined
        });
      });
      DATA.formLayouts[ent] = rows;
      if(typeof syncCustomDefsFromLayout==='function') syncCustomDefsFromLayout(ent);
    }
    (function bindCfEntityTabs(){
      const hidden = document.getElementById('cfEntity');
      const tabs = document.getElementById('cfEntityTabs');
      const hint = document.getElementById('cfEntityHint');
      if(!hidden || !tabs) return;
      const titles = {
        employees:'إضافة / تعديل موظف', workers:'إضافة / تعديل عامل', supervisors:'إضافة / تعديل مشرف',
        drivers:'إضافة / تعديل سائق', equipment:'إضافة / تعديل معدة أو مركبة', projects:'إضافة / تعديل مشروع',
        attendance:'تسجيل حضور موظف', workerAttendance:'تسجيل يومية', equipmentDaily:'يومية معدة',
        expenses:'إضافة مصروف (أشخاص)', vehicleExpenses:'إضافة مصروف (معدات)', costs:'إضافة تكلفة',
        payments:'دفع مستحق / خصم', fuel:'صرف وقود', documents:'إرفاق مستند', leaves:'طلب إجازة',
        transfers:'أمر نقل موارد', performance:'تقييم أداء', departments:'إضافة قسم', users:'إضافة مستخدم',
        clCustomers:'إضافة / تعديل عميل', clContracts:'إضافة / تعديل عقد', clInvoices:'إضافة / تعديل مستخلص', clBoqs:'إضافة / تعديل مقايسة', clSurveys:'عمل حصر', clCollections:'تسجيل تحصيل', clGuarantees:'إضافة / تعديل ضمان'
      };
      tabs.querySelectorAll('.cf-ent-tab').forEach(tab=>{
        tab.addEventListener('click', ()=>{
          if(tab.classList.contains('active')) return;
          try{ collectFromUI(); }catch(_e){}
          const v = tab.getAttribute('data-val');
          hidden.value = v;
          tabs.querySelectorAll('.cf-ent-tab').forEach(t=>t.classList.remove('active'));
          tab.classList.add('active');
          if(hint) hint.textContent = 'قائمة: ' + (titles[v]||((FORM_REGISTRY.find(r=>r.key===v)||{}).label)||v);
          window.__cfPrevToken = (window.__cfPrevToken||0) + 1;
          try{ renderList(); }catch(e){ console.warn(e); }
        });
      });
    })();
    const _pr = document.getElementById('cfPerRow');
    const _syncPerRow = ()=>{ if(_pr){ const e = document.getElementById('cfEntity')?.value || 'employees'; _pr.value = ((DATA.formCols||{})[e])||''; } };
    _syncPerRow();
    document.getElementById('cfEntity')?.addEventListener('change', _syncPerRow);
    _pr?.addEventListener('change', ()=>{
      const e = document.getElementById('cfEntity')?.value || 'employees';
      DATA.formCols = DATA.formCols || {};
      const n = parseInt(_pr.value,10); if(n>0) DATA.formCols[e] = Math.min(6,n); else delete DATA.formCols[e];
      try{ if(typeof renderPreview==='function') renderPreview(); }catch(_x){}
    });
    document.getElementById('btnCfAdd')?.addEventListener('click', ()=>{
      if(readOnlyMode){ showToast('وضع القراءة فقط'); return; }
      const ent = document.getElementById('cfEntity')?.value || 'employees';
      collectFromUI();
      DATA.formLayouts = DATA.formLayouts || {};
      DATA.formLayouts[ent] = DATA.formLayouts[ent] || [];
      const id = uidCf();
      DATA.formLayouts[ent].push({ key:id, id, label:'', type:'custom', visible:true, size:'md', showInTable:true });
      renderList();
      const inputs = document.querySelectorAll('#cfFieldsList .cf-label');
      if(inputs.length) inputs[inputs.length-1].focus();
    });
    document.getElementById('btnCfSave')?.addEventListener('click', ()=>{
      if(readOnlyMode){ showToast('وضع القراءة فقط'); return; }
      collectFromUI();
      // تأكيد حفظ علامات الجدول
      const ent = document.getElementById('cfEntity')?.value || 'employees';
      DATA.formLayouts = DATA.formLayouts || {};
      (DATA.formLayouts[ent]||[]).forEach(x=>{
        if(!x) return;
        x.showInTable = x.showInTable === true || x.showInTable === false ? !!x.showInTable : true;
      });
      saveData(true);
      if(typeof addAudit==='function') addAudit('تعديلات مخصصة', 'حفظ مخطط القوائم');
      showToast('تم الحفظ — الأعمدة تظهر/تختفي في جداول الصفحات');
      renderList();
    });
    document.getElementById('btnCfReset')?.addEventListener('click', async ()=>{
      if(readOnlyMode){ showToast('وضع القراءة فقط'); return; }
      const ent = document.getElementById('cfEntity')?.value || 'employees';
      const titles = {
        employees:'الموظف', workers:'العامل', supervisors:'المشرف', drivers:'السائق', equipment:'المعدة',
        projects:'المشروع', attendance:'حضور موظف', workerAttendance:'تسجيل يومية', equipmentDaily:'يومية معدة',
        expenses:'مصروف أشخاص', vehicleExpenses:'مصروف معدات', costs:'التكلفة', payments:'دفع مستحق',
        fuel:'الوقود', documents:'إرفاق مستند', leaves:'الإجازة', transfers:'أمر النقل', performance:'التقييم',
        departments:'القسم', users:'المستخدم'
      };
      const name = titles[ent] || ((FORM_REGISTRY.find(r=>r.key===ent)||{}).label) || ent;
      const ok = typeof confirmApp==='function'
        ? await confirmApp('استعادة الإعدادات الافتراضية لقائمة «'+name+'»؟\nسيُلغى ترتيب الأسماء والأحجام المخصص لهذه القائمة فقط.', { title:'استعادة الافتراضي', okLabel:'استعادة', cancelLabel:'إلغاء' })
        : confirm('استعادة الافتراضي؟');
      if(!ok) return;
      if(typeof resetFormLayoutDefault==='function') resetFormLayoutDefault(ent);
      else { DATA.formLayouts = DATA.formLayouts||{}; delete DATA.formLayouts[ent]; }
      saveData(true);
      if(typeof addAudit==='function') addAudit('تعديلات مخصصة', 'استعادة افتراضي: '+ent);
      showToast('تمت استعادة القائمة الافتراضية');
      renderList();
    });
    if(typeof repairAllFormLayouts==='function') repairAllFormLayouts();
    window.refreshCustomFieldsList = renderList;
    renderList();
  })(); } catch(e){ console.error('initCustomFieldsUI', e); }

  // نسخ احتياطي
  // النسخة الاحتياطية الإضافية
  const extraTxt = document.getElementById('extraBackupDirText');
  const refreshExtra = async ()=>{
    if(!extraTxt) return;
    if(!(window.desktopApi && window.desktopApi.getExtraBackupDir)){ extraTxt.textContent = 'متاحة في نسخة سطح المكتب فقط'; return; }
    try{ const d = await window.desktopApi.getExtraBackupDir(); extraTxt.textContent = d || 'لم يتم اختيار مكان'; }catch(_e){ extraTxt.textContent = '—'; }
  };
  refreshExtra();
  document.getElementById('btnPickExtraBackup')?.addEventListener('click', async ()=>{
    if(!(window.desktopApi && window.desktopApi.pickExtraBackupDir)){ showToast('متاحة في نسخة سطح المكتب فقط'); return; }
    const r = await window.desktopApi.pickExtraBackupDir();
    if(r && r.ok){ showToast('تم اختيار المكان — هتتنسخ نسخة يومية تلقائياً'); try{ await window.desktopApi.backupNow(); }catch(_e){} refreshExtra(); }
    else if(r && r.error) showToast(r.error);
  });
  document.getElementById('btnExtraBackupNow')?.addEventListener('click', async ()=>{
    if(!(window.desktopApi && window.desktopApi.backupNow)){ showToast('متاحة في نسخة سطح المكتب فقط'); return; }
    try{ if(typeof flushSave==='function') await flushSave(); }catch(_e){}
    const r = await window.desktopApi.backupNow();
    showToast(r && r.ok ? 'تم النسخ للمكان الإضافي' : ('تعذر النسخ: '+((r&&r.error)||'')));
  });
  document.getElementById('btnClearExtraBackup')?.addEventListener('click', async ()=>{
    if(!(window.desktopApi && window.desktopApi.clearExtraBackupDir)) return;
    await window.desktopApi.clearExtraBackupDir(); showToast('تم إلغاء النسخة الإضافية'); refreshExtra();
  });
  const exp = document.getElementById('btnExportBackup');
  if(exp) exp.addEventListener('click', async ()=>{
    try{
      const json = JSON.stringify(DATA, null, 2);
      const name = 'hr-backup-'+todayISO()+'.json';
      if(window.desktopApi && window.desktopApi.saveFile){
        const res = await window.desktopApi.saveFile(name, json);
        if(res && res.canceled) return;
        if(res && res.ok===false){ showToast(res.error||'فشل التصدير'); return; }
        showToast('تم حفظ النسخة الاحتياطية');
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([json],{type:'application/json'}));
        a.download = name; a.click();
        showToast('تم التنزيل');
      }
    }catch(e){ showToast('تعذر التصدير'); console.warn(e); }
  });

  const imp = document.getElementById('btnImportBackup');
  if(imp) imp.addEventListener('click', async ()=>{
    if(readOnlyMode){ showToast('وضع القراءة فقط'); return; }
    confirmApp('استيراد نسخة سيستبدل البيانات الحالية. هل لديك نسخة احتياطية؟', { title: 'تأكيد', okLabel: 'متابعة' }).then(async ok=>{ if(!ok) return;
      try{
      let text = null;
      if(window.desktopApi && window.desktopApi.openFile){
        const res = await window.desktopApi.openFile();
        if(!res || res.canceled) return;
        text = res.content || res.data || (typeof res === 'string' ? res : null);
        if(!text && res.path){ showToast('تعذر قراءة الملف'); return; }
      } else {
        // متصفح: input file
        await new Promise((resolve)=>{
          const input = document.createElement('input');
          input.type = 'file'; input.accept = '.json,application/json';
          input.onchange = async ()=>{
            const f = input.files && input.files[0];
            if(!f){ resolve(); return; }
            text = await f.text();
            resolve();
          };
          input.click();
        });
      }
      if(!text){ showToast('لم يتم اختيار ملف'); return; }
      let parsed = null;
      try{ parsed = JSON.parse(String(text).replace(/^\uFEFF/, '')); }catch(_e){ parsed = null; }
      const chk = (typeof validateBackupObject==='function') ? validateBackupObject(parsed) : { ok: !!parsed };
      if(!chk.ok){ showToast('ملف غير صالح: ' + (chk.error||'ليس نسخة احتياطية من البرنامج')); return; }
      // 1) احفظ أي تعديلات لسه ما اتحفظتش، 2) خُد نسخة أمان من الملف الحالي قبل الاستبدال
      try{ if(typeof flushSave==='function') await flushSave(); }catch(_e){}
      if(window.desktopApi && window.desktopApi.snapshotData){
        const snap = await window.desktopApi.snapshotData('import');
        if(snap && snap.ok === false){ showToast('تعذر عمل نسخة أمان قبل الاستيراد — تم الإلغاء'); return; }
      }
      const prevData = JSON.parse(JSON.stringify(DATA));   // للتراجع الفوري لو حصل خطأ أثناء التطبيق
      try{
        // نفس المفاتيح اللي في النسخة تتبدّل كاملة. إعدادات الشبكة بتاعت الجهاز مش بتتغير.
        Object.keys(parsed).forEach(k=>{ if(k !== 'network') DATA[k] = parsed[k]; });
        if(typeof sanitizeLoadedData==='function') sanitizeLoadedData();
        if(typeof migrateLegacyFields==='function') migrateLegacyFields();
        if(typeof rebuildIndexes==='function') rebuildIndexes();
      }catch(applyErr){
        DATA = prevData;
        if(typeof rebuildIndexes==='function') rebuildIndexes();
        throw applyErr;
      }
      await saveData(true);
      addAudit('استيراد نسخة احتياطية', '');
      showToast('تم الاستيراد بنجاح');
      render();
      }catch(e){
      console.warn(e);
      showToast('فشل الاستيراد — تأكد أن الملف JSON صالح');
      }
    });
  });

  document.getElementById('clImportOldBtn')?.addEventListener('click', ()=>{
    if(typeof readOnlyMode!=='undefined' && readOnlyMode){ showToast('🔒 قراءة فقط'); return; }
    document.getElementById('clImportOldFile')?.click();
  });
  const clFile = document.getElementById('clImportOldFile');
  if(clFile) clFile.addEventListener('change', async ()=>{
    const file = clFile.files && clFile.files[0];
    clFile.value = '';
    if(!file) return;
    try{
      const text = await file.text();
      if(typeof clImportLegacyClientsData!=='function'){ showToast('وحدة الاستيراد غير متاحة'); return; }
      const res = clImportLegacyClientsData(text);
      showToast('تم استيراد العملاء: +' + res.added + ' · دمج ' + res.merged + ' · الإجمالي ' + res.total);
      try{ if(typeof addAudit==='function') addAudit('استيراد بيانات العملاء', res.added+'/'+res.merged); }catch(_e){}
      if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
    }catch(e){ showToast('فشل الاستيراد: '+(e.message||e)); console.error(e); }
  });
  document.getElementById('hrImportOldBtn')?.addEventListener('click', ()=>{
    if(typeof readOnlyMode!=='undefined' && readOnlyMode){ showToast('🔒 قراءة فقط'); return; }
    document.getElementById('hrImportOldFile')?.click();
  });
  const hrFile = document.getElementById('hrImportOldFile');
  if(hrFile) hrFile.addEventListener('change', async ()=>{
    const file = hrFile.files && hrFile.files[0];
    hrFile.value = '';
    if(!file) return;
    try{
      const res = hrImportLegacyData(await file.text());
      showToast('تم استيراد الموارد البشرية: +' + res.added + ' سجل جديد · تخطي ' + res.skipped + ' موجود');
      try{ if(typeof addAudit==='function') addAudit('استيراد بيانات الموارد البشرية', res.added+'/'+res.skipped); }catch(_e){}
      if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
    }catch(e){ showToast('فشل الاستيراد: '+(e.message||e)); console.error(e); }
  });
  const excelImp = document.getElementById('btnExcelImport');
  if(excelImp) excelImp.addEventListener('click', ()=>{
    if(typeof openExcelImportModal==='function') openExcelImportModal();
    else showToast('وحدة الاستيراد غير متاحة');
  });

  // CSV
  function bindCsv(id, fn){
    const el = document.getElementById(id);
    if(el) el.addEventListener('click', ()=>{ try{ fn(); }catch(e){ showToast('فشل التصدير'); }});
  }
  bindCsv('expEmpCsv', ()=>{
    downloadCsv('employees.csv', ['الكود','الاسم','القسم','الوظيفة','الراتب','الحالة'],
      (DATA.employees||[]).map(e=>[e.code,e.name,departmentName(e.departmentId),e.jobTitle,toInt(e.salary),labelOf(EMPLOYEE_STATUS,e.status)]));
    showToast('تم التصدير');
  });
  bindCsv('expWrkCsv', ()=>{
    downloadCsv('workers.csv', ['الكود','الاسم','المشرف','اليومية','المشروع','الحالة'],
      (DATA.workers||[]).map(w=>[w.code,w.name,supervisorName(w.supervisorId),toInt(w.dailyWage),w.project,labelOf(WORKER_STATUS,w.status)]));
    showToast('تم التصدير');
  });
  bindCsv('expSupCsv', ()=>{
    downloadCsv('supervisors.csv', ['الكود','الاسم','الهاتف','اليومية','المشروع','الحالة'],
      (DATA.supervisors||[]).map(s=>[s.code,s.name,s.phone,toInt(s.dailyWage),s.project,s.status]));
    showToast('تم التصدير');
  });
  bindCsv('expEqCsv', ()=>{
    downloadCsv('equipment.csv', ['الكود','الاسم','النوع','رقم المركبة','الحالة','الموقع'],
      (DATA.equipment||[]).map(eq=>[eq.code,eq.name,eq.typeLabel||labelOf(EQUIPMENT_TYPES,eq.type),eq.vehicleNumber,labelOf(EQUIPMENT_STATUS,eq.status),eq.location]));
    showToast('تم التصدير');
  });
  bindCsv('expPayCsv', ()=>{
    downloadCsv('payroll.csv', ['الموظف','السنة','الشهر','الأساسي','البدلات','الخصومات','الصافي'],
      (DATA.payroll||[]).map(p=>[employeeName(p.employeeId),p.year,p.month,toInt(p.basicSalary),toInt(p.allowances),toInt(p.deductions),toInt(p.netSalary)]));
    showToast('تم التصدير');
  });
  bindCsv('expLeaveCsv', ()=>{
    downloadCsv('leaves.csv', ['الموظف','النوع','من','إلى','أيام','الحالة'],
      (DATA.leaves||[]).map(l=>[employeeName(l.employeeId),labelOf(LEAVE_TYPES,l.type),l.from,l.to,toInt(l.days),labelOf(LEAVE_STATUS,l.status)]));
    showToast('تم التصدير');
  });
  function empRows(){
    return (DATA.employees||[]).map(e=>[e.code,e.name,departmentName(e.departmentId),e.position,toInt(e.salary),e.status]);
  }
  function wrkRows(){
    return (DATA.workers||[]).map(w=>[w.code,w.name,supervisorName(w.supervisorId),toInt(w.dailyWage),w.project,w.status]);
  }
  function supRows(){
    return (DATA.supervisors||[]).map(s=>[s.code,s.name,s.phone,toInt(s.dailyWage),s.project,s.status]);
  }
  function drvRows(){
    return (DATA.drivers||[]).map(d=>[d.code,d.name,d.phone,toInt(d.dailyWage),d.project,d.status]);
  }
  function eqRows(){
    return (DATA.equipment||[]).map(eq=>[eq.code,eq.name,eq.typeLabel||labelOf(EQUIPMENT_TYPES,eq.type),eq.vehicleNumber,labelOf(EQUIPMENT_STATUS,eq.status),eq.location]);
  }
  bindCsv('expWattCsv', ()=>{
    downloadCsv('worker-attendance.csv', ['التاريخ','العامل/المشرف','الحالة','اليومية','خصم','المشروع'],
      (DATA.workerAttendance||[]).map(a=>[
        a.date,
        a.personType==='supervisor'?supervisorName(a.personId):a.personType==='driver'?driverName(a.personId):workerName(a.workerId||a.personId),
        a.status, toInt(a.dayWage), toInt(a.deduction), a.project||''
      ]));
    showToast('تم التصدير');
  });
  bindCsv('expDrvCsv', ()=>{ downloadCsv('drivers.csv', ['الكود','الاسم','الهاتف','اليومية','المشروع','الحالة'], drvRows()); showToast('تم التصدير'); });
  const bindX = (id, fn)=>{ const el=document.getElementById(id); if(el) el.addEventListener('click', ()=>{ try{ fn(); }catch(e){ showToast('فشل التصدير'); } }); };
  bindX('expEmpXlsx', ()=> downloadXlsx('employees.xlsx', ['الكود','الاسم','القسم','الوظيفة','الراتب','الحالة'], empRows(), 'موظفين'));
  bindX('expWrkXlsx', ()=> downloadXlsx('workers.xlsx', ['الكود','الاسم','المشرف','اليومية','المشروع','الحالة'], wrkRows(), 'عمال'));
  bindX('expSupXlsx', ()=> downloadXlsx('supervisors.xlsx', ['الكود','الاسم','الهاتف','اليومية','المشروع','الحالة'], supRows(), 'مشرفين'));
  bindX('expDrvXlsx', ()=> downloadXlsx('drivers.xlsx', ['الكود','الاسم','الهاتف','اليومية','المشروع','الحالة'], drvRows(), 'سائقين'));
  bindX('expEqXlsx', ()=> downloadXlsx('equipment.xlsx', ['الكود','الاسم','النوع','رقم المركبة','الحالة','الموقع'], eqRows(), 'معدات'));
  bindX('expPayXlsx', ()=> downloadXlsx('payroll.xlsx', ['الموظف','السنة','الشهر','الأساسي','البدلات','الخصومات','الصافي'],
    (DATA.payroll||[]).map(p=>[employeeName(p.employeeId),p.year,p.month,toInt(p.basicSalary),toInt(p.allowances),toInt(p.deductions),toInt(p.netSalary)]), 'رواتب'));
  bindX('expLeaveXlsx', ()=> downloadXlsx('leaves.xlsx', ['الموظف','النوع','من','إلى','أيام','الحالة'],
    (DATA.leaves||[]).map(l=>[employeeName(l.employeeId),labelOf(LEAVE_TYPES,l.type),l.from,l.to,toInt(l.days),labelOf(LEAVE_STATUS,l.status)]), 'إجازات'));
  bindX('expWattXlsx', ()=> downloadXlsx('attendance-daily.xlsx', ['التاريخ','العامل/المشرف','الحالة','اليومية','خصم','المشروع'],
    (DATA.workerAttendance||[]).map(a=>[
      a.date,
      a.personType==='supervisor'?supervisorName(a.personId):a.personType==='driver'?driverName(a.personId):workerName(a.workerId||a.personId),
      a.status, toInt(a.dayWage||a.dailyWage), toInt(a.deduction), a.project||''
    ]), 'يوميات'));
  const archPdfBtn = document.getElementById('expArchPdf');
  if(archPdfBtn) archPdfBtn.addEventListener('click', ()=>{ if(typeof printArchiveAllPdf==='function') printArchiveAllPdf(null); });

  // مسار البيانات
  const pathLine = document.getElementById('dataPathLine');
  if(pathLine && window.desktopApi && window.desktopApi.getDataPath){
    window.desktopApi.getDataPath().then(p=>{
      pathLine.textContent = 'المسار الحالي: ' + (p || '—');
    }).catch(()=>{ pathLine.textContent = 'مسار محلي على الجهاز'; });
  } else if(pathLine) pathLine.textContent = 'غير متاح إلا في نسخة سطح المكتب';

  const pickDir = document.getElementById('pickDataDirBtn');
  if(pickDir) pickDir.addEventListener('click', async ()=>{
    if(!(window.desktopApi && window.desktopApi.pickDataDir)){
      showToast('متاح فقط في نسخة سطح المكتب'); return;
    }
    try{
      const res = await window.desktopApi.pickDataDir();
      if(res && res.canceled) return;
      const dir = (res && res.path) ? res.path : (typeof res === 'string' ? res : null);
      if(!dir){ showToast('لم يتم اختيار مجلد'); return; }
      if(window.desktopApi.setDataDir){
        const r = await window.desktopApi.setDataDir(dir, true);
        if(r && r.ok===false){ showToast(r.error||'فشل تغيير المسار'); return; }
      }
      showToast('تم تغيير مسار البيانات');
      if(pathLine) pathLine.textContent = 'المسار الحالي: ' + dir;
    }catch(e){ showToast('تعذر تغيير المسار'); console.warn(e); }
  });

  const resetDir = document.getElementById('resetDataDirBtn');
  if(resetDir) resetDir.addEventListener('click', async ()=>{
    if(!(window.desktopApi && window.desktopApi.resetDataDir)){
      showToast('متاح فقط في نسخة سطح المكتب'); return;
    }
    confirmApp('إعادة مسار البيانات للافتراضي؟', { title: 'تأكيد', okLabel: 'متابعة' }).then(async ok=>{ if(!ok) return;
      try{
      const r = await window.desktopApi.resetDataDir();
      if(r && r.ok===false){ showToast(r.error||'فشل'); return; }
      showToast('تمت إعادة المسار الافتراضي');
      if(pathLine && window.desktopApi.getDataPath){
        const p = await window.desktopApi.getDataPath();
        pathLine.textContent = 'المسار الحالي: ' + (p||'—');
      }
      }catch(e){ showToast('تعذر إعادة المسار'); }
    });
  });

  // ===== التحديث (الإصلاح الرئيسي) =====
  const upd = document.getElementById('safeUpdateBtn');
  const statusBox = document.getElementById('updateStatusBox');
  function setUpdateStatus(msg, isErr){
    if(!statusBox) return;
    statusBox.style.display = '';
    statusBox.style.borderColor = isErr ? '#c0392b' : 'var(--line)';
    statusBox.style.color = isErr ? '#c0392b' : 'inherit';
    statusBox.textContent = msg;
  }
  if(upd){
    upd.addEventListener('click', async ()=>{
      if(!(window.desktopApi && window.desktopApi.pickInstaller)){
        showToast('التحديث متاح فقط من نسخة سطح المكتب المثبتة');
        setUpdateStatus('التحديث غير متاح في وضع المتصفح / التطوير بدون desktopApi', true);
        return;
      }
      try{
        setUpdateStatus('جاري فتح نافذة اختيار الملف…');
        const picked = await window.desktopApi.pickInstaller();
        if(!picked || picked.canceled || picked.ok===false){
          setUpdateStatus('تم إلغاء الاختيار');
          return;
        }
        let filePath = '';
        if(typeof picked === 'string') filePath = picked;
        else if(picked && typeof picked === 'object') filePath = picked.path || picked.filePath || picked.file || '';
        filePath = String(filePath||'').trim();
        if(!filePath){
          setUpdateStatus('لم يُرجع مسار ملف صالح. تأكد أنك اخترت ملف .exe أو .zip', true);
          showToast('ملف غير صالح');
          return;
        }
        setUpdateStatus('فحص ملف التحديث: ' + (picked.name || filePath) + ' …');
        let info = null;
        if(window.desktopApi.inspectUpdate){
          info = await window.desktopApi.inspectUpdate(filePath);
        }
        if(info && info.ok===false){
          setUpdateStatus(info.error || info.message || 'الملف ليس تحديثاً صالحاً', true);
          showToast(info.error || info.message || 'ملف غير صالح');
          return;
        }
        const cur = (info && info.currentVersion) || '';
        const neu = (info && (info.updateVersion || info.version)) || '';
        let msg = 'الملف: ' + (picked.name || filePath);
        if(cur || neu) msg += '\nالإصدار الحالي: ' + (cur||'—') + ' → الجديد: ' + (neu||'—');
        if(info && info.sameVersion) msg += '\n(نفس الإصدار — سيتم استبدال الملفات)';
        if(info && info.nameLooksValid===false) msg += '\n\nملاحظة: اسم الملف غير معتاد، لكن يمكنك المتابعة إذا كنت متأكداً أنه ملف التحديث.';
        msg += '\n\nمتابعة التثبيت؟\n• ملف Setup.exe: يفتح المثبت ثم يُغلق البرنامج\n• ملف zip: يستبدل ملفات البرنامج ويعيد فتحه\n• بياناتك محفوظة ولن تُمس';
        const okUp = await confirmApp(msg, { title:'تأكيد التحديث', okLabel:'متابعة التثبيت', cancelLabel:'إلغاء', danger:false });
        if(!okUp){
          setUpdateStatus('تم إلغاء التثبيت');
          return;
        }
        setUpdateStatus('جاري تشغيل المثبت…');
        const run = await window.desktopApi.runInstaller(filePath);
        if(run && run.ok===false){
          setUpdateStatus(run.error || 'فشل تشغيل المثبت', true);
          showToast(run.error || 'فشل التحديث');
          return;
        }
        setUpdateStatus((run && run.message) || 'تم تشغيل التحديث. قد يُغلق البرنامج الآن.');
        showToast('تم بدء التحديث');
      }catch(e){
        console.warn(e);
        setUpdateStatus('خطأ: ' + (e.message||e), true);
        showToast('تعذر التحديث');
      }
    });
  }

  // شبكة — واجهة متطورة
  (async function refreshNetStatusUI(){
    const line = document.getElementById('netStatusLine');
    const detail = document.getElementById('netStatusDetail');
    const portInp = document.getElementById('netPortInput');
    const urlInp = document.getElementById('netHostUrlInput');
    if(portInp && typeof getHostPort==='function') portInp.value = getHostPort() || 4173;
    if(urlInp && typeof getHostUrl==='function' && getHostUrl()) urlInp.value = getHostUrl();
    if(!line) return;
    const mode = typeof getDeviceMode==='function' ? getDeviceMode() : 'standalone';
    let st = null;
    try{ if(window.desktopApi && window.desktopApi.serverStatus) st = await window.desktopApi.serverStatus(); }catch(_e){}
    let lanUrls = [];
    try{ lanUrls = JSON.parse(localStorage.getItem('mb_lan_urls')||'[]'); }catch(_e){}
    if(st && st.urls && st.urls.length) lanUrls = st.urls;
    else if(st && st.ips && st.port) lanUrls = st.ips.map(ip=>'http://'+ip+':'+st.port);

    if(mode==='host'){
      line.textContent = (st && st.running) ? '🟢 وضع مضيف — السيرفر يعمل' : '🟡 وضع مضيف — أعد فتح البرنامج لإكمال التشغيل';
      const parts = [];
      if(st && st.port) parts.push('المنفذ: <code dir="ltr">'+st.port+'</code>');
      if(lanUrls.length) parts.push('عناوين للأجهزة الأخرى:<br>'+lanUrls.map(u=>'<code dir="ltr" style="user-select:all;">'+escapeHtml(u)+'</code>').join('<br>'));
      else parts.push('بعد إعادة التشغيل ستظهر عناوين الشبكة هنا.');
      parts.push('دخول افتراضي: <code>admin</code> / <code>admin123</code>');
      if(typeof currentUser!=='undefined' && currentUser) parts.push('المستخدم: '+escapeHtml(currentUser.name||currentUser.username||''));
      if(detail) detail.innerHTML = parts.join('<br>');
    } else if(mode==='client'){
      line.textContent = '🔵 وضع عميل';
      if(detail) detail.innerHTML = 'العنوان: <code dir="ltr">'+escapeHtml(typeof getHostUrl==='function'?getHostUrl():'')+'</code>';
    } else {
      line.textContent = '⚪ وضع جهاز واحد';
      if(detail) detail.textContent = 'البيانات على هذا الجهاز فقط. شغّل المضيف للمشاركة مع أجهزة أخرى على نفس الشبكة.';
    }
  })();

  const netHost = document.getElementById('netStartHostBtn');
  if(netHost) netHost.addEventListener('click', async ()=>{
    const port = Number(document.getElementById('netPortInput')?.value) || 4173;
    netHost.disabled = true; netHost.textContent = 'جاري التشغيل…';
    try{
      let r;
      if(typeof activateHostMode==='function') r = await activateHostMode(port);
      else {
        if(!(window.desktopApi && window.desktopApi.serverStart)){ showToast('متاح في نسخة سطح المكتب فقط'); return; }
        r = await window.desktopApi.serverStart(port);
        if(r && r.ok!==false){
          if(typeof setDeviceMode==='function') setDeviceMode('host');
          if(typeof setHostPort==='function') setHostPort(r.port||port);
        }
      }
      if(!r || r.ok===false){ showToast((r&&r.error)||'فشل تشغيل المضيف'); return; }
      showToast('تم تشغيل المضيف — المنفذ '+(r.port||port)+' — جاري إعادة التشغيل');
      setTimeout(()=>location.reload(), 700);
    }catch(e){ showToast('فشل: '+(e&&e.message?e.message:'')); }
    finally { netHost.disabled=false; netHost.textContent='▶ تشغيل كمضيف'; }
  });

  const netJoin = document.getElementById('netJoinClientBtn');
  if(netJoin) netJoin.addEventListener('click', async ()=>{
    let url = (document.getElementById('netHostUrlInput')?.value||'').trim();
    if(!url) url = (prompt('أدخل عنوان المضيف (مثال: http://192.168.1.10:4173)')||'').trim();
    if(!url) return;
    netJoin.disabled = true; netJoin.textContent = 'جاري الاتصال…';
    try{
      let r = typeof activateClientMode==='function' ? await activateClientMode(url) : null;
      if(!r){
        if(typeof setHostUrl==='function') setHostUrl(url);
        if(typeof setDeviceMode==='function') setDeviceMode('client');
        r = { ok:true, url };
      }
      if(!r.ok){ showToast(r.error||'تعذر الاتصال'); return; }
      if(document.getElementById('netHostUrlInput')) document.getElementById('netHostUrlInput').value = r.url||url;
      showToast('تم الاتصال — جاري فتح شاشة الدخول');
      setTimeout(()=>location.reload(), 500);
    }catch(e){ showToast('فشل الاتصال'); }
    finally { netJoin.disabled=false; netJoin.textContent='🔗 الاتصال كعميل'; }
  });

  const netTest = document.getElementById('netTestBtn');
  if(netTest) netTest.addEventListener('click', async ()=>{
    let url = (document.getElementById('netHostUrlInput')?.value||'').trim();
    if(!url && typeof getHostUrl==='function') url = getHostUrl()||'';
    if(!url){ showToast('اكتب عنوان المضيف أولاً'); return; }
    if(!/^https?:\/\//i.test(url)) url = 'http://'+url;
    url = url.replace(/\/$/,'');
    netTest.disabled = true;
    try{
      const ctrl = new AbortController();
      const t = setTimeout(()=>ctrl.abort(), 5000);
      const r = await fetch(url+'/api/ping', { signal: ctrl.signal });
      clearTimeout(t);
      const j = await r.json().catch(()=>({}));
      if(r.ok && j.ok!==false) showToast('الاتصال ناجح ✓'+(j.port?(' — منفذ '+j.port):''));
      else showToast('المضيف ردّ بخطأ');
    }catch(e){ showToast('فشل الاختبار — المضيف غير متاح'); }
    finally { netTest.disabled = false; }
  });

  const netStop = document.getElementById('netStopBtn');
  if(netStop) netStop.addEventListener('click', async ()=>{
    const ok = typeof confirmApp==='function'
      ? await confirmApp('إيقاف الشبكة والرجوع لوضع جهاز واحد؟', { title:'إيقاف الشبكة', okLabel:'إيقاف', cancelLabel:'إلغاء' })
      : confirm('إيقاف الشبكة؟');
    if(!ok) return;
    try{
      if(typeof deactivateNetworkMode==='function') await deactivateNetworkMode();
      else {
        if(window.desktopApi && window.desktopApi.serverStop) await window.desktopApi.serverStop();
        if(typeof setDeviceMode==='function') setDeviceMode('standalone');
      }
      showToast('تم الرجوع لوضع جهاز واحد');
      setTimeout(()=>location.reload(), 400);
    }catch(e){ showToast('تعذر الإيقاف'); }
  });

  // مسح البيانات
  const wipe = document.getElementById('btnWipeData');
  if(wipe) wipe.addEventListener('click', ()=>{
    if(readOnlyMode){ showToast('وضع القراءة فقط'); return; }
    confirmApp('هل أنت متأكد؟ سيتم حذف كل البيانات نهائياً.', { title: 'تأكيد', okLabel: 'متابعة' }).then(ok1=>{
      if(!ok1) return;
      confirmApp('تأكيد نهائي: مسح الموظفين والعمال والمشرفين والمعدات وكل السجلات؟', { title: 'تأكيد', okLabel: 'مسح نهائي' }).then(ok2=>{
        if(!ok2) return;
        (async ()=>{
        try{ if(typeof flushSave==='function') await flushSave(); }catch(_e){}
        if(window.desktopApi && window.desktopApi.snapshotData){
          const snap = await window.desktopApi.snapshotData('wipe');
          if(snap && snap.ok === false){ showToast('تعذر عمل نسخة أمان قبل المسح — تم الإلغاء'); return; }
        }
        DATA = {
          employees:[], workers:[], supervisors:[], drivers:[], equipment:[], departments:[], projects:[], equipmentTypes:[],
          attendance:[], workerAttendance:[], leaves:[], payroll:[],
          workerPayments:[], employeePenalties:[], equipmentLogs:[], expenses:[],
          customFieldDefs:{ employees:[], workers:[], supervisors:[], equipment:[], departments:[] },
          settings:{ companyName:'', companyAddress:'', companyPhone:'', companyTaxId:'', workDaysPerMonth:26, defaultLeaveDays:21, defaultDailyWage:0 },
          auditLog:[], users:[]
        };
        if(typeof rebuildIndexes==='function') rebuildIndexes();
        await saveData(true);
        showToast('تم مسح كل البيانات (اتحفظت نسخة أمان قبل المسح)');
        render();
        })();
      });
    });
  });
}


/** استيراد بيانات برنامج الموارد البشرية القديم (data.json) ودمجها بدون تكرار */
function hrImportLegacyData(raw){
  if(!raw) throw new Error('ملف فارغ');
  let data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if(data && data.data && typeof data.data === 'object' && !Array.isArray(data.data)) data = data.data;
  if(!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('صيغة الملف غير مدعومة');
  const KEYS = ['employees','workers','supervisors','drivers','equipment','projects','attendance','workerAttendance','leaves','payroll','workerPayments','employeePenalties','equipmentLogs','equipmentDaily','fuelLogs','resourceTransfers','projectPlans','projectDaily','performanceReviews','personDocuments','supervisorExpenses','expenses','costs','licenseExpenses','equipmentTypes','expenseTypes','documentTypes','dailyTasks'];
  const people = { employees:'code', workers:'code', supervisors:'code', drivers:'code', equipment:'code' };
  let added = 0, skipped = 0, found = 0;
  KEYS.forEach(k=>{
    const src = data[k]; if(!Array.isArray(src) || !src.length) return;
    found++;
    if(!Array.isArray(DATA[k])) DATA[k] = [];
    const ids = new Set(DATA[k].map(x=>x && x.id).filter(Boolean));
    const codes = people[k] ? new Set(DATA[k].map(x=>x && x[people[k]]).filter(Boolean).map(String)) : null;
    src.forEach(r=>{
      if(r == null) return;
      if(typeof r !== 'object'){ if(DATA[k].indexOf(r) < 0){ DATA[k].push(r); added++; } else skipped++; return; }
      if(r.id && ids.has(r.id)){ skipped++; return; }
      if(codes && r.code && codes.has(String(r.code))){ skipped++; return; }
      const rec = JSON.parse(JSON.stringify(r));
      if(!rec.id) rec.id = (typeof uid==='function' ? uid() : 'imp_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6));
      DATA[k].push(rec); ids.add(rec.id); if(codes && rec.code) codes.add(String(rec.code)); added++;
    });
  });
  if(!found) throw new Error('لا توجد بيانات موارد بشرية معروفة في الملف');
  try{ if(typeof ensureAllResignedDepartments==='function') ensureAllResignedDepartments(); }catch(_e){}
  saveData();
  return { added, skipped };
}
