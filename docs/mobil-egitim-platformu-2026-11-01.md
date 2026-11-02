# Kemal Öğretmenim mobil eğitim platformu

Araştırma ve uygulama tarihi: 1 Kasım 2026. Kaynak proje: `mobile-app/`. Sürüm: 0.5.0.

## Sonuç ve mimari tercihi

Bu site için önerim, React Native ile yerel bir uygulama çekirdeği ve mevcut etkileşimli araçlar için uygulama içi çalışma ekranlarıdır. Ana gezinme, günlük ekran, arama/filtreleme, içerik kaydetme, son açılanlar, cihaz planları ve hesap ekranı React Native bileşenleriyle oluşturuldu. Öğretmen Ajandası, akıllı tahta, sınav, okuma ve oyun motorları güvenli bir içerik ekranında çalışır. Bu, bütün özelliklerin sıfırdan yerel dilde yeniden yazıldığı anlamına gelmez.

Mevcut motorları yeniden yazmak; sınav değerlendirmesi, okuma sonuçları, öğrenci kayıtları, çizim araçları ve ajanda eşitlemesi için ikinci bir uygulama mantığı doğururdu. Seçilen yaklaşımda bu alanların mevcut davranışları korunur. Genel site gezinmesi ve alt bar, yerel uygulama gezinmesine yer bırakır. Telefon/tablet ayrımı cihaz adına göre değil, kullanılabilir pencere genişliğine göre yapılır.

## İnternet araştırması ve tasarıma etkisi

