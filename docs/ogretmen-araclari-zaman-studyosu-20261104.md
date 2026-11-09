# Öğretmen araçları ve zaman stüdyosu

Araç merkezi (`ogretmen-araclari.html`) ve saat/sayaç sayfası
(`ogretmen/kronometre.html`) ortak `css/teacher-workspace.css` yüzeylerini kullanır.
Renkler sitenin açık/koyu tema değişkenlerinden gelir. Araç kartları eşit sütunlara
yerleşir; arama, kategoriler ve mevcut favori anahtarı korunur.

## Saat ve sayaç

- Geri sayım, kronometre, yerel saat; dijital, klasik ve birlikte görünüm.
- Aynı zaman hesabını kullanan analog ibreler ve kalan süreyi gösteren kadran alanı.
- Son 30 saniyede amber, son 10 saniyede kırmızı görsel uyarı.
- 1, 2, 5, 10, 15, 25, 40 dakika hazır süreleri; çalışırken +1 dakika.
- Kronometrede tur ve ara süre kaydı; sıfırlama/mod değişiminde tur temizliği.
- Etkinlik adı, ses ve görünüm tercihi yalnızca yerel tarayıcıda saklanır.
- İsteğe bağlı Screen Wake Lock; destek/izin yoksa kısa durum mesajı gösterilir.
- Space/Enter başlat-duraklat, R sıfırla, S durdur, C geri sayım,
  I ileri sayım, L tur, F tam ekran, Escape yardımı kapatır.
  Giriş alanlarında ve tarayıcı kısayollarında komutlar çalışmaz.

## Araştırma

4 Kasım 2026 tarihinde incelenen ürün kaynakları:

- https://classroomscreen.com/helpcenter/what-is-classroomscreen
  Sınıf araçlarında saat, kronometre ve görsel sayaç yaklaşımı.
- https://help.classroomscreen.com/article/113-visual-timer
  Sürenin görsel olarak takip edilmesi.
- https://www.timetimer.com/pages/time-timer-in-the-classroom
  Sınıfta kalan süreyi görünür kılma yaklaşımı.

Tasarım ve uygulama bu projeye özgüdür; dış ürün kodu alınmamıştır.

## Doğrulama

`node --test tests/time-studio.test.cjs tests/kronometre-background.test.cjs`
komutu görünüm geçişinde sürenin korunması, süre uzatma, saat modu, tur kayıtları,
depolama engellendiğinde çalışma ve mevcut arka plan/alarm davranışlarını kapsar.
Tarayıcıda masaüstü/mobil yerleşim, klasik saat, tur kaydı, süre uzatma ve
kategori filtresi kontrol edilmiştir.
