
/* ============================================================================
   1. SES VE ÇEKMECE YÖNETİMİ
============================================================================ */
let soundEnabled = true;
let audioCtx = null;

function playTone(freq = 520, duration = 0.12, type = 'sine', vol = 0.08) {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

function playSuccessSound() {
  playTone(523.25, 0.1, 'triangle', 0.1);
  setTimeout(() => playTone(659.25, 0.12, 'triangle', 0.1), 90);
  setTimeout(() => playTone(783.99, 0.18, 'triangle', 0.12), 180);
}

function playErrorSound() {
  playTone(220, 0.18, 'sawtooth', 0.08);
  setTimeout(() => playTone(180, 0.22, 'sawtooth', 0.08), 120);
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  document.getElementById('soundToggleBtn').textContent = soundEnabled ? '🔊 Ses Açık' : '🔇 Ses Kapalı';
}

function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  else document.exitFullscreen().catch(() => {});
}

function toggleDrawer(drawerId, btnId) {
  const dr = document.getElementById(drawerId);
  const btn = document.getElementById(btnId);
  const isOpen = dr.classList.toggle('open');
  if (btn) btn.classList.toggle('active', isOpen);
}

/* ============================================================================
   2. PROSEDÜREL PBR DOKU VE GERÇEKÇİ 3B ORGANEL FABRİKASI
============================================================================ */
let sharedOrganicBumpTex = null;
let sharedCellWallTex = null;
let sharedNuclearPoreTex = null;

function getOrganicBumpTexture() {
  if (sharedOrganicBumpTex) return sharedOrganicBumpTex;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 380; i++) {
    const x = Math.random() * 256, y = Math.random() * 256, r = 4 + Math.random() * 18;
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    const val = Math.random() > 0.5 ? 215 : 45;
    g.addColorStop(0, `rgba(${val},${val},${val},0.35)`);
    g.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  sharedOrganicBumpTex = new THREE.CanvasTexture(c);
  sharedOrganicBumpTex.wrapS = sharedOrganicBumpTex.wrapT = THREE.RepeatWrapping;
  return sharedOrganicBumpTex;
}

function getFibrousCellWallTexture() {
  if (sharedCellWallTex) return sharedCellWallTex;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2e7d32';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 220; i++) {
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(134, 239, 172, 0.28)' : 'rgba(20, 83, 45, 0.35)';
    ctx.lineWidth = 1 + Math.random() * 2.5;
    ctx.beginPath();
    const y = Math.random() * 256;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(85, y + (Math.random() - 0.5) * 25, 170, y + (Math.random() - 0.5) * 25, 256, y);
    ctx.stroke();
  }
  sharedCellWallTex = new THREE.CanvasTexture(c);
  sharedCellWallTex.wrapS = sharedCellWallTex.wrapT = THREE.RepeatWrapping;
  return sharedCellWallTex;
}

function getNuclearPoreTexture() {
  if (sharedNuclearPoreTex) return sharedNuclearPoreTex;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#581c87';
  ctx.fillRect(0, 0, 256, 256);
  for (let x = 20; x < 256; x += 36) {
    for (let y = 20; y < 256; y += 36) {
      const ox = x + (y % 72 === 0 ? 14 : 0);
      const g = ctx.createRadialGradient(ox, y, 2, ox, y, 10);
      g.addColorStop(0, '#1e1b4b');
      g.addColorStop(0.55, '#c084fc');
      g.addColorStop(1, 'rgba(88, 28, 135, 0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(ox, y, 10, 0, Math.PI * 2); ctx.fill();
    }
  }
  sharedNuclearPoreTex = new THREE.CanvasTexture(c);
  return sharedNuclearPoreTex;
}

function buildDetailed3DOrganelleMesh(orgId) {
  const group = new THREE.Group();
  const bump = getOrganicBumpTexture();

  if (orgId === 'cekirdek') {
    // 3/4 Kesitli Mor Çekirdek Zarı + Nükleer Por Halkaları + Çekirdekçik + Çift DNA Sarmalı
    const outerGeo = new THREE.SphereGeometry(1.06, 48, 36, 0, Math.PI * 1.5, 0, Math.PI);
    const outerMat = new THREE.MeshPhysicalMaterial({
      map: getNuclearPoreTexture(),
      bumpMap: bump,
      bumpScale: 0.05,
      color: 0x9333ea,
      roughness: 0.25,
      clearcoat: 0.9,
      side: THREE.DoubleSide
    });
    const outerShell = new THREE.Mesh(outerGeo, outerMat);
    outerShell.rotation.y = -0.55;
    group.add(outerShell);

    // Yüzeyde belirgin 3B nükleer por halkaları
    const poreMat = new THREE.MeshStandardMaterial({ color: 0xc084fc, roughness: 0.3 });
    [[-0.95, 0.35, 0.2], [-0.88, -0.4, 0.35], [-0.4, 0.78, 0.55], [0.45, -0.8, 0.45], [-0.5, -0.6, -0.65]].forEach(p => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 10, 18), poreMat);
      ring.position.set(p[0], p[1], p[2]);
      ring.lookAt(0, 0, 0);
      group.add(ring);
    });

    const nucleolus = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 32, 24),
      new THREE.MeshPhysicalMaterial({ color: 0xd8b4fe, emissive: 0x7e22ce, emissiveIntensity: 0.55, bumpMap: bump, bumpScale: 0.06 })
    );
    group.add(nucleolus);

    const dnaGroup = new THREE.Group();
    const steps = 26;
    for (let i = 0; i < steps; i++) {
      const t = (i / steps) * Math.PI * 3.0 - Math.PI * 1.5;
      const y = (i / steps - 0.5) * 1.5;
      const r = 0.65 * Math.cos((i / steps - 0.5) * Math.PI * 0.85);
      const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
      s1.position.set(Math.cos(t) * r, y, Math.sin(t) * r);
      const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), new THREE.MeshBasicMaterial({ color: 0xf472b6 }));
      s2.position.set(Math.cos(t + Math.PI) * r, y, Math.sin(t + Math.PI) * r);
      const rungGeo = new THREE.CylinderGeometry(0.016, 0.016, r * 2, 8);
      rungGeo.rotateZ(Math.PI / 2);
      const rung = new THREE.Mesh(rungGeo, new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      rung.position.set(0, y, 0);
      rung.rotation.y = -t;
      dnaGroup.add(s1, s2, rung);
    }
    dnaGroup.rotation.z = 0.35;
    group.add(dnaGroup);
  }
  else if (orgId === 'mitokondri') {
    // Fotogerçekçi Kesitli Dış Zar (Terracotta/Bordo) + Derin Matriks + Bakır-Amber Kıvrımlı Krista + ATP Kıvılcımları
    const outerGeo = new THREE.SphereGeometry(0.98, 48, 32, 0, Math.PI * 2, Math.PI * 0.44, Math.PI * 0.56);
    const outerMat = new THREE.MeshPhysicalMaterial({
      color: 0xa8381b,
      bumpMap: bump,
      bumpScale: 0.06,
      roughness: 0.36,
      clearcoat: 0.55,
      clearcoatRoughness: 0.28,
      side: THREE.DoubleSide
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    outerMesh.scale.set(1.68, 0.92, 1.02);
    group.add(outerMesh);

    const matrixFloor = new THREE.Mesh(
      new THREE.CircleGeometry(0.88, 40),
      new THREE.MeshStandardMaterial({ color: 0x2d0a04, roughness: 0.7, side: THREE.DoubleSide })
    );
    matrixFloor.rotation.x = -Math.PI / 2;
    matrixFloor.scale.set(1.64, 0.98, 1);
    matrixFloor.position.y = -0.05;
    group.add(matrixFloor);

    const rimGeo = new THREE.TorusGeometry(0.9, 0.065, 16, 56);
    rimGeo.rotateX(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeo, new THREE.MeshPhysicalMaterial({ color: 0xc8643c, roughness: 0.38, clearcoat: 0.4 }));
    rimMesh.scale.set(1.66, 1.0, 0.98);
    rimMesh.position.y = 0.08;
    group.add(rimMesh);

    const cristaPoints = [];
    for (let i = 0; i <= 120; i++) {
      const u = (i / 120) * 2 - 1;
      const env = Math.sqrt(Math.max(0.06, 1 - u * u));
      cristaPoints.push(new THREE.Vector3(u * 1.32, 0.02, Math.sin(u * Math.PI * 5.2) * 0.58 * env));
    }
    const cristaCurve = new THREE.CatmullRomCurve3(cristaPoints);
    const cristaMesh = new THREE.Mesh(
      new THREE.TubeGeometry(cristaCurve, 130, 0.07, 16, false),
      new THREE.MeshPhysicalMaterial({
        color: 0xc96224,
        emissive: 0x6b2108,
        emissiveIntensity: 0.25,
        bumpMap: bump,
        bumpScale: 0.03,
        roughness: 0.32,
        clearcoat: 0.45
      })
    );
    cristaMesh.scale.y = 1.65;
    group.add(cristaMesh);

    for (let a = 0; a < 14; a++) {
      const spark = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85 })
      );
      spark.position.set((Math.random() - 0.5) * 1.85, 0.14 + Math.random() * 0.18, (Math.random() - 0.5) * 0.8);
      group.add(spark);
    }
  }
  else if (orgId === 'kloroplast') {
    // Çift Zarlı Yeşil Kloroplast + Grana Sütunları + Stroma Köprüleri
    const outerGeo = new THREE.SphereGeometry(0.98, 40, 28, 0, Math.PI * 2, Math.PI * 0.38, Math.PI * 0.62);
    const shell = new THREE.Mesh(outerGeo, new THREE.MeshPhysicalMaterial({ color: 0x15803d, bumpMap: bump, bumpScale: 0.045, roughness: 0.24, clearcoat: 0.9, side: THREE.DoubleSide }));
    shell.scale.set(1.58, 0.88, 1.06);
    group.add(shell);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.91, 0.065, 14, 48), new THREE.MeshStandardMaterial({ color: 0x86efac }));
    rim.rotation.x = Math.PI / 2; rim.scale.set(1.56, 1.02, 1.0); rim.position.y = 0.14;
    group.add(rim);

    const diskMat = new THREE.MeshPhysicalMaterial({ color: 0x22c55e, emissive: 0x14532d, emissiveIntensity: 0.35, clearcoat: 0.85 });
    [[-0.78, -0.22], [-0.25, 0.26], [0.32, -0.2], [0.84, 0.18]].forEach(sp => {
      for (let d = 0; d < 6; d++) {
        const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.072, 24), diskMat);
        disk.position.set(sp[0], -0.18 + d * 0.09, sp[1]);
        group.add(disk);
      }
    });
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.68, 10), diskMat);
    bridge.rotation.z = Math.PI / 2; bridge.position.set(0.03, 0.08, 0);
    group.add(bridge);
  }
  else if (orgId === 'endoplazmik_retikulum') {
    // Kıvrımlı Granüllü ER + Altın Ribozomlar + Düz ER Borucuk Ağı
    const erMat = new THREE.MeshPhysicalMaterial({ color: 0x06b6d4, bumpMap: bump, bumpScale: 0.035, roughness: 0.24, clearcoat: 0.9, side: THREE.DoubleSide });
    const smoothMat = new THREE.MeshPhysicalMaterial({ color: 0x8b5cf6, roughness: 0.25, clearcoat: 0.85 });
    const riboMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, metalness: 0.45 });
    for (let layer = 0; layer < 4; layer++) {
      const radius = 0.58 + layer * 0.26;
      const pts = [];
      for (let i = 0; i <= 40; i++) {
        const ang = (i / 40) * Math.PI * 1.45 - Math.PI * 0.72;
        const rWave = radius + Math.sin(i * 0.75 + layer) * 0.09;
        pts.push(new THREE.Vector3(Math.cos(ang) * rWave - 0.15, Math.sin(i * 0.5) * 0.1, Math.sin(ang) * rWave));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.095, 16, false), erMat);
      mesh.scale.y = 2.25;
      group.add(mesh);
      pts.forEach((p, idx) => {
        if (idx % 2 === 0) {
          const rDot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), riboMat);
          rDot.position.set(p.x * 1.05, p.y + 0.16, p.z * 1.05);
          group.add(rDot);
        }
      });
    }
    // Düz ER borucuk halkaları
    for (let s = 0; s < 3; s++) {
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.055, 12, 28), smoothMat);
      loop.position.set(0.95, (s - 1) * 0.22, (s - 1) * 0.25);
      loop.rotation.set(s * 0.7, 0.4, s * 0.5);
      group.add(loop);
    }
  }
  else if (orgId === 'golgi') {
    const golgiMat = new THREE.MeshPhysicalMaterial({ color: 0xec4899, bumpMap: bump, bumpScale: 0.035, roughness: 0.22, clearcoat: 0.92 });
    for (let s = 0; s < 5; s++) {
      const zOff = (s - 2) * 0.26;
      const width = 1.18 - Math.abs(s - 2) * 0.12;
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const u = (i / 24) * 2 - 1;
        pts.push(new THREE.Vector3(u * width, Math.cos(u * 1.3) * 0.22 - s * 0.05, zOff + Math.pow(u, 2) * 0.26));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const sac = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, 0.088, 16, false), golgiMat);
      sac.scale.y = 2.15;
      group.add(sac);
      const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 14), golgiMat); b1.position.copy(pts[0]);
      const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 14), golgiMat); b2.position.copy(pts[pts.length - 1]);
      group.add(b1, b2);
    }
    [[-1.38, 0.35, 0.22], [1.4, -0.2, -0.15], [1.18, 0.45, 0.42], [-1.15, -0.35, -0.3]].forEach(vp => {
      const ves = new THREE.Mesh(new THREE.SphereGeometry(0.145, 18, 18), golgiMat);
      ves.position.set(vp[0], vp[1], vp[2]);
      group.add(ves);
    });
  }
  else if (orgId === 'sentrozom') {
    const makeCentrioleBarrel = () => {
      const barrel = new THREE.Group();
      const tubMat = new THREE.MeshPhysicalMaterial({ color: 0x14b8a6, roughness: 0.2, clearcoat: 0.85 });
      for (let i = 0; i < 9; i++) {
        const angle = (i / 9) * Math.PI * 2;
        const triplet = new THREE.Group();
        for (let t = 0; t < 3; t++) {
          const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 1.28, 12), tubMat);
          cyl.position.x = (t - 1) * 0.072;
          triplet.add(cyl);
        }
        triplet.position.set(Math.cos(angle) * 0.38, 0, Math.sin(angle) * 0.38);
        triplet.rotation.y = -angle + 0.35;
        barrel.add(triplet);
      }
      return barrel;
    };
    const b1 = makeCentrioleBarrel(); b1.position.set(-0.55, 0, 0); b1.rotation.z = 0.25;
    const b2 = makeCentrioleBarrel(); b2.position.set(0.55, -0.1, 0.15); b2.rotation.x = Math.PI / 2;
    group.add(b1, b2);

    const fiberMat = new THREE.LineBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.4 });
    for (let f = 0; f < 16; f++) {
      const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3((Math.random()-0.5)*3.0, (Math.random()-0.5)*2.4, (Math.random()-0.5)*2.4)];
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), fiberMat));
    }
  }
  else if (orgId === 'ribozom') {
    const rMat1 = new THREE.MeshPhysicalMaterial({ color: 0xd97706, bumpMap: bump, bumpScale: 0.08, roughness: 0.28, clearcoat: 0.6 });
    const rMat2 = new THREE.MeshPhysicalMaterial({ color: 0xb45309, bumpMap: bump, bumpScale: 0.08, roughness: 0.28, clearcoat: 0.6 });
    const largeSub = new THREE.Mesh(new THREE.SphereGeometry(0.78, 36, 28), rMat1);
    largeSub.scale.set(1.28, 0.94, 1.08); largeSub.position.y = 0.28;
    const smallSub = new THREE.Mesh(new THREE.SphereGeometry(0.56, 32, 24), rMat2);
    smallSub.scale.set(1.32, 0.72, 0.95); smallSub.position.y = -0.45;
    group.add(largeSub, smallSub);

    // Parlayan mRNA şeridi
    const mrnaCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.4, -0.1, 0.2), new THREE.Vector3(-0.5, -0.05, 0.35),
      new THREE.Vector3(0.5, -0.1, 0.35), new THREE.Vector3(1.4, -0.05, 0.2)
    ]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(mrnaCurve, 32, 0.055, 10, false), new THREE.MeshBasicMaterial({ color: 0x38bdf8 })));

    // Renkli amino asit polipeptit zinciri
    const aaColors = [0xf43f5e, 0xa855f7, 0x22c55e, 0xfacc15, 0x38bdf8];
    for (let p = 0; p < 9; p++) {
      const aa = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 14), new THREE.MeshStandardMaterial({ color: aaColors[p % aaColors.length], roughness: 0.2 }));
      aa.position.set(Math.sin(p * 0.65) * 0.3, 0.88 + p * 0.14, Math.cos(p * 0.65) * 0.22);
      group.add(aa);
    }
  }
  else if (orgId === 'koful') {
    const vacMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 36, 28),
      new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.62, roughness: 0.08, clearcoat: 1.0 })
    );
    vacMesh.scale.set(1.35, 0.88, 1.05);
    group.add(vacMesh);
    for (let i = 0; i < 12; i++) {
      const drop = new THREE.Mesh(new THREE.SphereGeometry(0.075 + (i % 3) * 0.03, 12, 12), new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.82 }));
      drop.position.set((Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 0.85, (Math.random() - 0.5) * 1.0);
      group.add(drop);
    }
  }
  else if (orgId === 'lizozom') {
    const lysoShell = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 36, 28, 0, Math.PI * 1.55),
      new THREE.MeshPhysicalMaterial({ color: 0xbe123c, bumpMap: bump, bumpScale: 0.06, roughness: 0.24, clearcoat: 0.9, side: THREE.DoubleSide })
    );
    lysoShell.rotation.y = -0.55;
    group.add(lysoShell);
    const enzColors = [0xfde047, 0xfb923c, 0xfda4af, 0xfef08a];
    for (let e = 0; e < 18; e++) {
      const enz = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 14), new THREE.MeshStandardMaterial({ color: enzColors[e % enzColors.length], roughness: 0.2 }));
      const r = Math.random() * 0.58, a = Math.random() * Math.PI * 2, b = (Math.random() - 0.5) * Math.PI;
      enz.position.set(Math.cos(a) * Math.cos(b) * r, Math.sin(b) * r, Math.sin(a) * Math.cos(b) * r);
      group.add(enz);
    }
  }
  else if (orgId === 'hucre_zari') {
    const headMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, roughness: 0.2, clearcoat: 0.85 });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
    for (let x = -4; x <= 4; x++) {
      for (let z = -2; z <= 2; z++) {
        if (Math.abs(x) <= 1 && Math.abs(z) <= 1) continue;
        const px = x * 0.28, pz = z * 0.28;
        const topH = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), headMat); topH.position.set(px, 0.45, pz);
        const botH = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), headMat); botH.position.set(px, -0.45, pz);
        const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 8), tailMat); tail.position.set(px, 0, pz);
        group.add(topH, botH, tail);
      }
    }
    const channel = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.16, 16, 32), new THREE.MeshPhysicalMaterial({ color: 0x9333ea, roughness: 0.24, clearcoat: 0.9 }));
    channel.rotation.x = Math.PI / 2; channel.scale.z = 3.2;
    group.add(channel);
    [-0.75, 0, 0.75].forEach(iy => {
      const ion = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), new THREE.MeshBasicMaterial({ color: 0x4ade80 }));
      ion.position.set(0, iy, 0);
      group.add(ion);
    });
  }
  else if (orgId === 'hucre_duvari') {
    const wallMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.35, 0.9, 6, 1, true),
      new THREE.MeshPhysicalMaterial({ map: getFibrousCellWallTexture(), bumpMap: bump, bumpScale: 0.06, color: 0x22c55e, side: THREE.DoubleSide })
    );
    group.add(wallMesh);
  }
  else {
    const cytoSphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 32, 24),
      new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.42, roughness: 0.1, clearcoat: 1.0 })
    );
    group.add(cytoSphere);
  }
  return group;
}

/* ============================================================================
   3. VERİTABANI: KLASÖRDEKİ GÖRSELLERLE BAĞLANTILI ORGANEL LİSTESİ
============================================================================ */
const ORGANELLE_DB = {
  hucre_zari: {
    id: 'hucre_zari', name: 'Hücre Zarı', icon: '🛡️', img: '/assets/fen-laboratuvari/gorseller/hucre_zari.jpeg',
    category: 'Temel Kısım · Seçici Geçirgen Zar', isBasic: true, inAnimal: true, inPlant: true, color: '#38bdf8',
    shortTask: 'Hücreyi dış ortamdan ayırır, şekil verir ve dağılmasını önler. Canlı, esnek ve "seçici geçirgen" yapıdadır; madde giriş-çıkışını denetler.',
    presence: '🌿 Bitki ve 🦁 Hayvan Hücresi (Ortak Temel Kısım)', analogy: '🛂 Ülke Sınır Kapısı / Güvenlik Görevlisi'
  },
  hucre_duvari: {
    id: 'hucre_duvari', name: 'Hücre Duvarı (Çeper)', icon: '🧱', img: '/assets/fen-laboratuvari/gorseller/hucre_duvari.png',
    category: 'Koruyucu Dış Katman · Selüloz Yapı', isBasic: true, inAnimal: false, inPlant: true, color: '#22c55e',
    shortTask: 'Bitki hücresinde hücre zarının dışında yer alan cansız, sert ve dayanıklı tabakadır. Bitkiye desteklik ve köşeli şekil verir; tam geçirgendir.',
    presence: '🌿 Yalnız Bitki Hücresinde Bulunur', analogy: '🏰 Kalenin Dış Taş Surları / Zırh'
  },
  sitoplazma: {
    id: 'sitoplazma', name: 'Sitoplazma', icon: '💧', img: '/assets/fen-laboratuvari/gorseller/sitoplazma.png',
    category: 'Temel Kısım · Yarı Akışkan Ortam', isBasic: true, inAnimal: true, inPlant: true, color: '#60a5fa',
    shortTask: 'Hücre zarı ile çekirdek arasını dolduran yumurta akı kıvamında yarı akışkan sıvıdır. Organelleri barındırır ve yaşamsal olaylar burada gerçekleşir.',
    presence: '🌿 Bitki ve 🦁 Hayvan Hücresi (Ortak Temel Kısım)', analogy: '🌊 Organellerin İçinde Yüzdüğü Canlı Havuz'
  },
  cekirdek: {
    id: 'cekirdek', name: 'Çekirdek', icon: '🧠', img: '/assets/fen-laboratuvari/gorseller/cekirdek.jpeg',
    category: 'Temel Kısım · Yönetim ve Kalıtım Merkezi', isBasic: true, inAnimal: true, inPlant: true, color: '#a855f7',
    shortTask: 'Hücrenin büyüme, bölünme, onarım gibi tüm yaşamsal faaliyetlerini yöneten merkezdir. İçinde kalıtsal özellikleri taşıyan DNA bulunur.',
    presence: '🌿 Bitki ve 🦁 Hayvan Hücresi (Ortak Temel Kısım)', analogy: '🏛️ Okul Müdürü / Fabrika Yönetim Merkezi'
  },
  mitokondri: {
    id: 'mitokondri', name: 'Mitokondri', icon: '⚡', img: '/assets/fen-laboratuvari/gorseller/mitokondri.jpeg',
    category: 'Organel · Enerji Üretim Santrali', isBasic: false, inAnimal: true, inPlant: true, color: '#f97316',
    shortTask: 'Besinleri oksijen yardımıyla parçalayarak (hücre içi solunum) hücrenin kullanabileceği enerjiyi (ATP) üretir.',
    presence: '🌿 Bitki ve 🦁 Hayvan Hücresi (Ortak Organel)', analogy: '⚡ Şehrin Elektrik / Enerji Santrali'
  },
  kloroplast: {
    id: 'kloroplast', name: 'Kloroplast', icon: '🌿', img: '/assets/fen-laboratuvari/gorseller/kloroplast.jpeg',
    category: 'Organel · Fotosentez ve Besin Fabrikası', isBasic: false, inAnimal: false, inPlant: true, color: '#22c55e',
    shortTask: 'Bitkiye yeşil rengini verir. Güneş ışığı enerjisini kullanarak su ve karbondioksitten FOTOSENTEZ yoluyla besin ve oksijen üretir.',
    presence: '🌿 Yalnız Bitki Hücresinde Bulunur', analogy: '☀️ Güneş Panelli Besin ve Oksijen Fabrikası'
  },
  ribozom: {
    id: 'ribozom', name: 'Ribozom', icon: '🔵', img: '/assets/fen-laboratuvari/gorseller/ribozom.jpeg',
    category: 'Organel · Protein Sentezi Merkezi', isBasic: false, inAnimal: true, inPlant: true, color: '#eab308',
    shortTask: 'Hücredeki EN KÜÇÜK ve ZARSIZ organeldir. Büyüme, gelişme ve onarım için gerekli olan PROTEİN üretimini gerçekleştirir.',
    presence: '🌿 Bitki ve 🦁 Hayvan Hücresi (Ortak Organel)', analogy: '🏗️ Hücrenin İnşaat Ustası / Üretim Tezgâhı'
  },
  endoplazmik_retikulum: {
    id: 'endoplazmik_retikulum', name: 'Endoplazmik Retikulum', icon: '🛣️', img: '/assets/fen-laboratuvari/gorseller/endoplazmik_retikulum.jpeg',
    category: 'Organel · Hücre İçi İletim Ağı', isBasic: false, inAnimal: true, inPlant: true, color: '#06b6d4',
    shortTask: 'Çekirdek zarından hücre zarına uzanan kıvrımlı kanallardır. Hücre içinde maddelerin taşınmasını (iletimini) sağlar.',
    presence: '🌿 Bitki ve 🦁 Hayvan Hücresi (Ortak Organel)', analogy: '🚚 Şehrin Otoyol ve Kargo Ulaşım Ağı'
  },
  golgi: {
    id: 'golgi', name: 'Golgi Cisimciği', icon: '📦', img: '/assets/fen-laboratuvari/gorseller/golgi.jpeg',
    category: 'Organel · Salgı Üretimi ve Paketleme', isBasic: false, inAnimal: true, inPlant: true, color: '#ec4899',
    shortTask: 'Ter, süt, gözyaşı, tükürük, mukus ve bitki nektarı gibi SALGI maddelerinin üretilmesi ve paketlenmesinde görevlidir.',
    presence: '🌿 Bitki ve 🦁 Hayvan Hücresi (Ortak Organel)', analogy: '📦 Paketleme ve Kargo Dağıtım Fabrikası'
  },
  koful: {
    id: 'koful', name: 'Koful', icon: '🫧', img: '/assets/fen-laboratuvari/gorseller/koful.jpeg',
    category: 'Organel · Depolama Kesesi', isBasic: false, inAnimal: true, inPlant: true, color: '#38bdf8',
    shortTask: 'Fazla su, besin ve atıkları depolar. Bitki hücrelerinde BÜYÜK ve AZ sayıda; hayvan hücrelerinde KÜÇÜK ve ÇOK sayıdadır.',
    presence: '🌿 Bitki (Büyük-Az) ve 🦁 Hayvan (Küçük-Çok)', analogy: '💧 Su Deposu ve Atık Konteyneri'
  },
  lizozom: {
    id: 'lizozom', name: 'Lizozom', icon: '♻️', img: '/assets/fen-laboratuvari/gorseller/lizozom.jpeg',
    category: 'Organel · Hücre İçi Sindirim', isBasic: false, inAnimal: true, inPlant: false, color: '#f43f5e',
    shortTask: 'Hücre içi sindirim yapar; büyük besinleri, yaşlanmış organelleri ve hücreye giren mikropları parçalar.',
    presence: '🦁 Hayvan Hücresinde (ve ilkel bitkilerde) Bulunur', analogy: '♻️ Geri Dönüşüm ve Savunma Ekibi'
  },
  sentrozom: {
    id: 'sentrozom', name: 'Sentrozom (Sentriyol)', icon: '🧬', img: '/assets/fen-laboratuvari/gorseller/sentrozom.jpeg',
    category: 'Organel · Hücre Bölünmesi', isBasic: false, inAnimal: true, inPlant: false, color: '#14b8a6',
    shortTask: 'Çiftler halinde dik konumlu iki sentriyolden oluşur. Hayvan hücresi bölünürken iğ ipliklerini oluşturur.',
    presence: '🦁 Yalnız Hayvan Hücresinde Bulunur', analogy: '🏗️ Hücre Bölünmesinde Halat Çeken Vinçler'
  }
};

