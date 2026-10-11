import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

/*
  The writing hand for Signataire: the WebXR "generic hand" (rigged, 25 joints, from
  immersive-web/webxr-input-profiles, MIT) posed into a tripod grip around a fountain pen.

  The model's joints are a flat list under the armature (no parent chain), each with an
  armature-space pose: fingers run along -Y, the palm faces -X, the thumb sits on the -Z side. Joint
  frames follow WebXR: -Z along the bone, +Y on the back of the finger, so a finger flexes about its
  own X axis. Posing is done here by hand: bending joint k rotates it and every joint after it in
  the chain about joint k.

  The returned `rig` has the pen's tip at its origin and the pen running up +Y, with the palm turned
  towards +X; place and orient the rig to write.
*/

const FINGERS = ["index-finger", "middle-finger", "ring-finger", "pinky-finger"] as const;
const SEGMENTS = ["phalanx-proximal", "phalanx-intermediate", "phalanx-distal", "tip"] as const;
const THUMB = ["thumb-metacarpal", "thumb-phalanx-proximal", "thumb-phalanx-distal", "thumb-tip"];

/** Flexion in degrees for the proximal, intermediate and distal joints. */
type Curl = [number, number, number];

export type Grip = {
  index: Curl;
  middle: Curl;
  ring: Curl;
  pinky: Curl;
  /** Thumb: opposition (about the joint's Y), then flexion of metacarpal, proximal, distal. */
  thumb: { oppose: number; curl: Curl };
  /** Where the pen crosses the hand, as offsets (armature space, metres) from the pinch point. */
  pinch: [number, number, number];
  /** Where the pen rests on the web between thumb and index (offset from the index knuckle). */
  rest: [number, number, number];
  /** How far the nib reaches past the pinch point, metres. */
  reach: number;
};

export const WRITING_GRIP: Grip = {
  index: [28, 38, 12],
  middle: [42, 52, 30],
  ring: [62, 72, 42],
  pinky: [70, 74, 42],
  thumb: { oppose: 18, curl: [8, 14, 18] },
  pinch: [-0.004, 0, 0],
  rest: [0.006, 0.012, -0.012],
  reach: 0.026,
};

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const deg = THREE.MathUtils.degToRad;

/** Rotate joint k of a chain about its own local axis, carrying the rest of the chain along. */
function bend(chain: THREE.Object3D[], k: number, axisLocal: THREE.Vector3, angle: number) {
  const pivot = chain[k];
  if (!pivot || angle === 0) return;
  const axis = axisLocal.clone().applyQuaternion(pivot.quaternion).normalize();
  const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
  const origin = pivot.position.clone();
  for (let i = k; i < chain.length; i++) {
    const node = chain[i];
    if (!node) continue;
    if (i > k) node.position.sub(origin).applyQuaternion(q).add(origin);
    node.quaternion.premultiply(q);
  }
}

export type PenColors = { lacquer: string; metal: string };

/** A fountain pen, tip at the origin, running up +Y. About 14.5 cm long. */
export function buildPen(colors: PenColors) {
  const pen = new THREE.Group();
  const lacquer = new THREE.MeshPhysicalMaterial({
    color: colors.lacquer,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: colors.metal,
    metalness: 1,
    roughness: 0.28,
  });

  const part = (geometry: THREE.BufferGeometry, material: THREE.Material, y: number) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = y;
    mesh.castShadow = true;
    pen.add(mesh);
    return mesh;
  };
  // Nib: a cone whose point is the origin.
  const nib = part(new THREE.ConeGeometry(0.0034, 0.016, 24), metal, 0.008);
  nib.rotation.x = Math.PI;
  part(new THREE.CylinderGeometry(0.0046, 0.0036, 0.022, 32), lacquer, 0.027);
  part(new THREE.CylinderGeometry(0.0052, 0.0052, 0.003, 32), metal, 0.0395);
  part(new THREE.CylinderGeometry(0.0058, 0.0052, 0.098, 32), lacquer, 0.09);
  part(new THREE.CylinderGeometry(0.006, 0.006, 0.0025, 32), metal, 0.1405);
  const end = part(
    new THREE.SphereGeometry(0.0058, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    lacquer,
    0.1418,
  );
  end.scale.y = 0.6;
  return pen;
}

export type HandColors = { skin: string; sleeve: string; cuff: string } & PenColors;

