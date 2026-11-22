import { expect } from "vitest";
import { localeConfig } from "@/config/locale-config";
import enMessages from "@/locales/en";
import thMessages from "@/locales/th";
import zhMessages from "@/locales/zh";

type Dict = Record<string, unknown>;

const MESSAGES: Record<string, Dict> = {
  en: enMessages as unknown as Dict,
  th: thMessages as unknown as Dict,
  zh: zhMessages as unknown as Dict,
};

/**
 * Reads one string from a locale dictionary by its dotted path.
 * @param dict The locale dictionary.
 * @param key The dotted key path.
 * @returns The string, or undefined when the path is not a string.
 */
function readPath(dict: Dict, key: string): string | undefined {
  let value: unknown = dict;
  for (const part of key.split(".")) {
    if (value === null || typeof value !== "object" || !(part in value)) return undefined;
    value = (value as Dict)[part];
  }
  return typeof value === "string" ? value : undefined;
}

/**
 * Checks that each key resolves to a non-empty string in every shipped locale.
 * The locale list comes from the app i18n config, not from a test-local list.
 * @param keys The dotted locale keys to check.
 */
export function expectKeysInEveryLocale(keys: readonly string[]): void {
  for (const locale of localeConfig.locales) {
    const dict = MESSAGES[locale];
    expect(dict, `locale ${locale} dictionary`).toBeDefined();
    for (const key of keys) {
      const value = readPath(dict, key);
      expect(typeof value, `${locale}: ${key} must be a string`).toBe("string");
      expect(
        (value as string).trim().length,
        `${locale}: ${key} must be non-empty`,
      ).toBeGreaterThan(0);
    }
  }
}
