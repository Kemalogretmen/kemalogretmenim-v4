const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(name) {
  const module = { exports: {} };
  const file = path.resolve(__dirname, '../src/lib', name + '.ts');
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(js, { module, exports: module.exports, URL, URLSearchParams, console }); return module.exports;
}
const { createSecureAuthStorage } = load('secure-auth-storage');
const { authCallbackPayload, isAuthCallbackUrl, createAuthIdentityGuard } = load('auth-guards');
function memory() {
  const values = new Map();
  return { values, failSet: null, failGet: null, failRemove: null,
    async getItem(key) { if (this.failGet?.(key)) throw new Error('read failed'); return this.values.get(key) ?? null; },
    async setItem(key, value) { if (this.failSet?.(key, value)) throw new Error('write failed'); this.values.set(key, value); },
    async removeItem(key) { if (this.failRemove?.(key)) throw new Error('remove failed'); this.values.delete(key); },
  };
}
function environment() { const secure = memory(), legacy = memory(); return { secure, legacy, storage: createSecureAuthStorage(secure, legacy), key: 'sb-project-auth-token' }; }
test('legacy sessions migrate intact into bounded SecureStore fragments before plaintext removal', async () => {
  const h = environment(); const value = JSON.stringify({ access_token: 'a'.repeat(4000), user: { full_name: 'Öğretmen 🌱'.repeat(220) } });
  h.legacy.values.set(h.key, value);
  assert.equal(await h.storage.getItem(h.key), value); assert.equal(h.legacy.values.has(h.key), false);
  assert.equal(await h.storage.getItem(h.key), value);
  assert.ok([...h.secure.values.values()].every(fragment => Buffer.byteLength(fragment, 'utf8') <= 1800));
  assert.equal([...h.legacy.values.values()].includes(value), false);
  assert.equal(h.legacy.values.get(h.key + '.secure-native.v1'), '1');
});
test('an interrupted token rotation keeps the last committed encrypted session', async () => {
  const h = environment(); await h.storage.setItem(h.key, 'OLD');
  h.secure.failSet = key => key.endsWith('.1.1');
  await assert.rejects(h.storage.setItem(h.key, 'NEW'.repeat(1500)), /write failed/);
  assert.equal(await h.storage.getItem(h.key), 'OLD');
  h.secure.failSet = null; await h.storage.setItem(h.key, 'CURRENT');
  assert.equal(await h.storage.getItem(h.key), 'CURRENT');
  await h.storage.removeItem(h.key);
  assert.equal(await h.storage.getItem(h.key), null);
  // Both slots, including all reserved fragments of the interrupted write, are removed.
  assert.equal(h.secure.values.size, 1); assert.equal(h.legacy.values.size, 0);
});
test('a failed secure migration preserves legacy data and can be retried without plaintext fallback', async () => {
  const h = environment(); h.legacy.values.set(h.key, 'LEGACY'); h.secure.failSet = key => key.endsWith('.0.0');
  await assert.rejects(h.storage.getItem(h.key), /write failed/); assert.equal(h.legacy.values.get(h.key), 'LEGACY');
  h.secure.failSet = null; assert.equal(await h.storage.getItem(h.key), 'LEGACY'); assert.equal(h.legacy.values.has(h.key), false);
  h.secure.failGet = () => true;
  await assert.rejects(h.storage.getItem(h.key), /read failed/);
});
test('sign-out marker prevents a refused plaintext deletion from resurrecting an account', async () => {
  const h = environment(); await h.storage.setItem(h.key, 'SECRET'); h.legacy.values.set(h.key, 'OLD'); h.legacy.failRemove = key => key === h.key;
  await assert.rejects(h.storage.removeItem(h.key), /remove failed/);
  assert.equal(await h.storage.getItem(h.key), null);
  h.legacy.failRemove = null; await h.storage.removeItem(h.key); assert.equal(h.secure.values.size, 1);
});
test('iOS keychain remnants cannot silently restore a session after sandbox reinstall', async () => {
  const h = environment(); await h.storage.setItem(h.key, 'OLD-INSTALL');
  h.legacy.values.clear();
  assert.equal(await h.storage.getItem(h.key), null); assert.equal(h.secure.values.size, 1);
  await h.storage.setItem(h.key, 'NEW-INSTALL'); assert.equal(await h.storage.getItem(h.key), 'NEW-INSTALL');
});
test('concurrent writes serialize and missing encrypted fragments never fall back to old plaintext', async () => {
  const h = environment(); await Promise.all([h.storage.setItem(h.key, 'ONE'), h.storage.setItem(h.key, 'TWO'), h.storage.setItem(h.key, 'THREE')]);
  assert.equal(await h.storage.getItem(h.key), 'THREE');
  const base = [...h.secure.values.keys()].find(key => !/\.\d+\.\d+$/.test(key)); const manifest = JSON.parse(h.secure.values.get(base));
  h.secure.values.delete(`${base}.${manifest.active}.0`); h.legacy.values.set(h.key, 'STALE');
  await assert.rejects(h.storage.getItem(h.key), /eksik/);
});
test('OAuth callbacks accept only the exact native redirect and PKCE authorization codes', () => {
  const good = 'kemalogretmenim://auth/callback?code=one-use-code';
  assert.equal(authCallbackPayload(good, 'kemalogretmenim').kind, 'code');
  for (const raw of [
    'https://evil.test/auth/callback?code=bad', 'https://kemalogretmenim.com.tr/auth/callback?code=bad',
    'kemalogretmenim://auth/callback-evil?code=bad', 'kemalogretmenim://auth.evil.test/callback?code=bad',
    'kemalogretmenim://user:pass@auth/callback?code=bad', 'kemalogretmenim://auth:443/callback?code=bad',
    'other://auth/callback?code=bad', 'kemalogretmenim://auth/callback/extra?code=bad',
    '\nkemalogretmenim://auth/callback?code=bad',
  ]) { assert.equal(isAuthCallbackUrl(raw, 'kemalogretmenim'), false, raw); assert.equal(authCallbackPayload(raw, 'kemalogretmenim'), null); }
  for (const raw of ['kemalogretmenim://auth/callback#access_token=attacker&refresh_token=attacker', good + '&access_token=attacker', good + '&code=second', 'kemalogretmenim://auth/callback?code=%20']) assert.equal(authCallbackPayload(raw, 'kemalogretmenim'), null, raw);
});
test('slow profile results are invalidated across sign-out, account switching and same-user relogin', async () => {
  const identity = createAuthIdentityGuard(); let profile = null;
  identity.accept('teacher-a'); const oldTicket = identity.ticket('teacher-a');
  let resolveOld; const oldLookup = new Promise(resolve => { resolveOld = resolve; });
  const oldCompletion = oldLookup.then(value => { if (identity.current(oldTicket)) profile = value; });
  identity.accept('teacher-b'); const newTicket = identity.ticket('teacher-b');
  if (identity.current(newTicket)) profile = 'B';
  resolveOld('A'); await oldCompletion; assert.equal(profile, 'B');
  identity.invalidate(); assert.equal(identity.current(newTicket), false);
  identity.accept('teacher-a'); assert.equal(identity.current(oldTicket), false);
  const current = identity.ticket('teacher-a'); identity.accept('teacher-a'); assert.equal(identity.current(current), true);
});
