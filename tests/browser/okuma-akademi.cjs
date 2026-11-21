const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const origin = process.env.READING_ORIGIN || 'http://127.0.0.1:8777';

const readerFixture = {
  id: 'test-reading', baslik: 'Deneme metni', siniflar: [1, 2, 3, 4, 5, 6, 7, 8],
  icerik: 'Bir küçük deneme.', icerik_html: '<p><strong>Bir</strong> <span style="color:#f7f7f7">küçük</span></p><p>deneme.</p>',
  goruntuleme_modu: 'tam', kelime_ms: 450, kelime_sayisi: 3,
  sorular: [{ id: 'q1', soru_metni: 'Hangi metni okudun?', secenekler: [
    { id: 'correct', secenek_metni: 'Deneme', dogru_mu: true }, { id: 'wrong', secenek_metni: 'Başka metin' }
  ] }]
};

async function openReader(page, overrides = {}) {
  await page.evaluate(({ fixture, overrides }) => {
    sessionStorage.clear();
    sessionStorage.setItem('okuma_metin', JSON.stringify({ ...fixture, ...overrides }));
    sessionStorage.setItem('okuma_kullanici', JSON.stringify({ ad: 'Örnek', soyad: 'Öğrenci', sinif: 2, sube: 'A' }));
  }, { fixture: readerFixture, overrides });
  await page.goto(origin + '/hizli-okuma/oku.html');
  await page.waitForFunction(() => !document.getElementById('hazirBtn').disabled);
}

async function verifyLayout(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
}

async function reader(page, label) {
  await openReader(page);
  await page.getByRole('radio', { name: 'Tam metin', exact: true }).check();
  await page.locator('#hazirBtn').click();
  await page.waitForFunction(() => document.documentElement.classList.contains('reading-focus'));
  assert.equal(await page.locator('#tamMetinIcerik > p').count(), 2);
  assert.equal(await page.locator('#tamMetinIcerik strong').textContent(), 'Bir');
  assert.deepEqual(await page.evaluate(() => {
    const title = getComputedStyle(document.getElementById('tamMetinBaslik'));
    const body = getComputedStyle(document.getElementById('tamMetinIcerik'));
    const span = document.querySelector('#tamMetinIcerik p span');
    const dark = document.documentElement.dataset.theme === 'dark';
    return [title.fontFamily === body.fontFamily, span.classList.contains('reading-low-contrast') === !dark, body.backgroundColor];
  }), [true, true, 'rgba(0, 0, 0, 0)']);
  await page.waitForFunction(() => document.getElementById('sayacDisplay').textContent !== '00:00');
  await verifyLayout(page);
  await page.screenshot({ path: '/tmp/okuma-odak-' + label + '.png' });
  if (label === 'mobile') await page.keyboard.press('Escape');
  else await page.getByRole('button', { name: 'Tam ekrandan çık' }).click();
  await page.waitForFunction(() => !document.documentElement.classList.contains('reading-focus'));
  await page.getByRole('button', { name: 'Tam ekran', exact: true }).click();
  await page.locator('.bitti-btn').click();
  await page.waitForURL('**/sorular.html');
  await page.waitForFunction(() => document.documentElement.classList.contains('reading-focus'));
  assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('okuma_secili_akis')).flow), 'tam');
  await page.getByRole('button', { name: /Deneme/ }).first().click();
  await page.locator('#ileriBtn').click();
  await page.locator('.modal-btn-bitir').click();
  await page.waitForURL('**/karne.html');
  assert.equal(await page.locator('html').evaluate(node => node.classList.contains('reading-focus')), false);
  assert.match(await page.locator('#karneHedef').textContent(), /^Hedef: \d+ k\/dk$/);
  assert.equal(await page.locator('#anlamaYuzde').textContent(), '%100');
  await page.screenshot({ path: '/tmp/okuma-karne-' + label + '.png', fullPage: true });

  await openReader(page);
  await page.getByRole('radio', { name: 'Kelime kelime', exact: true }).check();
  await page.getByRole('radio', { name: 'Tıklayarak' }).check();
  await verifyLayout(page);
  await page.locator('#hazirBtn').click();
  assert.equal(await page.locator('#kkKelime').textContent(), 'Bir');
  await page.locator('#kkKelime').click();
  assert.equal(await page.locator('#kkKelime').textContent(), 'küçük');
  await page.locator('#readingWordBack').click();
  assert.equal(await page.locator('#kkKelime').textContent(), 'Bir');
  await page.locator('#readingWordNext').click();
  await page.locator('#readingWordNext').click();
  assert.equal(await page.locator('#kkKelime').textContent(), 'deneme.');
  await page.locator('#readingWordNext').click();
  await page.waitForURL('**/sorular.html');
  assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('okuma_secili_akis')).flow), 'kelime-tikla');

  await openReader(page);
  await page.getByRole('radio', { name: 'Kelime kelime', exact: true }).check();
  assert.equal(await page.locator('#readingWordMs').inputValue(), '1000');
  await page.locator('#readingWordMs').fill('600');
  await page.screenshot({ path: '/tmp/okuma-secim-' + label + '.png' });
  await page.locator('#hazirBtn').click();
  assert.match(await page.locator('#kkSpeedLabel').textContent(), /0,6 sn/);
  await page.getByRole('button', { name: 'Yavaşlat' }).click();
  assert.match(await page.locator('#kkSpeedLabel').textContent(), /0,7 sn/);
  await page.waitForURL('**/sorular.html');
  await page.getByRole('button', { name: /Deneme/ }).first().click();
  await page.locator('#ileriBtn').click();
  await page.locator('.modal-btn-bitir').click();
  await page.waitForURL('**/karne.html');
  await page.waitForFunction(() => document.getElementById('karneHizBaslik').textContent === 'Gösterim temposu');
  assert.equal(await page.locator('#karneHizBaslik').textContent(), 'Gösterim temposu');
  assert.equal(await page.locator('#karneAkisNotu').isVisible(), true);
  await page.waitForFunction(() => window.mockReadingSave?.detay_json?.ogrenci_okuma_akisi === 'kelime-otomatik');
  assert.equal(await page.evaluate(() => window.mockReadingSave.dogru_sayisi), 1);

  await openReader(page, { siniflar: [2], goruntuleme_modu: 'kelime', tikla_mod: true });
  assert.equal(await page.locator('#readingChoice').isVisible(), false);
  await page.locator('#hazirBtn').click();
  await page.locator('#kkHint').waitFor();
  assert.equal(await page.evaluate(() => sessionStorage.getItem('okuma_secili_akis')), null);
}

