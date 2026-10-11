"use client";

import dynamic from "next/dynamic";
import { type ComponentType } from "react";

import { siteConfig } from "@/config/site";

import { HeroSwitcher } from "./hero-switcher";
import { useHeroVariant } from "./use-hero-variant";
import { type HeroVariant } from "./variants";

// Loaded on demand, so only the active variant's code (and shader / canvas work) ships.
const VARIANTS: Record<HeroVariant, ComponentType> = {
  table: dynamic(() => import("./table/hero-table").then((m) => m.HeroTable)),
  popup: dynamic(() => import("./popup/hero-popup").then((m) => m.HeroPopup)),
  dossier: dynamic(() => import("./dossier/hero-dossier").then((m) => m.HeroDossier)),
  macro: dynamic(() => import("./macro/hero-macro").then((m) => m.HeroMacro)),
  signataire: dynamic(() => import("./signataire/hero-signataire").then((m) => m.HeroSignataire)),
  loupe: dynamic(() => import("./loupe/hero-loupe").then((m) => m.HeroLoupe)),
  confidentiel: dynamic(() =>
    import("./confidentiel/hero-confidentiel").then((m) => m.HeroConfidentiel),
  ),
  pile: dynamic(() => import("./pile/hero-pile").then((m) => m.HeroPile)),
  salle: dynamic(() => import("./salle/hero-salle").then((m) => m.HeroSalle)),
  redline: dynamic(() => import("./redline/hero-redline").then((m) => m.HeroRedline)),
  accord: dynamic(() => import("./accord/hero-accord").then((m) => m.HeroAccord)),
  rapport: dynamic(() => import("./rapport/hero-rapport").then((m) => m.HeroRapport)),
  cables: dynamic(() => import("./hero-cables").then((m) => m.HeroCables)),
  hello: dynamic(() => import("./sig-hello/hero-sig-hello").then((m) => m.HeroSigHello)),
  plume: dynamic(() => import("./sig-plume/hero-sig-plume").then((m) => m.HeroSigPlume)),
  griffe: dynamic(() => import("./sig-griffe/hero-sig-griffe").then((m) => m.HeroSigGriffe)),
  fil: dynamic(() => import("./sig-fil/hero-sig-fil").then((m) => m.HeroSigFil)),
  sceau: dynamic(() => import("./sig-sceau/hero-sig-sceau").then((m) => m.HeroSigSceau)),
  figma: dynamic(() => import("./sig-figma/hero-sig-figma").then((m) => m.HeroSigFigma)),
};

/** The homepage hero: renders the active variant (see variants.ts) and, in review, the switcher. */
export function HomeHero() {
  const [variant, setVariant] = useHeroVariant(siteConfig.heroVariant);
  const Hero = VARIANTS[variant];

  return (
    <>
      <Hero key={variant} />
      {siteConfig.features.heroVariantSwitcher ? (
        <HeroSwitcher value={variant} onChange={setVariant} />
      ) : null}
    </>
  );
}
