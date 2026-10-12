import { describe, expect, it } from "vitest";
import {
  cuidFromImageSrc,
  judgeChapterPage,
  judgeOldChapterRedirect,
  judgeOldListRedirect,
  judgeOldStoryRedirect,
  judgeStoriesTab,
  judgeStoryPage,
  judgeUnknownCuid,
} from "../stories-checks.mjs";

describe("stories checks", () => {
  it("reads the cuid from a story picture key", () => {
    expect(cuidFromImageSrc("https://cdn.example/images/story/cmmcadr1q00rjs6012b0ym9oa.png")).toBe("cmmcadr1q00rjs6012b0ym9oa");
    expect(cuidFromImageSrc("/images/story/abc123.png?x=1")).toBe("abc123");
    expect(cuidFromImageSrc(null)).toBe("");
    expect(cuidFromImageSrc("https://cdn.example/images/other.png")).toBe("");
  });
  it("needs the old list URL on the Stories tab", () => {
    expect(judgeOldListRedirect("/en/student/read/stories")[0].ok).toBe(true);
    expect(judgeOldListRedirect("/en/student/stories")[0].ok).toBe(false);
    expect(judgeOldListRedirect(null)[0].ok).toBe(false);
  });
  it("needs the tab sign and a story on the shelf", () => {
    const facts = { text: "Articles Stories The Lantern", storyLinks: 3 };
    expect(judgeStoriesTab(facts).every((c) => c.ok)).toBe(true);
    expect(judgeStoriesTab({ ...facts, storyLinks: 0 }).some((c) => !c.ok)).toBe(true);
    expect(judgeStoriesTab({ ...facts, text: "Articles" }).some((c) => !c.ok)).toBe(true);
  });
  it("needs chapters and characters on the story page", () => {
    const facts = { text: "Chapters Characters", chapterLinks: 8 };
    expect(judgeStoryPage(facts).every((c) => c.ok)).toBe(true);
    expect(judgeStoryPage({ ...facts, chapterLinks: 0 }).some((c) => !c.ok)).toBe(true);
    expect(judgeStoryPage({ ...facts, text: "Chapters" }).some((c) => !c.ok)).toBe(true);
  });
  it("needs the player and the passage on the chapter page", () => {
    const facts = { pathname: "/en/student/read/stories/u/1", text: "Listen and read along", passageChars: 1200 };
    expect(judgeChapterPage(facts).every((c) => c.ok)).toBe(true);
    expect(judgeChapterPage({ ...facts, text: "Read" }).some((c) => !c.ok)).toBe(true);
    expect(judgeChapterPage({ ...facts, passageChars: 40 }).some((c) => !c.ok)).toBe(true);
  });
  it("needs the old URLs on the new pages", () => {
    expect(judgeOldStoryRedirect({ landed: "/en/student/read/stories/u", storyPath: "/en/student/read/stories/u" })[0].ok).toBe(true);
    expect(judgeOldStoryRedirect({ landed: "/en/student/stories/cuid", storyPath: "/en/student/read/stories/u" })[0].ok).toBe(false);
    expect(judgeOldChapterRedirect({ landed: "/en/student/read/stories/u/1", chapterPath: "/en/student/read/stories/u/1" })[0].ok).toBe(true);
    expect(judgeOldChapterRedirect({ landed: "/en/student/read/stories/u", chapterPath: "/en/student/read/stories/u/1" })[0].ok).toBe(false);
  });
  it("needs not found for an unknown story id", () => {
    expect(judgeUnknownCuid({ status: 404, text: "" })[0].ok).toBe(true);
    expect(judgeUnknownCuid({ status: 200, text: "Page could not be found" })[0].ok).toBe(true);
    expect(judgeUnknownCuid({ status: 200, text: "The Lantern" })[0].ok).toBe(false);
  });
});
