/**
 * PosterMatik — Pure-JS Zero-Dependency PDF 1.4 Generator & Print Sheet Renderer
 * Generates standards-compliant multi-page PDFs with exact mm->pt geometry,
 * high-res JPEG tiles, crisp vector cut marks, overlap guides, and Turkish assembly map.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./geometry.js'));
  } else {
    root.PosterPdf = factory(root.PosterGeometry);
  }
}(typeof self !== 'undefined' ? self : this, function (Geo) {
  'use strict';

  const encoder = new TextEncoder();

  function encodeAscii(str) {
    return encoder.encode(str);
  }

  function fmt(n) {
    return Number(n).toFixed(3).replace(/\.?0+$/, '') || '0';
  }

  /**
   * Low-level PDF 1.4 Builder with exact byte-offset xref generation.
   */
  class PdfDocument {
    constructor(meta = {}) {
      this.objects = []; // index 0 unused; 1-based object numbers
      this.pages = [];
      this.meta = {
        title: meta.title || 'Poster Yazıcı',
        creator: 'Kemal Öğretmenim · Poster Yazıcı',
        producer: 'Poster Yazıcı PDF 1.4'
      };
      // Reserve IDs: 1 = Catalog, 2 = Pages tree
      this.catalogId = this._reserveId();
      this.pagesId = this._reserveId();
    }

    _reserveId() {
      this.objects.push(null);
      return this.objects.length; // 1-based
    }

    _setObject(id, contentUint8) {
      this.objects[id - 1] = contentUint8;
    }

    addObject(strOrUint8) {
      const id = this._reserveId();
      const bytes = typeof strOrUint8 === 'string' ? encodeAscii(strOrUint8) : strOrUint8;
      this._setObject(id, bytes);
      return id;
    }

    /**
     * Add a raw JPEG binary stream as an Image XObject.
     */
    addJpegImage(jpegBytes, pixelW, pixelH) {
      const id = this._reserveId();
      const header = encodeAscii(
        `<< /Type /XObject /Subtype /Image /Width ${Math.round(pixelW)} /Height ${Math.round(pixelH)} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
      );
      const footer = encodeAscii('\nendstream');
      const combined = new Uint8Array(header.length + jpegBytes.length + footer.length);
      combined.set(header, 0);
      combined.set(jpegBytes, header.length);
      combined.set(footer, header.length + jpegBytes.length);
      this._setObject(id, combined);
      return id;
    }

    /**
     * Add a page with given width/height in points, content stream string, and map of image XObjects { Im1: objId }.
     */
    addPage(widthPt, heightPt, streamText, xObjects = {}) {
      const streamBytes = encodeAscii(streamText);
      const contentHeader = encodeAscii(`<< /Length ${streamBytes.length} >>\nstream\n`);
      const contentFooter = encodeAscii('\nendstream');
      const contentObj = new Uint8Array(contentHeader.length + streamBytes.length + contentFooter.length);
      contentObj.set(contentHeader, 0);
      contentObj.set(streamBytes, contentHeader.length);
      contentObj.set(contentFooter, contentHeader.length + streamBytes.length);
      const contentId = this.addObject(contentObj);

      const xObjEntries = Object.entries(xObjects)
        .map(([name, refId]) => `/${name} ${refId} 0 R`)
        .join(' ');
      const xObjDict = xObjEntries ? `/XObject << ${xObjEntries} >>` : '';

      const pageDict =
        `<< /Type /Page /Parent ${this.pagesId} 0 R ` +
        `/MediaBox [0 0 ${fmt(widthPt)} ${fmt(heightPt)}] ` +
        `/Resources << /ProcSet [/PDF /ImageC] ${xObjDict} >> ` +
        `/Contents ${contentId} 0 R >>`;

      const pageId = this.addObject(pageDict);
      this.pages.push(pageId);
      return pageId;
    }

    /**
     * Finalize and build the complete PDF binary Uint8Array.
     */
    buildUint8Array() {
      const kidsStr = this.pages.map(id => `${id} 0 R`).join(' ');
      this._setObject(
        this.pagesId,
        encodeAscii(`<< /Type /Pages /Kids [${kidsStr}] /Count ${this.pages.length} >>`)
      );
      this._setObject(
        this.catalogId,
        encodeAscii(`<< /Type /Catalog /Pages ${this.pagesId} 0 R >>`)
      );

      // Sanitize ASCII metadata strings
      const safeMeta = s => String(s || '').replace(/[^\x20-\x7E]/g, '').replace(/[()\\]/g, '');
      const infoId = this.addObject(
        `<< /Title (${safeMeta(this.meta.title)}) /Creator (${safeMeta(this.meta.creator)}) /Producer (${safeMeta(this.meta.producer)}) >>`
      );

      const chunks = [];
      let offset = 0;
      const push = (bytes) => {
        chunks.push(bytes);
        offset += bytes.length;
      };

      // PDF 1.4 Header + binary comment
      push(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A, 0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A]));

      const offsets = new Array(this.objects.length + 1);
      offsets[0] = 0;

      for (let i = 0; i < this.objects.length; i++) {
        const objNum = i + 1;
        offsets[objNum] = offset;
        push(encodeAscii(`${objNum} 0 obj\n`));
        push(this.objects[i]);
        push(encodeAscii('\nendobj\n'));
      }

      const xrefOffset = offset;
      let xref = `xref\n0 ${this.objects.length + 1}\n`;
      xref += '0000000000 65535 f \n';
      for (let objNum = 1; objNum <= this.objects.length; objNum++) {
        xref += String(offsets[objNum]).padStart(10, '0') + ' 00000 n \n';
      }
      push(encodeAscii(xref));

      const trailer =
        `trailer\n<< /Size ${this.objects.length + 1} /Root ${this.catalogId} 0 R /Info ${infoId} 0 R >>\n` +
        `startxref\n${xrefOffset}\n%%EOF\n`;
      push(encodeAscii(trailer));

      const totalLen = offset;
      const out = new Uint8Array(totalLen);
      let cursor = 0;
      for (const chunk of chunks) {
        out.set(chunk, cursor);
        cursor += chunk.length;
      }
      return out;
    }

    buildBlob() {
      const bytes = this.buildUint8Array();
      return new Blob([bytes], { type: 'application/pdf' });
    }
  }

  /**
   * Convert an HTMLCanvasElement to JPEG Uint8Array via toBlob (low memory, fast).
   */
  async function canvasToJpegBytes(canvas, quality = 0.92) {
    if (typeof canvas.toBlob === 'function') {
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('JPEG kodlama başarısız'))), 'image/jpeg', quality);
      });
      const buf = await blob.arrayBuffer();
      return new Uint8Array(buf);
    }
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const base64 = dataUrl.split(',')[1];
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  /**
   * Render a razor-sharp raster text strip (300 DPI) for authentic Turkish characters in PDF margins.
   */
  function createMarginLabelCanvas(text, widthMm, heightMm) {
    const dpi = 300;
    const pxW = Math.max(120, Math.round((widthMm / Geo.MM_PER_INCH) * dpi));
    const pxH = Math.max(24, Math.round((heightMm / Geo.MM_PER_INCH) * dpi));

    const canvas = document.createElement('canvas');
    canvas.width = pxW;
    canvas.height = pxH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, pxW, pxH);

    const fontSize = Math.max(14, Math.round(pxH * 0.62));
    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
    ctx.fillStyle = '#4B5563';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, pxW / 2, pxH / 2 + 1, pxW - 12);
    return canvas;
  }

  /**
   * Extract a single tile's image slice onto an offscreen canvas at exact printable resolution.
   */
  function renderTileImageCanvas(sourceCanvas, tile, targetDpi = 220) {
    if (!tile.imageRect) return null;
    const r = tile.imageRect;

    // Desired pixel dimensions at targetDpi
    const desiredW = Math.round((r.destW_mm / Geo.MM_PER_INCH) * targetDpi);
    const desiredH = Math.round((r.destH_mm / Geo.MM_PER_INCH) * targetDpi);

    // Don't blow up low-res sources excessively, but keep at least enough resolution for crisp down/upsampling
    const maxPx = 4200;
    const minScale = 1;
    let outW = Geo.clamp(desiredW, Math.min(maxPx, Math.max(64, Math.round(r.srcW * minScale))), maxPx);
    let outH = Geo.clamp(desiredH, Math.min(maxPx, Math.max(64, Math.round(r.srcH * minScale))), maxPx);

    // Preserve exact physical aspect ratio of destW_mm / destH_mm
    const destAspect = r.destW_mm / r.destH_mm;
    if (outW / outH > destAspect) {
      outW = Math.max(16, Math.round(outH * destAspect));
    } else {
      outH = Math.max(16, Math.round(outW / destAspect));
    }

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');

    // Fill pure white first so transparent PNGs never turn black in JPEG
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, outW, outH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      sourceCanvas,
      r.srcX, r.srcY, r.srcW, r.srcH,
      0, 0, outW, outH
    );
    return canvas;
  }

  /**
   * Build PDF vector operator stream for cut marks, registration ticks, and overlap alignment guides.
   */
  function buildTileVectorStream(tile, layout, options) {
    const { paperW, paperH, margin, printW, printH, overlap } = layout;
    const px = (mm) => fmt(Geo.mmToPt(mm));
    const py = (mm) => fmt(Geo.mmToPt(paperH - mm));
    const cmds = [];

    const x0 = margin;
    const y0 = margin;
    const x1 = margin + printW;
    const y1 = margin + printH;

    // 1. Cut / Crop Marks at the 4 corners of printable area
    if (options.cutMarks) {
      const gap = Math.min(1.5, margin * 0.25);
      const markLen = Math.min(6, Math.max(2, margin - gap - 0.5));

      cmds.push('q');
      if (margin >= 3) {
        // Outward printer crop marks in the white margin
        cmds.push('0.45 w 0.15 0.17 0.22 RG 0 J');
        const corners = [
          { cx: x0, cy: y0, dx: -1, dy: -1 },
          { cx: x1, cy: y0, dx:  1, dy: -1 },
          { cx: x0, cy: y1, dx: -1, dy:  1 },
          { cx: x1, cy: y1, dx:  1, dy:  1 }
        ];
        for (const c of corners) {
          // Horizontal tick
          cmds.push(`${px(c.cx + c.dx * gap)} ${py(c.cy)} m ${px(c.cx + c.dx * (gap + markLen))} ${py(c.cy)} l S`);
          // Vertical tick
          cmds.push(`${px(c.cx)} ${py(c.cy + c.dy * gap)} m ${px(c.cx)} ${py(c.cy + c.dy * (gap + markLen))} l S`);
        }

        // Overlap alignment ticks in the white margin (so edges align to 0.1 mm!)
        if (overlap > 0) {
          cmds.push('0.55 w 0.85 0.46 0.02 RG'); // amber-orange alignment ticks
          const tickLen = Math.min(4.5, Math.max(2, margin - gap - 0.5));
          if (tile.hasOverlapRight) {
            const ox = x1 - overlap;
            cmds.push(`${px(ox)} ${py(y0 - gap)} m ${px(ox)} ${py(y0 - gap - tickLen)} l S`);
            cmds.push(`${px(ox)} ${py(y1 + gap)} m ${px(ox)} ${py(y1 + gap + tickLen)} l S`);
          }
          if (tile.hasOverlapLeft) {
            const ox = x0 + overlap;
            cmds.push(`${px(ox)} ${py(y0 - gap)} m ${px(ox)} ${py(y0 - gap - tickLen)} l S`);
            cmds.push(`${px(ox)} ${py(y1 + gap)} m ${px(ox)} ${py(y1 + gap + tickLen)} l S`);
          }
          if (tile.hasOverlapBottom) {
            const oy = y1 - overlap;
            cmds.push(`${px(x0 - gap)} ${py(oy)} m ${px(x0 - gap - tickLen)} ${py(oy)} l S`);
            cmds.push(`${px(x1 + gap)} ${py(oy)} m ${px(x1 + gap + tickLen)} ${py(oy)} l S`);
          }
          if (tile.hasOverlapTop) {
            const oy = y0 + overlap;
            cmds.push(`${px(x0 - gap)} ${py(oy)} m ${px(x0 - gap - tickLen)} ${py(oy)} l S`);
            cmds.push(`${px(x1 + gap)} ${py(oy)} m ${px(x1 + gap + tickLen)} ${py(oy)} l S`);
          }
        }
      } else {
        // Tight / 0mm margin fallback: subtle high-contrast inner corner L ticks
        const inLen = 4;
        const corners = [
          { cx: x0, cy: y0, dx:  1, dy:  1 },
          { cx: x1, cy: y0, dx: -1, dy:  1 },
          { cx: x0, cy: y1, dx:  1, dy: -1 },
          { cx: x1, cy: y1, dx: -1, dy: -1 }
        ];
        // White backing stroke then dark core
        cmds.push('1.2 w 1 1 1 RG');
        for (const c of corners) {
          cmds.push(`${px(c.cx)} ${py(c.cy)} m ${px(c.cx + c.dx * inLen)} ${py(c.cy)} l S`);
          cmds.push(`${px(c.cx)} ${py(c.cy)} m ${px(c.cx)} ${py(c.cy + c.dy * inLen)} l S`);
        }
        cmds.push('0.45 w 0.1 0.1 0.1 RG');
        for (const c of corners) {
          cmds.push(`${px(c.cx)} ${py(c.cy)} m ${px(c.cx + c.dx * inLen)} ${py(c.cy)} l S`);
          cmds.push(`${px(c.cx)} ${py(c.cy)} m ${px(c.cx)} ${py(c.cy + c.dy * inLen)} l S`);
        }
      }
      cmds.push('Q');
    }

    // 2. Overlap Glue-Tab Dashed Alignment Guide Lines
    // Drawn on the UNDER-sheet's right & bottom glue boundaries, so when the next sheet overlaps it,
    // the dashed guide line is completely hidden underneath the finished poster!
    if (options.overlapGuides && overlap > 0) {
      cmds.push('q');
      const drawDualDashedLine = (ax, ay, bx, by) => {
        // White backing line for readability over dark images
        cmds.push('0.9 w 1 1 1 RG [] 0 d');
        cmds.push(`${px(ax)} ${py(ay)} m ${px(bx)} ${py(by)} l S`);
        // Crisp amber-slate dashed line
        cmds.push('0.5 w 0.2 0.25 0.35 RG [3.5 3.5] 0 d');
        cmds.push(`${px(ax)} ${py(ay)} m ${px(bx)} ${py(by)} l S`);
      };

      if (tile.hasOverlapRight) {
        drawDualDashedLine(x1 - overlap, y0, x1 - overlap, y1);
      }
      if (tile.hasOverlapBottom) {
        drawDualDashedLine(x0, y1 - overlap, x1, y1 - overlap);
      }
      cmds.push('Q');
    }

    // 3. Subtle hairline border around blank printable area when tile has partial image (helps straight cutting)
    if (options.cutMarks && margin >= 2) {
      cmds.push('q');
      cmds.push('0.2 w 0.78 0.80 0.84 RG [2 4] 0 d');
      cmds.push(
        `${px(x0)} ${py(y1)} ${fmt(Geo.mmToPt(printW))} ${fmt(Geo.mmToPt(printH))} re S`
      );
      cmds.push('Q');
    }

    return cmds.join('\n');
  }

  /**
   * Render a complete single sheet (paper + image + cut marks + overlap guides + margin label)
   * onto a Canvas. Used for single-page preview modal, PNG export, and native window.print().
   */
  function renderSheetCanvas(sourceCanvas, tile, layout, options, pixelWidth = 1000) {
    const { paperW, paperH, margin, printW, printH, overlap } = layout;
    const scale = pixelWidth / paperW; // px per mm
    const pixelHeight = Math.round(paperH * scale);

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(pixelWidth);
    canvas.height = pixelHeight;
    const ctx = canvas.getContext('2d');

    // Paper background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle printable area tint if empty
    const x0 = margin * scale;
    const y0 = margin * scale;
    const wP = printW * scale;
    const hP = printH * scale;

    // Draw image slice
    if (tile.imageRect) {
      const r = tile.imageRect;
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        sourceCanvas,
        r.srcX, r.srcY, r.srcW, r.srcH,
        r.destX_mm * scale,
        r.destY_mm * scale,
        r.destW_mm * scale,
        r.destH_mm * scale
      );
      ctx.restore();
    }

    // Visual overlap highlight tint (only when requested for interactive preview, never in raw print)
    if (options.highlightOverlapInPreview && overlap > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
      const ov = overlap * scale;
      if (tile.hasOverlapRight) {
        ctx.fillRect(x0 + wP - ov, y0, ov, hP);
      }
      if (tile.hasOverlapBottom) {
        ctx.fillRect(x0, y0 + hP - ov, wP, ov);
      }
      ctx.restore();
    }

    // Printable dashed boundary
    if (options.cutMarks && margin >= 2) {
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
      ctx.lineWidth = Math.max(0.75, 0.15 * scale);
      ctx.setLineDash([2 * scale, 3 * scale]);
      ctx.strokeRect(x0, y0, wP, hP);
      ctx.restore();
    }

    // Overlap alignment dashed line (right & bottom glue boundary)
    if (options.overlapGuides && overlap > 0) {
      const drawGuide = (ax, ay, bx, by) => {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = Math.max(1.5, 0.35 * scale);
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = Math.max(0.9, 0.2 * scale);
        ctx.setLineDash([2.2 * scale, 2.2 * scale]);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
        ctx.restore();
      };

      const ov = overlap * scale;
      if (tile.hasOverlapRight) {
        drawGuide(x0 + wP - ov, y0, x0 + wP - ov, y0 + hP);
      }
      if (tile.hasOverlapBottom) {
        drawGuide(x0, y0 + hP - ov, x0 + wP, y0 + hP - ov);
      }
    }

    // Cut / crop marks
    if (options.cutMarks) {
      ctx.save();
      const gap = Math.min(1.5, margin * 0.25) * scale;
      const markLen = Math.min(6, Math.max(2, margin - 2)) * scale;

      if (margin >= 3) {
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = Math.max(1, 0.2 * scale);
        const corners = [
          { cx: x0,      cy: y0,      dx: -1, dy: -1 },
          { cx: x0 + wP, cy: y0,      dx:  1, dy: -1 },
          { cx: x0,      cy: y0 + hP, dx: -1, dy:  1 },
          { cx: x0 + wP, cy: y0 + hP, dx:  1, dy:  1 }
        ];
        ctx.beginPath();
        for (const c of corners) {
          ctx.moveTo(c.cx + c.dx * gap, c.cy);
          ctx.lineTo(c.cx + c.dx * (gap + markLen), c.cy);
          ctx.moveTo(c.cx, c.cy + c.dy * gap);
          ctx.lineTo(c.cx, c.cy + c.dy * (gap + markLen));
        }
        ctx.stroke();

        // Overlap alignment margin ticks
        if (overlap > 0) {
          const ov = overlap * scale;
          const tLen = Math.min(4.5, Math.max(2, margin - 2)) * scale;
          ctx.strokeStyle = '#D97706';
          ctx.lineWidth = Math.max(1.2, 0.25 * scale);
          ctx.beginPath();
          if (tile.hasOverlapRight) {
            const ox = x0 + wP - ov;
            ctx.moveTo(ox, y0 - gap); ctx.lineTo(ox, y0 - gap - tLen);
            ctx.moveTo(ox, y0 + hP + gap); ctx.lineTo(ox, y0 + hP + gap + tLen);
          }
          if (tile.hasOverlapLeft) {
            const ox = x0 + ov;
            ctx.moveTo(ox, y0 - gap); ctx.lineTo(ox, y0 - gap - tLen);
            ctx.moveTo(ox, y0 + hP + gap); ctx.lineTo(ox, y0 + hP + gap + tLen);
          }
          if (tile.hasOverlapBottom) {
            const oy = y0 + hP - ov;
            ctx.moveTo(x0 - gap, oy); ctx.lineTo(x0 - gap - tLen, oy);
            ctx.moveTo(x0 + wP + gap, oy); ctx.lineTo(x0 + wP + gap + tLen, oy);
          }
          if (tile.hasOverlapTop) {
            const oy = y0 + ov;
            ctx.moveTo(x0 - gap, oy); ctx.lineTo(x0 - gap - tLen, oy);
            ctx.moveTo(x0 + wP + gap, oy); ctx.lineTo(x0 + wP + gap + tLen, oy);
          }
          ctx.stroke();
        }
      } else {
        const inLen = 4 * scale;
        const corners = [
          { cx: x0,      cy: y0,      dx:  1, dy:  1 },
          { cx: x0 + wP, cy: y0,      dx: -1, dy:  1 },
          { cx: x0,      cy: y0 + hP, dx:  1, dy: -1 },
          { cx: x0 + wP, cy: y0 + hP, dx: -1, dy: -1 }
        ];
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = Math.max(2.5, 0.5 * scale);
        ctx.beginPath();
        for (const c of corners) {
          ctx.moveTo(c.cx, c.cy); ctx.lineTo(c.cx + c.dx * inLen, c.cy);
          ctx.moveTo(c.cx, c.cy); ctx.lineTo(c.cx, c.cy + c.dy * inLen);
        }
        ctx.stroke();
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = Math.max(1, 0.2 * scale);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Margin text label
    if (options.pageLabels && margin >= 5) {
      const labelText = formatPageLabel(tile, layout);
      const fontSize = Math.max(9, Math.min(margin * 0.42, 3.2) * scale);
      ctx.save();
      ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
      ctx.fillStyle = '#4B5563';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, (paperW * scale) / 2, (paperH - margin / 2) * scale, wP);
      ctx.restore();
    }

    return canvas;
  }

  function formatPageLabel(tile, layout) {
    const paperMeta = Geo.PAPER_SIZES[layout.paperSize] || { name: 'Özel' };
    const orientTr = layout.orientation === 'landscape' ? 'Yatay' : 'Dikey';
    const pagePart = tile.pageNumber
      ? `Sayfa ${tile.pageNumber}/${layout.includedCount}`
      : 'Hariç Tutuldu';
    const overlapPart = layout.overlap > 0 ? `  •  Bindirme: ${layout.overlap} mm` : '';
    return `${pagePart}  •  Satır ${tile.row + 1}, Sütun ${tile.col + 1} (${tile.coordLabel})  •  ${paperMeta.name} ${orientTr}${overlapPart}  •  %100 Gerçek Boyut Yazdırın`;
  }

  /**
   * Render Page 1: Birleştirme Haritası (Assembly Map) onto an offscreen canvas.
   */
  function renderAssemblyMapCanvas(sourceCanvas, layout, options = {}) {
    // Always use portrait matching the selected paper size for a clean readable blueprint sheet
    const shortSide = Math.min(layout.paperW, layout.paperH);
    const longSide = Math.max(layout.paperW, layout.paperH);
    const dpi = 200;
    const W = Math.round((shortSide / Geo.MM_PER_INCH) * dpi);
    const H = Math.round((longSide / Geo.MM_PER_INCH) * dpi);

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const u = W / 1000; // responsive layout unit (1000 units = page width)

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    const pad = 62 * u;

    // Header band
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(pad, pad, W - 2 * pad, 86 * u);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 ${32 * u}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Poster Birleştirme Haritası', pad + 26 * u, pad + 34 * u);

    ctx.fillStyle = '#94A3B8';
    ctx.font = `500 ${16 * u}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText('Poster Yazıcı · Birleştirme Kılavuzu', pad + 26 * u, pad + 64 * u);

    // Specs cards row
    const specsY = pad + 106 * u;
    const cardGap = 14 * u;
    const cardW = (W - 2 * pad - cardGap * 3) / 4;
    const cardH = 74 * u;

    const paperName = (Geo.PAPER_SIZES[layout.paperSize] || { name: 'Özel' }).name;
    const orientTr = layout.orientation === 'landscape' ? 'Yatay' : 'Dikey';

    const specs = [
      { k: 'YAZDIRILACAK SAYFA', v: `${layout.includedCount} Sayfa (${layout.cols}×${layout.rows})` },
      { k: 'POSTER BOYUTU',      v: `${layout.posterWidthCm} × ${layout.posterHeightCm} cm` },
      { k: 'KAĞIT & KENAR',      v: `${paperName} ${orientTr} • ${layout.margin} mm` },
      { k: 'BİNDİRME & KALİTE',  v: `${layout.overlap} mm • ${layout.effectiveDpi} DPI` }
    ];

    specs.forEach((sp, i) => {
      const cx = pad + i * (cardW + cardGap);
      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1.5 * u;
      ctx.fillRect(cx, specsY, cardW, cardH);
      ctx.strokeRect(cx, specsY, cardW, cardH);

      ctx.fillStyle = '#64748B';
      ctx.font = `700 ${11.5 * u}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(sp.k, cx + 14 * u, specsY + 24 * u);

      ctx.fillStyle = '#0F172A';
      ctx.font = `700 ${17.5 * u}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillText(sp.v, cx + 14 * u, specsY + 51 * u, cardW - 24 * u);
    });

    // Visual Assembly Grid Diagram Box
    const boxY = specsY + cardH + 26 * u;
    const footerReserve = 250 * u;
    const boxW = W - 2 * pad;
    const boxH = H - boxY - footerReserve - pad;

    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5 * u;
    ctx.fillRect(pad, boxY, boxW, boxH);
    ctx.strokeRect(pad, boxY, boxW, boxH);

    // Fit totalW x totalH poster inside diagram box
    const innerPad = 42 * u;
    const availW = boxW - 2 * innerPad;
    const availH = boxH - 2 * innerPad;
    const diagScale = Math.min(availW / layout.totalW, availH / layout.totalH);
    const diagW = layout.totalW * diagScale;
    const diagH = layout.totalH * diagScale;
    const diagX = pad + (boxW - diagW) / 2;
    const diagY = boxY + (boxH - diagH) / 2;

    // White poster backdrop
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(diagX, diagY, diagW, diagH);

    // Draw semi-transparent poster image clipped to totalW x totalH
    ctx.save();
    ctx.beginPath();
    ctx.rect(diagX, diagY, diagW, diagH);
    ctx.clip();
    ctx.globalAlpha = 0.55;
    ctx.drawImage(
      sourceCanvas,
      diagX + layout.placedX * diagScale,
      diagY + layout.placedY * diagScale,
      layout.placedW * diagScale,
      layout.placedH * diagScale
    );
    ctx.restore();

    // Draw each tile box & page number badge
    for (const tile of layout.tiles) {
      const tx = diagX + tile.tileX0 * diagScale;
      const ty = diagY + tile.tileY0 * diagScale;
      const tw = layout.printW * diagScale;
      const th = layout.printH * diagScale;

      if (!tile.included) {
        ctx.fillStyle = 'rgba(241, 245, 249, 0.85)';
        ctx.fillRect(tx, ty, tw, th);
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 1.5 * u;
        ctx.setLineDash([6 * u, 6 * u]);
        ctx.strokeRect(tx, ty, tw, th);
        ctx.setLineDash([]);

        // Cross lines
        ctx.beginPath();
        ctx.moveTo(tx + 8 * u, ty + 8 * u);
        ctx.lineTo(tx + tw - 8 * u, ty + th - 8 * u);
        ctx.moveTo(tx + tw - 8 * u, ty + 8 * u);
        ctx.lineTo(tx + 8 * u, ty + th - 8 * u);
        ctx.stroke();

        ctx.fillStyle = '#64748B';
        ctx.font = `600 ${Math.min(18 * u, Math.min(tw, th) * 0.22)}px -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Atlandı', tx + tw / 2, ty + th / 2);
      } else {
        // Overlap bands
        if (layout.overlap > 0) {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
          if (tile.hasOverlapRight) {
            ctx.fillRect(tx + tw - layout.overlap * diagScale, ty, layout.overlap * diagScale, th);
          }
          if (tile.hasOverlapBottom) {
            ctx.fillRect(tx, ty + th - layout.overlap * diagScale, tw, layout.overlap * diagScale);
          }
        }

        // Tile border
        ctx.strokeStyle = '#1D4ED8';
        ctx.lineWidth = 2 * u;
        ctx.strokeRect(tx, ty, tw, th);

        // Center badge
        const badgeR = Math.min(34 * u, Math.min(tw, th) * 0.26);
        const cx = tx + tw / 2;
        const cy = ty + th / 2;

        ctx.fillStyle = '#1D4ED8';
        ctx.beginPath();
        ctx.arc(cx, cy - (badgeR > 16 * u ? 8 * u : 0), badgeR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `700 ${Math.max(12 * u, badgeR * 0.92)}px -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(tile.pageNumber), cx, cy - (badgeR > 16 * u ? 7 * u : -1 * u));

        if (badgeR > 16 * u) {
          const pillW = Math.min(tw - 10 * u, 74 * u);
          const pillH = 22 * u;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
          ctx.fillRect(cx - pillW / 2, cy + badgeR - 2 * u, pillW, pillH);
          ctx.fillStyle = '#1E293B';
          ctx.font = `700 ${13 * u}px -apple-system, sans-serif`;
          ctx.fillText(tile.coordLabel, cx, cy + badgeR + 9 * u);
        }
      }
    }

    // Dimension labels along outer top & left of diagram
    ctx.fillStyle = '#334155';
    ctx.font = `600 ${15 * u}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`Toplam Izgara Genişliği: ${layout.gridWidthCm} cm  (Görsel: ${layout.posterWidthCm} cm)`, diagX + diagW / 2, diagY - 12 * u);

    ctx.save();
    ctx.translate(diagX - 14 * u, diagY + diagH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`Yükseklik: ${layout.gridHeightCm} cm`, 0, 0);
    ctx.restore();

    // Bottom instructions box
    const instY = boxY + boxH + 22 * u;
    const instH = H - instY - pad;

    ctx.fillStyle = '#FFFBEB';
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2 * u;
    ctx.fillRect(pad, instY, boxW, 52 * u);
    ctx.strokeRect(pad, instY, boxW, 52 * u);

    ctx.fillStyle = '#92400E';
    ctx.font = `700 ${17 * u}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('ÖNEMLİ: Yazdırırken ölçek ayarını mutlaka "%100 / Gerçek Boyut" seçin ("Sayfaya Sığdır" kapalı olsun).', pad + 18 * u, instY + 26 * u, boxW - 36 * u);

    const stepsY = instY + 70 * u;
    const steps = [
      `1. Sayfaları sıra numarasıyla yazdırın (Bu kapak sayfasından sonra ${layout.includedCount} poster sayfası yer alır).`,
      layout.overlap > 0
        ? `2. Her sayfanın kenar beyazlığını köşelerdeki kesim işaretlerinden kesin. Sağ/alt kenardaki ${layout.overlap} mm bindirme payını yapıştırma kulakçığı olarak bırakın.`
        : '2. Her sayfanın beyaz kenar boşluklarını köşelerdeki kesim işaretlerinden düzgünce kesin.',
      layout.overlap > 0
        ? '3. Komşu sayfanın kesilmiş kenarını kesikli hizalama çizgisine tam oturtup arka taraftan bantlayın veya yapıştırın.'
        : '3. Sayfaları yukarıdaki harita sırasına göre yan yana hizalayıp arka yüzünden kağıt bant ile birleştirin.'
    ];

    ctx.fillStyle = '#1E293B';
    ctx.font = `500 ${16.5 * u}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    steps.forEach((line, idx) => {
      ctx.fillText(line, pad + 6 * u, stepsY + idx * 36 * u, boxW - 12 * u);
    });

    return { canvas, widthMm: shortSide, heightMm: longSide };
  }

  /**
   * Build the complete multi-page Poster PDF Blob asynchronously with progress reporting.
   */
  async function buildPosterPdf(sourceCanvas, layout, options = {}, onProgress = null) {
    const includedTiles = layout.tiles.filter(t => t.included);
    if (includedTiles.length === 0) {
      throw new Error('Yazdırılacak en az 1 sayfa seçili olmalıdır.');
    }

    const totalSteps = includedTiles.length + (options.includeAssemblyMap ? 1 : 0);
    let completedSteps = 0;

    const report = (label) => {
      if (typeof onProgress === 'function') {
        onProgress({
          done: completedSteps,
          total: totalSteps,
          percent: Math.round((completedSteps / totalSteps) * 100),
          label
        });
      }
    };

    const doc = new PdfDocument({
      title: options.fileName ? `Poster Yazıcı - ${options.fileName}` : 'Poster Yazıcı'
    });

    const targetDpi = Number(options.outputDpi) || 220;
    const jpegQuality = targetDpi >= 260 ? 0.93 : targetDpi >= 200 ? 0.90 : 0.86;

    // Optional Page 1: Birleştirme Haritası
    if (options.includeAssemblyMap) {
      report('Birleştirme haritası hazırlanıyor...');
      await nextTick();
      const mapResult = renderAssemblyMapCanvas(sourceCanvas, layout, options);
      const mapJpeg = await canvasToJpegBytes(mapResult.canvas, 0.90);
      const mapImgId = doc.addJpegImage(mapJpeg, mapResult.canvas.width, mapResult.canvas.height);
      const wPt = Geo.mmToPt(mapResult.widthMm);
      const hPt = Geo.mmToPt(mapResult.heightMm);
      const stream = `q\n${fmt(wPt)} 0 0 ${fmt(hPt)} 0 0 cm\n/ImMap Do\nQ`;
      doc.addPage(wPt, hPt, stream, { ImMap: mapImgId });
      completedSteps++;
      report('Birleştirme haritası eklendi');
    }

    const pageWPt = Geo.mmToPt(layout.paperW);
    const pageHPt = Geo.mmToPt(layout.paperH);

    // Tile pages
    for (let i = 0; i < includedTiles.length; i++) {
      const tile = includedTiles[i];
      report(`Sayfa ${i + 1} / ${includedTiles.length} işleniyor (${tile.coordLabel})...`);
      await nextTick();

      const xObjects = {};
      const streamParts = [];

      // 1. Tile Image XObject at exact millimeter coordinates
      if (tile.imageRect) {
        const tileCanvas = renderTileImageCanvas(sourceCanvas, tile, targetDpi);
        const jpegBytes = await canvasToJpegBytes(tileCanvas, jpegQuality);
        const imgId = doc.addJpegImage(jpegBytes, tileCanvas.width, tileCanvas.height);
        xObjects.ImTile = imgId;

        const r = tile.imageRect;
        const pdfX = Geo.mmToPt(r.destX_mm);
        const pdfW = Geo.mmToPt(r.destW_mm);
        const pdfH = Geo.mmToPt(r.destH_mm);
        const pdfY = Geo.mmToPt(layout.paperH - r.destY_mm - r.destH_mm);

        streamParts.push(
          `q\n${fmt(pdfW)} 0 0 ${fmt(pdfH)} ${fmt(pdfX)} ${fmt(pdfY)} cm\n/ImTile Do\nQ`
        );
      }

      // 2. Pure vector cut marks, registration ticks & overlap guides
      const vecStream = buildTileVectorStream(tile, layout, options);
      if (vecStream) {
        streamParts.push(vecStream);
      }

      // 3. Crisp Turkish margin label (if margin >= 5mm)
      if (options.pageLabels && layout.margin >= 5) {
        const labelH = Math.min(3.6, layout.margin * 0.52);
        const labelW = layout.printW;
        const labelText = formatPageLabel(tile, layout);
        const labelCanvas = createMarginLabelCanvas(labelText, labelW, labelH);
        const labelJpeg = await canvasToJpegBytes(labelCanvas, 0.88);
        const labelId = doc.addJpegImage(labelJpeg, labelCanvas.width, labelCanvas.height);
        xObjects.ImLbl = labelId;

        const lx = Geo.mmToPt(layout.margin);
        const lw = Geo.mmToPt(labelW);
        const lh = Geo.mmToPt(labelH);
        // Place cleanly centered in bottom white margin
        const ly = Geo.mmToPt((layout.margin - labelH) / 2);

        streamParts.push(
          `q\n${fmt(lw)} 0 0 ${fmt(lh)} ${fmt(lx)} ${fmt(ly)} cm\n/ImLbl Do\nQ`
        );
      }

      doc.addPage(pageWPt, pageHPt, streamParts.join('\n'), xObjects);
      completedSteps++;
    }

    report('PDF derleniyor...');
    await nextTick();
    const blob = doc.buildBlob();
    report('Hazır!');
    return blob;
  }

  function nextTick() {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  return {
    PdfDocument,
    renderTileImageCanvas,
    renderSheetCanvas,
    renderAssemblyMapCanvas,
    formatPageLabel,
    buildPosterPdf
  };
}));
