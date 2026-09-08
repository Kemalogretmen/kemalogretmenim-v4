# Matematik Vadisi — site entegrasyonu

Oyun: `/oyun/matematik-vadisi.html`; katalog: `/oyun/oyunlar.html`.

## Davranış

- Misafir doğrudan oynar. Kalıcı kayıt için mevcut site üyeliği kullanılır.
- Her hesapta ayrı dünyalar, isim/sınıf/işlem seçimi, envanter, görevler, adalar, yapılar ve kuşanılmış karakter görünümleri tutulur.
- Kahraman 8 tamamlanan görevde bir seviye alır. Pelerinler 2/3/5, başlıklar 3/6. seviyelerde açılır. İpucu kullanan çocuk aynı geliştirme hakkını kazanır.
- Sınıf ve seçilen işlem korunur. Klasik cevap seçimi, kaynak öyküleri, nesneyle cevap oluşturma, eksik sayıyı tuşlarla yazma ve üst sınıflarda hatalı hesabı düzeltme vardır.
- Başlangıç kaynakları yeniden doğmaz. Ev, mağara, elmas zırh, portal, 5 Blaze, 5 Enderman, 5 portal adımı ve 5 ejderha vuruşundan oluşan macera sonrasında yeni adalara devam edilir.
- Alternatif sakin yol: ev, köprü, 3 tavşan, 3 fidan, fenerin 5 ışığı; can kaybı yoktur.
- Yeni adalarda kulübe, kule ve bahçe yerleştirilebilir. Kısa projeler 20/30/45 saniye sürer; mola sırasında da tamamlanır. Ses isteğe bağlıdır ve başlangıçta kapalıdır.
- Günlük 15 dakika varsayılanı pilot tasarım tercihidir; 10/15/20/30 dakika seçilebilir. Sayaç dünyaya bağlıdır, görünür etkin süreyi sayar. Şifreli ebeveyn kilidi veya hesap genelinde değiştirilemez bir sınır değildir.
- Bu sürüm hesap başına 100 dünya, dünya başına 500 ek ada ve toplam 1 MB kayıt sınırı uygular. Gerçekten sınırsız depolama vaat edilmez.

## Kayıt sözleşmesi

Mevcut Supabase `user_content_progress` tablosu kullanılır. Ayrılmış kayıt anahtarı `content_type=game`, `content_id=matematik-vadisi:worlds:v1`. Dünya verisi `detail_json.meta.gameState` altındadır. Sunucudaki sahiplik kuralları `supabase-kullanici-profilleri.sql` içindedir; yeni tablo gerekmiyor.

Yazma, kullanıcının kendi oturumu ve `updated_at` karşılaştırmasıyla yapılır. Başlangıçta benzersiz anahtarlı insert, sonraki kayıtlarda revision filtresi olan update kullanılır. Başka cihazla çakışmada otomatik üstüne yazılmaz: kullanıcı hesaptaki kaydı açar veya kendi dünyasını ayrı kopya olarak korur. Genel `content-progress.js` bu ayrılmış kaydı okumaz/yazmaz.

Bağlantı hatasında yalnız o hesap kimliğine ait bekleyen değişiklikler yerel kurtarma taslağında tutulur. Sunucu onayı alınmadan 'hesaba kaydedildi' denmez. Oturum değişince önceki hesabın dünyası temizlenir. Giriş bağlantısına bilinçli tıklanırsa misafir dünyası geçici sessionStorage taslağında taşınır; hesaba ekleme ayrıca kullanıcı eylemidir. Giriş dönüş yolu yalnız oyun sayfasına izin verir.

## Doğrulama ve sınırlar

`npm ci && npm test`: Node testleri, simüle edilmiş DOM/canvas ile oyun mantığı ve taklit Supabase istemcisiyle kayıt senaryoları. Gerçek tarayıcı ekranı/görsel doğrulaması veya gerçek üye oturumuyla bulut yazma testi yerine geçmez.

Kontroller: 15.000 temel matematik sorusu, sınıf/işlem sınırları, her iki görev yolunun tamamlanması, sonrasında ada inşası, kaynakların tükenmesi, yanlış cevaptan sonra yeniden deneme, karakter kuşanma/yükleme, misafir açılışı, hesap izolasyonu, çevrimdışı taslak kurtarma ve kayıt çakışması.

Pedagojik olarak pilot kullanıma yönelik tasarımdır; tüm çocuklar için kanıtlanmış etkililik iddiası yoktur. Küçük öğrenci gruplarıyla yönerge anlaşılması, bağımsız çözüm, mola davranışı ve kaygı gözlemlenmelidir. Her etkileşimde soru sorulması bazı çocukları yorabilir; bu gözlem özellikle önemlidir.
