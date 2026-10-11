import { type CSSProperties } from "react";

import styles from "./fil-domaines.module.css";

/*
  The five fields drawn by the thread. Each drawing stands on the thread's baseline (y = 120) and
  touches it where the line rises into the shape; the parts drawn in ink (`live`) move: the mast's
  signal, the screen's scan and play mark, parcels running out to the network's points, the
  projector's reels and beam, a signature written again and again.

  Viewbox units are pixels at the desktop size; strokes don't scale.
*/

const H = 120;

function Mast() {
  return (
    <svg viewBox={`0 0 150 ${H}`} width="150" height={H} aria-hidden="true">
      <path d="M44 121 L75 34 L106 121 M50.4 103 H99.6 M56.5 86 H93.5 M62.9 68 H87.1 M68.6 52 H81.4 M50.4 103 L93.5 86 L62.9 68 L81.4 52 M75 34 V24" />
      <circle cx="75" cy="18" r="4" className={styles.dot} />
      {[12, 22, 32].map((r, i) => {
        const dx = (r * 0.766).toFixed(2);
        const dy = (r * 0.643).toFixed(2);
        return (
          <path
            key={r}
            className={styles.wave}
            style={{ animationDelay: `${i * 0.28}s` }}
            d={`M${75 + +dx} ${18 - +dy} A${r} ${r} 0 0 1 ${75 + +dx} ${18 + +dy} M${75 - +dx} ${18 - +dy} A${r} ${r} 0 0 0 ${75 - +dx} ${18 + +dy}`}
          />
        );
      })}
    </svg>
  );
}

function Screen() {
  return (
    <svg viewBox={`0 0 170 ${H}`} width="170" height={H} aria-hidden="true">
      <rect x="18" y="36" width="134" height="68" rx="8" />
      <path d="M85 36 L66 11 M85 36 L104 11 M64 104 L54 121 M106 104 L116 121" />
      <circle cx="66" cy="10" r="2.5" className={styles.dot} />
      <circle cx="104" cy="10" r="2.5" className={styles.dot} />
      <path d="M77 57 V83 L99 70 Z" className={styles.play} />
      <path d="M24 44 H146" className={styles.scan} />
    </svg>
  );
}

const NODES = [
  [30, 30],
  [142, 24],
  [154, 84],
  [22, 92],
] as const;

function Network() {
  return (
    <svg viewBox={`0 0 176 ${H}`} width="176" height={H} aria-hidden="true">
      <path d={`M85 73 V121 ${NODES.map(([x, y]) => `M85 64 L${x} ${y}`).join(" ")}`} />
      {NODES.map(([x, y], i) => (
        <circle
          key={i}
          r="2.6"
          cx="85"
          cy="64"
          className={styles.parcel}
          style={
            {
              "--dx": `${x - 85}px`,
              "--dy": `${y - 64}px`,
              animationDelay: `${i * 0.45}s`,
            } as CSSProperties
          }
        />
      ))}
      {NODES.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5.5" className={styles.node} />
      ))}
      <circle cx="85" cy="64" r="9.5" className={styles.node} />
    </svg>
  );
}

function Reel({ x, y, r }: { x: number; y: number; r: number }) {
  const s = r * 0.62;
  return (
    <>
      <circle cx={x} cy={y} r={r} />
      <g className={styles.spin} style={{ transformOrigin: `${x}px ${y}px` }}>
        {[0, 60, 120].map((a) => {
          const dx = (Math.cos((a * Math.PI) / 180) * s).toFixed(2);
          const dy = (Math.sin((a * Math.PI) / 180) * s).toFixed(2);
          return <path key={a} d={`M${x - +dx} ${y - +dy} L${x + +dx} ${y + +dy}`} />;
        })}
      </g>
      <circle cx={x} cy={y} r="2.2" className={styles.dot} />
    </>
  );
}

function Projector() {
  return (
    <svg viewBox={`0 0 176 ${H}`} width="176" height={H} aria-hidden="true">
      <path d="M122 84 L172 62 V116 L122 96 Z" className={styles.beam} />
      <rect x="30" y="74" width="82" height="30" rx="4" />
      <path d="M48 104 L42 121 M94 104 L100 121 M52 68 V74 M96 64 V74 M112 82 H122 V98 H112" />
      <Reel x={52} y={46} r={22} />
      <Reel x={96} y={44} r={20} />
    </svg>
  );
}

function Page() {
  return (
    <svg viewBox={`0 0 150 ${H}`} width="150" height={H} aria-hidden="true">
      <path d="M34 121 V20 H92 L112 40 V121 M92 20 V40 H112" />
      <path d="M46 40 H80 M46 52 H98 M46 64 H90" className={styles.ruled} />
      <path
        pathLength={1}
        className={styles.sign}
        d="M44 98 C50 82 56 80 56 92 C56 102 50 104 52 94 C54 86 62 82 64 92 C65 98 70 98 74 88 C76 83 80 84 80 90 C80 94 84 94 90 88 L100 84"
      />
    </svg>
  );
}

const GLYPHS = [Mast, Screen, Network, Projector, Page] as const;

export function Glyph({ index }: { index: number }) {
  const Drawing = GLYPHS[index % GLYPHS.length]!;
  return <Drawing />;
}
