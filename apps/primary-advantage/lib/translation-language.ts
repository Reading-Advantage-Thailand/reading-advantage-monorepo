/**
 * Translation language codes with dedicated translation data.
 */
export const TRANSLATION_LANGUAGE_CODES = ["th", "vi", "cn", "tw"] as const;

/**
 * Translation language code with dedicated translation data.
 */
export type TranslationLanguageCode =
  (typeof TRANSLATION_LANGUAGE_CODES)[number];

/**
 * Resolves the active locale to a supported translation language.
 * @param locale Active locale from next-intl.
 * @param fallback Code used when the locale has no translation data.
 * @returns Supported translation language for the active locale.
 */
export function toTranslationLanguage(
  locale: string,
  fallback: TranslationLanguageCode = "th",
): TranslationLanguageCode {
  return (TRANSLATION_LANGUAGE_CODES as readonly string[]).includes(locale)
    ? (locale as TranslationLanguageCode)
    : fallback;
}
