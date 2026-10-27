# Drive ve FlipHTML5 dokümanları

1. Yönetim panelinde **Doküman Yönetimi → Yeni İçerik** bölümünü aç.
2. Başlığı ve açıklamayı yaz; **Harici link / Drive / FlipHTML5** seçeneğini seç.
3. Drive'da tek dosyanın paylaşım linkini, FlipHTML5'te tek kitabın bağlantısını veya **Share → Embed on Website** iframe kodunu yapıştır.
4. Sınıf ve ders seçip **Hedef Ekle** düğmesine bas. Aynı kitabı birden fazla sınıf ve derse ekleyebilirsin.
5. **Kaydet** ve ardından **Önizlemeyi Aç** düğmesini kullan.

Belge kaynak sitede tutulur; Supabase'e PDF yüklenmez. FlipHTML5'in gömme akışı: [Embed a Flipbook](https://help.fliphtml5.com/docs/embed-a-flipbook/).

Drive dosyasının görüntüleme iznini hedef kullanıcıların erişebileceği şekilde ayarla. Paylaşımı kapalı dosyalar oturum açılmasını isteyebilir.

Yayın Ayarları bölümündeki **Ana sayfa canlı akışta göster** seçeneğini kaydetmeden önce açıp kapatabilirsin. Kapalıyken doküman ders sayfalarında ve site aramasında erişilebilir kalır; ana sayfadaki canlı akış ve güncel içerik kartlarında gösterilmez. Kayıt özetinde seçimin sonucu görünür. Bu tercih daha sonra düzenlenebilir; yeni kayıtlarda açık başlar, mevcut kayıtların görünürlüğü korunur. PDF, görsel, Drive, FlipHTML5 ve ders videolarında kullanılabilir.

Görüntüleyicide **Tam Ekran** düğmesi belgeyi ve araç kutusunu birlikte büyütür. Destekleyen tarayıcılarda `F` aynı işlemi yapar; `Esc` ile çıkılır. Yerel tam ekran API'si kullanılamıyorsa görüntüleyici sayfayı kaplayacak şekilde genişler. Kaynak iframe'inin kendi tam ekranı, araç kutusunu gizlememesi için kapalıdır.

**Seçim** aracı kaynak belgeyle etkileşime geçmeni, **Kalem** aracı ekran üstüne çizmeni sağlar. Harici okuyucunun sayfa numarasına erişilemediğinden çizimler ekrana bağlıdır; kaynakta sayfa değişince aynı yerde kalırlar. Tam ekran ve pencere boyutu değişiminde kaynak belge yeniden yüklenmez, çizimler korunur. Çizimler bu cihazın tarayıcısında saklanır.

**Temizle** onayı görüntüleyicinin içinde açılır; tarayıcının tam ekranı bozabilen yerel onay penceresi kullanılmaz. **Vazgeç** çizimleri korur; **Temizle** sonrasında **Geri Al** ile çizimler geri getirilebilir. Cevap alanları korunur. Aynı onay kutusu kırpılmış soru alanını temizlerken ve etkileşimli alan kaldırırken de kullanılır.

Araç kutusu iki sütunda, simge ve adları birlikte gösterir; mobilde alt sıraya yerleşir. **Oklar** menüsünde tek yönlü, çift yönlü ve kesik oklar ile çizgiler bulunur. Başlangıçtan bitişe sürükleyerek çizilir. **Damga** menüsündeki onay/çarpı işaretleri ve yeşil **DOĞRU** / kırmızı **YANLIŞ** damgaları tek tıklamayla eklenir; menüde damga boyutu ayarlanır. **Düzenle** aracı (`S`) not ve damgaları taşımayı, döndürmeyi ve boyutlandırmayı sağlar. Harici okuyucuyla etkileşime geçmek için **Seçim** (`V`) veya **El** (`H`) kullanılır.

**Pergel** (`C`) için merkez noktasına basıp dışarı sürükle. Geçici pergel kolları ve yarıçap göstergesiyle çember önizlenir; bırakınca yalnızca çember kalır. Pergel çizimleri tam ekran ve pencere boyutu değişiminde yuvarlaklığını korur. Araçlar normal dokümanda ve büyütülmüş soru alanında da çalışır; sayfa üzerindeki çizimler mevcut geri alma/kaydetme düzenini kullanır.

FlipHTML5 kataloğundan sınıf, ders, konu ve yaş uygunluğuna göre kitap seçip her kitaba bir doküman kaydı açılabilir. Paylaşım/gömme izni olan yayınları kullan. Ücretsiz okunması, PDF'yi indirip yeniden yayınlama izni anlamına gelmez. Kaynak dosya kaldırılırsa veya yayıncı erişimi kısıtlarsa önizleme çalışmayabilir; **Kaynağı Aç** bağlantısı asıl yayına gider. Dosya indirme ve yazdırma, kaynak sitenin sunduğu seçeneklere bağlıdır.

Mevcut `harici_provider`, `harici_url`, `harici_embed_url` alanları kullanılır; yeni veritabanı geçişi gerekmez.

Ana sayfa tercihi mevcut `etkilesim_json.homeFeedVisible` alanında saklanır. Etkileşimli alanlar yayımlanırken korunur. İçerik akışı, büyük çizim verileri yerine yalnızca bu JSON değerini okur; arama ve öğretmen kütüphanesinin ortak önbelleği tüm içerikleri tutar.

Doğrulama:

- `node --test tests/dokuman-external.test.cjs`: bağlantı ve iframe normalizasyonu, kaynak anahtarları, doğrudan dosya desteği, geçersiz kaynaklar.
- `node --test tests/content-feed.test.cjs`: ana sayfa tercihi, ortak katalog/önbellek ayrımı, eski kayıtlar ve etkileşim yayımlarken tercihin korunması.
- `tests/browser/dokuman-external.cjs`: yerel sunucu, Playwright ve sayfanın kullandığı Fabric 5.4.1 kopyası ile çalışır (`DOCUMENT_ORIGIN`, `FABRIC_FIXTURE`; isteğe bağlı `CHROMIUM_EXECUTABLE`, `WEBKIT_EXECUTABLE`). Üretim hesabına bağlanmadan örnek okuyucularla masaüstü/mobil boyutları, tam ekran, çizim ve okuyucu konumunun korunmasını doğrular. Okların uçları, tek tıklamalı damgalar, damga boyutu, pergel geometrisi, notların taşınması ve büyütülmüş soru alanında çizim de denetlenir. Tam ekranda silme/vazgeçme/geri alma ve onay açıkken kısayolların engellenmesi test edilir. Chromium ve WebKit motorları desteklenir; sürücü ile kurulu tarayıcının sürümleri eşleşmelidir.
