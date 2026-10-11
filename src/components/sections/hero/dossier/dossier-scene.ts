import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

import { type DocCopy, type Fonts, PaperDoc, type Palette } from "../signataire/documents";
import { paraphe, signature, strikeStroke } from "../signataire/strokes";

/*
  Dossier's 3D scene: a leather portfolio on a dark desk. The cover (peak mark in peach foil) opens
  on load onto the first of five fields; scrolling turns the pages one by one, each curling as it
  goes over, through the five fields in the brief's fixed order, to the last page: the signed
  contract, tucked in on the right.

  The spine runs along z at x = 0. A leaf's turn angle goes from 0 (lying right) to π (lying left);
  while it turns the page curls, the free edge lagging behind. Leaf geometry is rebuilt every frame
  from the angle (a strip of 40 segments), so it is cheap and exact.
*/

export type DossierColors = Palette & {
  desk: string;
  leather: string;
  foil: string;
  light: string;
  lining: string;
};

export type Field = { n: string; title: string; body: string };

type Options = {
  canvas: HTMLCanvasElement;
  fonts: Fonts;
  colors: DossierColors;
  fields: Field[];
  intro: string;
  eyebrow: string;
  brand: string;
  contract: DocCopy;
  peakPath: string;
};

const W = 0.24; // page width, spine to edge (x)
const D = 0.33; // page height (z)
const SEG = 40;
const THICK = 0.0012;
const PX = { w: 960, h: 1320 };

function page(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = PX.w;
  c.height = PX.h;
  return [c, c.getContext("2d")!];
}

