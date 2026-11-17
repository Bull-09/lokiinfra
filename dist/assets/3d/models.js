// Procedural, physically-lit building models for the LOKI Infra site.
// Units are metres. Every builder returns { root, update? } with the model sitting on y = 0.
import * as THREE from "./vendor/three.module.min.js";

const AMBER = 0xf2a900;

/* ---------- textures (drawn once on small canvases) ---------- */
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Ribbed metal cladding: a bump map of vertical ribs.
const ribBump = canvasTex(64, 8, (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, w, 0);
  for (let i = 0; i <= 4; i++) {
    grd.addColorStop(i / 4, "#222");
    if (i < 4) grd.addColorStop(i / 4 + 0.06, "#fff"), grd.addColorStop(i / 4 + 0.16, "#888");
  }
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
}, false);
ribBump.wrapS = ribBump.wrapT = THREE.RepeatWrapping;

// Fine concrete noise.
const grain = canvasTex(128, 128, (g, w, h) => {
  const img = g.createImageData(w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 200 + Math.random() * 55;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
});
grain.wrapS = grain.wrapT = THREE.RepeatWrapping;

/** Window grid facade: returns { map, emissive } for a facade of cols x rows windows. */
function facade(cols, rows, { wall = "#d9d6cf", glass = "#1d3347", frame = "#5d6b77", band = null, lit = 0.12, fill = 0.62 } = {}) {
  const cw = 32, rh = 32, W = cols * cw, H = rows * rh;
  const litSet = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) litSet.push(Math.random() < lit);
  const draw = (emissive) => (g) => {
    g.fillStyle = emissive ? "#000" : wall; g.fillRect(0, 0, W, H);
    for (let r = 0; r < rows; r++) {
      if (band && !emissive) { g.fillStyle = band; g.fillRect(0, r * rh, W, 3); }
      for (let c = 0; c < cols; c++) {
        const x = c * cw + cw * (1 - fill) / 2, y = r * rh + rh * 0.2, w = cw * fill, h = rh * 0.6;
        const on = litSet[r * cols + c];
        if (emissive) { if (on) { g.fillStyle = "#ffc979"; g.fillRect(x, y, w, h); } continue; }
        g.fillStyle = frame; g.fillRect(x - 1.5, y - 1.5, w + 3, h + 3);
        const gr = g.createLinearGradient(x, y, x + w, y + h);
        gr.addColorStop(0, on ? "#e6d3ae" : glass); gr.addColorStop(1, on ? "#b88f55" : "#0e1c28");
        if (!on) { g.fillStyle = "rgba(170,200,225,.18)"; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w * 0.6, y); g.lineTo(x, y + h * 0.7); g.fill(); }
        g.fillStyle = gr; g.fillRect(x, y, w, h);
        g.fillStyle = frame; g.fillRect(x + w / 2 - 0.75, y, 1.5, h);
      }
    }
  };
  return { map: canvasTex(W, H, draw(false)), emissive: canvasTex(W, H, draw(true)) };
}

// Curtain-wall glass: mullion grid over a sky-ish gradient.
function curtain(cols, rows, tint = "#2c4c66") {
  const W = cols * 24, H = rows * 32;
  return canvasTex(W, H, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, "#9cb6cb"); gr.addColorStop(0.45, tint); gr.addColorStop(1, "#14222f");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.18;
    for (let c = 0; c < cols; c++) { g.fillStyle = c % 3 ? "#fff" : "#000"; g.fillRect(c * 24, 0, 24, H); }
    g.globalAlpha = 1; g.fillStyle = "#c3ccd4";
    for (let c = 0; c <= cols; c++) g.fillRect(c * 24 - 1, 0, 2, H);
    for (let r = 0; r <= rows; r++) g.fillRect(0, r * 32 - 1.5, W, 3);
  });
}

const solarCells = canvasTex(192, 96, (g, w, h) => {
  g.fillStyle = "#c9d2da"; g.fillRect(0, 0, w, h);
  const cols = 12, rows = 6, cw = w / cols, ch = h / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const gr = g.createLinearGradient(c * cw, r * ch, (c + 1) * cw, (r + 1) * ch);
    gr.addColorStop(0, "#1f3c78"); gr.addColorStop(1, "#0d1e43");
    g.fillStyle = gr; g.fillRect(c * cw + 1, r * ch + 1, cw - 2, ch - 2);
  }
});

