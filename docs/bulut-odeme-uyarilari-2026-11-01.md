# Google Cloud ödeme ve Netlify kredi uyarıları — 1 Kasım 2026

İnceleme 1 Kasım gecesi başlayıp 2 Kasım'ın ilk dakikalarında tamamlandı (Türkiye saati). Kullanıcının paylaştığı e-postalar, canlı Google Cloud Billing paneli ve sitenin mevcut yapılandırması karşılaştırıldı.

## Doğrulanan neden

Google Cloud'daki üç ödeme hesabının tamamında aynı, sonu **1825** ile biten Visa kartı için **Transaction declined** uyarısı var. Kartın panelde görünen son kullanma tarihi henüz geçmemiş.

Sınav projesinin işlem geçmişinde 1 Kasım 2026 tarihli kayıt:

> Monthly charge declined … for 0.16. Invalid credit card details.

Ayrıntı açıklaması, ödemenin kredi kartı bilgileri hatalı olduğu için reddedildiğini söylüyor. Bu kayda dayanarak limit yetersizliği, kartın süresinin dolması veya belirli bir banka kısıtı kesin neden olarak ileri sürülemez.

Ekim dönemi tutarı ₺0,13 hizmet bedeli + ₺0,03 KDV = **₺0,16**. 1 Ekim'de aynı karttan önceki ₺0,38 ödemenin alındığı da görülüyor.

## 2 Kasım ek incelemesi: ücretin kaynağı ve plan

