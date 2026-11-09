# Zıtlar Atölyesi ve Eş Anlam Kuleleri — 3 Kasım 2026

Bu belge ilk sürümün kaydıdır. Güncel oyun kuralları ve doğrulama için [4 Kasım revizyonuna](kelime-oyunlari-20261104.md) bakın.

Durum: Yerel geliştirme tamamlandı. Bu çalışma kapsamında deploy, push veya canlı içerik güncellemesi yapılmadı.

## Sayfalar ve entegrasyon

- `oyun/zitlar-atolyesi.html`: zıt anlamlı sözcükler, saklı görsel yapbozu.
- `oyun/es-anlam-kuleleri.html`: eş anlamlı sözcükler, düşen blokları yönlendirme.
- Mevcut site menüsü ve kısayol çubuğu doğrudan `site.js` ile kullanılır. Oyun için taklit menü yapılmadı.
- İki oyun, katalogda gerçek sayfalarına giden ayrı yeni kartlar olarak eklendi. Kapaklar `js/games-catalog-data.js` üzerinden atanır; bu dosyanın katalog önbellek sürümü güncellendi.
- Paylaşılan dosyalar: `js/word-pairs-data.js`, `js/word-pairs-rules.js`, `js/word-pairs-games.js`, `css/word-pairs-games.css`.
- Ekran bütçesi mevcut `GameViewport` ile gerçek menü ve dock yüksekliğinden hesaplanır. Diğer oyunların düzeni bu çalışma kapsamında değiştirilmedi.

## Oyun kuralları

**Yapboz:** 6 → 9 → 12 parça. Alttan bir parça seçilip zıt anlamlı sözcüğe dokunulur veya parça sürüklenir. Doğru eşleşme görseli aşamalı açar. Yanlışta resim açılmaz, düşünmeyi destekleyen açıklama verilir. Açıkça istenen ipucu doğru çifti ve örnek cümleyi gösterir. Parçaların biçimi ve rengi cevabı ele vermez; tüm parçalar aynı tasarımı kullanır.

**Kuleler:** 3 → 4 → 4 sütun ve 6 → 8 → 10 görev. Yukarıdaki sözcük eş anlamlısının bulunduğu sütuna taşınıp indirilir. Sütuna dokunma, sözcüğü sürükleme veya yön düğmeleri kullanılabilir. Doğru eşleşme blokları patlatır; eşleşen taban sözcüğünün yerine yeni bir çift gelir. Yanlış eşleşme bir blok bırakır, inişi durdurur ve doğru çifti örnek cümleyle öğretir. Öğrenci aynı görevi yeniden dener. Üç hatada destek sunulur ve blok yığılması azaltılır; öğrenci oyundan atılmaz.

**Süre:** Kulelerde rahat iniş 16 saniyeden, hareketli iniş 12 saniyeden başlar. Sonraki bölümlerde süre iki saniye azalır; süresiz seçenek de vardır. Mola ve sekmeden ayrılma sırasında süre işlemez.

**Puan:** İlk denemede 100; hata sonrasında 60; ipucu veya üç hata sonrasında destekle 40. Bir göreve ikinci kez puan verilmez. İki oyuncu aynı sözcükleri ve görev sayısını alır. Erken bitiren rakibinin oyununu sonlandırmaz; beraberlik de kutlanır. Sonuçta tekrar edilmesi gereken çiftler örnek cümleleriyle listelenir.

## Öğretim ve kontroller

2. sınıf için 24 zıt ve 24 eş anlam çifti; 3. sınıf için 34 zıt ve 36 eş anlam çifti bulunur. Cümleler, sözcüğün hangi anlamının ele alındığını açıklar. Düzey etiketleri öğretmenin seçimi içindir; müfredat kapsamı hakkında doğrulanmamış bir iddia içermez. Öğrenci isimleri yalnızca oturum belleğinde tutulur ve HTML olarak yorumlanmaz.

Tahta ve geniş tabletlerde iki bağımsız oyun alanı yan yana çalışır; farklı `pointerId` değerleriyle eşzamanlı giriş desteklenir. Uzun telefon ekranında ilk yapboz bölümü ve kuleler iki yatay bölümde görünür. Küçük telefonlarda ve 9/12 parçalı telefon yapbozlarında iki oyuncunun adı ve puanı görünür kalır; “Alanı aç” düğmeleriyle okunaklı tek oyun alanı kullanılır. Kapalı kule alanının süresi ilerlemez. Parça tepsisi yatay kaydırılabilir; dokunmada yatay kaydırma ile dikey sürükleme ayrılır.

Yapboz klavyede yerel düğmelerle seçilip yerleştirilebilir. Kulelerde 1. oyuncu A/D/S, 2. oyuncu sol/sağ/aşağı okları kullanır. Tek kişilik oyunda oklar da çalışır. Öğrenme sözcüklerinde sitenin yerel TTKB Dik Temel Abece fontu kullanılır. Azaltılmış hareket tercihinde görsel açılmaya devam eder, konfeti ve parçacık efektleri kapatılır.

## Doğrulama

