# 21 Ekim 2026 · Eğitici oyunlar toplu yayın paketi

Kullanıcı Çarpım Kanatları'nı ve sitedeki bekleyen diğer değişiklikleri tek üretim yayınıyla canlıya almayı açıkça istedi.

## Kapsam

- Çarpım Kanatları: 10 çarpma adası, tek/iki oyuncu, bağımsız dokunmatik atış, 5 can ve patlama jokeri, katmanlı kapak/ayar/harita, aynı adaya zoom ve seçili tablolardan 10 soruluk dengeli karışık tur.
- Eşini Bul: sembollü 3B kartlar, eşleşen kartların açık ve görünür kalması, yoğun seviyelerde ekrana sığan tahta, sabit sıra/puan göstergesi, mobil yerleşim.
- Oyun kataloğu: Çarpım Kanatları ve yenilenmiş Eşini Bul kartları, yeni etiketleri, yayın tarihleri ve tanıtım sıralaması. Ana sayfa içerik akışı mevcut katalog verisini kullanır.
- Mevcut `79ac150` akvaryum/anlık eşitleme/erişim onarımı tabanı korunur. Netlify paneli bu tabanın zaten Published olduğunu doğruladı; bu paket için ek SQL, öğrenci/puan kaydı veya APK değişikliği gerekmez.

## Yayın öncesi kontrol

- `npm test`: 369/369 başarılı (Çarpım Kanatları'nın 22 testi dahil).
- Değişen üç HTML sayfasının satır içi betikleri derlendi; 13 yerel CSS/JS/görsel bağlantısının tamamı mevcut. İki yeni oyun betiğinin sözdizimi ve diff kontrolü geçti.
- Yerel gerçek tarayıcıda Eşini Bul'un 36 kartlık iki oyunculu seviyesinde bir eş açıldı: iki kart açık/görünür kaldı, puan ve sıra göstergesi korundu. Dar görünüm ayrıca kontrol edilir.
- Önceki geliştirme kontrolleri: Çarpım Kanatları masaüstü, 390×844 ve 320×568 ölçülerinde; karışık seçim, aynı soruyla iki oyuncu, boş seçim, joker, iptal ve tekrar oynama testleri.
- Netlify takım bakiyesi yayın öncesinde 283,7 dönem kredisi + 22 süresiz kredi; panel tek üretim yayınının 15 kredi olduğunu gösterdi. Ek kredi veya ücretli plan satın alınmaz.

## Paketleme

Tek Git commit/push ile mevcut `main` → Netlify otomatik üretim yayını kullanılır. Ayrı manuel deploy tetiklenmez. Geçici `tools/akvaryum-dekor-onizleme.html` dosyası yerelde tutulur, pakete alınmaz. Geliştirme notları ve testler Netlify yayın içeriğine dahil edilmez.

Bu belge paket kapsamını ve ön kontrolü kaydeder; üretimde yayınlandığını doğrulayan kayıt Netlify dağıtımındaki Published durumu ve ilgili commit'tir.
