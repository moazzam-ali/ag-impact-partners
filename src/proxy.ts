import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

// Locale detection and prefixing. Next 16 calls this file "proxy" (formerly middleware).
export default createMiddleware(routing);

export const config = {
  // Everything except Next internals, Vercel internals, API routes and files with an extension.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
