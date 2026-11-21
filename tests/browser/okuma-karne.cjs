const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium, webkit } = require('playwright');

const origin = process.env.READING_ORIGIN || 'http://127.0.0.1:8777';
const fixture = {
  metin: { id: 'story', baslik: 'Kâğıttan Uzaya Uzanan Sanat: Origami', hedef_hiz: 120, kelime_sayisi: 94, resultDate: '2026-11-16T10:00:00Z' },
  student: { ad: 'Örnek', soyad: 'Okuyucu', okul: 'Örnek Okul', sinif: 4, accountUid: 'student-1' },
  answers: { dogru: 1, yanlis: 2, detay: [
    { soru: 'Katlama sanatı hangi ülkede ortaya çıkmıştır?', secilen: 0, secilenMetin: 'Japonya', dogruMetin: 'Japonya', isDogru: true },
    { soru: 'Metne göre origami neyi geliştirir?', secilen: 1, secilenMetin: 'Dayanıklılık', dogruMetin: 'Dikkat', isDogru: false },
    { soru: 'Hangi malzeme kullanılır?', secilen: null, secilenMetin: '—', dogruMetin: 'Kâğıt', isDogru: false },
  ] },
};

(async () => {
  for (const [engine, label, viewport] of [[chromium, 'masaüstü', { width: 1280, height: 800 }], [webkit, 'mobil', { width: 390, height: 844 }]]) {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({ viewport, acceptDownloads: true });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) return route.abort();
        if (['/js/user-auth.js', '/js/content-progress.js'].includes(url.pathname)) {
          return route.fulfill({ contentType: 'application/javascript', body: '' });
        }
        return route.continue();
      });
      await page.addInitScript(fixture => {
        const snapshot = (id, date, speed, mode = 'tam', comprehension = 80) => ({ id, date, speed, mode, comprehension });
        const remote = [
          { user_id: 'student-1', content_id: 'story', content_type: 'reading', status: 'completed', title: fixture.metin.baslik,
            detail_json: { meta: { accountUid: 'student-1', readingAttempts: [snapshot('remote-1', '2026-11-15', 100)] } } },
          { user_id: 'student-2', content_id: 'story-other', content_type: 'reading', status: 'completed', title: 'Başka hesabın metni',
            detail_json: { meta: { accountUid: 'student-2', readingAttempts: [snapshot('other-1', '2026-11-15', 120)] } } },
        ];
        const local = [{ id: 'story', type: 'reading', status: 'completed', title: fixture.metin.baslik,
          meta: { accountUid: 'student-1', readingAttempts: [snapshot('local-1', '2026-11-14', 60, 'kelime-otomatik', null)] } }];
        const state = { user: { id: 'student-1' }, profile: { role: 'student' } };
        const query = { select: () => query, eq: () => query, order: () => query, limit: () => query, abortSignal: async () => ({ data: remote }) };
        window.kemalUserAuth = {
          ready: async () => state, getState: () => state, getClient: () => ({ from: () => query, rpc: async () => ({ data: true }) }),
        };
        window.kemalContentProgress = { listRecords: () => local, markCompleted: item => { window.mockProgress = item; } };
        sessionStorage.setItem('okuma_metin', JSON.stringify(fixture.metin));
        sessionStorage.setItem('okuma_kullanici', JSON.stringify(fixture.student));
        sessionStorage.setItem('okuma_cevaplar', JSON.stringify(fixture.answers));
        sessionStorage.setItem('okuma_attempt_id', 'current');
        sessionStorage.setItem('okuma_baslangic_tarihi', fixture.metin.resultDate);
        sessionStorage.setItem('okuma_sure_sn', '60');
        sessionStorage.setItem('okuma_wpm', '94');
      }, fixture);
      await page.goto(origin + '/hizli-okuma/karne.html');
      await page.waitForFunction(() => window.mockProgress?.meta.readingAttempts?.length === 3);
      assert.deepEqual(await page.evaluate(() => window.mockProgress.meta.readingAttempts.map(x => x.id)), ['current', 'remote-1', 'local-1']);
      assert.match(await page.locator('#karneHistorySummary').textContent(), /2 önceki okuma.*-6 k\/dk/);
      assert.doesNotMatch(await page.locator('#karneHistoryChart').textContent(), /Başka hesabın metni/);
      assert.match(await page.locator('#karneHistoryChart').textContent(), /Otomatik akış/);
      assert.match(await page.locator('#karneAnswers').textContent(), /1 yanlış · 1 boş/);
      assert.equal(await page.locator('[data-answer="blank"]').count(), 1);
      assert.deepEqual(await page.locator('#karneAnswerBreakdown li').allTextContents(), ['1 doğru', '1 yanlış', '1 boş']);
      assert.equal(await page.locator('#hizBarWrap').getByText('Hedef: 120 k/dk', { exact: true }).count(), 1);
      if (label === 'mobil') await page.setViewportSize({ width: 320, height: 680 });
      assert.ok(await page.evaluate(() => {
        const current = document.getElementById('karneTempoValue').getBoundingClientRect();
        const target = document.getElementById('karneHedef').getBoundingClientRect();
        return current.bottom < target.top &&
          document.getElementById('hizBarHedef').getBoundingClientRect().width >
          document.getElementById('hizBarFill').getBoundingClientRect().width;
      }));
      await page.screenshot({ path: '/tmp/okuma-karne-grafikler-' + label + '.png', fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth &&
        [...document.querySelectorAll('body *')].filter(node => node.getBoundingClientRect().right > innerWidth + 1 &&
          !node.closest('.shortcut-dock-scroller')).slice(0, 10).map(node => [node.tagName, node.id, node.className, node.getBoundingClientRect().right]));
      assert.ok(!overflow, JSON.stringify(overflow));
      await page.getByRole('button', { name: 'Tam ekran', exact: true }).click();
      await page.locator('html.reading-focus').waitFor({ state: 'attached' });
      await page.getByRole('button', { name: 'Tam ekrandan çık' }).click();
      await page.locator('html.reading-focus').waitFor({ state: 'detached' });
      await page.getByRole('button', { name: 'Paylaş', exact: true }).click();
      const share = page.locator('#karneShareDialog');
      assert.ok(await share.isVisible());
      const summary = await share.locator('#karneShareSummary').textContent();
      assert.match(summary, /\nSüre: 1 dk 0 sn\n/);
      assert.doesNotMatch(summary, /Örnek Okul|Okuyucu/);
      assert.ok((await share.locator('#karneEmail').getAttribute('href')).startsWith('mailto:'));
      assert.ok((await share.locator('#karneWhatsapp').getAttribute('href')).startsWith('https://wa.me/'));
      await share.getByRole('button', { name: 'Kapat' }).click();
      const expected = { pdf: '25504446', jpeg: 'ffd8ff', png: '89504e470d0a1a0a' };
      for (const [format, magic] of Object.entries(expected)) {
        const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
        await page.locator('[data-format="' + format + '"]').click();
        const download = await downloadPromise;
        assert.equal(await download.failure(), null);
        const file = await fs.readFile(await download.path());
        assert.ok(file.toString('hex', 0, magic.length / 2) === magic && file.length > 1024, format + ' file');
      }
      await page.goto(origin + '/hizli-okuma/karne.html?arsiv=1');
      assert.match(await page.locator('#readingSaveStatusTitle').textContent(), /Arşivdeki karne/);
      assert.equal(await page.evaluate(() => window.mockProgress), undefined);
      assert.deepEqual(errors, []);
      console.log(label + ': karne geçmişi, arşiv, paylaşım, PDF/JPEG/PNG doğrulandı');
    } finally {
      await browser.close();
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
