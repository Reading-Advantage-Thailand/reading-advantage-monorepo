import { describe, it, expect } from "vitest";
import thMessages from "../../messages/th.json";
import enMessages from "../../messages/en.json";

function flattenKeys(
  obj: Record<string, unknown>,
  prefix = "",
): string[] {
  const result: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result.push(...flattenKeys(value as Record<string, unknown>, fullKey));
    } else {
      result.push(fullKey);
    }
  }
  return result.sort();
}

function flattenValues(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenValues(value as Record<string, unknown>, fullKey));
    } else if (typeof value === "string") {
      result[fullKey] = value;
    } else {
      result[fullKey] = String(value ?? "");
    }
  }
  return result;
}

// Technical strings (commands, URLs, format placeholders) that must be
// identical regardless of locale — they are code, not prose.
const ALLOWED_IDENTICAL_VALUES = new Set([
  "CodeCamp Advantage",
  "codecamp-advantage",
  "git checkout -b feature/{description}",
  "https://github.com/owner/repo/pull/123",
  "Issue #{number}: {title}",
]);

describe("key parity between th.json and en.json", () => {
  const enKeys = flattenKeys(enMessages as Record<string, unknown>);
  const thKeys = flattenKeys(thMessages as Record<string, unknown>);

  it("th.json has exactly the same keys as en.json (no missing keys)", () => {
    const missing = enKeys.filter((k) => !thKeys.includes(k));
    expect(missing, `Keys missing from th.json: ${missing.join(", ")}`).toEqual(
      [],
    );
  });

  it("th.json has no extra keys beyond en.json", () => {
    const extra = thKeys.filter((k) => !enKeys.includes(k));
    expect(extra, `Extra keys in th.json: ${extra.join(", ")}`).toEqual([]);
  });

  it("key count matches exactly", () => {
    expect(thKeys.length).toBe(enKeys.length);
  });
});

describe("Thai value quality", () => {
  const enValues = flattenValues(enMessages as Record<string, unknown>);
  const thValues = flattenValues(thMessages as Record<string, unknown>);

  for (const key of Object.keys(enValues)) {
    it(`th.json "${key}" is non-empty`, () => {
      expect(thValues[key]).toBeTruthy();
      expect(thValues[key].trim().length).toBeGreaterThan(0);
    });

    if (!ALLOWED_IDENTICAL_VALUES.has(enValues[key])) {
      it(`th.json "${key}" is not byte-identical to English (excluding proper nouns)`, () => {
        const en = enValues[key];
        const th = thValues[key];
        if (th) {
          expect(th.trim(), `"${key}" should not be identical to English "${en}"`).not.toBe(en.trim());
        }
      });
    }
  }
});
