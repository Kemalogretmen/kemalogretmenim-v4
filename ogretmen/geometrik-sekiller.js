(() => {
  const $ = selector => document.querySelector(selector);
  const shell = $('.builder-shell'), board = $('#shapeBoard');
  if (!shell || !board) return;
  window.GeometryBackgrounds?.register('builder2d', type => { board.dataset.background = type; }, 'square');
  const NS = 'http://www.w3.org/2000/svg';
  const colors = ['#ef4444', '#f97316', '#facc15', '#65bd65', '#09addb', '#8200ac', '#f72585'];
  const names = { triangle: 'Üçgen', square: 'Kare', rectangle: 'Dikdörtgen', ring: 'Çember', circle: 'Daire' };
  const help = {
    triangle: 'Sarı köşeleri çekerek üçgeni şekillendir. Mavi köşelerle boyutlandır, ↻ tutamacıyla döndür.',
    square: 'Mavi tutamaçları çekerek büyüt veya küçült. Kare eşit kenarlı kalır. ↻ tutamacıyla döndür.',
    rectangle: 'Mavi köşe ve kenarları çekerek enini ve boyunu değiştir. ↻ tutamacıyla döndür.',
    ring: 'Mavi tutamaçları çekerek büyüt veya küçült. Çember her zaman yuvarlak kalır.',
    circle: 'Mavi tutamaçları çekerek büyüt veya küçült. Daire her zaman yuvarlak kalır.'
  };
  const svg = el('svg', { class: 'shape-canvas', 'aria-label': 'Şekilleri taşıma ve düzenleme alanı' });
  const piecesLayer = el('g'), controls = el('g', { class: 'shape-selection' });
  svg.append(piecesLayer, controls); board.append(svg);
  let width = 800, height = 560, pieces = [], selected = null, gesture = null, serial = 0;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  function el(tag, attributes = {}) {
    const node = document.createElementNS(NS, tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  }
  const roundShape = p => p.type === 'circle' || p.type === 'ring';
  const turn = (point, angle) => {
    const a = angle * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return { x: point.x * c - point.y * s, y: point.x * s + point.y * c };
  };
  const world = (p, point) => { const q = turn(point, p.angle); return { x: p.x + q.x, y: p.y + q.y }; };
  const local = (p, point) => turn({ x: point.x - p.x, y: point.y - p.y }, -p.angle);
  const snapshot = p => ({ ...p, points: p.points?.map(q => ({ ...q })) });
  function bounds(points) {
    const xs = points.map(q => q.x), ys = points.map(q => q.y);
    return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
  }
  function localBounds(p) {
    return p.points ? bounds(p.points) : { left: -p.w / 2, right: p.w / 2, top: -p.h / 2, bottom: p.h / 2 };
  }
  function worldBounds(p) {
    if (roundShape(p)) return { left: p.x - p.w / 2, right: p.x + p.w / 2, top: p.y - p.h / 2, bottom: p.y + p.h / 2 };
    const b = localBounds(p);
    return bounds((p.points || [{ x: b.left, y: b.top }, { x: b.right, y: b.top }, { x: b.right, y: b.bottom }, { x: b.left, y: b.bottom }]).map(q => world(p, q)));
  }
  // Keep enough space around a piece to grab its handles, even after rotation.
  function keepInside(p) {
    const b = worldBounds(p), margin = 18, top = 50;
    const spanX = b.right - b.left, spanY = b.bottom - b.top;
    const factor = Math.min(1, (width - 2 * margin) / spanX, (height - top - margin) / spanY);
    if (factor < 1) { p.w *= factor; p.h *= factor; p.points?.forEach(q => { q.x *= factor; q.y *= factor; }); }
    const next = worldBounds(p);
    p.x += Math.max(margin - next.left, Math.min(0, width - margin - next.right));
    p.y += Math.max(top - next.top, Math.min(0, height - margin - next.bottom));
  }
  function render(p) {
    p.node.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${p.angle})`);
    if (p.points) p.node.setAttribute('points', p.points.map(q => `${q.x},${q.y}`).join(' '));
    else if (roundShape(p)) { p.node.setAttribute('r', p.w / 2); }
    else {
      Object.entries({ x: -p.w / 2, y: -p.h / 2, width: p.w, height: p.h }).forEach(([key, value]) => p.node.setAttribute(key, value));
    }
    p.node.setAttribute('fill', p.type === 'ring' ? 'none' : p.color);
    p.node.setAttribute('stroke', p.type === 'ring' ? p.color : 'none');
    p.node.setAttribute('stroke-width', p.type === 'ring' ? 5 : 0);
    p.node.setAttribute('vector-effect', 'non-scaling-stroke');
    p.node.dataset.rotation = String(p.angle);
    if (p === selected) drawControls();
  }
  function choose(p) {
    selected?.node.classList.remove('is-selected'); selected = p;
    selected?.node.classList.add('is-selected');
    $('#shapeSelectedName').textContent = p ? `${names[p.type]} seçili` : 'Bir şekil seç';
    $('#shapeHelp').textContent = p ? help[p.type] : 'Şekil ekle veya aşağıdan bir örnek seç. Her parçayı ayrı ayrı değiştirebilirsin.';
    ['shapeCopy', 'shapeShrink', 'shapeGrow', 'shapeRemove'].forEach(id => { $('#' + id).disabled = !p; });
    $('#shapeRotate').disabled = !p || roundShape(p);
    drawControls();
  }
  function handle(x, y, kind, data = {}, title = '') {
    const g = el('g', { class: 'shape-handle', 'data-kind': kind, transform: `translate(${x} ${y})`, ...data });
    const label = el('title'); label.textContent = title;
    g.append(label, el('circle', { r: 15, class: 'shape-handle-hit' }), el('circle', { r: kind === 'rotate' ? 11 : 7, class: 'shape-handle-dot' }));
    if (kind === 'rotate') { const icon = el('text', { class: 'shape-handle-icon', y: -1 }); icon.textContent = '↻'; g.append(icon); }
    controls.append(g);
  }
  function drawControls() {
    controls.replaceChildren();
    if (!selected) return;
    const p = selected, b = localBounds(p);
    controls.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${p.angle})`);
    controls.append(el('rect', { x: b.left, y: b.top, width: b.right - b.left, height: b.bottom - b.top, class: 'shape-selection-frame' }));
    if (roundShape(p)) {
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([sx, sy]) => handle(sx * p.w / 2, sy * p.h / 2, 'resize', { 'data-sx': sx, 'data-sy': sy }, 'Çapı büyüt veya küçült'));
    } else {
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => handle(sx < 0 ? b.left : b.right, sy < 0 ? b.top : b.bottom, 'resize', { 'data-sx': sx, 'data-sy': sy }, 'Köşeden büyüt veya küçült'));
      if (p.type === 'rectangle') [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([sx, sy]) => handle(sx * p.w / 2, sy * p.h / 2, 'resize', { 'data-sx': sx, 'data-sy': sy }, sx ? 'Dikdörtgenin enini değiştir' : 'Dikdörtgenin boyunu değiştir'));
      const rotateY = b.top - 30;
      controls.append(el('line', { x1: 0, y1: b.top, x2: 0, y2: rotateY, class: 'shape-rotate-line' }));
      handle(0, rotateY, 'rotate', {}, 'Şekli kendi etrafında döndür');
      p.points?.forEach((q, index) => handle(q.x, q.y, 'vertex', { 'data-index': index }, 'Üçgenin bu köşesini değiştir'));
    }
  }
  function spawn(type, options = {}) {
    if (!names[type]) return;
    const w = options.w ?? (type === 'rectangle' ? 170 : 120), h = options.h ?? (type === 'rectangle' ? 95 : 120);
    const p = { type, x: options.x ?? width / 2 + (serial % 4 - 1.5) * 18, y: options.y ?? height / 2 + (serial % 3 - 1) * 18,
      w, h, angle: roundShape({ type }) ? 0 : (options.angle ?? 0), color: options.color || colors[serial % colors.length],
      points: type === 'triangle' ? (options.points || [{ x: 0, y: -h / 2 }, { x: w / 2, y: h / 2 }, { x: -w / 2, y: h / 2 }]).map(q => ({ ...q })) : null };
    serial++;
    p.node = el(p.points ? 'polygon' : roundShape(p) ? 'circle' : 'rect', { class: 'geo-piece', 'data-type': type, tabindex: 0, role: 'graphics-symbol', 'aria-label': names[type] });
    pieces.push(p); piecesLayer.append(p.node); keepInside(p); render(p); choose(p); return p;
  }
  function point(event) {
    const r = svg.getBoundingClientRect();
    return { x: (event.clientX - r.left) * width / r.width, y: (event.clientY - r.top) * height / r.height };
  }
  function finish(event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    const p = gesture.p;
    // Recenter a reshaped triangle without moving any of its three world vertices.
    if (p.points) {
      const b = localBounds(p), center = { x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 }, delta = turn(center, p.angle);
      p.x += delta.x; p.y += delta.y; p.points.forEach(q => { q.x -= center.x; q.y -= center.y; }); p.w = b.right - b.left; p.h = b.bottom - b.top;
    }
    gesture = null; render(p);
    if (svg.hasPointerCapture?.(event.pointerId)) svg.releasePointerCapture(event.pointerId);
  }
  svg.addEventListener('pointerdown', event => {
    if (gesture || (event.button !== undefined && event.button !== 0)) return;
    const grip = event.target.closest('.shape-handle'), node = event.target.closest('.geo-piece');
    const p = grip ? selected : pieces.find(q => q.node === node);
    if (!p) { choose(null); return; }
    event.preventDefault(); choose(p);
    const start = point(event), initial = snapshot(p), b = localBounds(initial);
    const kind = grip?.dataset.kind || 'move', sx = Number(grip?.dataset.sx || 0), sy = Number(grip?.dataset.sy || 0);
    gesture = { p, initial, start, kind, sx, sy, index: Number(grip?.dataset.index), id: event.pointerId, b,
      anchor: { x: sx > 0 ? b.left : sx < 0 ? b.right : (b.left + b.right) / 2, y: sy > 0 ? b.top : sy < 0 ? b.bottom : (b.top + b.bottom) / 2 } };
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener('pointermove', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    event.preventDefault();
    const g = gesture, p = g.p, s = g.initial, pos = point(event);
    if (g.kind === 'move') { p.x = s.x + pos.x - g.start.x; p.y = s.y + pos.y - g.start.y; }
    else if (g.kind === 'rotate') {
      const a = Math.atan2(pos.y - s.y, pos.x - s.x) - Math.atan2(g.start.y - s.y, g.start.x - s.x);
      p.x = s.x; p.y = s.y; p.angle = s.angle + a * 180 / Math.PI;
      if (event.shiftKey) p.angle = Math.round(p.angle / 15) * 15;
    } else if (g.kind === 'vertex') {
      const q = local(s, pos), start = local(s, g.start), old = s.points[g.index];
      const next = s.points.map((v, index) => index === g.index ? { x: old.x + q.x - start.x, y: old.y + q.y - start.y } : { ...v });
      const [a, b, c] = next;
      const area2 = Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
      const longest = Math.max(...next.map((v, index) => Math.hypot(v.x - next[(index + 1) % 3].x, v.y - next[(index + 1) % 3].y)));
      if (area2 / longest < 10 || next.some((v, index) => Math.hypot(v.x - next[(index + 1) % 3].x, v.y - next[(index + 1) % 3].y) < 16)) return;
      p.x = s.x; p.y = s.y; p.w = s.w; p.h = s.h; p.points = next;
    } else {
      const q = local(s, pos), start = local(s, g.start), b = g.b;
      const oldW = b.right - b.left, oldH = b.bottom - b.top;
      let newW = g.sx ? oldW + g.sx * (q.x - start.x) : oldW;
      let newH = g.sy ? oldH + g.sy * (q.y - start.y) : oldH;
      if (p.type === 'square' || roundShape(p)) {
        const side = g.sx && g.sy ? (newW + newH) / 2 : g.sx ? newW : newH;
        newW = newH = Math.max(24, side);
      } else { newW = Math.max(24, newW); newH = Math.max(24, newH); }
      const fx = newW / oldW, fy = newH / oldH;
      const center = { x: g.anchor.x + ((b.left + b.right) / 2 - g.anchor.x) * fx, y: g.anchor.y + ((b.top + b.bottom) / 2 - g.anchor.y) * fy };
      const delta = turn(center, s.angle); p.x = s.x + delta.x; p.y = s.y + delta.y; p.w = newW; p.h = newH;
      if (p.points) p.points = s.points.map(v => ({ x: g.anchor.x + (v.x - g.anchor.x) * fx - center.x, y: g.anchor.y + (v.y - g.anchor.y) * fy - center.y }));
    }
    keepInside(p); render(p);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => svg.addEventListener(type, finish));
  svg.addEventListener('dblclick', event => { if (event.target.closest('.geo-piece')) rotateSelected(); });
  svg.addEventListener('focusin', event => { const p = pieces.find(q => q.node === event.target); if (p) choose(p); });
  svg.addEventListener('keydown', event => {
    if (!selected) return;
    const steps = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }, step = steps[event.key];
    if (step) { event.preventDefault(); selected.x += step[0] * (event.shiftKey ? 10 : 2); selected.y += step[1] * (event.shiftKey ? 10 : 2); keepInside(selected); render(selected); }
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); removeSelected(); }
    if (event.key === 'Escape') choose(null);
  });
  function rotateSelected() { if (selected && !roundShape(selected)) { selected.angle = (selected.angle + 45) % 360; keepInside(selected); render(selected); } }
  function scaleSelected(factor) {
    if (!selected) return;
    const b = localBounds(selected);
    if (Math.min(b.right - b.left, b.bottom - b.top) * factor < 24) return;
    selected.w *= factor; selected.h *= factor; selected.points?.forEach(q => { q.x *= factor; q.y *= factor; }); keepInside(selected); render(selected);
  }
  function removeSelected() { if (!selected) return; selected.node.remove(); pieces = pieces.filter(p => p !== selected); gesture = null; choose(null); }
  function clear() { gesture = null; piecesLayer.replaceChildren(); pieces = []; choose(null); }
  function switchMode(twoD) {
    gesture = null; shell.classList.toggle('two-d', twoD); document.body.classList.toggle('shape-workshop', twoD);
    $('#mode2d').classList.toggle('primary', twoD); $('#mode3d').classList.toggle('primary', !twoD);
    if (twoD) resizeBoard();
  }
  function resizeBoard() {
    shell.style.setProperty('--builder-top', `${shell.getBoundingClientRect().top + window.scrollY}px`);
    const nextW = board.clientWidth, nextH = board.clientHeight;
    if (!nextW || !nextH || (nextW === width && nextH === height)) return;
    gesture = null;
    const oldW = width, oldH = height, factor = Math.min(nextW / width, nextH / height);
    width = nextW; height = nextH;
    pieces.forEach(p => { p.x = width / 2 + (p.x - oldW / 2) * factor; p.y = height / 2 + (p.y - oldH / 2) * factor; p.w *= factor; p.h *= factor; p.points?.forEach(q => { q.x *= factor; q.y *= factor; }); keepInside(p); render(p); });
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`); drawControls();
  }
  new ResizeObserver(resizeBoard).observe(board);
  $('#mode2d').onclick = () => switchMode(true); $('#mode3d').onclick = () => switchMode(false);
  function revealBoard() { if (window.innerWidth <= 980) board.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  document.querySelectorAll('[data-2d]').forEach(button => { button.onclick = () => { spawn(button.dataset['2d']); revealBoard(); }; });
  $('#shapeRotate').onclick = rotateSelected; $('#shapeShrink').onclick = () => scaleSelected(.85); $('#shapeGrow').onclick = () => scaleSelected(1.15);
  $('#shapeCopy').onclick = () => { if (selected) spawn(selected.type, { ...snapshot(selected), x: selected.x + 24, y: selected.y + 24 }); };
  $('#shapeRemove').onclick = removeSelected; $('#shapeClear').onclick = () => { clear(); document.querySelectorAll('.shape-example').forEach(b => b.classList.remove('is-active')); };

  // Preview and editable board pieces use the same geometry, so every preview
  // describes exactly the pieces the child can select and change.
  const examples = window.geometryExamples || [];
  function showExample(example) {
    clear();
    const all = example.pieces.flatMap(p => p.points || [{ x: p.x - p.w / 2, y: p.y - p.h / 2 }, { x: p.x + p.w / 2, y: p.y + p.h / 2 }]);
    const b = bounds(all), scale = Math.min((width - 90) / (b.right - b.left), (height - 120) / (b.bottom - b.top), 1.65);
    const cx = (b.left + b.right) / 2, cy = (b.top + b.bottom) / 2;
    example.pieces.forEach(part => {
      if (part.points) {
        const pb = bounds(part.points), px = (pb.left + pb.right) / 2, py = (pb.top + pb.bottom) / 2;
        spawn('triangle', { x: width / 2 + (px - cx) * scale, y: (height + 30) / 2 + (py - cy) * scale, w: (pb.right - pb.left) * scale, h: (pb.bottom - pb.top) * scale, color: part.color, points: part.points.map(q => ({ x: (q.x - px) * scale, y: (q.y - py) * scale })) });
      } else spawn(part.type, { ...part, x: width / 2 + (part.x - cx) * scale, y: (height + 30) / 2 + (part.y - cy) * scale, w: part.w * scale, h: part.h * scale });
    });
    choose(null);
  }
  examples.forEach(example => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'shape-example'; button.dataset.example = example.id; button.setAttribute('aria-label', `${example.name} örneğini aç`);
    const previewBounds = bounds(example.pieces.flatMap(part => part.points || [{ x: part.x - part.w, y: part.y - part.h }, { x: part.x + part.w, y: part.y + part.h }]));
    const previewSide = Math.max(previewBounds.right - previewBounds.left, previewBounds.bottom - previewBounds.top) + 30;
    const preview = el('svg', { viewBox: `${(previewBounds.left + previewBounds.right - previewSide) / 2} ${(previewBounds.top + previewBounds.bottom - previewSide) / 2} ${previewSide} ${previewSide}`, 'aria-hidden': 'true' });
    example.pieces.forEach(part => {
      const shape = part.points ? el('polygon', { points: part.points.map(q => `${q.x},${q.y}`).join(' ') }) : el(part.type === 'circle' || part.type === 'ring' ? 'circle' : 'rect', roundShape(part) ? { cx: part.x, cy: part.y, r: part.w / 2 } : { x: part.x - part.w / 2, y: part.y - part.h / 2, width: part.w, height: part.h, transform: `rotate(${part.angle || 0} ${part.x} ${part.y})` });
      shape.setAttribute('fill', part.type === 'ring' ? 'none' : part.color); if (part.type === 'ring') { shape.setAttribute('stroke', part.color); shape.setAttribute('stroke-width', 5); } preview.append(shape);
    });
    const label = document.createElement('span'); label.textContent = example.name; button.append(preview, label);
    button.onclick = () => { showExample(example); revealBoard(); document.querySelectorAll('.shape-example').forEach(b => b.classList.toggle('is-active', b === button)); };
    $('#shapeExamples').append(button);
  });
  choose(null);
})();
