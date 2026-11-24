// engine3d.js — Pro WebGL2 3D Stadium & Paint Arena Engine (84x104m Stadium, Day/Sunset/Night, 6 Distinct 3D Cars, PCF Shadows, Split-Screen)

const Engine3D = (() => {
  const { Vec3, Mat4, clamp } = Math3D;

  const PITCH_HALF_W = 54.0;
  const PITCH_HALF_L = 72.0;
  const PAINT_ARENA_R = 40.0;

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

  // ==================== TIME-OF-DAY ATMOSPHERE THEMES ====================

  const THEMES = {
    day: {
      mode: 0,
      lightDir: Vec3.normalize([0, 0, 0], [0.46, 0.80, 0.38]),
      sunCol: [1.06, 1.01, 0.92],
      skyAmb: [0.38, 0.46, 0.58],
      gndAmb: [0.18, 0.25, 0.18],
      fogCol: [0.74, 0.90, 0.99],
      fogDensity: 0.0028,
      floodlightGlow: 0.35,
    },
    sunset: {
      mode: 1,
      lightDir: Vec3.normalize([0, 0, 0], [0.76, 0.34, -0.54]),
      sunCol: [1.22, 0.72, 0.42],
      skyAmb: [0.46, 0.34, 0.48],
      gndAmb: [0.22, 0.16, 0.14],
      fogCol: [0.92, 0.58, 0.44],
      fogDensity: 0.0034,
      floodlightGlow: 0.85,
    },
    night: {
      mode: 2,
      lightDir: Vec3.normalize([0, 0, 0], [0.32, 0.90, 0.28]),
      sunCol: [0.78, 0.86, 1.04],
      skyAmb: [0.18, 0.25, 0.44],
      gndAmb: [0.10, 0.16, 0.18],
      fogCol: [0.06, 0.10, 0.22],
      fogDensity: 0.0036,
      floodlightGlow: 1.25,
    },
  };

  let activeThemeName = 'day';
  let activeTheme = THEMES.day;

  // ==================== SHADERS (GLSL ES 3.00) ====================

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
uniform int uThemeMode;

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
    p *= 2.04;
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
  float sunDot = max(dot(dir, normalize(uLightDir)), 0.0001);

  vec3 zenith, midSky, horizon, below, hazeCol;
  if (uThemeMode == 1) {
    // Golden Sunset Stadium
    zenith  = vec3(0.14, 0.16, 0.44);
    midSky  = vec3(0.68, 0.32, 0.44);
    horizon = vec3(1.00, 0.62, 0.34);
    below   = vec3(0.18, 0.24, 0.18);
    hazeCol = vec3(1.00, 0.66, 0.42);
  } else if (uThemeMode == 2) {
    // Electric Night Stadium
    zenith  = vec3(0.02, 0.04, 0.12);
    midSky  = vec3(0.05, 0.09, 0.22);
    horizon = vec3(0.10, 0.18, 0.34);
    below   = vec3(0.05, 0.10, 0.14);
    hazeCol = vec3(0.14, 0.24, 0.44);
  } else {
    // Sunny Daytime Stadium
    zenith  = vec3(0.07, 0.36, 0.84);
    midSky  = vec3(0.22, 0.62, 0.96);
    horizon = vec3(0.72, 0.90, 1.00);
    below   = vec3(0.22, 0.48, 0.28);
    hazeCol = vec3(0.78, 0.92, 1.00);
  }

  vec3 col;
  if (h >= 0.0) {
    float t1 = smoothstep(0.0, 0.28, h);
    float t2 = smoothstep(0.24, 0.86, h);
    col = mix(horizon, midSky, t1);
    col = mix(col, zenith, t2);
  } else {
    col = mix(horizon * 0.82, below, smoothstep(0.0, 0.30, -h));
  }

  if (uThemeMode == 2) {
    // Twinkling stars + bright moon
    if (h > 0.06) {
      vec2 starUv = floor(dir.xz / (h + 0.18) * 140.0);
      float s = hash21(starUv);
      if (s > 0.992) {
        float twinkle = 0.55 + 0.45 * sin(uTime * 3.5 + s * 200.0);
        col += vec3(0.85, 0.92, 1.0) * twinkle * smoothstep(0.06, 0.25, h) * 1.1;
      }
    }
    col += vec3(0.65, 0.82, 1.0) * pow(sunDot, 22.0) * 0.24;
    col += vec3(0.92, 0.96, 1.0) * smoothstep(0.9975, 0.9992, sunDot) * 1.1;
  } else if (uThemeMode == 1) {
    col += vec3(1.0, 0.58, 0.24) * pow(sunDot, 5.0) * 0.52;
    col += vec3(1.0, 0.86, 0.54) * pow(sunDot, 55.0) * 0.95;
    col += vec3(1.0, 0.96, 0.82) * smoothstep(0.9965, 0.9988, sunDot) * 1.6;
  } else {
    col += vec3(1.0, 0.92, 0.68) * pow(sunDot, 7.0) * 0.30;
    col += vec3(1.0, 0.97, 0.86) * pow(sunDot, 110.0) * 0.95;
    col += vec3(1.0, 1.0, 0.95) * smoothstep(0.998, 0.9994, sunDot) * 1.4;
  }

  // Drifting clouds
  if (h > 0.03) {
    vec2 cloudUv = dir.xz / (h + 0.22) * 1.3 + vec2(uTime * 0.014, uTime * 0.007);
    float n = fbm(cloudUv);
    float cloudMask = smoothstep(0.50, 0.76, n) * smoothstep(0.04, 0.20, h) * (1.0 - smoothstep(0.70, 0.95, h));
    vec3 cloudCol = uThemeMode == 2
      ? vec3(0.14, 0.20, 0.34)
      : uThemeMode == 1
        ? mix(vec3(0.86, 0.48, 0.42), vec3(1.0, 0.84, 0.52), pow(sunDot, 2.0) * 0.7)
        : mix(vec3(0.94, 0.97, 1.0), vec3(1.0, 0.98, 0.90), pow(sunDot, 3.0) * 0.45);
    col = mix(col, cloudCol, cloudMask * (uThemeMode == 2 ? 0.45 : 0.82));
  }

  float haze = exp(-abs(h) * 10.5);
  col = mix(col, hazeCol, haze * 0.32);

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
uniform sampler2D uLabelAtlas;
uniform vec3 uCamPos;
uniform vec3 uLightDir;
uniform vec3 uSunCol;
uniform vec3 uSkyAmb;
uniform vec3 uGndAmb;
uniform float uTime;

uniform vec3 uColor;
uniform vec3 uColor2;
uniform vec3 uEmissive;
uniform float uAlpha;
uniform float uShininess;
uniform int uMatType;
uniform vec4 uExtra;

uniform vec3 uFogColor;
uniform float uFogDensity;

float hash21(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 34.13);
  return fract(p.x * p.y);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float sampleShadow(vec4 sp, vec3 N, vec3 L) {
  vec3 proj = sp.xyz / sp.w;
  proj = proj * 0.5 + 0.5;
  if (proj.x < 0.004 || proj.x > 0.996 || proj.y < 0.004 || proj.y > 0.996 || proj.z > 0.999) {
    return 1.0;
  }
  float bias = max(0.0020 * (1.0 - max(dot(N, L), 0.0)), 0.0007);
  vec2 texelSize = vec2(1.0 / 2048.0);
  float lit = 0.0;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      float d = texture(uShadowMap, proj.xy + vec2(x, y) * texelSize).r;
      lit += (proj.z - bias <= d) ? 1.0 : 0.0;
    }
  }
  return mix(0.45, 1.0, lit / 9.0);
}

