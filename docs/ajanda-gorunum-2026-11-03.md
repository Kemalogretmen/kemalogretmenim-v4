# Ajanda ve Ders Programı Görünümü

- Akademik takvimde Hafta/Ay seçimi; haftalık görünümde önemli günler, doğum günleri, sınav, görüşme ve hatırlatmalar renkli yapışkan notlardır. Notun tamamı seçili gün alanında okunur. Telefon görünümünde gün şeridi ve tam notlar öne çıkar; aynı not iki kez listelenmez.
- Not ekleme formu kapatılabilir. Yeni Not seçilen tarihi hazırlar; mevcut ekleme, silme, bildirim ve tatil yönetimi korunur. Sınıfa ait kayıtlar diğer sınıfın kayıtlarıyla karışmaz.
- Programın tekrar eden üst başlıkları ve tarih araçları küçültüldü; mobilde tekrar eden marka alanı ve çalışma yüzeyini kapatan alt kısayol çubuğu yalnız takvim/program ekranlarında gizlendi.
- Haftalık program iframe'inin yüksekliği içeriğe göre ayarlanır. Normal kullanımda sayfa dikey kaydırması tek yerde kalır; geniş haftalık tablolar gerektiğinde yalnız yatay kaydırılır.
- Program alanının gerçek genişliği 700 pikselden küçükse gün görünümü varsayılandır. Gün/Hafta düğmeleriyle değiştirilebilir. Gün seçimi kayıtları değiştirmez. Ders çıktılarının ayrıntıları açılabilir; program düzenleme, yıllık planlar ve tatiller erişilebilir kalır.
- Yazdır/PDF/PNG komutları Çıktı menüsündedir. Telefonun gün görünümünden bile haftanın bütün sütunları dışa aktarılır.
- Mobil uygulamanın ajanda notları da anlamlı renkler, açık/koyu tema ve dar alanda tek, yeterli alanı olan tablette iki sütun kullanır. Tam not metni, tamamlandı/sil işlemleri ve izinler korunur.

## Teknik

`program-gorunum.js`, önceden yalnız mobil pakette bulunan gün yansıtmasını web ve mobilin ortak kullandığı tek kaynak yapar. Ders/öğrenci verisi kopyalamaz veya değiştirmez. Mobil paket bu dosyayı yerel olarak içerir; internetten kod çekmez.

Boyut mesajları yalnız beklenen iframe kaynağından ve aynı origin'den kabul edilir; sonlu ve sınırlı sayısal değerler gerekir. Boyut ve takvim görünümü veritabanına yazılmaz. Yeni SQL veya tablo gerekmez.

## Kontroller

- Takvim hafta/ay ve yıl sınırları, sınıf izolasyonu, güvenli metinler, formun yazmadan açılması, iframe mesaj kaynağı/origin/boyut doğrulaması.
- Chromium 1440/1024/390 piksel: gerçek site başlığıyla takvim, not ekleme/tam metin, program, otomatik yükseklik, gün seçimi, çıktı, ayarlar ve sayfa taşması.
- Mobil notlar: RN Web açık/koyu tema, telefon/tablet genişlikleri, tam metin, işlem ve yetki kontrolleri. Yeni APK'nin fiziksel Android cihazda testi ayrıca gerekir.

Bu kaynak değişiklikleri henüz canlı siteye veya APK dağıtımına alınmamıştır.