async function academy(page, label, colorScheme) {
  await page.goto(origin + '/hizli-okuma/akademi.html');
  await page.evaluate(scheme => window.kemalTheme.setPreference(scheme), colorScheme);
  assert.equal(await page.locator('html').getAttribute('data-theme'), colorScheme);
  await page.waitForFunction(() => !document.documentElement.classList.contains('theme-changing'));
  if (colorScheme === 'dark') {
    assert.equal(await page.locator('main').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(19, 28, 27)');
    assert.equal(await page.locator('.ra-level').last().evaluate(node => getComputedStyle(node).color), 'rgb(238, 248, 243)');
  }
  await verifyLayout(page);
  assert.equal(await page.locator('.ra-activity').count(), 5);
  assert.ok(await page.locator('#mainNav').isVisible());
  assert.ok(await page.locator('#shortcutDock').isVisible());
  await page.screenshot({ path: '/tmp/okuma-akademi-' + label + '.png' });
  await page.locator('[data-activity="hece"]').click();
  await page.getByRole('button', { name: 'kale', exact: true }).click();
  assert.match(await page.locator('#raFeedback').textContent(), /Doğru yanıt: kalem/);
  for (const answer of [0, 2, 0]) {
    await page.locator('#raNext').click();
    await page.locator('[data-answer="' + answer + '"]').click();
  }
  await page.locator('#raNext').click();
  assert.match(await page.locator('.ra-results').textContent(), /3 \/ 4/);
  await page.locator('#raDone').click();
  await page.reload();
  assert.match(await page.locator('#raProgress').textContent(), /1 \/ 5/);
  await page.locator('#raCategory').selectOption('attention');
  assert.equal(await page.locator('.ra-activity').count(), 2);
  await page.locator('[data-activity="satir-izi"]').click();
  assert.equal(await page.locator('#raSentenceMode').getAttribute('aria-pressed'), 'true');
  await page.locator('#raNextParagraph').click();
  assert.match(await page.locator('#raParagraphCount').textContent(), /^2 \/ /);
  await page.locator('#raPrevParagraph').click();
  assert.match(await page.locator('.ra-passage p:visible').textContent(), /Mert mavi/);
  await page.locator('#raBack').click();
  await page.locator('#raCategory').selectOption('');

  await page.locator('[data-activity="saksi-tekrar"]').click();
  await page.locator('#raTimed').click();
  await page.locator('#raFocusMode').click();
  assert.equal(await page.locator('[data-paragraph]:visible').count(), 1);
  await page.locator('#raNextParagraph').click();
  assert.equal(await page.locator('#raParagraphCount').textContent(), '2 / 3');
  await page.waitForFunction(() => document.getElementById('raClock').textContent !== '0:00');
  await page.locator('#raReadDone').click();
  await page.locator('#raSecond').click();
  await page.locator('#raReadDone').click();
  await page.locator('[data-answer="0"]').click();
  await page.locator('#raNext').click();
  await page.locator('[data-answer="1"]').click();
  await page.locator('#raNext').click();
  assert.match(await page.locator('.ra-results').textContent(), /İlk okuma.+Tekrar okuma/);
  await page.locator('#raDone').click();

  await page.getByRole('radio', { name: '3–4. sınıf' }).check();
  await page.locator('[data-activity="kitap-ozet"]').click();
  await page.locator('#raDraft').fill('Defne ve Aras öyküyü birlikte okudu.');
  await page.getByRole('button', { name: 'Örnek yanıtla karşılaştır' }).click();
  await page.locator('.ra-criteria input').first().check();
  await page.locator('#raFinishWriting').click();
  assert.match(await page.locator('.ra-results').textContent(), /1 \/ 3/);
  await page.locator('#raDone').click();

  await page.getByRole('radio', { name: '5–8. sınıf' }).check();
  await page.locator('[data-activity="deney-kanit"]').click();
  await page.locator('#raReadDone').click();
  await page.getByText('Metne dön', { exact: true }).click();
  assert.equal(await page.locator('.ra-review .ra-passage').isVisible(), true);
  await verifyLayout(page);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('okuma_metin')), null);
}

