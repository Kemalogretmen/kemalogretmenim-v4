# 🌟 Kemal Öğretmenim — Site v2.0
## Kurulum & Deployment Rehberi

---

## 📁 Dosya Yapısı

```
/
├── index.html          → Ana sayfa
├── yeni.html           → Yeni İçerikler sayfası  
├── hakkimda.html       → Hakkımda sayfası
├── iletisim.html       → İletişim sayfası
├── 404.html            → Hata sayfası
├── netlify.toml        → Netlify ayarları
│
├── css/
│   └── style.css       ⬅️ TÜM SAYFALARIN CSS'İ (tek dosya!)
│
├── js/
│   └── site.js         ⬅️ Navbar + Footer enjeksiyonu, veri yönetimi
│
├── admin/
│   └── index.html      ⬅️ Yönetim Paneli (şifre: kemal2026)
│
├── gorseller/
│   ├── logo.png        → Navbar logosu (46x46px önerilir)
│   ├── profil.jpg      → Hakkımda profil fotoğrafı
│   └── ana-resim.png   → Hero bölümü ana görseli (mevcut)
│
├── sinav.html          → (mevcut sayfanı buraya taşı)
├── sablon.html         → (mevcut şablon sayfası)
│
├── 1_sinif/            → (mevcut klasörler aynen kalır)
├── 2_sinif/
├── 3_sinif/
├── 4_sinif/
├── 5_sinif/
├── 6_sinif/
└── 7_sinif/
```

---

## 🚀 Netlify'a Deploy Etme

### Yöntem 1: Sürükle-Bırak (En Kolay)
1. https://app.netlify.com adresine git
2. "Sites" → "Add new site" → "Deploy manually"
3. Tüm site klasörünü sürükleyip bırak
4. ✅ Bitti! URL otomatik oluşur.

### Yöntem 2: GitHub ile Otomatik Deploy
1. Dosyaları GitHub reposuna yükle
2. Netlify → "Add new site" → "Import from Git"
3. Repo'yu seç, build ayarları otomatik gelir (netlify.toml)
4. Her commit'te site otomatik güncellenir ✨

---

## 🔧 Mevcut Sayfaları Yeni Sisteme Geçiş

Her mevcut HTML sayfasında şu değişiklikleri yap:

### 1. `<head>` kısmına ekle:
```html
<link rel="stylesheet" href="/css/style.css">
```

### 2. Eski navbar HTML'ini SİL (tekrarlayan tüm nav kodu)

### 3. `</body>` kapanmadan önce ekle:
```html
<script src="/js/site.js"></script>
```

Bu kadar! Navbar ve footer otomatik eklenir.

---

## ⚙️ Yönetim Paneli

**URL:** `/admin/index.html`  
**Varsayılan Şifre:** `kemal2026`

### Yapabileceklerin:
- 📢 **Duyurular** — Kayan şerit metnlerini ekle/kaldır
- 🔔 **YENİ Rozetleri** — Hangi sınıflarda "YENİ" rozeti çıksın
- ⚡ **Hızlı Erişim** — Ana sayfadaki öne çıkan kartlar
- 🌟 **Yeni İçerikler** — `/yeni.html` sayfasındaki liste
- 👤 **Hakkımda** — Profil bilgileri ve istatistikler
- 🔗 **Ekstra Menü** — Üst menüye yeni bağlantılar
- 🔑 **Şifre Değiştir** — Admin şifresi güncelleme
- 💾 **Yedek/Sıfırla** — Veri yedekleme ve sıfırlama

> ⚠️ Veriler `localStorage`'da tutulur. Tarayıcı/cihaz bazlıdır.
> Birden fazla cihazdan yönetmek için ileride Supabase/Firebase entegrasyonu eklenebilir.

---

## 🎨 Renk & Tasarım Özelleştirme

`css/style.css` dosyasının başındaki `:root` bloğunu düzenle:

```css
:root {
  --purple: #6C3DED;   /* Ana renk */
  --coral:  #FF6052;   /* Vurgu rengi */
  --yellow: #FFD93D;   /* Sarı detay */
  --teal:   #00C9B1;   /* Turkuaz */
  --navy:   #1A1040;   /* Koyu metin */
  --cream:  #FFFBF5;   /* Arka plan */
}
```

---

## 📬 İletişim Formu Aktivasyonu

1. https://formspree.io adresine üye ol (ücretsiz)
2. Yeni bir form oluştur, form ID'ni al (örn: `xpzvwqkb`)
3. `iletisim.html` dosyasında şu satırı güncelle:
```html
<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
```
`YOUR_FORM_ID` yerine kendi ID'ni yaz.

---

*Hazırlayan: Claude — Mart 2026*
