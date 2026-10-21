# Supabase denetimi ve düzeltmeler — 21 Ekim 2026

Siteyi çalıştıran `mwxcvlyrkptxrwgkmqum` projesinin veritabanı, hata günlükleri, kaynak grafikleri, indeksleri, erişim kuralları ve Storage yapısı incelendi. Öğrenci belgeleri ve puan geçmişleri değiştirilmedi. Bu rapor denetim anındaki bulguları kapsar; uzun süreli yük testi veya tüm uygulamaya yönelik bir sızma testi değildir.

## Asıl hata: uygulama çakışmasının sunucuda yeniden denenmesi

`save_aquarium_account(jsonb,bigint,jsonb,uuid)` fonksiyonu eski sürümle gelen bir kaydı reddederken `40001` kodunu kullanıyordu. Bu kod PostgreSQL'de gerçek bir serialization failure anlamındadır. PostgREST'in belgelenmiş davranışı nedeniyle uygulamaya ait bu kalıcı sürüm uyuşmazlığı sunucuda tekrar tekrar denenebiliyor.

Canlı günlükteki mesaj: **Aquarium revision conflict**. Son 24 saatlik sorguda aynı mesaj ve kod için **4.812.654 kayıt** bulundu. Bu sayı puan veya kayıp öğrenci kaydı sayısı değildir; tekrar eden hata günlüğü sayısıdır. Günlüklerde görülen aralık 20 Ekim 13:44 UTC – 21 Ekim 12:11 UTC idi. Tek bir hatalı istek çok sayıda satır üretebildiği için bu kadar kullanıcının ayrı ayrı hata yaptığı sonucu çıkarılamaz.

Bu, uygulamanın seçtiği hata kodu ile API katmanının yeniden deneme davranışının birleşmesinden kaynaklanan somut bir sorundur. Sabahki sunucunun yanıt verememesiyle tutarlıdır. Kernel OOM/çökme kaydı bulunmadığından sabahki kesintinin bütün ayrıntıları kesinleşmiş sayılmamalıdır.

Uygulanan düzeltme:

- Canlı fonksiyonda sürüm uyuşmazlığı artık **PT409 / HTTP 409** döndürüyor; sunucudaki serialization retry döngüsünü tetiklemiyor.
- Kayıt sahibi/öğretmen kontrolü, advisory lock ve sürüm karşılaştırması korundu. Eski cihazın yeni puanları ezmesine izin verilmedi.
- Tarayıcı eşitleme kodu PT409'u tanıyıp güncel kaydı okuyarak mevcut güvenli birleştirmeyi yapıyor. Denemeler üçle sınırlı. Eski 40001 yanıtını da geçiş uyumluluğu için tanıyor.
- SQL kurulum kaynağı da düzeltildi; ileride tekrar kurulum eski kodu geri getirmeyecek.
- Kontrol anında takılmış aktif kayıt çağrısı bulunmadığından ek sunucu yeniden başlatması veya bağlantı sonlandırması yapılmadı.

