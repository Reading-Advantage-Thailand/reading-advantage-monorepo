import { activitySchema } from "@reading-advantage/activity-runtime/core";
import { tutorialManifestSchema, type TutorialManifest } from "@reading-advantage/activity-tutorial/contracts";
import { z } from "zod";
import { apkLearningBlueprint } from "./apk-blueprint-data.js";

const REQUIRED_MANIFEST_FIELDS = ["id", "title", "description", "version", "runtimeApiVersion", "inputMode", "requiredAssetSlots", "capabilities"] as const;

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
    requiredCheckLabels: z.record(z.string(), z.array(z.string().min(1)).min(1)),
    rubric: z.object({ rubricId: z.string(), dimensions: z.array(z.object({ dimensionId: z.string(), weight: z.number().positive(), criteria: z.record(z.string(), z.string().min(1)) }).strict()).min(1) }).strict(),
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

/** Complete reference cartridge and boundary notes shown during the I Do walkthrough. */
export const codecampAPKReference = {
  code: `export const cartridgeManifest = {
  id: "apk.reference.word-match",
  title: "Word Match Reference",
  description: "Complete instructor reference cartridge.",
  version: "1.0.0",
  runtimeApiVersion: "1.0.0",
  inputMode: "vocabulary" as const,
  requiredAssetSlots: ["background", "card", "success"],
  capabilities: ["pointer", "keyboard", "reduced-motion"],
};`,
  annotations: {
    en: ["The manifest declares compatibility; it never persists learner state.", "The cartridge owns deterministic educational logic.", "The React host mounts, validates, persists evidence, and navigates."],
    th: ["manifest ประกาศความเข้ากันได้และไม่บันทึกสถานะผู้เรียน", "cartridge ดูแลตรรกะการเรียนรู้แบบกำหนดผลได้", "React host ทำหน้าที่ mount ตรวจสอบ บันทึกหลักฐาน และ navigation"],
  },
} as const;

