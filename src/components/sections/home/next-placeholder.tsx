import { getTranslations } from "next-intl/server";

/** Stand-in for A2 so the page scrolls and the thread has somewhere to go. Replace with the real section. */
export async function NextPlaceholder() {
  const t = await getTranslations("placeholder");

  return (
    <section className="relative grid min-h-[70svh] place-items-center border-t border-rule px-(--gutter) py-24">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium tracking-wide text-ink-soft uppercase">{t("label")}</p>
        <p className="mt-3 text-ink-soft">{t("note")}</p>
      </div>
    </section>
  );
}
