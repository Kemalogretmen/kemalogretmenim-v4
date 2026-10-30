# Sade ikonlar ve cam alt bar — 30 Ekim 2026

## Değişiklikler

- 103 web sayfasında ortak `platform-icons.js` / `platform-icons.css` kullanılıyor. Emoji tabanlı genel arayüz işaretleri tek çizgi kalınlığına sahip yerel SVG ailesine dönüştürülür; kitap/alıştırma metni, öğrenci verisi, giriş alanları, ikon seçiciler ve çıktı tuvalleri korunur.
- İletişim, sınıf, okuma ve diğer genel sayfa ikonlarında yüzen animasyonlar kaldırıldı. Duyuru şeridi bir kez ve sabit gösterilir. Öğretmen araçlarının 109 eski font ikonu çizgi SVG ile gösterilir; mevcut DOM düğümleri ve olay bağlantıları korunur.
- Oyun/akvaryum sahneleri, öğrenme animasyonları, yükleme ve süre uyarıları ile tema anahtarının istenen geçişi bu dekoratif ikon değişikliğinden ayrıdır.
- Alt bar beş boyut sunar: En küçük, Kompakt, Küçük, Normal, Büyük. Mevcut eksi/artı düğmeleriyle değişir. İlk iki boyutta etiketler gizlenir, bağlantıların erişilebilir isimleri ve araç ipuçları kalır.
- Masaüstü ölçümünde En küçük bar 45 px yüksekliğinde / 472 px genişliğinde, Normal bar yaklaşık 81 px / 911 px. Mobilde bar ekranla sınırlanır ve kısayollar yatay kayar.
- Boyut ve hizalama tercihi cihazda hatırlanır; ana sayfanın kapalı/açık seçimi diğer sayfaların görünürlüğünü değiştirmez.
- Açık/koyu cam yüzeyler 28 px arka plan bulanıklığı, saydamlık, ince kenar ışığı ve küçük gölge kullanır. Zayıf cihaz, saydamlık azaltma ve bulanıklık desteği olmayan tarayıcılar için okunaklı opak yedek vardır. Sürekli JS animasyon döngüsü ve ek kütüphane eklenmedi.
- İletişim sayfasının mobildeki küçük kenar taşması ve koyu temada açık kalan başlık zemini düzeltildi.

## Doğrulama

703 otomatik test geçti. İkon testleri kullanıcı metni/girdi/öğrenme içeriğinin korunmasını, sonradan eklenen arayüzde dönüşümü, düğüm/olay bağlantılarının korunmasını ve tekrar işlemde simgelerin çoğalmamasını denetler. Dock testleri beş boyutu, uç sınırları, saklanan tercihi ve ana sayfa görünürlüğünü kapsar.

Tarayıcıda iletişim, sınıf ve öğretmen araçları sayfaları; açık/koyu tema; normal/en küçük bar; sayfalar arasında boyut koruma; 390 px mobil genişlik ve küçültme sınırı kontrol edildi. Mobil sayfa ve içerik genişliği 390 px; yatay taşma yok. Web çıktı paketinde JS/CSS başvuruları eksiksizdir. Veritabanı değişikliği yoktur.
