import { describe, expect, it } from "vitest";
import { importLessonResultSchema, importReportSchema } from "../contracts.js";

const lesson = { key: "book-1:1", title: "Lesson 1", bookKey: "book-1", number: 1, action: "linked", approved: true, articleId: "a1", legacyArticleId: null, tagged: true };

describe("primary book import report contract", () => {
  it("defaults printed to false and keeps an optional reason", () => {
    expect(importLessonResultSchema.parse(lesson)).toEqual({ ...lesson, printed: false });
    expect(importLessonResultSchema.parse({ ...lesson, reason: "no match", printed: true })).toMatchObject({ reason: "no match", printed: true });
  });

  it("accepts every import action and rejects an unknown one", () => {
    for (const action of ["new-article", "linked", "unmapped", "catalogue-only", "skipped"]) {
      expect(importLessonResultSchema.parse({ ...lesson, action }).action).toBe(action);
    }
    expect(() => importLessonResultSchema.parse({ ...lesson, action: "deleted" })).toThrow();
  });

  it("rejects a fractional lesson number and a missing article id", () => {
    expect(() => importLessonResultSchema.parse({ ...lesson, number: 1.5 })).toThrow();
    const { articleId: _articleId, ...withoutArticle } = lesson;
    expect(() => importLessonResultSchema.parse(withoutArticle)).toThrow();
  });

  it("parses a dry-run report with its lessons", () => {
    expect(importReportSchema.parse({ dryRun: true, lessons: [lesson] })).toEqual({ dryRun: true, lessons: [{ ...lesson, printed: false }] });
    expect(() => importReportSchema.parse({ lessons: [] })).toThrow();
  });
});
