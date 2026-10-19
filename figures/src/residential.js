/**
 * Residential: two apartment towers of different heights on one podium, each
 * with a balcony slab at every floor of its front face. The pointer's place
 * over a tower sets a height; the balconies near it reach out on their own
 * springs, farther the closer they are, and the rest settle back. At rest the
 * balconies keep a staggered rhythm and the tall tower's crown is the bright
 * mark. The slider is the reach's radius, in floors.
 */
const {
  Cam, facing, fit, proj, prism, rings, seg, clamp,
  spring, stepS, mk, put, solid, pointer, register, disposer,
} = HL;

const FH = 5.6, EMAX = 11;
// each tower: x0, y0, size, floors
const TOWERS = [[0, 0, 30, 16], [46, 14, 28, 10]];
const falloff = (u) => (u <= 0 ? 1 : u <= 0.42 ? 1 - (u / 0.42) * 0.69 : u <= 1 ? 0.31 - ((u - 0.42) / 0.58) * 0.22 : 0.09);
const restE = (t, i) => 2.4 + 1.6 * Math.abs(Math.sin(i * 1.15 + t * 2));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let R = value * FH;
  const C = Cam(45, 0.5, 1.95);
  fit(C, [[-10, -8, -3], [84, 58, -3], [84, -8, -3], [-10, 58, -3], [15, 15, 16 * FH + 6], [0, 30 + EMAX, 0]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  const [pr, pi] = rings(-10, -8, 84, 58, 6, 1.6);
  put(solid(g), prism(P, front, pr, pi, -3, 0));
  const [dr, di] = rings(-4, -2, 80, 50, 4, 1.4);
  put(solid(g), prism(P, front, dr, di, 0, 4));

  const towers = TOWERS.map(([x0, y0, w, n], t) => {
    const x1 = x0 + w, y1 = y0 + w, top = 4 + n * FH;
    const [r, i] = rings(x0, y0, x1, y1, 2.4, 1.2);
    const body = solid(g);
    put(body, prism(P, front, r, i, 4, top));
    const d = [];
    for (let k = 1; k < n; k++) {
      const z = 4 + k * FH;
      d.push(seg(P(x1, y0 + 2, z), P(x1, y1 - 2, z)));
      for (let y = y0 + 4; y < y1 - 3; y += 7) d.push(seg(P(x1, y, z - FH + 1.6), P(x1, y, z - 1.4)));
    }
    mk("path", { class: "nf lo", d: d.join("") }, g);
    // the crown: a parapet ring a little inside the roof
    const [cr, ci] = rings(x0 + 3, y0 + 3, x1 - 3, y1 - 3, 1.8, 0.8);
    const crown = solid(g);
    put(crown, prism(P, front, cr, ci, top, top + 3));
    const balc = [];
    for (let k = 0; k < n; k++) {
      const e0 = restE(t, k);
      balc.push({ k, z: 4 + k * FH + 0.4, e0, sp: spring(e0, { eps: 0.03 }), el: solid(g), drawn: NaN });
    }
    return { t, x0, x1, y1, n, top, crown, balc, sx: P(x1, y1, 4)[0] };
  });

  function drawB(tw, b) {
    const e = Math.max(1.6, b.sp.x);
    if (e === b.drawn) return;
    b.drawn = e;
    const [r, i] = rings(tw.x0 + 3, tw.y1, tw.x1 - 3, tw.y1 + e, 0.7, 0.4);
    put(b.el, prism(P, front, r, i, b.z, b.z + 1.1));
  }

  // hit: which tower is under the pointer, by its fixed screen x, and the height on its resting front face
  const zAt = (tw, sy) => {
    const a = P(tw.x0 + 15, tw.y1, 0)[1], b = P(tw.x0 + 15, tw.y1, 10)[1];
    return ((a - sy) / (a - b)) * 10;
  };
  function hit([x, y]) {
    let best = null, bd = 44;
    for (const tw of towers) {
      const d = Math.abs(x - P((tw.x0 + tw.x1) / 2, tw.y1, 0)[0]);
      const z = zAt(tw, y);
      if (d < bd && z > 2 && z < tw.top + 6) { bd = d; best = { tw, z }; }
    }
    return best;
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const tw of towers) for (const b of tw.balc) { if (stepS(b.sp, dt)) m = true; drawB(tw, b); }
    return m;
  });
  bag.add(B.unregister);

  let over = null;
  function retarget() {
    let lit = null;
    for (const tw of towers) for (const b of tw.balc) {
      b.sp.t = over && over.tw === tw ? EMAX * falloff(Math.abs(b.z - over.z) / R) : b.e0;
      b.el.sil.classList.remove("hi");
    }
    if (over) {
      const k = clamp(Math.round((over.z - 4.4) / FH), 0, over.tw.n - 1);
      lit = over.tw.balc[k];
      lit.el.sil.classList.add("hi");
      read.textContent = `T${over.tw.t + 1} · ${String(k + 1).padStart(2, "0")}`;
    } else read.textContent = "rest";
    towers[0].crown.sil.classList.toggle("hi", !lit);
    B.wake();
  }
  retarget();

  bag.add(pointer(stage, {
    move: (p) => { over = hit(p); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { R = v * FH; if (over) retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "residential",
  means: "Two apartment towers: balconies near the pointer's height reach out, and fall back with distance.",
  rules: [1, 3, 5, 8],
  range: [1.5, 3, 5],
  tour: [[160, 80], [220, 200], [150, 190], null],
  mount,
});