function texture(c: HTMLCanvasElement, mirror = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (mirror) {
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.x = -1;
  }
  return t;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawMark(
  ctx: CanvasRenderingContext2D,
  path: string,
  cx: number,
  cy: number,
  size: number,
  color: string,
) {
  // The mark's viewBox is 59 78 1216 894.
  const s = size / 1216;
  ctx.save();
  ctx.translate(cx - (1216 / 2) * s - 59 * s, cy - (894 / 2) * s - 78 * s);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.fill(new Path2D(path));
  ctx.restore();
}

export function createDossierScene(o: Options) {
  const { canvas, fonts, colors } = o;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(colors.desk);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 10);
  const base = new THREE.Vector3();
  const look = new THREE.Vector3();

  const desk = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    new THREE.MeshStandardMaterial({ color: colors.desk, roughness: 0.9 }),
  );
  desk.rotation.x = -Math.PI / 2;
  desk.receiveShadow = true;
  scene.add(desk);

  const spot = new THREE.SpotLight(colors.light, 12, 0, 0.55, 0.9, 2);
  spot.position.set(-0.35, 1.3, 0.35);
  spot.target.position.set(0.02, 0, 0);
  spot.castShadow = true;
  spot.shadow.mapSize.set(2048, 2048);
  spot.shadow.bias = -0.0002;
  spot.shadow.normalBias = 0.002;
  spot.shadow.radius = 5;
  scene.add(spot, spot.target);
  scene.add(new THREE.HemisphereLight(colors.light, colors.desk, 0.2));

  // ---- Boards: the back board under the right stack, the cover's twin on the left -----------
  const leather = new THREE.MeshStandardMaterial({ color: colors.leather, roughness: 0.62 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(W + 0.012, 0.004, D + 0.016), leather);
  board.position.set(W / 2 + 0.002, 0.002, 0);
  board.castShadow = true;
  board.receiveShadow = true;
  scene.add(board);
  const block = new THREE.Mesh(
    new THREE.BoxGeometry(W - 0.004, 0.006, D - 0.006),
    new THREE.MeshStandardMaterial({ color: colors.paper, roughness: 0.95 }),
  );
  block.position.set(W / 2, 0.007, 0);
  block.castShadow = true;
  block.receiveShadow = true;
  scene.add(block);
  const top = 0.01;

  // The contract, tucked in on the right, already signed.
  const contract = new PaperDoc(renderer.capabilities.getMaxAnisotropy());
  const m = contract.print(o.contract, fonts, colors);
  contract.setStrokes(
    [
      strikeStroke(m.strike.x1, m.strike.x2, m.strike.y),
      paraphe(m.margin.x, m.margin.y),
      ...signature(m.sign.x1, m.sign.x2, m.sign.y),
    ],
    colors.ink,
  );
  for (let i = 0; i < 4; i++) contract.reveal(i, 1);
  contract.mesh.position.set(W / 2 + 0.002, top + 0.0005, 0.004);
  contract.mesh.rotation.y = -0.015;
  scene.add(contract.mesh);

  // ---- Leaves: the cover, then five pages ------------------------------------------------
  const fieldPage = (f: Field, i: number) => {
    const [c, ctx] = page();
    ctx.fillStyle = colors.paper;
    ctx.fillRect(0, 0, PX.w, PX.h);
    ctx.fillStyle = colors.soft;
    ctx.font = `500 22px ${fonts.mono}`;
    ctx.fillText(o.eyebrow.toUpperCase(), 90, 120);
    ctx.fillRect(90, 146, PX.w - 180, 2);
    ctx.fillStyle = colors.print;
    ctx.font = `300 340px ${fonts.serif}`;
    ctx.fillText(f.n, 76, 560);
    ctx.font = `400 92px ${fonts.serif}`;
    const titleLines = wrap(ctx, f.title, PX.w - 180);
    titleLines.forEach((line, k) => ctx.fillText(line, 90, 720 + k * 96));
    ctx.font = `400 38px ${fonts.serif}`;
    ctx.fillStyle = colors.print;
    wrap(ctx, f.body, PX.w - 180).forEach((line, k) =>
      ctx.fillText(line, 90, 760 + titleLines.length * 96 + 30 + k * 54),
    );
    ctx.fillStyle = colors.rule;
    ctx.fillRect(90, PX.h - 140, PX.w - 180, 2);
    ctx.fillStyle = colors.soft;
    ctx.font = `500 22px ${fonts.mono}`;
    ctx.fillText(`${i + 1} / ${o.fields.length}`, 90, PX.h - 100);
    return c;
  };
  const verso = () => {
    const [c, ctx] = page();
    ctx.fillStyle = colors.paper;
    ctx.fillRect(0, 0, PX.w, PX.h);
    ctx.globalAlpha = 0.06;
    drawMark(ctx, o.peakPath, PX.w / 2, PX.h / 2, 520, colors.print);
    ctx.globalAlpha = 1;
    return c;
  };
  const coverFront = () => {
    const [c, ctx] = page();
    ctx.fillStyle = colors.leather;
    ctx.fillRect(0, 0, PX.w, PX.h);
    drawMark(ctx, o.peakPath, PX.w / 2, PX.h * 0.44, 300, colors.foil);
    ctx.fillStyle = colors.foil;
    ctx.font = `500 26px ${fonts.mono}`;
    ctx.textAlign = "center";
    ctx.fillText(o.brand.toUpperCase(), PX.w / 2, PX.h * 0.62);
    return c;
  };
  const lining = () => {
    const [c, ctx] = page();
    ctx.fillStyle = colors.lining;
    ctx.fillRect(0, 0, PX.w, PX.h);
    ctx.fillStyle = colors.print;
    ctx.font = `400 64px ${fonts.serif}`;
    wrap(ctx, o.intro, PX.w - 200).forEach((line, k) =>
      ctx.fillText(line, 100, PX.h - 380 + k * 76),
    );
    return c;
  };

  type Leaf = {
    front: THREE.Mesh;
    back: THREE.Mesh;
    geometry: THREE.BufferGeometry;
    rigid: boolean;
  };
  const leaves: Leaf[] = [];
  const makeLeaf = (front: HTMLCanvasElement, back: HTMLCanvasElement, rigid: boolean) => {
    const geometry = new THREE.BufferGeometry();
    const count = (SEG + 1) * 2;
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const uv = new Float32Array(count * 2);
    const index: number[] = [];
    for (let i = 0; i <= SEG; i++) {
      uv.set([i / SEG, 1, i / SEG, 0], i * 4);
      if (i < SEG) {
        const a = i * 2;
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geometry.setIndex(index);
    const material = (c: HTMLCanvasElement, side: THREE.Side, mirror: boolean) =>
      new THREE.MeshStandardMaterial({
        map: texture(c, mirror),
        side,
        roughness: rigid ? 0.6 : 0.92,
      });
    const frontMesh = new THREE.Mesh(geometry, material(front, THREE.FrontSide, false));
    const backMesh = new THREE.Mesh(geometry, material(back, THREE.BackSide, true));
    for (const mesh of [frontMesh, backMesh]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    }
    leaves.push({ front: frontMesh, back: backMesh, geometry, rigid });
  };
  makeLeaf(coverFront(), lining(), true);
  o.fields.forEach((f, i) => makeLeaf(fieldPage(f, i), verso(), false));

  /** Lays leaf k along its turn: angle 0 (right) to π (left), curling while it turns. */
  const shape = (k: number, angle: number) => {
    const leaf = leaves[k]!;
    const n = leaves.length;
    const lift = angle / Math.PI;
    // Stacking: on the right the cover is on top; once turned, the first turned lies lowest.
    const y = top + 0.0006 + THICK * ((n - k) * (1 - lift) + k * lift) + Math.sin(angle) * 0.002;
    const bend = leaf.rigid ? 0 : 0.95 * Math.sin(angle);
    const pos = leaf.geometry.getAttribute("position") as THREE.BufferAttribute;
    let x = 0;
    let h = y;
    const ds = W / SEG;
    for (let i = 0; i <= SEG; i++) {
      pos.setXYZ(i * 2, x, h, -D / 2);
      pos.setXYZ(i * 2 + 1, x, h, D / 2);
      const a = angle - bend * (i / SEG) * 0.9;
      x += Math.cos(a) * ds;
      h += Math.sin(a) * ds;
    }
    pos.needsUpdate = true;
    leaf.geometry.computeVertexNormals();
    leaf.geometry.computeBoundingSphere();
  };

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  /** Share of the progress each leaf takes to turn: the cover, then the five pages. */
  const spans = leaves.map((_, k): [number, number] =>
    k === 0 ? [0, 0.12] : [0.12 + (k - 1) * 0.17, 0.12 + k * 0.17],
  );

  return {
    /** `p` 0–1: the cover, then each page in turn. */
    frame(p: number) {
      leaves.forEach((_, k) => {
        const [a, b] = spans[k]!;
        shape(k, Math.PI * smooth(clamp01((p - a) / (b - a))));
      });
      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;
      camera.position.copy(base).add(new THREE.Vector3(pointer.x * 0.05, -pointer.y * 0.03, 0));
      camera.lookAt(look);
      renderer.render(scene, camera);
    },
    resize(width: number, height: number) {
      renderer.setSize(Math.max(1, width), Math.max(1, height), false);
      camera.aspect = Math.max(1, width) / Math.max(1, height);
      if (camera.aspect >= 1) {
        look.set(-0.21, 0.0, 0.03);
        base.set(-0.21, 1.02, 0.78);
      } else {
        look.set(0, 0, -0.06);
        base.set(0, 2.05, 1.05);
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
