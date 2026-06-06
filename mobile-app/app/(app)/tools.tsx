import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Header, Screen } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

type ToolItem = {
  title: string;
  subtitle: string;
  label: string;
  path?: string;
  route?: '/reading';
  icon: IconName;
  color: string;
  soft: string;
  accent: string;
};

const featuredTools: ToolItem[] = [
  {
    title: 'Hızlı Okuma Stüdyosu',
    subtitle: 'Metin, süre ve karne akışını mobilde başlat.',
    label: 'Gelişim',
    route: '/reading',
    icon: 'timer-outline',
    color: '#6C3DED',
    soft: '#F2EAFF',
    accent: 'Okuma hızı',
  },
  {
    title: 'Deneme Sınavı',
    subtitle: 'Sınıf düzeyine göre sınav merkezine geç.',
    label: 'Ölçme',
    path: '/sinav_sitesi/index.html',
    icon: 'document-text-outline',
    color: '#FF7043',
    soft: '#FFF0E8',
    accent: 'Sonuç takibi',
  },
  {
    title: 'Oyun Parkı',
    subtitle: 'Dikkat, tekrar ve pekiştirme oyunlarını aç.',
    label: 'Oyun',
    path: '/oyun/oyunlar.html',
    icon: 'game-controller-outline',
    color: '#00A991',
    soft: '#E8FFF9',
    accent: 'Eğlenerek öğren',
  },
];

const secondaryTools: ToolItem[] = [
  {
    title: 'Dokümanlar',
    subtitle: 'PDF ve çalışma içerikleri',
    label: 'Arşiv',
    path: '/dokuman.html',
    icon: 'documents-outline',
    color: '#0B78E3',
    soft: '#EAF5FF',
    accent: 'PDF',
  },
  {
    title: 'Çalışma Kağıdı',
    subtitle: 'Etkileşimli çalışma ekranı',
    label: 'Etkinlik',
    path: '/calisma-kagidi.html',
    icon: 'create-outline',
    color: '#B45309',
    soft: '#FFF7E8',
    accent: 'Uygula',
  },
  {
    title: 'Öğretmen Araçları',
    subtitle: 'Beyaz tahta ve sınıf araçları',
    label: 'Araç',
    path: '/ogretmen-araclari.html',
    icon: 'easel-outline',
    color: '#4A1FD0',
    soft: '#EEE9FF',
    accent: 'Sınıf içi',
  },
];

function openTool(item: ToolItem) {
  if (item.route) {
    router.push(item.route);
    return;
  }
  router.push({ pathname: '/webview', params: { path: item.path || '/', title: item.title } });
}

function FeaturedTool({ item }: { item: ToolItem }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => openTool(item)}
      style={({ pressed }) => [styles.featuredCard, { backgroundColor: item.soft }, pressed && styles.pressed]}
    >
      <View style={styles.featuredTop}>
        <View style={[styles.bigIcon, { backgroundColor: item.color }]}>
          <Ionicons name={item.icon} size={30} color={colors.white} />
        </View>
        <View style={[styles.labelPill, { borderColor: item.color }]}>
          <Text style={[styles.labelText, { color: item.color }]}>{item.label}</Text>
        </View>
      </View>
      <Text style={styles.featuredTitle}>{item.title}</Text>
      <Text style={styles.featuredSubtitle}>{item.subtitle}</Text>
      <View style={styles.cardFooter}>
        <Text style={[styles.accentText, { color: item.color }]}>{item.accent}</Text>
        <Ionicons name="arrow-forward-circle" size={28} color={item.color} />
      </View>
    </Pressable>
  );
}

function CompactTool({ item }: { item: ToolItem }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => openTool(item)}
      style={({ pressed }) => [styles.compactCard, pressed && styles.pressed]}
    >
      <View style={[styles.compactIcon, { backgroundColor: item.soft }]}>
        <Ionicons name={item.icon} size={22} color={item.color} />
      </View>
      <View style={styles.compactBody}>
        <Text style={styles.compactTitle}>{item.title}</Text>
        <Text style={styles.compactSubtitle}>{item.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Pressable>
  );
}

export default function ToolsScreen() {
  return (
    <Screen>
      <Header
        title="Mobil İçerik Merkezi"
        subtitle="Oyun, deneme ve hızlı okuma için mobil öncelikli başlangıç kartları."
      />

      <View style={styles.routeCard}>
        <View style={styles.routeIcon}>
          <Ionicons name="navigate-outline" size={22} color={colors.purple} />
        </View>
        <View style={styles.routeText}>
          <Text style={styles.routeTitle}>Önerilen sıra</Text>
          <Text style={styles.routeDesc}>Hızlı okuma ile ısın, deneme ile ölç, oyunla pekiştir.</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Ana mobil modüller</Text>
      {featuredTools.map((item) => (
      <FeaturedTool key={item.path || item.route || item.title} item={item} />
      ))}

      <Text style={styles.sectionTitle}>Diğer araçlar</Text>
      {secondaryTools.map((item) => (
        <CompactTool key={item.path || item.route || item.title} item={item} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  routeCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: spacing.md,
  },
  routeIcon: {
    alignItems: 'center',
    backgroundColor: '#F1E9FF',
    borderRadius: 18,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  routeText: {
    flex: 1,
    gap: 4,
  },
  routeTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900',
  },
  routeDesc: {
    color: colors.slate,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  featuredCard: {
    borderColor: 'rgba(255,255,255,.8)',
    borderRadius: 26,
    borderWidth: 1,
    gap: 10,
    padding: spacing.md,
  },
  featuredTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bigIcon: {
    alignItems: 'center',
    borderRadius: 21,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  labelPill: {
    backgroundColor: 'rgba(255,255,255,.72)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '900',
  },
  featuredTitle: {
    color: colors.navy,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 27,
  },
  featuredSubtitle: {
    color: colors.slate,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  cardFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  accentText: {
    fontSize: 12,
    fontWeight: '900',
  },
  compactCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: spacing.md,
  },
  compactIcon: {
    alignItems: 'center',
    borderRadius: 16,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  compactBody: {
    flex: 1,
    gap: 3,
  },
  compactTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900',
  },
  compactSubtitle: {
    color: colors.slate,
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
});
