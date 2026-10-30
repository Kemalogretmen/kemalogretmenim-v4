/* Device-local appearance. Load in <head> before styles to avoid a light flash. */
(function () {
  'use strict';
  if (window.kemalTheme) return;
  var root = document.documentElement;
  var storageKey = 'kemal-theme';
  var preference = 'light';
  var theme = '';
  var timer;
  var drag = null;
  var suppressClickUntil = 0;
  function media(query) {
    try { return window.matchMedia(query); } catch (_) { return { matches: false }; }
  }
  var system = media('(prefers-color-scheme: dark)');
  var reducedMotion = media('(prefers-reduced-motion: reduce)');
  function valid(value) { return ['light', 'dark', 'system'].indexOf(value) !== -1; }
  try {
    var saved = window.localStorage.getItem(storageKey);
    if (valid(saved)) preference = saved;
  } catch (_) {}
  function resolved() { return preference === 'system' ? (system.matches ? 'dark' : 'light') : preference; }
  function syncMetadata() {
    [['color-scheme', theme], ['theme-color', theme === 'dark' ? '#151a27' : '#fafaf7']].forEach(function (entry) {
      var tags = document.querySelectorAll('meta[name="' + entry[0] + '"]');
      if (!tags.length) {
        var tag = document.createElement('meta');
        tag.name = entry[0];
        document.head.appendChild(tag);
        tags = [tag];
      }
      Array.prototype.forEach.call(tags, function (tag) { tag.setAttribute('content', entry[1]); });
    });
  }
  function syncControls() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-theme-switch]'), function (button) {
      button.setAttribute('aria-checked', String(theme === 'dark'));
      button.title = theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç';
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-theme-system]'), function (button) {
      button.setAttribute('aria-pressed', String(preference === 'system'));
      button.title = preference === 'system' ? 'Sistem teması etkin; sabit temaya geç' : 'Cihazın tema tercihini izle';
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-theme-status]'), function (status) {
      status.textContent = (theme === 'dark' ? 'Koyu tema' : 'Açık tema') + (preference === 'system' ? ', sistem tercihi izleniyor.' : ' etkin.');
    });
  }
  function apply(animate, previousPreference) {
    var next = resolved();
    var changed = next !== theme;
    if (animate && changed && !reducedMotion.matches && !root.classList.contains('performance-lite')) {
      root.classList.add('theme-changing');
      window.clearTimeout(timer);
      timer = window.setTimeout(function () { root.classList.remove('theme-changing'); }, 420);
    }
    theme = next;
    root.dataset.theme = theme;
    root.dataset.themePreference = preference;
    root.style.colorScheme = theme;
    // Head metadata may follow this script, so reconcile it again when parsing ends.
    if (document.readyState !== 'loading') syncMetadata();
    syncControls();
    if (changed || previousPreference !== preference) {
      window.dispatchEvent(new window.CustomEvent('kemal:themechange', { detail: { theme: theme, preference: preference } }));
    }
  }
  function setPreference(value) {
    if (!valid(value)) return false;
    var previous = preference;
    preference = value;
    try { window.localStorage.setItem(storageKey, value); } catch (_) {}
    apply(true, previous);
    return true;
  }
  function toggle() { return setPreference(theme === 'dark' ? 'light' : 'dark'); }
  var sun = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/></svg>';
  var moon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14A8.7 8.7 0 0 1 10 3.5a8.8 8.8 0 1 0 10.5 10.5Z"/></svg>';
  function createControl() {
    var host = document.createElement('div');
    host.className = 'theme-control';
    host.setAttribute('role', 'group');
    host.setAttribute('aria-label', 'Görünüm tercihi');
    host.innerHTML = '<button class="theme-switch" type="button" role="switch" aria-label="Koyu tema" aria-checked="false" data-theme-switch>' +
      '<span class="theme-switch-track" aria-hidden="true"><span class="theme-switch-sun">' + sun + '</span><span class="theme-switch-moon">' + moon + '</span>' +
      '<span class="theme-switch-thumb"><span class="theme-thumb-sun">' + sun + '</span><span class="theme-thumb-moon">' + moon + '</span></span></span></button>' +
      '<button class="theme-system" type="button" data-theme-system aria-label="Sistem temasını izle" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/></svg></button>' +
      '<span class="theme-control-status" data-theme-status role="status" aria-live="polite"></span>';
    return host;
  }
  function mountControls() {
    if (!document.body) return;
    if (root.dataset.themeControls === 'off') { syncMetadata(); return; }
    function visible(element) { return !element.getClientRects || element.getClientRects().length > 0; }
    var slots = Array.prototype.filter.call(document.querySelectorAll('[data-theme-control-slot]'), visible);
    if (slots.length) {
      Array.prototype.forEach.call(document.querySelectorAll('.theme-control-fallback'), function (fallback) { fallback.remove(); });
      Array.prototype.forEach.call(slots, function (slot) {
        if (!slot.querySelector('.theme-control')) slot.appendChild(createControl());
      });
    } else if (!Array.prototype.some.call(document.querySelectorAll('.theme-control'), visible)) {
      // Independent readers and classroom apps don't render the public navigation.
      Array.prototype.forEach.call(document.querySelectorAll('.theme-control-fallback'), function (fallback) { fallback.remove(); });
      var control = createControl();
      control.classList.add('theme-control-fallback');
      var candidates = document.querySelectorAll('.header-actions, .topbar-actions, .okuma-topbar, .exam-topbar, .ck-toolbar, .page-header-actions, .admin-topbar-actions, .teacher-top-actions, .parent-hero .parent-actions, .student-hero .student-actions, .ebook-site-actions, .reader-status, .studio-topbar .top-actions, .soru-topbar, body[data-kemal-shortcut-dock="only"] > .header');
      var target = Array.prototype.find.call(candidates, function (candidate) {
        return visible(candidate);
      });
      if (target) {
        control.classList.add('theme-control-inline');
        target.appendChild(control);
      } else {
        control.classList.add('theme-control-floating');
        document.body.appendChild(control);
      }
    }
    syncControls();
    syncMetadata();
  }
  window.kemalTheme = {
    getPreference: function () { return preference; },
    getResolvedTheme: function () { return theme; },
    setPreference: setPreference,
    toggle: toggle,
    mountControls: mountControls,
    syncMetadata: syncMetadata
  };
  apply(false, preference);
  function systemChanged() { if (preference === 'system') apply(true, preference); }
  if (system.addEventListener) system.addEventListener('change', systemChanged);
  else if (system.addListener) system.addListener(systemChanged);
  window.addEventListener('storage', function (event) {
    if (event.key !== storageKey && event.key !== null) return;
    try { if (event.storageArea && event.storageArea !== window.localStorage) return; } catch (_) { return; }
    var previous = preference;
    preference = valid(event.newValue) ? event.newValue : 'light';
    apply(false, previous);
  });
  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target : null;
    if (!target) return;
    if (target.closest('[data-theme-switch]')) {
      if (Date.now() < suppressClickUntil) { event.preventDefault(); return; }
      toggle();
    } else if (target.closest('[data-theme-system]')) {
      setPreference(preference === 'system' ? theme : 'system');
    }
  });
  document.addEventListener('keydown', function (event) {
    var button = event.target && event.target.closest && event.target.closest('[data-theme-switch]');
    if (!button) return;
    if (event.key === 'ArrowLeft' || event.key === 'Home') { event.preventDefault(); setPreference('light'); }
    if (event.key === 'ArrowRight' || event.key === 'End') { event.preventDefault(); setPreference('dark'); }
  });
  document.addEventListener('pointerdown', function (event) {
    var button = event.target && event.target.closest && event.target.closest('[data-theme-switch]');
    if (!button || event.isPrimary === false || (event.button != null && event.button !== 0)) return;
    drag = { button: button, startX: event.clientX, startDark: theme === 'dark', moved: false, pointerId: event.pointerId };
    if (button.setPointerCapture) { try { button.setPointerCapture(event.pointerId); } catch (_) {} }
  });
  document.addEventListener('pointermove', function (event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    var delta = event.clientX - drag.startX;
    if (Math.abs(delta) < 6 && !drag.moved) return;
    drag.moved = true;
    drag.button.classList.add('is-dragging');
    drag.button.style.setProperty('--theme-drag', Math.max(0, Math.min(28, (drag.startDark ? 28 : 0) + delta)) + 'px');
  });
  function endDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    var gesture = drag;
    drag = null;
    gesture.button.classList.remove('is-dragging');
    gesture.button.style.removeProperty('--theme-drag');
    if (gesture.moved) {
      suppressClickUntil = Date.now() + 350;
      if (event.type !== 'pointercancel') {
        var position = (gesture.startDark ? 28 : 0) + event.clientX - gesture.startX;
        setPreference(position > 14 ? 'dark' : 'light');
      }
    }
  }
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountControls, { once: true });
  else mountControls();
})();
