/**
 * Kelime Avı Atölyesi — Saf JS QR Kod Üretici (ISO/IEC 18004)
 * Sıfır harici bağımlılık · Byte Modu · Hata Düzeltme Seviyesi L · Sürüm 1–20
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.KelimeQR = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // [ecPerBlock, g1Blocks, g1Data, g2Blocks, g2Data] — Level L, Versions 1..20
  const VERSION_SPECS = [
    null,
    [7,  1, 19,  0, 0],   // V1
    [10, 1, 34,  0, 0],   // V2
    [15, 1, 55,  0, 0],   // V3
    [20, 1, 80,  0, 0],   // V4
    [26, 1, 108, 0, 0],   // V5
    [18, 2, 68,  0, 0],   // V6
    [20, 2, 78,  0, 0],   // V7
    [24, 2, 97,  0, 0],   // V8
    [30, 2, 116, 0, 0],   // V9
    [18, 2, 68,  2, 69],  // V10
    [20, 4, 81,  0, 0],   // V11
    [24, 2, 92,  2, 93],  // V12
    [26, 4, 107, 0, 0],   // V13
    [30, 3, 115, 1, 116], // V14
    [22, 5, 87,  1, 88],  // V15
    [24, 5, 98,  1, 99],  // V16
    [28, 1, 107, 5, 108], // V17
    [30, 5, 120, 1, 121], // V18
    [28, 3, 113, 4, 114], // V19
    [28, 3, 107, 5, 108]  // V20
  ];

  const ALIGNMENT_CENTERS = [
    null,
    [],
    [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
    [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
    [6, 30, 54], [6, 32, 58], [6, 34, 62],
    [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74],
    [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90]
  ];

  // GF(256) tabloları (polinom 0x11D)
  const GF_EXP = new Uint8Array(512);
  const GF_LOG = new Uint8Array(256);
  (function initGF() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11D;
    }
    for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  function rsGeneratorPoly(degree) {
    let poly = [1];
    for (let i = 0; i < degree; i++) {
      const next = new Array(poly.length + 1).fill(0);
      const factor = GF_EXP[i];
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], factor);
      }
      poly = next;
    }
    return poly;
  }

  function rsRemainder(data, ecCount) {
    const gen = rsGeneratorPoly(ecCount);
    const rem = new Uint8Array(ecCount);
    for (let i = 0; i < data.length; i++) {
      const factor = data[i] ^ rem[0];
      for (let j = 0; j < ecCount - 1; j++) rem[j] = rem[j + 1];
      rem[ecCount - 1] = 0;
      if (factor !== 0) {
        for (let j = 0; j < ecCount; j++) {
          rem[j] ^= gfMul(gen[j + 1], factor);
        }
      }
    }
    return rem;
  }

  function computeFormatBits(maskPattern) {
    // EC Level L format indicator = 01 (binary)
    const data = (0b01 << 3) | (maskPattern & 7);
    let rem = data << 10;
    for (let i = 14; i >= 10; i--) {
      if ((rem >>> i) & 1) rem ^= (0x537 << (i - 10));
    }
    return ((data << 10) | rem) ^ 0x5412;
  }

  function computeVersionBits(version) {
    let rem = version << 12;
    for (let i = 17; i >= 12; i--) {
      if ((rem >>> i) & 1) rem ^= (0x1F25 << (i - 12));
    }
    return (version << 12) | rem;
  }

  function encodeUtf8(text) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text);
    const arr = [];
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      if (c < 0x80) arr.push(c);
      else if (c < 0x800) arr.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
      else arr.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
    }
    return new Uint8Array(arr);
  }

  function pickVersion(byteLen) {
    for (let v = 1; v <= 20; v++) {
      const [, g1b, g1d, g2b, g2d] = VERSION_SPECS[v];
      const totalDataBytes = g1b * g1d + g2b * g2d;
      const ccBits = v <= 9 ? 8 : 16;
      const neededBits = 4 + ccBits + byteLen * 8;
      if (neededBits <= totalDataBytes * 8) return v;
    }
    return -1;
  }

  function buildCodewords(bytes, version) {
    const [ecPerBlock, g1b, g1d, g2b, g2d] = VERSION_SPECS[version];
    const totalDataBytes = g1b * g1d + g2b * g2d;
    const bits = [];

    const pushBits = (val, len) => {
      for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
    };

    // Byte mode indicator (0100)
    pushBits(0b0100, 4);
    pushBits(bytes.length, version <= 9 ? 8 : 16);
    for (let i = 0; i < bytes.length; i++) pushBits(bytes[i], 8);

    // Terminator (up to 4 zero bits)
    const maxBits = totalDataBytes * 8;
    const termLen = Math.min(4, maxBits - bits.length);
    for (let i = 0; i < termLen; i++) bits.push(0);
    // Pad to byte boundary
    while (bits.length % 8 !== 0) bits.push(0);

    const dataCodewords = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      dataCodewords.push(b);
    }

    // Pad codewords 0xEC, 0x11
    let padToggle = true;
    while (dataCodewords.length < totalDataBytes) {
      dataCodewords.push(padToggle ? 0xEC : 0x11);
      padToggle = !padToggle;
    }

    // Split into blocks and compute RS EC codewords
    const dataBlocks = [];
    const ecBlocks = [];
    let offset = 0;

    for (let i = 0; i < g1b; i++) {
      const blk = dataCodewords.slice(offset, offset + g1d);
      offset += g1d;
      dataBlocks.push(blk);
      ecBlocks.push(rsRemainder(blk, ecPerBlock));
    }
    for (let i = 0; i < g2b; i++) {
      const blk = dataCodewords.slice(offset, offset + g2d);
      offset += g2d;
      dataBlocks.push(blk);
      ecBlocks.push(rsRemainder(blk, ecPerBlock));
    }

    // Interleave data codewords, then EC codewords
    const out = [];
    const maxDataLen = Math.max(g1d, g2d);
    for (let i = 0; i < maxDataLen; i++) {
      for (let b = 0; b < dataBlocks.length; b++) {
        if (i < dataBlocks[b].length) out.push(dataBlocks[b][i]);
      }
    }
    for (let i = 0; i < ecPerBlock; i++) {
      for (let b = 0; b < ecBlocks.length; b++) {
        out.push(ecBlocks[b][i]);
      }
    }
    return out;
  }

  function maskCondition(maskId, r, c) {
    switch (maskId) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2 + (r * c) % 3) === 0;
      case 6: return (((r * c) % 2 + (r * c) % 3) % 2) === 0;
      case 7: return (((r + c) % 2 + (r * c) % 3) % 2) === 0;
      default: return false;
    }
  }

  function drawBaseMatrix(version) {
    const size = version * 4 + 17;
    const mod = Array.from({ length: size }, () => new Uint8Array(size));
    const isFunc = Array.from({ length: size }, () => new Uint8Array(size));

    const setFunc = (r, c, dark) => {
      if (r < 0 || c < 0 || r >= size || c >= size) return;
      mod[r][c] = dark ? 1 : 0;
      isFunc[r][c] = 1;
    };

    const drawFinder = (top, left) => {
      for (let dr = -1; dr <= 7; dr++) {
        for (let dc = -1; dc <= 7; dc++) {
          const r = top + dr, c = left + dc;
          if (r < 0 || c < 0 || r >= size || c >= size) continue;
          const dist = Math.max(Math.abs(dr - 3), Math.abs(dc - 3));
          const dark = dist !== 2 && dist !== 4;
          setFunc(r, c, dark);
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
      setFunc(6, i, i % 2 === 0);
      setFunc(i, 6, i % 2 === 0);
    }

    // Alignment patterns
    const centers = ALIGNMENT_CENTERS[version];
    for (let i = 0; i < centers.length; i++) {
      for (let j = 0; j < centers.length; j++) {
        const cr = centers[i], cc = centers[j];
        if ((i === 0 && j === 0) || (i === 0 && j === centers.length - 1) || (i === centers.length - 1 && j === 0)) {
          continue;
        }
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const dist = Math.max(Math.abs(dr), Math.abs(dc));
            setFunc(cr + dr, cc + dc, dist !== 1);
          }
        }
      }
    }

    // Reserve format info areas + dark module
    for (let i = 0; i <= 8; i++) {
      if (i !== 6) {
        setFunc(8, i, false);
        setFunc(i, 8, false);
      }
    }
    for (let i = 0; i < 8; i++) {
      setFunc(8, size - 1 - i, false);
      setFunc(size - 1 - i, 8, false);
    }
    setFunc(size - 8, 8, true); // dark module

    // Version info (versions >= 7)
    if (version >= 7) {
      const vBits = computeVersionBits(version);
      for (let i = 0; i < 18; i++) {
        const dark = ((vBits >>> i) & 1) === 1;
        const r = Math.floor(i / 3);
        const c = size - 11 + (i % 3);
        setFunc(r, c, dark);
        setFunc(c, r, dark);
      }
    }

    return { size, mod, isFunc };
  }

  function writeFormatBits(mod, size, maskId) {
    const bits = computeFormatBits(maskId);
    // Copy 1: around top-left finder
    for (let i = 0; i <= 5; i++) mod[8][i] = (bits >>> (14 - i)) & 1;
    mod[8][7] = (bits >>> 8) & 1;
    mod[8][8] = (bits >>> 7) & 1;
    mod[7][8] = (bits >>> 6) & 1;
    for (let i = 9; i < 15; i++) mod[14 - i][8] = (bits >>> (14 - i)) & 1;

    // Copy 2: bottom-left & top-right
    for (let i = 0; i < 7; i++) mod[size - 1 - i][8] = (bits >>> (14 - i)) & 1;
    for (let i = 7; i < 15; i++) mod[8][size - 15 + i] = (bits >>> (14 - i)) & 1;
  }

  function placeCodewords(base, codewords) {
    const { size, mod, isFunc } = base;
    let bitIdx = 0;
    const totalBits = codewords.length * 8;
    let upward = true;

    for (let col = size - 1; col >= 1; col -= 2) {
      if (col === 6) col = 5;
      for (let step = 0; step < size; step++) {
        const r = upward ? (size - 1 - step) : step;
        for (let dc = 0; dc < 2; dc++) {
          const c = col - dc;
          if (isFunc[r][c]) continue;
          let bit = 0;
          if (bitIdx < totalBits) {
            bit = (codewords[bitIdx >> 3] >>> (7 - (bitIdx & 7))) & 1;
            bitIdx++;
          }
          mod[r][c] = bit;
        }
      }
      upward = !upward;
    }
  }

  function evaluatePenalty(mod, size) {
    let penalty = 0;
    // N1: adjacent same-color runs >= 5
    for (let r = 0; r < size; r++) {
      let runColor = mod[r][0], runLen = 1;
      for (let c = 1; c < size; c++) {
        if (mod[r][c] === runColor) runLen++;
        else {
          if (runLen >= 5) penalty += 3 + (runLen - 5);
          runColor = mod[r][c];
          runLen = 1;
        }
      }
      if (runLen >= 5) penalty += 3 + (runLen - 5);
    }
    for (let c = 0; c < size; c++) {
      let runColor = mod[0][c], runLen = 1;
      for (let r = 1; r < size; r++) {
        if (mod[r][c] === runColor) runLen++;
        else {
          if (runLen >= 5) penalty += 3 + (runLen - 5);
          runColor = mod[r][c];
          runLen = 1;
        }
      }
      if (runLen >= 5) penalty += 3 + (runLen - 5);
    }
    // N2: 2x2 blocks
    for (let r = 0; r < size - 1; r++) {
      for (let c = 0; c < size - 1; c++) {
        const v = mod[r][c];
        if (v === mod[r][c + 1] && v === mod[r + 1][c] && v === mod[r + 1][c + 1]) {
          penalty += 3;
        }
      }
    }
    // N4: dark ratio balance
    let dark = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) dark += mod[r][c];
    }
    const pct = (dark * 100) / (size * size);
    penalty += Math.floor(Math.abs(pct - 50) / 5) * 10;
    return penalty;
  }

  function generateMatrix(text) {
    const bytes = encodeUtf8(String(text || ''));
    const version = pickVersion(bytes.length);
    if (version < 0) return null;

    const codewords = buildCodewords(bytes, version);
    const base = drawBaseMatrix(version);
    placeCodewords(base, codewords);

    let bestPenalty = Infinity;
    let bestMatrix = null;

    for (let maskId = 0; maskId < 8; maskId++) {
      const copy = base.mod.map(row => new Uint8Array(row));
      for (let r = 0; r < base.size; r++) {
        for (let c = 0; c < base.size; c++) {
          if (!base.isFunc[r][c] && maskCondition(maskId, r, c)) {
            copy[r][c] ^= 1;
          }
        }
      }
      writeFormatBits(copy, base.size, maskId);
      const p = evaluatePenalty(copy, base.size);
      if (p < bestPenalty) {
        bestPenalty = p;
        bestMatrix = copy;
      }
    }

    return { version, size: base.size, matrix: bestMatrix };
  }

  function renderToSvg(text, options) {
    const opts = options || {};
    const res = generateMatrix(text);
    if (!res) return null;
    const quiet = opts.quietZone ?? 3;
    const fg = opts.fg || '#14213d';
    const bg = opts.bg || '#ffffff';
    const total = res.size + quiet * 2;
    let path = '';
    for (let r = 0; r < res.size; r++) {
      for (let c = 0; c < res.size; c++) {
        if (res.matrix[r][c]) {
          path += `M${c + quiet},${r + quiet}h1v1h-1z`;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="QR Kod"><rect width="${total}" height="${total}" fill="${bg}"/><path d="${path}" fill="${fg}"/></svg>`;
  }

  function drawToCanvas(canvas, text, options) {
    const opts = options || {};
    const res = generateMatrix(text);
    if (!res) return false;
    const quiet = opts.quietZone ?? 3;
    const fg = opts.fg || '#14213d';
    const bg = opts.bg || '#ffffff';
    const total = res.size + quiet * 2;
    const pxSize = opts.size || 240;
    const scale = Math.max(2, Math.floor(pxSize / total));
    const finalSize = total * scale;
    canvas.width = finalSize;
    canvas.height = finalSize;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, finalSize, finalSize);
    ctx.fillStyle = fg;
    for (let r = 0; r < res.size; r++) {
      for (let c = 0; c < res.size; c++) {
        if (res.matrix[r][c]) {
          ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
        }
      }
    }
    return true;
  }

  return {
    generateMatrix,
    renderToSvg,
    drawToCanvas
  };
}));
