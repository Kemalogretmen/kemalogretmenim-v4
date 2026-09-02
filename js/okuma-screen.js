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
  let wordBlockSizes = [];
  let currentKelimeMs = metin && metin.kelime_ms ? metin.kelime_ms : 500;
  let questionLoadState = getQuestionCount() > 0 ? 'loaded' : 'idle';
  let questionLoadPromise = null;
  let readingClient = null;

  function getKullaniciMetaLine() {
    const parts = [
      kullanici.sinif && kullanici.sube ? kullanici.sinif + '/' + kullanici.sube : '',
      kullanici.il || '',
      kullanici.okul || '',
    ].filter(Boolean);
    return parts.join(' · ');
  }

  function stripHtml(value) {
    return (value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function getQuestionCount() {
    return Array.isArray(metin.sorular) ? metin.sorular.length : 0;
  }

  function getReadingClient() {
    if (readingClient) {
      return readingClient;
    }
    const config = window.kemalSiteStore && window.kemalSiteStore.getReadingConfig
      ? window.kemalSiteStore.getReadingConfig()
      : window.kemalSiteStore.getConfig();
    readingClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    return readingClient;
  }

  async function fetchQuestionRows() {
    const client = getReadingClient();
    const attempts = [
      { table: 'sorular_public', columns: 'id, metin_id, soru_metni, sira, soru_tipi, ayar_json' },
      { table: 'sorular_public', columns: 'id, metin_id, soru_metni, sira' },
      { table: 'sorular', columns: 'id, metin_id, soru_metni, sira, soru_tipi, ayar_json' },
      { table: 'sorular', columns: 'id, metin_id, soru_metni, sira' },
    ];
    let lastError = null;
    let emptyResult = null;

    for (const attempt of attempts) {
      const response = await client
        .from(attempt.table)
        .select(attempt.columns)
        .eq('metin_id', metin.id)
        .order('sira');
      if (!response.error && Array.isArray(response.data) && response.data.length) {
        return { data: response.data, error: null };
      }
      if (!response.error) {
        emptyResult = [];
      } else {
        lastError = response.error;
      }
    }

    return emptyResult ? { data: emptyResult, error: null } : { data: null, error: lastError };
  }

  async function fetchChoiceRows(questionIds) {
    if (!questionIds.length) {
      return { data: [], error: null };
    }
    const client = getReadingClient();
    const attempts = [
      { table: 'secenekler_public', columns: 'id, soru_id, secenek_metni, sira, dogru_mu' },
      { table: 'secenekler', columns: 'id, soru_id, secenek_metni, sira, dogru_mu' },
    ];
    let lastError = null;

    for (const attempt of attempts) {
      const response = await client
        .from(attempt.table)
        .select(attempt.columns)
        .in('soru_id', questionIds)
        .order('sira');
      if (!response.error) {
        return { data: response.data || [], error: null };
      }
      lastError = response.error;
    }

    return { data: null, error: lastError };
  }

  async function hydrateQuestions() {
    if (getQuestionCount() > 0) {
      questionLoadState = 'loaded';
      return questionLoadState;
    }
    if (!metin.id) {
      questionLoadState = 'empty';
      return questionLoadState;
    }
    if (questionLoadPromise) {
      return questionLoadPromise;
    }

    questionLoadState = 'loading';
    questionLoadPromise = (async function() {
      try {
        const questionResponse = await fetchQuestionRows();
        if (questionResponse.error || !Array.isArray(questionResponse.data)) {
          throw questionResponse.error || new Error('Sorular alınamadı.');
        }
        if (!questionResponse.data.length) {
          metin.sorular = [];
          questionLoadState = 'empty';
          return questionLoadState;
        }

        const questionIds = questionResponse.data.map(function(question) {
          return question.id;
        }).filter(Boolean);
        const choiceResponse = await fetchChoiceRows(questionIds);
        if (choiceResponse.error || !Array.isArray(choiceResponse.data)) {
          throw choiceResponse.error || new Error('Soru seçenekleri alınamadı.');
        }

        const choiceMap = {};
        choiceResponse.data.forEach(function(choice) {
          if (!choiceMap[choice.soru_id]) {
            choiceMap[choice.soru_id] = [];
          }
          choiceMap[choice.soru_id].push(choice);
        });
        metin.sorular = questionResponse.data.map(function(question) {
          return Object.assign({}, question, {
            soru_tipi: question.soru_tipi || '',
            ayar_json: parseOptionalJson(question.ayar_json),
            secenekler: (choiceMap[question.id] || []).sort(function(a, b) {
              return (a.sira || 0) - (b.sira || 0);
            }),
          });
        });
        sessionStorage.setItem('okuma_metin', JSON.stringify(metin));
        questionLoadState = 'loaded';
        return questionLoadState;
      } catch (error) {
        console.warn('Anlama soruları yeniden yüklenemedi:', error && error.message ? error.message : error);
        questionLoadState = 'error';
        return questionLoadState;
      } finally {
        questionLoadPromise = null;
      }
    })();

    return questionLoadPromise;
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

  function parseOptionalJson(value) {
    if (!value) {
      return {};
    }
    if (typeof value === 'object') {
      return value;
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      return {};
    }
  }

  function getTrainingProfile() {
    const defaults = {
      rsvp: {
        grup_boyutu: 1,
        noktalama_duraklama_ms: 220,
        ogrenci_hiz_kontrolu: false,
      },
      gorsel: {
        url: '',
        alt: '',
        aciklama: '',
        konum: 'none',
        fit: 'cover',
      },
    };
    const raw = parseOptionalJson(metin.egitim_json);
    const rsvp = Object.assign({}, defaults.rsvp, raw.rsvp || {});
    const visual = Object.assign({}, defaults.gorsel, raw.gorsel || {});
    rsvp.grup_boyutu = Math.max(1, Math.min(3, parseInt(rsvp.grup_boyutu, 10) || 1));
    rsvp.noktalama_duraklama_ms = rsvp.noktalama_duraklama_ms === 0 ? 0 : (parseInt(rsvp.noktalama_duraklama_ms, 10) || 220);
    rsvp.ogrenci_hiz_kontrolu = !!rsvp.ogrenci_hiz_kontrolu;
    visual.url = String(visual.url || '').trim();
    visual.alt = String(visual.alt || '').trim();
    visual.aciklama = String(visual.aciklama || '').trim();
    visual.konum = ['none', 'top', 'cover'].includes(visual.konum) ? visual.konum : (visual.url ? 'top' : 'none');
    visual.fit = visual.fit === 'contain' ? 'contain' : 'cover';
    if (!visual.url) {
      visual.konum = 'none';
    }
    return Object.assign({}, raw, { rsvp: rsvp, gorsel: visual });
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
    if (style.html) {
      titleNode.innerHTML = style.html;
    }
    titleNode.style.color = style.renk || '';
    titleNode.style.fontSize = style.boyut ? style.boyut + 'px' : '';
    titleNode.style.textAlign = style.hiza || '';
  }

  function applyBodyStyle(node) {
    const fontMap = {
      nunito: 'Nunito, sans-serif',
      Nunito: 'Nunito, sans-serif',
      'ttkb-dik-temel': '"TTKB Dik Temel Abece", ttkb-dik-temel, "Nunito", sans-serif',
      'TTKB Dik Temel': '"TTKB Dik Temel Abece", ttkb-dik-temel, "Nunito", sans-serif',
      'TTKB Dik Temel Abece': '"TTKB Dik Temel Abece", ttkb-dik-temel, "Nunito", sans-serif',
      "'TTKB Dik Temel Abece',ttkb-dik-temel,'Nunito',sans-serif": '"TTKB Dik Temel Abece", ttkb-dik-temel, "Nunito", sans-serif',
      "'TTKB Dik Temel Abece', ttkb-dik-temel, 'Nunito', sans-serif": '"TTKB Dik Temel Abece", ttkb-dik-temel, "Nunito", sans-serif',
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

  function renderReadingVisual() {
    const visualBox = document.getElementById('okumaVisual');
    const image = document.getElementById('okumaVisualImg');
    const caption = document.getElementById('okumaVisualCaption');
    if (!visualBox || !image || !caption) {
      return;
    }
    const visual = getTrainingProfile().gorsel || {};
    if (!visual.url || visual.konum === 'none') {
      visualBox.style.display = 'none';
      image.removeAttribute('src');
      caption.style.display = 'none';
      caption.textContent = '';
      return;
    }
    visualBox.style.display = 'block';
    visualBox.style.setProperty('--reading-visual-fit', visual.fit === 'contain' ? 'contain' : 'cover');
    image.src = visual.url;
    image.alt = visual.alt || visual.aciklama || metin.baslik || 'Okuma metni görseli';
    caption.textContent = visual.aciklama || '';
    caption.style.display = visual.aciklama ? 'block' : 'none';
    image.onerror = function() {
      visualBox.style.display = 'none';
    };
  }

  function renderReadyCover() {
    const cover = document.getElementById('hazirKapak');
    const image = document.getElementById('hazirKapakImg');
    const icon = document.querySelector('.hazir-em');
    if (!cover || !image) {
      return;
    }
    const visual = getTrainingProfile().gorsel || {};
    const showCover = !!visual.url && visual.konum === 'cover';
    cover.style.display = showCover ? 'block' : 'none';
    if (icon) {
      icon.style.display = showCover ? 'none' : '';
    }
    if (!showCover) {
      image.removeAttribute('src');
      return;
    }
    cover.style.setProperty('--ready-cover-fit', visual.fit === 'contain' ? 'contain' : 'cover');
    image.src = visual.url;
    image.alt = visual.alt || visual.aciklama || metin.baslik || 'Okuma metni kapak görseli';
    image.onerror = function() {
      cover.style.display = 'none';
      if (icon) {
        icon.style.display = '';
      }
    };
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

  async function startReading() {
    const readyState = await hydrateQuestions();
    if (readyState === 'error') {
      const button = document.getElementById('hazirBtn');
      if (button) {
        button.textContent = '🔄 Soruları Tekrar Yükle';
        button.disabled = false;
      }
      window.alert('Anlama soruları şu an yüklenemedi. Okumaya başlamadan önce lütfen tekrar deneyin.');
      return;
    }

    sessionStorage.setItem('okuma_attempt_id', 'attempt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
    sessionStorage.setItem('okuma_son_oturum', JSON.stringify({ metin: metin, kullanici: kullanici }));
    sessionStorage.removeItem('okuma_sure_sn');
    sessionStorage.removeItem('okuma_wpm');
    sessionStorage.removeItem('okuma_cevaplar');
    sessionStorage.removeItem('okuma_karne_kaydedildi');
    sessionStorage.removeItem('okuma_karne_kuyrukta');

    document.getElementById('hazirEkran').style.display = 'none';
    const launch = function() {
      if (metin.goruntuleme_modu === 'kelime') {
        startWordMode();
      } else {
        startFullTextMode();
      }
    };

    launch();
  }

  function startFullTextMode() {
    const screen = document.getElementById('tamMetinEkran');
    const content = document.getElementById('tamMetinIcerik');
    screen.style.display = 'flex';

    document.getElementById('tamMetinKullanici').innerHTML = '👤 <strong>' + kullanici.ad + ' ' + kullanici.soyad + '</strong> · ' + getKullaniciMetaLine();
    document.getElementById('tamMetinBaslik').textContent = metin.baslik;
    applyTitleStyle();
    renderReadingVisual();
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
    const shownWords = wordBlockSizes.slice(0, wordIndex + 1).reduce(function(total, count) {
      return total + count;
    }, 0);
    const totalWords = wordBlockSizes.reduce(function(total, count) {
      return total + count;
    }, 0) || words.length;
    document.getElementById('kkProgress').style.width = progress + '%';
    document.getElementById('kkProgressTxt').textContent = Math.min(shownWords, totalWords) + ' / ' + totalWords + ' kelime';
  }

  function renderWord() {
    const node = document.getElementById('kkKelime');
    node.style.animation = 'none';
    node.offsetHeight;
    node.style.animation = 'kelimeGelsin .15s ease both';
    applyBodyStyle(node);
    node.style.color = '#FFFFFF';
    node.style.fontSize = '';
    node.textContent = words[wordIndex] || '';
    updateWordProgress();
  }

  function finishWordMode() {
    elapsedMs = Date.now() - startedAt;
    completeReading(elapsedMs);
  }

  function buildWordBlocks(text, groupSize) {
    const sourceWords = text.split(/\s+/).filter(Boolean);
    const blocks = [];
    const sizes = [];
    for (let i = 0; i < sourceWords.length; i += groupSize) {
      const blockWords = sourceWords.slice(i, i + groupSize);
      blocks.push(blockWords.join(' '));
      sizes.push(blockWords.length);
    }
    wordBlockSizes = sizes;
    return blocks;
  }

  function getWordModeDelay() {
    const profile = getTrainingProfile();
    const block = words[wordIndex] || '';
    const punctuationPause = /[.!?;:…]$/.test(block.trim()) ? profile.rsvp.noktalama_duraklama_ms : 0;
    return currentKelimeMs + punctuationPause;
  }

  function scheduleNextWord() {
    wordTimer = window.setTimeout(function() {
      wordIndex += 1;
      if (wordIndex >= words.length) {
        window.clearTimeout(wordTimer);
        stopClock();
        window.setTimeout(finishWordMode, 450);
        return;
      }
      renderWord();
      scheduleNextWord();
    }, getWordModeDelay());
  }

  function updateSpeedLabel() {
    const node = document.getElementById('kkSpeedLabel');
    if (!node) {
      return;
    }
    const profile = getTrainingProfile();
    const groupSize = profile.rsvp.grup_boyutu || 1;
    const wpm = Math.round((60000 / Math.max(150, currentKelimeMs)) * groupSize);
    node.textContent = wpm + ' k/dk';
  }

  function startWordMode() {
    const screen = document.getElementById('kelimeEkran');
    const profile = getTrainingProfile();
    words = buildWordBlocks(getPlainText(), profile.rsvp.grup_boyutu);
    wordIndex = 0;
    currentKelimeMs = metin.kelime_ms || 500;

    screen.style.display = 'flex';
    document.getElementById('kkMeta').innerHTML = '📖 <strong>' + metin.baslik + '</strong>';
    document.getElementById('kkHint').style.display = metin.tikla_mod ? 'block' : 'none';
    document.getElementById('kkControls').style.display = (!metin.tikla_mod && profile.rsvp.ogrenci_hiz_kontrolu) ? 'flex' : 'none';
    screen.style.cursor = metin.tikla_mod ? 'pointer' : 'default';
    updateSpeedLabel();

    renderWord();
    startClock('kkSayac');

    if (!metin.tikla_mod) {
      scheduleNextWord();
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

  document.addEventListener('DOMContentLoaded', async function() {
    const modeLabel = metin.goruntuleme_modu === 'kelime'
      ? (metin.tikla_mod ? '⚡ Kelime Kelime (Tıklayarak)' : '⚡ Kelime Kelime (Otomatik)')
      : '📄 Tam Metin';
    document.getElementById('hazirBaslik').textContent = metin.baslik;
    renderReadyCover();
    document.getElementById('hazirKullanici').textContent = '👤 ' + kullanici.ad + ' ' + kullanici.soyad + ' · ' + getKullaniciMetaLine();
    const readyButton = document.getElementById('hazirBtn');
    readyButton.textContent = '⏳ Anlama soruları kontrol ediliyor…';
    readyButton.disabled = true;
    const readyState = await hydrateQuestions();
    document.getElementById('hazirBilgi').innerHTML =
      '<strong>' + modeLabel + '</strong><br>' +
      (metin.kelime_sayisi || '?') + ' kelime · ' +
      (readyState === 'error'
        ? 'Anlama soruları yeniden yüklenemedi'
        : (getQuestionCount() ? getQuestionCount() + ' anlama sorusu' : 'Anlama sorusu yok')) +
      '<br><br>Hazır olduğunda başla butonuna bas.';
    readyButton.textContent = readyState === 'error' ? '🔄 Soruları Tekrar Yükle' : '🚀 Okumaya Başla!';
    readyButton.disabled = false;
  });

  window.okumaBaslat = startReading;
  window.kelimeTikla = clickWordMode;
  window.kelimeHiziDegistir = function(delta) {
    currentKelimeMs = Math.max(150, Math.min(1500, currentKelimeMs - delta));
    updateSpeedLabel();
  };
  window.okumaBitti = function() {
    stopClock();
    elapsedMs = Date.now() - startedAt;
    completeReading(elapsedMs);
  };
})();
