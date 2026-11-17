// LOKI Infra 3D figures.
// Swaps each line-art figure ([data-model], or an <svg><use href="art.svg#id">) for a lit 3D model
// that turns slowly and can be dragged to rotate. One shared WebGL renderer draws every view
// into its own 2D canvas, so any number of cards costs one GPU context and only visible views render.
// If WebGL is unavailable the original SVG simply stays.
import * as THREE from "./vendor/three.module.min.js";
import { OrbitControls } from "./vendor/OrbitControls.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";
import { buildModel } from "./models.js";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const DPR = Math.min(window.devicePixelRatio || 1, 2);
const tmp = new THREE.Vector3();

/* ---------- find the slots ---------- */
const VIEW_OF = (el) => {
  if (el.closest(".hero-visual")) return { az: -38, el: 24, pad: 0.98, hint: true };
  if (el.id === "plant") return { az: -40, el: 24, pad: 0.96, hint: true };
  if (el.closest(".sector")) return { az: -35, el: 26, pad: 0.96 };
  return { az: -35, el: 26, pad: 0.92 };
};

function modelId(el) {
  if (el.dataset.model) return el.dataset.model;
  const use = el.querySelector("use");
  const href = use && (use.getAttribute("href") || use.getAttribute("xlink:href"));
  const m = href && href.match(/#([\w-]+)/);
  return m ? m[1] : null;
}

const slots = [];
document.querySelectorAll("[data-model], svg.art, .art-box > svg, .thumb > svg, .art-panel > svg, .hero-visual > svg.blueprint, #plant").forEach((el) => {
  if (slots.some((s) => s.el === el)) return;
  const id = el.closest(".hero-visual") ? "hero" : el.id === "plant" ? "factory" : modelId(el);
  if (id) slots.push({ el, id });
});

/* ---------- renderer ---------- */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
} catch (e) {
  renderer = null;
}

if (renderer && slots.length) start();

