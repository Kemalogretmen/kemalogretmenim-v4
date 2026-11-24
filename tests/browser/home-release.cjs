const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const origin = process.env.HOME_ORIGIN || 'http://127.0.0.1:8767';
(async () => {
  for (const [name, engine, executablePath] of [['chromium', chromium, process.env.CHROMIUM_EXECUTABLE], ['webkit', webkit, process.env.WEBKIT_EXECUTABLE]]) {
    const browser = await engine.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
    try {
      for (const [width, height] of [[1440, 900], [390, 844], [320, 568], [667, 375]]) {
        const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: width < 700, colorScheme: width === 390 ? 'dark' : 'light' });
        const page = await context.newPage(), errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.route('**/*', r => new URL(r.request().url()).origin === origin ? r.continue() : r.abort());
        await page.goto(origin + '/', { waitUntil: 'load' });
        const dialog = page.locator('.site-release-dialog');
        await dialog.waitFor({ state: 'visible' });
        assert.equal(await dialog.locator('.site-release-section').count(), 11);
        assert.equal(await dialog.getAttribute('data-release-version'), '2026-11-24');
        await page.screenshot({ path: `/tmp/release-home-start-${name}-${width}.png` });
        const r = await dialog.boundingBox();
        assert(r.x >= 0 && r.y >= 0 && r.x + r.width <= width + 1 && r.y + r.height <= height + 1);
        assert(await dialog.locator('.site-release-content').evaluate(e => e.clientHeight > 50 && e.scrollHeight > e.clientHeight));
        await dialog.locator('.site-release-done').focus();
        await page.keyboard.press('Tab');
        assert(await dialog.locator('.site-release-dismiss').evaluate(e => e === document.activeElement));
        await dialog.locator('.site-release-content').evaluate(e => { e.scrollTop = e.scrollHeight; });
        await dialog.locator('h3').last().scrollIntoViewIfNeeded();
        const last = await dialog.locator('h3').last().boundingBox(), content = await dialog.locator('.site-release-content').boundingBox();
        assert(last.y >= content.y && last.y + last.height <= content.y + content.height);
        await page.screenshot({ path: `/tmp/release-home-${name}-${width}.png` });
        await page.keyboard.press('Escape');
        assert(await dialog.isHidden());
        assert.equal(await page.evaluate(() => document.body.style.overflow), '');
        await page.reload({ waitUntil: 'load' });
        assert.equal(await dialog.count(), 0, 'no automatic repeat after reload');
        await page.locator('[data-release-open]').click();
        await dialog.waitFor({ state: 'visible' });
        assert.equal(await dialog.locator('.site-release-content').evaluate(e => e.scrollTop), 0);
        assert(await dialog.locator('h3').first().isVisible());
        await dialog.locator('.site-release-done').click();
        assert(await dialog.isHidden());
        assert.deepEqual(errors, []);
        console.log(`PASS ${name} ${width}x${height}: once, reopen, scroll, focus, viewport`);
        await context.close();
      }
    } finally { await browser.close(); }
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
