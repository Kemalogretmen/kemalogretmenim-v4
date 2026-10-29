# Onluk Basket

İlk yerel geliştirme: 22 Ekim 2026. Kullanıcının onayıyla 27 Ekim 2026 toplu yayın paketine dahil edildi; yayın doğrulaması ilgili Netlify dağıtımı ve üretim dosyaları üzerinden yapılır.

`/oyun/onluk-basket.html` — oyun kataloğuna eklenmiştir. Gerçek site menüsü ve kısayol çubuğu hazırlıkta korunur; maç, ekrana sığan bağımsız sahalarda açılır.

Referans: Kullanıcının paylaştığı MB Akıllı Tahtam Sayılarla Basket sayfasındaki sayı seçme/basket fikri incelendi. Kaynak kodu, görselleri, sesleri ve marka öğeleri kullanılmadı. Saha, top, animasyonlar ve sentezlenmiş sesler özgün kodla üretildi.

## Oynanış

- 1, 2 veya 3 öğrenci; isimler yalnızca sayfa belleğinde, sunucuya gönderilmez.
- Onluk–birlik, 10 küplü onluk çubukları, Türkçe sayı okuma veya karışık sorular.
- Öğretmen aralığı seçer: 10–30, 10–60, 10–99. Yüzlük kazanımını karıştırmamak için 100 dahil değildir.
- Süresiz mod: 10 doğru soru. Süreli mod: 60 veya 120 saniye. Ortak soru dizisinde herkes kendi hızında ilerler. Seçeneklerin konumu her oyuncuda ayrıca karıştırılır.
- Doğru cevap 10 puan. Yanlışta puan/can kaybı yok; aynı soruda onluk/birlik ipucuyla tekrar denenir. Sonuçta deneme sayısı gösterilir. Süresiz mod öğrenme/pratik; süreli mod yarış içindir.
- Sayı kartına tek dokunuş atışı otomatik başlatır; ayrıca Basket at düğmesi yoktur. Doğru ve yanlış tüm kartlar aynı davranır. Alternatif olarak topu sağa sola taşıyıp en az 12 piksel aşağı çekerek bırak. Ok tuşlarıyla nişan alma, boşluk/Enter ile atış da desteklenir. Ayrı pointer kimlikleri eşzamanlı dokunmayı destekler. İptal edilen sürükleme cevap sayılmaz.
- Son anda bırakılan atış tamamlanır; süre bittikten sonra yeni atış yapılamaz. Maç arka sekmede otomatik duraklar, devam düğmesiyle sürer.
- Tek kişilik rekor kip/aralık/süreye göre bu tarayıcıda saklanır; depolama kapalıysa oyun devam eder. Hiçbir hesap/ağ bağlantısı gerekmez (ortak site kabuğu hariç).
- Hareket azaltma tercihi ve ses kapatma desteklenir. Dokunmatik cihaz donanımında ayrıca sınıf testi önerilir.

## Kontrol

`node --test tests/onluk-basket*.test.cjs` ve `npm test`.

Tarayıcıda doğru/yanlış cevap, gerçek fare sürüklemesiyle atış, mola ve ayarlara dönüş doğrulandı. 390×844 iki/üç oyuncu, 320×568 üç oyuncu ve 844×390 yatay üç oyuncu görünümleri kontrol edildi; yatay taşma yok. Eşzamanlı pointer kimlikleri ve tam 10 soruluk sonuç/yeniden başlatma akışı denetleyici testinde simüle edildi; fiziksel çoklu dokunmatik donanım testi yapılmadı. Çok küçük telefonlarda blok sayımı için tek/iki oyuncu veya yatay kullanım tercih edilebilir.

## 29 Ekim 2026 yerel revizyonu

Henüz canlıya gönderilmedi. Tek dokunuşla atış ve katmanlı giriş eklendi. Kapak ve ayarlar aynı sabit boyutlu `.ob-stage` içinde birbirinin yerine açılır; sayfa aşağıya genişlemez. Kodla çizilen özgün SVG salon, cam pano, file, perspektif zemin ve basketbol topu iki katmanın altında kalır. Hazırlık formu kendi içinde kayar; maç başlatma düğmesi altta erişilebilir kalır. Kapak/ayarlar arasında geçiş ve maçtan ayarlara dönüş tercihleri korur. Gerçek site menüsü/kısayol çubuğu korunmuştur.

21 odaklı test başarılı. Tarayıcıda tek tıklamayla doğru/yanlış atış, bağımsız oyuncu puanları ve kapak–ayar geçişinde aynı sayfa yüksekliği/kaydırma konumu doğrulandı. 1280×900 masaüstü, 390×844 telefon ve 320×568 küçük telefon görünümleri kontrol edildi; yatay taşma veya kısayol çubuğunun altında kalan başlatma düğmesi görülmedi. Küçük telefonda üç kişilik blok soruları da başlatıldı. Fiziksel çoklu dokunmatik donanım testi yapılmadı.
