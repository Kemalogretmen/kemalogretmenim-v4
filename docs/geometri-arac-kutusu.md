# Ortak geometri araç kutusu

3D Yapı Atölyesi, Cisim Açılımları ve Birim Küpler aynı sürüklenebilir araç kutusunu kullanır. Başlığı sürükleme veya başlık odaktayken ok tuşlarıyla taşıma; −/+ ile kapatma/açma; ↔ ile genişlik değiştirme; ⌖ ile konumu sıfırlama desteklenir. Konum, açık sekme, genişlik ve daraltma durumu sayfa başına yerel olarak hatırlanır. Daraltmak modelleri, çizimleri veya seçimi temizlemez.

Şekil seçimlerinde SVG görselleri kullanılır; adları fareyle üzerine gelince veya klavyeyle odaklanınca görünür. Erişilebilir adlar korunur. Eski düğmeler, seçim alanları, kaydırıcılar ve canlı yan görünüm canvas'ları kopyalanmadan taşınır. Birim küp PNG çıktısı, görünümler sekmesi kapalıyken de seçili yan görünümleri içerir.

## Eğri yüzeylerin gösterimi

Silindir açılımı iki eş daire ve eni 2πr, boyu h olan dikdörtgendir. Yan yüzey önce teğet bağlantısında kaldırılır, yay uzunluğunu ve yüksekliğini koruyarak sarılır; üst disk teğet menteşesinde kapanır. Ara karelerde diskler rijittir, menteşeler kopmaz. Tam kapanışta yan yüzeyin iki sınırı ve iki dairesel kenarı örtüşür.

Kürenin gerilmesiz tam düzlemsel açılımı yoktur. Gösterim, sivri uçlu 12 dilimli yaklaşık küre yapım modelidir. Dilim orta meridyenlerinin yay uzunluğu korunur; tüm yüzeyin metrik uzunluklarının korunması iddia edilmez. Kapalı modelde tüm noktalar aynı kürededir, komşu dilim sınırları ve iki kutup birleşir. Otomatik katlanma ekran yenileme hızından bağımsızdır.

## Kaynaklar

- [Yeni Zelanda Eğitim Bakanlığı — Solid understanding, silindir neti](https://newzealandcurriculum.tahurangi.education.govt.nz/solid-understanding/5637167110.p)
- [Library of Congress — Globe Gores, basılı küre dilimleri](https://blogs.loc.gov/maps/2025/03/globe-gores/)
- [East Tennessee State University — Gaussian Curvature, düzlem/silindir/küre farkı](https://math.etsu.edu/multicalc/prealpha/Chap3/Chap3-8/part3.htm)

## Doğrulama

`node --test tests/geometry-toolbox.test.cjs tests/curved-net-geometry.test.cjs tests/geometrik-sekiller.test.cjs`

Testler kontrol nesnelerinin/olaylarının korunmasını, ikon seçimlerini, kaydedilen konumu, daraltmayı, ekran sınırlarını, sürükleme iptalini, PNG görünüm oranlarını, silindir yüzey uzunluklarını/menteşelerini, küre dikişlerini ve 60/120 Hz animasyon hızını kapsar.

## Çalışma zemini

Her araç kutusunda **Görünüm → Çalışma zemini** altında Kareli, İzometrik, Noktalı, Çizgili ve Boş seçenekleri bulunur. 3B yapı sahnesi, 2B şekil alanı, birim küpler ve cisim açılımları seçimlerini ayrı hatırlar. Zemini değiştirmek şekilleri, çizimleri veya seçimi temizlemez. Silindir ve koni seçildiğinde de tercih korunur.

3B izometrik dokunun en-boy oranı dünya düzleminde korunur; desen kareye gerilmez. Zemin yüzeyi küp yerleştirme/raycast düzlemine katılmaz. Yan görünüm çıktılarında zemin geçici gizlenir, çıktı başarısız olsa bile geri yüklenir. Depolama kapalıyken seçimler o oturumda çalışmaya devam eder.

Yeni zemin testleri: `node --test tests/geometry-backgrounds.test.cjs tests/geometry-background-integration.test.cjs`.

Matematik Araçları sayfası aramalı SVG ikonlu araç kütüphanesi, mobil araç menüsü ve tek çalışma alanıyla düzenlendi. Yedi yerel araç ve dört geometri bağlantısı korunur. Gerçek hesap ve kesir durumu araç geçişlerinde kaybolmaz. İlgili test: `tests/math-tools-ui.test.cjs`.
