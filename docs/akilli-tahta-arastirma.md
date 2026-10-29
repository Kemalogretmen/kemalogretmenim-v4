# Akıllı Tahta: Araştırma ve Uygulama

Araştırma tarihi: 29 Ekim 2026.

## Kaynaklar

- [Classroomscreen araç kataloğu](https://classroomscreen.com/widgets/): süre, rastgele seçim, gruplar, skor, çalışma sembolleri, ses ve içerik araçlarının resmi listesi.
- [Classroomscreen kullanım açıklaması](https://classroomscreen.com/helpcenter/what-is-classroomscreen): sınıf yönetimi, katılım, zaman ve içerik araçlarının kullanım alanları.
- [Classroomscreen grup oluşturma rehberi](https://help.classroomscreen.com/article/25-group-maker): öğrenci listelerinden gruplama akışı.
- [SMART sunum araçları](https://support.smarttech.com/docs/software/product-drivers-ink/12-5/en/using-smart-toolbar/using-presentation-tools.cshtml): taşınabilir odak ışığı, büyüteç ve sürüklenerek açılan perde.
- [OpenBoard, Cenevre eğitim biriminin rehberi](https://edu.ge.ch/site/utilisation-logiciel/2025/12/03/openboard-guide-pratique/): çizim, geçici lazer, görsel/PDF açıklama ve geometri araçları.
- [Forestville Montessori yazmaya hazırlık rehberi](https://www.forestvillemontessori.nsw.edu.au/wp-content/uploads/2020/03/Montessori-read-write-by-Lynne-Lawrence.pdf), kum tepsisi bölümü: harf modeline bakarak parmakla yazma ve tekrar için yüzeyi düzleme.

Kaynakların ürün kodu veya görselleri kopyalanmadı. Eklentiler bu projeye ait yerel JavaScript ile çalışır. Arayüz simgeleri yerel Lucide dosyalarıdır; lisansları `assets/smartboard-icons/LICENSE` içindedir.

## Seçim ve Entegrasyon

| İhtiyaç | Tahtadaki karşılık | Durum |
| --- | --- | --- |
| İçeriğe dikkat çekmek | Boyutu ayarlanabilen, sürüklenebilir odak ışığı | Eklendi |
| Soruyu veya cevabı aşamalı göstermek | Kaydırma ve sürükleme ile açılan ekran perdesi | Eklendi |
| Kalıcı iz bırakmadan anlatmak | Dokunma/fare ile lazer işaretçi | Eklendi |
| Etkinlik süresini görünür tutmak | Başlat, duraklat, sıfırla ve isteğe bağlı bitiş sesi olan görsel süre | Eklendi |
| Söz hakkı dağıtmak | Herkese sıra gelene kadar tekrarsız öğrenci seçimi | Eklendi |
| Gruplara ayırmak | Dengeli grup büyüklükleri ve taşınabilir grup listesi | Eklendi |
| Sınıf oyunlarında puan tutmak | Adları değiştirilebilen iki takımlı puan tablosu | Eklendi |
| Çalışma beklentisini göstermek | Trafik ışığı ve bireysel/eşli/grup/dinleme seçimi | Eklendi |
| Yönergeyi görünür bırakmak | Taşınabilir, yerel kaydedilen ders notu | Eklendi |
| Ses düzeyine ilişkin görsel geri bildirim | Kullanıcı başlatmalı mikrofon ve hassasiyet ayarı | Eklendi |
| Materyali işaretlemek | Tahtaya yerel görsel ekleme, taşıma, boyutlandırma, geri alma | Eklendi |
| Matematik, zar ve sınıf çarkı | Mevcut araçlara panelden bağlantılar | Korundu |
| PDF ve diğer belgeler | Mevcut Sınıf Kaynakları bölümüne bağlantı | Korundu |
| Çevrim içi öğrenci oylaması | Katılımcı oturumları ve sunucu gerekir | Bu değişikliğe dahil değil |
| Kameralı belge gösterimi / ders kaydı | Ayrı medya yakalama ve kayıt akışı gerekir | Bu değişikliğe dahil değil |

Bu liste sınıf içi kullanım için seçilen eklentileri belirtir; her öğretmenin bütün olası ihtiyaçlarını karşıladığı iddia edilmez. Mevcut geometri, sayfa, kaydetme ve yazdırma araçları çalışmaya devam eder.

## Kum Havuzu

- Parmak izi, önbelleğe alınan yumuşak kenarlı fırçalarla açılır. İzin kenarlarında ışık/gölge ve kum tanesi yığılmaları bulunur.
- Kum tabakası ve daha koyu alt tabaka ayrı dokular kullanır. Yüzey dokusu her çizim hareketinde tekrar üretilmez.
- Parmak, dört dişli tırmık, yıldız ve eliyle düzleme seçenekleri vardır. İz genişliği değiştirilebilir.
- Altı adıma kadar kum işlemi geri alınabilir. Geri alma görüntüleri en fazla 900 × 600 olarak tutulur.
- İsteğe bağlı kum sürtünme sesi yalnızca çizim sırasında çalışır; sekme gizlenince durur.
- Harfli/serbest kum, mevcut harf sırası ve TTKB yazı tipi korunur.
- Sürekli parçacık döngüsü yoktur. Kum yüzeyi çizim yapılmadığında animasyon veya hesaplama çalıştırmaz.

## Çizgi Birleşimleri

Fosforlu kalem ve karakalem önceden ayrı karelerde yarı saydam çizgi parçaları ekliyordu. Yuvarlak uçların örtüştüğü yerlerde opaklık birikerek boncuk/nokta görünümü oluşuyordu.

Yeni `smartboard-ink.js` çizgiyi opak bir geçici maskede biriktirir. Opaklık görünür katmana bir kez uygulanır. Yalnızca değişen bölge güncellenir; her hareket için bütün tahta yeniden çizilmez. Kalem bırakıldığında çizgi ana tuvale bir kez aktarılır. Kayıttan yüklenen karakalem de rastgele, bağımsız parçalar yerine tek bir sürekli yol olarak çizilir.

## Veri ve Yaşam Döngüsü

- Notlar, listeler, skor ve süre ayarları bu tarayıcının yerel alanında tutulur.
- Ses göstergesi konuşmayı kaydetmez veya sunucuya göndermez. Ölçüm görecelidir; kalibre edilmiş desibel ölçeri değildir.
- Mikrofon açılmadan izin istenmez. Kapatılan eklentiye sonradan verilen mikrofon izni açık bir ses akışı bırakmaz.
- Kapatılan süre eklentisi aralık sayacını temizler. Süre hesabı kare sayısına değil bitiş zamanına dayanır.
- Görseller tuvale aktarılmadan küçültülür; çizim geçmişi ve sayfa kaydına dahil edilir. Yerel depolama için toplam görsel verisi sınırlandırılır.
- Eklenti katmanı tam ekran modunda tahta içine taşınır; yüzen araç çubuğunda da eklenti düğmesi vardır. Odak/perde açılışta kendiliğinden etkinleşmez.
- Kum modunda yüzen ders araçları geçici gizlenir, notlar korunur ve mikrofon durdurulur. Normal tahtaya dönülünce araçlar geri görünür.
- Ad değişikliği görünür başlıkları, menüleri, aramayı ve önbellekten gelen eski kısayol adlarını kapsar. Eski bağlantıları bozmamak için `beyaztahta.html` dosya yolu korunur.

## Doğrulama

Yerel testler: `tests/smartboard-ink.test.cjs`, `tests/smartboard-studio.test.cjs`, `tests/smartboard-widgets.test.cjs` ve mevcut matematik aracı testleri.

Tarayıcı denetimi: `tests/browser/whiteboard-mobile.cjs` ve `tests/browser/smartboard-studio.cjs`.

Chromium ve WebKit'te 320/390 piksel mobil görünümler, yerel dokunma olayları ve eski Touch Events yolu denetlendi. Kum izleri ekran boyutu değişince korunuyor. İlk regresyonda sonraki fırça damgalarının arka kenarının izin merkezini yeniden doldurduğu bulundu; tane birikimi hareket yönünün iki yanıyla sınırlandırılarak düzeltildi.

390/1440 piksel görünümlerde iki tarayıcının gerçek tuval pikselleriyle fosforlu kalem/karakalem opaklığı doğrulandı. Eklenti paneli, süre başlat/kapat, not, odak/perde, görsel ekleme/kaydetme/geri alma ve kumda geri alma testleri geçti. Ayrıca Chromium'da gruplama, eklenti sürükleme, tam ekran içinden eklenti açma ve odak taşıma, kumun elle düzlenmesi ve düzleme işleminin geri alınması denetlendi. Bunlar tarayıcı emülasyonu ve masaüstü kontrolleridir; fiziksel akıllı tahta donanımı üzerinde ölçüm yapılmadı.
