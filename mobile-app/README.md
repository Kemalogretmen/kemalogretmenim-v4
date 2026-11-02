# Kemal Öğretmenim Mobile · 0.6.0

Expo 58 / React Native 0.88.1 ile yerel eğitim uygulaması çekirdeği. Telefonlarda alt menü, geniş tablet/pencerelerde yan menü kullanır. Dikey/yatay pencereler desteklenir. Web sitesinin mevcut kaynağı ve ayrı `aquarium-app` uygulaması korunur.

## Neler var?

- Yerel Bugün, Keşfet, Ajanda ve Hesabım ekranları.
- Türkçe içerik arama, kategori filtreleme, kaydetme ve son açılanlar.
- 32 oyun için yerel katalog; güncel/dinamik içerikler için uygulama içi canlı katalog.
- Günlük native öğretmen ajandası; sınıf/öğrenci/ders ekleme, öğrenme çıktıları ve bulut eşitleme.
- Kayıtlı öğrenci/veli kişisel planları; çevrimdışı kuyruk ve izinli sistem hatırlatmaları.
- Gerçek siteden beslenen native vitrin ve canlı akış; uygulamaya gömülü çevrimdışı yeni kum havuzu.
- Açık/koyu/cihaz teması, ekranın güvenli alanlarına uygun yerleşim.
- Mevcut yerel giriş/kayıt, ödev, mesaj, profil ve rol panelleri.
- Ajanda, akıllı tahta, okuma, sınav ve oyun motorları için uygulama içi çalışma ekranları. Odak/yatay görünüm, geri gezinme, hata/yeniden deneme, cihaz paylaşımı.

Motorlar WebView içinde çalışır; bu alanların sıfırdan yerel dilde yeniden yazıldığı veya her şeyin çevrimdışı çalıştığı iddia edilmez. Yerel gezinme ve ana ekranlar WebView değildir. Web önizlemesinde çalışma ekranı yalnız iframe önizlemesidir; yerel oturum ve dosya köprüsü burada uygulanmaz.

## Kurulum / kontroller

Node 22.13+ veya 24.3+ gerekir. Proje kilit dosyasını kullanın.

```bash
cd mobile-app
npm ci
npm run typecheck
npm test
npx expo install --check
npx expo export --platform web
npx expo run:android
```

SDK 58 için yeni bir geliştirme derlemesi gerekir; eski Expo Go / eski APK bu yerel paket güncellemesini içermez. iOS geliştirme derlemesi tam Xcode ve iOS SDK gerektirir.

## Dağıtım

```bash
eas build --profile preview --platform android
eas build --profile production --platform all
```

Mevcut EAS proje kimliği ve paket kimliği korundu. Mağaza/TestFlight yayını ayrı bir dağıtım adımıdır; kaynak güncellemesi mağazadaki uygulamayı kendiliğinden güncellemez. Android test APK'sı ile mağaza güncellemesi imzasını karıştırmayın; mevcut uygulamanın güncellenmesi için aynı yayın anahtarı gerekir.

Supabase Auth redirect allowlist içinde tam olarak `kemalogretmenim://auth/callback` bulunmalıdır. Google girişi mevcut yönlendirmeyi kullanır. Auth sağlayıcı ayarları değiştirilmedi. `supabase-mobile-personal-plans.sql` uygulanarak özel kişisel plan tablosu ve ajanda Realtime yayını açıldı.

## Veri davranışı

Kayıtlı öğretmenin planları web ajandasıyla aynı bulut kaydına; öğrenci/veli planları sahibine özel kişisel plan tablosuna eşitlenir. Misafir planları, kaydedilen kısayollar ve son açılanlar cihazda kalır. Çevrimdışı değişiklikler önce dayanıklı hesaba özel kuyruğa kaydedilir. Oturum native SecureStore ile korunur. Ayrıntılı karne/rapor ve içe aktarma işlemleri mevcut motoru kullanır.

Köprü yalnız doğrulanan site kaynağının ana belgesinde oturum kullanır. Harici sayfalar yerel oturumu almaz. Dosya dışa aktarımı izin verilen türler ve 15 MB veri sınırıyla cihaz paylaşım menüsüne bağlanır.

Araştırma, tasarım gerekçeleri, kapsam ve cihaz doğrulama sınırları: [mobil platform raporu](../docs/mobil-egitim-platformu-2026-11-01.md).

WebView köprüsünü düzenlerken `src/platform/activity-bridge.ts` dosyasını değiştirin ve `npm run bridge:generate` çalıştırın. `npm test` ve EAS derleme öncesi kontrolü, statik betiğin güncelliğini denetler. Bu yöntem Hermes bytecode ile uyumludur.

## Bu bilgisayarda arayüz önizlemesi

`npm run preview` mevcut web önizlemesini `http://127.0.0.1:8884/today` adresinde sunar. Sunucu açık kalmalıdır. Önizleme dosyaları yoksa önce `npm run build:web` çalıştırın. Bu, Android APK’sının Mac’te kurulması değildir; arayüzü tarayıcıda incelemek içindir.

## 0.6.0 doğrulama ve yeni kum kaynakları

[Güncel uygulama raporu](../docs/mobil-0.6.0-revizyon-2026-11-02.md), [bildirim ve sürüm dağıtımı](../docs/mobil-0.6-bildirim-ve-guncelleme.md).

Kum kaynağı değiştiğinde `npm run whiteboard:generate` çalıştırın. `whiteboard:check` test/EAS öncesinde kaynak varlıkları denetler. Bu proje tam web deposunun `mobile-app` alt klasörüdür; üretici betiklerin üst dizindeki doğrulanan kaynaklara erişmesi gerekir.

GitHub APK kontrolü yalnız 0.6.0 ve sonrası için vardır. Eski 0.5.0 bir defa elle güncellenmelidir. EAS `appVersionSource: remote` korunduğundan bulut derlemesi öncesinde uzak Android sürüm kodunun yerel 6 tabanından düşük olmadığını `eas build:version:get/set` ile kontrol edin. Mağaza kanalı/üretim imzası ayrı hazırlanmalıdır.
