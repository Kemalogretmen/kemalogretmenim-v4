# Onluk Kaydırağı — 5 Kasım 2026

Yerel oyun: `/oyun/onluk-kaydiragi.html`. Yayına gönderilmedi.

## İçerik
- 3 ve 4. sınıflar için oyuncu ayarlarından en yakın yüzlüğe yuvarlama seçilebilir. Son iki basamak 01–49 ise önceki, 50–99 ise sonraki yüzlük seçilir. Tam yüzlükler iki seçenekli soru havuzuna alınmaz.
- 2. sınıf iki, 3. sınıf üç, 4. sınıf dönüşümlü dört ve beş basamaklı sayıları en yakın onluğa yuvarlar.
- Birler basamağı 1–4 ise önceki; 5–9 ise sonraki onluk. Basamak taşıma desteklenir (99 → 100, 99995 → 100000). Tam onluklar, iki farklı yön arasında belirsizlik yaratmamak için soru havuzuna alınmaz.
- Her 9 soruda birler basamağındaki dokuz rakamın tümü dengeli, karışık sırayla gelir. İlk 5 soruda iki yön de en az ikişer kez ve sınır rakamı 5 mutlaka çalışılır. Sınıfı ve yuvarlama hedefi aynı olan rakipler aynı sırayı alır.
- 5 veya 10 soru; süre baskısı yok. İlk deneme 100, tekrar deneme 60 puan. Doğru cevaptan sonra kayma ve geri bildirim gösterilir; 3 saniye sonra sonraki soru veya sonuç otomatik açılır. Yanlışta sayı değişmez; açıklama ve yeniden deneme düğmesi gelir. Mola sırasında otomatik geçiş bekler.
- Dört karakter, açılıp kapanan 1–9 (onluk) veya 01–49 / 50–99 (yüzlük) ipuçları, iki yönlü kayma, doğru cevaba konfeti, yanlış cevaba baş çevresinde yıldızlar ve ayrı sesler. Ses kapatılabilir; cihazın azaltılmış hareket tercihi izlenir.
- Tek/iki kişilik. Mobilde iki oyuncunun adı/puanı görünür sekmelerle alan değiştirir; her oyuncu bağımsız ilerler. İkisi bitince sonuç çıkar.
- Gerçek site menüsü ve kısayol çubuğunun boşluğu `GameViewport` ile ayrılır. Ayarlar kaydırılabilir; başlat düğmesi sabit alt satırdadır.
- Adlar zorunlu; ortak `GamePlayers` ile öğrenci hesabından otomatik ad, öğretmen için kayıtlı öğrencilerden seçim/rastgele eşleştirme desteklenir. Yeni veri tabanı yazımı yok.
- Vektör sahne/karakterler kodla çizildi. Referans resim kopyalanmadı. Kapak aynı sahnenin bağımsız SVG çıktısıdır.

## Kontroller
- Dokunma/fare: iki büyük cevap düğmesi.
- Klavye: A/D birinci oyuncu, sol/sağ oklar ikinci oyuncu (tek kişide oklar birinci oyuncu). Tab ile tüm düğmelere erişilebilir.
- Animasyonda cevaplar kilitlenir. Yeni yolculuk eski animasyon geri çağrılarını geçersiz kılar.
- Kayıtlar/puanlar mevcut oturum içindir; tarayıcı depolamasına sonuç yazılmaz.

## Doğrulama
`tests/onluk-kaydiragi.test.cjs`: yuvarlama sınırları, sınıf aralıkları, dengeli birler, kayma rotaları, zorunlu ve güvenli adlar, yanlışta tekrar, puanın bir kez verilmesi, bağımsız iki oyuncu, animasyon iptali ve ipuçları.
Katalog ve ortak oyuncu seçimi testleri yeni oyunla güncellendi.

Doğrulama sonucu: tam test paketi 880/880 başarılı; son sayı dengesi/erişilebilirlik değişikliğinden sonra ilgili 27 test yeniden başarılı. Tarayıcı önizlemesi 1280×800, 1024×768, 390×844 ve 320×568 ölçülerinde kontrol edildi. Küçük telefon için kompakt geri bildirim düzeni doğrulandı. Gerçek cihazda veya giriş yapılmış canlı hesapta test yapılmadı.