const roadTex = canvasTex(64, 512, (g, w, h) => {
  g.fillStyle = "#3a3f45"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 1); }
  g.fillStyle = "#e9e6dc"; g.fillRect(3, 0, 2, h); g.fillRect(w - 5, 0, 2, h);
  g.fillStyle = "#f2a900";
  for (let y = 0; y < h; y += 64) g.fillRect(w / 2 - 1.5, y, 3, 34);
});
roadTex.wrapT = THREE.RepeatWrapping;

/* ---------- materials ---------- */
const M = {
  concrete: new THREE.MeshStandardMaterial({ color: 0xb9b5ad, roughness: 0.92, map: grain }),
  slab: new THREE.MeshStandardMaterial({ color: 0x5d646b, roughness: 0.95, map: grain }),
  plinth: new THREE.MeshStandardMaterial({ color: 0x2a3743, roughness: 0.85 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x6d7c88, metalness: 0.75, roughness: 0.38 }),
  darkSteel: new THREE.MeshStandardMaterial({ color: 0x39434c, metalness: 0.7, roughness: 0.45 }),
  amber: new THREE.MeshStandardMaterial({ color: AMBER, metalness: 0.35, roughness: 0.42 }),
  amberGlow: new THREE.MeshStandardMaterial({ color: AMBER, emissive: AMBER, emissiveIntensity: 0.55, roughness: 0.5 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x8fb4d0, metalness: 0.92, roughness: 0.06, envMapIntensity: 1.4 }),
  skylight: new THREE.MeshStandardMaterial({ color: 0xa9c9e0, metalness: 0.9, roughness: 0.1, envMapIntensity: 1.5 }),
  white: new THREE.MeshStandardMaterial({ color: 0xdcd9d2, roughness: 0.7 }),
  red: new THREE.MeshStandardMaterial({ color: 0xd8332c, emissive: 0x8a1410, emissiveIntensity: 0.4, roughness: 0.5 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x15181b, roughness: 0.9 }),
  grass: new THREE.MeshStandardMaterial({ color: 0x4f6b3e, roughness: 1 }),
  water: new THREE.MeshStandardMaterial({ color: 0x5f86a3, metalness: 0.4, roughness: 0.3 }),
  road: new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.9 }),
  solar: new THREE.MeshStandardMaterial({ map: solarCells, metalness: 0.6, roughness: 0.18, envMapIntensity: 1.3 }),
  sun: new THREE.MeshBasicMaterial({ color: 0xffd36a }),
};

const cladCache = new Map();
/** Ribbed cladding material with ribs scaled to a wall length. */
function clad(color, len) {
  const key = color + ":" + Math.round(len);
  if (!cladCache.has(key)) {
    const bump = ribBump.clone(); bump.needsUpdate = true;
    bump.repeat.set(Math.max(1, len / 1.2), 1);
    cladCache.set(key, new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.42, bumpMap: bump, bumpScale: 0.9 }));
  }
  return cladCache.get(key);
}

/* ---------- geometry helpers ---------- */
function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
/** A box standing on y (its base), centred on x/z. */
const box = (p, w, h, d, mat, x = 0, y = 0, z = 0) => mesh(new THREE.BoxGeometry(w, h, d), mat, p, x, y + h / 2, z);
const cyl = (p, r, h, mat, x = 0, y = 0, z = 0, seg = 24, r2 = r) => mesh(new THREE.CylinderGeometry(r2, r, h, seg), mat, p, x, y + h / 2, z);

/** A beam between two points. */
function beam(p, a, b, t, mat) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const m = mesh(new THREE.BoxGeometry(t, len, t), mat, p);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  m.castShadow = true; m.receiveShadow = false;
  return m;
}

/** Building with a window facade on its four sides and a plain roof. */
function building(p, w, h, d, { floors, bays, wall, roof = M.concrete, lit, band, x = 0, y = 0, z = 0, glass } = {}) {
  floors ??= Math.max(1, Math.round(h / 3.4));
  const colsW = bays ?? Math.max(2, Math.round(w / 3.2)), colsD = Math.max(2, Math.round(d / 3.2));
  const fW = facade(colsW, floors, { wall, lit, band, glass }), fD = facade(colsD, floors, { wall, lit, band, glass });
  const side = (f) => new THREE.MeshStandardMaterial({ map: f.map, emissiveMap: f.emissive, emissive: 0xffe2b0, emissiveIntensity: 0.22, roughness: 0.55, metalness: 0.1 });
  const mW = side(fW), mD = side(fD);
  return mesh(new THREE.BoxGeometry(w, h, d), [mD, mD, roof, roof, mW, mW], p, x, y + h / 2, z);
}

