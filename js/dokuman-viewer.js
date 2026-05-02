(function() {
  'use strict';

  const STORAGE_PREFIX = 'kemal_dokuman_annotations_v1_';
  const SHAPE_TOOLS = ['line', 'dashed-line', 'single-arrow', 'double-arrow', 'rect', 'square', 'circle', 'star', 'checkmark', 'cross'];
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
      key: 'clear-area',
      label: 'Temizle',
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M3 6h18"/>' +
          '<path d="M8 6V4h8v2"/>' +
          '<path d="m19 6-1 14H6L5 6"/>' +
          '<path d="M10 11v6"/>' +
          '<path d="M14 11v6"/>' +
        '</svg>',
    },
    {
      key: 'magnifier-area',
      label: 'Büyüteç Alanı',
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' +
          '<circle cx="10.5" cy="10.5" r="5.5"/>' +
          '<path d="m15 15 5 5"/>' +
          '<path d="M6 4h8M4 6v8M18 10v4M10 18h4"/>' +
        '</svg>',
    },
    {
      key: 'answer-area',
      label: 'Cevap Alanı',
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M9.2 9a3 3 0 1 1 4.9 2.3c-1.3.9-2.1 1.5-2.1 3.2"/>' +
          '<path d="M12 18h.01"/>' +
          '<rect x="4" y="4" width="16" height="16" rx="4"/>' +
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
    {
      key: 'checkmark',
      label: 'Tik',
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M4 13l5 5L20 7"/>' +
        '</svg>',
    },
    {
      key: 'cross',
      label: 'Çarpı',
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M6 6l12 12M18 6 6 18"/>' +
        '</svg>',
    },
  ];
  const PRIMARY_TOOL_KEYS = ['select', 'pen', 'highlighter', 'eraser', 'text', 'pan', 'clear-area'];
  const INTERACTION_TOOL_KEYS = ['magnifier-area', 'answer-area'];
  const SHAPE_TOOL_KEYS = ['line', 'dashed-line', 'single-arrow', 'double-arrow', 'rect', 'square', 'circle', 'star', 'checkmark', 'cross'];
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
    K: 'checkmark',
    X: 'cross',
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
        { key: 'Y', label: 'Yıldız' },
        { key: 'K', label: 'Tik (✓)' },
        { key: 'X', label: 'Çarpı (✗)' },
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
  const PAGE_TURN_DURATION = 920;
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 8;
  const ZOOM_STEP = 0.2;
  const PDF_RENDER_BOOST = 2.25;
  const ANNOTATION_EXPORT_SCALE = 2;

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
      crop: {},
    },
    clipboard: null,
    pageWidth: 0,
    pageHeight: 0,
    bookWidth: 0,
    bookHeight: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    activeMagnifierId: '',
    activeMagnifierIndex: -1,
    crop: {
      canvas: null,
      page: null,
      rect: null,
      displayScale: 1,
      zoom: 1,
      panX: 0,
      panY: 0,
      draft: null,
      pointerStart: null,
      pointerEnd: null,
      hotspotId: '',
      isRestoring: false,
    },
    toolbarCollapsed: false,
    shapesOpen: false,
    protractor: {
      visible: false,
      x: 0,
      y: 0,
      scale: 1,
      rot: 0,
    },
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
    resizeTimer: null,
    editMode: false,
    interactionsDirty: false,
    interactions: {
      version: 1,
      answersHidden: true,
      hotspots: [],
    },
    revealedAnswers: {},
  };

  function qs(id) {
    return document.getElementById(id);
  }

  function isNativeTextInput(target) {
    return !!(target && target.closest && target.closest('input, textarea, select, [contenteditable="true"]'));
  }

  function getSelectionLockRoot(target) {
    if (!target || !target.closest || isNativeTextInput(target)) {
      return null;
    }
    return target.closest('#bookFrame, #bookViewport, #bookRoot, #cropStage, #magnifyModal, #docToolbar');
  }

  function clearNativeSelection() {
    const selection = window.getSelection && window.getSelection();
    if (selection && selection.rangeCount) {
      selection.removeAllRanges();
    }
  }

  function lockNativeTouchSurface(element) {
    if (!element) {
      return;
    }
    element.style.webkitUserSelect = 'none';
    element.style.userSelect = 'none';
    element.style.webkitTouchCallout = 'none';
    element.style.webkitUserDrag = 'none';
    element.style.touchAction = 'none';
  }

  function lockFabricNativeSurfaces(canvas) {
    if (!canvas) {
      return;
    }
    [canvas.lowerCanvasEl, canvas.upperCanvasEl, canvas.wrapperEl].forEach(lockNativeTouchSurface);
  }

  function installNativeSelectionLocks() {
    ['selectstart', 'dragstart', 'contextmenu'].forEach(function(eventName) {
      document.addEventListener(eventName, function(event) {
        if (!getSelectionLockRoot(event.target)) {
          return;
        }
        clearNativeSelection();
        event.preventDefault();
      }, true);
    });

    document.addEventListener('selectionchange', function() {
      const active = document.activeElement;
      if (isNativeTextInput(active)) {
        return;
      }
      const selection = window.getSelection && window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return;
      }
      const anchor = selection.anchorNode && (selection.anchorNode.nodeType === 1
        ? selection.anchorNode
        : selection.anchorNode.parentElement);
      if (getSelectionLockRoot(anchor)) {
        clearNativeSelection();
      }
    });

    document.addEventListener('touchstart', function(event) {
      if (event.touches && event.touches.length > 1 && getSelectionLockRoot(event.target)) {
        clearNativeSelection();
        event.preventDefault();
      }
    }, { passive: false, capture: true });

    document.addEventListener('touchmove', function(event) {
      if (event.touches && event.touches.length > 1 && getSelectionLockRoot(event.target)) {
        event.preventDefault();
      }
    }, { passive: false, capture: true });

    ['gesturestart', 'gesturechange'].forEach(function(eventName) {
      document.addEventListener(eventName, function(event) {
        if (getSelectionLockRoot(event.target)) {
          event.preventDefault();
        }
      }, true);
    });
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

  function normalizeInteractions(value) {
    const source = value && typeof value === 'object' ? value : {};
    return {
      version: 1,
      answersHidden: source.answersHidden !== false,
      hotspots: Array.isArray(source.hotspots) ? source.hotspots.filter(function(item) {
        return item && item.id && item.page && item.rect && item.type;
      }) : [],
    };
  }

  function createId(prefix) {
    if (window.crypto && window.crypto.randomUUID) {
      return prefix + '_' + window.crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    }
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function markInteractionsDirty(message) {
    state.interactionsDirty = true;
    const status = qs('interactionStatus');
    if (status) {
      status.textContent = message || 'Değişiklik hazır. Yayınla butonuyla öğrenci ekranına aktarabilirsin.';
    }
  }

  function getHotspotsForPage(pageNumber) {
    return state.interactions.hotspots.filter(function(item) {
      return Number(item.page) === Number(pageNumber);
    });
  }

  function normalizeRect(start, end, pageState) {
    const left = Math.min(start.x, end.x);
    const top = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);
    return {
      x: clamp(left / pageState.canvas.getWidth(), 0, 1),
      y: clamp(top / pageState.canvas.getHeight(), 0, 1),
      w: clamp(width / pageState.canvas.getWidth(), 0, 1),
      h: clamp(height / pageState.canvas.getHeight(), 0, 1),
    };
  }

  function rectToCanvas(rect, pageState) {
    return {
      x: Number(rect.x || 0) * pageState.canvas.getWidth(),
      y: Number(rect.y || 0) * pageState.canvas.getHeight(),
      w: Number(rect.w || 0) * pageState.canvas.getWidth(),
      h: Number(rect.h || 0) * pageState.canvas.getHeight(),
    };
  }

  function getObjectCenter(object) {
    const center = object.getCenterPoint ? object.getCenterPoint() : null;
    return center || {
      x: Number(object.left || 0),
      y: Number(object.top || 0),
    };
  }

  function objectIsInsideRect(object, rectPx) {
    if (!object || object._temp) {
      return false;
    }
    const center = getObjectCenter(object);
    return center.x >= rectPx.x &&
      center.x <= rectPx.x + rectPx.w &&
      center.y >= rectPx.y &&
      center.y <= rectPx.y + rectPx.h;
  }

  function tagObjectForAnswerHotspot(pageState, object) {
    if (!state.editMode || !pageState || !object || object._temp) {
      return;
    }
    const answerHotspot = getHotspotsForPage(pageState.index).find(function(hotspot) {
      return hotspot.type === 'answer' && objectIsInsideRect(object, rectToCanvas(hotspot.rect, pageState));
    });
    if (answerHotspot) {
      object.isAnswerObject = true;
      object.answerHotspotId = answerHotspot.id;
    }
  }

  function setAnswerObjectsVisibility(pageState) {
    if (!pageState || state.editMode) {
      return;
    }
    const shouldHide = state.interactions.answersHidden !== false;
    pageState.canvas.getObjects().forEach(function(object) {
      if (object.isAnswerObject && object.answerHotspotId) {
        object.visible = shouldHide ? Boolean(state.revealedAnswers[object.answerHotspotId]) : true;
        object.evented = false;
        object.selectable = false;
      }
    });
    pageState.canvas.renderAll();
  }

  function loadAnnotationCache() {
    try {
      const raw = localStorage.getItem(getStorageKey());
      if (!raw) {
        return { pages: {}, crop: {} };
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return { pages: {}, crop: {} };
      }
      return {
        pages: parsed.pages && typeof parsed.pages === 'object' ? parsed.pages : {},
        crop: parsed.crop && typeof parsed.crop === 'object' ? parsed.crop : {},
        updatedAt: parsed.updatedAt || '',
      };
    } catch (error) {
      return { pages: {}, crop: {} };
    }
  }

  function persistAnnotationCache() {
    localStorage.setItem(getStorageKey(), JSON.stringify({
      pages: state.annotationCache.pages,
      crop: state.annotationCache.crop || {},
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

  function getDocProtractor() {
    return qs('docProtractor');
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

  function getCropStage() {
    return qs('cropStage');
  }

  function getCropSurface() {
    return qs('cropSurface');
  }

  function getPageTurnLayer() {
    return qs('pageTurnLayer');
  }

  function getPageTurnSheet() {
    return qs('pageTurnSheet');
  }

  function getPageTurnShadow() {
    return qs('pageTurnShadow');
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
    singleButton.classList.toggle('is-active', state.viewMode === 'single');
    spreadButton.classList.toggle('active', state.viewMode === 'spread');
    spreadButton.classList.toggle('is-active', state.viewMode === 'spread');
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

  function createComposedPageCanvas(pageState) {
    if (!pageState || !pageState.pdfCanvasEl || !pageState.annotationCanvasEl) {
      return null;
    }

    pageState.canvas.renderAll();
    const composed = document.createElement('canvas');
    composed.width = pageState.pdfCanvasEl.width;
    composed.height = pageState.pdfCanvasEl.height;
    const context = composed.getContext('2d');
    context.drawImage(pageState.pdfCanvasEl, 0, 0);
    context.drawImage(pageState.annotationCanvasEl, 0, 0);
    return composed;
  }

  function compositePageImage(pageState) {
    const composed = createComposedPageCanvas(pageState);
    if (!composed) {
      return '';
    }
    return composed.toDataURL('image/png');
  }

  function updatePageTurnLayerSize() {
    const layer = getPageTurnLayer();
    const sheet = getPageTurnSheet();
    const shadow = getPageTurnShadow();
    if (!layer || !sheet) {
      return;
    }

    const width = state.pageWidth + 'px';
    const height = state.pageHeight + 'px';
    layer.style.width = width;
    layer.style.height = height;
    sheet.style.width = width;
    sheet.style.height = height;
    if (shadow) {
      shadow.style.width = width;
      shadow.style.height = height;
    }
  }

  function setPageTurnPosition(slot) {
    const layer = getPageTurnLayer();
    if (!layer) {
      return;
    }

    let leftValue = '50%';
    if (slot === 'left') {
      leftValue = 'calc(50% - ' + ((state.pageWidth / 2) + 2) + 'px)';
    } else if (slot === 'right') {
      leftValue = 'calc(50% + ' + ((state.pageWidth / 2) + 2) + 'px)';
    }

    layer.style.left = leftValue;
    layer.style.top = '50%';
    layer.style.transform = 'translate(-50%,-50%)';
  }

  function clearPageTurnLayer() {
    const layer = getPageTurnLayer();
    const sheet = getPageTurnSheet();
    const front = getPageTurnFront();
    const back = getPageTurnBack();

    if (!layer || !sheet || !front || !back) {
      return;
    }

    if (state.flipTimer) {
      window.clearTimeout(state.flipTimer);
      state.flipTimer = null;
    }
    layer.className = 'page-turn-layer';
    sheet.className = 'page-turn-sheet';
    front.style.backgroundImage = '';
    back.style.backgroundImage = '';
    setPageTurnPosition('center');
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

  function animatePageTurn(fromState, toState, direction, slot) {
    const layer = getPageTurnLayer();
    const sheet = getPageTurnSheet();
    const front = getPageTurnFront();
    const back = getPageTurnBack();

    if (!layer || !sheet || !front || !back || !fromState || !toState) {
      return;
    }

    clearPageTurnLayer();
    updatePageTurnLayerSize();
    setPageTurnPosition(slot || 'center');
    front.style.backgroundImage = 'url("' + compositePageImage(fromState) + '")';
    back.style.backgroundImage = 'url("' + compositePageImage(toState) + '")';
    layer.className = 'page-turn-layer is-active ' + (direction === 'prev' ? 'is-prev' : 'is-next');
    playPageTurnSound();

    state.flipTimer = window.setTimeout(function() {
      clearPageTurnLayer();
      state.isFlipping = false;
      applyToolToAllPages();
      updateBookTransform();
      state.flipTimer = null;
    }, PAGE_TURN_DURATION);
  }

  function getActivePageState() {
    return state.pages.get(state.focusPage) || state.pages.get(state.currentPage) || null;
  }

  function getSnapshot(pageState) {
    return JSON.stringify(pageState.canvas.toDatalessJSON(['globalCompositeOperation', 'isAnswerObject', 'answerHotspotId']));
  }

  function getCropSnapshot(canvas) {
    return JSON.stringify(canvas.toDatalessJSON(['globalCompositeOperation']));
  }

  function savePageSnapshot(pageState, snapshot) {
    state.annotationCache.pages[String(pageState.index)] = snapshot;
    persistAnnotationCache();
  }

  function saveCropSnapshot() {
    const canvas = state.crop.canvas;
    const hotspotId = state.crop.hotspotId || state.activeMagnifierId;
    if (!canvas || !hotspotId || state.crop.isRestoring) {
      return;
    }
    state.annotationCache.crop = state.annotationCache.crop || {};
    if (canvas.getObjects().filter(function(object) { return !object._temp; }).length) {
      state.annotationCache.crop[hotspotId] = getCropSnapshot(canvas);
    } else {
      delete state.annotationCache.crop[hotspotId];
    }
    persistAnnotationCache();
  }

  function prepareEraserPath(path) {
    if (!path) {
      return;
    }
    path.globalCompositeOperation = 'destination-out';
    path.stroke = 'rgba(0,0,0,1)';
    path.selectable = false;
    path.evented = false;
  }

  function makeObjectEditable(object) {
    if (!object || object._temp) {
      return object;
    }
    object.set({
      hasControls: true,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
      lockMovementX: false,
      lockMovementY: false,
      borderColor: '#6C3DED',
      cornerColor: '#6C3DED',
      cornerStrokeColor: '#ffffff',
      transparentCorners: false,
      cornerStyle: 'circle',
      rotatingPointOffset: 34,
    });
    if (typeof object.setControlsVisibility === 'function') {
      object.setControlsVisibility({ mtr: true });
    }
    return object;
  }

  function makeCanvasObjectsEditable(canvas) {
    if (!canvas) {
      return;
    }
    canvas.getObjects().forEach(function(object) {
      makeObjectEditable(object);
    });
  }

  function walkFabricObject(object, callback) {
    if (!object) {
      return;
    }
    callback(object);
    if (typeof object.forEachObject === 'function') {
      object.forEachObject(function(child) {
        walkFabricObject(child, callback);
      });
    }
  }

  function syncSelectedObjectControls(event) {
    if (event && event.selected) {
      event.selected.forEach(makeObjectEditable);
    }
    if (event && event.target) {
      makeObjectEditable(event.target);
    }
    updateHistoryButtons();
  }

  function updateSizeLabel() {
    qs('sizeValue').textContent = state.size + ' px';
  }

  function normalizeColorValue(color) {
    return String(color || '').trim().toLowerCase();
  }

  function getCollapseIconMarkup(collapsed) {
    return collapsed
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8V3h5"></path><path d="m3 3 6 6"></path><path d="M21 16v5h-5"></path><path d="m21 21-6-6"></path></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H3v5"></path><path d="m3 3 6 6"></path><path d="M16 21h5v-5"></path><path d="m21 21-6-6"></path></svg>';
  }

  function syncToolbarUi() {
    const toolbar = qs('docToolbar');
    const shapePanel = qs('docShapePanel');
    const shapeToggle = qs('docShapeToggleBtn');
    const toggleBtn = qs('docToolbarToggleBtn');
    const protractorBtn = qs('docProtractorBtn');
    const protractor = getDocProtractor();
    const activeTool = state.tool;
    const shapesVisible = state.shapesOpen || SHAPE_TOOL_KEYS.includes(activeTool) || INTERACTION_TOOL_KEYS.includes(activeTool);

    if (toolbar) {
      toolbar.style.setProperty('--doc-accent-color', state.color || '#6C3DED');
      toolbar.classList.toggle('is-collapsed', !!state.toolbarCollapsed);
    }
    if (toggleBtn) {
      toggleBtn.innerHTML = getCollapseIconMarkup(!!state.toolbarCollapsed);
    }
    if (shapePanel) {
      shapePanel.classList.toggle('is-hidden', !shapesVisible);
    }
    if (shapeToggle) {
      shapeToggle.classList.toggle('is-active', shapesVisible);
      shapeToggle.classList.toggle('active', shapesVisible);
      shapeToggle.setAttribute('aria-expanded', shapesVisible ? 'true' : 'false');
    }
    if (protractorBtn) {
      protractorBtn.classList.toggle('is-active', !!state.protractor.visible);
      protractorBtn.classList.toggle('active', !!state.protractor.visible);
    }
    if (protractor) {
      protractor.classList.toggle('is-visible', !!state.protractor.visible);
      protractor.setAttribute('aria-hidden', state.protractor.visible ? 'false' : 'true');
    }

    Array.from(document.querySelectorAll('[data-tool]')).forEach(function(button) {
      const isActive = button.getAttribute('data-tool') === activeTool;
      button.classList.toggle('active', isActive);
      button.classList.toggle('is-active', isActive);
    });
    Array.from(document.querySelectorAll('[data-prep-tool]')).forEach(function(button) {
      const isActive = button.getAttribute('data-prep-tool') === activeTool;
      button.classList.toggle('is-active', isActive);
    });

    Array.from(document.querySelectorAll('[data-doc-color]')).forEach(function(button) {
      button.classList.toggle('is-active', normalizeColorValue(button.getAttribute('data-doc-color')) === normalizeColorValue(state.color));
    });
  }

  function setSize(nextSize) {
    state.size = clamp(parseInt(nextSize, 10) || 4, 1, 24);
    qs('sizeInput').value = String(state.size);
    updateSizeLabel();
    applyToolToAllPages();
  }

  function updateHistoryButtons() {
    const pageState = getActivePageState();
    if (isCropViewActive()) {
      qs('undoBtn').disabled = true;
      qs('redoBtn').disabled = true;
      qs('deleteSelectionBtn').disabled = !state.crop.canvas.getActiveObject();
      if (qs('clearPageBtn')) {
        qs('clearPageBtn').disabled = !state.crop.canvas.getObjects().some(function(object) {
          return !object._temp;
        });
      }
      return;
    }
    qs('undoBtn').disabled = !pageState || pageState.history.length <= 1;
    qs('redoBtn').disabled = !pageState || !pageState.redo.length;
    qs('deleteSelectionBtn').disabled = !pageState || !pageState.canvas.getActiveObject();
    if (qs('clearPageBtn')) {
      qs('clearPageBtn').disabled = !pageState || !pageState.canvas.getObjects().some(function(object) {
        return !object.isAnswerObject && !object._temp;
      });
    }
  }

  function isCropViewActive() {
    return document.body.classList.contains('is-crop-view') && !!state.crop.canvas;
  }

  function clampCropPanValues() {
    const stage = getCropStage();
    const surface = getCropSurface();
    if (!stage || !surface) {
      return;
    }
    const maxX = Math.max(0, ((surface.clientWidth || 0) * state.crop.zoom - stage.clientWidth) / 2);
    const maxY = Math.max(0, ((surface.clientHeight || 0) * state.crop.zoom - stage.clientHeight) / 2);
    state.crop.panX = clamp(state.crop.panX, -maxX, maxX);
    state.crop.panY = clamp(state.crop.panY, -maxY, maxY);
  }

  function updateCropTransform() {
    const surface = getCropSurface();
    if (!surface) {
      return;
    }
    clampCropPanValues();
    surface.style.transformOrigin = 'center center';
    surface.style.transform = 'translate3d(' + state.crop.panX + 'px,' + state.crop.panY + 'px,0) scale(' + state.crop.zoom + ')';
    if (state.crop.canvas) {
      state.crop.canvas.calcOffset();
    }
    syncZoomButtons();
  }

  function setCropZoom(nextZoom, options) {
    const previousZoom = state.crop.zoom || 1;
    state.crop.zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    if (state.crop.zoom === 1) {
      state.crop.panX = 0;
      state.crop.panY = 0;
    } else if (options && options.keepCenter) {
      const ratio = state.crop.zoom / previousZoom;
      state.crop.panX *= ratio;
      state.crop.panY *= ratio;
    }
    updateCropTransform();
  }

  function clampPanValues() {
    if (document.body.classList.contains('is-crop-view')) {
      return;
    }
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
    const cropActive = isCropViewActive();
    const activeZoom = cropActive ? state.crop.zoom : state.zoom;
    const activePanX = cropActive ? state.crop.panX : state.panX;
    const activePanY = cropActive ? state.crop.panY : state.panY;
    qs('zoomValue').textContent = '%' + Math.round(activeZoom * 100);
    qs('zoomInput').value = String(Math.round(activeZoom * 100));
    qs('zoomResetBtn').disabled = activeZoom === 1 && activePanX === 0 && activePanY === 0;
    getBookFrame().classList.toggle('is-pannable', activeZoom > 1 && state.tool === 'pan');
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
    if (isCropViewActive()) {
      setCropZoom(nextZoom, options);
      return;
    }
    const previousZoom = state.zoom;
    state.zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);

    if (state.zoom === 1) {
      state.panX = 0;
      state.panY = 0;
      state.activeMagnifierId = '';
      state.activeMagnifierIndex = -1;
      document.body.classList.remove('is-crop-view');
      updateCropControls();
    } else if (options && options.keepCenter) {
      const ratio = state.zoom / previousZoom;
      state.panX *= ratio;
      state.panY *= ratio;
    }

    updateBookTransform();
  }

  function syncPageControls() {
    const turnLayer = getPageTurnLayer();
    if (state.isFlipping && !state.flipTimer && (!turnLayer || !turnLayer.classList.contains('is-active'))) {
      state.isFlipping = false;
    }
    const visiblePages = getVisiblePages();
    const pageCounter = formatVisiblePageLabel(visiblePages);
    qs('pageCounter').textContent = pageCounter;
    qs('pageChip').textContent = 'Sayfa ' + pageCounter;
    qs('pageSlider').max = String(Math.max(1, state.pageCount));
    qs('pageSlider').step = String(getPageStep());
    qs('pageSlider').value = String(clamp(state.currentPage, 1, Math.max(1, state.pageCount)));
    qs('pageJumpInput').max = String(Math.max(1, state.pageCount));
    qs('pageJumpInput').value = String(clamp(state.focusPage, 1, Math.max(1, state.pageCount)));
    const busy = state.isFlipping || state.isRebuilding;
    const canGoPrev = Math.min.apply(null, visiblePages.concat([state.currentPage, state.focusPage])) > 1;
    const canGoNext = visiblePages[visiblePages.length - 1] < state.pageCount;
    qs('prevPageBtn').disabled = !canGoPrev || busy;
    qs('nextPageBtn').disabled = !canGoNext || busy;
    Array.from(document.querySelectorAll('[data-edge-page="prev"]')).forEach(function(button) {
      button.disabled = !canGoPrev || busy;
    });
    Array.from(document.querySelectorAll('[data-edge-page="next"]')).forEach(function(button) {
      button.disabled = !canGoNext || busy;
    });
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
        makeCanvasObjectsEditable(pageState.canvas);
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

  function getActiveDrawingScope() {
    if (isCropViewActive()) {
      return {
        canvas: state.crop.canvas,
        pageState: null,
        type: 'crop',
      };
    }
    const pageState = getActivePageState();
    return pageState ? {
      canvas: pageState.canvas,
      pageState: pageState,
      type: 'page',
    } : null;
  }

  function isFabricTextEditing() {
    const scope = getActiveDrawingScope();
    const object = scope && scope.canvas ? scope.canvas.getActiveObject() : null;
    return !!(object && object.isEditing);
  }

  function preparePastedObject(object, scope) {
    walkFabricObject(object, function(item) {
      makeObjectEditable(item);
      if (item.globalCompositeOperation === 'destination-out') {
        return;
      }
      item.selectable = true;
      item.evented = true;
      if (scope.type === 'crop') {
        item.isAnswerObject = false;
        item.answerHotspotId = '';
      } else {
        item.isAnswerObject = false;
        item.answerHotspotId = '';
      }
    });
    if (scope.type === 'page') {
      walkFabricObject(object, function(item) {
        tagObjectForAnswerHotspot(scope.pageState, item);
      });
    }
  }

  function copyActiveObject() {
    const scope = getActiveDrawingScope();
    const activeObject = scope && scope.canvas ? scope.canvas.getActiveObject() : null;
    if (!activeObject) {
      setStatus('Kopyalamak için önce bir öğe seç.');
      return false;
    }
    activeObject.clone(function(cloned) {
      state.clipboard = {
        object: cloned,
        offset: 0,
      };
      setStatus('Seçili öğe kopyalandı.');
    }, ['globalCompositeOperation', 'isAnswerObject', 'answerHotspotId']);
    return true;
  }

  function pasteClipboardObject() {
    const scope = getActiveDrawingScope();
    if (!scope || !scope.canvas || !state.clipboard || !state.clipboard.object) {
      setStatus('Yapıştırmak için önce bir öğe kopyala.');
      return false;
    }
    state.clipboard.object.clone(function(clonedObject) {
      const offset = 22 + (state.clipboard.offset || 0);
      scope.canvas.discardActiveObject();
      clonedObject.set({
        left: (clonedObject.left || 0) + offset,
        top: (clonedObject.top || 0) + offset,
        evented: true,
        selectable: true,
      });
      preparePastedObject(clonedObject, scope);

      if (clonedObject.type === 'activeSelection') {
        clonedObject.canvas = scope.canvas;
        clonedObject.forEachObject(function(object) {
          scope.canvas.add(object);
        });
        clonedObject.setCoords();
      } else {
        scope.canvas.add(clonedObject);
      }

      scope.canvas.setActiveObject(clonedObject);
      scope.canvas.requestRenderAll();
      state.clipboard.offset = Math.min(88, offset);
      if (scope.type === 'crop') {
        saveCropSnapshot();
      } else {
        pushHistory(scope.pageState);
      }
      updateHistoryButtons();
      setStatus('Kopyalanan öğe yapıştırıldı.');
    }, ['globalCompositeOperation', 'isAnswerObject', 'answerHotspotId']);
    return true;
  }

  function removeActiveObject() {
    if (isCropViewActive()) {
      const cropCanvas = state.crop.canvas;
      const cropObject = cropCanvas.getActiveObject();
      if (!cropObject) {
        return;
      }
      if (cropObject.type === 'activeSelection') {
        cropObject.getObjects().forEach(function(object) {
          cropCanvas.remove(object);
        });
      } else {
        cropCanvas.remove(cropObject);
      }
      cropCanvas.discardActiveObject();
      cropCanvas.renderAll();
      saveCropSnapshot();
      updateHistoryButtons();
      return;
    }
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
    if (!pageState) {
      return;
    }
    const removableObjects = pageState.canvas.getObjects().filter(function(object) {
      return !object.isAnswerObject && !object._temp;
    });
    if (!removableObjects.length) {
      setStatus('Bu sayfada temizlenecek öğrenci çizimi yok.');
      return;
    }
    if (!window.confirm('Bu sayfadaki çizimleri temizlemek istiyor musun? Cevap alanları korunacak.')) {
      return;
    }
    removableObjects.forEach(function(object) {
      pageState.canvas.remove(object);
    });
    pageState.canvas.discardActiveObject();
    pageState.canvas.renderAll();
    pushHistory(pageState);
    setStatus('Sayfadaki çizimler temizlendi. Cevap alanları korundu.');
  }

  function clearActiveCropAnnotations() {
    const canvas = state.crop.canvas;
    if (!canvas) {
      return;
    }
    const cropObjects = canvas.getObjects().filter(function(object) {
      return !object._temp;
    });
    const pageState = state.crop.page;
    const pageObjects = pageState && state.crop.rect
      ? pageState.canvas.getObjects().filter(function(object) {
        return !object.isAnswerObject && !object._temp && objectIsInsideRect(object, state.crop.rect);
      })
      : [];
    if (!cropObjects.length && !pageObjects.length) {
      setStatus('Bu kırpılmış soru alanında temizlenecek çizim yok.');
      return;
    }
    if (!window.confirm('Sadece bu kırpılmış soru alanındaki çizimleri temizlemek istiyor musun?')) {
      return;
    }
    cropObjects.forEach(function(object) {
      canvas.remove(object);
    });
    canvas.discardActiveObject();
    canvas.renderAll();
    saveCropSnapshot();
    if (pageState && pageObjects.length) {
      pageObjects.forEach(function(object) {
        pageState.canvas.remove(object);
      });
      pageState.canvas.discardActiveObject();
      pageState.canvas.renderAll();
      pushHistory(pageState);
      const active = findHotspot(state.activeMagnifierId);
      if (active) {
        renderCropView(active);
      }
    }
    setStatus('Bu soru alanındaki çizimler temizlendi.');
  }

  function clearCurrentScope() {
    if (document.body.classList.contains('is-crop-view') && state.crop.canvas) {
      clearActiveCropAnnotations();
      return;
    }
    clearCurrentPage();
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

    const group = new window.fabric.Group(objects, {
      fill: 'transparent',
      strokeUniform: true,
      hasControls: true,
      objectCaching: false,
    });
    makeObjectEditable(group);
    return group;
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

    if (tool === 'checkmark') {
      const cx = (start.x + end.x) / 2;
      const cy = (start.y + end.y) / 2;
      const w = Math.max(24, Math.abs(dx));
      const h = Math.max(16, Math.abs(dy));
      return new window.fabric.Polyline([
        { x: cx - w * 0.46, y: cy },
        { x: cx - w * 0.06, y: cy + h * 0.46 },
        { x: cx + w * 0.46, y: cy - h * 0.46 },
      ], Object.assign({}, baseOptions, {
        fill: 'rgba(0,0,0,0)',
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
      }));
    }

    if (tool === 'cross') {
      const cx = (start.x + end.x) / 2;
      const cy = (start.y + end.y) / 2;
      const r = Math.max(16, Math.max(Math.abs(dx), Math.abs(dy)) / 2) * 0.46;
      const line1 = new window.fabric.Line([cx - r, cy - r, cx + r, cy + r], Object.assign({}, baseOptions, {
        strokeLineCap: 'round',
        selectable: false,
        evented: false,
      }));
      const line2 = new window.fabric.Line([cx + r, cy - r, cx - r, cy + r], Object.assign({}, baseOptions, {
        strokeLineCap: 'round',
        selectable: false,
        evented: false,
      }));
      return new window.fabric.Group([line1, line2], {
        fill: 'transparent',
        strokeUniform: true,
        hasControls: true,
        objectCaching: false,
      });
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

    pageState.draft._temp = false;
    makeObjectEditable(pageState.draft);
    tagObjectForAnswerHotspot(pageState, pageState.draft);
    pageState.draft = null;
    pageState.pointerStart = null;
    pageState.pointerEnd = null;
    pageState.canvas.renderAll();
    pushHistory(pageState);
  }

  function maybeFinalizeInteractionArea(pageState) {
    if (!pageState.draft || !pageState.pointerStart || !pageState.pointerEnd) {
      return;
    }

    const width = Math.abs(pageState.pointerStart.x - pageState.pointerEnd.x);
    const height = Math.abs(pageState.pointerStart.y - pageState.pointerEnd.y);
    pageState.canvas.remove(pageState.draft);
    pageState.canvas.renderAll();

    if (width < 18 || height < 18) {
      pageState.draft = null;
      pageState.pointerStart = null;
      pageState.pointerEnd = null;
      return;
    }

    const type = state.tool === 'answer-area' ? 'answer' : 'magnifier';
    const hotspot = {
      id: createId(type),
      type: type,
      page: pageState.index,
      rect: normalizeRect(pageState.pointerStart, pageState.pointerEnd, pageState),
    };
    state.interactions.hotspots.push(hotspot);

    if (type === 'answer') {
      const rectPx = rectToCanvas(hotspot.rect, pageState);
      pageState.canvas.getObjects().forEach(function(object) {
        if (objectIsInsideRect(object, rectPx)) {
          object.isAnswerObject = true;
          object.answerHotspotId = hotspot.id;
        }
      });
      pushHistory(pageState);
    }

    pageState.draft = null;
    pageState.pointerStart = null;
    pageState.pointerEnd = null;
    renderHotspotsForPage(pageState);
    markInteractionsDirty(type === 'answer'
      ? 'Cevap alanı eklendi. İçindeki çizimler öğrenci ekranında soru işareti açılana kadar gizlenecek.'
      : 'Büyüteç alanı eklendi. Yayınlayınca öğrenci ekranda büyüteç ikonunu görecek.');
  }

  function applyToolToPage(pageState) {
    const canvas = pageState.canvas;
    const visiblePages = getVisiblePages();
    const isVisible = visiblePages.includes(pageState.index);
    const canInteract = isVisible && state.tool !== 'pan' && !state.isFlipping && !state.isRebuilding;
    const isInteractionTool = INTERACTION_TOOL_KEYS.includes(state.tool);

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
    lockFabricNativeSurfaces(canvas);

    if (!isVisible) {
      canvas.discardActiveObject();
      canvas.renderAll();
      return;
    }

    if (isInteractionTool) {
      canvas.selection = false;
      canvas.skipTargetFind = true;
      canvas.isDrawingMode = false;
    } else if (['pen', 'highlighter', 'eraser'].includes(state.tool)) {
      canvas.selection = false;
      canvas.skipTargetFind = true;
      canvas.isDrawingMode = true;
      const brush = new window.fabric.PencilBrush(canvas);
      brush.width = state.size;
      brush.color = state.tool === 'highlighter'
        ? hexToRgba(state.color, 0.28)
        : (state.tool === 'eraser' ? 'rgba(0,0,0,0)' : state.color);
      canvas.freeDrawingBrush = brush;
    }
  }

  function applyToolToAllPages() {
    state.pages.forEach(function(pageState) {
      applyToolToPage(pageState);
    });
    applyToolToCropCanvas();
    updateHistoryButtons();
  }

  function setTool(tool) {
    if (tool === 'clear-area') {
      clearCurrentScope();
      return;
    }
    state.tool = tool;
    if (SHAPE_TOOL_KEYS.includes(tool) || INTERACTION_TOOL_KEYS.includes(tool)) {
      state.shapesOpen = true;
    }
    syncToolbarUi();
    applyToolToAllPages();
    syncZoomButtons();
    refreshStatus();
  }

  function bindCanvasEvents(pageState) {
    const canvas = pageState.canvas;

    canvas.on('path:created', function(event) {
      tagObjectForAnswerHotspot(pageState, event.path);
      if (state.tool === 'eraser') {
        prepareEraserPath(event.path);
        pageState.canvas.renderAll();
      } else {
        makeObjectEditable(event.path);
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
    canvas.on('selection:created', syncSelectedObjectControls);
    canvas.on('selection:updated', syncSelectedObjectControls);
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

      if (state.editMode && INTERACTION_TOOL_KEYS.includes(state.tool)) {
        pageState.pointerStart = pointer;
        pageState.pointerEnd = pointer;
        pageState.draft = new window.fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 4,
          height: 4,
          fill: state.tool === 'answer-area' ? 'rgba(255,96,82,.10)' : 'rgba(108,61,237,.10)',
          stroke: state.tool === 'answer-area' ? '#FF6052' : '#6C3DED',
          strokeDashArray: [10, 6],
          strokeWidth: 2,
          selectable: false,
          evented: false,
          objectCaching: false,
        });
        pageState.draft._temp = true;
        canvas.add(pageState.draft);
        canvas.renderAll();
        return;
      }

      if (state.tool === 'text') {
        const text = new window.fabric.IText('Yeni metin', {
          left: pointer.x,
          top: pointer.y,
          fill: state.color,
          fontSize: Math.max(18, state.size * 4),
          fontWeight: '700',
          fontFamily: 'Nunito, sans-serif',
        });
        makeObjectEditable(text);
        canvas.add(text);
        tagObjectForAnswerHotspot(pageState, text);
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
      if (!pageState.draft || !pageState.pointerStart || (!SHAPE_TOOLS.includes(state.tool) && !INTERACTION_TOOL_KEYS.includes(state.tool))) {
        return;
      }

      pageState.pointerEnd = canvas.getPointer(opt.e);
      canvas.remove(pageState.draft);
      if (INTERACTION_TOOL_KEYS.includes(state.tool)) {
        const rect = {
          left: Math.min(pageState.pointerStart.x, pageState.pointerEnd.x),
          top: Math.min(pageState.pointerStart.y, pageState.pointerEnd.y),
          width: Math.abs(pageState.pointerEnd.x - pageState.pointerStart.x),
          height: Math.abs(pageState.pointerEnd.y - pageState.pointerStart.y),
          fill: state.tool === 'answer-area' ? 'rgba(255,96,82,.10)' : 'rgba(108,61,237,.10)',
          stroke: state.tool === 'answer-area' ? '#FF6052' : '#6C3DED',
          strokeDashArray: [10, 6],
          strokeWidth: 2,
          selectable: false,
          evented: false,
          objectCaching: false,
        };
        pageState.draft = new window.fabric.Rect(rect);
      } else {
        pageState.draft = buildShape(state.tool, pageState.pointerStart, pageState.pointerEnd);
      }
      if (pageState.draft) {
        pageState.draft._temp = true;
        canvas.add(pageState.draft);
        canvas.renderAll();
      }
    });

    canvas.on('mouse:up', function() {
      if (state.editMode && INTERACTION_TOOL_KEYS.includes(state.tool)) {
        maybeFinalizeInteractionArea(pageState);
        return;
      }
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

  function getMagnifierIconMarkup() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="5.5"></circle><path d="m15 15 5 5"></path></svg>';
  }

  function renderHotspotsForPage(pageState) {
    if (!pageState || !pageState.hotspotLayer) {
      return;
    }

    const hotspots = getHotspotsForPage(pageState.index);
    pageState.hotspotLayer.innerHTML = hotspots.map(function(hotspot) {
      const rect = hotspot.rect || {};
      const left = (Number(rect.x || 0) * 100).toFixed(4);
      const top = (Number(rect.y || 0) * 100).toFixed(4);
      const width = (Number(rect.w || 0) * 100).toFixed(4);
      const height = (Number(rect.h || 0) * 100).toFixed(4);
      const markerX = (Number(rect.x || 0) * 100).toFixed(4);
      const markerY = (Number(rect.y || 0) * 100).toFixed(4);
      const isAnswer = hotspot.type === 'answer';
      if (isAnswer && !state.editMode && state.interactions.answersHidden === false) {
        return '';
      }
      const openClass = isAnswer && state.revealedAnswers[hotspot.id] ? ' is-open' : '';
      const outline = state.editMode
        ? '<span class="hotspot-outline" style="left:' + left + '%;top:' + top + '%;width:' + width + '%;height:' + height + '%"></span>'
        : '';
      const icon = isAnswer ? '?' : getMagnifierIconMarkup();
      return outline +
        '<button class="hotspot-marker ' + (isAnswer ? 'answer' : 'magnifier') + openClass + '"' +
          ' type="button" data-hotspot-id="' + hotspot.id + '"' +
          ' style="left:' + markerX + '%;top:' + markerY + '%"' +
          ' aria-label="' + (isAnswer ? 'Cevabı göster' : 'Alanı büyüt') + '">' + icon + '</button>';
    }).join('');
  }

  function renderAllHotspots() {
    state.pages.forEach(function(pageState) {
      renderHotspotsForPage(pageState);
      setAnswerObjectsVisibility(pageState);
    });
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

    const hotspotLayer = document.createElement('div');
    hotspotLayer.className = 'page-hotspot-layer';

    const footer = document.createElement('div');
    footer.className = 'page-footer';
    footer.textContent = 'Sayfa ' + pageNumber;

    surface.appendChild(pdfCanvas);
    surface.appendChild(annotationCanvas);
    surface.appendChild(hotspotLayer);
    shell.appendChild(surface);
    shell.appendChild(footer);
    return {
      shell: shell,
      pdfCanvas: pdfCanvas,
      annotationCanvas: annotationCanvas,
      hotspotLayer: hotspotLayer,
    };
  }

  async function initPage(pageNumber, pdfPage) {
    const baseViewport = pdfPage.getViewport({ scale: 1 });
    const cssScale = state.pageWidth / baseViewport.width;
    const viewport = pdfPage.getViewport({ scale: cssScale });
    const renderBoost = Math.min(PDF_RENDER_BOOST, Math.max(2, window.devicePixelRatio || 1));
    const nodes = createPageShell(pageNumber);
    nodes.pdfCanvas.width = Math.round(viewport.width * renderBoost);
    nodes.pdfCanvas.height = Math.round(viewport.height * renderBoost);
    nodes.pdfCanvas.style.width = viewport.width + 'px';
    nodes.pdfCanvas.style.height = viewport.height + 'px';
    nodes.annotationCanvas.style.width = viewport.width + 'px';
    nodes.annotationCanvas.style.height = viewport.height + 'px';
    nodes.shell.style.width = viewport.width + 'px';
    nodes.shell.style.height = viewport.height + 'px';

    const pdfContext = nodes.pdfCanvas.getContext('2d', { alpha: false });
    pdfContext.imageSmoothingEnabled = true;
    pdfContext.imageSmoothingQuality = 'high';
    await pdfPage.render({
      canvasContext: pdfContext,
      viewport: viewport,
      transform: renderBoost > 1 ? [renderBoost, 0, 0, renderBoost, 0, 0] : null,
    }).promise;

    const fabricCanvas = new window.fabric.Canvas(nodes.annotationCanvas, {
      preserveObjectStacking: true,
      selection: false,
      enableRetinaScaling: true,
    });
    fabricCanvas.setWidth(viewport.width);
    fabricCanvas.setHeight(viewport.height);
    lockFabricNativeSurfaces(fabricCanvas);

    const pageState = {
      index: pageNumber,
      wrapper: nodes.shell,
      canvas: fabricCanvas,
      pdfCanvasEl: nodes.pdfCanvas,
      annotationCanvasEl: nodes.annotationCanvas,
      hotspotLayer: nodes.hotspotLayer,
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

    setAnswerObjectsVisibility(pageState);
    renderHotspotsForPage(pageState);
    state.pages.set(pageNumber, pageState);
    return nodes.shell;
  }

  function getResponsivePageWidth(baseWidth, baseHeight) {
    const frame = getBookFrame();
    const viewportWidth = Math.max(
      320,
      (frame && frame.clientWidth ? frame.clientWidth : (window.innerWidth || 1280)) - 28
    );
    const isLandscape = baseWidth >= baseHeight;
    if (state.viewMode === 'spread') {
      return Math.max(168, Math.min(isLandscape ? 620 : 560, (viewportWidth - 12) / 2));
    }
    if (viewportWidth < 760) {
      return Math.max(280, viewportWidth - 24);
    }
    if (viewportWidth < 1180) {
      return Math.min(isLandscape ? 920 : 780, viewportWidth - 28);
    }
    return Math.min(isLandscape ? 1100 : 860, viewportWidth - 44);
  }

  function showPage(pageNumber, initial) {
    const previousPage = state.currentPage;
    const targetPage = normalizePageForViewMode(pageNumber);
    const direction = targetPage >= previousPage ? 'next' : 'prev';
    const previousState = state.pages.get(previousPage) || null;
    const targetState = state.pages.get(targetPage) || null;
    const previousVisiblePages = getVisiblePagesFor(previousPage);
    const visiblePages = getVisiblePagesFor(targetPage);
    let flipFromState = null;
    let flipToState = null;
    let flipSlot = 'center';

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

    if (!initial) {
      if (state.viewMode === 'spread') {
        if (direction === 'next') {
          flipFromState = state.pages.get(previousVisiblePages[previousVisiblePages.length - 1]) || null;
          flipToState = state.pages.get(visiblePages[0]) || null;
          flipSlot = 'right';
        } else {
          flipFromState = state.pages.get(previousVisiblePages[0]) || null;
          flipToState = state.pages.get(visiblePages[visiblePages.length - 1]) || state.pages.get(visiblePages[0]) || null;
          flipSlot = 'left';
        }
      } else {
        flipFromState = previousState;
        flipToState = targetState;
      }
    }

    if (!initial && flipFromState && flipToState && flipFromState !== flipToState) {
      state.isFlipping = true;
    } else {
      state.isFlipping = false;
    }

    syncPageControls();
    applyToolToAllPages();
    renderAllHotspots();
    updateBookTransform();
    refreshStatus(initial ? 'Doküman hazır.' : '');

    if (!initial && flipFromState && flipToState && flipFromState !== flipToState) {
      animatePageTurn(flipFromState, flipToState, direction, flipSlot);
    }
  }

  function goToPage(pageNumber) {
    syncPageControls();
    if (!state.pageCount || state.isFlipping) {
      return;
    }
    if (document.body.classList.contains('is-crop-view')) {
      exitCropView();
    } else if (state.zoom > 1) {
      setZoom(1);
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
    if (state.documentRow && state.documentRow.etkilesim_json && state.documentRow.etkilesim_json.pages) {
      state.annotationCache.pages = Object.assign({}, state.annotationCache.pages, state.documentRow.etkilesim_json.pages);
    }
    state.pages.clear();

    state.pdfDoc = await window.pdfjsLib.getDocument(state.documentRow.dosyaUrl).promise;
    state.pageCount = state.pdfDoc.numPages;

    const firstPage = await state.pdfDoc.getPage(1);
    const baseViewport = firstPage.getViewport({ scale: 1 });
    state.pageWidth = getResponsivePageWidth(baseViewport.width, baseViewport.height);
    state.pageHeight = state.pageWidth * (baseViewport.height / baseViewport.width);
    state.bookWidth = state.viewMode === 'spread' ? (state.pageWidth * 2) + 4 : state.pageWidth;
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
        multiplier: ANNOTATION_EXPORT_SCALE,
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

  function findHotspot(id) {
    return state.interactions.hotspots.find(function(item) {
      return item.id === id;
    }) || null;
  }

  function getMagnifierHotspots() {
    return state.interactions.hotspots
      .filter(function(item) { return item.type === 'magnifier'; })
      .slice()
      .sort(function(a, b) {
        if (Number(a.page) !== Number(b.page)) {
          return Number(a.page) - Number(b.page);
        }
        const ar = a.rect || {};
        const br = b.rect || {};
        if (Number(ar.y || 0) !== Number(br.y || 0)) {
          return Number(ar.y || 0) - Number(br.y || 0);
        }
        return Number(ar.x || 0) - Number(br.x || 0);
      });
  }

  function updateCropControls() {
    const nav = qs('cropNav');
    const prev = qs('cropPrevBtn');
    const next = qs('cropNextBtn');
    if (!nav || !prev || !next) {
      return;
    }
    const hotspots = getMagnifierHotspots();
    const activeIndex = hotspots.findIndex(function(item) {
      return item.id === state.activeMagnifierId;
    });
    state.activeMagnifierIndex = activeIndex;
    nav.setAttribute('aria-hidden', state.activeMagnifierId ? 'false' : 'true');
    prev.disabled = activeIndex <= 0;
    next.disabled = activeIndex === -1 || activeIndex >= hotspots.length - 1;
  }

  function cropRectsIntersect(a, b) {
    return a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y;
  }

  function renderCropAnswerMarkers(hotspot, pageState, cropPx, canvasCss, imageBox) {
    const layer = qs('cropHotspotLayer');
    if (!layer) {
      return;
    }
    const answers = getHotspotsForPage(pageState.index).filter(function(item) {
      return item.type === 'answer' && cropRectsIntersect(rectToCanvas(item.rect || {}, pageState), cropPx);
    });

    layer.innerHTML = answers.map(function(answer) {
      const rect = rectToCanvas(answer.rect || {}, pageState);
      const localX = ((rect.x - cropPx.x) / cropPx.w) * (imageBox ? imageBox.width : canvasCss.width);
      const localY = ((rect.y - cropPx.y) / cropPx.h) * (imageBox ? imageBox.height : canvasCss.height);
      const x = ((imageBox ? imageBox.x : 0) + localX) / canvasCss.width * 100;
      const y = ((imageBox ? imageBox.y : 0) + localY) / canvasCss.height * 100;
      const openClass = state.revealedAnswers[answer.id] ? ' is-open' : '';
      return '<button class="hotspot-marker answer' + openClass + '" type="button" data-hotspot-id="' + answer.id + '" style="left:' + x.toFixed(4) + '%;top:' + y.toFixed(4) + '%" aria-label="Cevabı göster">?</button>';
    }).join('');
    if (canvasCss) {
      layer.style.width = canvasCss.width + 'px';
      layer.style.height = canvasCss.height + 'px';
    }
  }

  function renderCropView(hotspot) {
    const pageState = hotspot ? state.pages.get(Number(hotspot.page)) : null;
    const stage = qs('cropStage');
    const surface = qs('cropSurface');
    const canvas = qs('cropCanvas');
    const annotationCanvas = qs('cropAnnotationCanvas');
    if (!pageState || !stage || !surface || !canvas || !annotationCanvas) {
      return;
    }

    const composed = createComposedPageCanvas(pageState);
    if (!composed) {
      return;
    }

    const rect = rectToCanvas(hotspot.rect || {}, pageState);
    const scaleX = composed.width / pageState.canvas.getWidth();
    const scaleY = composed.height / pageState.canvas.getHeight();
    const sx = clamp(rect.x * scaleX, 0, composed.width - 1);
    const sy = clamp(rect.y * scaleY, 0, composed.height - 1);
    const sw = clamp(rect.w * scaleX, 1, composed.width - sx);
    const sh = clamp(rect.h * scaleY, 1, composed.height - sy);
    const surfaceWidth = Math.max(320, Math.floor(stage.clientWidth || 900));
    const surfaceHeight = Math.max(240, Math.floor(stage.clientHeight || 620));
    const verticalRoomForNotes = Math.min(260, Math.max(120, surfaceHeight * 0.28));
    const maxWidth = surfaceWidth;
    const maxHeight = Math.max(160, surfaceHeight - verticalRoomForNotes);
    const displayScale = Math.min(maxWidth / sw, maxHeight / sh);
    const displayWidth = Math.max(1, Math.floor(sw * displayScale));
    const displayHeight = Math.max(1, Math.floor(sh * displayScale));
    const imageX = Math.max(0, Math.floor((surfaceWidth - displayWidth) / 2));
    const imageY = Math.max(0, Math.floor((surfaceHeight - displayHeight) / 2));

    canvas.width = surfaceWidth;
    canvas.height = surfaceHeight;
    annotationCanvas.width = surfaceWidth;
    annotationCanvas.height = surfaceHeight;
    canvas.style.width = surfaceWidth + 'px';
    canvas.style.height = surfaceHeight + 'px';
    annotationCanvas.style.width = surfaceWidth + 'px';
    annotationCanvas.style.height = surfaceHeight + 'px';
    surface.style.width = surfaceWidth + 'px';
    surface.style.height = surfaceHeight + 'px';
    const cropContext = canvas.getContext('2d');
    cropContext.clearRect(0, 0, canvas.width, canvas.height);
    cropContext.fillStyle = '#ffffff';
    cropContext.fillRect(0, 0, canvas.width, canvas.height);
    cropContext.drawImage(composed, sx, sy, sw, sh, imageX, imageY, displayWidth, displayHeight);

    if (state.crop.canvas) {
      saveCropSnapshot();
      state.crop.canvas.dispose();
      state.crop.canvas = null;
    }
    state.crop.page = pageState;
    state.crop.rect = rect;
    state.crop.displayScale = displayWidth / Math.max(1, rect.w);
    state.crop.zoom = 1;
    state.crop.panX = 0;
    state.crop.panY = 0;
    state.crop.hotspotId = hotspot.id;
    state.crop.canvas = new window.fabric.Canvas(annotationCanvas, {
      preserveObjectStacking: true,
      selection: state.tool === 'select',
      enableRetinaScaling: true,
    });
    state.crop.canvas.setWidth(surfaceWidth);
    state.crop.canvas.setHeight(surfaceHeight);
    lockFabricNativeSurfaces(state.crop.canvas);
    syncCropCanvasElementSize(surfaceWidth, surfaceHeight);
    bindCropCanvasEvents();
    applyToolToCropCanvas();
    loadCropSnapshotToCanvas(hotspot.id);
    renderCropAnswerMarkers(
      hotspot,
      pageState,
      rect,
      { width: surfaceWidth, height: surfaceHeight },
      { x: imageX, y: imageY, width: displayWidth, height: displayHeight }
    );
    updateCropTransform();
    updateHistoryButtons();
  }

  function loadCropSnapshotToCanvas(hotspotId) {
    const canvas = state.crop.canvas;
    const saved = state.annotationCache.crop && hotspotId ? state.annotationCache.crop[hotspotId] : '';
    if (!canvas) {
      return;
    }
    state.crop.isRestoring = false;
    if (!saved) {
      canvas.renderAll();
      return;
    }
    state.crop.isRestoring = true;
    try {
      canvas.loadFromJSON(JSON.parse(saved), function() {
        state.crop.isRestoring = false;
        makeCanvasObjectsEditable(canvas);
        canvas.renderAll();
        applyToolToCropCanvas();
      });
    } catch (error) {
      state.crop.isRestoring = false;
      canvas.renderAll();
    }
  }

  function syncCropCanvasElementSize(width, height) {
    const cropCanvas = state.crop.canvas;
    if (!cropCanvas) {
      return;
    }
    const wrapper = cropCanvas.wrapperEl;
    if (wrapper) {
      wrapper.style.position = 'absolute';
      wrapper.style.left = '0';
      wrapper.style.top = '0';
      wrapper.style.width = width + 'px';
      wrapper.style.height = height + 'px';
      wrapper.style.zIndex = '2';
      wrapper.style.pointerEvents = 'auto';
    }
    [cropCanvas.lowerCanvasEl, cropCanvas.upperCanvasEl].forEach(function(el) {
      if (!el) {
        return;
      }
      el.style.position = 'absolute';
      el.style.left = '0';
      el.style.top = '0';
      el.style.width = width + 'px';
      el.style.height = height + 'px';
      el.style.maxWidth = 'none';
      el.style.maxHeight = 'none';
      el.style.background = 'transparent';
      el.style.pointerEvents = 'auto';
      el.style.touchAction = 'none';
    });
    if (cropCanvas.lowerCanvasEl) {
      cropCanvas.lowerCanvasEl.style.zIndex = '2';
    }
    if (cropCanvas.upperCanvasEl) {
      cropCanvas.upperCanvasEl.style.zIndex = '3';
      cropCanvas.upperCanvasEl.style.cursor = state.tool === 'pan'
        ? (state.crop.zoom > 1 ? 'grab' : 'default')
        : (['pen', 'highlighter', 'eraser'].includes(state.tool) ? 'crosshair' : 'default');
    }
    cropCanvas.calcOffset();
    window.requestAnimationFrame(function() {
      if (state.crop.canvas === cropCanvas) {
        cropCanvas.calcOffset();
      }
    });
  }

  function mapCropObjectToPage(object) {
    const pageState = state.crop.page;
    if (!pageState || !state.crop.rect || !object) {
      return;
    }
    const ratio = 1 / Math.max(0.0001, state.crop.displayScale || 1);
    object.clone(function(cloned) {
      cloned.left = state.crop.rect.x + (Number(cloned.left || 0) * ratio);
      cloned.top = state.crop.rect.y + (Number(cloned.top || 0) * ratio);
      cloned.scaleX = Number(cloned.scaleX || 1) * ratio;
      cloned.scaleY = Number(cloned.scaleY || 1) * ratio;
      cloned.strokeWidth = cloned.strokeWidth ? cloned.strokeWidth * ratio : cloned.strokeWidth;
      cloned.isAnswerObject = object.isAnswerObject || false;
      cloned.answerHotspotId = object.answerHotspotId || '';
      tagObjectForAnswerHotspot(pageState, cloned);
      pageState.canvas.add(cloned);
      pageState.canvas.renderAll();
      pushHistory(pageState);
    }, ['globalCompositeOperation', 'isAnswerObject', 'answerHotspotId']);
  }

  function applyToolToCropCanvas() {
    const canvas = state.crop.canvas;
    if (!canvas) {
      return;
    }
    canvas.isDrawingMode = false;
    canvas.selection = state.tool === 'select';
    canvas.skipTargetFind = state.tool !== 'select';
    canvas.defaultCursor = state.tool === 'select'
      ? 'default'
      : (state.tool === 'pan' ? (state.crop.zoom > 1 ? 'grab' : 'default') : 'crosshair');
    if (['pen', 'highlighter', 'eraser'].includes(state.tool)) {
      canvas.selection = false;
      canvas.skipTargetFind = true;
      canvas.isDrawingMode = true;
      const brush = new window.fabric.PencilBrush(canvas);
      brush.width = state.size;
      brush.color = state.tool === 'highlighter'
        ? hexToRgba(state.color, 0.28)
        : (state.tool === 'eraser' ? 'rgba(0,0,0,0)' : state.color);
      canvas.freeDrawingBrush = brush;
    }
    canvas.renderAll();
    syncCropCanvasElementSize(canvas.getWidth(), canvas.getHeight());
  }

  function buildCropShape(tool, start, end) {
    return buildShape(tool, start, end);
  }

  function bindCropCanvasEvents() {
    const canvas = state.crop.canvas;
    if (!canvas) {
      return;
    }
    canvas.on('path:created', function(event) {
      if (state.tool === 'eraser') {
        prepareEraserPath(event.path);
        canvas.renderAll();
      } else {
        makeObjectEditable(event.path);
      }
      saveCropSnapshot();
    });
    canvas.on('object:modified', function(event) {
      if (event.target && !event.target._temp) {
        saveCropSnapshot();
      }
    });
    canvas.on('text:changed', saveCropSnapshot);
    canvas.on('text:editing:exited', saveCropSnapshot);
    canvas.on('object:removed', function() {
      saveCropSnapshot();
    });
    canvas.on('selection:created', syncSelectedObjectControls);
    canvas.on('selection:updated', syncSelectedObjectControls);
    canvas.on('selection:cleared', updateHistoryButtons);
    canvas.on('mouse:down', function(opt) {
      const pointer = canvas.getPointer(opt.e);
      if (state.tool === 'text') {
        const margin = 18;
        const left = clamp(pointer.x, margin, Math.max(margin, canvas.getWidth() - margin));
        const top = clamp(pointer.y, margin, Math.max(margin, canvas.getHeight() - margin));
        const availableWidth = Math.max(180, canvas.getWidth() - left - margin);
        const text = new window.fabric.Textbox('Yeni metin', {
          left: left,
          top: top,
          width: Math.min(availableWidth, Math.max(220, canvas.getWidth() - (margin * 2))),
          fill: state.color,
          fontSize: Math.max(18, state.size * 4),
          fontWeight: '700',
          fontFamily: 'Nunito, sans-serif',
          splitByGrapheme: true,
          objectCaching: false,
        });
        makeObjectEditable(text);
        canvas.add(text);
        canvas.setActiveObject(text);
        canvas.renderAll();
        text.enterEditing();
        saveCropSnapshot();
        return;
      }
      if (!SHAPE_TOOLS.includes(state.tool)) {
        return;
      }
      state.crop.pointerStart = pointer;
      state.crop.pointerEnd = pointer;
      state.crop.draft = buildCropShape(state.tool, pointer, pointer);
      if (state.crop.draft) {
        state.crop.draft._temp = true;
        canvas.add(state.crop.draft);
        canvas.renderAll();
      }
    });
    canvas.on('mouse:move', function(opt) {
      if (!state.crop.draft || !state.crop.pointerStart || !SHAPE_TOOLS.includes(state.tool)) {
        return;
      }
      state.crop.pointerEnd = canvas.getPointer(opt.e);
      canvas.remove(state.crop.draft);
      state.crop.draft = buildCropShape(state.tool, state.crop.pointerStart, state.crop.pointerEnd);
      if (state.crop.draft) {
        state.crop.draft._temp = true;
        canvas.add(state.crop.draft);
        canvas.renderAll();
      }
    });
    canvas.on('mouse:up', function() {
      if (!state.crop.draft || !state.crop.pointerStart || !state.crop.pointerEnd) {
        return;
      }
      state.crop.draft._temp = false;
      makeObjectEditable(state.crop.draft);
      state.crop.draft = null;
      state.crop.pointerStart = null;
      state.crop.pointerEnd = null;
      canvas.renderAll();
      saveCropSnapshot();
    });
  }

  function exitCropView() {
    state.activeMagnifierId = '';
    state.activeMagnifierIndex = -1;
    document.body.classList.remove('is-crop-view');
    if (qs('cropStage')) {
      qs('cropStage').setAttribute('aria-hidden', 'true');
    }
    if (qs('cropHotspotLayer')) {
      qs('cropHotspotLayer').innerHTML = '';
    }
    if (state.crop.canvas) {
      saveCropSnapshot();
      state.crop.canvas.dispose();
      state.crop.canvas = null;
    }
    state.crop.page = null;
    state.crop.rect = null;
    state.crop.hotspotId = '';
    state.crop.isRestoring = false;
    state.crop.zoom = 1;
    state.crop.panX = 0;
    state.crop.panY = 0;
    if (getCropSurface()) {
      getCropSurface().style.transform = '';
    }
    setZoom(1);
    updateCropControls();
    setStatus('Sayfanın tamamına dönüldü.');
  }

  function focusMagnifierByOffset(offset) {
    const hotspots = getMagnifierHotspots();
    const activeIndex = hotspots.findIndex(function(item) {
      return item.id === state.activeMagnifierId;
    });
    const nextIndex = clamp((activeIndex === -1 ? 0 : activeIndex + offset), 0, Math.max(0, hotspots.length - 1));
    if (hotspots[nextIndex]) {
      focusHotspotInline(hotspots[nextIndex], { force: true });
    }
  }

  function focusHotspotInline(hotspot, options) {
    const pageState = hotspot ? state.pages.get(Number(hotspot.page)) : null;
    if (!pageState) {
      return;
    }

    if (!(options && options.force) && state.activeMagnifierId === hotspot.id && document.body.classList.contains('is-crop-view')) {
      exitCropView();
      return;
    }

    if (!getVisiblePages().includes(pageState.index)) {
      goToPage(pageState.index);
    }

    state.activeMagnifierId = hotspot.id;
    document.body.classList.add('is-crop-view');
    if (qs('cropStage')) {
      qs('cropStage').setAttribute('aria-hidden', 'false');
    }
    updateCropControls();
    renderCropView(hotspot);
    setStatus('Seçili alan kırpılmış görünümde açıldı. Sayfaya Dön ile tam sayfaya dönebilirsin.');
  }

  function closeMagnifyModal() {
    const modal = qs('magnifyModal');
    const stage = qs('magnifyStage');
    if (!modal || !stage) {
      return;
    }
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    stage.innerHTML = '';
  }

  function toggleAnswerHotspot(hotspot) {
    if (!hotspot) {
      return;
    }
    state.revealedAnswers[hotspot.id] = !state.revealedAnswers[hotspot.id];
    const pageState = state.pages.get(Number(hotspot.page));
    setAnswerObjectsVisibility(pageState);
    renderHotspotsForPage(pageState);
    if (state.activeMagnifierId) {
      const active = findHotspot(state.activeMagnifierId);
      if (active) {
        renderCropView(active);
      }
    }
    setStatus(state.revealedAnswers[hotspot.id] ? 'Cevap görünür.' : 'Cevap tekrar gizlendi.');
  }

  function maybeTurnPageFromCornerClick(event) {
    if (state.isFlipping || state.isRebuilding || state.zoom > 1 || !['select', 'pan'].includes(state.tool)) {
      return false;
    }
    if (event.target.closest('[data-hotspot-id]') || event.target.closest('button,a,input,textarea,select')) {
      return false;
    }

    const activePage = event.target.closest('.flip-page.is-active');
    if (!activePage) {
      return false;
    }

    const rect = activePage.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const nearTopOrBottom = y <= 84 || y >= rect.height - 84;
    const nearLeft = x <= 84;
    const nearRight = x >= rect.width - 84;

    if (!nearTopOrBottom || (!nearLeft && !nearRight)) {
      return false;
    }

    if (nearLeft) {
      goToPage(state.currentPage - getPageStep());
    } else {
      goToPage(state.currentPage + getPageStep());
    }
    event.preventDefault();
    event.stopPropagation();
    return true;
  }

  function removeHotspot(hotspot) {
    if (!hotspot || !state.editMode) {
      return;
    }
    if (!window.confirm('Bu etkileşimli alan kaldırılsın mı?')) {
      return;
    }
    state.interactions.hotspots = state.interactions.hotspots.filter(function(item) {
      return item.id !== hotspot.id;
    });
    const pageState = state.pages.get(Number(hotspot.page));
    if (pageState && hotspot.type === 'answer') {
      pageState.canvas.getObjects().forEach(function(object) {
        if (object.answerHotspotId === hotspot.id) {
          object.isAnswerObject = false;
          object.answerHotspotId = '';
          object.visible = true;
        }
      });
      pushHistory(pageState);
    }
    renderHotspotsForPage(pageState);
    markInteractionsDirty('Alan kaldırıldı. Değişikliği öğrenci ekranına aktarmak için yeniden yayınla.');
  }

  async function savePublishedInteractions() {
    if (!state.editMode || !state.documentId) {
      return;
    }
    try {
      setStatus('Etkileşimli alanlar yayınlanıyor…');
      const pages = {};
      state.pages.forEach(function(pageState) {
        pages[String(pageState.index)] = getSnapshot(pageState);
      });
      const payload = {
        version: 1,
        answersHidden: qs('answersHiddenInput') ? qs('answersHiddenInput').checked : true,
        hotspots: state.interactions.hotspots,
        pages: pages,
        updatedAt: new Date().toISOString(),
      };
      const client = window.kemalAdminAuth && typeof window.kemalAdminAuth.getClient === 'function'
        ? window.kemalAdminAuth.getClient()
        : null;
      if (!client) {
        throw new Error('Yönetici oturumu bulunamadı.');
      }
      const result = await client
        .from('dokumanlar')
        .update({
          etkilesim_json: payload,
          guncelleme_tarihi: new Date().toISOString(),
        })
        .eq('id', state.documentId);
      if (result.error) {
        throw result.error;
      }
      state.interactionsDirty = false;
      state.interactions.answersHidden = payload.answersHidden;
      state.documentRow.etkilesim_json = payload;
      const status = qs('interactionStatus');
      if (status) {
        status.textContent = 'Yayınlandı. Öğrenci ekranında büyüteç ve soru işaretleri artık görünecek.';
      }
      setStatus('Etkileşimli alanlar yayınlandı.');
    } catch (error) {
      setStatus('Yayınlama sırasında sorun oluştu.');
      window.alert(error && error.message ? error.message : 'Etkileşimli alanlar yayınlanamadı.');
    }
  }

  function renderToolButtonMarkup(tool) {
    return (
      '<button class="toolbar-btn' + (tool.key === state.tool ? ' active is-active' : '') + '"' +
      ' type="button"' +
      ' data-tool="' + tool.key + '"' +
      ' data-label="' + tool.label + '"' +
      ' aria-label="' + tool.label + '">' +
        tool.icon +
      '</button>'
    );
  }

  function renderToolButtons() {
    const mainTarget = qs('docMainTools');
    const shapeTarget = qs('docShapeTools');
    if (!mainTarget || !shapeTarget) {
      return;
    }

    mainTarget.innerHTML = PRIMARY_TOOL_KEYS.map(function(key) {
      return getToolDef(key);
    }).filter(Boolean).map(renderToolButtonMarkup).join('');

    const shapeKeys = state.editMode ? SHAPE_TOOL_KEYS.concat(INTERACTION_TOOL_KEYS) : SHAPE_TOOL_KEYS;
    shapeTarget.innerHTML = shapeKeys.map(function(key) {
      return getToolDef(key);
    }).filter(Boolean).map(renderToolButtonMarkup).join('');
  }

  function bindToolContainer(container) {
    if (!container) {
      return;
    }

    container.addEventListener('click', function(event) {
      const button = event.target.closest('[data-tool]');
      if (!button) {
        return;
      }
      hideToolTooltip();
      const tool = button.getAttribute('data-tool');
      if (tool === 'clear-area') {
        clearCurrentScope();
        return;
      }
      setTool(tool);
    });
    container.addEventListener('mouseover', function(event) {
      const button = event.target.closest('[data-tool]');
      if (button) {
        showToolTooltip(button, event);
      }
    });
    container.addEventListener('mousemove', function(event) {
      const button = event.target.closest('[data-tool]');
      if (button) {
        showToolTooltip(button, event);
      }
    });
    container.addEventListener('mouseleave', hideToolTooltip);
  }

  function setToolbarCollapsed(collapsed) {
    state.toolbarCollapsed = !!collapsed;
    syncToolbarUi();
  }

  function toggleShapePanel() {
    state.shapesOpen = !state.shapesOpen;
    syncToolbarUi();
  }

  function buildProtractorSvgMarkup() {
    var svg = '<svg viewBox="-220 -220 440 240" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><path d="M -200 0 A 200 200 0 0 1 200 0 Z" fill="rgba(255, 255, 255, 0.45)" stroke="#1a1040" stroke-width="2"/><path d="M -150 0 A 150 150 0 0 1 150 0" fill="none" stroke="#1a1040" stroke-width="1.5"/><circle cx="0" cy="0" r="6" fill="none" stroke="#1a1040" stroke-width="2"/><line x1="-20" y1="0" x2="20" y2="0" stroke="#1a1040" stroke-width="2"/><line x1="0" y1="-20" x2="0" y2="0" stroke="#1a1040" stroke-width="2"/>';
    for (var i = 0; i <= 180; i += 1) {
      var a = i * Math.PI / 180;
      var is10 = i % 10 === 0;
      var is5 = i % 5 === 0;
      var outer = 200;
      var inner = is10 ? 180 : (is5 ? 188 : 194);
      var x1 = -Math.cos(a) * outer;
      var y1 = -Math.sin(a) * outer;
      var x2 = -Math.cos(a) * inner;
      var y2 = -Math.sin(a) * inner;
      var innerLine = is10
        ? '<line x1="' + (-Math.cos(a) * 150) + '" y1="' + (-Math.sin(a) * 150) + '" x2="' + (-Math.cos(a) * 140) + '" y2="' + (-Math.sin(a) * 140) + '" stroke="#1a1040" stroke-width="1.5"/>'
        : '';
      var text = '';
      if (is10) {
        var tx1 = -Math.cos(a) * 168;
        var ty1 = -Math.sin(a) * 168;
        var tx2 = -Math.cos(a) * 125;
        var ty2 = -Math.sin(a) * 125;
        text += '<text x="' + tx1 + '" y="' + ty1 + '" font-family="Nunito, sans-serif" font-size="11" font-weight="900" fill="#1a1040" text-anchor="middle" dominant-baseline="middle" transform="rotate(' + (i - 90) + ' ' + tx1 + ' ' + ty1 + ')">' + i + '</text>';
        text += '<text x="' + tx2 + '" y="' + ty2 + '" font-family="Nunito, sans-serif" font-size="9" font-weight="900" fill="#1a1040" text-anchor="middle" dominant-baseline="middle" transform="rotate(' + (i - 90) + ' ' + tx2 + ' ' + ty2 + ')">' + (180 - i) + '</text>';
      }
      svg += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#1a1040" stroke-width="' + (is10 ? 2 : 1) + '"/>' + innerLine + text;
    }
    return svg + '</svg>';
  }

  function getBookFramePoint(evt) {
    var frame = getBookFrame();
    var rect = frame ? frame.getBoundingClientRect() : { left: 0, top: 0 };
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top,
    };
  }

  function updateProtractorTransform() {
    var protractor = getDocProtractor();
    if (!protractor) {
      return;
    }
    protractor.style.transform = 'translate(calc(' + state.protractor.x + 'px - 50%), calc(' + state.protractor.y + 'px - 100%)) rotate(' + state.protractor.rot + 'deg) scale(' + state.protractor.scale + ')';
  }

  function toggleDocProtractor() {
    var frame = getBookFrame();
    if (!frame) {
      return;
    }
    state.protractor.visible = !state.protractor.visible;
    if (state.protractor.visible && state.protractor.x === 0 && state.protractor.y === 0) {
      state.protractor.x = frame.clientWidth / 2;
      state.protractor.y = frame.clientHeight / 3;
    }
    updateProtractorTransform();
    syncToolbarUi();
  }

  function initDocProtractor() {
    var protractor = getDocProtractor();
    var svgContainer = qs('docProtractorSvg');
    var btnClose = qs('docProtractorClose');
    var btnRotate = qs('docProtractorRotate');
    var btnResize = qs('docProtractorResize');
    var btnToggle = qs('docProtractorBtn');
    if (!protractor || !svgContainer || !btnClose || !btnRotate || !btnResize || !btnToggle) {
      return;
    }

    svgContainer.innerHTML = buildProtractorSvgMarkup();

    var activeAction = null;
    var startMouse = { x: 0, y: 0 };
    var startState = { x: 0, y: 0, rot: 0, scale: 1 };

    function onPointerDown(event, action) {
      event.preventDefault();
      event.stopPropagation();
      activeAction = action;
      startMouse = { x: event.clientX, y: event.clientY };
      startState = {
        x: state.protractor.x,
        y: state.protractor.y,
        rot: state.protractor.rot,
        scale: state.protractor.scale,
      };
      document.addEventListener('pointermove', onPointerMove, { passive: false });
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
    }

    function onPointerMove(event) {
      if (!activeAction) {
        return;
      }
      event.preventDefault();
      var currentPoint = getBookFramePoint(event);
      var startPoint = getBookFramePoint({ clientX: startMouse.x, clientY: startMouse.y });
      var dx = currentPoint.x - startPoint.x;
      var dy = currentPoint.y - startPoint.y;

      if (activeAction === 'drag') {
        state.protractor.x = startState.x + dx;
        state.protractor.y = startState.y + dy;
      } else if (activeAction === 'rotate') {
        var cx = startState.x;
        var cy = startState.y;
        var angle1 = Math.atan2(startPoint.y - cy, startPoint.x - cx);
        var angle2 = Math.atan2(currentPoint.y - cy, currentPoint.x - cx);
        state.protractor.rot = startState.rot + ((angle2 - angle1) * 180 / Math.PI);
      } else if (activeAction === 'resize') {
        var centerX = startState.x;
        var centerY = startState.y;
        var d1 = Math.hypot(startPoint.x - centerX, startPoint.y - centerY) || 1;
        var d2 = Math.hypot(currentPoint.x - centerX, currentPoint.y - centerY);
        state.protractor.scale = Math.max(0.5, Math.min(3, startState.scale * (d2 / d1)));
      }
      updateProtractorTransform();
    }

    function onPointerUp() {
      activeAction = null;
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
    }

    svgContainer.addEventListener('pointerdown', function(event) { onPointerDown(event, 'drag'); });
    btnRotate.addEventListener('pointerdown', function(event) { onPointerDown(event, 'rotate'); });
    btnResize.addEventListener('pointerdown', function(event) { onPointerDown(event, 'resize'); });
    btnClose.addEventListener('click', function(event) {
      event.preventDefault();
      state.protractor.visible = false;
      syncToolbarUi();
    });
    btnToggle.addEventListener('click', function(event) {
      event.preventDefault();
      toggleDocProtractor();
    });
    updateProtractorTransform();
    syncToolbarUi();
  }

  function bindUi() {
    installNativeSelectionLocks();
    renderToolButtons();
    renderShortcutUi();
    initDocProtractor();
    syncZoomButtons();
    updateViewModeButtons();
    updateSizeLabel();
    qs('colorInput').value = state.color;
    syncToolbarUi();

    qs('colorInput').addEventListener('input', function(event) {
      state.color = event.target.value;
      applyToolToAllPages();
      syncToolbarUi();
    });

    qs('sizeInput').addEventListener('input', function(event) {
      setSize(event.target.value);
    });

    bindToolContainer(qs('docMainTools'));
    bindToolContainer(qs('docShapeTools'));
    qs('docShapeToggleBtn').addEventListener('click', toggleShapePanel);
    Array.from(document.querySelectorAll('[data-prep-tool]')).forEach(function(button) {
      button.addEventListener('click', function() {
        setTool(button.getAttribute('data-prep-tool'));
      });
    });
    if (qs('answersHiddenInput')) {
      qs('answersHiddenInput').checked = state.interactions.answersHidden !== false;
      qs('answersHiddenInput').addEventListener('change', function(event) {
        state.interactions.answersHidden = event.target.checked;
        markInteractionsDirty(event.target.checked
          ? 'Cevaplar öğrencide gizlenecek. Yayınlayınca soru işaretiyle açılacak.'
          : 'Cevaplar öğrencide açık görünecek. Yayınlayınca soru işareti eklenmeyecek.');
        renderAllHotspots();
      });
    }
    qs('docToolbarToggleBtn').addEventListener('click', function() {
      setToolbarCollapsed(!state.toolbarCollapsed);
    });
    qs('docColorGrid').addEventListener('click', function(event) {
      const button = event.target.closest('[data-doc-color]');
      if (!button) {
        return;
      }
      state.color = button.getAttribute('data-doc-color');
      qs('colorInput').value = state.color;
      applyToolToAllPages();
      syncToolbarUi();
    });

    qs('zoomInput').addEventListener('input', function(event) {
      setZoom((parseInt(event.target.value, 10) || 100) / 100, { keepCenter: true });
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
    if (qs('cropReturnBtn')) {
      qs('cropReturnBtn').addEventListener('click', exitCropView);
    }
    if (qs('cropPrevBtn')) {
      qs('cropPrevBtn').addEventListener('click', function() {
        focusMagnifierByOffset(-1);
      });
    }
    if (qs('cropNextBtn')) {
      qs('cropNextBtn').addEventListener('click', function() {
        focusMagnifierByOffset(1);
      });
    }
    Array.from(document.querySelectorAll('[data-edge-page]')).forEach(function(button) {
      button.addEventListener('click', function() {
        if (button.getAttribute('data-edge-page') === 'prev') {
          goToPage(state.currentPage - getPageStep());
        } else {
          goToPage(state.currentPage + getPageStep());
        }
      });
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
    if (qs('clearPageBtn')) {
      qs('clearPageBtn').addEventListener('click', clearCurrentPage);
    }
    qs('downloadBtn').addEventListener('click', downloadAnnotatedPdf);
    qs('printBtn').addEventListener('click', printAnnotatedPdf);
    if (qs('saveInteractionsBtn')) {
      qs('saveInteractionsBtn').addEventListener('click', savePublishedInteractions);
    }
    qs('shortcutHelpBtn').addEventListener('click', toggleShortcutModal);
    qs('shortcutCloseBtn').addEventListener('click', closeShortcutModal);
    qs('shortcutModal').addEventListener('click', function(event) {
      if (event.target === qs('shortcutModal')) {
        closeShortcutModal();
      }
    });
    qs('bookRoot').addEventListener('click', function(event) {
      const button = event.target.closest('[data-hotspot-id]');
      if (!button) {
        maybeTurnPageFromCornerClick(event);
        return;
      }
      const hotspot = findHotspot(button.getAttribute('data-hotspot-id'));
      if (!hotspot) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (state.editMode) {
        removeHotspot(hotspot);
        return;
      }
      if (hotspot.type === 'answer') {
        toggleAnswerHotspot(hotspot);
      } else {
        focusHotspotInline(hotspot);
      }
    });
    if (qs('cropHotspotLayer')) {
      qs('cropHotspotLayer').addEventListener('click', function(event) {
        const button = event.target.closest('[data-hotspot-id]');
        if (!button) {
          return;
        }
        const hotspot = findHotspot(button.getAttribute('data-hotspot-id'));
        if (!hotspot || hotspot.type !== 'answer') {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        toggleAnswerHotspot(hotspot);
      });
    }
    if (qs('magnifyCloseBtn')) {
      qs('magnifyCloseBtn').addEventListener('click', closeMagnifyModal);
    }
    if (qs('magnifyModal')) {
      qs('magnifyModal').addEventListener('click', function(event) {
        if (event.target === qs('magnifyModal')) {
          closeMagnifyModal();
        }
      });
    }

    const bookViewport = getBookViewport();
    const cropStage = getCropStage();
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

    if (cropStage) {
      cropStage.addEventListener('pointerdown', function(event) {
        if (!isCropViewActive() || state.tool !== 'pan' || state.crop.zoom <= 1) {
          return;
        }
        if (event.target.closest && event.target.closest('[data-hotspot-id]')) {
          return;
        }
        state.isPanning = true;
        state.panPointerId = event.pointerId;
        state.panStartX = event.clientX;
        state.panStartY = event.clientY;
        state.panOriginX = state.crop.panX;
        state.panOriginY = state.crop.panY;
        if (typeof cropStage.setPointerCapture === 'function') {
          cropStage.setPointerCapture(event.pointerId);
        }
        event.preventDefault();
        event.stopPropagation();
        syncZoomButtons();
      }, true);

      cropStage.addEventListener('pointermove', function(event) {
        if (!state.isPanning || event.pointerId !== state.panPointerId || !isCropViewActive()) {
          return;
        }
        state.crop.panX = state.panOriginX + (event.clientX - state.panStartX);
        state.crop.panY = state.panOriginY + (event.clientY - state.panStartY);
        updateCropTransform();
        event.preventDefault();
      }, true);
      cropStage.addEventListener('pointerup', finishPanning);
      cropStage.addEventListener('pointercancel', finishPanning);
      cropStage.addEventListener('lostpointercapture', finishPanning);
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
      if (key === 'Escape' && qs('magnifyModal') && qs('magnifyModal').classList.contains('open')) {
        closeMagnifyModal();
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
        if (!isTextEntry && !isFabricTextEditing() && !isShortcutModalOpen() && lower === 'c') {
          event.preventDefault();
          copyActiveObject();
          return;
        }
        if (!isTextEntry && !isFabricTextEditing() && !isShortcutModalOpen() && lower === 'v') {
          event.preventDefault();
          pasteClipboardObject();
          return;
        }
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
        if (isCropViewActive()) {
          focusMagnifierByOffset(-1);
        } else {
          goToPage(state.currentPage - getPageStep());
        }
        event.preventDefault();
        return;
      }
      if (key === 'ArrowRight') {
        if (isCropViewActive()) {
          focusMagnifierByOffset(1);
        } else {
          goToPage(state.currentPage + getPageStep());
        }
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
        setZoom((isCropViewActive() ? state.crop.zoom : state.zoom) + ZOOM_STEP, { keepCenter: true });
        return;
      }
      if (key === '-') {
        event.preventDefault();
        setZoom((isCropViewActive() ? state.crop.zoom : state.zoom) - ZOOM_STEP, { keepCenter: true });
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

    window.addEventListener('resize', function() {
      if (state.resizeTimer) {
        window.clearTimeout(state.resizeTimer);
      }
      state.resizeTimer = window.setTimeout(function() {
        state.resizeTimer = null;
        if (state.pageCount && !state.isFlipping && !state.isRebuilding) {
          buildBook(state.focusPage || state.currentPage).catch(function() {
            updateBookTransform();
          });
          return;
        }
        updateBookTransform();
      }, 140);
    });
    window.addEventListener('scroll', hideToolTooltip, true);

    let swipeStartX = 0;
    let swipeStartY = 0;
    let swipeActive = false;
    const bookFrame = getBookFrame();

    if (bookFrame) {
      bookFrame.addEventListener('touchstart', function(event) {
        if (state.tool === 'pan' || state.zoom > 1 || !['select', 'pan'].includes(state.tool)) {
          return;
        }
        const touch = event.changedTouches[0];
        const rect = bookFrame.getBoundingClientRect();
        const localY = touch.clientY - rect.top;
        const localX = touch.clientX - rect.left;
        const inTurnZone = localY <= 96 || localY >= rect.height - 96 || localX <= 80 || localX >= rect.width - 80;
        if (!inTurnZone) {
          return;
        }
        swipeStartX = touch.clientX;
        swipeStartY = touch.clientY;
        swipeActive = true;
      }, { passive: true });

      bookFrame.addEventListener('touchend', function(event) {
        if (!swipeActive) {
          return;
        }
        swipeActive = false;
        const touch = event.changedTouches[0];
        const dx = touch.clientX - swipeStartX;
        const dy = touch.clientY - swipeStartY;
        if (Math.abs(dx) > 52 && Math.abs(dx) > Math.abs(dy) * 1.6) {
          if (dx < 0) {
            goToPage(state.currentPage + getPageStep());
          } else {
            goToPage(state.currentPage - getPageStep());
          }
        }
      }, { passive: true });
    }
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
    state.interactions = normalizeInteractions(documentRow.etkilesim_json || {});
    if (qs('answersHiddenInput')) {
      qs('answersHiddenInput').checked = state.interactions.answersHidden !== false;
    }
    qs('viewerPill').textContent = '📚 ' + documentRow.sinifLabel + ' · ' + documentRow.dersLabel;
    qs('viewerTitle').textContent = documentRow.baslik;
    qs('viewerDesc').textContent = documentRow.aciklama || (documentRow.sinifLabel + ' için yüklenmiş ders dokümanı.');
    qs('backSubjectLink').href = '/ders.html?sinif=' + encodeURIComponent(documentRow.sinif) + '&ders=' + encodeURIComponent(documentRow.ders);
    qs('backSubjectLink').textContent = '← ' + documentRow.dersLabel + ' dersine dön';
    document.title = documentRow.baslik + ' | Kemal Öğretmenim';
    if (window.kemalSeo) {
      window.kemalSeo.update({
        title: document.title,
        description: documentRow.aciklama || (documentRow.sinifLabel + ' için yüklenmiş ders dokümanı.'),
      });
    }

    if (window.kemalCalismaKagidiStore && qs('worksheetBtn')) {
      try {
        const hasWorksheet = await window.kemalCalismaKagidiStore.hasPublishedWorksheet(state.documentId);
        if (hasWorksheet) {
          qs('worksheetBtn').href = '/calisma-kagidi.html?id=' + encodeURIComponent(state.documentId);
          qs('worksheetBtn').style.display = 'inline-flex';
        }
      } catch (error) {
        qs('worksheetBtn').style.display = 'none';
      }
    }
  }

  function markDocumentAsRead() {
    if (!window.kemalContentProgress || !state.documentId || !state.documentRow) {
      return;
    }

    window.kemalContentProgress.markRead({
      type: 'document',
      id: state.documentId,
      title: state.documentRow.baslik || 'Dokuman',
      href: '/dokuman.html?id=' + encodeURIComponent(state.documentId),
      grade: state.documentRow.sinif || '',
      subject: state.documentRow.ders || '',
      meta: {
        pageCount: state.pageCount || state.documentRow.sayfa_sayisi || 0,
      },
    });
  }

  async function init() {
    const params = new URLSearchParams(window.location.search);
    state.editMode = params.get('edit') === '1';
    document.body.classList.toggle('is-interaction-edit', state.editMode);
    state.viewMode = loadViewModePreference();
    bindUi();
    updateSizeLabel();
    syncZoomButtons();
    syncPageControls();
    await loadDocument();
    await buildBook();
    markDocumentAsRead();
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
