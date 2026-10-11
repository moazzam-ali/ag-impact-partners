import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

import { PAGE } from "../signataire/documents";
import { DESIGNS, type DocCopy, type DocInks, PAPERS, printDocuments } from "./documents";

/*
  Pile 2's scene: the 300 contracts as a ream of different documents (five kinds of paper, one per
  field) on a transparent ground, so the page's own colour and the headline behind show through.

  The ream builds quickly and softly on load. The sheet under the cursor slides a few centimetres
  out of the ream; click it and it is drawn all the way out towards you, lifted, turned to face you,
  and laid on top, where it shows its page. The next sheet to come up is always a different
  document from the one on top (the five come round in turn).

  Sheets are one instanced mesh, indexed by identity; `posOf` is each sheet's place in the ream and
  `level` eases towards it, so gaps close smoothly. Only the faces that can be seen carry a printed
  page: a small pool of planes follows the top sheets, the one in flight and the one peeking out.
*/

export const SHEETS = 300;
const THICK = 0.00042;
const STACK_YAW = -0.16;
const FLIGHT = 1.35;
const PEEK = 0.045;
const OUT = 0.33;
const LIFT = 0.045;
const TOP = SHEETS - 1;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** When sheet i touches down on load: quick and even, the signed top sheet last and slower. */
const landsAt = (i: number) => (i === TOP ? 1.05 : 0.08 + 0.85 * (i / SHEETS) ** 0.85);
const fallFor = (i: number) => (i === TOP ? 0.62 : 0.34);
/** Seconds until the ream is complete. */
export const BUILT = landsAt(TOP) + fallFor(TOP);
/** How many sheets are down at `time`, for the counter. */
export const landedBy = (time: number) => {
  let n = 0;
  for (let i = 0; i < SHEETS; i++) if (time >= landsAt(i) + fallFor(i) * 0.6) n++;
  return n;
};

export type Pick = { kind: "sheet"; id: number; place: number } | { kind: "top" } | null;

