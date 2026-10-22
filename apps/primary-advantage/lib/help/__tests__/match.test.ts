// @vitest-environment node
import { describe, expect, it } from "vitest";
import { helpVideosFor, routeScore } from "../match";
import type { HelpVideo } from "../videos";

const ids = (videos: readonly HelpVideo[]) => videos.map((v) => v.id);

describe("routeScore", () => {
  it("matches static and dynamic segments, and ranks static segments higher", () => {
    expect(routeScore("/teacher/class-roster/[classroomId]", "/teacher/class-roster/abc")).toBe(5);
    expect(routeScore("/teacher/class-roster/[classroomId]/qr-cards", "/teacher/class-roster/abc/qr-cards")).toBe(7);
    expect(routeScore("/teacher/class-roster/[classroomId]", "/teacher/class-roster/abc/qr-cards")).toBeNull();
    expect(routeScore("/teacher/manual", "/teacher/my-students")).toBeNull();
  });

  it("ignores the query, the hash, and a trailing slash", () => {
    expect(routeScore("/student/home", "/student/home/?tab=1#top")).toBe(4);
  });

  it("matches catch-all segments", () => {
    expect(routeScore("/student/stories/[[...path]]", "/student/stories")).toBe(5);
    expect(routeScore("/student/stories/[[...path]]", "/student/stories/a/b")).toBe(5);
    expect(routeScore("/b/[book]/[n]/[...rest]", "/b/x/1")).toBeNull();
    expect(routeScore("/b/[book]/[n]/[...rest]", "/b/x/1/y")).toBe(5);
  });
});

describe("helpVideosFor (spec FR-2, FR-4)", () => {
  it("lists the page's own video first on the QR card page (AC-1)", () => {
    const { matched, general } = helpVideosFor("/teacher/class-roster/abc/qr-cards", "teacher");
    expect(ids(matched)).toEqual(["B4"]);
    expect(ids(general)).toEqual(["A2", "E7"]);
  });

  it("keeps the registry order for videos of the same page", () => {
    expect(ids(helpVideosFor("/teacher/class-roster/abc", "teacher").matched)).toEqual(["B3", "D2", "B4", "E2", "E5"]);
  });

  it("puts the more specific page first", () => {
    const lesson = "/teacher/class-roster/c/books/b/lessons/3";
    expect(ids(helpVideosFor(lesson, "teacher").matched)).toEqual(["D3", "J4", "J5"]);
    expect(ids(helpVideosFor(`${lesson}/print`, "teacher").matched)).toEqual(["J4"]);
  });

  it("gives only the general videos on a page with no video (AC-3)", () => {
    const { matched, general } = helpVideosFor("/teacher/my-students", "teacher");
    expect(matched).toEqual([]);
    expect(ids(general)).toEqual(["A2", "E7"]);
  });

  it("does not repeat a matched general video in the general list", () => {
    const { matched, general } = helpVideosFor("/student/home", "student");
    expect(ids(matched)).toEqual(["C1", "F3", "G2", "J1"]);
    expect(ids(general)).toEqual(["C2"]);
  });

  it("gives the teacher home its own video, with the overview as a general video", () => {
    const { matched, general } = helpVideosFor("/teacher/dashboard", "teacher");
    expect(ids(matched)).toEqual(["E1"]);
    expect(ids(general)).toEqual(["A2", "E7"]);
  });

  it("gives a game page only the video of that game", () => {
    expect(ids(helpVideosFor("/student/games/apk/potion-rush", "student").matched)).toEqual(["I1"]);
    expect(ids(helpVideosFor("/student/games", "student").matched)).toEqual(["I0"]);
  });

  it("keeps teacher and student videos apart on the sign-in page", () => {
    expect(ids(helpVideosFor("/auth/signin", "teacher").matched)).toEqual(["B5"]);
    expect(ids(helpVideosFor("/auth/signin", "student").matched)).toEqual(["B1"]);
  });

  it("leaves out a video on hold", () => {
    const videos: HelpVideo[] = [
      { id: "Z1", audience: "student", format: "9x16", routes: ["/student/home"], general: false, title: { th: "ก", en: "A" }, durationSec: 10, enabled: false },
    ];
    expect(helpVideosFor("/student/home", "student", videos).matched).toEqual([]);
  });
});