/** Reviewed, versioned Codecamp APK unit shared by curriculum, runtime, and reporting adapters. */
export const codecampAPKUnit = CodecampAPKUnitSchema.parse({
  schemaVersion: "codecamp-apk-unit.v1", unitId: "codecamp.unit.apk-game-creation", version: "1.0.0",
  graphVersion: apkLearningBlueprint.graphVersion, unitNumber: 20,
  placement: { afterModuleSlug: "real-world-practice", prerequisiteObjectiveIds: apkLearningBlueprint.prerequisiteRoots.map(({ objectiveId }) => objectiveId) },
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
      allowedCommands: [{ commandId: "git.stage", profile: "git-status-porcelain" }],
      completionCriteria: { requiredStepIds: ["wedo.apk.manifest"] },
      steps: [{ stepId: "wedo.apk.manifest", order: 1, objectiveId: "codecamp.game-development.skill.apk-contract", instruction: { en: "Complete, commit, and push the cartridge manifest and deterministic educational result.", th: "เติม commit และ push cartridge manifest กับผลการเรียนรู้แบบกำหนดได้" }, checks: [{ checkId: "manifest.shape", kind: "typescript_object_shape" as const, filePath: "src/cartridge.ts", exportName: "cartridgeManifest", requiredProperties: [...REQUIRED_MANIFEST_FIELDS] }, { checkId: "git.clean", kind: "command" as const, commandId: "git.stage", expected: "clean" }], hints: [{ hintId: "hint.boundary", text: { en: "Keep persistence in the host, not the cartridge.", th: "เก็บ persistence ไว้ใน host ไม่ใช่ cartridge" } }], reveals: [{ revealId: "reveal.fields", text: { en: "Declare every RuntimeCartridgeManifest field before staging the file.", th: "ระบุทุก field ของ RuntimeCartridgeManifest ก่อน stage ไฟล์" } }], resourceIds: ["diagram.apk.boundaries"], scaffoldLevel: 2 }],
    },
  },
  youdo: {
    activityId: APK_ACTIVITY_IDS[2], repositoryId: "repo.apk.independent", objectiveId: "codecamp.game-development.skill.apk-contract", variantKey: "apk.apk-contract.independent.transfer",
    brief: { en: "Build a sentence-sorting cartridge that uses a different mechanic from the guided reference and returns a validated educational result.", th: "สร้าง cartridge เรียงประโยคด้วยกลไกที่ต่างจากตัวอย่างและส่งคืนผลการเรียนรู้ที่ตรวจสอบแล้ว" },
    requiredChecks: ["manifest ABI", "deterministic educational logic", "keyboard-equivalent input", "unit tests", "browser smoke test"],
    requiredCheckLabels: { en: ["Manifest ABI", "Deterministic educational logic", "Keyboard-equivalent input", "Unit tests", "Browser smoke test"], th: ["Manifest ABI", "ตรรกะการเรียนรู้แบบกำหนดผลได้", "การควบคุมด้วยแป้นพิมพ์ที่เทียบเท่า", "Unit tests", "Browser smoke test"] },
    rubric: { rubricId: "apk.rubric.independent-cartridge", dimensions: [{ dimensionId: "objective", weight: 0.35, criteria: { en: "Educational objective and result mapping are correct.", th: "วัตถุประสงค์การเรียนรู้และการแมปผลลัพธ์ถูกต้อง" } }, { dimensionId: "contract", weight: 0.3, criteria: { en: "Cartridge and host responsibilities preserve the APK ABI.", th: "หน้าที่ของ cartridge และ host รักษาสัญญา APK ABI" } }, { dimensionId: "tests", weight: 0.2, criteria: { en: "Deterministic and browser-visible checks pass.", th: "ผ่านการตรวจแบบกำหนดผลได้และการตรวจที่เห็นได้ใน browser" } }, { dimensionId: "accessibility", weight: 0.15, criteria: { en: "Keyboard, readable status, and reduced motion remain usable.", th: "แป้นพิมพ์ สถานะที่อ่านได้ และ reduced motion ใช้งานได้" } }] },
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

/**
 * Creates the shared We Do tutorial activity that receives verified repository evidence.
 * @param _locale Requested learner locale reserved for future locale-specific resources.
 * @returns Strict activity.v1 content aligned with the signed tutorial manifest.
 */
export function createCodecampAPKTutorialActivity(_locale: string) {
  const manifest = codecampAPKUnit.wedo.manifest;
  return activitySchema.parse({
    schemaVersion: "activity.v1", activityId: manifest.activityId, activityVersion: manifest.activityVersion,
    graphVersion: manifest.graphVersion, objectiveId: manifest.steps[0]!.objectiveId,
    variantKey: "apk.apk-contract.guided.extension", mode: "guided_practice",
    title: { en: "We Do: complete an APK cartridge manifest", th: "We Do: เติม APK cartridge manifest" },
    accessibility: { transcriptRequired: false, captionsRequired: false, nonVideoAlternativeResourceId: "diagram.apk.boundaries" },
    resources: [{ kind: "diagram", resourceId: "diagram.apk.boundaries", assetId: "diagram.apk.boundaries.v1", alt: { en: "React host and client-only cartridge responsibility boundary", th: "ขอบเขตหน้าที่ระหว่าง React host และ cartridge ฝั่ง client" } }],
    checkpoints: [],
    tutorialSteps: manifest.steps.map((step) => ({
      stepId: step.stepId, order: step.order, objectiveId: step.objectiveId,
      variantKey: "apk.apk-contract.guided.extension", instruction: step.instruction,
      resourceRefs: step.resourceIds.map((resourceId) => ({ kind: "diagram" as const, resourceId })),
      checks: step.checks.map((check) => {
        if (check.kind === "command") return { checkId: check.checkId, kind: "git_status" as const, expected: check.expected };
        if (check.kind === "typescript_object_shape") return { checkId: check.checkId, kind: "file_contains" as const, expected: `${check.filePath}:${check.exportName}` };
        return { checkId: check.checkId, kind: "file_contains" as const, expected: `${check.filePath}:${check.expected}` };
      }),
      hints: step.hints, reveals: step.reveals, scaffoldLevel: step.scaffoldLevel,
    })),
  });
}

/** Creates the server-owned independent PR assessment projected to Mastery and FSRS. */
export function createCodecampAPKIndependentActivity(locale: string) {
  const thai = locale.toLowerCase().startsWith("th");
  return activitySchema.parse({
    schemaVersion: "activity.v1", activityId: codecampAPKUnit.youdo.activityId, activityVersion: codecampAPKUnit.version,
    graphVersion: codecampAPKUnit.graphVersion, objectiveId: codecampAPKUnit.youdo.objectiveId,
    variantKey: codecampAPKUnit.youdo.variantKey, mode: "independent_practice",
    title: { en: "You Do: approved APK pull request", th: "You Do: pull request APK ที่ผ่านการอนุมัติ" },
    accessibility: { transcriptRequired: false, captionsRequired: false, nonVideoAlternativeResourceId: "diagram.apk.boundaries" },
    resources: [
      { kind: "video", resourceId: "video.apk.pr-review", provider: "youtube", videoId: "gZNyyQUvaNo", captionsAvailable: true, segments: [{ segmentId: "segment.apk.pr-review", label: { en: "PR review", th: "ตรวจ PR" }, startSeconds: 0, endSeconds: 1 }] },
      { kind: "diagram", resourceId: "diagram.apk.boundaries", assetId: "diagram.apk.boundaries.v1", alt: { en: "Approved pull request projects independent mastery evidence", th: "Pull request ที่ผ่านการอนุมัติส่งหลักฐาน mastery แบบอิสระ" } },
    ],
    checkpoints: [{ checkpointId: "checkpoint.apk.pr-approved", stepId: "youdo.apk.pr", objectiveId: codecampAPKUnit.youdo.objectiveId, variantKey: codecampAPKUnit.youdo.variantKey, trigger: { resourceId: "video.apk.pr-review", segmentId: "segment.apk.pr-review" }, question: { kind: "free_text", prompt: { en: "Server-owned PR decision", th: "ผลตรวจ PR จาก server" }, acceptedAnswers: ["approved"] }, feedback: { correct: { en: "The independent PR passed review.", th: "PR แบบอิสระผ่านการตรวจแล้ว" }, incorrect: { en: "Address the requested changes and resubmit.", th: "แก้ไขตามคำแนะนำแล้วส่งใหม่" } }, remediation: [{ kind: "diagram", resourceId: "diagram.apk.boundaries" }], evidence: { behavior: "assessed", weight: 0.5 }, gate: "answer_before_continue" }],
    tutorialSteps: [],
  });
}
