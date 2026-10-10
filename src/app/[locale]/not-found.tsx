import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <main className="grid min-h-svh place-items-center px-5">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight">{t("title")}</h1>
        <Link href="/" className="mt-6 inline-block underline underline-offset-4">
          {t("back")}
        </Link>
      </div>
    </main>
  );
}
