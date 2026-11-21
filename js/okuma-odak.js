(function() {
  'use strict';
  const root = document.documentElement;
  let focus = false;
  const current = () => document.fullscreenElement || document.webkitFullscreenElement;

  function update(active) {
    focus = active;
    root.classList.toggle('reading-focus', active);
    document.querySelectorAll('[data-reading-fullscreen]').forEach(button => {
      const label = active ? 'Tam ekrandan çık' : 'Tam ekran';
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-pressed', String(active));
      button.title = label;
      const text = button.querySelector('[data-fullscreen-label]');
      if (text) text.textContent = label;
    });
  }

  function enter(native = true) {
    update(true);
    const request = root.requestFullscreen || root.webkitRequestFullscreen;
    if (native && request && !current()) {
      try { Promise.resolve(request.call(root)).catch(() => {}); }
      catch (_) { /* Use the in-page focus layout on unsupported devices. */ }
    }
  }

  async function exit() {
    update(false);
    const leave = document.exitFullscreen || document.webkitExitFullscreen;
    if (current() && leave) {
      try { await leave.call(document); } catch (_) {}
    }
  }

  ['fullscreenchange', 'webkitfullscreenchange'].forEach(event => {
    document.addEventListener(event, () => update(Boolean(current())));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && focus && !current() && !document.querySelector('dialog[open], .modal-overlay.show')) exit();
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('[data-reading-fullscreen]')) return;
    if (focus) exit();
    else enter();
  });
  window.ReadingFocus = { enter, exit, isActive: () => focus };
})();
