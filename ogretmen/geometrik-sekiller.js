(() => {
  const $ = (selector) => document.querySelector(selector);
  const shell = $('.builder-shell');
  const board = $('#shapeBoard');
  if (!shell || !board) return;

  const colors = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'];
  let selected = null;
  let serial = 0;

  function choose(piece) {
    if (selected) selected.classList.remove('is-selected');
    selected = piece;
    if (selected) selected.classList.add('is-selected');
  }

  function applyTransform(piece) {
    piece.style.transform = `rotate(${piece.dataset.rotation}deg)`;
  }

  function spawn(type, options = {}) {
    const piece = document.createElement('div');
    const rotation = Number(options.rotation || 0);
    const color = options.color || colors[serial++ % colors.length];
    const direction = options.direction || 'up';
    const x = options.x ?? (230 + (serial % 4) * 44);
    const y = options.y ?? (180 + (serial % 3) * 38);

    piece.className = `geo-piece ${type} dir-${direction} ${color}`;
    piece.dataset.rotation = String(rotation);
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
    applyTransform(piece);
    board.append(piece);
    bindPiece(piece);
    choose(piece);
    return piece;
  }

  function bindPiece(piece) {
    let drag = null;
    piece.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      piece.setPointerCapture(event.pointerId);
      const rect = piece.getBoundingClientRect();
      drag = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      choose(piece);
    });
    piece.addEventListener('pointermove', (event) => {
      if (!drag) return;
      const boardRect = board.getBoundingClientRect();
      const x = Math.max(-20, Math.min(board.clientWidth - piece.offsetWidth + 20, event.clientX - boardRect.left - drag.x));
      const y = Math.max(-20, Math.min(board.clientHeight - piece.offsetHeight + 20, event.clientY - boardRect.top - drag.y));
      piece.style.left = `${Math.round(x / 8) * 8}px`;
      piece.style.top = `${Math.round(y / 8) * 8}px`;
    });
    piece.addEventListener('pointerup', () => { drag = null; });
    piece.addEventListener('dblclick', rotateSelected);
  }

  function rotateSelected() {
    if (!selected) return;
    selected.dataset.rotation = String((Number(selected.dataset.rotation) + 45) % 360);
    applyTransform(selected);
  }

  function clear() {
    board.querySelectorAll('.geo-piece').forEach((piece) => piece.remove());
    choose(null);
  }

  function template(items) {
    clear();
    items.forEach(([type, x, y, color, direction = 'up', rotation = 0]) => {
      spawn(type, { x, y, color, direction, rotation });
    });
    choose(null);
  }

  function switchMode(twoD) {
    shell.classList.toggle('two-d', twoD);
    $('#mode2d').classList.toggle('primary', twoD);
    $('#mode3d').classList.toggle('primary', !twoD);
    $('.hint').textContent = twoD
      ? 'Şekli sürükle · Çift tıklayarak veya “Döndür” ile çevir · Izgaraya göre hizala'
      : 'Cismi sürükle · Boş alanı sürükleyerek görünümü döndür · Tekerlekle yakınlaş';
  }

  $('#mode2d').onclick = () => switchMode(true);
  $('#mode3d').onclick = () => switchMode(false);
  document.querySelectorAll('[data-2d]').forEach((button) => {
    button.onclick = () => spawn(button.dataset['2d']);
  });
  $('#shapeRotate').onclick = rotateSelected;
  $('#shapeRemove').onclick = () => {
    if (selected) {
      selected.remove();
      choose(null);
    }
  };
  $('#shapeClear').onclick = clear;

  // Referanstaki ev gibi sade ve okunabilir bir siluet: çatı, duvar, pencere
  // ve kapı aynı ızgara üzerinde hizalıdır; sonradan her parça taşınabilir.
  $('#shapeHome').onclick = () => template([
    ['large-triangle', 326, 70,  'c1', 'up'],
    ['square',          366, 238, 'c4', 'flat'],
    ['square',          386, 256, 'c5', 'window'],
    ['parallelogram',   400, 282, 'c2', 'door']
  ]);

  // Referanstaki yelkenli gibi tekne gövdesi altta, yelkenler direğin iki
  // yanında kalır; bu nedenle siluet ilk bakışta kolayca ayırt edilir.
  $('#shapeBoat').onclick = () => template([
    ['large-triangle',  250, 140, 'c4', 'right'],
    ['medium-triangle', 450, 180, 'c5', 'left'],
    ['square',          441, 126, 'c6', 'mast'],
    ['small-triangle',  427, 72,  'c1', 'right'],
    ['parallelogram',   260, 345, 'c2', 'hull']
  ]);

  board.addEventListener('pointerdown', (event) => {
    if (event.target === board) choose(null);
  });
})();
