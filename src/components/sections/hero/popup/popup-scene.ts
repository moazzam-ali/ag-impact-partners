import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/*
  Pop-up's 3D scene: a cloth-bound book on a pale desk opens towards the viewer and Paris rises
  out of it in cut paper: the Eiffel Tower at the back, two rows of Haussmann facades with their
  windows cut out, one window lit from behind, a low front row with street lamps. Each layer is a
  card hinged on the far page; it lies flat while the book is closed and stands up as it opens.
  The cursor tilts the view; scrolling away closes the book.

  Layers are canvas-drawn silhouettes with alpha (cut-outs), so their shadows fall through the
  windows onto the page behind.
*/

export type PopupColors = {
  /** Font for the page's printed caption. */
  serif: string;
  ground: string;
  cloth: string;
  paper: string;
  paperShade: string;
  line: string;
  ink: string;
  accent: string;
  light: string;
};

const PAGE_W = 0.46; // across (x)
const PAGE_D = 0.3; // from the spine to the edge (z)
const BOARD = 0.006;
const PX_PER_M = 2400;

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

type Cut = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; w: number; h: number };
function card(widthM: number, heightM: number): Cut {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(widthM * PX_PER_M);
  canvas.height = Math.round(heightM * PX_PER_M);
  const ctx = canvas.getContext("2d")!;
  return { canvas, ctx, w: canvas.width, h: canvas.height };
}

/** A row of Haussmann blocks, windows cut through. `lit` marks one window to glow from behind. */
function facades(
  widthM: number,
  heightM: number,
  seed: number,
  colors: PopupColors,
  opts: { tall: number; lit?: boolean },
) {
  const c = card(widthM, heightM);
  const { ctx, w, h } = c;
  const r = rng(seed);
  let litRect: [number, number, number, number] | null = null;
  ctx.fillStyle = colors.paper;
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 3;
  let x = -r() * 40;
  let index = 0;
  while (x < w) {
    const bw = 150 + r() * 120;
    const top = h * (1 - opts.tall * (0.82 + r() * 0.18));
    const roof = 46 + r() * 20;
    // Body, mansard and chimneys as one silhouette.
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x, top);
    ctx.lineTo(x + 16, top - roof);
    const chimneys = 1 + Math.floor(r() * 2);
    for (let k = 0; k < chimneys; k++) {
      const cx = x + 30 + (k + 0.5) * ((bw - 60) / chimneys);
      ctx.lineTo(cx - 9, top - roof);
      ctx.lineTo(cx - 9, top - roof - 26);
      ctx.lineTo(cx + 9, top - roof - 26);
      ctx.lineTo(cx + 9, top - roof);
    }
    ctx.lineTo(x + bw - 16, top - roof);
    ctx.lineTo(x + bw, top);
    ctx.lineTo(x + bw, h);
    ctx.closePath();
    ctx.globalCompositeOperation = "source-over";
    ctx.fill();
    ctx.stroke();
    // Cornices.
    ctx.beginPath();
    for (const fy of [top + 6, top + (h - top) * 0.36, h - 60]) {
      ctx.moveTo(x + 2, fy);
      ctx.lineTo(x + bw - 2, fy);
    }
    ctx.stroke();
    // Windows cut out; dormers too.
    ctx.globalCompositeOperation = "destination-out";
    const bays = Math.max(2, Math.floor(bw / 44));
    const floors = Math.max(2, Math.floor((h - top - 90) / 58));
    for (let f = 0; f < floors; f++) {
      for (let b = 0; b < bays; b++) {
        const wx = x + (bw / bays) * (b + 0.5) - 9;
        const wy = top + 22 + f * 58;
        ctx.fillRect(wx, wy, 18, 32);
        if (opts.lit && !litRect && index === 1 && f === 1 && b === 1) litRect = [wx, wy, 18, 32];
      }
    }
    for (let b = 0; b < bays - 1; b++) {
      ctx.fillRect(x + (bw / (bays - 1)) * (b + 0.5) - 6, top - roof + 14, 12, 18);
    }
    // Ground-floor arches.
    ctx.beginPath();
    for (let b = 0; b < bays; b++) {
      const ax = x + (bw / bays) * (b + 0.5);
      ctx.moveTo(ax - 14, h);
      ctx.lineTo(ax - 14, h - 34);
      ctx.arc(ax, h - 34, 14, Math.PI, 0);
      ctx.lineTo(ax + 14, h);
    }
    ctx.fill();
    x += bw + 2;
    index++;
  }
  ctx.globalCompositeOperation = "source-over";
  return { ...c, lit: litRect };
}

