import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/platform/PlatformContext';
import { Action, Icon, IconButton, Page, Panel, Section } from '@/platform/components';
import { openActivity } from '@/platform/navigation';
export default function Exams() {
  const { profile } = useAuth();
  const { palette } = usePlatform();
  const locked = profile?.role === 'student' && profile.grade_level && profile.grade_level >= 1 && profile.grade_level <= 8 ? profile.grade_level : null;
  const [grade, setGrade] = useState(locked || 1);
  const selectedGrade = locked || grade;
  return <Page title="Kendini keşfet." subtitle="Sana uygun bir sınav seç. Bildiklerini gör, sonraki adımını belirle." action={<IconButton label="Uygulamaya dön" icon="close" onPress={() => router.canGoBack() ? router.back() : router.replace('/(app)/today')} />}>
    <Panel><View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}><Icon name="document-text-outline" size={32} /><View style={{ flex: 1, gap: 6 }}><Text style={{ color: palette.text, fontSize: 20, fontWeight: '600' }}>Sınav Merkezi</Text><Text style={{ color: palette.muted, fontSize: 13 }}>Bilgini ölç · Gelişimini takip et</Text></View></View></Panel>
    <Section title={locked ? 'Sınıfın' : 'Sınıfını seç'} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', margin: -5 }}>{(locked ? [locked] : [1,2,3,4,5,6,7,8]).map(n => <View key={n} style={{ width: '25%', padding: 5 }}><Pressable accessibilityRole="button" accessibilityLabel={`${n}. Sınıf`} accessibilityState={{ selected: n === selectedGrade }} onPress={() => setGrade(n)} style={{ minHeight: 84, backgroundColor: n === selectedGrade ? palette.primary : palette.surface, borderWidth: 1, borderColor: n === selectedGrade ? palette.primary : palette.line, borderRadius: 19, alignItems: 'center', justifyContent: 'center', gap: 4 }}><Text style={{ color: n === selectedGrade ? palette.onPrimary : palette.text, fontWeight: '600', fontSize: 27 }}>{n}</Text><Text style={{ color: n === selectedGrade ? palette.onPrimary : palette.muted, fontSize: 11 }}>Sınıf</Text></Pressable></View>)}</View>
    <Action label={`${selectedGrade}. sınıf sınavlarını aç`} icon="arrow-forward" onPress={() => openActivity(`/sinav_sitesi/index.html?grade=${selectedGrade}`, `${selectedGrade}. Sınıf · Sınavlar`)} />
    <Section title="Hazır olduğunda başla" />
    <Panel><Icon name="checkmark-circle-outline" /><Text style={{ color: palette.text, fontSize: 16, fontWeight: '600' }}>Her adımın bir karşılığı var.</Text><Text style={{ color: palette.muted, fontSize: 14, lineHeight: 23 }}>Yayınlanan sınavlar sınıfına göre listelenir. Sınavın süresi ve kurallarını başlamadan görür, tamamladığında sonuç ve karne akışına geçersin.</Text></Panel>
  </Page>;
}
