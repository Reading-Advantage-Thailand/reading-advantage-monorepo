import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Reads a repo file relative to the primary-advantage app root.
 * @param relPath The path relative to the app root.
 * @returns The file contents as text.
 */
function readAppFile(relPath: string): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return readFileSync(path.join(here, "..", "..", relPath), "utf8");
}

describe("primary broken UX fixes", () => {
  // The two cases below pin locale message data content, not application
  // source. Validating translation data shape is a legitimate data-pin use,
  // so they stay while every other case in this file converted to a
  // behavioral test (see broken-ux-behavior.test.tsx and
  // broken-ux-server-behavior.test.tsx; FR-6 maps to
  // student-assignment-table-messages.test.tsx).
  it("FR-1: cn/tw nest VocabularyMatching and Introduction inside Lesson", () => {
    for (const locale of ["cn", "tw"]) {
      const messages = JSON.parse(readAppFile(`messages/${locale}.json`));
      expect(messages.Lesson.VocabularyMatching).toBeDefined();
      expect(messages.Lesson.Introduction).toBeDefined();
      expect(messages.VocabularyMatching).toBeUndefined();
      expect(messages.Introduction).toBeUndefined();
    }
  });

  it("FR-1: Lesson.VocabularyMatching resolves keys in cn/tw", () => {
    for (const locale of ["cn", "tw"]) {
      const messages = JSON.parse(readAppFile(`messages/${locale}.json`));
      expect(messages.Lesson.VocabularyMatching.start.title).toBeDefined();
      expect(messages.Lesson.Introduction.phase1Title).toBeDefined();
    }
  });
});
