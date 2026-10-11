"use client";

import { useSyncExternalStore } from "react";

import { gsap } from "./gsap";

/*
  The curtain: whether the page is on show. The splash (first load) and the page transitions close
  it while they cover the page and open it as their reveal starts, so a page's own intro plays when
  it can be seen, not behind the cover. It starts closed: the splash is in the server HTML.

  In a component: `useCurtainOpen()` to render on it, `afterCurtain(fn)` to start a timeline on it.
*/
let open = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

export const curtain = {
  isOpen: () => open,
  close() {
    if (!open) return;
    open = false;
    emit();
  },
  open() {
    if (open) return;
    open = true;
    emit();
  },
};

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useCurtainOpen() {
  return useSyncExternalStore(
    subscribe,
    () => open,
    () => false,
  );
}

/** Runs `fn` once the curtain is open (now, if it already is). Returns a cancel function. */
export function afterCurtain(fn: () => void) {
  if (open) {
    fn();
    return () => {};
  }
  const off = subscribe(() => {
    if (!open) return;
    off();
    fn();
  });
  return off;
}

const wait = (seconds: number) => new Promise<void>((r) => setTimeout(r, seconds * 1000));
const loaded = () =>
  document.readyState === "complete"
    ? Promise.resolve()
    : new Promise<void>((r) => window.addEventListener("load", () => r(), { once: true }));

/**
 * The splash's loader: `progress.value` runs 0 → 1, crawling while fonts and the page load (at
 * least `min` seconds, so it reads as a count), finishing once both are in; `done` resolves at 1.
 * Never waits more than `max` seconds.
 */
export function trackLoad(min = 1.4, max = 6) {
  const progress = { value: 0 };
  const crawl = gsap.to(progress, { value: 0.86, duration: min * 1.6, ease: "power2.out" });
  const ready = Promise.race([
    Promise.all([document.fonts.ready, loaded(), wait(min * 0.75)]),
    wait(max),
  ]);
  const done = ready.then(
    () =>
      new Promise<void>((resolve) => {
        crawl.kill();
        gsap.to(progress, {
          value: 1,
          duration: 0.5,
          ease: "power2.inOut",
          onComplete: resolve,
        });
      }),
  );
  return { progress, done };
}

export type Loader = ReturnType<typeof trackLoad>;
