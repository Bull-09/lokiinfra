/**
 * Warehouse: a pre-engineered steel shed with a low gable roof and six loading
 * docks along its long face, each with a canopy and a rolling shutter. The
 * pointer picks a dock; its shutter rolls up and the shutters beside it open
 * less, staggered outwards. At rest the docks stand at different openings and
 * dock 4, wide open, is the bright mark. The slider is the stagger, in ms.
 */
const {
  Cam, facing, fillet, fit, hull, poly, proj, prism, rings, seg,
  tween, tset, tval, tdone, mk, put, solid, pointer, register, disposer,
} = HL;

const L = 150, D = 72, H = 24, R = 11, N = 6, DW = 13, GAP = 22, X0 = 18, DH = 15;
const REST = [0, 0.3, 0, 1, 0.12, 0], FALL = [1, 0.45, 0.18, 0.06, 0.02, 0];

const shrink = (pts, b) => {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return pts.map(([x, y]) => { const d = Math.hypot(x - cx, y - cy) || 1; return [x - ((x - cx) / d) * b, y - ((y - cy) / d) * b]; });
};
/** A convex profile [[y, z]…], rounded, run along x from s0 to s1: silhouette and the near end's crease. */
function extX(P, prof, s0, s1, r) {
  const pr = fillet(prof, prof.map(() => r), 3);
  const at = (s) => pr.map(([a, z]) => P(s, a, z));
  const near = at(s1);
  return { sil: poly(hull(near.concat(at(s0)))), crease: poly(shrink(near, 1.3)) };
}
/** A rounded rectangle on the long face (y = D), from x0 to x1 and z0 to z1. */
const onFace = (P, x0, x1, z0, z1, r) =>
  poly(fillet([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], [r, r, r, r], 3).map(([x, z]) => P(x, D + 0.2, z)));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;
  const C = Cam(45, 0.5, 1.6);
  fit(C, [[-8, -8, -3], [L + 8, D + 14, -3], [L + 8, -8, -3], [-8, D + 14, -3], [0, D / 2, H + R]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  // apron slab, walls, and the gable roof with a little eave all round
  const [ar, ai] = rings(-8, -8, L + 8, D + 14, 6, 1.6);
  put(solid(g), prism(P, front, ar, ai, -3, 0));
  const [wr, wi] = rings(0, 0, L, D, 2, 1.1);
  put(solid(g), prism(P, front, wr, wi, 0, H));
  put(solid(g), extX(P, [[-2.5, H - 0.6], [D + 2.5, H - 0.6], [D / 2, H + R]], -2.5, L + 2.5, 1.2));
  // the ridge vent, a wall girt along the face, and the cladding's seams on the gable end
  const ridge = [];
  for (let x = 20; x < L - 10; x += 28) ridge.push(seg(P(x, D / 2, H + R + 0.4), P(x + 12, D / 2, H + R + 0.4)));
  const seams = [];
  for (let y = 10; y < D; y += 10) seams.push(seg(P(L, y, 1.5), P(L, y, H - 2)));
  mk("path", { class: "nf lo", d: ridge.join("") + seams.join("") + seg(P(2, D + 0.2, H - 4), P(L - 2, D + 0.2, H - 4)) }, g);

  const docks = [];
  for (let i = 0; i < N; i++) {
    const x0 = X0 + i * GAP, x1 = x0 + DW;
    const frame = mk("path", { class: "nf lo", d: onFace(P, x0, x1, 0.8, DH, 1) }, g);
    const shut = mk("path", {}, g), slats = mk("path", { class: "nf lo" }, g);
    const can = solid(g);
    const [cr, ci] = rings(x0 - 2, D, x1 + 2, D + 6, 1.2, 0.8);
    put(can, prism(P, front, cr, ci, DH + 1.5, DH + 2.6));
    const bump = mk("path", { class: "nf lo", d: seg(P(x0 + 1, D + 0.2, 1.4), P(x0 + 1, D + 0.2, 4)) + seg(P(x1 - 1, D + 0.2, 1.4), P(x1 - 1, D + 0.2, 4)) }, g);
    docks.push({ x0, x1, frame, shut, slats, can, bump, tw: tween(REST[i]), drawn: NaN });
  }
  function draw(dk, o) {
    if (o === dk.drawn) return;
    dk.drawn = o;
    const zb = Math.min(DH - 1.2, 0.8 + o * (DH - 0.8));
    dk.shut.setAttribute("d", onFace(P, dk.x0 + 0.6, dk.x1 - 0.6, zb, DH - 0.4, 0.8));
    const s = [];
    for (let z = zb + 2.2; z < DH - 1; z += 2.2) s.push(seg(P(dk.x0 + 1.4, D + 0.3, z), P(dk.x1 - 1.4, D + 0.3, z)));
    dk.slats.setAttribute("d", s.join(""));
  }

  // hit: the rest centres of the doorways on screen; the wall never moves
  const centres = docks.map((dk) => P((dk.x0 + dk.x1) / 2, D, DH / 2));
  const hit = ([x, y]) => {
    let best = -1, bd = 26;
    centres.forEach((c, i) => { const d = Math.hypot(x - c[0], y - c[1]); if (d < bd) { bd = d; best = i; } });
    return best;
  };

  const B = register(stage, (_dt, now) => {
    let moving = false;
    docks.forEach((dk) => { draw(dk, tval(dk.tw, now)); if (!tdone(dk.tw, now)) moving = true; });
    return moving;
  });
  bag.add(B.unregister);

  let act = -2;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act >= 0 ? act : 3;
    act = a;
    docks.forEach((dk, i) => {
      tset(dk.tw, a < 0 ? REST[i] : FALL[Math.abs(i - a)], now, Math.abs(i - from) * stag);
      dk.can.sil.classList.toggle("hi", a < 0 ? i === 3 : i === a);
    });
    read.textContent = a < 0 ? "rest" : `dock ${a + 1}`;
    B.wake();
  }
  setActive(-1);

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "warehouse",
  means: "A steel warehouse with six loading docks: the shutter under the pointer rolls up, and its neighbours open less.",
  rules: [1, 2, 5, 8],
  range: [0, 45, 90],
  tour: [[102, 151], [234, 217], [180, 190], null],
  mount,
});