const MICROSCOPE_PARTS = [
  { id: 'okuler', name: 'Oküler (Göz Merceği)', pos: [0, 3.35, 0.35], desc: 'Gözümüzü dayayarak baktığımız mercektir. İncelenen görüntüyü genellikle 10 kat (10×) büyütür.' },
  { id: 'tup', name: 'Mikroskop Tüpü', pos: [0, 2.55, 0.15], desc: 'Oküler ile objektifler arasındaki optik mesafeyi koruyan silindirik borudur.' },
  { id: 'kol', name: 'Mikroskop Kolu', pos: [0, 1.35, -1.15], desc: 'Mikroskobu taşırken kavradığımız sağlam kavisli gövde kısmıdır.' },
  { id: 'revolver', name: 'Revolver (Döner Başlık)', pos: [0, 1.85, 0.25], desc: 'Farklı büyütmeli objektiflerin (4×, 10×, 40×) takılı olduğu döner başlıktır.' },
  { id: 'objektif', name: 'Objektifler', pos: [0, 1.45, 0.45], desc: 'Preparatın üzerinde bulunan merceklerdir. Gözleme en küçük objektifle (4×) başlanır.' },
  { id: 'tabla', name: 'Tabla ve Kıskaçlar', pos: [0, 0.9, 0.35], desc: 'Hazırlanan lam-lamel preparatının yerleştirildiği düzlemdir.' },
  { id: 'makro', name: 'Makro (Kaba) Vida', pos: [-0.85, 0.95, -1.05], desc: 'Tablayı hareket ettirerek görüntünün ilk kez bulunmasını sağlayan büyük vidadır.' },
  { id: 'mikro', name: 'Mikro (İnce) Vida', pos: [0.85, 0.75, -1.05], desc: 'Bulunan görüntünün tam net hale getirilmesini sağlayan hassas vidadır.' },
  { id: 'isik', name: 'Işık Kaynağı', pos: [0, 0.05, 0.35], desc: 'Alttan gönderdiği ışıkla hücre örneğinin aydınlanmasını sağlar.' },
  { id: 'taban', name: 'Taban (Ayak)', pos: [0, -0.55, 0], desc: 'Mikroskobun masada dengeli durmasını sağlayan alt kaidedir.' }
];

/* ============================================================================
   4. POP-UP MODAL VE 3B ORGANEL MODELLEYİCİ (HAREKET VARSAYILAN OLARAK DURDURULMUŞ)
============================================================================ */
let popupScene, popupCamera, popupRenderer, popupMeshGroup;
let popupOpen = false;
let popupAutoSpin = false; // VARSAYILAN: HAREKETSİZ
let isDraggingPopup = false, prevPopupMouse = { x: 0, y: 0 };

function initPopup3DViewer() {
  const holder = document.getElementById('popup3DHolder');
  const w = holder.clientWidth || 380;
  const h = holder.clientHeight || 280;

  popupScene = new THREE.Scene();
  popupCamera = new THREE.PerspectiveCamera(40, w / h, 0.1, 50);
  popupCamera.position.set(0, 1.35, 3.6);
  popupCamera.lookAt(0, 0, 0);

  popupRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  popupRenderer.setSize(w, h);
  popupRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  popupRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  popupRenderer.toneMappingExposure = 0.88;
  popupRenderer.outputEncoding = THREE.sRGBEncoding;
  holder.appendChild(popupRenderer.domElement);

  popupScene.add(new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.5));
  const dl1 = new THREE.DirectionalLight(0xfff7ed, 1.05); dl1.position.set(4, 7, 5); popupScene.add(dl1);
  const dl2 = new THREE.PointLight(0x38bdf8, 0.65, 18); dl2.position.set(-4, -2, 3); popupScene.add(dl2);
  const dl3 = new THREE.DirectionalLight(0xc084fc, 0.35); dl3.position.set(-3, 4, -5); popupScene.add(dl3);

  popupMeshGroup = new THREE.Group();
  popupScene.add(popupMeshGroup);

  const dom = popupRenderer.domElement;
  dom.addEventListener('pointerdown', e => {
    isDraggingPopup = true;
    prevPopupMouse = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('pointermove', e => {
    if (!isDraggingPopup) return;
    const dx = e.clientX - prevPopupMouse.x;
    const dy = e.clientY - prevPopupMouse.y;
    prevPopupMouse = { x: e.clientX, y: e.clientY };
    popupMeshGroup.rotation.y += dx * 0.01;
    popupMeshGroup.rotation.x = Math.max(-0.8, Math.min(0.8, popupMeshGroup.rotation.x + dy * 0.01));
  });
  window.addEventListener('pointerup', () => { isDraggingPopup = false; });
}

function togglePopupSpin() {
  popupAutoSpin = !popupAutoSpin;
  const btn = document.getElementById('popupSpinBtn');
  btn.textContent = popupAutoSpin ? '⏸️ 3B Döndürmeyi Durdur' : '▶️ 3B Modeli Döndür (Kapalı)';
  btn.classList.toggle('active', popupAutoSpin);
}

let activeModule = 'microscope';

function switchModule(modName) {
  activeModule = modName;
  playTone(600, 0.08, 'sine', 0.06);
  document.querySelectorAll('.module-section').forEach(s => s.classList.remove('active'));
  document.getElementById('mod-' + modName).classList.add('active');

  const tabs = document.querySelectorAll('#mainNavTabs .nav-tab');
  const order = ['microscope', 'cell', 'hierarchy', 'evaluation'];
  tabs.forEach((t, i) => t.classList.toggle('active', order[i] === modName));

  setTimeout(() => { onWindowResize(); }, 60);
}

function openOrganellePopup(orgId) {
  const org = ORGANELLE_DB[orgId];
  if (!org) return;
  playTone(720, 0.12, 'triangle', 0.09);

  document.getElementById('popupIcon').textContent = org.icon;
  document.getElementById('popupTitle').textContent = org.name;
  document.getElementById('popupCategoryBadge').textContent = org.category;
  document.getElementById('popupFolderImg').src = org.img;
  document.getElementById('popupShortTask').textContent = org.shortTask;
  document.getElementById('popupPresence').textContent = org.presence;
  document.getElementById('popupAnalogy').textContent = org.analogy;

  popupAutoSpin = false;
  document.getElementById('popupSpinBtn').textContent = '▶️ 3B Modeli Döndür (Kapalı)';
  document.getElementById('popupSpinBtn').classList.remove('active');

  document.getElementById('organelleModalBackdrop').classList.add('open');
  popupOpen = true;

  setTimeout(() => {
    const holder = document.getElementById('popup3DHolder');
    if (popupRenderer && holder.clientWidth > 0) {
      popupCamera.aspect = holder.clientWidth / holder.clientHeight;
      popupCamera.updateProjectionMatrix();
      popupRenderer.setSize(holder.clientWidth, holder.clientHeight);
    }
    while (popupMeshGroup.children.length > 0) {
      popupMeshGroup.remove(popupMeshGroup.children[0]);
    }
    const detailedModel = buildDetailed3DOrganelleMesh(orgId);
    popupMeshGroup.rotation.set(0.32, -0.35, 0);
    popupMeshGroup.add(detailedModel);
  }, 30);

  document.querySelectorAll('#basicPartsList .chip-btn, #organellesList .chip-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.org === orgId);
  });

  highlightOrganelleIn3D(orgId);
}

function closeOrganellePopup() {
  playTone(400, 0.08, 'sine', 0.06);
  document.getElementById('organelleModalBackdrop').classList.remove('open');
  popupOpen = false;
}

function handleBackdropClick(e) {
  if (e.target.id === 'organelleModalBackdrop') closeOrganellePopup();
}

window.addEventListener('keydown', e => { if (e.key === 'Escape') closeOrganellePopup(); });

/* ============================================================================
   5. MODÜL 1: 3B MİKROSKOP (HAREKET VARSAYILAN OLARAK DURDURULMUŞ)
============================================================================ */
let micScene, micCamera, micRenderer, micGroup;
let micSlideMesh, micCoverSlipMesh, micLightBeamMesh, micBulbMesh, micStageGroup, micRevolverGroup;
let micLabelsVisible = true;
let micAutoSpin = false; // VARSAYILAN: HAREKETSİZ
let selectedSpecimen = 'animal';
let currentMicStep = 0;
let micLightOn = false;
let currentObjective = 10;
let micCamTarget = new THREE.Vector3(0, 1.3, 0);
let micCamSpherical = { radius: 5.8, theta: 0.55, phi: 1.2 };
let isDraggingMic = false, prevMicMouse = { x: 0, y: 0 };

function initMicroscope3D() {
  const holder = document.getElementById('microscopeCanvasHolder');
  const w = holder.clientWidth || 1000;
  const h = holder.clientHeight || 600;

  micScene = new THREE.Scene();
  micCamera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
  updateMicCameraPosition();

  micRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  micRenderer.setSize(w, h);
  micRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  holder.appendChild(micRenderer.domElement);

  micScene.add(new THREE.AmbientLight(0xdbeafe, 0.9));
  const dir1 = new THREE.DirectionalLight(0xffffff, 1.25); dir1.position.set(5, 8, 6); micScene.add(dir1);
  const dir2 = new THREE.DirectionalLight(0x38bdf8, 0.6); dir2.position.set(-5, 3, -4); micScene.add(dir2);

  micGroup = new THREE.Group();
  micScene.add(micGroup);

  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0xf8fafc, roughness: 0.22, metalness: 0.2, clearcoat: 0.6 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.55 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.15, metalness: 0.9 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.22, metalness: 0.75 });

  const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.38, 2.85), darkMat);
  baseMesh.position.set(0, -0.55, 0);
  micGroup.add(baseMesh);

  const lampRing = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.52, 0.22, 32), chromeMat);
  lampRing.position.set(0, -0.25, 0.35);
  micGroup.add(lampRing);

  micBulbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), new THREE.MeshBasicMaterial({ color: 0x475569 }));
  micBulbMesh.position.set(0, -0.14, 0.35);
  micGroup.add(micBulbMesh);

  const beamGeo = new THREE.CylinderGeometry(0.18, 0.35, 1.25, 24, 1, true);
  micLightBeamMesh = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.0, side: THREE.DoubleSide }));
  micLightBeamMesh.position.set(0, 0.45, 0.35);
  micGroup.add(micLightBeamMesh);

  const armCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.35, -0.95),
    new THREE.Vector3(0, 0.9, -1.25),
    new THREE.Vector3(0, 2.1, -0.85),
    new THREE.Vector3(0, 2.4, 0.15)
  ]);
  micGroup.add(new THREE.Mesh(new THREE.TubeGeometry(armCurve, 36, 0.24, 18, false), bodyMat));

  const coarseGeo = new THREE.CylinderGeometry(0.32, 0.32, 1.35, 24); coarseGeo.rotateZ(Math.PI / 2);
  const coarseKnob = new THREE.Mesh(coarseGeo, darkMat); coarseKnob.position.set(0, 0.85, -1.1);
  micGroup.add(coarseKnob);

  const fineGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.65, 24); fineGeo.rotateZ(Math.PI / 2);
  const fineKnob = new THREE.Mesh(fineGeo, goldMat); fineKnob.position.set(0, 0.85, -1.1);
  micGroup.add(fineKnob);

  micStageGroup = new THREE.Group();
  micStageGroup.position.set(0, 0.9, 0.35);
  micGroup.add(micStageGroup);
  micStageGroup.add(new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.12, 1.65), darkMat));

  const clip1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.65), chromeMat); clip1.position.set(-0.45, 0.09, 0);
  const clip2 = clip1.clone(); clip2.position.set(0.45, 0.09, 0);
  micStageGroup.add(clip1, clip2);

  const slideGroup = new THREE.Group();
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.72, roughness: 0.08 });
  slideGroup.add(new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.03, 0.42), glassMat));
  slideGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.036, 24), new THREE.MeshBasicMaterial({ color: 0xa855f7 })));

  micCoverSlipMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.34), glassMat);
  micCoverSlipMesh.position.set(0, 0.25, 0);
  micCoverSlipMesh.rotation.z = 0.5;
  micCoverSlipMesh.visible = false;
  slideGroup.add(micCoverSlipMesh);

  slideGroup.position.set(1.6, 0.25, 0.6);
  slideGroup.visible = false;
  micSlideMesh = slideGroup;
  micStageGroup.add(micSlideMesh);

  micRevolverGroup = new THREE.Group();
  micRevolverGroup.position.set(0, 1.88, 0.25);
  micGroup.add(micRevolverGroup);
  micRevolverGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.16, 24), chromeMat));

  [
    { angle: 0, len: 0.42, color: 0xef4444 },
    { angle: 2.09, len: 0.56, color: 0xfacc15 },
    { angle: 4.18, len: 0.72, color: 0x38bdf8 }
  ].forEach(o => {
    const og = new THREE.Group();
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, o.len, 18), chromeMat); cyl.position.y = -o.len / 2;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.07, 18), new THREE.MeshBasicMaterial({ color: o.color })); band.position.y = -o.len * 0.65;
    og.add(cyl, band);
    og.position.set(Math.sin(o.angle) * 0.26, -0.05, Math.cos(o.angle) * 0.26);
    og.rotation.x = 0.15 * Math.cos(o.angle); og.rotation.z = -0.15 * Math.sin(o.angle);
    micRevolverGroup.add(og);
  });

  const headSphere = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 18), bodyMat);
  headSphere.position.set(0, 2.25, 0.2);
  micGroup.add(headSphere);

  const tubeGroup = new THREE.Group();
  tubeGroup.position.set(0, 2.35, 0.22);
  tubeGroup.rotation.x = 0.42;
  const tubeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.9, 24), bodyMat); tubeBody.position.y = 0.45;
  const eyepieceRim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.28, 24), darkMat); eyepieceRim.position.y = 0.98;
  const lensGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 24), new THREE.MeshBasicMaterial({ color: 0x38bdf8 })); lensGlass.position.y = 1.13;
  tubeGroup.add(tubeBody, eyepieceRim, lensGlass);
  micGroup.add(tubeGroup);

  const dom = micRenderer.domElement;
  dom.addEventListener('pointerdown', e => { isDraggingMic = true; prevMicMouse = { x: e.clientX, y: e.clientY }; });
  window.addEventListener('pointermove', e => {
    if (!isDraggingMic) return;
    const dx = e.clientX - prevMicMouse.x, dy = e.clientY - prevMicMouse.y;
    prevMicMouse = { x: e.clientX, y: e.clientY };
    micCamSpherical.theta -= dx * 0.008;
    micCamSpherical.phi = Math.max(0.35, Math.min(1.5, micCamSpherical.phi - dy * 0.008));
    updateMicCameraPosition();
  });
  window.addEventListener('pointerup', () => { isDraggingMic = false; });
  dom.addEventListener('wheel', e => {
    e.preventDefault();
    micCamSpherical.radius = Math.max(2.6, Math.min(9.5, micCamSpherical.radius + e.deltaY * 0.004));
    updateMicCameraPosition();
  }, { passive: false });

  buildMicroscopePartChipsAndLabels();
  drawEyepieceMicroscopyView();
}

function toggleMicroscopeAutoSpin() {
  micAutoSpin = !micAutoSpin;
  const btn = document.getElementById('micAutoSpinBtn');
  btn.textContent = micAutoSpin ? '⏸️ Döndür (Açık)' : '▶️ Döndür (Kapalı)';
  btn.classList.toggle('active', micAutoSpin);
}

function updateMicCameraPosition() {
  if (!micCamera) return;
  const { radius, theta, phi } = micCamSpherical;
  micCamera.position.x = micCamTarget.x + radius * Math.sin(phi) * Math.sin(theta);
  micCamera.position.y = micCamTarget.y + radius * Math.cos(phi);
  micCamera.position.z = micCamTarget.z + radius * Math.sin(phi) * Math.cos(theta);
  micCamera.lookAt(micCamTarget);
}

function resetMicroscopeCamera() {
  micGroup.rotation.y = 0;
  micCamTarget.set(0, 1.3, 0);
  micCamSpherical = { radius: 5.8, theta: 0.55, phi: 1.2 };
  updateMicCameraPosition();
}

function buildMicroscopePartChipsAndLabels() {
  const chipsContainer = document.getElementById('micPartsChips');
  const overlay = document.getElementById('microscopeLabelsOverlay');
  chipsContainer.innerHTML = '';
  overlay.innerHTML = '';

  MICROSCOPE_PARTS.forEach((p, idx) => {
    const chip = document.createElement('button');
    chip.className = 'chip-btn' + (idx === 0 ? ' active' : '');
    chip.textContent = p.name;
    chip.onclick = () => selectMicroscopePart(p);
    chip.dataset.partId = p.id;
    chipsContainer.appendChild(chip);

    const lbl = document.createElement('div');
    lbl.className = 'scene-label';
    lbl.id = 'mic-lbl-' + p.id;
    lbl.innerHTML = `<span class="dot"></span>${p.name}`;
    lbl.onclick = () => {
      selectMicroscopePart(p);
      document.getElementById('micDrawer').classList.add('open');
      document.getElementById('micDrawerBtn').classList.add('active');
    };
    overlay.appendChild(lbl);
  });
}

function selectMicroscopePart(part) {
  playTone(640, 0.09, 'sine', 0.07);
  document.getElementById('micPartTitle').textContent = '🔬 ' + part.name;
  document.getElementById('micPartDesc').textContent = part.desc;
  document.querySelectorAll('#micPartsChips .chip-btn').forEach(b => b.classList.toggle('active', b.dataset.partId === part.id));
  document.querySelectorAll('#microscopeLabelsOverlay .scene-label').forEach(l => l.classList.toggle('highlighted', l.id === 'mic-lbl-' + part.id));
}

function toggleMicroscopeLabels() {
  micLabelsVisible = !micLabelsVisible;
  document.getElementById('micLabelsBtn').classList.toggle('active', micLabelsVisible);
  document.getElementById('microscopeLabelsOverlay').style.display = micLabelsVisible ? 'block' : 'none';
}

function updateMicroscopeLabels2D() {
  if (!micLabelsVisible || activeModule !== 'microscope') return;
  const holder = document.getElementById('microscopeCanvasHolder');
  const w = holder.clientWidth, h = holder.clientHeight;

  MICROSCOPE_PARTS.forEach(p => {
    const el = document.getElementById('mic-lbl-' + p.id);
    if (!el) return;
    const v = new THREE.Vector3(p.pos[0], p.pos[1], p.pos[2]);
    v.applyMatrix4(micGroup.matrixWorld);
    v.project(micCamera);
    el.style.left = `${(v.x * 0.5 + 0.5) * w}px`;
    el.style.top = `${(-(v.y * 0.5) + 0.5) * h}px`;
  });
}

function selectSpecimen(type) {
  selectedSpecimen = type;
  playTone(550, 0.08, 'triangle', 0.08);
  document.getElementById('sp-animal').classList.toggle('active', type === 'animal');
  document.getElementById('sp-plant').classList.toggle('active', type === 'plant');
  drawEyepieceMicroscopyView();
}

function runNextMicroscopeStep() {
  jumpToMicroscopeStep(currentMicStep < 6 ? currentMicStep + 1 : 1);
}

