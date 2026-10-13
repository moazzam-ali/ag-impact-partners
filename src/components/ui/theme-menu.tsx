"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/cn";
import {
  choosePalette,
  currentPalette,
  DEFAULT_PALETTE,
  onPaletteChange,
  PALETTES,
  syncPalette,
} from "@/lib/palette";

import styles from "./theme-menu.module.css";
import { THEME_BUTTON, ThemeIcon } from "./theme-toggle";

const MODES = ["light", "dark"] as const;

/**
 * While the client chooses a palette (features.paletteChoice), the theme button opens a small menu:
 * the palette (orange or the client's navy) and the mode (light or dark). Both swap live and are
 * kept for the next visit. Without the flag the header has the plain light / dark toggle.
 */
export function ThemeMenu({ className }: { className?: string }) {
  const t = useTranslations("themeMenu");
  const mounted = useMounted();
  const palette = useSyncExternalStore(onPaletteChange, currentPalette, () => DEFAULT_PALETTE);
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const isDark = mounted && resolvedTheme === "dark";

  useLayoutEffect(syncPalette, []);

  // Closes on a press outside it, or on Escape (focus back on the button).
  useEffect(() => {
    if (!open) return;
    const onPress = (e: PointerEvent) => {
      if (e.target instanceof Node && !wrap.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onPress);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPress);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={wrap}
      className={cn(styles.menu, className)}
      onBlur={(e) => {
        if (!(e.relatedTarget instanceof Node && wrap.current?.contains(e.relatedTarget)))
          setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-label={t("label")}
        aria-expanded={open}
        aria-controls={panelId}
        title={t("label")}
        onClick={() => setOpen((v) => !v)}
        className={THEME_BUTTON}
      >
        <ThemeIcon dark={isDark} />
      </button>

      <div
        id={panelId}
        className={styles.panel}
        role="group"
        aria-label={t("label")}
        data-open={open}
      >
        <div className={styles.row}>
          <span className={styles.label}>{t("palette")}</span>
          <div className={styles.options}>
            {PALETTES.map((value) => (
              <button
                key={value}
                type="button"
                className={cn(styles.option, mounted && value === palette && styles.active)}
                aria-pressed={mounted ? value === palette : undefined}
                onClick={() => choosePalette(value)}
              >
                <span className={styles.swatch} data-palette-swatch={value} aria-hidden="true" />
                {t(value)}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>{t("mode")}</span>
          <div className={styles.options}>
            {MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                className={cn(styles.option, mounted && mode === resolvedTheme && styles.active)}
                aria-pressed={mounted ? mode === resolvedTheme : undefined}
                onClick={() => setTheme(mode)}
              >
                {t(mode)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
