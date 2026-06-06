import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const grades = [
  { grade: 1, color: '#FF7A76' },
  { grade: 2, color: '#FFAE42' },
  { grade: 3, color: '#FFD34D' },
  { grade: 4, color: '#61C86E' },
  { grade: 5, color: '#26C6C2' },
  { grade: 6, color: '#4CC9F0' },
  { grade: 7, color: '#8A74E8' },
  { grade: 8, color: '#F25AB0' },
];

const modes = [
  {
    title: 'Metni Oku',
    subtitle: 'Tek kolonda, büyük yazıyla dikkat dağıtmayan okuma.',
    icon: 'reader-outline' as IconName,
    color: '#6C3DED',
  },
  {
    title: 'Soruları Cevapla',
    subtitle: 'Koyu odak modunda sadece soru ve seçenekler.',
    icon: 'help-circle-outline' as IconName,
    color: '#00A991',
  },
  {
    title: 'Karneyi Gör',
    subtitle: 'Hız, hedef ve anlama sonucu tek raporda.',
    icon: 'ribbon-outline' as IconName,
    color: '#FF7043',
  },
];

function openWeb(path: string, title: string) {
  router.push({ pathname: '/webview', params: { path, title } });
}

export default function ReadingScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.navy} />
          </Pressable>
          <Text style={styles.topTitle}>Hızlı Okuma</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => openWeb('/hizli-okuma/karne.html', 'Okuma Karnem')}
            style={styles.reportButton}
          >
            <Ionicons name="ribbon-outline" size={20} color={colors.purple} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="book-outline" size={52} color={colors.purple} />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.kicker}>Hızlı Okuma Merkezi</Text>
            <Text style={styles.heroTitle}>Sınıfını seç, okuma yolculuğuna başla.</Text>
            <Text style={styles.heroSub}>Metin, okuyucu, soru ve karne akışı mobil ekran için sadeleştirildi.</Text>
          </View>
        </View>

        <View style={styles.steps}>
          {[1, 2, 3].map((step) => (
            <View key={step} style={[styles.stepDot, step === 1 && styles.stepDotActive]}>
              <Text style={[styles.stepText, step === 1 && styles.stepTextActive]}>{step}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Sınıfını seç</Text>
        <View style={styles.gradeGrid}>
          {grades.map((item) => (
            <Pressable
              key={item.grade}
              accessibilityRole="button"
              onPress={() => openWeb(`/hizli-okuma/index.html?grade=${item.grade}`, `${item.grade}. Sınıf Hızlı Okuma`)}
              style={({ pressed }) => [styles.gradeCard, { backgroundColor: item.color }, pressed && styles.pressed]}
            >
              <View style={styles.gradeGlass} />
              <Text style={styles.gradeNumber}>{item.grade}</Text>
              <Text style={styles.gradeLabel}>Sınıf</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Okuma akışı</Text>
        {modes.map((mode) => (
          <View key={mode.title} style={styles.modeCard}>
            <View style={[styles.modeIcon, { backgroundColor: `${mode.color}18` }]}>
              <Ionicons name={mode.icon} size={26} color={mode.color} />
            </View>
            <View style={styles.modeCopy}>
              <Text style={styles.modeTitle}>{mode.title}</Text>
              <Text style={styles.modeSub}>{mode.subtitle}</Text>
            </View>
          </View>
        ))}

        <View style={styles.reportCard}>
          <View>
            <Text style={styles.reportTitle}>Okuma Karnem</Text>
            <Text style={styles.reportSub}>Son okuma sonuçlarını ve anlama raporunu aç.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => openWeb('/hizli-okuma/karne.html', 'Okuma Karnem')}
            style={styles.reportCta}
          >
            <Ionicons name="arrow-forward" size={22} color={colors.white} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: '#FFF9F1',
    flex: 1,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: 36,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  topTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '900',
  },
  reportButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  hero: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: '#F4EFFF',
    borderRadius: 22,
    height: 86,
    justifyContent: 'center',
    width: 86,
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  kicker: {
    color: colors.slate,
    fontSize: 12,
    fontWeight: '900',
  },
  heroTitle: {
    color: colors.navy,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 29,
  },
  heroSub: {
    color: colors.slate,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  steps: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 34,
    justifyContent: 'center',
    marginBottom: 18,
  },
  stepDot: {
    alignItems: 'center',
    backgroundColor: '#E9E0FF',
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  stepDotActive: {
    backgroundColor: colors.purple,
    shadowColor: colors.purple,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  stepText: {
    color: colors.slate,
    fontSize: 16,
    fontWeight: '900',
  },
  stepTextActive: {
    color: colors.white,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 10,
    marginTop: 4,
  },
  gradeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  gradeCard: {
    alignItems: 'center',
    borderRadius: 22,
    flexBasis: '46%',
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 126,
    overflow: 'hidden',
    padding: 12,
    shadowColor: colors.navy,
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  gradeGlass: {
    borderColor: 'rgba(255,255,255,.36)',
    borderRadius: 18,
    borderWidth: 1,
    bottom: 10,
    left: 10,
    position: 'absolute',
    right: 10,
    top: 10,
  },
  gradeNumber: {
    color: colors.white,
    fontSize: 50,
    fontWeight: '900',
    lineHeight: 58,
  },
  gradeLabel: {
    borderColor: 'rgba(255,255,255,.46)',
    borderRadius: 999,
    borderWidth: 1,
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    paddingHorizontal: 18,
    paddingVertical: 5,
    textTransform: 'uppercase',
  },
  modeCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    padding: 13,
  },
  modeIcon: {
    alignItems: 'center',
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  modeCopy: {
    flex: 1,
    gap: 3,
  },
  modeTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900',
  },
  modeSub: {
    color: colors.slate,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  reportCard: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: 24,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginTop: 8,
    padding: spacing.md,
  },
  reportTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '900',
  },
  reportSub: {
    color: '#D8D3EA',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 3,
  },
  reportCta: {
    alignItems: 'center',
    backgroundColor: colors.purple,
    borderRadius: 999,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
