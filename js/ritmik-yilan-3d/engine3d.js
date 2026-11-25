// engine3d.js — Self-contained WebGL2 Open-World 3D Engine with Split-Screen, PCF Shadows, Terrain & Crisp Number Atlas

const Engine3D = (() => {
  const { Vec3, Mat4, Terrain } = Math3D;

  function computeNormalMat3(out, m) {
    const a00 = m[0], a01 = m[1], a02 = m[2];
    const a10 = m[4], a11 = m[5], a12 = m[6];
    const a20 = m[8], a21 = m[9], a22 = m[10];

    const b01 = a22 * a11 - a12 * a21;
    const b11 = -a22 * a10 + a12 * a20;
    const b21 = a21 * a10 - a11 * a20;

    let det = a00 * b01 + a01 * b11 + a02 * b21;
    if (Math.abs(det) < 1e-8) {
      out[0] = 1; out[1] = 0; out[2] = 0;
      out[3] = 0; out[4] = 1; out[5] = 0;
      out[6] = 0; out[7] = 0; out[8] = 1;
      return out;
    }
    det = 1.0 / det;

    out[0] = b01 * det;
    out[1] = b11 * det;
    out[2] = b21 * det;
    out[3] = (-a22 * a01 + a02 * a21) * det;
    out[4] = (a22 * a00 - a02 * a20) * det;
    out[5] = (-a21 * a00 + a01 * a20) * det;
    out[6] = (a12 * a01 - a02 * a11) * det;
    out[7] = (-a12 * a00 + a02 * a10) * det;
    out[8] = (a11 * a00 - a01 * a10) * det;
    return out;
  }

  // ==================== SHADERS (STRICT GLSL ES 3.00) ====================

  const SKY_VS = `#version 300 es
precision highp float;
out vec2 vNdc;
void main() {
  vec2 pos[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
  vNdc = pos[gl_VertexID];
  gl_Position = vec4(vNdc, 0.9999, 1.0);
}
`;

  const SKY_FS = `#version 300 es
precision highp float;
in vec2 vNdc;
out vec4 fragColor;

uniform vec3 uCamForward;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform float uTanHalfFov;
uniform float uAspect;
uniform vec3 uLightDir;
uniform float uTime;

float hash21(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 34.13);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * valueNoise(p);
    p *= 2.05;
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec3 dir = normalize(
    uCamForward +
    uCamRight * (vNdc.x * uAspect * uTanHalfFov) +
    uCamUp * (vNdc.y * uTanHalfFov)
  );

  float h = clamp(dir.y, -1.0, 1.0);

  // Sunny bright open-world sky palette
  vec3 zenith  = vec3(0.08, 0.34, 0.78);
  vec3 midSky  = vec3(0.24, 0.58, 0.92);
  vec3 horizon = vec3(0.68, 0.87, 0.98);
  vec3 below   = vec3(0.32, 0.56, 0.36);

  vec3 col;
  if (h >= 0.0) {
    float t1 = smoothstep(0.0, 0.30, h);
    float t2 = smoothstep(0.24, 0.86, h);
    col = mix(horizon, midSky, t1);
    col = mix(col, zenith, t2);
  } else {
    col = mix(horizon * 0.9, below, smoothstep(0.0, 0.35, -h));
  }

  // Warm sun & golden atmospheric glow
  float sunDot = max(dot(dir, normalize(uLightDir)), 0.0001);
  col += vec3(1.0, 0.90, 0.65) * pow(sunDot, 7.0) * 0.30;
  col += vec3(1.0, 0.97, 0.84) * pow(sunDot, 110.0) * 0.95;
  col += vec3(1.0, 1.0, 0.94) * smoothstep(0.9980, 0.9993, sunDot) * 1.4;

  // Fluffy drifting daytime clouds
  if (h > 0.03) {
    vec2 cloudUv = dir.xz / (h + 0.22) * 1.35 + vec2(uTime * 0.018, uTime * 0.008);
    float n = fbm(cloudUv);
    float cloudMask = smoothstep(0.50, 0.76, n) * smoothstep(0.04, 0.22, h) * (1.0 - smoothstep(0.70, 0.96, h));
    vec3 cloudCol = mix(vec3(0.92, 0.96, 1.0), vec3(1.0, 0.98, 0.90), pow(sunDot, 3.0) * 0.5);
    col = mix(col, cloudCol, cloudMask * 0.82);
  }

  // Soft horizon atmospheric scatter
  float haze = exp(-abs(h) * 11.0);
  col = mix(col, vec3(0.76, 0.90, 0.98), haze * 0.35);

  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
  col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));
  fragColor = vec4(col, 1.0);
}
`;

  const SHADOW_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPos;
uniform mat4 uLightVP;
uniform mat4 uModel;
void main() {
  gl_Position = uLightVP * uModel * vec4(aPos, 1.0);
}
`;

  const SHADOW_FS = `#version 300 es
precision highp float;
void main() {}
`;

  const MAIN_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;

uniform mat4 uVP;
uniform mat4 uLightVP;
uniform mat4 uModel;
uniform mat3 uNormalMat;
uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform int uBillboard;
uniform vec4 uExtra;

out vec3 vWorldPos;
out vec3 vWorldNormal;
out vec3 vLocalPos;
out vec3 vLocalNormal;
out vec2 vUv;
out vec4 vShadowPos;

void main() {
  vec4 wp;
  if (uBillboard == 1) {
    vec3 center = (uModel * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec3 toCam = normalize(uCamPos - center);
    vec3 p = center
      + toCam * uExtra.y
      + uCamRight * (aPos.x * uExtra.z)
      + uCamUp * (aPos.y * uExtra.w);
    wp = vec4(p, 1.0);
    vWorldNormal = toCam;
    vLocalPos = aPos;
    vLocalNormal = vec3(0.0, 0.0, 1.0);
  } else {
    wp = uModel * vec4(aPos, 1.0);
    vWorldNormal = normalize(uNormalMat * aNormal);
    vLocalPos = aPos;
    vLocalNormal = aNormal;
  }
  vWorldPos = wp.xyz;
  vUv = aUv;
  vShadowPos = uLightVP * wp;
  gl_Position = uVP * wp;
}
`;

  const MAIN_FS = `#version 300 es
precision highp float;

in vec3 vWorldPos;
in vec3 vWorldNormal;
in vec3 vLocalPos;
in vec3 vLocalNormal;
in vec2 vUv;
in vec4 vShadowPos;

out vec4 fragColor;

uniform sampler2D uShadowMap;
uniform bool uShadows;
uniform sampler2D uNumberAtlas;
uniform vec3 uCamPos;
uniform vec3 uLightDir;
uniform float uTime;

uniform vec3 uColor;
uniform vec3 uColor2;
uniform vec3 uEmissive;
uniform float uAlpha;
uniform float uShininess;
uniform int uMatType;
uniform vec4 uExtra;

uniform float uPlayRadius;
uniform vec3 uFogColor;
uniform float uFogDensity;

float hash21(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 34.13);
  return fract(p.x * p.y);
}

float sampleShadow(vec4 sp, vec3 N, vec3 L) {
  vec3 proj = sp.xyz / sp.w;
  proj = proj * 0.5 + 0.5;
  if (proj.x < 0.004 || proj.x > 0.996 || proj.y < 0.004 || proj.y > 0.996 || proj.z > 0.999) {
    return 1.0;
  }
  float bias = max(0.0024 * (1.0 - max(dot(N, L), 0.0)), 0.0008);
  vec2 texelSize = 1.0 / vec2(textureSize(uShadowMap, 0));
  float lit = 0.0;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      float d = texture(uShadowMap, proj.xy + vec2(x, y) * texelSize).r;
      lit += (proj.z - bias <= d) ? 1.0 : 0.0;
    }
  }
  return mix(0.42, 1.0, lit / 9.0);
}

void main() {
  vec3 N = normalize(vWorldNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCamPos - vWorldPos);
  vec3 L = normalize(uLightDir);
  float distCam = length(uCamPos - vWorldPos);

  // Material 7: Crisp Number Badge (ON Apples or ON Snake's Back/Belly)
  if (uMatType == 7) {
    float idx = floor(uExtra.x + 0.5);
    float colIdx = mod(idx, 6.0);
    float rowIdx = floor(idx / 6.0);
    vec2 cellUv = (vec2(colIdx, rowIdx) + vUv) / vec2(6.0, 4.0);
    vec4 tex = texture(uNumberAtlas, cellUv);
    if (tex.a < 0.12) discard;

    vec3 c = tex.rgb * uColor + uEmissive;
    float fog = exp(-pow(distCam * uFogDensity * 0.55, 2.0));
    c = mix(uFogColor, c, clamp(fog, 0.25, 1.0));
    fragColor = vec4(c, tex.a * uAlpha);
    return;
  }

  // Material 5: Unlit Glow / Ring / Particle / Light Beacon
  if (uMatType == 5) {
    float alpha = uAlpha;
    vec3 col = uColor + uEmissive;
    if (uExtra.x > 0.5 && uExtra.x < 1.5) {
      float vy = clamp(vLocalPos.y + 0.5, 0.0, 1.0);
      float edge = pow(max(abs(dot(N, V)), 0.0001), 0.75);
      alpha *= (1.0 - vy) * (1.0 - vy) * edge;
    } else if (uExtra.x >= 1.5) {
      float pulse = 0.72 + 0.28 * sin(uTime * 4.5 + uExtra.y);
      alpha *= pulse;
    }
    float fog = exp(-pow(distCam * uFogDensity * 0.75, 2.0));
    col = mix(uFogColor, col, clamp(fog, 0.0, 1.0));
    fragColor = vec4(col, clamp(alpha, 0.0, 1.0));
    return;
  }

  vec3 albedo = uColor;
  vec3 emissive = uEmissive;
  float shininess = uShininess;
  float specStrength = 0.35;

  // Material 1: Lush Open-World Rolling Meadow, Footpaths & Mountain Rim
  if (uMatType == 1) {
    vec2 p = vWorldPos.xz;
    float r = length(p);

    // Organic grass variation across hills
    float patch1 = 0.5 + 0.5 * sin(p.x * 0.11 + sin(p.y * 0.09) * 1.6);
    float patch2 = 0.5 + 0.5 * cos(p.y * 0.16 - p.x * 0.12);
    float micro = hash21(floor(p * 1.8));
    vec3 lushGrass  = vec3(0.18, 0.54, 0.17);
    vec3 sunlitGrass = vec3(0.32, 0.68, 0.20);
    vec3 deepGrass  = vec3(0.12, 0.42, 0.14);

    albedo = mix(deepGrass, lushGrass, patch1);
    albedo = mix(albedo, sunlitGrass, patch2 * 0.48 + smoothstep(0.8, 3.8, vWorldPos.y) * 0.28);
    albedo *= (0.93 + 0.14 * micro);

    // Winding warm park footpaths crisscrossing the valley
    float path1 = abs(p.x - sin(p.y * 0.055) * 14.0);
    float path2 = abs(p.y - cos(p.x * 0.052) * 14.0);
    float ringPath = abs(r - 36.0 + sin(atan(p.y, p.x) * 4.0) * 3.0);
    float trailMask = max(
      1.0 - smoothstep(1.9, 3.3, min(path1, path2)),
      (1.0 - smoothstep(1.6, 3.0, ringPath)) * 0.85
    ) * (1.0 - smoothstep(60.0, 67.0, r));
    vec3 dirtCol = mix(vec3(0.68, 0.56, 0.38), vec3(0.58, 0.46, 0.30), micro * 0.6);
    albedo = mix(albedo, dirtCol, trailMask * 0.82);

    // Subtle meadow boundary dirt ring near playable valley rim
    float borderLine = 1.0 - smoothstep(0.6, 2.2, abs(r - uPlayRadius));
    albedo = mix(albedo, vec3(0.82, 0.68, 0.40), borderLine * 0.55);

    // Mountain rock & alpine snow transition on outer valley slopes
    float slope = 1.0 - clamp(N.y, 0.0, 1.0);
    float rockMask = clamp(smoothstep(6.2, 12.5, vWorldPos.y) + smoothstep(0.24, 0.48, slope) * 0.75, 0.0, 1.0);
    vec3 rockCol = mix(vec3(0.38, 0.37, 0.35), vec3(0.50, 0.48, 0.44), micro * 0.5);
    albedo = mix(albedo, rockCol, rockMask);

    float snowMask = smoothstep(14.0, 19.5, vWorldPos.y) * smoothstep(0.55, 0.82, N.y);
    albedo = mix(albedo, vec3(0.92, 0.95, 0.98), snowMask);

    shininess = 14.0;
    specStrength = 0.08;
  }
  // Material 2: Snake Scales & Vibrant Dorsal Pattern
  else if (uMatType == 2) {
    vec2 suv = vec2(vUv.x * 10.0, vUv.y * 5.0);
    vec2 cell = fract(suv) - 0.5;
    float diamond = abs(cell.x) + abs(cell.y);
    float scaleMask = 1.0 - smoothstep(0.26, 0.49, diamond);

    float dorsal = smoothstep(-0.35, 0.55, vLocalNormal.y);
    vec3 bellyCol = mix(uColor2, vec3(0.94, 0.97, 0.88), 0.45);
    vec3 backCol = mix(uColor * 0.72, uColor * 1.18, scaleMask);
    albedo = mix(bellyCol, backCol, dorsal);

    float spine = smoothstep(0.75, 0.96, vLocalNormal.y) * (1.0 - smoothstep(0.0, 0.46, abs(vLocalNormal.x)));
    float segT = uExtra.x;
    float digestPulse = uExtra.y;
    float boostGlow = uExtra.z;
    float stripeWave = 0.55 + 0.45 * sin(segT * 20.0 - uTime * (4.0 + boostGlow * 8.0));

    emissive += uColor2 * spine * (0.16 + 0.22 * stripeWave + digestPulse * 0.85 + boostGlow * 0.55);
    emissive += uColor2 * (digestPulse * 0.35 + boostGlow * 0.14);

    float fresnel = pow(max(1.0 - max(dot(N, V), 0.0), 0.0001), 2.8);
    emissive += mix(uColor, uColor2, 0.55) * fresnel * (0.22 + boostGlow * 0.32);
    shininess = 52.0;
    specStrength = 0.58;
  }
  // Material 3: Glossy Juicy 3D Apple
  else if (uMatType == 3) {
    float topHighlight = smoothstep(-0.3, 0.85, vLocalPos.y);
    float fresnel = pow(max(1.0 - max(dot(N, V), 0.0), 0.0001), 2.8);
    albedo = mix(uColor * 0.72, uColor2, topHighlight * 0.22);
    emissive += uColor * 0.08 + uColor2 * fresnel * 0.16;
    shininess = 96.0;
    specStrength = 0.82;
  }
  // Material 6: Natural Wind / Speed Boost Pad on Meadow
  else if (uMatType == 6) {
    vec2 uv = vUv;
    float chevron = fract((uv.y - abs(uv.x - 0.5) * 1.2) * 3.0 - uTime * 2.5);
    float bar = smoothstep(0.24, 0.35, chevron) * (1.0 - smoothstep(0.62, 0.76, chevron));
    float edge = smoothstep(0.0, 0.1, uv.x) * (1.0 - smoothstep(0.9, 1.0, uv.x)) *
                 smoothstep(0.0, 0.08, uv.y) * (1.0 - smoothstep(0.92, 1.0, uv.y));
    albedo = vec3(0.14, 0.34, 0.24);
    emissive += mix(uColor, uColor2, bar) * (0.22 + bar * 1.1) * edge;
    float frame = 1.0 - smoothstep(0.06, 0.11, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));
    emissive += uColor2 * frame * 0.75;
  }
  // Material 0: Trees, Wood Logs, Rocks, Fence Posts, Eyes
  else {
    // Subtle wood/foliage shade variation
    if (uExtra.x > 0.5) {
      float band = 0.5 + 0.5 * sin(vLocalPos.y * 8.0 + vLocalPos.x * 5.0);
      albedo = mix(uColor * 0.86, uColor2, band * 0.35);
    }
    shininess = uShininess;
    specStrength = uShininess > 40.0 ? 0.5 : 0.16;
  }

  // Bright natural outdoor sunlight + sky-ground hemisphere ambient + PCF soft shadows
  float NdotL = max(dot(N, L), 0.0);
  float shadow = uShadows ? sampleShadow(vShadowPos, N, L) : 1.0;

  vec3 skyAmb = vec3(0.32, 0.38, 0.46);
  vec3 gndAmb = vec3(0.16, 0.20, 0.14);
  vec3 ambient = mix(gndAmb, skyAmb, N.y * 0.5 + 0.5) * albedo * 0.62;

  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0001), max(shininess, 1.0)) * specStrength;

  vec3 sunCol = vec3(1.04, 0.99, 0.90);
  vec3 direct = (albedo * NdotL + vec3(spec)) * sunCol * shadow;

  vec3 col = ambient + direct + emissive;

  // Soft sunlit daytime horizon fog
  float fog = exp(-pow(distCam * uFogDensity, 2.0));
  col = mix(uFogColor, col, clamp(fog, 0.0, 1.0));

  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
  col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));
  fragColor = vec4(col, uAlpha);
}
`;

  // ==================== GEOMETRY BUILDERS ====================

  function createMeshFromData(gl, positions, normals, uvs, indices) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    const normBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    const uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);

    const idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    gl.bindVertexArray(null);
    return { vao, count: indices.length };
  }

  function recomputeSmoothNormals(positions, indices) {
    const normals = new Float32Array(positions.length);
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i] * 3, i1 = indices[i + 1] * 3, i2 = indices[i + 2] * 3;
      const ax = positions[i1] - positions[i0], ay = positions[i1 + 1] - positions[i0 + 1], az = positions[i1 + 2] - positions[i0 + 2];
      const bx = positions[i2] - positions[i0], by = positions[i2 + 1] - positions[i0 + 1], bz = positions[i2 + 2] - positions[i0 + 2];
      const nx = ay * bz - az * by;
      const ny = az * bx - ax * bz;
      const nz = ax * by - ay * bx;
      normals[i0] += nx; normals[i0 + 1] += ny; normals[i0 + 2] += nz;
      normals[i1] += nx; normals[i1 + 1] += ny; normals[i1 + 2] += nz;
      normals[i2] += nx; normals[i2 + 1] += ny; normals[i2 + 2] += nz;
    }
    for (let i = 0; i < normals.length; i += 3) {
      const l = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
      normals[i] /= l; normals[i + 1] /= l; normals[i + 2] /= l;
    }
    return normals;
  }

  // Rolling Open-World Terrain Mesh (96x96 grid -> 9,409 verts < 65,535)
  function buildTerrain(gl, segs = 96) {
    const pos = [], norm = [], uv = [], idx = [];
    const half = Terrain.WORLD_HALF;
    const step = (half * 2) / segs;

    for (let gz = 0; gz <= segs; gz++) {
      const z = -half + gz * step;
      for (let gx = 0; gx <= segs; gx++) {
        const x = -half + gx * step;
        const y = Terrain.height(x, z);
        const n = Terrain.normal(x, z);
        pos.push(x, y, z);
        norm.push(n[0], n[1], n[2]);
        uv.push(gx / segs, gz / segs);
      }
    }
    const stride = segs + 1;
    for (let gz = 0; gz < segs; gz++) {
      for (let gx = 0; gx < segs; gx++) {
        const a = gz * stride + gx;
        const b = a + stride;
        // CCW looking down from +Y: (a, b, a+1) -> e1=(0,0,+step), e2=(+step,0,0), e1 x e2 = (0,+step^2,0) = +Y!
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    return createMeshFromData(gl, pos, norm, uv, idx);
  }

  function buildSphere(gl, lat = 14, lon = 20) {
    const pos = [], norm = [], uv = [], idx = [];
    for (let y = 0; y <= lat; y++) {
      const v = y / lat;
      const phi = v * Math.PI;
      const sp = Math.sin(phi), cp = Math.cos(phi);
      for (let x = 0; x <= lon; x++) {
        const u = x / lon;
        const theta = u * Math.PI * 2;
        const nx = sp * Math.cos(theta);
        const ny = cp;
        const nz = sp * Math.sin(theta);
        pos.push(nx, ny, nz);
        norm.push(nx, ny, nz);
        uv.push(u, v);
      }
    }
    const stride = lon + 1;
    for (let y = 0; y < lat; y++) {
      for (let x = 0; x < lon; x++) {
        const a = y * stride + x;
        const b = a + stride;
        idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    return createMeshFromData(gl, pos, norm, uv, idx);
  }

  // Sculpted juicy 3D Apple mesh (indented crown & base, slightly wider shoulders!)
  function buildApple(gl, lat = 16, lon = 22) {
    const pos = [], uv = [], idx = [];
    for (let y = 0; y <= lat; y++) {
      const v = y / lat;
      const phi = v * Math.PI;
      const sp = Math.sin(phi), cp = Math.cos(phi);
      for (let x = 0; x <= lon; x++) {
        const u = x / lon;
        const theta = u * Math.PI * 2;
        const shoulder = 1.0 + 0.14 * Math.sin(phi * 1.35) - 0.10 * (1.0 - sp);
        let py = cp * 0.94;
        // Top & bottom dimples
        if (sp < 0.42) {
          const dimple = Math.pow(1.0 - sp / 0.42, 2.0);
          py += (cp > 0 ? -0.34 : 0.20) * dimple;
        }
        const px = sp * Math.cos(theta) * shoulder;
        const pz = sp * Math.sin(theta) * shoulder;
        pos.push(px, py, pz);
        uv.push(u, v);
      }
    }
    const stride = lon + 1;
    for (let y = 0; y < lat; y++) {
      for (let x = 0; x < lon; x++) {
        const a = y * stride + x;
        const b = a + stride;
        idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    const norm = recomputeSmoothNormals(pos, idx);
    return createMeshFromData(gl, pos, norm, uv, idx);
  }

  // Organic faceted meadow boulder/rock
  function buildRock(gl) {
    const lat = 7, lon = 10;
    const pos = [], uv = [], idx = [];
    for (let y = 0; y <= lat; y++) {
      const v = y / lat;
      const phi = v * Math.PI;
      const sp = Math.sin(phi), cp = Math.cos(phi);
      for (let x = 0; x <= lon; x++) {
        const u = x / lon;
        const theta = u * Math.PI * 2;
        let nx = sp * Math.cos(theta);
        let ny = cp;
        let nz = sp * Math.sin(theta);
        const lump = 0.84 + 0.18 * Math.sin(nx * 3.7 + nz * 2.9) + 0.12 * Math.cos(ny * 4.1 - nx * 2.3);
        const px = nx * lump;
        const py = (ny < 0 ? ny * 0.65 : ny * 0.92) * lump;
        const pz = nz * lump;
        pos.push(px, py, pz);
        uv.push(u, v);
      }
    }
    const stride = lon + 1;
    for (let y = 0; y < lat; y++) {
      for (let x = 0; x < lon; x++) {
        const a = y * stride + x;
        const b = a + stride;
        idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    const norm = recomputeSmoothNormals(pos, idx);
    return createMeshFromData(gl, pos, norm, uv, idx);
  }

  function buildSnakeHead(gl) {
    const lat = 16, lon = 22;
    const pos = [], uv = [], idx = [];
    for (let y = 0; y <= lat; y++) {
      const v = y / lat;
      const phi = v * Math.PI;
      const sp = Math.sin(phi), cp = Math.cos(phi);
      for (let x = 0; x <= lon; x++) {
        const u = x / lon;
        const theta = u * Math.PI * 2;
        let px = sp * Math.sin(theta);
        let py = cp;
        let pz = sp * Math.cos(theta);

        if (pz > 0) {
          pz *= 1.50;
          const t = Math.min(1, pz / 1.50);
          px *= 1.0 - 0.54 * t * t;
          py *= 1.0 - 0.40 * t;
          if (py > 0) py *= 0.85;
          const brow = Math.exp(-Math.pow((pz - 0.35) * 2.6, 2)) * Math.exp(-Math.pow((Math.abs(px) - 0.52) * 3.8, 2));
          if (py > 0.15) py += brow * 0.20;
        } else {
          const backT = Math.min(1, -pz);
          px *= 1.0 + 0.18 * Math.sin(backT * Math.PI);
          py *= 0.90;
          pz *= 0.95;
        }
        if (py < 0) py *= 0.74;
        pos.push(px, py, pz);
        uv.push(u, v);
      }
    }
    const stride = lon + 1;
    for (let y = 0; y < lat; y++) {
      for (let x = 0; x < lon; x++) {
        const a = y * stride + x;
        const b = a + stride;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const norm = recomputeSmoothNormals(pos, idx);
    return createMeshFromData(gl, pos, norm, uv, idx);
  }

  function buildBox(gl) {
    const pos = [], norm = [], uv = [], idx = [];
    const faces = [
      { n: [0, 0, 1],  v: [[-.5, -.5, .5], [.5, -.5, .5], [.5, .5, .5], [-.5, .5, .5]] },
      { n: [0, 0, -1], v: [[.5, -.5, -.5], [-.5, -.5, -.5], [-.5, .5, -.5], [.5, .5, -.5]] },
      { n: [0, 1, 0],  v: [[-.5, .5, .5], [.5, .5, .5], [.5, .5, -.5], [-.5, .5, -.5]] },
      { n: [0, -1, 0], v: [[-.5, -.5, -.5], [.5, -.5, -.5], [.5, -.5, .5], [-.5, -.5, .5]] },
      { n: [1, 0, 0],  v: [[.5, -.5, .5], [.5, -.5, -.5], [.5, .5, -.5], [.5, .5, .5]] },
      { n: [-1, 0, 0], v: [[-.5, -.5, -.5], [-.5, -.5, .5], [-.5, .5, .5], [-.5, .5, -.5]] },
    ];
    let base = 0;
    const fuv = [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (const f of faces) {
      for (let i = 0; i < 4; i++) {
        pos.push(...f.v[i]);
        norm.push(...f.n);
        uv.push(...fuv[i]);
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      base += 4;
    }
    return createMeshFromData(gl, pos, norm, uv, idx);
  }

  function buildCylinder(gl, segs = 14, topR = 1, botR = 1, caps = true) {
    const pos = [], norm = [], uv = [], idx = [];
    const slope = (botR - topR);
    const lenN = Math.hypot(1, slope);

    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const a = u * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const nx = ca / lenN, ny = slope / lenN, nz = sa / lenN;
      pos.push(ca * botR, -0.5, sa * botR);
      norm.push(nx, ny, nz);
      uv.push(u, 0);

      pos.push(ca * topR, 0.5, sa * topR);
      norm.push(nx, ny, nz);
      uv.push(u, 1);
    }
    for (let i = 0; i < segs; i++) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 2, k + 1, k + 3);
    }
    if (caps) {
      if (topR > 0.001) {
        const cIdx = pos.length / 3;
        pos.push(0, 0.5, 0); norm.push(0, 1, 0); uv.push(0.5, 0.5);
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          pos.push(Math.cos(a) * topR, 0.5, Math.sin(a) * topR);
          norm.push(0, 1, 0);
          uv.push(0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a));
        }
        for (let i = 0; i < segs; i++) idx.push(cIdx, cIdx + 1 + i + 1, cIdx + 1 + i);
      }
      if (botR > 0.001) {
        const cIdx = pos.length / 3;
        pos.push(0, -0.5, 0); norm.push(0, -1, 0); uv.push(0.5, 0.5);
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          pos.push(Math.cos(a) * botR, -0.5, Math.sin(a) * botR);
          norm.push(0, -1, 0);
          uv.push(0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a));
        }
        for (let i = 0; i < segs; i++) idx.push(cIdx, cIdx + 1 + i, cIdx + 1 + i + 1);
      }
    }
    return createMeshFromData(gl, pos, norm, uv, idx);
  }

  function buildZCone(gl, segs = 10) {
    const pos = [], norm = [], uv = [], idx = [];
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const a = u * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const lenN = Math.hypot(1, 1);
      pos.push(ca, sa, 0);
      norm.push(ca / lenN, sa / lenN, 1 / lenN);
      uv.push(u, 0);

      pos.push(0, 0, 1);
      norm.push(ca / lenN, sa / lenN, 1 / lenN);
      uv.push(u, 1);
    }
    for (let i = 0; i < segs; i++) {
      const k = i * 2;
      idx.push(k, k + 2, k + 1);
    }
    return createMeshFromData(gl, pos, norm, uv, idx);
  }

  function buildCrystal(gl, sides = 6) {
    const pos = [], norm = [], uv = [], idx = [];
    const ring = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      ring.push([Math.cos(a) * 0.65, 0, Math.sin(a) * 0.65]);
    }
    const top = [0, 1.0, 0], bot = [0, -1.0, 0];
    let base = 0;
    function pushTri(p0, p1, p2) {
      const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
      const e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
      const n = Vec3.normalize([0, 0, 0], Vec3.cross([0, 0, 0], e1, e2));
      pos.push(...p0, ...p1, ...p2);
      norm.push(...n, ...n, ...n);
      uv.push(0, 0, 1, 0, 0.5, 1);
      idx.push(base, base + 1, base + 2);
      base += 3;
    }
    for (let i = 0; i < sides; i++) {
      const a = ring[i], b = ring[(i + 1) % sides];
      pushTri(a, top, b);
      pushTri(b, bot, a);
    }
    return createMeshFromData(gl, pos, norm, uv, idx);
  }

  function buildPlaneXZ(gl) {
    const pos = [-0.5, 0, 0.5, 0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, -0.5];
    const norm = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
    const uv = [0, 0, 1, 0, 1, 1, 0, 1];
    const idx = [0, 1, 2, 0, 2, 3];
    return createMeshFromData(gl, pos, norm, uv, idx);
  }

  // Camera-facing billboard quad for apple numbers: (-0.5,+0.5)=TL (u=0,v=0)
  function buildBillboardQuad(gl) {
    const pos = [
      -0.5,  0.5, 0,
      -0.5, -0.5, 0,
       0.5, -0.5, 0,
       0.5,  0.5, 0,
    ];
    const norm = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
    const uv = [0, 0, 0, 1, 1, 1, 1, 0];
    const idx = [0, 1, 2, 0, 2, 3];
    return createMeshFromData(gl, pos, norm, uv, idx);
  }

  // Snake back/belly number quad (oriented upright when viewed from behind looking along +Z!)
  function buildBackBadgeQuad(gl) {
    const pos = [
       0.5, 0,  0.5, // Top-Left (u=0, v=0)
       0.5, 0, -0.5, // Bottom-Left (u=0, v=1)
      -0.5, 0, -0.5, // Bottom-Right (u=1, v=1)
      -0.5, 0,  0.5, // Top-Right (u=1, v=0)
    ];
    const norm = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
    const uv = [0, 0, 0, 1, 1, 1, 1, 0];
    const idx = [0, 1, 2, 0, 2, 3];
    return createMeshFromData(gl, pos, norm, uv, idx);
  }

  function buildRing(gl, segs = 28, innerR = 0.72, outerR = 1.0) {
    const pos = [], norm = [], uv = [], idx = [];
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const a = u * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      pos.push(ca * innerR, 0, sa * innerR);
      norm.push(0, 1, 0);
      uv.push(u, 0);
      pos.push(ca * outerR, 0, sa * outerR);
      norm.push(0, 1, 0);
      uv.push(u, 1);
    }
    for (let i = 0; i < segs; i++) {
      const k = i * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
    return createMeshFromData(gl, pos, norm, uv, idx);
  }

  function buildForkedTongue(gl) {
    const pos = [
      -0.06, 0, 0.0,   0.06, 0, 0.0,   0.04, 0, 0.62,  -0.04, 0, 0.62,
      -0.04, 0, 0.58,  0.01, 0, 0.62, -0.18, 0, 1.0,
      -0.01, 0, 0.62,  0.04, 0, 0.58,  0.18, 0, 1.0,
    ];
    const norm = [];
    const uv = [];
    for (let i = 0; i < pos.length / 3; i++) {
      norm.push(0, 1, 0);
      uv.push(0.5, 0.5);
    }
    const idx = [0, 1, 2, 0, 2, 3, 4, 5, 6, 7, 8, 9];
    return createMeshFromData(gl, pos, norm, uv, idx);
  }

  // ==================== COMPILER HELPERS ====================

  function compileShader(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      console.error('Shader compile error:', log, src);
      throw new Error('WebGL shader compile failed: ' + log);
    }
    return sh;
  }

  function createProgram(gl, vsSrc, fsSrc) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(prog);
      console.error('Program link error:', log);
      throw new Error('WebGL program link failed: ' + log);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return prog;
  }

  // ==================== RENDERER ====================

  function createRenderer(canvas) {
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      failIfMajorPerformanceCaveat: true,
    });
    if (!gl) {
      throw new Error('Tarayıcınız WebGL2 desteklemiyor.');
    }

    const skyProg = createProgram(gl, SKY_VS, SKY_FS);
    const shadowProg = createProgram(gl, SHADOW_VS, SHADOW_FS);
    const mainProg = createProgram(gl, MAIN_VS, MAIN_FS);
    const emptyVao = gl.createVertexArray();

    const skyLoc = {
      uCamForward: gl.getUniformLocation(skyProg, 'uCamForward'),
      uCamRight: gl.getUniformLocation(skyProg, 'uCamRight'),
      uCamUp: gl.getUniformLocation(skyProg, 'uCamUp'),
      uTanHalfFov: gl.getUniformLocation(skyProg, 'uTanHalfFov'),
      uAspect: gl.getUniformLocation(skyProg, 'uAspect'),
      uLightDir: gl.getUniformLocation(skyProg, 'uLightDir'),
      uTime: gl.getUniformLocation(skyProg, 'uTime'),
    };

    const shadowLoc = {
      uLightVP: gl.getUniformLocation(shadowProg, 'uLightVP'),
      uModel: gl.getUniformLocation(shadowProg, 'uModel'),
    };

    const mainLoc = {
      uVP: gl.getUniformLocation(mainProg, 'uVP'),
      uLightVP: gl.getUniformLocation(mainProg, 'uLightVP'),
      uModel: gl.getUniformLocation(mainProg, 'uModel'),
      uNormalMat: gl.getUniformLocation(mainProg, 'uNormalMat'),
      uShadowMap: gl.getUniformLocation(mainProg, 'uShadowMap'),
      uShadows: gl.getUniformLocation(mainProg, 'uShadows'),
      uNumberAtlas: gl.getUniformLocation(mainProg, 'uNumberAtlas'),
      uCamPos: gl.getUniformLocation(mainProg, 'uCamPos'),
      uCamRight: gl.getUniformLocation(mainProg, 'uCamRight'),
      uCamUp: gl.getUniformLocation(mainProg, 'uCamUp'),
      uBillboard: gl.getUniformLocation(mainProg, 'uBillboard'),
      uLightDir: gl.getUniformLocation(mainProg, 'uLightDir'),
      uTime: gl.getUniformLocation(mainProg, 'uTime'),
      uColor: gl.getUniformLocation(mainProg, 'uColor'),
      uColor2: gl.getUniformLocation(mainProg, 'uColor2'),
      uEmissive: gl.getUniformLocation(mainProg, 'uEmissive'),
      uAlpha: gl.getUniformLocation(mainProg, 'uAlpha'),
      uShininess: gl.getUniformLocation(mainProg, 'uShininess'),
      uMatType: gl.getUniformLocation(mainProg, 'uMatType'),
      uExtra: gl.getUniformLocation(mainProg, 'uExtra'),
      uPlayRadius: gl.getUniformLocation(mainProg, 'uPlayRadius'),
      uFogColor: gl.getUniformLocation(mainProg, 'uFogColor'),
      uFogDensity: gl.getUniformLocation(mainProg, 'uFogDensity'),
    };

    const SHADOW_SIZE = 1024;
    const shadowTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, shadowTex);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24,
      SHADOW_SIZE, SHADOW_SIZE, 0,
      gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const shadowFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shadowTex, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Crisp Number Atlas Texture (6x4 grid, 256x256 per cell = 1536x1024)
    const numberTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, numberTex);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255])
    );

    const atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = 1536;
    atlasCanvas.height = 1024;
    const atlasCtx = atlasCanvas.getContext('2d');

    function updateNumberAtlas(numbers) {
      if (!atlasCtx) return;
      const cellW = 256, cellH = 256;
      atlasCtx.clearRect(0, 0, atlasCanvas.width, atlasCanvas.height);

      for (let i = 0; i < Math.min(numbers.length, 24); i++) {
        const col = i % 6;
        const row = Math.floor(i / 6);
        const cx = col * cellW + cellW * 0.5;
        const cy = row * cellH + cellH * 0.5;
        const txt = String(numbers[i]);

        // Bright circular glossy emblem
        const grad = atlasCtx.createRadialGradient(cx - 24, cy - 28, 12, cx, cy, 108);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.78, '#fff7df');
        grad.addColorStop(1, '#ffe29a');

        atlasCtx.save();
        atlasCtx.beginPath();
        atlasCtx.arc(cx, cy, 106, 0, Math.PI * 2);
        atlasCtx.fillStyle = grad;
        atlasCtx.fill();

        // Crisp high-contrast border
        atlasCtx.lineWidth = 14;
        atlasCtx.strokeStyle = '#9c1c26';
        atlasCtx.stroke();

        // Inner thin warm highlight
        atlasCtx.beginPath();
        atlasCtx.arc(cx, cy, 95, 0, Math.PI * 2);
        atlasCtx.lineWidth = 4;
        atlasCtx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        atlasCtx.stroke();

        // Huge ultra-crisp bold number
        const fontSize = txt.length >= 3 ? 104 : (txt.length === 2 ? 128 : 146);
        atlasCtx.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        atlasCtx.textAlign = 'center';
        atlasCtx.textBaseline = 'middle';
        atlasCtx.fillStyle = '#142033';
        atlasCtx.fillText(txt, cx, cy + 5);
        atlasCtx.restore();
      }

      gl.bindTexture(gl.TEXTURE_2D, numberTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasCanvas);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    // Meshes
    const meshes = {
      terrain: buildTerrain(gl, 96),
      sphere: buildSphere(gl, 12, 18),
      lowSphere: buildSphere(gl, 8, 12),
      apple: buildApple(gl, 14, 20),
      rock: buildRock(gl),
      snakeHead: buildSnakeHead(gl),
      box: buildBox(gl),
      cylinder: buildCylinder(gl, 12, 1, 1, true),
      taperTrunk: buildCylinder(gl, 10, 0.72, 1.08, true),
      beam: buildCylinder(gl, 10, 1, 1, false),
      cone: buildCylinder(gl, 10, 0.0, 1.0, true),
      zCone: buildZCone(gl, 10),
      crystal: buildCrystal(gl, 6),
      plane: buildPlaneXZ(gl),
      billboardQuad: buildBillboardQuad(gl),
      backBadge: buildBackBadgeQuad(gl),
      ring: buildRing(gl, 28, 0.70, 1.0),
      tongue: buildForkedTongue(gl),
    };

    const projMat = Mat4.create();
    const viewMat = Mat4.create();
    const lightProj = Mat4.create();
    const lightView = Mat4.create();
    const lightVP = Mat4.create();
    const normalMat3 = new Float32Array(9);

    const lightDir = Vec3.normalize([0, 0, 0], [0.52, 0.78, 0.34]);

    const opaqueQueue = [];
    const alphaQueue = [];

    let width = 1, height = 1;

    function prepareCanvas(w, h) {
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      width = w;
      height = h;
      return { width, height };
    }

    function beginFrame() {
      opaqueQueue.length = 0;
      alphaQueue.length = 0;
    }

    function submit(item) {
      // item.viewerMask: bit 1 = P1, bit 2 = P2, default 3 = both
      if ((item.alpha !== undefined && item.alpha < 0.999) || item.additive) {
        alphaQueue.push(item);
      } else {
        opaqueQueue.push(item);
      }
    }

    function renderShadowPass(focusPos, halfExtent = 74) {
      const fx = Math.round((focusPos[0] || 0) * 0.25) * 4.0;
      const fz = Math.round((focusPos[2] || 0) * 0.25) * 4.0;
      const focus = [fx, 0, fz];
      const eye = [
        focus[0] + lightDir[0] * 95,
        focus[1] + lightDir[1] * 95,
        focus[2] + lightDir[2] * 95,
      ];
      Mat4.ortho(lightProj, -halfExtent, halfExtent, -halfExtent, halfExtent, 10, 220);
      Mat4.lookAt(lightView, eye, focus, [0, 1, 0]);
      Mat4.multiply(lightVP, lightProj, lightView);

      gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFbo);
      gl.disable(gl.SCISSOR_TEST);
      gl.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.clear(gl.DEPTH_BUFFER_BIT);

      gl.useProgram(shadowProg);
      gl.uniformMatrix4fv(shadowLoc.uLightVP, false, lightVP);

      for (let i = 0; i < opaqueQueue.length; i++) {
        const it = opaqueQueue[i];
        if (it.castShadow === false || it.matType === 7 || it.billboard) continue;
        const m = meshes[it.mesh];
        gl.uniformMatrix4fv(shadowLoc.uModel, false, it.model);
        gl.bindVertexArray(m.vao);
        gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_SHORT, 0);
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    function renderViewport(cam, rect, sceneInfo, viewerBit = 1) {
      const vpMat = Mat4.create();
      const aspect = rect.w / Math.max(1, rect.h);
      const fovRad = (cam.fov * Math.PI) / 180;

      Mat4.perspective(projMat, fovRad, aspect, 0.25, 320);
      Mat4.lookAt(viewMat, cam.pos, cam.target, cam.up);
      Mat4.multiply(vpMat, projMat, viewMat);

      const camFwd = Vec3.normalize([0, 0, 0], Vec3.sub([0, 0, 0], cam.target, cam.pos));
      const camRight = Vec3.normalize([0, 0, 0], Vec3.cross([0, 0, 0], camFwd, cam.up));
      const camUp = Vec3.cross([0, 0, 0], camRight, camFwd);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.enable(gl.SCISSOR_TEST);
      gl.viewport(rect.x, rect.y, rect.w, rect.h);
      gl.scissor(rect.x, rect.y, rect.w, rect.h);
      gl.clearColor(0.55, 0.80, 0.96, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.disable(gl.BLEND);
      if (sceneInfo.detailed) {
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.disable(gl.CULL_FACE);
        gl.useProgram(skyProg);
        gl.uniform3fv(skyLoc.uCamForward, camFwd);
        gl.uniform3fv(skyLoc.uCamRight, camRight);
        gl.uniform3fv(skyLoc.uCamUp, camUp);
        gl.uniform1f(skyLoc.uTanHalfFov, Math.tan(fovRad * 0.5));
        gl.uniform1f(skyLoc.uAspect, aspect);
        gl.uniform3fv(skyLoc.uLightDir, lightDir);
        gl.uniform1f(skyLoc.uTime, sceneInfo.time);
        gl.bindVertexArray(emptyVao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      // PASS 2: Opaque 3D World
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);

      gl.useProgram(mainProg);
      gl.uniformMatrix4fv(mainLoc.uVP, false, vpMat);
      gl.uniformMatrix4fv(mainLoc.uLightVP, false, lightVP);
      gl.uniform3fv(mainLoc.uCamPos, cam.pos);
      gl.uniform3fv(mainLoc.uCamRight, camRight);
      gl.uniform3fv(mainLoc.uCamUp, camUp);
      gl.uniform3fv(mainLoc.uLightDir, lightDir);
      gl.uniform1f(mainLoc.uTime, sceneInfo.time);
      gl.uniform1f(mainLoc.uPlayRadius, Terrain.PLAY_RADIUS);
      gl.uniform3fv(mainLoc.uFogColor, sceneInfo.fogColor || [0.64, 0.84, 0.96]);
      gl.uniform1f(mainLoc.uFogDensity, sceneInfo.fogDensity ?? 0.0052);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, shadowTex);
      gl.uniform1i(mainLoc.uShadowMap, 0);
      gl.uniform1i(mainLoc.uShadows, sceneInfo.detailed ? 1 : 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, numberTex);
      gl.uniform1i(mainLoc.uNumberAtlas, 1);

      const drawItem = (it) => {
        const mask = it.viewerMask !== undefined ? it.viewerMask : 3;
        if ((mask & viewerBit) === 0) return;

        const m = meshes[it.mesh];
        if (it.doubleSided || it.billboard) gl.disable(gl.CULL_FACE);
        else gl.enable(gl.CULL_FACE);

        computeNormalMat3(normalMat3, it.model);
        gl.uniformMatrix4fv(mainLoc.uModel, false, it.model);
        gl.uniformMatrix3fv(mainLoc.uNormalMat, false, normalMat3);
        gl.uniform1i(mainLoc.uBillboard, it.billboard ? 1 : 0);
        gl.uniform3fv(mainLoc.uColor, it.color || [1, 1, 1]);
        gl.uniform3fv(mainLoc.uColor2, it.color2 || it.color || [1, 1, 1]);
        gl.uniform3fv(mainLoc.uEmissive, it.emissive || [0, 0, 0]);
        gl.uniform1f(mainLoc.uAlpha, it.alpha !== undefined ? it.alpha : 1.0);
        gl.uniform1f(mainLoc.uShininess, it.shininess !== undefined ? it.shininess : 32.0);
        gl.uniform1i(mainLoc.uMatType, it.matType || 0);
        const ex = it.extra || [0, 0, 0, 0];
        gl.uniform4f(mainLoc.uExtra, ex[0], ex[1], ex[2], ex[3]);

        gl.bindVertexArray(m.vao);
        gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_SHORT, 0);
      };

      for (let i = 0; i < opaqueQueue.length; i++) {
        drawItem(opaqueQueue[i]);
      }

      // PASS 3: Translucent & Additive FX
      gl.enable(gl.BLEND);
      gl.depthMask(false);

      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      for (let i = 0; i < alphaQueue.length; i++) {
        if (!alphaQueue[i].additive) drawItem(alphaQueue[i]);
      }

      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      for (let i = 0; i < alphaQueue.length; i++) {
        if (alphaQueue[i].additive) drawItem(alphaQueue[i]);
      }

      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.disable(gl.SCISSOR_TEST);
      gl.bindVertexArray(null);

      return vpMat;
    }

    return {
      prepareCanvas,
      beginFrame,
      submit,
      renderShadowPass,
      renderViewport,
      updateNumberAtlas,
      getSize: () => ({ width, height }),
    };
  }

  return { createRenderer };
})();
