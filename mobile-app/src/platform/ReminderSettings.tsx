import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Platform, Text } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { reconcileAgendaReminders, registerPushToken, reminderPermission, requestReminderPermission, setReminderAccount } from '@/services/notifications';
import { useAgenda } from './useAgenda';
import { usePersonalPlans } from './usePersonalPlans';
import { usePlatform } from './PlatformContext';
import { Action, Panel } from './components';
import { teacherAgendaReminders } from './reminderModel';

export function ReminderSettings() {
  const { userId, profile } = useAuth();
  const { palette } = usePlatform();
  const agenda = useAgenda(), personal = usePersonalPlans();
  const scope = `${userId || ''}:${profile?.role || ''}:${profile?.active !== false}`;
  const generation = useRef({ scope, epoch: 0 });
  if (generation.current.scope !== scope) generation.current = { scope, epoch: generation.current.epoch + 1 };
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current.epoch++; }; }, []);
  const [permission, setPermission] = useState({ granted: false, canAskAgain: true });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const check = () => reminderPermission().then(setPermission).catch(() => undefined);
    void check(); const focus = AppState.addEventListener('change', value => { if (value === 'active') void check(); });
    return () => focus.remove();
  }, []);
  if (!userId || !profile || profile.active === false || Platform.OS === 'web') return null;
  async function configure() {
    if (!userId) return;
    const token = generation.current.epoch;
    const valid = () => mounted.current && generation.current.epoch === token;
    setBusy(true);
    try {
      const next = await requestReminderPermission(); if (!valid()) return; setPermission(next);
      if (!next.granted) {
        Alert.alert('Bildirim izni kapalı', 'Hatırlatmaların ekranda görünmesi için cihaz ayarlarından bildirime izin verebilirsin.', [{ text: 'Kapat', style: 'cancel' }, { text: 'Ayarları aç', onPress: () => { Linking.openSettings().catch(() => undefined); } }]);
        return;
      }
      await setReminderAccount(userId);
      if (!valid()) return;
      const reminders = profile?.role === 'teacher'
        ? teacherAgendaReminders(agenda.snapshot?.calendarEvents)
        : personal.plans.map(plan => ({ id: `personal:${plan.id}`, title: plan.title, date: plan.date, time: plan.time, done: plan.done, remind: plan.reminder !== null, minutesBefore: plan.reminder || 0 }));
      const result = await reconcileAgendaReminders(userId, reminders);
      if (!valid()) return;
      void registerPushToken(userId).catch(() => undefined);
      Alert.alert(result.error ? 'Kontrol gerekli' : 'Hatırlatmalar hazır', result.error || `${result.scheduled} gelecek hatırlatma bu cihaza kaydedildi. Ses ve teslim zamanı cihazın bildirim, Odak ve pil ayarlarına bağlıdır.`);
    } catch { if (valid()) Alert.alert('Bildirim ayarı okunamadı', 'Cihaz ayarlarından uygulamanın bildirim izinlerini kontrol et.'); }
    finally { if (valid()) setBusy(false); }
  }
  return <Panel><Text style={{ color: palette.text, fontSize: 16, fontWeight: '600' }}>Ajanda bildirimleri</Text><Text style={{ color: palette.muted, lineHeight: 21, fontSize: 13 }}>{permission.granted ? 'Cihaz izni açık. Saatli planlarında hatırlatmayı seçerek bildirim alabilirsin.' : 'İzin verdiğinde seçtiğin planlar kilit ekranına bildirim olarak düşer ve cihazın izin verdiği ses çalar.'}</Text><Action label={busy ? 'Hazırlanıyor…' : permission.granted ? 'Hatırlatmaları yenile' : 'Bildirimlere izin ver'} secondary icon="notifications-outline" onPress={configure} disabled={busy || agenda.loading || personal.loading} /></Panel>;
}