function jumpToMicroscopeStep(step) {
  currentMicStep = step;
  playTone(500 + step * 60, 0.12, 'triangle', 0.09);

  for (let i = 1; i <= 6; i++) {
    document.getElementById('mstep-' + i).classList.toggle('active', i === step);
  }

  const banner = document.getElementById('micStatusBanner');
  const mainBtn = document.getElementById('startMicAnimBtn');
  const specimenTitle = selectedSpecimen === 'animal' ? 'Hayvan Hücresi (Ağız İçi Epitel)' : 'Bitki Hücresi (Soğan Zarı)';

  if (step === 1) {
    setMicroscopeViewMode('3d');
    micSlideMesh.visible = true;
    micSlideMesh.position.set(1.35, 0.25, 0.55);
    micCoverSlipMesh.visible = true;
    micCoverSlipMesh.position.set(0, 0.22, 0);
    micCoverSlipMesh.rotation.z = 0.45;
    let t = 0;
    const anim = setInterval(() => {
      t += 0.08;
      micCoverSlipMesh.position.y = Math.max(0.03, 0.22 * (1 - t));
      micCoverSlipMesh.rotation.z = Math.max(0, 0.45 * (1 - t));
      if (t >= 1) clearInterval(anim);
    }, 30);
    banner.innerHTML = `🧪 <strong>Adım 1:</strong> ${specimenTitle} örneği <strong>lam</strong> üzerine konuldu ve üzeri <strong>lamel</strong> ile kapatıldı!`;
    mainBtn.textContent = '▶ Adım 2: Preparatı Tablaya Yerleştir →';
  }
  else if (step === 2) {
    setMicroscopeViewMode('3d');
    micSlideMesh.visible = true;
    micCoverSlipMesh.visible = true;
    micCoverSlipMesh.position.set(0, 0.03, 0);
    micCoverSlipMesh.rotation.z = 0;
    let t = 0;
    const startX = micSlideMesh.position.x, startZ = micSlideMesh.position.z;
    const anim = setInterval(() => {
      t += 0.08;
      micSlideMesh.position.x = startX * (1 - t);
      micSlideMesh.position.z = startZ * (1 - t);
      micSlideMesh.position.y = 0.08;
      if (t >= 1) clearInterval(anim);
    }, 30);
    banner.innerHTML = `📥 <strong>Adım 2:</strong> Hazırlanan preparat mikroskobun <strong>tablasına</strong> yerleştirildi!`;
    mainBtn.textContent = '▶ Adım 3: Mikroskobun Işığını Aç →';
  }
  else if (step === 3) {
    setMicroscopeViewMode('3d');
    micSlideMesh.visible = true;
    micSlideMesh.position.set(0, 0.08, 0);
    if (!micLightOn) toggleMicroscopeLight(true);
    banner.innerHTML = `💡 <strong>Adım 3:</strong> Işık mikroskobunun <strong>ışık kaynağı açıldı</strong>!`;
    mainBtn.textContent = '▶ Adım 4: Okülerden Bak (Kamera Yaklaşsın) →';
  }
  else if (step === 4) {
    setMicroscopeViewMode('3d');
    if (!micLightOn) toggleMicroscopeLight(true);
    document.getElementById('coarseSlider').value = 22;
    document.getElementById('fineSlider').value = 25;
    onFocusSliderChange();
    banner.innerHTML = `👁️ <strong>Adım 4:</strong> Kamera <strong>okülere</strong> yaklaşıyor... İlk görüntü bulanık!`;
    let t = 0;
    const anim = setInterval(() => {
      t += 0.06;
      micCamTarget.lerp(new THREE.Vector3(0, 3.1, 0.4), 0.18);
      micCamSpherical.radius = Math.max(1.6, 5.8 - t * 4.2);
      updateMicCameraPosition();
      if (t >= 1) {
        clearInterval(anim);
        setMicroscopeViewMode('eyepiece');
      }
    }, 35);
    mainBtn.textContent = '▶ Adım 5: Ayar Vidalarıyla Görüntüyü Netle →';
  }
  else if (step === 5) {
    setMicroscopeViewMode('eyepiece');
    autoFocusEyepiece();
    banner.innerHTML = `⚙️ <strong>Adım 5:</strong> Makro ve mikro ayar vidalarıyla görüntü <strong>netleştirildi</strong>!`;
    mainBtn.textContent = '▶ Adım 6: Hücreye Yaklaş ve 3B Organellere Geç →';
  }
  else if (step === 6) {
    zoomFromEyepieceToCellLab();
  }
}

function toggleMicroscopeLight(forceState) {
  micLightOn = typeof forceState === 'boolean' ? forceState : !micLightOn;
  playTone(micLightOn ? 740 : 340, 0.09, 'sine', 0.07);
  if (micBulbMesh) micBulbMesh.material.color.setHex(micLightOn ? 0xfef08a : 0x475569);
  if (micLightBeamMesh) micLightBeamMesh.material.opacity = micLightOn ? 0.35 : 0.0;
  const btn = document.getElementById('lightSwitchBtn');
  btn.textContent = micLightOn ? '💡 Işık: AÇIK' : '💡 Işık: KAPALI';
  btn.classList.toggle('active', micLightOn);
  drawEyepieceMicroscopyView();
}

function setObjective(mag) {
  currentObjective = mag;
  playTone(620, 0.08, 'triangle', 0.08);
  [4, 10, 40].forEach(m => document.getElementById('obj-' + m).classList.toggle('active', m === mag));
  document.getElementById('objValLabel').textContent = `${mag}× (Toplam ${mag * 10}×)`;
  if (micRevolverGroup) micRevolverGroup.rotation.y = mag === 4 ? 0 : (mag === 10 ? 2.09 : 4.18);
  drawEyepieceMicroscopyView();
}

function setMicroscopeViewMode(mode) {
  const isEye = mode === 'eyepiece';
  document.getElementById('micView3DBtn').classList.toggle('active', !isEye);
  document.getElementById('micViewEyepieceBtn').classList.toggle('active', isEye);
  document.getElementById('eyepieceHud').classList.toggle('active', isEye);
  if (!isEye) resetMicroscopeCamera();
  else {
    if (!micLightOn) toggleMicroscopeLight(true);
    drawEyepieceMicroscopyView();
  }
}

function onFocusSliderChange() {
  const c = parseInt(document.getElementById('coarseSlider').value, 10);
  const f = parseInt(document.getElementById('fineSlider').value, 10);
  document.getElementById('coarseValLabel').textContent = `%${c}`;
  document.getElementById('fineValLabel').textContent = `%${f}`;
  if (micStageGroup) micStageGroup.position.y = 0.78 + (c / 100) * 0.25;
  drawEyepieceMicroscopyView();
}

function autoFocusEyepiece() {
  playSuccessSound();
  let step = 0;
  const cSlider = document.getElementById('coarseSlider');
  const fSlider = document.getElementById('fineSlider');
  const startC = parseInt(cSlider.value, 10), startF = parseInt(fSlider.value, 10);
  const timer = setInterval(() => {
    step += 0.1;
    cSlider.value = Math.round(startC + (75 - startC) * step);
    fSlider.value = Math.round(startF + (80 - startF) * step);
    onFocusSliderChange();
    if (step >= 1) clearInterval(timer);
  }, 35);
}

let eyepieceZoomFactor = 1.0;

