# Yapboz ve eş anlam blokları — 4 Kasım 2026

Bu revizyon yereldir; canlı yayın veya Git gönderimi yapılmadı. Mevcut site menüsü, kısayol çubuğu, tek/iki kişilik oyun ve öğretmen ayarları korunur.

## Gerçek yapboz

- Bölümler artık 2 sıra × 3 sütun (6), 3×4 (12) ve 4×5 (20) parçadır. Her bölümde ayrı bir saklı görsel vardır.
- `js/word-jigsaw.js` komşu parçalara karşılıklı çıkıntı ve girintiler üretir. Dış kenarlar düzdür. Aynı SVG yolu tahtada yuva, tepside parça ve görselin kesiti için kullanılır. Resim, parçanın tam konturu içinde açılır; dörtgen maske kullanılmaz.
- Renkli parçalar kareye yakın oranlarını korur. Şekilleri yatay yönde esnetilmez. Parçalar sürüklenebilir; erişilebilir alternatif olarak parça ve yuva seçimi/klavye desteği vardır.
- Yalnızca doğru zıt anlam çifti resmi açar. Yanlış bırakma resmi açmaz, çözülen parçaya tekrar puan verilmez. İpucu önceki öğretici davranışı sürdürür.
- Parça tepsisi yatay kaydırılır. Çok kısa ekranlarda, sözcükleri küçültmek yerine yalnızca resmin alanı kendi içinde kaydırılabilir; sürükleme kenara yaklaştığında alan kayar. Site menüsü ve oyuncu bilgileri yerinde kalır.

## Eş Anlam Kuleleri

Önceki sütun seçmeli soru düzeni kaldırıldı. `js/word-tower-rules.js` ayrı bir tahta, çarpışma ve yerçekimi motorudur.

1. İki farklı sözcük taşıyan parça yukarıdan gelir. Oyuncu parçayı sağa/sola taşır, dört yönde döndürür ve bırakır. İneceği konum kesik çizgili gölgeyle görünür; sıradaki parça da gösterilir.
2. Temas eden eş anlamlı iki farklı sözcük temizlenir. Yatay ve dikey temas geçerlidir; çapraz temas ve aynı sözcüğün kopyaları eşleşme sayılmaz.
3. Eşleşmeyen sözcükler tahtada birikir. Temizlenenlerin üstündekiler aşağı düşer; yeni bir temas oluşursa zincir başlar. Her çift 100, sonraki zincirlerde çift başına 25 ek puan verir. İki oyuncu aynı sabit parça sırasıyla oynar.
4. Tahta dolarsa eğitim amaçlı vinç desteği sunulur. Vinç, uzakta duran eş anlamları birlikte öğretip kaldırabilir; bu destekli çift 40 puan getirir. Uygun çift yoksa alt sırayı örnekleriyle açar. Öğrenci oyundan atılmaz.

Üç bölümde 6, 10 ve 14 eşleşme hedeflenir. Son eşleşmedeki zincirin tamamlanmasına izin verilir. Rahat/hareketli/süresiz mod, mola ve sekmeden ayrılma desteği vardır. Bir oyuncu bitirdiğinde diğeri devam eder. Küçük telefonlarda oyuncu alanı değiştirilebilir ve kapalı alanın inişi durur.

Klavye: 1. oyuncu A/D, W döndürme, S bir adım indirme, Boşluk bırakma. 2. oyuncu yön tuşları, yukarı döndürme, aşağı indirme, Enter bırakma. Dokunmatik kontroller ve düşen parçayı sürükleme aynı motoru kullanır.

## Doğrulama ve varlıklar

- Sözcük bankası ve eşit parça sırası, 6/12/20 bölüm geçişleri, tamamlayıcı kenarlar, bağımsız oyuncular, yanlış sürükleme ve iptal.
- Tetris motorunda çarpışma, duvar dönüşü, gerçek yığılma, yatay/dikey temas, yerçekimi, zincir puanı, vinç ve tüm bölümlerin bitişi.
- Üç sabitte yalnızca oyuncu kontrollerini kullanan otomatik oynama testi tüm bölümleri yardımsız bitirir. Ayrı 12 oturum denemesi de üç bölümü vinç kullanmadan bitirdi.
- Tarayıcıda gerçek sürükleme ile konturlu resim açılması; 2×3 → 3×4 → 4×5 ilerleme; iki kişilik oyunda iki eşleşmenin birlikte temizlenmesi ve dönüşten sonra yerçekimiyle ikinci zincirin oluşması kontrol edildi.
- Masaüstü, telefon ve tablet boyut kontrolleri tarayıcı üzerindedir; fiziksel tahta veya cihaz testi yapılmadı.
- Tam paket `npm test`: 841 test, 0 hata. `git diff --check` geçti.

