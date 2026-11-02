import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/platform/PlatformContext';
import { Action, Icon, IconButton, Page, Panel, Section } from '@/platform/components';
import { openActivity } from '@/platform/navigation';
export default function Reading() {
  const { profile } = useAuth();
  const { palette } = usePlatform();
  const [grade, setGrade] = useState(profile?.grade_level || 1);
  return <Page title="Bir sayfayla başla." subtitle="Sana uygun metni bul, kendi hızında oku ve anladıklarını keşfet." action={<IconButton label="Uygulamaya dön" icon="close" onPress={() => router.canGoBack() ? router.back() : router.replace('/(app)/today')} />}>
    <Panel><View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}><View style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.soft }}><Icon name="book-outline" size={28} /></View><View style={{ flex: 1 }}><Text style={{ color: palette.text, fontSize: 20, fontWeight: '600' }}>Hızlı Okuma</Text><Text style={{ color: palette.muted, fontSize: 13, marginTop: 6 }}>Oku · Anla · Geliş</Text></View></View></Panel>
    <Section title="Sınıfını seç" /><View style={{ flexDirection: 'row', flexWrap: 'wrap', margin: -5 }}>{[1,2,3,4,5,6,7,8].map(n => <View key={n} style={{ width: '25%', padding: 5 }}><Pressable accessibilityRole="button" accessibilityLabel={`${n}. Sınıf`} accessibilityState={{ selected: n === grade }} onPress={() => setGrade(n)} style={{ minHeight: 84, backgroundColor: n === grade ? palette.primary : palette.surface, borderWidth: 1, borderColor: n === grade ? palette.primary : palette.line, borderRadius: 19, alignItems: 'center', justifyContent: 'center', gap: 4 }}><Text style={{ color: n === grade ? palette.onPrimary : palette.text, fontWeight: '600', fontSize: 27 }}>{n}</Text><Text style={{ color: n === grade ? palette.onPrimary : palette.muted, fontSize: 11 }}>Sınıf</Text></Pressable></View>)}</View>
    <Action label={`${grade}. sınıf metinlerini aç`} icon="arrow-forward" onPress={() => openActivity(`/hizli-okuma/index.html?grade=${grade}`, `${grade}. Sınıf · Hızlı Okuma`)} />
    <Section title="Kendi hızında, adım adım" />
    {[['01', 'Metnini seç', 'Sınıfına ve ilgine uygun bir metinle başla.'], ['02', 'Oku ve süreyi takip et', 'Metin, ekranına uyum sağlayan odak alanında açılır.'], ['03', 'Anladıklarını keşfet', 'Soruları cevapla; hızını ve anlama sonucunu karnende gör.']].map(([n, title, text]) => <Panel key={n}><View style={{ flexDirection: 'row', gap: 16 }}><Text style={{ color: palette.primary, fontSize: 13, fontWeight: '600', paddingTop: 3 }}>{n}</Text><View style={{ flex: 1, gap: 6 }}><Text style={{ color: palette.text, fontWeight: '600', fontSize: 16 }}>{title}</Text><Text style={{ color: palette.muted, lineHeight: 21, fontSize: 13 }}>{text}</Text></View></View></Panel>)}
    <Action label="Okuma karnemi aç" secondary icon="ribbon-outline" onPress={() => openActivity('/hizli-okuma/karne.html', 'Okuma Karnem')} />
    <Action label="E-kitap kütüphanesi" secondary icon="library-outline" onPress={() => openActivity('/hizli-okuma/e-kitaplar.html', 'E-kitaplar')} />
  </Page>;
}
