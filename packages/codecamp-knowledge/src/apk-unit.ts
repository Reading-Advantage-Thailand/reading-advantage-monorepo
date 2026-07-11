import { activitySchema } from "@reading-advantage/activity-runtime/core";
import { tutorialManifestSchema, type TutorialManifest } from "@reading-advantage/activity-tutorial/contracts";
import { z } from "zod";
import { apkLearningBlueprint } from "./apk-blueprint-data.js";

/** Versioned Codecamp game-creation unit contract. */
export const CodecampAPKUnitSchema = z.object({
  schemaVersion: z.literal("codecamp-apk-unit.v1"), unitId: z.literal("codecamp.unit.apk-game-creation"),
  version: z.string().regex(/^\d+\.\d+\.\d+$/), graphVersion: z.string().regex(/^\d+\.\d+\.\d+$/), unitNumber: z.number().int().positive(),
  placement: z.object({ afterModuleSlug: z.string().min(1), prerequisiteObjectiveIds: z.array(z.string().min(1)).min(1) }).strict(),
  migration: z.object({ strategy: z.literal("append-only-versioned"), inProgressCohorts: z.literal("retain-original-sequence"), newCohorts: z.literal("assign-unit-version"), progressKey: z.string().min(1) }).strict(),
  resourceIds: z.array(z.string().min(1)).min(1), activityIds: z.array(z.string().min(1)).length(3),
  ido: z.object({ activityId: z.string(), referenceArtifactId: z.string(), annotatedDiffId: z.string() }).strict(),
  wedo: z.object({ activityId: z.string(), manifest: z.custom<TutorialManifest>((value) => tutorialManifestSchema.safeParse(value).success) }).strict(),
  youdo: z.object({
    activityId: z.string(), repositoryId: z.string(), objectiveId: z.string(), variantKey: z.string(),
    brief: z.record(z.string(), z.string().min(1)), requiredChecks: z.array(z.string().min(1)).min(1),
    rubric: z.object({ rubricId: z.string(), dimensions: z.array(z.object({ dimensionId: z.string(), weight: z.number().positive(), criteria: z.string().min(1) }).strict()).min(1) }).strict(),
  }).strict(),
  srsFollowUps: z.array(z.object({ objectiveId: z.string(), variantKey: z.string(), afterDays: z.number().int().positive() }).strict()).min(1),
}).strict().superRefine((unit, context) => {
  if (new Set(unit.activityIds).size !== unit.activityIds.length) context.addIssue({ code: "custom", path: ["activityIds"], message: "Activity IDs must be distinct" });
  if (unit.ido.activityId !== unit.activityIds[0] || unit.wedo.activityId !== unit.activityIds[1] || unit.youdo.activityId !== unit.activityIds[2]) context.addIssue({ code: "custom", path: ["activityIds"], message: "Gradual-release activity IDs must match their stages" });
  if (unit.wedo.manifest.activityId !== unit.wedo.activityId) context.addIssue({ code: "custom", path: ["wedo", "manifest", "activityId"], message: "Tutorial manifest must bind the We Do activity" });
  const rubricWeight = unit.youdo.rubric.dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
  if (Math.abs(rubricWeight - 1) > 0.0001) context.addIssue({ code: "custom", path: ["youdo", "rubric", "dimensions"], message: "Rubric weights must sum to one" });
});

/** Validated Codecamp APK game-creation unit. */
export type CodecampAPKUnit = z.infer<typeof CodecampAPKUnitSchema>;

const APK_ACTIVITY_IDS = ["codecamp.activity.apk.ido", "codecamp.activity.apk.wedo", "codecamp.activity.apk.youdo"] as const;

