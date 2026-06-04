import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { APP_CONFIG } from '@/constants/config';
import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

function getProjectId() {
  return (
    APP_CONFIG.easProjectId ||
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    ''
  );
}

function deviceId() {
  return [
    Platform.OS,
    Device.modelName || 'unknown-model',
    Device.osBuildId || Device.osInternalBuildId || 'unknown-build',
  ].join(':');
}

export async function registerPushToken(userId: string) {
  if (!Device.isDevice) return null;

  const current = await Notifications.getPermissionsAsync();
  const finalStatus = current.status === 'granted'
    ? current.status
    : (await Notifications.requestPermissionsAsync()).status;

  if (finalStatus !== 'granted') return null;

  const projectId = getProjectId();
  const token = projectId
    ? (await Notifications.getExpoPushTokenAsync({ projectId })).data
    : (await Notifications.getExpoPushTokenAsync()).data;

  const { error } = await supabase.from('device_push_tokens').upsert({
    user_id: userId,
    expo_push_token: token,
    platform: Platform.OS,
    device_id: deviceId(),
    device_name: Device.deviceName || Device.modelName || '',
    active: true,
    last_seen_at: new Date().toISOString(),
  }, { onConflict: 'user_id,device_id' });

  if (error) {
    console.warn('Push token could not be registered', error.message);
  }

  return token;
}

export async function deactivatePushToken(userId: string) {
  const { error } = await supabase
    .from('device_push_tokens')
    .update({ active: false, last_seen_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('device_id', deviceId());

  if (error) {
    console.warn('Push token could not be deactivated', error.message);
  }
}