function drawEyepieceMicroscopyView() {
  const canvas = document.getElementById('eyepieceCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const c = parseInt(document.getElementById('coarseSlider').value, 10);
  const f = parseInt(document.getElementById('fineSlider').value, 10);
  const err = Math.hypot(c - 75, f - 80);
  const clarity = Math.max(0, Math.min(100, Math.round(100 - err * 1.35)));
  const blurPx = ((100 - clarity) / 100) * 14;

  canvas.style.filter = `blur(${blurPx.toFixed(1)}px) brightness(${micLightOn ? 1 : 0.12})`;
  const scale = (currentObjective === 4 ? 0.72 : (currentObjective === 10 ? 1.05 : 1.55)) * eyepieceZoomFactor;

  ctx.save();
  ctx.clearRect(0, 0, w, h);

  const bgGrad = ctx.createRadialGradient(w/2, h/2, 30, w/2, h/2, w/2);
  bgGrad.addColorStop(0, '#f3d1ff');
  bgGrad.addColorStop(0.75, '#dda6f6');
  bgGrad.addColorStop(1, '#b87ce0');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  ctx.translate(w / 2, h / 2);
  ctx.scale(scale, scale);
  ctx.translate(-w / 2, -h / 2);

  if (selectedSpecimen === 'animal') {
    const cells = [
      { x: 260, y: 260, rx: 64, ry: 52, rot: 0.2 },
      { x: 135, y: 210, rx: 52, ry: 44, rot: -0.3 },
      { x: 380, y: 220, rx: 56, ry: 46, rot: 0.4 },
      { x: 205, y: 130, rx: 58, ry: 42, rot: 0.1 },
      { x: 335, y: 125, rx: 50, ry: 40, rot: -0.2 },
      { x: 155, y: 345, rx: 55, ry: 45, rot: 0.35 },
      { x: 310, y: 370, rx: 60, ry: 44, rot: -0.15 }
    ];
    cells.forEach((cell, idx) => {
      ctx.save();
      ctx.translate(cell.x, cell.y);
      ctx.rotate(cell.rot);
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 2; a += 0.25) {
        const wobble = 1 + 0.08 * Math.sin(a * 3 + idx) + 0.05 * Math.cos(a * 5 - idx);
        const px = Math.cos(a) * cell.rx * wobble, py = Math.sin(a) * cell.ry * wobble;
        if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(147, 51, 234, 0.52)';
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = 'rgba(88, 28, 135, 0.75)';
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(4, -2, 13, 10, 0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(76, 29, 149, 0.9)';
      ctx.fill();
      ctx.restore();
    });
  } else {
    const cellW = 115, cellH = 54;
    for (let r = -1; r < 9; r++) {
      for (let c = -1; c < 5; c++) {
        const x = c * cellW + (r % 2) * (cellW * 0.48), y = r * cellH;
        ctx.beginPath();
        ctx.moveTo(x + 12, y + 2); ctx.lineTo(x + cellW - 12, y + 4); ctx.lineTo(x + cellW + 4, y + cellH * 0.5);
        ctx.lineTo(x + cellW - 10, y + cellH - 2); ctx.lineTo(x + 10, y + cellH); ctx.lineTo(x - 4, y + cellH * 0.5);
        ctx.closePath();
        ctx.fillStyle = 'rgba(216, 180, 254, 0.62)';
        ctx.fill();
        ctx.lineWidth = 3.6;
        ctx.strokeStyle = '#581c87';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x + cellW * 0.48, y + cellH * 0.52, 7.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(107, 33, 168, 0.82)';
        ctx.fill();
      }
    }
  }
  ctx.restore();

  const infoEl = document.getElementById('eyepieceOverlayInfo');
  if (infoEl) {
    const statusText = clarity >= 88 ? '✅ Görüntü Net!' : '🌫️ Bulanık (Ayar Vidalarını Çevir)';
    infoEl.textContent = `${selectedSpecimen === 'animal' ? '🦁 Hayvan (Yuvarlak)' : '🌿 Bitki (Köşeli)'} | Büyütme: ${currentObjective * 10}× | Netlik: %${clarity} (${statusText})`;
  }
}

function zoomFromEyepieceToCellLab() {
  setMicroscopeViewMode('eyepiece');
  document.getElementById('coarseSlider').value = 75;
  document.getElementById('fineSlider').value = 80;
  onFocusSliderChange();
  playSuccessSound();

  let z = 1.0;
  const zoomAnim = setInterval(() => {
    z += 0.18;
    eyepieceZoomFactor = z;
    drawEyepieceMicroscopyView();
    if (z >= 3.4) {
      clearInterval(zoomAnim);
      eyepieceZoomFactor = 1.0;
      drawEyepieceMicroscopyView();
      setCellType(selectedSpecimen);
      switchModule('cell');
    }
  }, 40);
}

function resetMicroscopeSim() {
  currentMicStep = 0;
  eyepieceZoomFactor = 1.0;
  micSlideMesh.visible = false;
  micCoverSlipMesh.visible = false;
  toggleMicroscopeLight(false);
  setMicroscopeViewMode('3d');
  document.getElementById('coarseSlider').value = 20;
  document.getElementById('fineSlider').value = 25;
  onFocusSliderChange();
  document.getElementById('startMicAnimBtn').textContent = '▶ Animasyon ile İncele (Adım 1: Lam-Lamel Hazırla)';
}

/* ============================================================================
   6. MODÜL 2: ÜRETİLEN REFERANS GÖRSELDEKİ GİBİ GERÇEKÇİ 3B HÜCRE MODELLERİ (SABİT DURUŞLU)
============================================================================ */
let cellScene, cellCamera, cellRenderer, cellRootGroup;
let currentCellType = 'animal';
let currentCellDim = '3d';
let cellLabelsVisible = true;
let cellAutoSpin = false; // VARSAYILAN: HAREKETSİZ (İSTENİRSE DÖNDÜRÜLEBİLİR)
let cellClickables = [];
let cellLabelAnchors = [];
// Referans görseldeki gibi üst-ön cepheden hücrenin içini tam gösteren kamera açısı:
let cellCamSpherical = { radius: 8.2, theta: 0.0, phi: 0.72 };
let isDraggingCell = false, prevCellMouse = { x: 0, y: 0 }, pointerDownPos = { x: 0, y: 0 };

function initCellLab3D() {
  const holder = document.getElementById('cellCanvasHolder');
  const w = holder.clientWidth || 1100;
  const h = holder.clientHeight || 620;

  cellScene = new THREE.Scene();
  cellCamera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
  updateCellCameraPosition();

  cellRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  cellRenderer.setSize(w, h);
  cellRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  cellRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  cellRenderer.toneMappingExposure = 0.85;
  cellRenderer.outputEncoding = THREE.sRGBEncoding;
  holder.appendChild(cellRenderer.domElement);

  cellScene.add(new THREE.HemisphereLight(0x93c5fd, 0x090f1d, 0.45));
  const d1 = new THREE.DirectionalLight(0xfff7ed, 1.05); d1.position.set(5, 12, 9); cellScene.add(d1);
  const d2 = new THREE.PointLight(0x38bdf8, 0.55, 28); d2.position.set(-7, -3, 7); cellScene.add(d2);
  const d3 = new THREE.DirectionalLight(0xa855f7, 0.35); d3.position.set(0, 7, -6); cellScene.add(d3);

  cellRootGroup = new THREE.Group();
  // Hücre çanağını kameraya doğru hafif eğimli tutalım (referans görseldeki gibi içindeki tüm organeller net görünsün)
  cellRootGroup.rotation.x = 0.28;
  cellScene.add(cellRootGroup);

  buildSidebarOrganelleButtons();
  rebuildCell3DModels();
  render2DCellDiagrams();

  const dom = cellRenderer.domElement;
  dom.addEventListener('pointerdown', e => {
    isDraggingCell = true;
    prevCellMouse = { x: e.clientX, y: e.clientY };
    pointerDownPos = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('pointermove', e => {
    if (!isDraggingCell) return;
    const dx = e.clientX - prevCellMouse.x, dy = e.clientY - prevCellMouse.y;
    prevCellMouse = { x: e.clientX, y: e.clientY };
    cellCamSpherical.theta -= dx * 0.008;
    cellCamSpherical.phi = Math.max(0.25, Math.min(1.45, cellCamSpherical.phi - dy * 0.008));
    updateCellCameraPosition();
  });
  window.addEventListener('pointerup', e => {
    if (!isDraggingCell) return;
    isDraggingCell = false;
    const moveDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
    if (moveDist < 6 && e.target === dom) checkRaycasterOrganelleClick(e);
  });
  dom.addEventListener('wheel', e => {
    e.preventDefault();
    cellCamSpherical.radius = Math.max(4.2, Math.min(15, cellCamSpherical.radius + e.deltaY * 0.005));
    updateCellCameraPosition();
  }, { passive: false });
}

let cellZoomPercent = 100;

function getBaseCellRadius() {
  if (currentCellType === 'compare') return 11.2;
  return currentCellType === 'plant' ? 8.8 : 8.5;
}

function updateCellCameraPosition() {
  if (!cellCamera) return;
  const { radius, theta, phi } = cellCamSpherical;
  cellCamera.position.x = radius * Math.sin(phi) * Math.sin(theta);
  cellCamera.position.y = radius * Math.cos(phi);
  cellCamera.position.z = radius * Math.sin(phi) * Math.cos(theta);
  cellCamera.lookAt(0, 0, 0);
}

function applyCellZoom(pct) {
  cellZoomPercent = Math.max(55, Math.min(220, Math.round(pct)));
  const slider = document.getElementById('cellZoomSlider');
  const label = document.getElementById('cellZoomLabel');
  if (slider) slider.value = cellZoomPercent;
  if (label) label.textContent = `%${cellZoomPercent}`;

  // 3B kamera mesafesini güncelle
  cellCamSpherical.radius = Math.max(3.6, Math.min(16.0, getBaseCellRadius() * (100 / cellZoomPercent)));
  updateCellCameraPosition();

  // 2B görsel ızgarasını ölçekle
  const grid2d = document.querySelector('#cell2DContainer .cell-2d-grid');
  if (grid2d) {
    grid2d.style.transform = `scale(${(cellZoomPercent / 100).toFixed(2)})`;
    grid2d.style.transformOrigin = 'center center';
    grid2d.style.transition = 'transform 0.14s ease';
  }
}

function onCellZoomSlider(val) {
  applyCellZoom(parseInt(val, 10));
}

function stepCellZoom(delta) {
  applyCellZoom(cellZoomPercent + delta);
}

function resetCellZoom() {
  applyCellZoom(100);
}

function resetCellCamera() {
  cellRootGroup.rotation.set(0.28, 0, 0);
  cellCamSpherical = { radius: getBaseCellRadius(), theta: 0.0, phi: 0.72 };
  resetCellZoom();
}

function buildSidebarOrganelleButtons() {
  const basicBox = document.getElementById('basicPartsList');
  const orgBox = document.getElementById('organellesList');
  basicBox.innerHTML = '<span class="dock-label">🥚 Temel Kısımlar:</span>';
  orgBox.innerHTML = '<span class="dock-label">⚡ Organeller:</span>';

  Object.values(ORGANELLE_DB).forEach(org => {
    const btn = document.createElement('button');
    btn.className = 'chip-btn';
    btn.dataset.org = org.id;
    btn.innerHTML = `<span>${org.icon}</span> ${org.name}`;
    btn.onclick = () => openOrganellePopup(org.id);
    if (org.isBasic) basicBox.appendChild(btn);
    else orgBox.appendChild(btn);
  });
}

function tagAndRegisterOrganelleHierarchy(rootObj, orgId) {
  rootObj.traverse(child => {
    if (child.isMesh) {
      child.userData.orgId = orgId;
      cellClickables.push(child);
    }
  });
}

function createSingle3DCellModel(type, offsetX = 0, scale = 1.0) {
  const group = new THREE.Group();
  group.position.x = offsetX;
  group.scale.setScalar(scale);

  const isPlant = type === 'plant';
  const bump = getOrganicBumpTexture();

  if (isPlant) {
    // BÜTÜNLEŞİK ALTIGEN SELÜLOZ HÜCRE DUVARI (Z-fighting önlemek için üst kapağı açık silindir + ayrı alt taban)
    const wallGroup = new THREE.Group();
    const outerWallGeo = new THREE.CylinderGeometry(3.26, 3.26, 1.52, 6, 1, true);
    const outerWallMat = new THREE.MeshPhysicalMaterial({
      map: getFibrousCellWallTexture(),
      bumpMap: bump,
      bumpScale: 0.03,
      color: 0x1e6b3a,
      roughness: 0.45,
      clearcoat: 0.3,
      side: THREE.DoubleSide
    });
    const wallMesh = new THREE.Mesh(outerWallGeo, outerWallMat);
    wallMesh.position.y = -0.24;
    wallGroup.add(wallMesh);

    const wallBottom = new THREE.Mesh(new THREE.CircleGeometry(3.26, 6), outerWallMat);
    wallBottom.rotation.x = -Math.PI / 2;
    wallBottom.rotation.z = Math.PI / 6;
    wallBottom.position.y = -1.0;
    wallGroup.add(wallBottom);

    // Köşe birleşim sütunları (üst yüzeyi topRimMesh altında kalacak şekilde)
    for (let k = 0; k < 6; k++) {
      const ang = (k / 6) * Math.PI * 2 + Math.PI / 6;
      const cornerPillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 1.44, 10, 1, true),
        outerWallMat
      );
      cornerPillar.position.set(Math.cos(ang) * 3.16, -0.26, Math.sin(ang) * 3.16);
      wallGroup.add(cornerPillar);
    }

    const topRimGeo = new THREE.RingGeometry(2.84, 3.27, 6);
    topRimGeo.rotateX(-Math.PI / 2);
    topRimGeo.rotateY(Math.PI / 6);
    const topRimMesh = new THREE.Mesh(topRimGeo, new THREE.MeshStandardMaterial({ color: 0x4ca66b, roughness: 0.45, side: THREE.DoubleSide }));
    topRimMesh.position.y = 0.53;
    wallGroup.add(topRimMesh);

    tagAndRegisterOrganelleHierarchy(wallGroup, 'hucre_duvari');
    group.add(wallGroup);
  }

  // Hücre Zarı (Üst kapağı açık iç zar + belirgin iç zar çerçevesi, Z-fighting sıfır)
  const memGroup = new THREE.Group();
  if (isPlant) {
    const pMem = new THREE.Mesh(
      new THREE.CylinderGeometry(2.83, 2.83, 1.44, 6, 1, true),
      new THREE.MeshPhysicalMaterial({ color: 0xb89b3c, roughness: 0.35, clearcoat: 0.45, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    );
    pMem.position.y = -0.24;
    memGroup.add(pMem);

    const pMemRimGeo = new THREE.RingGeometry(2.74, 2.85, 6);
    pMemRimGeo.rotateX(-Math.PI / 2);
    pMemRimGeo.rotateY(Math.PI / 6);
    const pMemRim = new THREE.Mesh(pMemRimGeo, new THREE.MeshStandardMaterial({ color: 0xd4b94e, roughness: 0.35, side: THREE.DoubleSide }));
    pMemRim.position.y = 0.49;
    memGroup.add(pMemRim);
  } else {
    const aMemGeo = new THREE.SphereGeometry(3.0, 48, 32, 0, Math.PI * 2, Math.PI * 0.44, Math.PI * 0.56);
    const posAttr = aMemGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i), vy = posAttr.getY(i), vz = posAttr.getZ(i);
      const wave = 1 + 0.035 * Math.sin(vx * 2.1) * Math.cos(vz * 2.1);
      posAttr.setXYZ(i, vx * wave, vy, vz * wave);
    }
    aMemGeo.computeVertexNormals();
    const aMem = new THREE.Mesh(
      aMemGeo,
      new THREE.MeshPhysicalMaterial({ color: 0x264b6e, bumpMap: bump, bumpScale: 0.04, roughness: 0.25, clearcoat: 0.65, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
    );
    memGroup.add(aMem);

    const memRim = new THREE.Mesh(
      new THREE.TorusGeometry(2.94, 0.1, 18, 64),
      new THREE.MeshPhysicalMaterial({ color: 0x5b89a8, roughness: 0.35, clearcoat: 0.5 })
    );
    memRim.rotation.x = Math.PI / 2;
    memRim.position.y = 0.52;
    memGroup.add(memRim);
  }
  tagAndRegisterOrganelleHierarchy(memGroup, 'hucre_zari');
  group.add(memGroup);

  // Sitoplazma (Z-fighting önlemek için zar çerçevesinin altında konumlandırılmış tek katman)
  const cytoGeo = isPlant ? new THREE.CircleGeometry(2.8, 6) : new THREE.CircleGeometry(2.86, 48);
  cytoGeo.rotateX(-Math.PI / 2);
  if (isPlant) cytoGeo.rotateY(Math.PI / 6);
  const cytoMesh = new THREE.Mesh(
    cytoGeo,
    new THREE.MeshPhysicalMaterial({ color: isPlant ? 0x0b2e23 : 0x0c243c, roughness: 0.25, clearcoat: 0.5, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
  );
  cytoMesh.position.y = isPlant ? 0.36 : 0.44;
  tagAndRegisterOrganelleHierarchy(cytoMesh, 'sitoplazma');
  group.add(cytoMesh);

  // Çekirdek (Bitkide sol-üst bölgede, hayvanda merkezde)
  const nucPos = isPlant ? new THREE.Vector3(-1.05, 0.68, -0.55) : new THREE.Vector3(0, 0.68, -0.1);
  const nucModel = buildDetailed3DOrganelleMesh('cekirdek');
  nucModel.scale.setScalar(isPlant ? 0.68 : 0.84);
  nucModel.position.copy(nucPos);
  tagAndRegisterOrganelleHierarchy(nucModel, 'cekirdek');
  group.add(nucModel);

  // Endoplazmik Retikulum (Çekirdeği çevreleyen kıvrımlı ağ)
  const erModel = buildDetailed3DOrganelleMesh('endoplazmik_retikulum');
  erModel.scale.setScalar(isPlant ? 0.62 : 0.76);
  erModel.position.set(nucPos.x, 0.56, nucPos.z);
  tagAndRegisterOrganelleHierarchy(erModel, 'endoplazmik_retikulum');
  group.add(erModel);

  // Golgi Cisimciği (Bitkide alt-orta açık alanda, diğer organellerden bağımsız)
  const golgiModel = buildDetailed3DOrganelleMesh('golgi');
  golgiModel.scale.setScalar(isPlant ? 0.42 : 0.5);
  golgiModel.position.set(isPlant ? -0.15 : 1.35, 0.66, isPlant ? 1.15 : -0.85);
  golgiModel.rotation.y = isPlant ? 0.25 : 0.6;
  tagAndRegisterOrganelleHierarchy(golgiModel, 'golgi');
  group.add(golgiModel);

  // Mitokondriler (Sıfır çakışma olacak şekilde açık sitoplazma alanlarında)
  const mitoCoords = isPlant
    ? [[-1.35, 0.64, 1.25, 0.25], [0.25, 0.64, -1.75, -0.15]]
    : [[-0.2, 0.65, -1.85, 0.1], [-1.35, 0.65, 1.35, 0.5], [1.25, 0.65, 1.35, -0.4], [1.95, 0.65, 0.1, 1.3]];
  mitoCoords.forEach(mc => {
    const mModel = buildDetailed3DOrganelleMesh('mitokondri');
    mModel.scale.setScalar(isPlant ? 0.36 : 0.42);
    mModel.position.set(mc[0], mc[1], mc[2]);
    mModel.rotation.y = mc[3];
    tagAndRegisterOrganelleHierarchy(mModel, 'mitokondri');
    group.add(mModel);
  });

  // Koful (Bitkide sağ tarafta bağımsız dev mavi su kofulu, hayvanda küçük kofullar)
  if (isPlant) {
    const vacModel = buildDetailed3DOrganelleMesh('koful');
    vacModel.scale.set(0.68, 0.6, 1.14);
    vacModel.position.set(1.25, 0.62, -0.05);
    vacModel.rotation.y = 0.12;
    tagAndRegisterOrganelleHierarchy(vacModel, 'koful');
    group.add(vacModel);
  } else {
    [[-1.95, 0.62, -0.15], [-1.75, 0.62, 0.55], [1.85, 0.62, -0.45]].forEach(vc => {
      const vSmall = buildDetailed3DOrganelleMesh('koful');
      vSmall.scale.setScalar(0.24);
      vSmall.position.set(vc[0], vc[1], vc[2]);
      tagAndRegisterOrganelleHierarchy(vSmall, 'koful');
      group.add(vSmall);
    });
  }

  // Ribozomlar
  const riboCoords = isPlant
    ? [[-0.35, 0.68, 0.35], [-1.65, 0.68, -1.35], [0.15, 0.68, 1.85]]
    : [[0.65, 0.68, 1.25], [-0.55, 0.68, -1.35], [1.45, 0.68, 0.35]];
  riboCoords.forEach(rc => {
    const rMod = buildDetailed3DOrganelleMesh('ribozom');
    rMod.scale.setScalar(0.15);
    rMod.position.set(rc[0], rc[1], rc[2]);
    tagAndRegisterOrganelleHierarchy(rMod, 'ribozom');
    group.add(rMod);
  });

  // Kloroplastlar (Bitkide koful ve çekirdekten tamamen ayrı 3 temiz konum)
  if (isPlant) {
    [
      [-1.95, 0.64, 0.35, 1.25],
      [0.85, 0.64, 1.65, -0.4],
      [-0.55, 0.64, -1.78, 0.35]
    ].forEach(cc => {
      const cMod = buildDetailed3DOrganelleMesh('kloroplast');
      cMod.scale.setScalar(0.36);
      cMod.position.set(cc[0], cc[1], cc[2]);
      cMod.rotation.y = cc[3];
      tagAndRegisterOrganelleHierarchy(cMod, 'kloroplast');
      group.add(cMod);
    });
  }

  // Sentrozom ve Lizozom (Hayvanda)
  if (!isPlant) {
    const centMod = buildDetailed3DOrganelleMesh('sentrozom');
    centMod.scale.setScalar(0.38);
    centMod.position.set(-1.25, 0.72, -1.25);
    tagAndRegisterOrganelleHierarchy(centMod, 'sentrozom');
    group.add(centMod);

    const lysoMod = buildDetailed3DOrganelleMesh('lizozom');
    lysoMod.scale.setScalar(0.32);
    lysoMod.position.set(0.15, 0.68, 1.65);
    tagAndRegisterOrganelleHierarchy(lysoMod, 'lizozom');
    group.add(lysoMod);
  }

  const anchors = isPlant ? [
    { orgId: 'hucre_duvari', pos: new THREE.Vector3(offsetX + 3.05 * scale, 0.35, 0.35) },
    { orgId: 'hucre_zari', pos: new THREE.Vector3(offsetX - 2.75 * scale, 0.45, 0.95 * scale) },
    { orgId: 'sitoplazma', pos: new THREE.Vector3(offsetX - 0.55 * scale, 0.45, 0.45 * scale) },
    { orgId: 'cekirdek', pos: new THREE.Vector3(offsetX - 1.05 * scale, 1.48 * scale, -0.55 * scale) },
    { orgId: 'endoplazmik_retikulum', pos: new THREE.Vector3(offsetX - 0.3 * scale, 1.02 * scale, -1.0 * scale) },
    { orgId: 'koful', pos: new THREE.Vector3(offsetX + 1.25 * scale, 1.28 * scale, -0.05 * scale) },
    { orgId: 'golgi', pos: new THREE.Vector3(offsetX - 0.15 * scale, 1.0 * scale, 1.15 * scale) },
    { orgId: 'mitokondri', pos: new THREE.Vector3(offsetX - 1.35 * scale, 0.98 * scale, 1.25 * scale) },
    { orgId: 'kloroplast', pos: new THREE.Vector3(offsetX + 0.85 * scale, 0.98 * scale, 1.65 * scale) },
    { orgId: 'ribozom', pos: new THREE.Vector3(offsetX + 0.15 * scale, 0.95 * scale, 1.95 * scale) }
  ] : [
    { orgId: 'hucre_zari', pos: new THREE.Vector3(offsetX + 3.1 * scale, 0.45, -0.2) },
    { orgId: 'sitoplazma', pos: new THREE.Vector3(offsetX - 1.15 * scale, 0.42, 2.2 * scale) },
    { orgId: 'cekirdek', pos: new THREE.Vector3(offsetX, 1.58 * scale, -0.1 * scale) },
    { orgId: 'mitokondri', pos: new THREE.Vector3(offsetX + 1.65 * scale, 0.95 * scale, 1.55 * scale) },
    { orgId: 'sentrozom', pos: new THREE.Vector3(offsetX - 1.85 * scale, 1.05 * scale, -1.55 * scale) },
    { orgId: 'lizozom', pos: new THREE.Vector3(offsetX + 0.35 * scale, 0.95 * scale, 2.05 * scale) },
    { orgId: 'golgi', pos: new THREE.Vector3(offsetX + 1.85 * scale, 1.05 * scale, -1.25 * scale) },
    { orgId: 'endoplazmik_retikulum', pos: new THREE.Vector3(offsetX + 0.95 * scale, 1.15 * scale, -0.25 * scale) },
    { orgId: 'koful', pos: new THREE.Vector3(offsetX - 2.25 * scale, 0.9 * scale, 0.15 * scale) },
    { orgId: 'ribozom', pos: new THREE.Vector3(offsetX - 1.45 * scale, 0.92 * scale, 1.45 * scale) }
  ];

  anchors.forEach(a => cellLabelAnchors.push(a));
  return group;
}

function rebuildCell3DModels() {
  if (!cellRootGroup) return;
  while (cellRootGroup.children.length > 0) {
    cellRootGroup.remove(cellRootGroup.children[0]);
  }
  cellClickables = [];
  cellLabelAnchors = [];

  if (currentCellType === 'animal') {
    cellRootGroup.add(createSingle3DCellModel('animal', 0, 1.12));
    cellCamSpherical.radius = 8.5;
  } else if (currentCellType === 'plant') {
    cellRootGroup.add(createSingle3DCellModel('plant', 0, 1.12));
    cellCamSpherical.radius = 8.8;
  } else {
    cellRootGroup.add(createSingle3DCellModel('animal', -3.15, 0.86));
    cellRootGroup.add(createSingle3DCellModel('plant', 3.15, 0.86));
    cellCamSpherical.radius = 11.2;
  }
  updateCellCameraPosition();
  buildCell3DOverlayLabels();
}

function buildCell3DOverlayLabels() {
  const overlay = document.getElementById('cellLabelsOverlay');
  overlay.innerHTML = '';

  cellLabelAnchors.forEach((a, idx) => {
    const org = ORGANELLE_DB[a.orgId];
    if (!org) return;
    const lbl = document.createElement('div');
    lbl.className = 'scene-label';
    lbl.id = 'cell-lbl-' + idx;
    lbl.innerHTML = `<span class="dot" style="background:${org.color}"></span>${org.name}`;
    lbl.onclick = e => {
      e.stopPropagation();
      openOrganellePopup(a.orgId);
    };
    overlay.appendChild(lbl);
  });
}

function updateCellLabels2D() {
  if (!cellLabelsVisible || currentCellDim !== '3d' || activeModule !== 'cell') return;
  const holder = document.getElementById('cellCanvasHolder');
  const w = holder.clientWidth, h = holder.clientHeight;

  cellLabelAnchors.forEach((a, idx) => {
    const el = document.getElementById('cell-lbl-' + idx);
    if (!el) return;
    const v = a.pos.clone();
    v.applyMatrix4(cellRootGroup.matrixWorld);
    v.project(cellCamera);
    el.style.left = `${(v.x * 0.5 + 0.5) * w}px`;
    el.style.top = `${(-(v.y * 0.5) + 0.5) * h}px`;
  });
}

function checkRaycasterOrganelleClick(event) {
  const rect = cellRenderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, cellCamera);
  const hits = raycaster.intersectObjects(cellClickables, true);
  if (hits.length > 0) {
    const orgId = hits[0].object.userData.orgId;
    if (orgId) openOrganellePopup(orgId);
  }
}

function highlightOrganelleIn3D(orgId) {
  cellClickables.forEach(mesh => {
    if (mesh.material && mesh.material.emissive) {
      mesh.material.emissive.setHex(mesh.userData.orgId === orgId ? 0x38bdf8 : 0x000000);
      mesh.material.emissiveIntensity = mesh.userData.orgId === orgId ? 0.55 : 0;
    }
  });
}

function setCellType(type) {
  currentCellType = type;
  playTone(580, 0.09, 'triangle', 0.08);
  document.getElementById('btnCellAnimal').classList.toggle('active', type === 'animal');
  document.getElementById('btnCellPlant').classList.toggle('active', type === 'plant');
  document.getElementById('btnCellCompare').classList.toggle('active', type === 'compare');

  // Karşılaştırma seçildiğinde sağ çekmeceyi otomatik aç
  if (type === 'compare') {
    document.getElementById('cellCompareDrawer').classList.add('open');
    document.getElementById('cellDrawerBtn').classList.add('active');
  }

  Object.values(ORGANELLE_DB).forEach(org => {
    const btn = document.querySelector(`[data-org="${org.id}"]`);
    if (!btn) return;
    if (type === 'animal' && !org.inAnimal) btn.style.opacity = '0.38';
    else if (type === 'plant' && !org.inPlant) btn.style.opacity = '0.38';
    else btn.style.opacity = '1';
  });

  rebuildCell3DModels();
  render2DCellDiagrams();
}

function setCellDimension(dim) {
  currentCellDim = dim;
  playTone(640, 0.08, 'sine', 0.07);
  document.getElementById('btnDim3D').classList.toggle('active', dim === '3d');
  document.getElementById('btnDim2D').classList.toggle('active', dim === '2d');
  document.getElementById('cell2DContainer').classList.toggle('active', dim === '2d');
  document.getElementById('cellLabelsOverlay').style.display = (dim === '3d' && cellLabelsVisible) ? 'block' : 'none';
}

function toggleCellLabels() {
  cellLabelsVisible = !cellLabelsVisible;
  document.getElementById('btnCellLabels').classList.toggle('active', cellLabelsVisible);
  document.getElementById('cellLabelsOverlay').style.display = (currentCellDim === '3d' && cellLabelsVisible) ? 'block' : 'none';
  render2DCellDiagrams();
}

function toggleCellAutoSpin() {
  cellAutoSpin = !cellAutoSpin;
  const btn = document.getElementById('btnCellSpin');
  btn.textContent = cellAutoSpin ? '⏸️ Döndür (Açık)' : '▶️ Döndür (Kapalı)';
  btn.classList.toggle('active', cellAutoSpin);
}

function switchCompareSubTab(tab) {
  ['diff', 'sim', 'work'].forEach(t => {
    document.getElementById('cmpTab-' + t).classList.toggle('active', t === tab);
    document.getElementById('cmpContent-' + t).style.display = t === tab ? 'flex' : 'none';
  });
}

const CELL_2D_CALLOUTS = {
  animal: [
    { id: 'hucre_zari', label: 'Hücre Zarı', tx: 356, ty: 94, lx: 88, ly: 75, diff: false },
    { id: 'sitoplazma', label: 'Sitoplazma', tx: 240, ty: 215, lx: 88, ly: 165, diff: false },
    { id: 'lizozom', label: 'Lizozom', tx: 180, ty: 275, lx: 88, ly: 255, diff: true },
    { id: 'sentrozom', label: 'Sentrozom', tx: 268, ty: 282, lx: 88, ly: 345, diff: true },
    { id: 'golgi', label: 'Golgi Cisimciği', tx: 285, ty: 385, lx: 95, ly: 445, diff: false },
    { id: 'koful', label: 'Koful (Küçük-Çok)', tx: 465, ty: 100, lx: 695, ly: 80, diff: true },
    { id: 'mitokondri', label: 'Mitokondri', tx: 540, ty: 145, lx: 705, ly: 165, diff: false },
    { id: 'endoplazmik_retikulum', label: 'Endoplazmik Retikulum', tx: 545, ty: 240, lx: 685, ly: 255, diff: false },
    { id: 'cekirdek', label: 'Çekirdek', tx: 435, ty: 275, lx: 705, ly: 345, diff: false },
    { id: 'ribozom', label: 'Ribozom', tx: 528, ty: 406, lx: 705, ly: 445, diff: false }
  ],
  plant: [
    { id: 'hucre_duvari', label: 'Hücre Duvarı', tx: 205, ty: 112, lx: 92, ly: 70, diff: true },
    { id: 'hucre_zari', label: 'Hücre Zarı', tx: 206, ty: 158, lx: 92, ly: 140, diff: false },
    { id: 'cekirdek', label: 'Çekirdek', tx: 315, ty: 165, lx: 92, ly: 205, diff: false },
    { id: 'endoplazmik_retikulum', label: 'Endoplazmik Retikulum', tx: 262, ty: 232, lx: 112, ly: 275, diff: false },
    { id: 'mitokondri', label: 'Mitokondri', tx: 210, ty: 315, lx: 92, ly: 355, diff: false },
    { id: 'golgi', label: 'Golgi Cisimciği', tx: 295, ty: 395, lx: 98, ly: 445, diff: false },
    { id: 'kloroplast', label: 'Kloroplast', tx: 470, ty: 120, lx: 705, ly: 85, diff: true },
    { id: 'ribozom', label: 'Ribozom', tx: 619, ty: 184, lx: 705, ly: 165, diff: false },
    { id: 'koful', label: 'Koful (Büyük-Az)', tx: 525, ty: 260, lx: 695, ly: 255, diff: true },
    { id: 'sitoplazma', label: 'Sitoplazma', tx: 552, ty: 396, lx: 705, ly: 410, diff: false }
  ]
};

function create2DCellSVG(type, isCompareMode = false) {
  const isPlant = type === 'plant';
  const imgBase = isPlant ? '/assets/fen-laboratuvari/gorseller/hucre_2d_bitki' : '/assets/fen-laboratuvari/gorseller/hucre_2d_hayvan';
  const title = isPlant ? '🌿 2B Bitki Hücresi (Köşeli Yapı)' : '🦁 2B Hayvan Hücresi (Yuvarlak Yapı)';
  const titleColor = isPlant ? '#4ade80' : '#fb7185';
  const callouts = CELL_2D_CALLOUTS[type];

  const arrowsMarkup = cellLabelsVisible ? callouts.map(c => {
    const isHighlighted = isCompareMode && c.diff;
    const strokeCol = isHighlighted ? '#f59e0b' : '#38bdf8';
    const fillBg = isHighlighted ? 'rgba(120, 53, 15, 0.94)' : 'rgba(8, 14, 28, 0.92)';
    const textCol = isHighlighted ? '#fde68a' : '#f8fafc';
    const boxW = Math.max(88, c.label.length * 7.8 + 20);
    const boxX = c.lx < 400 ? Math.max(6, c.lx - boxW / 2) : Math.min(794 - boxW, c.lx - boxW / 2);
    const lineStartX = c.lx < 400 ? boxX + boxW : boxX;
    return `
      <g class="svg-callout-group" onclick="openOrganellePopup('${c.id}')">
        <line x1="${lineStartX}" y1="${c.ly}" x2="${c.tx}" y2="${c.ty}" stroke="${strokeCol}" stroke-width="2.4" stroke-linecap="round"/>
        <circle cx="${c.tx}" cy="${c.ty}" r="5" fill="${strokeCol}" stroke="#fff" stroke-width="1.5"/>
        <rect x="${boxX}" y="${c.ly - 14}" width="${boxW}" height="28" rx="8" fill="${fillBg}" stroke="${strokeCol}" stroke-width="${isHighlighted ? 2.2 : 1.5}"/>
        <text x="${boxX + boxW / 2}" y="${c.ly + 4.5}" fill="${textCol}" font-size="12.5" font-weight="700" text-anchor="middle" font-family="Outfit, sans-serif">${isHighlighted ? '★ ' : ''}${c.label}</text>
      </g>
    `;
  }).join('') : '';

  return `
    <div class="svg-cell-box">
      <h4 style="color:${titleColor}; font-size:0.95rem;">${title}</h4>
      <div class="cell-2d-img-stage">
        <img src="${imgBase}.png" alt="${title}" onerror="if(!this.dataset.t){this.dataset.t=1;this.src='${imgBase}.jpeg';}else if(this.dataset.t==1){this.dataset.t=2;this.src='${imgBase}.jpg';}">
        <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
          ${arrowsMarkup}
        </svg>
      </div>
    </div>
  `;
}

function render2DCellDiagrams() {
  const box = document.getElementById('cell2DContainer');
  if (!box) return;
  if (currentCellType === 'compare') {
    box.innerHTML = `
      <div class="cell-2d-legend">
        <span style="color:#38bdf8;">● Mavi Oklar: Ortak Yapılar</span>
        <span style="color:#fbbf24;">★ Turuncu Oklar: Bitki ve Hayvanda Farklı Olan Yapılar</span>
      </div>
      <div class="cell-2d-grid">
        ${create2DCellSVG('animal', true)}
        ${create2DCellSVG('plant', true)}
      </div>
    `;
  } else {
    box.innerHTML = `<div class="cell-2d-grid">${create2DCellSVG(currentCellType, false)}</div>`;
  }
}

/* ============================================================================
   7. MODÜL 3: HÜCREDEN ORGANİZMAYA GÖRSEL VE EFEKTLİ GEÇİŞ SİSTEMİ
============================================================================ */
let hStage = 1;
let hPath = 'animal';
let hAutoPlaying = false;
let hAutoTimer = null;

const HIERARCHY_DATA = {
  animal: [
    {
      img: '/assets/fen-laboratuvari/gorseller/asama1_hucre.jpeg',
      title: '1. Basamak: Hücre (Kalp Kası Hücresi)',
      desc: 'Canlıların canlılık özelliği gösteren en küçük yapı ve görev birimidir. Kalp kası hücresi kendi başına kasılıp gevşeyebilen mikroskobik bir birimdir.',
      analogy: '🏙️ Günlük Yaşam Benzetmesi: Bir binayı oluşturan tek bir TUĞLA veya bir kitaptaki tek bir HARF gibidir.'
    },
    {
      img: '/assets/fen-laboratuvari/gorseller/asama2_doku.jpeg',
      title: '2. Basamak: Doku (Kas Dokusu)',
      desc: 'Hücreler hızla bölünüp çoğalarak bir araya gelir ve aynı görevi yapan DOKUYU oluşturur! Kas hücreleri birleşerek sağlam kas dokusunu meydana getirir.',
      analogy: '🏙️ Günlük Yaşam Benzetmesi: Tuğlaların birleşerek oluşturduğu DUVAR veya harflerin oluşturduğu KELİME gibidir.'
    },
    {
      img: '/assets/fen-laboratuvari/gorseller/asama3_organ.jpeg',
      title: '3. Basamak: Organ (Kalp)',
      desc: 'Farklı dokuların (kas dokusu, kan dokusu, epitel doku) belirli bir görevi yerine getirmek üzere birleşmesiyle ORGAN oluşur.',
      analogy: '🏙️ Günlük Yaşam Benzetmesi: Duvarların birleşerek oluşturduğu ODA veya kelimelerin oluşturduğu CÜMLE gibidir.'
    },
    {
      img: '/assets/fen-laboratuvari/gorseller/asama4_sistem.jpeg',
      title: '4. Basamak: Sistem (Dolaşım Sistemi)',
      desc: 'Kalp, atardamarlar, toplardamarlar ve kılcal damarlar gibi organların birlikte uyum içinde çalışmasıyla SİSTEM (Dolaşım Sistemi) meydana gelir.',
      analogy: '🏙️ Günlük Yaşam Benzetmesi: Odaların birleşerek oluşturduğu DAİRE veya cümlelerin oluşturduğu PARAGRAF gibidir.'
    },
    {
      img: '/assets/fen-laboratuvari/gorseller/asama5_organizma.jpeg',
      title: '5. Basamak: Organizma (İnsan)',
      desc: 'Dolaşım, solunum, sindirim, sinir ve destek-hareket sistemlerinin bir araya gelerek uyum içinde çalışmasıyla canlı ORGANİZMA oluşur!',
      analogy: '🏙️ Günlük Yaşam Benzetmesi: Dairelerin birleşerek oluşturduğu APARTMAN veya paragrafların oluşturduğu KİTAP gibidir.'
    }
  ],
  plant: [
    {
      img: '/assets/fen-laboratuvari/gorseller/bitki_asama1_hucre.jpeg',
      title: '1. Basamak: Hücre (Bitki Yaprak Hücresi)',
      desc: 'Köşeli hücre duvarına, büyük kofula ve kloroplastlara sahip olan en küçük canlı bitki yapı birimidir.',
      analogy: '🌱 Benzetme: Yaprağı oluşturan tek bir yeşil mikro-fabrika hücresi.'
    },
    {
      img: '/assets/fen-laboratuvari/gorseller/bitki_asama2_doku.jpeg',
      title: '2. Basamak: Doku (Bitki Yaprak Dokusu)',
      desc: 'Bitki hücrelerinin hızla bölünüp çoğalarak tuğla duvar gibi yan yana dizilmesiyle bitki DOKUSU (özümleme ve iletim dokusu) oluşur.',
      analogy: '🌱 Benzetme: Hücrelerin kenetlenerek oluşturduğu yeşil yaprak katmanı.'
    },
    {
      img: '/assets/fen-laboratuvari/gorseller/bitki_asama3_organ.jpeg',
      title: '3. Basamak: Organ (Yaprak)',
      desc: 'Bitki dokularının bir araya gelmesiyle fotosentez, terleme ve gaz alışverişi yapan YAPRAK organı oluşur.',
      analogy: '🌱 Benzetme: Kök, gövde, yaprak ve çiçek bitkideki başlıca organlardır.'
    },
    {
      img: '/assets/fen-laboratuvari/gorseller/bitki_asama4_sistem.jpeg',
      title: '4. Basamak: Sistem (Sürgün Sistemi)',
      desc: 'Yaprak, gövde, dal ve çiçek gibi organların birlikte çalışmasıyla bitkideki SÜRGÜN SİSTEMİ meydana gelir.',
      analogy: '🌱 Benzetme: Toprak üstündeki organların oluşturduğu bütünleşik sistem.'
    },
    {
      img: '/assets/fen-laboratuvari/gorseller/bitki_asama5_organizma.jpeg',
      title: '5. Basamak: Organizma (Çiçekli Bitki)',
      desc: 'Kök sistemi ve sürgün sisteminin tam uyum içinde birleşmesiyle bağımsız yaşayan ÇİÇEKLİ BİTKİ ORGANİZMASI oluşur!',
      analogy: '🌱 Benzetme: Kökten çiçeğe eksiksiz çalışan canlı bitki.'
    }
  ]
};

function setHierarchyPath(path) {
  hPath = path;
  playTone(580, 0.08, 'triangle', 0.08);
  document.getElementById('hPathAnimal').classList.toggle('active', path === 'animal');
  document.getElementById('hPathPlant').classList.toggle('active', path === 'plant');
  setHierarchyStage(hStage);
  initOrderGame();
}

function playTransitionParticles() {
  const canvas = document.getElementById('hierarchyFxCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const particles = Array.from({ length: 32 }, () => ({
    x: w / 2,
    y: h / 2,
    vx: (Math.random() - 0.5) * 14,
    vy: (Math.random() - 0.5) * 10,
    r: 4 + Math.random() * 10,
    alpha: 1,
    color: hPath === 'animal' ? '#fb7185' : '#4ade80'
  }));

  let frame = 0;
  const timer = setInterval(() => {
    frame++;
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha *= 0.9;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    if (frame >= 22) {
      clearInterval(timer);
      ctx.clearRect(0, 0, w, h);
    }
  }, 25);
}

function setHierarchyStage(stage) {
  hStage = stage;
  playTone(460 + stage * 70, 0.12, 'triangle', 0.08);

  for (let i = 1; i <= 5; i++) {
    document.getElementById('hbtn-' + i).classList.toggle('active', i === stage);
  }
  document.getElementById('hStageBadge').textContent = `Basamak ${stage} / 5`;

  const info = HIERARCHY_DATA[hPath][stage - 1];
  const imgEl = document.getElementById('hierarchyStageImg');
  const frameEl = imgEl.parentElement;
  frameEl.style.backgroundImage = 'none';
  imgEl.style.display = 'block';
  imgEl.classList.add('transitioning');
  playTransitionParticles();

  setTimeout(() => {
    const base = info.img.replace(/\.(jpeg|jpg|png)$/i, '');
    let tryIdx = 0;
    const exts = ['.jpeg', '.jpg', '.png'];
    imgEl.onerror = () => {
      tryIdx++;
      if (tryIdx < exts.length) imgEl.src = base + exts[tryIdx];
    };
    imgEl.src = base + exts[0];
    document.getElementById('hStageTitle').textContent = info.title;
    document.getElementById('hStageDesc').textContent = info.desc;
    document.getElementById('hStageAnalogy').innerHTML = info.analogy;
    requestAnimationFrame(() => imgEl.classList.remove('transitioning'));
  }, 240);
}

function nextHierarchyStage() {
  setHierarchyStage(hStage < 5 ? hStage + 1 : 1);
}

function prevHierarchyStage() {
  setHierarchyStage(hStage > 1 ? hStage - 1 : 5);
}

function toggleHierarchyAutoPlay() {
  hAutoPlaying = !hAutoPlaying;
  const btn = document.getElementById('hAutoPlayBtn');
  if (hAutoPlaying) {
    btn.textContent = '⏸ Geçiş Animasyonunu Durdur';
    btn.classList.add('active');
    setHierarchyStage(1);
    hAutoTimer = setInterval(() => {
      if (hStage < 5) {
        setHierarchyStage(hStage + 1);
      } else {
        hAutoPlaying = false;
        btn.textContent = '🎬 Geçiş Animasyonunu Oynat';
        btn.classList.remove('active');
        clearInterval(hAutoTimer);
        playSuccessSound();
      }
    }, 2800);
  } else {
    btn.textContent = '🎬 Geçiş Animasyonunu Oynat';
    btn.classList.remove('active');
    clearInterval(hAutoTimer);
  }
}

/* HİYERARŞİ SIRALAMA ETKİNLİĞİ */
let userOrderList = [];

function initOrderGame() {
  userOrderList = [];
  document.getElementById('orderSelectedBox').innerHTML = '';
  document.getElementById('orderFeedback').textContent = '';

  const items = hPath === 'animal' ? [
    { rank: 1, label: '🧫 Kas Hücresi (Hücre)' },
    { rank: 2, label: '🧱 Kas Dokusu (Doku)' },
    { rank: 3, label: '❤️ Kalp (Organ)' },
    { rank: 4, label: '🩸 Dolaşım Sistemi (Sistem)' },
    { rank: 5, label: '🧍 İnsan (Organizma)' }
  ] : [
    { rank: 1, label: '🧫 Yaprak Hücresi (Hücre)' },
    { rank: 2, label: '🧱 Yaprak Dokusu (Doku)' },
    { rank: 3, label: '🍃 Yaprak (Organ)' },
    { rank: 4, label: '🌱 Sürgün Sistemi (Sistem)' },
    { rank: 5, label: '🌻 Ayçiçeği Bitkisi (Organizma)' }
  ];

  const shuffled = [...items].sort(() => Math.random() - 0.5);
  const pool = document.getElementById('orderPool');
  pool.innerHTML = '';

  shuffled.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'chip-btn';
    btn.textContent = item.label;
    btn.onclick = () => {
      if (btn.disabled) return;
      const expectedRank = userOrderList.length + 1;
      if (item.rank === expectedRank) {
        btn.disabled = true;
        btn.style.opacity = '0.35';
        userOrderList.push(item);
        playTone(520 + expectedRank * 65, 0.1, 'triangle', 0.09);
        const row = document.createElement('div');
        row.style.cssText = 'padding:6px 10px; background:rgba(34,197,94,0.2); border:1px solid #22c55e; border-radius:8px; font-size:0.8rem; font-weight:700; color:#86efac;';
        row.textContent = `${expectedRank}. ${item.label}`;
        document.getElementById('orderSelectedBox').appendChild(row);

        if (userOrderList.length === 5) {
          playSuccessSound();
          document.getElementById('orderFeedback').style.color = '#4ade80';
          document.getElementById('orderFeedback').textContent = '🎉 Harika! Basitten karmaşığa doğru sıralamayı tam doğru yaptın!';
          addScore(25);
        }
      } else {
        playErrorSound();
        document.getElementById('orderFeedback').style.color = '#fb7185';
        document.getElementById('orderFeedback').textContent = '⚠️ Sıralama hatalı! En küçük birimden karmaşığa doğru ilerle.';
      }
    };
    pool.appendChild(btn);
  });
}

/* ============================================================================
   8. MODÜL 4: KAPSAMLI DEĞERLENDİRME MERKEZİ (SÜRÜKLE-BIRAK + DÖNÜT SİSTEMİ)
============================================================================ */
let totalLabScore = 0;

function addScore(pts) {
  totalLabScore += pts;
  document.getElementById('totalScoreBadge').textContent = `🌟 Toplam Puan: ${totalLabScore}`;
}

function switchEvalTab(tab) {
  playTone(600, 0.08, 'sine', 0.06);
  ['fill', 'match', 'classify', 'tf', 'quiz'].forEach(t => {
    const btn = document.getElementById('etab-' + t);
    const sec = document.getElementById('evalSection-' + t);
    if (btn) btn.classList.toggle('active', t === tab);
    if (sec) sec.style.display = t === tab ? 'flex' : 'none';
  });
  if (tab === 'quiz' && examRunnerActive) {
    setTimeout(resizeExamDrawCanvas, 60);
  }
}

const FILL_DATA = [
  { q: 'Canlıların canlılık özelliği gösteren en küçük yapı ve görev birimine ___ denir.', ans: 'Hücre' },
  { q: 'Hücreyi dış ortamdan ayıran ve madde giriş-çıkışını denetleyen seçici geçirgen yapıya ___ denir.', ans: 'Hücre Zarı' },
  { q: 'Hücrenin yönetim ve kalıtım merkezi olan, içinde DNA bulunduran temel kısım ___ tir.', ans: 'Çekirdek' },
  { q: 'Organellerin içinde bulunduğu, yumurta akı kıvamındaki yarı akışkan sıvıya ___ denir.', ans: 'Sitoplazma' },
  { q: 'Hücrenin ihtiyaç duyduğu enerjiyi (ATP) üreten enerji santrali organeli ___ dir.', ans: 'Mitokondri' },
  { q: 'Bitki hücrelerine yeşil renk veren ve fotosentezle besin/oksijen üreten organel ___ tır.', ans: 'Kloroplast' },
  { q: 'Hücredeki en küçük ve zarsız organel olup protein sentezleyen yapı ___ dur.', ans: 'Ribozom' },
  { q: 'Ter, süt, gözyaşı ve mukus gibi salgı maddelerini üreten ve paketleyen organel ___ dir.', ans: 'Golgi Cisimciği' },
  { q: 'Hücre içinde madde iletimini sağlayan kanalcıklar sistemine ___ denir.', ans: 'Endoplazmik Retikulum' },
  { q: 'Hayvan hücrelerinde hücre bölünmesinde görev alan ve çiftler halinde bulunan organel ___ dur.', ans: 'Sentrozom' },
  { q: 'Hücre içi sindirimde görevli olan ve yaşlanmış organelleri parçalayan organel ___ dur.', ans: 'Lizozom' },
  { q: 'Benzer görevli hücrelerin bir araya gelmesiyle ___ , dokuların birleşmesiyle de organlar oluşur.', ans: 'Doku' }
];

let selectedWordChip = null;
let fillUserAnswers = {};
let fillChecked = false;

function placeWordInBlank(idx, word) {
  const slot = document.getElementById('blank-' + idx);
  const row = document.getElementById('fill-row-' + idx);
  const fb = document.getElementById('fill-fb-' + idx);
  if (!slot) return;

  if (fillUserAnswers[idx]) {
    const prevChip = document.querySelector(`#fillWordBank .word-chip[data-word="${fillUserAnswers[idx]}"]`);
    if (prevChip) prevChip.classList.remove('used');
  }
  const targetChip = document.querySelector(`#fillWordBank .word-chip[data-word="${word}"]`);
  if (targetChip) {
    targetChip.classList.remove('selected');
    targetChip.classList.add('used');
  }

  fillUserAnswers[idx] = word;
  slot.textContent = word;
  slot.classList.remove('correct', 'wrong');
  slot.classList.add('filled');
  if (row) row.classList.remove('row-correct', 'row-wrong');
  if (fb) fb.innerHTML = '';
  selectedWordChip = null;
  playTone(660, 0.08, 'triangle', 0.08);
}

function initFillBlanks() {
  selectedWordChip = null;
  fillUserAnswers = {};
  fillChecked = false;
  const banner = document.getElementById('fillResultBanner');
  banner.className = 'exam-result-banner';
  banner.textContent = '';

  const bank = document.getElementById('fillWordBank');
  const list = document.getElementById('fillQuestionsList');
  bank.innerHTML = '';
  list.innerHTML = '';

  const words = FILL_DATA.map(d => d.ans).sort(() => Math.random() - 0.5);
  words.forEach(w => {
    const chip = document.createElement('button');
    chip.className = 'word-chip';
    chip.textContent = w;
    chip.dataset.word = w;

    // Fare ve dokunmatik (tablet/telefon) için birleşik Pointer sürükle-bırak + tıklama
    chip.addEventListener('pointerdown', e => {
      if (chip.classList.contains('used')) return;
      e.preventDefault();
      const startX = e.clientX, startY = e.clientY;
      let dragging = false;
      let ghost = null;
      let hoveredSlot = null;

      const onMove = ev => {
        const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY);
        if (!dragging && dist > 6) {
          dragging = true;
          ghost = document.createElement('div');
          ghost.className = 'drag-ghost-pill';
          ghost.textContent = w;
          document.body.appendChild(ghost);
        }
        if (dragging && ghost) {
          ghost.style.left = ev.clientX + 'px';
          ghost.style.top = ev.clientY + 'px';
          document.querySelectorAll('.blank-slot').forEach(s => s.classList.remove('drag-over'));
          ghost.style.display = 'none';
          const elUnder = document.elementFromPoint(ev.clientX, ev.clientY);
          ghost.style.display = 'block';
          const slotEl = elUnder ? elUnder.closest('.blank-slot') : null;
          if (slotEl) {
            slotEl.classList.add('drag-over');
            hoveredSlot = slotEl;
          } else {
            hoveredSlot = null;
          }
        }
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        document.querySelectorAll('.blank-slot').forEach(s => s.classList.remove('drag-over'));
        if (ghost) ghost.remove();

        if (dragging && hoveredSlot) {
          const targetIdx = parseInt(hoveredSlot.dataset.idx, 10);
          placeWordInBlank(targetIdx, w);
        } else if (!dragging) {
          document.querySelectorAll('#fillWordBank .word-chip').forEach(c => c.classList.remove('selected'));
          chip.classList.add('selected');
          selectedWordChip = chip;
          playTone(550, 0.06, 'sine', 0.06);
        }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
    bank.appendChild(chip);
  });

  FILL_DATA.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'fill-row';
    row.id = 'fill-row-' + idx;
    const parts = item.q.split('___');
    row.innerHTML = `
      <div><strong>${idx + 1}.</strong> ${parts[0]} <span class="blank-slot" id="blank-${idx}" data-idx="${idx}" onclick="onBlankSlotClick(${idx})">……………</span> ${parts[1]}</div>
      <div id="fill-fb-${idx}"></div>
    `;
    list.appendChild(row);
  });
}

function onBlankSlotClick(idx) {
  const slot = document.getElementById('blank-' + idx);
  const row = document.getElementById('fill-row-' + idx);
  const fb = document.getElementById('fill-fb-' + idx);
  slot.classList.remove('correct', 'wrong');
  if (row) row.classList.remove('row-correct', 'row-wrong');
  if (fb) fb.innerHTML = '';

  if (selectedWordChip) {
    placeWordInBlank(idx, selectedWordChip.dataset.word);
  } else if (fillUserAnswers[idx]) {
    const prevWord = fillUserAnswers[idx];
    const prevChip = document.querySelector(`#fillWordBank .word-chip[data-word="${prevWord}"]`);
    if (prevChip) prevChip.classList.remove('used');
    delete fillUserAnswers[idx];
    slot.textContent = '……………';
    slot.classList.remove('filled');
  }
}

function checkFillBlanks() {
  let correctCount = 0;
  FILL_DATA.forEach((item, idx) => {
    const slot = document.getElementById('blank-' + idx);
    const row = document.getElementById('fill-row-' + idx);
    const fb = document.getElementById('fill-fb-' + idx);
    slot.classList.remove('correct', 'wrong');
    row.classList.remove('row-correct', 'row-wrong');

    if (fillUserAnswers[idx] === item.ans) {
      slot.classList.add('correct');
      row.classList.add('row-correct');
      fb.innerHTML = `<span class="feedback-tag ok">✅ Doğru!</span>`;
      correctCount++;
    } else {
      slot.classList.add('wrong');
      row.classList.add('row-wrong');
      fb.innerHTML = `<span class="feedback-tag err">❌ Yanlış · Doğrusu: ${item.ans}</span>`;
    }
  });
  if (!fillChecked && correctCount > 0) {
    addScore(correctCount * 10);
    fillChecked = true;
  }
  if (correctCount === FILL_DATA.length) playSuccessSound();
  else playTone(480, 0.12, 'triangle', 0.08);

  const banner = document.getElementById('fillResultBanner');
  banner.className = 'exam-result-banner show ' + (correctCount >= 9 ? 'good' : 'mid');
  banner.innerHTML = `📊 <strong>Boşluk Doldurma Sonucu:</strong> ${FILL_DATA.length} sorudan <strong>${correctCount}</strong> doğru, <strong>${FILL_DATA.length - correctCount}</strong> yanlış! ${correctCount === FILL_DATA.length ? '🎉 Harika, hepsi doğru!' : 'Kırmızı işaretli boşlukların doğrularını inceleyebilirsin.'}`;
}

function resetFillBlanks() { initFillBlanks(); }

const MATCH_SETS = [
  [
    { left: '⚡ Mitokondri', right: 'Besinleri oksijenle parçalayarak hücre için enerji (ATP) üretir.' },
    { left: '🌿 Kloroplast', right: 'Bitki hücresinde güneş ışığıyla fotosentez yaparak besin ve oksijen üretir.' },
    { left: '🔵 Ribozom', right: 'Hücredeki en küçük organeldir; protein sentezinde görevlidir.' },
    { left: '📦 Golgi Cisimciği', right: 'Ter, süt, gözyaşı gibi salgı maddelerini üretir ve paketler.' },
    { left: '🛣️ Endoplazmik Retikulum', right: 'Çekirdek ile hücre zarı arasında madde iletimini sağlayan kanallardır.' },
    { left: '♻️ Lizozom', right: 'Hücre içi sindirim yapar; yaşlı organelleri ve mikropları parçalar.' }
  ],
  [
    { left: '🛡️ Hücre Zarı', right: 'Canlı, esnek ve seçici geçirgen yapısıyla madde giriş-çıkışını kontrol eder.' },
    { left: '🧠 Çekirdek', right: 'Kalıtım maddesi DNA\'yı taşır ve hücrenin tüm faaliyetlerini yönetir.' },
    { left: '🫧 Koful', right: 'Su, besin ve atıkları depolar; bitkide büyük-az, hayvanda küçük-çoktur.' },
    { left: '🧬 Sentrozom', right: 'Hayvan hücresinde bulunur ve hücre bölünmesinde görev alır.' },
    { left: '🧱 Hücre Duvarı (Çeper)', right: 'Bitki hücresini dıştan saran cansız, sert ve tam geçirgen koruyucu katmandır.' },
    { left: '🔩 Makro & Mikro Vida', right: 'Işık mikroskobunda incelenen preparat görüntüsünü netleştirmeyi sağlar.' }
  ]
];

let currentMatchSet = 0, selectedMatchLeftIdx = null, matchUserPairs = {}, matchChecked = false;

function loadMatchSet(setIdx) {
  currentMatchSet = setIdx;
  selectedMatchLeftIdx = null;
  matchUserPairs = {};
  matchChecked = false;
  document.getElementById('msetBtn-1').classList.toggle('active', setIdx === 0);
  document.getElementById('msetBtn-2').classList.toggle('active', setIdx === 1);
  const banner = document.getElementById('matchFeedbackBanner');
  banner.className = 'exam-result-banner';
  banner.textContent = '';

  const pairs = MATCH_SETS[setIdx];
  const leftCol = document.getElementById('matchLeftCol');
  const rightCol = document.getElementById('matchRightCol');
  leftCol.innerHTML = ''; rightCol.innerHTML = '';

  pairs.forEach((p, idx) => {
    const lCard = document.createElement('div');
    lCard.className = 'match-card';
    lCard.id = 'mleft-' + idx;
    lCard.innerHTML = `<span><strong>${idx + 1}.</strong> ${p.left}</span><span class="pair-badge" id="mbadge-l-${idx}" style="display:none;"></span>`;
    lCard.onclick = () => {
      document.querySelectorAll('#matchLeftCol .match-card').forEach(c => c.classList.remove('selected'));
      lCard.classList.add('selected');
      selectedMatchLeftIdx = idx;
      playTone(540, 0.07, 'sine', 0.06);
    };
    leftCol.appendChild(lCard);
  });

  const shuffledRight = pairs.map((p, idx) => ({ text: p.right, idx })).sort(() => Math.random() - 0.5);
  shuffledRight.forEach(r => {
    const rCard = document.createElement('div');
    rCard.className = 'match-card';
    rCard.id = 'mright-' + r.idx;
    rCard.innerHTML = `<span>${r.text}</span><span class="pair-badge" id="mbadge-r-${r.idx}" style="display:none;"></span>`;
    rCard.onclick = () => {
      if (selectedMatchLeftIdx === null) return;
      Object.keys(matchUserPairs).forEach(k => {
        if (matchUserPairs[k] === r.idx) delete matchUserPairs[k];
      });
      matchUserPairs[selectedMatchLeftIdx] = r.idx;
      selectedMatchLeftIdx = null;
      playTone(680, 0.09, 'triangle', 0.08);
      refreshMatchBadges();
    };
    rightCol.appendChild(rCard);
  });
}

function refreshMatchBadges() {
  const pairs = MATCH_SETS[currentMatchSet];
  pairs.forEach((_, idx) => {
    const lCard = document.getElementById('mleft-' + idx);
    const lBadge = document.getElementById('mbadge-l-' + idx);
    const rCard = document.getElementById('mright-' + idx);
    const rBadge = document.getElementById('mbadge-r-' + idx);
    lCard.classList.remove('selected', 'paired', 'checked-ok', 'checked-err');
    rCard.classList.remove('paired', 'checked-ok', 'checked-err');
    lBadge.style.display = 'none';
    rBadge.style.display = 'none';
  });

  Object.keys(matchUserPairs).forEach(lIdxStr => {
    const lIdx = parseInt(lIdxStr, 10);
    const rIdx = matchUserPairs[lIdx];
    const lCard = document.getElementById('mleft-' + lIdx);
    const rCard = document.getElementById('mright-' + rIdx);
    const lBadge = document.getElementById('mbadge-l-' + lIdx);
    const rBadge = document.getElementById('mbadge-r-' + rIdx);
    lCard.classList.add('paired');
    rCard.classList.add('paired');
    lBadge.style.display = 'inline-flex'; lBadge.textContent = lIdx + 1;
    rBadge.style.display = 'inline-flex'; rBadge.textContent = lIdx + 1;
  });
}

function checkMatchAnswers() {
  const pairs = MATCH_SETS[currentMatchSet];
  let correctCount = 0;
  pairs.forEach((_, lIdx) => {
    const lCard = document.getElementById('mleft-' + lIdx);
    const lBadge = document.getElementById('mbadge-l-' + lIdx);
    const chosenR = matchUserPairs[lIdx];
    lCard.classList.remove('paired', 'checked-ok', 'checked-err');
    lBadge.style.display = 'inline-flex';

    if (chosenR === lIdx) {
      lCard.classList.add('checked-ok');
      lBadge.style.background = '#16a34a';
      lBadge.textContent = '✅';
      const rCard = document.getElementById('mright-' + chosenR);
      const rBadge = document.getElementById('mbadge-r-' + chosenR);
      rCard.classList.remove('paired', 'checked-err');
      rCard.classList.add('checked-ok');
      rBadge.style.background = '#16a34a';
      rBadge.textContent = `${lIdx + 1} ✅`;
      correctCount++;
    } else {
      lCard.classList.add('checked-err');
      lBadge.style.background = '#dc2626';
      lBadge.textContent = '❌';
      if (chosenR !== undefined) {
        const rCard = document.getElementById('mright-' + chosenR);
        const rBadge = document.getElementById('mbadge-r-' + chosenR);
        rCard.classList.remove('paired');
        rCard.classList.add('checked-err');
        rBadge.style.background = '#dc2626';
        rBadge.textContent = `${lIdx + 1} ❌`;
      }
    }
  });
  if (!matchChecked && correctCount > 0) {
    addScore(correctCount * 10);
    matchChecked = true;
  }
  if (correctCount === pairs.length) playSuccessSound();
  else playTone(480, 0.12, 'triangle', 0.08);

  const banner = document.getElementById('matchFeedbackBanner');
  banner.className = 'exam-result-banner show ' + (correctCount === pairs.length ? 'good' : 'mid');
  banner.innerHTML = `📊 <strong>Eşleştirme Sonucu:</strong> ${pairs.length} eşleştirmeden <strong>${correctCount}</strong> tanesi doğru! ${correctCount === pairs.length ? '🎉 Tebrikler, hepsi doğru!' : '❌ işaretli kavramları tekrar gözden geçirip yeniden deneyebilirsin.'}`;
}

const CLASSIFY_ITEMS = [
  { name: '🧱 Hücre Duvarı (Çeper)', ans: 'plant', why: 'Bitki hücresini dıştan saran cansız ve sert koruyucu tabakadır; hayvan hücresinde yoktur.' },
  { name: '🌿 Kloroplast (Fotosentez)', ans: 'plant', why: 'Fotosentez yaparak besin ve oksijen üreten bu organel yalnızca bitki hücresinde bulunur.' },
  { name: '🧬 Sentrozom (Sentriyol Çifti)', ans: 'animal', why: 'Hücre bölünmesinde iğ ipliklerini oluşturan sentrozom hayvan hücresine özgüdür.' },
  { name: '🛡️ Hücre Zarı (Seçici Geçirgen)', ans: 'both', why: 'Canlı, esnek ve seçici geçirgen olan hücre zarı her iki hücrede de ortaktır.' },
  { name: '🧠 Çekirdek (Yönetim Merkezi)', ans: 'both', why: 'Hücrenin yönetim ve kalıtım merkezi olan çekirdek hem bitki hem hayvanda bulunur.' },
  { name: '💧 Sitoplazma Sıvısı', ans: 'both', why: 'Organellerin içinde yüzdüğü yarı akışkan sitoplazma her iki hücrede ortaktır.' },
  { name: '⚡ Mitokondri (Enerji Üretimi)', ans: 'both', why: 'Enerji (ATP) üreten mitokondri hem bitki hem hayvan hücresinde bulunur.' },
  { name: '🔵 Ribozom (Protein Sentezi)', ans: 'both', why: 'Protein üreten en küçük organel olan ribozom tüm canlı hücrelerde ortaktır.' },
  { name: '📦 Golgi Cisimciği & ER', ans: 'both', why: 'Paketleme (Golgi) ve madde iletimi (ER) her iki hücre tipinde de ortaktır.' },
  { name: '📐 Köşeli Hücre Şekli & Büyük Koful', ans: 'plant', why: 'Bitki hücreleri köşelidir ve kofulları büyük ve az sayıdadır.' },
  { name: '⭕ Yuvarlak/Oval Şekil & Küçük-Çok Koful', ans: 'animal', why: 'Hayvan hücreleri yuvarlak/ovaldir ve kofulları küçük ve çok sayıdadır.' }
];

let classifySelections = {};
let classifyChecked = false;

function initClassifyGame() {
  classifySelections = {};
  classifyChecked = false;
  const banner = document.getElementById('classifyScoreText');
  banner.className = 'exam-result-banner';
  banner.textContent = '';
  const box = document.getElementById('classifyList');
  box.innerHTML = '';

  CLASSIFY_ITEMS.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'classify-row';
    card.id = 'crow-' + idx;
    card.innerHTML = `
      <div class="classify-top">
        <div style="font-weight:700; font-size:0.94rem; color:#0f172a;">${idx + 1}. ${item.name}</div>
        <div class="classify-opts" id="cgrp-${idx}">
          <button class="classify-pill" data-val="plant" onclick="selectClassifyChoice(${idx}, 'plant', this)">🌿 Yalnız Bitki</button>
          <button class="classify-pill" data-val="animal" onclick="selectClassifyChoice(${idx}, 'animal', this)">🦁 Yalnız Hayvan</button>
          <button class="classify-pill" data-val="both" onclick="selectClassifyChoice(${idx}, 'both', this)">🤝 İkisinde Ortak</button>
        </div>
      </div>
      <div id="cfb-${idx}" style="font-size:0.83rem; font-weight:600;"></div>
    `;
    box.appendChild(card);
  });
}

