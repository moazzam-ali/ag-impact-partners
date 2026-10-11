import * as THREE from "three";

/*
  Salle's scene: Paris at dusk drawn in hairlines, generated, not modelled. A boulevard of
  Haussmann blocks (cornices, windows, balconies, mansard roofs with dormers, chimneys), a second
  ring of roofs behind, the Eiffel Tower in the distance. One window on the right is lit. The
  camera takes one continuous move, driven by scroll: over the roofs, down the boulevard, through
  the lit window, and onto the table inside, where two lines run in from either end and meet.

  Units are metres. The street runs away from the camera along -z; facades face it at x = ±11.
*/

export type SalleColors = { bg: string; line: string; accent: string };

const STREET = 11;
const GROUND = 4;
const STOREY = 3.2;
const floorY = (f: number) => (f === 0 ? 0 : GROUND + (f - 1) * STOREY);

/** The lit window and the room behind it. */
const WINDOW = { z: -70, floor: 3, width: 1.4, height: 2.2 };
const ROOM = {
  x0: STREET,
  x1: STREET + 9,
  z0: WINDOW.z - 5,
  z1: WINDOW.z + 5,
  y: floorY(WINDOW.floor),
};
const TABLE = { x0: ROOM.x0 + 2.2, x1: ROOM.x1 - 1.6, z: WINDOW.z, half: 0.8, top: ROOM.y + 0.75 };

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

class Lines {
  points: number[] = [];
  seg(a: [number, number, number], b: [number, number, number]) {
    this.points.push(...a, ...b);
  }
  rect(x: number, y0: number, y1: number, z0: number, z1: number) {
    this.seg([x, y0, z0], [x, y0, z1]);
    this.seg([x, y0, z1], [x, y1, z1]);
    this.seg([x, y1, z1], [x, y1, z0]);
    this.seg([x, y1, z0], [x, y0, z0]);
  }
  box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) {
    for (const y of [y0, y1]) {
      this.seg([x0, y, z0], [x1, y, z0]);
      this.seg([x1, y, z0], [x1, y, z1]);
      this.seg([x1, y, z1], [x0, y, z1]);
      this.seg([x0, y, z1], [x0, y, z0]);
    }
    for (const [x, z] of [
      [x0, z0],
      [x1, z0],
      [x1, z1],
      [x0, z1],
    ] as const) {
      this.seg([x, y0, z], [x, y1, z]);
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.points, 3));
    return g;
  }
}

/** One Haussmann block facing the street: `side` -1 left, 1 right; z0 > z1 (z0 nearer). */
function building(
  ink: Lines,
  r: () => number,
  side: -1 | 1,
  z0: number,
  z1: number,
  floors: number,
  detail: boolean,
  skip?: (floor: number, z: number) => boolean,
) {
  const fx = side * STREET;
  const depth = 14;
  const bx = fx + side * depth;
  const top = floorY(floors);
  const [xa, xb] = side > 0 ? [fx, bx] : [bx, fx];
  ink.box(xa, xb, 0, top, z1, z0);

  // The mansard: set back 2 m, 4 m high, with chimneys on the ridge.
  const inset = 2;
  const roof = top + 4;
  const fi = fx + side * inset;
  const bi = bx - side * inset;
  ink.seg([fi, roof, z0], [fi, roof, z1]);
  ink.seg([bi, roof, z0], [bi, roof, z1]);
  ink.seg([fi, roof, z0], [bi, roof, z0]);
  ink.seg([fi, roof, z1], [bi, roof, z1]);
  ink.seg([fx, top, z0], [fi, roof, z0]);
  ink.seg([fx, top, z1], [fi, roof, z1]);
  ink.seg([bx, top, z0], [bi, roof, z0]);
  ink.seg([bx, top, z1], [bi, roof, z1]);
  const chimneys = 1 + Math.floor(r() * 3);
  for (let c = 0; c < chimneys; c++) {
    const cz = z1 + (z0 - z1) * (0.2 + 0.6 * r());
    const cx = (fi + bi) / 2 + (r() - 0.5) * 4;
    ink.box(cx - 0.6, cx + 0.6, roof, roof + 1.6 + r(), cz - 0.4, cz + 0.4);
  }
  if (!detail) return;

  // Facade: cornices, windows, balconies on the 2nd and 5th floors, dormers in the roof.
  const bays = Math.max(2, Math.floor((z0 - z1) / 3.1));
  const bay = (z0 - z1) / bays;
  for (let f = 1; f <= floors; f++) ink.seg([fx, floorY(f), z0], [fx, floorY(f), z1]);
  for (let f = 0; f < floors; f++) {
    for (let b = 0; b < bays; b++) {
      const zc = z0 - bay * (b + 0.5);
      if (skip?.(f, zc)) continue;
      const y0 = floorY(f) + (f === 0 ? 0 : 0.9);
      const y1 = f === 0 ? GROUND - 0.6 : y0 + 2.2;
      const w = f === 0 ? bay * 0.36 : 0.7;
      ink.rect(fx, y0, y1, zc - w, zc + w);
    }
    if (f === 2 || f === 5) {
      const out = fx - side * 0.7;
      const y = floorY(f);
      ink.seg([out, y, z0], [out, y, z1]);
      ink.seg([out, y + 1, z0], [out, y + 1, z1]);
      for (let b = 0; b <= bays; b++) {
        const z = z0 - bay * b;
        ink.seg([out, y, z], [out, y + 1, z]);
        ink.seg([fx, y, z], [out, y, z]);
      }
    }
  }
  for (let b = 0; b < bays; b++) {
    const zc = z0 - bay * (b + 0.5);
    const dx = fx + side * 1.1;
    ink.rect(dx, top + 1.2, top + 2.8, zc - 0.5, zc + 0.5);
  }
}

