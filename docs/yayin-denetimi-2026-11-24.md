# Web yayın denetimi · 24 Kasım 2026

## Yayın İçeriği

Ana sayfadaki “Yenilikler” penceresi bu sürüm için tarayıcıda bir kez açılır. “Yenilikleri gör” düğmesiyle yeniden açılabilir. On bir bölümde Akıllı Tahta ve yerel PDF, kum havuzu, matematik araçları, sınıf eklentileri, akvaryum, okuma, ajanda, sınavlar, fen/geometri, belge/poster/kelime araçları, oyunlar ve gezinme güncellemeleri açıklanır. Eski bölüm duyuruları çalışma ekranlarında düğmelerin üstünü kapatmaması için kaldırıldı.

Yerel PDF desteği birden fazla sekme, sayfa görünümleri, klavye ve dokunmatik gezinme, metin seçimi, not kopyalama, notlu PDF ve düzenlenebilir yerel dosya içerir. Tarayıcıda saklama sınırlıdır; kaynak PDF dosyaları buluta yüklenmez. Çevrimdışı paket yalnızca kullanıcı isteğiyle hazırlanır.

Ek denetimde 3B desteği olmadığında Hücre Laboratuvarı'nın 2B çalışmaları ve değerlendirmeleri çalışır durumda bırakıldı. Belge Stüdyosu formül alanı ve Poster Yazıcı önizleme araçları küçük ekranlara sığdırıldı.

## Yayın Öncesi Sonuçlar

- `npm test`: **1.053 geçti, 0 başarısız**.
- Derleme: **914** genel web dosyası; mobil uygulamalar, testler, belgeler, bağımlılık klasörleri ve SQL yayın paketine dahil değil.
- Statik denetim: **1.699** yerel bağlantı ve **277** betik/inline betik; eksik dosya veya ayrıştırma hatası yok.
- Chromium ve WebKit: ana sayfa duyurusu 1440×900, 390×844, 320×568 ve 667×375; kapatma, yeniden açma, sürüm bazlı tek gösterim, klavye odağı ve kaydırma.
- PDF: iki tarayıcıda 390/1440 genişlik; sekmelerde ayrı sayfa/not/geri alma, sayfa düzenleri, metin seçimi, kopyala-yapıştır, kaydırma, döndürülmüş sayfa hizası, yakınlaştırma temas noktası, yerel proje ve PDF çıktısı.
- İnternet kapalıyken yeniden yükleme, kaldığı PDF'ye devam, yan yana görünüm ve yerel PDF çıktısı doğrulandı.
- Fosforlu/karakalem saydamlığı, kumda yazma ve geri alma, eklenti yaşam döngüsü ve ses göstergesi tam ekranı doğrulandı.
- Okuma → sorular → karne, Akademi, e-kitap sayfa geçişleri; ajanda görev/yoklama/sınıf ayrımı ve yeniden yükleme; sınav ve analiz akışları örnek verilerle doğrulandı.
- Sınav yerleşimi 320 piksel telefondan tablete ve masaüstüne sekiz görünümde; yönetim menüsü ve matematik kütüphanesi iki tarayıcıda kaydırma ve klavye ile doğrulandı.
- Poster Yazıcı, Kelime Avı, Belge Stüdyosu ve iki yeni 3B oyun; iki tarayıcıda masaüstü/mobil açılış ve çalışma kontrolü. Oyun sahneleri dolu, hareket ediyor, duraklatma/devam çalışıyor; sahne görüntülerinde piksel farkları ölçüldü. Gerçek çok sayfalı poster PDF çıktısı açılarak doğrulandı.
- Hücre laboratuvarında dış 3B dosyası engellendiğinde 2B diyagramlar ve değerlendirmeler iki tarayıcıda 390/1440 genişlikte çalışıyor.

## Yayın Yöntemi Ve Sınırlar

Mevcut çalışma klasöründeki değişiklikler korunarak `origin/main` üzerine ayrı yayın kopyası hazırlandı. Netlify mevcut `scripts/build-web.cjs` ve `.publish` düzeniyle yayınlanır. Yayından sonra `scripts/verify-live-release.cjs` bütün genel dosyaların HTTP durumunu, JS/CSS/WASM türlerini, kritik yeni dosyaların içerik özetini, ana sayfa sürümünü ve `/ads.txt` işlevini doğrular. Canlı tarayıcıda ana sayfa, PDF, araç listesi ve çevrimdışı akış da yeniden sınanır.

Gerçek öğrenci kayıtlarına test verisi yazılmadı; hesaplı işlemler örnek verilerle sınandı. Veritabanı değişikliği, reklam etkinleştirme veya Android/iOS mağaza yayını yapılmadı. Telefon/tablet kontrolleri tarayıcı benzetimidir; fiziksel okul akıllı tahtasında donanım testi yapılmadı.
