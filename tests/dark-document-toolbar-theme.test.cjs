const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('dark document toolbar preserves contrast for special and disabled tools', () => {
  const theme = fs.readFileSync('css/site-theme.css', 'utf8');
  const documentPage = fs.readFileSync('dokuman.html', 'utf8');

  assert.match(documentPage, /site-theme\.css\?v=20261106-document-toolbar/);
  assert.match(theme, /html\[data-theme="dark"\] \.viewer-toolbar \{/);
  assert.match(theme, /#docArrowToggleBtn, #docStampToggleBtn, #docCompassBtn, #docShapeToggleBtn/);
  assert.match(theme, /\.viewer-toolbar \.toolbar-btn:disabled \{/);
  assert.match(theme, /color: #8995a8/);
  assert.match(theme, /\.viewer-toolbar \.toolbar-btn:focus-visible/);
});