type Options = {
  canvas: HTMLCanvasElement;
  copy: DocCopy;
  font: string;
  inks: DocInks;
  dark: boolean;
  reduced: boolean;
  /** Called when a document has landed on top, with its design (its field). */
  onTop: (design: number) => void;
};

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createPile2Scene({ canvas, copy, font, inks, dark, reduced, onTop }: Options) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(24, 1, 0.05, 6);
  const target = new THREE.Vector3(0, 0.055, 0);
  const view = { az: 0.34, el: 0.8, dist: 1.5, fx: 0.6, fy: 0.54 };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  // ---- Ground: only a shadow catcher, so the page shows through (no shadow on the dark theme) --
  const catcher = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 4),
    new THREE.ShadowMaterial({ color: "#2a2216", opacity: 0.2 }),
  );
  catcher.rotation.x = -Math.PI / 2;
  catcher.receiveShadow = true;
  scene.add(catcher);

  const key = new THREE.DirectionalLight("#fff3e2", 2.4);
  key.position.set(-0.55, 1.25, 0.45);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, {
    left: -0.5,
    right: 0.5,
    top: 0.5,
    bottom: -0.5,
    near: 0.2,
    far: 3,
  });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.002;
  key.shadow.radius = 6;
  scene.add(key);
  const fill = new THREE.HemisphereLight("#fff3e2", "#3a3530", 0.6);
  scene.add(fill);

  const setTheme = (isDark: boolean) => {
    (catcher.material as THREE.ShadowMaterial).opacity = isDark ? 0 : 0.2;
    key.intensity = isDark ? 2.7 : 2.4;
    fill.intensity = isDark ? 0.22 : 0.6;
    scene.environmentIntensity = isDark ? 0.3 : 0.55;
  };
  setTheme(dark);

  // ---- The ream -------------------------------------------------------------------------------
  const sheets = new THREE.InstancedMesh(
    new THREE.BoxGeometry(PAGE.w, THICK, PAGE.h),
    new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9 }),
    SHEETS,
  );
  sheets.castShadow = true;
  sheets.receiveShadow = true;
  sheets.frustumCulled = false;
  scene.add(sheets);
  // Instances move every frame; a fixed sphere around the whole flight keeps raycasting honest.
  sheets.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.1, 0.15), 0.7);

  const r = rng(29);
  const order = Array.from({ length: SHEETS }, (_, i) => i);
  const posOf = Int16Array.from(order);
  const level = Float32Array.from(order);
  const peek = new Float32Array(SHEETS);
  const design = new Uint8Array(SHEETS);
  const shade = new Float32Array(SHEETS);
  const jitter = Array.from({ length: SHEETS }, () => ({
    x: (r() - 0.5) * 0.004,
    z: (r() - 0.5) * 0.004,
    yaw: (r() - 0.5) * 0.024,
    drift: r() - 0.5,
  }));
  // Neighbours are never the same document; the top one is the first field's contract.
  for (let i = 0; i < SHEETS; i++) {
    let d = Math.floor(r() * DESIGNS);
    if (i > 0 && d === design[i - 1]) d = (d + 1 + Math.floor(r() * (DESIGNS - 1))) % DESIGNS;
    design[i] = i === TOP ? 0 : d;
    if (i === TOP - 1 && design[i] === 0) design[i] = 1;
    shade[i] = (r() - 0.5) * 0.035;
  }
  /** The five kinds of stock differ a little in size, so the ream's edge is not a clean block. */
  const SIZES: readonly (readonly [number, number])[] = [
    [1, 1],
    [0.985, 0.992],
    [1.006, 0.996],
    [0.992, 1.008],
    [1.002, 0.986],
  ];
  const color = new THREE.Color();
  const paint = (i: number) => {
    color.set(PAPERS[design[i]!]!).offsetHSL(0, 0, shade[i]!);
    sheets.setColorAt(i, color);
    if (sheets.instanceColor) sheets.instanceColor.needsUpdate = true;
  };
  for (let i = 0; i < SHEETS; i++) paint(i);

  // ---- Printed faces ---------------------------------------------------------------------------
  const textures = printDocuments(copy, font, inks, renderer.capabilities.getMaxAnisotropy());
  const faceGeometry = new THREE.PlaneGeometry(PAGE.w, PAGE.h);
  const faces = Array.from({ length: 6 }, () => {
    const mesh = new THREE.Mesh(
      faceGeometry,
      new THREE.MeshStandardMaterial({ map: textures[0], roughness: 0.86 }),
    );
    mesh.matrixAutoUpdate = false;
    mesh.receiveShadow = true;
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  });
  const free = [...faces];
  const worn = new Map<number, (typeof faces)[number]>();
  const faceOffset = new THREE.Matrix4()
    .makeTranslation(0, THICK / 2 + 0.00012, 0)
    .multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2));

  // ---- Which document comes up next -------------------------------------------------------------
  /** When each design last came to the top (the first field's contract starts there). */
  const surfaced = Array.from({ length: DESIGNS }, (_, d) => (d === 0 ? 0 : -DESIGNS + d));
  let turn = 1;
  const nextDesign = () => {
    let best = 0;
    for (let d = 1; d < DESIGNS; d++) if (surfaced[d]! < surfaced[best]!) best = d;
    return best;
  };
  const resolve = (id: number) => {
    const d = nextDesign();
    if (design[id] !== d) {
      design[id] = d;
      paint(id);
    }
  };

  // ---- Flights ---------------------------------------------------------------------------------
  type Flight = { start: number; from: number; peek: number; yaw: number };
  const flights = new Map<number, Flight>();
  let hovered = -1;
  let clock = 0;

  const pull = (id: number) => {
    if (flights.has(id) || posOf[id] === TOP || clock < BUILT) return false;
    resolve(id);
    surfaced[design[id]!] = turn++;
    const from = posOf[id]!;
    order.splice(from, 1);
    order.push(id);
    order.forEach((sheet, place) => (posOf[sheet] = place));
    flights.set(id, {
      start: clock,
      from: level[id]!,
      peek: peek[id]!,
      yaw: (r() - 0.5) * 0.03,
    });
    return true;
  };
  const pullRandom = () => {
    for (let tries = 0; tries < 20; tries++) {
      const id = order[30 + Math.floor(r() * (SHEETS - 60))]!;
      if (!flights.has(id)) return pull(id);
    }
    return false;
  };

  // ---- Per-frame placement ---------------------------------------------------------------------
  const stack = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), STACK_YAW);
  const up = new THREE.Vector3(0, 1, 0);
  const outDir = new THREE.Vector3();
  const tiltAxis = new THREE.Vector3();
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const qa = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const e = new THREE.Euler();
  const yOf = (lv: number) => lv * THICK + THICK / 2;
  const corners = [-1, 1].flatMap((sx) =>
    [0, SHEETS * THICK].flatMap((y) =>
      [-1, 1].map((sz) =>
        new THREE.Vector3((sx * PAGE.w) / 2, y, (sz * PAGE.h) / 2).applyQuaternion(stack),
      ),
    ),
  );

  let settled = true;
  /** Places sheet i; false while it hasn't appeared yet. Sets `settled` when it is at rest. */
  const place = (i: number) => {
    settled = true;
    const j = jitter[i]!;
    const size = SIZES[design[i]!] ?? SIZES[0]!;
    s.set(size[0], 1, size[1]);
    const flight = flights.get(i);

    if (flight) {
      const u = reduced ? 1 : clamp01((clock - flight.start) / FLIGHT);
      const a = inOut(clamp01(u / 0.36));
      const b = inOut(clamp01((u - 0.28) / 0.34));
      const c = inOut(clamp01((u - 0.54) / 0.34));
      const d = inOut(clamp01((u - 0.82) / 0.18));
      const yTo = yOf(posOf[i]!);
      const y = u < 0.82 ? lerp(yOf(flight.from), yTo + LIFT, b) : lerp(yTo + LIFT, yTo, d);
      const out = lerp(flight.peek * PEEK, OUT, a) * (1 - c);
      const tilt = 0.5 * Math.sin(Math.PI * clamp01((u - 0.32) / 0.56));
      p.set(j.x, 0, j.z).applyQuaternion(stack).addScaledVector(outDir, out);
      p.y = y;
      e.set(0, lerp(j.yaw, flight.yaw, c), 0.05 * Math.sin(Math.PI * u) * j.drift);
      q.setFromAxisAngle(tiltAxis, tilt).multiply(stack).multiply(qa.setFromEuler(e));
      if (u >= 1) {
        flights.delete(i);
        j.yaw = flight.yaw;
        level[i] = posOf[i]!;
        if (posOf[i] === TOP) onTop(design[i]!);
      }
    } else {
      const land = clamp01((clock - landsAt(i)) / fallFor(i));
      if (land <= 0) {
        m.makeScale(0, 0, 0);
        sheets.setMatrixAt(i, m);
        return false;
      }
      const drop = 1 - easeOut(land);
      // A page is printed only once its sheet is down (falling sheets pass through each other).
      settled = land >= 1;
      const height = i === TOP ? 0.07 : 0.028;
      p.set(j.x + drop * j.drift * 0.02, 0, j.z - drop * 0.012)
        .applyQuaternion(stack)
        .addScaledVector(outDir, peek[i]! * PEEK);
      p.y = yOf(level[i]!) + drop * height;
      e.set(drop * j.drift * 0.08, j.yaw + drop * j.drift * 0.12, 0);
      q.copy(stack).multiply(qa.setFromEuler(e));
    }
    m.compose(p, q, s);
    sheets.setMatrixAt(i, m);
    return true;
  };

  const shown = new Set<number>();
  const sheetMatrix = new THREE.Matrix4();
  const dress = (seen: boolean[]) => {
    shown.clear();
    for (let k = 0; k < 3; k++) shown.add(order[TOP - k]!);
    flights.forEach((_, id) => shown.add(id));
    if (hovered >= 0) shown.add(hovered);
    worn.forEach((mesh, id) => {
      if (shown.has(id)) return;
      worn.delete(id);
      mesh.visible = false;
      free.push(mesh);
    });
    shown.forEach((id) => {
      let mesh = worn.get(id);
      if (!mesh) {
        mesh = free.pop();
        if (!mesh) return;
        worn.set(id, mesh);
      }
      const map = textures[design[id]!] ?? null;
      if (mesh.material.map !== map) mesh.material.map = map;
      mesh.visible = seen[id] ?? false;
      sheets.getMatrixAt(id, sheetMatrix);
      mesh.matrix.multiplyMatrices(sheetMatrix, faceOffset);
      mesh.matrixWorldNeedsUpdate = true;
    });
  };

  const seen: boolean[] = new Array(SHEETS).fill(false);
  const frame = (time: number) => {
    const dt = Math.min(0.05, Math.max(0, time - clock));
    clock = time;
    const k = 1 - Math.exp(-9 * dt);
    const kp = 1 - Math.exp(-12 * dt);
    for (let i = 0; i < SHEETS; i++) {
      level[i] = reduced ? posOf[i]! : level[i]! + (posOf[i]! - level[i]!) * k;
      peek[i] = peek[i]! + ((i === hovered ? 1 : 0) - peek[i]!) * (reduced ? 1 : kp);
      seen[i] = place(i) && (settled || i === TOP || flights.has(i));
    }
    sheets.instanceMatrix.needsUpdate = true;
    dress(seen);

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    aim();
    renderer.render(scene, camera);
  };

  const aim = () => {
    const az = view.az + pointer.x * 0.05;
    const el = view.el - pointer.y * 0.03;
    camera.position.set(
      target.x + view.dist * Math.cos(el) * Math.sin(az),
      target.y + view.dist * Math.sin(el),
      target.z + view.dist * Math.cos(el) * Math.cos(az),
    );
    camera.lookAt(target);
  };

  // ---- Picking ---------------------------------------------------------------------------------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pick = (x: number, y: number): Pick => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return null;
    ndc.set((x / w) * 2 - 1, -(y / h) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    for (const hit of raycaster.intersectObject(sheets, false)) {
      const id = hit.instanceId;
      if (id === undefined || flights.has(id)) continue;
      if (posOf[id] === TOP) return { kind: "top" };
      return { kind: "sheet", id, place: posOf[id]! + 1 };
    }
    return null;
  };
  const hover = (id: number) => {
    if (id === hovered) return;
    hovered = id;
    if (id >= 0) resolve(id);
  };

  const anchorPoint = new THREE.Vector3();
  /** Where the top document's right edge sits on screen, in canvas pixels. */
  const anchor = () => {
    const id = order[TOP]!;
    if (flights.has(id) || !seen[id]) return null;
    sheets.getMatrixAt(id, sheetMatrix);
    anchorPoint.set(PAGE.w / 2, THICK / 2, -PAGE.h * 0.18).applyMatrix4(sheetMatrix);
    anchorPoint.project(camera);
    return {
      x: (anchorPoint.x * 0.5 + 0.5) * canvas.clientWidth,
      y: (-anchorPoint.y * 0.5 + 0.5) * canvas.clientHeight,
    };
  };

  return {
    frame,
    pick,
    hover,
    pull,
    pullRandom,
    anchor,
    setTheme,
    setPointer(x: number, y: number) {
      pointer.tx = x;
      pointer.ty = y;
    },
    /**
     * Frames the ream into `stage` (canvas pixels): its centre there, the camera backed off until
     * the ream is as tall as the stage, or as wide, whichever comes first.
     */
    resize(width: number, height: number, stage: { x: number; y: number; w: number; h: number }) {
      const w = Math.max(1, width);
      const h = Math.max(1, height);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      view.fx = stage.x / w;
      view.fy = stage.y / h;
      view.el = camera.aspect >= 1.1 ? 0.8 : 0.9;
      camera.setViewOffset(w, h, (0.5 - view.fx) * w, (0.5 - view.fy) * h, w, h);
      camera.updateProjectionMatrix();
      // Sheets come out straight, along their own length, towards the viewer.
      outDir.set(0, 0, 1).applyQuaternion(stack);
      tiltAxis.crossVectors(up, outDir).normalize();
      for (let k = 0; k < 4; k++) {
        aim();
        camera.updateMatrixWorld();
        const span = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
        for (const corner of corners) {
          const c = corner.clone().project(camera);
          span.x0 = Math.min(span.x0, c.x);
          span.x1 = Math.max(span.x1, c.x);
          span.y0 = Math.min(span.y0, c.y);
          span.y1 = Math.max(span.y1, c.y);
        }
        view.dist *= Math.max(
          (((span.y1 - span.y0) / 2) * h) / Math.max(40, stage.h),
          (((span.x1 - span.x0) / 2) * w) / Math.max(40, stage.w * 0.9),
        );
      }
      aim();
    },
    dispose() {
      renderer.dispose();
      pmrem.dispose();
      textures.forEach((t) => t.dispose());
    },
  };
}
