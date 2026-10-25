import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * The next-intl server request config: it serves the messages of the requested locale and
 * falls back to Thai for an unknown locale (the routing default).
 * @param request.requestLocale The locale segment of the current request.
 * @returns The locale and its messages for the request.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return { locale, messages: (await import(`../messages/${locale}.json`)).default };
});
