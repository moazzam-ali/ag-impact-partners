import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

import { type DocCopy, type Fonts, PaperDoc, type Palette, toLocal } from "./documents";
import { type Grip, loadHand } from "./hand";
import { paraphe, signature, strikeStroke } from "./strokes";

/*
  Signataire's 3D scene: a dark desk under one warm spot, a run of contracts sliding through, and a
  sculpted hand that strikes a phrase, initials the margin, signs, underlines, and lifts away while
  the signed page slides off and the next one comes in.

  Everything is a pure function of time inside a looping cycle, so the loop never drifts and a
  reduced-motion visitor gets one exact frame (`still`).
*/

export type SceneColors = Palette & {
  desk: string;
  skin: string;
  lacquer: string;
  metal: string;
  light: string;
  sleeve: string;
  cuff: string;
};

type Options = {
  canvas: HTMLCanvasElement;
  copy: DocCopy[];
  fonts: Fonts;
  colors: SceneColors;
  handUrl: string;
  /** Debug: the hand and pen alone, from four sides, optionally with a grip override. */
  debugGrip?: boolean;
  grip?: Grip;
};

type Span = readonly [number, number];
const CYCLE = 6.2;
const DOC_IN: Span = [0, 1.15];
const HAND_IN: Span = [0.7, 1.5];
/** Strike, initials, signature, underline. */
const STROKES: Span[] = [
  [1.5, 1.82],
  [2.1, 2.55],
  [2.95, 4.45],
  [4.6, 4.75],
];
/** The hand leaves as soon as the last stroke ends. */
const HAND_OUT: Span = [STROKES.at(-1)![1], STROKES.at(-1)![1] + 0.9];
/** The camera leans in on the signature while it is written. */
const PUSH: Span = [2.4, 5.4];
const DOC_OUT: Span = [5.15, 6.55];
/** The moment shown to reduced-motion visitors: signed, the hand lifting away. */
export const STILL_AT = 5.0;

const REST = new THREE.Vector3(0.23, 0.075, 0.16);
const LIFT = 0.02;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const progress = ([a, b]: Span, t: number) => clamp01((t - a) / (b - a));
const smooth = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

type Point = [number, number];

