import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { setReminderAccount } from '@/services/notifications';
import { reminderDestination } from './reminderModel';

export function NotificationLifecycle() {
  const { userId, loading } = useAuth();
  const navigation = useRootNavigationState();
  useEffect(() => {
    if (loading) return;
    setReminderAccount(userId).catch(() => undefined);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') setReminderAccount(userId).catch(() => undefined); });
    return () => listener.remove();
  }, [userId, loading]);
  useEffect(() => {
    if (Platform.OS === 'web' || loading || !navigation?.key) return;
    let active = true;
    let handled = '';
    const respond = (response: Notifications.NotificationResponse | null) => {
      if (!active || !response || response.notification.request.identifier === handled) return;
      handled = response.notification.request.identifier;
      const target = reminderDestination(response.notification.request.content.data, userId);
      if (target) router.push({ pathname: '/(app)/agenda', params: { date: target.date } });
      Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    };
    Notifications.getLastNotificationResponseAsync().then(respond).catch(() => undefined);
    const listener = Notifications.addNotificationResponseReceivedListener(respond);
    return () => { active = false; listener.remove(); };
  }, [loading, userId, navigation?.key]);
  return null;
}
