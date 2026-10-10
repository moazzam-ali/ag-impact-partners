import type { routing } from "@/i18n/routing";
import type fr from "../../messages/fr.json";

// Type-safe locales and message keys across useTranslations / getTranslations.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof fr;
  }
}
