// Run with Playwright available on NODE_PATH and the project served on DOCUMENT_ORIGIN.
// FABRIC_FIXTURE points at a local copy of the Fabric 5.4.1 library used by the page.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium, webkit } = require('playwright');
const origin = process.env.DOCUMENT_ORIGIN || 'http://127.0.0.1:8777';
const fabric = fs.readFileSync(process.env.FABRIC_FIXTURE, 'utf8');
const store = fs.readFileSync('js/dokuman-store.js', 'utf8');
const id = '11111111-1111-4111-8111-111111111111';
const fixture = provider => ({
  id, baslik: provider + ' Test Belgesi', aciklama: 'Geniş belge alanı', sinif: 2, ders: 'matematik',
  dosya_kaynak_turu: 'external', harici_provider: provider, icerik_turu: 'document', aktif: true,
  harici_url: provider === 'fliphtml5' ? 'https://fliphtml5.com/abcde/fghij/Matematik/' : 'https://drive.google.com/file/d/test-id/view',
  harici_embed_url: provider === 'fliphtml5' ? 'https://online.fliphtml5.com/abcde/fghij/' : 'https://drive.google.com/file/d/test-id/preview',
  dosyaUrl: '', etkilesim_json: {},
});
const reader = '<body style="margin:0;background:#e5e7eb"><button id="next" onclick="document.querySelector(\'h1\').textContent=\'Sayfa 2\'">Sonraki</button><h1 style="text-align:center">Sayfa 1</h1></body>';

async function verifyDrawingWorkshop(page, engine, width) {
  const snapshot = () => page.evaluate(key => JSON.parse(JSON.parse(localStorage.getItem(key)).pages['1']), 'kemal_dokuman_annotations_v1_' + id);
  await page.locator('#viewerFullscreenBtn').click();
  await page.waitForTimeout(250);
  const box = await page.locator('#bookRoot .upper-canvas').boundingBox();
  const point = (x, y) => ({ x: box.x + box.width * x, y: box.y + box.height * y });
  const drag = async (a, b) => {
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    await page.mouse.move(b.x, b.y, {steps: 8}); await page.mouse.up();
  };
  let count = (await snapshot()).objects.length;
  for (const [i, key] of ['single-arrow', 'double-arrow', 'dashed-arrow'].entries()) {
    await page.locator('#docArrowToggleBtn').click();
    await page.locator('#docShapeTools [data-tool="' + key + '"]').click();
    assert.equal(await page.locator('#docShapePanel').isVisible(), false, 'Picking a tool frees the drawing area');
    await drag(point(.15, .15 + i * .13), point(.43, .2 + i * .13));
    const saved = (await snapshot()).objects;
    assert.equal(saved.length, ++count);
    const arrow = saved.at(-1);
    assert.equal(arrow.type, 'group');
    assert.equal(arrow.objects.filter(object => object.type === 'triangle').length, key === 'double-arrow' ? 2 : 1);
    assert.equal(Boolean(arrow.objects[0].strokeDashArray), key === 'dashed-arrow');
  }
  for (const [i, key] of ['checkmark', 'cross', 'correct-stamp', 'wrong-stamp'].entries()) {
    await page.locator('#docStampToggleBtn').click();
    if (!i) {
      await page.locator('#stampSizeInput').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('#stampSizeValue').textContent(), '76 px');
    }
    await page.locator('#docShapeTools [data-tool="' + key + '"]').click();
    const p = point(i % 2 ? .74 : .58, i < 2 ? .26 : .62);
    await page.mouse.click(p.x, p.y);
    const objects = (await snapshot()).objects;
    assert.equal(objects.length, ++count, 'Each stamp takes a single click');
    if (key.endsWith('-stamp')) assert.ok(objects.at(-1).objects.some(object => object.text === (key === 'correct-stamp' ? '✓ DOĞRU' : '✗ YANLIŞ')));
  }
  await page.locator('#docCompassBtn').click();
  const center = point(.32, .65), rim = point(.44, .71);
  await page.mouse.move(center.x, center.y); await page.mouse.down();
  await page.mouse.move(rim.x, rim.y, {steps: 8});
  await page.screenshot({path:path.join(os.tmpdir(), 'dokuman-pergel-' + engine + '-' + width + '.png')});
  await page.mouse.up();
  const circle = (await snapshot()).objects.at(-1);
  assert.equal(circle.type, 'circle');
  assert.ok(Math.abs(circle.radius - Math.hypot(rim.x - center.x, rim.y - center.y)) < 2, 'Compass uses center-to-pointer distance as radius');
  assert.equal(circle.scaleX, circle.scaleY);
  assert.equal((await snapshot()).objects.length, ++count, 'The temporary compass guide is not saved');
  await page.keyboard.press('Control+z');
  await page.waitForFunction(({key,count}) => JSON.parse(JSON.parse(localStorage.getItem(key)).pages['1']).objects.length === count - 1, {key:'kemal_dokuman_annotations_v1_' + id,count});
  await page.keyboard.press('Control+Shift+z');
  await page.waitForFunction(({key,count}) => JSON.parse(JSON.parse(localStorage.getItem(key)).pages['1']).objects.length === count, {key:'kemal_dokuman_annotations_v1_' + id,count});
  await page.locator('#docMainTools [data-tool="edit-objects"]').click();
  const before = (await snapshot()).objects.find(object => object.type === 'group' && object.objects.some(child => child.text === '✗ YANLIŞ'));
  await drag(point(.74, .62), point(.8, .7));
  const after = (await snapshot()).objects.find(object => object.type === 'group' && object.objects.some(child => child.text === '✗ YANLIŞ'));
  assert.ok(Math.abs(after.left - before.left) > 5, 'Annotations can be moved over an embedded book in Edit mode');
  await page.locator('#docStampToggleBtn').click();
  await page.screenshot({path:path.join(os.tmpdir(), 'dokuman-atolye-' + engine + '-' + width + '.png')});
  await page.locator('#docShapeCloseBtn').click();
  await page.locator('#viewerFullscreenBtn').click();
  await page.waitForTimeout(250);
  const resizedCircle = (await snapshot()).objects.find(object => object.type === 'circle');
  assert.ok(Math.abs(resizedCircle.scaleX - resizedCircle.scaleY) < .001, 'Compass circles remain round when leaving fullscreen');
  await page.locator('#docMainTools [data-tool="select"]').click();
}

