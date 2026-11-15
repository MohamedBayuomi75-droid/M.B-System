/* =========================================================
   clients/print.js — طباعة/PDF لأعمال الحصر والمقايسات والمستخلصات (المرحلة 9)
   بنستخدم printHtml القائمة (نفس الترويسة والتوقيع والـ PDF من الأساس) — مفيش نظام طباعة موازي.
   ========================================================= */
function clPrintTableHtml(head, rowsHtml, foot){
  return '<table class="data-table" style="width:100%;border-collapse:collapse;" border="1" cellpadding="5"><thead><tr>' +
    head.map(function(h){ return '<th>' + escapeHtml(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + rowsHtml + '</tbody>' + (foot || '') + '</table>';
}
function clPrintMeta(pairs){
  return '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px 16px;margin:10px 0;font-size:13px;">' +
    pairs.filter(function(p){ return p[1] != null && p[1] !== ''; }).map(function(p){ return '<div><b>' + escapeHtml(p[0]) + ':</b> ' + escapeHtml(String(p[1])) + '</div>'; }).join('') + '</div>';
}
function clPrintItemRows(items, cols){
  return items.map(function(it, i){
    if(it.isHeader) return '<tr><td colspan="' + cols + '"><b>' + escapeHtml(it.name || it.code || '') + '</b></td></tr>';
    return '<tr><td>' + (i + 1) + '</td><td>' + escapeHtml(it.code || '') + '</td><td>' + escapeHtml(it.name || '') + '</td><td>' + escapeHtml(it.unit || '') + '</td><td>' + (it.qty || 0) + '</td><td>' + fmtMoney(it.price || 0) + '</td><td>' + fmtMoney(it.total || 0) + '</td></tr>';
  }).join('');
}
function clPrintSheet(title, bodyHtml, sub){
  if(typeof printHtml !== 'function'){ showToast('الطباعة غير متاحة'); return; }
  printHtml('<div class="print-sheet" dir="rtl">' +
    (typeof statementHeaderHtml === 'function' ? statementHeaderHtml(title, sub || '') : '<h2 style="text-align:center;">' + escapeHtml(title) + '</h2>') +
    bodyHtml + (typeof statementFooterHtml === 'function' ? statementFooterHtml() : '') + '</div>', title);
}

function clPrintBoq(key){
  const b = clAllBoqs().find(function(x){ return x._key === key; }); if(!b){ showToast('المقايسة غير موجودة'); return; }
  const items = (b.items || []).map(clCalcBoqItem);
  clPrintSheet('مقايسة — ' + (b.title || b.id),
    clPrintMeta([['العميل', b.customerName], ['المشروع', b.project], ['الكود', b.id], ['التاريخ', b.date]]) +
    clPrintTableHtml(['م', 'الكود', 'البند', 'الوحدة', 'الكمية', 'السعر', 'الإجمالي'], clPrintItemRows(items, 7),
      '<tfoot><tr><td colspan="6"><b>الإجمالي</b></td><td><b>' + fmtMoney(clBoqTotal(b)) + '</b></td></tr></tfoot>') +
    (b.notes ? '<p style="margin-top:10px;">' + escapeHtml(b.notes) + '</p>' : ''));
}
function clPrintWorkSurvey(key){
  const w = clAllWorkSurveys().find(function(x){ return x._key === key; }); if(!w){ showToast('الحصر غير موجود'); return; }
  const items = (w.items || []).map(clCalcSurveyItem);
  clPrintSheet('محضر حصر أعمال — ' + (w.id || ''),
    clPrintMeta([['العميل', w.customerName], ['المشروع', w.project], ['نوع العمل', w.workType], ['الموقع', w.location], ['المهندس', w.officer], ['المشرف', w.supervisor], ['تاريخ التنفيذ', w.execDate], ['الحالة', w.status]]) +
    clPrintTableHtml(['م', 'الكود', 'البند', 'الوحدة', 'الكمية', 'السعر', 'الإجمالي'], clPrintItemRows(items, 7),
      '<tfoot><tr><td colspan="6"><b>الإجمالي</b></td><td><b>' + fmtMoney(clSurveyTotal(items)) + '</b></td></tr></tfoot>') +
    (w.notes ? '<p style="margin-top:10px;">' + escapeHtml(w.notes) + '</p>' : ''));
}
function clPrintInvoice(key){
  const i = clAllClientInvoices().find(function(x){ return x._key === key; }); if(!i){ showToast('المستخلص غير موجود'); return; }
  const gross = (Number(i.value) || 0) + (Number(i.extras) || 0) - (Number(i.excluded) || 0);
  const ret = gross * ((Number(i.retentionPct) || 0) / 100), tax = gross * ((Number(i.taxPct) || 0) / 100);
  const r = function(l, v, strong){ return '<tr><td>' + escapeHtml(l) + '</td><td>' + (strong ? '<b>' : '') + fmtMoney(v) + (strong ? '</b>' : '') + '</td></tr>'; };
  const net = clInvNet(i), paid = Number(i.paid) || 0;
  clPrintSheet('مستخلص — ' + (i.no || ''),
    clPrintMeta([['العميل', i.customerName], ['المشروع', i.project], ['العقد', i.contractId], ['التاريخ', i.date]]) +
    clPrintTableHtml(['البند', 'القيمة'],
      r('قيمة الأعمال', Number(i.value) || 0) + r('إضافات', Number(i.extras) || 0) + r('مستبعد', -(Number(i.excluded) || 0)) + r('الإجمالي', gross, true) +
      r('خصومات', -(Number(i.deductions) || 0)) + r('خصم دفعة مقدمة', -(Number(i.advanceDeduct) || 0)) +
      r('احتجاز ' + (Number(i.retentionPct) || 0) + '%', -ret) + r('ضريبة ' + (Number(i.taxPct) || 0) + '%', -tax) +
      r('صافي المستخلص', net, true) + r('المسدد', paid) + r('المتبقي', Math.max(0, net - paid), true)) +
    (i.notes ? '<p style="margin-top:10px;">' + escapeHtml(i.notes) + '</p>' : ''));
}
