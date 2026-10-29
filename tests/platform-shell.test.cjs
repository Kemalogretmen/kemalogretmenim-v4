const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');

// Exercise the real shell functions without starting analytics or remote hydration.
function setup({ home = true, saved = null, items = [], width = 1440 } = {}) {
  const { window, document } = parseHTML('<html><head></head><body><main id="content"></main></body></html>');
  const writes = [];
  window.location = { pathname: '/', search: '', hash: '', href: 'https://kemalogretmenim.com.tr/', origin: 'https://kemalogretmenim.com.tr' };
  window.innerWidth = width;
  window.setTimeout = () => 1;
  window.kemalContentFeed = { getAllItems: async () => items };
  window.kemalUserAuth = { getStudentGradeLevel: () => null };
  document.body.classList.toggle('home-platform', home);
  const source = fs.readFileSync('js/site.js', 'utf8');
  const bootstrap = source.indexOf('  const seoState = initSeo();');
  const exports = `window.shellTest = {
    renderChrome, initSiteSearch, initHamburger, initShortcutDock, renderShortcutDock,
    buildNavbar, buildFooter, getGradeMenuSections, openSiteSearch, closeSiteSearch,
    setDynamicItems(items) { dynamicNavItems = items; }
  };\n})();`;
  vm.runInNewContext(source.slice(0, bootstrap) + exports, {
    window, document, URL, URLSearchParams,
    localStorage: { getItem: () => saved, setItem: (key, value) => writes.push([key, value]) },
  });
  return { window, document, writes, api: window.shellTest };
}

test('five navigation groups preserve grade, subject, public extra and classroom routes', () => {
  const h = setup();
  h.api.setDynamicItems([{ nav_key: '3', sinif: '3', ders_key: 'muzik', label: 'Müzik' }]);
  h.api.renderChrome({ ekMenuler: [{ ad: 'Kütüphane', url: '/e-kitaplik.html' }, { ad: 'Admin', url: '/admin/index.html' }] });
  const primary = h.document.querySelectorAll('#navLinks > .nav-item > .nav-btn');
  assert.deepEqual(Array.from(primary, node => node.textContent.trim()), ['Dersler', 'Okuma', 'Sınavlar', 'Oyunlar', 'Öğretmen Araçları']);
  for (const section of h.api.getGradeMenuSections()) {
    for (const item of section.items) assert.ok(h.document.querySelector('#mainNav a[href="' + item.href + '"]'), item.href);
  }
  for (const route of ['/ogretmen/akvaryum.html', '/ogretmen/beyaztahta.html', '/ogretmen/3d-yapi-atolyesi.html', '/e-kitaplik.html']) {
    assert.ok(h.document.querySelector('#mainNav a[href="' + route + '"]'), route);
  }
  assert.equal(h.document.querySelector('#mainNav a[href="/admin/index.html"]'), null);
  assert.equal(h.document.querySelector('#mainNav a[href="/hakkimda.html"]'), null);
  assert.equal(h.document.querySelector('a[href="/ders.html"], a[href="/dokuman.html"]'), null);
  assert.ok(h.document.querySelector('#kemalFooter a[href="/hakkimda.html"]'));
});

test('homepage shortcut expansion is local and leaves saved global dock preference untouched', () => {
  const saved = JSON.stringify({ state: 'normal', size: 'large', position: 'left' });
  const h = setup({ saved });
  h.api.renderShortcutDock({});
  h.api.initShortcutDock();
  const dock = h.document.getElementById('shortcutDock');
  assert.equal(dock.classList.contains('is-hidden'), true);
  assert.equal(dock.classList.contains('is-large'), true);
  h.document.getElementById('shortcutDockReopen').click();
  assert.equal(dock.classList.contains('is-hidden'), false);
  h.document.getElementById('shortcutDockSmaller').click();
  h.document.getElementById('shortcutDockClose').click();
  assert.deepEqual(h.writes, []);
  const other = setup({ home: false, saved });
  other.api.renderShortcutDock({});
  other.api.initShortcutDock();
  assert.equal(other.document.getElementById('shortcutDock').classList.contains('is-hidden'), false);
  other.document.getElementById('shortcutDockClose').click();
  assert.equal(JSON.parse(other.writes[0][1]).state, 'hidden');
});