function selectClassifyChoice(idx, choice, btnEl) {
  if (classifyChecked) return;
  classifySelections[idx] = choice;
  const grp = document.getElementById('cgrp-' + idx);
  grp.querySelectorAll('.classify-pill').forEach(b => b.classList.remove('selected'));
  btnEl.classList.add('selected');
  playTone(580, 0.06, 'sine', 0.06);
}

function checkClassifyAnswers() {
  let correctCount = 0;
  const labels = { plant: '🌿 Yalnız Bitki', animal: '🦁 Yalnız Hayvan', both: '🤝 İkisinde Ortak' };
  CLASSIFY_ITEMS.forEach((item, idx) => {
    const row = document.getElementById('crow-' + idx);
    const grp = document.getElementById('cgrp-' + idx);
    const fb = document.getElementById('cfb-' + idx);
    const chosen = classifySelections[idx];
    row.classList.remove('checked-ok', 'checked-err');

    grp.querySelectorAll('.classify-pill').forEach(b => {
      b.classList.remove('selected', 'opt-ok', 'opt-err');
      if (b.dataset.val === item.ans) b.classList.add('opt-ok');
      else if (b.dataset.val === chosen) b.classList.add('opt-err');
    });

    if (chosen === item.ans) {
      row.classList.add('checked-ok');
      fb.innerHTML = `<span class="feedback-tag ok">✅ Doğru!</span> <span style="color:#166534;">${item.why}</span>`;
      correctCount++;
    } else {
      row.classList.add('checked-err');
      fb.innerHTML = `<span class="feedback-tag err">❌ Yanlış · Doğrusu: ${labels[item.ans]}</span> <span style="color:#991b1b;">${item.why}</span>`;
    }
  });
  if (!classifyChecked && correctCount > 0) {
    addScore(correctCount * 10);
    classifyChecked = true;
  }
  if (correctCount === CLASSIFY_ITEMS.length) playSuccessSound();
  else playTone(480, 0.12, 'triangle', 0.08);

  const banner = document.getElementById('classifyScoreText');
  banner.className = 'exam-result-banner show ' + (correctCount >= 8 ? 'good' : 'mid');
  banner.innerHTML = `📊 <strong>Sınıflandırma Sonucu:</strong> ${CLASSIFY_ITEMS.length} yapıdan <strong>${correctCount}</strong> doğru, <strong>${CLASSIFY_ITEMS.length - correctCount}</strong> yanlış!`;
}

