import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

import { type DocCopy, type Fonts, PaperDoc, type Palette, toLocal } from "../signataire/documents";
import { loadHand } from "../signataire/hand";
import { OTHER_HAND, paraphe, signature, strikeStroke } from "../signataire/strokes";

/*
  Table's 3D scene: the negotiation itself, seen from above a long walnut table under one pendant.
  Two parties face each other, each with a hand and a pen: ours near the camera (navy sleeve, navy
  ink), theirs across the table (grey sleeve, red ink). One contract goes back and forth: we strike
  a term and initial it, push it across (it spins to face them), they redline and initial theirs,
  it comes back to the middle, we sign, it turns, they sign, and it slides away. Then the next.

  As in Signataire, everything is a function of time within a looping cycle.
*/

export type TableColors = Palette & {
  wood: string;
  leather: string;
  floor: string;
  light: string;
  skin: string;
  lacquer: string;
  metal: string;
  sleeve: string;
  sleeveThem: string;
  cuff: string;
  inkThem: string;
};

type Options = {
  canvas: HTMLCanvasElement;
  copy: DocCopy[];
  fonts: Fonts;
  colors: TableColors;
  handUrl: string;
};

type Span = readonly [number, number];
type Pose = { x: number; z: number; yaw: number };

export const CYCLE = 12.4;
/** The reduced-motion still: both signatures down, the page still on the table. */
export const STILL_AT = 10.75;

const OFF_RIGHT: Pose = { x: 1.15, z: 0.24, yaw: -0.55 };
const NEAR: Pose = { x: 0.02, z: 0.255, yaw: -0.04 };
const FAR: Pose = { x: -0.02, z: -0.255, yaw: Math.PI - 0.04 };
const CENTRE: Pose = { x: 0, z: 0, yaw: 0 };
const CENTRE_TURNED: Pose = { x: 0, z: 0, yaw: Math.PI };
const OFF_LEFT: Pose = { x: -1.25, z: -0.04, yaw: Math.PI + 0.45 };
/** Where the page is, over the cycle; it eases between these. */
const PATH: [number, Pose][] = [
  [0, OFF_RIGHT],
  [1.0, NEAR],
  [2.7, NEAR],
  [3.65, FAR],
  [5.45, FAR],
  [6.45, CENTRE],
  [8.1, CENTRE],
  [8.9, CENTRE_TURNED],
  [10.7, CENTRE_TURNED],
  [11.9, OFF_LEFT],
];

/** Strokes, in order: [who, span]. 0 = us, 1 = them. */
const STROKES: [0 | 1, Span][] = [
  [0, [1.35, 1.65]], // we strike a term
  [0, [1.85, 2.25]], // and initial it
  [1, [4.05, 4.4]], // they strike one of theirs
  [1, [4.6, 5.0]], // and initial it
  [0, [6.75, 7.85]], // we sign
  [0, [7.93, 8.03]], // the flick
  [1, [9.3, 10.4]], // they sign
  [1, [10.5, 10.6]], // their flick
];
/** Each hand works in sessions: a run of its strokes, with an approach before and a retreat after. */
const SESSIONS: [0 | 1, number[]][] = [
  [0, [0, 1]],
  [1, [2, 3]],
  [0, [4, 5]],
  [1, [6, 7]],
];
const APPROACH = 0.6;
const RETREAT = 0.7;
const LIFT = 0.02;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const progress = ([a, b]: Span, t: number) => clamp01((t - a) / (b - a));
const smooth = (t: number) => t * t * (3 - 2 * t);
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

type Point = [number, number];

