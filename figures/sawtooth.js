/**
 * Sawtooth: a factory shed on a slab, five bays under a sawtooth roof, with a
 * stack behind. At rest one roof module hangs above its bay on dashed drops,
 * being set in place. The bay under the pointer has its module lifted; its
 * neighbours lift less, staggered outwards from it on the 700ms lift curve.
 * The slider is the lift, in world units.
 *
 * The pattern: one of many (Riffle's), on a row picked by the rest centres'
 * screen x, so a module rising from under the pointer cannot flip the choice.
 */
const {
  Cam, circ, extremes, facing, fit, hull, open, poly, prism, proj, rings, ringAt, rrect, run, seg,
  tdone, tset, tval, tween, disposer, mk, pointer, put, register, solid,
} = HL;

const N = 5, BW = 20, L = N * BW, D = 56, WH = 26, TH = 13, TS = 3.4, CH = 74;
const FALL = [1, 0.42, 0.14, 0, 0], REST_BAY = 3, REST_K = 0.75, STEP = 45, LMAX = 32;

/** A wedge: full bay at its foot, a thin strip along its high (+x) edge on top. */
function tooth(P, i, z0) {
  const x0 = i * BW + 0.6, x1 = (i + 1) * BW - 0.6;
  const foot = rrect(x0, 0.6, x1, D - 0.6, 2.2, 4);
  const top = rrect(x1 - TS, 1.2, x1, D - 1.2, 1.2, 4);
  const inner = rrect(x1 - TS + 0.8, 2, x1 - 0.8, D - 2, 0.6, 4);
  return { foot, top, inner, x1 };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let lift = value;

  const C = Cam(45, 0.5, 1.9);
  fit(C, [[-26, -10, -4], [L + 10, -10, -4], [-26, D + 10, -4], [L + 10, D + 10, -4], [-12, 14, CH], [0, 0, WH + TH + LMAX], [L, 0, WH + TH + LMAX]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  // back to front: slab, stack, shed walls, doors on the near long face, then the bays from the far end
  const [sr, si] = rings(-26, -10, L + 10, D + 10, 6, 2.2);
  put(solid(g), prism(P, front, sr, si, -4, 0));
  const stack = circ(4.2, 14).map((q) => ({ ...q, u: q.u - 12, v: q.v + 14 }));
  const stackIn = circ(3.2, 14).map((q) => ({ ...q, u: q.u - 12, v: q.v + 14 }));
  put(solid(g), prism(P, front, stack, stackIn, 0, CH));
  const [wr, wi] = rings(0, 0, L, D, 3, 1.4);
  put(solid(g), prism(P, front, wr, wi, 0, WH));
  const onFace = (ring) => ring.map((q) => P(q.u, D, q.v));
  for (const dx of [12, 58]) {
    mk("path", { d: poly(onFace(rrect(dx, 0, dx + 18, 17, 1.4, 4))), class: "nf" }, g);
    mk("path", { d: [5, 9, 13].map((v) => seg(P(dx + 2, D, v), P(dx + 16, D, v))).join(""), class: "nf lo" }, g);
  }

  const bays = [];
  for (let i = 0; i < N; i++) {
    const grp = mk("g", {}, g);
    const drop = mk("path", { class: "dash nf" }, grp);
    const el = solid(grp);
    const glaze = mk("path", { class: "nf lo" }, grp);
    const t = tooth(P, i, WH);
    const z = i === REST_BAY ? REST_K * lift : 0;
    bays.push({ ...t, drop, el, glaze, z: tween(z), drawn: NaN });
  }

  function draw(b, h) {
    if (h === b.drawn) return;
    b.drawn = h;
    const z0 = WH + h, z1 = z0 + TH;
    const sil = poly(hull(ringAt(P, b.foot, z0).concat(ringAt(P, b.top, z1))));
    put(b.el, { sil, crease: open(ringAt(P, run(b.inner, front), z1)) });
    b.glaze.setAttribute("d", seg(P(b.x1, 3, z0 + TH * 0.5), P(b.x1, D - 3, z0 + TH * 0.5)));
    b.drop.setAttribute("d", h < 1 ? "" : extremes(P, b.foot).map((q) => seg(P(q.u, q.v, WH), P(q.u, q.v, z0))).join(""));
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    for (const b of bays) { draw(b, tval(b.z, now)); if (!tdone(b.z, now)) moving = true; }
    return moving;
  });
  bag.add(B.unregister);

  // hit: the rest centres' screen x, inside the box the shed can ever cover. Neither moves.
  const cx = bays.map((_, i) => P((i + 0.5) * BW, D / 2, WH)[0]);
  const box = [[0, 0, 0], [L, 0, 0], [0, D, 0], [L, D, 0], [0, 0, WH + TH + LMAX], [L, D, WH + TH + LMAX], [L, 0, WH + TH + LMAX], [0, D, WH + TH + LMAX]].map((p) => P(...p));
  const bx0 = Math.min(...box.map((p) => p[0])), bx1 = Math.max(...box.map((p) => p[0]));
  const by0 = Math.min(...box.map((p) => p[1])), by1 = Math.max(...box.map((p) => p[1]));
  function hit([x, y]) {
    if (x < bx0 || x > bx1 || y < by0 || y > by1) return -1;
    let best = 0;
    cx.forEach((c, i) => { if (Math.abs(c - x) < Math.abs(cx[best] - x)) best = i; });
    return best;
  }

  let act = -1;
  function aim(a, now, from) {
    bays.forEach((b, i) => {
      const k = a < 0 ? (i === REST_BAY ? REST_K : 0) : FALL[Math.min(Math.abs(i - a), FALL.length - 1)];
      tset(b.z, k * lift, now, Math.abs(i - from) * STEP);
      b.el.sil.classList.toggle("hi", i === (a < 0 ? REST_BAY : a));
    });
  }
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act >= 0 ? act : REST_BAY;
    act = a;
    aim(a, now, from);
    read.textContent = a < 0 ? "rest" : `bay ${a + 1}`;
    B.wake();
  }
  aim(-1, performance.now(), REST_BAY);
  read.textContent = "rest";

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { lift = v; aim(act, performance.now(), act >= 0 ? act : REST_BAY); B.wake(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "sawtooth",
  means: "A factory under construction: the roof module over the bay under the pointer lifts, and its neighbours rise less.",
  rules: [1, 2, 5, 6],
  range: [10, 22, 32],
  tour: [[184, 147], [264, 187], [157, 134], null],
  mount,
});
