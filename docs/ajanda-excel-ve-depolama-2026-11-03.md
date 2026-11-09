# Haftalık sınav aktarımı ve ajanda depolaması — 3 Kasım 2026

## Kullanılacak yol

Yayınevinden Excel alınabiliyorsa onu kullanın. Yalnız görsel geliyorsa Excel'e çevirip ajandada kontrol edin. İncelenen ilk dönüştürülmüş dosya ayrıca elle düzenlenmeden okunabiliyor. Düzeltilmiş dosya da destekleniyor. Doğrudan JPEG/PNG okuma eklenmedi; görseldeki her farklı tablo düzenini hatasız tanıdığı iddia edilmiyor.

İki örnekte de 24 öğrenci ve üç ders bulundu. Toplam 216 D/Y/B değeri iki dosyada birebir aynı. İlk dosyadaki okul numaraları da öğrenci hücrelerinden ayrıldı; düzeltilmiş dosyada okul numarası yok ve ad-soyad ile eşleşme yapılıyor.

1. Sınıfı seçin, sınav adını ve tarihini girin.
2. Toplam puanı belirtin (ör. 100 veya 500). Derslere ayrı ağırlık vermiyorsanız ders puanlarını boş bırakın.
3. Excel'i seçip **Excel'i Kontrol Et** düğmesine basın. Birden fazla sonuç sayfası varsa sayfa seçin.
4. Adları ve derslerin doğru/yanlış/boş sayılarını kaynak listeyle karşılaştırın. Yeni öğrencilerin eklenip eklenmeyeceğini seçin.
5. **Onayla ve Ekle** ile kaydedin. Hata varsa Vazgeç ile dönüp Excel'i düzeltin.

Sınıf listesini içeren boş sınav şablonu da indirilebilir. Yayınevinin kendi puanı/sıralaması aktarılmaz; sistem seçilen puanlama ve mevcut katılımcılarla hesaplar. Bu nedenle yayınevine özgü bir LGS puan formülüyle aynı puan vaat edilmez.

## Okuyucudaki düzeltmeler

- D/Y/B sonrasında yüzde sütunu zorunluluğu kaldırıldı; başlıksız tek ad-soyad sütunu desteklendi.
- Soru sayılı yayınevi tablolarındaki net/doğru/yanlış ayrılıyor; boş sayısı soru sayısından hesaplanıyor. Genel LGS toplamı ayrı bir ders sayılmıyor; ders toplamlarıyla karşılaştırılıyor.
- Hatalı OCR, eksik sayısal hücre, negatif/kesirli sayı ve çelişen eşleşmeler kaydedilmiyor. Yinelenen öğrenciler durduruluyor.
- Sayfa seçimi, tüm öğrencileri içeren sonuç önizlemesi ve telefonlarda alt alta ders sonuçları eklendi.
- Aynı sınav tekrar yüklenince ders adlarının büyük/küçük harf farkı ve kaynak dosya adı tekrarları veriyi çoğaltmıyor.
- Önizleme veriyi kaydetmez. Başarısız yerel kayıt geri alınır; eski bir dosya okuması veya değişen sınıf/öğrenci listesi yeni kontrol gerektirir.

## Canlı veritabanı denetimi

Supabase projesi: `mwxcvlyrkptxrwgkmqum`. Ölçümler öğrenci adları, notları, sağlık/veli bilgileri veya tam belgeler dışa aktarılmadan yapıldı.

| Ölçüm | Denetim sonucu |
| --- | ---: |
| Tüm veritabanı | 58.674.323 bayt (yaklaşık 56 MiB) |
| Öğretmen ajandası belgesi | 2 |
| Sıkıştırma öncesi JSON metni | 1.997.388 bayt |
| Saklanan JSONB değerleri | 1.646.958 bayt |
| Ajanda tablosu, TOAST ve indeks toplamı | 2.990.080 bayt |
| Sınıfı bulunmayan öğrenci | 0 |
| Öğrencisi bulunmayan sınav sonucu | 0 |
| Öğrencisi bulunmayan bağlı sınav katılımcısı | 0 |

Her iki JSONB sütununun TOAST sıkıştırma politikası zaten `EXTENDED` idi. Global autovacuum açık ve TOAST için son otomatik bakım gözlemlendi. Ana tabloda ilk ölçümde 29 eski MVCC sürümü, TOAST'ta 0 eski parça vardı. Bunlar uygulamada görünen 29 silinmemiş öğrenci/sınav anlamına gelmez. RLS açık; okuma/yazma politikaları kullanıcı sahipliğiyle sınırlı. Ajanda ve ders planı bu tek güncel öğretmen belgesinde tutuluyor; her kayıtta yeni bir arşiv satırı eklenmiyor. Kaynak XLSX veya sınav görseli buluta yüklenmiyor; sonuç verisi ve dosya adı saklanıyor. Fotoğraf yüklemeleri önceden mevcut olan küçültme mekanizmasını kullanıyor.

