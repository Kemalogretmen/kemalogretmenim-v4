// Metadata only. This catalog never reads learner records, answer keys or HTML articles.
export type HomeSlide = { id: string; title: string; description: string; kind: string; image: string; icon: string; href: string; label: string; fit: 'cover' | 'contain'; duration: number };
export type HomeFeedItem = { id: string; title: string; href: string; kind: string; icon: string; at: number; grade: number | null; source: HomeSource };
export type HomeSource = 'reading' | 'documents' | 'exams' | 'games';
export type HomeFeedData = { slides: HomeSlide[]; items: HomeFeedItem[]; updatedAt: number };
type Row = Record<string, unknown>;

export function homeText(raw: unknown, max = 200) {
  return String(raw ?? '').slice(0, 10000).replace(/<(script|style|iframe|object)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<[^>]*>/g, ' ').replace(/&#(x[\da-f]+|\d+);/gi, (_, code: string) => {
      const n = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
    }).replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, name: string) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[name] || ''))
    .replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
export function homeUrl(raw: unknown, origin: string) {
  if (typeof raw !== 'string' || !raw.trim() || raw.startsWith('//') || /[\u0000-\u001f\\]/.test(raw)) return '';
  try { const u = new URL(raw, origin + '/'); return u.protocol === 'https:' && !u.username && !u.password ? u.href : ''; } catch { return ''; }
}
function rows(raw: unknown): Row[] { return Array.isArray(raw) ? raw.filter((r): r is Row => !!r && typeof r === 'object' && !Array.isArray(r)).slice(0, 200) : []; }
function timestamp(raw: unknown) { const n = Date.parse(String(raw || '')); return Number.isFinite(n) ? n : 0; }
function grade(raw: unknown) { const n = Number(raw); return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null; }
function visible(row: Row) { return row.aktif !== false && row.gizli !== true && row.hidden !== true; }

