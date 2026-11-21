const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, webkit } = require('playwright');
const { parse, asReadingQuestion } = require('../../js/okuma-soru-aktar');
const example = fs.readFileSync(path.join(__dirname, '../fixtures/gobeklitepe-sorular.txt'), 'utf8');
const origin = process.env.READING_ORIGIN || 'http://127.0.0.1:8777';

async function preview(page, button, text) {
  await page.locator(button).click();
  await page.locator('#readingImportText').fill(text);
  await page.locator('[data-parse]').click();
}

async function browserTest(engine, viewport) {
  const browser = await engine.launch();
  try {
    const width = viewport.width;
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/js/admin-auth.js' || url.pathname === '/js/admin-shell.js') {
        return route.fulfill({ contentType: 'application/javascript', body: '' });
      }
      return url.origin === origin ? route.continue() : route.abort();
    });
    await page.addInitScript(() => {
      const list = () => ({ select: list, order: list, then: resolve => resolve({ data: [], error: null }) });
      window.kemalAdminAuth = {
        getClient: () => ({ from: list, rpc: async () => ({ data: [] }) }),
        getSession: async () => ({}), ensureCurrentPageAccess: async () => ({}), hasAnyPermission: () => true,
      };
      window.Quill = class {
        static import() { return { Attributor: { Style: class {} }, Scope: {} }; }
        static register() {}
        constructor(selector) {
          this.root = document.querySelector(selector);
          this.clipboard = { dangerouslyPasteHTML: html => { this.root.innerHTML = html; } };
        }
        on() {}
        format() {}
        getText() { return this.root.textContent; }
        setText(value) { this.root.textContent = value; }
        setContents() { this.root.replaceChildren(); }
      };
    });

    await page.goto(origin + '/admin/okuma-editor.html');
    await page.evaluate(() => {
      window.editAc({ id: '00000000-test', baslik: 'Göbeklitepe', icerik: 'Bir deneme metni.', sinif: 3 });
      window.wizardGit(3);
      window.soruEkle('coktan-secmeli', {
        soru_metni: 'El ile girilen soru', secenekler: ['İlk', 'İkinci', 'Son'].map((text, i) => ({ secenek_metni: text, dogru_mu: i === 0 })),
      });
    });
    await preview(page, '#bulkReadingQuestions', example);
    assert.equal(await page.locator('.reading-import-results > li').count(), 10);
    assert.equal(await page.locator('.reading-import-results select').first().inputValue(), '-1');
    await page.locator('.reading-import-results select').first().selectOption('1');
    await page.screenshot({ path: '/tmp/okuma-soru-aktar-' + width + '.png' });
    await page.locator('[data-append]').click();
    assert.equal(await page.locator('#soruList .soru-item').count(), 11);
    assert.equal(await page.locator('#soruList .soru-input').first().inputValue(), 'El ile girilen soru');
    assert.equal(await page.locator('#soruList .soru-item').nth(1).locator('input[type="radio"]').nth(1).isChecked(), true);
    assert.equal(await page.locator('#soruList .soru-item').nth(2).locator('input:checked').count(), 0);
    await preview(page, '#bulkReadingQuestions', example);
    assert.match(await page.locator('.reading-import-status').textContent(), /10 tekrar atlandı/);
    assert.equal(await page.locator('[data-append]').isDisabled(), true);
    await page.keyboard.press('Escape');
    await page.locator('#wizardNextButton').click();
    await page.getByText(/3\. soruda tam olarak 1 doğru cevap/).waitFor();

    await page.goto(origin + '/admin/e-kitap-yonetimi.html');
    await page.locator('#newBookButton').click();
    await preview(page, '#bulkBookQuestions', example + '\nCevap Anahtarı: 1-B');
    await page.locator('[data-append]').click();
    assert.equal(await page.locator('#questionList .question-card').count(), 10);
    assert.equal(await page.locator('#questionList .question-card').first().locator('input[type="radio"]').nth(1).isChecked(), true);
    assert.equal(await page.locator('#questionList .question-card').nth(1).locator('input:checked').count(), 0);

    await page.goto(origin + '/admin/okuma-akademisi.html');
    await preview(page, '#bulkAcademyQuestions', example);
    await page.locator('[data-append]').click();
    assert.equal(await page.locator('.ac-question').count(), 10);
    assert.equal(await page.locator('.ac-question [data-field="correct"]').first().inputValue(), '');

    await page.evaluate(questions => {
      sessionStorage.setItem('okuma_metin', JSON.stringify({ baslik: 'Göbeklitepe', sorular: questions }));
      sessionStorage.setItem('okuma_kullanici', JSON.stringify({ ad: 'Öğrenci' }));
    }, parse(example).slice(-1).map(asReadingQuestion));
    await page.goto(origin + '/hizli-okuma/sorular.html');
    const question = page.locator('.soru-metin');
    assert.equal(await question.evaluate(node => getComputedStyle(node).fontSize), width < 640 ? '23px' : '30px');
    assert.equal(await page.locator('.secenek-btn').first().evaluate(node => getComputedStyle(node).fontSize), width < 640 ? '18px' : '20px');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator('.secenek-btn').nth(2).click();
    assert.equal(await page.locator('.secenek-btn.secili').count(), 1);
    await page.screenshot({ path: '/tmp/okuma-soru-ekrani-' + width + '.png', fullPage: true });
    assert.deepEqual(errors, []);
    console.log(width + 'px: all three editors, deduplication, answer validation and student typography passed');
  } finally {
    await browser.close();
  }
}

(async () => {
  await browserTest(chromium, { width: 1366, height: 768 });
  await browserTest(webkit, { width: 390, height: 844 });
})().catch(error => { console.error(error); process.exitCode = 1; });
