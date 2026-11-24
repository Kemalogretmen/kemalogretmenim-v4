const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');
const source = fs.readFileSync(require.resolve('../js/home-release.js'), 'utf8');
const key = 'kemal:home-release:2026-11-24';
function memory(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: k => data.get(k) || null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
}
function run({ local = memory(), session = memory(), hidden = false } = {}) {
  const { document, window } = parseHTML('<html><body><main><button data-release-open>Yenilikleri gör</button></main></body></html>');
  Object.defineProperty(document, 'hidden', { value: hidden, writable: true });
  vm.runInNewContext(source, { document, window: { localStorage: local, sessionStorage: session } });
  const click = selector => document.querySelector(selector).dispatchEvent(new window.Event('click'));
  return { document, click, window, local, session };
}
test('home release shows all sections once and records only the current version', () => {
  const local = memory({ 'kemal:home-release:2026-11-19': '1' });
  const first = run({ local });
  assert.equal(first.document.querySelectorAll('.site-release-section').length, 11);
  assert(first.document.querySelector('dialog').hasAttribute('open'));
  assert.equal(local.getItem(key), '1');
  assert.match(first.document.querySelector('dialog').textContent, /PDF.*Kum havuzu.*Sınıf Akvaryumu.*Poster Yazıcı/s);
  first.click('.site-release-dismiss');
  assert(!first.document.querySelector('dialog').hasAttribute('open'));
  assert.equal(first.document.body.style.overflow || '', '');
  const again = run({ local });
  assert.equal(again.document.querySelector('dialog'), null);
  again.click('[data-release-open]');
  assert(again.document.querySelector('dialog').hasAttribute('open'));
});
test('hidden homepage does not consume the one-time notice', () => {
  const app = run({ hidden: true });
  assert.equal(app.local.getItem(key), null);
  app.document.hidden = false;
  app.document.dispatchEvent(new app.window.Event('visibilitychange'));
  assert.equal(app.local.getItem(key), '1');
});
test('denied storage never breaks the homepage or traps it in recurring notices', () => {
  const denied = { getItem() { throw Error('Denied'); } };
  const app = run({ local: denied, session: denied });
  assert.equal(app.document.querySelector('dialog'), null);
  app.click('[data-release-open]');
  assert(app.document.querySelector('dialog').hasAttribute('open'));
  app.click('.site-release-done');
  assert(!app.document.querySelector('dialog').hasAttribute('open'));
  const fallback = run({ local: denied });
  assert.equal(fallback.session.getItem(key), '1');
});
test('release routes resolve to public files and homepage loads the versioned notice', () => {
  const app = run();
  for (const link of app.document.querySelectorAll('.site-release-section a')) {
    const path = link.getAttribute('href').split('?')[0];
    assert(fs.existsSync(require('node:path').join(__dirname, '..', path)), path);
  }
  const home = fs.readFileSync(require.resolve('../index.html'), 'utf8');
  assert.match(home, /home-release\.js\?v=20261124-release/);
  assert.match(home, /site-release-notes\.css\?v=20261124-release/);
});
test('retired section notices cannot cover lesson controls', () => {
  const source = fs.readFileSync(require.resolve('../js/site-release-notes.js'), 'utf8');
  vm.runInNewContext(source, { document: { createElement() { throw Error('Unexpected overlay'); } } });
});
