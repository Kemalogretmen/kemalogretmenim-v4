import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button, Card, Field, Header, LoadingState, Screen, SectionTitle, styles } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { displayName, shortDate } from '@/lib/format';
import { markMessageRead, sendMessage } from '@/services/api';
import { useDashboard } from '@/hooks/useDashboard';

export default function MessagesScreen() {
  const { profile } = useAuth();
  const { data, loading, error, refresh } = useDashboard();
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const recipients = useMemo(() => {
    if (!data || !profile) return [];
    return data.profiles.filter((item) => item.id !== profile.id);
  }, [data, profile]);

  async function submit() {
    if (!profile || !recipientId || !body.trim()) {
      Alert.alert('Mesaj', 'Alıcı ve mesaj alanı zorunlu.');
      return;
    }
    setBusy(true);
    try {
      await sendMessage({
        senderId: profile.id,
        senderRole: profile.role,
        recipientId,
        subject: subject.trim() || 'Mobil uygulama mesajı',
        body: body.trim(),
      });
      setSubject('');
      setBody('');
      await refresh();
    } catch (caught) {
      Alert.alert('Mesaj gönderilemedi', caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  async function read(id: string) {
    try {
      await markMessageRead(id);
      await refresh();
    } catch {
      await refresh();
    }
  }

  return (
    <Screen>
      <Header title="Mesajlar" subtitle="Öğretmen, veli ve öğrenci iletişimi." />
      {error ? <Text style={styles.empty}>{error}</Text> : null}
      {loading && !data ? <LoadingState /> : null}

      <SectionTitle title="Yeni mesaj" />
      <Card>
        <Text style={{ color: colors.slate, fontWeight: '800' }}>Alıcı</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {recipients.slice(0, 8).map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setRecipientId(item.id)}
              style={{
                backgroundColor: recipientId === item.id ? colors.purple : colors.white,
                borderColor: recipientId === item.id ? colors.purple : colors.border,
                borderRadius: radius.sm,
                borderWidth: 1,
                paddingHorizontal: 12,
                paddingVertical: 9,
              }}
            >
              <Text style={{ color: recipientId === item.id ? colors.white : colors.navy, fontWeight: '900' }}>{displayName(item)}</Text>
            </Pressable>
          ))}
        </View>
        <Field label="Konu" value={subject} onChangeText={setSubject} />
        <Field label="Mesaj" value={body} onChangeText={setBody} multiline numberOfLines={4} textAlignVertical="top" />
        <Button title="Gönder" icon="send-outline" onPress={submit} disabled={busy} />
      </Card>

      <SectionTitle title="Gelen ve gidenler" />
      {data?.messages.length ? data.messages.map((item) => {
        const mine = item.sender_id === profile?.id;
        const other = data.profiles.find((row) => row.id === (mine ? item.recipient_id : item.sender_id));
        return (
          <Card key={item.id}>
            <Text style={{ color: colors.navy, fontSize: 16, fontWeight: '900' }}>{item.subject || 'Mesaj'}</Text>
            <Text style={{ color: colors.slate, fontWeight: '800' }}>{mine ? 'Alıcı' : 'Gönderen'}: {displayName(other)}</Text>
            <Text style={{ color: colors.slate, lineHeight: 21 }}>{item.body}</Text>
            <Text style={{ color: colors.muted, fontWeight: '800' }}>{shortDate(item.created_at)} · {item.status}</Text>
            {!mine && item.status !== 'read' ? <Button title="Okundu işaretle" variant="secondary" onPress={() => read(item.id)} /> : null}
          </Card>
        );
      }) : (
        <Card>
          <Text style={styles.empty}>Henüz mesaj görünmüyor.</Text>
        </Card>
      )}
    </Screen>
  );
}
