/**
 * Factory: a manufacturing shed with a sawtooth roof of six bays, and a round
 * chimney behind it. The pointer picks a roof bay; its tooth lifts clear of
 * the shed, as in an exploded drawing, and the bays beside it lift less,
 * staggered outwards. At rest one bay sits slightly raised and the chimney's
 * rim is the bright mark. The slider is the lift, in world units.
 */
const {
  Cam, facing, fillet, fit, hull, poly, proj, prism, rings, circ, seg, open, ringAt, run,
  tween, tset, tval, tdone, mk, put, solid, pointer, register, disposer,
} = HL;

const N = 6, BW = 22, L = N * BW, D = 62, H = 20, T = 13;
const REST = [0, 0, 5, 0, 0, 0], STEP = 45;
const FALL = [1, 0.38, 0.14, 0.05, 0.02, 0];

/** The screen points of a polygon pulled toward its middle by b: a crease inside a silhouette. */
const shrink = (pts, b) => {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return pts.map(([x, y]) => { const d = Math.hypot(x - cx, y - cy) || 1; return [x - ((x - cx) / d) * b, y - ((y - cy) / d) * b]; });
};
/** A convex profile [[x, z]…], rounded, run along y from s0 to s1: silhouette and the near end's crease. */
function ext(P, prof, s0, s1, dz, r) {
  const pr = fillet(prof, prof.map(() => r), 3);
  const at = (s) => pr.map(([a, z]) => P(a, s, z + dz));
  const near = at(s1);
  return { sil: poly(hull(near.concat(at(s0)))), crease: poly(shrink(near, 1.3)) };
}
const tooth = (i) => [[i * BW, H], [(i + 1) * BW, H], [(i + 1) * BW, H + T]];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let lift = value;
  const C = Cam(45, 0.5, 1.72);
  fit(C, [[-8, -24, -3], [L + 8, D + 8, -3], [L + 8, -24, -3], [-8, D + 8, -3], [24, -12, 66], [L, 0, H + T + 34]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  // the chimney stands behind the shed, so it is painted first
  const cr = circ(5.5, 24).map((q) => ({ ...q, u: q.u + 24, v: q.v - 12 }));
  const ci = circ(4.3, 24).map((q) => ({ ...q, u: q.u + 24, v: q.v - 12 }));
  const chim = solid(g);
  put(chim, prism(P, front, cr, ci, 0, 66));
  mk("path", { class: "nf lo", d: [50, 57].map((z) => open(ringAt(P, run(cr, front), z))).join("") }, g);

  // the plinth and the shed's walls
  const [pr, pi] = rings(-8, -6, L + 8, D + 8, 6, 1.6);
  put(solid(g), prism(P, front, pr, pi, -3, 0));
  const [wr, wi] = rings(0, 0, L, D, 2.5, 1.2);
  put(solid(g), prism(P, front, wr, wi, 0, H));
  // a dock door and a personnel door on the long face, and a line of high windows
  const face = (x0, x1, z0, z1) => poly([P(x0, D, z0), P(x1, D, z0), P(x1, D, z1), P(x0, D, z1)]);
  mk("path", { class: "nf lo", d: face(14, 32, 0, 13) + face(44, 49, 0, 8) + face(62, 116, 14.5, 17) }, g);

  // the roof: one tooth per bay, painted from the far bay to the near one
  const bays = [];
  for (let i = 0; i < N; i++) {
    const el = solid(g), glaze = mk("path", { class: "nf lo" }, g);
    bays.push({ el, glaze, tw: tween(REST[i]), drawn: NaN });
  }
  function draw(i, dz) {
    const b = bays[i];
    if (dz === b.drawn) return;
    b.drawn = dz;
    put(b.el, ext(P, tooth(i), 0, D, dz, 1));
    const x = (i + 1) * BW, d = [];
    for (let y = 8; y < D; y += 9) d.push(seg(P(x, y, H + 2 + dz), P(x, y, H + T - 2 + dz)));
    b.glaze.setAttribute("d", d.join(""));
  }

  // hit: the rest centres of the bays' tops on screen, which never move
  const centres = bays.map((_, i) => P((i + 0.6) * BW, D / 2, H + T * 0.6));
  const hit = ([x, y]) => {
    let best = -1, bd = 34;
    centres.forEach((c, i) => { const d = Math.hypot(x - c[0], y - c[1]); if (d < bd) { bd = d; best = i; } });
    return best;
  };

  const B = register(stage, (_dt, now) => {
    let moving = false;
    bays.forEach((b, i) => { draw(i, tval(b.tw, now)); if (!tdone(b.tw, now)) moving = true; });
    return moving;
  });
  bag.add(B.unregister);

  let act = -2;
  function setActive(a, force) {
    if (a === act && !force) return;
    const now = performance.now(), from = a >= 0 ? a : act >= 0 ? act : 2;
    act = a;
    bays.forEach((b, i) => {
      tset(b.tw, a < 0 ? REST[i] : lift * FALL[Math.abs(i - a)], now, Math.abs(i - from) * STEP);
      b.el.sil.classList.toggle("hi", i === a);
    });
    chim.sil.classList.toggle("hi", a < 0);
    read.textContent = a < 0 ? "rest" : `bay ${a + 1}`;
    B.wake();
  }
  setActive(-1);

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { lift = v; if (act >= 0) setActive(act, true); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "factory",
  means: "A sawtooth-roofed plant: the roof bay under the pointer lifts clear, and the bays beside it follow less.",
  rules: [1, 2, 5, 9],
  range: [12, 22, 32],
  tour: [[153, 144], [266, 203], [207, 170], null],
  mount,
});
