/**
 * Hospital: a main block with a roof block carrying an upright cross, between
 * a short low wing and a long taller one, each banded with storeys. The
 * pointer picks a block; its roof lifts off, as in an exploded drawing, and
 * the blocks beside it lift less, staggered outwards. At rest the cross is the
 * bright mark. The slider is the lift, in world units.
 */
const {
  Cam, facing, fillet, fit, poly, proj, prism, rings, seg,
  tween, tset, tval, tdone, mk, put, solid, pointer, register, disposer,
} = HL;

// each block: x0, x1, y0, y1, height
const BLOCKS = [[-44, -2, 8, 34, 18], [0, 58, 0, 44, 34], [60, 122, 6, 36, 24]];
const NAMES = ["wing A", "main", "wing B"], REST = [0, 5, 1.5], FALL = [1, 0.36, 0.12], STEP = 50, ST = 6;
const CX = 29, CY = 22, CZ = 46;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let lift = value;
  const C = Cam(45, 0.5, 1.72);
  fit(C, [[-52, -6, -3], [130, 52, -3], [130, -6, -3], [-52, 52, -3], [CX, CY, CZ + 18 + 26], [-44, 8, 18 + 26]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  const [pr, pi] = rings(-52, -6, 130, 52, 6, 1.6);
  put(solid(g), prism(P, front, pr, pi, -3, 0));

  const blocks = BLOCKS.map(([x0, x1, y0, y1, h], k) => {
    const [r, i] = rings(x0, y0, x1, y1, 2.4, 1.2);
    put(solid(g), prism(P, front, r, i, 0, h - 2));
    // storey bands and a run of windows on both visible faces
    const d = [];
    for (let z = ST; z < h - 3; z += ST) d.push(seg(P(x0 + 2, y1, z), P(x1 - 2, y1, z)), seg(P(x1, y0 + 2, z), P(x1, y1 - 2, z)));
    for (let z = 2; z < h - 4; z += ST) for (let x = x0 + 5; x < x1 - 4; x += 6) d.push(seg(P(x, y1, z + 1), P(x + 2.4, y1, z + 1)));
    mk("path", { class: "nf lo", d: d.join("") }, g);
    const roof = mk("g", {}, g), slab = solid(roof);
    const [rr, ri] = rings(x0 - 1.5, y0 - 1.5, x1 + 1.5, y1 + 1.5, 3, 1.2);
    return { k, h, rr, ri, roof, slab, tw: tween(REST[k]), drawn: NaN };
  });

  // the main block's roof carries a plant room and the cross: an upright plate with a back edge
  const main = blocks[1], room = solid(main.roof);
  const [mr, mi] = rings(CX - 14, CY - 10, CX + 14, CY + 10, 2, 1);
  const plus = fillet([[-2.5, 0], [2.5, 0], [2.5, 5], [7.5, 5], [7.5, 10], [2.5, 10], [2.5, 15], [-2.5, 15], [-2.5, 10], [-7.5, 10], [-7.5, 5], [-2.5, 5]], new Array(12).fill(0.8), 3);
  const back = mk("path", { class: "lo" }, main.roof), cross = mk("path", { class: "sil" }, main.roof);

  function draw(b, dz) {
    if (dz === b.drawn) return;
    b.drawn = dz;
    put(b.slab, prism(P, front, b.rr, b.ri, b.h - 2 + dz, b.h + dz));
    if (b !== main) return;
    put(room, prism(P, front, mr, mi, b.h + dz, CZ + dz));
    back.setAttribute("d", poly(plus.map(([u, w]) => P(CX + u, CY - 1.2, CZ + dz + w))));
    cross.setAttribute("d", poly(plus.map(([u, w]) => P(CX + u, CY + 1.2, CZ + dz + w))));
  }

  // hit: the rest middles of the roofs on screen; they never move
  const mids = BLOCKS.map(([x0, x1, y0, y1, h]) => P((x0 + x1) / 2, (y0 + y1) / 2, h));
  const hit = ([x, y]) => {
    let best = -1, bd = 46;
    mids.forEach((m, i) => { const d = Math.hypot(x - m[0], y - m[1]); if (d < bd) { bd = d; best = i; } });
    return best;
  };

  const B = register(stage, (_dt, now) => {
    let moving = false;
    blocks.forEach((b) => { draw(b, tval(b.tw, now)); if (!tdone(b.tw, now)) moving = true; });
    return moving;
  });
  bag.add(B.unregister);

  let act = -2;
  function setActive(a, force) {
    if (a === act && !force) return;
    const now = performance.now(), from = a >= 0 ? a : act >= 0 ? act : 1;
    act = a;
    blocks.forEach((b, i) => {
      tset(b.tw, a < 0 ? REST[i] : lift * FALL[Math.abs(i - a)], now, Math.abs(i - from) * STEP);
      b.slab.sil.classList.toggle("hi", i === a);
    });
    cross.classList.toggle("hi", a < 0);
    read.textContent = a < 0 ? "rest" : NAMES[a];
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
  name: "hospital",
  means: "A hospital with a cross on its roof block: the roof of the block under the pointer lifts off, its neighbours less.",
  rules: [1, 2, 4, 5],
  range: [8, 16, 24],
  tour: [[124, 130], [266, 192], [194, 141], null],
  mount,
});
