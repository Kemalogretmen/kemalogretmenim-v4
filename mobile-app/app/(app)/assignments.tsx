import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { Button, Card, EmptyState, Header, LoadingState, Screen, SectionTitle, styles } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { shortDate } from '@/lib/format';
import { updateAssignmentProgress } from '@/services/api';
import { useDashboard } from '@/hooks/useDashboard';

export default function AssignmentsScreen() {
  const { profile } = useAuth();
  const { data, loading, error, refresh } = useDashboard();
  const [busyId, setBusyId] = useState('');

  async function setProgress(assignmentId: string, status: 'started' | 'completed') {
    if (!profile || !data) return;
    const assignment = data.assignments.find((item) => item.id === assignmentId);
    const membership = data.students.find((item) => item.class_id === assignment?.class_id && item.student_profile_id === profile.id);
    if (!membership) {
      Alert.alert('Ödev', 'Bu ödev için öğrenci üyeliği bulunamadı.');
      return;
    }
    setBusyId(assignmentId);
    try {
      await updateAssignmentProgress({
        assignmentId,
        studentMembershipId: membership.id,
        studentProfileId: profile.id,
        status,
      });
      await refresh();
    } catch (caught) {
      Alert.alert('Ödev güncellenemedi', caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusyId('');
    }
  }

  return (
    <Screen>
      <Header title="Ödevler" subtitle="Sana ya da sınıflarına atanmış çalışmalar." />
      {error ? <Text style={styles.empty}>{error}</Text> : null}
      {loading && !data ? <LoadingState /> : null}
      <SectionTitle title="Aktif ödevler" />
      {data?.assignments.length ? data.assignments.map((item) => {
        const progress = data.progress.find((row) => row.assignment_id === item.id);
        return (
          <Card key={item.id}>
            <Text style={{ color: colors.navy, fontSize: 17, fontWeight: '900' }}>{item.title}</Text>
            <Text style={{ color: colors.slate, fontWeight: '700' }}>{item.instructions || 'Açıklama eklenmemiş.'}</Text>
            <Text style={{ color: colors.muted, fontWeight: '800' }}>Durum: {progress?.status ?? item.status} · Teslim: {shortDate(item.due_at)}</Text>
            {item.content_ref ? (
              <Button title="İçeriği aç" icon="open-outline" variant="secondary" onPress={() => router.push({ pathname: '/webview', params: { url: item.content_ref, title: item.title } })} />
            ) : null}
            {profile?.role === 'student' ? (
              <>
                <Button title="Başladım" icon="play-outline" variant="secondary" disabled={busyId === item.id} onPress={() => setProgress(item.id, 'started')} />
                <Button title="Tamamladım" icon="checkmark-circle-outline" disabled={busyId === item.id} onPress={() => setProgress(item.id, 'completed')} />
              </>
            ) : null}
          </Card>
        );
      }) : <EmptyState title="Şu anda aktif ödev görünmüyor." />}
    </Screen>
  );
}
