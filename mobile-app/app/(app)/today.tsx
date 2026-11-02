import { router } from 'expo-router';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/platform/PlatformContext';
import { Action, Icon, IconButton, ModuleGrid, Notice, Page, Panel, Section, Waiting } from '@/platform/components';
import { modules } from '@/platform/catalog';
import { dateKey } from '@/platform/model';
import { openModule } from '@/platform/navigation';
import { useHomeFeed } from '@/platform/useHomeFeed';
import { HomeShowcase, LiveHomeFlow, useQuietMotion } from '@/platform/home-feed-components';
import { useAgenda } from '@/platform/useAgenda';

export default function Today() {
  const { profile } = useAuth();
  const { palette, state, ready, visit } = usePlatform();
  const feed = useHomeFeed();
  const agenda = useAgenda();
  const quiet = useQuietMotion();
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const firstName = profile?.first_name || profile?.full_name?.split(' ')[0];
  const recent = state.recent.map(row => modules.find(m => m.id === row.id)).filter((m): m is typeof modules[number] => !!m).slice(0, 4);
  const teacher = profile?.role === 'teacher';
  const todayPlans = teacher ? (agenda.snapshot?.calendarEvents || []).filter(p => p.date === dateKey()).map(p => ({ id: p.id, title: p.title, time: p.time || '', done: false })) : state.plans.filter(p => p.date === dateKey());
  const main = modules.filter(m => ['whiteboard', 'reading', 'exams', 'aquarium'].includes(m.id));
  return <Page title={firstName ? `Merhaba, ${firstName}.` : 'Bugün ne keşfedelim?'} subtitle={new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
    refresh={() => { feed.refresh(); if (teacher) void agenda.refresh(); }} refreshing={feed.refreshing}
    action={<IconButton label="Hesabımı aç" icon="person-circle-outline" onPress={() => router.navigate('/(app)/account')} />}>
    <LiveHomeFlow items={feed.items} running={feed.active} quiet={quiet} />
    {teacher && <Pressable accessibilityRole="button" accessibilityLabel="Öğretmen ajandamı aç. Günün dersleri, öğrencilerim ve ders programım." onPress={() => router.navigate('/(app)/agenda')} style={({ pressed }) => ({ backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, borderRadius: 21, padding: 18, gap: 13, flexDirection: 'row', alignItems: 'center', opacity: pressed ? 0.7 : 1 })}><View style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: palette.soft }}><Icon name="calendar-outline" size={25} /></View><View style={{ flex: 1, gap: 5 }}><Text style={{ color: palette.text, fontWeight: '600', fontSize: 16 }}>Öğretmen ajandam</Text><Text style={{ color: palette.muted, lineHeight: 19, fontSize: 12 }}>Günün dersleri, öğrencilerim ve ders programım</Text></View><Icon name="chevron-forward" size={19} /></Pressable>}
    <HomeShowcase slides={feed.slides} running={feed.active} quiet={quiet} />
    {!!feed.updatedAt && <Text style={{ color: palette.muted, fontSize: 11, lineHeight: 17 }}>{feed.cached ? 'Son kaydedilen site içerikleri' : feed.partial ? 'Site içerikleri · bazı kaynaklar yeniden denenecek' : 'Siteyle otomatik güncellenir'} · {new Date(feed.updatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}{!feed.cached && ' · 2 dakikada bir'}</Text>}
    {!!feed.error && <Notice text={feed.error} />}
    {!feed.slides.length && <View style={{ backgroundColor: palette.soft, borderRadius: 26, padding: phone ? 21 : 25, gap: phone ? 13 : 18 }}>
      <View style={{ flexDirection: 'row', gap: 15, alignItems: 'center' }}><View style={{ width: 48, height: 48, backgroundColor: palette.surface, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}><Icon name="leaf-outline" size={26} /></View><Text style={{ color: palette.primary, fontWeight: '600', fontSize: 12, letterSpacing: 1 }}>HER GÜN KÜÇÜK BİR KEŞİF</Text></View>
      <Text style={{ color: palette.text, fontSize: phone ? 23 : 27, lineHeight: phone ? 29 : 35, fontWeight: '600', letterSpacing: -0.6 }}>Merakla başla.{ '\n' }Öğrenerek büyü.</Text>
      {!phone && <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 23, maxWidth: 520 }}>Bir metin oku, bilgini dene ya da sınıfınla yeni bir şey keşfet. İhtiyacın olan araçlar burada.</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}><Action label={phone ? 'Keşfet' : 'Keşfetmeye başla'} icon="arrow-forward" onPress={() => router.navigate('/(app)/explore')} /><Action label={phone ? 'Oyunlar' : 'Oyunları aç'} icon="game-controller-outline" secondary onPress={() => router.navigate({ pathname: '/(app)/explore', params: { category: 'games', saved: '0' } })} /></View>
    </View>}
    {!ready ? <Waiting /> : null}
    {recent.length > 0 && <><Section title="Son açtıkların" /><ModuleGrid items={recent} compact /></>}
    <Section title="Öğrenme alanların" /><View style={{ flexDirection: 'row', flexWrap: 'wrap', margin: -6 }}>{main.map(item => <View key={item.id} style={{ width: width >= 1200 ? '25%' : '50%', padding: 6 }}><Pressable accessibilityRole="button" accessibilityLabel={`${item.title}, aç`} onPress={() => openModule(item, visit)} style={({ pressed }) => ({ backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, borderRadius: 21, padding: 18, minHeight: 114, gap: 15, opacity: pressed ? 0.65 : 1 })}><Icon name={item.icon} size={26} /><Text style={{ color: palette.text, fontSize: 15, fontWeight: '600' }}>{item.title}</Text></Pressable></View>)}</View>
    <Section title="Günün planı" action="Ajandayı aç" onPress={() => router.navigate('/(app)/agenda')} />
    <Panel>{todayPlans.length ? todayPlans.slice(0, 3).map(p => <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Icon name={p.done ? 'checkmark-circle' : 'ellipse-outline'} color={p.done ? palette.green : palette.muted} size={20} /><Text style={{ color: palette.muted, width: 44, fontSize: 13 }}>{p.time || '—'}</Text><Text style={{ flex: 1, color: palette.text, fontSize: 14, textDecorationLine: p.done ? 'line-through' : 'none' }}>{p.title}</Text></View>) : <><Icon name="calendar-outline" /><Text style={{ color: palette.text, fontSize: 16, fontWeight: '600' }}>{teacher ? 'Bugünün ajandasına göz at.' : 'Gününü kendine göre planla.'}</Text><Text style={{ color: palette.muted, fontSize: 14, lineHeight: 22 }}>{teacher ? 'Derslerini, öğrenme çıktılarını ve buluttaki hatırlatmalarını ajandanda görebilirsin.' : 'Küçük bir planla başla; öğretmen hesabınla sınıf ajandana da ulaşabilirsin.'}</Text></>}</Panel>
    {state.favorites.length > 0 && <><Section title="Kaydettiklerin" action="Tümünü gör" onPress={() => router.navigate({ pathname: '/(app)/explore', params: { saved: '1', category: 'all' } })} /><ModuleGrid items={modules.filter(m => state.favorites.includes(m.id)).slice(0, 4)} compact /></>}
  </Page>;
}