Kaynak: [Supabase: SQLSTATE 40001 ve sonsuz RPC yeniden denemeleri](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b), [PostgREST hata kodları](https://docs.postgrest.org/en/v14/references/errors.html).

## Diğer düzeltilen noktalar

| Bulgu | Yapılan işlem | Doğrulama |
| --- | --- | --- |
| Kimlik/öğretmen kontrolünün satır başına yeniden değerlendirilmesi | 8 tablodaki 19 politikada satırdan bağımsız `auth.uid()` ve öğretmen kontrolü scalar SELECT ile sorgu başına hesaplanacak hale getirildi | Roller, SELECT/INSERT/UPDATE/DELETE kapsamı ve görünür kayıt kümeleri korunuyor |
| İki çift aynı UNIQUE indeks | Yalnız bağımsız fazlalıklar `idx_content_reactions_unique` ve `idx_user_content_progress_unique` kaldırıldı | İki UNIQUE kısıtı ve onların indeksleri duruyor; upsert ve tekrar kayıt engeli çalışıyor |
| Sağlık raporunda `SECURITY DEFINER` içinde `current_user` kontrolü | İstek rolü / güvenilir bakım oturumu veya `system_health` yönetici yetkisi doğrulanıyor; PUBLIC ve anon EXECUTE kaldırıldı | Anonim ve normal kullanıcı reddediliyor; yetkili yönetici ve bakım erişimi çalışıyor |
| Sağlık raporunun yalnız indeks adına bakması | İlgili üç sütunda geçerli, benzersiz indeksin gerçekten varlığı kontrol ediliyor | Gereksiz indeks kaldırılınca yanlış “eksik indeks” uyarısı oluşmuyor |

[RLS optimizasyonu için resmi açıklama](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv). Yalnız satırdan bağımsız kontroller önbelleğe alındı; satıra göre değişen koşullar korunuyor. Gereksiz indeks kaldırılmadan önce sütunlar, sıralama, opclass, collation, NULL semantiği ve kısıt bağımlılıkları karşılaştırıldı. İşlemlere kilit ve çalışma süresi sınırı eklendi.

## Kaynak ve güvenlik kontrolü

| Kontrol | Bulgular |
| --- | --- |
| PostgreSQL | 17.6 |
| Veritabanı boyutu | İlk ölçüm yaklaşık 51 MiB; disk doluluğu belirtisi yok |
| Bağlantı sınırı | 60; ilk ölçüm 21, son ayrıntılı ölçüm 19 bağlantı |
| Kilit/deadlock | İnceleme anlarında engellenmiş bağlantı ve deadlock yok |
| Uygulama tabloları | 42 public tablo; RLS kapalı tablo yok |
| SECURITY DEFINER | İncelenen public fonksiyonlarda sabit search_path mevcut |
| Realtime | İki aktif slot; yaklaşık 16 MiB tutulan WAL, terk edilmiş/inaktif birikim görülmedi |
| Özel dosyalar | `teacher-verifications` ve `e-kitaplar` bucket'ları private |
| Storage dosyaları | Metadata toplamı 809,49 MiB; dosya silinmedi |
| Doküman bağlantıları | Sağlık raporuna göre dosyası eksik doküman kaydı yok |

Bellek grafiğinde yoğun swap kullanımı görüldü. Bu bellek baskısını destekler; tek başına bellek sızıntısını veya OOM olayını kanıtlamaz. Son 24 saatlik CPU grafiği ile önceki sorgu süreleri de kaynak baskısıyla tutarlıydı. PostgreSQL sorgu istatistikleri sabahki yeniden başlatma sonrasını kapsadığından eski ve yeni yük arasında yanıltıcı hız artışı yüzdesi hesaplanmadı. [Supabase bellek inceleme rehberi](https://supabase.com/docs/guides/troubleshooting/exhaust-ram).

Dosya depolaması, ücretsiz planda sunulan 1 GB sınıra yaklaşırken ayrıca izlenmeli. Bu boyut veritabanı boyutundan farklıdır. Sağlık raporundaki `sinav-sorulari` uyarısı o bucket'ın 649,50 MiB boyutunun rapordaki 450 MiB eşiğini geçmesindendir; tek başına hizmet kotasının aşıldığı anlamına gelmez. [Resmi plan kapsamı](https://supabase.com/pricing). Ücretli plan veya kaynak yükseltmesi yapılmadı.

Anonim EXECUTE görülen diğer bakım/yönetici fonksiyonlarının gövdeleri de okundu: doküman temizleme/listeleme ve e-kitap yönetiminde iç yetki kontrolleri bulunuyor. Bu fonksiyonlar deneme amacıyla çağrılmadı. Farklı amaçlı üst üste binen RLS politikaları yalnız sayıları fazla diye kaldırılmadı.

## Testler ve canlı doğrulama

- `npm test`: **370/370 geçti**.
- İzole PGlite testinde 19 politika için **72 okuma kapsamı ve 88 yazma denemesi** önce/sonra aynı sonucu verdi. Öğretmen, farklı öğretmen, pasif öğretmen, öğrenci, aktif/bekleyen veli ve anonim senaryoları kapsandı.
- Benzersizlik kısıtı, upsert, admin sağlık raporu, InitPlan kullanımı ve performans geri alma/yeniden uygulama kontrolü geçti.
- Akvaryum SQL testinde eski sürüm **PT409 ile reddedildi** ve kayıt sürümü değişmedi. Anlık sinyaller, sahiplik, anonim/pasif erişim, ortak rastgele seçim ve idempotent tekrar testleri geçti.
- Canlı katalogda **PT409 mevcut, 40001 yok; 19 politika optimize; iki fazladan indeks yok; iki UNIQUE kısıtı var; yönetici raporu anonim erişime kapalı; RLS kapalı tablo yok** olarak doğrulandı.
- 16:12 Türkiye saati uç kontrollerinde Auth health ve REST genel ayarlar endpoint'i HTTP 200 verdi. Gerçek kullanıcı parolasıyla giriş ve gerçek öğrenciye puan verme bu denetimde yapılmadı.
- Son günlük sorgusunda 12:56:56 UTC sonrasında bu hata için 0 kayıt döndü. Günlüklerin son olay zamanı daha eski olduğu için bu ölçüm uzun süreli sorunsuzluk veya gecikmesiz log akışı kanıtı olarak kullanılmamalıdır.

Ham sorgular, katalog çıktıları ve ekran kanıtları yerelde `tmp/supabase-audit-20261021/` altında tutuldu; kimlik doğrulama token'ları veya öğrenci puan belgeleri dışa aktarılmadı.

## Kurulum ve geri alma

Canlıya uygulanan dosyalar:

1. `supabase-akvaryum-cakisma-duzeltme.sql` — fonksiyonun hata kodu düzeltmesi; tekrar uygulanabilir.
2. `supabase-performans-guvenlik-20261021.sql` — incelenen politika tanımlarını doğrulayarak bir kez uygulanır. Beklenmeyen tanım farklılığında işlem iptal olur.

`supabase-performans-20261021-geri-al.sql`, gerekirse 19 politika optimizasyonunu ve iki indeks değişikliğini geri almak içindir. **PT409 düzeltmesini ve yönetici raporunun güvenli erişimini geri almaz.** Eski 40001 davranışına dönülmemelidir.

Android uygulaması akvaryumun sunulan web sayfasını yüklediğinden bu JS düzeltmesi için APK ikilisinin değişmesi gerekmiyor. Açık eski ekranı bir kez yenilemek veya uygulamayı kapatıp açmak yeni JS sürümünü yükler. Eşitlenmemiş yerel puanlar varken uygulama verisi/önbelleği silinmemelidir.
