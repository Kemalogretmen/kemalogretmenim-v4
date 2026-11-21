const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');

const window = { location: { search: '' }, kemalSiteStore: { getConfig: () => ({}) }, supabase: { createClient: () => ({}) }, addEventListener() {} };
const context = { window, document: { addEventListener() {} }, URL, URLSearchParams };
vm.runInNewContext(fs.readFileSync('js/e-kitap-kaynak.js', 'utf8'), context);
const reader = fs.readFileSync('js/e-kitap-okuyucu.js', 'utf8');
vm.runInNewContext(reader.replace(/\}\)\(\);\s*$/, 'window.readerTest = { getBookRatio, normalizeExternalUrl }; })();'), context);

test('FlipHTML5 public share links become reader links without trusting other hosts', () => {
  const { flipHtml5Url, sourceType, webUrl } = window.kemalEKitapKaynak;
  const url = 'https://online.fliphtml5.com/abcde/hello-book/#p=4';
  assert.equal(flipHtml5Url('http://fliphtml5.com/abcde/hello-book/index.html#p=4'), url);
  assert.equal(flipHtml5Url(url), url);
  for (const invalid of [
    'javascript:alert(1)', 'https://online.fliphtml5.com.example.com/abcde/book/',
    'https://fliphtml5.com@elsewhere.example/abcde/book/', 'https://test@fliphtml5.com/abcde/book/',
    'https://fliphtml5.com:8000/abcde/book/', 'https://fliphtml5.com/bookcase/abcde/',
    'https://fliphtml5.com/abcde/book/files/file.pdf',
  ]) assert.equal(flipHtml5Url(invalid), '', invalid);
  assert.equal(webUrl('file:///tmp/book.pdf'), null);
  assert.equal(sourceType({ kaynak_turu: 'external_pdf', harici_url: url }), 'fliphtml5');
  assert.equal(sourceType({ kaynak_turu: 'external_pdf', kaynak_meta: { external_provider: 'fliphtml5' } }), 'fliphtml5');
  assert.equal(sourceType({ kaynak_turu: 'external_pdf', harici_url: 'https://files.example/book.pdf' }), 'external_pdf');
});

test('landscape and square books keep their aspect ratio even with different covers', () => {
  const { getBookRatio } = window.readerTest;
  const cover = { width: 600, height: 800 };
  const wide = { width: 1024, height: 640 };
  assert.equal(getBookRatio([cover, wide, wide, cover]), 1.6);
  assert.equal(getBookRatio([wide]), 1.6);
  assert.equal(getBookRatio([{ width: 600, height: 600 }]), 1);
  assert.equal(getBookRatio([cover, null, cover]), 0.75);
});

test('external PDF queries are preserved and only Drive links use the Drive preview', () => {
  const { normalizeExternalUrl } = window.readerTest;
  assert.equal(normalizeExternalUrl('https://files.example/book.pdf?id=abc', false), 'https://files.example/book.pdf?id=abc');
  assert.equal(normalizeExternalUrl('https://drive.google.com/file/d/AbC_123/view', true), 'https://drive.google.com/file/d/AbC_123/preview');
  assert.equal(normalizeExternalUrl('https://drive.google.com/open?id=AbC_123', false), 'https://drive.google.com/uc?export=download&id=AbC_123');
  assert.equal(normalizeExternalUrl('javascript:alert(1)', true), '');
});

test('admin saves FlipHTML5 with the existing external source contract and keeps the questions', async () => {
  const { window, document } = parseHTML(fs.readFileSync('admin/e-kitap-yonetimi.html', 'utf8'));
  const writes = [];
  window.setTimeout = () => 0;
  window.clearTimeout = () => {};
  window.scrollTo = () => {};
  window.kemalAdminAuth = { getClient: () => ({
    rpc: async (name, payload) => { if (name === 'save_e_kitap_admin') writes.push(payload); return { data: [] }; },
    from: () => ({ select() { return this; }, order() { return this; }, then(resolve) { return Promise.resolve({ data: [] }).then(resolve); } }),
  }) };
  const env = { window, document, URL, console };
  vm.runInNewContext(fs.readFileSync('js/e-kitap-kaynak.js', 'utf8'), env);
  const source = fs.readFileSync('js/e-kitap-admin.js', 'utf8');
  vm.runInNewContext(source.replace(/\}\)\(\);\s*$/, 'window.adminTest = { state, setSourceType, saveBook }; })();'), env);
  const editor = window.adminTest;
  document.querySelector('#panelEdit').insertAdjacentHTML('beforeend', '<input name="grade" type="checkbox" value="4" checked>');
  Object.defineProperty(document.getElementById('fPdf'), 'files', { value: [] });
  document.getElementById('fTitle').value = 'Dijital kitap';
  document.getElementById('fWordCount').value = '150';
  document.getElementById('fTargetWpm').value = '60';
  document.getElementById('fExternalPages').value = '16';
  editor.state.questions = [{ soru_tipi: 'bosluk-doldurma', soru_metni: 'Eksik kelime?', dogru_metin: 'kitap' }];
  editor.setSourceType('fliphtml5');
  document.getElementById('fExternalUrl').value = 'https://unrelated.example/abcde/book';
  await editor.saveBook();
  assert.equal(writes.length, 0);
  document.getElementById('fExternalUrl').value = 'https://fliphtml5.com/abcde/book/';
  await editor.saveBook();
  assert.equal(writes.length, 1);
  const { p_book: book, p_questions: questions, p_pages: pages } = writes[0];
  assert.equal(book.kaynak_turu, 'external_pdf');
  assert.equal(book.kaynak_meta.external_provider, 'fliphtml5');
  assert.equal(book.harici_url, 'https://online.fliphtml5.com/abcde/book/');
  assert.equal(book.mime_type, 'text/html');
  assert.equal(book.sayfa_sayisi, 16);
  assert.equal(questions[0].dogru_metin, 'kitap');
  assert.equal(pages.length, 0);
});
