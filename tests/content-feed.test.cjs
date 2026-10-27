const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');

function feedHarness(failFirstQuery = false) {
  const rows = [
    { id: 'home-off', sinif: 8, ders: 'fen-bilimleri', etkilesim_json: { homeFeedVisible: false } },
    { id: 'video-off', sinif: 8, ders: 'fen-bilimleri', icerik_turu: 'video', etkilesim_json: { homeFeedVisible: false } },
    { id: 'home-on', sinif: 2, ders: 'matematik', etkilesim_json: { homeFeedVisible: true } },
    { id: 'legacy', sinif: 3, ders: 'turkce' },
    { id: 'hidden', sinif: 4, ders: 'turkce', gizli: true },
  ].map((row, i) => ({ baslik: row.id, aktif: true, olusturma_tarihi: '2026-10-' + (27 - i) + 'T10:00:00Z', ...row }));
  const requests = [];
  const config = { supabaseUrl: 'https://fixture.test', supabaseAnonKey: 'fixture-key' };
  const window = { localStorage: { getItem: () => null }, kemalSiteStore: { getConfig: () => config } };
  vm.runInNewContext(fs.readFileSync('js/content-feed.js', 'utf8'), {
    window, URL,
    fetch: async input => {
      const url = new URL(input);
      requests.push(url);
      if (url.pathname.endsWith('/dokumanlar')) {
        assert.match(url.searchParams.get('select'), /home_feed_visible:etkilesim_json->homeFeedVisible/);
        if (failFirstQuery && url.searchParams.get('select').includes('hedefler')) return { ok: false };
        return { ok: true, json: async () => rows.map(row => {
          const { etkilesim_json, ...selected } = row;
          return { ...selected, home_feed_visible: etkilesim_json?.homeFeedVisible ?? null };
        }) };
      }
      return { ok: true, json: async () => [] };
    },
  });
  return { feed: window.kemalContentFeed, requests };
}

const ids = items => Array.from(items, item => item.id);

test('homepage exclusions leave the shared search/teacher catalog intact, including after a cached homepage call', async () => {
  const { feed, requests } = feedHarness();
  assert.deepEqual(ids(await feed.getAllItems({ homeFeedOnly: true })), ['home-on', 'legacy']);
  const count = requests.length;
  assert.deepEqual(ids(await feed.getAllItems()), ['home-off', 'video-off', 'home-on', 'legacy']);
  assert.equal(requests.length, count, 'A homepage request must not poison the shared cache');
  assert.deepEqual(ids(await feed.getLatestContent({ homeFeedOnly: true, maxItems: 1 })), ['home-on'], 'Filter before taking the newest items');
  assert.deepEqual(ids(await feed.getTickerItems({ homeFeedOnly: true, maxItems: 5 })), ['home-on', 'legacy']);
  assert.deepEqual(ids(await feed.getLatestContent({ grade: 8 })), ['home-off', 'video-off']);
});

test('homepage grade/subject filters omit excluded-only categories while catalog filters retain them', async () => {
  const { feed } = feedHarness();
  await feed.getAllItems();
  const home = await feed.getFilterOptions({ homeFeedOnly: true });
  assert.deepEqual(Array.from(home.grades, grade => grade.value), ['2', '3']);
  assert.ok(!home.subjects.some(subject => subject.value === 'fen-bilimleri'));
  const catalog = await feed.getFilterOptions();
  assert.ok(catalog.grades.some(grade => grade.value === '8'));
});

test('legacy query fallback still reads the homepage preference', async () => {
  const { feed, requests } = feedHarness(true);
  assert.deepEqual(ids(await feed.getAllItems({ homeFeedOnly: true })), ['home-on', 'legacy']);
  assert.equal(requests.filter(url => url.pathname.endsWith('/dokumanlar')).length, 2);
});

test('publishing viewer interactions preserves the homepage choice and other saved document settings', async () => {
  const { window, document } = parseHTML(fs.readFileSync('dokuman.html', 'utf8'));
  const source = fs.readFileSync('js/dokuman-viewer.js', 'utf8').replace(/\}\)\(\);\s*$/, 'window.viewerTest = { state, savePublishedInteractions };\n})();');
  vm.runInNewContext(source, { window, document, console });
  const { state, savePublishedInteractions } = window.viewerTest;
  state.editMode = true;
  state.documentId = 'fixture';
  state.documentRow = { etkilesim_json: { homeFeedVisible: false, otherSetting: 'preserve', pages: { old: 'stale' } } };
  let saved;
  window.kemalAdminAuth = { getClient: () => ({ from: () => ({ update: payload => ({ eq: async () => { saved = payload; return { error: null }; } }) }) }) };
  await savePublishedInteractions();
  assert.equal(saved.etkilesim_json.homeFeedVisible, false);
  assert.equal(saved.etkilesim_json.otherSetting, 'preserve');
  assert.equal(Object.keys(saved.etkilesim_json.pages).length, 0);
  assert.equal(state.documentRow.etkilesim_json.homeFeedVisible, false);
});
