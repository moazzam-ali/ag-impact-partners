import { type CSSProperties } from "react";

import styles from "./fil-domaines.module.css";

/*
  One small line icon per field, on a 32-unit grid, each with one quiet moving part in ink: the
  mast's signal, the screen's play mark, parcels running out to the network's points, the reel
  turning, a signature written again and again. Strokes don't scale.
*/

function Mast() {
  return (
    <>
      <path d="M11 29 L16 12 L21 29 M12.6 23.4 H19.4 M14.2 17.8 H17.8 M12.6 23.4 L17.8 17.8" />
      <circle cx="16" cy="8" r="1.7" className={styles.dot} />
      {[5, 9].map((r, i) => {
        const dx = +(r * 0.766).toFixed(2);
        const dy = +(r * 0.643).toFixed(2);
        return (
          <path
            key={r}
            className={styles.wave}
            style={{ animationDelay: `${i * 0.3}s` }}
            d={`M${16 + dx} ${8 - dy} A${r} ${r} 0 0 1 ${16 + dx} ${8 + dy} M${16 - dx} ${8 - dy} A${r} ${r} 0 0 0 ${16 - dx} ${8 + dy}`}
          />
        );
      })}
    </>
  );
}

function Screen() {
  return (
    <>
      <rect x="4" y="9" width="24" height="15" rx="2.5" />
      <path d="M16 9 L12 4 M16 9 L20 4 M11.5 28 H20.5 M16 24 V28" />
      <path d="M14 13 V20 L20 16.5 Z" className={styles.play} />
    </>
  );
}

const NODES = [
  [6, 7],
  [26, 7],
  [26, 25],
  [6, 25],
] as const;

function Network() {
  return (
    <>
      <path d={NODES.map(([x, y]) => `M16 16 L${x} ${y}`).join(" ")} />
      {NODES.map(([x, y], i) => (
        <circle
          key={`p${i}`}
          r="1.2"
          cx="16"
          cy="16"
          className={styles.parcel}
          style={
            {
              "--dx": `${x - 16}px`,
              "--dy": `${y - 16}px`,
              animationDelay: `${i * 0.45}s`,
            } as CSSProperties
          }
        />
      ))}
      {NODES.map(([x, y], i) => (
        <circle key={`n${i}`} cx={x} cy={y} r="2.2" className={styles.node} />
      ))}
      <circle cx="16" cy="16" r="3.4" className={styles.node} />
    </>
  );
}

function Reel() {
  return (
    <>
      <circle cx="16" cy="16" r="12" />
      <g className={styles.spin} style={{ transformOrigin: "16px 16px" }}>
        {[0, 72, 144, 216, 288].map((a) => (
          <circle
            key={a}
            cx={+(16 + Math.cos((a * Math.PI) / 180) * 6.4).toFixed(2)}
            cy={+(16 + Math.sin((a * Math.PI) / 180) * 6.4).toFixed(2)}
            r="2.2"
          />
        ))}
      </g>
      <circle cx="16" cy="16" r="1.2" className={styles.dot} />
    </>
  );
}

function Page() {
  return (
    <>
      <path d="M8 3.5 H19 L25 9.5 V28.5 H8 Z M19 3.5 V9.5 H25" />
      <path d="M11.5 13 H18.5 M11.5 17 H21.5" className={styles.ruled} />
      <path
        pathLength={1}
        className={styles.sign}
        d="M11.5 24.5 C13 21 14.5 21 14.5 23.5 C14.5 25.5 16.5 25 17.5 22.5 C18.5 20.5 19.5 21.5 19.5 23.5 C19.5 25 21 24.5 22 23"
      />
    </>
  );
}

const ICONS = [Mast, Screen, Network, Reel, Page] as const;

export function FieldIcon({ index }: { index: number }) {
  const Drawing = ICONS[index % ICONS.length]!;
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <Drawing />
    </svg>
  );
}