/** The Eiffel Tower, simplified: four tapering legs, platforms, bracing, the arches at its foot. */
function tower(ink: Lines, cx: number, cz: number) {
  const half = (y: number) => 4 + 58 * Math.exp(-y / 62);
  const levels = [0, 20, 40, 57, 80, 115, 160, 210, 250, 276];
  const corners = [
    [1, 1],
    [1, -1],
    [-1, -1],
    [-1, 1],
  ] as const;
  for (const [sx, sz] of corners) {
    for (let i = 0; i < levels.length - 1; i++) {
      const a = levels[i]!;
      const b = levels[i + 1]!;
      ink.seg([cx + sx * half(a), a, cz + sz * half(a)], [cx + sx * half(b), b, cz + sz * half(b)]);
    }
  }
  for (const y of [57, 115, 276]) {
    const h = half(y) + (y === 276 ? 0 : 3);
    ink.box(cx - h, cx + h, y, y + (y === 276 ? 8 : 4), cz - h, cz + h);
  }
  ink.seg([cx, 284, cz], [cx, 300, cz]);
  // Bracing on each face between levels.
  for (let i = 0; i < levels.length - 1; i++) {
    const a = levels[i]!;
    const b = levels[i + 1]!;
    for (let k = 0; k < 4; k++) {
      const [ax, az] = corners[k]!;
      const [bx2, bz2] = corners[(k + 1) % 4]!;
      ink.seg(
        [cx + ax * half(a), a, cz + az * half(a)],
        [cx + bx2 * half(b), b, cz + bz2 * half(b)],
      );
      ink.seg(
        [cx + bx2 * half(a), a, cz + bz2 * half(a)],
        [cx + ax * half(b), b, cz + az * half(b)],
      );
    }
  }
  // The arches between the legs.
  for (let k = 0; k < 4; k++) {
    const [ax, az] = corners[k]!;
    const [bx2, bz2] = corners[(k + 1) % 4]!;
    let prev: [number, number, number] | null = null;
    for (let s = 0; s <= 16; s++) {
      const t = s / 16;
      const y = 4 + Math.sin(t * Math.PI) * 34;
      const h = half(y) * 0.98;
      const x = cx + (ax + (bx2 - ax) * t) * h;
      const z = cz + (az + (bz2 - az) * t) * h;
      const p: [number, number, number] = [x, y, z];
      if (prev) ink.seg(prev, p);
      prev = p;
    }
  }
}

function glowTexture(color: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Lines that only show below `reveal` (world y), so the city can draw itself upwards. */
function revealing(material: THREE.LineBasicMaterial, reveal: { value: number }) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uReveal = reveal;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vWorldY;")
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nvWorldY = (modelMatrix * vec4(position, 1.0)).y;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying float vWorldY;\nuniform float uReveal;",
      )
      .replace("void main() {", "void main() {\n  if (vWorldY > uReveal) discard;");
  };
  return material;
}

