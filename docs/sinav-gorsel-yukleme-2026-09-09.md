# Sınav görselleri yükleme incelemesi — 9 Eylül 2026

## Canlı sistemde doğrulanan durum

- Paylaşılan ekran: **6. Sınıf Sayısal 1. Tema Tekrar Denemesi-1**.
- Sınav kimliği: `VL81jbGh0KtLOheVhirO`.
- Firestore sınav ve 30 soru kaydını başarıyla döndürdü.
- Görseller Supabase `sinav-sorulari` deposundan sunuluyor.
- İlk kontrolde ekranda görünmeyen 4. ve 15. sorular HTTP **544** döndürdü:
  `{"statusCode":"544","error":"DatabaseTimeout","message":"The connection to the database timed out","code":"DatabaseTimeout"}`.
- 4. soru sonraki denemede HTTP 200 ve geçerli PNG yanıtı verdi.
- 30 sorunun tamamının iki eşzamanlı istekle kontrol edildiği sonraki turda **24 başarılı**, **6 başarısız** yanıt alındı. Başarısız sorular: **15, 17, 18, 26, 27, 28**; hepsi HTTP 544 döndürdü.
- 15. sorunun ilave üç denemesi de başarılı olmadı: iki HTTP 544, bir 12 saniyelik istek zaman aşımı.
- Üç farklı yayımlanmış sınavdan kontrol edilen dokuz örnek görsel HTTP 200 döndürdü. Yayımlanan 137 sınavın tüm görselleri taranmadı.

Bu sonuçlar dosyaların silindiği iddiasını desteklemiyor. Doğrulanan sorun, Storage servisinin veritabanına erişirken zaman aşımına uğraması. Bağlantı havuzu doluluğu ve veritabanı yükü proje metrikleriyle ayrıca incelenmeli.

