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

  function boot() {
    persistNativeSession();
    syncAccountBar();
    installReturnButton();
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
