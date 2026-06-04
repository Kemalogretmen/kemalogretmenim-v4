import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { APP_CONFIG } from '@/constants/config';
import { fetchProfile, findProfileByEmail, uploadTeacherVerification, upsertProfile } from '@/services/api';
import { deactivatePushToken, registerPushToken } from '@/services/notifications';
import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/types/domain';

type AuthContextValue = {
  loading: boolean;
  userId: string | null;
  email: string;
  session: Session | null;
  profile: Profile | null;
  error: string;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
};

type SignUpInput = {
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  city?: string;
  district?: string;
  schoolName?: string;
  schoolId?: string | null;
  schoolMissing?: boolean;
  gradeLevel?: number | null;
  branch?: string;
  verificationFile?: {
    uri: string;
    name: string;
    mimeType?: string;
  } | null;
};

type AuthCallbackPayload =
  | { kind: 'error'; error: string; errorDescription: string }
  | { kind: 'code'; code: string }
  | { kind: 'tokens'; access_token: string; refresh_token: string };

const AuthContext = createContext<AuthContextValue | null>(null);

WebBrowser.maybeCompleteAuthSession();

function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase('tr-TR');
}

function getAuthRedirectUrl() {
  return `${APP_CONFIG.scheme}://auth/callback`;
}

function appendSearchParams(target: URLSearchParams, raw: string) {
  const queryStart = raw.indexOf('?');
  const normalized = (queryStart >= 0 ? raw.slice(queryStart + 1) : raw).replace(/^[#?]/, '');
  if (!normalized) return;
  new URLSearchParams(normalized).forEach((value, key) => target.set(key, value));
}

function getAuthCallbackParams(url: string) {
  const params = new URLSearchParams();
  const [withoutHash, hash = ''] = url.split('#');
  const queryStart = withoutHash.indexOf('?');
  if (queryStart >= 0) appendSearchParams(params, withoutHash.slice(queryStart + 1));
  appendSearchParams(params, hash);

  const parsed = Linking.parse(url);
  Object.entries(parsed.queryParams ?? {}).forEach(([key, value]) => {
    params.set(key, Array.isArray(value) ? String(value[0] ?? '') : String(value ?? ''));
  });

  return params;
}

function parseAuthCallback(url: string): AuthCallbackPayload | null {
  const params = getAuthCallbackParams(url);
  const error = params.get('error');
  const errorDescription = params.get('error_description') ?? params.get('error_code') ?? '';
  if (error) {
    return { kind: 'error', error, errorDescription };
  }

  const code = params.get('code');
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (code) return { kind: 'code', code };
  if (accessToken && refreshToken) return { kind: 'tokens', access_token: accessToken, refresh_token: refreshToken };

  return null;
}

function isAuthCallbackUrl(url: string) {
  return url.startsWith(`${APP_CONFIG.scheme}://auth/callback`) || url.includes('/auth/callback');
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const handledAuthUrls = useRef<Set<string>>(new Set());

  const loadProfile = useCallback(async (id: string) => {
    const nextProfile = await fetchProfile(id);
    setProfile(nextProfile);
    if (nextProfile?.active !== false) {
      registerPushToken(id).catch(() => undefined);
    }
  }, []);

  const hydrate = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const currentSession = data.session ?? null;
      const sessionUser = currentSession?.user ?? null;
      setSession(currentSession);
      setUserId(sessionUser?.id ?? null);
      setEmail(sessionUser?.email ?? '');
      if (sessionUser?.id) {
        await loadProfile(sessionUser.id);
      } else {
        setProfile(null);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setSession(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [loadProfile]);

  useEffect(() => {
    hydrate();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setSession(session ?? null);
      setUserId(sessionUser?.id ?? null);
      setEmail(sessionUser?.email ?? '');
      if (sessionUser?.id) {
        loadProfile(sessionUser.id).catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)));
      } else {
        setProfile(null);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [hydrate, loadProfile]);

  const handleAuthCallbackUrl = useCallback(async (url: string) => {
    if (!isAuthCallbackUrl(url)) return false;

    const authPayload = parseAuthCallback(url);
    if (!authPayload) return false;

    if (handledAuthUrls.current.has(url)) return true;
    handledAuthUrls.current.add(url);

    setLoading(true);
    setError('');
    try {
      if (authPayload.kind === 'error') {
        throw new Error(authPayload.errorDescription || authPayload.error);
      }

      const { error: sessionError } = authPayload.kind === 'code'
        ? await supabase.auth.exchangeCodeForSession(authPayload.code)
        : await supabase.auth.setSession({
          access_token: authPayload.access_token,
          refresh_token: authPayload.refresh_token,
        });

      if (sessionError) throw sessionError;
      await hydrate();
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      throw caught;
    } finally {
      setLoading(false);
    }
  }, [hydrate]);

  useEffect(() => {
    Linking.getInitialURL()
      .then((url) => {
        if (url) handleAuthCallbackUrl(url).catch(() => undefined);
      })
      .catch(() => undefined);

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleAuthCallbackUrl(url).catch(() => undefined);
    });

    return () => subscription.remove();
  }, [handleAuthCallbackUrl]);

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    userId,
    email,
    session,
    profile,
    error,
    refreshProfile: async () => {
      if (userId) await loadProfile(userId);
    },
    signIn: async (rawEmail, password) => {
      setError('');
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizeEmail(rawEmail),
        password,
      });
      if (signInError) throw signInError;
      await hydrate();
    },
    signInWithGoogle: async () => {
      setError('');
      if (Constants.appOwnership === 'expo') {
        throw new Error('Google girişi Expo Go önizlemesinde desteklenmez. E-posta/şifreyle giriş yapabilir veya APK/dev build üzerinden Google girişini test edebilirsin.');
      }
      const redirectTo = getAuthRedirectUrl();
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (oauthError) throw oauthError;
      if (!data.url) throw new Error('Google giriş adresi alınamadı.');
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success') return;
      const handled = await handleAuthCallbackUrl(result.url);
      if (!handled) throw new Error('Google oturum bilgisi alınamadı.');
    },
    signUp: async (input) => {
      setError('');
      const emailAddress = normalizeEmail(input.email);
      const existingProfile = await findProfileByEmail(emailAddress);
      if (existingProfile) {
        throw new Error('Bu e-posta adresiyle daha önce kayıt oluşturulmuş. Lütfen giriş yapmayı dene.');
      }
      if (input.role === 'teacher' && !input.verificationFile) {
        throw new Error('Öğretmen kaydı için öğretmen kimliği veya çalışma belgesi yüklemelisin.');
      }
      const fullName = [input.firstName, input.lastName].filter(Boolean).join(' ').trim();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: emailAddress,
        password: input.password,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
          data: {
            role: input.role,
            first_name: input.firstName,
            last_name: input.lastName,
            full_name: fullName,
            city: input.city ?? '',
            district: input.district ?? '',
            school_id: input.schoolId ?? null,
            school_name: input.schoolName ?? '',
            school_missing: input.schoolMissing ?? false,
            grade_level: input.gradeLevel ?? null,
            branch: input.branch ?? '',
          },
        },
      });
      if (signUpError) throw signUpError;
      const id = data.user?.id;
      if (id) {
        await upsertProfile({
          id,
          email: emailAddress,
          role: input.role,
          first_name: input.firstName,
          last_name: input.lastName,
          full_name: fullName,
          city: input.city ?? '',
          district: input.district ?? '',
          school_name: input.schoolName ?? '',
          school_id: input.schoolId ?? null,
          school_missing: input.schoolMissing ?? false,
          grade_level: input.gradeLevel ?? null,
          branch: input.branch ?? '',
          approval_status: input.role === 'teacher' ? 'pending' : 'active',
          active: true,
        });
        if (input.role === 'teacher' && input.verificationFile) {
          await uploadTeacherVerification({
            userId: id,
            ...input.verificationFile,
          });
        }
      }
      await hydrate();
    },
    signOut: async () => {
      const currentUserId = userId;
      if (currentUserId) {
        await deactivatePushToken(currentUserId);
      }
      await supabase.auth.signOut();
      setSession(null);
      setUserId(null);
      setEmail('');
      setProfile(null);
    },
    updateProfile: async (patch) => {
      if (!userId || !profile) throw new Error('Profil güncellemek için giriş yapmalısın.');
      const next = await upsertProfile({
        ...profile,
        ...patch,
        id: userId,
        email: profile.email || email,
        role: profile.role,
      });
      setProfile(next);
    },
  }), [email, error, handleAuthCallbackUrl, hydrate, loadProfile, loading, profile, session, userId]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