/** The Eiffel Tower as one cut-out: tapering legs, platforms, the arch, lattice holes. */
function towerCard(colors: PopupColors) {
  const c = card(0.16, 0.34);
  const { ctx, w, h } = c;
  const half = (y: number) => 10 + 150 * Math.exp(-y / 150);
  const cx = w / 2;
  ctx.fillStyle = colors.paper;
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - half(0), h);
  for (let y = 0; y <= h - 60; y += 8) ctx.lineTo(cx - half(y), h - y);
  ctx.lineTo(cx - 4, 20);
  ctx.lineTo(cx, 0);
  ctx.lineTo(cx + 4, 20);
  for (let y = h - 60; y >= 0; y -= 8) ctx.lineTo(cx + half(y), h - y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Platforms.
  for (const y of [h * 0.2, h * 0.42]) {
    ctx.fillRect(cx - half(h - y) - 12, y - 6, (half(h - y) + 12) * 2, 10);
    ctx.strokeRect(cx - half(h - y) - 12, y - 6, (half(h - y) + 12) * 2, 10);
  }
  ctx.globalCompositeOperation = "destination-out";
  // The arch between the legs.
  ctx.beginPath();
  ctx.ellipse(cx, h, half(0) * 0.62, h * 0.16, 0, Math.PI, 0);
  ctx.fill();
  // Lattice: rows of small triangles.
  for (let y = h * 0.24; y < h * 0.8; y += 26) {
    const hw = half(h - y) - 10;
    for (let k = -hw; k < hw - 12; k += 22) {
      ctx.beginPath();
      ctx.moveTo(cx + k, y);
      ctx.lineTo(cx + k + 16, y);
      ctx.lineTo(cx + k + 8, y + 16);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = "source-over";
  return c;
}

/** The front row: low parapet, lamp posts, a bench. */
function streetCard(colors: PopupColors) {
  const c = card(PAGE_W * 0.94, 0.06);
  const { ctx, w, h } = c;
  ctx.fillStyle = colors.paper;
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.rect(0, h - 26, w, 26);
  for (let x = 60; x < w; x += 180) {
    ctx.rect(x - 3, 10, 6, h - 26);
    ctx.rect(x - 11, 4, 22, 12);
  }
  ctx.fill();
  ctx.stroke();
  ctx.globalCompositeOperation = "destination-out";
  for (let x = 14; x < w - 20; x += 22) ctx.fillRect(x, h - 20, 8, 14);
  ctx.globalCompositeOperation = "source-over";
  return c;
}

function texture(c: { canvas: HTMLCanvasElement }) {
  const t = new THREE.CanvasTexture(c.canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function createPopupScene(canvas: HTMLCanvasElement, colors: PopupColors) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(colors.ground);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 10);
  const base = new THREE.Vector3();
  const look = new THREE.Vector3();

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({ color: colors.ground, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Raking light from behind and to the left: the cut-outs throw their shadows forward.
  const key = new THREE.DirectionalLight(colors.light, 2.8);
  key.position.set(-0.8, 0.9, -0.75);
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
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.002;
  key.shadow.radius = 4;
  scene.add(key);
  scene.add(new THREE.HemisphereLight(colors.light, colors.ground, 0.45));
  const fill = new THREE.DirectionalLight(colors.light, 0.55);
  fill.position.set(0.6, 0.5, 1);
  scene.add(fill);

  // ---- The book: near half fixed, far half hinged on the spine (x axis at z = 0) -----------
  const cloth = new THREE.MeshStandardMaterial({ color: colors.cloth, roughness: 0.85 });
  const paperMat = new THREE.MeshStandardMaterial({ color: colors.paper, roughness: 0.95 });
  const half = (z: number) => {
    const g = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(PAGE_W + 0.02, BOARD, PAGE_D + 0.01), cloth);
    board.position.set(0, BOARD / 2, z * (PAGE_D / 2 + 0.005));
    const block = new THREE.Mesh(new THREE.BoxGeometry(PAGE_W, 0.008, PAGE_D), paperMat);
    block.position.set(0, BOARD + 0.004, z * (PAGE_D / 2));
    for (const m of [board, block]) {
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
    }
    return g;
  };
  const near = half(1);
  scene.add(near);
  // The near page carries the book's caption, printed.
  const print = card(PAGE_W, PAGE_D);
  print.ctx.fillStyle = colors.paper;
  print.ctx.fillRect(0, 0, print.w, print.h);
  print.ctx.fillStyle = colors.line;
  print.ctx.fillRect(110, print.h - 250, print.w - 220, 3);
  print.ctx.font = `italic 400 150px ${colors.serif}`;
  print.ctx.fillStyle = colors.ink;
  print.ctx.fillText("Paris", 104, print.h - 290);
  const printed = new THREE.Mesh(
    new THREE.PlaneGeometry(PAGE_W, PAGE_D),
    new THREE.MeshStandardMaterial({ map: texture(print), roughness: 0.95 }),
  );
  printed.rotation.x = -Math.PI / 2;
  printed.position.set(0, BOARD + 0.0081, PAGE_D / 2);
  printed.receiveShadow = true;
  near.add(printed);
  const farPivot = new THREE.Group();
  farPivot.position.set(0, BOARD + 0.008, 0);
  const far = half(-1);
  far.position.y = -(BOARD + 0.008);
  farPivot.add(far);
  scene.add(farPivot);
  const pageTop = BOARD + 0.008;

  // ---- The pop-up layers, hinged on the far page ------------------------------------------
  type Layer = { pivot: THREE.Group; delay: number };
  const layers: Layer[] = [];
  const addLayer = (
    cut: Cut,
    widthM: number,
    heightM: number,
    z: number,
    x: number,
    delay: number,
    shade = 0,
  ) => {
    const material = new THREE.MeshStandardMaterial({
      map: texture(cut),
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: 0.92,
      color: new THREE.Color(1, 1, 1).multiplyScalar(1 - shade),
    });
    const geometry = new THREE.PlaneGeometry(widthM, heightM);
    geometry.translate(0, heightM / 2, 0);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      map: material.map,
      alphaTest: 0.5,
    });
    const pivot = new THREE.Group();
    pivot.position.set(x, pageTop - (BOARD + 0.008) + 0.0005, z);
    pivot.add(mesh);
    far.add(pivot);
    layers.push({ pivot, delay });
    return mesh;
  };

  addLayer(towerCard(colors), 0.16, 0.34, -0.25, 0.1, 0.0, 0.14);
  const back = facades(PAGE_W * 0.96, 0.2, 5, colors, { tall: 0.95 });
  addLayer(back, PAGE_W * 0.96, 0.2, -0.19, 0, 0.08, 0.09);
  const middle = facades(PAGE_W * 0.9, 0.15, 12, colors, { tall: 0.9, lit: true });
  const middleMesh = addLayer(middle, PAGE_W * 0.9, 0.15, -0.11, -0.01, 0.16, 0.04);
  addLayer(streetCard(colors), PAGE_W * 0.94, 0.06, -0.03, 0, 0.24, 0);

  // The lit window: a warm card just behind the cut-out, and a little light.
  if (middle.lit) {
    const [wx, wy, ww, wh] = middle.lit;
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry((ww / PX_PER_M) * 1.6, (wh / PX_PER_M) * 1.3),
      new THREE.MeshBasicMaterial({ color: colors.accent }),
    );
    glow.position.set(
      (wx + ww / 2) / PX_PER_M - (PAGE_W * 0.9) / 2,
      0.15 - (wy + wh / 2) / PX_PER_M,
      -0.004,
    );
    middleMesh.add(glow);
    const lamp = new THREE.PointLight(colors.accent, 0.04, 0.12, 2);
    lamp.position.copy(glow.position).add(new THREE.Vector3(0, 0, -0.01));
    middleMesh.add(lamp);
  }

  const smooth = (t: number) => t * t * (3 - 2 * t);
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  return {
    /** `open` 0 (closed) to 1 (flat open). */
    frame(open: number) {
      // The far half swings back over the spine.
      farPivot.rotation.x = -Math.PI * (1 - smooth(clamp01(open)));
      for (const layer of layers) {
        const rise = smooth(clamp01((open - 0.35 - layer.delay) / 0.5));
        // Flat (folded towards the spine) to standing.
        layer.pivot.rotation.x = (Math.PI / 2) * (1 - rise);
        layer.pivot.visible = open > 0.02;
      }
      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;
      camera.position.copy(base).add(new THREE.Vector3(pointer.x * 0.08, -pointer.y * 0.04, 0));
      camera.lookAt(look);
      renderer.render(scene, camera);
    },
    resize(width: number, height: number) {
      renderer.setSize(Math.max(1, width), Math.max(1, height), false);
      camera.aspect = Math.max(1, width) / Math.max(1, height);
      if (camera.aspect >= 1) {
        look.set(-0.3, 0.08, -0.04);
        base.set(-0.3, 0.78, 1.32);
      } else {
        look.set(0, 0.08, -0.04);
        base.set(0, 1.0, 1.75);
      }
      camera.updateProjectionMatrix();
    },
    setPointer(x: number, y: number) {
      pointer.tx = x;
      pointer.ty = y;
    },
    dispose() {
      renderer.dispose();
      pmrem.dispose();
    },
  };
}
