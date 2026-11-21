const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const { jsPDF } = require('../../ogretmen-ajandasi/vendor/jspdf.umd.min.js');

const origin = process.env.EBOOK_ORIGIN || 'http://127.0.0.1:8777';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ebook-reader-'));
const readerScript = fs.readFileSync('js/e-kitap-okuyucu.js', 'utf8').replace(/\}\)\(\);\s*$/, 'window.readerTest = { state, prepareReader }; })();');
const readerPath = '/hizli-okuma/e-kitap-oku.html?id=test';
const libraries = [
  'https://cdn.jsdelivr.net/npm/page-flip@2.0.7/dist/js/page-flip.browser.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
];

function makePdf() {
  const pdf = new jsPDF({ unit: 'pt', format: [600, 800], orientation: 'portrait' });
  for (const [index, size] of [[600, 800], [1024, 640], [1024, 640], [600, 800]].entries()) {
    if (index) pdf.addPage(size, size[0] > size[1] ? 'landscape' : 'portrait');
    pdf.setFillColor(35 + index * 45, 75, 160);
    pdf.rect(0, 0, size[0], size[1], 'F');
    pdf.setTextColor(255);
    pdf.text(`Page ${index + 1}`, 30, 50);
  }
  return Buffer.from(pdf.output('arraybuffer'));
}

async function exercise(page, book, assets) {
  const pdf = makePdf();
  await page.route('**/*', async route => {
    const url = route.request().url();
    if (assets.has(url)) return route.fulfill({ body: assets.get(url), contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' } });
    if (url.startsWith('https://online.fliphtml5.com/')) return route.fulfill({ body: '<p>Hosted flipbook</p>', contentType: 'text/html' });
    if (!url.startsWith(origin + '/')) return route.abort();
    const pathname = new URL(url).pathname;
    if (pathname === '/book-test.pdf') return route.fulfill({ body: pdf, contentType: 'application/pdf' });
    if (pathname === '/js/e-kitap-okuyucu.js') return route.fulfill({ body: readerScript, contentType: 'application/javascript' });
    if (['/js/site-data.js', '/js/user-auth.js', '/js/meb-schools.js', '/js/content-progress.js'].includes(pathname)) return route.fulfill({ body: '', contentType: 'application/javascript' });
    return route.continue();
  });
  await page.addInitScript(book => {
    window.kemalSiteStore = { getConfig: () => ({}), getTurkeyCities: () => [] };
    window.supabase = { createClient: () => ({
      from(table) {
        const data = table === 'e_kitaplar' ? book : table === 'e_kitap_sorulari'
          ? [{ id: 'q', soru_tipi: 'bosluk-doldurma', soru_metni: 'Bir cevap yaz.', dogru_metin: 'deneme' }] : [];
        return { select() { return this; }, eq() { return this; }, order() { return this; }, maybeSingle() { return this; }, then(resolve) { return Promise.resolve({ data }).then(resolve); } };
      },
      rpc: async () => ({ data: null }),
      storage: { from: () => ({ download: async () => ({ data: await (await fetch('/book-test.pdf')).blob() }) }) },
    }) };
  }, book);
  page.on('dialog', dialog => dialog.accept());
  await page.goto(origin + readerPath);
  await page.locator('#introStage.active').waitFor();
  await page.evaluate(() => readerTest.prepareReader());
  await page.locator('#bookStage.active').waitFor();
}

async function verifyHinge(page, button) {
  await page.locator(button).click();
  const moving = await page.waitForFunction(() => {
    const bounds = readerTest.state.pageFlip.getBoundsRect();
    const sheet = [...document.querySelectorAll('.ebook-page[style*="rotateY("]')].find(node => node.style.display !== 'none');
    if (!sheet) return false;
    const style = getComputedStyle(sheet);
    const pivot = parseFloat(style.left) + parseFloat(style.transformOrigin) + new DOMMatrix(style.transform).m41;
    return { top: Math.abs(parseFloat(style.top) - bounds.top), spine: Math.abs(pivot - (bounds.left + bounds.pageWidth)) };
  });
  const offsets = await moving.jsonValue();
  assert.ok(offsets.top < 1 && offsets.spine < 1, `Hard cover stays at the spine: ${JSON.stringify(offsets)}`);
  await page.waitForFunction(() => readerTest.state.pageFlip.getState() === 'read');
}

(async () => {
  const assets = new Map();
  for (const url of libraries) {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
    assert.ok(response.ok, url);
    assets.set(url, Buffer.from(await response.arrayBuffer()));
  }
  const browser = await chromium.launch();
  const book = { id: 'test', baslik: 'Oran denemesi', sinif: 4, sayfa_sayisi: 4, kelime_sayisi: 100, kaynak_turu: 'supabase_pdf', dosya_yolu: 'test.pdf' };
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await exercise(page, book, assets);
      assert.equal(await page.evaluate(() => readerTest.state.pageFlip.getOrientation()), width === 1440 ? 'landscape' : 'portrait');
      const sheetRatio = async index => {
        const sheet = page.locator('.ebook-page img').nth(index);
        await sheet.waitFor();
        return sheet.evaluate(img => img.offsetWidth / img.offsetHeight);
      };
      assert.ok(Math.abs(await sheetRatio(0) - 0.75) < 0.015);
      await verifyHinge(page, '#toolbarNext');
      assert.ok(Math.abs(await sheetRatio(1) - 1.6) < 0.02);
      await page.screenshot({ path: path.join(dir, `pages-${width}.png`) });
      if (width === 390) {
        await page.locator('#toolbarNext').click();
        await page.waitForFunction(() => readerTest.state.pageFlip.getState() === 'read');
      }
      if (width === 1440) await verifyHinge(page, '#toolbarNext');
      else await page.locator('#toolbarNext').click();
      await page.waitForFunction(() => readerTest.state.currentPage === 3 && readerTest.state.pageFlip.getState() === 'read');
      assert.ok(Math.abs(await sheetRatio(3) - 0.75) < 0.015);
      if (width === 1440) await verifyHinge(page, '#toolbarPrevious');
      else {
        await page.locator('#toolbarPrevious').click();
        await page.waitForFunction(() => readerTest.state.currentPage === 2 && readerTest.state.pageFlip.getState() === 'read');
      }
      await page.setViewportSize({ width, height: 690 });
      await page.waitForFunction(() => Math.abs(parseFloat(document.querySelector('#bookRoot').style.getPropertyValue('--book-top')) - readerTest.state.pageFlip.getBoundsRect().top) < 1);
      if (width === 1440) await verifyHinge(page, '#toolbarPrevious');
      assert.deepEqual(errors, []);
      await page.close();
    }
    const external = await browser.newPage({ viewport: { width: 390, height: 850 } });
    await exercise(external, { ...book, kaynak_turu: 'external_pdf', harici_url: 'https://fliphtml5.com/abcde/book/#p=2', kaynak_meta: { external_provider: 'fliphtml5' } }, assets);
    assert.equal(await external.locator('#externalFrame').getAttribute('src'), 'https://online.fliphtml5.com/abcde/book/#p=2');
    await external.frameLocator('#externalFrame').getByText('Hosted flipbook').waitFor();
    assert.ok(await external.locator('#readerExternalLink').isVisible());
    assert.equal(await external.locator('#toolbarNext').isVisible(), false);
    await external.locator('#finishReadingButton').click();
    await external.locator('#quizStage.active').waitFor();
    assert.equal(await external.evaluate(() => readerTest.state.readingActive), false);
    console.log('PASS: PDF dimensions, desktop/mobile cover hinge, resize, FlipHTML5 and finish-to-quiz. Evidence: ' + dir);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
