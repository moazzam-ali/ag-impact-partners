"use client";

import { useLocale, useTranslations } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/cn";

export function LocaleSwitch({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("locale");

  return (
    <div
      role="group"
      aria-label={t("switch")}
      className={cn(
        "flex h-(--tap) items-center rounded-full bg-chip p-1 text-xs font-medium",
        className,
      )}
    >
      {routing.locales.map((candidate) => (
        <button
          key={candidate}
          type="button"
          aria-pressed={candidate === locale}
          onClick={() => router.replace(pathname, { locale: candidate })}
          className="h-full rounded-full px-3 text-ink-soft transition-colors hover:text-ink aria-pressed:bg-ink aria-pressed:text-bg"
        >
          {t(candidate)}
        </button>
      ))}
    </div>
  );
}
