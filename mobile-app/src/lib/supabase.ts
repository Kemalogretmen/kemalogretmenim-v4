import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { APP_CONFIG } from '@/constants/config';

if (!APP_CONFIG.supabaseAnonKey) {
  console.warn('Supabase anon key is missing. Set EXPO_PUBLIC_SUPABASE_ANON_KEY before running the app.');
}

export const supabase = createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
