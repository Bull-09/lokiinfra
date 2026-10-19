/**
 * Hero: an industrial campus under construction. A sawtooth factory shed, a
 * G+3 admin block whose top floor is still columns and a slab, a laydown yard
 * of stacked precast, and a tower crane among them carrying a load. The
 * pointer picks the shed, the admin block or the yard; the crane slews to it,
 * runs its trolley out and lowers the load over it, one move after another.
 * At rest the jib swings between them with the load high, and the crane is
 * the bright mark. The slider is how far above its target the load stops.
 */
const {
  Cam, facing, fillet, fit, hull, poly, proj, prism, rings, seg, rad,
  tween, tset, tval, tdone, mk, put, solid, pointer, register, disposer,
} = HL;

const MX = 92, MY = 62, MZ = 84, NAMES = ["shed", "admin", "yard"];
// each target: x, y, the height of its top, and how far the hook may reach in
const TARGETS = [[40, 22, 29], [116, 17, 29], [34, 74, 9]];
const REST = { a: -100, r: 40, z: 64 };

const shrink = (pts, b) => {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return pts.map(([x, y]) => { const d = Math.hypot(x - cx, y - cy) || 1; return [x - ((x - cx) / d) * b, y - ((y - cy) / d) * b]; });
};
/** A ring turned by a degrees about (cx, cy), normals and all. */
const turn = (ring, a, cx, cy) => {
  const c = Math.cos(rad(a)), s = Math.sin(rad(a));
  return ring.map((q) => ({ ...q, u: cx + q.u * c - q.v * s, v: cy + q.u * s + q.v * c, nu: q.nu * c - q.nv * s, nv: q.nu * s + q.nv * c }));
};

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let gap = value;
  const C = Cam(45, 0.5, 1.5);
  fit(C, [[-8, -8, -3], [146, 96, -3], [146, -8, -3], [-8, 96, -3], [MX, MY, MZ + 10], [MX - 60, MY - 10, MZ]], 200, 170);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);
  const box = (x0, y0, x1, y1, z0, z1, r = 2, b = 1) => { const [o, i] = rings(x0, y0, x1, y1, r, b); return prism(P, front, o, i, z0, z1); };

  put(solid(g), box(-8, -8, 146, 96, -3, 0, 6, 1.6));
  // the shed: walls, then four sawtooth bays along x, each glazed on its upright face
  const shed = solid(g);
  put(shed, box(0, 0, 80, 44, 0, 17, 2.2, 1.1));
  const glaze = [];
  for (let i = 0; i < 4; i++) {
    const prof = fillet([[i * 20, 17], [(i + 1) * 20, 17], [(i + 1) * 20, 28]], [0.9, 0.9, 0.9], 3);
    const near = prof.map(([x, z]) => P(x, 44, z)), far = prof.map(([x, z]) => P(x, 0, z));
    put(solid(g), { sil: poly(hull(near.concat(far))), crease: poly(shrink(near, 1.2)) });
    for (let y = 6; y < 44; y += 8) glaze.push(seg(P((i + 1) * 20, y, 19), P((i + 1) * 20, y, 26)));
  }
  glaze.push(poly([P(12, 44, 0), P(26, 44, 0), P(26, 44, 11), P(12, 44, 11)]));
  mk("path", { class: "nf lo", d: glaze.join("") }, g);

  // the admin block: three storeys built, then four columns and the roof slab of the fourth
  const admin = solid(g);
  put(admin, box(98, 0, 134, 34, 0, 21, 2, 1));
  const bands = [];
  for (const z of [7, 14]) bands.push(seg(P(100, 34, z), P(132, 34, z)), seg(P(134, 2, z), P(134, 32, z)));
  for (const z of [2.5, 9.5, 16.5]) for (let x = 102; x < 131; x += 6) bands.push(seg(P(x, 34, z), P(x + 3, 34, z)));
  mk("path", { class: "nf lo", d: bands.join("") }, g);
  for (const [x, y] of [[100, 2], [130, 2], [100, 30], [130, 30]]) put(solid(g), box(x, y, x + 2.4, y + 2.4, 21, 27, 0.8, 0.3));
  const slab = solid(g);
  put(slab, box(97, -1, 135, 35, 27, 29, 2, 0.9));

  // the yard: a stack of precast planks, each laid a little askew of the last
  const yard = [];
  [[0, 0], [1.5, -1], [-1, 1.2]].forEach(([dx, dy], k) => { const el = solid(g); put(el, box(22 + dx, 66 + dy, 46 + dx, 82 + dy, k * 2.6, k * 2.6 + 2.2, 1.2, 0.6)); yard.push(el); });

  // the load, its slings and the cable, all hung from the trolley; painted behind the mast
  const cable = mk("path", { class: "nf" }, g), load = solid(g);
  const mast = solid(g);
  put(mast, box(MX - 2.5, MY - 2.5, MX + 2.5, MY + 2.5, 0, MZ, 1, 0.5));
  const lattice = [];
  for (let z = 6; z < MZ - 2; z += 6) lattice.push(seg(P(MX + 2.5, MY - 2, z), P(MX + 2.5, MY + 2, z + 6)), seg(P(MX - 2, MY + 2.5, z), P(MX + 2, MY + 2.5, z + 6)));
  mk("path", { class: "nf lo", d: lattice.join("") }, g);
  put(solid(g), box(MX - 3.5, MY - 3.5, MX + 3.5, MY + 3.5, MZ - 7, MZ - 1, 1.2, 0.5));
  const cw = solid(g), jib = solid(g), apex = solid(g), ties = mk("path", { class: "nf lo" }, g);
  const [jr, ji] = rings(-22, -1.6, 66, 1.6, 1.2, 0.5), [wr, wi] = rings(-22, -3, -13, 3, 1.2, 0.5);
  const [ar, ai] = rings(MX - 1.6, MY - 1.6, MX + 1.6, MY + 1.6, 0.8, 0.3);
  const crane = [mast, jib, cw, apex];

  const tw = { a: tween(REST.a), r: tween(REST.r), z: tween(REST.z) };
  let drawn = "";
  function draw(a, r, z) {
    const key = [a, r, z].map((v) => v.toFixed(3)).join();
    if (key === drawn) return;
    drawn = key;
    put(jib, prism(P, front, turn(jr, a, MX, MY), turn(ji, a, MX, MY), MZ, MZ + 2.6));
    put(cw, prism(P, front, turn(wr, a, MX, MY), turn(wi, a, MX, MY), MZ - 3, MZ + 2));
    put(apex, prism(P, front, ar, ai, MZ + 2.6, MZ + 11));
    const c = Math.cos(rad(a)), s = Math.sin(rad(a)), at = (u) => [MX + u * c, MY + u * s];
    const [tx, ty] = at(66), [kx, ky] = at(-22), [px, py] = at(r);
    ties.setAttribute("d", seg(P(MX, MY, MZ + 11), P(tx, ty, MZ + 2.6)) + seg(P(MX, MY, MZ + 11), P(kx, ky, MZ + 2)));
    put(load, box(px - 6, py - 4, px + 6, py + 4, z, z + 3.2, 1, 0.5));
    cable.setAttribute("d", seg(P(px, py, MZ), P(px, py, z + 9)) + seg(P(px, py, z + 9), P(px - 5, py, z + 3.2)) + seg(P(px, py, z + 9), P(px + 5, py, z + 3.2)));
  }

  // hit: the rest middles of the three targets on screen; they never move
  const mids = TARGETS.map(([x, y, h]) => P(x, y, h * 0.7));
  const hit = ([x, y]) => {
    let best = -1, bd = 48;
    mids.forEach((m, i) => { const d = Math.hypot(x - m[0], y - m[1]); if (d < bd) { bd = d; best = i; } });
    return best;
  };

  const B = register(stage, (_dt, now) => {
    draw(tval(tw.a, now), tval(tw.r, now), tval(tw.z, now));
    return !tdone(tw.a, now) || !tdone(tw.r, now) || !tdone(tw.z, now);
  });
  bag.add(B.unregister);

  let act = -2;
  function setActive(i, force) {
    if (i === act && !force) return;
    act = i;
    const now = performance.now();
    if (i < 0) { tset(tw.a, REST.a, now, 0); tset(tw.r, REST.r, now, 0); tset(tw.z, REST.z, now, 0); }
    else {
      const [x, y, h] = TARGETS[i];
      let a = (Math.atan2(y - MY, x - MX) * 180) / Math.PI;
      const cur = tval(tw.a, now);
      a += 360 * Math.round((cur - a) / 360);
      tset(tw.a, a, now, 0); tset(tw.r, Math.min(64, Math.hypot(x - MX, y - MY)), now, 120); tset(tw.z, h + gap, now, 300);
    }
    crane.forEach((el) => el.sil.classList.toggle("hi", i < 0));
    [shed, admin, yard[2]].forEach((el, k) => el.sil.classList.toggle("hi", k === i));
    slab.sil.classList.toggle("hi", i === 1);
    read.textContent = i < 0 ? "rest" : NAMES[i];
    B.wake();
  }
  setActive(-1);

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { gap = v; if (act >= 0) setActive(act, true); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "hero",
  means: "A campus under construction: the crane slews to the building under the pointer and lowers its load over it.",
  rules: [1, 4, 5, 8],
  range: [4, 12, 22],
  tour: [[220, 140], [280, 180], [160, 180], null],
  mount,
});
