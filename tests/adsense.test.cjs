const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const { parseHTML } = require('linkedom');
const tick = () => new Promise(resolve => setImmediate(resolve));
const articleId = '12345678-1234-4234-8234-123456789abc';
const publisher = 'ca-pub-1234567890123456';
const configured = { enabled: true, publisher_id: publisher, slot_id: '9876543210', article_ids: [articleId], placements: ['home', 'reading', 'student-panel'] };
const adsScript = fs.readFileSync('js/site-adsense.js', 'utf8');

async function page({ settings = configured, origin = 'https://kemalogretmenim.com.tr', hasCmp = true,
  placement = 'article', pathname = '/makale.html', search = placement === 'article' ? '?id=' + articleId : '', profile, localChoice = null, blockedStorage = false } = {}) {
  const { document, window } = parseHTML('<html><head></head><body><main><div id="anchor" data-site-ad="' + placement + '"></div></main></body></html>');
  const anchor = document.getElementById('anchor');
  delete window.__tcfapi;
  delete window.googlefc;
  delete window.adsbygoogle;
  const saved = new Map();
  const choiceKey = 'kemal:ad-cookie-choice:v1';
  if (localChoice !== null) saved.set(choiceKey, JSON.stringify({ version: 1, allowed: localChoice, at: Date.now() }));
  window.localStorage = {
    getItem: key => saved.get(key) || null,
    setItem: (key, value) => { if (blockedStorage) throw Error('Storage blocked'); saved.set(key, value); },
  };
  Object.defineProperty(anchor, 'clientWidth', { value: 320 });
  window.location = { origin, pathname, search };
  window.kemalSiteStore = { getConfig: () => ({ supabaseUrl: 'https://example.test', supabaseAnonKey: 'test' }) };
  window.kemalUserAuth = { ready: async () => {}, getProfile: () => profile };
  const requests = [];
  let consentListener, intersectionListener;
  function installCmp() { window.__tcfapi = (_command, _version, listener) => { consentListener = listener; }; }
  if (hasCmp) installCmp();
  vm.runInNewContext(adsScript, {
    window, document, URLSearchParams,
    IntersectionObserver: class {
      constructor(listener) { intersectionListener = listener; }
      observe() {}
      disconnect() {}
    },
    MutationObserver: window.MutationObserver,
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, json: async () => [settings] };
    },
  });
  if (placement === 'article') await window.KemalSiteAdSense.mount(anchor, articleId);
  await tick();
  return {
    document, window, requests, anchor, installCmp, saved, choiceKey,
    setSettings: value => { settings = value; },
    near: async () => { intersectionListener?.([{ isIntersecting: true }]); await tick(); await tick(); },
    consent: async (granted, overrides = {}) => {
      consentListener?.({
        cmpStatus: 'loaded', tcString: 'real-provider-data-fixture', eventStatus: 'useractioncomplete',
        purpose: { consents: { 1: granted, 2: granted, 7: granted, 9: granted, 10: granted } },
        vendor: { consents: { 755: granted } }, ...overrides,
      }, true);
      await tick(); await tick();
    },
  };
}

test('Google CMP boots paused; only a complete preference near a visible entry requests one child-treated NPA unit', async () => {
  const h = await page();
  assert.equal(h.requests.length, 0);
  await h.near();
  assert.equal(h.requests.length, 1);
  assert.equal(h.window.adsbygoogle.pauseAdRequests, 1);
  assert.equal(h.window.adsbygoogle.length, 0);
  assert.equal(h.document.querySelector('ins.adsbygoogle'), null);
  assert.equal(h.document.querySelectorAll('script[src*="googlesyndication"]').length, 1);
  await h.consent(true);
  await h.near();
  assert.equal(h.requests.length, 2);
  assert.ok(h.requests.every(r => r.options.cache === 'no-store'));
  assert.equal(h.document.querySelectorAll('ins.adsbygoogle').length, 1);
  const ad = h.document.querySelector('ins.adsbygoogle');
  assert.equal(ad.dataset.adClient, publisher);
  assert.equal(ad.dataset.adSlot, '9876543210');
  assert.equal(ad.dataset.tagForAgeTreatment, '1');
  assert.equal(h.window.adsbygoogle.requestNonPersonalizedAds, 1);
  assert.equal(h.window.adsbygoogle[0].params.google_privacy_treatments, 'disablePersonalization');
  assert.equal(h.window.adsbygoogle.pauseAdRequests, 0);
  await h.consent(false);
  assert.equal(h.document.querySelector('ins.adsbygoogle'), null);
  assert.equal(h.window.adsbygoogle.pauseAdRequests, 1);
});

