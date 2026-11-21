const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const origin = process.env.READING_ORIGIN || 'http://127.0.0.1:8087';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1240, height: 820 } });
  const page = await context.newPage();
  const id = '9432647d-f2f3-49d8-9c74-35a3febcb42d';
  let cloudRow;
  try {
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/rest/v1/reading_academy_activities') {
        await route.fulfill({ json: cloudRow?.is_published ? [cloudRow] : [] });
      } else if (url.pathname === '/js/admin-auth.js' || url.pathname === '/js/user-auth.js') {
        await route.fulfill({ contentType: 'application/javascript', body: '' });
      } else if (route.request().url().startsWith(origin + '/')) {
        if (url.pathname === '/test/academy-save' && route.request().method() === 'POST') {
          cloudRow = { id, ...route.request().postDataJSON() };
          await route.fulfill({ json: { data: cloudRow, error: null } });
        } else {
          await route.continue();
        }
      } else {
        await route.abort();
      }
    });
    await page.addInitScript(() => {
      window.supabase = { createClient: (_url, _key, options) => ({
        from: table => {
          let payload;
          const filters = {};
          return {
            select() { return this; }, eq(key, value) { filters[key] = value; return this; },
            order() { return this; }, insert(row) { payload = row; return this; }, update(row) { payload = row; return this; },
            async single() {
              return (await fetch('/test/academy-save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })).json();
            },
            then(resolve) {
              if (table === 'syllable_streams') {
                if (options.auth.persistSession !== false || filters.status !== 'published' || filters.visibility !== 'public') {
                  return resolve({ data: [], error: { message: 'Bad public query' } });
                }
                return resolve({ data: [{ id: 'test-hece', title: 'SA hece çalışması', grade_level: 1, mode: 'manual' }], error: null });
              }
              return resolve({ data: [], error: null });
            }
          };
        }
      }) };
      window.kemalAdminAuth = {
        getSession: async () => ({ user: { id: 'admin' } }),
        getClient: () => window.supabase.createClient(),
        ensureCurrentPageAccess: async () => ({}),
        hasAnyPermission: () => true
      };
      window.kemalUserAuth = { ready: async () => {}, getState: () => ({}) };
    });
    await page.goto(origin + '/hizli-okuma/hece-akisi.html');
    await page.getByRole('heading', { name: 'SA hece çalışması' }).waitFor();
    assert.ok(await page.locator('#mainNav').isVisible());
    assert.ok(await page.locator('#shortcutDock').isVisible());
    await page.selectOption('#catalogGrade', '2');
    await page.getByText(/Bu sınıf düzeyinde/).waitFor();
    await page.goto(origin + '/hizli-okuma/e-kitaplar.html');
    assert.ok(await page.locator('#mainNav').isVisible());
    assert.ok(await page.locator('#shortcutDock').isVisible());

    await page.goto(origin + '/admin/okuma-akademisi.html');
    await page.getByText('Henüz eklenen çalışma yok.').waitFor();
    await page.locator('#acTitle').fill('<em>Yönetici çalışması</em>');
    await page.locator('#acSkill').fill('Gözlem');
    await page.locator('#acTask').fill('Doğru seçeneği seç.');
    await page.locator('[data-field="prompt"]').fill('Hangisi doğru?');
    await page.locator('[data-field="A"]').fill('Birinci');
    await page.locator('[data-field="B"]').fill('İkinci');
    await page.locator('[data-field="correct"]').selectOption('A');
    await page.locator('[data-field="explain"]').fill('Doğru cevap birinci.');
    await page.locator('#acPreview').click();
    assert.equal(await page.locator('#acPreviewDialog em').count(), 0);
    await page.getByRole('button', { name: 'Önizlemeyi kapat' }).click();
    await page.locator('#acDraft').click();
    await page.getByText(/Taslak kaydedildi/).waitFor();
    assert.equal(cloudRow.is_published, false);

    const visitor = await context.newPage();
    await visitor.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/rest/v1/reading_academy_activities') await route.fulfill({ json: cloudRow?.is_published ? [cloudRow] : [] });
      else if (route.request().url().startsWith(origin + '/')) await route.continue();
      else await route.abort();
    });
    await visitor.goto(origin + '/hizli-okuma/akademi.html');
    assert.equal(await visitor.locator('[data-activity^="academy-"]').count(), 0);
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#acPublish').click();
    await page.getByText(/Yayınlandı/).waitFor();
    assert.equal(cloudRow.is_published, true);
    await visitor.reload();
    const card = visitor.locator('[data-activity="academy-' + id + '"]');
    await card.waitFor();
    assert.equal(await card.locator('em').count(), 0);
    await card.click();
    await visitor.getByRole('heading', { name: 'Hangisi doğru?' }).waitFor();
    console.log('Reading chrome, public hece list, and academy draft/preview/publish verified');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