function resetClassifyGame() { initClassifyGame(); }

/* --- 4. DOĞRU / YANLIŞ ETKİNLİĞİ (12 İFADE) --- */
const TF_DATA = [
  { s: 'Hücreyi dış ortamdan ayıran hücre zarı canlı, esnek ve seçici geçirgen bir yapıya sahiptir.', ans: 'D', exp: 'Doğru! Hücre zarı canlıdır, esnektir ve hücreye girecek-çıkacak maddeleri seçerek geçirir.' },
  { s: 'Bitki hücrelerinde hücre zarının dışında yer alan hücre duvarı (çeperi) canlı ve esnektir.', ans: 'Y', exp: 'Yanlış! Hücre duvarı cansız, sert ve tam geçirgendir.' },
  { s: 'Hücredeki en küçük organel olan ribozom hem bitki hem de hayvan hücrelerinde protein sentezler.', ans: 'D', exp: 'Doğru! Ribozom zarsız ve en küçük organeldir; tüm canlı hücrelerde ortak olarak bulunur.' },
  { s: 'Kloroplast organeli hem bitki hem de hayvan hücrelerinde enerji (ATP) üretmek için bulunur.', ans: 'Y', exp: 'Yanlış! Kloroplast yalnızca bitki hücrelerinin yeşil kısımlarında fotosentez yapar; enerji (ATP) üreten ortak organel mitokondridir.' },
  { s: 'Koful organeli bitki hücrelerinde büyük ve az sayıda, hayvan hücrelerinde ise küçük ve çok sayıdadır.', ans: 'D', exp: 'Doğru! Bitki hücrelerinde yaşlandıkça büyüyen az sayıda koful, hayvan hücrelerinde küçük ve çok sayıda koful vardır.' },
  { s: 'Hücre içinde ter, süt, gözyaşı ve tükürük gibi salgı maddelerini üreten ve paketleyen organel golgi cisimciğidir.', ans: 'D', exp: 'Doğru! Golgi cisimciği salgı üretimi ve paketleme merkezidir.' },
  { s: 'Sentrozom organeli bitki hücrelerinde hücre bölünmesi sırasında iğ ipliklerini oluşturur.', ans: 'Y', exp: 'Yanlış! Sentrozom gelişmiş bitki hücrelerinde bulunmaz; hayvan hücrelerine özgüdür.' },
  { s: 'Işık mikroskobuyla preparat incelenirken netleştirme için önce mikro (ince) vida, sonra makro (kaba) vida çevrilir.', ans: 'Y', exp: 'Yanlış! Önce makro (kaba) ayar vidasıyla görüntü bulunur, ardından mikro (ince) ayar vidasıyla tam netlik sağlanır.' },
  { s: 'Çekirdek, hücrenin yönetim ve kalıtım merkezidir ve içerisinde kalıtsal bilgileri taşıyan DNA bulunur.', ans: 'D', exp: 'Doğru! Çekirdek hücrenin tüm yaşamsal faaliyetlerini yönetir.' },
  { s: 'Robert Hooke 1665 yılında şişe mantarı kesitini inceleyerek gördüğü boş odacıklara "hücre (cellula)" adını vermiştir.', ans: 'D', exp: 'Doğru! Hücre kavramını bilim dünyasına kazandıran ilk bilim insanı Robert Hooke\'dur.' },
  { s: 'Çok hücreli canlılarda yapı birimleri basitten karmaşığa doğru "Hücre → Organ → Doku → Sistem → Organizma" şeklinde sıralanır.', ans: 'Y', exp: 'Yanlış! Doğru sıralama: Hücre → Doku → Organ → Sistem → Organizma şeklindedir.' },
  { s: 'Bir bitkinin toprak altındaki kök hücrelerinde güneş ışığı görmediği için kloroplast bulunması beklenmez.', ans: 'D', exp: 'Doğru! Kloroplast yalnızca bitkinin ışık alan yeşil kısımlarında (yaprak, genç gövde) bulunur.' }
];

let tfSelections = {};
let tfChecked = false;

function initTFGame() {
  tfSelections = {};
  tfChecked = false;
  const banner = document.getElementById('tfResultBanner');
  if (banner) { banner.className = 'exam-result-banner'; banner.textContent = ''; }
  const list = document.getElementById('tfList');
  if (!list) return;
  list.innerHTML = '';

  TF_DATA.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'tf-row';
    row.id = 'tfrow-' + idx;
    row.innerHTML = `
      <div class="tf-top">
        <div style="font-weight:700; font-size:0.94rem; color:#0f172a; flex:1; min-width:240px;">
          <span style="color:#2563eb;">${idx + 1}.</span> ${item.s}
        </div>
        <div class="tf-opts" id="tfgrp-${idx}">
          <button class="tf-btn" data-val="D" onclick="selectTFChoice(${idx}, 'D', this)">✔ Doğru (D)</button>
          <button class="tf-btn" data-val="Y" onclick="selectTFChoice(${idx}, 'Y', this)">✖ Yanlış (Y)</button>
        </div>
      </div>
      <div id="tffb-${idx}" style="font-size:0.83rem; font-weight:600;"></div>
    `;
    list.appendChild(row);
  });
}

function selectTFChoice(idx, val, btnEl) {
  if (tfChecked) return;
  tfSelections[idx] = val;
  const grp = document.getElementById('tfgrp-' + idx);
  grp.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('selected'));
  btnEl.classList.add('selected');
  playTone(580, 0.06, 'sine', 0.06);
}

function checkTFGame() {
  let correctCount = 0;
  TF_DATA.forEach((item, idx) => {
    const row = document.getElementById('tfrow-' + idx);
    const grp = document.getElementById('tfgrp-' + idx);
    const fb = document.getElementById('tffb-' + idx);
    const chosen = tfSelections[idx];
    row.classList.remove('checked-ok', 'checked-err');

    grp.querySelectorAll('.tf-btn').forEach(b => {
      b.classList.remove('selected', 'opt-ok', 'opt-err');
      if (b.dataset.val === item.ans) b.classList.add('opt-ok');
      else if (b.dataset.val === chosen) b.classList.add('opt-err');
    });

    if (chosen === item.ans) {
      row.classList.add('checked-ok');
      fb.innerHTML = `<span class="feedback-tag ok">✅ Doğru!</span> <span style="color:#166534;">${item.exp}</span>`;
      correctCount++;
    } else {
      row.classList.add('checked-err');
      fb.innerHTML = `<span class="feedback-tag err">❌ Yanlış · Cevap: ${item.ans === 'D' ? 'Doğru' : 'Yanlış'}</span> <span style="color:#991b1b;">${item.exp}</span>`;
    }
  });

  if (!tfChecked && correctCount > 0) {
    addScore(correctCount * 10);
    tfChecked = true;
  }
  if (correctCount >= 10) playSuccessSound();
  else playTone(480, 0.12, 'triangle', 0.08);

  const banner = document.getElementById('tfResultBanner');
  banner.className = 'exam-result-banner show ' + (correctCount >= 9 ? 'good' : 'mid');
  banner.innerHTML = `📊 <strong>Doğru / Yanlış Sonucu:</strong> ${TF_DATA.length} ifadeden <strong>${correctCount}</strong> doğru, <strong>${TF_DATA.length - correctCount}</strong> yanlış!`;
}

function resetTFGame() { initTFGame(); }

