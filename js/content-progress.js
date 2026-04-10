(function() {
  'use strict';

  var STORAGE_KEY = 'kemal_content_progress_v1';
  var STORE_VERSION = 1;

  function safeJsonParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function normalizeType(value) {
    var raw = String(value || '').trim().toLowerCase();
    if (raw === 'okuma' || raw === 'reading' || raw === 'metin') {
      return 'reading';
    }
    if (raw === 'sinav' || raw === 'exam') {
      return 'exam';
    }
    if (raw === 'dokuman' || raw === 'document' || raw === 'pdf') {
      return 'document';
    }
    if (raw === 'worksheet' || raw === 'calisma-kagidi' || raw === 'calisma_kagidi') {
      return 'worksheet';
    }
    return raw || 'content';
  }

  function normalizeStatus(value) {
    var raw = String(value || '').trim().toLowerCase();
    if (raw === 'completed' || raw === 'done' || raw === 'yapildi' || raw === 'tamamlandi' || raw === 'solved') {
      return 'completed';
    }
    if (raw === 'read' || raw === 'opened' || raw === 'okundu' || raw === 'viewed') {
      return 'read';
    }
    return raw || 'read';
  }

  function getHrefKey(value) {
    if (!value) {
      return '';
    }
    try {
      var parsed = new URL(String(value), window.location.origin);
      return parsed.pathname + parsed.search;
    } catch (error) {
      return String(value || '').trim();
    }
  }

  function buildItemKey(item) {
    if (!item) {
      return '';
    }
    if (item.key) {
      return String(item.key);
    }
    var type = normalizeType(item.type);
    var id = item.id !== undefined && item.id !== null && String(item.id).trim()
      ? String(item.id).trim()
      : getHrefKey(item.href || item.link || '');
    return type + ':' + id;
  }

  function createEmptyStore() {
    return {
      version: STORE_VERSION,
      records: {},
    };
  }

  function loadStore() {
    var raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return createEmptyStore();
    }
    var parsed = safeJsonParse(raw, null);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return createEmptyStore();
    }
    return {
      version: STORE_VERSION,
      records: parsed.records && typeof parsed.records === 'object' ? parsed.records : {},
    };
  }

  function persistStore(store) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (error) {
      return;
    }
    window.dispatchEvent(new CustomEvent('kemal-content-progress-changed', {
      detail: {
        store: store,
      },
    }));
  }

  function cloneMeta(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return Object.assign({}, value);
  }

  function upsertRecord(item, patch) {
    var key = buildItemKey(item);
    if (!key) {
      return null;
    }

    var store = loadStore();
    var existing = store.records[key] && typeof store.records[key] === 'object'
      ? store.records[key]
      : {};
    var type = normalizeType(item.type || existing.type);
    var status = normalizeStatus((patch && patch.status) || existing.status);
    var nextRecord = {
      key: key,
      type: type,
      id: item.id !== undefined && item.id !== null && String(item.id).trim()
        ? String(item.id).trim()
        : (existing.id || ''),
      href: item.href || item.link || existing.href || '',
      title: item.title || item.baslik || existing.title || '',
      grade: item.grade !== undefined && item.grade !== null && item.grade !== ''
        ? item.grade
        : (existing.grade !== undefined ? existing.grade : ''),
      subject: item.subject || existing.subject || '',
      status: status,
      updatedAt: (patch && patch.updatedAt) || new Date().toISOString(),
      meta: Object.assign({}, cloneMeta(existing.meta), cloneMeta(item.meta), cloneMeta(patch && patch.meta)),
    };

    store.records[key] = nextRecord;
    persistStore(store);
    return Object.assign({}, nextRecord);
  }

  function markRead(item, meta) {
    return upsertRecord(item, {
      status: 'read',
      meta: meta,
    });
  }

  function markCompleted(item, meta) {
    return upsertRecord(item, {
      status: 'completed',
      meta: meta,
    });
  }

  function getRecord(item) {
    var key = typeof item === 'string' ? item : buildItemKey(item);
    if (!key) {
      return null;
    }
    var store = loadStore();
    return store.records[key] ? Object.assign({}, store.records[key]) : null;
  }

  function getStatusLabel(type, status) {
    var safeType = normalizeType(type);
    var safeStatus = normalizeStatus(status);

    if (safeType === 'document' && safeStatus === 'read') {
      return 'Okundu';
    }
    if (safeType === 'worksheet' && safeStatus === 'completed') {
      return 'Yapıldı';
    }
    if (safeType === 'exam' && safeStatus === 'completed') {
      return 'Çözüldü';
    }
    if (safeType === 'reading' && safeStatus === 'completed') {
      return 'Tamamlandı';
    }
    if (safeStatus === 'completed') {
      return 'Yapıldı';
    }
    return 'Okundu';
  }

  function getStatusMeta(item) {
    var safeItem = item || {};
    var type = normalizeType(safeItem.type);

    if (type === 'document') {
      var worksheetRecord = getRecord({
        type: 'worksheet',
        id: safeItem.id,
      });
      if (worksheetRecord && normalizeStatus(worksheetRecord.status) === 'completed') {
        return {
          status: 'completed',
          label: 'Yapıldı',
          tone: 'completed',
          updatedAt: worksheetRecord.updatedAt || '',
          record: worksheetRecord,
        };
      }
    }

    var record = getRecord(safeItem);
    if (!record) {
      return null;
    }

    var normalizedStatus = normalizeStatus(record.status);
    return {
      status: normalizedStatus,
      label: getStatusLabel(type || record.type, normalizedStatus),
      tone: normalizedStatus === 'completed' ? 'completed' : 'read',
      updatedAt: record.updatedAt || '',
      record: record,
    };
  }

  function hasStatus(item, expectedStatus) {
    var meta = getStatusMeta(item);
    if (!meta) {
      return false;
    }
    return normalizeStatus(meta.status) === normalizeStatus(expectedStatus);
  }

  function listRecords() {
    var store = loadStore();
    return Object.keys(store.records).map(function(key) {
      return Object.assign({}, store.records[key]);
    });
  }

  window.kemalContentProgress = {
    STORAGE_KEY: STORAGE_KEY,
    normalizeType: normalizeType,
    normalizeStatus: normalizeStatus,
    buildItemKey: buildItemKey,
    getStore: loadStore,
    listRecords: listRecords,
    getRecord: getRecord,
    getStatusMeta: getStatusMeta,
    hasStatus: hasStatus,
    markRead: markRead,
    markCompleted: markCompleted,
    upsertRecord: upsertRecord,
  };
})();
