import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation } from 'react-native-webview';

import { APP_CONFIG, webUrl } from '@/constants/config';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import type { Profile } from '@/types/domain';

function resolveUrl(url?: string | string[], path?: string | string[]) {
  const rawUrl = Array.isArray(url) ? url[0] : url;
  const rawPath = Array.isArray(path) ? path[0] : path;
  if (rawUrl && /^https?:\/\//i.test(rawUrl)) return rawUrl;
  if (rawUrl && rawUrl.startsWith('/')) return webUrl(rawUrl);
  if (rawPath) return webUrl(rawPath);
  return webUrl('/');
}

function isAllowed(url: string) {
  try {
    return new URL(url).origin === new URL(APP_CONFIG.siteUrl).origin;
  } catch {
    return false;
  }
}

function getPathname(url: string) {
  try {
    return new URL(url).pathname;
  } catch {
    return '';
  }
}

function isWebAuthRoute(url: string) {
  const path = getPathname(url);
  return path === '/giris.html' || path === '/kayit.html';
}

function getSupabaseStorageKey() {
  try {
    return `sb-${new URL(APP_CONFIG.supabaseUrl).hostname.split('.')[0]}-auth-token`;
  } catch {
    return 'sb-auth-token';
  }
}

function panelHref(profile: Profile | null) {
  if (profile?.role === 'teacher') return '/ogretmen-paneli.html';
  if (profile?.role === 'parent') return '/veli-paneli.html';
  return '/ogrenci-paneli.html';
}

function panelLabel(profile: Profile | null) {
  if (profile?.role === 'teacher') return 'Öğretmen Paneli';
  if (profile?.role === 'parent') return 'Veli Paneli';
  return 'Öğrenci Paneli';
}

function createSessionBridgeScript({
  session,
  profile,
}: {
  session: unknown;
  profile: Profile | null;
}) {
  const profilePayload = profile ? {
    id: profile.id,
    role: profile.role,
    email: profile.email,
    full_name: profile.full_name,
    first_name: profile.first_name,
    last_name: profile.last_name,
    panel_href: panelHref(profile),
    panel_label: panelLabel(profile),
  } : null;

  return `
(function(){
  window.__KEMAL_MOBILE_APP__ = true;
  window.__KEMAL_MOBILE_PROFILE__ = ${JSON.stringify(profilePayload)};
  window.__KEMAL_MOBILE_SESSION__ = ${JSON.stringify(session)};
  var storageKey = ${JSON.stringify(getSupabaseStorageKey())};
  var session = ${JSON.stringify(session)};
  try {
    if (session && session.access_token && session.refresh_token) {
      window.localStorage.setItem(storageKey, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(storageKey);
    }
  } catch (error) {}
})();
true;`;
}

function createMobileChromeScript(profile: Profile | null, session: unknown) {
  const profilePayload = profile ? {
    full_name: profile.full_name,
    first_name: profile.first_name,
    email: profile.email,
    role: profile.role,
    panel_href: panelHref(profile),
    panel_label: panelLabel(profile),
  } : null;

  return `
(function(){
  window.__KEMAL_MOBILE_APP__ = true;
  var profile = ${JSON.stringify(profilePayload)};
  var session = ${JSON.stringify(session)};
  var storageKey = ${JSON.stringify(getSupabaseStorageKey())};

  function persistNativeSession() {
    try {
      window.__KEMAL_MOBILE_PROFILE__ = profile;
      window.__KEMAL_MOBILE_SESSION__ = session;
      if (session && session.access_token && session.refresh_token) {
        window.localStorage.setItem(storageKey, JSON.stringify(session));
      }
    } catch (error) {}
  }

  function post(type) {
    try {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: type }));
    } catch (error) {}
  }

  function syncAccountBar() {
    if (!profile) return;
    var summary = document.getElementById('siteAccountSummary');
    var primary = document.getElementById('siteAccountPrimary');
    var secondary = document.getElementById('siteAccountSecondary');
    var logout = document.getElementById('siteAccountLogout');
    if (!summary || !primary || !secondary) return;
    var displayName = profile.full_name || profile.first_name || profile.email || 'Hesabım';
    summary.textContent = 'Merhaba, ' + displayName;
    primary.textContent = 'Hesabım';
    primary.href = profile.panel_href || '/ogrenci-paneli.html';
    secondary.textContent = profile.panel_label || 'Panel';
    secondary.href = profile.panel_href || '/ogrenci-paneli.html';
    if (logout) logout.hidden = false;
  }

  function installReturnButton() {
    var isPanel = /\\/(ogrenci-paneli|ogretmen-paneli|veli-paneli)\\.html$/.test(location.pathname) ||
      document.querySelector('.student-panel,.teacher-panel,.parent-panel');
    if (!isPanel || document.getElementById('kemalMobileReturnButton')) return;

    var style = document.createElement('style');
    style.id = 'kemalMobileReturnStyle';
    style.textContent = [
      '#kemalMobileReturnButton{position:fixed;left:14px;right:14px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:2147483647;border:0;border-radius:999px;padding:13px 16px;background:#6C3DED;color:#fff;font-family:Nunito,system-ui,sans-serif;font-size:15px;font-weight:900;box-shadow:0 14px 30px rgba(15,23,42,.24);display:flex;align-items:center;justify-content:center;gap:8px}',
      '#kemalMobileReturnButton:active{transform:scale(.98)}',
      'body{padding-bottom:74px!important}'
    ].join('\\n');
    document.head.appendChild(style);

    var button = document.createElement('button');
    button.id = 'kemalMobileReturnButton';
    button.type = 'button';
    button.textContent = '← Uygulamaya dön';
    button.addEventListener('click', function(){ post('returnToApp'); });
    document.body.appendChild(button);
  }

  function installMobileReadingShell() {
    if (!/^\\/hizli-okuma\\//.test(location.pathname)) return;
    if (!document.getElementById('kemalMobileReadingStyle')) {
      var style = document.createElement('style');
      style.id = 'kemalMobileReadingStyle';
      style.textContent = [
        'html.kemal-mobile-reading,html.kemal-mobile-reading body{width:100%;max-width:100%;overflow-x:hidden;background:#FFF9F1!important}',
        'html.kemal-mobile-reading .site-nav,html.kemal-mobile-reading .site-header,html.kemal-mobile-reading header,html.kemal-mobile-reading footer,html.kemal-mobile-reading .mobile-nav,html.kemal-mobile-reading .bottom-nav{display:none!important}',
        'html.kemal-mobile-reading .ho-hero{background:#FFF9F1!important;padding:18px 14px 12px!important;text-align:left!important}',
        'html.kemal-mobile-reading .ho-hero:before,html.kemal-mobile-reading .ho-hero:after{display:none!important}',
        'html.kemal-mobile-reading .ho-hero-em{display:inline-flex!important;margin:0 10px 0 0!important;font-size:44px!important;vertical-align:middle!important}',
        'html.kemal-mobile-reading .ho-hero h1{display:inline!important;color:#94A3B8!important;font-size:28px!important;line-height:1.05!important;text-align:left!important}',
        'html.kemal-mobile-reading .ho-hero p{color:#4B5563!important;font-size:13px!important;text-align:left!important;margin-top:8px!important}',
        'html.kemal-mobile-reading .ho-hero-actions{justify-content:flex-start!important;margin-top:12px!important}',
        'html.kemal-mobile-reading .ho-hero-btn{min-height:38px!important;padding:9px 13px!important;border-color:#EAE3FF!important;background:#fff!important;color:#6C3DED!important}',
        'html.kemal-mobile-reading .steps-wrap{padding:14px!important}',
        'html.kemal-mobile-reading .step-indicator{margin:8px 0 18px!important}',
        'html.kemal-mobile-reading .si-line{width:54px!important;background:#EAE3FF!important}',
        'html.kemal-mobile-reading #step1 .step-title{font-size:21px!important;margin-bottom:14px!important;text-align:left!important}',
        'html.kemal-mobile-reading .sinif-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important;max-width:none!important}',
        'html.kemal-mobile-reading .sinif-btn{min-height:126px!important;border-radius:22px!important}',
        'html.kemal-mobile-reading .sinif-btn:before{border-radius:18px!important;inset:10px!important}',
        'html.kemal-mobile-reading .sinif-btn-num{font-size:50px!important}',
        'html.kemal-mobile-reading #step2,html.kemal-mobile-reading #step3{border-radius:24px!important;padding:14px!important;background:#fff!important;border:1px solid #EAE3FF!important;box-shadow:0 12px 30px rgba(26,16,64,.08)!important}',
        'html.kemal-mobile-reading .metin-header{gap:10px!important;margin-bottom:14px!important}',
        'html.kemal-mobile-reading .metin-title{font-size:20px!important;line-height:1.15!important}',
        'html.kemal-mobile-reading .metin-filter-panel{grid-template-columns:1fr!important;padding:10px!important}',
        'html.kemal-mobile-reading .metin-grid,html.kemal-mobile-reading .metin-list{display:flex!important;flex-direction:column!important;gap:10px!important}',
        'html.kemal-mobile-reading .metin-card{min-height:auto!important;border-radius:18px!important;padding:13px!important}',
        'html.kemal-mobile-reading .form-row-2,html.kemal-mobile-reading .form-row-3{display:grid!important;grid-template-columns:1fr!important;gap:10px!important}',
        'html.kemal-mobile-reading .giris-card{border-radius:20px!important;padding:14px!important;max-height:none!important;overflow:visible!important}',
        'html.kemal-mobile-reading .start-btn{border-radius:999px!important;bottom:8px!important;box-shadow:0 12px 24px rgba(108,61,237,.28)!important;position:sticky!important;width:100%!important}',
        'html.kemal-mobile-reading #tamMetinEkran{background:#F8F2FF!important}',
        'html.kemal-mobile-reading .okuma-topbar{background:transparent!important;border:0!important;padding:12px 14px!important}',
        'html.kemal-mobile-reading .sayac-display{background:#FFF9EA!important;border:0!important;border-radius:14px!important;color:#94A3B8!important}',
        'html.kemal-mobile-reading .kitap-wrapper{margin:10px auto!important;max-width:none!important;padding:0 12px!important}',
        'html.kemal-mobile-reading .kitap-baslik{border:0!important;color:#FF7043!important;font-size:25px!important;line-height:1.12!important;margin-bottom:12px!important;padding:0!important}',
        'html.kemal-mobile-reading .kitap-metin{border:0!important;border-radius:28px!important;box-shadow:0 12px 32px rgba(26,16,64,.10)!important;line-height:1.55!important;padding:22px 18px!important;text-align:center!important}',
        'html.kemal-mobile-reading #tamMetinIcerik,html.kemal-mobile-reading #tamMetinIcerik *{font-size:clamp(30px,8.4vw,44px)!important;font-weight:900!important;line-height:1.54!important;text-align:center!important}',
        'html.kemal-mobile-reading .bitti-alani{padding:20px 14px 34px!important}',
        'html.kemal-mobile-reading .bitti-btn{border-radius:999px!important;min-height:50px!important;width:100%!important}',
        'html.kemal-mobile-reading .soru-ekran{background:linear-gradient(160deg,#130A35 0%,#21104C 54%,#140A34 100%)!important;box-sizing:border-box!important;color:#fff!important;margin:0!important;max-width:none!important;min-height:100vh!important;padding:20px 14px 120px!important}',
        'html.kemal-mobile-reading .soru-topbar{margin-bottom:22px!important}',
        'html.kemal-mobile-reading .soru-metin-adi{color:rgba(255,255,255,.82)!important;text-shadow:0 1px 12px rgba(0,0,0,.22)!important}',
        'html.kemal-mobile-reading .soru-sayac-badge{background:rgba(124,77,255,.62)!important;border-color:rgba(198,175,255,.9)!important;color:#fff!important}',
        'html.kemal-mobile-reading .soru-progress{background:rgba(255,255,255,.14)!important;height:5px!important;margin-bottom:28px!important}',
        'html.kemal-mobile-reading .soru-progress-fill{background:linear-gradient(90deg,#7C4DFF,#00C9B1)!important}',
        'html.kemal-mobile-reading .soru-kart{background:rgba(255,255,255,.08)!important;border:1px solid rgba(255,255,255,.13)!important;border-radius:28px!important;box-shadow:0 18px 42px rgba(0,0,0,.18)!important;flex:0 0 auto!important;padding:22px 18px!important}',
        'html.kemal-mobile-reading .soru-no{color:rgba(255,255,255,.58)!important}',
        'html.kemal-mobile-reading .soru-metin{color:#fff!important;font-size:24px!important;font-weight:800!important;line-height:1.38!important;margin-bottom:22px!important;text-shadow:0 1px 18px rgba(0,0,0,.18)!important}',
        'html.kemal-mobile-reading .secenekler-list{gap:10px!important}',
        'html.kemal-mobile-reading .secenek-btn{background:rgba(255,255,255,.10)!important;border-color:rgba(255,255,255,.18)!important;border-radius:14px!important;color:#fff!important;font-size:19px!important;line-height:1.25!important;padding:12px 14px!important}',
        'html.kemal-mobile-reading .secenek-btn span{color:inherit!important}',
        'html.kemal-mobile-reading .secenek-harf{background:rgba(255,255,255,.14)!important;color:#fff!important}',
        'html.kemal-mobile-reading .secenek-btn.secili{background:rgba(124,77,255,.36)!important;border-color:#8B5CFF!important;color:#fff!important}',
        'html.kemal-mobile-reading .secenek-btn.secili .secenek-harf{background:#7C4DFF!important;color:#fff!important}',
        'html.kemal-mobile-reading .soru-nav{background:#120936!important;bottom:0!important;gap:8px!important;left:0!important;margin:0!important;padding:12px 14px calc(12px + env(safe-area-inset-bottom))!important;position:fixed!important;right:0!important;z-index:20!important}',
        'html.kemal-mobile-reading .soru-nav .nav-btn{background:rgba(255,255,255,.10)!important;border-color:rgba(255,255,255,.16)!important;color:#fff!important}',
        'html.kemal-mobile-reading .soru-nav .nav-btn:disabled{color:rgba(255,255,255,.45)!important}',
        'html.kemal-mobile-reading .soru-nav .nav-btn-ileri{background:linear-gradient(135deg,#7C4DFF,#A66BFF)!important;color:#fff!important}',
        'html.kemal-mobile-reading .nokta-nav{min-width:88px!important}',
        'html.kemal-mobile-reading .modal-box{border-radius:24px!important;margin:0 16px!important;padding:24px 18px!important}',
        'html.kemal-mobile-reading .karne-wrap{max-width:none!important;padding:20px 10px 34px!important}',
        'html.kemal-mobile-reading .karne-header{margin-bottom:18px!important}',
        'html.kemal-mobile-reading .karne-title{font-size:30px!important;line-height:1.08!important}',
        'html.kemal-mobile-reading .karne-kart{border-radius:24px!important}',
        'html.kemal-mobile-reading .karne-top-bant{padding:20px!important}',
        'html.kemal-mobile-reading .karne-govde{padding:20px!important}',
        'html.kemal-mobile-reading .hiz-seksiyon{grid-template-columns:1fr 1fr!important;gap:12px!important}',
        'html.kemal-mobile-reading .anlama-row{align-items:stretch!important;flex-direction:column!important}',
        'html.kemal-mobile-reading .karne-altbtnlar{flex-direction:column!important}'
      ].join('\\n');
      document.head.appendChild(style);
    }
    document.documentElement.classList.add('kemal-mobile-reading');

    if (location.pathname === '/hizli-okuma/index.html') {
      var params = new URLSearchParams(location.search);
      var grade = params.get('grade') || params.get('sinif') || '';
      if (grade && !window.__KEMAL_MOBILE_READING_GRADE__) {
        window.__KEMAL_MOBILE_READING_GRADE__ = grade;
        var chooseGrade = function(){
          try {
            if (typeof window.sinifSec === 'function') {
              window.sinifSec(parseInt(grade, 10));
            }
          } catch (error) {}
        };
        setTimeout(chooseGrade, 550);
        setTimeout(chooseGrade, 1300);
      }
    }
  }

  function boot() {
    persistNativeSession();
    syncAccountBar();
    installReturnButton();
    installMobileReadingShell();
    if (session && session.access_token && window.kemalUserAuth && typeof window.kemalUserAuth.refresh === 'function' && !window.__KEMAL_MOBILE_AUTH_REFRESHED__) {
      window.__KEMAL_MOBILE_AUTH_REFRESHED__ = true;
      window.kemalUserAuth.refresh().then(syncAccountBar).catch(syncAccountBar);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  window.addEventListener('kemal-user-auth-changed', syncAccountBar);
  setTimeout(boot, 500);
  setTimeout(boot, 1500);
})();
true;`;
}

export default function WebViewScreen() {
  const params = useLocalSearchParams<{ title?: string; path?: string; url?: string }>();
  const { profile, session } = useAuth();
  const initialUrl = useMemo(() => resolveUrl(params.url, params.path), [params.path, params.url]);
  const sessionBridgeScript = useMemo(() => createSessionBridgeScript({ session, profile }), [profile, session]);
  const mobileChromeScript = useMemo(() => createMobileChromeScript(profile, session), [profile, session]);
  const [loading, setLoading] = useState(true);

  function guard(request: WebViewNavigation) {
    if (isWebAuthRoute(request.url)) {
      router.push(getPathname(request.url) === '/kayit.html' ? '/register' : '/login');
      return false;
    }
    if (isAllowed(request.url)) return true;
    Linking.openURL(request.url).catch(() => undefined);
    return false;
  }

  function handleMessage(event: { nativeEvent: { data?: string } }) {
    try {
      const message = JSON.parse(event.nativeEvent.data || '{}');
      if (message.type === 'returnToApp') {
        router.replace(profile ? '/(app)/home' : '/login');
      }
    } catch {
      // WebView'den gelen tanınmayan mesajlar yok sayılır.
    }
  }

  return (
    <SafeAreaView style={localStyles.safe}>
      <View style={localStyles.header}>
        <Pressable onPress={() => router.back()} style={localStyles.iconButton}>
          <Ionicons name="chevron-back" size={24} color={colors.navy} />
        </Pressable>
        <Text numberOfLines={1} style={localStyles.title}>{params.title || 'İçerik'}</Text>
        <Pressable onPress={() => Linking.openURL(initialUrl)} style={localStyles.iconButton}>
          <Ionicons name="open-outline" size={21} color={colors.purple} />
        </Pressable>
      </View>
      {loading ? (
        <View style={localStyles.loading}>
          <ActivityIndicator color={colors.purple} />
        </View>
      ) : null}
      <WebView
        source={{ uri: initialUrl }}
        injectedJavaScriptBeforeContentLoaded={sessionBridgeScript}
        injectedJavaScript={mobileChromeScript}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={guard}
        allowsBackForwardNavigationGestures
        javaScriptEnabled
        domStorageEnabled
        nestedScrollEnabled
        overScrollMode="always"
        scrollEnabled
        sharedCookiesEnabled
        startInLoadingState
      />
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  iconButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  title: {
    color: colors.navy,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  loading: {
    alignItems: 'center',
    backgroundColor: colors.cream,
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 62,
    zIndex: 2,
  },
});
