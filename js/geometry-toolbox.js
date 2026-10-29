/* Shared floating controls for the three geometry workspaces. Existing control
   nodes are moved, never cloned, so WebGL previews and event handlers survive. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const definitions = {
    builder: { shell: '.builder-shell', panels: '.builder-panel', title: 'Yapı Atölyesi', icon: 'cube' },
    nets: { shell: '.geo-tool-shell', panels: '.geo-panel', title: 'Cisim Açılımları', icon: 'net' },
    cubes: { shell: '.cube-tool-shell', panels: '.cube-panel', title: 'Birim Küpler', icon: 'cubes' }
  };
  const pictures = {
    cube: '<path fill="#66b6ff" d="m32 6 24 13-24 14L8 19Z"/><path fill="#3183e6" d="m8 19 24 14v25L8 44Z"/><path fill="#1657b4" d="m32 33 24-14v25L32 58Z"/><path d="m32 6 24 13v25L32 58 8 44V19Zm0 27L8 19m24 14 24-14M32 33v25"/>',
    box: '<path fill="#8ecbff" d="m21 11 37 13-15 13L6 23Z"/><path fill="#3b91e7" d="m6 23 37 14v19L6 42Z"/><path fill="#1b60b5" d="m43 37 15-13v19L43 56Z"/><path d="m21 11 37 13v19L43 56 6 42V23Zm22 26L6 23m37 14 15-13M43 37v19"/>',
    squarePrism: '<path fill="#93cbff" d="m32 4 16 9-16 10-16-10Z"/><path fill="#458fe2" d="m16 13 16 10v37L16 49Z"/><path fill="#1f5ab3" d="m32 23 16-10v36L32 60Z"/><path d="m32 4 16 9v36L32 60 16 49V13Zm0 19L16 13m16 10 16-10M32 23v37"/>',
    cylinder: '<path fill="#4a9fe9" d="M12 17h40v31c0 13-40 13-40 0Z"/><path fill="#c2e6ff" d="M52 17c0 12-40 12-40 0s40-12 40 0Z"/><path d="M12 17v31c0 13 40 13 40 0V17M52 17c0 12-40 12-40 0s40-12 40 0Z"/><path stroke="#c0e7ff" stroke-width="4" d="M20 28v17"/>',
    cone: '<path fill="#4797e4" d="M32 5 8 49c0 15 48 15 48 0Z"/><path fill="#8dcbfa" d="m32 5-9 48-15-4Z"/><path d="M32 5 8 49c0 15 48 15 48 0Zm-24 44c0-13 48-13 48 0"/>',
    sphere: '<circle cx="32" cy="32" r="25" fill="#3c93e2"/><ellipse cx="24" cy="23" rx="12" ry="13" fill="#a6daff" stroke="none"/><circle cx="32" cy="32" r="25"/><ellipse cx="32" cy="32" rx="12" ry="25"/><path d="M7 32c7 10 43 10 50 0M10 21c10 7 34 7 44 0" opacity=".5"/>',
    roof: '<path fill="#9dd5ff" d="m7 51 18-34 18 34Z"/><path fill="#347fc8" d="m25 17 14-9 18 34-14 9Z"/><path d="m7 51 18-34 14-9 18 34-14 9Zm18-34 18 34M7 51h36"/>',
    squarePyramid: '<path fill="#9cd2fc" d="m32 5-24 40 24 14Z"/><path fill="#2e7dcd" d="m32 5 24 40-24 14Z"/><path d="m32 5 24 40-24 14L8 45Zm0 0v54"/>',
    triPyramid: '<path fill="#a4d5fa" d="m32 5-24 45 25-7Z"/><path fill="#297cc8" d="m32 5 24 45-23-7Z"/><path fill="#1559a5" d="m8 50 25-7 23 7-24 10Z"/><path d="m32 5 24 45-24 10L8 50Zm1 38L32 5m1 38L8 50m25-7 23 7"/>',
    triangle: '<path fill="#f86365" stroke="#ce304d" d="M32 8 59 55H5Z"/>',
    square: '<rect x="10" y="10" width="44" height="44" rx="1" fill="#ffc844" stroke="#b88014"/>',
    rectangle: '<rect x="5" y="17" width="54" height="31" rx="1" fill="#55bb9f" stroke="#208a70"/>',
    ring: '<circle cx="32" cy="32" r="23" fill="none" stroke="#8164dc" stroke-width="5"/>',
    circle: '<circle cx="32" cy="32" r="24" fill="#12add2" stroke="#087fa4"/>',
    net: '<path fill="#a8d7ff" d="M24 4h16v16h16v16H40v16H24V36H8V20h16Z"/><path d="M24 4h16v16h16v16H40v16H24V36H8V20h16Zm0 16h16v16H24Zm0 16v16m16-32H24"/>',
    cubes: '<path fill="#99ccff" d="m32 4 12 7-12 7-12-7ZM18 23l12 7-12 7-12-7Zm28 0 12 7-12 7-12-7Z"/><path fill="#3e8adb" d="m20 11 12 7v15l-12-7ZM6 30l12 7v16L6 46Zm28 0 12 7v16l-12-7Z"/><path fill="#1859a9" d="m32 18 12-7v15l-12 7ZM18 37l12-7v16l-12 7Zm28 0 12-7v16l-12 7Z"/>'
  };
  const aliases = { square: 'squarePrism', rect: 'box', tri: 'roof' };
  function icon(type) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 64 64'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', 'geometry-shape-icon');
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', '#204b7d'); svg.setAttribute('stroke-width', '1.6'); svg.setAttribute('stroke-linejoin', 'round');
    svg.innerHTML = pictures[type] || pictures.cube; return svg;
  }
  function node(tag, className, text) { const n = document.createElement(tag); if (className) n.className = className; if (text) n.textContent = text; return n; }
  function attachIcon(button, type, label) {
    button.replaceChildren(icon(type)); button.classList.add('geometry-shape-button');
    button.title = label; button.setAttribute('aria-label', label); button.dataset.tooltip = label;
  }
  function init() {
    let kind, config, shell;
    for (const [key, entry] of Object.entries(definitions)) { const candidate = document.querySelector(entry.shell); if (candidate) { kind = key; config = entry; shell = candidate; break; } }
    if (!shell || shell.querySelector('.geometry-toolbox')) return;
    const sources = [...shell.querySelectorAll(config.panels)]; if (!sources.length) return;
    shell.classList.add('has-geometry-toolbox'); document.body.classList.add('geometry-workspace');
    const box = node('aside', 'geometry-toolbox'); box.id = 'geometryToolbox'; box.setAttribute('aria-label', `${config.title} araç kutusu`); box.dataset.workspace = kind;
    const header = node('div', 'geometry-toolbox-header');
    const drag = node('button', 'geometry-toolbox-drag'); drag.type = 'button'; drag.title = 'Araç kutusunu sürükle · Ok tuşlarıyla taşı'; drag.setAttribute('aria-label', 'Araç kutusunu taşı'); drag.append(icon(config.icon), node('span', '', config.title));
    function headerButton(cls, text, label) { const b = node('button', cls, text); b.type = 'button'; b.title = label; b.setAttribute('aria-label', label); header.append(b); return b; }
    header.append(drag);
    const reset = headerButton('geometry-toolbox-reset', '⌖', 'Araç kutusunu başlangıç konumuna al');
    const size = headerButton('geometry-toolbox-size', '↔', 'Araç kutusunu genişlet');
    const toggle = headerButton('geometry-toolbox-toggle', '−', 'Araç kutusunu daralt');
    const body = node('div', 'geometry-toolbox-body'); body.id = 'geometryToolboxBody'; toggle.setAttribute('aria-controls', body.id); toggle.setAttribute('aria-expanded', 'true');
    const tablist = node('div', 'geometry-toolbox-tabs'); tablist.setAttribute('role', 'tablist'); tablist.setAttribute('aria-label', 'Araç grupları');
    const content = node('div', 'geometry-toolbox-content'), sections = new Map(), tabs = new Map();
    const storageKey = `geometry-toolbox:${kind}:v1`; let state = {}, activeTab, gesture = null;
    try { state = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch (_) { /* Optional preference storage. */ }
    function save() { try { localStorage.setItem(storageKey, JSON.stringify({ x: parseFloat(box.style.left), y: parseFloat(box.style.top), collapsed: box.classList.contains('is-collapsed'), wide: box.classList.contains('is-wide'), tab: activeTab })); } catch (_) {} }
    function selectTab(key) {
      if (!sections.has(key)) return;
      activeTab = key;
      sections.forEach((section, id) => { section.hidden = id !== key; section.classList.toggle('is-active', id === key); const b = tabs.get(id); b.classList.toggle('is-active', id === key); b.setAttribute('aria-selected', String(id === key)); b.tabIndex = id === key ? 0 : -1; });
      save();
    }
    function section(key, title, mark) {
      const panel = node('section', 'geometry-toolbox-section'); panel.id = `geometryTools-${key}`; panel.setAttribute('role', 'tabpanel'); panel.hidden = true;
      const button = node('button', 'geometry-toolbox-tab'); button.id = `geometryTab-${key}`; button.type = 'button'; button.dataset.tab = key; button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', panel.id); panel.setAttribute('aria-labelledby', button.id);
      const symbol = node('span', 'geometry-tab-symbol', mark); symbol.setAttribute('aria-hidden', 'true'); button.append(symbol, node('span', '', title)); button.addEventListener('click', () => selectTab(key));
      button.addEventListener('keydown', event => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const keys = [...tabs.keys()], current = keys.indexOf(key), next = event.key === 'Home' ? 0 : event.key === 'End' ? keys.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + keys.length) % keys.length; selectTab(keys[next]); tabs.get(keys[next]).focus(); });
      sections.set(key, panel); tabs.set(key, button); tablist.append(button); content.append(panel); return panel;
    }
    const move = (parent, item) => { if (item) parent.append(item); };
    if (kind === 'builder') {
      const left = sources[0], right = sources[1];
      const modes = left.querySelector('#mode3d')?.closest('section');
      if (modes) { modes.classList.add('geometry-toolbox-modes'); body.append(modes); }
      const shapes = section('shapes', 'Şekiller', '◇'), edit = section('edit', 'Düzenle', '↻'), examples = section('examples', 'Örnekler', '▦'), view = section('view', 'Görünüm', '◉');
      [...(right?.children || [])].forEach(child => child.classList.add('three-only'));
      move(shapes, left.querySelector('[data-shape]')?.closest('section')); move(shapes, left.querySelector('#colors')?.closest('section')); move(shapes, left.querySelector('[data-2d]')?.closest('section'));
      move(edit, right?.querySelector('#selected')); move(edit, left.querySelector('.shape-edit'));
      move(examples, left.querySelector('#bridge')?.parentElement); move(examples, left.querySelector('#shapeExamples')?.closest('section')); move(examples, right?.querySelector('.task'));
      move(view, right?.querySelector('#iso')?.closest('section')); move(edit, right?.querySelector('#clear')?.parentElement);
      const context = node('p', 'geometry-toolbox-context three-only', 'Bir cisim seçerek döndürme, boyutlandırma ve kopyalama araçlarını aç.'); edit.prepend(context);
      move(view, right?.querySelector('p'));
      shapes.querySelectorAll('[data-shape]').forEach(b => attachIcon(b, b.dataset.shape, b.textContent.replace(/^[^\p{L}]+/u, '').trim()));
      shapes.querySelectorAll('[data-2d]').forEach(b => attachIcon(b, b.dataset['2d'], b.textContent.replace(/^[^\p{L}]+/u, '').trim()));
      shapes.querySelectorAll('#colors .color').forEach((b, index) => { const label = ['Kırmızı', 'Turuncu', 'Sarı', 'Yeşil', 'Mavi', 'Mor', 'Pembe'][index]; if (label) { b.title = label; b.setAttribute('aria-label', label); } });
      const observeSelection = () => { const twoD = shell.classList.contains('two-d'), chosen = !twoD && !!shell.querySelector('#selected.show'); context.hidden = chosen; tabs.get('edit').classList.toggle('has-selection', chosen || (twoD && !!shell.querySelector('.geo-piece.is-selected'))); };
      if (window.MutationObserver) new MutationObserver(observeSelection).observe(shell, { subtree: true, attributes: true, attributeFilter: ['class'] });
      ['mode2d', 'mode3d'].forEach(id => body.querySelector(`#${id}`)?.addEventListener('click', () => { if (window.innerWidth <= 980) body.scrollTop = 0; }));
    } else if (kind === 'nets') {
      const left = sources[0], right = sources[1];
      const shapes = section('shapes', 'Cisimler', '◇'), fold = section('fold', 'Katlanma', '◫'), paint = section('paint', 'Çizim', '✎'), view = section('view', 'Görünüm', '◉');
      move(shapes, left.querySelector('#shape-select')?.closest('.group'));
      const netGroup = left.querySelector('#net-select')?.closest('.group');
      move(fold, netGroup);
      const netInfo = node('p', 'geometry-net-description'); netInfo.hidden = true; fold.append(netInfo);
      move(fold, shell.querySelector('#fold-panel'));
      move(shapes, left.querySelector('#shapeNote'));
      const groups = [...right.querySelectorAll(':scope > .group')]; move(paint, groups[0]); move(paint, groups[1]); move(view, groups[2]); move(view, groups[3]);
      const select = shapes.querySelector('#shape-select');
      if (select) {
        select.classList.add('geometry-native-select'); select.setAttribute('aria-hidden', 'true'); select.tabIndex = -1;
        const grid = node('div', 'geometry-solid-grid'); grid.setAttribute('aria-label', 'Geometrik cisim seç');
        [...select.options].forEach(option => {
          const b = node('button'); b.type = 'button'; b.dataset.solid = option.value;
          attachIcon(b, aliases[option.value] || option.value, option.textContent.trim());
          b.setAttribute('aria-pressed', String(option.value === select.value)); b.classList.toggle('active', option.value === select.value);
          b.addEventListener('click', () => { select.value = option.value; select.dispatchEvent(new Event('change', { bubbles: true })); syncSolids(); }); grid.append(b);
        });
        function syncSolids() { grid.querySelectorAll('button').forEach(b => { const on = b.dataset.solid === select.value; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); }); }
        function syncNetInfo() { const disabled = !!netGroup?.querySelector('select')?.disabled; if (netGroup) netGroup.hidden = disabled; netInfo.hidden = !disabled; netInfo.textContent = shapes.querySelector('#shapeNote')?.textContent || 'Bu cisim için tek temel açılım gösterilir.'; }
        select.addEventListener('change', syncSolids); select.addEventListener('change', syncNetInfo); select.after(grid); syncNetInfo();
      }
    } else {
      const left = sources[0], right = sources[1];
      const build = section('build', 'Yapı', '▣'), view = section('view', 'Görünüm', '◉'), draw = section('draw', 'Çizim', '✎'), file = section('file', 'Dosya', '↓');
      const groups = [...left.querySelectorAll(':scope > .group')]; move(build, groups[0]); move(build, groups[1]); move(view, groups[2]); move(file, groups[3]);
      const rightGroups = [...right.querySelectorAll(':scope > .group')]; move(view, rightGroups[0]); move(draw, rightGroups[1]); move(view, rightGroups[2]);
      const counter = right.querySelector('#counter-badge'); if (counter) { counter.classList.add('geometry-toolbox-counter'); body.append(counter); }
      // The context menu stays outside the panel: its coordinates are viewport based.
    }
    if (window.GeometryBackgrounds && sections.has('view')) {
      const backgrounds = window.GeometryBackgrounds;
      const picker = node('div', 'geometry-ground-picker');
      const heading = node('div', 'geometry-ground-picker-heading');
      const contextLabel = node('span', 'geometry-ground-context');
      heading.append(node('b', '', 'ÇALIŞMA ZEMİNİ'), contextLabel);
      const options = node('div', 'geometry-ground-options');
      options.setAttribute('role', 'group'); options.setAttribute('aria-label', 'Çalışma zemini seç');
      const workspace = () => kind === 'builder' ? (shell.classList.contains('two-d') ? 'builder2d' : 'builder3d') : kind;
      function syncBackground() {
        const context = workspace(), value = backgrounds.get(context);
        contextLabel.textContent = context === 'builder2d' ? '2B alanı' : context === 'builder3d' ? '3B sahne' : 'Sahne';
        options.querySelectorAll('button').forEach(button => { const active = button.dataset.background === value; button.setAttribute('aria-pressed', String(active)); button.classList.toggle('is-active', active); });
      }
      backgrounds.types.forEach(type => {
        const button = node('button', 'geometry-ground-button'); button.type = 'button'; button.dataset.background = type.id; button.setAttribute('aria-label', `${type.label} zemin`);
        const sample = node('span', 'geometry-ground-swatch'); sample.dataset.background = type.id; sample.setAttribute('aria-hidden', 'true');
        button.append(sample, node('span', '', type.label)); button.addEventListener('click', () => { backgrounds.set(workspace(), type.id); syncBackground(); }); options.append(button);
      });
      picker.append(heading, options); sections.get('view').prepend(picker);
      window.addEventListener('geometry-background-change', syncBackground);
      ['mode2d', 'mode3d'].forEach(id => body.querySelector(`#${id}`)?.addEventListener('click', syncBackground));
      syncBackground();
    }
    sources.forEach(p => p.remove()); body.append(tablist, content); box.append(header, body); shell.append(box);
    selectTab(sections.has(state.tab) ? state.tab : sections.keys().next().value);
    function clampPosition(x, y) {
      const r = box.getBoundingClientRect(), w = r.width || Math.min(box.classList.contains('is-wide') ? 380 : 282, window.innerWidth - 20), h = r.height || 44;
      const maxX = Math.max(8, window.innerWidth - w - 8), maxY = Math.max(8, window.innerHeight - Math.min(h, window.innerHeight - 16) - 8);
      box.style.left = `${Math.max(8, Math.min(maxX, x))}px`; box.style.top = `${Math.max(8, Math.min(maxY, y))}px`;
    }
    function initialPosition() { const top = shell.getBoundingClientRect().top; clampPosition(16, Math.max(8, top + 12)); }
    function refreshHeight() {
      const top = shell.getBoundingClientRect().top + (window.scrollY || 0);
      shell.style.setProperty('--geometry-workspace-height', `${Math.max(430, window.innerHeight - top)}px`);
      box.style.setProperty('--toolbox-available-height', `${Math.max(110, window.innerHeight - (parseFloat(box.style.top) || 12) - 16)}px`);
    }
    function collapsed(value) { box.classList.toggle('is-collapsed', value); body.hidden = value; toggle.textContent = value ? '+' : '−'; toggle.title = value ? 'Araç kutusunu aç' : 'Araç kutusunu daralt'; toggle.setAttribute('aria-label', toggle.title); toggle.setAttribute('aria-expanded', String(!value)); clampPosition(parseFloat(box.style.left) || 16, parseFloat(box.style.top) || 16); save(); }
    box.classList.toggle('is-wide', !!state.wide); size.setAttribute('aria-pressed', String(!!state.wide)); if (state.wide) { size.title = 'Araç kutusunu dar genişliğe getir'; size.setAttribute('aria-label', size.title); } collapsed(!!state.collapsed);
    if (Number.isFinite(state.x) && Number.isFinite(state.y)) clampPosition(state.x, state.y); else initialPosition();
    refreshHeight(); save();
    toggle.addEventListener('click', () => collapsed(!body.hidden));
    size.addEventListener('click', () => { box.classList.toggle('is-wide'); const wide = box.classList.contains('is-wide'); size.title = wide ? 'Araç kutusunu dar genişliğe getir' : 'Araç kutusunu genişlet'; size.setAttribute('aria-label', size.title); size.setAttribute('aria-pressed', String(wide)); clampPosition(parseFloat(box.style.left), parseFloat(box.style.top)); save(); });
    reset.addEventListener('click', () => { initialPosition(); refreshHeight(); save(); });
    drag.addEventListener('pointerdown', event => { if (event.button !== undefined && event.button !== 0) return; event.preventDefault(); gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, left: parseFloat(box.style.left), top: parseFloat(box.style.top) }; drag.setPointerCapture(event.pointerId); box.classList.add('is-dragging'); });
    drag.addEventListener('pointermove', event => { if (!gesture || gesture.id !== event.pointerId) return; event.preventDefault(); clampPosition(gesture.left + event.clientX - gesture.x, gesture.top + event.clientY - gesture.y); refreshHeight(); });
    function endDrag(event) { if (!gesture || gesture.id !== event.pointerId) return; gesture = null; box.classList.remove('is-dragging'); if (drag.hasPointerCapture?.(event.pointerId)) drag.releasePointerCapture(event.pointerId); save(); }
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => drag.addEventListener(type, endDrag));
    drag.addEventListener('keydown', event => { const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key]; if (!delta) return; event.preventDefault(); clampPosition(parseFloat(box.style.left) + delta[0] * (event.shiftKey ? 40 : 12), parseFloat(box.style.top) + delta[1] * (event.shiftKey ? 40 : 12)); refreshHeight(); save(); });
    window.addEventListener('resize', () => { refreshHeight(); clampPosition(parseFloat(box.style.left), parseFloat(box.style.top)); refreshHeight(); });
    window.addEventListener('scroll', refreshHeight, { passive: true });
    if (window.kemalSite?.ready?.finally) window.kemalSite.ready.finally(() => { if (!Number.isFinite(state.y)) initialPosition(); refreshHeight(); });
    if (window.ResizeObserver) new ResizeObserver(() => { clampPosition(parseFloat(box.style.left) || 16, parseFloat(box.style.top) || 16); refreshHeight(); }).observe(box);
    attachTooltip(box);
    return box;
  }
  function attachTooltip(box) {
    const tip = node('div', 'geometry-toolbox-tooltip'); tip.id = 'geometryShapeTooltip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true; document.body.append(tip);
    function show(button) { if (!button?.dataset.tooltip) return; tip.textContent = button.dataset.tooltip; tip.hidden = false; button.setAttribute('aria-describedby', tip.id); const r = button.getBoundingClientRect(); tip.style.left = `${Math.max(8, Math.min(window.innerWidth - (tip.offsetWidth || 160) - 8, r.left + r.width / 2 - (tip.offsetWidth || 160) / 2))}px`; const tipHeight = tip.offsetHeight || 30; tip.style.top = `${Math.max(8, r.bottom + tipHeight + 12 <= window.innerHeight ? r.bottom + 7 : r.top - tipHeight - 7)}px`; }
    function hide() { tip.hidden = true; box.querySelectorAll('[aria-describedby="geometryShapeTooltip"]').forEach(b => b.removeAttribute('aria-describedby')); }
    box.addEventListener('pointerover', e => show(e.target.closest('[data-tooltip]'))); box.addEventListener('pointerout', hide);
    box.addEventListener('focusin', e => show(e.target.closest('[data-tooltip]'))); box.addEventListener('focusout', hide); box.addEventListener('pointerdown', hide);
    window.addEventListener('scroll', hide, { passive: true }); window.addEventListener('resize', hide);
  }
  window.GeometryToolbox = { init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
