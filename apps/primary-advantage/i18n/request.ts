import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { SCHOOL_TIME_ZONE } from "@reading-advantage/domain/calendar-day";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // Typically corresponds to the `[locale]` segment
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    // The server runs in UTC; without a zone a Thai date was written as the day before on the
    // server, and the browser wrote another day (hydration mismatch).
    timeZone: SCHOOL_TIME_ZONE,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
