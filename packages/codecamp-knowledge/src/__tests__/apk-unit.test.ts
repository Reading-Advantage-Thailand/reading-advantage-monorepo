import { describe, expect, it } from "vitest";
import { codecampAPKUnit, CodecampAPKUnitSchema, createCodecampAPKActivity } from "../apk-unit.js";

describe("Codecamp APK game-creation unit", () => {
  it("freezes versioned placement, cohort migration, gradual release, and bilingual activity resources", () => {
    expect(CodecampAPKUnitSchema.safeParse(codecampAPKUnit).success).toBe(true);
    expect(codecampAPKUnit.migration).toMatchObject({ strategy: "append-only-versioned", inProgressCohorts: "retain-original-sequence" });
    expect(codecampAPKUnit.activityIds).toEqual([codecampAPKUnit.ido.activityId, codecampAPKUnit.wedo.activityId, codecampAPKUnit.youdo.activityId]);
    expect(createCodecampAPKActivity("en").activityId).toBe(codecampAPKUnit.ido.activityId);
    const thai = createCodecampAPKActivity("th");
    expect(thai.resources.find((resource) => resource.kind === "transcript")).toMatchObject({ language: "th" });
  });

  it("fails closed on activity drift, unsafe cohort migration, and incomplete rubric weights", () => {
    const drift = structuredClone(codecampAPKUnit);
    drift.wedo.activityId = "wrong";
    expect(CodecampAPKUnitSchema.safeParse(drift).success).toBe(false);
    const migration = structuredClone(codecampAPKUnit) as unknown as { migration: { inProgressCohorts: string } };
    migration.migration.inProgressCohorts = "renumber-everyone";
    expect(CodecampAPKUnitSchema.safeParse(migration).success).toBe(false);
    const rubric = structuredClone(codecampAPKUnit);
    rubric.youdo.rubric.dimensions[0]!.weight = 0.9;
    expect(CodecampAPKUnitSchema.safeParse(rubric).success).toBe(false);
  });
});