export async function createSignataireScene(options: Options) {
  const { canvas, copy, fonts, colors } = options;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(colors.desk);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 10);
  const look = new THREE.Vector3();
  const base = new THREE.Vector3();
  /** Near the signature line, where the camera leans in. */
  const focus = new THREE.Vector3(0.05, 0.42, 0.34);

  // ---- Desk and light ----------------------------------------------------------------------
  const desk = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    new THREE.MeshStandardMaterial({ color: colors.desk, roughness: 0.92 }),
  );
  desk.rotation.x = -Math.PI / 2;
  desk.receiveShadow = true;
  scene.add(desk);

  const spot = new THREE.SpotLight(colors.light, 11, 0, 0.5, 1, 2);
  spot.position.set(-0.42, 1.25, 0.32);
  spot.target.position.set(0.02, 0, 0);
  spot.castShadow = true;
  spot.shadow.mapSize.set(2048, 2048);
  spot.shadow.bias = -0.0002;
  spot.shadow.normalBias = 0.003;
  spot.shadow.radius = 5;
  spot.shadow.camera.near = 0.4;
  spot.shadow.camera.far = 3;
  scene.add(spot, spot.target);
  scene.add(new THREE.HemisphereLight(colors.light, colors.desk, 0.18));

  // ---- Documents ---------------------------------------------------------------------------
  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const docs = [0, 1, 2].map(() => {
    const doc = new PaperDoc(anisotropy);
    doc.mesh.visible = false;
    scene.add(doc.mesh);
    return { doc, cycle: -1, strokes: [] as Point[][] };
  });

  /** Prints cycle n's contract on its page the first time the cycle shows. */
  const pageFor = (n: number) => {
    const slot = docs[((n % 3) + 3) % 3]!;
    if (slot.cycle !== n) {
      slot.cycle = n;
      const contract = copy[((n % copy.length) + copy.length) % copy.length]!;
      const marks = slot.doc.print(contract, fonts, colors);
      slot.strokes = [
        strikeStroke(marks.strike.x1, marks.strike.x2, marks.strike.y),
        paraphe(marks.margin.x, marks.margin.y),
        ...signature(marks.sign.x1, marks.sign.x2, marks.sign.y),
      ];
      slot.doc.setStrokes(slot.strokes, colors.ink);
    }
    return slot;
  };

  const placeDoc = (slot: (typeof docs)[number], tau: number) => {
    const mesh = slot.doc.mesh;
    mesh.visible = tau < DOC_OUT[1];
    let x = 0;
    let z = 0;
    let yaw = -0.05;
    if (tau < DOC_IN[1]) {
      const e = easeOut(progress(DOC_IN, tau));
      x = THREE.MathUtils.lerp(0.9, 0, e);
      z = THREE.MathUtils.lerp(0.08, 0, e);
      yaw = THREE.MathUtils.lerp(-0.42, -0.05, e);
    } else if (tau > DOC_OUT[0]) {
      const e = inOut(progress(DOC_OUT, tau));
      x = THREE.MathUtils.lerp(0, -1.05, e);
      z = THREE.MathUtils.lerp(0, -0.1, e);
      yaw = THREE.MathUtils.lerp(-0.05, 0.3, e);
    }
    mesh.position.set(x, 0.0006, z);
    mesh.rotation.y = yaw;
    mesh.updateMatrixWorld();
    STROKES.forEach((span, i) => slot.doc.reveal(i, progress(span, tau)));
  };

  // ---- The hand ----------------------------------------------------------------------------
  const { rig, marks, toArmature, aimSleeve } = await loadHand(
    options.handUrl,
    colors,
    options.grip,
  );
  scene.add(rig);
  // Pen tail up and back towards the writer's right shoulder; palm turned down and in.
  const penUp = new THREE.Vector3(0.42, 0.78, 0.46).normalize();
  const palmTo = new THREE.Vector3(-0.72, -0.55, -0.1);
  const palm = palmTo.addScaledVector(penUp, -palmTo.dot(penUp)).normalize();
  const third = new THREE.Vector3().crossVectors(palm, penUp);
  const handTurn = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(palm, penUp, third),
  );
  rig.quaternion.copy(handTurn);
  // The forearm runs back to the writer: right, towards the camera, a little up.
  aimSleeve(new THREE.Vector3(0.78, 0.26, 0.57).normalize(), handTurn);

  const world = (slot: (typeof docs)[number], p: Point) =>
    slot.doc.mesh.localToWorld(toLocal(p, 0.0008));
  const along = (points: Point[], t: number): Point => {
    const f = clamp01(t) * (points.length - 1);
    const i = Math.floor(f);
    const a = points[i] ?? points[0]!;
    const b = points[Math.min(points.length - 1, i + 1)] ?? a;
    const k = f - i;
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  };

  const tip = new THREE.Vector3();
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  const placeHand = (slot: (typeof docs)[number], tau: number, time: number) => {
    const ends = slot.strokes.map((points) => [
      world(slot, points[0]!),
      world(slot, points.at(-1)!),
    ]);
    const idle = REST.clone().add(new THREE.Vector3(0, Math.sin(time * 1.3) * 0.004, 0));
    let lift = 0;

    if (tau < HAND_IN[0] || tau >= HAND_OUT[1]) {
      tip.copy(idle);
    } else if (tau < HAND_IN[1]) {
      const e = inOut(progress(HAND_IN, tau));
      tip.lerpVectors(idle, ends[0]![0]!, e);
      lift = LIFT * (1 - e) * 1.5;
    } else if (tau >= HAND_OUT[0]) {
      const e = inOut(progress(HAND_OUT, tau));
      tip.lerpVectors(ends.at(-1)![1]!, idle, e);
      lift = LIFT * Math.sin(e * Math.PI * 0.5) * 2;
    } else {
      const k = STROKES.findIndex(([a, b]) => tau >= a && tau <= b);
      if (k >= 0) {
        const span = STROKES[k]!;
        const ease = k === 2 ? inOut : smooth;
        tip.copy(world(slot, along(slot.strokes[k]!, ease(progress(span, tau)))));
        lift = 0;
      } else {
        // Between strokes: an arc from the end of one to the start of the next.
        const next = Math.max(
          1,
          STROKES.findIndex(([a]) => tau < a),
        );
        const prevEnd = STROKES[next - 1]![1];
        const nextStart = STROKES[next]![0];
        const e = smooth(progress([prevEnd, nextStart], tau));
        from.copy(ends[next - 1]![1]!);
        to.copy(ends[next]![0]!);
        tip.lerpVectors(from, to, e);
        lift = LIFT * Math.sin(e * Math.PI);
      }
    }
    rig.position.copy(tip).add(new THREE.Vector3(0, lift, 0));
    // The hand leans a touch into its travel.
    const sway = Math.sin(time * 0.9) * 0.02;
    rig.quaternion
      .copy(handTurn)
      .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(sway, 0, sway * 0.5)));
  };

  // ---- Frame -----------------------------------------------------------------------------
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let width = 1;
  let height = 1;

  const frame = (time: number) => {
    const n = Math.floor(time / CYCLE);
    const tau = time - n * CYCLE;
    for (const slot of docs) slot.doc.mesh.visible = false;
    const prev = n - 1;
    if (prev >= 0 && tau + CYCLE < DOC_OUT[1]) placeDoc(pageFor(prev), tau + CYCLE);
    const current = pageFor(n);
    placeDoc(current, tau);
    placeHand(current, tau, time);

    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;
    const push = Math.sin(smooth(progress(PUSH, tau)) * Math.PI) * 0.16;
    camera.position
      .copy(base)
      .lerp(focus, push)
      .add(new THREE.Vector3(pointer.x * 0.05, -pointer.y * 0.025, 0));
    camera.lookAt(new THREE.Vector3().copy(look).lerp(focus.clone().setY(0), push * 0.6));
    renderer.render(scene, camera);
  };

  const resize = (w: number, h: number) => {
    width = Math.max(1, w);
    height = Math.max(1, h);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Wide: the page sits right of centre, leaving the left for the headline. Tall: page low.
    if (camera.aspect >= 1) {
      camera.fov = 30;
      base.set(-0.2, 0.84, 0.58);
      look.set(-0.21, 0, -0.01);
    } else {
      camera.fov = 42;
      base.set(0.03, 1.02, 0.42);
      look.set(0.03, 0, -0.1);
    }
    camera.updateProjectionMatrix();
  };

  // ---- Debug: the grip from three sides ------------------------------------------------
  if (options.debugGrip) {
    // Shown in the hand's own frame: fingers down (-Y), palm to -X, thumb on the -Z side.
    rig.quaternion.copy(toArmature);
    rig.position.set(0, 0, 0);
    rig.updateMatrixWorld(true);
    const centre = new THREE.Box3().setFromObject(rig).getCenter(new THREE.Vector3());
    rig.position.sub(centre);
    desk.visible = false;
    for (const m of marks) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.0025),
        new THREE.MeshBasicMaterial({ color: "#ff3b30" }),
      );
      dot.position.copy(m);
      rig.add(dot);
    }
    // Palm side, thumb side, pinky side, back of the hand.
    const views = [
      new THREE.Vector3(-0.42, 0.02, 0),
      new THREE.Vector3(0, 0.02, -0.42),
      new THREE.Vector3(0, 0.02, 0.42),
      new THREE.Vector3(0.42, 0.02, 0),
    ];
    return {
      resize,
      frame: () => {
        const w = width / 2;
        const h = height / 2;
        renderer.setScissorTest(true);
        views.forEach((v, i) => {
          const x = (i % 2) * w;
          const y = (i < 2 ? 1 : 0) * h;
          renderer.setViewport(x, y, w, h);
          renderer.setScissor(x, y, w, h);
          camera.aspect = w / h;
          camera.fov = 40;
          camera.position.copy(v);
          camera.lookAt(0, 0, 0);
          camera.updateProjectionMatrix();
          renderer.render(scene, camera);
        });
      },
      setPointer: () => {},
      dispose: () => renderer.dispose(),
    };
  }

  return {
    resize,
    frame,
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
