/* Exact plane reflections for the symmetry studio.
 * Board coordinates: x grows right, y grows down. Axis angles are DEGREES,
 * measured counterclockwise: 0 = horizontal, 90 = vertical, +45 rises right.
 * An axis is {x, y, angle}; its anchor is any point on the infinite line.
 */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ReflectionGeometry = api;
})(typeof window === 'undefined' ? globalThis : window, function() {
  'use strict';
  const EPSILON = 1e-10;
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const point = value => ({ x: finite(value?.x), y: finite(value?.y) });
  function normalizeAngle(value) {
    const angle = finite(value);
    const normalized = ((angle + 180) % 360 + 360) % 360 - 180;
    return Object.is(normalized, -0) ? 0 : normalized;
  }
  function normalizeAxis(value = {}) {
    const source = value && typeof value === 'object' ? value : {};
    const anchor = point(source), angle = normalizeAngle(finite(source.angle, 90));
    const radians = angle * Math.PI / 180;
    const clean = value => Math.abs(value) < EPSILON ? 0 : Math.abs(Math.abs(value) - 1) < EPSILON ? Math.sign(value) : value;
    const dx = clean(Math.cos(radians)), dy = clean(-Math.sin(radians));
    return { x: anchor.x, y: anchor.y, angle, dx, dy, nx: -dy, ny: dx };
  }
  function signedDistance(value, axis) {
    const p = point(value), a = normalizeAxis(axis);
    return (p.x - a.x) * a.nx + (p.y - a.y) * a.ny;
  }
  function projectPoint(value, axis) {
    const p = point(value), a = normalizeAxis(axis);
    const distance = (p.x - a.x) * a.nx + (p.y - a.y) * a.ny;
    return { x: p.x - distance * a.nx, y: p.y - distance * a.ny };
  }
  function reflectPoint(value, axis) {
    const p = point(value), a = normalizeAxis(axis);
    const distance = (p.x - a.x) * a.nx + (p.y - a.y) * a.ny;
    return { x: p.x - 2 * distance * a.nx, y: p.y - 2 * distance * a.ny };
  }
  function reflectPoints(values, axis) {
    return Array.isArray(values) ? values.map(value => reflectPoint(value, axis)) : [];
  }
  function reflectCircle(value = {}, axis) {
    const circle = value && typeof value === 'object' ? value : {};
    return { ...circle, ...reflectPoint(circle, axis), r: Math.max(0, finite(circle.r)) };
  }
  // SVG and Canvas use the same affine matrix convention:
  // x' = a*x + c*y + e; y' = b*x + d*y + f.
  // Determinant -1 reverses handedness, so paths and text mirror correctly.
  function reflectionMatrix(axis) {
    const line = normalizeAxis(axis), a = 1 - 2 * line.nx * line.nx;
    const b = -2 * line.nx * line.ny, d = 1 - 2 * line.ny * line.ny;
    return { a, b, c: b, d,
      e: line.x - a * line.x - b * line.y,
      f: line.y - b * line.x - d * line.y };
  }
  function applyMatrix(value, matrix) {
    const p = point(value), m = matrix || {};
    return { x: finite(m.a, 1) * p.x + finite(m.c) * p.y + finite(m.e),
      y: finite(m.b) * p.x + finite(m.d, 1) * p.y + finite(m.f) };
  }
  function matrixString(matrix) {
    const m = matrix || {};
    return `matrix(${[finite(m.a, 1), finite(m.b), finite(m.c), finite(m.d, 1), finite(m.e), finite(m.f)].map(value => Math.abs(value) < EPSILON ? 0 : value).join(' ')})`;
  }
  // composeMatrices(left, right) applies right first, then left.
  function composeMatrices(left, right) {
    const l = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, ...left };
    const r = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, ...right };
    return { a: l.a*r.a + l.c*r.b, b: l.b*r.a + l.d*r.b,
      c: l.a*r.c + l.c*r.d, d: l.b*r.c + l.d*r.d,
      e: l.a*r.e + l.c*r.f + l.e, f: l.b*r.e + l.d*r.f + l.f };
  }
  function axisFromPoints(first, second) {
    const a = point(first), b = point(second), dx = b.x - a.x, dy = b.y - a.y;
    if (Math.hypot(dx, dy) < EPSILON) return null;
    return { x: a.x, y: a.y, angle: normalizeAngle(-Math.atan2(dy, dx) * 180 / Math.PI) };
  }
  function axisLineEndpoints(axis, rect) {
    if (!rect) return null;
    const left = finite(rect.x, finite(rect.left)), top = finite(rect.y, finite(rect.top));
    const right = finite(rect.right, left + finite(rect.width)), bottom = finite(rect.bottom, top + finite(rect.height));
    if (!(right > left && bottom > top)) return null;
    const a = normalizeAxis(axis);
    let low = -Infinity, high = Infinity;
    for (const [origin, direction, min, max] of [[a.x, a.dx, left, right], [a.y, a.dy, top, bottom]]) {
      if (Math.abs(direction) < EPSILON) { if (origin < min - EPSILON || origin > max + EPSILON) return null; continue; }
      const one = (min - origin) / direction, two = (max - origin) / direction;
      low = Math.max(low, Math.min(one, two)); high = Math.min(high, Math.max(one, two));
      if (low > high + EPSILON) return null;
    }
    // Clamp tiny rounding error to the visible rectangle, including corner hits.
    const at = t => ({ x: Math.max(left, Math.min(right, a.x + t * a.dx)), y: Math.max(top, Math.min(bottom, a.y + t * a.dy)) });
    return [at(low), at(high)];
  }
  function distance(first, second) {
    const a = point(first), b = point(second); return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function rotatePoint(value, center, angle) {
    const p = point(value), c = point(center), radians = normalizeAngle(angle) * Math.PI / 180;
    const x = p.x - c.x, y = p.y - c.y, cos = Math.cos(radians), sin = Math.sin(radians);
    return { x: c.x + x * cos + y * sin, y: c.y - x * sin + y * cos };
  }
  function reflectAngle(angle, axis) { return normalizeAngle(2 * normalizeAxis(axis).angle - finite(angle)); }
  function distanceToSegment(value, first, second) {
    const p = point(value), a = point(first), b = point(second), dx = b.x - a.x, dy = b.y - a.y;
    const length2 = dx * dx + dy * dy;
    if (length2 < EPSILON * EPSILON) return distance(p, a);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2));
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  }
  function pointInPolygon(value, vertices, tolerance = 1e-8) {
    if (!Array.isArray(vertices) || vertices.length < 3) return false;
    const p = point(value), points = vertices.map(point);
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[j], b = points[i];
      if (distanceToSegment(p, a, b) <= Math.max(0, finite(tolerance))) return true;
      if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }
  function signedArea(vertices) {
    if (!Array.isArray(vertices) || vertices.length < 3) return 0;
    const points = vertices.map(point), origin = points[0];
    let area2 = 0;
    for (let i = 1; i + 1 < points.length; i++) area2 += (points[i].x-origin.x)*(points[i+1].y-origin.y) - (points[i].y-origin.y)*(points[i+1].x-origin.x);
    return area2 / 2;
  }
  function bounds(vertices) {
    const points = Array.isArray(vertices) ? vertices.map(point) : [];
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    const x = points.length ? Math.min(...xs) : 0, y = points.length ? Math.min(...ys) : 0;
    const right = points.length ? Math.max(...xs) : 0, bottom = points.length ? Math.max(...ys) : 0;
    return { x, y, width: right-x, height: bottom-y, left:x, top:y, right, bottom, cx:(x+right)/2, cy:(y+bottom)/2 };
  }
  return Object.freeze({ EPSILON, normalizeAngle, normalizeAxis, signedDistance,
    projectPoint, reflectPoint, reflectPoints, reflectCircle, reflectionMatrix,
    applyMatrix, matrixString, composeMatrices, axisFromPoints, axisLineEndpoints,
    clipLine: axisLineEndpoints, distance, rotatePoint, reflectAngle,
    distanceToSegment, pointInPolygon, signedArea, bounds });
});
