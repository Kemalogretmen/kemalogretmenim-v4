# Mobil eğitim platformu 0.6.0

2 Kasım 2026. Android paket kimliği `com.kemalogretmenim.app`, sürüm `0.6.0`, kod `6`. Bu teslim Android ARM64 test paketidir; mağaza yayını değildir.

## Kullanıcıya yansıyan değişiklikler

- Ana ekrana sitenin gerçek içerik kaynaklarından beslenen native vitrin ve canlı akış eklendi. Public Supabase metadata kullanılır; sınav cevapları veya öğrenci kayıtları bu akışa alınmaz. Elle yenileme, uygulamaya dönüşte yenileme, iki dakikalık aralık, kısmi hata yönetimi ve doğrulanmış önbellek bulunur. Hareket azaltma/ekran okuyucu tercihlerinde geçiş durur; içerikler elle gezilebilir.
- Öğretmen ajandası artık hem `agenda_state` hem `lesson_planner_state` okur. Açılışta bugünün dersleri sırayla gösterilir. Gün/hafta okları, takvim seçimi, sınıf seçimi, süreç bileşenleri ve “Devamını gör” ile öğrenme çıktıları vardır. Dersin yılı/tarihi eşleşmeden başka yılın çıktısı gösterilmez.
- Sınıf oluşturma, öğrenci ekleme/listeleme ve ders programı hücresi düzenleme native arayüzdedir. Karne, rapor, dosya içe aktarma ve ayrıntılı ajanda araçları mevcut uzman motoruyla uygulama içindeki çalışma ekranında açılır. Bu alanların tamamının native dilde yeniden yazıldığı iddia edilmez.
- Öğretmen değişiklikleri mevcut web ajandasıyla aynı bulut kaydını kullanır. Öğrenci/veli kişisel planları özel `mobile_personal_plans` satırlarına kaydedilir. Misafir planları cihazda kalır. Önceki sürümdeki hesaba ait cihaz planları korunur; öğrenci/velide güvenli otomatik aktarım, öğretmende görünür aktarım işlemi bulunur.
- Tarih ve saat elle yazmak yerine Android/iOS sistem seçicisiyle seçilir. Alt gezinme cam görünümünde, sabit ikonlu ve platforma uygun güvenli alanlarla düzenlenmiştir. Geniş ekranda yan menü kullanılır.

## Yeni kum havuzu

Son kaynak sürümü, yazı kılavuzu, TTKB yazı fontları, araç ikonları ve özgün sürtünme WAV dosyasıyla APK içine gömülmüştür. `whiteboardDocumentSource.ts` otomatik üretilir; 46 kaynak varlığın SHA-256 değeriyle güncelliği test edilir. Sonraki değişiklikte:

```
cd mobile-app
npm run whiteboard:generate
npm run bridge:generate
npm test
```

Kum yüzeyi, harf kılavuzu, çizim, silme, geri alma, renk/tane ayarları ve ses için ağ indirmesi gerekmez. HTML/CSS/JS/font/ses yereldir. Site oturumu bu belgeye verilmez; CSP uzak betik/iframe/ağ bağlantılarını kapatır. Belge yenilenmeden tema köprüsü güncellenir; oturum veya tema yenilemesi mevcut çizimi değiştirmez. PNG paylaşımı ve yazdırma sınırlı, doğrulanan native köprüden geçer.

Dikey ilk açılışta boyutlar yerleşim tamamlandıktan sonra ve yüzey görünür olduğunda hesaplanır. Eski canlı sayfa için uyumluluk düzeltmesi de vardır. Tarayıcıdaki gerçek paket önizlemesinde ekran çevrilmeden çizgi çizildi ve kum geri alma düğmesi etkinleşti. 320 ve 390 pikselde yatay sayfa taşması görülmedi; boyut değişiminde çizgi korundu. Bu gözlem fiziksel Android dokunma testi yerine geçmez.

## Eşitleme ve kayıt güvenliği

