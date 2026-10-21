# Hesap erişim arızası — 21 Ekim 2026

**Son durum: Yeniden başlatma sonrası servisler toparlandı. Yaklaşık 12:40 Türkiye saati itibarıyla panel Healthy; Auth sağlık ve sıfır sonuçlu profil REST kontrolü HTTP 200. Gerçek kullanıcı parolasıyla giriş tarafımızdan denenmedi.**

## Doğrulanan durum

Kullanıcı canlı akvaryum ve hesap girişinde hesap bilgilerinin alınamadığını bildirdi. İnceleme salt okunur yapıldı; hesap, şifre, puan, rol, izin ve veritabanı şeması değiştirilmedi. Site yayını yapılmadı.

- Canlı `giris.html` HTTP 200 yanıtlıyor (ikinci ölçüm 0,79 saniye).
- Projenin `/auth/v1/settings` ucu HTTP 504 `Gateway Timeout` yanıtladı (8,82 saniye).
- `/auth/v1/health` ve sıfır sonuç isteyen `/rest/v1/user_profiles?select=id&limit=0` istekleri iki ayrı kontrolde zaman aşımına uğradı. Gerçek kullanıcı kaydı sorgulanmadı, parola denemesi yapılmadı.
- Supabase yönetim panelindeki doğru projenin durumu **Unhealthy**. Son 60 dakika görünümünde Auth için 28 isteğin 28'i hata olarak listelendi; Postgres ve API Gateway hataları da vardı.
- Observability ekranındaki bağlantı ölçümü `Connection terminated due to connection timeout` hatası gösterdi. Bu nedenle gerçek eşzamanlı bağlantı sayısı doğrulanamadı.
- Proje Free/Nano, eu-west-1. Altyapı özet grafikleri yüksek CPU örnekleri gösteriyor; bunlar tek başına arızanın kesin kök nedenini kanıtlamıyor. Disk özetinde %4 kullanım gösterildi.

Kanıt ekranı: `tmp/seasonal-preview/supabase-unhealthy-20261021.png`.

## Sonuç ve sonraki adım

Hesap ve profil servisinin yanıt vermemesi doğrulandı. Bu arıza yalnız akvaryum arayüzüne veya Netlify'daki sayfa dağıtımına özgü değil. Önceki yerel açılış zaman aşımı iyileştirmeleri, yanıt vermeyen sunucuyu tek başına onaramaz. Kullanıcının gerçek hesabıyla başarılı giriş henüz doğrulanmadı.

