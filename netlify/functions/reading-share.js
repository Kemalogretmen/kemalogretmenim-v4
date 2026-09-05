const SUPABASE_URL = 'https://mwxcvlyrkptxrwgkmqum.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__nk391uzfRC4bg3HQFHjlA_tH5kzmDY';
const SITE_ORIGIN = 'https://kemalogretmenim.com.tr';
const DEFAULT_IMAGE = SITE_ORIGIN + '/gorseller/logo.png';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeGrades(text) {
  const raw = Array.isArray(text.siniflar) && text.siniflar.length ? text.siniflar : [text.sinif];
  return [...new Set(raw.map(Number).filter((grade) => grade >= 1 && grade <= 8))].sort((a, b) => a - b);
}

function getTrainingProfile(value) {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string') return {};
  try {
    return JSON.parse(value);
  } catch (error) {
    return {};
  }
}

function isPreviewBot(userAgent) {
  return /WhatsApp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|TelegramBot|Discordbot|Slackbot/i.test(String(userAgent || ''));
}

function renderPage({ textId, text, previewBot, shareVersion }) {
  const targetUrl = SITE_ORIGIN + '/hizli-okuma/index.html?metinId=' + encodeURIComponent(textId);
  const canonicalUrl = SITE_ORIGIN + '/okuma/' + encodeURIComponent(textId);
  const shareUrl = canonicalUrl + (shareVersion ? '?v=' + encodeURIComponent(shareVersion) : '');
  const title = text.baslik || 'Okuma Metni';
  const grades = normalizeGrades(text);
  const gradeText = grades.map((grade) => grade + '. Sınıf').join(', ');
  const profile = getTrainingProfile(text.egitim_json);
  const typeLabels = {
    hikaye: 'Hikaye',
    bilgilendirici: 'Bilgilendirici Metin',
    masal: 'Masal',
    siir: 'Şiir',
    diyalog: 'Diyalog',
    egzersiz: 'Okuma Egzersizi',
  };
  const mode = text.goruntuleme_modu === 'kelime' ? 'Kelime kelime okuma' : 'Tam metin okuma';
  const description = [
    gradeText,
    typeLabels[profile.tur] || 'Okuma Anlama',
    text.kelime_sayisi ? text.kelime_sayisi + ' kelime' : '',
    mode,
  ].filter(Boolean).join(' · ');

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)} — Kemal Öğretmenim</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <meta property="og:locale" content="tr_TR">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Kemal Öğretmenim">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(shareUrl)}">
  <meta property="og:image" content="${DEFAULT_IMAGE}">
  <meta property="og:image:secure_url" content="${DEFAULT_IMAGE}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1000">
  <meta property="og:image:height" content="1000">
  <meta property="og:image:alt" content="Kemal Öğretmenim logosu">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${DEFAULT_IMAGE}">
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f3ff;color:#0f172a;font-family:Arial,sans-serif}
    main{width:min(560px,calc(100% - 32px));padding:32px;border-radius:24px;background:#fff;box-shadow:0 18px 50px rgba(15,23,42,.12);text-align:center}
    img{width:180px;height:180px;object-fit:contain;border-radius:28px;margin-bottom:20px}
    h1{font-size:25px;line-height:1.25;margin:0 0 10px}p{color:#64748b;line-height:1.6}
    a{display:inline-block;margin-top:10px;padding:13px 22px;border-radius:999px;background:#6c3ded;color:#fff;text-decoration:none;font-weight:700}
  </style>
</head>
<body>
  <main>
    <img src="${DEFAULT_IMAGE}" alt="Kemal Öğretmenim logosu">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <a href="${escapeHtml(targetUrl)}">Okumaya Başla</a>
  </main>
  ${previewBot ? '' : `<script>window.location.replace(${JSON.stringify(targetUrl)});<\/script>`}
</body>
</html>`;
}

exports.handler = async function handler(event) {
  const rawPath = String(event.rawUrl || event.path || '');
  const pathMatch = rawPath.match(/\/okuma\/([A-Za-z0-9_-]{6,128})(?:[/?#]|$)/);
  const textId = String(event.queryStringParameters?.textId || pathMatch?.[1] || '').trim();
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(textId)) {
    return { statusCode: 400, body: 'Geçersiz okuma bağlantısı.' };
  }

  try {
    const query = new URLSearchParams({
      select: 'id,baslik,sinif,siniflar,goruntuleme_modu,kelime_sayisi,aktif,egitim_json',
      id: 'eq.' + textId,
      aktif: 'eq.true',
      limit: '1',
    });
    const response = await fetch(SUPABASE_URL + '/rest/v1/metinler?' + query.toString(), {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      },
    });
    if (!response.ok) {
      return { statusCode: 404, body: 'Okuma metni bulunamadı.' };
    }
    const rows = await response.json();
    const text = Array.isArray(rows) ? rows[0] : null;
    if (!text || text.aktif !== true) {
      return { statusCode: 404, body: 'Okuma metni aktif değil.' };
    }
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
      },
      body: renderPage({
        textId,
        text,
        previewBot: isPreviewBot(event.headers?.['user-agent'] || event.headers?.['User-Agent']),
        shareVersion: String(event.queryStringParameters?.v || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24),
      }),
    };
  } catch (error) {
    console.error('Reading share preview failed:', error);
    return { statusCode: 503, body: 'Okuma önizlemesi şu an hazırlanamadı.' };
  }
};