test('disabled, invalid or unselected settings never load Google; unknown consent never requests a unit', async () => {
  for (const [options, fetches, sdk] of [
    [{ settings: { ...configured, enabled: false } }, 1, false],
    [{ settings: { ...configured, article_ids: [] } }, 1, false],
    [{ settings: { ...configured, publisher_id: 'invalid' } }, 1, false],
    [{ origin: 'http://localhost:8087' }, 0, false],
    [{ hasCmp: false }, 1, true],
    [{}, 1, true],
  ]) {
    const h = await page(options);
    await h.near();
    await h.consent(false);
    assert.equal(h.requests.length, fetches);
    assert.equal(Boolean(h.document.querySelector('script[src*="googlesyndication"]')), sdk);
    assert.equal(h.document.querySelector('ins.adsbygoogle'), null);
    if (sdk) assert.equal(h.window.adsbygoogle.pauseAdRequests, 1);
  }
});

test('late CMP callbacks work without inventing a consent string or assuming missing legal bases', async () => {
  const h = await page({ hasCmp: false });
  await h.near();
  h.installCmp();
  h.window.googlefc.callbackQueue.forEach(callback => callback.CONSENT_API_READY?.());
  await h.consent(true, { tcString: '' });
  assert.equal(h.document.querySelector('ins'), null);
  await h.consent(true, { purpose: { consents: { 1: true } } });
  assert.equal(h.document.querySelector('ins'), null);
  await h.consent(true);
  assert.equal(h.document.querySelectorAll('ins').length, 1);
});

test('a hidden activity entry, changed route or shutdown during the consent dialog prevents the request', async () => {
  for (const alter of [
    h => { h.anchor.parentElement.hidden = true; },
    h => { h.window.location.pathname = '/hizli-okuma/oku.html'; },
    h => { h.setSettings({ ...configured, enabled: false }); },
  ]) {
    const h = await page();
    await h.near();
    alter(h);
    await h.consent(true);
    assert.equal(h.document.querySelector('ins'), null);
    assert.equal(h.window.adsbygoogle.pauseAdRequests, 1);
  }
});

test('only selected entry pages and authorized panel homes can request a unit', async () => {
  const student = { role: 'student', approval_status: 'active' };
  for (const [options, allowed] of [
    [{ placement: 'home', pathname: '/' }, true],
    [{ placement: 'reading', pathname: '/hizli-okuma/index.html' }, true],
    [{ placement: 'student-panel', pathname: '/ogrenci-paneli', profile: student }, true],
    [{ placement: 'student-panel', pathname: '/ogrenci-paneli' }, false],
    [{ placement: 'reading', pathname: '/hizli-okuma/', search: '?metinId=123' }, false],
    [{ placement: 'reading', pathname: '/hizli-okuma/oku.html' }, false],
    [{ placement: 'exams', pathname: '/sinav_sitesi/sinav.html' }, false],
    [{ placement: 'home', pathname: '/ogretmen/akvaryum.html' }, false],
    [{ placement: 'games', pathname: '/oyun/oyunlar' }, false],
  ]) {
    const h = await page(options);
    await h.near(); await h.consent(true);
    assert.equal(Boolean(h.document.querySelector('ins.adsbygoogle')), allowed, options.pathname);
  }
});

test('outside GDPR, applicability is not consent; an inline choice can be declined without any ad request', async () => {
  const h = await page();
  await h.near();
  await h.consent(false, { gdprApplies: false, tcString: '' });
  assert.ok(h.document.querySelector('.site-ad-preferences'));
  assert.equal(h.document.querySelector('ins'), null);
  h.document.querySelector('[data-ad-choice="deny"]').click();
  await tick();
  assert.equal(JSON.parse(h.saved.get(h.choiceKey)).allowed, false);
  assert.equal(h.document.querySelector('.site-ad-preferences'), null);
  assert.equal(h.document.querySelector('ins'), null);
  assert.equal(h.window.adsbygoogle.pauseAdRequests, 1);
  await h.near();
  assert.equal(h.document.querySelector('.site-ad-preferences'), null);
});

test('an explicit non-GDPR cookie choice permits only NPA; revoking in another tab removes the unit', async () => {
  const h = await page();
  await h.near();
  await h.consent(false, { gdprApplies: false, tcString: '' });
  h.document.querySelector('[data-ad-choice="allow"]').click();
  await tick(); await tick();
  assert.equal(h.document.querySelectorAll('ins').length, 1);
  assert.equal(h.window.adsbygoogle.requestNonPersonalizedAds, 1);
  assert.equal(h.document.querySelector('ins').dataset.tagForAgeTreatment, '1');
  assert.equal(JSON.parse(h.saved.get(h.choiceKey)).allowed, true);
  h.saved.set(h.choiceKey, JSON.stringify({ version: 1, allowed: false, at: Date.now() }));
  const event = new h.window.Event('storage');
  event.key = h.choiceKey;
  h.window.dispatchEvent(event);
  assert.equal(h.document.querySelector('ins'), null);
  assert.equal(h.window.adsbygoogle.pauseAdRequests, 1);
});