[Supabase'in resmi belgesi](https://supabase.com/docs/guides/troubleshooting/project-status-reports-unhealthy-services), bu durumda veritabanı yeniden başlatmayı olası geçici çözüm olarak açıklıyor. Yeniden başlatma birkaç dakikalık servis kesintisi yaratacağından kullanıcıdan bu somut işlem için onay istendi. Onay gelmeden yeniden başlatma uygulanmadı; ücretli plan değişikliği yapılmadı.

Onay sonrası tek yeniden başlatma, panelde sağlık durumunun düzelmesi ve sınırlı sağlık/profil bağlantı kontrolleri ile doğrulanmalı. Tekrarlarsa kaynak/sorgu yükü ayrıca incelenmeli; yeniden başlatmanın kalıcı kapasite çözümü olduğu iddia edilmemeli.

## Onaylanan yeniden başlatma

Kullanıcı yeniden başlatmayı açıkça onayladı. 21 Ekim 2026 yaklaşık 12:25 Türkiye saati itibarıyla doğru projenin **Restart project → Restart** işlemi uygulandı ve panel **Restarting** durumuna geçti. Veri/şema değişikliği, site yayını veya ücretli plan değişikliği yapılmadı.

- Yaklaşık 12:29'da panel yeniden proje özetine döndü ancak durum **Unhealthy** kaldı.
- Sonraki sağlık ve sıfır sonuçlu profil kontrolleri HTTP 502 `Bad Gateway` yanıtladı. Yaklaşık 12:36–12:37 kontrolü de her iki uçta zaman aşımına uğradı.
- Veritabanı sağlık raporunda bellek/CPU için veri yok, bağlantı/IO ölçümleri yüklenemiyor. Veritabanı boyutu raporlanıyor; bu tek başına Auth ve REST servislerinin sağlıklı olduğunu göstermiyor.
- Tek yeniden başlatma erişimi henüz düzeltmedi. Tekrar yeniden başlatma, duraklatma, ücretli plan veya şema değişikliği uygulanmadı. Supabase desteğine gönderilmek üzere aşağıdaki yerel taslak hazırlandı; kullanıcı gönderim onayı vermediğinden gönderilmedi.

## Supabase destek mesajı taslağı (gönderilmedi; toparlanma öncesi hazırlanmıştı)

**Subject:** Production project remains unhealthy after one restart; Auth and REST unavailable

Project ref: `mwxcvlyrkptxrwgkmqum` (kemalogretmenim). Region: eu-west-1, Free/Nano.

On 2026-10-21, all account sign-ins on the production site became unavailable. The dashboard reported Unhealthy. Auth settings returned HTTP 504 Gateway Timeout; Auth health and a zero-result REST query also timed out. The dashboard could not retrieve database connection metrics (connection timeout).

With the owner's authorization, we performed one Restart project at approximately 12:25 Europe/Istanbul (09:25 UTC). The dashboard showed Restarting, then returned to Unhealthy. Follow-up requests to `/auth/v1/health` and `/rest/v1/user_profiles?select=id&limit=0` returned HTTP 502 Bad Gateway and still timed out at approximately 12:36–12:37 Europe/Istanbul. No user rows were queried and no passwords, API keys or user data are included in this report.

Please investigate the project's database and service startup/health at the infrastructure level and restore Auth and REST availability. We have not paused/recreated the project, changed the plan, or altered database schema/data.

## Toparlanma doğrulaması

Yaklaşık 12:39–12:40 Türkiye saatinde proje paneli **Healthy** oldu. Anlık altyapı özetinde RAM %52, 6/60 bağlantı ve disk %4 görünüyordu; CPU sıfır örneği kalıcı yük ölçümü sayılmadı.

- `/auth/v1/health`: HTTP **200**, yaklaşık **0,73 saniye**, GoTrue yanıtı.
- `/rest/v1/user_profiles?select=id&limit=0`: HTTP **200**, yaklaşık **1,30 saniye**, boş sonuç. Gerçek kullanıcı kaydı okunmadı.
- Canlı giriş sayfası açıldı ve bağlantı hatası göstermedi. Test tarayıcısında kullanıcı oturumu bulunmadığından gerçek hesapla başarılı giriş iddia edilmiyor; kullanıcıya mevcut sayfasını yenileyip girişini tekrar denemesi bildirildi.
- Kanıt: `tmp/seasonal-preview/supabase-healthy-20261021.png`.

Tek yeniden başlatma sonrası servis erişimi geri geldi. Destek mesajı gönderilmedi. Kalıcı arıza nedeni belirlenmedi; veri/şema/plan değişikliği ve site yayını yapılmadı.

## Aynı gün ayrıntılı inceleme sonucu

Sonraki denetimde `save_aquarium_account` fonksiyonunun uygulama sürüm çakışmasını `40001` ile bildirdiği ve son 24 saatte 4.812.654 adet `Aquarium revision conflict` günlüğü ürettiği bulundu. Bu, PostgREST'in belgelenmiş yeniden deneme döngüsüyle örtüşüyor. Canlı fonksiyon PT409'a geçirildi; erişim ve sürüm koruması korundu. Kaynak baskısı ve diğer iyileştirmeler için [ayrıntılı denetim raporuna](supabase-denetimi-2026-10-21.md) bakın. Bu bulgu ilk inceleme sırasında bilinmiyordu.
