import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { AppUpdate, availableUpdate, safeApkUrl } from '@/platform/updateModel';

export const APP_VERSION = Constants.expoConfig?.version || '0.6.0';
export const APP_VERSION_CODE = Number(Constants.expoConfig?.android?.versionCode || 6);
const CHECK_KEY = 'kemal.mobile.update.checked.v1';
const DISMISS_KEY = 'kemal.mobile.update.dismissed.v1';
const ENDPOINT = 'https://api.github.com/repos/Kemalogretmen/kemalogretmenim-v4/releases?per_page=20';
let pending: Promise<AppUpdate | null> | null = null;

export async function checkAppUpdate(force = false): Promise<AppUpdate | null> {
  // Sideload APK checks apply only to Android; iOS must use App Store/TestFlight.
  if (Platform.OS !== 'android') return null;
  if (pending) return pending;
  pending = (async () => {
    if (!force) {
      const last = Number(await AsyncStorage.getItem(CHECK_KEY));
      if (last && Date.now() - last < 24 * 60 * 60_000) return null;
    }
    // Throttle failed background attempts as well; the manual action can retry.
    await AsyncStorage.setItem(CHECK_KEY, String(Date.now()));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(ENDPOINT, { headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, signal: controller.signal });
      if (!response.ok) throw new Error('Güncelleme sunucusuna ulaşılamadı.');
      const raw = await response.text();
      if (raw.length > 1_500_000) throw new Error('Güncelleme yanıtı geçersiz.');
      const update = availableUpdate(JSON.parse(raw), APP_VERSION, APP_VERSION_CODE);
      if (!force && update?.version === await AsyncStorage.getItem(DISMISS_KEY)) return null;
      return update;
    } finally { clearTimeout(timeout); }
  })();
  try { return await pending; } finally { pending = null; }
}

export async function dismissAppUpdate(version: string) { await AsyncStorage.setItem(DISMISS_KEY, version); }
export { safeApkUrl };
