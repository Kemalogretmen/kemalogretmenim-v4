import { router } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/platform/PlatformContext';
import { Action, Icon, Page, Panel, Section } from '@/platform/components';
import { openActivity } from '@/platform/navigation';
import { roleLabel } from '@/lib/format';
import { UpdatePanel } from '@/platform/AppUpdates';
import { ReminderSettings } from '@/platform/ReminderSettings';
export default function Account() {
  const { profile, signOut, loading } = useAuth();
  const { palette, state, update, ready } = usePlatform();
  const links = profile ? [
    ['Sınıf panelim', 'grid-outline', '/(app)/home'], ['Ödevlerim', 'clipboard-outline', '/(app)/assignments'],
    ['Mesajlarım', 'mail-outline', '/(app)/messages'], ['Profil bilgilerim', 'person-circle-outline', '/(app)/profile'],
  ] : [];
  return <Page title="Hesabım" subtitle="Öğrenme alanın, tercihlerin ve hesabın.">
    <Panel><View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}><View style={{ width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: palette.soft }}><Icon name="person-outline" size={28} /></View><View style={{ flex: 1, gap: 5 }}><Text style={{ color: palette.text, fontSize: 20, fontWeight: '600' }}>{profile?.full_name || 'Hoş geldin.'}</Text><Text style={{ color: palette.muted, fontSize: 13 }}>{profile ? roleLabel(profile.role) : 'Kendi hızında öğrenmeye başla.'}</Text></View></View>{!profile && <><Text style={{ color: palette.muted, fontSize: 14, lineHeight: 22 }}>İçerikleri misafir olarak keşfedebilirsin. Ödev, mesaj ve sınıf takibi için hesabına giriş yap.</Text><Action label="Giriş yap" icon="log-in-outline" onPress={() => router.push('/login')} disabled={loading} /><Action label="Hesap oluştur" secondary onPress={() => router.push('/register')} /></>}</Panel>
    {links.map(([label, icon, route]) => <Pressable key={route} accessibilityRole="button" onPress={() => router.push(route as '/(app)/home')} style={{ minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomColor: palette.line, borderBottomWidth: 1 }}><Icon name={icon} size={22} /><Text style={{ flex: 1, color: palette.text, fontSize: 15 }}>{label}</Text><Icon name="chevron-forward" color={palette.muted} size={16} /></Pressable>)}
    <Section title="Görünüm" /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{([['system', 'Cihaza göre', 'phone-portrait-outline'], ['light', 'Aydınlık', 'sunny-outline'], ['dark', 'Karanlık', 'moon-outline']] as const).map(([theme, label, icon]) => <Pressable key={theme} disabled={!ready} accessibilityRole="button" accessibilityState={{ selected: state.theme === theme }} onPress={() => update(s => ({ ...s, theme }))} style={{ flex: 1, minWidth: 90, minHeight: 82, borderRadius: 18, gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: state.theme === theme ? palette.soft : palette.surface, borderColor: state.theme === theme ? palette.primary : palette.line, borderWidth: 1 }}><Icon name={icon} size={22} /><Text style={{ fontSize: 12, color: palette.text }}>{label}</Text></Pressable>)}</View>
    {profile && <ReminderSettings />}
    <Section title="Uygulama hakkında" /><UpdatePanel /><Panel><Text style={{ color: palette.muted, lineHeight: 22, fontSize: 13 }}>Ajanda kayıtların hesabınla buluta eşitlenir. Kaydettiğin kısayollar ve görünüm tercihlerin bu cihazda saklanır. Canlı içerikler bağlantı gerektirir.</Text><Action label="İletişim" icon="chatbubble-outline" secondary onPress={() => openActivity('/iletisim.html', 'İletişim')} /></Panel>
    {profile && <Action label="Çıkış yap" secondary icon="log-out-outline" onPress={() => Alert.alert('Çıkış yapılsın mı?', 'Cihaz planların hesabın için korunur.', [{ text: 'Vazgeç' }, { text: 'Çıkış yap', onPress: () => { signOut().then(() => router.replace('/(app)/today')).catch(() => Alert.alert('Çıkış yapılamadı', 'Lütfen tekrar dene.')); } }])} />}
  </Page>;
}
