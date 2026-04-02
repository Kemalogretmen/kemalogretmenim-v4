(function() {
  'use strict';

  const STORAGE_PREFIX = 'kemal_dokuman_annotations_v1_';
  const SHAPE_TOOLS = ['line', 'dashed-line', 'single-arrow', 'double-arrow', 'rect', 'square', 'circle', 'star'];
  const TOOL_DEFS = [
    {
      key: 'select',
      label: 'Seçim',
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M5 4v15l4.2-3.4 3.3 4.6 2.4-1.7-3.3-4.6H17z"/>' +
        '</svg>',
    },
    {
      key: 'pan',
      label: 'El',
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M8 11V5a1.5 1.5 0 0 1 3 0v5"/>' +
          '<path d="M11 10V4.5a1.5 1.5 0 0 1 3 0V10"/>' +
          '<path d="M14 10V6a1.5 1.5 0 0 1 3 0v7.5a5.5 5.5 0 0 1-5.5 5.5h-1A6.5 6.5 0 0 1 4 12.5V10a1.5 1.5 0 0 1 3 0v2"/>' +
        '</svg>',
    },
    {
      key: 'pen',
      label: 'Kalem',
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="m4 20 4.5-1 9.8-9.8a2.1 2.1 0 0 0-3-3L5.5 16 4 20z"/>' +
          '<path d="m13.5 6.5 4 4"/>' +
        '</svg>',
    },
    {
      key: 'highlighter',
      label: 'Vurgulayıcı',
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="m14 4 6 6"/>' +
          '<path d="M4 20h6l10-10-6-6L4 14z"/>' +
          '<path d="M4 20h16"/>' +
        '</svg>',
    },
    {
      key: 'eraser',
      label: 'Silgi',
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="m7 19-4-4 9-9a2.8 2.8 0 0 1 4 0l5 5-8 8z"/>' +
          '<path d="M14 19h7"/>' +
        '</svg>',
    },
    {
      key: 'text',
      label: 'Yazı',
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M4 6h16"/>' +
          '<path d="M12 6v12"/>' +
          '<path d="M8 18h8"/>' +
        '</svg>',
    },
    {
      key: 'line',
      label: 'Çizgi',
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M5 19 19 5"/>' +
        '</svg>',
    },
    {
      key: 'dashed-line',
      label: 'Kesik Çizgi',
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M5 19 8 16"/>' +
          '<path d="m11 13 2-2"/>' +
          '<path d="m16 10 3-3"/>' +
        '</svg>',
    },
    {
      key: 'single-arrow',
      label: 'Tek Ok',
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M5 12h12"/>' +
          '<path d="m13 6 6 6-6 6"/>' +
        '</svg>',
    },
    {
      key: 'double-arrow',
      label: 'Çift Ok',
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M5 12h14"/>' +
          '<path d="m9 6-6 6 6 6"/>' +
          '<path d="m15 6 6 6-6 6"/>' +
        '</svg>',
    },
    {
      key: 'rect',
      label: 'Dikdörtgen',
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' +
          '<rect x="4" y="7" width="16" height="10" rx="2"/>' +
        '</svg>',
    },
    {
      key: 'square',
      label: 'Kare',
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' +
          '<rect x="6" y="6" width="12" height="12" rx="2"/>' +
        '</svg>',
    },
    {
      key: 'circle',
      label: 'Daire',
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' +
          '<circle cx="12" cy="12" r="7"/>' +
        '</svg>',
    },
    {
      key: 'star',
      label: 'Yıldız',
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="m12 4 2.3 4.7 5.2.8-3.7 3.7.9 5.1L12 16l-4.7 2.3.9-5.1-3.7-3.7 5.2-.8z"/>' +
        '</svg>',
    },
  ];
  const TOOL_SHORTCUTS = {
    V: 'select',
    H: 'pan',
    P: 'pen',
    B: 'highlighter',
    E: 'eraser',
    T: 'text',
    L: 'line',
    D: 'dashed-line',
    R: 'rect',
    Q: 'square',
    O: 'circle',
    Y: 'star',
  };
  const SHORTCUT_SECTIONS = [
    {
      title: 'Araçlar',
      items: [
        { key: 'V', label: 'Seçim aracı' },
        { key: 'H', label: 'El aracı' },
        { key: 'P', label: 'Kalem' },
        { key: 'B', label: 'Vurgulayıcı' },
        { key: 'E', label: 'Silgi' },
        { key: 'T', label: 'Yazı ekle' },
        { key: 'L', label: 'Düz çizgi' },
        { key: 'D', label: 'Kesik çizgi' },
        { key: 'A', label: 'Tek yönlü ok' },
        { key: 'Shift + A', label: 'Çift yönlü ok' },
        { key: 'R', label: 'Dikdörtgen' },
        { key: 'O', label: 'Daire' },
      ],
    },
    {
      title: 'Sayfa ve Düzen',
      items: [
        { key: '← / →', label: 'Sayfalar arasında geçiş' },
        { key: 'Home / End', label: 'İlk veya son sayfaya git' },
        { key: '[ / ]', label: 'Kalınlığı azalt / artır' },
        { key: 'Delete', label: 'Seçili öğeyi sil' },
        { key: 'Cmd/Ctrl + Z', label: 'Geri al' },
        { key: 'Shift + Cmd/Ctrl + Z', label: 'İleri al' },
      ],
    },
    {
      title: 'Yakınlaştırma',
      items: [
        { key: '+ / =', label: 'Yakınlaştır' },
        { key: '-', label: 'Uzaklaştır' },
        { key: '0', label: 'Yakınlaştırmayı sıfırla' },
        { key: 'El + sürükle', label: 'Yakınlaştırılmış PDF üzerinde gezin' },
      ],
    },
    {
      title: 'Genel',
      items: [
        { key: 'Cmd/Ctrl + S', label: 'Notlu PDF indir' },
        { key: 'Cmd/Ctrl + P', label: 'Yazdır' },
        { key: '?', label: 'Kısayol panelini aç / kapat' },
        { key: 'Esc', label: 'Kısayol panelini kapat' },
      ],
    },
  ];
  const VIEW_MODE_STORAGE_KEY = 'kemal_dokuman_view_mode';

  const state = {
    documentId: '',
    documentRow: null,
    pdfDoc: null,
    pageCount: 0,
    currentPage: 1,
    focusPage: 1,
    lastPage: 1,
    viewMode: 'single',
    tool: 'select',
    color: '#FF6052',
    size: 4,
    pages: new Map(),
    annotationCache: {
      pages: {},
    },
    pageWidth: 0,
    pageHeight: 0,
    bookWidth: 0,
    bookHeight: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    isPanning: false,
    panPointerId: null,
    panStartX: 0,
    panStartY: 0,
    panOriginX: 0,
    panOriginY: 0,
    flipTimer: null,
    isFlipping: false,
    isRebuilding: false,
    flipAudioContext: null,
    flipNoiseBuffer: null,
  };

  function qs(id) {
    return document.getElementById(id);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function loadViewModePreference() {
    try {
      const value = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      return value === 'spread' ? 'spread' : 'single';
    } catch (error) {
      return 'single';
    }
  }

  function saveViewModePreference() {
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, state.viewMode);
    } catch (error) {
      // Local storage kullanılamazsa sessizce devam et.
    }
  }

  function normalizeViewMode(mode) {
    return mode === 'spread' ? 'spread' : 'single';
  }

  function getVisiblePagesFor(pageNumber) {
    const safePage = clamp(parseInt(pageNumber, 10) || 1, 1, Math.max(1, state.pageCount || 1));
    if (state.viewMode !== 'spread') {
      return [safePage];
    }
    const start = safePage % 2 === 0 ? safePage - 1 : safePage;
    const visible = [clamp(start, 1, Math.max(1, state.pageCount || 1))];
    if (visible[0] + 1 <= state.pageCount) {
      visible.push(visible[0] + 1);
    }
    return visible;
  }

  function getVisiblePages() {
    return getVisiblePagesFor(state.currentPage);
  }

  function normalizePageForViewMode(pageNumber) {
    const safePage = clamp(parseInt(pageNumber, 10) || 1, 1, Math.max(1, state.pageCount || 1));
    if (state.viewMode !== 'spread') {
      return safePage;
    }
    return safePage % 2 === 0 ? safePage - 1 : safePage;
  }

  function getPageStep() {
    return state.viewMode === 'spread' ? 2 : 1;
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'dokuman';
  }

  function hexToRgba(hex, alpha) {
    const safe = String(hex || '#000000').replace('#', '');
    const normalized = safe.length === 3
      ? safe.split('').map(function(item) { return item + item; }).join('')
      : safe.padEnd(6, '0').slice(0, 6);
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function ensurePdfWorker() {
    if (!window.pdfjsLib) {
      throw new Error('PDF görüntüleyici yüklenemedi.');
    }
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  function getStorageKey() {
    return STORAGE_PREFIX + state.documentId;
  }

  function loadAnnotationCache() {
    try {
      const raw = localStorage.getItem(getStorageKey());
      if (!raw) {
        return { pages: {} };
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return { pages: {} };
      }
      return {
        pages: parsed.pages && typeof parsed.pages === 'object' ? parsed.pages : {},
        updatedAt: parsed.updatedAt || '',
      };
    } catch (error) {
      return { pages: {} };
    }
  }

  function persistAnnotationCache() {
    localStorage.setItem(getStorageKey(), JSON.stringify({
      pages: state.annotationCache.pages,
      updatedAt: new Date().toISOString(),
    }));
  }

  function setStatus(text) {
    qs('viewerStatusLeft').textContent = text;
  }

  function refreshStatus(prefixText) {
    const text = (prefixText ? prefixText + ' ' : '') +
      'Araç: ' + getToolDef(state.tool).label + ' · Sayfa ' + state.focusPage + ' üzerinde çalışıyorsun.';
    setStatus(text.trim());
  }

  function getToolDef(tool) {
    return TOOL_DEFS.find(function(item) {
      return item.key === tool;
    }) || TOOL_DEFS[0];
  }

  function getBookFrame() {
    return qs('bookFrame');
  }

  function getBookViewport() {
    return qs('bookViewport');
  }

  function getBookPanLayer() {
    return qs('bookPanLayer');
  }

  function getBookScaleLayer() {
    return qs('bookScaleLayer');
  }

  function getPageTurnLayer() {
    return qs('pageTurnLayer');
  }

  function getPageTurnSheet() {
    return qs('pageTurnSheet');
  }

  function getPageTurnFront() {
    return qs('pageTurnFront');
  }

  function getPageTurnBack() {
    return qs('pageTurnBack');
  }

  function updateViewModeButtons() {
    const singleButton = qs('viewSingleBtn');
    const spreadButton = qs('viewSpreadBtn');
    if (!singleButton || !spreadButton) {
      return;
    }

    singleButton.classList.toggle('active', state.viewMode === 'single');
    spreadButton.classList.toggle('active', state.viewMode === 'spread');
  }

  function formatVisiblePageLabel(visiblePages) {
    if (!visiblePages.length) {
      return '0 / 0';
    }
    if (visiblePages.length === 1) {
      return visiblePages[0] + ' / ' + state.pageCount;
    }
    return visiblePages[0] + '-' + visiblePages[1] + ' / ' + state.pageCount;
  }

  function isTextEntryTarget(target) {
    if (!target) {
      return false;
    }

    const tagName = target.tagName || '';
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName)) {
      return true;
    }
    if (target.isContentEditable) {
      return true;
    }

    const pageState = getActivePageState();
    const activeObject = pageState && pageState.canvas ? pageState.canvas.getActiveObject() : null;
    return Boolean(activeObject && activeObject.isEditing);
  }

  function isShortcutModalOpen() {
    const modal = qs('shortcutModal');
    return Boolean(modal && modal.classList.contains('open'));
  }

  function renderShortcutUi() {
    const shortcutPill = qs('shortcutStatusPill');
    const shortcutGrid = qs('shortcutGrid');

    if (shortcutPill) {
      shortcutPill.innerHTML = '<span>⌨️</span><strong>Kısayollar</strong><span>V seçim · H el · P kalem · T yazı · ← → sayfa · + / - zoom · ? yardım</span>';
    }

    if (shortcutGrid) {
      shortcutGrid.innerHTML = SHORTCUT_SECTIONS.map(function(section) {
        return (
          '<section class="shortcut-card">' +
            '<h4>' + section.title + '</h4>' +
            '<div class="shortcut-list">' +
              section.items.map(function(item) {
                return (
                  '<div class="shortcut-item">' +
                    '<span class="shortcut-key">' + item.key + '</span>' +
                    '<span>' + item.label + '</span>' +
                  '</div>'
                );
              }).join('') +
            '</div>' +
          '</section>'
        );
      }).join('');
    }
  }

  function openShortcutModal() {
    const modal = qs('shortcutModal');
    if (!modal) {
      return;
    }
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeShortcutModal() {
    const modal = qs('shortcutModal');
    if (!modal) {
      return;
    }
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function toggleShortcutModal() {
    if (isShortcutModalOpen()) {
      closeShortcutModal();
    } else {
      openShortcutModal();
    }
  }

  function compositePageImage(pageState) {
    if (!pageState || !pageState.pdfCanvasEl || !pageState.annotationCanvasEl) {
      return '';
    }

    pageState.canvas.renderAll();
    const composed = document.createElement('canvas');
    composed.width = pageState.pdfCanvasEl.width;
    composed.height = pageState.pdfCanvasEl.height;
    const context = composed.getContext('2d');
    context.drawImage(pageState.pdfCanvasEl, 0, 0);
    context.drawImage(pageState.annotationCanvasEl, 0, 0);
    return composed.toDataURL('image/png');
  }

  function updatePageTurnLayerSize() {
    const layer = getPageTurnLayer();
    const sheet = getPageTurnSheet();
    if (!layer || !sheet) {
      return;
    }

    const width = state.pageWidth + 'px';
    const height = state.pageHeight + 'px';
    layer.style.width = width;
    layer.style.height = height;
    sheet.style.width = width;
    sheet.style.height = height;
  }

  function clearPageTurnLayer() {
    const layer = getPageTurnLayer();
    const sheet = getPageTurnSheet();
    const front = getPageTurnFront();
    const back = getPageTurnBack();

    if (!layer || !sheet || !front || !back) {
      return;
    }

    layer.className = 'page-turn-layer';
    sheet.className = 'page-turn-sheet';
    front.style.backgroundImage = '';
    back.style.backgroundImage = '';
  }

  function createFlipNoiseBuffer(context) {
    if (state.flipNoiseBuffer) {
      return state.flipNoiseBuffer;
    }

    const duration = 0.28;
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
    const channel = buffer.getChannelData(0);

    for (let i = 0; i < channel.length; i += 1) {
      const fade = 1 - (i / channel.length);
      channel[i] = (Math.random() * 2 - 1) * fade;
    }

    state.flipNoiseBuffer = buffer;
    return buffer;
  }

  function playPageTurnSound() {
    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) {
        return;
      }

      if (!state.flipAudioContext) {
        state.flipAudioContext = new AudioCtor();
      }

      const context = state.flipAudioContext;
      if (context.state === 'suspended') {
        context.resume().catch(function() {});
      }

      const startAt = context.currentTime + 0.01;
      const noise = context.createBufferSource();
      const brush = context.createBiquadFilter();
      const tail = context.createBiquadFilter();
      const gain = context.createGain();

      noise.buffer = createFlipNoiseBuffer(context);
      brush.type = 'bandpass';
      brush.frequency.setValueAtTime(1500, startAt);
      brush.Q.value = 0.8;

      tail.type = 'lowpass';
      tail.frequency.setValueAtTime(2400, startAt);

      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.13, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.035, startAt + 0.13);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.3);

      noise.connect(brush);
      brush.connect(tail);
      tail.connect(gain);
      gain.connect(context.destination);

      noise.start(startAt);
      noise.stop(startAt + 0.3);
    } catch (error) {
      // Sesi desteklemeyen tarayıcılarda sessizce devam et.
    }
  }

  function animatePageTurn(fromState, toState, direction) {
    const layer = getPageTurnLayer();
    const sheet = getPageTurnSheet();
    const front = getPageTurnFront();
    const back = getPageTurnBack();

    if (!layer || !sheet || !front || !back || !fromState || !toState) {
      return;
    }

    front.style.backgroundImage = 'url("' + compositePageImage(fromState) + '")';
    back.style.backgroundImage = 'url("' + compositePageImage(toState) + '")';
    layer.className = 'page-turn-layer is-active ' + (direction === 'prev' ? 'is-prev' : 'is-next');
    sheet.className = 'page-turn-sheet ' + (direction === 'prev' ? 'turn-prev' : 'turn-next');
    playPageTurnSound();

    if (state.flipTimer) {
      window.clearTimeout(state.flipTimer);
    }

    state.flipTimer = window.setTimeout(function() {
      clearPageTurnLayer();
      state.isFlipping = false;
      applyToolToAllPages();
      updateBookTransform();
      state.flipTimer = null;
    }, 980);
  }

  function getActivePageState() {
    return state.pages.get(state.focusPage) || state.pages.get(state.currentPage) || null;
  }

  function getSnapshot(pageState) {
    return JSON.stringify(pageState.canvas.toDatalessJSON(['globalCompositeOperation']));
  }

  function savePageSnapshot(pageState, snapshot) {
    state.annotationCache.pages[String(pageState.index)] = snapshot;
    persistAnnotationCache();
  }

  function updateSizeLabel() {
    qs('sizeValue').textContent = state.size + ' px';
  }

  function setSize(nextSize) {
    state.size = clamp(parseInt(nextSize, 10) || 4, 1, 24);
    qs('sizeInput').value = String(state.size);
    updateSizeLabel();
    applyToolToAllPages();
  }

  function updateHistoryButtons() {
    const pageState = getActivePageState();
    qs('undoBtn').disabled = !pageState || pageState.history.length <= 1;
    qs('redoBtn').disabled = !pageState || !pageState.redo.length;
    qs('deleteSelectionBtn').disabled = !pageState || !pageState.canvas.getActiveObject();
    qs('clearPageBtn').disabled = !pageState || !pageState.canvas.getObjects().length;
  }

  function clampPanValues() {
    const viewport = getBookViewport();
    if (!viewport) {
      return;
    }

    const bookWidth = state.bookWidth || state.pageWidth;
    const bookHeight = state.bookHeight || state.pageHeight;
    const maxX = Math.max(0, (bookWidth * state.zoom - viewport.clientWidth) / 2);
    const maxY = Math.max(0, (bookHeight * state.zoom - viewport.clientHeight) / 2);
    state.panX = clamp(state.panX, -maxX, maxX);
    state.panY = clamp(state.panY, -maxY, maxY);
  }

  function syncZoomButtons() {
    qs('zoomValue').textContent = '%' + Math.round(state.zoom * 100);
    qs('zoomOutBtn').disabled = state.zoom <= 1;
    qs('zoomResetBtn').disabled = state.zoom === 1 && state.panX === 0 && state.panY === 0;
    qs('zoomInBtn').disabled = state.zoom >= 2.6;
    getBookFrame().classList.toggle('is-pannable', state.zoom > 1 && state.tool === 'pan');
    getBookFrame().classList.toggle('is-panning', state.isPanning);
    updateViewModeButtons();
  }

  function updateBookTransform() {
    const panLayer = getBookPanLayer();
    const scaleLayer = getBookScaleLayer();
    if (!panLayer || !scaleLayer) {
      return;
    }

    updatePageTurnLayerSize();
    clampPanValues();
    panLayer.style.transform = 'translate3d(' + state.panX + 'px,' + state.panY + 'px,0)';
    scaleLayer.style.transform = 'scale(' + state.zoom + ')';
    state.pages.forEach(function(pageState) {
      pageState.canvas.calcOffset();
    });
    syncZoomButtons();
  }

  function resetPan() {
    state.panX = 0;
    state.panY = 0;
    updateBookTransform();
  }

  function setZoom(nextZoom, options) {
    const previousZoom = state.zoom;
    state.zoom = clamp(nextZoom, 1, 2.6);

    if (state.zoom === 1) {
      state.panX = 0;
      state.panY = 0;
    } else if (options && options.keepCenter) {
      const ratio = state.zoom / previousZoom;
      state.panX *= ratio;
      state.panY *= ratio;
    }

    updateBookTransform();
  }

  function syncPageControls() {
    const visiblePages = getVisiblePages();
    const pageCounter = formatVisiblePageLabel(visiblePages);
    qs('pageCounter').textContent = pageCounter;
    qs('pageChip').textContent = 'Sayfa ' + pageCounter;
    qs('pageSlider').max = String(Math.max(1, state.pageCount));
    qs('pageSlider').step = String(getPageStep());
    qs('pageSlider').value = String(clamp(state.currentPage, 1, Math.max(1, state.pageCount)));
    qs('pageJumpInput').max = String(Math.max(1, state.pageCount));
    qs('pageJumpInput').value = String(clamp(state.focusPage, 1, Math.max(1, state.pageCount)));
    qs('prevPageBtn').disabled = state.currentPage <= 1 || state.isFlipping || state.isRebuilding;
    qs('nextPageBtn').disabled = visiblePages[visiblePages.length - 1] >= state.pageCount || state.isFlipping || state.isRebuilding;
  }

  function pushHistory(pageState) {
    if (!pageState || pageState.isRestoring) {
      return;
    }
    const snapshot = getSnapshot(pageState);
    const last = pageState.history[pageState.history.length - 1];
    if (snapshot !== last) {
      pageState.history.push(snapshot);
      if (pageState.history.length > 80) {
        pageState.history.shift();
      }
      pageState.redo = [];
    }
    savePageSnapshot(pageState, snapshot);
    updateHistoryButtons();
  }

  function loadSnapshot(pageState, snapshot) {
    return new Promise(function(resolve) {
      pageState.isRestoring = true;
      pageState.canvas.loadFromJSON(snapshot ? JSON.parse(snapshot) : { version: window.fabric.version, objects: [] }, function() {
        pageState.isRestoring = false;
        pageState.canvas.renderAll();
        updateHistoryButtons();
        resolve();
      });
    });
  }

  async function undoCurrentPage() {
    const pageState = getActivePageState();
    if (!pageState || pageState.history.length <= 1) {
      return;
    }
    const current = pageState.history.pop();
    pageState.redo.push(current);
    const previous = pageState.history[pageState.history.length - 1];
    await loadSnapshot(pageState, previous);
    savePageSnapshot(pageState, previous);
    updateHistoryButtons();
  }

  async function redoCurrentPage() {
    const pageState = getActivePageState();
    if (!pageState || !pageState.redo.length) {
      return;
    }
    const snapshot = pageState.redo.pop();
    pageState.history.push(snapshot);
    await loadSnapshot(pageState, snapshot);
    savePageSnapshot(pageState, snapshot);
    updateHistoryButtons();
  }

  function removeActiveObject() {
    const pageState = getActivePageState();
    if (!pageState) {
      return;
    }
    const activeObject = pageState.canvas.getActiveObject();
    if (!activeObject) {
      return;
    }
    if (activeObject.type === 'activeSelection') {
      activeObject.getObjects().forEach(function(object) {
        pageState.canvas.remove(object);
      });
    } else {
      pageState.canvas.remove(activeObject);
    }
    pageState.canvas.discardActiveObject();
    pageState.canvas.renderAll();
    pushHistory(pageState);
  }

  function clearCurrentPage() {
    const pageState = getActivePageState();
    if (!pageState || !pageState.canvas.getObjects().length) {
      return;
    }
    if (!window.confirm('Bu sayfadaki tüm çizimleri silmek istiyor musun?')) {
      return;
    }
    pageState.canvas.getObjects().slice().forEach(function(object) {
      pageState.canvas.remove(object);
    });
    pageState.canvas.discardActiveObject();
    pageState.canvas.renderAll();
    pushHistory(pageState);
  }

  function createArrowGroup(start, end, options) {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const headSize = Math.max(14, options.strokeWidth * 4);
    const line = new window.fabric.Line([start.x, start.y, end.x, end.y], {
      stroke: options.stroke,
      strokeWidth: options.strokeWidth,
      selectable: false,
      evented: false,
      strokeLineCap: 'round',
      strokeUniform: true,
    });
    const objects = [
      line,
      new window.fabric.Triangle({
        left: end.x,
        top: end.y,
        originX: 'center',
        originY: 'center',
        angle: angle * 180 / Math.PI + 90,
        width: headSize,
        height: headSize,
        fill: options.stroke,
        selectable: false,
        evented: false,
      }),
    ];

    if (options.doubleHead) {
      objects.push(new window.fabric.Triangle({
        left: start.x,
        top: start.y,
        originX: 'center',
        originY: 'center',
        angle: angle * 180 / Math.PI - 90,
        width: headSize,
        height: headSize,
        fill: options.stroke,
        selectable: false,
        evented: false,
      }));
    }

    return new window.fabric.Group(objects, {
      fill: 'transparent',
      strokeUniform: true,
      hasControls: true,
      objectCaching: false,
    });
  }

  function createStar(centerX, centerY, outerRadius, innerRadius) {
    const points = [];
    for (let i = 0; i < 10; i += 1) {
      const angle = Math.PI / 5 * i - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      points.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    }
    return points;
  }

  function buildShape(tool, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const minX = Math.min(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const stroke = state.color;
    const baseOptions = {
      fill: 'rgba(0,0,0,0)',
      stroke: stroke,
      strokeWidth: state.size,
      strokeUniform: true,
      objectCaching: false,
    };

    if (tool === 'line' || tool === 'dashed-line') {
      return new window.fabric.Line([start.x, start.y, end.x, end.y], Object.assign({}, baseOptions, {
        strokeDashArray: tool === 'dashed-line' ? [14, 8] : null,
        strokeLineCap: 'round',
      }));
    }

    if (tool === 'single-arrow' || tool === 'double-arrow') {
      return createArrowGroup(start, end, {
        stroke: stroke,
        strokeWidth: state.size,
        doubleHead: tool === 'double-arrow',
      });
    }

    if (tool === 'rect' || tool === 'square') {
      const side = Math.max(Math.abs(dx), Math.abs(dy));
      const width = tool === 'square' ? side : Math.abs(dx);
      const height = tool === 'square' ? side : Math.abs(dy);
      const left = tool === 'square' ? (dx >= 0 ? start.x : start.x - side) : minX;
      const top = tool === 'square' ? (dy >= 0 ? start.y : start.y - side) : minY;
      return new window.fabric.Rect(Object.assign({}, baseOptions, {
        left: left,
        top: top,
        width: Math.max(4, width),
        height: Math.max(4, height),
      }));
    }

    if (tool === 'circle') {
      return new window.fabric.Ellipse(Object.assign({}, baseOptions, {
        left: (start.x + end.x) / 2,
        top: (start.y + end.y) / 2,
        originX: 'center',
        originY: 'center',
        rx: Math.max(4, Math.abs(dx) / 2),
        ry: Math.max(4, Math.abs(dy) / 2),
      }));
    }

    if (tool === 'star') {
      const outer = Math.max(12, Math.max(Math.abs(dx), Math.abs(dy)) / 2);
      const inner = outer * 0.46;
      return new window.fabric.Polygon(
        createStar((start.x + end.x) / 2, (start.y + end.y) / 2, outer, inner),
        Object.assign({}, baseOptions)
      );
    }

    return null;
  }

  function maybeFinalizeShape(pageState) {
    if (!pageState.draft || !pageState.pointerStart || !pageState.pointerEnd) {
      return;
    }

    if (Math.abs(pageState.pointerStart.x - pageState.pointerEnd.x) < 3 && Math.abs(pageState.pointerStart.y - pageState.pointerEnd.y) < 3) {
      pageState.canvas.remove(pageState.draft);
      pageState.canvas.renderAll();
      pageState.draft = null;
      pageState.pointerStart = null;
      pageState.pointerEnd = null;
      return;
    }

    pageState.draft = null;
    pageState.pointerStart = null;
    pageState.pointerEnd = null;
    pageState.canvas.renderAll();
    pushHistory(pageState);
  }

  function applyToolToPage(pageState) {
    const canvas = pageState.canvas;
    const visiblePages = getVisiblePages();
    const isVisible = visiblePages.includes(pageState.index);
    const canInteract = isVisible && state.tool !== 'pan' && !state.isFlipping && !state.isRebuilding;

    canvas.isDrawingMode = false;
    canvas.selection = canInteract && state.tool === 'select';
    canvas.skipTargetFind = !(canInteract && state.tool === 'select');
    canvas.defaultCursor = isVisible
      ? (state.tool === 'select' ? 'default' : (state.tool === 'pan' ? 'grab' : 'crosshair'))
      : 'default';

    if (canvas.upperCanvasEl) {
      canvas.upperCanvasEl.style.pointerEvents = canInteract ? 'auto' : 'none';
    }
    if (canvas.wrapperEl) {
      canvas.wrapperEl.style.pointerEvents = canInteract ? 'auto' : 'none';
    }

    if (!isVisible) {
      canvas.discardActiveObject();
      canvas.renderAll();
      return;
    }

    if (['pen', 'highlighter', 'eraser'].includes(state.tool)) {
      canvas.selection = false;
      canvas.skipTargetFind = true;
      canvas.isDrawingMode = true;
      const brush = new window.fabric.PencilBrush(canvas);
      brush.width = state.size;
      brush.color = state.tool === 'highlighter'
        ? hexToRgba(state.color, 0.28)
        : (state.tool === 'eraser' ? 'rgba(0,0,0,1)' : state.color);
      canvas.freeDrawingBrush = brush;
    }
  }

  function applyToolToAllPages() {
    state.pages.forEach(function(pageState) {
      applyToolToPage(pageState);
    });
    updateHistoryButtons();
  }

  function setTool(tool) {
    state.tool = tool;
    Array.from(document.querySelectorAll('[data-tool]')).forEach(function(button) {
      button.classList.toggle('active', button.getAttribute('data-tool') === tool);
    });
    applyToolToAllPages();
    syncZoomButtons();
    refreshStatus();
  }

  function bindCanvasEvents(pageState) {
    const canvas = pageState.canvas;

    canvas.on('path:created', function(event) {
      if (state.tool === 'eraser') {
        event.path.globalCompositeOperation = 'destination-out';
        event.path.selectable = false;
        event.path.evented = false;
      }
      if (state.tool === 'highlighter') {
        event.path.selectable = true;
      }
      pushHistory(pageState);
    });

    canvas.on('object:modified', function() {
      pushHistory(pageState);
    });
    canvas.on('object:added', function() {
      if (!pageState.isRestoring && !pageState.draft) {
        updateHistoryButtons();
      }
    });
    canvas.on('selection:created', updateHistoryButtons);
    canvas.on('selection:updated', updateHistoryButtons);
    canvas.on('selection:cleared', updateHistoryButtons);
    canvas.on('text:changed', function() {
      pushHistory(pageState);
    });
    canvas.on('text:editing:exited', function() {
      pushHistory(pageState);
    });

    canvas.on('mouse:down', function(opt) {
      if (!getVisiblePages().includes(pageState.index)) {
        return;
      }

      if (state.focusPage !== pageState.index) {
        state.focusPage = pageState.index;
        syncPageControls();
        updateHistoryButtons();
        refreshStatus();
      }

      const pointer = canvas.getPointer(opt.e);

      if (state.tool === 'text') {
        const text = new window.fabric.IText('Yeni metin', {
          left: pointer.x,
          top: pointer.y,
          fill: state.color,
          fontSize: Math.max(18, state.size * 4),
          fontWeight: '700',
          fontFamily: 'Nunito, sans-serif',
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        canvas.renderAll();
        text.enterEditing();
        pushHistory(pageState);
        return;
      }

      if (!SHAPE_TOOLS.includes(state.tool)) {
        return;
      }

      pageState.pointerStart = pointer;
      pageState.pointerEnd = pointer;
      pageState.draft = buildShape(state.tool, pointer, pointer);
      if (pageState.draft) {
        pageState.draft._temp = true;
        canvas.add(pageState.draft);
        canvas.renderAll();
      }
    });

    canvas.on('mouse:move', function(opt) {
      if (!pageState.draft || !pageState.pointerStart || !SHAPE_TOOLS.includes(state.tool)) {
        return;
      }

      pageState.pointerEnd = canvas.getPointer(opt.e);
      canvas.remove(pageState.draft);
      pageState.draft = buildShape(state.tool, pageState.pointerStart, pageState.pointerEnd);
      if (pageState.draft) {
        pageState.draft._temp = true;
        canvas.add(pageState.draft);
        canvas.renderAll();
      }
    });

    canvas.on('mouse:up', function() {
      maybeFinalizeShape(pageState);
    });
  }

  function hideToolTooltip() {
    const tooltip = qs('toolTooltip');
    if (!tooltip) {
      return;
    }
    tooltip.classList.remove('show');
    tooltip.style.transform = 'translate(-9999px,-9999px)';
  }

  function showToolTooltip(button, event) {
    const tooltip = qs('toolTooltip');
    if (!tooltip || !button || button.classList.contains('active')) {
      hideToolTooltip();
      return;
    }

    tooltip.textContent = button.getAttribute('data-label') || '';
    const offsetX = 14;
    const offsetY = 18;
    const maxX = window.innerWidth - tooltip.offsetWidth - 12;
    const maxY = window.innerHeight - tooltip.offsetHeight - 12;
    const nextX = Math.min(maxX, event.clientX + offsetX);
    const nextY = Math.min(maxY, event.clientY + offsetY);
    tooltip.style.transform = 'translate(' + Math.max(12, nextX) + 'px,' + Math.max(12, nextY) + 'px)';
    tooltip.classList.add('show');
  }

  function clearFlipClasses(wrapper) {
    if (!wrapper) {
      return;
    }
    wrapper.classList.remove('is-animating', 'flip-in-next', 'flip-out-next', 'flip-in-prev', 'flip-out-prev');
  }

  function createPageShell(pageNumber) {
    const shell = document.createElement('div');
    shell.className = 'flip-page';
    shell.setAttribute('data-page', String(pageNumber));

    const surface = document.createElement('div');
    surface.className = 'page-surface';

    const pdfCanvas = document.createElement('canvas');
    pdfCanvas.className = 'page-pdf-canvas';

    const annotationCanvas = document.createElement('canvas');
    annotationCanvas.className = 'page-annotation-canvas';

    const footer = document.createElement('div');
    footer.className = 'page-footer';
    footer.textContent = 'Sayfa ' + pageNumber;

    surface.appendChild(pdfCanvas);
    surface.appendChild(annotationCanvas);
    shell.appendChild(surface);
    shell.appendChild(footer);
    return {
      shell: shell,
      pdfCanvas: pdfCanvas,
      annotationCanvas: annotationCanvas,
    };
  }

  async function initPage(pageNumber, pdfPage) {
    const scale = state.pageWidth / pdfPage.getViewport({ scale: 1 }).width;
    const viewport = pdfPage.getViewport({ scale: scale });
    const nodes = createPageShell(pageNumber);
    nodes.pdfCanvas.width = viewport.width;
    nodes.pdfCanvas.height = viewport.height;
    nodes.annotationCanvas.width = viewport.width;
    nodes.annotationCanvas.height = viewport.height;
    nodes.shell.style.width = viewport.width + 'px';
    nodes.shell.style.height = viewport.height + 'px';

    await pdfPage.render({
      canvasContext: nodes.pdfCanvas.getContext('2d'),
      viewport: viewport,
    }).promise;

    const fabricCanvas = new window.fabric.Canvas(nodes.annotationCanvas, {
      preserveObjectStacking: true,
      selection: false,
      enableRetinaScaling: true,
    });
    fabricCanvas.setWidth(viewport.width);
    fabricCanvas.setHeight(viewport.height);

    const pageState = {
      index: pageNumber,
      wrapper: nodes.shell,
      canvas: fabricCanvas,
      pdfCanvasEl: nodes.pdfCanvas,
      annotationCanvasEl: nodes.annotationCanvas,
      history: [],
      redo: [],
      draft: null,
      pointerStart: null,
      pointerEnd: null,
      isRestoring: false,
    };

    bindCanvasEvents(pageState);

    const saved = state.annotationCache.pages[String(pageNumber)];
    if (saved) {
      await loadSnapshot(pageState, saved);
      pageState.history = [saved];
    } else {
      const blank = getSnapshot(pageState);
      pageState.history = [blank];
      savePageSnapshot(pageState, blank);
    }

    state.pages.set(pageNumber, pageState);
    return nodes.shell;
  }

  function getResponsivePageWidth(baseWidth) {
    const viewportWidth = Math.max(320, window.innerWidth || 1280);
    if (state.viewMode === 'spread') {
      if (viewportWidth < 760) {
        return Math.min(baseWidth, Math.max(170, (viewportWidth - 56) / 2));
      }
      if (viewportWidth < 1180) {
        return Math.min(baseWidth, Math.max(250, (viewportWidth - 140) / 2));
      }
      return Math.min(baseWidth, Math.max(320, (viewportWidth - 280) / 2));
    }
    if (viewportWidth < 760) {
      return Math.min(430, viewportWidth - 82);
    }
    if (viewportWidth < 1180) {
      return Math.min(560, viewportWidth - 180);
    }
    return Math.min(720, viewportWidth - 320);
  }

  function showPage(pageNumber, initial) {
    const previousPage = state.currentPage;
    const targetPage = normalizePageForViewMode(pageNumber);
    const direction = targetPage >= previousPage ? 'next' : 'prev';
    const previousState = state.pages.get(previousPage) || null;
    const targetState = state.pages.get(targetPage) || null;
    const visiblePages = getVisiblePagesFor(targetPage);

    state.currentPage = targetPage;
    state.lastPage = previousPage;
    if (!visiblePages.includes(state.focusPage)) {
      state.focusPage = visiblePages[0];
    }

    state.pages.forEach(function(pageState) {
      const slot = visiblePages.indexOf(pageState.index);
      const keepActive = slot !== -1;
      pageState.wrapper.classList.toggle('is-active', keepActive);
      pageState.wrapper.classList.toggle('is-spread-left', state.viewMode === 'spread' && slot === 0);
      pageState.wrapper.classList.toggle('is-spread-right', state.viewMode === 'spread' && slot === 1);
      if (!keepActive) {
        pageState.canvas.discardActiveObject();
      }
      pageState.canvas.renderAll();
    });

    if (!initial && state.viewMode === 'single' && previousState && targetState && previousState !== targetState) {
      state.isFlipping = true;
    } else {
      state.isFlipping = false;
    }

    syncPageControls();
    applyToolToAllPages();
    updateBookTransform();
    refreshStatus(initial ? 'Doküman hazır.' : '');

    if (!initial && state.viewMode === 'single' && previousState && targetState && previousState !== targetState) {
      animatePageTurn(previousState, targetState, direction);
    }
  }

  function goToPage(pageNumber) {
    if (!state.pageCount || state.isFlipping) {
      return;
    }
    const target = clamp(parseInt(pageNumber, 10) || state.currentPage, 1, state.pageCount);
    if (normalizePageForViewMode(target) === state.currentPage) {
      state.focusPage = clamp(target, 1, state.pageCount);
      syncPageControls();
      updateHistoryButtons();
      refreshStatus();
      return;
    }
    showPage(target, false);
  }

  async function setViewMode(mode) {
    const nextMode = normalizeViewMode(mode);
    if (nextMode === state.viewMode || state.isFlipping || state.isRebuilding) {
      return;
    }

    const anchorPage = state.focusPage || state.currentPage || 1;
    state.viewMode = nextMode;
    state.isRebuilding = true;
    saveViewModePreference();
    updateViewModeButtons();
    setStatus('Görünüm hazırlanıyor…');
    syncPageControls();

    try {
      await buildBook(anchorPage);
    } finally {
      state.isRebuilding = false;
      syncPageControls();
      updateHistoryButtons();
      refreshStatus('Görünüm güncellendi.');
    }
  }

  async function buildBook(targetPage) {
    ensurePdfWorker();
    state.annotationCache = loadAnnotationCache();
    state.pages.clear();

    state.pdfDoc = await window.pdfjsLib.getDocument(state.documentRow.dosyaUrl).promise;
    state.pageCount = state.pdfDoc.numPages;

    const firstPage = await state.pdfDoc.getPage(1);
    const baseViewport = firstPage.getViewport({ scale: 1 });
    state.pageWidth = getResponsivePageWidth(baseViewport.width);
    state.pageHeight = state.pageWidth * (baseViewport.height / baseViewport.width);
    state.bookWidth = state.viewMode === 'spread' ? (state.pageWidth * 2) + 24 : state.pageWidth;
    state.bookHeight = state.pageHeight;

    const root = qs('bookRoot');
    const panLayer = getBookPanLayer();
    const scaleLayer = getBookScaleLayer();
    root.innerHTML = '';
    root.classList.toggle('is-spread', state.viewMode === 'spread');
    root.style.width = state.bookWidth + 'px';
    root.style.height = state.bookHeight + 'px';
    panLayer.style.width = state.bookWidth + 'px';
    panLayer.style.height = state.bookHeight + 'px';
    scaleLayer.style.width = state.bookWidth + 'px';
    scaleLayer.style.height = state.bookHeight + 'px';
    updatePageTurnLayerSize();

    for (let pageNumber = 1; pageNumber <= state.pageCount; pageNumber += 1) {
      const pdfPage = pageNumber === 1 ? firstPage : await state.pdfDoc.getPage(pageNumber);
      const pageElement = await initPage(pageNumber, pdfPage);
      root.appendChild(pageElement);
      setStatus('Sayfa ' + pageNumber + ' / ' + state.pageCount + ' hazırlanıyor…');
    }

    const landingPage = normalizePageForViewMode(targetPage || state.focusPage || state.currentPage || 1);
    state.currentPage = landingPage;
    state.focusPage = clamp(targetPage || landingPage, 1, state.pageCount);
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    state.isFlipping = false;
    clearPageTurnLayer();
    updateBookTransform();
    syncPageControls();
    showPage(landingPage, true);
  }

  async function buildAnnotatedPdfBytes() {
    const response = await fetch(state.documentRow.dosyaUrl);
    if (!response.ok) {
      throw new Error('Orijinal PDF okunamadi.');
    }
    const originalBytes = await response.arrayBuffer();
    const pdfDoc = await window.PDFLib.PDFDocument.load(originalBytes);
    const pages = pdfDoc.getPages();

    for (let pageNumber = 1; pageNumber <= state.pageCount; pageNumber += 1) {
      const pageState = state.pages.get(pageNumber);
      if (!pageState || !pageState.canvas.getObjects().length) {
        continue;
      }
      const pngDataUrl = pageState.canvas.toDataURL({
        format: 'png',
        enableRetinaScaling: true,
        withoutTransform: true,
      });
      const pngImage = await pdfDoc.embedPng(pngDataUrl);
      const page = pages[pageNumber - 1];
      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: page.getWidth(),
        height: page.getHeight(),
      });
    }

    return pdfDoc.save();
  }

  async function downloadAnnotatedPdf() {
    try {
      setStatus('PDF indirilmeye hazirlaniyor…');
      const bytes = await buildAnnotatedPdfBytes();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = slugify(state.documentRow.baslik) + '_notlu.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(function() {
        URL.revokeObjectURL(url);
      }, 1500);
      setStatus('İndirilebilir PDF hazırlandı.');
    } catch (error) {
      setStatus('İndirme sırasında bir sorun oluştu.');
      window.alert(error.message || 'PDF indirilemedi.');
    }
  }

  async function printAnnotatedPdf() {
    try {
      setStatus('Yazdirma dosyasi hazirlaniyor…');
      const bytes = await buildAnnotatedPdfBytes();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const frame = document.createElement('iframe');
      frame.style.position = 'fixed';
      frame.style.right = '0';
      frame.style.bottom = '0';
      frame.style.width = '1px';
      frame.style.height = '1px';
      frame.style.opacity = '0';
      frame.src = url;
      document.body.appendChild(frame);
      frame.onload = function() {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        window.setTimeout(function() {
          URL.revokeObjectURL(url);
          frame.remove();
        }, 2000);
      };
      setStatus('Yazdır penceresi açılıyor…');
    } catch (error) {
      setStatus('Yazdırma sırasında bir sorun oluştu.');
      window.alert(error.message || 'Yazdırma başlatılamadı.');
    }
  }

  function renderToolButtons() {
    qs('toolButtons').innerHTML = TOOL_DEFS.map(function(tool) {
      return (
        '<button class="tool-btn' + (tool.key === state.tool ? ' active' : '') + '"' +
        ' type="button"' +
        ' data-tool="' + tool.key + '"' +
        ' data-label="' + tool.label + '"' +
        ' aria-label="' + tool.label + '">' +
          tool.icon +
        '</button>'
      );
    }).join('');
  }

  function bindUi() {
    renderToolButtons();
    renderShortcutUi();
    syncZoomButtons();
    updateViewModeButtons();

    qs('colorInput').addEventListener('input', function(event) {
      state.color = event.target.value;
      applyToolToAllPages();
    });

    qs('sizeInput').addEventListener('input', function(event) {
      setSize(event.target.value);
    });

    qs('toolButtons').addEventListener('click', function(event) {
      const button = event.target.closest('[data-tool]');
      if (!button) {
        return;
      }
      hideToolTooltip();
      setTool(button.getAttribute('data-tool'));
    });
    qs('toolButtons').addEventListener('mouseover', function(event) {
      const button = event.target.closest('[data-tool]');
      if (button) {
        showToolTooltip(button, event);
      }
    });
    qs('toolButtons').addEventListener('mousemove', function(event) {
      const button = event.target.closest('[data-tool]');
      if (button) {
        showToolTooltip(button, event);
      }
    });
    qs('toolButtons').addEventListener('mouseleave', hideToolTooltip);

    qs('zoomInBtn').addEventListener('click', function() {
      setZoom(state.zoom + 0.2, { keepCenter: true });
    });
    qs('zoomOutBtn').addEventListener('click', function() {
      setZoom(state.zoom - 0.2, { keepCenter: true });
    });
    qs('zoomResetBtn').addEventListener('click', function() {
      setZoom(1);
    });
    qs('viewSingleBtn').addEventListener('click', function() {
      setViewMode('single');
    });
    qs('viewSpreadBtn').addEventListener('click', function() {
      setViewMode('spread');
    });

    qs('prevPageBtn').addEventListener('click', function() {
      goToPage(state.currentPage - getPageStep());
    });
    qs('nextPageBtn').addEventListener('click', function() {
      goToPage(state.currentPage + getPageStep());
    });
    qs('pageSlider').addEventListener('input', function(event) {
      goToPage(event.target.value);
    });
    qs('jumpPageBtn').addEventListener('click', function() {
      goToPage(qs('pageJumpInput').value);
    });
    qs('pageJumpInput').addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        goToPage(event.target.value);
      }
    });
    qs('pageJumpInput').addEventListener('blur', function() {
      syncPageControls();
    });

    qs('undoBtn').addEventListener('click', undoCurrentPage);
    qs('redoBtn').addEventListener('click', redoCurrentPage);
    qs('deleteSelectionBtn').addEventListener('click', removeActiveObject);
    qs('clearPageBtn').addEventListener('click', clearCurrentPage);
    qs('downloadBtn').addEventListener('click', downloadAnnotatedPdf);
    qs('printBtn').addEventListener('click', printAnnotatedPdf);
    qs('shortcutHelpBtn').addEventListener('click', toggleShortcutModal);
    qs('shortcutCloseBtn').addEventListener('click', closeShortcutModal);
    qs('shortcutModal').addEventListener('click', function(event) {
      if (event.target === qs('shortcutModal')) {
        closeShortcutModal();
      }
    });

    const bookViewport = getBookViewport();
    function finishPanning(event) {
      if (!state.isPanning) {
        return;
      }
      if (event && state.panPointerId !== null && event.pointerId !== state.panPointerId) {
        return;
      }
      state.isPanning = false;
      state.panPointerId = null;
      syncZoomButtons();
    }

    bookViewport.addEventListener('pointerdown', function(event) {
      if (state.tool !== 'pan' || state.zoom <= 1) {
        return;
      }
      state.isPanning = true;
      state.panPointerId = event.pointerId;
      state.panStartX = event.clientX;
      state.panStartY = event.clientY;
      state.panOriginX = state.panX;
      state.panOriginY = state.panY;
      if (typeof bookViewport.setPointerCapture === 'function') {
        bookViewport.setPointerCapture(event.pointerId);
      }
      event.preventDefault();
      syncZoomButtons();
    });

    bookViewport.addEventListener('pointermove', function(event) {
      if (!state.isPanning || event.pointerId !== state.panPointerId) {
        return;
      }
      state.panX = state.panOriginX + (event.clientX - state.panStartX);
      state.panY = state.panOriginY + (event.clientY - state.panStartY);
      updateBookTransform();
    });
    bookViewport.addEventListener('pointerup', finishPanning);
    bookViewport.addEventListener('pointercancel', finishPanning);
    bookViewport.addEventListener('lostpointercapture', finishPanning);

    window.addEventListener('keydown', function(event) {
      const activeElement = document.activeElement;
      const isTextEntry = isTextEntryTarget(activeElement);
      const key = event.key;
      const upper = key.length === 1 ? key.toUpperCase() : key;

      if (key === 'Escape' && isShortcutModalOpen()) {
        closeShortcutModal();
        event.preventDefault();
        return;
      }

      if (!isTextEntry && (key === '?' || key === '/')) {
        toggleShortcutModal();
        event.preventDefault();
        return;
      }

      if (event.metaKey || event.ctrlKey) {
        const lower = key.toLowerCase();
        if (lower === 's') {
          event.preventDefault();
          downloadAnnotatedPdf();
          return;
        }
        if (lower === 'p') {
          event.preventDefault();
          printAnnotatedPdf();
          return;
        }
        if (lower === 'z' && !isTextEntry) {
          event.preventDefault();
          if (event.shiftKey) {
            redoCurrentPage();
          } else {
            undoCurrentPage();
          }
          return;
        }
      }

      if (event.metaKey || event.ctrlKey || event.altKey || isTextEntry || isShortcutModalOpen()) {
        return;
      }

      if (key === 'Delete' || key === 'Backspace') {
        event.preventDefault();
        removeActiveObject();
        return;
      }

      if (key === 'ArrowLeft') {
        goToPage(state.currentPage - getPageStep());
        event.preventDefault();
        return;
      }
      if (key === 'ArrowRight') {
        goToPage(state.currentPage + getPageStep());
        event.preventDefault();
        return;
      }
      if (key === 'Home') {
        goToPage(1);
        event.preventDefault();
        return;
      }
      if (key === 'End') {
        goToPage(state.pageCount);
        event.preventDefault();
        return;
      }
      if (key === '+' || key === '=') {
        event.preventDefault();
        setZoom(state.zoom + 0.2, { keepCenter: true });
        return;
      }
      if (key === '-') {
        event.preventDefault();
        setZoom(state.zoom - 0.2, { keepCenter: true });
        return;
      }
      if (key === '0') {
        setZoom(1);
        event.preventDefault();
        return;
      }
      if (key === '[') {
        event.preventDefault();
        setSize(state.size - 1);
        return;
      }
      if (key === ']') {
        event.preventDefault();
        setSize(state.size + 1);
        return;
      }
      if (upper === 'A') {
        setTool(event.shiftKey ? 'double-arrow' : 'single-arrow');
        event.preventDefault();
        return;
      }
      if (TOOL_SHORTCUTS[upper]) {
        setTool(TOOL_SHORTCUTS[upper]);
        event.preventDefault();
      }
    });

    window.addEventListener('resize', updateBookTransform);
    window.addEventListener('scroll', hideToolTooltip, true);
  }

  async function loadDocument() {
    const params = new URLSearchParams(window.location.search);
    state.documentId = params.get('id') || '';

    if (!state.documentId) {
      throw new Error('Doküman kimliği bulunamadı.');
    }

    const documentRow = await window.kemalDocumentStore.getDocumentById(state.documentId);
    if (!documentRow) {
      throw new Error('Doküman bulunamadı ya da şu an erişime açık değil.');
    }

    state.documentRow = documentRow;
    qs('viewerPill').textContent = '📚 ' + documentRow.sinifLabel + ' · ' + documentRow.dersLabel;
    qs('viewerTitle').textContent = documentRow.baslik;
    qs('viewerDesc').textContent = documentRow.aciklama || (documentRow.sinifLabel + ' için yüklenmiş ders dokümanı.');
    qs('backSubjectLink').href = '/ders.html?sinif=' + encodeURIComponent(documentRow.sinif) + '&ders=' + encodeURIComponent(documentRow.ders);
    qs('backSubjectLink').textContent = '← ' + documentRow.dersLabel + ' dersine dön';
    document.title = documentRow.baslik + ' | Kemal Öğretmenim';
  }

  async function init() {
    state.viewMode = loadViewModePreference();
    bindUi();
    updateSizeLabel();
    syncZoomButtons();
    syncPageControls();
    await loadDocument();
    await buildBook();
  }

  document.addEventListener('DOMContentLoaded', function() {
    init().catch(function(error) {
      qs('bookRoot').innerHTML =
        '<div class="book-empty"><span>⚠️</span><p>' + (error && error.message ? error.message : 'Doküman açılamadı.') + '</p></div>';
      setStatus('Doküman açılamadı.');
      qs('viewerTitle').textContent = 'Doküman açılamadı';
      qs('viewerDesc').textContent = 'Bağlantıyı tekrar kontrol edip yeniden deneyebilirsin.';
    });
  });
})();
