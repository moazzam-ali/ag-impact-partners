import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

import { type DocCopy, type Fonts, PAGE, PaperDoc, type Palette } from "../signataire/documents";
import { paraphe, signature, strikeStroke } from "../signataire/strokes";

/*
  Pile's 3D scene: a ream of 300 contract sheets (the approved "300 contrats" figure) on a pale
  studio ground. On load the sheets land one after another, fast, into a slightly untidy stack;
  the top sheet is a signed contract. The pointer riffles the ream: every sheet above the level
  under the cursor swings open about the left edge, like a thumb running through a block of paper.

  The sheets are one instanced mesh; per-sheet transforms are recomputed each frame from time and
  the riffle level, so there is no animation state to drift.
*/

export const SHEETS = 300;
const THICK = 0.00042;
const HINGE = new THREE.Vector3(-PAGE.w / 2, 0, 0);

export type PileColors = Palette & { ground: string; light: string; ink: string };

type Options = {
  canvas: HTMLCanvasElement;
  copy: DocCopy;
  fonts: Fonts;
  colors: PileColors;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** When sheet i lands, seconds after the start: quick, quicker towards the top. */
export const landsAt = (i: number) => 0.25 + 2.3 * (i / SHEETS) ** 0.78;
const FALL = 0.32;

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

export function createPileScene({ canvas, copy, fonts, colors }: Options) {
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
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 10);
  const base = new THREE.Vector3();
  const look = new THREE.Vector3();

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({ color: colors.ground, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const key = new THREE.DirectionalLight(colors.light, 2.4);
  key.position.set(-0.6, 1.2, 0.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -0.4;
  key.shadow.camera.right = 0.4;
  key.shadow.camera.top = 0.4;
  key.shadow.camera.bottom = -0.4;
  key.shadow.camera.near = 0.2;
  key.shadow.camera.far = 3;
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.002;
  key.shadow.radius = 6;
  scene.add(key);
  scene.add(new THREE.HemisphereLight(colors.light, colors.ground, 0.6));

  // ---- The ream ------------------------------------------------------------------------------
  const sheets = new THREE.InstancedMesh(
    new THREE.BoxGeometry(PAGE.w, THICK, PAGE.h),
    new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9 }),
    SHEETS,
  );
  sheets.castShadow = true;
  sheets.receiveShadow = true;
  const r = rng(11);
  const paper = new THREE.Color(colors.paper);
  const jitter = Array.from({ length: SHEETS }, (_, i) => {
    sheets.setColorAt(i, paper.clone().offsetHSL(0, 0, (r() - 0.5) * 0.06));
    return {
      x: (r() - 0.5) * 0.004,
      z: (r() - 0.5) * 0.004,
      yaw: (r() - 0.5) * 0.02,
      fall: (r() - 0.5) * 0.6,
    };
  });
  scene.add(sheets);

  // The top sheet: a printed, signed contract riding on sheet 299.
  const cover = new PaperDoc(renderer.capabilities.getMaxAnisotropy());
  const marks = cover.print(copy, fonts, colors);
  cover.setStrokes(
    [
      strikeStroke(marks.strike.x1, marks.strike.x2, marks.strike.y),
      paraphe(marks.margin.x, marks.margin.y),
      ...signature(marks.sign.x1, marks.sign.x2, marks.sign.y),
    ],
    colors.ink,
  );
  for (let i = 0; i < 4; i++) cover.reveal(i, 1);
  cover.mesh.matrixAutoUpdate = false;
  scene.add(cover.mesh);
  const coverOffset = new THREE.Matrix4()
    .makeTranslation(0, THICK / 2 + 0.0002, 0)
    .multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2));

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3(1, 1, 1);
  const hinge = new THREE.Matrix4();
  const unhinge = new THREE.Matrix4();
  const open = new THREE.Matrix4();
  const STACK = new THREE.Vector3(0, 0, 0);
  const STACK_YAW = -0.22;

  /**
   * One frame. `time` drives the landing; `level` (0–300) is where the riffle opens: every sheet
   * above it swings open about the left edge, more the higher it is; `amount` 0–1 how far.
   */
  const frame = (time: number, level: number, amount: number) => {
    for (let i = 0; i < SHEETS; i++) {
      const j = jitter[i]!;
      const land = clamp01((time - landsAt(i)) / FALL);
      const drop = 1 - easeOut(land);
      const y = i * THICK + THICK / 2 + drop * 0.22;
      p.set(STACK.x + j.x + drop * 0.04, y, STACK.z + j.z - drop * 0.03);
      q.setFromEuler(
        new THREE.Euler(
          drop * j.fall * 0.4,
          STACK_YAW + j.yaw + drop * j.fall,
          drop * j.fall * 0.3,
        ),
      );
      s.setScalar(land > 0 ? 1 : 0);
      m.compose(p, q, s);

      // The riffle: rotate about the left edge (in the sheet's own frame).
      const above = i - level;
      if (amount > 0 && above > 0) {
        const angle = amount * 0.95 * (1 - Math.exp(-above / 26));
        hinge.makeTranslation(HINGE.x, HINGE.y, HINGE.z);
        unhinge.makeTranslation(-HINGE.x, -HINGE.y, -HINGE.z);
        open.makeRotationZ(angle);
        m.multiply(hinge).multiply(open).multiply(unhinge);
      }
      sheets.setMatrixAt(i, m);
      if (i === SHEETS - 1) {
        cover.mesh.visible = land > 0;
        cover.mesh.matrix.copy(m).multiply(coverOffset);
        cover.mesh.matrixWorldNeedsUpdate = true;
      }
    }
    sheets.instanceMatrix.needsUpdate = true;
    camera.position.copy(base);
    camera.lookAt(look);
    renderer.render(scene, camera);
  };

  return {
    frame,
    resize(width: number, height: number) {
      renderer.setSize(Math.max(1, width), Math.max(1, height), false);
      camera.aspect = Math.max(1, width) / Math.max(1, height);
      // Far enough back that the ream fits with its riffle open, framed right of centre.
      if (camera.aspect >= 1) {
        look.set(-0.2, 0.09, 0.02);
        base.set(-0.2, 1.12, 0.9);
      } else {
        look.set(0, 0.06, -0.12);
        base.set(0, 1.5, 0.95);
      }
      camera.updateProjectionMatrix();
    },
    dispose() {
      renderer.dispose();
      pmrem.dispose();
    },
  };
}
