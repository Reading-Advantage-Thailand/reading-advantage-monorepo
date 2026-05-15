import { hasLocale } from "next-intl";
import { routing } from "../i18n/routing";

type Messages = Record<string, unknown>;

export type NestedMessages = {
  [key: string]: string | NestedMessages;
};

export function resolveLocale(
  requested: string | undefined
): string {
  if (requested && hasLocale(routing.locales, requested)) {
    return requested;
  }
  return routing.defaultLocale;
}

export function deepMerge(base: Messages, override: Messages): Messages {
  const result: Messages = { ...base };
  for (const key of Object.keys(override)) {
    if (
      typeof base[key] === "object" &&
      base[key] !== null &&
      !Array.isArray(base[key]) &&
      typeof override[key] === "object" &&
      override[key] !== null &&
      !Array.isArray(override[key])
    ) {
      result[key] = deepMerge(
        base[key] as Messages,
        override[key] as Messages
      );
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

async function importMessages(
  locale: string
): Promise<Messages> {
  return (await import(`../messages/${locale}.json`)).default;
}

export async function loadMessages(
  locale: string
): Promise<Messages> {
  if (!hasLocale(routing.locales, locale)) {
    throw new Error(`Unsupported locale: ${locale}`);
  }
  const enMessages = await importMessages("en");
  if (locale === "en") return enMessages;
  const localeMessages = await importMessages(locale);
  return deepMerge(enMessages, localeMessages);
}
