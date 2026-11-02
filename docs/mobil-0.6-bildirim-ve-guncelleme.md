# Mobil 0.6.0: bildirim ve güncelleme davranışı

1 Kasım 2026. Android sürüm kodu 6, iOS build 6. Paket kimliği `com.kemalogretmenim.app` korunur. Bu değişiklik mağaza yayını veya sunucuya push gönderim sistemi kurulumu anlamına gelmez.

## Takvim ve saat

`DateTimeField` kurulmuş uygulamada Android Material 3 tarih/saat diyaloğunu ve iOS SwiftUI tarih/saat seçicisini kullanır. Kullanıcı değerleri metin olarak yazmak zorunda kalmaz. Tarayıcı önizlemesinde tarayıcının tarih/saat alanı kullanılır. Saatler 24 saat biçiminde, tarihler cihazın yerel takvim günüyle saklanır; UTC dönüşümünde gün kaydırılmaz. Seçiciler mevcut `@expo/ui` paketini kullanır; ek üçüncü taraf bağımlılığı eklenmemiştir. [Expo 58 seçici belgesi](https://docs.expo.dev/versions/v58.0.0/sdk/ui/drop-in-replacements/datetimepicker/).

## Hatırlatmalar

Kullanıcı ajandada hatırlatmayı açtığında bildirim izni istenir. Giriş yapmak otomatik izin diyaloğu açmaz. İzin varsa, `remind:true` olan ve tamamlanmamış gelecek etkinlikler cihazın işletim sistemine tek seferlik bildirim olarak kaydedilir. `minutesBefore` 0–10080 dakika aralığında etkinlikten önce bildirim seçer. En yakın 40 kayıt hazırlanır; kayıt değişince eski bildirim güncellenir, silinince veya tamamlanınca iptal edilir. Aynı kayıt tekrar tekrar planlanmaz.

Android kanalı `agenda-reminders-v2`: yüksek önem, standart bildirim sesi, titreşim, kilit ekranında özel içerik. Sessiz mod veya Rahatsız Etmeyin ayarı aşılmaz. iOS'ta uyarı/ses için açık izin gerekir. Bildirime dokunmak ilgili hesabın doğru ajanda gününü açar. Payload içindeki dış URL veya rastgele rota açılmaz. Hesap değişince/çıkışta eski hesabın bekleyen ve gösterilmiş ajanda bildirimleri temizlenir.

Kesin alarm ayrıcalığı (`USE_EXACT_ALARM`/`SCHEDULE_EXACT_ALARM`) istenmez. Expo 58 `delivery:bestEffort` kullanır. İşletim sisteminin pil tasarrufu, üretici kısıtları, kullanıcı izinleri, sessiz mod ve iOS Odak ayarları teslimi geciktirebilir veya sesi engelleyebilir. Bu nedenle her cihazda saniyesi saniyesine zil sözü verilmez. [Expo bildirim belgesi](https://docs.expo.dev/versions/latest/sdk/notifications/), [Android bildirim gizliliği](https://developer.android.com/develop/ui/compose/notifications/create-notification), [Apple yerel bildirim planlama](https://developer.apple.com/documentation/usernotifications/scheduling-a-notification-locally-from-your-app).

Yerel bildirimler cihazda programlandıktan sonra uygulama ön planda olmadan gösterilebilir. Başka cihazda daha sonra yapılan değişikliklerin uygulama kapalıyken bu cihaza hemen gelmesi için sunucu tarafında push/arka plan sistemi gerekir. Mevcut kaynakta FCM `google-services.json` ve doğrulanmış APNs dağıtım kimlikleri yoktur. Bu altyapının mağaza hesaplarıyla kurulması ve gerçek cihazda uçtan uca denenmesi ayrı yayına hazırlık adımıdır. Oturum açmada push-token kaydı yalnızca izin zaten verilmişse yapılır; Android FCM yapılandırması yoksa token isteği atlanır. Token cihaz kimliği model adına göre değil SecureStore'daki kurulum UUID'sine göre tutulur. [Expo push kurulumu](https://docs.expo.dev/push-notifications/push-notifications-setup/).

## Yeni sürüm kontrolü

0.6.0 ve sonraki Android sürümü açılışta ve uygulamaya dönüşte en fazla günde bir kez GitHub'ın aynı deponun Releases API'sini kontrol eder. Hesabım'dan elle kontrol her zaman mümkündür. Ağ hatası uygulama açılışını engellemez. Daha yeni sürüm ve Android kodu varsa uyarı gösterilir. İndirme yalnızca kullanıcının İndir seçimiyle tarayıcıda açılır; APK otomatik indirilmez/kurulmaz, uzaktan kod yüklenmez. HTTPS ve `github.com/Kemalogretmen/kemalogretmenim-v4/releases/download/` yolu zorunludur. Başka projeler, taslaklar, ön sürümler ve ayrı akvaryum uygulaması sürümleri dikkate alınmaz.

Mevcut `mobile-v4` etiketi yeniden kullanılabilir. Yayın açıklamasına sürümün güvenilir biçimde ayırt edilebilmesi için şu açık metadata işareti eklenmelidir:

```
<!-- kemal-mobile-version:0.7.0;android-code:7 -->
```

Değerler yayımlanan APK'nın `versionName` ve `versionCode` bilgileriyle aynı olmalıdır. Kabul edilen ana uygulama varlık adları:

- `kemal-ogretmenim-v4.apk` (mevcut sabit indirme linki)
- `kemal-ogretmenim-0.7.0.apk`
- `Kemal-Ogretmenim-0.7.0-Android-ARM64-Test.apk` (açıkça test paketi)

Etiket adı `mobile-v4` veya `mobile-v0.7.0` gibi olmalıdır. Sırf dosyanın yeniden yüklenme tarihi değişti diye güncelleme uyarısı oluşturulmaz. Yayın henüz yapılmadıysa yeni paket bulunmaması normaldir. Bu kod 0.5.0'da yoktur: 0.5.0 kurulumu bir kere elle 0.6.0'a geçirilmeden yeni kontrol özelliğini kendiliğinden edinemez.

Mağaza dağıtımı öncesinde uygulama paketleri kalıcı üretim imzasıyla imzalanmalı ve güncelleme indirme yönlendirmesi Google Play/App Store sürüm kanalına taşınmalıdır. Şu anki APK test imzası mağaza yayın kimliği sayılmaz. Aynı paket kimliği tek başına güncelleme garantisi değildir; eski sürümün imza sertifikasıyla eşleşme gerekir. İmza uyuşmazlığında mevcut uygulamayı silmek veri kaybı doğurabileceği için önerilmez. Otomatik güncelleme uyarısı veya bu kontroller mağaza güvenlik incelemesinin yerini tutmaz.

## Doğrulama

`mobile-app/tests/mobile-native-features.test.cjs` opt-in, yerel tarih/saat, hatırlatma ön süreleri, yinelenmeme, silme/güncelleme/hesap değişiminde iptal, bildirim rota sınırı, sürüm karşılaştırma, metadata ve HTTPS indirme sınırlarını sınar. Fiziksel Android/iPhone cihazında bildirim izni, kilit ekranı, ses, yeniden başlatma, pil kısıtları ve saat dilimi değişimi ayrıca denenmelidir.

## Kayıtlı öğrenci/veli kişisel planları

`supabase-mobile-personal-plans.sql` yalnızca yeni `mobile_personal_plans` tablosunu ve ona ait izin/tetikleyicileri ekler. Eski site, öğrenci ve ajanda tablolarından kayıt silmez. Tabloda her satır tek bir `auth.uid()` sahibine aittir; aktif oturumlu kullanıcı yalnızca kendi kayıtlarını okuyabilir/ekleyebilir/güncelleyebilir. Anonim erişim ve istemciden fiziksel silme izni yoktur. Öğretmen ajandası mevcut `teacher_agenda_states` verisini kullanmaya devam eder.

`usePersonalPlans` öğrenci/veli hesaplarının planlarını ayrı satırlarda eşitler. Değişiklik önce hesaba ait cihaz outbox'ına yazılır, çevrimiçi olunca buluta gönderilir. Her güncelleme `user_id + id + updated_at` koşuluyla yapılır. Aynı alan başka cihazda değişmişse sessizce üstüne yazılmaz; bekleyen kayıt korunur ve hata gösterilir. Birbirinden farklı alanlar en son sunucu satırı üzerinde birleştirilir. Silme fiziksel silme yerine `deleted_at` işareti bırakır, gecikmiş bir güncelleme silinmiş kaydı yeniden görünür yapmaz. Uygulama açıkken Realtime, 20 saniyelik güvence yenilemesi ve uygulamaya dönüş yenilemesi kullanılır. Yeni bir bulut değişikliği uygulama kapalıyken yerel hatırlatmayı yeniden programlayamaz; bunun için yukarıdaki sunucu push altyapısı gerekir.

Planın düzenlendiği kullanıcı değişirse önceki hesabın önbelleği ekrana verilmez ve bekleyen işlemleri yeni hesaba gönderilmez. Misafirin cihaz planları ayrı kalır. Her cihaz yedeği şifreli öğrenci arşivi yerine geçmez; kişisel plan başlıkları ve tarihleri cihaz uygulama alanında saklanır.
