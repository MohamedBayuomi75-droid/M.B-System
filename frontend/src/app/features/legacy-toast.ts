/** رسالة التأكيد بنفس شكل الواجهة القديمة وسلوكها (renderer/core/helpers.js showToast: نفس العنصر appToast ونفس الستايل) */
export class LegacyToast {
  show(msg: string, ms = 2800) {
    let t = document.getElementById('appToast') as (HTMLDivElement & { _timer?: ReturnType<typeof setTimeout> }) | null;
    if (!t) {
      t = document.createElement('div');
      t.id = 'appToast'; t.className = 'toast'; t.setAttribute('role', 'status');
      t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1B4332;color:#F6F1E4;padding:12px 22px;border-radius:12px;font-weight:700;font-size:14px;z-index:200000;box-shadow:0 4px 20px rgba(0,0,0,.2);max-width:90%;text-align:center;';
      document.body.appendChild(t);
    }
    t.textContent = msg; t.style.display = 'block';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t!.style.display = 'none'; }, ms);
  }
}
