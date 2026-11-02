import { createElement, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

/** The desktop preview uses the app's existing client, never a second website login. */
export function WebAgendaActivity({ html, hostKey, nonce, title, onReady, onError }: {
  html: string; hostKey: string; nonce: string; title: string;
  onReady: () => void; onError: (message: string) => void;
}) {
  const { session, userId, profile } = useAuth();
  const frame = useRef<HTMLIFrameElement>(null);
  const current = useRef({ userId, session, profile, onReady, onError });
  current.current = { userId, session, profile, onReady, onError };
  const [prepared, setPrepared] = useState(false);
  useLayoutEffect(() => {
    const owner = userId;
    let active = true;
    const check = () => {
      const auth = current.current;
      if (!active || !owner || auth.userId !== owner || auth.session?.user.id !== owner || auth.profile?.id !== owner || auth.profile.role !== 'teacher' || auth.profile.active === false || (auth.profile.approval_status && auth.profile.approval_status !== 'active')) throw new Error('Ajanda oturumu değişti.');
      return auth;
    };
    const capability = {
      connect(candidate: Window, suppliedNonce: string) {
        if (!active || suppliedNonce !== nonce || !frame.current || candidate !== frame.current.contentWindow) return null;
        return {
          ready: async () => { const auth = check(); return { user: { id: owner, email: auth.session?.user.email }, profile: auth.profile }; },
          getClient: () => { check(); return supabase; },
          notify: (type: string) => {
            check();
            if (type === 'ready') current.current.onReady();
            if (type === 'storageError') current.current.onError('Cihazın ajanda kaydına erişilemiyor. Kayıtları silmeden depolama alanını kontrol et.');
          },
        };
      },
    };
    Object.defineProperty(window, hostKey, { value: capability, configurable: true });
    setPrepared(true);
    return () => { active = false; if ((window as any)[hostKey] === capability) delete (window as any)[hostKey]; };
  }, [hostKey, nonce, userId]);
  if (!prepared) return null;
  return createElement('iframe', {
    ref: frame, title, srcDoc: html,
    sandbox: 'allow-scripts allow-same-origin allow-downloads allow-modals',
    referrerPolicy: 'no-referrer',
    style: { flex: 1, border: 0, width: '100%', height: '100%', minHeight: 0 },
  });
}
