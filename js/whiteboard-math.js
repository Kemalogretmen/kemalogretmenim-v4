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
    svg.style.maxWidth = 'none';
    var layer = null;
    var controls = instrument.querySelector('.math-instrument-controls');
    var rotationLabel = document.createElement('output');
    rotationLabel.className = 'math-rotation-label';
    rotationLabel.setAttribute('aria-label', 'Cetvel açısı');
    rotationLabel.hidden = true;
    instrument.appendChild(rotationLabel);
    var tabs = Array.from(panel.querySelectorAll('[data-math-tool]'));
    var lengthInput = panel.querySelector('#mathLength');
    var rotationInput = panel.querySelector('#mathRotation');
    var angleInput = panel.querySelector('#mathAngle');
    var drawButton = panel.querySelector('#mathDraw');
    var state = { tool: 'protractor', visible: false, x: 0, y: 0, rotation: 0, radius: 3, length: 10, angle: 60, filled: false, protractorSize: 150, arm1: 130, arm2: 130 };
    var drag = null;
    var frame = null;
    var renderFrame = null;
    var drawing = null;

    function node(name, attrs, text) {
      var el = document.createElementNS(NS, name);
      Object.keys(attrs || {}).forEach(function (key) { el.setAttribute(key, attrs[key]); });
      if(text !== undefined) el.textContent = text;
      (layer || svg).appendChild(el);
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
      return state.protractorSize;
    }
    function compassHeight() {
      var r = state.radius * UNIT;
      var leg = Math.max(150, r * .72);
      return Math.sqrt(leg * leg - r * r / 4);
    }
    function bounds() {
      if(state.tool === 'ruler') {
        // WebKit can miss pointer hits outside the SVG viewport, even with visible overflow.
        var a = state.rotation * DEG, c = Math.cos(a), s = Math.sin(a);
        var corners = [[-24, -60], [state.length * UNIT + 26, -60], [state.length * UNIT + 26, 56], [-24, 56]];
        var xs = corners.map(function(p) { return p[0] * c - p[1] * s; });
        var ys = corners.map(function(p) { return p[0] * s + p[1] * c; });
        var left = Math.floor(Math.min.apply(null, xs)), top = Math.floor(Math.min.apply(null, ys));
        return { left: left, top: top, width: Math.ceil(Math.max.apply(null, xs)) - left, height: Math.ceil(Math.max.apply(null, ys)) - top };
      }
      if(state.tool === 'protractor') {
        var outer = protractorRadius();
        var reach = Math.max(outer + 40, state.arm1 + 24, state.arm2 + 24);
        return { left: -reach, top: -reach, width: reach * 2, height: reach + 74, bottom: 64 };
      }
      var radius = state.radius * UNIT;
      var top = -Math.max(radius + 26, compassHeight() + 52);
      return { left: -radius - 26, top: top, width: 2 * radius + 52, height: radius + 26 - top, bottom: radius + 12 };
    }
    function transform() {
      var z = api.zoom();
      instrument.style.transform = 'translate(' + state.x * z + 'px,' + state.y * z + 'px) scale(' + z + ')';
      if(layer) layer.setAttribute('transform', 'rotate(' + state.rotation + ')');
      rotationLabel.hidden = state.tool !== 'ruler';
      if(state.tool === 'ruler') {
        var labelPoint = rotatePoint(state.length * UNIT / 2, -38);
        rotationLabel.style.left = (labelPoint.x - state.x) + 'px';
        rotationLabel.style.top = (labelPoint.y - state.y) + 'px';
        rotationLabel.textContent = Math.round(state.rotation) + '°';
      }
    }
    function positionControls() {
      var points = [];
      function box(x, y, radius) { [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(function(c) { points.push(rotatePoint(x + c[0] * radius, y + c[1] * radius)); }); }
      if(state.tool === 'compass') {
        points.push({ x: state.x - state.radius * UNIT, y: state.y + state.radius * UNIT }, { x: state.x + state.radius * UNIT, y: state.y + state.radius * UNIT });
        box(state.radius * UNIT / 2, -compassHeight() - 18, 24);
      } else if(state.tool === 'ruler') {
        box(0, 22, 26); box(state.length * UNIT, 22, 26); box(state.length * UNIT, -30, 22);
      } else {
        var outer = protractorRadius();
        for(var a = 0; a <= 180; a += 15) box(outer * Math.cos(a * DEG), -outer * Math.sin(a * DEG), 2);
        box(-outer - 18, 24, 22); box(state.arm1, 0, 22);
        box(state.arm2 * Math.cos(state.angle * DEG), -state.arm2 * Math.sin(state.angle * DEG), 22);
        box(0, 38, 12);
      }
      controls.style.top = (Math.max.apply(null, points.map(function(p) { return p.y; })) - state.y + 12) + 'px';
      controls.style.left = ((Math.min.apply(null, points.map(function(p) { return p.x; })) + Math.max.apply(null, points.map(function(p) { return p.x; }))) / 2 - state.x) + 'px';
    }
    function syncPanel() {
      tabs.forEach(function (tab) { tab.setAttribute('aria-pressed', String(tab.dataset.mathTool === state.tool)); });
      panel.querySelector('#mathLengthField').hidden = state.tool === 'protractor';
      panel.querySelector('#mathLengthLabel').textContent = state.tool === 'compass' ? 'Yarıçap (birim)' : 'Uzunluk (birim)';
      lengthInput.max = state.tool === 'compass' ? '8' : '20';
      lengthInput.min = state.tool === 'compass' ? '0.5' : '2';
      lengthInput.value = Math.round((state.tool === 'compass' ? state.radius : state.length) * 100) / 100;
      rotationInput.value = Math.round(state.rotation);
      angleInput.value = Math.round(state.angle);
      panel.querySelector('#mathAngleField').hidden = state.tool !== 'protractor';
      ['mathProtractorSize', 'mathArm1', 'mathArm2'].forEach(function(id) { panel.querySelector('#' + id + 'Field').hidden = state.tool !== 'protractor'; });
      panel.querySelector('#mathProtractorSize').value = Math.round(state.protractorSize / 150 * 100);
      panel.querySelector('#mathArm1').value = Math.round(state.arm1 / UNIT * 10) / 10;
      panel.querySelector('#mathArm2').value = Math.round(state.arm2 / UNIT * 10) / 10;
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
      svg.setAttribute('width', b.width); svg.setAttribute('height', b.height);
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('viewBox', [b.left, b.top, b.width, b.height].join(' '));
      svg.replaceChildren();
      layer = null;
      layer = node('g', { id: 'mathGeometry' });
      if(state.tool === 'ruler') {
        var width = state.length * UNIT;
        node('rect', { x: -12, y: -2, width: width + 24, height: 48, rx: 4, fill: '#e4f5f9', 'fill-opacity': .78, stroke: '#638999', 'data-drag': 'move' });
        for(var i = 0; i <= Math.round(state.length * 10); i++) {
          var x = i * UNIT / 10;
          line(x, 0, x, i % 10 === 0 ? 19 : i % 5 === 0 ? 13 : 7);
          if(i % 10 === 0) node('text', { x: x, y: 33, 'text-anchor': 'middle' }, i / 10);
        }
        handle(width, -30, 'rotate', 'Cetveli döndür');
        handle(width, 32, 'length', 'Cetvel uzunluğunu ayarla');
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
        line(0, 0, state.arm1, 0, { stroke: '#6c3ded', 'stroke-width': 3, 'data-ray': 'first' });
        line(0, -12, 0, 12);
        var angle = state.angle * DEG;
        var rayX = state.arm2 * Math.cos(angle), rayY = -state.arm2 * Math.sin(angle);
        line(0, 0, rayX, rayY, { stroke: '#db6244', 'stroke-width': 3, 'data-ray': 'second' });
        line(0, 0, state.arm1, 0, { class: 'instrument-hit', 'data-drag': 'arm1' });
        line(0, 0, rayX, rayY, { class: 'instrument-hit', 'data-drag': 'arm2' });
        handle(state.arm1, 0, 'arm1', 'Birinci açı kolunu ayarla');
        handle(rayX, rayY, 'arm2', 'İkinci açı kolunu ayarla');
        handle(-outer - 18, 24, 'resize', 'İletkiyi büyüt / küçült');
        node('text', { x: 0, y: 38, 'text-anchor': 'middle' }, Math.round(state.angle) + '°');
      } else {
        var radius = state.radius * UNIT;
        node('circle', { cx: 0, cy: 0, r: radius, fill: state.filled ? api.color() : 'none', 'fill-opacity': .08, stroke: '#8396a6', 'stroke-width': 1, 'stroke-dasharray': '5 5', 'data-compass-circle': '' });
        node('path', { id: 'compassTrace', fill: 'none', stroke: api.color(), 'stroke-width': api.size(), 'stroke-linecap': 'round' });
        var arm = node('g', { id: 'compassArm' });
        var top = -compassHeight();
        var defs = node('defs', {});
        var metal = node('linearGradient', { id: 'mathCompassMetal' });
        [['0%', '#61717e'], ['30%', '#e6edf1'], ['52%', '#ffffff'], ['70%', '#a4b4c0'], ['100%', '#536471']].forEach(function(stop) { metal.appendChild(node('stop', { offset: stop[0], 'stop-color': stop[1] })); });
        defs.appendChild(metal);
        function leg(foot, pencil) {
          var len = Math.hypot(radius / 2 - foot, top);
          var rotation = Math.atan2(top, radius / 2 - foot) / DEG + 90;
          var group = node('g', { transform: 'translate(' + foot + ',0) rotate(' + rotation + ')' });
          var action = pencil ? 'radius' : 'needle';
          group.appendChild(node('path', { d: 'M-6 ' + (-len + 10) + ' L-4 -24 L0 0 L4 -24 L6 ' + (-len + 10) + ' Z', fill: 'url(#mathCompassMetal)', stroke: '#526473', 'stroke-width': 1, 'data-drag': action }));
          if(pencil) {
            group.appendChild(node('path', { d: 'M-6 -78 L6 -78 L6 -16 L0 0 L-6 -16 Z', fill: '#bd8b50', stroke: '#49566b', 'stroke-width': 1 }));
            group.appendChild(node('rect', { x: -6, y: -78, width: 12, height: 60, rx: 2, fill: '#315b85' }));
            group.appendChild(line(-2, -75, -2, -21, { stroke: '#93b4d1', 'stroke-width': 2 }));
            group.appendChild(node('path', { d: 'M-2 -6 L0 0 L2 -6 Z', fill: '#222b35' }));
            group.appendChild(node('rect', { x: -9, y: -53, width: 18, height: 13, rx: 3, fill: 'url(#mathCompassMetal)', stroke: '#526473' }));
            group.appendChild(node('circle', { cx: 8, cy: -46, r: 4, fill: '#677787', stroke: '#354452' }));
          }
          group.appendChild(line(0, 0, 0, -len + 8, { class: 'instrument-hit', 'data-drag': action }));
          arm.appendChild(group);
        }
        leg(0, false); leg(radius, true);
        arm.appendChild(node('rect', { x: radius / 2 - 8, y: top - 35, width: 16, height: 28, rx: 5, fill: '#344d63', stroke: '#1f3447', 'data-drag': 'move' }));
        arm.appendChild(node('circle', { cx: radius / 2, cy: top, r: 13, fill: 'url(#mathCompassMetal)', stroke: '#43546b', 'stroke-width': 2, 'data-drag': 'move' }));
        arm.appendChild(node('circle', { cx: radius / 2, cy: top, r: 5, fill: '#71818d', 'pointer-events': 'none' }));
        arm.appendChild(line(radius / 2 - 3, top, radius / 2 + 3, top, { stroke: '#edf4f7', 'stroke-width': 2, 'pointer-events': 'none' }));
        arm.appendChild(handle(radius, 0, 'radius', 'Kalem bacağını tutup aç / kapat'));
        handle(0, 0, 'needle', 'İğneli bacağı tutup aç / kapat');
        node('text', { x: radius / 2, y: 30, 'text-anchor': 'middle' }, Math.round(state.radius * 100) / 100 + ' birim');
      }
      positionControls();
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
      if(fit && state.tool === 'protractor') {
        state.protractorSize = Math.max(75, Math.min(150, (width / z - 68) / 2));
        state.arm1 = state.arm2 = Math.min(130, state.protractorSize);
      }
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
        api.commit(Object.assign({}, style, { kind: 'path', tool: 'pen', points: [rotatePoint(state.arm1, 0), rotatePoint(0, 0), rotatePoint(state.arm2 * Math.cos(state.angle * DEG), -state.arm2 * Math.sin(state.angle * DEG))] }));
      }
    }
    function point(event) {
      if(api.toBoardPoint) return api.toBoardPoint(event);
      var rect = api.plane.getBoundingClientRect();
      return { x: (event.clientX - rect.left) / api.zoom(), y: (event.clientY - rect.top) / api.zoom() };
    }
    instrument.addEventListener('pointerdown', function (event) {
      var target = event.target.closest('[data-drag], [data-action="move"]');
      if(!target || drawing || drag || event.button > 0) return;
      event.preventDefault(); event.stopPropagation();
      var p = point(event);
      var action = target.dataset.drag || 'move';
      var tip = action === 'radius' ? rotatePoint(state.radius * UNIT, 0) : action === 'arm1' ? rotatePoint(state.arm1, 0) : action === 'arm2' ? rotatePoint(state.arm2 * Math.cos(state.angle * DEG), -state.arm2 * Math.sin(state.angle * DEG)) : { x: state.x, y: state.y };
      drag = { id: event.pointerId, action: action, x: p.x, y: p.y, startX: state.x, startY: state.y, rotation: state.rotation, angle: Math.atan2(p.y - state.y, p.x - state.x), offsetX: tip.x - p.x, offsetY: tip.y - p.y, pencil: rotatePoint(state.radius * UNIT, 0), secondAngle: state.rotation - state.angle, size: state.protractorSize, distance: Math.max(1, Math.hypot(p.x - state.x, p.y - state.y)) };
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
      var tipX = p.x + drag.offsetX, tipY = p.y + drag.offsetY;
      var angle = Math.atan2(p.y - state.y, p.x - state.x);
      if(drag.action === 'rotate') state.rotation = ((drag.rotation + (angle - drag.angle) / DEG + 540) % 360) - 180;
      if(drag.action === 'radius') {
        state.radius = clamp(Math.hypot(tipX - state.x, tipY - state.y) / UNIT, .5, 8);
        state.rotation = Math.atan2(tipY - state.y, tipX - state.x) / DEG;
      }
      if(drag.action === 'needle') {
        var dx = drag.pencil.x - tipX, dy = drag.pencil.y - tipY;
        var distance = Math.hypot(dx, dy);
        state.radius = clamp(distance / UNIT, .5, 8);
        state.rotation = Math.atan2(dy, dx) / DEG;
        state.x = drag.pencil.x - state.radius * UNIT * Math.cos(state.rotation * DEG);
        state.y = drag.pencil.y - state.radius * UNIT * Math.sin(state.rotation * DEG);
      }
      if(drag.action === 'arm1' || drag.action === 'arm2') {
        var direction = Math.atan2(tipY - state.y, tipX - state.x) / DEG;
        state[drag.action] = clamp(Math.hypot(tipX - state.x, tipY - state.y), UNIT, UNIT * 15);
        if(drag.action === 'arm1') {
          state.rotation = direction;
          state.angle = clamp((direction - drag.secondAngle + 360) % 360, 0, 180);
        } else state.angle = clamp((state.rotation - direction + 360) % 360, 0, 180);
      }
      if(drag.action === 'resize') state.protractorSize = clamp(drag.size * Math.hypot(p.x - state.x, p.y - state.y) / drag.distance, 75, 300);
      if(drag.action === 'length') {
        var x = (p.x - state.x) * Math.cos(state.rotation * DEG) + (p.y - state.y) * Math.sin(state.rotation * DEG);
        state.length = clamp(x / UNIT, 2, 20);
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
    panel.querySelector('#mathProtractorSize').addEventListener('change', function(event) { var input = event.target; input.value = Number(input.value) * 1.5; change(input, 'protractorSize', 75, 300); });
    ['mathArm1', 'mathArm2'].forEach(function(id, index) { panel.querySelector('#' + id).addEventListener('change', function(event) { var input = event.target; input.value = Number(input.value) * UNIT; change(input, index ? 'arm2' : 'arm1', UNIT, UNIT * 15); }); });
    panel.querySelectorAll('[name="mathCircleType"]').forEach(function (input) { input.addEventListener('change', function () { cancelAnimation(); state.filled = input.value === 'disk'; render(); }); });
    api.button.addEventListener('click', function () { api.togglePanel(panel); syncPanel(); });
    syncPanel();
    return { hide: hide, resize: function () { if(state.visible) { cancelAnimation(); render(); } } };
  };
})();