/** Reviewed, versioned Codecamp APK unit shared by curriculum, runtime, and reporting adapters. */
export const codecampAPKUnit = CodecampAPKUnitSchema.parse({
  schemaVersion: "codecamp-apk-unit.v1", unitId: "codecamp.unit.apk-game-creation", version: "1.0.0",
  graphVersion: apkLearningBlueprint.graphVersion, unitNumber: 20,
  placement: { afterModuleSlug: "architecture", prerequisiteObjectiveIds: apkLearningBlueprint.prerequisiteRoots.map(({ objectiveId }) => objectiveId) },
  migration: { strategy: "append-only-versioned", inProgressCohorts: "retain-original-sequence", newCohorts: "assign-unit-version", progressKey: "codecamp.unit.apk-game-creation@1.0.0" },
  resourceIds: ["video.apk.phaser-overview", "transcript.apk.phaser-overview", "diagram.apk.boundaries", "repo.apk.guided", "repo.apk.independent", "rubric.apk.independent"],
  activityIds: [...APK_ACTIVITY_IDS],
  ido: { activityId: APK_ACTIVITY_IDS[0], referenceArtifactId: "apk.reference.word-match", annotatedDiffId: "apk.diff.word-match-boundaries" },
  wedo: {
    activityId: APK_ACTIVITY_IDS[1],
    manifest: {
      schemaVersion: "activity-tutorial.v1", repositoryId: "repo.apk.guided", activityId: APK_ACTIVITY_IDS[1],
      activityVersion: "1.0.0", graphVersion: apkLearningBlueprint.graphVersion,
      allowedFiles: ["src/cartridge.ts", "src/game-state.ts"],
      allowedCommands: [{ commandId: "test.cartridge", executable: "pnpm", args: ["test", "--", "cartridge"] }],
      steps: [{ stepId: "wedo.apk.manifest", order: 1, objectiveId: "codecamp.game-development.skill.apk-contract", instruction: { en: "Complete the cartridge manifest and deterministic educational result.", th: "เติม cartridge manifest และผลการเรียนรู้แบบกำหนดได้" }, checks: [{ checkId: "manifest.runtime", kind: "file_contains", filePath: "src/cartridge.ts", expected: "runtimeApiVersion" }, { checkId: "test.cartridge", kind: "command", commandId: "test.cartridge", expected: "passed" }], hints: [{ hintId: "hint.boundary", text: { en: "Keep persistence in the host, not the cartridge.", th: "เก็บ persistence ไว้ใน host ไม่ใช่ cartridge" } }], reveals: [{ revealId: "reveal.fields", text: { en: "The manifest must declare runtimeApiVersion and capabilities.", th: "manifest ต้องระบุ runtimeApiVersion และ capabilities" } }], resourceIds: ["diagram.apk.boundaries"], scaffoldLevel: 2 }],
    },
  },
  youdo: {
    activityId: APK_ACTIVITY_IDS[2], repositoryId: "repo.apk.independent", objectiveId: "codecamp.game-development.skill.apk-contract", variantKey: "apk.apk-contract.independent.transfer",
    brief: { en: "Build a sentence-sorting cartridge that uses a different mechanic from the guided reference and returns a validated educational result.", th: "สร้าง cartridge เรียงประโยคด้วยกลไกที่ต่างจากตัวอย่างและส่งคืนผลการเรียนรู้ที่ตรวจสอบแล้ว" },
    requiredChecks: ["manifest ABI", "deterministic educational logic", "keyboard-equivalent input", "unit tests", "browser smoke test"],
    rubric: { rubricId: "apk.rubric.independent-cartridge", dimensions: [{ dimensionId: "objective", weight: 0.35, criteria: "Educational objective and result mapping are correct." }, { dimensionId: "contract", weight: 0.3, criteria: "Cartridge and host responsibilities preserve the APK ABI." }, { dimensionId: "tests", weight: 0.2, criteria: "Deterministic and browser-visible checks pass." }, { dimensionId: "accessibility", weight: 0.15, criteria: "Keyboard, readable status, and reduced motion remain usable." }] },
  },
  srsFollowUps: [{ objectiveId: "codecamp.game-development.skill.apk-contract", variantKey: "apk.apk-contract.code-reading", afterDays: 2 }, { objectiveId: "codecamp.game-development.skill.apk-contract", variantKey: "apk.apk-contract.independent-construction", afterDays: 7 }],
});

