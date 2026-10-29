# Vitrin görselleri ve dosya temizliği — 29 Ekim 2026

## Sonuç

- Cumhuriyet slaytının özgün görsel adresi ve görüntüleme biçimi korundu.
- Diğer dört mevcut CMS slaytı ve üç yedek slayt için yedi sade SVG kapak eklendi: toplam **11,701 bayt (11.43 KiB)**.
- Önceki üç yedek görsel toplamı **1,072,641 bayt**; yeni üç yedek kapak **5,358 bayt**. Bu grubun görsel aktarımı yaklaşık **%99.50** küçüldü. Bu oran tüm sayfanın indirme boyutu değildir.
- **24 kullanılmayan yerel dosya** proje dışına çıkarıldı: **255,517,985 bayt (243.68 MiB)**.
- Büyük test günlüğünün yedeği gzip ile sıkıştırıldı; tüm yedekler geri okunarak SHA-256 doğrulandı. Proje dışındaki toplam yedek boyutu **107,605,837 bayt**.
- Ana sayfa CSS'inde artık etkisi olmayan eski kurallar kaldırıldı: **962 bayt**. 320–1920 px arası 90 etkin-stil karşılaştırmasında sonuçlar aynı kaldı.

## Vitrin davranışı

Görsel düzenlemesi yalnızca denetlenen dört CMS kayıt kimliği ile eski görsel adresi eşleştiğinde uygulanır. Yönetici aynı slayta yeni görsel yüklerse veya yeni slayt eklerse yeni yükleme normal biçimde gösterilir. Başlık, açıklama, makale, video, bağlantı ve süre ayarları değiştirilmedi. Uzak CMS kayıtlarında veya Storage dosyalarında yazma/silme işlemi yapılmadı.

## Projeden çıkarılan dosyalar

| Dosya | Bayt | Gerekçe |
|---|---:|---|
| `assets.zip` | 99,485,729 | Eski yerel varlık arşivi; runtime referansı yok. |
| `js.zip` | 445,411 | Eski yerel kaynak arşivi; benzersiz eski sürümler yedekte korunuyor. |
| `tmp/mentor-first-tests.txt` | 148,869,120 | Kullanılmayan türetilmiş Node test günlüğü. |
| `tmp/character-celebrations-preview.gif` | 4,686,218 | Eski türetilmiş önizleme; runtime referansı yok. |
| `tmp/character-app-frames/000.png` | 163,134 | Eski türetilmiş önizleme karesi; runtime referansı yok. |
| `tmp/character-app-frames/001.png` | 162,462 | Eski türetilmiş önizleme karesi; runtime referansı yok. |
| `tmp/character-app-frames/002.png` | 162,408 | Eski türetilmiş önizleme karesi; runtime referansı yok. |
| `tmp/character-app-frames/003.png` | 162,163 | Eski türetilmiş önizleme karesi; runtime referansı yok. |
| `tmp/character-app-frames/004.png` | 161,928 | Eski türetilmiş önizleme karesi; runtime referansı yok. |
| `tmp/character-app-frames/005.png` | 161,899 | Eski türetilmiş önizleme karesi; runtime referansı yok. |
| `tmp/character-app-frames/006.png` | 161,963 | Eski türetilmiş önizleme karesi; runtime referansı yok. |
| `tmp/character-app-frames/007.png` | 161,589 | Eski türetilmiş önizleme karesi; runtime referansı yok. |
| `tmp/character-app-frames/008.png` | 161,536 | Eski türetilmiş önizleme karesi; runtime referansı yok. |
| `tmp/character-app-frames/009.png` | 161,452 | Eski türetilmiş önizleme karesi; runtime referansı yok. |
| `tmp/character-app-frames/010.png` | 161,532 | Eski türetilmiş önizleme karesi; runtime referansı yok. |
| `tmp/character-app-frames/011.png` | 161,345 | Eski türetilmiş önizleme karesi; runtime referansı yok. |
| `.DS_Store` | 30,724 | macOS klasör görünüm önbelleği. |
| `assets/.DS_Store` | 10,244 | macOS klasör görünüm önbelleği. |
| `gorseller/.DS_Store` | 10,244 | macOS klasör görünüm önbelleği. |
| `indir/.DS_Store` | 8,196 | macOS klasör görünüm önbelleği. |
| `ogretmen-ajandasi/.DS_Store` | 6,148 | macOS klasör görünüm önbelleği. |
| `supabase/.DS_Store` | 6,148 | macOS klasör görünüm önbelleği. |
| `tests/.DS_Store` | 10,244 | macOS klasör görünüm önbelleği. |
| `tmp/.DS_Store` | 6,148 | macOS klasör görünüm önbelleği. |

## Yedek ve kapsam

Geri alma yedeği ve dosya başına SHA-256 manifesti:

`/Users/kemalkocar/.codex/visualizations/2026/10/29/01a1870d-279b-7b22-9455-9441fbaeb073/temizlik-yedegi-20261029-vitrin`

`assets.zip` yerel kopyaları tekrar ediyordu; eski lisans sürümü de Git geçmişinde mevcuttu. `js.zip` içindeki bazı eski sürümler benzersiz olduğundan arşivin tamamı proje dışında korundu. `tmp/mentor-first-tests.txt` kullanılmayan üretilmiş test çıktısıydı; kaynak referansı veya açık dosya kullanımı bulunmadı.

Git geçmişi, geliştirme bağımlılıkları, kullanılan para görselleri, müzikler, mobil çıktılar, geri dönüş SQL dosyaları, kaynak dokümanları ve mevcut diğer çalışmalar korundu. Özel/pasif CMS kayıtlarından kullanılma olasılığı kesin dışlanamayan eski görseller silinmedi. `tmp/` bütünüyle silinmedi.

Arşivler ve `tmp/` zaten yayın dışında olduğundan yukarıdaki MiB değeri **yerel proje alanı kazancıdır**, ziyaretçinin sayfa indirmesi değildir. Ziyaretçi tarafındaki küçülme yeni SVG kapaklardan gelir. Bakım dokümanlarının tamamı `.netlifyignore` ile yayın paketinin dışında tutuldu; dokümanlar proje içinde korunuyor.

## Doğrulama

- İlgili ana sayfa, vitrin, ortak arayüz, içerik akışı, hesap ve performans testleri: **56 geçti, 0 hata**.
- Yedi SVG dosyasının XML yapısı doğrulandı; ana sayfadaki yerel bağlantı ve varlık yollarında eksik hedef veya yinelenen kimlik bulunmadı.
- Yerel tarayıcıda sekiz slaydın gerçek görsel adresleri kontrol edildi: Cumhuriyet özgün Storage adresinde, diğer yedi slayt yeni yerel SVG kapaklarda.
- Yönetici sonradan görsel değiştirirse yeni yüklemenin gösterilmesi, YouTube davranışı ve CMS kayıtlarının değişmemesi testlerle doğrulandı.

Değişiklikler yereldir; canlı siteye yayın yapılmadı.
