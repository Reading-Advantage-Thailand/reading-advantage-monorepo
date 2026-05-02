import { getRequestConfig } from "next-intl/server";
import { routing } from "./i18n/routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as "en" | "th" | "zh")) {
    locale = routing.defaultLocale;
  }

  // Load existing TS locale files
  const messages = (await import(`./locales/${locale}.ts`)).default;

  return {
    locale,
    messages,
  };
});
