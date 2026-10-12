import { describe, expect, it } from "vitest";
import { bookCardFirst, classBookIdFromHref, judgeGuideContent, judgeLessonPage, judgeManualPage, judgeProgressAndTaught, judgeProjector, judgeProjectorUse, judgeStudentLanding, judgeStudentUnlock, pointerOf } from "../class-book-checks.mjs";

const good = { title: "Lesson 1 · The Fox", stepCount: 13, hasProjectorLink: true, hasAnswerKey: true, answerKeyEmpty: false, notLinked: false };

describe("class book checks", () => {
  it("reads the class book id from a plan link", () => {
    expect(classBookIdFromHref("/en/teacher/class-roster/c1/books/abc-123")).toBe("abc-123");
    expect(classBookIdFromHref("/en/teacher/class-roster/c1/books/abc-123/progress")).toBe("abc-123");
    expect(classBookIdFromHref(null)).toBe("");
  });
  it("needs the book card above the sign-in panel", () => {
    expect(bookCardFirst(100, 400)).toBe(true);
    expect(bookCardFirst(500, 400)).toBe(false);
    expect(bookCardFirst(null, 400)).toBe(false);
    expect(bookCardFirst(100, null)).toBe(false);
  });
  it("passes a good lesson page", () => {
    expect(judgeLessonPage(good).every((c) => c.ok)).toBe(true);
  });
  it("names each failed lesson check", () => {
    const bad = judgeLessonPage({ ...good, title: "Lesson 1 · ", stepCount: 12, hasProjectorLink: false, hasAnswerKey: false, notLinked: true });
    expect(bad.filter((c) => !c.ok).map((c) => c.name)).toEqual([
      "class book: lesson 1 page shows the lesson title",
      "class book: lesson 1 page shows the 13 guide steps",
      "class book: lesson 1 page has the projector link",
      "class book: lesson 1 page shows the answer key",
      "class book: lesson 1 is linked to an article",
    ]);
  });
  it("fails an empty answer key", () => {
    expect(judgeLessonPage({ ...good, answerKeyEmpty: true }).some((c) => !c.ok)).toBe(true);
  });
  it("needs article text on the projector", () => {
    expect(judgeProjector({ heading: "The Fox", paragraphs: 5 })[0].ok).toBe(true);
    expect(judgeProjector({ heading: "Lesson 1 · The Fox", paragraphs: 0 })[0].ok).toBe(false);
    expect(judgeProjector({ heading: "The Fox", paragraphs: 0 })[0].ok).toBe(false);
  });
  it("needs the student in the lesson flow", () => {
    expect(judgeStudentLanding("/en/student/lesson/abc?type=article".split("?")[0], "Read")[0].ok).toBe(true);
    expect(judgeStudentLanding("/en/b/o3-2/1", "This page could not be found")[0].ok).toBe(false);
    expect(judgeStudentLanding("/en/student/home", "Home")[0].ok).toBe(false);
  });
});

describe("teacher manual checks (S6)", () => {
  it("passes a good manual page and fails the empty guide", () => {
    expect(judgeManualPage({ howToItems: 5, stepItems: 13, notImported: false }).every((c) => c.ok)).toBe(true);
    expect(judgeManualPage({ howToItems: 5, stepItems: 0, notImported: true })[1].ok).toBe(false);
    expect(judgeManualPage({ howToItems: 4, stepItems: 13, notImported: false })[0].ok).toBe(false);
  });
  it("judges the student unlock", () => {
    expect(judgeStudentUnlock({ readBefore: false, readAfter: true, landedPath: "/en/student/lesson/abc" }).every((c) => c.ok)).toBe(true);
    expect(judgeStudentUnlock({ readBefore: true, readAfter: true, landedPath: "/en/student/lesson/abc" })[0].ok).toBe(false);
    expect(judgeStudentUnlock({ readBefore: false, readAfter: false, landedPath: "" })[1].ok).toBe(false);
  });
  it("needs the guide parts", () => {
    expect(judgeGuideContent({ teacherActions: 13, teacherLanguage: 13, scripts: 13 }).every((c) => c.ok)).toBe(true);
    expect(judgeGuideContent({ teacherActions: 13, teacherLanguage: 13, scripts: 0 }).filter((c) => !c.ok)).toHaveLength(1);
  });
  it("judges the projector use", () => {
    expect(judgeProjectorUse({ focusStatus: "Paragraph 1 of 6", revealButtons: 5, pressedAfter: true }).every((c) => c.ok)).toBe(true);
    expect(judgeProjectorUse({ focusStatus: "Tap a paragraph", revealButtons: 0, pressedAfter: false }).every((c) => !c.ok)).toBe(true);
  });
  it("reads the pointer and judges the move", () => {
    expect(pointerOf("Lesson 3 of 14 · 1 lesson taught")).toBe(3);
    expect(pointerOf("")).toBe(0);
    expect(judgeProgressAndTaught({ studentRows: 2, before: "Lesson 1 of 14", after: "Lesson 2 of 14" }).every((c) => c.ok)).toBe(true);
    expect(judgeProgressAndTaught({ studentRows: 0, before: "Lesson 1 of 14", after: "Lesson 1 of 14" }).every((c) => !c.ok)).toBe(true);
    expect(judgeProgressAndTaught({ studentRows: 2, before: "Lesson 2 of 14", after: "Lesson 2 of 14", skipped: true })[1].ok).toBe(true);
  });
});
