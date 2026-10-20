import { describe, expect, it } from "vitest";
import { STAFF_PREVIEW_PAGES, judgePreviewPage } from "../staff-preview-checks.mjs";

const good = { status: 200, pathname: "/en/student/home", hasBanner: true, hasNotice: true, text: "Student preview Exit preview" };

describe("staff preview checks", () => {
  it("lists the pages of spec S3 with the notice flag", () => {
    const paths = STAFF_PREVIEW_PAGES.map((p) => p.path);
    expect(paths).toEqual([
      "/student/home", "/student/avatar", "/student/avatar/shop", "/student/history", "/student/reports",
      "/student/sentences", "/student/vocabulary", "/student/quest/battle", "/student/reedy", "/student/games", "/student/read",
    ]);
    expect(STAFF_PREVIEW_PAGES.filter((p) => p.notice).map((p) => p.path)).toEqual([
      "/student/home", "/student/history", "/student/reports", "/student/sentences", "/student/vocabulary", "/student/quest/battle", "/student/reedy",
    ]);
  });
  it("passes a good page", () => {
    expect(judgePreviewPage("staff teacher home", good, true).every((c) => c.ok)).toBe(true);
  });
  it("fails a redirect to unauthorized", () => {
    const c = judgePreviewPage("staff teacher home", { ...good, pathname: "/en/unauthorized" }, true);
    expect(c.filter((x) => !x.ok).map((x) => x.name)).toEqual(["staff teacher home: stays on the student page"]);
  });
  it("fails a missing banner, a missing notice, and a 5xx status", () => {
    const c = judgePreviewPage("staff admin reports", { ...good, status: 500, hasBanner: false, hasNotice: false }, true);
    expect(c.filter((x) => !x.ok).map((x) => x.name)).toEqual([
      "staff admin reports: status below 500",
      "staff admin reports: Preview banner shows",
      "staff admin reports: preview notice shows",
    ]);
  });
  it("does not need a notice when the page has none", () => {
    expect(judgePreviewPage("staff teacher avatar", { ...good, hasNotice: false }, false).every((c) => c.ok)).toBe(true);
  });
  it("fails the error boundary text", () => {
    const c = judgePreviewPage("staff teacher home", { ...good, text: "Something went wrong" }, true);
    expect(c.some((x) => !x.ok && x.name.endsWith("shows no error page"))).toBe(true);
  });
});
