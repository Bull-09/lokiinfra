/**
 * Infra: a two-lane road running away across the site, with an overbridge on
 * two piers crossing it and lamp posts along the near kerb. The pointer is put
 * on the ground and read as a chainage along the road; a convoy of three cars
 * drives there, each on its own spring, the lead one bright. At rest the cars
 * stand spread along the road and the bridge deck is the bright mark. The
 * slider is the gap between the cars, in world units.
 */
const {
  Cam, facing, fit, proj, prism, rings, seg, clamp, unproj,
  spring, stepS, mk, put, solid, pointer, register, disposer,
} = HL;

const X0 = -56, X1 = 150, RW = 24, BX0 = 40, BX1 = 54, BZ = 18, REST = [92, 14, -30];
const CL = 15, CW = 8.5;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let gap = value;
  const C = Cam(45, 0.5, 1.62);
  fit(C, [[X0, -44, -3], [X1, RW + 12, -3], [X1, -44, -3], [X0, RW + 12, -3], [BX0, -44, BZ + 4], [BX1, 74, BZ + 4]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);
  const box = (x0, y0, x1, y1, z0, z1, r = 1.2, b = 0.6) => { const [o, i] = rings(x0, y0, x1, y1, r, b); return prism(P, front, o, i, z0, z1); };

  put(solid(g), box(X0, -12, X1, RW + 12, -3, 0, 6, 1.6));
  // the carriageway, its kerbs, and the lane marks down the middle
  put(solid(g), box(X0 + 4, -2, X1 - 4, 0, 0, 0.9, 0.8, 0.3));
  put(solid(g), box(X0 + 4, 0, X1 - 4, RW, 0, 0.3, 1, 0.5));
  const marks = [];
  for (let x = X0 + 10; x < X1 - 12; x += 14) marks.push(seg(P(x, RW / 2, 0.3), P(x + 7, RW / 2, 0.3)));
  mk("path", { class: "nf lo", d: marks.join("") }, g);
  // the far pier, behind the road
  const pier = (y0, y1) => put(solid(g), box(BX0 + 3, y0, BX1 - 3, y1, 0, BZ, 1.6, 0.7));
  pier(-12, -6);

  // the cars: a body and a narrower cabin, set back from the bonnet
  const cars = REST.map((x, k) => ({ k, sp: spring(x, { eps: 0.03 }), body: solid(g), cab: solid(g), drawn: NaN }));
  function drawCar(c) {
    const x = c.sp.x;
    if (x === c.drawn) return;
    c.drawn = x;
    const y = RW * 0.27;
    put(c.body, box(x, y - CW / 2, x + CL, y + CW / 2, 0.8, 4.6, 2, 0.8));
    put(c.cab, box(x + 3, y - CW / 2 + 1, x + 10, y + CW / 2 - 1, 4.6, 8, 1.8, 0.7));
  }

  // the near pier, the lamp posts on the near kerb, then the deck and its parapets over everything
  pier(RW + 6, RW + 12);
  const lamps = [];
  for (const x of [X0 + 14, X0 + 58, BX1 + 28, BX1 + 72]) lamps.push(box(x, RW + 2, x + 1.6, RW + 3.6, 0, 13, 0.8, 0.3));
  lamps.forEach((l) => put(solid(g), l));
  mk("path", { class: "nf", d: [X0 + 14, X0 + 58, BX1 + 28, BX1 + 72].map((x) => seg(P(x + 0.8, RW + 2.8, 13), P(x + 0.8, RW - 2, 13))).join("") }, g);
  const deck = solid(g);
  put(deck, box(BX0, -44, BX1, 74, BZ, BZ + 2.4, 2, 0.9));
  mk("path", { class: "nf lo", d: seg(P(BX1 - 1.5, -42, BZ + 3.6), P(BX1 - 1.5, 72, BZ + 3.6)) + seg(P(BX1 - 1.5, 72, BZ + 2.4), P(BX1 - 1.5, 72, BZ + 3.6)) }, g);

  const B = register(stage, (dt) => {
    let m = false;
    for (const c of cars) { if (stepS(c.sp, dt)) m = true; drawCar(c); }
    return m;
  });
  bag.add(B.unregister);

  // hit: the pointer on the ground plane, which never moves, read as a chainage along the road
  let lead = null;
  function retarget() {
    cars.forEach((c, k) => { c.sp.t = lead === null ? REST[k] : clamp(lead - k * gap, X0 + 6, X1 - 6 - CL); });
    cars[0].body.sil.classList.toggle("hi", lead !== null);
    cars[0].cab.sil.classList.toggle("hi", lead !== null);
    deck.sil.classList.toggle("hi", lead === null);
    if (lead === null) read.textContent = "rest";
    else { const m = Math.round((cars[0].sp.t - X0) * 4); read.textContent = `ch ${Math.floor(m / 1000)}+${String(m % 1000).padStart(3, "0")}`; }
    B.wake();
  }
  retarget();

  bag.add(pointer(stage, {
    move: (p) => { const [x, y] = unproj(C, p[0], p[1], 0); lead = y > -30 && y < RW + 30 ? clamp(x - CL / 2, X0 + 6, X1 - 6 - CL) : null; retarget(); },
    leave: () => { lead = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { gap = v; if (lead !== null) retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "infra",
  means: "A road under an overbridge: a convoy of three cars drives to the chainage under the pointer, each on its own spring.",
  rules: [1, 3, 5, 8],
  range: [14, 20, 30],
  tour: [[90, 125], [270, 215], [190, 175], null],
  mount,
});
