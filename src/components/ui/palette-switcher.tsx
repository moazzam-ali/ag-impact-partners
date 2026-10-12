"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useLayoutEffect, useSyncExternalStore } from "react";

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

import styles from "./palette-switcher.module.css";

const MODES = ["light", "dark"] as const;

/**
 * Review only: compares the orange palette with the client's navy theme, each in light and dark.
 * Both swap live; the choice is kept for the next visit.
 */
export function PaletteSwitcher() {
  const t = useTranslations("paletteSwitcher");
  const mounted = useMounted();
  const palette = useSyncExternalStore(onPaletteChange, currentPalette, () => DEFAULT_PALETTE);
  const { resolvedTheme, setTheme } = useTheme();

  useLayoutEffect(syncPalette, []);

  return (
    <div className={styles.switcher} role="group" aria-label={t("label")}>
      <span className={styles.label}>{t("label")}</span>
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
      <span className={styles.divider} aria-hidden="true" />
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
  );
}
