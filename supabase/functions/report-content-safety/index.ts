import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function cleanText(value: unknown, maxLength: number) {
  return String(value || '').trim().slice(0, maxLength);
}

function getClientIp(req: Request) {
  const candidates = [
    req.headers.get('x-forwarded-for'),
    req.headers.get('x-real-ip'),
    req.headers.get('x-nf-client-connection-ip'),
    req.headers.get('cf-connecting-ip'),
  ].filter(Boolean).join(',');
  return candidates.split(',').map((part) => part.trim()).find(Boolean) || '';
}

function getCountryCode(req: Request) {
  return cleanText(
    req.headers.get('cf-ipcountry') ||
      req.headers.get('x-vercel-ip-country') ||
      req.headers.get('x-country-code') ||
      '',
    12,
  ).toUpperCase();
}

async function sha256Hex(input: string) {
  if (!input) return '';
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function getJwtSub(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded));
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Missing Supabase function environment' }, 500);
  }

  const payload = await req.json().catch(() => ({}));
  const ip = getClientIp(req);
  const ipSalt = Deno.env.get('CONTENT_SAFETY_IP_SALT') || serviceRoleKey.slice(0, 24);
  const ipHash = await sha256Hex(ip ? `${ipSalt}:${ip}` : '');
  const userId = getJwtSub(req);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error } = await supabase.from('content_safety_events').insert({
    session_id: cleanText(payload.session_id, 120),
    user_id: userId,
    surface: cleanText(payload.surface, 80),
    field_name: cleanText(payload.field_name, 120),
    matched_key: cleanText(payload.matched_key, 80),
    page_path: cleanText(payload.page_path, 500),
    page_url: cleanText(payload.page_url, 1000),
    language: cleanText(payload.language, 40),
    timezone: cleanText(payload.timezone, 80),
    user_agent: cleanText(payload.user_agent || req.headers.get('user-agent'), 500),
    ip_hash: ipHash,
    country_code: getCountryCode(req),
    event_payload: payload.event_payload && typeof payload.event_payload === 'object'
      ? payload.event_payload
      : {},
  });

  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({ ok: true });
});
