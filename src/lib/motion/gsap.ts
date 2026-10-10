"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/*
  The one place GSAP is configured. Components import { gsap, useGSAP, ScrollTrigger } from here,
  never from "gsap" directly, so plugins are registered exactly once.
*/
if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, DrawSVGPlugin, MotionPathPlugin);
}

export { gsap, ScrollTrigger, useGSAP };
