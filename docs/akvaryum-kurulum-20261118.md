# Akvaryum canlı veritabanı kurulumu · 18 Kasım 2026

Kullanıcının açık yetkilendirmesiyle Supabase panelindeki **kemalogretmenim** projesine uygulandı. Proje bağlantısı site yapılandırmasıyla eşleştirildi.

Uygulanan dosyalar:

- `supabase-akvaryum-karakterler-20261117.sql`
- `supabase-akvaryum-gazete-20261118.sql`

İki dosya tek işlem içinde çalıştırıldı; PostgREST şema önbelleğinin yenilenmesi bildirildi. Öğrenci puanları, geçmiş kayıtları, veli kodları veya mevcut erişim politikaları değiştirilmedi.

Kurulum öncesinde veli geçmişi ve özelleştirme altyapısı hazırdı; yeni karakter koruması ve gazete işlevi eksikti. Kurulum sonrası karakter koruması, gazete işlevi ve gazete uyumluluk tetikleyicisi doğrulandı. Geçersiz deneme kodu rapor döndürmedi. Anonim kullanıcıların hesap ve veli kodu tablolarını okuma yetkisi bulunmadığı doğrulandı.

Olumlu davranış sesi aynı gün site kaynaklarında kullanıcının gönderdiği `olumlu.mp3` dosyasıyla değiştirildi. Ses değişikliği için veritabanı kurulumu gerekmez. Web dosyalarının yayına alınması bu veritabanı işleminin parçası değildir.

## Gönderim ve aktifleştirme güncellemesi

Aynı gün `supabase-akvaryum-gazete-yayin-20261118.sql` canlı projeye uygulandı. Gazete varsayılan olarak kapalıdır; etkinleştirme ve açık gönderim birlikte gerekir. Gönderilmiş içerik taslaktan ayrıdır. Kapatılmış veya gönderilmemiş sayılarda rapor verileri dönmez. Güncel işlev tanımı, geçersiz kodun engellenmesi ve özel tablolara anonim okuma yetkisinin kapalı olması canlı SQL sorgusuyla doğrulandı. Puan, öğrenci geçmişi ve veli kodu kayıtları değiştirilmedi.

Yerel kontroller: 438 akvaryum testi geçti. İzole PostgreSQL denetiminde kapalı gazete, gönderilmemiş sayı, gönderilmiş kopyanın taslak düzenlemelerinden korunması, eski istemci uyumluluğu, kendi çocuğuyla sınırlı erişim ve yayından kaldırma doğrulandı. Masaüstü ve dar ekranda iç kaydırmayla duyurunun sonuna ulaşılması tarayıcıda gözlendi.

## İnciyle Resif İnşası · 19 Kasım 2026

`supabase-akvaryum-resif-insasi-20261118.sql` canlı **kemalogretmenim** projesine uygulandı. Canlı sorgu, kalıcı parça korumasını ve yalnızca dekor alanlarının paylaşıldığını doğruladı. Geçersiz sınıf ve veli kodları sonuç döndürmedi. Anonim rolün özel hesap tablosuna ve önceki veli işlevine doğrudan erişimi kapalı kaldı. Mevcut öğrenci satırları ve veli bağlantıları üzerinde veri işlemi yapılmadı. Web dosyaları çalışma alanında güncellendi.

## Resif Postası kutlama mesajları · 19 Kasım 2026

`supabase-akvaryum-gazete-kutlama-20261119.sql` canlı **kemalogretmenim** projesine uygulandı. Doğum günü tebriki, yayımlanmış öğrenci sayısında yalnızca ilgili veli bağlantısı için ve gün seçilen haftada gerçekleştiğinde dönüyor. Canlı kontrol işlevin güncellendiğini, geçersiz kodun sonuç döndürmediğini ve anonim rolün özel hesap tablosunu okuyamadığını doğruladı. Tarihler ve animasyonlar web dosyalarında hazır.
