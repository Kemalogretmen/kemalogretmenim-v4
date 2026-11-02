import { Ionicons } from '@expo/vector-icons';
import { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LearningModule } from './catalog';
import { usePlatform } from './PlatformContext';
import { layoutFor } from './model';
import { openModule } from './navigation';
export type IconName = keyof typeof Ionicons.glyphMap;
export function Icon({ name, color, size = 22 }: { name: string; color?: string; size?: number }) {
  const { palette } = usePlatform();
  return <Ionicons name={name as IconName} color={color || palette.primary} size={size} />;
}
export function Action({ label, onPress, icon, secondary = false, disabled = false }: { label: string; onPress: () => void; icon?: string; secondary?: boolean; disabled?: boolean }) {
  const { palette } = usePlatform();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.action, { backgroundColor: secondary ? palette.soft : palette.primary, opacity: disabled ? 0.45 : pressed ? 0.78 : 1 }]}>
    {icon && <Icon name={icon} color={secondary ? palette.primary : palette.onPrimary} size={19} />}
    <Text style={{ color: secondary ? palette.primary : palette.onPrimary, fontSize: 14, fontWeight: '600', flexShrink: 1 }}>{label}</Text>
  </Pressable>;
}
export function IconButton({ label, icon, onPress, selected = false }: { label: string; icon: string; onPress: () => void; selected?: boolean }) {
  const { palette } = usePlatform();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [s.iconButton, { backgroundColor: selected || pressed ? palette.soft : 'transparent' }]}><Icon name={icon} /></Pressable>;
}
export function Page({ children, title, subtitle, action, refresh, refreshing = false }: PropsWithChildren<{ title: string; subtitle?: string; action?: React.ReactNode; refresh?: () => void; refreshing?: boolean }>) {
  const { palette, online, storageError } = usePlatform();
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: palette.background }}>
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={s.page}
      refreshControl={refresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.primary} /> : undefined}>
      <View style={s.pageInner}>
        <View style={s.headingRow}><View style={{ flex: 1 }}><Text style={[s.kicker, { color: palette.primary }]}>KEMAL ÖĞRETMENİM</Text><Text accessibilityRole="header" style={[s.heading, { color: palette.text }]}>{title}</Text>{subtitle && <Text style={[s.description, { color: palette.muted }]}>{subtitle}</Text>}</View>{action}</View>
        {!online && <Notice text="Çevrimdışısın. Cihaz planların ve kaydedilen kısayolların kullanılabilir; canlı içerikler bağlantı gerektirir." />}
        {!!storageError && <Notice text={storageError} />}
        {children}
      </View>
    </ScrollView>
  </SafeAreaView>;
}
export function Panel({ children }: PropsWithChildren) {
  const { palette } = usePlatform();
  return <View style={[s.panel, { backgroundColor: palette.surface, borderColor: palette.line }]}>{children}</View>;
}
export function Section({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  const { palette } = usePlatform();
  return <View style={s.section}><Text accessibilityRole="header" style={[s.sectionTitle, { color: palette.text }]}>{title}</Text>{action && <Pressable accessibilityRole="button" onPress={onPress} style={s.sectionAction}><Text style={{ color: palette.primary, fontWeight: '600', fontSize: 13 }}>{action}</Text><Icon name="arrow-forward" size={16} /></Pressable>}</View>;
}
export function Notice({ text }: { text: string }) {
  const { palette } = usePlatform();
  return <View accessibilityLiveRegion="polite" style={[s.notice, { backgroundColor: palette.soft }]}><Icon name="information-circle-outline" size={19} /><Text style={{ flex: 1, color: palette.text, fontSize: 13, lineHeight: 20 }}>{text}</Text></View>;
}
export function ModuleCard({ item, compact = false }: { item: LearningModule; compact?: boolean }) {
  const { palette, state, ready, visit, favorite } = usePlatform();
  const saved = state.favorites.includes(item.id);
  return <View style={[s.module, { backgroundColor: palette.surface, borderColor: palette.line }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}, aç`} onPress={() => openModule(item, visit)} style={({ pressed }) => [s.moduleMain, { opacity: pressed ? 0.65 : 1 }]}>
      <View style={[s.moduleIcon, { backgroundColor: palette.soft }]}><Icon name={item.icon} color={palette.primary} size={24} /></View>
      <View style={{ flex: 1, gap: 5 }}><Text style={[s.moduleTitle, { color: palette.text }]}>{item.title}</Text>{!compact && <Text style={[s.moduleSub, { color: palette.muted }]} numberOfLines={2}>{item.description}</Text>}</View>
      <Icon name="chevron-forward" color={palette.muted} size={17} />
    </Pressable>
    {!compact && <Pressable accessibilityRole="button" accessibilityLabel={`${item.title} ${saved ? 'kaydedilenlerden çıkar' : 'kaydet'}`} accessibilityState={{ selected: saved, disabled: !ready }} disabled={!ready} onPress={() => favorite(item.id)} style={[s.saveButton, { borderTopColor: palette.line }]}><Icon name={saved ? 'bookmark' : 'bookmark-outline'} size={16} /><Text style={{ color: palette.primary, fontSize: 12, fontWeight: '500' }}>{saved ? 'Kaydedildi' : 'Kaydet'}</Text></Pressable>}
  </View>;
}
export function ModuleGrid({ items, compact }: { items: LearningModule[]; compact?: boolean }) {
  const { width, height } = useWindowDimensions();
  const available = width - (layoutFor(width, height).rail ? 228 : 0) - (width < 600 ? 36 : 64);
  const columns = available >= 1060 ? 3 : available >= 560 ? 2 : 1;
  return <View style={s.grid}>{items.map(item => <View key={item.id} style={{ width: `${100 / columns}%`, padding: 6 }}><ModuleCard item={item} compact={compact} /></View>)}</View>;
}
export function SearchBox({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  const { palette } = usePlatform();
  return <View style={[s.search, { backgroundColor: palette.surface, borderColor: palette.line }]}><Icon name="search-outline" color={palette.muted} size={21} /><TextInput accessibilityLabel="İçerik ara" placeholder="Bir konu, oyun veya araç ara" placeholderTextColor={palette.muted} value={value} onChangeText={onChange} returnKeyType="search" style={{ color: palette.text, fontSize: 15, flex: 1, minWidth: 0, minHeight: 48 }} />{value.length > 0 && <IconButton label="Aramayı temizle" icon="close" onPress={() => onChange('')} />}</View>;
}
export function Waiting() { const { palette } = usePlatform(); return <ActivityIndicator accessibilityLabel="Yükleniyor" color={palette.primary} style={{ padding: 24 }} />; }
export function BackHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  const { palette } = usePlatform();
  return <View style={[s.backHeader, { backgroundColor: palette.surface, borderBottomColor: palette.line }]}><IconButton label="Geri dön" icon="chevron-back" onPress={() => router.canGoBack() ? router.back() : router.replace('/(app)/today')} /><Text numberOfLines={1} style={{ color: palette.text, flex: 1, fontSize: 16, fontWeight: '600' }}>{title}</Text>{action}</View>;
}
const s = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 26, paddingBottom: 28 }, pageInner: { width: '100%', maxWidth: 1240, alignSelf: 'center', gap: 18 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }, kicker: { fontSize: 10, letterSpacing: 1.8, fontWeight: '700', marginBottom: 9 }, heading: { fontSize: 30, fontWeight: '700', letterSpacing: -0.8 }, description: { fontSize: 14, lineHeight: 22, marginTop: 8, maxWidth: 600 },
  panel: { padding: 20, borderWidth: 1, borderRadius: 22, gap: 14 }, section: { flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }, sectionTitle: { fontSize: 19, fontWeight: '600', flexShrink: 1 }, sectionAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconButton: { minWidth: 48, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, action: { minHeight: 48, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  notice: { padding: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  module: { borderWidth: 1, borderRadius: 20, overflow: 'hidden', flex: 1 }, moduleMain: { padding: 17, flexDirection: 'row', alignItems: 'center', gap: 13, flex: 1 }, moduleIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, moduleTitle: { fontSize: 16, fontWeight: '600' }, moduleSub: { fontSize: 13, lineHeight: 20 }, saveButton: { borderTopWidth: 1, paddingHorizontal: 18, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7 },
  search: { borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 15, paddingRight: 6 }, backHeader: { borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 4, minHeight: 58 },
});
