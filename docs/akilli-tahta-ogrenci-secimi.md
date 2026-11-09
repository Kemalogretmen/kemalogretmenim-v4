# Akilli Tahta: Ajandadan Ogrenci Secimi

2026-11-04

## Davranis

- Eklentiler > Ogrenci sec acildiginda mevcut `kemalUserAuth` oturumu beklenir.
- Aktif ogretmen icin `teacher_agenda_states` tablosundan yalniz kendi `user_id`
  satiri okunur. Ajandaya veya veritabanina yazma islemi yapilmaz.
- Ogrencisi olan siniflar kaynak menusune gelir; ajandanin aktif sinifi ilk tercihtir.
- Bulut okunamiyorsa veya ilk bulut satiri henuz olusmamissa, sadece `.owner`
  degeri mevcut kullanici ile ayni olan yerel ajanda kullanilabilir.
- Giris yoksa, hesap uygun degilse veya kayit yoksa elle liste girmek mumkundur.
- Kaynak sinif/elle liste olarak degistirilebilir. Yenile dugmesi ajandayi tekrar okur.
- Secim 1,4 saniyelik yavaslayan isim akisiyla sonucunu gosterir. Harf rozeti,
  kazanan vurgusu ve kalan kisi sayaci vardir. Azaltilmis harekette sonuc aninda gelir.
- Herkese sira gelsin seciliyken havuz bitmeden ayni kayit tekrar secilmez.

## Gizlilik ve Yasam Dongusu

- Ajandadan yalniz sinif adi, ogrenci kimligi ve ad/soyad gorunum modeline aktarilir.
  Veli, saglik, fotograf ve not bilgileri kullanilmaz.
- Ajandadaki ogrenciler eklentinin localStorage kaydina kopyalanmaz. Elle girilen
  liste mevcut davranis gibi tarayicida saklanir; sinif secimi de hatirlanir.
- Hesap degisiminde mevcut ajanda listesi ve sonuc hemen temizlenir. Gec gelen
  eski hesaba ait yanitlar ve kapanan araca ait yanitlar kullanilmaz.
- Animasyon kapatma, kum moduna gecme veya sayfanin gizlenmesinde iptal edilir.
  Yalniz tamamlanan secim havuzdan cikarilir. Surekli animasyon/dinleme yoktur.
- Sunucu semasi veya yeni SQL kurulumu gerekmez; ajandanin mevcut RLS ve auth API'si kullanilir.

## Testler

- `tests/smartboard-roster.test.cjs`: hesap erisimi, sahiplikli yerel yedek,
  sinif/ad projeksiyonu, hesap degisiminde gec gelen yanit ve ilk yerel kayit.
- `tests/browser/smartboard-picker.cjs`: Chromium/WebKit, 390/1440 piksel,
  ornek ogretmen oturumu ve ornek ajanda; otomatik yukleme, sinif degistirme,
  tekrarsiz secim, animasyon, elle liste, cikis, depolama gizliligi ve kapatma.
- Canli hesaba baglanilmadi ve yayin yapilmadi. Tarayici testleri ornek veri ile calisir.

## Grup Olustur ve Puan Tablosu

- Grup olusturma da ayni hesap/sinif kaynagini, sahiplikli yerel yedegi ve cikis
  temizligini kullanir. Secilen grup sayisi hatirlanir; her ogrenci tam bir grupta
  yer alir ve grup buyuklukleri en fazla bir kisi farklidir.
- Grup listeleri de eklenti kaydina kopyalanmaz. Kaynak sinif degistiginde eski
  grup sonucu temizlenir; elle liste girisi kullanilabilir.
- Puan tablosunda tasima, kapatma, arti ve eksi Lucide ISC simgeleri dogrudan
  SVG olarak gomulur. Bu kontroller harici maske dosyalarina bagimli degildir.
- Puan tablosuna 20 takima kadar ekleme ve tek tek kaldirma eklendi. Takim adlari
  ve puanlari saklanir; puani olan takimi kaldirmak icin onay gerekir. En az bir
  takim korunur, coklu takimlar panel icinde kaydirilabilir.
- Tarayici testi geometri simge istekleri engelliyken de puan dugmelerinin SVG
  boyutlarini/gorunurlugunu ve arti/eksi davranisini dogrular.
