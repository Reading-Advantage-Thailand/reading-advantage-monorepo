import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { runTutorialStep } from "@reading-advantage/activity-tutorial";
import { codecampAPKUnit, CodecampAPKUnitSchema, createCodecampAPKActivity, createCodecampAPKTutorialActivity } from "../apk-unit.js";

describe("Codecamp APK game-creation unit", () => {
  it("freezes versioned placement, cohort migration, gradual release, and bilingual activity resources", () => {
    expect(CodecampAPKUnitSchema.safeParse(codecampAPKUnit).success).toBe(true);
    expect(codecampAPKUnit.placement.afterModuleSlug).toBe("real-world-practice");
    expect(codecampAPKUnit.migration).toMatchObject({ strategy: "append-only-versioned", inProgressCohorts: "retain-original-sequence" });
    expect(codecampAPKUnit.activityIds).toEqual([codecampAPKUnit.ido.activityId, codecampAPKUnit.wedo.activityId, codecampAPKUnit.youdo.activityId]);
    expect(createCodecampAPKActivity("en").activityId).toBe(codecampAPKUnit.ido.activityId);
    const thai = createCodecampAPKActivity("th");
    expect(thai.resources.find((resource) => resource.kind === "transcript")).toMatchObject({ language: "th" });
  });

  it("ships distinct guided and independent repository fixtures", async () => {
    expect(createCodecampAPKTutorialActivity("en").tutorialSteps.map(({ stepId }) => stepId)).toEqual(codecampAPKUnit.wedo.manifest.completionCriteria.requiredStepIds);
    const executableManifest = JSON.parse(await readFile(new URL("../../fixtures/apk-guided/activity-tutorial.json", import.meta.url), "utf8"));
    expect(executableManifest).toEqual(codecampAPKUnit.wedo.manifest);
    const guided = await readFile(new URL("../../fixtures/apk-guided/src/cartridge.ts", import.meta.url), "utf8");
    const independent = await readFile(new URL("../../fixtures/apk-independent/src/cartridge.ts", import.meta.url), "utf8");
    expect(guided).toContain("every RuntimeCartridgeManifest field");
    expect(independent).toContain("createSentenceSortingCartridge");
    expect(independent).not.toEqual(guided);
    await expect(runTutorialStep(executableManifest, "wedo.apk.manifest", { readAllowedFile: async () => guided, runAllowedCommand: async () => "", now: () => "2026-07-11T00:00:00Z" })).resolves.toMatchObject({ passed: false, checks: [{ checkId: "manifest.shape", passed: false }, { checkId: "git.clean", passed: true }] });
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
