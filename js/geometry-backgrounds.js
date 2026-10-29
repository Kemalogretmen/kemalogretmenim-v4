/* Geometry paper and 3D floors share the same choices and isolated preferences.
   A background never participates in selection, collision or cube raycasting. */
(() => {
  'use strict';
  const types = Object.freeze([
    { id: 'square', label: 'Kareli' },
    { id: 'isometric', label: 'İzometrik' },
    { id: 'dots', label: 'Noktalı' },
    { id: 'ruled', label: 'Çizgili' },
    { id: 'plain', label: 'Boş' }
  ].map(Object.freeze));
  const ids = new Set(types.map(type => type.id));
  const defaults = { builder3d: 'square', builder2d: 'square', nets: 'plain', cubes: 'dots' };
  const preferences = new Map(), consumers = new Map();
  const key = workspace => `geometry-background:${workspace}:v1`;
  function get(workspace, fallback) {
    const initial = ids.has(fallback) ? fallback : (defaults[workspace] || 'plain');
    if (!Object.prototype.hasOwnProperty.call(defaults, workspace)) return ids.has(initial) ? initial : 'plain';
    if (preferences.has(workspace)) return preferences.get(workspace);
    let stored;
    try { stored = window.localStorage.getItem(key(workspace)); } catch (_) { /* Private/offline sessions still work. */ }
    const value = ids.has(stored) ? stored : initial;
    preferences.set(workspace, value); return value;
  }
  function set(workspace, type) {
    if (!Object.prototype.hasOwnProperty.call(defaults, workspace) || !ids.has(type)) return false;
    const changed = get(workspace) !== type;
    preferences.set(workspace, type);
    try { window.localStorage.setItem(key(workspace), type); } catch (_) {}
    if (changed) {
      consumers.get(workspace)?.forEach(callback => callback(type));
      window.dispatchEvent(new window.CustomEvent('geometry-background-change', { detail: { workspace, type } }));
    }
    return true;
  }
  function register(workspace, callback, fallback) {
    if (!Object.prototype.hasOwnProperty.call(defaults, workspace) || typeof callback !== 'function') return () => {};
    if (!consumers.has(workspace)) consumers.set(workspace, new Set());
    const callbacks = consumers.get(workspace); callbacks.add(callback);
    callback(get(workspace, fallback));
    return () => callbacks.delete(callback);
  }
  function pattern(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = type === 'isometric' ? 148 : 256;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#a1b2c9'; ctx.lineWidth = 4;
    ctx.beginPath();
    if (type === 'square') {
      ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.moveTo(0, 0); ctx.lineTo(0, h);
      ctx.moveTo(0, h); ctx.lineTo(w, h); ctx.moveTo(w, 0); ctx.lineTo(w, h);
    } else if (type === 'isometric') {
      for (const x of [0, w / 2, w]) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      ctx.moveTo(0, 0); ctx.lineTo(w, h); ctx.moveTo(0, h); ctx.lineTo(w, 0);
    } else if (type === 'ruled') {
      ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.moveTo(0, h); ctx.lineTo(w, h);
    }
    ctx.stroke();
    if (type === 'dots') {
      ctx.fillStyle = '#91a5c0'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 8, 0, Math.PI * 2); ctx.fill();
    }
    return canvas;
  }
  function createGround(THREE, scene, options = {}) {
    const size = Number.isFinite(options.size) && options.size > 0 ? options.size : 2000;
    const step = Number.isFinite(options.step) && options.step > 0 ? options.step : 50;
    const geometry = new THREE.PlaneGeometry(size, size);
    geometry.rotateX(-Math.PI / 2);
    const GroundMaterial = THREE.MeshStandardMaterial || THREE.MeshLambertMaterial;
    const material = new GroundMaterial({ color: options.color ?? 0xffffff, emissive: options.color ?? 0xffffff, emissiveIntensity: 0.75, roughness: 1, metalness: 0 });
    // A lightly emissive paper surface keeps fine guides readable under the
    // workshops' different lights while its diffuse component receives shadows.
    material.color?.multiplyScalar?.(0.1);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = Number.isFinite(options.y) ? options.y : -0.5;
    mesh.receiveShadow = true; mesh.userData.isGeometryBackground = true;
    scene.add(mesh);
    let current = null, texture = null, disposed = false;
    function setType(type) {
      if (disposed || !ids.has(type) || current === type) return;
      const previous = texture;
      texture = type === 'plain' ? null : new THREE.CanvasTexture(pattern(type));
      if (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        const columns = size / step;
        const rows = type === 'isometric' ? columns * texture.image.width / texture.image.height : columns;
        texture.repeat.set(columns, rows);
        texture.anisotropy = 2;
      }
      material.map = texture; material.emissiveMap = texture; material.needsUpdate = true; current = type;
      previous?.dispose();
    }
    setType('plain');
    return {
      objects: [mesh],
      set: setType,
      get type() { return current; },
      dispose() {
        if (disposed) return; disposed = true;
        scene.remove(mesh); texture?.dispose(); geometry.dispose(); material.dispose();
      }
    };
  }
  window.GeometryBackgrounds = Object.freeze({ types, get, set, register, createGround });
})();