`supabase-ajanda-depolama-20261103.sql`, kullanıcı açıkça onayladıktan sonra canlıya uygulandı. İlk girişim otomatik onay denetiminde canlı şema değişikliği için açık izin olmadığı gerekçesiyle durduruldu; onaydan sonraki uygulama başarılı oldu.

- JSONB biçimi ve `EXTENDED` politikası korundu; web/mobil/panel uyumluluğu sürüyor.
- Ana tablo bakım eşiği 10, TOAST eşiği 50 eski sürüm ve ölçek katsayıları 0,1 olarak ayarlandı.
- `storage_bytes` sonraki yazımlarda sunucuda hesaplanıyor; 6 MiB üzerindeki JSON yazımları reddediliyor. Bu alan sıkıştırılmış disk boyutu değildir. JSONB'nin metin gösterimindeki boşluklar nedeniyle sunucu ölçümü istemcinin kompakt JSON ölçümünden biraz büyük olabilir.
- Canlı katalog sorgusunda tetikleyicinin etkinliği, boyut kontrolü, RLS ve ana/TOAST bakım ayarları doğrulandı.
- Mevcut öğretmen belgeleri topluca yeniden yazılmadı; öğrenci/sınav kaydı silinmedi. Otomatik bakımın bütün eski sürümleri temizlediğine ilişkin sonradan tamamlanmış bir ölçüm iddia edilmiyor.

[PostgreSQL TOAST](https://www.postgresql.org/docs/current/storage-toast.html) büyük değerleri veritabanında sıkıştırır. [VACUUM](https://www.postgresql.org/docs/current/routine-vacuuming.html) eski sürümlerin alanını yeniden kullanılabilir hale getirir; normal bakımın disk dosyasını hemen küçültmesi beklenmez. Sağlık sorguları `supabase-ajanda-depolama-denetim.sql` dosyasında.

## Silme ve eşitleme düzeltmeleri

Webde sınav silme güncel belgeden sınavı kaldırıyor. Öğrenci silme sonuç ve katılımcı bağlantılarını kaldırıyor. Sınıf silme artık başka sınıfların sınavlarında o öğrenciler için kalan bağlantıları da temizliyor. Mobil öğrenci/sınıf silme işlemlerine aynı sonuç/katılımcı temizliği eklendi. Silinen öğrencinin adı boş sonuç uyarılarından, kimliği doğum günü hatırlatma günlüklerinden de çıkarılıyor. Ders programı ve takvim kaydı silme işlemleri ilgili diziden kaydı kaldırıp belgeyi güncelliyor.

Buluta gönderim sürerken yapılan değişiklik/silme için ikinci kayıt sıralanıyor; ilk isteğin eski belgesi sunucuda son kayıt olarak kalmıyor. Eşzamanlı başka cihaz değişikliklerini koruyan sürüm koşulu devam ediyor. İnternet yoksa veya bulut çakışması varsa silme ancak başarılı eşitlemeden sonra canlı belgeye yansır. Öğretmen paneline daha önce isteyerek aktarılmış ayrı öğrenci kayıtları bu denetimde silinmedi. Yerel güvenlik yedekleri ve kullanıcı tarafından indirilmiş yedekler, canlı belgeden ayrı kurtarma kopyalarıdır.

## Doğrulama ve yayın durumu

- İki gerçek XLSX dosyası: 24 öğrenci, üç ders, 216 eşit D/Y/B değeri.
- Chromium ve WebKit: her iki dosya 1440/390 pikselde önizleme, iptal, onay, yeniden yükleme, toplam puan ve şablon indirme testlerini geçti. Testte üretim ağına istekler engellendi. Telefon görünümü ekran görüntüsüyle incelendi.
- 766 web ve 124 mobil test geçti. Mobil TypeScript ve ajanda paketi kontrolleri başarılı. Sekiz tarayıcı senaryosu ve PostgreSQL testi geçti. Web yayın klasörü 500 dosyayla başarıyla üretildi; bu adım yayınlama işlemi değildir.
- PostgreSQL/PGlite: migration iki kez uygulandı; gerçek TOAST sıkıştırması, sunucu boyut hesabı, 6 MiB reddi, RLS, belge güncellemesi ve silme/cascade davranışı test edildi. Sentetik örnekte 50.661 metin baytı, 1.712 saklanan değer baytına indi; bu oran gerçek fotoğraflı belgelere genellenmez.

**Canlı depolama SQL düzeltmesi uygulanmıştır. Excel okuyucusu ve mobil kaynak değişiklikleri çalışma klasöründedir; web yayını veya yeni APK/mağaza sürümü bu çalışmada yapılmamıştır.** Yerel web önizlemesi bu klasörün güncel kodunu kullanır.
