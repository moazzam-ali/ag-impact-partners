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
