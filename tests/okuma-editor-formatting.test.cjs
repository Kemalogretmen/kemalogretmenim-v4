const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const editorPage = fs.readFileSync('admin/okuma-editor.html', 'utf8');
const editorApp = fs.readFileSync('js/okuma-editor-app.js', 'utf8');

test('okuma editor applies indentation to only the current paragraph first line', () => {
  assert.match(editorPage, /okuma-editor-app\.js\?v=20261107-first-line-sticky/);
  assert.match(editorApp, /Attributor\.Style\('firstlineindent', 'text-indent'/);
  assert.match(editorApp, /scope: Parchment\.Scope\.BLOCK/);
  assert.match(editorApp, /migrateLegacyFirstLineIndentHtml\(normalizeEditorHtml/);
  assert.match(editorApp, /p\[class\*="ql-indent-"\][\s\S]*blockquote\[class\*="ql-indent-"\]/);
  assert.match(editorApp, /formatLine\(range\.index, 0, 'firstlineindent', nextIndent, 'user'\)/);
  assert.doesNotMatch(editorApp, /formatLine\([^\n]+, 'indent', action === 'indent'/);
  assert.match(editorPage, /aria-label="İlk satır girintisini artır"/);
  assert.match(editorPage, /aria-label="İlk satır girintisini azalt"/);
});

test('question creation toolbar remains available while the question list scrolls', () => {
  assert.match(editorPage, /\.question-toolbar\{position:sticky;top:68px;z-index:125;/);
  assert.match(editorPage, /\.admin-shell-main \.editor-toolbar-dock,\.admin-shell-main \.question-toolbar\{top:12px;\}/);
  assert.match(editorPage, /@media\(max-width:760px\)[\s\S]*\.question-toolbar\{top:60px;padding:10px;\}/);
  assert.match(editorPage, /<div class="question-toolbar">[\s\S]*soruEkle\('coktan-secmeli'\)[\s\S]*soruEkle\('dogru-yanlis'\)[\s\S]*soruEkle\('bosluk-doldurma'\)/);
});
