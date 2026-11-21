const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium, webkit } = require('playwright');

const root = path.resolve(__dirname, '../..');
const origin = 'https://admin.test';
const settings = {
  enabled: false,
  publisher_id: 'ca-pub-1234567890123456',
  slot_id: '1234567890',
  article_ids: [],
  placements: ['home', 'games'],
  revision: 'test-revision',
};
const authFixture = `
  window.testAdminProfile = { isOwner: true, active: true, permissions: {}, email: 'admin@example.test' };
  window.testAdSettings = ${JSON.stringify(settings)};
  window.testAdWrites = [];
  const adminClient = {
    rpc: async () => ({ data: {} }),
    from: table => {
      if (table !== 'site_adsense_settings') throw Error('Unexpected table');
      let update;
      const query = {
        select: () => query,
        eq: () => query,
        update: values => { update = values; return query; },
        single: async () => {
          if (update) {
            window.testAdWrites.push(update);
            window.testAdSettings = { ...window.testAdSettings, ...update };
          }
          return { data: window.testAdSettings };
        },
      };
      return query;
    },
  };
  window.kemalAdminAuth = {
    getSession: async () => ({}),
    getUser: async () => ({ email: 'admin@example.test' }),
    getAdminAccessProfile: async () => window.testAdminProfile,
    getAdminPermissionDefs: () => [],
    listAdminUsers: async () => [],
    listAdminLoginEvents: async () => [],
    getClient: () => adminClient,
    humanizeError: error => error.message,
  };
`;
const shellFixture = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="/css/admin-shell.css">
  </head><body><div id="app"><div class="topbar">İçerik yönetimi</div></div>
  <script src="/js/admin-auth.js"></script><script src="/js/admin-shell.js"></script>
  <script>window.KemalAdminShell.initStandalone({ activeKey: 'main-overview' });</script>
  </body></html>`;

async function installRoutes(page) {
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname === '/sidebar-fixture') return route.fulfill({ body: shellFixture, contentType: 'text/html' });
    if (url.pathname === '/js/admin-auth.js') return route.fulfill({ body: authFixture, contentType: 'application/javascript' });
    try {
      let body = await fs.readFile(path.join(root, url.pathname));
      if (url.pathname === '/js/site-data.js') {
        body = body.toString() + '\nwindow.kemalSiteStore.loadSiteData = async () => window.kemalSiteStore.getDefaults();';
      }
      return route.fulfill({ body, contentType: types[path.extname(url.pathname)] });
    } catch {
      return route.fulfill({ status: 404 });
    }
  });
}

async function checkScroll(page, sidebar, submenu, last) {
  const clipped = await submenu.evaluate(element => element.scrollHeight > element.clientHeight + 1);
  assert.equal(clipped, false, 'An expanded menu must expose every item to the sidebar scroller');
  await sidebar.evaluate(element => { element.scrollTop = 0; });
  const bounds = await sidebar.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + Math.min(150, bounds.height / 2));
  await page.mouse.wheel(0, 800);
  const sidebarSelector = '.' + (await sidebar.getAttribute('class')).split(' ')[0];
  await page.waitForFunction(selector => {
    const element = document.querySelector(selector);
    return element.scrollTop > 0;
  }, sidebarSelector);
  if (page.viewportSize().width < 500 && page.context().browser().browserType().name() === 'chromium') {
    await sidebar.evaluate(element => { element.scrollTop = 0; });
    const cdp = await page.context().newCDPSession(page);
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height * 0.8;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    for (let step = 1; step <= 10; step++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 20, id: 1 }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.ok(await sidebar.evaluate(element => element.scrollTop) > 0, 'Touch must scroll the sidebar');
    await cdp.detach();
  }
  await last.focus();
  assert.equal(await last.evaluate(element => {
    const box = element.getBoundingClientRect();
    const parent = element.closest('.sidebar, .admin-nav-sidebar').getBoundingClientRect();
    return box.top >= parent.top && box.bottom <= parent.bottom + 1;
  }), true, 'Keyboard focus must scroll the last item into view');
}

(async () => {
  for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await engine.launch({ headless: true });
    try {
      for (const [width, height] of [[1440, 900], [1024, 500], [768, 600], [390, 844]]) {
        const page = await browser.newPage({ viewport: { width, height }, hasTouch: true });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await installRoutes(page);
        await page.goto(origin + '/admin/index.html');
        await page.locator('#dashboard').waitFor({ state: 'visible' });
        await checkScroll(page, page.locator('.sidebar'), page.locator('[data-admin-group="site-admin"] .admin-nav-submenu'), page.locator('#btn-yedek'));
        await page.locator('#btn-reklamlar').click();
        await page.getByText('Reklam yayını kapalı.', { exact: true }).waitFor();
        assert.equal(await page.locator('#adsensePublisher').inputValue(), settings.publisher_id);
        assert.equal(await page.locator('[name="adsensePlacement"]:checked').count(), 2);
        assert.equal(await page.locator('#adsenseEnable').isEnabled(), true);
        assert.equal(await page.locator('#adsenseFields').evaluate(element => element.scrollWidth <= element.clientWidth), true, 'The form must fit narrow screens');
        await page.locator('#adsenseDisable').click();
        await page.waitForFunction(() => window.testAdWrites.length === 1);
        assert.equal(await page.evaluate(() => window.testAdSettings.enabled), false);
        if (name === 'chromium' && width === 1440) {
          await page.locator('#panel-reklamlar').screenshot({ path: '/tmp/kemal-admin-reklam-ayarlari.png' });
        }
        await page.goto(origin + '/sidebar-fixture');
        const link = page.locator('[data-admin-permission-key="main-adsense"]');
        await link.waitFor({ state: 'visible' });
        assert.equal(await link.getAttribute('href'), '/admin/index.html#reklamlar');
        await checkScroll(page, page.locator('.admin-nav-sidebar'), page.locator('[data-admin-group="site-admin"] .admin-nav-submenu'), page.locator('[data-admin-permission-key="main-yedek"]'));
        assert.deepEqual(errors, []);
        console.log(`PASS ${name} ${width}x${height}. Menu scrolling, keyboard access and advertisement settings.`);
        await page.close();
      }
    } finally {
      await browser.close();
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
