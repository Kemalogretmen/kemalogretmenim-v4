# Ajanda Analiz ve Karne Merkezi

## Kapsam

- Sınıf analizi, öğrenci karnesi ve deneme karşılaştırması ayrı görünümlerdir.
- Tek sınav, seçili sınavlar veya tüm sınavlar; ayrıca ders filtresi kullanılabilir.
- Sınıf raporu için öğrenci seçmek gerekmez. Katılım, eksik sonuçlar, ders ortalamaları, başarı dağılımı ve hedef altında kalan öğrenci sayısı gösterilir.
- Karşılaştırma grafikleri sınıf ortalamasını da içerir. On sınavdan sonra yeni grafik başlar; eksik sonuçlar çizgide sıfır gibi gösterilmez.
- Sınıf raporları PDF'de bölümlere, uzun sınav/öğrenci tabloları en fazla 20 satırlık sayfalara ayrılır. Analiz Excel çıktısı ayrı özet, sınav, ders ve isteğe bağlı öğrenci sayfalarını içerir.
- Öğrenci ayrıntıları kapatıldığında öğrenci adları/numaraları hem rapordan hem analiz Excel dosyasından çıkar. Sınıf analizi için veliye WhatsApp paylaşımı kapalıdır.

## Hesaplama

Her sınav için yalnız aktif sınıfın kendi öğrenci listesiyle eşleşen geçerli sonuçlar kullanılır. Dosyadaki diğer sınıflar veya eşleşmemiş katılımcılar sınıf ortalamasını değiştirmez.

Sınav sınıf ortalaması = geçerli öğrenci başarı yüzdelerinin aritmetik ortalaması.

Seçili sınavların genel başarı düzeyi = geçerli sınav sınıf ortalamalarının aritmetik ortalaması. Sınavlar eşit ağırlıktadır. Sonucu olmayan öğrenci/sınavlar sıfır sayılmaz; gerçek sıfır başarı sonuçları hesaba katılır. Ders filtresinde puan ağırlıkları seçili derslere göre yeniden ölçeklenir; 3 yanlış kesintisi iki kez uygulanmaz. Sonucu olmayan 0/0/0 ders kaydı sonuç sayılmaz.

Bu değer **başarı yüzdesidir**, ulusal normlara dayalı yüzdelik dilim değildir. Mevcut sınav puanlama ve kesinti kuralları korunur. Önceki 100 puanlık sınavlar 500'e dönüştürülmez; yeni Excel yüklemenin varsayılanı 500'dür.

## Excel İçe Aktarma

- XLSX, XLS ve CSV; düz ders-D/Y/B başlıkları, iki satırlı birleşik ders başlıkları, tanınan soru sayılı net/doğru/yanlış yayınevi formatı ve öğrenci/ders satırlı uzun tablolar desteklenir.
- Tanınmayan düz tablolar için başlık satırı, kimlik ve ders-D/Y/B sütunları öğretmen tarafından eşleştirilebilir. Bir sütun iki alana atanamaz.
- Temiz, mevcut öğrencilerle eşleşen yeni sınav dosyası **Yükle** ile doğrudan kaydedilir. Yeni öğrenci, tekrar, kimlik çelişkisi, eksik veya geçersiz sonuç olduğunda önizleme açılır. **Önizle ve Düzenle** her zaman kontrol ekranını açar.
- Önizlemede ad, soyad, numara ve D/Y/B düzeltilebilir; satır atlanabilir. Her 25 satır ayrı sayfada düzenlenir. Değişiklikler kontrol edilmeden kaydedilemez.
- Belirsiz çok sayfalı dosyalarda sayfa seçilir. 10 MB, 256 sütun ve yaklaşık 5.000 veri satırı sınırları korunur. Rastgele yayınevi puanı/sırası doğru-yanlış diye tahmin edilmez. Kaynak dosyada eksik veya tutarsız bilgi varsa düzeltme gerekir.
- Onay öncesi veri yazılmaz. Sınıf veya öğrenci listesi değişirse önizleme yenilenmelidir. Depolama hatasında işlem geri alınır.

## Mobil ve Veritabanı

Android/iOS ajanda ekranında sınıf genel başarı özeti ve ayrıntılı analiz etkinliği bulunur. Analiz kodu ve CSS mevcut çevrimdışı ajanda paketine eklenmiştir; webde yayın yapmak mevcut APK'yi tek başına güncellemez, yeni uygulama derlemesi gerekir.

Yeni tablo veya SQL göçü yoktur. Analizler mevcut `teacher_agenda_states` JSON verisinden hesaplanır, ek özet kopyası saklanmaz. Excel dosyasının kendisi veritabanına yüklenmez. Mevcut hesap sahipliği, bulut senkronu ve çakışma korumaları değiştirilmez.

## Tasarım Kaynakları

- [NWEA Class Profile](https://cms-admin.mapnwea.org/assist/help_map/Content/Data/ClassProfileGuide.htm): sınıf özeti, katılım ve öğrenci/ders bazlı ayrım.
- [Renaissance Star Reports](https://star-help.renaissance.com/hc/en-us/articles/13560554011291-Reports): bireysel ve grup raporlarının ayrılması.

Kaynaklardaki özel normlar veya kapalı puan algoritmaları kullanılmamıştır.

## Doğrulama

- Hesaplama, sınıf izolasyonu, eksik/sıfır ayrımı, ders adı eşleştirmesi, kesinti ve puan ağırlıkları, Excel düzeltme/eşleştirme, güvenli HTML ve Excel metinleri için otomatik testler.
- Chromium 1440 ve 390 piksel: sınıf/öğrenci raporları, filtreler, Excel ve çok sayfalı PDF, boş olmayan grafik çıktısı, temiz dosya yükleme ve satır düzeltme.
- Mobil TypeScript ve çevrimdışı paket kaynak kontrolleri. Gerçek Android cihazına yeni APK yükleme ve canlı Supabase'e veri yazma bu kontrolün parçası değildir.
- Son kontrol: 801 web testi, 125 mobil testi ve TypeScript geçti. Web arayüzü 1440/390 pikselde; gerçek mobil ajanda bileşenleri 390/738 pikselde doğrulandı.

Bu değişiklikler kaynak çalışma alanındadır; canlı yayın veya APK dağıtımı yapılmamıştır.
