import { useMemo } from "react";
import { createFormatter, useLocale } from "next-intl";
import type { Locale } from "date-fns";
// The DayPicker locales are date-fns locales plus the translated calendar labels ("Go to the Previous Month").
import { enUS, th, vi, zhCN, zhTW } from "react-day-picker/locale";
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

/** date-fns locales of the app locale codes, for date pickers. */
const DATE_FNS_LOCALES: Record<string, Locale> = { en: enUS, th, vi, cn: zhCN, tw: zhTW };

/**
 * Maps an app locale code to the date-fns locale of a date picker (month and weekday names).
 * @param locale The app locale code.
 * @returns The date-fns locale; English for an unknown code.
 */
export function dateFnsLocale(locale: string): Locale {
  return DATE_FNS_LOCALES[locale] ?? enUS;
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

/**
 * Gives a formatter for the page locale in a server component. `getFormatter({ locale })` must not
 * get the BCP 47 tag: the request config knows only the app codes and falls back to Thai for `zh-CN`.
 * @param locale The app locale code of the page.
 * @returns The formatter (`number`, `dateTime`, and so on) with the school time zone.
 */
export function intlFormatter(locale: string) {
  return createFormatter({ locale: intlLocale(locale), timeZone: SCHOOL_TIME_ZONE });
}
