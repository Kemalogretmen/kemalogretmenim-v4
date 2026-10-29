const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');

const rootPath = path.join(__dirname, '..');
const themeSource = fs.readFileSync(path.join(rootPath, 'js/site-theme.js'), 'utf8');

function emit(h, target, type, properties = {}) {
  const event = new h.window.Event(type, { bubbles: true, cancelable: true });
  for (const [key, value] of Object.entries(properties)) Object.defineProperty(event, key, { value });
  target.dispatchEvent(event);
  return event;
}

function setup(t, options = {}) {
  const { window: dom, document } = parseHTML(options.html || '<!doctype html><html><head><meta name="theme-color" content="#old"><meta name="color-scheme" content="light"></head><body><main>İçerik</main></body></html>');
  const saved = new Map();
  if (options.saved != null) saved.set('kemal-theme', options.saved);
  const writes = [], events = [], timers = new Map(), mediaQueries = new Map();
  let now = 1000, nextTimer = 0, readyState = 'loading';
  let storageGetterBlocked = Boolean(options.storageGetterBlocked);
  Object.defineProperty(document, 'readyState', { configurable: true, get: () => readyState });
  const storage = {
    getItem(key) {
      if (options.readError) throw new Error('Storage read unavailable');
      return saved.get(key) ?? null;
    },
    setItem(key, value) {
      if (options.writeError) throw new Error('Storage quota unavailable');
      writes.push([key, String(value)]);
      saved.set(key, String(value));
    },
  };
  function matchMedia(query) {
    if (!mediaQueries.has(query)) {
      const listeners = new Set();
      const media = {
        media: query,
        matches: query.includes('color-scheme') ? Boolean(options.systemDark) : Boolean(options.reducedMotion),
        addListener: callback => listeners.add(callback),
        change(matches) { this.matches = matches; listeners.forEach(callback => callback({ matches, media: query })); },
        listenerCount: () => listeners.size,
      };
      if (!options.legacyMedia) media.addEventListener = (type, callback) => { if (type === 'change') listeners.add(callback); };
      mediaQueries.set(query, media);
    }
    return mediaQueries.get(query);
  }
  const window = {
    document,
    Event: dom.Event,
    CustomEvent: dom.CustomEvent,
    location: { origin: 'https://fixture.test', href: 'https://fixture.test/index.html', pathname: '/index.html', search: '', hash: '' },
    addEventListener: dom.addEventListener.bind(dom),
    dispatchEvent: dom.dispatchEvent.bind(dom),
    setTimeout(fn, delay) { const id = ++nextTimer; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  if (!options.noMatchMedia) window.matchMedia = matchMedia;
  Object.defineProperty(window, 'localStorage', {
    get() { if (storageGetterBlocked) throw new Error('Storage access denied'); return storage; },
  });
  if (options.lite) document.documentElement.classList.add('performance-lite');
  window.addEventListener('kemal:themechange', event => events.push({ theme: event.detail?.theme, preference: event.detail?.preference }));
  const context = vm.createContext({
    window, document, URL, URLSearchParams, CustomEvent: dom.CustomEvent,
    localStorage: storage, console, Date: class extends Date { static now() { return now; } },
  });
  const evaluate = () => vm.runInContext(themeSource, context, { filename: 'js/site-theme.js' });
  evaluate();
  const h = {
    window, document, storage, saved, writes, events, timers, context, evaluate,
    api: window.kemalTheme,
    system: () => matchMedia('(prefers-color-scheme: dark)'),
    reduced: () => matchMedia('(prefers-reduced-motion: reduce)'),
    advanceTime(ms) { now += ms; },
    blockStorageGetter(value) { storageGetterBlocked = value; },
    ready() {
      readyState = 'interactive';
      document.dispatchEvent(new dom.Event('DOMContentLoaded'));
    },
    fireTimer(delay) {
      const pending = Array.from(timers).find(([, value]) => value.delay === delay);
      assert.ok(pending, `Expected a pending ${delay}ms timer`);
      timers.delete(pending[0]);
      pending[1].fn();
    },
    storageEvent(key, newValue, area = storage) {
      if (key != null) { if (newValue == null) saved.delete(key); else saved.set(key, newValue); }
      else saved.clear();
      return emit(h, dom, 'storage', { key, newValue, storageArea: area });
    },
  };
  if (!options.deferReady) h.ready();
  t.after(() => timers.clear());
  return h;
}

function assertTheme(h, preference, theme) {
  assert.equal(h.api.getPreference(), preference);
  assert.equal(h.api.getResolvedTheme(), theme);
  assert.equal(h.document.documentElement.dataset.themePreference, preference);
  assert.equal(h.document.documentElement.dataset.theme, theme);
  assert.equal(h.document.documentElement.style.colorScheme, theme);
}

const switchButton = h => h.document.querySelector('[data-theme-switch]');

test('theme bootstrap resolves saved preferences before DOM readiness without writing storage', t => {
  for (const [saved, systemDark, preference, resolved] of [
    ['light', true, 'light', 'light'], ['dark', false, 'dark', 'dark'],
    ['system', true, 'system', 'dark'], ['system', false, 'system', 'light'],
    [null, true, 'light', 'light'], ['invalid', true, 'light', 'light'],
  ]) {
    const h = setup(t, { saved, systemDark, deferReady: true });
    assertTheme(h, preference, resolved);
    assert.deepEqual(h.writes, []);
    assert.deepEqual(h.events, [{ theme: resolved, preference }]);
    assert.equal(h.document.querySelectorAll('.theme-control').length, 0);
    h.ready();
    assert.equal(h.document.querySelectorAll('.theme-control').length, 1);
    assert.equal(h.document.querySelector('meta[name="color-scheme"]').content, resolved);
    assert.equal(h.document.querySelector('meta[name="theme-color"]').content, resolved === 'dark' ? '#151a27' : '#fafaf7');
  }
});

test('explicit API changes persist preferences, reject invalid values and toggle the resolved system theme', t => {
  const h = setup(t, { saved: 'system', systemDark: true });
  assert.equal(h.api.toggle(), true);
  assertTheme(h, 'light', 'light');
  assert.deepEqual(h.writes.at(-1), ['kemal-theme', 'light']);
  h.api.setPreference('dark');
  assertTheme(h, 'dark', 'dark');
  const events = h.events.length, writes = h.writes.length;
  assert.equal(h.api.setPreference('sepia'), false);
  assertTheme(h, 'dark', 'dark');
  assert.equal(h.events.length, events);
  assert.equal(h.writes.length, writes);
});

test('theme events distinguish preference changes from resolved color changes and suppress unchanged states', t => {
  const h = setup(t, { saved: 'dark', systemDark: true });
  h.events.length = 0;
  h.api.setPreference('dark');
  assert.deepEqual(h.events, []);
  h.api.setPreference('system');
  assert.deepEqual(h.events, [{ theme: 'dark', preference: 'system' }]);
  h.api.setPreference('system');
  assert.equal(h.events.length, 1);
  h.system().change(false);
  assertTheme(h, 'system', 'light');
  assert.deepEqual(h.events.at(-1), { theme: 'light', preference: 'system' });
  h.api.setPreference('dark');
  const count = h.events.length;
  h.system().change(true);
  h.system().change(false);
  assertTheme(h, 'dark', 'dark');
  assert.equal(h.events.length, count);
});

test('storage read, write and property-access errors leave the appearance API usable', t => {
  for (const options of [{ readError: true }, { writeError: true }, { storageGetterBlocked: true }]) {
    const h = setup(t, options);
    assertTheme(h, 'light', 'light');
    assert.doesNotThrow(() => h.api.setPreference('dark'));
    assertTheme(h, 'dark', 'dark');
    assert.equal(switchButton(h).getAttribute('aria-checked'), 'true');
  }
  const h = setup(t);
  h.blockStorageGetter(true);
  assert.doesNotThrow(() => h.storageEvent('kemal-theme', 'dark'));
  assertTheme(h, 'light', 'light');
});

test('cross-tab preference changes and removals synchronize without write-back loops', t => {
  const h = setup(t, { saved: 'light', systemDark: true });
  h.storageEvent('kemal-theme', 'dark');
  assertTheme(h, 'dark', 'dark');
  h.storageEvent('unrelated-key', 'light');
  h.storageEvent('kemal-theme', 'light', {});
  assertTheme(h, 'dark', 'dark');
  h.storageEvent('kemal-theme', 'system');
  assertTheme(h, 'system', 'dark');
  h.storageEvent('kemal-theme', null);
  assertTheme(h, 'light', 'light');
  h.storageEvent('kemal-theme', 'dark');
  h.storageEvent(null, null);
  assertTheme(h, 'light', 'light');
  assert.deepEqual(h.writes, []);
});

test('legacy or missing matchMedia support degrades without breaking manual theme selection', t => {
  const legacy = setup(t, { saved: 'system', systemDark: true, legacyMedia: true });
  legacy.system().change(false);
  assertTheme(legacy, 'system', 'light');
  const unavailable = setup(t, { saved: 'system', noMatchMedia: true });
  assertTheme(unavailable, 'system', 'light');
  unavailable.api.setPreference('dark');
  assertTheme(unavailable, 'dark', 'dark');
});

test('reloading the bootstrap does not duplicate controls, listeners or change events', t => {
  const h = setup(t);
  const api = h.api;
  h.evaluate();
  h.api.mountControls();
  assert.ok(h.window.kemalTheme === api);
  assert.equal(h.system().listenerCount(), 1);
  assert.equal(h.document.querySelectorAll('.theme-control').length, 1);
  assert.equal(h.events.length, 1);
  switchButton(h).click();
  assertTheme(h, 'dark', 'dark');
  assert.equal(h.events.length, 2);
});

test('controls migrate from the standalone fallback into rebuilt navigation slots without duplicates', t => {
  const h = setup(t, { saved: 'dark' });
  assert.equal(h.document.querySelectorAll('.theme-control-fallback').length, 1);
  const host = h.document.createElement('header');
  host.innerHTML = '<div data-theme-control-slot></div><div data-theme-control-slot></div>';
  h.document.body.appendChild(host);
  h.api.mountControls();
  h.api.mountControls();
  assert.equal(h.document.querySelectorAll('.theme-control-fallback').length, 0);
  assert.equal(h.document.querySelectorAll('.theme-control').length, 2);
  host.innerHTML = '<div data-theme-control-slot></div>';
  h.api.mountControls();
  assert.equal(h.document.querySelectorAll('.theme-control').length, 1);
  assert.equal(switchButton(h).getAttribute('aria-checked'), 'true');
  assert.equal(h.document.querySelector('[data-theme-status]').textContent, 'Koyu tema etkin.');
});

test('a hidden navigation slot retains a visible fallback and migrates controls as screens change', t => {
  const h = setup(t, {
    saved: 'dark', deferReady: true,
    html: '<html><head></head><body><main><div data-theme-control-slot></div></main></body></html>',
  });
  const slot = h.document.querySelector('[data-theme-control-slot]');
  let slotVisible = false;
  slot.getClientRects = () => slotVisible ? [{ width: 92, height: 44 }] : [];
  h.ready();
  assert.equal(slot.querySelectorAll('.theme-control').length, 0);
  assert.equal(h.document.querySelectorAll('.theme-control-fallback').length, 1);
  slotVisible = true;
  h.api.mountControls();
  assert.equal(h.document.querySelectorAll('.theme-control-fallback').length, 0);
  assert.equal(slot.querySelectorAll('.theme-control').length, 1);
  const inline = slot.querySelector('.theme-control');
  // Native getClientRects also reflects hidden ancestors; emulate that here.
  inline.getClientRects = () => slot.getClientRects();
  assert.equal(inline.querySelector('[data-theme-switch]').getAttribute('aria-checked'), 'true');
  slotVisible = false;
  h.api.mountControls();
  h.api.mountControls();
  assert.equal(h.document.querySelectorAll('.theme-control-fallback').length, 1);
  assert.equal(inline.getClientRects().length, 0);
  const fallback = h.document.querySelector('.theme-control-fallback');
  assert.equal(fallback.querySelector('[data-theme-switch]').getAttribute('aria-checked'), 'true');
  slotVisible = true;
  h.api.mountControls();
  assert.equal(h.document.querySelectorAll('.theme-control-fallback').length, 0);
  assert.equal(slot.querySelectorAll('.theme-control').length, 1);
});

test('delegated clicks keep accessible switch and system-preference state synchronized', t => {
  const h = setup(t, { systemDark: true });
  const button = switchButton(h);
  assert.equal(button.getAttribute('role'), 'switch');
  assert.ok(button.getAttribute('aria-label'));
  assert.equal(button.getAttribute('aria-checked'), 'false');
  emit(h, button.querySelector('svg'), 'click');
  assertTheme(h, 'dark', 'dark');
  assert.equal(button.getAttribute('aria-checked'), 'true');
  assert.equal(button.title, 'Açık temaya geç');
  const system = h.document.querySelector('[data-theme-system]');
  system.click();
  assertTheme(h, 'system', 'dark');
  assert.equal(system.getAttribute('aria-pressed'), 'true');
  system.click();
  assertTheme(h, 'dark', 'dark');
  assert.equal(system.getAttribute('aria-pressed'), 'false');
});

test('keyboard arrows and Home/End choose explicit themes and prevent native page scrolling', t => {
  const h = setup(t, { saved: 'system', systemDark: true });
  for (const [key, theme] of [['ArrowLeft', 'light'], ['End', 'dark'], ['Home', 'light'], ['ArrowRight', 'dark']]) {
    const event = emit(h, switchButton(h), 'keydown', { key });
    assert.equal(event.defaultPrevented, true);
    assertTheme(h, theme, theme);
  }
});

function pointer(h, type, x, pointerId = 1, extra = {}) {
  return emit(h, switchButton(h), type, { clientX: x, pointerId, button: 0, isPrimary: true, ...extra });
}

test('small pointer movement remains a click while a completed drag commits once and suppresses its click', t => {
  const h = setup(t);
  pointer(h, 'pointerdown', 100);
  pointer(h, 'pointermove', 105);
  pointer(h, 'pointerup', 105);
  assertTheme(h, 'light', 'light');
  switchButton(h).click();
  assertTheme(h, 'dark', 'dark');
  pointer(h, 'pointerdown', 128);
  pointer(h, 'pointermove', 100);
  assert.ok(switchButton(h).classList.contains('is-dragging'));
  assert.equal(switchButton(h).style.getPropertyValue('--theme-drag'), '0px');
  const before = h.events.length;
  pointer(h, 'pointerup', 100);
  assertTheme(h, 'light', 'light');
  assert.equal(h.events.length, before + 1);
  assert.ok(!switchButton(h).classList.contains('is-dragging'));
  assert.equal(switchButton(h).style.getPropertyValue('--theme-drag'), '');
  const click = emit(h, switchButton(h), 'click');
  assert.equal(click.defaultPrevented, true);
  assertTheme(h, 'light', 'light');
  assert.equal(h.events.length, before + 1);
  h.advanceTime(351);
  switchButton(h).click();
  assertTheme(h, 'dark', 'dark');
});

test('drag midpoint, cancellation and unrelated pointers preserve the intended theme', t => {
  const h = setup(t);
  pointer(h, 'pointerdown', 100);
  pointer(h, 'pointermove', 114);
  pointer(h, 'pointerup', 114);
  assertTheme(h, 'light', 'light');
  pointer(h, 'pointerdown', 100);
  pointer(h, 'pointermove', 115);
  pointer(h, 'pointerup', 115);
  assertTheme(h, 'dark', 'dark');
  const count = h.events.length;
  pointer(h, 'pointerdown', 128);
  pointer(h, 'pointermove', 100, 2);
  pointer(h, 'pointerup', 100, 2);
  assertTheme(h, 'dark', 'dark');
  pointer(h, 'pointermove', 100);
  pointer(h, 'pointercancel', 100);
  switchButton(h).click();
  assertTheme(h, 'dark', 'dark');
  assert.equal(h.events.length, count);
  assert.ok(!switchButton(h).classList.contains('is-dragging'));
});

test('reduced-motion and lightweight-rendering preferences suppress theme-transition animation', t => {
  for (const options of [{ reducedMotion: true }, { lite: true }]) {
    const h = setup(t, options);
    h.api.setPreference('dark');
    assertTheme(h, 'dark', 'dark');
    assert.ok(!h.document.documentElement.classList.contains('theme-changing'));
    assert.equal(h.timers.size, 0);
  }
  const normal = setup(t);
  normal.api.setPreference('dark');
  assert.ok(normal.document.documentElement.classList.contains('theme-changing'));
  normal.fireTimer(420);
  assert.ok(!normal.document.documentElement.classList.contains('theme-changing'));
});

test('shared SEO and chrome hydration retain the dark appearance and remount one navigation control', t => {
  const h = setup(t, { saved: 'dark' });
  const source = fs.readFileSync(path.join(rootPath, 'js/site.js'), 'utf8');
  const bootstrap = source.indexOf('  const seoState = initSeo();');
  assert.ok(bootstrap > 0);
  vm.runInContext(source.slice(0, bootstrap) + 'window.themeBridgeTest = { updateSeo, renderChrome };\n})();', h.context);
  h.window.themeBridgeTest.updateSeo({ title: 'Tema testi' });
  assert.equal(h.document.querySelector('meta[name="color-scheme"]').content, 'dark');
  assert.equal(h.document.querySelector('meta[name="theme-color"]').content, '#151a27');
  for (let pass = 0; pass < 2; pass++) h.window.themeBridgeTest.renderChrome({});
  assert.equal(h.document.querySelectorAll('.theme-control').length, 1);
  assert.equal(h.document.querySelectorAll('.theme-control-fallback').length, 0);
  assert.equal(h.document.querySelector('[data-theme-control-slot] [data-theme-switch]').getAttribute('aria-checked'), 'true');
  assertTheme(h, 'dark', 'dark');
});

function loadExamThemeBridge(h, legacyTheme) {
  const source = fs.readFileSync(path.join(rootPath, 'sinav_sitesi/sinav.html'), 'utf8');
  const start = source.indexOf('function applyTheme(theme){');
  const end = source.indexOf('window.clearCurrentDrawing=function(){', start);
  assert.ok(start > 0 && end > start, 'Expected the exam appearance bridge in the real inline script');
  h.saved.set('kemal_exam_theme_v1', legacyTheme);
  let legacyReads = 0;
  const getItem = h.storage.getItem;
  h.storage.getItem = key => {
    if (key === 'kemal_exam_theme_v1') legacyReads++;
    return getItem(key);
  };
  vm.runInContext("const EXAM_THEME_STORAGE_KEY='kemal_exam_theme_v1';\n" + source.slice(start, end) +
    '\nwindow.examThemeBridgeTest={syncExamTheme,applyTheme};', h.context, { filename: 'sinav_sitesi/sinav.html#theme-bridge' });
  return { getLegacyReads: () => legacyReads, api: h.window.examThemeBridgeTest };
}

test('exam appearance prioritizes the shared theme over its legacy setting and delegates toggles without legacy writes', t => {
  const h = setup(t, { saved: 'dark' });
  const exam = loadExamThemeBridge(h, 'light');
  exam.api.syncExamTheme();
  assert.ok(h.document.body.classList.contains('theme-dark'));
  assertTheme(h, 'dark', 'dark');
  let toggles = 0;
  const sharedToggle = h.api.toggle;
  h.api.toggle = () => { toggles++; return sharedToggle(); };
  h.window.toggleTheme();
  assert.equal(toggles, 1);
  assertTheme(h, 'light', 'light');
  assert.ok(!h.document.body.classList.contains('theme-dark'));
  assert.equal(exam.getLegacyReads(), 0);
  assert.equal(h.saved.get('kemal_exam_theme_v1'), 'light');
  assert.deepEqual(h.writes, [['kemal-theme', 'light']]);
});

test('exam theme events synchronize its dark class and recover missing event details from the shared API', t => {
  const h = setup(t, { saved: 'light' });
  const exam = loadExamThemeBridge(h, 'dark');
  exam.api.syncExamTheme();
  assert.ok(!h.document.body.classList.contains('theme-dark'));
  h.api.setPreference('dark');
  assert.ok(h.document.body.classList.contains('theme-dark'));
  h.window.dispatchEvent(new h.window.CustomEvent('kemal:themechange', { detail: { theme: 'light' } }));
  assert.ok(!h.document.body.classList.contains('theme-dark'));
  h.window.dispatchEvent(new h.window.CustomEvent('kemal:themechange'));
  assert.ok(h.document.body.classList.contains('theme-dark'));
  h.window.dispatchEvent(new h.window.CustomEvent('kemal:themechange', { detail: { theme: 'invalid' } }));
  assert.ok(h.document.body.classList.contains('theme-dark'));
  h.api.setPreference('light');
  assert.ok(!h.document.body.classList.contains('theme-dark'));
  assert.equal(exam.getLegacyReads(), 0);
  assert.equal(h.saved.get('kemal_exam_theme_v1'), 'dark');
  assert.ok(h.writes.every(([key]) => key === 'kemal-theme'));
});

function runtimeHtmlPaths(directory = rootPath) {
  const excluded = new Set(['node_modules', 'mobile-app', 'aquarium-app', 'tmp', 'docs', 'netlify']);
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith('.') || excluded.has(entry.name)) return [];
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return runtimeHtmlPaths(absolute);
    return entry.isFile() && entry.name.endsWith('.html') ? [absolute] : [];
  });
}

