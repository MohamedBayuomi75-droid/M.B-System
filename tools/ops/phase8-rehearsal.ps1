<#
  البروفة المجمّعة للمرحلة 8 (DEC-0136، DEC-0143) — اليوميات (8.5) ← الصرف (8.6) ← المعدات (8.7) ← التكاليف (8.8).
  الدليل: docs/modules/PHASE_08_COMBINED_REHEARSAL_RUNBOOK.md. السكربت بيعمل الخطوات الآلية بس، ويوقف عند كل خطوة محتاجة إنسان
  (النسخة الاحتياطية، والـ UAT). **مفيش أسماء ولا مبالغ أفراد في أي مخرج** — أعداد، وبصمات (أول 8 حروف)، ومجاميع، وأوقات.

  الاستخدام (PowerShell، من فولدر العمل C:\Users\levovo\erp-phase2-proof):
    .\phase8-rehearsal.ps1 -Stage pre                                   # R0 + R0x + dry-run مرتين + تقارير الفرق قبل النقل
    .\phase8-rehearsal.ps1 -Stage execute -ConfirmBackup <وقت النسخة>    # تنفيذ الـ 13 موديول بالترتيب + R1 + تقارير الفرق بعد النقل
    .\phase8-rehearsal.ps1 -Stage after-uat                             # R1u بعد الـ UAT
    .\phase8-rehearsal.ps1 -Stage rollback -ConfirmBackup <وقت النسخة>   # الرجوع بالعكس + R2
    .\phase8-rehearsal.ps1 -Stage summary                               # out\phase8x\SUMMARY.md (للتقرير)
  الإعدادات: -Base (عنوان السيرفر، مثلًا http://127.0.0.1:8080) و-Token (توكن الأدمن: من /legacy/ ← F12 ← WebSession.token()).
#>
param(
  [Parameter(Mandatory = $true)][ValidateSet('pre', 'execute', 'after-uat', 'rollback', 'summary')][string]$Stage,
  [string]$ConfirmBackup = '',
  [string]$Base = $env:ERP_BASE,
  [string]$Token = $env:ERP_TOKEN,
  [string]$By = 'phase8-combined-rehearsal',
  [string]$P = 'erp-phase2-proof',
  [string]$F = 'C:\Users\levovo\erp-phase2-proof\compose.yml',
  [string]$BK = $env:ERP_BACKUP_DIR,
  [string]$Out = 'out\phase8x'
)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $Out | Out-Null
$APPROVED = @('parties', 'warehouses', 'supplier-invoices', 'supplier-payments', 'projects', 'workers', 'supervisors-drivers', 'employees', 'leaves')
$NEW = @('attendance', 'worker-payments', 'equipment', 'costs')
$LOG = Join-Path $Out 'timings.csv'
if (-not (Test-Path $LOG)) { 'stage,step,seconds,exit' | Out-File -Encoding utf8 $LOG }

function Cut([string[]]$a) {
  if (-not $BK) { throw 'حدد مسار النسخ: -BK أو $env:ERP_BACKUP_DIR' }
  # Windows PowerShell 5.1: سطور Docker على stderr («Container … Running») مش أخطاء — exit code هو الحكم (البروفة المجمّعة §و 1)
  $old = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  try { docker compose -p $P -f $F run --rm -v "${BK}:/backup:ro" server node dist/cli/cutover.js @a 2>&1 | ForEach-Object { "$_" } } finally { $ErrorActionPreference = $old }
}
function Step([string]$name, [scriptblock]$body) {
  Write-Host "▶ $name" -ForegroundColor Cyan
  $code = 0; $t = Measure-Command { try { & $body } catch { $script:code = 1; Write-Host "✗ $name : $($_.Exception.Message)" -ForegroundColor Red; throw } }
  "$Stage,$name,$([math]::Round($t.TotalSeconds,1)),$code" | Out-File -Append -Encoding utf8 $LOG
}
function Rec([string]$tag) { foreach ($m in $NEW) { Step "reconcile $m $tag" { Cut @($m, 'reconcile') | Out-File -Encoding utf8 (Join-Path $Out "$m.$tag.json") } } }
function Fp([string]$file) {
  $raw = Get-Content -Raw (Join-Path $Out $file); $i = $raw.IndexOf('{'); $k = $raw.LastIndexOf('}'); if ($i -lt 0 -or $k -lt $i) { throw "$file : مفيش JSON — شوف الملف" }; $j = $raw.Substring($i, $k - $i + 1) | ConvertFrom-Json
  $cols = $j.collections | ForEach-Object { "$($_.collection)=$($_.count)/$($_.content)/$($_.order)/$($_.source)" }
  return @{ cols = ($cols -join ';'); others = "$($j.others.count)/$($j.others.content)"; json = $j }
}
function Same([string]$a, [string]$b, [switch]$IgnoreSource) {
  $ok = $true
  foreach ($m in $NEW) {
    $x = Fp "$m.$a.json"; $y = Fp "$m.$b.json"
    $cx = $x.cols; $cy = $y.cols
    if ($IgnoreSource) { $cx = $cx -replace '/(records|table)', ''; $cy = $cy -replace '/(records|table)', '' }
    $s = ($cx -eq $cy) -and ($x.others -eq $y.others)
    Write-Host ("  {0,-16} {1} = {2} : {3}" -f $m, $a, $b, $(if ($s) { '✅' } else { '❌' }))
    if (-not $s) { $ok = $false }
  }
  return $ok
}
# الشهادة الداخلية مقبولة لـ 127.0.0.1 بس (البروفة المجمّعة §و 1)
if ($PSVersionTable.PSVersion.Major -lt 6 -and $Base -match '^https://127\.0\.0\.1') {
  Add-Type -TypeDefinition 'using System.Net; using System.Security.Cryptography.X509Certificates; public class LocalOnlyCert : ICertificatePolicy { public bool CheckValidationResult(ServicePoint sp, X509Certificate c, WebRequest r, int p) { return r.RequestUri.Host == "127.0.0.1"; } }' -ErrorAction SilentlyContinue
  [System.Net.ServicePointManager]::CertificatePolicy = New-Object LocalOnlyCert
  [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
}
function Api([string]$path) {
  # التوكن بيتقري وقت كل طلب (بيخلص بعد فترة): $env:ERP_TOKEN أو ملف out\phase8x\token.txt (اللي برّه المستودع)
  $tok = $env:ERP_TOKEN; $tf = Join-Path $Out 'token.txt'; if (Test-Path $tf) { $tok = (Get-Content -Raw $tf).Trim() }; if (-not $tok) { $tok = $Token }
  if (-not $Base -or -not $tok) { throw 'حدد -Base والتوكن ($env:ERP_TOKEN أو out\phase8x\token.txt)' }
  $req = @{ Uri = "$Base$path"; Headers = @{ Authorization = "Bearer $tok" } }
  if ($PSVersionTable.PSVersion.Major -ge 6 -and $Base -match '^https://127\.0\.0\.1') { $req.SkipCertificateCheck = $true }
  return Invoke-RestMethod @req
}
# مجاميع بس — مفيش أسماء ولا مبالغ أفراد
function Snapshot([string]$tag) {
  Step "api snapshot $tag" {
    $d = Api '/api/v1/dailies/diff'; $rv = Api '/api/v1/dailies/review'
    $dues = @{}; foreach ($t in 'workers', 'supervisors', 'drivers', 'employees', 'equipment') { $x = Api "/api/v1/dues/table?tab=$t"
      $dues[$t] = @{ rows = @($x.rows).Count; due = $x.cards.due; legacyDue = $x.cards.legacyDue; bal = $x.cards.bal; legacyBal = $x.cards.legacyBal; changed = @($x.rows | Where-Object { "$($_.legacyBal)" -ne "$([double]$_.bal)" }).Count } }
    $eq = Api '/api/v1/equipment/daily?from=2000-01-01&to=2099-12-31'
    $kinds = @{}; foreach ($l in @($eq.list)) { $k = if ($l.kind) { $l.kind } else { 'work' }; $kinds[$k] = 1 + [int]$kinds[$k] }
    $pc = Api '/api/v1/project-cost'; $bp = Api '/api/v1/project-cost/by-project'
    $cols = @{}; foreach ($c in @($pc.cols)) { $cols[$c.key] = @{ legacy = $pc.totals.legacy.($c.key); new = $pc.totals.new.($c.key) } }
    $statusChanged = @($bp.PSObject.Properties | Where-Object { $_.Value.legacyStatus -ne $_.Value.budgetStatus }).Count
    $snap = @{
      at = (Get-Date).ToString('s'); dailies = @{ records = $d.records; changed = $d.changed; byReason = $d.byReason; legacyTotal = $d.legacyTotal; newTotal = $d.newTotal; difference = $d.difference; review = @($rv.rows).Count }
      dues = $dues; equipment = @{ dailies = @($eq.list).Count; byKind = $kinds; moveWithoutCost = @($eq.list | Where-Object { $_.kind -eq 'move' -and [double]$_.cost -eq 0 }).Count; cost = $eq.cards.cost; legacyCost = $eq.cards.legacyCost }
      projectCost = @{ rows = @($pc.rows).Count; unregistered = @($pc.unregistered).Count; pendingDailies = $pc.pendingDailies; legacyTotal = $pc.totals.legacy.total; newTotal = $pc.totals.new.total; byColumn = $cols; budgetStatusChanged = $statusChanged }
    }
    $snap | ConvertTo-Json -Depth 6 | Out-File -Encoding utf8 (Join-Path $Out "api.$tag.json")
  }
}
function Strip([string]$f) { (Get-Content (Join-Path $Out $f) | Where-Object { $_ -notmatch '^\s*Container\s' }) -replace '\d{4}-\d{2}-\d{2}T[\d:.]+Z?', '<t>' -replace '\d+(\.\d+)?\s*(ms|ث|s)\b', '<d>' | Where-Object { $_ -notmatch '^\s*$' } }

switch ($Stage) {
  'pre' {
    Rec 'R0'
    Write-Host "`n⏸ افتح /legacy/#workerAttendance و/legacy/#workerDues و/legacy/#equipment و/legacy/#costs واستنى كل صفحة تخلص، وبعدين اضغط Enter" -ForegroundColor Yellow; [void](Read-Host)
    Rec 'R0x'
    $loadOk = Same 'R0' 'R0x'
    foreach ($m in $NEW) { foreach ($i in 1, 2) { Step "dry-run $m #$i" { Cut @($m, 'dry-run') | Out-File -Encoding utf8 (Join-Path $Out "$m.D$i.txt") } } }
    foreach ($m in $NEW) { $same = -not (Compare-Object (Strip "$m.D1.txt") (Strip "$m.D2.txt")); Write-Host ("  {0,-16} D1 = D2 : {1}" -f $m, $(if ($same) { '✅' } else { '❌ — قارن الملفين' })) }
    foreach ($m in $NEW) { if (Select-String -Quiet -Path (Join-Path $Out "$m.D*.txt") -Pattern 'PARITY_FAILED') { Write-Host "❌ $m : PARITY_FAILED — وقّف وابعت اسم الحقل بس" -ForegroundColor Red; exit 1 } }
    Snapshot 'S0'
    Write-Host "`n✓ pre خلص. التحميل في القديمة غيّر حاجة؟ $(if ($loadOk) { 'لأ' } else { 'أيوه — سجّل العدد ونوع التغيير، وكمّل بـ R0x' })"
    Write-Host 'الجاي: نسخة كاملة + اختبار استعادة (الدليل §4)، وبعدين -Stage execute -ConfirmBackup <وقت النسخة>' -ForegroundColor Yellow
  }
  'execute' {
    if (-not $ConfirmBackup) { throw 'لازم -ConfirmBackup بوقت آخر نسخة base ناجحة' }
    foreach ($m in $APPROVED + $NEW) { Step "execute $m" { Cut @($m, 'execute', '--by', $By, '--backup-log', '/backup/backup-log.jsonl', '--confirm-backup', $ConfirmBackup) | Out-File -Encoding utf8 (Join-Path $Out "$m.E.txt"); if ($LASTEXITCODE) { throw "execute $m exit $LASTEXITCODE" } } }
    Rec 'R1'
    $ok = Same 'R0x' 'R1' -IgnoreSource
    foreach ($m in $NEW) { $j = (Fp "$m.R1.json").json; if (@($j.collections | Where-Object { $_.source -ne 'table' }).Count) { Write-Host "❌ $m : مش كله source: table" -ForegroundColor Red; $ok = $false } }
    Snapshot 'S1'
    Write-Host "`n✓ execute خلص. R1 = R0x : $(if ($ok) { '✅' } else { '❌ — وقّف' })"
    Write-Host 'الجاي: الواجهتين فوق الجداول + الـ UAT (الدليل §6)، وبعدين -Stage after-uat' -ForegroundColor Yellow
  }
  'after-uat' { Rec 'R1u'; Snapshot 'S1u'; Write-Host 'الجاي: نسخة + اختبار استعادة، وبعدين -Stage rollback -ConfirmBackup <وقت النسخة>' -ForegroundColor Yellow }
  'rollback' {
    if (-not $ConfirmBackup) { throw 'لازم -ConfirmBackup بوقت آخر نسخة base ناجحة' }
    $order = @($APPROVED + $NEW); [array]::Reverse($order)   # costs ← equipment ← worker-payments ← attendance ← leaves … ← parties
    foreach ($m in $order) { Step "rollback $m" { Cut @($m, 'rollback', '--by', $By, '--backup-log', '/backup/backup-log.jsonl', '--confirm-backup', $ConfirmBackup) | Out-File -Encoding utf8 (Join-Path $Out "$m.RB.txt"); if ($LASTEXITCODE) { throw "rollback $m exit $LASTEXITCODE" } } }
    Rec 'R2'
    $ok = Same 'R1u' 'R2' -IgnoreSource
    Write-Host "`n✓ rollback خلص. R2 = R1u : $(if ($ok) { '✅' } else { '❌' })"
    Write-Host 'الجاي: -Stage summary' -ForegroundColor Yellow
  }
  'summary' {
    $md = @('# ملخص البروفة المجمّعة (آلي) — أعداد وبصمات ومجاميع بس', '', '| الموديول | المجموعة | R0 | R1 | R1u | R2 |', '|---|---|---|---|---|---|')
    foreach ($m in $NEW) {
      $r = @{}; foreach ($t in 'R0', 'R1', 'R1u', 'R2') { $f = Join-Path $Out "$m.$t.json"; if (Test-Path $f) { $r[$t] = (Fp "$m.$t.json").json } }
      foreach ($c in @($r['R0'].collections)) {
        $cell = { param($t) $x = @($r[$t].collections | Where-Object { $_.collection -eq $c.collection })[0]; if ($x) { "$($x.count) · ``$($x.content.Substring(0,[math]::Min(8,$x.content.Length)))`` · $($x.source)" } else { '—' } }
        $md += "| $m | ``$($c.collection)`` | $(& $cell 'R0') | $(& $cell 'R1') | $(& $cell 'R1u') | $(& $cell 'R2') |"
      }
    }
    $md += ''; $md += '## الأوقات'; $md += '| المرحلة | الخطوة | ث | exit |'; $md += '|---|---|---|---|'
    Import-Csv $LOG | ForEach-Object { $md += "| $($_.stage) | $($_.step) | $($_.seconds) | $($_.exit) |" }
    foreach ($t in 'S0', 'S1', 'S1u') { $f = Join-Path $Out "api.$t.json"; if (Test-Path $f) { $md += ''; $md += "## المجاميع $t (من الـ API)"; $md += '```json'; $md += (Get-Content -Raw $f); $md += '```' } }
    $md | Out-File -Encoding utf8 (Join-Path $Out 'SUMMARY.md')
    Write-Host "✓ $(Join-Path $Out 'SUMMARY.md') — راجعه قبل ما تحطه في التقرير (مفيش أسماء)"
  }
}
