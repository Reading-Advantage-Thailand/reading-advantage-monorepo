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
 * Collects every dotted string-leaf key under a scope of the English dictionary.
 * The caller passes the keys to expectKeysInEveryLocale.
 * @param scope The dotted scope path.
 * @returns The dotted keys under the scope.
 */
export function keysUnderScope(scope: string): string[] {
  const found: string[] = [];
  const walk = (value: unknown, path: string): void => {
    if (typeof value === "string") {
      if (value.trim().length > 0) found.push(path);
      return;
    }
    if (value === null || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value as Dict)) {
      walk(child, `${path}.${key}`);
    }
  };
  const root = scope
    ? scope.split(".").reduce<unknown>((value, part) => {
        if (value === null || typeof value !== "object" || !(part in value)) return undefined;
        return (value as Dict)[part];
      }, enMessages as unknown as Dict)
    : enMessages;
  if (root !== undefined) walk(root, scope);
  return found;
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