/* --- 5. ONLİNE DENEME SINAV SİSTEMİ (5 DENEME × 10 SORU, KOLAYDAN ZORA) --- */
const UNIT_EXAMS = [
  {
    id: 1,
    title: 'Deneme 1: Temel Kavramlar & Mikroskop',
    level: 'Kolay (Başlangıç)',
    badgeColor: '#16a34a',
    desc: 'Mikroskobun bölümleri, lam-lamel hazırlama, Robert Hooke ve hücrenin 3 temel kısmı üzerine temel sorular.',
    questions: [
      {
        topic: 'Mikroskop Tarihi',
        q: '1665 yılında kendi yaptığı basit mikroskopla şişe mantarını inceleyerek gördüğü boş odacıklara "hücre (cellula)" adını veren bilim insanı kimdir?',
        opts: ['A) Isaac Newton', 'B) Robert Hooke', 'C) Louis Pasteur', 'D) Gregor Mendel'],
        ans: 1,
        exp: 'Robert Hooke 1665 yılında şişe mantarı kesitinde gördüğü küçük odacıklara "hücre" adını vermiştir.'
      },
      {
        topic: 'Preparat Hazırlama',
        q: 'Soğan zarı örneğini mikroskopta incelemek isteyen bir öğrenci, örneği büyük dikdörtgen camın üzerine koyup hava kabarcığı kalmayacak şekilde üzerine küçük kare bir ince cam kapatıyor. Sırasıyla kullandığı bu iki camın adı nedir?',
        opts: ['A) Lamel – Lam', 'B) Oküler – Objektif', 'C) Lam – Lamel', 'D) Tabla – Kıskaç'],
        ans: 2,
        exp: 'Örneğin konulduğu büyük dikdörtgen cam LAM, üzerine kapatılan ince kare cam ise LAMEL olarak adlandırılır.'
      },
      {
        topic: 'Mikroskop Parçaları',
        q: 'Işık mikroskobunda gözümüzü dayayarak baktığımız ve görüntüyü genellikle 10 kat (10×) büyüten üst mercek kısmı aşağıdakilerden hangisidir?',
        opts: ['A) Oküler', 'B) Revolver', 'C) Tabla', 'D) Makro vida'],
        ans: 0,
        exp: 'Mikroskobun en üstünde gözümüzle baktığımız merceğe OKÜLER (göz merceği) denir.'
      },
      {
        topic: 'Hücrenin Temel Kısımları',
        q: 'Tüm gelişmiş bitki ve hayvan hücrelerinde ortak olarak bulunan 3 temel kısım hangi seçenekte doğru verilmiştir?',
        opts: ['A) Hücre duvarı – Kloroplast – Çekirdek', 'B) Hücre zarı – Sitoplazma – Çekirdek', 'C) Mitokondri – Koful – Sentrozom', 'D) Ribozom – Hücre çeperi – Golgi'],
        ans: 1,
        exp: 'Dıştan içe doğru Hücre Zarı, Sitoplazma ve Çekirdek tüm gelişmiş hücrelerin 3 temel kısmıdır.'
      },
      {
        topic: 'Görselli Organel Tanıma',
        q: 'Yandaki görselde kesiti verilen, hücrenin yönetim ve kalıtım merkezi olan ve içinde DNA bulunduran yapı hangisidir?',
        img: '/assets/fen-laboratuvari/gorseller/cekirdek.jpeg',
        opts: ['A) Mitokondri', 'B) Çekirdek', 'C) Lizozom', 'D) Koful'],
        ans: 1,
        exp: 'Görselde nükleer porlu zarı ve içindeki DNA sarmalıyla verilen yapı ÇEKİRDEK\'tir.'
      },
      {
        topic: 'Hücre Zarı',
        q: 'Hücreyi dış ortamdan ayıran, ona şekil veren ve madde giriş-çıkışını kontrol eden yapı hakkında aşağıdakilerden hangisi doğrudur?',
        opts: ['A) Cansız ve tam geçirgendir.', 'B) Sadece bitki hücrelerinde bulunur.', 'C) Canlı, esnek ve seçici geçirgendir.', 'D) Enerji (ATP) üreten organeldir.'],
        ans: 2,
        exp: 'Hücre zarı canlı, esnek ve seçici geçirgendir; her iki hücre tipinde de bulunur.'
      },
      {
        topic: 'Görselli Organel Tanıma',
        q: 'Görselde iç kıvrımları görülen ve hücre için gerekli enerjiyi (ATP) üreten "enerji santrali" organeli hangisidir?',
        img: '/assets/fen-laboratuvari/gorseller/mitokondri.jpeg',
        opts: ['A) Kloroplast', 'B) Golgi cisimciği', 'C) Mitokondri', 'D) Ribozom'],
        ans: 2,
        exp: 'Görseldeki organel besinleri oksijenle parçalayarak enerji üreten MİTOKONDRİ\'dir.'
      },
      {
        topic: 'Sitoplazma',
        q: 'Hücre zarı ile çekirdek arasını dolduran, yumurta akı kıvamında yarı akışkan sıvıya ne ad verilir?',
        opts: ['A) Sitoplazma', 'B) Koful özsuyu', 'C) Hücre çeperi', 'D) Endoplazmik retikulum'],
        ans: 0,
        exp: 'Organellerin içinde yüzdüğü yarı akışkan sıvıya SİTOPLAZMA denir.'
      },
      {
        topic: 'Mikroskop Kullanımı',
        q: 'Mikroskopla görüntü elde ederken önce büyük (kaba) ayar vidasıyla görüntüyü bulup, ardından küçük (ince) ayar vidasıyla netleştiririz. Bu iki vidanın adı sırasıyla nedir?',
        opts: ['A) Mikro vida – Makro vida', 'B) Makro vida – Mikro vida', 'C) Revolver – Diyafram', 'D) Oküler – Objektif'],
        ans: 1,
        exp: 'Önce Makro (kaba) vida ile görüntü bulunur, sonra Mikro (ince) vida ile netleştirilir.'
      },
      {
        topic: 'Temel Organeller',
        q: 'Hücredeki en küçük ve zarsız organel olup büyüme ve onarım için PROTEIN sentezleyen yapı aşağıdakilerden hangisidir?',
        opts: ['A) Ribozom', 'B) Lizozom', 'C) Koful', 'D) Sentrozom'],
        ans: 0,
        exp: 'Ribozom hücredeki en küçük organeldir ve protein sentezinden sorumludur.'
      }
    ]
  },
  {
    id: 2,
    title: 'Deneme 2: Organellerin Görevleri',
    level: 'Orta Düzey',
    badgeColor: '#0284c7',
    desc: 'Organel görevleri, görsel tanıma, günlük hayat benzetmeleri ve bitki-hayvan hücresi temel farkları.',
    questions: [
      {
        topic: 'Görselli Organel Görevi',
        q: 'Yandaki görselde üst üste dizilmiş kesecikler halinde verilen organelin temel görevi aşağıdakilerden hangisidir?',
        img: '/assets/fen-laboratuvari/gorseller/golgi.jpeg',
        opts: ['A) Hücre içi sindirim yapmak', 'B) Ter, süt, gözyaşı gibi salgı maddelerini üretip paketlemek', 'C) Güneş ışığı ile besin üretmek', 'D) Hücre bölünmesini başlatmak'],
        ans: 1,
        exp: 'Görseldeki organel GOLGİ CİSİMCİĞİ\'dir; salgı maddelerini üretir ve paketler.'
      },
      {
        topic: 'Günlük Hayat Benzetmesi',
        q: 'Bir şehrin ulaşım yollarına ve kargo taşıma tünellerine benzetilen, çekirdek ile hücre zarı arasında madde iletimini sağlayan organel hangisidir?',
        img: '/assets/fen-laboratuvari/gorseller/endoplazmik_retikulum.jpeg',
        opts: ['A) Endoplazmik retikulum', 'B) Mitokondri', 'C) Ribozom', 'D) Lizozom'],
        ans: 0,
        exp: 'Endoplazmik retikulum kıvrımlı kanalcıklarıyla hücre içi madde iletimini sağlar.'
      },
      {
        topic: 'Görselli Organel Tanıma',
        q: 'Yalnızca bitki hücrelerinin yeşil kısımlarında bulunan ve görselde bozuk para yığınlarına benzer yapılar içeren organel hangisidir?',
        img: '/assets/fen-laboratuvari/gorseller/kloroplast.jpeg',
        opts: ['A) Mitokondri', 'B) Koful', 'C) Kloroplast', 'D) Sentrozom'],
        ans: 2,
        exp: 'Görseldeki yeşil organel fotosentez yapan KLOROPLAST\'tır.'
      },
      {
        topic: 'Enerji İhtiyacı',
        q: 'İnsan vücudunda sürekli çalışan kalp kası ve bacak kası hücrelerinde enerji ihtiyacı çok yüksektir. Bu hücrelerde aşağıdaki organellerden hangisinin sayıca diğerlerinden daha fazla olması beklenir?',
        opts: ['A) Koful', 'B) Mitokondri', 'C) Sentrozom', 'D) Lizozom'],
        ans: 1,
        exp: 'Enerji (ATP) üreten organel mitokondri olduğu için kas hücrelerinde sayıca çoktur.'
      },
      {
        topic: 'Koful Karşılaştırması',
        q: 'Bitki ve hayvan hücrelerindeki koful organeli için aşağıdakilerden hangisi doğrudur?',
        opts: ['A) Bitkide küçük ve çok, hayvanda büyük ve azdır.', 'B) Bitkide büyük ve az, hayvanda küçük ve çoktur.', 'C) Sadece hayvan hücrelerinde bulunur.', 'D) Protein sentezi yapar.'],
        ans: 1,
        exp: 'Koful bitki hücresinde büyük ve az sayıda, hayvan hücresinde küçük ve çok sayıdadır.'
      },
      {
        topic: 'Hücre Duvarı',
        q: 'Bitki hücresine dayanıklılık ve köşeli şekil kazandıran, cansız ve tam geçirgen dış katman aşağıdakilerden hangisidir?',
        opts: ['A) Hücre zarı', 'B) Hücre duvarı (çeperi)', 'C) Sitoplazma', 'D) Golgi cisimciği'],
        ans: 1,
        exp: 'Hücre duvarı yalnızca bitki hücresinde bulunan sert, cansız ve tam geçirgen dış katmandır.'
      },
      {
        topic: 'Organel Eşleştirme',
        q: 'Aşağıdaki organel – görev eşleştirmelerinden hangisi YANLIŞTIR?',
        opts: ['A) Ribozom → Protein sentezi', 'B) Lizozom → Hücre içi sindirim', 'C) Koful → Salgı paketleme', 'D) Çekirdek → Yönetim ve kalıtım'],
        ans: 2,
        exp: 'Salgı paketleme Golgi cisimciğinin görevidir; koful ise su, besin ve atık depolar.'
      },
      {
        topic: 'Mikroskop Gözlemi',
        q: 'Mikroskopta incelediği hücrenin köşeli bir şekle sahip olduğunu ve içinde yeşil renkli organeller bulunduğunu gören Asya, hangi hücreyi inceliyor olabilir?',
        opts: ['A) Ağız içi epitel hücresi', 'B) Kan hücresi', 'C) Elodea (su bitkisi) yaprak hücresi', 'D) Sinir hücresi'],
        ans: 2,
        exp: 'Köşeli şekil ve yeşil kloroplastlar bitki hücresinin ayırt edici özellikleridir.'
      },
      {
        topic: 'Salgı Hücreleri',
        q: 'Tükürük bezi, ter bezi ve süt bezi hücrelerinde salgı üretimi çok yoğun olduğu için hangi organelin daha fazla bulunması beklenir?',
        opts: ['A) Golgi cisimciği', 'B) Sentrozom', 'C) Kloroplast', 'D) Hücre duvarı'],
        ans: 0,
        exp: 'Golgi cisimciği ter, süt, tükürük ve gözyaşı gibi salgıların üretimini ve paketlenmesini yapar.'
      },
      {
        topic: 'Büyütme Hesabı',
        q: 'Oküleri 10× olan bir ışık mikroskobunda 40× objektif kullanıldığında incelenen hücre görüntüsü toplam kaç kat büyütülmüş olur?',
        opts: ['A) 50×', 'B) 400×', 'C) 100×', 'D) 40×'],
        ans: 1,
        exp: 'Toplam büyütme = Oküler büyütmesi × Objektif büyütmesi = 10 × 40 = 400×.'
      }
    ]
  },
  {
    id: 3,
    title: 'Deneme 3: Bitki & Hayvan Karşılaştırma',
    level: 'Orta – İleri Düzey',
    badgeColor: '#7c3aed',
    desc: 'Venn şeması, +/- karşılaştırma tabloları, sentrozom, lizozom ve zar-duvar farkları.',
    questions: [
      {
        topic: 'Tablo Yorumlama (PDF Tipi)',
        q: 'Aşağıdaki tabloda X ve Y hücrelerine ait bazı yapıların bulunma (+: Var, −: Yok) durumları verilmiştir. Buna göre X ve Y hücreleri hangileridir?',
        svg: '<svg viewBox="0 0 420 120" width="380" style="background:#fff;border-radius:10px;border:1px solid #cbd5e1;"><rect x="0" y="0" width="420" height="30" fill="#e0e7ff"/><text x="70" y="20" font-size="12" font-weight="700" fill="#1e293b" text-anchor="middle">Yapı</text><text x="210" y="20" font-size="12" font-weight="700" fill="#1e293b" text-anchor="middle">X Hücresi</text><text x="340" y="20" font-size="12" font-weight="700" fill="#1e293b" text-anchor="middle">Y Hücresi</text><text x="70" y="52" font-size="12" fill="#334155" text-anchor="middle">Hücre Duvarı</text><text x="210" y="52" font-size="14" font-weight="800" fill="#dc2626" text-anchor="middle">−</text><text x="340" y="52" font-size="14" font-weight="800" fill="#16a34a" text-anchor="middle">+</text><line x1="0" y1="62" x2="420" y2="62" stroke="#e2e8f0"/><text x="70" y="82" font-size="12" fill="#334155" text-anchor="middle">Sentrozom</text><text x="210" y="82" font-size="14" font-weight="800" fill="#16a34a" text-anchor="middle">+</text><text x="340" y="82" font-size="14" font-weight="800" fill="#dc2626" text-anchor="middle">−</text><line x1="0" y1="92" x2="420" y2="92" stroke="#e2e8f0"/><text x="70" y="112" font-size="12" fill="#334155" text-anchor="middle">Mitokondri</text><text x="210" y="112" font-size="14" font-weight="800" fill="#16a34a" text-anchor="middle">+</text><text x="340" y="112" font-size="14" font-weight="800" fill="#16a34a" text-anchor="middle">+</text></svg>',
        opts: ['A) X: Bitki — Y: Hayvan', 'B) X: Hayvan — Y: Bitki', 'C) Her ikisi de Bitki', 'D) Her ikisi de Hayvan'],
        ans: 1,
        exp: 'X hücresinde hücre duvarı yok, sentrozom var (Hayvan). Y hücresinde hücre duvarı var, sentrozom yok (Bitki).'
      },
      {
        topic: 'Görselli Organel Tanıma',
        q: 'Yandaki görselde birbirine dik iki silindirik yapıdan oluşan ve hayvan hücresi bölünürken iğ ipliklerini oluşturan organel hangisidir?',
        img: '/assets/fen-laboratuvari/gorseller/sentrozom.jpeg',
        opts: ['A) Ribozom', 'B) Sentrozom', 'C) Golgi cisimciği', 'D) Lizozom'],
        ans: 1,
        exp: 'Görseldeki yapı çiftler halinde bulunan ve hayvan hücresinde bölünmede görev alan SENTROZOM\'dur.'
      },
      {
        topic: 'Görselli Organel Görevi',
        q: 'Görselde içinde sindirim enzimleri bulunan organel, yaşlı organelleri ve hücreye giren mikropları parçalar. Bu organel hangisidir?',
        img: '/assets/fen-laboratuvari/gorseller/lizozom.jpeg',
        opts: ['A) Lizozom', 'B) Koful', 'C) Kloroplast', 'D) Çekirdek'],
        ans: 0,
        exp: 'Hücre içi sindirim yapan ve savunmada görev alan bu organel LİZOZOM\'dur.'
      },
      {
        topic: 'Venn Şeması (PDF Tipi)',
        q: 'Bitki ve hayvan hücrelerini gösteren Venn şemasında taralı "K" (ortak) bölgeye aşağıdakilerden hangisi YAZILAMAZ?',
        svg: '<svg viewBox="0 0 320 130" width="300" style="background:#fff;border-radius:10px;border:1px solid #cbd5e1;"><circle cx="110" cy="68" r="50" fill="rgba(34,197,94,0.2)" stroke="#16a34a" stroke-width="2.5"/><circle cx="210" cy="68" r="50" fill="rgba(244,63,94,0.2)" stroke="#e11d48" stroke-width="2.5"/><text x="72" y="25" font-size="11" font-weight="700" fill="#15803d">Bitki</text><text x="225" y="25" font-size="11" font-weight="700" fill="#be123c">Hayvan</text><text x="160" y="74" font-size="16" font-weight="800" fill="#1e293b" text-anchor="middle">K</text></svg>',
        opts: ['A) Mitokondri', 'B) Ribozom', 'C) Sentrozom', 'D) Golgi cisimciği'],
        ans: 2,
        exp: 'Mitokondri, ribozom ve golgi ortaktır; ancak sentrozom gelişmiş bitki hücresinde bulunmadığı için K bölgesine yazılamaz.'
      },
      {
        topic: 'Hücre Zarı Kesiti',
        q: 'Görselde çift katlı yapısı ve madde geçiş kanalı gösterilen hücre zarı için hangi ifade YANLIŞTIR?',
        img: '/assets/fen-laboratuvari/gorseller/hucre_zari.jpeg',
        opts: ['A) Seçici geçirgendir.', 'B) Canlı ve esnek bir yapıdır.', 'C) Sadece hayvan hücrelerinde bulunur.', 'D) Hücreye dış ortamdan koruma sağlar.'],
        ans: 2,
        exp: 'Hücre zarı hem bitki hem de hayvan hücrelerinde ortak olarak bulunur.'
      },
      {
        topic: 'Bitki Kök Hücresi',
        q: 'Bir fasulye bitkisinin toprak altındaki kök hücresinde aşağıdaki yapılardan hangisi KESİNLİKLE bulunmaz?',
        opts: ['A) Çekirdek', 'B) Kloroplast', 'C) Hücre duvarı', 'D) Mitokondri'],
        ans: 1,
        exp: 'Kloroplast fotosentez yaptığı için yalnızca güneş ışığı alan yeşil kısımlarda bulunur; kök hücresinde yoktur.'
      },
      {
        topic: 'Organel İlişkisi',
        q: 'Bir hücrede protein üretilip dışarıya salgı olarak gönderilene kadar sırasıyla hangi organeller birlikte çalışır?',
        opts: ['A) Ribozom → Endoplazmik Retikulum → Golgi Cisimciği', 'B) Lizozom → Koful → Sentrozom', 'C) Kloroplast → Hücre Duvarı → Çekirdek', 'D) Mitokondri → Sentrozom → Ribozom'],
        ans: 0,
        exp: 'Ribozom proteini üretir, Endoplazmik Retikulum taşır, Golgi Cisimciği paketleyip salgılar.'
      },
      {
        topic: 'Çekirdeksiz Hücreler',
        q: 'İnsan vücudundaki olgun alyuvar hücreleri çekirdeğini kaybetmiştir. Ancak bakteriler gibi ilkel canlılarda da belirgin bir çekirdek zarı yoktur. Buna göre bakterilerde kalıtım maddesi (DNA) nerede bulunur?',
        opts: ['A) Hücre duvarının dışında', 'B) Sitoplazma içinde dağınık halde', 'C) Kloroplast içinde', 'D) Sentrozom içinde'],
        ans: 1,
        exp: 'Çekirdeği bulunmayan bakteri gibi basit yapılı canlılarda DNA sitoplazma içinde dağınık halde bulunur.'
      },
      {
        topic: 'Koful Büyüklüğü',
        q: 'Genç bir bitki hücresi yaşlandıkça kofulları birleşerek büyür. Bu durum bitki hücresi için aşağıdakilerden hangisinin göstergesidir?',
        opts: ['A) Hücrenin hayvan hücresine dönüştüğünün', 'B) Hücrenin yaşlandığının', 'C) Kloroplast sayısının sıfırlandığının', 'D) Hücre duvarının eridiğinin'],
        ans: 1,
        exp: 'Bitki hücrelerinde yaşlandıkça küçük kofullar birleşerek tek ve çok büyük bir merkezi koful oluşturur.'
      },
      {
        topic: 'Hücre Şekli',
        q: 'Bitki hücrelerinin köşeli, hayvan hücrelerinin ise yuvarlak/oval şekle sahip olmasının temel nedeni aşağıdakilerden hangisidir?',
        opts: ['A) Bitki hücresinde sert ve cansız hücre duvarının bulunması', 'B) Hayvan hücresinde çekirdeğin bulunması', 'C) Bitki hücresinde mitokondrinin olmaması', 'D) Hayvan hücresinin çok büyük kofula sahip olması'],
        ans: 0,
        exp: 'Bitki hücrelerindeki sert selüloz hücre duvarı hücreye köşeli ve sabit bir şekil kazandırır.'
      }
    ]
  },
  {
    id: 4,
    title: 'Deneme 4: Hücreden Organizmaya & Analiz',
    level: 'İleri Düzey',
    badgeColor: '#d97706',
    desc: 'Hücre → Doku → Organ → Sistem → Organizma hiyerarşisi, dallanmış ağaç ve 2B kesit analizi.',
    questions: [
      {
        topic: 'Tanısal Dallanmış Ağaç (PDF Tipi)',
        q: 'Aşağıdaki doğru-yanlış dallanmış ağaç etkinliğinde her ifadeyi doğru takip eden bir öğrenci hangi çıkışa ulaşır?',
        svg: '<svg viewBox="0 0 420 155" width="380" style="background:#fff;border-radius:10px;border:1px solid #cbd5e1;"><rect x="95" y="6" width="230" height="30" rx="6" fill="#eff6ff" stroke="#3b82f6"/><text x="210" y="25" font-size="11" font-weight="700" fill="#1e3a8a" text-anchor="middle">1. Kloroplast yalnız bitkide bulunur.</text><line x1="150" y1="36" x2="105" y2="62" stroke="#16a34a" stroke-width="2"/><text x="115" y="52" font-size="10" font-weight="800" fill="#16a34a">D</text><line x1="270" y1="36" x2="315" y2="62" stroke="#dc2626" stroke-width="2"/><text x="300" y="52" font-size="10" font-weight="800" fill="#dc2626">Y</text><rect x="20" y="62" width="170" height="32" rx="6" fill="#f0fdf4" stroke="#22c55e"/><text x="105" y="82" font-size="10" font-weight="700" fill="#14532d" text-anchor="middle">2. Hücre duvarı seçici geçirgendir.</text><rect x="230" y="62" width="170" height="32" rx="6" fill="#fef2f2" stroke="#ef4444"/><text x="315" y="82" font-size="10" font-weight="700" fill="#7f1d1d" text-anchor="middle">3. Mitokondri enerji üretir.</text><text x="55" y="138" font-size="12" font-weight="800" fill="#1e293b" text-anchor="middle">1. Çıkış (D)</text><text x="155" y="138" font-size="12" font-weight="800" fill="#1e293b" text-anchor="middle">2. Çıkış (Y)</text><text x="275" y="138" font-size="12" font-weight="800" fill="#1e293b" text-anchor="middle">3. Çıkış (D)</text><text x="365" y="138" font-size="12" font-weight="800" fill="#1e293b" text-anchor="middle">4. Çıkış (Y)</text><line x1="80" y1="94" x2="55" y2="122" stroke="#64748b"/><line x1="130" y1="94" x2="155" y2="122" stroke="#64748b"/><line x1="295" y1="94" x2="275" y2="122" stroke="#64748b"/><line x1="335" y1="94" x2="365" y2="122" stroke="#64748b"/></svg>',
        opts: ['A) 1. Çıkış', 'B) 2. Çıkış', 'C) 3. Çıkış', 'D) 4. Çıkış'],
        ans: 1,
        exp: '1. ifade Doğru (sol kol). 2. ifade "Hücre duvarı seçici geçirgendir" YANLIŞTIR (hücre duvarı tam geçirgendir) → 2. Çıkış!'
      },
      {
        topic: 'Hiyerarşi Basamağı',
        q: 'Görselde verilen KALP yapısı, canlıların organizasyon basamaklarından hangisine örnektir?',
        img: '/assets/fen-laboratuvari/gorseller/asama3_organ.jpeg',
        opts: ['A) Hücre', 'B) Doku', 'C) Organ', 'D) Sistem'],
        ans: 2,
        exp: 'Kas dokusu, kan dokusu ve epitel dokunun birleşmesiyle oluşan Kalp bir ORGAN\'dır.'
      },
      {
        topic: 'Bitkilerde Organizasyon',
        q: 'Görselde hücrelerin yan yana dizilerek oluşturduğu bitki yaprak katmanı hangi organizasyon basamağını temsil etmektedir?',
        img: '/assets/fen-laboratuvari/gorseller/bitki_asama2_doku.jpeg',
        opts: ['A) Doku', 'B) Organ', 'C) Sistem', 'D) Organizma'],
        ans: 0,
        exp: 'Aynı görevi yapmak üzere bir araya gelen bitki hücreleri topluluğuna DOKU denir.'
      },
      {
        topic: 'Günlük Yaşam Benzetmesi',
        q: '"Harf → Kelime → Cümle → Paragraf → Kitap" sıralaması canlıların organizasyon basamaklarıyla eşleştirildiğinde, CÜMLE ve PARAGRAF sırasıyla hangilerine karşılık gelir?',
        opts: ['A) Hücre – Doku', 'B) Organ – Sistem', 'C) Doku – Organ', 'D) Sistem – Organizma'],
        ans: 1,
        exp: 'Harf=Hücre, Kelime=Doku, Cümle=Organ, Paragraf=Sistem, Kitap=Organizma.'
      },
      {
        topic: '2B Hücre Kesiti Analizi',
        q: 'Yandaki 2B kesit görseli incelendiğinde bu hücrenin bitki hücresi olduğunu kanıtlayan yapılar hangi seçenekte bir arada verilmiştir?',
        img: '/assets/fen-laboratuvari/gorseller/hucre_2d_bitki.png',
        opts: ['A) Çekirdek – Ribozom', 'B) Hücre duvarı – Kloroplast – Büyük merkezi koful', 'C) Mitokondri – Golgi cisimciği', 'D) Hücre zarı – Sitoplazma'],
        ans: 1,
        exp: 'Hücre duvarı, kloroplastlar ve büyük koful bitki hücresinin kesin kanıtlarıdır.'
      },
      {
        topic: 'Hiyerarşi Karşılaştırma',
        q: 'Aşağıdaki yapılardan hangisi organizasyon düzeyi bakımından diğerlerinden daha KARMAŞIKTIR?',
        opts: ['A) Epitel hücresi', 'B) Kemik dokusu', 'C) Mide (Organ)', 'D) Sindirim Sistemi'],
        ans: 3,
        exp: 'Sıralama Hücre < Doku < Organ < Sistem şeklindedir; dolayısıyla Sindirim Sistemi en karmaşıktır.'
      },
      {
        topic: 'Organ – Sistem Eşleştirme',
        q: 'Aşağıdaki organlardan hangisi insan vücudundaki DOLAŞIM SİSTEMİ\'ne ait değildir?',
        opts: ['A) Kalp', 'B) Atardamarlar', 'C) Mide', 'D) Toplardamarlar'],
        ans: 2,
        exp: 'Mide, dolaşım sistemine değil sindirim sistemine ait bir organdır.'
      },
      {
        topic: 'Bitki Organları',
        q: 'Çiçekli bir bitkide; Kök, Gövde, Yaprak ve Çiçek yapıları organizasyonun hangi basamağında yer alır?',
        opts: ['A) Hücre', 'B) Doku', 'C) Organ', 'D) Organizma'],
        ans: 2,
        exp: 'Kök, gövde, yaprak ve çiçek bitkideki başlıca ORGANLARDIR.'
      },
      {
        topic: 'Mikroskop Büyütme',
        q: 'Bir öğrenci soğan zarı hücresini önce 4× objektifle, ardından 40× objektifle inceliyor. 40× objektife geçtiğinde aşağıdakilerden hangisi gerçekleşir?',
        opts: ['A) Hücreler daha küçük görünür ve görüş alanı genişler.', 'B) Hücreler daha büyük görünür ancak görüş alanındaki hücre sayısı azalır.', 'C) Işık kaynağı tamamen kapanır.', 'D) Hücre duvarı yok olur.'],
        ans: 1,
        exp: 'Büyütme arttıkça tek bir hücre daha büyük ve ayrıntılı görülür, fakat ekrana sığan toplam hücre sayısı azalır.'
      },
      {
        topic: 'Hücre Bölünmesi',
        q: 'Bir amip veya tek hücreli canlı ortadan ikiye bölündüğünde yeni iki canlı oluşur. Çok hücreli bir insanda ise hücrelerin bölünmesi neyi sağlar?',
        opts: ['A) Büyüme, gelişme ve yaraların onarılmasını', 'B) Kloroplast sayısının artmasını', 'C) Hücre duvarının kalınlaşmasını', 'D) Sadece sindirim yapılmasını'],
        ans: 0,
        exp: 'Çok hücreli canlılarda hücre bölünmesi büyüme, gelişme ve yıpranan dokuların onarılmasını sağlar.'
      }
    ]
  },
  {
    id: 5,
    title: 'Deneme 5: Beceri Temelli (Yeni Nesil)',
    level: 'Yeni Nesil (Zor)',
    badgeColor: '#dc2626',
    desc: 'Gerçek olay problemleri, deney düzenekleri, veri/grafik yorumlama ve kazanım odaklı beceri temelli sorular.',
    questions: [
      {
        topic: 'Yeni Nesil · Deney Analizi',
        q: 'Zeynep, aynı bitkinin iki farklı hücresini mikroskopta inceliyor: 1. örnek güneş alan yeşil yapraktan, 2. örnek ise toprak altındaki beyaz kök ucundan alınmıştır. Zeynep\'in bu iki hücrede yaptığı gözlemlerle ilgili aşağıdakilerden hangisi DOĞRUDUR?',
        opts: [
          'A) Her iki hücrede de kloroplast ve hücre duvarı gözlemlenir.',
          'B) 1. örnekte kloroplast ve mitokondri varken, 2. örnekte mitokondri ve hücre duvarı bulunur ama kloroplast bulunmaz.',
          'C) 2. örnekte sentrozom bulunur, 1. örnekte bulunmaz.',
          'D) 1. örnek yuvarlak, 2. örnek köşeli şekildedir.'
        ],
        ans: 1,
        exp: 'Her ikisi de bitki hücresi olduğu için hücre duvarı ve mitokondri ortaktır; ancak kök hücresi ışık almadığı için kloroplast içermez.'
      },
      {
        topic: 'Yeni Nesil · Organel Hasarı Problemi',
        q: 'Bir laboratuvar deneyinde, hayvan hücresindeki bazı organellerin çalışması sırasıyla durduruluyor:\n• 1. Hücrede protein üretimi tamamen duruyor.\n• 2. Hücrede hücre içi sindirim ve yaşlı organel temizliği yapılamıyor.\n• 3. Hücre bölünmek istediğinde iğ iplikleri oluşamıyor.\nBuna göre deneyde sırasıyla hangi organellerin çalışması durdurulmuştur?',
        opts: [
          'A) Ribozom – Lizozom – Sentrozom',
          'B) Mitokondri – Golgi – Koful',
          'C) Çekirdek – Endoplazmik retikulum – Kloroplast',
          'D) Golgi – Ribozom – Lizozom'
        ],
        ans: 0,
        exp: 'Protein üretimi=Ribozom, Hücre içi sindirim=Lizozom, Hayvanda iğ ipliği oluşumu=Sentrozom.'
      },
      {
        topic: 'Yeni Nesil · Hücre Zarının Özelliği',
        q: 'Görselde verilen bitki hücresi çok tuzlu bir suya konulduğunda içindeki su dışarı çıkar ve hücre zarı büzülerek hücre duvarından içeri doğru çekilir; ancak hücre duvarının şekli bozulmaz. Bu olaydan aşağıdaki sonuçlardan hangisine ULAŞILIR?',
        img: '/assets/fen-laboratuvari/gorseller/hucre_duvari.png',
        opts: [
          'A) Hücre duvarı canlı ve esnektir.',
          'B) Hücre zarı esnek yapıda iken hücre duvarı sert ve dayanıklıdır.',
          'C) Hayvan hücrelerinde de hücre duvarı büzülmez.',
          'D) Hücre zarı su moleküllerini hiç geçirmez.'
        ],
        ans: 1,
        exp: 'Hücre zarı su kaybedince büzülür (esnektir), hücre duvarı ise sert ve cansız olduğu için şeklini korur.'
      },
      {
        topic: 'Yeni Nesil · Terleme ve Salgı',
        q: 'Yaz aylarında sıcak havada koşan Kerem\'in ter bezleri yoğun biçimde ter üretip dışarı atmaktadır. Aynı anda kas hücreleri de hızlı koşabilmek için yüksek miktarda enerji tüketmektedir. Buna göre Kerem\'in ter bezi hücrelerinde X, bacak kası hücrelerinde ise Y organelinin sayısının normalden fazla olması beklenir. X ve Y hangileridir?',
        opts: [
          'A) X: Sentrozom — Y: Koful',
          'B) X: Golgi cisimciği — Y: Mitokondri',
          'C) X: Lizozom — Y: Ribozom',
          'D) X: Kloroplast — Y: Endoplazmik retikulum'
        ],
        ans: 1,
        exp: 'Ter üretimi ve paketlenmesi Golgi cisimciğinin, kaslar için enerji üretimi ise Mitokondrinin görevidir.'
      },
      {
        topic: 'Yeni Nesil · Organel Sayısı Grafiği',
        q: 'Aşağıdaki grafikte aydınlık bir ortamda yaşayan bir bitki yaprağı hücresinde fotosentez hızının artmasına bağlı olarak bazı maddelerin değişimi verilmiştir. Bu olayın gerçekleştiği organel ve ürettiği iki temel madde hangisidir?',
        svg: '<svg viewBox="0 0 360 120" width="340" style="background:#fff;border-radius:10px;border:1px solid #cbd5e1;"><rect x="15" y="18" width="95" height="84" rx="10" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/><text x="62" y="55" font-size="11" font-weight="800" fill="#166534" text-anchor="middle">Su + CO₂</text><text x="62" y="74" font-size="10" fill="#15803d" text-anchor="middle">+ Güneş Işığı</text><line x1="115" y1="60" x2="155" y2="60" stroke="#0284c7" stroke-width="3"/><polygon points="155,54 167,60 155,66" fill="#0284c7"/><rect x="172" y="34" width="60" height="52" rx="10" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/><text x="202" y="64" font-size="13" font-weight="800" fill="#92400e" text-anchor="middle">?</text><line x1="236" y1="60" x2="265" y2="60" stroke="#16a34a" stroke-width="3"/><polygon points="265,54 277,60 265,66" fill="#16a34a"/><rect x="280" y="22" width="66" height="76" rx="10" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/><text x="313" y="55" font-size="11" font-weight="800" fill="#1e40af" text-anchor="middle">Besin</text><text x="313" y="75" font-size="11" font-weight="800" fill="#1e40af" text-anchor="middle">+ O₂</text></svg>',
        opts: [
          'A) Mitokondri → Karbondioksit + Su',
          'B) Kloroplast → Besin + Oksijen',
          'C) Golgi → Protein + Enerji',
          'D) Ribozom → Su + Mineral'
        ],
        ans: 1,
        exp: 'Kloroplast güneş ışığı yardımıyla su ve karbondioksiti birleştirerek BESİN ve OKSİJEN üretir.'
      },
      {
        topic: 'Yeni Nesil · Kaktüs ve Su Depolama',
        q: 'Çölde yaşayan bir kaktüs bitkisinin gövde hücreleri incelendiğinde, görselde verilen su ve besin depolayan organelin hücrenin neredeyse %80\'ini kaplayacak kadar devasa boyutta olduğu görülüyor. Bu organelin adı ve kaktüse sağladığı avantaj nedir?',
        img: '/assets/fen-laboratuvari/gorseller/koful.jpeg',
        opts: [
          'A) Koful — Kurak ortamda bol miktarda su depolamasını sağlar.',
          'B) Sentrozom — Çok hızlı bölünmesini sağlar.',
          'C) Lizozom — Düşmanları sindirmesini sağlar.',
          'D) Ribozom — Kalın dikenler üretmesini sağlar.'
        ],
        ans: 0,
        exp: 'Kaktüs gibi kurak bölge bitkilerinde KOFUL çok büyük olup uzun süreli su depolama avantajı sağlar.'
      },
      {
        topic: 'Yeni Nesil · Çekirdek Nakli Deneyi',
        q: 'Bilim insanları, tek hücreli bir canlı olan A türü amibin çekirdeğini çıkarıp B türü amibin çekirdeğini yerleştiriyor. Bir süre sonra yeni oluşan hücrenin tamamen B türüne ait özellikler gösterdiği gözlemleniyor. Bu deney aşağıdakilerden hangisini kanıtlar?',
        opts: [
          'A) Hücrenin şeklini sitoplazma belirler.',
          'B) Kalıtsal özelliklerin çekirdekteki DNA tarafından taşındığını ve yönetildiğini',
          'C) Enerjiyi çekirdeğin ürettiğini',
          'D) Amibin bitki hücresi olduğunu'
        ],
        ans: 1,
        exp: 'Çekirdek kalıtsal bilgileri (DNA) taşıyan yönetim merkezidir; yeni hücre B\'nin özelliklerini taşır.'
      },
      {
        topic: 'Yeni Nesil · Mikroskop Sorunu Çözme',
        q: 'Laboratuvarda mikroskobun okülerinden bakan Ahmet, her şeyi kapkaranlık görmektedir. Işık kaynağının fişe takılı ve açık olduğunu kontrol eden Ahmet, görüntüyü aydınlatmak için aşağıdakilerden hangisini kontrol etmelidir?',
        opts: [
          'A) Lamelin açısını değiştirmeyi',
          'B) Tablanın altındaki diyaframın kapalı olup olmadığını ve revolverin tam oturup oturmadığını',
          'C) Makro vidayı söküp çıkarmayı',
          'D) Hücre zarına boya eklemeyi'
        ],
        ans: 1,
        exp: 'Işık açık olduğu halde alan karanlıksa, ışığı ayarlayan DİYAFRAM kapalı olabilir veya objektif (revolver) tam yerine oturmamış olabilir.'
      },
      {
        topic: 'Yeni Nesil · Solunum & Fotosentez Döngüsü',
        q: 'Aydınlık bir odada cam fanus içine konulan bir saksı bitkisinin yaprak hücrelerinde aynı anda hem Kloroplast hem de Mitokondri aktif olarak çalışmaktadır. Bu iki organel arasındaki ilişki için aşağıdakilerden hangisi söylenebilir?',
        opts: [
          'A) Kloroplastın ürettiği besin ve oksijeni, mitokondri enerji (ATP) üretmek için kullanır.',
          'B) Mitokondri fotosentez yapar, kloroplast sindirim yapar.',
          'C) İki organel sadece gece çalışır.',
          'D) Hayvan hücrelerinde de bu döngü aynı iki organelle gerçekleşir.'
        ],
        ans: 0,
        exp: 'Bitki hücresinde kloroplast besin+oksijen üretir; mitokondri ise bu besin ve oksijeni kullanarak hücre için enerji (ATP) üretir.'
      },
      {
        topic: 'Yeni Nesil · Doku – Organ İlişkisi',
        q: 'Bir öğrencinin hazırladığı "Vücudumuzdaki Sistemler" posterinde şu bilgi notu yazmaktadır:\n"Kan dokusu, kas dokusu ve sinir dokusu bir araya gelerek tek bir yapıyı oluşturur; bu yapı da akciğerler ve damarlarla iş birliği yaparak yaşamımızı sürdürür."\nMetinde bahsedilen tekil yapı aşağıdakilerden hangisidir?',
        opts: ['A) Kas hücresi', 'B) Kalp (Organ)', 'C) Dolaşım Sistemi', 'D) İnsan (Organizma)'],
        ans: 1,
        exp: 'Farklı dokuların (kan, kas, sinir) bir araya gelerek oluşturduğu ve damarlarla iş birliği yapan yapı KALP organıdır.'
      }
    ]
  }
];

