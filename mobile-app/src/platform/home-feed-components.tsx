import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Image, Linking, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { usePlatform } from './PlatformContext';
import { Action, Icon, IconButton } from './components';
import { HomeFeedItem, HomeSlide } from './home-feed-model';
import { APP_CONFIG } from '@/constants/config';
import { internalUrl, safeExternalUrl } from './urlPolicy';
import { openActivity } from './navigation';

export function openHomeContent(href: string, title: string) {
  if (!href) return;
  const firstParty = internalUrl(href, APP_CONFIG.siteUrl);
  if (firstParty && !/\.apk(?:$|[?#])/i.test(firstParty)) { openActivity(firstParty, title); return; }
  const external = safeExternalUrl(href); if (external) void Linking.openURL(external).catch(() => {});
}
export function useQuietMotion() {
  const [reduceMotion, setReduceMotion] = useState(true);
  const [reader, setReader] = useState(true);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }).catch(() => {});
    AccessibilityInfo.isScreenReaderEnabled().then(value => { if (active) setReader(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const screenReader = AccessibilityInfo.addEventListener('screenReaderChanged', setReader);
    return () => { active = false; motion.remove(); screenReader.remove(); };
  }, []);
  return reduceMotion || reader;
}
export function LiveHomeFlow({ items, running, quiet }: { items: HomeFeedItem[]; running: boolean; quiet: boolean }) {
  const { palette } = usePlatform();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;
  const item = items[index % Math.max(1, items.length)];
  useEffect(() => { setIndex(0); }, [items]);
  useEffect(() => {
    if (!running || quiet || paused || items.length < 2) return;
    const timer = setInterval(() => setIndex(current => (current + 1) % items.length), 6500);
    return () => clearInterval(timer);
  }, [running, quiet, paused, items.length]);
  useEffect(() => {
    slide.stopAnimation(); slide.setValue(quiet ? 0 : 18);
    if (!quiet) Animated.timing(slide, { toValue: 0, duration: 320, useNativeDriver: Platform.OS !== 'web' }).start();
    return () => slide.stopAnimation();
  }, [item?.id, quiet, slide]);
  if (!item) return null;
  return <View style={{ backgroundColor: palette.surface, borderColor: palette.line, borderWidth: 1, borderRadius: 19, paddingLeft: 14, paddingRight: 4, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 86, overflow: 'hidden' }}>
    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: palette.green }} />
    <Pressable accessibilityRole="button" accessibilityLabel={`Canlı akış. ${item.kind}. ${item.title}. Aç`} onPress={() => openHomeContent(item.href, item.title)} style={{ flex: 1, minWidth: 0, paddingVertical: 12 }}>
      <Text style={{ color: palette.green, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 5 }}>CANLI AKIŞ · {item.kind.toLocaleUpperCase('tr-TR')}{item.grade ? ` · ${item.grade}. SINIF` : ''}</Text>
      <Animated.View style={{ transform: [{ translateX: slide }] }}><Text numberOfLines={2} style={{ color: palette.text, fontSize: 14, lineHeight: 20, fontWeight: '500' }}>{item.title}</Text></Animated.View>
    </Pressable>
    {!quiet && items.length > 1 && <IconButton label={paused ? 'Canlı akışı oynat' : 'Canlı akışı duraklat'} icon={paused ? 'play-outline' : 'pause-outline'} selected={paused} onPress={() => setPaused(value => !value)} />}
    <IconButton label="Sonraki canlı akış içeriği" icon="chevron-forward" onPress={() => { setPaused(true); setIndex(current => (current + 1) % items.length); }} />
  </View>;
}
export function HomeShowcase({ slides, running, quiet }: { slides: HomeSlide[]; running: boolean; quiet: boolean }) {
  const { palette } = usePlatform(); const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0); const [paused, setPaused] = useState(false); const [failedImage, setFailedImage] = useState('');
  const item = slides[index % Math.max(1, slides.length)];
  const wide = width >= 740;
  useEffect(() => { setIndex(0); }, [slides]);
  useEffect(() => {
    if (!running || quiet || paused || !item || slides.length < 2) return;
    const timer = setTimeout(() => setIndex(value => (value + 1) % slides.length), item.duration);
    return () => clearTimeout(timer);
  }, [running, quiet, paused, index, item, slides.length]);
  if (!item) return null;
  const step = (direction: number) => { setPaused(true); setIndex(value => (value + direction + slides.length) % slides.length); };
  return <View style={{ backgroundColor: palette.soft, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: palette.line }}>
    <View style={{ paddingHorizontal: 19, paddingTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text accessibilityRole="header" style={{ color: palette.primary, fontWeight: '700', fontSize: 11, letterSpacing: 1.2 }}>VİTRİN</Text><Text style={{ color: palette.muted, fontSize: 12 }}>{index % slides.length + 1} / {slides.length}</Text></View>
    <View style={{ flexDirection: wide ? 'row-reverse' : 'column', padding: 20, gap: 20, alignItems: wide ? 'center' : 'stretch' }}>
      <View accessible={false} style={{ width: wide ? '34%' : '100%', height: wide ? 170 : 126, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: palette.surface, overflow: 'hidden' }}>
        {item.image && item.image !== failedImage ? <Image source={{ uri: item.image }} resizeMode={item.fit} style={{ width: '100%', height: '100%' }} onError={() => setFailedImage(item.image)} accessibilityLabel="" /> : <View style={{ alignItems: 'center', justifyContent: 'center', width: 88, height: 88, borderRadius: 28, borderColor: palette.line, borderWidth: 1, backgroundColor: palette.background }}><Icon name={item.icon} size={48} /></View>}
      </View>
      <View style={{ flex: wide ? 1 : undefined, gap: 11, minWidth: 0 }}><Text style={{ color: palette.muted, fontSize: 11, fontWeight: '600' }}>{item.kind}</Text><Text accessibilityRole="header" style={{ color: palette.text, fontSize: wide ? 24 : 21, lineHeight: wide ? 31 : 28, fontWeight: '600', letterSpacing: -0.5 }}>{item.title}</Text>{!!item.description && <Text numberOfLines={3} style={{ color: palette.muted, fontSize: 13, lineHeight: 21 }}>{item.description}</Text>}{!!item.href && <View style={{ alignSelf: 'flex-start', marginTop: 2 }}><Action label={item.label} icon="arrow-forward" onPress={() => openHomeContent(item.href, item.title)} /></View>}</View>
    </View>
    {slides.length > 1 && <View style={{ borderTopWidth: 1, borderTopColor: palette.line, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', flex: 1, paddingLeft: 8 }}><Text style={{ color: palette.muted, fontSize: 11 }}>{paused || quiet ? 'Elle gezinme' : 'Sitedeki güncel vitrin'}</Text></View>
      {!quiet && <IconButton label={paused ? 'Vitrin otomatik geçişini başlat' : 'Vitrin otomatik geçişini duraklat'} icon={paused ? 'play-outline' : 'pause-outline'} selected={paused} onPress={() => setPaused(value => !value)} />}
      <IconButton label="Önceki vitrin" icon="chevron-back" onPress={() => step(-1)} /><IconButton label="Sonraki vitrin" icon="chevron-forward" onPress={() => step(1)} />
    </View>}
  </View>;
}
