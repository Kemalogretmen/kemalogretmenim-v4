# Oyun merkezi yenilemesi — 29 Ekim 2026

Bu düzenleme yereldedir; yayınlama veya veritabanı değişikliği yapılmadı.

## Görünüm ve kullanım

- 32 yerleşik oyun için konuya özgü kapaklar. İlk üç oyun için yeni raster illüstrasyonlar, Kızma Birader için mevcut vitrin görselinin kart uyarlaması, kalan oyunlar için hafif ve ayrı vektör sahneleri.
- Masaüstünde dört, tablette üç veya iki, telefonda iki sütun. 320 piksel genişliğe kadar yatay taşma kontrolü.
- Türkçe karakterleri destekleyen oyun/beceri araması, kategori, A–Z ve tarih sıralaması; sayfalama ve yönetim panelinden eklenen oyunlar korunur.
- Gerçek site menüsü, alt kısayol çubuğu, kaydetme ve değerlendirme bileşenleri korunur. Kapak üzerindeki kategori ile kaydetme düğmesi farklı köşelerdedir.
- Kapaklar dekoratiftir; başlıklar erişilebilir HTML metnidir. Hareket azaltma tercihi, klavye odağı ve seçili filtre/sayfa bilgileri desteklenir.

## Gerçek oynanma verisi

29 Ekim'deki salt okunur kontrolde Supabase `get_popular_games(days, limit_count)` çağrısı HTTP 404 / PGRST202 döndü: fonksiyon sunucuda bulunmuyor. Mevcut `supabase-populer-oyunlar.sql` kurulum dosyası bu fonksiyonu içeriyor; bu görevde sunucuya uygulanmadı.

Arayüz, fonksiyon kullanılabilir olduğunda son 30 günün gerçek `starts` değerlerini gösterir. Bunlar oyun başlatan **oturum** sayılarıdır; tekil insan veya tüm zamanlar sayısı değildir. Aynı oturumdaki tekrarlar SQL tarafında bir sayılır. Popülerlik sırası mevcut ağırlıklı puana göre gelir. Bir veya iki oyun için veri gelmesi de yeterlidir. Uzantılı/uzantısız oyun yolları eşleştirilir; aynı oyunun takma adları iki kez toplanmaz. Kaynağı olmayan veya geçersiz sayaç gösterilmez.

Veri yoksa, ağ isteği gecikse veya hata oluşsa bile üç başlangıç oyunu hemen gösterilir; popüler sıralama seçeneği veri gelene kadar kapalıdır. Örnek 10 bin gibi yapay sayılar kullanılmaz.

## Görsel üretimi

Üretim: yerleşik imagegen aracı, tek görsel başına ayrı çağrı. WebP dosyaları `assets/game-covers/` içinde, 50–89 KB aralığındadır. Orijinaller `.codex/generated_images/01a09cdd-fae0-7990-ae73-4dc0647eed0c/` içinde korunur. Başlıklar görsele gömülmez.

### Onluk Basket istemi

> A premium playful 3D clay-render illustration for a Turkish elementary school educational basketball game thumbnail. A big tactile orange basketball flying toward a small wooden hoop, chunky turquoise and golden tens rods and unit cubes arranged on a violet and peach basketball court. Bright lavender background, warm light, rounded toy-like objects, polished family-friendly game artwork. Landscape composition 3:2, strong central subject, readable at tiny sizes, generous margin, no words, no numbers, no logos. Original design.

### Çarpım Kanatları istemi

> A premium playful 3D clay-render illustration for an original elementary multiplication adventure game thumbnail. Two adorable original round birds, one coral orange and one teal blue with tiny wings and kind eyes, a wooden slingshot at left, three small wooden towers on a lush island on turquoise sea at right. Curving dotted flight path. Sunny mint sky, soft dimensional shadows, tactile toy textures, polished family-friendly game artwork, cheerful. Landscape 3:2 composition, readable at tiny sizes, no words, no numbers, no logos, not an existing franchise.

### Eşini Bul istemi

> A premium playful 3D clay-render illustration for an elementary memory matching game thumbnail. Six thick rounded rectangular playing tiles loosely arranged on a lavender tabletop with rich soft shadows. Two face-up tiles show matching colorful glossy yellow stars, two face-up tiles show matching adorable turquoise butterflies, remaining two face-down tiles have simple violet diamond motifs. Extra large tactile illustrated symbols, peach and lilac palette, polished cheerful child-friendly game artwork. Landscape 3:2 composition, readable at small sizes, no words, no numbers, no logos.

## Kontrol

`tests/games-catalog.test.cjs`: yolların eşleşmesi, gerçek/sahte sayaç ayrımı, RPC hatası ve gecikmesi, kısmi sıralama, Türkçe arama, filtre/sayfalama, dinamik oyunlar, varlık/bağlantı varlığı ve analitik olayları.

Son kontrol: tam test paketi **676/676 başarılı**. Tarayıcıda 1280 piksel masaüstü, 390×844 ve 320×568 telefon boyutları kontrol edildi; yatay taşma yok. İlk sayfadaki tüm kapaklar yükleniyor, arama/sıfırlama ve A–Z sıralaması çalışıyor; konsolda JavaScript hatası görülmedi. `git diff --check` temiz.
