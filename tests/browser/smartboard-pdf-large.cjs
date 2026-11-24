const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { chromium, webkit } = require('playwright');
const { PDFDocument, PDFName, PDFRawStream } = require('../../vendor/smartboard-pdf/pdf-lib.min.js');
const origin = process.env.WHITEBOARD_ORIGIN || 'http://127.0.0.1:8767';
async function textbook(file) {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= 451; i++) doc.addPage([600, 800]).drawText('TEXTBOOK PAGE ' + i, { x: 60, y: 650, size: 24 });
  const stream = PDFRawStream.of(doc.context.obj({}), new Uint8Array(250 * 1024 * 1024));
  doc.catalog.set(PDFName.of('TestTextbookData'), doc.context.register(stream));
  await fs.writeFile(file, await doc.save({ useObjectStreams: false }));
}
(async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'smartboard-large-'));
  try {
    const book = path.join(folder, 'Textbook-250MB.pdf');
    await textbook(book);
    const bytes = (await fs.stat(book)).size;
    assert(bytes > 250 * 1024 * 1024);
    for (const [name, engine, width, executablePath] of [['chromium', chromium, 1440, process.env.CHROMIUM_EXECUTABLE], ['webkit', webkit, 390, process.env.WEBKIT_EXECUTABLE]].filter(x => !process.env.PDF_ENGINE || x[0] === process.env.PDF_ENGINE)) {
      const browser = await engine.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
      try {
        const page = await browser.newPage({ viewport: { width, height: 1000 }, hasTouch: true, isMobile: width < 700 });
        page.setDefaultTimeout(90000);
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('dialog', d => d.accept());
        await page.route('**/*', r => new URL(r.request().url()).origin === origin ? r.continue() : r.abort());
        await page.addInitScript(() => {
          window.localReads = [];
          const original = Blob.prototype.arrayBuffer;
          Blob.prototype.arrayBuffer = function () {
            window.localReads.push(this.size);
            if (this.size > 2 * 1024 * 1024) throw Error('Unexpected whole-file read on the UI thread');
            return original.call(this);
          };
        });
        await page.goto(origin + '/ogretmen/beyaztahta.html', { waitUntil: 'load' });
        await page.locator('#whiteboardStage').evaluate(e => e.scrollIntoView({ block: 'start', behavior: 'instant' }));
        async function ready(number) {
          await page.waitForFunction(n => {
            const s = document.querySelector('#whiteboardStage');
            return document.querySelector('#boardPlane.has-pdf') && !s.hasAttribute('data-pdf-busy') && !s.hasAttribute('data-pdf-rendering') && document.querySelector('.pdf-page-nav input').value === String(n);
          }, number);
          assert.equal(await page.locator('.pdf-status.is-error').count(), 0);
        }
        await page.locator('#smartboardPdfInput').setInputFiles(book);
        await ready(1);
        assert.match(await page.locator('.pdf-count').textContent(), /451/);
        await page.locator('.pdf-page-nav input').fill('430');
        await page.locator('.pdf-page-nav input').press('Enter');
        await ready(430);
        const read = await page.evaluate(() => ({ bytes: localReads.reduce((a, b) => a + b, 0), max: Math.max(...localReads) }));
        assert(read.bytes < 8 * 1024 * 1024, 'opening does not read the entire 250MB source: ' + JSON.stringify(read));
        assert(read.max <= 262144);
        const preview = await page.locator('#whiteboardPreviewCanvas').boundingBox();
        await page.mouse.move(preview.x + preview.width * .4, preview.y + preview.height * .5);
        await page.mouse.down();
        await page.mouse.move(preview.x + preview.width * .6, preview.y + preview.height * .5, { steps: 20 });
        await page.mouse.up();
        const ink = () => page.locator('#whiteboardCanvas').evaluate(c => c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v));
        assert(await ink());
        await page.waitForTimeout(2200);
        assert.match(await page.locator('.pdf-cache-status').textContent(), /24 MB/);
        const cached = await page.evaluate(() => new Promise((resolve, reject) => {
          const r = indexedDB.open('kemal-smartboard-pdf-v1');
          r.onerror = reject;
          r.onsuccess = () => { const db = r.result, tx = db.transaction('session'), get = tx.objectStore('session').get('source'); tx.oncomplete = () => { db.close(); resolve(!!get.result); }; };
        }));
        assert.equal(cached, false, 'the textbook is not copied into persistent browser storage');
        await page.locator('#whiteboardStage').screenshot({ path: `/tmp/large-pdf-${name}-${width}.png` });
        if (name === 'chromium') {
          await page.locator('[data-pdf=menu]').click();
          const downloading = page.waitForEvent('download');
          await page.locator('[data-pdf=project]').click();
          const download = await downloading, project = path.join(folder, 'Textbook.tahta');
          await download.saveAs(project);
          assert.equal(await download.failure(), null);
          assert((await fs.stat(project)).size > bytes);
          await page.locator('#smartboardPdfInput').setInputFiles(project);
          await ready(430);
          assert(await ink(), 'large editable archive retains annotations');
          await page.locator('[data-pdf=menu]').click();
          const exporting = page.waitForEvent('download');
          await page.locator('[data-pdf=export]').click();
          const exported = await exporting;
          const output = await PDFDocument.load(await fs.readFile(await exported.path()));
          assert.equal(output.getPageCount(), 451, 'large PDF export keeps all pages');
        }
        // A rejected new file must not destroy the already-open textbook.
        await page.locator('#smartboardPdfInput').setInputFiles({ name: 'Invalid.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not a PDF') });
        await page.locator('.pdf-status.is-error').waitFor();
        assert.equal(await page.locator('.pdf-page-nav input').inputValue(), '430');
        assert(await ink());
        assert.deepEqual(errors, []);
        console.log(`PASS ${name} ${width}: ${(bytes / 1048576).toFixed(1)}MB / 451 pages, ${(read.bytes / 1048576).toFixed(1)}MB read, ink, no oversized cache, ${name === 'chromium' ? 'large project roundtrip and PDF export, ' : ''}failed-open recovery`);
      } finally { await browser.close(); }
    }
  } finally { await fs.rm(folder, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exitCode = 1; });