test('a local preference never substitutes for GDPR consent or unknown applicability; blocked storage fails closed', async () => {
  for (const gdprApplies of [true, undefined]) {
    const h = await page({ localChoice: true });
    await h.near();
    await h.consent(false, { gdprApplies, tcString: '' });
    assert.equal(h.document.querySelector('.site-ad-preferences'), null);
    assert.equal(h.document.querySelector('ins'), null);
  }
  const h = await page({ blockedStorage: true });
  await h.near();
  await h.consent(false, { gdprApplies: false, tcString: '' });
  h.document.querySelector('[data-ad-choice="allow"]').click();
  await tick();
  assert.equal(h.document.querySelector('ins'), null);
  assert.match(h.document.querySelector('[role="status"]').textContent, /saklanamadı/);
});

test('ad containers only appear in the intended entry section', () => {
  for (const [file, selector] of [
    ['hizli-okuma/index.html', '#step1 [data-site-ad="reading"]'],
    ['sinav_sitesi/index.html', '#heroSection [data-site-ad="exams"]'],
    ['ogrenci-paneli.html', '#student-section-home [data-site-ad="student-panel"]'],
    ['ogretmen-paneli.html', '#section-home [data-site-ad="teacher-panel"]'],
  ]) {
    const { document } = parseHTML(fs.readFileSync(file, 'utf8'));
    assert.ok(document.querySelector(selector), file);
    assert.equal(document.querySelectorAll('[data-site-ad]').length, 1, file);
  }
  for (const file of ['hizli-okuma/oku.html', 'sinav_sitesi/sinav.html', 'ogretmen/akvaryum.html', 'oyun/kizma_birader.html', 'giris.html']) {
    assert.doesNotMatch(fs.readFileSync(file,'utf8'), /data-site-ad|\/js\/site-adsense\.js/, file);
  }
});

test('the admin shutdown uses only the enable flag and can stop a newer configuration', async () => {
  const { window, document } = parseHTML(fs.readFileSync('admin/index.html', 'utf8'));
  let row = { ...configured, revision: randomUUID() };
  const writes = [];
  const client = {
    from(table) {
      assert.equal(table, 'site_adsense_settings');
      const conditions = {};
      let values;
      return {
        update(input) { values = input; return this; },
        eq(field, value) { conditions[field] = value; return this; },
        select() { return this; },
        async single() {
          if (values) {
            writes.push({ values, conditions });
            if (conditions.revision && conditions.revision !== row.revision) return { error: { code: 'PGRST116' } };
            row = { ...row, ...values };
          }
          return { data: row };
        },
      };
    },
  };
  vm.runInNewContext(fs.readFileSync('js/admin-adsense.js', 'utf8'), { window, document, URL, crypto: { randomUUID } });
  await window.KemalAdminAdSense.open(client);
  row = { ...row, slot_id: '2222222222', revision: randomUUID() };
  document.getElementById('adsenseDisable').click();
  await tick();
  assert.deepEqual(writes[0].conditions, { id: 1 });
  assert.equal(row.enabled, false);
  assert.equal(row.slot_id, '2222222222');
  assert.match(document.getElementById('adsenseStatus').textContent, /kapalı/);
  const revision = row.revision;
  assert.equal(document.getElementById('adsenseEnable').disabled, true);
  document.querySelectorAll('[name="adsenseCheck"]').forEach(input => { input.checked = true; input.dispatchEvent(new window.Event('change')); });
  document.getElementById('adsenseEnable').click();
  await tick();
  assert.equal(writes[1].conditions.revision, revision);
  assert.equal(row.enabled, true);
});

test('the shared administration menu exposes advertisement settings only to the owner', async () => {
  for (const profile of [{ isOwner: true }, { permissions: { site_admin_dashboard: true } }, { legacyMode: true }]) {
    const { document, window } = parseHTML('<html><body><div id="app"><div class="topbar">İçerik yönetimi</div></div></body></html>');
    window.kemalAdminAuth = { getAdminAccessProfile: async () => profile };
    vm.runInNewContext(fs.readFileSync('js/admin-shell.js', 'utf8'), { window, document });
    window.KemalAdminShell.initStandalone({ activeKey: 'main-overview' });
    await tick();
    const link = document.querySelector('[data-admin-permission-key="main-adsense"]');
    assert.equal(link.getAttribute('href'), '/admin/index.html#reklamlar');
    assert.equal(link.style.display === 'none', profile.isOwner !== true);
  }
});

test('ads.txt uses only the stored publisher and stays available while ad serving is off', async () => {
  const exports = {};
  let row = { enabled: false, publisher_id: publisher };
  vm.runInNewContext(fs.readFileSync('netlify/functions/adsense-txt.js', 'utf8'), {
    exports, AbortSignal,
    fetch: async () => ({ ok: true, json: async () => [row] }),
  });
  const result = await exports.handler({ httpMethod: 'GET' });
  assert.equal(result.statusCode, 200);
  assert.equal(result.body, 'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');
  assert.equal((await exports.handler({ httpMethod: 'HEAD' })).body, '');
  row = { publisher_id: '' };
  assert.equal((await exports.handler({ httpMethod: 'GET' })).statusCode, 404);
});
