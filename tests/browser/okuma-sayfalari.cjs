const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');

const origin = process.env.READING_ORIGIN || 'http://127.0.0.1:8777';
const phrase = 'Renkli kâğıdı katlarken biçimlerin birbirine nasıl dönüştüğünü dikkatle izledik. ';
const ending = 'Okuma metninin son cümlesi burada.';
const html = '<p><strong>Başlangıç.</strong> ' + phrase.repeat(11) + '</p>' +
  Array.from({ length: 7 }, (_, i) => '<p>Bölüm ' + (i + 1) + ': ' + phrase.repeat(4) + '</p>').join('') +
  '<p id="readingFixtureLast">' + ending + '</p><div style="break-before:column">' + '<p><br></p>'.repeat(38) + '</div>';

async function swipe(page, direction) {
  await page.locator('#readingPageWindow').evaluate((node, direction) => {
    const finger = (clientX, clientY) => ({ clientX, clientY, identifier: 1 });
    const start = new Event('touchstart', { bubbles: true });
    Object.defineProperty(start, 'touches', { value: [finger(130, 120)] });
    node.dispatchEvent(start);
    const end = new Event('touchend', { bubbles: true });
    Object.defineProperty(end, 'changedTouches', { value: [finger(130 + direction * 95, 124)] });
    node.dispatchEvent(end);
  }, direction);
}

function readCount(page) {
  return page.locator('#readingPageCount').textContent().then(value => value.split(' / ').map(Number));
}

async function verifyViewport(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1 &&
    document.documentElement.scrollWidth <= innerWidth + 1 &&
    document.querySelector('.reading-pages').getBoundingClientRect().bottom <= innerHeight + 1));
}

async function verifyPaintedPage(page, path) {
  const png = await page.screenshot({ path, scale: 'css' });
  const ink = await page.evaluate(async base64 => {
    const image = new Image();
    image.src = 'data:image/png;base64,' + base64;
    await image.decode();
    const frame = document.getElementById('readingPageWindow').getBoundingClientRect();
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(frame.width);
    canvas.height = Math.floor(frame.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, Math.ceil(frame.left), Math.ceil(frame.top), canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const paper = getComputedStyle(document.querySelector('.kitap-wrapper')).backgroundColor.match(/\d+/g).map(Number);
    let ink = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (Math.abs(pixels[i] - paper[0]) + Math.abs(pixels[i + 1] - paper[1]) + Math.abs(pixels[i + 2] - paper[2]) > 160) ink++;
    }
    return ink;
  }, png.toString('base64'));
  assert.ok(ink > 25, path + ' must show ink, not a blank page');
}

async function readToEnd(page) {
  let [current, total] = await readCount(page);
  for (; current < total; current++) await page.keyboard.press('ArrowRight');
  assert.deepEqual(await readCount(page), [total, total]);
  assert.equal(await page.locator('#readingPageNextLabel').textContent(), 'Okumam bitti');
  await page.waitForFunction(ending => {
    const surface = document.querySelector('.reading-compact-surface');
    if (!surface.hidden) return surface.textContent.trim().endsWith(ending);
    const last = document.getElementById('readingFixtureLast').getBoundingClientRect();
    const page = document.getElementById('readingPageWindow').getBoundingClientRect();
    return last.left >= page.left - 1 && last.right <= page.right + 1 && last.bottom <= page.bottom + 1;
  }, ending);
}

async function verifyCompactPassage(page) {
  const normalize = text => text.replace(/\s+/g, '');
  const pages = [];
  const source = normalize(await page.locator('#readingPageFlow').textContent());
  const [, total] = await readCount(page);
  for (let i = total; i >= 1; i--) {
    const fragment = page.locator('.reading-compact-surface');
    const details = await fragment.evaluate(surface => {
      const walker = document.createTreeWalker(surface, NodeFilter.SHOW_TEXT);
      let last;
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.data.trim()) last = node;
      }
      if (!last) return null;
      const range = document.createRange();
      const end = last.data.trimEnd().length;
      range.setStart(last, end - 1);
      range.setEnd(last, end);
      return { text: surface.textContent, inFrame: range.getBoundingClientRect().bottom <= surface.getBoundingClientRect().bottom + 1 };
    });
    assert.ok(details?.inFrame, 'no cropped text on landscape page ' + i);
    pages.unshift(details.text);
    if (i > 1) await page.keyboard.press('ArrowLeft');
  }
  assert.equal(normalize(pages.join('')), source, 'all words remain in order across landscape pages');
}

