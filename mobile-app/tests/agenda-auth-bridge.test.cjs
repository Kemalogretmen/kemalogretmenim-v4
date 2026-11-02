const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { parseHTML } = require('linkedom');
const root = path.resolve(__dirname, '..');
const bridgeJs = ts.transpileModule(fs.readFileSync(path.join(root, 'src/platform/activity-bridge.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const origin = 'https://kemalogretmenim.com.tr';
const nonce = 'agenda-capability-fixture';
function seed() {
  return { userId: 'teacher-fixture', updated_at: '2026-11-02T00:00:00Z', agenda_state: {
    classes: [{ id: 'roster', name: '3-A' }], students: [{ id: 'student-fixture', classId: 'roster' }], exams: [], updatedAt: '2026-11-02T00:00:00Z',
  }, lesson_planner_state: { version: 7, siniflar: [{ id: 'planner', name: '3-A' }], programs: { planner: { Mon: [{ ders: 'TÜRKÇE' }] } } } };
}
function environment({ marker = nonce, frame = false, host = null, stored = new Map(), url = 'about:blank' } = {}) {
  const dom = parseHTML(`<html><head>${marker === null ? '' : `<meta name="kemal-native-agenda" content="${marker}">`}</head><body></body></html>`);
  const document = dom.document;
  const queued = [], messages = [], writes = [], creations = [];
  const canonical = { from() { return {}; } };
  // A fresh plain window prevents linkedom's shared defaultView globals from
  // leaking an installed bridge or capability between security scenarios.
  const window = { dispatchEvent() {}, addEventListener() {}, ReactNativeWebView: { postMessage: raw => messages.push(JSON.parse(raw)) } };
  window.self = window; window.top = frame ? {} : window; window.parent = frame ? { fixtureHost: host } : window;
  window.supabase = { createClient: (url, key, options) => { creations.push({ url, key, options }); return canonical; } };
  const localStorage = { getItem: key => stored.get(key) || null, setItem: (key, value) => { writes.push([key, String(value)]); stored.set(key, String(value)); }, removeItem: key => { writes.push([key, null]); stored.delete(key); } };
  const config = { origin, authKey: 'sb-fixture-auth-token', module: 'agenda', bundledAgenda: true, nonce,
    userId: 'teacher-fixture', profile: { id: 'teacher-fixture', role: 'teacher', active: true },
    session: { access_token: 'fixture-access-one', refresh_token: 'MUST_NOT_PERSIST', user: { id: 'teacher-fixture' } },
    supabaseUrl: 'https://project-fixture.supabase.co', supabaseKey: 'fixture-public-key', agendaSeed: seed(),
    ...(frame ? { webAgendaHost: 'fixtureHost' } : {}),
  };
  const context = vm.createContext({ window, document, localStorage, location: new URL(url), URL, URLSearchParams, Date, console, Event: dom.window.Event,
    setTimeout: fn => { queued.push(fn); return queued.length; }, exports: {} });
  const run = (patch = {}) => {
    context.__config = { ...config, ...patch };
    vm.runInContext(bridgeJs + '\ninstall(__config);', context);
  };
  return { window, document, run, stored, writes, messages, creations, canonical, config, flush() { while (queued.length) queued.shift()(); } };
}

test('owned agenda bootstrap requires the matching document marker before touching any storage', () => {
  for (const marker of [null, 'wrong-capability']) {
    const stored = new Map([['sb-fixture-auth-token', 'previous-session']]);
    const h = environment({ marker, stored }); h.run();
    assert.equal(h.writes.length, 0); assert.equal(h.creations.length, 0); assert.equal(h.messages.length, 0);
    assert.equal(stored.get('sb-fixture-auth-token'), 'previous-session');
    assert.equal(h.window.__KEMAL_MOBILE_APP__, undefined);
  }
});

test('native owned agenda removes legacy session persistence and reads current access tokens without a second Auth lifecycle', async () => {
  const stored = new Map([['sb-fixture-auth-token', JSON.stringify({ refresh_token: 'OLD_REFRESH', user: { id: 'teacher-fixture' } })]]);
  const h = environment({ stored }); h.run();
  assert.equal(stored.has('sb-fixture-auth-token'), false);
  assert.equal(h.writes.some(([key, value]) => key === 'sb-fixture-auth-token' && value !== null), false);
  assert.equal([...stored.values()].some(value => /MUST_NOT_PERSIST|OLD_REFRESH/.test(value)), false);
  assert.equal(h.creations.length, 1);
  assert.equal(typeof h.creations[0].options.accessToken, 'function');
  assert.equal('auth' in h.creations[0].options, false, 'external accessToken mode must not create a persisted embedded Auth session');
  assert.equal(await h.creations[0].options.accessToken(), 'fixture-access-one');
  assert.equal((await h.window.kemalUserAuth.ready()).user.id, 'teacher-fixture');
  h.run({ session: { access_token: 'fixture-access-two', user: { id: 'teacher-fixture' } } });
  assert.equal(h.creations.length, 1, 'session refresh must reuse the embedded data client');
  assert.equal(await h.creations[0].options.accessToken(), 'fixture-access-two');
});

test('seed hydration is synchronous and appearance reinjection preserves subsequent local edits', () => {
  const h = environment(); h.run();
  const agenda = JSON.parse(h.stored.get('kemalOgretmenAjandasi.v1'));
  const planner = JSON.parse(h.stored.get('ogretmen_plan_v2'));
  assert.equal(agenda.classes[0].id, 'roster'); assert.equal(planner.siniflar[0].id, 'planner');
  assert.equal(h.window.__KEMAL_AGENDA_LOCAL_BASE__.revision, seed().updated_at);
  assert.equal(h.window.__KEMAL_AGENDA_LOCAL_BASE__.checked, true);
  h.stored.set('kemalOgretmenAjandasi.v1', 'UNSAVED_LOCAL_EDIT');
  h.run({ dark: true });
  assert.equal(h.stored.get('kemalOgretmenAjandasi.v1'), 'UNSAVED_LOCAL_EDIT');
});

test('web preview requires the parent host handshake and cannot bootstrap on a rejected frame', () => {
  for (const host of [null, { connect: () => null }, { connect() { throw new Error('Foreign origin'); } }]) {
    const h = environment({ frame: true, host }); h.run({ session: null });
    assert.equal(h.writes.length, 0); assert.equal(h.creations.length, 0); assert.equal(h.window.kemalUserAuth, undefined);
  }
});

test('accepted web preview uses the canonical host client and does not persist or construct any second Auth client', async () => {
  const unrelated = {};
  const canonical = { from() { return unrelated; } };
  const calls = [];
  const hostAuth = { ready: async () => ({ user: { id: 'teacher-fixture' }, profile: { role: 'teacher' } }), getClient: () => canonical, notify: type => calls.push(type) };
  let candidate, supplied;
  const h = environment({ frame: true, url: 'about:srcdoc', host: { connect(window, token) { candidate = window; supplied = token; return hostAuth; } } });
  h.run({ session: null });
  assert.equal(candidate, h.window); assert.equal(supplied, nonce);
  assert.equal(h.creations.length, 0); assert.equal(h.writes.some(([key]) => key === 'sb-fixture-auth-token'), false);
  assert.equal((await h.window.kemalUserAuth.ready()).user.id, 'teacher-fixture');
  assert.equal(h.window.kemalUserAuth.getClient().from('unrelated'), canonical.from('unrelated'));
  assert.ok(calls.includes('ready'));
});

const React = require('react');
const hostDOM = parseHTML('<html><body></body></html>');
global.window = hostDOM.window; global.document = hostDOM.document; global.navigator = { userAgent: 'node' };
global.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = require('react-dom/client');
const { act } = React;
test('preview host capabilities reject a different frame, wrong nonce, changed identity and use after unmount', async () => {
  const auth = { value: { userId: 'teacher-fixture', session: { user: { id: 'teacher-fixture', email: 'fixture@example.invalid' } }, profile: { id: 'teacher-fixture', role: 'teacher' } } };
  const canonical = { from() {} };
  const file = path.join(root, 'src/platform/WebAgendaActivity.tsx');
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, window: hostDOM.window, require: name => name === 'react' ? React : name === '@/context/AuthContext' ? { useAuth: () => auth.value } : name === '@/lib/supabase' ? { supabase: canonical } : require(name) });
  const Component = module.exports.WebAgendaActivity;
  const container = hostDOM.document.createElement('div'); hostDOM.document.body.appendChild(container);
  const renderRoot = createRoot(container); let ready = 0, unmounted = false;
  const props = { html: '<html></html>', hostKey: 'fixturePreviewCapability', nonce, title: 'Ajanda', onReady: () => ready++, onError() {} };
  const render = () => act(async () => { renderRoot.render(React.createElement(Component, props)); });
  await render();
  try {
    const iframe = container.querySelector('iframe'), ownedWindow = {};
    assert.ok(iframe); Object.defineProperty(iframe, 'contentWindow', { value: ownedWindow, configurable: true });
    const host = hostDOM.window[props.hostKey];
    assert.equal(host.connect({}, nonce), null); assert.equal(host.connect(ownedWindow, 'wrong'), null);
    const grant = host.connect(ownedWindow, nonce);
    assert.ok(grant); assert.equal(grant.getClient(), canonical); assert.equal((await grant.ready()).user.id, 'teacher-fixture');
    grant.notify('ready'); assert.equal(ready, 1);
    auth.value = { ...auth.value, session: { user: { id: 'teacher-fixture' }, access_token: 'rotated' } };
    await render(); assert.equal(grant.getClient(), canonical, 'same-user refresh keeps the app client');
    auth.value = { ...auth.value, profile: { ...auth.value.profile, active: false } };
    await render(); assert.throws(() => grant.getClient(), /oturumu değişti/);
    auth.value = { ...auth.value, profile: { ...auth.value.profile, active: true, role: 'student' } };
    await render(); await assert.rejects(grant.ready(), /oturumu değişti/);
    auth.value = { ...auth.value, profile: { ...auth.value.profile, role: 'teacher', approval_status: 'pending' } };
    await render(); assert.throws(() => grant.getClient(), /oturumu değişti/);
    auth.value = { ...auth.value, profile: { ...auth.value.profile, approval_status: 'active' } };
    auth.value = { ...auth.value, session: { user: { id: 'other-account' } } };
    await render(); assert.throws(() => grant.getClient(), /oturumu değişti/);
    await assert.rejects(grant.ready(), /oturumu değişti/);
    await act(async () => renderRoot.unmount()); unmounted = true;
    assert.equal(hostDOM.window[props.hostKey], undefined); assert.equal(host.connect(ownedWindow, nonce), null);
    assert.throws(() => grant.getClient(), /oturumu değişti/);
  } finally {
    if (!unmounted) await act(async () => renderRoot.unmount());
    container.remove();
  }
});
