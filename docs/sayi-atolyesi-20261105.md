# Sayı Atölyesi

Yerel sürüm; dağıtım veya Git gönderimi yapılmadı.

- Sayfa: `/oyun/sayi-atolyesi.html`. Oyun kataloğuna yeni kart ve özgün SVG kapak eklendi.
- Bloklar: 1/2. sınıf 10–99, 3. sınıf 100–999, 4. sınıf 1000–9999. SVG birlik, 10 bölmeli onluk, 10×10 yüzlük ve üç yüzü ızgaralı binlik.
- Boncuklar: 1/2. sınıf iki, 3. sınıf üç, 4. sınıf altı çubuk. 4. sınıf sayı uzunluğu 4→5→6 basamak olarak döner; kullanılmayan basamaklar boş bırakılır.
- Çarktan sonra her basamak 0–9 malzemeyle oluşturulur. Dokunma, klavye düğmeleri ve Pointer Events sürükleme desteklenir. Kontrol yanlışsa basamak için somut düzeltme mesajı verir. İlk kontrolde 100, yeniden deneyerek 60 puan. Doğrudan sonraki sayıya geçilemez; doğru oluşturunca çark yeniden açılır.
- 5/10 soru, tek/iki oyuncu, oyuncuya ayrı sınıf seçimi. Aynı sınıftaki oyuncular aynı sayı dizisini alır. Erken biten diğerini durdurmaz. Sonuç ekranı herkes bitince açılır. Süre baskısı yoktur.
- Telefonda oyuncu sekmeleri her iki skoru gösterir. Dar/kısa ekranlarda yalnızca malzeme alanı kaydırılır, kontrol tuşları dışarıda kalır. Sitenin mevcut menü ve kısayol çubuğu kullanılır.
- 16 odaklı test: aralıklar, sıfır basamağı, doğru/yanlış kontrol, 9 sınırı, iki oyuncunun tüm turları, 500/460 puan sonucu, bağımsız sürükleme, katalog kapak/bağlantı/sayfalama. Sözdizimi ve `git diff --check` geçti.
- Tarayıcıda 1280×800, 1024×768, 390×844 ve 320×568 kontrol edildi. Gerçek mobil cihaz/akıllı tahta üzerinde test yapılmadı.
- Görseller kodla üretildi; kullanıcının referans görselleri siteye kopyalanmadı. Yeni bağımlılık veya dış görsel isteği yoktur.

## Büyük malzemeler ve yakın basamak alanları

Blok SVG'lerinin görünüm kutuları malzemeye göre daraltıldı; çizim çevresindeki boşluklar kaldırıldı. Birlik küpleri, onluk çubukları, yüzlük/binlikler ve boncuklar büyütüldü. İki basamaklı blok tepsisi en fazla 620 px, iki çubuklu abaküs 360 px genişliğinde ortalanır. Basamaklar mavi, bal sarısı, şeftali ve yeşil tepsilerle ayrılır; malzeme düğmelerinde görsel örnekler vardır. Boş alanlarda sürükleme hedefi gösterilir.

Blok satırları üstten yerleşir; çok sayıda parçada taşan satırlar kaydırılarak erişilebilir. Masaüstünde dokuz onluk/dokuz birlik, doğru 80 cevabı; iki çubukta dokuzar boncuk ve doğru 11 cevabı kontrol edildi. Telefon 390×844 ve iki oyunculu altı çubuk 320×568 boyutlarında kontrol edildi. Küçük ekranlarda yalnızca tepsi kayar; kontrol düğmeleri ve oyuncu sekmeleri görünür kalır. 6 oyun testi, sözdizimi ve diff denetimi geçti. Canlıya gönderilmedi.

## Tanıdık turuncu sınıf blokları

Kullanıcının örneğine göre tüm materyaller turuncu kare ön yüz, kırmızı-turuncu üst yüz, sarı yan yüz ve net kenar çizgileriyle yeniden çizildi. Birlik 1 küp, onluk 10 eşit hücre, yüzlük 10×10 kare, binlik üç yüzünde 10×10 ızgaralı küptür. Birlikler beşerli sıralanır. Referans bitmap kopyalanmadı; geometriler SVG kodudur. Masaüstünde malzeme düğmeleri dahil alanın kırpılmadığı ölçüldü; 16 sayısının doğru oluşturulması ve 390×844 görünümü doğrulandı. 6 mevcut oyun testi geçti. Canlı yayın yapılmadı.
