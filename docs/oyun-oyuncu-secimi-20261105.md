# Ortak oyuncu seçimi ve çözümleniş soruları

Yerel çalışma; dağıtım, veri tabanı güncellemesi veya Git gönderimi yapılmadı.

## Sayı Atölyesi

Ayarlar: doğrudan sayı, birlik/onluk sayıları, basamak değerleri toplamı, basamak ipuçları, karışık çözümleniş. Karışık mod üç çözümlenişi dengeli döndürür. Sıraları karışık terimler soru başında üretilir ve malzeme eklenirken sabit kalır. Sıfır olan ara basamaklar ipucunda korunur. Hedef sayı çözümleniş biçimlerinde ayrıca rakamla gösterilmez. Aynı sınıftaki iki oyuncu aynı soru/sıra ile karşılaşır.

Yerel skor tablosu `kemal.game.scores.v1` anahtarında, hesap kimliği/konuk bölümleriyle ayrılır. Her bölüm en fazla 200 tamamlanmış oyun saklar. Sınıf, materyal, soru biçimi ve tur sayısı filtreleri; başarı oranına göre sıralama, ilk kontrolde doğru sayısı, yanlış kontrol sayısı ve soru bazında denemeleri inceleme bulunur. Tamamlanmayan oyun kaydolmaz. Oturum/oyuncu kimliği çift kaydı engeller. Depolama kapalıysa oyun çalışır ve kaydedilemediği bildirilir. Veriler sunucuya gönderilmez.

## Ortak isim katmanı

`js/game-players.js` ve `css/game-players.css`, isim/takım alanı bulunan 16 oyuna bağlandı: Sayı Atölyesi, Zıtlar Atölyesi, Eş Anlam Kuleleri, Çarpım Kanatları, Onluk Basket, Kızma Birader, Halat Çekme (oyun4), Bilgi Düellosu, Matematik Vadisi, Ölçüm Atölyesi, Sesli Balonlar, Hece Köprüsü, Kelime Avcısı, Saat Oyunu, Şekil Avcısı 3D, Uzay Matematik Avı.

- Varsayılan “Oyuncu 1” benzeri adlar kayıt sayılmaz; etkin insan oyuncular için boş ad engellenir. Bilgisayar oyuncusu ve gizli/pasif alanlar doğrulama dışında kalır.
- Aktif öğrenci oturumunda birinci oyuncu alanı profil adıyla dolar. İkinci oyuncu elle yazılabilir. Sadece kazanan adı istenen eski düello ekranına hesabın adını otomatik atayarak yanlış kazanan kaydı yapılmaz.
- Onaylı öğretmende kendi aktif `teacher_classes` ve `teacher_class_students` kayıtları, ajandadaki öğrencilerle birleştirilir. Aynı sınıf/isim kopyaları elenir. Sınıf filtresi, listeden seçim ve tekrarsız rastgele seçim vardır. Seçili öğrenci kimliği iki alanda aynıysa başlangıç engellenir.
- Ajandanın yerel önbelleği yalnız `.owner` girişteki öğretmen kimliğiyle eşleşirse kullanılır. Hesap değişince eski liste ve otomatik adlar temizlenir; geciken eski istekler yok sayılır. Yeni erişim yetkisi veya sunucu şeması gerekmez.
- Dinamik oyuncu alanları yeniden oluşturulunca bağlanır. Kaydı oyun sonunda yapan eski oyunlarda seçim de mevcut isim/kayıt ekranında kalır; oyunların mekanikleri taşınmadı. Mevcut diğer oyunların skor tabloları dönüştürülmedi.

## Doğrulama

- Tam paket: 871 test geçti. Son dengeli karışık tur/depoya karşı koruma düzenlemesinden sonra 15 odaklı test tekrar geçti.
- Öğrenci otomatik adı/çıkış, öğretmen kendi liste sorgusu, panel-ajanda birleşimi, iki farklı seçim, rastgele tekrar engeli ve hesap değişiminde eski yanıtın iptali test verileriyle doğrulandı.
- Tarayıcıda isimsiz başlatmanın reddi; beş karışık soruyu bitirme, 460/500 puan ve 4/5 ilk deneme, yenilemeden sonra kalıcı skor ve soru incelemesi kontrol edildi. 390×844 skor tablosu kontrol edildi. Gerçek öğrenci/öğretmen hesabıyla giriş yapılmadı.

Son tarayıcı kontrollerinde 320×568 boyutunda uzun basamak ipucuyla kontrol bölümü görünür kaldı. Onluk Basket'te boş isimle başlangıç engellendi; Ece/Deniz isimleri girilince iki oyunculu maç doğru adlarla açıldı. Skor tablosu yenileme sonrasında 460/500 ve 4/5 ilk deneme kaydını korudu; inceleme ilk yanlış cevap ile sonraki doğru cevabı ayrı ayrı gösterdi.
