# Zar, yazı tura ve simetri atölyesi

## Zar ve para

`ogretmen/matematik.html` içindeki olasılık aracı bir, iki veya üç zarla çalışır. Zarlara, paraya, atış alanına veya ilgili düğmeye dokunmak yeni bir deney başlatır. Klavyeden odaklanan atış alanında Enter veya boşluk kullanılabilir; mevcut D/F kısayolları korunur.

`js/chance-studio.js`, Three.js ile yuvarlatılmış zarları ve iki yüzü gerçek 1 TL görsellerini kullanan kenarı tırtıklı parayı oluşturur. Sonuç yüzü, bitiş dönüşüyle eşleştirilir. Hareket zamana bağlıdır; yükselme/düşüş, azalan sıçramalar ve dönerken zemine temas yüksekliği hesaplanır. Zarların toplamı ayrıca gösterilir. WebGL veya Three.js kullanılamazsa hafif görsel görünümle atış işlevi sürer.

`js/chance-audio.js`, zar teması, para fırlatma ve metal çarpma seslerini Web Audio ile üretir. Ses ancak kullanıcı etkileşimiyle açılır. Ses anahtarı etkin ve sıradaki sesleri susturur. Sekme gizlenince sesler kesilir; araç değişince animasyonlar sonuca bağlanır. Hareketi azalt tercihi kısa sonuç geçişi kullanır.

## Simetri

`ogretmen/simetri.html`, `js/symmetry-studio.js` ve `css/symmetry-studio.css` yeni çalışma alanıdır. Telefonlarda araç kutusu başlangıçta kapalıdır, + düğmesiyle açılır. Araçlar:

- Dikey, yatay, ±45°, serbest açılı veya iki eksenli yansıma; doğruyu merkezinden taşıma, tutamacından döndürme ve açı sürgüsü.
- P/R/S/T örneği, eğik doğru/eşkenar dörtgen ve üçgen örneği.
- Hazır şekiller, etiketli nokta, çokgen, doğru parçası, serbest çizim, piksel boyama ve metin.
- Asıl şekli taşıma, köşelerini ve boyutunu değiştirme; yansımanın anında hesaplanması.
- Öğrenci tamamlama modu: öğrenci çizimleri turuncu kalır ve tekrar yansıtılmaz. Yanıt istenince ayrıca gösterilir.
- Kareli, noktalı, izometrik veya boş zemin; ızgaraya hizalama, köşe adları, dikmeler ve eşit uzaklıklar.
- Geri alma, silme ve seçimi temizleyen 2000 × 1440 PNG çıktısı.

Şekiller Tab ile odaklanabilir ve ok tuşlarıyla taşınabilir; Shift adımı büyütür. Tahtada Enter ilk parçayı seçer, Delete seçili parçayı siler, Ctrl/Cmd+Z geri alır. SVG koordinatları ekran boyutundan bağımsızdır; mobilde dokunma hedefleri ve yazılar büyütülür.

`js/reflection-geometry.js`, derece cinsinden açı ve aşağı yönlü ekran Y eksenini kullanır: 0° yatay, 90° dikey, +45° sağa yükselen doğrudur. Yansımalar afin matris olarak uygulanır; metin ve serbest çizimler de aynı matematiği kullanır.

## Doğrulama

`tests/chance-studio.test.cjs`, `tests/chance-audio.test.cjs`, `tests/reflection-geometry.test.cjs`, `tests/symmetry-studio.test.cjs` ve mevcut matematik arayüz testleri toplam 46 odaklı kontrol içerir. Sonuç/yüz eşleşmesi, temas yüksekliği, ses zamanlaması, çoklu zar, eşzamanlı atış, geri alma, eğik yansıma, öğrenci modu, mobil koordinatlar ve klavye kontrolleri kapsanır.

Yerel masaüstü ve telefon tarayıcı kontrolü yapılır. Değişiklikler bu çalışma klasöründedir; canlı siteye yükleme ayrı bir işlemdir.
