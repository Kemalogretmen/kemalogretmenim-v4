const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'ogretmen/hucre-laboratuvari.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'js/hucre-laboratuvari.js'), 'utf8');

function lab(three) {
  const { document } = parseHTML(html);
  const listeners = new Map();
  const timeouts = [];
  const frames = [];
  const storage = new Map();
  const drawing = new Proxy({}, {
    get: (target, key) => target[key] || (() => ({ addColorStop() {} })),
  });
  for (const canvas of document.querySelectorAll('canvas')) {
    canvas.getContext = () => drawing;
    canvas.toDataURL = () => 'data:image/png;base64,test';
  }
  const context = vm.createContext({
    document, console,
    window: {
      devicePixelRatio: 1,
      addEventListener(name, fn) {
        if (!listeners.has(name)) listeners.set(name, []);
        listeners.get(name).push(fn);
      },
    },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    setTimeout: fn => timeouts.push(fn), clearTimeout() {},
    setInterval: () => 1, clearInterval() {},
    requestAnimationFrame: fn => frames.push(fn),
    confirm: () => true,
    Image: class {},
    alert: message => { throw new Error(message); },
    ...(three ? { THREE: three } : {}),
  });
  vm.runInContext(source, context, { filename: 'hucre-laboratuvari.js' });
  return {
    document, storage, frames,
    run: code => vm.runInContext(code, context),
    start: () => listeners.get('DOMContentLoaded').forEach(fn => fn()),
    flushTimeouts: () => { while (timeouts.length) timeouts.shift()(); },
  };
}

function unavailableWebGL() {
  return {
    Vector3: class { constructor(x, y, z) { Object.assign(this, { x, y, z }); } },
    Scene: class {},
    PerspectiveCamera: class {
      constructor() { this.position = { set() {} }; }
      lookAt() {}
    },
    WebGLRenderer: class { constructor() { throw new Error('WebGL context unavailable'); } },
  };
}

for (const [scenario, three] of [['missing CDN script', undefined], ['unavailable WebGL', unavailableWebGL()]]) {
  test(`${scenario}: independent 2D content and assessments initialize and remain usable`, () => {
    const h = lab(three);
    const d = h.document;
    assert.doesNotThrow(h.start);
    assert.equal(d.querySelectorAll('.cell-lab-fallback[role="status"]').length, 3);
    assert.equal(d.getElementById('micView3DBtn').disabled, true);
    assert.equal(d.getElementById('btnDim3D').disabled, true);
    assert.equal(d.getElementById('btnCellSpin').disabled, true);
    assert.equal(d.getElementById('popupSpinBtn').disabled, true);
    assert.equal(d.getElementById('btnDim2D').disabled, false);
    assert.equal(d.getElementById('mstep-1').disabled, true);
    assert.equal(d.getElementById('mstep-5').disabled, false);
    assert.equal(d.getElementById('mstep-6').disabled, false);
    assert.equal(d.getElementById('eyepieceHud').classList.contains('active'), true);
    assert.equal(d.getElementById('micStatusBanner').hidden, true);
    assert.match(d.getElementById('mod-cell').textContent, /3B hücre modeli açılamadı/);
    assert.ok(d.querySelector('#micPartsChips button'));
    assert.ok(d.querySelector('#organellesList button'));
    assert.ok(d.querySelector('#cell2DContainer img'));
    h.run("switchModule('cell'); setCellType('compare'); setCellDimension('3d'); stepCellZoom(15); toggleCellLabels();");
    assert.equal(d.getElementById('cell2DContainer').classList.contains('active'), true);
    assert.equal(d.querySelectorAll('#cell2DContainer img').length, 2);
    h.run("openOrganellePopup('mitokondri');");
    assert.doesNotThrow(h.flushTimeouts);
    assert.equal(d.getElementById('organelleModalBackdrop').classList.contains('open'), true);
    assert.match(d.getElementById('popupTitle').textContent, /Mitokondri/);
    assert.match(d.getElementById('popupFolderImg').src, /mitokondri/);
    h.run('closeOrganellePopup(); resetMicroscopeSim(); jumpToMicroscopeStep(1); resetMicroscopeCamera(); resetCellCamera();');
    h.run("switchModule('hierarchy'); setHierarchyPath('plant'); nextHierarchyStage();");
    h.flushTimeouts();
    assert.match(d.getElementById('hStageTitle').textContent, /Doku/);
    assert.equal(d.querySelectorAll('#orderPool button').length, 5);
    h.run("switchModule('evaluation');");
    assert.ok(d.querySelector('#fillQuestionsList .blank-slot'));
    h.run(`TF_DATA.forEach((item, index) => selectTFChoice(index, item.ans,
      document.querySelector('#tfgrp-' + index + ' [data-val="' + item.ans + '"]'))); checkTFGame();`);
    assert.equal(d.querySelectorAll('#tfList .checked-ok').length, 12);
    assert.ok(d.querySelector('#examCardsGrid button'));
    d.getElementById('stuNameInput').value = 'Test Student';
    h.run('startUnitExam(0); selectExamOption(0); finishUnitExam(false);');
    assert.equal(d.getElementById('examKarneView').style.display, 'flex');
    assert.equal(Object.keys(JSON.parse(h.storage.get('fenLabCompletedExams'))).length, 1);
    assert.doesNotThrow(h.flushTimeouts);
  });
}

