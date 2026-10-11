"use client";

import "lenis/dist/lenis.css";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { useCurtainOpen } from "@/lib/motion/curtain";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { REDUCED_MOTION } from "@/lib/motion/tokens";

/*
  Smooth scrolling (Lenis), set up as in Proxy Papers (~/dev/clients/proxy-papers, LenisProvider):
  driven by GSAP's ticker so ScrollTrigger pins and scrubs move in step with it. Wheel and trackpad glide; touch keeps the device's own momentum. Scrolling is held while
  the curtain covers the page (splash, page changes), and each new page starts at the top. With
  reduced motion the browser scrolls natively.
*/
export function SmoothScroll() {
  const lenis = useRef<Lenis | null>(null);
  const open = useCurtainOpen();
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia(REDUCED_MOTION).matches) return;
    // Proxy Papers' feel: a long, calm glide (1.8 s, expo out) rather than a quick lerp.
    const instance = new Lenis({
      autoRaf: false,
      duration: 1.8,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      anchors: true,
      stopInertiaOnNavigate: true,
    });
    lenis.current = instance;
    instance.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33);
      instance.destroy();
      lenis.current = null;
    };
  }, []);

  useEffect(() => {
    if (open) lenis.current?.start();
    else lenis.current?.stop();
  }, [open]);

  useEffect(() => {
    lenis.current?.scrollTo(0, { immediate: true, force: true });
  }, [pathname]);

  return null;
}