const revisedCovers: Record<string, { path: string; icon: string }> = {
  '087d09d2-b8e7-4a85-ae0c-601c4ff9f497': { path: 'homepage-vitrin/087d09d2-b8e7-4a85-ae0c-601c4ff9f497/1787408247664-1-sinif-yaz-tatil-yeni-testleri-yayinda.webp', icon: 'sunny-outline' },
  '6315ce4c-50d9-4e83-b103-3fbebd3c2c9b': { path: 'homepage-vitrin/6315ce4c-50d9-4e83-b103-3fbebd3c2c9b/1786468452102-egitim-sevgi-ile-baslar.webp', icon: 'school-outline' },
  'ea6f2486-4834-491a-9bb4-2bfc4d9c3202': { path: 'homepage-vitrin/ea6f2486-4834-491a-9bb4-2bfc4d9c3202/1786351824664-6-sinif-sayisal-1-tema-tekrar-denemesi-1.webp', icon: 'calculator-outline' },
  '377ec1fd-dc21-441d-8e0b-128c768998dd': { path: 'homepage-vitrin/377ec1fd-dc21-441d-8e0b-128c768998dd/1786323553958-6-sinif-sayisal-1-tema-tekrar-denemesi-1.webp', icon: 'shapes-outline' },
};
export function normalizeHomeSlides(raw: unknown, origin: string, storageOrigin: string): HomeSlide[] {
  return rows(raw).filter(row => visible(row) && row.aktif === true && typeof row.id === 'string' && homeText(row.baslik) && ['text','image','document','youtube'].includes(String(row.icerik_turu))).slice(0, 5).map(row => {
    const id = String(row.id); const kind = String(row.icerik_turu);
    const path = typeof row.media_path === 'string' ? row.media_path : '';
    const stored = path ? homeUrl(storageOrigin + '/storage/v1/object/public/dokumanlar/' + path.split('/').map(encodeURIComponent).join('/'), origin) : '';
    const original = homeUrl(row.media_url, origin) || stored;
    const revision = revisedCovers[id];
    const expected = revision ? homeUrl(storageOrigin + '/storage/v1/object/public/dokumanlar/' + revision.path, origin) : '';
    // Match the site's audited simple covers. An administrator's later upload wins.
    const simplified = !!revision && original === expected;
    const image = simplified || /\.svg(?:[?#]|$)/i.test(original) ? '' : original;
    const article = kind === 'text' ? '/makale.html?id=' + encodeURIComponent(id) : '';
    const document = row.dokuman_id ? '/dokuman.html?id=' + encodeURIComponent(String(row.dokuman_id)) : '';
    const video = /^[\w-]{11}$/.test(String(row.youtube_video_id || '')) ? 'https://www.youtube.com/watch?v=' + row.youtube_video_id : '';
    return { id, title: homeText(row.baslik, 180), description: homeText(row.aciklama_html, 260), kind: homeText(row.kategori, 60) || ({ text: 'Mini yazı', image: 'Öne çıkan', document: 'Ders kaynağı', youtube: 'Video' }[kind] || 'Vitrin'), image,
      icon: simplified ? revision.icon : kind === 'youtube' ? 'play-circle-outline' : kind === 'document' ? 'document-text-outline' : 'book-outline',
      href: homeUrl(article || row.link_url || document || video, origin), label: homeText(row.link_label, 50) || 'İncele', fit: row.media_fit === 'cover' ? 'cover' : 'contain', duration: Math.min(10000, Math.max(5000, Number(row.gecis_suresi_ms) || 6500)) };
  });
}
export function normalizeHomeContent(raw: unknown, source: 'reading' | 'documents', origin: string): HomeFeedItem[] {
  return rows(raw).filter(row => visible(row) && row.aktif === true && row.id && homeText(row.baslik) && row.home_feed_visible !== false && row.home_feed_visible !== 'false').map(row => {
    const reading = source === 'reading'; const id = String(row.id);
    const subject = String(row.ders || ''); const g = grade(row.sinif) || (Array.isArray(row.siniflar) ? grade(row.siniflar[0]) : null);
    return { id: source + ':' + id, title: homeText(row.baslik, 180), source, at: timestamp(row.olusturma_tarihi), grade: g,
      href: homeUrl(reading ? '/hizli-okuma/index.html?metinId=' + encodeURIComponent(id) : '/dokuman.html?id=' + encodeURIComponent(id) + '&sinif=' + encodeURIComponent(g || '') + '&ders=' + encodeURIComponent(subject), origin),
      kind: reading ? 'Hızlı Okuma' : row.icerik_turu === 'video' ? 'Ders videosu' : 'Ders kaynağı', icon: reading ? 'book-outline' : row.icerik_turu === 'video' ? 'play-circle-outline' : 'document-text-outline' };
  });
}
export function normalizeHomeExams(raw: unknown, origin: string): HomeFeedItem[] {
  return rows(raw).flatMap(result => {
    const document = result.document as Row | undefined; if (!document || typeof document.name !== 'string') return [];
    const fields = document.fields as Record<string, Record<string, unknown>> | undefined; if (!fields) return [];
    const value = (name: string) => fields[name]?.stringValue ?? fields[name]?.booleanValue ?? fields[name]?.integerValue ?? fields[name]?.timestampValue;
    if (value('published') !== true || value('hidden') === true || value('gizli') === true) return [];
    const id = document.name.split('/').pop() || ''; const title = homeText(value('title'), 180); if (!id || !title) return [];
    return [{ id: 'exams:' + id, title, source: 'exams' as const, kind: 'Sınav', icon: 'clipboard-outline', at: timestamp(value('createdAt')), grade: grade(value('grade')), href: homeUrl('/sinav_sitesi/index.html?examId=' + encodeURIComponent(id), origin) }];
  });
}
export function normalizeHomeGames(html: string, origin: string): HomeFeedItem[] {
  const items: HomeFeedItem[] = [];
  for (const match of html.slice(0, 2_000_000).matchAll(/<a\b([^>]*?)>([\s\S]*?)<\/a\s*>/gi)) {
    const attrs: Record<string, string> = {};
    for (const a of match[1].matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/g)) attrs[a[1].toLowerCase()] = a[3];
    if (!/(^|\s)game-card(\s|$)/.test(attrs.class || '') || !attrs['data-date']) continue;
    const title = homeText(match[2].match(/<[^>]+class=["'][^"']*\bgc-title\b[^"']*["'][^>]*>([\s\S]*?)<\//i)?.[1], 180);
    const rawHref = attrs.href || '';
    const href = homeUrl(rawHref.startsWith('/') || /^[a-z][\w+.-]*:/i.test(rawHref) ? rawHref : '/oyun/' + rawHref.replace(/^\.\//, ''), origin);
    if (title && href) items.push({ id: 'games:' + href, title, href, source: 'games', kind: 'Oyun', icon: 'game-controller-outline', grade: null, at: timestamp(attrs['data-date']) });
    if (items.length >= 80) break;
  }
  return items;
}
export function latestHomeItems(items: HomeFeedItem[]) {
  const seen = new Set<string>();
  return items.filter(item => item.title && item.href && !seen.has(item.id) && !!seen.add(item.id)).sort((a, b) => b.at - a.at).slice(0, 40);
}
export function normalizeHomeCache(raw: unknown, origin: string, now = Date.now()): HomeFeedData | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as HomeFeedData;
  if (!Number.isFinite(data.updatedAt) || data.updatedAt > now + 60_000 || now - data.updatedAt > 7 * 86400_000) return null;
  const slides = rows(data.slides).flatMap(row => {
    const title = homeText(row.title, 180); const href = homeUrl(row.href, origin); if (!title || typeof row.id !== 'string') return [];
    return [{ id: row.id, title, href, description: homeText(row.description, 260), kind: homeText(row.kind, 60), image: homeUrl(row.image, origin), icon: /^[-a-z]+$/.test(String(row.icon)) ? String(row.icon) : 'book-outline', label: homeText(row.label, 50) || 'İncele', fit: row.fit === 'cover' ? 'cover' as const : 'contain' as const, duration: Math.min(10000, Math.max(5000, Number(row.duration) || 6500)) }];
  }).slice(0, 5);
  const items = rows(data.items).flatMap(row => {
    const href = homeUrl(row.href, origin); const title = homeText(row.title, 180);
    if (!href || !title || typeof row.id !== 'string' || !['reading','documents','exams','games'].includes(String(row.source))) return [];
    return [{ id: row.id, title, href, source: row.source as HomeSource, kind: homeText(row.kind, 60), icon: /^[-a-z]+$/.test(String(row.icon)) ? String(row.icon) : 'document-text-outline', grade: grade(row.grade), at: Number.isFinite(row.at) ? Number(row.at) : 0 }];
  });
  return { slides, items: latestHomeItems(items), updatedAt: data.updatedAt };
}
