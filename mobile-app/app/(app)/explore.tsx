import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { categories, Category, filterModules } from '@/platform/catalog';
import { Action, Icon, ModuleGrid, Page, Panel, SearchBox } from '@/platform/components';
import { usePlatform } from '@/platform/PlatformContext';
import { openActivity } from '@/platform/navigation';

export default function Explore() {
  const params = useLocalSearchParams<{ category?: string; saved?: string }>();
  const { palette, state } = usePlatform();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (categories.some(c => c.id === params.category)) setCategory(params.category as Category); if (params.saved) setSaved(params.saved === '1'); }, [params.category, params.saved]);
  const items = useMemo(() => filterModules(category, query, saved ? state.favorites : undefined), [category, query, saved, state.favorites]);
  return <Page title="Keşfet" subtitle="Dersler, sınıf araçları ve oyunlar. Hepsi aynı yerde.">
    <SearchBox value={query} onChange={setQuery} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{categories.map(c => <Pressable key={c.id} accessibilityRole="button" accessibilityState={{ selected: c.id === category }} onPress={() => setCategory(c.id)} style={{ borderRadius: 14, minHeight: 46, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: category === c.id ? palette.primary : palette.surface }}><Text style={{ color: category === c.id ? palette.onPrimary : palette.muted, fontWeight: '600', fontSize: 13 }}>{c.label}</Text></Pressable>)}</ScrollView>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text accessibilityLiveRegion="polite" style={{ color: palette.muted, fontSize: 13 }}>{items.length} içerik</Text><Pressable accessibilityRole="button" accessibilityState={{ selected: saved }} onPress={() => setSaved(v => !v)} style={{ minHeight: 48, alignItems: 'center', flexDirection: 'row', gap: 6 }}><Icon name={saved ? 'bookmark' : 'bookmark-outline'} size={17} /><Text style={{ color: palette.primary, fontSize: 13 }}>Kaydettiklerim</Text></Pressable></View>
    {items.length ? <ModuleGrid items={items} /> : <Panel><Icon name="search-outline" /><Text style={{ color: palette.text, fontSize: 16, fontWeight: '600' }}>İçerik bulunamadı.</Text><Text style={{ color: palette.muted, lineHeight: 22 }}>Başka bir sözcük dene veya filtreleri değiştir.</Text></Panel>}
    {category === 'games' && <Action label="Canlı oyun kataloğunu aç" secondary icon="game-controller-outline" onPress={() => openActivity('/oyun/oyunlar.html', 'Tüm Oyunlar')} />}
  </Page>;
}
