"use client";

import { useCallback, useSyncExternalStore } from "react";

import { isHeroVariant, type HeroVariant } from "./variants";

/*
  Which hero variant is showing. Read order: ?hero= in the URL, then localStorage, then the site
  default. Writes go to both so a review link can be shared and a choice survives reloads.
*/
const STORAGE_KEY = "agi:hero-variant";
const PARAM = "hero";

const listeners = new Set<() => void>();
let current: HeroVariant | null = null;

function read(fallback: HeroVariant): HeroVariant {
  if (current) return current;
  const fromUrl = new URLSearchParams(window.location.search).get(PARAM);
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
    if (isHeroVariant(fromUrl)) window.localStorage.setItem(STORAGE_KEY, fromUrl);
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); the URL and default still work.
  }
  current = isHeroVariant(fromUrl) ? fromUrl : isHeroVariant(stored) ? stored : fallback;
  return current;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function useHeroVariant(fallback: HeroVariant) {
  const variant = useSyncExternalStore(
    subscribe,
    () => read(fallback),
    () => fallback,
  );

  const setVariant = useCallback((next: HeroVariant) => {
    current = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // See above.
    }
    const url = new URL(window.location.href);
    url.searchParams.set(PARAM, next);
    window.history.replaceState(window.history.state, "", url);
    listeners.forEach((notify) => notify());
  }, []);

  return [variant, setVariant] as const;
}