- Tam test paketi: `npm test` — 836 test geçti (0 hata).
- Sözcük bankası benzersizliği, 80 sabitte eşit görev üretimi, puan/hata/ipucu, tüm bölümlerin bitişi, bağımsız oyuncu ilerlemesi ve zaman sınırları.
- UI: dokunarak eşleştirme, iki eşzamanlı sürükleme, iptal/başka oyuncuya bırakma, yanlış sonrası öğretici tekrar, açık başlat düğmesi, mola/menü, sonuçlar ve isimlerin güvenli gösterimi.
- Tarayıcı: 1280×800 ve 1280×720 masaüstü, 1024×768 tablet, 390×844 ve 320×568 telefon, 844×390 yatay telefon boyutları.
- Gerçek tarayıcıda yapbozun üç bölümü iki oyuncuyla bitirildi; eş anlamlılarda yanlış → açıklama → tekrar → doğru → yeni sözcük akışı denendi. Yapbozun ileri telefon seviyelerinde büyük alan ve oyuncu geçişi ayrıca kontrol edildi.
- Bunlar tarayıcı boyutu ve otomatik giriş kontrolleridir; fiziksel akıllı tahta/Android/iOS donanım testi yapılmadı.
- `git diff --check` geçti.

Önizlemeler:
- `/private/tmp/zitlar-atolyesi-onizleme.png`
- `/private/tmp/zitlar-atolyesi-telefon.png`
- `/private/tmp/es-anlam-kuleleri-onizleme.png`

## Görseller ve üretim kaydı

Yerleşik `image_gen.imagegen`, yeni görsel üretimi (düzenleme değil), üç bağımsız çağrı. Her çağrıda `transparent_background: false`; referans görsel kullanılmadı. Üç görsel ayrı ayrı incelendi; ardından Pillow ile yalnızca boyutlandırılıp WebP olarak yeniden kodlandı. Orijinaller korundu.

| Görsel | Projedeki dosya | Orijinal |
|---|---|---|
| Saklı Orman | `assets/word-worlds/sakli-orman.webp` | `/Users/kemalkocar/.codex/generated_images/01a09cdd-fae0-7990-ae73-4dc0647eed0c/exec-1c8ac7f8-39a2-4e91-847a-37f9939b404f.png` |
| Mercan Koyu | `assets/word-worlds/mercan-koyu.webp` | `/Users/kemalkocar/.codex/generated_images/01a09cdd-fae0-7990-ae73-4dc0647eed0c/exec-966a2700-618e-43c5-b68b-9a0f27eb724d.png` |
| Yıldız Bahçesi | `assets/word-worlds/yildiz-bahcesi.webp` | `/Users/kemalkocar/.codex/generated_images/01a09cdd-fae0-7990-ae73-4dc0647eed0c/exec-5956d5b1-1aea-4990-9ef1-c4df0991c9a4.png` |

Yapboz katalog kapağı `assets/game-covers/zitlar-atolyesi.webp`, orman sahnesinin 640×426 sürümüdür. Kulelerin kapağı `assets/game-covers/es-anlam-kuleleri.svg` ve oyun içi parçalar/bloklar HTML/CSS/SVG ile çizildi; yapay zekâ raster görseli değildir.

### Kullanılan tam istemler

**forest**

Use case: illustration-story. Asset type: hidden picture for an elementary school jigsaw game. Create a richly detailed yet clear charming 3D storybook toy diorama of a friendly woodland village: a small treehouse with a warm glowing round window, a curved wooden footbridge crossing a turquoise stream, friendly rabbit and fox sitting peacefully with books, mushrooms, flowers, a little waterfall, soft rounded trees. Bright warm lavender, mint, coral and golden sunlight; polished tactile clay materials, gentle depth and soft shadows, delightful original child-safe artwork. Landscape 3:2 composition with interesting objects distributed across ALL parts, including corners, so every puzzle piece reveals something. No words, letters, numbers, logos, puzzle outlines, borders or watermark. One coherent full scene.

**ocean**

Use case: illustration-story. Asset type: hidden picture for an elementary school jigsaw game. Create a cheerful polished 3D storybook underwater diorama: small yellow research submarine at center-right, a friendly sea turtle gliding at left, colorful coral gardens, small fish, a kind octopus near a treasure chest full of pearls, a sunlit surface with a tiny island in the distance. Rounded tactile toy-like shapes, turquoise water, lavender and peach corals, yellow accents, soft underwater light, layered depth, clear friendly original composition. Landscape 3:2 with interesting discoveries throughout all regions and corners. No words, letters, numbers, logos, puzzle outlines, borders or watermark. One coherent full scene.

**space**

Use case: illustration-story. Asset type: hidden picture for an elementary school jigsaw game. Create a whimsical premium 3D storybook space garden: two small friendly robots tending colorful glowing plants on a tiny round moon, a rounded coral rocket parked beside a small glass greenhouse, a ringed lavender planet, a smiling tiny astronaut waving, stars and floating islands in a gentle indigo and teal sky. Tactile clay toy materials, soft cinematic glow, playful and safe, beautiful depth, readable original family-friendly artwork. Landscape 3:2 with interesting objects distributed across all puzzle regions including corners. No words, letters, numbers, logos, puzzle outlines, borders or watermark. One coherent full scene.
