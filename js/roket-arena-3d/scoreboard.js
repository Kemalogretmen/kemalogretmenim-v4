// scoreboard.js — Separate Local Top-10 Scoreboards (Education & Fun Modes) + Persistent Settings

const Scoreboard = (() => {
  const KEYS = {
    edu: 'roket_arena_top10_edu_v1',
    fun: 'roket_arena_top10_fun_v1',
    prefs: 'roket_arena_prefs_v1',
  };
  const MAX_ENTRIES = 10;

  function safeRead(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed !== null && parsed !== undefined ? parsed : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function safeWrite(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function getList(mode) {
    const key = mode === 'fun' ? KEYS.fun : KEYS.edu;
    const arr = safeRead(key, []);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((e) => e && typeof e.score === 'number')
      .sort((a, b) => b.score - a.score || (b.ts || 0) - (a.ts || 0))
      .slice(0, MAX_ENTRIES);
  }

  function record(mode, entry) {
    const key = mode === 'fun' ? KEYS.fun : KEYS.edu;
    const score = Math.max(0, Math.round(Number(entry.score) || 0));
    if (score <= 0) {
      return { enteredTop10: false, rank: -1, isNewRecord: false, list: getList(mode) };
    }

    const cleanName = String(entry.name || 'Oyuncu').trim().slice(0, 18) || 'Oyuncu';
    const ts = Date.now();
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;

    const item = {
      id: `${ts}_${Math.random().toString(36).slice(2, 7)}`,
      name: cleanName,
      score,
      variant: entry.variant || '⚽ Roket Gol',
      detail: String(entry.detail || ''),
      playersLabel: entry.playersLabel || '1K',
      date: dateStr,
      ts,
    };

    const list = getList(mode);
    const prevTop = list.length > 0 ? list[0].score : 0;

    list.push(item);
    list.sort((a, b) => b.score - a.score || b.ts - a.ts);

    const trimmed = list.slice(0, MAX_ENTRIES);
    const rankIdx = trimmed.findIndex((x) => x.id === item.id);
    const enteredTop10 = rankIdx !== -1;

    if (enteredTop10) {
      safeWrite(key, trimmed);
    }

    return {
      enteredTop10,
      rank: enteredTop10 ? rankIdx + 1 : -1,
      isNewRecord: enteredTop10 && rankIdx === 0 && score > prevTop,
      list: enteredTop10 ? trimmed : getList(mode),
    };
  }

  function clear(mode) {
    const key = mode === 'fun' ? KEYS.fun : KEYS.edu;
    safeWrite(key, []);
  }

  function getBest(mode) {
    const list = getList(mode);
    return list.length > 0 ? list[0].score : 0;
  }

  function loadPrefs(defaults) {
    const saved = safeRead(KEYS.prefs, {});
    return Object.assign({}, defaults, saved);
  }

  function savePrefs(prefs) {
    safeWrite(KEYS.prefs, prefs);
  }

  return {
    getList,
    record,
    clear,
    getBest,
    loadPrefs,
    savePrefs,
    MAX_ENTRIES,
  };
})();
