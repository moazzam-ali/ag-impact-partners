/*
  Hero variants. Each is a self-contained section component; the active one is picked by
  siteConfig.heroVariant and can be overridden for review with ?hero=<name> (persisted locally).
  Round 3 first: "signataire" (a 3D hand signing contracts), "loupe" (the headline made of fine
  print), "confidentiel" (figures under redaction, an ultraviolet lamp), "pile" (a ream of 300
  contracts to riffle), "salle" (Paris in hairlines, a scroll flight to the table). Then round 2:
  "redline", "accord", "rapport". Then round 1: "cables", the signature studies and "figma".
*/
export const HERO_VARIANTS = [
  "signataire",
  "loupe",
  "confidentiel",
  "pile",
  "salle",
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

/** Where each earlier round begins in the list (the switcher draws a divider there). */
export const HERO_ROUND_STARTS: readonly HeroVariant[] = ["redline", "cables"];

export function isHeroVariant(value: unknown): value is HeroVariant {
  return typeof value === "string" && (HERO_VARIANTS as readonly string[]).includes(value);
}
