# Mobil 0.6.1 — Ajanda ve mobil ekran düzeltmesi

Tarih: 2 Kasım 2026. Android sürümü 0.6.1, versionCode 7; iOS kaynak build numarası 7. Bu çalışma canlı Netlify dağıtımı veya GitHub Release yayını içermez.

## Kullanım ve veri akışı

- Ders programı, öğrenci listesi ve karne özeti bağlantıları uygulamanın yerel Derslerim / Öğrenciler / Karneler ekranlarına gider. Gün, hafta ve tarih geçişi; dersten düzenleme; öğrenci akademik sonuçları uygulama bileşenleriyle sunulur.
- Ayrıntılı dosya yükleme / PDF araçları, uygulamaya gömülü ajanda ve ders planlayıcı kaynaklarını kullanır; canlı web sayfasını veya CDN betiklerini açmaz. Telefon ekranında haftalık tablo seçilen güne ait ders kartlarına dönüşür. Tablet ve yazdırmada tam hafta korunur.
- Mobil ajanda, ana uygulamanın oturumunu kullanır. Android içine ikinci bir kalıcı Auth/refresh token oturumu yazılmaz. Web önizleme aynı uygulama istemcisini yalnızca doğru iframe ve rastgele yetki anahtarıyla kullanır; hesap, rol veya onay değişiminde yetki kesilir.
- Bulut kaydı iframe açıldıktan sonra gelirse sınıf listesi ve bellekteki ders planı yenilenir. Kuyrukta bekleyen tarih mesajları boş eski durumu geri yazamaz. Yıllık plan yükleme sekmesi geç gelen bulut odağıyla değişmez.
- “2-B Sınıfı”, “2-B”, “2/B” gibi tekil sınıf eşleşmeleri desteklenir; belirsiz sınıflar birleştirilmez. Kimlikler ve kayıtlı adlar değiştirilmez.
- Okuma tek başına bulut üzerine yazma yetkisi oluşturmaz. Sunucu sürümüyle karşılaştırma, hesap ayrımı, kalıcı bekleyen işlemler ve eski yerel kaydı koruma kontrolleri devam eder. Bozuk bulut şeması boş listeye çevrilmeden reddedilir. İlk çevrimiçi açılış, aynı sürümlü özet önbellek bulunsa da karne ayrıntılarını tam kayıttan alır.

## Gerçek bulut gözlemi

Salt okunur sorguda, mobil bağlantıdaki sınıf kimliğinin ait olduğu hesapta “Sınıfım” ve sıfır öğrenci; farklı hesap kimliğinde “Birincilerim”, “2-B Sınıfı” ve 48 öğrenci bulundu. Bu kayıtlar kopyalanmadı, birleştirilmedi veya silinmedi. Ajandada oturum e-postası ve “Sınıflar bu hesaba bağlıdır” bilgisi artık görünür. Aynı görünen ad, aynı Auth hesabı anlamına gelmez; kullanıcı masaüstündeki e-posta ile mobilde giriş yapmalıdır.

## Güvenlik ve dosyalar

- Mobil paket Mammoth1.11.0, SheetJS0.20.3, jsPDF4.2.1; JSZip3.10.1 ve html2canvas1.4.1 kullanır. Resmî kaynak, lisans ve bütünlük kayıtları vendor/agenda altında; lisanslar gömülü belgede de bulunur. Bu sürümlere yapılan resmî npm güvenlik sorgusu bildirim döndürmedi; bu, tüm sisteme yönelik bir güvenlik garantisi değildir.
- İçe aktarılan sınıf, dosya, ders, tarih, tatil, sonuç ve fotoğraf alanlarının HTML/JS olarak çalışması engellendi. Kayıtlı kimlikler ve veriler değiştirilmeden yalnızca güvenli gösterim uygulanır. CSP haricî betik, frame ve ağ erişimini sınırlar; bulut verisi yalnızca mevcut Supabase projesine gider.

## Doğrulama

- Mobil116 / web729 test geçti; TypeScript ve git diff --check geçti.
- Telefon390×844 ve tablet1024×768 web önizlemesi kontrol edildi. Eski ders programı bağlantısının yerel ajandaya geçtiği ve gömülü yıllık plan ekranının doğru sekmede açıldığı görüldü. Gerçek özel öğrenci kaydı üzerinde deneme amaçlı değişiklik yapılmadı.
- Türkçe DOCX okuma, dış dosya görselinin reddi, XLSX aktarımı, PDF üretimi ve dosya bütünlüğü sentetik verilerle test edildi.
- Android release derlemesi başarılı; imza önceki0.5.0 test paketiyle aynı, debuggable=false. APK ARM64 içindir.
- Fiziksel Android/iOS cihaz doğrulaması yapılmadı; iOS IPA veya mağaza yayını üretilmedi. Doğru masaüstü hesabıyla fiziksel telefonda son kullanıcı kontrolü gerekir.

## APK

Dosya: `Kemal-Ogretmenim-0.6.1-Android-ARM64-Test.apk`
Boyut: 47118649 bayt
SHA-256: `86ee39babef002b4af72aaa93096c55022178100222409c831110ffa582d2afc`
Sertifika SHA-256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`
