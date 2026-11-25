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

## 25 Kasım · AdSense düzeltmeleri için yayın listesi

Kullanıcı, AdSense'in “Düşük değere sahip içerik” sonucu sonrasında sunulan sekiz maddelik planı onayladı. Google tekil sorunlu sayfaları belirtmedi; aşağıdaki içerik ve kurulum düzenlemeleri bu değerlendirmeyi iyileştirmek için hazırlanmıştır. Onay sonucu Google tarafından verilir.

- **Özgün içerik:** Hesap istemeyen dört tamamlanmış etkinlik rehberi ve katalog: okuma-anlama (özgün hikâye ve kanıt soruları), ritmik sayma (sayı doğrusu ve açıklamalı diziler), kesirler (eş parçalar ve eşdeğerlik), akıllı tahtada ders (eşit paylaşma problemi ve çıkış sorusu). Sınıf düzeyi, uygulama adımları, açıklamalı cevaplar, yayın tarihi ve ilgili gerçek araç bağlantıları içerir.
- **Giriş sayfaları:** Hızlı Okuma, Sınıf Kaynakları, Öğretmen Araçları ve Oyunlar girişlerine özgün açıklama, kullanım adımları ve rehber bağlantıları; E-Kitaplık'a çalışma önerisi eklendi. Aktif çalışma ekranlarına açıklama veya reklam eklenmedi.
- **Başlangıçta görünür içerik:** Ana sayfa ilk HTML yanıtında gerçek rehber başlıklarını ve bağlantılarını sunar. Canlı katalog hata verdiğinde hazır içerikler korunur; hesap/sınıf erişim kuralları korunarak katalog toparlandığında güncel listeye geçilir.
- **Sınıf ve ders yolları:** Beş sınıf sayfasına düzeye uygun özgün örnekler eklendi. Parametreli ders yönlendirme şablonu, tamamlanmamış makale şablonu ve özel hesap/sonuç ekranları arama dizininden hariç tutulur. Gezinme bağlantıları çalışmaya devam eder. Yayındaki metin türündeki eski vitrin makalesi sorgusu bu kontrolde sıfır kayıt döndürdü; yayımlanmamış içerik dizine açılmadı. Yeni rehberlerin tamamı ayrı ve taranabilir adreslerdedir.
- **Gizlilik:** Gerçek hesap, çalışma, yerel depolama ve hizmet sağlayıcıları temel alan gizlilik ve çerez açıklamaları ile ortak alt menü bağlantıları eklendi. Öğrenci verileri reklam koduna hedefleme parametresi olarak eklenmez. Rehber ve gizlilik sayfalarında okuma alanını kapatan kısayol çubuğu gösterilmez.
- **Reklam izin kodu:** Google etiketi, yalnızca etkin ve seçili, görünür bir giriş alanına yaklaşılınca reklam istekleri duraklatılmış hâlde yüklenir. Google'ın yayımlanmış CMP mesajı ve geç gelen gerçek TCF API'si desteklenir. İzin belirsiz/eksik/reddedilmişse birim isteği yoktur. İlk istek öncesinde ayar yeniden okunur; bu sıradaki admin kapatması da geçerlidir. Tüm birimler NPA/PPT kişiselleştirme kapalı ve çocuklara yönelik TFAT=1 işareti taşır. İzin geri alma bağlantısı çerez sayfasındadır.
- **Admin kontrolü:** Reklamları açmadan önce AdSense “Hazır”, yayımlanmış ve sınanmış izin mesajı, otomatik reklamların kapalı ve hassas engellerin kontrol edilmiş olduğunu doğrulayan üç kontrol gerekir. Acil kapatma bunlara bağlı değildir. İnceleme sonucu gelene kadar reklam yayını kapalı kalır.
- **Site haritası:** Özgün rehberler, gizlilik sayfaları ve öğretmen araçları eklendi; parametreli ders şablonları çıkarıldı. Ortak SEO kodu sayfanın açık `noindex` tercihini korur.

**Son adımlar:** Yayın ve canlı doğrulama; AdSense içinde Türkçe Google ziyaretçi tercih mesajının ilk katmanda reddetme ve seçenek yönetimiyle kurulması; canlı izin akışının kontrolü; ardından yeniden inceleme isteği. Bu adımların gerçekleşen durumu aşağıdaki doğrulama kaydına işlenecek.


### 26 Kasım · Yayın öncesi doğrulama

- Çalışma klasöründe **1.063/1.063** test geçti. Kullanıcının 26 Kasım tarihli açık yayın onayı bütün bekleyen web güncellemelerini kapsıyor; güncel yayın kopyasıyla karşılaştırmada bekleyen Ritmik Yılan değişiklikleri ve ilgili testleri birleşik pakete eklendi. Birleşik yayın kopyasında da **1.063/1.063** test geçti; 922 dosya, 1.817 bağlantı ve 277 betik denetimi hatasız tamamlandı. Ritmik Yılan iki oyuncu görünümü 390×844 önizlemede açıldı; yeniden başlatma ve duraklatma doğrulandı, aktif oyunda reklam birimi veya Google reklam betiği yok.
- Yayın paketi **922** genel dosya; **1.817** yerel bağlantı ve **277** betik/inline betik kontrolünde hata yok.
- Tarayıcı önizlemesinde 390×844 ve 1440×900, açık/koyu tema, dört rehber ve iki gizlilik sayfası kontrol edildi; yatay taşma yok. Açıklamalı cevaplar açılıyor. Hızlı okumada sınıf seçilince giriş açıklaması gizleniyor; çalışma alanında Google reklam betiği yüklenmiyor.
- Google hesabında Türkçe “Kemal Öğretmenim – Ziyaretçi reklam tercihleri” mesajı **Taslak** durumunda kaydedildi. İlk katmanda reddetme tüm bölgeler için açık; kapatma reddetme olarak açık; mesaj optimizasyonu kapalı. Canlı gizlilik sayfası doğrulandıktan sonra mesaj yayımlanacak.
- AdSense incelemesi ve gerçek ziyaretçi izin akışının son kontrolü henüz tamamlanmadı; reklamlar etkinleştirilmedi.

- **Birleşik yayın kapsamı:** Ritmik Yılan oyunundaki telefon/tablet dokunmatik yönlendirme, iki oyuncu için ayrı dokunma alanları, hareketli düğmeler, otomatik hafif grafik ve üstten görünüm, gölge/çizim yükünün azaltılması ve ses güncellemesi de bu yayına dahil. Diğer web dosyaları içerik özetiyle yayın kopyasıyla karşılaştırıldı; Unicode dosya adı farkı aynı görselin ikinci kopyası olarak eklenmedi.