let studentInfo = { name: '', className: '', school: '' };
let currentExamIdx = 0;
let currentQIdx = 0;
let examUserAnswers = [];
let examTimerInterval = null;
let examTimeRemaining = 900; // 15 dakika = 900 sn
let examRunnerActive = false;

// Çizim ve Yakınlaştırma Değişkenleri
let drawTool = 'cursor'; // 'cursor' | 'pen' | 'eraser'
let drawColor = '#ef4444';
let isDrawing = false;
let examZoomPct = 100;
let examDrawings = {}; // soru bazlı canvas dataURL

function loadStudentData() {
  try {
    const saved = localStorage.getItem('fenLabStudentInfo');
    if (saved) {
      studentInfo = JSON.parse(saved);
      const nEl = document.getElementById('stuNameInput');
      const cEl = document.getElementById('stuClassInput');
      const sEl = document.getElementById('stuSchoolInput');
      if (nEl) nEl.value = studentInfo.name || '';
      if (cEl) cEl.value = studentInfo.className || '';
      if (sEl) sEl.value = studentInfo.school || '';
    }
  } catch (e) {}
}

function saveStudentData() {
  const nEl = document.getElementById('stuNameInput');
  const cEl = document.getElementById('stuClassInput');
  const sEl = document.getElementById('stuSchoolInput');
  studentInfo = {
    name: nEl ? nEl.value.trim() : '',
    className: cEl ? cEl.value.trim() : '',
    school: sEl ? sEl.value.trim() : ''
  };
  try { localStorage.setItem('fenLabStudentInfo', JSON.stringify(studentInfo)); } catch (e) {}
}

function getCompletedExamsMap() {
  try {
    return JSON.parse(localStorage.getItem('fenLabCompletedExams') || '{}');
  } catch (e) { return {}; }
}

function renderUnitExamCards() {
  const grid = document.getElementById('examCardsGrid');
  if (!grid) return;
  const doneMap = getCompletedExamsMap();
  grid.innerHTML = '';

  UNIT_EXAMS.forEach((ex, idx) => {
    const doneInfo = doneMap[ex.id];
    const card = document.createElement('div');
    card.className = 'exam-select-card';
    card.innerHTML = `
      <div class="exam-card-top">
        <span class="exam-level-badge" style="background:${ex.badgeColor}18; color:${ex.badgeColor}; border-color:${ex.badgeColor}55;">
          ${ex.level}
        </span>
        ${doneInfo ? `<span class="exam-done-badge">✅ Puan: ${doneInfo.score}</span>` : `<span style="font-size:0.75rem; color:#64748b; font-weight:700;">10 Soru · 15 Dk</span>`}
      </div>
      <h3>${ex.title}</h3>
      <p>${ex.desc}</p>
      <button class="exam-start-btn" onclick="startUnitExam(${idx})">
        ${doneInfo ? '🔄 Denemeyi Tekrar Çöz' : '🚀 Sınava Başla →'}
      </button>
    `;
    grid.appendChild(card);
  });
}

function startUnitExam(examIdx) {
  saveStudentData();
  if (!studentInfo.name) {
    playErrorSound();
    alert('Lütfen sınava başlamadan önce "Adı Soyadı" alanını doldur!');
    const nEl = document.getElementById('stuNameInput');
    if (nEl) nEl.focus();
    return;
  }

  playSuccessSound();
  currentExamIdx = examIdx;
  currentQIdx = 0;
  examUserAnswers = new Array(UNIT_EXAMS[examIdx].questions.length).fill(null);
  examDrawings = {};
  examTimeRemaining = 900;
  examZoomPct = 100;
  examRunnerActive = true;

  document.getElementById('examWelcomeView').style.display = 'none';
  document.getElementById('examKarneView').style.display = 'none';
  document.getElementById('examRunnerView').style.display = 'flex';

  const ex = UNIT_EXAMS[examIdx];
  document.getElementById('runnerExamTitle').textContent = ex.title;
  document.getElementById('runnerStudentBadge').textContent = `👤 ${studentInfo.name}${studentInfo.className ? ' (' + studentInfo.className + ')' : ''}`;

  setDrawTool('cursor');
  updateExamZoomDisplay();
  renderExamQuestion();
  renderOpticalSheet();
  startExamTimer();
  setTimeout(resizeExamDrawCanvas, 60);
}

function startExamTimer() {
  clearInterval(examTimerInterval);
  updateTimerUI();
  examTimerInterval = setInterval(() => {
    examTimeRemaining--;
    updateTimerUI();
    if (examTimeRemaining <= 0) {
      clearInterval(examTimerInterval);
      finishUnitExam(true);
    }
  }, 1000);
}

function updateTimerUI() {
  const m = String(Math.floor(examTimeRemaining / 60)).padStart(2, '0');
  const s = String(examTimeRemaining % 60).padStart(2, '0');
  const el = document.getElementById('runnerTimer');
  if (el) {
    el.textContent = `⏱️ ${m}:${s}`;
    el.style.color = examTimeRemaining <= 120 ? '#dc2626' : '#1e293b';
  }
}

function renderExamQuestion() {
  const ex = UNIT_EXAMS[currentExamIdx];
  const qObj = ex.questions[currentQIdx];
  const total = ex.questions.length;

  document.getElementById('runnerQCounter').textContent = `Soru ${currentQIdx + 1} / ${total}`;
  document.getElementById('qDifficultyTag').textContent = `${ex.level} · ${qObj.topic}`;
  document.getElementById('qStemText').innerHTML = qObj.q.replace(/\n/g, '<br>');

  const mediaBox = document.getElementById('qMediaBox');
  if (qObj.img) {
    mediaBox.style.display = 'flex';
    mediaBox.innerHTML = `<img src="${qObj.img}" alt="Soru Görseli" style="max-height:190px; max-width:100%; border-radius:12px; border:1px solid #cbd5e1; background:#0f172a; padding:4px; object-fit:contain;">`;
  } else if (qObj.svg) {
    mediaBox.style.display = 'flex';
    mediaBox.innerHTML = qObj.svg;
  } else {
    mediaBox.style.display = 'none';
    mediaBox.innerHTML = '';
  }

  const optsWrap = document.getElementById('qOptionsList');
  const chosen = examUserAnswers[currentQIdx];
  optsWrap.innerHTML = qObj.opts.map((opt, oIdx) => `
    <button class="runner-opt-btn ${chosen === oIdx ? 'selected' : ''}" onclick="selectExamOption(${oIdx})">
      <span class="runner-opt-letter">${String.fromCharCode(65 + oIdx)}</span>
      <span style="flex:1; text-align:left;">${opt.replace(/^[A-D]\)\s*/, '')}</span>
    </button>
  `).join('');

  document.getElementById('prevQBtn').disabled = currentQIdx === 0;
  document.getElementById('nextQBtn').textContent = currentQIdx === total - 1 ? '✅ Sınavı Bitir →' : 'Sonraki Soru ▶';

  restoreQuestionDrawing();
  highlightActiveOpticalRow();
}

function selectExamOption(oIdx) {
  examUserAnswers[currentQIdx] = examUserAnswers[currentQIdx] === oIdx ? null : oIdx;
  playTone(620, 0.06, 'sine', 0.06);
  renderExamQuestion();
  renderOpticalSheet();
}

function goToExamQuestion(qIdx) {
  saveCurrentQuestionDrawing();
  currentQIdx = qIdx;
  renderExamQuestion();
}

function prevExamQuestion() {
  if (currentQIdx > 0) goToExamQuestion(currentQIdx - 1);
}

function nextExamQuestion() {
  const total = UNIT_EXAMS[currentExamIdx].questions.length;
  if (currentQIdx < total - 1) goToExamQuestion(currentQIdx + 1);
  else confirmFinishExam();
}

function renderOpticalSheet() {
  const ex = UNIT_EXAMS[currentExamIdx];
  const grid = document.getElementById('opticalGrid');
  if (!grid) return;

  let filledCount = 0;
  grid.innerHTML = ex.questions.map((_, qIdx) => {
    const ans = examUserAnswers[qIdx];
    if (ans !== null) filledCount++;
    const bubbles = [0, 1, 2, 3].map(oIdx => `
      <button class="opt-bubble ${ans === oIdx ? 'filled' : ''}" onclick="setOpticalAnswer(${qIdx}, ${oIdx})">
        ${String.fromCharCode(65 + oIdx)}
      </button>
    `).join('');
    return `
      <div class="optical-row ${qIdx === currentQIdx ? 'current' : ''}" id="optrow-${qIdx}">
        <button class="opt-qnum" onclick="goToExamQuestion(${qIdx})">${qIdx + 1}.</button>
        <div class="opt-bubbles">${bubbles}</div>
      </div>
    `;
  }).join('');

  document.getElementById('optFilledCount').textContent = filledCount;
  document.getElementById('optBlankCount').textContent = ex.questions.length - filledCount;
}

function setOpticalAnswer(qIdx, oIdx) {
  examUserAnswers[qIdx] = examUserAnswers[qIdx] === oIdx ? null : oIdx;
  playTone(600, 0.05, 'sine', 0.05);
  if (qIdx === currentQIdx) renderExamQuestion();
  renderOpticalSheet();
}

function highlightActiveOpticalRow() {
  document.querySelectorAll('.optical-row').forEach((r, idx) => r.classList.toggle('current', idx === currentQIdx));
}

/* --- KALEM & ÇİZİM ARAÇLARI --- */
function initExamDrawCanvasEvents() {
  const canvas = document.getElementById('evalDrawCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const getPos = e => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  canvas.addEventListener('pointerdown', e => {
    if (drawTool === 'cursor') return;
    isDrawing = true;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  });

  canvas.addEventListener('pointermove', e => {
    if (!isDrawing || drawTool === 'cursor') return;
    const p = getPos(e);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (drawTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 22;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = 3.2;
    }
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });

  window.addEventListener('pointerup', () => {
    if (isDrawing) {
      isDrawing = false;
      saveCurrentQuestionDrawing();
    }
  });
}

function resizeExamDrawCanvas() {
  const stage = document.getElementById('questionStage');
  const canvas = document.getElementById('evalDrawCanvas');
  if (!stage || !canvas || stage.clientWidth === 0) return;
  saveCurrentQuestionDrawing();
  canvas.width = stage.clientWidth;
  canvas.height = stage.clientHeight;
  restoreQuestionDrawing();
}

function saveCurrentQuestionDrawing() {
  const canvas = document.getElementById('evalDrawCanvas');
  if (!canvas || canvas.width === 0) return;
  examDrawings[currentQIdx] = canvas.toDataURL();
}

function restoreQuestionDrawing() {
  const canvas = document.getElementById('evalDrawCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const url = examDrawings[currentQIdx];
  if (url) {
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.src = url;
  }
}

function setDrawTool(tool, color) {
  drawTool = tool;
  if (color) drawColor = color;
  const canvas = document.getElementById('evalDrawCanvas');
  if (canvas) {
    canvas.style.pointerEvents = tool === 'cursor' ? 'none' : 'auto';
    canvas.style.cursor = tool === 'eraser' ? 'cell' : (tool === 'pen' ? 'crosshair' : 'default');
  }
  document.querySelectorAll('.draw-tool-btn').forEach(b => b.classList.remove('active'));
  if (tool === 'cursor') document.getElementById('dt-cursor').classList.add('active');
  else if (tool === 'eraser') document.getElementById('dt-eraser').classList.add('active');
  else if (color === '#ef4444') document.getElementById('dt-red').classList.add('active');
  else if (color === '#2563eb') document.getElementById('dt-blue').classList.add('active');
  else if (color === '#16a34a') document.getElementById('dt-green').classList.add('active');
}

function clearQuestionDrawing() {
  const canvas = document.getElementById('evalDrawCanvas');
  if (!canvas) return;
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  delete examDrawings[currentQIdx];
}

function changeExamZoom(delta) {
  examZoomPct = Math.max(80, Math.min(135, examZoomPct + delta));
  updateExamZoomDisplay();
}

function updateExamZoomDisplay() {
  const body = document.getElementById('questionContentArea');
  if (body) body.style.fontSize = `${(examZoomPct / 100).toFixed(2)}rem`;
  const lbl = document.getElementById('examZoomVal');
  if (lbl) lbl.textContent = `%${examZoomPct}`;
}

function confirmFinishExam() {
  const blankCount = examUserAnswers.filter(a => a === null).length;
  if (blankCount > 0 && !confirm(`Henüz ${blankCount} boş sorun var. Sınavı bitirip karneni görmek istiyor musun?`)) return;
  finishUnitExam(false);
}

function exitExamRunner() {
  if (examRunnerActive && !confirm('Denemeden çıkmak istediğine emin misin? İlerleme kaydedilmeyecektir.')) return;
  clearInterval(examTimerInterval);
  examRunnerActive = false;
  document.getElementById('examRunnerView').style.display = 'none';
  document.getElementById('examKarneView').style.display = 'none';
  document.getElementById('examWelcomeView').style.display = 'flex';
  renderUnitExamCards();
}

function finishUnitExam(isTimeUp) {
  clearInterval(examTimerInterval);
  examRunnerActive = false;
  playSuccessSound();

  const ex = UNIT_EXAMS[currentExamIdx];
  let correct = 0, wrong = 0, blank = 0;
  ex.questions.forEach((q, idx) => {
    const u = examUserAnswers[idx];
    if (u === null) blank++;
    else if (u === q.ans) correct++;
    else wrong++;
  });

  const net = Math.max(0, +(correct - wrong / 3).toFixed(2));
  const score = Math.round((correct / ex.questions.length) * 100);
  addScore(correct * 15);

  try {
    const doneMap = getCompletedExamsMap();
    doneMap[ex.id] = { score, correct, wrong, blank };
    localStorage.setItem('fenLabCompletedExams', JSON.stringify(doneMap));
  } catch (e) {}

  document.getElementById('examRunnerView').style.display = 'none';
  document.getElementById('examKarneView').style.display = 'flex';

  document.getElementById('karneTitle').textContent = `${ex.title} — Başarı Karnesi`;
  document.getElementById('karneStudentInfo').textContent = `👤 Öğrenci: ${studentInfo.name}${studentInfo.className ? ' · Sınıf: ' + studentInfo.className : ''}${studentInfo.school ? ' · ' + studentInfo.school : ''}${isTimeUp ? ' (⏱️ Süre Doldu)' : ''}`;

  document.getElementById('kpiCorrect').textContent = correct;
  document.getElementById('kpiWrong').textContent = wrong;
  document.getElementById('kpiBlank').textContent = blank;
  document.getElementById('kpiNet').textContent = net;
  document.getElementById('kpiScore').textContent = score;

  const pctDeg = Math.round((correct / ex.questions.length) * 360);
  const donut = document.getElementById('karneDonutChart');
  if (donut) {
    donut.innerHTML = `
      <svg viewBox="0 0 120 120" width="130" height="130">
        <circle cx="60" cy="60" r="48" fill="none" stroke="#e2e8f0" stroke-width="14"/>
        <circle cx="60" cy="60" r="48" fill="none" stroke="${score >= 70 ? '#16a34a' : '#f59e0b'}" stroke-width="14"
          stroke-dasharray="${((score / 100) * 301.59).toFixed(1)} 301.59" stroke-linecap="round" transform="rotate(-90 60 60)"/>
        <text x="60" y="65" text-anchor="middle" font-size="22" font-weight="800" fill="#0f172a">%${score}</text>
      </svg>
    `;
  }

  let evalMsg = '';
  if (score >= 90) evalMsg = '🌟 Mükemmel! Hücre ve organeller konusuna tamamen hakimsin. Kemal Öğretmen seni tebrik ediyor!';
  else if (score >= 70) evalMsg = '👏 Çok iyi gidiyorsun! Yanlış veya boş bıraktığın soruların çözümünü aşağıdan inceleyerek tam puana ulaşabilirsin.';
  else evalMsg = '💪 Güzel bir başlangıç! Hatalı sorularının çözümlerini inceleyip 3B Laboratuvarda ilgili organeli tekrar gözden geçirebilirsin.';
  document.getElementById('karneTeacherNote').textContent = evalMsg;

  const pills = document.getElementById('karneQuestionPills');
  pills.innerHTML = ex.questions.map((q, idx) => {
    const u = examUserAnswers[idx];
    const cls = u === null ? 'pill-blank' : (u === q.ans ? 'pill-ok' : 'pill-err');
    const mark = u === null ? '⚪' : (u === q.ans ? '✅' : '❌');
    return `<button class="karne-q-pill ${cls}" onclick="openExamReviewModal(${idx})">${mark} Soru ${idx + 1}</button>`;
  }).join('');
}

function openExamReviewModal(qIdx) {
  const ex = UNIT_EXAMS[currentExamIdx];
  const qObj = ex.questions[qIdx];
  const u = examUserAnswers[qIdx];

  document.getElementById('revModalTitle').textContent = `Soru ${qIdx + 1} İncelemesi (${qObj.topic})`;
  document.getElementById('revModalQ').innerHTML = qObj.q.replace(/\n/g, '<br>');

  const mediaBox = document.getElementById('revModalMedia');
  if (qObj.img) {
    mediaBox.style.display = 'flex';
    mediaBox.innerHTML = `<img src="${qObj.img}" style="max-height:150px; border-radius:10px; background:#0f172a; padding:4px;">`;
  } else if (qObj.svg) {
    mediaBox.style.display = 'flex';
    mediaBox.innerHTML = qObj.svg;
  } else {
    mediaBox.style.display = 'none';
    mediaBox.innerHTML = '';
  }

  document.getElementById('revModalOpts').innerHTML = qObj.opts.map((opt, oIdx) => {
    let cls = 'rev-opt';
    let badge = '';
    if (oIdx === qObj.ans) { cls += ' correct'; badge = '✅ Doğru Cevap'; }
    else if (oIdx === u) { cls += ' wrong'; badge = '❌ Senin Cevabın'; }
    return `<div class="${cls}"><span>${opt}</span><span>${badge}</span></div>`;
  }).join('');

  document.getElementById('revModalExp').innerHTML = `<strong>💡 Kemal Öğretmen Notu:</strong> ${qObj.exp}`;
  document.getElementById('examReviewModal').classList.add('open');
}

function closeExamReviewModal() {
  document.getElementById('examReviewModal').classList.remove('open');
}

function backToExamWelcome() {
  document.getElementById('examKarneView').style.display = 'none';
  document.getElementById('examRunnerView').style.display = 'none';
  document.getElementById('examWelcomeView').style.display = 'flex';
  renderUnitExamCards();
}

/* ============================================================================
   9. GENEL RENDER DÖNGÜSÜ (TÜM MODELLER İSTENMEDİKÇE SABİT DURUR)
============================================================================ */
function animateAll() {
  requestAnimationFrame(animateAll);

  if (activeModule === 'microscope' && micRenderer && micScene && micCamera) {
    if (micAutoSpin && !isDraggingMic && micGroup) {
      micGroup.rotation.y += 0.004;
    }
    micRenderer.render(micScene, micCamera);
    updateMicroscopeLabels2D();
  }

  if (activeModule === 'cell' && currentCellDim === '3d' && cellRenderer && cellScene && cellCamera) {
    if (cellAutoSpin && !isDraggingCell && cellRootGroup) {
      cellRootGroup.rotation.y += 0.004;
    }
    cellRenderer.render(cellScene, cellCamera);
    updateCellLabels2D();
  }

  if (popupOpen && popupRenderer && popupScene && popupCamera) {
    if (popupAutoSpin && !isDraggingPopup && popupMeshGroup) {
      popupMeshGroup.rotation.y += 0.008;
    }
    popupRenderer.render(popupScene, popupCamera);
  }
}

function onWindowResize() {
  if (micRenderer && micCamera) {
    const h1 = document.getElementById('microscopeCanvasHolder');
    if (h1 && h1.clientWidth > 0 && h1.clientHeight > 0) {
      micCamera.aspect = h1.clientWidth / h1.clientHeight;
      micCamera.updateProjectionMatrix();
      micRenderer.setSize(h1.clientWidth, h1.clientHeight);
    }
  }
  if (cellRenderer && cellCamera) {
    const h2 = document.getElementById('cellCanvasHolder');
    if (h2 && h2.clientWidth > 0 && h2.clientHeight > 0) {
      cellCamera.aspect = h2.clientWidth / h2.clientHeight;
      cellCamera.updateProjectionMatrix();
      cellRenderer.setSize(h2.clientWidth, h2.clientHeight);
    }
  }
}

window.addEventListener('resize', onWindowResize);

window.addEventListener('DOMContentLoaded', () => {
  initMicroscope3D();
  initCellLab3D();
  initPopup3DViewer();
  setHierarchyStage(1);
  initOrderGame();
  initFillBlanks();
  loadMatchSet(0);
  initClassifyGame();
  initTFGame();
  loadStudentData();
  renderUnitExamCards();
  initExamDrawCanvasEvents();
  animateAll();
});
