# Firebase Kurulum (Admin Auth + Güvenli Kurallar)

Bu proje `Firestore + Firebase Auth (Email/Password)` ile çalışır.

## 1) Authentication (Email/Password)
1. Firebase Console → **Authentication** → **Sign-in method**
2. **Email/Password** etkinleştir
3. Authentication → **Users** → **Add user** ile bir admin hesabı oluştur

> Not: Auth kullanıyorsan **Authentication → Settings → Authorized domains** kısmına
> Netlify domainini ve lokal geliştirme domainlerini (`localhost`, `127.0.0.1`) ekle.

## 2) Admin Allowlist (admins/{uid})
Bu projede admin yetkisi, Firestore’da `admins/{uid}` dokümanı ile verilir.

1. Admin hesabınla `admin.html` sayfasına giriş yap
2. Sol menüde görünen **UID** değerini kopyala
3. Firebase Console → **Firestore Database**:
   - Collection: `admins`
   - Document ID: `UID` (kopyaladığın değer)
   - (İsteğe bağlı) alan ekleyip kaydet (örn: `role: "admin"`)

## 3) Firestore Security Rules
Firebase Console → Firestore Database → **Rules** bölümüne `firestore.rules` içeriğini yapıştırıp yayınla:

- Dosya: `firestore.rules`

Bu kurallar ile:
- `exams`/`questions` yazma-silme sadece admin olur
- Öğrenci tarafı sadece **published** sınavları görür
- `results` sadece **create** (sınav sonucu gönderme) için herkese açıktır; okuma admin-only olur

## 4) (Opsiyonel) API Key kısıtlamaları
Tarayıcı konsolunda CORS / “access control checks” hatası görürsen:
- Google Cloud Console → **APIs & Services** → **Credentials** → API Key kısıtlamalarını kontrol et
- Netlify domainini ve lokal domainleri referrer allowlist’e ekle

