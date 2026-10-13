import { useMemo } from "react";
import { createFormatter, useLocale } from "next-intl";
import { SCHOOL_TIME_ZONE } from "@reading-advantage/domain/calendar-day";

/** App locale codes that are not BCP 47 tags. Intl falls back to English for them. */
const INTL_TAGS: Record<string, string> = { cn: "zh-CN", tw: "zh-TW" };

/**
 * Maps an app locale code to a BCP 47 tag that `Intl` understands.
 * @param locale The app locale code (`en`, `th`, `vi`, `cn`, or `tw`).
 * @returns The tag: `zh-CN` for `cn`, `zh-TW` for `tw`, and the code itself otherwise.
 */
export function intlLocale(locale: string): string {
  return INTL_TAGS[locale] ?? locale;
}

/**
 * Gives a next-intl formatter for the page locale, with the school time zone and the BCP 47 tag of
 * the locale. `useFormatter` passes `cn` and `tw` to `Intl` as they are, and dates then print in English.
 * @returns The formatter (`number`, `dateTime`, and so on).
 */
export function useIntlFormatter() {
  const locale = useLocale();
  return useMemo(() => createFormatter({ locale: intlLocale(locale), timeZone: SCHOOL_TIME_ZONE }), [locale]);
}
