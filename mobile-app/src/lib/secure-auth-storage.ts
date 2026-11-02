type Storage = { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void>; removeItem: (key: string) => Promise<void> };
type Slot = { count: number; length: number; capacity: number };
type Manifest = { v: 1; active: -1 | 0 | 1; slots: [Slot, Slot]; migrating: boolean };
const CHUNK_BYTES = 1800;
const MAX_CHUNKS = 512;
const MAX_LENGTH = 256_000;
const blank = (): Manifest => ({ v: 1, active: -1, slots: [{ count: 0, length: 0, capacity: 0 }, { count: 0, length: 0, capacity: 0 }], migrating: false });
function prefix(key: string) {
  if (!key || key.length > 512) throw new Error('Geçersiz oturum kayıt anahtarı.');
  return 'kemal.auth.v1.' + Array.from(key).map(char => char.codePointAt(0)!.toString(16)).join('-');
}
function chunks(value: string) {
  if (value.length > MAX_LENGTH) throw new Error('Oturum kaydı desteklenen boyutu aşıyor.');
  const result: string[] = []; let chunk = ''; let bytes = 0;
  for (const char of value) {
    const code = char.codePointAt(0)!; const size = code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
    if (bytes + size > CHUNK_BYTES) { result.push(chunk); chunk = ''; bytes = 0; }
    chunk += char; bytes += size;
  }
  if (chunk || !result.length) result.push(chunk);
  if (result.length > MAX_CHUNKS) throw new Error('Oturum kaydı desteklenen boyutu aşıyor.');
  return result;
}
function parse(raw: string | null): Manifest | null {
  if (raw == null) return null;
  const manifest = JSON.parse(raw) as Manifest;
  if (manifest?.v !== 1 || ![-1, 0, 1].includes(manifest.active) || !Array.isArray(manifest.slots) || manifest.slots.length !== 2 || typeof manifest.migrating !== 'boolean') throw new Error('Güvenli oturum kaydı okunamıyor.');
  for (const slot of manifest.slots) if (!slot || !Number.isInteger(slot.count) || !Number.isInteger(slot.capacity) || !Number.isInteger(slot.length) || slot.count < 0 || slot.capacity < slot.count || slot.capacity > MAX_CHUNKS || slot.length < 0 || slot.length > MAX_LENGTH) throw new Error('Güvenli oturum kaydı eksik.');
  return manifest;
}

/**
 * SecureStore encrypts every native fragment. Two fixed slots preserve the last
 * committed session if the OS terminates a write. The small encrypted manifest
 * records all allocated fragments so sign-out can remove both slots.
 * The legacy plaintext value is removed only after a complete encrypted commit.
 */
export function createSecureAuthStorage(secure: Storage, legacy: Storage): Storage {
  const pending = new Map<string, Promise<unknown>>();
  function serial<T>(key: string, work: () => Promise<T>): Promise<T> {
    const operation = (pending.get(key) || Promise.resolve()).catch(() => undefined).then(work);
    pending.set(key, operation);
    const cleanup = () => { if (pending.get(key) === operation) pending.delete(key); };
    operation.then(cleanup, cleanup);
    return operation;
  }
  async function readCommitted(base: string, manifest: Manifest) {
    const active = manifest.active;
    if (active !== 0 && active !== 1) return null;
    const slot = manifest.slots[active];
    if (!slot.count) throw new Error('Güvenli oturum kaydı eksik.');
    const parts = await Promise.all(Array.from({ length: slot.count }, (_, i) => secure.getItem(`${base}.${active}.${i}`)));
    if (parts.some(part => part == null)) throw new Error('Güvenli oturum kaydı eksik.');
    const value = parts.join('');
    if (value.length !== slot.length) throw new Error('Güvenli oturum kaydı tamamlanamadı.');
    return value;
  }
  async function write(key: string, value: string, previous: Manifest | null, migrating: boolean) {
    const base = prefix(key); const parts = chunks(value); const manifest = previous || blank();
    const inactive = manifest.active === 0 ? 1 : 0;
    // Reserve capacity before touching the inactive slot. An interrupted write is
    // still fully removable, while readers continue using the old active slot.
    manifest.slots[inactive] = { count: parts.length, length: value.length, capacity: Math.max(manifest.slots[inactive].capacity, parts.length) };
    manifest.migrating = migrating;
    await secure.setItem(base, JSON.stringify(manifest));
    for (let i = 0; i < parts.length; i++) await secure.setItem(`${base}.${inactive}.${i}`, parts[i]);
    const candidate: Manifest = { ...manifest, active: inactive, migrating: false };
    if (await readCommitted(base, candidate) !== value) throw new Error('Güvenli oturum kaydı doğrulanamadı.');
    await secure.setItem(base, JSON.stringify(candidate));
    // iOS Keychain can survive uninstall; the non-secret sandbox marker cannot.
    // Without that marker, a fresh install must not silently restore an account.
    await legacy.setItem(key + '.secure-native.v1', '1');
    await legacy.removeItem(key);
  }
  return {
    getItem: key => serial(key, async () => {
      const base = prefix(key); const manifest = parse(await secure.getItem(base));
      if (manifest?.active !== undefined && manifest.active >= 0) {
        if (!await legacy.getItem(key + '.secure-native.v1') && await legacy.getItem(key) == null) {
          manifest.active = -1; manifest.migrating = false;
          await secure.setItem(base, JSON.stringify(manifest));
          for (let slot = 0; slot < 2; slot++) for (let i = 0; i < manifest.slots[slot].capacity; i++) await secure.removeItem(`${base}.${slot}.${i}`);
          await secure.setItem(base, JSON.stringify(blank()));
          return null;
        }
        const value = await readCommitted(base, manifest);
        await legacy.setItem(key + '.secure-native.v1', '1');
        await legacy.removeItem(key); // Retry cleanup after an interrupted migration.
        return value;
      }
      // A retained sign-out marker prevents resurrection of any old plaintext
      // value when the OS refused its deletion. No plaintext fallback on errors.
      if (manifest && !manifest.migrating) return null;
      const legacyValue = await legacy.getItem(key);
      if (legacyValue == null) return null;
      await write(key, legacyValue, manifest, true);
      return legacyValue;
    }),
    setItem: (key, value) => serial(key, async () => write(key, value, parse(await secure.getItem(prefix(key))), false)),
    removeItem: key => serial(key, async () => {
      const base = prefix(key); const manifest = parse(await secure.getItem(base)) || blank();
      manifest.active = -1; manifest.migrating = false;
      await secure.setItem(base, JSON.stringify(manifest));
      await legacy.removeItem(key);
      await legacy.removeItem(key + '.secure-native.v1');
      for (let slot = 0; slot < 2; slot++) for (let i = 0; i < manifest.slots[slot].capacity; i++) await secure.removeItem(`${base}.${slot}.${i}`);
      await secure.setItem(base, JSON.stringify(blank()));
    }),
  };
}
