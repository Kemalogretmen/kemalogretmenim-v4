import { Redirect, router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Print from 'expo-print';
import * as Crypto from 'expo-crypto';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useMemo, useRef, useState, createElement } from 'react';
import { ActivityIndicator, Alert, BackHandler, Platform, Pressable, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { WebView, WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import { APP_CONFIG } from '@/constants/config';
import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/platform/PlatformContext';
import { Action, BackHeader, Icon, IconButton, Waiting } from '@/platform/components';
import { moduleForPath } from '@/platform/catalog';
import { createActivityBridge } from '@/platform/bridge';
import { internalUrl, isAuthPath, safeExport, safeExternalUrl } from '@/platform/urlPolicy';
import { fetchAgendaRow } from '@/platform/useAgenda';
import { AgendaRow } from '@/platform/agendaModel';
import { createWhiteboardDocument, WHITEBOARD_BASE_URL, whiteboardMessageOrigin } from '@/platform/whiteboardDocument';
import { agendaActivityPath, createAgendaDocument, AGENDA_BASE_URL } from '@/platform/agendaDocument';
import { WebAgendaActivity } from '@/platform/WebAgendaActivity';

function single(v?: string | string[]) { return Array.isArray(v) ? v[0] : v; }
export default function Activity() {
  const params = useLocalSearchParams<{ url?: string; path?: string; title?: string; module?: string }>();
  const { session, userId, profile, loading: authLoading } = useAuth();
  const { palette, dark, visit } = usePlatform();
  const ref = useRef<WebView<{}>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [focus, setFocus] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [progress, setProgress] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [bridgeNonce] = useState(() => Crypto.randomUUID());
  const url = useMemo(() => internalUrl(single(params.url) || single(params.path) || '/', APP_CONFIG.siteUrl), [params.path, params.url]);
  const item = url ? moduleForPath(new URL(url).pathname + new URL(url).search) : undefined;
  const moduleId = item?.id || single(params.module) || 'content';
  const bundledWhiteboard = moduleId === 'whiteboard';
  const bundledAgenda = moduleId === 'agenda';
  const agendaAllowed = !!userId && profile?.id === userId && profile.role === 'teacher' && profile.active !== false && (!profile.approval_status || profile.approval_status === 'active');
  const agendaPath = useMemo(() => {
    if (!bundledAgenda || !url) return '';
    try { return agendaActivityPath(new URL(url).pathname + new URL(url).search); } catch { return ''; }
  }, [url, bundledAgenda]);
  const agendaQuery = new URLSearchParams(agendaPath.split('?')[1] || '');
  const nativeAgendaSection = agendaPath && agendaQuery.get('advanced') !== '1' ? ({ scheduleView: 'lessons', studentsView: 'students', reportsView: 'reports', dashboardView: 'lessons' } as Record<string, string>)[agendaQuery.get('mobileView') || 'dashboardView'] : undefined;
  const webAgendaHost = `__kemalAgendaHost_${bridgeNonce.replace(/-/g, '')}`;
  const title = single(params.title) || item?.title || 'Öğrenme alanı';
  const needsAgenda = bundledAgenda && agendaAllowed && !!agendaPath;
  const [agendaSeed, setAgendaSeed] = useState<{ owner: string; row: AgendaRow | null } | null>(null);
  const [seedError, setSeedError] = useState('');
  const [seedRetry, setSeedRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setAgendaSeed(null); setSeedError('');
    if (!needsAgenda || !userId || authLoading) return;
    const uid = userId;
    void fetchAgendaRow(uid).then(row => { if (active) setAgendaSeed({ owner: uid, row }); })
      .catch(() => { if (active) setSeedError('Ajandanın en güncel kaydı alınamadı. İnternet bağlantını kontrol edip yeniden dene. Yerel günlük görünümündeki kayıtların korunuyor.'); });
    return () => { active = false; };
  }, [needsAgenda, userId, authLoading, seedRetry]);
  const bridge = useMemo(() => createActivityBridge({
    origin: new URL(APP_CONFIG.siteUrl).origin,
    authKey: `sb-${new URL(APP_CONFIG.supabaseUrl).hostname.split('.')[0]}-auth-token`,
    session: bundledWhiteboard || (bundledAgenda && Platform.OS === 'web') ? null : bundledAgenda ? { access_token: session?.access_token, user: session?.user ? { id: session.user.id, email: session.user.email } : null } : session,
    userId: bundledWhiteboard ? null : userId, dark, module: moduleId, nonce: bridgeNonce, bundledWhiteboard,
    ...(bundledAgenda ? { bundledAgenda, agendaPath, profile: profile ? { id: profile.id, role: profile.role, active: profile.active, approval_status: profile.approval_status } : null, supabaseUrl: APP_CONFIG.supabaseUrl, supabaseKey: APP_CONFIG.supabaseAnonKey, ...(Platform.OS === 'web' ? { webAgendaHost } : {}) } : {}),
    ...(agendaSeed?.owner === userId && agendaSeed?.row ? { agendaSeed: { userId, ...agendaSeed.row } } : {}),
  }), [session, userId, profile, dark, moduleId, bridgeNonce, agendaSeed, bundledWhiteboard, bundledAgenda, agendaPath, webAgendaHost]);
  // Theme/session refreshes update the bridge without replacing a drawing document.
  const whiteboardDocument = useRef('');
  if (bundledWhiteboard && !whiteboardDocument.current) whiteboardDocument.current = createWhiteboardDocument(bridge, bridgeNonce, dark);
  const whiteboardHtml = whiteboardDocument.current;
  const agendaDocument = useRef<{ owner: string | null; path: string; html: string } | null>(null);
  if (bundledAgenda && agendaPath && (!needsAgenda || agendaSeed?.owner === userId) && (!agendaDocument.current || agendaDocument.current.owner !== userId || agendaDocument.current.path !== agendaPath)) {
    agendaDocument.current = { owner: userId, path: agendaPath, html: createAgendaDocument({ bootstrap: bridge, nonce: bridgeNonce, dark, path: agendaPath }) };
  }
  const agendaHtml = agendaDocument.current?.html || '';
  const bridgeRef = useRef(bridge); bridgeRef.current = bridge;
  useEffect(() => { if (item) visit(item.id); }, [item?.id]);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    void activateKeepAwakeAsync('learning-activity').catch(() => undefined);
    return () => { void deactivateKeepAwake('learning-activity'); void ScreenOrientation.unlockAsync().catch(() => undefined); };
  }, []);
  useEffect(() => { ref.current?.injectJavaScript(bridge); }, [bridge]);
  useEffect(() => {
    if (!loading || error) return;
    const timer = setTimeout(() => { ref.current?.stopLoading(); setLoading(false); setError('Bağlantı beklenenden uzun sürdü. Yeniden deneyebilirsin.'); }, 30000);
    return () => clearTimeout(timer);
  }, [loading, error]);
  const close = useCallback(() => {
    const leave = () => router.canGoBack() ? router.back() : router.replace('/(app)/today');
    if (moduleId === 'whiteboard' || /\/sinav_sitesi\/sinav(?:\.html)?(?:[?#]|$)/.test(currentUrl)) {
      Alert.alert('Çalışmadan çıkılsın mı?', 'Kaydetmediğin çalışma veya tamamlamadığın sınav etkilenebilir.', [{ text: 'Devam et', style: 'cancel' }, { text: 'Çık', onPress: leave }]);
    } else leave();
  }, [currentUrl, moduleId]);
  const back = useCallback(() => { if (canGoBack) ref.current?.goBack(); else close(); }, [canGoBack, close]);
  const exitFocus = useCallback(() => { setFocus(false); void ScreenOrientation.unlockAsync().catch(() => undefined); }, []);
  useEffect(() => { const listener = BackHandler.addEventListener('hardwareBackPress', () => { if (focus) exitFocus(); else back(); return true; }); return () => listener.remove(); }, [back, exitFocus, focus]);
  function external(raw: string) { const target = safeExternalUrl(raw); if (target) void Linking.openURL(target).catch(() => Alert.alert('Bağlantı açılamadı', 'Bu bağlantıyı cihazında açamıyoruz.')); }
  function guard(request: WebViewNavigation & { isTopFrame?: boolean }) {
    if (request.url === 'about:blank') return true;
    if (bundledAgenda && request.isTopFrame === false) return request.url === 'about:srcdoc';
    // Subframes cannot receive the session bridge. Interactive embedded activities may use HTTPS frames.
    if (request.isTopFrame === false) return /^https:\/\//.test(request.url);
    if (internalUrl(request.url, APP_CONFIG.siteUrl)) {
      if (isAuthPath(request.url)) { router.push(/kayit/.test(request.url) ? '/register' : '/login'); return false; }
      if (bundledWhiteboard && new URL(request.url).pathname !== '/ogretmen/beyaztahta.html') {
        router.push({ pathname: '/webview', params: { path: request.url } }); return false;
      }
      if (/^\/ogretmen-ajandasi(?:\/|$)/.test(new URL(request.url).pathname) && moduleId !== 'agenda') {
        router.push({ pathname: '/webview', params: { path: request.url, title: 'Öğretmen Ajandası', module: 'agenda' } });
        return false;
      }
      return true;
    }
    external(request.url); return false;
  }
  async function onMessage(event: WebViewMessageEvent) {
    const origin = new URL(APP_CONFIG.siteUrl).origin;
    const agendaMessage = bundledAgenda && (event.nativeEvent.url === 'about:blank' || (internalUrl(event.nativeEvent.url, APP_CONFIG.siteUrl) && /^\/ogretmen-ajandasi\/(?:index\.html)?$/.test(new URL(event.nativeEvent.url).pathname)));
    if (bundledWhiteboard ? !whiteboardMessageOrigin(event.nativeEvent.url, origin) : bundledAgenda ? !agendaMessage : !internalUrl(event.nativeEvent.url, APP_CONFIG.siteUrl)) return;
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.nonce !== bridgeNonce) return;
      if (message.type === 'exitFocus') { exitFocus(); return; }
      if (message.type === 'storageError') { setLoading(false); setError('Cihaz depolamasına erişilemiyor. Verilerini silmeden cihazda boş alan açıp yeniden dene.'); return; }
      if (message.type === 'ready') { setLoading(false); return; }
      if (message.type === 'print' && !exporting) {
        const html = message.payload?.html;
        if (typeof html !== 'string' || html.length > 6 * 1024 * 1024) return;
        setExporting(true);
        await Print.printAsync({ html });
        return;
      }
      if (message.type === 'exportError') { Alert.alert('Dosya hazırlanamadı', 'Dosya çok büyük olabilir. Yeniden deneyebilirsin.'); return; }
      if (message.type !== 'exportFile' || exporting) return;
      const file = safeExport(message.payload); if (!file) return;
      setExporting(true);
      if (!FileSystem.cacheDirectory || !await Sharing.isAvailableAsync()) throw new Error('Bu cihazda dosya paylaşımı kullanılamıyor.');
      const destination = `${FileSystem.cacheDirectory}kemal-${Date.now()}-${file.name}`;
      try {
        await FileSystem.writeAsStringAsync(destination, file.base64, { encoding: FileSystem.EncodingType.Base64 });
        await Sharing.shareAsync(destination, { mimeType: file.mime, dialogTitle: file.name });
      } finally { await FileSystem.deleteAsync(destination, { idempotent: true }).catch(() => undefined); }
    } catch (e) { Alert.alert('Dosya kaydedilemedi', e instanceof Error ? e.message : 'Lütfen yeniden dene.'); }
    finally { setExporting(false); }
  }
  async function landscape() {
    try { await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE); setFocus(true); }
    catch { Alert.alert('Ekran yönü', 'Bu cihazın pencere düzeni yön kilidini desteklemiyor. Ekranı elle çevirebilirsin.'); }
  }
  if (authLoading) return <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}><BackHeader title={title} /><Waiting /></SafeAreaView>;
  if (bundledAgenda && !agendaPath) return <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}><BackHeader title="Öğretmen Ajandası" /><View style={{ padding: 24, gap: 18 }}><Text style={{ color: palette.text }}>Bu ajanda bağlantısı açılamıyor. Ajandana uygulamanın içinden ulaşabilirsin.</Text><Action label="Ajandama dön" onPress={() => router.replace('/(app)/agenda')} /></View></SafeAreaView>;
  if (bundledAgenda && nativeAgendaSection) return <Redirect href={{ pathname: '/(app)/agenda', params: { section: nativeAgendaSection, ...(agendaQuery.get('focusDate') ? { date: agendaQuery.get('focusDate')! } : {}), ...(agendaQuery.get('classId') ? { classId: agendaQuery.get('classId')! } : {}), ...(agendaQuery.get('studentId') ? { studentId: agendaQuery.get('studentId')! } : {}) } }} />;
  if (!url) return <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}><BackHeader title="İçerik açılamadı" /><View style={{ padding: 24, gap: 16 }}><Text style={{ color: palette.text }}>Bu içerik uygulamanın güvenli içerik adresleri arasında değil.</Text><Action label="Keşfete dön" onPress={() => router.replace('/(app)/explore')} /></View></SafeAreaView>;
  if (bundledAgenda && !userId) return <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}><BackHeader title="Öğretmen Ajandası" /><View style={{ padding: 24, gap: 18 }}><Text style={{ color: palette.text }}>Sınıflarını ve ders programını görmek için öğretmen hesabınla giriş yap.</Text><Action label="Giriş yap" onPress={() => router.push('/login')} /></View></SafeAreaView>;
  if (bundledAgenda && !agendaAllowed) return <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}><BackHeader title="Öğretmen Ajandası" /><View style={{ padding: 24, gap: 18 }}><Text style={{ color: palette.text }}>Bu alan aktif öğretmen hesabı gerektiriyor. Hesap durumunu kontrol edebilirsin.</Text><Action label="Hesabıma git" onPress={() => router.replace('/(app)/account')} /></View></SafeAreaView>;
  if (needsAgenda && agendaSeed?.owner !== userId) return <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}><BackHeader title={title} />{seedError ? <View style={{ padding: 24, gap: 18 }}><Text style={{ color: palette.text, lineHeight: 23 }}>{seedError}</Text><Action label="Yeniden dene" icon="refresh-outline" onPress={() => setSeedRetry(v => v + 1)} /><Action label="Günlük ajandama dön" secondary onPress={() => router.replace('/(app)/agenda')} /></View> : <Waiting />}</SafeAreaView>;
  return <SafeAreaView edges={focus ? ['left', 'right', 'bottom'] : ['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: palette.background }}>
    <StatusBar hidden={focus} style={dark ? 'light' : 'dark'} />
    {!focus && <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surface, borderBottomWidth: 1, borderBottomColor: palette.line, paddingHorizontal: 6, minHeight: 56 }}><IconButton label="Geri dön" icon="chevron-back" onPress={back} /><Text numberOfLines={1} style={{ flex: 1, color: palette.text, fontSize: 15, fontWeight: '600' }}>{title}</Text>{Platform.OS !== 'web' && <IconButton label="Yatay ekrana geç" icon="phone-landscape-outline" onPress={landscape} />}<IconButton label="Odak görünümünü aç" icon="expand-outline" onPress={() => setFocus(true)} /><IconButton label="İçerik bağlantısını paylaş" icon="share-outline" onPress={() => { void Share.share({ title, message: `${title}\n${currentUrl || url}` }).catch(() => undefined); }} /></View>}
    <View style={{ flex: 1, minHeight: 0 }}>
      {Platform.OS === 'web' ? bundledAgenda ? <WebAgendaActivity key={userId} html={agendaHtml} hostKey={webAgendaHost} nonce={bridgeNonce} title={title} onReady={() => setLoading(false)} onError={setError} /> : createElement('iframe', { title, ...(bundledWhiteboard ? { srcDoc: whiteboardHtml, sandbox: 'allow-scripts allow-same-origin allow-downloads allow-modals', referrerPolicy: 'no-referrer' } : { src: url }), style: { flex: 1, border: 0, width: '100%', height: '100%' }, allow: 'fullscreen', onLoad: () => setLoading(false) }) : <WebView<{}> key={userId || 'guest'} ref={ref} source={bundledWhiteboard ? { html: whiteboardHtml, baseUrl: WHITEBOARD_BASE_URL } : bundledAgenda ? { html: agendaHtml, baseUrl: AGENDA_BASE_URL } : { uri: url }}
        injectedJavaScriptBeforeContentLoaded={bridge} injectedJavaScript={bridge} injectedJavaScriptBeforeContentLoadedForMainFrameOnly injectedJavaScriptForMainFrameOnly
        onLoadStart={() => { setLoading(true); setError(''); }} onLoadProgress={e => setProgress(e.nativeEvent.progress)}
        onLoadEnd={() => { ref.current?.injectJavaScript(bridgeRef.current); setLoading(false); }}
        onNavigationStateChange={nav => { setCanGoBack(nav.canGoBack); setCurrentUrl(nav.url); }}
        onShouldStartLoadWithRequest={guard} onMessage={onMessage} onOpenWindow={e => external(e.nativeEvent.targetUrl)}
        onError={() => { setError('İçerik yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.'); setLoading(false); }}
        onHttpError={e => { if (e.nativeEvent.statusCode >= 400 && (!e.nativeEvent.url || e.nativeEvent.url === currentUrl || e.nativeEvent.url === url)) { setError('İçerik şu an kullanılamıyor. Biraz sonra yeniden dene.'); setLoading(false); } }}
        onContentProcessDidTerminate={() => { setError('Çalışma ekranı durdu. Yeniden yükleyebilirsin.'); setLoading(false); }}
        javaScriptEnabled domStorageEnabled cacheEnabled sharedCookiesEnabled allowsInlineMediaPlayback allowsFullscreenVideo
        mediaPlaybackRequiresUserAction mixedContentMode="never" allowFileAccess={false} allowUniversalAccessFromFileURLs={false}
        setSupportMultipleWindows originWhitelist={['https://*']} nestedScrollEnabled scrollEnabled overScrollMode="always" style={{ flex: 1, backgroundColor: palette.background }} />}
      {loading && !error && <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: palette.background, alignItems: 'center', justifyContent: 'center', gap: 16 }}><ActivityIndicator color={palette.primary} /><Text style={{ color: palette.muted, fontSize: 14 }}>Öğrenme alanın hazırlanıyor…</Text><View style={{ width: 160, height: 3, backgroundColor: palette.line, borderRadius: 4 }}><View style={{ width: `${Math.max(5, progress * 100)}%`, height: 3, borderRadius: 4, backgroundColor: palette.primary }} /></View></View>}
      {!!error && <View style={{ position: 'absolute', inset: 0, backgroundColor: palette.background, padding: 26, justifyContent: 'center', gap: 18 }}><Icon name="cloud-offline-outline" size={38} /><Text style={{ color: palette.text, fontSize: 18, fontWeight: '600' }}>Bir bağlantı molası.</Text><Text style={{ color: palette.muted, lineHeight: 23 }}>{error}</Text><Action label="Yeniden dene" icon="refresh-outline" onPress={() => { setError(''); setLoading(true); ref.current?.reload(); }} /><Action label="Uygulamaya dön" secondary onPress={close} /></View>}
      {focus && <Pressable accessibilityRole="button" accessibilityLabel="Tam ekrandan çık" onPress={exitFocus} style={{ position: 'absolute', top: 10, right: 10, minWidth: 84, minHeight: 48, borderRadius: 18, backgroundColor: palette.glass, borderWidth: 1, borderColor: palette.line, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 5, zIndex: 50, elevation: 50 }}><Icon name="contract-outline" /><Text style={{ color: palette.text, fontSize: 12, fontWeight: '700' }}>Çık</Text></Pressable>}
      {exporting && <View accessibilityLiveRegion="polite" style={{ position: 'absolute', bottom: 16, alignSelf: 'center', padding: 14, borderRadius: 18, backgroundColor: palette.surface }}><Text style={{ color: palette.text }}>Dosya paylaşım için hazırlanıyor…</Text></View>}
    </View>
  </SafeAreaView>;
}