Değişiklik önce hesaba ait dayanıklı cihaz kuyruğuna yazılır. Depolama başarısızsa “kaydedildi” denmez ve başarısız işlem sonradan sessizce gönderilmez. Çevrimiçiyken en güncel sunucu kaydı alınır, küçük değişiklik onun üzerine uygulanır ve `updated_at` koşuluyla yazılır. Aynı alan başka cihazda değişmişse kayıt korunur ve çakışma gösterilir. Diğer öğrencilerin, fotoğrafların, yıllık planların veya bilinmeyen web alanlarının üstüne boş mobil özet yazılmaz.

Hesap/rol değişimi, A→B→A geçişi ve gecikmiş ağ/depolama yanıtları kimlik ve işlem nesliyle sınırlandırılır. Gösterim önbelleği sağlık, aile, adres ve fotoğraf alanlarını içermez. Bekleyen düzenleme için gerekli veri cihazın uygulamaya özel alanında kalır. Android otomatik uygulama yedeği kapalıdır.

Bu çalışmada `supabase-mobile-personal-plans.sql` canlı Supabase projesine uygulandı. Yeni kişisel plan tablosunda RLS, yalnız aktif kayıt sahibine SELECT/INSERT/UPDATE ve silme işaretleri vardır; anonim erişim ve istemciden fiziksel DELETE yoktur. Öğretmen tablosunun mevcut RLS kuralları korunarak iki tablo Realtime yayınına alındı. Hiçbir mevcut öğrenci/puan/ajanda kaydı silinmedi.

Canlı anonim API doğrulaması: öğretmen tablosu HTTP 200 ve sıfır satır; kişisel plan tablosu HTTP 401 / `42501`. Katalog kontrolünde iki tabloda RLS açık ve Realtime etkin görüldü. Realtime yanında ön plana dönüş ve 20 saniyelik güvence yenilemesi bulunur. Öğretmen ajandası değişmemişse yalnız revizyon bilgisi okunur; büyük ajanda tekrar tekrar indirilmez.

Yeni cihazın boş yerel ajandasının dolu bulut kaydının üstüne yazması engellendi. Uygulama içindeki eski web ajandası yazmaları da dar kapsamlı revizyon kontrolünden geçirilir. Web kaynak dosyasındaki aynı koruma bu çalışma kapsamında hazırlanmıştır; web sitesine yeni Netlify yayını yapılmamıştır.

## Hatırlatmalar ve güncelleme

İzin kullanıcı eylemiyle istenir. Saatli planlarda sesli sistem bildirimi hazırlanır. Web ajandasındaki `atTime`, `1h`, `1d`, `1w` seçenekleri ve saat seçilmemiş eski kayıtların 09:00 varsayılanı aynı şekilde yorumlanır. En yakın 40 gelecek hatırlatma hazırlanır; tamamlama/silme/güncelleme ve hesap değişiminde yenilenir/iptal edilir. Bildirime dokunmak yalnız doğru hesabın ilgili gününe gider.