(async () => {
  for (const [engine, label, viewport, colorScheme] of [
    [chromium, 'desktop', { width: 1366, height: 768 }, 'light'],
    [webkit, 'mobile', { width: 390, height: 670 }, 'dark'],
  ]) {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({
        viewport, colorScheme, reducedMotion: 'reduce',
        ...(label === 'mobile' ? { isMobile: true, hasTouch: true } : {}),
      });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
      await page.addInitScript(({ html, native }) => {
        if (!native) {
          Object.defineProperty(Element.prototype, 'requestFullscreen', { value: undefined });
          Object.defineProperty(Element.prototype, 'webkitRequestFullscreen', { value: undefined });
        }
        sessionStorage.setItem('okuma_metin', JSON.stringify({
          id: 'pagination', baslik: 'Kâğıttan Uzaya Uzanan Sanat: Origami', siniflar: [4], icerik_html: html,
          sorular: [{ soru_metni: 'Okuma bitti mi?', secenekler: [{ secenek_metni: 'Evet', dogru_mu: true }] }],
        }));
        sessionStorage.setItem('okuma_kullanici', JSON.stringify({ ad: 'Örnek', soyad: 'Öğrenci', sinif: 4 }));
      }, { html, native: label === 'desktop' });
      await page.goto(origin + '/hizli-okuma/oku.html');
      await page.locator('#hazirBtn').click();
      await page.locator('#tamMetinEkran.reading-paginated').waitFor();
      await page.waitForFunction(() => Number(document.getElementById('readingPageCount').textContent.split(' / ')[1]) > 3);
      const [first, total] = await readCount(page);
      assert.equal(first, 1);
      assert.ok(total > 3, JSON.stringify(await page.locator('#readingPageFlow').evaluate(node => ({
        width: node.clientWidth, scroll: node.scrollWidth, height: node.clientHeight, scrollHeight: node.scrollHeight,
        words: node.textContent.length, pages: document.getElementById('readingPageCount').textContent,
      }))));
      assert.equal(await page.locator('#tamMetinIcerik strong').textContent(), 'Başlangıç.');
      if (label === 'desktop') await page.waitForFunction(() => Boolean(document.fullscreenElement));
      await verifyViewport(page);
      await page.screenshot({ path: '/tmp/okuma-sayfa-bir-' + label + '.png' });
      await page.locator('#readingPageNext').click();
      assert.equal((await readCount(page))[0], 2);
      assert.equal(await page.locator('.reading-leaf').count(), 0);
      await swipe(page, 1);
      assert.equal((await readCount(page))[0], 3);
      await swipe(page, -1);
      assert.equal((await readCount(page))[0], 2);
      await page.keyboard.press('ArrowLeft');
      assert.equal((await readCount(page))[0], 1);
      await page.keyboard.press('ArrowRight');
      assert.equal((await readCount(page))[0], 2);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.waitForFunction(() => !matchMedia('(prefers-reduced-motion: reduce)').matches);
      const fold = await page.evaluate(() => {
        const button = document.getElementById('readingPageNext');
        const counter = document.getElementById('readingPageCount');
        const before = counter.textContent;
        button.click();
        const leaf = document.querySelector('.reading-leaf');
        if (!leaf) return { before, after: counter.textContent, disabled: button.disabled };
        for (const animation of leaf.getAnimations({ subtree: true })) {
          animation.pause();
          animation.currentTime = 130;
        }
        const edge = getComputedStyle(leaf.querySelector('.reading-leaf-fold'));
        return [leaf.inert, getComputedStyle(leaf).clipPath, leaf.querySelectorAll('[id]').length, edge.clipPath, edge.opacity];
      });
      assert.ok(Array.isArray(fold), label + ' renders a turning sheet: ' + JSON.stringify(fold) + JSON.stringify(errors));
      assert.equal(fold[0], true);
      assert.match(fold[1], /polygon/);
      assert.equal(fold[2], 0);
      assert.match(fold[3], /polygon/);
      assert.ok(Number(fold[4]) > .8);
      await page.screenshot({ path: '/tmp/okuma-kagit-efekti-' + label + '.png' });
      await page.locator('.reading-leaf').evaluate(leaf => leaf.getAnimations()[0].finish());
      await page.locator('.reading-leaf').waitFor({ state: 'detached' });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.keyboard.press('ArrowLeft');
      await page.waitForFunction(() => document.getElementById('sayacDisplay').textContent !== '00:00');
      if (label === 'desktop') {
        await readToEnd(page);
        await verifyPaintedPage(page, '/tmp/okuma-son-tam-ekran.png');
        await page.getByRole('button', { name: 'Tam ekrandan çık' }).click();
        await page.waitForFunction(() => !document.fullscreenElement && !document.documentElement.classList.contains('reading-focus'));
        await readToEnd(page);
        await page.keyboard.press('ArrowLeft');
      }
      const [, beforeResize] = await readCount(page);
      await page.setViewportSize({ ...viewport, height: viewport.height - 130 });
      await page.waitForFunction(total => Number(document.getElementById('readingPageCount').textContent.split(' / ')[1]) > total, beforeResize);
      assert.ok((await readCount(page))[0] >= 2);
      await readToEnd(page);
      assert.ok(await page.evaluate(() => {
        const flow = document.getElementById('readingPageFlow');
        const gap = parseFloat(getComputedStyle(flow).columnGap);
        return Math.round((flow.scrollWidth + gap) / (flow.clientWidth + gap)) >
          Number(document.getElementById('readingPageCount').textContent.split(' / ')[1]);
      }), 'the fixture must generate at least one empty physical column that is not a numbered page');
      await verifyPaintedPage(page, '/tmp/okuma-sayfa-son-' + label + '.png');
      if (label === 'mobile') {
        await page.getByRole('button', { name: 'Tam ekrandan çık' }).click();
        await page.setViewportSize({ width: 568, height: 320 });
        await page.locator('#tamMetinEkran.reading-paginated').waitFor();
        await page.waitForTimeout(120);
        await verifyViewport(page);
        await readToEnd(page);
        assert.match((await page.locator('.reading-compact-surface').textContent()).trim(), /Okuma metninin son cümlesi burada\.$/);
        await verifyPaintedPage(page, '/tmp/okuma-sayfa-yatay.png');
        await verifyCompactPassage(page);
        await readToEnd(page);
        await page.setViewportSize(viewport);
        await page.waitForTimeout(120);
      }
      await verifyViewport(page);
      await readToEnd(page);
      await verifyPaintedPage(page, '/tmp/okuma-son-yeniden-' + label + '.png');
      await page.locator('#readingPageNext').click();
      await page.waitForURL('**/sorular.html');
      assert.deepEqual(errors, []);
      console.log(label + ': page clipping, swipe directions, arrows, resize, timer and finish verified');
    } finally {
      await browser.close();
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
