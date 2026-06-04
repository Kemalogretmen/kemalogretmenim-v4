import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Card, EmptyState, Header, LoadingState, Screen, SectionTitle, Stat, styles } from '@/components/ui';
import { colors } from '@/constants/theme';
import { displayName, roleLabel, shortDate } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';

export default function HomeScreen() {
  const { profile } = useAuth();
  const { data, loading, error, refresh } = useDashboard();

  if (!profile) return null;

  const unread = data?.messages.filter((item) => item.recipient_id === profile.id && item.status !== 'read').length ?? 0;
  const completed = data?.progress.filter((item) => item.status === 'completed').length ?? 0;
  const merit = data?.merit.reduce((sum, item) => sum + Number(item.points || 0), 0) ?? 0;

  return (
    <Screen>
      <Header
        title={`Merhaba, ${displayName(profile)}`}
        subtitle={`${roleLabel(profile.role)} panelin hazır. İçerikler, mesajlar ve ödevler tek yerde.`}
      />

      {error ? (
        <Card>
          <Text style={styles.empty}>{error}</Text>
          <Button title="Tekrar dene" variant="secondary" onPress={refresh} />
        </Card>
      ) : null}

      {loading && !data ? <LoadingState /> : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Stat label="Sınıf/bağlantı" value={profile.role === 'parent' ? data?.parentLinks.length ?? 0 : data?.classes.length ?? 0} />
        <Stat label="Aktif ödev" value={data?.assignments.length ?? 0} color={colors.coral} />
        <Stat label="Okunmamış" value={unread} color={colors.teal} />
      </View>

      {profile.role === 'student' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Stat label="Tamamlanan" value={completed} color={colors.success} />
          <Stat label="Liyakat puanı" value={merit} color={colors.yellow} />
        </View>
      ) : null}

      <SectionTitle title="Hızlı işlemler" />
      <Card>
        <Button title="Ödevlere git" icon="clipboard-outline" onPress={() => router.push('/(app)/assignments')} />
        <Button title="Mesajları aç" icon="mail-outline" variant="secondary" onPress={() => router.push('/(app)/messages')} />
        <Button title="Eğitim içerikleri" icon="sparkles-outline" variant="secondary" onPress={() => router.push('/(app)/tools')} />
      </Card>

      <SectionTitle title="Son ödevler" action={data?.assignments.length ? `${data.assignments.length} kayıt` : undefined} />
      {data?.assignments.length ? data.assignments.slice(0, 4).map((item) => (
        <Card key={item.id}>
          <Text style={{ color: colors.navy, fontSize: 16, fontWeight: '900' }}>{item.title}</Text>
          <Text style={{ color: colors.slate, fontWeight: '700' }}>{item.instructions || item.content_type}</Text>
          <Text style={{ color: colors.muted, fontWeight: '800' }}>Teslim: {shortDate(item.due_at)}</Text>
          {item.content_ref ? (
            <Button
              title="İçeriği aç"
              icon="open-outline"
              variant="secondary"
              onPress={() => router.push({ pathname: '/webview', params: { url: item.content_ref, title: item.title } })}
            />
          ) : null}
        </Card>
      )) : <EmptyState title="Henüz görüntülenecek ödev yok." />}
    </Screen>
  );
}
