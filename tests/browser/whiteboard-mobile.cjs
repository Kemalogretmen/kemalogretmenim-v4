const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const origin = process.env.WHITEBOARD_ORIGIN || 'http://127.0.0.1:8766';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

(async () => {
  for (const [name, engine, executablePath] of [
    ['chromium', chromium, process.env.CHROMIUM_EXECUTABLE],
    ['webkit', webkit, process.env.WEBKIT_EXECUTABLE]
  ]) {
    const browser = await engine.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
    try {
      for (const [width, legacyTouch] of [[320, false], [390, false], [390, true]]) {
        const page = await browser.newPage({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
        page.setDefaultTimeout(15000);
        if(legacyTouch) await page.addInitScript(() => { window.PointerEvent = undefined; });
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
        await page.goto(origin + '/ogretmen/beyaztahta.html', { waitUntil: 'load' });
        await page.locator('#whiteboardStage').evaluate(el => el.scrollIntoView());
        await page.locator('#sandGroupBtn').tap();
        const canvas = page.locator('#sandCanvas');
        await page.waitForTimeout(200);
        const box = await canvas.boundingBox();
        assert(box.width > 200 && box.height > 200, `${name}: usable mobile sand area`);
        assert(box.x >= 0 && box.x + box.width <= width, 'Sand fits the phone');
        const p = { x: box.x + box.width * .35, y: box.y + box.height * .45 };
        await page.touchscreen.tap(p.x, p.y);
        const alpha = () => canvas.evaluate(c => c.getContext('2d').getImageData(Math.floor(c.width * .35), Math.floor(c.height * .45), 1, 1).data[3]);
        assert(await alpha() < 80, `${name}: native touch leaves a sand mark`);
        if (name === 'chromium') {
          const cdp = await page.context().newCDPSession(page);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y, id: 1 }] });
          for (let i = 1; i <= 12; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x + i * 5, y: p.y + i * 3, id: 1 }] });
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          const tipAlpha = await canvas.evaluate((c, p) => { const r = c.getBoundingClientRect(); return c.getContext('2d').getImageData(Math.floor((p.x - r.left) * c.width / r.width), Math.floor((p.y - r.top) * c.height / r.height), 1, 1).data[3]; }, { x: p.x + 60, y: p.y + 36 });
          assert(tipAlpha < 80, 'Native swipe draws at the actual finger tip');
          assert(await alpha() < 80, 'Side ridges cannot refill the center of an existing groove');
        }
        await page.locator('#sandboxLayer [data-sand-mode="plain"]').tap();
        assert.equal(await page.locator('#sandGuideText').textContent(), '');
        await page.locator('#sandboxLayer [data-sand-mode="guided"]').tap();
        await page.locator('#sandGroupBtn').tap();
        await page.locator('#sandFontSelect').selectOption('nunito');
        assert.match(await page.locator('#sandGuideText').evaluate(el => el.style.fontFamily), /Nunito/);
        await page.locator('#sandFontSelect').selectOption('ttkb');
        await page.locator('[data-close-panel="sandSubPanel"]').tap();
        assert(await page.evaluate(async () => (await document.fonts.load('400 32px "TTKB Dik Temel Abece"')).length > 0));
        assert(await page.evaluate(async () => (await document.fonts.load('700 32px "TTKB Dik Temel Abece"')).length > 0));
        await page.setViewportSize({ width: width + 20, height: 800 });
        await page.waitForTimeout(350);
        assert(await alpha() < 100, 'Resizing preserves existing sand marks');
        const screenshot = path.join(os.tmpdir(), `whiteboard-sand-${name}-${width}${legacyTouch ? '-legacy' : ''}.png`);
        await page.screenshot({ path: screenshot });
        assert(fs.statSync(screenshot).size > 5000);
        assert.deepEqual(errors, []);
        console.log(`PASS ${name} ${width} ${legacyTouch ? 'legacy Touch Events' : 'Pointer Events'}: native touch, font files, modes, resize preservation`);
        await page.close();
      }
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      page.setDefaultTimeout(15000);
      await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
      await page.goto(origin + '/ogretmen/beyaztahta.html', { waitUntil: 'load' });
      await page.locator('#whiteboardStage').evaluate(el => el.scrollIntoView());
      await page.locator('[data-board-tool="text"]').click();
      await page.locator('#boardFontSelect').selectOption('ttkb');
      await page.locator('[data-text-weight="700"]').click();
      await page.locator('[data-close-panel="textTools"]').click();
      await page.locator('#whiteboardPreviewCanvas').click({ position: { x: 550, y: 200 } });
      await page.locator('.board-overlay-text').fill('İlk yazım');
      assert.match(await page.locator('.board-overlay-text').evaluate(el => getComputedStyle(el).fontFamily), /TTKB/);
      await page.locator('.board-overlay-text').press('Enter');
      await page.waitForTimeout(2000);
      const saved = await page.evaluate(() => Object.values(localStorage).map(s => { try { return JSON.parse(s); } catch { return null; } }).find(o => o && o.pages));
      assert.equal(saved.pages[0].items.at(-1).textFont, 'ttkb');
      assert.equal(saved.pages[0].items.at(-1).textWeight, '700');
      await page.reload({ waitUntil: 'load' });
      assert.equal(await page.locator('#boardFontSelect').inputValue(), 'ttkb');
      for (const url of ['/index.html', '/ogretmen/beyaztahta.html']) {
        await page.goto(origin + url, { waitUntil: 'load' });
        assert.equal(await page.locator('#shortcutDock a[href="/index.html"]').count(), 1);
        assert.equal(await page.locator('#shortcutDock a[href="/ogretmen/akvaryum.html"]').count(), 1);
        if(await page.locator('#shortcutDockReopen').isVisible()) await page.locator('#shortcutDockReopen').click();
        const centered = await page.locator('#shortcutDockHandle').evaluate(el => {
          const outer = el.getBoundingClientRect(), children = [...el.children].map(c => c.getBoundingClientRect());
          return Math.abs((Math.min(...children.map(r => r.left)) + Math.max(...children.map(r => r.right))) / 2 - (outer.left + outer.width / 2)) < 1;
        });
        assert(centered, 'The dock alignment grip is centered, not missing at the corner');
        await page.locator('#shortcutDockHandle').click();
        assert.equal(await page.locator('#shortcutDock').getAttribute('data-position'), 'right');
        await page.locator('#shortcutDockReset').click();
      }
      console.log(`PASS ${name}: persisted TTKB text and weight; Home/Aquarium coexist; alignment grip works`);
      await page.close();
    } finally { await browser.close(); }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
