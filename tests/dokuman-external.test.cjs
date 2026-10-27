const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { URL, window: { location: { origin: 'https://example.test' } } };
vm.runInNewContext(fs.readFileSync('js/dokuman-store.js', 'utf8'), context);
const normalize = context.window.kemalDocumentStore.normalizeExternalDocumentInput;

test('FlipHTML5 public book links become hosted readers and retain starting page', () => {
  const book = normalize('https://fliphtml5.com/abcde/fghij/Matematik/#p=12');
  assert.equal(book.provider, 'fliphtml5');
  assert.equal(book.originalUrl, 'https://fliphtml5.com/abcde/fghij/Matematik/#p=12');
  assert.equal(book.embedUrl, 'https://online.fliphtml5.com/abcde/fghij/#p=12');
  assert.equal(book.directUrl, book.embedUrl);
  assert.equal(book.fileSize, 0);
});

test('iframe input saves only the source URL, preserving escaped query parameters', () => {
  const book = normalize('<iframe width="700" src="https://online.fliphtml5.com/abcde/fghij/?a=1&amp;b=2#p=4" onload="alert(1)" allowfullscreen></iframe>');
  assert.equal(book.embedUrl, 'https://online.fliphtml5.com/abcde/fghij/?a=1&b=2#p=4');
  assert.ok(!book.originalUrl.includes('<'));
});

test('Google Drive links and iframe previews preserve resource keys', () => {
  for (const input of [
    'https://drive.google.com/file/d/test-id/view?usp=sharing&resourcekey=0-key',
    '<iframe src="https://drive.google.com/file/d/test-id/preview?resourcekey=0-key"></iframe>',
    'https://drive.google.com/open?id=test-id&resourcekey=0-key',
  ]) {
    const file = normalize(input);
    assert.equal(file.provider, 'google-drive');
    assert.equal(file.embedUrl, 'https://drive.google.com/file/d/test-id/preview?resourcekey=0-key');
    assert.equal(new URL(file.directUrl).searchParams.get('resourcekey'), '0-key');
  }
});

test('direct PDF and image sources continue to use the document renderer', () => {
  const pdf = normalize('https://files.r2.dev/lesson.PDF?token=123');
  assert.equal(pdf.provider, 'cloudflare-r2');
  assert.equal(pdf.directUrl, 'https://files.r2.dev/lesson.PDF?token=123');
  assert.equal(pdf.fileName, 'lesson.PDF');
  assert.equal(normalize('https://example.test/lesson.webp').pageCount, 1);
  assert.equal(normalize(''), null);
});

test('library pages, unsupported embeds, deceptive hosts and active URL schemes are rejected', () => {
  for (const input of [
    'https://fliphtml5.com/', 'https://fliphtml5.com/bookcase/abcde',
    'https://fliphtml5.com/homepage/abcde', 'https://drive.google.com/drive/folders/abcde',
    'https://fliphtml5.com.evil.test/abcde/fghij/',
    'https://fliphtml5.com@evil.test/abcde/fghij/',
    '<iframe src="https://evil.test/book.html"></iframe>',
    '<iframe src="javascript:alert(1)"></iframe>',
    'data:text/html,hello', '/relative.pdf',
  ]) assert.throws(() => normalize(input), undefined, input);
});
