# Oyun Merkezi İncelemesi ve Geliştirme Rotası

## Uygulanan ortak geliştirmeler

- Katalogtaki her yayınlı oyun için yaş/sınıf aralığı, kısa oturum süresi ve hedef beceri etiketi eklendi.
- Katalogta kategori hatası olan **Besin Avcısı** matematikten fen kategorisine taşındı.
- Katalogtan oyun açma olayı anonim olarak kaydediliyor. İlk üç oyun, 30 günlük benzersiz oynama, anlamlı devam etme (20 saniye+) ve tamamlama sinyallerinden oluşan puanla seçilecek.
- Veri henüz yeterli değilse “En Çok Oynanan” iddiası yapılmaz; bunun yerine farklı becerilere hitap eden üç başlangıç oyunu gösterilir.
- Kelime Avcısı, Hece Köprüsü, Ölçüm Atölyesi, Sesli Balonlar, Matematik Masa Tenisi, Uzayda Matematik Avı, Saat Oyunu, Şekil Avcısı 3D, Kızma Birader ve Halat Çekme gerçek oyun bitişini anonim toplama bildirir.

## Popülerlik algoritması

Puan = benzersiz oyuncu + (başlatma × 0,25) + (20 saniye üzeri aktif oynama × 0,75) + (tamamlama × 2)

- Aynı oturumda aynı oyunun tekrarları tek oyuncu olarak sayılır; hızlı tekrar tıklamalar listeyi şişiremez.
- Sadece oyun yolu, rastgele oturum kimliği ve olay türü işlenir. İsim, cevap, skor, yaş ve kullanıcı profili öneri sıralamasına girmez.
- Veritabanı fonksiyonu yalnızca toplu sonuç döndürür; ham oturum verisini herkese açmaz.

## Tek tek oyun incelemesi

| Oyun | Güçlü taraf | Dikkat / öğrenme için sonraki geliştirme |
| --- | --- | --- |
| Dikkat Dedektifi | Yaşa göre zorluk ve kısa tur yapısı çok uygun. | Günlük üç görev ve yanlış seçimden sonra görsel ipucu eklenmeli. |
| Matematik Vadisi | Karakter, dünya kurma ve kalıcı ilerleme en güçlü uzun dönem motivasyon modeli. | İlk 3 dakikayı tek görevlik rehberle sadeleştirip her bölgeye görünür koleksiyon hedefi eklenmeli. |
| Bilgi Düellosu | Takım, joker ve süre sınıf içi katılımı iyi destekliyor. | Soru sonunda “neden doğru?” kartı ve dengeli takım/solo modu eklenmeli. |
| Sesli Balonlar | Ses farkındalığı için doğrudan, hızlı geri bildirimli. | Sesi işitme güçlüğü yaşayan çocuklar için renk/şekil kodu ve yavaş mod eklenmeli. |
| Hece Köprüsü | Karakterli ilerleme ve hedef metaforu güçlü. | Yanlışta köprüyü geri alma yerine iki seçenekli mini ipucu verilmeli. |
| Kelime Avcısı | Uzay teması, zamanlı görev ve hedef vurma dikkat çekici. | Kelimeyi resimle ilişkilendiren başlangıç seviyesi ve süre kapatma seçeneği eklenmeli. |
| Ölçüm Atölyesi | Sınıfa, ölçü türüne ve göreve göre kapsamlı. | Cetvel/terazi gibi sürükle-bırak mikro görevleriyle soyut sorular somutlaştırılmalı. |
| Uzayda Matematik Avı | Tek/iki oyuncu seçimi ve aksiyon teması yüksek motivasyon sağlıyor. | İşlem hatasında çözüm adımı, hız yerine doğruluk serisi ödülü eklenmeli. |
| Şekil Avcısı 3D | 3B uzamsal düşünme ve düello modu ayrıştırıcı. | Döndürülebilir önizleme ve renk dışı doku işaretleri eklenmeli. |
| Kızma Birader Matematik Parkuru | Tanıdık oyun döngüsü matematiğe doğal bağlanmış. | Tur bekleme süresini azaltacak hızlı soru ve işbirlikli takım modu eklenmeli. |
| Besin Avcısı | Sağlıklı yaşam teması disiplinler arası güçlü bir alan. | Kategori etiketi fen olarak düzeltildi; sonraki adımda tabak oluşturma ve gerekçeli seçim görevi eklenmeli. |
| Ritmik Sayma Macerası | Geniş sınıf aralığı ve ileri/geri yön seçimi iyi. | Ritim sesini kapatma, görsel sayı doğrusu ve kişisel tempo seçeneği eklenmeli. |
| Astro-Matematik | Sınıf seviyesi ile işlem türünü ayırması doğru yapı. | Toplama adı katalogda yanıltıcı; “Astro-Matematik” adıyla ve çıkarma görünürlüğüyle sunulmalı. |
| Halat Çekme Arenası | İki oyuncu/bilgisayar seçeneği sınıf enerjisini yükseltir. | Hızlı tıklama yerine sırayla yanıt ve erişilebilir klavye modu öncelikli olmalı. |
| Toplama Testi | Çok kısa bir tekrar için düşük eşikli. | Harici Wordwall bağımlılığı yerine yerel sürüm veya belirgin “harici etkinlik” etiketi gerekir. |
| Cumhuriyet Yolculuğu | Harita ve hikâye akışı sosyal bilgiler için etkili. | Tarihsel kaynak/mini bilgi kartı ile soru sonrası pekiştirme eklenmeli. |
| Saat Sahnesi | 12/24 saat ve kategori ayarları güçlü. | Analog saatte ibreleri sürükleme ve “günlük rutin” senaryoları eklenmeli. |
| Para Marketi | Gerçek yaşam bağlamı ve üç mod seçimi yüksek değerli. | Miktarı oluşturarak ödeme, bütçe ve para üstü açıklaması eklenmeli. |
| Kütle Tartma | Somut terazi etkileşimi öğrenme hedefiyle uyumlu. | Sürükle-bırak ağırlıklar, tahmin sonra kontrol döngüsü ve sınıf seviyesi seçimi eklenmeli. |
| Matematik Masa Tenisi | Çok oyunculu sınıf turnuvası ve işlem ayarları güçlü. | Skor baskısını azaltan işbirlikli ralli modu ve cevap için düşünme süresi eklenmeli. |
| Eşini Bul | Yaşa bağlı kart sayısı, iki oyuncu ve ses seçeneği iyi tasarlanmış. | Kart temaları (hayvan, bilim, sözcük) ve hata sonrası kısa önizleme eklenmeli. |
| Işıklı Notalar | Görsel-işitsel hafıza birlikte çalışıyor. | Renk körlüğü için şekil/sayı eşleri ve “sessiz tekrar” modu eklenmeli. |
| Örüntü Treni | Yaşa göre örüntü karmaşıklığı çok iyi ilerliyor. | Çocukların kendi vagon dizisini üretip sınıf ekranında göstermesi eklenmeli. |
| Gölge Dedektifi | Eşleştirme mekaniği, yaş seviyesi ve döndürme zorluğu iyi. | Nesne ile gölge arasında dönüş animasyonu ve ipucu jetonu eklenmeli. |
| Minik Kodlamacı | Algoritmik düşünme, küçük yaş için somut yön tuşlarıyla doğru kurulmuş. | Kod bloklarını sıralama, adım adım yürütme ve çözümünü paylaşmadan kaydetme eklenmeli. |
| Geometri Kaşifi | Özellik, açınım ve doğru/yanlış modları konu çeşitliliği sağlıyor. | Gerçek nesne fotoğrafları, döndürme ve her yanlış için açılır açıklama eklenmeli. |