async function adminResults(page) {
  const rows = [
    { id: 'manual', ad: 'Örnek', soyad: 'Öğrenci', dakika_kelime: 40, detay_json: { attempt_status: 'completed', attempt_id: 'a' } },
    { id: 'auto', ad: 'İkinci', soyad: 'Öğrenci', dakika_kelime: 140, detay_json: { attempt_status: 'completed', attempt_id: 'b', ogrenci_okuma_akisi: 'kelime-otomatik' } }
  ].map(row => ({ metin_adi: 'Deneme', sinif: 2, hedef_hiz: 60, okuma_suresi_sn: 5, toplam_soru: 1, anlama_yuzdesi: 100, ...row }));
  await page.addInitScript(rows => {
    window.kemalAdminAuth = {
      getSession: async () => ({}),
      ensureCurrentPageAccess: async () => ({}),
      getClient: () => ({ from: () => ({ select: () => ({ order: async () => ({ data: rows }) }) }) })
    };
  }, rows);
  await page.route(url => url.pathname === '/js/admin-auth.js' || url.pathname === '/js/admin-shell.js',
    route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.goto(origin + '/admin/okuma-sonuclari.html');
  await page.waitForFunction(() => document.getElementById('sToplam').textContent === '2');
  assert.equal(await page.locator('#sOrtWpm').textContent(), '40 k/dk');
  assert.equal(await page.locator('#sEnIyi').textContent(), '40 k/dk');
  assert.equal(await page.locator('#sOrtAnlama').textContent(), '100%');
}

(async () => {
  for (const [engine, label, viewport, colorScheme] of [
    [chromium, 'desktop', { width: 1366, height: 768 }, 'light'],
    [webkit, 'mobile', { width: 390, height: 844 }, 'dark']
  ]) {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({ viewport, colorScheme });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        window.supabase = { createClient: () => ({
          auth: {
            getSession: async () => ({ data: { session: null } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
          },
          rpc: async (name, args) => {
            if (name === 'submit_reading_result') window.mockReadingSave = args.p_payload;
            return { data: null, error: null };
          }
        }) };
      });
      if (label === 'mobile') await page.addInitScript(() => {
        Object.defineProperty(Element.prototype, 'requestFullscreen', { value: undefined });
        Object.defineProperty(Element.prototype, 'webkitRequestFullscreen', { value: undefined });
      });
      await page.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
      await academy(page, label, colorScheme);
      await reader(page, label);
      await adminResults(page);
      assert.deepEqual(errors, []);
      console.log(label + ': academy, full text, manual words, adjustable automatic words and report verified');
    } finally {
      await browser.close();
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
