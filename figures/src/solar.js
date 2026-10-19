/**
 * Solar: two rows of single-axis tracker tables on a pad, and a sun. The
 * pointer is the sun: it is put on a fixed plane in the sky under the pointer
 * and rides there on springs, and every table turns on its own spring to face
 * it, so near and far tables take different angles. At rest the sun stands in
 * the afternoon and the tables lean toward the viewer. The sun's disc is the bright
 * mark. The slider is the sun's height, in world units.
 */
const {
  Cam, facing, fillet, fit, hull, poly, proj, prism, rings, seg, clamp, rad, unproj,
  spring, stepS, mk, put, solid, pointer, register, disposer,
} = HL;

const NX = 4, TL = 24, GX = 28, TW = 15, PZ = 7, ROWS = [0, 34], REST = [12, 74];

const shrink = (pts, b) => {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return pts.map(([x, y]) => { const d = Math.hypot(x - cx, y - cy) || 1; return [x - ((x - cx) / d) * b, y - ((y - cy) / d) * b]; });
};

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let SZ = value;
  const C = Cam(45, 0.5, 1.9);
  fit(C, [[-12, -16, -3], [NX * GX + 8, 50, -3], [NX * GX + 8, -16, -3], [-12, 50, -3], [REST[0], REST[1], 95], [0, 60, 0]], 200, 172);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  const [pr, pi] = rings(-12, -16, NX * GX + 8, 50, 6, 1.6);
  put(solid(g), prism(P, front, pr, pi, -3, 0));

  const tables = [];
  for (const y of ROWS) for (let i = 0; i < NX; i++) {
    const x0 = i * GX, x1 = x0 + TL;
    // two posts under the table's axis
    for (const px of [x0 + 4, x1 - 4]) {
      const [r, inr] = rings(px - 0.9, y - 0.9, px + 0.9, y + 0.9, 0.9, 0.3);
      put(solid(g), prism(P, front, r, inr, 0, PZ));
    }
    const el = solid(g), cells = mk("path", { class: "nf lo" }, g);
    tables.push({ x0, x1, y, el, cells, sp: spring(0, { eps: 0.05 }), drawn: NaN });
  }
  function draw(t) {
    const th = t.sp.x;
    if (th === t.drawn) return;
    t.drawn = th;
    const c = Math.cos(rad(th)), s = Math.sin(rad(th)), h = TW / 2, k = 1.1;
    const at = (v, n) => [t.y + v * c - n * s, PZ + v * s + n * c];
    const prof = fillet([at(-h, 0), at(h, 0), at(h, k), at(-h, k)], [0.5, 0.5, 0.5, 0.5], 2);
    const near = prof.map(([yy, zz]) => P(t.x1, yy, zz)), far = prof.map(([yy, zz]) => P(t.x0, yy, zz));
    put(t.el, { sil: poly(hull(near.concat(far))), crease: poly(shrink(near, 1)) });
    const top = (x, v) => { const [yy, zz] = at(v, k); return P(x, yy, zz); };
    const d = [seg(top(t.x0 + 1, 0), top(t.x1 - 1, 0))];
    for (let x = t.x0 + 6; x < t.x1 - 1; x += 6) d.push(seg(top(x, -h + 1), top(x, h - 1)));
    t.cells.setAttribute("d", d.join(""));
  }

  // the sun: a disc that faces the viewer, and its rays
  const disc = mk("ellipse", { class: "nf sil hi", rx: 9, ry: 9 }, g), rays = mk("path", { class: "nf lo" }, g);
  const sx = spring(REST[0]), sy = spring(REST[1]);
  let drawnSun = "";
  function drawSun() {
    const [cx, cy] = P(sx.x, sy.x, SZ), key = cx.toFixed(2) + cy.toFixed(2);
    if (key === drawnSun) return;
    drawnSun = key;
    disc.setAttribute("cx", cx); disc.setAttribute("cy", cy);
    const d = [];
    for (let a = 0; a < 8; a++) { const u = Math.cos(a * Math.PI / 4), v = Math.sin(a * Math.PI / 4); d.push(seg([cx + u * 12.5, cy + v * 12.5], [cx + u * 16.5, cy + v * 16.5])); }
    rays.setAttribute("d", d.join(""));
  }
  /** Each table turns about its axis (along x) to face the sun's target, as far as its drive allows. */
  function aim() {
    for (const t of tables) t.sp.t = clamp(-Math.atan2(sy.t - t.y, SZ - PZ) * 180 / Math.PI, -55, 55);
  }
  aim();
  for (const t of tables) t.sp.x = t.sp.t;

  const B = register(stage, (dt) => {
    let m = stepS(sx, dt); m = stepS(sy, dt) || m;
    for (const t of tables) { if (stepS(t.sp, dt)) m = true; draw(t); }
    drawSun();
    return m;
  });
  bag.add(B.unregister);

  // hit: the pointer, held inside the sky's part of the frame, lands on a fixed plane at the sun's height
  function place(p) {
    if (p) { const [ux, uy] = unproj(C, clamp(p[0], 40, 360), clamp(p[1], 34, 150), SZ); sx.t = ux; sy.t = uy; }
    else { sx.t = REST[0]; sy.t = REST[1]; }
    aim();
    const hrs = clamp(12 + (sy.t - sx.t + 20) / 14, 6, 18.9), hh = Math.floor(hrs), mm = Math.floor((hrs - hh) * 6) * 10;
    read.textContent = p ? `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}` : "rest";
    B.wake();
  }
  let last = null;
  place(null);
  bag.add(pointer(stage, { move: (p) => { last = p; place(p); }, leave: () => { last = null; place(null); } }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { SZ = v; drawnSun = ""; place(last); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "solar",
  means: "Two rows of solar trackers under a sun that follows the pointer; each table turns on its own spring to face it.",
  rules: [1, 3, 5, 8],
  range: [60, 80, 100],
  tour: [[90, 90], [200, 60], [300, 100], null],
  mount,
});