function stubViews(h, failure) {
  h.run(`
    globalThis.disposals = 0;
    function stubView(name, holderId) {
      const renderer = { dispose() { disposals++; }, render() {}, setSize() {} };
      const camera = { position: {}, updateProjectionMatrix() {} };
      document.getElementById(holderId).appendChild(document.createElement('canvas'));
      if (name === 'microscope') { micRenderer = renderer; micCamera = camera; micScene = {}; }
      if (name === 'cell') { cellRenderer = renderer; cellCamera = camera; cellScene = {}; }
      if (name === 'popup') { popupRenderer = renderer; popupCamera = camera; popupScene = {}; }
      if (name === ${JSON.stringify(failure)}) throw new Error('Partial initialization failure');
    }
    initMicroscope3D = () => stubView('microscope', 'microscopeCanvasHolder');
    initCellLab3D = () => stubView('cell', 'cellCanvasHolder');
    initPopup3DViewer = () => stubView('popup', 'popup3DHolder');
    updateMicroscopeLabels2D = () => {};
  `);
}

for (const failure of ['microscope', 'cell', 'popup']) {
  test(`${failure}: partial 3D failure is cleaned up without disabling other views`, () => {
    const h = lab({});
    stubViews(h, failure);
    assert.doesNotThrow(h.start);
    assert.equal(h.run('disposals'), 1);
    assert.equal(h.document.querySelectorAll('.cell-lab-fallback').length, 1);
    for (const [name, holderId, buttonId] of [
      ['microscope', 'microscopeCanvasHolder', 'micView3DBtn'],
      ['cell', 'cellCanvasHolder', 'btnDim3D'],
      ['popup', 'popup3DHolder', 'popupSpinBtn'],
    ]) {
      assert.equal(h.document.getElementById(buttonId).disabled, name === failure);
      assert.equal(h.document.querySelectorAll('#' + holderId + ' canvas').length, name === failure ? 0 : 1);
    }
    assert.ok(h.document.querySelector('#examCardsGrid button'));
  });
}

test('successful 3D startup retains normal controls and independently built 2D content', () => {
  const h = lab({});
  stubViews(h, 'none');
  h.start();
  assert.equal(h.document.querySelectorAll('.cell-lab-fallback').length, 0);
  assert.equal(h.document.getElementById('btnDim3D').classList.contains('active'), true);
  assert.equal(h.document.getElementById('btnDim3D').disabled, false);
  assert.ok(h.document.querySelector('#cell2DContainer img'));
  assert.ok(h.document.querySelector('#organellesList button'));
  assert.equal(h.frames.length, 1);
});
