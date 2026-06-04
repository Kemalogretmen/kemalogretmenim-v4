import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { APP_CONFIG } from '@/constants/config';
import { colors, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

type IconName = keyof typeof Ionicons.glyphMap;

const introVideoUri = `${APP_CONFIG.siteUrl.replace(/\/$/, '')}/assets/intro/kemal-ogretmenim-intro.mp4`;

type AppShortcut = {
  title: string;
  subtitle: string;
  eyebrow: string;
  icon: IconName;
  path: string;
  color: string;
  soft: string;
  metric: string;
  action: string;
};

const primaryShortcuts: AppShortcut[] = [
  {
    title: 'Hızlı Okuma',
    subtitle: 'Metni seç, süreyi başlat, sonucunu gör.',
    eyebrow: 'Akıcılık',
    icon: 'timer-outline',
    path: '/hizli-okuma/index.html',
    color: '#6C3DED',
    soft: '#F1E9FF',
    metric: 'Oku ve ölç',
    action: 'Okumaya başla',
  },
  {
    title: 'Deneme Sınavı',
    subtitle: 'Sınıfına göre sınav seç ve soruları çöz.',
    eyebrow: 'Sınav',
    icon: 'document-text-outline',
    path: '/sinav_sitesi/index.html',
    color: '#FF7043',
    soft: '#FFF0E8',
    metric: 'Soru çöz',
    action: 'Sınava gir',
  },
  {
    title: 'Eğitim Oyunları',
    subtitle: 'Oyun seç, tekrar yap, pekiştir.',
    eyebrow: 'Oyun',
    icon: 'game-controller-outline',
    path: '/oyun/oyunlar.html',
    color: '#00A991',
    soft: '#E8FFF9',
    metric: 'Oyna',
    action: 'Oyunları aç',
  },
];

const liveCards = [
  { title: 'Bugünün mini görevi', text: '10 dakikalık okuma turu ve kısa anlama kontrolü.', icon: 'sparkles-outline' as IconName },
  { title: 'Öğretmen önerisi', text: 'Önce hızlı okuma, sonra aynı konuya ait oyunla tekrar.', icon: 'school-outline' as IconName },
  { title: 'Veli takibi', text: 'Ödev, mesaj ve ilerleme kayıtları panelde birlikte görünür.', icon: 'people-outline' as IconName },
];

function openWeb(path: string, title: string) {
  router.push({ pathname: '/webview', params: { path, title } });
}

function FeatureSlide({ item, width }: { item: AppShortcut; width: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => openWeb(item.path, item.title)}
      style={({ pressed }) => [
        styles.featureSlide,
        { width, backgroundColor: item.color },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.featureHalo} />
      <View style={styles.featureTop}>
        <View style={styles.featureIcon}>
          <Ionicons name={item.icon} size={28} color={item.color} />
        </View>
        <View style={styles.featurePill}>
          <Text style={styles.featurePillText}>{item.metric}</Text>
        </View>
      </View>
      <View style={styles.featureCopy}>
        <Text style={styles.featureEyebrow}>{item.eyebrow}</Text>
        <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.84} style={styles.featureTitle}>{item.title}</Text>
        <Text numberOfLines={2} style={styles.featureSubtitle}>{item.subtitle}</Text>
      </View>
      <View style={styles.featureFooter}>
        <Text style={styles.featureAction}>{item.action}</Text>
        <Ionicons name="arrow-forward-circle" size={26} color={colors.white} />
      </View>
    </Pressable>
  );
}

