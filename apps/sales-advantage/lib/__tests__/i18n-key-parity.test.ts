// @vitest-environment node
import { describe, expect, it } from "vitest";

import enMessages from "../../messages/en.json";
import thMessages from "../../messages/th.json";

const NEW_SALES_ERROR_KEYS = [
  "login.errorSso",
  "login.errorForbidden",
] as const;

/** Reads a nested value from a locale dictionary by dot path. */
function readAt(
  messages: Record<string, unknown>,
  path: string,
): string | undefined {
  let current: unknown = messages;
  for (const segment of path.split(".")) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === "string" ? current : undefined;
}

describe("Sales sign-in error key parity", () => {
  const locales = [
    ["en", enMessages],
    ["th", thMessages],
  ] as const;

  for (const [locale, messages] of locales) {
    it(`defines every new sign-in error key in ${locale}`, () => {
      for (const key of NEW_SALES_ERROR_KEYS) {
        expect(readAt(messages as Record<string, unknown>, key), `${locale}: ${key}`)
          .toBeTruthy();
      }
    });
  }

  it("defines the same new keys in both locales", () => {
    for (const key of NEW_SALES_ERROR_KEYS) {
      const en = readAt(enMessages as Record<string, unknown>, key);
      const th = readAt(thMessages as Record<string, unknown>, key);
      expect(Boolean(en), key).toBe(Boolean(th));
    }
  });
});
