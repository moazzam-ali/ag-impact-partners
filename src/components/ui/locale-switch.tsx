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
        "flex items-center rounded-full bg-chip p-1 text-[13px] font-medium",
        className,
      )}
    >
      {routing.locales.map((candidate) => (
        <button
          key={candidate}
          type="button"
          aria-pressed={candidate === locale}
          onClick={() => router.replace(pathname, { locale: candidate })}
          className="rounded-full px-2.5 py-1 text-ink-soft transition-colors hover:text-ink aria-pressed:bg-ink aria-pressed:text-bg"
        >
          {t(candidate)}
        </button>
      ))}
    </div>
  );
}
