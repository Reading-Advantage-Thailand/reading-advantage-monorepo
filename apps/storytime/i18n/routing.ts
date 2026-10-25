import { defineRouting } from "next-intl/routing";

/**
 * The locale routing of the Storytime app (spec FR-1, plan task 1.1): Thai first, because the
 * parents read Thai; English second, because the content is English. The prefix stays "always"
 * so the printed QR paths carry `/th/` (FR-2).
 */
export const routing = defineRouting({
  locales: ["th", "en"],
  defaultLocale: "th",
  localePrefix: "always",
});
