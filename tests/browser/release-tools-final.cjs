const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium, webkit } = require('playwright');
const { PDFDocument } = require('../../vendor/smartboard-pdf/pdf-lib.min.js');
const origin = process.env.WHITEBOARD_ORIGIN || 'http://127.0.0.1:8767';
(async () => {
  for (const [name, engine, executablePath] of [['chromium', chromium, process.env.CHROMIUM_EXECUTABLE], ['webkit', webkit, process.env.WEBKIT_EXECUTABLE]]) {
    const browser = await engine.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
    try {
      for (const width of [390, 1440]) {
        const page = await browser.newPage({ viewport: { width, height: 900 }, hasTouch: true, isMobile: width < 700 });
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('dialog', d => d.accept());
        await page.route('**/*', r => new URL(r.request().url()).origin === origin ? r.continue() : r.abort());
        await page.goto(origin + '/ogretmen/hucre-laboratuvari.html', { waitUntil: 'load' });
        assert.equal(await page.locator('.cell-lab-fallback').count(), 3);
        assert(await page.locator('#btnDim3D').isDisabled());
        await page.locator('[onclick="switchModule(\'cell\')"]').click();
        await page.locator('#cell2DContainer.active img').first().waitFor();
        assert(await page.locator('#cell2DContainer img').first().evaluate(i => i.complete && i.naturalWidth > 0));
        await page.locator('[onclick="switchModule(\'evaluation\')"]').click();
        assert(await page.locator('#examCardsGrid button').count() > 0);
        await page.screenshot({ path: `/tmp/release-lab-${name}-${width}.png` });

        await page.goto(origin + '/ogretmen/belge-studyo.html', { waitUntil: 'load' });
        await page.locator('[data-tab="text"]').click();
        for (const id of ['btnInsertFrac', 'btnInsertRad']) {
          const button = page.locator('#' + id);
          await button.scrollIntoViewIfNeeded();
          const r = await button.boundingBox();
          assert(r.x >= 0 && r.x + r.width <= width + 1, id + ' stays inside the drawer');
          await button.click();
        }
        for (const selector of ['.rail [data-tab="layers"]', '#ctxAddQuickWhiteout']) {
          const control = page.locator(selector);
          if (!await control.count()) continue;
          await control.scrollIntoViewIfNeeded();
          const r = await control.boundingBox();
          assert(r.x >= 0 && r.x + r.width <= width + 1, selector + ' is reachable by scrolling');
        }

        await page.goto(origin + '/ogretmen/poster-yazici.html', { waitUntil: 'load' });
        await page.locator('#btnLoadSample').click();
        await page.waitForFunction(() => !document.querySelector('#btnDownloadPdf').disabled);
        await page.locator('#btnToggleGuidesVis').scrollIntoViewIfNeeded();
        const guide = await page.locator('#btnToggleGuidesVis').boundingBox();
        assert(guide.x >= 0 && guide.x + guide.width <= width + 1, 'guide toggle fits');
        await page.locator('#btnToggleGuidesVis').click();
        const downloading = page.waitForEvent('download');
        await page.locator('#btnDownloadPdf').click();
        const download = await downloading, file = await download.path();
        assert.equal(await download.failure(), null);
        const pdf = await PDFDocument.load(await fs.readFile(file));
        assert(pdf.getPageCount() >= 4, 'poster export has tiled pages');
        assert.deepEqual(errors, []);
        console.log(`PASS ${name} ${width}: no-WebGL 2D lab, formula controls, scrollable toolbar, poster PDF export`);
        await page.close();
      }
    } finally { await browser.close(); }
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
