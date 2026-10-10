"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/*
  The one place GSAP is configured. Components import { gsap, useGSAP, ScrollTrigger } from here,
  never from "gsap" directly, so plugins are registered exactly once. Add plugins here only.
*/
if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
}

export { gsap, ScrollTrigger, useGSAP };