test('every runtime web page loads the synchronous theme bootstrap before styles and both shared theme stylesheets', t => {
  const pages = runtimeHtmlPaths();
  assert.ok(pages.length >= 103, 'Runtime inventory includes public pages, readers, tools and administration');
  assert.ok(pages.some(file => file.endsWith('/tools/akvaryum-dekor-onizleme.html')));
  const failures = [];
  for (const file of pages) {
    const relative = path.relative(rootPath, file);
    let markup = fs.readFileSync(file, 'utf8');
    // HTML permits the outer html tag to be omitted; native browsers insert it.
    // linkedom needs that wrapper to expose head for the standalone model tool.
    if (!/<html(?:\s|>)/i.test(markup)) markup = '<html>' + markup.replace(/<!doctype[^>]*>/i, '') + '</html>';
    const { document } = parseHTML(markup);
    const head = document.head;
    const bootstraps = head?.querySelectorAll('script[data-site-theme-bootstrap]') || [];
    if (bootstraps.length !== 1) { failures.push(`${relative}: expected one theme bootstrap in head`); continue; }
    const bootstrap = bootstraps[0];
    if (bootstrap.hasAttribute('async') || bootstrap.hasAttribute('defer')) failures.push(`${relative}: theme bootstrap must be synchronous`);
    if (new URL(bootstrap.getAttribute('src'), 'https://fixture.test').pathname !== '/js/site-theme.js') failures.push(`${relative}: incorrect bootstrap source`);
    const ordered = Array.from(head.querySelectorAll('script[data-site-theme-bootstrap],style,link[rel="stylesheet"]'));
    if (ordered[0] !== bootstrap) failures.push(`${relative}: bootstrap follows page styles`);
    const sheets = Array.from(head.querySelectorAll('link[rel="stylesheet"]'), node => new URL(node.getAttribute('href'), 'https://fixture.test').pathname);
    for (const required of ['/css/site-theme.css', '/css/theme-control.css']) {
      if (sheets.filter(sheet => sheet === required).length !== 1) failures.push(`${relative}: expected one ${required}`);
    }
  }
  assert.deepEqual(failures, []);
  t.diagnostic(`Verified theme bootstrap and shared styles in ${pages.length} runtime HTML pages.`);
});
