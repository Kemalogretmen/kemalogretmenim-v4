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
- Sayı kartına dokunup Basket at veya topu sağa sola taşıyıp en az 12 piksel aşağı çekerek bırak. Ok tuşları ve boşluk/Enter da desteklenir. Ayrı pointer kimlikleri eşzamanlı dokunmayı destekler. İptal edilen sürükleme cevap sayılmaz.
- Son anda bırakılan atış tamamlanır; süre bittikten sonra yeni atış yapılamaz. Maç arka sekmede otomatik duraklar, devam düğmesiyle sürer.
- Tek kişilik rekor kip/aralık/süreye göre bu tarayıcıda saklanır; depolama kapalıysa oyun devam eder. Hiçbir hesap/ağ bağlantısı gerekmez (ortak site kabuğu hariç).
- Hareket azaltma tercihi ve ses kapatma desteklenir. Dokunmatik cihaz donanımında ayrıca sınıf testi önerilir.

## Kontrol

`node --test tests/onluk-basket*.test.cjs` (15 test) ve `npm test`.

Tarayıcıda doğru/yanlış cevap, gerçek fare sürüklemesiyle atış, mola ve ayarlara dönüş doğrulandı. 390×844 iki/üç oyuncu, 320×568 üç oyuncu ve 844×390 yatay üç oyuncu görünümleri kontrol edildi; yatay taşma yok. Eşzamanlı pointer kimlikleri ve tam 10 soruluk sonuç/yeniden başlatma akışı denetleyici testinde simüle edildi; fiziksel çoklu dokunmatik donanım testi yapılmadı. Çok küçük telefonlarda blok sayımı için tek/iki oyuncu veya yatay kullanım tercih edilebilir.
