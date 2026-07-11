import { randomUUID } from "node:crypto";
import { activitySchema } from "@reading-advantage/activity-runtime/core";
import { createActivityTransportHandlers, type ActivityTransportHandlers } from "@reading-advantage/activity-runtime/transport";
import type { ActivitySessionSummary } from "@reading-advantage/activity-runtime";
import type { TenantDB } from "../db-contract.js";
import { DrizzleActivityPersistence } from "./drizzle-activity-persistence.js";

const codecampPilotActivity = activitySchema.parse({
  schemaVersion: "activity.v1", activityId: "codecamp.activity.git-commit-pilot", activityVersion: "1.0.0",
  graphVersion: "codecamp.graph.v1", objectiveId: "git.commit.create", variantKey: "git-commit.pilot.v1",
  mode: "guided_practice", title: { en: "Git commit pilot", th: "แบบฝึก Git commit" },
  accessibility: { transcriptRequired: true, captionsRequired: true, nonVideoAlternativeResourceId: "diagram.commit-flow" },
  resources: [
    { kind: "video", resourceId: "video.commit", provider: "youtube", videoId: "RGOj5yH7evk", captionsAvailable: true, transcriptResourceId: "transcript.commit", segments: [{ segmentId: "segment.stage", label: { en: "Stage changes", th: "เตรียมการเปลี่ยนแปลง" }, startSeconds: 12, endSeconds: 35 }] },
    { kind: "transcript", resourceId: "transcript.commit", language: "en", text: "Use git add before creating a commit." },
    { kind: "diagram", resourceId: "diagram.commit-flow", assetId: "diagram.commit-flow.v1", alt: { en: "Working tree to staging to repository", th: "จากพื้นที่ทำงานไปพื้นที่เตรียมและคลังโค้ด" } },
  ],
  checkpoints: [{ checkpointId: "checkpoint.stage", stepId: "ido.stage", objectiveId: "git.commit.create", variantKey: "git-commit.checkpoint.v1", trigger: { resourceId: "video.commit", segmentId: "segment.stage" }, question: { kind: "single_choice", prompt: { en: "What does git add do?", th: "git add ทำอะไร?" }, options: [{ optionId: "stage", label: { en: "Stages changes", th: "เตรียมการเปลี่ยนแปลง" } }, { optionId: "publish", label: { en: "Publishes changes", th: "เผยแพร่การเปลี่ยนแปลง" } }], correctOptionIds: ["stage"] }, feedback: { correct: { en: "Correct", th: "ถูกต้อง" }, incorrect: { en: "Review staging", th: "ทบทวนขั้นตอน staging" } }, remediation: [{ kind: "video_segment", resourceId: "video.commit", segmentId: "segment.stage" }, { kind: "diagram", resourceId: "diagram.commit-flow" }], evidence: { behavior: "assessed", weight: 0.5 }, gate: "pause_non_blocking" }],
  tutorialSteps: [{ stepId: "wedo.stage", order: 1, objectiveId: "git.commit.create", variantKey: "git-commit.tutorial.v1", instruction: { en: "Stage README.md.", th: "เตรียม README.md" }, resourceRefs: [{ kind: "diagram", resourceId: "diagram.commit-flow" }], checks: [{ checkId: "check.staged", kind: "git_status", expected: "README.md:staged" }], hints: [{ hintId: "hint.stage", text: { en: "Use git add.", th: "ใช้ git add" } }], reveals: [], scaffoldLevel: 2 }],
});

/** Activity handlers plus the separately authorized teacher summary boundary. */
export type CodecampActivityHandlers = ActivityTransportHandlers & {
  getTeacherSummary(schoolId: string, learnerId: string, sessionId: string): Promise<ActivitySessionSummary | null>;
};

/**
 * Composes the Codecamp pilot repository, Drizzle persistence, and transport handlers.
 * @param tenantDb Authenticated tenant database from the request context.
 * @returns Request-scoped learner and teacher activity handlers.
 */
export function createCodecampActivityHandlers(tenantDb: TenantDB): CodecampActivityHandlers {
  const persistence = new DrizzleActivityPersistence(tenantDb);
  const handlers = createActivityTransportHandlers({
    activities: { async getActivity(activityId, activityVersion) { return activityId === codecampPilotActivity.activityId && activityVersion === codecampPilotActivity.activityVersion ? codecampPilotActivity : null; } },
    persistence, createSessionId: randomUUID, now: () => new Date().toISOString(),
    executeTutorialCheck: () => { throw new Error("Tutorial checks require the server repository verifier"); },
  });
  return {
    ...handlers,
    getTeacherSummary: (schoolId, learnerId, sessionId) => persistence.getTeacherSummary(schoolId, learnerId, sessionId),
  };
}
