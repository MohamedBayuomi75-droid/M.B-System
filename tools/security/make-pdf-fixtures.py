#!/usr/bin/env python3
# ملفات PDF مُركّبة لاختبار فاحص المرفقات (خطة v1.4.5 — المرحلة 5، قرار B-78 أ). مفيش أي ملف حقيقي.
# بتتولّد بمكتبة مستقلة (qpdf عن طريق pikepdf) عشان الاختبار مايبقاش بيختبر الكود بنفسه.
# التشغيل (مرة واحدة، والملفات بتتحفظ في المستودع): pip install pikepdf && python3 tools/security/make-pdf-fixtures.py
import os, pikepdf
from pikepdf import Pdf, Name, Dictionary, Array, String, Encryption, Permissions, ObjectStreamMode

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'server', 'test', 'fixtures', 'pdf')
os.makedirs(OUT, exist_ok=True)
RESTRICTED = Permissions(print_lowres=False, print_highres=False, modify_other=False, extract=False, modify_annotation=False, modify_assembly=False, modify_form=False, accessibility=True)

def base(js=False):
    pdf = Pdf.new()
    pdf.add_blank_page(page_size=(200, 200))
    page = pdf.pages[0]
    font = pdf.make_indirect(Dictionary(Type=Name.Font, Subtype=Name.Type1, BaseFont=Name.Helvetica))
    page.Resources = Dictionary(Font=Dictionary(F1=font))
    page.Contents = pdf.make_stream(b'BT /F1 12 Tf 20 100 Td (synthetic test) Tj ET')
    pdf.docinfo[Name.Title] = String('synthetic fixture')
    if js:
        action = pdf.make_indirect(Dictionary(Type=Name.Action, S=Name.JavaScript, JS=String('app.alert(1)')))
        pdf.Root.OpenAction = action
    return pdf

def save(pdf, name, enc=None, objstm=False):
    pdf.save(os.path.join(OUT, name), encryption=enc if enc else False,
             object_stream_mode=ObjectStreamMode.generate if objstm else ObjectStreamMode.disable,
             compress_streams=True)

owner = 'owner-secret'
save(base(), 'plain.pdf')
save(base(), 'rc4-40.pdf', Encryption(owner=owner, user='', R=2, aes=False, metadata=False, allow=RESTRICTED))
save(base(), 'rc4-128.pdf', Encryption(owner=owner, user='', R=3, aes=False, metadata=False, allow=RESTRICTED))
save(base(), 'rc4-128-objstm.pdf', Encryption(owner=owner, user='', R=3, aes=False, metadata=False, allow=RESTRICTED), objstm=True)
save(base(), 'aes-128.pdf', Encryption(owner=owner, user='', R=4, aes=True, allow=RESTRICTED), objstm=True)
save(base(), 'aes-128-nometa.pdf', Encryption(owner=owner, user='', R=4, aes=True, metadata=False, allow=RESTRICTED), objstm=True)
save(base(), 'aes-256.pdf', Encryption(owner=owner, user='', R=6, aes=True, allow=RESTRICTED))
save(base(), 'user-password.pdf', Encryption(owner=owner, user='open-me', R=3, aes=False, metadata=False))
save(base(js=True), 'js-plain-objstm.pdf', objstm=True)                                   # JavaScript جوه object stream مضغوط (من غير تشفير)
save(base(js=True), 'js-rc4-128.pdf', Encryption(owner=owner, user='', R=3, aes=False, metadata=False, allow=RESTRICTED))  # الاسم ظاهر في القاموس
save(base(js=True), 'js-aes-128-objstm.pdf', Encryption(owner=owner, user='', R=4, aes=True, allow=RESTRICTED), objstm=True)  # مخفي جوه object stream مشفّر
print('fixtures:', sorted(os.listdir(OUT)))