| Kaynak | İncelenen yaklaşım | Bu uygulamadaki karşılığı |
| --- | --- | --- |
| [Apple Human Interface Guidelines — Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) | Ana hedefler için tutarlı sekmeler; iPad'de sekme/yan menü düzeni | Telefonda dört hedefli alt menü; geniş pencerede yan menü. |
| [Android — Build adaptive navigation](https://developer.android.com/develop/adaptive-apps/guides/build-adaptive-navigation) | Kompakt pencerede alt gezinme, geniş pencerede yan gezinme | 900 px ve üzerinde yan menü; içerik alanına göre birden çok sütun. Pencere değişince açık ekran korunur. |
| [Khan Academy — Downloads](https://www.khanacademy.org/downloads) | Hesapla ilerleme eşitleme, içerik kaydetme ve belirli çevrimdışı içerikler | Kaydedilen içerik kısayolları ve son açılanlar; çevrimdışı cihaz planları. Video indirme veya tüm içeriklerin çevrimdışı olduğu iddia edilmez. |
| [Google Classroom — Mobile app FAQ](https://support.google.com/edu/classroom/answer/6118390?hl=en) | Öğretmen/öğrenci görevleri, ödev takibi, kapsamı belirtilmiş çevrimdışı kullanım | Mevcut yerel rol paneli, ödev ve mesaj ekranları korundu. Çevrimdışı kullanılabilen alanlar açıkça adlandırıldı. |
| [Planbook — Mobile app overview](https://help.planbook.com/planbook-mobile-app-overview) | Mobilde ders planlama ve sınıf organizasyonu; mevcut hesapla erişim | Ajanda ana hedeflerden biri oldu; mevcut öğretmen bulut ajandası özeti yerel ekranda okunur. |
| [Duolingo — Practice tab](https://blog.duolingo.com/guide-to-duolingo-practice-hub/) | Belirli becerileri hedefleyen, isteğe bağlı alıştırma alanı | Keşfet ekranında okuma, sınav, oyun, ders ve sınıf araçları filtreleri. Duolingo'nun puan/enerji sistemi kopyalanmadı. |
| [Expo SDK 58 release notes](https://expo.dev/changelog/sdk-58) | Güncel React Native ve cihaz/pencere altyapısı; geliştirme derlemeleri | Expo 51 → 58, React Native 0.74 → 0.88.1, React 19.3. Paketler Expo uyum listesiyle eşitlendi. |
| [React Native WebView — Guide](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Guide.md) | İlk yükleme betiğinin Android'deki sınırları ve yerel/web iletişimi | Oturum/arayüz köprüsü başlangıçta ve yükleme sonunda uygulanır; idempotenttir. Oturum yalnız doğrulanan birinci taraf ana belgede kullanılabilir. |

Tablodaki uygulama kararları kaynaklardan yapılan tasarım çıkarımlarıdır. Ürünlerin birebir kopyası değildir.

## Ekran yapısı

- **Bugün:** kısa başlangıç kartı, akıllı tahta/okuma/sınav/akvaryum kısayolları, son açılanlar, cihazdaki gün planı ve kaydedilenler.
- **Keşfet:** Türkçe karakterlere duyarlı arama; kategori ve kaydedilen filtreleri; mevcut katalogdan alınan 32 oyun. Yönetimden eklenen güncel oyunlara canlı katalogdan da ulaşılır.
- **Ajanda:** hafta seçimi, yerel plan ekleme/tamamlama/silme, öğretmen hesabındaki bulut ajandası özeti ve ayrıntılı ajanda bölümlerine doğrudan geçiş.
- **Hesabım:** giriş/kayıt, rol paneli, ödevler, mesajlar, profil ve aydınlık/karanlık/cihaz teması.
- **Çalışma ekranı:** uygulama içi geri gezinme, odak görünümü, yatay ekran isteği, yerel paylaşım/yazdırma, bağlantı hatasında yeniden deneme ve yükleme zaman aşımı.

## Öncelikli modüller

| Modül | Uygulamadaki kullanım | Veri kaynağı |
| --- | --- | --- |
| Öğretmen Ajandası | Yerel hafta/gün özeti; tam ajandada sınıflar, program, takvim, sınav/karneler, yedek ve bulut | Aynı `teacher_agenda_states` kaydı ve mevcut ajanda motoru |
| Akıllı Tahta | Odak/yatay çalışma ekranı; çizim motoru korunur | Mevcut tahta motoru ve kendi kayıt davranışları |
| Sınavlar | Uygulama içinde sınıf seçimi, sınav, süre, sonuç ve karne | Mevcut sınav sistemi |
| Hızlı okuma | Yerel sınıf seçimi; doğru sınıfa doğrudan açılış; metin/soru/karne akışı | Mevcut okuma sistemi |
| Oyunlar | Yerel katalog ve filtreler; oyunun kendi çalışma ekranı | 32 mevcut oyun ve canlı oyun kataloğu |

## Saklama ve eşitleme sınırları

Cihaz planları öğretmen bulut ajandasından ayrıdır; arayüzde bu ayrım belirtilir. Planlar, kaydedilen kısayollar ve son açılanlar her kullanıcı için ayrı cihaz alanında tutulur. Yeni kullanıcıya geçerken eski kullanıcının tercihleri onun hesabına yazılmaz. Bu yerel veriler uygulama kaldırıldığında kaybolabilir.

Öğretmen bulut ajandası özeti salt okunurdur. Bu sürüm bulut ajandasının tamamını yerel bir kopyadan yeniden yazmaz. Ajanda düzenleme mevcut motor üzerinden devam eder. Veritabanı şeması veya öğrenci/puan kayıtları değiştirilmez.

Oturum köprüsü yalnız tam olarak doğrulanan HTTPS site kaynağına ve ana belgeye uygulanır. Harici belgeler/iframe'ler yerel oturumu almaz. JSON/PDF/görsel/Excel/CSV dışa aktarımı tür ve boyut denetiminden sonra cihazın paylaşım menüsüne gider; alıcıyı kullanıcı seçer. Hesap değişiminde ajanda yerel alanları kullanıcıya göre ayrılır ve önceki alan arşivlenir.

## Doğrulama

- TypeScript denetimi.
- Expo paket sürümü uyum denetimi.
- Uygulamanın web önizleme derlemesi.
- 15 mobil davranış testi: URL sınırları, dosya doğrulama, bozuk yerel kayıtlar, son açılanlar, yerel tarih/hafta hesapları, ekran kırılımları, katalog hedefleri, köprünün idempotentliği, hesap izolasyonu, eski yerel kayıtları koruma, depolama hatası, okuma sınıf bağlantısı ve Hermes bytecode uyumu.
- Ana sitenin 714 regresyon testi geçti.
- Tarayıcı önizlemesinde telefon/tablet düzeni, içerik arama, kaydetme, tema, plan ekleme ve sayfa yeniden açıldıktan sonra planın korunması kontrol edildi.

Tarayıcı önizlemesi, Android/iOS cihaz testi yerine geçmez. Gerçek cihazda kalem/çoklu dokunma, WebGL oyunları, uzun sınav oturumu, dosya seçme/paylaşma, ses ve işletim sistemi geri dönüşleri ayrıca sınanmalıdır. iOS için tam Xcode ve geliştirici imzası gerekir; mağaza/TestFlight yayını yapılmış kabul edilmez. Tüm cihazlarda yüzde yüz uyum iddiası ancak bu cihaz matrisi tamamlanınca yapılabilir.

### Yerel JavaScript motoru uyumu

[Hermes özellik belgesi](https://github.com/facebook/hermes/blob/static_h/doc/Features.md), bytecode derlemesinde `Function.prototype.toString()` yönteminin özgün kaynak kodu döndürmediğini belirtir. Bu nedenle WebView köprüsü çalışma sırasında bir işlevden üretilmez. `scripts/build-bridge.cjs`, TypeScript kaynağından doğrulanan statik bir JavaScript metni üretir. Mobil çalışma anı bu metni kullanır. Derleme öncesi kontrol, kaynak ve üretilmiş betiğin eşit olduğunu doğrular.

## Teslim edilen Android test paketi

0.5.0 / sürüm kodu 5 için ARM64 APK derlendi. Android 7.0+ (API 24), hedef SDK 36. APK imzası ve içindeki statik Hermes köprü betiği kontrol edildi. Bu paket Android Debug sertifikasıyla imzalıdır; mağaza güncellemesi değildir. Mevcut yayın imzasıyla farklıysa eski uygulamanın üzerine kurulamaz. Eski uygulamayı veya verilerini silmeden, test cihazında değerlendirilmelidir.

Fiziksel cihaz testi yapılmadı. Android emülatörü açıldı ancak bu oturumda arayüz bağlantısı tamamlanamadığından emülatör testi geçti olarak işaretlenmedi. iOS JavaScript/varlık paketi derlendi; IPA, TestFlight veya App Store paketi oluşturulmadı.
