# Ajanda, Öğretmen Paneli ve Mobil Öğrenci Profili

## Kurulum

Öğretmen panelindeki yeni aktarım için Supabase SQL Editor içinde **yalnızca `supabase-ajanda-panel-aktarim.sql`** çalıştırılır. Mevcut öğretmen paneli ve ajanda tabloları kurulu olmalıdır. Dosya tekrar çalıştırılabilir; rol, admin yetkisi, öğretmen onayı veya mevcut RLS politikalarını değiştirmez. Kayıt silmez.

Web dosyaları yayına alınmalı; mobil ekranlar için güncellenen kaynaklardan yeni uygulama derlemesi hazırlanmalıdır. Bu değişiklikler tek başına mevcut APK'yı veya canlı siteyi güncellemez.

## Seçerek Aktarım

1. Ajandadaki son değişiklikleri buluta kaydedin.
2. Öğretmen Paneli > Sınıflarım > Ajandadan Öğrenci Al bölümünde Ajanda Listesini Yükle'ye basın.
3. Kaynak ajanda sınıfını, paneldeki hedef sınıfı ve öğrencileri seçin.
4. Seçilenleri Aktar düğmesiyle onaylayın.

Bu akış öğretmen denetiminde bir aktarım işlemidir, otomatik çift yönlü silme/eşitleme değildir. Yeni öğrenciler eklenir; eşleşen mevcut öğrencilerin hesap, durum ve veli bağlantıları değiştirilmez. Aynı kaynak öğrenci tekrar aktarılmaz. Çakışan okul numaraları atlanır ve sonuçta sayılır. Yanlış sınıftan seçilmiş bir öğrenci tüm işlemi iptal ettirir. İşlem tek veritabanı transaction'ında yapılır.

Yalnızca ad-soyad, okul numarası ve kaynak kayıt kimlikleri panelle ilişkilendirilir. Fotoğraf, adres, veli telefonu, sağlık ve özel notlar panel tablosuna kopyalanmaz. Öğrenci satırındaki **Ajanda Bilgileri** bağlantısı, öğretmenin kendi ajandasındaki seçili öğrenci profilini açar.

## Bulut Uyarısı

Doğrulanan bulut sürümü artık hesap bazında cihazda saklanır. Başka bir cihazın yeni kaydı eski yerel sürümle otomatik olarak ezilmez.

Önceki sürümden kalan doğrulanamayan kayıtlar için **Buluta Kaydet** mevcut bulut sürümünü yeniden kontrol eder. İki kayıt farklıysa, yerel sürümün bulutun yerine yazılacağı açıkça sorulur. Onay verilirse iki sürüm tarayıcıda güvenlik yedeğine alınır ve yazma işlemi okunan bulut sürümüyle koşullandırılır. Onay sırasında başka cihaz değişiklik yaparsa işlem reddedilir. İptal edilirse hiçbir sürüm değiştirilmez. Güvenlik yedeği saklanamıyorsa kurtarma da ilerlemez.

Buluttaki sürüm doğruysa **Buluttan Al** tercih edilmelidir. Hangi sürümün doğru olduğu bilinmiyorsa önce Yedek bölümünden JSON dışa aktarılmalıdır. Başka hesaba ait yerel kayıt otomatik olarak yeni hesaba aktarılmaz.

## Mobil

Öğrenciler fotoğraflı iki sütunda gösterilir. Profil; Kişisel, Veli, Sağlık, Notlar, Görüşmeler ve Akademik sekmelerini içerir. Telefon numaraları arama/WhatsApp seçimini açar; kullanıcı seçmeden arama ya da mesaj başlatılmaz.

Hassas öğrenci ayrıntıları ve fotoğraflar düz metin cihaz görüntüleme önbelleğine yazılmaz. Çevrimdışı özet kaydında bu alanların eksik olduğu belirtilir. İnternet bağlantısında aynı öğretmen hesabından tam kayıt yeniden alınır.

Sınıf adını düzenle işlemi sabit sınıf/öğrenci kimliklerini korur. Eşleşmiş ders programının adı da güncellenir; öğrenciler, sınavlar ve yıllık planlar taşınmaz veya silinmez.

## Doğrulama

- Web birim testleri: bulut sürümünün yeniden açılışta korunması, onaylı kurtarma, eşzamanlı yazma reddi ve hesap ayrımı.
- PostgreSQL/PGlite: migration'ın tekrar çalıştırılması, RLS, sahiplik, onaylı öğretmen denetimi, tekrar aktarım, numara çakışması ve transaction geri alma.
- Chromium: web paneli/ajanda akışı 1440 ve 390 piksel; gerçek mobil ekran bileşenleri test verileriyle 390 ve 738 piksel.
- Native telefon/WhatsApp uygulamaları fiziksel cihazda ayrıca kontrol edilmelidir; tarayıcı testi üretilen bağlantıları ve seçim adımını doğrular.