/** Parapet ring around a roof. */
function parapet(p, w, d, y, mat = M.concrete, x = 0, z = 0, t = 0.25, h = 0.7) {
  box(p, w, h, t, mat, x, y, z - d / 2 + t / 2); box(p, w, h, t, mat, x, y, z + d / 2 - t / 2);
  box(p, t, h, d, mat, x - w / 2 + t / 2, y, z); box(p, t, h, d, mat, x + w / 2 - t / 2, y, z);
}

/** Ground plinth the model sits on (a slab with soft rounded feel). */
function plinth(p, w, d, mat = M.slab) {
  const s = new THREE.Shape(), r = 2.5, x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.25, bevelSegments: 3 });
  g.rotateX(Math.PI / 2); g.translate(0, -0.25, 0); // top face at y = 0
  const m = mesh(g, mat, p); m.position.y = 0; m.castShadow = false;
  return m;
}

/** Simple lorry: cab + box trailer. */
function truck(p, x, z, rot = 0, color = 0xe8e4da) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; p.add(g);
  box(g, 2.4, 2.6, 7.5, new THREE.MeshStandardMaterial({ color, roughness: 0.55 }), 0, 0.9, -1);
  box(g, 2.4, 2.2, 2.2, M.amber, 0, 0.8, 3.9);
  box(g, 2.0, 0.9, 0.08, M.glass, 0, 2.0, 5.02);
  for (const [wx, wz] of [[-1.15, 3.9], [1.15, 3.9], [-1.15, -3], [1.15, -3], [-1.15, -0.8], [1.15, -0.8]]) {
    const w = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 16), M.rubber, g, wx, 0.5, wz); w.rotation.z = Math.PI / 2;
  }
  return g;
}

function car(p, x, z, rot = 0, color = 0x8fa3b5) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; p.add(g);
  const paint = new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.3 });
  box(g, 1.8, 0.7, 4.2, paint, 0, 0.35, 0);
  box(g, 1.6, 0.6, 2.2, M.glass, 0, 1.05, -0.2);
  for (const [wx, wz] of [[-0.9, 1.3], [0.9, 1.3], [-0.9, -1.3], [0.9, -1.3]]) {
    const w = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.25, 12), M.rubber, g, wx, 0.34, wz); w.rotation.z = Math.PI / 2;
  }
  return g;
}

function tree(p, x, z, s = 1) {
  cyl(p, 0.18 * s, 1.6 * s, M.darkSteel, x, 0, z, 8);
  const m = mesh(new THREE.IcosahedronGeometry(1.3 * s, 1), M.grass, p, x, 2.4 * s, z);
  m.scale.y = 1.15;
}

/* ---------- sawtooth shed (shared by hero and factory) ---------- */
function sawtoothShed(p, { bays = 5, bw = 9, depth = 34, wallH = 9, toothH = 4.2, x = 0, z = 0 } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g);
  const L = bays * bw;
  // walls: ribbed cladding over a concrete dado
  box(g, L, 1.4, depth, M.concrete, 0, 0, 0);
  const wallMats = [clad(0x9aaab8, depth), clad(0x9aaab8, depth), M.steel, M.steel, clad(0x9aaab8, L), clad(0x9aaab8, L)];
  mesh(new THREE.BoxGeometry(L - 0.1, wallH - 1.4, depth - 0.1), wallMats, g, 0, 1.4 + (wallH - 1.4) / 2, 0);
  // eaves band in amber
  box(g, L + 0.3, 0.45, depth + 0.3, M.amber, 0, wallH - 0.45, 0);
  // roller shutters on the long face
  for (const sx of [-L / 2 + 8, -L / 2 + 22]) {
    if (sx + 3 > L / 2) continue;
    box(g, 5.5, 5.4, 0.2, clad(0x47535e, 5), sx, 0, depth / 2 + 0.05);
    box(g, 6.6, 0.35, 1.6, M.darkSteel, sx, 5.6, depth / 2 + 0.8);
  }
  // sawtooth roof: sloped metal + vertical north-light glazing per bay
  const prof = new THREE.Shape();
  prof.moveTo(0, 0); prof.lineTo(bw, 0); prof.lineTo(bw, toothH); prof.lineTo(0, 0);
  const tg = new THREE.ExtrudeGeometry(prof, { depth: depth, bevelEnabled: false });
  tg.translate(0, 0, -depth / 2);
  const roofMat = clad(0xb7c2cc, depth);
  for (let i = 0; i < bays; i++) {
    const t = mesh(tg, roofMat, g, -L / 2 + i * bw, wallH, 0);
    const gl = mesh(new THREE.PlaneGeometry(depth - 0.6, toothH - 0.6), M.skylight, g, -L / 2 + (i + 1) * bw + 0.03, wallH + toothH / 2, 0);
    gl.rotation.y = Math.PI / 2;
    t.castShadow = true;
  }
  return { group: g, L, depth, top: wallH + toothH };
}

