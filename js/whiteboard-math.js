(function () {
  'use strict';
  var UNIT = 32;
  var DEG = Math.PI / 180;
  var NS = 'http://www.w3.org/2000/svg';
  var clamp = function (value, min, max) { return Math.max(min, Math.min(max, value)); };

  window.initWhiteboardMathTools = function (api) {
    var panel = document.getElementById('mathSubPanel');
    var instrument = document.createElement('div');
    instrument.className = 'math-instrument';
    instrument.id = 'mathInstrument';
    instrument.hidden = true;
    instrument.innerHTML = '<svg class="math-instrument-svg" aria-label="Matematik aracı"></svg><div class="math-instrument-controls"><button type="button" data-action="move" title="Aracı taşı" aria-label="Aracı taşı"><i class="fas fa-arrows-alt"></i></button><button type="button" data-action="draw" title="Çiz" aria-label="Çiz"><i class="fas fa-pen"></i></button><button type="button" data-action="close" title="Aracı kaldır" aria-label="Aracı kaldır"><i class="fas fa-times"></i></button></div>';
    api.plane.appendChild(instrument);
    var svg = instrument.querySelector('svg');
    var controls = instrument.querySelector('.math-instrument-controls');
    var tabs = Array.from(panel.querySelectorAll('[data-math-tool]'));
    var lengthInput = panel.querySelector('#mathLength');
    var rotationInput = panel.querySelector('#mathRotation');
    var angleInput = panel.querySelector('#mathAngle');
    var drawButton = panel.querySelector('#mathDraw');
    var state = { tool: 'protractor', visible: false, x: 0, y: 0, rotation: 0, radius: 3, length: 10, angle: 60, filled: false };
    var drag = null;
    var frame = null;
    var renderFrame = null;
    var drawing = null;

    function node(name, attrs, text) {
      var el = document.createElementNS(NS, name);
      Object.keys(attrs || {}).forEach(function (key) { el.setAttribute(key, attrs[key]); });
      if(text !== undefined) el.textContent = text;
      svg.appendChild(el);
      return el;
    }
    function line(x1, y1, x2, y2, attrs) {
      return node('line', Object.assign({ x1: x1, y1: y1, x2: x2, y2: y2, stroke: '#425875', 'stroke-width': 1 }, attrs));
    }
    function handle(x, y, action, title) {
      var group = node('g', {});
      var el = node('circle', { cx: x, cy: y, r: 21, class: 'instrument-handle', 'data-drag': action });
      var tip = document.createElementNS(NS, 'title'); tip.textContent = title; el.appendChild(tip);
      var dot = node('circle', { cx: x, cy: y, r: 4, fill: '#7043d8', 'pointer-events': 'none' });
      group.append(el, dot);
      return group;
    }
    function protractorRadius() {
      return Math.max(70, Math.min(150, (api.stage.clientWidth / api.zoom() - 68) / 2));
    }
    function bounds() {
      if(state.tool === 'ruler') return { left: -24, top: -60, width: state.length * UNIT + 50, height: 108, bottom: 64 };
      if(state.tool === 'protractor') {
        var outer = protractorRadius();
        return { left: -outer - 30, top: -outer - 40, width: 2 * outer + 60, height: outer + 94, bottom: 64 };
      }
      var radius = state.radius * UNIT;
      return { left: -radius - 26, top: -radius - 26, width: 2 * radius + 52, height: 2 * radius + 52, bottom: radius + 36 };
    }
    function transform() {
      var z = api.zoom();
      instrument.style.transform = 'translate(' + state.x * z + 'px,' + state.y * z + 'px) scale(' + z + ')';
      svg.style.transform = 'rotate(' + state.rotation + 'deg)';
      svg.style.transformOrigin = (-parseFloat(svg.style.left)) + 'px ' + (-parseFloat(svg.style.top)) + 'px';
    }
    function syncPanel() {
      tabs.forEach(function (tab) { tab.setAttribute('aria-pressed', String(tab.dataset.mathTool === state.tool)); });
      panel.querySelector('#mathLengthField').hidden = state.tool === 'protractor';
      panel.querySelector('#mathLengthLabel').textContent = state.tool === 'compass' ? 'Yarıçap (birim)' : 'Uzunluk (birim)';
      lengthInput.max = state.tool === 'compass' ? '8' : '20';
      lengthInput.min = state.tool === 'compass' ? '0.5' : '2';
      lengthInput.value = state.tool === 'compass' ? state.radius : state.length;
      rotationInput.value = Math.round(state.rotation);
      angleInput.value = Math.round(state.angle);
      panel.querySelector('#mathAngleField').hidden = state.tool !== 'protractor';
      panel.querySelector('#mathCircleOptions').hidden = state.tool !== 'compass';
      drawButton.textContent = state.tool === 'compass' ? (state.filled ? 'Daire çiz' : 'Çember çiz') : state.tool === 'ruler' ? 'Doğru parçası çiz' : 'Açı çiz';
      drawButton.disabled = !state.visible || !!drawing;
      instrument.querySelector('[data-action="draw"]').disabled = !!drawing;
      api.button.classList.toggle('is-active', state.visible);
      panel.querySelector('#mathHide').disabled = !state.visible;
    }
    function render() {
      if(!state.visible) return;
      var b = bounds();
      svg.style.left = b.left + 'px'; svg.style.top = b.top + 'px';
      svg.style.width = b.width + 'px'; svg.style.height = b.height + 'px';
      svg.setAttribute('viewBox', [b.left, b.top, b.width, b.height].join(' '));
      svg.replaceChildren();
      if(state.tool === 'ruler') {
        var width = state.length * UNIT;
        node('rect', { x: -12, y: -2, width: width + 24, height: 48, rx: 4, fill: '#e4f5f9', 'fill-opacity': .78, stroke: '#638999', 'data-drag': 'move' });
        for(var i = 0; i <= Math.round(state.length * 10); i++) {
          var x = i * UNIT / 10;
          line(x, 0, x, i % 10 === 0 ? 19 : i % 5 === 0 ? 13 : 7);
          if(i % 10 === 0) node('text', { x: x, y: 33, 'text-anchor': 'middle' }, i / 10);
        }
        handle(width, -30, 'rotate', 'Cetveli döndür');
      } else if(state.tool === 'protractor') {
        var outer = protractorRadius();
        node('path', { d: 'M-' + outer + ' 0 A' + outer + ' ' + outer + ' 0 0 1 ' + outer + ' 0 L' + outer + ' 16 L-' + outer + ' 16 Z', fill: '#e4f5f9', 'fill-opacity': .68, stroke: '#638999', 'data-drag': 'move' });
        for(var degree = 0; degree <= 180; degree++) {
          var a = degree * DEG, major = degree % 10 === 0, r = outer - (major ? 19 : degree % 5 === 0 ? 13 : 6);
          line(outer * Math.cos(a), -outer * Math.sin(a), r * Math.cos(a), -r * Math.sin(a));
          if(major && (outer >= 140 || degree % 30 === 0)) {
            node('text', { x: (outer - 31) * Math.cos(a), y: -(outer - 31) * Math.sin(a) + 4, 'text-anchor': 'middle' }, degree);
            node('text', { x: (outer - 52) * Math.cos(a), y: -(outer - 52) * Math.sin(a) + 4, 'text-anchor': 'middle', opacity: .7 }, 180 - degree);
          }
        }
        line(-16, 0, outer, 0, { stroke: '#6c3ded', 'stroke-width': 2 });
        line(0, -12, 0, 12);
        var angle = state.angle * DEG;
        line(0, 0, (outer + 8) * Math.cos(angle), -(outer + 8) * Math.sin(angle), { stroke: '#db6244', 'stroke-width': 2 });
        handle((outer + 8) * Math.cos(angle), -(outer + 8) * Math.sin(angle), 'angle', 'Açıyı ayarla');
        node('text', { x: 0, y: 38, 'text-anchor': 'middle' }, Math.round(state.angle) + '°');
      } else {
        var radius = state.radius * UNIT;
        node('circle', { cx: 0, cy: 0, r: radius, fill: state.filled ? api.color() : 'none', 'fill-opacity': .08, stroke: '#8396a6', 'stroke-width': 1, 'stroke-dasharray': '5 5' });
        node('path', { id: 'compassTrace', fill: 'none', stroke: api.color(), 'stroke-width': api.size(), 'stroke-linecap': 'round' });
        var arm = node('g', { id: 'compassArm' });
        var top = -Math.max(40, radius * .6);
        var leftLeg = line(0, 0, radius / 2, top, { stroke: '#43546b', 'stroke-width': 9, 'stroke-linecap': 'round' });
        var rightLeg = line(radius / 2, top, radius, 0, { stroke: '#8971c4', 'stroke-width': 9, 'stroke-linecap': 'round' });
        arm.append(leftLeg, rightLeg);
        var joint = node('circle', { cx: radius / 2, cy: top, r: 10, fill: '#eef1f5', stroke: '#43546b', 'stroke-width': 3 }); arm.appendChild(joint);
        arm.appendChild(handle(radius, 0, 'radius', 'Pergel açıklığını ayarla'));
        handle(0, 0, 'move', 'Pergelin merkezini taşı');
        node('text', { x: radius / 2, y: 30, 'text-anchor': 'middle' }, state.radius + ' birim');
      }
      controls.style.top = b.bottom + 'px';
      controls.style.left = (state.tool === 'ruler' ? state.length * UNIT / 2 : 0) + 'px';
      transform(); syncPanel();
    }
    function center(fit) {
      var rect = api.stage.getBoundingClientRect();
      if(fit && innerWidth <= 760 && innerHeight - Math.max(0, rect.top) < 380) {
        api.stage.scrollIntoView({ block: 'start', behavior: 'instant' });
        rect = api.stage.getBoundingClientRect();
      }
      var board = api.plane.getBoundingClientRect();
      var z = api.zoom();
      var left = Math.max(rect.left, 0), right = Math.min(rect.right, innerWidth);
      var top = Math.max(rect.top, 0), bottom = Math.min(rect.bottom, innerHeight);
      if(innerWidth <= 760) bottom = Math.max(top + 100, bottom - 80);
      var width = Math.max(200, right - left);
      if(fit && state.tool === 'ruler') state.length = Math.min(state.length, Math.max(2, Math.floor((width / z - 70) / UNIT)));
      if(fit && state.tool === 'compass') state.radius = Math.min(state.radius, Math.max(.5, Math.floor((width / z - 70) / (2 * UNIT) * 2) / 2));
      state.x = ((left + right) / 2 - board.left) / z - (state.tool === 'ruler' ? state.length * UNIT / 2 : 0);
      state.y = ((top + bottom) / 2 - board.top) / z + (state.tool === 'protractor' ? 50 : 0);
    }
    function cancelAnimation() {
      if(frame !== null) cancelAnimationFrame(frame);
      frame = null; drawing = null;
    }
    function scheduleRender() {
      if(renderFrame !== null) return;
      renderFrame = requestAnimationFrame(function () { renderFrame = null; render(); });
    }
    function show(tool) {
      cancelAnimation();
      api.activate();
      state.tool = tool; state.visible = true; state.rotation = 0;
      instrument.hidden = false;
      center(true); render();
    }
    function hide() {
      cancelAnimation(); drag = null; state.visible = false; instrument.hidden = true; syncPanel();
    }
    function rotatePoint(x, y) {
      var a = state.rotation * DEG;
      return { x: state.x + x * Math.cos(a) - y * Math.sin(a), y: state.y + x * Math.sin(a) + y * Math.cos(a) };
    }
    function draw() {
      if(!state.visible || drawing) return;
      var style = { strokeColor: api.color(), fillColor: api.color(), size: api.size(), fillEnabled: false };
      if(state.tool === 'compass') {
        var r = state.radius * UNIT;
        var item = Object.assign({}, style, { kind: 'shape', tool: 'circle', fillEnabled: state.filled, start: { x: state.x - r, y: state.y - r }, end: { x: state.x + r, y: state.y + r } });
        drawing = item; syncPanel();
        var start = performance.now();
        var duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650;
        function tick(now) {
          var progress = duration ? Math.min(1, (now - start) / duration) : 1;
          if(progress === 1) {
            api.commit(drawing); drawing = null; frame = null; render(); return;
          }
          var a = progress * Math.PI * 2;
          svg.querySelector('#compassTrace').setAttribute('d', 'M' + r + ' 0 A' + r + ' ' + r + ' 0 ' + (progress > .5 ? 1 : 0) + ' 1 ' + (r * Math.cos(a)) + ' ' + (r * Math.sin(a)));
          svg.querySelector('#compassArm').setAttribute('transform', 'rotate(' + progress * 360 + ')');
          frame = requestAnimationFrame(tick);
        }
        frame = requestAnimationFrame(tick);
      } else if(state.tool === 'ruler') {
        api.commit(Object.assign({}, style, { kind: 'shape', tool: 'line', start: rotatePoint(0, 0), end: rotatePoint(state.length * UNIT, 0) }));
      } else {
        api.commit(Object.assign({}, style, { kind: 'path', tool: 'pen', points: [rotatePoint(130, 0), rotatePoint(0, 0), rotatePoint(130 * Math.cos(state.angle * DEG), -130 * Math.sin(state.angle * DEG))] }));
      }
    }
    function point(event) {
      var rect = api.plane.getBoundingClientRect();
      return { x: (event.clientX - rect.left) / api.zoom(), y: (event.clientY - rect.top) / api.zoom() };
    }
    instrument.addEventListener('pointerdown', function (event) {
      var target = event.target.closest('[data-drag], [data-action="move"]');
      if(!target || drawing || drag || event.button > 0) return;
      event.preventDefault(); event.stopPropagation();
      var p = point(event);
      drag = { id: event.pointerId, action: target.dataset.drag || 'move', x: p.x, y: p.y, startX: state.x, startY: state.y, rotation: state.rotation, angle: Math.atan2(p.y - state.y, p.x - state.x) };
      instrument.setPointerCapture(event.pointerId);
    });
    instrument.addEventListener('pointermove', function (event) {
      if(!drag || drag.id !== event.pointerId) return;
      event.preventDefault();
      var p = point(event);
      if(drag.action === 'move') {
        state.x = clamp(drag.startX + p.x - drag.x, 0, api.plane.clientWidth / api.zoom());
        state.y = clamp(drag.startY + p.y - drag.y, 0, api.plane.clientHeight / api.zoom());
        transform(); return;
      }
      var angle = Math.atan2(p.y - state.y, p.x - state.x);
      if(drag.action === 'rotate') state.rotation = ((drag.rotation + (angle - drag.angle) / DEG + 540) % 360) - 180;
      if(drag.action === 'radius') {
        state.radius = Math.round(clamp(Math.hypot(p.x - state.x, p.y - state.y) / UNIT, .5, 8) * 10) / 10;
        state.rotation = angle / DEG;
      }
      if(drag.action === 'angle') {
        var relative = ((state.rotation - angle / DEG + 540) % 360) - 180;
        state.angle = clamp(relative === -180 ? 180 : relative, 0, 180);
      }
      scheduleRender();
    });
    function endDrag(event) {
      if(!drag || drag.id !== event.pointerId) return;
      drag = null;
      if(instrument.hasPointerCapture(event.pointerId)) instrument.releasePointerCapture(event.pointerId);
    }
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (name) { instrument.addEventListener(name, endDrag); });
    instrument.querySelector('[data-action="draw"]').addEventListener('click', draw);
    instrument.querySelector('[data-action="close"]').addEventListener('click', hide);
    instrument.querySelector('[data-action="move"]').addEventListener('keydown', function (event) {
      var delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      if(!delta || drawing) return;
      event.preventDefault(); event.stopPropagation();
      var step = event.shiftKey ? 10 : 1;
      state.x = clamp(state.x + delta[0] * step, 0, api.plane.clientWidth / api.zoom());
      state.y = clamp(state.y + delta[1] * step, 0, api.plane.clientHeight / api.zoom());
      transform();
    });
    tabs.forEach(function (tab) { tab.addEventListener('click', function () { show(tab.dataset.mathTool); }); });
    drawButton.addEventListener('click', draw);
    panel.querySelector('#mathHide').addEventListener('click', hide);
    panel.querySelector('#mathCenter').addEventListener('click', function () { if(!state.visible) show(state.tool); else { cancelAnimation(); center(); render(); } });
    function change(input, property, min, max) {
      var value = Number(input.value);
      if(!Number.isFinite(value)) { syncPanel(); return; }
      cancelAnimation(); state[property] = clamp(value, min, max); render(); syncPanel();
    }
    lengthInput.addEventListener('change', function () { change(lengthInput, state.tool === 'compass' ? 'radius' : 'length', state.tool === 'compass' ? .5 : 2, state.tool === 'compass' ? 8 : 20); });
    rotationInput.addEventListener('change', function () { change(rotationInput, 'rotation', -180, 180); });
    angleInput.addEventListener('change', function () { change(angleInput, 'angle', 0, 180); });
    panel.querySelectorAll('[name="mathCircleType"]').forEach(function (input) { input.addEventListener('change', function () { cancelAnimation(); state.filled = input.value === 'disk'; render(); }); });
    api.button.addEventListener('click', function () { api.togglePanel(panel); syncPanel(); });
    syncPanel();
    return { hide: hide, resize: function () { if(state.visible) { cancelAnimation(); render(); } } };
  };
})();
