# 27 Ekim 2026 — Toplu yayın paketi

Kullanıcı bekleyen tüm değişikliklerin canlıya alınmasını açıkça istedi. Mevcut `main` → GitHub → Netlify üretim yayını kullanılır; ayrı bir manuel dağıtım tetiklenmez.

## Kapsam

- Dokümanlar: geniş Drive/FlipHTML5 okuyucusu, bağlantı/iframe ile kitap ekleme, araç kutusunu koruyan tam ekran, Safari için sayfa içinde temizleme onayı, ana sayfa canlı akışına katılma tercihi.
- Çizim atölyesi: adları görünen araç kutusu, tek/çift/kesik oklar, tek tıklamalı onay/çarpı ve doğru/yanlış damgaları, boyut ayarı, pergel önizlemesi ve tam çember, notları taşıma/boyutlandırma, mobil yerleşim.
- Öğretmen ajandası: elle sınav sonuçları ve puan/net hesapları, öğrenci/sınıf seçimi, düzenleme ve karne raporları; ders programında güncel haftaya geçiş ve uzun öğrenme çıktılarının açılması.
- Onluk Basket: oyun sayfası, çizim/denetleyici ve soru kuralları, katalog kaydı, testler ve kullanım notları.
- Yerel model önizleme aracı kaynak kontrolüne dahil edilir; mevcut Netlify dışlama kuralıyla üretim dosyalarına girmez. Testler ve bu paketin geliştirme notları da üretim klasöründen dışlanır.

## Doğrulama

- `npm test`: **505/505 başarılı**.
- Bekleyen HTML/JavaScript dosyalarında 22 betik sözdizimi kontrolünden geçti; başvurulan yerel JS/CSS/görsellerde eksik dosya yok.
- Doküman görüntüleyicisi Chromium ve WebKit motorlarında masaüstü/mobil boyutlarda denetlendi. Tam ekran, silme/vazgeçme/geri alma, açık kitap konumunu koruma, ok uçları, damgalar, pergel geometrisi, not taşıma, normal çalışma sayfası ve büyütülmüş soru alanı test edildi.
- Doküman yönetiminde çoklu sınıfa kayıt, düzenleme ve ana sayfa tercihinin doküman/video için korunması doğrulandı.
- Öğretmen ajandası bu yayın öncesinde Chromium ve WebKit'te 1440 ve 390 piksel genişliklerde tekrar denetlendi: kayıt/düzenleme/yeniden açma, net/puan, sıralama, sınıf raporları, tam öğrenme çıktısı ve pazartesi hafta geçişi başarılı.

Bu pakette yeni SQL geçişi gerekmez. Üretim hesapları ve öğrenci kayıtlarında işlem yapılmaz. Yayının tamamlandığını gösteren kanıt, dağıtım durumu ile canlı dosyaların bu Git commit'indeki dosyalarla eşleşmesidir.