Yerel bildirim cihazda programlandıktan sonra uygulama kapalıyken de gösterilebilir. Ses, Odak/sessiz mod, pil ve üretici kısıtları işletim sistemine bağlıdır. Tam alarm izni veya Rahatsız Etmeyin geçersiz kılma kullanılmaz. Başka cihazda uygulama kapalıyken sonradan yapılan değişikliklerin anında ulaşması için sunucu push sistemi, FCM ve APNs dağıtım kimlikleri hâlâ gereklidir. Bu kimlikler mevcut kaynakta bulunmadığından uzaktan push gönderimi kurulmuş gibi sunulmaz. [Expo bildirim belgeleri](https://docs.expo.dev/versions/latest/sdk/notifications/).

0.6.0 ve sonraki Android sürümleri, aynı GitHub deposundaki daha yeni sürümü günde en fazla bir kez ve Hesabım'dan elle kontrol eder. HTTPS, depo/yayın yolu, açık sürüm metadata'sı ve Android kodu doğrulanır. APK otomatik kurulmaz. Güncelleme kontrolü 0.5.0'a sonradan kendiliğinden eklenemez; kullanıcı bir kez elle 0.6.0 kurmalıdır. Yayın metadata biçimi ve ayrıntılar [bildirim/güncelleme notunda](mobil-0.6-bildirim-ve-guncelleme.md) yer alır. Bu çalışmada GitHub indirme dosyası değiştirilmemiştir.

## Güvenlik doğrulamaları

Native Supabase oturumu SecureStore'da şifreli ve iki atomik yuvada parçalara ayrılarak saklanır. Eski AsyncStorage oturumu doğrulanan taşımadan sonra temizlenir; web önizlemesi web depolamasını kullanır. Gecikmiş profil/oturum yanıtları yanlış hesabı ekrana getiremez. OAuth yönlendirmesi tam uygulama adresi ve PKCE koduyla sınırlandırılmıştır; keyfi token içeren deeplink kabul edilmez.

Native köprü oturumu yalnız doğrulanan birinci taraf üst belgeye aktarır. Harici sayfa/iframe oturumu alamaz. Köprü işlemleri belgeye ait rastgele yetenek değeri, kaynak, dosya türü/boyut sınırlarıyla doğrulanır. Yeni yerel kum belgesi anonim çalışır. [Android WebView köprü güvenliği](https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges).

APK debug edilebilir değildir. Geniş harici depolama, mikrofon, uygulama üstüne çizme ve sessiz APK kurma izinleri yoktur. Test imzası önce teslim edilen 0.5.0 APK ile aynıdır; Android paket kimliği ve verilerinin üzerine güncellenebilir. Bu test anahtarı mağaza yayın anahtarı olarak kullanılmamalıdır. [Android imzalama](https://developer.android.com/studio/publish/app-signing).

Resmi npm denetimi önce glob/minimatch kaynaklı orta seviye derleme aracı uyarıları buldu. Bu iki bağımlılık `glob 14.0.2` / `minimatch 11.0.1` düzeltmelerine sabitlendi; typecheck, Expo SDK yerel bağımlılık haritası, web export ve Android derlemesiyle uyumluluğu kontrol edildi. Son üretim bağımlılığı denetimi: **0 kritik / 0 yüksek / 0 orta / 0 düşük**. Bu, uygulama veya sunucunun eksiksiz penetrasyon testinden geçtiği anlamına gelmez.

## Teslim ve sınırlar

- 79 mobil davranış/güvenlik testi geçti; 722 web regresyon testi geçti.
- TypeScript kontrolü, kaynak/köprü güncellik kontrolleri, web üretim export'u ve iOS JavaScript/Hermes export'u geçti. iOS export bir IPA veya iPhone testi değildir.
- Android release derlemesi, resmi imza doğrulaması, önceki APK ile sertifika eşliği, ARM64 kitaplıkları ve gömülü yeni kaynakların Hermes paketinde bulunması doğrulandı.
- Minimum Android API 24 (Android 7), hedef API 36, derleme API 37. Dosya 40.542.013 bayt.
- SHA-256: `a578f0faad0e12ccc1dff1df3cc525bc541cae32629ee2f87def78e85108fce5`.
- Gerçek Android telefonunda öğretmen hesabı, kilit ekranı/ses, yeniden başlatma ve tam cihazlar arası akış testi henüz yapılmadı. Tarayıcı önizlemesi veya birim testi bunun yerine geçmez.
- IPA/TestFlight/App Store/Google Play yüklemesi yapılmadı. Mağazalar için kalıcı üretim imzası, geliştirici hesapları, push kimlikleri, gizlilik/veri beyanları ve uygulama içinden hesap silme akışının tamamlanması gerekir. Apple'ın hesap oluşturulan uygulamalarda hesap silme gerekliliği resmîdir: [Apple hesap silme desteği](https://developer.apple.com/support/offering-account-deletion-in-your-app/).

Yerel önizleme: `http://127.0.0.1:8884/today`. Yalnız bu bilgisayarda önizleme sunucusu açıkken çalışır; genel indirme/yayın bağlantısı değildir.
