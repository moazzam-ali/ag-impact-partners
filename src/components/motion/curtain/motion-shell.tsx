"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ComponentType, type Ref, useEffect, useRef, useSyncExternalStore } from "react";

import { siteConfig } from "@/config/site";
import { useMounted } from "@/hooks/use-mounted";
import { curtain, trackLoad } from "@/lib/motion/curtain";
import { markClientNavigated } from "@/lib/motion/nav-state";
import { REDUCED_MOTION } from "@/lib/motion/tokens";

import styles from "./curtain.module.css";
import { CurtainBiais } from "./curtain-biais";
import { CurtainEsquisse } from "./curtain-esquisse";
import { CurtainFeuille } from "./curtain-feuille";
import { CurtainFeuillets } from "./curtain-feuillets";
import { CurtainFil } from "./curtain-fil";
import { CurtainIris } from "./curtain-iris";
import { CurtainSommet } from "./curtain-sommet";
import { CurtainSwitcher } from "./curtain-switcher";
import { CurtainTourne } from "./curtain-tourne";
import { type CurtainHandle, type CurtainStyle, useCurtainStyle } from "./styles";

/*
  Runs the curtain: the splash once per page load, then a transition on every internal link. A
  click on a link to another page is caught before Next's Link handles it (capture phase, so Link
  sees it as prevented); the transition is one movement, and at the moment the page is covered the
  router navigates, and the movement carries on into the reveal once the new pathname has
  rendered (prefetched pages are there at once). The curtain store (lib/motion/curtain) is closed
  while the page is covered, so page intros wait for the reveal.

  Modified clicks, new tabs, downloads, other origins and same-page links are left alone. Back and
  forward navigate without a cover.

  The server HTML (and hydration) has a plain cover in the page's colour; the chosen style, which
  only the browser knows, takes over from it once mounted, and the splash starts from there.
*/
const CURTAINS: Record<
  CurtainStyle,
  ComponentType<{ ref: Ref<CurtainHandle>; reduced: boolean }>
> = {
  fil: CurtainFil,
  sommet: CurtainSommet,
  feuillets: CurtainFeuillets,
  esquisse: CurtainEsquisse,
  iris: CurtainIris,
  biais: CurtainBiais,
  feuille: CurtainFeuille,
  tourne: CurtainTourne,
};

const subscribeMotion = (fn: () => void) => {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", fn);
  return () => mq.removeEventListener("change", fn);
};
const useReducedMotion = () =>
  useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );

const frames = (n: number) =>
  new Promise<void>((resolve) => {
    const step = (left: number) => (left ? requestAnimationFrame(() => step(left - 1)) : resolve());
    step(n);
  });

export function MotionShell() {
  const mounted = useMounted();
  const style = useCurtainStyle();
  const reduced = useReducedMotion();
  const handle = useRef<CurtainHandle>(null);
  const router = useRouter();
  const pathname = usePathname();
  const arrived = useRef<(() => void) | null>(null);
  const busy = useRef(true);
  const started = useRef(false);
  const Curtain = CURTAINS[style];

  // The splash, once, as soon as the chosen style is in place.
  useEffect(() => {
    const h = handle.current;
    if (!mounted || !h || started.current) return;
    started.current = true;
    if (!siteConfig.features.splash) {
      busy.current = false;
      curtain.open();
      return;
    }
    void h
      .splash(trackLoad(), () => curtain.open())
      .then(() => {
        busy.current = false;
      });
  }, [mounted]);

  useEffect(() => {
    arrived.current?.();
  }, [pathname]);

  useEffect(() => {
    const navigate = async (href: string, from: { x: number; y: number }) => {
      const h = handle.current;
      if (!h) return router.push(href);
      busy.current = true;
      markClientNavigated();
      curtain.close();
      router.prefetch(href);
      await h.swap(
        async () => {
          const landed = new Promise<void>((resolve) => {
            arrived.current = resolve;
            window.setTimeout(resolve, 6000);
          });
          router.push(href);
          await landed;
          arrived.current = null;
          await frames(1);
        },
        () => curtain.open(),
        from,
      );
      busy.current = false;
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement)) return;
      if ((link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname)
        return;
      e.preventDefault();
      if (busy.current) return;
      void navigate(url.pathname + url.search + url.hash, { x: e.clientX, y: e.clientY });
    };

    // Fetch a page as soon as its link is pointed at, so the swap rarely waits at its covered moment.
    const fetched = new Set<string>();
    const onPoint = (e: PointerEvent) => {
      const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement)) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || fetched.has(url.pathname)) return;
      fetched.add(url.pathname);
      router.prefetch(url.pathname);
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerover", onPoint, { passive: true });
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerover", onPoint);
    };
  }, [router]);

  return (
    <>
      <noscript>
        <style>{"[data-curtain]{display:none!important}"}</style>
      </noscript>
      {mounted ? (
        <Curtain ref={handle} reduced={reduced} />
      ) : (
        <div className={styles.root} data-curtain data-state="splash">
          <div className={styles.base} />
        </div>
      )}
      {mounted && siteConfig.features.curtainSwitcher ? <CurtainSwitcher value={style} /> : null}
    </>
  );
}