test('glass dock keeps tool links and controls with one shared versioned stylesheet', () => {
  const h = setup();
  for (let refresh = 0; refresh < 2; refresh++) {
    h.api.renderShortcutDock({});
    h.api.initShortcutDock();
  }
  assert.equal(h.document.querySelectorAll('link[data-shortcut-dock-theme]').length, 1);
  assert.equal(h.document.querySelector('link[data-shortcut-dock-theme]').getAttribute('href'), '/css/shortcut-dock.css?v=20261029-glass');
  for (const id of ['shortcutDockHandle', 'shortcutDockSmaller', 'shortcutDockLarger', 'shortcutDockReset', 'shortcutDockClose']) {
    const control = h.document.getElementById(id);
    assert.ok(control.querySelector('svg'), id);
    assert.ok(control.getAttribute('aria-label'), id);
  }
  for (const href of ['/index.html', '/ogretmen/akvaryum.html', '/ogretmen/beyaztahta.html', '/ogretmen/kronometre.html', '/ogretmen/matematik.html', '/ogretmen/birim-kup-uygulamasi.html', '/ogretmen/3d-yapi-atolyesi.html', '/ogretmen/geometrik-cisimler-acilimlar.html', '/ogretmen-ajandasi/index.html']) {
    assert.ok(h.document.querySelector('#shortcutDock a[href="' + href + '"]'), href);
  }
  assert.equal(h.document.getElementById('shortcutDockReopen').getAttribute('aria-controls'), 'shortcutDockBar');
});

test('dock size, alignment and visibility controls preserve stored preferences on tool pages', () => {
  const h = setup({ home: false });
  h.api.renderShortcutDock({});
  h.api.initShortcutDock();
  const dock = h.document.getElementById('shortcutDock');
  const smaller = h.document.getElementById('shortcutDockSmaller');
  const larger = h.document.getElementById('shortcutDockLarger');
  smaller.click();
  assert.equal(dock.classList.contains('is-small'), true);
  assert.equal(smaller.disabled, true);
  larger.click();
  larger.click();
  assert.equal(dock.classList.contains('is-large'), true);
  assert.equal(larger.disabled, true);
  const handle = h.document.getElementById('shortcutDockHandle');
  const move = new h.window.Event('keydown', { bubbles: true, cancelable: true });
  move.key = 'ArrowRight';
  handle.dispatchEvent(move);
  assert.equal(dock.dataset.position, 'right');
  h.document.getElementById('shortcutDockReset').click();
  assert.equal(dock.dataset.position, 'center');
  h.document.getElementById('shortcutDockClose').click();
  assert.equal(h.document.getElementById('shortcutDockBar').getAttribute('aria-hidden'), 'true');
  assert.equal(h.document.getElementById('shortcutDockReopen').getAttribute('aria-expanded'), 'false');
  h.document.getElementById('shortcutDockReopen').click();
  assert.equal(dock.classList.contains('is-hidden'), false);
  assert.equal(h.document.getElementById('shortcutDockBar').getAttribute('aria-hidden'), 'false');
  const last = JSON.parse(h.writes[h.writes.length - 1][1]);
  assert.deepEqual(last, { state: 'normal', size: 'large', position: 'center' });
});

test('homepage dock size and alignment survive chrome refresh without touching global storage', () => {
  const h = setup();
  h.api.renderShortcutDock({});
  h.api.initShortcutDock();
  h.document.getElementById('shortcutDockReopen').click();
  h.document.getElementById('shortcutDockSmaller').click();
  h.document.getElementById('shortcutDockHandle').click();
  h.document.getElementById('shortcutDockClose').click();
  h.api.renderShortcutDock({});
  h.api.initShortcutDock();
  const dock = h.document.getElementById('shortcutDock');
  assert.equal(dock.classList.contains('is-small'), true);
  assert.equal(dock.classList.contains('is-hidden'), true);
  assert.equal(dock.dataset.position, 'right');
  assert.deepEqual(h.writes, []);
});

test('homepage search reuses shared results, closes mobile menu and retains dialog scroll lock', async () => {
  const h = setup({ width: 800, items: [{ title: 'Kesirleri öğren', href: '/ders.html?sinif=3&ders=matematik', gradeLabel: '3. Sınıf', contentTypeLabel: 'Ders', accessScope: 'registered' }] });
  h.api.renderChrome({});
  h.api.initSiteSearch();
  h.api.initHamburger();
  h.document.getElementById('hamBtn').click();
  assert.equal(h.document.getElementById('navLinks').classList.contains('open'), true);
  await h.api.openSiteSearch('kesir');
  assert.equal(h.document.getElementById('navLinks').classList.contains('open'), false);
  assert.equal(h.document.getElementById('siteSearchInput').value, 'kesir');
  assert.equal(h.document.getElementById('siteSearchOverlay').getAttribute('aria-hidden'), 'false');
  const result = h.document.querySelector('.site-search-result');
  assert.equal(result.textContent.includes('Kesirleri öğren'), true);
  assert.equal(result.dataset.accessScope, 'registered');
  h.document.getElementById('siteSearchInput').dispatchEvent(new h.window.Event('click', { bubbles: true }));
  assert.equal(h.document.body.style.overflow, 'hidden');
  h.api.closeSiteSearch();
  assert.equal(h.document.getElementById('siteSearchOverlay').getAttribute('aria-hidden'), 'true');
  assert.equal(h.document.body.style.overflow, '');
});