/**
 * Creates the shared bilingual I Do activity for the APK unit.
 * @param locale Requested learner locale.
 * @returns Strict activity.v1 content with stable unit resource and evidence IDs.
 */
export function createCodecampAPKActivity(locale: string) {
  const thai = locale.toLowerCase().startsWith("th");
  return activitySchema.parse({
    schemaVersion: "activity.v1", activityId: codecampAPKUnit.ido.activityId, activityVersion: codecampAPKUnit.version,
    graphVersion: codecampAPKUnit.graphVersion, objectiveId: "codecamp.game-development.skill.phaser-lifecycle", variantKey: "apk.phaser-lifecycle.worked.reference-debug", mode: "worked_example",
    title: { en: "I Do: trace a Phaser cartridge", th: "I Do: วิเคราะห์ Phaser cartridge" },
    accessibility: { transcriptRequired: true, captionsRequired: true, nonVideoAlternativeResourceId: "diagram.apk.boundaries" },
    resources: [
      { kind: "video", resourceId: "video.apk.phaser-overview", provider: "youtube", videoId: "gZNyyQUvaNo", captionsAvailable: true, transcriptResourceId: "transcript.apk.phaser-overview", segments: [{ segmentId: "segment.scene-lifecycle", label: { en: "Scene lifecycle", th: "วงจร Scene" }, startSeconds: 0, endSeconds: 55 }] },
      { kind: "transcript", resourceId: "transcript.apk.phaser-overview", language: thai ? "th" : "en", text: thai ? "Phaser Scene แยกการสร้างวัตถุ การอัปเดตเกม และการจัดการ input ส่วน React host ดูแลการ mount การบันทึกผล และ navigation" : "A Phaser Scene separates object creation, game updates, and input. The React host owns mounting, result persistence, diagnostics, and navigation." },
      { kind: "diagram", resourceId: "diagram.apk.boundaries", assetId: "diagram.apk.boundaries.v1", alt: { en: "React host mounts a client-only cartridge that returns a validated educational result", th: "React host ติดตั้ง cartridge ฝั่ง client และรับผลการเรียนรู้ที่ตรวจสอบแล้ว" } },
    ],
    checkpoints: [{ checkpointId: "checkpoint.apk.host-boundary", stepId: "ido.apk.host-boundary", objectiveId: "codecamp.game-development.skill.react-host", variantKey: "apk.react-host.worked.reference-debug", trigger: { resourceId: "video.apk.phaser-overview", segmentId: "segment.scene-lifecycle" }, question: { kind: "single_choice", prompt: { en: "Which responsibility belongs to the React host?", th: "หน้าที่ใดเป็นของ React host?" }, options: [{ optionId: "persist", label: { en: "Persist the validated result", th: "บันทึกผลที่ตรวจสอบแล้ว" } }, { optionId: "physics", label: { en: "Run per-frame collision physics", th: "คำนวณ collision ทุกเฟรม" } }], correctOptionIds: ["persist"] }, feedback: { correct: { en: "Correct — persistence stays at the host boundary.", th: "ถูกต้อง — persistence อยู่ที่ host" }, incorrect: { en: "Review the host/cartridge diagram before retrying.", th: "ทบทวนแผนภาพ host/cartridge แล้วลองใหม่" } }, remediation: [{ kind: "video_segment", resourceId: "video.apk.phaser-overview", segmentId: "segment.scene-lifecycle" }, { kind: "diagram", resourceId: "diagram.apk.boundaries" }], evidence: { behavior: "assessed", weight: 0.15 }, gate: "pause_non_blocking" }],
    tutorialSteps: [],
  });
}
