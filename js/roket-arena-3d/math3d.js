// math3d.js — Column-major WebGL2 3D Math, Matrix Operations & 3D Raycasting Utilities

const Math3D = (() => {
  const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function lerpAngle(a, b, t) {
    return a + wrapAngle(b - a) * t;
  }

  const Vec3 = {
    create: (x = 0, y = 0, z = 0) => [x, y, z],
    clone: (a) => [a[0], a[1], a[2]],
    set: (out, x, y, z) => { out[0] = x; out[1] = y; out[2] = z; return out; },
    add: (out, a, b) => { out[0] = a[0] + b[0]; out[1] = a[1] + b[1]; out[2] = a[2] + b[2]; return out; },
    sub: (out, a, b) => { out[0] = a[0] - b[0]; out[1] = a[1] - b[1]; out[2] = a[2] - b[2]; return out; },
    scale: (out, a, s) => { out[0] = a[0] * s; out[1] = a[1] * s; out[2] = a[2] * s; return out; },
    addScaled: (out, a, b, s) => {
      out[0] = a[0] + b[0] * s;
      out[1] = a[1] + b[1] * s;
      out[2] = a[2] + b[2] * s;
      return out;
    },
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (out, a, b) => {
      const ax = a[0], ay = a[1], az = a[2];
      const bx = b[0], by = b[1], bz = b[2];
      out[0] = ay * bz - az * by;
      out[1] = az * bx - ax * bz;
      out[2] = ax * by - ay * bx;
      return out;
    },
    lenSq: (a) => a[0] * a[0] + a[1] * a[1] + a[2] * a[2],
    len: (a) => Math.hypot(a[0], a[1], a[2]),
    dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
    distSq: (a, b) => {
      const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
      return dx * dx + dy * dy + dz * dz;
    },
    normalize: (out, a) => {
      const l = Math.hypot(a[0], a[1], a[2]);
      if (l > 1e-6) {
        out[0] = a[0] / l;
        out[1] = a[1] / l;
        out[2] = a[2] / l;
      } else {
        out[0] = 0; out[1] = 0; out[2] = 1;
      }
      return out;
    },
    lerp: (out, a, b, t) => {
      out[0] = a[0] + (b[0] - a[0]) * t;
      out[1] = a[1] + (b[1] - a[1]) * t;
      out[2] = a[2] + (b[2] - a[2]) * t;
      return out;
    },
  };

  const Mat4 = {
    create: () => {
      const m = new Float32Array(16);
      m[0] = m[5] = m[10] = m[15] = 1;
      return m;
    },
    identity: (out) => {
      out.fill(0);
      out[0] = out[5] = out[10] = out[15] = 1;
      return out;
    },
    multiply: (out, a, b) => {
      const t = new Float32Array(16);
      for (let c = 0; c < 4; c++) {
        const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
        t[c * 4 + 0] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
        t[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
        t[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
        t[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
      }
      out.set(t);
      return out;
    },
    perspective: (out, fovyRad, aspect, near, far) => {
      const f = 1.0 / Math.tan(fovyRad * 0.5);
      const nf = 1.0 / (near - far);
      out.fill(0);
      out[0] = f / aspect;
      out[5] = f;
      out[10] = (far + near) * nf;
      out[11] = -1;
      out[14] = 2 * far * near * nf;
      return out;
    },
    ortho: (out, left, right, bottom, top, near, far) => {
      const lr = 1 / (left - right);
      const bt = 1 / (bottom - top);
      const nf = 1 / (near - far);
      out.fill(0);
      out[0] = -2 * lr;
      out[5] = -2 * bt;
      out[10] = 2 * nf;
      out[12] = (left + right) * lr;
      out[13] = (top + bottom) * bt;
      out[14] = (far + near) * nf;
      out[15] = 1;
      return out;
    },
    lookAt: (out, eye, center, up) => {
      const z = Vec3.normalize([0, 0, 0], Vec3.sub([0, 0, 0], eye, center));
      const x = Vec3.cross([0, 0, 0], up, z);
      if (Vec3.lenSq(x) < 1e-6) {
        x[0] = 1; x[1] = 0; x[2] = 0;
      } else {
        Vec3.normalize(x, x);
      }
      const y = Vec3.cross([0, 0, 0], z, x);

      out[0] = x[0]; out[4] = x[1]; out[8] = x[2];  out[12] = -Vec3.dot(x, eye);
      out[1] = y[0]; out[5] = y[1]; out[9] = y[2];  out[13] = -Vec3.dot(y, eye);
      out[2] = z[0]; out[6] = z[1]; out[10] = z[2]; out[14] = -Vec3.dot(z, eye);
      out[3] = 0;    out[7] = 0;    out[11] = 0;    out[15] = 1;
      return out;
    },
    fromTRS: (out, pos, rotY, rotX, rotZ, scale) => {
      const cy = Math.cos(rotY), sy = Math.sin(rotY);
      const cx = Math.cos(rotX), sx = Math.sin(rotX);
      const cz = Math.cos(rotZ), sz = Math.sin(rotZ);
      const sxv = scale[0], syv = scale[1], szv = scale[2];

      const r00 = cy * cz + sy * sx * sz;
      const r01 = -cy * sz + sy * sx * cz;
      const r02 = sy * cx;

      const r10 = cx * sz;
      const r11 = cx * cz;
      const r12 = -sx;

      const r20 = -sy * cz + cy * sx * sz;
      const r21 = sy * sz + cy * sx * cz;
      const r22 = cy * cx;

      out[0] = r00 * sxv; out[4] = r01 * syv; out[8]  = r02 * szv; out[12] = pos[0];
      out[1] = r10 * sxv; out[5] = r11 * syv; out[9]  = r12 * szv; out[13] = pos[1];
      out[2] = r20 * sxv; out[6] = r21 * syv; out[10] = r22 * szv; out[14] = pos[2];
      out[3] = 0;         out[7] = 0;         out[11] = 0;         out[15] = 1;
      return out;
    },
    fromBasis: (out, pos, forward, upHint, scale, roll = 0) => {
      const f = Vec3.normalize([0, 0, 0], forward);
      let r = Vec3.cross([0, 0, 0], upHint, f);
      if (Vec3.lenSq(r) < 1e-5) {
        r = Vec3.cross([0, 0, 0], [1, 0, 0], f);
      }
      Vec3.normalize(r, r);
      const u = Vec3.cross([0, 0, 0], f, r);

      let rx = r[0], ry = r[1], rz = r[2];
      let ux = u[0], uy = u[1], uz = u[2];
      if (Math.abs(roll) > 1e-4) {
        const cr = Math.cos(roll), sr = Math.sin(roll);
        const nrx = rx * cr + ux * sr, nry = ry * cr + uy * sr, nrz = rz * cr + uz * sr;
        const nux = -rx * sr + ux * cr, nuy = -ry * sr + uy * cr, nuz = -rz * sr + uz * cr;
        rx = nrx; ry = nry; rz = nrz;
        ux = nux; uy = nuy; uz = nuz;
      }

      const sx = scale[0], sy = scale[1], sz = scale[2];
      out[0] = rx * sx;   out[4] = ux * sy;   out[8]  = f[0] * sz; out[12] = pos[0];
      out[1] = ry * sx;   out[5] = uy * sy;   out[9]  = f[1] * sz; out[13] = pos[1];
      out[2] = rz * sx;   out[6] = uz * sy;   out[10] = f[2] * sz; out[14] = pos[2];
      out[3] = 0;         out[7] = 0;         out[11] = 0;         out[15] = 1;
      return out;
    },
    projectToNDC: (vp, p) => {
      const x = vp[0] * p[0] + vp[4] * p[1] + vp[8]  * p[2] + vp[12];
      const y = vp[1] * p[0] + vp[5] * p[1] + vp[9]  * p[2] + vp[13];
      const z = vp[2] * p[0] + vp[6] * p[1] + vp[10] * p[2] + vp[14];
      const w = vp[3] * p[0] + vp[7] * p[1] + vp[11] * p[2] + vp[15];
      if (Math.abs(w) < 1e-5) return { x: 0, y: 0, z: 0, w: 0, visible: false };
      return { x: x / w, y: y / w, z: z / w, w, visible: w > 0 };
    },
  };

  // Compute world-space ray from camera basis + normalized viewport coordinates [-1, 1]
  function unprojectRay(camPos, camForward, camRight, camUp, fovRad, aspect, ndcX, ndcY) {
    const tanHalf = Math.tan(fovRad * 0.5);
    const dir = [
      camForward[0] + camRight[0] * (ndcX * aspect * tanHalf) + camUp[0] * (ndcY * tanHalf),
      camForward[1] + camRight[1] * (ndcX * aspect * tanHalf) + camUp[1] * (ndcY * tanHalf),
      camForward[2] + camRight[2] * (ndcX * aspect * tanHalf) + camUp[2] * (ndcY * tanHalf),
    ];
    Vec3.normalize(dir, dir);
    return { origin: [camPos[0], camPos[1], camPos[2]], dir };
  }

  // Returns positive hit distance t if ray hits sphere, or -1 if miss
  function raySphereIntersect(origin, dir, center, radius) {
    const ocx = origin[0] - center[0];
    const ocy = origin[1] - center[1];
    const ocz = origin[2] - center[2];
    const b = ocx * dir[0] + ocy * dir[1] + ocz * dir[2];
    const c = ocx * ocx + ocy * ocy + ocz * ocz - radius * radius;
    const disc = b * b - c;
    if (disc < 0) return -1;
    const t = -b - Math.sqrt(disc);
    if (t > 0) return t;
    const t2 = -b + Math.sqrt(disc);
    return t2 > 0 ? t2 : -1;
  }

  return {
    clamp,
    lerp,
    smoothstep,
    wrapAngle,
    lerpAngle,
    Vec3,
    Mat4,
    unprojectRay,
    raySphereIntersect,
  };
})();
