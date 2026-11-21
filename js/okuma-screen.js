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
  const settings = window.ReadingSettings;
  const canChooseMode = settings.isAllGrades(metin);
  let mode = metin.goruntuleme_modu === 'kelime' ? 'kelime' : 'tam';
  let manual = Boolean(metin.tikla_mod);
  let isStarting = false;
  let isFinished = false;
  let readingPages;

  function formatWordTime(ms) {
    return (ms / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' sn';
  }

  function syncReadyChoices() {
    mode = document.querySelector('[name="readingMode"]:checked').value;
    manual = document.querySelector('[name="readingAdvance"]:checked').value === 'click';
    currentKelimeMs = Number(document.getElementById('readingWordMs').value);
    document.getElementById('readingAdvance').hidden = mode !== 'kelime';
    document.getElementById('readingPace').hidden = mode !== 'kelime' || manual;
    document.getElementById('readingWordMsValue').value = formatWordTime(currentKelimeMs);
    document.getElementById('readingWordMs').setAttribute('aria-valuetext', formatWordTime(currentKelimeMs));
  }

  function setupReadingChoices() {
    if (!canChooseMode) return;
    const choice = document.getElementById('readingChoice');
    choice.querySelector('[name="readingMode"][value="' + mode + '"]').checked = true;
    choice.querySelector('[name="readingAdvance"][value="' + (manual ? 'click' : 'auto') + '"]').checked = true;
    document.getElementById('readingWordMs').value = settings.defaultWordMs;
    choice.addEventListener('input', syncReadyChoices);
    syncReadyChoices();
    choice.hidden = false;
  }

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
    if (['left', 'center', 'right'].includes(style.hiza)) titleNode.style.textAlign = style.hiza;
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
    const font = fontMap[metin.yazi_tipi] || 'Nunito, sans-serif';
    if (node.id === 'tamMetinIcerik') {
      const paper = node.closest('.kitap-wrapper');
      paper.style.setProperty('--reading-font', font);
      paper.style.setProperty('--reading-size', Math.max(20, Math.min(34, Number(metin.yazi_boyutu) || 22)) + 'px');
      if (font.includes('TTKB')) paper.style.setProperty('--reading-weight', '700');
      return;
    }
    node.style.fontFamily = font;
    node.style.fontSize = (metin.yazi_boyutu || 18) + 'px';
    node.style.color = metin.yazi_rengi || '#1A1040';
  }

  function refreshReadingContrast() {
    const body = document.getElementById('tamMetinIcerik');
    const paper = body.closest('.kitap-wrapper');
    const luminance = rgb => (rgb.match(/[\d.]+/g) || []).slice(0, 3).reduce((sum, channel, index) => {
      const value = Number(channel) / 255;
      return sum + [0.2126, 0.7152, 0.0722][index] * (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    }, 0);
    const pageLight = luminance(getComputedStyle(paper).backgroundColor);
    for (const element of body.querySelectorAll('[style], .reading-low-contrast')) {
      element.classList.remove('reading-low-contrast');
      if (element.style.color || element.style.backgroundColor) {
        const colors = getComputedStyle(element);
        const foreground = luminance(colors.color);
        const channels = colors.color.match(/[\d.]+/g) || [];
        if (channels.length > 3 && Number(channels[3]) < 1 || (Math.max(pageLight, foreground) + .05) / (Math.min(pageLight, foreground) + .05) < 4.5 || element.style.backgroundColor) {
          element.classList.add('reading-low-contrast');
        }
      }
    }
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
    if (isStarting || startedAt !== null) return;
    isStarting = true;
    const button = document.getElementById('hazirBtn');
    button.disabled = true;
    window.ReadingFocus.enter();
    const readyState = await hydrateQuestions();
    if (readyState === 'error') {
      await window.ReadingFocus.exit();
      isStarting = false;
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
    sessionStorage.setItem('okuma_baslangic_tarihi', new Date().toISOString());
    if (canChooseMode) {
      const flow = mode === 'tam' ? 'tam' : (manual ? 'kelime-tikla' : 'kelime-otomatik');
      sessionStorage.setItem('okuma_secili_akis', JSON.stringify({ attemptId: sessionStorage.getItem('okuma_attempt_id'), flow: flow }));
    } else {
      sessionStorage.removeItem('okuma_secili_akis');
    }

    document.getElementById('hazirEkran').style.display = 'none';
    if (mode === 'kelime') startWordMode();
    else startFullTextMode();
  }

  function startFullTextMode() {
    const screen = document.getElementById('tamMetinEkran');
    const content = document.getElementById('tamMetinIcerik');
    screen.style.display = 'flex';

    document.getElementById('tamMetinBaslik').textContent = metin.baslik;
    applyTitleStyle();
    renderReadingVisual();
    applyBodyStyle(content);

    if ((metin.icerik_html || '').trim()) {
      content.innerHTML = metin.icerik_html;
    } else {
      content.classList.add('reading-plain-text');
      content.textContent = getPlainText();
    }

    refreshReadingContrast();
    readingPages = window.ReadingPages.create(screen);
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
    if (canChooseMode && manual) {
      document.getElementById('readingWordBack').disabled = wordIndex === 0;
      document.getElementById('readingWordNextLabel').textContent =
        wordIndex >= words.length - 1 ? 'Okumayı bitir' : 'Sonraki kelime';
    }
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
    if (canChooseMode) return currentKelimeMs;
    const profile = getTrainingProfile();
    const block = words[wordIndex] || '';
    const punctuationPause = /[.!?;:…]$/.test(block.trim()) ? profile.rsvp.noktalama_duraklama_ms : 0;
    return currentKelimeMs + punctuationPause;
  }

  function scheduleNextWord() {
    window.clearTimeout(wordTimer);
    wordTimer = window.setTimeout(function() {
      wordIndex += 1;
      if (wordIndex >= words.length) {
        finishWordMode();
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
    const groupSize = canChooseMode ? 1 : profile.rsvp.grup_boyutu || 1;
    const wpm = Math.round((60000 / Math.max(150, currentKelimeMs)) * groupSize);
    node.textContent = canChooseMode ? formatWordTime(currentKelimeMs) + ' / kelime' : wpm + ' k/dk';
  }

  function startWordMode() {
    const screen = document.getElementById('kelimeEkran');
    const profile = getTrainingProfile();
    words = buildWordBlocks(getPlainText(), canChooseMode ? 1 : profile.rsvp.grup_boyutu);
    wordIndex = 0;

    screen.style.display = 'flex';
    document.getElementById('kkMeta').textContent = '📖 ' + metin.baslik;
    document.getElementById('kkHint').style.display = manual && !canChooseMode ? 'block' : 'none';
    document.getElementById('readingWordNav').hidden = !canChooseMode || !manual;
    document.getElementById('kkControls').style.display = !manual && (canChooseMode || profile.rsvp.ogrenci_hiz_kontrolu) ? 'flex' : 'none';
    screen.style.cursor = manual ? 'pointer' : 'default';
    updateSpeedLabel();

    renderWord();
    startClock('kkSayac');

    if (!manual) {
      scheduleNextWord();
    }
  }

  function clickWordMode(event) {
    if (event?.target.closest('button, a, input, select, label')) return;
    if (mode !== 'kelime' || !manual || startedAt === null || isFinished) return;
    wordIndex += 1;
    if (wordIndex >= words.length) {
      finishWordMode();
      return;
    }
    renderWord();
  }

  async function completeReading(durationMs) {
    if (isFinished || startedAt === null) return;
    isFinished = true;
    stopClock();
    window.clearTimeout(wordTimer);
    const durationSeconds = durationMs / 1000;
    const wordCount = metin.kelime_sayisi || getPlainText().split(/\s+/).filter(Boolean).length;
    const wpm = durationSeconds > 0 ? Math.round((wordCount / durationSeconds) * 60) : 0;

    sessionStorage.setItem('okuma_sure_sn', durationSeconds.toFixed(1));
    sessionStorage.setItem('okuma_wpm', String(wpm));

    if ((metin.sorular || []).length && window.ReadingFocus.isActive()) sessionStorage.setItem('okuma_soru_odagi', '1');
    else sessionStorage.removeItem('okuma_soru_odagi');
    await window.ReadingFocus.exit();
    if ((metin.sorular || []).length > 0) {
      window.location.href = '/hizli-okuma/sorular.html';
    } else {
      window.location.href = '/hizli-okuma/karne.html';
    }
  }

  document.addEventListener('DOMContentLoaded', async function() {
    window.addEventListener('kemal:themechange', () => {
      if (mode === 'tam' && startedAt !== null) refreshReadingContrast();
    });
    setupReadingChoices();
    document.getElementById('readingWordNext').addEventListener('click', () => clickWordMode());
    document.getElementById('readingWordBack').addEventListener('click', () => {
      if (!isFinished && wordIndex > 0) {
        wordIndex -= 1;
        renderWord();
      }
    });
    const modeLabel = mode === 'kelime'
      ? (manual ? '⚡ Kelime Kelime (Tıklayarak)' : '⚡ Kelime Kelime (Otomatik)')
      : '📄 Tam Metin';
    document.getElementById('hazirBaslik').textContent = metin.baslik;
    renderReadyCover();
    document.getElementById('hazirKullanici').textContent = '👤 ' + kullanici.ad + ' ' + kullanici.soyad + ' · ' + getKullaniciMetaLine();
    const readyButton = document.getElementById('hazirBtn');
    readyButton.textContent = '⏳ Anlama soruları kontrol ediliyor…';
    readyButton.disabled = true;
    const readyState = await hydrateQuestions();
    document.getElementById('hazirBilgi').innerHTML =
      (canChooseMode ? '' : '<strong>' + modeLabel + '</strong><br>') +
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
    if (startedAt === null || isFinished || manual || mode !== 'kelime') return;
    currentKelimeMs = canChooseMode
      ? Math.max(settings.minWordMs, Math.min(settings.maxWordMs, currentKelimeMs - Math.sign(delta) * 100))
      : Math.max(150, Math.min(1500, currentKelimeMs - delta));
    updateSpeedLabel();
    if (canChooseMode) scheduleNextWord();
  };
  window.okumaBitti = function() {
    if (startedAt !== null && !readingPages?.next()) completeReading(Date.now() - startedAt);
  };
})();
