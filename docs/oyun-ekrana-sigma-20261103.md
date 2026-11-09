# Oyunların pencereye uyarlanması — 3 Kasım 2026

Yerel düzenleme; yayınlama yapılmadı.

## Kızma Birader

- Oyun başlarken mevcut üst menü ve kısayol araçlarının gerçek boyutu ölçülür. Kalan yüksekliğe parkur, oyuncu/sıra bilgileri ve cevap alanı yerleştirilir. Oyun esnasında sayfanın kayması engellenir; tarayıcı tam ekranına geçmek veya yakınlaştırmayı azaltmak gerekmez.
- Masaüstünde işlem paneli soldadır; sayılar standart 3 sütunlu dizilimini korur, onay tuşu sağdaki ayrı sütunda kalır. Telefonda tuşlar yatay alanı kullanır ve onay altta görünür.
- Tüm oyuncular üstte görünür, etkin oyuncu çerçeveyle ve altındaki sıra satırıyla belirtilir. Parkurun yatay/dikey yönü kendisine ayrılan alanın oranına göre belirlenir.
- Zar, tek 3B model ve tek WebGL renderer ile hazneden tahtaya taşınır. Sonuç bir kez seçilir, üst yüz ve yazılı sonuç aynı sayıya bağlanır. Ağırlıklı zar, sorular ve puan kuralları değiştirilmedi.

## Eşini Bul

- Yaş ve oyuncu ayarları oyun sahnesinin üzerinde kaydırılabilen bir paneldir; açılması sayfa yüksekliğini büyütmez. Ayarları göster/gizle düğmesi panelin üzerinde erişilebilir kalır.
- 7+ yaşta 36 kart korunur. Alan oranına göre 6×6, 9×4 veya 12×3 dizilim seçilir; kart boyutu genişlik ve yüksekliğin her ikisine göre hesaplanır. Telefon dikeyken 6×6, geniş ekranda yatay dizilim daha büyük semboller sağlar.
- Sıra, skor, tüm kartlar ve kısa geri bildirim aynı oyun alanında kalır. Bulunan kartların açık kalması ve sıra değiştirme kuralları korunur.

## Dosyalar

Ortak yerleşim: `css/game-viewport.css`, `js/game-viewport.js`. Oyun entegrasyonları: `oyun/kizma_birader.html`, `oyun/esini-bul-hafiza.html`. Zar: `js/kizma-birader-dice.js`.

## Doğrulama

`tests/game-viewport.test.cjs` yükseklik bütçesini, 4–7+ yaş yerleşimlerini, aygıt boyutu değişimini, eşleşmiş kartların görünürlüğünü ve iki oyunculu sıra değişimini sınar. `tests/kizma-birader-dice.test.cjs` zarın yüzlerini, hareket sürekliliğini ve sonucu sınar.

Tam test paketi: 814/814 başarılı. Tarayıcıda 1280×720, kısa dizüstü 1280×600, tablet 1024×768, telefon 390×844 ve 320×568 boyutlarında ekran sınırları kontrol edildi. Çok küçük ekranlarda kartlar ve tuşlar fiziksel alan kadar küçülür; bütün kartları göstermek için sayıları azaltma veya kırpma yapılmaz.

## Başlangıç düğmesi düzeltmesi

Ayarlar paneline belirgin bir **Oyunu Başlat** düğmesi eklendi. Seçilen yaş ve oyuncu moduyla yeni tur açar, paneli kapatır ve odağı ilk karta taşır. Ayarlar açıkken arka plandaki kartlar etkileşime kapalıdır. İçerik kendi alanında kayar; düğme alt bölümde görünür kalır. Yeni tur açıldığında önceki turun gecikmiş eş kontrolü iptal edilir.

Bu ek değişiklik için 8 odaklı test başarılı; 1280×720 ve 320×568 boyutlarında düğme görünürlüğü ve oyuna geçiş tarayıcıda doğrulandı. Yereldedir, yayınlanmadı.