[Supabase Storage hata belgesi](https://supabase.com/docs/guides/storage/debugging/error-codes#544-database_timeout), 544 hatasını Storage isteklerine yetecek veritabanı bağlantısı bulunmamasıyla ilişkilendiriyor. Kesin proje sebebi için performans ve bağlantı ölçümleri gerekli; kapasite veya ayar değişikliği yapılmadı.

## Yerel kodda yapılan düzeltme

- Görsel isteği için 12 saniyelik sınır ve toplam üç otomatik deneme.
- Hata sürerse soru üzerinde açıklama ve **Yeniden dene** düğmesi.
- Yeniden denemede mevcut cevaplar ve çizimler korunuyor.
- Soru değişince eski istekler ve bekleyen tekrarlar iptal ediliyor.
- Ön yükleme, mevcut soru açıldıktan sonra en fazla sonraki iki soru için sırayla yapılıyor.
- Başarısız ön yüklemeler başarılı önbellek kaydı sayılmıyor; başarıyla yüklenen en fazla altı görsel bellekte tutuluyor.
- İmzalı veya harici bağlantılar değiştirilmeden, yalnızca public Supabase bağlantılarında tekrar denemeye özel önbellek yenileme parametresi kullanılıyor.

## Doğrulama ve kalan iş

31 otomatik test geçti. Yerel tarayıcı testinde 544 sonrasında otomatik kurtarma, sürekli hata ekranı, manuel tekrar ve cevap/çizimlerin korunması doğrulandı.

**Kod düzeltmeleri 10 Eylül 2026 tarihinde canlıya yayınlandı. Sunucu yeniden başlatıldı; açılış sonrası proje sağlığı ve görsel istekleri başarılı. Kalıcı arıza nedeni henüz kesinleşmedi.**

## Oturum açıldıktan sonraki proje incelemesi

9 Eylül akşamı Safari'deki açık Supabase oturumundan doğru proje incelendi:

- Proje durumu **Unhealthy**, Advisor uyarısı **Database not usable**. Bağlantı denemesi TCP katmanında `CONNECT_TIMEOUT` ile başarısız.
- Free/Nano, `eu-west-1` (İrlanda); özet panelinde CPU **%93**. Ayrıntılı kaynak ve bağlantı grafikleri yüklenemediğinden bellek, disk veya bağlantı sayısı için kesin sonuç çıkarılamıyor.
- Son saat özetinde 173 isteğin yalnızca **%24,9**'u başarılı; Auth ve Postgres hataları da mevcut. Sorun yalnızca sınav sayfasına özgü değil.
- Postgres günlüklerinde çok sayıda `57014: canceling statement due to statement timeout` var. Örnek bir kayıt, `homepage_slides` okuma sorgusunun PARSE aşamasında zaman aşımına uğradığını gösteriyor.
- `pg_stat_activity` üzerinde yalnızca bağlantıların sayı ve bekleme durumlarını okumayı amaçlayan tanılama sorgusu bile `Connection terminated due to connection timeout` ile başarısız oldu. Veri veya şema değişikliği yapılmadı.
- Yedi görselin sıralı tekrar kontrolünde 4. soru HTTP 200 döndürdü; 15, 26, 27, 28 HTTP **429**, 17 ve 18 HTTP **544** döndürdü. Ek yük oluşturmamak için toplu tarama tekrarlanmadı.

[Supabase'in HTTP hata giderme belgesi](https://supabase.com/docs/guides/troubleshooting/http-api-issues), proje yeniden başlatmasının takılan iş yüklerini sonlandırarak geçici iyileşme sağlayabileceğini belirtiyor; bu işlem kalıcı kapasite/sorgu düzeltmesinin yerine geçmiyor. Kullanıcı yeniden başlatmayı açıkça onayladı. **9 Eylül 2026 yaklaşık 23:08 (Türkiye saati)** proje için **Restart** işlemi uygulandı; panel **Restarting** durumuna geçti. Ücretli kapasite değişikliği veya veri silme işlemi yapılmadı.

## Yeniden başlatma sonrası doğrulama

- Postgres başlangıcı SQL ile **23:13:26 Türkiye saati** olarak doğrulandı. Yaklaşık 23:17'de Supabase durum etiketi **Healthy** oldu.
- Önceden sürekli hata veren 15. soru, önbellek yenileme parametresiyle doğrudan kontrolde HTTP 200 ve geçerli PNG döndürdü.
- Paylaşılan sınavın **30/30** sorusu, diğer üç sınavdan seçilen **9/9** soru HTTP 200 ve geçerli PNG/JPEG döndürdü. Toplam **39/39 başarılı**, istekler sırayla yapıldı. Önceden hata veren 15, 17, 18, 26, 27 ve 28. sorular da bu kontrole dahil.
- Önceden zaman aşımına uğrayan `pg_stat_activity` tanılama sorgusu artık sonuç döndürüyor. Son SQL ölçümünde **8 istemci bağlantısı / 60 maksimum**, diğer aktif sorgu **0**, kilit bekleyen bağlantı **0**; veritabanı boyutu **40 MB**.
- Genel panelin daha sonraki anlık ölçümü RAM **%54**, bağlantılar **9/60**. CPU ölçümü henüz yeterli veri göstermediğinden paneldeki sıfır değeri kalıcı yük ölçümü olarak yorumlanmadı.
- 23:15 bellek örneğinde 406,52 MB fiziksel bellek, 209,8 MB kullanılan, 192,44 MB önbellek/buffer, 4,28 MB boş ve 286,15 MB swap görüldü. Bellek taahhüdü 1,32 GB / 1,2 GB sınır. Bu açılıştan kısa süre sonraki tek örnek, kalıcı arıza nedenini tek başına kanıtlamıyor; kaynak baskısı için değerlendirilmesi gereken bir işaret.

[Supabase bellek ölçüm belgesine](https://supabase.com/docs/guides/observability/reports#memory-usage) göre sürekli swap kullanımı bellek baskısı ve performans kaybıyla ilişkilidir. Yeniden başlatmayla mevcut erişim arızası giderildi; tekrarlamayı engelleyen kalıcı kapasite/sorgu değişikliği henüz yapılmadı. Tüm 137 sınavın her görselinin çalıştığı iddia edilmiyor. Ekran ve yükleme yönetimi düzeltmeleri aşağıdaki yayınla canlıya alındı.

[İlgili Supabase projesi](https://supabase.com/dashboard/project/mwxcvlyrkptxrwgkmqum)


## Canlı yayın — 10 Eylül 2026

- Commit: `5b20ffb`, mevcut `main` dalına tek gönderim.
- Netlify projesi: `kemalogretmenimson`; dağıtım: `6aa2687fdd4bbb0008d9e869`, panel durumu **Published**.
- Yayın öncesi Free plan toplam kullanılabilir kredi: **279** (140,4 dönem kredisi + 138,6 süresiz kredi). Tek üretim yayını oluşturuldu; kredi bazlı planda üretim yayını bedeli 15 kredi. Yeni ücretli plan veya ek kredi satın alınmadı.
- 31 otomatik test geçti. Canlı alan adındaki `sinav_sitesi/sinav.html` ve `sinav_sitesi/js/question-image-loader.js` HTTP 200 döndürdü; yanıtların baytları yerel test edilen dosyalarla birebir eşleşti.
- Kullanıcının ayrı geometrik cisimler dosyasındaki çalışma bu yayına dahil edilmedi.

[Netlify yayın kaydı](https://app.netlify.com/projects/kemalogretmenimson/deploys/6aa2687fdd4bbb0008d9e869)