Görseller yeniden üretilmedi. Önceki üç özgün sahne kullanılır; şekiller, parçalar, bevel görünümü ve bloklar SVG/CSS kodudur. Görsel üretim kaydı [ilk sürüm belgesindedir](kelime-oyunlari-20261103.md#görseller-ve-üretim-kaydı). Kullanıcının gönderdiği yapboz görselleri şekil referansı olarak incelendi; stok dosyalar siteye kopyalanmadı.

Önizlemeler: `/private/tmp/gercek-yapboz-20-parca.png`, `/private/tmp/gercek-yapboz-telefon.png`, `/private/tmp/es-anlam-tetris-20261104.png`.

## Eş Anlam Kuleleri — pastel görünüm revizyonu

- Yalnızca bu sayfaya yüklenen `css/es-anlam-kuleleri.css`, yeni kapak sahnesi ve iki sütunlu oyun lobisi eklendi. Başlat düğmesi ayarların kaydırma alanının dışında sabit kalır. Küçük ekranlarda ayarlar tek sütuna iner.
- Tahta kalın çerçeveli, içe gömülü bir yüzeye; sözcükler alt yüzü, kenarı ve ışık yansıması olan pastel bloklara dönüştürüldü. Altı renk sözcüğün yazılışından hesaplanır, eş anlam kimliğinden türetilmez. Blok düşerken ve yerleşince aynı renkte kalır.
- Tahta genişliği ve sözcük boyutu kullanılabilir yüksekliğe göre ayarlanır. Kısa telefonlarda yardımcı başlıklar sıkıştırılarak sekiz satır için alan açılır. Oyun kuralları ve yapboz görünümü değiştirilmedi.
- Tarayıcıda 1280×800, 1024×768, 390×844 ve 320×568 görünümleri; sabit başlat düğmesi, iki oyuncunun skorları, oyuncu değiştirme, döndürme, eşleşme ve 225 puanlık zincir kontrol edildi. Fiziksel cihaz testi yapılmadı.
- Bu revizyonda 19 odaklı arayüz/motor testi ve sözdizimi denetimi geçti. Canlı yayın yapılmadı.

Önizlemeler: `/private/tmp/es-anlam-pastel-lobi.png`, `/private/tmp/es-anlam-pastel-oyun.png`.

## Zıtlar Atölyesi — giriş ekranı revizyonu

- Yalnızca bu oyuna yüklenen `css/zitlar-atolyesi.css` ile krem, lila ve mint tonlarında kapak ve ayar lobisi hazırlandı. Oyun alanının yerleşimi ve kuralları değiştirilmedi.
- Oyuncu kartları, ad alanları ve öğretmen seçimleri bir panelde toplandı. Diğer panelde gerçek yapboz konturlarıyla dekoratif bir önizleme, kısa yönerge ve 6/12/20 parçalık üç bölümün görselleri bulunur. Önizlemedeki SVG etkileşime kapalıdır ve oyun durumuna bağlı değildir.
- Başlat düğmesi iç kaydırma alanının dışında kalır. Telefonlarda ayarlar tek sütuna geçer; dar ekranlarda sınıf ve bölüm seçimleri alt alta açılır. Sitenin kendi menüsü ve kısayol çubuğu korunur.
- 1280×800, 1024×768, 390×844 ve 320×568 tarayıcı boyutları; iki oyuncu seçimi ve seçili sınıfla oyuna başlama kontrol edildi. 9 mevcut arayüz testi geçti. Fiziksel cihaz testi ve canlı yayın yapılmadı.

Önizlemeler: `/private/tmp/zitlar-atolyesi-yeni-kapak.png`, `/private/tmp/zitlar-atolyesi-yeni-lobi.png`.
