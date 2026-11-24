// rounding.js — Turkish Elementary Curriculum (2nd, 3rd, 4th Grade) Nearest Ten & Hundred Rounding Engine

const RoundingEdu = (() => {
  const recentNumbers = [];
  const MAX_RECENT = 14;

  function formatNum(n) {
    const abs = Math.abs(Math.round(n));
    const s = String(abs);
    if (s.length <= 3) return (n < 0 ? '-' : '') + s;
    let out = '';
    let count = 0;
    for (let i = s.length - 1; i >= 0; i--) {
      if (count > 0 && count % 3 === 0) out = '.' + out;
      out = s[i] + out;
      count++;
    }
    return (n < 0 ? '-' : '') + out;
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function getGradeMeta(grade) {
    if (grade === 2) {
      return {
        grade: 2,
        label: '2. Sınıf',
        maxVal: 100,
        allowHundred: false,
        summary: "100'e kadar sadece en yakın onluğa yuvarlama",
      };
    }
    if (grade === 3) {
      return {
        grade: 3,
        label: '3. Sınıf',
        maxVal: 1000,
        allowHundred: true,
        summary: "1.000'e kadar en yakın onluğa ve yüzlüğe yuvarlama",
      };
    }
    return {
      grade: 4,
      label: '4. Sınıf',
      maxVal: 10000,
      allowHundred: true,
      summary: "10.000'e kadar en yakın onluğa ve yüzlüğe yuvarlama",
    };
  }

  function roundToTen(n) {
    return Math.floor((n + 5) / 10) * 10;
  }

  function roundToHundred(n) {
    return Math.floor((n + 50) / 100) * 100;
  }

  function pickNumber(grade, targetType) {
    let minN = 11;
    let maxN = 99;
    if (grade === 3) {
      minN = 101;
      maxN = 999;
    } else if (grade === 4) {
      minN = 1001;
      maxN = 9999;
    }

    for (let attempt = 0; attempt < 60; attempt++) {
      let n;
      if (targetType === 'ten') {
        // Include ~24% boundary digit 5 cases and ~12% carry-over 9x cases for rich practice
        const r = Math.random();
        if (r < 0.24) {
          const baseMin = Math.ceil((minN - 5) / 10);
          const baseMax = Math.floor((maxN - 5) / 10);
          n = randInt(baseMin, baseMax) * 10 + 5;
        } else if (r < 0.34 && grade >= 3) {
          // Carry-over over a hundred (e.g. 296 -> 300, 4997 -> 5000)
          const hMin = grade === 3 ? 1 : 10;
          const hMax = grade === 3 ? 9 : 99;
          const ones = randInt(1, 9);
          n = randInt(hMin, hMax) * 100 + 90 + ones;
        } else {
          n = randInt(minN, maxN);
        }
        if (n < minN || n > maxN || n % 10 === 0) continue;
      } else {
        // Nearest hundred
        const r = Math.random();
        if (r < 0.24) {
          // Exact 50 or near-boundary (48..52)
          const hMin = Math.floor(minN / 100);
          const hMax = Math.floor(maxN / 100);
          const rem = Math.random() < 0.55 ? 50 : randInt(46, 54);
          n = randInt(hMin, hMax) * 100 + rem;
        } else {
          n = randInt(minN, maxN);
        }
        if (n < minN || n > maxN || n % 100 === 0) continue;
      }

      if (recentNumbers.includes(n) && attempt < 40) continue;
      recentNumbers.push(n);
      if (recentNumbers.length > MAX_RECENT) recentNumbers.shift();
      return n;
    }

    // Fallback guaranteed valid
    if (grade === 2) return 47;
    if (grade === 3) return targetType === 'ten' ? 368 : 645;
    return targetType === 'ten' ? 4376 : 5852;
  }

  function buildChoices(n, targetType, correct, maxVal, choiceCount) {
    const step = targetType === 'ten' ? 10 : 100;
    const minChoice = step;
    const floorVal = Math.floor(n / step) * step;
    const ceilVal = floorVal + step;
    const opposite = correct === ceilVal ? floorVal : ceilVal;

    const set = new Set([correct]);
    if (opposite >= minChoice && opposite <= maxVal) {
      set.add(opposite);
    }

    // Nearby pedagogical distractors (tightly clustered adjacent multiples first!)
    const nearOffsets = shuffle([step, -step]);
    const midOffsets = shuffle([step * 2, -step * 2]);
    const farOffsets = shuffle([step * 3, -step * 3]);
    const offsets = [...nearOffsets, ...midOffsets, ...farOffsets];
    for (const off of offsets) {
      if (set.size >= choiceCount) break;
      const cand = correct + off;
      if (cand >= minChoice && cand <= maxVal && !set.has(cand)) {
        set.add(cand);
      }
    }

    // Secondary fallback from opposite side
    for (const off of offsets) {
      if (set.size >= choiceCount) break;
      const cand = opposite + off;
      if (cand >= minChoice && cand <= maxVal && !set.has(cand)) {
        set.add(cand);
      }
    }

    // Ultimate fallback if still short
    let extra = minChoice;
    while (set.size < choiceCount) {
      if (!set.has(extra)) set.add(extra);
      extra += step;
    }

    return shuffle(Array.from(set).slice(0, choiceCount));
  }

  // Split formatted number into prefix + highlighted deciding digit(s) for optional pedagogical hint
  function highlightParts(n, targetType) {
    const formatted = formatNum(n);
    if (targetType === 'ten') {
      // Highlight the ones digit (last character)
      return {
        prefix: formatted.slice(0, -1),
        deciding: formatted.slice(-1),
      };
    }
    // Hundred: highlight last 2 digits (tens + ones)
    return {
      prefix: formatted.slice(0, -2),
      deciding: formatted.slice(-2),
    };
  }

  function explain(n, targetType, correct) {
    const nf = formatNum(n);
    const cf = formatNum(correct);
    if (targetType === 'ten') {
      const ones = n % 10;
      if (ones >= 5) {
        return `${nf} → Birler basamağı ${ones} (5 ve üzeri), yukarı yuvarlanır: ${cf}!`;
      }
      return `${nf} → Birler basamağı ${ones} (5'ten küçük), aşağı yuvarlanır: ${cf}!`;
    }
    const lastTwo = n % 100;
    const lastTwoStr = String(lastTwo).padStart(2, '0');
    if (lastTwo >= 50) {
      return `${nf} → Son iki basamak ${lastTwoStr} (50 ve üzeri), yukarı yuvarlanır: ${cf}!`;
    }
    return `${nf} → Son iki basamak ${lastTwoStr} (50'den küçük), aşağı yuvarlanır: ${cf}!`;
  }

  function resetHistory() {
    recentNumbers.length = 0;
  }

  // Generate a complete rounding question object
  function generateQuestion(grade, roundMode, choiceCount = 3) {
    const meta = getGradeMeta(grade);
    let targetType = 'ten';
    if (meta.allowHundred) {
      if (roundMode === 'hundred') targetType = 'hundred';
      else if (roundMode === 'mixed') targetType = Math.random() < 0.5 ? 'ten' : 'hundred';
      else targetType = 'ten';
    }

    const num = pickNumber(meta.grade, targetType);
    const correct = targetType === 'ten' ? roundToTen(num) : roundToHundred(num);
    const choices = buildChoices(num, targetType, correct, meta.maxVal, choiceCount);
    const parts = highlightParts(num, targetType);

    return {
      grade: meta.grade,
      num,
      numFormatted: formatNum(num),
      targetType, // 'ten' | 'hundred'
      typeBadge: targetType === 'ten' ? 'EN YAKIN ONLUK' : 'EN YAKIN YÜZLÜK',
      shortTag: targetType === 'ten' ? 'ONLUĞA' : 'YÜZLÜĞE',
      promptText:
        targetType === 'ten'
          ? `${formatNum(num)} sayısını en yakın onluğa yuvarla!`
          : `${formatNum(num)} sayısını en yakın yüzlüğe yuvarla!`,
      speechText:
        targetType === 'ten'
          ? `${num} sayısını en yakın onluğa yuvarla`
          : `${num} sayısını en yakın yüzlüğe yuvarla`,
      correct,
      correctFormatted: formatNum(correct),
      choices,
      choicesFormatted: choices.map(formatNum),
      prefix: parts.prefix,
      deciding: parts.deciding,
      explanation: explain(num, targetType, correct),
    };
  }

  return {
    formatNum,
    getGradeMeta,
    roundToTen,
    roundToHundred,
    resetHistory,
    generateQuestion,
  };
})();
