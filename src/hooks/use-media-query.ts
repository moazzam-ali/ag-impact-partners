"use client";

import { useSyncExternalStore } from "react";

/** SSR-safe matchMedia. `serverDefault` is what the server (and first client render) assumes. */
export function useMediaQuery(query: string, serverDefault = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverDefault,
  );
}
