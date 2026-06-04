# Kemal Öğretmenim Mobile

Expo + React Native uygulaması. Web sitesi statik yapısını korur; mobil uygulama Supabase verisini native ekranlarda kullanır ve ağır içerikleri güvenli WebView ile açar.

## Kurulum

```bash
cd mobile-app
npm install
npx expo start
```

## Store build

```bash
npm install -g eas-cli
eas login
eas init
eas build --profile preview --platform android
eas build --profile production --platform all
```

Supabase Auth redirect allowlist'e tam olarak `kemalogretmenim://auth/callback` eklenmelidir. Google girişinden sonra Supabase bu adrese döner; uygulama bu callback'i yakalayıp `code` veya token bilgisinden mobil oturumu açar.