`gorsel-hafiza.html` güncel Işıklı Notalar sayfasına yönlendiren eski bağlantıdır; katalogta ayrı oyun olarak gösterilmemelidir. `kizma_birader_eski.html` de eski sürüm olarak katalog dışında tutulmalıdır.

## Yeni oyun önerileri

1. **Masal Makinistleri** — Çocuk karakter, mekân ve çözüm kartlarını seçerek dört sahnelik hikâye kurar. Okuma-yazma, yaratıcılık ve sözlü anlatımı destekler; içerik yalnızca cihazda kalır, paylaşım veya açık sohbet olmaz.
2. **Doğa Dedektifleri** — Park, deniz ve mahalle haritalarında su tasarrufu, geri dönüşüm ve canlıları koruma görevleri. Seçeneklerin sonucu kısa animasyonla görünür; rekabet yerine ortak “gezegeni iyileştirme” hedefi kullanır.
3. **Ritim Adası** — Sayma, hece ve kesir ritimlerini vurmalı çalgı dizileriyle eşleştiren sessiz modlu oyun. Kısa yaratım turu sonunda çocuk kendi ritmini oluşturur.
4. **Sınıf Kaçış Odası** — Öğretmenin ekrandan açtığı, dört kişilik yerel ekiplerin farklı beceri bulmacalarını çözerek aynı sandığı açtığı oturum. Çevrimiçi yabancılarla iletişim içermez.

## Tasarım ilkesi

Yeni oyunlarda tek başına “daha çok ekran süresi” hedeflenmemeli. Çocuğa seçim, ustalaşma, yaratıcılık, güvenlik ve birlikte oynama fırsatı veren kısa döngüler kurulmalı. UNICEF’in çocuk esenliğine yönelik RITEC çerçevesi de özerklik, yeterlik, duygu, ilişki, yaratıcılık, güvenlik ve kapsayıcılığı tasarım hedefi olarak önerir.

Kaynak: [UNICEF RITEC Design Toolbox duyurusu](https://www.unicef.org/innocenti/press-releases/unicef-unveils-design-toolkit-digital-creators), [UNICEF çocuklar ve çevrimiçi oyun rehberi](https://www.unicef.org/childrightsandbusiness/workstreams/responsible-technology/online-gaming).
