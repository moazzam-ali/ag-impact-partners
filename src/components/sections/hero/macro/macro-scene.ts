import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";

import { type DocCopy, type Fonts, PaperDoc, type Palette, toLocal } from "../signataire/documents";
import { buildPen } from "../signataire/hand";
import { signature } from "../signataire/strokes";

/*
  Macro's 3D scene: a macro shot. The camera sits a few centimetres from a fountain pen's nib, low
  over the paper's tooth, with a shallow depth of field, and follows the nib as it writes the
  signature in wet ink that catches the light. Then the pen lifts and lies down beside the page, and
  the camera pulls back and up, the focus opening out, until the whole signed contract sits on the
  dark desk with the headline beside it.
*/

export type MacroColors = Palette & { desk: string; light: string; lacquer: string; metal: string };
type Options = { canvas: HTMLCanvasElement; copy: DocCopy; fonts: Fonts; colors: MacroColors };

type Span = readonly [number, number];
/** The signature, then the pen laid down, then the pull back. */
const WRITE: Span = [0.5, 4.3];
const LAY: Span = [4.3, 5.4];
const PULL: Span = [4.4, 7.4];
export const STILL_AT = 8;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const progress = ([a, b]: Span, t: number) => clamp01((t - a) / (b - a));
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

type Point = [number, number];

