/**
 * Kelime Avı Atölyesi — Gelişmiş Bulmaca Motoru (Zero-Dependency)
 * - Deterministik PRNG (Mulberry32) ile tekrar üretilebilir & QR/URL paylaşılabilir bulmacalar
 * - Türkçe (tr-TR) ve İngilizce (en-US) tam harf desteği
 * - 10 hazır şekilli ızgara + özel maske desteği
 * - 8 yönlü granüler yön kontrolü
 * - Kesişim yoğunluğu puanlamalı çoklu deneme yerleştirme algoritması
 * - Gizli Şifre (Secret Message) gömme motoru
 * - Akıllı dolgu havuzları (Türkçe frekans, MEB ses grubu, şaşırtmacalı kelime harfleri vb.)
 * - Kaza kelime tekrarı ve uygunsuz kelime filtresi
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./word-packs.js'));
  } else {
    root.KelimeEngine = factory(root.KelimePacks);
  }
}(typeof self !== 'undefined' ? self : this, function (Packs) {
  'use strict';

  const TR_ALPHABET = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';
  const EN_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const TR_VOWELS = 'AEIİOÖUÜ';
  const EN_VOWELS = 'AEIOU';

  // Doğal Türkçe harf sıklığına dayalı ağırlıklı havuz
  const TR_FREQ_POOL =
    'AAAAAAAAAAAAEEEEEEEEEİİİİİİİİNNNNNNNRRRRRRRLLLLLLIIIIIDDDDDKKKKK' +
    'MMMMUUUYYYTTTSSSBBBOOOÜÜŞŞZZGGÇÇHHVCPÖĞFJ';

  // Doğal İngilizce harf sıklığına dayalı ağırlıklı havuz
  const EN_FREQ_POOL =
    'EEEEEEEEEEEEETTTTTTTTTAAAAAAAAOOOOOOOOIIIIIIINNNNNNNSSSSSSRRRRRR' +
    'HHHHHHDDDDLLLLCCCUUUMMMWWFFGGYYPPBBVKJXQZ';

  // 8 Yön tanımı
  const DIRECTIONS = [
    { id: 'E',  dx: 1,  dy: 0,  arrow: '→', label: 'Soldan Sağa' },
    { id: 'S',  dx: 0,  dy: 1,  arrow: '↓', label: 'Yukarıdan Aşağı' },
    { id: 'SE', dx: 1,  dy: 1,  arrow: '↘', label: 'Sağ Aşağı Çapraz' },
    { id: 'NE', dx: 1,  dy: -1, arrow: '↗', label: 'Sağ Yukarı Çapraz' },
    { id: 'W',  dx: -1, dy: 0,  arrow: '←', label: 'Sağdan Sola (Ters)' },
    { id: 'N',  dx: 0,  dy: -1, arrow: '↑', label: 'Aşağıdan Yukarı (Ters)' },
    { id: 'SW', dx: -1, dy: 1,  arrow: '↙', label: 'Sol Aşağı Çapraz (Ters)' },
    { id: 'NW', dx: -1, dy: -1, arrow: '↖', label: 'Sol Yukarı Çapraz (Ters)' }
  ];

  const DIRECTION_MAP = Object.fromEntries(DIRECTIONS.map(d => [d.id, d]));

  const DIRECTION_PRESETS = {
    easy:   ['E', 'S'],
    normal: ['E', 'S', 'SE'],
    hard:   ['E', 'S', 'SE', 'NE'],
    expert: ['E', 'S', 'SE', 'NE', 'W', 'N', 'SW', 'NW']
  };

  // İlkokul çalışma kağıtlarında kazara oluşmasını istemediğimiz kısa harf dizilimleri (base64 kodlu)
  const BLOCKED_ENCODED = [
    'QU0=', 'QUs=', 'U0lL', 'U0lL', 'UElD', 'UElDw4c=', 'R8OWVA==', 'T0M=',
    'T8OH', 'TUs=', 'TVE=', 'U0s=', 'R09U', 'UElD', 'QU1L', 'QVFL', 'S0FL',
    'Qk9L', 'U0lL', 'T1JT', 'U0lL', 'RlVL', 'RlVDSw==', 'U0hJVA==', 'QVNT'
  ];

  function decodeBlocked() {
    const out = new Set();
    for (const b64 of BLOCKED_ENCODED) {
      try {
        let s;
        if (typeof atob === 'function') {
          const bin = atob(b64);
          const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
          s = new TextDecoder().decode(bytes);
        } else if (typeof Buffer !== 'undefined') {
          s = Buffer.from(b64, 'base64').toString('utf8');
        }
        if (s && s.length >= 3) out.add(s);
      } catch (_) {}
    }
    return Array.from(out);
  }

  const BLOCKED_WORDS = decodeBlocked();

  // Şekil tanımları
  const SHAPES = [
    { id: 'rect',      name: 'Kare / Dikdörtgen', icon: '⬛' },
    { id: 'heart',     name: 'Kalp',              icon: '❤️' },
    { id: 'star',      name: 'Yıldız',            icon: '⭐' },
    { id: 'diamond',   name: 'Elmas',             icon: '◆' },
    { id: 'circle',    name: 'Daire',             icon: '●' },
    { id: 'tree',      name: 'Çam Ağacı',         icon: '🌲' },
    { id: 'apple',     name: 'Elma',              icon: '🍎' },
    { id: 'rocket',    name: 'Roket',             icon: '🚀' },
    { id: 'butterfly', name: 'Kelebek',           icon: '🦋' },
    { id: 'cross',     name: 'Artı',              icon: '➕' }
  ];

  // ==================== LOCALE & STRING HELPERS ====================

  function toUpper(str, lang) {
    return String(str || '').toLocaleUpperCase(lang === 'en' ? 'en-US' : 'tr-TR');
  }

  function toLower(str, lang) {
    return String(str || '').toLocaleLowerCase(lang === 'en' ? 'en-US' : 'tr-TR');
  }

  function cleanLetters(str, lang) {
    const upper = toUpper(str, lang);
    if (lang === 'en') {
      return upper
        .replace(/İ/g, 'I').replace(/Ç/g, 'C').replace(/Ğ/g, 'G')
        .replace(/Ö/g, 'O').replace(/Ş/g, 'S').replace(/Ü/g, 'U')
        .replace(/[^A-Z]/g, '');
    }
    return upper.replace(/[^A-ZÇĞİÖŞÜ]/g, '');
  }

  function formatLetter(ch, letterCase, lang) {
    if (!ch) return '';
    return letterCase === 'lower' ? toLower(ch, lang) : toUpper(ch, lang);
  }

  function formatDisplayWord(str, letterCase, lang) {
    if (!str) return '';
    return letterCase === 'lower' ? toLower(str, lang) : toUpper(str, lang);
  }

  function isLikelyEmojiOnly(str) {
    const trimmed = String(str || '').trim();
    if (!trimmed) return false;
    // Harf veya rakam içermiyorsa ve kısa ise emoji kabul et
    return !/[A-Za-z0-9ÇĞİÖŞÜçğıöşü]/.test(trimmed) && trimmed.length <= 12;
  }

  /**
   * Çok satırlı öğretmen girişini ayrıştırır.
   * Desteklenen biçimler:
   * - KALEM
   * - KALEM : Yazı yazmaya yarayan araç
   * - KALEM : ✏️
   * - KALEM | ✏️ | Yazı yazmaya yarayan araç
   * - KALEM, KİTAP, DEFTER (satırda : veya | yoksa)
   */
  function parseWordInput(rawText, lang) {
    const lines = String(rawText || '').split(/\r?\n/);
    const entries = [];
    const seen = new Set();

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Eğer satırda '|' veya ':' yoksa virgül/noktalı virgülle çoklu kelime destekle
      if (!line.includes('|') && !line.includes(':')) {
        const parts = line.split(/[,;]+/);
        for (const p of parts) {
          const display = p.trim();
          const clean = cleanLetters(display, lang);
          if (clean.length >= 2 && !seen.has(clean)) {
            seen.add(clean);
            entries.push({
              clean,
              display: toUpper(display.replace(/\s+/g, ' '), lang),
              clue: '',
              emoji: ''
            });
          }
        }
        continue;
      }

      let wordPart = '';
      let emoji = '';
      let clue = '';

      if (line.includes('|')) {
        const parts = line.split('|').map(s => s.trim());
        wordPart = parts[0] || '';
        if (parts.length === 2) {
          if (isLikelyEmojiOnly(parts[1])) emoji = parts[1];
          else clue = parts[1];
        } else if (parts.length >= 3) {
          if (isLikelyEmojiOnly(parts[1])) {
            emoji = parts[1];
            clue = parts.slice(2).join(' | ').trim();
          } else {
            clue = parts[1];
            if (isLikelyEmojiOnly(parts[2])) emoji = parts[2];
          }
        }
      } else {
        const colonIdx = line.indexOf(':');
        wordPart = line.slice(0, colonIdx).trim();
        const rest = line.slice(colonIdx + 1).trim();
        if (isLikelyEmojiOnly(rest)) {
          emoji = rest;
        } else {
          // Başta emoji + boşluk + ipucu var mı kontrol et (ör. "🍎 Kırmızı meyve")
          const tokens = rest.split(/\s+/);
          if (tokens.length > 1 && isLikelyEmojiOnly(tokens[0])) {
            emoji = tokens[0];
            clue = tokens.slice(1).join(' ').trim();
          } else {
            clue = rest;
          }
        }
      }

      const clean = cleanLetters(wordPart, lang);
      if (clean.length >= 2 && !seen.has(clean)) {
        seen.add(clean);
        entries.push({
          clean,
          display: toUpper(wordPart.replace(/\s+/g, ' '), lang),
          clue,
          emoji
        });
      }
    }

    return entries;
  }

  /**
   * Entry listesini metin kutusu biçimine çevirir.
   */
  function entriesToText(entries) {
    return (entries || []).map(e => {
      const w = e.word || e.display || e.clean || '';
      if (e.emoji && e.clue) return `${w} | ${e.emoji} | ${e.clue}`;
      if (e.emoji) return `${w} : ${e.emoji}`;
      if (e.clue) return `${w} : ${e.clue}`;
      return w;
    }).join('\n');
  }

  // ==================== DETERMINISTIC PRNG (MULBERRY32) ====================

  function createRng(seed) {
    let a = (Number(seed) >>> 0) || 123456789;
    return function next() {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomSeed() {
    return Math.floor(Math.random() * 89999999) + 10000000;
  }

  function shuffleInPlace(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  // ==================== SHAPE MASKS ====================

  function pointInPolygon(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1];
      const xj = poly[j][0], yj = poly[j][1];
      const intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / ((yj - yi) || 1e-9) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function buildStarPolygon() {
    const pts = [];
    const outer = 1.14;
    const inner = 0.54;
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? outer : inner;
      pts.push([Math.cos(angle) * r, Math.sin(angle) * r]);
    }
    return pts;
  }

  const STAR_POLY = buildStarPolygon();

  function evaluateShapeCell(shape, nx, ny) {
    // nx, ny in [-1, 1], y increases downward
    switch (shape) {
      case 'rect':
        return true;

      case 'circle':
        return (nx * nx + ny * ny) <= 1.04;

      case 'diamond':
        return (Math.abs(nx) + Math.abs(ny)) <= 1.08;

      case 'heart': {
        // Invert y so heart points downward (y = -ny), with clear top cleft
        const x = nx * 1.26;
        const y = -ny * 1.24 + 0.14;
        const a = x * x + y * y - 1;
        return (a * a * a - x * x * y * y * y) <= 0.015;
      }

      case 'star':
        return pointInPolygon(nx, ny - 0.10, STAR_POLY);

      case 'tree': {
        // Üç katmanlı çam ağacı + gövde
        if (ny >= 0.62 && ny <= 1.0 && Math.abs(nx) <= 0.24) return true;
        if (ny >= -1.0 && ny < -0.25) {
          const t = (ny + 1.0) / 0.75; // 0..1
          return Math.abs(nx) <= 0.12 + t * 0.52;
        }
        if (ny >= -0.35 && ny < 0.22) {
          const t = (ny + 0.35) / 0.57;
          return Math.abs(nx) <= 0.24 + t * 0.58;
        }
        if (ny >= 0.12 && ny <= 0.68) {
          const t = (ny - 0.12) / 0.56;
          return Math.abs(nx) <= 0.34 + t * 0.64;
        }
        return false;
      }

      case 'apple': {
        // Sap kısmı
        if (ny < -0.68 && Math.abs(nx - 0.06) <= 0.15) return true;
        // Elma gövdesi (üstte iki loblu, altta hafif daralan)
        const lx = nx + 0.28, rx = nx - 0.28;
        const dy = ny - 0.06;
        const leftLobe = (lx * lx) / 0.54 + (dy * dy) / 0.78 <= 1.0;
        const rightLobe = (rx * rx) / 0.54 + (dy * dy) / 0.78 <= 1.0;
        // Üst orta çentik ve alt küçük çentik
        if (ny < -0.58 && Math.abs(nx) < 0.12) return false;
        if (ny > 0.82 && Math.abs(nx) < 0.1) return false;
        return leftLobe || rightLobe;
      }

      case 'rocket': {
        // Burun konisi
        if (ny < -0.32) {
          const t = (ny + 1.0) / 0.68;
          return Math.abs(nx) <= 0.08 + t * 0.44;
        }
        // Ana gövde
        if (ny >= -0.32 && ny <= 0.72 && Math.abs(nx) <= 0.52) return true;
        // Yan kanatçıklar
        if (ny >= 0.20 && ny <= 0.96) {
          const t = (ny - 0.20) / 0.76;
          return Math.abs(nx) <= 0.52 + t * 0.46;
        }
        // Alt motor nozülü
        if (ny > 0.72 && ny <= 1.0 && Math.abs(nx) <= 0.30) return true;
        return false;
      }

      case 'butterfly': {
        // Orta gövde
        if (Math.abs(nx) <= 0.16 && Math.abs(ny) <= 0.78) return true;
        // Üst kanatlar
        const ux = Math.abs(nx) - 0.46;
        const uy = ny + 0.30;
        const upperWing = (ux * ux) / 0.30 + (uy * uy) / 0.34 <= 1.0;
        // Alt kanatlar
        const lx = Math.abs(nx) - 0.38;
        const ly = ny - 0.38;
        const lowerWing = (lx * lx) / 0.24 + (ly * ly) / 0.24 <= 1.0;
        return upperWing || lowerWing;
      }

      case 'cross':
        return Math.abs(nx) <= 0.38 || Math.abs(ny) <= 0.38;

      default:
        return true;
    }
  }

  function buildShapeMask(shape, rows, cols, customMask) {
    const mask = Array.from({ length: rows }, () => Array(cols).fill(true));
    let activeCount = 0;

    if (shape === 'custom' && Array.isArray(customMask)) {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const val = customMask[y] && typeof customMask[y][x] === 'boolean' ? customMask[y][x] : true;
          mask[y][x] = val;
          if (val) activeCount++;
        }
      }
      if (activeCount < 4) {
        // Boş maske güvenliği: tümünü aç
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) mask[y][x] = true;
        }
        activeCount = rows * cols;
      }
      return { mask, activeCount };
    }

    for (let y = 0; y < rows; y++) {
      const ny = rows > 1 ? ((y / (rows - 1)) * 2 - 1) : 0;
      for (let x = 0; x < cols; x++) {
        const nx = cols > 1 ? ((x / (cols - 1)) * 2 - 1) : 0;
        const on = evaluateShapeCell(shape, nx, ny);
        mask[y][x] = on;
        if (on) activeCount++;
      }
    }
    return { mask, activeCount };
  }

  // ==================== WORD PLACEMENT ENGINE ====================

  function getFillerPool(config, placedEntries) {
    const lang = config.language === 'en' ? 'en' : 'tr';
    const mode = config.fillMode || (lang === 'en' ? 'en_freq' : 'tr_freq');

    if (mode === 'meb_group' && lang === 'tr' && Packs && Packs.MEB_SOUND_GROUPS) {
      const grp = Packs.MEB_SOUND_GROUPS.find(g => g.id === config.mebGroup);
      if (grp && grp.cumulativeLetters) return grp.cumulativeLetters;
    }

    if (mode === 'word_letters') {
      const joined = (placedEntries || []).map(w => w.clean).join('');
      if (joined.length >= 4) return joined;
    }

    if (mode === 'vowels') {
      return lang === 'en'
        ? EN_ALPHABET + EN_VOWELS + EN_VOWELS + EN_VOWELS
        : TR_ALPHABET + TR_VOWELS + TR_VOWELS + TR_VOWELS;
    }

    if (mode === 'random') {
      return lang === 'en' ? EN_ALPHABET : TR_ALPHABET;
    }

    return lang === 'en' ? EN_FREQ_POOL : TR_FREQ_POOL;
  }

  function isSubSegmentOfExisting(cells, placedList) {
    const cellSet = new Set(cells.map(c => `${c.x}-${c.y}`));
    for (const p of placedList) {
      if (p.cells.length < cells.length) continue;
      let allInside = true;
      for (const key of cellSet) {
        if (!p.cellKeySet.has(key)) {
          allInside = false;
          break;
        }
      }
      if (allInside) return true;
    }
    return false;
  }

  function runSinglePlacementAttempt(entries, mask, rows, cols, activeDirs, density, rng) {
    const grid = Array.from({ length: rows }, () => Array(cols).fill(''));
    const placed = [];
    const unplaced = [];
    const dirUsage = {};
    activeDirs.forEach(d => { dirUsage[d.id] = 0; });

    // Uzun kelimeleri öne al, eşit uzunlukları hafifçe karıştır
    const ordered = entries.slice().sort((a, b) => {
      if (b.clean.length !== a.clean.length) return b.clean.length - a.clean.length;
      return rng() - 0.5;
    });

    let totalIntersections = 0;

    for (const entry of ordered) {
      const word = entry.clean;
      const len = word.length;
      const candidates = [];

      for (let dIdx = 0; dIdx < activeDirs.length; dIdx++) {
        const dir = activeDirs[dIdx];
        const dx = dir.dx;
        const dy = dir.dy;

        const minX = dx < 0 ? len - 1 : 0;
        const maxX = dx > 0 ? cols - len : cols - 1;
        const minY = dy < 0 ? len - 1 : 0;
        const maxY = dy > 0 ? rows - len : rows - 1;

        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            let ok = true;
            let intersections = 0;
            for (let i = 0; i < len; i++) {
              const nx = x + dx * i;
              const ny = y + dy * i;
              if (!mask[ny][nx]) { ok = false; break; }
              const cur = grid[ny][nx];
              if (cur !== '') {
                if (cur !== word[i]) { ok = false; break; }
                intersections++;
              }
            }
            if (!ok) continue;
            // Tamamen başka bir kelimenin içine gömülmesini engelle (tüm harfleri çakışıyorsa)
            if (intersections === len) continue;

            // Kesişim yoğunluğuna göre puanlama
            let score = rng() * 1.4;
            if (density === 'high') {
              score += intersections * 9.5;
            } else if (density === 'low') {
              score += intersections === 0 ? 7.0 : -intersections * 6.0;
            } else {
              // Dengeli: 1-2 kesişimi ödüllendir
              score += intersections === 1 ? 5.5 : (intersections === 2 ? 6.5 : intersections * 2.2);
            }

            // Yön çeşitliliği bonusu
            const avgDir = placed.length / Math.max(1, activeDirs.length);
            if (dirUsage[dir.id] <= avgDir) score += 2.2;
            else score -= (dirUsage[dir.id] - avgDir) * 0.9;

            candidates.push({ x, y, dir, intersections, score });
          }
        }
      }

      if (candidates.length === 0) {
        unplaced.push(entry);
        continue;
      }

      // En yüksek puanlı ilk 4 aday arasından rastgele birini seç (çeşitlilik + kalite)
      candidates.sort((a, b) => b.score - a.score);
      const topK = Math.min(4, candidates.length);
      let chosen = null;

      for (let t = 0; t < Math.min(12, candidates.length); t++) {
        const pick = t < topK ? candidates[Math.floor(rng() * topK)] : candidates[t];
        const cells = [];
        for (let i = 0; i < len; i++) {
          cells.push({ x: pick.x + pick.dir.dx * i, y: pick.y + pick.dir.dy * i });
        }
        if (!isSubSegmentOfExisting(cells, placed)) {
          chosen = { pick, cells };
          break;
        }
      }

      if (!chosen) {
        // Fallback: en iyi aday
        const pick = candidates[0];
        const cells = [];
        for (let i = 0; i < len; i++) {
          cells.push({ x: pick.x + pick.dir.dx * i, y: pick.y + pick.dir.dy * i });
        }
        chosen = { pick, cells };
      }

      const { pick, cells } = chosen;
      const cellKeySet = new Set();
      for (let i = 0; i < len; i++) {
        const c = cells[i];
        grid[c.y][c.x] = word[i];
        cellKeySet.add(`${c.x}-${c.y}`);
      }
      totalIntersections += pick.intersections;
      dirUsage[pick.dir.id]++;

      placed.push({
        id: `w-${placed.length}`,
        clean: entry.clean,
        display: entry.display,
        clue: entry.clue || '',
        emoji: entry.emoji || '',
        start: { x: pick.x, y: pick.y },
        end: { x: pick.x + pick.dir.dx * (len - 1), y: pick.y + pick.dir.dy * (len - 1) },
        dirId: pick.dir.id,
        dx: pick.dir.dx,
        dy: pick.dir.dy,
        cells,
        cellKeySet
      });
    }

    // Yön çeşitlilik skoru
    const usedDirCount = Object.values(dirUsage).filter(v => v > 0).length;
    const fitness =
      placed.length * 1000 +
      usedDirCount * 18 +
      (density === 'high'
        ? totalIntersections * 14
        : density === 'low'
          ? -totalIntersections * 12
          : totalIntersections * 5);

    return { grid, placed, unplaced, totalIntersections, fitness };
  }

  // ==================== SECRET MESSAGE & SANITIZER ====================

  function embedSecretMessage(grid, mask, rows, cols, secretMessage, lang) {
    const rawDisplay = toUpper(String(secretMessage || '').trim().replace(/\s+/g, ' '), lang);
    const secretClean = cleanLetters(rawDisplay, lang);

    const unusedCells = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (mask[y][x] && grid[y][x] === '') {
          unusedCells.push({ x, y });
        }
      }
    }

    if (!secretClean) {
      return {
        enabled: false,
        display: '',
        clean: '',
        cells: [],
        fits: true,
        unusedCount: unusedCells.length,
        extraUnused: unusedCells.length
      };
    }

    if (unusedCells.length < secretClean.length) {
      return {
        enabled: true,
        display: rawDisplay,
        clean: secretClean,
        cells: [],
        fits: false,
        unusedCount: unusedCells.length,
        neededMore: secretClean.length - unusedCells.length,
        extraUnused: 0
      };
    }

    const secretCells = [];
    for (let i = 0; i < secretClean.length; i++) {
      const c = unusedCells[i];
      grid[c.y][c.x] = secretClean[i];
      secretCells.push({ x: c.x, y: c.y, char: secretClean[i] });
    }

    return {
      enabled: true,
      display: rawDisplay,
      clean: secretClean,
      cells: secretCells,
      fits: true,
      unusedCount: unusedCells.length,
      extraUnused: unusedCells.length - secretClean.length
    };
  }

  /**
   * Dolgu harfleri yüzünden oluşan kaza hedef kelime tekrarlarını ve uygunsuz harf dizilerini temizler.
   */
  function sanitizeGrid(grid, mask, locked, rows, cols, placed, fillerPool, rng) {
    const uniquePool = Array.from(new Set(fillerPool.split('')));
    if (uniquePool.length < 2) return 0;

    // Hedef kelimeler (en az 3 harfli) + yasaklı kısa dizilimler
    const targetWords = placed.map(p => p.clean).filter(w => w.length >= 3);
    const placedStarts = new Set(
      placed.map(p => `${p.start.x},${p.start.y},${p.dx},${p.dy},${p.clean}`)
    );

    const checkWords = Array.from(new Set([...BLOCKED_WORDS, ...targetWords]));
    if (checkWords.length === 0) return 0;

    const maxWordLen = Math.max(...checkWords.map(w => w.length));
    let sanitizedCount = 0;

    for (let pass = 0; pass < 3; pass++) {
      let changedThisPass = false;

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (!mask[y][x]) continue;

          for (let d = 0; d < DIRECTIONS.length; d++) {
            const { dx, dy } = DIRECTIONS[d];
            // Bu başlangıçtan uzanan harf şeridini oluştur
            let str = '';
            const coords = [];
            for (let step = 0; step < maxWordLen; step++) {
              const nx = x + dx * step;
              const ny = y + dy * step;
              if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || !mask[ny][nx]) break;
              str += grid[ny][nx];
              coords.push({ x: nx, y: ny });
            }
            if (str.length < 3) continue;

            for (const bad of checkWords) {
              if (str.length < bad.length) continue;
              if (!str.startsWith(bad)) continue;

              // Eğer gerçek yerleştirilmiş hedef kelimenin kendisiyse dokunma!
              if (placedStarts.has(`${x},${y},${dx},${dy},${bad}`)) continue;

              // Kilitli olmayan bir dolgu hücresini değiştir
              const editable = coords.slice(0, bad.length).filter(c => !locked[c.y][c.x]);
              if (editable.length > 0) {
                const targetCell = editable[Math.floor(rng() * editable.length)];
                const oldChar = grid[targetCell.y][targetCell.x];
                const altChars = uniquePool.filter(ch => ch !== oldChar);
                if (altChars.length > 0) {
                  grid[targetCell.y][targetCell.x] = altChars[Math.floor(rng() * altChars.length)];
                  sanitizedCount++;
                  changedThisPass = true;
                  break;
                }
              }
            }
          }
        }
      }
      if (!changedThisPass) break;
    }

    return sanitizedCount;
  }

  // ==================== MAIN PUZZLE GENERATOR ====================

  function generatePuzzle(config) {
    const lang = config.language === 'en' ? 'en' : 'tr';
    const rows = Math.max(6, Math.min(20, Number(config.rows) || 10));
    const cols = Math.max(6, Math.min(20, Number(config.cols) || rows));
    const shape = config.shape || 'rect';
    const density = config.density || 'balanced';
    const seed = Number(config.seed) || randomSeed();
    const rng = createRng(seed);

    // Aktif yönleri çözümle
    let dirIds = Array.isArray(config.directions) && config.directions.length > 0
      ? config.directions.filter(id => DIRECTION_MAP[id])
      : (DIRECTION_PRESETS[config.directionPreset] || DIRECTION_PRESETS.normal);
    if (dirIds.length === 0) dirIds = ['E', 'S'];
    const activeDirs = dirIds.map(id => DIRECTION_MAP[id]);

    // Kelimeleri hazırla
    const entries = Array.isArray(config.entries)
      ? config.entries.map(e => ({
          clean: cleanLetters(e.clean || e.word || e.display, lang),
          display: toUpper(e.display || e.word || e.clean, lang),
          clue: e.clue || '',
          emoji: e.emoji || ''
        })).filter(e => e.clean.length >= 2)
      : parseWordInput(config.rawWords || '', lang);

    const { mask, activeCount } = buildShapeMask(shape, rows, cols, config.customMask);

    // Çoklu deneme (en iyi yerleşimi seç)
    const attemptCount = entries.length > 18 ? 6 : 12;
    let best = null;
    for (let i = 0; i < attemptCount; i++) {
      const res = runSinglePlacementAttempt(entries, mask, rows, cols, activeDirs, density, rng);
      if (!best || res.fitness > best.fitness) {
        best = res;
      }
      // Tüm kelimeler yerleşti ve yoğunluk hedefi iyi ise erken çıkılabilir (en az 4 deneme yap)
      if (i >= 4 && best.unplaced.length === 0 && density !== 'high') break;
    }

    const { grid, placed, unplaced, totalIntersections } = best;

    // Kelime sırasını öğretmenin girdiği sıraya yakın düzenle (id yeniden ata)
    const inputOrder = new Map(entries.map((e, idx) => [e.clean, idx]));
    placed.sort((a, b) => (inputOrder.get(a.clean) ?? 999) - (inputOrder.get(b.clean) ?? 999));
    placed.forEach((p, idx) => { p.id = `w-${idx}`; });

    // Kilitli hücre haritası (yerleşen kelimeler + gizli şifre)
    const locked = Array.from({ length: rows }, () => Array(cols).fill(false));
    for (const p of placed) {
      for (const c of p.cells) locked[c.y][c.x] = true;
    }

    // Gizli şifre göm
    const secret = embedSecretMessage(grid, mask, rows, cols, config.secretMessage, lang);
    for (const c of secret.cells) locked[c.y][c.x] = true;

    // Kalan boş aktif hücreleri doldur
    const fillerPool = getFillerPool(config, placed);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (mask[y][x] && grid[y][x] === '') {
          grid[y][x] = fillerPool[Math.floor(rng() * fillerPool.length)];
        }
      }
    }

    // Kaza kelime ve uygunsuz dizilim filtresi
    const sanitizedCount = sanitizeGrid(grid, mask, locked, rows, cols, placed, fillerPool, rng);

    // Sığmayan kelimeler veya gizli şifre için önerilen boyut hesapla
    const maxLen = entries.reduce((m, e) => Math.max(m, e.clean.length), 0);
    let recommendedSize = Math.max(rows, cols);
    if (unplaced.length > 0 || (secret.enabled && !secret.fits)) {
      const extraNeeded = secret.enabled && !secret.fits ? Math.ceil(Math.sqrt(secret.neededMore + 8)) : 2;
      recommendedSize = Math.min(20, Math.max(recommendedSize + Math.max(2, extraNeeded), maxLen + 1));
    }

    // Her kelime için deterministik anagram ve eksik harfli görünüm üret
    const clueRng = createRng(seed ^ 0x9e3779b9);
    for (const p of placed) {
      p.anagram = makeAnagram(p.clean, clueRng);
      p.masked = makeMaskedWord(p.clean, clueRng);
      delete p.cellKeySet; // serileştirmeyi temiz tut
    }

    return {
      seed,
      rows,
      cols,
      shape,
      language: lang,
      mask,
      activeCount,
      grid,
      placed,
      unplaced,
      secret,
      stats: {
        totalInput: entries.length,
        placedCount: placed.length,
        unplacedCount: unplaced.length,
        intersections: totalIntersections,
        sanitizedCount,
        recommendedSize
      }
    };
  }

  function makeAnagram(word, rng) {
    if (word.length <= 2) return word;
    const chars = word.split('');
    for (let attempt = 0; attempt < 8; attempt++) {
      shuffleInPlace(chars, rng);
      const joined = chars.join('');
      if (joined !== word) return joined;
    }
    return chars.reverse().join('');
  }

  function makeMaskedWord(word, rng) {
    if (word.length <= 2) return word[0] + '_';
    const chars = word.split('');
    // İlk harf daima açık, geri kalanların yaklaşık yarısı gizli
    const hideIndices = [];
    for (let i = 1; i < chars.length; i++) hideIndices.push(i);
    shuffleInPlace(hideIndices, rng);
    const hideCount = Math.max(1, Math.floor(chars.length * 0.48));
    const hidden = new Set(hideIndices.slice(0, hideCount));
    return chars.map((ch, i) => (hidden.has(i) ? '_' : ch)).join(' ');
  }

  // ==================== COMPACT URL SHARE ENCODING ====================

  function utf8ToBase64Url(str) {
    let bytes;
    if (typeof TextEncoder !== 'undefined') {
      bytes = new TextEncoder().encode(str);
    } else if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function base64UrlToUtf8(b64url) {
    const padLen = (4 - (b64url.length % 4)) % 4;
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLen);
    if (typeof atob === 'function') {
      const binary = atob(b64);
      const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }
    return Buffer.from(b64, 'base64').toString('utf8');
  }

  function encodeShareState(state) {
    const payload = {
      v: 1,
      t: state.title || 'Kelime Avı',
      sub: state.subtitle || '',
      r: state.rows,
      c: state.cols,
      sh: state.shape,
      d: state.directions,
      dn: state.density,
      lc: state.letterCase,
      fm: state.fillMode,
      mg: state.mebGroup,
      lg: state.language,
      wm: state.wordBankMode,
      sm: state.secretMessage || '',
      sd: state.seed,
      w: state.rawWords
    };
    if (state.shape === 'custom' && Array.isArray(state.customMask)) {
      payload.cm = state.customMask.map(row => row.map(v => (v ? '1' : '0')).join('')).join('.');
    }
    return utf8ToBase64Url(JSON.stringify(payload));
  }

  function decodeShareState(encoded) {
    try {
      const json = base64UrlToUtf8(encoded);
      const p = JSON.parse(json);
      if (!p || typeof p !== 'object' || !p.w) return null;
      const out = {
        title: p.t || 'Kelime Avı',
        subtitle: p.sub || '',
        rows: Number(p.r) || 10,
        cols: Number(p.c) || Number(p.r) || 10,
        shape: p.sh || 'rect',
        directions: Array.isArray(p.d) ? p.d : DIRECTION_PRESETS.normal,
        density: p.dn || 'balanced',
        letterCase: p.lc || 'upper',
        fillMode: p.fm || 'tr_freq',
        mebGroup: p.mg || 'meb1',
        language: p.lg || 'tr',
        wordBankMode: p.wm || 'list',
        secretMessage: p.sm || '',
        seed: Number(p.sd) || randomSeed(),
        rawWords: String(p.w || '')
      };
      if (p.cm && typeof p.cm === 'string') {
        out.customMask = p.cm.split('.').map(row => row.split('').map(ch => ch === '1'));
      }
      return out;
    } catch (_) {
      return null;
    }
  }

  return {
    TR_ALPHABET,
    EN_ALPHABET,
    DIRECTIONS,
    DIRECTION_MAP,
    DIRECTION_PRESETS,
    SHAPES,
    toUpper,
    toLower,
    cleanLetters,
    formatLetter,
    formatDisplayWord,
    parseWordInput,
    entriesToText,
    createRng,
    randomSeed,
    buildShapeMask,
    generatePuzzle,
    encodeShareState,
    decodeShareState
  };
}));
