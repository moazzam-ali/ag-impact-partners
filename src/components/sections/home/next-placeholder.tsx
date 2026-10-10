import { getTranslations } from "next-intl/server";

/** Stand-in for A2 so the page scrolls. Replace with the real section. */
export async function NextPlaceholder() {
  const t = await getTranslations("placeholder");

  return (
    <section className="grid min-h-[70svh] place-items-center border-t border-rule px-(--page-gutter) py-(--space-30)">
      <div className="max-w-md text-center">
        <p className="text-xs font-medium tracking-(--tracking-eyebrow) text-ink-soft uppercase">
          {t("label")}
        </p>
        <p className="mt-3 text-ink-soft">{t("note")}</p>
      </div>
    </section>
  );
}