test('compact course and tool menus open one at a time with expanded state', () => {
  const h = setup({ width: 800 });
  h.api.renderChrome({});
  h.api.initHamburger();
  const buttons = h.document.querySelectorAll('#navLinks .nav-btn[aria-controls]');
  buttons[0].click();
  assert.equal(buttons[0].getAttribute('aria-expanded'), 'true');
  buttons[1].click();
  assert.equal(buttons[0].getAttribute('aria-expanded'), 'false');
  assert.equal(buttons[1].getAttribute('aria-expanded'), 'true');
});

test('same-document class anchor closes the mobile drawer without preventing navigation', () => {
  const h = setup({ width: 800 });
  h.window.location.pathname = '/index.html';
  h.window.location.href = 'https://kemalogretmenim.com.tr/index.html';
  h.api.renderChrome({});
  h.api.initHamburger();
  const hamburger = h.document.getElementById('hamBtn');
  hamburger.click();
  const courseButton = h.document.querySelector('.platform-courses > .nav-btn');
  courseButton.click();
  const anchor = h.document.querySelector('#navLinks a[href="/index.html#grade-title"]');
  const click = new h.window.Event('click', { bubbles: true, cancelable: true });
  anchor.dispatchEvent(click);
  assert.equal(click.defaultPrevented, false);
  assert.equal(anchor.getAttribute('href'), '/index.html#grade-title');
  assert.equal(h.document.getElementById('navLinks').classList.contains('open'), false);
  assert.equal(h.document.querySelector('.platform-courses').classList.contains('open'), false);
  assert.equal(hamburger.getAttribute('aria-expanded'), 'false');
  assert.equal(courseButton.getAttribute('aria-expanded'), 'false');
  assert.equal(h.document.body.style.overflow, '');
});

test('desktop dropdown toggle and Escape close navigation and restore the relevant trigger', () => {
  for (const width of [800, 1440]) {
    const h = setup({ width });
    let focused;
    const previousFocus = h.window.HTMLElement.prototype.focus;
    h.window.HTMLElement.prototype.focus = function() { focused = this; };
    try {
      h.api.renderChrome({});
      h.api.initHamburger();
      const trigger = h.document.querySelector('#navLinks .nav-btn[aria-controls]');
      const item = trigger.parentElement;
      trigger.click();
      assert.equal(item.classList.contains('open'), true);
      trigger.click();
      assert.equal(item.classList.contains('open'), false);
      assert.equal(trigger.getAttribute('aria-expanded'), 'false');
      const hamburger = h.document.getElementById('hamBtn');
      if (width < 1180) hamburger.click();
      trigger.click();
      const escape = new h.window.Event('keydown', { bubbles: true, cancelable: true });
      escape.key = 'Escape';
      h.document.dispatchEvent(escape);
      assert.equal(item.classList.contains('open'), false);
      assert.equal(trigger.getAttribute('aria-expanded'), 'false');
      assert.equal(h.document.getElementById('navLinks').classList.contains('open'), false);
      assert.equal(hamburger.getAttribute('aria-expanded'), 'false');
      assert.equal(h.document.body.style.overflow, '');
      assert.equal(focused, width < 1180 ? hamburger : trigger);
    } finally {
      h.window.HTMLElement.prototype.focus = previousFocus;
    }
  }
});

test('late shell hydration preserves an open search, typed query, focus and close behavior', async () => {
  for (const width of [800, 1440]) {
  const h = setup({ width });
  let focused = h.document.getElementById('content');
  const previousFocus = h.window.HTMLElement.prototype.focus;
  Object.defineProperty(h.document, 'activeElement', { get: () => focused, configurable: true });
  h.window.HTMLElement.prototype.focus = function() { focused = this; };
  try {
    h.api.renderChrome({});
    h.api.initSiteSearch();
    h.api.initHamburger();
    await h.api.openSiteSearch('matematik');
    h.document.getElementById('siteSearchInput').focus();
    h.api.renderChrome({ ekMenuler: [{ ad: 'Kitaplık', url: '/e-kitaplik.html' }] });
    h.api.initSiteSearch();
    h.api.initHamburger();
    assert.equal(h.document.getElementById('siteSearchInput').value, 'matematik');
    assert.equal(h.document.getElementById('siteSearchOverlay').getAttribute('aria-hidden'), 'false');
    assert.equal(focused, h.document.getElementById('siteSearchInput'));
    assert.equal(h.document.body.style.overflow, 'hidden');
    h.api.closeSiteSearch();
    assert.equal(h.document.body.style.overflow, '');
    assert.equal(focused, h.document.getElementById('content'));
  } finally {
    h.window.HTMLElement.prototype.focus = previousFocus;
  }
  }
});
