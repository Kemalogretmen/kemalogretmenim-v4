import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { APP_CONFIG } from '@/constants/config';
import { supabase } from '@/lib/supabase';
import { AgendaReminder, planReminders, REMINDER_PREFIX } from '@/platform/reminderModel';

export type { AgendaReminder } from '@/platform/reminderModel';
export const REMINDER_CHANNEL = 'agenda-reminders-v2';
let activeOwner: string | null = null;
let accountEpoch = 0;
let queue: Promise<unknown> = Promise.resolve();
let installation: Promise<string> | null = null;
function serial<T>(work: () => Promise<T>): Promise<T> { const result = queue.then(work, work); queue = result.catch(() => undefined); return result; }

if (Platform.OS !== 'web') Notifications.setNotificationHandler({
  handleNotification: async notification => {
    const data = notification.request.content.data;
    const owned = data?.kind !== 'agenda-reminder-v2' || (!!activeOwner && data.owner === activeOwner);
    return { shouldShowBanner: owned, shouldShowList: owned, shouldPlaySound: owned && notification.request.content.sound !== null, shouldSetBadge: false };
  },
});

export async function prepareReminderChannel() {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
    name: 'Ajanda hatırlatmaları', description: 'Seçtiğin gün ve saatte ders ve takvim hatırlatmaları.',
    importance: Notifications.AndroidImportance.HIGH, sound: 'default', enableVibrate: true,
    vibrationPattern: [0, 180, 100, 180], lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    bypassDnd: false, showBadge: false,
  });
}

export async function reminderPermission() {
  if (Platform.OS === 'web') return { granted: false, canAskAgain: false };
  const status = await Notifications.getPermissionsAsync();
  // Provisional iOS authorization is quiet; a reminder with sound needs full authorization.
  return { granted: status.granted && status.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL, canAskAgain: status.canAskAgain };
}

export async function requestReminderPermission() {
  if (Platform.OS === 'web') return { granted: false, canAskAgain: false };
  await prepareReminderChannel();
  const current = await reminderPermission();
  if (current.granted || !current.canAskAgain) return current;
  const status = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return { granted: status.granted && status.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL, canAskAgain: status.canAskAgain };
}

export function setReminderAccount(userId: string | null | undefined) {
  // Gate first: an old account cannot enqueue after sign-out/account switching.
  const nextOwner = userId || null;
  if (activeOwner !== nextOwner) accountEpoch++;
  activeOwner = nextOwner;
  if (Platform.OS === 'web') return Promise.resolve();
  return serial(async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) if (notification.identifier.startsWith(REMINDER_PREFIX) && notification.content.data?.owner !== activeOwner) await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    const presented = await Notifications.getPresentedNotificationsAsync();
    for (const notification of presented) if (notification.request.identifier.startsWith(REMINDER_PREFIX) && notification.request.content.data?.owner !== activeOwner) await Notifications.dismissNotificationAsync(notification.request.identifier);
  });
}

export function clearAgendaReminders() { return setReminderAccount(null); }

export function reconcileAgendaReminders(userId: string, reminders: AgendaReminder[]): Promise<{ scheduled: number; permission: boolean; error?: string }> {
  const epoch = accountEpoch;
  return serial(async () => {
    if (Platform.OS === 'web' || activeOwner !== userId || accountEpoch !== epoch) return { scheduled: 0, permission: false };
    try {
      await prepareReminderChannel();
      const permission = (await reminderPermission()).granted;
      const planned = permission ? planReminders(userId, reminders) : [];
      if (activeOwner !== userId || accountEpoch !== epoch) return { scheduled: 0, permission };
      const existing = await Notifications.getAllScheduledNotificationsAsync();
      if (activeOwner !== userId || accountEpoch !== epoch) return { scheduled: 0, permission };
      const own = existing.filter(n => n.identifier.startsWith(REMINDER_PREFIX) && n.content.data?.owner === userId);
      const byId = new Map(own.map(n => [n.identifier, n]));
      const wanted = new Map(planned.map(n => [n.identifier, n]));
      for (const notification of own) if (wanted.get(notification.identifier)?.fingerprint !== notification.content.data?.fingerprint) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier); byId.delete(notification.identifier);
      }
      let count = 0;
      for (const reminder of planned) {
        if (activeOwner !== userId || accountEpoch !== epoch) return { scheduled: 0, permission };
        if (byId.has(reminder.identifier)) { count++; continue; }
        await Notifications.scheduleNotificationAsync({ identifier: reminder.identifier, content: {
          title: 'Ajanda hatırlatması', body: reminder.body ? `${reminder.title}\n${reminder.body}` : reminder.title,
          sound: 'default', autoDismiss: true, sticky: false,
          data: { kind: 'agenda-reminder-v2', owner: userId, date: reminder.date, reminderId: reminder.id, fingerprint: reminder.fingerprint },
        }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(reminder.at), channelId: REMINDER_CHANNEL, delivery: 'bestEffort' } });
        count++;
      }
      return { scheduled: count, permission };
    } catch { return { scheduled: 0, permission: false, error: 'Hatırlatmalar cihaza kaydedilemedi. Bildirim izinlerini ve cihaz ayarlarını kontrol et.' }; }
  });
}

function installationId(): Promise<string> {
  if (!installation) installation = (async () => {
    const key = 'kemal.mobile.installation.v1';
    let value = await SecureStore.getItemAsync(key);
    if (!value) { value = Crypto.randomUUID(); await SecureStore.setItemAsync(key, value); }
    return `${Platform.OS}:${value}`;
  })().catch(error => { installation = null; throw error; });
  return installation;
}

export async function registerPushToken(userId: string) {
  // Login never prompts. Remote push also needs FCM/APNs release credentials.
  if (Platform.OS === 'web' || !Device.isDevice || !(await reminderPermission()).granted) return null;
  if (Platform.OS === 'android' && !Constants.expoConfig?.android?.googleServicesFile) return null;
  await prepareReminderChannel();
  const projectId = APP_CONFIG.easProjectId || Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId || '';
  if (!projectId) return null;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { error } = await supabase.from('device_push_tokens').upsert({
    user_id: userId, expo_push_token: token, platform: Platform.OS, device_id: await installationId(),
    device_name: Device.deviceName || Device.modelName || '', active: true, last_seen_at: new Date().toISOString(),
  }, { onConflict: 'user_id,device_id' });
  if (error) return null;
  return token;
}

export async function deactivatePushToken(userId: string) {
  await clearAgendaReminders().catch(() => undefined);
  if (Platform.OS === 'web' || !Device.isDevice) return;
  // Local sign-out must remain available when storage/the network is unavailable.
  try { await supabase.from('device_push_tokens').update({ active: false, last_seen_at: new Date().toISOString() }).eq('user_id', userId).eq('device_id', await installationId()); } catch { /* sign-out still clears local session and reminder ownership */ }
}
