import { describe, expect, it } from "vitest";
import { QR_PATHS, judgeCasePage, judgeLanding, judgeSignedInLesson, judgeWritingArticle } from "../qr-path-checks.mjs";

const landing = { status: 200, hasLanding: true, text: "Primary Advantage Origins 3.2 Lesson 1: The Fox Which app do you use?", hasSchoolChoice: true };

describe("qr path checks", () => {
  it("keeps the paths of spec S6", () => {
    expect(QR_PATHS).toEqual({ read: "/b/o3-2/1", writing: "/b/o3-2/1/writing", unknownBook: "/b/zz/1", noLesson: "/b/o3-2/999", unknownAddress: "/b/o3-2/5/other" });
  });
  it("passes a good landing", () => {
    expect(judgeLanding("qr read", landing).every((c) => c.ok)).toBe(true);
  });
  it("names each failed landing check", () => {
    const bad = judgeLanding("qr read", { status: 502, hasLanding: false, text: "", hasSchoolChoice: false });
    expect(bad.filter((c) => !c.ok).map((c) => c.name)).toEqual([
      "qr read: signed-out landing shows (status below 500)",
      "qr read: landing names the book",
      "qr read: landing has the school choice",
    ]);
  });
  it("needs the writing task line on the writing landing", () => {
    expect(judgeLanding("qr writing", landing, true).some((c) => !c.ok)).toBe(true);
    expect(judgeLanding("qr writing", { ...landing, text: `${landing.text} Writing task` }, true).every((c) => c.ok)).toBe(true);
  });
  it("needs the lesson flow after the class code sign-in", () => {
    expect(judgeSignedInLesson("/en/student/lesson/abc", "Lesson").every((c) => c.ok)).toBe(true);
    expect(judgeSignedInLesson("/en/student", "Home")[0].ok).toBe(false);
    expect(judgeSignedInLesson("/en/student/lesson/abc", "Page could not be found")[0].ok).toBe(false);
  });
  it("needs the article page for the writing code", () => {
    expect(judgeWritingArticle("/en/student/read/cabc123", "Read").every((c) => c.ok)).toBe(true);
    expect(judgeWritingArticle("/en/student", "Home")[0].ok).toBe(false);
  });
  it("needs the right case page with a status below 500", () => {
    expect(judgeCasePage("qr unknown book", { status: 200, caseName: "unknown-book" }, "unknown-book")[0].ok).toBe(true);
    expect(judgeCasePage("qr unknown book", { status: 404, caseName: "unknown-book" }, "unknown-book")[0].ok).toBe(true);
    expect(judgeCasePage("qr unknown book", { status: 500, caseName: "unknown-book" }, "unknown-book")[0].ok).toBe(false);
    expect(judgeCasePage("qr unknown book", { status: 200, caseName: null }, "unknown-book")[0].ok).toBe(false);
    expect(judgeCasePage("qr no lesson", { status: 200, caseName: "unknown-book" }, "no-lesson")[0].ok).toBe(false);
  });
});
