import { describe, expect, it } from "vitest";

import type { WorkbookNormalizedContent } from "../contracts.js";
import { compileTeacherManual } from "./compiler.js";

/**
 * Normalized lesson fixture following the lesson-fixture patterns: a valid
 * workbookNormalizedContentSchema payload carrying the carriers the
 * teacher-manual generators consume.
 * @param title Lesson title used as the content title and paragraph text.
 * @param cefrLevel CEFR label for the lesson.
 * @param lessonNumber Legacy lesson number carried on the content.
 * @returns A normalized content that compiles into a lesson plan.
 */
function makeNormalizedLesson(
  title: string,
  cefrLevel: string,
  lessonNumber: string
): WorkbookNormalizedContent {
  return {
    title,
    cefrLevel,
    paragraphs: [
      { order: 0, text: `${title} first paragraph.` },
      { order: 1, text: `${title} second paragraph.` },
    ],
    questions: [],
    assets: [],
    lessonNumber,
    genre: "science",
    articleType: "expository",
    vocabulary: [
      { word: "orbit", definition: "The path a planet takes around a star." },
    ],
    reflectionFocus: "What did you learn?",
  };
}

describe("compileTeacherManual", () => {
  it("compiles two normalized contents into one document with both lesson plans in order", () => {
    const result = compileTeacherManual(
      [
        makeNormalizedLesson("The Night Sky", "A2", "1"),
        makeNormalizedLesson("Ocean Life", "A2", "2"),
      ],
      "Reading Advantage Origins",
      "Level 2",
      "A2",
      "primary",
      "en"
    );

    expect(result.lessonCount).toBe(2);
    expect(result.html).toContain("<!DOCTYPE html>");
    expect(result.html).toContain('<div class="tm-lesson-plan" id="lesson-1">');
    expect(result.html).toContain('<div class="tm-lesson-plan" id="lesson-2">');
    expect(result.html.indexOf("The Night Sky")).toBeGreaterThan(0);
    expect(result.html.indexOf("Ocean Life")).toBeGreaterThan(
      result.html.indexOf("The Night Sky")
    );
    expect(result.html.indexOf('id="lesson-1"')).toBeLessThan(
      result.html.indexOf('id="lesson-2"')
    );
  });

  it("includes front matter and end matter in the compiled document", () => {
    const result = compileTeacherManual(
      [makeNormalizedLesson("The Night Sky", "A2", "1")],
      "Reading Advantage Origins",
      "Level 2",
      "A2"
    );

    expect(result.html).toContain('<div class="tm-title-page">');
    expect(result.html).toContain('<div class="tm-section tm-preface">');
    expect(result.html).toContain('<div class="tm-section tm-end-section">');
  });

  it("compiles an empty lessons array to a document with zero lesson plans", () => {
    // Legacy compiler behavior: the compiler itself never throws on an empty
    // array (the legacy API route guards it earlier); it emits front and end
    // matter with no lesson plans and lessonCount 0.
    const result = compileTeacherManual([], "Reading Advantage Origins", "Level 2", "A2");

    expect(result.lessonCount).toBe(0);
    expect(result.html).toContain("<!DOCTYPE html>");
    expect(result.html).toContain('<div class="tm-title-page">');
    expect(result.html).toContain('<div class="tm-section tm-end-section">');
    expect(result.html).not.toContain('<div class="tm-lesson-plan"');
    expect(result.html).not.toContain('id="lesson-1"');
  });

  it("escapes script-tagged series metadata in the preface welcome", () => {
    const result = compileTeacherManual(
      [makeNormalizedLesson("The Night Sky", "A1", "1")],
      '<script>alert("x")</script> & Sons',
      "Level <b>2</b>",
      "A1"
    );

    const prefaceStart = result.html.indexOf('<div class="tm-section tm-preface">');
    const structureStart = result.html.indexOf('<div class="tm-section">', prefaceStart);
    const prefaceBlock = result.html.slice(prefaceStart, structureStart);

    expect(prefaceBlock).toContain(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; Sons"
    );
    expect(prefaceBlock).toContain("Level &lt;b&gt;2&lt;/b&gt;");
    expect(prefaceBlock).not.toContain("<script>alert");
    expect(prefaceBlock).not.toContain("<b>2</b>");
  });
});
