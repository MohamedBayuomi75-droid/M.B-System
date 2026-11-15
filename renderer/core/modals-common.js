/* ---------------- Modals: مشتركة بين أكثر من شاشة ---------------- */
/** مسح / كاميرا: التقاط → معاينة → تأكيد الإرفاق — تستخدمها مودالات الموردين والفواتير والدفعات */
/** مسح / كاميرا: التقاط → معاينة → تأكيد الإرفاق */
/** اسم مقترح للمرفق من رقم الفاتورة (فارغ لو غير متاح) */
function preferredAttachNameFromInvoice(invNumber){
  const n = String(invNumber||'').trim().replace(/[\\/:*?"<>|]+/g,'-');
  return n ? ('فاتورة-' + n) : '';
}
function openScanAttachModal(invoiceId, onSaved, preferredName){
  const overlay = el(`
    <div class="modal-overlay" id="scanOverlay">
      <div class="modal wide">
        <h3>مسح ضوئي للمستند</h3>
        <p style="font-size:13px;color:var(--ink-soft);margin:0 0 12px;">مناسب لويندوز: امسح من الماسح الضوئي، راجع الصورة، ثم ارفعها كمرفق.</p>
        <div class="btn-row" style="margin-bottom:14px;flex-wrap:wrap;gap:8px;">
          <button type="button" class="btn btn-primary" id="scanWiaBtn">🖨 مسح من الماسح الضوئي (ويندوز)</button>
          <button type="button" class="btn btn-outline" id="scanOpenWinAppBtn">فتح تطبيق مسح ويندوز</button>
          <label class="btn btn-outline" style="cursor:pointer;">
            اختيار ملف ماسح محفوظ
            <input type="file" id="scanFileInput" accept="image/*,application/pdf" style="display:none;" />
          </label>
        </div>
        <div id="scanStatus" style="font-size:13px;color:var(--ink-soft);margin-bottom:10px;"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div>
            <div style="font-weight:700;margin-bottom:6px;">كاميرا الجهاز (اختياري)</div>
            <video id="scanVideo" autoplay playsinline style="width:100%;max-height:240px;background:#111;border-radius:10px;object-fit:contain;"></video>
            <canvas id="scanCanvas" style="display:none;"></canvas>
            <div class="btn-row" style="margin-top:8px;">
              <button type="button" class="btn btn-outline btn-sm" id="scanCaptureBtn">📸 التقاط من الكاميرا</button>
              <button type="button" class="btn btn-outline btn-sm" id="scanFlipBtn">تبديل كاميرا</button>
            </div>
          </div>
          <div>
            <div style="font-weight:700;margin-bottom:6px;">المعاينة قبل الرفع</div>
            <div id="scanPreviewBox" style="min-height:240px;background:var(--paper-2);border:1px dashed var(--line);border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden;">
              <span style="color:var(--ink-soft);font-size:13px;">امسح المستند أو اختر ملفاً لعرض المعاينة هنا</span>
            </div>
            <div class="btn-row" style="margin-top:8px;">
              <button type="button" class="btn btn-outline btn-sm" id="scanRetakeBtn" disabled>مسح المعاينة</button>
            </div>
          </div>
        </div>
        <div class="modal-actions" style="margin-top:16px;">
          <button class="btn btn-outline" id="scanCancel">إلغاء</button>
          <button class="btn btn-primary" id="scanConfirm" disabled>تأكيد ورفع المرفق</button>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(overlay);

  let stream = null;
  let facingMode = 'environment';
  let capturedDataUrl = null;
  let capturedName = null;
  let capturedMime = 'image/jpeg';

  const video = document.getElementById('scanVideo');
  const canvas = document.getElementById('scanCanvas');
  const preview = document.getElementById('scanPreviewBox');
  const confirmBtn = document.getElementById('scanConfirm');
  const retakeBtn = document.getElementById('scanRetakeBtn');

  async function startCamera(){
    try{
      if(stream){ stream.getTracks().forEach(tr=>tr.stop()); }
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      video.srcObject = stream;
    }catch(err){
      preview.innerHTML = `<span style="color:var(--debt);padding:12px;text-align:center;display:block;">تعذر فتح الكاميرا: ${escapeHtml(String(err.message||err))}<br><small>يمكنك اختيار صورة من الجهاز بدلاً من ذلك</small></span>`;
    }
  }

  function setPreview(dataUrl, name, mime){
    capturedDataUrl = dataUrl;
    capturedName = name || ('scan-' + new Date().toISOString().slice(0,19).replace(/[:T]/g,'-') + '.jpg');
    capturedMime = mime || 'image/jpeg';
    if(mime && mime.includes('pdf')){
      preview.innerHTML = `<div style="padding:20px;text-align:center;">📄 ملف PDF جاهز للرفع<br><strong>${escapeHtml(capturedName)}</strong></div>`;
    } else {
      preview.innerHTML = `<img src="${dataUrl}" alt="معاينة" style="max-width:100%;max-height:280px;object-fit:contain;" />`;
    }
    confirmBtn.disabled = false;
    retakeBtn.disabled = false;
  }

  const statusEl = document.getElementById('scanStatus');
  document.getElementById('scanWiaBtn').addEventListener('click', async ()=>{
    statusEl.textContent = 'جاري المسح من الماسح الضوئي... انتظر حتى ينتهي الجهاز.';
    statusEl.style.color = 'var(--ink-soft)';
    const res = await window.desktopApi.scanWindows();
    if(!res || !res.ok){
      statusEl.textContent = (res && res.error) || 'فشل المسح';
      statusEl.style.color = 'var(--debt)';
      showToast((res && res.error) || 'فشل المسح');
      return;
    }
    setPreview(res.base64, res.fileName || ('scan-' + Date.now() + '.jpg'), 'image/jpeg');
    statusEl.textContent = 'تم المسح — راجع المعاينة ثم اضغط تأكيد ورفع المرفق';
    statusEl.style.color = 'var(--ledger-green)';
    showToast('تم المسح — راجع المعاينة');
  });
  document.getElementById('scanOpenWinAppBtn').addEventListener('click', async ()=>{
    await window.desktopApi.openWindowsScanApp();
    statusEl.textContent = 'تم فتح تطبيق مسح ويندوز. بعد المسح احفظ الصورة ثم اختر «اختيار ملف ماسح محفوظ».';
    showToast('افتح الماسح، احفظ الصورة، ثم اخترها من هنا');
  });

  document.getElementById('scanCaptureBtn').addEventListener('click', ()=>{
    if(!video.videoWidth){ showToast('الكاميرا غير جاهزة بعد'); return; }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setPreview(dataUrl, 'scan-' + Date.now() + '.jpg', 'image/jpeg');
    showToast('راجع المعاينة ثم اضغط تأكيد ورفع');
  });

  document.getElementById('scanFlipBtn').addEventListener('click', ()=>{
    facingMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera();
  });

  document.getElementById('scanRetakeBtn').addEventListener('click', ()=>{
    capturedDataUrl = null;
    confirmBtn.disabled = true;
    retakeBtn.disabled = true;
    preview.innerHTML = '<span style="color:var(--ink-soft);font-size:13px;">لم يتم التقاط صورة بعد</span>';
  });

  document.getElementById('scanFileInput').addEventListener('change', (e)=>{
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      setPreview(reader.result, file.name, file.type || 'image/jpeg');
      showToast('راجع الملف ثم اضغط تأكيد ورفع');
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('scanCancel').addEventListener('click', ()=>{
    if(stream) stream.getTracks().forEach(tr=>tr.stop());
    overlay.remove();
  });
  overlay.addEventListener('click', e=>{
    if(e.target===overlay){
      if(stream) stream.getTracks().forEach(tr=>tr.stop());
      overlay.remove();
    }
  });

  document.getElementById('scanConfirm').addEventListener('click', async ()=>{
    if(!capturedDataUrl){ showToast('التقط صورة أو اختر ملفاً أولاً'); return; }
    confirmBtn.disabled = true;
    const prefer = preferredName || preferredAttachNameFromInvoice(
      (document.getElementById('inv_number') && document.getElementById('inv_number').value) || ''
    );
    const nameToSave = prefer
      ? (prefer + (prefer.match(/\.[a-z0-9]+$/i) ? '' : (capturedName && capturedName.includes('.') ? capturedName.slice(capturedName.lastIndexOf('.')) : '.jpg')))
      : capturedName;
    const res = await window.desktopApi.saveAttachmentBuffer(invoiceId, nameToSave, capturedDataUrl, capturedMime, prefer || '');
    if(!res || !res.ok){
      showToast((res && res.error) || 'تعذر حفظ المرفق');
      confirmBtn.disabled = false;
      return;
    }
    if(stream) stream.getTracks().forEach(tr=>tr.stop());
    overlay.remove();
    if(typeof onSaved === 'function') onSaved(res.file);
    showToast('تم رفع المرفق بنجاح');
  });

  startCamera();
}
