// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const app = resolve(import.meta.dirname, "..");
const english = JSON.parse(readFileSync(resolve(app, "messages/en.json"), "utf8")) as Record<string, unknown>;
const thai = JSON.parse(readFileSync(resolve(app, "messages/th.json"), "utf8")) as Record<string, unknown>;

/** The exact Thai values allowed to be Latin-only: the product name (test strategy P3.6). */
const LATIN_ONLY_ALLOW_LIST = new Set(["Storytime"]);

/**
 * The keys whose value is intentionally English in both files: the 404 shows both languages
 * under every locale, and the parity rule pins the same value in `th.json` and `en.json`. The
 * week-not-open keys `notOpenEnglish` and `openWeekEnglish` join the rule (AC-1.1).
 */
const ENGLISH_VALUE_KEYS = new Set(["notFoundEnglish", "notOpenEnglish", "openWeekEnglish"]);

/** The week-not-open keys that task 1.1 adds to both message files. */
const WEEK_NOT_OPEN_KEYS = ["notOpenThai", "notOpenEnglish", "openWeekThai", "openWeekEnglish"];

describe("Phase 3 at-home messages", () => {
  it("defines the same non-empty message keys in Thai and English", () => {
    const englishKeys = Object.keys(english).sort();
    const thaiKeys = Object.keys(thai).sort();
    expect(englishKeys.length, "English messages must not be empty").toBeGreaterThan(0);
    expect(thaiKeys.length, "Thai messages must not be empty").toBeGreaterThan(0);
    expect(thaiKeys).toEqual(englishKeys);
    for (const key of WEEK_NOT_OPEN_KEYS) {
      expect(englishKeys, `messages/en.json must define ${key}`).toContain(key);
      expect(thaiKeys, `messages/th.json must define ${key}`).toContain(key);
    }
  });

  it("has no blank Thai strings and uses Sarabun for Thai app text", () => {
    const thaiStrings = Object.values(thai).filter((value): value is string => typeof value === "string");
    expect(thaiStrings.length, "Thai message strings must exist").toBeGreaterThan(0);
    expect(thaiStrings.every((value) => value.trim().length > 0), "Thai strings must not be blank").toBe(true);
    const css = readFileSync(resolve(app, "app/globals.css"), "utf8");
    expect(css, "Thai app text must use Sarabun").toMatch(/Sarabun/i);
  });

  it("has no Latin-only Thai string outside the P3.6 allow list", () => {
    for (const [key, value] of Object.entries(thai)) {
      if (typeof value !== "string" || ENGLISH_VALUE_KEYS.has(key)) continue;
      expect(
        isLatinOnlyThai(value) && !LATIN_ONLY_ALLOW_LIST.has(value),
        `the Thai string ${key} must hold Thai script or sit in the exact P3.6 allow list`,
      ).toBe(false);
    }
  });

  it("self-test: the Latin-only detector flags a Latin-only value and passes mixed Thai", () => {
    expect(isLatinOnlyThai("Storytime"), "a Latin-only value must be flagged").toBe(true);
    expect(isLatinOnlyThai("เล่นเสียงไม่ได้"), "a Thai value must pass").toBe(false);
    expect(isLatinOnlyThai("รหัส QR"), "a mixed Thai and Latin value must pass").toBe(false);
  });
});

/**
 * Reports whether a value holds no Thai character at all (test strategy P3.6, finding F138).
 * @param value The Thai message value.
 * @returns `true` when the value has no character from the Thai Unicode block.
 */
function isLatinOnlyThai(value: string): boolean {
  return !/[\u0E00-\u0E7F]/.test(value);
}
