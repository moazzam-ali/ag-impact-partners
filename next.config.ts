import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Cache Components (PPR) are deliberately off for now: the site is a static marketing site and
  // next-intl's request-scoped locale is simpler without them. Revisit once data-driven pages exist.
  cacheComponents: false,
};

export default withNextIntl(nextConfig);
