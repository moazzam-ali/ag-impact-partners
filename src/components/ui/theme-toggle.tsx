"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/cn";

/** The round chip the theme toggle and the theme menu share. */
export const THEME_BUTTON =
  "grid size-(--tap) place-items-center rounded-full bg-chip text-ink transition-colors hover:bg-chip-hover";

/** A half-filled circle, so it stays monochrome like the rest of the chrome; the fill swaps sides. */
export function ThemeIcon({ dark }: { dark: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="relative block size-3.5 overflow-hidden rounded-full border-[1.5px] border-current"
    >
      <span
        className="absolute inset-y-0 left-0 w-1/2 bg-current transition-transform duration-300 ease-out"
        style={{ transform: dark ? "translateX(100%)" : "none" }}
      />
    </span>
  );
}

/** Light / dark switch. */
export function ThemeToggle({ className }: { className?: string }) {
  const mounted = useMounted();
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("theme");
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={t("toggle")}
      aria-pressed={isDark}
      title={isDark ? t("light") : t("dark")}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(THEME_BUTTON, className)}
    >
      <ThemeIcon dark={isDark} />
    </button>
  );
}
