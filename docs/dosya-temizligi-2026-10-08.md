# Yerel dosya temizliği — 8 Ekim 2026

Ölçümler macOS `du -sk` ile ayrılan disk alanına göredir. MiB = 1.048.576 bayt. Tarayıcının bir sayfada indirdiği boyutu göstermez.

| Bölüm | Önce | Sonra |
|---|---:|---:|
| Proje klasörü toplamı | 547.4 MiB | 278.8 MiB |
| Git veritabanı (`.git`) | 290.0 MiB | 170.0 MiB |
| Geliştirme bağımlılıkları (`node_modules`) | 32.3 MiB | 32.3 MiB |
| Git ve bağımlılıklar dışındaki proje dosyaları | 225.2 MiB | 76.5 MiB |

**Kazanç: yaklaşık 268.6 MiB (%49.1).** Bu raporun birkaç KiB boyutu yuvarlamayı etkilemez.

## Silinen dosyalar

14 dosya; dosya içerikleri toplamı 148.63 MiB.

| Dosya | MiB | Gerekçe |
|---|---:|---|
| `downloads/kemal-ogretmenim-v2.apk` | 69.091 | Eski Android dağıtımı; yerel dosyaya kod referansı yok, güncel indirme GitHub Releases üzerinden. |
| `downloads/kemal-ogretmenim-v4.apk` | 71.931 | GitHub Releases üzerindeki güncel APK ile boyut ve SHA-256 birebir aynı; sitedeki bağlantı zaten GitHub’a gidiyor. |
| `assets/akvaryum/arka-planlar/mercan-resifi.png` | 2.542 | Web sürümü JPEG olarak kullanılıyor; özgün PNG proje dışındaki üretim arşiviyle SHA-256 düzeyinde aynı. |
| `assets/akvaryum/arka-planlar/mavi-magara.png` | 2.327 | Web sürümü JPEG olarak kullanılıyor; özgün PNG proje dışındaki üretim arşiviyle SHA-256 düzeyinde aynı. |
| `assets/akvaryum/arka-planlar/yosun-ormani.png` | 2.366 | Web sürümü JPEG olarak kullanılıyor; özgün PNG proje dışındaki üretim arşiviyle SHA-256 düzeyinde aynı. |
| `tmp/2b-atolye-onizleme.png` | 0.099 | Bir defalık geliştirme/baskı önizleme çıktısı; site tarafından kullanılmıyor. |
| `tmp/pdfs/sinav_basari_karnesi_ornek-1.png` | 0.218 | Bir defalık geliştirme/baskı önizleme çıktısı; site tarafından kullanılmıyor. |
| `tmp/integrate-math-engine.py` | 0.004 | Bir defalık geliştirme/baskı önizleme çıktısı; site tarafından kullanılmıyor. |
| `tmp/update-roaming.py` | 0.009 | Bir defalık geliştirme/baskı önizleme çıktısı; site tarafından kullanılmıyor. |
| `tmp/math-site-features.js` | 0.006 | Bir defalık geliştirme/baskı önizleme çıktısı; site tarafından kullanılmıyor. |
| `.DS_Store` | 0.018 | macOS klasör görünüm önbelleği. |
| `ogretmen-ajandasi/.DS_Store` | 0.006 | macOS klasör görünüm önbelleği. |
| `gorseller/.DS_Store` | 0.010 | macOS klasör görünüm önbelleği. |
| `1_sinif/.DS_Store` | 0.006 | macOS klasör görünüm önbelleği. |

## Korunanlar ve nedenleri

- Git geçmişi, dallar, etiketler, reflog ve eski çalışma nesneleri silinmedi. Erişilebilir nesneler ve diğer eski nesneler ayrı paketlere sıkıştırıldı; süreye bağlı budama veya geçmiş yeniden yazımı yapılmadı.
- Paketleme öncesi/sonrası tüm Git nesne kimlikleri ve referanslar birebir karşılaştırıldı; değişiklik yok. `git fsck --connectivity-only --no-dangling` başarılı.
- `node_modules` yaklaşık 32 MiB: test ve geliştirme için gerekli. Yayınlanan site içeriği olarak değerlendirilmemeli.
- `assets/vitrin-gecici` adı geçici olsa da ana sayfa JPEG görsellerini kullanıyor. PNG adresleri de yönetim panelinden veritabanına kaydedilmiş olabilir; sırf statik kod referansı yok diye silinmedi.
- Akvaryumun kullanılan JPEG arka planları, şeffaf canlı PNG’leri, inci görseli, müzikler ve lisans/kaynak belgeleri korundu.
- SQL kurulum/güvenlik dosyaları, testler ve dokümantasyon küçüktür; bakım ve yeniden kurulum için korundu.
- Mobil ve web logo kopyaları iki farklı uygulamanın girişlerinden kullanılıyor. Aynı içerikteki para/yazı görsellerinin ayrı adları da korunmuştur.
- `gorseller/oyun-oda.webp` yaklaşık 5,57 MiB. Statik kaynaklarda doğrudan referans bulunmadı; dinamik yönetim içeriğinden kullanımı doğrulanmadan silinmedi.

## Doğrulama ve geri erişim

- Temizlik sonrası `npm test`: **136 test geçti**. Akvaryum canlı/arka plan varlığı ve ses dosyası bütünlüğü denetimleri de bu testlere dahil.
- Silinen yerel APK v4: [GitHub sürümü](https://github.com/Kemalogretmen/kemalogretmenim-v4/releases/download/mobile-v4/kemal-ogretmenim-v4.apk). SHA-256: `a92c9a9deed8bae150de3acdf34991b1123dbf904ef25a2c7c3fb19d6c39c8bd`.
- Eski APK v2 Git geçmişinde duruyor; bu temizlik geçmişi yeniden yazmaz.
- Özgün akvaryum PNG’leri: `/Users/kemalkocar/.codex/generated_images/01a0f6d0-06e4-7f41-b908-f1e9fdc5ce0b`. Dosya eşleştirmeleri `assets/akvaryum/uretim-istemleri.json` içinde tutulur.
- Değişiklikler yereldir; canlı siteye yayın veya commit yapılmadı.
- Tüm proje klasörünü manuel yayınlamak yerine `.git`, `node_modules`, geçici çıktılar ve yerel APK’ları yayın paketinin dışında tutun. Bu temizlik dağıtım yapılandırmasını değiştirmez.
