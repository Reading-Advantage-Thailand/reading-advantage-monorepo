import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ["en", "th", "vi", "cn", "tw"],

  // Used when no locale matches. Thai (owner decision 2026-10-05).
  defaultLocale: "th",
});
