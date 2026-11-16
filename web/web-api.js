/* =========================================================================
   web-api.js — window.desktopApi بنفس الأسماء الـ 42 فوق /api/* والمتصفح (A4، D-007)
   - data: loadData/saveData/saveDataSync → WebSync (السيرفر)
   - browser: ملفات/إكسيل/روابط → APIs المتصفح
   - attach (A5) و pdf/backup (A6): لسه → رد واضح من غير ما حاجة تكسر
   - remove: حاجات الديسكتوب بس (مجلد البيانات، المحدّث، وضع الشبكة القديم، ماسح ويندوز)
   ========================================================================= */
(function () {
  'use strict';
  var NA = { ok: false, reason: 'not-available-on-web', error: 'الميزة دي مش متاحة في نسخة الويب' };
  var LATER_ATTACH = { ok: false, reason: 'coming-soon', error: 'المرفقات هتتفعّل في نسخة الويب قريبًا (المرحلة A5)' };
  function na() { return Promise.resolve(Object.assign({}, NA)); }
  function toast(m) { try { if (typeof window.showToast === 'function') window.showToast(m); } catch (e) {} }

  function download(blob, filename) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || 'download';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function pickFile(accept) {
    return new Promise(function (resolve) {
      var input = document.createElement('input');
      input.type = 'file';
      if (accept) input.accept = accept;
      input.style.display = 'none';
      var done = false;
      input.addEventListener('change', function () { done = true; resolve(input.files && input.files[0] || null); input.remove(); });
      // إلغاء نافذة الاختيار: مفيش حدث رسمي — بنعتبره إلغاء لما الصفحة ترجع focus من غير ملف
      window.addEventListener('focus', function onF() { window.removeEventListener('focus', onF); setTimeout(function () { if (!done) { resolve(null); input.remove(); } }, 800); });
      document.body.appendChild(input);
      input.click();
    });
  }

  function readAs(file, how) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
      if (how === 'text') r.readAsText(file, 'utf-8'); else r.readAsArrayBuffer(file);
    });
  }

  /** طباعة HTML في iframe مخفي (بديل مؤقت للـ PDF لحد A6: «حفظ كـ PDF» من نافذة الطباعة) */
  function printHtml(html) {
    return new Promise(function (resolve) {
      var f = document.createElement('iframe');
      f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
      document.body.appendChild(f);
      var doc = f.contentWindow.document;
      doc.open(); doc.write(html); doc.close();
      setTimeout(function () {
        try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {}
        setTimeout(function () { f.remove(); resolve({ ok: true, printed: true }); }, 500);
      }, 300);
    });
  }

  var version = null;
  var api = {
    // ---------------- data
    loadData: async function () { await window.WebSession.ready(); return window.WebSync.bootstrap(); },
    saveData: function (data) { return window.WebSync.save(data); },
    saveDataSync: function (data) { return window.WebSync.saveSync(data); },
    getAppVersion: async function () {
      if (version) return version;
      try { var r = await fetch('/api/health'); var j = await r.json(); version = (j.version || '') + '-web'; } catch (e) { version = 'web'; }
      return version;
    },
    // ---------------- auth (السيرفر هو اللي بيشفّر ويتحقق — الواجهة مابتحسبش hash)
    hashPassword: function () { return Promise.resolve({ salt: '', hash: '', web: true }); },
    verifyPassword: function () { return Promise.resolve(false); },
    askPin: function () { return Promise.resolve({ ok: false, reason: 'not-available-on-web' }); },
    // ---------------- browser
    openExternalLink: function (url) { try { window.open(String(url), '_blank', 'noopener'); return Promise.resolve({ ok: true }); } catch (e) { return Promise.resolve({ ok: false }); } },
    saveFile: function (filename, content) {
      download(new Blob([content == null ? '' : String(content)], { type: 'application/octet-stream' }), filename);
      return Promise.resolve({ ok: true, filePath: filename });
    },
    openFile: async function () {
      var f = await pickFile('.json,application/json');
      if (!f) return { ok: false, canceled: true };
      return { ok: true, content: await readAs(f, 'text') };
    },
    importExcel: async function () {
      if (!window.XLSX) return { ok: false, error: 'مكتبة الإكسيل غير متاحة' };
      var f = await pickFile('.xlsx,.xls,.csv');
      if (!f) return { ok: false, canceled: true };
      try {
        var wb = window.XLSX.read(new Uint8Array(await readAs(f, 'buffer')), { type: 'array' });
        var sheets = {};
        wb.SheetNames.forEach(function (name) {
          var rawRows = window.XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: '' });
          var textRows = window.XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: '' });
          // نفس تحويل نسخة الديسكتوب بالظبط (src/main/excel.js)
          sheets[name] = rawRows.map(function (row, ri) {
            var trow = textRows[ri] || [];
            return (row || []).map(function (cell, ci) {
              if (typeof cell === 'number' && cell > 20000 && cell < 80000) return cell;
              if (trow[ci] !== undefined && trow[ci] !== '') return trow[ci];
              return cell == null ? '' : cell;
            });
          });
        });
        return { ok: true, sheetNames: wb.SheetNames, sheets: sheets, fileName: f.name };
      } catch (e) { return { ok: false, error: String(e) }; }
    },
    exportExcel: function (payload) {
      if (!window.XLSX) return Promise.resolve({ ok: false, error: 'مكتبة الإكسيل غير متاحة' });
      try {
        var headers = Array.isArray(payload.headers) ? payload.headers : [];
        var rows = Array.isArray(payload.rows) ? payload.rows : [];
        var ws = window.XLSX.utils.aoa_to_sheet([headers].concat(rows));
        ws['!cols'] = headers.map(function (h, idx) {
          var max = String(h || '').length;
          rows.forEach(function (r) { var v = r[idx]; var len = v == null ? 0 : String(v).length; if (len > max) max = len; });
          return { wch: Math.min(Math.max(max + 2, 10), 45) };
        });
        if (headers.length) ws['!autofilter'] = { ref: window.XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }) };
        var wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, String(payload.sheetName || 'بيانات').replace(/[\[\]:*?\/\\]/g, '-').slice(0, 31) || 'بيانات');
        var name = String(payload.filename || 'بيانات.xlsx');
        if (!/\.xlsx$/i.test(name)) name += '.xlsx';
        window.XLSX.writeFile(wb, name);
        return Promise.resolve({ ok: true, filePath: name });
      } catch (e) { return Promise.resolve({ ok: false, error: String(e) }); }
    },
    // ---------------- pdf (A6: PDF عربي على السيرفر) — دلوقتي: نافذة الطباعة ← «حفظ كـ PDF»
    savePdf: function () { window.print(); return Promise.resolve({ ok: true, printed: true }); },
    savePdfHtml: function (payload) { return printHtml((payload && payload.html) || ''); },
    exportArchive: function () { toast('تصدير الأرشيف هيتفعّل في نسخة الويب مع المرفقات'); return Promise.resolve(Object.assign({}, LATER_ATTACH)); },
    // ---------------- backup (A6: النسخ الاحتياطي على السيرفر تلقائي)
    snapshotData: function () { return Promise.resolve({ ok: true, skipped: true, reason: 'server-backups' }); },
    safetyBackup: function () { return Promise.resolve({ ok: true, skipped: true, reason: 'server-backups' }); },
    backupNow: function () { toast('النسخ الاحتياطي في نسخة الويب بيتعمل تلقائيًا على السيرفر'); return Promise.resolve({ ok: true, skipped: true }); },
    getExtraBackupDir: function () { return Promise.resolve(''); },
    pickExtraBackupDir: na, clearExtraBackupDir: na,
    // ---------------- attachments (A5)
    pickAttachments: function () { toast(LATER_ATTACH.error); return Promise.resolve({ ok: false, canceled: true, files: [] }); },
    openAttachment: function () { toast(LATER_ATTACH.error); return Promise.resolve(Object.assign({}, LATER_ATTACH)); },
    readAttachmentDataUrl: function () { return Promise.resolve(Object.assign({}, LATER_ATTACH)); },
    deleteAttachment: function () { return Promise.resolve({ ok: true, skipped: true }); },
    saveAttachmentBuffer: function () { toast(LATER_ATTACH.error); return Promise.resolve(Object.assign({}, LATER_ATTACH)); },
    cleanupOrphans: function () { return Promise.resolve(Object.assign({}, LATER_ATTACH)); },
    scanAttachment: function () { return Promise.resolve(Object.assign({}, LATER_ATTACH)); },
    // ---------------- desktop only (بتتشال من الويب)
    getLockInfo: function () { return Promise.resolve({}); },
    getDataPath: function () { return Promise.resolve(''); },
    getDefaultDataPath: function () { return Promise.resolve(''); },
    pickDataDir: na, setDataDir: na, resetDataDir: na,
    serverStart: na, serverStop: na, serverStatus: function () { return Promise.resolve({ running: false, web: true }); },
    pickInstaller: na, runInstaller: na, inspectUpdate: na,
    scanWindows: na, openWindowsScanApp: na,
  };
  api.__web = true;
  window.desktopApi = api;
})();
