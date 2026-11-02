export function internalUrl(raw: unknown, origin: string) {
  if (typeof raw !== 'string' || !raw.trim() || raw.startsWith('//') || /[\u0000-\u001f\\]/.test(raw)) return null;
  try {
    const base = new URL(origin);
    const target = new URL(raw, `${base.origin}/`);
    return target.origin === base.origin && target.protocol === 'https:' && !target.username && !target.password ? target.href : null;
  } catch { return null; }
}
export function isAuthPath(raw: string) {
  try { return /^\/(giris|kayit)(\.html)?\/?$/.test(new URL(raw).pathname); } catch { return false; }
}
export function safeExternalUrl(raw: string) {
  try { const u = new URL(raw); return ['https:', 'mailto:', 'tel:'].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; }
}
export function safeExport(value: unknown): { name: string; base64: string; mime: string } | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.name !== 'string' || typeof v.base64 !== 'string' || typeof v.mime !== 'string' || v.base64.length > 20 * 1024 * 1024 || !/^[A-Za-z0-9+/]*={0,2}$/.test(v.base64)) return null;
  const name = v.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
  const extension = name.split('.').pop()?.toLowerCase();
  const types: Record<string, string[]> = { json: ['application/json','text/plain',''], pdf: ['application/pdf'], png: ['image/png'], jpg: ['image/jpeg'], jpeg: ['image/jpeg'], xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], csv: ['text/csv','text/plain'] };
  return extension && types[extension]?.includes(v.mime) ? { name, base64: v.base64, mime: v.mime || 'application/json' } : null;
}
