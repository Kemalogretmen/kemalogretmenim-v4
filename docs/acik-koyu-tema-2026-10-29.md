# Açık / koyu tema — 29 Ekim 2026

## Uygulama

- 103 web HTML sayfasına stillerden önce çalışan ortak tema başlangıcı eklendi. Mobil uygulama kaynakları ve derleme çıktıları bu web değişikliğinin kapsamında değil.
- Yeni `js/site-theme.js`, `css/site-theme.css`, `css/theme-control.css` dosyaları ortak görünümü yönetiyor. Ek bağımlılık yüklenmedi.
- Varsayılan açık tema. Ay/güneş anahtarına dokunmak veya yatay sürüklemek açık/koyu seçer. Klavyede Enter/Space ile geçiş; sol/sağ ve Home/End ile doğrudan seçim çalışır.
- Yanındaki ekran simgesi cihazın sistem temasını izlemeyi açıp kapatır. Tercih cihazda `kemal-theme` anahtarında saklanır; aynı kökendeki sekmeler arasında eşitlenir. Hesap ve sınıf kayıtlarına yazılmaz.
- Düğme yumuşak renk geçişi ve kayan yaylı imleç kullanır. Hareket azaltma ve hafif performans tercihleri geçişi sadeleştirir.
- Ortak navbarı olmayan ekranlarda mevcut üst araç alanına veya küçük bağımsız üst kontrole yerleşir. Sınavın önceki ayrı tema sistemi ortak seçime bağlandı; ekran değişimlerinde kontrol yeniden yerleştirilir.
- Ortak menü, arama, footer, açık/kapalı dock, ana sayfa, kataloglar, giriş/formlar, kullanıcı ve yönetim panelleri, okuyucu kontrolleri ve öğretmen araçlarının çevre panelleri için koyu palet eklendi.

## Korunan içerik

Cumhuriyet görseli ve diğer medya değiştirilmedi. Akvaryum/oyun sahneleri, eğitimde anlam taşıyan renkler, çizimler, renk örnekleri, 3D zeminler, PDF/kitap/sertifika kağıtları kendi renklerini korur. Koyu renk kuralları ekran ortamıyla sınırlıdır; yazdırmada açık renk şeması kullanılır. Harici iframe içeriği kendi sağlayıcısının görünümünü kullanır. Tam ekran etkinliklerde seçili tema korunur; site başlığı tam ekran öğesinin dışında kalabilir.

## Doğrulama

- `node --test tests/*.test.cjs`: **700 test geçti, 0 hata**.
- Bunların 18'i tema davranışını, sürükleme/klavye kullanımını, sistem tercihini, depolama hatalarını, sekmeler arası eşitlemeyi, tekrar başlatmayı, gizli kontrol yuvalarını ve sınav köprüsünü doğrular.
- 103 HTML için tek, senkron ve stillerden önce yüklenen başlangıç dosyası ile iki ortak stil dosyasının varlığı kontrol edildi.
- JavaScript sözdizimi ve `git diff --check` temiz.
- Tarayıcıda ana sayfa (320/390 px ve masaüstü), açık/koyu mobil menü, kaynak/giriş/oyun/sınav katalogları, e-kitaplık, yönetim giriş ekranı, matematik araçları, beyaz tahta, 3D atölye, belge stüdyosu ve örnek akvaryum kontrol edildi.
- Koyu + hafif performans modunda dock yüzeyi ve metni tarayıcıda doğrulandı.
- Her özel hesap yetkisiyle tüm işlemler ve gerçek cihazların tüm tarayıcı sürümleri ayrı ayrı denenmedi. Sınavın ortak temayla bağlantısı otomatik test edildi; doğrulama sırasında gerçek sınav yanıtı veya yönetim kaydı gönderilmedi.

## Teslim

Değişiklikler yerel projededir; canlıya yayımlanmadı. Önizlemeler görevin görselleştirme klasörüne kaydedildi: `koyu-tema-ana-sayfa.png`, `acik-tema-ana-sayfa.png`, `koyu-tema-mobil.png`.
