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
  placement = 'article', pathname = '/makale.html', search = placement === 'article' ? '?id=' + articleId : '', profile } = {}) {
  const { document, window } = parseHTML(`<html><head></head><body><main><div id="anchor" data-site-ad="${placement}"></div></main></body></html>`);
  const anchor = document.getElementById('anchor');
  Object.defineProperty(anchor, 'clientWidth', { value: 320 });
  window.location = { origin, pathname, search };
  window.kemalSiteStore = { getConfig: () => ({ supabaseUrl: 'https://example.test', supabaseAnonKey: 'test' }) };
  window.kemalUserAuth = { ready: async () => {}, getProfile: () => profile };
  const requests = [];
  let consentListener, intersectionListener;
  if (hasCmp) window.__tcfapi = (_command, _version, listener) => { consentListener = listener; };
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
    document, requests,
    near: () => intersectionListener?.([{ isIntersecting: true }]),
    consent: granted => consentListener?.({
      cmpStatus: 'loaded', tcString: 'test-consent', eventStatus: 'useractioncomplete',
      purpose: { consents: { 1: granted } }, vendor: { consents: { 755: granted } },
    }, true),
  };
}

test('AdSense waits until the article ends and Google has visitor consent, then renders once', async () => {
  const h = await page();
  h.consent(true);
  assert.equal(h.requests.length, 0);
  h.near();
  h.near();
  await tick();
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].options.cache, 'no-store');
  assert.equal(h.document.querySelectorAll('ins.adsbygoogle').length, 1);
  assert.equal(h.document.querySelector('ins.adsbygoogle').dataset.adClient, publisher);
  assert.equal(h.document.querySelector('ins.adsbygoogle').dataset.adSlot, '9876543210');
  assert.equal(h.document.querySelectorAll('script[src*="googlesyndication"]').length, 1);
  h.consent(false);
  assert.equal(h.document.querySelector('ins.adsbygoogle'), null);
});

test('AdSense fails closed for missing consent, disabled settings, ineligible articles and preview domains', async () => {
  for (const [options, consent, count] of [
    [{}, false, 0],
    [{ hasCmp: false }, true, 0],
    [{ settings: { ...configured, enabled: false } }, true, 1],
    [{ settings: { ...configured, article_ids: [] } }, true, 1],
    [{ settings: { ...configured, publisher_id: 'invalid' } }, true, 1],
    [{ origin: 'http://localhost:8087' }, true, 0],
  ]) {
    const h = await page(options);
    h.near();
    h.consent(consent);
    await tick();
    assert.equal(h.requests.length, count);
    assert.equal(h.document.querySelector('script[src*="googlesyndication"]'), null);
    assert.equal(h.document.querySelector('ins.adsbygoogle'), null);
  }
});

test('only selected entry pages and authorised panels request age-restricted ads', async () => {
  const student = { role: 'student', approval_status: 'active' };
  for (const [options, ageTreatment] of [
    [{ placement: 'home', pathname: '/' }, '1'],
    [{ placement: 'reading', pathname: '/hizli-okuma/index.html' }, '1'],
    [{ placement: 'student-panel', pathname: '/ogrenci-paneli', profile: student }, '1'],
    [{ placement: 'student-panel', pathname: '/ogrenci-paneli' }, null],
    [{ placement: 'reading', pathname: '/hizli-okuma/', search: '?metinId=123' }, null],
    [{ placement: 'reading', pathname: '/hizli-okuma/oku.html' }, null],
    [{ placement: 'exams', pathname: '/sinav_sitesi/sinav.html' }, null],
    [{ placement: 'home', pathname: '/ogretmen/akvaryum.html' }, null],
    [{ placement: 'games', pathname: '/oyun/oyunlar' }, null],
  ]) {
    const h = await page(options);
    h.consent(true);
    h.near();
    await tick();
    assert.equal(h.document.querySelector('ins.adsbygoogle')?.getAttribute('data-tag-for-age-treatment') ?? null, ageTreatment, options.pathname);
  }
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
