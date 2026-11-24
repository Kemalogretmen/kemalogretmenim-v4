# Akıllı Tahta · Büyük PDF desteği

24 Kasım 2026

- PDF açma sınırı 50 MB'den **512 MB**'ye, sayfa sınırı 300'den **2.000**'e çıkarıldı. En fazla 8 sekme ve kaynak dosyalar için toplam 2 GB sınırı bulunur.
- Kaynak PDF bir File/Blob referansı olarak tutulur. PDF.js'in yerel aralık aktarımıyla 256 KB'lık parçalar istenir; otomatik tüm-dosya ön getirmesi kapalıdır. Aynı anda en fazla iki yerel aralık okunur. Sekme değişirken önce eski okuyucu kapatılır.
- Büyük kitaplar tarayıcının kalıcı deposuna kopyalanmaz. Otomatik kayıt bütçesi toplam **24 MB** olarak korunur. Daha büyük kitaplar için kullanıcı notlarını yerel `.tahta` dosyasına kaydetmelidir; bu dosya kaynak PDF ve notları birlikte içerir.
- Düzenlenebilir arşiv kaydetme/açma 1 MB'lık parçalarla çalışır; tüm arşiv tek bir büyük ArrayBuffer olarak ana iş parçacığında açılmaz. Önceki sıkıştırılmış arşivler desteklenir. Beklenmeyen arşiv girdileri ve büyüyen not sınırları denetlenir.
- Tam PDF dışa aktarımı, kaynak File/Blob'u arka plan işçisine doğrudan verir. Ana çizim iş parçacığında ayrıca tam PDF tamponu oluşturulmaz. 128 MB üzerindeki kaynaklar için dışa aktarımın ek bellek ihtiyacı belirtilir; arka plan işçisi olmayan tarayıcıda büyük PDF çıktısı yerine düzenlenebilir dosya önerilir.
- Aktif sayfa ve çevre sayfaların piksel bütçeleri değişmedi. Büyük belgenin açılmasının her cihazda sınırsız bellek güvenliği anlamına gelmediği, özellikle taranmış yoğun sayfaların ve tam PDF çıktısının daha fazla kaynak gerektirdiği dikkate alınmalıdır.
- Tahta betik/stil sürümü ve çevrimdışı paket sürümü güncellendi. Var olan ana sayfa güncelleme notları yeni PDF sınırlarını içerir; tekrar açılma anahtarı değiştirilmedi.

## Kontroller

- Aralık okuma, iptal ve dosya okuma hataları; kalıcı depolama sınırının ayrılığı; parçalı arşiv açma/kaydetme ve eski arşiv uyumluluğu için birim testleri.
- 250,2 MB ve 451 sayfalık sentetik PDF: Chromium 1440 piksel ve WebKit 390 piksel görünümde açma, 430. sayfaya geçme, yazma, kalıcı depoya büyük kaynak yazılmaması ve geçersiz dosya seçiminden sonra eski kitaba dönüş.
- Bu aralık okuma testinde 250,2 MB kaynağın yaklaşık 0,5 MB'si istendi; PDF'nin büyük test akışı sayfa içeriği için gerekli değildi. Bu ölçüm gerçek, yoğun resimli her kitabın aynı miktarda okuma yapacağı anlamına gelmez.
- Aynı büyük kaynaktan yerel `.tahta` çıktısı, tekrar açılınca notların korunması ve 451 sayfalı notlu PDF çıktısı doğrulandı.
- Mevcut küçük PDF, döndürülmüş sayfa, çoklu sekme, görünüm, metin seçimi, çizim, yerel kayıt ve çevrimdışı testleri yeniden çalıştırıldı. Fiziksel okul tahtasında test yapılmadı.
