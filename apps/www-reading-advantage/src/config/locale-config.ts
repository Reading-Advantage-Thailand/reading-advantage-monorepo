// This config is using for localizing.
// The locales are the languages that the app supports.
// The defaultLocale is the default language that the app will use.
export type Locale = "en" | "th" | "zh";
export const localeConfig: LocaleConfig = {
    locales: ["en", "th", "zh"],
    defaultLocale: "en",
};

export type LocaleConfig = {
    locales: string[];
    defaultLocale: string;
};

export const localeNames: Record<Locale, string> = {
    en: "English",
    th: "ไทย",
    zh: "中文",
};

export const localeImports = {
    en: () => import("../locales/en"),
    th: () => import("../locales/th"),
    zh: () => import("../locales/zh"),
};

export const feedbackLanguage: Record<Locale, string> = {
    en: "English",
    th: "Thai",
    zh: "Chinese (Simplified)",
};