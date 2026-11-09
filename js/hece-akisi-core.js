(function(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HeceAkisiCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  'use strict';

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function parseUnits(value) {
    var source = Array.isArray(value) ? value : String(value || '').split(/[\n,;]+/);
    return source
      .map(function(item) { return clean(item).slice(0, 20); })
      .filter(Boolean)
      .slice(0, 200);
  }

  function normalizeMode(value) {
    return value === 'automatic' ? 'automatic' : 'manual';
  }

  function normalizeInterval(value) {
    var parsed = Math.round(Number(value) || 2000);
    return Math.min(10000, Math.max(300, parsed));
  }

  function calculateWpm(itemCount, elapsedMs) {
    var count = Math.max(0, Number(itemCount) || 0);
    var elapsed = Math.max(0, Number(elapsedMs) || 0);
    if (!count || !elapsed) return 0;
    return Math.round((count * 60000 / elapsed) * 100) / 100;
  }

  function formatDuration(elapsedMs) {
    var totalSeconds = Math.max(0, Math.round((Number(elapsedMs) || 0) / 1000));
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    return minutes + ':' + String(seconds).padStart(2, '0');
  }

  function normalizeStream(value) {
    var source = value || {};
    return {
      id: clean(source.id),
      title: clean(source.title) || 'Hece Akışı',
      description: clean(source.description),
      fixedUnit: clean(source.fixed_unit || source.fixedUnit).slice(0, 20),
      units: parseUnits(source.falling_units || source.units),
      mode: normalizeMode(source.mode),
      intervalMs: normalizeInterval(source.interval_ms || source.intervalMs),
      gradeLevel: Math.min(8, Math.max(1, Math.round(Number(source.grade_level || source.gradeLevel) || 1))),
      status: clean(source.status) || 'draft',
      visibility: clean(source.visibility) || 'private',
      ownerId: clean(source.owner_id || source.ownerId),
      ownerType: clean(source.owner_type || source.ownerType),
    };
  }

  function createSession(stream, now) {
    var normalized = normalizeStream(stream);
    var clock = typeof now === 'function' ? now : function() { return Date.now(); };
    var index = -1;
    var startedAt = null;
    var finishedAt = null;

    function snapshot() {
      var elapsed = startedAt !== null ? Math.max(0, (finishedAt !== null ? finishedAt : clock()) - startedAt) : 0;
      return {
        started: startedAt !== null,
        complete: finishedAt !== null,
        index: index,
        current: index >= 0 ? normalized.units[index] : '',
        remaining: Math.max(0, normalized.units.length - index - 1),
        elapsedMs: elapsed,
        wordsPerMinute: calculateWpm(normalized.units.length, elapsed),
      };
    }

    return {
      start: function() {
        if (!normalized.units.length) return snapshot();
        if (startedAt === null) startedAt = clock();
        if (index < 0) index = 0;
        return snapshot();
      },
      next: function() {
        if (startedAt === null) return this.start();
        if (finishedAt !== null) return snapshot();
        if (index < normalized.units.length - 1) index += 1;
        else finishedAt = Math.max(clock(), startedAt + 250);
        return snapshot();
      },
      finish: function() {
        if (startedAt === null) startedAt = clock();
        index = Math.max(0, normalized.units.length - 1);
        finishedAt = Math.max(clock(), startedAt + 250);
        return snapshot();
      },
      reset: function() {
        index = -1;
        startedAt = null;
        finishedAt = null;
        return snapshot();
      },
      getState: snapshot,
      stream: normalized,
    };
  }

  return {
    clean: clean,
    parseUnits: parseUnits,
    normalizeMode: normalizeMode,
    normalizeInterval: normalizeInterval,
    normalizeStream: normalizeStream,
    calculateWpm: calculateWpm,
    formatDuration: formatDuration,
    createSession: createSession,
  };
});