export async function loadHand(url: string, colors: HandColors, grip: Grip = WRITING_GRIP) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const model = gltf.scene;
  const joints = new Map<string, THREE.Object3D>();
  model.traverse((node) => {
    joints.set(node.name, node);
    const mesh = node as THREE.SkinnedMesh;
    if (mesh.isSkinnedMesh) {
      mesh.material = new THREE.MeshPhysicalMaterial({
        color: colors.skin,
        roughness: 0.62,
        sheen: 0.4,
        sheenRoughness: 0.5,
        sheenColor: new THREE.Color(colors.skin),
        clearcoat: 0.08,
      });
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      // Weld the UV seams so normals are smooth across them (no texture is used).
      const geometry = mesh.geometry;
      geometry.deleteAttribute("normal");
      geometry.deleteAttribute("uv");
      mesh.geometry = mergeVertices(geometry, 1e-5);
      mesh.geometry.computeVertexNormals();
      geometry.dispose();
    }
  });
  // A suit sleeve and shirt cuff over the wrist, where the model ends (armature space: the
  // forearm runs up +Y from the wrist).
  const armature = joints.get("Armature") ?? model;
  const wrist = joints.get("wrist")?.position ?? new THREE.Vector3(0.039, 0.056, 0.009);
  const cuff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.034, 0.05, 40, 1, true),
    new THREE.MeshStandardMaterial({ color: colors.cuff, roughness: 0.7, side: THREE.DoubleSide }),
  );
  cuff.scale.set(0.8, 1, 1);
  const sleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.047, 0.044, 0.5, 40, 1, true),
    new THREE.MeshStandardMaterial({
      color: colors.sleeve,
      roughness: 0.82,
      side: THREE.DoubleSide,
    }),
  );
  sleeve.scale.set(0.8, 1, 1);
  const link = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.003, 24),
    new THREE.MeshStandardMaterial({ color: colors.metal, metalness: 1, roughness: 0.3 }),
  );
  const arm = new THREE.Group();
  arm.position.set(wrist.x - 0.014, wrist.y + 0.012, wrist.z - 0.004);
  cuff.position.y = 0.022;
  sleeve.position.y = 0.27;
  link.rotation.z = Math.PI / 2;
  link.position.set(0.03, 0.03, -0.006);
  for (const part of [cuff, sleeve, link]) {
    part.castShadow = true;
    part.receiveShadow = true;
    arm.add(part);
  }
  armature.add(arm);

  const get = (name: string) => {
    const node = joints.get(name);
    if (!node) throw new Error(`hand: missing joint ${name}`);
    return node;
  };

  // ---- The grip --------------------------------------------------------------------------
  const curls: Record<(typeof FINGERS)[number], Curl> = {
    "index-finger": grip.index,
    "middle-finger": grip.middle,
    "ring-finger": grip.ring,
    "pinky-finger": grip.pinky,
  };
  for (const finger of FINGERS) {
    const chain = SEGMENTS.map((segment) => get(`${finger}-${segment}`));
    curls[finger].forEach((angle, k) => bend(chain, k, X, -deg(angle)));
  }
  const thumb = THUMB.map(get);
  bend(thumb, 0, Y, deg(grip.thumb.oppose));
  grip.thumb.curl.forEach((angle, k) => bend(thumb, k, X, -deg(angle)));
  model.updateMatrixWorld(true);

  // ---- Where the pen goes (armature space) ----------------------------------------------
  const p = (name: string) => get(name).position.clone();
  const pinch = p("index-finger-phalanx-distal")
    .lerp(p("index-finger-tip"), 0.55)
    .lerp(p("thumb-tip"), 0.5)
    .add(new THREE.Vector3(...grip.pinch));
  const rest = p("index-finger-phalanx-proximal")
    .lerp(p("thumb-phalanx-proximal"), 0.45)
    .add(new THREE.Vector3(...grip.rest));
  const down = pinch.clone().sub(rest).normalize(); // along the pen, towards the nib
  const tip = pinch.clone().addScaledVector(down, grip.reach);

  // Rig frame: +Y up the pen, +X the palm normal (-X in armature space) square to it.
  const up = down.clone().negate();
  const palm = new THREE.Vector3(-1, 0, 0);
  const side = palm.clone().addScaledVector(up, -palm.dot(up)).normalize();
  const third = new THREE.Vector3().crossVectors(side, up);
  const frame = new THREE.Matrix4().makeBasis(side, up, third);
  const toRig = new THREE.Quaternion().setFromRotationMatrix(frame).invert();

  model.quaternion.copy(toRig);
  model.position.copy(tip).applyQuaternion(toRig).negate();

  const rig = new THREE.Group();
  rig.add(model);
  rig.add(buildPen(colors));

  return {
    rig,
    /**
     * Points the sleeve along `direction` (world space) for a rig turned by `turn`: the forearm goes
     * back towards the writer whatever the grip does; the cuff hides the bend at the wrist.
     */
    aimSleeve(direction: THREE.Vector3, turn: THREE.Quaternion) {
      const toArmature = turn.clone().multiply(toRig).invert();
      const local = direction.clone().applyQuaternion(toArmature).normalize();
      arm.quaternion.setFromUnitVectors(Y, local);
    },
    /** Rig space to armature space, for debugging the grip in the hand's own frame. */
    toArmature: toRig.clone().invert(),
    /** Fingertips and pen points in rig space, for debugging the grip. */
    marks: [p("index-finger-tip"), p("thumb-tip"), pinch, rest].map((v) =>
      v.applyQuaternion(toRig).add(model.position),
    ),
  };
}