/* ---------- tower crane ---------- */
function crane(p, { x = 0, z = 0, h = 34, jib = 30, counter = 10 } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g);
  const s = 1.6, t = 0.16, mat = M.amber;
  box(g, 4, 1, 4, M.concrete, 0, 0, 0);
  // lattice mast
  const c = [[-s / 2, -s / 2], [s / 2, -s / 2], [s / 2, s / 2], [-s / 2, s / 2]];
  for (const [cx, cz] of c) beam(g, [cx, 1, cz], [cx, h, cz], t, mat);
  for (let y = 1; y < h; y += s) {
    for (let i = 0; i < 4; i++) {
      const a = c[i], b = c[(i + 1) % 4];
      beam(g, [a[0], y, a[1]], [b[0], y, b[1]], t * 0.8, mat);
      beam(g, [a[0], y, a[1]], [b[0], y + s, b[1]], t * 0.6, mat);
    }
  }
  // slewing part
  const top = new THREE.Group(); top.position.y = h; g.add(top);
  box(top, 2.2, 1.6, 2.2, mat, 0, 0, 0);
  box(top, 1.8, 1.5, 2, M.white, 0, 0.2, 1.4);           // cab
  box(top, 1.7, 0.7, 0.05, M.glass, 0, 0.75, 2.42);
  const apexY = 7;
  beam(top, [0, 1.6, 0], [0, apexY, 0], 0.35, mat);
  // jib (triangular lattice) along -x, counter-jib along +x
  const jibY = 1.6, w = 1.1;
  const chords = [[0, w / 2], [0, -w / 2], [1, 0]];
  for (const [up, zz] of chords) beam(top, [0, jibY + up, zz], [-jib, jibY + up * 0.3, zz * 0.6], t, mat);
  for (let i = 0; i < jib; i += 1.6) {
    const k = 1 - (i / jib) * 0.4;
    beam(top, [-i, jibY, w / 2 * k], [-i, jibY, -w / 2 * k], t * 0.6, mat);
    beam(top, [-i, jibY, w / 2 * k], [-i - 0.8, jibY + (1 - i / jib * 0.7), 0], t * 0.5, mat);
    beam(top, [-i, jibY, -w / 2 * k], [-i - 0.8, jibY + (1 - i / jib * 0.7), 0], t * 0.5, mat);
  }
  for (const zz of [w / 2, -w / 2]) beam(top, [0, jibY, zz], [counter, jibY, zz], t * 1.4, mat);
  for (let i = 0; i < counter; i += 1.6) beam(top, [i, jibY, w / 2], [i, jibY, -w / 2], t * 0.6, mat);
  box(top, 2.6, 2.2, 2.2, M.concrete, counter - 1.6, jibY - 2.2, 0); // counterweight
  // pendant ties
  beam(top, [0, apexY, 0], [-jib * 0.7, jibY + 1, 0], 0.06, M.darkSteel);
  beam(top, [0, apexY, 0], [counter - 0.5, jibY, 0], 0.06, M.darkSteel);
  // trolley, cable and a load of steel sections
  const trolley = new THREE.Group(); trolley.position.set(-jib * 0.62, jibY, 0); top.add(trolley);
  box(trolley, 1.2, 0.4, 1.2, M.darkSteel, 0, -0.4, 0);
  const drop = 14;
  beam(trolley, [0, -0.4, 0], [0, -drop, 0], 0.05, M.darkSteel);
  box(trolley, 0.6, 0.6, 0.6, M.amber, 0, -drop - 0.6, 0);
  for (let i = 0; i < 4; i++) box(trolley, 0.35, 0.35, 6, M.steel, -0.6 + i * 0.4, -drop - 1.4, 0);
  return {
    group: g,
    update: (t) => {
      top.rotation.y = Math.sin(t * 0.25) * 0.9 + 0.4;
      trolley.position.x = -jib * (0.55 + Math.sin(t * 0.4) * 0.12);
    },
  };
}

