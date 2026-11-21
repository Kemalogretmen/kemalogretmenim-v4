(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KemalExamWorkspace = api;
})(globalThis, function () {
  'use strict';

  const palette = ['#EF4444', '#2563EB', '#0F172A', '#10B981', '#F97316'];
  const letters = 'ABCDEF';
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function groupSections(questions, labelFor) {
    const groups = new Map();
    questions.forEach((question, index) => {
      const label = labelFor(question, index) || 'Genel';
      if (!groups.has(label)) groups.set(label, { label, indices: [] });
      groups.get(label).indices.push(index);
    });
    return [...groups.values()];
  }

  function normalizeOptions(positions, count) {
    const result = {};
    for (const letter of letters.slice(0, count)) {
      const point = positions?.[letter];
      if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) continue;
      if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) continue;
      result[letter] = {
        x: Math.round(point.x * 10000) / 10000,
        y: Math.round(point.y * 10000) / 10000
      };
    }
    return result;
  }

  function detectOptions(blocks, width, height, count) {
    const options = Object.fromEntries([...letters.slice(0, count)].map(letter => [letter, []]));
    for (const block of blocks || []) {
      for (const paragraph of block.paragraphs || []) {
        for (const line of paragraph.lines || []) {
          const words = line.words || [];
          words.forEach((word, index) => {
            const label = word.text?.match(/^\(?([A-F])[).:\-][^A-Za-z]?$/i);
            const next = words[index + 1];
            const split = /^[A-F]$/i.test(word.text || '') && /^[).:\-]$/.test(next?.text || '');
            const letter = (label?.[1] || (split ? word.text : '')).toUpperCase();
            if (!options[letter] || !(word.confidence >= 48) || !word.bbox) return;
            const { x0, y0, x1, y1 } = word.bbox;
            const right = split ? next.bbox?.x1 ?? x1 : x1;
            options[letter].push({ x: (x0 + right) / (2 * width), y: (y0 + y1) / (2 * height) });
          });
        }
      }
    }
    // Ambiguous labels stay unplaced until the author confirms their locations.
    return normalizeOptions(Object.fromEntries(Object.entries(options)
      .filter(([, hits]) => hits.length === 1).map(([letter, hits]) => [letter, hits[0]])), count);
  }

  function visualKey(source) {
    // The same URL survives a metadata edit. Inline images use a compact fingerprint.
    let hash = 2166136261;
    for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
    return source ? (hash >>> 0).toString(36) : '';
  }

  function packInk(strokes, limit) {
    const valid = strokes.filter(stroke => stroke.points.length);
    const capacity = Math.floor(limit / 4) * 3;
    const retained = valid.slice(-Math.floor(capacity / 8));
    if (!retained.length || capacity < 8) return '';
    const available = Math.floor((capacity - retained.length * 4) / 4);
    const total = retained.reduce((sum, stroke) => sum + stroke.points.length, 0);
    const bytes = new Uint8Array(capacity);
    const view = new DataView(bytes.buffer);
    let offset = 0;
    for (const stroke of retained) {
      const count = Math.min(stroke.points.length, 65535,
        1 + Math.floor((available - retained.length) * (stroke.points.length - 1) / Math.max(1, total - retained.length)));
      bytes[offset] = stroke.tool === 'eraser' ? 255 : Math.max(0, palette.indexOf(stroke.color));
      bytes[offset + 1] = clamp(Math.round(stroke.size), 1, 24);
      view.setUint16(offset + 2, count);
      offset += 4;
      for (let i = 0; i < count; i++) {
        const point = stroke.points[Math.round(i * (stroke.points.length - 1) / Math.max(1, count - 1))];
        view.setInt16(offset, Math.round(clamp(point.x, -8, 8) * 4000));
        view.setInt16(offset + 2, Math.round(clamp(point.y, -8, 8) * 4000));
        offset += 4;
      }
    }
    return btoa(String.fromCharCode(...bytes.subarray(0, offset)));
  }

  function unpackInk(encoded) {
    if (typeof encoded !== 'string' || encoded.length > 100000) return [];
    try {
      const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
      const view = new DataView(bytes.buffer);
      const strokes = [];
      for (let offset = 0; offset < bytes.length;) {
        const color = bytes[offset];
        const size = bytes[offset + 1];
        const count = view.getUint16(offset + 2);
        offset += 4;
        if ((!palette[color] && color !== 255) || size < 1 || size > 24 || !count || offset + count * 4 > bytes.length) return [];
        const points = [];
        for (let i = 0; i < count; i++, offset += 4) {
          points.push({ x: view.getInt16(offset) / 4000, y: view.getInt16(offset + 2) / 4000 });
        }
        strokes.push({ tool: color === 255 ? 'eraser' : 'pencil', color: palette[color], size, points });
      }
      return strokes;
    } catch (error) {
      return [];
    }
  }

  function captureInk(questions, drawingFor, sourceFor) {
    const drawings = questions.map((question, index) => ({ question, index, strokes: drawingFor(index) }))
      .filter(item => item.strokes?.some(stroke => stroke.tool !== 'eraser' && stroke.points.length));
    const limit = Math.min(24000, Math.floor(96000 / Math.max(1, drawings.length)));
    return new Map(drawings.map(({ question, index, strokes }) => [index, {
      ink: packInk(strokes, limit),
      inkImage: visualKey(sourceFor(question))
    }]));
  }

  function summarizeOutcomes(entries) {
    const rows = new Map();
    for (const entry of entries) {
      if (!entry.learningOutcome) continue;
      const key = JSON.stringify([entry.sectionTitle, entry.learningOutcome]);
      if (!rows.has(key)) rows.set(key, { section: entry.sectionTitle, label: entry.learningOutcome, correct: 0, wrong: 0, blank: 0 });
      rows.get(key)[{ D: 'correct', Y: 'wrong', B: 'blank' }[entry.outcome] || 'blank']++;
    }
    return [...rows.values()].sort((a, b) => (b.wrong + b.blank) - (a.wrong + a.blank));
  }

  function summarizeItems(results) {
    const items = new Map();
    const seen = new Set();
    for (const result of results) {
      if (result.status === 'in_progress' || !Array.isArray(result.answerDetails)) continue;
      if (result.clientAttemptId && seen.has(result.clientAttemptId)) continue;
      if (result.clientAttemptId) seen.add(result.clientAttemptId);
      for (const detail of result.answerDetails) {
        const number = Number(detail?.questionNo);
        const outcome = { D: 'correct', Y: 'wrong', B: 'blank' }[detail?.outcome];
        if (!Number.isInteger(number) || number < 1 || number > 500 || !outcome) continue;
        const key = JSON.stringify([number, detail.questionId || '', detail.correctAnswer || '']);
        if (!items.has(key)) items.set(key, {
          number, correct: 0, wrong: 0, blank: 0,
          choices: Object.fromEntries([...letters].map(letter => [letter, 0]))
        });
        const item = items.get(key);
        item[outcome]++;
        if (Object.hasOwn(item.choices, detail.selectedAnswer)) item.choices[detail.selectedAnswer]++;
      }
    }
    return [...items.values()].map(item => {
      const total = item.correct + item.wrong + item.blank;
      return { ...item, total, percentCorrect: Math.round(item.correct * 100 / total) };
    }).sort((a, b) => a.percentCorrect - b.percentCorrect || a.number - b.number);
  }

  return { groupSections, normalizeOptions, detectOptions, visualKey, captureInk, unpackInk, summarizeOutcomes, summarizeItems };
});
