import { describe, expect, it } from "vitest";
import { bookCardFirst, classBookIdFromHref, judgeLessonPage, judgeProjector, judgeStudentLanding } from "../class-book-checks.mjs";

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
