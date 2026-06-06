(function() {
  'use strict';

  var STYLE_ID = 'kemalContentSaveStyle';
  var SCAN_DELAY = 90;
  var scanTimer = 0;
  var apiPromise = null;

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

  function getPathHref(rawHref) {
    var href = safeText(rawHref);
    if (!href) {
      return window.location.pathname + window.location.search;
    }
    try {
      var parsed = new URL(href, window.location.origin);
      return parsed.origin === window.location.origin
        ? parsed.pathname + parsed.search
        : parsed.toString();
    } catch (error) {
      return href;
    }
  }

  function textFrom(node, selector) {
    var el = node && node.querySelector ? node.querySelector(selector) : null;
    return el ? el.textContent : '';
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
      '.content-save-action{position:absolute;top:12px;right:12px;z-index:8;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:38px;min-height:38px;padding:8px 10px;border-radius:999px;border:1.5px solid rgba(203,213,225,.95);background:rgba(255,255,255,.94);color:#334155;font:900 12px/1 Nunito,system-ui,sans-serif;box-shadow:0 10px 24px rgba(15,23,42,.12);cursor:pointer;transition:background .18s,color .18s,border-color .18s,transform .18s}',
      '.content-save-action:hover{transform:translateY(-1px);border-color:#2563EB;color:#2563EB;background:#fff}',
      '.content-save-action.is-saved{background:#EFF6FF;border-color:#93C5FD;color:#1D4ED8}',
      '.content-save-action.is-loading{opacity:.62;pointer-events:none}',
      '.content-save-action svg{width:18px;height:18px;display:block;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}',
      '.content-save-action.is-saved svg{fill:currentColor}',
      '.content-save-label{display:none}',
      '.content-save-action:focus-visible{outline:3px solid rgba(37,99,235,.28);outline-offset:2px}',
      '@media(max-width:640px){.content-save-action{top:10px;right:10px;min-width:36px;min-height:36px;padding:8px}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function scriptMatches(script, src) {
    try {
      return new URL(script.src, window.location.origin).pathname === src;
    } catch (error) {
      return script.getAttribute('src') === src;
    }
  }

  function ensureScript(src, globalName) {
    if (globalName && window[globalName]) {
      return Promise.resolve(window[globalName]);
    }
    var existing = Array.prototype.slice.call(document.querySelectorAll('script[src]')).find(function(script) {
      return scriptMatches(script, src);
    });
    if (existing) {
      return new Promise(function(resolve, reject) {
        if (!globalName || window[globalName]) {
          resolve(globalName ? window[globalName] : true);
          return;
        }
        existing.addEventListener('load', function() {
          resolve(globalName ? window[globalName] : true);
        }, { once: true });
        existing.addEventListener('error', reject, { once: true });
        window.setTimeout(function() {
          resolve(globalName ? window[globalName] : true);
        }, 1800);
      });
    }
    return new Promise(function(resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = function() {
        resolve(globalName ? window[globalName] : true);
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  function getApis() {
    if (!apiPromise) {
      apiPromise = Promise.all([
        ensureScript('/js/user-auth.js', 'kemalUserAuth').then(function(api) {
          return api && typeof api.ready === 'function' ? api.ready().then(function() { return api; }) : api;
        }).catch(function() { return null; }),
        ensureScript('/js/content-progress.js', 'kemalContentProgress').catch(function() { return null; }),
      ]).then(function(results) {
        return {
          auth: results[0] || window.kemalUserAuth || null,
          progress: results[1] || window.kemalContentProgress || null,
        };
      });
    }
    return apiPromise;
  }

  function getStudentState(auth) {
    var current = auth && typeof auth.getState === 'function' ? auth.getState() : {};
    var profile = current.profile || {};
    return {
      user: current.user || null,
      profile: profile,
      canSave: Boolean(current.user && (profile.role === 'student' || profile.role === 'teacher') && profile.active !== false),
    };
  }

  function getRecord(progress, meta) {
    return progress && typeof progress.getRecord === 'function'
      ? progress.getRecord({ type: meta.contentType, id: meta.contentId, href: meta.href })
      : null;
  }

  function getItem(meta) {
    return {
      type: meta.contentType,
      id: meta.contentId,
      href: meta.href,
      title: meta.title,
      grade: meta.grade,
      subject: meta.subject,
      meta: {
        sourceLabel: meta.sourceLabel,
      },
    };
  }

  function bookmarkSvg() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.75h12a1 1 0 0 1 1 1v15.5l-7-4.4-7 4.4V4.75a1 1 0 0 1 1-1z"></path></svg>';
  }

  function renderAction(action, isSaved, loading) {
    action.classList.toggle('is-saved', Boolean(isSaved));
    action.classList.toggle('is-loading', Boolean(loading));
    action.setAttribute('aria-pressed', isSaved ? 'true' : 'false');
    action.setAttribute('title', isSaved ? 'Kaydedildi' : 'Kaydet');
    action.innerHTML = bookmarkSvg() + '<span class="content-save-label">' + (isSaved ? 'Kaydedildi' : 'Kaydet') + '</span>';
  }

  function updateAction(action) {
    if (!action) return;
    getApis().then(function(apis) {
      var meta = inferMeta(action.parentElement);
      var record = getRecord(apis.progress, meta);
      renderAction(action, Boolean(record && record.meta && record.meta.saved), false);
    });
  }

  async function toggleSave(action) {
    var node = action && action.parentElement;
    if (!node) return;
    var meta = inferMeta(node);
    renderAction(action, action.classList.contains('is-saved'), true);
    var apis = await getApis();
    var student = getStudentState(apis.auth);
    if (!student.canSave) {
      var redirect = window.location.pathname + window.location.search;
      window.location.href = '/giris.html?redirect=' + encodeURIComponent(redirect);
      return;
    }
    if (!apis.progress || typeof apis.progress.upsertRecord !== 'function') {
      renderAction(action, false, false);
      return;
    }
    var existing = getRecord(apis.progress, meta) || {};
    var nextSaved = !(existing.meta && existing.meta.saved);
    var info = apis.auth && typeof apis.auth.getStudentInfo === 'function' ? apis.auth.getStudentInfo() : {};
    var record = apis.progress.upsertRecord(getItem(meta), {
      status: existing.status || 'read',
      meta: {
        accountUid: student.user.id,
        email: student.user.email || info.email || '',
        saved: nextSaved,
        favorite: nextSaved,
        savedAt: nextSaved ? new Date().toISOString() : (existing.meta && existing.meta.savedAt) || '',
        unsavedAt: nextSaved ? '' : new Date().toISOString(),
        sourceLabel: meta.sourceLabel,
      },
    });
    renderAction(action, Boolean(record && record.meta && record.meta.saved), false);
  }

  function shouldSkipNode(node) {
    return !node ||
      node.dataset.saveBound === '1' ||
      node.hasAttribute('data-reaction-widget') ||
      node.classList.contains('content-reaction-widget') ||
      node.classList.contains('viewer-reaction-slot') ||
      node.classList.contains('worksheet-reaction-slot') ||
      node.closest('[data-content-save]');
  }

  function mountNode(node) {
    if (shouldSkipNode(node)) {
      return null;
    }
    var meta = inferMeta(node);
    if (!meta.contentType || !meta.contentId) {
      return null;
    }
    ensureStyle();
    node.dataset.saveBound = '1';
    if (window.getComputedStyle(node).position === 'static') {
      node.style.position = node.style.position || 'relative';
    }
    var action = document.createElement('span');
    action.className = 'content-save-action';
    action.setAttribute('role', 'button');
    action.setAttribute('tabindex', '0');
    action.setAttribute('data-content-save', 'true');
    renderAction(action, false, false);
    action.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();
      toggleSave(action);
    });
    action.addEventListener('keydown', function(event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      toggleSave(action);
    });
    node.appendChild(action);
    updateAction(action);
    return action;
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

  function scan(root) {
    var scope = root || document;
    applyKnownNodeMetadata(scope);
    var nodes = [];
    if (scope.matches && scope.matches('[data-reaction-type][data-reaction-id]:not([data-reaction-widget])')) {
      nodes.push(scope);
    }
    nodes = nodes.concat(Array.prototype.slice.call(scope.querySelectorAll('[data-reaction-type][data-reaction-id]:not([data-reaction-widget])')));
    nodes.forEach(mountNode);
  }

  function scheduleScan(root) {
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(function() {
      scan(root || document);
    }, SCAN_DELAY);
  }

  function refresh() {
    document.querySelectorAll('[data-content-save]').forEach(updateAction);
  }

  function startAutoScan() {
    scheduleScan(document);
    if ('MutationObserver' in window && document.body) {
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

  window.addEventListener('kemal-user-auth-changed', refresh);
  window.addEventListener('kemal-content-progress-changed', refresh);

  window.kemalContentSaves = {
    scan: scan,
    scheduleScan: scheduleScan,
    refresh: refresh,
  };
})();
