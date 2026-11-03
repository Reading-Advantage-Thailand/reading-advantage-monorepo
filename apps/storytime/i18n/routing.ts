import { defineRouting } from "next-intl/routing";

/**
 * The locale routing of the Storytime app (spec FR-1, plan task 1.1): Thai first, because the
 * parents read Thai; English second, because the content is English. The prefix stays "always"
 * so the printed QR paths carry `/th/` (FR-2). The app writes no locale cookie, because the route
 * is public and sends no `Set-Cookie` header (FR-5, AC-5.1).
 */
export const routing = defineRouting({
  locales: ["th", "en"],
  defaultLocale: "th",
  localePrefix: "always",
  localeCookie: false,
});