Kullanıcının "ücretsiz hesapta neden ücret oluştuğu" sorusu üzerine [Ekim 2026 faturasının maliyet tablosu](https://console.cloud.google.com/billing/019382-975BDD-820841/reports/tabular) hizmet ve SKU seviyesine kadar açıldı. Firebase proje özetinde de `kemalogretmen-2c986` için **Blaze plan** etiketi doğrudan görüldü. Bu proje, ücretsiz kullanım kotası içeren **kullandıkça öde** planında.

**Ücretin somut kaynağı: `Cloud Firestore Read Ops Frankfurt` (SKU `2F48-F782-6581`).** Bu satır Google Cloud tablosunda `App Engine` hizmet başlığı altında listeleniyor; alt kalem doğrudan Firestore okuma işlemleri. Ayrı bir App Engine uygulaması çalıştığı sonucu çıkarılmamalı.

| Ekim fatura kalemi | Kullanım | Görünen ücret |
| --- | --- | --- |
| Cloud Firestore Read Ops Frankfurt | 716.342 okuma işlemi | Yuvarlanmamış ₺0,130206; gösterilen ₺0,13 |
| Cloud Firestore Entity Writes Frankfurt | 1.058 yazma | ₺0,00 |
| Cloud Firestore Storage Frankfurt | Yaklaşık 0,0731 GiB-ay | ₺0,00 |
| Cloud Firestore Entity Deletes Frankfurt | 200 silme | ₺0,00 |
| Görünen Firestore veri aktarım satırları | Çeşitli yönler | ₺0,00 |
| KDV | %20 | ₺0,03 |
| Fatura toplamı | | **₺0,16** |

716.342, Ekim dönemindeki satırın toplam kullanım miktarıdır; tamamı ücretlendirilmiş okuma sayısı diye yorumlanmamalıdır. [Firestore'un resmi belgesinde](https://firebase.google.com/docs/firestore/pricing#free-quota) ücretsiz standart okuma kotası günlük 50.000 olarak açıklanıyor; kota aylık toplam üzerinden uygulanmıyor. [Firebase plan belgesine](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans) göre Blaze planında ücretsiz kotanın üzerindeki kullanım ücretlenir. Kesin olarak hangi gün kaç okumanın ücretlendirildiği bu incelemede ayrı günlük rapordan çıkarılmadı.

Google Cloud faturalandırma hesabının projeye bağlanması Firebase'i otomatik olarak Blaze planına geçirir. Mevcut bağlı hesap ve mevcut Blaze etiketi doğrulandı; geçmişte bu bağlantıyı kimin, ne zaman yaptığı belirlenmedi. Plan değişikliği yapılmadı.

| Ödeme hesabı | Panelde doğrulanan bağlı proje | Ödeme özetindeki bakiye | Bulgu |
| --- | --- | --- | --- |
| `019382-975BDD-820841` | `kemalogretmen-2c986` (sitedeki sınav sisteminin Firebase projesi) | ₺0,16 | Aylık tahsilat reddedilmiş; kart bilgileri hatalı/geçersiz |
| `0109FE-4636C3-229B93` | `kemalogretmenim` | ₺0,00; borç yok | Aynı kart için ödeme reddi uyarısı |
| `017FC8-EDC416-2FA012` | `gen-lang-client-0151157530` ve `thematic-carver-427613-h9` | Postpay ₺0,00; borç yok | Aynı kart için ödeme reddi uyarısı |

Üç hesap da hesap listesinde **Active** durumundaydı. Bununla birlikte ödeme uyarısı devam ediyor; Active etiketi bu uyarının giderildiği anlamına gelmiyor. Aynı hesabın ve bağlı projelerin ayrı bildirimleri peş peşe e-posta gelmesini açıklıyor.

Gemini hesabında ayrıca ayrı AI Studio ön ödemeli kredi bakiyesi ₺0,00 ve otomatik yükleme kapalı görünüyor. Bu kredi bakiyesi, Postpay borcundan farklıdır. İncelenen web ve mobil uygulama kaynaklarında Gemini API kullanımı bulunmadı; başka uygulamalardaki kullanım araştırılmadı.

## Veritabanı ve canlı erişim

Canlı siteden okunan `js/site-data.js`, ana hizmetler için `mwxcvlyrkptxrwgkmqum.supabase.co` projesini kullanıyor. Yerel kaynakta da aynı adres var. Sınav sistemi ise `sinav_sitesi/js/firebase.js` ve Netlify sınav paylaşım fonksiyonunda `kemalogretmen-2c986` Firestore projesini kullanıyor.

1 Kasım **23:56:33** Türkiye saatindeki salt okunur kontroller:

| Kontrol | Sonuç | Yaklaşık süre |
| --- | --- | --- |
| Ana sayfa | HTTP 200 | 0,67 sn |
| Sınav sayfası | HTTP 200 | 1,21 sn |
| Canlı site yapılandırması | HTTP 200; beklenen Supabase adresi | 1,19 sn |
| Supabase `/auth/v1/health` | HTTP 200; GoTrue yanıtı | 0,83 sn |
| Supabase `/rest/v1/user_profiles?select=id&limit=0` | HTTP 200; boş sonuç | 1,03 sn |
| Firestore'da yayımlanmış tek sınavın başlık alanının okunması | HTTP 200; bir belge | 0,76 sn |

**23:59:09**'da Firebase verisini okuyan gerçek `/sinav/…` paylaşım bağlantısı da HTTP 200 ve beklenen sınav başlığıyla döndü.

Bu sonuçlar kontrol anında erişim kesintisi bulunmadığını gösteriyor. Gerçek kullanıcı parolasıyla giriş, sınav sonucu yazma, tüm verilerin bütünlüğü veya uzun süreli performans testi yapılmadı. Öğrenci/veli kayıtları okunmadı; profil sorgusu sıfır satırla sınırlandı. Genel veritabanı performans denetimi veya veri kaybı olmadığına dair kapsamlı bir doğrulama değildir.

## Netlify bildirimi

Paylaşılan e-posta **30 Ekim 2026** tarihli; 21 Ekim–20 Kasım dönemindeki 300 kredinin %50'sinin kullanıldığını söylüyor. Bu, Google Cloud kart sorunu ve veritabanı boyutundan ayrı bir barındırma kullanım bildirimidir. Netlify panelinde giriş ekranı açıldığı için güncel tüketim ve tüketimin hangi kalemlerden oluştuğu doğrulanmadı. Ana sitenin canlı HTTP 200 yanıtı kontrol anında sitenin sunulduğunu doğruluyor.

[Netlify'nin resmi açıklamasına](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/) göre kredi tüketimi yayınlar, trafik ve işlem kullanımı gibi kalemlerden oluşur. %50 eşik bildirimi hizmetin durduğu anlamına gelmez; krediler tükendiğinde projeler duraklatılabilir. Bu projedeki gerçek tüketim dağılımı görülmeden nedeni yayın sayısına veya trafiğe bağlanmadı.

## Gereken işlem

Hesap sahibi önce [sınav projesinin ödeme sayfasında](https://console.cloud.google.com/billing/019382-975BDD-820841/payment) kayıtlı kartı kontrol edip düzeltmeli veya geçerli bir yöntem kullanmalı ve ₺0,16 bakiyeyi kapatmalı. Diğer iki hesaptaki kart uyarıları da kendi ödeme sayfalarından ayrıca kontrol edilmeli. Kart reddi devam ederse bankaya işlem tarihi, tutarı ve paneldeki hata ile başvurulabilir.

[Google'ın resmi ödeme reddi rehberi](https://docs.cloud.google.com/billing/docs/how-to/resolve-issues#declined_payments), geçersiz ödeme yönteminin veya gecikmiş bakiyenin hizmet kısıtlarına ve hesabın askıya alınmasına yol açabileceğini belirtiyor. Şu anda çalışıyor olması uyarının göz ardı edilebileceği anlamına gelmez.

Bu incelemede ödeme yapılmadı, kart kaydedilmedi, hesap/plan değiştirilmedi, veritabanına yazılmadı ve site yayını yapılmadı. Uygulama kodu değiştirilmedi; yalnızca bu tanı raporu eklendi.

## 2 Kasım devamı: ücretsiz planın yeterliliği ve ödeme denemesi

Firebase'in `(default)` veritabanı Usage ekranı son 30 güne alındı. Panelin tarih seçimi 3 Ekim–2 Kasım, grafiğin kapsadığı örnekler 4 Ekim–2 Kasım Türkiye saatli günlük aralıklar olarak görünüyor. Okuma toplamı yaklaşık **671 bin**, günlük grafikteki en yüksek değer **52.188**. Yazma toplamı 982, silme toplamı 199. Bu dönem Ekim fatura dönemiyle aynı olmadığı için 716.342 fatura toplamıyla birebir eşitlenmedi.

Grafik "Operations (per day)" olarak etiketli. Firebase, bu kullanım ölçülerinin faturalandırma ve kota kullanımından farklı olabileceğini belirtiyor; ücretsiz kota Pacific saatine göre sıfırlanıyor. Bu nedenle grafikteki 52.188 değerinden kesin ücretli okuma adedi hesaplanmadı. Bununla birlikte günlük 50.000 okuma kotasına yakın/üstündeki yoğunluk ve gerçekleşmiş okuma ücreti, mevcut kullanımla Spark'a doğrudan geçişin kesintisiz çalışacağına güvenilemeyeceğini gösteriyor.

Blaze, aynı ücretsiz Firestore kotalarını içerir ve aşan kullanımı ücretlendirir. Bu proje için sabit aylık Firebase paket ücreti görülmedi. İncelenen faturalarda Eylül ₺0,38, Ekim ₺0,16; bu tutarlar gelecekte her ay aynı faturanın çıkacağı anlamına gelmez. Kullanım ücretsiz kotalarda kalırsa bu Firestore kalemlerinden ücret oluşmaz. Netlify ve Supabase'in planları ve kotaları ayrıdır; bu inceleme onların gelecekte her koşulda ücretsiz kalacağını garanti etmez.

### Kaynakta görülen okuma azaltma adayları

- `sinav_sitesi/index.html`: `loadStats()` yayımlanmış sınavların tamamını okuyor; sınıf seçimi sırasında `loadExams()` aynı yayımlanmış sınav kümesini tekrar indirip sınıf filtresini tarayıcıda uyguluyor. Ortak sorgunun paylaşılması/önbelleklenmesi değerlendirilebilir.
- `js/content-feed.js`: sınav kataloğu için tüm yayımlanmış sınavlar okunuyor. İki dakikalık bellek içi önbellek mevcut; bu önbellek sayfa yeniden açılışları arasında kalıcı veya ziyaretçiler arasında ortak değil.
- `sinav_sitesi/admin.html`: `fbLoadResults()` sonuçları tüm koleksiyondan indirip sınav/sınıf gibi filtreleri tarayıcıda uyguluyor; sonuç ekranı tekrar odaklanınca yeniden yükleme yapıyor. Sunucuda uygun filtreleme ve sayfalama değerlendirilebilir.
- `sinav_sitesi/js/ogrenci-karne.js`: yetkili karne merkezi başlangıçta bütün tamamlanmış sonuçları yüklüyor. Seçili öğrenci/sınava göre ihtiyaç duyulan verinin okunması değerlendirilebilir.

Bunlar koddan doğrulanan tasarruf adaylarıdır; faturanın hangi ekranlardan ne oranda oluştuğu ölçülmedi ve kazanç yüzdesi iddia edilmedi. Bu aşamada uygulama kodu veya plan değiştirilmedi.

### Ödeme akışı

İlk yeniden kontrolde bakiye hâlâ ₺0,16 idi. Aynı Visa ile tutarı sınırlandırılmış manuel ödeme formuna ₺0,16 girildiğinde Google **"Minimum amount: TRY 14.00"** doğrulama hatası verdi. [Google'ın manuel ödeme belgesine](https://docs.cloud.google.com/billing/docs/how-to/manual-payment) göre borçtan fazla ödenen tutar sonraki kullanımlar için hesap kredisi olur.

Kullanıcı ₺14 ödemeyi açıkça onayladı. Bakiye yeniden yenilenip ₺0,16 olarak doğrulandı; `019382-975BDD-820841` hesabı ve sonu 1825 olan Visa için **Review your payment — TRY 14.00** ekranı hazırlandı. Otomatik onay denetimi son **Pay now** eylemini reddederek tahsilatın son adımını kullanıcının tamamlamasını istedi. Asistan ödeme gönderemedi.

Kullanıcı sonrasında ödemeyi tamamladığını bildirdi. Yeni bir Google Cloud sekmesinden işlem geçmişi tekrar okundu. Son kontrol sırasında hâlâ **₺0,16 bakiye** ve 1 Kasım'daki eski reddedilen aylık tahsilat kaydı görünüyordu; **₺14 ödeme kaydı veya başarılı ödeme teyidi yoktu**. Bu nedenle başarılı tahsilat doğrulanamadı. Kullanıcıdan Google'ın ödeme sonunda gösterdiği sonuç mesajı istendi; işlem gecikmesi olasılığı, ödemenin başarısız olduğuna dair kesin kanıt olarak değerlendirilmedi. İkinci tahsilat denemesi yapılmadı.

### Ödeme daha sonra doğrulandı

Kullanıcının Google'da "ödeme tamamlandı" mesajı gördüğünü bildirmesi üzerine ödeme özeti yeniden yenilendi. `019382-975BDD-820841` hesabında panel şu iki sonucu gösterdi:

- **Your last payment was on Nov 1 for TRY 14.00 (manual payment).**
- **You have a credit −TRY 13.84 — No balance due.**

Dolayısıyla **₺14 ödeme kayda geçmiş, ₺0,16 borç kapanmış ve ₺13,84 hesap kredisi kalmıştır**. Önceki doğrulanamayan durum artık bu hesap için güncel değildir. Son kontrol yalnız okuma/yenileme işlemiydi; asistan tarafından ikinci ödeme gönderilmedi. Panelin işlem tarihi kendi tarih gösterimidir; inceleme Türkiye'de 2 Kasım'da yapıldı.
