export function isAuthCallbackUrl(raw: string, scheme: string) {
  if (!raw || /[\u0000-\u0020\\]/.test(raw)) return false;
  try {
    const url = new URL(raw);
    return url.protocol === scheme.toLowerCase() + ':' && url.hostname === 'auth' && !url.port && !url.username && !url.password && url.pathname === '/callback';
  } catch { return false; }
}
export function authCallbackPayload(raw: string, scheme: string): { kind: 'code'; code: string } | { kind: 'error'; message: string } | null {
  if (!isAuthCallbackUrl(raw, scheme)) return null;
  const url = new URL(raw);
  // PKCE is configured on the client. A caller-provided bearer token pair is
  // deliberately not an alternate login method: authorization codes must match
  // the verifier generated on this device by Supabase.
  if (url.searchParams.has('access_token') || url.searchParams.has('refresh_token') || /(?:^|[&#])(?:access_token|refresh_token)=/.test(url.hash)) return null;
  const error = url.searchParams.get('error');
  if (error) return { kind: 'error', message: (url.searchParams.get('error_description') || error).slice(0, 300) };
  const codes = url.searchParams.getAll('code');
  if (codes.length !== 1 || !codes[0] || codes[0].length > 4096 || /[\u0000-\u0020]/.test(codes[0])) return null;
  return { kind: 'code', code: codes[0] };
}
export type AuthIdentityTicket = { id: string; revision: number };
export function createAuthIdentityGuard() {
  let owner: string | null = null; let revision = 0;
  return {
    owner: () => owner,
    accept: (id: string | null) => { const changed = owner !== id; if (changed) revision++; owner = id; return changed; },
    invalidate: () => { revision++; owner = null; },
    ticket: (id: string): AuthIdentityTicket | null => owner === id ? { id, revision } : null,
    current: (ticket: AuthIdentityTicket | null) => !!ticket && ticket.id === owner && ticket.revision === revision,
  };
}
