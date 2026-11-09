import { PropsWithChildren, useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { AgendaItem } from './agendaModel';
import { familyFields, parentPhone, studentPhoto, studentText } from './agendaStudent';
import { usePlatform } from './PlatformContext';
import { Icon, Notice } from './components';

export function StudentAvatar({ student, size = 44 }: { student: AgendaItem; size?: number }) {
  const { palette } = usePlatform();
  const uri = studentPhoto(student.photo);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return <View style={{ width: size, height: size, borderRadius: 8, overflow: 'hidden', backgroundColor: palette.soft, alignItems: 'center', justifyContent: 'center' }}>
    {uri && !failed ? <Image accessibilityLabel={`${studentText(student.firstName)} fotoğrafı`} source={{ uri }} onError={() => setFailed(true)} resizeMode={student.photoFit === 'cover' ? 'cover' : 'contain'} style={{ width: size, height: size }} /> : <Icon name="person-outline" size={size / 2} color={palette.muted} />}
  </View>;
}

async function openContact(url: string) {
  try { await Linking.openURL(url); } catch { Alert.alert('İletişim açılamadı', 'Bu cihazda telefon veya WhatsApp uygulamasını kontrol edin.'); }
}
function contact(value: string) {
  const links = parentPhone(value);
  if (!links) { Alert.alert('Telefon numarası geçersiz', 'Numarayı ajandadaki veli bilgilerinden düzeltin.'); return; }
  Alert.alert('Veliyle iletişim', value, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Telefonla ara', onPress: () => { void openContact(links.call); } },
    { text: 'WhatsApp mesajı', onPress: () => { void openContact(links.whatsapp); } }
  ]);
}
export function AgendaStudentProfile({ student, children, initialTab = 'personal' }: PropsWithChildren<{ student: AgendaItem; initialTab?: 'personal' | 'academic' }>) {
  const { palette } = usePlatform();
  const [tab, setTab] = useState<string>(initialTab);
  useEffect(() => setTab(initialTab), [student.id, initialTab]);
  function field(label: string, raw: unknown, phone = false) {
    const value = studentText(raw);
    return <View key={label} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: palette.line, gap: 5 }}><Text style={{ color: palette.muted, fontSize: 12 }}>{label}</Text>
      {phone && value ? <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ara veya WhatsApp mesajı gönder`} onPress={() => contact(value)} style={{ minHeight: 44, flexDirection: 'row', gap: 8, alignItems: 'center' }}><Icon name="call-outline" size={18} /><Text style={{ color: palette.primary, fontSize: 16, flex: 1 }}>{value}</Text><Icon name="chevron-forward" size={16} /></Pressable> : <Text selectable style={{ color: palette.text, fontSize: 15, lineHeight: 23 }}>{value || 'Belirtilmedi'}</Text>}
    </View>;
  }
  const records = tab === 'notes' ? student.notes : student.meetings;
  return <View style={{ gap: 16 }}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{[
      ['personal', 'Kişisel'], ['family', 'Veli'], ['health', 'Sağlık'], ['notes', 'Notlar'], ['meetings', 'Görüşmeler'], ['academic', 'Akademik']
    ].map(([id, label]) => <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: tab === id }} onPress={() => setTab(id)} style={{ minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 8, backgroundColor: tab === id ? palette.soft : palette.background }}><Text style={{ color: tab === id ? palette.primary : palette.text, fontWeight: '600' }}>{label}</Text></Pressable>)}</ScrollView>
    {student.detailsUnavailable && <Notice text="Bu cihazda özet öğrenci kaydı bulunuyor. Fotoğraf, veli ve diğer ayrıntılar için internete bağlanıp ajandayı yenileyin." />}
    {tab === 'personal' && <View>{field('Okul numarası', student.schoolNo)}{field('Ad', student.firstName)}{field('Soyad', student.lastName)}{field('Doğum tarihi', /^\d{4}-\d{2}-\d{2}$/.test(student.birthDate || '') ? new Date(`${student.birthDate}T12:00:00`).toLocaleDateString('tr-TR') : student.birthDate)}{field('Adres', student.address)}</View>}
    {tab === 'family' && <View>{familyFields.map(([key, label]) => field(label, student.family?.[key], key.endsWith('Phone')))}</View>}
    {tab === 'health' && field('Sağlık bilgileri', student.healthStatus)}
    {(tab === 'notes' || tab === 'meetings') && (Array.isArray(records) && records.length ? records.filter(item => item && typeof item === 'object').map((item, index) => <View key={item.id || index} style={{ gap: 6, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: palette.line }}><Text style={{ color: palette.muted, fontSize: 12 }}>{[studentText(item.date), studentText(item.type)].filter(Boolean).join(' · ')}</Text><Text selectable style={{ color: palette.text, lineHeight: 24 }}>{studentText(item.text)}</Text></View>) : <Text style={{ color: palette.muted }}>Henüz kayıt yok.</Text>)}
    {tab === 'academic' && children}
  </View>;
}
