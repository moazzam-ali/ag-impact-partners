/*
  Hero variants. Each is a self-contained section component; the active one is picked by
  siteConfig.heroVariant and can be overridden for review with ?hero=<name> (persisted locally).
  "cables" is the light-cables shader; the others are signature studies built on SignatureShell.
*/
export const HERO_VARIANTS = ["cables", "hello", "plume", "griffe", "fil", "sceau"] as const;

export type HeroVariant = (typeof HERO_VARIANTS)[number];

export function isHeroVariant(value: unknown): value is HeroVariant {
  return typeof value === "string" && (HERO_VARIANTS as readonly string[]).includes(value);
}
