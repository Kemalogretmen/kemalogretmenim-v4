/**
 * Kelime Avı Atölyesi — A4 Çalışma Kağıdı, Saf JS PDF 1.4, PNG & Vektör SVG Dışa Aktarım Motoru
 * Harici kütüphane gerektirmez · Türkçe tam destekli · 200+ DPI baskı kalitesi
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./engine.js'), require('./qr.js'));
  } else {
    root.KelimeExport = factory(root.KelimeEngine, root.KelimeQR);
  }
}(typeof self !== 'undefined' ? self : this, function (Engine, QR) {
  'use strict';

  // Sanal A4 tuval boyutu (96 DPI A4 oranı: 794 x 1123)
  const A4_W = 794;
  const A4_H = 1123;
  // PDF A4 boyutu (points: 210mm x 297mm)
  const A4_PT_W = 595.276;
  const A4_PT_H = 841.89;

  // Cevap anahtarı ve oyun kapsül renkleri (rafine baskı ve ekran paleti)
  const PILL_COLORS = [
    { stroke: 'rgba(79, 70, 229, 0.32)',  solid: '#4F46E5' },
    { stroke: 'rgba(2, 132, 199, 0.32)',  solid: '#0284C7' },
    { stroke: 'rgba(13, 148, 136, 0.34)', solid: '#0D9488' },
    { stroke: 'rgba(217, 119, 6, 0.36)',  solid: '#D97706' },
    { stroke: 'rgba(219, 39, 119, 0.30)', solid: '#DB2777' },
    { stroke: 'rgba(8, 145, 178, 0.34)',  solid: '#0891B2' },
    { stroke: 'rgba(220, 38, 38, 0.30)',  solid: '#DC2626' },
    { stroke: 'rgba(101, 163, 13, 0.36)', solid: '#65A30D' }
  ];

  const FONT_FAMILIES = {
    modern:   '"Inter", "Avenir Next", "Nunito", -apple-system, "Segoe UI", sans-serif',
    primary:  '"Century Gothic", "Trebuchet MS", "Avenir", "Segoe UI", sans-serif',
    mono:     '"SF Mono", "JetBrains Mono", "Consolas", "Courier New", monospace',
    dyslexia: '"Verdana", "Tahoma", "Trebuchet MS", sans-serif'
  };

  function getFontStack(fontStyle) {
    return FONT_FAMILIES[fontStyle] || FONT_FAMILIES.modern;
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function wrapLines(ctx, text, maxWidth) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth) {
        current = test;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  function drawFrameDecoration(ctx, x, y, w, h, frameStyle, bw) {
    if (frameStyle === 'none') return;

    const accent = bw ? '#1E293B' : '#4F46E5';
    const accentSoft = bw ? '#CBD5E1' : '#E2E8F0';

    if (frameStyle === 'modern') {
      ctx.save();
      ctx.strokeStyle = accentSoft;
      ctx.lineWidth = 1.4;
      roundRectPath(ctx, x, y, w, h, 14);
      ctx.stroke();
      // İnce zarif üst vurgu çizgisi
      ctx.fillStyle = accent;
      roundRectPath(ctx, x + 22, y - 2, 74, 4, 2);
      ctx.fill();
      ctx.restore();
    } else if (frameStyle === 'notebook') {
      ctx.save();
      ctx.strokeStyle = bw ? '#475569' : '#CBD5E1';
      ctx.lineWidth = 1.4;
      roundRectPath(ctx, x, y, w, h, 8);
      ctx.stroke();
      ctx.strokeStyle = bw ? '#94A3B8' : '#FCA5A5';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x + 24, y + 6);
      ctx.lineTo(x + 24, y + h - 6);
      ctx.stroke();
      ctx.fillStyle = bw ? '#E2E8F0' : '#EEF2FF';
      ctx.strokeStyle = bw ? '#64748B' : '#94A3B8';
      ctx.lineWidth = 1;
      for (let py = y + 36; py < y + h - 24; py += 46) {
        ctx.beginPath();
        ctx.arc(x + 12, py, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    } else if (frameStyle === 'stars') {
      ctx.save();
      ctx.strokeStyle = bw ? '#334155' : '#C7D2FE';
      ctx.lineWidth = 1.5;
      roundRectPath(ctx, x, y, w, h, 16);
      ctx.stroke();
      ctx.strokeStyle = bw ? '#94A3B8' : '#E0E7FF';
      ctx.lineWidth = 1;
      roundRectPath(ctx, x + 5, y + 5, w - 10, h - 10, 12);
      ctx.stroke();
      const corners = [
        [x + 16, y + 16], [x + w - 16, y + 16],
        [x + 16, y + h - 16], [x + w - 16, y + h - 16]
      ];
      ctx.fillStyle = bw ? '#475569' : '#D97706';
      for (const [cx, cy] of corners) {
        drawStarShape(ctx, cx, cy, 5, 7.5, 3.2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawStarShape(ctx, cx, cy, spikes, outerR, innerR) {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.closePath();
  }

  function formatWordBankEntry(item, wordBankMode, letterCase, lang, isAnswerKey) {
    const wordText = Engine.formatDisplayWord(item.display, letterCase, lang);
    if (isAnswerKey) {
      if (wordBankMode === 'clues' && item.clue) return `${item.clue} → ${wordText}`;
      if (wordBankMode === 'emoji' && item.emoji) return `${item.emoji} ${wordText}`;
      return wordText;
    }
    switch (wordBankMode) {
      case 'clues':
        return item.clue ? `${item.clue} (${item.clean.length})` : wordText;
      case 'emoji':
        return item.emoji
          ? `${item.emoji}  ${'_ '.repeat(item.clean.length).trim()}`
          : wordText;
      case 'masked':
        return Engine.formatDisplayWord(item.masked || wordText, letterCase, lang);
      case 'anagram':
        return Engine.formatDisplayWord(item.anagram || wordText, letterCase, lang);
      case 'hidden':
        return `${'_ '.repeat(item.clean.length).trim()} (${item.clean.length})`;
      case 'list':
      default:
        return item.emoji ? `${item.emoji} ${wordText}` : wordText;
    }
  }

  /**
   * Tek bir çalışma sayfası bölgesini (Tam A4 veya Yarım A4) çizer.
   */
  function drawWorksheetRegion(ctx, puzzle, opts, region) {
    const { rx, ry, rw, rh, compact } = region;
    const bw = Boolean(opts.bwMode);
    const isAnswerKey = Boolean(opts.isAnswerKey);
    const fontStack = getFontStack(opts.fontStyle);
    const padX = compact ? 26 : 36;
    const padY = compact ? 18 : 28;
    const frameInset = opts.frameStyle === 'notebook' ? 14 : 0;

    const innerX = rx + padX + frameInset;
    const innerW = rw - padX * 2 - frameInset;
    let cursorY = ry + padY;

    // Çerçeve
    drawFrameDecoration(
      ctx,
      rx + (compact ? 14 : 20),
      ry + (compact ? 10 : 18),
      rw - (compact ? 28 : 40),
      rh - (compact ? 20 : 36),
      opts.frameStyle || 'modern',
      bw
    );

    const ink = '#0F172A';
    const muted = bw ? '#475569' : '#64748B';
    const accent = bw ? '#1E293B' : '#4F46E5';
    const lineCol = bw ? '#94A3B8' : '#CBD5E1';

    // 1. ÖĞRENCİ BİLGİ ŞERİDİ
    if (opts.showStudentBar && !isAnswerKey) {
      ctx.save();
      ctx.font = `700 ${compact ? 10.5 : 12}px ${fontStack}`;
      ctx.fillStyle = ink;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';

      const barH = compact ? 22 : 28;
      const barMid = cursorY + barH / 2;
      const col1W = innerW * 0.46;
      const col2W = innerW * 0.27;

      ctx.fillText('Adı Soyadı:', innerX, barMid);
      ctx.strokeStyle = lineCol;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(innerX + (compact ? 62 : 72), barMid + 5);
      ctx.lineTo(innerX + col1W - 12, barMid + 5);
      ctx.stroke();

      ctx.fillText('Sınıf / No:', innerX + col1W, barMid);
      ctx.beginPath();
      ctx.moveTo(innerX + col1W + (compact ? 54 : 62), barMid + 5);
      ctx.lineTo(innerX + col1W + col2W - 12, barMid + 5);
      ctx.stroke();

      ctx.fillText('Tarih:', innerX + col1W + col2W, barMid);
      ctx.beginPath();
      ctx.moveTo(innerX + col1W + col2W + (compact ? 34 : 40), barMid + 5);
      ctx.lineTo(innerX + innerW, barMid + 5);
      ctx.stroke();

      ctx.restore();
      cursorY += barH + (compact ? 6 : 10);
    }

    // 2. BAŞLIK, YÖNERGE VE İSTEĞE BAĞLI QR KOD
    const qrSize = (!compact && opts.showQrOnSheet && opts.shareUrl && !isAnswerKey) ? 64 : 0;
    const headerTextW = qrSize ? innerW - qrSize - 16 : innerW;

    ctx.save();
    // Cevap anahtarı rozeti
    if (isAnswerKey) {
      const badgeText = 'CEVAP ANAHTARI';
      ctx.font = `800 ${compact ? 10 : 11}px ${fontStack}`;
      const bwWidth = ctx.measureText(badgeText).width + 18;
      ctx.fillStyle = bw ? '#1E293B' : '#0F9F75';
      roundRectPath(ctx, innerX, cursorY, bwWidth, compact ? 18 : 22, 999);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, innerX + bwWidth / 2, cursorY + (compact ? 9.5 : 11.5));
      cursorY += compact ? 22 : 28;
    }

    const titleText = (opts.title || 'Kelime Avı').trim();
    ctx.font = `900 ${compact ? 19 : 26}px ${fontStack}`;
    ctx.fillStyle = ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(titleText, innerX, cursorY, headerTextW);
    cursorY += compact ? 23 : 33;

    const subtitleText = (opts.subtitle || '').trim();
    if (subtitleText) {
      ctx.font = `600 ${compact ? 10.5 : 12.5}px ${fontStack}`;
      ctx.fillStyle = muted;
      const subLines = wrapLines(ctx, subtitleText, headerTextW).slice(0, 2);
      for (const line of subLines) {
        ctx.fillText(line, innerX, cursorY);
        cursorY += compact ? 14 : 17;
      }
    }

    // QR Kod çiz (varsa)
    if (qrSize && QR) {
      const qrRes = QR.generateMatrix(opts.shareUrl);
      if (qrRes) {
        const qrX = innerX + innerW - qrSize;
        const qrY = ry + padY + (opts.showStudentBar ? 34 : 0);
        const modSize = qrSize / (qrRes.size + 4);
        ctx.fillStyle = '#FFFFFF';
        roundRectPath(ctx, qrX - 3, qrY - 3, qrSize + 6, qrSize + 18, 6);
        ctx.fill();
        ctx.strokeStyle = lineCol;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#111827';
        for (let r = 0; r < qrRes.size; r++) {
          for (let c = 0; c < qrRes.size; c++) {
            if (qrRes.matrix[r][c]) {
              ctx.fillRect(
                qrX + (c + 2) * modSize,
                qrY + (r + 2) * modSize,
                Math.ceil(modSize),
                Math.ceil(modSize)
              );
            }
          }
        }
        ctx.font = `700 8px ${fontStack}`;
        ctx.fillStyle = muted;
        ctx.textAlign = 'center';
        ctx.fillText('Dijital Çöz', qrX + qrSize / 2, qrY + qrSize + 3);
      }
    }
    ctx.restore();

    cursorY += compact ? 6 : 12;

    // 3. ALT ALANLAR İÇİN YÜKSEKLİK REZERVASYONU HESAPLA
    const footerH = compact ? 16 : 24;
    const bottomLimitY = ry + rh - padY - footerH;

    const hasSecret = puzzle.secret && puzzle.secret.enabled && puzzle.secret.fits;
    const extraType = hasSecret ? 'secret' : (opts.extraActivity || 'none');
    let extraH = 0;
    if (!compact) {
      if (extraType === 'secret') extraH = 66;
      else if (extraType === 'sentences' && !isAnswerKey) extraH = 104;
      else if (extraType === 'selfeval' && !isAnswerKey) extraH = 50;
    } else if (extraType === 'secret') {
      extraH = 38;
    }

    const wordBankMode = opts.wordBankMode || 'list';
    const isClueStyle = wordBankMode === 'clues';
    const itemCount = puzzle.placed.length;
    const bankCols = isClueStyle
      ? (itemCount > 6 && !compact ? 2 : 1)
      : (compact ? 4 : (wordBankMode === 'emoji' ? 3 : 4));
    const bankRows = Math.max(1, Math.ceil(itemCount / bankCols));
    const bankRowH = isClueStyle ? (compact ? 16 : 22) : (compact ? 18 : 25);
    const bankHeaderH = compact ? 16 : 22;
    const wordBankH = wordBankMode === 'hidden' && !isAnswerKey
      ? (compact ? 28 : 42)
      : Math.min(compact ? 120 : 250, bankHeaderH + bankRows * bankRowH + 14);

    const availableGridH = Math.max(120, bottomLimitY - cursorY - wordBankH - extraH - (compact ? 14 : 24));
    const availableGridW = innerW;

    // 4. BULMACA IZGARASI
    const cellGap = puzzle.cols >= 16 || compact ? 2 : 3;
    const maxCellW = (availableGridW - cellGap * (puzzle.cols - 1) - 16) / puzzle.cols;
    const maxCellH = (availableGridH - cellGap * (puzzle.rows - 1) - 16) / puzzle.rows;
    const cellSize = Math.max(14, Math.min(compact ? 30 : 46, Math.floor(Math.min(maxCellW, maxCellH))));

    const gridW = puzzle.cols * cellSize + (puzzle.cols - 1) * cellGap;
    const gridH = puzzle.rows * cellSize + (puzzle.rows - 1) * cellGap;
    const gridX = innerX + (innerW - gridW) / 2;
    const gridY = cursorY + Math.max(0, Math.min(14, (availableGridH - gridH) / 3));

    // Izgara kutusu arkaplanı (sadece dikdörtgen ise)
    if (puzzle.shape === 'rect') {
      ctx.save();
      ctx.fillStyle = bw ? '#FFFFFF' : '#F8FAFC';
      ctx.strokeStyle = bw ? '#334155' : '#CBD5E1';
      ctx.lineWidth = bw ? 1.6 : 1.4;
      roundRectPath(ctx, gridX - 8, gridY - 8, gridW + 16, gridH + 16, 12);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    const secretSet = new Set(
      (puzzle.secret && puzzle.secret.cells || []).map(c => `${c.x}-${c.y}`)
    );

    // Hücre kutuları
    for (let y = 0; y < puzzle.rows; y++) {
      for (let x = 0; x < puzzle.cols; x++) {
        if (!puzzle.mask[y][x]) continue;
        const cx = gridX + x * (cellSize + cellGap);
        const cy = gridY + y * (cellSize + cellGap);
        const isSecretCell = isAnswerKey && secretSet.has(`${x}-${y}`);

        ctx.save();
        ctx.fillStyle = isSecretCell
          ? (bw ? '#E2E8F0' : '#FEF3C7')
          : '#FFFFFF';
        ctx.strokeStyle = isSecretCell
          ? (bw ? '#334155' : '#F59E0B')
          : (bw ? '#CBD5E1' : '#E2E8F0');
        ctx.lineWidth = isSecretCell ? 1.5 : 0.9;
        roundRectPath(ctx, cx, cy, cellSize, cellSize, Math.min(6, cellSize * 0.18));
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // Cevap anahtarında kapsül (pill) vurguları (harflerin arkasında)
    if (isAnswerKey) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineWidth = cellSize * 0.76;
      puzzle.placed.forEach((item, idx) => {
        const pal = PILL_COLORS[idx % PILL_COLORS.length];
        const x1 = gridX + item.start.x * (cellSize + cellGap) + cellSize / 2;
        const y1 = gridY + item.start.y * (cellSize + cellGap) + cellSize / 2;
        const x2 = gridX + item.end.x * (cellSize + cellGap) + cellSize / 2;
        const y2 = gridY + item.end.y * (cellSize + cellGap) + cellSize / 2;

        ctx.strokeStyle = bw ? 'rgba(30, 41, 59, 0.22)' : pal.stroke;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // İnce dış çizgi (özellikle siyah-beyaz baskıda kapsülleri net ayırır)
        if (bw) {
          ctx.save();
          ctx.lineWidth = 1.4;
          ctx.strokeStyle = '#0F172A';
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const dist = Math.hypot(x2 - x1, y2 - y1);
          const r = cellSize * 0.38;
          ctx.translate(x1, y1);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.arc(0, 0, r, Math.PI / 2, -Math.PI / 2);
          ctx.arc(dist, 0, r, -Math.PI / 2, Math.PI / 2);
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }
      });
      ctx.restore();
    }

    // Harfleri çiz
    const letterSize = Math.max(10, Math.round(cellSize * (opts.letterCase === 'lower' ? 0.56 : 0.54)));
    ctx.save();
    ctx.font = `800 ${letterSize}px ${fontStack}`;
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let y = 0; y < puzzle.rows; y++) {
      for (let x = 0; x < puzzle.cols; x++) {
        if (!puzzle.mask[y][x]) continue;
        const ch = Engine.formatLetter(puzzle.grid[y][x], opts.letterCase, puzzle.language);
        const cx = gridX + x * (cellSize + cellGap) + cellSize / 2;
        const cy = gridY + y * (cellSize + cellGap) + cellSize / 2 + 0.5;
        ctx.fillText(ch, cx, cy);
      }
    }
    ctx.restore();

    // 5. KELİME BANKASI / İPUCU LİSTESİ
    let bankY = gridY + gridH + (compact ? 14 : 22);
    ctx.save();
    const bankTitle = wordBankMode === 'clues'
      ? 'İPUÇLARINI ÇÖZ VE KELİMELERİ BUL'
      : wordBankMode === 'emoji'
        ? 'GÖRSELLERİ TANI VE KELİMELERİ BUL'
        : wordBankMode === 'anagram'
          ? 'KARIŞIK HARFLERİ ÇÖZ VE BUL'
          : wordBankMode === 'masked'
            ? 'EKSİK HARFLERİ TAMAMLA VE BUL'
            : wordBankMode === 'hidden'
              ? `GİZLİ KELİME AVI (${puzzle.placed.length} KELİME)`
              : `ARANACAK KELİMELER (${puzzle.placed.length})`;

    ctx.font = `800 ${compact ? 10 : 12}px ${fontStack}`;
    ctx.fillStyle = accent;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(bankTitle, innerX, bankY);

    ctx.strokeStyle = bw ? '#CBD5E1' : '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(innerX, bankY + (compact ? 13 : 17));
    ctx.lineTo(innerX + innerW, bankY + (compact ? 13 : 17));
    ctx.stroke();

    const listStartY = bankY + (compact ? 18 : 24);

    if (wordBankMode === 'hidden' && !isAnswerKey) {
      ctx.font = `600 ${compact ? 10 : 12}px ${fontStack}`;
      ctx.fillStyle = muted;
      ctx.fillText(
        `Bu bulmacada ${puzzle.placed.length} gizli kelime saklı! Bulduklarını aşağıya yazabilirsin.`,
        innerX,
        listStartY
      );
    } else {
      const colW = innerW / bankCols;
      const itemFontSize = isClueStyle ? (compact ? 9.5 : 11.5) : (compact ? 10.5 : 12.5);
      ctx.font = `700 ${itemFontSize}px ${fontStack}`;
      ctx.textBaseline = 'middle';

      puzzle.placed.forEach((item, idx) => {
        const col = idx % bankCols;
        const row = Math.floor(idx / bankCols);
        const ix = innerX + col * colW;
        const iy = listStartY + row * bankRowH + bankRowH / 2;

        // Küçük onay kutusu (checkbox) veya renk noktası
        if (isAnswerKey) {
          const pal = PILL_COLORS[idx % PILL_COLORS.length];
          ctx.fillStyle = bw ? '#1E293B' : pal.solid;
          ctx.beginPath();
          ctx.arc(ix + 6, iy, compact ? 3.5 : 4.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = bw ? '#475569' : '#94A3B8';
          ctx.lineWidth = 1.2;
          roundRectPath(ctx, ix + 1, iy - (compact ? 4.5 : 5.5), compact ? 9 : 11, compact ? 9 : 11, 2.5);
          ctx.stroke();
        }

        const label = formatWordBankEntry(item, wordBankMode, opts.letterCase, puzzle.language, isAnswerKey);
        ctx.fillStyle = ink;
        const prefix = isClueStyle ? `${idx + 1}. ` : '';
        ctx.fillText(prefix + label, ix + (compact ? 15 : 19), iy + 0.5, colW - (compact ? 20 : 26));
      });
    }
    ctx.restore();

    // 6. EKSTRA ALT ETKİNLİK ALANI (GİZLİ ŞİFRE / CÜMLE KURMA / ÖZ-DEĞERLENDİRME)
    const extraY = bottomLimitY - extraH - 4;
    if (extraH > 0) {
      ctx.save();
      if (extraType === 'secret') {
        ctx.fillStyle = bw ? '#F8FAFC' : '#FFFBEB';
        ctx.strokeStyle = bw ? '#475569' : '#F59E0B';
        ctx.lineWidth = 1.3;
        roundRectPath(ctx, innerX, extraY, innerW, extraH - 4, 10);
        ctx.fill();
        ctx.stroke();

        ctx.font = `800 ${compact ? 9.5 : 11.5}px ${fontStack}`;
        ctx.fillStyle = bw ? '#1E293B' : '#B45309';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(
          compact
            ? 'GİZLİ ŞİFRE (İşaretlenmeyen harfleri sırayla yaz):'
            : 'GİZLİ ŞİFRE: Bulmacada kullanılmayan harfleri soldan sağa sırayla kutulara yaz!',
          innerX + 12,
          extraY + (compact ? 5 : 9)
        );

        // Şifre harf kutucukları
        const displayChars = puzzle.secret.display.split('');
        const boxSize = compact ? 15 : Math.min(24, Math.floor((innerW - 28) / Math.max(12, displayChars.length + 2)));
        const gap = compact ? 2.5 : 4;
        let bx = innerX + 12;
        const by = extraY + (compact ? 18 : 30);

        for (const ch of displayChars) {
          if (ch === ' ') {
            bx += boxSize * 0.6;
            continue;
          }
          if (bx + boxSize > innerX + innerW - 10) break;
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = bw ? '#475569' : '#D97706';
          ctx.lineWidth = 1.1;
          roundRectPath(ctx, bx, by, boxSize, boxSize, 4);
          ctx.fill();
          ctx.stroke();

          if (isAnswerKey) {
            ctx.font = `800 ${Math.round(boxSize * 0.6)}px ${fontStack}`;
            ctx.fillStyle = ink;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
              Engine.formatLetter(ch, opts.letterCase, puzzle.language),
              bx + boxSize / 2,
              by + boxSize / 2 + 0.5
            );
          }
          bx += boxSize + gap;
        }
      } else if (extraType === 'sentences' && !isAnswerKey) {
        ctx.font = `800 11.5px ${fontStack}`;
        ctx.fillStyle = accent;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('EK ETKİNLİK: Bulduğun kelimelerden 3 tanesiyle anlamlı cümleler kur:', innerX, extraY);
        ctx.strokeStyle = lineCol;
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const ly = extraY + 34 + i * 26;
          ctx.font = `700 11px ${fontStack}`;
          ctx.fillStyle = muted;
          ctx.fillText(`${i + 1}.`, innerX, ly - 12);
          ctx.beginPath();
          ctx.moveTo(innerX + 18, ly);
          ctx.lineTo(innerX + innerW, ly);
          ctx.stroke();
        }
      } else if (extraType === 'selfeval' && !isAnswerKey) {
        ctx.fillStyle = bw ? '#F8FAFC' : '#F5F3FF';
        ctx.strokeStyle = bw ? '#CBD5E1' : '#DDD6FE';
        ctx.lineWidth = 1.2;
        roundRectPath(ctx, innerX, extraY, innerW, 40, 10);
        ctx.fill();
        ctx.stroke();
        ctx.font = `700 12px ${fontStack}`;
        ctx.fillStyle = ink;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          'Öz Değerlendirme:   ☐ Çok Kolaydı     ☐ Çok Eğlenceliydi     ☐ Biraz Zorlandım',
          innerX + 16,
          extraY + 20
        );
      }
      ctx.restore();
    }

    // 7. ALT BİLGİ (FOOTER)
    ctx.save();
    const footY = ry + rh - padY - (compact ? 4 : 8);
    ctx.font = `600 ${compact ? 8.5 : 10}px ${fontStack}`;
    ctx.fillStyle = muted;
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'left';
    const sig = (opts.footerText || 'Kelime Avı Atölyesi').trim();
    ctx.fillText(sig, innerX, footY);
    ctx.textAlign = 'right';
    ctx.fillText(
      `${isAnswerKey ? 'Cevap Anahtarı' : 'Çalışma Kağıdı'} · ${puzzle.cols}×${puzzle.rows} · #${puzzle.seed}`,
      innerX + innerW,
      footY
    );
    ctx.restore();
  }

  /**
   * A4 Tuvalini oluşturur (canlı önizleme veya 200+ DPI çıktı için).
   */
  function renderWorksheetToCanvas(canvas, puzzle, options) {
    const opts = options || {};
    const scale = Number(opts.scale) || 1;
    canvas.width = Math.round(A4_W * scale);
    canvas.height = Math.round(A4_H * scale);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    // Beyaz A4 zemin
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, A4_W, A4_H);

    if (opts.sheetLayout === 'half' && !opts.isAnswerKey) {
      // Bir A4'te 2'li yarım sayfa (kağıt tasarrufu) + kesim çizgisi
      const halfH = A4_H / 2;
      drawWorksheetRegion(ctx, puzzle, opts, { rx: 0, ry: 0, rw: A4_W, rh: halfH - 4, compact: true });
      drawWorksheetRegion(ctx, puzzle, opts, { rx: 0, ry: halfH + 4, rw: A4_W, rh: halfH - 4, compact: true });

      // Kesim çizgisi
      ctx.save();
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(22, halfH);
      ctx.lineTo(A4_W - 22, halfH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(A4_W / 2 - 42, halfH - 9, 84, 18);
      ctx.font = '700 10px sans-serif';
      ctx.fillStyle = '#64748B';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✂ KESİM ÇİZGİSİ', A4_W / 2, halfH);
      ctx.restore();
    } else {
      drawWorksheetRegion(ctx, puzzle, opts, { rx: 0, ry: 0, rw: A4_W, rh: A4_H, compact: false });
    }
  }

  // ==================== SAF JS ÇOK SAYFALI PDF 1.4 YAZICI ====================

  function dataUrlToUint8Array(dataUrl) {
    const base64 = dataUrl.split(',')[1];
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function concatUint8(chunks) {
    let total = 0;
    for (const c of chunks) total += c.length;
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      out.set(c, offset);
      offset += c.length;
    }
    return out;
  }

  function asciiBytes(str) {
    const arr = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i) & 0x7F;
    return arr;
  }

  /**
   * JPEG byte dizileri listesinden standartlara uygun çok sayfalı A4 PDF 1.4 Blob'u oluşturur.
   */
  function buildMultiPagePdfBytes(pageJpegs) {
    const objects = []; // 1-indexed via objects[id - 1]
    const reserve = () => { objects.push(null); return objects.length; };
    const setObj = (id, bytes) => { objects[id - 1] = bytes; };

    const catalogId = reserve(); // 1
    const pagesId = reserve();   // 2
    const pageIds = [];

    for (let i = 0; i < pageJpegs.length; i++) {
      const { jpegBytes, pixelW, pixelH } = pageJpegs[i];
      const imgId = reserve();
      const imgHeader = asciiBytes(
        `<< /Type /XObject /Subtype /Image /Width ${pixelW} /Height ${pixelH} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
      );
      const imgFooter = asciiBytes('\nendstream');
      setObj(imgId, concatUint8([imgHeader, jpegBytes, imgFooter]));

      const streamStr = `q\n${A4_PT_W.toFixed(3)} 0 0 ${A4_PT_H.toFixed(3)} 0 0 cm\n/Im0 Do\nQ\n`;
      const streamBytes = asciiBytes(streamStr);
      const contentId = reserve();
      setObj(contentId, concatUint8([
        asciiBytes(`<< /Length ${streamBytes.length} >>\nstream\n`),
        streamBytes,
        asciiBytes('endstream')
      ]));

      const pageId = reserve();
      setObj(pageId, asciiBytes(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${A4_PT_W.toFixed(3)} ${A4_PT_H.toFixed(3)}] ` +
        `/Resources << /XObject << /Im0 ${imgId} 0 R >> >> /Contents ${contentId} 0 R >>`
      ));
      pageIds.push(pageId);
    }

    setObj(catalogId, asciiBytes(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`));
    setObj(pagesId, asciiBytes(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`));

    const chunks = [];
    let offset = 0;
    const push = (bytes) => { chunks.push(bytes); offset += bytes.length; };

    // PDF header + binary marker
    push(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A, 0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A]));

    const offsets = [0];
    for (let i = 0; i < objects.length; i++) {
      offsets.push(offset);
      push(asciiBytes(`${i + 1} 0 obj\n`));
      push(objects[i]);
      push(asciiBytes('\nendobj\n'));
    }

    const xrefPos = offset;
    push(asciiBytes(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`));
    for (let i = 1; i <= objects.length; i++) {
      push(asciiBytes(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`));
    }
    push(asciiBytes(
      `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`
    ));

    return concatUint8(chunks);
  }

  function exportWorksheetPdf(puzzle, options) {
    const opts = options || {};
    const pages = [];
    const scale = 2.08; // ~200 DPI (1652 x 2336 px)

    // Sayfa 1: Öğrenci Çalışma Kağıdı
    const c1 = document.createElement('canvas');
    renderWorksheetToCanvas(c1, puzzle, Object.assign({}, opts, { scale, isAnswerKey: false }));
    pages.push({
      jpegBytes: dataUrlToUint8Array(c1.toDataURL('image/jpeg', 0.94)),
      pixelW: c1.width,
      pixelH: c1.height
    });

    // Sayfa 2: Cevap Anahtarı (isteğe bağlı)
    if (opts.includeAnswerKey !== false) {
      const c2 = document.createElement('canvas');
      renderWorksheetToCanvas(c2, puzzle, Object.assign({}, opts, { scale, isAnswerKey: true, sheetLayout: 'full' }));
      pages.push({
        jpegBytes: dataUrlToUint8Array(c2.toDataURL('image/jpeg', 0.94)),
        pixelW: c2.width,
        pixelH: c2.height
      });
    }

    const pdfBytes = buildMultiPagePdfBytes(pages);
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  // ==================== VEKTÖR SVG DIŞA AKTARIM ====================

  function escapeXml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildPuzzleSvg(puzzle, options) {
    const opts = options || {};
    const cell = 44;
    const gap = 4;
    const pad = 36;
    const gridW = puzzle.cols * cell + (puzzle.cols - 1) * gap;
    const gridH = puzzle.rows * cell + (puzzle.rows - 1) * gap;
    const headerH = 66;
    const colsPerRow = Math.min(4, Math.max(2, Math.floor(gridW / 140)));
    const listRows = Math.ceil(puzzle.placed.length / colsPerRow);
    const listH = 44 + listRows * 28;
    const totalW = Math.max(520, gridW + pad * 2);
    const totalH = headerH + gridH + listH + pad;
    const gridX = (totalW - gridW) / 2;
    const gridY = headerH;
    const fontStack = getFontStack(opts.fontStyle);

    const parts = [];
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">`);
    parts.push(`<rect width="${totalW}" height="${totalH}" fill="#ffffff" rx="16"/>`);
    parts.push(`<text x="${pad}" y="42" font-family=${JSON.stringify(fontStack)} font-size="26" font-weight="900" fill="#14213d">${escapeXml(opts.title || 'Kelime Avı')}</text>`);

    // Hücreler
    for (let y = 0; y < puzzle.rows; y++) {
      for (let x = 0; x < puzzle.cols; x++) {
        if (!puzzle.mask[y][x]) continue;
        const cx = gridX + x * (cell + gap);
        const cy = gridY + y * (cell + gap);
        parts.push(`<rect x="${cx}" y="${cy}" width="${cell}" height="${cell}" rx="8" fill="#f8fbff" stroke="#dbe5f4" stroke-width="1.2"/>`);
      }
    }

    // Çözüm kapsülleri
    if (opts.showSolution) {
      puzzle.placed.forEach((item, idx) => {
        const pal = PILL_COLORS[idx % PILL_COLORS.length];
        const x1 = gridX + item.start.x * (cell + gap) + cell / 2;
        const y1 = gridY + item.start.y * (cell + gap) + cell / 2;
        const x2 = gridX + item.end.x * (cell + gap) + cell / 2;
        const y2 = gridY + item.end.y * (cell + gap) + cell / 2;
        parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${pal.stroke}" stroke-width="${cell * 0.78}" stroke-linecap="round"/>`);
      });
    }

    // Harfler
    for (let y = 0; y < puzzle.rows; y++) {
      for (let x = 0; x < puzzle.cols; x++) {
        if (!puzzle.mask[y][x]) continue;
        const cx = gridX + x * (cell + gap) + cell / 2;
        const cy = gridY + y * (cell + gap) + cell / 2 + 1;
        const ch = Engine.formatLetter(puzzle.grid[y][x], opts.letterCase, puzzle.language);
        parts.push(`<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-family=${JSON.stringify(fontStack)} font-size="22" font-weight="800" fill="#14213d">${escapeXml(ch)}</text>`);
      }
    }

    // Kelime listesi
    const listTop = gridY + gridH + 34;
    const colW = (totalW - pad * 2) / colsPerRow;
    puzzle.placed.forEach((item, idx) => {
      const col = idx % colsPerRow;
      const row = Math.floor(idx / colsPerRow);
      const lx = pad + col * colW;
      const ly = listTop + row * 28;
      const txt = Engine.formatDisplayWord(item.display, opts.letterCase, puzzle.language);
      parts.push(`<text x="${lx}" y="${ly}" font-family=${JSON.stringify(fontStack)} font-size="14" font-weight="800" fill="#475569">☐ ${escapeXml(txt)}</text>`);
    });

    parts.push('</svg>');
    return parts.join('\n');
  }

  return {
    A4_W,
    A4_H,
    PILL_COLORS,
    renderWorksheetToCanvas,
    exportWorksheetPdf,
    buildMultiPagePdfBytes,
    buildPuzzleSvg
  };
}));
