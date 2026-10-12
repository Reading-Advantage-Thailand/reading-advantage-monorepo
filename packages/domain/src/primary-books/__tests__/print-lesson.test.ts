import { describe, expect, it } from "vitest";
import { printLessonSchema } from "../print/contracts.js";
import { samplePrintFile } from "./fixtures.js";

describe("printLessonSchema", () => {
  it("accepts a print export and keeps the series fields and the lesson fields", () => {
    const parsed = printLessonSchema.parse(samplePrintFile());
    expect(parsed).toMatchObject({ seriesName: "Origins 3.2", seriesLevel: "A0+", lessonNumber: 1, packageKey: "o3-2/1" });
    expect(parsed.lesson.lesson_title).toBe("Hello! I Am May");
  });

  it("accepts the legacy image array and a plain string in article_image_url", () => {
    const lesson = (samplePrintFile().lesson as Record<string, unknown>);
    expect(printLessonSchema.safeParse(samplePrintFile({ lesson: { ...lesson, article_image_url: "https://x.test/a.png" } })).success).toBe(true);
    expect(printLessonSchema.safeParse(samplePrintFile({ lesson: { ...lesson, article_image_url: ["https://x.test/a.png"] } })).success).toBe(true);
    expect(printLessonSchema.safeParse(samplePrintFile({ lesson: { ...lesson, article_image_url: 5 } })).success).toBe(false);
  });

  it("keeps fields that the template reads and the shared schema does not list", () => {
    const parsed = printLessonSchema.parse(samplePrintFile());
    expect(parsed.lesson.writing_practice_url).toBe("https://primary.reading-advantage.com/b/o3-2/1/write");
  });

  it("refuses a file with no title, a bad package key, or a lesson number that does not match the key", () => {
    expect(printLessonSchema.safeParse(samplePrintFile({ lesson: {} })).success).toBe(false);
    expect(printLessonSchema.safeParse(samplePrintFile({ packageKey: "bad" })).success).toBe(false);
    expect(printLessonSchema.safeParse(samplePrintFile({ lessonNumber: 2 })).success).toBe(false);
  });

  it("accepts a Workbooks commit id and refuses a malformed one", () => {
    expect(printLessonSchema.safeParse(samplePrintFile({ workbooksCommit: "08bb160b8cfb4b95252546e6fd0e9ccc31fe3817" })).success).toBe(true);
    expect(printLessonSchema.safeParse(samplePrintFile({ workbooksCommit: "zz" })).success).toBe(false);
  });
});
