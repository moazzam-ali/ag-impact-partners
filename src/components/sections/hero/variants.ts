/*
  Hero variants. Each is a self-contained section component; the active one is picked by
  siteConfig.heroVariant and can be overridden for review with ?hero=<name> (persisted locally).
  Round 2 studies first: "redline" (the contract), "accord" (two signals tuned into one line),
  "rapport" (the line as a balance of power). Then round 1: "cables" (light-cables shader), "figma"
  (Figma frame 1:155) and the signature studies built on SignatureShell.
*/
export const HERO_VARIANTS = [
  "redline",
  "accord",
  "rapport",
  "cables",
  "hello",
  "plume",
  "griffe",
  "fil",
  "sceau",
  "figma",
] as const;

export type HeroVariant = (typeof HERO_VARIANTS)[number];

export function isHeroVariant(value: unknown): value is HeroVariant {
  return typeof value === "string" && (HERO_VARIANTS as readonly string[]).includes(value);
}