/** Paper tooth: fine noise, tiled many times over the page, used as a bump map. */
function toothTexture() {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  let seed = 3;
  for (let i = 0; i < size * size; i++) {
    seed = (seed * 16807) % 2147483647;
    const v = (110 + (seed / 2147483647) * 90) | 0;
    img.data.set([v, v, v, 255], i * 4);
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(26, 37);
  return t;
}

export function createMacroScene({ canvas, copy, fonts, colors }: Options) {
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
  scene.environmentIntensity = 0.45;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.002, 10);

  const desk = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    new THREE.MeshStandardMaterial({ color: colors.desk, roughness: 0.9 }),
  );
  desk.rotation.x = -Math.PI / 2;
  desk.receiveShadow = true;
  scene.add(desk);

  const key = new THREE.SpotLight(colors.light, 10, 0, 0.6, 0.9, 2);
  key.position.set(-0.45, 1.1, 0.25);
  key.target.position.set(0.02, 0, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.001;
  key.shadow.radius = 4;
  scene.add(key, key.target);
  // A low raking light across the paper, for the tooth and the wet ink's glint.
  const rake = new THREE.DirectionalLight(colors.light, 1.1);
  rake.position.set(0.6, 0.12, -0.3);
  scene.add(rake);
  scene.add(new THREE.HemisphereLight(colors.light, colors.desk, 0.15));

  // ---- The page and the ink ----------------------------------------------------------------
  const doc = new PaperDoc(renderer.capabilities.getMaxAnisotropy());
  const marks = doc.print(copy, fonts, colors);
  doc.mesh.material.bumpMap = toothTexture();
  doc.mesh.material.bumpScale = 0.6;
  doc.mesh.position.set(0, 0.0006, 0);
  doc.mesh.rotation.y = -0.03;
  scene.add(doc.mesh);
  const strokes = signature(marks.sign.x1, marks.sign.x2, marks.sign.y);
  doc.setStrokes(strokes, colors.ink, 0.0011);
  // Wet ink: glossy while it is fresh, drying to matte once the pen has moved on.
  const wet = new THREE.MeshPhysicalMaterial({
    color: colors.ink,
    roughness: 0.25,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  });
  doc.mesh.children.forEach((child) => {
    (child as THREE.Mesh).material = wet;
  });
  doc.mesh.updateMatrixWorld();
  const world = (p: Point) => doc.mesh.localToWorld(toLocal(p, 0.0009));
  const body = strokes[0]!;
  const flick = strokes[1]!;
  const along = (points: Point[], t: number): Point => {
    const f = clamp01(t) * (points.length - 1);
    const i = Math.floor(f);
    const a = points[i] ?? points[0]!;
    const b = points[Math.min(points.length - 1, i + 1)] ?? a;
    return [a[0] + (b[0] - a[0]) * (f - i), a[1] + (b[1] - a[1]) * (f - i)];
  };

  // ---- The pen, writing without a hand: in macro only the nib and barrel are in frame ----
  const pen = buildPen(colors);
  pen.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
  });
  scene.add(pen);
  const writingUp = new THREE.Vector3(0.55, 0.74, -0.38).normalize();
  const writing = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), writingUp);
  // Laid down in front of the page, along its bottom edge, nib to the left.
  const resting = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, 0.1, -Math.PI / 2 + 0.006),
  );
  const restAt = new THREE.Vector3(-0.06, 0.006, 0.172);

  // ---- Camera and focus ------------------------------------------------------------------------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = new BokehPass(scene, camera, { focus: 0.05, aperture: 0.012, maxblur: 0.012 });
  composer.addPass(bokeh);
  composer.addPass(new OutputPass());
  const uniforms = bokeh.uniforms as unknown as Record<
    "focus" | "aperture" | "maxblur",
    { value: number }
  >;

  const nib = new THREE.Vector3();
  const follow = new THREE.Vector3();
  const macroOffset = new THREE.Vector3(-0.05, 0.026, 0.036);
  const wide = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let followed = false;

  const frame = (t: number) => {
    // Where the nib is.
    const w = progress(WRITE, t);
    const ink = Math.min(1, w / 0.86);
    const flickT = clamp01((w - 0.9) / 0.1);
    doc.reveal(0, inOut(ink));
    doc.reveal(1, flickT);
    if (w < 0.86) nib.copy(world(along(body, inOut(ink))));
    else if (w < 0.9)
      nib.lerpVectors(world(body.at(-1)!), world(flick[0]!), (w - 0.86) / 0.04).y += 0.006;
    else nib.copy(world(along(flick, flickT)));
    wet.roughness = 0.25 + 0.6 * clamp01((t - WRITE[1]) / 2);
    wet.clearcoat = 1 - clamp01((t - WRITE[1]) / 2);

    // The pen: writing, then lifted and laid down.
    const lay = inOut(progress(LAY, t));
    pen.position.lerpVectors(nib, restAt, lay);
    pen.position.y += Math.sin(lay * Math.PI) * 0.05;
    pen.quaternion.slerpQuaternions(writing, resting, lay);

    // The camera follows the nib closely, then pulls back to the whole page.
    if (!followed) {
      follow.copy(nib);
      followed = true;
    }
    follow.lerp(nib, 0.08);
    const pull = inOut(progress(PULL, t));
    const macroPos = follow.clone().add(macroOffset);
    camera.position.lerpVectors(macroPos, wide.pos, pull);
    camera.position.add(new THREE.Vector3(pointer.x * 0.04 * pull, -pointer.y * 0.02 * pull, 0));
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;
    const look = follow.clone().lerp(wide.look, pull);
    camera.lookAt(look);
    camera.fov = THREE.MathUtils.lerp(26, 30, pull);
    camera.updateProjectionMatrix();

    uniforms.focus.value = camera.position.distanceTo(look);
    uniforms.aperture.value = THREE.MathUtils.lerp(0.02, 0.0004, pull);
    uniforms.maxblur.value = THREE.MathUtils.lerp(0.014, 0.002, pull);
    composer.render();
  };

  return {
    frame,
    resize(width: number, height: number) {
      const w = Math.max(1, width);
      const h = Math.max(1, height);
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      camera.aspect = w / h;
      if (camera.aspect >= 1) {
        wide.look.set(-0.17, 0, 0.0);
        wide.pos.set(-0.17, 0.58, 0.44);
      } else {
        wide.look.set(0.01, 0, -0.06);
        wide.pos.set(0.01, 1.05, 0.5);
      }
      camera.updateProjectionMatrix();
    },
    setPointer(x: number, y: number) {
      pointer.tx = x;
      pointer.ty = y;
    },
    dispose() {
      composer.dispose();
      renderer.dispose();
      pmrem.dispose();
    },
  };
}
