/**
 * PosterMatik — Interactive Multi-Page Poster Printer Application
 */
(function () {
  'use strict';

  const Geo = window.PosterGeometry;
  const Pdf = window.PosterPdf;
  const studio = document.getElementById('main-content');

  // ==================== APPLICATION STATE ====================
  const state = {
    rawImage: null,
    fileName: '',
    processedCanvas: null, // Oriented + color-filtered full-res source canvas
    rotation: 0,           // 0 | 90 | 180 | 270
    flipH: false,
    flipV: false,
    colorMode: 'original', // 'original' | 'grayscale' | 'highcontrast'

    // Layout configuration
    sizingMode: 'grid',    // 'grid' | 'dimensions'
    cols: 2,
    rows: 2,
    lockAspectGrid: false,
    aspectDriver: 'cols',  // 'cols' | 'rows'
    fitMode: 'contain',    // 'contain' | 'cover' | 'stretch'
    targetWidthCm: 60,
    targetHeightCm: 40,
    lockAspectDim: true,
    alignX: 0.5,
    alignY: 0.5,
    panX: 0,               // -1 .. 1 (used in cover mode)
    panY: 0,

    // Paper & printer
    paperSize: 'a4',
    customPaperW: 210,
    customPaperH: 297,
    orientation: 'auto',   // 'auto' | 'portrait' | 'landscape'
    marginMm: 10,

    // Print aids
    overlapMm: 10,
    cutMarks: true,
    overlapGuides: true,
    pageLabels: true,
    includeAssemblyMap: true,
    skipBlank: true,
    outputDpi: 220,

    excludedTiles: new Set(),

    // Preview stage UI
    viewMode: 'assembled', // 'assembled' | 'exploded'
    showOverlapVis: true,
    showGuidesVis: true,
    zoom: 1,
    hoveredTileId: null,
    tileHitRects: [],      // [{ tile, x, y, w, h }] in CSS pixels relative to canvas

    // Computed layout cache
    layout: null,

    // Modal state
    modalMode: null,       // 'tile' | 'map' | null
    modalTileIndex: 0
  };

  // ==================== DOM REFERENCES ====================
  const $ = (id) => document.getElementById(id);

  const els = {
    fileInput: $('fileInput'),
    dropzone: $('dropzone'),
    dragOverlay: $('dragOverlay'),
    stagePanel: $('stagePanel'),
    previewWorkspace: $('previewWorkspace'),
    stageViewport: $('stageViewport'),
    previewCanvas: $('previewCanvas'),
    hoverTooltip: $('hoverTooltip'),

    headerMetrics: $('headerMetrics'),
    metricPages: $('metricPages'),
    metricSize: $('metricSize'),
    metricDpiPill: $('metricDpiPill'),
    metricDpi: $('metricDpi'),

    btnPreviewMap: $('btnPreviewMap'),
    btnPrintDirect: $('btnPrintDirect'),
    btnDownloadPdf: $('btnDownloadPdf'),
    btnHeroUpload: $('btnHeroUpload'),
    btnSideUpload: $('btnSideUpload'),
    btnChangeImage: $('btnChangeImage'),
    btnLoadSample: $('btnLoadSample'),

    imageEmptyMini: $('imageEmptyMini'),
    imageInfoBox: $('imageInfoBox'),
    thumbCanvas: $('thumbCanvas'),
    imgFileName: $('imgFileName'),
    imgDimensions: $('imgDimensions'),

    btnRotateLeft: $('btnRotateLeft'),
    btnRotateRight: $('btnRotateRight'),
    btnFlipH: $('btnFlipH'),
    btnFlipV: $('btnFlipV'),
    colorModeSeg: $('colorModeSeg'),

    sizingModeSeg: $('sizingModeSeg'),
    panelGridMode: $('panelGridMode'),
    panelDimMode: $('panelDimMode'),
    gridPresets: $('gridPresets'),
    inputCols: $('inputCols'),
    inputRows: $('inputRows'),
    chkLockAspectGrid: $('chkLockAspectGrid'),
    fitModeSeg: $('fitModeSeg'),
    coverPanHint: $('coverPanHint'),

    dimPresets: $('dimPresets'),
    inputTargetW: $('inputTargetW'),
    inputTargetH: $('inputTargetH'),
    chkLockAspectDim: $('chkLockAspectDim'),
    dimSheetSummary: $('dimSheetSummary'),

    alignPad: $('alignPad'),
    alignLabelText: $('alignLabelText'),
    btnResetPan: $('btnResetPan'),

    selectPaper: $('selectPaper'),
    customPaperBox: $('customPaperBox'),
    inputCustomW: $('inputCustomW'),
    inputCustomH: $('inputCustomH'),
    orientationSeg: $('orientationSeg'),
    btnOrientAuto: $('btnOrientAuto'),

    rangeMargin: $('rangeMargin'),
    valMargin: $('valMargin'),
    marginPresets: $('marginPresets'),

    rangeOverlap: $('rangeOverlap'),
    valOverlap: $('valOverlap'),
    overlapPresets: $('overlapPresets'),

    chkCutMarks: $('chkCutMarks'),
    chkOverlapGuides: $('chkOverlapGuides'),
    chkPageLabels: $('chkPageLabels'),
    chkAssemblyMap: $('chkAssemblyMap'),
    chkSkipBlank: $('chkSkipBlank'),
    qualitySeg: $('qualitySeg'),

    cardDpi: $('cardDpi'),
    dpiValueBadge: $('dpiValueBadge'),
    dpiBarFill: $('dpiBarFill'),
    dpiDescText: $('dpiDescText'),

    viewModeSeg: $('viewModeSeg'),
    btnToggleOverlapVis: $('btnToggleOverlapVis'),
    btnToggleGuidesVis: $('btnToggleGuidesVis'),
    btnZoomOut: $('btnZoomOut'),
    btnZoomIn: $('btnZoomIn'),
    btnZoomFit: $('btnZoomFit'),
    zoomLabel: $('zoomLabel'),
    stageHint: $('stageHint'),
    btnRestoreExcluded: $('btnRestoreExcluded'),

    sheetModal: $('sheetModal'),
    modalTitle: $('modalTitle'),
    modalSub: $('modalSub'),
    modalCanvas: $('modalCanvas'),
    modalIncludeWrap: $('modalIncludeWrap'),
    chkModalInclude: $('chkModalInclude'),
    btnModalPrev: $('btnModalPrev'),
    btnModalNext: $('btnModalNext'),
    btnModalClose: $('btnModalClose'),
    btnModalOk: $('btnModalOk'),
    btnModalDownloadPng: $('btnModalDownloadPng'),

    exportModal: $('exportModal'),
    exportTitle: $('exportTitle'),
    exportStep: $('exportStep'),
    exportProgressBar: $('exportProgressBar'),

    toast: $('toast'),
    printContainer: $('printContainer'),
    dynamicPrintStyle: $('dynamicPrintStyle')
  };

  // ==================== TOAST HELPER ====================
  let toastTimer = null;
  function showToast(message, duration = 3400) {
    els.toast.textContent = message;
    els.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.classList.add('hidden');
    }, duration);
  }

  // ==================== IMAGE LOADING & PROCESSING ====================
  function loadImageFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|gif|avif|bmp|svg)$/i.test(file.name)) {
      showToast('Lütfen geçerli bir görsel dosyası seçin (JPG, PNG, WebP, GIF, SVG).');
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      onImageLoaded(img, file.name || 'gorsel.png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      showToast('Görsel yüklenemedi. Dosya bozuk veya desteklenmeyen bir formatta olabilir.');
    };
    img.src = url;
  }

  function onImageLoaded(img, fileName) {
    state.rawImage = img;
    state.fileName = fileName;
    state.rotation = 0;
    state.flipH = false;
    state.flipV = false;
    state.panX = 0;
    state.panY = 0;
    state.zoom = 1;
    state.excludedTiles.clear();

    rebuildProcessedSource();

    // Sync default physical cm height to image aspect ratio
    const aspect = state.processedCanvas.width / state.processedCanvas.height;
    state.targetWidthCm = 60;
    state.targetHeightCm = Math.max(10, Math.round(state.targetWidthCm / aspect));
    els.inputTargetW.value = state.targetWidthCm;
    els.inputTargetH.value = state.targetHeightCm;

    // Reveal active workspace
    els.dropzone.classList.add('hidden');
    els.previewWorkspace.classList.remove('hidden');
    els.imageEmptyMini.classList.add('hidden');
    els.imageInfoBox.classList.remove('hidden');
    els.btnChangeImage.classList.remove('hidden');
    els.headerMetrics.classList.remove('hidden');
    els.btnPreviewMap.classList.remove('hidden');
    els.cardDpi.classList.remove('hidden');
    els.btnDownloadPdf.disabled = false;
    els.btnPrintDirect.disabled = false;

    recomputeAndRender();
    showToast(`"${fileName}" yüklendi (${state.processedCanvas.width} × ${state.processedCanvas.height} px)`);
  }

  /**
   * Builds oriented + color-filtered offscreen source canvas from rawImage.
   */
  function rebuildProcessedSource() {
    if (!state.rawImage) return;
    const img = state.rawImage;
    const natW = img.naturalWidth || img.width;
    const natH = img.naturalHeight || img.height;

    const swapped = (state.rotation === 90 || state.rotation === 270);
    let outW = swapped ? natH : natW;
    let outH = swapped ? natW : natH;

    // Safety cap for extreme megapixels (e.g. > 8000px) so browser canvas never hits hardware limit
    const maxDim = 6400;
    const ratio = Math.min(1, maxDim / outW, maxDim / outH, Math.sqrt(12000000 / (outW * outH)));
    outW = Math.max(1, Math.floor(outW * ratio));
    outH = Math.max(1, Math.floor(outH * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d', { willReadFrequently: state.colorMode !== 'original' });

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, outW, outH);

    ctx.save();
    ctx.translate(outW / 2, outH / 2);
    ctx.rotate((state.rotation * Math.PI) / 180);
    ctx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);
    const drawW = swapped ? outH : outW;
    const drawH = swapped ? outW : outH;
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Deterministic cross-browser color filters (works identically on Safari/Chrome/Firefox)
    if (state.colorMode === 'grayscale' || state.colorMode === 'highcontrast') {
      const imgData = ctx.getImageData(0, 0, outW, outH);
      const d = imgData.data;
      if (state.colorMode === 'grayscale') {
        for (let i = 0; i < d.length; i += 4) {
          const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0;
          d[i] = d[i + 1] = d[i + 2] = lum;
        }
      } else {
        // High contrast punchy boost
        const factor = 1.42;
        for (let i = 0; i < d.length; i += 4) {
          d[i]     = Geo.clamp(((d[i]     - 128) * factor + 128), 0, 255);
          d[i + 1] = Geo.clamp(((d[i + 1] - 128) * factor + 128), 0, 255);
          d[i + 2] = Geo.clamp(((d[i + 2] - 128) * factor + 128), 0, 255);
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }

    state.processedCanvas = canvas;
    updateImageInfoUI();
  }

  function gcd(a, b) {
    a = Math.abs(Math.round(a));
    b = Math.abs(Math.round(b));
    while (b) { const t = b; b = a % b; a = t; }
    return a || 1;
  }

  function updateImageInfoUI() {
    if (!state.processedCanvas) return;
    const w = state.processedCanvas.width;
    const h = state.processedCanvas.height;
    const g = gcd(w, h);
    let rw = Math.round(w / g);
    let rh = Math.round(h / g);
    const ratioStr = (rw <= 25 && rh <= 25) ? `${rw}:${rh}` : `${(w / h).toFixed(2)}:1`;

    els.imgFileName.textContent = state.fileName;
    els.imgFileName.title = state.fileName;
    els.imgDimensions.textContent = `${w} × ${h} px  •  ${ratioStr}`;

    // Render thumbnail
    const tc = els.thumbCanvas;
    const tctx = tc.getContext('2d');
    tctx.fillStyle = '#F1F5F9';
    tctx.fillRect(0, 0, tc.width, tc.height);
    const s = Math.max(tc.width / w, tc.height / h);
    const dw = w * s;
    const dh = h * s;
    tctx.drawImage(state.processedCanvas, (tc.width - dw) / 2, (tc.height - dh) / 2, dw, dh);

    els.btnFlipH.classList.toggle('active', state.flipH);
    els.btnFlipV.classList.toggle('active', state.flipV);
  }

  /**
   * Generates a crisp 2400x1800 sample poster artwork so users can test immediately.
   */
  function generateSamplePoster() {
    const W = 2400;
    const H = 1800;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');

    // Warm sunset sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.72);
    sky.addColorStop(0, '#0F172A');
    sky.addColorStop(0.32, '#1E3A5F');
    sky.addColorStop(0.68, '#E07A5F');
    sky.addColorStop(1, '#F2CC8F');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Subtle stars in upper sky
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    for (let i = 0; i < 90; i++) {
      const sx = ((i * 7919) % W);
      const sy = ((i * 3571) % Math.round(H * 0.34));
      const sr = (i % 3) + 1.2;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glowing Sun Disk
    const sunX = W * 0.52;
    const sunY = H * 0.44;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 90, sunX, sunY, 440);
    sunGlow.addColorStop(0, 'rgba(255, 241, 184, 0.95)');
    sunGlow.addColorStop(0.45, 'rgba(244, 162, 97, 0.35)');
    sunGlow.addColorStop(1, 'rgba(244, 162, 97, 0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 440, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFF3C4';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 175, 0, Math.PI * 2);
    ctx.fill();

    // Layered Mountain Silhouettes
    const drawMountain = (points, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (const [px, py] of points) {
        ctx.lineTo(px * W, py * H);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    };

    drawMountain([
      [0, 0.60], [0.14, 0.45], [0.28, 0.56], [0.46, 0.38], [0.64, 0.53], [0.82, 0.40], [1, 0.55]
    ], '#3D405B');

    drawMountain([
      [0, 0.68], [0.18, 0.52], [0.35, 0.64], [0.55, 0.48], [0.74, 0.61], [0.91, 0.49], [1, 0.62]
    ], '#26324A');

    drawMountain([
      [0, 0.77], [0.12, 0.65], [0.30, 0.74], [0.48, 0.61], [0.68, 0.73], [0.85, 0.64], [1, 0.75]
    ], '#162033');

    // Lake reflection band
    const lake = ctx.createLinearGradient(0, H * 0.74, 0, H);
    lake.addColorStop(0, '#1E293B');
    lake.addColorStop(0.5, '#0F172A');
    lake.addColorStop(1, '#090E1A');
    ctx.fillStyle = lake;
    ctx.fillRect(0, H * 0.75, W, H * 0.25);

    // Sun shimmer on water
    ctx.fillStyle = 'rgba(255, 232, 163, 0.35)';
    for (let i = 0; i < 16; i++) {
      const rw = 260 - i * 11;
      const ry = H * 0.77 + i * 22;
      ctx.fillRect(sunX - rw / 2 + Math.sin(i) * 14, ry, rw, 7);
    }

    // Pine silhouettes on left & right foreground
    const drawPine = (x, baseY, h, col) => {
      ctx.fillStyle = col;
      for (let t = 0; t < 4; t++) {
        const tw = h * (0.34 - t * 0.06);
        const ty = baseY - h * (0.28 + t * 0.20);
        ctx.beginPath();
        ctx.moveTo(x, ty - h * 0.24);
        ctx.lineTo(x - tw, ty + h * 0.12);
        ctx.lineTo(x + tw, ty + h * 0.12);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillRect(x - h * 0.04, baseY - h * 0.22, h * 0.08, h * 0.22);
    };
    drawPine(210, H * 0.88, 340, '#0B1220');
    drawPine(350, H * 0.90, 260, '#0F172A');
    drawPine(2180, H * 0.89, 360, '#0B1220');
    drawPine(2010, H * 0.91, 250, '#0F172A');

    // Editorial Poster Inner Frame & Typography
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 6;
    ctx.strokeRect(72, 72, W - 144, H - 144);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 108px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ANADOLU ZİRVELERİ', W / 2, H * 0.17);

    ctx.fillStyle = '#FDE68A';
    ctx.font = '600 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('ÖRNEK ÇOKLU A4 POSTER  •  2400 × 1800 PX', W / 2, H * 0.24);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.font = '600 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('POSTERMATİK BASKI TESTİ', W / 2, H * 0.92);

    const img = new Image();
    img.onload = () => onImageLoaded(img, 'ornek-anadolu-posteri.png');
    img.src = c.toDataURL('image/png');
  }

  // ==================== LAYOUT RECOMPUTATION & UI SYNC ====================
  function getLayoutConfig() {
    const imgW = state.processedCanvas ? state.processedCanvas.width : 2400;
    const imgH = state.processedCanvas ? state.processedCanvas.height : 1800;

    return {
      imgW,
      imgH,
      sizingMode: state.sizingMode,
      cols: state.cols,
      rows: state.rows,
      lockAspect: state.sizingMode === 'grid' ? state.lockAspectGrid : state.lockAspectDim,
      aspectDriver: state.aspectDriver,
      fitMode: state.fitMode,
      targetWidthCm: state.targetWidthCm,
      targetHeightCm: state.targetHeightCm,
      alignX: state.alignX,
      alignY: state.alignY,
      panX: state.panX,
      panY: state.panY,
      paperSize: state.paperSize,
      customPaperW: state.customPaperW,
      customPaperH: state.customPaperH,
      orientation: state.orientation,
      marginMm: state.marginMm,
      overlapMm: state.overlapMm,
      skipBlank: state.skipBlank,
      excludedTiles: state.excludedTiles
    };
  }

  function recomputeAndRender() {
    const layout = Geo.computeLayout(getLayoutConfig());
    state.layout = layout;

    // Keep grid inputs synced if lockAspectGrid auto-adjusted rows/cols
    if (state.sizingMode === 'grid' && state.lockAspectGrid) {
      state.cols = layout.cols;
      state.rows = layout.rows;
      els.inputCols.value = layout.cols;
      els.inputRows.value = layout.rows;
    }

    syncMetricsUI(layout);
    renderPreview();

    if (state.modalMode) {
      renderModalContent();
    }
  }

  function syncMetricsUI(layout) {
    const paperMeta = Geo.PAPER_SIZES[layout.paperSize] || { name: 'Özel' };
    const orientTr = layout.orientation === 'landscape' ? 'Yatay' : 'Dikey';

    // Update Auto orientation button hint
    els.btnOrientAuto.textContent = state.orientation === 'auto'
      ? `Oto (${orientTr})`
      : 'Otomatik';

    // Header metric pills
    const skippedNote = layout.includedCount < layout.totalTiles
      ? ` (${layout.totalTiles - layout.includedCount} atlandı)`
      : '';
    els.metricPages.textContent = `${layout.includedCount} ${paperMeta.name} (${layout.cols}×${layout.rows})${skippedNote}`;
    els.metricSize.textContent = `${layout.posterWidthCm} × ${layout.posterHeightCm} cm`;

    const q = layout.dpiQuality;
    els.metricDpi.textContent = `${layout.effectiveDpi} DPI · ${q.label}`;
    els.metricDpiPill.className = `metric-pill dpi-${q.level}`;

    // Sidebar DPI card
    els.cardDpi.className = `card dpi-card level-${q.level}`;
    if (!state.processedCanvas) els.cardDpi.classList.add('hidden');
    els.dpiValueBadge.textContent = `${layout.effectiveDpi} DPI (${q.label})`;
    const pct = Geo.clamp((layout.effectiveDpi / 220) * 100, 10, 100);
    els.dpiBarFill.style.width = `${pct}%`;
    els.dpiDescText.textContent = q.desc;

    // Dimensions mode callout
    els.dimSheetSummary.innerHTML =
      `Gereken kağıt: <strong>${layout.cols} × ${layout.rows} = ${layout.includedCount} ${paperMeta.name} (${orientTr})</strong>` +
      (layout.blankCount > 0 && state.skipBlank ? ` · ${layout.blankCount} boş sayfa atlanır` : '');

    // Highlight matching grid preset chip
    els.gridPresets.querySelectorAll('.chip').forEach(btn => {
      const match = Number(btn.dataset.cols) === layout.cols && Number(btn.dataset.rows) === layout.rows;
      btn.classList.toggle('active', match);
    });

    // Cover pan hint & reset button
    const isCover = state.sizingMode === 'grid' && state.fitMode === 'cover';
    els.coverPanHint.classList.toggle('hidden', !isCover);
    els.btnResetPan.classList.toggle('hidden', !(isCover && (Math.abs(state.panX) > 0.005 || Math.abs(state.panY) > 0.005)));
    els.previewCanvas.classList.toggle('pan-cursor', isCover && state.viewMode === 'assembled');

    // Restore excluded pages button
    els.btnRestoreExcluded.classList.toggle('hidden', state.excludedTiles.size === 0);

    // Disable export if 0 pages included
    const canExport = Boolean(state.processedCanvas) && layout.includedCount > 0;
    els.btnDownloadPdf.disabled = !canExport;
    els.btnPrintDirect.disabled = !canExport;

    // Zoom label
    els.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
  }

  // ==================== INTERACTIVE PREVIEW CANVAS RENDERER ====================
  function renderPreview() {
    if (!state.processedCanvas || !state.layout) return;

    const canvas = els.previewCanvas;
    const viewport = els.stageViewport;
    const rect = viewport.getBoundingClientRect();
    const cssW = Math.max(300, Math.floor(rect.width));
    const cssH = Math.max(260, Math.floor(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }

    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssW, cssH);

    state.tileHitRects = [];

    if (state.viewMode === 'exploded') {
      renderExplodedView(ctx, cssW, cssH, state.layout);
    } else {
      renderAssembledView(ctx, cssW, cssH, state.layout);
    }

    ctx.restore();
  }

  function renderAssembledView(ctx, cssW, cssH, layout) {
    const padX = 56;
    const padY = 52;
    const availW = Math.max(100, cssW - padX * 2);
    const availH = Math.max(100, cssH - padY * 2);

    const baseScale = Math.min(availW / layout.totalW, availH / layout.totalH);
    const scale = baseScale * state.zoom; // css px per mm

    const posterW = layout.totalW * scale;
    const posterH = layout.totalH * scale;
    const ox = (cssW - posterW) / 2;
    const oy = (cssH - posterH) / 2;

    // Poster sheet drop shadow & white board
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.16)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(ox, oy, posterW, posterH);
    ctx.restore();

    // Draw clipped poster image
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, oy, posterW, posterH);
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      state.processedCanvas,
      ox + layout.placedX * scale,
      oy + layout.placedY * scale,
      layout.placedW * scale,
      layout.placedH * scale
    );
    ctx.restore();

    // Draw overlap strips between adjacent sheets
    if (state.showOverlapVis && layout.overlap > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
      // Vertical overlap bands
      for (let c = 0; c < layout.cols - 1; c++) {
        const bx = ox + ((c + 1) * layout.stepX) * scale;
        ctx.fillRect(bx, oy, layout.overlap * scale, posterH);
      }
      // Horizontal overlap bands
      for (let r = 0; r < layout.rows - 1; r++) {
        const by = oy + ((r + 1) * layout.stepY) * scale;
        ctx.fillRect(ox, by, posterW, layout.overlap * scale);
      }
      ctx.restore();
    }

    // Draw tile grid, excluded masks, hover highlight, and page badges
    for (const tile of layout.tiles) {
      const tx = ox + tile.tileX0 * scale;
      const ty = oy + tile.tileY0 * scale;
      const tw = layout.printW * scale;
      const th = layout.printH * scale;

      // For hit testing in assembled view, use non-overlapping center cells so clicks feel crisp
      const hitX = ox + (tile.col === 0 ? 0 : tile.col * layout.stepX + layout.overlap / 2) * scale;
      const hitY = oy + (tile.row === 0 ? 0 : tile.row * layout.stepY + layout.overlap / 2) * scale;
      const hitX2 = ox + (tile.col === layout.cols - 1 ? layout.totalW : (tile.col + 1) * layout.stepX + layout.overlap / 2) * scale;
      const hitY2 = oy + (tile.row === layout.rows - 1 ? layout.totalH : (tile.row + 1) * layout.stepY + layout.overlap / 2) * scale;
      state.tileHitRects.push({ tile, x: hitX, y: hitY, w: hitX2 - hitX, h: hitY2 - hitY });

      // Excluded or blank tile dimming
      if (!tile.included) {
        ctx.save();
        ctx.fillStyle = 'rgba(241, 245, 249, 0.80)';
        ctx.fillRect(tx, ty, tw, th);
        // Subtle diagonal slash
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(tx + 6, ty + 6);
        ctx.lineTo(tx + tw - 6, ty + th - 6);
        ctx.moveTo(tx + tw - 6, ty + 6);
        ctx.lineTo(tx + 6, ty + th - 6);
        ctx.stroke();
        ctx.restore();
      }

      // Tile border
      if (state.showGuidesVis) {
        ctx.save();
        ctx.strokeStyle = tile.included ? 'rgba(37, 99, 235, 0.72)' : 'rgba(148, 163, 184, 0.8)';
        ctx.lineWidth = tile.id === state.hoveredTileId ? 2.4 : 1.15;
        if (!tile.included) ctx.setLineDash([4, 4]);
        ctx.strokeRect(tx, ty, tw, th);
        ctx.restore();
      }

      // Hover highlight
      if (tile.id === state.hoveredTileId) {
        ctx.save();
        ctx.fillStyle = 'rgba(37, 99, 235, 0.12)';
        ctx.fillRect(tx, ty, tw, th);
        ctx.strokeStyle = '#1D4ED8';
        ctx.lineWidth = 2.4;
        ctx.strokeRect(tx + 1, ty + 1, tw - 2, th - 2);
        ctx.restore();
      }

      // Page Number Badge
      if (state.showGuidesVis && Math.min(tw, th) >= 28) {
        const cx = tx + tw / 2;
        const cy = ty + th / 2;
        const minSide = Math.min(tw, th);
        const radius = Geo.clamp(minSide * 0.16, 11, 20);

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = tile.included
          ? (tile.id === state.hoveredTileId ? '#1D4ED8' : 'rgba(15, 23, 42, 0.78)')
          : 'rgba(100, 116, 139, 0.85)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `700 ${Math.round(radius * 0.92)}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tile.included ? String(tile.pageNumber) : '✕', cx, cy + 0.5);

        if (minSide >= 76) {
          const tag = tile.included ? tile.coordLabel : (tile.isBlank ? 'Boş' : 'Hariç');
          ctx.font = '600 10.5px -apple-system, BlinkMacSystemFont, sans-serif';
          const textW = ctx.measureText(tag).width + 12;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
          roundRect(ctx, cx - textW / 2, cy + radius + 4, textW, 18, 9);
          ctx.fill();
          ctx.fillStyle = '#1E293B';
          ctx.fillText(tag, cx, cy + radius + 13.5);
        }
        ctx.restore();
      }
    }

    // Outer frame border
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox, oy, posterW, posterH);

    // Physical dimension rulers (top width & left height)
    drawDimensionRuler(ctx, ox, oy - 16, ox + posterW, oy - 16, `${layout.gridWidthCm} cm`, false);
    drawDimensionRuler(ctx, ox - 16, oy, ox - 16, oy + posterH, `${layout.gridHeightCm} cm`, true);
  }

  function renderExplodedView(ctx, cssW, cssH, layout) {
    const pad = 34;
    const gapMm = Math.max(14, Math.min(layout.paperW, layout.paperH) * 0.08);
    const totalExplodedW = layout.cols * layout.paperW + (layout.cols - 1) * gapMm;
    const totalExplodedH = layout.rows * layout.paperH + (layout.rows - 1) * gapMm;

    const availW = Math.max(100, cssW - pad * 2);
    const availH = Math.max(100, cssH - pad * 2);
    const scale = Math.min(availW / totalExplodedW, availH / totalExplodedH) * state.zoom;

    const gridW = totalExplodedW * scale;
    const gridH = totalExplodedH * scale;
    const ox = (cssW - gridW) / 2;
    const oy = (cssH - gridH) / 2;

    for (const tile of layout.tiles) {
      const sx = ox + tile.col * (layout.paperW + gapMm) * scale;
      const sy = oy + tile.row * (layout.paperH + gapMm) * scale;
      const sw = layout.paperW * scale;
      const sh = layout.paperH * scale;

      state.tileHitRects.push({ tile, x: sx, y: sy, w: sw, h: sh });

      const hovered = tile.id === state.hoveredTileId;

      // Sheet shadow & paper body
      ctx.save();
      ctx.shadowColor = hovered ? 'rgba(37, 99, 235, 0.28)' : 'rgba(15, 23, 42, 0.14)';
      ctx.shadowBlur = hovered ? 18 : 10;
      ctx.shadowOffsetY = hovered ? 5 : 3;
      ctx.fillStyle = tile.included ? '#FFFFFF' : '#F1F5F9';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.restore();

      // Draw image slice inside paper margins
      if (tile.imageRect) {
        const r = tile.imageRect;
        ctx.save();
        if (!tile.included) ctx.globalAlpha = 0.28;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(
          state.processedCanvas,
          r.srcX, r.srcY, r.srcW, r.srcH,
          sx + r.destX_mm * scale,
          sy + r.destY_mm * scale,
          r.destW_mm * scale,
          r.destH_mm * scale
        );
        ctx.restore();
      }

      const mx = sx + layout.margin * scale;
      const my = sy + layout.margin * scale;
      const pw = layout.printW * scale;
      const ph = layout.printH * scale;

      // Overlap strip highlight on each individual sheet
      if (state.showOverlapVis && layout.overlap > 0 && tile.included) {
        ctx.save();
        ctx.fillStyle = 'rgba(245, 158, 11, 0.24)';
        const ov = layout.overlap * scale;
        if (tile.hasOverlapRight) ctx.fillRect(mx + pw - ov, my, ov, ph);
        if (tile.hasOverlapBottom) ctx.fillRect(mx, my + ph - ov, pw, ov);
        ctx.restore();
      }

      // Printable margin box & cut ticks
      if (state.showGuidesVis) {
        ctx.save();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(mx, my, pw, ph);
        ctx.restore();

        // Corner cut ticks if sheet large enough
        if (state.cutMarks && layout.margin >= 3 && sw >= 55) {
          const tick = Math.min(layout.margin * 0.65, 5) * scale;
          ctx.save();
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          // TL
          ctx.moveTo(mx - tick, my); ctx.lineTo(mx - 1, my);
          ctx.moveTo(mx, my - tick); ctx.lineTo(mx, my - 1);
          // TR
          ctx.moveTo(mx + pw + 1, my); ctx.lineTo(mx + pw + tick, my);
          ctx.moveTo(mx + pw, my - tick); ctx.lineTo(mx + pw, my - 1);
          // BL
          ctx.moveTo(mx - tick, my + ph); ctx.lineTo(mx - 1, my + ph);
          ctx.moveTo(mx, my + ph + 1); ctx.lineTo(mx, my + ph + tick);
          // BR
          ctx.moveTo(mx + pw + 1, my + ph); ctx.lineTo(mx + pw + tick, my + ph);
          ctx.moveTo(mx + pw, my + ph + 1); ctx.lineTo(mx + pw, my + ph + tick);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Sheet outline
      ctx.strokeStyle = hovered ? '#2563EB' : (tile.included ? '#CBD5E1' : '#94A3B8');
      ctx.lineWidth = hovered ? 2.2 : 1;
      ctx.strokeRect(sx, sy, sw, sh);

      // Small corner page badge
      if (state.showGuidesVis && sw >= 38) {
        const badgeText = tile.included ? `${tile.pageNumber}` : '✕';
        ctx.save();
        ctx.fillStyle = tile.included ? (hovered ? '#1D4ED8' : '#0F172A') : '#94A3B8';
        roundRect(ctx, sx + 5, sy + 5, 22, 18, 5);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 11px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, sx + 16, sy + 14.5);
        ctx.restore();
      }
    }
  }

  function drawDimensionRuler(ctx, x1, y1, x2, y2, label, vertical) {
    ctx.save();
    ctx.strokeStyle = '#64748B';
    ctx.fillStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    if (vertical) {
      ctx.moveTo(x1 - 4, y1); ctx.lineTo(x1 + 4, y1);
      ctx.moveTo(x2 - 4, y2); ctx.lineTo(x2 + 4, y2);
    } else {
      ctx.moveTo(x1, y1 - 4); ctx.lineTo(x1, y1 + 4);
      ctx.moveTo(x2, y2 - 4); ctx.lineTo(x2, y2 + 4);
    }
    ctx.stroke();

    ctx.font = '700 11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const tw = ctx.measureText(label).width + 12;

    if (vertical) {
      ctx.translate(mx, my);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#ECEAE3';
      ctx.fillRect(-tw / 2, -8, tw, 16);
      ctx.fillStyle = '#334155';
      ctx.fillText(label, 0, 0.5);
    } else {
      ctx.fillStyle = '#ECEAE3';
      ctx.fillRect(mx - tw / 2, my - 8, tw, 16);
      ctx.fillStyle = '#334155';
      ctx.fillText(label, mx, my + 0.5);
    }
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function hitTestTile(clientX, clientY) {
    const rect = els.previewCanvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    for (let i = state.tileHitRects.length - 1; i >= 0; i--) {
      const hr = state.tileHitRects[i];
      if (x >= hr.x && x <= hr.x + hr.w && y >= hr.y && y <= hr.y + hr.h) {
        return hr.tile;
      }
    }
    return null;
  }

  // ==================== SINGLE SHEET & ASSEMBLY MAP MODAL ====================
  let modalOpener = null;

  function openTileModal(tileIndex) {
    if (!state.layout || !state.processedCanvas) return;
    modalOpener = document.activeElement;
    state.modalMode = 'tile';
    state.modalTileIndex = Geo.clamp(tileIndex, 0, state.layout.tiles.length - 1);
    els.sheetModal.classList.remove('hidden');
    renderModalContent();
    els.btnModalClose.focus({ preventScroll: true });
  }

  function openMapModal() {
    if (!state.layout || !state.processedCanvas) return;
    modalOpener = document.activeElement;
    state.modalMode = 'map';
    els.sheetModal.classList.remove('hidden');
    renderModalContent();
    els.btnModalClose.focus({ preventScroll: true });
  }

  function closeModal() {
    state.modalMode = null;
    els.sheetModal.classList.add('hidden');
    modalOpener?.focus({ preventScroll: true });
    modalOpener = null;
  }

  function renderModalContent() {
    const layout = state.layout;
    if (!layout || !state.processedCanvas) return;

    if (state.modalMode === 'map') {
      els.modalTitle.textContent = 'Birleştirme Haritası (1. Sayfa Önizlemesi)';
      els.modalSub.textContent = `${layout.includedCount} yazdırılacak sayfa • ${layout.posterWidthCm} × ${layout.posterHeightCm} cm`;
      els.btnModalPrev.classList.add('hidden');
      els.btnModalNext.classList.add('hidden');
      els.modalIncludeWrap.classList.add('hidden');
      els.btnModalDownloadPng.textContent = 'Haritayı PNG İndir';

      const mapRes = Pdf.renderAssemblyMapCanvas(state.processedCanvas, layout, getExportOptions());
      els.modalCanvas.width = mapRes.canvas.width;
      els.modalCanvas.height = mapRes.canvas.height;
      els.modalCanvas.getContext('2d').drawImage(mapRes.canvas, 0, 0);
      return;
    }

    const tile = layout.tiles[state.modalTileIndex];
    if (!tile) return;

    const paperMeta = Geo.PAPER_SIZES[layout.paperSize] || { name: 'Özel' };
    const orientTr = layout.orientation === 'landscape' ? 'Yatay' : 'Dikey';
    const statusText = tile.included
      ? `Sayfa ${tile.pageNumber} / ${layout.includedCount}`
      : (tile.isBlank ? 'Boş Sayfa (Atlandı)' : 'Hariç Tutuldu');

    els.modalTitle.textContent = `${statusText} — Satır ${tile.row + 1}, Sütun ${tile.col + 1} (${tile.coordLabel})`;
    els.modalSub.textContent = `${paperMeta.name} ${orientTr} (${layout.paperW}×${layout.paperH} mm) • Kenar: ${layout.margin} mm • Bindirme: ${layout.overlap} mm`;

    els.btnModalPrev.classList.remove('hidden');
    els.btnModalNext.classList.remove('hidden');
    els.btnModalPrev.disabled = state.modalTileIndex <= 0;
    els.btnModalNext.disabled = state.modalTileIndex >= layout.tiles.length - 1;

    els.modalIncludeWrap.classList.remove('hidden');
    els.chkModalInclude.checked = tile.included;
    els.chkModalInclude.disabled = tile.isBlank && state.skipBlank;
    els.btnModalDownloadPng.textContent = 'Bu Sayfayı PNG İndir';

    const opts = {
      ...getExportOptions(),
      highlightOverlapInPreview: state.showOverlapVis
    };
    const sheetCanvas = Pdf.renderSheetCanvas(state.processedCanvas, tile, layout, opts, 1100);
    els.modalCanvas.width = sheetCanvas.width;
    els.modalCanvas.height = sheetCanvas.height;
    els.modalCanvas.getContext('2d').drawImage(sheetCanvas, 0, 0);
  }

  function getExportOptions() {
    return {
      fileName: state.fileName,
      cutMarks: state.cutMarks,
      overlapGuides: state.overlapGuides,
      pageLabels: state.pageLabels,
      includeAssemblyMap: state.includeAssemblyMap,
      outputDpi: state.outputDpi
    };
  }

  // ==================== PDF EXPORT & DIRECT PRINT ====================
  async function handleDownloadPdf() {
    if (!state.processedCanvas || !state.layout || state.layout.includedCount === 0) return;

    els.exportTitle.textContent = 'Poster PDF Hazırlanıyor...';
    els.exportStep.textContent = 'Başlatılıyor...';
    els.exportProgressBar.style.width = '4%';
    els.exportModal.classList.remove('hidden');

    try {
      const blob = await Pdf.buildPosterPdf(
        state.processedCanvas,
        state.layout,
        getExportOptions(),
        (progress) => {
          els.exportStep.textContent = progress.label;
          els.exportProgressBar.style.width = `${Math.max(6, progress.percent)}%`;
        }
      );

      const cleanBase = (state.fileName || 'poster')
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ_-]+/g, '-')
        .slice(0, 40) || 'poster';
      const paperName = (Geo.PAPER_SIZES[state.layout.paperSize] || { name: 'Ozel' }).name;
      const outName = `poster-${cleanBase}-${state.layout.cols}x${state.layout.rows}-${paperName}.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      els.exportModal.classList.add('hidden');
      showToast('PDF indirildi! Yazdırırken ölçeği "%100 (Gerçek Boyut)" seçin.', 5000);
    } catch (err) {
      console.error('PDF oluşturma hatası:', err);
      els.exportModal.classList.add('hidden');
      showToast(`PDF oluşturulamadı: ${err.message || err}`);
    }
  }

  async function handlePrintDirect() {
    if (!state.processedCanvas || !state.layout || state.layout.includedCount === 0) return;

    const layout = state.layout;
    const includedTiles = layout.tiles.filter(t => t.included);
    const opts = getExportOptions();

    els.exportTitle.textContent = 'Yazdırma Sayfaları Hazırlanıyor...';
    els.exportStep.textContent = 'Sayfalar yüksek çözünürlükte oluşturuluyor...';
    els.exportProgressBar.style.width = '10%';
    els.exportModal.classList.remove('hidden');

    try {
      // Configure @page exact physical millimeter size
      els.dynamicPrintStyle.textContent =
        `@page { size: ${layout.paperW}mm ${layout.paperH}mm; margin: 0; }`;

      els.printContainer.innerHTML = '';
      const imgElements = [];
      const printPxW = Math.round((layout.paperW / Geo.MM_PER_INCH) * 180);

      let done = 0;
      const total = includedTiles.length + (opts.includeAssemblyMap ? 1 : 0);

      if (opts.includeAssemblyMap) {
        await new Promise(r => setTimeout(r, 0));
        const mapRes = Pdf.renderAssemblyMapCanvas(state.processedCanvas, layout, opts);
        const sheet = document.createElement('div');
        sheet.className = 'print-sheet';
        sheet.style.width = `${layout.paperW}mm`;
        sheet.style.height = `${layout.paperH}mm`;
        const img = document.createElement('img');
        img.src = mapRes.canvas.toDataURL('image/jpeg', 0.92);
        sheet.appendChild(img);
        els.printContainer.appendChild(sheet);
        imgElements.push(img);
        done++;
        els.exportProgressBar.style.width = `${Math.round((done / total) * 100)}%`;
      }

      for (const tile of includedTiles) {
        els.exportStep.textContent = `Sayfa ${tile.pageNumber} / ${includedTiles.length} hazırlanıyor...`;
        await new Promise(r => setTimeout(r, 0));
        const sheetCanvas = Pdf.renderSheetCanvas(state.processedCanvas, tile, layout, opts, printPxW);
        const sheet = document.createElement('div');
        sheet.className = 'print-sheet';
        sheet.style.width = `${layout.paperW}mm`;
        sheet.style.height = `${layout.paperH}mm`;
        const img = document.createElement('img');
        img.src = sheetCanvas.toDataURL('image/jpeg', 0.92);
        sheet.appendChild(img);
        els.printContainer.appendChild(sheet);
        imgElements.push(img);
        done++;
        els.exportProgressBar.style.width = `${Math.round((done / total) * 100)}%`;
      }

      // Wait for all print images to decode before opening print dialog
      await Promise.all(imgElements.map(im => im.decode ? im.decode().catch(() => {}) : Promise.resolve()));
      els.exportModal.classList.add('hidden');

      window.print();
    } catch (err) {
      console.error('Doğrudan yazdırma hatası:', err);
      els.exportModal.classList.add('hidden');
      showToast('Yazdırma hazırlanamadı; bunun yerine "PDF İndir" kullanabilirsiniz.');
    }
  }

  window.addEventListener('afterprint', () => {
    els.printContainer.innerHTML = '';
  });

  // ==================== EVENT WIRING ====================
  function bindSegmented(container, onChange) {
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      container.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(btn.dataset.value);
    });
  }

  function initEvents() {
    // Upload triggers
    const openFileDialog = () => els.fileInput.click();
    els.btnHeroUpload.addEventListener('click', (e) => { e.stopPropagation(); openFileDialog(); });
    els.btnSideUpload.addEventListener('click', openFileDialog);
    els.btnChangeImage.addEventListener('click', openFileDialog);
    els.btnLoadSample.addEventListener('click', (e) => { e.stopPropagation(); generateSamplePoster(); });

    els.dropzone.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      openFileDialog();
    });
    els.dropzone.addEventListener('keydown', (e) => {
      if (e.target === els.dropzone && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        openFileDialog();
      }
    });

    els.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        loadImageFile(e.target.files[0]);
        e.target.value = '';
      }
    });

    // Global Drag & Drop
    let dragCounter = 0;
    window.addEventListener('dragenter', (e) => {
      if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes('Files')) return;
      e.preventDefault();
      dragCounter++;
      els.dropzone.classList.add('drag-active');
      if (state.processedCanvas) els.dragOverlay.classList.remove('hidden');
    });
    window.addEventListener('dragover', (e) => {
      if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes('Files')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });
    window.addEventListener('dragleave', () => {
      dragCounter = Math.max(0, dragCounter - 1);
      if (dragCounter === 0) {
        els.dropzone.classList.remove('drag-active');
        els.dragOverlay.classList.add('hidden');
      }
    });
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      els.dropzone.classList.remove('drag-active');
      els.dragOverlay.classList.add('hidden');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        loadImageFile(e.dataTransfer.files[0]);
      }
    });

    // Clipboard Paste (Cmd+V / Ctrl+V)
    window.addEventListener('paste', (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items || !studio.contains(e.target) && e.target !== document.body) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            loadImageFile(file);
            break;
          }
        }
      }
    });

    // Image transforms & color mode
    els.btnRotateLeft.addEventListener('click', () => {
      if (!state.rawImage) return;
      state.rotation = (state.rotation + 270) % 360;
      state.panX = 0; state.panY = 0;
      rebuildProcessedSource();
      syncTargetDimensionsFromAspect();
      recomputeAndRender();
    });
    els.btnRotateRight.addEventListener('click', () => {
      if (!state.rawImage) return;
      state.rotation = (state.rotation + 90) % 360;
      state.panX = 0; state.panY = 0;
      rebuildProcessedSource();
      syncTargetDimensionsFromAspect();
      recomputeAndRender();
    });
    els.btnFlipH.addEventListener('click', () => {
      if (!state.rawImage) return;
      state.flipH = !state.flipH;
      rebuildProcessedSource();
      recomputeAndRender();
    });
    els.btnFlipV.addEventListener('click', () => {
      if (!state.rawImage) return;
      state.flipV = !state.flipV;
      rebuildProcessedSource();
      recomputeAndRender();
    });
    bindSegmented(els.colorModeSeg, (val) => {
      state.colorMode = val;
      if (state.rawImage) {
        rebuildProcessedSource();
        recomputeAndRender();
      }
    });

    // Sizing Mode Tabs
    bindSegmented(els.sizingModeSeg, (val) => {
      state.sizingMode = val;
      els.panelGridMode.classList.toggle('hidden', val !== 'grid');
      els.panelDimMode.classList.toggle('hidden', val !== 'dimensions');
      if (val === 'dimensions' && state.layout) {
        state.targetWidthCm = Math.max(10, Math.round(state.layout.posterWidthCm));
        state.targetHeightCm = Math.max(10, Math.round(state.layout.posterHeightCm));
        els.inputTargetW.value = state.targetWidthCm;
        els.inputTargetH.value = state.targetHeightCm;
      }
      state.excludedTiles.clear();
      recomputeAndRender();
    });

    // Grid Presets
    els.gridPresets.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      state.lockAspectGrid = false;
      els.chkLockAspectGrid.checked = false;
      state.cols = Number(chip.dataset.cols);
      state.rows = Number(chip.dataset.rows);
      els.inputCols.value = state.cols;
      els.inputRows.value = state.rows;
      state.excludedTiles.clear();
      recomputeAndRender();
    });

    // Steppers for cols & rows
    document.querySelectorAll('.step-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const field = btn.dataset.step;
        const delta = Number(btn.dataset.delta);
        if (field === 'cols') {
          state.cols = Geo.clamp(state.cols + delta, 1, 20);
          state.aspectDriver = 'cols';
          els.inputCols.value = state.cols;
        } else {
          state.rows = Geo.clamp(state.rows + delta, 1, 20);
          state.aspectDriver = 'rows';
          els.inputRows.value = state.rows;
        }
        state.excludedTiles.clear();
        recomputeAndRender();
      });
    });

    els.inputCols.addEventListener('input', () => {
      const v = parseInt(els.inputCols.value, 10);
      if (!isNaN(v)) {
        state.cols = Geo.clamp(v, 1, 20);
        state.aspectDriver = 'cols';
        state.excludedTiles.clear();
        recomputeAndRender();
      }
    });
    els.inputRows.addEventListener('input', () => {
      const v = parseInt(els.inputRows.value, 10);
      if (!isNaN(v)) {
        state.rows = Geo.clamp(v, 1, 20);
        state.aspectDriver = 'rows';
        state.excludedTiles.clear();
        recomputeAndRender();
      }
    });

    els.chkLockAspectGrid.addEventListener('change', () => {
      state.lockAspectGrid = els.chkLockAspectGrid.checked;
      state.aspectDriver = 'cols';
      recomputeAndRender();
    });

    bindSegmented(els.fitModeSeg, (val) => {
      state.fitMode = val;
      state.panX = 0;
      state.panY = 0;
      recomputeAndRender();
    });

    // Physical Dimensions (cm)
    els.dimPresets.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      state.targetWidthCm = Number(chip.dataset.cm);
      els.inputTargetW.value = state.targetWidthCm;
      if (state.lockAspectDim) syncTargetDimensionsFromAspect();
      state.excludedTiles.clear();
      recomputeAndRender();
    });

    els.inputTargetW.addEventListener('input', () => {
      const v = parseFloat(els.inputTargetW.value);
      if (v > 0) {
        state.targetWidthCm = Geo.clamp(v, 5, 1000);
        if (state.lockAspectDim && state.processedCanvas) {
          const aspect = state.processedCanvas.width / state.processedCanvas.height;
          state.targetHeightCm = +(state.targetWidthCm / aspect).toFixed(1);
          els.inputTargetH.value = state.targetHeightCm;
        }
        state.excludedTiles.clear();
        recomputeAndRender();
      }
    });

    els.inputTargetH.addEventListener('input', () => {
      const v = parseFloat(els.inputTargetH.value);
      if (v > 0) {
        state.targetHeightCm = Geo.clamp(v, 5, 1000);
        if (state.lockAspectDim && state.processedCanvas) {
          const aspect = state.processedCanvas.width / state.processedCanvas.height;
          state.targetWidthCm = +(state.targetHeightCm * aspect).toFixed(1);
          els.inputTargetW.value = state.targetWidthCm;
        }
        state.excludedTiles.clear();
        recomputeAndRender();
      }
    });

    els.chkLockAspectDim.addEventListener('change', () => {
      state.lockAspectDim = els.chkLockAspectDim.checked;
      if (state.lockAspectDim) syncTargetDimensionsFromAspect();
      recomputeAndRender();
    });

    // 9-Point Alignment
    const alignNames = {
      '0,0': 'Sol Üst', '0.5,0': 'Üst Orta', '1,0': 'Sağ Üst',
      '0,0.5': 'Sol Orta', '0.5,0.5': 'Ortalanmış', '1,0.5': 'Sağ Orta',
      '0,1': 'Sol Alt', '0.5,1': 'Alt Orta', '1,1': 'Sağ Alt'
    };
    els.alignPad.addEventListener('click', (e) => {
      const dot = e.target.closest('.align-dot');
      if (!dot) return;
      els.alignPad.querySelectorAll('.align-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      state.alignX = Number(dot.dataset.ax);
      state.alignY = Number(dot.dataset.ay);
      state.panX = 0;
      state.panY = 0;
      els.alignLabelText.textContent = alignNames[`${state.alignX},${state.alignY}`] || 'Ortalanmış';
      recomputeAndRender();
    });

    els.btnResetPan.addEventListener('click', () => {
      state.panX = 0;
      state.panY = 0;
      recomputeAndRender();
    });

    // Paper & Printer
    els.selectPaper.addEventListener('change', () => {
      state.paperSize = els.selectPaper.value;
      els.customPaperBox.classList.toggle('hidden', state.paperSize !== 'custom');
      recomputeAndRender();
    });
    els.inputCustomW.addEventListener('input', () => {
      const v = parseFloat(els.inputCustomW.value);
      if (v >= 50) { state.customPaperW = v; recomputeAndRender(); }
    });
    els.inputCustomH.addEventListener('input', () => {
      const v = parseFloat(els.inputCustomH.value);
      if (v >= 50) { state.customPaperH = v; recomputeAndRender(); }
    });

    bindSegmented(els.orientationSeg, (val) => {
      state.orientation = val;
      recomputeAndRender();
    });

    // Margin slider & presets
    const setMargin = (mm) => {
      state.marginMm = Geo.clamp(Number(mm), 0, 25);
      els.rangeMargin.value = state.marginMm;
      els.valMargin.textContent = state.marginMm;
      els.marginPresets.querySelectorAll('.chip').forEach(c => {
        c.classList.toggle('active', Number(c.dataset.mm) === state.marginMm);
      });
      recomputeAndRender();
    };
    els.rangeMargin.addEventListener('input', () => setMargin(els.rangeMargin.value));
    els.marginPresets.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (chip) setMargin(chip.dataset.mm);
    });

    // Overlap slider & presets
    const setOverlap = (mm) => {
      state.overlapMm = Geo.clamp(Number(mm), 0, 25);
      els.rangeOverlap.value = state.overlapMm;
      els.valOverlap.textContent = state.overlapMm;
      els.overlapPresets.querySelectorAll('.chip').forEach(c => {
        c.classList.toggle('active', Number(c.dataset.mm) === state.overlapMm);
      });
      recomputeAndRender();
    };
    els.rangeOverlap.addEventListener('input', () => setOverlap(els.rangeOverlap.value));
    els.overlapPresets.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (chip) setOverlap(chip.dataset.mm);
    });

    // Print Aid Switches
    els.chkCutMarks.addEventListener('change', () => { state.cutMarks = els.chkCutMarks.checked; recomputeAndRender(); });
    els.chkOverlapGuides.addEventListener('change', () => { state.overlapGuides = els.chkOverlapGuides.checked; recomputeAndRender(); });
    els.chkPageLabels.addEventListener('change', () => { state.pageLabels = els.chkPageLabels.checked; recomputeAndRender(); });
    els.chkAssemblyMap.addEventListener('change', () => { state.includeAssemblyMap = els.chkAssemblyMap.checked; });
    els.chkSkipBlank.addEventListener('change', () => { state.skipBlank = els.chkSkipBlank.checked; recomputeAndRender(); });

    bindSegmented(els.qualitySeg, (val) => {
      state.outputDpi = Number(val);
    });

    // Stage Toolbar
    bindSegmented(els.viewModeSeg, (val) => {
      state.viewMode = val;
      recomputeAndRender();
    });
    els.btnToggleOverlapVis.addEventListener('click', () => {
      state.showOverlapVis = !state.showOverlapVis;
      els.btnToggleOverlapVis.classList.toggle('active', state.showOverlapVis);
      renderPreview();
    });
    els.btnToggleGuidesVis.addEventListener('click', () => {
      state.showGuidesVis = !state.showGuidesVis;
      els.btnToggleGuidesVis.classList.toggle('active', state.showGuidesVis);
      renderPreview();
    });

    const setZoom = (z) => {
      state.zoom = Geo.clamp(z, 0.4, 2.5);
      els.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
      renderPreview();
    };
    els.btnZoomIn.addEventListener('click', () => setZoom(state.zoom + 0.15));
    els.btnZoomOut.addEventListener('click', () => setZoom(state.zoom - 0.15));
    els.btnZoomFit.addEventListener('click', () => setZoom(1));

    els.btnRestoreExcluded.addEventListener('click', () => {
      state.excludedTiles.clear();
      recomputeAndRender();
      showToast('Hariç tutulan tüm sayfalar geri eklendi.');
    });

    // Stage Canvas Pointer Events (hover, click to inspect, right-click to exclude, drag-to-pan in Cover mode)
    const pointers = new Map();
    let pointerStart = null;
    let pinch = null;
    let didGesture = false;
    let keyboardTileIndex = 0;

    function canPanImage() {
      return state.sizingMode === 'grid' && state.fitMode === 'cover' && state.viewMode === 'assembled';
    }

    function pointerDistance() {
      const [first, second] = pointers.values();
      return Math.hypot(first.x - second.x, first.y - second.y);
    }

    els.previewCanvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !state.layout || pointers.size >= 2) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { els.previewCanvas.setPointerCapture(e.pointerId); } catch (_) {}
      if (pointers.size === 1) {
        didGesture = false;
        pointerStart = { x: e.clientX, y: e.clientY, panX: state.panX, panY: state.panY };
      } else {
        didGesture = true;
        pinch = { distance: Math.max(1, pointerDistance()), zoom: state.zoom };
      }
    });

    els.previewCanvas.addEventListener('pointermove', (e) => {
      if (!state.layout) return;
      if (pointers.has(e.pointerId)) {
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pinch && pointers.size === 2) {
          setZoom(pinch.zoom * pointerDistance() / pinch.distance);
          return;
        }
        if (pointerStart && canPanImage()) {
          const dx = e.clientX - pointerStart.x, dy = e.clientY - pointerStart.y;
          if (Math.hypot(dx, dy) > 4) {
            didGesture = true;
            els.previewCanvas.classList.add('panning');
            const rect = els.previewCanvas.getBoundingClientRect();
            const sensitivity = 2.6 / Math.max(200, Math.min(rect.width, rect.height));
            state.panX = Geo.clamp(pointerStart.panX + dx * sensitivity, -1, 1);
            state.panY = Geo.clamp(pointerStart.panY + dy * sensitivity, -1, 1);
            recomputeAndRender();
            return;
          }
        }
      }
      if (e.pointerType !== 'mouse') return;
      const tile = hitTestTile(e.clientX, e.clientY);
      const nextId = tile ? tile.id : null;
      if (nextId !== state.hoveredTileId) {
        state.hoveredTileId = nextId;
        renderPreview();
      }

      if (tile) {
        const rect = els.stageViewport.getBoundingClientRect();
        const tx = e.clientX - rect.left + 14;
        const ty = e.clientY - rect.top - 12;
        const status = tile.included
          ? `Sayfa ${tile.pageNumber} (${tile.coordLabel}) · İncelemek için tıklayın`
          : `${tile.coordLabel} · ${tile.isBlank ? 'Boş (atlandı)' : 'Hariç tutuldu'}`;
        els.hoverTooltip.textContent = status;
        els.hoverTooltip.style.left = `${Math.max(4, Math.min(tx, rect.width - 240))}px`;
        els.hoverTooltip.style.top = `${Math.max(8, ty)}px`;
        els.hoverTooltip.classList.remove('hidden');
      } else {
        els.hoverTooltip.classList.add('hidden');
      }
    });


    function finishPointer(e) {
      if (!pointers.delete(e.pointerId)) return;
      if (pinch) pointerStart = null;
      pinch = null;
      els.previewCanvas.classList.remove('panning');
      if (e.type === 'pointerup' && !didGesture) {
        const tile = hitTestTile(e.clientX, e.clientY);
        if (tile) openTileModal(tile.index);
      }
      if (pointers.size === 0) pointerStart = null;
    }

    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      els.previewCanvas.addEventListener(type, finishPointer);
    }
    els.previewCanvas.addEventListener('pointerleave', () => {
      els.hoverTooltip.classList.add('hidden');
      if (state.hoveredTileId !== null) {
        state.hoveredTileId = null;
        renderPreview();
      }
    });

    els.previewCanvas.addEventListener('keydown', (e) => {
      if (!state.layout || e.altKey || e.ctrlKey || e.metaKey) return;
      const key = e.key;
      const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -state.layout.cols, ArrowDown: state.layout.cols };
      if (Object.prototype.hasOwnProperty.call(offsets, key)) {
        if (e.shiftKey && canPanImage()) {
          state.panX = Geo.clamp(state.panX + (key === 'ArrowLeft' ? -0.12 : key === 'ArrowRight' ? 0.12 : 0), -1, 1);
          state.panY = Geo.clamp(state.panY + (key === 'ArrowUp' ? -0.12 : key === 'ArrowDown' ? 0.12 : 0), -1, 1);
          recomputeAndRender();
        } else {
          keyboardTileIndex = Geo.clamp(keyboardTileIndex + offsets[key], 0, state.layout.tiles.length - 1);
          const selectedTile = state.layout.tiles[keyboardTileIndex];
          state.hoveredTileId = selectedTile.id;
          els.stageHint.textContent = selectedTile.coordLabel + ' · Enter ile incele';
          renderPreview();
        }
      } else if (key === '+' || key === '=') setZoom(state.zoom + 0.15);
      else if (key === '-') setZoom(state.zoom - 0.15);
      else if (key === '0') setZoom(1);
      else if (key === 'Enter' || key === ' ') openTileModal(keyboardTileIndex);
      else return;
      e.preventDefault();
    });

    // Right-click tile to quickly toggle exclude/include
    els.previewCanvas.addEventListener('contextmenu', (e) => {
      const tile = hitTestTile(e.clientX, e.clientY);
      if (!tile) return;
      e.preventDefault();
      if (tile.isBlank && state.skipBlank) {
        showToast('Bu sayfa boş olduğu için otomatik atlandı.');
        return;
      }
      if (state.excludedTiles.has(tile.id)) {
        state.excludedTiles.delete(tile.id);
        showToast(`${tile.coordLabel} sayfası tekrar dahil edildi.`);
      } else {
        state.excludedTiles.add(tile.id);
        showToast(`${tile.coordLabel} sayfası yazdırmadan hariç tutuldu.`);
      }
      recomputeAndRender();
    });

    // Ctrl/Cmd + wheel zoom on preview
    els.stageViewport.addEventListener('wheel', (e) => {
      if (!state.processedCanvas) return;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom(state.zoom + (e.deltaY < 0 ? 0.1 : -0.1));
      }
    }, { passive: false });

    // Modal controls
    els.btnPreviewMap.addEventListener('click', openMapModal);
    els.btnModalClose.addEventListener('click', closeModal);
    els.btnModalOk.addEventListener('click', closeModal);
    els.sheetModal.addEventListener('click', (e) => {
      if (e.target === els.sheetModal) closeModal();
    });
    els.btnModalPrev.addEventListener('click', () => {
      if (state.modalTileIndex > 0) {
        state.modalTileIndex--;
        renderModalContent();
      }
    });
    els.btnModalNext.addEventListener('click', () => {
      if (state.layout && state.modalTileIndex < state.layout.tiles.length - 1) {
        state.modalTileIndex++;
        renderModalContent();
      }
    });
    els.chkModalInclude.addEventListener('change', () => {
      if (!state.layout || state.modalMode !== 'tile') return;
      const tile = state.layout.tiles[state.modalTileIndex];
      if (!tile) return;
      if (els.chkModalInclude.checked) {
        state.excludedTiles.delete(tile.id);
      } else {
        state.excludedTiles.add(tile.id);
      }
      recomputeAndRender();
    });
    els.btnModalDownloadPng.addEventListener('click', () => {
      if (!state.layout || !state.processedCanvas) return;
      let canvasToSave, fileName;
      if (state.modalMode === 'map') {
        canvasToSave = Pdf.renderAssemblyMapCanvas(state.processedCanvas, state.layout, getExportOptions()).canvas;
        fileName = `poster-birlestirme-haritasi.png`;
      } else {
        const tile = state.layout.tiles[state.modalTileIndex];
        const pxW = Math.round((state.layout.paperW / Geo.MM_PER_INCH) * 240);
        canvasToSave = Pdf.renderSheetCanvas(state.processedCanvas, tile, state.layout, getExportOptions(), pxW);
        fileName = `poster-sayfa-${tile.pageNumber || 'haric'}-${tile.coordLabel}.png`;
      }
      const a = document.createElement('a');
      a.href = canvasToSave.toDataURL('image/png');
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`"${fileName}" indirildi.`);
    });

    // Export actions
    els.btnDownloadPdf.addEventListener('click', handleDownloadPdf);
    els.btnPrintDirect.addEventListener('click', handlePrintDirect);

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.modalMode) {
        closeModal();
        return;
      }
      if (state.modalMode === 'tile') {
        if (e.key === 'ArrowLeft' && state.modalTileIndex > 0) {
          state.modalTileIndex--;
          renderModalContent();
        } else if (e.key === 'ArrowRight' && state.layout && state.modalTileIndex < state.layout.tiles.length - 1) {
          state.modalTileIndex++;
          renderModalContent();
        }
      }
    });

    // ResizeObserver for crisp HiDPI redraw on resize
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        if (state.processedCanvas) renderPreview();
      });
      ro.observe(els.stageViewport);
    } else {
      window.addEventListener('resize', () => {
        if (state.processedCanvas) renderPreview();
      });
    }
  }

  function syncTargetDimensionsFromAspect() {
    if (!state.processedCanvas) return;
    const aspect = state.processedCanvas.width / state.processedCanvas.height;
    state.targetHeightCm = Math.max(5, +(state.targetWidthCm / aspect).toFixed(1));
    els.inputTargetH.value = state.targetHeightCm;
  }

  // ==================== BOOT ====================
  initEvents();
  window.GameViewport.watch(window, studio);
})();
