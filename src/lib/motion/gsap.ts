"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { Observer } from "gsap/Observer";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/*
  The one place GSAP is configured. Components import from here, never from "gsap" directly, so
  plugins are registered exactly once. The signature hero variants are still in ideation; prune the
  plugins nobody uses once a variant is chosen.
*/
if (typeof window !== "undefined") {
  gsap.registerPlugin(
    useGSAP,
    ScrollTrigger,
    DrawSVGPlugin,
    MotionPathPlugin,
    MorphSVGPlugin,
    CustomEase,
    InertiaPlugin,
    Observer,
  );
}

/*
  The motion feel, as in Proxy Papers (~/dev/clients/proxy-papers, src/lib/gsap.js): reveals ease
  out (power3.out), moves ease in and out (power2.inOut); a reveal runs about 0.9 s, staggers
  0.12 s. Section animations live in hooks under src/lib/animations, one per section.
*/
export const EASE_OUT = "power3.out";
export const EASE_STANDARD = "power2.inOut";
export const DUR_REVEAL = 0.9;
export const DUR_STAGGER = 0.12;

/**
 * One ScrollTrigger.refresh() for every request made in the same frame (several sections each want
 * one once their layout settles).
 */
let refreshQueued = false;
export function scheduleRefresh() {
  if (refreshQueued || typeof window === "undefined") return;
  refreshQueued = true;
  requestAnimationFrame(() => {
    refreshQueued = false;
    ScrollTrigger.refresh();
  });
}

export {
  CustomEase,
  DrawSVGPlugin,
  gsap,
  InertiaPlugin,
  MorphSVGPlugin,
  MotionPathPlugin,
  Observer,
  ScrollTrigger,
  useGSAP,
};
