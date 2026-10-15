# شحنة (shahna.store)

## التشغيل على جهازك للتجربة
```
ADMIN_PASSWORD=رمز_قوي_8_احرف node server.js
```
ثم افتح http://localhost:3000

## النشر (Render مثلاً)
1. ارفع هذا المجلد على GitHub (مستودع Private).
2. في render.com: New > Web Service > اختر المستودع. Start Command: `node server.js`
3. Environment: `ADMIN_PASSWORD` = رمز إدارة قوي (8 أحرف أو أكثر)، و `DATA_DIR` = `/var/data`
4. أضف Disk (قرص دائم) مسار الربط `/var/data`. بدونه تضيع البيانات عند كل إعادة تشغيل!
5. Settings > Custom Domains: أضف shahna.store وانسخ سجلات DNS اللي يعطيك إياها إلى موقع الدومين.
6. HTTPS يتفعّل تلقائياً.

## تعديل الأسعار والألعاب
افتح `games.json` وعدّل الأسماء والباقات والأسعار ثم أعد النشر.

## ملاحظات
- خذ نسخة احتياطية من `data/db.json` بشكل دوري (فيه الأرصدة والطلبات).
- بعد النشر: سجّل الموقع في Google Search Console وارفع https://shahna.store/sitemap.xml
