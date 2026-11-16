const SUPABASE_URL = 'https://mwxcvlyrkptxrwgkmqum.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__nk391uzfRC4bg3HQFHjlA_tH5kzmDY';

exports.handler = async function(event) {
  const headers = { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' };
  const method = event.httpMethod;
  if (method !== 'GET' && method !== 'HEAD') {
    return { statusCode: 405, headers: { ...headers, Allow: 'GET, HEAD' }, body: '' };
  }
  try {
    const url = SUPABASE_URL + '/rest/v1/site_adsense_settings?id=eq.1&select=publisher_id';
    const response = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY }, signal: AbortSignal.timeout(4000) });
    if (!response.ok) return { statusCode: 503, headers, body: '' };
    const [settings] = await response.json();
    const publisher = settings?.publisher_id;
    if (!/^ca-pub-[0-9]{16}$/.test(publisher || '')) return { statusCode: 404, headers, body: '' };
    const line = 'google.com, ' + publisher.slice(3) + ', DIRECT, f08c47fec0942fa0\n';
    return { statusCode: 200, headers, body: method === 'HEAD' ? '' : line };
  } catch {
    return { statusCode: 503, headers, body: '' };
  }
};
