/*
  Hero variants. Each is a self-contained section component; the active one is picked by
  siteConfig.heroVariant and can be overridden for review with ?hero=<name> (persisted locally).
  "pile2" first: Pile redone in the site's face, a ream you can pull documents from, the fields on a
  running thread, in both themes. Then round 5, image-led intros: "cadre" (full-bleed pictures of the five fields), "index" (the
  fields as an index with a trailing picture), "editorial" (a magazine cover), "diptyque" (two
  pictures meeting at the line), "fenetres" (the fields seen through the headline). Then round 4: "table" (the negotiation across a table, two hands), "popup" (Paris rising out of a
  pop-up book), "dossier" (a leather portfolio, pages turned by scroll), "macro" (the nib writing, in
  macro). Then round 3: "signataire" (a 3D hand signing contracts), "loupe" (the headline made of fine
  print), "confidentiel" (figures under redaction, an ultraviolet lamp), "pile" (a ream of 300
  contracts to riffle), "salle" (Paris in hairlines, a scroll flight to the table). Then round 2:
  "redline", "accord", "rapport". Then round 1: "cables", the signature studies and "figma".
*/
export const HERO_VARIANTS = [
  "pile2",
  "cadre",
  "index",
  "editorial",
  "diptyque",
  "fenetres",
  "table",
  "popup",
  "dossier",
  "macro",
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
export const HERO_ROUND_STARTS: readonly HeroVariant[] = [
  "cadre",
  "table",
  "signataire",
  "redline",
  "cables",
];

export function isHeroVariant(value: unknown): value is HeroVariant {
  return typeof value === "string" && (HERO_VARIANTS as readonly string[]).includes(value);
}
