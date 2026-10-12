import { describe, expect, it } from "vitest";
import { tutorLessonUrl } from "../tutor-url";

const template = "https://tutor.example.com/lesson/{book}/{n}";

describe("tutorLessonUrl", () => {
  it("fills the book key and the number", () => {
    expect(tutorLessonUrl({ book: "o3-2", number: 5, template })).toBe("https://tutor.example.com/lesson/o3-2/5");
  });

  it("returns null for an empty or missing setting", () => {
    expect(tutorLessonUrl({ book: "o3-2", number: 5, template: "" })).toBeNull();
    expect(tutorLessonUrl({ book: "o3-2", number: 5, template: undefined })).toBeNull();
  });

  it("returns null for a template that is not https", () => {
    expect(tutorLessonUrl({ book: "o3-2", number: 5, template: "http://tutor.example.com/{book}/{n}" })).toBeNull();
    expect(tutorLessonUrl({ book: "o3-2", number: 5, template: "javascript:alert({book})" })).toBeNull();
    expect(tutorLessonUrl({ book: "o3-2", number: 5, template: "//tutor.example.com/{book}" })).toBeNull();
  });

  it("refuses a book value that is not a valid key, so nothing is injected", () => {
    expect(tutorLessonUrl({ book: "x/../../evil?a=b#", number: 5, template })).toBeNull();
    expect(tutorLessonUrl({ book: "O3 2", number: 5, template })).toBeNull();
    expect(tutorLessonUrl({ book: "", number: 5, template })).toBeNull();
  });

  it("refuses a number that is not a whole number of 1 or more", () => {
    for (const number of [0, -1, 1.5, Number.NaN]) expect(tutorLessonUrl({ book: "o3-2", number, template })).toBeNull();
  });

  it("fills each placeholder every time it appears", () => {
    expect(tutorLessonUrl({ book: "o3-2", number: 5, template: "https://t.example.com/?b={book}&n={n}&r={book}" })).toBe("https://t.example.com/?b=o3-2&n=5&r=o3-2");
  });

  it("reads TUTOR_LESSON_URL_TEMPLATE when no template is given", () => {
    process.env.TUTOR_LESSON_URL_TEMPLATE = template;
    try {
      expect(tutorLessonUrl({ book: "o3-2", number: 5 })).toBe("https://tutor.example.com/lesson/o3-2/5");
    } finally {
      delete process.env.TUTOR_LESSON_URL_TEMPLATE;
    }
  });
});
