const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');

function sharedShell() {
  const { window, document } = parseHTML('<html><head></head><body><main></main></body></html>');
  window.location = {
    pathname: '/', search: '', hash: '',
    href: 'https://kemalogretmenim.com.tr/',
    origin: 'https://kemalogretmenim.com.tr',
  };
  window.innerWidth = 1440;
  window.setTimeout = () => 1;
  window.kemalContentFeed = { getAllItems: async () => [] };
  window.kemalUserAuth = { getStudentGradeLevel: () => null };
  const source = fs.readFileSync('js/site.js', 'utf8');
  const bootstrap = source.indexOf('  const seoState = initSeo();');
  vm.runInNewContext(source.slice(0, bootstrap) + `
    window.ebookNavTest = { renderChrome };
  })();`, { window, document, URL, URLSearchParams, localStorage: { getItem: () => null, setItem: () => {} } });
  window.ebookNavTest.renderChrome({});
  return document;
}

test('e-kitaplık ortak menü, ana sayfa, 1. sınıf ve site haritasında görünür', () => {
  const shell = sharedShell();
  const readingMenu = shell.getElementById('platformReadingMenu');
  assert.ok(readingMenu);
  for (const href of [
    '/hizli-okuma/index.html',
    '/hizli-okuma/e-kitaplar.html',
    '/hizli-okuma/hece-akisi.html',
    '/hizli-okuma/karne.html',
  ]) assert.ok(readingMenu.querySelector(`a[href="${href}"]`), href);

  const homepage = parseHTML(fs.readFileSync('index.html', 'utf8')).document;
  const gradePage = parseHTML(fs.readFileSync('siniflar/1-sinif.html', 'utf8')).document;
  assert.ok(homepage.querySelector('.home-area[href="/hizli-okuma/e-kitaplar.html"]'));
  assert.ok(gradePage.querySelector('.sp-card[href="/hizli-okuma/e-kitaplar.html"]'));
  assert.match(fs.readFileSync('sitemap.xml', 'utf8'), /hizli-okuma\/e-kitaplar\.html/);
});
