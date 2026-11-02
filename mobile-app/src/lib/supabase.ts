import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';

import { APP_CONFIG } from '@/constants/config';
import { createSecureAuthStorage } from './secure-auth-storage';

if (!APP_CONFIG.supabaseAnonKey) {
  console.warn('Supabase anon key is missing. Set EXPO_PUBLIC_SUPABASE_ANON_KEY before running the app.');
}

const secureOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const nativeStorage = createSecureAuthStorage({
  getItem: key => SecureStore.getItemAsync(key, secureOptions),
  setItem: (key, value) => SecureStore.setItemAsync(key, value, secureOptions),
  removeItem: key => SecureStore.deleteItemAsync(key, secureOptions),
}, AsyncStorage);

export const supabase = createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? AsyncStorage : nativeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

// Supabase's native refresh timer follows the app lifecycle and this listener is
// removed when its single AuthProvider unmounts (including development refresh).
export function bindNativeAuthRefresh() {
  if (Platform.OS === 'web') return () => {};
  const update = (state: string | null | undefined) => {
    const task = state === 'active' || state == null ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh();
    void task.catch(() => undefined);
  };
  update(AppState.currentState);
  const subscription = AppState.addEventListener('change', update);
  return () => { subscription.remove(); void supabase.auth.stopAutoRefresh().catch(() => undefined); };
}
