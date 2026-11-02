# Akilli Tahta: Tam Sayfa Kum

Tarih: 2026-11-01

## Referans

[Sensory SandBox](https://www.sensoryapphouse.com/sandbox/) ve sayfaya gomulu
[canli uygulama](https://www.sensoryapphouse.com/sandbox-pwa/index.html) incelendi.
Tam yuzey kum, dokunarak iz acma, renk ve iz genisligi ayarlari referans alindi.
Ucuncu taraf kodu veya dokusu kopyalanmadi; dokular yerelde uretiliyor.

## Degisiklikler

- Ahsap cerceve ve ic bosluk kaldirildi. Kum, serbest/A4/A3 sayfanin tamamini kaplar.
- Kum ve beyaz tahta ayni mantiksal sayfa koordinatlarini kullanir. Yakinlastirma
  rasteri yeniden olusturmaz; parmak, imlec ve iz ayni noktada kalir.
- Parmak, tirmik, yildiz, duzleme, harf, ses ve geri alma araclari korundu.
  Harf secimi mevcut kum arac kutusuna tasindi. El araci kum sayfasini kaydirir.
- Tane boyutu, alti renk, ozel renk ve karisik renkli taneler eklendi.
  Renk/doku degisimi mevcut izlerin alfa maskesini ve geri alma gecmisini korur.
- Sanal cizgili, kareli ve uc cizgili yazi kilavuzu ile aralik ayari eklendi.
  Kilavuzlar isaretci olaylarini engellemez ve kaldirilabilir.
- Renk, tane ve kilavuz tercihleri mevcut yerel tahta kaydina eklenir.
  Kum cizimleri eskisi gibi oturumluk kalir; PNG kaydet ve yazdir kum yuzeyini de icerir.
- Doku 256x256 onbellek karosudur, aktif raster en fazla 2,2 milyon piksel,
  geri alma en fazla alti kucultulmus kopyadir. Yeni surekli animasyon veya ag istegi yoktur.

## Dogrulama

- `npm test`: 716 test basarili.
- `tests/browser/smartboard-sand-page.cjs`: Chromium/WebKit, telefon/masaustu;
  kenardan kenara kum, dogal dokunma, izleri koruyan malzeme degisimi, geri alma,
  kilavuz, kalici tercihler, A4, yakinlastirma, imlec hizasi, kaydirma ve PNG.
- `tests/browser/whiteboard-mobile.cjs`: 320/390 piksel, Pointer Events ve eski
  Touch Events yedegi, font, mod, boyut degistirme ve kisayol kontrolleri.
- `tests/browser/smartboard-studio.cjs`: fosforlu/karakalem ve mevcut eklentiler.

Fiziksel okul tahtasinda olcum yapilmadi; bu kontroller yerel tarayici ortamindadir.
Canli sunucuya yayin yapilmadi.

## 2026-11-02: Yazma Calismasi

- Acilista sayfa ve gorunen alan ortalanir. Kum kontrol dugmeleri gorunur alanda kalir.
- Temizle, yuzeyden gecen bir mastarla 850 ms icinde kumu duzler. Islem geri alinabilir;
  boyut/mod degisimi, geri alma ve sayfanin gizlenmesi animasyonu temizce sonlandirir.
  Azaltilmis hareket tercihinde silme aninda tamamlanir.
- Kilavuz sayfayi tekrar eden cizgiler yerine tek, buyuk, ust katman satiridir.
  TTKB fontunun olculen buyuk/kucuk harf yukseklikleri ortak taban cizgisine yerlestirilir;
  alt uzantilara bosluk ayrilir. Buyuk, kucuk ve birlikte secenekleri Turkce I/i donusumunu korur.
- Kum sesi ozgun granuler surtunme WAV dosyasiyla degistirildi. Sadece hareket ses uretir;
  hiz arttikca sesin siddeti ve dokusu degisir, duran parmak ses uretmez.
- `npm test`: 722 test basarili. Chromium ve WebKit'te 390/1440 pikselde ortalama,
  TTKB harf hizasi, yerel ses cozumleme/calma, durunca sessizlik, mastar ve geri alma dogrulandi.

Kaynaklar: [TTKB temel yazi fontu](https://ttkb.meb.gov.tr/www/ilkokul-turkce-dersi-ogretim-programi-ve-ilk-okuma-yazma-ders-kitabi039nda-yer-alan-alfabe-ve-rakamlar-yayimlandi/icerik/610),
[TTKB SSS: uc cizgi / iki aralik](https://ttkb.meb.gov.tr/www/sss.php).
