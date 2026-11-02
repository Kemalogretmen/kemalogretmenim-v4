import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { APP_CONFIG } from '@/constants/config';
import { fetchProfile, findProfileByEmail, uploadTeacherVerification, upsertProfile } from '@/services/api';
import { deactivatePushToken, registerPushToken } from '@/services/notifications';
import { bindNativeAuthRefresh, supabase } from '@/lib/supabase';
import { authCallbackPayload, createAuthIdentityGuard } from '@/lib/auth-guards';
import { assertContentFields } from '@/lib/contentSafety';
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

const AuthContext = createContext<AuthContextValue | null>(null);

WebBrowser.maybeCompleteAuthSession();

function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase('tr-TR');
}

function getAuthRedirectUrl() {
  return `${APP_CONFIG.scheme}://auth/callback`;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const handledAuthUrls = useRef<Set<string>>(new Set());
  const identity = useRef(createAuthIdentityGuard());
  const mounted = useRef(false);
  const profileRequest = useRef(0);
  const profileOwner = useRef<string | null>(null);
  const hydrationRequest = useRef(0);
  const authEvents = useRef(0);
  const signingOut = useRef(false);

  const loadProfile = useCallback(async (id: string) => {
    const ticket = identity.current.ticket(id);
    if (!ticket || signingOut.current) return;
    const request = ++profileRequest.current;
    const nextProfile = await fetchProfile(id);
    if (!mounted.current || !identity.current.current(ticket) || request !== profileRequest.current || signingOut.current) return;
    setProfile(nextProfile);
    profileOwner.current = id;
    if (nextProfile && nextProfile.active !== false) {
      registerPushToken(id).catch(() => undefined);
    }
  }, []);

  const acceptSession = useCallback((current: Session | null) => {
    const id = current?.user?.id || null;
    if (identity.current.accept(id)) {
      profileRequest.current++; profileOwner.current = null; setProfile(null);
    }
    setSession(current); setUserId(id); setEmail(current?.user?.email || '');
    setLoading(!!id && profileOwner.current !== id);
    return id;
  }, []);

  const hydrate = useCallback(async () => {
    const request = ++hydrationRequest.current;
    const event = authEvents.current;
    const current = () => mounted.current && !signingOut.current && request === hydrationRequest.current && event === authEvents.current;
    setLoading(true);
    setError('');
    let accepted = false;
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!current()) return;
      if (sessionError) throw sessionError;
      const id = acceptSession(data.session ?? null); accepted = true;
      if (id) await loadProfile(id);
    } catch (caught) {
      if (!current()) return;
      setError(caught instanceof Error ? caught.message : String(caught));
      if (!accepted) acceptSession(null);
    } finally {
      if (current()) setLoading(false);
    }
  }, [acceptSession, loadProfile]);

  useEffect(() => {
    mounted.current = true;
    const stopRefresh = bindNativeAuthRefresh();
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      authEvents.current++;
      if (!mounted.current || (signingOut.current && event !== 'SIGNED_OUT')) return;
      const id = acceptSession(nextSession ?? null);
      if (id && (profileOwner.current !== id || event === 'USER_UPDATED' || event === 'SIGNED_IN')) {
        const ticket = identity.current.ticket(id);
        // Defer Supabase queries until the auth callback releases its lock.
        setTimeout(() => {
          if (!mounted.current || !identity.current.current(ticket) || signingOut.current) return;
          const work = loadProfile(id); const request = profileRequest.current;
          void work.catch(caught => {
            if (mounted.current && identity.current.current(ticket) && request === profileRequest.current) setError(caught instanceof Error ? caught.message : String(caught));
          }).finally(() => {
            if (mounted.current && identity.current.current(ticket) && request === profileRequest.current) setLoading(false);
          });
        }, 0);
      }
    });
    void hydrate();
    return () => { mounted.current = false; identity.current.invalidate(); profileRequest.current++; hydrationRequest.current++; data.subscription.unsubscribe(); stopRefresh(); };
  }, [acceptSession, hydrate, loadProfile]);

  const handleAuthCallbackUrl = useCallback(async (url: string) => {
    const authPayload = authCallbackPayload(url, APP_CONFIG.scheme);
    if (!authPayload) return false;

    if (handledAuthUrls.current.has(url)) return true;
    if (handledAuthUrls.current.size >= 20) handledAuthUrls.current.delete(handledAuthUrls.current.values().next().value!);
    handledAuthUrls.current.add(url);

    setLoading(true);
    setError('');
    try {
      if (authPayload.kind === 'error') {
        throw new Error(authPayload.message);
      }

      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(authPayload.code);

      if (sessionError) throw sessionError;
      await hydrate();
      return true;
    } catch (caught) {
      handledAuthUrls.current.delete(url);
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
      assertContentFields([
        { label: 'ad', value: input.firstName },
        { label: 'soyad', value: input.lastName },
        { label: 'okul_adi', value: input.schoolName ?? '' },
      ]);
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
      signingOut.current = true; hydrationRequest.current++; identity.current.invalidate(); profileRequest.current++; profileOwner.current = null;
      setSession(null); setUserId(null); setEmail(''); setProfile(null); setLoading(false);
      try {
        // A failed push-token cleanup must never prevent device sign-out.
        if (currentUserId) await deactivatePushToken(currentUserId).catch(() => undefined);
        const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
        if (signOutError) setError('Cihaz oturumu kapatıldı; sunucu çıkışı doğrulanamadı.');
      } finally {
        signingOut.current = false;
      }
    },
    updateProfile: async (patch) => {
      if (!userId || !profile) throw new Error('Profil güncellemek için giriş yapmalısın.');
      const ticket = identity.current.ticket(userId);
      const request = ++profileRequest.current;
      const next = await upsertProfile({
        ...profile,
        ...patch,
        id: userId,
        email: profile.email || email,
        role: profile.role,
      });
      if (mounted.current && identity.current.current(ticket) && request === profileRequest.current) { setProfile(next); profileOwner.current = userId; }
    },
  }), [email, error, handleAuthCallbackUrl, hydrate, loadProfile, loading, profile, session, userId]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
