# Sınıf Akvaryumu uygulaması

Yalnızca Sınıf Akvaryumu için ayrı, hafif bir mobil uygulama. Android Java/WebView ile çalışır; iOS için aynı yapılandırmayı kullanan SwiftUI/WKWebView projesi bulunur. Mevcut `mobile-app` projesi değiştirilmez.

## Kullanım

- Açılış adresi: `https://kemalogretmenim.com.tr/ogretmen/akvaryum.html`.
- Üstteki **Ana sayfa** simgesi, sitenin ana sayfasını cihazın varsayılan tarayıcısında açar. Diğer site sayfaları da tarayıcıya gider; akvaryum ve giriş ekranı uygulamada kalır.
- Veli erişimi: web ekranından tüm sınıfa tek seferde ayrı kod oluşturma, öğrenci bazında görünüm değiştirme, kod ve bağlantıyı tek mesajda kopyalama, Android paylaşım menüsü ve WhatsApp. Android yerel pano kullanır; ek izin istemez. Paylaşım öğretmenin dokunuşuyla açılır, alıcıyı ve gönderimi öğretmen seçer.
- Üç nokta menüsü: yenile, tarayıcıda aç, örnek sınıf, hakkında.
- Telefon ve tabletlerde dikey/yatay görünüm desteklenir. Android geri düğmesi önce açık akvaryum penceresini kapatır; tam ekranda çıkış düğmesi vardır.
- Uygulama ve tarayıcı oturumları ayrıdır. İlk kullanımda **e-posta ve şifreyle** giriş yapılır; sonraki açılışlarda mevcut site oturum saklama/yenileme mekanizması kullanılır. Google hesabıyla kayıt olanlar “Şifremi unuttum” üzerinden parola oluşturabilir. Bu sürüm uygulama içinden Google OAuth sağlamaz.
- İlk açılış, güncel akvaryum ve hesap eşitlemesi internet gerektirir. Uygulama canlı siteyi açar; yerel, henüz yayımlanmamış site değişikliklerini içermez. Ağ hatasında kayıtları silmeden yeniden deneme ekranı gösterir.
- JSON yedek içe/dışa aktarımı sistem dosya seçicisini kullanır. Veli paylaşım köprüsü yalnızca bir öğrenciye ait doğrulanmış kod ve bağlantıyı taşır; hesap kimlik bilgilerini taşımaz. Android yalnızca internet izni ister. HTTPS sertifika kontrolleri devrededir; kimlik bilgileri yerel köprüye aktarılmaz.

## Android APK’sı · 1.1.0

Android 7.0 / API 24 ve üzeri hedeflenir. Cihazda güncel **Android System WebView / Chrome** gerekir. Eski veya yönetici tarafından kısıtlanan akıllı tahta yazılımlarında ayrıca cihaz denemesi yapılmalıdır.

`dist/Sinif-Akvaryumu-1.1.0.apk` uygulamaya özel kalıcı anahtarla imzalanmış, hata ayıklaması kapalı sürümdür. Paket adı `tr.com.kemalogretmenim.aquarium`. Site dosyası `indir/sinif-akvaryumu/sinif-akvaryumu-1.1.0.apk`; kurulum açıklaması `/indir/sinif-akvaryumu/` adresindedir. Önceki deneme paketi `.preview` kimliğiyle ayrı kalır. Android cihazda APK’yı açın ve gerekiyorsa seçtiğiniz kurulum kaynağına izin verin.

Uygulama Play Store’a yüklenmiş değildir; doğrudan APK olarak dağıtılır. Mağaza dağıtımı için güncel hedef SDK gereksinimi ve mağaza formları ayrıca ele alınır. İmza anahtarı ve parolalar bu deponun dışında `~/.local/share/kemalogretmenim-signing/` dizininde tutulur. **Bu özel dizini güvenli şekilde yedekleyin; ileride aynı uygulamayı güncellemek için aynı anahtar gerekir.** Bu dosyaları siteye yüklemeyin.

### Derleme

Android Studio, JDK 17 veya 21, Android SDK Platform 35 gerekir. İlk Gradle derlemesi resmi Google/Maven depolarından bağımlılık indirir. Mac’te kurulu Android Studio JDK’sı ve standart SDK dizini otomatik bulunur; diğer kurulumlarda `JAVA_HOME` ve `ANDROID_HOME` ayarlanır.

```sh
cd aquarium-app
npm run android:debug
npm run android:signing-setup  # yalnızca ilk imza kurulumu
npm run android:release
npm run android:lint
npm test
```

`android:debug` ve `android:release` APK’yı ve SHA-256 dosyasını `dist/` içine kopyalar. Sürüm kodu `shared/app-config.json` içindeki `versionCode` ile artırılır. Özel imza dosyası `AQUARIUM_SIGNING_PROPERTIES` ortam değişkeniyle farklı bir konumdan da okunabilir. `dist/`, Gradle önbelleği, derleme çıktıları ve makineye özel `local.properties` Git’e girmez. Kaynakta hiçbir hesap parolası veya yayın anahtarı yoktur.

## iOS hazırlığı

`ios/SinifAkvaryumu.xcodeproj` dosyasını tam Xcode ile açın. Signing & Capabilities altında kendi Apple geliştirici takımınızı seçin. Proje iOS 16+, iPhone ve iPad için hazırlanmıştır. Logo, uygulama bilgileri, kalıcı WKWebView oturumu, harici tarayıcı, ağ hatası ve JSON dosya paylaşımı kaynakları mevcuttur.

Bu Mac’te tam Xcode / iOS SDK olmadığı için **IPA oluşturulmadı ve iOS arayüzü cihazda sınanmadı**. URL yönlendirme kuralları Swift komut satırıyla test edilir; proje/plist yapıları doğrulanır. App Store/TestFlight dağıtımı yapılmadı.

## Yapılandırma ve doğrulama

- `shared/app-config.json`: ad, marka, sürüm, site adresi.
- `shared/mobile-shell.js`: yalnızca uygulama içinde kullanılan kompakt görünüm ve yedek köprüsü; canlı site dosyalarını değiştirmez.
- `branding/app-icon.svg`: düzenlenebilir yeni akvaryum logosu. Android vektör simgesi ve iOS 1024 px simgesi projededir.
- `tests/`: JavaScript kabuk ve güvenli köprü testleri; Android Java / iOS Swift URL yönlendirme testleri.
- Android emülatör testi: `android/app/src/androidTest/.../SmokeInstrumentation.java`. Gerçek hesaba giriş yapmaz ve sınıf verisini değiştirmez; örnek sınıfı kullanır.

JavaScript testleri, ana deponun geliştirme bağımlılığı `linkedom` paketini kullanır; temiz kurulumda önce ana depoda `npm install` çalıştırılır. Android uygulamasının çalışma anında bir JavaScript paket bağımlılığı yoktur.

`aquarium-app/`, `.netlifyignore` ile site yüklemelerinden çıkarılmıştır. Uygulama kaynağı ve özel derleme dosyaları site indirmesine dahil edilmez. İndirilecek imzalı APK ve SHA-256 kaydı yalnızca `indir/sinif-akvaryumu/` altında yayımlanır; ana sayfada Android indirme vitrini bulunur. Google Play veya App Store yayını yapılmaz.
