const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto'), ts = require('typescript');
const { parseHTML } = require('linkedom');
function load(name) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/platform', name + '.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module, exports: module.exports, require: n => n.startsWith('./') ? load(n.slice(2)) : require(n), URL, Set, console });
  return module.exports;
}
const source = load('agendaDocumentSource'), doc = load('agendaDocument');
function documents(html = source.agendaDocumentSource) {
  const parent = parseHTML(html).document;
  const child = parseHTML(parent.querySelector('#lessonPlannerFrame').getAttribute('srcdoc')).document;
  return [parent, child];
}

test('agenda and lesson planner are owned bundled documents without live-page, CDN or stylesheet loads', () => {
  const [parent, child] = documents();
  for (const document of [parent, child]) {
    assert.equal(document.querySelectorAll('script[src],link[rel="stylesheet"],iframe[src]').length, 0);
    for (const style of document.querySelectorAll('style')) assert.doesNotMatch(style.textContent, /@import\s|url\(["']?https?:/i);
    for (const script of document.querySelectorAll('script')) {
      if (script.hasAttribute('data-kemal-agenda-bootstrap')) continue;
      assert.doesNotThrow(() => new vm.Script(script.textContent));
    }
  }
  assert.equal(parent.querySelectorAll('#lessonPlannerFrame').length, 1);
  assert.ok(parent.querySelector('style[data-kemal-agenda-shell]'));
  assert.ok(child.querySelector('style[data-kemal-mobile-planner]'));
  assert.ok(child.querySelector('script[data-kemal-mobile-planner]'));
  assert.equal(parent.querySelector('script[data-kemal-source="js/user-auth.js"]'), null);
  assert.equal(parent.querySelector('script[data-kemal-source="js/site.js"]'), null);
  assert.equal(child.querySelectorAll('script[data-kemal-shared-vendor]').length, 3);
});

test('bundled agenda source hashes match all current repository engine and vendor inputs', () => {
  for (const [file, hash] of Object.entries(source.agendaInputHashes)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, '../..', file))).digest('hex'), hash, file);
  assert.ok(source.agendaInputHashes['ogretmen-ajandasi/app.js']);
  assert.ok(source.agendaInputHashes['ogretmen-ajandasi/ders-programi.html']);
  assert.ok(source.agendaInputHashes['mobile-app/vendor/agenda/planner-mobile.js']);
  for (const [name, filename] of [['jszip', 'jszip.min.js'], ['mammoth', 'mammoth.browser.min.js']]) {
    const folder = path.join(__dirname, '../vendor/agenda');
    const provenance = JSON.parse(fs.readFileSync(path.join(folder, name + '-provenance.json'), 'utf8'));
    assert.match(provenance.source, /^https:\/\/registry\.npmjs\.org\//);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(folder, filename))).digest('hex'), provenance.assetSha256);
    assert.ok(fs.statSync(path.join(folder, name + '-LICENSE')).size > 500);
  }
});

test('capability bootstrap precedes the agenda engine, and policy permits only project cloud data', () => {
  const html = doc.createAgendaDocument({ bootstrap: 'window.testBootstrap=true;', nonce: 'owned-agenda-test', dark: true, path: '/ogretmen-ajandasi/index.html?mobileView=scheduleView&focusDate=2026-11-02&classId=class_example' });
  const [parent, child] = documents(html);
  assert.equal(parent.documentElement.dataset.theme, 'dark');
  assert.equal(parent.documentElement.dataset.kemalActivityPath, '/ogretmen-ajandasi/index.html?mobileView=scheduleView&focusDate=2026-11-02&classId=class_example');
  assert.equal(parent.querySelector('meta[name="kemal-native-agenda"]').content, 'owned-agenda-test');
  const scripts = Array.from(parent.querySelectorAll('script'));
  const bootstrap = scripts.findIndex(s => s.hasAttribute('data-kemal-agenda-bootstrap'));
  const engine = scripts.findIndex(s => s.getAttribute('data-kemal-source') === 'ogretmen-ajandasi/app.js');
  assert.ok(bootstrap >= 0 && bootstrap < engine);
  assert.equal(scripts[bootstrap].textContent, 'window.testBootstrap=true;');
  assert.ok(child.querySelector('script[data-kemal-agenda-child-bootstrap]'));
  const policy = parent.querySelector('meta[http-equiv="Content-Security-Policy"]').content;
  assert.equal(policy, doc.AGENDA_DOCUMENT_POLICY);
  assert.ok(policy.includes('connect-src https://mwxcvlyrkptxrwgkmqum.supabase.co wss://mwxcvlyrkptxrwgkmqum.supabase.co;'));
  assert.ok(policy.includes('frame-src about:;'));
  assert.doesNotMatch(policy, /unsafe-eval|https:\/\/\*|script-src[^;]*https:|connect-src[^;]*\*/);
  assert.doesNotMatch(html, /__KEMAL_AGENDA_BOOTSTRAP__/);
});

test('document navigation metadata cannot inject HTML, foreign routes or arbitrary parameters', () => {
  const make = path => doc.createAgendaDocument({ bootstrap: 'true;', nonce: 'safe-capability', dark: false, path });
  assert.doesNotThrow(() => make('/ogretmen-ajandasi/?advanced=1&mobileView=reportsView&studentId=student_123&plannerTab=tab-yukle'));
  for (const bad of ['/ogretmen-ajandasi/index.html?advanced=2', '/other', 'https://evil.example/ogretmen-ajandasi/', '//evil.example/ogretmen-ajandasi/', '/ogretmen-ajandasi/../index.html', '/ogretmen-ajandasi/index.html?token=secret', '/ogretmen-ajandasi/index.html?classId=%22%3E%3Cscript%3E', '/ogretmen-ajandasi/index.html?mobileView=scheduleView&mobileView=backupView', '/ogretmen-ajandasi/index.html#x', '/ogretmen-ajandasi/index.html?mobileView=wrong']) assert.throws(() => make(bad), bad);
  assert.throws(() => doc.createAgendaDocument({ bootstrap: 'true;', nonce: '"><script>bad', dark: false, path: '/ogretmen-ajandasi/index.html' }));
});

test('phone day projection selects focus date, supports day changes and never mutates planner or storage', () => {
  const { window, document } = parseHTML('<html><body><div id="weekly-plan-card"><div id="weekly-plan-container"><div>8. Hafta</div><table class="plan-table"><thead><tr><th>Sıra</th><th>Pazartesi<br><span>2.11.2026</span></th><th>Salı<br><span>3.11.2026</span></th></tr></thead><tbody><tr><td class="row-label-cell">1. Ders</td><td>Pazartesi Türkçe</td><td>Salı Matematik</td></tr><tr><td class="row-label-cell">2. Ders</td><td>Etüt</td><td>İngilizce</td></tr></tbody></table></div></div></body></html>');
  const state = Object.freeze({ lastFocusDate: '2026-11-03', other: 'unchanged' });
  const observer = class { observe() {} };
  const forbidden = () => { throw Error('projection must not access storage'); };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../vendor/agenda/planner-mobile.js'), 'utf8'), { window, document, state, MutationObserver: observer, Date, Array, String, localStorage: { getItem: forbidden, setItem: forbidden } });
  assert.equal(document.querySelectorAll('.kemal-day-picker button').length, 2);
  assert.equal(document.querySelector('.kemal-day-picker button[aria-pressed="true"]').getAttribute('aria-label'), 'Salı 3.11.2026');
  assert.deepEqual(Array.from(document.querySelectorAll('.kemal-active-day')).map(x => x.textContent), ['Salı Matematik', 'İngilizce']);
  document.querySelector('.kemal-day-picker button').dispatchEvent(new window.Event('click'));
  assert.deepEqual(Array.from(document.querySelectorAll('.kemal-active-day')).map(x => x.textContent), ['Pazartesi Türkçe', 'Etüt']);
  assert.equal(state.lastFocusDate, '2026-11-03');
  assert.equal(document.querySelectorAll('.plan-table td').length, 6);
});
