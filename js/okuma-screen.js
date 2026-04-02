(function() {
  'use strict';

  const metin = JSON.parse(sessionStorage.getItem('okuma_metin') || 'null');
  const kullanici = JSON.parse(sessionStorage.getItem('okuma_kullanici') || 'null');

  if (!metin || !kullanici) {
    window.location.href = '/hizli-okuma/index.html';
    return;
  }

  let elapsedMs = 0;
  let timer = null;
  let startedAt = null;
  let words = [];
  let wordIndex = 0;
  let wordTimer = null;

  function stripHtml(value) {
    return (value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function parseTitleStyle() {
    const raw = metin.baslik_stil_json;
    if (raw && typeof raw === 'object') {
      return raw;
    }
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  function getPlainText() {
    return metin.plain_text || metin.icerik || stripHtml(metin.icerik_html || '');
  }

  function formatClock(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
  }

  function applyTitleStyle() {
    const titleNode = document.getElementById('tamMetinBaslik');
    const style = parseTitleStyle();
    if (!style || !titleNode) {
      return;
    }
    titleNode.style.color = style.renk || '';
    titleNode.style.fontSize = style.boyut ? style.boyut + 'px' : '';
    titleNode.style.textAlign = style.hiza || '';
  }

  function applyBodyStyle(node) {
    const fontMap = {
      nunito: 'Nunito, sans-serif',
      Nunito: 'Nunito, sans-serif',
      georgia: 'Georgia, serif',
      'Georgia,serif': 'Georgia, serif',
      arial: 'Arial, sans-serif',
      'Arial,sans-serif': 'Arial, sans-serif',
      'times-new-roman': '"Times New Roman", serif',
      '"Times New Roman", serif': '"Times New Roman", serif',
      "'Times New Roman',serif": '"Times New Roman", serif',
      'courier-new': '"Courier New", monospace',
      'Courier New,monospace': '"Courier New", monospace',
    };
    node.style.fontFamily = fontMap[metin.yazi_tipi] || 'Nunito, sans-serif';
    node.style.fontSize = (metin.yazi_boyutu || 18) + 'px';
    node.style.color = metin.yazi_rengi || '#1A1040';
  }

  function startClock(displayId) {
    startedAt = Date.now();
    timer = window.setInterval(function() {
      elapsedMs = Date.now() - startedAt;
      document.getElementById(displayId).textContent = formatClock(elapsedMs);
    }, 1000);
  }

  function stopClock() {
    window.clearInterval(timer);
    timer = null;
  }

  function startReading() {
    sessionStorage.setItem('okuma_attempt_id', 'attempt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
    sessionStorage.setItem('okuma_son_oturum', JSON.stringify({ metin: metin, kullanici: kullanici }));
    sessionStorage.removeItem('okuma_sure_sn');
    sessionStorage.removeItem('okuma_wpm');
    sessionStorage.removeItem('okuma_cevaplar');
    sessionStorage.removeItem('okuma_karne_kaydedildi');

    document.getElementById('hazirEkran').style.display = 'none';

    if (metin.goruntuleme_modu === 'kelime') {
      startWordMode();
    } else {
      startFullTextMode();
    }
  }

  function startFullTextMode() {
    const screen = document.getElementById('tamMetinEkran');
    const content = document.getElementById('tamMetinIcerik');
    screen.style.display = 'flex';

    document.getElementById('tamMetinKullanici').innerHTML = '👤 <strong>' + kullanici.ad + ' ' + kullanici.soyad + '</strong>';
    document.getElementById('tamMetinBaslik').textContent = metin.baslik;
    applyTitleStyle();
    applyBodyStyle(content);

    if ((metin.icerik_html || '').trim()) {
      content.innerHTML = metin.icerik_html;
    } else {
      content.innerHTML = getPlainText().replace(/\n/g, '<br>');
    }

    startClock('sayacDisplay');
  }

  function updateWordProgress() {
    const progress = words.length ? Math.round(((wordIndex + 1) / words.length) * 100) : 0;
    document.getElementById('kkProgress').style.width = progress + '%';
    document.getElementById('kkProgressTxt').textContent = (wordIndex + 1) + ' / ' + words.length + ' kelime';
  }

  function renderWord() {
    const node = document.getElementById('kkKelime');
    node.style.animation = 'none';
    node.offsetHeight;
    node.style.animation = 'kelimeGelsin .15s ease both';
    node.style.color = metin.yazi_rengi || '#FFFFFF';
    applyBodyStyle(node);
    node.style.fontSize = '';
    node.textContent = words[wordIndex] || '';
    updateWordProgress();
  }

  function finishWordMode() {
    elapsedMs = Date.now() - startedAt;
    completeReading(elapsedMs);
  }

  function startWordMode() {
    const screen = document.getElementById('kelimeEkran');
    words = getPlainText().split(/\s+/).filter(Boolean);
    wordIndex = 0;

    screen.style.display = 'flex';
    document.getElementById('kkMeta').innerHTML = '📖 <strong>' + metin.baslik + '</strong>';
    document.getElementById('kkHint').style.display = metin.tikla_mod ? 'block' : 'none';
    screen.style.cursor = metin.tikla_mod ? 'pointer' : 'default';

    renderWord();
    startClock('kkSayac');

    if (!metin.tikla_mod) {
      const interval = metin.kelime_ms || 500;
      wordTimer = window.setInterval(function() {
        wordIndex += 1;
        if (wordIndex >= words.length) {
          window.clearInterval(wordTimer);
          stopClock();
          window.setTimeout(finishWordMode, 450);
          return;
        }
        renderWord();
      }, interval);
    }
  }

  function clickWordMode() {
    if (!metin.tikla_mod) {
      return;
    }
    wordIndex += 1;
    if (wordIndex >= words.length) {
      stopClock();
      window.setTimeout(finishWordMode, 450);
      return;
    }
    renderWord();
  }

  function completeReading(durationMs) {
    const durationSeconds = durationMs / 1000;
    const wordCount = metin.kelime_sayisi || getPlainText().split(/\s+/).filter(Boolean).length;
    const wpm = durationSeconds > 0 ? Math.round((wordCount / durationSeconds) * 60) : 0;

    sessionStorage.setItem('okuma_sure_sn', durationSeconds.toFixed(1));
    sessionStorage.setItem('okuma_wpm', String(wpm));

    if ((metin.sorular || []).length > 0) {
      window.location.href = '/hizli-okuma/sorular.html';
    } else {
      window.location.href = '/hizli-okuma/karne.html';
    }
  }

  document.addEventListener('DOMContentLoaded', function() {
    const modeLabel = metin.goruntuleme_modu === 'kelime'
      ? (metin.tikla_mod ? '⚡ Kelime Kelime (Tıklayarak)' : '⚡ Kelime Kelime (Otomatik)')
      : '📄 Tam Metin';
    document.getElementById('hazirBaslik').textContent = metin.baslik;
    document.getElementById('hazirKullanici').textContent = '👤 ' + kullanici.ad + ' ' + kullanici.soyad + ' · ' + kullanici.sinif + '/' + kullanici.sube;
    document.getElementById('hazirBilgi').innerHTML =
      '<strong>' + modeLabel + '</strong><br>' +
      (metin.kelime_sayisi || '?') + ' kelime · ' +
      ((metin.sorular || []).length ? (metin.sorular || []).length + ' anlama sorusu' : 'Anlama sorusu yok') +
      '<br><br>Hazır olduğunda başla butonuna bas.';
    document.getElementById('hazirBtn').textContent = '🚀 Okumaya Başla!';
    document.getElementById('hazirBtn').disabled = false;
  });

  window.okumaBaslat = startReading;
  window.kelimeTikla = clickWordMode;
  window.okumaBitti = function() {
    stopClock();
    elapsedMs = Date.now() - startedAt;
    completeReading(elapsedMs);
  };
})();
