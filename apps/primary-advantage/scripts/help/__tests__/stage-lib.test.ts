// @vitest-environment node
import { describe, expect, it } from "vitest";
import { moovFirst, videoFileFor, youtubeIds } from "../stage-lib";

/** One MP4 box header: a 32-bit size and a 4-letter type, padded to the size. */
const box = (type: string, size: number) => {
  const b = Buffer.alloc(size);
  b.writeUInt32BE(size, 0);
  b.write(type, 4, "latin1");
  return b;
};

describe("videoFileFor", () => {
  const files = ["wave1/b4-class-sheet-qr-cards-th.mp4", "wave2/a1-welcome-new-primary-th.mp4", "wave2/a1-welcome-new-primary-th-16x9.mp4", "wave3/i1-potion-rush-th.mp4", "wave3/i10-astral-mage-th.mp4"];

  it("finds the main file of an id, not the 16:9 variant", () => {
    expect(videoFileFor("A1", files)).toBe("wave2/a1-welcome-new-primary-th.mp4");
    expect(videoFileFor("B4", files)).toBe("wave1/b4-class-sheet-qr-cards-th.mp4");
  });

  it("keeps I1 and I10 apart", () => {
    expect(videoFileFor("I1", files)).toBe("wave3/i1-potion-rush-th.mp4");
    expect(videoFileFor("I10", files)).toBe("wave3/i10-astral-mage-th.mp4");
  });

  it("gives undefined for a video with no file", () => {
    expect(videoFileFor("G1", files)).toBeUndefined();
  });
});

describe("moovFirst", () => {
  it("is true when moov comes before mdat (faststart)", () => {
    expect(moovFirst(Buffer.concat([box("ftyp", 24), box("moov", 64), box("mdat", 16)]))).toBe(true);
  });

  it("is false when mdat comes first", () => {
    expect(moovFirst(Buffer.concat([box("ftyp", 24), box("free", 8), box("mdat", 16), box("moov", 64)]))).toBe(false);
  });

  it("is undefined when the head ends before either box", () => {
    expect(moovFirst(box("ftyp", 24))).toBeUndefined();
  });
});

describe("youtubeIds", () => {
  it("maps registry ids to the YouTube ids of PR's links JSON", () => {
    const links = { videos: [{ id: "B4", youtubeId: "-3UpVH9Xp50" }, { id: "Z9", youtubeId: "x" }, { id: "C3", youtubeId: null }] };
    expect(youtubeIds(links, ["B4", "C3", "E1"])).toEqual({ B4: "-3UpVH9Xp50" });
  });

  it("drops an id that is not an 11-character YouTube id", () => {
    const links = { videos: [{ id: "B4", youtubeId: "-3UpVH9Xp50" }, { id: "B5", youtubeId: "abc\" onload=\"x" }, { id: "E1", youtubeId: "https://youtu.be/-3UpVH9Xp50" }] };
    expect(youtubeIds(links, ["B4", "B5", "E1"])).toEqual({ B4: "-3UpVH9Xp50" });
  });

  it("uses the main file row for a duplicate id in either row order", () => {
    const main = { id: "A1", file: "a1-welcome-new-primary-th.mp4", playlist: "students", youtubeId: "GFqxN3rIdQc" };
    const variant = { id: "A1", file: "a1-welcome-new-primary-th-16x9.mp4", playlist: "teachers", youtubeId: "613UdETsOp4" };
    expect(youtubeIds({ videos: [main, variant] }, ["A1"])).toEqual({ A1: "GFqxN3rIdQc" });
    expect(youtubeIds({ videos: [variant, main] }, ["A1"])).toEqual({ A1: "GFqxN3rIdQc" });
  });

  it("drops an id whose only row is the 16:9 variant", () => {
    const links = { videos: [{ id: "A1", file: "a1-welcome-new-primary-th-16x9.mp4", playlist: "teachers", youtubeId: "613UdETsOp4" }] };
    expect(youtubeIds(links, ["A1"])).toEqual({});
  });
});
