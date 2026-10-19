/**
 * Retail: a two-storey mall block with a glazed shopfront and a front canopy
 * of five panels, hinged at the wall. The pointer picks a panel; it tilts up
 * like an awning being raised, and the panels beside it rise less, staggered
 * outwards. At rest the panels sit at slightly different angles and the
 * entrance panel, in the middle, is the bright mark. The slider is the tilt,
 * in degrees.
 */
const {
  Cam, facing, fillet, fit, hull, poly, proj, prism, rings, seg, rad,
  tween, tset, tval, tdone, mk, put, solid, pointer, register, disposer,
} = HL;

const L = 135, D = 56, H = 38, N = 5, PW = L / N, DEP = 10, ZH = 17, STEP = 45;
const REST = [4, 0, 9, 2, 6], MID = 2, FALL = [1, 0.42, 0.16, 0.05, 0.02];

const shrink = (pts, b) => {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return pts.map(([x, y]) => { const d = Math.hypot(x - cx, y - cy) || 1; return [x - ((x - cx) / d) * b, y - ((y - cy) / d) * b]; });
};
/** A convex profile [[y, z]…], rounded, run along x from s0 to s1. */
function extX(P, prof, s0, s1, r) {
  const pr = fillet(prof, prof.map(() => r), 3);
  const at = (s) => pr.map(([a, z]) => P(s, a, z));
  const near = at(s1);
  return { sil: poly(hull(near.concat(at(s0)))), crease: poly(shrink(near, 1.1)) };
}
/** A canopy panel tilted up by th degrees from the wall at height ZH. */
const panel = (th) => {
  const c = Math.cos(rad(th)), s = Math.sin(rad(th)), t = 1.6;
  return [[D, ZH], [D + DEP * c, ZH + DEP * s], [D + DEP * c - t * s, ZH + DEP * s + t * c], [D, ZH + t]];
};

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let tilt = value;
  const C = Cam(45, 0.5, 1.78);
  fit(C, [[-8, -8, -3], [L + 8, D + 22, -3], [L + 8, -8, -3], [-8, D + 22, -3], [L / 2, D / 2, H + 7], [0, D + 6, ZH + 12]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  const [pr, pi] = rings(-8, -8, L + 8, D + 22, 6, 1.6);
  put(solid(g), prism(P, front, pr, pi, -3, 0));
  const [br, bi] = rings(0, 0, L, D, 2.4, 1.2);
  put(solid(g), prism(P, front, br, bi, 0, H));
  // rooftop plant, a blank fascia band, and the shopfront's mullions on the front face
  const [ur, ui] = rings(18, 12, 44, 30, 1.6, 0.8);
  put(solid(g), prism(P, front, ur, ui, H, H + 6));
  const f = (x, z) => P(x, D + 0.2, z);
  const lines = [seg(f(3, ZH + 6), f(L - 3, ZH + 6)), seg(f(3, H - 6), f(L - 3, H - 6))];
  for (let x = 9; x < L - 3; x += 9) lines.push(seg(f(x, 1.5), f(x, ZH - 1.5)), seg(f(x, ZH + 6), f(x, H - 6)));
  lines.push(seg(f(3, 1.5), f(L - 3, 1.5)));
  for (let y = 8; y < D; y += 10) lines.push(seg(P(L, y, ZH + 6), P(L, y, H - 6)));
  mk("path", { class: "nf lo", d: lines.join("") }, g);
  // the entrance doors, under the middle panel
  const dx = MID * PW + PW / 2;
  mk("path", { class: "nf", d: poly([f(dx - 8, 0.4), f(dx + 8, 0.4), f(dx + 8, ZH - 2), f(dx - 8, ZH - 2)]) + seg(f(dx, 0.4), f(dx, ZH - 2)) }, g);

  const panels = [];
  for (let i = 0; i < N; i++) panels.push({ el: solid(g), tw: tween(REST[i]), drawn: NaN });
  function draw(i, th) {
    const p = panels[i];
    if (th === p.drawn) return;
    p.drawn = th;
    put(p.el, extX(P, panel(th), i * PW + 0.6, (i + 1) * PW - 0.6, 0.6));
  }

  // hit: the rest tips of the panels on screen, which never move
  const tips = panels.map((_, i) => P((i + 0.5) * PW, D + DEP * 0.6, ZH));
  const hit = ([x, y]) => {
    let best = -1, bd = 30;
    tips.forEach((c, i) => { const d = Math.hypot(x - c[0], y - c[1]); if (d < bd) { bd = d; best = i; } });
    return best;
  };

  const B = register(stage, (_dt, now) => {
    let moving = false;
    panels.forEach((p, i) => { draw(i, tval(p.tw, now)); if (!tdone(p.tw, now)) moving = true; });
    return moving;
  });
  bag.add(B.unregister);

  let act = -2;
  function setActive(a, force) {
    if (a === act && !force) return;
    const now = performance.now(), from = a >= 0 ? a : act >= 0 ? act : MID;
    act = a;
    panels.forEach((p, i) => {
      tset(p.tw, a < 0 ? REST[i] : tilt * FALL[Math.abs(i - a)], now, Math.abs(i - from) * STEP);
      p.el.sil.classList.toggle("hi", a < 0 ? i === MID : i === a);
    });
    read.textContent = a < 0 ? "rest" : `bay ${a + 1}`;
    B.wake();
  }
  setActive(-1);

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { tilt = v; if (act >= 0) setActive(act, true); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "retail",
  means: "A mall block with a front canopy: the panel under the pointer tilts up like an awning, its neighbours less.",
  rules: [1, 2, 5, 9],
  range: [20, 38, 56],
  tour: [[94, 119], [238, 189], [167, 153], null],
  mount,
});
