import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const APP_CONFIG = {
  name: 'Kemal Öğretmenim',
  scheme: 'kemalogretmenim',
  siteUrl:
    process.env.EXPO_PUBLIC_SITE_URL ||
    (typeof extra.siteUrl === 'string' ? extra.siteUrl : 'https://kemalogretmenim.com.tr'),
  supabaseUrl:
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    (typeof extra.supabaseUrl === 'string' ? extra.supabaseUrl : 'https://mwxcvlyrkptxrwgkmqum.supabase.co'),
  supabaseAnonKey:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    (typeof extra.supabaseAnonKey === 'string' ? extra.supabaseAnonKey : ''),
  easProjectId:
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    (typeof extra.eas?.projectId === 'string' ? extra.eas.projectId : ''),
};

export function webUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${APP_CONFIG.siteUrl.replace(/\/$/, '')}${normalized}`;
}
