# Canlı site ve yerel yayın denetimi · 19 Kasım 2026

**Yayın beklemede.** Netlify, üretim yayınlarının dönem kredileri tükendiği için duraklatıldığını bildiriyor. Kalan işletim kredileri mevcut siteyi açık tutuyor. Üretimdeki [7479ac8 dağıtımı](https://app.netlify.com/projects/kemalogretmenimson/deploys/6afb6f77c5d2fd74b853a946) çalışıyor. GitHub ana dalındaki [cf0e74e dağıtımı](https://app.netlify.com/projects/kemalogretmenimson/deploys/6afb76c7404ec9d241f267f4) kredi sınırı nedeniyle atlanmış. Yerel paket her iki kayıttaki kaynak değişikliklerini içeriyor. Yeni üretim yayını, GitHub gönderimi veya ücretli işlem yapılmadı.

## Yayın paketinin içeriği

| Bölüm | Canlıya alınmayı bekleyen değişiklikler |
| --- | --- |
| Sınıf Akvaryumu | Yeni deniz canlıları ve 100 puanlık karakter koleksiyonu. Karaktere özgü sevinme hareketleri, yumuşak yüzüş ve dönüş, yakın ad ve puan etiketleri, yeni resif bitkileri. Olumlu ve olumsuz davranış sesleri, baloncuk patlama sesi. |
| Baloncuk Avı | On oyun, ikili karşılaşma, adil oyuncu seçimi, sınıf düzeyi ayarları ve cihazda saklanan ilk beş. Eşini Bul, Sesli Baloncuklar, Deniz Temizliği, İnci Takibi ve Akıntı Sörfü dahil. |
| Akvaryum koleksiyonu ve veli ekranı | Öğretmenin belirlediği dört eşikle kalıcı Kayıp Gemi koleksiyonu. Veliye özel haftalık Resif Postası, taslak, önizleme ve gönderim. Doğum günü hatırlatması, kutlama ve takvim tebrikleri. |
| Fen Laboratuvarı | Yan yana laboratuvar kartları, 3B kuvvet ve yaylar deneyleri, dinamometre, ölçüm karşılaştırması ve beceri testi. 2B yedek yay deneyi. Mikroskop hazırlama, 3B/2B bitki ve hayvan hücresi karşılaştırması, organeller, hücreden organizmaya geçiş ve değerlendirmeler. |
| Okuma ve Anlama | Okuma ve Anlama Akademisi ve içerik yönetimi. Okuma odağı ve görünüm tercihleri, otomatik kelime gösteriminin ölçülmüş hızdan ayrılması, gözden geçirilen okuma ve soru ekranları, soru aktarımı, karne merkezi ve arşiv. Hece Akışı yayını ve e-kitap okuyucusu, kitaplık ve yönetim değişiklikleri. |
| Öğretmen Ajandası | Yeni çalışma masası ve haftalık plan. A4 önizleme, PDF/PNG/JPEG, yazdırma ve paylaşma. Ajanda verilerini kullanan sınıf listeleri için güncel sürüm kontrolü. |
| Sınav Merkezi | Yeni sınav çalışma alanı ve seçenek düzenleyicisi. Sınav sonuç ve kazanım analizi. Öğretmenin sınıf ve öğrenci sonuçlarına erişimi. |
| Öğretmen, öğrenci ve veli panelleri | Rolüne göre sınav sonuçlarına geçiş ve okuma karnesi arşivi. Öğretmen panelinde sınav analizi. Öğrenci ve veli ekranlarında otomatik akış temposunun ayrı gösterilmesi. |
| Matematik Araçları | Netlify’ın `.html` uzantısını kaldırdığı adreslerle de Geometri Atölyeleri yan menüsünde Birim Küpler, Yapı Atölyesi, Cisim Açılımları ve Simetri Aynası görünür. Canlıda sıfır bağlantı üreten durum, üretim adres biçimiyle yerelde yeniden sınandı. |
| Saat ve Sayaç | Yenilenen saat, sayaç ve arka plan çalışma alanı. Akıllı tahta görünümü. |
| Site bağlantıları ve reklam yönetimi | Akademi ve laboratuvar bağlantıları, site haritası ve okuma kısayolları. Ayara bağlı reklam yerleşimleri, yönetim ekranı, `ads.txt` işlevi ve yönlendirmesi. Kredi sınırında atlanan GitHub değişikliği dahil. |
| Admin menüsü ve reklam erişimi | Açılan alt menünün 520 piksel sınırı kaldırıldı. Uzun menünün tüm seçenekleri masaüstü, tablet ve mobilde kaydırılarak açılabiliyor. Ana yönetici için Google Reklamları hızlı kartı ve ortak admin menüsünde reklam yönetimi bağlantısı eklendi. Reklam bölümünde AdSense site onayı bağlantısı gösteriliyor. Ortak CSS ve JS sürümleri güncellendi. |
| Güncelleme notları | Dokuz bölümde kısa, kapatılabilir not. Her bölümün notu aynı tarayıcıda yalnızca bir kez gösterilir. Kişisel ve sınıf paylaşımlı akvaryum bağlantılarında öğretmen notu görünmez. |

## Dosya ve hizmet doğrulaması

- Netlify’ın yayımladığı Git kaydı ile yerel kaynak, aynı web derleme komutuyla ayrı ayrı hazırlandı. Bütün dosyaların içerik özetleri karşılaştırıldı. Canlıda **545** dosya var. Yerel pakette **661** dosya var. **481** aynı, **64** değişmiş, **116** yeni. Silinecek dosya yok.
- Canlıdaki 545 yolun HTTP durumu ve dosya etiketleri sabit Netlify dağıtımıyla eşleşti. Yeni 116 yolun tamamı canlıda 404 döndü. Böylece paketin eski ve yeni yolları tek tek kontrol edildi. Dosya isimleri, durumlar ve özetler ayrı CSV’de listelendi.
- Her iki GitHub kaydındaki Google site doğrulaması ve AdSense değişiklikleri yerel pakette karşılaştırıldı. Sonraki yayın GitHub’ın güncel ana dalı üzerine kurulmalı ve tek üretim dağıtımı olarak yapılmalı.
- **1.017/1.017** web testi geçti. **1.633** yerel HTML ve CSS bağlantısında eksik dosya bulunmadı. 115 web sayfasının ortak tema yüklemesi doğrulandı. 2B yay deneyine ortak tema, üst menü ve kısayol çubuğu eklendi. Tarayıcıda üç yay, menüler, bölüm notunun kapanması, aynı bölümde tekrar etmemesi, başka bölüme ait not ve 390 piksel ekranda yerleşim kontrol edildi.
- Admin menüsü ek kontrolünde **1.018/1.018** web testi geçti. Chromium ve WebKit’te 1440×900, 1024×500, 768×600 ve 390×844 boyutlarında alt menünün son öğesine fare ve klavyeyle erişim doğrulandı. Mobil Chromium’da dokunarak kaydırma da sınandı. Google Reklamları kartı, ortak menü bağlantısı, yalnızca ana yönetici erişimi, formun mobilde genişliğe sığması ve reklam kapatma işlemi örnek verilerle doğrulandı.
- Okuma Akademisi ve AdSense Supabase tabloları erişilebilir. Sınıf, veli ve Resif Postası işlevleri geçersiz örnek koda veri döndürmedi. Gerçek öğrenci kaydı okunmadı veya yazılmadı. Akvaryumun karakter koruması ile gazete, Kayıp Gemi ve kutlama veritabanı güncellemeleri önceki kurulumlarda uygulanmıştı. Canlı `/ads.txt` hâlâ 404. Yerel paketteki yeni Netlify işlevi henüz yayında olmadığı için bu bağlantı yayından sonra tekrar kontrol edilmeli.
- Admin düzeltmesi sırasında canlı reklam durumu yeniden okundu. Ana sayfada reklam kodu bağlantısı bulunmuyor, `/js/site-adsense.js` ve `/ads.txt` 404 dönüyor. Supabase’de yayın anahtarı kapalı ve sekiz alan seçili. Google site onayı ve ziyaretçi izin sistemi doğrulanmadan reklam yayını açılmamalı. Güncel kod, izin sistemi bulunmadığında Google’a reklam isteği göndermiyor.
- Android/iOS kaynak değişiklikleri Netlify web paketinin dışında. Mobil denetim, gömülü akıllı tahta dosyalarının yeniden üretilmesi gerektiğini bildirdi. APK ve mağaza yayını ayrı değerlendirilmelidir.

## Yayın koşulu

Netlify üretim yayınını yeniden açtığında ve 15 krediye ek olarak olağan trafik için de pay kaldığında güncel GitHub ana dalıyla birleştirilmiş paket tek seferde yayımlanabilir. Son kontrolde yeni Netlify dağıtımının **Published** olduğu ve yeni sayfaların, paylaşım işlevlerinin ve `/ads.txt` yolunun canlıda çalıştığı doğrulanmalı. [Netlify kredi açıklaması](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)
