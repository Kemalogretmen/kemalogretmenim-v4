# Megalodon boyut ve hareket düzeltmesi

24 Kasım 2026. Yalnızca yerelde hazırlandı; yayın yapılmadı.

- Katalog boyutu 246'dan 172,2'ye indirildi. Dar ekranlarda devreye giren ayrı boyut sınırı da %30 azaltıldı; böylece küçülme yalnız geniş ekranda kalmıyor. Diğer türlerin boyutları değişmez.
- Megalodonun yavaş kuyruk temposunda hafif görünümdeki 12, normal görünümdeki 20 hazır poz seyrek değişiyordu. Bu türe özel poz sayısı 60/90 yapıldı. Mevcut çizim döngüsü, 160 kare ve altı milyon piksel önbellek sınırları korundu.
- Tekil ödül hareketi `jaw-open` oldu. Gövde ölçeği 1 kalır; alt çene açılır, göz ve üst baş sabit kalır. Ağzın içi ve dişleri açılma miktarıyla çizilir; hareket bitince kaynak görsele döner. Ödülün kuyruğu aniden hızlandırıp sonra geri çevirmesine yol açabilen ek faz kaldırıldı.
- Ağız açılırken gövdenin parçalanmaması ve kapatıldığında görüntünün normale dönmesi test edildi. Animasyon bilgileri öğrenci kaydına yazılmaz. Mevcut hareketi azaltma/kapatma tercihleri geçerlidir.
- Değişen dört dosyanın akvaryum sayfasındaki sürüm bağlantıları yenilendi.

## Doğrulama

İlgili dört test dosyasında 185 test geçti. Chrome'da normal ve hafif çizim ile gerçek örnek akvaryumun puan verme akışı kontrol edildi: ağız açıldı ve hareket sonunda kapandı. Aynı zaman aralığındaki 60 örnekte normal görünümde 60, hafif görünümde 52 farklı kuyruk görüntüsü oluştu.

Genel site testinde 1.035 kontrolün 1.034'ü geçti. Başarısız kontrol, bu çalışma kapsamında değiştirilmemiş `ogretmen/belge-studyo.html` dosyasındaki eksik ortak tema başlangıcıyla ilgilidir. Bu sayfada başka bekleyen değişiklikler bulunduğundan dosya bu görev kapsamında değiştirilmedi.
