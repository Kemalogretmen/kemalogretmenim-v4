# Mobil 0.6.2 — Ajanda ayrımı ve akıllı tahta düzeltmesi

Tarih: 2 Kasım 2026. Android sürümü `0.6.2`, `versionCode 8`; iOS kaynak build numarası `8`.
Bu çalışma Netlify veya GitHub Release yayını yapmaz.

## Neler değişti

- Ajanda artık dört net alana ayrılır: **Derslerim**, **Ajanda**, **Öğrenciler** ve **Karneler**. Ders programı yalnızca Derslerim alanında; kişisel notlar, hatırlatmalar, doğum günleri, özel günler ve resmî tatiller Ajanda alanındadır.
- Telefon gün şeridinde önceki/sonraki gün düğmeleri, ajanda işaretleri ve işaretli güne dokununca açılan kısa özet bulunur. Tarih seçimi telefonun yerel tarih seçicisini kullanır.
- Masaüstü planlayıcının aynı haftaya ait kaydedilmiş odak tarihi ve akademik hafta numarası mobilde önceliklidir. Böylece örneğin masaüstünde 8. hafta görünen tarih mobilde 9. hafta olarak etiketlenmez.
- Ders kartları masaüstü programındaki ders renklerine uygun, çerçeveli ve ders sırası belirgin biçimde gösterilir. Öğrenme çıktıları ve devamı yine uygulama içinde açılır.
- Ajanda işaretleri mevcut bulut verisindeki notlar, öğrenci doğum tarihleri ve takvim tatillerinden oluşur. 2025–2027 dönemi için yerleşik Türkiye resmî tatil yedeği de vardır; planlayıcıdaki özelleştirilmiş resmî tatil kaydı önceliklidir. Yeni öğrenci kaydında doğum günü telefonun yerel tarih seçicisinden isteğe bağlı olarak eklenebilir.
- Akıllı tahtada yatay ekranda dış çerçeve tekrar kaydırılabilir. Kum yazımı yalnızca kum tuvalinde hareketi sahiplenir; çevre araç ve çalışma alanında dikey kaydırma korunur.
- Uygulamanın odak görünümünde sağ üstte cam görünümlü **Çık** düğmesi vardır. Tahtanın kendi tam ekranında da şeffaf **Çık** düğmesi görünür; cihazın geri tuşu aynı şekilde odak görünümünden çıkarır.

## Veri ve güvenlik

- Yeni kişisel ajanda kayıtları artık bir sınıfa zorla bağlanmaz; aynı öğretmen hesabındaki tüm cihazlarda kişisel takvim olarak eşitlenir. Eski sınıf bağlı kayıtlar silinmez; kişisel ajandada da görünmeye devam eder.
- Sınıf, öğrenci, karne ve ders programı işlemleri mevcut çakışma kontrollü bulut yazma akışını kullanır. Oturum, kimlik ve yetki kontrolleri değiştirilmemiştir.
- Gömülü akıllı tahta dış ağ, iframe ve haricî betik kullanmaz; tam ekran çıkışı rastgele belge yetki anahtarıyla yerel uygulamaya iletilir.

## Doğrulama

- `npm run typecheck` geçti.
- `npm run test` geçti: 120 mobil test.
- Köprü ve akıllı tahta kaynak paketleri yeniden üretildi ve bütünlük kontrolleri geçti.
- Playwright bağımlılığı yerel depoda kurulu olmadığı için bağımsız tarayıcı testleri çalıştırılamadı; bu testler kod hatası nedeniyle değil, `playwright` modülü bulunamadığı için başlamadı.
- Android test APK’sı başarıyla üretildi: `versionName 0.6.2`, `versionCode 8`, minimum Android API 24, hedef API 36; arm64-v8a, armeabi-v7a, x86 ve x86_64 mimarilerini içerir. SHA-256: `bb2924c1caf154d8feb04850e6489df2f87710ae79230e12749b80fea8c3b974`.
- APK, yerel yükleme denemesi için mevcut Android debug sertifikasıyla V2 olarak doğrulandı. Google Play/App Store yayını öncesinde kullanıcıya ait, yedeklenmiş bir üretim imzalama anahtarı ve mağaza imzalama akışı ayrıca kurulmalıdır.
- Fiziksel Android/iOS cihazda dokunma-yatay ekran denemesi ve mağaza yayını henüz yapılmadı.