/** Steel frame under construction: columns + beams on a grid. */
function steelFrame(p, nx, nz, sp, h, x0, z0, levels = 2) {
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
    beam(p, [x0 + i * sp, 0, z0 + k * sp], [x0 + i * sp, h * levels, z0 + k * sp], 0.4, M.steel);
  }
  for (let l = 1; l <= levels; l++) {
    const y = l * h;
    for (let i = 0; i < nx; i++) beam(p, [x0 + i * sp, y, z0], [x0 + i * sp, y, z0 + (nz - 1) * sp], 0.35, M.darkSteel);
    for (let k = 0; k < nz; k++) beam(p, [x0, y, z0 + k * sp], [x0 + (nx - 1) * sp, y, z0 + k * sp], 0.35, M.darkSteel);
  }
  box(p, (nx - 1) * sp + 0.6, 0.3, (nz - 1) * sp + 0.6, M.concrete, x0 + (nx - 1) * sp / 2, h - 0.3, z0 + (nz - 1) * sp / 2);
}

/* ---------- models ---------- */
const BUILDERS = {
  hero() {
    const root = new THREE.Group();
    plinth(root, 112, 86);
    const shed = sawtoothShed(root, { bays: 6, bw: 9, depth: 32, x: -14, z: -14 });
    // G+3 admin block with glazed stair core
    building(root, 26, 14, 13, { floors: 4, x: 32, z: -18, band: "#b9b4aa", lit: 0.15 });
    parapet(root, 26, 13, 14, M.concrete, 32, -18);
    box(root, 4, 16, 4.2, M.glass, 20, 0, -18);
    // new bay under construction
    steelFrame(root, 4, 3, 7, 6, 18, 8, 2);
    const cr = crane(root, { x: 6, z: 26, h: 38, jib: 34 });
    // stacked material + trucks + trees
    for (let i = 0; i < 5; i++) box(root, 9, 0.4, 0.4, M.steel, -40, 0.4 * i, 26 + (i % 2) * 0.1);
    for (let i = 0; i < 3; i++) box(root, 2.4, 1.2, 2.4, M.concrete, -30 + i * 3, 0, 32);
    truck(root, -20, 30, Math.PI / 2);
    for (let i = 0; i < 5; i++) tree(root, 46, 6 + i * 6, 1.1);
    return { root, update: cr.update };
  },

  factory() {
    const root = new THREE.Group();
    plinth(root, 84, 62);
    sawtoothShed(root, { bays: 5, bw: 9, depth: 30, x: -6, z: -4 });
    // chimney with amber bands
    cyl(root, 1.6, 36, M.concrete, -30, 0, -14, 28, 1.25);
    for (const y of [26, 31]) cyl(root, 1.45, 1, M.amber, -30, y, -14, 28, 1.4);
    // annex, silos, pipe rack
    building(root, 12, 7, 10, { floors: 2, x: 30, z: -10, lit: 0.2 });
    for (let i = 0; i < 3; i++) {
      cyl(root, 2.2, 13, M.white, 26 + i * 5, 0, 16);
      mesh(new THREE.ConeGeometry(2.2, 1.6, 24), M.white, root, 26 + i * 5, 13.8, 16);
    }
    beam(root, [-29, 6, 13], [21, 6, 13], 0.5, M.steel);
    beam(root, [-29, 6.8, 13], [21, 6.8, 13], 0.5, M.amber);
    for (let xx = -29; xx <= 21; xx += 10) beam(root, [xx, 0, 13], [xx, 7, 13], 0.35, M.darkSteel);
    truck(root, -24, 20, 0.3);
    return { root };
  },

  warehouse() {
    const root = new THREE.Group();
    plinth(root, 88, 64);
    const L = 64, D = 32, H = 11, rise = 3.2;
    const g = new THREE.Group(); g.position.z = -6; root.add(g);
    box(g, L, 1.2, D, M.concrete);
    mesh(new THREE.BoxGeometry(L, H - 1.2, D), [clad(0xc9d1d8, D), clad(0xc9d1d8, D), M.steel, M.steel, clad(0x7d93a6, L), clad(0x7d93a6, L)], g, 0, 1.2 + (H - 1.2) / 2, 0);
    // gable roof: two sloped panels
    const slope = Math.hypot(D / 2, rise), ang = Math.atan2(rise, D / 2);
    for (const s of [1, -1]) {
      const r = mesh(new THREE.BoxGeometry(L + 1.2, 0.3, slope + 0.6), clad(0xdfe4e8, L), g, 0, H + rise / 2, s * D / 4);
      r.rotation.x = s * ang;
      r.material = r.material.clone(); r.material.bumpMap = r.material.bumpMap.clone(); r.material.bumpMap.rotation = Math.PI / 2;
    }
    const gableShape = new THREE.Shape([new THREE.Vector2(-D / 2, 0), new THREE.Vector2(D / 2, 0), new THREE.Vector2(0, rise)]);
    for (const s of [1, -1]) {
      const gm = mesh(new THREE.ShapeGeometry(gableShape), clad(0xc9d1d8, D), g, s * L / 2, H, 0);
      gm.rotation.y = s * Math.PI / 2; gm.material = gm.material.clone(); gm.material.side = THREE.DoubleSide;
    }
    // loading dock: raised apron, 7 doors with canopies, two lorries backed in
    box(g, L - 6, 1.2, 4, M.concrete, 0, 0, D / 2 + 2);
    for (let i = 0; i < 7; i++) {
      const dx = -L / 2 + 7 + i * 8.3;
      box(g, 3.6, 4, 0.2, clad(0x3d4954, 4), dx, 1.2, D / 2 + 0.1);
      box(g, 4.4, 0.2, 2, M.amber, dx, 5.6, D / 2 + 1);
      box(g, 3.2, 0.12, 1.5, M.darkSteel, dx, 1.2, D / 2 + 4.6);
    }
    truck(g, -L / 2 + 15.3, D / 2 + 10.5, Math.PI);
    truck(g, -L / 2 + 31.9, D / 2 + 10.5, Math.PI, 0x8fa3b5);
    // office pod on the gable end
    building(g, 8, 7, 12, { floors: 2, x: L / 2 + 4, z: -6, lit: 0.18 });
    return { root };
  },

  office() {
    const root = new THREE.Group();
    plinth(root, 64, 56);
    const T = 16, H = 56;
    const curtainMat = (cols, rows) => new THREE.MeshStandardMaterial({ map: curtain(cols, rows), metalness: 0.85, roughness: 0.12, envMapIntensity: 1.3 });
    const cm = curtainMat(8, 16);
    mesh(new THREE.BoxGeometry(T, H, T), [cm, cm, M.concrete, M.concrete, cm, cm], root, 0, H / 2, -2);
    // slab edges every 3.5 m
    for (let y = 3.5; y < H; y += 3.5) box(root, T + 0.4, 0.25, T + 0.4, M.white, 0, y, -2);
    box(root, T + 0.8, 2, T + 0.8, M.white, 0, H, -2);
    box(root, 7, 3, 6, M.steel, 0, H + 2, -2);              // plant room
    cyl(root, 0.15, 6, M.darkSteel, 3, H + 5, 1);           // mast
    // low wings
    for (const s of [-1, 1]) {
      const wm = curtainMat(6, 3);
      mesh(new THREE.BoxGeometry(14, 10, 12), [wm, wm, M.concrete, M.concrete, wm, wm], root, s * 15, 5, 2);
      box(root, 14.6, 0.6, 12.6, M.white, s * 15, 10, 2);
    }
    // entrance canopy
    box(root, 10, 0.4, 5, M.amber, 0, 4.6, 8.5);
    for (const xx of [-4.5, 4.5]) cyl(root, 0.18, 4.6, M.darkSteel, xx, 0, 10.6, 10);
    for (let i = 0; i < 5; i++) tree(root, -24 + i * 12, 22);
    car(root, -10, 18, Math.PI / 2); car(root, 12, 18, -Math.PI / 2, 0xe8e4da);
    return { root };
  },

  retail() {
    const root = new THREE.Group();
    plinth(root, 80, 60);
    const L = 56, D = 30, H = 14;
    const g = new THREE.Group(); g.position.z = -8; root.add(g);
    building(g, L, H, D, { floors: 3, wall: "#e4e0d8", lit: 0.185 });
    // glass shopfront, signage band, canopy on columns
    box(g, L - 4, 5, 0.3, M.glass, 0, 0, D / 2 + 0.1);
    box(g, L + 0.4, 2.2, 1, M.white, 0, H - 2.4, D / 2 + 0.3);
    box(g, L * 0.45, 1.3, 0.3, M.amberGlow, 0, H - 2, D / 2 + 0.9);
    box(g, L - 6, 0.5, 7, M.white, 0, 6, D / 2 + 3.5);
    for (let i = 0; i < 6; i++) cyl(g, 0.22, 6, M.darkSteel, -L / 2 + 6 + i * ((L - 12) / 5), 0, D / 2 + 6.4, 10);
    // atrium skylight drum
    cyl(g, 6, 3, M.skylight, 0, H, 0, 32, 5);
    parapet(g, L, D, H);
    // car park
    const cols = [0x8fa3b5, 0xe8e4da, 0x2a3743, 0xb33a2f, 0xcfcbc3];
    for (let i = 0; i < 9; i++) car(g, -L / 2 + 6 + i * 5.6, D / 2 + 16, 0, cols[i % 5]);
    for (let i = 0; i < 4; i++) tree(g, -L / 2 + 4 + i * 16, D / 2 + 22, 0.9);
    return { root };
  },

  hospital() {
    const root = new THREE.Group();
    plinth(root, 76, 60);
    building(root, 44, 22, 16, { floors: 6, x: 0, z: -8, wall: "#ecebe6", band: "#cfd6dc", lit: 0.18 });
    parapet(root, 44, 16, 22, M.white, 0, -8);
    building(root, 18, 8, 14, { floors: 2, x: -10, z: 10, wall: "#ecebe6", lit: 0.2 });
    box(root, 14, 0.5, 6, M.white, -10, 4.2, 20);              // drop-off canopy
    box(root, 18, 0.5, 0.2, M.red, -10, 4.7, 23);
    // roof block with the cross, helipad ring
    box(root, 10, 6, 8, M.white, 12, 22, -8);
    box(root, 4.6, 1.2, 0.3, M.red, 12, 25, -3.85);
    box(root, 1.2, 4.6, 0.3, M.red, 12, 23.3, -3.85);
    const pad = mesh(new THREE.RingGeometry(4.2, 4.8, 40), M.amber, root, -10, 22.72, -8); pad.rotation.x = -Math.PI / 2;
    // ambulance
    const amb = car(root, 4, 18, Math.PI / 2, 0xf4f2ec); amb.scale.set(1.3, 1.5, 1.4);
    for (let i = 0; i < 4; i++) tree(root, 22 + (i % 2) * 6, 6 + Math.floor(i / 2) * 8);
    return { root };
  },

  residential() {
    const root = new THREE.Group();
    plinth(root, 64, 54);
    const tower = (x, z, floors) => {
      const H = floors * 3.2, W = 13, D = 13;
      building(root, W, H, D, { floors, x, z, wall: "#e9e3d8", glass: "#29445c", lit: 0.16 });
      for (let f = 1; f < floors; f++) {
        box(root, W + 2.4, 0.22, 2.2, M.white, x, f * 3.2 - 0.1, z + D / 2 + 0.6);
        box(root, W + 2.4, 1, 0.08, M.glass, x, f * 3.2 + 0.1, z + D / 2 + 1.65);
      }
      parapet(root, W, D, H, M.white, x, z);
      cyl(root, 1, 2, M.white, x - 3, H, z - 2, 16); cyl(root, 1, 2, M.white, x - 0.5, H, z - 2, 16);
      box(root, 4, 3, 4, M.concrete, x + 3, H, z + 2);
    };
    tower(-9, -4, 18);
    tower(10, 2, 12);
    // podium garden + pool
    box(root, 22, 0.4, 10, M.grass, 0, 0, 18);
    const pool = box(root, 10, 0.2, 5, M.water, 4, 0.32, 18);
    pool.receiveShadow = true;
    for (let i = 0; i < 6; i++) tree(root, -24 + i * 9.5, 22, 0.9);
    return { root };
  },

  infra() {
    const root = new THREE.Group();
    plinth(root, 70, 90, M.grass);
    // main road receding along z
    const road = mesh(new THREE.PlaneGeometry(14, 88), M.road, root, 0, 0.02, 0);
    road.rotation.x = -Math.PI / 2;
    road.material = road.material.clone(); road.material.map = roadTex.clone(); road.material.map.needsUpdate = true; road.material.map.repeat.set(1, 6);
    // kerbs
    for (const s of [-1, 1]) box(root, 0.6, 0.25, 88, M.concrete, s * 7.3, 0, 0);
    // overpass crossing it
    const deckY = 8;
    const deck = new THREE.Group(); root.add(deck);
    box(deck, 66, 1.4, 12, M.concrete, 0, deckY, -6);
    for (const s of [-1, 1]) box(deck, 66, 1, 0.4, M.white, 0, deckY + 1.4, -6 + s * 5.8);
    const top = mesh(new THREE.PlaneGeometry(10.4, 66), M.road, deck, 0, deckY + 1.42, -6);
    top.rotation.x = -Math.PI / 2; top.rotation.z = Math.PI / 2;
    top.material = top.material.clone(); top.material.map = roadTex.clone(); top.material.map.needsUpdate = true; top.material.map.repeat.set(1, 4);
    for (const px of [-22, -11, 11, 22]) { box(deck, 2, deckY, 2, M.concrete, px, 0, -6); box(deck, 4, 1, 9, M.concrete, px, deckY - 1, -6); }
    // street lights + traffic
    for (let i = -38; i <= 38; i += 12) {
      for (const s of [-1, 1]) {
        cyl(root, 0.12, 6.6, M.darkSteel, s * 8.2, 0, i, 8);
        box(root, 1.6, 0.2, 0.4, M.amberGlow, s * 7.5, 6.5, i);
      }
    }
    car(root, -3.2, 20, 0, 0xe8e4da); car(root, 3.2, -24, Math.PI, 0xb33a2f); truck(root, -3.2, -30, 0);
    car(deck, 14, deckY + 1.4, -3.5, Math.PI / 2, 0x8fa3b5);
    for (let i = 0; i < 8; i++) tree(root, (i % 2 ? 1 : -1) * (16 + (i % 3) * 4), -36 + i * 10, 0.9 + (i % 3) * 0.15);
    return { root };
  },

  solar() {
    const root = new THREE.Group();
    plinth(root, 70, 52, M.grass);
    const tilt = THREE.MathUtils.degToRad(22);
    for (let row = 0; row < 3; row++) {
      const z = -15 + row * 14;
      for (let i = 0; i < 6; i++) {
        const x = -25 + i * 10;
        const p = mesh(new THREE.BoxGeometry(9.4, 0.15, 7), M.solar, root, x, 2.9, z);
        p.rotation.x = -tilt;
        p.material = [M.steel, M.steel, M.solar, M.steel, M.steel, M.steel];
        for (const [dz, h] of [[-2.6, 1.6], [2.6, 3.8]]) cyl(root, 0.1, h, M.steel, x - 3.8, 0, z + dz, 8), cyl(root, 0.1, h, M.steel, x + 3.8, 0, z + dz, 8);
      }
    }
    // inverter station + fence posts
    box(root, 6, 2.6, 3, M.white, 26, 0, 18);
    box(root, 6.2, 0.3, 3.2, M.amber, 26, 2.6, 18);
    const sun = mesh(new THREE.SphereGeometry(2.6, 32, 16), M.sun, root, -18, 15, -22);
    sun.castShadow = sun.receiveShadow = false;
    const halo = new THREE.Mesh(new THREE.SphereGeometry(4.6, 32, 16), new THREE.MeshBasicMaterial({ color: 0xffc23d, transparent: true, opacity: 0.18 }));
    sun.add(halo);
    return { root, update: (t) => halo.scale.setScalar(1 + Math.sin(t * 1.5) * 0.06) };
  },
};
BUILDERS.sawtooth = BUILDERS.factory;

export const MODELS = Object.keys(BUILDERS);
export function buildModel(id) {
  const b = BUILDERS[id] || BUILDERS.factory;
  return b();
}
