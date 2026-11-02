import { Redirect, router, Tabs, usePathname } from 'expo-router';
import { AccessibilityInfo, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { ComponentRef, useEffect, useRef, useState } from 'react';
import { BlurTargetView, BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/context/AuthContext';
import { Icon, Waiting } from '@/platform/components';
import { usePlatform } from '@/platform/PlatformContext';
import { layoutFor } from '@/platform/model';

const destinations = [
  { name: 'today', label: 'Bugün', icon: 'home-outline' },
  { name: 'explore', label: 'Keşfet', icon: 'compass-outline' },
  { name: 'agenda', label: 'Ajanda', icon: 'calendar-outline' },
  { name: 'account', label: 'Hesabım', icon: 'person-outline' },
] as const;
export const unstable_settings = { initialRouteName: 'today' };
export default function AppLayout() {
  const { loading, profile, userId } = useAuth();
  const { palette, dark } = usePlatform();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const blurTarget = useRef<ComponentRef<typeof View>>(null);
  const [solid, setSolid] = useState(false);
  useEffect(() => { if (Platform.OS !== 'ios' || typeof AccessibilityInfo.isReduceTransparencyEnabled !== 'function') return; let active = true; void AccessibilityInfo.isReduceTransparencyEnabled().then(value => { if (active) setSolid(value); }).catch(() => undefined); const listener = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setSolid); return () => { active = false; listener.remove(); }; }, []);
  const active = pathname.split('/').filter(Boolean).pop() || 'today';
  const protectedPage = ['home', 'profile', 'messages', 'assignments'].includes(active);
  const rail = layoutFor(width, height).rail;
  if (protectedPage && loading) return <View style={{ flex: 1, backgroundColor: palette.background }}><Waiting /></View>;
  if (protectedPage && !profile) return <Redirect href="/login" />;
  function navigation(vertical = false) {
    const entries = <View accessibilityRole="tablist" style={vertical ? { gap: 10, padding: 16 } : { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 7, gap: 3 }}>
      {destinations.map(d => <Pressable key={d.name} accessibilityRole="tab" accessibilityLabel={d.label} accessibilityState={{ selected: active === d.name }} onPress={() => router.navigate(`/(app)/${d.name}`)} style={({ pressed }) => ({ flex: vertical ? undefined : 1, flexDirection: vertical ? 'row' : 'column', alignItems: 'center', justifyContent: vertical ? 'flex-start' : 'center', gap: vertical ? 14 : 5, borderRadius: 16, paddingHorizontal: vertical ? 16 : 2, minHeight: vertical ? 54 : 52, backgroundColor: active === d.name || pressed ? palette.soft : 'transparent' })}>
        <Icon name={d.icon} size={23} color={active === d.name ? palette.primary : palette.muted} /><Text style={{ color: active === d.name ? palette.primary : palette.muted, fontSize: vertical ? 14 : 11, fontWeight: active === d.name ? '700' : '500' }}>{d.label}</Text>
      </Pressable>)}
    </View>;
    if (vertical) return entries;
    return <View style={{ position: 'absolute', bottom: Math.max(insets.bottom, 9), left: 12, right: 12, borderRadius: 25, borderWidth: 1, borderColor: dark ? '#FFFFFF24' : '#FFFFFFE0', overflow: 'hidden', boxShadow: dark ? '0px 8px 28px #00000040' : '0px 8px 28px #222B4218' }}><BlurView blurTarget={blurTarget} blurMethod={solid || Platform.OS === 'web' ? 'none' : 'dimezisBlurViewSdk31Plus'} tint={dark ? 'systemThinMaterialDark' : 'systemThinMaterialLight'} intensity={solid ? 0 : 55} style={{ backgroundColor: solid ? palette.surface : dark ? 'rgba(27,34,48,0.72)' : 'rgba(255,255,255,0.74)' }}>{entries}</BlurView></View>;
  }
  return <View style={{ flex: 1, flexDirection: 'row', backgroundColor: palette.background }}>
    <StatusBar style={dark ? 'light' : 'dark'} />
    {rail && <View style={{ width: 228, paddingTop: insets.top + 38, borderRightWidth: 1, borderRightColor: palette.line, backgroundColor: palette.surface }}><View style={{ paddingHorizontal: 26, gap: 6, marginBottom: 30 }}><Icon name="school-outline" size={30} /><Text style={{ fontSize: 18, color: palette.text, fontWeight: '700' }}>Kemal Öğretmenim</Text><Text style={{ color: palette.muted, fontSize: 12 }}>Öğrenme alanın</Text></View>{navigation(true)}<Text style={{ color: palette.muted, fontSize: 11, padding: 28, lineHeight: 18 }}>Merakla başlar,{ '\n' }öğrenmeyle büyür.</Text></View>}
    <View style={{ flex: 1, minWidth: 0 }}><BlurTargetView ref={blurTarget} style={{ flex: 1, paddingBottom: rail ? 0 : 85 + insets.bottom }}><Tabs key={userId || 'guest'} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: palette.background } }} tabBar={() => null}>
      <Tabs.Screen name="today" options={{ title: 'Bugün' }} />
      <Tabs.Screen name="explore" options={{ title: 'Keşfet' }} />
      <Tabs.Screen name="agenda" options={{ title: 'Ajanda' }} />
      <Tabs.Screen name="account" options={{ title: 'Hesabım' }} />
      <Tabs.Screen name="home" options={{ href: null, title: 'Sınıf Panelim' }} />
      <Tabs.Screen name="assignments" options={{ href: null, title: 'Ödevler' }} />
      <Tabs.Screen name="messages" options={{ href: null, title: 'Mesajlar' }} />
      <Tabs.Screen name="tools" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null, title: 'Profilim' }} />
    </Tabs></BlurTargetView>{!rail && navigation()}</View>
  </View>;
}
