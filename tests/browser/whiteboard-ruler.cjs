// Run against a local preview with Playwright installed (both Chromium and WebKit).
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const path = require('node:path');
const os = require('node:os');

(async () => {
  for (const [name, engine, executablePath] of [
    ['chromium', chromium, process.env.CHROMIUM_EXECUTABLE],
    ['webkit', webkit, process.env.WEBKIT_EXECUTABLE]
  ]) {
    const browser = await engine.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto((process.env.WHITEBOARD_ORIGIN || 'http://127.0.0.1:8766') + '/ogretmen/beyaztahta.html', { waitUntil: 'networkidle' });
      await page.locator('#whiteboardStage').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await page.locator('#boardProtractorBtn').click();
      await page.locator('[data-math-tool="ruler"]').click();
      await page.locator('#mathLength').fill('6');
      await page.locator('#mathLength').dispatchEvent('change');
      await page.locator('[data-close-panel="mathSubPanel"]').click();
      const point = (x, y) => page.locator('#mathGeometry').evaluate((el, p) => {
        const result = new DOMPoint(p.x, p.y).matrixTransform(el.getScreenCTM());
        return { x: result.x, y: result.y };
      }, { x, y });
      async function move(dx, dy) {
        const p = await point(80, 23);
        await page.mouse.move(p.x, p.y); await page.mouse.down();
        await page.mouse.move(p.x + dx, p.y + dy, { steps: 8 }); await page.mouse.up();
      }
      for (const zoom of [1, 1.18]) {
        if (zoom !== 1) {
          await page.locator('#pageGroupBtn').click();
          await page.locator('#boardZoomInBtn').click();
          await page.locator('#pageGroupBtn').click();
        }
        for (const target of [-45, -90, -135, -175, 45, 90, 135, 0]) {
          await move(6, 2);
          const start = await point(192, -30), origin = await point(0, 0);
          const hit = await page.evaluate(p => document.elementFromPoint(p.x, p.y)?.getAttribute('data-drag'), start);
          assert.equal(hit, 'rotate', `${name}: handle remains interactive before rotating to ${target}`);
          const current = Number(await page.locator('#mathRotation').inputValue());
          const radius = Math.hypot(start.x - origin.x, start.y - origin.y);
          const startAngle = Math.atan2(start.y - origin.y, start.x - origin.x);
          const delta = (target - current) * Math.PI / 180;
          await page.mouse.move(start.x, start.y); await page.mouse.down();
          for (let i = 1; i <= 12; i++) {
            const a = startAngle + delta * i / 12;
            await page.mouse.move(origin.x + radius * Math.cos(a), origin.y + radius * Math.sin(a));
          }
          await page.mouse.up(); await page.waitForTimeout(40);
          const actual = Number(await page.locator('#mathRotation').inputValue());
          assert(Math.abs(actual - target) <= 1, `${name}: expected ${target}, got ${actual}`);
          assert.equal(await page.locator('.math-rotation-label').textContent(), `${actual}°`);
        }
      }
      await page.screenshot({ path: path.join(os.tmpdir(), `whiteboard-ruler-${name}.png`) });
      assert.deepEqual(errors, []);
      console.log(`PASS ${name}: repeated move/rotate in both directions, zoom and visible angle`);
    } finally {
      await browser.close();
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
