const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(name, mocks = {}) {
  const file = path.join(root, 'src/platform', name + '.ts');
  const module = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(js, { module, exports: module.exports, require: key => mocks[key] || (key.startsWith('./') ? load(key.slice(2), mocks) : require(key)), URL, URLSearchParams, AbortController, setTimeout, clearTimeout, fetch: mocks.fetch, Date, console });
  return module.exports;
}
const m = load('home-feed-model');
const origin = 'https://kemalogretmenim.com.tr';
const storage = 'https://mwxcvlyrkptxrwgkmqum.supabase.co';
test('published showcase preserves Republic imagery and honors later administrator uploads', () => {
  const raw = [
    { id: '0b98c047-4fd5-47fe-ad17-fb4a3eb00aff', baslik: 'Cumhuriyet', icerik_turu: 'image', aktif: true, media_url: storage + '/republic.webp', link_url: '/makale.html?id=republic' },
    { id: 'ea6f2486-4834-491a-9bb4-2bfc4d9c3202', baslik: 'Deneme', icerik_turu: 'image', aktif: true, media_path: 'homepage-vitrin/ea6f2486-4834-491a-9bb4-2bfc4d9c3202/1786351824664-6-sinif-sayisal-1-tema-tekrar-denemesi-1.webp' },
  ];
  const slides = m.normalizeHomeSlides(raw, origin, storage);
  assert.equal(slides[0].image, storage + '/republic.webp');
  assert.equal(slides[1].image, ''); assert.equal(slides[1].icon, 'calculator-outline');
  raw[1].media_url = storage + '/new-cover.webp';
  assert.equal(m.normalizeHomeSlides(raw, origin, storage)[1].image, storage + '/new-cover.webp');
  assert.equal(m.normalizeHomeSlides([{ ...raw[0], aktif: false }], origin, storage).length, 0);
});
test('home text remains plain text and unsafe URL schemes cannot become activity destinations', () => {
  assert.equal(m.homeText('<script>secret()</script><p>Merhaba &amp; dünya</p>'), 'Merhaba & dünya');
  for (const url of ['javascript:alert(1)', 'data:text/html,bad', 'file:///a', '//evil.test', 'https://user:pass@example.com', '\nhttps://evil.test', '/\\evil.test']) assert.equal(m.homeUrl(url, origin), '');
  assert.equal(m.homeUrl('/dokuman.html?id=a%26b', origin), origin + '/dokuman.html?id=a%26b');
});
test('live flow excludes hidden, inactive and administrator-disabled home feed content', () => {
  const raw = [
    { id: 'public', baslik: 'Yayımlanmış', aktif: true, sinif: 3, olusturma_tarihi: '2026-11-01' },
    { id: 'hidden', baslik: 'Gizli', aktif: true, gizli: true },
    { id: 'inactive', baslik: 'Taslak', aktif: false },
    { id: 'no-home', baslik: 'Kütüphane', aktif: true, home_feed_visible: false },
  ];
  const items = m.normalizeHomeContent(raw, 'documents', origin);
  assert.equal(items.length, 1); assert.equal(items[0].grade, 3); assert.ok(items[0].href.includes('id=public'));
  const reading = m.normalizeHomeContent([raw[0]], 'reading', origin)[0];
  assert.ok(reading.href.includes('metinId=public')); assert.equal(reading.kind, 'Hızlı Okuma');
});
test('Firestore metadata only yields published and visible exams with real IDs', () => {
  const document = (id, extra = {}) => ({ document: { name: 'projects/app/databases/(default)/documents/exams/' + id, fields: { title: { stringValue: 'Sınav ' + id }, grade: { integerValue: '4' }, published: { booleanValue: true }, createdAt: { timestampValue: '2026-11-01T12:00:00Z' }, ...extra } } });
  const items = m.normalizeHomeExams([document('a'), document('b', { hidden: { booleanValue: true } }), document('c', { published: { booleanValue: false } })], origin);
  assert.equal(items.length, 1); assert.equal(items[0].grade, 4); assert.equal(items[0].href, origin + '/sinav_sitesi/index.html?examId=a');
});
test('game flow is extracted from the current website catalog and newest items sort first', () => {
  const html = fs.readFileSync(path.join(root, '..', 'oyun/oyunlar.html'), 'utf8');
  const games = m.normalizeHomeGames(html, origin);
  assert.ok(games.some(item => item.href.endsWith('/onluk-basket.html') && item.title === 'ONLUK BASKET')); assert.ok(games.length >= 20);
  const fake = `<a class="game-card" href="javascript:alert(1)" data-date="2026-11-01"><span class="gc-title">Kötü</span></a>`;
  assert.equal(m.normalizeHomeGames(fake, origin).length, 0);
  const sorted = m.latestHomeItems([...games, { ...games[0], id: 'new', at: 9999999999999 }, games[0]]);
  assert.equal(sorted[0].id, 'new'); assert.equal(sorted.filter(item => item.id === games[0].id).length, 1);
});
test('cache expires and is revalidated before offline rendering', () => {
  const now = Date.now();
  const cached = { updatedAt: now, slides: [], items: [{ id: 'one', title: '<b>Bir</b>', href: '/a', source: 'reading', at: 10, icon: 'book-outline' }, { id: 'bad', title: 'Bad', href: 'javascript:x', source: 'reading' }] };
  const data = m.normalizeHomeCache(cached, origin, now); assert.equal(data.items.length, 1); assert.equal(data.items[0].title, 'Bir');
  assert.equal(m.normalizeHomeCache({ ...cached, updatedAt: now - 8 * 86400_000 }, origin, now), null);
  assert.equal(m.normalizeHomeCache({ ...cached, updatedAt: now + 86400_000 }, origin, now), null);
});
test('home fetches use anonymous metadata, preserve partial failures and never request exam answers', async () => {
  const requests = [];
  const api = load('useHomeFeed', {
    react: {}, 'react-native': {}, 'expo-router': {}, '@react-native-async-storage/async-storage': {},
    '@/constants/config': { APP_CONFIG: { siteUrl: origin, supabaseUrl: storage, supabaseAnonKey: 'public-test-key' } },
    fetch: async (url, init) => {
      requests.push({ url, init });
      if (url.includes('/dokumanlar?')) throw new Error('offline source');
      return { ok: true, text: async () => url.endsWith('oyunlar.html') ? '' : '[]' };
    },
  });
  const result = await api.fetchHomeFeed();
  assert.equal(result.succeeded, 4); assert.equal(result.failed, 1); assert.equal(result.items.documents, undefined);
  for (const request of requests.filter(r => r.url.startsWith(storage))) assert.equal(request.init.headers.Authorization, 'Bearer public-test-key');
  const exams = requests.find(r => r.url.includes('firestore.googleapis.com'));
  const query = JSON.parse(exams.init.body).structuredQuery;
  assert.equal(query.where.fieldFilter.value.booleanValue, true);
  assert.ok(!JSON.stringify(query.select).match(/answer|question|student/i));
});
