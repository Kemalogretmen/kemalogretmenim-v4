# Akıllı tahta: akıcılık ve çoklu dokunma

23 Kasım 2026 — Yerel değişiklikler. Bu çalışma kapsamında yayın yapılmadı.

## Düzeltilenler

- Büyük dokunmatik ekranlar, birincil işaretçisi fare veya kalem olsa da otomatik hafif görünümle açılır. Öğretmenin elle seçtiği tam kalite tercihi korunur.
- Resif oyunları açıkken akvaryum arka planı en fazla 15 hareket güncellemesi/saniye, canlı modelleri en fazla 6 çizim/saniye kullanır. Pahalı su ve balık işlemleri hız sınırı kontrolünden sonra yapılır. Oyun kapanınca olağan hız sınırına dönülür. Arka planda balıklar yüzmeye devam eder.
- Patlama efekti tüm ekran yerine yalnız ilgili baloncukların yakınını çizer; toplam görüntü alanı yaklaşık bir milyon piksel ile sınırlıdır. Hafif görünümde parçacık sayısı azalır.
- Deniz Temizliği her güncellemede alan ölçüp konumlandırmak yerine boyutları pencere/alan değişiminde ölçer, hareketi dönüşüm üzerinden uygular.
- Akıntı Sörfü engelleri her güncellemede silip yeniden oluşturmadan mevcut öğeleri taşır.
- Oyun saatinin ve skorların görünür değeri değişmedikçe metin yeniden yazılmaz; kullanılmayan durum kopyası hareket döngüsünden çıkarıldı.
- Her parmak ve basılı klavye tuşu ayrı izlenir. Bir parmağı kaldırmak aynı oyuncunun diğer parmağını veya diğer oyuncuyu bırakmaz. İptal edilen dokunuşlar, kaybolan yakalama ve pencerenin odağını kaybetmesi basılı giriş bırakmaz.
- Hafıza oyunu ikinci oyuncunun dokunuşunu da doğrudan işler. İçerikleri yenilenen düğmelerin dokunma takibi sabit oyun alanında tutulur.
- Dokunuştan sonra tarayıcının ürettiği ek tıklama ikinci nota/yanıt olarak işlenmez. Menü kaydırması parmaklar arasında karışmaz; oyun alanında istemsiz sayfa kaydırma/yakınlaştırma engellenir.
- Sitedeki 17 oyunun ortak oyuncu seçimi, oyun nesnelerinin her stil değişiminde formu ve görünürlükleri yeniden taramaz. Oyuncu alanının görünürlüğü veya alanların kendisi değiştiğinde güncellenir.
- Değişen oyun dosyalarının sürüm bağlantıları yenilendi. Öğrenci kayıtları, sınıf puanları ve bulut eşitleme mantığı değiştirilmedi.

## Doğrulama

- Tüm otomatik testler: **1.029 başarılı, 0 başarısız**.
- Son ek 4K patlama alanı kontrolü: Resif oyunları dosyasındaki **34 test başarılı**.
- Chrome'da 3840, 1920 ve 768 piksel genişliklerde gerçek dokunma olaylarıyla iki hafıza tahtasına aynı anda dokunma, iki müzik alanında yinelenen tıklama, üç parmakla basılı tutma, bağımsız parmak bırakma ve Deniz Temizliği puanlama sınandı.
- Tam örnek akvaryumunda oyun açıkken arka plan hareket güncellemelerinin azaldığı, balıkların hareketinin sürdüğü ve kapanınca yeniden arttığı doğrulandı. Konsol uygulama hatası görülmedi.
- Fiziksel akıllı tahtanın dokunmatik sürücüsü bu ortamda sınanamadı. Harici sağlayıcıların gömülü oyunlarına müdahale edilmedi.
