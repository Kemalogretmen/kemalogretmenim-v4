const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');
const source = fs.readFileSync('js/platform-icons.js', 'utf8');
function setup(html) {
  const { document } = parseHTML('<html><head></head><body>'+html+'</body></html>');
  let observer;
  const window = { MutationObserver: class { constructor(callback) { observer=callback; } observe() {} } };
  Object.defineProperty(document,'readyState',{value:'complete',configurable:true});
  vm.runInNewContext(source,{window,document});
  return { window, document, api:window.kemalIcons, added(node) { observer([{type:'childList',addedNodes:[node]}]); } };
}
test('shared UI icons preserve labels and handlers without rewriting lesson content or inputs', () => {
  const h=setup('<header class="page-header"><h1>📖 Okuma</h1></header><div class="contact-form-card"><button class="form-submit">📨 Gönder</button><input value="📖 Metin"></div><div class="page-surface"><span class="val-em">❤️</span></div><div class="question-content">🧊 Kaç küp?</div><header class="reader-topbar"><div class="reader-title">🐟 Balığın Hikâyesi</div></header><div class="icon-opt" data-icon="📝">📝</div>');
  const button=h.document.querySelector('button');let clicks=0;button.addEventListener('click',()=>clicks++);
  h.api.render(h.document);button.click();
  assert.equal(clicks,1);assert.equal(button.textContent.trim(),'Gönder');
  assert.ok(h.document.querySelector('h1 svg[data-platform-glyph="book"]'));
  assert.equal(h.document.querySelector('input').value,'📖 Metin');
  assert.equal(h.document.querySelector('.page-surface').textContent,'❤️');
  assert.equal(h.document.querySelector('.question-content').textContent,'🧊 Kaç küp?');
  assert.equal(h.document.querySelector('.icon-opt').textContent,'📝');
  assert.equal(h.document.querySelector('.reader-title').textContent,'🐟 Balığın Hikâyesi');
});
test('late navigation/card icons are decorated once and keep their existing element identity', () => {
  const h=setup('<nav class="teacher-tabs"></nav>');const button=h.document.createElement('button');button.textContent='📊 Raporlar';
  h.document.querySelector('nav').appendChild(button);h.added(button);
  h.api.render(h.document);h.api.render(h.document);
  assert.equal(button.querySelectorAll('svg').length,1);assert.equal(button.textContent.trim(),'Raporlar');
  assert.equal(h.document.querySelector('button'),button);
});
test('explicit page marks and legacy font icons share a still SVG and preserve legacy selectors', () => {
  const h=setup('<div data-ui-icon="mail"></div><main class="teacher-tools"><button aria-label="Favori"><i class="fas fa-star"></i></button></main>');
  assert.ok(h.document.querySelector('[data-ui-icon] svg[data-platform-glyph="mail"]'));
  const oldIcon=h.document.querySelector('i.fa-star');assert.ok(oldIcon.querySelector('svg[data-platform-glyph="sparkle"]'));
  assert.equal(h.document.querySelector('button').getAttribute('aria-label'),'Favori');
  h.api.render(h.document);assert.equal(oldIcon.querySelectorAll('svg').length,1);
});
