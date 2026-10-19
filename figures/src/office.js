/**
 * Office: a glass corporate tower of twelve floors between two low wings,
 * with a plant room on the roof. The pointer's height over the tower picks a
 * floor; it slides out of the stack toward the viewer, as a floor plate drawn
 * out of a model, and the floors beside it follow less, staggered outwards.
 * At rest floor 9 sits a little out and is the bright mark. The slider is the
 * pull, in world units.
 */
const {
  Cam, facing, fit, proj, prism, rings, seg,
  tween, tset, tval, tdone, mk, put, solid, pointer, register, disposer,
} = HL;

const W = 34, NF = 12, FH = 6.4, TH = NF * FH, REST_A = 8, STEP = 40;
const FALL = [1, 0.4, 0.14, 0.04, 0, 0, 0, 0, 0, 0, 0, 0];
const rest = (i) => (i === REST_A ? 5 : 0);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let pull = value;
  const C = Cam(45, 0.5, 2.05);
  fit(C, [[-46, -4, -3], [W + 46, W + 4, -3], [W / 2, W / 2, TH + 9], [0, W + 26, 0], [W + 46, -4, -3]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  const [pr, pi] = rings(-46, -6, W + 46, W + 8, 6, 1.6);
  put(solid(g), prism(P, front, pr, pi, -3, 0));
  /** A low wing: its block, and two ribbons of glazing along its visible faces. */
  function wing(x0, x1) {
    const y0 = 5, y1 = W - 5, h = 15;
    const [r, i] = rings(x0, y0, x1, y1, 2, 1);
    put(solid(g), prism(P, front, r, i, 0, h));
    const d = [4.5, 9.5].map((z) => seg(P(x0 + 1.5, y1, z), P(x1 - 1.5, y1, z)) + seg(P(x1, y0 + 1.5, z), P(x1, y1 - 1.5, z))).join("");
    mk("path", { class: "nf lo", d }, g);
  }
  wing(-44, -3);

  // the floors, from the ground up, so each one covers the top of the one below
  const floors = [];
  for (let i = 0; i < NF; i++) {
    const el = solid(g), grid = mk("path", { class: "nf lo" }, g);
    floors.push({ el, grid, tw: tween(rest(i)), drawn: NaN });
  }
  function draw(i, dy) {
    const f = floors[i];
    if (dy === f.drawn) return;
    f.drawn = dy;
    const z0 = i * FH, z1 = z0 + FH - 0.7;
    const [r, inr] = rings(0, dy, W, W + dy, 2.2, 1);
    put(f.el, prism(P, front, r, inr, z0, z1));
    const d = [];
    for (let u = 5.7; u < W - 2; u += 5.7) {
      d.push(seg(P(u, W + dy, z0 + 0.8), P(u, W + dy, z1 - 0.6)));
      d.push(seg(P(W, u + dy, z0 + 0.8), P(W, u + dy, z1 - 0.6)));
    }
    f.grid.setAttribute("d", d.join(""));
  }
  // the plant room on the roof, and its louvres
  const [cr, ci] = rings(9, 9, W - 9, W - 9, 2, 0.9);
  put(solid(g), prism(P, front, cr, ci, TH, TH + 7));
  mk("path", { class: "nf lo", d: [2.5, 4.5].map((z) => seg(P(10.5, W - 9, TH + z), P(W - 10.5, W - 9, TH + z))).join("") }, g);
  wing(W + 3, W + 44);

  // hit: the rest middles of the floors' front faces, on screen; they never move
  const mids = floors.map((_, i) => P(W, W, i * FH + FH / 2));
  const hit = ([x, y]) => {
    if (Math.abs(x - mids[0][0]) > 64) return -1;
    let best = -1, bd = 7;
    mids.forEach((m, i) => { const d = Math.abs(y - m[1]); if (d < bd) { bd = d; best = i; } });
    return best;
  };

  const B = register(stage, (_dt, now) => {
    let moving = false;
    floors.forEach((f, i) => { draw(i, tval(f.tw, now)); if (!tdone(f.tw, now)) moving = true; });
    return moving;
  });
  bag.add(B.unregister);

  let act = -2;
  function setActive(a, force) {
    if (a === act && !force) return;
    const now = performance.now(), from = a >= 0 ? a : act >= 0 ? act : REST_A;
    act = a;
    floors.forEach((f, i) => {
      tset(f.tw, a < 0 ? rest(i) : pull * FALL[Math.abs(i - a)], now, Math.abs(i - from) * STEP);
      f.el.sil.classList.toggle("hi", a < 0 ? i === REST_A : i === a);
    });
    read.textContent = a < 0 ? "rest" : `floor ${a + 1}`;
    B.wake();
  }
  setActive(-1);

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { pull = v; if (act >= 0) setActive(act, true); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "office",
  means: "A glass office tower between low wings: the floor under the pointer slides out of the stack, its neighbours less.",
  rules: [1, 2, 3, 5],
  range: [7, 13, 19],
  tour: [[180, 100], [180, 220], [180, 150], null],
  mount,
});
