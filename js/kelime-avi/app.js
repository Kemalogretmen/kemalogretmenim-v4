/**
 * Kelime Avı Atölyesi — Ana Uygulama Denetleyicisi
 * Tasarım Stüdyosu · Akıllı Tahta Oyun Modu · A4 Çalışma Kağıdı Stüdyosu
 */
(function () {
  'use strict';

  const Packs  = window.KelimePacks;
  const Engine = window.KelimeEngine;
  const QR     = window.KelimeQR;
  const Sound  = window.KelimeSound;
  const Export = window.KelimeExport;
  const workspace = document.getElementById('main-content');

  const STORAGE_KEY = 'kelime_avi_atolyesi_library_v1';
  const THEME_KEY   = 'kelime_avi_atolyesi_theme_v1';
  let localTheme = false;

  const TEAM_PALETTE = [
    { name: 'A Takımı', color: '#4F46E5', stroke: 'rgba(79, 70, 229, 0.36)' },
    { name: 'B Takımı', color: '#0284C7', stroke: 'rgba(2, 132, 199, 0.36)' },
    { name: 'C Takımı', color: '#0D9488', stroke: 'rgba(13, 148, 136, 0.36)' },
    { name: 'D Takımı', color: '#D97706', stroke: 'rgba(217, 119, 6, 0.40)' }
  ];

  // Saf geometrik vektör şekil silüetleri (OS emoji yerine tutarlı profesyonel ikonlar)
  const SHAPE_SVGS = {
    rect:      '<svg viewBox="0 0 24 24" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="2.5"/></svg>',
    heart:     '<svg viewBox="0 0 24 24" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 20.5s-7.5-4.8-9.2-9.2C1.6 8.2 3.8 5 7 5c2 0 3.7 1.1 5 2.8C13.3 6.1 15 5 17 5c3.2 0 5.4 3.2 4.2 6.3-1.7 4.4-9.2 9.2-9.2 9.2z"/></svg>',
    star:      '<svg viewBox="0 0 24 24" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><polygon points="12 3 14.9 8.9 21.4 9.8 16.7 14.4 17.8 20.8 12 17.7 6.2 20.8 7.3 14.4 2.6 9.8 9.1 8.9 12 3"/></svg>',
    diamond:   '<svg viewBox="0 0 24 24" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><polygon points="12 2.5 21.5 12 12 21.5 2.5 12 12 2.5"/></svg>',
    circle:    '<svg viewBox="0 0 24 24" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.5"/></svg>',
    tree:      '<svg viewBox="0 0 24 24" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l5.5 6.5h-2.8L18.5 15h-3.2L19 19H5l3.7-4H5.5l3.8-5.5H6.5L12 3z"/><path d="M12 19v2.8" stroke-linecap="round"/></svg>',
    apple:     '<svg viewBox="0 0 24 24" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7c1.5-2 4.5-2 6 0 2 2.5 1.5 8-1.2 11.5-1.2 1.5-2.8 1.8-4.8 1-2 .8-3.6.5-4.8-1C4.5 15 4 9.5 6 7c1.5-2 4.5-2 6 0z"/><path d="M12 7c0-2 1-3.5 2.5-4"/></svg>',
    rocket:    '<svg viewBox="0 0 24 24" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3c3.2 2.4 4.5 6.2 4.5 10.5l2.5 3.5h-4l-1.5 3h-3L9 17H5l2.5-3.5C7.5 9.2 8.8 5.4 12 3z"/><circle cx="12" cy="10.5" r="1.5" fill="currentColor"/></svg>',
    butterfly: '<svg viewBox="0 0 24 24" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 6v13"/><path d="M12 10C9.5 5 3.5 5 3.5 9.5c0 2.5 2.5 3.5 4.5 3.5-2 0-3.5 1.5-3.5 3.5 0 3 4.5 3.5 7.5-.5"/><path d="M12 10c2.5-5 8.5-5 8.5-.5 0 2.5-2.5 3.5-4.5 3.5 2 0 3.5 1.5 3.5 3.5 0 3-4.5 3.5-7.5-.5"/></svg>',
    cross:     '<svg viewBox="0 0 24 24" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z"/></svg>'
  };

  // UI Durum İkonları
  const UI_ICONS = {
    play:       '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>',
    pause:      '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>',
    soundOn:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>',
    soundOff:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',
    eye:        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff:     '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
    fullEnter:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
    fullExit:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
    check:      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    themeLight: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77"/>',
    themeDark:  '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    themeBoard: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>'
  };

  // ==================== UYGULAMA DURUMU ====================
  const state = {
    mode: 'design', // 'design' | 'play' | 'sheet'
    theme: 'light', // 'light' | 'dark' | 'chalkboard'

    // Bulmaca yapılandırması
    title: 'Okul ve Sınıfımız',
    subtitle: 'Aşağıdaki kelimeleri bulmacada bulup renkli kalemle işaretleyiniz.',
    rawWords: '',
    rows: 10,
    cols: 10,
    lockSquare: true,
    shape: 'rect',
    customMask: null,
    directions: ['E', 'S', 'SE'],
    density: 'balanced',
    language: 'tr',
    letterCase: 'upper',
    fontStyle: 'modern',
    fillMode: 'tr_freq',
    mebGroup: 'meb1',
    wordBankMode: 'list',
    secretMessage: 'OKULUMU SEVİYORUM',
    seed: Engine.randomSeed(),

    // A4 Çalışma Kağıdı ayarları
    sheetLayout: 'full', // 'full' | 'half'
    frameStyle: 'modern',
    extraActivity: 'sentences',
    footerText: 'Kemal Öğretmenim · Kelime Avı Atölyesi',
    showStudentBar: true,
    includeAnswerKey: true,
    bwMode: false,
    showQrOnSheet: true,
    sheetPreviewPage: 1,

    // Üretilmiş bulmaca
    puzzle: null,

    // Tasarım modu etkileşimi
    designShowSolution: false,
    designPeekWordId: null,
    designFoundMap: new Map(), // wordId -> { color, stroke }

    // Akıllı Tahta (Oyna) durumu
    playShowSolution: false,
    playFoundMap: new Map(),   // wordId -> { color, stroke, teamIndex }
    playScore: 0,
    playCombo: 0,
    playAttempts: 0,
    playHintsUsed: 0,
    playHintTargetId: null,
    playHintStage: 0,
    playSecretSolved: false,
    playHighlightSecret: false,
    playVictoryShown: false,

    // Zamanlayıcı
    timerMode: 'stopwatch',
    timerSeconds: 0,
    timerRunning: false,
    timerInterval: null,

    // Takımlar
    teamCount: 1,
    activeTeam: 0,
    teams: TEAM_PALETTE.map(t => ({ name: t.name, color: t.color, stroke: t.stroke, score: 0 })),

    // Maske editörü geçici durumu
    tempMask: null,
    maskPointerId: null,
    maskPaintValue: true
  };

  const el = id => document.getElementById(id);
  let toastTimer = null;

  function showToast(msg) {
    const t = el('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  // ==================== BAŞLATMA & STATİK KONTROLLER ====================

  function initStaticControls() {
    // Satır & Sütun seçenekleri (6..20)
    const rowsSel = el('rowsSelect');
    const colsSel = el('colsSelect');
    for (let n = 6; n <= 20; n++) {
      const o1 = document.createElement('option');
      o1.value = String(n);
      o1.textContent = `${n} Satır`;
      rowsSel.appendChild(o1);

      const o2 = document.createElement('option');
      o2.value = String(n);
      o2.textContent = `${n} Sütun`;
      colsSel.appendChild(o2);
    }

    // MEB Ses Grupları seçici
    const mebSel = el('mebGroupSelect');
    Packs.MEB_SOUND_GROUPS.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = `${g.name} — ${g.description}`;
      mebSel.appendChild(opt);
    });

    // Şekil seçici butonları (özel vektör silüetler)
    const picker = el('shapePicker');
    picker.innerHTML = '';
    Engine.SHAPES.forEach(s => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'shape-btn';
      btn.dataset.shape = s.id;
      btn.title = s.name;
      const svgMarkup = SHAPE_SVGS[s.id] || s.icon;
      btn.innerHTML = `<span class="s-ico">${svgMarkup}</span><span class="s-lbl">${s.name.split(' ')[0]}</span>`;
      btn.addEventListener('click', () => {
        state.shape = s.id;
        syncShapeUI();
        rebuildPuzzle(true);
      });
      picker.appendChild(btn);
    });

    // Başlangıç ikonları
    el('btnTimerToggle').innerHTML = UI_ICONS.play;
    el('btnSoundToggle').innerHTML = UI_ICONS.soundOn;

    // Tema yükle
    let theme = window.kemalTheme?.getResolvedTheme() || 'light';
    try {
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (['light', 'dark', 'chalkboard'].includes(savedTheme)) {
        theme = savedTheme;
        localTheme = true;
      }
    } catch (_) {}
    applyTheme(theme, false);
    window.addEventListener('kemal:themechange', event => {
      if (!localTheme) applyTheme(event.detail.theme, false);
    });
  }

  function applyTheme(theme, notify) {
    state.theme = theme;
    workspace.dataset.wordTheme = theme;
    const iconEl = el('themeIconSvg');
    if (iconEl) {
      iconEl.innerHTML = theme === 'dark'
        ? UI_ICONS.themeDark
        : (theme === 'chalkboard' ? UI_ICONS.themeBoard : UI_ICONS.themeLight);
    }
    if (notify) {
      localTheme = true;
      try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}
      const labels = { light: 'Açık Stüdyo', dark: 'Koyu Stüdyo', chalkboard: 'Akıllı Tahta (Yüksek Kontrast)' };
      showToast(`Tema: ${labels[theme]}`);
    }
    requestAnimationFrame(() => redrawAllOverlays());
  }

  function cycleTheme() {
    const order = ['light', 'dark', 'chalkboard'];
    const next = order[(order.indexOf(state.theme) + 1) % order.length];
    applyTheme(next, true);
  }

  // ==================== DURUM <-> FORM SENKRONİZASYONU ====================

  function syncFormFromState() {
    el('titleInput').value = state.title;
    el('subtitleInput').value = state.subtitle;
    el('wordsInput').value = state.rawWords;
    el('rowsSelect').value = String(state.rows);
    el('colsSelect').value = String(state.cols);
    el('lockSquare').checked = state.lockSquare;
    el('languageSelect').value = state.language;
    el('letterCaseSelect').value = state.letterCase;
    el('fontStyleSelect').value = state.fontStyle;
    el('densitySelect').value = state.density;
    el('fillModeSelect').value = state.fillMode;
    el('mebGroupSelect').value = state.mebGroup;
    el('wordBankMode').value = state.wordBankMode;
    el('secretMessageInput').value = state.secretMessage;

    el('sheetLayoutSelect').value = state.sheetLayout;
    el('frameStyleSelect').value = state.frameStyle;
    el('extraActivitySelect').value = state.extraActivity;
    el('footerTextInput').value = state.footerText;
    el('chkStudentBar').checked = state.showStudentBar;
    el('chkIncludeAnswerKey').checked = state.includeAnswerKey;
    el('chkBwMode').checked = state.bwMode;
    el('chkShowQrOnSheet').checked = state.showQrOnSheet;

    el('mebGroupField').classList.toggle('hidden', state.fillMode !== 'meb_group');
    syncShapeUI();
    syncDirectionsUI();
  }

  function syncShapeUI() {
    document.querySelectorAll('#shapePicker .shape-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.shape === state.shape);
    });
  }

  function syncDirectionsUI() {
    const activeSet = new Set(state.directions);
    document.querySelectorAll('#compassGrid .dir-btn').forEach(btn => {
      btn.classList.toggle('active', activeSet.has(btn.dataset.dir));
    });

    // Preset aktiflik kontrolü
    document.querySelectorAll('#dirPresetPills .pill-btn').forEach(btn => {
      const presetDirs = Engine.DIRECTION_PRESETS[btn.dataset.preset] || [];
      const same = presetDirs.length === state.directions.length && presetDirs.every(d => activeSet.has(d));
      btn.classList.toggle('active', same);
    });

    const labels = state.directions.map(id => Engine.DIRECTION_MAP[id]?.arrow || id).join(' ');
    el('dirSummaryText').textContent = `${state.directions.length} yön aktif: ${labels}`;
  }

  // ==================== BULMACA ÜRETİMİ ====================

  function rebuildPuzzle(newSeed) {
    if (newSeed) state.seed = Engine.randomSeed();

    const parsed = Engine.parseWordInput(state.rawWords, state.language);
    el('wordInputCount').textContent = `${parsed.length} kelime`;

    state.puzzle = Engine.generatePuzzle({
      rawWords: state.rawWords,
      rows: state.rows,
      cols: state.cols,
      shape: state.shape,
      customMask: state.customMask,
      directions: state.directions,
      density: state.density,
      language: state.language,
      letterCase: state.letterCase,
      fillMode: state.fillMode,
      mebGroup: state.mebGroup,
      secretMessage: state.secretMessage,
      seed: state.seed
    });

    // Test ve oyun ilerlemesini temizle
    state.designFoundMap.clear();
    state.designPeekWordId = null;
    resetPlayProgress(false);

    renderAll();
  }

  function renderAll() {
    renderDiagnostics();
    renderDesignBoard();
    renderPlayBoard();
    if (state.mode === 'sheet') renderSheetPreview();
  }

  function renderDiagnostics() {
    const p = state.puzzle;
    if (!p) return;

    el('statPlaced').textContent = `${p.stats.placedCount} / ${p.stats.totalInput} Kelime`;
    el('statGrid').textContent = `${p.cols} × ${p.rows}`;
    el('statIntersections').textContent = `${p.stats.intersections} Kesişim`;
    el('statSeed').textContent = `#${p.seed}`;

    // Gizli şifre durumu
    const sBadge = el('secretStatusBadge');
    if (p.secret.enabled) {
      sBadge.classList.add('show');
      if (p.secret.fits) {
        sBadge.className = 'secret-status show ok';
        sBadge.textContent = p.secret.extraUnused === 0
          ? `✓ Mükemmel! ${p.secret.clean.length} harf tüm boş karelere tam sığdı.`
          : `✓ Şifre (${p.secret.clean.length} harf) sığdı · ${p.secret.extraUnused} ekstra dolgu karesi kaldı.`;
      } else {
        sBadge.className = 'secret-status show warn';
        sBadge.textContent = `⚠ Şifre sığmadı! ${p.secret.unusedCount} boş kare var, ${p.secret.clean.length} harf gerekiyor (+${p.secret.neededMore}).`;
      }
    } else {
      sBadge.className = 'secret-status';
      sBadge.textContent = '';
    }

    // Uyarı bandı (Sığmayan kelimeler veya şifre sığmama durumu)
    const warnBanner = el('warningBanner');
    const warnMsgs = [];
    if (p.unplaced.length > 0) {
      const names = p.unplaced.map(u => u.display).join(', ');
      warnMsgs.push(`${p.unplaced.length} kelime ızgaraya sığmadı: ${names}`);
    }
    if (p.secret.enabled && !p.secret.fits) {
      warnMsgs.push(`Gizli şifre için ${p.secret.neededMore} boş kare daha gerekiyor.`);
    }

    if (warnMsgs.length > 0) {
      warnBanner.classList.remove('hidden');
      el('warningText').textContent = '⚠ ' + warnMsgs.join(' · ');
      el('btnAutoFitGrid').textContent = `Izgarayı ${p.stats.recommendedSize}×${p.stats.recommendedSize} Yap`;
    } else {
      warnBanner.classList.add('hidden');
    }
  }

  // ==================== ORTAK IZGARA & KELİME BANKASI RENDER ====================

  function computeCellSize(puzzle, isPlay) {
    const maxDim = Math.max(puzzle.rows, puzzle.cols);
    const container = el(isPlay ? 'playPuzzleContainer' : 'designPuzzleContainer');
    const width = container.parentElement.clientWidth || workspace.clientWidth - 64;
    const gap = maxDim >= 15 ? (width < 420 ? 2 : 3) : (isPlay ? 5 : 4);
    const byWidth = Math.floor((width - 28 - gap * (puzzle.cols - 1)) / puzzle.cols);
    const limit = isPlay ? 62 : 48;
    const playHeight = Math.max(320, el('viewPlay').clientHeight - (state.teamCount > 1 ? 180 : 130));
    const byHeight = isPlay ? Math.floor((playHeight - 28 - gap * (puzzle.rows - 1)) / puzzle.rows) : limit;
    return { size: Math.max(1, Math.min(limit, byWidth, Math.max(24, byHeight))), gap };
  }

  function applyFontClass(container) {
    container.classList.remove('font-modern', 'font-primary', 'font-mono', 'font-dyslexia');
    container.classList.add(`font-${state.fontStyle || 'modern'}`);
  }

  function buildGridDOM(container, gridEl, puzzle, isPlay) {
    const { size, gap } = computeCellSize(puzzle, isPlay);
    container.style.setProperty('--cell-size', `${size}px`);
    container.style.setProperty('--cell-gap', `${gap}px`);
    container.classList.toggle('is-shaped', puzzle.shape !== 'rect');
    applyFontClass(container);

    gridEl.style.gridTemplateColumns = `repeat(${puzzle.cols}, var(--cell-size))`;
    const focusedCell = gridEl.contains(document.activeElement) ? document.activeElement : null;
    gridEl.innerHTML = '';

    const frag = document.createDocumentFragment();
    for (let y = 0; y < puzzle.rows; y++) {
      for (let x = 0; x < puzzle.cols; x++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.x = String(x);
        cell.dataset.y = String(y);
        cell.setAttribute('role', 'gridcell');

        if (!puzzle.mask[y][x]) {
          cell.classList.add('masked-off');
          cell.setAttribute('aria-hidden', 'true');
        } else {
          const ch = Engine.formatLetter(puzzle.grid[y][x], state.letterCase, puzzle.language);
          cell.textContent = ch;
          cell.tabIndex = -1;
          cell.setAttribute('aria-label', `${y + 1}. satır ${x + 1}. sütun ${ch}`);
        }
        frag.appendChild(cell);
      }
    }
    gridEl.appendChild(frag);
    const firstCell = gridEl.querySelector('.cell:not(.masked-off)');
    const nextFocus = focusedCell && gridEl.querySelector(
      '.cell:not(.masked-off)[data-x="' + focusedCell.dataset.x + '"][data-y="' + focusedCell.dataset.y + '"]'
    );
    if (firstCell) (nextFocus || firstCell).tabIndex = 0;
    if (nextFocus) nextFocus.focus({ preventScroll: true });
  }

  function formatWordListLabel(item, isFound) {
    const wordText = Engine.formatDisplayWord(item.display, state.letterCase, state.language);
    switch (state.wordBankMode) {
      case 'clues': {
        const base = item.clue ? item.clue : wordText;
        return isFound
          ? `<span class="wi-text">${escapeHtml(base)}</span><span class="wi-clue-answer">${escapeHtml(wordText)}</span>`
          : `<span class="wi-text">${escapeHtml(base)}</span>`;
      }
      case 'emoji': {
        const em = item.emoji || '🔎';
        if (isFound) return `<span class="wi-text">${em} ${escapeHtml(wordText)}</span>`;
        const dashes = '_ '.repeat(item.clean.length).trim();
        return `<span class="wi-text">${em} &nbsp;${dashes}</span>`;
      }
      case 'masked': {
        const txt = isFound ? wordText : Engine.formatDisplayWord(item.masked, state.letterCase, state.language);
        return `<span class="wi-text">${escapeHtml(txt)}</span>`;
      }
      case 'anagram': {
        const txt = isFound ? wordText : Engine.formatDisplayWord(item.anagram, state.letterCase, state.language);
        return `<span class="wi-text">${escapeHtml(txt)}</span>`;
      }
      case 'hidden': {
        if (isFound) return `<span class="wi-text">${escapeHtml(wordText)}</span>`;
        return `<span class="wi-text">${'• '.repeat(item.clean.length).trim()}</span>`;
      }
      case 'list':
      default: {
        const prefix = item.emoji ? `${item.emoji} ` : '';
        return `<span class="wi-text">${prefix}${escapeHtml(wordText)}</span>`;
      }
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderWordBankList(listEl, puzzle, foundMap, isDesign) {
    const isChip = state.wordBankMode === 'list' || state.wordBankMode === 'anagram' || state.wordBankMode === 'masked';
    listEl.classList.toggle('chip-layout', isChip);
    listEl.innerHTML = '';

    puzzle.placed.forEach((item, idx) => {
      const foundInfo = foundMap.get(item.id);
      const isFound = Boolean(foundInfo);
      const pal = Export.PILL_COLORS[idx % Export.PILL_COLORS.length];

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'word-item';
      if (isFound) btn.classList.add('found');
      if (isDesign && state.designPeekWordId === item.id) btn.classList.add('selected-peek');

      const dotColor = isFound ? foundInfo.color : (isDesign ? pal.solid : 'var(--border-strong)');
      const showLen = state.wordBankMode === 'clues' || state.wordBankMode === 'hidden';
      const rightBadge = isFound ? UI_ICONS.check : (showLen ? `${item.clean.length}` : '');

      btn.innerHTML = `
        <span class="wi-main">
          <span class="wi-dot" style="background:${dotColor}"></span>
          <span>${formatWordListLabel(item, isFound)}</span>
        </span>
        ${rightBadge ? `<span class="wi-len">${rightBadge}</span>` : ''}
      `;

      btn.addEventListener('click', () => {
        if (isDesign) {
          state.designPeekWordId = state.designPeekWordId === item.id ? null : item.id;
          renderDesignWordListOnly();
          redrawOverlay('design');
        } else {
          if (isFound) showToast(`${item.display} bulundu.`);
          else showToast('İpucu için üstteki İpucu butonunu kullanabilirsiniz.');
        }
      });

      listEl.appendChild(btn);
    });
  }

  function renderSecretBoxes(containerEl, puzzle, revealed) {
    containerEl.innerHTML = '';
    if (!puzzle.secret.enabled || !puzzle.secret.fits) return;
    for (const ch of puzzle.secret.display) {
      if (ch === ' ') {
        const sp = document.createElement('span');
        sp.className = 'secret-space';
        containerEl.appendChild(sp);
      } else {
        const box = document.createElement('span');
        box.className = 'secret-box' + (revealed ? ' revealed' : '');
        box.textContent = revealed ? Engine.formatLetter(ch, state.letterCase, puzzle.language) : '';
        containerEl.appendChild(box);
      }
    }
  }

  // ==================== TASARIM SAHNESİ ====================

  function renderDesignBoard() {
    const p = state.puzzle;
    if (!p) return;

    el('designBoardTitle').textContent = state.title || 'Kelime Avı';
    buildGridDOM(el('designPuzzleContainer'), el('designPuzzleGrid'), p, false);
    renderDesignWordListOnly();

    // Gizli şifre çubuğu
    const bar = el('designSecretBar');
    if (p.secret.enabled && p.secret.fits) {
      bar.classList.remove('hidden');
      renderSecretBoxes(el('designSecretBoxes'), p, true);
    } else {
      bar.classList.add('hidden');
    }

    el('btnToggleSolution').innerHTML = state.designShowSolution
      ? `${UI_ICONS.eyeOff}<span>Gizle</span>`
      : `${UI_ICONS.eye}<span>Çözüm</span>`;

    applySecretCellHighlights('design');
    requestAnimationFrame(() => redrawOverlay('design'));
  }

  function renderDesignWordListOnly() {
    const p = state.puzzle;
    if (!p) return;
    el('designFoundCounter').textContent = `${state.designFoundMap.size} / ${p.placed.length}`;
    renderWordBankList(el('designWordList'), p, state.designFoundMap, true);
  }

  // ==================== AKILLI TAHTA (OYNA) SAHNESİ ====================

  function renderPlayBoard() {
    const p = state.puzzle;
    if (!p) return;

    el('playTitle').textContent = state.title || 'Kelime Avı';
    buildGridDOM(el('playPuzzleContainer'), el('playPuzzleGrid'), p, true);
    updatePlayHUD();
    renderTeamScoreboard();

    // Gizli şifre kutusu
    const sPanel = el('playSecretPanel');
    if (p.secret.enabled && p.secret.fits) {
      sPanel.classList.remove('hidden');
      renderSecretBoxes(el('playSecretSlots'), p, state.playSecretSolved);
      el('secretGuessInput').disabled = state.playSecretSolved;
      el('btnCheckSecret').disabled = state.playSecretSolved;
      if (!state.playSecretSolved) {
        el('secretGuessInput').value = '';
        el('secretGuessFeedback').textContent = '';
        el('secretGuessFeedback').className = 'secret-feedback';
      }
    } else {
      sPanel.classList.add('hidden');
    }

    applySecretCellHighlights('play');
    requestAnimationFrame(() => redrawOverlay('play'));
  }

  function updatePlayHUD() {
    const p = state.puzzle;
    if (!p) return;
    const total = p.placed.length;
    const found = state.playFoundMap.size;
    const pct = total ? Math.round((found / total) * 100) : 0;

    el('playProgressBar').style.width = `${pct}%`;
    el('playProgressText').textContent = `${found} / ${total}`;
    el('playRemainingBadge').textContent = found === total ? 'Tamamlandı' : `${total - found} kaldı`;
    el('playScoreVal').textContent = `${state.playScore} Puan`;
    el('btnPlaySolution').innerHTML = state.playShowSolution
      ? `${UI_ICONS.eyeOff}<span>Gizle</span>`
      : `${UI_ICONS.eye}<span>Çözüm</span>`;

    renderWordBankList(el('playWordList'), p, state.playFoundMap, false);
  }

  function renderTeamScoreboard() {
    const board = el('teamScoreboard');
    if (state.teamCount <= 1) {
      board.classList.add('hidden');
      return;
    }
    board.classList.remove('hidden');
    board.innerHTML = '';

    for (let i = 0; i < state.teamCount; i++) {
      const team = state.teams[i];
      const card = document.createElement('div');
      card.className = 'team-card' + (state.activeTeam === i ? ' active-turn' : '');
      card.style.setProperty('--team-color', team.color);

      card.innerHTML = `
        <span class="team-dot"></span>
        <input class="team-name-input" type="text" value="${escapeHtml(team.name)}" aria-label="Takım adı" />
        <span class="team-score-val">${team.score}</span>
        ${state.activeTeam === i ? '<span class="team-turn-pill">Sıra</span>' : ''}
      `;

      const nameInput = card.querySelector('.team-name-input');
      nameInput.addEventListener('click', e => e.stopPropagation());
      nameInput.addEventListener('input', e => { team.name = e.target.value || `Takım ${i + 1}`; });

      card.addEventListener('click', () => {
        state.activeTeam = i;
        renderTeamScoreboard();
      });

      board.appendChild(card);
    }
  }

  function applySecretCellHighlights(boardId) {
    const p = state.puzzle;
    if (!p) return;
    const gridEl = el(boardId === 'design' ? 'designPuzzleGrid' : 'playPuzzleGrid');
    const showSecret = boardId === 'design'
      ? (state.designShowSolution && p.secret.enabled && p.secret.fits)
      : (state.playHighlightSecret && p.secret.enabled && p.secret.fits);

    const secretKeys = new Set(showSecret ? p.secret.cells.map(c => `${c.x}-${c.y}`) : []);
    gridEl.querySelectorAll('.cell').forEach(cell => {
      const key = `${cell.dataset.x}-${cell.dataset.y}`;
      cell.classList.toggle('secret-glow', secretKeys.has(key));
    });
  }

  // ==================== SVG KAPSÜL (PILL) OVERLAY ÇİZİMİ ====================

  function getCellCenter(container, gridEl, x, y) {
    const cell = gridEl.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
    if (!cell) return null;
    const cRect = container.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    return {
      cx: cellRect.left - cRect.left + cellRect.width / 2,
      cy: cellRect.top - cRect.top + cellRect.height / 2,
      size: cellRect.width
    };
  }

  function createSvgLine(x1, y1, x2, y2, stroke, width, extraAttrs) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(x1));
    line.setAttribute('y1', String(y1));
    line.setAttribute('x2', String(x2));
    line.setAttribute('y2', String(y2));
    line.setAttribute('stroke', stroke);
    line.setAttribute('stroke-width', String(width));
    line.setAttribute('stroke-linecap', 'round');
    if (extraAttrs) {
      Object.entries(extraAttrs).forEach(([k, v]) => line.setAttribute(k, String(v)));
    }
    return line;
  }

  const activeDragLines = { design: null, play: null };

  function redrawOverlay(boardId) {
    const p = state.puzzle;
    if (!p) return;

    const isDesign = boardId === 'design';
    const container = el(isDesign ? 'designPuzzleContainer' : 'playPuzzleContainer');
    const gridEl    = el(isDesign ? 'designPuzzleGrid' : 'playPuzzleGrid');
    const svgEl     = el(isDesign ? 'designOverlaySvg' : 'playOverlaySvg');

    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    svgEl.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
    svgEl.innerHTML = '';

    const showSol = isDesign ? state.designShowSolution : state.playShowSolution;
    const foundMap = isDesign ? state.designFoundMap : state.playFoundMap;

    // 1. Çözüm kapsülleri (tümü açıksa)
    if (showSol) {
      p.placed.forEach((item, idx) => {
        if (foundMap.has(item.id)) return;
        const a = getCellCenter(container, gridEl, item.start.x, item.start.y);
        const b = getCellCenter(container, gridEl, item.end.x, item.end.y);
        if (!a || !b) return;
        const pal = Export.PILL_COLORS[idx % Export.PILL_COLORS.length];
        svgEl.appendChild(createSvgLine(a.cx, a.cy, b.cx, b.cy, pal.stroke, a.size * 0.78));
      });
    }

    // 2. Tasarım modunda tek kelimeye tıklandıysa (peek)
    if (isDesign && state.designPeekWordId) {
      const item = p.placed.find(w => w.id === state.designPeekWordId);
      if (item) {
        const a = getCellCenter(container, gridEl, item.start.x, item.start.y);
        const b = getCellCenter(container, gridEl, item.end.x, item.end.y);
        if (a && b) {
          svgEl.appendChild(createSvgLine(a.cx, a.cy, b.cx, b.cy, 'rgba(37, 99, 235, 0.45)', a.size * 0.84));
        }
      }
    }

    // 3. Bulunmuş kelimelerin kalıcı kapsülleri
    p.placed.forEach(item => {
      const f = foundMap.get(item.id);
      if (!f) return;
      const a = getCellCenter(container, gridEl, item.start.x, item.start.y);
      const b = getCellCenter(container, gridEl, item.end.x, item.end.y);
      if (!a || !b) return;
      svgEl.appendChild(createSvgLine(a.cx, a.cy, b.cx, b.cy, f.stroke, a.size * 0.80));
    });

    // 4. Anlık sürükleme kapsülü (varsa)
    const drag = activeDragLines[boardId];
    if (drag && drag.path && drag.path.length > 0) {
      const first = drag.path[0];
      const last  = drag.path[drag.path.length - 1];
      const a = getCellCenter(container, gridEl, first.x, first.y);
      const b = getCellCenter(container, gridEl, last.x, last.y);
      if (a && b) {
        const stroke = drag.flashWrong
          ? 'rgba(220, 38, 38, 0.44)'
          : (state.teamCount > 1 && !isDesign
              ? state.teams[state.activeTeam].stroke
              : 'rgba(79, 70, 229, 0.38)');
        svgEl.appendChild(createSvgLine(a.cx, a.cy, b.cx, b.cy, stroke, a.size * 0.82));
      }
    }
  }

  function redrawAllOverlays() {
    if (!state.puzzle) return;
    if (state.mode === 'design') {
      const { size, gap } = computeCellSize(state.puzzle, false);
      el('designPuzzleContainer').style.setProperty('--cell-size', `${size}px`);
      el('designPuzzleContainer').style.setProperty('--cell-gap', `${gap}px`);
      redrawOverlay('design');
    } else if (state.mode === 'play') {
      const { size, gap } = computeCellSize(state.puzzle, true);
      el('playPuzzleContainer').style.setProperty('--cell-size', `${size}px`);
      el('playPuzzleContainer').style.setProperty('--cell-gap', `${gap}px`);
      redrawOverlay('play');
    }
  }

  // ==================== 8-YÖNLÜ SÜRÜKLE-BIRAK & TIKLA-TIKLA MOTORU ====================

  function buildLinePath(start, end, puzzle) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (dx !== 0 && dy !== 0 && absX !== absY) return null;
    const steps = Math.max(absX, absY);
    const sx = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
    const sy = dy === 0 ? 0 : (dy > 0 ? 1 : -1);
    const path = [];
    for (let i = 0; i <= steps; i++) {
      const nx = start.x + sx * i;
      const ny = start.y + sy * i;
      if (nx < 0 || ny < 0 || nx >= puzzle.cols || ny >= puzzle.rows || !puzzle.mask[ny][nx]) {
        return null;
      }
      path.push({ x: nx, y: ny });
    }
    return path;
  }

  function snapPointerToPath(start, clientX, clientY, container, gridEl, puzzle) {
    const startCenter = getCellCenter(container, gridEl, start.x, start.y);
    if (!startCenter) return [start];

    const cRect = container.getBoundingClientRect();
    const px = clientX - cRect.left;
    const py = clientY - cRect.top;
    const dxPx = px - startCenter.cx;
    const dyPx = py - startCenter.cy;
    const distPx = Math.hypot(dxPx, dyPx);

    const gap = parseFloat(getComputedStyle(container).getPropertyValue('--cell-gap')) || 4;
    const stepUnit = startCenter.size + gap;

    if (distPx < stepUnit * 0.42) return [start];

    // 8 ana yöne (45° adımlar) kilitle
    const angle = Math.atan2(dyPx, dxPx);
    const octant = Math.round(angle / (Math.PI / 4));
    const snappedAngle = octant * (Math.PI / 4);
    const sx = Math.round(Math.cos(snappedAngle));
    const sy = Math.round(Math.sin(snappedAngle));

    const diagFactor = (sx !== 0 && sy !== 0) ? Math.SQRT2 : 1;
    const proj = (dxPx * Math.cos(snappedAngle) + dyPx * Math.sin(snappedAngle)) / (stepUnit * diagFactor);
    const steps = Math.max(0, Math.round(proj));

    const path = [start];
    for (let i = 1; i <= steps; i++) {
      const nx = start.x + sx * i;
      const ny = start.y + sy * i;
      if (nx < 0 || ny < 0 || nx >= puzzle.cols || ny >= puzzle.rows || !puzzle.mask[ny][nx]) {
        break;
      }
      path.push({ x: nx, y: ny });
    }
    return path;
  }

  function attachBoardInteraction(boardId) {
    const isDesign = boardId === 'design';
    const container = el(isDesign ? 'designPuzzleContainer' : 'playPuzzleContainer');
    const gridEl    = el(isDesign ? 'designPuzzleGrid' : 'playPuzzleGrid');
    const liveEl    = el(isDesign ? 'designLiveSelection' : 'playLiveSelection');

    let dragging = false;
    let pointerId = null;
    let startCell = null;
    let currentPath = [];
    let tapAnchor = null;

    function clearTapAnchor() {
      if (!tapAnchor) return;
      const old = gridEl.querySelector('.cell.tap-anchor');
      if (old) old.classList.remove('tap-anchor');
      tapAnchor = null;
    }

    function updateLivePill(path) {
      const p = state.puzzle;
      if (!p || !path || path.length === 0) {
        if (isDesign) {
          liveEl.classList.add('hidden');
          liveEl.textContent = '';
        } else {
          liveEl.innerHTML = '<span class="sel-placeholder">İlk ve son harfi seç. Klavyede ok tuşları ve Enter kullan.</span>';
        }
        return;
      }
      const text = path.map(c => Engine.formatLetter(p.grid[c.y][c.x], state.letterCase, p.language)).join(' ');
      if (isDesign) {
        liveEl.classList.remove('hidden');
        liveEl.textContent = text;
      } else {
        liveEl.textContent = text;
      }
    }

    function evaluateSelection(path) {
      const p = state.puzzle;
      if (!p || path.length < 2) {
        activeDragLines[boardId] = null;
        updateLivePill([]);
        redrawOverlay(boardId);
        return;
      }

      if (!isDesign && !state.timerRunning && state.timerMode !== 'off') {
        startTimer();
      }

      const foundMap = isDesign ? state.designFoundMap : state.playFoundMap;
      const first = path[0];
      const last  = path[path.length - 1];

      // Hem düz hem ters sürüklemeyi kabul et
      const match = p.placed.find(item => {
        if (foundMap.has(item.id)) return false;
        if (item.cells.length !== path.length) return false;
        const fwd = item.start.x === first.x && item.start.y === first.y &&
                    item.end.x === last.x && item.end.y === last.y;
        const rev = item.end.x === first.x && item.end.y === first.y &&
                    item.start.x === last.x && item.start.y === last.y;
        return fwd || rev;
      });

      if (match) {
        const idx = p.placed.indexOf(match);
        let colorObj;
        if (!isDesign && state.teamCount > 1) {
          const team = state.teams[state.activeTeam];
          colorObj = { color: team.color, stroke: team.stroke, teamIndex: state.activeTeam };
        } else {
          const pal = Export.PILL_COLORS[idx % Export.PILL_COLORS.length];
          colorObj = { color: pal.solid, stroke: pal.stroke, teamIndex: 0 };
        }

        foundMap.set(match.id, colorObj);
        activeDragLines[boardId] = null;
        updateLivePill([]);

        if (isDesign) {
          Sound.playFound(1);
          renderDesignWordListOnly();
          redrawOverlay('design');
          showToast(`✓ ${match.display} bulundu!`);
        } else {
          state.playAttempts++;
          state.playCombo++;
          const pts = 100 + Math.min(4, state.playCombo - 1) * 25;
          state.playScore += pts;
          if (state.teamCount > 1) {
            state.teams[state.activeTeam].score += pts;
            state.activeTeam = (state.activeTeam + 1) % state.teamCount;
            renderTeamScoreboard();
          }
          if (state.playHintTargetId === match.id) {
            state.playHintTargetId = null;
            state.playHintStage = 0;
          }
          Sound.playFound(state.playCombo);
          updatePlayHUD();
          redrawOverlay('play');

          // Tüm kelimeler bulundu mu?
          if (state.playFoundMap.size === p.placed.length) {
            onAllWordsFound();
          }
        }
      } else {
        // Yanlış seçim geri bildirimi
        if (!isDesign) {
          state.playAttempts++;
          state.playCombo = 0;
        }
        Sound.playWrong();
        activeDragLines[boardId] = { path, flashWrong: true };
        redrawOverlay(boardId);
        container.classList.remove('wrong-flash');
        void container.offsetWidth;
        container.classList.add('wrong-flash');

        setTimeout(() => {
          activeDragLines[boardId] = null;
          updateLivePill([]);
          redrawOverlay(boardId);
        }, 280);
      }
    }

    function markAnchor(point) {
      tapAnchor = point;
      gridEl.querySelector('.cell[data-x="' + point.x + '"][data-y="' + point.y + '"]')?.classList.add('tap-anchor');
      updateLivePill([point]);
    }

    function selectEndpoint(point) {
      if (!tapAnchor) return false;
      const sameCell = tapAnchor.x === point.x && tapAnchor.y === point.y;
      const path = buildLinePath(tapAnchor, point, state.puzzle);
      clearTapAnchor();
      if (sameCell) updateLivePill([]);
      else if (path && path.length >= 2) evaluateSelection(path);
      else return false;
      return true;
    }

    const navigation = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    gridEl.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey || dragging) return;
      const cell = e.target.closest('.cell');
      if (!cell || cell.classList.contains('masked-off')) return;
      const point = { x: Number(cell.dataset.x), y: Number(cell.dataset.y) };
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!e.repeat && !selectEndpoint(point)) markAnchor(point);
        return;
      }
      if (e.key === 'Escape' && tapAnchor) {
        e.stopPropagation();
        clearTapAnchor();
        updateLivePill([]);
        return;
      }
      const direction = navigation[e.key];
      if (!direction) return;
      e.preventDefault();
      const [dx, dy] = direction;
      let x = point.x + dx, y = point.y + dy;
      const { rows, cols, mask } = state.puzzle;
      while (x >= 0 && x < cols && y >= 0 && y < rows) {
        if (mask[y][x]) {
          const next = gridEl.querySelector('.cell[data-x="' + x + '"][data-y="' + y + '"]');
          cell.tabIndex = -1;
          next.tabIndex = 0;
          next.focus();
          break;
        }
        x += dx;
        y += dy;
      }
    });

    container.addEventListener('pointerdown', e => {
      if (dragging || (e.button !== undefined && e.button !== 0)) return;
      const cell = e.target.closest('.cell');
      if (!cell || cell.classList.contains('masked-off')) return;
      const point = { x: Number(cell.dataset.x), y: Number(cell.dataset.y) };
      e.preventDefault();
      if (selectEndpoint(point)) return;
      dragging = true;
      pointerId = e.pointerId;
      startCell = point;
      currentPath = [startCell];
      activeDragLines[boardId] = { path: currentPath, flashWrong: false };
      try { container.setPointerCapture(pointerId); } catch (_) {}

      Sound.playStep(0);
      updateLivePill(currentPath);
      redrawOverlay(boardId);
    });

    container.addEventListener('pointermove', e => {
      if (!dragging || e.pointerId !== pointerId || !startCell) return;
      e.preventDefault();
      const nextPath = snapPointerToPath(startCell, e.clientX, e.clientY, container, gridEl, state.puzzle);
      const prevLen = currentPath.length;
      const prevEnd = currentPath[currentPath.length - 1];
      const nextEnd = nextPath[nextPath.length - 1];

      if (nextPath.length !== prevLen || prevEnd.x !== nextEnd.x || prevEnd.y !== nextEnd.y) {
        currentPath = nextPath;
        activeDragLines[boardId] = { path: currentPath, flashWrong: false };
        Sound.playStep(currentPath.length - 1);
        updateLivePill(currentPath);
        redrawOverlay(boardId);
      }
    });

    function finishDrag(e) {
      if (!dragging || (e.pointerId !== undefined && e.pointerId !== pointerId)) return;
      dragging = false;
      pointerId = null;

      if (e.type !== 'pointerup') {
        activeDragLines[boardId] = null;
        updateLivePill([]);
        redrawOverlay(boardId);
      } else if (currentPath.length >= 2) {
        evaluateSelection(currentPath);
      } else if (startCell) {
        markAnchor(startCell);
        activeDragLines[boardId] = null;
        redrawOverlay(boardId);
      }
      startCell = null;
      currentPath = [];
    }

    container.addEventListener('pointerup', finishDrag);
    container.addEventListener('pointercancel', finishDrag);
    container.addEventListener('lostpointercapture', finishDrag);
  }

  // ==================== OYUN MEKANİKLERİ (ZAMANLAYICI, İPUCU, ŞİFRE, ZAFER) ====================

  function resetPlayProgress(startNewTimer) {
    state.playFoundMap.clear();
    state.playShowSolution = false;
    state.playScore = 0;
    state.playCombo = 0;
    state.playAttempts = 0;
    state.playHintsUsed = 0;
    state.playHintTargetId = null;
    state.playHintStage = 0;
    state.playSecretSolved = false;
    state.playHighlightSecret = false;
    state.playVictoryShown = false;
    state.activeTeam = 0;
    state.teams.forEach(t => { t.score = 0; });

    stopTimer();
    initTimerValue();
    if (startNewTimer && state.mode === 'play' && state.timerMode !== 'off') {
      startTimer();
    }
    if (state.puzzle) {
      renderPlayBoard();
    }
  }

  function initTimerValue() {
    if (state.timerMode.startsWith('down-')) {
      state.timerSeconds = Number(state.timerMode.split('-')[1]) || 120;
    } else {
      state.timerSeconds = 0;
    }
    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    const disp = el('timerDisplay');
    if (state.timerMode === 'off') {
      disp.textContent = '∞';
      disp.classList.remove('urgent');
      return;
    }
    const mins = Math.floor(state.timerSeconds / 60);
    const secs = state.timerSeconds % 60;
    disp.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    disp.classList.toggle('urgent', state.timerMode.startsWith('down-') && state.timerSeconds <= 15 && state.timerSeconds > 0);
  }

  function startTimer() {
    if (state.timerMode === 'off' || state.timerRunning) return;
    state.timerRunning = true;
    el('btnTimerToggle').innerHTML = UI_ICONS.pause;
    state.timerInterval = setInterval(() => {
      if (state.timerMode.startsWith('down-')) {
        state.timerSeconds = Math.max(0, state.timerSeconds - 1);
        updateTimerDisplay();
        if (state.timerSeconds === 0) {
          stopTimer();
          Sound.playTimeUp();
          showToast('Süre doldu. Kalan kelimeleri çözebilir veya çözümü görebilirsiniz.');
        }
      } else {
        state.timerSeconds++;
        updateTimerDisplay();
      }
    }, 1000);
  }

  function stopTimer() {
    state.timerRunning = false;
    clearInterval(state.timerInterval);
    state.timerInterval = null;
    if (el('btnTimerToggle')) el('btnTimerToggle').innerHTML = UI_ICONS.play;
  }

  function givePlayHint() {
    const p = state.puzzle;
    if (!p) return;
    const remaining = p.placed.filter(w => !state.playFoundMap.has(w.id));
    if (remaining.length === 0) {
      showToast('Tüm kelimeler zaten bulundu!');
      return;
    }

    let target = remaining.find(w => w.id === state.playHintTargetId);
    if (!target) {
      target = remaining[0];
      state.playHintTargetId = target.id;
      state.playHintStage = 1;
    } else {
      state.playHintStage = Math.min(2, state.playHintStage + 1);
    }

    state.playHintsUsed++;
    state.playScore = Math.max(0, state.playScore - 20);
    updatePlayHUD();

    const gridEl = el('playPuzzleGrid');
    const pulseCells = state.playHintStage === 1
      ? [target.cells[0]]
      : [target.cells[0], target.cells[1]].filter(Boolean);

    pulseCells.forEach(c => {
      const cellEl = gridEl.querySelector(`.cell[data-x="${c.x}"][data-y="${c.y}"]`);
      if (cellEl) {
        cellEl.classList.remove('hint-pulse');
        void cellEl.offsetWidth;
        cellEl.classList.add('hint-pulse');
        setTimeout(() => cellEl.classList.remove('hint-pulse'), 2800);
      }
    });

    Sound.playHint();
    const hintWordLabel = state.wordBankMode === 'list' ? `"${target.display}" kelimesinin` : 'Bir kelimenin';
    showToast(
      state.playHintStage === 1
        ? `İpucu: ${hintWordLabel} başlangıç harfi vurgulandı.`
        : `Yön ipucu: ${hintWordLabel} ilk iki harfi vurgulandı.`
    );
  }

  function checkSecretGuess() {
    const p = state.puzzle;
    if (!p || !p.secret.enabled || !p.secret.fits || state.playSecretSolved) return;
    const raw = el('secretGuessInput').value;
    const cleaned = Engine.cleanLetters(raw, p.language);
    const fb = el('secretGuessFeedback');

    if (!cleaned) {
      fb.textContent = 'Lütfen şifre tahmininizi yazın.';
      fb.className = 'secret-feedback err';
      return;
    }

    if (cleaned === p.secret.clean) {
      state.playSecretSolved = true;
      state.playHighlightSecret = true;
      state.playScore += 250;
      fb.textContent = 'Tebrikler! Gizli şifreyi doğru çözdün (+250 puan).';
      fb.className = 'secret-feedback ok';
      renderSecretBoxes(el('playSecretSlots'), p, true);
      el('secretGuessInput').disabled = true;
      el('btnCheckSecret').disabled = true;
      applySecretCellHighlights('play');
      updatePlayHUD();
      Sound.playVictory();
      Sound.launchConfetti(el('confettiCanvas'));
    } else {
      fb.textContent = 'Tam değil! Kullanılmayan harfleri soldan sağa tekrar oku.';
      fb.className = 'secret-feedback err';
      Sound.playWrong();
    }
  }

  function onAllWordsFound() {
    if (state.playVictoryShown) return;
    state.playVictoryShown = true;
    stopTimer();
    Sound.playVictory();
    Sound.launchConfetti(el('confettiCanvas'));

    const p = state.puzzle;
    const acc = state.playAttempts > 0
      ? Math.min(100, Math.round((p.placed.length / state.playAttempts) * 100))
      : 100;

    // Eğer gizli şifre varsa kalan harfleri tahtada parlat
    if (p.secret.enabled && p.secret.fits) {
      state.playHighlightSecret = true;
      applySecretCellHighlights('play');
    }

    let summary = `${p.placed.length} kelimenin tamamını başarıyla buldunuz!`;
    if (state.teamCount > 1) {
      const sorted = state.teams.slice(0, state.teamCount).sort((a, b) => b.score - a.score);
      if (sorted[0].score > sorted[1].score) {
        summary = `Kazanan: ${sorted[0].name} (${sorted[0].score} Puan)`;
      } else {
        summary = `Berabere tamamlandı (${sorted[0].score} Puan)`;
      }
    }

    el('victorySummary').textContent = summary;
    el('victoryStats').innerHTML = `
      <div class="v-stat"><strong>${el('timerDisplay').textContent}</strong><span>Süre</span></div>
      <div class="v-stat"><strong>${state.playScore}</strong><span>Toplam Puan</span></div>
      <div class="v-stat"><strong>%${acc}</strong><span>İsabet</span></div>
    `;

    const secEl = el('victorySecretReveal');
    if (p.secret.enabled && p.secret.fits) {
      secEl.classList.remove('hidden');
      secEl.textContent = state.playSecretSolved
        ? `Gizli Şifre Çözüldü: ${p.secret.display}`
        : 'Sıra Gizli Şifrede: Tahtada vurgulanan kalan harfleri okuyup sağdaki kutuya yazın.';
    } else {
      secEl.classList.add('hidden');
    }

    openModal('modalVictory');
  }

  // ==================== 3. ÇALIŞMA KAĞIDI (A4) & DIŞA AKTARIM ====================

  function getExportOptions(isAnswerKey) {
    return {
      title: state.title,
      subtitle: state.subtitle,
      letterCase: state.letterCase,
      fontStyle: state.fontStyle,
      wordBankMode: state.wordBankMode,
      sheetLayout: state.sheetLayout,
      frameStyle: state.frameStyle,
      extraActivity: state.extraActivity,
      footerText: state.footerText,
      showStudentBar: state.showStudentBar,
      includeAnswerKey: state.includeAnswerKey,
      bwMode: state.bwMode,
      showQrOnSheet: state.showQrOnSheet,
      shareUrl: buildShareUrl(),
      isAnswerKey: Boolean(isAnswerKey),
      showSolution: Boolean(isAnswerKey || state.designShowSolution)
    };
  }

  function renderSheetPreview() {
    if (!state.puzzle) return;
    const canvas = el('sheetPreviewCanvas');
    const isAns = state.sheetPreviewPage === 2;
    Export.renderWorksheetToCanvas(canvas, state.puzzle, Object.assign(getExportOptions(isAns), {
      scale: 1.5
    }));
  }

  function slugifyFileName(str) {
    return String(str || 'kelime-avi')
      .toLocaleLowerCase('tr-TR')
      .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
      .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'kelime-avi';
  }

  function triggerDownloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function downloadPdf() {
    if (!state.puzzle) return;
    const blob = Export.exportWorksheetPdf(state.puzzle, getExportOptions(false));
    const fname = `${slugifyFileName(state.title)}-calisma-kagidi.pdf`;
    triggerDownloadBlob(blob, fname);
    showToast(state.includeAnswerKey
      ? '2 sayfalı A4 PDF (Çalışma Kağıdı + Cevap Anahtarı) indirildi.'
      : 'A4 PDF indirildi.');
  }

  function downloadPng(isAnswerKey) {
    if (!state.puzzle) return;
    const c = document.createElement('canvas');
    Export.renderWorksheetToCanvas(c, state.puzzle, Object.assign(getExportOptions(isAnswerKey), { scale: 2.08 }));
    c.toBlob(blob => {
      if (!blob) return;
      const suffix = isAnswerKey ? '-cevap-anahtari.png' : '-calisma-kagidi.png';
      triggerDownloadBlob(blob, slugifyFileName(state.title) + suffix);
      showToast('Yüksek çözünürlüklü A4 PNG indirildi.');
    }, 'image/png');
  }

  function downloadSvg() {
    if (!state.puzzle) return;
    const svg = Export.buildPuzzleSvg(state.puzzle, getExportOptions(state.designShowSolution));
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    triggerDownloadBlob(blob, `${slugifyFileName(state.title)}.svg`);
    showToast('Vektör SVG indirildi.');
  }

  function preparePrintPages() {
    if (!state.puzzle) return;
    const mount = el('printMount');
    mount.innerHTML = '';

    const pagesToPrint = [false];
    if (state.includeAnswerKey) pagesToPrint.push(true);

    pagesToPrint.forEach(isAns => {
      const c = document.createElement('canvas');
      Export.renderWorksheetToCanvas(c, state.puzzle, Object.assign(getExportOptions(isAns), {
        scale: 2.08,
        sheetLayout: isAns ? 'full' : state.sheetLayout
      }));
      const pageDiv = document.createElement('div');
      pageDiv.className = 'print-page';
      c.setAttribute('aria-label', isAns ? 'Cevap Anahtarı' : 'Çalışma Kağıdı');
      pageDiv.appendChild(c);
      mount.appendChild(pageDiv);
    });

  }

  // ==================== MODALLAR (PAKETLER, MASKE, PAYLAŞ/QR, KAYITLAR) ====================

  function openModal(id) {
    el(id).classList.remove('hidden');
  }

  function closeModal(id) {
    el(id).classList.add('hidden');
  }

  // 1. Hazır Paketler Modalı
  let activePackCategory = 'Tümü';

  function openPacksModal() {
    const cats = ['Tümü', ...Array.from(new Set(Packs.PACKS.map(p => p.category)))];
    const tabsEl = el('packCategoryTabs');
    tabsEl.innerHTML = '';
    cats.forEach(cat => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pill-btn' + (cat === activePackCategory ? ' active' : '');
      b.textContent = cat;
      b.addEventListener('click', () => {
        activePackCategory = cat;
        openPacksModal();
      });
      tabsEl.appendChild(b);
    });

    const gridEl = el('packGrid');
    gridEl.innerHTML = '';
    const filtered = activePackCategory === 'Tümü'
      ? Packs.PACKS
      : Packs.PACKS.filter(p => p.category === activePackCategory);

    filtered.forEach(pack => {
      const card = document.createElement('div');
      card.className = 'pack-card';
      const previewWords = pack.entries.slice(0, 6).map(e => `<span>${e.emoji ? e.emoji + ' ' : ''}${escapeHtml(e.word)}</span>`).join('');
      card.innerHTML = `
        <div class="pack-card-top">
          <h4>${escapeHtml(pack.title)}</h4>
          <span class="mini-badge accent">${escapeHtml(pack.badge)}</span>
        </div>
        <p>${escapeHtml(pack.description)}</p>
        <div class="pack-preview-chips">${previewWords}${pack.entries.length > 6 ? `<span>+${pack.entries.length - 6}</span>` : ''}</div>
        <button class="btn btn-sm btn-primary btn-block mt-8" type="button">Paketi Yükle</button>
      `;
      card.querySelector('button').addEventListener('click', () => {
        loadPack(pack);
        closeModal('modalPacks');
        showToast(`"${pack.title}" paketi yüklendi.`);
      });
      gridEl.appendChild(card);
    });

    openModal('modalPacks');
  }

  function loadPack(pack) {
    const rec = pack.recommended || {};
    state.title = pack.title;
    state.rawWords = Engine.entriesToText(pack.entries);
    state.language = pack.language || 'tr';
    state.rows = rec.rows || 10;
    state.cols = rec.cols || rec.rows || 10;
    state.lockSquare = state.rows === state.cols;
    state.shape = rec.shape || 'rect';
    state.directions = Engine.DIRECTION_PRESETS[rec.directionPreset || 'normal'].slice();
    state.fillMode = rec.fillMode || (state.language === 'en' ? 'en_freq' : 'tr_freq');
    if (rec.mebGroup) state.mebGroup = rec.mebGroup;
    state.wordBankMode = rec.wordBankMode || 'list';
    state.secretMessage = rec.secretMessage || '';

    syncFormFromState();
    rebuildPuzzle(true);
  }

  // 2. Özel Şekil Maskesi Çizim Modalı
  function openMaskEditor() {
    const base = Engine.buildShapeMask(state.shape, state.rows, state.cols, state.customMask);
    state.maskPointerId = null;
    state.tempMask = base.mask.map(row => row.slice());
    renderMaskEditorGrid();
    openModal('modalMask');
  }

  function renderMaskEditorGrid() {
    const grid = el('maskEditorGrid');
    grid.style.gridTemplateColumns = `repeat(${state.cols}, minmax(0, 28px))`;
    grid.innerHTML = '';
    let activeCount = 0;

    for (let y = 0; y < state.rows; y++) {
      for (let x = 0; x < state.cols; x++) {
        const on = Boolean(state.tempMask[y][x]);
        if (on) activeCount++;
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'mask-cell' + (on ? ' on' : '');
        cell.dataset.x = String(x);
        cell.dataset.y = String(y);
        cell.tabIndex = x === 0 && y === 0 ? 0 : -1;
        cell.setAttribute('aria-label', (y + 1) + '. satır ' + (x + 1) + '. sütun');
        cell.setAttribute('aria-pressed', String(on));

        grid.appendChild(cell);
      }
    }
    el('maskActiveInfo').textContent = `${activeCount} aktif hücre`;
  }

  function updateMaskCounter() {
    let count = 0;
    for (let y = 0; y < state.rows; y++) {
      for (let x = 0; x < state.cols; x++) if (state.tempMask[y][x]) count++;
    }
    el('maskActiveInfo').textContent = `${count} aktif hücre`;
  }

  // 3. Paylaş & QR Kod Modalı
  function buildShareUrl() {
    const encoded = Engine.encodeShareState(state);
    const url = new URL(window.location.pathname, window.location.origin);
    url.hash = 'p=' + encoded;
    return url.href;
  }

  function openShareModal() {
    const url = buildShareUrl();
    el('shareUrlInput').value = url;
    const qrWrap = el('shareQrWrap');
    const svg = QR.renderToSvg(url, { fg: '#14213d', bg: '#ffffff', quietZone: 3 });

    if (svg) {
      qrWrap.innerHTML = svg;
      el('shareUrlNote').textContent = `QR kod başarıyla üretildi (${url.length} karakter). Öğrenciler okuttuğunda bulmaca doğrudan oyun modunda açılır.`;
    } else {
      qrWrap.innerHTML = '<div class="empty-state">Kelime listesi QR kapasitesini aştı. Linki kopyalayarak paylaşabilirsiniz.</div>';
      el('shareUrlNote').textContent = 'Çok uzun ipuçlu listelerde bağlantıyı doğrudan kopyalayabilirsiniz.';
    }
    openModal('modalShare');
  }

  function downloadQrPng() {
    const url = buildShareUrl();
    const c = document.createElement('canvas');
    if (!QR.drawToCanvas(c, url, { size: 480, quietZone: 4 })) {
      showToast('QR kod üretilemedi (veri çok uzun).');
      return;
    }
    c.toBlob(blob => {
      if (blob) triggerDownloadBlob(blob, `${slugifyFileName(state.title)}-qr.png`);
    }, 'image/png');
  }

  // 4. Kayıtlı Bulmacalarım Modalı
  function readLibrary() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed.filter(item =>
        item && typeof item.name === 'string' && typeof item.config?.rawWords === 'string'
      ).slice(0, 50) : [];
    } catch (_) {
      return [];
    }
  }

  function writeLibrary(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (_) {
      showToast('Tarayıcı hafızasına kaydedilemedi.');
    }
  }

  function renderLibraryModal() {
    const list = el('libraryList');
    const items = readLibrary();
    el('saveNameInput').value = state.title || 'Kelime Avı';

    if (items.length === 0) {
      list.innerHTML = '<div class="empty-state">Henüz kayıtlı bulmacanız yok. Yukarıdan şimdikini kaydedebilirsiniz.</div>';
      return;
    }

    list.innerHTML = '';
    items.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'library-item';
      row.innerHTML = `
        <div class="library-meta">
          <strong>${escapeHtml(item.name)}</strong>
          <small>${escapeHtml(item.config.cols)}×${escapeHtml(item.config.rows)} · ${escapeHtml(item.savedAt || '')}</small>
        </div>
        <div class="btn-group">
          <button class="btn btn-sm btn-primary" data-act="load" type="button">Yükle</button>
          <button class="btn btn-sm btn-ghost" data-act="del" type="button">Sil</button>
        </div>
      `;
      row.querySelector('[data-act="load"]').addEventListener('click', () => {
        applyLoadedConfig(item.config);
        closeModal('modalLibrary');
        showToast(`📂 "${item.name}" yüklendi!`);
      });
      row.querySelector('[data-act="del"]').addEventListener('click', () => {
        const next = readLibrary().filter((_, i) => i !== idx);
        writeLibrary(next);
        renderLibraryModal();
      });
      list.appendChild(row);
    });
  }

  function captureConfigSnapshot() {
    return {
      title: state.title,
      subtitle: state.subtitle,
      rawWords: state.rawWords,
      rows: state.rows,
      cols: state.cols,
      shape: state.shape,
      customMask: state.customMask,
      directions: state.directions.slice(),
      density: state.density,
      language: state.language,
      letterCase: state.letterCase,
      fontStyle: state.fontStyle,
      fillMode: state.fillMode,
      mebGroup: state.mebGroup,
      wordBankMode: state.wordBankMode,
      secretMessage: state.secretMessage,
      seed: state.seed
    };
  }

  function applyLoadedConfig(cfg) {
    if (typeof cfg?.rawWords !== 'string') return;
    state.title = cfg.title || 'Kelime Avı';
    state.subtitle = cfg.subtitle ?? state.subtitle;
    state.rawWords = cfg.rawWords || '';
    state.rows = Math.max(6, Math.min(20, Math.round(Number(cfg.rows)) || 10));
    state.cols = Math.max(6, Math.min(20, Math.round(Number(cfg.cols)) || state.rows));
    state.lockSquare = state.rows === state.cols;
    state.shape = cfg.shape || 'rect';
    state.customMask = cfg.customMask || null;
    state.directions = Array.isArray(cfg.directions) && cfg.directions.length > 0
      ? cfg.directions.slice()
      : Engine.DIRECTION_PRESETS.normal.slice();
    state.density = cfg.density || 'balanced';
    state.language = cfg.language || 'tr';
    state.letterCase = cfg.letterCase || 'upper';
    state.fontStyle = ['modern', 'primary', 'mono', 'dyslexia'].includes(cfg.fontStyle) ? cfg.fontStyle : 'modern';
    state.fillMode = cfg.fillMode || 'tr_freq';
    state.mebGroup = cfg.mebGroup || 'meb1';
    state.wordBankMode = cfg.wordBankMode || 'list';
    state.secretMessage = cfg.secretMessage || '';
    state.seed = Number(cfg.seed) || Engine.randomSeed();

    syncFormFromState();
    rebuildPuzzle(false);
  }

  // ==================== MOD GEÇİŞİ ====================

  function switchMode(newMode) {
    state.mode = newMode;
    workspace.querySelectorAll('.mode-tab').forEach(btn => {
      const isAct = btn.dataset.mode === newMode;
      btn.classList.toggle('active', isAct);
      btn.setAttribute('aria-selected', String(isAct));
    });

    el('viewDesign').classList.toggle('active', newMode === 'design');
    el('viewPlay').classList.toggle('active', newMode === 'play');
    el('viewSheet').classList.toggle('active', newMode === 'sheet');

    if (newMode === 'play') {
      requestAnimationFrame(() => {
        redrawAllOverlays();
      });
    } else {
      stopTimer();
      if (newMode === 'sheet') {
        renderSheetPreview();
      } else {
        requestAnimationFrame(() => redrawAllOverlays());
      }
    }
  }

  // ==================== OLAY BAĞLANTILARI ====================

  function bindEvents() {
    // 3 Mod Sekmeleri
    workspace.querySelectorAll('.mode-tab').forEach(btn => {
      btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });

    el('btnGoPlay').addEventListener('click', () => switchMode('play'));
    el('btnExitSharedMode').addEventListener('click', () => {
      el('sharedBanner').classList.add('hidden');
      switchMode('design');
    });

    // Topbar butonları
    el('btnOpenPacks').addEventListener('click', openPacksModal);
    el('btnOpenShare').addEventListener('click', openShareModal);
    el('btnOpenLibrary').addEventListener('click', () => {
      renderLibraryModal();
      openModal('modalLibrary');
    });
    el('btnCycleTheme').addEventListener('click', cycleTheme);
    el('btnQuickPdf').addEventListener('click', downloadPdf);

    // Başlık & Kelimeler (debounced canlı güncelleme)
    el('titleInput').addEventListener('input', e => {
      state.title = e.target.value;
      el('designBoardTitle').textContent = state.title || 'Kelime Avı';
      el('playTitle').textContent = state.title || 'Kelime Avı';
      if (state.mode === 'sheet') renderSheetPreview();
    });

    let wordsDebounce = null;
    el('wordsInput').addEventListener('input', e => {
      state.rawWords = e.target.value;
      clearTimeout(wordsDebounce);
      wordsDebounce = setTimeout(() => rebuildPuzzle(false), 260);
    });

    el('btnAutoEmoji').addEventListener('click', () => {
      const entries = Engine.parseWordInput(state.rawWords, state.language);
      let added = 0;
      const updated = entries.map(e => {
        if (!e.emoji) {
          const found = Packs.lookupEmoji(e.display) || Packs.lookupEmoji(e.clean);
          if (found) { added++; return Object.assign({}, e, { emoji: found }); }
        }
        return e;
      });
      state.rawWords = Engine.entriesToText(updated);
      el('wordsInput').value = state.rawWords;
      rebuildPuzzle(false);
      showToast(added > 0 ? `✨ ${added} kelimeye otomatik emoji eklendi!` : 'Yeni emoji eşleşmesi bulunamadı.');
    });

    el('btnClearWords').addEventListener('click', () => {
      state.rawWords = '';
      el('wordsInput').value = '';
      rebuildPuzzle(false);
    });

    el('wordBankMode').addEventListener('change', e => {
      state.wordBankMode = e.target.value;
      renderAll();
    });

    // Satır & Sütun
    el('lockSquare').addEventListener('change', e => {
      state.lockSquare = e.target.checked;
      if (state.lockSquare && state.cols !== state.rows) {
        state.cols = state.rows;
        el('colsSelect').value = String(state.cols);
        rebuildPuzzle(true);
      }
    });

    el('rowsSelect').addEventListener('change', e => {
      state.rows = Number(e.target.value);
      if (state.lockSquare) {
        state.cols = state.rows;
        el('colsSelect').value = String(state.cols);
      }
      if (state.shape === 'custom') state.shape = 'rect';
      syncShapeUI();
      rebuildPuzzle(true);
    });

    el('colsSelect').addEventListener('change', e => {
      state.cols = Number(e.target.value);
      if (state.lockSquare) {
        state.rows = state.cols;
        el('rowsSelect').value = String(state.rows);
      }
      if (state.shape === 'custom') state.shape = 'rect';
      syncShapeUI();
      rebuildPuzzle(true);
    });

    // Yön Presetleri & Pusula
    document.querySelectorAll('#dirPresetPills .pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.directions = Engine.DIRECTION_PRESETS[btn.dataset.preset].slice();
        syncDirectionsUI();
        rebuildPuzzle(true);
      });
    });

    document.querySelectorAll('#compassGrid .dir-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.dir;
        const idx = state.directions.indexOf(id);
        if (idx >= 0) {
          if (state.directions.length <= 1) {
            showToast('En az 1 yön seçili kalmalıdır.');
            return;
          }
          state.directions.splice(idx, 1);
        } else {
          state.directions.push(id);
        }
        syncDirectionsUI();
        rebuildPuzzle(true);
      });
    });

    // Harf, Dil, Yazı Tipi, Yoğunluk, Dolgu
    el('languageSelect').addEventListener('change', e => {
      state.language = e.target.value;
      if (state.language === 'en' && state.fillMode === 'tr_freq') state.fillMode = 'en_freq';
      if (state.language === 'tr' && state.fillMode === 'en_freq') state.fillMode = 'tr_freq';
      el('fillModeSelect').value = state.fillMode;
      el('mebGroupField').classList.toggle('hidden', state.fillMode !== 'meb_group');
      rebuildPuzzle(true);
    });

    el('letterCaseSelect').addEventListener('change', e => {
      state.letterCase = e.target.value;
      renderAll();
    });

    el('fontStyleSelect').addEventListener('change', e => {
      state.fontStyle = e.target.value;
      renderAll();
    });

    el('densitySelect').addEventListener('change', e => {
      state.density = e.target.value;
      rebuildPuzzle(true);
    });

    el('fillModeSelect').addEventListener('change', e => {
      state.fillMode = e.target.value;
      el('mebGroupField').classList.toggle('hidden', state.fillMode !== 'meb_group');
      rebuildPuzzle(true);
    });

    el('mebGroupSelect').addEventListener('change', e => {
      state.mebGroup = e.target.value;
      rebuildPuzzle(true);
    });

    // Gizli Şifre
    let secretDebounce = null;
    el('secretMessageInput').addEventListener('input', e => {
      state.secretMessage = e.target.value;
      clearTimeout(secretDebounce);
      secretDebounce = setTimeout(() => rebuildPuzzle(false), 260);
    });

    // Otomatik Izgara Büyütme
    el('btnAutoFitGrid').addEventListener('click', () => {
      if (!state.puzzle) return;
      const target = state.puzzle.stats.recommendedSize;
      state.rows = target;
      state.cols = target;
      state.lockSquare = true;
      syncFormFromState();
      rebuildPuzzle(true);
      showToast(`Izgara ${target}×${target} boyutuna genişletildi!`);
    });

    // Tasarım Sahnesi Butonları
    el('btnRegenerate').addEventListener('click', () => {
      rebuildPuzzle(true);
      showToast('Yeni yerleşim oluşturuldu.');
    });

    el('btnToggleSolution').addEventListener('click', () => {
      state.designShowSolution = !state.designShowSolution;
      renderDesignBoard();
    });

    el('btnResetDesignFound').addEventListener('click', () => {
      state.designFoundMap.clear();
      state.designPeekWordId = null;
      renderDesignWordListOnly();
      redrawOverlay('design');
    });

    el('btnDownloadSvg').addEventListener('click', downloadSvg);
    el('btnDownloadPng').addEventListener('click', () => downloadPng(state.designShowSolution));

    // Akıllı Tahta Kontrolleri
    el('timerModeSelect').addEventListener('change', e => {
      state.timerMode = e.target.value;
      stopTimer();
      initTimerValue();
    });

    el('btnTimerToggle').addEventListener('click', () => {
      if (state.timerMode === 'off') return;
      if (state.timerRunning) stopTimer();
      else startTimer();
    });

    el('teamCountSelect').addEventListener('change', e => {
      state.teamCount = Number(e.target.value) || 1;
      state.activeTeam = 0;
      renderTeamScoreboard();
      requestAnimationFrame(() => redrawAllOverlays());
    });

    el('btnPlayHint').addEventListener('click', givePlayHint);

    el('btnPlaySolution').addEventListener('click', () => {
      state.playShowSolution = !state.playShowSolution;
      updatePlayHUD();
      redrawOverlay('play');
    });

    el('btnSoundToggle').addEventListener('click', () => {
      const nextMuted = !Sound.isMuted();
      Sound.setMuted(nextMuted);
      el('btnSoundToggle').innerHTML = nextMuted ? UI_ICONS.soundOff : UI_ICONS.soundOn;
      showToast(nextMuted ? 'Ses efektleri kapatıldı.' : 'Ses efektleri açıldı.');
    });

    el('btnPlayRestart').addEventListener('click', () => {
      resetPlayProgress(false);
      showToast('Oyun sıfırlandı.');
    });

    el('btnFullscreen').addEventListener('click', () => {
      const target = document.documentElement;
      if (!document.fullscreenElement) {
        if (target.requestFullscreen) target.requestFullscreen().catch(() => {});
      } else {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      }
    });

    document.addEventListener('fullscreenchange', () => {
      el('btnFullscreen').innerHTML = document.fullscreenElement
        ? `${UI_ICONS.fullExit}<span>Çık</span>`
        : `${UI_ICONS.fullEnter}<span>Tam Ekran</span>`;
      setTimeout(redrawAllOverlays, 120);
    });

    el('btnHighlightSecret').addEventListener('click', () => {
      state.playHighlightSecret = !state.playHighlightSecret;
      applySecretCellHighlights('play');
      el('btnHighlightSecret').textContent = state.playHighlightSecret ? 'Parlatmayı Kapat' : 'Harfleri Parlat';
    });

    el('btnCheckSecret').addEventListener('click', checkSecretGuess);
    el('secretGuessInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') checkSecretGuess();
    });

    el('btnVictoryReplay').addEventListener('click', () => {
      closeModal('modalVictory');
      rebuildPuzzle(true);
      switchMode('play');
    });

    // Çalışma Kağıdı (A4) Kontrolleri
    const sheetControls = [
      ['sheetLayoutSelect', 'sheetLayout', 'value'],
      ['subtitleInput', 'subtitle', 'value'],
      ['frameStyleSelect', 'frameStyle', 'value'],
      ['extraActivitySelect', 'extraActivity', 'value'],
      ['footerTextInput', 'footerText', 'value'],
      ['chkStudentBar', 'showStudentBar', 'checked'],
      ['chkIncludeAnswerKey', 'includeAnswerKey', 'checked'],
      ['chkBwMode', 'bwMode', 'checked'],
      ['chkShowQrOnSheet', 'showQrOnSheet', 'checked']
    ];
    sheetControls.forEach(([id, key, prop]) => {
      const ev = prop === 'value' && el(id).tagName === 'INPUT' ? 'input' : 'change';
      el(id).addEventListener(ev, e => {
        state[key] = e.target[prop];
        renderSheetPreview();
      });
    });

    document.querySelectorAll('[data-sheet-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.sheetPreviewPage = Number(btn.dataset.sheetPage);
        document.querySelectorAll('[data-sheet-page]').forEach(b => b.classList.toggle('active', b === btn));
        renderSheetPreview();
      });
    });

    el('btnSheetPdf').addEventListener('click', downloadPdf);
    el('btnSheetPrint').addEventListener('click', () => window.print());
    window.addEventListener('beforeprint', preparePrintPages);
    el('btnSheetPng').addEventListener('click', () => downloadPng(state.sheetPreviewPage === 2));
    el('btnSheetSvg').addEventListener('click', downloadSvg);

    // Özel Maske Editörü
    el('btnOpenMaskEditor').addEventListener('click', openMaskEditor);
    const maskGrid = el('maskEditorGrid');
    function paintMaskCell(cell, value) {
      const { x, y } = cell.dataset;
      if (state.tempMask[y][x] === value) return;
      state.tempMask[y][x] = value;
      cell.classList.toggle('on', value);
      cell.setAttribute('aria-pressed', String(value));
      updateMaskCounter();
    }
    maskGrid.addEventListener('pointerdown', e => {
      const cell = e.target.closest('.mask-cell');
      if (!cell || e.button !== 0 || state.maskPointerId !== null) return;
      state.maskPointerId = e.pointerId;
      state.maskPaintValue = !cell.classList.contains('on');
      paintMaskCell(cell, state.maskPaintValue);
      try { maskGrid.setPointerCapture(e.pointerId); } catch (_) {}
    });
    maskGrid.addEventListener('pointermove', e => {
      if (e.pointerId !== state.maskPointerId) return;
      const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest('.mask-cell');
      if (cell && maskGrid.contains(cell)) paintMaskCell(cell, state.maskPaintValue);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      maskGrid.addEventListener(type, e => {
        if (e.pointerId === state.maskPointerId) state.maskPointerId = null;
      });
    }
    maskGrid.addEventListener('click', e => {
      const cell = e.target.closest('.mask-cell');
      if (cell && e.detail === 0) paintMaskCell(cell, !cell.classList.contains('on'));
    });
    const maskMoves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    maskGrid.addEventListener('keydown', e => {
      const cell = e.target.closest('.mask-cell');
      const move = maskMoves[e.key];
      if (!cell || !move) return;
      e.preventDefault();
      const x = Number(cell.dataset.x) + move[0], y = Number(cell.dataset.y) + move[1];
      const next = maskGrid.querySelector('.mask-cell[data-x="' + x + '"][data-y="' + y + '"]');
      if (!next) return;
      cell.tabIndex = -1;
      next.tabIndex = 0;
      next.focus();
    });

    el('btnMaskFillAll').addEventListener('click', () => {
      state.tempMask = state.tempMask.map(r => r.map(() => true));
      renderMaskEditorGrid();
    });
    el('btnMaskClear').addEventListener('click', () => {
      state.tempMask = state.tempMask.map(r => r.map(() => false));
      renderMaskEditorGrid();
    });
    el('btnMaskInvert').addEventListener('click', () => {
      state.tempMask = state.tempMask.map(r => r.map(v => !v));
      renderMaskEditorGrid();
    });
    el('btnApplyMask').addEventListener('click', () => {
      state.customMask = state.tempMask.map(r => r.slice());
      state.shape = 'custom';
      syncShapeUI();
      closeModal('modalMask');
      rebuildPuzzle(true);
      showToast('Özel şekil uygulandı.');
    });

    // Paylaş Modalı
    el('btnCopyShareUrl').addEventListener('click', () => {
      const val = el('shareUrlInput').value;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(val).then(() => showToast('Bağlantı panoya kopyalandı.')).catch(() => {});
      } else {
        el('shareUrlInput').select();
        document.execCommand('copy');
        showToast('Bağlantı panoya kopyalandı.');
      }
    });
    el('btnDownloadQrPng').addEventListener('click', downloadQrPng);

    // Kayıtlı Bulmacalar Modalı
    el('btnSaveCurrent').addEventListener('click', () => {
      const name = (el('saveNameInput').value || state.title || 'Adsız Bulmaca').trim();
      const items = readLibrary();
      items.unshift({
        name,
        savedAt: new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }),
        config: captureConfigSnapshot()
      });
      writeLibrary(items.slice(0, 40));
      renderLibraryModal();
      showToast(`"${name}" kaydedildi.`);
    });

    el('btnExportJson').addEventListener('click', () => {
      const payload = {
        app: 'Kelime Avı Atölyesi',
        version: 1,
        exportedAt: new Date().toISOString(),
        current: captureConfigSnapshot(),
        library: readLibrary()
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      triggerDownloadBlob(blob, `${slugifyFileName(state.title)}-yedek.json`);
      showToast('JSON yedek indirildi.');
    });

    el('btnImportJson').addEventListener('click', () => el('importJsonInput').click());
    el('importJsonInput').addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result || '{}'));
          if (Array.isArray(data.library) && data.library.length > 0) {
            const existing = readLibrary();
            writeLibrary([...data.library, ...existing].slice(0, 50));
          }
          if (data.current) applyLoadedConfig(data.current);
          else if (data.rawWords) applyLoadedConfig(data);
          renderLibraryModal();
          showToast('JSON başarıyla içe aktarıldı.');
        } catch (_) {
          showToast('Geçersiz JSON dosyası.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    // Modal Kapatma (X butonu, arka plan tıklama ve Escape)
    workspace.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
    });
    workspace.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', e => {
        if (e.target === backdrop) backdrop.classList.add('hidden');
      });
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        workspace.querySelectorAll('.modal-backdrop:not(.hidden)').forEach(m => m.classList.add('hidden'));
      }
    });

    // Pencere yeniden boyutlandırma
    let resizeRaf = null;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(redrawAllOverlays);
    });

    // İki tahtaya da akıcı etkileşim bağla
    attachBoardInteraction('design');
    attachBoardInteraction('play');
  }

  // ==================== BAŞLANGIÇ YÜKLEMESİ ====================

  function bootstrap() {
    initStaticControls();
    bindEvents();
    window.GameViewport.watch(window, workspace);
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(redrawAllOverlays).observe(workspace);
    }

    // URL hash'inde paylaşılmış bulmaca var mı kontrol et (#p=...)
    const hash = window.location.hash || '';
    if (hash.startsWith('#p=')) {
      const decoded = Engine.decodeShareState(hash.slice(3));
      if (decoded) {
        applyLoadedConfig(decoded);
        el('sharedBanner').classList.remove('hidden');
        switchMode('play');
        return;
      }
    }

    // Varsayılan zengin başlangıç paketi: Okul ve Sınıfımız
    const defaultPack = Packs.PACKS.find(p => p.id === 'okul-sinif') || Packs.PACKS[0];
    loadPack(defaultPack);
  }

  bootstrap();
})();
