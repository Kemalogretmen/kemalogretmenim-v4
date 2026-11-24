/**
 * PosterMatik — Pure Geometry & Multi-Page Poster Tiling Math Engine
 * Works in both browser (window.PosterGeometry) and Node.js (module.exports).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PosterGeometry = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MM_PER_INCH = 25.4;
  const PT_PER_INCH = 72;
  const PT_PER_MM = PT_PER_INCH / MM_PER_INCH;

  const PAPER_SIZES = {
    a4:     { id: 'a4',     name: 'A4',        w: 210,   h: 297,   label: 'A4 (210 × 297 mm)' },
    a3:     { id: 'a3',     name: 'A3',        w: 297,   h: 420,   label: 'A3 (297 × 420 mm)' },
    a5:     { id: 'a5',     name: 'A5',        w: 148,   h: 210,   label: 'A5 (148 × 210 mm)' },
    letter: { id: 'letter', name: 'Letter',    w: 215.9, h: 279.4, label: 'Letter (216 × 279 mm)' },
    legal:  { id: 'legal',  name: 'Legal',     w: 215.9, h: 355.6, label: 'Legal (216 × 356 mm)' },
    custom: { id: 'custom', name: 'Özel',      w: 210,   h: 297,   label: 'Özel Boyut (mm)' }
  };

  function mmToPt(mm) {
    return mm * PT_PER_MM;
  }

  function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }

  /**
   * Resolve base paper dimensions (portrait W <= H) and apply orientation.
   */
  function getPaperDimensions(paperId, customW, customH, orientation) {
    let baseW, baseH;
    if (paperId === 'custom') {
      baseW = clamp(Number(customW) || 210, 50, 2000);
      baseH = clamp(Number(customH) || 297, 50, 2000);
    } else {
      const preset = PAPER_SIZES[paperId] || PAPER_SIZES.a4;
      baseW = preset.w;
      baseH = preset.h;
    }

    const shortSide = Math.min(baseW, baseH);
    const longSide = Math.max(baseW, baseH);

    if (orientation === 'landscape') {
      return { paperW: longSide, paperH: shortSide, resolvedOrientation: 'landscape' };
    }
    return { paperW: shortSide, paperH: longSide, resolvedOrientation: 'portrait' };
  }

  /**
   * Calculate how many tiles are needed to cover a physical span given printable size & overlap.
   */
  function sheetsNeeded(targetMm, printMm, overlapMm) {
    const step = Math.max(1, printMm - overlapMm);
    if (targetMm <= printMm + 1e-4) return 1;
    return Math.max(1, Math.ceil((targetMm - overlapMm - 1e-4) / step));
  }

  /**
   * Calculate total assembled span for N sheets with given printable size & overlap.
   */
  function totalSpan(count, printMm, overlapMm) {
    const n = Math.max(1, Math.round(count));
    return n * printMm - (n - 1) * overlapMm;
  }

  /**
   * Compute layout for a concrete orientation ('portrait' or 'landscape').
   */
  function computeForOrientation(config, concreteOrientation) {
    const imgW = Math.max(1, Number(config.imgW) || 1000);
    const imgH = Math.max(1, Number(config.imgH) || 1000);
    const imgAspect = imgW / imgH;

    const { paperW, paperH, resolvedOrientation } = getPaperDimensions(
      config.paperSize,
      config.customPaperW,
      config.customPaperH,
      concreteOrientation
    );

    const maxMargin = Math.floor(Math.min(paperW, paperH) * 0.35);
    const margin = clamp(Number(config.marginMm) || 0, 0, maxMargin);

    const printW = Math.max(10, paperW - 2 * margin);
    const printH = Math.max(10, paperH - 2 * margin);

    const maxOverlap = Math.floor(Math.min(printW, printH) * 0.35);
    const overlap = clamp(Number(config.overlapMm) || 0, 0, maxOverlap);

    const stepX = Math.max(1, printW - overlap);
    const stepY = Math.max(1, printH - overlap);

    const sizingMode = config.sizingMode || 'grid'; // 'grid' | 'dimensions'
    const fitMode = config.fitMode || 'contain';    // 'contain' | 'cover' | 'stretch'
    const alignX = clamp(config.alignX != null ? Number(config.alignX) : 0.5, 0, 1);
    const alignY = clamp(config.alignY != null ? Number(config.alignY) : 0.5, 0, 1);

    let cols, rows, totalW, totalH, placedW, placedH, placedX, placedY;

    if (sizingMode === 'dimensions') {
      const targetW = clamp((Number(config.targetWidthCm) || 40) * 10, 50, 10000);
      const targetH = config.lockAspect !== false
        ? targetW / imgAspect
        : clamp((Number(config.targetHeightCm) || 60) * 10, 50, 10000);

      placedW = targetW;
      placedH = targetH;

      cols = clamp(sheetsNeeded(placedW, printW, overlap), 1, 20);
      rows = clamp(sheetsNeeded(placedH, printH, overlap), 1, 20);

      totalW = totalSpan(cols, printW, overlap);
      totalH = totalSpan(rows, printH, overlap);

      // If clamped at 20x20, ensure placed dimensions don't silently exceed grid unless intended
      if (placedW > totalW) placedW = totalW;
      if (placedH > totalH) placedH = totalH;

      placedX = (totalW - placedW) * alignX;
      placedY = (totalH - placedH) * alignY;
    } else {
      // 'grid' mode
      cols = clamp(Math.round(Number(config.cols) || 2), 1, 20);
      rows = clamp(Math.round(Number(config.rows) || 2), 1, 20);

      if (config.lockAspect) {
        if (config.aspectDriver === 'rows') {
          const tH = totalSpan(rows, printH, overlap);
          const idealW = tH * imgAspect;
          cols = clamp(sheetsNeeded(idealW, printW, overlap), 1, 20);
        } else {
          const tW = totalSpan(cols, printW, overlap);
          const idealH = tW / imgAspect;
          rows = clamp(sheetsNeeded(idealH, printH, overlap), 1, 20);
        }
      }

      totalW = totalSpan(cols, printW, overlap);
      totalH = totalSpan(rows, printH, overlap);

      if (fitMode === 'stretch') {
        placedW = totalW;
        placedH = totalH;
        placedX = 0;
        placedY = 0;
      } else if (fitMode === 'cover') {
        const scale = Math.max(totalW / imgW, totalH / imgH);
        placedW = imgW * scale;
        placedH = imgH * scale;
        const panXNorm = clamp(Number(config.panX) || 0, -1, 1);
        const panYNorm = clamp(Number(config.panY) || 0, -1, 1);
        const overflowX = placedW - totalW; // >= 0
        const overflowY = placedH - totalH; // >= 0
        // Base from alignX/alignY, shifted by interactive pan
        const baseOffsetX = -overflowX * alignX;
        const baseOffsetY = -overflowY * alignY;
        placedX = clamp(baseOffsetX + panXNorm * (overflowX * 0.5), -overflowX, 0);
        placedY = clamp(baseOffsetY + panYNorm * (overflowY * 0.5), -overflowY, 0);
      } else {
        // 'contain'
        const scale = Math.min(totalW / imgW, totalH / imgH);
        placedW = imgW * scale;
        placedH = imgH * scale;
        placedX = (totalW - placedW) * alignX;
        placedY = (totalH - placedH) * alignY;
      }
    }

    // Build individual tiles
    const skipBlank = config.skipBlank !== false;
    const excludedSet = config.excludedTiles instanceof Set
      ? config.excludedTiles
      : new Set(Array.isArray(config.excludedTiles) ? config.excludedTiles : []);

    const tiles = [];
    let activePageNumber = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tileId = `${r}-${c}`;
        const tileX0 = c * stepX;
        const tileY0 = r * stepY;
        const tileX1 = tileX0 + printW;
        const tileY1 = tileY0 + printH;

        const ix0 = Math.max(tileX0, placedX);
        const iy0 = Math.max(tileY0, placedY);
        const ix1 = Math.min(tileX1, placedX + placedW);
        const iy1 = Math.min(tileY1, placedY + placedH);

        const hasImage = (ix1 - ix0) > 0.1 && (iy1 - iy0) > 0.1;
        const isBlank = !hasImage;
        const manuallyExcluded = excludedSet.has(tileId);
        const included = (!isBlank || !skipBlank) && !manuallyExcluded;

        if (included) {
          activePageNumber++;
        }

        let imageRect = null;
        if (hasImage) {
          const destX_mm = margin + (ix0 - tileX0);
          const destY_mm = margin + (iy0 - tileY0);
          const destW_mm = ix1 - ix0;
          const destH_mm = iy1 - iy0;

          const srcX = ((ix0 - placedX) / placedW) * imgW;
          const srcY = ((iy0 - placedY) / placedH) * imgH;
          const srcW = (destW_mm / placedW) * imgW;
          const srcH = (destH_mm / placedH) * imgH;

          imageRect = {
            destX_mm, destY_mm, destW_mm, destH_mm,
            srcX, srcY, srcW, srcH,
            posterX0: ix0, posterY0: iy0, posterX1: ix1, posterY1: iy1
          };
        }

        tiles.push({
          id: tileId,
          row: r,
          col: c,
          index: r * cols + c,
          pageNumber: included ? activePageNumber : null,
          coordLabel: `S${r + 1}-K${c + 1}`,
          tileX0, tileY0, tileX1, tileY1,
          hasOverlapLeft: c > 0 && overlap > 0,
          hasOverlapRight: c < cols - 1 && overlap > 0,
          hasOverlapTop: r > 0 && overlap > 0,
          hasOverlapBottom: r < rows - 1 && overlap > 0,
          isBlank,
          manuallyExcluded,
          included,
          imageRect
        });
      }
    }

    const totalTiles = cols * rows;
    const includedCount = activePageNumber;
    const blankCount = tiles.filter(t => t.isBlank).length;

    // Effective DPI based on actual physical placed image dimensions
    const dpiX = imgW / (placedW / MM_PER_INCH);
    const dpiY = imgH / (placedH / MM_PER_INCH);
    const effectiveDpi = Math.round(Math.min(dpiX, dpiY));

    let dpiQuality;
    if (effectiveDpi >= 150) {
      dpiQuality = { level: 'excellent', label: 'Mükemmel', desc: 'Yakından bile çok net baskı.' };
    } else if (effectiveDpi >= 95) {
      dpiQuality = { level: 'good', label: 'İyi', desc: 'Duvar mesafesinden oldukça net.' };
    } else if (effectiveDpi >= 60) {
      dpiQuality = { level: 'fair', label: 'Orta', desc: 'Yakından bakıldığında hafif yumuşama olabilir.' };
    } else {
      dpiQuality = { level: 'low', label: 'Düşük', desc: 'Piksellenme görülebilir; sayfa sayısını azaltın veya daha büyük görsel kullanın.' };
    }

    // Coverage ratio (how well the image fills the grid, used for auto-orientation scoring)
    const visibleW = Math.min(totalW, placedX + placedW) - Math.max(0, placedX);
    const visibleH = Math.min(totalH, placedY + placedH) - Math.max(0, placedY);
    const fillRatio = clamp((Math.max(0, visibleW) * Math.max(0, visibleH)) / (totalW * totalH), 0, 1);
    const cropRatio = clamp((Math.max(0, visibleW) * Math.max(0, visibleH)) / (placedW * placedH), 0, 1);

    return {
      paperSize: config.paperSize || 'a4',
      paperW,
      paperH,
      orientation: resolvedOrientation,
      margin,
      overlap,
      printW,
      printH,
      stepX,
      stepY,
      cols,
      rows,
      totalW,
      totalH,
      placedX,
      placedY,
      placedW,
      placedH,
      posterWidthCm: +(placedW / 10).toFixed(1),
      posterHeightCm: +(placedH / 10).toFixed(1),
      gridWidthCm: +(totalW / 10).toFixed(1),
      gridHeightCm: +(totalH / 10).toFixed(1),
      totalTiles,
      includedCount,
      blankCount,
      effectiveDpi,
      dpiX: Math.round(dpiX),
      dpiY: Math.round(dpiY),
      dpiQuality,
      fillRatio,
      cropRatio,
      tiles
    };
  }

  /**
   * Main entry point: calculates optimal layout (handling 'auto' orientation).
   */
  function computeLayout(config) {
    const reqOrientation = config.orientation || 'auto';

    if (reqOrientation === 'portrait' || reqOrientation === 'landscape') {
      return computeForOrientation(config, reqOrientation);
    }

    // Auto orientation: compare portrait vs landscape
    const p = computeForOrientation(config, 'portrait');
    const l = computeForOrientation(config, 'landscape');

    if (config.sizingMode === 'dimensions') {
      // Prefer fewer active pages; tie-break by smaller total paper area
      if (l.includedCount !== p.includedCount) {
        return l.includedCount < p.includedCount ? l : p;
      }
      const pArea = p.totalW * p.totalH;
      const lArea = l.totalW * l.totalH;
      return lArea < pArea ? l : p;
    }

    // In 'grid' mode:
    if (config.lockAspect) {
      // Prefer fewer pages when aspect locked, or higher fillRatio
      if (l.fillRatio > p.fillRatio + 0.01) return l;
      if (p.fillRatio > l.fillRatio + 0.01) return p;
      return l.includedCount < p.includedCount ? l : p;
    }

    if (config.fitMode === 'cover') {
      // Minimize cropping (maximize cropRatio)
      return l.cropRatio > p.cropRatio ? l : p;
    }

    // Contain / stretch: maximize fillRatio
    return l.fillRatio > p.fillRatio ? l : p;
  }

  return {
    MM_PER_INCH,
    PT_PER_INCH,
    PT_PER_MM,
    PAPER_SIZES,
    mmToPt,
    clamp,
    getPaperDimensions,
    sheetsNeeded,
    totalSpan,
    computeLayout
  };
}));
