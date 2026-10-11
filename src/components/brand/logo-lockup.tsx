import { type SVGProps } from "react";

import { LOGO_VIEWBOX, MARK_PARTS, MARK_VIEWBOX, WORD_IMPACT, WORD_PARTNERS } from "./logo-parts";

/*
  The logo built from its parts, for motion: every shape is its own path, so an animation can take
  the mark's three shapes and the wordmark's letters one by one ([data-shape], [data-letter]; lines
  as [data-line="0" | "1"]). Fill is currentColor. `part` picks the whole lockup, the mark or the
  wordmark alone.
*/
const WORD_VIEWBOX = "1395 160 1750 730";

type Props = SVGProps<SVGSVGElement> & { part?: "lockup" | "mark" | "word"; title?: string };

export function LogoLockup({ part = "lockup", title, ...props }: Props) {
  const viewBox = part === "mark" ? MARK_VIEWBOX : part === "word" ? WORD_VIEWBOX : LOGO_VIEWBOX;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {part === "word" ? null : (
        <g data-mark>
          {MARK_PARTS.map((shape, i) => (
            <path key={i} d={shape.d} data-shape={i} />
          ))}
        </g>
      )}
      {part === "mark" ? null : (
        <g data-word>
          {[WORD_IMPACT, WORD_PARTNERS].map((line, l) =>
            line.map((letter, i) => (
              <path key={`${l}-${i}`} d={letter.d} data-letter data-line={l} />
            )),
          )}
        </g>
      )}
    </svg>
  );
}
