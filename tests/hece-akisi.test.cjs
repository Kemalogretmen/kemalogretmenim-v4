const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const core = require('../js/hece-akisi-core.js');

test('hece birimlerini virgül ve satır sonlarından temizler', () => {
  assert.deepEqual(core.parseUnits('n, ta; le\n ri , n'), ['n', 'ta', 'le', 'ri', 'n']);
});

test('dakikadaki birim hızını geçen süreye göre hesaplar', () => {
  assert.equal(core.calculateWpm(20, 30000), 40);
  assert.equal(core.calculateWpm(0, 30000), 0);
});

test('manuel oturum son dokunuşta tamamlanır', () => {
  let time = 1000;
  const session = core.createSession({ fixed_unit: 'sa', falling_units: ['n', 't'] }, () => time);
  assert.equal(session.start().current, 'n');
  time = 2000;
  assert.equal(session.next().current, 't');
  time = 4000;
  const result = session.next();
  assert.equal(result.complete, true);
  assert.equal(result.elapsedMs, 3000);
  assert.equal(result.wordsPerMinute, 40);
});

test('süre ayarı güvenli aralığa alınır', () => {
  assert.equal(core.normalizeInterval(50), 300);
  assert.equal(core.normalizeInterval(20000), 10000);
  assert.equal(core.normalizeInterval(1500), 1500);
});

test('hece akışı ana admin ve ortak okuma menüsünde ilk yüklemede bulunur', () => {
  const adminPage = fs.readFileSync('admin/index.html', 'utf8');
  const adminShell = fs.readFileSync('js/admin-shell.js', 'utf8');

  assert.match(adminPage, /<div class="admin-nav-submenu">[\s\S]*href="\/admin\/okuma-editor\.html">Okuma Metinleri<\/a>[\s\S]*href="\/admin\/hece-akisi\.html">Hece Akışı<\/a>/);
  assert.match(adminShell, /key: 'hece-akisi-admin'[\s\S]*href: '\/admin\/hece-akisi\.html'/);
});
