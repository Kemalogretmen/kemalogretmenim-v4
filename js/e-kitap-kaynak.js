(function() {
  'use strict';

  function webUrl(value) {
    try {
      const url = new URL(String(value || '').trim());
      return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url : null;
    } catch (error) {
      return null;
    }
  }

  function flipHtml5Url(value) {
    const url = webUrl(value);
    if (!url || url.port || !['fliphtml5.com', 'www.fliphtml5.com', 'online.fliphtml5.com'].includes(url.hostname)) return '';
    const book = url.pathname.match(/^\/([a-z0-9_-]+)\/([a-z0-9_-]+)(?:\/(?:index\.html)?)?$/i);
    if (!book || ['bookcase', 'help', 'support', 'account'].includes(book[1].toLowerCase())) return '';
    return 'https://online.fliphtml5.com/' + book[1] + '/' + book[2] + '/' + url.search + url.hash;
  }

  function sourceType(book) {
    if (book.kaynak_turu === 'external_pdf' && (book.kaynak_meta?.external_provider === 'fliphtml5' || flipHtml5Url(book.harici_url))) return 'fliphtml5';
    return book.kaynak_turu;
  }

  window.kemalEKitapKaynak = { webUrl, flipHtml5Url, sourceType };
})();