function start() {
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setScissorTest(true);
  renderer.setClearColor(0x000000, 0);
  let bufW = 0, bufH = 0;
  const ensureBuffer = (w, h) => {
    if (w <= bufW && h <= bufH) return;
    bufW = Math.max(bufW, w); bufH = Math.max(bufH, h);
    renderer.setSize(bufW, bufH, false);
  };

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  /* one scene per model id, shared by every view of it */
  const scenes = new Map();
  function sceneFor(id) {
    if (scenes.has(id)) return scenes.get(id);
    const scene = new THREE.Scene();
    scene.environment = envMap;
    const model = buildModel(id);
    scene.add(model.root);

    const box = new THREE.Box3().setFromObject(model.root);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const R = sphere.radius;

    scene.add(new THREE.HemisphereLight(0xdfe9f3, 0x2a3138, 0.7));
    const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
    sun.position.set(R * 0.9, R * 1.4, R * 0.7).add(sphere.center);
    sun.target.position.copy(sphere.center);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -R; sc.right = sc.top = R; sc.near = 0.1; sc.far = R * 4;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; sun.shadow.radius = 4;
    scene.add(sun, sun.target);
    const fill = new THREE.DirectionalLight(0x9fc0dd, 0.5);
    fill.position.set(-R, R * 0.5, -R * 0.8);
    scene.add(fill);

    // soft contact shadow catcher beyond the plinth
    const catcher = new THREE.Mesh(new THREE.CircleGeometry(R * 1.6, 48), new THREE.ShadowMaterial({ opacity: 0.35 }));
    catcher.rotation.x = -Math.PI / 2; catcher.position.y = -0.86; catcher.receiveShadow = true;
    scene.add(catcher);

    // a sample of real vertices (not the bounding box) so framing hugs the actual building
    const corners = [];
    model.root.updateMatrixWorld(true);
    model.root.traverse((o) => {
      if (!o.isMesh || o.userData.noFit || o.parent.userData.noFit) return;
      const pos = o.geometry.attributes.position, step = Math.max(1, Math.floor(pos.count / 40));
      for (let i = 0; i < pos.count; i += step) corners.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld));
    });
    const entry = { scene, model, center: box.getCenter(new THREE.Vector3()), radius: R, corners, lastT: -1 };
    scenes.set(id, entry);
    return entry;
  }

  /* ---------- views ---------- */
  const views = [];
  for (const { el, id } of slots) {
    const v = VIEW_OF(el);
    const host = el.id === "plant" ? el : el.parentElement;
    const cv = document.createElement("canvas");
    cv.className = "l3d";
    cv.setAttribute("role", "img");
    cv.setAttribute("aria-label", `3D model (${id}). Drag to rotate.`);
    if (el.id === "plant") el.appendChild(cv); else el.insertAdjacentElement("afterend", cv);
    host.classList.add("has-3d");
    if (v.hint) {
      const hint = document.createElement("span");
      hint.className = "l3d-hint";
      hint.textContent = "Drag to rotate";
      host.appendChild(hint);
    }
    const ctx = cv.getContext("2d");
    const S = sceneFor(id);
    const cam = new THREE.PerspectiveCamera(28, 1, 0.5, S.radius * 20);
    const controls = new OrbitControls(cam, cv);
    controls.target.copy(S.center);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.7;
    controls.minPolarAngle = THREE.MathUtils.degToRad(18);
    controls.maxPolarAngle = THREE.MathUtils.degToRad(82);
    controls.autoRotate = !reduced;
    controls.autoRotateSpeed = 0.9;
    cv.style.touchAction = "pan-y"; // vertical swipes still scroll the page on phones

    const view = { el, cv, ctx, cam, controls, S, pad: v.pad, w: 0, h: 0, visible: false, az: v.az, elev: v.el, dragged: false, idle: null };
    placeCamera(view);
    views.push(view);

    // pause auto-rotate while the user handles it, resume a few seconds later
    controls.addEventListener("start", () => { controls.autoRotate = false; clearTimeout(view.idle); cv.classList.add("grabbing"); });
    controls.addEventListener("end", () => {
      cv.classList.remove("grabbing");
      if (!reduced) view.idle = setTimeout(() => (controls.autoRotate = true), 3500);
    });
    // a drag inside a link card must not follow the link
    let down = null;
    cv.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; view.dragged = false; });
    cv.addEventListener("pointermove", (e) => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) view.dragged = true; });
    const link = cv.closest("a");
    if (link) link.addEventListener("click", (e) => { if (view.dragged) { e.preventDefault(); view.dragged = false; } }, true);
    // hovering a card spins it a little faster
    const card = cv.closest(".sector, .project, .sector-row");
    if (card) {
      card.addEventListener("pointerenter", () => (controls.autoRotateSpeed = 2.4));
      card.addEventListener("pointerleave", () => (controls.autoRotateSpeed = 0.9));
    }
  }

  // Distance at which the model's bounding box fills the frame along direction `dir`, whatever the angle.
  // Uses the widest framing over a full turn so the model never clips while it rotates.
  function fitDistance(view, elev) {
    const { S, cam } = view;
    let worst = 0;
    for (let a = 0; a < 360; a += 30) {
      const az = THREE.MathUtils.degToRad(a);
      const dir = new THREE.Vector3(Math.sin(az) * Math.cos(elev), Math.sin(elev), Math.cos(az) * Math.cos(elev));
      let d = S.radius * 3, lo = 0, hi = 0;
      cam.clearViewOffset();
      for (let i = 0; i < 4; i++) {
        cam.position.copy(S.center).addScaledVector(dir, d);
        cam.lookAt(S.center); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
        let mx = 0; lo = 1e9; hi = -1e9;
        for (const c of S.corners) { tmp.copy(c).project(cam); mx = Math.max(mx, Math.abs(tmp.x)); lo = Math.min(lo, tmp.y); hi = Math.max(hi, tmp.y); }
        d *= Math.max(mx, (hi - lo) / 2) / view.pad;
      }
      if (d > worst) { worst = d; view.shift = (hi + lo) / 2; }
    }
    return worst;
  }

  // Re-centre the picture vertically on the building (its mass sits low, the sky above is empty).
  function applyShift(view) {
    const { cam } = view, W = view.w || 400, H = view.h || 300;
    cam.setViewOffset(W, H, 0, -(view.shift || 0) * H / 2, W, H);
  }

  function placeCamera(view) {
    const { S, cam } = view;
    const el = THREE.MathUtils.degToRad(view.elev), az = THREE.MathUtils.degToRad(view.az);
    const dist = fitDistance(view, el);
    cam.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist).add(S.center);
    cam.lookAt(S.center);
    applyShift(view);
    view.controls.update();
  }

  /* size + visibility */
  const ro = new ResizeObserver((entries) => {
    for (const e of entries) {
      const view = views.find((v) => v.cv === e.target);
      if (!view) continue;
      const r = e.contentRect;
      const w = Math.max(1, Math.round(r.width * DPR)), h = Math.max(1, Math.round(r.height * DPR));
      if (w === view.cv.width && h === view.cv.height) continue;
      const first = !view.w;
      view.cv.width = w; view.cv.height = h; view.w = w; view.h = h;
      view.cam.aspect = w / h; view.cam.updateProjectionMatrix();
      if (first) placeCamera(view); else { // keep the current angle, refit the distance
        const off = view.cam.position.clone().sub(view.S.center);
        const elev = Math.asin(off.y / off.length());
        const saved = view.cam.position.clone();
        const d = fitDistance(view, elev);
        view.cam.position.copy(view.S.center).add(saved.sub(view.S.center).setLength(d));
        view.cam.lookAt(view.S.center);
        applyShift(view);
      }
      view.dirty = true;
    }
  });
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const view = views.find((v) => v.cv === e.target);
      if (view) { view.visible = e.isIntersecting; view.dirty = true; }
    }
  }, { rootMargin: "100px" });
  for (const v of views) { ro.observe(v.cv); io.observe(v.cv); }

  /* ---------- loop ---------- */
  const clock = new THREE.Clock();
  let pageVisible = !document.hidden;
  document.addEventListener("visibilitychange", () => (pageVisible = !document.hidden));

  renderer.setAnimationLoop(() => {
    if (!pageVisible) return;
    const t = clock.getElapsedTime();
    for (const view of views) {
      if (!view.visible || !view.w) continue;
      const moving = view.controls.update() || view.controls.autoRotate;
      const S = view.S;
      if (S.model.update && !reduced && S.lastT !== t) { S.model.update(t); S.lastT = t; view.dirty = true; }
      if (!moving && !view.dirty && !S.model.update) continue;
      view.dirty = false;
      ensureBuffer(view.w, view.h);
      renderer.setViewport(0, 0, view.w, view.h);
      renderer.setScissor(0, 0, view.w, view.h);
      renderer.clear();
      renderer.render(S.scene, view.cam);
      view.ctx.clearRect(0, 0, view.w, view.h);
      view.ctx.drawImage(renderer.domElement, 0, bufH - view.h, view.w, view.h, 0, 0, view.w, view.h);
    }
  });

  renderer.domElement.addEventListener("webglcontextlost", () => {
    // fall back to the original drawings
    for (const v of views) { v.cv.remove(); (v.el.id === "plant" ? v.el : v.el.parentElement).classList.remove("has-3d"); }
    renderer.setAnimationLoop(null);
  });
  document.documentElement.classList.add("l3d-ready");
}