void main() {
  vec3 N = normalize(vWorldNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCamPos - vWorldPos);
  vec3 L = normalize(uLightDir);
  float distCam = length(uCamPos - vWorldPos);

  // Material 7: Dynamic 8x4 Crisp Label / Scoreboard / Number Atlas
  if (uMatType == 7) {
    float idx = floor(uExtra.x + 0.5);
    float colIdx = mod(idx, 8.0);
    float rowIdx = floor(idx / 8.0);
    vec2 cellUv = (vec2(colIdx, rowIdx) + vUv) / vec2(8.0, 4.0);
    vec4 tex = texture(uLabelAtlas, cellUv);
    if (tex.a < 0.08) discard;
    vec3 c = tex.rgb * uColor + uEmissive;
    float fog = exp(-pow(distCam * uFogDensity * 0.35, 2.0));
    c = mix(uFogColor, c, clamp(fog, 0.40, 1.0));
    fragColor = vec4(c, tex.a * uAlpha);
    return;
  }

  // Material 5: Unlit Glow / Particles / Laser / Paint Splatter Decal / Contact Shadow
  if (uMatType == 5) {
    float alpha = uAlpha;
    vec3 col = uColor + uEmissive;
    if (uExtra.x > 2.5) {
      vec2 p = vUv * 2.0 - 1.0;
      float r = length(p);
      float ang = atan(p.y, p.x);
      float seed = uExtra.y;
      float lobes = 0.62 + 0.16 * sin(ang * 5.0 + seed) + 0.12 * cos(ang * 8.0 - seed * 1.7) + 0.08 * sin(ang * 13.0 + seed * 2.3);
      float mainBlob = 1.0 - smoothstep(lobes - 0.06, lobes + 0.03, r);
      float dropletAng = floor((ang + 3.14159) / 0.78539);
      float dropPhase = fract(sin(dropletAng * 91.7 + seed) * 43758.5);
      float dAngle = (dropletAng + 0.5) * 0.78539 - 3.14159 + (dropPhase - 0.5) * 0.35;
      vec2 dCenter = vec2(cos(dAngle), sin(dAngle)) * (0.76 + dropPhase * 0.17);
      float dropMask = 1.0 - smoothstep(0.06 + dropPhase * 0.04, 0.11 + dropPhase * 0.04, length(p - dCenter));
      float shape = max(mainBlob, dropMask);
      if (shape < 0.08) discard;
      float shine = smoothstep(0.55, 0.0, length(p - vec2(-0.18, -0.18))) * 0.28;
      col = mix(uColor, uColor2, r * 0.45) + vec3(shine);
      alpha *= shape;
    } else if (uExtra.x > 1.5) {
      vec2 p = vUv * 2.0 - 1.0;
      float r = length(p);
      float disk = 1.0 - smoothstep(0.2, 1.0, r);
      if (disk < 0.02) discard;
      alpha *= disk;
    } else if (uExtra.x > 0.5) {
      float pulse = 0.74 + 0.26 * sin(uTime * 6.5 + uExtra.y);
      alpha *= pulse;
    }
    float fog = exp(-pow(distCam * uFogDensity * 0.55, 2.0));
    col = mix(uFogColor, col, clamp(fog, 0.0, 1.0));
    fragColor = vec4(col, clamp(alpha, 0.0, 1.0));
    return;
  }

  // Material 8: 3D Woven Goal Net
  if (uMatType == 8) {
    vec2 grid = abs(fract(vUv * vec2(14.0, 8.0)) - 0.5);
    float line = max(1.0 - smoothstep(0.06, 0.14, grid.x), 1.0 - smoothstep(0.06, 0.14, grid.y));
    float flash = uExtra.x;
    float alpha = mix(0.16, 0.86, line) * uAlpha + flash * 0.35;
    vec3 col = mix(uColor, uColor2, line) + uEmissive + vec3(0.45, 0.95, 0.65) * flash;
    fragColor = vec4(col, clamp(alpha, 0.0, 0.96));
    return;
  }

  // Material 9: Translucent Stadium Energy Glass Wall
  if (uMatType == 9) {
    float topBand = smoothstep(0.84, 0.96, vUv.y);
    float botBand = 1.0 - smoothstep(0.04, 0.16, vUv.y);
    vec2 hexGrid = abs(fract(vec2(vWorldPos.x + vWorldPos.z, vWorldPos.y) * 0.36) - 0.5);
    float panelLine = max(1.0 - smoothstep(0.02, 0.055, hexGrid.x), 1.0 - smoothstep(0.02, 0.055, hexGrid.y));
    float sweep = 0.5 + 0.5 * sin((vWorldPos.x + vWorldPos.z) * 0.15 - uTime * 2.8);
    vec3 col = mix(uColor, uColor2, max(topBand, botBand));
    col += uColor2 * (topBand * 1.15 + botBand * 0.65 + panelLine * 0.22 * sweep);
    float alpha = clamp(uAlpha + topBand * 0.62 + botBand * 0.45 + panelLine * 0.09, 0.0, 0.92);
    fragColor = vec4(col, alpha);
    return;
  }

  // Material 10: Animated Sideline LED Stadium Perimeter Boards
  if (uMatType == 10) {
    float scroll = fract(vUv.x * 6.0 - uTime * 0.55);
    float bar = smoothstep(0.12, 0.24, scroll) * (1.0 - smoothstep(0.58, 0.72, scroll));
    float border = 1.0 - smoothstep(0.08, 0.14, min(vUv.y, 1.0 - vUv.y));
    vec3 col = mix(uColor, uColor2, bar) * (0.65 + 0.55 * bar) + uColor2 * border * 0.55;
    fragColor = vec4(col, 1.0);
    return;
  }

  vec3 albedo = uColor;
  vec3 emissive = uEmissive;
  float shininess = uShininess;
  float specStrength = 0.35;

  // Material 1: Enlarged Pro Stadium Grass Pitch (84m x 104m) OR Enlarged Paint Arena (R=40m)
  if (uMatType == 1) {
    vec2 p = vWorldPos.xz;
    float micro = hash21(floor(p * 2.2));
    float fine = hash21(floor(p * 6.5));

    if (uExtra.x > 0.5) {
      // ENLARGED PAINT ARENA FLOOR (R = 40m)
      float r = length(p);
      float checker = mod(floor(p.x * 0.20) + floor(p.y * 0.20), 2.0);
      vec3 tileA = vec3(0.13, 0.34, 0.50);
      vec3 tileB = vec3(0.17, 0.40, 0.58);
      albedo = mix(tileA, tileB, checker * 0.65) * (0.95 + 0.08 * micro);

      float ring1 = 1.0 - smoothstep(0.22, 0.55, abs(r - 12.0));
      float ring2 = 1.0 - smoothstep(0.22, 0.55, abs(r - 25.0));
      float ring3 = 1.0 - smoothstep(0.30, 0.75, abs(r - 37.5));
      float crossLine = max(
        (1.0 - smoothstep(0.14, 0.36, abs(p.x))) * smoothstep(38.0, 36.0, abs(p.y)),
        (1.0 - smoothstep(0.14, 0.36, abs(p.y))) * smoothstep(38.0, 36.0, abs(p.x))
      );

      albedo = mix(albedo, vec3(0.94, 0.98, 1.0), (ring1 + ring2 + crossLine * 0.45) * 0.72);
      emissive += vec3(0.14, 0.88, 0.96) * ring1 * 0.36;
      emissive += vec3(1.0, 0.62, 0.20) * ring2 * 0.30;
      emissive += vec3(0.95, 0.25, 0.75) * ring3 * 0.58;

      float outer = smoothstep(39.6, 42.0, r);
      vec3 outerGrass = vec3(0.15, 0.48, 0.19) * (0.90 + 0.14 * micro);
      albedo = mix(albedo, outerGrass, outer);
      emissive *= (1.0 - outer);

      shininess = 34.0;
      specStrength = 0.22;
    } else {
      // GRAND PRO ROCKET STADIUM GRASS PITCH (halfW = 54, halfL = 72 -> 108m x 144m!)
      float stripeZ = mod(floor((p.y + 80.0) / 9.0), 2.0);
      float stripeX = mod(floor((p.x + 80.0) / 9.0), 2.0);
      vec3 grassLight = vec3(0.21, 0.65, 0.22);
      vec3 grassDark  = vec3(0.13, 0.52, 0.17);
      albedo = mix(grassDark, grassLight, stripeZ * 0.85 + stripeX * 0.15);
      albedo *= (0.93 + 0.09 * micro + 0.05 * fine);

      // Subtle authentic turf wear near goal mouths
      float wearN = 1.0 - smoothstep(5.5, 16.0, length(p - vec2(0.0, -68.0)));
      float wearS = 1.0 - smoothstep(5.5, 16.0, length(p - vec2(0.0,  68.0)));
      albedo = mix(albedo, vec3(0.32, 0.52, 0.20), (wearN + wearS) * 0.22);

      float inPitch = step(abs(p.x), 53.4) * step(abs(p.y), 71.4);
      albedo = mix(albedo, vec3(0.12, 0.42, 0.16), (1.0 - inPitch) * 0.42);

      // Crisp Pro FIFA-style White Markings
      float lw = 0.34;
      float touchX = (1.0 - smoothstep(lw * 0.5, lw, abs(abs(p.x) - 53.0))) * step(abs(p.y), 71.2);
      float touchZ = (1.0 - smoothstep(lw * 0.5, lw, abs(abs(p.y) - 71.0))) * step(abs(p.x), 53.2);
      float midLine = (1.0 - smoothstep(lw * 0.5, lw, abs(p.y))) * step(abs(p.x), 53.0);
      float centerCircle = 1.0 - smoothstep(lw * 0.5, lw, abs(length(p) - 13.5));
      float centerDot = 1.0 - smoothstep(0.85, 1.15, length(p));

      // Penalty boxes (North & South)
      float boxN = max(
        (1.0 - smoothstep(lw * 0.5, lw, abs(p.y + 49.0))) * step(abs(p.x), 26.0),
        (1.0 - smoothstep(lw * 0.5, lw, abs(abs(p.x) - 26.0))) * step(p.y, -49.0) * step(-71.0, p.y)
      );
      float boxS = max(
        (1.0 - smoothstep(lw * 0.5, lw, abs(p.y - 49.0))) * step(abs(p.x), 26.0),
        (1.0 - smoothstep(lw * 0.5, lw, abs(abs(p.x) - 26.0))) * step(49.0, p.y) * step(p.y, 71.0)
      );
      float penSpotN = 1.0 - smoothstep(0.65, 0.90, length(p - vec2(0.0, -56.5)));
      float penSpotS = 1.0 - smoothstep(0.65, 0.90, length(p - vec2(0.0,  56.5)));

      // Corner arcs
      vec2 cp = abs(p) - vec2(53.0, 71.0);
      float cornerArc = (1.0 - smoothstep(lw * 0.5, lw, abs(length(cp) - 4.4))) * inPitch;

      float whiteLine = clamp(
        max(max(touchX, touchZ), max(max(midLine, centerCircle), max(centerDot, max(max(boxN, boxS), max(max(penSpotN, penSpotS), cornerArc))))),
        0.0, 1.0
      );
      albedo = mix(albedo, vec3(0.96, 0.99, 0.96), whiteLine * 0.92);

      // Outer stadium concrete concourse + surrounding lush park lawn
      float apron = smoothstep(73.0, 75.5, max(abs(p.x) * 1.32, abs(p.y)));
      float outerPark = smoothstep(96.0, 102.0, max(abs(p.x) * 1.24, abs(p.y)));
      albedo = mix(albedo, vec3(0.30, 0.34, 0.42), apron * 0.85 * (1.0 - outerPark));
      albedo = mix(albedo, vec3(0.16, 0.46, 0.18) * (0.90 + 0.14 * micro), outerPark);

      shininess = 20.0;
      specStrength = 0.11;
    }
  }
  // Material 2: Glossy Metallic Car Clearcoat + Racing Stripe
  else if (uMatType == 2) {
    float stripe = 1.0 - smoothstep(0.15, 0.21, abs(vLocalPos.x));
    albedo = mix(uColor, uColor2, stripe * 0.86);
    float fresnel = pow(max(1.0 - max(dot(N, V), 0.0), 0.0001), 2.5);
    float boostGlow = uExtra.z;
    emissive += mix(uColor, uColor2, 0.5) * fresnel * (0.26 + boostGlow * 0.48);
    emissive += uColor2 * boostGlow * 0.20;
    shininess = 104.0;
    specStrength = 0.92;
  }
  // Material 3: Procedural Rolling 3D Soccer Ball
  else if (uMatType == 3) {
    vec3 dir = normalize(vLocalPos);
    float phi = 1.6180339;
    float invLen = 1.0 / sqrt(1.0 + phi * phi);
    float a = invLen;
    float b = phi * invLen;
    float maxDot = -1.0;
    maxDot = max(maxDot, abs(dot(dir, vec3( 0.0,  a,  b))));
    maxDot = max(maxDot, abs(dot(dir, vec3( 0.0, -a,  b))));
    maxDot = max(maxDot, abs(dot(dir, vec3(  a,  b, 0.0))));
    maxDot = max(maxDot, abs(dot(dir, vec3( -a,  b, 0.0))));
    maxDot = max(maxDot, abs(dot(dir, vec3(  b, 0.0,  a))));
    maxDot = max(maxDot, abs(dot(dir, vec3(  b, 0.0, -a))));

    float patchMask = smoothstep(0.86, 0.895, maxDot);
    float seamRing  = smoothstep(0.84, 0.86, maxDot) * (1.0 - smoothstep(0.86, 0.885, maxDot));

    vec3 whitePanel = vec3(0.96, 0.98, 1.0);
    vec3 darkPanel  = vec3(0.09, 0.13, 0.21);
    albedo = mix(whitePanel, darkPanel, patchMask);
    emissive += uColor2 * seamRing * 0.72;
    float fresnel = pow(max(1.0 - max(dot(N, V), 0.0), 0.0001), 2.6);
    emissive += uColor2 * fresnel * 0.30;
    shininess = 92.0;
    specStrength = 0.85;
  }
  // Material 4: Glossy 3D Paint Balloon / Paintball / Rainbow Bomb / Danger Mine
  else if (uMatType == 4) {
    vec3 baseCol = uColor;
    if (uExtra.x > 0.5) {
      float hue = fract(vLocalPos.y * 0.45 + vLocalPos.x * 0.35 + uTime * 0.65);
      baseCol = hsv2rgb(vec3(hue, 0.90, 0.98));
      emissive += baseCol * 0.22;
    } else if (uExtra.x < -0.5) {
      float pulse = 0.5 + 0.5 * sin(uTime * 8.0);
      float eqBand = 1.0 - smoothstep(0.18, 0.34, abs(vLocalPos.y));
      baseCol = vec3(0.14, 0.15, 0.20);
      emissive += vec3(1.0, 0.16, 0.24) * (eqBand * 0.85 + 0.25) * (0.55 + 0.45 * pulse);
    }
    float topGrad = smoothstep(-0.5, 0.9, vLocalPos.y);
    albedo = mix(baseCol * 0.78, min(baseCol * 1.18 + vec3(0.08), vec3(1.0)), topGrad * 0.55);
    float fresnel = pow(max(1.0 - max(dot(N, V), 0.0), 0.0001), 2.5);
    emissive += baseCol * fresnel * 0.32;
    shininess = 110.0;
    specStrength = 0.92;
  }
  // Material 6: Animated Boost Pad / Jump Launch Pad
  else if (uMatType == 6) {
    vec2 uv = vUv;
    float chevron = fract((uv.y - abs(uv.x - 0.5) * 1.25) * 3.0 - uTime * 3.0);
    float bar = smoothstep(0.22, 0.34, chevron) * (1.0 - smoothstep(0.62, 0.76, chevron));
    float edge = smoothstep(0.0, 0.1, uv.x) * (1.0 - smoothstep(0.9, 1.0, uv.x)) *
                 smoothstep(0.0, 0.08, uv.y) * (1.0 - smoothstep(0.92, 1.0, uv.y));
    float ready = uExtra.x;
    albedo = vec3(0.10, 0.20, 0.30);
    emissive += mix(uColor, uColor2, bar) * (0.18 + bar * 1.15) * edge * mix(0.25, 1.0, ready);
    float frame = 1.0 - smoothstep(0.05, 0.10, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));
    emissive += uColor2 * frame * mix(0.2, 0.85, ready);
  }
  // Material 0: Standard Lit Stadium Props / Wheels / Trim
  else {
    if (uExtra.x > 0.5) {
      float fresnel = pow(max(1.0 - max(dot(N, V), 0.0), 0.0001), 3.0);
      emissive += uColor2 * fresnel * 0.28;
    }
    shininess = uShininess;
    specStrength = uShininess > 40.0 ? 0.62 : 0.20;
  }

  float NdotL = max(dot(N, L), 0.0);
  float shadow = sampleShadow(vShadowPos, N, L);

  vec3 ambient = mix(uGndAmb, uSkyAmb, N.y * 0.5 + 0.5) * albedo * 0.68;

  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0001), max(shininess, 1.0)) * specStrength;

  vec3 direct = (albedo * NdotL + vec3(spec)) * uSunCol * shadow;
  vec3 col = ambient + direct + emissive;

  float fog = exp(-pow(distCam * uFogDensity, 2.0));
  col = mix(uFogColor, col, clamp(fog, 0.0, 1.0));

  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
  col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));
  fragColor = vec4(col, uAlpha);
}
`;

  // ==================== GEOMETRY BUILDERS ====================

  function createBoxGeo() {
    const p = [], n = [], uv = [], idx = [];
    const faces = [
      { d: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
      { d: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
      { d: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
      { d: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
      { d: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
      { d: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
    ];
    let base = 0;
    for (const f of faces) {
      const c = [
        [-0.5, -0.5, 0, 1],
        [ 0.5, -0.5, 1, 1],
        [ 0.5,  0.5, 1, 0],
        [-0.5,  0.5, 0, 0],
      ];
      for (const q of c) {
        p.push(
          f.d[0] * 0.5 + f.u[0] * q[0] + f.v[0] * q[1],
          f.d[1] * 0.5 + f.u[1] * q[0] + f.v[1] * q[1],
          f.d[2] * 0.5 + f.u[2] * q[0] + f.v[2] * q[1]
        );
        n.push(f.d[0], f.d[1], f.d[2]);
        uv.push(q[2], q[3]);
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      base += 4;
    }
    return { positions: new Float32Array(p), normals: new Float32Array(n), uvs: new Float32Array(uv), indices: new Uint16Array(idx) };
  }

  function createSphereGeo(latBands = 20, lonBands = 28) {
    const p = [], n = [], uv = [], idx = [];
    for (let lat = 0; lat <= latBands; lat++) {
      const th = (lat * Math.PI) / latBands;
      const sinT = Math.sin(th), cosT = Math.cos(th);
      for (let lon = 0; lon <= lonBands; lon++) {
        const ph = (lon * 2 * Math.PI) / lonBands;
        const x = Math.cos(ph) * sinT;
        const y = cosT;
        const z = Math.sin(ph) * sinT;
        p.push(x, y, z);
        n.push(x, y, z);
        uv.push(lon / lonBands, lat / latBands);
      }
    }
    const stride = lonBands + 1;
    for (let lat = 0; lat < latBands; lat++) {
      for (let lon = 0; lon < lonBands; lon++) {
        const a = lat * stride + lon;
        const b = a + stride;
        idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
    return { positions: new Float32Array(p), normals: new Float32Array(n), uvs: new Float32Array(uv), indices: new Uint16Array(idx) };
  }

  function createCylinderGeo(segs = 18, topR = 0.5, botR = 0.5) {
    const p = [], n = [], uv = [], idx = [];
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      p.push(ca * topR, 0.5, sa * topR);
      n.push(ca, 0, sa);
      uv.push(i / segs, 0);
      p.push(ca * botR, -0.5, sa * botR);
      n.push(ca, 0, sa);
      uv.push(i / segs, 1);
    }
    for (let i = 0; i < segs; i++) {
      const k = i * 2;
      idx.push(k, k + 2, k + 1, k + 2, k + 3, k + 1);
    }
    const topCenter = p.length / 3;
    p.push(0, 0.5, 0); n.push(0, 1, 0); uv.push(0.5, 0.5);
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      p.push(Math.cos(a) * topR, 0.5, Math.sin(a) * topR);
      n.push(0, 1, 0);
      uv.push(0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5);
    }
    for (let i = 0; i < segs; i++) idx.push(topCenter, topCenter + 1 + i + 1, topCenter + 1 + i);

    const botCenter = p.length / 3;
    p.push(0, -0.5, 0); n.push(0, -1, 0); uv.push(0.5, 0.5);
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      p.push(Math.cos(a) * botR, -0.5, Math.sin(a) * botR);
      n.push(0, -1, 0);
      uv.push(0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5);
    }
    for (let i = 0; i < segs; i++) idx.push(botCenter, botCenter + 1 + i, botCenter + 1 + i + 1);

    return { positions: new Float32Array(p), normals: new Float32Array(n), uvs: new Float32Array(uv), indices: new Uint16Array(idx) };
  }

  function createQuadGeo() {
    const positions = new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]);
    const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]);
    const uvs = new Float32Array([0, 1, 1, 1, 1, 0, 0, 0]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    return { positions, normals, uvs, indices };
  }

  function createPlaneGeo(size = 1) {
    const h = size * 0.5;
    return {
      positions: new Float32Array([-h, 0, -h, h, 0, -h, h, 0, h, -h, 0, h]),
      normals: new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]),
      uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      indices: new Uint16Array([0, 3, 1, 1, 3, 2]),
    };
  }

  function createTorusGeo(majorR = 0.5, minorR = 0.14, majorSegs = 24, minorSegs = 12) {
    const p = [], n = [], uv = [], idx = [];
    for (let i = 0; i <= majorSegs; i++) {
      const u = (i / majorSegs) * Math.PI * 2;
      const cu = Math.cos(u), su = Math.sin(u);
      for (let j = 0; j <= minorSegs; j++) {
        const v = (j / minorSegs) * Math.PI * 2;
        const cv = Math.cos(v), sv = Math.sin(v);
        const r = majorR + minorR * cv;
        p.push(r * cu, minorR * sv, r * su);
        n.push(cv * cu, sv, cv * su);
        uv.push(i / majorSegs, j / minorSegs);
      }
    }
    const stride = minorSegs + 1;
    for (let i = 0; i < majorSegs; i++) {
      for (let j = 0; j < minorSegs; j++) {
        const a = i * stride + j;
        const b = a + stride;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    return { positions: new Float32Array(p), normals: new Float32Array(n), uvs: new Float32Array(uv), indices: new Uint16Array(idx) };
  }

  // ==================== ENGINE INSTANCE ====================

  let gl = null;
  let canvasEl = null;
  let skyProg = null;
  let shadowProg = null;
  let mainProg = null;
  let skyVao = null;
  let shadowFbo = null;
  let shadowTex = null;
  const SHADOW_SIZE = 2048;

  let labelCanvas = null;
  let labelCtx = null;
  let labelTex = null;
  let labelDirty = true;
  const ATLAS_COLS = 8;
  const ATLAS_ROWS = 4;
  const TILE_SIZE = 256;

  const meshes = {};
  const opaqueQueue = [];
  const alphaQueue = [];

  const lightView = Mat4.create();
  const lightProj = Mat4.create();
  const lightVP = Mat4.create();
  const tmpNormalMat = new Float32Array(9);

  function updateLightMatrix() {
    const ld = activeTheme.lightDir;
    const lightEye = [ld[0] * 135, ld[1] * 135, ld[2] * 135];
    Mat4.lookAt(lightView, lightEye, [0, 0, 0], [0, 1, 0]);
    Mat4.ortho(lightProj, -106, 106, -106, 106, 15, 290);
    Mat4.multiply(lightVP, lightProj, lightView);
  }

  function setTheme(name) {
    activeThemeName = THEMES[name] ? name : 'day';
    activeTheme = THEMES[activeThemeName];
    updateLightMatrix();
  }

  function compileShader(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  function linkProgram(vsSrc, fsSrc) {
    const vs = compileShader(gl.VERTEX_SHADER, vsSrc);
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSrc);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(prog));
      return null;
    }
    return prog;
  }

  function uploadMesh(geo) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const pb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pb);
    gl.bufferData(gl.ARRAY_BUFFER, geo.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    const nb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nb);
    gl.bufferData(gl.ARRAY_BUFFER, geo.normals, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    const ub = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ub);
    gl.bufferData(gl.ARRAY_BUFFER, geo.uvs, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);

    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
    return { vao, count: geo.indices.length };
  }

  function getUniforms(prog, names) {
    const map = {};
    for (const name of names) map[name] = gl.getUniformLocation(prog, name);
    return map;
  }

  let skyU, shadowU, mainU;

  function init(canvas) {
    canvasEl = canvas;
    gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 desteklenmiyor!');

    skyProg = linkProgram(SKY_VS, SKY_FS);
    shadowProg = linkProgram(SHADOW_VS, SHADOW_FS);
    mainProg = linkProgram(MAIN_VS, MAIN_FS);

    skyU = getUniforms(skyProg, ['uCamForward', 'uCamRight', 'uCamUp', 'uTanHalfFov', 'uAspect', 'uLightDir', 'uTime', 'uThemeMode']);
    shadowU = getUniforms(shadowProg, ['uLightVP', 'uModel']);
    mainU = getUniforms(mainProg, [
      'uVP', 'uLightVP', 'uModel', 'uNormalMat', 'uCamPos', 'uCamRight', 'uCamUp',
      'uBillboard', 'uExtra', 'uShadowMap', 'uLabelAtlas', 'uLightDir', 'uSunCol', 'uSkyAmb', 'uGndAmb', 'uTime',
      'uColor', 'uColor2', 'uEmissive', 'uAlpha', 'uShininess', 'uMatType',
      'uFogColor', 'uFogDensity',
    ]);

    skyVao = gl.createVertexArray();

    shadowTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, shadowTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, SHADOW_SIZE, SHADOW_SIZE, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    shadowFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shadowTex, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    labelCanvas = document.createElement('canvas');
    labelCanvas.width = ATLAS_COLS * TILE_SIZE;
    labelCanvas.height = ATLAS_ROWS * TILE_SIZE;
    labelCtx = labelCanvas.getContext('2d');

    labelTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, labelTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    meshes.box = uploadMesh(createBoxGeo());
    meshes.sphere = uploadMesh(createSphereGeo(20, 28));
    meshes.sphereLow = uploadMesh(createSphereGeo(12, 16));
    meshes.cyl = uploadMesh(createCylinderGeo(18, 0.5, 0.5));
    meshes.cone = uploadMesh(createCylinderGeo(14, 0.02, 0.5));
    meshes.quad = uploadMesh(createQuadGeo());
    meshes.plane = uploadMesh(createPlaneGeo(1));
    meshes.torus = uploadMesh(createTorusGeo(0.5, 0.14, 24, 12));

    updateLightMatrix();

    setLabelTile(24, { kind: 'icon', text: '⚡', bg: '#0ea5e9', border: '#7dd3fc' });
    setLabelTile(25, { kind: 'icon', text: '⚽', bg: '#f59e0b', border: '#fde68a' });
    setLabelTile(26, { kind: 'icon', text: '🧲', bg: '#ec4899', border: '#fbcfe8' });
    setLabelTile(27, { kind: 'icon', text: '🌟', bg: '#eab308', border: '#fef08a' });
    setLabelTile(28, { kind: 'icon', text: '🌈', bg: '#8b5cf6', border: '#ddd6fe' });
    setLabelTile(29, { kind: 'icon', text: '❄️', bg: '#06b6d4', border: '#cffafe' });
    setLabelTile(30, { kind: 'icon', text: '💣', bg: '#dc2626', border: '#fca5a5' });

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
  }

  function resize() {
    if (!canvasEl || !gl) return { w: 1, h: 1, dpr: 1 };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(canvasEl.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvasEl.clientHeight * dpr));
    if (canvasEl.width !== w || canvasEl.height !== h) {
      canvasEl.width = w;
      canvasEl.height = h;
    }
    return { w, h, dpr };
  }

  // ==================== DYNAMIC LABEL ATLAS ====================

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function setLabelTile(slot, opts) {
    if (!labelCtx || slot < 0 || slot >= ATLAS_COLS * ATLAS_ROWS) return;
    const col = slot % ATLAS_COLS;
    const row = Math.floor(slot / ATLAS_COLS);
    const ox = col * TILE_SIZE;
    const oy = row * TILE_SIZE;
    const S = TILE_SIZE;
    const c = labelCtx;

    c.save();
    c.clearRect(ox, oy, S, S);
    c.translate(ox, oy);

    if (opts.kind === 'goalSign') {
      const borderCol = opts.border || '#38bdf8';
      roundRectPath(c, 8, 34, S - 16, S - 68, 28);
      const grad = c.createLinearGradient(0, 34, 0, S - 34);
      grad.addColorStop(0, '#0f233e');
      grad.addColorStop(1, '#071222');
      c.fillStyle = grad;
      c.fill();
      c.lineWidth = 12;
      c.strokeStyle = borderCol;
      c.stroke();

      roundRectPath(c, 22, 48, S - 44, S - 96, 18);
      c.lineWidth = 2.5;
      c.strokeStyle = 'rgba(255,255,255,0.28)';
      c.stroke();

      const text = String(opts.text || '');
      const fontSize = text.length >= 6 ? 58 : text.length >= 5 ? 68 : text.length >= 4 ? 78 : 96;
      c.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.shadowColor = borderCol;
      c.shadowBlur = 18;
      c.fillStyle = '#ffffff';
      c.fillText(text, S * 0.5, S * 0.51);
      c.shadowBlur = 0;
    } else if (opts.kind === 'balloonNum') {
      const accent = opts.border || '#0284c7';
      roundRectPath(c, 10, 48, S - 20, S - 96, 42);
      c.fillStyle = 'rgba(255, 255, 255, 0.97)';
      c.fill();
      c.lineWidth = 11;
      c.strokeStyle = accent;
      c.stroke();

      const text = String(opts.text || '');
      const fontSize = text.length >= 6 ? 56 : text.length >= 5 ? 66 : text.length >= 4 ? 76 : 92;
      c.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = '#09182c';
      c.fillText(text, S * 0.5, S * 0.52);
    } else if (opts.kind === 'ballTarget') {
      const isTen = opts.targetType === 'ten';
      const accent = isTen ? '#22d3ee' : '#fbbf24';
      roundRectPath(c, 8, 22, S - 16, S - 44, 30);
      c.fillStyle = 'rgba(8, 20, 38, 0.94)';
      c.fill();
      c.lineWidth = 10;
      c.strokeStyle = accent;
      c.stroke();

      roundRectPath(c, 34, 34, S - 68, 44, 18);
      c.fillStyle = accent;
      c.fill();
      c.font = '900 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = '#061526';
      c.fillText(isTen ? 'ONLUĞA' : 'YÜZLÜĞE', S * 0.5, 57);

      const text = String(opts.text || '');
      const fontSize = text.length >= 5 ? 68 : text.length >= 4 ? 78 : 90;
      c.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      c.fillStyle = '#ffffff';
      c.fillText(text, S * 0.5, 152);
    } else if (opts.kind === 'icon') {
      c.beginPath();
      c.arc(S * 0.5, S * 0.5, S * 0.42, 0, Math.PI * 2);
      c.fillStyle = opts.bg || '#0ea5e9';
      c.fill();
      c.lineWidth = 10;
      c.strokeStyle = opts.border || '#ffffff';
      c.stroke();

      c.font = '112px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(opts.text || '⭐', S * 0.5, S * 0.54);
    }

    c.restore();
    labelDirty = true;
  }

  function syncLabelAtlas() {
    if (!labelDirty || !gl || !labelTex) return;
    gl.bindTexture(gl.TEXTURE_2D, labelTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, labelCanvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    labelDirty = false;
  }

  // ==================== SCENE QUEUE ====================

  function beginFrame() {
    opaqueQueue.length = 0;
    alphaQueue.length = 0;
  }

  function pushMesh(meshName, model, opts) {
    const item = {
      mesh: meshes[meshName],
      model: new Float32Array(model),
      color: opts.color || [1, 1, 1],
      color2: opts.color2 || opts.color || [1, 1, 1],
      emissive: opts.emissive || [0, 0, 0],
      alpha: opts.alpha !== undefined ? opts.alpha : 1.0,
      shininess: opts.shininess !== undefined ? opts.shininess : 32.0,
      matType: opts.matType || 0,
      billboard: opts.billboard || 0,
      extra: opts.extra || [0, 0, 0, 0],
      castShadow: opts.castShadow !== undefined ? opts.castShadow : (opts.alpha === undefined || opts.alpha >= 0.99),
      doubleSided: !!opts.doubleSided,
      depthWrite: opts.depthWrite !== undefined ? opts.depthWrite : (opts.alpha === undefined || opts.alpha >= 0.99),
    };
    if (item.alpha < 0.99 || item.matType === 5 || item.matType === 7 || item.matType === 8 || item.matType === 9) {
      alphaQueue.push(item);
    } else {
      opaqueQueue.push(item);
    }
  }

  function drawItemShadow(item) {
    if (!item.castShadow || item.billboard !== 0) return;
    gl.uniformMatrix4fv(shadowU.uModel, false, item.model);
    gl.bindVertexArray(item.mesh.vao);
    gl.drawElements(gl.TRIANGLES, item.mesh.count, gl.UNSIGNED_SHORT, 0);
  }

  function renderShadowPass() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFbo);
    gl.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE);
    gl.disable(gl.SCISSOR_TEST);
    gl.colorMask(false, false, false, false);
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    gl.useProgram(shadowProg);
    gl.uniformMatrix4fv(shadowU.uLightVP, false, lightVP);

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.FRONT);
    for (let i = 0; i < opaqueQueue.length; i++) drawItemShadow(opaqueQueue[i]);
    gl.cullFace(gl.BACK);
    gl.colorMask(true, true, true, true);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  function drawItemMain(item) {
    if (item.doubleSided) gl.disable(gl.CULL_FACE);
    else gl.enable(gl.CULL_FACE);

    gl.depthMask(item.depthWrite);
    computeNormalMat3(tmpNormalMat, item.model);

    gl.uniformMatrix4fv(mainU.uModel, false, item.model);
    gl.uniformMatrix3fv(mainU.uNormalMat, false, tmpNormalMat);
    gl.uniform3fv(mainU.uColor, item.color);
    gl.uniform3fv(mainU.uColor2, item.color2);
    gl.uniform3fv(mainU.uEmissive, item.emissive);
    gl.uniform1f(mainU.uAlpha, item.alpha);
    gl.uniform1f(mainU.uShininess, item.shininess);
    gl.uniform1i(mainU.uMatType, item.matType);
    gl.uniform1i(mainU.uBillboard, item.billboard);
    gl.uniform4fv(mainU.uExtra, item.extra);

    gl.bindVertexArray(item.mesh.vao);
    gl.drawElements(gl.TRIANGLES, item.mesh.count, gl.UNSIGNED_SHORT, 0);
  }

  function renderViewport(vpRect, cam, time) {
    syncLabelAtlas();
    const { x, y, w, h } = vpRect;
    const aspect = Math.max(0.2, w / Math.max(1, h));
    const fovRad = cam.fovRad || (58 * Math.PI) / 180;

    const view = Mat4.create();
    const proj = Mat4.create();
    const vp = Mat4.create();
    Mat4.lookAt(view, cam.pos, cam.target, [0, 1, 0]);
    Mat4.perspective(proj, fovRad, aspect, 0.35, 560);
    Mat4.multiply(vp, proj, view);

    const camForward = Vec3.normalize([0, 0, 0], Vec3.sub([0, 0, 0], cam.target, cam.pos));
    const camRight = Vec3.normalize([0, 0, 0], Vec3.cross([0, 0, 0], camForward, [0, 1, 0]));
    const camUp = Vec3.cross([0, 0, 0], camRight, camForward);

    gl.viewport(x, y, w, h);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(x, y, w, h);
    gl.depthMask(true);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    // 1. Sky Pass
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(skyProg);
    gl.uniform3fv(skyU.uCamForward, camForward);
    gl.uniform3fv(skyU.uCamRight, camRight);
    gl.uniform3fv(skyU.uCamUp, camUp);
    gl.uniform1f(skyU.uTanHalfFov, Math.tan(fovRad * 0.5));
    gl.uniform1f(skyU.uAspect, aspect);
    gl.uniform3fv(skyU.uLightDir, activeTheme.lightDir);
    gl.uniform1f(skyU.uTime, time);
    gl.uniform1i(skyU.uThemeMode, activeTheme.mode);
    gl.bindVertexArray(skyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 2. Main 3D Scene
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(mainProg);
    gl.uniformMatrix4fv(mainU.uVP, false, vp);
    gl.uniformMatrix4fv(mainU.uLightVP, false, lightVP);
    gl.uniform3fv(mainU.uCamPos, cam.pos);
    gl.uniform3fv(mainU.uCamRight, camRight);
    gl.uniform3fv(mainU.uCamUp, camUp);
    gl.uniform3fv(mainU.uLightDir, activeTheme.lightDir);
    gl.uniform3fv(mainU.uSunCol, activeTheme.sunCol);
    gl.uniform3fv(mainU.uSkyAmb, activeTheme.skyAmb);
    gl.uniform3fv(mainU.uGndAmb, activeTheme.gndAmb);
    gl.uniform1f(mainU.uTime, time);
    gl.uniform3fv(mainU.uFogColor, activeTheme.fogCol);
    gl.uniform1f(mainU.uFogDensity, activeTheme.fogDensity);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, shadowTex);
    gl.uniform1i(mainU.uShadowMap, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, labelTex);
    gl.uniform1i(mainU.uLabelAtlas, 1);

    gl.disable(gl.BLEND);
    for (let i = 0; i < opaqueQueue.length; i++) drawItemMain(opaqueQueue[i]);

    const sortedAlpha = alphaQueue.slice().sort((a, b) => {
      const da = (a.model[12] - cam.pos[0]) ** 2 + (a.model[13] - cam.pos[1]) ** 2 + (a.model[14] - cam.pos[2]) ** 2;
      const db = (b.model[12] - cam.pos[0]) ** 2 + (b.model[13] - cam.pos[1]) ** 2 + (b.model[14] - cam.pos[2]) ** 2;
      return db - da;
    });

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    for (let i = 0; i < sortedAlpha.length; i++) drawItemMain(sortedAlpha[i]);

    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.disable(gl.SCISSOR_TEST);

    return { vp, camPos: cam.pos, camForward, camRight, camUp, fovRad, aspect };
  }

  // ==================== PRO 3D STADIUM & ENVIRONMENT ====================

  const mTmp = Mat4.create();

  function drawStadium(isPaintArena, time) {
    // 1. Wide World Ground Floor
    Mat4.fromTRS(mTmp, [0, 0, 0], 0, 0, 0, [480, 1, 480]);
    pushMesh('plane', mTmp, {
      matType: 1,
      extra: [isPaintArena ? 1.0 : 0.0, 0, 0, 0],
      castShadow: false,
    });

    // Distant scenic rolling green hills & futuristic Olympic city skyline ring
    const hillCount = 16;
    for (let i = 0; i < hillCount; i++) {
      const a = (i / hillCount) * Math.PI * 2 + 0.15;
      const d = 172 + (i % 3) * 22;
      const hx = Math.sin(a) * d;
      const hz = Math.cos(a) * d;
      const hr = 28 + (i % 4) * 8;
      const hh = 13 + (i % 3) * 6;
      Mat4.fromTRS(mTmp, [hx, -2, hz], 0, 0, 0, [hr, hh, hr]);
      pushMesh('sphereLow', mTmp, {
        color: activeThemeName === 'night' ? [0.07, 0.14, 0.18] : [0.16, 0.44, 0.22],
        shininess: 10,
        castShadow: false,
      });

      // Stylized distant stadium park skyline towers & trees
      if (i % 2 === 0) {
        const tx = Math.sin(a + 0.18) * 142;
        const tz = Math.cos(a + 0.18) * 142;
        const th = 26 + (i % 3) * 14;
        Mat4.fromTRS(mTmp, [tx, th * 0.5, tz], a, 0, 0, [8.5, th, 8.5]);
        pushMesh('box', mTmp, {
          color: activeThemeName === 'night' ? [0.10, 0.15, 0.26] : [0.66, 0.76, 0.86],
          emissive: activeThemeName === 'night' ? [0.04, 0.12, 0.22] : [0, 0, 0],
          shininess: 55,
          castShadow: false,
        });
      }
    }

    if (isPaintArena) {
      // ENLARGED 3D PAINT-FESTIVAL ARENA (R = 40m)
      const segs = 20;
      const R = PAINT_ARENA_R + 0.6;
      const wallW = (2 * Math.PI * R) / segs + 0.5;
      const palette = [
        [0.10, 0.84, 0.96],
        [1.00, 0.56, 0.18],
        [0.94, 0.28, 0.72],
        [0.24, 0.90, 0.52],
      ];
      for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const cx = Math.sin(a) * R;
        const cz = Math.cos(a) * R;
        const col = palette[i % palette.length];

        Mat4.fromTRS(mTmp, [cx, 0.9, cz], a, 0, 0, [wallW, 1.8, 1.2]);
        pushMesh('box', mTmp, { color: [0.16, 0.22, 0.34], shininess: 40 });

        Mat4.fromTRS(mTmp, [cx, 3.8, cz], a, 0, 0, [wallW, 4.4, 0.35]);
        pushMesh('box', mTmp, {
          matType: 9,
          color: [0.12, 0.26, 0.44],
          color2: col,
          alpha: 0.28,
          doubleSided: true,
          castShadow: false,
        });

        const pa = ((i + 0.5) / segs) * Math.PI * 2;
        const px = Math.sin(pa) * (R + 0.3);
        const pz = Math.cos(pa) * (R + 0.3);
        Mat4.fromTRS(mTmp, [px, 3.6, pz], pa, 0, 0, [1.3, 7.2, 1.3]);
        pushMesh('cyl', mTmp, { color: [0.85, 0.90, 0.96], color2: col, extra: [1, 0, 0, 0], shininess: 64 });

        if (i % 2 === 0) {
          Mat4.fromTRS(mTmp, [px, 7.7, pz], 0, 0, 0, [1.1, 1.1, 1.1]);
          pushMesh('sphereLow', mTmp, {
            matType: 4,
            color: col,
            emissive: [col[0] * 0.55, col[1] * 0.55, col[2] * 0.55],
            castShadow: false,
          });
        }

        // Festive outer arena stands
        const sx = Math.sin(a) * (R + 8.5);
        const sz = Math.cos(a) * (R + 8.5);
        Mat4.fromTRS(mTmp, [sx, 3.5, sz], a, 0, 0, [14.5, 7.0, 6.2]);
        pushMesh('box', mTmp, { color: [0.20, 0.26, 0.38], shininess: 22 });

        const bounce = Math.abs(Math.sin(time * 3.8 + i * 1.1)) * 0.38;
        Mat4.fromTRS(mTmp, [Math.sin(a) * (R + 6.0), 7.5 + bounce, Math.cos(a) * (R + 6.0)], a, 0, 0, [12.0, 1.2, 1.2]);
        pushMesh('box', mTmp, { color: col, emissive: [col[0] * 0.22, col[1] * 0.22, col[2] * 0.22], castShadow: false });
      }
      return;
    }

    // ===== ENLARGED PRO ROCKET STADIUM (84m x 104m) =====
    const halfW = PITCH_HALF_W;
    const halfL = PITCH_HALF_L;
    const neonCyan = [0.14, 0.88, 1.0];
    const neonOrange = [1.0, 0.54, 0.16];

    // 1. Sideline Walls + Animated LED Perimeter Boards
    for (const side of [-1, 1]) {
      const wx = side * (halfW + 0.55);
      // Animated LED Ad-Board strip right along pitch edge!
      Mat4.fromTRS(mTmp, [wx, 0.95, 0], side < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, 0, 0, [halfL * 2 - 14.0, 1.9, 0.8]);
      pushMesh('box', mTmp, {
        matType: 10,
        color: side < 0 ? [0.06, 0.24, 0.42] : [0.40, 0.16, 0.06],
        color2: side < 0 ? neonCyan : neonOrange,
        castShadow: false,
      });

      // Translucent upper energy glass wall
      Mat4.fromTRS(mTmp, [wx, 5.2, 0], 0, 0, 0, [0.40, 6.6, halfL * 2 - 14.0]);
      pushMesh('box', mTmp, {
        matType: 9,
        color: [0.14, 0.30, 0.50],
        color2: side < 0 ? neonCyan : neonOrange,
        alpha: 0.24,
        doubleSided: true,
        castShadow: false,
      });
    }

    // 2. Smooth 45-degree Corner Bevel Walls (placed outside all goals!)
    const bevels = [
      { x: -halfW + 3.6, z: -halfL + 3.6, ry:  Math.PI * 0.25, c: neonCyan },
      { x:  halfW - 3.6, z: -halfL + 3.6, ry: -Math.PI * 0.25, c: neonOrange },
      { x: -halfW + 3.6, z:  halfL - 3.6, ry: -Math.PI * 0.25, c: neonCyan },
      { x:  halfW - 3.6, z:  halfL - 3.6, ry:  Math.PI * 0.25, c: neonOrange },
    ];
    for (const b of bevels) {
      Mat4.fromTRS(mTmp, [b.x, 0.95, b.z], b.ry, 0, 0, [10.6, 1.9, 1.1]);
      pushMesh('box', mTmp, { color: [0.20, 0.26, 0.36], shininess: 40 });
      Mat4.fromTRS(mTmp, [b.x, 5.2, b.z], b.ry, 0, 0, [10.6, 6.6, 0.38]);
      pushMesh('box', mTmp, {
        matType: 9,
        color: [0.14, 0.28, 0.48],
        color2: b.c,
        alpha: 0.26,
        doubleSided: true,
        castShadow: false,
      });
    }

    // 3. 4 Fluttering Animated Corner Flags!
    const corners = [
      [-halfW + 1.4, -halfL + 1.4, neonCyan],
      [ halfW - 1.4, -halfL + 1.4, neonOrange],
      [-halfW + 1.4,  halfL - 1.4, neonCyan],
      [ halfW - 1.4,  halfL - 1.4, neonOrange],
    ];
    for (const [fx, fz, fc] of corners) {
      Mat4.fromTRS(mTmp, [fx, 1.6, fz], 0, 0, 0, [0.14, 3.2, 0.14]);
      pushMesh('cyl', mTmp, { color: [0.95, 0.97, 1.0] });
      const wave = Math.sin(time * 6.5 + fx) * 0.24;
      Mat4.fromTRS(mTmp, [fx + 0.65, 2.75, fz], wave, 0, 0, [1.25, 0.72, 0.12]);
      pushMesh('box', mTmp, { color: fc, emissive: [fc[0] * 0.22, fc[1] * 0.22, fc[2] * 0.22], castShadow: false });
    }

    // 4. Grand Overhead Stadium Arches & Jumbotron End Frames (100% open goal mouths!)
    for (const endZ of [-halfL - 0.6, halfL + 0.6]) {
      for (const side of [-1, 1]) {
        Mat4.fromTRS(mTmp, [side * (halfW - 6.2), 9.0, endZ], 0, 0, 0, [1.5, 18.0, 1.5]);
        pushMesh('box', mTmp, { color: [0.22, 0.28, 0.40], shininess: 45 });
      }
      Mat4.fromTRS(mTmp, [0, 18.2, endZ], 0, 0, 0, [halfW * 2 - 11.0, 1.1, 1.2]);
      pushMesh('box', mTmp, {
        color: endZ < 0 ? neonCyan : neonOrange,
        emissive: endZ < 0 ? [0.08, 0.42, 0.56] : [0.52, 0.22, 0.05],
      });
      // Elevated End Grandstand behind goal nets
      const standZ = endZ + (endZ < 0 ? -12.5 : 12.5);
      Mat4.fromTRS(mTmp, [0, 4.5, standZ], 0, 0, 0, [halfW * 1.75, 9.0, 8.5]);
      pushMesh('box', mTmp, { color: [0.22, 0.27, 0.38], shininess: 20 });
    }

    // 5. Multi-Tier Sideline Grandstands + Animated Spectators + Curved Roof Canopy
    const standCols = [
      [0.14, 0.78, 0.96],
      [1.00, 0.56, 0.18],
      [0.24, 0.86, 0.48],
      [0.95, 0.30, 0.65],
      [1.00, 0.84, 0.22],
    ];
    for (const side of [-1, 1]) {
      for (let tier = 0; tier < 3; tier++) {
        const sx = side * (halfW + 6.5 + tier * 4.4);
        const sy = 2.0 + tier * 2.8;
        Mat4.fromTRS(mTmp, [sx, sy, 0], 0, 0, 0, [4.2, 4.0 + tier * 3.0, 134.0]);
        pushMesh('box', mTmp, { color: [0.21 + tier * 0.04, 0.26 + tier * 0.04, 0.37 + tier * 0.04], shininess: 22 });

        for (let k = -8; k <= 8; k++) {
          const c = standCols[Math.abs(k + tier * 2) % standCols.length];
          const hop = Math.abs(Math.sin(time * 4.2 + k * 0.8 + tier * 1.3)) * 0.46;
          Mat4.fromTRS(mTmp, [sx - side * 1.4, sy + 2.3 + tier * 1.5 + hop, k * 7.6], 0, 0, 0, [1.4, 1.5, 5.0]);
          pushMesh('box', mTmp, { color: c, shininess: 30, castShadow: false });
        }
      }
      // Roof support pillars
      for (const pz of [-58, -19, 19, 58]) {
        Mat4.fromTRS(mTmp, [side * (halfW + 18.5), 11.0, pz], 0, 0, 0, [1.4, 22.0, 1.4]);
        pushMesh('cyl', mTmp, { color: [0.76, 0.82, 0.90], shininess: 60 });
      }
      // Stadium Roof Canopy
      Mat4.fromTRS(mTmp, [side * (halfW + 14.0), 21.4, 0], 0, 0, side * 0.14, [17.0, 0.95, 140.0]);
      pushMesh('box', mTmp, { color: [0.88, 0.92, 0.98], shininess: 48 });
      // Neon roof trim strip
      Mat4.fromTRS(mTmp, [side * (halfW + 5.8), 20.2, 0], 0, 0, 0, [0.55, 0.55, 140.0]);
      pushMesh('box', mTmp, {
        matType: 5,
        color: side < 0 ? neonCyan : neonOrange,
        emissive: side < 0 ? [0.1, 0.5, 0.65] : [0.65, 0.3, 0.06],
        castShadow: false,
      });
    }

    // 6. 4 Towering Stadium Truss Floodlights (+ Night/Sunset Spotlight Beams!)
    const towers = [
      [-halfW - 9, -halfL - 9],
      [ halfW + 9, -halfL - 9],
      [-halfW - 9,  halfL + 9],
      [ halfW + 9,  halfL + 9],
    ];
    const fg = activeTheme.floodlightGlow;
    for (const [tx, tz] of towers) {
      Mat4.fromTRS(mTmp, [tx, 19.0, tz], 0, 0, 0, [2.0, 38.0, 2.0]);
      pushMesh('cyl', mTmp, { color: [0.70, 0.76, 0.84], shininess: 58 });

      const lookAng = Math.atan2(-tx, -tz);
      Mat4.fromTRS(mTmp, [tx, 38.2, tz], lookAng, 0.28, 0, [9.0, 3.8, 1.5]);
      pushMesh('box', mTmp, { color: [0.14, 0.18, 0.26] });
      Mat4.fromTRS(mTmp, [tx, 38.2, tz], lookAng, 0.28, 0, [8.0, 2.8, 1.65]);
      pushMesh('box', mTmp, {
        matType: 5,
        color: [1.0, 0.98, 0.90],
        emissive: [0.85 * fg, 0.82 * fg, 0.65 * fg],
        castShadow: false,
      });

      // Soft volumetric floodlight glow cone in Night / Sunset modes
      if (activeThemeName !== 'day') {
        const bx = tx * 0.62;
        const bz = tz * 0.62;
        Mat4.fromTRS(mTmp, [bx, 20.0, bz], lookAng, 0.55, 0, [14.0, 36.0, 14.0]);
        pushMesh('cone', mTmp, {
          matType: 5,
          color: activeThemeName === 'night' ? [0.76, 0.90, 1.0] : [1.0, 0.84, 0.58],
          alpha: activeThemeName === 'night' ? 0.08 : 0.05,
          castShadow: false,
          depthWrite: false,
          doubleSided: true,
        });
      }
    }
  }

  function drawGoal(goal, time) {
    const { x, z, width, height, depth, color, labelSlot, flash, facingSouth } = goal;
    const hw = width * 0.5;
    const dir = facingSouth ? -1 : 1;
    const postR = 0.56;
    const glowCol = flash > 0.02 ? [0.25, 1.0, 0.55] : color;
    const emissive = [
      glowCol[0] * (0.30 + flash * 0.85),
      glowCol[1] * (0.30 + flash * 0.85),
      glowCol[2] * (0.30 + flash * 0.85),
    ];

    // Front Goalposts & Crossbar
    Mat4.fromTRS(mTmp, [x - hw, height * 0.5, z], 0, 0, 0, [postR * 2, height, postR * 2]);
    pushMesh('cyl', mTmp, { color: glowCol, emissive, shininess: 85 });
    Mat4.fromTRS(mTmp, [x + hw, height * 0.5, z], 0, 0, 0, [postR * 2, height, postR * 2]);
    pushMesh('cyl', mTmp, { color: glowCol, emissive, shininess: 85 });
    Mat4.fromTRS(mTmp, [x, height, z], 0, 0, Math.PI * 0.5, [postR * 2.1, width + postR * 2, postR * 2.1]);
    pushMesh('cyl', mTmp, { color: glowCol, emissive, shininess: 85 });

    // Back Net Support Frame
    const backZ = z + dir * depth;
    Mat4.fromTRS(mTmp, [x - hw, height * 0.46, backZ], 0, 0, 0, [0.50, height * 0.92, 0.50]);
    pushMesh('cyl', mTmp, { color: [0.76, 0.82, 0.92], shininess: 55 });
    Mat4.fromTRS(mTmp, [x + hw, height * 0.46, backZ], 0, 0, 0, [0.50, height * 0.92, 0.50]);
    pushMesh('cyl', mTmp, { color: [0.76, 0.82, 0.92], shininess: 55 });
    Mat4.fromTRS(mTmp, [x, height * 0.92, backZ], 0, 0, Math.PI * 0.5, [0.50, width, 0.50]);
    pushMesh('cyl', mTmp, { color: [0.76, 0.82, 0.92], shininess: 55 });
    Mat4.fromTRS(mTmp, [x - hw, height * 0.96, z + dir * depth * 0.5], 0, Math.PI * 0.5, 0, [0.46, depth, 0.46]);
    pushMesh('cyl', mTmp, { color: glowCol, emissive });
    Mat4.fromTRS(mTmp, [x + hw, height * 0.96, z + dir * depth * 0.5], 0, Math.PI * 0.5, 0, [0.46, depth, 0.46]);
    pushMesh('cyl', mTmp, { color: glowCol, emissive });

    // Glowing floor goal-line strip
    Mat4.fromTRS(mTmp, [x, 0.05, z], 0, 0, 0, [width, 0.08, 0.90]);
    pushMesh('box', mTmp, {
      matType: 5,
      color: glowCol,
      emissive: [glowCol[0] * 0.72, glowCol[1] * 0.72, glowCol[2] * 0.72],
      alpha: 0.92,
      castShadow: false,
    });

    // Woven 3D Nets
    const netOpts = {
      matType: 8,
      color: [0.86, 0.94, 1.0],
      color2: glowCol,
      emissive: [glowCol[0] * 0.20, glowCol[1] * 0.20, glowCol[2] * 0.20],
      alpha: 0.84,
      extra: [flash, 0, 0, 0],
      doubleSided: true,
      castShadow: false,
      depthWrite: false,
    };
    Mat4.fromTRS(mTmp, [x, height * 0.46, backZ], 0, 0, 0, [width, height * 0.92, 1]);
    pushMesh('quad', mTmp, netOpts);
    Mat4.fromTRS(mTmp, [x - hw, height * 0.48, z + dir * depth * 0.5], Math.PI * 0.5, 0, 0, [depth, height * 0.96, 1]);
    pushMesh('quad', mTmp, netOpts);
    Mat4.fromTRS(mTmp, [x + hw, height * 0.48, z + dir * depth * 0.5], Math.PI * 0.5, 0, 0, [depth, height * 0.96, 1]);
    pushMesh('quad', mTmp, netOpts);
    Mat4.fromTRS(mTmp, [x, height * 0.96, z + dir * depth * 0.5], 0, Math.PI * 0.5, 0, [width, depth, 1]);
    pushMesh('quad', mTmp, netOpts);

    // Giant Elevated LED Rounding Scoreboard above Crossbar
    if (labelSlot !== undefined && labelSlot >= 0) {
      const bob = Math.sin(time * 2.5 + x * 0.16) * 0.16;
      const signY = height + 3.6 + bob;

      Mat4.fromTRS(mTmp, [x - 3.2, height + 1.2, z], 0, 0, 0, [0.42, 2.4, 0.42]);
      pushMesh('box', mTmp, { color: [0.22, 0.28, 0.38] });
      Mat4.fromTRS(mTmp, [x + 3.2, height + 1.2, z], 0, 0, 0, [0.42, 2.4, 0.42]);
      pushMesh('box', mTmp, { color: [0.22, 0.28, 0.38] });

      Mat4.fromTRS(mTmp, [x, signY, z - dir * 0.16], 0, 0, 0, [11.0, 6.0, 0.72]);
      pushMesh('box', mTmp, { color: [0.08, 0.14, 0.24], shininess: 65 });

      const faceZ = z - dir * 0.56;
      const faceRotY = facingSouth ? 0 : Math.PI;
      Mat4.fromTRS(mTmp, [x, signY, faceZ], faceRotY, 0, 0, [10.8, 7.2, 1]);
      pushMesh('quad', mTmp, {
        matType: 7,
        color: [1, 1, 1],
        emissive: flash > 0.05 ? [0.18, 0.50, 0.24] : [0.06, 0.08, 0.12],
        alpha: 1.0,
        extra: [labelSlot, 0, 0, 0],
        doubleSided: true,
        castShadow: false,
      });

      if (goal.hintGlow > 0.1) {
        const pulseY = signY + 4.4 + Math.sin(time * 7.0) * 0.5;
        Mat4.fromTRS(mTmp, [x, pulseY, z], 0, Math.PI, 0, [2.1, 2.3, 2.1]);
        pushMesh('cone', mTmp, {
          matType: 5,
          color: [1.0, 0.88, 0.22],
          emissive: [0.7, 0.5, 0.05],
          alpha: 0.95,
          castShadow: false,
        });
      }
    }
  }

  // ==================== 6 DISTINCT 3D CAR MODELS ====================

  function drawRocketCar(car, time) {
    const pos = car.pos;
    const yaw = car.yaw;
    const pitch = car.pitch || 0;
    const roll = car.roll || 0;
    const boostAmt = (car.boosting || car.overdriveTimer > 0) ? 1.0 : 0.0;
    const style = car.bodyStyle || 'gt';
    const primary = car.color;
    const stripe = car.accent;
    const rimCol = car.teamRim || stripe;

    // Ground soft contact shadow
    const shW = style === 'monster' ? 4.2 : style === 'titan' ? 3.8 : 3.4;
    const shL = style === 'formula' ? 6.0 : 5.4;
    Mat4.fromTRS(mTmp, [pos[0], 0.06, pos[2]], yaw, Math.PI * 0.5, 0, [shW, shL, 1]);
    pushMesh('quad', mTmp, {
      matType: 5,
      color: [0.02, 0.06, 0.05],
      alpha: clamp(0.48 - pos[1] * 0.05, 0.1, 0.48),
      extra: [2.0, 0, 0, 0],
      doubleSided: true,
      castShadow: false,
      depthWrite: false,
    });

    // Special Ability Active 3D Glowing Aura Ring around the car!
    if (car.magnetTimer > 0 || car.overdriveTimer > 0 || car.slowFieldTimer > 0) {
      const auraCol = car.magnetTimer > 0 ? [0.95, 0.28, 0.88] : car.slowFieldTimer > 0 ? [0.28, 0.92, 1.0] : [1.0, 0.84, 0.20];
      Mat4.fromTRS(mTmp, [pos[0], pos[1] + 0.55, pos[2]], time * 3.0, 0, 0, [5.8, 0.5, 5.8]);
      pushMesh('torus', mTmp, {
        matType: 5,
        color: auraCol,
        emissive: [auraCol[0] * 0.65, auraCol[1] * 0.65, auraCol[2] * 0.65],
        alpha: 0.72,
        extra: [1.0, time * 2.0, 0, 0],
        castShadow: false,
        depthWrite: false,
      });
    }

    const baseLift = style === 'monster' ? 1.48 : style === 'formula' ? 0.78 : style === 'titan' ? 1.12 : 0.98;
    const carBase = Mat4.create();
    Mat4.fromTRS(carBase, [pos[0], pos[1] + baseLift, pos[2]], yaw, pitch, roll, [1, 1, 1]);

    const localM = Mat4.create();
    const worldM = Mat4.create();
    function addPart(mesh, lx, ly, lz, rx, ry, rz, sx, sy, sz, opts) {
      Mat4.fromTRS(localM, [lx, ly, lz], ry, rx, rz, [sx, sy, sz]);
      Mat4.multiply(worldM, carBase, localM);
      pushMesh(mesh, worldM, opts);
    }

    const wheelSpin = car.wheelSpin || 0;
    const steerVis = clamp((car.steerInput || 0) * 0.38, -0.4, 0.4);
    let wheelCfg;
    let exhausts = [[-0.52, 0.06, -2.28], [0.52, 0.06, -2.28]];

    if (style === 'monster') {
      // 🚙 CANAVAR 4x4 — Lifted Monster Truck with Oversized Off-Road Tires & Rollbar!
      addPart('box', 0, 0.16, 0.0, 0, 0, 0, 2.65, 1.05, 4.55, { matType: 2, color: primary, color2: stripe, extra: [0, 0, boostAmt, 0] });
      addPart('box', 0, 0.96, 0.25, -0.06, 0, 0, 2.25, 0.92, 2.10, { color: [0.09, 0.16, 0.26], color2: [0.55, 0.88, 1.0], extra: [1, 0, 0, 0], shininess: 105 });
      addPart('box', 0, 1.46, 0.25, 0, 0, 0, 2.15, 0.20, 1.95, { matType: 2, color: primary, color2: stripe });
      // Chrome front bullbar
      addPart('box', 0, -0.15, 2.48, 0, 0, 0, 2.55, 0.55, 0.34, { color: [0.80, 0.86, 0.92], shininess: 110 });
      // Pickup bed rollbar + roof floodlights
      addPart('cyl', -0.92, 1.02, -1.10, 0, 0, 0, 0.22, 1.05, 0.22, { color: [0.82, 0.88, 0.94], shininess: 95 });
      addPart('cyl',  0.92, 1.02, -1.10, 0, 0, 0, 0.22, 1.05, 0.22, { color: [0.82, 0.88, 0.94], shininess: 95 });
      addPart('cyl',  0.00, 1.52, -1.10, 0, 0, Math.PI * 0.5, 0.22, 2.05, 0.22, { color: [0.82, 0.88, 0.94], shininess: 95 });
      for (const lx of [-0.55, 0, 0.55]) {
        addPart('sphereLow', lx, 1.66, -1.02, 0, 0, 0, 0.22, 0.22, 0.22, { matType: 5, color: [1.0, 0.96, 0.72], emissive: [0.9, 0.85, 0.45], castShadow: false });
      }
      // Suspension axles
      addPart('box', 0, -0.58,  1.45, 0, 0, 0, 3.15, 0.24, 0.32, { color: [0.22, 0.25, 0.32] });
      addPart('box', 0, -0.58, -1.45, 0, 0, 0, 3.15, 0.24, 0.32, { color: [0.22, 0.25, 0.32] });
      wheelCfg = [
        [-1.72, -0.62,  1.48, 1.72, 0.82, true],
        [ 1.72, -0.62,  1.48, 1.72, 0.82, true],
        [-1.72, -0.62, -1.48, 1.72, 0.82, false],
        [ 1.72, -0.62, -1.48, 1.72, 0.82, false],
      ];
      exhausts = [[-0.65, -0.10, -2.35], [0.65, -0.10, -2.35]];
    } else if (style === 'formula') {
      // 🏁 YILDIZ F1 — Open-Wheel Formula Racer with Wide Front/Rear Aero Wings!
      addPart('box', 0, -0.02, -0.25, 0, 0, 0, 1.32, 0.62, 3.65, { matType: 2, color: primary, color2: stripe, extra: [0, 0, boostAmt, 0] });
      // Tapered pointed nose cone
      addPart('box', 0, -0.12, 2.25, 0.14, 0, 0, 0.74, 0.38, 1.75, { matType: 2, color: primary, color2: stripe, extra: [0, 0, boostAmt, 0] });
      // Wide front F1 aero wing + endplates
      addPart('box', 0, -0.28, 2.95, 0.08, 0, 0, 2.95, 0.14, 0.78, { matType: 2, color: stripe, color2: primary });
      addPart('box', -1.48, -0.16, 2.95, 0, 0, 0, 0.12, 0.42, 0.85, { color: primary });
      addPart('box',  1.48, -0.16, 2.95, 0, 0, 0, 0.12, 0.42, 0.85, { color: primary });
      // Sidepods
      addPart('box', -0.96, -0.06, -0.45, 0, 0, 0, 0.68, 0.52, 2.05, { matType: 2, color: primary, color2: stripe });
      addPart('box',  0.96, -0.06, -0.45, 0, 0, 0, 0.68, 0.52, 2.05, { matType: 2, color: primary, color2: stripe });
      // Open cockpit + driver helmet + tall airbox intake
      addPart('sphereLow', 0, 0.58, -0.10, 0, 0, 0, 0.42, 0.42, 0.45, { color: [1.0, 0.92, 0.25], shininess: 110 });
      addPart('box', 0, 0.72, -0.82, -0.20, 0, 0, 0.55, 0.72, 1.15, { matType: 2, color: primary, color2: stripe });
      // Huge F1 Rear Wing
      addPart('box', -1.18, 0.62, -2.35, 0, 0, 0, 0.12, 1.05, 0.76, { color: primary });
      addPart('box',  1.18, 0.62, -2.35, 0, 0, 0, 0.12, 1.05, 0.76, { color: primary });
      addPart('box',  0.00, 1.08, -2.42, -0.18, 0, 0, 2.48, 0.16, 0.72, { matType: 2, color: stripe, color2: primary });
      wheelCfg = [
        [-1.38, -0.22,  1.88, 1.12, 0.58, true],
        [ 1.38, -0.22,  1.88, 1.12, 0.58, true],
        [-1.46, -0.16, -1.62, 1.32, 0.76, false],
        [ 1.46, -0.16, -1.62, 1.32, 0.76, false],
      ];
      exhausts = [[0.0, 0.04, -2.25]];
    } else if (style === 'cyber') {
      // 🛸 CYBER PİKAP — Sharp Angular Wedge Pickup with Glowing Full-Width Neon Lightbars!
      addPart('box', 0, 0.06, 0.0, 0, 0, 0, 2.48, 0.86, 4.75, { matType: 2, color: primary, color2: stripe, extra: [0, 0, boostAmt, 0] });
      // Sharp angular triangular-feeling sloped windshield & roof wedge
      addPart('box', 0, 0.74, 0.55, 0.34, 0, 0, 2.26, 0.62, 2.10, { color: [0.08, 0.14, 0.24], color2: stripe, extra: [1, 0, 0, 0], shininess: 120 });
      addPart('box', 0, 0.72, -1.10, -0.26, 0, 0, 2.26, 0.58, 2.15, { matType: 2, color: primary, color2: stripe });
      // Signature full-width glowing Cyber LED front & rear lightbars!
      addPart('box', 0, 0.28, 2.42, 0, 0, 0, 2.44, 0.22, 0.16, { matType: 5, color: stripe, emissive: [stripe[0] * 0.9, stripe[1] * 0.9, stripe[2] * 0.9], castShadow: false });
      addPart('box', 0, 0.36, -2.42, 0, 0, 0, 2.44, 0.20, 0.16, { matType: 5, color: [1.0, 0.22, 0.42], emissive: [0.95, 0.15, 0.32], castShadow: false });
      wheelCfg = [
        [-1.38, -0.34,  1.52, 1.28, 0.60, true],
        [ 1.38, -0.34,  1.52, 1.28, 0.60, true],
        [-1.38, -0.34, -1.52, 1.28, 0.60, false],
        [ 1.38, -0.34, -1.52, 1.28, 0.60, false],
      ];
      exhausts = [[-0.64, -0.05, -2.45], [0.64, -0.05, -2.45]];
    } else if (style === 'rally') {
      // 🚗 MİNİ RALLİ — Agile Compact Hatchback Rally Car with Quad Nose Fog-Lamps!
      addPart('box', 0, 0.04, 0.0, 0, 0, 0, 2.28, 0.84, 3.85, { matType: 2, color: primary, color2: stripe, extra: [0, 0, boostAmt, 0] });
      addPart('box', 0, 0.78, -0.20, -0.06, 0, 0, 1.98, 0.82, 2.25, { color: [0.09, 0.17, 0.28], color2: [0.6, 0.9, 1.0], extra: [1, 0, 0, 0], shininess: 100 });
      addPart('box', 0, 1.22, -0.22, 0, 0, 0, 1.88, 0.18, 2.00, { matType: 2, color: primary, color2: stripe });
      // Roof air scoop + hatchback rally spoiler
      addPart('box', 0, 1.38, 0.15, 0, 0, 0, 0.70, 0.26, 0.75, { color: stripe });
      addPart('box', 0, 1.24, -1.52, -0.22, 0, 0, 2.15, 0.18, 0.56, { color: stripe });
      // 4 Iconic Round Rally Fog Lamps on nose!
      for (const lx of [-0.62, -0.22, 0.22, 0.62]) {
        addPart('sphereLow', lx, 0.12, 1.98, 0, 0, 0, 0.21, 0.21, 0.18, { matType: 5, color: [1.0, 0.96, 0.75], emissive: [0.9, 0.85, 0.45], castShadow: false });
      }
      wheelCfg = [
        [-1.26, -0.34,  1.25, 1.18, 0.56, true],
        [ 1.26, -0.34,  1.25, 1.18, 0.56, true],
        [-1.26, -0.34, -1.25, 1.18, 0.56, false],
        [ 1.26, -0.34, -1.25, 1.18, 0.56, false],
      ];
      exhausts = [[-0.45, -0.14, -2.02], [0.45, -0.14, -2.02]];
    } else if (style === 'titan') {
      // 🛡️ ZIRHLI KAPTAN — Heavy Wide-Stance Armored Race Van / Interceptor!
      addPart('box', 0, 0.28, -0.05, 0, 0, 0, 2.68, 1.28, 4.65, { matType: 2, color: primary, color2: stripe, extra: [0, 0, boostAmt, 0] });
      addPart('box', 0, 0.85, 1.38, 0.28, 0, 0, 2.38, 0.76, 1.25, { color: [0.08, 0.16, 0.28], color2: stripe, extra: [1, 0, 0, 0], shininess: 110 });
      // Heavy front armored wedge ram-bumper
      addPart('box', 0, -0.18, 2.48, 0, 0, 0, 2.75, 0.54, 0.52, { color: [0.18, 0.24, 0.34], shininess: 85 });
      // Dual glowing roof beacons + top wing
      addPart('box', -0.58, 1.12, 0.55, 0, 0, 0, 0.48, 0.26, 0.36, { matType: 5, color: stripe, emissive: [stripe[0] * 0.8, stripe[1] * 0.8, stripe[2] * 0.8], castShadow: false });
      addPart('box',  0.58, 1.12, 0.55, 0, 0, 0, 0.48, 0.26, 0.36, { matType: 5, color: [1.0, 0.82, 0.2], emissive: [0.85, 0.62, 0.08], castShadow: false });
      addPart('box',  0.00, 1.22, -2.02, -0.15, 0, 0, 2.66, 0.22, 0.72, { matType: 2, color: stripe, color2: primary });
      wheelCfg = [
        [-1.48, -0.44,  1.52, 1.36, 0.66, true],
        [ 1.48, -0.44,  1.52, 1.36, 0.66, true],
        [-1.48, -0.44, -1.52, 1.36, 0.66, false],
        [ 1.48, -0.44, -1.52, 1.36, 0.66, false],
      ];
      exhausts = [[-0.68, -0.06, -2.42], [0.68, -0.06, -2.42]];
    } else {
      // 🏎️ ŞİMŞEK GT (Default) — Sleek Aerodynamic Supercar Buggy!
      addPart('box', 0, 0.05, 0.1, 0, 0, 0, 2.38, 0.82, 4.40, { matType: 2, color: primary, color2: stripe, extra: [0, 0, boostAmt, 0] });
      addPart('box', 0, -0.05, 2.18, 0.24, 0, 0, 2.16, 0.56, 1.38, { matType: 2, color: primary, color2: stripe, extra: [0, 0, boostAmt, 0] });
      addPart('box', 0, -0.26, 2.70, 0, 0, 0, 2.32, 0.34, 0.42, { color: [0.16, 0.20, 0.28], shininess: 65 });
      addPart('box', 0, 0.72, -0.18, -0.10, 0, 0, 1.84, 0.78, 2.15, { color: [0.09, 0.17, 0.28], color2: [0.50, 0.86, 1.0], extra: [1, 0, 0, 0], shininess: 110 });
      addPart('box', 0, 1.12, -0.35, 0, 0, 0, 0.76, 0.24, 0.95, { matType: 2, color: stripe, color2: primary });
      addPart('box', -0.78, 0.86, -1.92, -0.22, 0, 0, 0.16, 0.95, 0.36, { color: [0.14, 0.18, 0.25] });
      addPart('box',  0.78, 0.86, -1.92, -0.22, 0, 0, 0.16, 0.95, 0.36, { color: [0.14, 0.18, 0.25] });
      addPart('box',  0.00, 1.32, -2.08, -0.18, 0, 0, 2.62, 0.18, 0.70, { matType: 2, color: primary, color2: stripe, extra: [0, 0, boostAmt, 0] });
      addPart('box', -0.76, 0.08, 2.68, 0, 0, 0, 0.46, 0.24, 0.16, { matType: 5, color: [1.0, 0.98, 0.82], emissive: [0.85, 0.80, 0.45], castShadow: false });
      addPart('box',  0.76, 0.08, 2.68, 0, 0, 0, 0.46, 0.24, 0.16, { matType: 5, color: [1.0, 0.98, 0.82], emissive: [0.85, 0.80, 0.45], castShadow: false });
      wheelCfg = [
        [-1.32, -0.34,  1.42, 1.18, 0.56, true],
        [ 1.32, -0.34,  1.42, 1.18, 0.56, true],
        [-1.36, -0.30, -1.35, 1.32, 0.62, false],
        [ 1.36, -0.30, -1.35, 1.32, 0.62, false],
      ];
    }

    // Draw Rocket Exhaust Nozzles + Dynamic Boost Flames
    for (const [ex, ey, ez] of exhausts) {
      addPart('cyl', ex, ey, ez, Math.PI * 0.5, 0, 0, 0.56, 0.62, 0.56, { color: [0.24, 0.28, 0.36], shininess: 85 });
      addPart('cyl', ex, ey, ez - 0.28, Math.PI * 0.5, 0, 0, 0.38, 0.12, 0.38, {
        matType: 5,
        color: boostAmt > 0.1 ? [1.0, 0.94, 0.45] : rimCol,
        emissive: boostAmt > 0.1 ? [1.0, 0.55, 0.10] : [rimCol[0] * 0.4, rimCol[1] * 0.4, rimCol[2] * 0.4],
        castShadow: false,
      });
      if (boostAmt > 0.1) {
        const flicker = 1.75 + Math.sin(time * 48.0 + ex * 10.0) * 0.52;
        addPart('cone', ex, ey, ez - 0.38 - flicker * 0.5, -Math.PI * 0.5, 0, 0, 0.68, flicker, 0.68, {
          matType: 5,
          color: rimCol,
          emissive: [1.0, 0.55, 0.12],
          alpha: 0.88,
          castShadow: false,
          depthWrite: false,
        });
        addPart('cone', ex, ey, ez - 0.35 - flicker * 0.3, -Math.PI * 0.5, 0, 0, 0.38, flicker * 0.65, 0.38, {
          matType: 5,
          color: [1.0, 0.98, 0.80],
          emissive: [1.0, 0.92, 0.5],
          alpha: 0.95,
          castShadow: false,
          depthWrite: false,
        });
      }
    }

    // Draw Wheels with Team/Accent Glowing Rims
    for (const [wx, wy, wz, rScale, width, isFront] of wheelCfg) {
      const wSteer = isFront ? steerVis : 0;
      addPart('cyl', wx, wy, wz, wheelSpin, wSteer, Math.PI * 0.5, rScale, width, rScale, {
        color: [0.10, 0.12, 0.16],
        shininess: 24,
      });
      addPart('cyl', wx + (wx < 0 ? -width * 0.28 : width * 0.28), wy, wz, wheelSpin, wSteer, Math.PI * 0.5, rScale * 0.56, width * 0.55, rScale * 0.56, {
        color: rimCol,
        emissive: [rimCol[0] * 0.32, rimCol[1] * 0.32, rimCol[2] * 0.32],
        shininess: 95,
      });
    }
  }

  function drawPaintRover(rover, time) {
    const pos = rover.pos;
    const yaw = rover.yaw;
    const aimYaw = rover.aimYaw !== undefined ? rover.aimYaw : yaw;
    const aimPitch = rover.aimPitch || 0.12;
    const recoil = rover.recoil || 0;
    const primary = rover.color;
    const accent = rover.accent;

    Mat4.fromTRS(mTmp, [pos[0], 0.06, pos[2]], yaw, Math.PI * 0.5, 0, [4.2, 4.2, 1]);
    pushMesh('quad', mTmp, {
      matType: 5,
      color: [0.03, 0.06, 0.10],
      alpha: 0.42,
      extra: [2.0, 0, 0, 0],
      doubleSided: true,
      castShadow: false,
      depthWrite: false,
    });

    const hoverBob = Math.sin(time * 4.5 + rover.id * 2.0) * 0.10;
    const baseM = Mat4.create();
    Mat4.fromTRS(baseM, [pos[0], 0.85 + hoverBob, pos[2]], yaw, 0, 0, [1, 1, 1]);
    const localM = Mat4.create();
    const worldM = Mat4.create();

    function addBase(mesh, lx, ly, lz, rx, ry, rz, sx, sy, sz, opts) {
      Mat4.fromTRS(localM, [lx, ly, lz], ry, rx, rz, [sx, sy, sz]);
      Mat4.multiply(worldM, baseM, localM);
      pushMesh(mesh, worldM, opts);
    }

    addBase('torus', 0, -0.28, 0, 0, 0, 0, 3.3, 1.35, 3.3, {
      color: [0.16, 0.22, 0.34],
      color2: accent,
      extra: [1, 0, 0, 0],
      shininess: 75,
    });
    addBase('cyl', 0, -0.05, 0, 0, 0, 0, 2.9, 0.72, 2.9, { matType: 2, color: primary, color2: accent });

    const turretM = Mat4.create();
    Mat4.fromTRS(turretM, [pos[0], 1.55 + hoverBob, pos[2]], aimYaw, 0, 0, [1, 1, 1]);
    function addTurret(mesh, lx, ly, lz, rx, ry, rz, sx, sy, sz, opts) {
      Mat4.fromTRS(localM, [lx, ly, lz], ry, rx, rz, [sx, sy, sz]);
      Mat4.multiply(worldM, turretM, localM);
      pushMesh(mesh, worldM, opts);
    }

    addTurret('sphereLow', 0, 0.15, 0, 0, 0, 0, 1.15, 0.90, 1.25, { matType: 2, color: primary, color2: [1, 1, 1] });
    const paintCol = rover.nextPaintColor || accent;
    addTurret('sphereLow', 0, 1.05, -0.25, 0, 0, 0, 0.64, 0.64, 0.64, {
      matType: 4,
      color: paintCol,
      emissive: [paintCol[0] * 0.34, paintCol[1] * 0.34, paintCol[2] * 0.34],
    });

    const pitchM = Mat4.create();
    Mat4.fromTRS(pitchM, [pos[0], 1.68 + hoverBob, pos[2]], aimYaw, -aimPitch, 0, [1, 1, 1]);
    function addBarrel(mesh, lx, ly, lz, rx, ry, rz, sx, sy, sz, opts) {
      Mat4.fromTRS(localM, [lx, ly, lz], ry, rx, rz, [sx, sy, sz]);
      Mat4.multiply(worldM, pitchM, localM);
      pushMesh(mesh, worldM, opts);
    }

    const rOff = -recoil * 0.55;
    addBarrel('cyl', 0, 0, 1.48 + rOff, Math.PI * 0.5, 0, 0, 0.70, 2.35, 0.70, { color: [0.88, 0.92, 0.98], shininess: 85 });
    addBarrel('torus', 0, 0, 2.58 + rOff, Math.PI * 0.5, 0, 0, 0.85, 0.85, 0.85, {
      color: paintCol,
      emissive: [paintCol[0] * 0.42, paintCol[1] * 0.42, paintCol[2] * 0.42],
      shininess: 90,
    });

    const beamLen = rover.aimDist || 26.0;
    const lockCol = rover.lockedTarget ? [0.22, 1.0, 0.52] : accent;
    addBarrel('cyl', 0, 0, 2.75 + beamLen * 0.5, Math.PI * 0.5, 0, 0, rover.lockedTarget ? 0.14 : 0.08, beamLen, rover.lockedTarget ? 0.14 : 0.08, {
      matType: 5,
      color: lockCol,
      emissive: [lockCol[0] * 0.7, lockCol[1] * 0.7, lockCol[2] * 0.7],
      alpha: rover.lockedTarget ? 0.65 : 0.34,
      castShadow: false,
      depthWrite: false,
    });
  }

  function drawSoccerBall(ball, time, targetLabelSlot) {
    const pos = ball.pos;
    const r = ball.radius;

    const shadowScale = clamp(1.0 - pos[1] * 0.03, 0.45, 1.0) * r * 2.35;
    Mat4.fromTRS(mTmp, [pos[0], 0.06, pos[2]], 0, Math.PI * 0.5, 0, [shadowScale, shadowScale, 1]);
    pushMesh('quad', mTmp, {
      matType: 5,
      color: [0.02, 0.06, 0.04],
      alpha: 0.48,
      extra: [2.0, 0, 0, 0],
      doubleSided: true,
      castShadow: false,
      depthWrite: false,
    });

    Mat4.fromTRS(mTmp, [pos[0], 0.08, pos[2]], 0, 0, 0, [r * 2.3, 0.25, r * 2.3]);
    pushMesh('torus', mTmp, {
      matType: 5,
      color: ball.slowTimer > 0 ? [0.4, 0.95, 1.0] : [0.22, 0.92, 1.0],
      emissive: [0.15, 0.65, 0.85],
      alpha: 0.74,
      extra: [1.0, time * 2.0, 0, 0],
      castShadow: false,
      depthWrite: false,
    });

    const seamCol = ball.slowTimer > 0 ? [0.45, 0.96, 1.0] : ball.giantTimer > 0 ? [1.0, 0.78, 0.16] : [0.18, 0.88, 1.0];
    Mat4.fromTRS(mTmp, pos, ball.rotY || 0, ball.rotX || 0, ball.rotZ || 0, [r, r, r]);
    pushMesh('sphere', mTmp, {
      matType: 3,
      color: [1, 1, 1],
      color2: seamCol,
      emissive: ball.slowTimer > 0 ? [0.08, 0.24, 0.34] : ball.giantTimer > 0 ? [0.14, 0.10, 0.0] : [0, 0, 0],
    });

    if (targetLabelSlot !== undefined && targetLabelSlot >= 0) {
      const floatY = pos[1] + r + 2.6 + Math.sin(time * 3.8) * 0.24;
      Mat4.fromTRS(mTmp, [pos[0], floatY, pos[2]], 0, 0, 0, [1, 1, 1]);
      pushMesh('quad', mTmp, {
        matType: 7,
        billboard: 1,
        color: [1, 1, 1],
        emissive: [0.08, 0.10, 0.12],
        alpha: 1.0,
        extra: [targetLabelSlot, 0.4, 5.2, 5.2],
        doubleSided: true,
        castShadow: false,
      });
    }
  }

  function drawBalloon(b, time) {
    const pos = b.pos;
    const r = b.radius * (1.0 + (b.wobble || 0) * Math.sin(time * 28.0) * 0.14);

    Mat4.fromTRS(mTmp, [pos[0], 0.06, pos[2]], 0, Math.PI * 0.5, 0, [r * 1.9, r * 1.9, 1]);
    pushMesh('quad', mTmp, {
      matType: 5,
      color: [0.03, 0.06, 0.12],
      alpha: 0.34,
      extra: [2.0, 0, 0, 0],
      doubleSided: true,
      castShadow: false,
      depthWrite: false,
    });

    let extraMode = 0.0;
    if (b.kind === 'rainbow') extraMode = 1.0;
    else if (b.kind === 'mine') extraMode = -1.0;

    Mat4.fromTRS(mTmp, pos, b.spin || 0, 0, 0, [r, r * 1.12, r]);
    pushMesh('sphere', mTmp, {
      matType: 4,
      color: b.color,
      emissive: b.kind === 'gold' ? [0.26, 0.20, 0.02] : [b.color[0] * 0.08, b.color[1] * 0.08, b.color[2] * 0.08],
      extra: [extraMode, 0, 0, 0],
    });

    if (b.kind === 'mine') {
      const dirs = [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
      for (const d of dirs) {
        Mat4.fromTRS(mTmp, [pos[0] + d[0] * r * 1.05, pos[1] + d[1] * r * 1.05, pos[2] + d[2] * r * 1.05], 0, d[2] * Math.PI * 0.5, -d[0] * Math.PI * 0.5, [0.55, 0.85, 0.55]);
        pushMesh('cone', mTmp, { color: [0.95, 0.22, 0.28], emissive: [0.35, 0.05, 0.08] });
      }
    } else {
      Mat4.fromTRS(mTmp, [pos[0], pos[1] - r * 1.16, pos[2]], 0, Math.PI, 0, [0.46, 0.42, 0.46]);
      pushMesh('cone', mTmp, { color: b.color });
      const sway = Math.sin(time * 4.2 + b.phase) * 0.22;
      Mat4.fromTRS(mTmp, [pos[0] + sway, pos[1] - r * 1.16 - 1.05, pos[2]], 0, 0, sway * 0.45, [0.09, 2.0, 0.09]);
      pushMesh('cyl', mTmp, { color: [0.96, 0.96, 1.0], castShadow: false });
    }

    if (b.labelSlot !== undefined && b.labelSlot >= 0) {
      const badgeSize = b.kind === 'edu' ? r * 2.38 : r * 1.55;
      Mat4.fromTRS(mTmp, [pos[0], pos[1], pos[2]], 0, 0, 0, [1, 1, 1]);
      pushMesh('quad', mTmp, {
        matType: 7,
        billboard: 1,
        color: [1, 1, 1],
        emissive: [0.06, 0.06, 0.08],
        alpha: 1.0,
        extra: [b.labelSlot, r * 1.08, badgeSize, badgeSize],
        doubleSided: true,
        castShadow: false,
      });
    }

    if (b.hintGlow > 0.1) {
      Mat4.fromTRS(mTmp, pos, time * 2.5, Math.PI * 0.2, 0, [r * 2.55, r * 2.55, r * 2.55]);
      pushMesh('torus', mTmp, {
        matType: 5,
        color: [1.0, 0.88, 0.22],
        emissive: [0.8, 0.6, 0.08],
        alpha: 0.9,
        castShadow: false,
        depthWrite: false,
      });
    }
  }

  function drawBoostPad(pad, time) {
    Mat4.fromTRS(mTmp, [pad.x, 0.08, pad.z], pad.yaw || 0, 0, 0, [3.6, 0.14, 5.0]);
    pushMesh('box', mTmp, {
      matType: 6,
      color: [0.10, 0.65, 1.0],
      color2: [1.0, 0.84, 0.22],
      extra: [pad.ready ? 1.0 : 0.0, 0, 0, 0],
      castShadow: false,
    });
    if (pad.ready) {
      const bob = 1.15 + Math.sin(time * 4.5 + pad.x) * 0.26;
      Mat4.fromTRS(mTmp, [pad.x, bob, pad.z], time * 2.4, Math.PI * 0.25, Math.PI * 0.25, [0.82, 0.82, 0.82]);
      pushMesh('box', mTmp, {
        matType: 5,
        color: [1.0, 0.86, 0.24],
        emissive: [0.65, 0.45, 0.05],
        alpha: 0.92,
        castShadow: false,
      });
    }
  }

  function drawJumpPad(jp, time) {
    Mat4.fromTRS(mTmp, [jp.x, 0.14, jp.z], 0, 0, 0, [5.4, 0.26, 5.4]);
    pushMesh('cyl', mTmp, {
      color: [0.14, 0.22, 0.34],
      color2: [0.22, 0.96, 0.56],
      extra: [1, 0, 0, 0],
      shininess: 85,
      castShadow: false,
    });
    const pulse = 0.45 + Math.abs(Math.sin(time * 4.2)) * 0.65;
    Mat4.fromTRS(mTmp, [jp.x, 0.35 + pulse * 0.35, jp.z], 0, 0, 0, [4.6, 0.28, 4.6]);
    pushMesh('torus', mTmp, {
      matType: 5,
      color: [0.22, 1.0, 0.58],
      emissive: [0.15, 0.78, 0.42],
      alpha: 0.82,
      castShadow: false,
      depthWrite: false,
    });
  }

  function drawPowerUp(pu, time) {
    const bob = 2.0 + Math.sin(time * 4.0 + pu.phase) * 0.38;
    Mat4.fromTRS(mTmp, [pu.x, bob, pu.z], time * 2.0, 0, 0, [2.4, 2.4, 2.4]);
    pushMesh('torus', mTmp, {
      matType: 5,
      color: pu.color,
      emissive: [pu.color[0] * 0.55, pu.color[1] * 0.55, pu.color[2] * 0.55],
      alpha: 0.85,
      castShadow: false,
      depthWrite: false,
    });
    Mat4.fromTRS(mTmp, [pu.x, bob, pu.z], 0, 0, 0, [1, 1, 1]);
    pushMesh('quad', mTmp, {
      matType: 7,
      billboard: 1,
      color: [1, 1, 1],
      extra: [pu.iconSlot, 0.2, 2.3, 2.3],
      doubleSided: true,
      castShadow: false,
    });
  }

  function drawPaintball(pb) {
    Mat4.fromTRS(mTmp, pb.pos, 0, 0, 0, [pb.radius, pb.radius, pb.radius]);
    pushMesh('sphereLow', mTmp, {
      matType: 4,
      color: pb.color,
      emissive: [pb.color[0] * 0.45, pb.color[1] * 0.45, pb.color[2] * 0.45],
    });
  }

  function drawSplatter(splat) {
    Mat4.fromTRS(mTmp, [splat.x, 0.07 + splat.layer * 0.004, splat.z], splat.rot, Math.PI * 0.5, 0, [splat.size, splat.size, 1]);
    pushMesh('quad', mTmp, {
      matType: 5,
      color: splat.color,
      color2: splat.color2 || splat.color,
      alpha: splat.alpha,
      extra: [3.0, splat.seed, 0, 0],
      doubleSided: true,
      castShadow: false,
      depthWrite: false,
    });
  }

  function drawSkidMark(sk) {
    Mat4.fromTRS(mTmp, [sk.x, 0.055, sk.z], sk.yaw, Math.PI * 0.5, 0, [0.55, 1.4, 1]);
    pushMesh('quad', mTmp, {
      matType: 5,
      color: [0.06, 0.12, 0.08],
      alpha: clamp(sk.life / sk.maxLife, 0, 1) * 0.36,
      doubleSided: true,
      castShadow: false,
      depthWrite: false,
    });
  }

  function drawParticle(pt) {
    const s = pt.size * clamp(pt.life / pt.maxLife, 0.05, 1.0);
    Mat4.fromTRS(mTmp, pt.pos, pt.rot || 0, pt.rot * 0.7 || 0, 0, [s, s, s]);
    pushMesh(pt.shape === 'box' ? 'box' : 'sphereLow', mTmp, {
      matType: 5,
      color: pt.color,
      emissive: [pt.color[0] * 0.45, pt.color[1] * 0.45, pt.color[2] * 0.45],
      alpha: clamp((pt.life / pt.maxLife) * 1.2, 0, 1),
      castShadow: false,
      depthWrite: false,
    });
  }

  function drawGoalkeeper(keeper, time) {
    const { x, z, width, height, color, saveFlash, facingSouth } = keeper;
    const bob = Math.sin(time * 5.2 + z) * 0.14;
    const flash = saveFlash || 0;
    const shieldCol = flash > 0.05 ? [1.0, 0.92, 0.32] : color;
    const em = [
      shieldCol[0] * (0.35 + flash * 0.8),
      shieldCol[1] * (0.35 + flash * 0.8),
      shieldCol[2] * (0.35 + flash * 0.8),
    ];

    // Ground hover shadow & ring
    Mat4.fromTRS(mTmp, [x, 0.07, z], 0, Math.PI * 0.5, 0, [width * 1.15, 2.4, 1]);
    pushMesh('quad', mTmp, {
      matType: 5,
      color: [0.02, 0.06, 0.08],
      alpha: 0.45,
      extra: [2.0, 0, 0, 0],
      doubleSided: true,
      castShadow: false,
      depthWrite: false,
    });
    Mat4.fromTRS(mTmp, [x, 0.25, z], time * 2.5, 0, 0, [width * 0.88, 0.35, 1.8]);
    pushMesh('torus', mTmp, {
      matType: 5,
      color: shieldCol,
      emissive: em,
      alpha: 0.80,
      castShadow: false,
      depthWrite: false,
    });

    // Armored Robotic Keeper Torso
    Mat4.fromTRS(mTmp, [x, height * 0.46 + bob, z], 0, 0, 0, [width * 0.56, height * 0.64, 1.25]);
    pushMesh('box', mTmp, { matType: 2, color: [0.16, 0.22, 0.34], color2: shieldCol, shininess: 95 });

    // Glowing Visor Head facing the pitch
    const visorZ = z + (facingSouth ? 0.68 : -0.68);
    Mat4.fromTRS(mTmp, [x, height * 0.86 + bob, z], 0, 0, 0, [1.55, 0.92, 1.15]);
    pushMesh('box', mTmp, { color: [0.85, 0.90, 0.96], shininess: 90 });
    Mat4.fromTRS(mTmp, [x, height * 0.88 + bob, visorZ], 0, 0, 0, [1.26, 0.38, 0.16]);
    pushMesh('box', mTmp, { matType: 5, color: shieldCol, emissive: em, castShadow: false });

    // Wide Glowing Energy-Shield Blocker Arms (clearly visualizes the keeper's block width!)
    Mat4.fromTRS(mTmp, [x, height * 0.50 + bob, z + (facingSouth ? 0.42 : -0.42)], 0, 0, 0, [width, height * 0.72, 0.28]);
    pushMesh('box', mTmp, {
      matType: 9,
      color: [0.14, 0.32, 0.54],
      color2: shieldCol,
      alpha: 0.44 + flash * 0.35,
      doubleSided: true,
      castShadow: false,
      depthWrite: false,
    });
  }

  function drawShockwave(sw) {
    const t = 1.0 - sw.life / sw.maxLife;
    const r = sw.startR + (sw.endR - sw.startR) * t;
    Mat4.fromTRS(mTmp, sw.pos, 0, 0, 0, [r, 0.38, r]);
    pushMesh('torus', mTmp, {
      matType: 5,
      color: sw.color,
      emissive: [sw.color[0] * 0.65, sw.color[1] * 0.65, sw.color[2] * 0.65],
      alpha: clamp((1.0 - t) * 0.88, 0, 1),
      castShadow: false,
      depthWrite: false,
    });
  }

  return {
    PITCH_HALF_W,
    PITCH_HALF_L,
    PAINT_ARENA_R,
    init,
    resize,
    setTheme,
    setLabelTile,
    beginFrame,
    renderShadowPass,
    renderViewport,
    drawStadium,
    drawGoal,
    drawGoalkeeper,
    drawRocketCar,
    drawPaintRover,
    drawSoccerBall,
    drawBalloon,
    drawBoostPad,
    drawJumpPad,
    drawPowerUp,
    drawPaintball,
    drawSplatter,
    drawSkidMark,
    drawParticle,
    drawShockwave,
  };
})();
