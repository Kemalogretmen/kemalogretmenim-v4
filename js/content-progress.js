(function() {
  'use strict';

  var STORAGE_KEY = 'kemal_content_progress_v1';
  var USER_STORAGE_PREFIX = STORAGE_KEY + '_user_';
  var STORE_VERSION = 1;
  var REMOTE_TABLE = 'user_content_progress';
  var remoteState = {
    started: false,
    syncing: false,
  };

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
    if (raw === 'ebook' || raw === 'e-kitap' || raw === 'e_kitap') {
      return 'ebook';
    }
    if (raw === 'sinav' || raw === 'exam') {
      return 'exam';
    }
    if (raw === 'dokuman' || raw === 'document' || raw === 'pdf') {
      return 'document';
    }
    if (raw === 'video' || raw === 'ders-videosu') {
      return 'video';
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
    if (raw === 'watched' || raw === 'izlendi') {
      return 'watched';
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

  function getStoreKeyForUser(userId) {
    return userId ? USER_STORAGE_PREFIX + String(userId) : STORAGE_KEY;
  }

  function getActiveStoreKey() {
    return getStoreKeyForUser(getAuthUserId());
  }

  function loadStore(storeKey) {
    var raw = null;
    try {
      raw = localStorage.getItem(storeKey || getActiveStoreKey());
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

  function persistStore(store, storeKey) {
    try {
      localStorage.setItem(storeKey || getActiveStoreKey(), JSON.stringify(store));
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

  function getPatchMeta(patch) {
    return patch && patch.meta && typeof patch.meta === 'object' && !Array.isArray(patch.meta)
      ? patch.meta
      : {};
  }

  function getItemMeta(item) {
    return item && item.meta && typeof item.meta === 'object' && !Array.isArray(item.meta)
      ? item.meta
      : {};
  }

  function getRecordOwnerId(item, patch, existing) {
    var patchMeta = getPatchMeta(patch);
    var itemMeta = getItemMeta(item);
    var existingMeta = existing && existing.meta && typeof existing.meta === 'object' ? existing.meta : {};
    return String(
      patchMeta.accountUid ||
      itemMeta.accountUid ||
      existingMeta.accountUid ||
      getAuthUserId() ||
      ''
    ).trim();
  }

  function upsertRecord(item, patch) {
    var key = buildItemKey(item);
    if (!key) {
      return null;
    }

    var existingProbe = loadStore();
    var existing = existingProbe.records[key] && typeof existingProbe.records[key] === 'object'
      ? existingProbe.records[key]
      : {};
    var ownerId = getRecordOwnerId(item, patch, existing);
    var storeKey = getStoreKeyForUser(ownerId);
    var store = loadStore(storeKey);
    existing = store.records[key] && typeof store.records[key] === 'object'
      ? store.records[key]
      : {};
    var type = normalizeType(item.type || existing.type);
    var status = normalizeStatus((patch && patch.status) || existing.status);
    var mergedMeta = Object.assign({}, cloneMeta(existing.meta), cloneMeta(item.meta), cloneMeta(patch && patch.meta));
    if (ownerId) {
      mergedMeta.accountUid = ownerId;
    }
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
      meta: mergedMeta,
    };

    store.records[key] = nextRecord;
    persistStore(store, storeKey);
    if (ownerId && ownerId === getAuthUserId()) {
      pushRecordToRemote(nextRecord);
    }
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
    if (safeType === 'video' && (safeStatus === 'read' || safeStatus === 'watched')) {
      return 'İzlendi';
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
    if (safeType === 'ebook' && safeStatus === 'completed') {
      return 'Okundu';
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
    var userId = getAuthUserId();
    var store = loadStore();
    return Object.keys(store.records).map(function(key) {
      return Object.assign({}, store.records[key]);
    }).filter(function(record) {
      if (!userId) {
        return true;
      }
      return record && record.meta && record.meta.accountUid === userId;
    });
  }

  function getAuthApi() {
    return window.kemalUserAuth && typeof window.kemalUserAuth.getState === 'function'
      ? window.kemalUserAuth
      : null;
  }

  function getAuthState() {
    var api = getAuthApi();
    return api ? api.getState() : {};
  }

  function getAuthUserId() {
    var authState = getAuthState();
    return authState && authState.user && authState.user.id ? authState.user.id : '';
  }

  function getAuthRole() {
    var authState = getAuthState();
    return authState && authState.profile && authState.profile.role ? String(authState.profile.role) : '';
  }

  function getAuthClient() {
    var api = getAuthApi();
    return api && typeof api.getClient === 'function' ? api.getClient() : null;
  }

  function getRecordScore(record) {
    var meta = record && record.meta ? record.meta : {};
    var score = meta.score !== undefined ? meta.score : (meta.score100 !== undefined ? meta.score100 : meta.puan_100luk);
    var parsed = Number(score);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function recordToRemoteRow(record, userId) {
    var type = normalizeType(record && record.type);
    var status = normalizeStatus(record && record.status);
    var meta = cloneMeta(record && record.meta);
    if (userId && !meta.accountUid) {
      meta.accountUid = userId;
    }
    return {
      user_id: userId,
      content_type: type,
      content_id: String(record && record.id ? record.id : buildItemKey(record)).slice(0, 220),
      title: String(record && record.title ? record.title : '').slice(0, 240),
      href: String(record && record.href ? record.href : '').slice(0, 500),
      grade: String(record && record.grade !== undefined ? record.grade : '').slice(0, 80),
      subject: String(record && record.subject ? record.subject : '').slice(0, 120),
      status: status,
      score: getRecordScore(record),
      detail_json: {
        local_key: record.key || buildItemKey(record),
        meta: meta,
      },
      completed_at: status === 'completed' || status === 'watched' ? (record.updatedAt || new Date().toISOString()) : null,
      updated_at: record.updatedAt || new Date().toISOString(),
    };
  }

  function rowToRecord(row) {
    if (!row) {
      return null;
    }
    var detail = row.detail_json && typeof row.detail_json === 'object' ? row.detail_json : {};
    var meta = Object.assign({}, cloneMeta(detail.meta), {
      remoteId: row.id || '',
      score: row.score !== null && row.score !== undefined ? Number(row.score) : undefined,
    });
    return {
      key: detail.local_key || normalizeType(row.content_type) + ':' + String(row.content_id || ''),
      type: normalizeType(row.content_type),
      id: String(row.content_id || ''),
      href: row.href || '',
      title: row.title || '',
      grade: row.grade || '',
      subject: row.subject || '',
      status: normalizeStatus(row.status),
      updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
      meta: meta,
    };
  }

  function getTime(value) {
    var time = Date.parse(String(value || ''));
    return Number.isNaN(time) ? 0 : time;
  }

  function mergeRemoteRows(rows, userId) {
    var store = loadStore(getStoreKeyForUser(userId));
    (Array.isArray(rows) ? rows : []).forEach(function(row) {
      var record = rowToRecord(row);
      if (!record || !record.key) {
        return;
      }
      if (userId && (!record.meta || record.meta.accountUid !== userId)) {
        return;
      }
      var existing = store.records[record.key];
      if (!existing || getTime(record.updatedAt) >= getTime(existing.updatedAt)) {
        store.records[record.key] = record;
      }
    });
    persistStore(store, getStoreKeyForUser(userId));
    return store;
  }

  async function pushRecordToRemote(record) {
    var userId = getAuthUserId();
    var client = getAuthClient();
    if (!userId || !client || !record) {
      return;
    }
    if (getAuthRole() === 'teacher') {
      var type = normalizeType(record.type);
      var status = normalizeStatus(record.status);
      var meta = record.meta || {};
      if ((type === 'exam' || type === 'reading') && (status === 'completed' || meta.resultSnapshot || meta.readingResult)) {
        return;
      }
    }
    try {
      await client
        .from(REMOTE_TABLE)
        .upsert(recordToRemoteRow(record, userId), {
          onConflict: 'user_id,content_type,content_id',
        });
    } catch (error) {
      /* SQL kurulmamışsa yerel kayıt çalışmaya devam eder. */
    }
  }

  async function syncRemoteProgress() {
    var userId = getAuthUserId();
    var client = getAuthClient();
    if (!userId || !client || remoteState.syncing) {
      return;
    }
    remoteState.syncing = true;
    try {
      var result = await client
        .from(REMOTE_TABLE)
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(500);
      if (result.error) {
        throw result.error;
      }
      var merged = mergeRemoteRows(result.data || [], userId);
      await Promise.all(Object.keys(merged.records).map(function(key) {
        var record = merged.records[key];
        if (!record || !record.meta || record.meta.accountUid !== userId) {
          return null;
        }
        return pushRecordToRemote(record);
      }));
    } catch (error) {
      /* Uzak senkron opsiyonel; tablo yoksa sessiz kal. */
    } finally {
      remoteState.syncing = false;
    }
  }

  function startAuthBridge() {
    if (remoteState.started) {
      return;
    }
    remoteState.started = true;

    function syncWhenReady() {
      var api = getAuthApi();
      if (!api) {
        return;
      }
      api.ready().then(syncRemoteProgress);
    }

    window.addEventListener('kemal-user-auth-ready', syncWhenReady);
    window.addEventListener('kemal-user-auth-changed', syncRemoteProgress);
    syncWhenReady();
    window.setTimeout(syncWhenReady, 1200);
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
    getStatusLabel: getStatusLabel,
    hasStatus: hasStatus,
    markRead: markRead,
    markCompleted: markCompleted,
    upsertRecord: upsertRecord,
    syncRemote: syncRemoteProgress,
  };

  startAuthBridge();
})();