function QuickAction({ item }: { item: AppShortcut }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => openWeb(item.path, item.title)}
      style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
    >
      <View style={[styles.quickIcon, { backgroundColor: item.soft }]}>
        <Ionicons name={item.icon} size={22} color={item.color} />
      </View>
      <View style={styles.quickText}>
        <Text numberOfLines={1} style={styles.quickTitle}>{item.title}</Text>
        <Text numberOfLines={1} style={styles.quickSubtitle}>{item.metric}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={item.color} />
    </Pressable>
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function IntroVideoOverlay({ onDone }: { onDone: () => void }) {
  const videoHtml = `
<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>
html,body{margin:0;width:100%;height:100%;background:#160A3A;overflow:hidden}
video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#160A3A}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(22,10,58,0) 48%,rgba(22,10,58,.78))}
</style>
</head>
<body>
<video id="introVideo" autoplay muted playsinline webkit-playsinline preload="auto">
  <source src="${escapeHtml(introVideoUri)}" type="video/mp4">
</video>
<div class="shade"></div>
<script>
(function(){
  var sent=false;
  function done(){
    if(sent)return;
    sent=true;
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage('done');
  }
  var video=document.getElementById('introVideo');
  if(!video){done();return;}
  video.muted=true;
  video.addEventListener('ended',done);
  video.addEventListener('error',function(){setTimeout(done,700);});
  var playPromise=video.play();
  if(playPromise&&playPromise.catch){
    playPromise.catch(function(){setTimeout(done,1400);});
  }
  setTimeout(done,5200);
})();
</script>
</body>
</html>`;

  return (
    <View style={styles.introOverlay}>
      <WebView
        source={{ html: videoHtml, baseUrl: '' }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled={false}
        scrollEnabled={false}
        bounces={false}
        allowFileAccess
        allowUniversalAccessFromFileURLs
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="always"
        onMessage={onDone}
        style={styles.introWebView}
      />
      <View pointerEvents="none" style={styles.introBrand}>
        <Image source={require('../assets/logo.png')} style={styles.introLogo} />
        <View>
          <Text style={styles.introTitle}>Kemal Öğretmenim</Text>
          <Text style={styles.introSubtitle}>Mobil öğrenme alanı açılıyor</Text>
        </View>
      </View>
      <Pressable accessibilityRole="button" onPress={onDone} style={styles.introSkip}>
        <Text style={styles.introSkipText}>Geç</Text>
      </Pressable>
    </View>
  );
}

export default function Index() {
  const { profile, userId } = useAuth();
  const { width } = useWindowDimensions();
  const [showIntro, setShowIntro] = useState(true);
  const slideWidth = Math.min(width - 44, 336);
  const isSignedIn = Boolean(profile || userId);

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 5600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.brandLockup}>
            <Image source={require('../assets/logo.png')} style={styles.logo} />
            <View>
              <Text style={styles.brandSmall}>Kemal Öğretmenim</Text>
              <Text style={styles.brandSub}>Mobil öğrenme alanı</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => (isSignedIn ? router.push('/(app)/home') : router.push('/login'))}
            style={styles.loginButton}
          >
            <Ionicons name={isSignedIn ? 'grid-outline' : 'log-in-outline'} size={18} color={colors.purple} />
            <Text style={styles.loginText}>{isSignedIn ? 'Panel' : 'Giriş'}</Text>
          </Pressable>
        </View>

        <View style={styles.mobileIntro}>
          <Text style={styles.heroKicker}>Bugün ne çalışıyoruz?</Text>
          <Text style={styles.mobileIntroTitle}>Bir modül seç, hemen başla.</Text>
          <Text style={styles.mobileIntroText}>Okuma, sınav ve oyun alanları mobil ekran için ayrı hazırlandı.</Text>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Mobil vitrin</Text>
          <Text style={styles.sectionAction}>kaydır</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={slideWidth + 12}
          decelerationRate="fast"
          contentContainerStyle={styles.featureTrack}
        >
          {primaryShortcuts.map((item) => (
            <FeatureSlide key={item.path} item={item} width={slideWidth} />
          ))}
        </ScrollView>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Hızlı başlat</Text>
          <Text style={styles.sectionAction}>tek dokunuş</Text>
        </View>
        {primaryShortcuts.map((item) => (
          <QuickAction key={item.path} item={item} />
        ))}

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Canlı kartlar</Text>
          <Text style={styles.sectionAction}>mobil rota</Text>
        </View>
        {liveCards.map((card) => (
          <View key={card.title} style={styles.liveCard}>
            <View style={styles.liveIcon}>
              <Ionicons name={card.icon} size={21} color={colors.purple} />
            </View>
            <View style={styles.liveText}>
              <Text style={styles.liveTitle}>{card.title}</Text>
              <Text style={styles.liveDesc}>{card.text}</Text>
            </View>
          </View>
        ))}

        <View style={styles.nativeBridge}>
          <View style={styles.bridgeText}>
            <Text style={styles.bridgeTitle}>Web sitesine geçiş</Text>
            <Text style={styles.bridgeDesc}>Tüm web sitesini uygulama içinde aç.</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => openWeb('/', 'Kemal Öğretmenim')} style={styles.bridgeButton}>
            <Ionicons name="globe-outline" size={19} color={colors.white} />
            <Text style={styles.bridgeButtonText}>Siteyi Aç</Text>
          </Pressable>
        </View>
      </ScrollView>
      {showIntro ? <IntroVideoOverlay onDone={() => setShowIntro(false)} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: '#F7F2FF',
    flex: 1,
  },
  introOverlay: {
    backgroundColor: '#160A3A',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 20,
  },
  introWebView: {
    backgroundColor: '#160A3A',
    flex: 1,
  },
  introBrand: {
    alignItems: 'center',
    bottom: 38,
    flexDirection: 'row',
    gap: 12,
    left: 22,
    position: 'absolute',
    right: 88,
  },
  introLogo: {
    backgroundColor: colors.white,
    borderRadius: 16,
    height: 52,
    width: 52,
  },
  introTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '900',
  },
  introSubtitle: {
    color: 'rgba(255,255,255,.78)',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  introSkip: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,.92)',
    borderRadius: 999,
    bottom: 42,
    minHeight: 40,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 20,
    justifyContent: 'center',
  },
  introSkipText: {
    color: colors.purple,
    fontSize: 12,
    fontWeight: '900',
  },
  scroll: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: 36,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brandLockup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  logo: {
    borderRadius: 14,
    height: 44,
    width: 44,
  },
  brandSmall: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900',
  },
  brandSub: {
    color: colors.slate,
    fontSize: 12,
    fontWeight: '800',
  },
  loginButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  loginText: {
    color: colors.purple,
    fontSize: 12,
    fontWeight: '900',
  },
  mobileIntro: {
    backgroundColor: colors.navy,
    borderRadius: 28,
    gap: 8,
    padding: spacing.lg,
  },
  mobileIntroTitle: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 33,
  },
  mobileIntroText: {
    color: '#D8D3EA',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  hero: {
    backgroundColor: colors.navy,
    borderRadius: 28,
    flexDirection: 'row',
    gap: 14,
    minHeight: 226,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  heroText: {
    flex: 1.1,
    gap: 10,
    justifyContent: 'center',
  },
  heroKicker: {
    color: colors.yellow,
    fontSize: 12,
    fontWeight: '900',
  },
  heroTitle: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  heroDesc: {
    color: '#D8D3EA',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  heroDevice: {
    alignSelf: 'center',
    backgroundColor: '#FFFDF8',
    borderRadius: 30,
    gap: 12,
    minHeight: 178,
    padding: 14,
    width: 128,
  },
  deviceNotch: {
    alignSelf: 'center',
    backgroundColor: '#DAD2F8',
    borderRadius: 999,
    height: 8,
    width: 42,
  },
  deviceCard: {
    alignItems: 'center',
    backgroundColor: '#F1E9FF',
    borderRadius: radius.md,
    gap: 8,
    padding: 10,
  },
  deviceCardAlt: {
    backgroundColor: '#FFF0E8',
  },
  deviceTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  deviceText: {
    color: colors.slate,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  sectionHead: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 19,
    fontWeight: '900',
  },
  sectionAction: {
    color: colors.slate,
    fontSize: 12,
    fontWeight: '900',
  },
  featureTrack: {
    gap: 12,
    paddingRight: 6,
  },
  featureSlide: {
    borderRadius: 28,
    gap: 16,
    minHeight: 230,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  featureHalo: {
    backgroundColor: 'rgba(255,255,255,.14)',
    borderRadius: 999,
    height: 160,
    position: 'absolute',
    right: -54,
    top: -46,
    width: 160,
  },
  featureTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featureIcon: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 22,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  featurePill: {
    backgroundColor: 'rgba(255,255,255,.18)',
    borderColor: 'rgba(255,255,255,.28)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  featurePillText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '900',
  },
  featureCopy: {
    gap: 7,
    minWidth: 0,
  },
  featureEyebrow: {
    color: 'rgba(255,255,255,.78)',
    fontSize: 12,
    fontWeight: '900',
  },
  featureTitle: {
    color: colors.white,
    fontSize: 31,
    fontWeight: '900',
    lineHeight: 36,
  },
  featureSubtitle: {
    color: 'rgba(255,255,255,.82)',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  featureFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  featureAction: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  quickAction: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 68,
    padding: spacing.md,
  },
  quickIcon: {
    alignItems: 'center',
    borderRadius: 17,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  quickText: {
    flex: 1,
    minWidth: 0,
  },
  quickTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900',
  },
  quickSubtitle: {
    color: colors.slate,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  shortcutCard: {
    borderColor: 'rgba(255,255,255,.72)',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: spacing.md,
  },
  shortcutCardFeatured: {
    alignItems: 'center',
    minHeight: 154,
  },
  shortcutCardCompact: {
    alignItems: 'flex-start',
    flex: 1,
    minHeight: 188,
  },
  shortcutIcon: {
    alignItems: 'center',
    borderRadius: 20,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  shortcutBody: {
    flex: 1,
    gap: 5,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
  },
  shortcutTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
  },
  shortcutSubtitle: {
    color: colors.slate,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  metricPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,.72)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    marginTop: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  metricText: {
    fontSize: 11,
    fontWeight: '900',
  },
  compactGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  liveCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: spacing.md,
  },
  liveIcon: {
    alignItems: 'center',
    backgroundColor: '#F1E9FF',
    borderRadius: 18,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  liveText: {
    flex: 1,
    gap: 3,
  },
  liveTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900',
  },
  liveDesc: {
    color: colors.slate,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  nativeBridge: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: spacing.md,
  },
  bridgeText: {
    flex: 1,
    gap: 4,
  },
  bridgeTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900',
  },
  bridgeDesc: {
    color: colors.slate,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  bridgeButton: {
    alignItems: 'center',
    backgroundColor: colors.purple,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  bridgeButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
});
