"use client";

import { useSyncExternalStore } from "react";

import { type gsap } from "@/lib/motion/gsap";
import { type Loader } from "@/lib/motion/curtain";

/*
  The curtain styles under review: each is a splash (logo build-up, loader, reveal) and the matching
  page transition, one movement that covers the page and carries on to reveal the next, with no
  logo on it. Read order: ?curtain= in the URL, then localStorage, then
  the default; choosing one in the switcher stores it and reloads, so the splash plays again.

  - fil: the thread. A hairline across the screen; the mark rises above it, the wordmark hangs
    below, the line fills as the page loads; then the screen parts along it, top and bottom, like
    two sides of the table.
  - sommet: the peak as a window. Peach floods in, the mark assembles from its three shapes, a big
    count; then the page is seen through the mark, which grows until it is all page.
  - feuillets: sheets. Ink, peach and paper sheets slide up with curved edges; the lockup builds on
    the paper and a signature is written as the loader; then the sheets lift away one by one.
  - esquisse: the loader traces the mark shape by shape, each filling as it closes, inside four
    crop marks; the wordmark rises line by line; a hairline counts. Then the wordmark sinks, the mark
    becomes a window onto the page and opens (as in sommet), its edge drawn in a hairline.
  - iris: an ink disc opens from the centre with a fine accent ring at its edge; the lockup is
    traced and set in the page's colour on it. Then the iris closes onto the mark. Page changes
    open the iris from the link that was clicked and close it on the next page.
  - biais: the lockup is traced on the page colour with a caption under the hairline; the curtain
    leaves on the bias of the A's leg, a hairline of accent on its edge, the lockup held still as
    the edge crosses it.
  - feuille: one sheet of paper, a rim of accent leading its curved edge, rises over the page; the
    lockup is traced on it and drifts against its movement; the sheet lifts away, the rim trailing.
  - tourne: a page turn. Ink, then paper slide in from the right, their leading edges curved; the
    lockup is traced on the paper; then they carry on out to the left, trailing edges curving.
*/
export const CURTAIN_STYLES = [
  "fil",
  "sommet",
  "feuillets",
  "esquisse",
  "iris",
  "biais",
  "feuille",
  "tourne",
] as const;
export type CurtainStyle = (typeof CURTAIN_STYLES)[number];
export const DEFAULT_CURTAIN: CurtainStyle = "fil";

/** What each style does; MotionShell runs them. `onReveal` fires as the page starts to show. */
export type CurtainHandle = {
  splash(loader: Loader, onReveal: () => void): Promise<void>;
  /**
   * A page change: cover, change page at the covered moment (`go`), reveal; no rest between.
   * `from` is where the link was clicked, for styles that start there.
   */
  swap(
    go: () => Promise<void>,
    onReveal: () => void,
    from?: { x: number; y: number },
  ): Promise<void>;
};

export const isCurtainStyle = (value: unknown): value is CurtainStyle =>
  typeof value === "string" && (CURTAIN_STYLES as readonly string[]).includes(value);

const STORAGE_KEY = "agi:curtain";
let current: CurtainStyle | null = null;

function read(): CurtainStyle {
  if (current) return current;
  const fromUrl = new URLSearchParams(window.location.search).get("curtain");
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
    if (isCurtainStyle(fromUrl)) window.localStorage.setItem(STORAGE_KEY, fromUrl);
  } catch {
    // Storage can be unavailable; the URL and the default still work.
  }
  current = isCurtainStyle(fromUrl) ? fromUrl : isCurtainStyle(stored) ? stored : DEFAULT_CURTAIN;
  return current;
}

export function useCurtainStyle() {
  return useSyncExternalStore(
    () => () => {},
    read,
    () => DEFAULT_CURTAIN,
  );
}

/** Stores the choice and reloads without ?curtain=, so the new splash plays from the start. */
export function chooseCurtain(style: CurtainStyle) {
  try {
    window.localStorage.setItem(STORAGE_KEY, style);
  } catch {
    // Without storage the URL carries it.
  }
  const url = new URL(window.location.href);
  url.searchParams.set("curtain", style);
  window.location.assign(url);
}

/** Resolves when a timeline completes. */
export const played = (tl: gsap.core.Animation) =>
  new Promise<void>((resolve) => {
    tl.eventCallback("onComplete", () => resolve());
  });
