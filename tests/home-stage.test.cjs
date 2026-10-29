const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { setImmediate: nodeSetImmediate } = require('node:timers');
const { parseHTML } = require('linkedom');

const sourcePath = path.join(__dirname, '../js/home-stage.js');
const tick = () => new Promise(resolve => nodeSetImmediate(resolve));

const markup = `<!doctype html><html><head></head><body>
<section id="homeShowcasePanel" aria-label="Ana sayfa vitrini">
  <div id="homeShowcaseStage"></div>
  <div id="homeShowcaseDots"></div>
  <span id="homeShowcaseCount"></span>
  <p id="homeShowcaseStatus" role="status" aria-live="polite"></p>
  <button id="homeShowcasePause" type="button">Duraklat</button>
  <button id="homeShowcasePrev" type="button">Önceki</button>
  <button id="homeShowcaseNext" type="button">Sonraki</button>
</section></body></html>`;

async function setup(t, options = {}) {
  const { window, document } = parseHTML(markup);
  const timers = new Map();
  const fetchCalls = [];
  let timerId = 0;
  let hidden = Boolean(options.hidden);
  let reduced = Boolean(options.reducedMotion);
  const mediaListeners = new Set();
  Object.defineProperty(document, 'readyState', { configurable: true, value: options.documentReadyState || 'complete' });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => hidden ? 'hidden' : 'visible' });
  const focusCalls = [];
  if (options.trackFocus) {
    // linkedom dispatches focus events but does not maintain activeElement.
    let focusedElement = document.body;
    Object.defineProperty(document, 'activeElement', { configurable: true, get: () => focusedElement });
    const prototype = window.HTMLElement.prototype;
    const originalFocus = Object.getOwnPropertyDescriptor(prototype, 'focus');
    Object.defineProperty(prototype, 'focus', {
      configurable: true,
      value(focusOptions) {
        const previous = focusedElement;
        focusedElement = this;
        focusCalls.push({ element: this, options: focusOptions });
        if (previous !== this) {
          const out = new window.Event('focusout', { bubbles: true });
          Object.defineProperty(out, 'relatedTarget', { value: this });
          previous.dispatchEvent(out);
          this.dispatchEvent(new window.Event('focusin', { bubbles: true }));
        }
      },
    });
    t.after(() => {
      if (originalFocus) Object.defineProperty(prototype, 'focus', originalFocus);
      else delete prototype.focus;
    });
  }
  // Browsers serialize a template's current content. linkedom keeps its initial
  // innerHTML string after mutations to template.content, so emulate the native
  // getter before exercising the production HTML sanitizer.
  const createElement = document.createElement.bind(document);
  document.createElement = function(tagName, ...args) {
    const element = createElement(tagName, ...args);
    if (String(tagName).toLowerCase() === 'template') {
      let prototype = element;
      let descriptor;
      while (prototype && !descriptor) {
        descriptor = Object.getOwnPropertyDescriptor(prototype, 'innerHTML');
        prototype = Object.getPrototypeOf(prototype);
      }
      Object.defineProperty(element, 'innerHTML', {
        configurable: true,
        get() {
          return Array.from(this.content.childNodes).map(node => node.outerHTML ??
            String(node.data || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('');
        },
        set(value) { descriptor.set.call(this, value); },
      });
    }
    return element;
  };
  window.location = { origin: 'https://fixture.test', href: 'https://fixture.test/index.html' };
  window.matchMedia = () => ({
    get matches() { return reduced; },
    addEventListener(type, fn) { if (type === 'change') mediaListeners.add(fn); },
    removeEventListener(type, fn) { mediaListeners.delete(fn); },
    addListener(fn) { mediaListeners.add(fn); },
    removeListener(fn) { mediaListeners.delete(fn); },
  });
  window.kemalSite = { ready: Promise.resolve() };
  window.kemalSiteStore = {
    getDocumentsConfig: () => options.cms ? {
      supabaseUrl: 'https://cms.fixture.test', supabaseAnonKey: 'public-fixture-key',
    } : null,
  };
  const schedule = (fn, delay) => {
    const id = ++timerId;
    timers.set(id, { fn, delay: Number(delay) || 0 });
    return id;
  };
  const unschedule = id => timers.delete(id);
  const fetch = async (url, init) => {
    fetchCalls.push({ url: String(url), init });
    if (options.fetchResult) return options.fetchResult;
    if (options.fetchError) throw new Error('fixture network unavailable');
    return { ok: true, json: async () => options.rows || [] };
  };
  window.setTimeout = schedule;
  window.clearTimeout = unschedule;
  window.fetch = fetch;
  t.after(() => timers.clear());
  vm.runInNewContext(fs.readFileSync(sourcePath, 'utf8'), {
    window, document, console, URL, URLSearchParams,
    fetch, setTimeout: schedule, clearTimeout: unschedule,
    AbortController, CustomEvent: window.CustomEvent,
  }, { filename: sourcePath });
  if (!options.deferDOMContentLoaded) document.dispatchEvent(new window.Event('DOMContentLoaded'));
  for (let i = 0; i < 6; i++) await tick();
  return {
    window, document, fetchCalls, focusCalls,
    autoplayTimers: () => Array.from(timers.values()).filter(entry => entry.delay >= 3000 && entry.delay <= 12000),
    fireAutoplay() {
      const entry = Array.from(timers).find(([, timer]) => timer.delay >= 3000 && timer.delay <= 12000);
      assert.ok(entry, 'Expected an autoplay timer');
      timers.delete(entry[0]);
      entry[1].fn();
    },
    setHidden(value) {
      hidden = value;
      document.dispatchEvent(new window.Event('visibilitychange'));
    },
    setReducedMotion(value) {
      reduced = value;
      mediaListeners.forEach(fn => fn({ matches: value }));
    },
  };
}

const slides = h => Array.from(h.document.querySelectorAll('.home-showcase-slide'));
const activeSlide = h => {
  const active = slides(h).filter(slide => !slide.hasAttribute('hidden'));
  assert.equal(active.length, 1, 'Exactly one showcase slide is visible');
  return active[0];
};
const click = (h, selector) => {
  const node = h.document.querySelector(selector);
  assert.ok(node, `Expected control ${selector}`);
  node.click();
  return node;
};
const event = (h, type, target = h.document.getElementById('homeShowcasePanel'), detail) => {
  const e = new h.window.Event(type, { bubbles: true });
  if (detail) Object.assign(e, detail);
  target.dispatchEvent(e);
};

test('showcase fallback navigation wraps and removes inactive slides from the accessibility tree', async t => {
  const h = await setup(t);
  assert.equal(slides(h).length, 3);
  const first = activeSlide(h);
  click(h, '#homeShowcasePrev');
  assert.equal(activeSlide(h), slides(h).at(-1));
  click(h, '#homeShowcaseNext');
  assert.equal(activeSlide(h), first);
  click(h, '[data-vitrin-index="1"]');
  assert.equal(activeSlide(h), slides(h)[1]);
  for (const slide of slides(h)) {
    const selected = slide === activeSlide(h);
    assert.equal(slide.getAttribute('aria-hidden'), String(!selected));
    assert.equal(slide.hasAttribute('inert'), !selected);
    assert.equal(slide.hasAttribute('hidden'), !selected);
  }
  assert.match(h.document.getElementById('homeShowcaseCount').textContent, /2\s*\/\s*3/);
});

test('showcase initialises after DOMContentLoaded when its deferred script runs before the document is ready', async t => {
  const h = await setup(t, { documentReadyState: 'loading', deferDOMContentLoaded: true });
  assert.equal(slides(h).length, 0);
  h.document.dispatchEvent(new h.window.Event('DOMContentLoaded'));
  for (let i = 0; i < 3; i++) await tick();
  assert.equal(slides(h).length, 3);
  assert.ok(activeSlide(h));
});

test('showcase autoplay advances and wraps without changing the number of slides', async t => {
  const h = await setup(t);
  const first = activeSlide(h);
  assert.equal(h.autoplayTimers().length, 1);
  h.fireAutoplay();
  assert.notEqual(activeSlide(h), first);
  h.fireAutoplay();
  h.fireAutoplay();
  assert.equal(activeSlide(h), first);
  assert.equal(slides(h).length, 3);
});

test('manual pause survives mouse and keyboard interaction pauses', async t => {
  const h = await setup(t);
  click(h, '#homeShowcasePause');
  assert.equal(h.autoplayTimers().length, 0);
  event(h, 'mouseenter');
  event(h, 'mouseleave');
  event(h, 'focusin');
  event(h, 'focusout', undefined, { relatedTarget: h.document.body });
  assert.equal(h.autoplayTimers().length, 0, 'Interaction ending must not undo an explicit pause');
  click(h, '#homeShowcasePause');
  assert.equal(h.autoplayTimers().length, 1);
  event(h, 'mouseenter');
  assert.equal(h.autoplayTimers().length, 0);
  event(h, 'mouseleave');
  assert.equal(h.autoplayTimers().length, 1);
});

test('hidden documents and reduced-motion preference suppress automatic slide changes', async t => {
  const h = await setup(t, { hidden: true });
  assert.equal(h.autoplayTimers().length, 0);
  h.setHidden(false);
  assert.equal(h.autoplayTimers().length, 1);
  h.setHidden(true);
  assert.equal(h.autoplayTimers().length, 0);
  const reduced = await setup(t, { reducedMotion: true });
  assert.equal(reduced.autoplayTimers().length, 0);
  const before = activeSlide(reduced);
  click(reduced, '#homeShowcaseNext');
  assert.notEqual(activeSlide(reduced), before, 'Manual navigation remains available');
  assert.equal(reduced.autoplayTimers().length, 0);
});

test('showcase reads the published CMS collection and preserves article, document and image-fit behavior', async t => {
  const h = await setup(t, { cms: true, rows: [
    { id: 'article 1', baslik: 'Yayınlanmış makale', icerik_turu: 'text', aciklama_html: '<p>Makale özeti</p>', makale_html: '<p>Uzun yazı</p>', aktif: true },
    { id: 'document 1', baslik: 'Çalışma belgesi', icerik_turu: 'document', dokuman_id: 'doc 42', aktif: true },
    { id: 'image 1', baslik: 'Görselli etkinlik', icerik_turu: 'image', media_url: '/assets/vitrin-gecici/02-dokumanlar.jpg', media_fit: 'contain', link_url: '/sinif-kaynaklari.html', aktif: true },
  ] });
  assert.equal(h.fetchCalls.length, 1);
  const request = h.fetchCalls[0];
  const url = new URL(request.url);
  assert.equal(url.pathname, '/rest/v1/homepage_slides');
  assert.equal(url.searchParams.get('aktif'), 'eq.true');
  const fields = (url.searchParams.get('select') || '').split(',');
  for (const field of ['id', 'baslik', 'aciklama_html', 'makale_html', 'icerik_turu', 'media_url', 'media_path', 'media_fit', 'youtube_embed_url', 'youtube_video_id', 'dokuman_id', 'link_url', 'gecis_suresi_ms']) {
    assert.ok(fields.includes(field), `CMS select should include ${field}`);
  }
  assert.equal(request.init.headers.apikey, 'public-fixture-key');
  assert.equal(request.init.headers.Authorization, 'Bearer public-fixture-key');
  assert.ok(slides(h).length >= 3);
  const article = slides(h).find(slide => slide.textContent.includes('Yayınlanmış makale'));
  assert.ok(Array.from(article.querySelectorAll('a[href]')).some(link => {
    const target = new URL(link.getAttribute('href'), h.window.location.origin);
    return target.pathname === '/makale.html' && target.searchParams.get('id') === 'article 1';
  }));
  const documentSlide = slides(h).find(slide => slide.textContent.includes('Çalışma belgesi'));
  assert.ok(documentSlide.querySelector('a[href*="doc%2042"]'), 'Document-only CMS slides should resolve their document link');
  const imageSlide = slides(h).find(slide => slide.textContent.includes('Görselli etkinlik'));
  const img = imageSlide.querySelector('img');
  assert.ok(img);
  assert.ok(img.closest('.home-showcase-media').classList.contains('is-contain'));
});

test('CMS descriptions preserve safe text while removing executable markup and unsafe URLs', async t => {
  const h = await setup(t, { cms: true, rows: [{
    id: 'unsafe', baslik: 'Güvenli açıklama', icerik_turu: 'image', aktif: true,
    aciklama_html: '<p>Açıklama <strong>vurgusu</strong><script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)" onclick="alert(1)">Bağlantı</a></p>',
    link_url: 'javascript:alert(1)', media_url: 'javascript:alert(1)',
  }] });
  const slide = slides(h).find(entry => entry.textContent.includes('Güvenli açıklama'));
  assert.ok(slide);
  assert.match(slide.textContent, /Açıklama/);
  assert.match(slide.textContent, /vurgusu/);
  assert.ok(!slide.querySelector('script, iframe, [onclick], [onerror]'));
  for (const node of slide.querySelectorAll('[href], [src]')) {
    assert.doesNotMatch(node.getAttribute('href') || node.getAttribute('src'), /^\s*(javascript|data):/i);
  }
});

test('late CMS data does not jump away from a slide the visitor selected', async t => {
  let resolveFetch;
  const fetchResult = new Promise(resolve => { resolveFetch = resolve; });
  const h = await setup(t, { cms: true, fetchResult });
  click(h, '#homeShowcaseNext');
  const selectedText = activeSlide(h).textContent;
  resolveFetch({ ok: true, json: async () => [{ id: 'new-cms', baslik: 'Sonradan gelen içerik', icerik_turu: 'text', aktif: true }] });
  for (let i = 0; i < 6; i++) await tick();
  assert.ok(slides(h).some(slide => slide.textContent.includes('Sonradan gelen içerik')));
  assert.equal(activeSlide(h).textContent, selectedText);
});

test('late CMS deduplication preserves the selected destination and keyboard focus without scrolling', async t => {
  let resolveFetch;
  const fetchResult = new Promise(resolve => { resolveFetch = resolve; });
  const h = await setup(t, { cms: true, fetchResult, trackFocus: true });
  click(h, '#homeShowcaseNext');
  const oldLink = activeSlide(h).querySelector('.home-showcase-cta');
  const selectedHref = oldLink.getAttribute('href');
  oldLink.focus();
  assert.ok(h.document.activeElement === oldLink);
  resolveFetch({ ok: true, json: async () => [
    { id: 'another-published-slide', baslik: 'Farklı bir yayın', icerik_turu: 'text', link_url: '/yeni.html', aktif: true },
    { id: 'published-resource-replacement', baslik: 'Güncellenen ders kaynakları', icerik_turu: 'text', link_url: selectedHref, aktif: true },
  ] });
  for (let i = 0; i < 6; i++) await tick();
  assert.match(activeSlide(h).textContent, /Güncellenen ders kaynakları/);
  assert.equal(slides(h).filter(slide => Array.from(slide.querySelectorAll('a[href]'))
    .some(link => link.getAttribute('href') === selectedHref)).length, 1, 'The matching editorial fallback is deduplicated');
  const focused = h.document.activeElement;
  assert.ok(focused !== oldLink && focused.isConnected, 'Focus moves to the replacement DOM element');
  assert.ok(activeSlide(h).contains(focused), 'The focused replacement remains inside the selected slide');
  assert.equal(focused.getAttribute('href'), selectedHref);
  assert.equal(h.focusCalls.at(-1).options.preventScroll, true);
});

test('YouTube showcase does not create or load a player before an explicit play action', async t => {
  const h = await setup(t, { cms: true, rows: [{
    id: 'video', baslik: 'Örnek video', icerik_turu: 'youtube', aktif: true,
    youtube_embed_url: 'https://www.youtube.com/embed/abcDEF12345', youtube_video_id: 'abcDEF12345',
  }] });
  const videoSlide = slides(h).find(slide => slide.textContent.includes('Örnek video'));
  assert.ok(videoSlide);
  assert.ok(!videoSlide.querySelector('iframe[src]'));
  const play = videoSlide.querySelector('[data-video-id]');
  assert.ok(play, 'Video playback requires an explicit user control');
  play.click();
  const iframe = videoSlide.querySelector('iframe[src]');
  assert.ok(iframe);
  const src = new URL(iframe.getAttribute('src'));
  assert.ok(['www.youtube.com', 'www.youtube-nocookie.com'].includes(src.hostname));
  click(h, '#homeShowcaseNext');
  assert.ok(!videoSlide.querySelector('iframe[src]'), 'Leaving a video slide stops its embedded player');
});

const auditedCovers = [
  ['087d09d2-b8e7-4a85-ae0c-601c4ff9f497', 'homepage-vitrin/087d09d2-b8e7-4a85-ae0c-601c4ff9f497/1787408247664-1-sinif-yaz-tatil-yeni-testleri-yayinda.webp', 'summer-practice.svg'],
  ['6315ce4c-50d9-4e83-b103-3fbebd3c2c9b', 'homepage-vitrin/6315ce4c-50d9-4e83-b103-3fbebd3c2c9b/1786468452102-egitim-sevgi-ile-baslar.webp', 'learning.svg'],
  ['ea6f2486-4834-491a-9bb4-2bfc4d9c3202', 'homepage-vitrin/ea6f2486-4834-491a-9bb4-2bfc4d9c3202/1786351824664-6-sinif-sayisal-1-tema-tekrar-denemesi-1.webp', 'math-practice-a.svg'],
  ['377ec1fd-dc21-441d-8e0b-128c768998dd', 'homepage-vitrin/377ec1fd-dc21-441d-8e0b-128c768998dd/1786323553958-6-sinif-sayisal-1-tema-tekrar-denemesi-1.webp', 'math-practice-b.svg'],
];

test('all three editorial fallback covers use existing lightweight local SVG illustrations', async t => {
  const h = await setup(t);
  const paths = slides(h).map(slide => {
    const media = slide.querySelector('.home-showcase-media');
    assert.ok(media.classList.contains('is-editorial'));
    assert.ok(media.classList.contains('is-contain'));
    const src = new URL(media.querySelector('img').getAttribute('src'));
    assert.equal(src.origin, h.window.location.origin);
    assert.match(src.pathname, /^\/assets\/vitrin-sade\/[^/]+\.svg$/);
    assert.ok(fs.existsSync(path.join(__dirname, '..', src.pathname)));
    return src.pathname;
  });
  assert.deepEqual(paths.sort(), [
    '/assets/vitrin-sade/aquarium.svg', '/assets/vitrin-sade/reading.svg', '/assets/vitrin-sade/resources.svg',
  ]);
});

test('the four audited CMS cover revisions only change presentation and never mutate CMS records', async t => {
  const rows = Object.freeze(auditedCovers.map(([id, media_path], index) => Object.freeze({
    id, media_path, media_fit: 'cover', baslik: `Denetlenen kapak ${index}`,
    icerik_turu: 'image', link_url: `/dokuman.html?id=cover-${index}`,
    aciklama_html: `<p>Yayın açıklaması ${index}</p>`, aktif: true,
  })));
  const originalRows = JSON.parse(JSON.stringify(rows));
  const h = await setup(t, { cms: true, rows });
  auditedCovers.forEach(([, , expectedCover], index) => {
    const slide = slides(h).find(entry => entry.textContent.includes(`Denetlenen kapak ${index}`));
    assert.ok(slide);
    const media = slide.querySelector('.home-showcase-media');
    const image = new URL(media.querySelector('img').getAttribute('src'));
    assert.equal(image.origin, h.window.location.origin);
    assert.equal(image.pathname, `/assets/vitrin-sade/${expectedCover}`);
    assert.ok(media.classList.contains('is-contain'));
    assert.ok(media.classList.contains('is-editorial'));
    assert.match(slide.textContent, new RegExp(`Yayın açıklaması ${index}`));
    assert.equal(new URL(slide.querySelector('.home-showcase-cta').getAttribute('href')).searchParams.get('id'), `cover-${index}`);
  });
  assert.deepEqual(rows, originalRows);
});

test('the Republic showcase keeps its exact original image URL and crop mode', async t => {
  const originalUrl = 'https://cms.fixture.test/storage/v1/object/public/dokumanlar/homepage-vitrin/cumhuriyet-original.webp?v=1';
  const h = await setup(t, { cms: true, rows: [Object.freeze({
    id: '0b98c047-4fd5-47fe-ad17-fb4a3eb00aff', baslik: 'Cumhuriyet Bayramımız kutlu olsun',
    icerik_turu: 'image', media_url: originalUrl, media_fit: 'cover', aktif: true,
  })] });
  const slide = slides(h).find(entry => entry.textContent.includes('Cumhuriyet Bayramımız'));
  assert.ok(slide);
  const media = slide.querySelector('.home-showcase-media');
  assert.equal(media.querySelector('img').getAttribute('src'), originalUrl);
  assert.ok(media.classList.contains('is-cover'));
  assert.ok(!media.classList.contains('is-editorial'));
});

test('later administrator uploads and new CMS slides retain their own covers instead of editorial overrides', async t => {
  const [knownId, oldPath] = auditedCovers[0];
  const cases = [
    { id: knownId, media_path: oldPath, media_url: 'https://cdn.fixture.test/admin/new-custom-cover.webp', expected: 'https://cdn.fixture.test/admin/new-custom-cover.webp' },
    { id: knownId, media_path: 'homepage-vitrin/new-admin-upload.webp', expected: 'https://cms.fixture.test/storage/v1/object/public/dokumanlar/homepage-vitrin/new-admin-upload.webp' },
    { id: 'new-future-slide', media_path: oldPath, expected: `https://cms.fixture.test/storage/v1/object/public/dokumanlar/${oldPath}` },
  ];
  for (const fixture of cases) {
    const row = Object.freeze({ ...fixture, baslik: 'Yönetici kapağı', icerik_turu: 'image', media_fit: 'cover', aktif: true });
    const original = JSON.stringify(row);
    const h = await setup(t, { cms: true, rows: [row] });
    const slide = slides(h).find(entry => entry.textContent.includes('Yönetici kapağı'));
    const media = slide.querySelector('.home-showcase-media');
    assert.equal(media.querySelector('img').getAttribute('src'), fixture.expected);
    assert.ok(media.classList.contains('is-cover'));
    assert.ok(!media.classList.contains('is-editorial'));
    assert.equal(JSON.stringify(row), original);
  }
});

test('an audited slide changed into a YouTube video still uses the user-controlled video poster', async t => {
  const [id, media_path] = auditedCovers[0];
  const h = await setup(t, { cms: true, rows: [Object.freeze({
    id, media_path, baslik: 'Video yayını', icerik_turu: 'youtube',
    youtube_video_id: 'abcDEF12345', media_fit: 'contain', aktif: true,
  })] });
  const slide = slides(h).find(entry => entry.textContent.includes('Video yayını'));
  const media = slide.querySelector('.home-showcase-media');
  assert.ok(!media.classList.contains('is-editorial'));
  assert.equal(media.querySelector('[data-video-id]').getAttribute('data-video-id'), 'abcDEF12345');
  assert.equal(media.querySelector('img').getAttribute('src'), 'https://i.ytimg.com/vi/abcDEF12345/hqdefault.jpg');
  assert.ok(!media.querySelector('iframe'));
});
