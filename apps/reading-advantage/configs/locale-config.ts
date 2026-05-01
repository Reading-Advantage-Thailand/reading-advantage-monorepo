// This config is using for localizing.
// The locales are the languages that the app supports.
// The defaultLocale is the default language that the app will use.
export type Locale = "en" | "th" | "cn" | "tw" | "vi";
export const localeConfig: LocaleConfig = {
  locales: ["en", "th", "cn", "tw", "vi"],
  defaultLocale: "en",
};

export type LocaleConfig = {
  locales: string[];
  defaultLocale: string;
};

export const localeNames: Record<Locale, string> = {
  en: "English",
  th: "ไทย",
  cn: "简体字",
  tw: "繁體字",
  vi: "Tiếng Việt",
};

export const localeImports = {
  en: () => import("../locales/en"),
  th: () => import("../locales/th"),
  cn: () => import("../locales/cn"),
  tw: () => import("../locales/tw"),
  vi: () => import("../locales/vi"),
};

export const feedbackLanguage: Record<Locale, string> = {
  en: "English",
  th: "Thai",
  cn: "Simplified Chinese",
  tw: "Traditional Chinese",
  vi: "Vietnamese",
};
