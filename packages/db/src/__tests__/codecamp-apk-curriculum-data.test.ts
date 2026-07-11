import { describe, expect, it } from "vitest";
import { getCodecampAPKCurriculumData } from "../seed/codecamp-apk-curriculum-data.js";

describe("Codecamp APK curriculum data", () => {
  it("publishes append-only Unit 20 with complete gradual release and stable IDs", () => {
    const [unit] = getCodecampAPKCurriculumData().modules;
    expect(unit).toMatchObject({ slug: "apk-game-creation", order: 20, status: "published" });
    expect(unit?.lessons.map(({ order, contentJson }) => ({ order, activityId: contentJson.activityId, mode: contentJson.mode }))).toEqual([
      { order: 1, activityId: "codecamp.activity.apk.ido", mode: "worked_example" },
      { order: 2, activityId: "codecamp.activity.apk.wedo", mode: "guided_practice" },
      { order: 3, activityId: "codecamp.activity.apk.youdo", mode: "independent_practice" },
    ]);
    expect(unit?.lessons.every(({ contentJson }) => contentJson.localePolicy === "bilingual")).toBe(true);
  });
});
