import { describe, expect, it } from "vitest";

import { getTranslations } from "./i18n/index.js";
import { en } from "./i18n/en.js";
import { th } from "./i18n/th.js";

/**
 * Collects a signature for every leaf of a translation bundle. Objects are
 * recursed into, arrays contribute a path plus their length (so array-length
 * parity is checked too), and functions and primitives contribute their path.
 * @param value The translation bundle section to walk.
 * @param path Dot-separated path of the current value.
 * @param signatures Set receiving the collected leaf signatures.
 */
function collectSignatures(
  value: unknown,
  path: string,
  signatures: Set<string>,
): void {
  if (Array.isArray(value)) {
    signatures.add(`${path}[]:${value.length}`);
    return;
  }
  if (typeof value === "object" && value !== null) {
    for (const [key, child] of Object.entries(value)) {
      collectSignatures(child, path === "" ? key : `${path}.${key}`, signatures);
    }
    return;
  }
  signatures.add(path);
}

describe("teacher-manual translations", () => {
  it("en and th expose identical recursive key sets with equal array lengths", () => {
    const enSignatures = new Set<string>();
    const thSignatures = new Set<string>();
    collectSignatures(en, "", enSignatures);
    collectSignatures(th, "", thSignatures);
    expect([...thSignatures].sort()).toEqual([...enSignatures].sort());
  });

  it("both bundles define teaching notes content for all 13 steps", () => {
    const steps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;
    for (const step of steps) {
      const enNotes = en.teachingNotesContent[step];
      const thNotes = th.teachingNotesContent[step];
      expect(enNotes).toBeDefined();
      expect(thNotes).toBeDefined();
      expect(enNotes.teacherActions.length).toBe(thNotes.teacherActions.length);
      expect(enNotes.teacherLanguage.length).toBe(thNotes.teacherLanguage.length);
      expect(enNotes.studentActions.length).toBe(thNotes.studentActions.length);
      expect(enNotes.watchFor.length).toBe(thNotes.watchFor.length);
    }
  });

  it("getTranslations returns the requested bundle", () => {
    expect(getTranslations("en")).toBe(en);
    expect(getTranslations("th")).toBe(th);
  });

  it("getTranslations falls back to English for unknown languages", () => {
    expect(getTranslations("fr")).toBe(en);
    expect(getTranslations("")).toBe(en);
  });
});