export function createSalleScene(canvas: HTMLCanvasElement, colors: SalleColors) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(colors.bg);
  scene.fog = new THREE.Fog(colors.bg, 40, 520);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 2000);
  const reveal = { value: -1 };

  // ---- The city -------------------------------------------------------------------------------
  const r = rng(3);
  const ink = new Lines();
  const isLit = (f: number, z: number) => f === WINDOW.floor && Math.abs(z - WINDOW.z) < 1.6;
  for (const side of [-1, 1] as const) {
    let z = 30;
    while (z > -320) {
      const w = 14 + r() * 9;
      const floors = 6 + (r() > 0.7 ? 1 : 0);
      const hasLit = side === 1 && z > WINDOW.z && z - w - 1 < WINDOW.z;
      building(ink, r, side, z, z - w, floors, true, hasLit ? isLit : undefined);
      z -= w + 0.6;
    }
    // A second ring behind, roofs only, for the skyline.
    z = 10;
    while (z > -380) {
      const w = 18 + r() * 14;
      const offset = side * (16 + r() * 4);
      const lines = new Lines();
      building(lines, r, side, z, z - w, 6 + Math.floor(r() * 2), false);
      for (let i = 0; i < lines.points.length; i += 3) lines.points[i]! += offset;
      ink.points.push(...lines.points);
      z -= w + 1;
    }
  }
  const lineMaterial = revealing(
    new THREE.LineBasicMaterial({ color: colors.line, transparent: true, opacity: 0.55 }),
    reveal,
  );
  scene.add(new THREE.LineSegments(ink.geometry(), lineMaterial));

  // The tower stands beyond the fog: drawn faint, unfogged, on the skyline.
  const far = new Lines();
  tower(far, 230, -640);
  const towerMaterial = revealing(
    new THREE.LineBasicMaterial({
      color: colors.line,
      transparent: true,
      opacity: 0.3,
      fog: false,
    }),
    reveal,
  );
  scene.add(new THREE.LineSegments(far.geometry(), towerMaterial));

  // ---- The lit window and the room --------------------------------------------------------
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(WINDOW.width, WINDOW.height),
    new THREE.MeshBasicMaterial({
      color: colors.accent,
      transparent: true,
      opacity: 0.85,
      fog: false,
    }),
  );
  glass.rotation.y = -Math.PI / 2;
  glass.position.set(STREET + 0.02, floorY(WINDOW.floor) + 0.9 + WINDOW.height / 2, WINDOW.z);
  scene.add(glass);
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(colors.accent),
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      fog: false,
    }),
  );
  glow.scale.set(9, 9, 1);
  glow.position.copy(glass.position).add(new THREE.Vector3(-0.3, 0, 0));
  scene.add(glow);

  const room = new Lines();
  const yTop = ROOM.y + STOREY - 0.2;
  room.box(ROOM.x0 + 0.05, ROOM.x1, ROOM.y, yTop, ROOM.z0, ROOM.z1);
  // The table, its legs, and three chairs a side.
  room.box(
    TABLE.x0,
    TABLE.x1,
    TABLE.top - 0.05,
    TABLE.top,
    TABLE.z - TABLE.half,
    TABLE.z + TABLE.half,
  );
  for (const x of [TABLE.x0 + 0.2, TABLE.x1 - 0.2]) {
    for (const z of [TABLE.z - TABLE.half + 0.2, TABLE.z + TABLE.half - 0.2]) {
      room.seg([x, ROOM.y, z], [x, TABLE.top - 0.05, z]);
    }
  }
  for (let k = 0; k < 3; k++) {
    const x = TABLE.x0 + 0.9 + k * ((TABLE.x1 - TABLE.x0 - 1.8) / 2);
    for (const s of [-1, 1]) {
      const z = TABLE.z + s * (TABLE.half + 0.5);
      room.box(x - 0.25, x + 0.25, ROOM.y + 0.45, ROOM.y + 0.47, z - 0.25, z + 0.25);
      room.seg([x - 0.25, ROOM.y + 0.47, z + s * 0.25], [x - 0.25, ROOM.y + 1.0, z + s * 0.25]);
      room.seg([x + 0.25, ROOM.y + 0.47, z + s * 0.25], [x + 0.25, ROOM.y + 1.0, z + s * 0.25]);
      room.seg([x - 0.25, ROOM.y + 1.0, z + s * 0.25], [x + 0.25, ROOM.y + 1.0, z + s * 0.25]);
      for (const dx of [-0.25, 0.25]) {
        for (const dz of [-0.25, 0.25]) {
          room.seg([x + dx, ROOM.y, z + dz], [x + dx, ROOM.y + 0.45, z + dz]);
        }
      }
    }
  }
  // A pendant over the table.
  const lx = (TABLE.x0 + TABLE.x1) / 2;
  room.seg([lx, yTop, TABLE.z], [lx, yTop - 0.9, TABLE.z]);
  room.box(lx - 0.35, lx + 0.35, yTop - 1.05, yTop - 0.9, TABLE.z - 0.15, TABLE.z + 0.15);
  scene.add(
    new THREE.LineSegments(
      room.geometry(),
      new THREE.LineBasicMaterial({
        color: colors.accent,
        transparent: true,
        opacity: 0.7,
        fog: false,
      }),
    ),
  );

  // The two lines on the table, from either end towards the middle.
  const meetGeometry = new THREE.BufferGeometry();
  const meet = new Float32Array(12);
  meetGeometry.setAttribute("position", new THREE.BufferAttribute(meet, 3));
  const thread = new THREE.LineSegments(
    meetGeometry,
    new THREE.LineBasicMaterial({ color: colors.accent, fog: false }),
  );
  scene.add(thread);

  // ---- The camera move ---------------------------------------------------------------------
  const wy = glass.position.y;
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 74, 70),
    new THREE.Vector3(1, 46, 6),
    new THREE.Vector3(3, 22, -42),
    new THREE.Vector3(6, wy + 0.4, -64),
    new THREE.Vector3(10.4, wy, WINDOW.z),
    new THREE.Vector3(13.4, TABLE.top + 2.9, WINDOW.z + 0.3),
  ]);
  const aim = new THREE.CatmullRomCurve3([
    new THREE.Vector3(18, 30, -260),
    new THREE.Vector3(4, 18, -110),
    new THREE.Vector3(10, wy, -72),
    new THREE.Vector3(STREET, wy, WINDOW.z),
    new THREE.Vector3(STREET + 4, wy - 0.4, WINDOW.z),
    new THREE.Vector3(lx + 0.6, TABLE.top, WINDOW.z),
  ]);
  const pos = new THREE.Vector3();
  const target = new THREE.Vector3();

  return {
    /** `p` 0–1 along the move; `drawn` 0–1 the city drawing itself upwards; `time` for drift. */
    frame(p: number, drawn: number, time: number) {
      reveal.value = -1 + drawn * 330;
      const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      path.getPointAt(e, pos);
      aim.getPointAt(e, target);
      // A slow drift so the still frame breathes.
      pos.x += Math.sin(time * 0.2) * 0.6 * (1 - p);
      pos.y += Math.sin(time * 0.27) * 0.4 * (1 - p);
      camera.position.copy(pos);
      camera.lookAt(target);
      camera.fov = THREE.MathUtils.lerp(48, 58, Math.max(0, (p - 0.7) / 0.3));
      camera.updateProjectionMatrix();

      // Once inside, the city recedes so the room and the table carry the frame.
      const inside = Math.min(1, Math.max(0, (p - 0.72) / 0.14));
      lineMaterial.opacity = 0.55 - inside * 0.45;
      towerMaterial.opacity = 0.3 * (1 - inside);

      // The lines on the table run in from either end and meet over the last stretch.
      const k = Math.min(1, Math.max(0, (p - 0.86) / 0.12));
      const mid = (TABLE.x0 + TABLE.x1) / 2;
      const y = TABLE.top + 0.002;
      meet.set(
        [TABLE.x0 + 0.1, y, TABLE.z, TABLE.x0 + 0.1 + (mid - TABLE.x0 - 0.1) * k, y, TABLE.z],
        0,
      );
      meet.set(
        [TABLE.x1 - 0.1, y, TABLE.z, TABLE.x1 - 0.1 - (TABLE.x1 - 0.1 - mid) * k, y, TABLE.z],
        6,
      );
      meetGeometry.attributes.position!.needsUpdate = true;
      thread.visible = k > 0;

      renderer.render(scene, camera);
    },
    resize(width: number, height: number) {
      renderer.setSize(Math.max(1, width), Math.max(1, height), false);
      camera.aspect = Math.max(1, width) / Math.max(1, height);
      camera.updateProjectionMatrix();
    },
    dispose() {
      renderer.dispose();
    },
  };
}
