// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const app = resolve(import.meta.dirname, "..");
const english = JSON.parse(readFileSync(resolve(app, "messages/en.json"), "utf8")) as Record<string, unknown>;
const thai = JSON.parse(readFileSync(resolve(app, "messages/th.json"), "utf8")) as Record<string, unknown>;

describe("Phase 3 at-home messages", () => {
  it("defines the same non-empty message keys in Thai and English", () => {
    const englishKeys = Object.keys(english).sort();
    const thaiKeys = Object.keys(thai).sort();
    expect(englishKeys.length, "English messages must not be empty").toBeGreaterThan(0);
    expect(thaiKeys.length, "Thai messages must not be empty").toBeGreaterThan(0);
    expect(thaiKeys).toEqual(englishKeys);
  });

  it("has no blank Thai strings and uses Sarabun for Thai app text", () => {
    const thaiStrings = Object.values(thai).filter((value): value is string => typeof value === "string");
    expect(thaiStrings.length, "Thai message strings must exist").toBeGreaterThan(0);
    expect(thaiStrings.every((value) => value.trim().length > 0), "Thai strings must not be blank").toBe(true);
    const css = readFileSync(resolve(app, "app/globals.css"), "utf8");
    expect(css, "Thai app text must use Sarabun").toMatch(/Sarabun/i);
  });
});
