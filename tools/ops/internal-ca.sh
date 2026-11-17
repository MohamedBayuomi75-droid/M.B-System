#!/usr/bin/env bash
# سلطة شهادات داخلية (Internal CA) + شهادة HTTPS للسيرفر — المرحلة 2، القرار B-57.
#
#   tools/ops/internal-ca.sh <مجلد_الإخراج> <اسم-السيرفر> [أسماء/عناوين إضافية...]
#   مثال: tools/ops/internal-ca.sh /srv/erp/certs erp.company.local erp 192.168.1.20
#
# الناتج:
#   ca/ca.key  (المفتاح الخاص للسلطة — احفظه أوفلاين بعيد عن السيرفر بعد الإصدار، مالوش لازمة على السيرفر)
#   ca/ca.crt  (الشهادة الجذرية — دي اللي بتتثبت على أجهزة الشركة: «Trusted Root Certification Authorities»)
#   server.key / server.crt / fullchain.crt  (لـ Nginx)
# إعادة التشغيل بنفس المجلد: بيستخدم نفس الـ CA (لو موجودة) ويصدر شهادة سيرفر جديدة — مفيش داعي تعيد تثبيت الجذرية.
# الصلاحية: الجذرية 10 سنين، شهادة السيرفر 825 يوم (حد المتصفحات) — جدّدها قبل الانتهاء بنفس الأمر.
set -euo pipefail
OUT=${1:?usage: internal-ca.sh <out-dir> <server-name> [extra names/IPs...]}
NAME=${2:?server name required (e.g. erp.company.local)}
shift 2
ORG=${CA_ORG:-"Unified ERP Internal CA"}
umask 077
mkdir -p "$OUT/ca"
if [ ! -f "$OUT/ca/ca.key" ]; then
  openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out "$OUT/ca/ca.key"
  openssl req -x509 -new -key "$OUT/ca/ca.key" -sha256 -days 3650 -subj "/O=$ORG/CN=$ORG Root" \
    -addext "basicConstraints=critical,CA:TRUE,pathlen:0" -addext "keyUsage=critical,keyCertSign,cRLSign" \
    -addext "subjectKeyIdentifier=hash" -out "$OUT/ca/ca.crt"
  echo "created new root CA: $OUT/ca/ca.crt"
else
  echo "reusing existing root CA: $OUT/ca/ca.crt"
fi
SAN="DNS:$NAME"
for x in "$@"; do
  if [[ $x =~ ^[0-9.]+$ || $x == *:* ]]; then SAN="$SAN,IP:$x"; else SAN="$SAN,DNS:$x"; fi
done
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out "$OUT/server.key"
openssl req -new -key "$OUT/server.key" -subj "/O=$ORG/CN=$NAME" -out "$OUT/server.csr"
cat > "$OUT/server.ext" <<EXT
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature
extendedKeyUsage=serverAuth
subjectAltName=$SAN
authorityKeyIdentifier=keyid
subjectKeyIdentifier=hash
EXT
openssl x509 -req -in "$OUT/server.csr" -CA "$OUT/ca/ca.crt" -CAkey "$OUT/ca/ca.key" -CAcreateserial \
  -days 825 -sha256 -extfile "$OUT/server.ext" -out "$OUT/server.crt"
cat "$OUT/server.crt" "$OUT/ca/ca.crt" > "$OUT/fullchain.crt"
rm -f "$OUT/server.csr" "$OUT/server.ext"
chmod 600 "$OUT/server.key" "$OUT/ca/ca.key"
chmod 644 "$OUT/server.crt" "$OUT/fullchain.crt" "$OUT/ca/ca.crt"
openssl verify -CAfile "$OUT/ca/ca.crt" "$OUT/server.crt"
echo "server certificate for: $SAN"
echo "expires: $(openssl x509 -enddate -noout -in "$OUT/server.crt" | cut -d= -f2)"
