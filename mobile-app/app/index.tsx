import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { colors, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

type IconName = keyof typeof Ionicons.glyphMap;

type ShowcaseCard = {
  title: string;
  subtitle: string;
  badge: string;
  icon: IconName;
  color: string;
  path?: string;
  route?: '/reading';
};

type MiniCard = {
  title: string;
  icon: IconName;
  color: string;
  path: string;
};

const introVideoAsset = require('../assets/intro/kemal-ogretmenim-intro.mp4');

const showcaseCards: ShowcaseCard[] = [
  {
    title: 'Hızlı Okuma',
    subtitle: 'Metnini seç, dikkatini topla, süreyi başlat.',
    badge: 'Oku ve ölç',
    icon: 'book-outline',
    color: '#7C4DFF',
    route: '/reading',
  },
  {
    title: 'Sınav Sistemi',
    subtitle: 'Seviyene uygun denemeyi çöz, karneni gör.',
    badge: 'Seç ve başla',
    icon: 'help-buoy-outline',
    color: '#FF7A59',
    path: '/sinav_sitesi/index.html',
  },
  {
    title: 'Oyunlar',
    subtitle: 'Eğitici oyunlarla tekrar yap ve puan topla.',
    badge: 'Oyna',
    icon: 'game-controller-outline',
    color: '#00B982',
    path: '/oyun/oyunlar.html',
  },
];

const primaryGrades: MiniCard[] = [1, 2, 3, 4].map((grade, index) => ({
  title: `${grade}. Sınıf`,
  icon: ['pencil-outline', 'create-outline', 'document-text-outline', 'cash-outline'][index] as IconName,
  color: ['#FF7043', '#4F6DFF', '#D77BEF', '#FF5BB8'][index],
  path: `/siniflar/${grade}-sinif.html`,
}));

const middleGrades: MiniCard[] = [5, 6, 7, 8].map((grade, index) => ({
  title: `${grade}. Sınıf`,
  icon: ['easel-outline', 'people-outline', 'school-outline', 'school-outline'][index] as IconName,
  color: ['#FF7043', '#4F6DFF', '#D77BEF', '#FF5BB8'][index],
  path: `/siniflar/ortaokul.html?sinif=${grade}`,
}));

const teacherTools: MiniCard[] = [
  { title: 'Akıllı Tahta', icon: 'tablet-landscape-outline', color: '#7C4DFF', path: '/ogretmen/beyaztahta.html' },
  { title: 'Sınıf Yönetimi', icon: 'people-circle-outline', color: '#00A991', path: '/ogretmen-paneli.html' },
  { title: 'Araçlar', icon: 'construct-outline', color: '#FF7043', path: '/ogretmen-araclari.html' },
  { title: 'Ders Programı', icon: 'calendar-outline', color: '#0B78E3', path: '/ogretmen-ders-plani.html' },
];

const bottomNav = [
  { title: 'Ana Sayfa', icon: 'home-outline' as IconName, path: '/' },
  { title: 'Derslerim', icon: 'book-outline' as IconName, path: '/ders.html' },
  { title: 'Sınavlarım', icon: 'reader-outline' as IconName, path: '/sinav_sitesi/index.html' },
  { title: 'Topluluk', icon: 'people-outline' as IconName, path: '/ogrenci-paneli.html' },
  { title: 'Arama', icon: 'search-outline' as IconName, path: '/ders.html#arama' },
];

function openWeb(path: string, title: string) {
  router.push({ pathname: '/webview', params: { path, title } });
}

function openShowcase(item: ShowcaseCard) {
  if (item.route) {
    router.push(item.route);
    return;
  }
  if (item.path) openWeb(item.path, item.title);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function IntroVideoOverlay({ onDone }: { onDone: () => void }) {
  const [videoUri, setVideoUri] = useState('');

  useEffect(() => {
    let mounted = true;
    Asset.fromModule(introVideoAsset)
      .downloadAsync()
      .then((asset) => {
        if (mounted) setVideoUri(asset.localUri || asset.uri);
      })
      .catch(() => onDone());
    return () => {
      mounted = false;
    };
  }, [onDone]);

  const videoHtml = useMemo(() => {
    if (!videoUri) return '';
    return `
<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>
html,body{margin:0;width:100%;height:100%;background:#160A3A;overflow:hidden}
video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#160A3A}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(22,10,58,0) 46%,rgba(22,10,58,.82))}
</style>
</head>
<body>
<video id="introVideo" autoplay muted playsinline webkit-playsinline preload="auto">
  <source src="${escapeHtml(videoUri)}" type="video/mp4">
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
  }, [videoUri]);

  return (
    <View style={styles.introOverlay}>
      {videoHtml ? (
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
      ) : null}
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

function ShowcaseTile({ item, width }: { item: ShowcaseCard; width: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => openShowcase(item)}
      style={({ pressed }) => [styles.showcaseTile, { width, backgroundColor: item.color }, pressed && styles.pressed]}
    >
      <View style={styles.tileOrb} />
      <View style={styles.tileTop}>
        <View style={styles.tileIconWrap}>
          <Ionicons name={item.icon} size={36} color={item.color} />
        </View>
        <View style={styles.tileBadge}>
          <Text style={styles.tileBadgeText}>{item.badge}</Text>
        </View>
      </View>
      <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.tileTitle}>
        {item.title}
      </Text>
      <Text numberOfLines={3} style={styles.tileSubtitle}>{item.subtitle}</Text>
      <Ionicons name="arrow-forward-circle" size={28} color={colors.white} style={styles.tileArrow} />
    </Pressable>
  );
}

function ModuleGrid({ title, items }: { title: string; items: MiniCard[] }) {
  return (
    <View style={styles.moduleSection}>
      <Text style={styles.moduleTitle}>{title}</Text>
      <View style={styles.moduleGrid}>
        {items.map((item) => (
          <Pressable
            key={item.title}
            accessibilityRole="button"
            onPress={() => openWeb(item.path, item.title)}
            style={({ pressed }) => [styles.moduleCard, pressed && styles.pressed]}
          >
            <Ionicons name={item.icon} size={28} color={item.color} />
            <Text style={[styles.moduleNumber, { color: item.color }]}>{item.title.split('.')[0]}</Text>
            <Text numberOfLines={2} style={styles.moduleLabel}>{item.title.includes('Sınıf') ? 'Sınıf Modülü' : item.title}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function Index() {
  const { profile, userId } = useAuth();
  const { width } = useWindowDimensions();
  const [showIntro, setShowIntro] = useState(Platform.OS !== 'web');
  const tileWidth = Math.min(170, Math.max(148, width * 0.43));
  const isSignedIn = Boolean(profile || userId);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const timer = setTimeout(() => setShowIntro(false), 5800);
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
          <View style={styles.topActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => (isSignedIn ? router.push('/(app)/home') : router.push('/login'))}
              style={styles.loginButton}
            >
              <Ionicons name={isSignedIn ? 'grid-outline' : 'log-in-outline'} size={18} color={colors.purple} />
              <Text style={styles.loginText}>{isSignedIn ? 'Panel' : 'Giriş'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => openWeb('/', 'Kemal Öğretmenim')} style={styles.menuButton}>
              <Ionicons name="menu" size={25} color={colors.navy} />
            </Pressable>
          </View>
        </View>

        <View style={styles.newsTicker}>
          <View style={styles.newsBadge}>
            <Ionicons name="notifications" size={12} color={colors.white} />
            <Text style={styles.newsBadgeText}>GÜNCEL</Text>
          </View>
          <Text numberOfLines={1} style={styles.newsText}>1. Sınıf yıl sonu değerlendirme sınavı ve okuma modülleri yayında.</Text>
        </View>

        <View style={styles.sectionHead}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="compass-outline" size={24} color={colors.navy} />
            <Text style={styles.sectionTitle}>Keşfet & Öğren Vitrini</Text>
          </View>
          <Text style={styles.sectionAction}>Sürükle ve keşfet</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={tileWidth + 12}
          decelerationRate="fast"
          contentContainerStyle={styles.showcaseTrack}
        >
          {showcaseCards.map((item) => (
            <ShowcaseTile key={item.title} item={item} width={tileWidth} />
          ))}
        </ScrollView>

        <View style={styles.dotRow}>
          {showcaseCards.map((item, index) => (
            <View key={item.title} style={[styles.dot, index === 0 && styles.dotActive]} />
          ))}
        </View>

        <ModuleGrid title="İlkokul" items={primaryGrades} />
        <ModuleGrid title="Ortaokul" items={middleGrades} />

        <View style={styles.moduleSection}>
          <Text style={styles.moduleTitle}>Öğretmen Araçları</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.teacherTrack}>
            {teacherTools.map((item) => (
              <Pressable
                key={item.title}
                accessibilityRole="button"
                onPress={() => openWeb(item.path, item.title)}
                style={({ pressed }) => [styles.teacherCard, pressed && styles.pressed]}
              >
                <View style={[styles.teacherIcon, { backgroundColor: `${item.color}18` }]}>
                  <Ionicons name={item.icon} size={42} color={item.color} />
                </View>
                <Text numberOfLines={2} style={styles.teacherLabel}>{item.title}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      <View style={styles.bottomDock}>
        {bottomNav.map((item, index) => (
          <Pressable
            key={item.title}
            accessibilityRole="button"
            onPress={() => openWeb(item.path, item.title)}
            style={styles.bottomItem}
          >
            <Ionicons name={item.icon} size={24} color={index === 0 ? colors.purple : colors.navy} />
            <Text numberOfLines={1} style={[styles.bottomText, index === 0 && styles.bottomTextActive]}>{item.title}</Text>
          </Pressable>
        ))}
      </View>

      {showIntro ? <IntroVideoOverlay onDone={() => setShowIntro(false)} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: '#F7F2FF',
    flex: 1,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: 112,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  brandLockup: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: 10,
  },
  logo: {
    borderRadius: 12,
    height: 46,
    width: 46,
  },
  brandSmall: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: '900',
  },
  brandSub: {
    color: colors.slate,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1,
  },
  topActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  loginButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 13,
  },
  loginText: {
    color: colors.purple,
    fontSize: 13,
    fontWeight: '900',
  },
  menuButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 38,
  },
  newsTicker: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 0,
    flexDirection: 'row',
    marginHorizontal: -spacing.md,
    marginBottom: 14,
    overflow: 'hidden',
  },
  newsBadge: {
    alignItems: 'center',
    backgroundColor: colors.purple,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newsBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '900',
  },
  newsText: {
    color: colors.slate,
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 10,
  },
  sectionHead: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '900',
  },
  sectionAction: {
    color: colors.slate,
    fontSize: 12,
    fontWeight: '800',
  },
  showcaseTrack: {
    gap: 12,
    paddingBottom: 2,
    paddingRight: 10,
  },
  showcaseTile: {
    borderColor: 'rgba(15,23,42,.15)',
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 184,
    overflow: 'hidden',
    padding: 14,
    shadowColor: colors.navy,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  tileOrb: {
    backgroundColor: 'rgba(26,16,64,.18)',
    borderRadius: 999,
    height: 112,
    position: 'absolute',
    right: -36,
    top: -34,
    width: 112,
  },
  tileTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tileIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,.9)',
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  tileBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(26,16,64,.24)',
    borderRadius: 999,
    maxWidth: 70,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  tileBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  tileTitle: {
    color: colors.white,
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 27,
    marginTop: 18,
    textShadowColor: 'rgba(0,0,0,.18)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tileSubtitle: {
    color: 'rgba(255,255,255,.92)',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 7,
  },
  tileArrow: {
    bottom: 12,
    position: 'absolute',
    right: 12,
  },
  dotRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    marginBottom: 10,
    marginTop: 9,
  },
  dot: {
    backgroundColor: '#CBC5D7',
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  dotActive: {
    backgroundColor: colors.navy,
    width: 9,
  },
  moduleSection: {
    marginTop: 8,
  },
  moduleTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moduleCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: 'rgba(26,16,64,.08)',
    borderRadius: 12,
    borderWidth: 1,
    flexBasis: '22.6%',
    flexGrow: 1,
    minHeight: 100,
    minWidth: 74,
    paddingHorizontal: 6,
    paddingVertical: 10,
    shadowColor: colors.navy,
    shadowOpacity: 0.09,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  moduleNumber: {
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 34,
    marginTop: 2,
  },
  moduleLabel: {
    color: colors.navy,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 14,
    marginTop: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  teacherTrack: {
    gap: 10,
    paddingRight: 10,
  },
  teacherCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: 'rgba(26,16,64,.08)',
    borderRadius: 13,
    borderWidth: 1,
    minHeight: 110,
    padding: 9,
    width: 112,
    shadowColor: colors.navy,
    shadowOpacity: 0.09,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  teacherIcon: {
    alignItems: 'center',
    borderRadius: 13,
    height: 62,
    justifyContent: 'center',
    width: 86,
  },
  teacherLabel: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 15,
    marginTop: 8,
    textAlign: 'center',
  },
  bottomDock: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    left: 0,
    minHeight: 78,
    paddingBottom: 12,
    paddingHorizontal: 8,
    paddingTop: 8,
    position: 'absolute',
    right: 0,
  },
  bottomItem: {
    alignItems: 'center',
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  bottomText: {
    color: colors.navy,
    fontSize: 10,
    fontWeight: '800',
  },
  bottomTextActive: {
    color: colors.purple,
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
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 20,
  },
  introSkipText: {
    color: colors.purple,
    fontSize: 12,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
});
