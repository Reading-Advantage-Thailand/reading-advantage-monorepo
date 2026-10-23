import { describe, expect, it } from "vitest";
import { helpArea, teacherHelpIndex } from "../areas";
import { HELP_VIDEOS } from "../videos";

const video = (id: string) => {
  const found = HELP_VIDEOS.find((v) => v.id === id);
  if (!found) throw new Error(`no video ${id}`);
  return found;
};

describe("helpArea (FR-9)", () => {
  it("puts each teacher video in its area", () => {
    expect(Object.fromEntries(["B5", "B3", "B4", "E2", "D2", "D3", "D6", "E4", "E5", "E6", "F5", "H1", "A2", "E7", "E1"].map((id) => [id, helpArea(video(id))]))).toEqual({
      B5: "signin",
      B3: "roster",
      B4: "roster",
      E2: "roster",
      D2: "books",
      D3: "books",
      D6: "books",
      E4: "reports",
      E5: "reports",
      E6: "games",
      F5: "avatars",
      H1: "quest",
      A2: "start",
      E7: "start",
      E1: "start",
    });
  });
});

describe("teacherHelpIndex (FR-9)", () => {
  it("lists every enabled teacher video once, by area, in page order", () => {
    const index = teacherHelpIndex();
    const ids = index.flatMap((group) => group.videos.map((v) => v.id));
    expect(ids.sort()).toEqual(HELP_VIDEOS.filter((v) => v.enabled && v.audience === "teacher").map((v) => v.id).sort());
    expect(index.map((group) => group.area)).toEqual(["start", "signin", "roster", "books", "reports", "games", "avatars", "quest"]);
  });

  it("leaves out a disabled video and an empty area", () => {
    const index = teacherHelpIndex([{ ...video("E6"), enabled: false }, video("B5")]);
    expect(index).toEqual([{ area: "signin", videos: [video("B5")] }]);
  });
});
