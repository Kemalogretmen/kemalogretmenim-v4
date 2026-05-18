(function() {
  'use strict';

  var VISITOR_KEY = 'kemal_content_reaction_visitor_v1';
  var REACTION_MERIT_PREFIX = 'kemal_reaction_merit_v1_';
  var STYLE_ID = 'kemalContentReactionStyle';
  var SCAN_DELAY = 80;
  var scanTimer = 0;
  var loadingKeys = {};
  var summaryMap = {};
  var publicConfig = null;

  function createUuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(ch) {
      var random = Math.random() * 16 | 0;
      var value = ch === 'x' ? random : (random & 0x3 | 0x8);
      return value.toString(16);
    });
  }

  function getVisitorId() {
    try {
      var current = window.localStorage.getItem(VISITOR_KEY);
      if (current) {
        return current;
      }
      var next = createUuid();
      window.localStorage.setItem(VISITOR_KEY, next);
      return next;
    } catch (error) {
      return 'session-' + createUuid();
    }
  }

  function getActiveVisitorId() {
    if (window.kemalUserAuth && typeof window.kemalUserAuth.getReactionVisitorId === 'function') {
      return window.kemalUserAuth.getReactionVisitorId(getVisitorId());
    }
    return getVisitorId();
  }

  function recordReactionForMerit(type, id, reaction) {
    var visitor = getActiveVisitorId();
    if (!visitor || visitor.indexOf('user:') !== 0 || reaction === 'none' || reaction === 'clear' || !reaction) {
      return;
    }
    var userId = visitor.slice(5);
    if (!userId) {
      return;
    }
    try {
      var key = REACTION_MERIT_PREFIX + userId;
      var raw = window.localStorage.getItem(key);
      var parsed = raw ? JSON.parse(raw) : null;
      var state = parsed && typeof parsed === 'object' ? parsed : { reactions: {} };
      if (!state.reactions || typeof state.reactions !== 'object') {
        state.reactions = {};
      }
      state.reactions[keyOf(type, id)] = true;
      state.updatedAt = new Date().toISOString();
      window.localStorage.setItem(key, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent('kemal-reaction-merit-changed', { detail: state }));
    } catch (error) {
      /* Liyakat sayaci opsiyonel. */
    }
  }

  function rememberReactionInProgress(widget, reaction) {
    if (!widget || !window.kemalContentProgress || typeof window.kemalContentProgress.upsertRecord !== 'function') {
      return;
    }
    var type = normalizeType(widget.getAttribute('data-reaction-type'));
    var id = normalizeId(widget.getAttribute('data-reaction-id'));
    if (!type || !id) return;
    var liked = reaction === 'like';
    var disliked = reaction === 'dislike';
    var meta = {
      liked: liked,
      disliked: disliked,
      likedAt: liked ? new Date().toISOString() : '',
      dislikedAt: disliked ? new Date().toISOString() : '',
      sourceLabel: widget.dataset.reactionSource || '',
    };
    if (reaction === 'none' || reaction === 'clear') {
      meta.liked = false;
      meta.disliked = false;
      meta.reactionClearedAt = new Date().toISOString();
    }
    window.kemalContentProgress.upsertRecord({
      type: type,
      id: id,
      title: widget.dataset.reactionTitle || document.title,
      href: widget.dataset.reactionHref || window.location.pathname + window.location.search,
      grade: widget.dataset.reactionGrade || '',
      subject: widget.dataset.reactionSubject || '',
    }, {
      status: 'read',
      meta: meta,
    });
  }

  function getConfig() {
    if (publicConfig) {
      return publicConfig;
    }
    if (!window.kemalSiteStore || typeof window.kemalSiteStore.getConfig !== 'function') {
      return null;
    }
    var config = window.kemalSiteStore.getConfig();
    if (!config || !config.supabaseUrl || !config.supabaseAnonKey) {
      return null;
    }
    publicConfig = config;
    return publicConfig;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function safeText(value, fallback) {
    return String(value || fallback || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeType(value) {
    var raw = safeText(value, 'content').toLowerCase();
    var map = {
      pdf: 'document',
      dokuman: 'document',
      doc: 'document',
      metin: 'reading',
      okuma: 'reading',
      test: 'exam',
      deneme: 'exam',
      sinav: 'exam',
      oyun: 'game',
      calisma: 'worksheet',
      'calisma-kagidi': 'worksheet',
    };
    return map[raw] || raw;
  }

  function normalizeId(value) {
    return safeText(value).slice(0, 220);
  }

  function keyOf(type, id) {
    return normalizeType(type) + ':' + normalizeId(id);
  }

  function getPathHref(rawHref) {
    var href = safeText(rawHref);
    if (!href) {
      return window.location.pathname + window.location.search;
    }
    try {
      var parsed = new URL(href, window.location.origin);
      if (parsed.origin === window.location.origin) {
        return parsed.pathname + parsed.search;
      }
      return parsed.toString();
    } catch (error) {
      return href;
    }
  }

  function getNodeTitle(node) {
    return safeText(
      node.getAttribute('data-reaction-title') ||
      textFrom(node, '.latest-title') ||
      textFrom(node, '.new-title') ||
      textFrom(node, '.subject-doc-title') ||
      textFrom(node, '.mc-title') ||
      textFrom(node, '.ec-title') ||
      textFrom(node, '.gc-title') ||
      textFrom(node, 'h1') ||
      node.textContent,
      document.title
    ).slice(0, 240);
  }

  function textFrom(node, selector) {
    var el = node && node.querySelector ? node.querySelector(selector) : null;
    return el ? el.textContent : '';
  }

  function inferMeta(node) {
    var linkHref = node.href || node.getAttribute('href') || '';
    return {
      contentType: normalizeType(node.getAttribute('data-reaction-type')),
      contentId: normalizeId(node.getAttribute('data-reaction-id')),
      title: getNodeTitle(node),
      href: getPathHref(node.getAttribute('data-reaction-href') || linkHref),
      grade: safeText(node.getAttribute('data-reaction-grade') || textFrom(node, '.latest-tag, .new-pill.grade')),
      subject: safeText(node.getAttribute('data-reaction-subject') || textFrom(node, '.subject-doc-badge, .ec-sub, .gc-category')),
      sourceLabel: safeText(node.getAttribute('data-reaction-source') || textFrom(node, '.new-pill.type, .latest-tag:nth-child(3)')),
    };
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.content-reaction-widget{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:12px;position:relative;z-index:5}',
      '.content-reaction-action{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:32px;padding:6px 10px;border-radius:999px;border:1.5px solid rgba(226,217,255,.95);background:rgba(255,255,255,.92);color:#64748B;font:800 12px/1 Nunito,system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 14px rgba(26,16,64,.06);transition:background .18s,color .18s,border-color .18s,transform .18s}',
      '.content-reaction-action:hover{transform:translateY(-1px);border-color:#6C3DED;color:#6C3DED;background:#fff}',
      '.content-reaction-action.is-active[data-reaction-value="like"]{background:#ECFDF5;border-color:#A7F3D0;color:#047857}',
      '.content-reaction-action.is-active[data-reaction-value="dislike"]{background:#FFF1F2;border-color:#FECDD3;color:#BE123C}',
      '.content-reaction-action.is-loading{opacity:.58;pointer-events:none}',
      '.content-reaction-widget.is-card{margin-top:14px}',
      '.latest-card .content-reaction-widget,.subject-doc-card .content-reaction-widget,.game-card .content-reaction-widget{align-self:flex-start}',
      '.metin-card .content-reaction-widget{position:absolute;right:52px;bottom:14px;margin-top:0;z-index:9;flex-wrap:nowrap}',
      '.metin-card .content-reaction-action{min-height:30px;padding:5px 9px;background:rgba(255,255,255,.96)}',
      '.ec .content-reaction-widget{margin-top:8px}',
      '.viewer-reaction-slot,.worksheet-reaction-slot{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px}',
      '@media(max-width:640px){.content-reaction-widget{width:100%;gap:8px}.content-reaction-action{flex:1;min-width:112px}.viewer-reaction-slot,.worksheet-reaction-slot{width:100%}.metin-card .content-reaction-widget{width:auto;right:12px;bottom:12px;gap:6px}.metin-card .content-reaction-action{flex:0 0 auto;min-width:0}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  async function rpc(name, body, options) {
    var config = getConfig();
    if (!config) {
      throw new Error('Supabase ayarlari bulunamadi.');
    }

    if (options && options.client && typeof options.client.rpc === 'function') {
      var result = await options.client.rpc(name, body || {});
      if (result.error) {
        throw result.error;
      }
      return result.data;
    }

    var response = await fetch(config.supabaseUrl.replace(/\/$/, '') + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: 'Bearer ' + config.supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body || {}),
    });
    if (!response.ok) {
      throw new Error('Reaction RPC okunamadi: ' + response.status);
    }
    return response.json();
  }

  function normalizeSummary(raw, meta) {
    return {
      contentType: normalizeType(raw && (raw.contentType || raw.content_type) || meta.contentType),
      contentId: normalizeId(raw && (raw.contentId || raw.content_id) || meta.contentId),
      likes: Number(raw && raw.likes || 0),
      dislikes: Number(raw && raw.dislikes || 0),
      myReaction: safeText(raw && (raw.myReaction || raw.my_reaction || raw.reaction)),
    };
  }

  function renderWidget(widget, summary) {
    if (!widget) {
      return;
    }
    var data = normalizeSummary(summary || {}, {
      contentType: widget.getAttribute('data-reaction-type'),
      contentId: widget.getAttribute('data-reaction-id'),
    });
    var like = widget.querySelector('[data-reaction-value="like"]');
    var dislike = widget.querySelector('[data-reaction-value="dislike"]');
    var likeCount = widget.querySelector('[data-reaction-count="like"]');
    var dislikeCount = widget.querySelector('[data-reaction-count="dislike"]');
    if (likeCount) likeCount.textContent = String(data.likes || 0);
    if (dislikeCount) dislikeCount.textContent = String(data.dislikes || 0);
    if (like) like.classList.toggle('is-active', data.myReaction === 'like');
    if (dislike) dislike.classList.toggle('is-active', data.myReaction === 'dislike');
  }

  function createWidget(meta, cardMode) {
    var widget = document.createElement('div');
    widget.className = 'content-reaction-widget' + (cardMode ? ' is-card' : '');
    widget.setAttribute('data-reaction-widget', 'true');
    widget.setAttribute('data-reaction-type', meta.contentType);
    widget.setAttribute('data-reaction-id', meta.contentId);
    widget.setAttribute('aria-label', 'İçerik beğeni durumu');
    widget.innerHTML =
      '<span class="content-reaction-action" role="button" tabindex="0" data-reaction-value="like" title="Beğendim">' +
        '<span aria-hidden="true">👍</span><span data-reaction-count="like">0</span>' +
      '</span>' +
      '<span class="content-reaction-action" role="button" tabindex="0" data-reaction-value="dislike" title="Beğenmedim">' +
        '<span aria-hidden="true">👎</span><span data-reaction-count="dislike">0</span>' +
      '</span>';

    widget.addEventListener('click', function(event) {
      var action = event.target.closest('[data-reaction-value]');
      if (!action) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      submitReaction(widget, action.getAttribute('data-reaction-value'));
    });
    widget.addEventListener('keydown', function(event) {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      var action = event.target.closest('[data-reaction-value]');
      if (!action) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      submitReaction(widget, action.getAttribute('data-reaction-value'));
    });

    return widget;
  }

  function applyKnownNodeMetadata(root) {
    var scope = root || document;

    scope.querySelectorAll('.game-card:not([data-reaction-type])').forEach(function(card) {
      var href = getPathHref(card.getAttribute('href'));
      card.setAttribute('data-reaction-type', 'game');
      card.setAttribute('data-reaction-id', href || getNodeTitle(card));
      card.setAttribute('data-reaction-title', getNodeTitle(card));
      card.setAttribute('data-reaction-href', href);
      card.setAttribute('data-reaction-subject', safeText(card.getAttribute('data-cat') || textFrom(card, '.gc-category')));
      card.setAttribute('data-reaction-source', 'Oyun');
    });
  }

  function mountNode(node) {
    if (!node || node.dataset.reactionBound === '1') {
      return null;
    }
    var meta = inferMeta(node);
    if (!meta.contentType || !meta.contentId) {
      return null;
    }
    ensureStyle();
    node.dataset.reactionBound = '1';
    if (window.getComputedStyle(node).position === 'static') {
      node.style.position = node.style.position || 'relative';
    }
    var widget = createWidget(meta, node.tagName === 'A' || node.classList.contains('game-card'));
    widget.dataset.reactionTitle = meta.title;
    widget.dataset.reactionHref = meta.href;
    widget.dataset.reactionGrade = meta.grade;
    widget.dataset.reactionSubject = meta.subject;
    widget.dataset.reactionSource = meta.sourceLabel;
    node.appendChild(widget);
    return widget;
  }

  async function loadSummaries(widgets) {
    var missing = [];
    (widgets || []).forEach(function(widget) {
      var type = widget.getAttribute('data-reaction-type');
      var id = widget.getAttribute('data-reaction-id');
      var key = keyOf(type, id);
      if (summaryMap[key]) {
        renderWidget(widget, summaryMap[key]);
      } else if (!loadingKeys[key]) {
        loadingKeys[key] = true;
        missing.push({ contentType: normalizeType(type), contentId: normalizeId(id) });
      }
    });

    if (!missing.length) {
      return;
    }

    try {
      var rows = await rpc('get_content_reaction_summaries', {
        content_keys: missing,
        input_visitor_id: getActiveVisitorId(),
      });
      (Array.isArray(rows) ? rows : []).forEach(function(row) {
        var normalized = normalizeSummary(row, row);
        summaryMap[keyOf(normalized.contentType, normalized.contentId)] = normalized;
      });
    } catch (error) {
      missing.forEach(function(item) {
        summaryMap[keyOf(item.contentType, item.contentId)] = {
          contentType: item.contentType,
          contentId: item.contentId,
          likes: 0,
          dislikes: 0,
          myReaction: '',
        };
      });
    } finally {
      missing.forEach(function(item) {
        delete loadingKeys[keyOf(item.contentType, item.contentId)];
      });
    }

    (widgets || []).forEach(function(widget) {
      renderWidget(widget, summaryMap[keyOf(
        widget.getAttribute('data-reaction-type'),
        widget.getAttribute('data-reaction-id')
      )]);
    });
  }

  async function submitReaction(widget, nextReaction) {
    var type = widget.getAttribute('data-reaction-type');
    var id = widget.getAttribute('data-reaction-id');
    var key = keyOf(type, id);
    var current = summaryMap[key] || normalizeSummary({}, { contentType: type, contentId: id });
    var finalReaction = current.myReaction === nextReaction ? 'none' : nextReaction;

    widget.querySelectorAll('[data-reaction-value]').forEach(function(action) {
      action.classList.add('is-loading');
    });

    try {
      var response = await rpc('set_content_reaction', {
        input_content_type: normalizeType(type),
        input_content_id: normalizeId(id),
        input_reaction: finalReaction,
        input_visitor_id: getActiveVisitorId(),
        input_title: widget.dataset.reactionTitle || '',
        input_href: widget.dataset.reactionHref || '',
        input_grade: widget.dataset.reactionGrade || '',
        input_subject: widget.dataset.reactionSubject || '',
        input_source_label: widget.dataset.reactionSource || '',
      });
      var normalized = normalizeSummary(response, { contentType: type, contentId: id });
      summaryMap[key] = normalized;
      recordReactionForMerit(type, id, finalReaction);
      rememberReactionInProgress(widget, finalReaction);
      document.querySelectorAll('[data-reaction-widget]').forEach(function(other) {
        if (
          normalizeType(other.getAttribute('data-reaction-type')) === normalizeType(type) &&
          normalizeId(other.getAttribute('data-reaction-id')) === normalizeId(id)
        ) {
          renderWidget(other, normalized);
        }
      });
    } catch (error) {
      renderWidget(widget, current);
    } finally {
      widget.querySelectorAll('[data-reaction-value]').forEach(function(action) {
        action.classList.remove('is-loading');
      });
    }
  }

  function scan(root) {
    applyKnownNodeMetadata(root || document);
    var nodes = Array.prototype.slice.call((root || document).querySelectorAll('[data-reaction-type][data-reaction-id]:not([data-reaction-widget])'));
    var widgets = nodes.map(mountNode).filter(Boolean);
    if (widgets.length) {
      loadSummaries(widgets);
    }
  }

  function scheduleScan(root) {
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(function() {
      scan(root || document);
    }, SCAN_DELAY);
  }

  function refreshWidgetsForActiveUser() {
    summaryMap = {};
    loadingKeys = {};
    var widgets = Array.prototype.slice.call(document.querySelectorAll('[data-reaction-widget]'));
    if (widgets.length) {
      loadSummaries(widgets);
    }
  }

  function mount(target, meta, options) {
    var node = typeof target === 'string' ? document.querySelector(target) : target;
    if (!node || !meta || !meta.contentType || !meta.contentId) {
      return null;
    }
    ensureStyle();
    var holder = document.createElement('div');
    holder.className = options && options.className ? options.className : '';
    holder.setAttribute('data-reaction-type', normalizeType(meta.contentType));
    holder.setAttribute('data-reaction-id', normalizeId(meta.contentId));
    holder.setAttribute('data-reaction-title', meta.title || document.title);
    holder.setAttribute('data-reaction-href', meta.href || window.location.pathname + window.location.search);
    holder.setAttribute('data-reaction-grade', meta.grade || '');
    holder.setAttribute('data-reaction-subject', meta.subject || '');
    holder.setAttribute('data-reaction-source', meta.sourceLabel || '');
    node.appendChild(holder);
    var widget = mountNode(holder);
    if (widget) {
      loadSummaries([widget]);
    }
    return holder;
  }

  async function getReport(options) {
    var settings = options || {};
    var client = settings.client || (window.kemalAdminAuth && window.kemalAdminAuth.getClient ? window.kemalAdminAuth.getClient() : null);
    return rpc('get_content_reaction_report', {
      days: Math.max(1, parseInt(settings.days, 10) || 90),
      limit_count: Math.max(1, parseInt(settings.limit, 10) || 80),
    }, { client: client });
  }

  function startAutoScan() {
    scheduleScan(document);
    if ('MutationObserver' in window) {
      var observer = new MutationObserver(function(mutations) {
        if (mutations.some(function(mutation) { return mutation.addedNodes && mutation.addedNodes.length; })) {
          scheduleScan(document);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startAutoScan, { once: true });
  } else {
    startAutoScan();
  }

  window.addEventListener('kemal-user-auth-changed', function() {
    refreshWidgetsForActiveUser();
  });

  window.kemalContentReactions = {
    scan: scan,
    scheduleScan: scheduleScan,
    refresh: refreshWidgetsForActiveUser,
    mount: mount,
    getReport: getReport,
    getVisitorId: getVisitorId,
    getActiveVisitorId: getActiveVisitorId,
  };
})();