(async () => {
  for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]].filter(([name]) => !process.env.DOCUMENT_ENGINE || process.env.DOCUMENT_ENGINE === name)) {
    const executablePath = name === 'chromium' ? process.env.CHROMIUM_EXECUTABLE : process.env.WEBKIT_EXECUTABLE;
    const browser = await engine.launch({ headless: true, timeout: 15000, ...(executablePath ? { executablePath } : {}) });
    try {
      for (const width of [1440, 390]) {
        for (const provider of ['google-drive', 'fliphtml5']) {
          const page = await browser.newPage({ viewport: { width, height: 960 }, hasTouch: width === 390 });
          page.setDefaultTimeout(10000);
          const errors = [];
          let nativeDialogs = 0;
          page.on('dialog', async dialog => { nativeDialogs++; await dialog.dismiss(); });
          let readerLoads = 0;
          page.on('pageerror', e => errors.push(e.message));
          await page.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.hostname === 'online.fliphtml5.com' || url.hostname === 'drive.google.com') {
              readerLoads++;
              return route.fulfill({ body: reader, contentType: 'text/html' });
            }
            if (url.pathname.endsWith('/fabric.min.js')) return route.fulfill({ body: fabric, contentType: 'application/javascript' });
            if (url.origin !== origin) return route.abort();
            if (url.pathname === '/js/dokuman-store.js') return route.fulfill({ body: store + '\nwindow.kemalDocumentStore.getDocumentById = async () => (' + JSON.stringify(fixture(provider)) + ');', contentType: 'application/javascript' });
            if (/\/js\/(site|site-data|user-auth|content-progress|admin-auth|calisma-kagidi-store)\.js$/.test(url.pathname)) return route.fulfill({ body: '', contentType: 'application/javascript' });
            return route.continue();
          });
          await page.goto(origin + '/dokuman.html?id=' + id);
          await page.locator('.external-document-frame iframe').waitFor();
          await page.waitForFunction(() => document.querySelector('#viewerStatusLeft').textContent.includes('Doküman hazır'));
          await page.waitForTimeout(300); // Wait for the page entrance transform to finish.
          const frame = page.frameLocator('.external-document-frame iframe');
          await frame.locator('#next').click();
          await frame.locator('h1').filter({ hasText: 'Sayfa 2' }).waitFor({ timeout: 5000 });
          assert.equal(await frame.locator('h1').textContent(), 'Sayfa 2');
          const box = await page.locator('.external-document-frame').boundingBox();
          const viewport = await page.locator('#bookViewport').boundingBox();
          assert.ok(Math.abs(box.width - viewport.width) < 2 && Math.abs(box.height - viewport.height) < 2, 'Reader fills viewport: ' + JSON.stringify({ box, viewport }));
          assert.ok(box.width > (width > 860 ? width * 0.8 : width * 0.75));
          assert.equal(await page.locator('.external-document-frame iframe').getAttribute('allowfullscreen'), null);

          await page.locator('#viewerFullscreenBtn').click();
          await page.waitForFunction(() => document.querySelector('#viewerStage').classList.contains('is-viewer-fullscreen'));
          await page.waitForTimeout(250);
          assert.equal(readerLoads, 1, 'Fullscreen preserves the iframe');
          assert.equal(await frame.locator('h1').textContent(), 'Sayfa 2');
          if (name === 'chromium') assert.equal(await page.evaluate(() => document.fullscreenElement?.id), 'viewerStage');
          const tool = page.locator('#docMainTools [data-tool="pen"]');
          await tool.click();
          // Close the pen settings popup before drawing.
          await tool.click();
          const canvas = await page.locator('.upper-canvas').first().boundingBox();
          await page.mouse.move(canvas.x + canvas.width * .4, canvas.y + canvas.height * .4);
          await page.mouse.down();
          await page.mouse.move(canvas.x + canvas.width * .7, canvas.y + canvas.height * .6, { steps: 12 });
          await page.mouse.up();
          const savedObjects = () => page.evaluate(key => {
            const cache = JSON.parse(localStorage.getItem(key));
            return cache?.pages?.['1'] ? JSON.parse(cache.pages['1']).objects.length : 0;
          }, 'kemal_dokuman_annotations_v1_' + id);
          assert.equal(await savedObjects(), 1, 'Pen works in fullscreen');
          const toolBox = await page.locator('#docToolbar').boundingBox();
          assert.ok(toolBox.x >= 0 && toolBox.y >= 0 && toolBox.y + toolBox.height <= 961, 'All tools remain onscreen');
          const clear = page.locator('#docMainTools [data-tool="clear-area"]');
          await clear.click();
          assert.equal(nativeDialogs, 0, 'Clear must not open a native browser dialog in fullscreen');
          const confirmation = page.locator('#viewerConfirmDialog');
          await confirmation.locator('[value="cancel"]').click();
          assert.equal(await savedObjects(), 1, 'Cancelling clear preserves drawings');
          assert.equal(await page.locator('#viewerFullscreenBtn').getAttribute('aria-pressed'), 'true');
          await clear.click();
          await confirmation.locator('[value="confirm"]').click();
          await page.waitForFunction(key => JSON.parse(JSON.parse(localStorage.getItem(key)).pages['1']).objects.length === 0, 'kemal_dokuman_annotations_v1_' + id);
          assert.equal(await page.locator('#viewerFullscreenBtn').getAttribute('aria-pressed'), 'true', 'Clear stays in fullscreen');
          assert.equal(readerLoads, 1, 'Clear does not reload the book');
          assert.equal(await frame.locator('h1').textContent(), 'Sayfa 2');
          await page.keyboard.press('Control+z');
          await page.waitForFunction(key => JSON.parse(JSON.parse(localStorage.getItem(key)).pages['1']).objects.length === 1, 'kemal_dokuman_annotations_v1_' + id);
          await clear.click();
          await page.keyboard.press('f');
          assert.equal(await page.locator('#viewerFullscreenBtn').getAttribute('aria-pressed'), 'true', 'Viewer shortcuts are blocked while confirming');
          await confirmation.locator('[value="cancel"]').click();
          await page.locator('#viewerFullscreenBtn').click();
          await page.waitForTimeout(250);
          assert.equal(await page.locator('#viewerFullscreenBtn').getAttribute('aria-pressed'), 'false');
          assert.equal(readerLoads, 1);
          assert.equal(await savedObjects(), 1, 'Drawing survives leaving fullscreen');
          await page.keyboard.press('Control+z');
          await page.waitForFunction(key => JSON.parse(JSON.parse(localStorage.getItem(key)).pages['1']).objects.length === 0, 'kemal_dokuman_annotations_v1_' + id);
          await page.keyboard.press('Control+Shift+z');
          await page.waitForFunction(key => JSON.parse(JSON.parse(localStorage.getItem(key)).pages['1']).objects.length === 1, 'kemal_dokuman_annotations_v1_' + id);
          await page.locator('#docMainTools [data-tool="select"]').click();
          assert.equal(await frame.locator('h1').textContent(), 'Sayfa 2');
          await page.setViewportSize({ width: width === 1440 ? 1200 : 430, height: 860 });
          await page.waitForTimeout(250);
          assert.equal(readerLoads, 1, 'Window resize preserves reader position');
          assert.equal(await savedObjects(), 1);
          if (provider === 'fliphtml5') await verifyDrawingWorkshop(page, name, width);
          // Exercise the page-filling fallback used on browsers without native fullscreen.
          await page.evaluate(() => {
            document.querySelector('#viewerStage').requestFullscreen = undefined;
            document.querySelector('#viewerStage').webkitRequestFullscreen = undefined;
          });
          await page.locator('#viewerFullscreenBtn').click();
          await page.waitForTimeout(250);
          assert.equal(await page.locator('#viewerFullscreenBtn').getAttribute('aria-pressed'), 'true');
          await page.keyboard.press('Escape');
          await page.waitForTimeout(250);
          assert.equal(await page.locator('#viewerFullscreenBtn').getAttribute('aria-pressed'), 'false');
          assert.equal(readerLoads, 1);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          await page.screenshot({ path: path.join(os.tmpdir(), 'dokuman-' + name + '-' + width + '-' + provider + '.png'), fullPage: true });
          assert.deepEqual(errors, []);
          console.log(name, width, provider, 'PASS');
          await page.close();
        }
      }
      // Raster documents and magnified questions use the same tools, without an iframe.
      const imagePage = await browser.newPage({viewport:{width:1440,height:960}});
      imagePage.setDefaultTimeout(10000);
      const imageRow = { ...fixture('fliphtml5'), harici_provider: 'direct-url', dosya_adi: 'worksheet.png', dosyaUrl: origin + '/fixture-document.svg',
        etkilesim_json: {hotspots:[{id:'crop-fixture',page:1,type:'magnifier',rect:{x:.1,y:.1,w:.6,h:.3}}]} };
      await imagePage.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith('/fabric.min.js')) return route.fulfill({body:fabric,contentType:'application/javascript'});
        if (url.origin !== origin) return route.abort();
        if (url.pathname === '/fixture-document.svg') return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1400"><rect width="1000" height="1400" fill="white"/><text x="200" y="100" font-size="36">Çalışma Sayfası</text></svg>'});
        if (url.pathname === '/js/dokuman-store.js') return route.fulfill({body:store+'\nwindow.kemalDocumentStore.getDocumentById = async () => ('+JSON.stringify(imageRow)+');',contentType:'application/javascript'});
        if (/\/js\/(site|site-data|user-auth|content-progress|admin-auth|calisma-kagidi-store)\.js$/.test(url.pathname)) return route.fulfill({body:'',contentType:'application/javascript'});
        return route.continue();
      });
      await imagePage.goto(origin + '/dokuman.html?id=' + id);
      await imagePage.waitForFunction(() => document.querySelector('#viewerStatusLeft').textContent.includes('Doküman hazır'));
      await verifyDrawingWorkshop(imagePage, name, 'image');
      await imagePage.locator('[data-hotspot-id="crop-fixture"]').click();
      await imagePage.locator('#cropStage .upper-canvas').waitFor({state:'visible'});
      const cropBox = await imagePage.locator('#cropStage .upper-canvas').boundingBox();
      await imagePage.locator('#docStampToggleBtn').click();
      await imagePage.locator('#docShapeTools [data-tool="correct-stamp"]').click();
      await imagePage.mouse.click(cropBox.x + cropBox.width * .5, cropBox.y + cropBox.height * .5);
      await imagePage.locator('#docCompassBtn').click();
      await imagePage.mouse.move(cropBox.x + cropBox.width * .3, cropBox.y + cropBox.height * .4);
      await imagePage.mouse.down();
      await imagePage.mouse.move(cropBox.x + cropBox.width * .4, cropBox.y + cropBox.height * .45,{steps:8});
      await imagePage.mouse.up();
      const crop = await imagePage.evaluate(key => JSON.parse(JSON.parse(localStorage.getItem(key)).crop['crop-fixture']), 'kemal_dokuman_annotations_v1_' + id);
      assert.equal(crop.objects.length, 2);
      assert.ok(crop.objects.some(object => object.type === 'circle'));
      assert.ok(crop.objects.some(object => object.type === 'group' && object.objects.some(child => child.text === '✓ DOĞRU')));
      await imagePage.locator('#cropReturnBtn').click();
      console.log(name, 'image worksheet and magnified question tools PASS');
      await imagePage.close();
      const admin = await browser.newPage({ viewport: { width: 1280, height: 960 } });
      admin.setDefaultTimeout(10000);
      const authFixture = `
        window.fixtureDocuments = [];
        const query = () => ({
          payload: null,
          select() { return this; }, order() { return this; }, eq() { return this; },
          insert(payload) { this.payload = payload; return this; },
          update(payload) { this.payload = Object.assign({}, window.fixtureDocuments[0], payload); return this; },
          async single() { window.fixtureDocuments = [this.payload]; return { data: this.payload, error: null }; },
          then(resolve) { resolve({ data: window.fixtureDocuments, error: null }); }
        });
        window.kemalAdminAuth = { getSession: async () => ({}), hasPermission: () => true, getClient: () => ({ from: query }) };
      `;
      await admin.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) return route.abort();
        if (url.pathname === '/js/admin-auth.js') return route.fulfill({ body: authFixture, contentType: 'application/javascript' });
        if (/\/js\/(site-data|admin-shell)\.js$/.test(url.pathname)) return route.fulfill({ body: '', contentType: 'application/javascript' });
        return route.continue();
      });
      await admin.goto(origin + '/admin/dokuman-yonetimi.html');
      await admin.locator('[onclick="yeniDokuman()"]').click();
      assert.equal(await admin.locator('#fHomeFeedVisible').isChecked(), true);
      await admin.locator('label.toggle:has(#fHomeFeedVisible)').click();
      assert.equal(await admin.locator('#fHomeFeedVisible').isChecked(), false);
      assert.match(await admin.locator('#summaryFeed').textContent(), /gösterilmeyecek/);
      await admin.locator('#fBaslik').fill('FlipHTML5 Matematik');
      await admin.locator('[data-document-source="external"]').click();
      await admin.locator('#fExternalUrl').fill('<iframe src="https://online.fliphtml5.com/abcde/fghij/#p=3"></iframe>');
      await admin.locator('#fSinif').selectOption('2');
      await admin.locator('#fDers').selectOption('matematik');
      await admin.locator('[onclick="hedefEkle()"]').click();
      await admin.locator('#fSinif').selectOption('3');
      await admin.locator('#fDers').selectOption('matematik');
      await admin.locator('[onclick="hedefEkle()"]').click();
      await admin.locator('[onclick="kaydet()"]').click();
      await admin.waitForFunction(() => window.fixtureDocuments.length === 1);
      const saved = await admin.evaluate(() => window.fixtureDocuments[0]);
      assert.equal(saved.harici_provider, 'fliphtml5');
      assert.equal(saved.dosya_kaynak_turu, 'external');
      assert.equal(saved.harici_embed_url, 'https://online.fliphtml5.com/abcde/fghij/#p=3');
      assert.equal(saved.harici_url.includes('<iframe'), false);
      assert.equal(saved.etkilesim_json.homeFeedVisible, false);
      assert.equal(saved.aktif, true);
      assert.equal(saved.gizli, false);
      assert.deepEqual(saved.hedefler, [{sinif:2,ders:'matematik'}, {sinif:3,ders:'matematik'}]);
      await admin.waitForFunction(() => document.querySelector('#editTitle').textContent.startsWith('Düzenle:'));
      assert.equal(await admin.locator('#fExternalUrl').inputValue(), saved.harici_url);
      assert.equal(await admin.locator('#fHomeFeedVisible').isChecked(), false, 'The saved preference survives reopening');
      await admin.locator('#fBaslik').fill('Düzenlenen Kitap');
      await admin.locator('[onclick="kaydet()"]').click();
      await admin.waitForFunction(() => window.fixtureDocuments[0].baslik === 'Düzenlenen Kitap');
      assert.equal(await admin.evaluate(() => window.fixtureDocuments[0].etkilesim_json.homeFeedVisible), false, 'Unrelated edits preserve the choice');
      await admin.locator('label.toggle:has(#fHomeFeedVisible)').click();
      assert.equal(await admin.locator('#fHomeFeedVisible').isChecked(), true);
      await admin.locator('[onclick="kaydet()"]').click();
      await admin.waitForFunction(() => window.fixtureDocuments[0].etkilesim_json.homeFeedVisible === true);
      // The same publishing choice is supported for videos in this editor.
      await admin.locator('#panelEdit [onclick="listeye()"]').first().click();
      await admin.locator('[onclick="yeniDokuman()"]').click();
      await admin.locator('#kindVideoBtn').click();
      await admin.locator('#fBaslik').fill('Akış dışı video');
      await admin.locator('#fVideoInput').fill('https://youtu.be/dQw4w9WgXcQ');
      await admin.locator('label.toggle:has(#fHomeFeedVisible)').click();
      await admin.locator('[onclick="kaydet()"]').click();
      await admin.waitForFunction(() => window.fixtureDocuments[0].icerik_turu === 'video');
      assert.equal(await admin.evaluate(() => window.fixtureDocuments[0].etkilesim_json.homeFeedVisible), false);
      console.log(name, 'admin create, multi-target save and edit PASS');
      await admin.close();
    } finally { await browser.close(); }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
