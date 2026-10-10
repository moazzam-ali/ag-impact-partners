"use client";

import { useSyncExternalStore } from "react";

import { isHeroVariant, type HeroVariant } from "./variants";

/*
  Which hero variant is showing. Read order: ?hero= in the URL, then localStorage, then the site
  default. The URL value is written to localStorage so a review link sticks across pages.
*/
const STORAGE_KEY = "agi:hero-variant";
const PARAM = "hero";

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

const subscribe = () => () => {};

export function useHeroVariant(fallback: HeroVariant): HeroVariant {
  return useSyncExternalStore(
    subscribe,
    () => read(fallback),
    () => fallback,
  );
}