function woodTexture(base: string) {
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, c.width, c.height);
  // Long grain: many faint wavy lines along the board.
  let seed = 9;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 260; i++) {
    const y0 = r() * c.height;
    const amp = 2 + r() * 10;
    const freq = 0.002 + r() * 0.004;
    const phase = r() * 10;
    ctx.strokeStyle = r() > 0.5 ? "rgba(0,0,0,0.13)" : "rgba(255,220,180,0.05)";
    ctx.lineWidth = 0.6 + r() * 2.4;
    ctx.beginPath();
    for (let x = 0; x <= c.width; x += 16) {
      const y =
        y0 + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 3.1 + phase) * amp * 0.3;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export async function createTableScene({ canvas, copy, fonts, colors, handUrl }: Options) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(colors.floor);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.28;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 20);
  const base = new THREE.Vector3();
  const look = new THREE.Vector3();

  // ---- Room: floor, table, blotters, pendant ------------------------------------------------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: colors.floor, roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.76;
  floor.receiveShadow = true;
  scene.add(floor);

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.045, 1.15),
    new THREE.MeshStandardMaterial({
      map: woodTexture(colors.wood),
      roughness: 0.42,
      metalness: 0,
    }),
  );
  top.position.y = -0.0225;
  top.receiveShadow = true;
  top.castShadow = true;
  scene.add(top);

  for (const z of [0.31, -0.31]) {
    const blotter = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.004, 0.36),
      new THREE.MeshStandardMaterial({ color: colors.leather, roughness: 0.75 }),
    );
    blotter.position.set(0, 0.002, z);
    blotter.receiveShadow = true;
    scene.add(blotter);
  }

  const pendant = new THREE.SpotLight(colors.light, 14, 0, 0.62, 0.9, 2);
  pendant.position.set(-0.1, 1.5, 0.05);
  pendant.target.position.set(0, 0, 0);
  pendant.castShadow = true;
  pendant.shadow.mapSize.set(2048, 2048);
  pendant.shadow.bias = -0.0002;
  pendant.shadow.normalBias = 0.003;
  pendant.shadow.radius = 5;
  pendant.shadow.camera.near = 0.5;
  pendant.shadow.camera.far = 3;
  scene.add(pendant, pendant.target);
  scene.add(new THREE.HemisphereLight(colors.light, colors.floor, 0.16));

  // ---- Pages ---------------------------------------------------------------------------------
  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const slots = [0, 1].map(() => {
    const doc = new PaperDoc(anisotropy);
    doc.mesh.position.y = 0.006;
    scene.add(doc.mesh);
    return { doc, cycle: -1, strokes: [] as Point[][] };
  });
  const inks = STROKES.map(([who]) => (who === 0 ? colors.ink : colors.inkThem));
  const pageFor = (n: number) => {
    const slot = slots[((n % 2) + 2) % 2]!;
    if (slot.cycle !== n) {
      slot.cycle = n;
      const contract = copy[((n % copy.length) + copy.length) % copy.length]!;
      const m = slot.doc.print(contract, fonts, colors);
      const theirLine = m.strike.y + 74;
      const ours = signature(m.sign.x1, m.sign.x2, m.sign.y, 7);
      const theirs = signature(140, 520, m.sign.y, 23, OTHER_HAND);
      slot.strokes = [
        strikeStroke(m.strike.x1, m.strike.x2, m.strike.y),
        paraphe(m.margin.x, m.margin.y),
        strikeStroke(m.strike.x1 - 140, m.strike.x2 - 160, theirLine),
        paraphe(80, theirLine + 2),
        ours[0]!,
        ours[1]!,
        theirs[0]!,
        theirs[1]!,
      ];
      slot.doc.setStrokes(slot.strokes, inks);
    }
    return slot;
  };

  const poseAt = (tau: number): Pose => {
    for (let i = 0; i < PATH.length - 1; i++) {
      const [ta, a] = PATH[i]!;
      const [tb, b] = PATH[i + 1]!;
      if (tau <= tb) {
        const e = inOut(progress([ta, tb], tau));
        return {
          x: a.x + (b.x - a.x) * e,
          z: a.z + (b.z - a.z) * e + Math.sin(e * Math.PI) * (a.z === b.z ? 0 : 0.03),
          yaw: a.yaw + (b.yaw - a.yaw) * e,
        };
      }
    }
    return OFF_LEFT;
  };
  const placeDoc = (slot: (typeof slots)[number], tau: number) => {
    const pose = poseAt(tau);
    const mesh = slot.doc.mesh;
    mesh.visible = tau >= 0 && tau < PATH.at(-1)![0];
    mesh.position.set(pose.x, 0.006, pose.z);
    mesh.rotation.y = pose.yaw;
    mesh.updateMatrixWorld();
    STROKES.forEach(([, span], i) => slot.doc.reveal(i, progress(span, tau)));
  };

  // ---- Hands ---------------------------------------------------------------------------------
  const ours = await loadHand(handUrl, colors);
  const theirs = await loadHand(handUrl, { ...colors, sleeve: colors.sleeveThem });
  const penUp = new THREE.Vector3(0.42, 0.78, 0.46).normalize();
  const palmTo = new THREE.Vector3(-0.72, -0.55, -0.1);
  const palm = palmTo.addScaledVector(penUp, -palmTo.dot(penUp)).normalize();
  const turnUs = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(palm, penUp, new THREE.Vector3().crossVectors(palm, penUp)),
  );
  const half = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
  const turnThem = half.clone().multiply(turnUs);
  const forearm = new THREE.Vector3(0.78, 0.26, 0.57).normalize();
  ours.aimSleeve(forearm, turnUs);
  theirs.aimSleeve(forearm.clone().applyQuaternion(half), turnThem);
  ours.rig.quaternion.copy(turnUs);
  theirs.rig.quaternion.copy(turnThem);
  scene.add(ours.rig, theirs.rig);
  const hands = [
    { rig: ours.rig, turn: turnUs, rest: new THREE.Vector3(0.3, 0.07, 0.42) },
    { rig: theirs.rig, turn: turnThem, rest: new THREE.Vector3(-0.3, 0.07, -0.44) },
  ];

  const along = (points: Point[], t: number): Point => {
    const f = clamp01(t) * (points.length - 1);
    const i = Math.floor(f);
    const a = points[i] ?? points[0]!;
    const b = points[Math.min(points.length - 1, i + 1)] ?? a;
    const k = f - i;
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  };
  const world = (slot: (typeof slots)[number], p: Point) =>
    slot.doc.mesh.localToWorld(toLocal(p, 0.0008));

  const tip = new THREE.Vector3();
  const placeHand = (who: 0 | 1, slot: (typeof slots)[number], tau: number, time: number) => {
    const hand = hands[who]!;
    const idle = hand.rest
      .clone()
      .add(new THREE.Vector3(0, Math.sin(time * 1.2 + who * 2) * 0.004, 0));
    tip.copy(idle);
    let lift = 0;
    for (const [owner, strokes] of SESSIONS) {
      if (owner !== who) continue;
      const first = STROKES[strokes[0]!]![1];
      const last = STROKES[strokes.at(-1)!]![1];
      const start = first[0] - APPROACH;
      const end = last[1] + RETREAT;
      if (tau < start || tau > end) continue;
      const pts = strokes.map((i) => slot.strokes[i]!);
      const startOf = (k: number) => world(slot, pts[k]![0]!);
      const endOf = (k: number) => world(slot, pts[k]!.at(-1)!);
      if (tau < first[0]) {
        const e = inOut(progress([start, first[0]], tau));
        tip.lerpVectors(idle, startOf(0), e);
        lift = LIFT * 1.5 * (1 - e);
      } else if (tau > last[1]) {
        const e = inOut(progress([last[1], end], tau));
        tip.lerpVectors(endOf(strokes.length - 1), idle, e);
        lift = LIFT * 2 * Math.sin(e * Math.PI * 0.5);
      } else {
        const k = strokes.findIndex((i) => {
          const [a, b] = STROKES[i]![1];
          return tau >= a && tau <= b;
        });
        if (k >= 0) {
          const span = STROKES[strokes[k]!]![1];
          const ease = span[1] - span[0] > 0.8 ? inOut : smooth;
          tip.copy(world(slot, along(pts[k]!, ease(progress(span, tau)))));
        } else {
          const next = Math.max(
            1,
            strokes.findIndex((i) => tau < STROKES[i]![1][0]),
          );
          const e = smooth(
            progress([STROKES[strokes[next - 1]!]![1][1], STROKES[strokes[next]!]![1][0]], tau),
          );
          tip.lerpVectors(endOf(next - 1), startOf(next), e);
          lift = LIFT * Math.sin(e * Math.PI);
        }
      }
      break;
    }
    hand.rig.position.copy(tip).add(new THREE.Vector3(0, lift, 0));
    const sway = Math.sin(time * 0.9 + who) * 0.02;
    hand.rig.quaternion
      .copy(hand.turn)
      .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(sway, 0, sway * 0.5)));
  };

  // ---- Frame ---------------------------------------------------------------------------------
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const frame = (time: number) => {
    const n = Math.floor(time / CYCLE);
    const tau = time - n * CYCLE;
    for (const slot of slots) slot.doc.mesh.visible = false;
    const slot = pageFor(n);
    placeDoc(slot, tau);
    placeHand(0, slot, tau, time);
    placeHand(1, slot, tau, time);

    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;
    camera.position.copy(base).add(new THREE.Vector3(pointer.x * 0.06, -pointer.y * 0.03, 0));
    camera.lookAt(look);
    renderer.render(scene, camera);
  };

  return {
    frame,
    resize(width: number, height: number) {
      renderer.setSize(Math.max(1, width), Math.max(1, height), false);
      camera.aspect = Math.max(1, width) / Math.max(1, height);
      if (camera.aspect >= 1) {
        camera.fov = 30;
        look.set(-0.26, 0, 0.01);
        base.set(-0.26, 1.72, 1.02);
      } else {
        camera.fov = 44;
        look.set(0, 0, -0.24);
        base.set(0, 2.35, 0.95);
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
